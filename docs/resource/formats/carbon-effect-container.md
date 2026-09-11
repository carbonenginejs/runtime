# Carbon compiled-effect container

Status: Stable
Visibility: Public
Scope: `@carbonenginejs/runtime/resource` — `src/resource/format/carbonEffect/`, `src/resource/format/CjsByteReader.js`, `src/resource/format/CjsByteWriter.js`, `src/resource/format/CjsStringTable.js`
Audience: Anyone reading or writing compiled shader effect bytes, or extending `.carbonwebgpu`
Summary: The v15 binary layout of Carbon's compiled effect files, the shared byte reader and writer that implement it, and the arena offset policy a byte-exact re-emit depends on.

## What this is

Carbon's shader compiler emits one file per effect containing **every permutation**,
selected at read time through an offset table. The format contains a header,
a deduplicated blob arena ("string table"), one dense offset-table row per
permutation, and one stored description blob per distinct encoded body.

This package implements it as a shared reader and writer, verified byte-exact against
CCP's own shipped files. It is the wire foundation for **both** browser backends:
`.carbonwebgpu` and `.carbonwebgl` are the same Carbon v15 container, differing
only in the program text occupying each stage's slot and in the optional
per-pass backend block. Neither carries a private magic or chunk layout.

| module | role |
|---|---|
| `src/resource/format/CjsByteReader.js` | little-endian cursor plus arena resolution primitives; shared by the HLSL, Carbon-effect, and WebGL readers |
| `src/resource/format/CjsByteWriter.js` | growable append cursor with reserve-and-patch |
| `src/resource/format/CjsStringTable.js` | the blob arena, with Carbon's bytewise-sorted offset assignment |
| `src/resource/format/carbonEffect/carbonEffectRecords.js` | the v15 description-blob record codec |
| `src/resource/format/carbonEffect/CjsCarbonEffectReader.js` | container reader and structural checks |
| `src/resource/format/carbonEffect/CjsCarbonEffectWriter.js` | container writer, offset arithmetic and alias dedupe |

## Versioning: how Carbon does it, and what this reader does instead

### Carbon validates the version, then threads it through parsing

Carbon validates the version once in `Tr2EffectRes`: 2..15 are accepted
(`Tr2EffectRes.cpp:209`). Within that range, version is a parsing input,
passed with buffer, size and string table to the description reader
(`Tr2EffectRes.cpp:128`). `Tr2EffectDescription.cpp` threads it through
`ReadConstant`, `ReadResource`, `ReadPipelineInputs`, `ReadRegisters`,
`ReadInput` and the pass/technique loop: 22 conditional sites use 16 distinct
comparisons.

| Threshold | What it decides |
| --- | --- |
| `> 8` | Whether a stage carries a register signature **at all** |
| `< 14` | Where pipeline inputs are read, and whether registers are read beside them |
| `< 11` | How a constant's type byte is decoded — older files remap a legacy enum, so the byte count is unchanged but its meaning is not |
| `>= 13` | Whether a resource carries `arrayElements` at all; below 13 it is absent and defaults to 1 |
| `< 5`, `< 4`, `>= 3`, `>= 4` | Stage-input presence and ordering |
| `> 6`, `> 9`, `> 10`, `> 12`, `>= 8` | Per-record field presence |
| `> 13`, `>= 14` | Library and pipeline-input placement |

These thresholds change reflection layout or meaning, not merely the header.
`Tr2EffectRes.cpp` separately handles header size (`< 5`), compiler version
and source hash (`>= 15`), and permutation type (`> 5`). Together, container
and description parsing absorb the differences; `Tr2Shader` has no version
field or version-dependent branch. Consumers above that boundary stay version-free.

### What this reader does: reads 8 through 15, writes 15

`readEffectDescription` takes a version option and branches on it. Accepted
versions are `CARBON_EFFECT_MIN_DATA_VERSION` = 8 through
`CARBON_EFFECT_DATA_VERSION` = 15. The briefly constant-folded v15 reader's
branches were restored on 2026-08-02.

Read and write support are independent. `CjsCarbonEffectWriter`,
`writeCarbonEffectFile`, the shared container builder and both backend
packagers accept an output `version`, defaulting to current; source version
never selects it, even for v8 input. `CARBON_EFFECT_WRITE_VERSIONS` is
currently `[15]`: unsupported outputs are refused, never v15 bytes mislabeled
with another number. A future output version needs writer branches and a set entry.

Inputs outside 8..15 are rejected with the version read; do not apply v15
rules to older layouts. A dword below 8 is a recognized legacy number, not
proof of an effect container: arbitrary bytes can begin with that integer,
and this field has no identifying magic or checksum. Identify rejected inputs
independently before treating them as a version-porting problem.

### Why 15 is the version that got implemented

Version 15 has an authoritative writer and covers the entire audited build
3444265 corpus: 3222 files across `effect.dx11`/`effect.dx12`, plus the
same 537 shaders under `effect.metal`; no older version appeared. Carbon's
v13/v14 branches mark field-order boundaries uncertain. The v15 body is
byte-identical to v14; only 36 header bytes were added (compiler version and
source hash).

## Layout

### Header

```
u32      version = 15
u8[4]    shaderCompilerVersion       {major, minor, patch, tweak}
char[32] sourceHash                  ASCII hex MD5 of the HLSL source inputs
u32      stringTableSize | arena payload
u8       permutationCount | permutation records
u32      recordCount     | recordCount x { u32 index, u32 offset, u32 size }
description blobs
```

The compiler writes this order and the runtime reads the same order.

The compiler version is **four bytes, not a `u32`**, and Carbon's rebuild check
compares only the first three. A shipped v15 header reads `01 02 06 00` —
compiler 1.2.6.0, matching the ShaderCompiler project version. As a `u32` those
bytes are `0x00060201`, which means nothing. `HlslEffectRes` historically read
the field as a dword; it now also exposes `m_compilerVersionBytes`, which is the
truthful reading and what new code should use.

The compiler's rebuild check reads the 32-byte hash, while the runtime skips it.
It is provenance, not integrity.

A permutation record is:

```
u32 nameOffset | u8 defaultOption | u32 descriptionOffset | u8 type | u8 optionCount | u32 optionOffset[optionCount]
```

Note the field order: `defaultOption` sits between the name and the description.
Carbon writes that byte inside a conditional loop with no `else`, so a
permutation whose declared default matches no option would emit a record one
byte short and desynchronise the entire rest of the header. Our writer always
emits it.

### Body-offset arithmetic

```
base = 4 + 4 + 32 + headerSize + stringTable.GetSize()
headerSize = (recordCount * 3 + 1) * 4 + permutationBytes
permutationBytes = 1 + Σ (11 + optionCount * 4)
```

`GetSize()` **includes** the arena's own `u32` length prefix, so the prefix is
counted exactly once. Row offsets are absolute from byte 0 of the file.
`CjsCarbonEffectWriter` asserts that the bytes it actually wrote before the
first body equal this computed base, so an arithmetic error fails loudly rather
than shifting every body.

### The arena

`CjsStringTable` is Carbon's `StringTable`. Three properties matter:

1. **Offsets are assigned by a bytewise sort, not by insertion order.**
   The comparison is `memcmp` over the shorter length, then shorter-wins on a
   tie, before cumulative offsets are assigned. Any writer that assigns
   first-seen offsets produces a valid file that is not byte-identical to
   Carbon's.
2. **Dedupe is on exact bytes with no suffix merging.** `"red"` gets its own
   entry even though it is a suffix of `"shared"`.
3. **There are two kinds of entry and no manifest.** A NUL-terminated string is
   added with its terminator and referenced by a bare `u32` offset. A sized blob
   — shader bytecode, program source, default constant values — is added with
   exactly its own bytes and referenced by a `{u32 size, u32 offset}` pair. The
   arena writes a `u32` payload size and the payload, nothing else; every
   reference site resolves its own entry.

## Two rules for anything added later

These rules were found through implementation rather than Carbon's code and
apply to every future format addition.

**Rule 1: every sized record must parse to exactly its declared end.** Trailing
bytes indicate unknown fields or a writer miscount; both are fatal. Enforce
this for descriptions (`readEffectDescription`), backend blocks
(`readBackendBlock`) and the header/body boundary. The former chunk container
spent roughly 600 lines cross-checking projections, catching malformed writer
trees as well as files. Record containment replaces most of those checks;
exact-end parsing catches remaining writer/reader disagreement and must cover
every sized record.

**Rule 2: anything placed in the arena must be arena-independent.** Arena
offsets depend on sorting every entry's bytes, so embedding an arena offset
inside an entry makes its content depend circularly on the sort. Carbon's
strings, bytecode and default-value blobs are leaves; our backend block is a
non-leaf and therefore uses inline length-prefixed strings. Its invariant test
requires identical block bytes regardless of which arena receives it.

### The non-dynamic sampler name is kept, though Carbon's runtime drops it

`FindSamplerByName` only needs dynamic samplers, so Carbon's runtime nulls
other names. The file still carries them: `readSampler` and `writeSampler`
preserve `name` regardless of `isDynamic`. **Re-emission preserves the file,
not the runtime's narrower view.** This section's former claim that the name
was unrecoverable was wrong. The three closed class-layer losses and their
byte-equality proof are recorded once under [Verification](#verification).

The stage-type byte preserves Carbon's `InputStageType` numbering: vertex,
pixel, compute, geometry, hull and domain. The container admits all six, with
`stages` capped at `SHADER_TYPE_COUNT` = 6.
A backend supporting only three rejects the others in its own layer; it does
not narrow the backend-invariant Carbon region.

`0xffffffff` is the null reference, legal at exactly one offset position: a stage's
default-constant-value offset with size zero, consumed without dereferencing.
Every other occurrence as an offset fails loading.

Two deliberate departures preserve byte-identical output:

- **Initialize `m_size`.** Carbon leaves it indeterminate, relying on its
  single instance being a zero-initialized global.
- **Reject additions after handing out offsets.** Carbon's `GetOffset`
  re-sorts dirty tables, reassigning even offsets already packed into bodies;
  Carbon avoids this by interning late strings before packing.
  `CjsCarbonEffectWriter` enforces two walks through the same
  `writeEffectDescription`: `collectArena` interns, then `internArena`
  emits. Sharing that walk prevents collection/emission drift.

### Description blob, v15 field order

Derived independently from the writer's save order and the reader's load order,
then confirmed to agree field for field. Counts are `u8` unless marked.

```
u8  techniqueCount
  u32 name
  u8  passCount                                        cap 64
    u8  stageCount                                     cap 6 (SHADER_TYPE_COUNT)
      u8  stageType
      u32 shaderSize | u32 shaderDataOffset            program payload, arena blob
      u32 threadGroupSize[3]
      u8  pipelineInputCount                           cap 64
        u8 usage, registerIndex, usageIndex, usedMask, type, dimension
      -- StageData --
      u8  registerCount
        u8 registerType | u32 registerIndex | u32 registerCount | u8 registerSpace
      u8  staticSamplerCount
        u32 registerIndex | u8 registerSpace | u8 x7 filters/address
        f32 mipLODBias | u8 maxAnisotropy | u8 comparisonFunc
        u8  borderColor                                enum, NOT four floats
        f32 minLOD | f32 maxLOD
      u32 constantCount                                u32, not u8
        u32 name | u32 offset | u32 size | u8 type | u8 dimension
        u32 elements | u8 isSRGB | u8 isAutoregister
      u32 defaultValuesSize | u32 defaultValuesOffset  0xffffffff legal when size 0
      u8  textureCount                                 cap 64
        u8 registerIndex | u32 name | u8 type | u32 count | u8 isSRGB | u8 isAutoregister
      u8  samplerCount                                 cap 64
        u8 registerIndex | u32 name | u8 x7 | f32 mipLODBias | u8 maxAnisotropy
        u8 comparisonFunc | f32 borderColor[4] | f32 minLOD | f32 maxLOD | u8 isDynamic
      u8  uavCount                                     cap 64
        u8 registerIndex | u32 name | u8 type | u32 count | u8 isAutoregister
      u8  annotationCount
        u32 name | u8 type | (u32 stringOffset if type == STRING else 4 raw bytes)
    u8  renderStateCount                               cap 64
      u32 state | u32 value
  u8  libraryCount
    u32 payloadSize | u32 shaderSize | u32 shaderDataOffset
    u32 exportCount                                    u32, not u8
      u8 type | u32 name
    u32 hitGroupName
    StageData globalInputs
    StageData localInputs
u16 parameterCount                                     cap 256
  u32 name | annotation map as above
```

Four places this is easy to get wrong:

- **At v15 the program payload comes first and the signature tables follow.**
  `pipelineInputs` and `registers` sit *after* `shaderCode` and `threadGroupSize`.
  Before v14 it was the other way round; v14 moved them, and Carbon marks its own
  v14 branch as uncertain.
- **A UAV record is one byte shorter than a texture record** — it has no `isSRGB`.
  Carbon's reader hardcodes `isSRGB = false` and the writer omits it. Sharing one
  "resource" codec between the two silently corrupts every subsequent field.
- **`borderColor` is four floats on a sampler and one byte on a static sampler**
  because the two records mirror different D3D binding models.
- **A non-string annotation value is four raw bytes.** Carbon writes it through the
  `float` member of a `{float,int32_t}` union and reads it back through a different
  union. The bytes round-trip; applying an int/float conversion does not. The codec
  keeps `rawValue` as bytes for exactly this reason.

Carbon writes `textures`, `samplers`, `uavs` and render states in ascending key
order and sorts annotation keys by bytewise string comparison.
`compareAnnotationNames` implements that comparison over UTF-8 bytes, which is
*not* the same as JavaScript's UTF-16 code-unit order for names outside ASCII
— `"Z"` sorts before `"a"`.

### The optional trailing block

Our own containers add exactly one optional block per pass, after the render-state
table, referenced by a `{u32 size, u32 offset}` pair into the arena. A Carbon file
ends the pass at the render states, so the reader and writer gate it on
`{ backend: true }` and produce Carbon's bytes unchanged when it is closed.

The block carries the two sections that are not derivable from Carbon reflection —
WebGPU bind-group layouts and resource transforms — in **one** unit, because they
are mutually required and because "the Carbon region is backend-invariant, with
exactly one optional trailing block" is the invariant worth keeping.

It lives in the arena so identical layouts dedupe across bodies the way program
source does; measured sharing is 30.5:1 at `(body, pass)` granularity, 22 distinct
blocks across 672 pairs. That forces one property: **the block contains no arena
offsets.** An offset is only known after the arena's content sort, which depends on
every blob's bytes including this one, so a block referencing the arena could not be
built before it was interned. Strings inside it are inline and length-prefixed.

```
u8  backendEngineId = 2             WebGPU; not a version
u8  bindGroupCount
  u8 group | u8 bindingCount
    u8  resourceKind | u8 registerSpace | u8 binding | u8 visibilityMask
    u32 registerIndex | u32 structureStride (0xffffffff absent) | u8 arrayLayerCount (0 absent)
    str type | str generatedSymbol | str transformId (empty = none)
u8  transformCount
  u8 familyCode | str id | u8 inputCount
    u8 registerSpace | u8 registerIndex | str parameter
```

`identity` and `group` on each binding, and a transform's `kind`,
`stage`, `representation`, `missingLayer`, `viewDimension`, `layerCount`,
`output.identity`, `output.scopeIdentity`, `output.name`, `layoutKey` and every
input's `layer` are restored on read, not stored. The family byte is what keeps them
derivable without pinning the format to one recognizer. `id` and each input's
`parameter` stay on the wire deliberately — `id` because a caller may supply it,
`parameter` because it keeps layer identity cross-checkable rather than asserted by
position.

The backend block stores visibility but not the original
`scopeIdentity`. The reader reconstructs `${identity}@${visibility[0]}`. A
multi-stage shared binding therefore rereads as stage-qualified rather than
recovering its original bare scope. Callers must not infer that original
sharing decision from the wire view.

The leading byte identifies the backend: `1` is WebGL2 and `2` is WebGPU;
`0` is invalid, while `3` and `4` reserve WebGL1 and OpenGL. No block-version
byte follows. `CarbonWebgpuContainer` treats absent or foreign-backend blocks
as no WebGPU backend data. Once the WebGPU block parser is selected, a
mismatched engine ID or unread trailing bytes is an error, not a silent skip.

### Count caps

`CARBON_EFFECT_COUNT_CAPS` mirrors the runtime's inclusive limits. Carbon's
compiler enforces none of them while its runtime rejects anything above them,
so an over-large effect compiles and then fails to load; our writer checks on
the way out. The caps Carbon does *not* have — techniques, registers, static
samplers, constants, libraries, exports, annotation counts — are deliberately
not invented here.

### The alias path

Carbon compares packed bodies pairwise and points a duplicate's row at the
surviving twin. The row is **kept**, so the offset table stays dense while the
file stores each distinct body once. Across the shipped corpus 22% of files
alias, at roughly 2.1 rows per distinct body.

`enumerateUniqueEffectBodies` recovers that grouping without decoding a single
body. It inspects source records and bytes only, and returns
first-occurrence-ordered groups, each holding one canonical
`permutationIndex`/`sourceRecord` plus every byte-identical alias. Exact range
aliases are the fast path; distinct ranges are fingerprinted and then compared
byte for byte. It caps the Cartesian body table at 65,536 records
(`EFFECT_BODY_COUNT_MAX`) and rejects partial overlaps, because a partial
overlap means two bodies claim the same bytes. It decodes nothing: it reads
`m_offsets` and slices `m_data` directly, so a backend packager can inventory an
effect without disturbing anything a later read depends on. It is internal
(`src/resource/format/effect/`), not a published export; the backend body set is its one
consumer.

## Offset-table density

Carbon indexes the offset table **positionally** and never reads each row's
stored `index` field. A sparse or misordered table therefore does not fail — it
silently returns the wrong shader body.

Density is incidental in Carbon: it falls out of `g_compiledEffects` being a
`std::map` densely keyed by the work-queue builder, and is promised nowhere.

Measured twice at build 3444265. A header-only sweep of every `.sm_hi`, `.sm_lo`
and `.sm_depth` under `effect.dx11` and `effect.dx12` — 3222 files, 52,332 rows —
and the full round-trip run below across all three backends — 4833 files, 78,498
rows, 40,645 distinct bodies. **Every file is dense and positionally indexed**, and
every row's byte range lies inside the file and clear of the header. In every
single file the body region tiles the post-header space exactly, with no leading or
trailing slack.

Given that, the checks are implemented as follows:

- `CjsCarbonEffectReader` **always** collects `dense` and `indicesMatchPosition` as
  diagnostics, and **always** fails closed on an out-of-range row.
- Density and positional indexing **fail closed on read by default**.
  `{ permissive: true }` skips the check and leaves the diagnostics in place, for
  forensic inspection of a file already known to be malformed. It is not a load
  option.
- `writeCarbonEffectFile` **always** fails closed: it refuses to emit bodies that
  are not dense from index 0. Where we own the bytes there is no reason to be
  lenient.

`--ignore-permutations` does make CCP's compiler emit only key 0 while declaring
every axis, so a sparse file is producible. That argues for the escape hatch, not
for permissive defaults: Carbon does not reject such a file, it returns the wrong
permutation's shader silently, which is the failure class this port exists to
close.

## Backend selection and envelope removal

**Historical compatibility.** Flat-package builds once prepended
`magic | containerVersion | payloadKind` before Carbon's byte-compatible
layout. Current packaging emits no such prefix and the former helper is no
longer part of the package.

**Current WebGPU wire.** Carbon WebGPU bytes have no envelope, magic, `payloadKind`,
or independent container version. They are bare Carbon v15 records resolved
from `effect.webgpu/`, with one optional per-pass backend block. `.carbonwebgl`
is this same wire — the same records, the same reader, GLSL in the program slots
— and not a separate chunk format.

`CarbonWebgpuContainer` reads the optional blocks, and the shared record reader can
auto-detect them from a description's declared size. There is no adapter
boundary left between them and the runtime: `Tr2EffectRes.DoLoad` retains a
`CjsCarbonEffectReader` over the same bytes and `Tr2Shader.fromCarbonBinary`
builds the device-free graph from one description record.

Carbon's version dword is the only version. The optional block's leading byte
is its backend engine ID, not `blobVersion`; its parser requires an exact end
with no unread tail. See [the block layout](#the-optional-trailing-block).
The package does not claim a version in CCP's namespace.

Loose program bytes without a resource path can be identified from their
payload: DXBC opens with `"DXBC"`, AIR is bitcode (`BC 0xC0DE`), and WGSL and
GLSL have distinct text syntax. The stage record itself carries no language
tag; program interpretation remains a backend/path responsibility.

## Verification

`node --test` in this package runs synthetic tests and an environment-gated
real-file proof. These are the recorded gates, not a new qualification run.

**Synthetic:** `test/resource/runtime-resource/format/byte-primitives.test.js`
and `test/resource/runtime-resource/format/carbon-effect.test.js` construct a
four-permutation v15 container covering every record type: static samplers,
UAVs, all annotation value types, render states and a raytracing library with
both stage-data blocks. They check byte-exact write/read/write, arena sorting,
caps, structural checks and, until switchover, legacy-envelope disjointness.

**Real files:** `test/resource/runtime-resource/format/carbon-effect-corpus.test.js`
uses `CARBON_EFFECT_CORPUS_DIR`. Supply separately acquired build 3444265
source effects; no game corpus ships. The directory must be a materialised
tree of `.sm_hi`/`.sm_lo`/`.sm_depth` files under `effect.dx11`,
`effect.dx12` or `effect.metal`. Filtering uses extensions, not backend
directory names. Two wrong inputs fail loudly, by design:

- Hash-named content-addressed stores match no extensions:
  `no compiled effect files found`.
- Retired flat-chunk translated output keeps `.sm_*` names but contains
  former `Carbon WebGL`/`Carbon WebGPU` envelopes:
  `Unsupported Carbon effect version 1196901699`, the ASCII `Carbon WebGL`
  magic interpreted as a version dword.

Each source is re-emitted three ways:

1. Description blobs through the source arena: field order.
2. Whole container from raw bodies/source arena: header order, base arithmetic
   and aliases.
3. Whole container with a reference-rebuilt arena: sorted-offset policy.

Only mode 3 may legitimately differ, for retained unreferenced blobs. Report
and assert that exact cause; never weaken comparison to “same strings, any order.”

**Measured corpus:** 4833 files (537 shaders × 3 variants × 3 backends),
78,498 offset-table rows and 40,645 distinct description bodies. All three modes were
byte-exact: zero arena-rebuild divergences, sparse tables or misordered tables.
No shipped arena retained an unreferenced blob. DXBC in two dialects and AIR
passed the same reader/writer without a language field, measuring the Carbon
metadata region's backend invariance. Backend selection belongs at the
resource-path boundary, not in an envelope or stage record.

**Class-layer control:** `test/resource/runtime-resource/resource/effect-res-corpus.test.js`
round-trips bytes → `Tr2EffectRes.DoLoad` → `Tr2Shader.fromCarbonBinary` →
device-free graph → `toCarbonBinary()` → records → bytes. The record-only
round trip on the same files is its negative control: disagreement isolates
class-layer loss. Three losses were found and closed:

- Non-dynamic sampler names: 1,631 files.
- Authored pass-stage order: 21 files.
- Zero-size blob offset words: 150 files; not always `0xffffffff`.

Carbon's runtime discards the first two, not the file. Record-level equality
alone missed them because a record rebuilt from a lossy class agreed with that
same class; byte equality exposes the loss.

`effect.gles2` is v8, outside this v15 corpus validation—not obsolete. It
was the only tree recorded working end to end in ccpwgl at the original
comparison checkpoint; that is historical evidence, not current consumer
support. Reading 8..15 and writing/validating 15 are separate claims. Carbon's
version branches cover v2..8 legacy GLES2 and v15 current files; the same
mechanism handles generations without bespoke format readers.

**Our containers remain v15.** A proposed v16 for backend blocks was rejected:
CCP owns that number space, and a new field/version was unnecessary. Add format
machinery only because it has to exist, not merely because it seems desirable.
[Rule 1](#two-rules-for-anything-added-later) provides detection: parse a sized
description without blocks, then reparse with blocks if the cursor misses its
declared end. Block presence is self-describing—no new field, container
version or out-of-band flag. The block's engine ID selects backend meaning,
not a second version axis.
