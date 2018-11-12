//@flow

import React, { Component } from 'react';
import EventEmitter from './event-emitter';

const models = {};
const emitter = new EventEmitter();

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
            props[key].on('change', this.update);
            this._subs.push(() => props[key].removeListener('change', this.update));
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
