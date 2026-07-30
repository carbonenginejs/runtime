# Carbon compiled-effect container

Status: Stable
Scope: `@carbonenginejs/runtime-resource` — `src/format/carbonEffect/`, `src/format/CjsByteReader.js`, `src/format/CjsByteWriter.js`, `src/format/CjsStringTable.js`
Audience: Anyone reading or writing compiled shader effect bytes, or extending `.cewgpu` / `.cewg`
Summary: The v15 binary layout of Carbon's compiled effect files, the shared byte reader and writer that implement it, and the arena offset policy a byte-exact re-emit depends on.

## What this is

Carbon's shader compiler emits one file per effect containing **every permutation**,
selected at read time through an offset table. The format has three parts: a header,
a deduplicated blob arena ("string table"), and one description blob per permutation.

This package implements it as a shared reader and writer, verified byte-exact against
CCP's own shipped files. It is the foundation the `.cewgpu` and `.cewg` shader package
formats are built on.

| module | role |
|---|---|
| `src/format/CjsByteReader.js` | little-endian cursor plus the arena resolution primitives; the single implementation behind `HlslReader`, `WebgpuReader`, `WebglReader` |
| `src/format/CjsByteWriter.js` | growable append cursor with reserve-and-patch |
| `src/format/CjsStringTable.js` | the blob arena, with Carbon's bytewise-sorted offset assignment |
| `src/format/carbonEffect/carbonEffectRecords.js` | the v15 description-blob record codec |
| `src/format/carbonEffect/CjsCarbonEffectReader.js` | container reader and structural checks |
| `src/format/carbonEffect/CjsCarbonEffectWriter.js` | container writer, offset arithmetic and alias dedupe |
| `src/format/carbonEffect/carbonEffectEnvelope.js` | the envelope our own containers prepend |

## Why v15 only

The reader and writer accept and emit version 15 and nothing else.

Carbon's own reader takes 2..15 (`Tr2EffectRes.cpp:209`), but it annotates the
v13/v14 field-order boundaries as unverified — `// CHECK IS IT IN RIGHT FUNCTION?`
at `Tr2EffectDescription.cpp:177`, and a bare `// CHECK` at `:257` and `:578`, the
last of which sits directly on the v14 reorder. Version 15 is the version with an
authoritative writer to check against, and the entire shipped corpus at build
3444265 is v15 — 3222 files across `effect.dx11` and `effect.dx12`, plus the same
537 shaders again under `effect.metal`. Nothing older ships.

The v15 body is byte-identical to v14. Version 15 differs from 14 only by the 36
extra header bytes: the compiler version and the source hash.

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

Assembled at `ShaderCompiler.cpp:822-831`, read at `Tr2EffectRes.cpp:207-311`.

The compiler version is **four bytes, not a `u32`**. It is
`constexpr uint8_t ShaderCompilerVersion[4]` (`ShaderCompilerConfig.h.in:5`), and
Carbon's rebuild check compares only the first three (`ModifiedTime.cpp:77`). A
shipped v15 header reads `01 02 06 00` — compiler 1.2.6.0, matching the
ShaderCompiler project version. As a `u32` those bytes are `0x00060201`, which
means nothing. `HlslEffectRes` historically read the field as a dword; it now also
exposes `m_compilerVersionBytes`, which is the truthful reading and what new code
should use. The dword form survives only because it is republished as
`source.compilerVersion` in the portable reflection, where it is asserted to be an
unsigned integer and covered by a package digest.

The 32-byte hash is read by the compiler's rebuild check
(`ModifiedTime.cpp:52-92`) and **skipped by the runtime**
(`Tr2EffectRes.cpp:246-252`). It is provenance, not integrity.

A permutation record is:

```
u32 nameOffset | u8 defaultOption | u32 descriptionOffset | u8 type | u8 optionCount | u32 optionOffset[optionCount]
```

Note the field order: `defaultOption` sits between the name and the description.
Carbon writes that byte inside a conditional loop (`ShaderCompiler.cpp:774-782`)
with no `else`, so a permutation whose declared default matches no option would
emit a record one byte short and desynchronise the entire rest of the header. Our
writer always emits it.

### Body-offset arithmetic

```
base = 4 + 4 + 32 + headerSize + stringTable.GetSize()
headerSize = (recordCount * 3 + 1) * 4 + permutationBytes
permutationBytes = 1 + Σ (11 + optionCount * 4)
```

`ShaderCompiler.cpp:801` and `:765`. `GetSize()` **includes** the arena's own `u32`
length prefix (`StringTable.cpp:82-85`), so the prefix is counted exactly once.
Row offsets are absolute from byte 0 of the file. `CjsCarbonEffectWriter` asserts
that the bytes it actually wrote before the first body equal this computed base, so
an arithmetic error fails loudly rather than shifting every body.

### The arena

`CjsStringTable` is Carbon's `StringTable`. Three properties matter:

1. **Offsets are assigned by a bytewise sort, not by insertion order.**
   `StringTable::Sort` (`StringTable.cpp:92-108`) orders blobs by `Blob::operator<`
   — `memcmp` over the shorter length, then shorter-wins on a tie
   (`StringTable.h:109-122`) — and hands out cumulative offsets. Any writer that
   assigns first-seen offsets produces a valid file that is not byte-identical to
   Carbon's.
2. **Dedupe is on exact bytes with no suffix merging** (`Blob::operator==`,
   `StringTable.h:104-107`). `"red"` gets its own entry even though it is a suffix
   of `"shared"`.
3. **There are two kinds of entry and no manifest.** A NUL-terminated string is
   added with its terminator (`strlen + 1`, `StringTable.cpp:18-21`) and referenced
   by a bare `u32` offset. A sized blob — shader bytecode, program source, default
   constant values — is added with exactly its own bytes and referenced by a
   `{u32 size, u32 offset}` pair. `StringTable::Write` emits a `u32` payload size
   and the payload, nothing else; every reference site resolves its own entry.

## Two rules for anything added later

Neither is visible from Carbon's own code, and both were found by implementing
rather than by reading. They constrain every future addition to this format.

**Rule 1: every sized record must parse to exactly its declared end.** Trailing
bytes mean one of two things and both are fatal — the writer knew fields this reader
does not, or the writer miscounted. Enforced for the description blob
(`readEffectDescription`), for the per-pass backend block (`readBackendBlock`), and
for the header, whose end must equal where the body region begins.

This rule carries weight that used to live elsewhere. The chunk container it replaces
spent roughly 600 lines asserting that its several projections of one effect still
agreed with each other, and those checks caught a malformed *tree* — our writer
emitting something structurally wrong — not only a malformed file. A record layout
makes most of that question unaskable, because containment replaces reference and
position replaces key. What remains is this: a writer bug either fails to parse,
which announces itself, or it parses and leaves the cursor somewhere other than the
declared end. Applying the rule to some sized records and not others is a gap that
stays invisible until a writer bug hides in one of the others.

**Rule 2: anything placed in the arena must be arena-independent.** An arena entry
cannot contain an arena offset. Offsets are assigned by the content sort, the sort
depends on every entry's bytes, so an entry that referred to the arena would have to
be interned before its own contents could be computed — a circular dependency with
no fixed point. This is invisible in Carbon's own code because no Carbon arena blob
refers to the arena: strings, bytecode and default constant values are all leaves.
Our per-pass backend block is the first non-leaf candidate, and it is why that block
carries inline length-prefixed strings instead of references. A test pins the
property directly — the block's bytes must be identical whichever arena it is
interned into. Any future arena entry must satisfy the same rule.

**Corollary: the container admits all six of Carbon's stage types.** `stages` is
capped at `SHADER_TYPE_COUNT` = 6, matching `Tr2EffectDescription.cpp:529`, and the
stage-type byte is Carbon's `InputStageType` numbering (`EffectData.h:15-22`) —
vertex, pixel, compute, geometry, hull, domain. A backend that can only express three
of those rejects the rest in its own layer; the container does not narrow on its
behalf. Same reasoning that puts `payloadKind` in the envelope rather than per-stage:
the Carbon region is backend-invariant, and restrictions belong to the backend.

`0xffffffff` is the null reference (`StringTable.cpp:52-68`). It is legal at
**exactly one wire position**: a stage's default-constant-value offset when the
accompanying size is zero, which `ReadStringOptional` consumes without
dereferencing (`Tr2EffectDescription.cpp:80-91`). Everywhere else a `0xffffffff`
offset fails the load.

Two deliberate departures from Carbon, both of which make byte-identical output
more likely rather than less:

- **`m_size` is initialised.** Carbon's constructor leaves it indeterminate
  (`StringTable.cpp:9-12`) and gets away with it only because the one instance is a
  zero-initialised global.
- **Adding after an offset has been handed out is an error.** In Carbon,
  `GetOffset` re-sorts a dirty table, which reassigns *every* offset — including
  offsets already baked into packed bodies. Carbon avoids the corruption by
  interning all late strings before the packing pass (`ShaderCompiler.cpp:686-694`
  before `:697-714`). `CjsCarbonEffectWriter` reproduces that discipline
  structurally: it runs the record walk twice, once with `collectArena` to intern
  and once with `internArena` to emit. Because both passes drive the same
  `writeEffectDescription`, they cannot drift apart.

### Description blob, v15 field order

Derived from `EffectData.h`'s `Save` methods and `Tr2EffectDescription.cpp`'s read
order independently, and confirmed to agree field for field. Counts are `u8` unless
marked.

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
  Before v14 it was the other way round (`Tr2EffectDescription.cpp:538-546` versus
  `:579-583`); v14 moved them, and Carbon marks its own v14 branch `// CHECK`.
- **A UAV record is one byte shorter than a texture record** — it has no `isSRGB`.
  Carbon's reader hardcodes `isSRGB = false` (`:450`) and `Uav::Save` omits it.
  Sharing one "resource" codec between the two silently corrupts every subsequent
  field.
- **`borderColor` is four floats on a sampler and one byte on a static sampler**
  (`EffectData.h:453` versus `:565`). That is not sloppiness; it mirrors the two
  D3D binding models.
- **A non-string annotation value is four raw bytes.** Carbon writes it through the
  `float` member of a `{float,int32_t}` union and reads it back through a different
  union. The bytes round-trip; applying an int/float conversion does not. The codec
  keeps `rawValue` as bytes for exactly this reason.

Carbon writes `textures`, `samplers`, `uavs` and render states in ascending key
order because they are `std::map`s, and sorts annotation keys explicitly by
`strcmp` (`EffectData.h:613-616`, `:839-842`). `compareAnnotationNames` implements
that comparison over UTF-8 bytes, which is *not* the same as JavaScript's UTF-16
code-unit order for names outside ASCII — `"Z"` sorts before `"a"`.

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
u8  blobVersion = 1
u8  bindGroupCount
  u8 group | u8 bindingCount
    u8  resourceKind | u8 registerSpace | u8 binding | u8 visibilityMask
    u32 registerIndex | u32 structureStride (0xffffffff absent) | u8 arrayLayerCount (0 absent)
    str type | str generatedSymbol | str transformId (empty = none)
u8  transformCount
  u8 familyCode | str id | u8 inputCount
    u8 registerSpace | u8 registerIndex | str parameter
```

`identity`, `scopeIdentity`, `group` on each binding, and a transform's `kind`,
`stage`, `representation`, `missingLayer`, `viewDimension`, `layerCount`,
`output.identity`, `output.scopeIdentity`, `output.name`, `layoutKey` and every
input's `layer` are restored on read, not stored. The family byte is what keeps them
derivable without pinning the format to one recognizer. `id` and each input's
`parameter` stay on the wire deliberately — `id` because a caller may supply it,
`parameter` because it keeps layer identity cross-checkable rather than asserted by
position.

An unknown `blobVersion` reports the pass as having no backend data rather than
misparsing it; the enclosing size makes it skippable.

### Count caps

`CARBON_EFFECT_COUNT_CAPS` mirrors `SanityCheck`'s inclusive limits
(`Tr2EffectDescription.cpp:28-36`). Carbon's compiler enforces none of them while
its runtime rejects anything above them, so an over-large effect compiles and then
fails to load; our writer checks on the way out. The caps Carbon does *not* have —
techniques, registers, static samplers, constants, libraries, exports, annotation
counts — are deliberately not invented here.

### The alias path

Carbon compares packed bodies pairwise and points a duplicate's row at the
surviving twin (`ShaderCompiler.cpp:717-744`, `:804-820`). The row is **kept**, so
the offset table stays dense while the file stores each distinct body once. Across
the shipped corpus 22% of files alias, at roughly 2.1 rows per distinct body.

## Offset-table density

`Tr2EffectRes.cpp:121-126` indexes the offset table **positionally** and never
reads each row's stored `index` field. A sparse or misordered table therefore does
not fail — it silently returns the wrong shader body.

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

## The envelope

Our own containers prepend twelve bytes:

```
magic(4) | u32 containerVersion | u32 payloadKind
```

then Carbon's layout, byte-compatible. This is the one deliberate divergence, and
it is provably disjoint from a Carbon file rather than merely unlikely to collide:
a Carbon file's first dword is its version, constrained to 2..15, so byte 0 is at
most `0x0f` and bytes 1..3 are zero, while every printable-ASCII magic byte is at
least `0x20`. No version bump inside Carbon's `u32` can change that. ccpwgl records
the same convention independently (`Tw2EffectRes.js:52-63`).

`payloadKind` is **one header field, never per stage.** Carbon demonstrably has no
per-stage language tag: `EffectCompilerMetal.cpp:5155-5156` stores compiled AIR
through the same `StageInput::Save` slot as DXBC with no language field, and the
platform is recovered from the resource path instead (`Tr2Effect.cpp:320-340`).
That is confirmed on the wire — see below.

## Verification

`node --test` in this package. Two gates.

**Always green.** `test/format/byte-primitives.test.js` and
`test/format/carbon-effect.test.js` build a synthetic four-permutation v15
container exercising every record type — static samplers, UAVs, annotations of
every value type, render states, a raytracing library with both stage-data blocks
— and assert a byte-exact write → read → write round trip, the arena sort order,
the caps, the structural checks and the envelope's disjointness.

**Env-gated real-file proof.** `test/format/carbon-effect-corpus.test.js`, enabled
with `CARBON_EFFECT_CORPUS_DIR`. Game bytes are never committed; fetch through
tools-core at pinned build 3444265. It re-emits each file three ways:

1. every description blob through the file's own arena — proves the field order;
2. the whole container from raw bodies and the source arena — proves the header
   order, the base arithmetic and the alias path;
3. the whole container with the arena rebuilt from the references found — proves
   the sorted-offset policy.

Only the third can legitimately differ, because an arena may retain blobs the file
no longer references. When it does differ the divergence is reported exactly and
asserted to be unreferenced-blob retention; it is never downgraded to a weaker
comparison such as "same strings, any order", which would look green and prove
nothing.

Measured result over the complete corpus — 4833 files (537 shaders × 3 variants ×
3 backends), 78,498 offset-table rows, 40,645 distinct description bodies:
**all three modes byte-exact, with zero arena-rebuild divergences, zero sparse
tables and zero misordered tables.** Not one shipped file retains an unreferenced
arena blob, so the sorted-offset policy reproduces CCP's arena exactly.
`effect.metal` is reachable only through the `macos-metal` overlay
registered in `tools-core/data.local`; the mac client ships its own manifest and
the default index path does not see it.

That result is the container port's central evidence. The same reader and the same
writer reproduce, byte for byte, files whose program payloads are DXBC in two
dialects and AIR — with no language field anywhere in the format. The metadata
region is backend-invariant as a measured fact rather than an argument from the
writer, which is why `payloadKind` belongs in the envelope header and not in a
per-stage record.

`effect.gles2` is deliberately not a validation target. Those shaders are v8, ten
years old, and nothing here depends on them.
