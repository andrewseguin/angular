/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {
  ApplicationRef,
  ComponentFactory,
  ComponentRef,
  EventEmitter,
  Injector,
  NgZone,
  OnChanges,
  SimpleChange,
  SimpleChanges
} from '@angular/core';
import {isFunction, scheduler, strictEquals} from './utils';
import {Subscription} from 'rxjs/Subscription';
import {extractProjectableNodes} from './extract-projectable-nodes';
import {Subject} from 'rxjs/Subject';
import {NgElementInput, NgElementOutput} from './ng-element-constructor';
import {
  NgElementDelegateBase,
  NgElementDelegateEvent,
  NgElementDelegateFactoryBase
} from './element-delegate';

const DESTROY_DELAY = 10;

export class NgElementDelegateFactory extends NgElementDelegateFactoryBase<T> {
  injector: Injector;

  create(componentFactory: ComponentFactory<T>, inputs: NgElementInput[]) {
    return new NgElementDelegate<T>(componentFactory, inputs, injector);
  }
}

export class NgElementDelegate<T> extends NgElementDelegateBase<T> {
  events = new Subject<NgElementDelegateEvent>();

  private componentRef: ComponentRef<T>;
  private onDestroyCancellationFn: (() => void)|null = null;

  private applicationRef = this.injector.get<ApplicationRef>(ApplicationRef);
  private ngZone = this.injector.get<NgZone>(NgZone);

  private readonly initialInputValues = new Map<string, any>();
  private readonly uninitializedInputs = new Set<string>();
  private readonly outputSubscriptions = new Map<string, Subscription>();

  private inputChanges: SimpleChanges|null = null;
  private implementsOnChanges = false;
  private changeDetectionScheduled = false;

  constructor(
      private componentFactory: ComponentFactory<T>,
      private readonly inputs: NgElementInput[],
      private injector: Injector) {
  }

  connect(element: HTMLElement) {
    // If the element is marked to be destroyed, cancel the task since the component was reconnected
    if (this.onDestroyCancellationFn !== null) {
      this.onDestroyCancellationFn();
      this.onDestroyCancellationFn = null;
      return;
    }

    // If this element has already been initialized, there is no need to re-initialize it.
    if (!this.componentRef) {
      this.initialize(element);
    }
  }

  disconnect() {
    this.scheduleDestruction();
  }

  getInputValue(propName: string): any {
    if (!this.componentRef) {
      return this.initialInputValues.get(propName);
    }

    return (this.componentRef.instance as any)[propName];
  }

  setInputValue(propName: string, newValue: any): void {
    if (!this.componentRef) {
      this.initialInputValues.set(propName, newValue);
      return;
    }

    if (!strictEquals(newValue, this.getInputValue(propName))) {
      this.recordInputChange(propName, newValue);
      (this.componentRef.instance as any)[propName] = newValue;
      this.markDirty();
    }
  }

  // TODO(andrewjs): Make this private; change tests so that they perform real actions on the
  // NgElement that would cause this to be called.
  /* private */ detectChanges(): void {
    if (!this.componentRef) { return; }

    this.ngZone.run(() => {
      this.changeDetectionScheduled = false;

      this.callNgOnChanges();
      this.componentRef !.changeDetectorRef.detectChanges();
    });
  }

  private callNgOnChanges(): void {
    if (this.implementsOnChanges && this.inputChanges !== null) {
      const inputChanges = this.inputChanges;
      this.inputChanges = null;
      (this.componentRef !.instance as any as OnChanges).ngOnChanges(inputChanges);
    }
  }

  private markDirty(): void {
    if (!this.changeDetectionScheduled) {
      this.changeDetectionScheduled = true;
      scheduler.scheduleBeforeRender(() => this.detectChanges());
    }
  }

  /**
   * Perform one-time initialization for this element. Includes creating the component, ini
   * inputs/outputs, Creates and initializes the component for this element. */
  private initialize(element: HTMLElement) {
    this.ngZone.run(() => {
      this.componentRef = this.createComponent(element);
      this.implementsOnChanges =
        isFunction((this.componentRef.instance as any as OnChanges).ngOnChanges);

      this.initializeInputs(element);
      this.initializeOutputs();
      this.detectChanges();

      this.applicationRef.attachView(this.componentRef.hostView);
    });
  }

  initializeInputs(element: HTMLElement): void {
    this.inputs.forEach(({propName, attrName}) => {
      let initialValue;

      if (this.initialInputValues.has(propName)) {
        // The property has already been set (prior to initialization).
        // Update the component instance.
        initialValue = this.initialInputValues.get(propName);
      } else if (element.hasAttribute(attrName)) {
        // A matching attribute exists.
        // Update the component instance.
        initialValue = element.getAttribute(attrName);
      } else {
        // The property does not have an initial value.
        this.uninitializedInputs.add(propName);
      }

      if (!this.uninitializedInputs.has(propName)) {
        // The property does have an initial value.
        // Forward it to the component instance.
        this.setInputValue(propName, initialValue);
      }
    });

    this.initialInputValues.clear();
  }

  private initializeOutputs(): void {
    this.componentFactory.outputs.forEach(output => this.subscribeToOutput(output));
  }

  private createComponent(element: HTMLElement): ComponentRef<T> {
    const childInjector = Injector.create({providers: [], parent: this.injector});
    const projectableNodes =
        extractProjectableNodes(element, this.componentFactory.ngContentSelectors);
    return this.componentFactory.create(childInjector, projectableNodes, this);
  }

  /**
   * Schedules the component to be destroyed after some small delay in case the element is just
   * being moved across the DOM.
   */
  private scheduleDestruction() {
    // Return if there is no componentRef or the component is already scheduled for destruction
    if (!this.componentRef || this.onDestroyCancellationFn !== null) { return; }

    // Schedule the component to be destroyed after a small timeout in case it is being
    // moved elsewhere in the DOM
    this.onDestroyCancellationFn = scheduler.schedule(() => {
      this.ngZone.run(() => {
        this.componentRef !.destroy();
        this.outputSubscriptions.forEach(subscription => subscription.unsubscribe());
        this.outputSubscriptions.clear();
      });
    }, DESTROY_DELAY);
  }

  private recordInputChange(propName: string, currentValue: any): void {
    if (!this.implementsOnChanges) {
      // The component does not implement `OnChanges`. Ignore the change.
      return;
    }

    if (this.inputChanges === null) {
      this.inputChanges = {};
    }

    const pendingChange = this.inputChanges[propName];

    if (pendingChange) {
      pendingChange.currentValue = currentValue;
      return;
    }

    const isFirstChange = this.uninitializedInputs.has(propName);
    const previousValue = isFirstChange ? undefined : this.getInputValue(propName);
    this.inputChanges[propName] = new SimpleChange(previousValue, currentValue, isFirstChange);

    if (isFirstChange) {
      this.uninitializedInputs.delete(propName);
    }
  }

  /** Subscribes to the component's output event emitter and emits its events. */
  private subscribeToOutput(propName: string, templateName: string): void {
    const emitter = (this.componentRef !.instance as any)[propName] as EventEmitter<any>;

    const subscription = emitter.subscribe((value: any) => {
      this.events.next({name: templateName, value});
    });

    this.outputSubscriptions.set(propName, subscription);
  }
}
