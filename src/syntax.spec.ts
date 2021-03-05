import { Processor } from 'windicss/lib';
import { expect } from 'chai';

describe('Supported syntax', () => {
	it('html5', () => {
		const processor = new Processor();
		expect(processor.compile(`bg-gray-100 text-white`).success).to.be.eql(['bg-gray-100', 'text-white']);
	});
	it('mustache', () => {
		const processor = new Processor();
		expect(processor.compile(`{isActive ? 'bg-amber-100' : 'bg-gray-100'}`).success).to.be.eql([]);
	});
	it('template literal', () => {
		const processor = new Processor();
		expect(processor.compile('`bg-amber-${shade}`').success).to.be.eql([]);
	});
})