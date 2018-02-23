/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {ComponentFactory} from '@angular/core';

import {camelToKebabCase, createCustomEvent} from './utils';
import {NgElementDelegateFactoryBase, NgElementDelegateBase} from './element-delegate';

/**
 * Class constructor based on an Angular Component to be used for custom element registration.
 *
 * @experimental
 */
export interface NgElementConstructor<P> {
  readonly observedAttributes: string[];
  new (): HTMLElement & WithProperties<P>;
}

/**
 * Additional type information that can be added to the NgElement class for properties added based
 * on the inputs and methods of the underlying component.
 */
export type WithProperties<P> = {
  [property in keyof P]: P[property]
};

/**
 * Initialization configuration for the NgElementConstructor. Provides the delegate factory
 * that produces a delegate for each instantiated element. Additionally, provides a function
 * that takes the component factory and provides a map of which attributes should be observed on
 * the element and which property they are associated with.
 *
 * @experimental
 */
export interface NgElementConfig<T> {
  delegateFactory: NgElementDelegateFactoryBase<T>;
  getAttributeToPropertyInputs?: (factory: ComponentFactory<any>) => Map<string, string>;
}

/**
 * Gets a map of element attributes that should be observed and provided to the delegate as
 * property inputs according to the component factory.
 */
export const defaultGetAttributeToPropertyInputs = (factory: ComponentFactory<any>) => {
  const observedAttributeInputs = new Map<string, string>();

  factory.inputs.forEach(({propName, templateName}) => {
    const attr = camelToKebabCase(templateName);
    observedAttributeInputs.set(attr, propName);
  });

  return observedAttributeInputs;
};

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
    componentFactory: ComponentFactory<T>, config: NgElementConfig<T>): NgElementConstructor<P> {
  // Take the component factory's inputs and use the config's `getAttributeToPropertyInputs` to
  // determine the set of attributes that should be watched and which properties they affect.
  const getAttributeToPropertyInputs: (factory: ComponentFactory<any>) => Map<string, string> =
      config.getAttributeToPropertyInputs || defaultGetAttributeToPropertyInputs;
  const attributeToPropertyInputs = getAttributeToPropertyInputs(componentFactory);

  class NgElement extends HTMLElement {
    static readonly observedAttributes = Array.from(attributeToPropertyInputs.keys());

    private delegate: NgElementDelegateBase<T>;

    constructor(delegateFactoryOverride: NgElementDelegateFactoryBase<T>) {
      super();

      // Use the constructor's delegate factory override if it is present, otherwise default to
      // the config's factory.
      const delegateFactory = delegateFactoryOverride || config.delegateFactory;
      this.delegate = delegateFactory.create(componentFactory);
    }

    attributeChangedCallback(
        attrName: string, oldValue: string|null, newValue: string, namespace?: string): void {
      const propName = attributeToPropertyInputs.get(attrName)!;
      this.delegate.setInputValue(propName, newValue);
    }

    connectedCallback(): void {
      // Take element attribute inputs and set them as inputs on the delegate
      attributeToPropertyInputs.forEach((propName, attrName) => {
        const value = this.getAttribute(attrName);
        if (value) {
          this.delegate.setInputValue(propName, value);
        }
      });

      this.delegate.connect(this);

      // Listen for events from the delegate and dispatch them as custom events
      this.delegate.events.subscribe(e => {
        const customEvent = createCustomEvent(this.ownerDocument, e.name, e.value);
        this.dispatchEvent(customEvent);
      });
    }

    disconnectedCallback(): void {
      this.delegate.disconnect();
    }
  }

  // Add getters and setters for each input defined on the Angular Component so that the input
  // changes can be known.
  componentFactory.inputs.forEach(({propName}) => {
    Object.defineProperty(NgElement.prototype, propName, {
      get: function() { return this.delegate.getInputValue(propName); },
      set: function(newValue: any) { this.delegate.setInputValue(propName, newValue); },
      configurable: true,
      enumerable: true,
    });
  });

  return (NgElement as any) as NgElementConstructor<P>;
}
