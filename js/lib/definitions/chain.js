'use strict';

const _ = require('lodash')
  , Definition = require('../definition')
  , Sector = require('../models/sector')
  , Task = require('../models/task')
  ;

class ChainDefinition extends Definition {
  constructor (model) {
    super();

    this.model = model;
  }

  get spec() {
    return _.assign(super.spec, {
      TASK_BLOCK: /^\s*chain:\s*$/,
      TASK: /^(\s*-\s*)/,
      TASK_NAME: /(.*)(name:\s+['"]*)([\w\s]+)/,
      TASK_REF: /(.*)(ref:\s+['"]*)([\w\s.]+)/,
      TASK_SUCCESS_TRANSITION: /(.*)(on-success:\s+['"]*)([\w\s]+)/,
      TASK_ERROR_TRANSITION: /(.*)(on-failure:\s+['"]*)([\w\s]+)/
    });
  }

  get template() {
    return _.assign(super.template, {
      taskBlock: () => _.template('chain:\n'),
      keyValue: (indent) => _.template(indent + '${key}: ${value}'),
      task: (starter, indent) => _.template(starter + 'name: ${name}\n' + indent + 'ref: ${ref}')
    });
  }

  parseLine(state, line, lineNum) {
    const indent = line.match(this.spec.WS_INDENT)[0].length;

    // If it starts with `chain:`, that's a start of task block
    if (!state.isTaskBlock && this.spec.TASK_BLOCK.test(line)) {
      state.isTaskBlock = true;
      state.taskBlockIdent = indent;

      state.taskBlock.setStart(lineNum, 0);

      return;
    }

    // If it has same or lesser indent, that's an end of task block
    if (state.isTaskBlock && state.taskBlockIdent >= indent) {
      state.isTaskBlock = false;

      state.taskBlock.setEnd(lineNum, 0);

      return false;
    }

    if (state.isTaskBlock) {
      let match;

      // If it starts with `-`, that's a new task
      match = this.spec.TASK.exec(line);
      if (match) {
        let [,starter] = match;

        if (state.currentTask) {
          state.currentTask.endSector('task', lineNum, 0);
        }

        let sector = new Sector(lineNum, 0).setType('task');
        state.currentTask = new Task().setSector('task', sector);
        state.currentTask.starter = starter;
      }

      let handler;

      handler = this.handler('name', this.spec.TASK_NAME);
      if (handler(line, lineNum, state.currentTask)) {
        const name = state.currentTask.getProperty('name');

        state.currentTask = this.model.task(name, state.currentTask);
        state.currentTask.getSector('task').setTask(state.currentTask);
        _.remove(state.untouchedTasks, (e) => e === name);

        return;
      }

      handler = this.handler('ref', this.spec.TASK_REF);
      if (handler(line, lineNum, state.currentTask)) {
        return;
      }

      handler = this.handler('success', this.spec.TASK_SUCCESS_TRANSITION);
      if (handler(line, lineNum, state.currentTask)) {
        return;
      }

      handler = this.handler('error', this.spec.TASK_ERROR_TRANSITION);
      if (handler(line, lineNum, state.currentTask)) {
        return;
      }

      if (state.currentTask && state.currentTask.isEmpty() && this.spec.EMPTY_LINE.test(line)) {
        state.currentTask.starter += '\n';
      }

    }
  }
}

module.exports = ChainDefinition;
