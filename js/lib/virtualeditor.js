import _ from 'lodash';
import EventEmitter from 'events';

import Range from './util/range';


class Historian {
  index = -1
  history = []

  push(...deltas) {
    this.history.splice(this.index + 1, this.history.length, deltas);

    this.index = this.index + 1;
  }

  prev() {
    if (this.index < 0) {
      return false;
    }

    const deltas = this.history[this.index];

    this.index = this.index - 1;

    return deltas.map(({ nextSector, prevValue }) => ({
      sector: nextSector,
      value: prevValue
    }));
  }

  next() {
    if (this.index >= this.history.length - 1) {
      return false;
    }

    this.index = this.index + 1;

    const deltas = this.history[this.index];

    return deltas.map(({ prevSector, nextValue }) => ({
      sector: prevSector,
      value: nextValue
    }));
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
    const changes = this.historian.prev();

    if (!changes) {
      return false;
    }

    const deltas = changes.map(({sector, value}) => this._replace(sector, value));

    this.emit('change', deltas);

    return deltas;
  }

  redo() {
    const changes = this.historian.next();

    if (!changes) {
      return false;
    }

    const deltas = changes.map(({sector, value}) => this._replace(sector, value));

    this.emit('change', deltas);

    return deltas;
  }

  getValue() {
    return this.lines.join('\n');
  }

  setValue(str) {
    const prevLastRow = this.lines.length - 1;
    const prevSector = new Range(0, 0, prevLastRow, this.lines[prevLastRow].length);
    const prevValue = this.lines.join('\n');

    this.lines = str.split('\n');

    const newLastRow = this.lines.length - 1;
    const nextSector = new Range(0, 0, newLastRow, this.lines[newLastRow].length);
    const nextValue = this.lines.join('\n');

    const delta = { prevSector, prevValue, nextSector, nextValue };

    this.emit('change', [delta]);
    this.historian.push(delta);

    return nextValue;
  }

  getLength() {
    return this.lines.length;
  }

  _replace(sector, str) {
    const lastRow = this.lines.length - 1;
    const bounds = new Range(0, 0, lastRow, this.lines[lastRow].length);

    switch(bounds.compareRange(sector)) {
      case -2:
        // Both sector's coordinates are negative. Should never happen.
      case -1:
        // Sectors start coordinate is negative. Should never happen.
        console.error('WTFError: Sector starts before the document');
        break;
      case 0:
        // Sector within bounds. That's how it's suppose to be.
        break;
      case 1:
        // Sector is longer than document. Should not happen, but happens once
        // in a while. Set end coordinate to bondary end to mimic Ace editor
        // behaviour.
        console.error('WTFError: Sector is longer than the document');
        sector.setEnd(bounds.end);
        break;
      case 2:
        // Sector is completely out of bounds. Should not happen, but happens.
        // Mimic Ace Editor behaviour and append the code to the end of the
        // document.
        console.error('WTFError: Sector starts after the document');
        sector.setStart(bounds.end);
        sector.setEnd(bounds.end);
        break;
      case 42:
      default:
        // Some truly magical stuff.
        console.error('WTFError: Case 42');
        break;
    }

    const prefix = this.lines[sector.start.row].substring(0, sector.start.column);
    const postfix = this.lines[sector.end.row].substring(sector.end.column);

    const lines = str.split('\n');
    lines.unshift(prefix + lines.shift());
    lines.push(lines.pop() + postfix);

    const deletedLines = this.lines.splice(sector.start.row, sector.end.row - sector.start.row + 1, ...lines);
    deletedLines.unshift(deletedLines.shift().substring(sector.start.column));
    if (deletedLines.length === 1) {
      // if there's only one line, compensate for what you've already cut off of it
      deletedLines.push(deletedLines.pop().substring(0, sector.end.column - sector.start.column));
    } else {
      deletedLines.push(deletedLines.pop().substring(0, sector.end.column));
    }
    const prevValue = deletedLines.join('\n');

    const endRow = sector.start.row + lines.length - 1;
    const endColumn = this.lines[endRow].length - postfix.length;

    const nextSector = sector.clone();
    nextSector.setEnd(endRow, endColumn);

    return {
      prevSector: sector, prevValue, nextSector, nextValue: str
    };
  }

  replace(sector, str) {
    const isInsert = sector.isEmpty();
    const lastRow = this.getLength() - 1;

    if (isInsert && sector.start.row > lastRow) {
      str = '\n' + str;
    }

    const delta = this._replace(sector, str);

    this.emit('change', [delta]);
    this.historian.push(delta);

    return delta.nextSector.end;
  }

  embedCoords() {
    // TODO: move out to model
    if (!this.props.model.tasks.length) {
      return;
    }

    let shift = 0;
    const deltas = _(this.props.model.tasks)
      .sortBy(task => {
        return task.getSector('coord').start.row;
      })
      .map(task => {
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

        return this._replace(sector, fragment);
      })
      .value();

    this.emit('change', deltas);
    this.historian.push(...deltas);
  }
}
