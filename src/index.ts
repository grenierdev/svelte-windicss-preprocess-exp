import { Processor } from 'windicss/lib';
import type { Config } from 'windicss/types/interfaces';
import preprocessor from './preprocessor';

export function preprocess(config?: Config) {
	const processor = new Processor(config);

	return {
		markup({ content, filename }: { content: string, filename: string }) {
			return new Promise((resolve, reject) => {
				return resolve({
					code: preprocessor(processor, content, { filename })
				});
			})
		},
		style({ content, filename }: { content: string, filename: string }) {
			return Promise.resolve({
				code: content
			})
		}
	};
}