import { expect } from 'chai';
import fs from 'fs';
import path from 'path';

import Model from '../model-orchestra';

describe('st2flow-model: Orchestra Model', () => {
  it('test', () => {
    const raw = fs.readFileSync(path.join(__dirname, 'data', 'orchestra-basic.yaml'), 'utf-8');

    const model = new Model(raw);

    const version = model.get('version');
    expect(version).to.have.property('type', 'value');
    expect(version).to.have.property('value', 1);

    const description = model.get('description');
    expect(description).to.have.property('type', 'value');
    expect(description).to.have.property('value', 'A sample workflow that demonstrates how to use conditions to determine which path in the workflow to take.');

    console.log(model.get('input'));

    // expect(model.toYAML()).to.equal(raw);
  });
});
