// @flow

import type { GenericError } from './interfaces';
import EventEmitter3 from 'eventemitter3';

type EventName = string;

const EMIT_DELAY = 50; // ms

/**
 * This EventEmitter class extends the base event emitter functionality
 * by storing/caching a stack of events whenever there are no registered event
 * listeners for the particular event. As soon as the first event listener
 * is registered, the stack is flushed to that listener.
 *
 * Also, some components may emit events during construction (eg. invalid YAML),
 * so we delay the event emission to prevent state changes during render.
 */
class EventEmitter extends EventEmitter3 {
  stack: { [EventName]: Array<any> } = {};

  on(event: EventName, listener: Function): EventEmitter {
    console.log('REGISTERING', event);
    super.on.call(this, event, listener);

    if(this.stack[event] && this.stack[event].length) {
      this.stack[event] = this.stack[event].filter(eventData => {
        this.emit(event, eventData);
        return false; // empty the stack
      });
    }

    return this;
  }

  emit(event: EventName, ...data: Array<any>): EventEmitter {
    console.log('EMITTING', event);
    const eventData = data.reduce((arr, d) => {
      const data = typeof d === 'string' ? new Error(d) : d;
      arr.push(data)
      return arr;
    }, []);

    if(this.listenerCount(event) === 0) {
      console.log('STACKING', event, eventData);
      if(!this.stack[event]) {
        this.stack[event] = [];
      }

      this.stack[event].push(...eventData);
    }

    // In case events are emitted during a sub-component's construction,
    // we delay the event so that state changes don't happen during render.
    // const err = new Error('Emitting ' + event);
    setTimeout(() => {
      console.log('EMITTING', event);
      super.emit.call(this, event, eventData), EMIT_DELAY
    });

    return this;
  }
}

export default EventEmitter;
