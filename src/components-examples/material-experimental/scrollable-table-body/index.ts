import {NgModule} from '@angular/core';
import {
  CdkScrollableTableBodyModule,
} from '@angular/cdk-experimental/scrollable-table-body/scrollable-table-body-module';
import {
  MatScrollableTableBodyFlexExample,
} from './mat-scrollable-table-body-flex/mat-scrollable-table-body-flex-example';
import {
  MatScrollableTableBodyFlexStickyRowsExample,
} from './mat-scrollable-table-body-flex-sticky-rows/mat-scrollable-table-body-flex-sticky-rows-example';
import {MatTableModule} from '@angular/material/table';
import {MatButtonModule} from '@angular/material/button';
import {MatButtonToggleModule} from '@angular/material/button-toggle';

export {
  MatScrollableTableBodyFlexExample,
  MatScrollableTableBodyFlexStickyRowsExample,
};

const EXAMPLES = [
  MatScrollableTableBodyFlexExample,
  MatScrollableTableBodyFlexStickyRowsExample
];

@NgModule({
  imports: [
    CdkScrollableTableBodyModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatTableModule,
  ],
  declarations: EXAMPLES,
  exports: EXAMPLES,
  entryComponents: EXAMPLES,
})
export class MatScrollableTableBodyExamplesModule {
}
