import { NgModule, Type } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { SharedModule } from '../../shared/shared.module';
import { CurrentLocationComponent } from './current-location.component';
import { WithCustomElements } from '../element-registry';

@NgModule({
  imports: [ CommonModule, SharedModule, HttpClientModule ],
  declarations: [ CurrentLocationComponent ],
  entryComponents: [ CurrentLocationComponent ]
})
export class CurrentLocationModule implements WithCustomElements {
  customElements: Type<any>[] = [ CurrentLocationComponent ];
}
