// @flow

import type { ModelInterface, TaskInterface, TaskRefInterface, TransitionInterface, TransitionRefInterface, DeltaInterface } from './interfaces';
import type NestedSet from '@stackstorm/st2flow-yaml/nested-set';
import type { Token } from '@stackstorm/st2flow-yaml/types';

import { readSet as readYaml, write as writeYaml } from '@stackstorm/st2flow-yaml';

const types = {
  'on-complete': 'Success',
};

export default class OrchestraModel implements ModelInterface {
  tokens: NestedSet;


  constructor(yaml: ?string) {
    if (yaml) {
      this.parse(yaml);
    }
  }

  parse(yaml: string) {
    this.tokens = readYaml(yaml);
  }

  toYAML() {
    return writeYaml(this.tokens.raw);
  }

  get(...keys: Array<string | number>) {
    return this.tokens.getValueByKey(...keys);
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
    const tokens = this.get('tasks');
    if (!tokens.length) {
      return [];
    }

    // TODO: get rid of this after objectify is finished.
    const first = tokens.getItemAtIndex(0);
    if (first.type !== 'key') {
      throw new Error('invalid set - must start with a key');
    }

    return tokens.filter(t =>
      // filter only task names
      t.type === 'key' && t.level === first.level
    ).reduce((tasks, token, i) => {
      const name = token.value; // task name
      const task = tokens.getValueByKey(name);
      const action = task.getValueByKey('action');
      if (!action) {
        throw new Error('invalid orchestra structure - task must have action');
      }
      tasks.push({
        name,
        action: action.value,
        coords: { x: 1, y: 1 }
      });
      return tasks;
    }, []);
  }

  // TODO: this is not finished and will be moved to NestedSet or util
  arrayify(tokens: NestedSet): Array | Object {
    let first = tokens.getItemAtIndex(0);
    if (first.type !== 'token-sequence') {
      throw new Error('first item must be a sequence separator');
    }
    const result = [];
    tokens.forEach(token => {
      if (token.type === 'token-sequence') return; // continue
      if (token.type === 'value') {

      }
    })
  }

  // TODO: this is not finished and will be moved to NestedSet or util
  objectify(tokens: NestedSet, result = {}): Array | Object {
    // console.log(tokens);
    const isArray = Array.isArray(result);
    let first = tokens.getItemAtIndex(0);

    switch (first.type) {
    case 'token-sequence':
      const sliced = tokens.slice(1);
      console.log('================ SLICE');
      // console.log(sliced);
      // console.log('================');
      return this.objectify(sliced, []);

    case 'value':
      if (!isArray) {
        throw new Error('leading values are intended to be part of an array ' + JSON.stringify(first, null, '  '));
      }
      result.push(first.value);
      return result;

    case 'key':
      break; // keep going

    default:
      throw new Error('invalid set - expected a key but got ' + JSON.stringify(first, null, '  '));
    }

    // console.log('KEYS', tokens.keys);
    return tokens.keys.reduce((obj, key) => {
      const value: Token | NestedSet = tokens.getValueByKey(key);
      // TODO: this is where a children property would be useful
      let $value;
      if (value.type === 'value'){
        // console.log(key, ':', value.value);
        $value = value.value;
      } else {
        // console.log('---- long value for:', key, value.getItemAtIndex(0))
        $value = this.objectify(value);
      }
      if (isArray){
        obj.push($value)
      } else {
        obj[key] = value;
      }
      return obj;
    }, result);
  }

  // Transitions are any task with a "next" property
  get transitions(): Array<TransitionInterface> {
    const tasks = this.objectify( this.get('tasks') );
    // console.log('Tasks', tasks);
    return tasks.filter(t => t.keys.includes('next')).reduce((flatList, task) => {
      const next = task.get('next');
      return flatList.concat(next.map(transition => {
        const $when: Token = transition.get('when');
        let $do: Token = [].concat(transition.get('do'));

        return $do.map(to => ({
          from: { name: from },
          to: { name : to.value },
          type: 'Success',
          condition: $when && $when.value,
        }));
      }));
    }, []);

    // $FlowFixMe
    // return [].concat(...tasks.map((task, from: string | number) => {
    //   const next = task.get('next');
    //   if (next) {
    //     return [].concat(...next.map((transition, index: string | number) => {
    //       const $when: Token = transition.get('when');
    //       const $do: Token = transition.get('do');

    //       // do: taskB
    //       if ($do.type === 'value') {
    //         return [{
    //           from: { name: from },
    //           to: { name : $do.value },
    //           type: 'Success',
    //           condition: $when && $when.value,
    //         }];
    //       }

    //       // do:
    //       //   - taskB
    //       //   - taskC
    //       return $do.map((to, index: string | number) => {
    //         return {
    //           from: { name: from },
    //           to: { name : to.value },
    //           type: 'Success',
    //           condition: $when && $when.value,
    //         };
    //       });
    //     }));
    //   }

    //   return [].concat(...task.keys.filter(key => key !== 'action').map((type: string | number) => {
    //     const trigger = task.get(type);

    //     return [].concat(...trigger.map((action, index: string | number) => {
    //       const condition: Token = action.get('if');
    //       const to: Token = action.get('next');

    //       return {
    //         from: { name: from },
    //         to: { name : to.value },
    //         type: types[type],
    //         condition: condition && condition.value,
    //       };
    //     }));
    //   }));
    // }));
  }


  applyDelta(delta: DeltaInterface) {

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
    const task = this.get('tasks', ref.name);
    if (!task) {
      throw new Error('task not found for ref');
    }

    this.tokens.delete(task);
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
    const transition: Token = findTransitionToken(this.tokens, ref, 'to');
    if (!transition) {
      throw new Error('transition not found for ref');
    }

    this.tokens.delete(transition);
  }
}

function findTransitionToken(tokens: NestedSet, ref: TransitionRefInterface, key: string): Token | void {
  const task = tokens.get('tasks', ref.from.name);

  if (![ 'to', 'condition' ].includes(key)) {
    throw new Error(`invalid key: ${key}`);
  }

  const onComplete = task.get('on-complete');
  if (onComplete) {
    for (const transitionKey of onComplete.keys) {
      const transition = onComplete.get(transitionKey);
      const condition: Token = transition.get('if');

      const next = transition.get('next');

      if (next.type === 'value' && next.value === ref.to.name) {
        if (key === 'to') {
          return next;
        }

        if (key === 'condition') {
          return condition;
        }
      }

      for (const toKey of next.keys) {
        const to = next.get(toKey);
        if (to.type === 'value' && to.value === ref.to.name) {
          if (key === 'to') {
            return to;
          }

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
        if (key === 'to') {
          return to;
        }

        if (key === 'condition') {
          return condition;
        }
      }
    }
  }

  return undefined;
}
