import _ from 'lodash';
import EventEmitter from 'events';

import Range from './util/range';


// TODO: ACE-compatible deltas
// TODO: Bulk history records

class Historian {
  index = -1
  history = []

  push(prevSector, prevValue, nextSector, nextValue) {
    this.history.splice(this.index + 1, history.length, {
      prevSector,
      prevValue,
      nextSector,
      nextValue
    });

    this.index = this.index + 1;
  }

  prev() {
    if (this.index < 0) {
      return false;
    }

    const { nextSector, prevValue } = this.history[this.index];

    this.index = this.index - 1;

    return {
      sector: nextSector,
      value: prevValue
    };
  }

  next() {
    if (this.index >= this.history.length - 1) {
      return false;
    }

    this.index = this.index + 1;

    const { prevSector, nextValue } = this.history[this.index];

    return {
      sector: prevSector,
      value: nextValue
    };
  }
}

export default class VirtualEditor extends EventEmitter {
  constructor(model) {
    super();

    this.props = {
      model
    };

    this.lines = [''];

    this.historian = new Historian();
  }

  undo() {
    const { sector, value } = this.historian.prev();

    if (sector) {
      return this._replace(sector, value);
    } else {
      return false;
    }
  }

  redo() {
    const { sector, value } = this.historian.next();

    if (sector) {
      return this._replace(sector, value);
    } else {
      return false;
    }
  }

  getValue() {
    return this.lines.join('\n');
  }

  setValue(str) {
    const prevLastRow = this.lines.length - 1
    const oldSector = new Range(0, 0, prevLastRow, this.lines[prevLastRow].length);
    const deleted = this.lines.join('\n');

    this.lines = str.split('\n');

    const newLastRow = this.lines.length - 1;
    const newSector = new Range(0, 0, newLastRow, this.lines[newLastRow].length);
    const inserted = this.lines.join('\n');

    this.historian.push(oldSector, deleted, newSector, inserted);
    this.emit('change');

    return inserted;
  }

  getLength() {
    return this.lines.length;
  }

  _replace(sector, str) {
    // TODO: make sure sector is whithing the bounds of the document
    const prefix = this.lines[sector.start.row].substring(0, sector.start.column);
    const postfix = this.lines[sector.end.row].substring(sector.end.column);

    const lines = str.split('\n');
    lines.unshift(prefix + lines.shift());
    lines.push(lines.pop() + postfix);

    const deletedLines = this.lines.splice(sector.start.row, sector.end.row - sector.start.row + 1, ...lines);
    deletedLines.unshift(deletedLines.shift().substring(sector.start.column));
    deletedLines.push(deletedLines.pop().substring(0, sector.end.column));
    const deleted = deletedLines.join('\n')

    const endRow = sector.start.row + lines.length - 1;
    const endColumn = this.lines[endRow].length - postfix.length

    const newSector = sector.clone();
    newSector.setEnd(endRow, endColumn);

    this.emit('change');

    return {
      oldSector: sector, deleted, newSector, inserted: str
    };
  }

  replace(sector, str) {
    const isInsert = sector.isEmpty()
    const lastRow = this.getLength() - 1;

    if (isInsert && sector.start.row > lastRow) {
      str = '\n' + str;
    }

    const { oldSector, deleted, newSector, inserted } = this._replace(sector, str);

    this.historian.push(oldSector, deleted, newSector, inserted);

    return newSector.end;
  }

  embedCoords() {
    // TODO: move out to model
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

    this.emit('change');
  }

  emit(...args) {
    if (this._bulk) {
      return;
    }

    super.emit(...args);
  }
}
