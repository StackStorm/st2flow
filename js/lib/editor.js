import _ from 'lodash';
import ace from 'brace';
import React from 'react';

import 'brace/ext/language_tools';

import Completer, { InputCompletion, TaskCompletion, YaqlCompletion } from './completer';
import Range from './util/range';


export default class Editor extends React.Component {
  completions = {
    input: new InputCompletion(),
    task: new TaskCompletion(),
    yaqlvariable: new YaqlCompletion()
  };

  componentDidMount() {
    const langTools = ace.acequire('ace/ext/language_tools');
    langTools.setCompleters([new Completer(this.props.model, this.completions)]);

    this.editor = ace.edit(this.refs.editor);

    require('brace/mode/yaml');
    this.editor.getSession().setMode('ace/mode/yaml');

    this.editor.setTheme({
      cssClass: 'ace-st2'
    });

    this.editor.setOptions({
      enableBasicAutocompletion: true,
      enableLiveAutocompletion: true
    });

    this.editor.setHighlightActiveLine(false);
    this.editor.$blockScrolling = Infinity;

    this.editor.session.setTabSize(2);

    this.editor.on('change', (delta) => {
      if (this._bulk) {
        return;
      }

      this.props.model.update(delta);
      this.parse();
    });

    this.editor.selection.on('changeCursor', () => {
      let { row, column } = this.editor.selection.getCursor()
        , range = new Range(row, column, row, column)
        , sectors = this.props.model.search(range, ['task'])
        , sector = _.first(sectors)
        ;

      if (!this._bulk && sector && sector.task) {
        this.props.model.select(sector.task.getProperty('name'));
      }
    });

    this.props.model.on('parse', () => {
      this.completions.task.update(this.props.model.definition.keywords);

      this.showTask(this.props.model.selected);
    });

    this.props.model.on('select', (name) => this.showTask(name));
    this.props.model.on('embedCoords', () => this.embedCoords());
    this.props.model.on('replace', (cursor, str) => this.replace(cursor, str));
    this.props.model.on('undo', () => this.undo());
    this.props.model.on('redo', () => this.redo());

    this.props.model.messages.on('change', _.debounce((messages) => {
      this.setAnnotations(messages);
    }));
  }

  setCursor(name) {
    const { row, column } = this.props.model.task(name).getSector('name').start;
    this.editor.selection.moveTo(row, column);
  }

  undo() {
    return this.editor.undo();
  }

  redo() {
    return this.editor.redo();
  }

  getValue() {
    return this.editor.env.document.doc.getAllLines().join('\n');
  }

  setValue(str) {
    return this.editor.setValue(str);
  }

  getLength() {
    return this.editor.env.document.doc.getLength();
  }

  setAnnotations(messages) {
    return this.editor.session.setAnnotations(messages);
  }

  showTask(name) {
    const task = this.props.model.task(name);

    if (!task) {
      return;
    }

    const sector = task.getSector('task');

    // Since we're using `fullLine` marker, remove the last (zero character long) line from range
    const range = new Range(sector.start.row, sector.start.column, sector.end.row - 1, Infinity);

    if (this._selectMarker) {
      this.editor.session.removeMarker(this._selectMarker);
    }

    const { row, column } = this.editor.selection.getCursor();

    if (!sector.compare(row, column)) {
      this.editor.renderer.scrollCursorIntoView({ row, column }, 0.5);
    } else {
      this.editor.renderer.scrollSelectionIntoView(sector.start, sector.end, 0.5);
    }

    this._selectMarker = this.editor.session.addMarker(range, 'st2-editor__active-task', 'fullLine');
  }

  replace(sector, str) {
    const isInsert = sector.isEmpty();
    const lastRow = this.getLength() - 1;

    if (isInsert && sector.start.row > lastRow) {
      str = '\n' + str;
    }

    return this.editor.env.document.replace(sector, str);
  }

  addMarker(range, cls, type) {
    return this.editor.session.addMarker(range, cls, type);
  }

  removeMarker(marker) {
    return this.editor.session.removeMarker(marker);
  }

  embedCoords() {
    if (!this.props.model.tasks.length) {
      return;
    }

    // FIX: Quick and dirty implementation for bulk updates missing in current
    // version of brace. We'll need a better solution sooner rather than later.
    this._bulk = true;
    let shift = 0;
    _(this.props.model.tasks)
      .sortBy(task => {
        return task.getSector('coord').start.row;
      })
      .each(task => {
        const name = task.getProperty('name')
            , { x, y } = this.props.model.graph.node(name);

        const sector = task.getSector('coord')
            , fragment = this.props.model.fragments.coord(task, Math.round(x), Math.round(y))
            ;

        // Some replaces would create a new line, so each sector should be
        // shifted one more line below to preserve the intended position.
        sector.moveBy(shift, 0);

        if (sector.isEmpty()) {
          shift++;
        }

        this.replace(sector, fragment);
      })
      .value();
    this._bulk = false;

    this.parse();
  }

  parse() {
    this.props.model.messages.clear();

    const str = this.getValue().split('\n');

    const tabs = _(str)
      .map((line, index) => {
        const match = line.match(/^(\s+)\S/);
        return match && {
          index: index,
          indent: match[1]
        };
      })
      .filter()
      .sortBy('indent')
      .uniq(true, 'indent')
      .value()
      ;

    const smallest = tabs && tabs[0];

    const mixed = _.filter(tabs, (tab) => tab.indent.length % smallest.indent.length);

    if (mixed.length) {
      _.forEach(mixed, ({ index, indent }) => {
        const message = {
          type: 'warning',
          row: index,
          column: 0,
          text: `Mixed indentation. This line has ${ indent.length } characters when the rest are of mod ${ smallest.indent.length }`
        };
        this.props.model.messages.add(message);
      });
    } else {
      if (smallest) {
        const indent = smallest.indent[0] === '\t' ? 4 : smallest.indent.length;
        this.editor.session.setTabSize(indent);
      }
    }

    this.props.model.parse(str.join('\n'));
  }

  render() {
    return <div ref="editor" className="st2-panel__panel st2-panel__editor st2-editor"></div>;
  }
}
