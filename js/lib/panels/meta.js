'use strict';

const _ = require('lodash')
    , React = require('react')
    ;

class Meta extends React.Component {
  constructor() {
    super();

    this.state = {
      name: '',
      description: '',
      runner_type: 'mistral-v2',
      entry_point: '',
      enable: true
    };
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

    const templates = {
      text: (field) =>
        <label className="st2-panel__field" key={ field.name }>
          <div className="st2-panel__field-name">{ field.name }</div>
          <input className="st2-panel__field-input" type="text" {...field.props} />
        </label>,

      textarea: (field) =>
        <label className="st2-panel__field" key={ field.name }>
          <div className="st2-panel__field-name">{ field.name }</div>
          <textarea className="st2-panel__field-input" {...field.props} ></textarea>
        </label>,

      select: (field) =>
        <label className="st2-panel__field" key={ field.name }>
          <div className="st2-panel__field-name">{ field.name }</div>
          <select className="st2-panel__field-input" {...field.props} >
            {
              _.map(field.options, (option) =>
                <option key={option.value} value={option.value}>{option.name}</option>
              )
            }
          </select>
        </label>,

      checkbox: (field) =>
        <label className="st2-panel__field" key={ field.name }>
          <input className="st2-panel__field-input" type="checkbox" {...field.props} />
          <span className="st2-panel__field-name">{ field.name }</span>
        </label>
    };

    return (
      <div className="st2-panel__panel st2-panel__meta">
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

module.exports = Meta;
