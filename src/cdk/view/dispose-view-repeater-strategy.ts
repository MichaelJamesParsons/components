/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {IterableChangeRecord, IterableChanges, ViewContainerRef} from '@angular/core';
import {ViewRepeater, ViewRepeaterItemContext, ViewRepeaterItemContextFactory, ViewRepeaterItemValueResolver} from '@angular/cdk/view';

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
               itemValueResolver: ViewRepeaterItemValueResolver<R>) {
    changes.forEachOperation(
        (record: IterableChangeRecord<R>,
         adjustedPreviousIndex: number | null,
         currentIndex: number | null) => {
          if (record.previousIndex == null) {
            const insertContext = itemContextFactory(record, adjustedPreviousIndex, currentIndex);
            const view = viewContainerRef.createEmbeddedView(
                insertContext.templateRef, insertContext.context, insertContext.index);
            if (insertContext.afterViewInserted) {
              insertContext.afterViewInserted(view);
            }
          } else if (currentIndex == null) {
            viewContainerRef.remove(adjustedPreviousIndex!);
          } else {
            const view = viewContainerRef.get(adjustedPreviousIndex!);
            viewContainerRef.move(view!, currentIndex);
          }
        });
  }

  detach() {
  }
}
