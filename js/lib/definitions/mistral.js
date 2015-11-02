import _ from 'lodash';

import Definition from '../definition';
import Sector from '../models/sector';
import Workflow from '../models/workflow';

export default class MistralDefinition extends Definition {
  constructor (model) {
    super();

    this.model = model;
  }

  runner_params = ['skip_notify', 'task', 'context', 'workflow']

  get defaults() {
    const unit = '  ';
    return {
      indents: {
        base: '',
        workflow: _.repeat(unit, 0),
        tasks: _.repeat(unit, 1),
        task: _.repeat(unit, 2),
        property: _.repeat(unit, 3),
        transition: _.repeat(unit, 4)
      }
    };
  }

  get spec() {
    return _.assign(super.spec, {
      WORKBOOK_NAME: /(.*)(name:\s+['"]*)([\w.-]+)/,
      WORKFLOWS_BLOCK: /^(\s*)workflows:/,
      WORKFLOW_NAME: /^(\s*)([\w.-]+):/,
      TASK_BLOCK: /^(\s*)tasks:/,
      TASK_NAME: /^(\s*)(.+):/,
      TASK_NAME_VALIDATION: /^\w[\w.-]*$/,
      TASK_COORD: /^(\s*)(# \[)(\d+,\s*\d+)/,
      TASK_ACTION: /(.*)(action:\s+['"]*)([\w.-]+)/,
      TASK_WORKFLOW: /(.*)(workflow:\s+['"]*)([\w.]+)/,
      TASK_PUBLISH: /^(\s*)publish:/,
      SUCCESS_BLOCK: /^(\s*)on-success:/,
      ERROR_BLOCK: /^(\s*)on-error:/,
      COMPLETE_BLOCK: /^(\s*)on-complete:/,
      INPUT_BLOCK: /^(\s*)input:/,
      YAQL_VARIABLE: /(.*\$\.)(\w+)/,
      TRANSITION: /^(\s*-\s*)(\w[\w.-]*)(.*)?$/
    });
  }

  get template() {
    return _.assign(super.template, {
      task: (starter, indent) => _.template(
        starter + '${name}:\n' +
        indent + '# [${x}, ${y}]\n' +
        indent + 'action: ${ref}\n'
      ),
      block: {
        wb_base: () => _.template('---\nversion: \'2.0\'\nname: ${name}\n\nworkflows:\n'),
        wf_base: () => _.template('---\nversion: \'2.0\'\n\n${name}:\n'),
        wb_workflow: (external) =>
          _.template(external + '${name}:\n'),
        wf_workflow: () => _.template(),
        wb_name: () => _.template('name: ${name}\n'),
        input: (indent) => _.template(indent + 'input:\n'),
        tasks: (indent) => _.template(indent + 'tasks:\n'),
        coord: (indent) => _.template(indent + '# [${coord}]\n'),
        success: (indent) => _.template(indent + 'on-success:\n'),
        error: (indent) => _.template(indent + 'on-error:\n'),
        complete: (indent) => _.template(indent + 'on-complete:\n')
      },
      coord: () => _.template('${x}, ${y}'),
      transition: (starter) => _.template(starter + '${value.name}${value.rest}\n')
    });
  }

  parseLine(state, line, lineNum) {
    state.workflowBlock = state.workflowBlock || new Sector();

    let match = line.match(this.spec.WS_INDENT)[0];
    if (match) {
      if (state.unit) {
        // if it is not the same character or if the prefix has any other chracters
        if (state.unit !== match[0] || match.split(match[0]).join('') !== '') {
          console.warn('Mixing tabs and spaces as indentation. Parser state in undefined.');
        }
      } else {
        state.unit = match[0];
      }
    }

    if (this.spec.EMPTY_LINE.test(line)) {
      return;
    }

    const indent = line.match(this.spec.WS_INDENT)[0];

    if (state.potentialWorkflow && indent.length > state.potentialWorkflow.indent.length) {
      const wf = state.potentialWorkflow;
      const name = wf.getProperty('name');
      const nameSector = wf.getSector('name');
      state.workbook.setProperty('name', name);
      state.workbook.setSector('name', nameSector);
      wf.setProperty('name', 'main');
      delete wf.sectors.name;
      state.currentWorkflow = this.model.workflow('main', wf);
      state.taskBlock = state.currentWorkflow.getSector('taskBlock');
      state.indent = indent;
    }

    state.potentialWorkflow = null;

    let block = this.block('isWorkflowBlock', this.spec.WORKFLOWS_BLOCK);

    if (block.enter(line, lineNum, state)) {
      state.workflowBlock.setStart(lineNum, 0);
      state.workflowBlock.setEnd(lineNum + 1, 0);
      state.workbook.setSector('name', state.workbook.getSector('name') || new Sector(lineNum, 0, lineNum, 0));
      return;
    }

    if (block.exit(line, lineNum, state)) {
      state.workflowBlock.setEnd(lineNum, 0);
      return false;
    }

    if (state.isWorkflowBlock) {
      state.workflowBlock.setEnd(lineNum + 1, 0); // ? lineNum + 1
    } else {
      let match;

      match = this.spec.WORKBOOK_NAME.exec(line);
      if (match) {
        const [,_prefix,key,value] = match
            , coords = [lineNum, (_prefix+key).length, lineNum, (_prefix+key+value).length]
            ;

        const sector = new Sector(...coords).setType('name');
        state.workbook.setProperty('name', value).setSector('name', sector);
      }
    }

    {
      let match;

      match = this.spec.WORKFLOW_NAME.exec(line);
      if (match) {
        let [,indent,name] = match
          , coords = [lineNum, indent.length, lineNum, (indent+name).length]
          ;

        if (!state.currentWorkflow || indent.length === state.currentWorkflow.indent.length) {
          if (state.currentWorkflow) {
            state.currentWorkflow.endSector('workflow', lineNum, 0);
          }

          if (state.currentTask) {
            state.currentTask.endSector('task', lineNum, 0);
            delete state.currentTask;
          }

          const workflowSector = new Sector(lineNum, 0).setType('workflow')
              , nameSector = new Sector(...coords).setType('name')
              , inputSector = new Sector().setType('input')
              , taskBlockSector = new Sector()
              ;

          const wf = new Workflow()
            .setProperty('name', name)
            .setSector('workflow', workflowSector)
            .setSector('name', nameSector)
            .setSector('input', inputSector)
            .setSector('taskBlock', taskBlockSector)
            ;

          wf.indent = indent;

          if (state.isWorkflowBlock) {
            state.currentWorkflow = this.model.workflow(name, wf);

            state.taskBlock = state.currentWorkflow.getSector('taskBlock');
            // FIX: support multiple workflows
          } else {
            state.potentialWorkflow = wf;
          }

          return;
        }
      }
    }

    if (state.currentWorkflow) {
      state.currentWorkflow.endSector('workflow', lineNum, 0);

      if (!state.currentTask) {
        let block = this.block('isInputBlock', this.spec.INPUT_BLOCK);

        if (block.enter(line, lineNum, state)) {
          const sector = state.currentWorkflow.getSector('input');
          sector.setStart(lineNum, 0);
        } else {
          block.exit(line, lineNum, state);
        }

        if (state.isInputBlock) {
          const sector = state.currentWorkflow.getSector('input');
          sector.setEnd(lineNum + 1, 0);
        }
      }

      let block = this.block('isTaskBlock', this.spec.TASK_BLOCK);

      if (block.enter(line, lineNum, state)) {
        const sector = state.currentWorkflow.getSector('taskBlock');
        sector.setStart(lineNum, 0);
        sector.setEnd(lineNum + 1, 0);
        sector.indent = _.repeat(state.unit, state.isTaskBlock - 1);
        const unit = _.repeat(state.unit, sector.indent.length - state.currentWorkflow.indent.length);
        sector.childStarter = sector.indent + unit;

        const input = state.currentWorkflow.getSector('input');
        if (input.isUndefined()) {
          input.setStart(lineNum, 0);
          input.setEnd(lineNum, 0);
        }

        return;
      }

      if (block.exit(line, lineNum, state)) {
        state.currentWorkflow.endSector('taskBlock', lineNum, 0);
      }
    }

    if (state.currentWorkflow && state.isTaskBlock) {
      state.currentWorkflow.endSector('taskBlock', lineNum + 1, 0);

      if (state.currentTask) {

        let handler
          , match
          ;

        // Will also match comments and text fields, which in some cases may not
        // be what you would expect, but the proper implementation requires full
        // blown AST parser
        let subline = line;
        while (match = this.spec.YAQL_VARIABLE.exec(subline)) { // eslint-disable-line no-cond-assign
          const [,starter,name] = match
              , coords = [lineNum, starter.length, lineNum, (starter+name).length]
              ;

          const yaqlSector = new Sector(...coords).setType('yaql');

          // we don't usually set value for the sector, but this time, lets try
          yaqlSector.value = name;

          const sectors = state.currentTask.getSector('yaql');
          sectors.push(yaqlSector);

          state.currentTask.setSector('yaql', sectors);

          subline = starter;
        }

        handler = this.handler('coord', this.spec.TASK_COORD, (e) => {
          const [x, y] = _.map(e.split(','), _.parseInt);
          return { x, y };
        });
        if (handler(line, lineNum, state)) {
          return;
        }

        handler = this.handler('ref', this.spec.TASK_ACTION);
        if (handler(line, lineNum, state)) {
          return;
        }

        handler = this.handler('workflow', this.spec.TASK_WORKFLOW);
        if (handler(line, lineNum, state)) {
          return;
        }

        handler = this.handler('publish', this.spec.TASK_PUBLISH, () => '');
        handler(line, lineNum, state);

        let block;

        block = this.block('isSuccessBlock', this.spec.SUCCESS_BLOCK);

        if (block.enter(line, lineNum, state)) {
          const sector = state.currentTask.getSector('success');
          sector.setStart(lineNum, 0);
          sector.indent = _.repeat(state.unit, state.isSuccessBlock - 1);
        } else {
          block.exit(line, lineNum, state);
        }

        if (state.isSuccessBlock) {
          const sector = state.currentTask.getSector('success');
          sector.setEnd(lineNum + 1, 0);

          let match;

          match = this.spec.TRANSITION.exec(line);
          if (match) {
            const [,starter,name,rest] = match
              ;

            if (!name.match(this.spec.TASK_NAME_VALIDATION)) {
              let message = {
                type: 'error',
                row: lineNum,
                column: starter.length,
                text: `Task name should only contain letters, dots and hyphens`
              };
              this.model.messages.add(message);
            }

            sector.childStarter = starter;

            const type = 'success'
              , task = state.currentTask
              , values = task.getProperty(type)
              ;

            const value = rest ? { name, rest } : { name };

            values.push(value);

            task.setProperty(type, values);

            return;
          }
        }

        block = this.block('isErrorBlock', this.spec.ERROR_BLOCK);

        if (block.enter(line, lineNum, state)) {
          const sector = state.currentTask.getSector('error');
          sector.setStart(lineNum, 0);
          sector.indent = _.repeat(state.unit, state.isErrorBlock - 1);
        } else {
          block.exit(line, lineNum, state);
        }

        if (state.isErrorBlock) {
          const sector = state.currentTask.getSector('error');
          sector.setEnd(lineNum + 1, 0);

          let match;

          match = this.spec.TRANSITION.exec(line);
          if (match) {
            const [,starter,name,rest] = match
              ;

            if (!name.match(this.spec.TASK_NAME_VALIDATION)) {
              let message = {
                type: 'error',
                row: lineNum,
                column: starter.length,
                text: `Task name should only contain letters, dots and hyphens`
              };
              this.model.messages.add(message);
            }

            sector.childStarter = starter;

            const type = 'error'
              , task = state.currentTask
              , values = task.getProperty(type)
              ;

            const value = rest ? { name, rest } : { name };

            values.push(value);

            task.setProperty(type, values);

            return;
          }
        }

        block = this.block('isCompleteBlock', this.spec.COMPLETE_BLOCK);

        if (block.enter(line, lineNum, state)) {
          const sector = state.currentTask.getSector('complete');
          sector.setStart(lineNum, 0);
          sector.indent = _.repeat(state.unit, state.isCompleteBlock - 1);
        } else {
          block.exit(line, lineNum, state);
        }

        if (state.isCompleteBlock) {
          const sector = state.currentTask.getSector('complete');
          sector.setEnd(lineNum + 1, 0);

          let match;

          match = this.spec.TRANSITION.exec(line);
          if (match) {
            const [,starter,name,rest] = match
              ;

            if (!name.match(this.spec.TASK_NAME_VALIDATION)) {
              let message = {
                type: 'error',
                row: lineNum,
                column: starter.length,
                text: `Task name should only contain letters, dots and hyphens`
              };
              this.model.messages.add(message);
            }

            sector.childStarter = starter;

            const type = 'complete'
              , task = state.currentTask
              , values = task.getProperty(type)
              ;

            const value = rest ? { name, rest } : { name };

            values.push(value);

            task.setProperty(type, values);

            return;
          }
        }

        block = this.block('isInputBlock', this.spec.INPUT_BLOCK);

        if (block.enter(line, lineNum, state)) {
          const sector = state.currentTask.getSector('input');
          sector.setStart(lineNum, 0);
        } else {
          block.exit(line, lineNum, state);
        }

        if (state.isInputBlock) {
          const sector = state.currentTask.getSector('input');
          sector.setEnd(lineNum + 1, 0);
        }

      }

      let match;

      match = this.spec.TASK_NAME.exec(line);
      if (match) {
        const [,starter,name] = match
            , coords = [lineNum, starter.length, lineNum, (starter+name).length]
            , nextLine = [lineNum+1, 0, lineNum+1, 0]
            ;

        if (!state.currentTask || starter.length === state.currentTask.starter.length) {
          if (state.currentTask) {
            state.currentTask.endSector('task', lineNum, 0);
          }

          const taskSector = new Sector(lineNum, 0).setType('task')
              , nameSector = new Sector(...coords).setType('name')
              , coordSector = new Sector(...nextLine).setType('coord')
              , inputSector = new Sector().setType('input')
              ;

          if (!name.match(this.spec.TASK_NAME_VALIDATION)) {
            let message = {
              type: 'error',
              row: lineNum,
              column: starter.length,
              text: `Task name should only contain letters, dots and hyphens`
            };
            this.model.messages.add(message);
          }

          if (_.includes(state.touched, name)) {
            const sector = this.model.task(name).getSector('name');

            let message = {
              type: 'error',
              row: sector.start.row,
              column: sector.start.column,
              text: `Task '${name}' is overriden by another task`
            };
            this.model.messages.add(message);

            message = {
              type: 'warning',
              row: lineNum,
              column: starter.length,
              text: `Task '${name}' overrides another task`
            };
            this.model.messages.add(message);
          }

          state.currentTask = this.model.task(name, {})
            .setSector('task', taskSector)
            .setSector('name', nameSector)
            .setSector('coord', coordSector)
            .setSector('yaql', [])
            .setSector('input', inputSector)
            ;

          taskSector.task = state.currentTask;
          inputSector.setTask(state.currentTask);

          state.currentTask.starter = starter;

          const TYPES = ['success', 'error', 'complete'];

          _.each(TYPES, (type) => {
            const sector = new Sector().setType(type)
                , outdent = state.taskBlock.indent
                , unit = _.repeat(state.unit, starter.length - outdent.length)
                ;

            sector.indent = starter + unit;
            sector.childStarter = sector.indent + unit + '- ';

            state.currentTask
              .setProperty(type, [])
              .setSector(type, sector)
              ;
          });

          _.remove(state.untouchedTasks, (e) => e === name);
          state.touched.push(name);
        }
      }

    }

  }
}
