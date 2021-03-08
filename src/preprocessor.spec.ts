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

	it('alters class attr and generates style tag', () => {
		const processor = new Processor();
		const content = `<div class="bg-white font-light sm:hover:(bg-gray-100 font-medium custom-class) custom-class" />`;
		const transformed = preprocessor(processor, content, { ignoreDynamicClassesWarning: true, includeBaseStyles: false });
		expect(transformed).to.be.eq(`<div class={\`windi-1koumxp sm:hover:custom-class custom-class\`} /><style>.windi-1koumxp {
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
		expect(transformed).to.be.eq(`<script>let color = 'white';</script><div class={\`windi-1koumxp sm:hover:custom-class custom-class\`} /><style>.windi-1koumxp {
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
		expect(transformed).to.be.eq(`<style>.custom-class {
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
		expect(transformed).to.be.eq(`<script>let color = 'white';</script><style>.custom-class {
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
		expect(transformed).to.be.eq(`<style>.custom-class {
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
		expect(transformed).to.be.eq(`<style>.custom-class:focus {
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
		expect(transformed).to.be.eq(`<style>.windi-1koumxp {
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
		expect(transformed).to.be.eq(`<style>.windi-1koumxp {
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
			expect(transformed).to.be.eq(`<style>.container {
  display: block;
}</style><div class={\`container\`} />`);
		}
		{
			const content = `<style>.font-bold { @apply font-bold; display: block }</style><div class="font-bold" />`;
			const transformed = preprocessor(processor, content, { ignoreDynamicClassesWarning: true, includeBaseStyles: false });
			expect(transformed).to.be.eq(`<style>.font-bold {
  font-weight: 700;
  display: block;
}</style><div class={\`font-bold\`} />`);
		}
	});

	it('merge variant attributes into class attribute', () => {
		const processor = new Processor();
		const content = '<div active={`py-2`} sm="px-5 foo-{bar}-{buz}" hover="text-indigo-600" class="bg-white" />';
		const transformed = preprocessor(processor, content, { ignoreDynamicClassesWarning: true, includeBaseStyles: false });
		expect(transformed).to.be.eq(`<div class={\`windi-1dpcd24 sm:foo-\${bar}-\${buz}\`}    /><style>.windi-1dpcd24:active {
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
}
.windi-1dpcd24:hover {
  --tw-text-opacity: 1;
  color: rgba(79, 70, 229, var(--tw-text-opacity));
}
.windi-1dpcd24 {
  --tw-bg-opacity: 1;
  background-color: rgba(255, 255, 255, var(--tw-bg-opacity));
}
@media (min-width: 640px) {
  .windi-1dpcd24 {
    padding-left: 1.25rem;
    padding-right: 1.25rem;
  }
}</style>`);
	});
});