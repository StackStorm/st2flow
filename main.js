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

class FakeModel extends Model {
  _size = {
    x: 100,
    y: 40,
  }
  _tasks = [{
    name: 'task1',
    action: 'someaction',
    size: this._size,
    coords: {
      x: 120,
      y: 100,
    },
  }, {
    name: 'task2',
    action: 'someaction',
    size: this._size,
    coords: {
      x: 260,
      y: 100,
    },
  }, {
    name: 'task3',
    action: 'someaction',
    size: this._size,
    coords: {
      x: 50,
      y: 250,
    },
  }, {
    name: 'task4',
    action: 'someaction',
    size: this._size,
    coords: {
      x: 200,
      y: 230,
    },
  }, {
    name: 'task5',
    action: 'someaction',
    size: this._size,
    coords: {
      x: 500,
      y: 200,
    },
  }]

  _transitions = [{
    from: {
      task: 'task2',
      anchor: 'right',
    },
    to: {
      task: 'task4',
      anchor: 'right',
    },
  }, {
    from: {
      task: 'task1',
      anchor: 'right',
    },
    to: {
      task: 'task2',
      anchor: 'left',
    },
  }, {
    from: {
      task: 'task2',
      anchor: 'top',
    },
    to: {
      task: 'task5',
      anchor: 'right',
    },
  }, {
    from: {
      task: 'task1',
      anchor: 'left',
    },
    to: {
      task: 'task3',
      anchor: 'left',
    },
  }, {
    from: {
      task: 'task1',
      anchor: 'bottom',
    },
    to: {
      task: 'task4',
      anchor: 'top',
    },
  }]

  _callbacks = []

  on(fn) {
    this._callbacks.push(fn);
  }

  emit() {
    this._callbacks.forEach(fn => fn());
  }

  get tasks() {
    return this._tasks;
  }

  get transitions() {
    return this._transitions
      .map(({ from, to }) => {
        return {
          from: {
            ...from,
            name: from.task,
            task: this._tasks.find(task => task.name === from.task),
          },
          to: {
            ...to,
            name: to.task,
            task: this._tasks.find(task => task.name === to.task),
          },
        };
      });
  }

  addTask(opts) {
    this._tasks.push({
      name: `task${this._tasks.length + 1}`,
      action: opts.action,
      coords: opts.coords,
      size: this._size,
    });

    this.emit();
  }

  updateTask(ref, opts) {
    const task = this.tasks.find(task => task.name === ref);
    
    if (!task) {
      throw new Error('task not found for ref');
    }

    if (opts.coords) {
      task.coords = opts.coords;
      this.emit();
    }
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
  }

  render() {
    const { match: { path, params: { ref } } } = this.props;

    return (
      <div className="component" >
        <Header />
        <Palette />
        <Canvas model={this.model} />
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
