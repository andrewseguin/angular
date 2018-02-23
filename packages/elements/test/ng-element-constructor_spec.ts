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
  NgElementStrategyBase, NgElementStrategyEvent,
  NgElementStrategyFactoryBase
} from '../src/element-strategy';
import {Subject} from 'rxjs/Subject';

type WithFooBar = {
  fooFoo: string,
  barBar: string
};

fdescribe('createNgElementConstructor', () => {
  let NgElementCtor: NgElementConstructor<WithFooBar>;
  let factory: ComponentFactory<TestComponent>;
  let strategyFactory: TestStrategyFactory;

  beforeAll(() => patchEnv());
  beforeAll(done => {
    destroyPlatform();
    platformBrowserDynamic()
        .bootstrapModule(TestModule)
        .then(ref => {
          factory = ref.componentFactoryResolver.resolveComponentFactory(TestComponent);
          strategyFactory = new TestStrategyFactory();
          NgElementCtor = createNgElementConstructor(factory, {strategyFactory: strategyFactory});
        })
        .then(done, done.fail);
  });

  afterAll(() => destroyPlatform());
  afterAll(() => restoreEnv());

  describe('observedAttributes', () => {
    it('should use a default strategy for converting component inputs', () => {
      expect(NgElementCtor.observedAttributes).toEqual(['foo-foo', 'barbar']);
    });

    it('should be able to override which attributes are watched', () => {
      const NgElementCtorWithChangedAttr = createNgElementConstructor(factory, {
        strategyFactory: strategyFactory,
        getAttributeToPropertyInputs: () => {
          return new Map<string, string>([
            ['attr-1', 'prop-1'],
            ['attr-2', 'prop-2']
          ]);
        }
      });

      expect(NgElementCtorWithChangedAttr.observedAttributes).toEqual(['attr-1', 'attr-2']);
    });
  });

  describe('connect', () => {
    it('should let the strategy know that it has connected', () => {
      const ngElement = new NgElementCtor();
    });
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
