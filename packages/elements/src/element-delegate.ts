/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {Observable} from 'rxjs/Observable';
import {Injector} from '@angular/core';
import {NgElementInput} from './ng-element-constructor';
import {ComponentFactory} from '@angular/core';

export interface NgElementDelegateEvent {
  name: string;
  value: any;
}

export interface NgElementDelegateBase<T> {
  events: Observable<NgElementDelegateEvent>;

  connect(): void;
  disconnect(): void;
  inputChanged(name: string, value: string): void;
}

export interface NgElementDelegateFactoryBase<T> {
  create(componentFactory: ComponentFactory<T>,
         inputs: NgElementInput[],
         injector: Injector): NgElementDelegateBase<T>;
}
