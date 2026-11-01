/**
 * Compatibility aggregate for the resource API. Geometry, textures and light
 * profiles now live in Trinity; their exports retain the same class identities.
 * Shader formats and plain reflection live here; runtime shader and material
 * classes are exported only by Trinity. Import individual formats through their subpaths.
 * Resource management and lifecycle are owned by Blue.
 */
export * from "../trinity/resources/resourceBoundary.js";
export * from "../trinity/resources/Tr2LightProfileRes.js";
export * from "./geometry/index.js";
export * from "./shader/index.js";
export * from "../trinity/resources/texture/index.js";
export * from "../core/platform/video/index.js";
export * from "./format/CjsResourceProbe.js";
export * from "./format/CjsFormat.js";
export { CjsEventEmitter } from "#model";
// The manager core moved to Blue (global/blue); re-exported for consumers of
// @carbonenginejs/runtime/resource.
export {
  CjsLoadingObject,
  BlueAsyncRes,

  ResourceHandlerMode,


  CjsFormatRoute,
  CjsFormatStore,
  MotherLode,
  getMotherLodeKey,
  CjsResManMainThreadLoader,
  CjsResManWorkerLoader,
  BlueResManQueue,
  BlueResMan
} from "#blue";

export { destroyAdapterValue } from "../trinity/core/device/Tr2DeviceResource.js";
