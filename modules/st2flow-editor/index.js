import React, { Component } from 'react';
import { PropTypes } from 'prop-types';
import cx from 'classnames';

import ace from 'brace';
import 'brace/ext/language_tools';
import 'brace/mode/yaml';

import style from './style.css';

const editorId = 'editor_mount_point';

export default class Editor extends Component {
  static propTypes = {
    className: PropTypes.string,
    model: PropTypes.object.isRequired,
  }

  constructor(...args) {
    super(...args);
    this.state = {
      error: null,
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
      showPrintMargin: false
    });
    this.editor.setValue(model.tokenSet.yaml, -1);
    this.editor.on('change', this.handleEditorChange);

    model.on('change', this.handleModelChange);
    model.on('error', this.handleModelError);
  }

  componentWillUnmount() {
    const { model } = this.props;

    clearTimeout(this.deltaTimer);
    this.editor.removeListener('change', this.handleEditorChange);
    model.removeListener('change', this.handleModelChange);
    model.removeListener('error', this.handleModelError);
  }

  handleEditorChange = (delta) => {
    clearTimeout(this.deltaTimer);

    // Only if the user is actually typing
    if(this.editor.isFocused()) {
      this.deltaTimer = setTimeout(() => {
        this.props.model.applyDelta(delta, this.editor.getValue());
      }, 300);
    }
  }

  handleModelChange = (deltas, yaml) => {
    this.setState({ error: null });

    if (yaml !== this.editor.getValue()) {
      // yaml was changed outside this editor
      this.editor.setValue(yaml, -1);
    }
  }

  handleModelError = (err) => {
    // error may or may not be an array
    const error = err && [].concat(err).reduce((str, e) => str += `${e.message}\n`, '');
    this.setState({ error });
  }

  deltaTimer = 0; // debounce timer
  style = style

  render() {
    return (
      <div className={cx(this.props.className, this.style.component)}>
        <div
          id={editorId}
          className={this.style.editor}
        />
        {!this.state.error ?
          null : (
            <div className={this.style['yaml-error']}>
              {this.state.error}
            </div>
          )}
      </div>
    );
  }
}
