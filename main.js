import React, { Component } from 'react';
import ReactDOM from 'react-dom';

import {
  Router,
  Route,
  Switch,
} from 'react-router-dom';
import createHashHistory from 'history/createHashHistory';

import Header from '@stackstorm/st2flow-header';
import Palette from '@stackstorm/st2flow-palette';
import Canvas from '@stackstorm/st2flow-canvas';
import Details from '@stackstorm/st2flow-details';

import style from './style.css';

const history = window.routerHistory = createHashHistory({});

class Window extends Component {
  state = {
    actions: [],
    selected: undefined,
    transitionToSelected: undefined,
  }

  async componentDidMount() {
    const res = await fetch('/actions.json');

    this.setState({ actions: await res.json() });
  }

  handleSelect(name, toName) {
    this.setState({ selected: name, transitionToSelected: toName });
  }

  style = style

  render() {
    const { actions } = this.state;

    return (
      <div className="component" >
        <Header className="header" />
        <Palette className="palette" actions={actions} />
        <Canvas
          className="canvas"
          selected={this.state.selected}
          transitionToSelected={this.state.transitionToSelected}
          onSelect={(name, toName) => this.handleSelect(name, toName)}
        />
        <Details
          className="details"
          actions={actions}
          selected={this.state.selected}
          transitionToSelected={this.state.transitionToSelected}
          onSelect={(name) => this.handleSelect(name)}
        />
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
