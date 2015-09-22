import _ from 'lodash';
import ace from 'brace';
import React from 'react';
import { Router } from 'director';
import URI from 'URIjs';

import 'brace/ext/language_tools';

import ACTIONS from './lib/util/default-actions';
import api from './lib/api';
import Range from './lib/util/range';
import Palette from './lib/palette';
import Control from './lib/control';
import ControlGroup from './lib/controlgroup';
import ExecutionControl from './lib/executioncontrol';
import Panel from './lib/panel';
import Meta from './lib/panels/meta';
import Run from './lib/panels/run';
import Model from './lib/model';
import Canvas from './lib/canvas';
import Graph from './lib/graph';
import settings from './lib/settings';

class Main extends React.Component {
  state = {
    sources: settings.get('sources'),
    source: settings.get('selected'),
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

    api.on('connect', (client) => {
      window.name = `st2flow+${client.index.url}`;

      this.setState({ error: undefined, actions: undefined, suggestions: undefined });

      return client.actionOverview.list()
        .then((actions) => {
          const keys = _.pluck(actions, 'ref')
              , values = _.map(actions, (action) => {
                  return _.map(action.parameters, (prop, name) => {
                    return _.assign({}, prop, {name});
                  });
                })
              , suggestions = _.zipObject(keys, values)
              ;
          this.setState({ actions, suggestions });
        })
        .catch((error) => this.setState({ error, actions: ACTIONS }))
        ;
    });
  }

  componentDidUpdate(props, state) {
    if (state.source !== this.state.source) {
      api.connect(this.state.source);
    }
  }

  initEditor() {
    const langTools = ace.acequire('ace/ext/language_tools');

    var paramCompleter = {
      getCompletions: (editor, session, pos, prefix, callback) => {
        const sector = this.model.search(Range.fromPoints(pos, pos), 'input')[0];

        if (!sector) {
          return;
        }

        const suggestions = this.state.suggestions || {}
            , action = sector.task.getProperty('ref');

        callback(null, _.map(suggestions[action], (parameter) => {
          return {
            name: parameter.name,
            value: parameter.name,
            score: 1,
            meta: 'parameters'
          };
        }));
      }
    };
    langTools.setCompleters([paramCompleter]);

    const editor = ace.edit(this.refs.editor.getDOMNode());

    require('brace/mode/yaml');
    editor.getSession().setMode('ace/mode/yaml');

    editor.setTheme({
      cssClass: 'ace-st2'
    });

    editor.setOptions({
      enableBasicAutocompletion: true,
      enableLiveAutocompletion: true
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
      },
      '/import/:bundle': {
        on: (bundle64) => {
          this.auth(bundle64).then(() => {
            router.setRoute('');
          });
        },
        '/:ref': {
          on: (bundle64, ref) => {
            this.auth(bundle64).then(() => {
              router.setRoute(`/action/${ref}`);
            });
          }
        }
      }
    };

    const router = Router(routes).configure({
      strict: false,
      notfound: () => this.state.source && api.connect(this.state.source)
    });

    router.init('/');
  }

  initPanel() {
    const editor = this.editor;

    editor.on('change', (delta) => {
      if (this._bulk) {
        return;
      }

      this.model.update(delta);
      this.parse();
    });

    editor.selection.on('changeCursor', () => {
      let { row, column } = this.editor.selection.getCursor()
        , range = new Range(row, column, row, column)
        , sectors = this.model.search(range, ['task'])
        , sector = _.first(sectors)
        ;

      if (!this._bulk && sector && sector.task) {
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
          this.canvas.reposition();
        }
      }

      this.showTask(this.graph.__selected__);
    });

    this.model.messages.on('change', _.debounce((messages) => {
      this.editor.session.setAnnotations(messages);
    }));
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
          const { row, column } = this.model.task(name).getSector('name').start;
          this.editor.selection.moveTo(row, column);
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
    const source = config;

    let sources = this.state.sources;

    if (!_.find(sources, (e) => e.api === source.api)) {
      sources = (sources || []).concat({
        api: source.api,
        auth: source.auth
      });
    }

    settings
      .set('selected', config)
      .set('sources', sources)
      .save();

    return new Promise((resolve) => {
      this.setState({ source, sources }, resolve);
      this.refs.settingsButton.setValue(false);
    });
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
        sources={this.state.sources}
        source={this.state.source}
        actions={this.state.actions}
        error={this.state.error}
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
            <Control icon="tools" onClick={this.showMeta.bind(this)} />
            <Control icon="floppy" onClick={this.save.bind(this)} />
            <ExecutionControl ref="executionControl"
              action={this.state.action}
              onClick={this.showRun.bind(this)} />
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
      </Panel>

      <Meta ref="metaPopup"
        meta={this.state.action}
        onSubmit={this.handleMetaSubmit.bind(this)}/>

      <Run ref="runPopup"
        action={this.state.action}
        onSubmit={this.run.bind(this)}/>
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

  showMeta() {
    this.refs.metaPopup.show();
  }

  showRun() {
    this.refs.runPopup.show();
  }

  handleMetaSubmit(action) {
    window.name = `st2flow+${api.client.index.url}+${action.ref}`;
    this.setState({ action });
    this.setState({ meta: false });
  }

  auth(bundle64) {
    let source;

    try {
      source = JSON.parse(atob(bundle64));
    } catch (e) {
      return new Promise((resolve, reject) => {
        reject(`Bundle is malformed: ${e}`);
      });
    }

    if (source.auth === true) {
      source.auth = new URI(source.api).port(9100).toString();
    }

    if (source.auth === false) {
      delete source.auth;
    }

    return this.handleSourceChange(source);
  }

  load(ref) {
    if (!this.state.source) {
      return;
    }

    this.setState({ loading: true });

    return api.connect(this.state.source).then((client) => {
      return client.actionOverview.get(ref).then((action) => {
        window.name = `st2flow+${client.index.url}+${ref}`;

        if (action.runner_type !== 'mistral-v2') {
          throw Error(`Runner type ${action.runner_type} is not supported`);
        }

        this.setState({ action });

        return client.packFile.get(`${action.pack}/actions/${action.entry_point}`);
      })
      .then((workflow) => {
        this.graph.reset();
        this.editor.setValue(workflow);
        this.canvas.reposition();
      })
      .then(() => {
        this.setState({ loading: false });
      })
      .catch((err)=> {
        console.error(err);
        this.setState({ loading: false });
      });
    });
  }

  save() {
    const result = _.assign({}, this.state.action, {
      data_files: [{
        file_path: this.state.action.entry_point,
        content: this.editor.env.document.doc.getAllLines().join('\n')
      }]
    });

    if (result.id) {
      return api.client.actions.edit(result)
        .catch((err)=> {
          console.error(err);
          throw err;
        });
    } else {
      return api.client.actions.create(result)
        .then((action) => {
          this.setState({ action });
        })
        .catch((err)=> {
          console.error(err);
          throw err;
        });
    }

  }

  run(action, parameters) {
    return this.save().then(() => {
      return api.client.executions.create({
        action: action.ref,
        parameters
      });
    }).catch((err) => {
      this.refs.executionControl.setStatus('failed');
      console.error(err);
    });
  }

  connect(source, target, type='success') {
    let task = this.model.task(source);

    if (!task) {
      throw new Error('no such task:', source);
    }

    const transitions = task.getProperty(type) || [];

    transitions.push({ name: target });

    this.setTransitions(source, transitions, type);
  }

  disconnect(source, destination, type=['success', 'error', 'complete']) {
    let task = this.model.task(source);

    if (!task) {
      throw new Error('no such task:', source);
    }

    _.each([].concat(type), (type) => {
      const transitions = task.getProperty(type) || [];

      _.remove(transitions, (transition) => transition.name === destination);

      this.setTransitions(source, transitions, type);
    });
  }

  setTransitions(source, transitions, type) {
    let task = this.model.task(source);

    if (!task) {
      throw new Error('no such task:', source);
    }

    this.embedCoords();

    const params = _.map(transitions, (value) => ({ value }));

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
    this.embedCoords();

    let task = this.model.task(target);

    if (!task) {
      return;
    }

    const oldName = task.getProperty('name');

    if (!name || name === oldName) {
      return;
    }

    let sector = task.getSector('name');

    _.each(this.model.tasks, (t) => {
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

    _.each(this.model.sectors, (sector) => {
      if (sector.type === 'yaql' && sector.value === oldName) {
        this.editor.env.document.replace(sector, name);
      }
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
    this.embedCoords();

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
        // const transitions = t.getProperty(type) || []
        //     , index = transitions.indexOf(name)
        //     ;
        // if (~index) { // eslint-disable-line no-bitwise
        //   transitions.splice(index, 1);
        //   this.setTransitions(tName, transitions, type);
        // }
        const transitions = _.clone(t.getProperty(type) || [])
          ;

        _.remove(transitions, { name });

        this.setTransitions(tName, transitions, type);
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

    const { row, column } = this.editor.selection.getCursor();

    if (!sector.compare(row, column)) {
      this.editor.renderer.scrollCursorIntoView({ row, column }, 0.5);
    } else {
      this.editor.renderer.scrollSelectionIntoView(sector.start, sector.end, 0.5);
    }

    this.selectMarker = this.editor.session.addMarker(range, 'st2-editor__active-task', 'fullLine');

    this.canvas.show(name);
  }

  embedCoords() {
    // FIX: Quick and dirty implementation for bulk updates missing in current
    // version of brace. We'll need a better solution sooner rather than later.
    this._bulk = true;
    let shift = 0;
    const nodes = this.graph.nodes();
    _(nodes)
      .map(name => {
        return this.model.task(name);
      })
      .sortBy(task => {
        return task.getSector('coord').start.row;
      })
      .each((task) => {
        const name = task.getProperty('name')
            , { x, y } = this.graph.node(name);

        const sector = task.getSector('coord')
            , fragment = this.model.fragments.coord(task, Math.round(x), Math.round(y))
            ;

        // Some replaces would create a new line, so each sector should be
        // shifted one more line below to preserve the intended position.
        sector.moveBy(shift, 0);

        if (sector.isEmpty()) {
          shift++;
        }

        this.editor.env.document.replace(sector, fragment);
      })
      .value();
    this._bulk = false;

    this.parse();
  }

  parse() {
    const str = this.editor.env.document.doc.getAllLines();

    this.model.parse(str.join('\n'));
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
