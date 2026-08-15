# Format subpaths

Status: Evolving  
Scope: `@carbonenginejs/runtime-resource/formats`  
Audience: Users and integrators  
Summary: Maps every owned format subpath and records cross-format output conventions.

## Formats are decorator free

A format may not use a decorator, and may not import a module that does. This
is enforced by the package linter, not left to review.

A decorated module only parses after the build transform, so a format that
touches one stops being loadable from source. Every consumer reading `src/`
directly then fails with a bare syntax error pointing at the decorator rather
than at the import that reached it, which is a long way from the mistake.

The practical consequence is that a format reports a **plain probe-shaped
object** from `isSupported()` and `resolveType()` rather than constructing a
`CjsResourceProbe`, which is decorated. `CjsResourceProbe.from()` normalizes
those payloads wherever a real probe instance is wanted. See
[format type resolution](../concepts/format-type-resolution.md).

## Import rule

Concrete formats are never imported or registered by the package root. Each
format is an explicit tree-shakeable subpath, registered by the caller:

```js
import { CjsResMan } from "@carbonenginejs/runtime-resource";
import { CjsMp4Format } from "@carbonenginejs/runtime-resource/formats/mp4";

const resMan = new CjsResMan().Register({
  source,
  formats: [ CjsMp4Format ]
});

const resource = resMan.GetResource("res:/video/intro.mp4");
const video = await resource.Ready();
```

Formats return plain payload objects. Semantic resource classes apply them
through `SetPayload()`, validate their own required fields, and throw
`CJS_RESOURCE_PAYLOAD_INVALID` before replacing a previously valid payload.
`GetPayload()`, `HasPayload()`, and `ReleasePayload()` manage transient CPU
retention without introducing a parallel DTO class hierarchy.

Clone-safe formats may additionally declare browser-worker execution
metadata. Worker eligibility never changes the format's direct API; see
[browser worker execution](../reference/workers.md).

## Format map

| Format | Class | Import |
|---|---|---|
| Black (`.black`) | `CjsBlackFormat` | `@carbonenginejs/runtime-resource/formats/black` |
| Wwise soundbank (`.bnk`) | `CjsBnkFormat` | `@carbonenginejs/runtime-resource/formats/bnk` |
| CMF (`.cmf`) | `CjsCmfFormat` | `@carbonenginejs/runtime-resource/formats/cmf` |
| DDS (`.dds`) | `CjsDdsFormat` | `@carbonenginejs/runtime-resource/formats/dds` |
| DXBC (shader bytecode) | `CjsDxbcFormat` | `@carbonenginejs/runtime-resource/formats/dxbc` |
| Compiled effect (`.sm_hi`, `.sm_lo`, `.sm_depth`) | `CjsHlslFormat` | `@carbonenginejs/runtime-resource/formats/hlsl` |
| Carbon WebGL WebGL effect package | `CjsWebglFormat` | `@carbonenginejs/runtime-resource/formats/webgl` |
| Carbon WebGPU WebGPU effect package | `CjsWebgpuFormat` | `@carbonenginejs/runtime-resource/formats/webgpu` |
| FBX (`.fbx`) | `CjsFbxFormat` | `@carbonenginejs/runtime-resource/formats/fbx` |
| FLAC (`.flac`) | `CjsFlacFormat` | `@carbonenginejs/runtime-resource/formats/flac` |
| GIF (`.gif`) | `CjsGifFormat` | `@carbonenginejs/runtime-resource/formats/gif` |
| glTF (`.gltf`/`.glb`) | `CjsGltfFormat` | `@carbonenginejs/runtime-resource/formats/gltf` |
| Granny GR2/GSF (`.gr2`/`.gsf`) | `CjsGr2Format` | `@carbonenginejs/runtime-resource/formats/gr2` |
| JPEG (`.jpg`/`.jpeg`) | `CjsJpegFormat` | `@carbonenginejs/runtime-resource/formats/jpeg` |
| MP3 (`.mp3`) | `CjsMp3Format` | `@carbonenginejs/runtime-resource/formats/mp3` |
| MP4 (`.mp4`) | `CjsMp4Format` | `@carbonenginejs/runtime-resource/formats/mp4` |
| OBJ (`.obj`) | `CjsObjFormat` | `@carbonenginejs/runtime-resource/formats/obj` |
| Ogg (`.ogg`) | `CjsOggFormat` | `@carbonenginejs/runtime-resource/formats/ogg` |
| Python pickle (`.pickle`, protocol 0 data subset) | `CjsPickleFormat` | `@carbonenginejs/runtime-resource/formats/pickle` |
| PNG (`.png`) | `CjsPngFormat` | `@carbonenginejs/runtime-resource/formats/png` |
| Red (`.red`) | `CjsRedFormat` | `@carbonenginejs/runtime-resource/formats/red` |
| SQLite 3 (`.sqlite`/`.db`) | `CjsSqliteFormat` | `@carbonenginejs/runtime-resource/formats/sqlite` |
| Client static data (`.static`, identification) | `CjsStaticFormat` | `@carbonenginejs/runtime-resource/formats/static` |
| STL (`.stl`) | `CjsStlFormat` | `@carbonenginejs/runtime-resource/formats/stl` |
| TGA (`.tga`) | `CjsTgaFormat` | `@carbonenginejs/runtime-resource/formats/tga` |
| WAV (`.wav`) | `CjsWavFormat` | `@carbonenginejs/runtime-resource/formats/wav` |
| WebM (`.webm`) | `CjsWebmFormat` | `@carbonenginejs/runtime-resource/formats/webm` |
| WebP (`.webp`) | `CjsWebpFormat` | `@carbonenginejs/runtime-resource/formats/webp` |
| Wwise media (`.wem`) | `CjsWemFormat` | `@carbonenginejs/runtime-resource/formats/wem` |
| YAML (`.yaml`/`.yml`) | `CjsYamlFormat` | `@carbonenginejs/runtime-resource/formats/yaml` |

Detailed pages: [Granny GR2 and GSF](gr2.md),
[data-only pickle protocol 0](pickle.md),
[client `.static` container identification](static.md),
[Wwise soundbanks and media](wwise.md), and [STL export](stl.md). Ownership
history, retained snapshots, and donor licensing are recorded in
[provenance.md](provenance.md).

`CjsPngFormat.inspect(bytes)` is the one-shot, decode-free PNG inspection
entry point. In addition to the header and bounded chunk summary, it exposes
the standard ancillary placement chunks when present:

- `offset: { x, y, unit }` from `oFFs`, with signed 32-bit coordinates; and
- `physicalPixelDimensions: { x, y, unit }` from `pHYs`, with unsigned 32-bit
  values.

These are raw PNG facts. Runtime-resource does not assign character-atlas or
other domain semantics to their values.

## Black and Red reader boundary

`CjsBlackReader` and `CjsRedReader` share `CjsBlueReader` as an output and
hydration backend. The shared layer owns payload/runtime target creation,
payload-reference markers, hydration-adapter coordination, reports, and
runtime finalization. It does not own transport framing or graph traversal.

Black retains its binary buffer and cursor, string tables, numeric reference
tokens, schema/descriptor field resolution, skip behavior, and
Black-specific property readers. Structure-list parsing and skipping therefore
remain on the Black side. Red retains YAML parsing, anchors and aliases, typed
table decoding, and lenient named-field assignment. Red is the YAML-encoded
Blue graph transport; the generic `CjsYamlFormat` reader is separate and does
not use the Blue backend.

These readers are source-bound and garbage-collected rather than explicitly
disposed. A read entry point resets its graph state before walking the same
bound source again; Black also restores its binary cursor. Runtime hydration
constructs a target when its node is encountered, applies that node's values
after its children have been read, and defers all `finalize` calls until the
complete graph is available. Untyped Red maps remain plain value objects and
do not enter the runtime adapter lifecycle.

## Granny GR2/GSF

`CjsGr2Format` reads `.gr2` geometry/skeleton/animation graphs and `.gsf`
(GState) profiles with no native tooling: section decompression (None,
Oodle1, and the clean-room BitKnit2 decoder), reflected type-tree walking,
GR2 JSON emission, optional curve decompression, CCP packed tangent-frame
unpacking, and caller-class hydration (`emit: "gr2"`/`"cmf"` with a
`classes` map). It was migrated from `@carbonenginejs/format-gr2` after that
package's 2026-07-24 MIT relicense, preserving its behavior and test
surface; [gr2.md](gr2.md) documents the reader API, output modes, graph
shape, and hydration contract.

## Red output markers

Red payload output reserves configurable type, ID, reference, and sequence
values markers (`_type`, `_id`, `_reference`, and `_values` by default).
Repeated or cyclic sequences use an ID-bearing values envelope; unique
sequences remain arrays. Authored fields may not collide with active markers,
so remap the marker options when those names are real data. Disabling the
reference marker preserves actual JavaScript identity; cyclic output in that
mode is intentionally not JSON-serializable.

## DDS decoded fallback

Decoded DDS fallback currently has a narrower contract than native DDS
texture output. `emit: "rgba"` returns one canonical 2D surface decoded from
the first DDS subresource; it does not preserve stored mip levels, cube
faces, array layers, or volume slices. Consumers may use it for ordinary 2D
fallback when the engine owns any required mip generation, but must not infer
decoded multi-subresource support from a successful RGBA probe. A future
richer decoded-texture contract must be introduced explicitly rather than
overloading the current RGBA fields.

The software path includes BC1-BC5 and BC7 as RGBA8, plus signed and unsigned
BC6H as linear `Float32Array` RGBA without clamping HDR values. These block
decoders are implemented in-project with no codec package.

## Related documentation

- [Queues, publication, and registration](../reference/queues.md)
- [Format ownership and fork provenance](provenance.md)
