# Package documentation

Status: Evolving
Scope: `@carbonenginejs/runtime-input`
Audience: Runtime integrators and maintainers
Summary: Documentation home for browser host-window, keyboard, pointer, and cursor adapters.

## Purpose

`@carbonenginejs/runtime-input` adapts browser window and DOM input facilities
to Carbon-shaped main-window state and callback contracts.

```js
import {
    Tr2MainWindow,
    Tr2MainWindowState
} from "@carbonenginejs/runtime-input";

const state = new Tr2MainWindowState({ width: 1280, height: 720 });
const mainWindow = new Tr2MainWindow({ window, document, state });
```

## Maintained scope

- Host-window state, focus, visibility, size, title, and lifecycle callbacks.
- Keyboard state and browser-code to Carbon scancode mapping.
- Pointer position, button, movement, and wheel callbacks.
- CSS cursor creation and application.
- Browser Pointer Lock and Fullscreen request adapters.

Gamepad, touch gestures, spacemouse, IME composition, and WebXR input remain
outside the current implementation.

## Start here

- [Architecture](architecture.md)
- [API reference](reference/api.md)
- [Browser capability boundaries](reference/browser-boundaries.md)
- [Class catalog](reference/classes/README.md)
