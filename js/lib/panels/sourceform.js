import _ from 'lodash';
import React from 'react';

import { API } from '../api';
import bem from '../util/bem';
import forms from '../util/forms';

const st2Class = bem('palette');

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
      api: def.api,
      auth: def.auth
    };
  }

  handleSubmit(event) {
    event.preventDefault();

    const result = {
      api: this.state.api,
      auth: this.state.auth
    };

    if (result.auth) {
      new API().connect(result, this.state.login, this.state.password)
        .then((client) => {
          result.token = client.token;
          this.props.onChange(result);
        })
        .catch((err) => {
          console.error(err);
        });
    } else {
      this.props.onChange(result);
    }

  }

  fill(index) {
    if (~index) { // eslint-disable-line no-bitwise
      const { api, auth } = this.props.sources[index];
      this.setState({ api, auth });
    } else {
      this.setState({
        api: undefined,
        auth: undefined
      });
    }
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
      return source.api === this.state.api;
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
      name: 'sep1',
      type: 'separator'
    }, {
      name: 'API',
      type: 'text',
      props: {
        value: this.state.api,
        onChange: (event) => this.setState({api: event.target.value}),
        placeholder: 'https://localhost:9101/',
        type: 'text',
        pattern: '(https?\\:)?//(-\\.)?([^\\s/?\\.#-]+\\.?)+(/[^\\s]*)?',
        required: true
      }
    }, {
      name: 'Auth',
      type: 'text',
      props: {
        value: this.state.auth,
        onChange: (event) => this.setState({auth: event.target.value}),
        placeholder: 'https://localhost:9100/',
        type: 'text',
        pattern: '(https?\\:)?//(-\\.)?([^\\s/?\\.#-]+\\.?)+(/[^\\s]*)?',
        required: false
      }
    }];

    if (this.state.auth) {
      fields = fields.concat([{
        name: 'sep2',
        type: 'separator'
      }, {
        name: 'Login',
        type: 'text',
        props: {
          value: this.state.login,
          onChange: (event) => this.setState({login: event.target.value}),
          required: true
        }
      }, {
        name: 'Password',
        type: 'password',
        props: {
          value: this.state.password,
          onChange: (event) => this.setState({password: event.target.value}),
          required: true
        }
      }]);
    }

    const props = {
      className: st2Class('source-form')
    };

    if (this.props.show) {
      props.className += ' ' + st2Class('source-form', 'visible');
    }

    return <div {...props} >
      {
        !this.props.defaultValue
        ? <div>No action source is set. Please enter credentials in the form below.</div>
        : null
      }
      <form onSubmit={this.handleSubmit.bind(this)}>
        {
          _.map(fields, (field) => forms[field.type](field))
        }
        <input type="submit"
          className="st2-panel__field-input"
          value="Save" />
      </form>
    </div>;
  }
}
