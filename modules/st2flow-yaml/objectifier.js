// @flow

import type { TokenRawValue, /*TokenKeyValue,*/ TokenMapping, TokenCollection, TokenReference } from './types';

const STR_BACKREF = '<<';

class Objectifier {
  tokenSet;

  constructor(tokenSet) {
    this.tokenSet = tokenSet;
  }

  getTokenValue(token, raw: boolean = false): any {
    if (token == null) {
      return null;
    }

    switch(token.kind) {
      case 0:
        return raw === true ? token.rawValue :
          // The valueObject (if present) always contains the most primitive form
          // of the value (boolean, number, etc) - so use it first.
          token.hasOwnProperty('valueObject') ?
            token.valueObject : token.value;

      case 2:
        return this.getMapping(token);

      case 3:
        return this.getCollection(token);

      case 4:
        return this.getReference(token);

      default:
        throw new Error(`Unrecognized token kind: ${token.kind}`);
    }
  }

  /**
   * Mapping keys can be either single line or multiline.
   */
  getMappingKey(token: TokenRawValue | TokenCollection): string {
    switch(token.kind) {
      case 0: // single line key
        return this.getTokenValue(token);

      case 3: // multiline key
        return token.items.map(t => this.getMappingKey(t)).join(',');

      default:
        throw new Error(`Unrecognized key kind: ${token.kind}`);
    }
  }

  /**
   * This returns an object with a special __keys property which preserves
   * the original order of the keys in the YAML file. Consumers should use
   * the __keys property when order matters.
   */
  getMapping(token: TokenMapping): Object {
    const keys = [];
    const result = token.mappings.reduce((obj, t) => {
      const key = this.getMappingKey(t.key);
      const value = this.getTokenValue(t.value);

      if (key === STR_BACKREF) {
        // This object is extending (merging) another object, the value of
        // which has already been assigned to the "<<" property by
        // the time we get here. "value" might be an array objects.
        [].concat(value).forEach(v => {
          keys.unshift(...v.__keys);
          obj = Object.assign({}, v, obj);
        });
      }
      else {
        keys.push(key);
        obj[key] = value;
      }

      return obj;
    }, {});

    // Don't let anybody mess with this
    Object.defineProperty(result, '__keys', {
      value: keys,
      writable: false,
      enumerable: false,
      configurable: false,
    });

    return result;
  }

  getCollection(token: TokenCollection): Array {
    return token.items.map(t => this.getTokenValue(t));
  }

  getReference(token: TokenReference): any {
    const refToken = this.tokenSet.anchors[token.referencesAnchor];
    return this.getTokenValue(refToken);
  }
}

export default Objectifier;
