# @carbonenginejs/runtime-input

Optional, swappable browser input subsystem: host-window, cursor, keyboard,
mouse/touch, gamepad, spacemouse, and XR adapters.

Part of the CarbonEngineJS JavaScript runtime/engine tier (browser-first,
WebGPU-first). Ports and adapts CarbonEngine source; ccpwgl is consulted only
as a secondary browser-shaped reference.

## Status

The first maintained slice owns Carbon's `Tr2MainWindow`,
`Tr2MainWindowState`, `Tr2MouseCursor`, and `UIScancode` vocabulary. Native
handles and message pumps are replaced with injected browser
`window`/`document`/`screen`/element contracts, DOM events, CSS cursors,
Pointer Lock, and Fullscreen APIs. The package remains importable headlessly.

Browser security boundaries are explicit: scripts cannot warp the system
cursor, enumerate native display modes, read an HWND, or synchronously force
pointer lock/fullscreen. Those methods return an unsupported result or expose
the browser's asynchronous API instead of pretending Carbon's desktop call
succeeded.

The package remains a leaf: it emits normalized events, poses, and rays and
never intersects or mutates the Trinity graph. VR input belongs here; session,
framebuffer, and presentation orchestration belongs to the client and engine.

## Provenance

CarbonEngine and Fenris Creations (CCP Games) are named for interoperability
and provenance context. This package is not affiliated with or endorsed by
CCP Games.
