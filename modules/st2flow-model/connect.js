import React, { Component } from 'react';
import OrquestaModel from './model-orquesta';

let model;

export function connect(WrappedComponent) {
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
    coords:
      x: 100
      y: 200
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
    coords:
      x: 200
      y: 300
  b:
    action: core.local cmd="echo 'Took path B.'"
    coords:
      x: 10
      y: 300
    next:
      - do: 'foobar'
  c:
    action: core.local cmd="echo 'Took path C.'"
    coords:
      x: 100
      y: 500

  foobar:
    action: core.local
    coords:
      x: 300
      y: 400

`;

  model = model || new OrquestaModel(tmpYAML); 

  return class ModelWrapper extends Component {
    componentDidMount() {
      model.on('change', () => this.forceUpdate());
    }

    render() {
      return <WrappedComponent model={model} {...this.props} />;
    }
  };
}
