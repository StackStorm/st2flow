import React from 'react';

import bem from '../util/bem';

const st2Class = bem('viewer')
    ;

export default class Name extends React.Component {
  static propTypes = {
    value: React.PropTypes.string,
    onChange: React.PropTypes.func
  }

  constructor(props) {
    super(props);

    this.state = {
      value: this.props.value
    };
  }

  focus() {
    this.refs.field.focus();
  }

  blur() {
    this.refs.field.blur();
  }

  handleBlur(e) {
    if (this.props.onChange) {
      return this.props.onChange(e, this.state.value);
    }
  }

  handleSubmit(e) {
    e.preventDefault();
    this.blur();
  }

  handleChange(e) {
    this.setState({ value: e.target.value });
  }

  componentWillReceiveProps(props) {
    if (this.props.value !== props.value) {
      this.setState({ value: props.value });
    }
  }

  render() {
    const nameFormProps = {
      className: st2Class('node-name-form'),
      onSubmit: (e) => this.handleSubmit(e)
    };

    const nameFieldProps = {
      type: 'text',
      className: st2Class('node-name'),
      ref: 'field',
      value: this.state.value,
      onChange: (e) => this.handleChange(e),
      onBlur: () => this.handleBlur()
    };

    return <form {...nameFormProps} >
      <input {...nameFieldProps} />
    </form>;
  }
}
