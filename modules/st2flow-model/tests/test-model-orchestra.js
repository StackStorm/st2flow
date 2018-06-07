import { expect } from 'chai';
import fs from 'fs';
import path from 'path';

import Model from '../model-orchestra';

describe('st2flow-model: Orchestra Model', () => {
  let raw = null;
  let model = null;

  describe('handles basic.yaml', () => {
    before(() => {
      raw = fs.readFileSync(path.join(__dirname, 'data', 'orchestra-basic.yaml'), 'utf-8');
      model = new Model(raw);
    });

    it('reads metadata', () => {
      expect(model).to.have.property('version', 1);
      expect(model).to.have.property('description', 'A sample workflow that demonstrates how to use conditions to determine which path in the workflow to take.');
    });

    it('reads tasks', () => {
      const tasks = model.tasks;
      expect(tasks).to.have.property('length', 4);

      for (const task of tasks) {
        expect(task).to.have.property('name');
        expect(task).to.have.property('action');
        expect(task).to.have.nested.property('coord.x');
        expect(task).to.have.nested.property('coord.y');
      }
    });

    it('reads transitions', () => {
      const transitions = model.transitions;
      expect(transitions).to.have.property('length', 4);

      for (const task of transitions) {
        expect(task).to.have.nested.property('from.name');
        expect(task).to.have.nested.property('to.name');
        expect(task).to.have.property('type');
        expect(task).to.have.property('condition');
      }
    });

    it.skip('writes basic.yaml', () => {
      expect(model.toYAML()).to.equal(raw);
    });

  });

});
