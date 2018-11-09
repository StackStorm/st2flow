import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';

import Header from '@stackstorm/st2flow-header';
import Palette from '@stackstorm/st2flow-palette';
import Canvas from '@stackstorm/st2flow-canvas';
import Details from '@stackstorm/st2flow-details';

import { register } from '@stackstorm/st2flow-model/connect';
import OrquestaModel from '@stackstorm/st2flow-model/model-orquesta';
import MetaModel from '@stackstorm/st2flow-model/model-meta';

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

class Window extends Component {
  state = {
    actions: [],
    selected: undefined,
  }

  async componentDidMount() {
    const res = await fetch('/actions.json');

    this.setState({ actions: await res.json() });
  }

  handleSelect(name) {
    this.setState({ selected: name });
  }

  style = style

  render() {
    const { actions } = this.state;

    return (
      <div className="component" >
        <Header className="header" />
        <Palette className="palette" actions={actions} />
        <Canvas className="canvas" selected={this.state.selected} onSelect={(name) => this.handleSelect(name)} />
        <Details className="details" actions={actions} selected={this.state.selected} onSelect={(name) => this.handleSelect(name)} />
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

const routes = [{
  url: '/',
  Component: Window,
}];

ReactDOM.render(<Provider store={store}><Router routes={routes} /></Provider>, document.querySelector('#container'));
