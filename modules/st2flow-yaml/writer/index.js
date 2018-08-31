// @flow

import type { Token, TokenList } from './types';
import writeValue from './stringify-value';

function writeToken({ type, value, valueMetadata, prefix, suffix }: Token): string {
  const string = type === 'value' ? stringifyValue(value, valueMetadata) : value;

  return (prefix || '') + string + (suffix || '');
}

function writeSet(tokens: TokenList): string {
  return tokens.reduce((str, token) => str + writeToken(token), '');
}

class Writer {
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

export default Writer;
export { writeValue, writeToken, writeSet };
