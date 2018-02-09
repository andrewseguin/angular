/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {ComponentFactory, EventEmitter, NgModuleFactory} from '@angular/core';

import {NgElementImpl, NgElementWithProps} from './ng-element';
import {camelToKebabCase} from './utils';


export interface NgElementConstructor<T, P> {
  readonly is: string;
  readonly observedAttributes: string[];

  new (): NgElementWithProps<T, P>;
}

export interface NgElementConstructorInternal<T, P> extends NgElementConstructor<T, P> {
  readonly onConnected: EventEmitter<NgElementWithProps<T, P>>;
  readonly onDisconnected: EventEmitter<NgElementWithProps<T, P>>;
}

type WithProperties<P> = {
  [property in keyof P]: P[property]
};

export function createNgElementConstructor<T, P>(
    componentFactory: ComponentFactory<T>,
    moduleFactory?: NgModuleFactory<any>): NgElementConstructorInternal<T, P> {
  const inputs = componentFactory.inputs.map(({propName, templateName}) => ({
                                               propName,
                                               attrName: camelToKebabCase(templateName),
                                             }));
  const outputs = componentFactory.outputs.map(({propName, templateName}) => ({
                                                 propName,
                                                 eventName: templateName,
                                               }));

  // Note: According to the spec, this needs to be an ES2015 class
  // (i.e. not transpiled to an ES5 constructor function).
  // TODO(gkalpak): Document that if you are using ES5 sources you need to include a polyfill (e.g.
  //                https://github.com/webcomponents/custom-elements/blob/32f043c3a/src/native-shim.js).
  class NgElementConstructorImpl extends NgElementImpl<T> {
    static readonly is = componentFactory.selector;
    static readonly observedAttributes = inputs.map(input => input.attrName);
    static readonly onConnected = new EventEmitter<NgElementWithProps<T, P>>();
    static readonly onDisconnected = new EventEmitter<NgElementWithProps<T, P>>();

    constructor() {
      super(componentFactory, inputs, outputs, moduleFactory);

      const ngElement = this as this & WithProperties<P>;
      this.onConnected.subscribe(() => NgElementConstructorImpl.onConnected.emit(ngElement));
      this.onDisconnected.subscribe(() => NgElementConstructorImpl.onDisconnected.emit(ngElement));
    }
  }

  inputs.forEach(({propName}) => {
    Object.defineProperty(NgElementConstructorImpl.prototype, propName, {
      get: function(this: NgElementImpl<any>) {
        console.log('Getting value')
        return this.getInputValue(propName);
      },
      set: function(this: NgElementImpl<any>, newValue: any) {
        console.log('Setting value')
        this.setInputValue(propName, newValue);
      },
      configurable: true,
      enumerable: true,
    });
  });

  return NgElementConstructorImpl as typeof NgElementConstructorImpl & {
    new (): NgElementConstructorImpl&WithProperties<P>;
  };
}
