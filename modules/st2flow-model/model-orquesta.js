// @flow

import type { ModelInterface, TaskInterface, TaskRefInterface, TransitionInterface, TransitionRefInterface } from './interfaces';

import { crawler } from '@stackstorm/st2flow-yaml';
import BaseModel, { STR_ERROR_SCHEMA }  from './base-model';

const REG_COORDS = /\[\s*(\d+)\s*,\s*(\d+)\s*\]/;

// TODO: replace with reference to generated schema in orquesta repo:
// https://github.com/StackStorm/orquesta/blob/master/orquesta/specs/native/v1/models.py
import schema from './schemas/orquesta.json';

class OrquestaModel extends BaseModel implements ModelInterface {
  constructor(yaml: ?string) {
    super(schema, yaml);
  }

  get tasks(): Array<TaskInterface> {
    const tasks = crawler.getValueByKey(this.tokenSet, 'tasks');

    if(!tasks) {
      // TODO: make part of schema validation
      this.emitter.emit(STR_ERROR_SCHEMA, new Error('No tasks found.'));
      return [];
    }

    return tasks.__meta.keys.map(name => {
      let coords;
      if(REG_COORDS.test(tasks[name].__meta.comments)) {
        coords = JSON.parse(tasks[name].__meta.comments.replace(REG_COORDS, '{ "x": $1, "y": $2 }'));
      }

      return Object.assign({}, {
        name,
        size: { x: 120, y: 48 },
      }, tasks[name], {
        coords: { x: 0, y: 0, ...coords },
      })
    });
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
            to = [];
            this.emitter.emit(STR_ERROR_SCHEMA, new Error(`Task "${task.name}" transition #${i + 1} must define the "do" property.`));
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
      crawler.renameMappingKey(this.tokenSet, ['tasks', ref.name ], name);
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
    const task: TaskInterface = rawTasks[from.name];

    if(!task) {
      throw new Error(`No task found with name "${from.name}"`);
    }

    const hasNext = task.hasOwnProperty('next');
    const next = hasNext && task.next || [];

    const nextItem = {
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
