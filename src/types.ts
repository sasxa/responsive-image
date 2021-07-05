import sharp, { JpegOptions, PngOptions, ResizeOptions, WebpOptions } from 'sharp';

export type Configuration = {
	logging: boolean;

	// Process images with these file extensions
	fileExtensions: string[];
	// Find images in these local "searchPaths" (relative to the project root)
	searchPaths: string[];
	// Download imaage in "downloadPath" (relative to the project root)
	cachePath: string;
	// Save processed images in "outputPath" (relative to the project root)
	outputPath: string;
	// Online path for the image URLs, e.g.
	// https://www.example.com/some-value/image.jpg
	// <some-value> is the "baseUrl"
	baseUrl: string;

	base64Options: {
		placeholder: 'blur'; // TODO: implement "trace",
		// Potrace options for SVG placeholder
		background: string;
		color: string;
		threshold: number;
		inlineBelow: number; // inline all images in img tags below ~
	};

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

	tasks: TaskConfig[];
};

export const basicConfiguration: Configuration = {
	logging: true,

	fileExtensions: ['png', 'jpg', 'jpeg', 'raw', 'tiff'],
	searchPaths: [],
	cachePath: '',
	outputPath: '',
	baseUrl: '',

	base64Options: {
		placeholder: 'blur', // TODO: implement "trace",
		// Potrace options for SVG placeholder
		background: 'white',
		color: 'pink',
		threshold: 120,
		inlineBelow: 10000, // inline all images in img tags below 10kb
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

export type TaskFormat = 'jpg' | 'png' | 'webp' | 'base64';

export type TaskConfig = {
	// preserveNames: boolean;
	sizes: number[];
	aspectRatio: number;
	format: TaskFormat;
	name: string;
	options: Partial<PngOptions | JpegOptions | WebpOptions | { inlineBelow: number }>;
};

export type TaskPaths = {
	basename: string;

	sourcePath: string;
	sourceName: string;
	outputPath: string;

	url?: string;
	srcset?: string;
};

export type TaskJob = {
	paths: TaskPaths;
	task: TaskConfig;
	resize: Partial<ResizeOptions>;
};

export type TaskResult = {
	format: string;
	size: number;
	width: number;
	height: number;
	hasAlpha: boolean;
	paths: TaskPaths;
};

export type Metadata = {
	format: string;
	size: number;
	width: number;
	height: number;
	hasAlpha: boolean;
};

export type ImageInfo = {
	url: string;
	format: string;
	name: string;
	data?: string;
	srcset?: string;
	sizes?: string;
	metadata: Record<string, Metadata>;
};
