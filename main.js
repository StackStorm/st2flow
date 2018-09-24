import React, { Component } from 'react';
import { PropTypes } from 'prop-types';
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
import Editor from '@stackstorm/st2flow-editor';

import style from './style.css';

const history = window.routerHistory = createHashHistory({});

class Window extends Component {
  static propTypes = {
    match: PropTypes.shape({
      url: PropTypes.string.isRequired,
      path: PropTypes.string.isRequired,
      params: PropTypes.shape({
        ref: PropTypes.string,
      }).isRequired,
    }).isRequired,
  };

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
  a:
    action: core.local cmd="echo 'Took path A.'"
  b:
    action: core.local cmd="echo 'Took path B.'"
    next:
      - do: 'foobar'
  c:
    action: core.local cmd="echo 'Took path C.'"
  foobar:
    action: core.local

`;

    this.model = new OrquestaModel(tmpYAML);
  }

  render() {
    // const { match: { path, params: { ref } } } = this.props;

    return (
      <div className={style.component} >
        <Header className={style.header} matchedRoute={this.props.match} />
        <Palette className={style.palette} model={this.model} />
        <Canvas className={style.canvas} model={this.model} />
        <Editor className={style.details} model={this.model} />
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

ReactDOM.render(<Container className={style.container} />, document.querySelector('#container'));
