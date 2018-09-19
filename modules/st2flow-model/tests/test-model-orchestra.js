import { expect } from 'chai';
import fs from 'fs';
import path from 'path';

import Model from '../model-orquesta';

describe.skip('st2flow-model: Orchestra Model', () => {
  let raw = null;
  let model = null;

  describe('handles basic.yaml', () => {

    before(() => {
      raw = fs.readFileSync(path.join(__dirname, 'data', 'orchestra-basic.yaml'), 'utf-8');
      model = new Model(raw);
    });

    it('reads metadata', () => {
      expect(model).to.have.property('version', 1);
      expect(model).to.have.property('description', 'A sample workflow that demonstrates how to use conditions to determine which path in the workflow to take.\n');
    });

    it('reads tasks', () => {
      const tasks = model.tasks;
      expect(Object.keys(tasks)).to.have.property('length', 4);

      for (const [ , value ] of tasks) {
        expect(value).to.have.property('action');
        expect(value).to.have.nested.property('coord.x');
        expect(value).to.have.nested.property('coord.y');
      }
    });

    it('reads transitions', () => {
      const transitions = model.transitions;
      expect(transitions).to.have.property('length', 4);

      for (const transition of transitions) {
        expect(transition).to.have.nested.property('from.name');
        expect(transition).to.have.nested.property('to.name');
        expect(transition).to.have.property('type');
        expect(transition).to.have.property('condition');
      }
    });

    it('writes basic.yaml', () => {
      expect(model.toYAML()).to.equal(raw);
    });

    it('updates transitions', () => {

      model.updateTransition(model.transitions[0], {
        condition: 'bar',
      });

      const transition = model.transitions[0];
      expect(transition).to.have.nested.property('from.name', 't1');
      expect(transition).to.have.nested.property('to.name', 'a');
      expect(transition).to.have.property('type', 'Success');
      expect(transition).to.have.property('condition', 'bar');
    });

    it('updates tasks', () => {
      model.updateTask(model.tasks[0], {
        name: 'foo',
        action: 'bar',
      });

      const task = model.tasks[0];
      expect(task).to.have.property('name', 'foo');
      expect(task).to.have.property('action', 'bar');
      expect(task).to.have.nested.property('coord.x', 0);
      expect(task).to.have.nested.property('coord.y', 0);
    });

    it('updates basic.yaml with task/transition updates', () => {
      expect(model.toYAML()).to.equal(raw
        .replace('<% state() = "succeeded" and result().stdout = \'a\' %>', 'bar')
        .replace('core.local cmd="printf <% $.which %>"', 'bar')
        .replace('t1:', 'foo:')
      );
    });

    it('deletes transitions', () => {
      expect(model.transitions).to.have.property('length', 4);
      model.deleteTransition(model.transitions[0]);
      expect(model.transitions).to.have.property('length', 3);
    });

    it('deletes tasks', () => {
      expect(model.tasks).to.have.property('length', 4);
      model.deleteTask(model.tasks[0]);
      expect(model.tasks).to.have.property('length', 3);
    });

    it('updates basic.yaml with task/transition deletes', () => {
      const lines = raw.split('\n');
      lines.splice(10, 14);

      expect(model.toYAML()).to.equal(lines.join('\n'));
    });

  });

});
