import _ from 'lodash';
import { EventEmitter } from 'events';
import st2client from 'st2client';
import URI from 'URIjs';

export class API extends EventEmitter {
  connect(source={}, login, password) {
    const api = new URI.parse(source.api || '')
        , auth = source.auth && new URI.parse(source.auth)
        ;

    if (api.port && !api.hostname) {
      api.hostname = window.location.hostname;
    }

    this.server = {
      protocol: api.protocol,
      host: api.hostname,
      port: api.port,
      prefix: api.path
    };

    if (auth) {
      if (auth.port && !auth.hostname) {
        auth.hostname = window.location.hostname;
      }

      this.server.auth = {
        protocol: auth.protocol,
        host: auth.hostname,
        port: auth.port,
        prefix: auth.path
      };
    }

    if (!_.isEmpty(source.token)) {
      this.server.token = source.token;
    }

    this.client = st2client(this.server);

    return this._auth(this.server, login, password).then(() => {
      this.emit('connect', this.client);
      return this.client;
    }).catch((err) => {
      this.emit('error', err);
      throw err;
    });
  }

  _auth(server, login, password) {
    if (server.auth && login && password) {
      return this.client.authenticate(login, password);
    } else {
      return new Promise((resolve) => resolve(this.client));
    }
  }
}

export default new API();
