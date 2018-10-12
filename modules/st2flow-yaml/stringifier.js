// @flow

import { AnyToken } from './types';

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
        token.prefix.forEach(pre => str += pre.rawValue);
        str += token.rawValue + (token.suffix || '');
        break;

      case 1:
        str += this.stringifyToken(token.key) + this.stringifyToken(token.value);
        break;

      case 2:
        str += token.mappings.reduce((s, t) => this.stringifyToken(t, s), '');
        break;

      case 3:
        str += token.items.reduce((s, t) => this.stringifyToken(t, s), '');
        break;

      case 4:
        token.prefix.forEach(pre => str += pre.rawValue);
        str += token.referencesAnchor + (token.suffix || '');
        break;
    }

    return str;
  },
};

export default stringifier;
