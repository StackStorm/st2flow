import React, { Component } from 'react';
import ReactDOM from 'react-dom';

import {
  Router,
  Route,
  Switch,
} from 'react-router-dom';
import createHashHistory from 'history/createHashHistory';

import { OrquestaModel } from '@stackstorm/st2flow-model';

import Header from '@stackstorm/st2flow-header';
import Palette from '@stackstorm/st2flow-palette';
import Canvas from '@stackstorm/st2flow-canvas';
import Details from '@stackstorm/st2flow-details';

import style from './style.css';

const history = window.routerHistory = createHashHistory({});

class Window extends Component {
  constructor(props) {
    super(props);
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

    this.model = new OrquestaModel(tmpYAML);
    this.model.on('change', () => this.forceUpdate());
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
    const { actions } = this.state;

    return (
      <div className="component" >
        <Header className="header" />
        <Palette className="palette" actions={actions} />
        <Canvas className="canvas" model={this.model} selected={this.model.selected} />
        <Details className="details" actions={actions} model={this.model} selected={this.model.selected} />
      </div>
    );
  }
}

export class Container extends Component {
  auth(bundle64) {
    const source = JSON.parse(window.atob(bundle64));

    if (source.api === undefined) {
      source.api = `https://${window.location.hostname}:443/api`;
      source.auth = `https://${window.location.hostname}:443/auth`;
    }
  }

  render() {
    return (
      <Router history={history}>
        <Switch>
          <Route exact path="/" component={Window} />
          <Route path="/action/:ref" component={Window} />

          <Route
            path="/import/:bundle/:ref?"
            render={({ history, match: { params: { bundle, ref }} }) => {
              this.auth(bundle);

              setTimeout(() => {
                history.push(ref ? `/action/${ref}` : '/');
              }, 100);

              return null;
            }}
          />
        </Switch>
      </Router>
    );
  }
}

ReactDOM.render(<Container className="container" />, document.querySelector('#container'));
