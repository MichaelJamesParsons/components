import {Injectable} from '@angular/core';
import {MenuAimTrigger} from "@angular/cdk-experimental/menu-aim/types";
import {filter, map, take} from "rxjs/operators";
import {Observable} from "rxjs";


@Injectable({
  providedIn: 'root',
})
export class MenuAimProvider {
  private activeMenuItem$: Observable<MenuAimTrigger>;
  private openMenus: HTMLElement[] = [];
  private timeout: any;
  private possibleMenuItem?: MenuAimTrigger;

  possiblyActivateMenuItem(menuItem: MenuAimTrigger): Observable<void> {
    this.possibleMenuItem = menuItem;

    clearTimeout(this.timeout);
    this.timeout = setTimeout(() => {
      this.activateHoveringMenuItem();
    }, 500);

    return this.activeMenuItem$.pipe(
        take(1),
        filter(activeItem => activeItem === menuItem),
        map(() => {}));
  }

  private activateHoveringMenuItem() {
    if (!this.possibleMenuItem) {
      return;
    }

    this.possibleMenuItem.activate().pipe(take(1)).subscribe(menu => {
      const index = this.openMenus.indexOf(menu);
      if (index === -1) {
        this.openMenus.push(menu);
      } else if (index !== this.openMenus.length - 1) {
        this.openMenus = this.openMenus.slice(0, index);
      }
    });
  }
}
