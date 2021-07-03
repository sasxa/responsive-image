/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import path from 'path';
import sharp from 'sharp';
import { Config, Output, ResizeOptions } from './types';
import { ensureDirExists, withoutTrailingSlash } from './util';

export async function resizeInline(options: ResizeOptions) {
	const { sourcePath } = options;

	const sharpImage = sharp(sourcePath);

	return inlineResult(options, sharpImage);
}

export async function resizeBase64(options: ResizeOptions) {
	const { width, height, sourcePath } = options;

	const sharpImage = sharp(sourcePath).resize({ width, height, withoutEnlargement: true });

	return inlineResult(options, sharpImage);
}

export async function resizeWebp(options: ResizeOptions) {
	const { width, height, webpOptions, sourcePath } = options;

	const sharpImage = sharp(sourcePath)
		.resize({ width, height, withoutEnlargement: true })
		.webp(webpOptions);

	return resizeResult(options, sharpImage);
}

export async function resizePng(options: ResizeOptions) {
	const { width, height, pngOptions, sourcePath } = options;

	const sharpImage = sharp(sourcePath)
		.resize({ width, height, withoutEnlargement: true })
		.png(pngOptions);

	return resizeResult(options, sharpImage);
}

export async function resizeJpeg(options: ResizeOptions) {
	const { width, height, jpegOptions, sourcePath } = options;

	const sharpImage = sharp(sourcePath)
		.resize({ width, height, withoutEnlargement: true })
		.jpeg(jpegOptions);

	return resizeResult(options, sharpImage);
}

export function resizeOptions(
	config: Config,
	sourcePath: string,
	hash: string,
	format: string,
	width: number,
): ResizeOptions {
	const extname = path.extname(sourcePath);
	const basename = path.basename(sourcePath, extname);

	const sourceFile = `${basename}${extname}`;

	const outputName = config.preserveNames ? basename : hash;
	const outputFile = `${outputName}_${width}.${format}`;
	const outputPath = path.join(config.outputDir, config.baseUrl, outputFile);
	// const outputDir = path.join(process.cwd(), config.outputPath);
	// const outputPath = config.outputPathFn
	// 	? config.outputPathFn(sourcePath, config.baseUrl, config.outputPath, outputFile)
	// 	: path.join(outputDir, config.baseUrl, outputFile);
	const height = config.aspectRatio ? width / config.aspectRatio : undefined;

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
		height,
		jpegOptions,
		pngOptions,
		webpOptions,
	};
}

export async function resizeResult(
	options: ResizeOptions,
	sharpImage: sharp.Sharp,
): Promise<Output> {
	const { outputPath, url, srcset } = options;

	await ensureDirExists(outputPath);
	const { format, width, height, size } = await sharpImage.toFile(outputPath);

	return {
		// outputPath,
		// outputFile,
		srcset,
		url,
		format,
		width,
		height,
		size,
	};
}

export async function inlineResult(
	options: ResizeOptions,
	sharpImage: sharp.Sharp,
): Promise<Output> {
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
