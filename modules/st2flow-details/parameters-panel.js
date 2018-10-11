import React, { Component } from 'react';
import { PropTypes } from 'prop-types';

import { connect } from '@stackstorm/st2flow-model';

import Parameter from './parameter';
import Button from '@stackstorm/module-forms/button.component';

import { Panel } from './layout';

@connect(({ metaModel }) => ({ metaModel }))
export default class Parameters extends Component {
  static propTypes = {
    metaModel: PropTypes.object,
  }

  handleDelete(name) {
    this.props.metaModel.unsetParameter(name);
  }

  render() {
    const { metaModel } = this.props;
    const parameters = metaModel.get('parameters');

    return (
      <Panel>
        {
          parameters.__meta.keys.map(name => (
            <Parameter
              key={name}
              name={name}
              parameter={parameters[name]}
              onDelete={() => this.handleDelete(name)}
            />
          ))
        }
        <Button value="Add parameter" />
      </Panel>
    );
  }
}
