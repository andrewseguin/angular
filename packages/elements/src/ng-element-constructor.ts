/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {ComponentFactory} from '@angular/core';

import {camelToKebabCase, createCustomEvent} from './utils';
import {NgElementDelegateBase} from './ng-element-delegate';
import {NgElementDelegateFactoryBase} from '@angular/elements/src/element-delegate';

/**
 * Class constructor based on an Angular Component to be used for custom element registration.
 *
 * @experimental
 */
export interface NgElementConstructor<P> {
  readonly observedAttributes: string[];
  new (): NgElement & WithProperties<P>;
}

/**
 * Additional type information that can be added to the NgElement class for properties added based
 * on the inputs and methods of the underlying component.
 */
type WithProperties<P> = {
  [property in keyof P]: P[property]
};

/**
 * Represents an `NgElement` input.
 * Similar to a `ComponentFactory` input (`{propName: string, templateName: string}`),
 * except that `attrName` is derived by kebab-casing `templateName`.
 */
export interface NgElementInput {
  propName: string;
  attrName: string;
}

/**
 * Initialization configuration for the NgElementConstructor.
 *
 * @experimental
 */
export interface NgElementConfig {
  delegateFactory: NgElementDelegateFactoryBase<T>;
}

/**
 * @whatItDoes Creates a custom element class based on an Angular Component. Takes a configuration
 * that provides initialization information to the created class. E.g. the configuration's injector
 * will be the initial injector set on the class which will be used for each created instance.
 *
 * @description Builds a class that encapsulates the functionality of the provided component and
 * uses the config's information to provide more context to the class. Takes the component factory's
 * inputs and outputs to convert them to the proper custom element API and add hooks to input
 * changes. Passes the config's injector to each created instance (may be overriden with the
 * static property to affect all newly created instances, or as a constructor argument for
 * one-off creations).
 *
 * @experimental
 */
export function createNgElementConstructor<T, P>(
    componentFactory: ComponentFactory<T>, config: NgElementConfig): NgElementConstructor<T, P> {
  // Convert input templateName properties to kebab-case attribute names and rename as `attrName`
  const inputs = componentFactory.inputs.map(({propName, templateName}) => ({
    propName,
    attrName: camelToKebabCase(templateName),
  }));

  // Note: According to the spec, this needs to be an ES2015 class
  // (i.e. not transpiled to an ES5 constructor function).
  // TODO(gkalpak): Document that if you are using ES5 sources you need to include a polyfill (e.g.
  //                https://github.com/webcomponents/custom-elements/blob/32f043c3a/src/native-shim.js).
  class NgElement extends HTMLElement {
    static readonly observedAttributes = inputs.map(input => input.attrName);

    private delegate: NgElementDelegateBase<T>;

    constructor(delegateFactoryOverride: NgElementDelegateBase<T>) {
      super();

      const delegateFactory = delegateFactoryOverride || config.delegateFactory;
      this.delegate = delegateFactory.create(componentFactory, inputs);
      this.delegate.events.subscribe(e => {
        const customEvent = createCustomEvent(this.ownerDocument, e.name, e.value);
        this.dispatchEvent(customEvent);
      });
    }

    attributeChangedCallback(
        name: string, oldValue: string|null, newValue: string, namespace?: string): void {
      const input = this.inputs.find(input => input.attrName === name) !;
      this.delegate.setInputValue(input.propName, newValue);
    }

    connectedCallback(): void {
      this.delegate.connect(this);
    }

    disconnectedCallback(): void {
      this.delegate.disconnect();
    }
  }

  // Add getters and setters for each input defined on the Angular Component so that the input
  // changes can be known.
  componentFactory.inputs.forEach(({propName}) => {
    Object.defineProperty(NgElement.prototype, propName, {
      get: function(this: NgElement<any>) {
        return this.delegate.getInputValue(propName);
      },
      set: function(this: NgElement<any>, newValue: any) {
        this.delegate.setInputValue(propName, newValue);
      },
      configurable: true,
      enumerable: true,
    });
  });

  return NgElement as NgElementConstructor<P>;
}
