import { expect } from 'chai';
import fs from 'fs';
import path from 'path';

import AST from '../ast';

describe('st2flow-yaml: AST', () => {
  it('test', () => {
    const raw = fs.readFileSync(path.join(__dirname, 'data', 'basic.yaml'), 'utf-8');

    const data = new AST(raw);

    expect(data.toYAML()).to.equal(raw);
  });
});
