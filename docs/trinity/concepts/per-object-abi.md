# The per-object constant-buffer ABI

Status: Stable
Scope: Carbon's per-object and per-frame constant-buffer layout
Audience: Engine authors, shader-tool authors, and anyone naming an anonymous `cbN[i]` slot
Summary: Why the per-object layout is derivable from the C++ structs, which registers carry what, and the Carbon behaviours that make a plausible-looking wrong answer easy to reach.

Provenance: struct declarations and fill logic were read from CarbonEngine
source (CCP Games). This page was recovered from the retired
`runtime/tools/perobject` package on 2026-08-30, which existed so an engine
implementer would not have to guess this. The layout it documented now lives in
[`CjsPerObjectLayouts`](../../../src/trinity/core/rawData/CjsPerObjectLayouts.js);
the knowledge below is the part that was only in that package's prose.

## Why the layout is derivable at all

Carbon does not pack per-object data by reflection. It `memcpy`s the C++ struct
straight into the constant buffer (`EveSpaceObject2.cpp:1469-1483`), so **the
C++ struct layout is the byte layout the shader reads**. That is what makes the
ABI derivable from the headers.

It also has to be derived that way, because the shader packages cannot supply
it:

| Buffer | Member names available? | From where |
|---|---|---|
| `cb0` `$LocalConstants` | yes | the HLSL binding manifest, `bindings[].carbon.constants` |
| `cb1`–`cb4` | **no, at any layer** | only the Carbon C++ structs |

`cb1`–`cb4` carry no names anywhere, because Carbon's own shader compiler strips
reflection from the persisted stage blob. A translated shader declares them
positionally and that is all the information the file holds.

## Register convention

From `Tr2Renderer.cpp:37-43` and `shadercompiler/ParserUtils.cpp:523-561`, which
maps a declared cbuffer *name* to its index:

| Slot | Contents |
|---|---|
| `cb0` | `Globals` — the effect's own material parameters |
| `cb1` | per-frame VS |
| `cb2` | per-frame PS |
| `cb3` | per-object VS |
| `cb4` | per-object PS |

## Derivable versus supplied

Per-object values split into two kinds, and conflating them is how a renderer
ends up with a plausible picture rather than an error:

- **Derivable** — values Carbon computes from the object and its SOF build: the
  ship data lanes, the custom-mask (pattern projection) block, the clip sphere
  maths, the ellipsoid. These are reproducible from the C++.
- **Supplied** — scene or frame state with no SOF answer: world transform, SH
  lighting, screen size, anything camera-relative. These have no derivation and
  take Carbon's documented neutral until a caller provides one.

A producer that cannot say which kind a field is has not finished reading the
struct.

## Matrices are stored transposed

Carbon stores per-object matrices in GPU form, already transposed. Trinity has
no choice about this — its records are always GPU-form and `SetAndTranspose` /
`GetTransposed` are the only matrix accessors.

Transposing an already-transposed value **corrupts the rotation block while
leaving the translation column looking correct**, which is why this fails as a
subtly wrong image rather than as an error. The rule behind it: Carbon
composes with row vectors (`v' = v * M`) while gl-matrix composes with column
vectors, so the byte layouts coincide and only compositions swap operand
order - a transpose is a real representation change, never a no-op.

## Custom masks fill their own slots

A custom mask owns writing its slot into the parent's per-object structs, in
Carbon (`EveCustomMask.cpp:66-93`) and in Trinity
(`EveCustomMask.FillPerObjectData` / `static ZeroPerObjectData`). Carbon's
driver loop fills or zeroes **every** slot (`EveSpaceObject2.cpp:654-664`);
nothing carries a second copy of the fill.

There are **0, 1 or 2** custom masks, never more. `EVE_SPACEOBJECT_CUSTOWMASK_MAX`
is 2 (`EveSpaceObject2.h:49`), both structs reserve exactly two slots, and every
slot is either filled by its mask or zeroed.

## A shader sizes its uniform by what it reads

A translated shader sizes its uniform by the **highest register the body
actually reads**, not by the full struct. `cb4: array<vec4<f32>, 27>` is
`EveSpaceObjectPSData` — 29 registers — stopping after `customMaskClamps`,
because the shader never reads `ScreenSize` or `CustomData`.

So a short uniform is not evidence of a layout mismatch. It is only a mismatch
when the short size lands on no field boundary at all.

## `SPACE_OBJECT_PPT_ENABLED` does not change the layout

PPT is the pattern-projection / paint-mask feature — the `EveCustomMask` block
(`EveCustomMask.cpp:64`, `:86`; `EveSOF.cpp:2320`). Carbon sets `SOPPT_ENABLED`
exactly when the DNA has at least one pattern layer, and `SOPPT_DISABLED`
otherwise (`EveSOF.cpp:621-650`).

It gates shader code, textures and samplers. It does **not** change the
per-object layout: both custom-mask slots are always reserved, and are zeroed by
`EveCustomMask::ZeroPerObjectData` when unused.

Do not assume PPT-on is a corpus-wide default. Audited hulls author it disabled.

## Per-frame records

`CjsPerFrameLayouts` owns both the legacy interior `Tr2PerFrame*` layouts and
the larger EVE space-scene layouts. The space-scene VS and PS records contain
**46 and 118 registers** respectively.

Do not substitute the legacy interior structs from `Tr2ConstantBufferFormats.h`
for the EVE space-scene records.
