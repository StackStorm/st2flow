// @flow

import type { ModelInterface, TaskInterface, TaskRefInterface, TransitionInterface, TransitionRefInterface, DeltaInterface } from './interfaces';

import { diff } from 'deep-diff';
import EventEmitter from 'eventemitter3';
import { TokenSet, crawler } from '@stackstorm/st2flow-yaml';

type Next = {
  do: string | Array<string>,
  when?: string,
};

type RawTask = {
  action: string,
  input?: Object,
  next?: Array<Next>,
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

  get tasks(): Array<TaskInterface> {
    const rawTasks = crawler.getValueByKey(this.tokenSet, 'tasks');

    if(!rawTasks) {
      // TODO: make part of schema validation
      this.emitter.emit('error', new Error('No tasks found.'));
      return [];
    }

    // Normalize task data.
    //  - ensure all tasks have a normalized transitions collection
    return rawTasks.__meta.keys.map(taskName => {
      const task: RawTask = rawTasks[taskName];

      if (!task.next) {
        task.next = [];
      }

      const transitions: Array<TransitionInterface> = task.next.reduce((arr, nxt, i) => {
        let to: Array<string>;

        // nxt.do can be a string, comma delimited string, or array
        if(typeof nxt.do === 'string') {
          to = nxt.do.split(',').map(name => name.trim());
        }
        else if(Array.isArray(nxt.do)) {
          to = nxt.do;
        }
        else {
          to = [];
          this.emitter.emit('error', new Error(`Task "${taskName}" transition #${i + 1} must define the "do" property.`));
        }

        const base: Object = {};
        if(nxt.when) {
          base.condition = nxt.when;
        }

        const transitions = to.map(name =>
          Object.assign({
            from: { name: taskName },
            to: { name },
          }, base)
        );

        return arr.concat(transitions);
      }, []);

      return {
        name: taskName,
        action: task.action,
        coord: { x: 0, y: 0 },
        transitions,
      };
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

  applyDelta(delta: DeltaInterface, yaml: string) {
    // Preliminary tests show that parsing of long/complex YAML files
    // takes less than ~20ms (almost always less than 5ms) - so doing full
    // parsing often is very cheap. In the future we can maybe look into applying
    // only the deltas to the AST, though this will likely not be trivial.
    this.fromYAML(yaml);
  }

  addTask(task: TaskInterface) {
    const oldData = this.tokenSet.toObject();
    const { name, ...data } = task;
    crawler.assignMappingItem(this.tokenSet, `tasks.${name}`, data);

    const newData = this.tokenSet.toObject();
    this.emitChange(oldData, newData);
  }

  updateTask(ref: TaskRefInterface, task: TaskInterface) {
    const oldData = this.tokenSet.toObject();
    const { name, ...data } = task;
    crawler.replaceTokenValue(this.tokenSet, `tasks.${name}`, data);

    const newData = this.tokenSet.toObject();
    this.emitChange(oldData, newData);
  }

  deleteTask(ref: TaskRefInterface) {
    const oldData = this.tokenSet.toObject();
    const { name } = ref;
    crawler.deleteMappingItem(this.tokenSet, `tasks.${name}`);

    const newData = this.tokenSet.toObject();
    this.emitChange(oldData, newData);
  }

  addTransition(transition: TransitionInterface) {
    const { from, to } = transition;
    const oldData = this.tokenSet.toObject();
    const rawTasks = crawler.getValueByKey(this.tokenSet, 'tasks');
    const task = rawTasks[from.name];

    if(!task) {
      throw new Error(`No task found with name "${from.name}"`);
    }

    const hasNext = task.hasOwnProperty('next');
    const next = hasNext ? task.next : [];

    const nextItem = {
      do: to.name,
    };

    if(transition.condition) {
      nextItem.when = transition.condition;
    }

    next.push(nextItem);

    // TODO: this can be replaced by a more generic "set" method
    crawler[hasNext ? 'replaceTokenValue' : 'assignMappingItem'](this.tokenSet, `tasks.${from.name}.next`, next);

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

export default OrquestaModel;
