import { Config } from './types';
//   const outputPath = path.join(config.outputDir, config.baseUrl, outputFile);

/**
 * Example:
 *
 *
 * sourcePath:
 * ~\public\images\example.png
 * sourceUrl:
 * <img src="images/example.png">
 *
 *
 * outputFile:
 * <MD5_HASH>_375.webp
 * outputPath:
 * ~\public\images\<MD5_HASH>_375.webp
 * url:
 * images/<MD5_HASH>_375.webp
 * srcset:
 * images/<MD5_HASH>_375.webp 375w
 */

export const defaults: Config = {
	verbose: true,
	logging: true,

	/**
	 *  Options for image file search
	 */
	searchPaths: ['src', 'tmp'],

	imageFormats: ['png', 'jpg', 'jpeg', 'raw', 'tiff'],

	/**
	 *  Options for sharp image processing
	 */
	inlineBelow: 10000, // inline all images in img tags below 10kb
	aspectRatio: 0,

	base64Options: {
		placeholder: 'blur', // TODO: implement "trace",
		// Potrace options for SVG placeholder
		background: 'white',
		color: 'pink',
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

	fallback: 768,

	/**
	 * Options for output file naming
	 */
	sizes: [256, 480, 768, 1280, 1920], // array of sizes for srcset in pixels
	baseUrl: 'images',
	preserveNames: true,
	outputPath: 'public',
	outputDir: '',
};
