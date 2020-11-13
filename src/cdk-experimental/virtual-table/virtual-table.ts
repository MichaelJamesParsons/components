/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

/**
 * FIXME DO NOT SUBMIT Document API changes:
 *
 * - `_isNativeHtmlTable` is now protected.
 * - `_switchDataSource` is now protected.
 * - `_dataSource` is now protected.
 */

import {Attribute, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, EmbeddedViewRef, Inject, Input, IterableDiffers, NgZone, OnDestroy, Optional, SkipSelf, ViewEncapsulation} from '@angular/core';
import {isDataSource, ListRange} from '@angular/cdk/collections';
import {CDK_TABLE_TEMPLATE, CdkTable, CDK_TABLE, DataSource, RowOutlet, RenderRow, RowContext} from '@angular/cdk/table';
import {
  DisposeViewRepeaterStrategy,
  RecycleViewRepeaterStrategy,
  VIEW_REPEATER_STRATEGY,
  ViewRepeater
} from '@angular/cdk/view';
import {isObservable, Observable, of as observableOf, Subject, Subscription} from 'rxjs';
import {shareReplay, switchMap} from 'rxjs/operators';
import {CdkVirtualForOfContext, CdkVirtualScrollViewport, VIRTUAL_SCROLL_STRATEGY, VirtualScrollStrategy} from '@angular/cdk/scrolling';
import {Directionality} from '@angular/cdk/bidi';
import {DOCUMENT} from '@angular/common';
import {Platform} from '@angular/cdk/platform';
import {VirtualDataSource} from '@angular/cdk-experimental/virtual-table/virtual-data-source';


/**
 * Union of the types that can be set as the data source for a `CdkTable`.
 * @docs-private
 */
type CdkTableDataSourceInput<T> =
    DataSource<T>|Observable<ReadonlyArray<T>|T[]>|ReadonlyArray<T>|T[];

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
    {provide: CdkTable, useExisting: CdkVirtualTable},
    {provide: CDK_TABLE, useExisting: CdkVirtualTable},
    {provide: VIEW_REPEATER_STRATEGY, useClass: RecycleViewRepeaterStrategy},
  ],
  encapsulation: ViewEncapsulation.None,
  // See note on CdkTable for explanation on why this uses the default change detection strategy.
  // tslint:disable-next-line:validate-decorators
  changeDetection: ChangeDetectionStrategy.Default,
})
export class CdkVirtualTable<T> extends CdkTable<T> implements OnDestroy {
  /** The currently rendered range of indices. */
  private _renderedRange: ListRange;

  /** Subject that emits when a new DataSource instance is given. */
  private _dataSourceChanges = new Subject<CdkTableDataSourceInput<T>>();

  /**
   * A map of a header row's index and its offset from the top of the table when
   * scrolled 0px.
   */
  private headerRowOffsetCache: number[] = [];

  /**
   * A cache of the cells for each header row. Only used for the native table.
   */
  private headerRowCellsCache: Array<HTMLElement[]> = [];

  /** Observable that emits the data source's complete data set. */
  readonly dataStream: Observable<T[] | ReadonlyArray<T>> =
      this._dataSourceChanges.asObservable()
      .pipe(
          switchMap(dataSource => {
            if (isDataSource(dataSource)) {
              return dataSource.connect(this);
            } else if (isObservable(dataSource)) {
              return dataSource;
            }
            return observableOf(dataSource);
          }),
          shareReplay(1));

  @Input()
  get dataSource(): CdkTableDataSourceInput<T> {
    return this._dataSource;
  }
  set dataSource(dataSource: CdkTableDataSourceInput<T>) {
    if (dataSource !== this._innerDataSource) {
      this._innerDataSource = dataSource;
      // Update the full data set.
      this._dataSourceChanges.next(dataSource);
      // Update table to receive slices from the new data source.
      this._switchDataSource(
          new VirtualDataSource(dataSource, this.viewChange));
    }
  }
  private _innerDataSource: CdkTableDataSourceInput<T>;
  private subscription = new Subscription();

  constructor(
      protected readonly _differs: IterableDiffers,
      protected readonly _changeDetectorRef: ChangeDetectorRef,
      protected readonly _elementRef: ElementRef,
      @Attribute('role') role: string,
      @Inject(VIEW_REPEATER_STRATEGY) protected readonly _viewRepeater: ViewRepeater<T, RenderRow<T>, RowContext<T>>,
      @Inject(VIRTUAL_SCROLL_STRATEGY) protected readonly _scrollStrategy: VirtualScrollStrategy,
      @Optional() protected readonly _dir: Directionality,
      @Inject(DOCUMENT) _document: any,
      @SkipSelf() private _viewport: CdkVirtualScrollViewport,
      _platform: Platform,
      private readonly zone: NgZone) {
    super(_differs, _changeDetectorRef, _elementRef, role, _viewRepeater, _dir, _document, _platform);

    // FIXME this is a hack.
    this.fixedColumnSize = true;

    // Update viewChange subscribers when the virtual scroll viewport's rendered
    // range changes.
    this.subscription.add(
        this._viewport.renderedRangeStream.subscribe(range => {
          this._renderedRange = range;
          this.viewChange.next(range);
        }));

    // Update sticky styles when the virtual scroll viewport's translateY
    // changes.
    // FIXME DO NOT SUBMIT only run this when some rows have sticky styles enabled
    this.subscription.add(
        this._scrollStrategy.scrolledIndexChange.subscribe((v) => this.renderStickyRows(
            this._viewport.getOffsetToRenderedContentStart() || 0)));
    this._viewport.attach(this);
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
    super.ngOnDestroy();
  }

  private renderStickyRows(offsetFromTop: number) {
    if (this._isNativeHtmlTable) {
      this.renderNativeHeaderRows(offsetFromTop);
    } else {
      this.renderFlexHeaderRows(offsetFromTop);
    }
  }

  /**
   * Calculates the offset of each header row from the top of the table, then
   * updates their position to that offset. For native rows, the offset is
   * applied to the header row's cells. This calculation is only applicable to
   * native tables.
   */
  private renderNativeHeaderRows(offsetFromTop: number) {
    const headers = this._getRenderedRows(this._headerRowOutlet);

    if (headers.length !== this.headerRowOffsetCache.length) {
      this.headerRowCellsCache = headers.map(header =>
          header.getElementsByClassName(this.stickyCssClass) as unknown as HTMLElement[]);
      this.headerRowOffsetCache = this.headerRowCellsCache.map(headerCells =>
          parseInt((headerCells[0] as HTMLElement).style.top, 10));
    }

    for (const [index, headerCells] of this.headerRowCellsCache.entries()) {
      for (const cell of headerCells) {
        const offset = offsetFromTop - this.headerRowOffsetCache[index];
        cell.style.willChange = 'top';
        cell.style.top = `-${offset}px`;
      }
    }
  }

  /**
   * Calculates the offset of each header row from the top of the table, then
   * updates their position to that offset. This calculation is only applicable
   * to flex tables.
   */
  private renderFlexHeaderRows(offsetFromTop: number) {
    const headers = this._getRenderedRows(this._headerRowOutlet);

    if (headers.length !== this.headerRowOffsetCache.length) {
      this.headerRowOffsetCache = headers.map(
          header => parseInt(header.style.top, 10));
    }

    for (const [index, header] of headers.entries()) {
      const offset = offsetFromTop - this.headerRowOffsetCache[index];
      header.style.willChange = 'top';
      header.style.top = `-${offset}px`;
    }
  }

  // FIXME verify calculations are correct with footer rows
  /** Calculates how many entries from the data set can fit in the viewport. */
  measureRangeSize(range: ListRange, orientation: 'horizontal' | 'vertical'): number {
    if (range.start >= range.end) {
      return 0;
    }
    if (range.start < this._renderedRange.start || range.end > this._renderedRange.end) {
      throw Error(`Error: attempted to measure an item that isn't rendered.`);
    }

    const renderedStartIndex = range.start - this._renderedRange.start;
    const rangeLen = range.end - range.start;

    return this.getOutletSize(
        this._rowOutlet, renderedStartIndex, rangeLen, orientation);
  }

  /**
   * Loop over all root nodes for all items in the range and sum up their size.
   */
  private getOutletSize(rowOutlet: RowOutlet, start: number, length: number, orientation: 'horizontal' | 'vertical'): number {
    let totalSize = 0;
    let i = length;
    while (i--) {
      const view = rowOutlet.viewContainer.get(i + start) as
          EmbeddedViewRef<CdkVirtualForOfContext<T>> | null;
      let j = view ? view.rootNodes.length : 0;
      while (j--) {
        totalSize += getSize(orientation, view!.rootNodes[j]);
      }
    }
    return totalSize;
  }
}

/** Helper to extract size from a DOM Node. */
function getSize(orientation: 'horizontal' | 'vertical', node: Node): number {
  const el = node as Element;
  if (!el.getBoundingClientRect) {
    return 0;
  }
  const rect = el.getBoundingClientRect();
  return orientation == 'horizontal' ? rect.width : rect.height;
}
