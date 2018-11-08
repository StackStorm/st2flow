// @flow

import type { ModelInterface, TaskInterface, TaskRefInterface, TransitionInterface, TransitionRefInterface } from './interfaces';
import type { TokenMeta, JpathKey } from '@stackstorm/st2flow-yaml';

import { crawler, util } from '@stackstorm/st2flow-yaml';
import BaseModel from './base-model';

// The model schema is generated in the orquesta repo. Do not update it manually!
// https://github.com/StackStorm/orquesta/blob/master/docs/source/schemas/orquesta.json
// https://github.com/StackStorm/orquesta/blob/master/orquesta/specs/native/v1/models.py
import schema from './schemas/orquesta.json';

const REGEX_VALUE_IN_BRACKETS = '\\[.*\\]\\s*';
const REGEX_VALUE_IN_QUOTES = '\\"[^\\"]*\\"\\s*';
const REGEX_VALUE_IN_APOSTROPHES = '\'[^\']*\'\\s*';
const REGEX_FLOATING_NUMBER = '[-]?\\d*\\.\\d+';
const REGEX_INTEGER = '[-]?\\d+';
const REGEX_TRUE = 'true';
const REGEX_FALSE = 'false';
const REGEX_NULL = 'null';
const YQL_REGEX_PATTERN = '<%.*?%>';
const JINJA_REGEX_PATTERN = '{{.*?}}';

const REGEX_INLINE_PARAM_VARIATIONS = [
  REGEX_VALUE_IN_BRACKETS,
  REGEX_VALUE_IN_QUOTES,
  REGEX_VALUE_IN_APOSTROPHES,
  REGEX_FLOATING_NUMBER,
  REGEX_INTEGER,
  REGEX_TRUE,
  REGEX_FALSE,
  REGEX_NULL,
  YQL_REGEX_PATTERN,
  JINJA_REGEX_PATTERN,
];

const REGEX_INLINE_PARAMS = new RegExp(`([\\w]+)=(${REGEX_INLINE_PARAM_VARIATIONS.join('|')})(.*)`);

function matchAll(str: string, regexp: RegExp, accumulator:Object = {}) {
  const match = str.match(regexp);

  if (!match) {
    return accumulator;
  }

  const [ , key, value, rest ] = match;
  accumulator[key] = value;

  return matchAll(rest, regexp, accumulator);
}

// The following types are specific to Orquesta
type NextItem = {
  do?: string | Array<string>,
  when?: string,
  publish?: string | Array<Object>,
};

type RawTask = {
  __meta: TokenMeta,
  action: string,
  input?: Object,
  next?: Array<NextItem>,
  with?: string | Object,
  join?: string
};

type RawTasks = {
  __meta: TokenMeta,
  [string]: RawTask,
};

const REG_COORDS = /\[\s*(\d+)\s*,\s*(\d+)\s*\]/;

class OrquestaModel extends BaseModel implements ModelInterface {
  constructor(yaml: ?string) {
    super(schema, yaml);
  }

  get tasks() {
    const tasks: RawTasks = crawler.getValueByKey(this.tokenSet, 'tasks');

    if(!tasks || !tasks.__meta.keys) {
      return [];
    }

    return tasks.__meta.keys.map(name => {
      const task = tasks[name];

      let coords = { x: 0, y: 0 };
      if(task.__meta && REG_COORDS.test(task.__meta.comments)) {
        const match = task.__meta.comments.match(REG_COORDS);
        if (match) {
          const [ , x, y ] = match;
          coords = {
            x: +x,
            y: +y,
          };
        }
      }

      const { action = '', input, 'with': _with, join } = task;
      const [ actionRef, ...inputPartials ] = action.split(' ');

      // if (inputPartials.length) {
      //   task.__meta.inlineInput = true;
      // }

      // if (typeof _with === 'string') {
      //   task.__meta.withString = true;
      // }

      return {
        name,
        coords,
        action: actionRef,
        size: { x: 120, y: 48 },
        input: {
          ...input,
          ...matchAll(inputPartials.join(' '), REGEX_INLINE_PARAMS),
        },
        with: typeof _with === 'string' ? { items: _with } : _with,
        join,
      };
    });
  }

  get transitions() {
    const tasks: RawTasks = crawler.getValueByKey(this.tokenSet, 'tasks');

    if(!tasks) {
      return [];
    }

    return Object.keys(tasks).reduce((arr, name) => {
      if(name === '__meta') {
        return arr;
      }

      const task: RawTask = tasks[name];
      const transitions: Array<TransitionInterface> = (task.next || [])
        .reduce(reduceTransitions, [])
        // remove transitions to tasks which don't exist
        .filter(t => tasks.hasOwnProperty(t.to.name))
        // add the common "from" to all transitions
        .map(t => Object.assign(t, { from: { name } }));

      return arr.concat(transitions || []);
    }, []);
  }

  get lastTaskIndex(): number {
    return crawler.getValueByKey(this.tokenSet, 'tasks').__meta.keys
      .map(item => (item.match(/task(\d+)/) || [])[1])
      .reduce((acc, item) => Math.max(acc, item || 0), 0);
  }

  addTask(task: TaskInterface) {
    const { oldData, oldTree } = this.startMutation();
    const { name, coords, ...data } = task;

    if(coords) {
      util.defineExpando(data, '__meta', {
        comments: `[${coords.x}, ${coords.y}]`,
      });
    }

    crawler.set(this.tokenSet, [ 'tasks', name ], data);
    this.endMutation(oldTree);
  }

  updateTask(ref: TaskRefInterface, newData: TaskInterface) {
    const { oldData, oldTree } = this.startMutation();
    const { name, coords, ...data } = newData;
    const key = [ 'tasks', ref.name ]

    if (name && ref.name !== name) {
      crawler.renameMappingKey(this.tokenSet, key, name);
      key.splice(-1, 1, name);
    }

    if (coords) {
      const comments = crawler.getCommentsForKey(this.tokenSet, key);
      crawler.setCommentForKey(this.tokenSet, key, comments.replace(REG_COORDS, `[${coords.x}, ${coords.y}]`));
    }

    Object.keys(data).forEach(k => {
      crawler.set(this.tokenSet, key.concat(k), data[k]);
    });

    this.endMutation(oldTree);
  }

  setTaskProperty(ref: TaskRefInterface, path: JpathKey , value: any) {
    const { oldTree } = this.startMutation();
    crawler.set(this.tokenSet, [ 'tasks', ref.name ].concat(path), value);

    this.endMutation(oldTree);
  }

  deleteTaskProperty(ref: TaskRefInterface, path: JpathKey) {
    const { oldTree } = this.startMutation();
    crawler.deleteMappingItem(this.tokenSet, [ 'tasks', ref.name ].concat(path));

    this.endMutation(oldTree);
  }

  deleteTask(ref: TaskRefInterface) {
    const { oldTree } = this.startMutation();
    crawler.deleteMappingItem(this.tokenSet, [ 'tasks', ref.name ]);

    this.endMutation(oldTree);
  }

  addTransition(transition: TransitionInterface) {
    const { oldData, oldTree } = this.startMutation();
    const { from, to } = transition;
    const key = [ 'tasks', from.name, 'next' ];

    const next: NextItem = {
      do: to.name,
    };

    if(transition.condition) {
      next.when = transition.condition;
    }

    const existing = crawler.getValueByKey(this.tokenSet, key);
    if(existing) {
      // creates a new array item
      crawler.set(this.tokenSet, key.concat('#'), next);
    }
    else {
      crawler.set(this.tokenSet, key, [ next ]);
    }

    this.endMutation(oldTree);
  }

  updateTransition(oldTransition: TransitionInterface, newData: TransitionInterface) {
    const { oldData, oldTree } = this.startMutation();
    const { publish: oldPublish, condition: oldCondition, from: oldFrom, to: oldTo } = oldTransition;
    let oldKey = [ 'tasks', oldFrom.name, 'next' ];

    const oldTransitions = util.get(oldData, oldKey);

    if(!oldTransitions || !oldTransitions.length) {
      this.emitError(new Error(`Could not find transitions at path ${oldKey.join('.')}`));
      return;
    }

    const oldNextIndex = oldTransitions.findIndex(tr => {
      return doToArray(tr.do).includes(oldTo.name) && (tr.when || null) === oldCondition;
    });

    if(oldNextIndex === -1) {
      this.emitError(new Error(`Could not find transition to update at path ${oldKey.join('.')}`));
      return;
    }

    const oldNext: NextItem = oldTransitions[ oldNextIndex ];
    const oldDoInfo = oldTo && oldTo.name && oldNext.do ? getDoInfo(oldNext.do, oldTo.name) : undefined;
    const { publish: newPublish, condition: newCondition, from: newFrom, to: newTo } = newData;
    const newFromName = newFrom && newFrom.name || oldFrom.name;
    const newKey = [ 'tasks', newFromName, 'next' ];

    const next: NextItem = {};
    if(newData.hasOwnProperty('to') && newData.to.hasOwnProperty('name')) {
      if(newTo.name) {
        if(oldDoInfo) {
          // update existing do, preserving string/array format
          const newDo = doToArray(oldNext.do);
          newDo.splice(oldDoInfo.index, 1, newTo.name);
          next.do = oldDoInfo.type === 'string' ? newDo.join(',') : newDo;
        }
        else {
          next.do = newTo.name;
        }
      }
      else if(oldDoInfo) {
        // newTo.name explicitly set to null, remove the old do
        const newDo = doToArray(oldNext.do);
        newDo.splice(oldDoInfo.index, 1);

        if(newDo.length) {
          next.do = oldDoInfo.type === 'string' ? newDo.join(',') : newDo;
        }
        else {
          delete next.do;
          crawler.deleteMappingItem(this.tokenSet, oldKey.concat(oldNextIndex, 'do'));
        }
      }
    }

    if(newData.hasOwnProperty('condition')) {
      if(newCondition) {
        next.when = newCondition;
      }
      else if(oldCondition) {
        // newCondition explicitly set to null, remove the old condition
        delete next.when;
        crawler.deleteMappingItem(this.tokenSet, oldKey.concat(oldNextIndex, 'when'));
      }
    }

    if(newPublish) {
      if(oldPublish) {
        // TODO: update old string/array
        next.publish = newPublish;
      }
      else {
        next.publish = newPublish;
      }
    }

    const sameFrom = oldFrom.name === newFromName;
    if(sameFrom) {
      newKey.push(oldNextIndex);
      Object.keys(next).forEach(k =>
        crawler.set(this.tokenSet, newKey.concat(k), next[k])
      );
    }
    else {
      const existing = crawler.getValueByKey(this.tokenSet, newKey);

      if (existing) {
        newKey.push(existing.length);
        crawler.moveTokenValue(this.tokenSet, oldKey.concat(oldNextIndex), newKey);
        Object.keys(next).forEach(k =>
          crawler.set(this.tokenSet, newKey.concat(k), next[k])
        );
      } else {
        crawler.set(this.tokenSet, newKey, [ next ])
      }
    }

    this.endMutation(oldTree);
  }

  setTransitionProperty({ from, condition }: TransitionInterface, path: JpathKey, value: any) {
    const { oldTree } = this.startMutation();
    const rawTasks = crawler.getValueByKey(this.tokenSet, 'tasks');
    const task: RawTask = rawTasks[from.name];

    if(!task || !task.next) {
      throw new Error(`No transition found coming from task "${from.name}"`);
    }

    const transitionIndex = task.next.findIndex(transition => transition.when === condition);
    const transition = task.next && task.next[transitionIndex];

    if (!transition) {
      if (condition) {
        throw new Error(`No transition with condition "${condition}" found in task "${from.name}"`);
      }
      else {
        throw new Error(`No transition with empty condition found in task "${from.name}"`);
      }
    }

    crawler.set(this.tokenSet, [ 'tasks', from.name, 'next', transitionIndex ].concat(path), value);

    this.endMutation(oldTree);
  }

  deleteTransitionProperty({ from, condition }: TransitionInterface, path: JpathKey) {
    const { oldTree } = this.startMutation();
    const rawTasks = crawler.getValueByKey(this.tokenSet, 'tasks');
    const task: RawTask = rawTasks[from.name];

    if(!task || !task.next) {
      throw new Error(`No transition found coming from task "${from.name}"`);
    }

    const transitionIndex = task.next.findIndex(transition => transition.when === condition);
    const transition = task.next && task.next[transitionIndex];

    if (!transition) {
      if (condition) {
        throw new Error(`No transition with condition "${condition}" found in task "${from.name}"`);
      }
      else {
        throw new Error(`No transition with empty condition found in task "${from.name}"`);
      }
    }

    crawler.deleteMappingItem(this.tokenSet, [ 'tasks', from.name, 'next', transitionIndex ].concat(path));

    this.endMutation(oldTree);
  }

  deleteTransition(transition: TransitionInterface) {
    const { oldData, oldTree } = this.startMutation();
    const { to, from, type, condition } = transition;
    const key = [ 'tasks', from.name, 'next'];

    const transitions = crawler.getValueByKey(this.tokenSet, key);
    const nextIndex = transitions.findIndex((tr, i) => {
      return doToArray(tr.do).includes(to.name) && (tr.when || null) === condition;
    });

    if(nextIndex === -1) {
      this.emitError(new Error(`Could not find transition "${to.name}" within task "${from.name}"`));
      return;
    }

    const nextItem = transitions[nextIndex];
    const doArr = doToArray(nextItem.do);
    doArr.splice(doArr.indexOf(to.name), 1);

    if(doArr.length) {
      crawler.set(this.tokenSet, key.concat(nextIndex, 'do'), typeof nextItem.do === 'string' ? doArr.join(',') : doArr);
    }
    else {
      // The "do" property is now empty
      if(Object.keys(nextItem).length === 1) {
        // "do" was the only property remaining
        if(transitions.length === 1) {
          // If there was only one transition to begin with,
          // we can now delete the "next" property altogether.
          crawler.deleteMappingItem(this.tokenSet, key);
        }
        else {
          // Otherwise, delete the entire "nextItem".
          crawler.spliceCollection(this.tokenSet, key, nextIndex, 1);
        }
      } else {
        // only delete the empty "do" property
        crawler.deleteMappingItem(this.tokenSet, key.concat(nextIndex, 'do'));
      }
    }

    this.endMutation(oldTree);
  }
}

function reduceTransitions(arr: Array<TransitionInterface>, nxt: any): Array<TransitionInterface> {
  let to: Array<string> = doToArray(nxt.do);

  // nxt.do can be a string, comma delimited string, or array
  if(!to.length) {
    return arr;
  }

  to.forEach(name =>
    arr.push(Object.assign({}, {
      from: { name: '' }, // added later
      condition: nxt.when || null,
      // TODO: normalize publish string/array
      publish: nxt.publish || [],
    }, { to: { name } } ))
  );

  return arr;
}

function doToArray(doItem: ?Array<string> | ?string): Array<string> {
  if(doItem === null || typeof doItem === 'undefined') {
    return [];
  }

  if(typeof doItem === 'string') {
    return doItem.split(',').map(s => s.trim());
  }

  return doItem;
}

function getDoInfo(doItem: Array<string> | string, doValue: string): ?{ type: string, index: number } {
  const type = typeof doItem === 'string' ? 'string' : 'array';
  const index = doToArray(doItem).findIndex(d => d === doValue);

  if(index === -1) {
    return undefined;
  }

  return { type, index };
}

export default OrquestaModel;
