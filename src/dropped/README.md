# Dropped Character classes — deliberately not exported

This directory owns Carbon shapes used only by the character/interior domain
that CarbonEngineJS deliberately does not register as runtime models. Every
file here must have a named disposition below. Nothing in this directory is
exported, bundled, or imported by runtime code.

## Per-file disposition

| File | Why runtime-character owns it | Why it is dropped | Replacement |
|---|---|---|---|
| `TriMatrix.js` | The only runtime schema references are `Tr2InteriorPlaceable.transform` and `Tr2SkinnedObject.transform`, both owned by runtime-character. | Carbon `TriMatrix` is a Blue/Python scripting wrapper over a native row-major matrix. Registering the generated shell would expose sixteen unknown nullable fields and throwing methods, while delegating it directly to gl-matrix would silently change matrix orientation. | Character graph and runtime transforms use column-major `@carbonenginejs/runtime-utils/mat4`; transpose occurs only at an engine shader-upload boundary. The authored references remain typed as `TriMatrix` until their interior serialization shape is resolved. |

## Revival rule

Do not export or implement a file in this directory. Reviving `TriMatrix`
requires an explicit serialized-shape decision for the two character fields
and a conversion contract between Carbon's row-major wrapper and runtime-utils'
column-major matrices. Move it into maintained character source only after
that decision and add focused round-trip tests.
