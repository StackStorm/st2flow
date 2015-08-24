import { EventEmitter } from 'events';
import st2client from 'st2client';

class API extends EventEmitter {
  connect(server) {
    this.server = server;
    this.client = st2client(server);

    return this._auth(server).then(() => {
      this.emit('connect', this.client);
      return this.client;
    }).catch((err) => {
      this.emit('error', err);
      throw err;
    });
  }

  _auth(server) {
    if (server.auth) {
      return this.client.authenticate(server.auth.login, server.auth.password);
    } else {
      return new Promise((resolve) => resolve(this.client));
    }
  }
}

export default new API();
