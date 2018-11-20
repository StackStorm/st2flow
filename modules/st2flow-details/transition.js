//@flow

import type { TaskRefInterface } from '@stackstorm/st2flow-model/interfaces';

import React, { Component } from 'react';
import { PropTypes } from 'prop-types';
import cx from 'classnames';

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

  constructor({ transition }) {
    super();

    this.state = {
      publishOn: transition.publish && Object.keys(transition.publish).length > 0,
    };
  }

  style = style
  cache = {} // used to cache togglable data

  onPublishToggle = (val) => {
    if(val) {
      if(this.cache.publish) {
        this.props.onChange('publish', this.cache.publish);
        delete this.cache.publish;
      }
    }
    else {
      this.cache.publish = this.props.transition.publish;
      this.props.onChange('publish', null);
    }

    this.setState({ publishOn: val });
  }

  handlePublishChange(index, key, val) {
    const { transition: { publish }, onChange } = this.props;
    publish[index] = { [key]: val };
    onChange('publish', publish);
  }

  addPublishField = (ev) => {
    let { transition: { publish } } = this.props;
    const newVal = { key: '<% result().val %>' };

    if(this.state.publishOn) {
      publish.push(newVal);
    }
    else {
      publish = [ newVal ];
      this.setState({ publishOn: true });
    }

    this.props.onChange('publish', publish);
  }

  render() {
    const { transition, onChange } = this.props;
    const { publishOn } = this.state;
    const to = transition.to.map(({ name }) => name);
    const publish = transition.publish;

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
            <Toggle value={publishOn} onChange={this.onPublishToggle} />
          </div>
        </div>
        { publish.map((obj, i) => {
          const key = Object.keys(obj)[0];
          const val = obj[key];

          return (
            <div className={this.style.transitionLine} key={`publish-${key}`} >
              <div className={cx(this.style.transitionLabel, this.style.transitionPublishLabel)}>
                Key:
              </div>
              <div className={this.style.transitionField}>
                <StringField value={key} onChange={k => this.handlePublishChange(i, k, val)} />
              </div>
              <div className={cx(this.style.transitionLabel, this.style.transitionPublishLabel)}>
                Value:
              </div>
              <div className={this.style.transitionField}>
                <StringField value={val} onChange={v => this.handlePublishChange(i, key, v)} />
              </div>
            </div>
          );
        })}
        <div className={this.style.transitionLine}>
          <div className={this.style.transitionField}>
            <i className="icon-plus" onClick={this.addPublishField} />
          </div>
        </div>
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
