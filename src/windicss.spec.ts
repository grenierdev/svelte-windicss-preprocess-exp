import { Processor } from 'windicss/lib';
import { expect } from 'chai';

describe('WindiCSS', () => {
	it('basics', () => {
		const processor = new Processor();
		expect(processor.compile(`min-h-screen bg-gray-100`).ignored.join(' ')).to.be.eq('');
		expect(processor.compile(`bg-white font-light sm:hover:(bg-gray-100 font-medium)`).ignored.join(' ')).to.be.eq('');
	});
	it('ignores custom class', () => {
		const processor = new Processor();
		expect(processor.compile(`min-h-screen bg-gray-100 custom-class`).ignored.join(' ')).to.be.eq('custom-class');
		expect(processor.compile(`bg-white font-light sm:hover:(bg-gray-100 font-medium custom-class)`).ignored.join(' ')).to.be.eq('sm:hover:custom-class');
	});
	it('ignores and unfolds custom class within group', () => {
		const processor = new Processor();
		expect(processor.compile(`bg-white font-light sm:hover:(bg-gray-100 font-medium custom-class)`).ignored.join(' ')).to.be.eq('sm:hover:custom-class');
	});
	it('ignores mustache element', () => {
		const processor = new Processor();
		expect(processor.compile('flex px-{a} lg:px-{b} custom-class').ignored.join(' ')).to.be.eq('px-{a} lg:px-{b} custom-class');
	});
	it('ignores and unfolds mustache\'s element within group', () => {
		const processor = new Processor();
		expect(processor.compile('bg-white font-light sm:hover:(bg-gray-{b} font-medium custom-class)').ignored.join(' ')).to.be.eq('sm:hover:bg-gray-{b} sm:hover:custom-class');
	});
	it('ignores simple template literal\'s expression', () => {
		const processor = new Processor();
		expect(processor.compile('px-3 py-${c + 2 - 10} sm:(text-gray-${d} text-sm font-medium custom-class)').ignored.join(' ')).to.be.eq('py-${c + 2 - 10} sm:text-gray-${d} sm:custom-class');
	});
	it('ignores and unfolds simple template literal\'s expression within group', () => {
		const processor = new Processor();
		expect(processor.compile('px-3 py-${c + 2 - 10} sm:(text-gray-${d} text-sm font-medium custom-class)').ignored.join(' ')).to.be.eq('py-${c + 2 - 10} sm:text-gray-${d} sm:custom-class');
	});
	it('discards complex template literal\'s expression', () => {
		const processor = new Processor();
		expect(processor.compile('px-3 py-${c + 2 - 10} sm:(text-gray-${func()} text-sm font-medium custom-class)').ignored.join(' ')).to.be.not.eq('py-${c + 2 - 10} sm:text-gray-${func()} sm:custom-class');
	});
})