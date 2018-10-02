// @flow

import type { TokenRawValue, TokenKeyValuePair, TokenMapping, TokenCollection, AnyToken, Refinement } from './types';
import crawler from './crawler';
import factory from './token-factory';

const DEFAULT_INDENT = '  ';
const DEFAULT_TAIL = '\n';
const REG_INDENT = /\n( +)\S/;
const REG_ALL_WHITESPACE = /^\s+$/;

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

          if(startToken.value.kind !== 3) {
            this.addValuePrefix(startToken.value, depth);
          }
        }

        break;

      case 2:
        this.refineMapping(startToken, startPos, depth, jpath);
        break;

      case 3:
        this.refineCollection(startToken, startPos, depth, jpath);
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
  refineMapping(startToken: TokenMapping, startPos: number, depth: number, jpath: Array<string | number>) {
    let lastToken: AnyToken;

    startToken.mappings.reduce((pos, token, i) => {
      if (token === null) {
        return pos;
      }

      this.refineToken(token, pos, (token.kind === 2 ? depth + 1 : depth), jpath.concat('mappings', i));

      if(!lastToken) {
        startToken.startPosition = token.startPosition;
      }

      lastToken = token;

      return token.endPosition;
    }, startPos);

    if (!lastToken) {
      throw new Error('Expected lastToken not to be null. This is likely an edge case that needs to be fixed.');
    }

    startToken.endPosition = lastToken.endPosition;
  }

  refineCollection(startToken: TokenCollection, startPos: number, depth: number, jpath: Array<string | number>) {
    let lastToken: AnyToken;

    console.log('BEGIN', startToken.startPosition, startToken.endPosition);
    startToken.items.reduce((pos, token, i) => {
      if(token === null) {
        return pos;
      }

      this.refineToken(token, startPos, depth + 1, jpath.concat('items', i));

      if(!lastToken) {
        startToken.startPosition = token.startPosition;
      }

      lastToken = token;

      const rawToken: TokenRawValue = crawler.findFirstValueToken(token);

      if(!rawToken.prefix) {
        rawToken.prefix = [];
      }

      let dashIndex = rawToken.prefix.findIndex(t => t.value.indexOf('- ') !== -1);

      // if it's already there, no need to go further .
      if(dashIndex !== -1) {
        return token.endPosition;
      }

      // First remove any whitespace tokens at the top of the prefix
      let posChange = 0;
      let pre = rawToken.prefix[++dashIndex];
      while(pre && REG_ALL_WHITESPACE.test(pre.rawValue)) {
        posChange -= pre.rawValue.length;
        rawToken.prefix.splice(dashIndex, 1);
        pre = rawToken.prefix[dashIndex];
      }

      // For every instance of ["next", \d] near the top of the jpath,
      // add an indent + dash. So for values like this:
      //   foo: [ [ [ 'bar' ] ] ]
      // the jpath for "bar" will look something like this:
      //   ['mappings', 3, 'value', 'items', 0, 'items', 0, 'items', 0]
      // For values like this:
      //   foo: [ [ [ { bing: 'bar' } ] ] ]
      // the jpath for "bing" will look something like this:
      //   ['mappings', 3, 'value', 'items', 0, 'items', 0, 'items', 0, 'mappings', 0, 'key']
      let itemsIdx = rawToken.jpath.lastIndexOf('items');
      let nesting = 0;
      let lastTwo = rawToken.jpath.slice(itemsIdx, itemsIdx + 2);
      const firstIndex = lastTwo[1];

      while(lastTwo[0] === 'items' && lastTwo[1] === firstIndex) {
        nesting++;
        itemsIdx -= 2;
        lastTwo = rawToken.jpath.slice(itemsIdx, itemsIdx + 2);
      }

      for(let i = 0; i < nesting; i++) {
        let prefix = `\n${this.indent.repeat(depth - i)}- `;
        posChange += prefix.length;
        rawToken.prefix.unshift(factory.createToken(prefix));
      }

      // the fist item in a collection should have a colon prefix
      if(i === 0 && rawToken.prefix[0].value.indexOf(':') === -1) {
        posChange += 1;
        rawToken.prefix.unshift(factory.createToken(':'));
      }

      rawToken.startPosition += posChange;
      rawToken.endPosition += posChange;

      if(token !== rawToken) {
        token.startPosition += posChange;
        token.endPosition += posChange;
      }

      return token.endPosition;
    }, startPos);

    if (!lastToken) {
      throw new Error('Expected lastToken not to be null. This is likely an edge case that needs to be fixed.');
    }

    startToken.endPosition = lastToken.endPosition;
    console.log('END', startToken.startPosition, startToken.endPosition);
  }

  addKeyPrefix(token: TokenRawValue | TokenCollection, depth: number, jpath: Array<string | number>): void {
    if(!token.prefix) {
      token.prefix = [];
    }

    // If there is no prefix AND this is not the first key/value token.
    if(!token.prefix.length && jpath.join('.') !== 'mappings.0') {
      const indent = this.indent.repeat(depth);
      token.prefix.unshift(factory.createToken(indent));
      token.startPosition += indent.length;
      token.endPosition += indent.length;

      // Detect if this token was inserted at the end of the tree.
      // If so, the old tail should become a prefix.
      console.log(token, token.startPosition, this.yaml.length, this.tail.length);
      if(token.startPosition >= this.yaml.length - this.tail.length) {
        token.prefix.unshift(factory.createToken(`${this.tail}`));
        token.startPosition += this.tail.length;
        token.endPosition += this.tail.length;
        this.tail = DEFAULT_TAIL;
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
        const rawToken: TokenRawValue = crawler.findFirstValueToken(token);

        if(!rawToken.prefix) {
          rawToken.prefix = [];
        }

        // only add the colon if it does not yet exist
        if(rawToken.prefix.every(t => t.value.indexOf(':') === -1)) {
          rawToken.prefix.unshift(factory.createToken(':'));
          rawToken.startPosition += 1;
          rawToken.endPosition += 1;
        }

        return;
      }

      case 3:
        throw new Error('Must use addDashPrefix method');

      default:
        throw new Error(`Cannot add value prefix to token of kind: ${token.kind}`);
    }
  }
}

module.exports = Refinery;
