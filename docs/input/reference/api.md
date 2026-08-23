# API reference

Status: Evolving
Scope: `@carbonenginejs/runtime/input` subpath exports
Audience: Runtime integrators
Summary: Documents the host-window, state, cursor, and keyboard-scancode exports.

## `Tr2MainWindow`

Construct with optional injected `window`, `document`, `screen`, `target`,
`state`, `backBufferFormat`, and callback fields.

- `Attach(options)` installs host listeners and returns the instance.
- `Detach()` removes installed listeners and clears pressed-key state.
- `IsActive()`, `HasFocus()`, and `IsHidden()` report host state.
- `SetWindowState(state)`, `GetWindowState()`, `SanitizeState(state)`, and
  `GetDefaultState(mode)` manage cloned `Tr2MainWindowState` values.
- `SetMinimumSize(width, height)` and `GetWindowSizeOptions()` constrain and
  inspect browser-reported sizes.
- `SetWindowTitle(title)` and `GetWindowTitle()` adapt the document title.
- `SetMouseCursor(cursor)`, `GetMouseCursor()`, `ClipCursor()`, and
  `UnclipCursor()` manage CSS cursor and Pointer Lock behavior.
- `GetCursorPos()`, `Key(value)`, `IsKeyToggled(value)`, and
  `GetKeyNameText(value)` expose normalized pointer and keyboard state.
- `RequestFullscreen(options)`, `ExitFullscreen()`, and `Close()` adapt host
  lifecycle operations.

Callbacks include key, character, pointer button, pointer movement, wheel,
focus, close, resize, and swap-chain-change notifications. Assign either a
function or an object with a `Call(...args)` method.

## `Tr2MainWindowState`

The state record contains `adapter`, `presentInterval`, `height`, `width`,
`left`, `showState`, `windowMode`, and `top`.

- `SetValues(values)` updates known numeric fields.
- `GetValues()` returns a plain snapshot.
- `Clone()` returns an independent state.
- `RequiresDeviceReset(other)` compares reset-relevant fields.
- `toString()` returns a readable summary.

The class also exposes `PresentInterval`, `Tr2WindowMode`, and
`Tr2WindowShowState` constants.

## `Tr2MouseCursor`

The constructor and `Create()` accept a CSS keyword, URL, data URL,
canvas-like source, blob-like source, or alternate representations.
`IsValid()` reports whether a CSS cursor was built, `Apply(target)` writes it
to `target.style.cursor`, and `Destroy()` releases any object URL.

## Keyboard exports

`UIScancode` stores `mDIK`, `mName`, `mDescription`, and `browserCode`.
`UIScancode.fromKeyboardEvent(event)` returns a known mapping or a fallback
record.

`SCANCODES` is the immutable maintained mapping list.
`GetUIScancode(value)` looks up a `UIScancode`, numeric value, browser code,
or maintained name and returns a matching record or `null`.

## Related documentation

- [Architecture](../architecture.md)
- [Browser capability boundaries](browser-boundaries.md)
- [Class catalog](classes/README.md)
