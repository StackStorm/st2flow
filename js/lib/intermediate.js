'use strict';

let _ = require('lodash')
  , Chain = require('./definitions/chain')
  , EventEmitter = require('events').EventEmitter
  , Sector = require('./sector')
  , Task = require('./task')
  ;

class Intermediate extends EventEmitter {
  constructor() {
    super();

    this.tasks = [];

    this.definition = new Chain(this);
  }

  get sectors() {
    return _(this.tasks)
      .map((task) => _.values(task.sectors))
      .flatten()
      .value();
  }

  get template() {
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

    if (pending) {
      if (!task) {
        task = new Task();
        this.tasks.push(task);
      }

      _.assign(task, pending);

      task.setProperty('name', name);
    }

    return task;
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

module.exports = Intermediate;
