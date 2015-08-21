import _ from 'lodash';
import st2client from 'st2client';

const ICON_URL = (server, packName, token) => {
  let url = `${server.protocol}://${server.host}${server.port ? ':' + server.port : ''}/`;

  url += `packs/views/file/${packName}/icon.png`;

  if (token) {
    url += `?x-auth-token=${token.token}`;
  }

  return url;
};

class IconLoader {
  icons = {}

  load(settings) {
    const api = st2client(settings);

    return (() => {
      if (settings.auth) {
        return api.authenticate(settings.auth.login, settings.auth.password);
      } else {
        return new Promise((resolve) => resolve());
      }
    })()
      .then(() => api.packs.list())
      .then((packs) => {
        const token = api.auth.token;

        this.icons = {};

        packs = _.filter(packs, (pack) => _.includes(pack.files, 'icon.png'));

        _.each(packs, (pack) => {
          _.assign(this.icons, _.zipObject([pack.name], [ICON_URL(settings, pack.name, token)]));
        });

        return this.icons;
      })
      .catch((e) => console.error(e))
      ;
  }
}

export default new IconLoader();
