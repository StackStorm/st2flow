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
import Details from '@stackstorm/st2flow-details';

import './style.css';

const history = window.routerHistory = createHashHistory({});

class FakeModel extends Model {
  _size = {
    x: 100,
    y: 46,
  }
  
  _definition = {
    tasks: [],
    transitions: [],
  }

  _parameters = []

  _callbacks = []

  on(fn) {
    this._callbacks.push(fn);
  }

  emit() {
    this._callbacks.forEach(fn => fn());
  }

  get tasks() {
    return this._definition.tasks
      .map(task => {
        return {
          ...task,
          size: this._size,
        };
      });
  }

  get transitions() {
    return this._definition.transitions
      .map(({ from, to }) => {
        return {
          from: {
            ...from,
            name: from.task,
            task: this.tasks.find(task => task.name === from.task),
          },
          to: {
            ...to,
            name: to.task,
            task: this.tasks.find(task => task.name === to.task),
          },
        };
      });
  }

  get parameters() {
    return this._parameters;
  }

  _selected = null;

  get selected() {
    return this._selected;
  }

  selectTask(ref = null) {
    this._selected = ref;

    this.emit();
  }

  addTask(opts) {
    this._definition.tasks.push({
      name: `task${this.tasks.length + 1}`,
      action: opts.action,
      coords: opts.coords,
      size: this._size,
    });

    this.emit();
  }

  updateTask(ref, opts) {
    const task = this._definition.tasks.find(task => task.name === ref);
    
    if (!task) {
      throw new Error('task not found for ref');
    }

    if (opts.name) {
      task.name = opts.name;
      this.emit();
    }

    if (opts.action) {
      task.action = opts.action;
      this.emit();
    }

    if (opts.coords) {
      task.coords = opts.coords;
      this.emit();
    }
  }

  deleteTask(ref) {
    const taskIndex = this._definition.tasks.findIndex(task => task.name === ref);

    if (taskIndex > -1) {
      delete this._definition.tasks[taskIndex];

      this._definition.transitions = this._definition.transitions
        .filter(transition => transition.from.task !== ref && transition.to.task !== ref);

      this.emit();
    }
  }

  _meta = {}

  get meta() {
    return this._meta;
  }

  setMeta(value) {
    this._meta = value;
  }

  parse(string) {
    try {
      this._definition = JSON.parse(string);

      this.emit();
    }
    catch (e) { /* pass */ }
  }

  stringify() {
    return JSON.stringify(this._definition, null, 2);
  }
}

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
    window.model = this.model = new FakeModel();
    this.model.on(() => this.forceUpdate());
  }

  state = {
    actions: [],
  }

  async componentDidMount() {
    const res = await fetch('/actions.json');

    this.setState({ actions: await res.json() });
  }

  render() {
    const { match: { path, params: { ref } } } = this.props;

    const { actions } = this.state;

    return (
      <div className="component" >
        <Header />
        <Palette actions={actions} />
        <Canvas model={this.model} selected={this.model.selected} />
        <Details actions={actions} model={this.model} selected={this.model.selected} />
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
