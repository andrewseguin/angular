import { NgModule, Type } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { SharedModule } from '../../shared/shared.module';
import { CodeTabsComponent } from './code-tabs.component';
import { MatTabsModule } from '@angular/material';
import { CodeModule } from './code.module';
import { WithCustomElements } from '../element-registry';

@NgModule({
  imports: [ CommonModule, SharedModule, HttpClientModule, MatTabsModule, CodeModule ],
  declarations: [ CodeTabsComponent ],
  exports: [ CodeTabsComponent ],
  entryComponents: [ CodeTabsComponent ]
})
export class CodeTabsModule implements WithCustomElements {
  customElements: Type<any>[] = [ CodeTabsComponent ];
}
