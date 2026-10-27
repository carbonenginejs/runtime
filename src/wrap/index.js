/**
 * Tny: optional application-facing wrappers over the engine (cameras, the
 * transform gizmo, selection outlines, the shared input router and the
 * storage/database services). Wrap may import core, sof, trinity, resource,
 * input and global; nothing in the runtime imports wrap. Consumers construct
 * these classes directly.
 */
export * from "./input/TnyInputMan.js";
export * from "./cameras/index.js";
export * from "./gizmos/index.js";
export * from "./outline/index.js";
export * from "./services/index.js";
