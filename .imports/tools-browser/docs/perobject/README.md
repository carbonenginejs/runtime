# `@carbonenginejs/tools-browser/perobject`

Status: Evolving
Scope: `@carbonenginejs/tools-browser/perobject`
Audience: Shader-tool authors and runtime integrators
Summary: Explains Carbon per-object constant-buffer layout, synthesis, packing, and decoding.

Carbon per-object constant-buffer ABI, layout packer, value synthesizer, and a
decoder that names the anonymous `cbN[i]` slots in a translated shader.

Provenance: struct declarations and fill logic are read from CarbonEngine
source (CCP Games). Every struct entry carries a `file:line` cite. Historical
ccpwgl implementations are comparative evidence, not source authority for
CarbonEngineJS.

## Why this exists

Carbon does not pack per-object data by reflection. It `memcpy`s the C++ struct
into the constant buffer (`EveSpaceObject2.cpp:1469-1483`), so **the C++ struct
layout is the byte layout the shader reads**. That makes the ABI derivable from
the headers, which matters because the shader packages cannot supply it:

| Buffer | Member names available? | From where |
| --- | --- | --- |
| `cb0` `$LocalConstants` | yes | `@carbonenginejs/runtime-resource/formats/hlsl` binding manifest (`bindings[].carbon.constants`), carried by the runtime-resource WebGL and WebGPU format subpaths |
| `cb1`–`cb4` | **no, at any layer** | this package, from the Carbon C++ structs |

`cb1`–`cb4` carry no names anywhere because Carbon's own shader compiler strips
reflection from the persisted stage blob. A translated shader declares them
positionally and that is all the information the file has.

**Relationship to `runtime-trinity` (changed 2026-07-28).** This package
originally supplied the packer `RawDataStore` required and no package provided.
That requirement is gone: `runtime-trinity` now carries Carbon's layout itself
in `CjsPerObjectLayouts`, because the physical layout turned out not to be
backend-specific (see the table above — every backend declares a flat vec4
array, and std140's stride for one matches tight C++ packing).

This package no longer declares the layouts. It imports them from
`runtime-trinity` through the narrow `./perobject` subpath, which resolves to a
single leaf module with no imports of its own — the package root would drag in
the whole runtime, so it stays outside the browser-safety boundary. That
boundary is enforced by `test/browser-safety.test.js`, which allows
`runtime-trinity/perobject` and nothing else from that package.

What lives here is the part a tool needs and a runtime does not:

- the HLSL names a shader declares, for naming an anonymous `cbN[i]` slot
- the constant-buffer register each stage binds to
- byte-level geometry — byte offsets and register/component positions —
  which `runtime-trinity` has no use for, because it writes through named fields
- value synthesis, and identifying which struct explains a given uniform size

## Register convention

From `Tr2Renderer.cpp:37-43` (engine) and `shadercompiler/ParserUtils.cpp:523-561`
(compiler, which maps a declared cbuffer *name* to its index):

| Slot | Contents |
| --- | --- |
| `cb0` | `Globals` — the effect's own material parameters |
| `cb1` | per-frame VS |
| `cb2` | per-frame PS |
| `cb3` | **per-object VS** |
| `cb4` | **per-object PS** |
| `cb5` | per-object RT vertex-buffer data |
| `cb6` | GUI transforms |

Per-object VS is `cb3`, not `cb2`.

## Usage

```js
import {
    CjsPerObjectDecoder,
    CjsPerObjectPacker,
    CjsPerObjectSynthesizer
} from "@carbonenginejs/tools-browser/perobject";

// Name an anonymous slot from a WGSL/GLSL export.
const decoder = new CjsPerObjectDecoder();
decoder.Component(4, 13, "w").name;      // "clipRadiusSq"
decoder.Component(4, 12, "x").hlsl;      // "Shipdata"

// Explain every uniform a translated shader declares.
decoder.Annotate([{ register: 4, registerCount: 27 }]);
// -> struct "EveSpaceObjectPSData", truncatedAfter "customMaskClamps",
//    unread ["screenSize", "customData"]

// Produce realistic values, then pack them.
const synthesizer = new CjsPerObjectSynthesizer();
const values = synthesizer.SynthesizeSpaceObject({
    worldTransform,
    boundingSphereRadius: 120,
    customMasks: [{ materialSourceID: 2, position, rotation, scaling }]
});

const packed = new CjsPerObjectPacker().Pack(values.structs.ps, values.ps);
```

### Matrix convention — read this before packing

`Pack` takes `matrices: "raw" | "logical"`, saying what the caller is holding:

- **`"raw"`** (default) — the value is already GPU-form, i.e. transposed. This
  is what a per-object record contains, because Carbon stores transposed.
  `SynthesizeSpaceObject` emits this convention and reports it as `matrices` on
  its result.
- **`"logical"`** — untransposed row-vector matrices, transposed on write. This
  is what a producer holds before writing.

Packing an already-transposed value as `"logical"` transposes it twice, which
corrupts the rotation block while leaving the translation column looking
correct. Keep this distinction aligned with the matrix convention above.

`runtime-trinity` has no equivalent choice — its records are always GPU-form,
and `SetAndTranspose`/`GetTransposed` are the only matrix accessors. The option
exists here because a *tool* may be handed either form.

### Custom masks are filled by the mask, not by this package

A custom mask owns writing its own slot into the parent's per-object structs,
as it does in Carbon (`EveCustomMask.cpp:66-93`) and in `runtime-trinity`
(`EveCustomMask.FillPerObjectData` / `static ZeroPerObjectData`). This package
runs Carbon's driver loop (`EveSpaceObject2.cpp:654-664` — every slot is filled
or zeroed) and calls that protocol; it does not carry a second copy of the fill.

Pass mask objects that implement `FillPerObjectData(index, vsData, psData)`, or
construct the synthesizer with the owning class:

```js
import { EveCustomMask } from "@carbonenginejs/runtime-trinity";

new CjsPerObjectSynthesizer({ customMask: EveCustomMask });
```

A plain mask description with no class available throws rather than guessing.

There are **0, 1 or 2** custom masks — never more. `EVE_SPACEOBJECT_CUSTOWMASK_MAX`
is 2 (`EveSpaceObject2.h:49`), both structs reserve exactly two slots, and every
slot is either filled by its mask or zeroed. A third layer is a caller error;
`SynthesizePatternLayers` reports it as `dropped` rather than discarding it
quietly.

`SynthesizeSpaceObject` returns a `defaulted` array listing every field that
fell back to a neutral because it is scene or frame state with no SOF answer —
world transform, SH lighting, screen size. Read it rather than assuming the
result is fully determined.

## Active prefix, not struct size

A translated shader sizes its uniform by the **highest register the body
actually reads**, not by the full struct. `cb4: array<vec4<f32>, 27>` is
`EveSpaceObjectPSData` (29 registers) stopping after `customMaskClamps`; the
shader simply never reads `ScreenSize` or `CustomData`. `Annotate` reports that
as `truncatedAfter` and only sets `mismatch` when the short size lands on no
field boundary at all.

## `SPACE_OBJECT_PPT_ENABLED`

PPT is the pattern-projection / paint-mask feature — the `EveCustomMask` block
(`EveCustomMask.cpp:64`, `:86`; `EveSOF.cpp:2320`). Carbon sets
`SOPPT_ENABLED` exactly when the DNA has at least one pattern layer, and
`SOPPT_DISABLED` otherwise (`EveSOF.cpp:621-650`).

It does **not** change the per-object layout — both custom-mask slots are always
reserved, and are zeroed by `EveCustomMask::ZeroPerObjectData` when unused. It
gates shader code, textures and samplers. `SynthesizePatternLayers` returns the
implied option alongside the mask values so the two cannot drift apart.

Do not assume PPT-on is a corpus-wide default. `engine-webgpu`'s harness notes
record audited hulls authoring PPT **disabled**.

## Not yet covered

- `PerFrameVS` (`cb1`) and `PerFramePS` (`cb2`). **Do not read these from
  `Tr2ConstantBufferFormats.h:53-92`** — that legacy pair is the INTERIOR path
  (`Tr2InteriorScene`, `WodBakingScene`). Space scenes use the much larger
  structs nested in `EveSpaceScene.h:240,300`, filled by
  `EveSpaceScene::PopulatePerFrameVSData` / `PopulatePerFramePSData`
  (`EveSpaceScene.cpp:3015`, `:3075`) and bound by `ApplyPerFrameData`
  (`:815-826`) — 46 and 118 registers. `cb2: array<vec4<f32>, 22>` in the quad
  exports is that PS struct truncated after `GammaBrightness` (352 bytes, the
  end of the MiscData block); it is currently reported as `unknown`.
  `engine-webgpu/src/core/spaceObjectMainBindings.js:26-96` already carries
  both byte layouts.
- Cross-checking the catalog against `runtime-trinity`'s
  `src/eve/perObjectData/*` declarations. `VerifyDefinition` exists for exactly
  this and will fail loud on drift, but `runtime-trinity` is not a dependency
  here, so nothing runs it yet.
