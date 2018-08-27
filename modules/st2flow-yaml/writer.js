// @flow

import type { Token, TokenList } from './types';
import { stringifyValue } from './values';

export { stringifyValue as writeValue }

export function writeToken({ type, value, valueMetadata, prefix, suffix }: Token): string {
  const string = type === 'value' ? stringifyValue(value, valueMetadata) : value;

  return (prefix || '') + string + (suffix || '');
}

export function writeSet(tokens: TokenList): string {
  return tokens.reduce((str, token) => str + writeToken(token), '');
}

export default class Writer {
  strings: Array<string> = [];
  linePrefix: string = '';

  write(token: Token): string {
    const string = writeToken(token);
    this.strings.push(string);

    return string;
  }

  toString(): string {
    return this.strings.join('');
  }
}
