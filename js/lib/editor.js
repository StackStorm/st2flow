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

    this.editor.session.setUndoManager({
      undo: () => this.props.model.undo(),
      redo: () => this.props.model.redo(),
      // VirtualEditor handles reseting Historian and keeping views in sync
      reset: () => false,
      execute: () => false
    });

    this.editor.on('change', (delta) => {
      if (this._bulk) {
        return;
      }

      const startRange = Range.fromPoints(delta.start, delta.start);
      const fullRange = Range.fromPoints(delta.start, delta.end);
      const deltaString = delta.lines.join('\n');
      const emptyString = '';

      const flowDelta = {
        prevSector: startRange,
        prevValue: emptyString,
        nextSector: startRange,
        nextValue: emptyString
      };

      switch (delta.action) {
        case 'insert':
          flowDelta.nextSector = fullRange;
          flowDelta.nextValue = deltaString;
          break;
        case 'remove':
          flowDelta.prevSector = fullRange;
          flowDelta.prevValue = deltaString;
          break;
        default:
          console.log('WTFError: Unsupported delta action.');
      }

      this._inProgress = true;
      this.props.model.update(flowDelta);
      this._inProgress = false;

      this.detectIndent();
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

    this.props.model.on('change', deltas => {
      if (this._inProgress) {
        return;
      }

      this._bulk = true;

      for (const { prevSector, prevValue, nextSector, nextValue } of deltas) {
        if (!prevSector.isEmpty()) {
          this.editor.session.doc.applyDelta({
            action: 'remove',
            start: prevSector.start,
            end: prevSector.end,
            lines: prevValue.split('\n')
          });
        }

        if (nextValue) {
          this.editor.session.doc.applyDelta({
            action: 'insert',
            start: nextSector.start,
            end: nextSector.end,
            lines: nextValue.split('\n')
          });
        }
      }

      this._bulk = false;
    });

    this.props.model.on('parse', () => {
      this.completions.task.update(this.props.model.definition.keywords);

      this.showTask(this.props.model.selected);
    });

    this.props.model.on('select', (name) => this.showTask(name));

    this.props.model.messages.on('change', _.debounce((messages) => {
      this.setAnnotations(messages);
    }));
  }

  setCursor(name) {
    const { row, column } = this.props.model.task(name).getSector('name').start;
    this.editor.selection.moveTo(row, column);
  }

  undo() {
    return this.props.model.undo();
  }

  redo() {
    return this.props.model.redo();
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

  detectIndent() {
    // TODO: probably makes sense to move it to virtualeditor too
    this.props.model.messages.clear();

    const lines = this.editor.env.document.doc.getAllLines();

    const tabs = _(lines)
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
  }

  render() {
    return <div ref="editor" className="st2-panel__panel st2-panel__editor st2-editor"></div>;
  }
}
