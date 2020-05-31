import {EmbeddedViewRef, IterableChangeRecord, IterableChanges, IterableDiffer, ViewContainerRef} from '@angular/core';

export interface IterableRendererViewRefContext<T> {
  $implicit: T;
}

export interface IterableRendererStrategy<T, ViewRefContext extends IterableRendererViewRefContext<T>> {
  applyChanges(
      changes: IterableChanges<T>,
      viewContainer: ViewContainerRef,
      itemFactory: IterableRendererItemFactory<T, ViewRefContext>,
      onContextChanged: IterableRendererContextChangedHandler,
  ): void;
}

type IterableRendererItemFactory<T, ViewRefContext extends IterableRendererViewRefContext<T>> =
    (index: number, viewContainerRef: ViewContainerRef) => EmbeddedViewRef<ViewRefContext>;
type IterableRendererContextChangedHandler = (viewContainerRef: ViewContainerRef) => void;

export class RecycleRendererStrategy<T, ViewRefContext extends IterableRendererViewRefContext<T>> implements IterableRendererStrategy<T, ViewRefContext>{
  differ: IterableDiffer<ViewRefContext>;

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
  private _templateCache: EmbeddedViewRef<ViewRefContext>[] = [];

  /** Apply changes to the DOM. */
  applyChanges(changes: IterableChanges<T>,
               viewContainerRef: ViewContainerRef,
               itemFactory: IterableRendererItemFactory<T, ViewRefContext>,
               onContextChanged: IterableRendererContextChangedHandler) {
    // Rearrange the views to put them in the right location.
    changes.forEachOperation((record: IterableChangeRecord<T>,
                              adjustedPreviousIndex: number | null,
                              currentIndex: number | null) => {
      if (record.previousIndex == null) {  // Item added.
        const view = this._insertViewForNewItem(currentIndex!, viewContainerRef, itemFactory);
        view.context.$implicit = record.item;
      } else if (currentIndex == null) {  // Item removed.
        const detachedView = this._detachView(
            adjustedPreviousIndex!, viewContainerRef);
        this._cacheView(detachedView, viewContainerRef);
      } else {  // Item moved.
        const view = viewContainerRef.get(adjustedPreviousIndex!) as
            EmbeddedViewRef<ViewRefContext>;
        viewContainerRef.move(view, currentIndex);
        view.context.$implicit = record.item;
      }
    });

    // Update $implicit for any items that had an identity change.
    changes.forEachIdentityChange((record: IterableChangeRecord<T>) => {
      const view = viewContainerRef.get(record.currentIndex!) as
          EmbeddedViewRef<ViewRefContext>;
      view.context.$implicit = record.item;
    });

    // Update the context variables on all items.
    onContextChanged(viewContainerRef);

   /* const count = this._data.length;
    let i = viewContainerRef.length;
    while (i--) {
      const view = viewContainerRef.get(i) as EmbeddedViewRef<ViewRefContext>;
      view.context.index = this._renderedRange.start + i;
      view.context.count = count;
      this._updateComputedContextProperties(view.context);
    }*/
  }

  /** Cache the given detached view. */
  private _cacheView(view: EmbeddedViewRef<ViewRefContext>, viewContainerRef: ViewContainerRef) {
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

  /** Inserts a view for a new item, either from the cache or by creating a new one. */
  private _insertViewForNewItem(index: number, viewContainerRef: ViewContainerRef, itemFactory: IterableRendererItemFactory<T, ViewRefContext>): EmbeddedViewRef<ViewRefContext> {
    return this._insertViewFromCache(index, viewContainerRef) || itemFactory(index, viewContainerRef);
  }

  /** Inserts a recycled view from the cache at the given index. */
  private _insertViewFromCache(index: number, viewContainerRef: ViewContainerRef): EmbeddedViewRef<ViewRefContext>|null {
    const cachedView = this._templateCache.pop();
    if (cachedView) {
      viewContainerRef.insert(cachedView, index);
    }
    return cachedView || null;
  }

  /** Detaches the embedded view at the given index. */
  private _detachView(index: number, viewContainerRef: ViewContainerRef): EmbeddedViewRef<ViewRefContext> {
    return viewContainerRef.detach(index) as EmbeddedViewRef<ViewRefContext>;
  }
}
