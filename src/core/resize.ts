import path from "path";
import sharp from "sharp";
import { ensureDirExists, withoutTrailingSlash } from "./util";

export async function resizeInline(options: any) {
  const { sourcePath } = options;

  const sharpImage = sharp(sourcePath);

  return inlineResult(options, sharpImage);
}

export async function resizeBase64(options: any) {
  const { sourcePath } = options;

  const sharpImage = sharp(sourcePath)
    .resize({ width: options.width, withoutEnlargement: true });

  return inlineResult(options, sharpImage);
}

export async function resizeWebp(options: any) {
  const { width, webpOptions, sourcePath } = options;

  const sharpImage = sharp(sourcePath)
    .resize({ width, withoutEnlargement: true })
    .webp(webpOptions);

  return resizeResult(options, sharpImage);
}

export async function resizePng(options: any) {
  const { width, pngOptions, sourcePath } = options;

  const sharpImage = sharp(sourcePath)
    .resize({ width, withoutEnlargement: true })
    .png(pngOptions);

  return resizeResult(options, sharpImage);
}

export async function resizeJpeg(options: any) {
  const { width, jpegOptions, sourcePath } = options;

  const sharpImage = sharp(sourcePath)
    .resize({ width, withoutEnlargement: true })
    .jpeg(jpegOptions);

  return resizeResult(options, sharpImage);
}

export function resizeOptions(config: any, sourcePath: string, hash: string, format: string, width: number) {
  const extname = path.extname(sourcePath);
  const basename = path.basename(sourcePath, extname);

  const sourceFile = `${basename}${extname}`;

  const outputName = config.preserveNames ? basename : hash;
  const outputFile = `${outputName}_${width}.${format}`;
  const outputDir = path.join(process.cwd(), config.outputPath);
  const outputPath = config.outputPathFn
    ? config.outputPathFn(sourcePath, config.baseUrl, config.outputPath, outputFile)
    : path.join(outputDir, config.baseUrl, outputFile);

  const url = `${withoutTrailingSlash(config.baseUrl)}/${outputFile}`;
  const srcset = `${url} ${width}w`;

  const { jpegOptions, pngOptions, webpOptions } = config;

  return {
    sourceFile, sourcePath, outputFile, outputPath,
    url, srcset, width,
    jpegOptions, pngOptions, webpOptions
  };
}

export async function resizeResult(options: any, sharpImage: sharp.Sharp) {
  const { outputPath, url, srcset, outputFile } = options;

  await ensureDirExists(outputPath);
  const { format, width, height, size } = await sharpImage.toFile(outputPath);

  return {
    outputPath, outputFile,
    srcset, url,
    format, width, height, size,
  };
}

export async function inlineResult(options: any, sharpImage: sharp.Sharp) {
  const buffer = await sharpImage.toBuffer();
  const { width, height, size } = await sharp(buffer).metadata();
  const url: string = `data:image/png;base64,${buffer.toString('base64')}`;

  return {
    // TODO: Remove the slicing when done.
    urL: url.slice(0, 100),
    format: 'base64', width, height, size,
  };
}
