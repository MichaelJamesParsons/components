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
  DataSource, CdkTableDataSourceInput, RowOutlet
} from '@angular/cdk/table';
import {
  Attribute,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef, EmbeddedViewRef,
  Inject,
  Input,
  IterableDiffers,
  OnDestroy,
  Optional, SkipSelf,
  ViewEncapsulation
} from '@angular/core';
import {
  CdkVirtualDataSource, CdkVirtualForOfContext, CdkVirtualScrollViewport,
} from "../../cdk/scrolling";
import {
  combineLatest,
  isObservable, Observable,
  Subject
} from "rxjs";
import {
  ArrayDataSource,
  isDataSource,
  ListRange
} from "@angular/cdk/collections";
import {
  pairwise,
  shareReplay,
  startWith,
  switchMap,
  takeUntil,
  map,
} from "rxjs/operators";
import {Directionality} from "@angular/cdk/bidi";
import {DOCUMENT} from "@angular/common";
import {Platform} from "@angular/cdk/platform";

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
  selector: 'table[mat-virtual-table]',
  exportAs: 'matVirtualTable',
  template: CDK_TABLE_TEMPLATE,
  styleUrls: ['table.css'],
  host: {
    'class': 'mat-virtual-table mat-mdc-table mdc-data-table__table',
  },
  providers: [{provide: CdkTable, useExisting: MatVirtualTable}],
  encapsulation: ViewEncapsulation.None,
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

  /** Observable that emits the data source's complete data set. */
  readonly dataStream: Observable<T[] | ReadonlyArray<T>> = this._dataSourceSubject.asObservable()
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
      _platform: Platform) {
    super(_differs, _changeDetectorRef, _elementRef, role, _dir, _document, _platform);

    /**
     * Emits a slice of {@link dataStream} containing items within
     * {@link _renderedRange}.
     */
    const renderedDataStream = combineLatest([
      this.dataStream,
      this._viewport.renderedRangeStream.pipe(startWith(null)),
    ]).pipe(map(([data, range]) => {
      if (!range) {
        return [];
      }
      this._renderedRange = range;
      const slice = data.slice(range.start, range.end);
      console.log('table:renderedDataStream', slice);
      return slice;
    }), shareReplay(1), takeUntil(this._destroyed));

    /** Forward slice of data source to the table. */
    this.setDataSource(renderedDataStream);
    this._viewport.attach(this);
  }

  ngOnDestroy(): void {
    this._destroyed.next();
    this._destroyed.complete();
    super.ngOnDestroy();
  }

  measureRangeSize(range: ListRange, orientation: 'horizontal' | 'vertical'): number {
    if (range.start >= range.end) {
      console.log('[table:measureRangeSize]', 0);
      return 0;
    }
    if (range.start < this._renderedRange.start || range.end > this._renderedRange.end) {
      throw Error(`Error: attempted to measure an item that isn't rendered.`);
    }

    // The index into the list of rendered views for the first item in the range.
    const renderedStartIndex = range.start - this._renderedRange.start;
    // The length of the range we're measuring.
    const rangeLen = range.end - range.start;

    const totalSize = this.getOutletSize(
        this._rowOutlet, renderedStartIndex, rangeLen, orientation);
    console.log('[table:measureRangeSize]', totalSize);
    return totalSize;
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
