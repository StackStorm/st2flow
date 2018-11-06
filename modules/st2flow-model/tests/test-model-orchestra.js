import { expect } from 'chai';
import fs from 'fs';
import path from 'path';
import YAML from 'js-yaml';

import Model from '../model-orquesta';

describe('st2flow-model: Orchestra Model', () => {
  let raw = null;
  let model = null;
  let yaml = null;

  describe('handles basic.yaml', () => {

    before(() => {
      raw = fs.readFileSync(path.join(__dirname, 'data', 'orchestra-basic.yaml'), 'utf-8');
      model = new Model(raw);
      yaml = YAML.safeLoad(raw);
    });

    it('reads metadata', () => {
      expect(model).to.have.property('version', 1);
      expect(model).to.have.property('description', 'A sample workflow that demonstrates how to use conditions to determine which path in the workflow to take.\n');
    });

    it('reads tasks', () => {
      const tasks = model.tasks;
      expect(tasks).to.have.length(5);

      for (const task of tasks) {
        expect(task).to.have.property('action', yaml.tasks[task.name].action.split(' ')[0]);
        expect(task).to.have.nested.property('coords.x');
        expect(task).to.have.nested.property('coords.y');
      }
    });

    it('reads transitions', () => {
      const transitions = model.transitions;
      expect(transitions).to.have.property('length', 5);

      for (const transition of transitions) {
        expect(transition).to.have.nested.property('from.name');
        expect(transition).to.have.nested.property('to.name');
        expect(yaml.tasks[transition.from.name].next).to.be.an('array');
        const transitionBlock = yaml.tasks[transition.from.name].next.find(t => t.when === transition.condition);
        expect(transitionBlock.do).to.include(transition.to.name);
      }
    });

    it('writes basic.yaml', () => {
      expect(model.toYAML()).to.equal(raw);
    });

    it.skip('updates transitions', () => {

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
        name: 'bar',
        action: 'foo',
      });

      const task = model.tasks[0];
      expect(task).to.have.property('name', 'bar');
      expect(task).to.have.property('action', 'foo');
      expect(task).to.have.nested.property('coords.x', 0);
      expect(task).to.have.nested.property('coords.y', 0);
    });

    it ('sets task property', () => {
      model.setTaskProperty(model.tasks[0], 'join', 'all');

      const task = model.tasks[0];
      expect(task).to.have.property('join', 'all');
    });

    it('updates basic.yaml with task/transition updates', () => {
      expect(model.toYAML()).to.equal(raw
        .replace('<% state() = "succeeded" and result().stdout = \'a\' %>', 'bar')
        .replace('core.local', 'foo')
        .replace('t1:', 'bar:')
        .replace('a:', '  join: all\n  a:')
      );
    });

    it('deletes single transition', () => {
      expect(model.transitions).to.have.property('length', 5);
      model.deleteTransition(model.transitions[0]);
      expect(model.transitions).to.have.property('length', 4);
    });
    
    it('deletes entire transition block', () => {
      expect(model.transitions).to.have.property('length', 4);
      model.deleteTransition(model.transitions[3]);
      expect(model.transitions).to.have.property('length', 3);
    });

    it('deletes tasks', () => {
      expect(model.tasks).to.have.property('length', 5);
      model.deleteTask(model.tasks[1]);
      expect(model.tasks).to.have.property('length', 4);
    });

    it ('sets task property', () => {
      model.deleteTaskProperty(model.tasks[0], 'join');

      const task = model.tasks[0];
      expect(task).to.not.have.property('join');
    });

    it('updates basic.yaml with task/transition deletes', () => {
      const lines = raw
        .replace(/t1:\n(\s+)action: core.local/, 'bar:\n$1action: foo')
        .replace(/\s+- a/, '')
        .replace(/\s+a:\s+action: core.local cmd="echo 'Took path A.'"/, '')
        .replace(/\s+next:\s+- do: 'foobar'/, '')
        ;

      expect(model.toYAML()).to.equal(lines);
    });

  });

});
