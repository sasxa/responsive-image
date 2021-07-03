import { findLocalFiles, parseOptions, batch, resizeImage } from './core';
import { Config } from './core/types';

(async function test() {
	const config: Config = parseOptions({
		outputPath: 'static',
		baseUrl: 'images',
		aspectRatio: 16 / 10,
		searchPaths: ['src/assets/images'],
	});

	const result = await findLocalFiles(config);
	await batch(config, result);
})();
