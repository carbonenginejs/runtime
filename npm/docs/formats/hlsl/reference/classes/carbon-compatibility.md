# Carbon compatibility classes

Status: Evolving
Scope: `@carbonenginejs/runtime-resource/formats/hlsl` package-local compatibility classes
Audience: Maintainers and automated readers
Summary: Describes internal utilities and Carbon-shaped compatibility records used by the reader.

<!-- class:CjsBinaryReader -->
## `CjsBinaryReader`

Little-endian binary reader for Carbon/Trinity compiled effect data.

- Export: None
- Source: `src/carbon/cjs/CjsBinaryReader.js`
- Visibility: Internal
- Kind: Internal implementation

<!-- class:CjsEffectReadError -->
## `CjsEffectReadError`

Error raised when a Carbon/Trinity effect payload cannot be decoded safely.

- Export: None
- Source: `src/carbon/cjs/CjsEffectReadError.js`
- Visibility: Internal
- Kind: Internal implementation

<!-- class:CjsEffectStateManager -->
## `CjsEffectStateManager`

In-memory JavaScript substitute for Carbon's effect state manager registry.

- Export: None
- Source: `src/carbon/cjs/CjsEffectStateManager.js`
- Visibility: Internal
- Kind: Adapted Carbon concept

<!-- class:CjsRenderStateSetup -->
## `CjsRenderStateSetup`

JavaScript mirror of a registered Carbon render-state setup.

- Export: None
- Source: `src/carbon/cjs/CjsRenderStateSetup.js`
- Visibility: Internal
- Kind: Adapted Carbon concept

<!-- class:CjsResourceSetDescription -->
## `CjsResourceSetDescription`

JavaScript mirror of Carbon's resource-set descriptor builder.

- Export: None
- Source: `src/carbon/cjs/CjsResourceSetDescription.js`
- Visibility: Internal
- Kind: Adapted Carbon concept

<!-- class:CjsShaderBytecode -->
## `CjsShaderBytecode`

JavaScript stand-in for Carbon's shader-bytecode handle payload.

- Export: None
- Source: `src/carbon/cjs/CjsShaderBytecode.js`
- Visibility: Internal
- Kind: Adapted Carbon concept
