'use strict';

const _ = require('lodash')
    , d3 = require('d3')
    , bem = require('./bem')
    , EventEmitter = require('events').EventEmitter
    ;

const st2Class = bem('controls')
    , st2Icon = bem('icon')
    ;

const controls = [{
  name: 'collapse-palette',
  icon: 'palette'
}, {
  name: 'undo'
}, {
  name: 'redo'
}, {
  name: 'layout'
}, {
  name: 'collapse-editor',
  position: 'right',
  icon: 'code'
}];

class Controls extends EventEmitter {
  constructor() {
    super();

    this.element = d3
      .select(st2Class(null, true))
      ;

    const positions = _.groupBy(controls, (c) => c.position || 'left');

    _.each(positions, (controls, position) => {
      const buttons = this.element
        .append('div')
        .attr('class', `${st2Class(position)}`)
          .selectAll(st2Class('button'), true)
          .data(controls, e => e.name)
          ;

      buttons.enter()
        .append('div')
        .attr('class', d => `${st2Class('button')} ${st2Icon(d.icon || d.name)}`)
        .on('click', control => this.emit(control.name))
        ;
    });
  }
}

module.exports = Controls;
