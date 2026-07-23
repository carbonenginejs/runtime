# Formats class catalog

Status: Evolving  
Scope: `@carbonenginejs/runtime-resource` classes under `src/formats`  
Audience: Users, maintainers, and automated readers  
Summary: Provides one-sentence purpose descriptors for maintained classes under `src/formats`.

### black

<!-- class:CjsBlackFormat -->
## `CjsBlackFormat`

Black format profile that reads `.black` binary object graphs into payload, document, raw, or runtime output using CarbonEngineJS canonical schemas or caller-supplied source-shape registries.

- Export: `@carbonenginejs/runtime-resource/formats/black`
- Source: `src/formats/black/CjsBlackFormat.js`
- Visibility: Public
- Kind: Original CarbonEngineJS class

<!-- class:CjsBlackBinaryReader -->
## `CjsBlackBinaryReader`

Bounds-aware `DataView` cursor that provides the primitive reads and end-of-stream checks the Black transport decodes with.

- Export: `None`
- Source: `src/formats/black/core/CjsBlackBinaryReader.js`
- Visibility: Internal
- Kind: Internal implementation class

<!-- class:CjsBlackPropertyReaders -->
## `CjsBlackPropertyReaders`

Static set of read and skip routines that decode or skip individual Black property values (primitives, strings, arrays, structure lists, dictionaries, and binary blocks) from their type descriptors.

- Export: `None`
- Source: `src/formats/black/core/CjsBlackPropertyReaders.js`
- Visibility: Internal
- Kind: Internal implementation class

<!-- class:CjsBlackReader -->
## `CjsBlackReader`

Transport that reads a `.black` stream into a payload, document, or runtime graph, owning the binary buffer, string tables, numeric references, and binary read cursor.

- Export: `None`
- Source: `src/formats/black/core/CjsBlackReader.js`
- Visibility: Internal
- Kind: Internal implementation class

<!-- class:CjsBlackSchemaRegistry -->
## `CjsBlackSchemaRegistry`

Registry that normalizes caller-supplied schemas into per-class source shapes the Black reader uses to resolve persisted fields.

- Export: `None`
- Source: `src/formats/black/core/CjsBlackSchemaRegistry.js`
- Visibility: Internal
- Kind: Internal implementation class

### bnk

<!-- class:CjsBnkFormat -->
## `CjsBnkFormat`

Reader for Audiokinetic Wwise soundbank (`.bnk`) containers that inspects the bank header, embedded media index, object hierarchy, and referenced bank names without copying payloads, and reads out the raw bank, debug JSON, or undecoded embedded media items.

- Export: `@carbonenginejs/runtime-resource/formats/bnk`
- Source: `src/formats/bnk/CjsBnkFormat.js`
- Visibility: Public
- Kind: Original CarbonEngineJS class

<!-- class:MusicCursor -->
## `MusicCursor`

Little-endian byte cursor over HIRC payload bytes used to decode Wwise interactive-music node payloads with exact-end validation.

- Export: `None`
- Source: `src/formats/bnk/core/musicNodes.js`
- Visibility: Internal
- Kind: Internal implementation class

### cmf

<!-- class:CjsCmfFormat -->
## `CjsCmfFormat`

CMF geometry-container format class that reads, inspects, constructs, and writes CMF data, emitting CMF-native output by default alongside GR2, shared-mesh, and debug JSON targets.

- Export: `@carbonenginejs/runtime-resource/formats/cmf`
- Source: `src/formats/cmf/CjsCmfFormat.js`
- Visibility: Public
- Kind: Original CarbonEngineJS class

<!-- class:BinaryReader -->
## `BinaryReader`

Bounds-checked little-endian offset reader over CMF file bytes, including 64-bit integer reads guarded against unsafe values.

- Export: `None`
- Source: `src/formats/cmf/core/binary.js`
- Visibility: Internal
- Kind: Internal implementation class

<!-- class:Flattener -->
## `Flattener`

Writer-side helper that flattens a CMF object graph into the binary Data section with self-relative tagged span offsets, depth-first ordering, chunk alignment, and duplicate-leaf deduplication, mirroring CarbonEngine's `cmf::BuildFile`.

- Export: `None`
- Source: `src/formats/cmf/core/writer.js`
- Visibility: Internal
- Kind: Internal implementation class

### dds

<!-- class:CjsDdsFormat -->
## `CjsDdsFormat`

DDS texture format profile that inspects header metadata, probes output support, and reads DDS bytes into raw, GPU-free texture, image, or software-decoded RGBA and float payloads (BC1-BC5, BC7, and BC6H included).

- Export: `@carbonenginejs/runtime-resource/formats/dds`
- Source: `src/formats/dds/CjsDdsFormat.js`
- Visibility: Public
- Kind: Original CarbonEngineJS class

<!-- class:Bc7BitReader -->
## `Bc7BitReader`

LSB-first bit reader over a single 128-bit BC7 block bitstream for the software BC7 decoder.

- Export: `None`
- Source: `src/formats/dds/core/bc7.js`
- Visibility: Internal
- Kind: Internal implementation class

### fbx

<!-- class:CjsFbxFormat -->
## `CjsFbxFormat`

FBX format surface that recognizes and inspects FBX files and emits basic static-mesh GR2 or CMF output in pure JavaScript, ahead of full CarbonEngine-equivalent importer coverage.

- Export: `@carbonenginejs/runtime-resource/formats/fbx`
- Source: `src/formats/fbx/CjsFbxFormat.js`
- Visibility: Public
- Kind: Original CarbonEngineJS class

<!-- class:DeflateBitReader -->
## `DeflateBitReader`

Bit reader over a zlib/deflate stream used to inflate compressed FBX property arrays.

- Export: `None`
- Source: `src/formats/fbx/core/helpers.js`
- Visibility: Internal
- Kind: Internal implementation class

<!-- class:DeflateHuffmanTable -->
## `DeflateHuffmanTable`

Canonical Huffman decode table built from deflate code lengths for inflating compressed FBX property arrays.

- Export: `None`
- Source: `src/formats/fbx/core/helpers.js`
- Visibility: Internal
- Kind: Internal implementation class

### flac

<!-- class:CjsFlacFormat -->
## `CjsFlacFormat`

Metadata-only FLAC format profile that validates the stream signature, inspects stream metadata, and emits raw container bytes or debug JSON without decoding PCM.

- Export: `@carbonenginejs/runtime-resource/formats/flac`
- Source: `src/formats/flac/CjsFlacFormat.js`
- Visibility: Public
- Kind: Original CarbonEngineJS class

### gif

<!-- class:CjsGifFormat -->
## `CjsGifFormat`

GIF format profile that inspects header and frame metadata and reads GIF bytes into raw, debug JSON, or LZW-decoded RGBA frame payloads.

- Export: `@carbonenginejs/runtime-resource/formats/gif`
- Source: `src/formats/gif/CjsGifFormat.js`
- Visibility: Public
- Kind: Original CarbonEngineJS class

### gltf

<!-- class:CjsGltfFormat -->
## `CjsGltfFormat`

glTF/GLB format class that parses documents, decodes accessors, and converts meshes, skins, and animations into shared-mesh, GR2, or CMF output plus debug JSON.

- Export: `@carbonenginejs/runtime-resource/formats/gltf`
- Source: `src/formats/gltf/CjsGltfFormat.js`
- Visibility: Public
- Kind: Original CarbonEngineJS class

### gr2

<!-- class:CjsGr2Format -->
## `CjsGr2Format`

Runtime GR2/GSF format class that wraps the migrated `format-gr2` engine under core/ with the runtime-resource format-contract statics ResMan uses for byte probing and async reads.

- Export: `@carbonenginejs/runtime-resource/formats/gr2`
- Source: `src/formats/gr2/CjsGr2Format.js`
- Visibility: Public
- Kind: Original CarbonEngineJS class

<!-- class:CjsFormatGr2 -->
## `CjsFormatGr2`

Migrated GR2/GSF reader that parses Granny files with section decompression, reflected type-tree walking, JSON emission, curve decompression, and caller-class hydration through its core helper modules.

- Export: `@carbonenginejs/runtime-resource/formats/gr2`
- Source: `src/formats/gr2/core/CjsFormatGr2.js`
- Visibility: Public
- Kind: Original CarbonEngineJS class

<!-- class:Decoder -->
## `Decoder`

Arithmetic decoder over the Oodle1 7-bit-per-byte compressed bitstream for GR2 section decompression.

- Export: `None`
- Source: `src/formats/gr2/core/oodle1.js`
- Visibility: Internal
- Kind: Internal implementation class

<!-- class:Dictionary -->
## `Dictionary`

Per-segment Oodle1 decode dictionary holding the adaptive symbol windows for literal and back-reference decoding.

- Export: `None`
- Source: `src/formats/gr2/core/oodle1.js`
- Visibility: Internal
- Kind: Internal implementation class

<!-- class:FrequencyModel -->
## `FrequencyModel`

Adaptive 15-bit-precision frequency model with cumulative tables and a fast symbol lookup used by the clean-room BitKnit2 decompressor.

- Export: `None`
- Source: `src/formats/gr2/core/bitknit2.js`
- Visibility: Internal
- Kind: Internal implementation class

<!-- class:WeighWindow -->
## `WeighWindow`

Adaptive weighted symbol window that Oodle1 dictionaries use to model symbol probabilities.

- Export: `None`
- Source: `src/formats/gr2/core/oodle1.js`
- Visibility: Internal
- Kind: Internal implementation class

### jpeg

<!-- class:CjsJpegFormat -->
## `CjsJpegFormat`

JPEG format profile that inspects marker and header metadata and reads baseline JPEG bytes into raw, debug JSON, or RGBA payloads through the in-project baseline decoder.

- Export: `@carbonenginejs/runtime-resource/formats/jpeg`
- Source: `src/formats/jpeg/CjsJpegFormat.js`
- Visibility: Public
- Kind: Original CarbonEngineJS class

<!-- class:BaselineJpegDecoder -->
## `BaselineJpegDecoder`

Pure-JS baseline sequential JPEG decoder that parses markers, quantization and Huffman tables, and entropy-coded scans into RGBA pixels.

- Export: `None`
- Source: `src/formats/jpeg/core/jpeg.js`
- Visibility: Internal
- Kind: Internal implementation class

<!-- class:EntropyReader -->
## `EntropyReader`

Bit-level reader over JPEG entropy-coded data that handles byte stuffing and restart markers for the baseline decoder.

- Export: `None`
- Source: `src/formats/jpeg/core/jpeg.js`
- Visibility: Internal
- Kind: Internal implementation class

### mp3

<!-- class:CjsMp3Format -->
## `CjsMp3Format`

MP3 audio format profile that inspects frame and tag metadata and emits raw container bytes or debug JSON, with PCM decoding not implemented.

- Export: `@carbonenginejs/runtime-resource/formats/mp3`
- Source: `src/formats/mp3/CjsMp3Format.js`
- Visibility: Public
- Kind: Original CarbonEngineJS class

### mp4

<!-- class:CjsMp4Format -->
## `CjsMp4Format`

MP4 container format profile that inspects box and track structure and emits raw bytes, debug JSON, or a container-only video payload with codec and duration summaries but no frame decoding.

- Export: `@carbonenginejs/runtime-resource/formats/mp4`
- Source: `src/formats/mp4/CjsMp4Format.js`
- Visibility: Public
- Kind: Original CarbonEngineJS class

### obj

<!-- class:CjsObjFormat -->
## `CjsObjFormat`

OBJ format class that parses Wavefront OBJ text and rebuilds it into shared-mesh, GR2, or CMF output plus debug JSON through its core helpers.

- Export: `@carbonenginejs/runtime-resource/formats/obj`
- Source: `src/formats/obj/CjsObjFormat.js`
- Visibility: Public
- Kind: Original CarbonEngineJS class

### ogg

<!-- class:CjsOggFormat -->
## `CjsOggFormat`

Ogg container format profile that inspects page and stream metadata and decodes Ogg Vorbis audio to PCM with the in-project pure-JS Vorbis decoder, alongside raw and debug JSON output.

- Export: `@carbonenginejs/runtime-resource/formats/ogg`
- Source: `src/formats/ogg/CjsOggFormat.js`
- Visibility: Public
- Kind: Original CarbonEngineJS class

<!-- class:Codebook -->
## `Codebook`

Vorbis codebook that builds Huffman decode trees and VQ lookup vectors for scalar and vector packet decoding.

- Export: `None`
- Source: `src/formats/ogg/core/vorbis.js`
- Visibility: Internal
- Kind: Internal implementation class

<!-- class:PacketReader -->
## `PacketReader`

LSB-first bit reader over one Vorbis packet's bytes for the pure-JS Vorbis decoder.

- Export: `None`
- Source: `src/formats/ogg/core/vorbis.js`
- Visibility: Internal
- Kind: Internal implementation class

### png

<!-- class:CjsPngFormat -->
## `CjsPngFormat`

PNG format profile that synchronously inspects chunk and header metadata and emits raw bytes or debug JSON, with RGBA decoding available on the asynchronous read path.

- Export: `@carbonenginejs/runtime-resource/formats/png`
- Source: `src/formats/png/CjsPngFormat.js`
- Visibility: Public
- Kind: Original CarbonEngineJS class

### red

<!-- class:CjsRedFormat -->
## `CjsRedFormat`

Red format profile that reads type-discriminated, self-referential Red YAML object graphs and emits a compact public payload, a neutral raw graph, or caller-supplied runtime classes through the core-types hydration adapter.

- Export: `@carbonenginejs/runtime-resource/formats/red`
- Source: `src/formats/red/CjsRedFormat.js`
- Visibility: Public
- Kind: Original CarbonEngineJS class

<!-- class:CjsRedReader -->
## `CjsRedReader`

Reader that walks a Red (YAML) type-discriminated, self-referential graph into payload, raw, or runtime shapes, sharing repeated nodes and stripping authoring-tool keys.

- Export: `None`
- Source: `src/formats/red/core/CjsRedReader.js`
- Visibility: Internal
- Kind: Internal implementation class

### stl

<!-- class:CjsStlFormat -->
## `CjsStlFormat`

STL format class that parses ASCII and binary STL, writes STL from shared meshes, and inspects printability, emitting shared-mesh, GR2, or CMF output plus debug JSON.

- Export: `@carbonenginejs/runtime-resource/formats/stl`
- Source: `src/formats/stl/CjsStlFormat.js`
- Visibility: Public
- Kind: Original CarbonEngineJS class

<!-- class:DisjointSet -->
## `DisjointSet`

Union-find structure with path compression used to group edge-connected triangles during STL printability inspection.

- Export: `None`
- Source: `src/formats/stl/core/stl.js`
- Visibility: Internal
- Kind: Internal implementation class

### tga

<!-- class:CjsTgaFormat -->
## `CjsTgaFormat`

TGA format profile that inspects header metadata and reads TGA bytes into raw, debug JSON, or decoded RGBA image payloads.

- Export: `@carbonenginejs/runtime-resource/formats/tga`
- Source: `src/formats/tga/CjsTgaFormat.js`
- Visibility: Public
- Kind: Original CarbonEngineJS class

### wav

<!-- class:CjsWavFormat -->
## `CjsWavFormat`

WAV audio format profile that inspects RIFF chunk metadata and reads supported WAV bytes into PCM or audio payloads, alongside raw and debug JSON output.

- Export: `@carbonenginejs/runtime-resource/formats/wav`
- Source: `src/formats/wav/CjsWavFormat.js`
- Visibility: Public
- Kind: Original CarbonEngineJS class

### webm

<!-- class:CjsWebmFormat -->
## `CjsWebmFormat`

WebM container format profile that inspects EBML segment and track structure and emits raw bytes, debug JSON, or a container-only video payload with codec and duration summaries but no frame decoding.

- Export: `@carbonenginejs/runtime-resource/formats/webm`
- Source: `src/formats/webm/CjsWebmFormat.js`
- Visibility: Public
- Kind: Original CarbonEngineJS class

### webp

<!-- class:CjsWebpFormat -->
## `CjsWebpFormat`

Metadata-only WebP format profile that inspects RIFF chunk headers and emits raw container bytes or debug JSON without decoding pixels.

- Export: `@carbonenginejs/runtime-resource/formats/webp`
- Source: `src/formats/webp/CjsWebpFormat.js`
- Visibility: Public
- Kind: Original CarbonEngineJS class

### wem

<!-- class:CjsWemFormat -->
## `CjsWemFormat`

Reader for Audiokinetic Wwise media (`.wem`) containers that inspects codec, channel/rate layout, and Vorbis duration, and reads out raw container bytes, a ww2ogg-style Ogg repack of Wwise Vorbis, or decoded PCM.

- Export: `@carbonenginejs/runtime-resource/formats/wem`
- Source: `src/formats/wem/CjsWemFormat.js`
- Visibility: Public
- Kind: Original CarbonEngineJS class

<!-- class:BitReader -->
## `BitReader`

LSB-first bit reader over Wwise Vorbis packet bytes for the Ogg repacking path.

- Export: `None`
- Source: `src/formats/wem/core/bitStream.js`
- Visibility: Internal
- Kind: Internal implementation class

<!-- class:OggPageWriter -->
## `OggPageWriter`

LSB-first bit writer that assembles repacked Wwise Vorbis packets into standard Ogg pages, one page per packet, matching ww2ogg behavior.

- Export: `None`
- Source: `src/formats/wem/core/bitStream.js`
- Visibility: Internal
- Kind: Internal implementation class

### yaml

<!-- class:CjsYamlFormat -->
## `CjsYamlFormat`

YAML format profile that parses YAML text into payload, JSON-graph, raw, or document output with configurable tag policies, alias limits, and identity/reference markers.

- Export: `@carbonenginejs/runtime-resource/formats/yaml`
- Source: `src/formats/yaml/CjsYamlFormat.js`
- Visibility: Public
- Kind: Original CarbonEngineJS class

<!-- class:CjsYamlReader -->
## `CjsYamlReader`

Construction-bound reader that parses one YAML source with the `yaml` library and produces the format's payload, raw, or document graphs while enforcing tag policy and alias limits.

- Export: `None`
- Source: `src/formats/yaml/core/CjsYamlReader.js`
- Visibility: Internal
- Kind: Internal implementation class
