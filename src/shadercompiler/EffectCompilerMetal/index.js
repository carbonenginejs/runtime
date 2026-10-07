// Source: trinity/shadercompiler/EffectCompilerMetal.h (declaration order)
// Source: trinity/shadercompiler/MSLInclude.h
//
// Carbon's Metal effect compiler. `EffectCompilerMetal` implements Carbon's
// `EffectCompilerBase` interface (`Create`, `CompileEffect`) for the
// driver's `PLATFORM_METAL`; each stage's program is its Metal source, as
// Apple's `metal` tool cannot run here (see EffectCompilerMetal.js).
//
// `AtomicFn`, `PatchShaderType` and `SyncData` are file-local or private in
// Carbon and are not exported.

export { MetalRegister } from "./MetalRegister.js";
export { MetalSystemSemanticsType } from "./MetalSystemSemanticsType.js";
export { EffectCompilerMetal } from "./EffectCompilerMetal.js";
export { MSL_INCLUDE } from "./mslInclude.js";
