//@flow

import React, { Component } from 'react';
import { connect } from 'react-redux';
import { PropTypes } from 'prop-types';

import Parameter from './parameter';
import ParameterEditor from './parameter-editor';
import Button from '@stackstorm/module-forms/button.component';

import { Panel } from './layout';

@connect(
  ({ flow: { meta }}) => ({ meta }),
  (dispatch) => ({
    setMeta: (field, value) => dispatch({
      type: 'META_ISSUE_COMMAND',
      command: 'set',
      args: [ field, value ],
    }),
  })
)
export default class Parameters extends Component<{
  meta: Object,
  setMeta: Function,
}, {
  edit: bool,
}> {
  static propTypes = {
    meta: PropTypes.object,
    setMeta: PropTypes.func,
  }

  state = {
    edit: false,
  }

  handleAdd({ name, ...properties }: { name: string }) {
    const parameters = this.props.meta.parameters;
    this.props.setMeta('parameters', { ...parameters, [name]: properties});
    this.setState({ edit: false });
  }

  handleChange(oldName: string, { name, ...properties }: { name: string }) {
    const { ...parameters } = this.props.meta.parameters;
    if (oldName !== name) {
      delete parameters[name];
    }
    this.props.setMeta('parameters', { ...parameters, [name]: properties});
    this.setState({ edit: false });
  }

  handleDelete(name: string) {
    const { ...parameters } = this.props.meta.parameters;
    delete parameters[name];
    this.props.setMeta('parameters', parameters);
  }

  render() {
    const { meta } = this.props;
    const { edit } = this.state;

    return (
      <Panel>
        {
          edit === false && meta.parameters && meta.parameters.__meta.keys.map(name => (
            <Parameter
              key={name}
              name={name}
              parameter={meta.parameters[name]}
              onEdit={parameter => this.setState({ edit: name })}
              onDelete={() => this.handleDelete(name)}
            />
          ))
        }
        {
          edit === false && <Button value="Add parameter" onClick={() => this.setState({ edit: true })} />
        }
        {
          edit === true &&
            //$FlowFixMe
            <ParameterEditor onChange={parameter => this.handleAdd(parameter)} onCancel={() => this.setState({ edit: false })} />
        }
        {
          typeof edit === 'string' && (
            <ParameterEditor
              parameter={{ ...meta.parameters[edit], name: edit }}
              onChange={parameter => this.handleChange(edit, parameter)}
              onCancel={() => this.setState({ edit: false })}
            />
          )
        }
      </Panel>
    );
  }
}
