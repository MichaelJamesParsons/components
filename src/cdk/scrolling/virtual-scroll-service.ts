import {
  animationFrameScheduler,
  asapScheduler,
  Observable,
  Observer,
  Subject,
  Subscription
} from 'rxjs';
import {ListRange} from '@angular/cdk/collections';
import {
  ChangeDetectorRef,
  ElementRef, Inject, Injectable,
  Input,
  NgZone,
  Optional,
  Output,
  ViewChild
} from '@angular/core';
import {CdkVirtualScrollRepeater} from '@angular/cdk/scrolling/virtual-scroll-repeater';
import {
  VIRTUAL_SCROLL_STRATEGY,
  VirtualScrollStrategy
} from '@angular/cdk/scrolling/virtual-scroll-strategy';
import {Directionality} from '@angular/cdk/bidi';
import {ScrollDispatcher} from '@angular/cdk/scrolling/scroll-dispatcher';
import {ViewportRuler} from '@angular/cdk/scrolling/viewport-ruler';
import {CdkScrollable, ExtendedScrollToOptions} from '@angular/cdk/scrolling/scrollable';
import {auditTime, startWith} from 'rxjs/operators';

/** Checks if the given ranges are equal. */
function rangesEqual(r1: ListRange, r2: ListRange): boolean {
  return r1.start == r2.start && r1.end == r2.end;
}

/**
 * Scheduler to be used for scroll events. Needs to fall back to
 * something that doesn't rely on requestAnimationFrame on environments
 * that don't support it (e.g. server-side rendering).
 */
const SCROLL_SCHEDULER =
    typeof requestAnimationFrame !== 'undefined' ? animationFrameScheduler : asapScheduler;

export interface VirtualScrollViewport extends CdkScrollable {
  host: HTMLElement;
  contentWrapper: HTMLElement;
  spacer: HTMLElement;
}

export interface VirtualScrollThing {
  orientation: 'horizontal' | 'vertical';
  scrolledIndexChange: Observable<number>;
  renderedRangeStream: Observable<ListRange>;
  detach(): void;
  getDataLength(): number;
  getViewportSize(): number;
  getRenderedRange(): ListRange;
  setTotalContentSize(size: number): void;
  setRenderedRange(range: ListRange): void;
  getOffsetToRenderedContentStart(): number | null;
  setRenderedContentOffset(offset: number, to?: 'to-start' | 'to-end'): void;
  scrollToOffset(offset: number, behavior?: ScrollBehavior): void;
  scrollToIndex(index: number,  behavior?: ScrollBehavior): void;
  measureScrollOffset(from?: 'top' | 'left' | 'right' | 'bottom' | 'start' | 'end'): number;
  measureRenderedContentSize(): number;
  measureRangeSize(range: ListRange): number;
  checkViewportSize(): void;
}
/*

@Injectable()
export class VirtualScrollService {
  /!** Emits when the viewport is detached from a CdkVirtualForOf. *!/
  private _detachedSubject = new Subject<void>();

  /!** Emits when the rendered range changes. *!/
  private _renderedRangeSubject = new Subject<ListRange>();

  /!** The direction the viewport scrolls. *!/
  get orientation() {
    return this._orientation;
  }
  set orientation(orientation: 'horizontal' | 'vertical') {
    if (this._orientation !== orientation) {
      this._orientation = orientation;
      this._calculateSpacerSize();
    }
  }
  private _orientation: 'horizontal' | 'vertical' = 'vertical';

  // Note: we don't use the typical EventEmitter here because we need to subscribe to the scroll
  // strategy lazily (i.e. only if the user is actually listening to the events). We do this because
  // depending on how the strategy calculates the scrolled index, it may come at a cost to
  // performance.
  /!** Emits when the index of the first element visible in the viewport changes. *!/
  scrolledIndexChange: Observable<number> =
      new Observable((observer: Observer<number>) =>
          this._scrollStrategy.scrolledIndexChange.subscribe(index =>
              Promise.resolve().then(() => this._zone.run(() => observer.next(index)))));

  /!** A stream that emits whenever the rendered range changes. *!/
  renderedRangeStream: Observable<ListRange> = this._renderedRangeSubject.asObservable();

  /!**
   * The total size of all content (in pixels), including content that is not currently rendered.
   *!/
  private _totalContentSize = 0;

  /!** A string representing the `style.width` property value to be used for the spacer element. *!/
  _totalContentWidth = '';

  /!** A string representing the `style.height` property value to be used for the spacer element. *!/
  _totalContentHeight = '';

  /!**
   * The CSS transform applied to the rendered subset of items so that they appear within the bounds
   * of the visible viewport.
   *!/
  private _renderedContentTransform: string;

  /!** The currently rendered range of indices. *!/
  private _renderedRange: ListRange = {start: 0, end: 0};

  /!** The length of the data bound to this viewport (in number of items). *!/
  private _dataLength = 0;

  /!** The size of the viewport (in pixels). *!/
  private _viewportSize = 0;

  /!** the currently attached CdkVirtualScrollRepeater. *!/
  private _forOf: CdkVirtualScrollRepeater<any> | null;

  /!** The last rendered content offset that was set. *!/
  private _renderedContentOffset = 0;

  /!**
   * Whether the last rendered content offset was to the end of the content (and therefore needs to
   * be rewritten as an offset to the start of the content).
   *!/
  private _renderedContentOffsetNeedsRewrite = false;

  /!** Whether there is a pending change detection cycle. *!/
  private _isChangeDetectionPending = false;

  /!** A list of functions to run after the next change detection cycle. *!/
  private _runAfterChangeDetection: Function[] = [];

  /!** Subscription to changes in the viewport size. *!/
  private _viewportChanges = Subscription.EMPTY;

  private _viewport: VirtualScrollViewport | null;

  constructor(private _changeDetectorRef: ChangeDetectorRef,
              ngZone: NgZone,
              @Optional() @Inject(VIRTUAL_SCROLL_STRATEGY)
              private _scrollStrategy: VirtualScrollStrategy,
              @Optional() private readonly dir: Directionality,
              scrollDispatcher: ScrollDispatcher,
              viewportRuler: ViewportRuler,
              private readonly _zone: NgZone) {

    if (!_scrollStrategy) {
      throw Error('Error: cdk-virtual-scroll-viewport requires the "itemSize" property to be set.');
    }

    // @breaking-change 11.0.0 Remove null check for `viewportRuler`.
    if (viewportRuler) {
      this._viewportChanges = viewportRuler.change().subscribe(() => {
        this.checkViewportSize();
      });
    }
  }

  attach(viewport: VirtualScrollViewport) {
    if(this._viewport) {
      throw Error('VirtualScrollViewport is already attached.');
    }
    this._viewport = viewport;

    // It's still too early to measure the viewport at this point. Deferring with a promise allows
    // the Viewport to be rendered with the correct size before we measure. We run this outside the
    // zone to avoid causing more change detection cycles. We handle the change detection loop
    // ourselves instead.
    this._zone.runOutsideAngular(() => Promise.resolve().then(() => {
      this._measureViewportSize();
      this._scrollStrategy.attach(this);

      this._viewport?.elementScrolled()
      .pipe(
          // Start off with a fake scroll event so we properly detect our initial position.
          startWith(null!),
          // Collect multiple events into one until the next animation frame. This way if
          // there are multiple scroll events in the same frame we only need to recheck
          // our layout once.
          auditTime(0, SCROLL_SCHEDULER))
      .subscribe(() => {
        this._scrollStrategy.onContentScrolled();
      });

      this._markChangeDetectionNeeded();
    }));
  }

  detach() {
    this._forOf = null;
    this._detachedSubject.next();

    this._scrollStrategy.detach();

    // Complete all subjects
    this._renderedRangeSubject.complete();
    this._detachedSubject.complete();
    this._viewportChanges.unsubscribe();
  }










  /!** Gets the length of the data bound to this viewport (in number of items). *!/
  getDataLength(): number {
    return this._dataLength;
  }

  /!** Gets the size of the viewport (in pixels). *!/
  getViewportSize(): number {
    return this._viewportSize;
  }

  // TODO(mmalerba): This is technically out of sync with what's really rendered until a render
  // cycle happens. I'm being careful to only call it after the render cycle is complete and before
  // setting it to something else, but its error prone and should probably be split into
  // `pendingRange` and `renderedRange`, the latter reflecting whats actually in the DOM.

  /!** Get the current rendered range of items. *!/
  getRenderedRange(): ListRange {
    return this._renderedRange;
  }

  /!**
   * Sets the total size of all content (in pixels), including content that is not currently
   * rendered.
   *!/
  setTotalContentSize(size: number) {
    if (this._totalContentSize !== size) {
      this._totalContentSize = size;
      this._calculateSpacerSize();
      this._markChangeDetectionNeeded();
    }
  }

  /!** Sets the currently rendered range of indices. *!/
  setRenderedRange(range: ListRange) {
    if (!rangesEqual(this._renderedRange, range)) {
      this._renderedRangeSubject.next(this._renderedRange = range);
      this._markChangeDetectionNeeded(() => this._scrollStrategy.onContentRendered());
    }
  }

  /!**
   * Gets the offset from the start of the viewport to the start of the rendered data (in pixels).
   *!/
  getOffsetToRenderedContentStart(): number | null {
    return this._renderedContentOffsetNeedsRewrite ? null : this._renderedContentOffset;
  }

  /!**
   * Sets the offset from the start of the viewport to either the start or end of the rendered data
   * (in pixels).
   *!/
  setRenderedContentOffset(offset: number, to: 'to-start' | 'to-end' = 'to-start') {
    // For a horizontal viewport in a right-to-left language we need to translate along the x-axis
    // in the negative direction.
    const isRtl = this.dir && this.dir.value == 'rtl';
    const isHorizontal = this.orientation == 'horizontal';
    const axis = isHorizontal ? 'X' : 'Y';
    const axisDirection = isHorizontal && isRtl ? -1 : 1;
    let transform = `translate${axis}(${Number(axisDirection * offset)}px)`;
    this._renderedContentOffset = offset;
    if (to === 'to-end') {
      transform += ` translate${axis}(-100%)`;
      // The viewport should rewrite this as a `to-start` offset on the next render cycle. Otherwise
      // elements will appear to expand in the wrong direction (e.g. `mat-expansion-panel` would
      // expand upward).
      this._renderedContentOffsetNeedsRewrite = true;
    }
    if (this._renderedContentTransform != transform) {
      // We know this value is safe because we parse `offset` with `Number()` before passing it
      // into the string.
      this._renderedContentTransform = transform;
      this._markChangeDetectionNeeded(() => {
        if (this._renderedContentOffsetNeedsRewrite) {
          this._renderedContentOffset -= this.measureRenderedContentSize();
          this._renderedContentOffsetNeedsRewrite = false;
          this.setRenderedContentOffset(this._renderedContentOffset);
        } else {
          this._scrollStrategy.onRenderedOffsetChanged();
        }
      });
    }
  }

  /!**
   * Scrolls to the given offset from the start of the viewport. Please note that this is not always
   * the same as setting `scrollTop` or `scrollLeft`. In a horizontal viewport with right-to-left
   * direction, this would be the equivalent of setting a fictional `scrollRight` property.
   * @param offset The offset to scroll to.
   * @param behavior The ScrollBehavior to use when scrolling. Default is behavior is `auto`.
   *!/
  scrollToOffset(offset: number, behavior: ScrollBehavior = 'auto') {
    const options: ExtendedScrollToOptions = {behavior};
    if (this.orientation === 'horizontal') {
      options.start = offset;
    } else {
      options.top = offset;
    }
    // FIXME remove `!`
    this._viewport!.scrollTo(options);
  }

  /!**
   * Scrolls to the offset for the given index.
   * @param index The index of the element to scroll to.
   * @param behavior The ScrollBehavior to use when scrolling. Default is behavior is `auto`.
   *!/
  scrollToIndex(index: number,  behavior: ScrollBehavior = 'auto') {
    this._scrollStrategy.scrollToIndex(index, behavior);
  }

  /!**
   * Gets the current scroll offset from the start of the viewport (in pixels).
   * @param from The edge to measure the offset from. Defaults to 'top' in vertical mode and 'start'
   *     in horizontal mode.
   *!/
  measureScrollOffset(from?: 'top' | 'left' | 'right' | 'bottom' | 'start' | 'end'): number {
    // FIXME remove `!`
    return from ?
        this._viewport!.measureScrollOffset(from) :
        this._viewport!.measureScrollOffset(this.orientation === 'horizontal' ? 'start' : 'top');
  }

  /!** Measure the combined size of all of the rendered items. *!/
  measureRenderedContentSize(): number {
    const contentEl = this._viewport!.contentWrapper;
    return this.orientation === 'horizontal' ? contentEl.offsetWidth : contentEl.offsetHeight;
  }

  /!**
   * Measure the total combined size of the given range. Throws if the range includes items that are
   * not rendered.
   *!/
  measureRangeSize(range: ListRange): number {
    if (!this._forOf) {
      return 0;
    }
    return this._forOf.measureRangeSize(range, this.orientation);
  }

  /!** Update the viewport dimensions and re-render. *!/
  checkViewportSize() {
    // TODO: Cleanup later when add logic for handling content resize
    this._measureViewportSize();
    this._scrollStrategy.onDataLengthChanged();
  }

  /!** Measure the viewport size. *!/
  private _measureViewportSize() {
    const viewportEl = this._viewport!.host;
    this._viewportSize = this.orientation === 'horizontal' ?
        viewportEl.clientWidth : viewportEl.clientHeight;
  }

  /!** Queue up change detection to run. *!/
  private _markChangeDetectionNeeded(runAfter?: Function) {
    if (runAfter) {
      this._runAfterChangeDetection.push(runAfter);
    }

    // Use a Promise to batch together calls to `_doChangeDetection`. This way if we set a bunch of
    // properties sequentially we only have to run `_doChangeDetection` once at the end.
    if (!this._isChangeDetectionPending) {
      this._isChangeDetectionPending = true;
      this._zone.runOutsideAngular(() => Promise.resolve().then(() => {
        this._doChangeDetection();
      }));
    }
  }

  /!** Run change detection. *!/
  private _doChangeDetection() {
    this._isChangeDetectionPending = false;

    // Apply the content transform. The transform can't be set via an Angular binding because
    // bypassSecurityTrustStyle is banned in Google. However the value is safe, it's composed of
    // string literals, a variable that can only be 'X' or 'Y', and user input that is run through
    // the `Number` function first to coerce it to a numeric value.
    // FIXME remove `!`
    this._viewport!.contentWrapper.style.transform = this._renderedContentTransform;
    // Apply changes to Angular bindings. Note: We must call `markForCheck` to run change detection
    // from the root, since the repeated items are content projected in. Calling `detectChanges`
    // instead does not properly check the projected content.
    this._zone.run(() => this._changeDetectorRef.markForCheck());

    const runAfterChangeDetection = this._runAfterChangeDetection;
    this._runAfterChangeDetection = [];
    for (const fn of runAfterChangeDetection) {
      fn();
    }
  }

  /!** Calculates the `style.width` and `style.height` for the spacer element. *!/
  private _calculateSpacerSize() {
    this._totalContentHeight =
        this.orientation === 'horizontal' ? '' : `${this._totalContentSize}px`;
    this._totalContentWidth =
        this.orientation === 'horizontal' ? `${this._totalContentSize}px` : '';
  }
}
*/
