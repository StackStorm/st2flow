import _ from 'lodash';
import React from 'react'; // eslint-disable-line no-unused-vars

const templates = {
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
      <div className="st2-panel__field-name">{ field.name }{ field.required && ' *'}</div>
      <input className="st2-panel__field-input" type="checkbox" {...field.props} />
      <div className="st2-panel__field-toggle">
        <div className="st2-panel__field-toggle-item">yes</div>
        <div className="st2-panel__field-toggle-item">no</div>
      </div>
    </label>,

  token: (field) =>
    <label className={ 'st2-panel__field ' + (field.className || '') } key={ field.name }>
      <input className="st2-panel__field-input" type="checkbox" {...field.props} />
      <div className="st2-panel__parameter-token st2-panel__field-token">{ field.name }{ field.required && ' *'}</div>
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

export default templates;
