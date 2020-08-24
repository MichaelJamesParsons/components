/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {Directive, ElementRef, Inject, Injectable, Input} from '@angular/core';
import {CdkTable} from '@angular/cdk/table/table';
import {DOCUMENT} from '@angular/common';
import {
  _TABLE_LAYOUT_STRATEGY,
  _TableLayout,
  _TableLayoutStrategy
} from '@angular/cdk/table/table-layout-strategy';

declare class ResizeObserver {
  constructor(callback: ResizeObserverCallback);
  disconnect: () => void;
  observe: (target: Element, options?: ResizeObserverObserveOptions) => void;
  unobserve: (target: Element) => void;
}

interface ResizeObserverObserveOptions {
  box?: "content-box" | "border-box";
}

type ResizeObserverCallback = (
    entries: ResizeObserverEntry[],
    observer: ResizeObserver,
) => void;

interface ResizeObserverEntry {
  readonly borderBoxSize: ResizeObserverEntryBoxSize;
  readonly contentBoxSize: ResizeObserverEntryBoxSize;
  readonly contentRect: DOMRectReadOnly;
  readonly target: Element;
}

interface ResizeObserverEntryBoxSize {
  blockSize: number;
  inlineSize: number;
}

interface Window {
  ResizeObserver: typeof ResizeObserver;
}



@Injectable()
export class _ScrollableTableBodyLayoutStrategy implements _TableLayoutStrategy {
  private readonly parentElement: HTMLElement;
  private _pendingMaxHeight = '';
  private _pendingMinWidth = '';
  private _pendingContentHeight = 0;
  private _bodyScrollWrapper?: HTMLElement;
  private _bodyWrapper?: HTMLElement;
  private readonly resize: ResizeObserver;
  readonly headerCssClass = 'cdk-table-scrollable-table-header';
  readonly bodyCssClass = 'cdk-table-scrollable-table-body';
  readonly footerCssClass = 'cdk-table-scrollable-table-footer';
  readonly horizontalViewportCssClass = 'cdk-table-horizontal-viewport';

  constructor(
      private readonly elementRef: ElementRef,
      @Inject(DOCUMENT) private readonly _document: any) {
    this.parentElement = this.elementRef.nativeElement.parentElement;
    console.log('parent:', this.parentElement);
    this.resize = new ResizeObserver((entries) => {
      console.log(entries);

     /*if (this._verticalViewport) {
        this._verticalViewport.style.width = `${entries[0].contentRect.width}px`;
      }*/
    });
    this.resize.observe(this.parentElement);
  }

  getNativeLayout(table: CdkTable<unknown>): _TableLayout {
    return null;
  }

  getFlexLayout(table: CdkTable<unknown>): _TableLayout {
    const documentFragment = this._document.createDocumentFragment();

    const headersWrapper = this._document.createElement('div');
    headersWrapper.classList.add(this.headerCssClass);
    headersWrapper.appendChild(table._headerRowOutlet.elementRef.nativeElement);
    documentFragment.appendChild(headersWrapper);

    const bodyScrollWrapper = this._document.createElement('div');
    documentFragment.appendChild(bodyScrollWrapper);

    const bodyWrapper = this._document.createElement('div');
    bodyWrapper.classList.add(this.bodyCssClass);
    bodyWrapper.appendChild(table._rowOutlet.elementRef.nativeElement);
    bodyWrapper.appendChild(table._noDataRowOutlet.elementRef.nativeElement);
    bodyScrollWrapper.appendChild(bodyWrapper);

    const footersWrapper = this._document.createElement('div');
    footersWrapper.classList.add(this.footerCssClass);
    footersWrapper.appendChild(table._footerRowOutlet.elementRef.nativeElement);
    documentFragment.appendChild(footersWrapper);

    this._bodyWrapper = bodyWrapper;
    this._bodyScrollWrapper = bodyScrollWrapper;
    this.setMaxHeight(this._pendingMaxHeight);
    this.setMinWidth(this._pendingMinWidth);
    this.setContentHeight(this._pendingContentHeight);

    return documentFragment;
  }

  setMaxHeight(v: string) {
    this._pendingMaxHeight = v;
    if (this._bodyWrapper) {
      this._bodyWrapper.style.maxHeight = v;
    }
  }

  setMinWidth(v: string) {
    this._pendingMinWidth = v;
    if (this._bodyWrapper) {
      this._bodyWrapper.style.minWidth = v;
    }
  }

  setContentHeight(v: number) {
    this._pendingContentHeight = v;
    if (this._bodyScrollWrapper && this._bodyWrapper) {
      this._bodyScrollWrapper.style.height = `${v}px`;
      this._bodyWrapper.style.height = `${v}px`;
    }
  }
}

@Directive({
  selector: '[scrollableBody]',
  providers: [
    {provide: _TABLE_LAYOUT_STRATEGY, useClass: _ScrollableTableBodyLayoutStrategy},
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

  @Input()
  get minWidth() {
    return this._minWidth;
  }
  set minWidth(v: string) {
    this._minWidth = v;
    this._layoutStrategy.setMinWidth(v);
  }
  private _minWidth = '';

  constructor(@Inject(_TABLE_LAYOUT_STRATEGY)
              private readonly _layoutStrategy: _ScrollableTableBodyLayoutStrategy) {
    // FIXME for testing. Remove before submit.
    this._layoutStrategy.setContentHeight(1000);
  }
}
