// @flow

import type { TokenRawValue, TokenKeyValue, TokenMapping, TokenCollection } from './types';

import TokenSet from './token-set';
import { get } from './util';

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
function getTokenByKey(branch, key: string | Array): Array {
  if (!branch) {
    return undefined;
  }

  if(typeof key === 'string') {
    // TODO: handle keys with dots
    key = key.split('.').filter(Boolean);
  }

  if(!key.length) {
    return branch;
  }

  if(branch.kind === 0) {
    // The following mimicks the behavior of reading normal JS objects
    if(key.length === 1) {
      return undefined;
    }

    throw new Error(`Cannot read property ${key[1]} of undefined.`);
  }

  const segment = key.shift();

  switch(branch.kind) {
    case 2: {
      const kvToken: TokenKeyValue = branch.mappings.find(kvt =>
        kvt.key.value === segment
      );

      if (!kvToken) {
        return undefined;
      }

      return getTokenByKey(key.length ? kvToken.value : kvToken.key, key);
    }

    case 3:
      return getTokenByKey(branch.items[segment], key);

    default:
      throw new Error(`Error looking up token for "${segment}.${key.join('.')} on branch kind: ${branch.kind}`);
  }
}

/**
 * Given a key, returns the token value and verifies it's the expected kind.
 */
function getTokenValueByKey(tokenSet: TokenSet, key: string | Array, kind: number) {
  const token = getTokenByKey(tokenSet.tree, key);

  if (!token) {
    throw new Error(`Could not find token for path: ${key}`);
  }

  const parentToken = getTokenParent(tokenSet, token);

  let valueToken;
  switch(parentToken.kind) {
    case 1:
      valueToken = parentToken.value;
      break;

    default:
      valueToken = token;
      break;
  }

  if (typeof kind !== 'undefined' && valueToken.kind !== kind) {
    throw new Error(`Value token is not of kind "${kind}" at path: ${key}`);
  }

  return valueToken;
}

function getTokenParent(tokenSet: TokenSet, token) {
  const result = get(tokenSet.tree, token.jpath.slice(0, -1));

  if(Array.isArray(result) || !result.hasOwnProperty('kind')) {
    return get(tokenSet.tree, token.jpath.slice(0, -2));
  }

  return result;
}

const crawler = {
  getValueByKey(tokenSet: TokenSet, key: string | number): any {
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
  replaceTokenValue(tokenSet: TokenSet, key: string | Array, value: any) {
    const valueToken = getTokenValueByKey(tokenSet, key);
    const parentToken = getTokenParent(tokenSet, valueToken);

    switch(parentToken.kind) {
      case 1:
        parentToken.value = tokenSet.createToken(value);
        tokenSet.refineTree();
        break;

      case 3: {
        const index = valueToken.jpath.slice(-1)[0];
        parentToken.items.splice(index, 1, tokenSet.createToken(value));
        tokenSet.refineTree();
        break;
      }

      default:
        throw new Error(`Cannot update token of kind ${valueToken.kind} at path: ${key}`);
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
   * crawler.addMappingItem(tokenSet, 'tasks', 'task2', { action: 'core.local' });
   * crawler.addMappingItem(tokenSet, 'tasks.task2', 'input', { cmd: 'echo "Hello World"' });
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
  addMappingItem(tokenSet: TokenSet, targetKey: string | Array, key: string, val: any) {
    const token: TokenMapping = getTokenValueByKey(tokenSet, targetKey, 2);
    const kvToken: TokenKeyValue = tokenSet.createKeyValueToken(key, val);

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
  deleteMappingItem(tokenSet: TokenSet, key: string | Array) {
    const token: TokenRawValue = getTokenByKey(tokenSet.tree, key);

    if (!token) {
      throw new Error(`Could not find token for path: ${key}`);
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
  spliceCollection(tokenSet: TokenSet, targetKey: string | Array, start: string, deleteCount: number, ...items) {
    const token: TokenCollection = getTokenValueByKey(tokenSet, targetKey, 3);
    const tokens = items.map(item => tokenSet.createToken(item));

    token.items.splice(start, deleteCount, ...tokens);
    tokenSet.refineTree();
  },
};

export default crawler;
