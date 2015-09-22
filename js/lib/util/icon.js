import _ from 'lodash';
import { EventEmitter } from 'events';

import api from '../api';

class IconLoader extends EventEmitter {
  icons = {}

  constructor() {
    super();

    api.on('connect', (client) => this.load(client));
  }

  load(client) {
    return client.packs.list()
      .then((packs) => {
        this.icons = {};

        packs = _.filter(packs, (pack) => _.includes(pack.files, 'icon.png'));

        _.each(packs, (pack) => {
          this.icons[pack.name] = api.client.packFile.route(pack.name + '/icon.png');
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
