'use strict';

const Sector = require('./sector');

class Definition {
  handler(type, spec) {
    return (line, lineNum, task) => {
      const match = spec.exec(line);
      if (match) {
        let [,_prefix,key,value] = match
          , coords = [lineNum, (_prefix+key).length, lineNum, (_prefix+key+value).length]
          ;

        if (task.isEmpty()) {
          if (task.starter === _prefix) {
            task.indent = ' '.repeat(_prefix.length);
          } else {
            task.starter += _prefix;
          }
        } else {
          task.indent = _prefix;
        }

        let sector = new Sector(...coords).setType(type);
        task.setProperty(type, value).setSector(type, sector);

        return true;
      }
    };
  }

  get spec() {
    return {};
  }

  get template() {
    return {};
  }

  parse() {
    throw new Error('Not implemented');
  }
}

module.exports = Definition;
