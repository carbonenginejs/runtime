/**
 * Browser input leaf: host-window state, keyboard and pointer listeners,
 * CSS cursors and Carbon-shaped callbacks, adapted from browser window and
 * DOM facilities.
 *
 * - Hosts are injected: `Tr2MainWindow` takes `window`, `document`,
 *   `screen` and `target` objects, so tests and non-browser tools can supply
 *   compatible ones, and the data classes work headlessly. Importing a module
 *   installs no listeners; only `Attach()` does.
 * - Changed window state is reported through `onWindowStateChange` as
 *   intent. This layer performs no device reset and emits no
 *   swap-chain/device-reset events; composition and the engine own those.
 * - Native window handles, message pumps, cursor warping and display-mode
 *   enumeration are unavailable to browser scripts; the matching methods
 *   return explicit unsupported results instead of claiming success.
 * - Gamepad, touch gestures, IME composition and WebXR input are not
 *   implemented.
 */
export * from "./Tr2MainWindow.js";
export * from "./Tr2MainWindowState.js";
export * from "./Tr2MouseCursor.js";
export * from "./UIScancode.js";
