import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';

import Header from '@stackstorm/st2flow-header';
import Palette from '@stackstorm/st2flow-palette';
import Canvas from '@stackstorm/st2flow-canvas';
import Details from '@stackstorm/st2flow-details';

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

const routes = [{
  url: '/',
  Component: Window,
}];

ReactDOM.render(<Provider store={store}><Router routes={routes} /></Provider>, document.querySelector('#container'));
