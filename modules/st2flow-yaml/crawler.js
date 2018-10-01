// @flow

import type { TokenRawValue, TokenKeyValue, TokenMapping, TokenCollection, AnyToken } from './types';

import factory from './token-factory';
import TokenSet from './token-set';
import { get, splitKey } from './util';

/**
 * TokenSet consumers will often work with the "objectified" version
 * of the YAML file, which looks something like this:
 *
 * {
 *   version: 1,
 *   tasks: {
 *     task1: {
 *       action: "core.local"
 *     }
 *   }
 * }
 *
 * Given a key of "tasks.task1", this method will find the corresponding
 * "task1" token within the given branch. This method is recursive, and generally
 * the starting branch should always be the root node: tokenSet.tree.
 */
function getTokenByKey(branch: AnyToken, key: string | Array<string | number>): AnyToken {
  if (!branch) {
    return undefined;
  }

  const keyArr: Array<string | number> = splitKey(key);

  if(!keyArr.length) {
    return branch;
  }

  if(branch.kind === 0) {
    // The following mimicks the behavior of reading normal JS objects
    if(keyArr.length === 1) {
      return undefined;
    }

    throw new Error(`Cannot read property ${keyArr[1]} of undefined.`);
  }

  const segment = keyArr.shift();

  switch(branch.kind) {
    case 2: {
      const kvToken: TokenKeyValue = branch.mappings.find(kvt =>
        kvt.key.value === segment
      );

      if (!kvToken) {
        return undefined;
      }

      return getTokenByKey(keyArr.length ? kvToken.value : kvToken.key, keyArr);
    }

    case 3:
      return getTokenByKey(branch.items[segment], keyArr);

    default:
      throw new Error(`Error looking up token for "${segment}.${keyArr.join('.')} on branch kind: ${branch.kind}`);
  }
}

/**
 * Given a key such as "tasks.foo", returns the value as a token and
 * verifies it's the expected kind.
 */
function getTokenValueByKey(tokenSet: TokenSet, key: string | Array<string | number>, kind?: number): AnyToken {
  const token = getTokenByKey(tokenSet.tree, key);

  if (!token) {
    throw new Error(`Could not find token for path: ${key.toString()}`);
  }

  const parentToken: AnyToken = getTokenParent(tokenSet, token);
  const valueToken: AnyToken = parentToken.kind === 1 ? parentToken.value : token;

  if (typeof kind !== 'undefined' && valueToken.kind !== kind) {
    throw new Error(`Value token is not of kind "${kind}" at path: ${key.toString()}`);
  }

  return valueToken;
}

/**
 * Given a token, returns the parent token from the AST.
 */
function getTokenParent(tokenSet: TokenSet, token): AnyToken {
  const result: AnyToken | Array<AnyToken> = get(tokenSet.tree, token.jpath.slice(0, -1));

  if(Array.isArray(result) || !result.hasOwnProperty('kind')) {
    return get(tokenSet.tree, token.jpath.slice(0, -2));
  }

  return result;
}

const crawler = {
  getValueByKey(tokenSet: TokenSet, key: string | Array<string | number>): any {
    if(tokenSet) {
      return get(tokenSet.toObject(), key);
    }

    return undefined;
  },

  /**
   * Given a key and value, replaces the existing value with the new value.
   *
   * {
   *   version: 1,
   *   tasks: {
   *     task1: {
   *       action: "core.local"
   *     }
   *   }
   * }
   *
   * crawler.replaceTokenValue(tokenSet, 'tasks.task1', { action: 'aws.lambda' });
   *
   * {
   *   version: 1,
   *   tasks: {
   *     task1: {
   *       action: "aws.lambda"
   *     }
   *   }
   * }
   */
  replaceTokenValue(tokenSet: TokenSet, key: string | Array<string | number>, value: any) {
    const valueToken: AnyToken = getTokenValueByKey(tokenSet, key);
    const parentToken: TokenKeyValue | TokenCollection = getTokenParent(tokenSet, valueToken);

    switch(parentToken.kind) {
      case 1:
        parentToken.value = factory.createToken(value);
        tokenSet.refineTree();
        break;

      case 3: {
        const index = valueToken.jpath.slice(-1)[0];
        parentToken.items.splice(index, 1, factory.createToken(value));
        tokenSet.refineTree();
        break;
      }

      default:
        throw new Error(`Cannot update token of kind ${valueToken.kind} at path: ${key.toString()}`);
    }
  },

  /**
   * Adds a key/value pair to the "target" object.
   *
   * {
   *   version: 1,
   *   tasks: {
   *     task1: {
   *       action: "core.local"
   *     }
   *   }
   * }
   *
   * crawler.addMappingItem(tokenSet, 'tasks.task2', { action: 'core.local' });
   * crawler.addMappingItem(tokenSet, 'tasks.task2.input', { cmd: 'echo "Hello World"' });
   *
   * {
   *   version: 1,
   *   tasks: {
   *     task1: {
   *       action: "core.local"
   *     },
   *     task2: {
   *       action: "core.local",
   *       input: {
   *         cmd: 'echo "Hello World"'
   *       }
   *     }
   *   }
   * }
   */
  assignMappingItem(tokenSet: TokenSet, targetKey: string | Array<string | number>, val: any) {
    const targKey: Array<string | number> = splitKey(targetKey);

    if(!targKey.length) {
      throw new Error(`Cannot add a key to a blank target: ${targetKey.toString()}`);
    }

    let token: TokenMapping;
    let newKey: string | number;

    if(targKey.length === 1) {
      token = tokenSet.tree;
      newKey = targKey[0];
    }
    else {
      const parentObjKey: Array<string | number> = targKey.slice(0, -1);
      token = getTokenValueByKey(tokenSet, parentObjKey, 2);
      newKey = targKey[targKey.length - 1];
    }

    const kvToken = factory.createKeyValueToken(`${newKey}`, val);

    token.mappings.push(kvToken);
    tokenSet.refineTree();
  },

  /**
   * Deletes the given key (and its value) from a mapping.
   *
   * {
   *   version: 1,
   *   tasks: {
   *     task1: {
   *       action: "core.local"
   *     }
   *   }
   * }
   *
   * crawler.deleteMappingItem(tokenSet, 'version');
   * crawler.deleteMappingItem(tokenSet, 'tasks.task1');
   */
  deleteMappingItem(tokenSet: TokenSet, key: string | Array<string | number>) {
    const token: TokenRawValue = getTokenByKey(tokenSet.tree, key);

    if (!token) {
      throw new Error(`Could not find token for path: ${key.toString()}`);
    }

    const parentKvToken: TokenKeyValue = getTokenParent(tokenSet, token);

    if(parentKvToken.kind !== 1) {
      throw new Error('The key must point to a valid mapping key. If you are trying to delete an item from a collection, use the "spliceCollection" method.');
    }

    const parentMappingToken = getTokenParent(tokenSet, parentKvToken);

    parentMappingToken.mappings.splice(parentKvToken.jpath.slice(-1)[0], 1);
    tokenSet.refineTree();
  },

  /**
   * Works exactly like Array.prototype.splice for the target collection.
   *
   * {
   *   version: 1,
   *   items:
   *   - item 1
   *   - item 2
   *   - item 3
   * }
   *
   * crawler.spliceCollection(tokenSet, 'items', 1, 1, 'newItem');
   *
   * {
   *   version: 1,
   *   items:
   *   - item 1
   *   - newItem
   *   - item 3
   * }
   */
  spliceCollection(tokenSet: TokenSet, targetKey: string | Array<string | number>, start: string, deleteCount: number, ...items: Array<AnyToken>) {
    const token: TokenCollection = getTokenValueByKey(tokenSet, targetKey, 3);
    const tokens = items.map(item => factory.createToken(item));

    token.items.splice(start, deleteCount, ...tokens);
    tokenSet.refineTree();
  },

  /**
   * Recursively finds the first token of type 0 or 4
   */
  findFirstValueToken(token: AnyToken): TokenRawValue {
    if(token === null || typeof token === 'undefined') {
      return null;
    }

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
  },
};

export default crawler;
