import { NgModule, Type } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { SharedModule } from '../../shared/shared.module';
import { EmbeddedStackblitzComponent, LiveExampleComponent } from './live-example.component';
import { WithCustomElements } from '../element-registry';

@NgModule({
  imports: [ CommonModule, SharedModule, HttpClientModule ],
  declarations: [ LiveExampleComponent, EmbeddedStackblitzComponent ],
  entryComponents: [ LiveExampleComponent, EmbeddedStackblitzComponent ]
})
export class LiveExampleModule implements WithCustomElements {
  customElements: Type<any>[] = [ LiveExampleComponent ];
}
