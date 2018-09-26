// @flow

import type { TokenRawValue, TokenMapping, TokenCollection, TokenReference, AnyToken } from './types';
import crawler from './crawler';

const STR_BACKREF = '<<';
const REG_COMMENT = /^\s+#/;

const defineExpando = (obj, key, value): void => {
  Object.defineProperty(obj, key, {
    value,
    writable: false,
    configurable: false,
    enumerable: false,
  });
}

const getTokenComments = (token: AnyToken): string => {
  let comments;
  let firstToken: TokenRawValue = crawler.findFirstValueToken(token);

  if(level === 1) {
    console.log(firstToken);
  }

  if(firstToken) {
    comments = firstToken.prefix.reduce((str, token) => {
      if(REG_COMMENT.test(token)) {
        str += `${token.rawValue.replace(REG_COMMENT, '')}\n`;
      }
      return str;
    }, '');
  }

  return comments;
}

// DELETE THIS
let level = 0;

class Objectifier {
  anchors: Object;

  constructor(anchors: Object) {
    this.anchors = anchors;
  }

  getTokenValue(token: AnyToken, raw: boolean = false): any {
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
        // the time we get here. "value" might be an array objects which to extend.
        [].concat(value).forEach(v => {
          keys.unshift(...v.__meta.keys);
          obj = Object.assign({}, v, obj);
        });
      }
      else {
        keys.push(key);
        obj[key] = value;
      }

      return obj;
    }, {});

    const comments = getTokenComments(token);
    if(level++ === 0) {

      console.log('LEVEL 0', comments);
    }

    // Expand some useful info
    defineExpando(result, '__meta', {
      keys,
      comments: getTokenComments(token),
      jpath: token.jpath,
    });

    return result;
  }

  getCollection(token: TokenCollection): Array<any> {
    const result = token.items.map(t => this.getTokenValue(t));

    // Expand some useful info
    defineExpando(result, '__meta', {
      comments: getTokenComments(token),
      jpath: token.jpath,
    });

    return result;
  }

  getReference(token: TokenReference): any {
    const refToken = this.anchors[token.referencesAnchor];
    return this.getTokenValue(refToken);
  }
}

export default Objectifier;
