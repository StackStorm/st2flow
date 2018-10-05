import debugModule from 'debug';

const IS_NODE = typeof process === 'object' && Object.prototype.toString.call(process) === '[object process]';
const debug = debugModule('st2flow.perf');

let perf = {
  start() {},
  stop() {},
};

if(!IS_NODE) {
  performance.setResourceTimingBufferSize(150);

  perf = {
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
    },
  };
}

export default perf;
