// @carbonenginejs/runtime/trinity
/**
 * The Trinity and Eve object graph with its CPU-side behaviour. This root entry
 * aggregates every family; the focused subpaths (`/trinity/eve`,
 * `/trinity/core`, `/trinity/shader`, ...) let a consumer import one.
 *
 * Importing any of them creates no graphics device or backend context:
 * `trinity.device` (Carbon's `gTriDev`) is null until the host calls
 * `trinity.Initialize({ renderContextAL })` with the backend it chose.
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
export * from "./raytracing/index.js";
export * from "./generated/index.js";
export * from "./font/index.js";
export * from "./CjsTrinity.js";
export * from "./resources/index.js";
