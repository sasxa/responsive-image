var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "./helpers", "./types"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.start = void 0;
    const helpers_1 = require("./helpers");
    const types_1 = require("./types");
    function start(config) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const startTime = Date.now();
            const errors = [];
            const jobs = [];
            const results = [];
            const cache = {};
            // Validate configuration
            if (((_a = config.searchPaths) === null || _a === void 0 ? void 0 : _a.length) === 0) {
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
            const files = yield helpers_1.findLocalFiles(config);
            if (files.length === 0) {
                const message = `No files found. Check "searchPaths" and "fileExtensions" options.`;
                return console.error(errors.push(message), '-', message);
            }
            else {
                const message = `${files.length} files found. Processing ...`;
                console.error(message);
            }
            // 2. Load chache
            const loadResultsFn = (promise, sourcePath) => __awaiter(this, void 0, void 0, function* () {
                return promise.then(() => __awaiter(this, void 0, void 0, function* () {
                    // const message = `...creating [${task.format}] image for "${task.basename}"`;
                    const sourceName = helpers_1.basename(sourcePath);
                    const results = yield helpers_1.loadCachedResults(config, sourceName);
                    if (results) {
                        cache[sourceName] = results;
                    }
                }));
            });
            yield files.reduce(loadResultsFn, Promise.resolve());
            const CACHE = Object.values(cache).reduce((acc, trs) => [...acc, ...trs], []);
            const isCached = (outputPath) => CACHE.some((tr) => tr.paths.outputPath === outputPath);
            const isStale = (outputPath) => CACHE.some((tr) => {
                var _a;
                if (tr.format === 'base64') {
                    return tr.paths.outputPath === outputPath && !((_a = tr.paths.url) === null || _a === void 0 ? void 0 : _a.startsWith('data:image'));
                }
                else {
                    return tr.paths.outputPath === outputPath && !helpers_1.checkCachedFile(tr.paths.outputPath);
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
                const outputPath = helpers_1.joinWithSlashes(config.outputPath, config.baseUrl);
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
            config.tasks.forEach((task) => __awaiter(this, void 0, void 0, function* () {
                task.sizes.map((width) => __awaiter(this, void 0, void 0, function* () {
                    const height = task.aspectRatio ? width / task.aspectRatio : undefined;
                    const resize = { width, height, withoutEnlargement: true };
                    files.map((sourcePath) => {
                        const paths = helpers_1.getFilePaths(config, task, sourcePath, width);
                        // eslint-disable-next-line no-constant-condition
                        if (!isCached(paths.outputPath) || isStale(paths.outputPath)) {
                            jobs.push({ task, paths, resize });
                        }
                    });
                }));
            }));
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
            const resizeQueueFn = (promise, task, index) => __awaiter(this, void 0, void 0, function* () {
                return promise.then(() => __awaiter(this, void 0, void 0, function* () {
                    const dots = index % 3 === 0 ? '.  ' : index % 3 === 1 ? '.. ' : index % 3 === 2 ? '...' : '   ';
                    helpers_1.write_stdout(`[ ${dots} ] Resizing images ${index + 1}/${jobs.length}`);
                    if (index === jobs.length - 1) {
                        console.log('\n');
                    }
                    const result = yield helpers_1.resizeTask(task);
                    if (result === null || result === void 0 ? void 0 : result.paths) {
                        yield helpers_1.saveCachedResults(config, task.paths.sourceName, [result]);
                        results.push(result);
                    }
                }));
            });
            yield jobs.reduce(resizeQueueFn, Promise.resolve());
            if (!errors.length && jobs.length > 0) {
                const endTime = Date.now();
                const duration = endTime - startTime;
                const message = `Finished resizing ${results.length} images -- ${duration}ms.`;
                console.log(message);
            }
            // 6. Prepare public data
            const info = [];
            config.tasks.forEach((task) => {
                files.map((sourcePath) => {
                    const taskResults = [...results, ...CACHE]
                        .filter((tr) => tr.paths.sourcePath === sourcePath && tr.format === task.format)
                        .filter((tr) => task.sizes.includes(tr.width))
                        .sort((a, b) => a.width - b.width);
                    const transform = helpers_1.transformResults(config, task, taskResults);
                    info.push(transform);
                });
            });
            const fileInfos = info.reduce((dict, i) => {
                const key = i.url;
                return Object.assign(Object.assign({}, dict), { [key]: helpers_1.rearrangeResults([...(dict[key] || []), i]) });
            }, {});
            // 7. Save public data
            const saves = Object.entries(fileInfos).map(([sourceName, is]) => __awaiter(this, void 0, void 0, function* () {
                yield helpers_1.saveInfo(config, sourceName, is);
            }));
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
        });
    }
    exports.start = start;
    const basic = types_1.basicConfiguration;
    const extra = {
        searchPaths: ['src/assets/images'],
        cachePath: 'src/assets/.cache',
        outputPath: 'static',
        baseUrl: '/images',
    };
    const tasks = [
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
    start(Object.assign(Object.assign(Object.assign({}, basic), extra), { tasks }));
});
