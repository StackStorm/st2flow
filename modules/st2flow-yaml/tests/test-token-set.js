import fs from 'fs';
import path from 'path';
import { expect } from 'chai';
import TokenSet from '../token-set';

describe('TokenSet', () => {
  describe('toYAML method', () => {
    [ /*'basic', 'simple', 'long', */'complex' ].forEach(file => {
      it(`maintains source identity with ${file}.yaml`, () => {
        const yaml = fs.readFileSync(path.join(__dirname, 'data', `${file}.yaml`), 'utf-8');
        const set = new TokenSet(yaml);
        expect(set.toYAML()).to.equal(yaml);
      });
    });
  });
});
