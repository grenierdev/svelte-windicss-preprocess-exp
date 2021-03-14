import { Processor } from 'windicss/lib';
import type { Config as WindiCSSConfig } from 'windicss/types/interfaces';
import type { PreprocessorGroup } from 'svelte/types/compiler/preprocess/types';
import preprocessor from './preprocessor';
import type { Config as PreprocessorConfig } from './preprocessor';

export interface Config extends Omit<PreprocessorConfig, 'filename'> {
	config?: string | WindiCSSConfig,
}

export function preprocess(config?: Config): PreprocessorGroup {
	let { config: configPath, ...preprocessorConfig } = config ?? {};
	configPath = configPath ?? 'tailwind.config.js';
	let windicssConfig: WindiCSSConfig | undefined = undefined;
	if (configPath) {
		try {
			windicssConfig = typeof configPath === 'string' ? require(configPath) as WindiCSSConfig : configPath;
		} catch (_) {
			windicssConfig = undefined;
		}
	}
	const processor = new Processor(windicssConfig);

	return {
		markup({ content, filename }) {
			return new Promise((resolve, reject) => {
				const { code, map } = preprocessor(processor, content, { ...preprocessorConfig, filename });
				return resolve({ code, map });
			});
		},
		style({ content }) {
			return Promise.resolve({ code: content });
		}
	};
}