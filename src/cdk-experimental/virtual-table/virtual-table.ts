/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {ChangeDetectionStrategy, Component, OnInit, ViewEncapsulation} from '@angular/core';
import {CDK_TABLE_TEMPLATE, CdkTable, CDK_TABLE} from '@angular/cdk/table';
import {RecycleViewRepeaterStrategy, VIEW_REPEATER_STRATEGY} from '@angular/cdk/view';


/**
 * A virtual scroll enabled CDK table.
 */
@Component({
  selector: 'cdk-virtual-table, table[cdk-virtual-table]',
  exportAs: 'cdkVirtualTable',
  template: CDK_TABLE_TEMPLATE,
  host: {
    'class': 'cdk-table cdk-virtual-table',
  },
  providers: [
    {provide: VIEW_REPEATER_STRATEGY, useClass: RecycleViewRepeaterStrategy},
    {provide: CdkTable, useExisting: CdkVirtualTable},
    {provide: CDK_TABLE, useExisting: CdkVirtualTable},
  ],
  encapsulation: ViewEncapsulation.None,
  // See note on CdkTable for explanation on why this uses the default change detection strategy.
  // tslint:disable-next-line:validate-decorators
  changeDetection: ChangeDetectionStrategy.Default,
})
export class CdkVirtualTable<T> extends CdkTable<T> {

}
