import fs from 'fs';
import path from 'path';
import { expect } from 'chai';
import TokenSet from '../token-set';

describe('TokenSet', () => {
	describe('toYAML method', () => {
		['basic', 'simple', 'complex'].forEach(file => {
			it(`serializes ${file}.yaml correctly`, () => {
				const yaml = fs.readFileSync(path.join(__dirname, 'data', `${file}.yaml`), 'utf-8');
				const set = new TokenSet(yaml);
				const serialized = set.toYAML();
				expect(serialized).to.equal(yaml);
			});
		});
	});
});
