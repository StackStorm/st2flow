import _ from 'lodash';
import React from 'react';
import ReactDOM from 'react-dom';
import { Router } from 'director';
import URI from 'URIjs';

import api from './lib/api';
import Range from './lib/util/range';
import Palette from './lib/palette';
import Control from './lib/control';
import ControlGroup from './lib/controlgroup';
import Editor from './lib/editor';
import ExecutionControl from './lib/executioncontrol';
import CatchControl from './lib/catchcontrol';
import Panel from './lib/panel';
import Meta from './lib/panels/meta';
import Run from './lib/panels/run';
import SourceForm from './lib/panels/sourceform';
import Login from './lib/panels/login';
import Model from './lib/model';
import Canvas from './lib/canvas';
import settings from './lib/settings';
import Guide from './lib/guide';

class Main extends React.Component {
  state = {
    sources: settings.get('sources'),
    source: settings.get('selected'),
    panel: 'editor',
    header: true,
    action: {}
  }

  constructor(...args) {
    super(...args);
    this.initModel();
  }

  componentDidMount() {
    this.editor = this.refs.editor;
    this.meta = this.refs.meta;
    this.palette = this.refs.palette;
    this.panel = this.refs.panel;
    this.settings = settings;

    this.initCanvas();

    this.initRouter();

    api.on('connect', (client) => {
      window.name = `st2flow+${client.index.url}`;

      this.setState({ error: undefined, actions: undefined });

      return client.actionOverview.list()
        .then((actions) => {
          this.editor.completions.input.update(actions);
          this.setState({ actions });
        })
        .catch((error) => this.setState({ error }))
        ;
    });
  }

  componentDidUpdate(props, state) {
    if (state.source !== this.state.source) {
      api.connect(this.state.source);
    }

    if (state.action !== this.state.action) {
      this.model.setAction(this.state.action);
    }
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

  initModel() {
    this.model = new Model(this.state.action);

    this.model.on('parse', () => {
      this.canvas.draw();

      this.editor.completions.task.update(this.model.definition.keywords);

      const nodes = this.model.nodes();
      if (!_.isEmpty(nodes)) {
        const hasCoords = (name) => {
          const { x, y } = this.model.node(name);

          return x !== undefined && y !== undefined;
        };

        if (!_.any(nodes, hasCoords)) {
          this.model.layout();
        }
      }

      this.showTask(this.model.selected);
    });

    this.model.messages.on('change', _.debounce((messages) => {
      this.editor.setAnnotations(messages);
    }));
  }

  initCanvas() {
    this.canvas = this.refs.canvas;

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
          this.connect(this.model.selected, name, 'success');
          break;
        case ALT:
          this.connect(this.model.selected, name, 'error');
          break;
        case SHIFT + ALT:
          this.connect(this.model.selected, name, 'complete');
          break;
        case META:
          this.rename(name);
          break;
        default:
          this.editor.setCursor(name);
      }
    });

    this.canvas.on('move', (target, x, y) => {
      this.move(target, x, y);
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
          this.delete(this.model.selected);
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
    });
  }

  render() {
    const props = {
      className: ''
    };

    if (this.state.loading) {
      props.className += 'main--loading';
    }

    if (!this.state.header) {
      props.className += 'main--collapsed';
    }

    const workflowButtonProps = {
      className: 'st2-header__workflow'
    };

    if (this.refs.metaPopup && this.refs.metaPopup.state.show) {
      workflowButtonProps.className += ' st2-header__workflow--active';
    }

    return <main {...props} >
      <div className="st2-header">
        <div className="st2-header__logo">
          <img src="i/logo-brocade.svg" width="101" height="25" />
        </div>
        <div className="st2-header__product-title">
          Workflow Designer
        </div>
        <div className="st2-header__separator" />
        <div {...workflowButtonProps} >
          Current: { this.state.action.ref || 'New workflow' }
        </div>
        <div className="st2-header__edit" onClick={this.showMeta.bind(this)}>
          <i className="icon-gear" />
        </div>
        <div className="st2-header__separator" />
        <div className="st2-header__section" onClick={this.showSourceForm.bind(this)} >
          <Login source={this.state.source} />
          <i className="icon-user" />
        </div>
        <SourceForm ref="sourceForm"
            sources={this.state.sources}
            defaultValue={this.state.source}
            onChange={this.handleSourceChange.bind(this)} />
        <div className="st2-header__section" onClick={() => this.refs.guide.show()} >
          <i className="icon-question" />
        </div>
      </div>
      <div className="main__collapse" onClick={ this.collapseHeader.bind(this) }>
        <i className={ this.state.header ? 'icon-chevron-up' : 'icon-chevron-down'} />
      </div>
      <div className="main__content">
        <Palette ref="palette"
          source={this.state.source}
          actions={this.state.actions}
          error={this.state.error} />

        <div className="st2-container">

          <div className="st2-controls">
            <ControlGroup position='left'>
              <Control icon="chevron_right" activeIcon="chevron_left" type="toggle" initial={true}
                onClick={this.collapsePalette.bind(this)} />
            </ControlGroup>
            <ControlGroup position='center'>
              <Control icon="redirect" onClick={this.undo.bind(this)} />
              <Control icon="redirect2" onClick={this.redo.bind(this)} />
              <Control icon="arrange" onClick={this.layout.bind(this)} />
              <CatchControl icon="save" onClick={this.save.bind(this)} />
              <ExecutionControl ref="executionControl"
                action={this.state.action}
                onClick={this.showRun.bind(this)} />
            </ControlGroup>
            <ControlGroup position='right'>
              <Control icon="chevron_left" activeIcon="chevron_right" type="toggle" initial={true}
                onClick={this.collapseEditor.bind(this)} />
            </ControlGroup>
          </div>

          <Canvas ref='canvas' model={this.model} />

          <Guide ref='guide' />

        </div>
        <Panel ref="panel">
          <Editor ref='editor' model={this.model} />
        </Panel>

        <Meta ref="metaPopup"
          meta={this.state.action}
          onUpdate={this.handleMetaUpdate.bind(this)}
          onSubmit={this.handleMetaSubmit.bind(this)}/>

        <Run ref="runPopup"
          action={this.state.action}
          onSubmit={this.run.bind(this)}/>
      </div>
    </main>;
  }

  // Public methods

  collapseHeader() {
    this.setState({ header: !this.state.header });
  }

  undo() {
    this.editor.undo();
  }

  redo() {
    this.editor.redo();
  }

  layout() {
    this.model.layout();

    this.editor.embedCoords();
  }

  collapseEditor(state) {
    this.panel.toggleCollapse(state);
  }

  collapsePalette(state) {
    this.palette.toggleCollapse(state);
  }

  showMeta() {
    this.refs.metaPopup.show();
  }

  showRun() {
    this.refs.runPopup.show();
  }

  showSourceForm() {
    this.refs.sourceForm.show();
  }

  handleMetaUpdate(...args) {
    const [,prevState,,state] = args;
    if (prevState.show !== state.show) {
      this.forceUpdate();
    }
  }

  handleMetaSubmit(action) {
    window.name = `st2flow+${api.client.index.url}+${action.ref}`;
    this.setState({ action });
    this.setState({ meta: false });

    this.setName(action.ref);

    const inputs = _(action.parameters).chain()
      .keys()
      .reject((e) => {
        return _.includes(this.model.definition.runner_params, e);
      })
      .value();

    this.setInput(inputs);
  }

  auth(bundle64) {
    let source;

    try {
      source = JSON.parse(window.atob(bundle64));
    } catch (e) {
      return new Promise((resolve, reject) => {
        reject(`Bundle is malformed: ${e}`);
      });
    }

    if (source.api === undefined) {
      source.api = 'https://' + window.location.hostname + ':443/api';
      source.auth = 'https://' + window.location.hostname + ':443/auth';
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
        this.model.reset();
        this.editor.setValue(workflow);
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
        content: this.editor.getValue()
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
      throw err;
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

    if (!this.model.tasks.some(v => v.properties.coord)) {
      this.editor.embedCoords();
    }

    const params = _.map(transitions, (value) => ({ value }));

    let block = this.model.fragments.transitions(task, params, type);

    if (task.getSector(type).isStart() || task.getSector(type).isEnd()) {
      const coord = task.getSector('task').end;
      task.getSector(type).setStart(coord);
      task.getSector(type).setEnd(coord);
    }

    // if file doesn't end with newline, add one to the new task
    const lastRow = this.editor.getLength() - 1;
    if (task.getSector(type).compare(lastRow) < 0) {
      block = '\n' + block;
    }

    this.editor.replace(task.getSector(type), block);
    //!! ^^ THIS PORTION SHOULD GET REFACTORED
  }

  rename(target, name) {
    this.editor.embedCoords();

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
        this.editor.replace(sector, name);
      }
    });

    this.editor.replace(sector, name);
  }

  move(name, x, y) {
    const node = this.model.node(name);

    if (!node) {
      return;
    }

    _.assign(node, { x, y });

    this.editor.embedCoords();
  }

  create(action, x, y) {
    this.editor.embedCoords();

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
    const lastRow = this.editor.getLength() - 1;
    if (!cursor.compare(lastRow) <= 0) {
      task = '\n' + task;
    }

    this.editor.replace(cursor, task)
      .then(() => this.canvas.edit(name));
  }

  delete(name) {
    const task = this.model.task(name);

    if (!task) {
      throw new Error('no such task:', name);
    }

    this.editor.replace(task.getSector('task'), '');

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

  setName(name) {
    if (!this.model.workbook) {
      return;
    }

    const sector = this.model.workbook.getSector('name');
    let line = name;

    if (sector.isEmpty()) {
      line = this.model.fragments.name(name);
    }

    this.editor.replace(sector, line);
  }

  setInput(fields) {
    const workflow = this.model.workflow('main');

    if (!workflow) {
      return;
    }

    const indent = workflow.getSector('taskBlock').indent
        , childStarter = workflow.getSector('taskBlock').childStarter + '- '
        ;

    const inputs = this.model.fragments.input(indent, childStarter, fields);

    this.editor.replace(workflow.getSector('input'), inputs);
  }

  showTask(name) {
    this.editor.showTask(name);

    this.canvas.show(name);
  }

  // Debug helpers

  debugSectors() {
    let debugSectorMarkers = [];

    this.model.on('parse', () => {
      {
        _.each(debugSectorMarkers, (marker) => {
          this.editor.removeMarker(marker);
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
          marker = this.editor.addMarker(range, `st2-editor__active-${sector.type}`, 'text');
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
        this.editor.removeMarker(taskBlockMarker);
      }

      taskBlockMarker = this.editor.addMarker(range, 'st2-editor__active-task', 'fullLine');
    });
  }
}

window.st2flow = ReactDOM.render(<Main />, document.querySelector('.container'));
