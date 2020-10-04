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
        define(["require", "exports", "fs", "./util", "./options", "path"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Cache = void 0;
    const fs_1 = __importDefault(require("fs"));
    const util_1 = require("./util");
    const options_1 = require("./options");
    const path_1 = __importDefault(require("path"));
    class Cache {
        constructor(config) {
            this.config = config;
            this.init(config);
        }
        init(config) {
            return __awaiter(this, void 0, void 0, function* () {
                try {
                    const outputPath = config.outputPath || options_1.defaults.outputPath;
                    const cacheFileName = config.cacheFile || options_1.defaults.cacheFile;
                    this.cacheFile = path_1.default.join(process.cwd(), outputPath, cacheFileName);
                    yield util_1.ensureDirExists(this.cacheFile);
                    const cache = yield this.load();
                    const checksum = util_1.md5_hash(JSON.stringify(config));
                    if (cache.checksum !== checksum) {
                        yield this.save({ checksum });
                    }
                }
                catch (error) {
                    console.error(`Error initializing cache`, error);
                }
            });
        }
        load() {
            return __awaiter(this, void 0, void 0, function* () {
                try {
                    const buffer = yield fs_1.default.promises.readFile(this.cacheFile);
                    return JSON.parse(buffer.toString());
                }
                catch (error) {
                    return {};
                }
            });
        }
        save(cache) {
            return __awaiter(this, void 0, void 0, function* () {
                try {
                    const json = JSON.stringify(cache, null, 2);
                    yield fs_1.default.promises.writeFile(this.cacheFile, json);
                }
                catch (error) {
                    console.error(`Error saving cache`, error);
                }
            });
        }
        add(data) {
            return __awaiter(this, void 0, void 0, function* () {
                const cache = yield this.load();
                this.save(Object.assign(Object.assign({}, cache), data));
            });
        }
        remove(hash) {
            return __awaiter(this, void 0, void 0, function* () {
                const cache = yield this.load();
                delete cache[hash];
                console.log(`Removing "${hash}" from cache`);
                this.save(cache);
            });
        }
        read(sourceUrl) {
            return __awaiter(this, void 0, void 0, function* () {
                const cache = yield this.load();
                const isValid = this.isValid(cache, sourceUrl);
                return !isValid ? null : this.find(cache, sourceUrl);
            });
        }
        verify() {
            return __awaiter(this, void 0, void 0, function* () {
                const invalid = new Set();
                const cache = yield this.load();
                Object.values(cache)
                    .filter((file) => !!(file === null || file === void 0 ? void 0 : file.hash))
                    .forEach(({ hash, outputs }) => outputs
                    .filter((file) => !!(file === null || file === void 0 ? void 0 : file.outputPath))
                    .forEach(({ outputPath }) => {
                    if (!fs_1.default.existsSync(outputPath)) {
                        invalid.add(hash);
                    }
                }));
                return Array.from(invalid.keys())
                    .map(hash => cache[hash]);
            });
        }
        find(cache, sourceUrl) {
            return Object.values(cache).find((i) => {
                return (i === null || i === void 0 ? void 0 : i.sourceUrl) === sourceUrl;
            });
        }
        isValid(cache, sourceUrl) {
            const image = this.find(cache, sourceUrl);
            if (!image) {
                return false;
            }
            const { outputs, width, isInline } = image;
            const hasValidSizes = this.config.sizes
                .filter((size) => size <= width)
                .every((size) => outputs.filter((i) => i.width === size).length >= 2);
            const isBase64Valid = !this.config.base64
                ? true : outputs.some((i) => i.format === 'base64');
            return isBase64Valid && (hasValidSizes || isInline);
        }
    }
    exports.Cache = Cache;
});
