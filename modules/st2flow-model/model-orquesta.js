// @flow

import type { ModelInterface, TaskInterface, TaskRefInterface, TransitionInterface, TransitionRefInterface, DeltaInterface } from './interfaces';

import { diff } from 'deep-diff';
import EventEmitter from 'eventemitter3';
import { TokenSet, crawler } from '@stackstorm/st2flow-yaml';

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
    const tasks = crawler.getValueByKey(this.tokenSet, 'tasks');

    if(!tasks) {
      // TODO: make part of schema validation
      this.emitter.emit('error', new Error('No tasks found.'));
      return [];
    }

    return tasks.__keys.map(name =>
      Object.assign({}, {
        name,
        size: { x: 120, y: 48 },
      }, tasks[name], {
        coords: { x: 0, y: 0, ...tasks[name].coords },
      })
    );
  }

  get transitions(): Array<TransitionInterface> {
    return this.tasks.reduce((arr, task) => {
      if(task.hasOwnProperty('next')) {
        task.next.forEach((nxt, i) => {
          let to;

          // nxt.do can be a string, comma delimited string, or array
          if(typeof nxt.do === 'string') {
            to = nxt.do.split(',').map(name => name.trim());
          }
          else if(Array.isArray(nxt.do)) {
            to = nxt.do;
          }
          else {
            this.emitter.emit('error', new Error(`Task "${task.name}" transition #${i + 1} must define the "do" property.`));
          }

          to.forEach(name => {
            const transition: TransitionInterface = {
              from: { name: task.name },
              to: { name },
            };

            if(nxt.when) {
              transition.condition = nxt.when;
            }

            // TODO: figure out how to compute transition.type?
            arr.push(transition);
          });
        });
      }

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
    const { name, ...data } = task;
    crawler.assignMappingItem(this.tokenSet, `tasks.${name}`, data);

    const newData = this.tokenSet.toObject();
    this.emitChange(oldData, newData);
  }

  updateTask(ref: TaskRefInterface, opts: TaskInterface) {
    throw new Error('Not yet implemented');
  }

  deleteTask(ref: TaskRefInterface) {
    throw new Error('Not yet implemented');
  }

  addTransition(opts: TransitionInterface) {
    throw new Error('Not yet implemented');
  }

  updateTransition(ref: TransitionRefInterface, opts: TransitionInterface) {
    throw new Error('Not yet implemented');
  }

  deleteTransition(ref: TransitionRefInterface) {
    throw new Error('Not yet implemented');
  }
}

export default OrquestaModel;