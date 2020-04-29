## <mat-menu> solution?
1. Apply `menuAim` to `<mat-menu>`.

```angular2html
<mat-menu menuAim></mat-menu>
```

1. Get `menuAim` context in `matMenuTriggerFor`.

```typescript
constructor(@Optional() private readonly menuAim: MenuAIm) {}
```

1. When user hovers over a trigger that is a submenu, emit the trigger to `menuAim`. Trigger will keep track of:
 
    - latest item to be hovered over in the current menu.
    - direction of the cursor
    
1. Once the user is hovering over another menu, stop preventing hover events. If the user goes elsewhere, do the same.

## Misc ideas

### Multi-tier menus
Many apps have menus with multiple layers of sub-menus. Common menu-aim libraries only support one layer (...without bugs at least). We should keep track of the active menu item on each layer as more are activated.

### Hover listeners
It's expensive to bind multiple event listeners to every menu item. Especially if there are many being rendered at once. See if we can bind one listener per menu.

### Mouse tracker
The library will have to track mouse movement. It would be interesting to create a CDK tool that can calculate the direction of the user's mouse (top, top-left, left, bottom-left, bottom, bottom-right, top-right).

### Menu aim context
Create a provider that can keep track of which menu is being tracked. This should be safe because we realistically would never attempt to interact with two separate menus.
