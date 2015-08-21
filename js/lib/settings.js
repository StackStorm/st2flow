import _ from 'lodash';
import revalidator from 'revalidator';

const KEY = 'st2flow__settings'
    , FALLBACK_KEY = 'st2flow__settings--fallback'
    ;

export class Settings {
  revisions = [{
    id: 'pre-1',
    schema: {
      _rev: {
        type: 'string'
      },
      source: {
        type: 'object',
        properties: {
          protocol: {
            type: 'string',
            enum: ['http', 'https']
          },
          host: {
            type: 'string'
          },
          port: {
            type: 'number'
          },
          auth: {
            type: 'object',
            properties: {
              protocol: {
                type: 'string',
                enum: ['http', 'https']
              },
              host: {
                type: 'string'
              },
              port: {
                type: 'number'
              },
              login: {
                type: 'string'
              },
              password: {
                type: 'string'
              }
            }
          }
        }
      }
    },
    additionalProperties: false
  }];

  constructor() {
    try {
      this.load();
    } catch (e) {
      console.error(e);
      this.loadFallback();
    }
  }

  load() {
    let settings = () => {
      try {
        return JSON.parse(window.localStorage.getItem(KEY)) || {};
      } catch (e) {
        throw new Error(`Unable to parse the config. Error: ${e}`);
      }
    }();

    if (settings._rev) {
      const revision = _.find(this.revisions, { id: settings._rev })
          , latest = _.last(this.revisions)
          ;

      if (!revision) {
        throw new Error(`Settings revision doesn't exist. ID: ${settings._rev}`);
      }

      const report = revalidator.validate(settings, {
        properties: revision.schema,
        additionalProperties: revision.additionalProperties
      });
      if (!report.valid) {
        const error = _.map(report.errors, (error) =>
          `'${error.property}' ${error.message}`
        ).join(', ');
        throw new Error(`Validation failed. Errors: ${error}`);
      }

      if (revision !== latest) { // eslint-disable-line no-empty
        const index = _.indexOf(this.revisions, revision)
            , diff = _.slice(this.revisions, index + 1)
            ;

        _.each(diff, (revision) => {
          if (revision.migration) {
            settings = revision.migration(settings);
          } else {
            settings._rev = revision.id;
          }
        });

        const report = revalidator.validate(settings, {properties: latest.schema});
        if (!report.valid) {
          const error = _.map(report.errors, (error) =>
            `'${error.property}' ${error.message}`
          ).join(', ');
          throw new Error(`Validation failed after migration. Errors: ${error}`);
        }
      }
    }

    this.settings = settings;

    this.saveFallback();

    return this;
  }

  loadFallback() {
    this.settings = () => {
      try {
        return JSON.parse(window.localStorage.getItem(FALLBACK_KEY)) || {};
      } catch (e) {
        throw new Error(`Unable to parse the fallback config. Error: ${e}`);
      }
    }();

    return this;
  }

  save() {
    const settings = this.settings;

    settings._rev = _.last(this.revisions).id;

    window.localStorage.setItem(KEY, JSON.stringify(settings));
  }

  saveFallback() {
    window.localStorage.setItem(FALLBACK_KEY, JSON.stringify(this.settings));
  }

  get(name) {
    return this.settings[name];
  }

  set(name, value) {
    this.settings[name] = value;

    return this;
  }
}

// Avoid throwing exception in environement where `window` is not available
export default () => {
  try {
    return new Settings();
  } catch (e) {
    console.error(e);
  }
}();
