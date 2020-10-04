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
        define(["require", "exports", "./index"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const index_1 = require("./index");
    const test_url1 = 'https://images.unsplash.com/photo-1528834379234-2de7f8328fd8';
    const test_url2 = 'https://terrainformatica.com/wp-content/uploads/2018/12/sciter-ide.png';
    const test_url3 = 'https://www.vhv.rs/dpng/d/486-4864616_generic-company-logo-png-example-logo-png-transparent.png';
    const run = () => __awaiter(void 0, void 0, void 0, function* () {
        const remoteFiles = [test_url1, test_url2, test_url3];
        const localFiles = yield index_1.findLocalFiles({});
        const files = [...remoteFiles, ...localFiles];
        yield index_1.processImages({}, files);
        // await rebuildImages(config);
    });
    run();
});
