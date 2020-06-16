/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {InjectionToken, IterableChangeRecord, IterableChanges, TemplateRef, ViewContainerRef} from '@angular/core';

/**
 * The operations that may be performed in a view repeater.
 */
export enum ViewRepeaterOperation {
  INSERTED,
  MOVED,
  REMOVED,
}

/**
 * The context for an embedded view in the repeater's view container.
 *
 * @template T The type for the embedded view's $implicit property.
 */
export interface ViewRepeaterItemContext<T> {
  $implicit?: T;
}

/**
 * The arguments needed to construct an embedded view for an item in a view
 * container.
 *
 * @template C The type for the context passed to each embedded view.
 */
export interface ViewRepeaterItemInsertArgs<C> {
  context?: C,
  index?: number,
  templateRef: TemplateRef<C>,
}

/**
 * A factory that derives the embedded view context for an item in a view
 * container.
 *
 * @template T The type for the embedded view's $implicit property.
 * @template R The type for the item in each IterableDiffer change record.
 * @template C The type for the context passed to each embedded view.
 */
export type ViewRepeaterItemContextFactory<T, R, C extends ViewRepeaterItemContext<T>> =
    (record: IterableChangeRecord<R>,
     adjustedPreviousIndex: number | null, currentIndex: number | null) => ViewRepeaterItemInsertArgs<C>;

/**
 * Extracts the value of an item from an {@link IterableChangeRecord}.
 *
 * @template R The type for the item in each IterableDiffer change record.
 */
export type ViewRepeaterItemValueResolver<R> =
    (record: IterableChangeRecord<R>) => any;

/**
 * Extracts the value of an item from an {@link IterableChangeRecord}.
 *
 * @template C The type for the context passed to each embedded view.
 */
export type ViewRepeaterItemChanged<R, C> =
    (operation: ViewRepeaterOperation, record: IterableChangeRecord<R>, viewContext?: C) => void;

/**
 * Describes a strategy for rendering items in a {@link ViewContainerRef}.
 *
 * @template T The type for the embedded view's $implicit property.
 * @template R The type for the item in each IterableDiffer change record.
 * @template C The type for the context passed to each embedded view.
 */
export interface ViewRepeater<T, R, C extends ViewRepeaterItemContext<T>> {
  applyChanges(
      changes: IterableChanges<R>,
      viewContainerRef: ViewContainerRef,
      itemContextFactory: ViewRepeaterItemContextFactory<T, R, C>,
      onViewChanged?: ViewRepeaterItemChanged<R, C>): void;
  detach(): void;
}

/** Injection token for {@link ViewRepeater}. */
export const VIEW_REPEATER_STRATEGY =
    new InjectionToken<ViewRepeater<any, any, ViewRepeaterItemContext<any>>>('ViewRepeater');
