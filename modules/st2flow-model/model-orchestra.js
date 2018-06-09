// @flow

import type { ModelInterface, TaskInterface, TaskRefInterface, TransitionInterface, TransitionRefInterface } from './interfaces';
import type NestedSet from '@stackstorm/st2flow-yaml/nested-set';
import type { Token } from '@stackstorm/st2flow-yaml/types';

import { readSet as readYaml, write as writeYaml } from '@stackstorm/st2flow-yaml';

const types = {
  'on-complete': 'Success',
};

export default class OrchestraModel implements ModelInterface {
  tokens: NestedSet;


  constructor(yaml: string) {
    this.tokens = readYaml(yaml);
  }

  toYAML() {
    return writeYaml(this.tokens.raw);
  }

  get(...keys: Array<string | number>) {
    return this.tokens.get(...keys);
  }


  get version() {
    const version: Token = this.get('version');
    if (version.type !== 'value') {
      throw new Error('invalid orchestra structure');
    }

    return version.value;
  }

  get description() {
    const description: Token = this.get('description');
    if (description.type !== 'value') {
      throw new Error('invalid orchestra structure');
    }

    return description.value;
  }

  get tasks(): Array<TaskInterface> {
    const tasks = this.get('tasks');

    return tasks.map((task, name: string | number) => {
      if (typeof name !== 'string') {
        throw new Error('invalid orchestra structure');
      }

      const action: Token = task.get('action');
      if (!action || action.type !== 'value') {
        throw new Error('invalid orchestra structure');
      }

      return {
        name,
        action: action.value,
        coord: { x: 0, y: 0 },
      };
    });
  }

  get transitions() {
    const tasks = this.get('tasks');

    // $FlowFixMe
    return [].concat(...tasks.map((task, from: string | number) => {
      const onComplete = task.get('on-complete');
      if (onComplete) {
        return [].concat(...onComplete.map((transition, index: string | number) => {
          const condition: Token = transition.get('if');

          const next = transition.get('next');

          if (next.type === 'value') {
            return {
              from: { name: from },
              to: { name : next.value },
              type: 'Success',
              condition: condition && condition.value,
            };
          }

          return [].concat(...next.map((to, index: string | number) => {
            return {
              from: { name: from },
              to: { name : to.value },
              type: 'Success',
              condition: condition && condition.value,
            };
          }));
        }));
      }

      return [].concat(...task.keys.filter(key => key !== 'action').map((type: string | number) => {
        const trigger = task.get(type);

        return [].concat(...trigger.map((action, index: string | number) => {
          const condition: Token = action.get('if');
          const to: Token = action.get('next');

          return {
            from: { name: from },
            to: { name : to.value },
            type: types[type],
            condition: condition && condition.value,
          };
        }));
      }));
    }));
  }


  addTask(opts: TaskInterface) {

  }

  updateTask(ref: TaskRefInterface, opts: TaskInterface) {
    const task = this.get('tasks', ref.name);
    if (!task) {
      throw new Error('task not found for ref');
    }

    if (typeof opts.name !== 'undefined') {
      this.tokens.set(task, opts.name, 'key');
    }

    if (typeof opts.action !== 'undefined') {
      const action = task.get('action');
      this.tokens.set(action, opts.action);
    }
  }

  deleteTask(ref: TaskRefInterface) {

  }


  addTransition(opts: TransitionInterface) {

  }

  updateTransition(ref: TransitionRefInterface, opts: TransitionInterface) {
    if (typeof opts.condition !== 'undefined') {
      const condition: Token = findTransitionToken(this.tokens, ref, 'condition');
      if (!condition) {
        throw new Error('transition condition not found for ref');
      }

      this.tokens.set(condition, opts.condition);
    }
  }

  deleteTransition(ref: TransitionRefInterface) {

  }
}

function findTransitionToken(tokens: NestedSet, ref: TransitionRefInterface, key: string): Token | void {
  const task = tokens.get('tasks', ref.from.name);

  if (![ 'condition' ].includes(key)) {
    throw new Error(`invalid key: ${key}`);
  }

  const onComplete = task.get('on-complete');
  if (onComplete) {
    for (const transitionKey of onComplete.keys) {
      const transition = onComplete.get(transitionKey);
      const condition: Token = transition.get('if');

      const next = transition.get('next');

      if (next.type === 'value' && next.value === ref.to.name) {
        if (key === 'condition') {
          return condition;
        }
      }

      for (const toKey of next.keys) {
        const to = next.get(toKey);
        if (to.type === 'value' && to.value === ref.to.name) {
          if (key === 'condition') {
            return condition;
          }
        }
      }
    }
  }

  for (const type of task.keys) {
    const trigger = task.get(type);

    for (const actionKey of trigger.keys) {
      const action = trigger.get(actionKey);
      const condition: Token = action.get('if');
      const to: Token = action.get('next');

      if (to.type === 'value' && to.value === ref.to.name) {
        if (key === 'condition') {
          return condition;
        }
      }
    }
  }

  return undefined;
}
