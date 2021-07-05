var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "crypto", "fs", "glob-promise", "path", "sharp"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.saveInfo = exports.loadInfo = exports.transformResults = exports.write_stdout = exports.loadCachedResults = exports.saveCachedResults = exports.rearrangeResults = exports.groupBy = exports.resizeTask = exports.basename = exports.checkCachedFile = exports.ensureDirExists = exports.getFilePaths = exports.joinWithSlashes = exports.withoutTrailingSlash = exports.md5_hash = exports.findLocalFiles = void 0;
    const crypto_1 = __importDefault(require("crypto"));
    const fs_1 = __importDefault(require("fs"));
    const glob_promise_1 = __importDefault(require("glob-promise"));
    const path_1 = __importDefault(require("path"));
    const sharp_1 = __importDefault(require("sharp"));
    exports.findLocalFiles = (config) => __awaiter(void 0, void 0, void 0, function* () {
        const globPattern = config.fileExtensions.length === 1
            ? `**.${config.fileExtensions.join('')}`
            : `**.{${config.fileExtensions.join(',')}}`;
        const globOptions = {
            matchBase: true,
            ignore: [`**/node_modules/**`, `**/${config.outputPath}/**`],
        };
        const results = [];
        const searchPaths = config.searchPaths;
        const queueFn = (promise, searchPath) => promise.then(() => __awaiter(void 0, void 0, void 0, function* () {
            const inCwd = yield glob_promise_1.default(globPattern, Object.assign(Object.assign({}, globOptions), { cwd: searchPath }));
            results.push(...inCwd.map((filepath) => `${searchPath}/${filepath}`));
        }));
        yield searchPaths.reduce(queueFn, Promise.resolve());
        return results;
    });
    function md5_hash(data) {
        return crypto_1.default.createHash('md5').update(data, 'utf8').digest('hex');
    }
    exports.md5_hash = md5_hash;
    function withoutTrailingSlash(value) {
        return value.replace(/\/$/, '');
    }
    exports.withoutTrailingSlash = withoutTrailingSlash;
    function joinWithSlashes(...args) {
        return args.map((fragment) => fragment.split('/').filter(Boolean).join('')).join('/');
    }
    exports.joinWithSlashes = joinWithSlashes;
    function getFilePaths(config, task, sourcePath, width) {
        const { format, name } = task;
        const extname = path_1.default.extname(sourcePath);
        const basename = path_1.default.basename(sourcePath, extname);
        const sourceName = `${basename}${extname}`;
        const outputFile = name === 'fallback' ? sourceName : `${basename}_${width}.${format}`;
        const outputPath = joinWithSlashes(config.outputPath, config.baseUrl, outputFile);
        const url = joinWithSlashes('', config.baseUrl, outputFile);
        const srcset = `${url} ${width}w`;
        if (name === 'fallback') {
            return { basename, sourceName, sourcePath, outputPath, url };
        }
        else if (format !== 'base64') {
            return { basename, sourceName, sourcePath, outputPath, url, srcset };
        }
        else {
            return { basename, sourceName, sourcePath, outputPath };
        }
    }
    exports.getFilePaths = getFilePaths;
    function ensureDirExists(filepath) {
        return __awaiter(this, void 0, void 0, function* () {
            const dirPath = path_1.default.dirname(filepath);
            yield fs_1.default.promises.mkdir(dirPath, { recursive: true });
        });
    }
    exports.ensureDirExists = ensureDirExists;
    function checkCachedFile(outputPath) {
        const filepath = path_1.default.normalize(path_1.default.join(process.cwd(), outputPath));
        return fs_1.default.existsSync(filepath);
    }
    exports.checkCachedFile = checkCachedFile;
    function basename(filePath) {
        return path_1.default.basename(filePath);
    }
    exports.basename = basename;
    function resizeTask({ task, paths, resize }) {
        return __awaiter(this, void 0, void 0, function* () {
            let sharpImage;
            switch (task.format) {
                case 'jpg':
                    sharpImage = sharp_1.default(paths.sourcePath)
                        .resize(resize)
                        .jpeg(task.options);
                    break;
                case 'png':
                    sharpImage = sharp_1.default(paths.sourcePath)
                        .resize(resize)
                        .png(task.options);
                    break;
                case 'webp':
                    sharpImage = sharp_1.default(paths.sourcePath)
                        .resize(resize)
                        .webp(task.options);
                    break;
                case 'base64':
                    sharpImage = sharp_1.default(paths.sourcePath).resize(resize);
                    break;
                default:
                    return Promise.reject();
            }
            return task.format === 'base64'
                ? saveBase64Image({ task, paths, resize }, sharpImage)
                : saveSharpImage({ task, paths, resize }, sharpImage);
        });
    }
    exports.resizeTask = resizeTask;
    function saveBase64Image({ task, paths, resize }, sharpImage) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const buffer = yield sharpImage.toBuffer();
            const { width, height, size, hasAlpha } = yield sharp_1.default(buffer).metadata();
            const inlineBelow = 'inlineBelow' in task.options ? ((_a = task.options) === null || _a === void 0 ? void 0 : _a.inlineBelow) || 0 : 0;
            const url = `data:image/png;base64,${buffer.toString('base64')}`;
            // const url =
            // 	size && size <= inlineBelow ? `data:image/png;base64,${buffer.toString('base64')}` : '';
            return {
                format: task.format,
                width,
                height,
                size,
                hasAlpha,
                paths: Object.assign(Object.assign({}, paths), { url }),
            };
        });
    }
    function saveSharpImage({ task, paths, resize }, sharpImage) {
        return __awaiter(this, void 0, void 0, function* () {
            yield ensureDirExists(paths.outputPath);
            const { format, width, height, size } = yield sharpImage.toFile(paths.outputPath);
            const { hasAlpha } = yield sharpImage.metadata();
            return { format: task.format, width, height, size, hasAlpha, paths };
        });
    }
    function groupBy(list, getKey) {
        const map = new Map();
        list.forEach((item) => {
            const key = getKey(item);
            const collection = map.get(key);
            if (!collection) {
                map.set(key, [item]);
            }
            else {
                collection.push(item);
            }
        });
        return Array.from(map.values());
    }
    exports.groupBy = groupBy;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const compoareOutputPath = (tr1, tr2) => {
        var _a, _b;
        return ((_a = tr1.paths) === null || _a === void 0 ? void 0 : _a.outputPath) === ((_b = tr2.paths) === null || _b === void 0 ? void 0 : _b.outputPath);
    };
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    exports.rearrangeResults = (trs) => {
        const base64 = trs.filter((tr) => tr.format === 'base64');
        const others = trs.filter((tr) => tr.format !== 'base64');
        return [...others, ...base64];
    };
    function saveCachedResults(config, sourceName, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const outputPath = path_1.default.join(config.cachePath, `${sourceName}.json`);
            const existing = yield loadCachedResults(config, sourceName);
            if (existing) {
                data = [...data, ...existing].filter((v, i, a) => a.findIndex((r) => compoareOutputPath(r, v)) === i);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                data = exports.rearrangeResults(data);
            }
            try {
                const json = JSON.stringify(data, null, 2);
                yield ensureDirExists(outputPath);
                yield fs_1.default.promises.writeFile(outputPath, json);
            }
            catch (error) {
                console.error(`Error saving cache`, error);
            }
        });
    }
    exports.saveCachedResults = saveCachedResults;
    function loadCachedResults(config, sourceName) {
        return __awaiter(this, void 0, void 0, function* () {
            const sourcePath = path_1.default.join(config.cachePath, `${sourceName}.json`);
            try {
                const buffer = yield fs_1.default.promises.readFile(sourcePath);
                return JSON.parse(buffer.toString());
            }
            catch (error) {
                return null;
            }
        });
    }
    exports.loadCachedResults = loadCachedResults;
    function write_stdout(value) {
        /* need to use  `process.stdout.write` becuase console.log print a newline character */
        /* \r clear the current line and then print the other characters making it looks like it refresh*/
        process.stdout.write(`\r${value}`);
    }
    exports.write_stdout = write_stdout;
    function transformResults(config, task, results) {
        const { name, format } = task;
        const srcset = results
            .map((tr) => { var _a; return (_a = tr.paths) === null || _a === void 0 ? void 0 : _a.srcset; })
            .filter(Boolean)
            .join(', ');
        const sizes = results.map((tr) => `(max-width: ${tr.width}px) ${tr.width}px`).join(', ');
        const metadata = results.reduce((dict, tr) => {
            const { format, size, width, height, hasAlpha } = tr;
            return Object.assign(Object.assign({}, dict), { [tr.width.toString()]: { format, size, width, height, hasAlpha } });
        }, {});
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
        }
        else if (task.name === 'fallback') {
            return { url, format, name, metadata };
        }
        else {
            return { url, format, name, srcset, sizes, metadata };
        }
    }
    exports.transformResults = transformResults;
    function loadInfo(config, sourceName) {
        return __awaiter(this, void 0, void 0, function* () {
            const sourcePath = path_1.default.join(config.outputPath, `${sourceName}.json`);
            try {
                const buffer = yield fs_1.default.promises.readFile(sourcePath);
                return JSON.parse(buffer.toString());
            }
            catch (error) {
                return null;
            }
        });
    }
    exports.loadInfo = loadInfo;
    function saveInfo(config, sourceName, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const outputPath = path_1.default.join(config.outputPath, `${sourceName}.json`);
            try {
                const json = JSON.stringify(data, null, 2);
                yield ensureDirExists(outputPath);
                yield fs_1.default.promises.writeFile(outputPath, json);
            }
            catch (error) {
                console.error(`Error saving cache`, error);
            }
        });
    }
    exports.saveInfo = saveInfo;
});
