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

  get template() {
    const specimen = _(this.tasks)
            .groupBy(task => task.starter)
            .transform((acc, value, key) => acc.push({key, value}), [])
            .max('value.length')
        , starter = specimen.key || '  - '
        , indent = specimen.value && specimen.value[0].indent || '    '
        , indices = _.map(this.tasks, task => {
            const name = task.getProperty('name')
                , expr = /task(\d+)/
                , match = expr.exec(name)
                ;

            return _.parseInt(match && match[1]);
          })
        , index = _.max([0].concat(indices)) + 1
        ;

    return _.template([
      starter + `name: task${index}`,
      indent +  'ref: ${ref}'
    ].join('\n'));
  }

  get taskBlockTemplate() {
    return 'chain:\n';
  }

  keyTemplate(task) {
    return _.template(task.indent + '${key}: ${value}');
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
      EMPTY_LINE: /^(\W*)$/,
      TASK_BLOCK: /^\s*chain:\s*$/,
      TASK: /^(\s*-\s*)/,
      TASK_NAME: /(.*)(name:\s+['"]*)([\w\s]+)/,
      TASK_REF: /(.*)(ref:\s+['"]*)([\w\s.]+)/,
      TASK_SUCCESS_TRANSITION: /(.*)(on-success:\s+['"]*)([\w\s]+)/,
      TASK_ERROR_TRANSITION: /(.*)(on-failure:\s+['"]*)([\w\s]+)/
    };

    this.taskBlock = this.taskBlock || new Sector();

    this.taskBlock.setStart(lines.length, 0);
    this.taskBlock.setEnd(lines.length, 0);

    _.each(lines, (line, lineNum) => {

      let indent = line.match(spec.WS_INDENT)[0].length;

      // If it starts with `chain:`, that's a start of task block
      if (!state.isTaskBlock && spec.TASK_BLOCK.test(line)) {
        state.isTaskBlock = true;
        state.taskBlockIdent = indent;

        this.taskBlock.setStart(lineNum, 0);

        return;
      }

      // If it has same or lesser indent, that's an end of task block
      if (state.isTaskBlock && state.taskBlockIdent >= indent) {
        state.isTaskBlock = false;

        this.taskBlock.setEnd(lineNum, 0);

        return false;
      }

      if (state.isTaskBlock) {
        let match;

        // If it starts with `-`, that's a new task
        match = spec.TASK.exec(line);
        if (match) {
          let [,starter] = match;

          if (state.currentTask) {
            state.currentTask.endSector('task', lineNum, 0);
          }

          let sector = new Sector(lineNum, 0).setType('task');
          state.currentTask = new Task().setSector('task', sector);
          state.currentTask.starter = starter;
        }

        // If it has `name:`, that's task name
        match = spec.TASK_NAME.exec(line);
        if (match) {
          let [,_prefix,key,value] = match
            , coords = [lineNum, (_prefix+key).length, lineNum, (_prefix+key+value).length]
            ;

          if (state.currentTask.isEmpty()) {
            if (state.currentTask.starter === _prefix) {
              state.currentTask.indent = ' '.repeat(_prefix.length);
            } else {
              state.currentTask.starter += _prefix;
            }
          } else {
            state.currentTask.indent = _prefix;
          }

          let sector = new Sector(...coords).setType('name');
          state.currentTask.setSector('name', sector);

          state.currentTask = this.task(value, state.currentTask);
          state.currentTask.getSector('task').setTask(state.currentTask);
          _.remove(state.untouchedTasks, (e) => e === value);

          return;
        }

        // If it has `ref:`, that's action reference
        match = spec.TASK_REF.exec(line);
        if (match) {
          let [,_prefix,key,value] = match
            , coords = [lineNum, (_prefix+key).length, lineNum, (_prefix+key+value).length]
            ;

          if (state.currentTask.isEmpty()) {
            if (state.currentTask.starter === _prefix) {
              state.currentTask.indent = ' '.repeat(_prefix.length);
            } else {
              state.currentTask.starter += _prefix;
            }
          } else {
            state.currentTask.indent = _prefix;
          }

          let sector = new Sector(...coords).setType('ref');
          state.currentTask.setProperty('ref', value).setSector('ref', sector);

          return;
        }

        // If it has `on-success:`, that's successfil transition pointer
        match = spec.TASK_SUCCESS_TRANSITION.exec(line);
        if (match) {
          let [,_prefix,key,value] = match
            , coords = [lineNum, (_prefix+key).length, lineNum, (_prefix+key+value).length]
            ;

          if (state.currentTask.isEmpty()) {
            if (state.currentTask.starter === _prefix) {
              state.currentTask.indent = ' '.repeat(_prefix.length);
            } else {
              state.currentTask.starter += _prefix;
            }
          } else {
            state.currentTask.indent = _prefix;
          }

          let sector = new Sector(...coords).setType('success');
          state.currentTask.setProperty('success', value).setSector('success', sector);

          return;
        }

        // If it has `on-failure:`, that's unsuccessfil transition pointer
        match = spec.TASK_ERROR_TRANSITION.exec(line);
        if (match) {
          let [,_prefix,key,value] = match
            , coords = [lineNum, (_prefix+key).length, lineNum, (_prefix+key+value).length]
            ;

          if (state.currentTask.isEmpty()) {
            if (state.currentTask.starter === _prefix) {
              state.currentTask.indent = ' '.repeat(_prefix.length);
            } else {
              state.currentTask.starter += _prefix;
            }
          } else {
            state.currentTask.indent = _prefix;
          }

          let sector = new Sector(...coords).setType('error');
          state.currentTask.setProperty('error', value).setSector('error', sector);

          return;
        }

        if (state.currentTask && state.currentTask.isEmpty() && spec.EMPTY_LINE.test(line)) {
          state.currentTask.starter += '\n';
        }

      }

    });

    // Close the sector of the last task
    if (state.currentTask) {
      state.currentTask.endSector('task', this.taskBlock.end);
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
