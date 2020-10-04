import axios from "axios";
import fs from "fs";
import glob from "glob-promise";
import { userInfo } from 'os';
import path from "path";
import sharp from "sharp";
import { parse } from 'url';
import { Cache } from './cache';
import { Config, File } from './models';
import { defaults } from './options';
import { resizeBase64, resizeInline, resizeJpeg, resizeOptions, resizePng, resizeWebp } from './resize';
import { ensureDirExists, md5_hash, write_stdout } from "./util";

// 1. load cache
const parseOptions = (options: Config = {}): Config => {
  const config = { ...defaults, ...options };

  if (config?.cache) {
    return config;
  } else {
    return { ...config, cache: new Cache(config) };
  }
}

// 2. search for image
export const findLocalFiles = async (config: Config) => {
  const cfg = parseOptions(config);

  const globPattern = `**.{${cfg.imageFormats.join(',')}}`;
  const globOptions = {
    matchBase: true,
    ignore: [
      `**/node_modules/**`,
      `**/${cfg.outputPath}/**`
    ],
  };

  const results: string[] = [];
  const searchPaths: string[] = cfg.searchPaths;
  await searchPaths.reduce((p, cwd) =>
    p.then(async () => {
      const inCwd = await glob(globPattern, { ...globOptions, cwd });
      results.push(...inCwd.map(filepath => `${cwd}/${filepath}`))
    }), Promise.resolve());

  return results
}

// 3. download image
const downloadImage = async (config: Config, url: string) => {
  const pathname = parse(url).pathname || '';
  const sourceName = pathname.substring(pathname.lastIndexOf('/') + 1);

  const tmpDir = md5_hash(`${userInfo().username}-${config.outputPath}`);
  const tmpPath = path.join(require(`os`).tmpdir(), tmpDir);
  const sourcePath = path.join(tmpPath, sourceName);

  if (!fs.existsSync(sourcePath)) {
    await ensureDirExists(sourcePath);
    const writer = fs.createWriteStream(sourcePath);
    config.verbose && console.log(`>>> Downloading image "${url}" \n    to ${tmpPath}`);
    const { data } = await axios.get(url, { responseType: 'stream' });
    await new Promise(resolve => {
      writer.on('close', resolve);
      data.pipe(writer);
    });
  } else {
    config.verbose && console.log(`<<< Using dowloaded image "${url}" \n    from ${tmpPath}`);
  }

  return sourcePath;
}

// 4. process image
export const processImage = async (config: Config, sourceUrl: string) => {
  const cfg = parseOptions(config);

  const isRemote = Boolean(parse(sourceUrl).host);
  const url = isRemote ? sourceUrl : null;
  const sourcePath = isRemote
    ? await downloadImage(cfg, sourceUrl)
    : path.join(process.cwd(), sourceUrl);

  const outputs: any[] = [];
  const buffer = await fs.promises.readFile(sourcePath);
  const hash = md5_hash(buffer.toString());
  const extname = path.extname(sourcePath);
  const basename = path.basename(sourcePath, extname);
  const sourceName = `${basename}${extname}`;

  const metadata = await sharp(buffer).metadata();
  const { format, size, width, height, hasAlpha } = metadata;
  const isInline = size && size <= cfg.inlineBelow;

  cfg.verbose && console.log(`--- Processing "${sourceUrl}"`);
  cfg.verbose && console.log(`    ${hasAlpha ? 'transparent ' : ''}${format?.toUpperCase()}; ${size} bytes; ${width}x${height}px`);

  const cached = await cfg.cache.read(sourceUrl);
  if (cached) {
    cfg.verbose && console.log(`<<< Using ${cached.outputs.length} cached sources for image "${sourceName}"`);
    return cached;
  }

  if (isInline) {
    const options = resizeOptions(cfg, sourcePath, hash, 'base64', 0);
    const result = await resizeInline(options);

    cfg.verbose && console.log(`>>> Creating base64 inline data image for "${sourceName}" (${size} bytes)`);
    outputs.push(result);
  } else {

    if (cfg.base64 === true) {
      const options = resizeOptions(cfg, sourcePath, hash, 'base64', cfg.sizes[0]);
      const result = await resizeBase64(options);

      cfg.verbose && console.log(`>>> Creating base64 data image for "${sourceName}"`);
      outputs.push(result);
    }

    const imageWidths = [...cfg.sizes, width]
      .filter(size => size <= Math.max(...cfg.sizes));
    const promises = [...new Set<number>(imageWidths)]
      .filter((size: number) => size <= (width || 0))
      .map(async (imageWidth: number) => {
        if (cfg.webp) {
          const options = resizeOptions(cfg, sourcePath, hash, 'webp', imageWidth);
          const result = await resizeWebp(options);

          cfg.verbose && console.log(`>>> Creating webp image "${result.srcset}"`);
          outputs.push(result);
        }

        if (hasAlpha) {
          const options = resizeOptions(cfg, sourcePath, hash, 'png', imageWidth);
          const result = await resizePng(options);

          cfg.verbose && console.log(`>>> Creating png image "${result.srcset}"`);
          outputs.push(result);
        } else {
          const options = resizeOptions(cfg, sourcePath, hash, 'jpg', imageWidth);
          const result = await resizeJpeg(options);

          cfg.verbose && console.log(`>>> Creating jpg image "${result.srcset}"`);
          outputs.push(result);
        }
      });

    await Promise.all(promises);
    cfg.verbose && console.log(`>>> Creating ${outputs.length} images in ${cfg.outputPath}`);
  }

  const image = {
    sourceUrl, sourceName, sourcePath,
    basename, extname, url, hash,
    format, size, width, height,
    hasAlpha, isInline,
    outputs
  };

  await cfg.cache.add({ [hash]: image });
  return image;
}

// 4b. process multiple images
export const processImages = async (config: Config, filepaths: string[]) => {
  const cfg = parseOptions(config);

  if (filepaths.length) {
    await filepaths
      .filter(filepath => !cfg.cache.isValid(cfg.cache, filepath))
      .reduce((p, filepath, index) => {
        return p.then(() => processImage(cfg, filepath)).then(() => {
          const progressCounter = `${index + 1} / ${filepaths.length}`;

          if (!cfg.verbose) {
            const progressDors =
              index % 3 === 0 ? '.  ' :
                index % 3 === 1 ? '.. ' :
                  index % 3 === 2 ? '...' : '   '

            write_stdout(`[ ${progressDors} ] Processing images ${progressCounter}`);
          } else {
            console.log(`Processed ${progressCounter} images\n`);
          }
        })
      }, Promise.resolve());
  }
}

// 5. verify cache and rebuild invalid image
export const rebuildImages = async (config: Config) => {
  const cfg = parseOptions(config);

  try {
    const invalid: File[] = await cfg.cache.verify();
    if (invalid.length) {
      console.log(`\nRebuilding ${invalid.length} invalid image(s)\n`);

      await invalid.reduce((p, file) =>
        p.then(() => cfg.cache.remove(file.hash)), Promise.resolve());
      await invalid.reduce((p, file) =>
        p.then(() => processImage(cfg, file.url || file.filepath)), Promise.resolve());
    }
  } catch (error) {
    console.error(`Error ...`, error);
  }
}
