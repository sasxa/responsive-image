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
        define(["require", "exports", "path", "sharp", "./util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.inlineResult = exports.resizeResult = exports.resizeOptions = exports.resizeJpeg = exports.resizePng = exports.resizeWebp = exports.resizeBase64 = exports.resizeInline = void 0;
    const path_1 = __importDefault(require("path"));
    const sharp_1 = __importDefault(require("sharp"));
    const util_1 = require("./util");
    function resizeInline(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const { sourcePath } = options;
            const sharpImage = sharp_1.default(sourcePath);
            return inlineResult(options, sharpImage);
        });
    }
    exports.resizeInline = resizeInline;
    function resizeBase64(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const { sourcePath } = options;
            const sharpImage = sharp_1.default(sourcePath)
                .resize({ width: options.width, withoutEnlargement: true });
            return inlineResult(options, sharpImage);
        });
    }
    exports.resizeBase64 = resizeBase64;
    function resizeWebp(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const { width, webpOptions, sourcePath } = options;
            const sharpImage = sharp_1.default(sourcePath)
                .resize({ width, withoutEnlargement: true })
                .webp(webpOptions);
            return resizeResult(options, sharpImage);
        });
    }
    exports.resizeWebp = resizeWebp;
    function resizePng(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const { width, pngOptions, sourcePath } = options;
            const sharpImage = sharp_1.default(sourcePath)
                .resize({ width, withoutEnlargement: true })
                .png(pngOptions);
            return resizeResult(options, sharpImage);
        });
    }
    exports.resizePng = resizePng;
    function resizeJpeg(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const { width, jpegOptions, sourcePath } = options;
            const sharpImage = sharp_1.default(sourcePath)
                .resize({ width, withoutEnlargement: true })
                .jpeg(jpegOptions);
            return resizeResult(options, sharpImage);
        });
    }
    exports.resizeJpeg = resizeJpeg;
    function resizeOptions(config, sourcePath, hash, format, width) {
        const extname = path_1.default.extname(sourcePath);
        const basename = path_1.default.basename(sourcePath, extname);
        const sourceFile = `${basename}${extname}`;
        const outputName = config.preserveNames ? basename : hash;
        const outputFile = `${outputName}_${width}.${format}`;
        const outputDir = path_1.default.join(process.cwd(), config.outputPath);
        const outputPath = config.outputPathFn
            ? config.outputPathFn(sourcePath, config.baseUrl, config.outputPath, outputFile)
            : path_1.default.join(outputDir, config.baseUrl, outputFile);
        const url = `${util_1.withoutTrailingSlash(config.baseUrl)}/${outputFile}`;
        const srcset = `${url} ${width}w`;
        const { jpegOptions, pngOptions, webpOptions } = config;
        return {
            sourceFile, sourcePath, outputFile, outputPath,
            url, srcset, width,
            jpegOptions, pngOptions, webpOptions
        };
    }
    exports.resizeOptions = resizeOptions;
    function resizeResult(options, sharpImage) {
        return __awaiter(this, void 0, void 0, function* () {
            const { outputPath, url, srcset, outputFile } = options;
            yield util_1.ensureDirExists(outputPath);
            const { format, width, height, size } = yield sharpImage.toFile(outputPath);
            return {
                outputPath, outputFile,
                srcset, url,
                format, width, height, size,
            };
        });
    }
    exports.resizeResult = resizeResult;
    function inlineResult(options, sharpImage) {
        return __awaiter(this, void 0, void 0, function* () {
            const buffer = yield sharpImage.toBuffer();
            const { width, height, size } = yield sharp_1.default(buffer).metadata();
            const url = `data:image/png;base64,${buffer.toString('base64')}`;
            return {
                // TODO: Remove the slicing when done.
                urL: url.slice(0, 100),
                format: 'base64', width, height, size,
            };
        });
    }
    exports.inlineResult = inlineResult;
});
