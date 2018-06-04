// @flow

import type { Token, TokenList } from './types';
import { parseValue } from './values';
import extractToken from './extractor';

export default class Reader {
  index: number = 0;
  ancestors: TokenList = [];
  data: string;

  constructor(data: string) {
    this.data = data;
  }

  next(): Token {
    const token = extractToken(this.ancestors, this.data, this.index);
    this.index = token.end;

    if (token.level === 1) {
      this.ancestors.push(token);
    }
    if (token.level === 0) {
      this.ancestors[this.ancestors.length - 1] = token;
    }
    if (token.level < 0) {
      this.ancestors.splice(this.ancestors.length + token.level, -token.level);
      this.ancestors.push(token);
    }

    if (token.type === 'token') {
      const { type: nextType } = extractToken(this.ancestors, this.data, this.index);

      if (nextType === 'token-separator') {
        token.type = 'key';
        token.level = this.ancestors.length;
      }
      else {
        const parsed = parseValue(token.value);
        token.type = 'value';
        token.level = this.ancestors.length;
        token.value = parsed.value;
        token.valueMetadata = parsed.metadata;
      }
    }
    else {
      token.level = this.ancestors.length;
    }

    return token;
  }
}
