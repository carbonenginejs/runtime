# Public API reference

Status: Evolving
Scope: `@carbonenginejs/runtime/resource/formats/webgpu`
Audience: Shader-tool authors and engine integrators
Summary: Lists the public WebGPU format profile, byte-oriented helpers, options, and output contracts.

## Import

```js
import CjsWebgpuFormat, {
    CjsWebgpuFormat as WebgpuFormat
} from "@carbonenginejs/runtime/resource/formats/webgpu";
```

The default and named exports refer to the same class.

## Reusable profile

Construct a profile when several operations share output, source, schema, or
class-registration options. `permutation` is also reusable by `AnalyzeEffect`
and `BuildEffect`; current `Read` and `Inspect` derive the translated body or
Carbon defaults and do not consume that profile field:

```js
const reader = new WebgpuFormat({
    emit: "json",
    source: "res:/graphics/effect.webgpu/example.sm_hi",
    decodeInstructions: true,
    permutation: null
});
```

| Instance method | Purpose |
| --- | --- |
| `SetValues(options)` | Merges reusable profile defaults. |
| `GetValues(options?)` | Returns effective values with optional overrides. |
| `SetClasses(classes)` | Registers several package-shape constructors. |
| `SetClass(type, Class)` | Registers or removes one constructor. |
| `GetClass(type)` | Returns one registered constructor. |
| `HasClass(type)` | Reports whether a constructor is registered. |
| `Read(bytes, options?)` | Reads Carbon-record Carbon WebGPU bytes. |
| `Inspect(bytes, options?)` | Returns a compact container summary. |
| `AnalyzeEffect(bytes, options?)` | Analyzes compiled-effect bytes without packaging. |
| `BuildEffect(bytes, options?)` | Translates a version-15 effect to Carbon WebGPU bytes. |
| `BuildShaderIr(input, options?)` | Builds validated shader IR from DXBC or decoded input. |
| `BuildWgsl(input, options?)` | Emits supported shader IR as WGSL. |
| `BuildWgslBindingPlan(programs, options?)` | Allocates one binding layout across a pass. |
| `BuildWgslSet(entries)` | Assembles emitted shaders and pass layouts. |
| `ToJSON(value)` | Converts format output to JSON-compatible data. |

There is no `Build(chunks)` method. The current wire is a Carbon record tree,
not a generic chunk container.

## Static helpers

| Static helper | Purpose |
| --- | --- |
| `isCarbonWebgpu(bytes)` | Reports whether bytes have the Carbon-v15 shape. |
| `read(bytes, options?)` | Reads one container. |
| `inspect(bytes, options?)` | Inspects one container. |
| `analyzeEffect(bytes, options?)` | Analyzes one compiled effect. |
| `buildEffect(bytes, options?)` | Builds Carbon WebGPU bytes from a version-15 effect. |
| `buildShaderIr(input, options?)` | Builds shader IR. |
| `buildWgsl(input, options?)` | Emits WGSL. |
| `buildWgslBindingPlan(programs, options?)` | Allocates a pass binding plan. |
| `buildWgslSet(entries)` | Builds a portable WGSL set. |
| `toJSON(value)` | Converts output to JSON-compatible data. |

`isCarbonWebgpu` checks the first dword for Carbon version 15. Carbon WebGPU has no private
magic or payload tag, so this is a shape check rather than backend identity.
Callers establish identity through the resource path that supplied the bytes.

## Profile options

| Option | Meaning |
| --- | --- |
| `emit` | `"json"`, the only accepted value. Any other value is a `TypeError`. |
| `source` | Caller-owned diagnostic label; it is never opened. |
| `decodeInstructions` | Includes decoded instruction and IR detail during analysis. |
| `permutation` | Exact `NAME=VALUE` assertions for `AnalyzeEffect` and `BuildEffect`; ignored by current `Read` and `Inspect`. |
| `schema` | Optional caller schema record retained by the profile. |
| `classes` | Optional constructor registrations keyed by `CLASS_KEYS`. |

Class registrations are validated and stored for forward compatibility.
Current JSON reads return plain data rather than hydrated package classes.

## Read result

JSON `Read` returns:

- `format`, Carbon `version`, and `sourcePath`;
- derived `info` and `metadata`;
- the complete derived `permutationGraph`;
- derived `analysis`, `wgsl`, and `backendBodySet`;
- convenience `stages`, `shaders`, and `layouts` arrays.

These records are computed from the Carbon header, descriptions, WGSL program
slots, and backend blocks. They are not stored chunks. The old `chunks` field
is intentionally absent.

`Inspect` reports the source label, Carbon version, compiler-version bytes,
permutation count, distinct-body count, and resolved stage/shader/layout
counts.

## Effect analysis

`AnalyzeEffect` accepts supported compiled-effect versions for diagnostic
analysis. It resolves exact permutation assertions and may include decoded
DXBC instructions and compiler IR.

`BuildEffect` requires version-15 input; the
[wire contract](../formats/carbon-webgpu.md#building) owns preservation and
translation modes. Compiler IR is transient: neither stored in the wire nor
returned by `BuildEffect`.

Unknown, duplicate, or unresolved permutation assertions fail closed.

## Effect-package options

`mode` is `"selected"` by default or `"all"`; see
[selected mode](../formats/carbon-webgpu.md#selected-mode) and
[all mode](../formats/carbon-webgpu.md#all-mode), including the initial
resolved-body translation gate. `allPermutations: true` selects all mode;
`false` uses the requested `mode` or selected default.

`selection` can name a technique, pass index, and complete stage list.
`bindingPolicy.sharedIdentities` may name compatible cross-stage resources
that are allowed to share one physical binding.

`source` remains a diagnostic label. `sourceIdentity` and `outputPath` are
returned build provenance; the wire's backend identity still comes from the
consumer's resource path.

## Build result and qualification

`BuildEffect` returns:

| Field | Purpose |
| --- | --- |
| `bytes` | Carbon v15 Carbon WebGPU bytes. |
| `info` | Producer, source, translation-scope, and completeness evidence. |
| `metadata` | Resolved selection and caller provenance. |
| `permutationGraph` | Complete source permutation and body-alias view. |
| `analysis` | Selected-body diagnostic analysis. |
| `wgsl` | Emitted shaders, layouts, and transforms. |
| `backendBodySet` | All-body translation result, or `null` in selected mode. |
| `inspection` | Summary obtained by rereading the emitted bytes. |
| `qualification` | Structural build outcome and translation counts. |

These fields are caller evidence, not separately stored documents. No
source-reflection document or compiler IR is returned.

`qualification.packageValid` reports structural validation, not complete
translation, pipeline preparation or a successful draw. `backendComplete`
and `runtimeComplete` remain false until the broader compiler,
resource-hydration, selection and execution gates are satisfied.

## Binding-plan and WGSL-set helpers

`BuildWgslBindingPlan` takes the complete program set for one pass.
Unshared D3D tuples receive stage-qualified `scopeIdentity` values. A tuple is
shared only when its base identity appears in `sharedIdentities` and the
declarations are compatible.

`BuildWgslSet` validates shader keys, layouts, numeric slots, and resource
transforms. Ordinary sets use version 2. A proven physical-resource
coalescing uses version 3 and carries an explicit transform recipe.

## Static metadata

The class exposes `OUTPUT_JSON`, `CLASS_KEYS`, `id`, frozen `mediaTypes`,
`extensions` (`.carbonwebgpu`), its frozen `outputs` map, `format`,
`analysisFormat`, and `packageVersion`. There is no `OUTPUT_RAW` or debug
output.

## Errors

Reads fail closed on malformed Carbon records, sparse or misordered
permutation tables, out-of-range arena references, trailing record bytes, or a
program-bearing stage WebGPU cannot express.

Builds additionally reject unsupported source versions; unknown, duplicate or
unresolved permutation assertions; missing techniques, passes or stages;
duplicated or incomplete requested stage lists; unsupported selected-program
semantics; ambiguous pass layouts; non-`main` entry points; and malformed
emitted records or backend blocks. The [all-mode contract](../formats/carbon-webgpu.md#all-mode)
distinguishes the initial selection failure from a later unsupported body.

## Related documentation

- [Effect packaging guide](../guides/effect-packaging.md)
- [Carbon WebGPU effect container](../formats/carbon-webgpu.md)
- [WGSL compatibility](wgsl-compatibility.md)
- [Class-purpose catalog](classes/README.md)
