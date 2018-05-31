// @flow

import type { TokenType, Token } from './types';
import { parseValue } from './values';

export default class Reader {
  index: number = 0;
  ahead: number = 0;
  data: string;

  constructor(data: string) {
    this.data = data;
  }

  next(): Token {
    const { start, end, type, value, prefix } = extractToken(this.data, this.index);

    this.index = end;
    this.ahead = 0;

    if (type === 'token') {
      const { type: nextType } = extractToken(this.data, this.index);

      if (nextType === 'token-separator') {
        return {
          start,
          end,
          type: 'key',
          value,
          prefix,
        };
      }

      const parsed = parseValue(value);
      return {
        start,
        end,
        type: 'value',
        value: parsed.value,
        valueMetadata: parsed.metadata,
        prefix,
      };
    }

    return {
      start,
      end,
      type,
      value,
      prefix,
    };
  }

  lookAhead(): Token {
    const { start, end, type, value, prefix } = extractToken(this.data, this.index + this.ahead);

    this.ahead = end - this.index;

    if (type === 'token') {
      const { type: nextType } = extractToken(this.data, this.index + this.ahead);

      if (nextType === 'token-separator') {
        return {
          start,
          end,
          type: 'key',
          value,
          prefix,
        };
      }

      const parsed = parseValue(value);
      return {
        start,
        end,
        type: 'value',
        value: parsed.value,
        valueMetadata: parsed.metadata,
        prefix,
      };
    }

    return {
      start,
      end,
      type,
      value,
      prefix,
    };
  }
}

const whitespace = /^(\s+)/;

const specialTokens = {
  ':': 'token-separator',
  '-': 'token-sequence',
};

function extractToken(data: string, start: number): { start: number, end: number, type: TokenType | 'token', value: string, prefix: string } {
  let index = start;
  let prefix = data.slice(index).match(whitespace) || '';
  if (prefix) {
    prefix = prefix[1];
    index += prefix.length;
  }

  if (index === data.length) {
    return {
      start,
      end: index,
      type: 'eof',
      value: '',
      prefix,
    };
  }

  const chars = [];
  while(index < data.length) {
    const next = data[index++];

    if (next === '"') {
      const end = data.indexOf(next, index);
      const rest = data.slice(index, end);

      chars.push(rest);
      index += rest.length;
      break;
    }

    if (specialTokens[next]) {
      if (chars.length > 0) {
        index -= 1;
        break;
      }

      chars.push(next);
      break;
    }

    if (next.match(whitespace)) {
      index -= 1;
      break;
    }

    chars.push(next);
  }

  const value = chars.join('');
  const type = specialTokens[value] || 'token';

  return {
    start,
    end: index,
    type,
    value,
    prefix,
  };
}
