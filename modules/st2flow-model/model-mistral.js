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

  get description() {
    let val = super.description;

    // If a root level description is not available,
    // find one from one of the workflows.
    if(!val) {
      const workflows = getWorkflows(this.tokenSet);
      Object.keys(workflows).some(wfName => {
        const workflow = workflows[ wfName ];

        if(workflow.description) {
          val = workflow.description;
          return true; // break
        }
      });
    }

    return val;
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
        name: joinTaskName(key, this.tokenSet),
        size: { x: 120, y: 48 },
        action: '',
        coords: { x: 0, y: 0, ...coords },
      }, task, {
        action: actionRef,
        input: {
          ...input
        }
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
        transitions.push(makeTransition(next, key, 'Success', this.tokenSet));
      });

      (task['on-error'] || EMPTY_ARRAY).forEach(next => {
        transitions.push(makeTransition(next, key, 'Error', this.tokenSet));
      });

      (task['on-complete'] || EMPTY_ARRAY).forEach(next => {
        transitions.push(makeTransition(next, key, 'Complete', this.tokenSet));
      });
    });

    return transitions;
  }

  addTask(task: TaskInterface) {
    const { oldData, oldTree } = this.startMutation();
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
    this.endMutation(oldTree);
  }

  addTransition(transition: TransitionInterface) {
    const { oldData, oldTree } = this.startMutation();
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

    this.endMutation(oldTree);
  }

  updateTask(oldTask: TaskInterface, newData: TaskInterface) {
    const { oldData, oldTree } = this.startMutation();
    const { name, coords, ...data } = newData;
    const [ workflowName, oldTaskName ] = splitTaskName(oldTask.name, this.tokenSet);
    const key = [ workflowName, 'tasks', oldTaskName ];

    if(oldData.workflows) {
      key.unshift('workflows');
    }

    if (name && oldTask.name !== name) {
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

    this.endMutation(oldTree);
  }

  updateTransition(oldTransition: TransitionInterface, newData: TransitionInterface) {
    const { oldData, oldTree } = this.startMutation();
    const { type: oldType, condition: oldCondition, from: oldFrom, to: oldTo } = oldTransition;
    const [ oldFromWorkflowName, oldFromTaskName ] = splitTaskName(oldFrom.name, this.tokenSet);
    const [ oldToWorkflowName, oldToTaskName ] = splitTaskName(oldTo.name, this.tokenSet);
    const oldKey = [ oldFromWorkflowName, 'tasks', oldFromTaskName, transitionTypeKey(oldType) ];

    if(oldData.workflows) {
      oldKey.unshift('workflows');
    }

    const oldTransitions = util.get(oldData, oldKey);

    if(!oldTransitions || !oldTransitions.length) {
      this.emitError(new Error(`Could not find transition at path: ${oldKey.join('.')}`));
      return;
    }

    const oldIndex = oldTransitions.findIndex(t => {
      return typeof t === 'string' ? t === oldToTaskName : t.hasOwnProperty(oldToTaskName);
    });

    if(oldIndex === -1) {
      this.emitError(new Error(`Could not find transition to update: ${oldKey.join('.')}`));
      return;
    }


    const { type: newType, condition: newCondition, from: newFrom, to: newTo } = newData;
    const [ newFromWorkflowName, newFromTaskName ] = newFrom ? splitTaskName(newFrom.name, this.tokenSet) : [ oldFromWorkflowName, oldFromTaskName ];
    const [ newToWorkflowName, newToTaskName ] = newTo ? splitTaskName(newTo.name, this.tokenSet) : [ oldToWorkflowName, oldToTaskName ];

    if(newFromWorkflowName !== newToWorkflowName) {
      this.emitError(new Error('Cannot create transitions between two different workflows'));
      return;
    }

    const newKey = [ newFromWorkflowName, 'tasks', newFromTaskName, transitionTypeKey(newType || oldType) ];

    if(oldData.workflows) {
      newKey.unshift('workflows');
    }

    let newIndex = oldIndex;

    let next;
    if(newData.hasOwnProperty('condition')) {
      next = newCondition ? { [newToTaskName]: newCondition } : newToTaskName;
    }
    else {
      next = oldCondition ? { [newToTaskName]: oldCondition } : newToTaskName;
    }

    if(oldFromWorkflowName !== newFromWorkflowName || oldFromTaskName !== newFromTaskName) {
      // The transition moved to a new "from" task, delete the old one
      crawler.spliceCollection(this.tokenSet, oldKey, oldIndex, 1);
      newIndex = '#'; // creates a new item in the new "from" task
    }


    const existing = util.get(oldData, newKey);
    if(existing) {
      // Update existing list
      crawler.set(this.tokenSet, newKey.concat(newIndex), next);
    }
    else {
      crawler.set(this.tokenSet, newKey, [ next ]);
    }

    this.endMutation(oldTree);
  }

  deleteTask(task: TaskInterface) {
    const { oldData, oldTree } = this.startMutation();
    const [ workflowName, taskName ] = splitTaskName(task.name, this.tokenSet);
    const key = [ workflowName, 'tasks', taskName ];

    if(oldData.workflows) {
      key.unshift('workflows');
    }

    crawler.deleteMappingItem(this.tokenSet, key);
    this.endMutation(oldTree);
  }

  deleteTransition(transition: TransitionInterface) {
    const { oldData, oldTree } = this.startMutation();
    const { to, from, type, condition } = transition;
    const [ fromWorkflowName, fromTaskName ] = splitTaskName(from.name, this.tokenSet);
    const [ toWorkflowName, toTaskName ] = splitTaskName(to.name, this.tokenSet);

    const key = [ fromWorkflowName, 'tasks', fromTaskName, transitionTypeKey(type)];

    if(oldData.workflows) {
      key.unshift('workflows');
    }

    const transitions = crawler.getValueByKey(this.tokenSet, key);
    const index = transitions.findIndex((t, i) => {
      return (typeof t === 'string' && t === to.name) || t[to.name] === condition;
    });

    if(index !== -1) {
      crawler.spliceCollection(this.tokenSet, key, index, 1);
    }

    this.endMutation(oldTree);
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

function makeTransition(next: NextItem, fromKey: Array<string>, type: TransitionType, tokenSet: TokenSet): TransitionInterface {
  const workflowName: string = fromKey[0];
  const transition: Object = {
    type,
    condition: null,
    from: {
      name: joinTaskName(fromKey, tokenSet),
    },
    to: {},
  };

  let toKey = [workflowName];
  if(typeof next === 'string') {
     toKey.push(next);
  }
  else {
    const toName = Object.keys(next)[0]
    toKey.push(toName);
    transition.condition = next[toName];
  }

  transition.to.name = joinTaskName(toKey, tokenSet);

  return transition;
}

function transitionTypeKey(type: TransitionType = 'Complete') {
  return `on-${type.toLowerCase()}`;
}

function joinTaskName(key: Array<string>, tokenSet: TokenSet): string {
  const workflows = getWorkflows(tokenSet);
  const wfNames = Object.keys(workflows);

  // If there are multiple workflows, prepend the task name with
  // the workflow name. Otherwise, use just the task name.
  return wfNames.length === 1 ? key[1] : key.join(STR_KEY_SEPERATOR);
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
