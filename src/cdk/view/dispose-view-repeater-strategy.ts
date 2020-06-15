/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {EmbeddedViewRef, IterableChangeRecord, IterableChanges, ViewContainerRef} from '@angular/core';
import {ViewRepeater, ViewRepeaterItemChanged, ViewRepeaterItemContext, ViewRepeaterItemContextFactory, ViewRepeaterItemValueResolver, ViewRepeaterOperation} from '@angular/cdk/view';

/**
 * A repeater that destroys views when they are removed from a
 * {@link ViewContainerRef}. When new items are inserted into the container,
 * the repeater will always construct a new embedded view for each item.
 *
 * @template T The type for the embedded view's $implicit property.
 * @template R The type for the item in each IterableDiffer change record.
 * @template C The type for the context passed to each embedded view.
 */
export class DisposeViewRepeaterStrategy<T, R, C extends ViewRepeaterItemContext<T>> implements ViewRepeater<T, R, C> {
  applyChanges(changes: IterableChanges<R>,
               viewContainerRef: ViewContainerRef,
               itemContextFactory: ViewRepeaterItemContextFactory<T, R, C>,
               itemValueResolver: ViewRepeaterItemValueResolver<R>,
               itemViewChanged?: ViewRepeaterItemChanged<R, C>) {
    changes.forEachOperation(
        (record: IterableChangeRecord<R>,
         adjustedPreviousIndex: number | null,
         currentIndex: number | null) => {
          let view: EmbeddedViewRef<C>|undefined;
          let operation: ViewRepeaterOperation;
          if (record.previousIndex == null) {
            const insertContext = itemContextFactory(record, adjustedPreviousIndex, currentIndex);
            view = viewContainerRef.createEmbeddedView(
                insertContext.templateRef, insertContext.context, insertContext.index);
            operation = ViewRepeaterOperation.INSERTED;
          } else if (currentIndex == null) {
            viewContainerRef.remove(adjustedPreviousIndex!);
            operation = ViewRepeaterOperation.REMOVED;
          } else {
            view = viewContainerRef.get(adjustedPreviousIndex!) as EmbeddedViewRef<C>;
            viewContainerRef.move(view!, currentIndex);
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
  }
}
