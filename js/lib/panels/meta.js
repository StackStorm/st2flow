import _ from 'lodash';
import React from 'react';

import ACTIONS from '../util/default-actions';
import api from '../api';
import bem from '../util/bem';
import { Field, SpecField, specTypes } from '../util/forms';

const st2Class = bem('popup')
    , st2Panel = bem('panel')
    , st2Icon = bem('icon')
    ;

const paramTypes = _.keys(specTypes)
    , specialProperties = ['required', 'immutable', 'secret'];

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
        autoFocus: true,
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
    }];

    const enumField = {
      name: 'Enum',
      parameter: {
        type: 'array'
      },
      value: this.state.parameter.enum,
      onChange: (value) => this.changeValue('enum', value)
    };

    const defaultField = {
      name: 'Default',
      parameter: {
        type: this.state.parameter.type
      },
      value: this.state.parameter.default,
      onChange: (value) => this.changeValue('default', value)
    };

    const specialFields = [{
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
      <div className={ st2Panel('header') }>
        { this.props.name ? 'Edit parameter' : 'New parameter' }
      </div>
      {
        _.map(parameterFields, (field) => <Field key={field.name} {...field} />)
      }
      <SpecField {...enumField} />
      <SpecField {...defaultField} />
      {
        _.map(specialFields, (field) => <Field key={field.name} {...field} />)
      }
      <div className={ st2Panel('footer') }>
        <input type="submit"
            className={ st2Panel('field-input').and('field-input', 'inline') }
            value={ this.props.name ? 'Update' : 'Add' } />
        {
          this.props.onCancel && <input type="button"
            className={ st2Panel('field-input').and('field-input', 'inline').and('field-input', 'cancel') }
            onClick={ this.handleCancel.bind(this) }
            value="Cancel" />
        }
      </div>
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
    onUpdate: React.PropTypes.func,
    onSubmit: React.PropTypes.func
  }

  state = {
    meta: {
      name: '',
      pack: 'default',
      runner_type: 'mistral-v2',
      enabled: true,
      parameters: {}
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

    if (confirm('Do you really want to cancel without saving?')) { // eslint-disable-line no-alert
      this.setState({ show: false });
    }
  }

  handleParameterCreate(bundle) {
    const { name, ...parameter } = bundle
        , parameters = this.state.meta.parameters;

    parameters[name] = parameter;

    this.changeValue('parameters', parameters);
    this.changeValue('add', false);
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
    this.componentWillReceiveProps(this.props);
    this.setState({ show: true });
  }

  toggleAdd() {
    this.setState({ add: !this.state.add });
  }

  componentWillReceiveProps(props) {
    const { meta } = props;

    if (!_.isEmpty(meta)) {
      this.setState({ meta: _.cloneDeep(meta) });
    }
  }

  componentDidMount() {
    api.on('connect', (client) => {
      client.packs.list()
        .catch(() => {
          return _(ACTIONS).chain()
            .map((action) => ({ name: action.pack }))
            .push({ name: 'default' })
            .uniq('name')
            .value();
        })
        .then((packs) => {
          this.setState({ packs });
        });
    });
  }

  componentDidUpdate(prevProps, prevState) {
    this.props.onUpdate && this.props.onUpdate(prevProps, prevState, this.props, this.state);
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
          disabled: !!this.props.meta.id,
          onChange: (event) => {
            this.changeValue('pack', event.target.value);
            if (meta.pack && meta.name) {
              this.changeValue('ref', [meta.pack, meta.name].join('.'));
              this.changeValue('entry_point', `workflows/${ meta.name }.yaml`);
            } else {
              this.changeValue('ref', undefined);
            }
          }
        },
        options: _(this.state.packs).pluck('name').union(['default']).value()
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
          disabled: !!this.props.meta.id,
          onChange: (event) => {
            this.changeValue('name', event.target.value);
            if (meta.pack && meta.name) {
              this.changeValue('ref', [meta.pack, meta.name].join('.'));
              this.changeValue('entry_point', `workflows/${ meta.name }.yaml`);
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
        onChange: (event) => this.changeValue('enabled', event.target.checked)
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
      className: st2Class(null),
      onClick: this.handleCancel.bind(this)
    };

    if (this.state.show) {
      props.className = props.className.and(null, 'active');
    }

    const contentProps = {
      className: st2Class('content'),
      onClick: (event) => event.stopPropagation()
    };

    return (
      <div {...props} >
        <div className={st2Class('rubber')}>
          <div {...contentProps} >
            <div className={ st2Class('column').and('form') }>
              <form id="metaform" onSubmit={this.handleSubmit.bind(this)}>
                <div className={ st2Panel('header') }>
                  Metadata
                </div>
                {
                  _.map(fields, (field) => <Field key={field.name} {...field} />)
                }
              </form>
              <div className={ st2Panel('header') }>
                Parameters
              </div>
              {
                _.map(this.state.meta.parameters, (parameter, name) =>
                  <Parameter key={name} name={name} parameter={parameter}
                      onUpdate={ this.handleParameterUpdate.bind(this, name) }
                      onDelete={ this.handleParameterDelete.bind(this, name) }/>
                )
              }
              {
                !this.state.add &&
                  <div className={ st2Panel('footer') } >
                    <input type="button"
                        className={ st2Panel('field-input').and('field-input', 'inline') }
                        onClick={ this.toggleAdd.bind(this) }
                        value="Add parameter" />
                  </div>
              }
              {
                this.state.add &&
                  <ParameterEditor
                      onCancel={ this.toggleAdd.bind(this) }
                      onSubmit={ this.handleParameterCreate.bind(this) }/>
              }
            </div>
            <code className={ st2Class('column').and('code') }>
              { JSON.stringify(this.state.meta, null, 2) }
            </code>
            <div className={ st2Class('status') }>
              <input type="submit"
                  form="metaform"
                  className={ st2Panel('field-input').and('field-input', 'inline') }
                  value="Update" />
              <input type="button"
                  className={ st2Panel('field-input').and('field-input', 'inline').and('field-input', 'cancel') }
                  onClick={ this.handleCancel.bind(this) }
                  value="Cancel" />
            </div>
          </div>
        </div>
      </div>
    );
  }
}
