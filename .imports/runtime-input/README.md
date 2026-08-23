# @carbonenginejs/runtime-input

Browser host-window, keyboard, pointer, and cursor adapters for CarbonEngineJS.

Use this package to translate DOM window and input events into Carbon-shaped
main-window callbacks and state. It can also run headlessly with injected
host objects. Gamepad, touch gestures, spacemouse, IME composition, and WebXR
input are not implemented by the current package.

## Install

```sh
npm install @carbonenginejs/runtime-input
```

## Quick start

```js
import { Tr2MainWindow } from "@carbonenginejs/runtime-input";

const mainWindow = new Tr2MainWindow({
    window,
    document,
    target: document.documentElement
});

mainWindow.onKeyDown = (scancode, repeated, event) => {
    console.log(scancode, repeated, event.code);
};

mainWindow.onMouseMove = (x, y, dx, dy) => {
    console.log({ x, y, dx, dy });
};
```

Call `Detach()` when the host no longer owns the listeners:

```js
mainWindow.Detach();
```

## Documentation

- [Package documentation](docs/README.md)
- [Architecture](docs/architecture.md)
- [API reference](docs/reference/api.md)
- [Browser capability boundaries](docs/reference/browser-boundaries.md)
- [Class catalog](docs/reference/classes/README.md)

## License

MIT. See [LICENSE](LICENSE) and [NOTICE](NOTICE).

CarbonEngine and CCP Games names are used for interoperability and provenance
context. This project is not affiliated with or endorsed by CCP Games.
