'use strict';

let _ = require('lodash')
  , EventEmitter = require('events').EventEmitter
  , Sector = require('./sector')
  , Task = require('./task')
  ;

class Intermediate extends EventEmitter {
  constructor() {
    super();

    this.tasks = [];
  }

  get sectors() {
    return _(this.tasks)
      .map((task) => _.values(task.sectors))
      .flatten()
      .value();
  }

  parse(code) {
    let lines = code.split('\n');

    let state = {
      isTaskBlock: false,
      taskBlockIdent: null,
      currentTask: null,
      untouchedTasks: _.map(this.tasks, (task) => task.getProperty('name'))
    };

    let spec = {
      WS_INDENT: /^(\s*)/,
      TASK_BLOCK: /^\s*chain:\s*$/,
      TASK: /^\s*-\s*/,
      TASK_NAME: /(.*name:\s+['"]*)([\w\s]+)/,
      TASK_SUCCESS_TRANSITION: /(.*on-success:\s+['"]*)([\w\s]+)/,
      TASK_ERROR_TRANSITION: /(.*on-failure:\s+['"]*)([\w\s]+)/
    };

    _.each(lines, (line, lineNum) => {

      let indent = line.match(spec.WS_INDENT)[0].length;

      // If it starts with `chain:`, that's a start of task block
      if (spec.TASK_BLOCK.test(line)) {
        state.isTaskBlock = true;
        state.taskBlockIdent = indent;
        return;
      }

      // If it has same or lesser indent, that's an end of task block
      if (state.isTaskBlock && state.taskBlockIdent >= indent) {
        state.isTaskBlock = false;
        return false;
      }

      if (state.isTaskBlock) {
        let match;

        // If it starts with `-`, that's a new task
        if (spec.TASK.test(line)) {
          if (state.currentTask) {
            state.currentTask.endSector('task', lineNum, 0);
          }

          let sector = new Sector(lineNum, 0).setType('task');
          state.currentTask = new Task().setSector('task', sector);
        }

        // If it has `name:`, that's task name
        match = spec.TASK_NAME.exec(line);
        if (match) {
          let [,_prefix,name] = match
            , coords = [lineNum, _prefix.length, lineNum, _prefix.length + name.length]
            ;

          let sector = new Sector(...coords).setType('name');
          state.currentTask.setSector('name', sector);

          state.currentTask = this.task(name, state.currentTask);
          state.currentTask.getSector('task').setTask(state.currentTask);
          _.remove(state.untouchedTasks, (e) => e === name);
        }

        // If it has `on-success:`, that's successfil transition pointer
        match = spec.TASK_SUCCESS_TRANSITION.exec(line);
        if (match) {
          let [,_prefix,success] = match
            , coords = [lineNum, _prefix.length, lineNum, _prefix.length + success.length]
            ;

          let sector = new Sector(...coords).setType('success');
          state.currentTask.setProperty('success', success).setSector('success', sector);
        }

        // If it has `on-failure:`, that's unsuccessfil transition pointer
        match = spec.TASK_ERROR_TRANSITION.exec(line);
        if (match) {
          let [,_prefix,error] = match
            , coords = [lineNum, _prefix.length, lineNum, _prefix.length + error.length]
            ;

          let sector = new Sector(...coords).setType('error');
          state.currentTask.setProperty('error', error).setSector('error', sector);
        }

      }

    });

    // Close the sector of the last task
    if (state.currentTask) {
      state.currentTask.endSector('task', lines.length, 0);
    }

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

    if (!task && pending) {
      task = pending.setProperty('name', name);
      this.tasks.push(task);
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
