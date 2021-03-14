import { Processor } from 'windicss/lib';
import { expect } from 'chai';
import preprocessor from './preprocessor';
import MagicString from 'magic-string';
import { SourceMapConsumer } from 'source-map';

describe('Sourcemap', () => {
	it('class attribute', async () => {
		const encoder = new MagicString(`<h1 class="text-4xl font-extrabold">Hello World</h1>`);

		// <h1 class={`windi-mqgc06`}>Hello World</h1>

		encoder.overwrite(4, 35, 'class={`windi-mqgc06`}');

		const code = encoder.toString();
		const map = encoder.generateMap({
			file: 'foo.js',
			source: 'foo.svelte',
			includeContent: true
		});

		const consumer = await new SourceMapConsumer(map);

		expect(consumer.originalPositionFor({ line: 1, column: 16 }).column).to.eq(4);
	});

	// it('class directives', async () => {
	// 	const encoder = new MagicString(`<h1 class:text-4xl={large} class:font-extra-bold={bold} class:foo class="text-indigo-600">Hello World</h1>`);

	// 	// <h1 class={`windi-u7qal3 ${large ? 'text-4xl' : ''} ${bold ? 'font-extra-bold' : ''} ${foo ? 'foo' : ''}`}   >Hello World</h1>

	// 	encoder.remove(4, 10);
	// 	encoder.move()

	// 	const code = encoder.toString();

	// 	console.log(code);


	// 	// const map = encoder.generateMap({
	// 	// 	file: 'foo.js',
	// 	// 	source: 'foo.svelte',
	// 	// 	includeContent: true
	// 	// });

	// 	// const consumer = await new SourceMapConsumer(map);

	// 	// expect(consumer.originalPositionFor({ line: 1, column: 16 }).column).to.eq(4);
	// });

	it('simple', async () => {
		const processor = new Processor();
		const content = `<h1 class="text-4xl font-extrabold">Hello World</h1>`;
		const { code, map } = preprocessor(processor, content, { ignoreDynamicClassesWarning: true, includeBaseStyles: false });
		const consumer = await new SourceMapConsumer(map);

		expect(content).to.eq(consumer.sourceContentFor('Unknown.svelte', true));
	});
});