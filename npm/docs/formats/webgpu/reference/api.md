# Public API reference

Status: Evolving
Scope: `@carbonenginejs/runtime-resource/formats/webgpu`
Audience: Shader-tool authors and engine integrators
Summary: Lists the public `CjsWebgpuFormat` profile, one-shot helpers, options, and output contracts.

## Export

The package root exports `CjsWebgpuFormat` as both a named and default export:

```js
import CjsWebgpuFormat, {
    CjsWebgpuFormat as WebgpuFormat
} from "@carbonenginejs/runtime-resource/formats/webgpu";
```

## Reusable profile

Construct a profile when several operations share output, source, permutation,
schema, or class-registration options:

```js
const reader = new WebgpuFormat({
    emit: "json",
    source: "example.cewgpu",
    decodeInstructions: true,
    permutation: null
});
```

| Instance method | Purpose |
| --- | --- |
| `SetValues(options)` | Merges reusable profile defaults. |
| `GetValues(options?)` | Returns effective values with optional per-call overrides. |
| `SetClasses(classes)` | Registers several package-shape constructors. |
| `SetClass(type, Class)` | Registers or removes one constructor. |
| `GetClass(type)` | Returns one registered constructor. |
| `HasClass(type)` | Reports whether a constructor is registered. |
| `Read(bytes, options?)` | Reads CEWGPU bytes as JSON or a raw package. |
| `Inspect(bytes, options?)` | Returns a package summary. |
| `Build(chunks)` | Builds CEWGPU bytes from ordered chunks. |
| `AnalyzeEffect(bytes, options?)` | Builds normalized analysis from compiled effect bytes. |
| `BuildEffect(bytes, options?)` | Converts one selected effect body/pass scope into CEWGPU data. |
| `BuildShaderIr(input, options?)` | Builds validated shader IR from DXBC bytes or decoded input. |
| `BuildWgsl(input, options?)` | Emits a supported typed shader as WGSL. |
| `BuildWgslBindingPlan(programs, options?)` | Allocates one binding layout across a complete pass. |
| `BuildWgslSet(entries)` | Assembles emitted shaders and pass layouts. |
| `ToJSON(value)` | Converts format output to JSON-compatible data. |

`Read` currently returns plain data. Class registrations are validated and
stored for forward compatibility but do not hydrate the returned package.
Raw output is an internal zero-copy package view; callers must treat its chunk
bytes as immutable and reread/rebuild after any byte change.

## One-shot static helpers

The static helpers use lower camel case and share the implementation of the
instance methods:

| Static helper | Purpose |
| --- | --- |
| `isCewgpu(bytes)` | Checks the `CWGP` package magic. |
| `read(bytes, options?)` | Reads one package. |
| `inspect(bytes, options?)` | Inspects one package. |
| `build(chunks)` | Builds one package. |
| `analyzeEffect(bytes, options?)` | Analyzes one compiled effect. |
| `buildEffect(bytes, options?)` | Builds one selected effect body/pass scope. |
| `buildShaderIr(input, options?)` | Builds shader IR. |
| `buildWgsl(input, options?)` | Emits WGSL. |
| `buildWgslBindingPlan(programs, options?)` | Allocates a pass binding plan. |
| `buildWgslSet(entries)` | Builds a portable shader set. |
| `toJSON(value)` | Converts output to JSON-compatible data. |

## Profile options

| Option | Meaning |
| --- | --- |
| `emit` | `"json"` by default or `"raw"` for the internal package object. |
| `source` | Caller-owned diagnostic label; it is never opened. |
| `decodeInstructions` | Includes decoded instruction and shader IR detail during analysis. |
| `permutation` | Exact NAME=VALUE assertions as an array or `Map`. |
| `schema` | Optional caller schema record retained by the profile. |
| `classes` | Optional constructor registrations keyed by `CLASS_KEYS`. |

`AnalyzeEffect` decodes real selected-body stage bytes for return-only
diagnostics. `decodeInstructions: false` retains compact DXBC program metadata
without instruction or IR trees. `BuildEffect` keeps those bytes transient for
WGSL compilation and writes compact selected-body `ANLS` diagnostics instead.
Both `AnalyzeEffect` and `BuildEffect` reject malformed, duplicate, unknown, or
unresolved permutation assertions rather than silently selecting a default.

## Effect-package options

`BuildEffect` and `buildEffect` accept `mode: "selected"`, which remains the
default. They resolve one permutation body and emit complete passes within the
requested stage selection.

`mode: "all"` additionally translates every unique source body into a `WGSB`
chunk and reports `backendBodyCoverage: "all-unique"`, or `"partial"` when some
body could not be lowered. It requires complete version-15 source reflection and
fails closed on versions 8-14, which carry no validated body inventory. The
orchestration compatibility option `allPermutations: true` selects the same
mode, and `allPermutations: false` means selected mode.

`CewgpuPackage.GetBackendBodyPrograms(permutationIndex)` resolves any
permutation to its translated passes, defaulting to `META.bodyIndex`. It returns
null when the package carries no all-body graph, and an explicitly unsupported
record when that body could not be lowered.

Both `GetBackendBodyPrograms` and `GetPortableEffectReflection` return null
until the package has passed canonical envelope validation. Every documented
read entry point validates, so this is transparent to normal consumers; it
prevents a hand-assembled or tampered container from being hydrated as though
it had been checked.

`source` remains a caller-owned diagnostic label. An optional
`sourceIdentity.logicalPath` records the canonical resource identity
independently and may differ from that label. The builder records the exact
source byte length and computes a lower-case SHA-256 digest over the active
input byte view. A caller-supplied `sourceIdentity.sha256` is accepted only
when it matches that digest.

For version-15 input, `BuildEffect` emits INFO schema version 3 with explicit
WebGPU target, backend-package name/version, translator provenance, and
source/backend body coverage. Versions 8-14 emit INFO v2 without reflection.
The CEWGPU binary container remains version 1. The reader retains legacy INFO
v1, pre-PGRF INFO v2, and selected-body INFO v2/RFLX v1 support.

New packages also emit a `PGRF` permutation graph and expose it as
`result.permutationGraph`, JSON-read `permutationGraph`, and raw
`CewgpuPackage.permutationGraph`. The graph contains every ordered axis,
Cartesian permutation index, option-index tuple, source record, and
package-local unique-body key/digest. `Inspect` reports `permutationCount` and
`uniqueBodyCount`. This is complete source topology with identity-only bodies;
it does not provide backend translation by itself.

For version-15 input, new packages emit complete all-unique source reflection
in RFLX v2 and exact referenced byte payloads in one shared `RBLB`. Build
results expose
these as `result.reflection` and `result.reflectionBlobs`. JSON reads expose
`reflection` plus `reflectionBlobByteLength`; raw reads expose
`CewgpuPackage.reflection`, `reflectionBlobBytes`, and
`GetReflectionBlob(referenceOrKey)`. Raw reads also expose
`GetPortableEffectReflection(permutationIndex)`: it performs the PGRF/RFLX
join, expands every referenced payload to fresh owned `Uint8Array` values, and
reruns the format-hlsl portable validator. Its optional index defaults to
`META.bodyIndex`; legacy selected-body RFLX v1 accepts only its selected
permutation. `GetReflectionBlob` remains the lower-level accessor and requires
an object reference to match its stored key, offset, byte length, and digest
exactly. `Inspect` reports reflection body/source-program/blob counts and blob
byte length. The body count covers every PGRF unique body. The selector joins
`META.bodyIndex -> PGRF.variants[index].bodyKey -> RFLX.bodies[].bodyKey`.
Earlier source versions omit both chunks.

The returned structural qualification separates preservation from execution.
`packageValid` reports successful container construction. Version-15 INFO v3
reports `sourceComplete: true` for the exact input's portable semantic graph
while `backendComplete` and `runtimeComplete` remain false. Versions 8-14
report all three completeness flags false. Source completeness does not embed
raw body records, translate every body, construct a live `Tr2EffectRes`, or
prove prepared pipelines/rendering. `GetPortableEffectReflection` reconstructs
and validates fresh owned plain portable data; `runtime-resource`
`Tr2EffectRes` performs canonical runtime-class hydration and selection. The
accessor does not construct renderer-owned handles, layouts, resource sets, or
stage programs.

## Static metadata

The class exposes output-mode constants, accepted class keys, media and input
type metadata, implementation status, the CEWGPU format label, analysis format,
and package version.

## Errors

Malformed package input and unsafe analysis paths throw or report a
`CjsWebgpuReadError` internally. Unsupported WGSL semantics fail closed with
the operation, stage, and source context needed to identify the boundary.
Duplicate/non-ASCII chunk tags are rejected. A declared
`tr2-effect-webgpu` package also fails closed on missing or malformed JSON
chunks, unsupported document versions, or inconsistent INFO/META/ANLS/WGSL
identity, counts, keys, layouts, selection, and completeness fields. Declared
PGRF pointers, exact INFO-v3 chunk digests, schemas, counts, variant tuples,
body references, and the selected index/options are reconciled as part of the
same gate. Optional
INFO/RFLX/RBLB reflection units additionally reconcile the exact RFLX digest,
every PGRF body and representative, portable closed schemas, exact blob
references/digests, and the selected body's ANLS pass/stage source identities.
Strict effect validation is activated by the `INFO.packageKind` marker;
effect-only consumers must require that marker because unmarked CEWGPU
containers intentionally remain generic.

## Related documentation

- [Effect packaging guide](../guides/effect-packaging.md)
- [CEWGPU package format](../formats/cewgpu.md)
- [Class-purpose catalog](classes/README.md)
