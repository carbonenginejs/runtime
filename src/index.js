// The default runtime surface is populated only by reviewed donor migrations.
export * from "./global/index.js";
export * from "./resource/index.js";
export * from "./trinity/index.js";
export * from "./sof/index.js";
export * from "./audio/index.js";
export * from "./character/index.js";
export * from "./input/index.js";
export * from "./core/index.js";

// The aggregate surface keeps each shared identity owned by its lowest layer.
// Explicit exports resolve compatibility re-exports from higher layers without
// creating a second implementation or an ambiguous package-root binding.
export { ReflectionMode, Tr2Lod } from "./global/index.js";
export {
    Tr2EffectConstant,
    Tr2EffectDefine,
    Tr2EffectDescription,
    Tr2EffectLibrary,
    Tr2EffectParameterAnnotation,
    Tr2EffectResource,
    Tr2EffectStageInput,
    Tr2EffectTechnique,
    Tr2Pass,
    Tr2SamplerSetup,
    Tr2Shader
} from "./resource/index.js";
