/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {Observable} from 'rxjs/Observable';
import {ComponentFactory} from '@angular/core';

export interface NgElementStrategyEvent {
  name: string;
  value: any;
}

export interface NgElementStrategyBase<T> {
  events: Observable<NgElementStrategyEvent>;

  connect(element: HTMLElement): void;
  disconnect(): void;
  getInputValue(propName: string): any;
  setInputValue(propName: string, value: string): void;
}

export interface NgElementStrategyFactoryBase {
  create<T>(componentFactory: ComponentFactory<T>): NgElementStrategyBase<T>;
}
