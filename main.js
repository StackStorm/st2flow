import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { PropTypes } from 'prop-types';

import Header from '@stackstorm/st2flow-header';
import Palette from '@stackstorm/st2flow-palette';
import Canvas from '@stackstorm/st2flow-canvas';
import Details from '@stackstorm/st2flow-details';

import api from '@stackstorm/module-api';
import { connect, register, subscribe, get } from '@stackstorm/st2flow-model/connect';
import { layout } from '@stackstorm/st2flow-model/layout';
import { models, OrquestaModel } from '@stackstorm/st2flow-model';
import MetaModel from '@stackstorm/st2flow-model/model-meta';
import EventEmitter from '@stackstorm/st2flow-model/event-emitter';

import CollapseButton from '@stackstorm/st2flow-canvas/collapse-button';
import Toolbar from '@stackstorm/st2flow-canvas/toolbar';

import { Router } from '@stackstorm/module-router';
import store from '@stackstorm/module-store';

import style from './style.css';

@connect(({ model, metaModel, collapseModel, actionsModel }) => ({ model, metaModel, collapseModel, actionsModel }))
class Window extends Component<{
  model: Object,
  metaModel: Object,
  collapseModel: Object,
  actionsModel: Object,
}> {
  static propTypes = {
    model: PropTypes.object,
    metaModel: PropTypes.object,
    collapseModel: PropTypes.object,
    actionsModel: PropTypes.object,
  }

  async componentDidMount() {
    this.props.actionsModel.fetch();
  }

  save() {
    const { model, metaModel, actionsModel } = this.props;
    const meta = metaModel.tokenSet.toObject();

    const existingAction = actionsModel.actions.find(e => e.name === meta.name && e.pack === meta.pack);

    meta.data_files = [{
      file_path: meta.entry_point,
      content: model.toYAML(),
    }, {
      file_path: existingAction && existingAction.metadata_file && existingAction.metadata_file.replace(/^actions\//, '') || `${meta.name}.meta.yaml`,
      content: metaModel.toYAML(),
    }];
    
    if (existingAction) {
      return api.request({ method: 'put', path: `/actions/${meta.pack}.${meta.name}` }, meta);
    }
    else {
      return api.request({ method: 'post', path: '/actions' }, meta);
    }
  }

  style = style

  render() {
    const { model, collapseModel, actionsModel } = this.props;
    const { actions } = actionsModel;

    return (
      <div className="component">
        <div className="component-row-header">
          { !collapseModel.isCollapsed('header') && <Header className="header" /> }
          <CollapseButton position="top" state={collapseModel.isCollapsed('header')} onClick={() => collapseModel.toggle('header')} />
        </div>
        <div className="component-row-content">
          { !collapseModel.isCollapsed('palette') && <Palette className="palette" actions={actions} /> }
          <Canvas className="canvas">
            <Toolbar>
              <div key="undo" icon="icon-redirect" onClick={() => model.undo()} />
              <div key="redo" icon="icon-redirect2" onClick={() => model.redo()} />
              <div key="rearrange" icon="icon-arrange" onClick={() => layout(model)} />
              <div key="save" icon="icon-save" onClick={() => this.save()} />
              <div key="run" icon="icon-play" onClick={() => console.log('run')} />
            </Toolbar>
          </Canvas>
          { !collapseModel.isCollapsed('details') && <Details className="details" actions={actions} /> }
        </div>
      </div>
    );
  }
}

const tmpYAML = `---
version: 1.0

description: >
  A sample workflow that demonstrates how to use conditions
  to determine which path in the workflow to take.

input:
  - which

tasks:
  # [100, 200]
  t1:
    action: core.local
    input:
      cmd: printf <% $.which %>
    next:
      - when: <% succeeded() and result().stdout = 'a' %>
        publish: path=<% result().stdout %>
        do:
          - a
          - b
      - when: <% succeeded() and result().stdout = 'b' %>
        publish: path=<% result().stdout %>
        do: b
      - when: <% succeeded() and not result().stdout in list(a, b) %>
        publish: path=<% result().stdout %>
        do: c
  # [200, 300]
  a:
    action: core.local cmd="echo 'Took path A.'"
  # [10, 300]
  b:
    action: core.local cmd="echo 'Took path B.'"
    next:
      - do: 'foobar'
  # [100, 500]
  c:
    action: core.local cmd="echo 'Took path C.'"
  # [300, 400]
  foobar:
    action: core.local
`;

register('model', new OrquestaModel(tmpYAML));

const tmpMeta = `---
description: Build node automation workflow.
enabled: true
entry_point: workflows/build-controller.yaml
name: build-controller
pack: st2cicd
runner_type: orquesta
parameters:
  # build_num:
  #   required: true
  #   type: integer
  working_branch:
    required: false
    type: string
    default: NOMERGE/build-node
  st2_password:
    required: false
    type: string
    secret: true
    default: "{{st2kv.system.st2_password}}"
  keep_previous:
    type: boolean
    default: false
`;

register('metaModel', new MetaModel(tmpMeta));

subscribe('metaModel', m => {
  const model = get('model');

  if (model.constructor.runner_types.indexOf(m.runner_type) === -1) {
    const NewModel = models[m.runner_type];

    if (NewModel) {
      register('model', new NewModel(model.toYAML()));
    }
  }

});

class CollapseModel {
  emitter = new EventEmitter();
  panels = {};

  on(eventName, fn) {
    return this.emitter.on(eventName, fn);
  }

  removeListener(eventName, fn) {
    return this.emitter.removeListener(eventName, fn);
  }

  toggle(name) {
    this.panels[name] = !this.panels[name];
    this.emitter.emit('change');
  }

  isCollapsed(name) {
    return this.panels[name];
  }
}

register('collapseModel', new CollapseModel());

class NavigationModel {
  emitter = new EventEmitter();
  current = {};

  on(eventName, fn) {
    return this.emitter.on(eventName, fn);
  }

  removeListener(eventName, fn) {
    return this.emitter.removeListener(eventName, fn);
  }

  change(newState) {
    this.current = { ...this.current, ...newState };
    this.emitter.emit('change');
  }
}

register('navigationModel', new NavigationModel());

class ActionsModel {
  emitter = new EventEmitter();
  actions = [];
  
  on(eventName, fn) {
    return this.emitter.on(eventName, fn);
  }

  removeListener(eventName, fn) {
    return this.emitter.removeListener(eventName, fn);
  }

  async fetch() {
    try {
      this.actions = await api.request({ path: '/actions/views/overview' });
      this.emitter.emit('change');
    }
    catch (e) {
      const res = await fetch('/actions.json');
      this.actions = await res.json();
      this.emitter.emit('change');
    }
  }
}

register('actionsModel', new ActionsModel());

const routes = [{
  url: '/',
  Component: Window,
}];

ReactDOM.render(<Provider store={store}><Router routes={routes} /></Provider>, document.querySelector('#container'));
