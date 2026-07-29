# Tr2 effect-model classes

Status: Evolving
Scope: `@carbonenginejs/runtime-resource/formats/hlsl` internal Tr2 graph
Audience: Maintainers and automated readers
Summary: Describes internal parser DTOs for resource, permutation, effect, pass, and stage metadata; these are not canonical runtime-resource classes.

Every same-named `Tr2*` entry in this catalog is package-internal binary parser
state. Canonical device-free runtime `Tr2EffectRes`, `Tr2Shader`, and reflection
identity belong to `@carbonenginejs/runtime-resource`.

<!-- class:Tr2EffectRes -->
## `Tr2EffectRes`

Carbon/Trinity effect resource reader for compiled shader metadata.

- Export: None
- Source: `src/core/tr2/resources/Tr2EffectRes.js`
- Visibility: Internal
- Kind: Adapted Carbon concept

<!-- class:Tr2ShaderPermutation -->
## `Tr2ShaderPermutation`

Trinity shader permutation axis and option metadata.

- Export: None
- Source: `src/core/tr2/resources/Tr2ShaderPermutation.js`
- Visibility: Internal
- Kind: Adapted Carbon concept

<!-- class:Tr2EffectConstant -->
## `Tr2EffectConstant`

Constant-buffer parameter metadata read from a Trinity effect body.

- Export: None
- Source: `src/core/tr2/shader/Tr2EffectConstant.js`
- Visibility: Internal
- Kind: Adapted Carbon concept

<!-- class:Tr2EffectDescription -->
## `Tr2EffectDescription`

Trinity effect-description body decoded from one compiled permutation record.

- Export: None
- Source: `src/core/tr2/shader/Tr2EffectDescription.js`
- Visibility: Internal
- Kind: Adapted Carbon concept

<!-- class:Tr2EffectLibrary -->
## `Tr2EffectLibrary`

Ray-tracing shader library metadata from v14+ Trinity effects.

- Export: None
- Source: `src/core/tr2/shader/Tr2EffectLibrary.js`
- Visibility: Internal
- Kind: Adapted Carbon concept

<!-- class:Tr2EffectParameterAnnotation -->
## `Tr2EffectParameterAnnotation`

Parameter annotation value attached to a Trinity effect parameter.

- Export: None
- Source: `src/core/tr2/shader/Tr2EffectParameterAnnotation.js`
- Visibility: Internal
- Kind: Adapted Carbon concept

<!-- class:Tr2EffectResource -->
## `Tr2EffectResource`

Shader resource or UAV metadata read from a Trinity effect body.

- Export: None
- Source: `src/core/tr2/shader/Tr2EffectResource.js`
- Visibility: Internal
- Kind: Adapted Carbon concept

<!-- class:Tr2EffectStageInput -->
## `Tr2EffectStageInput`

Decoded per-stage input metadata for constants, resources, samplers, and signatures.

- Export: None
- Source: `src/core/tr2/shader/Tr2EffectStageInput.js`
- Visibility: Internal
- Kind: Adapted Carbon concept

<!-- class:Tr2EffectTechnique -->
## `Tr2EffectTechnique`

Trinity effect technique containing passes and optional shader libraries.

- Export: None
- Source: `src/core/tr2/shader/Tr2EffectTechnique.js`
- Visibility: Internal
- Kind: Adapted Carbon concept

<!-- class:Tr2Pass -->
## `Tr2Pass`

Trinity effect pass containing shader stages, resource metadata, and render state.

- Export: None
- Source: `src/core/tr2/shader/Tr2Pass.js`
- Visibility: Internal
- Kind: Adapted Carbon concept

<!-- class:Tr2SamplerDescription -->
## `Tr2SamplerDescription`

Trinity sampler descriptor read from compiled effect metadata.

- Export: None
- Source: `src/core/tr2/shader/Tr2SamplerDescription.js`
- Visibility: Internal
- Kind: Adapted Carbon concept

<!-- class:Tr2SamplerSetup -->
## `Tr2SamplerSetup`

Trinity sampler binding that pairs a metadata name with a sampler descriptor.

- Export: None
- Source: `src/core/tr2/shader/Tr2SamplerSetup.js`
- Visibility: Internal
- Kind: Adapted Carbon concept

<!-- class:Tr2Shader -->
## `Tr2Shader`

Trinity shader wrapper around a decoded `Tr2EffectDescription`.

- Export: None
- Source: `src/core/tr2/shader/Tr2Shader.js`
- Visibility: Internal
- Kind: Adapted Carbon concept

<!-- class:Tr2ShaderOption -->
## `Tr2ShaderOption`

Name/value shader permutation option used during effect lookup.

- Export: None
- Source: `src/core/tr2/shader/Tr2ShaderOption.js`
- Visibility: Internal
- Kind: Adapted Carbon concept
