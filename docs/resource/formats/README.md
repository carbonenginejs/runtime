# Format subpaths

Status: Evolving  
Scope: `@carbonenginejs/runtime/resource/formats`
Audience: Users and integrators  
Summary: Maps every owned format subpath and records cross-format output conventions.

## Formats are decorator free

The package linter forbids formats from using decorators or importing modules
that do. Decorated modules require the build transform; importing one breaks
direct `src/` loading with a syntax error at the decorator, not the offending
import.

The practical consequence is that `inspect()`, `getSupport()`, and
`verifySupport()` return plain objects rather than constructing a decorated
`CjsResourceProbe`. `CjsResourceProbe.from()` is the optional resource-layer
normalization boundary. `is()` remains the boolean-only synchronous routing
predicate. See [format capabilities](../concepts/format-capabilities.md).

Every format extends `CjsFormat` and exposes one normalized static contract:
`id`, frozen `mediaTypes`, frozen dotted `extensions`, a frozen `outputs` map,
`requestResponseType`, and `worker`. `getSupport()` is synchronous structural
advice and always reports `verified: false`; `verifySupport()` asynchronously
executes the real `readAsync()` path for one exact output.

## Import rule

Concrete formats are never imported or registered by the package root. Each
format is an explicit tree-shakeable subpath, registered by the caller:

```js
import { CjsResMan } from "@carbonenginejs/runtime/resource";
import { CjsMp4Format } from "@carbonenginejs/runtime/resource/formats/mp4";

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

## Images can be written as well as read

`CjsJpegFormat`, `CjsPngFormat` and `CjsTgaFormat` accept the same normalized
RGBA payload every image format decodes *to* — `{ width, height, data }`, with
`strideBytes` and `origin` honoured when present — so any image reader here
pairs with any of these writers without an adapter:

```js
const rgba = await CjsPngFormat.readAsync(bytes, { emit: "rgba" });
const jpeg = CjsJpegFormat.write(rgba, { quality: 0.9 });
```

`write` is one-shot and static; `Write` is the instance form, as with every
other format that writes.

The geometry formats write too, and as of 2026-09-13 they declare it: `CjsCmfFormat`,
`CjsFbxFormat` and `CjsGr2Format` take a native CMF graph by default — FBX and GR2
are written *through* CMF — with a `shared` input for a shared geometry root, while
`CjsStlFormat` takes the shared root directly. Until they declared `inputs`,
`canWrite()` answered `false` for all four.

**Ask whether a format writes; do not probe for the method.** `inputs` is the
counterpart of `outputs`, and it is empty on every format that only reads:

```js
CjsPngFormat.canWrite();            // true
CjsGifFormat.canWrite();            // false — reads only
CjsJpegFormat.getInputCapability(); // { input: "rgba", lossy: true, ... }
```

`lossy` is declared rather than inferred, because it is the fact a caller needs
*before* choosing: a converter reaching for JPEG to save space and silently
dropping an alpha channel it needed has made a mistake nothing downstream can
detect. The presence of a `write` function tells you none of that.

| Writer | Lossless | Notes |
|---|---|---|
| `CjsJpegFormat.write` | no | `quality` 0..1 (default 0.9), `subsampling` `4:2:0` or `4:4:4`. No alpha — the format has none. |
| `CjsPngFormat.write` | yes | Emits stored deflate blocks, so the output is about the size of the raw pixels. |
| `CjsPngFormat.writeAsync` | yes | Compresses through `CompressionStream`, the counterpart of the reader's `DecompressionStream`. |

PNG's `compression` option names the format's compression *method*, which is `0`
and can be nothing else — any other value throws rather than being accepted and
ignored. Writing `0` regardless of what was asked would leave the file correct
and the caller's belief about it wrong.
| `CjsTgaFormat.write` | yes | `compress` runs run-length encoding. No deflate, so it works where `CompressionStream` does not. |

Which one to reach for is not a matter of taste. JPEG is far smaller on
photographs and renders and destroys flat colour, sharp edges and alpha;
converting 128×128 pattern art to JPEG measurably made some of it *larger*. PNG
and TGA are exact.

## Format map

| Format | Class | Import |
|---|---|---|
| Black (`.black`) | `CjsBlackFormat` | `@carbonenginejs/runtime/resource/formats/black` |
| Wwise soundbank (`.bnk`) | `CjsBnkFormat` | `@carbonenginejs/runtime/resource/formats/bnk` |
| CMF (`.cmf`) | `CjsCmfFormat` | `@carbonenginejs/runtime/resource/formats/cmf` |
| DDS (`.dds`) | `CjsDdsFormat` | `@carbonenginejs/runtime/resource/formats/dds` |
| DXBC (shader bytecode) | `CjsDxbcFormat` | `@carbonenginejs/runtime/resource/formats/dxbc` |
| Compiled effect (`.sm_hi`, `.sm_lo`, `.sm_depth`) | `CjsHlslFormat` | `@carbonenginejs/runtime/resource/formats/hlsl` |
| Carbon WebGL WebGL effect package | `CjsWebglFormat` | `@carbonenginejs/runtime/resource/formats/webgl` |
| Carbon WebGPU effect package (`.carbonwebgpu`) | `CjsWebgpuFormat` | `@carbonenginejs/runtime/resource/formats/webgpu` |
| FBX (`.fbx`) | `CjsFbxFormat` | `@carbonenginejs/runtime/resource/formats/fbx` |
| FLAC (`.flac`) | `CjsFlacFormat` | `@carbonenginejs/runtime/resource/formats/flac` |
| FSD (`.fsdbinary`; legacy 32-bit and modern 64-bit cFSD) | `CjsFsdFormat` | `@carbonenginejs/runtime/resource/formats/fsd` |
| GIF (`.gif`) | `CjsGifFormat` | `@carbonenginejs/runtime/resource/formats/gif` |
| glTF (`.gltf`/`.glb`) | `CjsGltfFormat` | `@carbonenginejs/runtime/resource/formats/gltf` |
| Granny GR2/GSF (`.gr2`/`.gsf`) | `CjsGr2Format` | `@carbonenginejs/runtime/resource/formats/gr2` |
| [IES photometry](ies/README.md) (`.ies`, TILT=NONE) | `CjsIESFormat` | `@carbonenginejs/runtime/resource/formats/ies` |
| JPEG (`.jpg`/`.jpeg`) | `CjsJpegFormat` | `@carbonenginejs/runtime/resource/formats/jpeg` |
| JSON Lines (`.jsonl`) | `CjsJsonlFormat` | `@carbonenginejs/runtime/resource/formats/jsonl` |
| MP3 (`.mp3`) | `CjsMp3Format` | `@carbonenginejs/runtime/resource/formats/mp3` |
| MP4 (`.mp4`) | `CjsMp4Format` | `@carbonenginejs/runtime/resource/formats/mp4` |
| OBJ (`.obj`) | `CjsObjFormat` | `@carbonenginejs/runtime/resource/formats/obj` |
| Ogg (`.ogg`) | `CjsOggFormat` | `@carbonenginejs/runtime/resource/formats/ogg` |
| Python pickle (`.pickle`, protocol 0 data subset) | `CjsPickleFormat` | `@carbonenginejs/runtime/resource/formats/pickle` |
| PNG (`.png`) | `CjsPngFormat` | `@carbonenginejs/runtime/resource/formats/png` |
| Red (`.red`) | `CjsRedFormat` | `@carbonenginejs/runtime/resource/formats/red` |
| Schema-bound containers (layout in a sibling schema) | `CjsSchemaBoundFormat` | `@carbonenginejs/runtime/resource/formats/schemabound` |
| SQLite 3 (`.sqlite`/`.db`) | `CjsSqliteFormat` | `@carbonenginejs/runtime/resource/formats/sqlite` |
| Client static data (`.static`, identification) | `CjsStaticFormat` | `@carbonenginejs/runtime/resource/formats/static` |
| STL (`.stl`) | `CjsStlFormat` | `@carbonenginejs/runtime/resource/formats/stl` |
| TGA (`.tga`) | `CjsTgaFormat` | `@carbonenginejs/runtime/resource/formats/tga` |
| WAV (`.wav`) | `CjsWavFormat` | `@carbonenginejs/runtime/resource/formats/wav` |
| WebM (`.webm`) | `CjsWebmFormat` | `@carbonenginejs/runtime/resource/formats/webm` |
| WebP (`.webp`) | `CjsWebpFormat` | `@carbonenginejs/runtime/resource/formats/webp` |
| Wwise media (`.wem`) | `CjsWemFormat` | `@carbonenginejs/runtime/resource/formats/wem` |
| YAML (`.yaml`/`.yml`) | `CjsYamlFormat` | `@carbonenginejs/runtime/resource/formats/yaml` |

Detailed pages: [CMF, FBX, and glTF geometry interchange](geometry-interchange.md),
[Granny GR2 and GSF](gr2.md),
[FSD and cFSD](fsd.md),
[data-only pickle protocol 0](pickle.md),
[client `.static` container identification](static.md),
[schema-bound containers](schemabound.md),
[Wwise soundbanks and media](wwise.md), and [STL export](stl.md). Ownership
history, retained snapshots, and donor licensing are recorded in
[provenance.md](provenance.md).

`CjsPngFormat.inspect(bytes)` is the one-shot, decode-free PNG inspection
entry point. In addition to the header and bounded chunk summary, it exposes
the standard ancillary placement chunks when present:

- `offset: { x, y, unit }` from `oFFs`, with signed 32-bit coordinates; and
- `physicalPixelDimensions: { x, y, unit }` from `pHYs`, with unsigned 32-bit
  values.

These are raw PNG facts. The resource layer does not assign character-atlas or
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
