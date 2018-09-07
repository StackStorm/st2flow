import fs from 'fs';
import path from 'path';
import { expect } from 'chai';

import TokenSet from '../token-set';
import Crawler from '../crawler';

describe('Token Set Crawler', () => {
  const yaml = fs.readFileSync(path.join(__dirname, 'data/complex.yaml'), 'utf-8');
  const set = new TokenSet(yaml);
  const crawler = new Crawler(set);

  it('returns simple key value pairs', () => {
    expect(crawler.getValueByKey('version')).to.equal(1);
    expect(crawler.getValueByKey('description')).to.equal('hello');
    expect(crawler.getValueByKey('dedoo')).to.equal('multiline string value');
    expect(crawler.getValueByKey('key in quotes')).to.equal('value not in quotes');
    expect(crawler.getValueByKey('enabled')).to.equal(true);
    expect(crawler.getValueByKey('double')).to.equal(0.5);
    expect(crawler.getValueByKey('explicit_string')).to.equal('0.5');
  });

  it('can use deep.dot.syntax for item lookup', () => {
    expect(crawler.getValueByKey('this.is.a.deep.value')).to.equal('yay!!');
    expect(crawler.getValueByKey('this.is.b.0.some_array.value')).to.equal('awesome');
  });

  it('recognizes different flavors of null values', () => {
    const nulls = crawler.getValueByKey('nulls');
    nulls.forEach(n => expect(n).to.equal(null));
  });

  it('recognizes different flavors of integers', () => {
    const integers = crawler.getValueByKey('integers');
    integers.forEach(int => expect(int).to.equal(12345));
  });

  it('recognizes different flavors of floating point numbers', () => {
    const floats = crawler.getValueByKey('floats');
    floats.forEach(f => expect(f).to.equal(1230.15));
  });

  it('recognizes different flavors of booleans', () => {
    const bools = crawler.getValueByKey('bools');
    bools.forEach(b => expect(`${b}: ${typeof b}`).to.equal(`${b}: boolean`));
  });

  it('recognizes different flavors of dates', () => {
    const dates = crawler.getValueByKey('dates');
    dates.forEach(d => expect(d instanceof Date).to.equal(true));
  });

  it('recognizes certain special values', () => {
    const special = crawler.getValueByKey('special');
    expect(isNaN(special[0])).to.equal(true);
    expect(special[1]).to.equal(Number.POSITIVE_INFINITY);
    expect(special[2]).to.equal(Number.NEGATIVE_INFINITY);
  });

  it('returns referenced values', () => {
    expect(crawler.getValueByKey('anchored_content')).to.equal('This is a referencable value.');
    expect(crawler.getValueByKey('other_anchor')).to.equal('This is a referencable value.');
  });

  it('works with multiline scalar keys', () => {
    const val = crawler.getValueByKey('multiline scalar key');
    expect(val).to.equal('some value');
  });

  it('works with multiline array keys, separating with a comma', () => {
    const val = crawler.getValueByKey('Manchester United,Real Madrid');
    expect(Array.isArray(val)).to.equal(true);
  });

  it('returns object with special __keys representing the corrent order', () => {
    const obj = crawler.getValueByKey('data');
    expect(obj.__keys).to.deep.equal([
      'foo', 'bing', 'booz', 'nothing', 'scalar',
      'angle_clip', 'angle_strip', 'angle_keep',
      'pipe_clip', 'pipe_strip', 'pipe_keep',
    ]);
  });

  it('returns object with expected value types', () => {
    const obj = crawler.getValueByKey('data');

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
    const arr = crawler.getValueByKey('a_sequence');

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
    const obj = crawler.getValueByKey('json_map');
    expect(obj.constructor).to.equal(Object);
    expect(obj.key).to.equal('value');

    const arr = crawler.getValueByKey('json_seq');
    expect(Array.isArray(arr)).to.equal(true);
    expect(arr).to.deep.equal([ 3, 2, 1, 'takeoff' ]);

    const yObj = crawler.getValueByKey('quotes are optional');
    expect(yObj.constructor).to.equal(Object);
    expect(yObj.key).to.deep.equal([ 3, 2, 1, 'takeoff' ]);
  });

  it('allows object extension', () => {
    const base = crawler.getValueByKey('base');
    expect(base).to.deep.equal({ name: 'Everyone has same name' });

    const foobase = crawler.getValueByKey('foobase');
    expect(foobase).to.deep.equal({ name: 'Everyone has same name', age: 10 });

    const foobarbase = crawler.getValueByKey('foobarbase');
    expect(foobarbase).to.deep.equal({ name: 'Everyone has same name', age: 10, height: 6.0 });

    const multibase = crawler.getValueByKey('multibase');
    expect(multibase).to.deep.equal({ name: 'Everyone has same name', email: 'foo@bar.com' });
  });
});
