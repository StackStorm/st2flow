//@flow

import React, { Component } from 'react';
import { PropTypes } from 'prop-types';

import { connect, ModelInterface } from '@stackstorm/st2flow-model';

import BooleanField from '@stackstorm/module-auto-form/fields/boolean';
import StringField from '@stackstorm/module-auto-form/fields/string';
import EnumField from '@stackstorm/module-auto-form/fields/enum';

import { Panel, Toolbar, ToolbarButton } from './layout';
import Parameters from './parameters-panel';


@connect(({ metaModel }) => ({ metaModel }))
export default class Meta extends Component<{
  metaModel: ModelInterface,
  navigation: Object,
  handleNavigationChange: Function,
}> {
  static propTypes = {
    metaModel: PropTypes.object,
    navigation: PropTypes.object,
    handleNavigationChange: PropTypes.func,
  }

  handleSectionSwitch(section: string) {
    this.props.handleNavigationChange({ section });
  }

  render() {
    const { metaModel } = this.props;
    const { section = 'meta' } = this.props.navigation;

    if (!metaModel) {
      return false;
    }

    return ([
      <Toolbar key="subtoolbar" secondary={true} >
        <ToolbarButton stretch onClick={() => this.handleSectionSwitch('meta')} selected={section === 'meta'}>Meta</ToolbarButton>
        <ToolbarButton stretch onClick={() => this.handleSectionSwitch('parameters')} selected={section === 'parameters'}>Parameters</ToolbarButton>
      </Toolbar>,
      section === 'meta' && (
        <Panel key="meta">
          <EnumField name="Runner Type" value={metaModel.get('runner_type')} spec={{enum: [ 'mistral', 'orquesta', 'action-chain' ]}} onChange={(v) => metaModel.set('runner_type', v)} />
          <EnumField name="Pack" value={metaModel.get('pack')} spec={{enum: [ 'some', 'thing', 'else' ]}} onChange={(v) => metaModel.set('pack', v)} />
          <StringField name="Name" value={metaModel.get('name')} onChange={(v) => metaModel.set('name', v)} />
          <StringField name="Description" value={metaModel.get('description')} onChange={(v) => metaModel.set('description', v)} />
          <BooleanField name="Enabled" value={metaModel.get('enabled')} spec={{}} onChange={(v) => metaModel.set('enabled', v)} />
          <StringField name="Entry point" value={metaModel.get('entry_point')} onChange={(v) => metaModel.set('entry_point', v)} />
        </Panel>
      ),
      section === 'parameters' && (
        //$FlowFixMe
        <Parameters key="parameters" />
      ),
    ]);
  }
}
