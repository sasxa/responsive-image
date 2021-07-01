export type Config = {
	verbose: boolean;

	/**
	 *  Options for image file search
	 */
	searchPaths: string[];

	imageFormats: string[];

	/**
	 *  Options for sharp image processing
	 */
	inlineBelow: number; // inline all images in img tags below 10kb

	base64Options: {
		placeholder: 'blur'; // TODO: implement "trace",
		// Potrace options for SVG placeholder
		background: string;
		color: string;
		threshold: number;
	};

	base64: boolean;

	// JPG options [sharp docs](https://sharp.pixelplumbing.com/en/stable/api-output/#jpeg)
	jpegOptions: {
		quality: number;
		force: boolean;
	};

	// PNG options [sharp docs](https://sharp.pixelplumbing.com/en/stable/api-output/#png)
	pngOptions: {
		compressionLevel: number;
		force: boolean;
	};

	// WebP options [sharp docs](https://sharp.pixelplumbing.com/en/stable/api-output/#webp)
	webpOptions: {
		quality: number;
		lossless: boolean;
		force: boolean;
	};

	webp: boolean;

	/**
	 * Options for output file naming
	 */
	sizes: number[]; // array of sizes for srcset in pixels
	baseUrl: string;
	preserveNames: boolean;
	outputPath: string;
	outputDir: string;
	cachePath: string;
	cacheDir: string;
};

export type Image = {
	sourceUrl: string;
	sourceName: string;
	sourcePath: string;
	basename: string;
	extname: string;
	url?: string;
	hash: string;
	format?: string;
	size?: number;
	width?: number;
	height?: number;
	hasAlpha?: boolean;
	isInline: boolean;
	outputs: Output[];
};

export type Output = {
	outputPath?: string;
	outputFile?: string;
	srcset?: string;
	url: string;
	format: string;
	width: number;
	height: number;
	size: number;
};
