/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {EmbeddedViewRef, IterableChangeRecord, IterableChanges, IterableDiffer, ViewContainerRef} from '@angular/core';
import {ViewRepeater, ViewRepeaterItemChanged, ViewRepeaterItemContext, ViewRepeaterItemContextFactory, ViewRepeaterItemInsertArgs, ViewRepeaterItemValueResolver, ViewRepeaterOperation} from '@angular/cdk/view';


/**
 * A repeater that caches views when they are removed from a
 * {@link ViewContainerRef}. When new items are inserted into the container,
 * the repeater will reuse one of the cached views instead of creating a new
 * embedded view. Recycling cached views reduces the quantity of expensive DOM
 * inserts.
 *
 * @template T The type for the embedded view's $implicit property.
 * @template R The type for the item in each IterableDiffer change record.
 * @template C The type for the context passed to each embedded view.
 */
export class RecycleViewRepeaterStrategy<T, R, C extends ViewRepeaterItemContext<T>> implements ViewRepeater<T, R, C> {
  differ: IterableDiffer<C>;

  /**
   * The size of the cache used to store templates that are not being used for re-use later.
   * Setting the cache size to `0` will disable caching. Defaults to 20 templates.
   */
  templateCacheSize: number = 20;

  /**
   * The template cache used to hold on ot template instancess that have been stamped out, but don't
   * currently need to be rendered. These instances will be reused in the future rather than
   * stamping out brand new ones.
   */
  private _templateCache: EmbeddedViewRef<C>[] = [];

  /** Apply changes to the DOM. */
  applyChanges(changes: IterableChanges<R>,
               viewContainerRef: ViewContainerRef,
               itemContextFactory: ViewRepeaterItemContextFactory<T, R, C>,
               itemValueResolver: ViewRepeaterItemValueResolver<R>,
               itemViewChanged?: ViewRepeaterItemChanged<R, C>) {
    // Rearrange the views to put them in the right location.
    changes.forEachOperation((record: IterableChangeRecord<R>,
                              adjustedPreviousIndex: number | null,
                              currentIndex: number | null) => {
      let view: EmbeddedViewRef<C>|undefined;
      let operation: ViewRepeaterOperation;
      if (record.previousIndex == null) {  // Item added.
        const viewArgsFactory = () => itemContextFactory(
            record, adjustedPreviousIndex, currentIndex);
        view = this._insertView(viewArgsFactory, currentIndex!, viewContainerRef, itemValueResolver(record));
        operation = view ? ViewRepeaterOperation.INSERTED : ViewRepeaterOperation.REPLACED;
      } else if (currentIndex == null) {  // Item removed.
        this._detachAndCacheView(adjustedPreviousIndex!, viewContainerRef);
        operation = ViewRepeaterOperation.REMOVED;
      } else {  // Item moved.
        view = this._moveView(adjustedPreviousIndex!, currentIndex!, viewContainerRef, itemValueResolver(record));
        operation = ViewRepeaterOperation.MOVED;
      }

      if (itemViewChanged) {
        itemViewChanged({
          context: view?.context,
          operation,
          record,
        });
      }
    });
  }

  detach() {
    for (let view of this._templateCache) {
      view.destroy();
    }
  }

  /**
   * Inserts a view for a new item, either from the cache or by creating a new
   * one. Returns `undefined` if the item was inserted into a cached view.
   */
  private _insertView(viewArgsFactory: () => ViewRepeaterItemInsertArgs<C>, currentIndex: number, viewContainerRef: ViewContainerRef, value: T): EmbeddedViewRef<C>|undefined {
    let cachedView = this._insertViewFromCache(currentIndex!, viewContainerRef);
    if (cachedView) {
      cachedView.context.$implicit = value;
      return undefined;
    }

    const viewArgs = viewArgsFactory();
    return viewContainerRef.createEmbeddedView(
        viewArgs.templateRef, viewArgs.context, viewArgs.index);
  }

  /** Detaches the view at the given index and inserts into the view cache. */
  private _detachAndCacheView(index: number, viewContainerRef: ViewContainerRef) {
    const detachedView = this._detachView(index, viewContainerRef);
    this._maybeCacheView(detachedView, viewContainerRef);
  }

  /** Moves view at the previous index to the current index. */
  private _moveView(adjustedPreviousIndex: number, currentIndex: number, viewContainerRef: ViewContainerRef, value: T): EmbeddedViewRef<C> {
    const view = viewContainerRef.get(adjustedPreviousIndex!) as
        EmbeddedViewRef<C>;
    viewContainerRef.move(view, currentIndex);
    view.context.$implicit = value;
    return view;
  }

  /**
   * Cache the given detached view. If the cache is full, the view will be
   * destroyed.
   */
  private _maybeCacheView(view: EmbeddedViewRef<C>, viewContainerRef: ViewContainerRef) {
    if (this._templateCache.length < this.templateCacheSize) {
      this._templateCache.push(view);
    } else {
      const index = viewContainerRef.indexOf(view);

      // It's very unlikely that the index will ever be -1, but just in case,
      // destroy the view on its own, otherwise destroy it through the
      // container to ensure that all the references are removed.
      if (index === -1) {
        view.destroy();
      } else {
        viewContainerRef.remove(index);
      }
    }
  }

  /** Inserts a recycled view from the cache at the given index. */
  private _insertViewFromCache(index: number, viewContainerRef: ViewContainerRef): EmbeddedViewRef<C>|null {
    const cachedView = this._templateCache.pop();
    if (cachedView) {
      viewContainerRef.insert(cachedView, index);
    }
    return cachedView || null;
  }

  /** Detaches the embedded view at the given index. */
  private _detachView(index: number, viewContainerRef: ViewContainerRef): EmbeddedViewRef<C> {
    return viewContainerRef.detach(index) as EmbeddedViewRef<C>;
  }
}
