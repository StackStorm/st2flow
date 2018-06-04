import { expect } from 'chai';
import fs from 'fs';
import path from 'path';

import Reader from '../reader';

describe('st2flow-yaml: Reader', () => {

  describe('parses simple.yaml', () => {
    const yaml = fs.readFileSync(path.join(__dirname, 'data', 'simple.yaml'), 'utf-8');
    const reader = new Reader(yaml);

    [
      { start:   0, end:   5, level: 1, type: 'key', value: 'bools', prefix: '', suffix: '' },
      { start:   5, end:   7, level: 2, type: 'token-separator', value: ':', prefix: '', suffix: '\n' },
      { start:   7, end:  14, level: 3, type: 'key', value: 'trues', prefix: '  ', suffix: '' },
      { start:  14, end:  16, level: 4, type: 'token-separator', value: ':', prefix: '', suffix: '\n' },
      { start:  16, end:  21, level: 5, type: 'token-sequence', value: '-', prefix: '    ', suffix: '' },
      { start:  21, end:  27, level: 6, type: 'value', value: true, prefix: ' ', valueMetadata: 'lower', suffix: '\n' },
      { start:  27, end:  32, level: 5, type: 'token-sequence', value: '-', prefix: '    ', suffix: '' },
      { start:  32, end:  38, level: 6, type: 'value', value: true, prefix: ' ', valueMetadata: 'title', suffix: '\n' },
      { start:  38, end:  43, level: 5, type: 'token-sequence', value: '-', prefix: '    ', suffix: '' },
      { start:  43, end:  50, level: 6, type: 'value', value: true, prefix: ' ', valueMetadata: 'upper', suffix: '\n\n' },

      { start:  50, end:  57, level: 1, type: 'key', value: 'strings', prefix: '', suffix: '' },
      { start:  57, end:  59, level: 2, type: 'token-separator', value: ':', prefix: '', suffix: '\n' },
      { start:  59, end:  67, level: 3, type: 'key', value: 'string', prefix: '  ', suffix: '' },
      { start:  67, end:  68, level: 4, type: 'token-separator', value: ':', prefix: '', suffix: '' },
      { start:  68, end:  88, level: 5, type: 'value', value: 'string with spaces', prefix: ' ', valueMetadata: '', suffix: '\n' },
      { start:  88, end: 101, level: 3, type: 'key', value: 'longstring1', prefix: '  ', suffix: '' },
      { start: 101, end: 102, level: 4, type: 'token-separator', value: ':', prefix: '', suffix: '' },
      { start: 102, end: 151, level: 5, type: 'value', value: 'a long string with an ignored newline', prefix: ' ', valueMetadata: '', suffix: '\n' },
      { start: 151, end: 164, level: 3, type: 'key', value: 'longstring2', prefix: '  ', suffix: '' },
      { start: 164, end: 165, level: 4, type: 'token-separator', value: ':', prefix: '', suffix: '' },
      { start: 165, end: 217, level: 5, type: 'value', value: 'a long string with a maintained\nnewline', prefix: ' ', valueMetadata: '', suffix: '\n\n' },

      { start: 217, end: 222, level: 1, type: 'key', value: 'lists', prefix: '', suffix: '' },
      { start: 222, end: 224, level: 2, type: 'token-separator', value: ':', prefix: '', suffix: '\n' },
      { start: 224, end: 227, level: 3, type: 'token-sequence', value: '-', prefix: '  ', suffix: '' },
      { start: 227, end: 231, level: 4, type: 'key', value: 'foo', prefix: ' ', suffix: '' },
      { start: 231, end: 232, level: 5, type: 'token-separator', value: ':', prefix: '', suffix: '' },
      { start: 232, end: 237, level: 6, type: 'value', value: 'bar', prefix: ' ', valueMetadata: '', suffix: '\n' },
      { start: 237, end: 244, level: 4, type: 'key', value: 'bar', prefix: '    ', suffix: '' },
      { start: 244, end: 245, level: 5, type: 'token-separator', value: ':', prefix: '', suffix: '' },
      { start: 245, end: 250, level: 6, type: 'value', value: 'foo', prefix: ' ', valueMetadata: '', suffix: '\n' },

      { start: 250, end: 250, level: 1, type: 'eof', value: '', prefix: '', suffix: '' },
    ].map((token) => {
      if (token.value) {
        it(`finds ${token.type} of ${JSON.stringify(token.value)} at ${token.start}-${token.end}`, () => {
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
