import { expect } from 'chai';
import fs from 'fs';
import path from 'path';

import Model from '../model-orchestra';

describe('st2flow-model: Orchestra Model', () => {
  it('test', () => {
    const raw = fs.readFileSync(path.join(__dirname, 'data', 'orchestra-basic.yaml'), 'utf-8');

    const model = new Model(raw);

    expect(model.toYAML()).to.equal(raw);
  });
});
