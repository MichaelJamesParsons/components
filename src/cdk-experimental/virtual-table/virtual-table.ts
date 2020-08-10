/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
  AfterViewInit,
  Directive, ElementRef,
  Inject,
  Input, NgZone,
  OnDestroy, OnInit,
  SkipSelf,
} from '@angular/core';
import {
  _RecycleViewRepeaterStrategy,
  _VIEW_REPEATER_STRATEGY,
  isDataSource,
  ListRange
} from '@angular/cdk/collections';
import {CdkTable, DataSource, RenderRow, RowContext} from '@angular/cdk/table';
import {isObservable, Observable, of as observableOf, Subject, Subscription} from 'rxjs';
import {shareReplay, skip, switchMap} from 'rxjs/operators';
import {
  CdkVirtualScrollRepeater,
  CdkVirtualScrollViewport,
  VIRTUAL_SCROLL_STRATEGY,
  VirtualScrollStrategy
} from '@angular/cdk/scrolling';
import {VirtualDataSource} from './virtual-data-source';


/**
 * Union of the types that can be set as the data source for a `CdkTable`.
 * @docs-private
 */
type CdkTableDataSourceInput<T> =
    DataSource<T>|Observable<ReadonlyArray<T>|T[]>|ReadonlyArray<T>|T[];


/**
 * FIXME We should have a directive to enable RecycleViewRepeaterStrategy for
 *  standard, non-virtual tables (use case: group by table).
 */
@Directive({
  selector: 'cdk-table[virtualTable], table[cdk-table][virtualTable]',
  exportAs: 'cdkVirtualTable',
  providers: [
    {provide: _VIEW_REPEATER_STRATEGY, useClass: _RecycleViewRepeaterStrategy},
  ]
})
export class CdkVirtualTable<T> implements CdkVirtualScrollRepeater<T>, AfterViewInit, OnInit, OnDestroy {
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

  /**
   * Observable that emits the data source's complete data set. This exists to implement
   * {@link CdkVirtualScrollRepeater}.
   */
  readonly dataStream: Observable<T[] | ReadonlyArray<T>> =
      this._dataSourceChanges.asObservable()
      .pipe(
          switchMap(dataSource => {
            if (isDataSource(dataSource)) {
              return dataSource.connect(this._table);
            } else if (isObservable(dataSource)) {
              return dataSource;
            }
            return observableOf(dataSource);
          }),
          shareReplay(1));

  /**
   * Wraps the given data source as a {@link VirtualDataSource}, which emits a slice of the data set
   * that can fit within the viewport. This means the table component's `datasource` getter will
   * return the wrapped data source, not the original source received as an input.
   */
  @Input()
  get dataSource(): CdkTableDataSourceInput<T> {
    return this._innerDataSource;
  }
  set dataSource(dataSource: CdkTableDataSourceInput<T>) {
    if (dataSource !== this._innerDataSource) {
      this._innerDataSource = dataSource;
      // Update the full data set.
      this._dataSourceChanges.next(dataSource);
      // Update table to receive slices from the new data source. Use `skipUntil` to ignore
      // view changes until the table has been initialized. Otherwise, it will occasionally emit
      // a large range that will render the entire data set.
      this._table.dataSource = new VirtualDataSource(
          dataSource, this._table.viewChange.pipe(skip(1)));
    }
  }
  private _innerDataSource: CdkTableDataSourceInput<T>;
  private subscription = new Subscription();

  constructor(
      private readonly _table: CdkTable<T>,
      private readonly _tableEl: ElementRef<CdkTable<T>>,
      private readonly _zone: NgZone,
      @Inject(_VIEW_REPEATER_STRATEGY) protected readonly _viewRepeater: _RecycleViewRepeaterStrategy<T, RenderRow<T>, RowContext<T>>,
      @Inject(VIRTUAL_SCROLL_STRATEGY) protected readonly _scrollStrategy: VirtualScrollStrategy,
      @SkipSelf() private _viewport: CdkVirtualScrollViewport) {
    // FIXME is there a better way to enforce this?
    this._table.fixedColumnWidths = true;
    // this._table.scrollableBody = true;



    // FIXME this should be configurable.
    this._viewRepeater.viewCacheSize = 100;
/*    this._viewport.sizeChanged = (width, height) => {
      this._table._rowOutlet.elementRef.nativeElement.parent.style.width = width;
      this._table._rowOutlet.elementRef.nativeElement.parent.style.height = height;
    };*/

    // SOLUTION 1
    /*this._viewport.scrolledIndexChange.subscribe(() => {

    });*/

    /*this._viewport.contentWrapper =  document.createElement('div');
    this._viewport.transformChanged = () => {
      const offset = this._viewport.getOffsetToRenderedContentStart() || 0;
      if (offset !== lastOffset && this.bufferRow) {
        this.bufferRow.style.transform = `translateY(${offset}px)`;
        lastOffset = offset;
      }
    };*/

    // SOLUTION 2
/*    this._viewport.transformChanged = () => {
      const offset = this._viewport.getOffsetToRenderedContentStart() || 0;
      if (offset !== lastOffset && this.bufferRow) {
        this.renderStickyRows(offset);
        lastOffset = offset;
      }
    };*/

    // Update viewChange subscribers when the virtual scroll viewport's rendered
    // range changes.
    this.subscription.add(
        this._viewport.renderedRangeStream.subscribe(range => {
          this._renderedRange = range;
          this._table.viewChange.next(range);
        }));

    // this._viewport.attach(this);
  }

  ngOnInit() {
    const contentWrapper = (this._table._rowOutlet.elementRef.nativeElement as unknown as HTMLElement).parentElement!;
    const spacer = document.createElement('div');
    spacer.classList.add('cdk-virtual-scroll-spacer');
    contentWrapper.appendChild(spacer);
    this._viewport.attach({
      dataStream: this.dataStream,
      measureRangeSize: this.measureRangeSize,
      contentWrapper,
      spacer,
    });
  }

  ngAfterViewInit() {
    // this.bufferRow = document.createElement('tr');
    // const tbody = (this._table._rowOutlet.elementRef.nativeElement as unknown as HTMLElement).parentElement!;
    // this._viewport.contentWrapper =  tbody;
    // this._viewport.transformChanged = () => {
    //   const offset = this._viewport.getOffsetToRenderedContentStart() || 0;
    //   if (offset !== lastOffset && this.bufferRow) {
    //     this.bufferRow.style.transform = `translateY(${offset}px)`;
    //     lastOffset = offset;
    //   }
    // };
    // tbody.prepend(this.bufferRow);
    // this.bufferRow = tbody;
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  measureRangeSize(range: ListRange, orientation: 'horizontal' | 'vertical'): number {
    return 0;
  }

  private renderStickyRows(offsetFromTop: number) {
    // FIXME This property has been changed from `private` to `public`.
    if (this._table._isNativeHtmlTable) {
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
    const headers = this._table._getRenderedRows(this._table._headerRowOutlet);

    if (headers.length !== this.headerRowOffsetCache.length) {
      this.headerRowCellsCache = headers.map(header =>
          header.getElementsByClassName(this._table.stickyCssClass) as unknown as HTMLElement[]);
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
    const headers = this._table._getRenderedRows(this._table._headerRowOutlet);

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
}
