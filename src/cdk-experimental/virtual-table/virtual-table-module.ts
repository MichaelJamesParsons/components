/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {NgModule} from '@angular/core';
import {CdkVirtualTable} from './virtual-table';
import {CdkTableModule} from '@angular/cdk/table';


@NgModule({
  declarations: [CdkVirtualTable],
  exports: [CdkVirtualTable],
  imports: [
    CdkTableModule,
  ]
})
export class CdkVirtualTableModule {}
