import { expect } from 'chai';
import Range from '../lib/util/range';

import VirtualEditor from '../lib/model/virtualeditor';

function dedent(callSite, ...args) {

    function format(str) {
        return str.replace(/\n\s+\|/g, '\n');;
    }

    if (typeof callSite === 'string') {
      return format(callSite);
    }

    if (typeof callSite === 'function') {
      return (...args) => format(callSite(...args));
    }


    let output = callSite
        .slice(0, args.length + 1)
        .map((text, i) => (i === 0 ? '' : args[i - 1]) + text)
        .join('');

    return format(output);
}

describe('VirtualEditor', () => {

  let editor;

  beforeEach(() => {
    editor = new VirtualEditor();
  });

  describe('#getValue()', () => {
    const initial =
      dedent`some
            |thing
            |else
            |`;

    beforeEach(() => {
      editor.setValue(initial);
    });

    it('should return editors content', () => {
      expect(editor.getValue()).to.be.equal(initial);
    });
  });

  describe('#setValue()', () => {
    const initial =
      dedent`some
            |thing
            |else
            |`;

    it('should set editors content', () => {
      editor.setValue(initial);

      expect(editor.getValue()).to.be.equal(initial);
    });

    it('should create a new history record', () => {
      expect(editor.historian.history).to.have.length(0);

      editor.setValue(initial);

      expect(editor.historian.history).to.have.length(1);
    })
  });

  describe('#getLength()', () => {
    const initial =
      dedent`some
            |thing
            |else
            |`;

    beforeEach(() => {
      editor.setValue(initial);
    });

    it('should return the number of lines in editor', () => {
      expect(editor.getLength()).to.be.equal(4);
    });
  });

  describe('#replace()', () => {
    const initial =
      dedent`some
            |thing
            |else
            |`;

    beforeEach(() => {
      editor.setValue(initial);
    });

    it('should replace a range within the editor with a string', () => {
      const range = new Range(1,1,2,3);

      const cursor = editor.replace(range, '[inserted\ntext]');

      const expected =
        dedent`some
              |t[inserted
              |text]e
              |`;

      expect(editor.getValue()).to.be.equal(expected);
      expect(cursor).to.deep.equal({ row: 2, column: 5 });

      // Editor may misinterpret some replacement scenarios, so we need to make sure it is able to undo and redo on every step of the way.
      editor.undo();
      expect(editor.getValue()).to.be.equal(initial);

      editor.redo();
      expect(editor.getValue()).to.be.equal(expected);
    });

    it('should replace up to an end of the string if the sector is longer than a line', () => {
      const range = new Range(1,1,2,8);

      const cursor = editor.replace(range, '[inserted\ntext]');

      const expected =
        dedent`some
              |t[inserted
              |text]
              |`;

      expect(editor.getValue()).to.be.equal(expected);
      expect(cursor).to.deep.equal({ row: 2, column: 5 });

      editor.undo();
      expect(editor.getValue()).to.be.equal(initial);

      editor.redo();
      expect(editor.getValue()).to.be.equal(expected);
    });

    it('should ignore replace if range and string are both empty', () => {
      const range = new Range(2,2,2,2);

      editor.replace(range, '');

      expect(editor.getValue()).to.be.equal(initial);
      expect(editor.historian.history).to.have.length(1);
    });

    it('should ignore replace if all coordinates are negative', () => {
      const range = new Range(-1,-1,-2,-3);

      editor.replace(range, '[inserted\ntext]');

      expect(editor.getValue()).to.be.equal(initial);
      expect(editor.historian.history).to.have.length(1);
    });

    it('should replace even if start coordinates are negative', () => {
      const range = new Range(-1,-1,2,3);

      const cursor = editor.replace(range, '[inserted\ntext]');

      const expected =
        dedent`[inserted
              |text]e
              |`;

      expect(editor.getValue()).to.be.equal(expected);
      expect(cursor).to.deep.equal({ row: 1, column: 5 });

      editor.undo();
      expect(editor.getValue()).to.be.equal(initial);

      editor.redo();
      expect(editor.getValue()).to.be.equal(expected);
    });

    it('should replace even if sector is longer than the document', () => {
      const range = new Range(1,1,5,6);

      const cursor = editor.replace(range, '[inserted\ntext]');

      const expected =
        dedent`some
              |t[inserted
              |text]`;

      expect(editor.getValue()).to.be.equal(expected);
      expect(cursor).to.deep.equal({ row: 2, column: 5 });

      editor.undo();
      expect(editor.getValue()).to.be.equal(initial);

      editor.redo();
      expect(editor.getValue()).to.be.equal(expected);
    });

    it('should replace even if sector lies completely outside of document bounds', () => {
      const range = new Range(4,5,5,6);

      const cursor = editor.replace(range, '[inserted\ntext]');

      const expected =
        dedent`some
              |thing
              |else
              |[inserted
              |text]`;

      expect(editor.getValue()).to.be.equal(expected);
      expect(cursor).to.deep.equal({ row: 4, column: 5 });

      editor.undo();
      expect(editor.getValue()).to.be.equal(initial);

      editor.redo();
      expect(editor.getValue()).to.be.equal(expected);
    });

    it('it should not create a history record if no change has been made', () => {
      const numRecords = editor.historian.history.length;

      const range = new Range(1,0,1,5);
      editor.replace(range, 'thing');

      expect(editor.getValue()).to.be.equal(initial);
      expect(editor.historian.history).to.have.length(numRecords);
    });

  });

});
