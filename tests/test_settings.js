import { expect } from 'chai';

import { Settings } from '../js/lib/settings';

describe('Settings', () => {

  let settings;

  beforeEach(() => {
    global.window = {
      localStorage: {
        getItem: () => null,
        setItem: () => null
      }
    };

    settings = new Settings();
  });

  afterEach(() => {
    delete global.window;
  });

  describe('#load()', () => {
    it('should load saved settings', () => {
      window.localStorage.getItem = () => JSON.stringify({some: 'thing'});

      settings.load();

      expect(settings.settings).to.have.property('some', 'thing');
    });

    it('should have no settings if localStorage is empty', () => {
      settings.load();

      expect(settings.settings).to.be.empty;
    });

    it('should throw an error if localStorage value is malformed', () => {
      window.localStorage.getItem = () => 'not json';

      expect(settings.load.bind(settings)).to.throw(Error, 'Unable to parse the config');
    });

    it('should throw an error if revision does not exist', () => {
      window.localStorage.getItem = () => JSON.stringify({_rev: 'not exist'});
      settings.revisions = [];

      expect(settings.load.bind(settings)).to.throw(Error, `Settings revision doesn't exist`);
    });

    it('should throw an error if validation failed', () => {
      window.localStorage.getItem = () => JSON.stringify({_rev: 'broken'});
      settings.revisions = [{
        id: 'broken',
        schema: {
          _rev: {
            type: 'null'
          }
        }
      }];

      expect(settings.load.bind(settings)).to.throw(Error, `Validation failed.`);
    });

    it('should migrate the changes if localStorage does not contain the uttermost revision', () => {
      window.localStorage.getItem = () => JSON.stringify({_rev: 1});
      settings.revisions = [{
        id: 1,
        schema: {
          _rev: {
            type: 'number'
          }
        }
      }, {
        id: '2',
        schema: {
          _rev: {
            type: 'string'
          },
          nil: {
            type: 'null',
            required: true
          }
        },
        migration: (settings) => {
          settings._rev = '2';
          settings.nil = null;

          return settings;
        }
      }];

      settings.load();

      expect(settings.settings).to.have.property('_rev', '2');
      expect(settings.settings).to.have.property('nil', null);
    });

    it('should throw an error if validation failed after migration', () => {
      window.localStorage.getItem = () => JSON.stringify({_rev: 1});
      settings.revisions = [{
        id: 1,
        schema: {
          _rev: {
            type: 'number'
          }
        }
      }, {
        id: '2',
        schema: {
          _rev: {
            type: 'string'
          },
          nil: {
            type: 'null',
            required: true
          }
        },
        migration: (settings) => {
          settings._rev = '2';

          return settings;
        }
      }];

      expect(settings.load.bind(settings)).to.throw(Error, `Validation failed after migration.`);
    });

    it('should save successfully loaded settings as a fallback configuration', (ok) => {
      const doc = {_rev: 1};
      window.localStorage.getItem = () => JSON.stringify(doc);
      window.localStorage.setItem = (key, value) => {
        expect(value).to.be.equal(JSON.stringify(doc));
        ok();
      };
      settings.revisions = [{
        id: 1,
        schema: {
          _rev: {
            type: 'number'
          }
        }
      }];

      settings.load();

    });
  });

  describe('#get()', () => {

    it('should return setting value', () => {
      settings.settings = {
        'some': 'thing'
      };

      let result = settings.get('some');

      expect(result).to.be.equal('thing');
    });

  });

  describe('#set()', () => {

    it('should set setting value', () => {
      settings.set('a', 'b');

      expect(settings.settings).to.be.deep.equal({ a: 'b' });
    });

  });

});
