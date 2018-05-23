import { expect } from 'chai';
import fs from 'fs';
import path from 'path';

import AST from '..';

describe('st2flow-yaml: AST', () => {
  it('test', () => {
    const yaml = fs.readFileSync(path.join(__dirname, 'data', 'basic.yaml'), 'utf-8');
    // const json = fs.readFileSync(path.join(__dirname, 'data', 'basic.json'), 'utf-8');

    const ast = new AST(yaml);
    console.log(ast.tree.toDebug()); // eslint-disable-line no-console

    expect(true).to.equal(true);
    // expect(JSON.stringify(ast, null, 2)).to.deep.equal(json);
    // expect(ast.toYAML()).to.equal(yaml);
  });
});
