import { createScopedStore } from '@stackstorm/module-store';

import { models, OrquestaModel } from '@stackstorm/st2flow-model';
import { layout } from '@stackstorm/st2flow-model/layout';
import MetaModel from '@stackstorm/st2flow-model/model-meta';
import { debounce, difference } from 'lodash';

let workflowModel = new OrquestaModel();
const metaModel = new MetaModel();

metaModel.fromYAML(metaModel.constructor.minimum);
metaModel.set('runner_type', 'orquesta');

function workflowModelGetter(model) {
  const { tasks, transitions, errors, input } = model;

  const lastIndex = tasks
    .map(task => (task.name.match(/task(\d+)/) || [])[1])
    .reduce((acc, item) => Math.max(acc, item || 0), 0);

  return {
    workflowSource: model.toYAML(),
    ranges: getRanges(model),
    tasks,
    input,
    nextTask: `task${lastIndex + 1}`,
    transitions,
    notifications: errors.map(e => ({ type: 'error', message: e.message })),
  };
}

function metaModelGetter(model) {
  return {
    metaSource: model.toYAML(),
    meta: model.tokenSet.toObject(),
  };
}

function getRanges(model) {
  const ranges = {};

  model.tasks.forEach(task => {
    ranges[task.name] = workflowModel.getRangeForTask(task);
  });

  return ranges;
}

function extendedValidation(meta, model) {
  const errors = [];
  if(model.input) {
    const paramNames = Object.keys(meta.parameters || {});
    const inputNames = model.input.map(input => {
      const key = typeof input === 'string' ? input : Object.keys(input)[0];
      return key;
    });
    paramNames.forEach(paramName => {
      if(!inputNames.includes(paramName)) {
        errors.push(`Parameter "${paramName}" must be in input`);
      }
    });
    model.input.forEach(input => {
      if(typeof input === 'string' && !meta.parameters[input]) {
        errors.push(`Extra input "${input}" must have a value`);
      }
    });
  }

  return errors.length ? errors : null;
}


const flowReducer = (state = {}, input) => {
  const {
    workflowSource = workflowModel.constructor.minimum,
    metaSource = '',
    pack = 'default',
    meta = metaModel,
    tasks = [],
    transitions = [],
    ranges = {},
    notifications = [],
    nextTask = 'task1',

    panels = [],

    actions = [],

    navigation = {},

    input: stateInput = [],
  } = state;

  state = {
    ...state,
    workflowSource,
    metaSource,
    pack,
    meta,
    tasks,
    transitions,
    ranges,
    notifications,
    nextTask,

    panels,

    actions,

    navigation,

    input: stateInput,
  };

  switch (input.type) {
    // Workflow Model
    case 'MODEL_ISSUE_COMMAND': {
      const { command, args } = input;

      if (!workflowModel[command]) {
        return state;
      }

      if (!workflowModel.tokenSet) {
        workflowModel.fromYAML(workflowModel.constructor.minimum);
      }

      workflowModel[command](...args);

      const extendedNotifications = [];
      if(command === 'applyDelta') {
        // Editor changes mean extended validating the work.
        const extendedErrors = extendedValidation(meta, workflowModel);
        state.notifications = state.notifications.filter(e => e.source !== 'input');
        if(extendedErrors) {
          extendedNotifications.push(
            ...extendedErrors.map(message => ({ type: 'error', source: 'input', message }))
          );
        }
      }

      const modelState = workflowModelGetter(workflowModel);

      return {
        ...state,
        ...modelState,
        notifications: modelState.notifications.concat(extendedNotifications),
      };
    }

    case 'MODEL_LAYOUT': {
      layout(workflowModel);

      return {
        ...state,
        ...workflowModelGetter(workflowModel),
      };
    }

    // Metadata Model
    case 'META_ISSUE_COMMAND': {
      const { command, args } = input;

      if (!metaModel[command]) {
        return state;
      }

      if (!metaModel.tokenSet) {
        metaModel.fromYAML(metaModel.constructor.minimum);
      }

      const oldParamNames = metaModel.parameters ? Object.keys(metaModel.parameters) : [];
      oldParamNames.sort((a, b) => {
        return metaModel.parameters[a].position < metaModel.parameters[b].position ? -1 : 1;
      });

      metaModel[command](...args);

      const runner_type = metaModel.get('runner_type');
      if (runner_type && runner_type !== meta.runner_type) {
        if (state.tasks.length > 0) {
          throw 'Cannot change runner_type of workflow that has existing tasks';
        }
        const Model = models[runner_type];

        workflowModel = new Model();
        workflowModel.fromYAML(workflowModel.constructor.minimum);

        state = {
          ...state,
          ...workflowModelGetter(workflowModel),
        };
      }

      if(command === 'set' && args[0] === 'parameters') {
        const [ , params ] = args;
        if(!workflowModel.tokenSet) {
          workflowModel.fromYAML(state.workflowSource);
        }

        const paramNames = Object.keys(params);
        const deletions = difference(oldParamNames, paramNames);

        workflowModel.setInputs(paramNames, deletions);
        state.workflowSource = workflowModel.toYAML();
        state.input = workflowModel.input;
      }

      return {
        ...state,
        ...metaModelGetter(metaModel),
      };
    }

    case 'PUSH_ERROR': {
      const { error } = input;

      return {
        ...state,
        notifications: [ ...notifications, { type: 'error', message: error }],
      };
    }

    case 'PUSH_SUCCESS': {
      const { message } = input;

      return {
        ...state,
        notifications: [ ...notifications, { type: 'success', message }],
      };
    }

    // CollapseModel
    case 'PANEL_TOGGLE_COLLAPSE': {
      const { name } = input;

      return {
        ...state,
        panels: {
          ...panels,
          [name]: !panels[name],
        },
      };
    }

    //ActionsModel
    case 'FETCH_ACTIONS': {
      const { status, payload } = input;

      if (status === 'success') {
        return {
          ...state,
          actions: payload,
        };
      }

      return state;
    }

    //NavigationModel
    case 'CHANGE_NAVIGATION': {
      const { navigation } = input;

      return {
        ...state,
        navigation: {
          ...state.navigation,
          ...navigation,
        },
      };
    }

    case 'LOAD_WORKFLOW': {
      const { currentWorkflow, status, payload } = input;

      const [ pack ] = currentWorkflow.split('.');

      const newState = {
        ...state,
        pack,
        currentWorkflow,
      };

      if (status === 'success') {
        const { workflowSource, metaSource } = payload;

        metaModel.applyDelta(null, metaSource);

        const runner_type = metaModel.get('runner_type');
        const Model = models[runner_type];

        if (workflowModel instanceof Model) {
          workflowModel.applyDelta(null, workflowSource);
        }
        else {
          workflowModel = new Model(workflowSource);
        }

        if (workflowModel.tasks.every(({ coords }) => !coords.x && !coords.y)) {
          layout(workflowModel);
        }

        return {
          ...newState,
          metaSource,
          workflowSource,
          ...metaModelGetter(metaModel),
          ...workflowModelGetter(workflowModel),
        };
      }

      return newState;
    }

    default:
      return state;
  }
};

const prevRecords = [];
const nextRecords = [];

const handleModelCommand = debounce((prevState = {}, state = {}, input) => {
  const historyRecord = {};

  if (prevState.workflowSource !== state.workflowSource) {
    historyRecord.workflowSource = prevState.workflowSource;
  }

  if (prevState.metaSource !== state.metaSource) {
    historyRecord.metaSource = prevState.metaSource;
  }

  if (Object.keys(historyRecord).length !== 0) {
    prevRecords.push(historyRecord);
  }

  return state;
}, 250, { leading: true, trailing: false });

const undoReducer = (prevState = {}, state = {}, input) => {
  switch (input.type) {
    case 'META_ISSUE_COMMAND':
    case 'MODEL_LAYOUT':
    case 'MODEL_ISSUE_COMMAND': {
      handleModelCommand(prevState, state, input);
      return state;
    }

    case 'FLOW_UNDO': {
      handleModelCommand.flush();

      const historyRecord = prevRecords.pop();

      if (!historyRecord) {
        return state;
      }

      const { workflowSource, metaSource } = historyRecord;
      const futureRecord = {};

      if (workflowSource !== undefined) {
        futureRecord.workflowSource = state.workflowSource;

        workflowModel.applyDelta(null, workflowSource);
        const parsedWorkflow = workflowModelGetter(workflowModel);

        state = {
          ...state,
          ...parsedWorkflow,
          notifications: [ ...(state.notifications || []), ...(parsedWorkflow.notifications || []) ],
        };
      }

      if (metaSource !== undefined) {
        futureRecord.metaSource = state.metaSource;

        metaModel.applyDelta(null, metaSource);

        state = {
          ...state,
          ...metaModelGetter(metaModel),
        };
      }

      nextRecords.push(futureRecord);

      return state;
    }

    case 'FLOW_REDO': {
      handleModelCommand.flush();

      const historyRecord = nextRecords.pop();

      if (!historyRecord) {
        return state;
      }

      const { workflowSource, metaSource } = historyRecord;
      const pastRecord = {};

      if (workflowSource !== undefined) {
        pastRecord.workflowSource = state.workflowSource;

        workflowModel.applyDelta(null, workflowSource);
        const parsedWorkflow = workflowModelGetter(workflowModel);

        state = {
          ...state,
          ...parsedWorkflow,
          notifications: [ ...(state.notifications || []), ...(parsedWorkflow.notifications || []) ],
        };
      }

      if (metaSource !== undefined) {
        pastRecord.metaSource = state.metaSource;

        metaModel.applyDelta(null, metaSource);

        state = {
          ...state,
          ...metaModelGetter(metaModel),
        };
      }

      prevRecords.push(pastRecord);

      return state;
    }

    case 'SET_PACK': {
      const { pack } = input;
      return {
        ...state,
        pack,
      };
    }

    default:
      return state;
  }
};

const reducer = (state = {}, action) => {
  const nextState = flowReducer(state, action);
  state = undoReducer(state, nextState, action);

  return state;
};

const store = createScopedStore('flow', reducer);

export default store;
