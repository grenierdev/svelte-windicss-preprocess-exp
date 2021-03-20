import { Processor } from 'windicss/lib';
import preprocessor from './preprocessor';
import { expect } from 'chai';

describe('Readme', () => {
	it('class attribute', () => {
		const processor = new Processor();
		const content = `<h1 class="text-4xl font-extrabold">Hello World</h1>`;
		const transformed = preprocessor(processor, content, { ignoreDynamicClassesWarning: true, includeBaseStyles: false });
		expect(transformed.code).to.be.eq(`<h1 class={\`windi-mqgc06\`}>Hello World</h1><style>.windi-mqgc06 {
  font-weight: 800;
  font-size: 2.25rem;
  line-height: 2.5rem;
}</style>`);
	});

	it('class directives', () => {
		const processor = new Processor();
		const content = `<h1 class:text-4xl={large} class:font-extra-bold={bold} class:foo class="text-indigo-600">Hello World</h1>`;
		const transformed = preprocessor(processor, content, { ignoreDynamicClassesWarning: true, includeBaseStyles: false });
		expect(transformed.code).to.be.eq(`<h1    class={\`windi-u7qal3 \${large ? 'text-4xl' : ''} \${bold ? 'font-extra-bold' : ''} \${foo ? 'foo' : ''}\`}>Hello World</h1><style>.text-4xl {
  font-size: 2.25rem;
  line-height: 2.5rem;
}
.font-extra-bold {
  font-weight: 700;
}
.windi-u7qal3 {
  --tw-text-opacity: 1;
  color: rgba(79, 70, 229, var(--tw-text-opacity));
}</style>`);
	});

	it('@apply directive', () => {
		const processor = new Processor();
		const content = `<h1 class="foo">Hello World</h1><style>.foo { @apply text-4xl; }</style>`;
		const transformed = preprocessor(processor, content, { ignoreDynamicClassesWarning: true, includeBaseStyles: false });
		expect(transformed.code).to.be.eq(`<h1 class={\`foo\`}>Hello World</h1><style>.foo {
  font-size: 2.25rem;
  line-height: 2.5rem;
}</style>`);
	});

	it('@screen directive', () => {
		const processor = new Processor();
		const content = `<h1 class="foo">Hello World</h1><style>@screen sm { .foo { font-weight: bold; } }</style>`;
		const transformed = preprocessor(processor, content, { ignoreDynamicClassesWarning: true, includeBaseStyles: false });
		expect(transformed.code).to.be.eq(`<h1 class={\`foo\`}>Hello World</h1><style>@media (min-width: 640px) {
  .foo {
    font-weight: bold;
  }
}</style>`);
	});

	it('@variants directive', () => {
		const processor = new Processor();
		const content = `<h1 class="foo">Hello World</h1><style>@variants active, hover { .foo { font-weight: bold; } }</style>`;
		const transformed = preprocessor(processor, content, { ignoreDynamicClassesWarning: true, includeBaseStyles: false });
		expect(transformed.code).to.be.eq(`<h1 class={\`foo\`}>Hello World</h1><style>.foo:active {
  font-weight: bold;
}
.foo:hover {
  font-weight: bold;
}</style>`);
	});
});