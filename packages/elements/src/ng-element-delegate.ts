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
import {extractProjectableNodes} from './extract-projectable-nodes';
import {
  NgElementDelegateBase, NgElementDelegateEvent,
  NgElementDelegateFactoryBase
} from './element-delegate';
import {Observable} from 'rxjs/Observable';
import {merge} from 'rxjs/observable/merge';
import {map} from 'rxjs/operator/map';

/** Time in milliseconds to wait before destroying the component ref when disconnected. */
const DESTROY_DELAY = 10;

/**
 * Factory that creates new NgElementDelegate instances with the delegate factory's injector.
 * Each new delegate is created with the provided component factory which will create its
 * components on connect.
 *
 * @experimental
 */
export class NgElementDelegateFactory<T> implements NgElementDelegateFactoryBase<T> {
  constructor(private injector: Injector) { }

  create(componentFactory: ComponentFactory<T>) {
    return new NgElementDelegate<T>(componentFactory, this.injector);
  }
}

/**
 * Creates and destroys a component ref and handles its change detection in response to input
 * changes.
 *
 * @experimental
 */
export class NgElementDelegate<T> implements NgElementDelegateBase<T> {
  /** Merged stream of the component's output events. */
  events: Observable<NgElementDelegateEvent>;

  /** Reference to the component that was created on connect. */
  private componentRef: ComponentRef<T>;

  /** Callback function that when called will cancel a scheduled destruction on the component. */
  private onDestroyCancellationFn: (() => void) | null = null;

  /** Changes that have been made to the component ref since the last time onChanges was called. */
  private inputChanges: SimpleChanges | null = null;

  /** Whether the created component implements the onChanges function. */
  private implementsOnChanges = false;

  /** Whether a change detection has been scheduled to run on the component. */
  private changeDetectionScheduled = false;

  /** Initial input values that were set before the component was created. */
  private readonly initialInputValues = new Map<string, any>();

  /** Set of inputs that were not initially set when the component was created. */
  private readonly uninitializedInputs = new Set<string>();

  constructor(private componentFactory: ComponentFactory<T>, private injector: Injector) { }

  /**
   * Initializes a new component if one has not yet been created and cancels any scheduled
   * destruction.
   */
  connect(element: HTMLElement) {
    // If the element is marked to be destroyed, cancel the task since the component was reconnected
    if (this.onDestroyCancellationFn !== null) {
      this.onDestroyCancellationFn();
      this.onDestroyCancellationFn = null;
      return;
    }

    if (!this.componentRef) {
      this.initializeComponent(element);
    }
  }

  /**
   * Schedules the component to be destroyed after some small delay in case the element is just
   * being moved across the DOM.
   */
  disconnect() {
    // Return if there is no componentRef or the component is already scheduled for destruction
    if (!this.componentRef || this.onDestroyCancellationFn !== null) {
      return;
    }

    // Schedule the component to be destroyed after a small timeout in case it is being
    // moved elsewhere in the DOM
    this.onDestroyCancellationFn = scheduler.schedule(() => {
      this.componentRef !.destroy();
    }, DESTROY_DELAY);
  }

  /**
   * Returns the component property value. If the component has not yet been created, the value is
   * retrieved from the cached initialization values.
   */
  getInputValue(propName: string): any {
    if (!this.componentRef) {
      return this.initialInputValues.get(propName);
    }

    return (this.componentRef.instance as any)[propName];
  }

  /**
   * Sets the input value for the property. If the component has not yet been created, the value is
   * cached and set when the component is created.
   */
  setInputValue(propName: string, newValue: any): void {
    if (!this.componentRef) {
      this.initialInputValues.set(propName, newValue);
      return;
    }

    // If there is no actual change (old and new values are the same), do not record change
    // and mark as dirty.
    if (strictEquals(newValue, this.getInputValue(propName))) {
      return;
    }

    this.recordInputChange(propName, newValue);
    (this.componentRef.instance as any)[propName] = newValue;
    this.scheduleDetectChanges();
  }

  /** Calls ngOnChanges with all the inputs that have changed since the last call. */
  protected callNgOnChanges(): void {
    if (!this.implementsOnChanges || this.inputChanges === null) {
      return;
    }

    const inputChanges = this.inputChanges;
    this.inputChanges = null;
    (this.componentRef !.instance as any as OnChanges).ngOnChanges(inputChanges);
  }

  /**
   * Schedules change detection to run on the component.
   * Ignores subsequent calls if already scheduled.
   */
  protected scheduleDetectChanges(): void {
    // Do not schedule change detection if it is already pending to run
    if (this.changeDetectionScheduled) {
      return;
    }

    scheduler.scheduleBeforeRender(() => this.detectChanges());
    this.changeDetectionScheduled = true;
  }

  /** Set any stored initial inputs on the component's properties. */
  protected initializeInputs(): void {
    this.componentFactory.inputs.forEach(({propName}) => {
      const initialValue = this.initialInputValues.get(propName);
      if (initialValue) {
        this.setInputValue(propName, initialValue);
      } else {
        this.uninitializedInputs.add(propName);
      }
    });

    this.initialInputValues.clear();
  }

  /** Sets up listeners for the component's outputs so that the events stream emits the events. */
  protected initializeOutputs(): void {
    const eventEmitters = this.componentFactory.outputs.map(({propName, templateName}) => {
      const emitter = (this.componentRef !.instance as any)[propName] as EventEmitter<any>;
      return map.call(emitter, (value: any) => ({name: templateName, value}));
    });

    this.events = merge(...eventEmitters);
  }

  /**
   * Creates a new component through the component factory with the provided element host and
   * sets up its initial inputs, listens for outputs changes, and runs an initial change detection.
   */
  protected initializeComponent(element: HTMLElement) {
    const childInjector = Injector.create({providers: [], parent: this.injector});
    const projectableNodes =
        extractProjectableNodes(element, this.componentFactory.ngContentSelectors);
    this.componentRef = this.componentFactory.create(childInjector, projectableNodes, element);

    this.implementsOnChanges =
      isFunction((this.componentRef.instance as any as OnChanges).ngOnChanges);

    this.initializeInputs();
    this.initializeOutputs();

    this.detectChanges();

    const applicationRef = this.injector.get<ApplicationRef>(ApplicationRef);
    applicationRef.attachView(this.componentRef.hostView);
  }

  /**
   * Records input changes so that the component receives SimpleChanges in its onChanges function.
   */
  protected recordInputChange(propName: string, currentValue: any): void {
    // Do not record the change if the component does not implement `OnChanges`.
    if (!this.componentRef || !this.implementsOnChanges) {
      return;
    }

    if (this.inputChanges === null) {
      this.inputChanges = {};
    }

    // If there already is a change, modify the current value to match but leave the values for
    // previousValue and isFirstChange.
    const pendingChange = this.inputChanges[propName];
    if (pendingChange) {
      pendingChange.currentValue = currentValue;
      return;
    }

    const isFirstChange = this.uninitializedInputs.has(propName);
    this.uninitializedInputs.delete(propName);

    const previousValue = isFirstChange ? undefined : this.getInputValue(propName);
    this.inputChanges[propName] = new SimpleChange(previousValue, currentValue, isFirstChange);
  }

  /** Runs change detection on the component. */
  protected detectChanges(): void {
    if (!this.componentRef) {
      return;
    }

    this.changeDetectionScheduled = false;
    this.callNgOnChanges();
    this.componentRef !.changeDetectorRef.detectChanges();
  }

}
