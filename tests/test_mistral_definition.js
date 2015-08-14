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
    model = new Model('mistral-v2');
  });

  describe('cases', () => {

    it('should properly parse empty file', () => {
      const code = '';

      model.parse(code);

      const tasks = [];
      const workflows = [];

      expect(model).to.have.property('tasks').deep.equal(tasks);
      expect(model).to.have.property('workflows').deep.equal(workflows);
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
            'name': new Sector(5,2,5,6).setType('name'),
            'taskBlock': new Sector(),
            'workflow': new Sector(5,0,13,0).setType('workflow')
          }
        }
      ];

      expect(model).to.have.property('tasks').deep.equal(tasks);
      expect(model).to.have.property('workflows').deep.equal(workflows);
    });

    it('should properly parse simple workbook', () => {
      const code = getFixture('simple_workbook.yaml');

      model.parse(code);

      const task1 = new Task()
        .setProperty('name', 'update_group_start_status')
        .setProperty('success', ['get_chatops_channel'])
        .setProperty('error', [])
        .setProperty('complete', [])
        .setProperty('ref', 'st2.kv.set')
        .setSector('task', new Sector(15,0,23,0).setType('task'))
        .setSector('name', new Sector(15,6,15,31).setType('name'))
        .setSector('success', new Sector(21,0,23,0).setType('success')
          ._setSpecial('childStarter', '          - ')._setSpecial('indent', '        '))
        .setSector('error', new Sector().setType('error')
          ._setSpecial('childStarter', '          - ')._setSpecial('indent', '        '))
        .setSector('complete', new Sector().setType('complete')
          ._setSpecial('childStarter', '          - ')._setSpecial('indent', '        '))
        .setSector('ref', new Sector(16,16,16,26).setType('ref'))
        ;

      task1.starter = '      ';
      task1.indent = '        ';
      task1.getSector('task').setTask(task1);

      const task2 = new Task()
        .setProperty('name', 'get_chatops_channel')
        .setProperty('success', ['notify_start_wf'])
        .setProperty('error', [])
        .setProperty('complete', [])
        .setProperty('ref', 'st2.kv.get')
        .setSector('task', new Sector(23,0,31,0).setType('task'))
        .setSector('name', new Sector(23,6,23,25).setType('name'))
        .setSector('success', new Sector(29,0,31,0).setType('success')
          ._setSpecial('childStarter', '          - ')._setSpecial('indent', '        '))
        .setSector('error', new Sector().setType('error')
          ._setSpecial('childStarter', '          - ')._setSpecial('indent', '        '))
        .setSector('complete', new Sector().setType('complete')
          ._setSpecial('childStarter', '          - ')._setSpecial('indent', '        '))
        .setSector('ref', new Sector(24,16,24,26).setType('ref'))
        ;

      task2.starter = '      ';
      task2.indent = '        ';
      task2.getSector('task').setTask(task2);

      const task3 = new Task()
        .setProperty('name', 'notify_start_wf')
        .setProperty('success', ['get_current_epoch'])
        .setProperty('error', [])
        .setProperty('complete', [])
        .setProperty('ref', 'slack.post_message')
        .setSector('task', new Sector(31,0,38,0).setType('task'))
        .setSector('name', new Sector(31,6,31,21).setType('name'))
        .setSector('success', new Sector(36,0,38,0).setType('success')
          ._setSpecial('childStarter', '          - ')._setSpecial('indent', '        '))
        .setSector('error', new Sector().setType('error')
          ._setSpecial('childStarter', '          - ')._setSpecial('indent', '        '))
        .setSector('complete', new Sector().setType('complete')
          ._setSpecial('childStarter', '          - ')._setSpecial('indent', '        '))
        .setSector('ref', new Sector(32,16,32,34).setType('ref'))
        ;

      task3.starter = '      ';
      task3.indent = '        ';
      task3.getSector('task').setTask(task3);

      const task4 = new Task()
        .setProperty('name', 'get_current_epoch')
        .setProperty('success', [])
        .setProperty('error', [])
        .setProperty('complete', [])
        .setProperty('ref', 'autoscale.epoch')
        .setSector('task', new Sector(38,0,42,0).setType('task'))
        .setSector('name', new Sector(38,6,38,23).setType('name'))
        .setSector('success', new Sector().setType('success')
          ._setSpecial('childStarter', '          - ')._setSpecial('indent', '        '))
        .setSector('error', new Sector().setType('error')
          ._setSpecial('childStarter', '          - ')._setSpecial('indent', '        '))
        .setSector('complete', new Sector().setType('complete')
          ._setSpecial('childStarter', '          - ')._setSpecial('indent', '        '))
        .setSector('ref', new Sector(39,16,39,31).setType('ref'))
        ;

      task4.starter = '      ';
      task4.indent = '        ';
      task4.getSector('task').setTask(task4);

      const tasks = [task1, task2, task3, task4];
      const workflows = [
        {
          'indent': '  ',
          'properties': {
            'name': 'main'
          },
          'sectors': {
            'name': new Sector(5,2,5,6).setType('name'),
            'taskBlock': new Sector(14,0,42,0),
            'workflow': new Sector(5,0,41,0).setType('workflow')
          }
        }
      ];

      expect(model).to.have.property('tasks').deep.equal(tasks);
      expect(model).to.have.property('workflows').deep.equal(workflows);
    });

  });

});
