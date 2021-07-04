import {
	checkCachedFile,
	findLocalFiles,
	getFilePaths,
	groupBy,
	transformTask,
	joinWithSlashes,
	loadCached,
	resizeTask,
	saveCached,
	saveInfo,
	write_stdout,
} from './helpers';

import {
	basicConfiguration,
	Configuration,
	ImageInfo,
	TaskJob,
	TaskOptions,
	TaskPaths,
	TaskResult,
} from './types';
import path from 'path';

export async function start(config: Configuration): Promise<void> {
	const startTime = Date.now();
	const errors = [];
	const jobs: TaskJob[] = [];
	const results: Partial<TaskResult>[] = [];
	const cache: Record<string, TaskResult[]> = {};

	// Validate configuration
	if (config.searchPaths?.length === 0) {
		const message = `Specify where to look for images in "searchPaths".`;
		console.error(errors.push(message), '-', message);
	}

	if (config.cachePath.length === 0) {
		const message = `Specify where to save processed data in "cachePath".`;
		console.error(errors.push(message), '-', message);
	}

	if (config.outputPath.length === 0) {
		const message = `Specify where to save processed images in "outputPath".`;
		console.error(errors.push(message), '-', message);
	}

	if (config.fileExtensions.length === 0) {
		const message = `Specify what files to search for in "fileExtensions"`;
		console.error(errors.push(message), '-', message);
	}

	if (config.tasks.length === 0) {
		const message = `No resize tasks found.`;
		console.error(errors.push(message), '-', message);
	}
	if (errors.length) {
		const message = `\n${errors.length} configuration error(s). Aborting.`;
		return console.error(message);
	}

	// Configuration OK

	// Find files
	const files = await findLocalFiles(config);

	if (files.length === 0) {
		const message = `No files found. Check "searchPaths" and "fileExtensions" options.`;
		return console.error(errors.push(message), '-', message);
	} else {
		const message = `${files.length} files found. Processing ...`;
		console.error(message);
	}

	// Load chache
	const jsonQueueFn = async (promise: Promise<unknown>, sourcePath: string) =>
		promise.then(async () => {
			// const message = `...creating [${task.format}] image for "${task.basename}"`;

			const sourceName = path.basename(sourcePath);
			const results: TaskResult[] | null = await loadCached(config, sourceName);
			if (results) {
				cache[sourceName] = results;
			}
		});

	await files.reduce(jsonQueueFn, Promise.resolve());
	const CACHE = Object.values(cache).reduce((acc, trs) => [...acc, ...trs], []);
	const cachedCount = CACHE.length;
	const isCached = (outputPath: string) => CACHE.some((tr) => tr.paths.outputPath === outputPath);

	if (!errors.length) {
		const endTime = Date.now();
		const duration = endTime - startTime;
		const cachedFiles = Object.keys(cache).length;
		const message = `\nLoaded cache for ${cachedFiles} files with ${cachedCount} images -- ${duration}ms.`;
		console.log(message);
	}

	// Validate cache

	const STALE = CACHE.filter((tr) => !checkCachedFile(tr.paths.outputPath));
	const isStale = (outputPath: string) => STALE.some((tr) => tr.paths.outputPath === outputPath);

	if (STALE.length > 0) {
		const endTime = Date.now();
		const duration = endTime - startTime;
		const outputPath = joinWithSlashes(config.outputPath, config.baseUrl);
		const message = `Missing ${STALE.length} files from "${outputPath}" for images from cache -- ${duration}ms.`;
		console.log(message);
	}

	// Check tasks

	config.tasks.forEach(async (task: TaskOptions) => {
		task.sizes.map(async (width) => {
			const { format } = task;
			const height = task.aspectRatio ? width / task.aspectRatio : undefined;
			const sharpOptions = { width, height, withoutEnlargement: true };
			files.map((sourcePath) => {
				const basename = path.basename(sourcePath);
				const taskPaths: TaskPaths = getFilePaths(config, task, width, sourcePath);
				const taskOptions = task.options;

				if (!isCached(taskPaths.outputPath) || isStale(taskPaths.outputPath)) {
					jobs.push({ basename, format, sharpOptions, taskOptions, taskPaths });
				}
			});
		});
	});

	// Check jobs

	if (!errors.length) {
		const endTime = Date.now();
		const duration = endTime - startTime;
		const message = `${jobs.length} resize tasks queued for ${files.length} files -- ${duration}ms.\n`;
		console.log(message);
	}

	// Check cache
	const queue = jobs.filter((job) => {
		const skipBase64 = job.format === 'base64' && isStale(job.taskPaths.outputPath);
		if (skipBase64) {
			return false;
		}

		return true;
	});

	if (queue.length < jobs.length) {
		const message = `Skipping ${jobs.length - queue.length} tasks ...`;
		console.log(message);
	}

	if (!errors.length && queue.length > 0) {
		const message = `Processing ${queue.length} tasks ...`;
		console.log(message);
	}

	// Resize images in queue
	const resizeQueueFn = async (promise: Promise<unknown>, task: TaskJob, index: number) =>
		promise.then(async () => {
			const dots =
				index % 3 === 0 ? '.  ' : index % 3 === 1 ? '.. ' : index % 3 === 2 ? '...' : '   ';
			write_stdout(`[ ${dots} ] Processing images ${index + 1}/${queue.length}`);

			if (index === queue.length - 1) {
				console.log('\n');
			}

			const result = await resizeTask(task);
			if (result?.paths) {
				await saveCached(config, task.taskPaths.sourceName, [result]);
				results.push(result);
			}
		});

	await queue.reduce(resizeQueueFn, Promise.resolve());

	if (!errors.length && queue.length > 0) {
		const endTime = Date.now();
		const duration = endTime - startTime;

		const message = `Finished resizing ${results.length} images -- ${duration}ms.`;
		console.log(message);
	}

	// Save results to json
	const info: ImageInfo[] = [];

	config.tasks.forEach((task: TaskOptions) => {
		files.map((sourcePath) => {
			const taskFiles = CACHE.filter(
				(tr) => tr.paths.sourcePath === sourcePath && tr.format === task.format,
			)
				.filter((tr) => task.sizes.includes(tr.width))
				.sort((a, b) => a.width - b.width);

			const transform = transformTask(config, task, taskFiles);
			if ('data' in transform && !transform?.data) {
				// skip large base64s
			} else {
				info.push(transform);
			}
		});
	});

	const fileInfos = info.reduce((dict, i) => {
		const key = i.url;
		return { ...dict, [key]: [...(dict[key] || []), i] };
	}, {} as Record<string, ImageInfo[]>);

	const saves = Object.entries(fileInfos).map(async ([sourceName, fi]) => {
		await saveInfo(config, sourceName, fi);
	});

	if (!errors.length && saves.length > 0) {
		const endTime = Date.now();
		const duration = endTime - startTime;

		const message = `Saving resizing data for ${saves.length} images -- ${duration}ms.`;
		console.log(message);
	}

	// Done

	if (!errors.length) {
		const endTime = Date.now();
		const duration = endTime - startTime;

		const message = `\nDone! ${results.length} files created -- ${duration}ms.`;
		return console.log(message);
	}
}

const basic = basicConfiguration;
const extra: Partial<Configuration> = {
	searchPaths: ['src/assets/images'],
	cachePath: 'src/assets/.cache',
	outputPath: 'static',
	baseUrl: '/images',
};

const tasks: TaskOptions[] = [
	{
		format: 'base64',
		name: 'inline',
		sizes: [256],
		aspectRatio: 1,
		options: basic.base64Options,
	},
	{
		format: 'jpeg',
		name: 'default',
		sizes: [480, 768, 1280, 1920],
		aspectRatio: 16 / 10,
		options: basic.jpegOptions,
	},
	{
		format: 'webp',
		name: 'modern',
		sizes: [480, 768, 1280, 1920],
		aspectRatio: 16 / 10,
		options: basic.webpOptions,
	},
	{
		format: 'jpeg',
		name: 'thumb',
		sizes: [256],
		aspectRatio: 1,
		options: basic.jpegOptions,
	},
];

start({ ...basic, ...extra, tasks });
