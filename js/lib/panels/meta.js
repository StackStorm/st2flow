import _ from 'lodash';
import React from 'react';

import bem from '../util/bem';
import templates from '../util/forms';

const st2Class = bem('popup')
    ;

export default class Meta extends React.Component {
  static propTypes = {
    show: React.PropTypes.bool,
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
    doc: {
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

    this.props.onSubmit(this.state.doc);
  }

  handleCancel(event) {
    event.preventDefault();

    this.setState({ show: !this.state.show });
  }

  show() {
    this.setState({ show: true });
  }

  componentWillReceiveProps(props) {
    this.setState({
      doc: props.meta,
      show: props.show
    });
  }

  changeValue(name, value) {
    const o = this.state.doc;
    o[name] = value;
    this.setState(o);
  }

  render() {
    const doc = this.state.doc;
    const fields = [{
      name: 'Pack',
      type: 'select',
      props: {
        value: this.state.doc.pack,
        onChange: (event) => {
          this.changeValue('pack', event.target.value);
          this.changeValue('ref', [doc.pack, doc.name].join('.'));
        }
      },
      options: ['examples', 'default']
    }, {
      name: 'Name',
      type: 'text',
      props: {
        value: this.state.doc.name,
        onChange: (event) => {
          this.changeValue('name', event.target.value);
          this.changeValue('ref', [doc.pack, doc.name].join('.'));
        }
      }
    }, {
      name: 'Description',
      type: 'textarea',
      props: {
        value: this.state.doc.description,
        onChange: (event) => this.changeValue('description', event.target.value)
      }
    }, {
      name: 'Runner Type',
      type: 'select',
      props: {
        value: this.state.doc.runner_type,
        onChange: (event) => this.changeValue('runner_type', event.target.value)
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
        value: this.state.doc.entry_point,
        onChange: (event) => this.changeValue('entry_point', event.target.value)
      }
    }, {
      name: 'Enabled',
      type: 'checkbox',
      props: {
        checked: this.state.doc.enabled,
        onChange: (event) => this.changeValue('enabled', event.target.checked)
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
