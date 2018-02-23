/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {
  Component,
  ComponentFactory,
  destroyPlatform,
  EventEmitter,
  Inject,
  Input,
  NgModule,
  Output
} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {platformBrowserDynamic} from '@angular/platform-browser-dynamic';

import {createNgElementConstructor, NgElementConstructor} from '../src/ng-element-constructor';
import {patchEnv, restoreEnv} from '../testing/index';
import {
  NgElementStrategyBase,
  NgElementStrategyEvent,
  NgElementStrategyFactoryBase
} from '../src/element-strategy';
import {Subject} from 'rxjs/Subject';
import {fakeAsync} from '@angular/core/testing';

type WithFooBar = {
  fooFoo: string,
  barBar: string
};

if(typeof customElements !== 'undefined') {
  describe('createNgElementConstructor', () => {
    let NgElementCtor: NgElementConstructor<WithFooBar>;
    let factory: ComponentFactory<TestComponent>;
    let strategy: TestStrategy;
    let strategyFactory: TestStrategyFactory;

    beforeAll(() => patchEnv());
    beforeAll(done => {
      destroyPlatform();
      platformBrowserDynamic()
        .bootstrapModule(TestModule)
        .then(ref => {
          factory = ref.componentFactoryResolver.resolveComponentFactory(TestComponent);
          strategyFactory = new TestStrategyFactory();
          strategy = strategyFactory.testStrategy;
          NgElementCtor = createNgElementConstructor(factory, {strategyFactory: strategyFactory});

          // The `@webcomponents/custom-elements/src/native-shim.js` polyfill allows us to create
          // new instances of the NgElement which extends HTMLElement, as long as we define it.
          customElements.define('test-element', NgElementCtor);
        })
        .then(done, done.fail);
    });

    afterAll(() => destroyPlatform());
    afterAll(() => restoreEnv());

    it('should use a default strategy for converting component inputs', () => {
      expect(NgElementCtor.observedAttributes).toEqual(['foo-foo', 'barbar']);
    });

    it('should send input values from attributes when connected', () => {
      const element = new NgElementCtor();
      element.setAttribute('foo-foo', 'value-foo-foo');
      element.setAttribute('barbar', 'value-barbar');
      element.connectedCallback();
      expect(strategy.connectedElement).toBe(element);

      expect(strategy.getInputValue('fooFoo')).toBe('value-foo-foo');
      expect(strategy.getInputValue('barBar')).toBe('value-barbar');
    });

    it('should listen to output events after connected', fakeAsync(() => {
      const element = new NgElementCtor();
      element.connectedCallback();

      let eventValue: any = null;
      element.addEventListener('some-event', (e: CustomEvent) => eventValue = e.detail);
      strategy.events.next({name: 'some-event', value: 'event-value'});

      expect(eventValue).toEqual('event-value');
    }));

    it('should not listen to output events after disconnected', fakeAsync(() => {
      const element = new NgElementCtor();
      element.connectedCallback();
      element.disconnectedCallback();
      expect(strategy.disconnectCalled).toBe(true);

      let eventValue: any = null;
      element.addEventListener('some-event', (e: CustomEvent) => eventValue = e.detail);
      strategy.events.next({name: 'some-event', value: 'event-value'});

      expect(eventValue).toEqual(null);
    }));

    it('should properly set getters/setters on the element', () => {
      const element = new NgElementCtor();
      element.fooFoo = 'foo-foo-value';
      element.barBar = 'barBar-value';

      expect(strategy.inputs.get('fooFoo')).toBe('foo-foo-value');
      expect(strategy.inputs.get('barBar')).toBe('barBar-value');
    });

    describe('with different attribute strategy', () => {
      let NgElementCtorWithChangedAttr: NgElementConstructor<WithFooBar>;
      let element: HTMLElement;

      beforeAll(() => {
        strategyFactory = new TestStrategyFactory();
        strategy = strategyFactory.testStrategy;
        NgElementCtorWithChangedAttr = createNgElementConstructor(factory, {
          strategyFactory: strategyFactory,
          getAttributeToPropertyInputs: () => {
            return new Map<string, string>([
              ['attr-1', 'prop1'],
              ['attr-2', 'prop2']
            ]);
          }
        });

        customElements.define('test-element-with-changed-attributes', NgElementCtorWithChangedAttr);
      });

      beforeEach(() => {
        element = new NgElementCtorWithChangedAttr();
      });

      it('should affect which attributes are watched', () => {
        expect(NgElementCtorWithChangedAttr.observedAttributes).toEqual(['attr-1', 'attr-2']);
      });

      it('should send attribute values as inputs when connected', () => {
        const element = new NgElementCtorWithChangedAttr();
        element.setAttribute('attr-1', 'value-1');
        element.setAttribute('attr-2', 'value-2');
        element.setAttribute('attr-3', 'value-3'); // Made-up attribute
        element.connectedCallback();

        expect(strategy.getInputValue('prop1')).toBe('value-1');
        expect(strategy.getInputValue('prop2')).toBe('value-2');
        expect(strategy.getInputValue('prop3')).not.toBe('value-3');
      });
    });
  });
}

// Helpers
@Component({
  selector: 'test-component',
  template: 'TestComponent|foo({{ fooFoo }})|bar({{ barBar }})',
})
class TestComponent {
  @Input() fooFoo: string = 'foo';
  @Input('barbar') barBar: string;

  @Output() bazBaz = new EventEmitter<boolean>();
  @Output('quxqux') quxQux = new EventEmitter<Object>();
}

@NgModule({
  imports: [BrowserModule],
  declarations: [TestComponent],
  entryComponents: [TestComponent],
})
class TestModule {
  ngDoBootstrap() {}
}

export class TestStrategy implements NgElementStrategyBase<any> {
  connectedElement: HTMLElement | null = null;
  disconnectCalled = false;
  inputs = new Map<string, any>();

  events = new Subject<NgElementStrategyEvent>();

  connect(element: HTMLElement): void {
    this.connectedElement = element;
  }

  disconnect(): void {
    this.disconnectCalled = true;
  }

  getInputValue(propName: string): any {
    return this.inputs.get(propName);
  }

  setInputValue(propName: string, value: string): void {
    this.inputs.set(propName, value);
  }
}

export class TestStrategyFactory implements NgElementStrategyFactoryBase {
  testStrategy = new TestStrategy();

  create(componentFactory: ComponentFactory<any>): NgElementStrategyBase<any> {
    return this.testStrategy;
  }
}
