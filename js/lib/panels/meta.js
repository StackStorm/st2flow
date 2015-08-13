import _ from 'lodash';
import React from 'react';

import bem from '../util/bem';
import templates from '../util/forms';

const st2Class = bem('panel')
    ;

export default class Meta extends React.Component {
  static propTypes = {
    hide: React.PropTypes.bool
  }

  state = {
    name: '',
    description: '',
    runner_type: 'mistral-v2',
    entry_point: '',
    enable: true
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
      name: 'Enable',
      type: 'checkbox',
      props: {
        checked: this.state.enable,
        onChange: (event) => this.setState({ enable: event.target.checked })
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
        <form>
          <div className="st2-panel__header">
            Metadata
          </div>
          {
            _.map(fields, (field) => templates[field.type](field))
          }
        </form>
      </div>
    );
  }
}
