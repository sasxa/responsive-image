import crypto from 'crypto';
import fs from 'fs';
import glob from 'glob-promise';
import path from 'path';
import sharp from 'sharp';
import {
	Configuration,
	ImageInfo,
	Metadata,
	TaskJob,
	TaskConfig,
	TaskPaths,
	TaskResult,
} from './types';

export const findLocalFiles = async (config: Configuration): Promise<string[]> => {
	const globPattern =
		config.fileExtensions.length === 1
			? `**.${config.fileExtensions.join('')}`
			: `**.{${config.fileExtensions.join(',')}}`;
	const globOptions = {
		matchBase: true,
		ignore: [`**/node_modules/**`, `**/${config.outputPath}/**`],
	};

	const results: string[] = [];
	const searchPaths: string[] = config.searchPaths;
	const queueFn = (promise: Promise<unknown>, searchPath: string) =>
		promise.then(async () => {
			const inCwd = await glob(globPattern, { ...globOptions, cwd: searchPath });
			results.push(...inCwd.map((filepath) => `${searchPath}/${filepath}`));
		});

	await searchPaths.reduce(queueFn, Promise.resolve());

	return results;
};

export function md5_hash(data: string): string {
	return crypto.createHash('md5').update(data, 'utf8').digest('hex');
}

export function withoutTrailingSlash(value: string): string {
	return value.replace(/\/$/, '');
}

export function joinWithSlashes(...args: string[]): string {
	return args.map((fragment) => fragment.split('/').filter(Boolean).join('')).join('/');
}

export function getFilePaths(
	config: Configuration,
	task: TaskConfig,
	sourcePath: string,
	width: number,
): TaskPaths {
	const { format, name } = task;
	const extname = path.extname(sourcePath);
	const basename = path.basename(sourcePath, extname);

	const sourceName = `${basename}${extname}`;
	const outputFile = name === 'fallback' ? sourceName : `${basename}_${width}.${format}`;
	const outputPath = joinWithSlashes(config.outputPath, config.baseUrl, outputFile);

	const url = joinWithSlashes('', config.baseUrl, outputFile);
	const srcset = `${url} ${width}w`;

	if (name === 'fallback') {
		return { basename, sourceName, sourcePath, outputPath, url };
	} else if (format !== 'base64') {
		return { basename, sourceName, sourcePath, outputPath, url, srcset };
	} else {
		return { basename, sourceName, sourcePath, outputPath };
	}
}

export async function ensureDirExists(filepath: string): Promise<void> {
	const dirPath = path.dirname(filepath);
	await fs.promises.mkdir(dirPath, { recursive: true });
}

export function checkCachedFile(outputPath: string): boolean {
	const filepath = path.normalize(path.join(process.cwd(), outputPath));

	return fs.existsSync(filepath);
}

export function basename(filePath: string) {
	return path.basename(filePath);
}

export async function resizeTask({ task, paths, resize }: TaskJob): Promise<TaskResult> {
	let sharpImage: sharp.Sharp;

	switch (task.format) {
		case 'jpg':
			sharpImage = sharp(paths.sourcePath)
				.resize(resize)
				.jpeg(task.options as sharp.JpegOptions);
			break;

		case 'png':
			sharpImage = sharp(paths.sourcePath)
				.resize(resize)
				.png(task.options as sharp.PngOptions);
			break;

		case 'webp':
			sharpImage = sharp(paths.sourcePath)
				.resize(resize)
				.webp(task.options as sharp.WebpOptions);
			break;

		case 'base64':
			sharpImage = sharp(paths.sourcePath).resize(resize);
			break;

		default:
			return Promise.reject();
	}

	return task.format === 'base64'
		? saveBase64Image({ task, paths, resize }, sharpImage)
		: saveSharpImage({ task, paths, resize }, sharpImage);
}

async function saveBase64Image({ task, paths, resize }: TaskJob, sharpImage: sharp.Sharp) {
	const buffer = await sharpImage.toBuffer();
	const { width, height, size, hasAlpha } = await sharp(buffer).metadata();
	const inlineBelow = 'inlineBelow' in task.options ? task.options?.inlineBelow || 0 : 0;

	const url = `data:image/png;base64,${buffer.toString('base64')}`;
	// const url =
	// 	size && size <= inlineBelow ? `data:image/png;base64,${buffer.toString('base64')}` : '';

	return {
		format: task.format,
		width,
		height,
		size,
		hasAlpha,
		paths: { ...paths, url },
	} as TaskResult;
}

async function saveSharpImage({ task, paths, resize }: TaskJob, sharpImage: sharp.Sharp) {
	await ensureDirExists(paths.outputPath);
	const { format, width, height, size } = await sharpImage.toFile(paths.outputPath);
	const { hasAlpha } = await sharpImage.metadata();

	return { format: task.format, width, height, size, hasAlpha, paths } as TaskResult;
}

export function groupBy<T, K>(list: T[], getKey: (item: T) => K): T[][] {
	const map = new Map<K, T[]>();
	list.forEach((item) => {
		const key = getKey(item);
		const collection = map.get(key);
		if (!collection) {
			map.set(key, [item]);
		} else {
			collection.push(item);
		}
	});
	return Array.from(map.values());
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const compoareOutputPath = (tr1: any, tr2: any) => {
	return tr1.paths?.outputPath === tr2.paths?.outputPath;
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const rearrangeResults = (trs: any[]) => {
	const base64 = trs.filter((tr) => tr.format === 'base64');
	const others = trs.filter((tr) => tr.format !== 'base64');
	return [...others, ...base64];
};

export async function saveCachedResults(
	config: Configuration,
	sourceName: string,
	data: unknown[],
): Promise<void> {
	const outputPath = path.join(config.cachePath, `${sourceName}.json`);
	const existing = await loadCachedResults(config, sourceName);

	if (existing) {
		data = [...data, ...existing].filter(
			(v, i, a) => a.findIndex((r) => compoareOutputPath(r, v)) === i,
		);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		data = rearrangeResults(data as any);
	}

	try {
		const json = JSON.stringify(data, null, 2);
		await ensureDirExists(outputPath);
		await fs.promises.writeFile(outputPath, json);
	} catch (error) {
		console.error(`Error saving cache`, error);
	}
}

export async function loadCachedResults<T extends unknown>(
	config: Configuration,
	sourceName: string,
): Promise<T[] | null> {
	const sourcePath = path.join(config.cachePath, `${sourceName}.json`);

	try {
		const buffer = await fs.promises.readFile(sourcePath);
		return JSON.parse(buffer.toString());
	} catch (error) {
		return null;
	}
}

export function write_stdout(value: string): void {
	/* need to use  `process.stdout.write` becuase console.log print a newline character */
	/* \r clear the current line and then print the other characters making it looks like it refresh*/
	process.stdout.write(`\r${value}`);
}

export function transformResults(
	config: Configuration,
	task: TaskConfig,
	results: TaskResult[],
): ImageInfo {
	const { name, format } = task;
	const srcset = results
		.map((tr) => tr.paths?.srcset)
		.filter(Boolean)
		.join(', ');

	const sizes = results.map((tr) => `(max-width: ${tr.width}px) ${tr.width}px`).join(', ');

	const metadata = results.reduce((dict, tr) => {
		const { format, size, width, height, hasAlpha } = tr;
		return { ...dict, [tr.width.toString()]: { format, size, width, height, hasAlpha } };
	}, {} as Record<string, Metadata>);

	const url = results
		.slice(0, 1)
		.map((tr) => `${config.baseUrl}/${tr.paths.sourceName}`)
		.join('');

	if (task.format === 'base64') {
		const data = results
			.slice(0, 1)
			.map((tr) => tr.paths.url)
			.join('');
		// .slice(0, 100);

		return { url, format, name, data, metadata };
	} else if (task.name === 'fallback') {
		return { url, format, name, metadata };
	} else {
		return { url, format, name, srcset, sizes, metadata };
	}
}

export async function loadInfo<T extends unknown>(
	config: Configuration,
	sourceName: string,
): Promise<T[] | null> {
	const sourcePath = path.join(config.outputPath, `${sourceName}.json`);

	try {
		const buffer = await fs.promises.readFile(sourcePath);
		return JSON.parse(buffer.toString());
	} catch (error) {
		return null;
	}
}

export async function saveInfo(
	config: Configuration,
	sourceName: string,
	data: unknown[],
): Promise<void> {
	const outputPath = path.join(config.outputPath, `${sourceName}.json`);

	try {
		const json = JSON.stringify(data, null, 2);
		await ensureDirExists(outputPath);
		await fs.promises.writeFile(outputPath, json);
	} catch (error) {
		console.error(`Error saving cache`, error);
	}
}
