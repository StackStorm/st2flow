import _ from 'lodash';
import React from 'react';

import { API } from '../api';
import bem from '../util/bem';
import forms from '../util/forms';

const st2Class = bem('header');

const sourceType = React.PropTypes.shape({
  api: React.PropTypes.string,
  auth: React.PropTypes.string
});

export default class SourceForm extends React.Component {
  static propTypes = {
    sources: React.PropTypes.arrayOf(sourceType),
    defaultValue: sourceType,
    onChange: React.PropTypes.func.isRequired
  }

  constructor(props) {
    super();

    const def = props.defaultValue || {};

    this.state = {
      model: {
        api: def.api,
        auth: def.auth,
        login: def.token && def.token.user
      }
    };
  }

  handleSubmit(event) {
    event.preventDefault();

    const result = {
      api: this.state.model.api,
      auth: this.state.model.auth
    };

    let promise;

    if (result.auth) {
      promise = new API().connect(result, this.state.model.login, this.state.model.password)
        .then((client) => {
          result.token = client.token;
          return this.props.onChange(result);
        })
        .catch((err) => {
          console.error(err);
        });
    } else {
      promise = this.props.onChange(result);
    }

    promise.then(() => {
      this.setState({ show: false });
    });
  }

  handleCancel() {
    this.setState({ show: false });
  }

  show() {
    this.setState({ show: true });
  }

  fill(index) {
    if (~index) { // eslint-disable-line no-bitwise
      const { api, auth } = this.props.sources[index];
      this.changeValue('api', api);
      this.changeValue('auth', auth);
    } else {
      this.changeValue('api');
      this.changeValue('auth');
    }
  }

  changeValue(name, value) {
    const model = this.state.model;
    if (_.isUndefined(value)) {
      delete model[name];
    } else {
      model[name] = value;
    }
    this.setState({ model });
  }

  render() {
    const options = [{
      name: 'New',
      value: -1
    }];

    _.each(this.props.sources, (e, i) => options.push({
      name: e.api,
      value: i
    }));

    const index = _.findIndex(this.props.sources, (source) => {
      return source.api === this.state.model.api;
    });

    let fields = [{
      name: 'Source',
      type: 'select',
      props: {
        value: index,
        onChange: (event) => this.fill(event.target.value)
      },
      options: options
    }, {
      name: 'API',
      type: 'text',
      props: {
        value: this.state.model.api,
        onChange: (event) => this.changeValue('api', event.target.value),
        placeholder: 'https://localhost:9101/',
        type: 'text',
        pattern: '(https?\:)?//(-\.)?([^\s/?\.#-]+\.?)+(/[^\s]*)?',
        required: true
      }
    }, {
      name: 'Auth',
      type: 'text',
      props: {
        value: this.state.model.auth,
        onChange: (event) => this.changeValue('auth', event.target.value),
        placeholder: 'https://localhost:9100/',
        type: 'text',
        pattern: '(https?\:)?//(-\.)?([^\s/?\.#-]+\.?)+(/[^\s]*)?',
        required: false
      }
    }];

    if (this.state.model.auth) {
      fields = fields.concat([{
        name: 'Login',
        type: 'text',
        props: {
          value: this.state.model.login,
          onChange: (event) => this.changeValue('login', event.target.value),
          required: true
        }
      }, {
        name: 'Password',
        type: 'password',
        props: {
          value: this.state.model.password,
          onChange: (event) => this.changeValue('password', event.target.value),
          required: true
        }
      }]);
    }

    const props = {
      className: st2Class('source')
    };

    if (this.state.show) {
      props.className += ' ' + st2Class('source', 'visible');
    }

    return <div {...props} >
      <div className={ st2Class('source-back') }
          onClick={ this.handleCancel.bind(this) } />
      <form className={ st2Class('source-form') }
          onSubmit={this.handleSubmit.bind(this)}>
        {
          _.map(fields, (field) => forms[field.type](field))
        }
        <input type="submit"
          className="st2-panel__field-button"
          value="Save" />
      </form>
    </div>;
  }
}
