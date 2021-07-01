import axios from 'axios';
import fs from 'fs';
import glob from 'glob-promise';
import os, { userInfo } from 'os';
import path from 'path';
import sharp from 'sharp';
import { parse } from 'url';
import { Config, Image, Output } from './models';
import { defaults } from './options';
import {
	resizeBase64,
	resizeInline,
	resizeJpeg,
	resizeOptions,
	resizePng,
	resizeWebp,
} from './resize';
import { ensureDirExists, md5_hash, pad2, write_stdout } from './util';

// 1. load cache

async function saveProcessingData(config: Config, image: Image) {
	const outputFile = `${image.basename}.json`;
	const outputPath = path.join(config.cacheDir, outputFile);

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
	const outputFile = `${basename}.json`;
	const outputPath = path.join(config.cacheDir, outputFile);

	try {
		const buffer = await fs.promises.readFile(outputPath);
		return JSON.parse(buffer.toString());
	} catch (error) {
		return null;
	}
}

async function saveLog(config: Config, notifications: string[]) {
	const now = new Date();
	const date = [now.getFullYear(), pad2(now.getMonth()), pad2(now.getDate())].join('-');
	const time = [now.getHours(), now.getMinutes(), now.getSeconds()].map(pad2).join('');
	const outputFile = `${date}-${time}.log`;
	const outputPath = path.join(config.cacheDir, outputFile);

	try {
		await ensureDirExists(outputPath);
		await fs.promises.writeFile(outputPath, notifications.join('\n'));
		log(config, 'logged', outputPath);
	} catch (error) {
		console.error(`Error saving log`, error);
	}
}

const notifications: string[] = [];

type Notification =
	| 'processing'
	| 'processed'
	| 'skipped'
	| 'done'
	| 'logged'
	| 'source-info'
	| 'base64-inline'
	| 'base64-data'
	| 'png'
	| 'jpg'
	| 'cache'
	| 'webp';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function log({ verbose }: Config, notification: Notification, ...args: any[]) {
	let message = '';
	switch (notification) {
		case 'processing':
			message = `--- Processing "${args[0]}"`;
			break;

		case 'source-info':
			message =
				`    ${args[0] ? 'transparent ' : ''}${args[1]?.toUpperCase()}; ${args[2]} bytes; ` +
				`${args[3]}x${args[4]}px`;
			break;

		case 'base64-inline':
			message = `>>> Creating base64 inline data image for "${args[0]}" (${args[1]} bytes)`;
			break;

		case 'base64-data':
			message = `>>> Creating base64 data image for "${args[0]}"`;
			break;

		case 'webp':
			message = `>>> Creating webp image "${args[0]}"`;
			break;

		case 'png':
			message = `>>> Creating png image "${args[0]}"`;
			break;

		case 'jpg':
			message = `>>> Creating jpg image "${args[0]}"`;
			break;

		case 'cache':
			message = `--- Creating cache file "${args[0]}"`;
			break;

		case 'processed':
			message = `>>> Creating ${args[0]} images in "${args[1]}"`;
			break;

		case 'skipped':
			message = `<<< Using ${args[0]} cached sources for image "${args[1]}"`;
			break;

		case 'done':
			message = `Processed ${args[0]} images\n`;
			break;

		case 'logged':
			message = `\nDone! Log saved in "${args[0]}"`;
			return console.log(message);
	}

	if (verbose) {
		console.log(message);
	}

	notifications.push(message);
}

export const parseOptions = (options: Partial<Config> = {}): Config => {
	const config: Config = {
		...defaults,
		...options,
		imageFormats: [...defaults.imageFormats, ...(options.imageFormats || [])],
	};

	const outputDir = path.join(process.cwd(), config.outputPath);
	const cacheDir = path.join(outputDir, config.cachePath || config.baseUrl);

	return { ...config, outputDir, cacheDir };
};

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
export const processImage = async (config: Config, sourceUrl: string): Promise<Image> => {
	const isRemote = Boolean(parse(sourceUrl).host);
	const url = isRemote ? sourceUrl : undefined;
	const sourcePath = isRemote
		? await downloadImage(config, sourceUrl)
		: path.join(process.cwd(), sourceUrl);

	const outputs: Output[] = [];
	const buffer = await fs.promises.readFile(sourcePath);
	const hash = md5_hash(buffer.toString());
	const extname = path.extname(sourcePath);
	const basename = path.basename(sourcePath, extname);
	const sourceName = `${basename}${extname}`;

	const metadata = await sharp(buffer).metadata();
	const { format, size, width, height, hasAlpha } = metadata;
	const isInline = Boolean(size && size <= config.inlineBelow);

	log(config, 'processing', sourceUrl);
	log(config, 'source-info', hasAlpha, format, size, width, height);

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

					log(config, 'webp', result.srcset);
					outputs.push(result);
				}

				if (hasAlpha) {
					const options = resizeOptions(config, sourcePath, hash, 'png', imageWidth);
					const result = await resizePng(options);

					log(config, 'png', result.srcset);
					outputs.push(result);
				} else {
					const options = resizeOptions(config, sourcePath, hash, 'jpg', imageWidth);
					const result = await resizeJpeg(options);

					log(config, 'jpg', result.srcset);
					outputs.push(result);
				}
			});

		await Promise.all(promises);
	}

	const image: Image = {
		sourceUrl,
		sourceName,
		sourcePath,
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
		outputs,
	};

	const cachePath = `${config.cachePath || config.baseUrl}/${basename}.json`;

	log(config, 'cache', cachePath);
	await saveProcessingData(config, image);
	log(config, 'processed', outputs.length, config.outputPath);

	return image;
};

// 4b. process multiple images
export const processImages = async (config: Config, sourcePaths: string[]): Promise<void> => {
	const processAsync = async (sourcePath: string, index: number) => {
		const cached = await loadProcessedData(config, sourcePath);

		if (cached) {
			const { sourceName, outputs } = cached;
			log(config, 'skipped', outputs.length, sourceName);
			return;
		}

		await processImage(config, sourcePath);
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

	await saveLog(config, notifications);
};
