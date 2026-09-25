/**
 * WebGL format: builds and reads Carbon effect containers whose stage programs
 * are GLSL ES 3.00, translating supported DXBC vertex, pixel and bounded
 * map-style compute stages.
 *
 * Owns the shared Carbon v15 container for the WebGL backend (GLSL in each
 * stage's program slot), preservation of every source permutation and unique
 * body identity, backend bodies/stages/programs/manifests/render states, and
 * rejection of incomplete or inconsistent packages. It creates no live shader
 * or GPU objects.
 *
 * Elsewhere: the `hlsl` format parses the compiled effect and its
 * permutations; the `dxbc` format decodes stage bytecode; the resource layer
 * owns `Tr2EffectRes`, option selection, per-permutation cache identity and
 * `Tr2Shader`; trinity owns the `Tr2Effect`/`Tr2Material` facade, parameters
 * and sampler overrides; the WebGL engine owns program compilation, locations,
 * binding, uploads, draws and context recovery. Runtime code reads the emitted
 * container bytes directly; this module never imports a toolchain.
 */
export { CjsWebglFormat, default } from "./CjsWebglFormat.js";
