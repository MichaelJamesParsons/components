/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {NgModule} from '@angular/core';
import {CdkTableExamplesModule} from '@angular/components-examples/cdk/table';
import {CdkVirtualTableExamplesModule} from '@angular/components-examples/cdk-experimental/virtual-table';
import {TableExamplesModule} from '@angular/components-examples/material/table';
import {RouterModule} from '@angular/router';
import {TableDemo} from './table-demo';

@NgModule({
  imports: [
    CdkTableExamplesModule,
    CdkVirtualTableExamplesModule,
    TableExamplesModule,
    RouterModule.forChild([{path: '', component: TableDemo}]),
  ],
  declarations: [TableDemo],
})
export class TableDemoModule {
}
