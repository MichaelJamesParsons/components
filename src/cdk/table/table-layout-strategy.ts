/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {InjectionToken} from '@angular/core';
import {CdkTable} from '@angular/cdk/table/table';

export type _TableLayout = DocumentFragment | null;

export interface _TableLayoutStrategy {
  getNativeLayout(table: CdkTable<any>): _TableLayout;
  getFlexLayout(table: CdkTable<any>): _TableLayout;
}

export const _TABLE_LAYOUT_STRATEGY =
    new InjectionToken<_TableLayoutStrategy>('_TableLayoutStrategy');
