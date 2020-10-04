import crypto from 'crypto';
import fs from "fs";
import path from "path";

export function md5_hash(data: string) {
  return crypto
    .createHash('md5')
    .update(data, 'utf8')
    .digest('hex');
}

export function withoutTrailingSlash(value: string) {
  return value.replace(/\/$/, '');
}

export async function ensureDirExists(filepath: string) {
  const dirPath = path.dirname(filepath);
  await fs.promises.mkdir(dirPath, { recursive: true });
}

export function write_stdout(value: string) {
  /* need to use  `process.stdout.write` becuase console.log print a newline character */
  /* \r clear the current line and then print the other characters making it looks like it refresh*/
  process.stdout.write(`\r${value}`);
}
