// @flow

import type { Token } from './types';
import { stringifyValue } from './values';

export default class Writer {
  strings: Array<string> = [];

  write({ type, value, valueMetadata, prefix }: Token) {
    const string = type === 'value' ? stringifyValue(value, valueMetadata) : value;

    this.strings.push(prefix, string);

    return string;
  }

  toString(): string {
    return this.strings.join('');
  }
}
