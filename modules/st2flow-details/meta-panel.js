//@flow

import React, { Component } from 'react';
import { connect } from 'react-redux';
import { PropTypes } from 'prop-types';

import BooleanField from '@stackstorm/module-auto-form/fields/boolean';
import StringField from '@stackstorm/module-auto-form/fields/string';
import EnumField from '@stackstorm/module-auto-form/fields/enum';

import { Panel, Toolbar, ToolbarButton } from './layout';
import Parameters from './parameters-panel';


@connect(
  ({ flow: { pack, actions, navigation, meta }}) => ({ pack, actions, navigation, meta }),
  (dispatch) => ({
    navigate: (navigation) => dispatch({
      type: 'CHANGE_NAVIGATION',
      navigation,
    }),
    setMeta: (field, value) => dispatch({
      type: 'META_ISSUE_COMMAND',
      command: 'set',
      args: [ field, value ],
    }),
    setPack: (pack) => dispatch({
      type: 'SET_PACK',
      pack,
    }),
  })
)
export default class Meta extends Component<{
  pack: string,
  setPack: Function,

  meta: Object,
  setMeta: Function,

  navigation: Object,
  navigate: Function,

  actions: Array<Object>,
}> {
  static propTypes = {
    pack: PropTypes.object,
    setPack: PropTypes.func,

    meta: PropTypes.object,
    setMeta: PropTypes.func,

    navigation: PropTypes.object,
    navigate: PropTypes.func,

    actions: PropTypes.array,
  }

  handleSectionSwitch(section: string) {
    this.props.navigate({ section });
  }

  render() {
    const { pack, setPack, meta, setMeta, navigation, actions } = this.props;
    const { section = 'meta' } = navigation;

    const packs = [ ...new Set(actions.map(a => a.pack)).add(pack) ];

    return ([
      <Toolbar key="subtoolbar" secondary={true} >
        <ToolbarButton stretch onClick={() => this.handleSectionSwitch('meta')} selected={section === 'meta'}>Meta</ToolbarButton>
        <ToolbarButton stretch onClick={() => this.handleSectionSwitch('parameters')} selected={section === 'parameters'}>Parameters</ToolbarButton>
      </Toolbar>,
      section === 'meta' && (
        <Panel key="meta">
          <EnumField name="Runner Type" value={meta.runner_type} spec={{enum: [ ...new Set([ 'mistral-v2', 'orquesta', meta.runner_type ]) ]}} onChange={(v) => setMeta('runner_type', v)} />
          <EnumField name="Pack" value={pack} spec={{enum: packs}} onChange={(v) => setPack(v)} />
          <StringField name="Name" value={meta.name} onChange={(v) => setMeta('name', v)} />
          <StringField name="Description" value={meta.description} onChange={(v) => setMeta('description', v)} />
          <BooleanField name="Enabled" value={meta.enabled} spec={{}} onChange={(v) => setMeta('enabled', v)} />
          <StringField name="Entry point" value={meta.entry_point} onChange={(v) => setMeta('entry_point', v)} />
        </Panel>
      ),
      section === 'parameters' && (
        //$FlowFixMe
        <Parameters key="parameters" />
      ),
    ]);
  }
}
