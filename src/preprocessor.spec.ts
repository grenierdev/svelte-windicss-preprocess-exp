import { Processor } from 'windicss/lib';
import preprocessor from './preprocessor';
import { expect } from 'chai';

describe('Preprocessor', () => {
	it('warns if ignored class name sound like tailwind', () => {
		let warn_count = 0;
		const warn = console.warn;
		console.warn = function (...args: unknown[]) { warn_count += 1; };

		const processor = new Processor();
		// Warns on sm: and p-{pad}
		{
			warn_count = 0;
			const content = `<div class="p-4 sm:(p-{pad})" />`;
			const _ = preprocessor(processor, content, { includeBaseStyles: false });
			expect(warn_count).to.be.eq(1);
		}

		// Do not warn on custom-{axe}
		{
			warn_count = 0;
			const content = `<div class="p-4 custom-{axe}" />`;
			const _ = preprocessor(processor, content, { includeBaseStyles: false });
			expect(warn_count).to.be.eq(0);
		}

		console.warn = warn;
	});

	it('preprocess mode', () => {
		const processor = new Processor();
		{
			const content = `<style>.custom-class { @apply font-bold; }</style><div class="bg-white" />`;
			const transformed = preprocessor(processor, content, { ignoreDynamicClassesWarning: true, includeBaseStyles: false });
			expect(transformed.code).to.be.eq(`<style>.custom-class {
  font-weight: 700;
}
.windi-1iykbo2 {
  --tw-bg-opacity: 1;
  background-color: rgba(255, 255, 255, var(--tw-bg-opacity));
}</style><div class={\`windi-1iykbo2\`} />`);
		}
		{
			const content = `<style>.custom-class { @apply font-bold; }</style><div class="bg-white" />`;
			const transformed = preprocessor(processor, content, { mode: 'attributes-only', ignoreDynamicClassesWarning: true, includeBaseStyles: false });
			expect(transformed.code).to.be.eq(`<style>.custom-class {
  @apply font-bold;
}
.windi-1iykbo2 {
  --tw-bg-opacity: 1;
  background-color: rgba(255, 255, 255, var(--tw-bg-opacity));
}</style><div class={\`windi-1iykbo2\`} />`);
		}
		{
			const content = `<style>.custom-class { @apply font-bold; }</style><div class="bg-white" />`;
			const transformed = preprocessor(processor, content, { mode: 'directives-only', ignoreDynamicClassesWarning: true, includeBaseStyles: false });
			expect(transformed.code).to.be.eq(`<style>.custom-class {
  font-weight: 700;
}</style><div class="bg-white" />`);
		}
	});

	it('alters class attr and generates style tag', () => {
		const processor = new Processor();
		const content = `<div class="bg-white font-light sm:hover:(bg-gray-100 font-medium custom-class) custom-class" />`;
		const transformed = preprocessor(processor, content, { ignoreDynamicClassesWarning: true, includeBaseStyles: false });
		expect(transformed.code).to.be.eq(`<div class={\`windi-1koumxp sm:hover:custom-class custom-class\`} /><style>.windi-1koumxp {
  --tw-bg-opacity: 1;
  background-color: rgba(255, 255, 255, var(--tw-bg-opacity));
  font-weight: 300;
}
@media (min-width: 640px) {
  .windi-1koumxp:hover {
    --tw-bg-opacity: 1;
    background-color: rgba(243, 244, 246, var(--tw-bg-opacity));
    font-weight: 500;
  }
}</style>`);
	});

	it('alters class attr, generates style tag, leaves script untouched', () => {
		const processor = new Processor();
		const content = `<script>let color = 'white';</script><div class="bg-white font-light sm:hover:(bg-gray-100 font-medium custom-class) custom-class" />`;
		const transformed = preprocessor(processor, content, { ignoreDynamicClassesWarning: true, includeBaseStyles: false });
		expect(transformed.code).to.be.eq(`<script>let color = 'white';</script><div class={\`windi-1koumxp sm:hover:custom-class custom-class\`} /><style>.windi-1koumxp {
  --tw-bg-opacity: 1;
  background-color: rgba(255, 255, 255, var(--tw-bg-opacity));
  font-weight: 300;
}
@media (min-width: 640px) {
  .windi-1koumxp:hover {
    --tw-bg-opacity: 1;
    background-color: rgba(243, 244, 246, var(--tw-bg-opacity));
    font-weight: 500;
  }
}</style>`);
	});

	it('alters class attr, alters existing style tag', () => {
		const processor = new Processor();
		const content = `<style>.custom-class { color: blue; }</style><div class="bg-white font-light sm:hover:(bg-gray-100 font-medium custom-class) custom-class" />`;
		const transformed = preprocessor(processor, content, { ignoreDynamicClassesWarning: true, includeBaseStyles: false });
		expect(transformed.code).to.be.eq(`<style>.custom-class {
  color: blue;
}
.windi-1koumxp {
  --tw-bg-opacity: 1;
  background-color: rgba(255, 255, 255, var(--tw-bg-opacity));
  font-weight: 300;
}
@media (min-width: 640px) {
  .windi-1koumxp:hover {
    --tw-bg-opacity: 1;
    background-color: rgba(243, 244, 246, var(--tw-bg-opacity));
    font-weight: 500;
  }
}</style><div class={\`windi-1koumxp sm:hover:custom-class custom-class\`} />`);
	});

	it('alters class attr, alters existing style tag and leaves script untouched', () => {
		const processor = new Processor();
		const content = `<script>let color = 'white';</script><style>.custom-class { color: blue; }</style><div class="bg-white font-light sm:hover:(bg-gray-100 font-medium custom-class) custom-class" />`;
		const transformed = preprocessor(processor, content, { ignoreDynamicClassesWarning: true, includeBaseStyles: false });
		expect(transformed.code).to.be.eq(`<script>let color = 'white';</script><style>.custom-class {
  color: blue;
}
.windi-1koumxp {
  --tw-bg-opacity: 1;
  background-color: rgba(255, 255, 255, var(--tw-bg-opacity));
  font-weight: 300;
}
@media (min-width: 640px) {
  .windi-1koumxp:hover {
    --tw-bg-opacity: 1;
    background-color: rgba(243, 244, 246, var(--tw-bg-opacity));
    font-weight: 500;
  }
}</style><div class={\`windi-1koumxp sm:hover:custom-class custom-class\`} />`);
	});

	it('compiles @apply directive within style tag', () => {
		const processor = new Processor();
		const content = `<style>.custom-class { @apply text-indigo-600; }</style><div class="bg-white font-light sm:hover:(bg-gray-100 font-medium custom-class) custom-class" />`;
		const transformed = preprocessor(processor, content, { ignoreDynamicClassesWarning: true, includeBaseStyles: false });
		expect(transformed.code).to.be.eq(`<style>.custom-class {
  --tw-text-opacity: 1;
  color: rgba(79, 70, 229, var(--tw-text-opacity));
}
.windi-1koumxp {
  --tw-bg-opacity: 1;
  background-color: rgba(255, 255, 255, var(--tw-bg-opacity));
  font-weight: 300;
}
@media (min-width: 640px) {
  .windi-1koumxp:hover {
    --tw-bg-opacity: 1;
    background-color: rgba(243, 244, 246, var(--tw-bg-opacity));
    font-weight: 500;
  }
}</style><div class={\`windi-1koumxp sm:hover:custom-class custom-class\`} />`);
	});

	it('compiles @variants directive within style tag', () => {
		const processor = new Processor();
		const content = `<style>@variants focus, hover { .custom-class { @apply font-bold; } }</style><div class="bg-white font-light sm:hover:(bg-gray-100 font-medium custom-class) custom-class" />`;
		const transformed = preprocessor(processor, content, { ignoreDynamicClassesWarning: true, includeBaseStyles: false });
		expect(transformed.code).to.be.eq(`<style>.custom-class:focus {
  font-weight: 700;
}
.custom-class:hover {
  font-weight: 700;
}
.windi-1koumxp {
  --tw-bg-opacity: 1;
  background-color: rgba(255, 255, 255, var(--tw-bg-opacity));
  font-weight: 300;
}
@media (min-width: 640px) {
  .windi-1koumxp:hover {
    --tw-bg-opacity: 1;
    background-color: rgba(243, 244, 246, var(--tw-bg-opacity));
    font-weight: 500;
  }
}</style><div class={\`windi-1koumxp sm:hover:custom-class custom-class\`} />`);
	});

	it('compiles @screen directive within style tag', () => {
		const processor = new Processor();
		const content = `<style>@screen md { .custom-class { @apply font-bold; } }</style><div class="bg-white font-light sm:hover:(bg-gray-100 font-medium custom-class) custom-class" />`;
		const transformed = preprocessor(processor, content, { ignoreDynamicClassesWarning: true, includeBaseStyles: false });
		expect(transformed.code).to.be.eq(`<style>.windi-1koumxp {
  --tw-bg-opacity: 1;
  background-color: rgba(255, 255, 255, var(--tw-bg-opacity));
  font-weight: 300;
}
@media (min-width: 640px) {
  .windi-1koumxp:hover {
    --tw-bg-opacity: 1;
    background-color: rgba(243, 244, 246, var(--tw-bg-opacity));
    font-weight: 500;
  }
}
@media (min-width: 768px) {
  .custom-class {
    font-weight: 700;
  }
}</style><div class={\`windi-1koumxp sm:hover:custom-class custom-class\`} />`);
	});

	it('compiles nested directives within style tag', () => {
		const processor = new Processor();
		const content = `<style>@screen md { @variants focus { .custom-class { @apply font-bold; } } }</style><div class="bg-white font-light sm:hover:(bg-gray-100 font-medium custom-class) custom-class" />`;
		const transformed = preprocessor(processor, content, { ignoreDynamicClassesWarning: true, includeBaseStyles: false });
		expect(transformed.code).to.be.eq(`<style>.windi-1koumxp {
  --tw-bg-opacity: 1;
  background-color: rgba(255, 255, 255, var(--tw-bg-opacity));
  font-weight: 300;
}
@media (min-width: 640px) {
  .windi-1koumxp:hover {
    --tw-bg-opacity: 1;
    background-color: rgba(243, 244, 246, var(--tw-bg-opacity));
    font-weight: 500;
  }
}
@media (min-width: 768px) {
  .custom-class:focus {
    font-weight: 700;
  }
}</style><div class={\`windi-1koumxp sm:hover:custom-class custom-class\`} />`);
	});

	it('class names defined in svelte file are excluded from processor', () => {
		const processor = new Processor();
		{
			const content = `<style>.container { display: block }</style><div class="container" />`;
			const transformed = preprocessor(processor, content, { ignoreDynamicClassesWarning: true, includeBaseStyles: false });
			expect(transformed.code).to.be.eq(`<style>.container {
  display: block;
}</style><div class={\`container\`} />`);
		}
		{
			const content = `<style>.font-bold { @apply font-bold; display: block }</style><div class="font-bold" />`;
			const transformed = preprocessor(processor, content, { ignoreDynamicClassesWarning: true, includeBaseStyles: false });
			expect(transformed.code).to.be.eq(`<style>.font-bold {
  font-weight: 700;
  display: block;
}</style><div class={\`font-bold\`} />`);
		}
	});

	it('merge variant attributes into class attribute', () => {
		const processor = new Processor();
		const content = '<div active={`py-2`} sm="px-5 foo-{bar}-{buz}" hover="text-indigo-600" class="bg-white" />';
		const transformed = preprocessor(processor, content, { ignoreDynamicClassesWarning: true, includeBaseStyles: false });
		expect(transformed.code).to.be.eq(`<div class={\`windi-nvydo3 sm:foo-\${bar}-\${buz}\`}    /><style>.windi-nvydo3 {
  --tw-bg-opacity: 1;
  background-color: rgba(255, 255, 255, var(--tw-bg-opacity));
}
.windi-nvydo3:active {
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
}
.windi-nvydo3:hover {
  --tw-text-opacity: 1;
  color: rgba(79, 70, 229, var(--tw-text-opacity));
}
@media (min-width: 640px) {
  .windi-nvydo3 {
    padding-left: 1.25rem;
    padding-right: 1.25rem;
  }
}</style>`);
	});

	it('merge class directives attributes into class attribute', () => {
		const processor = new Processor();
		{
			const content = '<div class:font-bold />';
			expect(() => preprocessor(processor, content, { ignoreDynamicClassesWarning: true, includeBaseStyles: false })).to.be.throw;
		}
		{
			const content = '<div class:font-bold={`something`} />';
			expect(() => preprocessor(processor, content, { ignoreDynamicClassesWarning: true, includeBaseStyles: false })).to.be.throw;
		}
		{
			const content = '<div class:font-bold={true} class="bg-white" />';
			const transformed = preprocessor(processor, content, { ignoreDynamicClassesWarning: true, includeBaseStyles: false });
			expect(transformed.code).to.be.eq(`<div class={\`windi-18t14qq \${true ? 'font-bold' : ''}\`}  /><style>.font-bold {
  font-weight: 700;
}
.windi-18t14qq {
  --tw-bg-opacity: 1;
  background-color: rgba(255, 255, 255, var(--tw-bg-opacity));
}</style>`);
		}

		{
			const content = '<div class:font-bold={true} class:text-indigo-600={func()} class="bg-white" />';
			const transformed = preprocessor(processor, content, { ignoreDynamicClassesWarning: true, includeBaseStyles: false });
			expect(transformed.code).to.be.eq(`<div class={\`windi-jf5cj5 \${true ? 'font-bold' : ''} \${func() ? 'text-indigo-600' : ''}\`}   /><style>.font-bold {
  font-weight: 700;
}
.text-indigo-600 {
  --tw-text-opacity: 1;
  color: rgba(79, 70, 229, var(--tw-text-opacity));
}
.windi-jf5cj5 {
  --tw-bg-opacity: 1;
  background-color: rgba(255, 255, 255, var(--tw-bg-opacity));
}</style>`);
		}
	});

	it('global styles', () => {
		const processor = new Processor();
		const content = '<style>@windicss base; p { @apply font-bold; color: black; }</style>';
		const transformed = preprocessor(processor, content, { ignoreDynamicClassesWarning: true, includeBaseStyles: false });
		expect(transformed.code).to.be.eq(`<style>
:global(*), :global(::before), :global(::after) {
  -webkit-box-sizing: border-box;
  box-sizing: border-box;
  border-width: 0;
  border-style: solid;
  border-color: #e5e7eb;
}
:global(*) {
  --tw-ring-inset: var(--tw-empty,/*!*/ /*!*/);
  --tw-ring-offset-width: 0px;
  --tw-ring-offset-color: #fff;
  --tw-ring-color: rgba(59, 130, 246, 0.5);
  --tw-ring-offset-shadow: 0 0 #0000;
  --tw-ring-shadow: 0 0 #0000;
  --tw-shadow: 0 0 #0000;
}
:global(:root) {
  -moz-tab-size: 4;
  -o-tab-size: 4;
  tab-size: 4;
}
:global(:-moz-focusring) {
  outline: 1px dotted ButtonText;
}
:global(:-moz-ui-invalid) {
  box-shadow: none;
}
:global(::moz-focus-inner) {
  border-style: none;
  padding: 0;
}
:global(::-webkit-inner-spin-button), :global(::-webkit-outer-spin-button) {
  height: auto;
}
:global(::-webkit-search-decoration) {
  -webkit-appearance: none;
}
:global(::-webkit-file-upload-button) {
  -webkit-appearance: button;
  font: inherit;
}
:global([type='search']) {
  -webkit-appearance: textfield;
  outline-offset: -2px;
}
:global(abbr[title]) {
  -webkit-text-decoration: underline dotted;
  text-decoration: underline dotted;
}
:global(body) {
  margin: 0;
  font-family: inherit;
  line-height: inherit;
}
:global(html) {
  -webkit-text-size-adjust: 100%;
  font-family: ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans",sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji";
  line-height: 1.5;
}
:global(a) {
  color: inherit;
  text-decoration: inherit;
}
:global(b), :global(strong) {
  font-weight: bolder;
}
:global(button), :global(input), :global(optgroup), :global(select), :global(textarea) {
  font-family: inherit;
  font-size: 100%;
  line-height: 1.15;
  margin: 0;
  padding: 0;
  line-height: inherit;
  color: inherit;
}
:global(button), :global(select) {
  text-transform: none;
}
:global(button), :global([type='button']), :global([type='reset']), :global([type='submit']) {
  -webkit-appearance: button;
}
:global(blockquote), :global(dl), :global(dd), :global(h1), :global(h2), :global(h3), :global(h4), :global(h5), :global(h6), :global(hr), :global(figure), :global(p), :global(pre) {
  margin: 0;
}
:global(button) {
  background-color: transparent;
  background-image: none;
}
:global(button:focus) {
  outline: 1px dotted;
  outline: 5px auto -webkit-focus-ring-color;
}
:global(button), :global([role="button"]) {
  cursor: pointer;
}
:global(code), :global(kbd), :global(samp), :global(pre) {
  font-size: 1em;
}
:global(fieldset) {
  margin: 0;
  padding: 0;
}
:global(hr) {
  height: 0;
  color: inherit;
  border-top-width: 1px;
}
:global(h1), :global(h2), :global(h3), :global(h4), :global(h5), :global(h6) {
  font-size: inherit;
  font-weight: inherit;
}
:global(img) {
  border-style: solid;
}
:global(input::placeholder) {
  opacity: 1;
  color: #9ca3af;
}
:global(input::webkit-input-placeholder) {
  opacity: 1;
  color: #9ca3af;
}
:global(input::-moz-placeholder) {
  opacity: 1;
  color: #9ca3af;
}
:global(input:-ms-input-placeholder) {
  opacity: 1;
  color: #9ca3af;
}
:global(input::-ms-input-placeholder) {
  opacity: 1;
  color: #9ca3af;
}
:global(img), :global(svg), :global(video), :global(canvas), :global(audio), :global(iframe), :global(embed), :global(object) {
  display: block;
  vertical-align: middle;
}
:global(img), :global(video) {
  max-width: 100%;
  height: auto;
}
:global(legend) {
  padding: 0;
}
:global(ol), :global(ul) {
  list-style: none;
  margin: 0;
  padding: 0;
}
:global(progress) {
  vertical-align: baseline;
}
:global(pre), :global(code), :global(kbd), :global(samp) {
  font-family: ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;
}
:global(small) {
  font-size: 80%;
}
:global(sub), :global(sup) {
  font-size: 75%;
  line-height: 0;
  position: relative;
  vertical-align: baseline;
}
:global(sub) {
  bottom: -0.25em;
}
:global(sup) {
  top: -0.5em;
}
:global(summary) {
  display: list-item;
}
:global(table) {
  text-indent: 0;
  border-color: inherit;
  border-collapse: collapse;
}
:global(textarea) {
  resize: vertical;
}
:global(textarea::placeholder) {
  opacity: 1;
  color: #9ca3af;
}
:global(textarea::webkit-input-placeholder) {
  opacity: 1;
  color: #9ca3af;
}
:global(textarea::-moz-placeholder) {
  opacity: 1;
  color: #9ca3af;
}
:global(textarea:-ms-input-placeholder) {
  opacity: 1;
  color: #9ca3af;
}
:global(textarea::-ms-input-placeholder) {
  opacity: 1;
  color: #9ca3af;
}
p {
  font-weight: 700;
  color: black;
}</style>`);
	});
});