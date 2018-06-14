// @flow

import type { Token, TokenList } from './types';

const whitespace = /^(\s+)/;
const newlineStart = /^((?:\r\n|\n)+)/;

const specialTokens = {
  ':': {
    test: () => true,
    token: 'token-separator',
  },
  '-': {
    test: (chars) => !chars.length,
    token: 'token-sequence',
  },
  '"': {
    test: (chars) => !chars.length,
    process: (ancestors: TokenList, data: string, index: number, chars: Array<string>) => {
      const end = data.indexOf('"', index);
      const rest = data.slice(index, end);

      chars.push(rest);
      return rest.length + 1;
    },
  },
  '>': {
    test: (chars) => !chars.length,
    process: (ancestors: TokenList, data: string, index: number, chars: Array<string>) => {
      const { length, data: rest } = getMultiline(index, data);

      chars.push([ '>' ].concat(rest).join('\n'));
      return length;
    },
  },
  '|': {
    test: (chars) => !chars.length,
    process: (ancestors: TokenList, data: string, index: number, chars: Array<string>) => {
      const { length, data: rest } = getMultiline(index, data);

      chars.push([ '|' ].concat(rest).join('\n'));
      return length;
    },
  },
};

function getSpecial(token?: string, chars: Array<string>): null | Object {
  if (typeof token === 'undefined') {
    return null;
  }

  const special = specialTokens[token];
  if (!special || !special.test(chars)) {
    return null;
  }

  return special;
}

function getPrefix(data: string, index: number): string {
  const prefix = data.slice(index).match(whitespace);
  return prefix && prefix[1] || '';
}

export default function extractToken(ancestors: TokenList, data: string, start: number): Token {
  let index = start;

  const prefix = getPrefix(data, index);
  index += prefix.length;

  if (index === data.length) {
    return {
      start,
      end: index,
      level: -ancestors.length,
      type: 'eof',
      value: '',
      prefix,
      suffix: '',
      newline: true,
    };
  }

  const chars: Array<string> = [];
  while(index < data.length) {
    const next = data[index++];

    const special = getSpecial(next, chars);
    if (special) {
      if (typeof special.process === 'function') {
        index += special.process(ancestors, data, index, chars);
        break;
      }

      if (chars.length > 0) {
        index -= 1;
        break;
      }

      chars.push(next);
      break;

    }

    // using `index - 1` so it verifies current is whitespace
    const nextAfterWhitespace = getNextAfterWhitespace(index - 1, data);
    if (next === '\n' || getSpecial(nextAfterWhitespace, chars)) {
      index -= 1;
      break;
    }

    chars.push(next);
  }

  let suffix = data.slice(index).match(newlineStart) || '';
  if (suffix) {
    suffix = suffix[1];
    index += suffix.length;
  }

  const value = chars.join('');
  const type = (specialTokens[value] ? specialTokens[value].token : null) || 'token';

  const last = ancestors[ancestors.length - 1];
  const newline = (!last || last.suffix) ? true : false;

  let level = 0;
  if (last && last.suffix) {
    const previousIndex = findLastIndex(ancestors.slice(0, -1), ancestor => ancestor.newline);
    const previous = ancestors[previousIndex];

    if (prefix === previous.prefix) {
      level = previousIndex - ancestors.length;
    }
    else if (previous.prefix.startsWith(prefix)) {
      const siblingIndex = findLastIndex(ancestors.slice(0, -1), ancestor => ancestor.newline && ancestor.prefix === prefix);

      level = siblingIndex - ancestors.length;
    }
    else if (prefix.startsWith(previous.prefix)) {
      const parentIndex = findLastIndex(ancestors.slice(0), ancestor => ancestor.newline && prefix.startsWith(ancestor.prefix));

      for (let i = parentIndex; i < ancestors.length; i++) {
        if (ancestors[i].type.startsWith('token-')) {
          if (i === ancestors.length - 1) {
            level = 1;
          }
          else {
            level = i + 1 - ancestors.length;
          }

          break;
        }
      }
    }
  }
  else {
    level = 1;
  }

  return {
    start,
    end: index,
    level,
    type,
    value,
    prefix,
    suffix,
    newline,
  };
}

function getNextAfterWhitespace(index: number, data: string): string | void {
  const match = data.slice(index).match(whitespace);
  if (!match) {
    return undefined;
  }

  return data[index + match[0].length];
}

function getMultiline(index: number, data: string): { length: number, data: Array<string> } {
  const lines = data.slice(index + 1).split('\n');
  const keep = [];

  let prefix = '';
  for (const line of lines) {
    if (line.length) {
      const match = line.match(whitespace);
      if (!match) {
        break;
      }

      if (!prefix) {
        prefix = match[0];
      }

      if (!match[0].startsWith(prefix)) {
        break;
      }
    }

    keep.push(line);
  }

  if (keep[keep.length - 1] === '') {
    keep.splice(keep.length - 1, 1);
  }

  if (!prefix || keep.length === 0) {
    throw new Error('Error parsing yaml');
  }

  return {
    length: 1 + keep.reduce((s, v) => s + v.length, keep.length - 1),
    data: keep,
  };
}


function findLastIndex(array: Array<any>, test: Function): number {
  for (let i = array.length - 1; i >=0; i--) {
    if (test(array[i], i, array)) {
      return i;
    }
  }

  return -1;
}
