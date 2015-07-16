'use strict';

const _ = require('lodash')
  , Definition = require('../definition')
  , Sector = require('../sector')
  ;

class MistralDefinition extends Definition {
  constructor (model) {
    super();

    this.model = model;
  }

  get defaults() {
    const unit = '  ';
    return {
      indents: {
        base: '',
        workflow: unit.repeat(1),
        tasks: unit.repeat(2),
        task: unit.repeat(3),
        property: unit.repeat(4),
        transition: unit.repeat(5)
      }
    };
  }

  get spec() {
    return _.assign(super.spec, {
      WORKFLOWS_BLOCK: /^\s*workflows:\s*$/,
      WORKFLOW_NAME: /^(\s*)(\w+):\s*$/,
      TASK_BLOCK: /^\s*tasks:\s*$/,
      TASK_ACTION: /(.*)(action:\s+['"]*)([\w\s.]+)/,
      SUCCESS_BLOCK: /^\s*on-success:\s*$/,
      ERROR_BLOCK: /^\s*on-error:\s*$/,
      COMPLETE_BLOCK: /^\s*on-complete:\s*$/,
      TRANSITION: /^(\s*-\s*)(\w+)/,
    });
  }

  get template() {
    return _.assign(super.template, {
      task: (starter, indent) => _.template(starter + '${name}:\n' + indent + 'action: ${ref}\n'),
      block: {
        base: () => _.template(`version: '2.0'\n\nworkflows:\n`),
        workflow: (external='', internal=external + '  ') =>
          _.template(external + '${name}:\n' + internal + 'type: ${type}\n'),
        tasks: (indent='') => _.template(indent + 'tasks:\n'),
        success: (indent) => _.template(indent + 'on-success:\n'),
        error: (indent) => _.template(indent + 'on-error:\n'),
        complete: (indent) => _.template(indent + 'on-complete:\n'),
      },
      transition: (starter) => _.template(starter + '${name}\n')
    });
  }

  parseLine(state, line, lineNum) {
    state.workflowBlock = state.workflowBlock || new Sector();

    if (this.spec.EMPTY_LINE.test(line)) {
      return;
    }

    let block = this.block('isWorkflowBlock', this.spec.WORKFLOWS_BLOCK);

    if (block.enter(line, lineNum, state)) {
      state.workflowBlock.setStart(lineNum, 0);
      return;
    }

    if (block.exit(line, lineNum, state)) {
      state.workflowBlock.setEnd(lineNum, 0);
      return false;
    }

    if (state.isWorkflowBlock) {
      state.workflowBlock.setEnd(lineNum, 0); // ? lineNum + 1

      let match;

      match = this.spec.WORKFLOW_NAME.exec(line);
      if (match) {
        let [,indent,name] = match;

        if (!state.currentWorkflow || indent.length === state.currentWorkflow.indent.length) {
          if (state.currentWorkflow) {
            state.currentWorkflow.setEnd(lineNum, 0);
          }

          state.currentWorkflow = new Sector(lineNum, 0).setType('workflow');
          state.currentWorkflow.indent = indent;
          state.currentWorkflow.name = name;
          state.currentWorkflow.taskBlock = new Sector();
          state.taskBlock = state.currentWorkflow.taskBlock; // FIX: support multiple workflows

          return;
        }
      }
    }

    if (state.isWorkflowBlock && state.currentWorkflow) {
      state.currentWorkflow.setEnd(lineNum, 0);

      let block = this.block('isTaskBlock', this.spec.TASK_BLOCK);

      if (block.enter(line, lineNum, state)) {
        state.currentWorkflow.taskBlock.setStart(lineNum, 0);
        return;
      }

      if (block.exit(line, lineNum, state)) {
        state.currentWorkflow.taskBlock.setEnd(lineNum, 0);
      }
    }

    if (state.isWorkflowBlock && state.currentWorkflow && state.isTaskBlock) {
      state.currentWorkflow.taskBlock.setEnd(lineNum + 1, 0);

      let match;

      match = this.spec.WORKFLOW_NAME.exec(line);
      if (match) {
        const [,starter,name] = match
            , coords = [lineNum, starter.length, lineNum, (starter+name).length]
            ;

        if (!state.currentTask || starter.length === state.currentTask.starter.length) {
          if (state.currentTask) {
            state.currentTask.endSector('task', lineNum, 0);
          }

          const taskSector = new Sector(lineNum, 0).setType('task')
              , nameSector = new Sector(...coords).setType('name')
              ;

          state.currentTask = this.model.task(name)
            .setSector('task', taskSector)
            .setSector('name', nameSector)
            ;

          state.currentTask.starter = starter;

          const TYPES = ['success', 'error', 'complete'];

          _.each(TYPES, (type) => {
            const sector = new Sector().setType(type);
            sector.indent = starter + '  ';
            sector.childStarter = starter + '    - ';

            state.currentTask
              .setProperty(type, [])
              .setSector(type, sector)
              ;
          });

          _.remove(state.untouchedTasks, (e) => e === name);
        }
      }

      let handler;

      handler = this.handler('ref', this.spec.TASK_ACTION);
      if (handler(line, lineNum, state.currentTask)) {
        return;
      }

      let block;

      block = this.block('isSuccessBlock', this.spec.SUCCESS_BLOCK);

      if (block.enter(line, lineNum, state)) {
        const sector = state.currentTask.getSector('success');
        sector.setStart(lineNum, 0);
        sector.indent = ' '.repeat(state.isSuccessBlock - 1);
        return;
      }

      if (block.exit(line, lineNum, state)) {
        const sector = state.currentTask.getSector('success');
        sector.setEnd(lineNum, 0);
      }

      if (state.isSuccessBlock) {
        const sector = state.currentTask.getSector('success');
        sector.setEnd(lineNum + 1, 0);

        let match;

        match = this.spec.TRANSITION.exec(line);
        if (match) {
          const [,starter,value] = match
            ;

          sector.childStarter = starter;

          const type = 'success'
            , task = state.currentTask
            , values = task.getProperty(type)
            ;

          values.push(value);

          task.setProperty(type, values);

          return;
        }
      }

      block = this.block('isErrorBlock', this.spec.ERROR_BLOCK);

      if (block.enter(line, lineNum, state)) {
        const sector = state.currentTask.getSector('error');
        sector.setStart(lineNum, 0);
        sector.indent = ' '.repeat(state.isErrorBlock - 1);
        return;
      }

      if (block.exit(line, lineNum, state)) {
        const sector = state.currentTask.getSector('error');
        sector.setEnd(lineNum, 0);
      }

      if (state.isErrorBlock) {
        const sector = state.currentTask.getSector('error');
        sector.setEnd(lineNum + 1, 0);

        let match;

        match = this.spec.TRANSITION.exec(line);
        if (match) {
          const [,starter,value] = match
            ;

          sector.childStarter = starter;

          const type = 'error'
            , task = state.currentTask
            , values = task.getProperty(type)
            ;

          values.push(value);

          task.setProperty(type, values);

          return;
        }
      }

      block = this.block('isCompleteBlock', this.spec.COMPLETE_BLOCK);

      if (block.enter(line, lineNum, state)) {
        const sector = state.currentTask.getSector('complete');
        sector.setStart(lineNum, 0);
        sector.indent = ' '.repeat(state.isCompleteBlock - 1);
        return;
      }

      if (block.exit(line, lineNum, state)) {
        const sector = state.currentTask.getSector('complete');
        sector.setEnd(lineNum, 0);
      }

      if (state.isCompleteBlock) {
        const sector = state.currentTask.getSector('complete');
        sector.setEnd(lineNum + 1, 0);

        let match;

        match = this.spec.TRANSITION.exec(line);
        if (match) {
          const [,starter,value] = match
            ;

          sector.childStarter = starter;

          const type = 'complete'
            , task = state.currentTask
            , values = task.getProperty(type)
            ;

          values.push(value);

          task.setProperty(type, values);

          return;
        }
      }
    }

  }
}

module.exports = MistralDefinition;
