import { expect } from 'chai';
import fs from 'fs';
import path from 'path';

import Reader from '../reader';

describe('st2flow-yaml: Reader', () => {

  describe('parses simple.yaml', () => {
    const yaml = fs.readFileSync(path.join(__dirname, 'data', 'simple.yaml'), 'utf-8');
    const reader = new Reader(yaml);

    [
      { start:   0, end:   5, level: 1, type: 'key', value: 'bools' },
      { start:   5, end:   7, level: 2, type: 'token-separator', value: ':' },
      { start:   7, end:  14, level: 3, type: 'key', value: 'trues' },
      { start:  14, end:  16, level: 4, type: 'token-separator', value: ':' },
      { start:  16, end:  21, level: 5, type: 'token-sequence', value: '-' },
      { start:  21, end:  27, level: 6, type: 'value', value: true },
      { start:  27, end:  32, level: 5, type: 'token-sequence', value: '-' },
      { start:  32, end:  38, level: 6, type: 'value', value: true },
      { start:  38, end:  43, level: 5, type: 'token-sequence', value: '-' },
      { start:  43, end:  50, level: 6, type: 'value', value: true },

      { start:  50, end:  57, level: 1, type: 'key', value: 'strings' },
      { start:  57, end:  59, level: 2, type: 'token-separator', value: ':' },
      { start:  59, end:  67, level: 3, type: 'key', value: 'string' },
      { start:  67, end:  68, level: 4, type: 'token-separator', value: ':' },
      { start:  68, end:  88, level: 5, type: 'value', value: 'string with spaces' },
      { start:  88, end: 101, level: 3, type: 'key', value: 'longstring1' },
      { start: 101, end: 102, level: 4, type: 'token-separator', value: ':' },
      { start: 102, end: 151, level: 5, type: 'value', value: 'a long string with an ignored newline' },
      { start: 151, end: 164, level: 3, type: 'key', value: 'longstring2' },
      { start: 164, end: 165, level: 4, type: 'token-separator', value: ':' },
      { start: 165, end: 217, level: 5, type: 'value', value: 'a long string with a maintained\nnewline' },

      { start: 217, end: 222, level: 1, type: 'key', value: 'lists' },
      { start: 222, end: 224, level: 2, type: 'token-separator', value: ':' },
      { start: 224, end: 227, level: 3, type: 'token-sequence', value: '-' },
      { start: 227, end: 231, level: 4, type: 'key', value: 'foo' },
      { start: 231, end: 232, level: 5, type: 'token-separator', value: ':' },
      { start: 232, end: 237, level: 6, type: 'value', value: 'bar' },
      { start: 237, end: 244, level: 4, type: 'key', value: 'bar' },
      { start: 244, end: 246, level: 5, type: 'token-separator', value: ':' },

      { start: 246, end: 253, level: 6, type: 'token-sequence', value: '-' },
      { start: 253, end: 258, level: 7, type: 'value', value: 'foo' },
      { start: 258, end: 265, level: 6, type: 'token-sequence', value: '-' },
      { start: 265, end: 270, level: 7, type: 'value', value: 'bar' },

      { start: 270, end: 270, level: 1, type: 'eof', value: '' },
    ].map((token) => {
      if (token.value) {
        it(`finds ${token.type} of ${JSON.stringify(token.value)} at ${token.start}-${token.end}`, () => {
          const next = { ...reader.next() };
          for (const key in next) {
            if (typeof token[key] === 'undefined') {
              delete next[key];
            }
          }

          expect(next).to.deep.equal(token);
        });
      }
      else {
        it(`finds ${token.type} at ${token.start}-${token.end}`, () => {
          const next = { ...reader.next() };
          for (const key in next) {
            if (typeof token[key] === 'undefined') {
              delete next[key];
            }
          }

          expect(next).to.deep.equal(token);
        });
      }
    });
  });

});
