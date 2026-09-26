# WebGPU format

Reads and builds Carbon effect containers whose program slots carry WGSL, and
lowers supported DXBC stages to WGSL. `CjsWebgpuFormat` is the only export.

## What it owns

- Reading, inspecting and building `.carbonwebgpu` containers: a stock Carbon
  version-15 compiled-effect container (layout in the package guide
  `docs/resource/formats/carbon-effect-container.md`). Translated stages carry
  UTF-8 WGSL in `shaderData`; an untranslated or unsupported stage keeps its
  reflection with a zero-length program. Each translated pass may carry one
  optional trailing block (backend engine ID 2) with bind-group layouts and
  resource transforms.
- Resolving one compiled-effect permutation and complete pass, and preserving
  every source permutation row and representable non-program description
  field (including non-dynamic sampler names and authored stage order).
- Effect/stage/binding analysis, DXBC-to-IR lowering with structured control
  flow, WGSL emission, one pass-global binding plan with explicit stage scope,
  and the derived `CJS_WGSL_SET` (see `core/wgsl/buildWgslSet.js` and the
  package page `docs/resource/formats/webgpu/formats/carbon-webgpu.md`).

There is no WebGPU-specific magic, envelope or version. Backend identity comes
from the resource path (`effect.webgpu/`), as Carbon selects `effect.dx11/`;
`isCarbonWebgpu` is only a version-15 shape check. Every lowerer emits entry
point `main`, so it is not stored. Reads validate the shared Carbon records,
then reject any program-bearing stage other than vertex, pixel or compute.

## Elsewhere

- `formats/hlsl`: compiled-effect parsing, permutation resolution, unique
  bodies, binding manifests.
- `formats/dxbc`: DXBC container and instruction decoding.
- `trinityal/webgpu`: `GPUDevice`, shader modules, bind groups, pipelines,
  resource realization, device loss, draws, and assembly of transformed
  texture arrays.
- The resource layer: effect-resource lifecycle, permutation selection,
  `Tr2Shader` hydration, shader caching. Trinity: effect/material facades.
- Node tooling: file acquisition, caching, reports. This module takes bytes,
  never reads files or processes, and runs in browsers.

## Translation target and boundaries

The target is DX11 SM5.0 vertex and fragment bytecode. SM5.1 input is admitted
where its ranges are finite and canonical; DX12 bindless ranges are
comparison-only. Compute programs go first to the exact profiles routed by
`core/wgsl/lowerComputeProgram.js`; a compute program no profile claims lowers
through the fragment lowerer's general instruction set
(`lowerGeneralComputeProgram`), including structured group-shared memory, and
fails closed on anything outside it. `system/crash` is refused by path before
any translation (`rejectRefusedEffect` in `core/packageEffect.js`), so a wider
general path can never let it through.

Unsupported semantics fail with an explicit diagnostic rather than a partially
translated pass. Rejected inputs:

- globally non-refactorable shaders (`dcl_global_flags` without
  `REFACTORING_ALLOWED`); per-op `precise` is adapted instead
  (`core/wgsl/precisionControls.js`);
- DX12 bindless or unbounded resource ranges, and any non-singleton range;
- `imul`/`umul` high-half results;
- dynamic selection of the constant buffer itself (only the vector index may
  be dynamic);
- non-immediate `resinfo` mips; texture dimensions other than 2D, cube, 3D and
  2D array (for example cube arrays and MSAA) in sampled layouts;
- render-stage typed `Buffer` SRVs, non-uint typed buffer UAVs, and
  pixel-stage or read-write UAV textures, whose bound format is not known. The
  format comes from where Carbon creates the resource, by effect parameter
  name (`../hlsl/core/carbonTypedViews.js`, backend-neutral; the WGSL mapping is `core/wgsl/wgslTypedViews.js`), and travels in the binding plan;
  anything not listed there stays rejected (`typedBufferLayout` and
  `storageTextureLayout` in `core/wgsl/lowerBindingLayout.js`);
- immediate offsets outside the 2D `sample`/`sample_b`/`sample_d`/`sample_l`
  family, including offset `ld` and non-2D sampling;
- mutable relative `indexable_temp` registers, and subroutine control flow
  (`call`, `callc`, `label`, `interface_call`);
- geometry, hull and domain programs (their reflection stays, with empty
  program slots);
- sampler modes other than `default`; fragment interpolation other than
  `linear` and `linear_noperspective`; minimum-precision kinds other than
  `float_16` (promoted to f32); vertex system values other than
  `SV_Position`, `SV_VertexID`, `SV_InstanceID`, fragment system inputs other
  than `SV_Position`, `SV_IsFrontFace`, and outputs other than `SV_Target`.

Each accepted input whose WGSL semantics deliberately differ from D3D is
documented at its lowering site: `expressionFor` and `applyModifier` in
`core/wgsl/lowerFragmentProgram.js` (numeric, modifier, load, sample and
`resinfo` rules), `precisionControls.js`, `uniformity.js` with the
derivative-uniformity directive in `emitWgsl.js`, `hoistEscapingValues.js`,
`selectionPlans.js` (merges), `core/ir/inferValueTypes.js` (typeless
registers) and `core/ir/indexableTemps.js`. Unless a site says otherwise,
WGSL float operations keep WGSL's rounding, denormal, zero-sign and
finite-math latitude.

## Exact compute profiles are closed

The exact profiles (`setdrawparameters`, `setsortargs`, particle `sortstep`,
`sort`, `sortinner`, `clear`, `emit`, `createhistograms`, `mergehistograms`,
and structured skinning) complete the audited GPU particle pipeline. Do not
add more package-specific exact profiles: new compute coverage (for example
`particles/gpu/update` or `computelightlists`) belongs in the general typed IR
path with reusable thread-group memory, barrier, atomic and loop lowering.
Each exact profile is pinned to its audited bytecode, so a game-build shader
recompile demotes that package to unsupported until it is re-audited; a
corpus rebuild after a build bump is the re-qualification gate.

## Completeness

`BuildEffect` reports `qualification.packageValid` for structural validity
only; `backendComplete` and `runtimeComplete` stay false. Browser validation
proves emitted WGSL is valid and runs, not that it is semantically equivalent
to D3D; semantic choices follow the Direct3D 11 functional specification.
