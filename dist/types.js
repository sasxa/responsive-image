(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.basicConfiguration = void 0;
    exports.basicConfiguration = {
        logging: true,
        fileExtensions: ['png', 'jpg', 'jpeg', 'raw', 'tiff'],
        searchPaths: [],
        cachePath: '',
        outputPath: '',
        baseUrl: '',
        base64Options: {
            placeholder: 'blur',
            // Potrace options for SVG placeholder
            background: 'white',
            color: 'pink',
            threshold: 120,
            inlineBelow: 10000,
        },
        // JPG options [sharp docs](https://sharp.pixelplumbing.com/en/stable/api-output/#jpeg)
        jpegOptions: {
            quality: 80,
            force: false,
        },
        // PNG options [sharp docs](https://sharp.pixelplumbing.com/en/stable/api-output/#png)
        pngOptions: {
            compressionLevel: 8,
            force: false,
        },
        // WebP options [sharp docs](https://sharp.pixelplumbing.com/en/stable/api-output/#webp)
        webpOptions: {
            quality: 75,
            lossless: false,
            force: true,
        },
        tasks: [],
    };
});
