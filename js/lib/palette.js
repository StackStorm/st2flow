'use strict';

let _ = require('lodash')
  , bem = require('./bem')
  , d3 = require('d3')
  , { pack } = require('./packer')
  ;

const st2Class = bem('palette');

const ACTIONS = [{
  ref: 'core.http',
  description: 'Action that performs an http request.'
}, {
  ref: 'core.local',
  description: 'Action that executes an arbitrary Linux command on the localhost.'
}, {
  ref: 'core.local_sudo',
  description: 'Action that executes an arbitrary Linux command on the localhost.'
}, {
  ref: 'core.remote',
  description: 'Action to execute arbitrary linux command remotely.'
}, {
  ref: 'core.remote_sudo',
  description: 'Action to execute arbitrary linux command remotely.'
}, {
  ref: 'core.sendmail',
  description: 'This sends an email'
}];

const actionTmpl = (action) =>
`
  <div class="${st2Class('action-name')}">${action.ref}</div>
  <div class="${st2Class('action-description')}">${action.description}</div>
`;

class Palette {
  constructor() {
    let self = this;

    this.palette = d3
      .select(st2Class(null, true))
      ;

    this.actions = this.palette
      .selectAll(st2Class('action', true))
      .data(ACTIONS)
      ;

    this.actions.enter()
      .append('div')
        .attr('class', st2Class('action'))
        .attr('draggable', 'true')
        .html((action) => actionTmpl(action))
        .on('dragstart', function (action) {
          self.dragAction(this, d3.event, action);
        })
        ;
  }

  dragAction(element, event, action) {
    let dt = event.dataTransfer;

    dt.setData('actionPack', pack({ action }));
    dt.effectAllowed = 'copy';
  }
}

module.exports = Palette;
