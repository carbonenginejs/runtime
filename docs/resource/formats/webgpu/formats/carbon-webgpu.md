# Carbon WebGPU WGSL set and resource transforms

Status: Evolving
Scope: `@carbonenginejs/runtime/resource/formats/webgpu`
Audience: Shader-tool authors and engine integrators
Summary: The WGSL-set and resource-transform interface between the WebGPU format producer and the `trinityal/webgpu` consumer.

A `.carbonwebgpu` file is a stock Carbon version-15 effect container whose
program slots carry WGSL; its byte layout, including the per-pass optional
trailing block, is the
[shared Carbon container](../../carbon-effect-container.md). This page covers
only the derived WGSL set the format produces and `trinityal/webgpu` consumes.

## Structured WGSL set

`CJS_WGSL_SET` (currently version 3) contains shader descriptors and
pass-level layouts. A layout records the numeric bind group and binding slots
already present in the WGSL source.

Each binding keeps:

- a D3D-derived base `identity`;
- a resource-resolution `scopeIdentity`;
- stage visibility;
- the buffer, texture, or sampler layout; and
- its numeric group and binding.

Resource tuples are stage-scoped unless the caller explicitly proves one
compatible shared identity. The builder rejects duplicate scopes, duplicate
numeric slots, mixed shared and stage-scoped forms, a shared identity that
covers fewer than two stages, and stage/layout conflicts. It never renumbers
slots during set assembly.

The wire does not keep the original `scopeIdentity`: a multi-stage shared
binding rereads as stage-qualified, so do not infer the original sharing
decision from a reread set.

## Version 3 resource transforms

A set carries `resourceTransforms` when the compiler proves that several
logical source resources can be represented by one physical WebGPU resource.
Each entry is a realization recipe; the matching physical layout binding
carries `transformId` and `arrayLayerCount`.

The supported recipe is version 1, `kind: "texture-2d-array"`. Inputs are
ordered by fixed array layer. The output reuses layer zero's D3D identity and
slot, and later logical inputs do not remain as physical bindings.

`representation: "native-or-rgba8"` requires the consumer to assemble one
compatible `texture_2d_array` from the named inputs, either in a shared native
format or after decoding every layer to RGBA8. Dimensions, mip coverage,
sample type, and texture format must agree. `missingLayer: "reject"` forbids a
fallback layer.

The set builder fails closed unless every recipe:

- targets an emitted fragment stage in its own pass;
- links exactly one `texture_2d_array<f32>` physical binding;
- numbers distinct inputs contiguously from layer zero;
- matches the binding's identity, view dimension, and layer count; and
- removes only the later input scopes from that recipe's owning pass.

Analysis and reflection are pre-transform and still list every declared
register; the layout is post-transform. Consumers discriminate by feature:
a binding with `transformId` needs assembled layers, while a source-declared
`texture_2d_array` binding has no `transformId` and needs no assembly.

`trinityal/webgpu` accepts WGSL-set versions 1, 2, and 3, gates the version-2
identity rules with `formatVersion >= 2`, and realizes the version-1
`texture-2d-array` recipe. Unsupported recipe kinds or versions fail closed.
