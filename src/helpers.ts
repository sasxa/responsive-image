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
	TaskOptions,
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
	task: TaskOptions,
	width: number,
	sourcePath: string,
): TaskPaths {
	const extname = path.extname(sourcePath);
	const basename = path.basename(sourcePath, extname);
	const sourceName = `${basename}${extname}`;
	const outputFile = `${basename}_${width}.${task.format}`;
	const outputPath = joinWithSlashes(config.outputPath, config.baseUrl, outputFile);
	const url = joinWithSlashes('', config.baseUrl, outputFile);
	const srcset = `${url} ${width}w`;

	if (task.format !== 'base64') {
		return { sourcePath, outputPath, srcset, url, sourceName };
	} else {
		return { sourcePath, outputPath, sourceName };
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

export async function resizeTask(task: TaskJob): Promise<Partial<TaskResult>> {
	let sharpImage: sharp.Sharp;

	switch (task.format) {
		case 'jpeg':
			sharpImage = sharp(task.taskPaths.sourcePath)
				.resize(task.sharpOptions)
				.jpeg(task.taskOptions as sharp.JpegOptions);
			break;

		case 'png':
			sharpImage = sharp(task.taskPaths.sourcePath)
				.resize(task.sharpOptions)
				.png(task.taskOptions as sharp.PngOptions);
			break;

		case 'webp':
			sharpImage = sharp(task.taskPaths.sourcePath)
				.resize(task.sharpOptions)
				.webp(task.taskOptions as sharp.WebpOptions);
			break;

		case 'base64':
			sharpImage = sharp(task.taskPaths.sourcePath).resize(task.sharpOptions);
			break;

		default:
			return Promise.reject();
	}

	return task.format === 'base64'
		? saveBase64Image(task, sharpImage)
		: saveSharpImage(task, sharpImage);
}

async function saveBase64Image(task: TaskJob, sharpImage: sharp.Sharp) {
	const buffer = await sharpImage.toBuffer();
	const { width, height, size, hasAlpha } = await sharp(buffer).metadata();
	const inlineBelow = 'inlineBelow' in task.taskOptions ? task.taskOptions.inlineBelow : 0;

	const url =
		size && size <= inlineBelow ? `data:image/png;base64,${buffer.toString('base64')}` : '';
	const { sourcePath, outputPath, sourceName } = task.taskPaths;
	const paths = { sourcePath, outputPath, url, sourceName };

	return { format: task.format, width, height, size, hasAlpha, paths };
}

async function saveSharpImage(task: TaskJob, sharpImage: sharp.Sharp) {
	await ensureDirExists(task.taskPaths.outputPath);
	const { format, width, height, size } = await sharpImage.toFile(task.taskPaths.outputPath);
	const { hasAlpha } = await sharpImage.metadata();
	const paths = task.taskPaths;

	return { format: task.format, width, height, size, hasAlpha, paths };
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

export async function saveCached(
	config: Configuration,
	sourceName: string,
	data: unknown[],
): Promise<void> {
	const outputPath = path.join(config.cachePath, `${sourceName}.json`);
	const existing = await loadCached(config, sourceName);

	if (existing) {
		data = [...data, ...existing].filter(
			(v, i, a) => a.findIndex((r) => compoareOutputPath(r, v)) === i,
		);
	}

	try {
		const json = JSON.stringify(data, null, 2);
		await ensureDirExists(outputPath);
		await fs.promises.writeFile(outputPath, json);
	} catch (error) {
		console.error(`Error saving cache`, error);
	}
}

export async function loadCached<T extends unknown>(
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

export function transformTask(
	config: Configuration,
	task: TaskOptions,
	results: TaskResult[],
): ImageInfo {
	const name = task.name;
	const srcset = results
		.map((tr) => tr.paths?.srcset)
		.filter(Boolean)
		.join(', ');

	// console.warn(results);

	const sizes = results.map((tr) => `(max-width: ${tr.width}px) ${tr.width}px`).join(', ');

	const metadata = results.reduce((dict, tr) => {
		const { format, size, width, height, hasAlpha } = tr;
		// return { format, size, width, height, hasAlpha };
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
			.join('')
			.slice(0, 100);

		return { url, name, data, metadata };
	} else {
		return { url, name, srcset, sizes, metadata };
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
