# Browser capability boundaries

Status: Stable
Scope: `@carbonenginejs/runtime/input` browser compatibility behavior
Audience: Runtime integrators
Summary: Records where browser security and event-loop rules replace native main-window operations.

## Explicit unsupported results

- `SetCursorPos()` returns `false`; browser scripts cannot warp the system
  cursor.
- `GetHwndAsLong()` returns `0`; browsers do not expose native window handles.
- `SetWindowsMessageFilter()` returns `false`.
- `GetWindowsMessageFilter()` returns `[false, []]`.
- `ProcessMessages()` reports whether the adapter is open; the browser owns
  and drains its event loop.

These results are compatibility boundaries, not successful native operations.

## Permission-controlled requests

`ClipCursor()` uses `requestPointerLock()` when available. `RequestFullscreen()`
uses `requestFullscreen()` when available. Browsers can require a user gesture
or reject either request. Depending on the host API, these methods can return
`false`, a synchronous success value, or a promise.

`UnclipCursor()` and `ExitFullscreen()` call the corresponding document
methods when present.

## Display state

`GetWindowSizeOptions()` reports unique dimensions exposed by the current
window and screen objects. It does not enumerate native display modes.
`SanitizeState()` clamps the requested size to injected browser dimensions
and always uses adapter index zero.
