// @flow

import { AnyToken } from './types';

const strReducer = (str, token) => str + token.rawValue;

const buildString = (value, prefix = [], suffix = []) => {
  let str = prefix.reduce(strReducer, '');
  str += value;
  return suffix.reduce(strReducer, str);
};

const stringifier = {
  /**
   * Recursively stringifies tokens into YAML.
   */
  stringifyToken(token: AnyToken, str: string = ''): string {
    if(!token) {
      return str;
    }

    switch(token.kind) {
      case 0:
        str += buildString(token.rawValue, token.prefix, token.suffix);
        break;

      case 1:
        str += this.stringifyToken(token.key) + this.stringifyToken(token.value);
        break;

      case 2:
        str += token.mappings.reduce((s, t) => this.stringifyToken(t, s), '');
        str += token.suffix ? token.suffix.reduce(strReducer, '') : '';
        break;

      case 3:
        str += token.items.reduce((s, t) => this.stringifyToken(t, s), '');
        str += token.suffix ? token.suffix.reduce(strReducer, '') : '';
        break;

      case 4:
        str += buildString(token.referencesAnchor, token.prefix, token.suffix);
        break;
    }

    return str;
  },
};

export default stringifier;
