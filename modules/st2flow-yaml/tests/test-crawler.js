import fs from 'fs';
import path from 'path';
import { expect } from 'chai';

import TokenSet from '../token-set';
import crawler from '../crawler';

describe('Token Set Crawler', () => {
  const yaml = fs.readFileSync(path.join(__dirname, 'data/complex.yaml'), 'utf-8');
  const set = new TokenSet(yaml);

  it('returns simple key value pairs', () => {
    expect(crawler.getValueByKey(set, 'version')).to.equal(1);
    expect(crawler.getValueByKey(set, 'description')).to.equal('hello');
    expect(crawler.getValueByKey(set, 'dedoo')).to.equal('multiline string value');
    expect(crawler.getValueByKey(set, 'key in quotes')).to.equal('value not in quotes');
    expect(crawler.getValueByKey(set, 'enabled')).to.equal(true);
    expect(crawler.getValueByKey(set, 'double')).to.equal(0.5);
    expect(crawler.getValueByKey(set, 'explicit_string')).to.equal('0.5');
  });

  it('can use deep.dot.syntax for item lookup', () => {
    expect(crawler.getValueByKey(set, 'this.is.a.deep.value')).to.equal('yay!!');
    expect(crawler.getValueByKey(set, 'this.is.b.0.some_array.value')).to.equal('awesome');
  });

  it('can look up keys with dots in them (MUST use the array syntax)', () => {
    expect(crawler.getValueByKey(set, ['key.with.dot'])).to.equal('is_valid');
    expect(crawler.getValueByKey(set, ['nested', 'key.with.dot'])).to.equal('is_valid');
  });

  it('recognizes different flavors of null values', () => {
    const nulls = crawler.getValueByKey(set, 'nulls');
    nulls.forEach(n => expect(n).to.equal(null));
  });

  it('recognizes different flavors of integers', () => {
    const integers = crawler.getValueByKey(set, 'integers');
    integers.forEach(int => expect(int).to.equal(12345));
  });

  it('recognizes different flavors of floating point numbers', () => {
    const floats = crawler.getValueByKey(set, 'floats');
    floats.forEach(f => expect(f).to.equal(1230.15));
  });

  it('recognizes different flavors of booleans', () => {
    const bools = crawler.getValueByKey(set, 'bools');
    bools.forEach(b => expect(`${b}: ${typeof b}`).to.equal(`${b}: boolean`));
  });

  it('recognizes different flavors of dates', () => {
    const dates = crawler.getValueByKey(set, 'dates');
    dates.forEach(d => expect(d instanceof Date).to.equal(true));
  });

  it('recognizes certain special values', () => {
    const special = crawler.getValueByKey(set, 'special');
    expect(isNaN(special[0])).to.equal(true);
    expect(special[1]).to.equal(Number.POSITIVE_INFINITY);
    expect(special[2]).to.equal(Number.NEGATIVE_INFINITY);
  });

  it('Does not apply special values to mapping keys', () => {
    const specialKeys = crawler.getValueByKey(set, 'specialKeys');
    Object.keys(specialKeys).forEach(key => {
      expect(`${key}`).to.not.equal(`${specialKeys[key]}`);
    });
  });

  it('returns referenced values', () => {
    expect(crawler.getValueByKey(set, 'anchored_content')).to.equal('This is a referencable value.');
    expect(crawler.getValueByKey(set, 'other_anchor')).to.equal('This is a referencable value.');
  });

  it('works with multiline scalar keys', () => {
    const val = crawler.getValueByKey(set, 'multiline scalar key');
    expect(val).to.equal('some value');
  });

  it('works with multiline array keys, separating with a comma', () => {
    const val = crawler.getValueByKey(set, 'Manchester United,Real Madrid');
    expect(Array.isArray(val)).to.equal(true);
  });

  it('returns object with special __keys representing the corrent order', () => {
    const obj = crawler.getValueByKey(set, 'data');
    expect(obj.__keys).to.deep.equal([
      'foo', 'bing', 'booz', 'nothing', 'scalar',
      'angle_clip', 'angle_strip', 'angle_keep',
      'pipe_clip', 'pipe_strip', 'pipe_keep',
    ]);
  });

  it('returns object with expected value types', () => {
    const obj = crawler.getValueByKey(set, 'data');

    expect(obj.constructor).to.equal(Object);
    expect(obj.foo).to.equal('barbar');
    expect(obj.bing).to.equal(222);
    expect(obj.booz).to.equal(true);
    expect(obj.nothing).to.equal(null);
    expect(obj.scalar).to.equal('firstline secondline');
    expect(obj.angle_clip).to.equal('line 1 line 2\n');
    expect(obj.angle_strip).to.equal('line 3 line 4');
    expect(obj.angle_keep).to.equal('line 5 line 6\n\n');
    expect(obj.pipe_clip).to.equal('line 1\nline 2\n');
    expect(obj.pipe_strip).to.equal('line 3\nline 4');
    expect(obj.pipe_keep).to.equal('line 5\nline 6\n\n');
  });

  it('returns array with expected value types', () => {
    const arr = crawler.getValueByKey(set, 'a_sequence');

    expect(Array.isArray(arr)).to.equal(true);
    expect(typeof arr[0]).to.equal('string');
    expect(typeof arr[1]).to.equal('number');
    expect(typeof arr[2]).to.equal('boolean');
    [ 3, 4, 5, 6 ].forEach(v => expect(arr[v]).to.equal(null));
    expect(arr[7].constructor).to.equal(Object);
    expect(Object.keys(arr[7])).to.deep.equal([ 'key', 'another_key' ]);
    expect(Array.isArray(arr[8])).to.equal(true);
    expect(arr[8].length).to.equal(2);
    expect(Array.isArray(arr[9])).to.equal(true);
    expect(arr[9].length).to.equal(1);
    expect(Array.isArray(arr[9][0])).to.equal(true);
    expect(arr[9][0].length).to.equal(3);
    expect(arr[9][0][2]).to.equal('This is a referencable value.');
  });

  it('works with json values', () => {
    const obj = crawler.getValueByKey(set, 'json_map');
    expect(obj.constructor).to.equal(Object);
    expect(obj.key).to.equal('value');

    const arr = crawler.getValueByKey(set, 'json_seq');
    expect(Array.isArray(arr)).to.equal(true);
    expect(arr).to.deep.equal([ 3, 2, 1, 'takeoff' ]);

    const yObj = crawler.getValueByKey(set, 'quotes are optional');
    expect(yObj.constructor).to.equal(Object);
    expect(yObj.key).to.deep.equal([ 3, 2, 1, 'takeoff' ]);
  });

  it('allows object extension', () => {
    const base = crawler.getValueByKey(set, 'base');
    expect(base).to.deep.equal({ name: 'Everyone has same name' });

    const foobase = crawler.getValueByKey(set, 'foobase');
    expect(foobase).to.deep.equal({ name: 'Everyone has same name', age: 10 });

    const foobarbase = crawler.getValueByKey(set, 'foobarbase');
    expect(foobarbase).to.deep.equal({ name: 'Everyone has same name', age: 10, height: 6.0 });

    const multibase = crawler.getValueByKey(set, 'multibase');
    expect(multibase).to.deep.equal({ name: 'Everyone has same name', email: 'foo@bar.com' });
  });

  describe('replaceTokenValue', () => {
    let set;

    beforeEach(() => {
      set = new TokenSet(yaml);
    });

    it('throws if the path is not found', () => {
      expect(() => crawler.replaceTokenValue(set, 'asdhrtdvaget')).to.throw('Could not find token');
    });

    it('replaces mapping values', () => {
      const newVal = { foo: 'bar' };

      crawler.replaceTokenValue(set, 'data.bing', newVal);

      expect(crawler.getValueByKey(set, 'data.bing')).to.deep.equal(newVal);
    });

    it('replaces collection values', () => {
      const newVal = { foo: 'bar' };

      crawler.replaceTokenValue(set, 'a_sequence.3', newVal);

      expect(crawler.getValueByKey(set, 'a_sequence.3')).to.deep.equal(newVal);
    });
  });

  describe('assignMappingItem', () => {
    let set;

    beforeEach(() => {
      set = new TokenSet(yaml);
    });

    it('throws if no path is specified', () => {
      expect(() => crawler.assignMappingItem(set, '')).to.throw('Cannot add a key to a blank target');
    });

    it('throws if the path is not found', () => {
      expect(() => crawler.assignMappingItem(set, 'asdhrtdvaget.asdfasdf')).to.throw('Could not find token');
    });

    it('throws if the parent token is not a mapping token', () => {
      expect(() => crawler.assignMappingItem(set, 'version.foo')).to.throw('token is not of kind "2"');
      expect(() => crawler.assignMappingItem(set, 'nulls.foo')).to.throw('token is not of kind "2"');
    });

    [ 'scalar', 1234, true, new Date(), null, { a: 'mapping' }, [ 'an', {'array': 'item'}]].forEach(val => {
      const type = Array.isArray(val) ?
        'array' : typeof val === 'object' ?
          Object.prototype.toString.call(val) : typeof val;

      it(`can add add and retrieve ${type} values`, () => {
        crawler.assignMappingItem(set, 'data.aNewItem', val);
        expect(crawler.getValueByKey(set, 'data.aNewItem')).to.deep.equal(val);
      });
    });

    it('can add root level items', () => {
      const val = Math.random();
      crawler.assignMappingItem(set, 'aRandomValue', val);

      expect(crawler.getValueByKey(set, 'aRandomValue')).to.equal(val);
    });
  });

  describe('deleteMappingItem', () => {
    let set;

    beforeEach(() => {
      set = new TokenSet(yaml);
    });

    it('throws if the path is not found', () => {
      expect(() => crawler.deleteMappingItem(set, 'asdhrtdvaget')).to.throw('Could not find token');
    });

    it('throws if the target token not a child of a mapping token', () => {
      expect(() => crawler.deleteMappingItem(set, 'a_sequence.0')).to.throw('key must point to a valid mapping');
    });

    it('removes items by key', () => {
      let data = crawler.getValueByKey(set, 'data');
      expect(data.hasOwnProperty('bing')).to.equal(true);

      crawler.deleteMappingItem(set, 'data.bing');

      data = crawler.getValueByKey(set, 'data');
      expect(data.hasOwnProperty('bing')).to.equal(false);
    });

    it('can remove root level items', () => {
      let data = set.toObject();
      expect(data.hasOwnProperty('version')).to.equal(true);

      crawler.deleteMappingItem(set, 'version');

      data = set.toObject();
      expect(data.hasOwnProperty('version')).to.equal(false);
    });
  });

  describe('spliceCollection', () => {
    let set;

    beforeEach(() => {
      set = new TokenSet(yaml);
    });

    it('throws if the path is not found', () => {
      expect(() => crawler.spliceCollection(set, 'asdhrtdvaget')).to.throw('Could not find token');
    });

    it('throws if the target token is not a collection token', () => {
      expect(() => crawler.spliceCollection(set, 'version')).to.throw('token is not of kind "3"');
      expect(() => crawler.spliceCollection(set, 'data')).to.throw('token is not of kind "3"');
    });

    [ 'scalar', 1234, true, new Date(), null, { a: 'mapping' }, [ 'an', {'array': 'item'}]].forEach(val => {
      const type = Array.isArray(val) ?
        'array' : typeof val === 'object' ?
          Object.prototype.toString.call(val) : typeof val;

      it(`can add add and retrieve ${type} values`, () => {
        let sequence = crawler.getValueByKey(set, 'a_sequence');
        const origLength = sequence.length;
        const start = Math.round(Math.random() * origLength / 2);
        const deleteCount = Math.round(Math.random() * origLength / 3);

        crawler.spliceCollection(set, 'a_sequence', start, deleteCount, val);

        sequence = crawler.getValueByKey(set, 'a_sequence');
        expect(sequence[start]).to.deep.equal(val);
        expect(sequence.length).to.equal(origLength - deleteCount + 1);
      });
    });
  });

});
