import fs from "fs";
import { Config, Image, Cache as CacheType, File } from "./models";
import { ensureDirExists, md5_hash } from "./util";
import { defaults } from './options';
import path from "path";

export class Cache {
  cacheFile!: string;
  constructor(readonly config: Config) {
    this.init(config);
  }

  async init(config: Config) {
    try {
      const outputPath = config.outputPath || defaults.outputPath;
      const cacheFileName = config.cacheFile || defaults.cacheFile;
      this.cacheFile = path.join(process.cwd(), outputPath, cacheFileName);

      await ensureDirExists(this.cacheFile);
      const cache = await this.load();
      const checksum = md5_hash(JSON.stringify(config));
      if (cache.checksum !== checksum) {
        await this.save({ checksum });
      }

    } catch (error) {
      console.error(`Error initializing cache`, error);
    }
  }

  async load() {
    try {
      const buffer = await fs.promises.readFile(this.cacheFile);
      return JSON.parse(buffer.toString());
    } catch (error) {
      return {};
    }
  }

  async save(cache: CacheType) {
    try {
      const json = JSON.stringify(cache, null, 2)
      await fs.promises.writeFile(this.cacheFile, json);

    } catch (error) {
      console.error(`Error saving cache`, error);
    }
  }

  async add(data: any) {
    const cache = await this.load();
    this.save({ ...cache, ...data });
  }

  async remove(hash: string) {
    const cache = await this.load();
    delete cache[hash];
    console.log(`Removing "${hash}" from cache`);
    this.save(cache);
  }

  async read(sourceUrl: string) {
    const cache = await this.load();
    const isValid = this.isValid(cache, sourceUrl);
    return !isValid ? null : this.find(cache, sourceUrl);
  }

  async verify() {
    const invalid = new Set<string>();
    const cache = await this.load();

    Object.values(cache)
      .filter((file: File) => !!file?.hash)
      .forEach(({ hash, outputs }: File) => outputs
        .filter((file: Image) => !!file?.outputPath)
        .forEach(({ outputPath }: Image) => {
          if (!fs.existsSync(outputPath)) {
            invalid.add(hash);
          }
        })
      );

    return Array.from(invalid.keys())
      .map(hash => cache[hash]);
  }

  find(cache: CacheType, sourceUrl: string) {
    return Object.values(cache).find((i: Image) => {
      return i?.sourceUrl === sourceUrl;
    });
  }

  isValid(cache: CacheType, sourceUrl: string): boolean {
    const image: Image = this.find(cache, sourceUrl);
    if (!image) {
      return false;
    }

    const { outputs, width, isInline } = image;

    const hasValidSizes = this.config.sizes
      .filter((size: number) => size <= width)
      .every((size: number) =>
        outputs.filter((i: Image) => i.width === size).length >= 2);

    const isBase64Valid = !this.config.base64
      ? true : outputs.some((i: Image) => i.format === 'base64');

    return isBase64Valid && (hasValidSizes || isInline);
  }
}
