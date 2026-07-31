# Carbon compiled-effect container

Status: Stable
Visibility: Public
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
| `src/format/carbonEffect/carbonEffectEnvelope.js` | legacy pre-switchover envelope compatibility; not part of the destination wire format |

## Why v15 only

The reader and writer accept and emit version 15 and nothing else.

Carbon's own reader accepts versions 2 through 15, but its v13/v14 branches mark
the field-order boundaries as uncertain. Version 15 is the version with an
authoritative writer to check against, and the entire audited shipped corpus at
build 3444265 is v15 — 3222 files across `effect.dx11` and `effect.dx12`, plus
the same 537 shaders again under `effect.metal`. Nothing older appears in that
audited corpus.

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

The compiler writes this order and the runtime reads the same order.

The compiler version is **four bytes, not a `u32`**, and Carbon's rebuild check
compares only the first three. A shipped v15 header reads `01 02 06 00` —
compiler 1.2.6.0, matching the ShaderCompiler project version. As a `u32` those
bytes are `0x00060201`, which means nothing. `HlslEffectRes` historically read
the field as a dword; it now also exposes `m_compilerVersionBytes`, which is the
truthful reading and what new code should use. The dword form survives only
because it is republished as `source.compilerVersion` in the portable
reflection, where it is asserted to be an unsigned integer and covered by a
package digest.

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

### One field the container cannot round-trip

For a **non-dynamic sampler, the name is not preserved.** The file stores one, but
Carbon's reader nulls it before any producer sees it, so a package built from
our reflection carries the empty string.

This is a property of the input, not a bug in the mapping: the name is unrecoverable
by the time we receive the data, rather than dropped on the way out. Carbon nulls it
precisely because a non-dynamic sampler is never looked up by name — `FindSamplerByName`
only matters for the dynamic case. Recorded here because it will otherwise be
rediscovered as a bug: a diff against the source effect will always show it.

**Corollary: the container admits all six of Carbon's stage types.** `stages` is
capped at `SHADER_TYPE_COUNT` = 6, and the stage-type byte uses Carbon's
`InputStageType` numbering: vertex, pixel, compute, geometry, hull, domain. A
backend that can only express three of those rejects the rest in its own layer;
the container does not narrow on its behalf. The Carbon region is
backend-invariant, and restrictions belong to the backend.

`0xffffffff` is the null reference. It is legal at **exactly one wire
position**: a stage's default-constant-value offset when the accompanying size
is zero, which the optional-value reader consumes without dereferencing.
Everywhere else a `0xffffffff` offset fails the load.

Two deliberate departures from Carbon, both of which make byte-identical output
more likely rather than less:

- **`m_size` is initialised.** Carbon's constructor leaves it indeterminate and
  gets away with it only because the one instance is a zero-initialised global.
- **Adding after an offset has been handed out is an error.** In Carbon,
  `GetOffset` re-sorts a dirty table, which reassigns *every* offset — including
  offsets already baked into packed bodies. Carbon avoids the corruption by
  interning all late strings before the packing pass. `CjsCarbonEffectWriter`
  reproduces that discipline structurally: it runs the record walk twice, once
  with `collectArena` to intern and once with `internArena` to emit. Because both
  passes drive the same `writeEffectDescription`, they cannot drift apart.

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

**Current pre-switchover compatibility.** The legacy helper can prepend twelve
bytes before Carbon's byte-compatible layout:

```
magic(4) | u32 containerVersion | u32 payloadKind
```

The prefix is disjoint from a Carbon file because Carbon's first dword is a
version from 2 through 15, while the legacy magic begins with printable ASCII.
It remains only until the coordinated WebGPU switchover.

**Switchover decision.** The replacement files have no envelope, magic,
`payloadKind`, or independent container version. Backend selection is by
resource path — `effect.webgpu/` or `effect.webgl2/` — mirroring Carbon's
`effect.dx11/`, `effect.dx12/`, and `effect.metal/` paths. The resulting bytes
remain Carbon v15 with one optional per-pass backend block.

Without the prefix, `Tr2EffectRes` and `Tr2Shader` use the Carbon path rather
than a bespoke format branch. The loader selects
`readEffectDescription(reader, {backend: true})` from the resource path, and
the description's declared size makes the optional block self-describing.

Versioning remains local to what it versions: Carbon's version dword governs
the Carbon region, while `blobVersion` governs the optional backend block. An
unknown block version is skipped rather than misparsed. The package does not
claim a version in CCP's namespace.

Loose program bytes without a resource path can be identified from their
payload: DXBC opens with `"DXBC"`, AIR is bitcode (`BC 0xC0DE`), and WGSL and
GLSL have distinct text syntax. The stage record itself carries no language
tag; program interpretation remains a backend/path responsibility.

## Verification

`node --test` in this package. Two gates.

**Always green.** `test/format/byte-primitives.test.js` and
`test/format/carbon-effect.test.js` build a synthetic four-permutation v15
container exercising every record type — static samplers, UAVs, annotations of
every value type, render states, a raytracing library with both stage-data blocks
— and assert a byte-exact write → read → write round trip, the arena sort order,
the caps, the structural checks and, until the switchover, the legacy envelope's
disjointness.

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
writer. Backend selection therefore belongs at the resource-path boundary, not
in an envelope or per-stage record.

`effect.gles2` is deliberately not a validation target for **this package**: those
shaders are v8, and nothing in the container port reads or writes them.

**Do not read that as "obsolete".** `effect.gles2` is the shader tree ccpwgl
actually renders with today — it is the only one that currently works end to end.

The two statements coexist because **v15-only constrains what we write and
validate against, not what a reader may accept.** Version-branching is the
format's own mechanism. A reader that wants all supported generations branches
on the version dword — v2..8 legacy gles2, v15 everything current — which is one
reader, not a bespoke path per format.

**Our containers are v15, not a version of our own.** A "v16" was considered for
the variant carrying the per-pass backend block and **rejected**: CCP owns that
number space, so claiming 16 would collide with any real v16 they ship, in the one
field whose entire job is telling a reader how to parse. It also failed the rule
the rest of this format is held to — invent something only because it *has to*
exist, never because we think it should.

The container needs no new version. Each description blob carries a declared
size in the offset table, and [Rule 1](#two-rules-for-anything-added-later)
already requires it to parse to exactly that end. A reader parses a blob without
blocks and re-parses with them if the cursor misses the declared end, so the
presence of the block is **self-describing** with no new field, no container
version and no out-of-band flag. `blobVersion` inside the block versions the
extension itself.
