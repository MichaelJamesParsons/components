import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {CdkVirtualTableModule} from '@angular/cdk-experimental/virtual-table';
import {CdkVirtualTableExample} from './cdk-virtual-table-example';
import {CdkTableModule} from '@angular/cdk/table';
import {ScrollingModule} from '@angular/cdk/scrolling';
import {ScrollingModule as ExperimentalScrolling} from '@angular/cdk-experimental/scrolling'

export {
  CdkVirtualTableExample,
};

const EXAMPLES = [
  CdkVirtualTableExample,
];

@NgModule({
  imports: [
    CdkTableModule,
    CdkVirtualTableModule,
    CommonModule,
    ExperimentalScrolling,
    ScrollingModule,
  ],
  declarations: EXAMPLES,
  exports: EXAMPLES,
  entryComponents: EXAMPLES,
})
export class CdkVirtualTableExamplesModule {
}
