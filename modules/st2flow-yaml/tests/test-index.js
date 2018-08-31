import { expect } from 'chai';
import fs from 'fs';
import path from 'path';

import { read, write } from '..';

describe.skip('st2flow-yaml', () => {

  it('reads simple.yaml', () => {
    const input = fs.readFileSync(path.join(__dirname, 'data', 'simple.yaml'), 'utf-8');
    const tokens = read(input);
    expect(tokens).to.be.instanceOf(Array);
  });

  it('writes simple.yaml', () => {
    const input = fs.readFileSync(path.join(__dirname, 'data', 'simple.yaml'), 'utf-8');
    const tokens = read(input);
    const output = write(tokens);

    expect(output).to.equal(input);
  });

  it('reads basic.yaml', () => {
    const input = fs.readFileSync(path.join(__dirname, 'data', 'basic.yaml'), 'utf-8');
    const tokens = read(input);

    expect(tokens).to.be.instanceOf(Array);
  });

  it('writes basic.yaml', () => {
    const input = fs.readFileSync(path.join(__dirname, 'data', 'basic.yaml'), 'utf-8');
    const tokens = read(input);
    const output = write(tokens);

    expect(output).to.equal(input);
  });

});
