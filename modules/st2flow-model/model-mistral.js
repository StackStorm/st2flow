// @flow

import type { ModelInterface, TaskInterface, TransitionInterface, TransitionRefInterface, TransitionType } from './interfaces';
import type { TokenMeta } from '@stackstorm/st2flow-yaml';

import { crawler, util, TokenSet } from '@stackstorm/st2flow-yaml';
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
        name: joinTaskName(key),
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

  addTask(task: TaskInterface) {
    const oldData = this.tokenSet.toObject();
    const { name, coords, ...data } = task;

    if(coords) {
      util.defineExpando(data, '__meta', {
        comments: `[${coords.x}, ${coords.y}]`,
      });
    }

    const [ workflowName, taskName ] = splitTaskName(name, this.tokenSet);
    const key = [ workflowName, 'tasks', taskName ];

    if(oldData.workflows) {
      key.unshift('workflows');
    }

    crawler.set(this.tokenSet, key, data);
    this.emitChange(oldData, this.tokenSet.toObject());
  }

  addTransition(transition: TransitionInterface) {
    const oldData = this.tokenSet.toObject();
    const [ fromWorkflowName, fromTaskName ] = splitTaskName(transition.from.name, this.tokenSet);
    const [ toWorkflowName, toTaskName ] = splitTaskName(transition.to.name, this.tokenSet);

    if(fromWorkflowName !== toWorkflowName) {
      this.emitError(new Error('Cannot create transitions between two different workflows'));
      return;
    }

    const type = `on-${(transition.type || 'complete').toLowerCase()}`;
    const key = [fromWorkflowName, 'tasks', fromTaskName, type];
    const next = transition.condition ? { [toTaskName]: transition.condition } : toTaskName;

    if(oldData.workflows) {
      key.unshift('workflows');
    }

    const existing = crawler.getValueByKey(this.tokenSet, key);
    if(existing) {
      // creates a new array item
      crawler.set(this.tokenSet, key.concat('#'), next)
    }
    else {
      crawler.set(this.tokenSet, key, [ next ]);
    }

    this.emitChange(oldData, this.tokenSet.toObject());
  }

  updateTask(ref: string, task: TaskInterface) {
    const oldData = this.tokenSet.toObject();
    const { name, coords, ...data } = task;
    const [ workflowName, oldTaskName ] = splitTaskName(ref, this.tokenSet);
    const key = [ workflowName, 'tasks', oldTaskName ];

    if(oldData.workflows) {
      key.unshift('workflows');
    }

    if (name && ref !== name) {
      crawler.renameMappingKey(this.tokenSet, key, name);
      key.splice(-1, 1, name);
    }

    if (coords) {
      const comments = crawler.getCommentsForKey(this.tokenSet, key);
      crawler.setCommentForKey(this.tokenSet, key, comments.replace(REG_COORDS, `[${coords.x}, ${coords.y}]`));
    }

    Object.keys(data).forEach(k => {
      crawler.set(this.tokenSet, key.concat(k), data[k]);
    });

    this.emitChange(oldData, this.tokenSet.toObject());
  }

  updateTransition(ref: TransitionRefInterface, transition: TransitionInterface) {
    const oldData = this.tokenSet.toObject();
    const [ oldFromWorkflowName, oldFromTaskName ] = splitTaskName(ref.from.name, this.tokenSet);
    const [ oldToWorkflowName, oldToTaskName ] = splitTaskName(ref.to.name, this.tokenSet);
    const [ newFromWorkflowName, newFromTaskName ] = splitTaskName(transition.from.name, this.tokenSet);
    const [ newToWorkflowName, newToTaskName ] = splitTaskName(transition.to.name, this.tokenSet);

    if(newFromWorkflowName !== newToWorkflowName) {
      this.emitError(new Error('Cannot create transitions between two different workflows'));
      return;
    }

    const type = `on-${(transition.type || 'complete').toLowerCase()}`;
    const oldKey = [ oldFromWorkflowName, 'tasks', oldFromTaskName, type ];
    const newKey = [ newFromWorkflowName, 'tasks', newFromTaskName, type ];

    if(oldData.workflows) {
      oldKey.unshift('workflows');
      newKey.unshift('workflows');
    }

    const oldTransitions = util.get(oldData, oldKey);
    const oldIndex = oldTransitions.findIndex(t => {
      return typeof t === 'string' ? t === oldToTaskName : t.hasOwnProperty(oldToTaskName);
    });

    if(oldIndex === -1) {
      this.emitError(new Error(`Could not find transition to update: ${oldKey.join('.')}`));
      return;
    }

    if(oldFromWorkflowName !== newFromWorkflowName || oldFromTaskName !== newFromTaskName) {
      // The transition moved to a new "from" task, delete the old one
      crawler.spliceCollection(this.tokenSet, oldKey, oldIndex, 1);
    }

    const next = transition.condition ? { [newToTaskName]: transition.condition } : newToTaskName;
    const existing = util.get(oldData, newKey);
    if(existing) {
      // Add transition to existing list
      crawler.set(this.tokenSet, newKey.concat('#'), next);
    }
    else {
      crawler.set(this.tokenSet, newKey, [ next ]);
    }

    this.emitChange(oldData, this.tokenSet.toObject());
  }

  deleteTask() {

  }

  deleteTransition() {

  }
}

function getRawTasks(tokenSet: TokenSet): Map<Array<string>, RawTask>  {
  let flatTasks = new Map();

  if(tokenSet) {
    const workflows = getWorkflows(tokenSet);

    Object.keys(workflows).forEach(workflowName => {
      const workflow = workflows[ workflowName ];
      Object.keys(workflow.tasks).forEach(name =>
        flatTasks.set([workflowName, name], workflow.tasks[name])
      );
    }, []);
  }

  return flatTasks;
}

function getWorkflows(tokenSet: TokenSet): Object {
  const data = tokenSet.toObject();
  return data.workflows || util.omit(data, ...OMIT_KEYS);
}

function makeTransition(next: NextItem, fromKey: Array<string>, type: TransitionType): TransitionInterface {
  const workflowName: string = fromKey[0];
  const transition: Object = {
    type,
    from: {
      name: joinTaskName(fromKey),
    },
    to: {},
  };

  let toKey = [workflowName];
  if(typeof next === 'string') {
     toKey.push(next);
  }
  else {
    toKey.push(Object.keys(next)[0]);
    transition.condition = next[transition.to.name];
  }

  transition.to.name = joinTaskName(toKey);

  return transition;
}

function joinTaskName(key: Array<string>) {
  return key.join(STR_KEY_SEPERATOR);
}

function splitTaskName(name: string, tokenSet: TokenSet): Array<string> {
  const workflows = getWorkflows(tokenSet);

  // If we find a workflow name at the beginning of the name, then
  // split it there. Sorting by longest workflow first is important
  // b/c both workflow names and task names can contain slashes.
  const wfNames = Object.keys(workflows);
  let workflowName = wfNames
    .sort((a, b) => b.length - a.length)
    .find(wfName => name.indexOf(`${wfName}${STR_KEY_SEPERATOR}`) === 0);

  if(!workflowName) {
    // Most of the time there will only be one workflow.
    return [ wfNames.pop(), name ];
  }

  return [ workflowName, name.slice(workflowName.length + 1) ];
}

export default MistralModel;
