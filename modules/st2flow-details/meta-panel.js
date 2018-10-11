import React, { Component } from 'react';
import { PropTypes } from 'prop-types';

import { connect } from '@stackstorm/st2flow-model';

import BooleanField from '@stackstorm/module-auto-form/fields/boolean';
import StringField from '@stackstorm/module-auto-form/fields/string';
import EnumField from '@stackstorm/module-auto-form/fields/enum';

import { Panel } from './layout';


@connect(({ metaModel }) => ({ metaModel }))
export default class Meta extends Component {
  static propTypes = {
    metaModel: PropTypes.object,
  }

  render() {
    const { metaModel } = this.props;

    return (
      <Panel>
        <EnumField name="Runner Type" value={metaModel.get('runner_type')} spec={{enum: [ 'mistral', 'orquesta', 'action-chain' ]}} onChange={(v) => metaModel.set('runner_type', v)} />
        <EnumField name="Pack" value={metaModel.get('pack')} spec={{enum: [ 'some', 'thing', 'else' ]}} onChange={(v) => metaModel.set('pack', v)} />
        <StringField name="Name" value={metaModel.get('name')} onChange={(v) => metaModel.set('name', v)} />
        <StringField name="Description" value={metaModel.get('description')} onChange={(v) => metaModel.set('description', v)} />
        <BooleanField name="Enabled" value={metaModel.get('enabled')} spec={{}} onChange={(v) => metaModel.set('enabled', v)} />
        <StringField name="Entry point" value={metaModel.get('entry_point')} onChange={(v) => metaModel.set('entry_point', v)} />
      </Panel>
    );
  }
}
