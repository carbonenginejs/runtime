export { CjsHlslFormat, default } from "./CjsHlslFormat.js";

// Advanced surface, carried over from the standalone package: resolves one
// permutation to its raw effect/shader context, which tooling needs to reach
// stage bytecode before any backend translation.
export { readEffectAnalysis } from "./core/analysis.js";
