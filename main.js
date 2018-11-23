import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { Provider, connect } from 'react-redux';
import { PropTypes } from 'prop-types';

import Header from '@stackstorm/st2flow-header';
import Palette from '@stackstorm/st2flow-palette';
import Canvas from '@stackstorm/st2flow-canvas';
import Details from '@stackstorm/st2flow-details';

import api from '@stackstorm/module-api';
import { models } from '@stackstorm/st2flow-model';

import CollapseButton from '@stackstorm/st2flow-canvas/collapse-button';
import Toolbar from '@stackstorm/st2flow-canvas/toolbar';

import { Router } from '@stackstorm/module-router';
import globalStore from '@stackstorm/module-store';

import store from './store';
import style from './style.css';

@connect(
  ({ flow: { panels, actions, meta } }) => ({ isCollapsed: panels, actions, meta }),
  (dispatch) => ({
    toggleCollapse: name => dispatch({
      type: 'PANEL_TOGGLE_COLLAPSE',
      name,
    }),
    fetchActions: () => dispatch({
      type: 'FETCH_ACTIONS',
      promise: api.request({ path: '/actions/views/overview' })
        .catch(() => fetch('/actions.json').then(res => res.json())),
    }),
    undo: () => dispatch({ type: 'FLOW_UNDO' }),
    redo: () => dispatch({ type: 'FLOW_REDO' }),
    layout: () => dispatch({ type: 'MODEL_LAYOUT' }),
  })
)
class Window extends Component<{
  meta: Object,
  metaSource: string,
  workflowSource: string,

  isCollapsed: Object,
  toggleCollapse: Function,

  actions: Array<Object>,
  fetchActions: Function,

  undo: Function,
  redo: Function,
  layout: Function,
}> {
  static propTypes = {
    meta: PropTypes.object,
    metaSource: PropTypes.string,
    workflowSource: PropTypes.string,

    isCollapsed: PropTypes.object,
    toggleCollapse: PropTypes.func,

    actions: PropTypes.array,
    fetchActions: PropTypes.func,

    undo: PropTypes.func,
    redo: PropTypes.func,
    layout: PropTypes.func,
  }

  async componentDidMount() {
    this.props.fetchActions();
  }

  save() {
    const { meta, actions, workflowSource, metaSource } = this.props;

    const existingAction = actions.find(e => e.name === meta.name && e.pack === meta.pack);

    meta.data_files = [{
      file_path: meta.entry_point,
      content: workflowSource,
    }, {
      file_path: existingAction && existingAction.metadata_file && existingAction.metadata_file.replace(/^actions\//, '') || `${meta.name}.meta.yaml`,
      content: metaSource,
    }];
    
    if (existingAction) {
      return api.request({ method: 'put', path: `/actions/${meta.pack}.${meta.name}` }, meta);
    }
    else {
      return api.request({ method: 'post', path: '/actions' }, meta);
    }
  }

  style = style

  render() {
    const { isCollapsed = {}, toggleCollapse, actions, undo, redo, layout } = this.props;

    return (
      <div className="component">
        <div className="component-row-header">
          { !isCollapsed.header && <Header className="header" /> }
          <CollapseButton position="top" state={isCollapsed.header} onClick={() => toggleCollapse('header')} />
        </div>
        <div className="component-row-content">
          { !isCollapsed.palette && <Palette className="palette" actions={actions} /> }
          <Canvas className="canvas">
            <Toolbar>
              <div key="undo" icon="icon-redirect" onClick={() => undo()} />
              <div key="redo" icon="icon-redirect2" onClick={() => redo()} />
              <div key="rearrange" icon="icon-arrange" onClick={() => layout()} />
              <div key="save" icon="icon-save" onClick={() => this.save()} />
              <div key="run" icon="icon-play" onClick={() => console.log('run')} />
            </Toolbar>
          </Canvas>
          { !isCollapsed.details && <Details className="details" actions={actions} /> }
        </div>
      </div>
    );
  }
}

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

store.dispatch({
  type: 'MODEL_ISSUE_COMMAND',
  command: 'applyDelta',
  args: [ null, tmpYAML ],
});

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

store.dispatch({
  type: 'META_ISSUE_COMMAND',
  command: 'applyDelta',
  args: [ null, tmpMeta ],
});

// subscribe('metaModel', m => {
//   const model = get('model');

//   if (model.constructor.runner_types.indexOf(m.runner_type) === -1) {
//     const NewModel = models[m.runner_type];

//     if (NewModel) {
//       register('model', new NewModel(model.toYAML()));
//     }
//   }

// });

const routes = [{
  url: '/',
  Component: Window,
}];

ReactDOM.render(<Provider store={globalStore}><Router routes={routes} /></Provider>, document.querySelector('#container'));
