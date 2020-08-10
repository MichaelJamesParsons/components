/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {
  CDK_TABLE_TEMPLATE,
  CdkTable,
  CDK_TABLE,
  _CoalescedStyleScheduler,
  CdkNonVirtualTable,
} from '@angular/cdk/table';
import {ChangeDetectionStrategy, Component, Directive, ViewEncapsulation} from '@angular/core';
import {_DisposeViewRepeaterStrategy, _VIEW_REPEATER_STRATEGY} from '@angular/cdk/collections';

@Directive({
  selector: 'mat-table:not([virtualTable]), table[mat-table]:not([virtualTable])',
  providers: [
    {provide: _VIEW_REPEATER_STRATEGY, useClass: _DisposeViewRepeaterStrategy},
  ]
})
export class MatNonVirtualTable<T> extends CdkNonVirtualTable<T> {}

/**
 * Wrapper for the CdkTable with Material design styles.
 */
@Component({
  selector: 'mat-table, table[mat-table]',
  exportAs: 'matTable',
  template: CDK_TABLE_TEMPLATE,
  styleUrls: ['table.css'],
  host: {
    'class': 'mat-table',
  },
  providers: [
    {provide: CdkTable, useExisting: MatTable},
    {provide: CDK_TABLE, useExisting: MatTable},
    _CoalescedStyleScheduler,
  ],
  encapsulation: ViewEncapsulation.None,
  // See note on CdkTable for explanation on why this uses the default change detection strategy.
  // tslint:disable-next-line:validate-decorators
  changeDetection: ChangeDetectionStrategy.Default,
})
export class MatTable<T> extends CdkTable<T> {
  /** Overrides the sticky CSS class set by the `CdkTable`. */
  public stickyCssClass = 'mat-table-sticky';
}
