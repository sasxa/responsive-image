import fs from 'fs';
import path from 'path';
import { Config } from './types';
import { ensureDirExists, pad2 } from './util';

const notifications: string[] = [];

type Notification =
	| 'processing'
	| 'source-info'
	| 'validating'
	| 'processed'
	| 'skipped'
	| 'done'
	| 'logged'
	| 'base64-inline'
	| 'base64-data'
	| 'png'
	| 'jpg'
	| 'fallback'
	| 'data'
	| 'preview'
	| 'webp';

export async function saveLog(config: Config): Promise<void> {
	const now = new Date();
	const date = [now.getFullYear(), pad2(now.getMonth()), pad2(now.getDate())].join('-');
	const time = [now.getHours(), now.getMinutes(), now.getSeconds()].map(pad2).join('');
	const outputFile = `${date}-${time}.log`;
	const outputPath = path.join(config.outputDir, config.baseUrl, outputFile);

	try {
		await ensureDirExists(outputPath);
		await fs.promises.writeFile(outputPath, notifications.join('\n'));
		log(config, 'logged', outputPath);
	} catch (error) {
		console.error(`Error saving log`, error);
	}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function log(
	{ verbose }: Config,
	notification: Notification,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	...args: any[]
): Promise<void> {
	let message = '';
	switch (notification) {
		case 'processing':
			message = `--- Processing "${args[0]}"`;
			break;

		case 'source-info':
			message =
				`    ${args[0] ? 'transparent ' : ''}${args[1]?.toUpperCase()}; ${args[2]} bytes; ` +
				`${args[3]}x${args[4]}px`;
			break;

		case 'validating':
			message = `--- Validating "${args[0]}"`;
			break;

		case 'base64-inline':
			message = `>>> Creating base64 inline data image for "${args[0]}" (${args[1]} bytes)`;
			break;

		case 'base64-data':
			message = `>>> Creating base64 data image for "${args[0]}"`;
			break;

		case 'webp':
			message = `>>> Creating webp image "${args[0]}"`;
			break;

		case 'png':
			message = `>>> Creating png image "${args[0]}"`;
			break;

		case 'jpg':
			message = `>>> Creating jpg image "${args[0]}"`;
			break;

		case 'fallback':
			message = `>>> Creating fallback "${args[0]}"`;
			break;

		case 'data':
			message = `--- Writing data file "${args[0]}"`;
			break;

		case 'processed':
			message = `>>> Creating ${args[0]} images in "${args[1]}"`;
			break;

		case 'skipped':
			message = `<<< Using cached sources for image "${args[0]}"`;
			break;

		case 'done':
			message = `Processed ${args[0]} images\n`;
			break;

		case 'preview':
			message =
				`\n<picture>\n  <source srcset="${args[1]}" />` +
				`\n  <img src="${args[0]}" srcset="${args[2] || args[3]}" />\n</picture>\n`;
			break;

		case 'logged':
			message = `\nDone! Log saved in "${args[0]}"`;
			return console.log(message);
	}

	if (verbose) {
		console.log(message);
	}

	notifications.push(message);
}
