import _ from 'lodash';
import st2client from 'st2client';

const ICON_URL = (server, packName) => {
  let url = `${server.protocol}://${server.host}${server.port ? ':' + server.port : ''}/`;

  url += `packs/views/file/${packName}/icon.png`;

  return url;
};

class IconLoader {
  icons = {}

  load(settings) {
    const client = st2client(settings);

    return client.packs.list()
      .then((packs) => {
        this.icons = {};

        packs = _.filter(packs, (pack) => _.includes(pack.files, 'icon.png'));

        _.each(packs, (pack) => {
          _.assign(this.icons, _.zipObject([pack.name], [ICON_URL(settings, pack.name)]));
        });

        return this.icons;
      })
      .catch((e) => console.error(e))
      ;
  }
}

export default new IconLoader();
