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

export default class Editor extends Component {
  static propTypes = {
    className: PropTypes.string,
    model: PropTypes.object,
  }

  constructor(...args) {
    super(...args);

    this.state = {
      errors: [],
    };
  }

  componentDidMount() {
    this.handleEditorChange = this.handleEditorChange.bind(this);
    this.handleModelChange = this.handleModelChange.bind(this);
    this.handleModelError = this.handleModelError.bind(this);
    this.handleNotificationRemove = this.handleNotificationRemove.bind(this);

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

    this.editor.setValue(model.yaml, -1);
    this.editor.on('change', this.handleEditorChange);

    model.on('change', this.handleModelChange);
    model.on('yaml-error', this.handleModelError);
  }

  componentWillUnmount() {
    clearTimeout(this.deltaTimer);
    this.editor.removeListener('change', this.handleEditorChange);

    const { model } = this.props;
    model.removeListener('change', this.handleModelChange);
    model.removeListener('yaml-error', this.handleModelError);
  }

  handleEditorChange(delta) {
    clearTimeout(this.deltaTimer);

    // Only if the user is actually typing
    if(this.editor.isFocused()) {
      this.deltaTimer = setTimeout(() => {
        this.props.model.applyDelta(delta, this.editor.getValue());
      }, DELTA_DEBOUNCE);
    }
  }

  handleModelChange(deltas, yaml) {
    this.setState({ errors: [] });

    if (yaml !== this.editor.getValue()) {
      // yaml was changed outside this editor
      this.editor.setValue(yaml, -1);
    }
  }

  handleModelError(err) {
    // error may or may not be an array
    this.setState({ errors: err && [].concat(err) || [] });
  }

  handleNotificationRemove(notification) {
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
