import { NgModule, Type } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { SharedModule } from '../../shared/shared.module';
import { FileNotFoundSearchComponent } from './file-not-found-search.component';
import { WithCustomElements } from '../element-registry';

@NgModule({
  imports: [ CommonModule, SharedModule, HttpClientModule ],
  declarations: [ FileNotFoundSearchComponent ],
  entryComponents: [ FileNotFoundSearchComponent ]
})
export class FileNotFoundSearchModule implements WithCustomElements {
  customElements: Type<any>[] = [ FileNotFoundSearchComponent ];
}
