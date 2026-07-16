# Format ownership and fork provenance

On 2026-07-13, the non-shader runtime format implementations below were copied
once into `runtime-resource`. Their standalone repositories remain frozen with
their existing APIs and names; they are not upstreams for the runtime copies.

Copied paths were `src/` and the behavioral `test/` corpus. Package publishing
scripts and CLIs were not copied. Exact donor license and notice files are kept
under `format-notices/<format>/`.

| Legacy package | Source revision/state | Runtime class | Runtime import |
|---|---|---|---|
| `format-black` | `9fcaaff9e5f28c90b628d8a10b7c79aff7913a90` | `CjsBlackFormat` | `@carbonenginejs/runtime-resource/formats/black` |
| `format-cmf` | unborn working-tree snapshot | `CjsCmfFormat` | `@carbonenginejs/runtime-resource/formats/cmf` |
| `format-dds` | `66fa149cd826e1114ad0be84479f89dee753ed76` | `CjsDdsFormat` | `@carbonenginejs/runtime-resource/formats/dds` |
| `format-fbx` | `8d0fcc2fe44c8096b35e360a903bff30b49eb592` | `CjsFbxFormat` | `@carbonenginejs/runtime-resource/formats/fbx` |
| `format-flac` | unborn working-tree snapshot | `CjsFlacFormat` | `@carbonenginejs/runtime-resource/formats/flac` |
| `format-gif` | `5d831c5c0533a9579682f776274574289a520899` | `CjsGifFormat` | `@carbonenginejs/runtime-resource/formats/gif` |
| `format-gltf` | `d0dadf920828bceec987c2a5fa1f161f81db28aa` | `CjsGltfFormat` | `@carbonenginejs/runtime-resource/formats/gltf` |
| `format-jpeg` | `bed2253ea979bba27812420fa897987d82a91793` | `CjsJpegFormat` | `@carbonenginejs/runtime-resource/formats/jpeg` |
| `format-mp3` | unborn working-tree snapshot | `CjsMp3Format` | `@carbonenginejs/runtime-resource/formats/mp3` |
| `format-mp4` | `cffc5a57b115a99ed9e0947a6b9d3390ffc3581c` | `CjsMp4Format` | `@carbonenginejs/runtime-resource/formats/mp4` |
| `format-obj` | `e5d3f9a1520c7855bd5b6edc1e2304a7b4e18176` | `CjsObjFormat` | `@carbonenginejs/runtime-resource/formats/obj` |
| `format-ogg` | unborn working-tree snapshot | `CjsOggFormat` | `@carbonenginejs/runtime-resource/formats/ogg` |
| `format-png` | `04dbb7c0f289043c3c32d9141ec3ef74aeeb1c43` | `CjsPngFormat` | `@carbonenginejs/runtime-resource/formats/png` |
| `format-red` | `98beab6988111418d6e09827b92d27e08da4c05b` | `CjsRedFormat` | `@carbonenginejs/runtime-resource/formats/red` |
| `format-stl` | `4858f9a37bf140a3c544fa30a13a6fcce015247b` | `CjsStlFormat` | `@carbonenginejs/runtime-resource/formats/stl` |
| `format-tga` | `b0f9df263727057537b2279322e8cd088f366179` | `CjsTgaFormat` | `@carbonenginejs/runtime-resource/formats/tga` |
| `format-wav` | unborn working-tree snapshot | `CjsWavFormat` | `@carbonenginejs/runtime-resource/formats/wav` |
| `format-webm` | `459203ac293d0d53fff0e43494b7e47d8d4c92bd` | `CjsWebmFormat` | `@carbonenginejs/runtime-resource/formats/webm` |
| `format-webp` | `19155e9cc7ae05845c23a3c259d3a586569eba40` | `CjsWebpFormat` | `@carbonenginejs/runtime-resource/formats/webp` |
| `format-yaml` | `3d7e1d1cf9b7a936283d6050efe43a0a9fadb6a4` | `CjsYamlFormat` | `@carbonenginejs/runtime-resource/formats/yaml` |

The unborn donors had no commit-addressable `HEAD`; this document deliberately
records them as working-tree snapshots rather than inventing a revision. Their
copied runtime files are the deterministic retained snapshot.

## Black definition snapshot

The Black and Red readers use the package-owned generated definition snapshot
at `src/formats/black/core/black-schema-v1-2026-07-11.json`. It was copied from
`format-carbon` revision `d2a3c67cf3d46e8ba78ca19e66558d868178ec24`
with SHA-256
`008ECB29E670EFC678B471A6EFF099600A29C2907912FC42B854995904604691`.

This retained generated artifact keeps the published readers deterministic and
browser-safe without a runtime dependency on a sibling checkout or an
unpublished `format-carbon` export. `format-carbon` remains the build-time
authority for future schema regeneration; an updated snapshot must record its
new source revision and digest here.

## Native additions

Formats below were authored directly in `runtime-resource` and have no legacy
donor package. Their `format-notices/<format>/` entries record third-party
format attribution rather than fork provenance.

| Format | Runtime class | Runtime import | Notes |
|---|---|---|---|
| Wwise soundbank (`.bnk`) | `CjsBnkFormat` | `@carbonenginejs/runtime-resource/formats/bnk` | Original code; chunk layout from public community documentation (ww2ogg, vgmstream, wwiser), no code copied. Also carries the SoundbanksInfo JSON helpers (`parseSoundbanksInfo`, `buildSoundbanksCatalog`, `joinSoundbanksInfo`) and `wwiseIdFromName` (FNV-1 32 of the lowercased name, verified against EVE bank/language ids). |
| Wwise media (`.wem`) | `CjsWemFormat` | `@carbonenginejs/runtime-resource/formats/wem` | Original code; container/codec-tag behavior from public community documentation (ww2ogg, vgmstream, wwiser), no code copied. Includes a Wwise-Vorbis→Ogg repacker (`emit: "ogg"`), an original reimplementation of the ww2ogg algorithm with inline granule computation (no revorb pass needed). |

## Post-fork additions inside copied formats

- `formats/cmf` gained a **binary CMF v1 writer** (2026-07-15,
  `src/formats/cmf/core/writer.js`, `CjsCmfFormat.write`/`writeAsync` and
  `Write`/`WriteAsync`): original code implementing CarbonEngine's
  `cmf::BuildFile` behavior — tagged self-relative span flattening with leaf
  chunk dedup, BufferView→section remapping in first-encounter order,
  meshoptimizer vertex/index compression (index compression canonicalizes
  triangle rotation, matching the engine's own writer test expectations), and
  the post-crc32 file checksum. Verified by write→read roundtrips against the
  runtime reader; `E:\carbonengine\mesh\{include,src}\cmf` was the behavioral
  reference, no code copied. `writeShared`/`writeSharedAsync` plus
  `core/pack.js` (channel interleaving, index packing, unique buffer-index
  assignment) serialize shared geometry directly, enabling GR2/OBJ/glTF→CMF —
  verified against real EVE `.gr2` models fetched via
  `@carbonenginejs/tool-index` (positions exact, triangles equivalent).
- `formats/cmf` also gained the **GR2 skeleton/animation converter**
  (2026-07-15, `src/formats/cmf/core/gr2Anim.js`, applied automatically by
  `writeShared`): GR2-shaped skeletons (root list or `models[].skeleton`)
  convert to CMF bones/parents/rest transforms with inverse binds rebuilt
  from the rest hierarchy; decoded Granny curves convert to CMF Step/Linear
  channels — degree ≤ 1 exactly, degree 2 via adaptive de Boor resampling
  with discontinuities snapped to one float32 ULP. Consumes only decoded
  `{knots, controls}` data so the MIT runtime stays independent of the GR2
  package. Validated on EVE ships (cde3_t3, gde3_t3, cfaux1_t1, mfaux1_t1:
  3,377 channels ≤ 8.3e-4 positional / ≤ 0.14° rotational vs the GR2 runtime
  sampler; 9 Granny curve formats) and characters (basicfemale: 132-bone
  skeleton, exact skin weights).
- `formats/ogg` gained a pure-JS **Ogg Vorbis PCM decoder** (2026-07-15,
  `src/formats/ogg/core/{vorbis.js,imdct.js}`, `emit: "pcm"`/`"audio"`):
  original code implementing the Vorbis I specification (floor 1, residues
  0/1/2, square-polar coupling, FFT-based IMDCT, windowed overlap-add).
  stb_vorbis (public domain) was consulted as a behavioral reference and is
  the source of the spec's floor1 `inverse_db_table` constants; no licensed
  code was copied. Validated bit-comparable to ffmpeg (max diff ~3e-8) and
  vgmstream (±1 int16 LSB) across the EVE Vorbis corpus.

## Wem packed-codebook snapshot

The wem Ogg repacker ships a package-owned copy of the aoTuV 6.03 packed
Vorbis codebook library at
`src/formats/wem/core/packedCodebooksAotuv603.js` (base64 module). It was
copied byte-identically from `packed_codebooks_aoTuV_603.bin` in the ww2ogg
distribution (`github.com/hcs64/ww2ogg`), 74,387 bytes, SHA-256
`00a93eab267d281401b1efd54e888a2e183299b9e6c446c48d09f701a89d9d27`, retrieved
2026-07-15. The data is BSD-licensed (Xiph.org Foundation, Adam Gashlin);
attribution and the full license terms are recorded in
`format-notices/wem/NOTICE` and `format-notices/wem/LICENSE`. An updated
snapshot must record its new source and digest here.

## Deliberately not copied

- `format-gr2` is the intended runtime-resource owner target, but its current
  BitKnit-derived implementation is EUPL-1.2. It remains separate and active
  until that code is replaced or an explicit distribution-license decision is
  made. It has not been deprecated or relabeled as MIT.
- `format-carbon` remains the schema emitter/generator and build-time schema
  authority. Black and Red consume its published Black definitions.
- `format-dxbc`, `format-hlsl`, `format-webgl`, and `format-webgpu` are active
  shader work and were not copied, annotated, or otherwise modified by this
  migration.

## Typed-array ownership adjustments

The runtime copies preserve caller byte objects by reference. During the fork,
three avoidable source-buffer copies were changed to views:

- CMF compressed sections use `Uint8Array.subarray`.
- glTF GLB chunks use `Uint8Array.subarray`.
- FBX raw binary property payloads use `Uint8Array.subarray`.

Decoder output buffers and GIF per-frame snapshots still allocate because those
values have independent semantic identity.
