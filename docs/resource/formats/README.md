# Format subpaths

Status: Evolving  
Scope: `@carbonenginejs/runtime/resource/formats`
Audience: Users and integrators  
Summary: Maps every owned format subpath and how to choose a writer.

Every format extends `CjsFormat` and exposes the same static surface: `id`,
`mediaTypes`, dotted `extensions`, an `outputs` map, `requestResponseType` and
`worker`. `getSupport()` is synchronous structural advice and always reports
`verified: false`; `verifySupport()` runs the real `readAsync()` path for one
exact output. The `CjsFormat` JSDoc and the module comment on
`src/resource/formats/index.js` cover the rest, including why formats are
decorator-free.

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

## Choosing a writer

**Ask whether a format writes; do not probe for the method.** `inputs` is the
counterpart of `outputs`, and it is empty on every format that only reads:

```js
CjsPngFormat.canWrite();            // true
CjsGifFormat.canWrite();            // false - reads only
CjsJpegFormat.getInputCapability(); // { input: "rgba", lossy: true, ... }
```

`CjsJpegFormat`, `CjsPngFormat` and `CjsTgaFormat` accept the normalized RGBA
payload every image format decodes to (`{ width, height, data }`, honouring
`strideBytes` and `origin`), so any image reader pairs with any of these
writers:

```js
const rgba = await CjsPngFormat.readAsync(bytes, { emit: "rgba" });
const jpeg = CjsJpegFormat.write(rgba, { quality: 0.9 });
```

`write` is the one-shot static form; `Write` is the instance form.

| Writer | Lossless | Notes |
|---|---|---|
| `CjsJpegFormat.write` | no | `quality` 0..1 (default 0.9), `subsampling` `4:2:0` or `4:4:4`. No alpha. |
| `CjsPngFormat.write` | yes | Stored deflate blocks, so about the size of the raw pixels. |
| `CjsPngFormat.writeAsync` | yes | Compresses through `CompressionStream`. |
| `CjsTgaFormat.write` | yes | `compress` runs run-length encoding; works where `CompressionStream` does not. |

`lossy` is declared rather than inferred because a caller needs it before
choosing: JPEG is far smaller on photographs and renders, and destroys flat
colour, sharp edges and alpha. PNG and TGA are exact.

The geometry writers `CjsCmfFormat`, `CjsFbxFormat` and `CjsGr2Format` take a
native CMF graph by default (FBX and GR2 are written through CMF), with a
`shared` input for a shared geometry root; `CjsStlFormat` takes the shared root
directly. See [geometry interchange](geometry-interchange.md).

## Format map

| Format | Class | Import |
|---|---|---|
| Black (`.black`) | `CjsBlackFormat` | `@carbonenginejs/runtime/resource/formats/black` |
| Wwise soundbank (`.bnk`) | `CjsBnkFormat` | `@carbonenginejs/runtime/resource/formats/bnk` |
| CMF (`.cmf`) | `CjsCmfFormat` | `@carbonenginejs/runtime/resource/formats/cmf` |
| DDS (`.dds`) | `CjsDdsFormat` | `@carbonenginejs/runtime/resource/formats/dds` |
| DXBC (shader bytecode) | `CjsDxbcFormat` | `@carbonenginejs/runtime/resource/formats/dxbc` |
| Compiled effect (`.sm_hi`, `.sm_lo`, `.sm_depth`) | `CjsHlslFormat` | `@carbonenginejs/runtime/resource/formats/hlsl` |
| Carbon WebGL effect package | `CjsWebglFormat` | `@carbonenginejs/runtime/resource/formats/webgl` |
| Carbon WebGPU effect package (`.carbonwebgpu`) | `CjsWebgpuFormat` | `@carbonenginejs/runtime/resource/formats/webgpu` |
| FBX (`.fbx`) | `CjsFbxFormat` | `@carbonenginejs/runtime/resource/formats/fbx` |
| FLAC (`.flac`) | `CjsFlacFormat` | `@carbonenginejs/runtime/resource/formats/flac` |
| FSD (`.fsdbinary`; legacy 32-bit and modern 64-bit cFSD) | `CjsFsdFormat` | `@carbonenginejs/runtime/resource/formats/fsd` |
| GIF (`.gif`) | `CjsGifFormat` | `@carbonenginejs/runtime/resource/formats/gif` |
| glTF (`.gltf`/`.glb`) | `CjsGltfFormat` | `@carbonenginejs/runtime/resource/formats/gltf` |
| Granny GR2/GSF (`.gr2`/`.gsf`) | `CjsGr2Format` | `@carbonenginejs/runtime/resource/formats/gr2` |
| IES photometry (`.ies`, TILT=NONE) | `CjsIESFormat` | `@carbonenginejs/runtime/resource/formats/ies` |
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
| Volume texture animation (`.vta`) | `CjsVtaFormat` | `@carbonenginejs/runtime/resource/formats/vta` |
| WAV (`.wav`) | `CjsWavFormat` | `@carbonenginejs/runtime/resource/formats/wav` |
| WebM (`.webm`) | `CjsWebmFormat` | `@carbonenginejs/runtime/resource/formats/webm` |
| WebP (`.webp`) | `CjsWebpFormat` | `@carbonenginejs/runtime/resource/formats/webp` |
| Wwise media (`.wem`) | `CjsWemFormat` | `@carbonenginejs/runtime/resource/formats/wem` |
| YAML (`.yaml`/`.yml`) | `CjsYamlFormat` | `@carbonenginejs/runtime/resource/formats/yaml` |

Byte-level specifications that span several modules:
[Carbon effect container](carbon-effect-container.md),
[BitKnit2](bitknit2.md) and
[Carbon WebGPU WGSL set](webgpu/formats/carbon-webgpu.md). Donor licensing is
recorded in `format-notices/`.
