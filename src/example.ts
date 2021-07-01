import { findLocalFiles, parseOptions, processImages } from './core';
import { Config } from './core/models';

(async function test() {
	const config: Config = parseOptions({
		verbose: false,
		imageFormats: ['jfif'],
		outputPath: 'tmp',
		searchPaths: ['static/images/original'],
	});

	const result = await findLocalFiles(config);
	await processImages(config, result);
})();
