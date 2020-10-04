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
        define(["require", "exports", "axios", "fs", "glob-promise", "os", "path", "sharp", "url", "./cache", "./options", "./resize", "./util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.rebuildImages = exports.processImages = exports.processImage = exports.findLocalFiles = void 0;
    const axios_1 = __importDefault(require("axios"));
    const fs_1 = __importDefault(require("fs"));
    const glob_promise_1 = __importDefault(require("glob-promise"));
    const os_1 = require("os");
    const path_1 = __importDefault(require("path"));
    const sharp_1 = __importDefault(require("sharp"));
    const url_1 = require("url");
    const cache_1 = require("./cache");
    const options_1 = require("./options");
    const resize_1 = require("./resize");
    const util_1 = require("./util");
    // 1. load cache
    const parseOptions = (options = {}) => {
        const config = Object.assign(Object.assign({}, options_1.defaults), options);
        if (config === null || config === void 0 ? void 0 : config.cache) {
            return config;
        }
        else {
            return Object.assign(Object.assign({}, config), { cache: new cache_1.Cache(config) });
        }
    };
    // 2. search for image
    exports.findLocalFiles = (config) => __awaiter(void 0, void 0, void 0, function* () {
        const cfg = parseOptions(config);
        const globPattern = `**.{${cfg.imageFormats.join(',')}}`;
        const globOptions = {
            matchBase: true,
            ignore: [
                `**/node_modules/**`,
                `**/${cfg.outputPath}/**`
            ],
        };
        const results = [];
        const searchPaths = cfg.searchPaths;
        yield searchPaths.reduce((p, cwd) => p.then(() => __awaiter(void 0, void 0, void 0, function* () {
            const inCwd = yield glob_promise_1.default(globPattern, Object.assign(Object.assign({}, globOptions), { cwd }));
            results.push(...inCwd.map(filepath => `${cwd}/${filepath}`));
        })), Promise.resolve());
        return results;
    });
    // 3. download image
    const downloadImage = (config, url) => __awaiter(void 0, void 0, void 0, function* () {
        const pathname = url_1.parse(url).pathname || '';
        const sourceName = pathname.substring(pathname.lastIndexOf('/') + 1);
        const tmpDir = util_1.md5_hash(`${os_1.userInfo().username}-${config.outputPath}`);
        const tmpPath = path_1.default.join(require(`os`).tmpdir(), tmpDir);
        const sourcePath = path_1.default.join(tmpPath, sourceName);
        if (!fs_1.default.existsSync(sourcePath)) {
            yield util_1.ensureDirExists(sourcePath);
            const writer = fs_1.default.createWriteStream(sourcePath);
            config.verbose && console.log(`>>> Downloading image "${url}" \n    to ${tmpPath}`);
            const { data } = yield axios_1.default.get(url, { responseType: 'stream' });
            yield new Promise(resolve => {
                writer.on('close', resolve);
                data.pipe(writer);
            });
        }
        else {
            config.verbose && console.log(`<<< Using dowloaded image "${url}" \n    from ${tmpPath}`);
        }
        return sourcePath;
    });
    // 4. process image
    exports.processImage = (config, sourceUrl) => __awaiter(void 0, void 0, void 0, function* () {
        const cfg = parseOptions(config);
        const isRemote = Boolean(url_1.parse(sourceUrl).host);
        const url = isRemote ? sourceUrl : null;
        const sourcePath = isRemote
            ? yield downloadImage(cfg, sourceUrl)
            : path_1.default.join(process.cwd(), sourceUrl);
        const outputs = [];
        const buffer = yield fs_1.default.promises.readFile(sourcePath);
        const hash = util_1.md5_hash(buffer.toString());
        const extname = path_1.default.extname(sourcePath);
        const basename = path_1.default.basename(sourcePath, extname);
        const sourceName = `${basename}${extname}`;
        const metadata = yield sharp_1.default(buffer).metadata();
        const { format, size, width, height, hasAlpha } = metadata;
        const isInline = size && size <= cfg.inlineBelow;
        cfg.verbose && console.log(`--- Processing "${sourceUrl}"`);
        cfg.verbose && console.log(`    ${hasAlpha ? 'transparent ' : ''}${format === null || format === void 0 ? void 0 : format.toUpperCase()}; ${size} bytes; ${width}x${height}px`);
        const cached = yield cfg.cache.read(sourceUrl);
        if (cached) {
            cfg.verbose && console.log(`<<< Using ${cached.outputs.length} cached sources for image "${sourceName}"`);
            return cached;
        }
        if (isInline) {
            const options = resize_1.resizeOptions(cfg, sourcePath, hash, 'base64', 0);
            const result = yield resize_1.resizeInline(options);
            cfg.verbose && console.log(`>>> Creating base64 inline data image for "${sourceName}" (${size} bytes)`);
            outputs.push(result);
        }
        else {
            if (cfg.base64 === true) {
                const options = resize_1.resizeOptions(cfg, sourcePath, hash, 'base64', cfg.sizes[0]);
                const result = yield resize_1.resizeBase64(options);
                cfg.verbose && console.log(`>>> Creating base64 data image for "${sourceName}"`);
                outputs.push(result);
            }
            const imageWidths = [...cfg.sizes, width]
                .filter(size => size <= Math.max(...cfg.sizes));
            const promises = [...new Set(imageWidths)]
                .filter((size) => size <= (width || 0))
                .map((imageWidth) => __awaiter(void 0, void 0, void 0, function* () {
                if (cfg.webp) {
                    const options = resize_1.resizeOptions(cfg, sourcePath, hash, 'webp', imageWidth);
                    const result = yield resize_1.resizeWebp(options);
                    cfg.verbose && console.log(`>>> Creating webp image "${result.srcset}"`);
                    outputs.push(result);
                }
                if (hasAlpha) {
                    const options = resize_1.resizeOptions(cfg, sourcePath, hash, 'png', imageWidth);
                    const result = yield resize_1.resizePng(options);
                    cfg.verbose && console.log(`>>> Creating png image "${result.srcset}"`);
                    outputs.push(result);
                }
                else {
                    const options = resize_1.resizeOptions(cfg, sourcePath, hash, 'jpg', imageWidth);
                    const result = yield resize_1.resizeJpeg(options);
                    cfg.verbose && console.log(`>>> Creating jpg image "${result.srcset}"`);
                    outputs.push(result);
                }
            }));
            yield Promise.all(promises);
            cfg.verbose && console.log(`>>> Creating ${outputs.length} images in ${cfg.outputPath}`);
        }
        const image = {
            sourceUrl, sourceName, sourcePath,
            basename, extname, url, hash,
            format, size, width, height,
            hasAlpha, isInline,
            outputs
        };
        yield cfg.cache.add({ [hash]: image });
        return image;
    });
    // 4b. process multiple images
    exports.processImages = (config, filepaths) => __awaiter(void 0, void 0, void 0, function* () {
        const cfg = parseOptions(config);
        if (filepaths.length) {
            yield filepaths
                .filter(filepath => !cfg.cache.isValid(cfg.cache, filepath))
                .reduce((p, filepath, index) => {
                return p.then(() => exports.processImage(cfg, filepath)).then(() => {
                    const progressCounter = `${index + 1} / ${filepaths.length}`;
                    if (!cfg.verbose) {
                        const progressDors = index % 3 === 0 ? '.  ' :
                            index % 3 === 1 ? '.. ' :
                                index % 3 === 2 ? '...' : '   ';
                        util_1.write_stdout(`[ ${progressDors} ] Processing images ${progressCounter}`);
                    }
                    else {
                        console.log(`Processed ${progressCounter} images\n`);
                    }
                });
            }, Promise.resolve());
        }
    });
    // 5. verify cache and rebuild invalid image
    exports.rebuildImages = (config) => __awaiter(void 0, void 0, void 0, function* () {
        const cfg = parseOptions(config);
        try {
            const invalid = yield cfg.cache.verify();
            if (invalid.length) {
                console.log(`\nRebuilding ${invalid.length} invalid image(s)\n`);
                yield invalid.reduce((p, file) => p.then(() => cfg.cache.remove(file.hash)), Promise.resolve());
                yield invalid.reduce((p, file) => p.then(() => exports.processImage(cfg, file.url || file.filepath)), Promise.resolve());
            }
        }
        catch (error) {
            console.error(`Error ...`, error);
        }
    });
});
