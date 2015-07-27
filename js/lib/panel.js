'use strict';

const d3 = require('d3')
    , ace = require('brace')
    , bem = require('./bem')
    ;

const st2Class = bem('panel')
    , st2Editor = bem('editor')
    ;

class Panel {
  constructor() {
    this.element = d3.select(st2Class(null, true));

    this.editor = this.initEditor();

    this.panels = {
      editor: st2Class('editor', true),
      meta: st2Class('meta', true)
    };
  }

  initEditor() {
    const editor = ace.edit(this.element.select(st2Editor(null, true)).node());

    require('brace/mode/yaml');
    editor.getSession().setMode('ace/mode/yaml');

    require('brace/theme/monokai');
    editor.setTheme('ace/theme/monokai');

    editor.setHighlightActiveLine(false);
    editor.$blockScrolling = Infinity;

    editor.session.setTabSize(2);

    return editor;
  }

  toggleCollapse(open) {
    const classList = this.element.node().classList;

    if (open === true) {
      classList.remove('st2-panel--hide');
    } else if (open === false) {
      classList.add('st2-panel--hide');
    } else {
      classList.toggle('st2-panel--hide');
    }
  }

  show(name) {
    const selector = this.panels[name];

    if (!selector) {
      throw new Error('No such panel:', selector);
    }

    this.element
      .selectAll(st2Class('panel', true))
      .classed(st2Class('panel', 'active'), false)
      ;

    this.element
      .select(selector)
      .classed(st2Class('panel', 'active'), true)
      ;
  }
}

module.exports = Panel;
