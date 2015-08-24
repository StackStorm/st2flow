import _ from 'lodash';
import React from 'react';

import bem from '../util/bem';
import templates from '../util/forms';

const st2Class = bem('panel')
    ;

export default class Meta extends React.Component {
  static propTypes = {
    hide: React.PropTypes.bool,
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
    name: '',
    description: '',
    runner_type: 'mistral-v2',
    entry_point: '',
    enabled: true
  }

  handleSubmit(event) {
    event.preventDefault();

    this.props.onSubmit(this.state);
  }

  componentWillReceiveProps(props) {
    this.setState(props.meta);
  }

  render() {
    const fields = [{
      name: 'Name',
      type: 'text',
      props: {
        value: this.state.name,
        onChange: (event) => this.setState({ name: event.target.value })
      }
    }, {
      name: 'Description',
      type: 'textarea',
      props: {
        value: this.state.description,
        onChange: (event) => this.setState({ description: event.target.value })
      }
    }, {
      name: 'Runner Type',
      type: 'select',
      props: {
        value: this.state.runner_type,
        onChange: (event) => this.setState({ runner_type: event.target.value })
      },
      options: [{
        name: 'Mistral v2',
        value: 'mistral-v2'
      }, {
        name: 'Action Chain',
        value: 'action-chain'
      }]
    }, {
      name: 'Entry Point',
      type: 'text',
      props: {
        value: this.state.entry_point,
        onChange: (event) => this.setState({ entry_point: event.target.value })
      }
    }, {
      name: 'Enabled',
      type: 'checkbox',
      props: {
        checked: this.state.enabled,
        onChange: (event) => this.setState({ enabled: event.target.checked })
      }
    }];

    const props = {
      className: `${st2Class('panel')} ${st2Class('meta')}`
    };

    if (this.props.hide) {
      props.className += ' ' + st2Class('panel', 'active');
    }

    return (
      <div {...props} >
        <form onSubmit={this.handleSubmit.bind(this)}>
          <div className="st2-panel__header">
            Metadata
          </div>
          {
            _.map(fields, (field) => templates[field.type](field))
          }
          <input type="submit"
              className="st2-panel__field-input"
              value="Save" />
        </form>
      </div>
    );
  }
}
