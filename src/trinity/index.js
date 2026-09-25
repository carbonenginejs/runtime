// @carbonenginejs/runtime/trinity
/**
 * The Trinity and Eve object graph with its CPU-side behaviour. This root entry
 * aggregates every family; the focused subpaths (`/trinity/eve`,
 * `/trinity/core`, `/trinity/shader`, ...) let a consumer import one.
 *
 * Importing any of them creates no graphics device or backend context: the
 * process-wide device (`gTriDev`) is constructed on first read, and a render
 * context drives the headless AL stub until an engine installs its own.
 *
 * ```js
 * import { EveCamera } from "@carbonenginejs/runtime/trinity/eve";
 *
 * const camera = new EveCamera();
 * camera.translationFromParent = 100;
 * camera.Update(0, 16 / 9);
 * const view = camera.GetViewMatrix();
 * ```
 */
export * from "./controllers/index.js";
export * from "./curves/index.js";
export * from "./eve/index.js";
export * from "./particle/index.js";
export * from "./postProcess/index.js";
export * from "./sprite2d/index.js";
export * from "./renderJob/index.js";
export * from "./shader/index.js";
export * from "./utilities/index.js";
export * from "./core/index.js";
export * from "./ui/index.js";
export * from "./generated/index.js";
