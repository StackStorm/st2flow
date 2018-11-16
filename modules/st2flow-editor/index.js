//@flow

import type { TaskInterface } from '@stackstorm/st2flow-yaml';
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

const Range = ace.acequire('ace/range').Range;
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
    selectedTaskName: PropTypes.string,
    onTaskSelect: PropTypes.func,
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
      highlightActiveLine: false,
    });

    this.editor.renderer.setPadding(10);
    this.editor.setValue(model.toYAML(), -1);
    this.editor.on('change', this.handleEditorChange);

    if(this.props.selectedTaskName) {
      this.mountCallback = setTimeout(() => {
        this.handleTaskSelect({ name: this.props.selectedTaskName });
      }, 20);
    }

    model.on('change', this.handleModelChange);
    model.on('yaml-error', this.handleModelError);
    model.on('undo', this.undo);
    model.on('redo', this.redo);
  }

  componentDidUpdate(prevProps) {
    if (this.props.selectedTaskName !== prevProps.selectedTaskName) {
      this.handleTaskSelect({ name: this.props.selectedTaskName });
    }
  }

  componentWillUnmount() {
    window.clearTimeout(this.deltaTimer);
    this.editor.removeListener('change', this.handleEditorChange);

    if(this.mountCallback) {
      clearTimeout(this.mountCallback);
    }

    const { model } = this.props;
    model.removeListener('change', this.handleModelChange);
    model.removeListener('yaml-error', this.handleModelError);
    model.removeListener('undo', this.undo);
    model.removeListener('redo', this.redo);
  }

  undo = () => {
    this.editor.undo();
    this.props.model.fromYAML(this.editor.getValue());
  }

  redo = () => {
    this.editor.redo();
    this.props.model.fromYAML(this.editor.getValue());
  }

  handleTaskSelect(task: TaskInterface) {
    if(this.selectMarker) {
      this.editor.session.removeMarker(this.selectMarker);
    }

    const [ start, end ] = this.props.model.getRangeForTask(task);
    const selection = new Range(start.row, 0, end.row, Infinity);
    const cursor = this.editor.selection.getCursor();

    if(selection.compare(cursor.row, cursor.column)) {
      this.editor.renderer.scrollCursorIntoView(start, 0.5);
    }
    else {
      this.editor.renderer.scrollCursorIntoView(cursor, 0.5);
    }

    this.selectMarker = this.editor.session.addMarker(selection, cx(this.style.activeTask), 'fullLine');

    this.props.onTaskSelect(task);
  }

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


  editor: any;
  selectMarker: any;
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
