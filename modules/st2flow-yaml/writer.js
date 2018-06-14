// @flow

import type { Token } from './types';
import { stringifyValue } from './values';

export default class Writer {
  strings: Array<string> = [];
  linePrefix: string = '';

  write({ type, value, valueMetadata, prefix, suffix }: Token) {
    const string = type === 'value' ? stringifyValue(value, valueMetadata) : value;

    this.strings.push(prefix, string, suffix);

    return string;
  }

  toString(): string {
    return this.strings.join('');
  }
}
