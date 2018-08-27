import React, { Component } from 'react';
import { PropTypes } from 'prop-types';
import ReactDOM from 'react-dom';

import {
  Router,
  Route,
  Switch,
} from 'react-router-dom';
import createHashHistory from 'history/createHashHistory';

import Model from '@stackstorm/st2flow-model/model-orchestra';

import Header from '@stackstorm/st2flow-header';
import Palette from '@stackstorm/st2flow-palette';
import Canvas from '@stackstorm/st2flow-canvas';
import Editor from '@stackstorm/st2flow-editor';

import './style.css';

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
    this.model = new Model();
  }

  render() {
    const { match: { path, params: { ref } } } = this.props;

    return (
      <div className="component" >
        <Header />
        <Palette />
        <Canvas />
        <Editor model={this.model} />
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

ReactDOM.render(<Container />, document.querySelector('#container'));
