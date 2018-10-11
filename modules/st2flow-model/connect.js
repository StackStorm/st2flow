import React, { Component } from 'react';
import OrquestaModel from './model-orquesta';
import MetaModel from './model-meta';

let model;
let metaModel;

export function connect(transform) {
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

  const tmpMeta = `---
description: Build node automation workflow.
enabled: true
entry_point: workflows/build-controller.yaml
name: build-controller
pack: st2cicd
runner_type: orquesta
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

  window.model = model = model || new OrquestaModel(tmpYAML);
  window.metaModel = metaModel = metaModel || new MetaModel(tmpMeta); 

  const props = transform({ model, metaModel });

  return WrappedComponent => {
    return class ModelWrapper extends Component {
      componentDidMount() {
        for (const key of Object.keys(props)) {
          if (props[key].on) {
            props[key].on('change', this.update);
          }
        }
      }

      componentWillUnmount() {
        for (const key of Object.keys(props)) {
          if (props[key].removeEventListener) {
            props[key].removeEventListener('change', this.update);
          }
        }
      }

      update = () => {
        this.forceUpdate();
      }

      render() {
        return <WrappedComponent {...this.props} {...props} />;
      }
    };
  };
}
