/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {VIRTUAL_SCROLL_STRATEGY, VirtualScrollStrategy} from './virtual-scroll-strategy';
import {CdkVirtualScrollViewport} from './virtual-scroll-viewport';
import {Observable, Subject} from 'rxjs';
import {distinctUntilChanged} from 'rxjs/operators';
import {Directive, forwardRef, Input, OnChanges, SimpleChanges} from '@angular/core';
import {coerceNumberProperty} from '@angular/cdk/coercion';

interface ItemPosition {
  /** The offset of the item relative to the top of the scroll viewport. */
  offsetFromTop: number;
  /**
   * The size of an item. In vertically oriented viewports, this is the item height. In horizontal
   * viewports, this is the item width.
   */
  size: number;
}

export type ItemSizeFactory = (index: number) => number;

export class VariableSizeVirtualScrollStrategy implements VirtualScrollStrategy {
  private readonly _itemPositions: Array<ItemPosition> = [];

  private readonly _scrolledIndexChange = new Subject<number>();

  /** @docs-private Implemented as part of VirtualScrollStrategy. */
  scrolledIndexChange: Observable<number> = this._scrolledIndexChange.pipe(distinctUntilChanged());

  /** The attached viewport. */
  private _viewport: CdkVirtualScrollViewport|null = null;

  constructor(
      private _minBufferPx: number,
      private _maxBufferPx: number,
      private _itemSizeFactory: ItemSizeFactory) {
  }

  updateItemSizeFactoryAndBuffers(factory: ItemSizeFactory, minBuffer: number, maxBuffer: number) {
    this._itemSizeFactory = factory;
    this._minBufferPx = minBuffer;
    this._maxBufferPx = maxBuffer;
    this.updateItemSizes();
    this._updateTotalContentSize();
    this._updateRenderedRange();
  }

  updateItemSize(index: number) {
    this.updateItemSizes(index);
    this._updateTotalContentSize();
    this._updateRenderedRange();
  }

  /**
   * Attaches this scroll strategy to a viewport.
   * @param viewport The viewport to attach this strategy to.
   */
  attach(viewport: CdkVirtualScrollViewport) {
    this._viewport = viewport;
    this.updateItemSizes();
    this._updateTotalContentSize();
    this._updateRenderedRange();
  }

  /** Detaches this scroll strategy from the currently attached viewport. */
  detach() {
    this._scrolledIndexChange.complete();
    this._viewport = null;
  }

  /** @docs-private Implemented as part of VirtualScrollStrategy. */
  onContentRendered() { /* no-op */
  }

  /** @docs-private Implemented as part of VirtualScrollStrategy. */
  onContentScrolled() {
    this._updateRenderedRange();
  }

  /** @docs-private Implemented as part of VirtualScrollStrategy. */
  onDataLengthChanged() {
    this.updateItemSizes();
    this._updateTotalContentSize();
    this._updateRenderedRange();
  }

  /** @docs-private Implemented as part of VirtualScrollStrategy. */
  onRenderedOffsetChanged() { /* no-op */}

  /**
   * Scroll to the offset for the given index.
   * @param index The index of the element to scroll to.
   * @param behavior The ScrollBehavior to use when scrolling.
   */
  scrollToIndex(index: number, behavior: ScrollBehavior) {
    if (this._viewport && !!this._getItemPosition(index)) {
      this._viewport.scrollToOffset(this._getItemPosition(index).offsetFromTop, behavior);
    }
  }

  private _getItemPosition(index: number) {
    return this._itemPositions[index];
  }

  private updateItemSizes(startIndex = 0) {
    if (!this._viewport) {
      return;
    }

    for (let i = 0; i < this._viewport.getDataLength(); i++) {
      this._itemPositions[i] = {
        size: this._itemSizeFactory(i),
        offsetFromTop: this._getEndOfItemOffset(i - 1),
      };
    }
  }

  private coerceItemPosition(itemPosition: ItemPosition|undefined): ItemPosition {
    return itemPosition || {size: 0, offsetFromTop: 0};
  }

  private _getStartIndex(index: number, offset: number, defaultIndex: number) {
    const visibleIndex = this._getItemIndexAtIntersection(offset, defaultIndex);
    const minIndex = this._getItemIndexAtIntersection(this._getItemPosition(visibleIndex).offsetFromTop - this._minBufferPx, defaultIndex);
    const maxIndex = this._getItemIndexAtIntersection(
        this._getItemPosition(visibleIndex).offsetFromTop - this._maxBufferPx, defaultIndex);
    return (index > minIndex || index < maxIndex) ? maxIndex : index;
  }

  private _getEndIndex(index: number, offset: number, defaultIndex: number) {
    const visibleIndex = this._getItemIndexAtIntersection(offset, defaultIndex);
    const minIndex = this._getItemIndexAtIntersection(this._getItemPosition(visibleIndex).offsetFromTop + this._minBufferPx, defaultIndex);
    const maxIndex = this._getItemIndexAtIntersection(
        this._getItemPosition(visibleIndex).offsetFromTop + this._maxBufferPx, defaultIndex);
    return (index < minIndex || index > maxIndex) ? maxIndex : index;
  }

  private _updateTotalContentSize() {
    if (!this._viewport) {
      return;
    }

    this._viewport.setTotalContentSize(
        this._getEndOfItemOffset(this._viewport.getDataLength() - 1));
  }

  private _updateRenderedRange() {
    if (!this._viewport) {
      return;
    }

    const viewportSize = this._viewport.getViewportSize();
    const scrollOffset = this._viewport.measureScrollOffset();
    const newRange = {...this._viewport.getRenderedRange()};
    const visibleStartIndex = this._getItemIndexAtIntersection(scrollOffset, 0);

    newRange.start = this._getStartIndex(newRange.start, scrollOffset, 0);
    newRange.end = this._getEndIndex(newRange.end, scrollOffset + viewportSize, this._viewport.getDataLength() - 1);

    this._viewport.setRenderedRange(newRange);
    this._viewport.setRenderedContentOffset(this._getItemPosition(newRange.start).offsetFromTop);
    this._scrolledIndexChange.next(visibleStartIndex);
  }

  private _getEndOfItemOffset(index: number) {
    const item = this.coerceItemPosition(this._getItemPosition(index));
    return item.size + item.offsetFromTop;
  }

  private _getItemIndexAtIntersection(scrollPosition: number, defaultValue: number): number {
    for (let i = 0; i < this._viewport!.getDataLength(); i++) {
      if (this._getItemPosition(i).offsetFromTop <= scrollPosition && this._getEndOfItemOffset(
          i) > scrollPosition) {
        return i;
      }
    }
    return defaultValue;
  }
}


export function _variableSizeVirtualScrollStrategy(variableSizeDir: CdkVariableSizeVirtualScroll) {
  return variableSizeDir._scrollStrategy;
}


@Directive({
  selector: 'cdk-virtual-scroll-viewport[variableSize]',
  exportAs: 'cdkVariableVirtualScroll',
  providers: [
    {
      provide: VIRTUAL_SCROLL_STRATEGY,
      useFactory: _variableSizeVirtualScrollStrategy,
      deps: [forwardRef(() => CdkVariableSizeVirtualScroll)],
    }
  ]
})
export class CdkVariableSizeVirtualScroll implements OnChanges {
  @Input('variableSize')
  get itemSizeFactory(): ItemSizeFactory {
    return this._itemSizeFactory;
  }
  set itemSizeFactory(factory: ItemSizeFactory) {
    this._itemSizeFactory = factory;
  }
  private _itemSizeFactory: ItemSizeFactory = () => 10;

  /**
   * The minimum amount of buffer rendered beyond the viewport (in pixels).
   * If the amount of buffer dips below this number, more items will be rendered. Defaults to 100px.
   */
  @Input()
  get minBufferPx(): number { return this._minBufferPx; }
  set minBufferPx(value: number) { this._minBufferPx = coerceNumberProperty(value); }
  _minBufferPx = 100;

  /**
   * The number of pixels worth of buffer to render for when rendering new items. Defaults to 200px.
   */
  @Input()
  get maxBufferPx(): number { return this._maxBufferPx; }
  set maxBufferPx(value: number) { this._maxBufferPx = coerceNumberProperty(value); }
  _maxBufferPx = 200;

  _scrollStrategy =
      new VariableSizeVirtualScrollStrategy(this.minBufferPx, this.maxBufferPx, this.itemSizeFactory);

  ngOnChanges(changes: SimpleChanges) {
    this._scrollStrategy.updateItemSizeFactoryAndBuffers(
        this.itemSizeFactory, this.minBufferPx, this.maxBufferPx);
  }

  markItemSizeDirty(index: number) {
    this._scrollStrategy.updateItemSize(index);
  }
}
