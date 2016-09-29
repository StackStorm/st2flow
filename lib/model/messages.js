import { EventEmitter } from 'events';

export default class Messages extends EventEmitter {
  messages = []

  add(message) {
    this.messages.push(message);

    this.emit('change', this.messages);
  }

  clear() {
    this.messages = [];

    this.emit('change', this.messages);
  }
}
