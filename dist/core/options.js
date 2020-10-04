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
    exports.defaults = void 0;
    //   const outputPath = path.join(config.outputDir, config.baseUrl, outputFile);
    exports.defaults = {
        verbose: true,
        cacheFile: '.images.json',
        /**
         *  Options for image file search
         */
        searchPaths: [
            'src', 'tmp'
        ],
        imageFormats: [
            'png', 'jpg', 'jpeg', 'raw', 'tiff'
        ],
        /**
         *  Options for sharp image processing
         */
        inlineBelow: 10000,
        base64Options: {
            placeholder: "blur",
            // Potrace options for SVG placeholder
            background: "white",
            color: "pink",
            threshold: 120,
        },
        base64: true,
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
        webp: true,
        /**
         * Options for output file naming
        */
        sizes: [50, 375, 768, 1280, 1920],
        baseUrl: 'images',
        preserveNames: false,
        outputPath: 'public',
        // (sourcePath, baseUrl, outputPath, outputFile) => string
        outputPathFn: null,
    };
});
