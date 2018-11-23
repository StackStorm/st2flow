//@flow

import type { TaskInterface, DeltaInterface } from '@stackstorm/st2flow-model';

import React, { Component } from 'react';
import { connect } from 'react-redux';
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

function workflowTransform(input, state) {
  return {
    ...input,
    source: state.workflowSource,
  };
}

function workflowDispatch(dispatch, source) {
  return dispatch({
    type: 'MODEL_ISSUE_COMMAND',
    command: 'applyDelta',
    args: [ null, source ],
  });
}

function metaTransform(input, state) {
  return {
    ...input,
    source: state.metaSource,
  };
}

function metaDispatch(dispatch, source) {
  return dispatch({
    type: 'META_ISSUE_COMMAND',
    command: 'applyDelta',
    args: [ null, source ],
  });
}

@connect(
  ({ flow }, { type }) => {
    const { ranges, errors } = flow;
    let input = { ranges, errors };

    if (type === 'workflow') {
      input = workflowTransform(input, flow);
    }

    if (type === 'meta') {
      input = metaTransform(input, flow);
    }

    return input;
  },
  (dispatch, { type }) => ({
    onEditorChange: (source) => {
      if (type === 'workflow') {
        return workflowDispatch(dispatch, source);
      }

      if (type === 'meta') {
        return metaDispatch(dispatch, source);
      }

      return false;
    },
  })
)
export default class Editor extends Component<{
  className?: string,
  ranges: Object,
  errors: Array<Error>,
  selectedTaskName: string,
  onTaskSelect: Function,
  source: string,
  onEditorChange: Function,
}> {
  static propTypes = {
    className: PropTypes.string,
    ranges: PropTypes.object,
    errors: PropTypes.array,
    selectedTaskName: PropTypes.string,
    onTaskSelect: PropTypes.func,
    source: PropTypes.string,
    onEditorChange: PropTypes.func,
  }

  componentDidMount() {
    const { source } = this.props;
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
    this.editor.setValue(source, -1);
    this.editor.on('change', this.handleEditorChange);

    if(this.props.selectedTaskName) {
      this.mountCallback = setTimeout(() => {
        this.handleTaskSelect({ name: this.props.selectedTaskName });
      }, 20);
    }
  }

  componentDidUpdate(prevProps: Object) {
    const { selectedTaskName, source } = this.props;
    if (selectedTaskName !== prevProps.selectedTaskName) {
      this.handleTaskSelect({ name: selectedTaskName });
    }

    if (source !== prevProps.source) {
      this.handleModelChange([], source);
    }
  }

  componentWillUnmount() {
    window.clearTimeout(this.deltaTimer);
    this.editor.removeListener('change', this.handleEditorChange);

    if(this.mountCallback) {
      clearTimeout(this.mountCallback);
    }
  }

  handleTaskSelect(task: TaskInterface) {
    if(this.selectMarker) {
      this.editor.session.removeMarker(this.selectMarker);
    }

    const [ start, end ] = this.props.ranges[task.name];
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
        this.props.onEditorChange(this.editor.getValue());
      }, DELTA_DEBOUNCE);
    }
  }

  handleModelChange = (deltas: Array<DeltaInterface>, yaml: string) => {
    if (yaml !== this.editor.getValue()) {
      // yaml was changed outside this editor
      this.editor.setValue(yaml, -1);
    }
  }

  get notifications() {
    return this.props.errors.map(err => ({
      type: 'error',
      message: err.message,
    }));
  }


  editor: any;
  selectMarker: any;
  deltaTimer = 0; // debounce timer
  mountCallback: any;

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
            />
          )}
      </div>
    );
  }
}
