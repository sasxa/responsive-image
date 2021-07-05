import {
	basename,
	checkCachedFile,
	findLocalFiles,
	getFilePaths,
	joinWithSlashes,
	loadCachedResults,
	rearrangeResults,
	resizeTask,
	saveInfo,
	saveCachedResults,
	transformResults,
	write_stdout,
} from './helpers';
import {
	basicConfiguration,
	Configuration,
	ImageInfo,
	TaskConfig,
	TaskJob,
	TaskPaths,
	TaskResult,
} from './types';

export async function start(config: Configuration): Promise<void> {
	const startTime = Date.now();
	const errors = [];
	const jobs: TaskJob[] = [];
	const results: TaskResult[] = [];
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

	// 1. Find files
	const files = await findLocalFiles(config);

	if (files.length === 0) {
		const message = `No files found. Check "searchPaths" and "fileExtensions" options.`;
		return console.error(errors.push(message), '-', message);
	} else {
		const message = `${files.length} files found. Processing ...`;
		console.error(message);
	}

	// 2. Load chache
	const loadResultsFn = async (promise: Promise<unknown>, sourcePath: string) =>
		promise.then(async () => {
			// const message = `...creating [${task.format}] image for "${task.basename}"`;

			const sourceName = basename(sourcePath);
			const results: TaskResult[] | null = await loadCachedResults(config, sourceName);
			if (results) {
				cache[sourceName] = results;
			}
		});

	await files.reduce(loadResultsFn, Promise.resolve());

	const CACHE = Object.values(cache).reduce((acc, trs) => [...acc, ...trs], []);

	const isCached = (outputPath: string) => CACHE.some((tr) => tr.paths.outputPath === outputPath);
	const isStale = (outputPath: string) =>
		CACHE.some((tr) => {
			if (tr.format === 'base64') {
				return tr.paths.outputPath === outputPath && !tr.paths.url?.startsWith('data:image');
			} else {
				return tr.paths.outputPath === outputPath && !checkCachedFile(tr.paths.outputPath);
			}
		});

	if (!errors.length) {
		const endTime = Date.now();
		const duration = endTime - startTime;
		const cachedFiles = Object.keys(cache).length;
		const cachedCount = CACHE.length;
		const message = `\nLoaded cache for ${cachedFiles} files with ${cachedCount} images -- ${duration}ms.`;
		console.log(message);
	}

	// 3. Validate cache
	const staleCount = CACHE.filter((tr) => isStale(tr.paths.outputPath)).length;

	if (staleCount > 0) {
		const endTime = Date.now();
		const duration = endTime - startTime;
		const outputPath = joinWithSlashes(config.outputPath, config.baseUrl);
		const message = `Missing ${staleCount} files from "${outputPath}" for images from cache -- ${duration}ms.`;
		console.log(message);
	}

	/**
	 * 4. CREATE JOBS
	 *
	 * 	for each task from config
	 * 		for each size in task
	 * 			for each file found
	 * 				? check cache
	 * 				+ crate job to resize image
	 */
	config.tasks.forEach(async (task: TaskConfig) => {
		task.sizes.map(async (width) => {
			const height = task.aspectRatio ? width / task.aspectRatio : undefined;
			const resize = { width, height, withoutEnlargement: true };

			files.map((sourcePath) => {
				const paths: TaskPaths = getFilePaths(config, task, sourcePath, width);

				// eslint-disable-next-line no-constant-condition
				if (!isCached(paths.outputPath) || isStale(paths.outputPath)) {
					jobs.push({ task, paths, resize });
				}
			});
		});
	});

	if (!errors.length) {
		const endTime = Date.now();
		const duration = endTime - startTime;
		const message = `${jobs.length} resize tasks queued for ${files.length} files -- ${duration}ms.\n`;
		console.log(message);
	}

	/**
	 * 5. RESIZE IMAGES
	 *
	 * 	for each job
	 * 		+ resize image
	 */
	const resizeQueueFn = async (promise: Promise<unknown>, task: TaskJob, index: number) =>
		promise.then(async () => {
			const dots =
				index % 3 === 0 ? '.  ' : index % 3 === 1 ? '.. ' : index % 3 === 2 ? '...' : '   ';
			write_stdout(`[ ${dots} ] Resizing images ${index + 1}/${jobs.length}`);

			if (index === jobs.length - 1) {
				console.log('\n');
			}

			const result = await resizeTask(task);
			if (result?.paths) {
				await saveCachedResults(config, task.paths.sourceName, [result]);
				results.push(result);
			}
		});

	await jobs.reduce(resizeQueueFn, Promise.resolve());

	if (!errors.length && jobs.length > 0) {
		const endTime = Date.now();
		const duration = endTime - startTime;

		const message = `Finished resizing ${results.length} images -- ${duration}ms.`;
		console.log(message);
	}

	// 6. Prepare public data
	const info: ImageInfo[] = [];

	config.tasks.forEach((task: TaskConfig) => {
		files.map((sourcePath) => {
			const taskResults = [...results, ...CACHE]
				.filter((tr) => tr.paths.sourcePath === sourcePath && tr.format === task.format)
				.filter((tr) => task.sizes.includes(tr.width))
				.sort((a, b) => a.width - b.width);

			const transform = transformResults(config, task, taskResults);
			info.push(transform);
		});
	});

	const fileInfos = info.reduce((dict, i) => {
		const key = i.url;
		return { ...dict, [key]: rearrangeResults([...(dict[key] || []), i]) };
	}, {} as Record<string, ImageInfo[]>);

	// 7. Save public data
	const saves = Object.entries(fileInfos).map(async ([sourceName, is]) => {
		await saveInfo(config, sourceName, is);
	});

	if (!errors.length && saves.length > 0) {
		const endTime = Date.now();
		const duration = endTime - startTime;

		const message = `Saving resizing data for ${saves.length} images -- ${duration}ms.`;
		console.log(message);
	}

	// 8. Done

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

const tasks: TaskConfig[] = [
	{
		format: 'jpg',
		name: 'fallback',
		sizes: [768],
		aspectRatio: 16 / 10,
		options: basic.jpegOptions,
	},
	{
		format: 'base64',
		name: 'inline',
		sizes: [256],
		aspectRatio: 1,
		options: basic.pngOptions,
	},
	{
		format: 'jpg',
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
		format: 'jpg',
		name: 'thumb',
		sizes: [256],
		aspectRatio: 1,
		options: basic.jpegOptions,
	},
];

start({ ...basic, ...extra, tasks });
