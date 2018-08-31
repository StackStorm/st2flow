import { expect } from 'chai';
import NestedSet from '../nested-set';

describe.skip('st2flow-yaml: NestedSet', () => {

  describe('array methods', () => {
    let set;
    beforeEach(() => {
      set = new NestedSet(
        { start:   0, end:   7, level: 1, type: 'key', value: 'version', prefix: '', suffix: '' },
        { start:   7, end:   9, level: 2, type: 'token-separator', value: ':', prefix: '', suffix: '\n' },
        { start:   9, end:  10, level: 3, type: 'value', value: 1, valueMetadata: 'float--1', prefix: ' ', suffix: '\n' }
      );
    });

    it('implements slice as expected (returns NestedSet)', () => {
      const sliced = set.slice(1);
      expect(sliced).to.be.an.instanceof(NestedSet);
      expect(sliced.length).to.equal(2);
      expect(sliced.getItemAtIndex(0)).to.deep.equal(set.getItemAtIndex(1));
      expect(sliced.getItemAtIndex(1)).to.deep.equal(set.getItemAtIndex(2));
    });

    it('implements filter as expected (returns NestedSet)', () => {
      const filtered = set.filter(token => token.start > 7);
      expect(filtered).to.be.an.instanceof(NestedSet);
      expect(filtered.length).to.equal(1);
      expect(filtered.getItemAtIndex(0)).to.deep.equal(set.getItemAtIndex(2));
    });

    it('implements map as expected', () => {
      const mapped = set.map(token => token.start);
      expect(Array.isArray(mapped)).to.equal(true);
      expect(mapped).to.deep.equal([0, 7, 9]);
    });

    it('implements reduce as expected', () => {
      const startSum = set.reduce((sum, token) => sum += token.start, 0);
      expect(startSum).to.equal(16);
    });

    it('implements splice as expected', () => {
      const token = { level: 2, type: 'key', value: 'foobar', prefix: '', suffix: '\n' };
      set.splice(1, 0, token);
      expect(set.length).to.equal(4);
      expect(set.getItemAtIndex(1)).to.equal(token);
      expect(set.getItemAtIndex(set.length - 1).start).to.equal(16);
    });

    it('implements pop as expected', () => {
      const last = set.getItemAtIndex(set.length - 1);
      expect(set.pop()).to.equal(last);
      expect(set.length).to.equal(2);
    });
  });

  describe('get()', () => {

    // version: 1
    it('can get a value by key', () => {
      const set = new NestedSet(
        { start:   0, end:   7, level: 1, type: 'key', value: 'version', prefix: '', suffix: '' },
        { start:   7, end:   9, level: 2, type: 'token-separator', value: ':', prefix: '', suffix: '\n' },
        { start:   9, end:  10, level: 3, type: 'value', value: 1, valueMetadata: 'float--1', prefix: ' ', suffix: '\n' }
      );

      const version = set.getValueByKey('version');
      expect(version).to.have.property('type', 'value');
      expect(version).to.have.property('value', 1);
    });

    // foo:
    //   bar: 'string with spaces'
    it('can get a nested value', () => {
      const set = new NestedSet(
        { start:   0, end:   7, level: 1, type: 'key', value: 'foo' },
        { start:   7, end:   9, level: 2, type: 'token-separator', value: ':' },
        { start:   9, end:  17, level: 3, type: 'key', value: 'bar' },
        { start:  17, end:  18, level: 4, type: 'token-separator', value: ':' },
        { start:  18, end:  38, level: 5, type: 'value', value: 'string with spaces' },
      );

      const val = set.getValueByKey('foo', 'bar');
      expect(val).to.have.property('type', 'value');
      expect(val).to.have.property('value', 'string with spaces');
    });

    // items:
    //   - foo
    //   - bar
    //   - baz
    it('returns a collection as a NestedSet', () => {
      const set = new NestedSet(
        { start:   0, end:   5, level: 1, type: 'key', value: 'items' },
        { start:   5, end:   7, level: 2, type: 'token-separator', value: ':' },
        { start:  16, end:  21, level: 5, type: 'token-sequence', value: '-' },
        { start:  21, end:  27, level: 6, type: 'value', value: 'foo' },
        { start:  27, end:  32, level: 5, type: 'token-sequence', value: '-' },
        { start:  32, end:  38, level: 6, type: 'value', value: 'bar' },
        { start:  38, end:  43, level: 5, type: 'token-sequence', value: '-' },
        { start:  43, end:  50, level: 6, type: 'value', value: 'baz' },
      );

      const items = set.getValueByKey('items');
      expect(items).to.be.an.instanceof(NestedSet);
    });

    it('throws if key is not found', () => {
      const set = new NestedSet();

      expect(set.getValueByKey.bind(set, 'foo')).to.throw();
    });

  });

  describe('set()', () => {

    it('updates start/end values when the value length changes', () => {
      const set = new NestedSet(
        { start:   0, end:   3, level: 1, type: 'key', value: 'foo', prefix: '', suffix: '' },
        { start:   3, end:   5, level: 2, type: 'token-separator', value: ':', prefix: '', suffix: '\n' },
        { start:   5, end:   8, level: 3, type: 'value', value: 'bar', prefix: ' ', suffix: '\n' },

        { start:   8, end:   11, level: 1, type: 'key', value: 'baz', prefix: '', suffix: '' },
        { start:  11, end:   13, level: 2, type: 'token-separator', value: ':', prefix: '', suffix: '\n' },
        { start:  13, end:   17, level: 3, type: 'value', value: 'bing', prefix: ' ', suffix: '\n' },
      );
      const token1 = set.getValueByKey('foo');
      const token2 = set.getValueByKey('baz');
      const end1 = token1.end;
      const start2 = token2.start;
      const end2 = token2.end;
      const newVal = 'updated value';
      const delta = newVal.length - token1.value.length;

      set.set(token1, newVal);
      expect(token1.end - end1).to.equal(delta);
      expect(token2.end - end2).to.equal(delta);
    });

    it('throws if the token is not found', () => {
      const set = new NestedSet();
      expect(set.set.bind(set, {}, 'val')).to.throw();
    });

  });

  describe('delete()', () => {

  });

});
