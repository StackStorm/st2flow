// @flow

import type { ModelInterface, TaskInterface, TransitionInterface, TransitionRefInterface, TransitionType } from './interfaces';
import type { TokenMeta } from '@stackstorm/st2flow-yaml';

import { crawler, util } from '@stackstorm/st2flow-yaml';
import BaseModel from './base-model';

// The model schema is generated in the mistral repo. Do not update it manually!
// Speak to Winson about getting generated schema.
import schema from './schemas/mistral.json';

const EMPTY_ARRAY = [];
const OMIT_KEYS = ['version', 'name', 'description', 'tags'];
const STR_KEY_SEPERATOR = '/';
const REG_COORDS = /\[\s*(\d+)\s*,\s*(\d+)\s*\]/;

type NextItem = string | { [string]: string };

type RawTask = {
  __meta: TokenMeta,
  action: string,
  input?: Object,
  publish?: Object,
  'on-success'?: Array<NextItem>,
  'on-error'?: Array<NextItem>,
  'on-complete'?: Array<NextItem>,
};

type RawTasks = {
  __meta: TokenMeta,
  [string]: RawTask,
};

class MistralModel extends BaseModel implements ModelInterface {
  constructor(yaml: ?string) {
    super(schema, yaml);
  }

  get tasks() {
    const flatTasks = getRawTasks(this.tokenSet);

    const tasks: Array<TaskInterface> = Array.from(flatTasks, ([key, task]) => {
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

      const { action = '', input } = task;
      const [ actionRef, ...inputPartials ] = action.split(' ');

      if (inputPartials.length) {
        task.__meta.inlineInput = true;
      }

      return Object.assign({}, {
        name: key.join(STR_KEY_SEPERATOR),
        size: { x: 120, y: 48 },
        action: '',
        coords: { x: 0, y: 0 },
      }, task, {
        action: actionRef,
        input: {
          ...input
        },
        coords: { ...coords },
      });
    });

    return tasks;
  }

  get transitions() {
    if(!this.tokenSet) {
      return [];
    }

    const transitions = [];
    getRawTasks(this.tokenSet).forEach((task, key) => {
      (task['on-success'] || EMPTY_ARRAY).forEach(next => {
        transitions.push(makeTransition(next, key, 'Success'));
      });

      (task['on-error'] || EMPTY_ARRAY).forEach(next => {
        transitions.push(makeTransition(next, key, 'Error'));
      });

      (task['on-complete'] || EMPTY_ARRAY).forEach(next => {
        transitions.push(makeTransition(next, key, 'Complete'));
      });
    });

    return transitions;
  }

  addTask() {

  }

  addTransition() {

  }

  updateTask() {

  }

  updateTransition() {

  }

  deleteTask() {

  }

  deleteTransition() {

  }
}

function getRawTasks(tokenSet): Map<Array<string>, RawTask>  {
  let flatTasks = new Map();

  if(tokenSet) {
    const data = tokenSet.toObject();

    if(data.workflows) {
      Object.keys(data.workflows).forEach(workflowName => {
        const workflow = data.workflows[workflowName];
        Object.keys(workflow.tasks).forEach(name => flatTasks.set([workflowName, name], workflow.tasks[name]));
      }, []);
    }
    else {
      Object.keys(util.omit(data, ...OMIT_KEYS)).forEach(name => {
        flatTasks.set([name], data[name]);
      });
    }
  }

  return flatTasks;
}

function makeTransition(next: NextItem, fromKey: Array<string>, type: TransitionType): TransitionInterface {
  const transition: Object = {
    type,
    from: {
      name: fromKey.join(STR_KEY_SEPERATOR),
    },
    to: {},
  };

  if(typeof next === 'string') {
    transition.to.name = next;
  }
  else {
    transition.to.name = Object.keys(next)[0];
    transition.condition = next[transition.to.name];
  }

  return transition;
}

export default MistralModel;
