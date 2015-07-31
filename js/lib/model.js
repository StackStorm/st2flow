import _ from 'lodash';
import { EventEmitter } from 'events';

import Chain from './definitions/chain';
import Mistral from './definitions/mistral';
import Sector from './models/sector';
import Task from './models/task';
import Workflow from './models/workflow';

export default class Model extends EventEmitter {
  constructor() {
    super();

    this.tasks = [];
    this.workflows = [];

    this.definition = new Mistral(this);
  }

  get sectors() {
    return _(this.tasks)
      .map((task) => _(task.sectors).values().flatten().value())
      .flatten()
      .value();
  }

  get template() {
    const defs = this.definition.defaults.indents;

    return {
      task: (() => {
        const specimen = _(this.tasks)
                .groupBy(task => task.starter)
                .transform((acc, value, key) => acc.push({key, value}), [])
                .max('value.length')
            , starter = specimen.key || defs.task //'  - '
            , indent = specimen.value && specimen.value[0].indent || defs.property // '    '
            ;

        return this.definition.template.task(starter, indent);
      })(),
      block: {
        base: this.definition.template.block.base(defs.base),
        workflow: this.definition.template.block.workflow(defs.workflow, defs.tasks),
        tasks: this.definition.template.block.tasks(defs.tasks)
      }
    };
  }

  get taskTemplate() {
    const specimen = _(this.tasks)
            .groupBy(task => task.starter)
            .transform((acc, value, key) => acc.push({key, value}), [])
            .max('value.length')
        , starter = specimen.key || '  - '
        , indent = specimen.value && specimen.value[0].indent || '    '
        ;

    return this.definition.template.task(starter, indent);
  }

  get taskBlockTemplate() {
    return this.definition.template.taskBlock();
  }

  keyTemplate(task) {
    return this.definition.template.keyValue(task.indent);
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

    state.taskBlock.setStart(lines.length, 0);
    state.taskBlock.setEnd(lines.length, 0);

    state = _.transform(lines, this.definition.parseLine, state, this.definition);

    // Close the sector of the last task
    if (state.currentTask) {
      state.currentTask.endSector('task', state.taskBlock.end);
    }

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
