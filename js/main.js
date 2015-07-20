'use strict';

const _ = require('lodash')
    , Range = require('./lib/range')
    ;

class State {
  constructor() {
    this.initGraph();
    this.initCanvas();
    this.initIntermediate();
    this.initEditor();
    this.initPalette();
    this.initControls();

    this.showSelectedTask();
  }

  initEditor() {
    const ace = require('brace');

    let editor = this.editor = ace.edit('editor');

    require('brace/mode/yaml');
    editor.getSession().setMode('ace/mode/yaml');

    require('brace/theme/monokai');
    editor.setTheme('ace/theme/monokai');

    editor.setHighlightActiveLine(false);
    editor.$blockScrolling = Infinity;

    editor.session.setTabSize(2);

    editor.on('change', (delta) => {
      let str = this.editor.env.document.doc.getAllLines();

      this.intermediate.update(delta, str.join('\n'));
    });
  }

  initIntermediate() {
    const Intermediate = require('./lib/intermediate');
    this.intermediate = new Intermediate();

    this.intermediate.on('parse', (tasks) => {
      this.graph.build(tasks);
      this.canvas.render(this.graph);
    });
  }

  initCanvas() {
    const Canvas = require('./lib/canvas');

    this.canvas = new Canvas();

    this.canvas.on('select', (name) => {
      const SHIFT = 1
          , ALT = 2
          , CTRL = 4
          , META = 8
          ;

      const mode =
        event.shiftKey * SHIFT +
        event.altKey * ALT +
        event.ctrlKey * CTRL +
        event.metaKey * META;

      switch(mode) {
        case SHIFT:
          this.connect(this.graph.__selected__, name, 'success');
          break;
        case ALT:
          this.connect(this.graph.__selected__, name, 'error');
          break;
        case SHIFT + ALT:
          this.connect(this.graph.__selected__, name, 'complete');
          break;
        case META:
          this.rename(name);
          break;
        default:
          this.graph.select(name);
      }
    });

    this.canvas.on('move', (target, x, y) => {
      this.graph.move(target, x, y);

      this.canvas.reposition();
    });

    this.canvas.on('link', (source, destination, type) => {
      if (type) {
        this.connect(source, destination, type);
      } else {
        this.disconnect(source, destination, type);
      }
    });

    this.canvas.on('create', (action, x, y) => {
      this.create(action, x, y);
    });

    this.canvas.on('rename', (target, name) => {
      this.rename(target, name);
    });

    this.canvas.on('delete', (name) => {
      this.delete(name);
    });

    this.canvas.on('disconnect', (edge) => {
      this.disconnect(edge.v, edge.w);
    });

    this.canvas.on('keydown', (event) => {
      const BACKSPACE = 8
          , DELETE = 46
          ;

      switch(event.key || event.keyCode) {
        case BACKSPACE:
        case DELETE:
          event.preventDefault();
          this.delete(this.graph.__selected__);
          break;
      }
    });

    window.addEventListener('resize', () => {
      this.canvas.resizeCanvas();
    });
  }

  initGraph() {
    const Graph = require('./lib/graph');
    this.graph = new Graph();
  }

  initPalette() {
    const Palette = require('./lib/palette');
    this.pallette = new Palette();
  }

  initControls() {
    const d3 = require('d3')
        , bem = require('./lib/bem')
        ;

    const st2Class = bem('controls')
        , st2Icon = bem('icon')
        ;

    const element = d3
      .select(st2Class(null, true))
      ;

    const controls = [{
      name: 'undo',
      action: () => {
        this.editor.undo();
      }
    }, {
      name: 'redo',
      action: () => {
        this.editor.redo();
      }
    }, {
      name: 'layout',
      action: () => {
        this.graph.layout();
        this.canvas.reposition();
      }
    }];

    const buttons = element
      .selectAll(st2Class('button'), true)
      .data(controls, e => e.name)
      ;

    buttons.enter()
      .append('div')
      .attr('class', d => `${st2Class('button')} ${st2Icon(d.name)}`)
      .on('click', control => control.action())
      ;
  }

  connect(source, target, type='success') {
    let task = this.intermediate.task(source);

    if (!task) {
      throw new Error('no such task:', source);
    }

    const transitions = task.getProperty(type) || [];

    transitions.push(target);

    this.setTransitions(source, transitions, type);
  }

  disconnect(source, destination, type=['success', 'error', 'complete']) {
    let task = this.intermediate.task(source);

    _.each([].concat(type), (type) => {
      const transitions = task.getProperty(type) || [];

      _.remove(transitions, (transition) => transition === destination);

      this.setTransitions(source, transitions, type);
    });
  }

  setTransitions(source, transitions, type) {
    let task = this.intermediate.task(source);

    if (!task) {
      throw new Error('no such task:', source);
    }

    const templates = this.intermediate.definition.template
        , blockTemplate = templates.block[type](task.getSector(type).indent)
        , transitionTemplate = templates.transition(task.getSector(type).childStarter)
        ;

    let block = '';

    if (transitions.length) {
      block += _.reduce(transitions, (result, name) => {
        return result + transitionTemplate({ name });
      }, blockTemplate());
    }

    if (task.getSector(type).isStart() || task.getSector(type).isEnd()) {
      const coord = task.getSector('task').end;
      task.getSector(type).setStart(coord);
      task.getSector(type).setEnd(coord);
    }

    this.editor.env.document.replace(task.getSector(type), block);
  }

  rename(target, name) {
    let task = this.intermediate.task(target);

    if (!task) {
      throw new Error('no such task:', target);
    }

    if (!name || name === task.getProperty('name')) {
      return;
    }

    let sector = task.getSector('name');

    _.each(this.intermediate.tasks, (t) => {
      const tName = t.getProperty('name');

      _.each(['success', 'error', 'complete'], (type) => {
        const transitions = t.getProperty(type)
            , index = transitions.indexOf(target)
            ;
        if (~index) { // jshint ignore:line
          transitions[index] = name;
          this.setTransitions(tName, transitions, type);
        }
      });
    });

    this.graph.coordinates[name] = this.graph.coordinates[target];
    delete this.graph.coordinates[target];

    this.editor.env.document.replace(sector, name);
  }

  create(action, x, y) {
    const indices = _.map(this.intermediate.tasks, task => {
            const name = task.getProperty('name')
                , expr = /task(\d+)/
                , match = expr.exec(name)
                ;

            return _.parseInt(match && match[1]);
          })
        , index = _.max([0].concat(indices)) + 1
        , name = `task${index}`
        ;

    this.graph.coordinates[name] = { x, y };

    let task = this.intermediate.template.task({
      name: name,
      ref: action.ref
    });

    if (!this.intermediate.taskBlock) {
      const blocks = this.intermediate.template.block
          , type = {
              name: 'main',
              type: 'direct'
            }
          ;
      task = blocks.base() + blocks.workflow(type) + blocks.tasks() + task;
    }

    const cursor = ((block) => {
      if (block && !block.isEnd()) {
        const range = new Range();
        range.setStart(block.end);
        range.setEnd(block.end);
        return range;
      } else {
        return new Range(0, 0, 0, 0);
      }
    })(this.intermediate.taskBlock);

    this.editor.env.document.replace(cursor, task);
  }

  delete(name) {
    const task = this.intermediate.task(name);

    if (!task) {
      throw new Error('no such task:', name);
    }

    _.each(this.intermediate.tasks, (t) => {
      const tName = t.getProperty('name');

      _.each(['success', 'error', 'complete'], (type) => {
        const transitions = t.getProperty(type)
            , index = transitions.indexOf(name)
            ;
        if (~index) { // jshint ignore:line
          transitions.splice(index, 1);
          this.setTransitions(tName, transitions, type);
        }
      });
    });

    this.editor.env.document.replace(task.getSector('task'), '');
  }

  debugSectors() {
    let debugSectorMarkers = [];

    this.intermediate.on('parse', () => {
      {
        _.each(debugSectorMarkers, (marker) => {
          this.editor.session.removeMarker(marker);
        });
        debugSectorMarkers = [];
      }

      {
        this.intermediate.sectors.map((e) =>
          console.log(''+e, e.type)
        );

        console.log('---');
      }

      _.each(this.intermediate.sectors, (sector) => {
          let range, marker;

          range = new Range(sector.start.row, sector.start.column, sector.end.row, sector.end.column);
          marker = this.editor.session.addMarker(range, `st2-editor__active-${sector.type}`, 'text');
          debugSectorMarkers.push(marker);
        });
    });
  }

  showSelectedTask() {
    let selectMarker;

    this.graph.on('select', (taskName) => {
      const sector = this.intermediate.task(taskName).getSector('task');

      // Since we're using `fullLine` marker, remove the last (zero character long) line from range
      let range = new Range(sector.start.row, sector.start.column, sector.end.row - 1, Infinity);

      if (selectMarker) {
        this.editor.session.removeMarker(selectMarker);
      }

      selectMarker = this.editor.session.addMarker(range, 'st2-editor__active-task', 'fullLine');
    });

    this.editor.selection.on('changeCursor', () => {
      let { row, column } = this.editor.selection.getCursor()
        , range = new Range(row, column, row, column)
        , sectors = this.intermediate.search(range, ['task'])
        , sector = _.first(sectors)
        ;

      if (sector && sector.task) {
        this.graph.select(sector.task.getProperty('name'));
      }
    });
  }

  debugSearch() {
    this.editor.selection.on('changeSelection', (e, selection) => {
      let sectors = this.intermediate.search(selection.getRange())
        , types = _.groupBy(sectors, 'type');
      console.log('->', `Selected ${types.task ? types.task.length : 'no'} tasks, ` +
                        `${types.name ? types.name.length : 'no'} names, ` +
                        `${types.success ? types.success.length : 'no'} success transitions ` +
                        `and ${types.error ? types.error.length : 'no'} error transitions`);
    });
  }

  debugUpdate() {
    this.intermediate.on('update', (sectors) => {
      let types = _.groupBy(sectors, 'type');
      console.log('->', `Updates ${types.task ? types.task.length : 'no'} tasks, ` +
                        `${types.name ? types.name.length : 'no'} names, ` +
                        `${types.success ? types.success.length : 'no'} success transitions ` +
                        `and ${types.error ? types.error.length : 'no'} error transitions`);
    });
  }

  debugTaskBlock() {
    let taskBlockMarker;

    this.intermediate.on('parse', () => {
      let range = this.intermediate.taskBlock;

      if (taskBlockMarker) {
        this.editor.session.removeMarker(taskBlockMarker);
      }

      taskBlockMarker = this.editor.session.addMarker(range, 'st2-editor__active-task', 'fullLine');
    });
  }
}

window.st2flow = new State();
