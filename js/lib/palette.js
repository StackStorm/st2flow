'use strict';

let _ = require('lodash')
  , bem = require('./bem')
  , d3 = require('d3')
  , { pack } = require('./packer')
  ;

const st2Class = bem('palette');

const ACTIONS = [{
  pack: 'core',
  ref: 'core.http',
  description: 'Action that performs an http request.'
}, {
  pack: 'core',
  ref: 'core.local',
  description: 'Action that executes an arbitrary Linux command on the localhost.'
}, {
  pack: 'core',
  ref: 'core.local_sudo',
  description: 'Action that executes an arbitrary Linux command on the localhost.'
}, {
  pack: 'core',
  ref: 'core.remote',
  description: 'Action to execute arbitrary linux command remotely.'
}, {
  pack: 'core',
  ref: 'core.remote_sudo',
  description: 'Action to execute arbitrary linux command remotely.'
}, {
  pack: 'core',
  ref: 'core.sendmail',
  description: 'This sends an email'
}, {
  pack: 'linux',
  ref: 'linux.check_loadavg',
  description: 'Check CPU Load Average on a Host'
}, {
  pack: 'linux',
  ref: 'linux.check_processes',
  description: 'Check Interesting Processes'
}, {
  pack: 'linux',
  ref: 'linux.cp',
  description: 'Copy file(s)'
}, {
  pack: 'linux',
  ref: 'linux.diag_loadavg',
  description: 'Diagnostic workflow for high load alert'
}, {
  pack: 'linux',
  ref: 'linux.dig',
  description: 'Dig action'
}, {
  pack: 'linux',
  ref: 'linux.file_touch',
  description: 'Touches a file'
}, {
  pack: 'linux',
  ref: 'linux.get_open_ports',
  description: 'Retrieve open ports for a given host'
}, {
  pack: 'linux',
  ref: 'linux.lsof',
  description: 'Run lsof'
}, {
  pack: 'linux',
  ref: 'linux.lsof_pids',
  description: 'Run lsof for a group of PIDs'
}, {
  pack: 'linux',
  ref: 'linux.mv',
  description: 'Move file(s)'
}, {
  pack: 'linux',
  ref: 'linux.netstat',
  description: 'Run netstat'
}, {
  pack: 'linux',
  ref: 'linux.netstat_grep',
  description: 'Grep netstat results'
}, {
  pack: 'linux',
  ref: 'linux.pkill',
  description: 'Kill processes using pkill'
}, {
  pack: 'linux',
  ref: 'linux.rm',
  description: 'Remove file(s)'
}, {
  pack: 'linux',
  ref: 'linux.rsync',
  description: 'Copy file(s) from one place to another w/ rsync'
}, {
  pack: 'linux',
  ref: 'linux.scp',
  description: 'Secure copy file(s)'
}, {
  pack: 'linux',
  ref: 'linux.service',
  description: 'Stops, Starts, or Restarts a service'
}, {
  pack: 'linux',
  ref: 'linux.traceroute',
  description: 'Traceroute a Host'
}, {
  pack: 'linux',
  ref: 'linux.vmstat',
  description: 'Run vmstat'
}, {
  pack: 'linux',
  ref: 'linux.wait_for_ssh',
  description: 'Wait for SSH'
}];

const packTmpl = (pack) =>
`
  <div class="${st2Class('pack-header')}">
    <span class="${st2Class('pack-icon')}"></span>
    <span class="${st2Class('pack-name')}">${pack.name}</span>
  </div>
  <div class="${st2Class('pack-content')}" rel="actions"></div>
`;

const actionTmpl = (action) =>
`
  <div class="${st2Class('action-name')}">${action.ref}</div>
  <div class="${st2Class('action-description')}">${action.description}</div>
`;

class Palette {
  constructor() {
    const self = this;

    this.element = d3
      .select(st2Class(null, true))
      ;

    const packs = _.groupBy(ACTIONS, 'pack');

    this.packs = this.element
      .selectAll(st2Class('pack', true))
      .data(_.keys(packs), (pack) => pack)
      ;

    this.packs.enter()
      .append('div')
      .attr('class', st2Class('pack'))
      .html((name) => packTmpl({ name }))
      .each(function (pack) {
        this.actions = d3.select(this)
          .select('[rel=actions]')
          .selectAll(st2Class('action', true))
          .data(packs[pack])
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
      });
  }

  dragAction(element, event, action) {
    let dt = event.dataTransfer;

    dt.setData('actionPack', pack({ action }));
    dt.effectAllowed = 'copy';
  }

  collapse() {
    this.element
      .node()
      .classList
      .toggle(st2Class(null, 'hide'))
      ;
  }
}

module.exports = Palette;
