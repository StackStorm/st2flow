import _ from 'lodash';
import React from 'react'; // eslint-disable-line no-unused-vars

export const templates = {
  text: (field) =>
    <label className={ 'st2-panel__field ' + (field.className || '') } key={ field.name }>
      <div className="st2-panel__field-name">{ field.name }{ field.props.required && ' *'}</div>
      <input className="st2-panel__field-input" type="text" {...field.props} />
      {
        field.description &&
          <div className="st2-panel__field-description">{ field.description }</div>
      }
    </label>,

  number: (field) =>
    <label className={ 'st2-panel__field ' + (field.className || '') } key={ field.name }>
      <div className="st2-panel__field-name">{ field.name }{ field.props.required && ' *'}</div>
      <input className="st2-panel__field-input" type="number" {...field.props} />
    </label>,

  textarea: (field) =>
    <label className={ 'st2-panel__field ' + (field.className || '') } key={ field.name }>
      <div className="st2-panel__field-name">{ field.name }{ field.props.required && ' *'}</div>
      <textarea className="st2-panel__field-input" {...field.props} ></textarea>
    </label>,

  password: (field) =>
    <label className={ 'st2-panel__field ' + (field.className || '') } key={ field.name }>
      <div className="st2-panel__field-name">{ field.name }{ field.props.required && ' *'}</div>
      <input className="st2-panel__field-input" type="password" {...field.props} />
    </label>,

  select: (field) =>
    <label className={ 'st2-panel__field ' + (field.className || '') } key={ field.name }>
      <div className="st2-panel__field-name">{ field.name }{ field.props.required && ' *'}</div>
      <div className="st2-panel__field-select">
        <select className="st2-panel__field-input" {...field.props} >
          {
            _.map(field.options, (option) => {
              if (!_.isPlainObject(option)) {
                option = {
                  name: option,
                  value: option
                };
              }
              return <option key={option.value} value={option.value}>{option.name}</option>;
            })
          }
        </select>
      </div>
    </label>,

  checkbox: (field) =>
    <label className={ 'st2-panel__field ' + (field.className || '') } key={ field.name }>
      <div className="st2-panel__field-name">{ field.name }{ field.props.required && ' *'}</div>
      <input className="st2-panel__field-input" type="checkbox" {...field.props} />
      <div className="st2-panel__field-toggle">
        <div className="st2-panel__field-toggle-item">yes</div>
        <div className="st2-panel__field-toggle-item">no</div>
      </div>
    </label>,

  token: (field) =>
    <label className={ 'st2-panel__field ' + (field.className || '') } key={ field.name }>
      <input className="st2-panel__field-input" type="checkbox" {...field.props} />
      <div className="st2-panel__parameter-token st2-panel__field-token">{ field.name }{ field.props.required && ' *'}</div>
    </label>,

  separator: (field) =>
    <label className={ 'st2-panel__field ' + (field.className || '') } key={ field.name }>
      <hr />
    </label>,

  group: (field) =>
    <div className={ 'st2-panel__field-group ' + (field.className || '') } key={ field.name }>
      {
        _.map(field.children, (field) => templates[field.type](field))
      }
    </div>,

  comment: (field) =>
    <div className={ 'st2-panel__field ' + (field.className || '') } key={ field.name }>{ field.content }</div>
};

export const specTypes = {
  string: function () {
    return {
      type: 'text',
      props: {
        value: this.props.value,
        onChange: (event) => this.handleChange(event.target.value)
      }
    };
  },
  integer: function () {
    return {
      type: 'number',
      props: {
        value: this.props.value,
        onChange: (event) => this.handleChange(parseInt(event.target.value))
      }
    };
  },
  number: function () {
    return {
      type: 'number',
      props: {
        step: 'any',
        value: this.props.value,
        onChange: (event) => this.handleChange(parseFloat(event.target.value))
      }
    };
  },
  boolean: function () {
    return {
      type: 'checkbox',
      props: {
        checked: this.props.value,
        onChange: (event) => this.handleChange(event.target.checked)
      }
    };
  },
  select: function (spec) {
    return {
      type: 'select',
      options: [{
        name: '- none -',
        value: '\u2205'
      }].concat(spec.enum),
      props: {
        value: this.props.value,
        onChange: (event) => {
          let value = event.target.value;

          if (value === '\u2205') {
            value = undefined;
          }

          return this.handleChange(value);
        }
      }
    };
  },
  array: function () {
    return {
      type: 'text',
      props: {
        value: (this.props.value || []).join(', '),
        onChange: (event) => {
          const value = event.target.value
            .split(',')
            .map(_.trim)
            ;

          return this.handleChange(value);
        }
      }
    };
  },
  object: function () {
    return {
      type: 'textarea',
      props: {
        ref: 'input',
        placeholder: this.state.jsonSerializedDefault,
        value: this.state.value || this.state.jsonSerializedValue,
        onChange: (event) => {
          let value;

          this.setState({ value: event.target.value });

          if (event.target.value) {
            try {
              value = JSON.parse(event.target.value);
            } catch (e) {
              return this.getRefNode('input').setCustomValidity(e);
            }
          }

          this.getRefNode('input').setCustomValidity('');

          return this.handleChange(value);
        }
      }
    };
  }
};

export class SpecField extends React.Component {
  static propTypes = {
    name: React.PropTypes.string,
    parameter: React.PropTypes.shape({
      type: React.PropTypes.oneOf(_.keys(specTypes)),
      description: React.PropTypes.string
    }),
    value: React.PropTypes.any,
    onChange: React.PropTypes.func
  }

  handleChange(value) {
    this.props.onChange(value);
  }

  componentWillMount() {
    this.componentWillReceiveProps(this.props);
  }

  componentWillReceiveProps(props) {
    const { parameter, value } = props;

    const jsonSerializedDefault = JSON.stringify(parameter.default, null, 2);
    const jsonSerializedValue = JSON.stringify(value, null, 2);

    this.setState({ jsonSerializedDefault, jsonSerializedValue });
  }

  render() {
    const spec = _.cloneDeep(this.props.parameter);

    if (spec.immutable) {
      return false;
    }

    spec.name = this.props.name;

    const field = {
      name: spec.name,
      description: spec.description,
      props: {
        required: spec.required,
        placeholder: spec.default
      }
    };

    let type = spec.type;

    if (spec.enum) {
      type = 'select';
    }

    _.merge(field, specTypes[type || 'string'].call(this, spec));

    return <Field key={field.name} ref="field" {...field} />;
  }

  getRefNode(ref) {
    return this.refs.field.refs[ref].getDOMNode();
  }
}

export class Field extends React.Component {
  static propTypes = {
    name: React.PropTypes.string,
    type: React.PropTypes.oneOf(_.keys(templates)),
    className: React.PropTypes.string,
    description: React.PropTypes.string,
    content: React.PropTypes.array,
    props: React.PropTypes.shape({
      required: React.PropTypes.bool,
      value: React.PropTypes.any,
      onChange: React.PropTypes.func
    })
  }

  render() {
    return !!templates[this.props.type] && templates[this.props.type](this.props);
  }
}

export default templates;
