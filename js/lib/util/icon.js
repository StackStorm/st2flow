import _ from 'lodash';
import { EventEmitter } from 'events';

import api from '../api';

const ICON_URL = (server, packName, token={}) => {
  let url = `${server.protocol}://${server.host}${server.port ? ':' + server.port : ''}/`;

  url += `packs/views/file/${packName}/icon.png`;

  if (token.token) {
    url += `?x-auth-token=${token.token}`;
  }

  return url;
};

class IconLoader extends EventEmitter {
  icons = {}

  constructor() {
    super();

    api.on('connect', (client) => this.load(client));
  }

  load(client) {
    return client.packs.list()
      .then((packs) => {
        const token = client.token;

        this.icons = {};

        packs = _.filter(packs, (pack) => _.includes(pack.files, 'icon.png'));

        _.each(packs, (pack) => {
          _.assign(this.icons, _.zipObject([pack.name], [ICON_URL(api.server, pack.name, token)]));
        });

        return this.icons;
      })
      .then((icons) => {
        this.emit('loaded', icons);

        return icons;
      })
      .catch((e) => console.error(e))
      ;
  }
}

export default new IconLoader();
