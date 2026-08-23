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

## State and vocabulary

- `Tr2MainWindowState` owns window mode, size, position, adapter, visibility,
  and presentation interval values.
- `UIScancode` maps `KeyboardEvent.code` values to the package's maintained
  Carbon-compatible virtual-key vocabulary.
- `Tr2MouseCursor` converts supported cursor inputs into CSS cursor values and
  manages object-URL cleanup.

## Browser security boundary

Native window handles, synchronous native message pumps, system cursor
warping, and native display-mode enumeration are unavailable to browser
scripts. Compatibility methods expose explicit unsupported results instead
of reporting a native operation as successful. See
[reference/browser-boundaries.md](reference/browser-boundaries.md).
