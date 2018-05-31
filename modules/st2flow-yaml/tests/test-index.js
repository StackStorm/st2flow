import { expect } from 'chai';
import fs from 'fs';
import path from 'path';

import { read, write } from '..';

describe('st2flow-yaml', () => {

  it('reads simple.yaml', () => {
    const input = fs.readFileSync(path.join(__dirname, 'data', 'simple.yaml'), 'utf-8');
    const tokens = read(input);

    expect(tokens).to.deep.equal([
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
    ]);
  });

  it('writes simple.yaml', () => {
    const input = fs.readFileSync(path.join(__dirname, 'data', 'simple.yaml'), 'utf-8');
    const tokens = read(input);
    const output = write(tokens);

    expect(output).to.equal(input);
  });

});
