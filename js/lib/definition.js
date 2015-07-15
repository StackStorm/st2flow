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

        // Ace Editor updates syncroniously and goes through 'remove' and 'insert' stages on
        // 'replace', so at some point, task with such name might not exist and it might interrupt
        // the change in the middle of the process.
        if (!task) {
          return;
        }

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

  block(type, spec) {
    const enter = (line, lineNum, state) => {
      const indent = line.match(this.spec.WS_INDENT)[0].length + 1;

      if (!state[type] && spec.test(line)) {
        state[type] = indent;

        return true;
      }
    };

    const exit = (line, lineNum, state) => {
      const indent = line.match(this.spec.WS_INDENT)[0].length + 1;

      if (state[type] && state[type] >= indent) {
        state[type] = false;

        return true;
      }
    };

    return {
      enter,
      exit
    };
  }

  get spec() {
    return {
      WS_INDENT: /^(\s*)/,
      EMPTY_LINE: /^(\W*)$/,
    };
  }

  get template() {
    return {};
  }

  parse() {
    throw new Error('Not implemented');
  }
}

module.exports = Definition;
