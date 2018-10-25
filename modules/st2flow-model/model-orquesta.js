// @flow

import type { ModelInterface, TaskInterface, TaskRefInterface, TransitionInterface, TransitionRefInterface, DeltaInterface } from './interfaces';

import { diff } from 'deep-diff';
import EventEmitter from 'eventemitter3';
import { TokenSet, crawler, util } from '@stackstorm/st2flow-yaml';
import type { TokenMeta } from '@stackstorm/st2flow-yaml';

const REG_COORDS = /\[\s*(\d+)\s*,\s*(\d+)\s*\]/;

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

class OrquestaModel implements ModelInterface {
  tokenSet: TokenSet;
  emitter: EventEmitter;

  constructor(yaml: ?string) {
    this.emitter = new EventEmitter();

    if (yaml) {
      this.fromYAML(yaml);
    }
  }

  fromYAML(yaml: string): void {
    try {
      const oldData = this.tokenSet;
      this.tokenSet = new TokenSet(yaml);
      this.emitChange(oldData, this.tokenSet);
    }
    catch (ex) {
      this.emitter.emit('error', ex);
    }
  }

  toYAML(): string {
    return this.tokenSet.toYAML();
  }

  on(event: string, callback: Function) {
    this.emitter.on(event, callback);
  }

  removeListener(event: string, callback: Function) {
    this.emitter.removeListener(event, callback);
  }

  emitChange(oldData: Object, newData: Object): void {
    // TODO: add schema checks before emitting change event
    const obj1 = oldData ? oldData : {};
    const obj2 = newData ? newData : {};
    const deltas = diff(obj1, obj2) || [];

    if (deltas.length) {
      this.emitter.emit('change', deltas, this.tokenSet.toYAML());
    }
  }

  get version() {
    return crawler.getValueByKey(this.tokenSet, 'version');
  }

  get description() {
    return crawler.getValueByKey(this.tokenSet, 'description');
  }

  // TODO: cache the result - this property is accessed a lot
  get tasks(): Array<TaskInterface> {
    const rawTasks: RawTasks = crawler.getValueByKey(this.tokenSet, 'tasks');

    if(!rawTasks) {
      // TODO: make part of schema validation
      this.emitter.emit('error', new Error('No tasks found.'));
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

  /*
    [
      {
        type: 'fail',
        from: { name: task1 },
        to: { name: task2 },
      }, {
        type: 'success',
        from: { name: task2 },
        to: { name: task3 },
      }
    ]
   */
  get transitions(): Array<TransitionInterface> {
    return this.tasks.reduce((arr, task) => {
      arr.push(...task.transitions);
      return arr;
    }, []);
  }

  get lastTaskIndex() {
    return crawler.getValueByKey(this.tokenSet, 'tasks').__keys
      .map(item => (item.match(/task(\d+)/) || [])[1])
      .reduce((acc, item) => Math.max(acc, item || 0), 0);
  }

  applyDelta(delta: DeltaInterface, yaml: string) {
    // Preliminary tests show that parsing of long/complex YAML files
    // takes less than ~20ms (almost always less than 5ms) - so doing full
    // parsing often is very cheap. In the future we can maybe look into applying
    // only the deltas to the AST, though this will likely not be trivial.
    this.fromYAML(yaml);
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

    crawler.set(this.tokenSet, [ 'tasks', name ], data);
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
