import _ from 'lodash';
import React from 'react';

import bem from '../util/bem';
import templates from '../util/forms';

const st2Class = bem('popup')
    ;

export default class Run extends React.Component {
  static propTypes = {
    action: React.PropTypes.object,
    onSubmit: React.PropTypes.func
  }

  state = {
    action: {},
    parameters: {},
    show: false
  }

  handleSubmit(event) {
    event.preventDefault();

    this.props.onSubmit(this.state.action, this.state.parameters)
      .then(() => {
        this.setState({ show: false });
      })
      .catch((err) => {
        this.setState({ show: false });
        throw err;
      });
  }

  handleCancel(event) {
    event.preventDefault();

    this.setState({
      show: !this.state.show
    });
  }

  show() {
    this.setState({
      show: true
    });
  }

  changeValue(name, value) {
    const o = this.state.parameters;
    o[name] = value;
    this.setState(o);
  }

  componentWillReceiveProps(props) {
    const action = _.cloneDeep(props.action);

    if (!_.isEqual(this.state.action.parameters, action.parameters)) {
      this.setState({ parameters: {} });
    }

    this.setState({ action });
  }

  render() {
    const fields = _(this.state.action.parameters)
      .chain()
      .cloneDeep()
      .each((spec, name) => {
        spec.name = name;
      })
      .reject({ immutable: true })
      .map((spec) => {
        const field = {
          name: spec.name,
          description: spec.description,
          required: spec.required,
          props: {}
        };

        const types = {
          'string': {
            type: 'text',
            props: {
              value: this.state.parameters[field.name],
              onChange: (event) =>
                this.changeValue(field.name, event.target.value)
            }
          },
          'integer': {
            type: 'number',
            props: {
              value: this.state.parameters[field.name],
              onChange: (event) =>
                this.changeValue(field.name, event.target.value)
            }
          },
          'number': {
            type: 'number',
            props: {
              value: this.state.parameters[field.name],
              onChange: (event) =>
                this.changeValue(field.name, event.target.value)
            }
          },
          'boolean': {
            type: 'checkbox',
            props: {
              checked: this.state.parameters[field.name],
              onChange: (event) =>
                this.changeValue(field.name, event.target.checked)
            }
          },
          'select': {
            type: 'select',
            props: {
              value: this.state.parameters[field.name],
              onChange: (event) =>
                this.changeValue(field.name, event.target.value)
            }
          },
          'array': {
            type: 'text',
            props: {
              value: this.state.parameters[field.name],
              onChange: (event) =>
                this.changeValue(field.name, event.target.value)
            }
          },
          'object': null
        };

        _.assign(field, types[spec.type || 'string']);

        return field;
      })
      .value();

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
          <form onSubmit={this.handleSubmit.bind(this)}>
            <div className="st2-panel__header">
              Run workflow
            </div>
            {
              _.map(fields, (field) => templates[field.type] && templates[field.type](field))
            }
            <input type="submit"
                className="st2-panel__field-input"
                value="Run" />
          </form>
        </div>
      </div>
    );
  }
}
