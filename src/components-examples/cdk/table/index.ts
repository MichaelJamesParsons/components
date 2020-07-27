import {CdkTableModule} from '@angular/cdk/table';
import {NgModule} from '@angular/core';
import {CdkTableBasicFlexExample} from './cdk-table-basic-flex/cdk-table-basic-flex-example';
import {CdkTableBasicExample} from './cdk-table-basic/cdk-table-basic-example';
import {CdkTableFixedColumnWidthsExample} from './cdk-table-fixed-column-widths/cdk-table-fixed-column-widths-example';

export {
  CdkTableBasicExample,
  CdkTableBasicFlexExample,
  CdkTableFixedColumnWidthsExample,
};

const EXAMPLES = [
  CdkTableBasicExample,
  CdkTableBasicFlexExample,
  CdkTableFixedColumnWidthsExample,
];

@NgModule({
  imports: [
    CdkTableModule,
  ],
  declarations: EXAMPLES,
  exports: EXAMPLES,
  entryComponents: EXAMPLES,
})
export class CdkTableExamplesModule {
}
