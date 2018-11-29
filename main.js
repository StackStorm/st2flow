import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { Provider, connect } from 'react-redux';
import { PropTypes } from 'prop-types';

import Header from '@stackstorm/st2flow-header';
import Palette from '@stackstorm/st2flow-palette';
import Canvas from '@stackstorm/st2flow-canvas';
import Details from '@stackstorm/st2flow-details';

import api from '@stackstorm/module-api';

import CollapseButton from '@stackstorm/st2flow-canvas/collapse-button';
import Toolbar from '@stackstorm/st2flow-canvas/toolbar';

import { Router } from '@stackstorm/module-router';
import globalStore from '@stackstorm/module-store';

import store from './store';
import style from './style.css';

@connect(
  ({ flow: { panels, actions, meta, metaSource, workflowSource, pack } }) => ({ isCollapsed: panels, actions, meta, metaSource, workflowSource, pack }),
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
  pack: string,

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
    pack: PropTypes.string,

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
    const { pack, meta, actions, workflowSource, metaSource } = this.props;

    const existingAction = actions.find(e => e.name === meta.name && e.pack === pack);

    meta.pack = pack;
    meta.data_files = [{
      file_path: meta.entry_point,
      content: workflowSource,
    }, {
      file_path: existingAction && existingAction.metadata_file && existingAction.metadata_file.replace(/^actions\//, '') || `${meta.name}.meta.yaml`,
      content: metaSource,
    }];
    
    if (existingAction) {
      return api.request({ method: 'put', path: `/actions/${pack}.${meta.name}` }, meta);
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

globalStore.subscribe(() => {
  const { location } = globalStore.getState();

  let match;

  match = location.pathname.match('^/import/(.+)/(.+)');
  if (match) {
    const [ ,, action ] = match;
    
    globalStore.dispatch({
      type: 'CHANGE_LOCATION',
      location: {
        ...location,
        pathname: `/action/${action}`,
      },
    });
    return;
  }

  match = location.pathname.match('^/action/(.+)');
  if (match) {
    const [ , ref ] = match;

    const { currentWorkflow } = store.getState();

    if (currentWorkflow !== ref) {
      store.dispatch({
        type: 'LOAD_WORKFLOW',
        currentWorkflow: ref,
        promise: (async () => {
          const action = await api.request({ path: `/actions/${ref}` });
          const [ pack ] = ref.split('.');
          const [ metaSource, workflowSource ] = await Promise.all([
            api.request({ path: `/packs/views/file/${pack}/${action.metadata_file}`}),
            api.request({ path: `/packs/views/file/${pack}/actions/${action.entry_point}`}),
          ]);
          return {
            metaSource,
            workflowSource,
          };
        })(),
      });
    }
    return;
  }
});

const routes = [{
  url: '/',
  Component: Window,
}];

ReactDOM.render(<Provider store={globalStore}><Router routes={routes} /></Provider>, document.querySelector('#container'));
