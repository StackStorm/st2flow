import fs from 'fs';
import path from 'path';
import { expect } from 'chai';
import TokenSet from '../token-set';

describe('TokenSet', () => {
  [ 'basic', 'simple', 'long', 'complex' ].forEach(file => {
    describe('Conventional YAML', () => {
      const filename = `${file}.yaml`;
      const yaml = fs.readFileSync(path.join(__dirname, 'data', filename), 'utf-8');

      it(`stringification maintains source identity with ${filename}`, () => {
        const set = new TokenSet(yaml);
        expect(set.toYAML()).to.equal(yaml);
      });

      it(`refining maintains source identity with ${filename}`, () => {
        const set = new TokenSet(yaml);
        set.refineTree();
        expect(set.toYAML()).to.equal(yaml);
      });
    });

    describe('JSON-like YAML', () => {
      const filename = `${file}-json.yaml`;
      const yaml = fs.readFileSync(path.join(__dirname, 'data', filename), 'utf-8');

      it(`stringification maintains source identity with ${filename}`, () => {
        const set = new TokenSet(yaml);
        expect(set.toYAML()).to.equal(yaml);
      });

      it(`refining maintains source identity with ${filename}`, () => {
        const set = new TokenSet(yaml);
        set.refineTree();
        expect(set.toYAML()).to.equal(yaml);
      });
    });
  });
});
