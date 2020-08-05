import {CollectionViewer, DataSource, isDataSource, ListRange} from '@angular/cdk/collections';
import {combineLatest, isObservable, Observable, of as observableOf, Subject} from 'rxjs';
import {map, takeUntil} from 'rxjs/operators';

type CdkVirtualDataSourceInput<T> =
    T[] | ReadonlyArray<T> | Observable<T[] | ReadonlyArray<T>> | DataSource<T>;

export class VirtualDataSource<T> extends DataSource<T> {
  private _destroyed = new Subject<void>();

  constructor(private readonly _data: CdkVirtualDataSourceInput<T>,
              private readonly _listRangeChanges: Observable<ListRange>) {
    super();
  }

  connect(collectionViewer: CollectionViewer): Observable<T[] | ReadonlyArray<T>> {
    const dataChanges = this.getDataStream(this._data, collectionViewer);
    return combineLatest([dataChanges, this._listRangeChanges]).pipe(
        takeUntil(this._destroyed),
        map(([data, range]) => range ? data.slice(range.start, range.end) : []));
  }

  disconnect(collectionViewer: CollectionViewer) {
    this._destroyed.next();
    this._destroyed.complete();
  }

  private getDataStream(data: CdkVirtualDataSourceInput<T>, collectionViewer: CollectionViewer): Observable<T[] | ReadonlyArray<T>> {
    if (isDataSource(data)) {
      return data.connect(collectionViewer);
    } else if (isObservable(data)) {
      return data;
    }
    return observableOf(data);
  }
}
