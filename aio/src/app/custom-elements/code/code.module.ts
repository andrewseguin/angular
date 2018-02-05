import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { SharedModule } from '../../shared/shared.module';
import { CodeComponent } from './code.component';
import { MatSnackBarModule } from '@angular/material';
import { PrettyPrinter } from './pretty-printer.service';
import { CopierService } from 'app/shared/copier.service';

@NgModule({
  imports: [ CommonModule, SharedModule, HttpClientModule, MatSnackBarModule ],
  declarations: [ CodeComponent ],
  entryComponents: [ CodeComponent ],
  exports: [ CodeComponent ],
  providers: [ PrettyPrinter, CopierService ]
})
export class CodeModule { }
