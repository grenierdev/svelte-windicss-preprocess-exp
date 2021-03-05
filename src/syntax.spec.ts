import { Processor } from 'windicss/lib';
import { expect } from 'chai';

describe('Supported syntax', () => {
	it('vanilla', () => {
		const processor = new Processor();
		expect(processor.compile(`min-h-screen bg-gray-100`).success).to.be.eql(['min-h-screen', 'bg-gray-100']);
		expect(processor.compile(`bg-white font-light sm:hover:(bg-gray-100 font-medium)`).success).to.be.eql(['bg-white', 'font-light', 'sm:hover:bg-gray-100', 'sm:hover:font-medium']);
	});
	it('mustache', () => {
		const processor = new Processor();
		expect(processor.compile('flex px-{a} lg:px-{b}').success).to.be.eql(['flex']);
		expect(processor.compile('bg-white font-light sm:hover:(bg-gray-{b} font-medium)').success).to.be.eql(['bg-white', 'font-light', 'sm:hover:font-medium']);
	});
	it('template literal', () => {
		const processor = new Processor();
		expect(processor.compile('px-3 py-${c + 2 - 10} sm:(text-gray-${d} text-sm font-medium)').success).to.be.eql(['px-3', 'sm:text-sm', 'sm:font-medium']);
	});
})