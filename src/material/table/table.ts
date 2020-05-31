/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {CDK_TABLE_TEMPLATE, CdkTable, CDK_TABLE, DataSource, CdkTableDataSourceInput, RowOutlet} from '@angular/cdk/table';
import {Attribute, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, EmbeddedViewRef, Inject, Input, IterableDiffers, NgZone, OnDestroy, Optional, SimpleChanges, SkipSelf, ViewEncapsulation} from '@angular/core';
import {CdkVirtualDataSource, CdkVirtualForOfContext, CdkVirtualScrollViewport} from '../../cdk/scrolling';
import {isObservable, Observable, Subject} from 'rxjs';
import {ArrayDataSource, isDataSource, ListRange} from '@angular/cdk/collections';
import {pairwise, shareReplay, startWith, switchMap, map} from 'rxjs/operators';
import {Directionality} from '@angular/cdk/bidi';
import {DOCUMENT} from '@angular/common';
import {Platform} from '@angular/cdk/platform';

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
    {provide: CDK_TABLE, useExisting: MatTable}
  ],
  encapsulation: ViewEncapsulation.None,
  // See note on CdkTable for explanation on why this uses the default change detection strategy.
  // tslint:disable-next-line:validate-decorators
  changeDetection: ChangeDetectionStrategy.Default,
})
export class MatTable<T> extends CdkTable<T> {
  /** Overrides the sticky CSS class set by the `CdkTable`. */
  protected stickyCssClass = 'mat-table-sticky';
}

/**
 * A {@link MatTable} that internally behaves similar to
 * {@link CdkVirtualForOf} to virtualize rendering of large data sets.
 */
@Component({
  selector: 'mat-virtual-table, table[mat-virtual-table]',
  exportAs: 'matVirtualTable',
  template: CDK_TABLE_TEMPLATE,
  styleUrls: ['table.css'],
  host: {
    'class': 'mat-table mat-virtual-table',
  },
  providers: [
    {provide: CdkTable, useExisting: MatVirtualTable},
    {provide: CDK_TABLE, useExisting: MatVirtualTable}
  ],
  encapsulation: ViewEncapsulation.None,
  // See note on CdkTable for explanation on why this uses the default change detection strategy.
  // tslint:disable-next-line:validate-decorators
  changeDetection: ChangeDetectionStrategy.Default,
})
export class MatVirtualTable<T> extends CdkTable<T> implements CdkVirtualDataSource<T>, OnDestroy {
  /** Overrides the sticky CSS class set by the `CdkTable`. */
  protected stickyCssClass = 'mat-table-sticky';

  private _destroyed = new Subject<void>();

  /** The currently rendered range of indices. */
  private _renderedRange: ListRange;

  /** Subject that emits when a new DataSource instance is given. */
  private _dataSourceSubject = new Subject<DataSource<T>>();

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
      this._dataSourceSubject.asObservable()
        .pipe(
            startWith(undefined),
            pairwise(),
            switchMap(([previous, current]) => {
              if (previous) {
                previous.disconnect(this);
              }
              return current!.connect(this);
            }), shareReplay(1));

  @Input()
  get dataSource(): CdkTableDataSourceInput<T> {
    return this._dataSource;
  }

  set dataSource(dataSource: CdkTableDataSourceInput<T>) {
    let nextDataSource: DataSource<T>;
    if (isDataSource(dataSource)) {
      nextDataSource = dataSource;
    } else {
      // Slice the value if its an NgIterable to ensure we're working with an array.
      nextDataSource = new ArrayDataSource<T>(
          isObservable(dataSource) ? dataSource : Array.prototype.slice.call(dataSource || []));
    }
    this._dataSourceSubject.next(nextDataSource);
  }

  constructor(
      protected readonly _differs: IterableDiffers,
      protected readonly _changeDetectorRef: ChangeDetectorRef,
      protected readonly _elementRef: ElementRef,
      @Attribute('role') role: string,
      @Optional() protected readonly _dir: Directionality,
      @Inject(DOCUMENT) _document: any,
      @SkipSelf() private _viewport: CdkVirtualScrollViewport,
      private zone: NgZone,
      _platform: Platform) {
    super(_differs, _changeDetectorRef, _elementRef, role, _dir, _document, _platform);

    let offsetFromTop = -1;

    /*this._viewport.elementRef.nativeElement.addEventListener('scroll', (event) => {
      const scrollTop = (event.target as HTMLElement).scrollTop;
      const renderedContentStart = this._viewport.getOffsetToRenderedContentStart() || 0;
      const fromTop = Math.round(renderedContentStart - (scrollTop - 1072));
      let nextOffset = renderedContentStart;

      if (renderedContentStart > 1072) {
        nextOffset = fromTop;
      }

      console.log('scrolling', nextOffset, fromTop, renderedContentStart);
      this.renderStickyRows(nextOffset);
    });*/

    this._viewport.tableScrollHandler = offset => {
      // const nextOffset = this._viewport.getOffsetToRenderedContentStart() || 0;
      /*const renderedContentStart = this._viewport.getOffsetToRenderedContentStart() || 0;
      console.log(this._viewport.elementRef.nativeElement.scrollTop);*/
      // const fromTop = Math.round(renderedContentStart - (scrollTop - 1072));
      /*
      let nextOffset = renderedContentStart;

      if (renderedContentStart > 1072) {
        nextOffset = fromTop;
      }

      console.log(nextOffset);
      */

      const nextOffset = this._viewport.getOffsetToRenderedContentStart() || 0;
      if (nextOffset !== offsetFromTop) {
        // TODO only call when sticky headers are enabled
        this.renderStickyRows(offset);
        offsetFromTop = nextOffset;
      }
    };

    /*this._viewport.elementScrolled().subscribe((event) => {
      console.log((event.target as HTMLElement).scrollTop);
      this.renderStickyRows(Math.round((event.target as HTMLElement).scrollTop));
    })*/

    // FIXME unsubscribe
    /**
     * Emits a slice of {@link dataStream} containing items within
     * {@link _renderedRange}.
     */
    const renderedDataStream = this.dataStream.pipe(
        switchMap(data => this._viewport.renderedRangeStream.pipe(
            map(range => {
              if (!range) {
                return [];
              }
              this._renderedRange = range;
              return data.slice(range.start, range.end);
            }))));

    // Forward slice of data source to the table.
    this.setDataSource(renderedDataStream);
    this._viewport.attach(this);
  }

  ngOnDestroy(): void {
    this._destroyed.next();
    this._destroyed.complete();
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
      // TODO translateY
      // TODO willChange - Enable when scroll starts outside of zone.
      //  Disable when scroll stops.
      this.headerRowOffsetCache = this.headerRowCellsCache.map(headerCells =>
          parseInt((headerCells[0] as HTMLElement).style.top, 10));
    }

    for (const [index, headerCells] of this.headerRowCellsCache.entries()) {
      for (const cell of headerCells) {
        // TODO translateY
        // TODO willChange - Enable when scroll starts outside of zone.
        //  Disable when scroll stops.
        const offset = offsetFromTop - this.headerRowOffsetCache[index];
        cell.style.willChange = 'top';
        cell.style.top = `-${offset}px`;
        // this.applyStickyStyles(offsetFromTop, cell);
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
      // this.applyStickyStyles(offsetFromTop, header);
    }
  }

  private applyStickyStyles(offsetFromTop: number, header: HTMLElement) {
    header.style.willChange = 'transform';
    header.style.transform = `translateY(-${offsetFromTop}px)`;
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
