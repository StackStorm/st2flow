// @flow

import type { ModelInterface, TaskInterface, TaskRefInterface, TransitionInterface, TransitionRefInterface, DeltaInterface } from './interfaces';

import { TokenSet, Crawler } from '@stackstorm/st2flow-yaml';

const types = {
  'on-complete': 'Success',
};

class OrchestraModel implements ModelInterface {
  tokens: TokenSet;

  constructor(yaml: ?string) {
    if (yaml) {
      this.fromYAML(yaml);
    }
  }

  fromYAML(yaml: string): void {
    this.tokens = new TokenSet(yaml);
    this.crawler = new Crawler(this.tokens);
  }

  toYAML(): string {
    return this.tokens.toYAML();
  }

  get version() {
    return this.crawler.getValueByKey('version');
  }

  get description() {
    return this.crawler.getValueByKey('description');
  }

  get tasks(): Array<TaskInterface> {
    const tasks = this.crawler.getValueByKey('tasks');

    return tasks.__keys.map(name =>
      Object.assign({}, tasks[name], {
        name,
        // TODO: get coords from comment tokens
        coord: { x: 0, y: 0 }
      })
    );
  }

  // Transitions are any task with a "next" property
  get transitions(): Array<TransitionInterface> {
    return this.tasks.filter(task => task.hasOwnProperty('next'));
  }

  applyDelta(delta: DeltaInterface) {

  }

  addTask(opts: TaskInterface) {

  }

  updateTask(ref: TaskRefInterface, opts: TaskInterface) {
    const task = this.crawler.getValueByKey('tasks.' + ref.name);

    if (!task) {
      throw new Error('task not found for ref');
    }

    this.tokens.updateToken(task.jpath, task);
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

export default OrchestraModel;
