import React, { Component } from 'react';
import { PropTypes } from 'prop-types';
import cx from 'classnames';

import style from './style.css';

const specialProperties = [ 'required', 'immutable', 'secret' ];

export default class Parameter extends Component {
  static propTypes = {
    name: PropTypes.string,
    parameter: PropTypes.shape({
      type: PropTypes.string,
      description: PropTypes.string,
    }),
    onUpdate: PropTypes.func,
    onDelete: PropTypes.func,
  }

  state = {};

  handleEdit() {
    this.setState({ edit: !this.state.edit });
  }

  handleDelete(e) {
    e.preventDefault();

    this.props.onDelete(this.state.parameter);
  }

  handleUpdate(parameter) {
    this.props.onUpdate(parameter);
    this.setState({ edit: false });
  }

  handleCancel() {
    this.setState({ edit: false });
  }

  style = style

  render() {
    const { name, parameter } = this.props;

    return (
      <div className={this.style.parameter}>
        <div className={this.style.parameterButtons}>
          <span className={cx('icon-edit', this.style.parameterButton)} onClick={e => this.handleEdit(e)} />
          <span className={cx('icon-delete', this.style.parameterButton)} onClick={e => this.handleDelete(e)} />
        </div>
        <div className={this.style.parameterName}>{ name }</div>
        <div className={this.style.parameterDescription}>{ parameter.description }</div>
        <div className={this.style.parameterTokens}>
          {
            specialProperties.map((name) =>
              <div key={name} className={cx(this.style.parameterToken, parameter[name] && this.style.active)}>{ name }</div>
            )
          }
        </div>
        {
          // this.state.edit && <ParameterEditor name={name} parameter={parameter}
          //     onSubmit={ this.handleUpdate.bind(this) }
          //     onCancel={ this.handleCancel.bind(this) }/>
        }
      </div>
    );
  }
}
