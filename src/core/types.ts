export type Config = {
	verbose: boolean;
	logging: boolean;

	/**
	 *  Options for image file search
	 */
	searchPaths: string[];
	imageFormats: string[];

	/**
	 *  Options for sharp image processing
	 */
	inlineBelow: number; // inline all images in img tags below 10kb
	aspectRatio: number;

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
	fallback: number;

	/**
	 * Options for output file naming
	 */
	sizes: number[]; // array of sizes for srcset in pixels
	baseUrl: string;
	preserveNames: boolean;
	outputPath: string;
	outputDir: string;
};

export type Image = {
	sourceName: string;
	// sourceUrl: string;
	// sourcePath: string;
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
	sources: Partial<Sources>;
	outputs?: Output[];
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

export type ResizeOptions = {
	sourceFile: string;
	sourcePath: string;
	outputFile: string;
	outputPath: string;
	url: string;
	srcset: string;
	width: number;
	height?: number;
	jpegOptions: {
		quality: number;
		force: boolean;
	};
	pngOptions: {
		compressionLevel: number;
		force: boolean;
	};
	webpOptions: {
		quality: number;
		lossless: boolean;
		force: boolean;
	};
};

export type Sources = {
	src: string;
	webp: string;
	png: string;
	jpeg: string;
};
