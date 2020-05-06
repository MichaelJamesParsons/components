import {AfterViewInit, Directive, forwardRef, Input} from '@angular/core';
import {
  CdkVirtualScrollViewport,
  VIRTUAL_SCROLL_STRATEGY,
  VirtualScrollStrategy
} from "@angular/cdk/scrolling";
import {
  AutoSizeVirtualScrollStrategy,
  CdkAutoSizeVirtualScroll, ItemSizeAverager
} from "../../cdk-experimental/scrolling";
import {CdkTable} from "@angular/cdk/table/table";
import {Observable} from "rxjs";

/**
 * WIP DO NO SUBMIT
 * @see CdkTableVirtualScroll
 */
export class TableVirtualScrollStrategy<T> implements VirtualScrollStrategy {
  /** The attached viewport. */
  private _viewport?: CdkVirtualScrollViewport;
  private internalAutoScrollStrategy: AutoSizeVirtualScrollStrategy;
  scrolledIndexChange: Observable<number>;
  private cdkTable?: CdkTable<T>;

  constructor(minBuffer: number, maxBuffer: number, averager = new ItemSizeAverager()) {
    this.internalAutoScrollStrategy = new AutoSizeVirtualScrollStrategy(
        minBuffer, maxBuffer, averager);
  }

  setTableRef(ref: CdkTable<T>) {
    this.cdkTable = ref;
    this.onDataLengthChanged();
  }

  attach(viewport: CdkVirtualScrollViewport): void {
    this._viewport = viewport;
  }

  detach(): void {
  }

  onContentRendered(): void {
  }

  onContentScrolled(): void {
  }

  onDataLengthChanged(): void {
    const sum = this.getSize(this.getHeaderRows())
        + this.getSize(this.getBodyRows())
        + this.getSize(this.getFooterRows());

    this._viewport?.setTotalContentSize(Math.ceil(sum));
  }

  private getSize(rows: HTMLElement[]): number {
    return rows.reduce((sum, row) =>
        row.getBoundingClientRect().height + sum, 0);
  }

  private getHeaderRows(): HTMLElement[] {
    return this.cdkTable?._getRenderedRows(this.cdkTable?._headerRowOutlet) || [];
  }

  private getBodyRows(): HTMLElement[] {
    return this.cdkTable?._getRenderedRows(this.cdkTable?._rowOutlet) || [];
  }

  private getFooterRows(): HTMLElement[] {
    return this.cdkTable?._getRenderedRows(this.cdkTable?._footerRowOutlet) || [];
  }

  onRenderedOffsetChanged(): void {
  }

  scrollToIndex(index: number, behavior: ScrollBehavior): void {
  }
}

export function _tableVirtualScrollStrategyFactory(tableScrollDir: CdkAutoSizeVirtualScroll) {
  return tableScrollDir._scrollStrategy;
}

/**
 * WIP DO NO SUBMIT
 * This was an experiment to bind a custom table virtual scroll strategy to
 * the virtual scroll viewport. After fiddling with it for a while, I think the
 * logic that would reside in the strategy can be handled by the
 * {@link MatVirtualTable} instead. Keeping this around in case I need it later.
 */
@Directive({
  selector: 'cdk-virtual-scroll-viewport[tableFor]',
  providers: [
    {
      provide: VIRTUAL_SCROLL_STRATEGY,
      useFactory: _tableVirtualScrollStrategyFactory,
      deps: [forwardRef(() => CdkTableVirtualScroll)],
    }
  ],
})
export class CdkTableVirtualScroll implements AfterViewInit {
  @Input('tableFor') cdkTable!: CdkTable<any>;

  _scrollStrategy = new TableVirtualScrollStrategy(100, 200);

  ngAfterViewInit(): void {
    if (!this.cdkTable) {
      throw new Error('@Input() cdkTable is required');
    }
  }
}
