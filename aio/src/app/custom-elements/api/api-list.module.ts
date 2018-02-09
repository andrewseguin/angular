import {ApplicationModule, EventEmitter, NgModule, NgZone, Type} from '@angular/core';
import {CommonModule, Location, LocationStrategy, LocationChangeListener} from '@angular/common';
import {HttpClientModule} from '@angular/common/http';
import {SharedModule} from '../../shared/shared.module';
import {ApiListComponent} from './api-list.component';
import {ApiService} from './api.service';
import {WithCustomElement} from '../element-registry';
import {Logger} from 'app/shared/logger.service';
import {LocationService} from 'app/shared/location.service';
import {GaService} from 'app/shared/ga.service';
import {windowProvider, WindowToken} from 'app/shared/window'; 
import {SwUpdatesModule} from 'app/sw-updates/sw-updates.module';


export class CopiedNoopNgZone implements NgZone {
  // Adapted renderer: it creates a Renderer2 instance and adapts it to Renderer3
  // TODO: remove once this code is in angular/angular
  readonly hasPendingMicrotasks: boolean = false;
  readonly hasPendingMacrotasks: boolean = false;
  readonly isStable: boolean = true;
  readonly onUnstable: EventEmitter<any> = new EventEmitter();
  readonly onMicrotaskEmpty: EventEmitter<any> = new EventEmitter();
  readonly onStable: EventEmitter<any> = new EventEmitter();
  readonly onError: EventEmitter<any> = new EventEmitter();

  run(fn: () => any): any { return fn(); }

  runGuarded(fn: () => any): any { return fn(); }

  runOutsideAngular(fn: () => any): any { return fn(); }

  runTask<T>(fn: () => any): T { return fn(); }
}

export class FakeLocationStrategy extends LocationStrategy {
  path(includeHash?: boolean | undefined): string {
    return '';
  }
  prepareExternalUrl(internal: string): string {
    return '';
  }
  pushState(state: any, title: string, url: string, queryParams: string): void {
  }
  replaceState(state: any, title: string, url: string, queryParams: string): void {
  }
  forward(): void {
  }
  back(): void {
  }
  onPopState(fn: LocationChangeListener): void { }

  getBaseHref(): string {
    return '';
  }

}

@NgModule({
  declarations: [ ApiListComponent ],
  entryComponents: [ ApiListComponent ],
  imports: [
    ApplicationModule,
    CommonModule,
    SharedModule,
    HttpClientModule,
    SwUpdatesModule,
  ],
  providers: [
    { provide: NgZone, useClass: CopiedNoopNgZone },
    ApiService,
    Logger,
    LocationService,
    Location,
    { provide: LocationStrategy, useClass: FakeLocationStrategy },
    GaService,
    { provide: WindowToken, useFactory: windowProvider },
  ]
})
export class ApiListModule implements WithCustomElement {
  customElement: Type<any> = ApiListComponent;
}
