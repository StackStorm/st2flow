//@flow

import React, { Component } from 'react';
import { connect } from 'react-redux';
import { PropTypes } from 'prop-types';
import { cloneDeep } from 'lodash';

import BooleanField from '@stackstorm/module-auto-form/fields/boolean';
import StringField from '@stackstorm/module-auto-form/fields/string';
import EnumField from '@stackstorm/module-auto-form/fields/enum';
import AutoForm from '@stackstorm/module-auto-form';

import { Panel, Toolbar, ToolbarButton } from './layout';
import Parameters from './parameters-panel';

const default_runner_type = 'orquesta';

@connect(
  ({ flow: { pack, actions, navigation, meta, input }}) => ({ pack, actions, navigation, meta, input }),
  (dispatch) => ({
    navigate: (navigation) => dispatch({
      type: 'CHANGE_NAVIGATION',
      navigation,
    }),
    setMeta: (field, value) => {
      try{
        dispatch({
          type: 'META_ISSUE_COMMAND',
          command: 'set',
          args: [ field, value ],
        });
      }
      catch(error) {
        dispatch({
          type: 'PUSH_ERROR',
          error,
        });
      }
    },
    setInput: (input) => dispatch({
      type: 'MODEL_ISSUE_COMMAND',
      command: 'setInputValues',
      args: [ input ],
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
  input: Array<Object | string>,
  setInput: Function,
}> {
  static propTypes = {
    pack: PropTypes.object,
    setPack: PropTypes.func,

    meta: PropTypes.object,
    setMeta: PropTypes.func,

    navigation: PropTypes.object,
    navigate: PropTypes.func,

    actions: PropTypes.array,
    input: PropTypes.array,
    setInput: PropTypes.func,
  }

  componentDidUpdate() {
    const { meta, setMeta } = this.props;

    if (!meta.runner_type) {
      setMeta('runner_type', default_runner_type);
    }
  }

  handleSectionSwitch(section: string) {
    this.props.navigate({ section });
  }

  handleInputChange(value: Object) {
    const { setInput, input } = this.props;
    setInput(input.map(maybeKey => {
      const key = typeof maybeKey === 'string' ? maybeKey : Object.keys(maybeKey)[0];
      if (value[key] != null) {
        return { [key]: value[key] };
      }
      else {
        return key;
      }
    }));
  }

  render() {
    const { pack, setPack, meta, setMeta, navigation, actions, input } = this.props;
    const { section = 'meta' } = navigation;

    const packs = [ ...new Set(actions.map(a => a.pack)).add(pack) ];

    const autoFormProperties = cloneDeep(meta.parameters || {});
    Object.keys(autoFormProperties).forEach(key => {
      const spec = autoFormProperties[key];
      if (spec.default != null) {
        delete autoFormProperties[key];
      }
    });
    const autoFormPropertiesDisplayOnly = cloneDeep(meta.parameters || {});
    Object.keys(autoFormPropertiesDisplayOnly).forEach(key => {
      const spec = autoFormPropertiesDisplayOnly[key];
      if (spec.default == null) {
        delete autoFormPropertiesDisplayOnly[key];
      }
    });

    const autoFormData = input && input.reduce((acc, value) => {
      if(typeof value === 'object') {
        acc = { ...acc, ...value };
      }
      return acc;
    }, {});

    return ([
      <Toolbar key="subtoolbar" secondary={true} >
        <ToolbarButton stretch onClick={() => this.handleSectionSwitch('meta')} selected={section === 'meta'}>Meta</ToolbarButton>
        <ToolbarButton stretch onClick={() => this.handleSectionSwitch('parameters')} selected={section === 'parameters'}>Parameters</ToolbarButton>
        {meta.parameters && <ToolbarButton stretch onClick={() => this.handleSectionSwitch('input')} selected={section === 'input'}>Input</ToolbarButton>}
      </Toolbar>,
      section === 'meta' && (
        <Panel key="meta">
          <EnumField name="Runner Type" value={meta.runner_type} spec={{enum: [ ...new Set([ 'mistral-v2', 'orquesta' ]) ], default: default_runner_type}} onChange={(v) => setMeta('runner_type', v)} />
          <EnumField name="Pack" value={pack} spec={{enum: packs}} onChange={(v) => setPack(v)} />
          <StringField name="Name" value={meta.name} onChange={(v) => setMeta('name', v || '')} />
          <StringField name="Description" value={meta.description} onChange={(v) => setMeta('description', v)} />
          <BooleanField name="Enabled" value={meta.enabled} spec={{}} onChange={(v) => setMeta('enabled', v)} />
          <StringField name="Entry point" value={meta.entry_point} onChange={(v) => setMeta('entry_point', v || '')} />
        </Panel>
      ),
      section === 'parameters' && (
        //$FlowFixMe
        <Parameters key="parameters" />
      ),
      section === 'input' && (
        <Panel key="input">
          <AutoForm
            spec={{
              type: 'object',
              properties: autoFormProperties,
            }}
            data={autoFormData}
            onChange={(runValue) => this.handleInputChange(runValue)}
          />
          <AutoForm
            spec={{
              type: 'object',
              properties: autoFormPropertiesDisplayOnly,
            }}
            data={autoFormData}
            disabled={true}
            onChange={(runValue) => this.handleInputChange(runValue)}
          />
        </Panel>
      ),
    ]);
  }
}
