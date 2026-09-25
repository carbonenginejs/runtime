/**
 * WebGPU format: reads and builds Carbon version-15 effect containers whose
 * stage program slots carry WGSL, translating supported DX11 SM5.0 vertex and
 * fragment DXBC plus a closed set of exact compute profiles.
 *
 * Owns effect analysis, DXBC-to-IR lowering, WGSL emission, pass-global
 * binding plans and the per-pass WebGPU backend block. Unsupported semantics
 * fail closed with an explicit diagnostic. It takes bytes, creates no GPU
 * objects and never imports a toolchain; `hlsl` parses effects, `dxbc` decodes
 * stages, and `trinityal/webgpu` realizes the result.
 *
 * How this module works is in README.md in this folder.
 */
export { CjsWebgpuFormat, default } from "./CjsWebgpuFormat.js";
