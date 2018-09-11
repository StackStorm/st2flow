import React, { Component } from 'react';
import { PropTypes } from 'prop-types';

import ace from 'brace';
import 'brace/ext/language_tools';
import 'brace/mode/yaml';

import style from './style.css';

const editorId = 'editor_mount_point';

export default class Editor extends Component {
  static propTypes = {
    model: PropTypes.object.isRequired,
  }

  componentDidMount() {
    const { model } = this.props;
 
    ace.acequire('ace/ext/language_tools');

    this.editor = ace.edit(editorId);
    this.editor.getSession().setOptions({
      mode: 'ace/mode/yaml',
      tabSize: 2,
      useSoftTabs: true,
    });

    this.editor.$blockScrolling = Infinity;

    this.editor.on('change', delta => model.parse(this.editor.getValue()));

    this.editor.resize();

    model.on(() => {
      const str = model.stringify();

      if (this.editor.getValue() === str) {
        return;
      }

      this.editor.setValue(str);
    });
  }

  style = style

  render() {
    return (
      <div className={this.style.component}>
        <div
          id={editorId}
          className={this.style.editor}
        />
      </div>
    );
  }
}
