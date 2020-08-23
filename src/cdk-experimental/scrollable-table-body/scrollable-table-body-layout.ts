/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {Directive, Inject, Injectable, Input} from '@angular/core';
import {CdkTable} from '@angular/cdk/table/table';
import {DOCUMENT} from '@angular/common';
import {
  _TABLE_LAYOUT_STRATEGY,
  _TableLayout,
  _TableLayoutStrategy
} from '@angular/cdk/table/table-layout-strategy';

@Injectable()
export class ScrollableTableBodyLayoutStrategy implements _TableLayoutStrategy {
  private _pendingMaxHeight = '';
  private _scrollViewport?: HTMLElement;
  readonly headerCssClass = 'cdk-table-scrollable-table-header';
  readonly bodyCssClass = 'cdk-table-scrollable-table-body';
  readonly footerCssClass = 'cdk-table-scrollable-table-footer';

  constructor(@Inject(DOCUMENT) private readonly _document: any) {
  }

  getNativeLayout(table: CdkTable<unknown>): _TableLayout {
    return null;
  }

  getFlexLayout(table: CdkTable<unknown>): _TableLayout {
    const documentFragment = this._document.createDocumentFragment();
    const sections = [
      {selector: this.headerCssClass, outlets: [table._headerRowOutlet]},
      {selector: this.bodyCssClass, outlets: [table._rowOutlet, table._noDataRowOutlet]},
      {selector: this.footerCssClass, outlets: [table._footerRowOutlet]},
    ];

    for (const section of sections) {
      const element = this._document.createElement('div');
      element.classList.add(section.selector);
      for (const outlet of section.outlets) {
        element.appendChild(outlet.elementRef.nativeElement);
      }

      documentFragment.appendChild(element);
    }

    this._scrollViewport = documentFragment.querySelector(`.${this.bodyCssClass}`);
    this._scrollViewport!.style.overflow = 'auto';
    this.applyMaxHeight(this._scrollViewport!, this._pendingMaxHeight);

    return documentFragment;
  }

  setMaxHeight(v: string) {
    this._pendingMaxHeight = v;
    if (this._scrollViewport) {
      this.applyMaxHeight(this._scrollViewport, v);
    }
  }

  private applyMaxHeight(el: HTMLElement, maxHeight: string) {
    el.style.maxHeight = maxHeight;
  }
}

@Directive({
  selector: '[scrollableBody]',
  providers: [
    {provide: _TABLE_LAYOUT_STRATEGY, useClass: ScrollableTableBodyLayoutStrategy},
  ]
})
export class CdkScrollableTableBody {
  @Input('scrollableBody')
  get maxHeight() {
    return this._maxHeight;
  }
  set maxHeight(v: string) {
    this._maxHeight = v;
    this._layoutStrategy.setMaxHeight(v);
  }
  private _maxHeight = '';

  constructor(@Inject(_TABLE_LAYOUT_STRATEGY)
              private readonly _layoutStrategy: ScrollableTableBodyLayoutStrategy) {
  }
}
