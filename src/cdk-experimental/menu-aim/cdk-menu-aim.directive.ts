import {ContentChildren, Directive, Input} from '@angular/core';
import {MenuAimProvider} from "@angular/cdk-experimental/menu-aim/menu-aim-provider";
import {MenuAimTrigger} from "@angular/cdk-experimental/menu-aim/types";
import {Observable} from "rxjs";

@Directive({
  selector: '[cdkMenuAim]',
  host: {
    '(mouseenter)': 'possiblyActivate($event)',
  }
})
export class CdkMenuAim {
  // @ContentChildren() menus
  /*@Input() menu
  constructor(private readonly menuAimProvider: MenuAimProvider) {
  }

  activate(): Observable<HTMLElement> {
    return new Observable();
  }
  deactivate() {

  }
  menu: HTMLElement;*/
  private possiblyActivate(event: MouseEvent) {
  }
}
