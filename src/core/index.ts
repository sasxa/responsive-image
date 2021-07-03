import axios from 'axios';
import fs from 'fs';
import glob from 'glob-promise';
import os, { userInfo } from 'os';
import path from 'path';
import sharp from 'sharp';
import { parse } from 'url';
import { log, saveLog } from './logger';
import { defaults } from './options';
import {
	resizeBase64,
	resizeInline,
	resizeJpeg,
	resizeOptions,
	resizePng,
	resizeWebp,
} from './resize';
import { Config, Image, Output, ResizeOptions, Sources } from './types';
import { ensureDirExists, md5_hash, write_stdout } from './util';

// 0. parse options

export const parseOptions = (options: Partial<Config> = {}): Config => {
	const config: Config = {
		...defaults,
		...options,
		imageFormats: [...defaults.imageFormats, ...(options.imageFormats || [])],
	};

	const outputDir = path.join(process.cwd(), config.outputPath);

	return { ...config, outputDir };
};

// 1. load cache

async function saveProcessingData(config: Config, image: Image) {
	const outputFile = `${image.sourceName}.json`;
	const outputPath = path.join(config.outputDir, config.baseUrl, outputFile);

	try {
		const json = JSON.stringify(image, null, 2);
		await ensureDirExists(outputPath);
		await fs.promises.writeFile(outputPath, json);
	} catch (error) {
		console.error(`Error saving cache`, error);
	}
}

async function loadProcessedData(config: Config, sourcePath: string): Promise<Image | null> {
	const extname = path.extname(sourcePath);
	const basename = path.basename(sourcePath, extname);
	const outputFile = `${basename}${extname}.json`;
	const outputPath = path.join(config.outputDir, config.baseUrl, outputFile);

	try {
		const buffer = await fs.promises.readFile(outputPath);
		return JSON.parse(buffer.toString());
	} catch (error) {
		return null;
	}
}

// 2. search for image
export const findLocalFiles = async (config: Config): Promise<string[]> => {
	// console.warn(cfg);

	const globPattern = `**.{${config.imageFormats.join(',')}}`;
	const globOptions = {
		matchBase: true,
		ignore: [`**/node_modules/**`, `**/${config.outputPath}/**`],
	};

	const results: string[] = [];
	const searchPaths: string[] = config.searchPaths;
	await searchPaths.reduce(
		(p, cwd) =>
			p.then(async () => {
				// console.warn(cwd);

				const inCwd = await glob(globPattern, { ...globOptions, cwd });
				results.push(...inCwd.map((filepath) => `${cwd}/${filepath}`));
			}),
		Promise.resolve(),
	);

	return results;
};

// 3. download image
const downloadImage = async (config: Config, url: string) => {
	const pathname = parse(url).pathname || '';
	const sourceName = pathname.substring(pathname.lastIndexOf('/') + 1);

	const tmpDir = md5_hash(`${userInfo().username}-${config.outputPath}`);
	const tmpPath = path.join(os.tmpdir(), tmpDir);
	const sourcePath = path.join(tmpPath, sourceName);

	if (!fs.existsSync(sourcePath)) {
		await ensureDirExists(sourcePath);
		const writer = fs.createWriteStream(sourcePath);
		config.verbose && console.log(`>>> Downloading image "${url}" \n    to ${tmpPath}`);
		const { data } = await axios.get(url, { responseType: 'stream' });
		await new Promise((resolve) => {
			writer.on('close', resolve);
			data.pipe(writer);
		});
	} else {
		config.verbose && console.log(`<<< Using dowloaded image "${url}" \n    from ${tmpPath}`);
	}

	return sourcePath;
};

// 4. process image
export const resizeImage = async (config: Config, sourceUrl: string): Promise<Image> => {
	const isRemote = Boolean(parse(sourceUrl).host);
	const url = isRemote ? sourceUrl : undefined;
	const sourcePath = isRemote
		? await downloadImage(config, sourceUrl)
		: path.join(process.cwd(), sourceUrl);

	const extname = path.extname(sourcePath);
	const basename = path.basename(sourcePath, extname);
	const sourceName = `${basename}${extname}`;

	log(config, 'validating', sourceUrl);

	const data = await loadProcessedData(config, sourcePath);
	if (data) {
		log(config, 'skipped', sourceName);
		const { src, webp, png, jpeg } = data.sources;
		log(config, 'preview', src, webp, png, jpeg);
		return data;
	}

	const outputs: Output[] = [];
	const buffer = await fs.promises.readFile(sourcePath);
	const hash = md5_hash(buffer.toString());
	const metadata = await sharp(buffer).metadata();
	const { format, size, width, height, hasAlpha } = metadata;
	log(config, 'processing', sourceUrl);
	log(config, 'source-info', hasAlpha, format, size, width, height);

	const isInline = Boolean(size && size <= config.inlineBelow);
	if (isInline) {
		const options = resizeOptions(config, sourcePath, hash, 'base64', 0);
		const result = await resizeInline(options);

		log(config, 'base64-inline', sourceName, size);
		outputs.push(result);
	} else {
		if (config.base64 === true) {
			const options = resizeOptions(config, sourcePath, hash, 'base64', config.sizes[0]);
			const result = await resizeBase64(options);

			log(config, 'base64-data', sourceName);
			outputs.push(result);
		}

		const imageWidths = [...config.sizes, width || 0].filter(
			(size) => size <= Math.max(...config.sizes),
		);
		const promises = [...new Set<number>(imageWidths)]
			.filter((size: number) => size <= (width || 0))
			.map(async (imageWidth: number) => {
				if (config.webp) {
					const options = resizeOptions(config, sourcePath, hash, 'webp', imageWidth);
					const result = await resizeWebp(options);

					log(config, 'webp', `${config.outputPath}/${result.srcset}`);
					outputs.push(result);
				}

				if (hasAlpha) {
					const options = resizeOptions(config, sourcePath, hash, 'png', imageWidth);
					const result = await resizePng(options);

					log(config, 'png', `${config.outputPath}/${result.srcset}`);
					outputs.push(result);
				} else {
					const options = resizeOptions(config, sourcePath, hash, 'jpg', imageWidth);
					const result = await resizeJpeg(options);

					log(config, 'jpg', `${config.outputPath}/${result.srcset}`);
					outputs.push(result);
				}
			});

		await Promise.all(promises);

		if (config.fallback) {
			const options = resizeOptions(config, sourcePath, hash, 'jpg', config.fallback);
			const modified = Object.entries(options).reduce((dict, [key, val]) => {
				const value =
					typeof val !== 'string'
						? val
						: val.replace(`_${config.fallback}`, '').replace(` ${config.fallback}w`, '');
				return { ...dict, [key]: value };
			}, {});

			const result = await resizeJpeg(modified as ResizeOptions);

			log(config, 'fallback', `${config.outputPath}/${result.srcset}`);
			outputs.push(result);
		}
	}

	const sources = processOutputs(config, outputs);

	const image: Image = {
		sourceName,
		// sourceUrl,
		// sourcePath,
		basename,
		extname,
		url,
		hash,
		format,
		size,
		width,
		height,
		hasAlpha,
		isInline,
		sources,
		// outputs,
	};

	const dataPath = `${config.outputPath}/${config.baseUrl}/${basename}${extname}.json`;
	log(config, 'data', dataPath);

	await saveProcessingData(config, image);
	log(config, 'processed', outputs.length, config.outputPath);

	log(config, 'preview', sources.src, sources.webp, sources.png, sources.jpeg);

	return image;
};

// 6. process multiple images
export const batch = async (config: Config, sourcePaths: string[]): Promise<void> => {
	const processAsync = async (sourcePath: string, index: number) => {
		await resizeImage(config, sourcePath);
		const progressCounter = `${index + 1} / ${sourcePaths.length}`;
		log(config, 'done', progressCounter);

		if (!config.verbose) {
			const progressDors =
				index % 3 === 0 ? '.  ' : index % 3 === 1 ? '.. ' : index % 3 === 2 ? '...' : '   ';

			write_stdout(`[ ${progressDors} ] Processing images ${progressCounter}`);
		}
	};

	await sourcePaths.reduce(
		async (promise, sourcePath, index) => promise.then(() => processAsync(sourcePath, index)),
		Promise.resolve(),
	);

	if (config.logging) {
		await saveLog(config);
	}
};

export function processOutputs(config: Config, outputs: Output[]): Partial<Sources> {
	const fallbackValue = (format: string) => {
		return outputs
			.filter((o) => o.format === format)
			.filter((o) => o.width === config.fallback)
			.slice(1)
			.map(({ url }) => url)
			.join('');
	};

	const jpgFallback = fallbackValue('jpeg');
	const pngFallback = fallbackValue('png');
	const base64Output = outputs.find((o) => o.format === 'base64');
	const isInline = base64Output?.size && base64Output?.size < config.inlineBelow;

	const srcsetValue = (format: string) => {
		return outputs
			.filter((o) => o.format === format)
			.slice(1)
			.map(({ srcset }) => srcset)
			.join(', ');
	};

	const webp = config.webp ? srcsetValue('webp') : undefined;
	const png = srcsetValue('png');
	const jpeg = srcsetValue('jpeg');
	const src = isInline ? base64Output?.url : pngFallback || jpgFallback;

	return { src, webp, png, jpeg };
}
