import { NgModule, Type } from '@angular/core';
import {CommonModule} from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { SharedModule } from '../../shared/shared.module';
import { ApiListComponent } from './api-list.component';
import { ApiService } from './api.service';
import { WithCustomElement } from '../element-registry';
import { Logger } from 'app/shared/logger.service';
import {LocationService} from 'app/shared/location.service';
import {GaService} from 'app/shared/ga.service';
import {windowProvider, WindowToken} from 'app/shared/window';

@NgModule({
  imports: [ CommonModule, SharedModule, HttpClientModule ],
  declarations: [ ApiListComponent ],
  entryComponents: [ ApiListComponent ],
  providers: [
    ApiService, Logger, LocationService, GaService,
    { provide: WindowToken, useFactory: windowProvider },
  ]
})
export class ApiListModule implements WithCustomElement {
  customElement: Type<any> = ApiListComponent;
}
