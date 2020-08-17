import {CdkTable} from '@angular/cdk/table/table';
import {Inject, InjectionToken} from '@angular/core';
import {CDK_TABLE} from './tokens';
import {DOCUMENT} from '@angular/common';

export interface _TableLayoutRenderer {
  buildNativeLayout?: () => DocumentFragment;
  buildFlexLayout?: () => DocumentFragment;
  rowDefsChanged?: () => void;
}

export const _TABLE_LAYOUT_RENDERER =
    new InjectionToken<_TableLayoutRenderer>('_TableLayoutRenderer');


export class DefaultTableLayout implements _TableLayoutRenderer {
  constructor(@Inject(CDK_TABLE) private readonly _table: CdkTable<any>,
              @Inject(DOCUMENT) private readonly _document: any) {
  }

  buildNativeLayout(): DocumentFragment {
    const documentFragment = this._document.createDocumentFragment();
    const sections = [
      {tag: 'thead', outlets: [this._table._headerRowOutlet]},
      {tag: 'tbody', outlets: [this._table._rowOutlet, this._table._noDataRowOutlet]},
      {tag: 'tfoot', outlets: [this._table._footerRowOutlet]},
    ];

    for (const section of sections) {
      const element = this._document.createElement(section.tag);
      element.setAttribute('role', 'rowgroup');

      for (const outlet of section.outlets) {
        element.appendChild(outlet.elementRef.nativeElement);
      }

      documentFragment.appendChild(element);
    }

    return documentFragment;
  }
}

export class ScrollableBodyLayout implements _TableLayoutRenderer {
  constructor(@Inject(CDK_TABLE) private readonly _table: CdkTable<any>,
              @Inject(DOCUMENT) private readonly _document: any) {
  }

  buildNativeLayout(): DocumentFragment {
    const documentFragment = this._document.createDocumentFragment();
    const tr = this._document.createElement('tr');
    const td = this._document.createElement('td');
    const childTable = this._document.createElement('table');

    documentFragment.appendChild(tr);
    tr.appendChild(td);
    // FIXME this cell's colspan should always match the number of columns rendered.
    td.appendChild(childTable);
    return documentFragment;
  }

  buildFlexLayout(): DocumentFragment {
    const documentFragment = this._document.createDocumentFragment();
    const sections = [
      [this._table._headerRowOutlet],
      [this._table._rowOutlet, this._table._noDataRowOutlet],
      [this._table._footerRowOutlet],
    ];

    for (const outlets of sections) {
      const element = this._document.createElement('div');
      for (const outlet of outlets) {
        element.appendChild(outlet.elementRef.nativeElement);
      }
      documentFragment.appendChild(element);
    }

    return documentFragment;
  }
}
