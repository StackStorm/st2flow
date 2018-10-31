// @flow

import type { TokenRawValue, TokenKeyValue, TokenMapping, TokenCollection, ValueToken, AnyToken } from './types';
import { isPlainObject } from './util';

const REG_NEWLINE = /\n/;

/**
 * Factory used to create tokens from raw data.
 */
const factory = {
  /**
   * Given any type of YAML compatable data, creates an AST token.
   */
  createToken(data: any): ValueToken {
    if(Array.isArray(data)) {
      return this.createCollectionToken(data);
    }

    if(isPlainObject(data)) {
      return this.createMappingToken(data);
    }

    if(typeof data === 'string' || data instanceof String) {
      return this.createRawValueToken(data);
    }

    if(typeof data === 'undefined') {
      data = null;
    }

    return this.createRawValueToken(JSON.stringify(data), data);
  },

  /**
   * Given a value string, creates a raw value token (kind: 0)
   * The valObj is the object form of the value. This should be the
   * JS primitive/native form of the value (eg. dates, booleans, numbers, etc.).
   * The startPosition, endPosition, prefix, and jpath should be set
   * by the token-refinery.
   */
  createRawValueToken(val: string, valObj: any): TokenRawValue {
    const token: TokenRawValue = {
      kind: 0,
      value: val,
      rawValue: val,
      doubleQuoted: false,
      plainScalar: true,
      startPosition: 0,
      endPosition: val.length,
      jpath: [],
      prefix: [],
    };

    if(typeof valObj !== 'undefined' && val !== valObj) {
      token.valueObject = valObj;
    }

    return token;
  },

  /**
   * Given a key and a value, creates a key/value token (kind: 1).
   * The value can be any type.
   */
  createKeyValueToken(key: string, val: any): TokenKeyValue {
    const token = {
      kind: 1,
      key: this.createToken(key),
      value: this.createToken(val),
    };

    if(isPlainObject(val) && val.__meta && val.__meta.comments) {
      this.addTokenComments(token.key, val.__meta.comments);
    }

    return token;
  },

  /**
   * Given a plain JS object, creates a mapping token (kind: 2).
   * The values can be a mix of types.
   */
  createMappingToken(data: Object): TokenMapping {
    const mappings = Object.keys(data).reduce((arr, key) => {
      arr.push(this.createKeyValueToken(key, data[key]));
      return arr;
    }, []);

    return {
      kind: 2,
      mappings,
    };
  },

  /**
   * Given an array of values, creates a collection token (kind: 3).
   * The data can be a mix of types of values.
   */
  createCollectionToken(data: Array<any>): TokenCollection {
    const items = data.map(item => this.createToken(item));

    return {
      kind: 3,
      items,
    };
  },

  addTokenComments(token: TokenRawValue, comments: string): void {
    token.prefix = token.prefix.concat(comments.split(REG_NEWLINE).map(c => this.createToken(`# ${c}\n`)));
  },
};

export default factory;
