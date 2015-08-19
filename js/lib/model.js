import _ from 'lodash';
import { EventEmitter } from 'events';

import Definitions from './definitions';
import Sector from './models/sector';
import Task from './models/task';
import Workflow from './models/workflow';

export default class Model extends EventEmitter {
  constructor(type='mistral-v2') {
    super();

    this.tasks = [];
    this.workflows = [];

    this.definition = new Definitions[type](this);
  }

  get sectors() {
    return _(this.tasks)
      .map((task) => _(task.sectors).values().flatten().value())
      .flatten()
      .value();
  }

  fragments = {
    task: (params) => {
      let result = '';

      const defs = this.definition.defaults.indents;

      if (!this.workflowBlock || this.workflowBlock.isUndefined() && _.isEmpty(this.workflows)) {
        result += this.definition.template.block.base()();
      }

      if (_.isEmpty(this.workflows)) {
        const workflow = {
          name: 'main',
          type: 'direct'
        };

        result += this.definition.template.block.workflow(defs.workflow, defs.tasks)(workflow);
      }

      if (!this.taskBlock || this.taskBlock.isUndefined()) {
        result += this.definition.template.block.tasks(defs.tasks)();
      }

      const specimen = _(this.tasks)
        .groupBy(task => task.starter)
        .transform((acc, value, key) => acc.push({key, value}), [])
        .max('value.length')
        ;

      const starter = specimen.key || defs.task //'  - '
          , indent = specimen.value && specimen.value[0].indent || defs.property // '    '
          ;

      result += this.definition.template.task(starter, indent)(params);

      return result;
    },
    transitions: (task, transitions, type) => {
      let result = '';

      const templates = this.definition.template
          , blockTemplate = templates.block[type](task.getSector(type).indent)
          , transitionTemplate = templates.transition(task.getSector(type).childStarter)
          ;

      if (transitions.length) {
        result += blockTemplate();

        _.each(transitions, (params) => {
          result += transitionTemplate(params);
        });
      }

      return result;
    }
  }

  parse(code) {
    let lines = code.split('\n');

    let state = {
      isTaskBlock: false,
      taskBlockIdent: null,
      currentTask: null,
      untouchedTasks: _.map(this.tasks, (task) => task.getProperty('name'))
    };

    state.taskBlock = this.taskBlock || new Sector();

    state = _.transform(lines, this.definition.parseLine, state, this.definition);

    // Close the sector of the last task
    if (state.currentTask) {
      state.currentTask.endSector('task', state.taskBlock.end);
    }

    this.workflowBlock = state.workflowBlock;
    this.taskBlock = state.taskBlock;

    // Delete all the tasks not updated during parsing
    _.each(state.untouchedTasks, (name) => {
      _.remove(this.tasks, (task) => task.getProperty('name') === name);
    });

    this.emit('parse', this.tasks);
  }

  update(delta, str) {
    this.emit('update', this.search(delta.data.range));
    this.parse(str);
  }

  task(name, pending) {
    let task = _.find(this.tasks, (e) => e.getProperty('name') === name);

    if (!pending) {
      return task;
    }

    if (!task) {
      task = new Task();
      this.tasks.push(task);
    }

    if (pending) {
      _.assign(task, pending);
    }

    task.setProperty('name', name);

    return task;
  }

  workflow(name, pending) {
    let workflow = _.find(this.workflows, (e) => e.getProperty('name') === name);

    if (!pending) {
      return workflow;
    }

    if (!workflow) {
      workflow = new Workflow();
      this.workflows.push(workflow);
    }

    if (pending) {
      _.assign(workflow, pending);
    }

    workflow.setProperty('name', name);

    return workflow;
  }

  search(range, type) {
    if (type) {
      type = [].concat(type);
    }
    return _.filter(this.sectors, (sector) => {
      return (!type || _.includes(type, sector.type)) && sector.intersects(range);
    });
  }
}
