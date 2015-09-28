import _ from 'lodash';
import React from 'react';

import api from '../api';
import bem from '../util/bem';
import templates from '../util/forms';

const st2Class = bem('popup')
    , st2Panel = bem('panel')
    ;

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
      description: '',
      runner_type: 'mistral-v2',
      entry_point: '',
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
          value: this.state.meta.pack,
          onChange: (event) => {
            this.changeValue('pack', event.target.value);
            this.changeValue('ref', [meta.pack, meta.name].join('.'));
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
          value: this.state.meta.name,
          onChange: (event) => {
            this.changeValue('name', event.target.value);
            this.changeValue('ref', [meta.pack, meta.name].join('.'));
          }
        }
      }]
    }, {
      name: 'Description',
      type: 'textarea',
      props: {
        value: this.state.meta.description,
        onChange: (event) => this.changeValue('description', event.target.value)
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
        value: this.state.meta.entry_point,
        onChange: (event) => this.changeValue('entry_point', event.target.value)
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
          <form onSubmit={this.handleSubmit.bind(this)}>
            <div className="st2-panel__header">
              Metadata
            </div>
            {
              _.map(fields, (field) => templates[field.type](field))
            }
            <input type="submit"
                className="st2-panel__field-input"
                value="Update meta" />
          </form>
        </div>
      </div>
    );
  }
}
