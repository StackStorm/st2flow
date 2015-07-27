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
  icon: 'palette',
  type: 'toggle',
  initial: true
}, {
  name: 'undo'
}, {
  name: 'redo'
}, {
  name: 'layout'
}, {
  name: 'meta',
  type: 'toggle',
  icon: 'code',
  initial: false
}, {
  name: 'collapse-editor',
  position: 'right',
  icon: 'code',
  type: 'toggle',
  initial: true
}];

class Controls extends EventEmitter {
  constructor() {
    super();

    const self = this;

    this.element = d3
      .select(st2Class(null, true))
      ;

    const positions = _.groupBy(controls, (c) => c.position || 'left');

    _.each(positions, (controls, position) => {
      const opts = _.map(controls, (d) => ({
              name: d.name,
              icon: d.icon || d.name,
              type: d.type || 'momentary',
              event: d.event || d.name,
              initial: d.initial || false,
              state: d.initial || false
            }))
          , buttons = this.element
              .append('div')
              .attr('class', `${st2Class(position)}`)
                .selectAll(st2Class('button'), true)
                .data(opts, e => e.name)
                ;

      buttons.enter()
        .append('div')
        .attr('class', d =>
          `${st2Class('button')} ${d.initial ? st2Class('button', 'active') : ''} ${st2Icon(d.icon)}`
        )
        .on('click', function (d) {
          switch(d.type) {
            case 'momentary':
              self.emit(d.event);
              break;
            case 'toggle':
              self.emit(d.event, d.state = !d.state);
              d3.select(this).classed(st2Class('button', 'active'), d.state);
              break;
          }
        })
        ;
    });
  }
}

module.exports = Controls;
