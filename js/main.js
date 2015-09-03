import _ from 'lodash';
import ace from 'brace';
import React from 'react';
import { Router } from 'director';
import st2client from 'st2client';

import api from './lib/api';
import Range from './lib/util/range';
import Palette from './lib/palette';
import Control from './lib/control';
import ControlGroup from './lib/controlgroup';
import Panel from './lib/panel';
import Meta from './lib/panels/meta';
import Model from './lib/model';
import Canvas from './lib/canvas';
import Graph from './lib/graph';
import settings from './lib/settings';

class Main extends React.Component {
  state = {
    source: settings.get('source'),
    panel: 'editor',
    action: {}
  }

  componentDidMount() {
    this.editor = this.initEditor();
    this.meta = this.refs.meta;
    this.palette = this.refs.palette;
    this.panel = this.refs.panel;

    this.initGraph();
    this.initCanvas();
    this.initModel();
    this.initPanel();

    this.initRouter();

    api.connect(this.state.source);
  }

  componentDidUpdate(props, state) {
    if (state.source !== this.state.source) {
      api.connect(this.state.source);
    }
  }

  initEditor() {
    const editor = ace.edit(this.refs.editor.getDOMNode());

    require('brace/mode/yaml');
    editor.getSession().setMode('ace/mode/yaml');

    editor.setTheme({
      cssClass: 'ace-st2'
    });

    editor.setHighlightActiveLine(false);
    editor.$blockScrolling = Infinity;

    editor.session.setTabSize(2);

    return editor;
  }

  initRouter() {
    const routes = {
      '/action/:ref': (ref) => {
        this.load(ref);
      }
    };

    const router = Router(routes);

    router.init();
  }

  initPanel() {
    const editor = this.editor;

    editor.on('change', (delta) => {
      let str = this.editor.env.document.doc.getAllLines();

      this.model.update(delta, str.join('\n'));
    });

    editor.selection.on('changeCursor', () => {
      let { row, column } = this.editor.selection.getCursor()
        , range = new Range(row, column, row, column)
        , sectors = this.model.search(range, ['task'])
        , sector = _.first(sectors)
        ;

      if (sector && sector.task) {
        this.graph.select(sector.task.getProperty('name'));
      }
    });
  }

  initModel() {
    this.model = new Model();

    this.model.on('parse', (tasks) => {
      this.graph.build(tasks);
      this.canvas.render(this.graph);

      const nodes = this.graph.nodes();
      if (!_.isEmpty(nodes)) {
        const hasCoords = (name) => {
          const { x, y } = this.graph.node(name);

          return x !== undefined && y !== undefined;
        };

        if (!_.any(nodes, hasCoords)) {
          this.graph.layout();
        }
      }

      this.showTask(this.graph.__selected__);
    });
  }

  initCanvas() {
    this.canvas = new Canvas();

    this.canvas.on('select', (name, event) => {
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
      this.move(target, x, y);

      this.canvas.reposition();
    });

    this.canvas.on('create', (action, x, y) => this.create(action, x, y));

    this.canvas.on('rename', (target, name) => this.rename(target, name));

    this.canvas.on('delete', (name) => this.delete(name));

    this.canvas.on('link', (source, destination, type) => {
      if (type) {
        this.connect(source, destination, type);
      } else {
        this.disconnect(source, destination, type);
      }
    });

    this.canvas.on('disconnect', (edge) => this.disconnect(edge.v, edge.w));

    this.canvas.on('keydown', (event) => {
      const BACKSPACE = 8
          , DELETE = 46
          , Z = 90
          ;

      switch(event.key || event.keyCode) {
        case BACKSPACE:
        case DELETE:
          event.preventDefault();
          this.delete(this.graph.__selected__);
          break;
        case Z:
          if (!event.ctrlKey && !event.metaKey) {
            return;
          }
          if (event.shiftKey) {
            this.editor.redo();
          } else {
            this.editor.undo();
          }
      }
    });

    window.addEventListener('resize', () => {
      this.canvas.resizeCanvas();
    });
  }

  initGraph() {
    this.graph = new Graph();

    this.graph.on('select', (name) => this.showTask(name));
  }

  handleSourceChange(config) {
    settings.set('source', config).save();
    this.setState({source: config});
    this.refs.settingsButton.setValue(false);
  }

  render() {
    const props = {
      className: ''
    };

    if (this.state.loading) {
      props.className += 'main--loading';
    }

    return <main {...props} >
      <Palette ref="palette"
        source={this.state.source}
        onSourceChange={this.handleSourceChange.bind(this)}
        onToggle={this.resizeCanvas.bind(this)} />

      <div className="st2-container">

        <div className="st2-controls">
          <ControlGroup position='left'>
            <Control icon="right-open" activeIcon="left-open" type="toggle" initial={true}
              onClick={this.collapsePalette.bind(this)} />
          </ControlGroup>
          <ControlGroup position='center'>
            <Control icon="cog" type="toggle" initial={!this.state.source} ref="settingsButton"
              onClick={this.showSourceSettings.bind(this)} />
            <Control icon="undo" onClick={this.undo.bind(this)} />
            <Control icon="redo" onClick={this.redo.bind(this)} />
            <Control icon="layout" onClick={this.layout.bind(this)} />
            <Control icon="tools" type="toggle" ref="toolsButton"
              onClick={this.showMeta.bind(this)} />
            <Control icon="floppy" onClick={this.save.bind(this)} />
          </ControlGroup>
          <ControlGroup position='right'>
            <Control icon="left-open" activeIcon="right-open" type="toggle" initial={true}
              onClick={this.collapseEditor.bind(this)} />
          </ControlGroup>
        </div>

        <div className="st2-viewer">
          <svg className="st2-viewer__canvas">
          </svg>
        </div>

      </div>
      <Panel ref="panel" onToggle={this.resizeCanvas.bind(this)} >
        <div ref="editor" className="st2-panel__panel st2-panel__editor st2-editor"></div>
        <Meta ref="meta" hide={this.state.panel === 'meta'}
            meta={this.state.action}
            onSubmit={this.handleMetaSubmit.bind(this)}/>
      </Panel>
    </main>;
  }

  // Public methods

  showSourceSettings(state) {
    this.palette.toggleSettings(state);
  }

  undo() {
    this.editor.undo();
  }

  redo() {
    this.editor.redo();
  }

  layout() {
    this.graph.layout();

    this.embedCoords();

    this.canvas.reposition();
  }

  collapseEditor(state) {
    this.panel.toggleCollapse(state);
  }

  collapsePalette(state) {
    this.palette.toggleCollapse(state);
  }

  resizeCanvas(hide) {
    this.canvas.resizeCanvas();
    if (!hide) {
      this.editor.resize();
    }
  }

  showMeta(state) {
    if (state) {
      this.setState({ panel: 'meta' });
    } else {
      this.setState({ panel: 'editor' });
    }
  }

  handleMetaSubmit(action) {
    this.setState({ action });
    this.showMeta(false);
    this.refs.toolsButton.setValue(false);
  }

  load(ref) {
    const client = st2client(this.state.source);

    this.setState({ loading: true });

    return client.actions.get(ref)
      .then((action) => {
        if (action.runner_type !== 'mistral-v2') {
          throw Error(`Runner type ${action.runner_type} is not supported`);
        }

        this.setState({ action });

        return Promise.all([
          client.packFile.get(`${action.pack}/actions/${action.entry_point}`),
          client.packFile.get(`${action.pack}/actions/maps/${action.name}.map`)
            .catch(() => ({}))
        ]);
      })
      .then((files) => {
        const [workflow] = files;

        this.graph.reset();
        this.editor.setValue(workflow);
      })
      .then(() => {
        this.setState({ loading: false });
      })
      .catch((err)=> {
        console.error(err);
      });
  }

  save() {
    const result = _.assign({}, this.state.action, {
      data_files: [{
        file_path: this.state.action.entry_point,
        content: this.editor.env.document.doc.getAllLines().join('\n')
      }]
    });

    const client = st2client(this.state.source);

    return client.actions.edit(result)
      .then((res) => {
        console.log(res);
      })
      .catch((err)=> {
        console.error(err);
      });
  }

  connect(source, target, type='success') {
    let task = this.model.task(source);

    if (!task) {
      throw new Error('no such task:', source);
    }

    const transitions = task.getProperty(type) || [];

    transitions.push(target);

    this.setTransitions(source, transitions, type);
  }

  disconnect(source, destination, type=['success', 'error', 'complete']) {
    let task = this.model.task(source);

    if (!task) {
      throw new Error('no such task:', source);
    }

    _.each([].concat(type), (type) => {
      const transitions = task.getProperty(type) || [];

      _.remove(transitions, (transition) => transition === destination);

      this.setTransitions(source, transitions, type);
    });
  }

  setTransitions(source, transitions, type) {
    let task = this.model.task(source);

    if (!task) {
      throw new Error('no such task:', source);
    }

    const params = _.map(transitions, (name) => ({ name }));

    let block = this.model.fragments.transitions(task, params, type);

    if (task.getSector(type).isStart() || task.getSector(type).isEnd()) {
      const coord = task.getSector('task').end;
      task.getSector(type).setStart(coord);
      task.getSector(type).setEnd(coord);
    }

    // if file doesn't end with newline, add one to the new task
    const lastRow = this.editor.env.document.doc.getLength() - 1;
    if (task.getSector(type).compare(lastRow) < 0) {
      block = '\n' + block;
    }

    this.editor.env.document.replace(task.getSector(type), block);
  }

  rename(target, name) {
    let task = this.model.task(target);

    if (!task) {
      return;
    }

    if (!name || name === task.getProperty('name')) {
      return;
    }

    let sector = task.getSector('name');

    _.each(this.model.tasks, (t) => {
      const tName = t.getProperty('name');

      _.each(['success', 'error', 'complete'], (type) => {
        const transitions = t.getProperty(type)
            , index = transitions.indexOf(target)
            ;
        if (~index) { // eslint-disable-line no-bitwise
          transitions[index] = name;
          this.setTransitions(tName, transitions, type);
        }
      });
    });

    this.editor.env.document.replace(sector, name);
  }

  move(name, x, y) {
    const node = this.graph.node(name);

    if (!node) {
      return;
    }

    _.assign(node, { x, y });

    this.embedCoords();
  }

  create(action, x, y) {
    const indices = _.map(this.model.tasks, task => {
            const name = task.getProperty('name')
                , expr = /task(\d+)/
                , match = expr.exec(name)
                ;

            return _.parseInt(match && match[1]);
          })
        , index = _.max([0].concat(indices)) + 1
        , name = `task${index}`
        ;

    let task = this.model.fragments.task({
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
    })(this.model.taskBlock);

    // if file doesn't end with newline, add one to the new task
    const lastRow = this.editor.env.document.doc.getLength() - 1;
    if (!cursor.compare(lastRow) <= 0) {
      task = '\n' + task;
    }

    this.editor.env.document.replace(cursor, task);

    this.canvas.edit(name);
  }

  delete(name) {
    const task = this.model.task(name);

    if (!task) {
      throw new Error('no such task:', name);
    }

    this.editor.env.document.replace(task.getSector('task'), '');

    _.each(this.model.tasks, (t) => {
      const tName = t.getProperty('name');

      _.each(['success', 'error', 'complete'], (type) => {
        const transitions = t.getProperty(type) || []
            , index = transitions.indexOf(name)
            ;
        if (~index) { // eslint-disable-line no-bitwise
          transitions.splice(index, 1);
          this.setTransitions(tName, transitions, type);
        }
      });
    });

    this.canvas.focus();
  }

  showTask(name) {
    const task = this.model.task(name);

    if (!task) {
      return;
    }

    const sector = task.getSector('task');

    // Since we're using `fullLine` marker, remove the last (zero character long) line from range
    let range = new Range(sector.start.row, sector.start.column, sector.end.row - 1, Infinity);

    if (this.selectMarker) {
      this.editor.session.removeMarker(this.selectMarker);
    }

    this.selectMarker = this.editor.session.addMarker(range, 'st2-editor__active-task', 'fullLine');
    this.editor.renderer.scrollSelectionIntoView(range.start, range.end, 0.5);

    this.canvas.show(name);
  }

  embedCoords() {
    _.each(this.graph.nodes(), name => {
      const { x, y } = this.graph.node(name);

      const task = this.model.task(name);

      const sector = task.getSector('coord')
          , fragment = this.model.fragments.coord(task, x, y)
          ;

      this.editor.env.document.replace(sector, fragment);
    });
  }

  // Debug helpers

  debugSectors() {
    let debugSectorMarkers = [];

    this.model.on('parse', () => {
      {
        _.each(debugSectorMarkers, (marker) => {
          this.editor.session.removeMarker(marker);
        });
        debugSectorMarkers = [];
      }

      {
        this.model.sectors.map((e) =>
          console.log(''+e, e.type)
        );

        console.log('---');
      }

      _.each(this.model.sectors, (sector) => {
          let range, marker;

          range = new Range(sector.start.row, sector.start.column, sector.end.row, sector.end.column);
          marker = this.editor.session.addMarker(range, `st2-editor__active-${sector.type}`, 'text');
          debugSectorMarkers.push(marker);
        });
    });
  }

  debugSearch() {
    this.editor.selection.on('changeSelection', (e, selection) => {
      let sectors = this.model.search(selection.getRange())
        , types = _.groupBy(sectors, 'type');
      console.log('->', `Selected ${types.task ? types.task.length : 'no'} tasks, ` +
                        `${types.name ? types.name.length : 'no'} names, ` +
                        `${types.success ? types.success.length : 'no'} success transitions ` +
                        `and ${types.error ? types.error.length : 'no'} error transitions`);
    });
  }

  debugUpdate() {
    this.model.on('update', (sectors) => {
      let types = _.groupBy(sectors, 'type');
      console.log('->', `Updates ${types.task ? types.task.length : 'no'} tasks, ` +
                        `${types.name ? types.name.length : 'no'} names, ` +
                        `${types.success ? types.success.length : 'no'} success transitions ` +
                        `and ${types.error ? types.error.length : 'no'} error transitions`);
    });
  }

  debugTaskBlock() {
    let taskBlockMarker;

    this.model.on('parse', () => {
      let range = this.model.taskBlock;

      if (taskBlockMarker) {
        this.editor.session.removeMarker(taskBlockMarker);
      }

      taskBlockMarker = this.editor.session.addMarker(range, 'st2-editor__active-task', 'fullLine');
    });
  }
}

window.st2flow = React.render(<Main />, document.body);
