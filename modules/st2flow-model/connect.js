//@flow

import React, { Component } from 'react';
import EventEmitter from './event-emitter';

const models = {};
const emitter = new EventEmitter();

export function get(name: string) {
  return models[name];
}

export function subscribe(nameOrModel: string | Object, fn: Function) : Function | false {
  const model = typeof nameOrModel === 'string' ? models[nameOrModel] : nameOrModel;

  if (!model) {
    return false;
  }

  const callback = () => fn(model);

  model.on('change', callback);

  return () => {
    model.removeListener('change', callback);
  };
}

export function register(name: string, model: any) {
  models[name] = model;
  emitter.emit('register');
}

export function connect(transform: Function) {
  return (WrappedComponent: any) => {
    return class ModelWrapper extends Component<Object> {
      componentDidMount() {
        this.subscribe();
        emitter.on('register', this.resubscribe);
      }

      componentWillUnmount() {
        this.unsubscribe();
        emitter.removeListener('register', this.resubscribe);
      }

      _subs: Array<Function> = []

      subscribe() {
        const props = transform(models);
        for (const key of Object.keys(props)) {
          if (props[key] && props[key].on && props[key].removeListener) {
            const unsubFn = subscribe(props[key], this.update);
            if (unsubFn) {
              this._subs.push(unsubFn);
            }
          }
        }
      }

      unsubscribe() {
        this._subs.forEach(fn => fn());
        this._subs = [];
      }

      resubscribe = () => {
        this.unsubscribe();
        this.subscribe();
        this.forceUpdate();
      }

      update = () => {
        this.forceUpdate();
      }

      render() {
        const props = transform(models);
        return <WrappedComponent {...this.props} {...props} />;
      }
    };
  };
}
