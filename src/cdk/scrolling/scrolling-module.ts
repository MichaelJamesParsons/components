/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {BidiModule} from '@angular/cdk/bidi';
import {PlatformModule} from '@angular/cdk/platform';
import {NgModule} from '@angular/core';
import {CdkFixedSizeVirtualScroll} from './fixed-size-virtual-scroll';
import {CdkScrollable} from './scrollable';
import {CdkVirtualForOf} from './virtual-for-of';
import {CdkVirtualScrollViewport} from './virtual-scroll-viewport';
import {CdkVariableSizeVirtualScroll} from './variable-size-virtual-scroll';

@NgModule({
  exports: [CdkScrollable],
  declarations: [CdkScrollable]
})
export class CdkScrollableModule {}

/**
 * @docs-primary-export
 */
@NgModule({
  imports: [
    BidiModule,
    PlatformModule,
    CdkScrollableModule
  ],
  exports: [
    BidiModule,
    CdkScrollableModule,
    CdkFixedSizeVirtualScroll,
    CdkVariableSizeVirtualScroll,
    CdkVirtualForOf,
    CdkVirtualScrollViewport,
  ],
  declarations: [
    CdkFixedSizeVirtualScroll,
    CdkVariableSizeVirtualScroll,
    CdkVirtualForOf,
    CdkVirtualScrollViewport,
  ],
})
export class ScrollingModule {}
