//@flow

import type { TaskRefInterface, TransitionRefInterface } from '@stackstorm/st2flow-model/interfaces';

import React, { Component } from 'react';
import { PropTypes } from 'prop-types';
import { connect } from 'react-redux';
import cx from 'classnames';

import { StringField, EnumField } from '@stackstorm/module-auto-form/fields';

import style from './style.css';

type TransitionProps = {
  transition: {
    from: TaskRefInterface,
    to: Array<TaskRefInterface>,
    condition?: string,
  },
  taskNames: Array<string> | string,
  selected: boolean,
  onChange?: Function,
};

@connect(
  null,
  (dispatch) => ({
    onChange: (transition: TransitionRefInterface, value: any) => {
      dispatch({
        type: 'MODEL_ISSUE_COMMAND',
        command: 'updateTransition',
        args: [
          transition,
          value,
        ],
      });
    },
  })
)
export default class Transition extends Component<TransitionProps, {}> {
  static propTypes = {
    transition: PropTypes.object.isRequired,
    taskNames: PropTypes.arrayOf(PropTypes.string),
    selected: PropTypes.bool,
    onChange: PropTypes.func,
  }

  style = style
  cache = {} // used to cache togglable data

  handleConditionChange(condition: string) {
    const { transition, onChange } = this.props;
    const { from, to } = transition;

    onChange && onChange(transition, { condition, from, to });
  }

  handleDoChange(to: string) {
    const { transition, onChange } = this.props;
    const { condition, from } = transition;

    onChange && onChange(transition, { condition, from, to: [{ name: to }] });
  }

  render() {
    const { transition, taskNames, selected } = this.props;
    const [ to ] = transition.to.map(t => t.name);

    return (
      <div className={cx(this.style.transition, { [this.style.transitionSelected]: selected })}>
        <div className={this.style.transitionLine} >
          <div className={this.style.transitionLabel}>
            When
          </div>
          <div className={this.style.transitionField}>
            <StringField value={transition.condition} onChange={v => this.handleConditionChange(v)} />
          </div>
          <div className={this.style.transitionButton} />
        </div>
        <div className={this.style.transitionLine} >
          <div className={this.style.transitionLabel}>
            Do
          </div>
          <div className={this.style.transitionField}>
            <EnumField value={to} spec={{ enum: taskNames }} onChange={v => this.handleDoChange(v)} />
          </div>
        </div>
        <div className={this.style.transitionLine} >
          <div className={this.style.transitionLabel}>
            Color
          </div>
          <div className={this.style.transitionField}>
            <StringField />
          </div>
        </div>
      </div>
    );
  }
}
