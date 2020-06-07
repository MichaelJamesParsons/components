import {EmbeddedViewRef, IterableChangeRecord, IterableChanges, IterableDiffer, ViewContainerRef} from '@angular/core';

export interface IterableRendererViewRefContext<T> {
  $implicit?: T;
}

export interface IterableRendererStrategy<ViewRefChange, T, ViewRefContext extends IterableRendererViewRefContext<T>> {
  applyChanges(
      changes: IterableChanges<ViewRefChange>,
      viewContainer: ViewContainerRef,
      itemFactory: IterableRendererItemFactory<ViewRefChange, T, ViewRefContext>,
      identityFactory: IterableRendererImplicitValueResolver<ViewRefChange>,
  ): void;
}

type IterableRendererItemFactory<ViewRefChange, T, ViewRefContext extends IterableRendererViewRefContext<T>> =
    (record: IterableChangeRecord<ViewRefChange>,
        adjustedPreviousIndex: number | null,
        currentIndex: number | null,
        viewContainerRef: ViewContainerRef) => EmbeddedViewRef<ViewRefContext>;

type IterableRendererImplicitValueResolver<ViewRefChange> = (record: IterableChangeRecord<ViewRefChange>) => any;


interface ChangedListItem<ViewRefChange> {
  record: IterableChangeRecord<ViewRefChange>;
  adjustedPreviousIndex: number | null;
  currentIndex: number | null;
}



export class RecycleRendererStrategy<ViewRefChange, T, ViewRefContext extends IterableRendererViewRefContext<T>> implements IterableRendererStrategy<ViewRefChange, T, ViewRefContext>{
  differ: IterableDiffer<ViewRefContext>;

  /**
   * The size of the cache used to store templates that are not being used for re-use later.
   * Setting the cache size to `0` will disable caching. Defaults to 20 templates.
   */
  templateCacheSize: number = 150;

  /**
   * The template cache used to hold on ot template instancess that have been stamped out, but don't
   * currently need to be rendered. These instances will be reused in the future rather than
   * stamping out brand new ones.
   */
  private _templateCache: EmbeddedViewRef<ViewRefContext>[] = [];

  /** Apply changes to the DOM. */
  applyChanges(changes: IterableChanges<ViewRefChange>,
               viewContainerRef: ViewContainerRef,
               itemFactory: IterableRendererItemFactory<ViewRefChange, T, ViewRefContext>,
               identityFactory: IterableRendererImplicitValueResolver<ViewRefChange>) {
    /*let removed: Array<ChangedListItem<ViewRefChange>> = [];
    let added: Array<ChangedListItem<ViewRefChange>> = [];

    // Rearrange the views to put them in the right location.
    changes.forEachOperation((record: IterableChangeRecord<ViewRefChange>,
                              adjustedPreviousIndex: number | null,
                              currentIndex: number | null) => {
      if (record.previousIndex == null) {  // Item added.
        added.push({record, adjustedPreviousIndex, currentIndex});
      } else if (currentIndex == null) {  // Item removed.
        removed.push({record, adjustedPreviousIndex, currentIndex});
      } else {  // Item moved.
        const view = viewContainerRef.get(adjustedPreviousIndex!) as
            EmbeddedViewRef<ViewRefContext>;
        viewContainerRef.move(view, currentIndex);
        view.context.$implicit = identityFactory(record);
      }
    });

    removed.forEach(({adjustedPreviousIndex}) => {
      const detachedView = this._detachView(
          adjustedPreviousIndex!, viewContainerRef);
      this._cacheView(detachedView, viewContainerRef);
    });

    added.forEach(({record, adjustedPreviousIndex, currentIndex}) => {
      const view = this._insertViewForNewItem(
          record,
          adjustedPreviousIndex,
          currentIndex,
          viewContainerRef,
          itemFactory,
      );
      view.context.$implicit = identityFactory(record);
    });

    added = [];
    removed = [];*/

    // Rearrange the views to put them in the right location.
    changes.forEachOperation((record: IterableChangeRecord<ViewRefChange>,
                              adjustedPreviousIndex: number | null,
                              currentIndex: number | null) => {
      if (record.previousIndex == null) {  // Item added.
        const view = this._insertViewForNewItem(
            record,
            adjustedPreviousIndex,
            currentIndex,
            viewContainerRef,
            itemFactory,
        );
        view.context.$implicit = identityFactory(record);
      } else if (currentIndex == null) {  // Item removed.
        const detachedView = this._detachView(
            adjustedPreviousIndex!, viewContainerRef);
        this._cacheView(detachedView, viewContainerRef);
      } else {  // Item moved.
        const view = viewContainerRef.get(adjustedPreviousIndex!) as
            EmbeddedViewRef<ViewRefContext>;
        viewContainerRef.move(view, currentIndex);
        view.context.$implicit = identityFactory(record);
      }
    });

    // Update $implicit for any items that had an identity change.
    /*changes.forEachIdentityChange((record: IterableChangeRecord<ViewRefChange>) => {
      const view = viewContainerRef.get(record.currentIndex!) as
          EmbeddedViewRef<ViewRefContext>;
      view.context.$implicit = identityFactory(record);
    });*/
  }

  detach() {
    for (let view of this._templateCache) {
      view.destroy();
    }
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
  private _insertViewForNewItem(
      record: IterableChangeRecord<ViewRefChange>,
      adjustedPreviousIndex: number | null,
      currentIndex: number | null,
      viewContainerRef: ViewContainerRef,
      itemFactory: IterableRendererItemFactory<ViewRefChange, T, ViewRefContext>): EmbeddedViewRef<ViewRefContext> {

    const res = this._insertViewFromCache(currentIndex!, viewContainerRef);
    if (res) {
      return res;
    }

    console.log('creating new item', this._templateCache.length);
    return itemFactory(record, adjustedPreviousIndex, currentIndex, viewContainerRef);
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
