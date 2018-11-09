import { expect } from 'chai';
import fs from 'fs';
import path from 'path';

import Model from '../model-orquesta';

describe('st2flow-model: Orquesta Model', () => {
  let raw = null;
  let model = null;

  describe('basic.yaml', () => {
    before(() => {
      raw = fs.readFileSync(path.join(__dirname, 'data', 'orquesta-basic.yaml'), 'utf-8');
    });

    beforeEach(() => {
      model = new Model(raw);
      expect(model).to.have.property('tokenSet');
    });

    describe('updateTransition()', () => {
      it('removes "do" values', () => {
        const origTr = model.transitions[0];
        expect(model.transitions.length).to.equal(5);

        model.updateTransition(model.transitions[0], {
          to: { name: null },
        });

        expect(model.transitions.length).to.equal(4);
        const oldTransition = model.transitions.find(tr =>
          tr.from.name === origTr.from.name && tr.to.name === origTr.to.name && tr.condition === origTr.condition
        );

        expect(oldTransition).to.equal(undefined);
      });

      it('can update the transition publish values', () => {
        const origTr = model.transitions[0];
        expect(origTr).to.have.property('publish');

        model.updateTransition(origTr, {
          publish: 'foo=bar',
        });

        const oldTransition = model.transitions.find(tr =>
          tr.publish === origTr.publish && tr.from.name === origTr.from.name && tr.to.name === origTr.to.name && tr.condition === origTr.condition
        );
        const newTransition = model.transitions.find(tr =>
          tr.publish === 'foo=bar' && tr.from.name === origTr.from.name && tr.to.name === origTr.to.name && tr.condition === origTr.condition
        );

        expect(oldTransition).to.equal(undefined);
        expect(newTransition).to.not.equal(undefined);
      });
    });

    describe('updates YAML', () => {
      it('for task deletions', () => {
        const lines = raw.split('\n');

        model.deleteTask(model.tasks[1]);
        lines.splice(26, 2);

        expect(model.toYAML()).to.equal(lines.join('\n'));
      });

      it('for transition deletions', () => {
        const lines = raw.split('\n');

        model.deleteTransition(model.transitions[4]);
        lines.splice(30, 2);

        model.deleteTransition(model.transitions[0]);
        lines.splice(18, 1);

        expect(model.toYAML()).to.equal(lines.join('\n'));
      });
    });
  });
});
