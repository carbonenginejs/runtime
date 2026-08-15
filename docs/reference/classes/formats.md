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

<!-- class:WwiseCursor -->
## `WwiseCursor`

Bounds-aware little-endian cursor used for exact Wwise v150 NodeBase, authored-SFX, and attenuation decoding.

- Export: `None`
- Source: `src/formats/bnk/core/nodeBase.js`
- Visibility: Internal
- Kind: Internal implementation class

<!-- class:GlobalSettingsCursor -->
## `GlobalSettingsCursor`

Bounds-aware little-endian cursor over one Wwise Global Settings payload.

- Export: `None`
- Source: `src/formats/bnk/core/globalSettings.js`
- Visibility: Internal
- Kind: Internal implementation class

<!-- class:ActionCursor -->
## `ActionCursor`

Bounds-aware byte cursor used for exact Wwise v150 Event Action decoding.

- Export: `None`
- Source: `src/formats/bnk/core/eventAction.js`
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

### dxbc

<!-- class:CjsDxbcFormat -->
## `CjsDxbcFormat`

DXBC shader-bytecode format profile that reads container chunks, signatures, and the decoded shader program from compiled Direct3D bytecode.

- Export: `@carbonenginejs/runtime-resource/formats/dxbc`
- Source: `src/formats/dxbc/CjsDxbcFormat.js`
- Visibility: Public
- Kind: Original CarbonEngineJS class

<!-- class:DxbcReader -->
## `DxbcReader`

Bounded little-endian byte cursor over DXBC payloads, with optional shared string-table resolution.

- Export: `None`
- Source: `src/formats/dxbc/core/DxbcReader.js`
- Visibility: Internal
- Kind: Internal implementation class

<!-- class:DxbcContainer -->
## `DxbcContainer`

Parsed DXBC container that locates and exposes its four-character-code chunks.

- Export: `None`
- Source: `src/formats/dxbc/core/container.js`
- Visibility: Internal
- Kind: Internal implementation class

<!-- class:DxbcInstructionDecoder -->
## `DxbcInstructionDecoder`

Decodes the DXBC shader token stream into structured instructions, operands, and declarations.

- Export: `None`
- Source: `src/formats/dxbc/core/decoder.js`
- Visibility: Internal
- Kind: Internal implementation class

<!-- class:DxbcReadError -->
## `DxbcReadError`

Error raised when DXBC bytes are malformed, truncated, or structurally invalid.

- Export: `None`
- Source: `src/formats/dxbc/core/errors.js`
- Visibility: Internal
- Kind: Internal implementation class

<!-- class:DxbcShaderProgram -->
## `DxbcShaderProgram`

Decoded DXBC shader program: version, stage type, and its ordered instruction stream.

- Export: `None`
- Source: `src/formats/dxbc/core/program.js`
- Visibility: Internal
- Kind: Internal implementation class

<!-- class:DxbcSignatureChunk -->
## `DxbcSignatureChunk`

Parsed DXBC input, output, or patch-constant signature chunk and its parameter records.

- Export: `None`
- Source: `src/formats/dxbc/core/signature.js`
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

### hlsl

<!-- class:CjsHlslFormat -->
## `CjsHlslFormat`

Compiled Carbon effect format profile that reads .sm_* shader packages into permutation, technique, and stage metadata.

- Export: `@carbonenginejs/runtime-resource/formats/hlsl`
- Source: `src/formats/hlsl/CjsHlslFormat.js`
- Visibility: Public
- Kind: Original CarbonEngineJS class

<!-- class:HlslReader -->
## `HlslReader`

Bounded little-endian byte cursor over compiled effect payloads, with shared string-table resolution.

- Export: `None`
- Source: `src/formats/hlsl/core/HlslReader.js`
- Visibility: Internal
- Kind: Internal implementation class

<!-- class:HlslEffectReadError -->
## `HlslEffectReadError`

Error raised when compiled effect bytes are malformed, truncated, or an unsupported version.

- Export: `None`
- Source: `src/formats/hlsl/core/HlslEffectReadError.js`
- Visibility: Internal
- Kind: Internal implementation class

<!-- class:HlslEffectStateManager -->
## `HlslEffectStateManager`

Resolves and caches render-state setups referenced by a compiled effect while it is read.

- Export: `None`
- Source: `src/formats/hlsl/core/HlslEffectStateManager.js`
- Visibility: Internal
- Kind: Internal implementation class

<!-- class:HlslRenderStateSetup -->
## `HlslRenderStateSetup`

Ordered render-state key and value records attached to one pass.

- Export: `None`
- Source: `src/formats/hlsl/core/HlslRenderStateSetup.js`
- Visibility: Internal
- Kind: Internal implementation class

<!-- class:HlslResourceSetDescription -->
## `HlslResourceSetDescription`

Describes one resource set bound by a compiled effect stage.

- Export: `None`
- Source: `src/formats/hlsl/core/HlslResourceSetDescription.js`
- Visibility: Internal
- Kind: Internal implementation class

<!-- class:HlslShaderBytecode -->
## `HlslShaderBytecode`

Stage bytecode payload carried by a compiled effect, with its stage type and name.

- Export: `None`
- Source: `src/formats/hlsl/core/HlslShaderBytecode.js`
- Visibility: Internal
- Kind: Internal implementation class

<!-- class:HlslEffectRes -->
## `HlslEffectRes`

Parsed compiled effect resource: permutation axes, body offsets, and lazily decoded shader bodies.

- Export: `None`
- Source: `src/formats/hlsl/core/tr2/resources/HlslEffectRes.js`
- Visibility: Internal
- Kind: Internal implementation class

<!-- class:HlslShaderPermutation -->
## `HlslShaderPermutation`

One permutation axis of a compiled effect, with its ordered options and default.

- Export: `None`
- Source: `src/formats/hlsl/core/tr2/resources/HlslShaderPermutation.js`
- Visibility: Internal
- Kind: Internal implementation class

<!-- class:HlslEffectBindingManifest -->
## `HlslEffectBindingManifest`

Flattened per-stage binding manifest derived from a resolved effect description.

- Export: `None`
- Source: `src/formats/hlsl/core/tr2/shader/HlslEffectBindingManifest.js`
- Visibility: Internal
- Kind: Internal implementation class

<!-- class:HlslEffectConstant -->
## `HlslEffectConstant`

Reflected shader constant: name, offset, size, type, dimension, and element count.

- Export: `None`
- Source: `src/formats/hlsl/core/tr2/shader/HlslEffectConstant.js`
- Visibility: Internal
- Kind: Internal implementation class

<!-- class:HlslEffectDescription -->
## `HlslEffectDescription`

Decoded effect body: techniques, passes, stages, libraries, and top-level annotations.

- Export: `None`
- Source: `src/formats/hlsl/core/tr2/shader/HlslEffectDescription.js`
- Visibility: Internal
- Kind: Internal implementation class

<!-- class:HlslEffectLibrary -->
## `HlslEffectLibrary`

Ray-tracing shader library record with its exports, payload size, and stage inputs.

- Export: `None`
- Source: `src/formats/hlsl/core/tr2/shader/HlslEffectLibrary.js`
- Visibility: Internal
- Kind: Internal implementation class

<!-- class:HlslEffectParameterAnnotation -->
## `HlslEffectParameterAnnotation`

Typed annotation attached to a reflected effect parameter.

- Export: `None`
- Source: `src/formats/hlsl/core/tr2/shader/HlslEffectParameterAnnotation.js`
- Visibility: Internal
- Kind: Internal implementation class

<!-- class:HlslEffectResource -->
## `HlslEffectResource`

Reflected shader resource or UAV binding with its register identity and array count.

- Export: `None`
- Source: `src/formats/hlsl/core/tr2/shader/HlslEffectResource.js`
- Visibility: Internal
- Kind: Internal implementation class

<!-- class:HlslEffectStageInput -->
## `HlslEffectStageInput`

Reflected stage input: constants, resources, samplers, signatures, and default constant bytes.

- Export: `None`
- Source: `src/formats/hlsl/core/tr2/shader/HlslEffectStageInput.js`
- Visibility: Internal
- Kind: Internal implementation class

<!-- class:HlslEffectTechnique -->
## `HlslEffectTechnique`

Named technique of a compiled effect body and its ordered passes.

- Export: `None`
- Source: `src/formats/hlsl/core/tr2/shader/HlslEffectTechnique.js`
- Visibility: Internal
- Kind: Internal implementation class

<!-- class:HlslPass -->
## `HlslPass`

One pass of a technique, carrying its stage inputs and render states.

- Export: `None`
- Source: `src/formats/hlsl/core/tr2/shader/HlslPass.js`
- Visibility: Internal
- Kind: Internal implementation class

<!-- class:HlslSamplerDescription -->
## `HlslSamplerDescription`

Sampler state description: filters, address modes, LOD bounds, and comparison function.

- Export: `None`
- Source: `src/formats/hlsl/core/tr2/shader/HlslSamplerDescription.js`
- Visibility: Internal
- Kind: Internal implementation class

<!-- class:HlslSamplerSetup -->
## `HlslSamplerSetup`

Named or static sampler setup bound by a compiled effect stage.

- Export: `None`
- Source: `src/formats/hlsl/core/tr2/shader/HlslSamplerSetup.js`
- Visibility: Internal
- Kind: Internal implementation class

<!-- class:HlslShader -->
## `HlslShader`

Decoded shader body for one permutation index, wrapping its effect description.

- Export: `None`
- Source: `src/formats/hlsl/core/tr2/shader/HlslShader.js`
- Visibility: Internal
- Kind: Internal implementation class

<!-- class:HlslShaderOption -->
## `HlslShaderOption`

One option value of a permutation axis.

- Export: `None`
- Source: `src/formats/hlsl/core/tr2/shader/HlslShaderOption.js`
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

### pickle

<!-- class:CjsPickleFormat -->
## `CjsPickleFormat`

Data-only Python pickle format facade that currently decodes protocol 0 into JSON-compatible values or identity-preserving payload graphs while rejecting callable and object-construction opcodes.

- Export: `@carbonenginejs/runtime-resource/formats/pickle`
- Source: `src/formats/pickle/CjsPickleFormat.js`
- Visibility: Public
- Kind: Original CarbonEngineJS class

<!-- class:CjsSqliteFormat -->
## `CjsSqliteFormat`

Reads a SQLite 3 container as data: the tables it holds and every row of them, with no SQL and no query engine.

- Export: `@carbonenginejs/runtime-resource/formats/sqlite`
- Source: `src/formats/sqlite/CjsSqliteFormat.js`
- Visibility: Public
- Kind: Original CarbonEngineJS class
- Notes: Read-only and full-scan. Index b-trees are never walked, and nothing here needs a driver or a filesystem.

<!-- class:CjsStaticFormat -->
## `CjsStaticFormat`

Identifies which of three unrelated containers a client `.static` file holds, decoding the prefixed-pickle family and reporting the SQLite and schema-bound families rather than guessing at them.

- Export: `@carbonenginejs/runtime-resource/formats/static`
- Source: `src/formats/static/CjsStaticFormat.js`
- Visibility: Public
- Kind: Original CarbonEngineJS class
- Notes: Signature-based. Opening a SQLite container needs a database driver, which callers own.

<!-- class:CjsPickleProtocol0Reader -->
## `CjsPickleProtocol0Reader`

Construction-bound decoder for the inert data subset of Python pickle protocol 0.

- Export: `None`
- Source: `src/formats/pickle/core/CjsPickleProtocol0Reader.js`
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

Red format profile that reads type-discriminated, self-referential Red YAML object graphs and emits a compact public payload, a neutral raw graph, or caller-supplied runtime classes through the runtime-utils hydration adapter.

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

### shared effect layer

### webgl

<!-- class:CjsWebglFormat -->
## `CjsWebglFormat`

WebGL shader format profile that translates compiled Carbon effects into Carbon v15 containers carrying GLSL programs and a per-pass backend block.

- Export: `@carbonenginejs/runtime-resource/formats/webgl`
- Source: `src/formats/webgl/CjsWebglFormat.js`
- Visibility: Public
- Kind: Original CarbonEngineJS class

<!-- class:WebglReadError -->
## `WebglReadError`

Error raised when container bytes or their backend blocks are malformed or inconsistent.

- Export: `None`
- Source: `src/formats/webgl/core/errors.js`
- Visibility: Internal
- Kind: Internal implementation class

<!-- class:DxbcGlslEmitter -->
## `DxbcGlslEmitter`

Translates decoded DXBC shader programs into GLSL for the WebGL backend.

- Export: `None`
- Source: `src/formats/webgl/core/glsl/DxbcGlslEmitter.js`
- Visibility: Internal
- Kind: Internal implementation class

<!-- class:DxbcGlslHelperRegistry -->
## `DxbcGlslHelperRegistry`

Collects and emits the GLSL helper functions a translated program requires.

- Export: `None`
- Source: `src/formats/webgl/core/glsl/DxbcGlslHelpers.js`
- Visibility: Internal
- Kind: Internal implementation class

<!-- class:DxbcGlslOperandFormatter -->
## `DxbcGlslOperandFormatter`

Formats DXBC operands, swizzles, and modifiers as GLSL expressions.

- Export: `None`
- Source: `src/formats/webgl/core/glsl/DxbcGlslOperandFormatter.js`
- Visibility: Internal
- Kind: Internal implementation class

### webgpu

<!-- class:CjsWebgpuFormat -->
## `CjsWebgpuFormat`

WebGPU shader format profile that translates compiled Carbon effects into Carbon WebGPU containers carrying WGSL programs and bind-group layouts.

- Export: `@carbonenginejs/runtime-resource/formats/webgpu`
- Source: `src/formats/webgpu/CjsWebgpuFormat.js`
- Visibility: Public
- Kind: Original CarbonEngineJS class

<!-- class:CarbonWebgpuContainer -->
## `CarbonWebgpuContainer`

Reader over one WebGPU effect container.

- Export: `None`
- Source: `src/formats/webgpu/core/carbonWebgpu/CarbonWebgpuContainer.js`
- Visibility: Internal
- Kind: Internal implementation class

<!-- class:WebgpuReadError -->
## `WebgpuReadError`

Error raised when Carbon WebGPU bytes or package documents are malformed or inconsistent.

- Export: `None`
- Source: `src/formats/webgpu/core/errors.js`
- Visibility: Internal
- Kind: Internal implementation class

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

YAML format profile that parses YAML text or strict UTF-8 bytes into payload, JSON-graph, raw, or document output with configurable tag policies, alias limits, and identity/reference markers.

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
