// @flow

import type { Token, TokenList } from './types';

export default class NestedSet {
  level: number;
  raw: TokenList;

  constructor(raw: TokenList, level: number = 1) {
    this.level = level;
    this.raw = raw;
  }

  get(key: string): NestedSet | Token {
    const top = this.raw.filter(node => node.level === this.level);
    const index = top.findIndex(node => node.type === 'key' && node.value === key);

    const end = index === top.length - 1 ? this.raw.length : this.raw.findIndex(node => node === top[index + 1]);
    let start = this.raw.findIndex(node => node === top[index]) + 1;
    if (this.raw[start].type === 'token-separator') {
      start += 1;
    }

    if (end === start + 1) {
      return this.raw[start];
    }

    return new NestedSet(this.raw.slice(start, end), this.raw[start].level);
  }

  get keys(): Array<string> {
    return this.raw
      .filter(node => node.level === this.level)
      .map(({ type, value }) => {
        if (type !== 'key') {
          throw new Error('invalid structure');
        }

        return value;
      })
    ;
  }
}
