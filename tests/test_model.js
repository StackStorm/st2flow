import _ from 'lodash';
import { expect } from 'chai';
import fs from 'fs';

import Range from '../lib/util/range';
import Model from '../lib/model';

function dedent(callSite, ...args) {

    function format(str) {
        return str.replace(/\n\s+\|/g, '\n');;
    }

    if (typeof callSite === 'string') {
      return format(callSite);
    }

    if (typeof callSite === 'function') {
      return (...args) => format(callSite(...args));
    }


    let output = callSite
        .slice(0, args.length + 1)
        .map((text, i) => (i === 0 ? '' : args[i - 1]) + text)
        .join('');

    return format(output);
}

describe('Model', () => {

  let model;

  beforeEach(() => {
    model = new Model();
  });

  describe('#task()', () => {

    it('should create a new task when there no task with this name', () => {
      let result = model.task('some', {});

      expect(result).to.be.an('object');
      expect(result.getProperty('name')).to.be.equal('some');
      expect(model.tasks).to.include(result);
    });

    it('should return the task with the same name if there is one already', () => {
      let existing = model.task('some', {});

      let result = model.task('some');

      expect(result).to.be.an('object');
      expect(result).to.be.equal(existing);
    });

    it('should extend the existing task with the object provided', () => {
      let existing = model.task('some', {});
      existing.a = 1;
      existing.b = 'will be rewritten';

      let result = model.task('some', {b: 2, c: 3});

      expect(result).to.be.an('object');
      expect(result).to.have.property('a', 1);
      expect(result).to.have.property('b', 2);
      expect(result).to.have.property('c', 3);
    });

  });

  describe('#search()', () => {

    beforeEach(() => {
      let code = fs.readFileSync(`${ __dirname }/fixtures/chain.yaml`).toString();
      model.parse(code);
    });

    // TODO: fix action chain parser or decouple the test
    it.skip('should return an array of sectors touched by the range', () => {
      let coordinates = new Range(16, 6, 18, 18);
      // `······[··on-failure: setup_uninstall_pack_to_install_1
      // `····-
      // `········name: setu]p_uninstall_pack_to_install_1`

      let result = model.search(coordinates);

      expect(result).to.be.an('array');
      expect(result).to.have.length(3);

      expect(result[0].type).to.be.equal('task');
      expect(result[0].task)
        .to.be.equal(model.task('setup_check_pack_to_install_1_installed'));

      expect(result[1].type).to.be.equal('task');
      expect(result[1].task)
        .to.be.equal(model.task('setup_uninstall_pack_to_install_1'));

      expect(result[2].type).to.be.equal('name');
    });

    it.skip('should filter only specific types of sectors when requested', () => {
      let coordinates = new Range(16, 6, 18, 18);
      // `······[··on-failure: setup_uninstall_pack_to_install_1
      // `····-
      // `········name: setu]p_uninstall_pack_to_install_1`

      let result = model.search(coordinates, 'task');

      expect(result).to.be.an('array');
      expect(result).to.have.length(2);

      expect(_.every(result, 'type', 'task')).to.be.true;
    });

    it.skip('should return undefined when cursor is outside all the ranges', () => {
      let coordinates = new Range(1, 1, 1, 3);
      // `·[··]·····base_repo_url: "https://github.com/StackStorm"`

      let result = model.search(coordinates);

      expect(result).to.be.an('array');
      expect(result).to.have.length(0);
    });

    it.skip('should support zero character ranges (cursor)', () => {
      let coordinates = new Range(20, 5, 20, 5);
      // `·····|···ref: core.local`

      let result = model.search(coordinates);

      expect(result).to.be.an('array');
      expect(result).to.have.length(1);
      expect(result[0].task).to.be.equal(model.task('setup_uninstall_pack_to_install_1'));
    });

  });

  describe('#create()', () => {
    it('should create a node in a specified coordinates', () => {
      const t1 = model.create('core.local', 100, 200);
      expect(t1.name).to.be.equal('task1');

      const t2 = model.create('core.remote', 200, 100);
      expect(t2.name).to.be.equal('task2');

      expect(model.getValue()).to.be.equal(
        dedent`---
              |version: '2.0'
              |
              |untitled:
              |  tasks:
              |    task1:
              |      # [100, 200]
              |      action: core.local
              |    task2:
              |      # [200, 100]
              |      action: core.remote
              |`
      );
    });
  });

  describe('#delete()', () => {
    beforeEach(() => {
      model.create('core.local', 100, 200);
      model.create('core.remote', 200, 100);
    });

    it('should delete a node by name', () => {
      model.delete('task1');

      expect(model.getValue()).to.be.equal(
        dedent`---
              |version: '2.0'
              |
              |untitled:
              |  tasks:
              |    task2:
              |      # [200, 100]
              |      action: core.remote
              |`
      );
    });
  });

  describe('#move()', () => {
    beforeEach(() => {
      model.create('core.local', 100, 200);
      model.create('core.remote', 200, 100);
    });

    it('should move a node to new coordinates', () => {
      model.move('task1', 200, 200);

      expect(model.getValue()).to.be.equal(
        dedent`---
              |version: '2.0'
              |
              |untitled:
              |  tasks:
              |    task1:
              |      # [200, 200]
              |      action: core.local
              |    task2:
              |      # [200, 100]
              |      action: core.remote
              |`
      );
    });
  });

  describe('#setTransitions()', () => {
    beforeEach(() => {
      model.create('core.local', 100, 200);
      model.create('core.remote', 200, 100);
    });

    it('should set transitions for the node', () => {
      model.setTransitions('task1', [{
        name: 'a'
      }, {
        name: 'b'
      }, {
        name: 'c'
      }], 'error');

      expect(model.getValue()).to.be.equal(
        dedent`---
              |version: '2.0'
              |
              |untitled:
              |  tasks:
              |    task1:
              |      # [100, 200]
              |      action: core.local
              |      on-error:
              |        - a
              |        - b
              |        - c
              |    task2:
              |      # [200, 100]
              |      action: core.remote
              |`
      );
    });
  });

  describe('#connect()', () => {
    beforeEach(() => {
      model.create('core.local', 100, 200);
      model.create('core.remote', 200, 100);
    });

    it('should connect nodes with default transition type', () => {
      model.connect('task1', 'task2');

      expect(model.getValue()).to.be.equal(
        dedent`---
              |version: '2.0'
              |
              |untitled:
              |  tasks:
              |    task1:
              |      # [100, 200]
              |      action: core.local
              |      on-success:
              |        - task2
              |    task2:
              |      # [200, 100]
              |      action: core.remote
              |`
      );
    });

    it('should connect nodes with specific transition type when defined', () => {
      model.connect('task1', 'task2', 'complete');

      expect(model.getValue()).to.be.equal(
        dedent`---
              |version: '2.0'
              |
              |untitled:
              |  tasks:
              |    task1:
              |      # [100, 200]
              |      action: core.local
              |      on-complete:
              |        - task2
              |    task2:
              |      # [200, 100]
              |      action: core.remote
              |`
      );
    });
  });

  describe('#disconnect()', () => {
    beforeEach(() => {
      model.create('core.local', 100, 200);
      model.create('core.remote', 200, 100);

      model.connect('task1', 'task2');
    });

    it('should remove connections between two nodes', () => {
      model.disconnect('task1', 'task2');

      expect(model.getValue()).to.be.equal(
        dedent`---
              |version: '2.0'
              |
              |untitled:
              |  tasks:
              |    task1:
              |      # [100, 200]
              |      action: core.local
              |    task2:
              |      # [200, 100]
              |      action: core.remote
              |`
      );
    });

    it('should only remove connections in a specific direction', () => {
      model.connect('task1', 'task2', 'error');
      model.connect('task2', 'task1', 'error');

      model.disconnect('task1', 'task2');

      expect(model.getValue()).to.be.equal(
        dedent`---
              |version: '2.0'
              |
              |untitled:
              |  tasks:
              |    task1:
              |      # [100, 200]
              |      action: core.local
              |    task2:
              |      # [200, 100]
              |      action: core.remote
              |      on-error:
              |        - task1
              |`
      );
    });

    it('should only remove connections of specific type when defined', () => {
      model.connect('task1', 'task2', 'error');
      model.connect('task2', 'task1', 'error');

      model.disconnect('task1', 'task2', 'error');

      expect(model.getValue()).to.be.equal(
        dedent`---
              |version: '2.0'
              |
              |untitled:
              |  tasks:
              |    task1:
              |      # [100, 200]
              |      action: core.local
              |      on-success:
              |        - task2
              |    task2:
              |      # [200, 100]
              |      action: core.remote
              |      on-error:
              |        - task1
              |`
      );
    });

    it('should remove connections of multiple types when defined', () => {
      model.connect('task1', 'task2', 'error');
      model.connect('task1', 'task2', 'complete');

      model.disconnect('task1', 'task2', ['error', 'success']);

      expect(model.getValue()).to.be.equal(
        dedent`---
              |version: '2.0'
              |
              |untitled:
              |  tasks:
              |    task1:
              |      # [100, 200]
              |      action: core.local
              |      on-complete:
              |        - task2
              |    task2:
              |      # [200, 100]
              |      action: core.remote
              |`
      );
    });
  });

  describe('#rename()', () => {
    beforeEach(() => {
      model.create('core.local', 100, 200);
      model.create('core.remote', 200, 100);

      model.connect('task1', 'task2');
    });

    it('should rename a node', () => {
      model.rename('task1', 'start');
      model.rename('task2', 'finish');

      expect(model.getValue()).to.be.equal(
        dedent`---
              |version: '2.0'
              |
              |untitled:
              |  tasks:
              |    start:
              |      # [100, 200]
              |      action: core.local
              |      on-success:
              |        - finish
              |    finish:
              |      # [200, 100]
              |      action: core.remote
              |`
      );
    });
  });

  describe('#setName()', () => {
    beforeEach(() => {
      model.create('core.local', 100, 200);
    });

    it('should set a name for the workflow', () => {
      model.setName('some');

      expect(model.getValue()).to.be.equal(
        dedent`---
              |version: '2.0'
              |
              |some:
              |  tasks:
              |    task1:
              |      # [100, 200]
              |      action: core.local
              |`
      );
    });
  });

  describe('#setInputs()', () => {
    beforeEach(() => {
      model.create('core.local', 100, 200);
    });

    it('should set inputs for the workflow', () => {
      model.setInput(['a', 'b', 'c']);

      expect(model.getValue()).to.be.equal(
        dedent`---
              |version: '2.0'
              |
              |untitled:
              |  input:
              |    - a
              |    - b
              |    - c
              |  tasks:
              |    task1:
              |      # [100, 200]
              |      action: core.local
              |`
      );
    });
  });

  describe('#undo()', () => {
    beforeEach(() => {
      model.create('core.local', 100, 200);
    });

    it('should undo the latest change', () => {
      const initial = model.getValue();

      model.create('core.local', 200, 100);
      model.undo();

      expect(model.getValue()).to.be.equal(initial);
    });

    it('should do nothing if there is no more changes to undo', () => {
      model.undo();

      expect(model.getValue()).to.be.equal('');

      model.undo();
      model.undo();

      expect(model.getValue()).to.be.equal('');
    });
  });

  describe('#redo()', () => {
    beforeEach(() => {
      model.create('core.local', 100, 200);
    });

    it('should redo the latest undid change', () => {
      const initial = model.getValue();

      model.create('core.local', 200, 100);
      const changed = model.getValue();

      model.undo();

      expect(model.getValue()).to.be.equal(initial);

      model.redo();

      expect(model.getValue()).to.be.equal(changed);
    });

    it('should do nothing if there is no more changes to undo', () => {
      const initial = model.getValue();

      model.undo();
      model.redo()

      expect(model.getValue()).to.be.equal(initial);

      model.redo();
      model.redo();

      expect(model.getValue()).to.be.equal(initial);
    });
  });

});
