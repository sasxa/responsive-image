/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import path from 'path';
import sharp from 'sharp';
import { Config, Output } from './models';
import { ensureDirExists, withoutTrailingSlash } from './util';

type Options = {
	sourceFile: string;
	sourcePath: string;
	outputFile: string;
	outputPath: string;
	url: string;
	srcset: string;
	width: number;
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

export async function resizeInline(options: Options) {
	const { sourcePath } = options;

	const sharpImage = sharp(sourcePath);

	return inlineResult(options, sharpImage);
}

export async function resizeBase64(options: Options) {
	const { sourcePath } = options;

	const sharpImage = sharp(sourcePath).resize({ width: options.width, withoutEnlargement: true });

	return inlineResult(options, sharpImage);
}

export async function resizeWebp(options: Options) {
	const { width, webpOptions, sourcePath } = options;

	const sharpImage = sharp(sourcePath)
		.resize({ width, withoutEnlargement: true })
		.webp(webpOptions);

	return resizeResult(options, sharpImage);
}

export async function resizePng(options: Options) {
	const { width, pngOptions, sourcePath } = options;

	const sharpImage = sharp(sourcePath).resize({ width, withoutEnlargement: true }).png(pngOptions);

	return resizeResult(options, sharpImage);
}

export async function resizeJpeg(options: Options) {
	const { width, jpegOptions, sourcePath } = options;

	const sharpImage = sharp(sourcePath)
		.resize({ width, withoutEnlargement: true })
		.jpeg(jpegOptions);

	return resizeResult(options, sharpImage);
}

export function resizeOptions(
	config: Config,
	sourcePath: string,
	hash: string,
	format: string,
	width: number,
): Options {
	const extname = path.extname(sourcePath);
	const basename = path.basename(sourcePath, extname);

	const sourceFile = `${basename}${extname}`;

	const outputName = config.preserveNames ? basename : hash;
	const outputFile = `${outputName}_${width}.${format}`;
	const outputDir = path.join(process.cwd(), config.outputPath);
	const outputPath = path.join(outputDir, config.baseUrl, outputFile);
	// const outputPath = config.outputPathFn
	// 	? config.outputPathFn(sourcePath, config.baseUrl, config.outputPath, outputFile)
	// 	: path.join(outputDir, config.baseUrl, outputFile);

	const url = `${withoutTrailingSlash(config.baseUrl)}/${outputFile}`;
	const srcset = `${url} ${width}w`;

	const { jpegOptions, pngOptions, webpOptions } = config;

	return {
		sourceFile,
		sourcePath,
		outputFile,
		outputPath,
		url,
		srcset,
		width,
		jpegOptions,
		pngOptions,
		webpOptions,
	};
}

export async function resizeResult(options: Options, sharpImage: sharp.Sharp): Promise<Output> {
	const { outputPath, url, srcset, outputFile } = options;

	await ensureDirExists(outputPath);
	const { format, width, height, size } = await sharpImage.toFile(outputPath);

	return {
		outputPath,
		outputFile,
		srcset,
		url,
		format,
		width,
		height,
		size,
	};
}

export async function inlineResult(options: Options, sharpImage: sharp.Sharp): Promise<Output> {
	const buffer = await sharpImage.toBuffer();
	const { width, height, size } = await sharp(buffer).metadata();
	const url = `data:image/png;base64,${buffer.toString('base64')}`;

	return {
		url,
		format: 'base64',
		width: width || 0,
		height: height || 0,
		size: size || 0,
	};
}
