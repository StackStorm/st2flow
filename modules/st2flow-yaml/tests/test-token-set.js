import fs from 'fs';
import path from 'path';
import { expect } from 'chai';
import TokenSet from '../token-set';

describe('TokenSet', () => {
  [ 'basic', 'simple', 'long', 'complex' ].forEach(file => {
    let yaml;
    let set;

    describe('Conventional YAML', () => {
      const filename = `${file}.yaml`;

      before(() => {
        yaml = fs.readFileSync(path.join(__dirname, 'data', filename), 'utf-8');
      });

      beforeEach(() => {
        set = new TokenSet(yaml);
      });

      it(`stringification maintains source identity with ${filename}`, () => {
        expect(set.toYAML()).to.equal(yaml);
      });

      it.skip(`refining maintains source identity with ${filename}`, () => {
        set.refineTree();
        expect(set.toYAML()).to.equal(yaml);
      });
    });

    describe('JSON-like YAML', () => {
      const filename = `${file}-json.yaml`;

      before(() => {
        yaml = fs.readFileSync(path.join(__dirname, 'data', filename), 'utf-8');
      });

      beforeEach(() => {
        set = new TokenSet(yaml);
      });

      it(`stringification maintains source identity with ${filename}`, () => {
        expect(set.toYAML()).to.equal(yaml);
      });

      it(`refining maintains source identity with ${filename}`, () => {
        set.refineTree();
        expect(set.toYAML()).to.equal(yaml);
      });
    });
  });
});
