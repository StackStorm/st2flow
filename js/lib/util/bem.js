import _ from 'lodash';

export const BEM = (prefix, block, el, mod) =>
  `${prefix ? prefix + '-' : ''}${block}${el ? '__' + el : ''}${_.isString(mod) ? '--' + mod : ''}`;

export default function bem(block) {
  return (element, modifier, selector) => {
    const isSelector = selector || modifier === true;
    return BEM(isSelector ? '.st2' : 'st2', block, element, modifier);
  };
}
