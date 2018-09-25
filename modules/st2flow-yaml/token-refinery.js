// @flow

import type { TokenRawValue, TokenMapping, TokenCollection, AnyToken, Refinement } from './types';
import factory from './token-factory';

const DEFAULT_INDENT = '  ';
const REG_INDENT = /\n( +)\S/;

/**
 * Class for refining tokens whenever mutations are made to the AST.
 */
class Refinery {
  yaml: string;
  tail: string;
  head: string;
  indent: string;

  constructor(yaml: string, head: string, tail: string) {
    // The following fields are required for this module to work properly
    this.yaml = yaml;
    this.head = head;
    this.tail = tail;

    const match = yaml.match(REG_INDENT);
    this.indent = match ? match[1] : DEFAULT_INDENT;
  }

  // This is the only method anybody should care about
  refineTree(tree: TokenMapping): Refinement {
    const newTree: TokenMapping = this.refineToken(tree, this.head.length, 0, tree.jpath);

    return {
      tree: newTree,
      head: this.head,
      tail: this.tail,
    };
  }


  /**
   * Given a token, refines the token
   *
   * NOTE: this causes side effects on the token!! OMG!!!
   */
  refineToken(startToken: AnyToken, startPos: number, depth: number, jpath: Array<string | number>): AnyToken {
    startToken.jpath = jpath;

    switch(startToken.kind) {
      case 0:
        startToken.startPosition = startToken.prefix.reduce((pos, token) => {
          token.startPosition = pos;
          token.endPosition = token.startPosition + token.rawValue.length;
          return token.endPosition;
        }, startPos);
        startToken.endPosition = startToken.startPosition + startToken.rawValue.length;

        break;

      case 1:
        this.refineToken(startToken.key, startPos, depth + 1, jpath.concat('key'));
        startToken.startPosition = startToken.key.startPosition;
        startToken.endPosition = startToken.key.endPosition;

        this.addKeyPrefix(startToken.key, depth, jpath);

        if(startToken.value !== null) {
          this.refineToken(startToken.value, startToken.key.endPosition, depth + 1, jpath.concat('value'));
          startToken.endPosition = startToken.value.endPosition;
          this.addValuePrefix(startToken.value, depth);
        }

        break;

      case 2:
        this.refineCollection(startToken, 'mappings', startPos, depth, jpath);
        break;

      case 3:
        this.refineCollection(startToken, 'items', startPos, depth, jpath);
        break;

      case 4:
        startToken.startPosition = startToken.prefix.reduce((pos, token) => {
          token.startPosition = pos;
          token.endPosition = token.startPosition + token.rawValue.length;
          return token.endPosition;
        }, startPos);

        break;

      default:
        throw new Error(`Unknown token kind: ${startToken.kind}`);
    }

    return startToken;
  }

  /**
   * Given an array of tokens, refines each token in the array.
   * This is used for refining mappings and collections.
   */
  refineCollection(startToken: TokenMapping | TokenCollection, key: string, startPos: number, depth: number, jpath: Array<string | number>) {
    let lastToken: AnyToken;

    startToken[key].reduce((pos, token, i) => {
      if (token !== null) {
        this.refineToken(token, pos, depth, jpath.concat(key, i));

        if(!lastToken) {
          startToken.startPosition = token.startPosition;
        }

        lastToken = token;
        return token.endPosition;
      }

      return pos;
    }, startPos);

    if (!lastToken) {
      throw new Error('Expected lastToken not to be null. This is likely an edge case that needs to be fixed.');
    }

    startToken.endPosition = lastToken.endPosition;
  }

  /**
   * Recursively finds the first token of type 0 or 4
   */
  findFirstValueToken(token: AnyToken): TokenRawValue {
    switch(token.kind) {
      case 0:
      case 4:
        return token;

      case 1:
        return this.findFirstValueToken(token.key);

      case 2:
        return this.findFirstValueToken(token.mappings[0]);

      case 3:
        return this.findFirstValueToken(token.items[0]);

      default:
        throw new Error(`Unrecognized token kind: ${token.kind}`);
    }
  }

  addKeyPrefix(token: TokenRawValue | TokenCollection, depth: number, jpath: Array<string | number>): void {
    if(!token.prefix) {
      token.prefix = [];
    }

    // If there is no prefix AND this is not the first key/value token.
    if(!token.prefix.length && jpath.join('.') !== 'mappings.0') {
      token.prefix.unshift(factory.createToken(`${this.indent.repeat(depth)}`));

      // Detect if this token was inserted at the end of the tree.
      // If so, the old tail should become a prefix.
      if(token.startPosition >= this.yaml.length - this.tail.length) {
        token.prefix.unshift(factory.createToken(`${this.tail}`));
        this.tail = '\n';
      }
    }
  }

  /**
   * Adds the prefix to "value" tokens. Most of the time this will
   * include a colon and white space. For collections, this will also
   * include the dash.
   */
  addValuePrefix(token: AnyToken, depth: number): void {
    switch(token.kind) {
      case 0:
      case 4:
        if (!token.prefix || !token.prefix.length) {
          token.prefix = [ factory.createToken(': ') ];
        }

        return;

      case 2: {
        const rawToken = this.findFirstValueToken(token);
        if(!rawToken.prefix) {
          rawToken.prefix = [];
        }

        // only add the colon if it does not yet exist
        if(rawToken.prefix.every(t => t.value.indexOf(':') === -1)) {
          rawToken.prefix.unshift(factory.createToken(':'));
        }

        return;
      }

      case 3:
        token.items.forEach((t, i) => {
          if(!t) {
            return; // continue
          }

          const token = this.findFirstValueToken(t);
          if(!token.prefix) {
            token.prefix = [];
          }

          // only add the dash if it's not already there
          if(token.prefix.every(t => t.value.indexOf('- ') === -1)) {
            token.prefix.unshift(factory.createToken(`\n${this.indent.repeat(depth + 1)}- `));
          }

          // the fist item in a collection should have a colon prefix
          if(i === 0 && token.prefix[0].value.indexOf(':') === -1) {
            token.prefix.unshift(factory.createToken(':'));
          }
        });

        return;

      default:
        throw new Error(`Cannot add value prefix to token of kind: ${token.kind}`);
    }
  }
}

module.exports = Refinery;
