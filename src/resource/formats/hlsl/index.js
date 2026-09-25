/**
 * HLSL format: reader for Carbon/Trinity compiled effect containers
 * (`.sm_hi`, `.sm_lo`, `.sm_depth`).
 *
 * Owns the container boundary: header, string table, permutation selection,
 * effect descriptions, techniques, passes, render states, stage metadata,
 * signatures, and the packaging of opaque shader bytecode. Stage bytecode is
 * decoded by the `dxbc` format and lowered by the `webgl`/`webgpu` formats.
 * Canonical `Tr2EffectRes`/`Tr2Shader` construction, selection and caching
 * belong to the resource layer; the mutable effect/material facade belongs to
 * trinity; GPU realization belongs to the engine backends.
 *
 * The `Hlsl*` classes under `core/` are internal parser DTOs, not canonical
 * runtime model identity and not package entry points.
 */
export { CjsHlslFormat, default } from "./CjsHlslFormat.js";

// Advanced surface, carried over from the standalone package: resolves one
// permutation to its raw effect/shader context, which tooling needs to reach
// stage bytecode before any backend translation.
export { readEffectAnalysis } from "./core/analysis.js";
