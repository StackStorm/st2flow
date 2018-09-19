const debug = require('debug')('stflow.perf');

performance.setResourceTimingBufferSize(150);

const perf = {
  start(name) {
    performance.mark(`${name}-start`);
  },

  stop(name) {
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);

    const measures = performance.getEntriesByName(name, 'measure');
    const dur = measures[measures.length - 1].duration;
    const average = measures.reduce((sum, m) => sum + m.duration, 0) / measures.length;

    debug(`${name} task took ${dur}ms and takes ${average}ms on average.`);
  }
}

module.exports = perf;
