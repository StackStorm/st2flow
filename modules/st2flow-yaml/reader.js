// @flow

import type { Token, TokenList } from './types';
import { parseValue } from './values';
import extractToken, { endOfFileToken } from './extractor';

export default class Reader {
  // index: number = 0;
  currentStart: number = 0; // TODO: should not start/end? See comment below.
  cursor: Array<number> = [0, 0]; // [line, col]
  ancestors: TokenList = [];
  data: string;
  nextToken: Token = null;

  constructor(data: string) {
    this.data = data;
    this.lines = this.data.replace(/\r/g, '').split(/\n/);
  }

  getNextToken() {
    const lineNum = this.cursor[0];
    const colNum = this.cursor[1];
    let token, length;

    if (lineNum === this.lines.length) {
      token = endOfFileToken();
    } else {
      const line = this.lines[lineNum];
      token = extractToken(this.ancestors, line, colNum);

      if (token.end === line.length) {
        this.cursor = [lineNum + 1, 0];
      } else {
        this.cursor[1] = token.end;
      }
    }

    token.line = lineNum;
    token.col = colNum;

    return token;
  }

  next(): Token {
    const token = this.nextToken || this.getNextToken();
    this.nextToken = null;

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

    token.level = this.ancestors.length;

    // TODO: the first version of this reader used start/end to represent
    // where a token existed in the context of the entire yaml string.
    // This shouldn't be needed any more now that empty-lines get their
    // own token and we keep track of line/col instead. We keep start/end
    // right now to prevent too much refactor at once. Eventually, we shouldn't
    // need the folling 3 lines.
    const length = token.end - token.start;
    token.start = this.currentStart;
    token.end = this.currentStart = this.currentStart + length;

    if (token.type === 'token') {
      const { type: nextType } = this.nextToken = this.getNextToken();

      if (nextType === 'token-separator') {
        token.type = 'key';
      }
      else {
        const parsed = parseValue(token.value);
        token.type = 'value';
        token.value = parsed.value;
        token.valueMetadata = parsed.metadata;
      }
    }

    return token;
  }
}
