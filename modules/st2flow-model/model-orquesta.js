// @flow

import type { ModelInterface, TaskInterface, TaskRefInterface, TransitionInterface, TransitionRefInterface } from './interfaces';
import type { TokenMeta } from '@stackstorm/st2flow-yaml';

import { crawler, util } from '@stackstorm/st2flow-yaml';
import BaseModel from './base-model';

// TODO: replace with reference to generated schema in orquesta repo:
// https://github.com/StackStorm/orquesta/blob/master/orquesta/specs/native/v1/models.py
import schema from './schemas/orquesta.json';

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
    const rawTasks: RawTasks = crawler.getValueByKey(this.tokenSet, 'tasks');

    if(!rawTasks) {
      return [];
    }

    // Normalize task data.
    //  - ensure all tasks have a normalized transitions collection
    //  - parse comments for coords
    return rawTasks.__meta.keys.map(taskName => {
      const rawTask: RawTask = rawTasks[taskName];

      if (!rawTask.next) {
        rawTask.next = [];
      }

      const transitions: Array<TransitionInterface> = rawTask.next
        .reduce(reduceTransitions, [])
        // remove transitions to tasks which don't exist
        .filter(t => rawTasks.hasOwnProperty(t.to.name))
        // add the common "from" to all transitions
        .map(t => Object.assign(t, { from: { name: taskName } }));

      let coords;
      if(REG_COORDS.test(rawTask.__meta.comments)) {
        coords = JSON.parse(rawTask.__meta.comments.replace(REG_COORDS, '{ "x": $1, "y": $2 }'));
      }

      const task: TaskInterface = {
        name: taskName,
        action: rawTask.action,
        size: { x: 120, y: 44 },
        coords: { x: 0, y: 0, ...coords},
        transitions,
      };

      return task;
    });
  }

  get transitions(): Array<TransitionInterface> {
    return this.tasks.reduce((arr, task) => {
      arr.push(...task.transitions);
      return arr;
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

    crawler.assignMappingItem(this.tokenSet, [ 'tasks', name ], data);
    this.emitChange(oldData, this.tokenSet.toObject());
  }

  updateTask(ref: TaskRefInterface, task: TaskInterface) {
    const oldData = this.tokenSet.toObject();
    const { name, coords, ...data } = task;

    if(coords) {
      util.defineExpando(data, '__meta', {
        comments: `[${coords.x}, ${coords.y}]`,
      });
    }

    if(ref.name !== name) {
      crawler.renameMappingKey(this.tokenSet, [ 'tasks', ref.name ], name);
    }

    crawler.replaceTokenValue(this.tokenSet, [ 'tasks', name ], data);
    this.emitChange(oldData, this.tokenSet.toObject());
  }

  deleteTask(ref: TaskRefInterface) {
    const oldData = this.tokenSet.toObject();
    const { name } = ref;
    crawler.deleteMappingItem(this.tokenSet, [ 'tasks', name ]);

    const newData = this.tokenSet.toObject();
    this.emitChange(oldData, newData);
  }

  addTransition(transition: TransitionInterface) {
    const { from, to } = transition;
    const oldData = this.tokenSet.toObject();
    const rawTasks = crawler.getValueByKey(this.tokenSet, 'tasks');
    const task: RawTask = rawTasks[from.name];

    if(!task) {
      throw new Error(`No task found with name "${from.name}"`);
    }

    const hasNext = task.hasOwnProperty('next');
    const next = hasNext && task.next || [];

    const nextItem: NextItem = {
      do: to.name,
    };

    if(transition.condition) {
      nextItem.when = transition.condition;
    }

    next.push(nextItem);

    // TODO: this can be replaced by a more generic "set" method
    crawler[hasNext ? 'replaceTokenValue' : 'assignMappingItem'](this.tokenSet, [ 'tasks', from.name, 'next' ], next);

    const newData = this.tokenSet.toObject();
    this.emitChange(oldData, newData);
  }

  updateTransition(ref: TransitionRefInterface, transition: TransitionInterface) {
    throw new Error('Not yet implemented');
  }

  deleteTransition(ref: TransitionRefInterface) {
    throw new Error('Not yet implemented');
  }
}

function reduceTransitions(arr, nxt, i): Array<TransitionInterface> {
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
