import _ from 'lodash';
import React from 'react'; // eslint-disable-line no-unused-vars

const templates = {
  text: (field) =>
    <label className="st2-panel__field" key={ field.name }>
      <div className="st2-panel__field-name">{ field.name }{ field.required && ' *'}</div>
      <input className="st2-panel__field-input" type="text" {...field.props} />
      {
        field.description &&
          <div className="st2-panel__field-description">{ field.description }</div>
      }
    </label>,

  number: (field) =>
    <label className="st2-panel__field" key={ field.name }>
      <div className="st2-panel__field-name">{ field.name }{ field.required && ' *'}</div>
      <input className="st2-panel__field-input" type="number" {...field.props} />
    </label>,

  textarea: (field) =>
    <label className="st2-panel__field" key={ field.name }>
      <div className="st2-panel__field-name">{ field.name }{ field.required && ' *'}</div>
      <textarea className="st2-panel__field-input" {...field.props} ></textarea>
    </label>,

  password: (field) =>
    <label className="st2-panel__field" key={ field.name }>
      <div className="st2-panel__field-name">{ field.name }{ field.required && ' *'}</div>
      <input className="st2-panel__field-input" type="password" {...field.props} />
    </label>,

  select: (field) =>
    <label className="st2-panel__field" key={ field.name }>
      <div className="st2-panel__field-name">{ field.name }{ field.required && ' *'}</div>
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
    </label>,

  checkbox: (field) =>
    <label className="st2-panel__field" key={ field.name }>
      <input className="st2-panel__field-input" type="checkbox" {...field.props} />
      <div className="st2-panel__field-name">{ field.name }{ field.required && ' *'}</div>
    </label>,

  separator: (field) =>
    <label className="st2-panel__field" key={ field.name }>
      <hr />
    </label>,

  comment: (field) =>
    <div className="st2-panel__field" key={ field.name }>{ field.content }</div>
};

export default templates;
