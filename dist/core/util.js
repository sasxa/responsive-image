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
        define(["require", "exports", "crypto", "fs", "path"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.write_stdout = exports.ensureDirExists = exports.withoutTrailingSlash = exports.md5_hash = void 0;
    const crypto_1 = __importDefault(require("crypto"));
    const fs_1 = __importDefault(require("fs"));
    const path_1 = __importDefault(require("path"));
    function md5_hash(data) {
        return crypto_1.default
            .createHash('md5')
            .update(data, 'utf8')
            .digest('hex');
    }
    exports.md5_hash = md5_hash;
    function withoutTrailingSlash(value) {
        return value.replace(/\/$/, '');
    }
    exports.withoutTrailingSlash = withoutTrailingSlash;
    function ensureDirExists(filepath) {
        return __awaiter(this, void 0, void 0, function* () {
            const dirPath = path_1.default.dirname(filepath);
            yield fs_1.default.promises.mkdir(dirPath, { recursive: true });
        });
    }
    exports.ensureDirExists = ensureDirExists;
    function write_stdout(value) {
        /* need to use  `process.stdout.write` becuase console.log print a newline character */
        /* \r clear the current line and then print the other characters making it looks like it refresh*/
        process.stdout.write(`\r${value}`);
    }
    exports.write_stdout = write_stdout;
});
