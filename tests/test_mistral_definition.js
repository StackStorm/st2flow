// import _ from 'lodash';
import { expect } from 'chai';
import fs from 'fs';

import Sector from '../js/lib/models/sector';
import Task from '../js/lib/models/task';
import Model from '../js/lib/model';

function getFixture(filename) {
  return fs.readFileSync(`${ __dirname }/fixtures/${ filename }`).toString();
}

describe('Mistral definition', () => {

  let model;

  beforeEach(() => {
    model = new Model({ runner_type: 'mistral-v2' });
  });

  describe('cases', () => {

    it('should properly output task fragment even before the parse', () => {
      const taskStrings = model.fragments.task({
        name: 'some',
        ref: 'thing',
        x: 0,
        y: 0
      });

      expect(taskStrings).to.deep.equal([
        `---`,
        `version: '2.0'`,
        ``,
        `untitled:`,
        `  tasks:`,
        `    some:`,
        `      # [0, 0]`,
        `      action: thing`,
        ``
      ].join('\n'));
    });

    it('should properly parse empty file', () => {
      const code = '';

      model.parse(code);

      const tasks = [];
      const workflows = [];

      expect(model).to.have.property('tasks').deep.equal(tasks);
      expect(model).to.have.property('workflows').deep.equal(workflows);

      // Fragments

      const taskStrings = model.fragments.task({
        name: 'some',
        ref: 'thing',
        x: 0,
        y: 0
      });

      expect(taskStrings).to.deep.equal([
        `---`,
        `version: '2.0'`,
        ``,
        `untitled:`,
        `  tasks:`,
        `    some:`,
        `      # [0, 0]`,
        `      action: thing`,
        ``
      ].join('\n'));
    });

    it('should properly parse empty workbook', () => {
      const code = getFixture('empty_workbook.yaml');

      model.parse(code);

      const tasks = [];
      const workflows = [
        {
          'indent': '  ',
          'properties': {
            'name': 'main'
          },
          'sectors': {
            'input': new Sector(8,0,11,0).setType('input')._setSpecial({ childStarter: '      - '}),
            'name': new Sector(5,2,5,6).setType('name'),
            'taskBlock': new Sector(),
            'workflow': new Sector(5,0,13,0).setType('workflow')
          },
          'tasks': new Set(),
          'variables': new Set()
        }
      ];

      expect(model).to.have.property('tasks').deep.equal(tasks);
      expect(model).to.have.property('workflows').deep.equal(workflows);

      // Fragments

      const taskStrings = model.fragments.task({
        name: 'some',
        ref: 'thing',
        x: 0,
        y: 0
      });

      // will produce an incorrect result due to us relying on defaults rather than calculating
      // indent from adjacent blocks
      // TODO: Fix indentation calculation for workbook with empty task block
      expect(taskStrings).to.deep.equal([
        '  tasks:',
        '    some:',
        '      # [0, 0]',
        '      action: thing',
        ''
      ].join('\n'));
    });

    it('should properly parse empty workflow', () => {
      const code = getFixture('empty_workflow.yaml');

      model.parse(code);

      const tasks = [];
      const workflows = [
        {
          'indent': '',
          'properties': {
            'name': 'main'
          },
          'sectors': {
            'input': new Sector(7,0,10,0).setType('input')._setSpecial({ childStarter: '    - '}),
            'taskBlock': new Sector(),
            'workflow': new Sector(4,0,12,0).setType('workflow')
          },
          'tasks': new Set(),
          'variables': new Set()
        }
      ];

      expect(model).to.have.property('tasks').deep.equal(tasks);
      expect(model).to.have.property('workflows').deep.equal(workflows);

      // Fragments

      const taskStrings = model.fragments.task({
        name: 'some',
        ref: 'thing',
        x: 0,
        y: 0
      });

      expect(taskStrings).to.deep.equal([
        '  tasks:',
        '    some:',
        '      # [0, 0]',
        '      action: thing',
        ''
      ].join('\n'));
    });

    it('should properly parse simple workbook', () => {
      const code = getFixture('simple_workbook.yaml');

      model.parse(code);

      const workflow = {
        'indent': '  ',
        'properties': {
          'name': 'main'
        },
        'sectors': {
          'input': new Sector(8,0,11,0).setType('input')._setSpecial({ childStarter: '      - '}),
          'name': new Sector(5,2,5,6).setType('name'),
          'taskBlock': new Sector(14,0,42,0)._setSpecial({ indent: '    ', childStarter: '      '}),
          'workflow': new Sector(5,0,41,0).setType('workflow')
        },
        'tasks': new Set(),
        'variables': new Set()
      };

      const specials = {
        childStarter: '          - ',
        indent: '        '
      };

      const publishSpecials = {
        childStarter: '          ',
        indent: '        '
      };

      const task1 = new Task()
        .setProperty('name', 'update_group_start_status')
        .setProperty('success', [{
          name: 'get_chatops_channel'
        }])
        .setProperty('error', [])
        .setProperty('complete', [])
        .setProperty('ref', 'st2.kv.set')
        .setSector('task', new Sector(15,0,23,0).setType('task'))
        .setSector('name', new Sector(15,6,15,31).setType('name'))
        .setSector('success', new Sector(21,0,23,0).setType('success')._setSpecial(specials))
        .setSector('error', new Sector().setType('error')._setSpecial(specials))
        .setSector('complete', new Sector().setType('complete')._setSpecial(specials))
        .setSector('coord', new Sector(16, 0, 16, 0).setType('coord'))
        .setSector('input', new Sector(17, 0, 21, 0).setType('input'))
        .setSector('publish', new Sector().setType('publish'))
        .setSector('ref', new Sector(16,16,16,26).setType('ref'))
        .setSector('yaql', [
          new Sector(18,23,18,28).setType('yaql')._setSpecial({value: '$.asg', workflow})
        ])
        .setSector('yaqlvariable', [
          new Sector(18,25,18,28).setType('yaqlvariable')._setSpecial({value: 'asg', workflow})
        ])
        ;

      task1.starter = '      ';
      task1.indent = '        ';
      task1.getSector('task').setTask(task1);
      task1.getSector('input').setTask(task1);

      const task2 = new Task()
        .setProperty('name', 'get_chatops_channel')
        .setProperty('success', [{
          name: 'notify_start_wf'
        }])
        .setProperty('error', [])
        .setProperty('complete', [])
        .setProperty('ref', 'st2.kv.get')
        .setSector('task', new Sector(23,0,31,0).setType('task'))
        .setSector('name', new Sector(23,6,23,25).setType('name'))
        .setSector('publish', new Sector(27,0,29,0).setType('publish')._setSpecial(publishSpecials))
        .setSector('success', new Sector(29,0,31,0).setType('success')._setSpecial(specials))
        .setSector('error', new Sector().setType('error')._setSpecial(specials))
        .setSector('complete', new Sector().setType('complete')._setSpecial(specials))
        .setSector('coord', new Sector(24, 0, 24, 0).setType('coord'))
        .setSector('input', new Sector(25, 0, 27, 0).setType('input'))
        .setSector('ref', new Sector(24,16,24,26).setType('ref'))
        .setSector('yaql', [
          new Sector(26,23,26,28).setType('yaql')._setSpecial({value: '$.asg', workflow}),
          new Sector(28,22,28,50).setType('yaql')._setSpecial({value: '$.get_chatops_channel.result', workflow})
        ])
        .setSector('yaqlvariable', [
          new Sector(26,25,26,28).setType('yaqlvariable')._setSpecial({value: 'asg', workflow}),
          new Sector(28,24,28,43).setType('yaqlvariable')._setSpecial({value: 'get_chatops_channel', workflow})
        ])
        ;

      task2.starter = '      ';
      task2.indent = '        ';
      task2.getSector('task').setTask(task2);
      task2.getSector('input').setTask(task2);

      const task3 = new Task()
        .setProperty('name', 'notify_start_wf')
        .setProperty('success', [{
          name: 'get_current_epoch'
        }])
        .setProperty('error', [])
        .setProperty('complete', [])
        .setProperty('ref', 'slack.post_message')
        .setSector('task', new Sector(31,0,38,0).setType('task'))
        .setSector('name', new Sector(31,6,31,21).setType('name'))
        .setSector('success', new Sector(36,0,38,0).setType('success')._setSpecial(specials))
        .setSector('error', new Sector().setType('error')._setSpecial(specials))
        .setSector('complete', new Sector().setType('complete')._setSpecial(specials))
        .setSector('coord', new Sector(32, 0, 32, 0).setType('coord'))
        .setSector('input', new Sector(33, 0, 36, 0).setType('input'))
        .setSector('publish', new Sector().setType('publish'))
        .setSector('ref', new Sector(32,16,32,34).setType('ref'))
        .setSector('yaql', [
          new Sector(34,30,34,35).setType('yaql')._setSpecial({value: '$.asg', workflow}),
          new Sector(35,22,35,31).setType('yaql')._setSpecial({value: '$.channel', workflow})
        ])
        .setSector('yaqlvariable', [
          new Sector(34,32,34,35).setType('yaqlvariable')._setSpecial({value: 'asg', workflow}),
          new Sector(35,24,35,31).setType('yaqlvariable')._setSpecial({value: 'channel', workflow})
        ])
        ;

      task3.starter = '      ';
      task3.indent = '        ';
      task3.getSector('task').setTask(task3);
      task3.getSector('input').setTask(task3);

      const task4 = new Task()
        .setProperty('name', 'get_current_epoch')
        .setProperty('success', [])
        .setProperty('error', [])
        .setProperty('complete', [])
        .setProperty('ref', 'autoscale.epoch')
        .setSector('task', new Sector(38,0,42,0).setType('task'))
        .setSector('name', new Sector(38,6,38,23).setType('name'))
        .setSector('publish', new Sector(40,0,42,0).setType('publish')._setSpecial(publishSpecials))
        .setSector('success', new Sector().setType('success')._setSpecial(specials))
        .setSector('error', new Sector().setType('error')._setSpecial(specials))
        .setSector('complete', new Sector().setType('complete')._setSpecial(specials))
        .setSector('coord', new Sector(39, 0, 39, 0).setType('coord'))
        .setSector('input', new Sector().setType('input'))
        .setSector('ref', new Sector(39,16,39,31).setType('ref'))
        .setSector('yaql', [
          new Sector(41,28,41,54).setType('yaql')._setSpecial({value: '$.get_current_epoch.result', workflow})
        ])
        .setSector('yaqlvariable', [
          new Sector(41,30,41,47).setType('yaqlvariable')._setSpecial({value: 'get_current_epoch', workflow})
        ])
        ;

      task4.starter = '      ';
      task4.indent = '        ';
      task4.getSector('task').setTask(task4);
      task4.getSector('input').setTask(task4);

      const tasks = [task1, task2, task3, task4];
      const workflows = [
        workflow
      ];

      expect(model).to.have.property('tasks').deep.equal(tasks);
      expect(model).to.have.property('workflows').deep.equal(workflows);

      // Fragments

      const taskStrings = model.fragments.task({
        name: 'some',
        ref: 'thing',
        x: 0,
        y: 0
      });

      expect(taskStrings).to.deep.equal([
        '      some:',
        '        # [0, 0]',
        '        action: thing',
        ''
      ].join('\n'));

      const transitionString = model.fragments.transitions(task1, [{value: { name: 'some', rest: ': thing' }}], 'success');

      expect(transitionString).to.deep.equal([
        '        on-success:',
        '          - some: thing',
        ''
      ].join('\n'));
    });

    it('should properly parse simple workflow', () => {
      const code = getFixture('simple_workflow.yaml');

      model.parse(code);

      const workflow = {
        'indent': '',
        'properties': {
          'name': 'main'
        },
        'sectors': {
          'input': new Sector(7,0,10,0).setType('input')._setSpecial({ childStarter: '    - '}),
          'taskBlock': new Sector(13,0,41,0)._setSpecial({ indent: '  ', childStarter: '    '}),
          'workflow': new Sector(4,0,40,0).setType('workflow')
        },
        'tasks': new Set(),
        'variables': new Set()
      };

      const specials = {
        childStarter: '        - ',
        indent: '      '
      };

      const publishSpecials = {
        childStarter: '        ',
        indent: '      '
      };

      const task1 = new Task()
        .setProperty('name', 'update_group_start_status')
        .setProperty('success', [{
          name: 'get_chatops_channel'
        }])
        .setProperty('error', [])
        .setProperty('complete', [])
        .setProperty('ref', 'st2.kv.set')
        .setSector('task', new Sector(14,0,22,0).setType('task'))
        .setSector('name', new Sector(14,4,14,29).setType('name'))
        .setSector('success', new Sector(20,0,22,0).setType('success')._setSpecial(specials))
        .setSector('error', new Sector().setType('error')._setSpecial(specials))
        .setSector('complete', new Sector().setType('complete')._setSpecial(specials))
        .setSector('coord', new Sector(15, 0, 15, 0).setType('coord'))
        .setSector('input', new Sector(16, 0, 20, 0).setType('input'))
        .setSector('publish', new Sector().setType('publish'))
        .setSector('ref', new Sector(15,14,15,24).setType('ref'))
        .setSector('yaql', [
          new Sector(17,21,17,26).setType('yaql')._setSpecial({value: '$.asg', workflow})
        ])
        .setSector('yaqlvariable', [
          new Sector(17,23,17,26).setType('yaqlvariable')._setSpecial({value: 'asg', workflow})
        ])
        ;

      task1.starter = '    ';
      task1.indent = '      ';
      task1.getSector('task').setTask(task1);
      task1.getSector('input').setTask(task1);

      const task2 = new Task()
        .setProperty('name', 'get_chatops_channel')
        .setProperty('success', [{
          name: 'notify_start_wf'
        }])
        .setProperty('error', [])
        .setProperty('complete', [])
        .setProperty('ref', 'st2.kv.get')
        .setSector('task', new Sector(22,0,30,0).setType('task'))
        .setSector('name', new Sector(22,4,22,23).setType('name'))
        .setSector('publish', new Sector(26,0,28,0).setType('publish')._setSpecial(publishSpecials))
        .setSector('success', new Sector(28,0,30,0).setType('success')._setSpecial(specials))
        .setSector('error', new Sector().setType('error')._setSpecial(specials))
        .setSector('complete', new Sector().setType('complete')._setSpecial(specials))
        .setSector('coord', new Sector(23, 0, 23, 0).setType('coord'))
        .setSector('input', new Sector(24, 0, 26, 0).setType('input'))
        .setSector('ref', new Sector(23,14,23,24).setType('ref'))
        .setSector('yaql', [
          new Sector(25,21,25,26).setType('yaql')._setSpecial({value: '$.asg', workflow}),
          new Sector(27,20,27,48).setType('yaql')._setSpecial({value: '$.get_chatops_channel.result', workflow})
        ])
        .setSector('yaqlvariable', [
          new Sector(25,23,25,26).setType('yaqlvariable')._setSpecial({value: 'asg', workflow}),
          new Sector(27,22,27,41).setType('yaqlvariable')._setSpecial({value: 'get_chatops_channel', workflow})
        ])
        ;

      task2.starter = '    ';
      task2.indent = '      ';
      task2.getSector('task').setTask(task2);
      task2.getSector('input').setTask(task2);

      const task3 = new Task()
        .setProperty('name', 'notify_start_wf')
        .setProperty('success', [{
          name: 'get_current_epoch'
        }])
        .setProperty('error', [])
        .setProperty('complete', [])
        .setProperty('ref', 'slack.post_message')
        .setSector('task', new Sector(30,0,37,0).setType('task'))
        .setSector('name', new Sector(30,4,30,19).setType('name'))
        .setSector('success', new Sector(35,0,37,0).setType('success')._setSpecial(specials))
        .setSector('error', new Sector().setType('error')._setSpecial(specials))
        .setSector('complete', new Sector().setType('complete')._setSpecial(specials))
        .setSector('coord', new Sector(31, 0, 31, 0).setType('coord'))
        .setSector('input', new Sector(32, 0, 35, 0).setType('input'))
        .setSector('publish', new Sector().setType('publish'))
        .setSector('ref', new Sector(31,14,31,32).setType('ref'))
        .setSector('yaql', [
          new Sector(33,28,33,33).setType('yaql')._setSpecial({value: '$.asg', workflow}),
          new Sector(34,20,34,29).setType('yaql')._setSpecial({value: '$.channel', workflow})
        ])
        .setSector('yaqlvariable', [
          new Sector(33,30,33,33).setType('yaqlvariable')._setSpecial({value: 'asg', workflow}),
          new Sector(34,22,34,29).setType('yaqlvariable')._setSpecial({value: 'channel', workflow})
        ])
        ;

      task3.starter = '    ';
      task3.indent = '      ';
      task3.getSector('task').setTask(task3);
      task3.getSector('input').setTask(task3);

      const task4 = new Task()
        .setProperty('name', 'get_current_epoch')
        .setProperty('success', [])
        .setProperty('error', [])
        .setProperty('complete', [])
        .setProperty('ref', 'autoscale.epoch')
        .setSector('task', new Sector(37,0,41,0).setType('task'))
        .setSector('name', new Sector(37,4,37,21).setType('name'))
        .setSector('publish', new Sector(39,0,41,0).setType('publish')._setSpecial(publishSpecials))
        .setSector('success', new Sector().setType('success')._setSpecial(specials))
        .setSector('error', new Sector().setType('error')._setSpecial(specials))
        .setSector('complete', new Sector().setType('complete')._setSpecial(specials))
        .setSector('coord', new Sector(38, 0, 38, 0).setType('coord'))
        .setSector('input', new Sector().setType('input'))
        .setSector('ref', new Sector(38,14,38,29).setType('ref'))
        .setSector('yaql', [
          new Sector(40,26,40,52).setType('yaql')._setSpecial({value: '$.get_current_epoch.result', workflow})
        ])
        .setSector('yaqlvariable', [
          new Sector(40,28,40,45).setType('yaqlvariable')._setSpecial({value: 'get_current_epoch', workflow})
        ])
        ;

      task4.starter = '    ';
      task4.indent = '      ';
      task4.getSector('task').setTask(task4);
      task4.getSector('input').setTask(task4);

      const tasks = [task1, task2, task3, task4];
      const workflows = [workflow];

      expect(model).to.have.property('tasks').deep.equal(tasks);
      expect(model).to.have.property('workflows').deep.equal(workflows);

      // Fragments

      const taskStrings = model.fragments.task({
        name: 'some',
        ref: 'thing',
        x: 0,
        y: 0
      });

      expect(taskStrings).to.deep.equal([
        '    some:',
        '      # [0, 0]',
        '      action: thing',
        ''
      ].join('\n'));

      const transitionString = model.fragments.transitions(task1, [{value: { name: 'some', rest: ': thing' }}], 'success');

      expect(transitionString).to.deep.equal([
        '      on-success:',
        '        - some: thing',
        ''
      ].join('\n'));
    });

    it('should properly handle four space indents', () => {
      const code = getFixture('fourspace_workbook.yaml');

      model.parse(code);

      const workflow = {
        'indent': '    ',
        'properties': {
          'name': 'main'
        },
        'sectors': {
          'input': new Sector(8,0,11,0).setType('input')._setSpecial({ childStarter: '            - '}),
          'name': new Sector(5,4,5,8).setType('name'),
          'taskBlock': new Sector(14,0,23,0)._setSpecial({ indent: '        ', childStarter: '            '}),
          'workflow': new Sector(5,0,22,0).setType('workflow')
        },
        'tasks': new Set(),
        'variables': new Set()
      };

      const specials = {
        childStarter: '                    - ',
        indent: '                '
      };

      const task1 = new Task()
        .setProperty('name', 'update_group_start_status')
        .setProperty('success', [{
          name: 'get_chatops_channel'
        }])
        .setProperty('error', [])
        .setProperty('complete', [])
        .setProperty('ref', 'st2.kv.set')
        .setSector('task', new Sector(15,0,23,0).setType('task'))
        .setSector('name', new Sector(15,12,15,37).setType('name'))
        .setSector('success', new Sector(21,0,23,0).setType('success')._setSpecial(specials))
        .setSector('error', new Sector().setType('error')._setSpecial(specials))
        .setSector('complete', new Sector().setType('complete')._setSpecial(specials))
        .setSector('coord', new Sector(16, 0, 16, 0).setType('coord'))
        .setSector('input', new Sector(17,0,21,0).setType('input'))
        .setSector('publish', new Sector().setType('publish'))
        .setSector('ref', new Sector(16,24,16,34).setType('ref'))
        .setSector('yaql', [
          new Sector(18,33,18,38).setType('yaql')._setSpecial({value: '$.asg', workflow})
        ])
        .setSector('yaqlvariable', [
          new Sector(18,35,18,38).setType('yaqlvariable')._setSpecial({value: 'asg', workflow})
        ])
        ;

      task1.starter = '            ';
      task1.indent = '                ';
      task1.getSector('task').setTask(task1);
      task1.getSector('input').setTask(task1);

      expect(model).to.have.property('tasks').deep.equal([task1]);

      // Fragments

      const taskStrings = model.fragments.task({
        name: 'some',
        ref: 'thing',
        x: 0,
        y: 0
      });

      expect(taskStrings).to.deep.equal([
        '            some:',
        '                # [0, 0]',
        '                action: thing',
        ''
      ].join('\n'));

      const transitionString = model.fragments.transitions(task1, [{value: { name: 'some' }}], 'success');

      expect(transitionString).to.deep.equal([
        '                on-success:',
        '                    - some',
        ''
      ].join('\n'));
    });

    it('should properly handle workflows', () => {
      const code = getFixture('fourspace_workflow.yaml');

      model.parse(code);

      const workflow = {
        'indent': '',
        'properties': {
          'name': 'main'
        },
        'sectors': {
          'input': new Sector(5,0,7,0).setType('input')._setSpecial({ childStarter: '        - '}),
          'taskBlock': new Sector(9,0,15,0)._setSpecial({ indent: '    ', childStarter: '        '}),
          'workflow': new Sector(2,0,14,0).setType('workflow')
        },
        'tasks': new Set(),
        'variables': new Set()
      };

      const specials = {
        childStarter: '                - ',
        indent: '            '
      };

      const publishSpecials = {
        childStarter: '                ',
        indent: '            '
      };

      const task1 = new Task()
        .setProperty('name', 'task1')
        .setProperty('success', [])
        .setProperty('error', [])
        .setProperty('complete', [])
        .setProperty('ref', 'core.local')
        .setSector('task', new Sector(10,0,15,0).setType('task'))
        .setSector('name', new Sector(10,8,10,13).setType('name'))
        .setSector('publish', new Sector(12,0,15,0).setType('publish')._setSpecial(publishSpecials))
        .setSector('success', new Sector().setType('success')._setSpecial(specials))
        .setSector('error', new Sector().setType('error')._setSpecial(specials))
        .setSector('complete', new Sector().setType('complete')._setSpecial(specials))
        .setSector('coord', new Sector(11, 0, 11, 0).setType('coord'))
        .setSector('input', new Sector().setType('input'))
        .setSector('ref', new Sector(11,20,11,30).setType('ref'))
        .setSector('yaql', [
          new Sector(11,38,11,43).setType('yaql')._setSpecial({value: '$.cmd', workflow}),
          new Sector(13,27,13,41).setType('yaql')._setSpecial({value: '$.task1.stdout', workflow}),
          new Sector(14,27,14,41).setType('yaql')._setSpecial({value: '$.task1.stderr', workflow})
        ])
        .setSector('yaqlvariable', [
          new Sector(11,40,11,43).setType('yaqlvariable')._setSpecial({value: 'cmd', workflow}),
          new Sector(13,29,13,34).setType('yaqlvariable')._setSpecial({value: 'task1', workflow}),
          new Sector(14,29,14,34).setType('yaqlvariable')._setSpecial({value: 'task1', workflow})
        ])
        ;

      task1.starter = '        ';
      task1.indent = '            ';
      task1.getSector('task').setTask(task1);
      task1.getSector('input').setTask(task1);

      expect(model).to.have.property('tasks').deep.equal([task1]);

      // Fragments

      const taskStrings = model.fragments.task({
        name: 'some',
        ref: 'thing',
        x: 0,
        y: 0
      });

      expect(taskStrings).to.deep.equal([
        '        some:',
        '            # [0, 0]',
        '            action: thing',
        ''
      ].join('\n'));

      const transitionString = model.fragments.transitions(task1, [{value: { name: 'some' }}], 'success');

      expect(transitionString).to.deep.equal([
        '            on-success:',
        '                - some',
        ''
      ].join('\n'));
    });

    it('should properly handle tab indents', () => {
      const code = getFixture('tabbed_workflow.yaml');

      model.parse(code);

      const workflow = {
        'indent': '',
        'properties': {
          'name': 'main'
        },
        'sectors': {
          'input': new Sector(5,0,7,0).setType('input')._setSpecial({ childStarter: '			- '}),
          'taskBlock': new Sector(9,0,15,0)._setSpecial({ indent: '		', childStarter: '				'}),
          'workflow': new Sector(2,0,14,0).setType('workflow')
        },
        'tasks': new Set(),
        'variables': new Set()
      };

      const specials = {
        childStarter: '					- ',
        indent: '				'
      };

      const publishSpecials = {
        childStarter: '					',
        indent: '				'
      };

      const task1 = new Task()
        .setProperty('name', 'task1')
        .setProperty('success', [])
        .setProperty('error', [])
        .setProperty('complete', [])
        .setProperty('ref', 'core.local')
        .setSector('task', new Sector(10,0,15,0).setType('task'))
        .setSector('name', new Sector(10,3,10,8).setType('name'))
        .setSector('publish', new Sector(12,0,15,0).setType('publish')._setSpecial(publishSpecials))
        .setSector('success', new Sector().setType('success')._setSpecial(specials))
        .setSector('error', new Sector().setType('error')._setSpecial(specials))
        .setSector('complete', new Sector().setType('complete')._setSpecial(specials))
        .setSector('coord', new Sector(11, 0, 11, 0).setType('coord'))
        .setSector('input', new Sector().setType('input'))
        .setSector('ref', new Sector(11,12,11,22).setType('ref'))
        .setSector('yaql', [
          new Sector(11,30,11,35).setType('yaql')._setSpecial({value: '$.cmd', workflow}),
          new Sector(13,16,13,30).setType('yaql')._setSpecial({value: '$.task1.stdout', workflow}),
          new Sector(14,16,14,30).setType('yaql')._setSpecial({value: '$.task1.stderr', workflow})
        ])
        .setSector('yaqlvariable', [
          new Sector(11,32,11,35).setType('yaqlvariable')._setSpecial({value: 'cmd', workflow}),
          new Sector(13,18,13,23).setType('yaqlvariable')._setSpecial({value: 'task1', workflow}),
          new Sector(14,18,14,23).setType('yaqlvariable')._setSpecial({value: 'task1', workflow})
        ])
        ;

      task1.starter = '			';
      task1.indent = '				';
      task1.getSector('task').setTask(task1);
      task1.getSector('input').setTask(task1);

      expect(model).to.have.property('tasks').deep.equal([task1]);

      // Fragments

      const taskStrings = model.fragments.task({
        name: 'some',
        ref: 'thing',
        x: 0,
        y: 0
      });

      expect(taskStrings).to.deep.equal([
        '			some:',
        '				# [0, 0]',
        '				action: thing',
        ''
      ].join('\n'));

      const transitionString = model.fragments.transitions(task1, [{value: { name: 'some' }}], 'success');

      expect(transitionString).to.deep.equal([
        '				on-success:',
        '					- some',
        ''
      ].join('\n'));
    });

  });

});
