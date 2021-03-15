import { Processor } from 'windicss/lib';
import { expect } from 'chai';
import preprocessor from './preprocessor';
import MagicString from 'magic-string';
import { SourceMapConsumer } from 'source-map';

describe('Sourcemap', () => {
	it('simple', async () => {
		const processor = new Processor();
		const content = `<h1 class="text-4xl font-extrabold">Hello World</h1>`;
		const { code, map } = preprocessor(processor, content, { ignoreDynamicClassesWarning: true, includeBaseStyles: false });
		const consumer = await new SourceMapConsumer(map);

		// expect(content).to.eq(consumer.sourceContentFor('Unknown.svelte', true));
	});
});