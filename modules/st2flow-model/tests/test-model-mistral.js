import { expect } from 'chai';
import fs from 'fs';
import path from 'path';

import Model from '../model-mistral';

describe('st2flow-model: Mistral Model', () => {
  let raw = null;
  let model = null;

  describe('basic.yaml', () => {
    before(() => {
      raw = fs.readFileSync(path.join(__dirname, 'data', 'mistral-basic.yaml'), 'utf-8');
    });

    beforeEach(() => {
      model = new Model(raw);
      expect(model).to.have.property('tokenSet');
    });

    it('reads metadata', () => {
      expect(model).to.have.property('version', '2.0');
      expect(model).to.have.property('description', 'A sample workflow that demonstrates how to use conditions to determine which path in the workflow to take.\n');
    });

    it('reads tasks', () => {
      const tasks = model.tasks;
      expect(Object.keys(tasks)).to.have.property('length', 4);

      for (const task of tasks) {
        expect(task).to.have.property('action');
        expect(task).to.have.nested.property('coords.x');
        expect(task).to.have.nested.property('coords.y');
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

    describe('updateTask()', () => {
      let model;

      before(() => {
        model = new Model(raw);
        expect(model).to.have.property('tokenSet');
      });

      it('updates tasks', () => {
        model.updateTask(model.tasks[0], {
          name: 'foo',
          action: 'bar',
        });

        const task = model.tasks[0];
        expect(task).to.have.property('name', 'foo');
        expect(task).to.have.property('action', 'bar');
        expect(task).to.have.nested.property('coords.x', 0);
        expect(task).to.have.nested.property('coords.y', 0);
      });

      it('serializes changes', () => {
        expect(model.toYAML()).to.equal(raw
          .replace('t1:', 'foo:')
          .replace('action: core.local', 'action: bar')
        );
      });
    });

    describe('updateTransition()', () => {
      let model;

      before(() => {
        model = new Model(raw);
        expect(model).to.have.property('tokenSet');
      });

      it('updates conditions', () => {
        model.updateTransition(model.transitions[0], {
          condition: 'bar',
        });

        const transition = model.transitions[0];
        expect(transition).to.have.nested.property('from.name', 't1');
        expect(transition).to.have.nested.property('to.name', 'a');
        expect(transition).to.have.property('type', 'Success');
        expect(transition).to.have.property('condition', 'bar');
      });

      it('removes conditions', () => {
        model.updateTransition(model.transitions[1], {
          condition: null,
        });

        const transition = model.transitions[1];
        expect(transition).to.have.property('condition', null);
      });

      it('updates the "to" property', () => {
        model.updateTransition(model.transitions[2], {
          to: { name: 'b' },
        });

        const transition = model.transitions[2];
        expect(transition).to.have.nested.property('to.name', 'b');
      });

      it('serializes changes', () => {
        expect(model.toYAML()).to.equal(raw
          .replace('a: <% $.path = \'a\' %>', 'a: bar')
          .replace('b: <% $.path = \'b\' %>', 'b')
          .replace('c: <% not $.path in list(a, b) %>', 'b: <% not $.path in list(a, b) %>')
        );
      });
    });

    describe('deleteTask()', () => {
      let model;

      before(() => {
        model = new Model(raw);
        expect(model).to.have.property('tokenSet');
      });

      it('deletes tasks', () => {
        expect(model.tasks).to.have.property('length', 4);
        model.deleteTask(model.tasks[0]);
        expect(model.tasks).to.have.property('length', 3);
      });

      it('updates basic.yaml with task deletes', () => {
        const lines = raw.split('\n');
        lines.splice(10, 12);

        expect(model.toYAML()).to.equal(lines.join('\n'));
      });
    });

    describe('deleteTransition()', () => {
      let model;

      before(() => {
        model = new Model(raw);
        expect(model).to.have.property('tokenSet');
      });

      it('deletes transitions', () => {
        expect(model.transitions).to.have.property('length', 4);
        model.deleteTransition(model.transitions[0]);
        expect(model.transitions).to.have.property('length', 3);
      });

      it('updates basic.yaml with transition deletes', () => {
        const lines = raw.split('\n');
        lines.splice(17, 1);

        expect(model.toYAML()).to.equal(lines.join('\n'));
      });
    });

  });

});
