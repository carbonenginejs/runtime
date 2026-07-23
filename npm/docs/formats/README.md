# Format subpaths

Status: Evolving  
Scope: `@carbonenginejs/runtime-resource/formats`  
Audience: Users and integrators  
Summary: Maps every non-shader format subpath and records cross-format output conventions.

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

## Format map

| Format | Class | Import |
|---|---|---|
| Black (`.black`) | `CjsBlackFormat` | `@carbonenginejs/runtime-resource/formats/black` |
| Wwise soundbank (`.bnk`) | `CjsBnkFormat` | `@carbonenginejs/runtime-resource/formats/bnk` |
| CMF (`.cmf`) | `CjsCmfFormat` | `@carbonenginejs/runtime-resource/formats/cmf` |
| DDS (`.dds`) | `CjsDdsFormat` | `@carbonenginejs/runtime-resource/formats/dds` |
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
| PNG (`.png`) | `CjsPngFormat` | `@carbonenginejs/runtime-resource/formats/png` |
| Red (`.red`) | `CjsRedFormat` | `@carbonenginejs/runtime-resource/formats/red` |
| STL (`.stl`) | `CjsStlFormat` | `@carbonenginejs/runtime-resource/formats/stl` |
| TGA (`.tga`) | `CjsTgaFormat` | `@carbonenginejs/runtime-resource/formats/tga` |
| WAV (`.wav`) | `CjsWavFormat` | `@carbonenginejs/runtime-resource/formats/wav` |
| WebM (`.webm`) | `CjsWebmFormat` | `@carbonenginejs/runtime-resource/formats/webm` |
| WebP (`.webp`) | `CjsWebpFormat` | `@carbonenginejs/runtime-resource/formats/webp` |
| Wwise media (`.wem`) | `CjsWemFormat` | `@carbonenginejs/runtime-resource/formats/wem` |
| YAML (`.yaml`/`.yml`) | `CjsYamlFormat` | `@carbonenginejs/runtime-resource/formats/yaml` |

Detailed pages: [Granny GR2 and GSF](gr2.md),
[Wwise soundbanks and media](wwise.md), and [STL export](stl.md). Ownership
history, retained snapshots, and donor licensing are recorded in
[provenance.md](provenance.md).

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
