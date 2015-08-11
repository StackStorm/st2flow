import ace from 'brace';
import React from 'react';

import bem from './util/bem';
import Meta from './panels/meta';

const st2Class = bem('panel')
    ;

export default class Panel extends React.Component {
  static propTypes = {
    onToggle: React.PropTypes.func
  }

  state = {
    panel: 'editor'
  };

  initEditor() {
    const editor = ace.edit(this.refs.editor.getDOMNode());

    require('brace/mode/yaml');
    editor.getSession().setMode('ace/mode/yaml');

    require('brace/theme/monokai');
    editor.setTheme('ace/theme/monokai');

    editor.setHighlightActiveLine(false);
    editor.$blockScrolling = Infinity;

    editor.session.setTabSize(2);

    return editor;
  }

  show(panel) {
    this.setState({ panel });
  }

  toggleCollapse(open) {
    this.setState({hide: !open});
  }

  componentDidMount() {
    this.editor = this.initEditor();
    this.meta = this.refs.meta;
  }

  componentDidUpdate(props, state) {
    if (this.props.onToggle && this.state.hide !== state.hide) {
      this.props.onToggle();
    }
  }

  render() {
    const props = {
            className: st2Class(null)
          }
        ;

    if (this.state.hide) {
      props.className += ' ' + st2Class(null, 'hide');
    }

    return <div {...props} >
      <div ref="editor" className="st2-panel__panel st2-panel__editor st2-editor"></div>
      <Meta ref="meta" hide={this.state.panel === 'meta'}/>
    </div>;
  }
}
