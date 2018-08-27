// @flow

import type { Token, TokenList, Value } from './types';
import { writeValue, writeToken, writeSet } from './writer';

class NestedSet {
  level: number;
  raw: TokenList;

  // The NestedSet constructor is analogous to the native
  // Array constructor, except it can take an optional "level"
  // as the first parameter. All other parameters must be of
  // type Token.
  constructor(level: number | Token, ...tokens: TokenList) {
    if (typeof level !== 'number') {
      tokens = [].concat(level, tokens);
      level = 1;
    }
    this.raw = tokens;
    this.level = level;
  }

  // Since NestedSet is not an Array, this method must be used to access
  // items by index (in leu of nestedset[15]). If this becomes a problem,
  // we can look into using Proxy.
  getItemAtIndex(index: number): Token {
    return this.raw[index];
  }

  getValueByKey(...keys: Array<string | number>): NestedSet | Token {
    const key = keys.shift();

    const top = this.raw.filter(node => node.level === this.level);
    const index = typeof key === 'number' ? key
      : top.findIndex((node, index) => node.type === 'key' && node.value === key)
    ;

    if (index === -1 || index > top.length - 1) {
      // TODO: return undefined?
      throw new Error(`cannot find "${key}" at level ${this.level}`);
    }

    const end = index === top.length - 1 ? this.raw.length : this.raw.findIndex(node => node === top[index + 1]);
    let start = this.raw.findIndex(node => node === top[index]) + 1;
    if (this.raw[start].type === 'token-separator') {
      start += 1;
    }

    if (end === start + 1) {
      return this.raw[start];
    }

    const result = new NestedSet(this.raw[start].level, ...this.raw.slice(start, end));

    if (keys.length) {
      return result.getValueByKey(...keys);
    }

    return result;
  }

  set(target: Token, value: Value, key?: string) {
    if (target instanceof NestedSet) {
      const index = this.raw.indexOf(target.raw[0]);
      if (index === -1) {
        throw new Error('target not found');
      }

      if (key === 'key') {
        if (this.raw[index - 1].type !== 'token-separator') {
          throw new Error('invalid structure');
        }

        if (this.raw[index - 2].type !== 'key') {
          throw new Error('invalid structure');
        }

        target = this.raw[index - 2];
      }
    }
    else {
      if (typeof key !== 'undefined') {
        throw new Error('cannot provide `key` without NestedSet target');
      }
    }

    const index = this.raw.indexOf(target);
    if (index === -1) {
      throw new Error('target not found');
    }

    const delta = writeValue(value, target.valueMetadata).length - writeValue(target.value, target.valueMetadata).length;
    this.raw[index].value = value;
    this.raw[index].end += delta;

    for (let i = index + 1, l = this.raw.length; i < l; i++) {
      this.raw[i].start += delta;
      this.raw[i].end += delta;
    }
  }

  delete(target: Token) {
    if (target instanceof NestedSet) {
      target = target.raw[0];
    }

    let index = this.raw.indexOf(target);
    if (index === -1) {
      throw new Error('target not found');
    }

    if (this.raw[index - 1].type === 'token-separator') {
      index = index - 2;
      target = this.raw[index];
    }

    if (this.raw[index - 1].type === 'token-sequence') {
      index = index - 1;
      target = this.raw[index];
    }

    const removed = this.raw.slice(index + 1).findIndex(t => t.level === target.level) + 1;
    this.raw.splice(index, removed);

    const delta = this.raw[index].start - (index === 0 ? 0 : this.raw[index - 1].end);

    for (let i = index, l = this.raw.length; i < l; i++) {
      this.raw[i].start -= delta;
      this.raw[i].end -= delta;
    }
  }

  get length(): number {
    return this.raw.length;
  }

  get keys(): Array<string | number> {
    return this.raw
      .filter(node => node.level === this.level)
      .map(({ type, value }, index) => {
        if (type === 'key') {
          return value;
        }

        if (type === 'token-sequence') {
          return index;
        }

        throw new Error('invalid structure');
      })
    ;
  }

  splice(index: number, deleteCount: number, ...items: TokenList) {
    const removeLength = deleteCount ? writeSet(this.raw.slice(index, index + deleteCount)).length : 0;
    const insertLength = items.length ? writeSet(items).length : 0;
    const delta = insertLength - removeLength;

    Array.prototype.splice.call(this.raw, index, deleteCount, ...items);
    let nextStart = index > 0 ? this.raw[index - 1].end : this.raw[0].length;

    this.raw.slice(index).forEach(token => {
      token.start = nextStart;
      nextStart = token.end = nextStart + writeToken(token).length;
    });
  }
}

// These methods return an instance of NestedSet
['slice', 'filter'].forEach(method => {
  NestedSet.prototype[method] = function (...args) {
    const result = Array.prototype[method].apply(this.raw, args);
    return new NestedSet(result[0].level, ...result);
  }
});
['forEach', 'pop', 'map', 'reduce'].forEach(method => {
  NestedSet.prototype[method] = function (...args) {
    return Array.prototype[method].apply(this.raw, args);
  }
});

export default NestedSet;
