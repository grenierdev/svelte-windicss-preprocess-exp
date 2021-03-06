import { Processor } from 'windicss/lib';
import preprocessor from './preprocessor';
import { expect } from 'chai';

describe('Preprocessor', () => {
	it('alters class attr and generates style tag', () => {
		const processor = new Processor();
		const content = `<div class="bg-white font-light sm:hover:(bg-gray-100 font-medium custom-class) custom-class" />`;
		const transformed = preprocessor(processor, content, { includeBaseStyles: false });
		expect(transformed).to.be.eq(`<div class="windi-1koumxp sm:hover:custom-class custom-class" /><style>.windi-1koumxp {
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
		const transformed = preprocessor(processor, content, { includeBaseStyles: false });
		expect(transformed).to.be.eq(`<script>let color = 'white';</script><div class="windi-1koumxp sm:hover:custom-class custom-class" /><style>.windi-1koumxp {
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
		const transformed = preprocessor(processor, content, { includeBaseStyles: false });
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
}</style><div class="windi-1koumxp sm:hover:custom-class custom-class" />`);
	});

	it('alters class attr, alters existing style tag and leaves script untouched', () => {
		const processor = new Processor();
		const content = `<script>let color = 'white';</script><style>.custom-class { color: blue; }</style><div class="bg-white font-light sm:hover:(bg-gray-100 font-medium custom-class) custom-class" />`;
		const transformed = preprocessor(processor, content, { includeBaseStyles: false });
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
}</style><div class="windi-1koumxp sm:hover:custom-class custom-class" />`);
	});

	it('compiles @apply directive within style tag', () => {
		const processor = new Processor();
		const content = `<style>.custom-class { @apply text-indigo-600; }</style><div class="bg-white font-light sm:hover:(bg-gray-100 font-medium custom-class) custom-class" />`;
		const transformed = preprocessor(processor, content, { includeBaseStyles: false });
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
}</style><div class="windi-1koumxp sm:hover:custom-class custom-class" />`);
	});

	// it('compiles @variants directive within style tag', () => {
	// 	const processor = new Processor();
	// 	const content = `<style>@variants focus, hover { .custom-class { @apply font-bold; } }</style><div class="bg-white font-light sm:hover:(bg-gray-100 font-medium custom-class) custom-class" />`;
	// 	const transformed = preprocessor(processor, content, { includeBaseStyles: false });
	// 	expect(transformed).to.be.eq(``);
	// });
});

// TODO
// @screen sm {
// 	@variants focus, hover {
// 	  .custom-class {
// 		@apply text-indigo-600;
// 	  }
// 	}
//   }