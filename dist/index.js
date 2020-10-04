(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "./core/index"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.rebuildImages = exports.processImages = exports.processImage = exports.findLocalFiles = void 0;
    var index_1 = require("./core/index");
    Object.defineProperty(exports, "findLocalFiles", { enumerable: true, get: function () { return index_1.findLocalFiles; } });
    Object.defineProperty(exports, "processImage", { enumerable: true, get: function () { return index_1.processImage; } });
    Object.defineProperty(exports, "processImages", { enumerable: true, get: function () { return index_1.processImages; } });
    Object.defineProperty(exports, "rebuildImages", { enumerable: true, get: function () { return index_1.rebuildImages; } });
});
