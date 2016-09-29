import _ from 'lodash';

// export const BEM = (prefix, block, el, mod) =>
//   `${prefix ? prefix + '-' : ''}${block}${el ? '__' + el : ''}${_.isString(mod) ? '--' + mod : ''}`;

export class BEM extends String {
  constructor(block, ...args) {
    super();

    this.prefix = 'st2';
    this.block = block;
    this.classlist = [];

    this.and(...args);
  }

  valueOf() {
    return _.map(this.classlist, (item) => {
      const { prefix, block, el, mod } = item;
      return `${prefix ? prefix + '-' : ''}${block}${el ? '__' + el : ''}${_.isString(mod) ? '--' + mod : ''}`;
    }).join(' ');
  }

  toString() {
    return this.valueOf();
  }

  and(el, mod, selector) {
    let { prefix } = this;
    const { block } = this;

    if (selector || mod === true) {
      prefix = '.' + prefix;
    }

    this.classlist.push({ prefix, block, el, mod });

    return this;
  }
}

export default function bem(block) {
  return (element, modifier, selector) => {
    return new BEM(block, element, modifier, selector);
  };
}
