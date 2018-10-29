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
  do: string | Array<string>,
  when?: string,
};

type RawTask = {
  __meta: TokenMeta,
  action: string,
  input?: Object,
  next?: Array<NextItem>,
  coords?: Object,
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

  get tasks(): Array<TaskInterface> {
    const tasks: RawTasks = crawler.getValueByKey(this.tokenSet, 'tasks');

    if(!tasks) {
      return [];
    }

    return tasks.__meta.keys.map(name => {
      const task = tasks[name];

      let coords;
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

      const { action = '', input, 'with': _with } = task;
      const [ actionRef, ...inputPartials ] = action.split(' ');

      if (inputPartials.length) {
        task.__meta.inlineInput = true;
      }

      if (typeof _with === 'string') {
        task.__meta.withString = true;
      }

      return Object.assign({
        name,
        size: { x: 120, y: 48 },
      }, task, {
        action: actionRef,
        input: {
          ...input,
          ...matchAll(inputPartials.join(' '), REGEX_INLINE_PARAMS),
        },
        coords: { x: 0, y: 0, ...coords },
        with: typeof _with === 'string' ? { items: _with } : _with,
      });
    });
  }

  get transitions(): Array<TransitionInterface> {
    const tasks: RawTasks = crawler.getValueByKey(this.tokenSet, 'tasks');

    if(!tasks) {
      return [];
    }

    return Object.keys(tasks).reduce((arr, name) => {
      const task: RawTask = tasks[name];
      const transitions: Array<TransitionInterface> | false = !!task.next && task.next
        .reduce(reduceTransitions, [])
        // remove transitions to tasks which don't exist
        .filter(t => tasks.hasOwnProperty(t.to.name))
        // add the common "from" to all transitions
        .map(t => Object.assign(t, { from: { name } }));

      return arr.concat(transitions || []);
    }, []);
  }

  get lastTaskIndex() {
    return crawler.getValueByKey(this.tokenSet, 'tasks').__meta.keys
      .map(item => (item.match(/task(\d+)/) || [])[1])
      .reduce((acc, item) => Math.max(acc, item || 0), 0);
  }

  addTask(task: TaskInterface) {
    const oldData = this.tokenSet.toObject();
    const { name, coords, ...data } = task;

    if(coords) {

      util.defineExpando(data, '__meta', {
        comments: `[${coords.x}, ${coords.y}]`,
      });
    }

    crawler.set(this.tokenSet, [ 'tasks', name ], data);
    this.emitChange(oldData, this.tokenSet);
  }

  updateTask(ref: TaskRefInterface, task: any) {
    const oldData = this.tokenSet.toObject();
    const { name, coords, action, input } = task;

    if (name && ref.name !== name) {
      crawler.renameMappingKey(this.tokenSet, [ 'tasks', ref.name ], name);
      ref.name = name;
    }

    if (coords) {
      const comments = crawler.getCommentsForKey(this.tokenSet, [ 'tasks', ref.name ]);
      crawler.setCommentForKey(this.tokenSet, [ 'tasks', ref.name ], comments.replace(REG_COORDS, `[${coords.x}, ${coords.y}]`));
    }

    if (action) {
      crawler.set(this.tokenSet, [ 'tasks', ref.name, 'action' ], action);
    }

    if (input) {
      crawler.set(this.tokenSet, [ 'tasks', ref.name, 'input' ], input);
    }

    this.emitChange(oldData, this.tokenSet);
  }

  setTaskProperty(ref: TaskRefInterface, path: JpathKey , value: any) {
    const oldData = this.tokenSet.toObject();
    crawler.set(this.tokenSet, [ 'tasks', ref.name ].concat(path), value);

    this.emitChange(oldData, this.tokenSet);
  }

  deleteTaskProperty(ref: TaskRefInterface, path: JpathKey) {
    const oldData = this.tokenSet.toObject();
    crawler.deleteMappingItem(this.tokenSet, [ 'tasks', ref.name ].concat(path));

    this.emitChange(oldData, this.tokenSet);
  }

  deleteTask(ref: TaskRefInterface) {
    const oldData = this.tokenSet.toObject();
    crawler.deleteMappingItem(this.tokenSet, [ 'tasks', ref.name ]);

    this.emitChange(oldData, this.tokenSet);
  }

  addTransition(transition: TransitionInterface) {
    const { from, to } = transition;
    const oldData = this.tokenSet.toObject();
    const rawTasks = crawler.getValueByKey(this.tokenSet, 'tasks');
    const task: RawTask = rawTasks[from.name];

    if(!task) {
      throw new Error(`No task found with name "${from.name}"`);
    }

    const next = task.hasOwnProperty('next') && task.next || [];

    const nextItem: NextItem = {
      do: to.name,
    };

    if(transition.condition) {
      nextItem.when = transition.condition;
    }

    next.push(nextItem);

    // TODO: this can be replaced by a more generic "set" method
    crawler.set(this.tokenSet, [ 'tasks', from.name, 'next' ], next);

    this.emitChange(oldData, this.tokenSet);
  }

  updateTransition(ref: TransitionRefInterface, transition: TransitionInterface) {
    throw new Error('Not yet implemented');
  }

  deleteTransition(ref: TransitionRefInterface) {
    const oldData = this.tokenSet.toObject();

    const transitions = crawler.getValueByKey(this.tokenSet, [ 'tasks', ref.from.name, 'next' ]);

    transitions.forEach((transition, index) => {
      if (transition.when !== ref.condition) {
        return;
      }

      if (Array.isArray(transition.do)) {
        const i = transition.do.indexOf(ref.to.name);
        if (i >= 0) {
          crawler.spliceCollection(this.tokenSet, [ 'tasks', ref.from.name, 'next', index, 'do' ], i, 1);
          return;
        }
      }

      if (transition.do === ref.to.name) {
        crawler.spliceCollection(this.tokenSet, [ 'tasks', ref.from.name, 'next' ], 0, 1);
        return;
      }
    });

    const newTransitions = crawler.getValueByKey(this.tokenSet, [ 'tasks', ref.from.name, 'next' ]);

    if (newTransitions.length === 0) {
      crawler.deleteMappingItem(this.tokenSet, [ 'tasks', ref.from.name, 'next' ]);
    }

    this.emitChange(oldData, this.tokenSet);
  }
}

function reduceTransitions(arr: Array<TransitionInterface>, nxt: NextItem, i: number): Array<TransitionInterface> {
  let to: Array<string>;

  // nxt.do can be a string, comma delimited string, or array
  if(typeof nxt.do === 'string') {
    to = nxt.do.split(',').map(name => name.trim());
  }
  else if(Array.isArray(nxt.do)) {
    to = nxt.do;
  }
  else {
    return arr;
  }

  const base: Object = {};
  if(nxt.when) {
    base.condition = nxt.when;
  }

  to.forEach(name =>
    arr.push(Object.assign({
      // TODO: figure out "type" property
      // type: 'success|error|complete',
      to: { name },
    }, base))
  );

  return arr;
}

export default OrquestaModel;
