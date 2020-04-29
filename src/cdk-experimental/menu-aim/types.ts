import {Observable} from "rxjs";

export interface MenuAimTrigger {
  activate: () => Observable<HTMLElement>;
  deactivate: () => {};
  menu: HTMLElement;
}
