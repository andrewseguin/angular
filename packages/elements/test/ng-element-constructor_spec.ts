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
  NgElementDelegateBase, NgElementDelegateEvent,
  NgElementDelegateFactoryBase
} from '../src/element-delegate';
import {Subject} from 'rxjs/Subject';

type WithFooBar = {
  fooFoo: string,
  barBar: string
};

fdescribe('createNgElementConstructor', () => {
  let NgElementCtor: NgElementConstructor<WithFooBar>;
  let delegateFactory: TestDelegateFactory;

  beforeAll(() => patchEnv());
  beforeAll(done => {
    destroyPlatform();
    platformBrowserDynamic()
        .bootstrapModule(TestModule)
        .then(ref => {
          const factory = ref.componentFactoryResolver.resolveComponentFactory(TestComponent);
          delegateFactory = new TestDelegateFactory();
          NgElementCtor = createNgElementConstructor(factory, {delegateFactory});

          // The `@webcomponents/custom-elements/src/native-shim.js` polyfill, that we use to
          // enable ES2015 classes transpiled to ES5 constructor functions to be used as Custom
          // Elements in tests, only works if the elements have been registered with
          // `customElements.define()`.
          customElements.define(factory.selector, NgElementCtor);
          return customElements.whenDefined(factory.selector);
        })
        .then(done, done.fail);
  });

  afterAll(() => destroyPlatform());
  afterAll(() => restoreEnv());

  it ('should work', () => {
    expect(true).toBe(false);
  });
});

// Helpers
@Component({
  selector: 'test-component',
  template: 'TestComponent|foo({{ fooFoo }})|bar({{ barBar }})',
})
class TestComponent {
  @Input() fooFoo: string = 'foo';
  @Input('barbar') barBar: string;

  @Output() bazBaz = new EventEmitter<boolean>();
  @Output('quxqux') quxQux = new EventEmitter<object>();

  constructor(@Inject('TEST_VALUE') public testValue: string) {}
}

@NgModule({
  imports: [BrowserModule],
  providers: [
    {provide: 'TEST_VALUE', useValue: 'TEST'},
  ],
  declarations: [TestComponent],
  entryComponents: [TestComponent],
})
class TestModule {
  ngDoBootstrap() {}
}

export class TestDelegate implements NgElementDelegateBase<any> {
  connectedElement: HTMLElement | null = null;
  disconnectCalled = false;
  inputs = new Map<string, any>();

  events = new Subject<NgElementDelegateEvent>();

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

export class TestDelegateFactory implements NgElementDelegateFactoryBase<any> {
  testDelegate = new TestDelegate();

  create(componentFactory: ComponentFactory<any>): NgElementDelegateBase<any> {
    return this.testDelegate;
  }
}
