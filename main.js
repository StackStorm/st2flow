import React, { Component } from 'react';
import ReactDOM from 'react-dom';

import EventEmitter from 'eventemitter3';

import {
  Router,
  Route,
  Switch,
} from 'react-router-dom';
import createHashHistory from 'history/createHashHistory';

import { connect } from '@stackstorm/st2flow-model';

import Header from '@stackstorm/st2flow-header';
import Palette from '@stackstorm/st2flow-palette';
import Canvas from '@stackstorm/st2flow-canvas';
import Details from '@stackstorm/st2flow-details';

import style from './style.css';

const history = window.routerHistory = createHashHistory({});

class MetaModel extends EventEmitter {
  meta = {
    name: '',
    runner_type: 'orquesta',
    description: '',
    enable: false,
    entry_point: '',
    parameters: {
      register: {
        type: 'string',
        default: 'all',
        description: 'Possible options are all, sensors, actions, rules, aliases, runners, triggers, rule_types, policiy_types, policies, configs.',
      },
      packs: {
        type: 'array',
        description: 'A list of packs to register / load resources from.',
        items: {
          type: 'string',
        },
      },
      timeout: {
        type: 'integer',
        default: 300,
        description: 'Make sure that all pack content is loaded within specified timeout',
      },
    },
  }

  update(meta) {
    this.meta = meta;
  }

  get parameters() {
    return Object.keys(this.meta.parameters)
      .map(name => ({
        name,
        ...this.meta.parameters[name],
      })) ;
  }

  setParameter(name, opts) {
    this.meta.parameters[name] = opts;
    this.emit('update');
  }

  unsetParameter(name) {
    delete this.meta.parameters[name];
    this.emit('update');
  }
}

@connect
class Window extends Component {
  constructor(props) {
    super(props);

    this.metaModel = new MetaModel();
  }

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
        <Details className="details" actions={actions} selected={this.state.selected} onSelect={(name) => this.handleSelect(name)} metaModel={this.metaModel} />
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
