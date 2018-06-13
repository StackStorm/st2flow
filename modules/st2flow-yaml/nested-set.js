// @flow

import type { Token, TokenList, Value } from './types';
import { stringifyValue } from './values';

export default class NestedSet {
  level: number;
  raw: TokenList;

  constructor(raw: TokenList, level: number = 1) {
    this.level = level;
    this.raw = raw;
  }

  get(...keys: Array<string | number>): NestedSet | Token {
    const key = keys.shift();

    const top = this.raw.filter(node => node.level === this.level);
    const index = typeof key === 'number' ? key
      : top.findIndex((node, index) => node.type === 'key' && node.value === key)
    ;

    const end = index === top.length - 1 ? this.raw.length : this.raw.findIndex(node => node === top[index + 1]);
    let start = this.raw.findIndex(node => node === top[index]) + 1;
    if (this.raw[start].type === 'token-separator') {
      start += 1;
    }

    if (end === start + 1) {
      return this.raw[start];
    }

    const result = new NestedSet(this.raw.slice(start, end), this.raw[start].level);

    if (keys.length) {
      return result.get(...keys);
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

    const delta = stringifyValue(value, target.valueMetadata).length - stringifyValue(target.value, target.valueMetadata).length;
    this.raw[index].value = value;
    this.raw[index].end += delta;

    for (let i = index + 1; i < this.raw.length; i++) {
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

    for (let i = index; i < this.raw.length; i++) {
      this.raw[i].start -= delta;
      this.raw[i].end -= delta;
    }
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

  map(fn: Function): Array<any> {
    return this.keys.map((key: string | number, index: number, keys: Array<string | number>) =>
      fn(this.get(key), key, keys)
    );
  }
}
