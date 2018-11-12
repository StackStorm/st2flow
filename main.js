import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { PropTypes } from 'prop-types';

import Header from '@stackstorm/st2flow-header';
import Palette from '@stackstorm/st2flow-palette';
import Canvas from '@stackstorm/st2flow-canvas';
import Details from '@stackstorm/st2flow-details';

import { connect, register } from '@stackstorm/st2flow-model/connect';
import OrquestaModel from '@stackstorm/st2flow-model/model-orquesta';
import MetaModel from '@stackstorm/st2flow-model/model-meta';
import EventEmitter from '@stackstorm/st2flow-model/event-emitter';

import CollapseButton from '@stackstorm/st2flow-canvas/collapse-button';

import { Router } from '@stackstorm/module-router';
import store from '@stackstorm/module-store';

import style from './style.css';

window.st2constants = window.st2constants || {};
window.st2constants.st2Config = {
  hosts: [{
    api: 'https://localhost/api',
    auth: 'https://localhost/auth',
    stream: 'https://localhost/stream',
  }],
};

@connect(({ collapseModel }) => ({ collapseModel }))
class Window extends Component<{
  collapseModel: Object,
}> {
  static propTypes = {
    collapseModel: PropTypes.object,
  }
  state = {
    actions: [],
  }

  async componentDidMount() {
    const res = await fetch('/actions.json');

    this.setState({ actions: await res.json() });
  }

  style = style

  render() {
    const { collapseModel } = this.props;
    const { actions } = this.state;

    return (
      <div className="component">
        <div className="component-row-header">
          { !collapseModel.isCollapsed('header') && <Header className="header" /> }
          <CollapseButton position="top" state={collapseModel.isCollapsed('header')} onClick={() => collapseModel.toggle('header')} />
        </div>
        <div className="component-row-content">
          { !collapseModel.isCollapsed('palette') && <Palette className="palette" actions={actions} /> }
          <Canvas className="canvas" />
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
type: foo
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

const routes = [{
  url: '/',
  Component: Window,
}];

ReactDOM.render(<Provider store={store}><Router routes={routes} /></Provider>, document.querySelector('#container'));
