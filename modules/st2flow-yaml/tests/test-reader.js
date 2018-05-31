import { expect } from 'chai';
import fs from 'fs';
import path from 'path';

import Reader from '../reader';

describe('st2flow-yaml: Reader', () => {

  describe('parses simple.yaml', () => {
    const yaml = fs.readFileSync(path.join(__dirname, 'data', 'simple.yaml'), 'utf-8');
    const reader = new Reader(yaml);

    [
      { start:  0, end:  5, type: 'key', value: 'bools', prefix: '' },
      { start:  5, end:  6, type: 'token-separator', value: ':', prefix: '' },
      { start:  6, end: 14, type: 'key', value: 'trues', prefix: '\n  ' },
      { start: 14, end: 15, type: 'token-separator', value: ':', prefix: '' },
      { start: 15, end: 21, type: 'token-sequence', value: '-', prefix: '\n    ' },
      { start: 21, end: 26, type: 'value', value: true, prefix: ' ', valueMetadata: 'lower' },
      { start: 26, end: 32, type: 'token-sequence', value: '-', prefix: '\n    ' },
      { start: 32, end: 37, type: 'value', value: true, prefix: ' ', valueMetadata: 'title' },
      { start: 37, end: 43, type: 'token-sequence', value: '-', prefix: '\n    ' },
      { start: 43, end: 48, type: 'value', value: true, prefix: ' ', valueMetadata: 'upper' },
      { start: 48, end: 49, type: 'eof', value: '', prefix: '\n' },
    ].map((token) => {
      if (token.value) {
        it(`finds ${token.type} of ${token.value} at ${token.start}-${token.end}`, () => {
          expect(reader.next()).to.deep.equal(token);
        });
      }
      else {
        it(`finds ${token.type} at ${token.start}-${token.end}`, () => {
          expect(reader.next()).to.deep.equal(token);
        });
      }
    });

  });

});
