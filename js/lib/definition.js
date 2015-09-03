import Sector from './models/sector';

export default class Definition {
  handler(type, spec, parser) {
    return (line, lineNum, state) => {
      const task = state.currentTask;
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

        if (parser) {
          value = parser(value);
        }

        let sector = new Sector(...coords).setType(type);
        task.setProperty(type, value).setSector(type, sector);

        if (task.isEmpty()) {
          if (task.starter === _prefix) {
            task.indent = state.unit.repeat(_prefix.length);
          } else {
            task.starter += _prefix;
          }
        } else {
          task.indent = _prefix;
        }

        return match;
      }
    };
  }

  block(type, spec) {
    const enter = (line, lineNum, state) => {
      const match = spec.exec(line);

      if (!state[type] && match) {
        const [,_prefix] = match;

        state[type] = _prefix.length + 1;

        return match;
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
      EMPTY_LINE: /^(\W*)$/
    };
  }

  get template() {
    return {};
  }

  parse() {
    throw new Error('Not implemented');
  }
}
