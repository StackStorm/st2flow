import _ from 'lodash';
import React from 'react';

import api from '../api';
import bem from '../util/bem';
import templates from '../util/forms';

const st2Class = bem('popup')
    , st2Panel = bem('panel')
    , st2Icon = bem('icon')
    ;

const paramTypes = ['string', 'number', 'integer', 'array']
    , specialProperties = ['required', 'immutable'];

export class Parameter extends React.Component {
  static propTypes = {
    name: React.PropTypes.string,
    parameter: React.PropTypes.shape({
      type: React.PropTypes.oneOf(paramTypes),
      description: React.PropTypes.string
    }),
    onUpdate: React.PropTypes.func,
    onDelete: React.PropTypes.func
  }

  state = {};

  handleEdit() {
    this.setState({ edit: !this.state.edit });
  }

  handleDelete() {
    event.preventDefault();

    this.props.onDelete(this.state.parameter);
  }

  handleUpdate(parameter) {
    this.props.onUpdate(parameter);
    this.setState({ edit: false });
  }

  handleCancel() {
    this.setState({ edit: false });
  }

  render() {
    const { name, parameter } = this.props;

    return <div className={ st2Panel('parameter') }>
      <div className={ st2Panel('parameter-buttons') }>
        <span className={ [st2Icon('edit'), st2Panel('parameter-button')].join(' ') }
          onClick={ this.handleEdit.bind(this) }/>
        <span className={ [st2Icon('delete'), st2Panel('parameter-button')].join(' ') }
          onClick={ this.handleDelete.bind(this) }/>
      </div>
      <div className={ st2Panel('parameter-name') }>{ name }</div>
      <div className={ st2Panel('parameter-description') }>{ parameter.description }</div>
      <div className={ st2Panel('parameter-tokens') }>
        {
          _.map(specialProperties, (name) =>
            parameter[name] && <div key={name} className={ st2Panel('parameter-token') }>{ name }</div>
          )
        }
      </div>
      {
        this.state.edit && <ParameterEditor name={name} parameter={parameter}
            onSubmit={ this.handleUpdate.bind(this) }
            onCancel={ this.handleCancel.bind(this) }/>
      }
    </div>;
  }
}

export class ParameterEditor extends React.Component {
  static propTypes = {
    name: React.PropTypes.string,
    parameter: React.PropTypes.shape({
      type: React.PropTypes.oneOf(paramTypes),
      description: React.PropTypes.string
    }),
    onSubmit: React.PropTypes.func,
    onCancel: React.PropTypes.func
  }

  state = {
    parameter: {
      type: 'string'
    }
  };

  handleSubmit(event) {
    event.preventDefault();

    this.props.onSubmit(this.state.parameter);
    this.setState({
      parameter: {
        type: 'string'
      }
    });
  }

  handleCancel(event) {
    event.preventDefault();

    this.props.onCancel();
  }

  componentWillMount() {
    this.componentWillReceiveProps(this.props);
  }

  componentWillReceiveProps(props) {
    let { name, parameter } = props;

    if (!_.isEmpty(parameter)) {
      parameter = _.clone(parameter);
      parameter.name = name;
      this.setState({ parameter });
    }
  }

  changeValue(name, value) {
    const o = this.state.parameter;
    o[name] = value;
    this.setState(o);
  }

  render() {
    const parameterFields = [{
      name: 'Name',
      type: 'text',
      props: {
        required: true,
        value: this.state.parameter.name,
        onChange: (event) => this.changeValue('name', event.target.value || undefined)
      }
    }, {
      name: 'Type',
      type: 'select',
      props: {
        required: true,
        value: this.state.parameter.type,
        onChange: (event) => this.changeValue('type', event.target.value)
      },
      options: paramTypes
    }, {
      name: 'Description',
      type: 'textarea',
      props: {
        value: this.state.parameter.description,
        onChange: (event) => this.changeValue('description', event.target.value || undefined)
      }
    }, {
      name: 'Default',
      type: 'text',
      props: {
        value: this.state.parameter.default,
        onChange: (event) => this.changeValue('default', event.target.value || undefined)
      }
    }, {
      name: 'special',
      type: 'group',
      children: _.map(specialProperties, (name) => {
        return {
          name: name,
          type: 'token',
          props: {
            checked: this.state.parameter[name],
            onChange: (event) => this.changeValue(name, event.target.checked || undefined)
          }
        };
      })
    }];

    return <form className={ st2Panel('parameter-form') }
        onSubmit={this.handleSubmit.bind(this)}>
      <div className="st2-panel__header">
        { this.props.name ? 'Edit parameter' : 'New parameter' }
      </div>
      {
        _.map(parameterFields, (field) => templates[field.type](field))
      }
      <input type="submit"
          className="st2-panel__field-input st2-panel__field-input--inline"
          value={ this.props.name ? 'Update' : 'Add' } />
      {
        this.props.onCancel && <input type="button"
          className="st2-panel__field-input st2-panel__field-input--inline st2-panel__field-input--cancel"
          onClick={ this.handleCancel.bind(this) }
          value="Cancel" />
      }
    </form>;
  }
}

export default class Meta extends React.Component {
  static propTypes = {
    meta: React.PropTypes.shape({
      name: React.PropTypes.string,
      description: React.PropTypes.string,
      runner_type: React.PropTypes.oneOf(['mistral-v2', 'action-chain']),
      entry_point: React.PropTypes.string,
      enabled: React.PropTypes.bool
    }),
    onSubmit: React.PropTypes.func
  }

  state = {
    meta: {
      name: '',
      pack: 'default',
      runner_type: 'mistral-v2',
      enabled: true
    },
    show: false
  }

  handleSubmit(event) {
    event.preventDefault();

    this.props.onSubmit(this.state.meta);
    this.setState({ show: false });
  }

  handleCancel(event) {
    event.preventDefault();

    this.setState({ show: false });
  }

  handleParameterCreate(bundle) {
    const { name, ...parameter } = bundle
        , parameters = this.state.meta.parameters;

    parameters[name] = parameter;

    this.changeValue('parameters', parameters);
  }

  handleParameterUpdate(oldName, bundle) {
    const { name, ...parameter } = bundle
        , parameters = this.state.meta.parameters;

    if (name !== oldName) {
      delete parameters[oldName];
    }

    parameters[name] = parameter;

    this.changeValue('parameters', parameters);
  }

  handleParameterDelete(name) {
    const parameters = this.state.meta.parameters;

    this.changeValue('parameters', _.omit(parameters, (value, key) => name === key));
  }

  show() {
    this.setState({ show: true });
  }

  componentWillReceiveProps(props) {
    const { meta } = props;

    if (!_.isEmpty(meta)) {
      this.setState({ meta });
    }
  }

  componentDidMount() {
    api.on('connect', (client) => {
      client.packs.list()
        .then((packs) => {
          this.setState({ packs });
        });
    });
  }

  changeValue(name, value) {
    const o = this.state.meta;
    o[name] = value;
    this.setState(o);
  }

  render() {
    const meta = this.state.meta;
    const fields = [{
      name: 'ref',
      type: 'group',
      children: [{
        name: 'Pack',
        type: 'select',
        className: st2Panel('field-group-ref'),
        props: {
          required: true,
          value: this.state.meta.pack,
          onChange: (event) => {
            this.changeValue('pack', event.target.value);
            if (meta.pack && meta.name) {
              this.changeValue('ref', [meta.pack, meta.name].join('.'));
            } else {
              this.changeValue('ref', undefined);
            }
          }
        },
        options: _.pluck(this.state.packs, 'name')
      }, {
        name: 'dot',
        type: 'comment',
        className: st2Panel('field-group-dot'),
        content: '.'
      }, {
        name: 'Name',
        type: 'text',
        className: st2Panel('field-group-ref'),
        props: {
          required: true,
          value: this.state.meta.name,
          onChange: (event) => {
            this.changeValue('name', event.target.value);
            if (meta.pack && meta.name) {
              this.changeValue('ref', [meta.pack, meta.name].join('.'));
            } else {
              this.changeValue('ref', undefined);
            }
          }
        }
      }]
    }, {
      name: 'Description',
      type: 'textarea',
      props: {
        value: this.state.meta.description,
        onChange: (event) => this.changeValue('description', event.target.value || undefined)
      }
    }, {
      name: 'Enabled',
      type: 'checkbox',
      props: {
        checked: this.state.meta.enabled,
        onChange: (event) => this.changeValue('enabled', event.target.checked || undefined)
      }
    }, {
    //   name: 'Runner Type',
    //   type: 'select',
    //   props: {
    //     value: this.state.meta.runner_type,
    //     onChange: (event) => this.changeValue('runner_type', event.target.value)
    //   },
    //   options: [{
    //     name: 'Mistral v2',
    //     value: 'mistral-v2'
    //   }, {
    //     name: 'Action Chain',
    //     value: 'action-chain'
    //   }]
    // }, {
      name: 'Entry Point',
      type: 'text',
      props: {
        required: true,
        value: this.state.meta.entry_point,
        onChange: (event) => this.changeValue('entry_point', event.target.value || undefined)
      }
    }];

    const props = {
      className: `${st2Class(null)}`,
      onClick: this.handleCancel.bind(this)
    };

    if (this.state.show) {
      props.className += ' ' + st2Class(null, 'active');
    }

    const contentProps = {
      className: st2Class('content'),
      onClick: (event) => event.stopPropagation()
    };

    return (
      <div {...props} >
        <div {...contentProps} >
          <div className={ st2Class('column') + ' ' + st2Class('form') }>
            <form id="metaform" onSubmit={this.handleSubmit.bind(this)}>
              <div className="st2-panel__header">
                Metadata
              </div>
              {
                _.map(fields, (field) => templates[field.type](field))
              }
            </form>
            <div className="st2-panel__header">
              Parameters
            </div>
            {
              _.map(this.state.meta.parameters, (parameter, name) =>
                <Parameter key={name} name={name} parameter={parameter}
                    onUpdate={ this.handleParameterUpdate.bind(this, name) }
                    onDelete={ this.handleParameterDelete.bind(this, name) }/>
              )
            }
            <ParameterEditor
                onSubmit={ this.handleParameterCreate.bind(this) }/>
            <input type="submit"
                form="metaform"
                className="st2-panel__field-input"
                value="Update meta" />
          </div>
          <code className={ st2Class('column') + ' ' + st2Class('code') }>
            { JSON.stringify(this.state.meta, null, 2) }
          </code>
        </div>
      </div>
    );
  }
}
