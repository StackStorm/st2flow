import React, { Component } from 'react';
import { PropTypes } from 'prop-types';

import { connect } from '@stackstorm/st2flow-model';

import Parameter from './parameter';
import ParameterEditor from './parameter-editor';
import Button from '@stackstorm/module-forms/button.component';

import { Panel } from './layout';

@connect(({ metaModel }) => ({ metaModel }))
export default class Parameters extends Component {
  static propTypes = {
    metaModel: PropTypes.object,
  }

  state = {
    edit: false,
  }

  handleAdd({ name, ...properties }) {
    const parameters = this.props.metaModel.get('parameters');
    this.props.metaModel.set('parameters', { ...parameters, [name]: properties});
    this.setState({ edit: false });
  }

  handleChange(oldName, { name, ...properties }) {
    const { ...parameters } = this.props.metaModel.get('parameters');
    if (oldName !== name) {
      delete parameters[name];
    }
    this.props.metaModel.set('parameters', { ...parameters, [name]: properties});
    this.setState({ edit: false });
  }

  handleDelete(name) {
    const { ...parameters } = this.props.metaModel.get('parameters');
    delete parameters[name];
    this.props.metaModel.set('parameters', parameters);
  }

  render() {
    const { metaModel } = this.props;
    const { edit } = this.state;
    const parameters = metaModel.get('parameters');

    return (
      <Panel>
        {
          edit === false && parameters.__meta.keys.map(name => (
            <Parameter
              key={name}
              name={name}
              parameter={parameters[name]}
              onEdit={parameter => this.setState({ edit: name })}
              onDelete={() => this.handleDelete(name)}
            />
          ))
        }
        {
          edit === false && <Button value="Add parameter" onClick={() => this.setState({ edit: true })} />
        }
        {
          edit === true && <ParameterEditor onChange={parameter => this.handleAdd(parameter)} onCancel={() => this.setState({ edit: false })} />
        }
        {
          typeof edit === 'string' && (
            <ParameterEditor 
              parameter={{ ...parameters[edit], name: edit }}
              onChange={parameter => this.handleChange(edit, parameter)}
              onCancel={() => this.setState({ edit: false })}
            />
          )
        }
      </Panel>
    );
  }
}
