import { JpegOptions, PngOptions, ResizeOptions, WebpOptions } from 'sharp';
export declare type Configuration = {
    logging: boolean;
    fileExtensions: string[];
    searchPaths: string[];
    cachePath: string;
    outputPath: string;
    baseUrl: string;
    base64Options: {
        placeholder: 'blur';
        background: string;
        color: string;
        threshold: number;
        inlineBelow: number;
    };
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
    tasks: TaskConfig[];
};
export declare const basicConfiguration: Configuration;
export declare type TaskFormat = 'jpg' | 'png' | 'webp' | 'base64';
export declare type TaskConfig = {
    sizes: number[];
    aspectRatio: number;
    format: TaskFormat;
    name: string;
    options: Partial<PngOptions | JpegOptions | WebpOptions | {
        inlineBelow: number;
    }>;
};
export declare type TaskPaths = {
    basename: string;
    sourcePath: string;
    sourceName: string;
    outputPath: string;
    url?: string;
    srcset?: string;
};
export declare type TaskJob = {
    paths: TaskPaths;
    task: TaskConfig;
    resize: Partial<ResizeOptions>;
};
export declare type TaskResult = {
    format: string;
    size: number;
    width: number;
    height: number;
    hasAlpha: boolean;
    paths: TaskPaths;
};
export declare type Metadata = {
    format: string;
    size: number;
    width: number;
    height: number;
    hasAlpha: boolean;
};
export declare type ImageInfo = {
    url: string;
    format: string;
    name: string;
    data?: string;
    srcset?: string;
    sizes?: string;
    metadata: Record<string, Metadata>;
};
