import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export function pad2(value: string | number): string {
	return `00${value}`.slice(-2);
}

export function md5_hash(data: string): string {
	return crypto.createHash('md5').update(data, 'utf8').digest('hex');
}

export function withoutTrailingSlash(value: string): string {
	return value.replace(/\/$/, '');
}

export async function ensureDirExists(filepath: string): Promise<void> {
	const dirPath = path.dirname(filepath);
	await fs.promises.mkdir(dirPath, { recursive: true });
}

export function write_stdout(value: string): void {
	/* need to use  `process.stdout.write` becuase console.log print a newline character */
	/* \r clear the current line and then print the other characters making it looks like it refresh*/
	process.stdout.write(`\r${value}`);
}
