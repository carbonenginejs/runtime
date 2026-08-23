# Architecture

Status: Evolving
Scope: `@carbonenginejs/runtime/input` implementation boundaries
Audience: Runtime integrators and maintainers
Summary: Explains host injection, event normalization, state ownership, and unsupported native operations.

## Ownership boundary

The package owns the browser-facing input leaf: host-window state, keyboard
and pointer event attachment, cursor realization, and the related
Carbon-shaped callbacks. It does not own scene interaction, rendering,
device-resource reset, or presentation orchestration.

Changed window state is emitted as input-layer intent through
`onWindowStateChange`. The input layer does not report before/after swap-chain
events because it neither owns nor performs a device reset; composition and the
selected engine own that lifecycle.

## Host adapters

`Tr2MainWindow` accepts injected `window`, `document`, `screen`, and target
objects. This keeps host access explicit and lets tests or non-browser tools
provide compatible objects. If no host is attached, the exported data classes
remain usable headlessly.

```text
window/document/target
    -> DOM listeners
    -> keyboard and pointer normalization
    -> Tr2MainWindow state
    -> caller callbacks
```

`Attach()` installs listeners on the supplied hosts. `Detach()` removes those
listeners and clears pressed-key state. The package does not install global
listeners merely by being imported.

External functions and callback-shaped host objects are normalized once to the
dependency-floor `CjsScriptCallback` contract when assigned. Event paths call
its required `CallVoid` or `Call` method directly; they do not repeatedly probe
owned callback shapes.

## State and vocabulary

- `Tr2MainWindowState` owns window mode, size, position, adapter, visibility,
  and presentation interval values.
- `UIScancode` maps `KeyboardEvent.code` values to the package's maintained,
  bounded Carbon-compatible virtual-key vocabulary. Canonical records are
  frozen because lookup maps share their identities.
- `Tr2MouseCursor` converts supported cursor inputs into CSS cursor values and
  manages object-URL cleanup.

## Browser security boundary

Native window handles, synchronous native message pumps, system cursor
warping, and native display-mode enumeration are unavailable to browser
scripts. Compatibility methods expose explicit unsupported results instead
of reporting a native operation as successful. See
[reference/browser-boundaries.md](reference/browser-boundaries.md).
