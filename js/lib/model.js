import _ from 'lodash';
import { EventEmitter } from 'events';

import Definitions from './definitions';
import Graph from './graph';
import Messages from './models/messages';
import Range from './util/range';
import Sector from './models/sector';
import Task from './models/task';
import VirtualEditor from './virtualeditor';
import Workflow from './models/workflow';
import Workbook from './models/workbook';

export default class Model extends EventEmitter {
  constructor(action) {
    super();

    this.action = action;

    this.tasks = [];
    this.workflows = [];

    this.graph = new Graph();

    this.virtualEditor = new VirtualEditor(this);
    this.virtualEditor.on('change', (deltas) => {
      this.messages.clear();

      this.emit('change', deltas);
      this.parse(this.virtualEditor.getValue());
    });

    const type = action.runner_type || 'mistral-v2';
    this.definition = new Definitions[type](this);
    this.messages = new Messages();
  }

  get sectors() {
    return _(this.tasks)
      .map((task) => _(task.sectors).values().flatten().value())
      .flatten()
      .value();
  }

  setAction(value) {
    this.action = value;
  }

  fragments = {
    task: (params) => {
      let result = '';

      const defs = this.definition.defaults.indents;

      if (!this.workflowBlock || this.workflowBlock.isUndefined() && _.isEmpty(this.workflows)) {
        result += this.definition.template.block.wf_base()({
          name: this.action && this.action.ref || 'untitled'
        });
      }

      if (_.isEmpty(this.workflows)) {
        const workflow = {
          name: 'main',
          type: 'direct'
        };

        result += this.definition.template.block.wf_workflow(defs.workflow, defs.tasks)(workflow);

        const params = this.action.parameters;
        if (params) {
          const fields = _(params).chain()
            .keys()
            .reject((e) => {
              return _.includes(this.definition.runner_params, e);
            })
            .value();

          result += this.fragments.input(defs.tasks, defs.task + '- ', fields);
        }
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
    },
    coord: (task, x, y) => {
      let result = '';

      const templates = this.definition.template
          , blockTemplate = templates.block.coord(task.indent)
          , coordTemplate = templates.coord()
          ;

      result = coordTemplate({ x, y });

      if (task.getSector('coord').isEmpty()) {
        result = blockTemplate({ coord: result });
      }

      return result;
    },
    input: (indent, childStarter, inputs) => {
      let result = '';

      const defs = this.definition.defaults.indents;

      const templates = this.definition.template
          , blockTemplate = templates.block.input(indent || defs.tasks)
          , transitionTemplate = templates.transition(childStarter)
          ;

      if (inputs && inputs.length) {
        result += blockTemplate();
      }

      _.each(inputs, (name) => {
        result += transitionTemplate({ value: { name } });
      });

      return result;
    },
    name: (name) => {
      let result = '';

      result += this.definition.template.block.wb_name()({
        name
      });

      return result;
    }
  }

  parse(code) {
    let lines = code.split('\n');

    let state = {
      workbook: new Workbook(),
      isTaskBlock: false,
      taskBlockIdent: null,
      currentTask: null,
      touched: [],
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
    this.workbook = state.workbook;

    // Delete all the tasks not updated during parsing
    _.each(state.untouchedTasks, (name) => {
      _.remove(this.tasks, (task) => task.getProperty('name') === name);
    });

    this.graph.build(this.tasks);

    this.emit('parse', this.tasks);
  }

  update(delta) {
    const { prevSector, nextValue } = delta;

    const change = this.virtualEditor.replace(prevSector, nextValue);

    console.log(delta, change);

    // this.emit('update', this.search(delta));
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
      if (type && !_.includes(type, sector.type)) {
        return false;
      }
      if (sector.isStart() && sector.isEnd()) {
        return false;
      }
      return sector.intersects(range);
    });
  }

  // Selected node
  select(name) {
    this.__selected__ = name;
    this.emit('select', name);
  }

  get selected() {
    return this.__selected__;
  }

  isSelected(name) {
    return this.__selected__ === name;
  }

  // Graph related methods
  nodes() {
    return this.graph.nodes();
  }

  node(name) {
    return this.graph.node(name);
  }

  layout() {
    this.graph.layout();
    this.virtualEditor.embedCoords();
  }

  reset() {
    return this.graph.reset();
  }

  // Graph manipulation methods
  //
  // The proper data flow would be for model to be the one defining what editor
  // and canvas shows. Sadly, in our case, it would require us to build proper
  // AST parser for YAML to be able to store all the information editor contains
  // outside the basic workflow structure (such as indentation, comments, code
  // style conventions). Essentially, an ideal model should contain enough
  // information to allow us to build the exact copy of the code user put in an
  // editor (even if it's not a valid yaml document to begin with), while at the
  // same time, make the data structural enough to be able to traverse and
  // modify the document like if it was parsed by a regular yaml parser.

  getValue() {
    return this.virtualEditor.getValue();
  }

  setValue(str) {
    return this.virtualEditor.setValue(str);
  }

  setTransitions(source, transitions, type) {
    let task = this.task(source);

    if (!task) {
      throw new Error('no such task:', source);
    }

    if (!this.tasks.some(v => v.properties.coord)) {
      this.virtualEditor.embedCoords();
    }

    const params = _.map(transitions, (value) => ({ value }));

    let block = this.fragments.transitions(task, params, type);

    if (task.getSector(type).isStart() || task.getSector(type).isEnd()) {
      const coord = task.getSector('task').end;
      task.getSector(type).setStart(coord);
      task.getSector(type).setEnd(coord);
    }

    this.virtualEditor.replace(task.getSector(type), block);
  }

  create(action, x, y) {
    this.virtualEditor.embedCoords();

    const indices = _.map(this.tasks, task => {
            const name = task.getProperty('name')
                , expr = /task(\d+)/
                , match = expr.exec(name)
                ;

            return _.parseInt(match && match[1]);
          })
        , index = _.max([0].concat(indices)) + 1
        , name = `task${index}`
        ;

    let task = this.fragments.task({
      name: name,
      ref: action.ref,
      x: x,
      y: y
    });

    const cursor = ((block) => {
      if (block && !block.isEnd()) {
        const range = new Range();
        range.setStart(block.end);
        range.setEnd(block.end);
        return range;
      } else {
        return new Range(0, 0, 0, 0);
      }
    })(this.taskBlock);

    return new Promise(resolve => {
      this.once('parse', () => resolve(name));
      this.virtualEditor.replace(cursor, task);
    });
  }

  delete(name) {
    const task = this.task(name);

    if (!task) {
      throw new Error('no such task:', name);
    }

    this.virtualEditor.replace(task.getSector('task'), '');

    _.each(this.tasks, (t) => {
      const tName = t.getProperty('name');

      _.each(['success', 'error', 'complete'], (type) => {
        const transitions = _.clone(t.getProperty(type) || [])
          ;

        _.remove(transitions, { name });

        this.setTransitions(tName, transitions, type);
      });
    });
  }

  rename(target, name) {
    this.virtualEditor.embedCoords();

    let task = this.task(target);

    if (!task) {
      return;
    }

    const oldName = task.getProperty('name');

    if (!name || name === oldName) {
      return;
    }

    let sector = task.getSector('name');

    _.each(this.tasks, (t) => {
      const tName = t.getProperty('name');

      _.each(['success', 'error', 'complete'], (type) => {
        const transitions = _.map(t.getProperty(type), (transition) => {
            if (transition.name === target) {
              transition.name = name;
            }
            return transition;
          })
          ;

        this.setTransitions(tName, transitions, type);
      });
    });

    _.each(this.sectors, (sector) => {
      if (sector.type === 'yaql' && sector.value === oldName) {
        this.virtualEditor.replace(sector, name);
      }
    });

    this.virtualEditor.replace(sector, name);
  }

  move(name, x, y) {
    const node = this.node(name);

    if (!node) {
      return;
    }

    _.assign(node, { x, y });

    this.virtualEditor.embedCoords();
  }

  connect(source, target, type='success') {
    let task = this.task(source);

    if (!task) {
      throw new Error('no such task:', source);
    }

    const transitions = task.getProperty(type) || [];

    transitions.push({ name: target });

    this.setTransitions(source, transitions, type);
  }

  disconnect(source, destination, type=['success', 'error', 'complete']) {
    let task = this.task(source);

    if (!task) {
      throw new Error('no such task:', source);
    }

    _.each([].concat(type), (type) => {
      const transitions = task.getProperty(type) || [];

      _.remove(transitions, (transition) => transition.name === destination);

      this.setTransitions(source, transitions, type);
    });
  }

  undo() {
    this.virtualEditor.undo();
  }

  redo() {
    this.virtualEditor.redo();
  }

  setName(name) {
    if (!this.workbook) {
      return;
    }

    const sector = this.workbook.getSector('name');
    let line = name;

    if (sector.isEmpty()) {
      line = this.fragments.name(name);
    }

    this.virtualEditor.replace(sector, line);
  }

  setInput(fields) {
    const workflow = this.workflow('main');

    if (!workflow) {
      return;
    }

    const indent = workflow.getSector('taskBlock').indent
        , childStarter = workflow.getSector('taskBlock').childStarter + '- '
        ;

    const inputs = this.fragments.input(indent, childStarter, fields);

    this.virtualEditor.replace(workflow.getSector('input'), inputs);
  }
}
