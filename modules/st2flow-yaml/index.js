// @flow

import type { Token } from './types';
import Reader from './reader';
import Writer from './writer';

export function read(yaml: string): Array<Token> {
  const reader = new Reader(yaml);
  const tokens = [];

  let token;
  do {
    token = reader.next();
    tokens.push(token);
  }
  while (token.type !== 'eof');

  return tokens;
}

export function write(tokens: Array<Token>): string {
  const writer = new Writer();

  for (const token of tokens) {
    writer.write(token);
  }

  return writer.toString();
}
