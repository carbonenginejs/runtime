# CEWGPU package format

Status: Evolving
Scope: `@carbonenginejs/runtime-resource/formats/webgpu` CEWGPU version 1
Audience: Shader-tool authors and engine integrators
Summary: Defines the flat CEWGPU v1 container, common chunks, and structured WGSL package records.

## Purpose

CEWGPU is a CarbonEngineJS-defined container for WebGPU shader analysis,
emitted WGSL, and pass layout metadata. It is designed for deterministic
offline construction and simple browser-side reading.

## Binary layout

All integers are unsigned 32-bit little-endian values.

| Field | Size | Meaning |
| --- | ---: | --- |
| Magic | 4 bytes | ASCII `CWGP`. |
| Version | 4 bytes | Container version; the current reader accepts `1`. |
| Chunk count | 4 bytes | Number of following chunks. |
| Chunk tag | 4 bytes | ASCII four-character code. |
| Chunk size | 4 bytes | Payload byte length. |
| Chunk payload | Variable | Raw bytes, UTF-8 text, or UTF-8 JSON by chunk contract. |

The tag, size, and payload fields repeat in declaration order. A reader rejects
an unsupported version, truncated chunk, invalid magic, or trailing bytes.

## Common chunks

| Tag | Payload | Purpose |
| --- | --- | --- |
| `INFO` | JSON | Format and translator information. |
| `META` | JSON | Caller provenance and effect-selection metadata. |
| `PGRF` | JSON | Complete source permutation topology and identity-only body records. |
| `RFLX` | JSON | Complete portable reflection for every unique version-15 source body. |
| `RBLB` | Raw bytes | Exact immutable byte payloads referenced by `RFLX`. |
| `ANLS` | JSON or text | Compact selected-body diagnostic stage/binding data; not lossless effect reflection. |
| `WGSL` | WGSL text or JSON | One raw module or a structured shader set with layouts. |

Unknown four-character chunks remain readable as raw bytes. The package
builder preserves the caller's chunk order. Chunk tags must be four printable
ASCII characters, and duplicate tags are rejected by both builder and reader.

## Selected-effect envelope

Generic CEWGPU containers may omit common chunks and may retain raw WGSL text.
A package declaring `INFO.packageKind: "tr2-effect-webgpu"` has a stricter
contract. The reader requires JSON `INFO`, `META`, `ANLS`, and `WGSL` chunks.
Current producers also declare and emit `PGRF`; legacy INFO v1/v2 packages may
omit it. Version-15 sources additionally declare and emit `RFLX` plus `RBLB`.
INFO v3 makes the graph and reflection chunks one mandatory, indivisible unit.
Legacy INFO v2 may omit reflection or carry selected-body RFLX v1. The reader
validates current
schema versions and reconciles
translator/source/body identity, the complete source permutation topology,
selected options, counts, pass/stage metadata, emitted shader and layout
descriptors, explicit selection coverage, WGSL-set version features, and
source/backend completeness flags. Declared effect layouts use unique bind
groups contiguous from group zero and unique binding slots and physical
identities.

The binary container version and the `INFO` document version are independent.
`BuildEffect` emits `INFO.formatVersion: 3` for version-15 input and version 2
for versions 8-14. The reader retains legacy selected-effect INFO versions 1
and 2 and rejects unknown INFO versions; generic packages remain outside this
marker-gated schema.

INFO versions 2 and 3 record `targetBackend: "webgpu"`, the producing backend package
name/version, and the translator name/version. Its `sourceIdentity` contains
the exact source byte length and a required lower-case SHA-256 digest. The
builder computes that digest synchronously over the exact input byte view and
rejects a conflicting caller-supplied digest. Optional MD5 is retained only as
source-system provenance.

The INFO v3 provenance subset uses the following keys. Package and translator
versions use semantic-version syntax; the complete INFO document also includes
source/output paths, selected backend-body mode, source/backend body coverage,
completeness flags, and stage/layout counts.

```json
{
  "format": "CEWGPU",
  "formatVersion": 3,
  "packageKind": "tr2-effect-webgpu",
  "targetBackend": "webgpu",
  "backendPackage": "@carbonenginejs/runtime-resource/formats/webgpu",
  "backendPackageVersion": "0.6.0",
  "translator": "dxbc-js-wgsl",
  "translatorVersion": "0.6.0",
  "permutationGraph": {
    "chunk": "PGRF",
    "format": "CJS_EFFECT_PERMUTATION_GRAPH",
    "formatVersion": 1,
    "sha256": "0000000000000000000000000000000000000000000000000000000000000000",
    "permutationCount": 1,
    "uniqueBodyCount": 1
  },
  "effectReflection": {
    "chunk": "RFLX",
    "format": "CJS_CEWGPU_EFFECT_REFLECTION",
    "formatVersion": 2,
    "blobChunk": "RBLB",
    "sha256": "0000000000000000000000000000000000000000000000000000000000000000",
    "coverage": "all-unique",
    "permutationCount": 6,
    "bodyCount": 2,
    "sourceProgramCount": 4,
    "blobCount": 6,
    "blobByteLength": 4096
  },
  "sourceBodyCoverage": "all-unique",
  "backendBodyCoverage": "selected",
  "bodyMode": "selected",
  "completeness": {
    "packageValid": true,
    "sourceComplete": true,
    "backendComplete": false,
    "runtimeComplete": false
  },
  "sourceIdentity": {
    "logicalPath": "res:/graphics/effect.dx11/example.sm_hi",
    "game": "Eve",
    "client": "tranquility",
    "build": "0000000",
    "byteLength": 1024,
    "md5": null,
    "sha256": "0000000000000000000000000000000000000000000000000000000000000000"
  }
}
```

The `INFO`, `META`, and `ANLS` source labels must agree.
`INFO.sourceIdentity.logicalPath` is a separate canonical resource identity and
may differ from that diagnostic label.

The selected-effect validator also requires compact `ANLS` stages to omit raw
byte arrays and retain null DXBC/IR fields. `BuildEffect` runs the same reader
validation before returning `qualification.ok: true`.

## Source permutation graph

`BuildEffect` emits `CJS_EFFECT_PERMUTATION_GRAPH` version 1 in `PGRF`.
INFO v2/v3 points to the chunk and records its exact permutation and
unique-body counts. INFO v3 also binds the exact PGRF chunk bytes with
lower-case SHA-256. A pointer without the chunk, the chunk without a pointer,
or disagreeing counts/digest fail closed. Older selected-effect INFO v1/v2
packages without either remain readable.

PGRF preserves:

- ordered axes with index, exact name/options/default, description, and type;
- one variant for every first-axis-least-significant mixed-radix permutation
  index;
- the exact option-index tuple and source body record for every variant;
- deterministic package-local body keys; and
- the byte length and lower-case SHA-256 digest of every unique raw source body
  record.

The complete version-1 document shape is:

```json
{
  "format": "CJS_EFFECT_PERMUTATION_GRAPH",
  "formatVersion": 1,
  "coverage": {
    "permutations": "complete",
    "bodies": "identity-only",
    "reflection": "absent"
  },
  "axes": [
    {
      "index": 0,
      "name": "QUALITY",
      "options": [ "LOW", "HIGH" ],
      "defaultOption": 1,
      "description": "quality tier",
      "type": 0
    }
  ],
  "variants": [
    {
      "permutationIndex": 0,
      "optionIndices": [ 0 ],
      "bodyKey": "body0",
      "sourceRecord": { "offset": 256, "byteLength": 64 }
    },
    {
      "permutationIndex": 1,
      "optionIndices": [ 1 ],
      "bodyKey": "body0",
      "sourceRecord": { "offset": 256, "byteLength": 64 }
    }
  ],
  "bodies": [
    {
      "key": "body0",
      "byteLength": 64,
      "sha256": "0000000000000000000000000000000000000000000000000000000000000000"
    }
  ]
}
```

Axis and option counts plus `axes[].type` use the source format's unsigned
8-bit limits. Permutation indices, `bodies[].byteLength`, and source-record
offset/length fields use unsigned 32-bit limits. A `sourceRecord.offset` is an
absolute byte offset from the beginning of the exact compiled-effect input,
and `offset + byteLength` must not exceed `INFO.sourceIdentity.byteLength`.
Source ranges may be exact aliases or disjoint; partial overlaps fail closed.
The synchronous browser-safe producer and reader add an implementation
resource limit of 65,536 Cartesian permutations per effect; larger graphs fail
explicitly before variant materialization.

Raw body bytes are deduplicated with SHA-256 as a lookup accelerator and exact
byte equality as the final identity check. A body entry therefore provides one
package-local identity for a unique raw source-body byte sequence; the bytes
themselves are not embedded, and duplicate body digests are invalid. Body keys
are package-local because compiled body records refer to the enclosing
effect's shared string table; they are not cross-package content identities.

The graph's `coverage` declares `permutations: "complete"`,
`bodies: "identity-only"`, and `reflection: "absent"`. It records
builder-derived source topology that can be verified against the original
compiled effect; a package reader can validate only the graph's schema and
internal relationships because raw bodies are not embedded. It does not claim
reflection or backend translation by itself; INFO v3 joins separate RFLX v2
for complete source reflection. `META.bodyIndex` remains the
selected permutation index; the matching PGRF variant supplies its body key.
Stage filtering remains selected-body-local and does not change the graph.

The package-kind marker is the opt-in discriminator: without it, a container is
generic even when it happens to use the standard chunk tags. A consumer that
expects an effect package must therefore require the marker as well as calling
the reader.

## Complete source reflection

For compiled-effect version 15, `BuildEffect` emits
`CJS_CEWGPU_EFFECT_REFLECTION` version 2 in `RFLX` and one shared raw `RBLB`
byte arena. INFO v3 points to both, binds the exact RFLX chunk with SHA-256,
and records all-unique coverage plus permutation, body, source-program, blob,
and byte counts. A missing pointer/chunk, a digest or count disagreement, or
partial coverage fails closed. Versions 8-14 remain INFO v2 without RFLX/RBLB.

RFLX v2 stores common source identity and a `bodies` array in exact PGRF body
order. Each body records its PGRF `bodyKey`, first representative permutation
index, byte length, SHA-256, and complete body-local
`CJS_EFFECT_BODY_REFLECTION` version-1 effect graph. It preserves:

- complete technique, pass, stage, and library topology;
- render states, authored constants/resources/UAVs/samplers and annotations;
- exact stage and library source programs;
- exact immutable constant-default byte vectors;
- signatures, registers, static samplers, pipeline inputs, and thread groups;
- the opaque version-15 native source hash; and
- source/body identities joined to INFO and PGRF.

Every portable byte array is replaced by an exact reference containing
`blobKey`, `offset`, `byteLength`, and lower-case SHA-256. One
`RFLX.blobStore` lists canonical contiguous `blobN` records covering RBLB
exactly. Identical payloads are deduplicated across every reflected body by
digest plus exact byte equality; dangling, overlapping, corrupt, or
unreferenced payloads are rejected.

The reader reconstructs and validates one portable document for every unique
body. It requires every PGRF body exactly once in PGRF order, with the first
matching variant as representative. For selected-backend reconciliation it
joins `META.bodyIndex` to `PGRF.variants[index].bodyKey`, then to the matching
RFLX body and ANLS pass/stage identities.

JSON reads expose RFLX references plus `reflectionBlobByteLength`. To consume
the exact bytes, read with `emit: "raw"` and use
`CewgpuPackage.GetReflectionBlob(referenceOrKey)`, which returns an owned copy.
An object reference must exactly equal its inventory record; a string performs
a package-local blob-key lookup. To consume one complete portable body, use
`CewgpuPackage.GetPortableEffectReflection(permutationIndex)`. It selects the
PGRF variant (defaulting to `META.bodyIndex`), joins its RFLX body, expands all
references to fresh owned `Uint8Array` payloads, and reruns the
`@carbonenginejs/runtime-resource/formats/hlsl/portable` validator.

INFO v3 declares `sourceBodyCoverage: "all-unique"` and
`completeness.sourceComplete: true`. This means complete portable source-effect
semantics for that exact compiled input. It does not embed raw body records and
is not an archival reconstruction of the original `.sm_*` bytes. The accessor
returns a fresh, owned plain portable document. `runtime-resource`
`Tr2EffectRes` consumes it to select and cache a canonical device-free
`Tr2Shader`; renderer handles, resource-set descriptions, derived dynamic
classifications, layouts, and programs remain engine-owned.
PGRF
correctly continues to describe its own body table as `identity-only` with
`reflection: "absent"` because RFLX is a separate document.

`bodyMode: "selected"` and `backendBodyCoverage: "selected"` describe ANLS and
WGSL scope. `backendComplete` and `runtimeComplete` remain false.

## All-body backend graph (`WGSB`)

`mode: "all"` (or the `allPermutations: true` compatibility request) additionally
translates every unique source body and stores the result in a `WGSB`
`CJS_WGSL_BODY_SET` chunk. It requires complete version-15 source reflection,
because the unique-body inventory comes from RFLX/PGRF.

The translation unit is one pass of one body: the binding plan, the
resource-transform plan, and every stage's WGSL are derived together, so bodies
whose pass carries byte-identical stage bytecode, semantic bindings, and render
states share exactly one unit. `bodies[]` maps each `bodyKey` to
`{passKey, unitKey}` references, and `passUnits[]` holds the shared translated
programs, layouts, and transforms. Real Quad ship families collapse several
hundred passes into a small fraction of that many units.

A body that cannot be lowered is retained as
`status: "unsupported"` with an explicit reason and no passes. Its complete
source reflection remains in RFLX, so a partial backend never removes source
truth; `coverage.bodies` and `INFO.backendBodyCoverage` then report `partial`
instead of `all-unique`.

`INFO.backendBodySet` binds the exact chunk digest and counts. Selected-mode
packages must not carry the chunk, and an all-body package must contain one
record for every unique permutation-graph body. All-body packages still emit
`WGSL` for the selected body, and its programs are byte-identical to the
corresponding shared translation units.

Translating every body still does not make the package backend- or
runtime-complete: `backendComplete` and `runtimeComplete` stay false until the
engine parses these records, realizes their layouts and resource transforms,
and passes an exact draw gate.

Legacy INFO v2 may omit reflection or carry selected-body RFLX v1/RBLB. The
current reader validates both forms. INFO v3 requires PGRF plus RFLX v2/RBLB;
older readers do not accept this new schema.

## Analysis document

The current analysis document records normalized data for one selected effect
body:

- selected permutation and effect body;
- techniques, passes, and stage topology;
- Carbon binding-manifest data;
- per-stage bytecode summaries without raw byte arrays; and
- null DXBC/IR fields reserved for return-only `AnalyzeEffect` diagnostics.

Analysis is retained as provenance even when `BuildEffect` emits WGSL for only
some complete selected passes. `ANLS` is not lossless source reflection. It
omits exact constant-default bytes, complete nested reflection/libraries, and
some typed annotations needed to hydrate a complete source effect resource.
Those values live in RFLX/RBLB for version-15 input. Ordered axes and the total
permutation-index-to-body mapping live in PGRF rather than ANLS.

`AnalyzeEffect` uses transient selected-body bytecode to return DXBC and,
when requested, shader-IR diagnostics. `BuildEffect` uses the same transient
byte index for WGSL compilation but does not persist raw bytecode, decoded
instructions, or compiler IR in `ANLS`.

`BuildEffect` records `bodyMode` in `INFO` and `META`; for INFO v3 this is
explicitly backend scope, and it stays `selected` unless all-body packaging was
requested. Its returned qualification record uses
`validator: "cewgpu-structural"` and reports `packageValid: true`. Version-15
packages report `sourceComplete: true`, `backendComplete: false`, and
`runtimeComplete: false`; versions 8-14 report all three completeness flags
false. These flags prevent source preservation from being mistaken for
all-body translation or runtime validation. The same booleans are embedded
under `INFO.completeness`.

`@carbonenginejs/runtime-resource/formats/hlsl` owns source parsing, selected-body resolution,
unique-body enumeration, and the shared browser-safe portable reflection
contract. `format-webgpu` validates the parsed header into PGRF, aggregates
every unique version-15 body into RFLX/RBLB, owns transient byte indexing for
diagnostics/translation, and owns selected backend programs, layouts, and
transforms. Lossless reflection remains separate from compact ANLS
diagnostics.

## Structured WGSL set

`CJS_WGSL_SET` version 2 records contain emitted shader descriptors and
optional pass-level `layouts`. A layout records the exact numeric bind group
and binding slots already present in the WGSL source. A set remains version 2
when its source resources map one-to-one to physical WebGPU bindings.

Each binding keeps:

- a D3D-derived base `identity`;
- a resource-resolution `scopeIdentity`;
- stage visibility;
- the buffer, texture, or sampler layout; and
- its numeric group and binding.

Version 2 treats resource tuples as stage-scoped unless the caller explicitly
confirms one compatible shared identity. The builder rejects duplicate scopes,
duplicate numeric slots, mixed shared and stage-scoped forms, incomplete
visibility, and stage/layout conflicts. It never renumbers slots during WGSL
set assembly.

Version 1 binding plans remain accepted as legacy input. Ordinary new plans
and WGSL sets use version 2.

### Version 3 resource transforms

A set becomes version 3 when the compiler proves that several logical source
resources can be represented by one physical WebGPU resource. The top-level
`resourceTransforms` array records the realization recipe; the matching
physical layout binding carries its `transformId` and `arrayLayerCount`.

The currently defined version-1 recipe has this shape:

```json
{
  "id": "Main.pass0:detail-map-array:sampled-resource:0:16",
  "version": 1,
  "kind": "texture-2d-array",
  "layoutKey": "Main.pass0",
  "stage": "fragment",
  "inputs": [
    {
      "parameter": "Detail1Map",
      "layer": 0,
      "identity": "sampled-resource:0:16",
      "scopeIdentity": "sampled-resource:0:16@fragment"
    },
    {
      "parameter": "Detail2Map",
      "layer": 1,
      "identity": "sampled-resource:0:17",
      "scopeIdentity": "sampled-resource:0:17@fragment"
    }
  ],
  "output": {
    "name": "DetailMapArray",
    "identity": "sampled-resource:0:16",
    "scopeIdentity": "sampled-resource:0:16@fragment",
    "viewDimension": "2d-array",
    "layerCount": 2
  },
  "representation": "native-or-rgba8",
  "missingLayer": "reject"
}
```

Inputs are ordered by their exact fixed array layer. The output reuses layer
zero's D3D identity; later logical inputs do not remain as physical bindings.
The compiler emits every affected sample with that fixed integer layer.

`native-or-rgba8` requires the consumer to realize one compatible
`texture_2d_array` from the named source textures, either in a shared native
representation or after decoding every layer to RGBA8. Dimensions, mip
coverage, sample type, and texture format must be compatible with one WebGPU
array view. `missingLayer: "reject"` forbids substituting a fallback layer.

The set builder fails closed unless every recipe:

- targets an emitted fragment stage in its own pass;
- links exactly one `texture_2d_array<f32>` physical binding;
- numbers distinct inputs contiguously from layer zero;
- matches the binding's identity, view dimension, and layer count; and
- removes only the later input scopes from that recipe's owning pass.

WGSL-set version 3 is a compiler/module and engine-consumer contract. The
committed `engine-webgpu` reader accepts versions 1, 2, and 3 and explicitly
realizes the version-1 `texture-2d-array` recipe described above. Unsupported
recipe kinds or versions fail closed. Raw emitted modules may still be
validated independently of resource realization.

## Encoding values

`Build` accepts chunk payloads as strings, plain objects, typed bytes,
`ArrayBuffer`, or other array-buffer views. Plain objects are serialized as
UTF-8 JSON. Byte values are preserved without interpretation.

`Read(..., { emit: "raw" })` exposes the internal package object and chunk byte
views for zero-copy tooling. Treat those chunk views as immutable. Mutating
them after JSON or reflection lookup is outside the reader contract; rebuild
or reread a package instead.

## Related documentation

- [Effect packaging guide](../guides/effect-packaging.md)
- [Public API reference](../reference/api.md)
- [WGSL compatibility](../reference/wgsl-compatibility.md)
