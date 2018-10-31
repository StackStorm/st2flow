//@flow

import type { ModelInterface, DeltaInterface } from '@stackstorm/st2flow-model';
import type { NotificationInterface } from '@stackstorm/st2flow-notifications';

import React, { Component } from 'react';
import { PropTypes } from 'prop-types';
import cx from 'classnames';

import ace from 'brace';
import 'brace/ext/language_tools';
import 'brace/mode/yaml';
import Notifications from '@stackstorm/st2flow-notifications';

import style from './style.css';

const editorId = 'editor_mount_point';
const DELTA_DEBOUNCE = 300; // ms

export default class Editor extends Component<{
  className?: string,
  model: ModelInterface,
}, {
  errors: Array<Error>
}> {
  static propTypes = {
    className: PropTypes.string,
    model: PropTypes.object,
  }

  constructor(...args: any) {
    super(...args);

    this.state = {
      errors: [],
    };
  }

  componentDidMount() {
    const { model } = this.props;
    ace.acequire('ace/ext/language_tools');

    this.editor = ace.edit(editorId);
    this.editor.$blockScrolling = Infinity;
    this.editor.setOptions({
      mode: 'ace/mode/yaml',
      tabSize: 2,
      useSoftTabs: true,
      showPrintMargin: false,
    });

    this.editor.setValue(model.toYAML(), -1);
    this.editor.on('change', this.handleEditorChange);

    model.on('change', this.handleModelChange);
    model.on('yaml-error', this.handleModelError);
  }

  componentWillUnmount() {
    window.clearTimeout(this.deltaTimer);
    this.editor.removeListener('change', this.handleEditorChange);

    const { model } = this.props;
    model.removeListener('change', this.handleModelChange);
    model.removeListener('yaml-error', this.handleModelError);
  }

  editor: any
  deltaTimer: number

  handleEditorChange = (delta: DeltaInterface) => {
    window.clearTimeout(this.deltaTimer);

    // Only if the user is actually typing
    if(this.editor.isFocused()) {
      this.deltaTimer = window.setTimeout(() => {
        this.props.model.applyDelta(delta, this.editor.getValue());
      }, DELTA_DEBOUNCE);
    }
  }

  handleModelChange = (deltas: Array<DeltaInterface>, yaml: string) => {
    this.setState({ errors: [] });

    if (yaml !== this.editor.getValue()) {
      // yaml was changed outside this editor
      this.editor.setValue(yaml, -1);
    }
  }

  handleModelError = (err: Error) => {
    // error may or may not be an array
    this.setState({ errors: err && [].concat(err) || [] });
  }

  handleNotificationRemove = (notification: NotificationInterface) => {
    switch(notification.type) {
      case 'error':
        this.setState({
          errors: this.state.errors.filter(err => err.message !== notification.message),
        });
        break;
    }
  }

  get notifications() {
    return this.state.errors.map(err => ({
      type: 'error',
      message: err.message,
    }));
  }

  deltaTimer = 0; // debounce timer
  style = style;

  render() {
    return (
      <div className={cx(this.props.className, this.style.component)}>
        <div
          id={editorId}
          className={this.style.editor}
        />
        {!this.notifications.length ?
          null : (
            <Notifications
              className={style.notifications}
              position="top"
              notifications={this.notifications}
              onRemove={this.handleNotificationRemove}
            />
          )}
      </div>
    );
  }
}
