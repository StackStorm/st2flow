'use strict';

let _ = require('lodash');

const BEM = (prefix, block, el, mod) =>
  `${prefix ? prefix + '-' : ''}${block}${el ? '__' + el : ''}${_.isString(mod) ? '--' + mod : ''}`;

module.exports = (block) =>
  (element, modifier, selector) => {
    let isSelector = selector || modifier === true;
    return BEM(isSelector ? '.st2' : 'st2', block, element, modifier);
  };
