//@flow

import type { TaskRefInterface } from '@stackstorm/st2flow-model/interfaces';

import React, { Component } from 'react';
import { PropTypes } from 'prop-types';

import StringField from '@stackstorm/module-auto-form/fields/string';
import ArrayField from '@stackstorm/module-auto-form/fields/array';
import { Toggle } from '@stackstorm/module-forms/button.component';

import style from './style.css';

export default class Transition extends Component<{
  transition: {
    to: Array<TaskRefInterface>,
    condition?: string,
    publish?: string,
  },
  onChange: Function,
}> {
  static propTypes = {
    transition: PropTypes.object.isRequired,
    onChange: PropTypes.func,
  }

  style = style

  render() {
    const { transition, onChange } = this.props;

    const to = transition.to.map(({ name }) => name);
    
    return (
      <div className={this.style.transition}>
        <div className={this.style.transitionLine} >
          <div className={this.style.transitionLabel}>
            When
          </div>
          <div className={this.style.transitionField}>
            <StringField value={transition.condition} onChange={v => onChange('when', v)} />
          </div>
          <div className={this.style.transitionButton} />
        </div>
        <div className={this.style.transitionLine} >
          <div className={this.style.transitionLabel}>
            Publish
          </div>
          <div className={this.style.transitionField}>
            <Toggle />
          </div>
        </div>
        { transition.publish && (
          <div className={this.style.transitionLine} >
            <div className={this.style.transitionField}>
              <StringField /><StringField />
            </div>
            <div className={this.style.transitionField}>
              <i className="icon-plus2" />
            </div>
          </div>
        )}
        <div className={this.style.transitionLine} >
          <div className={this.style.transitionLabel}>
            Do
          </div>
          <div className={this.style.transitionField}>
            <ArrayField value={to} onChange={v => onChange('do', v)} />
          </div>
          <div className={this.style.transitionButton}>
            <i className="icon-plus2" />
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
