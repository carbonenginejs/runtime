# Public API classes

Status: Evolving
Scope: `@carbonenginejs/runtime-resource/formats/hlsl` package-root classes
Audience: Users, maintainers, and automated readers
Summary: Describes the supported reader class and the advanced exported binding-manifest class.

<!-- class:CjsHlslFormat -->
## `CjsHlslFormat`

CarbonEngineJS-facing reader for CCP's Tr2 compiled effect container format (`.sm_hi` / `.sm_lo` / `.sm_depth` bodies).

- Export: `@carbonenginejs/runtime-resource/formats/hlsl`
- Source: `src/CjsHlslFormat.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2EffectBindingManifest -->
## `Tr2EffectBindingManifest`

Carbon-backed binding manifest for register-named shader outputs.

- Export: `@carbonenginejs/runtime-resource/formats/hlsl`
- Source: `src/core/tr2/shader/Tr2EffectBindingManifest.js`
- Visibility: Public
- Kind: Adapted Carbon concept
