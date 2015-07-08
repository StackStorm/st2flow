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
      this.canvas.draw(this.graph);
    });
  }

  initCanvas() {
    const Canvas = require('./lib/canvas');

    this.canvas = new Canvas();

    this.canvas.on('node:select', (name) => {
      const SHIFT = 1
          , ALT = 2
          , CTRL = 4
          , META = 8
          ;

      let mode =
        event.shiftKey * SHIFT +
        event.altKey * ALT +
        event.ctrlKey * CTRL +
        event.metaKey * META;

      switch(mode) {
        case SHIFT:
          this.connect(this.graph.__selected__, name, 'success');
          break;
        case SHIFT + ALT:
          this.connect(this.graph.__selected__, name, 'error');
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
      this.connect(source, destination, type);
    });

    this.canvas.on('create', (action, x, y) => {
      this.create(action, x, y);
    });

    this.canvas.on('rename', (target) => {
      this.rename(target);
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

    const st2Class = bem('controls');

    const buttonTmpl = (control) =>
    `
      ${control.name[0].toUpperCase()}
    `;

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
      .attr('class', st2Class('button'))
      .html(buttonTmpl)
      .on('click', control => control.action())
      ;
  }

  connect(source, target, type='success') {
    let task = this.intermediate.task(source);

    if (!task) {
      throw new Error('no such task:', source);
    }

    let sector = task.getSector(type);

    if (sector) {
      this.editor.env.document.replace(sector, target);
    } else {
      let keys = {
          success: 'on-success',
          error: 'on-failure'
        }
        , text = this.intermediate.keyTemplate(task)({
          key: keys[type],
          value: target
        })
        ;

      this.editor.env.document.doc.insertLines(task.getSector('task').end.row, text.split('\n'));
    }
  }

  rename(target) {
    let task = this.intermediate.task(target);

    if (!task) {
      throw new Error('no such task:', target);
    }

    let name = window.prompt('What would be a new name for the task?', target);

    let sectors = [task.getSector('name')];

    _.each(this.intermediate.tasks, (t) =>
      _.each(['success', 'error', 'complete'], (type) => {
        if (t.getProperty(type) === task.getProperty('name')) {
          sectors.push(t.getSector(type));
        }
      })
    );

    _.each(sectors, (sector) => this.editor.env.document.replace(sector, name));
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

    let task = this.intermediate.template({
      name: name,
      ref: action.ref
    });

    if (!this.intermediate.taskBlock) {
      task = this.intermediate.taskBlockTemplate + task;
    }

    const cursor = this.intermediate.taskBlock && this.intermediate.taskBlock.end.row || 0;

    this.editor.env.document.doc.insertLines(cursor, task.split('\n'));
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
          console.log(`[${e.start.row}, ${e.start.column}]->[${e.end.row}, ${e.end.column}]`)
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
      let sector = _.find(this.intermediate.sectors, (e) => {
        return e.type === 'task' && e.task.getProperty('name') === taskName;
      });

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
