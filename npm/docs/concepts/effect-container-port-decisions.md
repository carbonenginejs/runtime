# Effect container port: decisions and deferred work

Status: Evolving
Scope: `@carbonenginejs/runtime-resource`, with recorded defects in `engine-webgpu`
Audience: Anyone continuing the Carbon v15 container port, or cleaning up the layering it exposed
Summary: What was decided, what was measured, and what was deliberately deferred while porting Carbon's binary effect container into `.cewgpu` / `.cewg`.

## Why this document exists

The container port produced two kinds of output: format work, which lands in
`formats/carbon-effect-container.md`, and a set of **decisions and discoveries that
outlive the task**. The second kind was previously recorded in an uncommitted
`.agents/` handoff, which does not survive. Anything here that decided how bytes
are written, or recorded a defect nobody is fixing yet, belongs in package
documentation. See [shader-resource-model.md](shader-resource-model.md) for the
resource model these decisions serve.

## What is done

Phase 1 — the shared byte reader, writer, and string-table arena — is complete and
pushed as `6abcbf2`. It is proven against the whole shipped corpus at build
3444265: **4833 files** (537 shaders x 3 quality variants x dx11/dx12/metal),
78,498 rows, 40,645 distinct bodies, byte-exact in three modes, including one that
rebuilds the arena entirely from references rather than copying the source bytes.

The third mode is the result that matters. Not one shipped file retains an
unreferenced arena blob, so Carbon's bytewise-sorted offset policy reproduces
CCP's arena exactly rather than merely compatibly. The divergence-reporting path
built to handle the expected failures asserts unreferenced-blob retention instead
of relaxing the comparison, so it stays honest if that ever stops being true.

Metal earned its place in that corpus. One reader and one writer reproduce, byte
for byte, files whose payloads are DXBC in two dialects and AIR, with no language
field anywhere. Backend-invariance of the metadata region is now a measured fact
rather than an argument from the writer, which is the strongest available evidence
that `payloadKind` belongs in the envelope header and never per-stage. Reaching
those files needed no reader change — see the `macos-metal` overlay note under
[Constraints](#constraints-that-stay-in-force).

## Decisions

### Offset-table density fails closed on read

The promotion condition was "no shipped file is sparse." Measured 3222/3222 on a
header sweep and 4833/4833 through round-trip: all dense, all in order. Condition
met, so the diagnostic is promoted.

`--ignore-permutations` makes CCP's compiler emit only key 0 while declaring every
axis, so a tool that produces a sparse file does exist. That argues for an escape
hatch, not against promotion, because of what a sparse file does downstream:
`Tr2EffectRes.cpp:121-126` indexes `m_offsets` **positionally** and ignores the
stored `index`, so Carbon does not reject a sparse file — it silently returns the
wrong permutation's shader. Permissive-by-default would reproduce that, and silent
wrongness in permutation selection is the failure class this whole effort closes.

Landed as: always diagnosed; fails closed on write, because we own those bytes;
fails closed on read by default, with `{permissive: true}` as an explicit opt-in
for forensic inspection of a file already known to be malformed.

Implemented in `CjsCarbonEffectReader`, and re-verified against the corpus under
the new default: 4833/4833 still read, so failing closed rejects nothing CCP ships.
The shared reader, writer and arena are also reachable now as the `./format`
subpath, so they survive the `npm/dist` build instead of being tree-shaken out.

### The two invented sections use Carbon's own mechanisms

Measured 30.5:1 sharing at `(body, pass)` granularity — 22 distinct layout blocks
across 672 pairs.

| encoding | cost |
|---|---|
| inline in the description region | +25% |
| one arena blob per pass | +2.6% |
| lean derived-only record | +1.8% |
| cross-body index table | cheapest, **rejected** |

Decided: **one arena blob per pass.** The 0.8% saved by the derived-only record is
noise against a 3x overall win, and it is bought by moving knowledge out of the
file and into a derivation that every future reader must reimplement — precisely
the permanent bespoke code in `Tr2Shader` this port exists to avoid. The arena
blob is the same mechanism as program source: a blob referenced by offset,
deduping automatically, which is why 30.5:1 sharing collapses it to +2.6%.

The cross-body index table is rejected because body records must stay
independently packed or the offset table stops meaning what it means.

**Correction found while implementing: the blob must be self-contained.** An arena
blob cannot contain arena offsets. An offset is only known after the arena's
content sort, and that sort depends on every blob's bytes — including this one — so
a block referencing the arena would have to be interned before its own contents
could be computed. Carbon never meets this because no Carbon arena blob refers to
the arena. Strings inside the block are therefore inline and length-prefixed rather
than interned.

The decision survives; the cost moves. A repeated `"t11"` is stored once per
distinct block instead of once per package, which revises the estimate from +2.6%
to roughly +3.9% — still a 6x improvement on inline, and the 30.5:1 block-level
dedupe is what carries it. Both sections share one block, as decided, which is also
what makes them one versioned unit: `blobVersion` sits inside the payload, so an
unknown version is skipped rather than misparsed.

`resourceTransforms[]` reduces to the minimum the consumer contract needs, with
every derivation documented where a reader will look for it. All five claimed
derivations verified, plus eight more.

**The fields, named for confirmation.** Producer and gatekeeper are
`buildResourceTransformPlan.js` — `normalizeTransform` at `:48-96` throws on any
value other than the one shown, which is what makes these safe to drop and restore
rather than merely observed-constant.

| dropped | restored as | gate |
|---|---|---|
| `version` | `1` | `:52` |
| `kind` | `"texture-2d-array"` | `:53` |
| `stage` | `"fragment"` | `:55` |
| `representation` | `"native-or-rgba8"` | `:74` |
| `missingLayer` | `"reject"` | `:75` |
| `output.viewDimension` | `"2d-array"` | `:72` |
| `output.layerCount` | `inputs.length` | `:73` |
| `output.identity` | `inputs[0].identity` | `:70` |
| `output.scopeIdentity` | `` `${inputs[0].identity}@fragment` `` | `:71` + `:41` |
| `inputs[].layer` | array position | `:39` |
| `inputs[].scopeIdentity` | `` `${identity}@fragment` `` | `:41` |
| `inputs[].identity` prefix | `"sampled-resource:"` | `:40` |
| `layoutKey` | the enclosing pass | position |

Kept on the wire: `inputs[].parameter`, and the `space:register` pair inside each
`inputs[].identity`. `parameter` is load-bearing — the harness asserts
layer-to-parameter (`quadDetailV5Fixture.js:1140-1144`) — and while it is
recoverable from Carbon's `StageData.textures` map (`EffectData.h:683`), that map
is keyed by register index alone, so recovery is sound only at `registerSpace 0`.
Not worth twelve bytes.

**The four narrowings, decided.** Each was safe against today's producer; the
question in every case was what it forecloses.

- **A one-byte family discriminator is bought.** It keeps `kind`,
  `representation`, `missingLayer` and `output.name` derivable without pinning the
  format to a single recognizer. It was the only forward-compatibility question
  here that was not free, and one byte is the cheapest insurance in the section.
- **`stage` is dropped**, restored as `"fragment"`. A future producer emitting
  vertex or compute transforms is a version bump regardless.
  `packageHelpers.js:183`'s wider admission stays as harmless dead tolerance — the
  engine is **not** narrowed to match.
- **Array position means `layer`.** This is safe specifically *because*
  `inputs[].parameter` stays on the wire: layer identity remains cross-checkable
  against the parameter rather than asserted by position, which is the property
  `quadDetailV5Fixture.js:1140-1144` already tests. Position-as-meaning with no
  independent check would have been a different answer.
- **`id` stays on the wire; `output.name` is dropped.** They looked alike and are
  not. `id` is an identity a caller may supply (`normalizeTransform:51` accepts any
  non-empty string, and `buildWgslBindingPlan.js:91` is a caller-supplied plan
  path) and it propagates into the engine binding as `transformId`; deriving it
  forecloses that path to save one `u32`. `output.name` is never referenced by the
  emitted WGSL, which uses `generatedSymbol` — that makes it diagnostic, and
  diagnostics do not belong on the wire.

### Sorting must be byte-wise, not locale-aware

Eleven `localeCompare` sorts exist in `formats/webgpu/core/`. **None are in
`src/format/`**, so phase 1's byte-exactness is not locale-dependent and needs no
caveat. But those sorts determine our *own* bytes, so reproducible builds require
replacing all of them with a UTF-8 byte comparator: `buildResourceTransformPlan.js:116`,
`buildWgslBindingPlan.js:172-173`, `buildWgslSet.js:258,374`,
`effectBackendBodySet.js:45`, `selectionPlans.js:210`,
`analyzeRegisterValues.js:236`, `inferValueTypes.js:205`,
`lowerComputeProgram.js:888,890`. Applying one comparator uniformly is cheaper
than deciding case by case which reach the wire.

### Three record traps the field-order table caught

The v15 field-order table was derived three times independently — twice by
subagents, once by the implementer — from `EffectData.h`'s `Save` methods and
`Tr2EffectDescription.cpp`'s read order. All three agree field for field. Each of
these is now a comment at the code that would have hit it:

- a UAV record is **one byte shorter** than a texture record (no `isSRGB`), so
  sharing one "resource" codec corrupts everything after it
- `borderColor` is four floats on a sampler and **one byte** on a static sampler
- a non-string annotation value is four raw bytes; Carbon writes through a float
  union and reads through a different one, so any int/float conversion breaks the
  round trip

The handoff's claimed v15 stage field order was confirmed wrong:
`pipelineInputs` and `registers` come **after** `shaderCode` + `threadGroupSize`.

## The layering defect in `engine-webgpu`

**This predates the container port and is not the port's to fix.** It is recorded
here because the ANLS audit surfaced it and it must not be rediscovered.

`engine-webgpu` reads format-package chunks directly to obtain Carbon reflection:
`src/core/packageHelpers.js:704,719-722,755,765` and
`src/core/spaceObjectMainBindings.js:252-301` read `metadataName`, `heapView`,
`carbon.type`, `carbon.isSRGB`, and `carbon.constants[].{name,offset,size}` to
pack real material uniform bytes.

An engine package should not read format chunks. It should read the **shader**.
`Tr2Shader` already exposes exactly this surface — `GetConstant(name)`,
`GetResource(name)`, `GetParameterAnnotations(parameterName)`,
`GetEffectDescription()`, `iterateStages()` — reachable today through
`GetPortableEffectReflection` -> `Tr2Shader.fromPortable`.

The seam is clean, and the port already states its half of it: `layouts[]` is not
derivable from Carbon reflection, because `(group, binding, visibility,
generatedSymbol)` comes from the lowered IR.

| belongs to `Tr2Shader` | belongs to the package |
|---|---|
| `constants[].{name,offset,size}` | `group`, `binding`, `visibility` |
| `carbon.type`, `isSRGB` | `generatedSymbol`, `resourceKind` |
| `annotations` | `registerIndex`, `registerSpace` |
| the parameter's name | `viewDimension` |

Carbon reflection from the shader; WebGPU binding topology from the package.
`heapView` needs determining rather than assuming — it reads as a Carbon resource
concept, so probably `GetResource`.

The duplication is **one layer down from where it looks**. `CjsWebGPUPackage` is
115 lines and holds no GPU objects; it precomputes three descriptor arrays and
exposes lookups, and it already has `GetBackendBody(permutationIndex)`. The
overlap is that `packageHelpers.js` independently reimplements reading Carbon
reflection out of the package document, which `Tr2EffectRes`/`Tr2Shader` already do
canonically. Building pipelines and bind groups is *not* duplication and should
stay in the engine.

No `CjsWebglPackage` exists yet, and `engine-webgpu` is the only engine package, so
this is preventable rather than twice-broken. **Do not create a second one.**

**Owner and timing:** deferred, and explicitly **not blocking the container port**.
Nobody can use this path until the shader work lands, so the break is theoretical.
To be cleaned up after the port is done.

## How the port proceeds without waiting for that cleanup

The engine consumers above would break if `ANLS` simply disappeared, and the
browser draw gates would go red with it. So:

**`ANLS` stops being stored and becomes a derived compatibility view.** Every field
the engine reads exists in the reflection records, so the view is derivable at read
time rather than persisted. The chunk dies, the bytes are saved, the engine is
untouched, and the gates stay green. Removing the view itself belongs to the
layering cleanup, not to the port. There is precedent for this shape in the
LightData flatten: a compatibility view over a changed representation.

The audit's findings are recorded even though the deletion is deferred:

- of the eight reconciliation functions, **six are safely redundant**;
  `validateAnalysisThreadGroup` and `validateAnalysisCarbon` are covered twice over
- **`validateReflectionAnalysis` is genuinely load-bearing** — the only check
  catching a body/permutation mismatch, because WGSL carries neither `shaderSize`
  nor `stringTableOffset`. Putting WGSL in the arena closes that gap structurally,
  but note what the check actually buys: an offset reference proves *validity*, not
  *correctness*. Carbon gets correctness from construction, writing body N at row N
  with no cross-check. We cannot, because our WGSL is translated from a specific
  body's DXBC and a translator bug could mis-pair them. Keep the check; its minimal
  form is most likely a digest of the source DXBC stored per stage — a field, not a
  document.
- three ANLS values have **no counterpart** in the persisted records:
  `passes[].renderStates`, `stages[].shaderHandle`, `pipelineInputs[].usageName`.
  They are not fields, so there is no capability drop to record. All three are
  values Carbon itself computes at load time and does not persist either:

  | ANLS field | what it actually is | Carbon does the same |
  |---|---|---|
  | `passes[].renderStates` (integer) | interning handle over the persisted `{state, value}` pairs, from `RegisterRenderStateSetup` (`HlslEffectDescription.js:289`) | `Tr2EffectDescription.cpp:666`, identical call, over the pairs at `EffectData.h:732-737` |
  | `stages[].shaderHandle` | registration handle from `RegisterShader` (`HlslEffectBindingManifest.js:182`) | `Tr2EffectDescription.cpp:587-591`, identical call |
  | `pipelineInputs[].usageName` | display name looked up from the persisted `usage` byte (`HlslEffectDescription.js:592`) | `GetStringForUsageCode` (`EffectData.h:86`) over `UsageCode` (`:72`) |

  Each is recomputable from data the container already carries, which is what a
  derived compatibility view is for. Nothing goes on the wire for them.

## Constraints that stay in force

- Source `.sm_lo` / `.sm_hi` / `.sm_depth` and all `effect.*` payloads are CCP game
  files: never commit, fixture, or publish. Fetch through tools-core at pinned
  build 3444265. Built `.cewgpu` / `.cewg` are ours but also not committed.
- `E:\carbonengine` is the source of truth, and its **writer** is authoritative
  where the reader is ambiguous. If Carbon looks deficient, the mechanism is
  somewhere not yet read — three confident claims were refuted that way.
- Write **v15 only**. Carbon's own reader annotates the v13-v14 field-order
  boundaries as uncertain (`Tr2EffectDescription.cpp:177,257,578`). `effect.gles2`
  is not a validation target; those shaders are over ten years old and were an
  interest point.
- **No tools-core changes.** Another agent is working on audio there with
  uncommitted files. Metal is already reachable via the `macos-metal` remote
  overlay and the local service route; the two mac blockers in
  `CjsIndexReader.js:89,235` stay unfixed on purpose.
- Stage explicit paths only — never `git add -A`, never `git stash`. `git fetch`
  before every push. Check `git status --short` in every package touched. `npm/` is
  a shared publish mirror.
- Format work and consumer work stay in separate commits, independently reviewable
  and independently revertable.

## Open items

| item | owner |
|---|---|
| Phase 2 — the format rewrite, both backends | container port |
| Replace all eleven `localeCompare` sorts with a byte comparator, inside phase 2 | container port |
| Phase 3a — the three one-body assumptions and `CjsWebGPUPackage`'s triple eager clone | container port |
| Migrate `engine-webgpu` off format chunks and onto `Tr2Shader`; delete the ANLS compatibility view | layering cleanup, after the port |
| Whether `engine-webgpu` should consume `Tr2EffectRes` selection rather than reimplementing reflection reading | layering cleanup, after the port |

### Why the layering cleanup waits

Not because it is large — the migration is roughly 12 lines across
`spaceObjectMainBindings.js` and `packageHelpers.js`. Because the correct fix
injects a `Tr2Shader` into the engine's prepare stage, and the mechanism that would
do that — `runtime-core` registering engines and adapters into `runtime-core` and
`runtime-trinity` — is not designed yet. Building it inside `engine-webgpu` would
implement `runtime-core`'s responsibility in the wrong package. Trivial after that
design exists, unbuildable before it.

### Phase 3a scope, for when it comes

Three one-body assumptions, not two. An all-permutation package throws or
mis-resolves at each:

- `matchShaderSource` throws on more than one candidate
- `buildPipelines`' `layouts.find(key === passKey)` picks blindly
- `spaceObjectMainBindings.js:219-240` — `findMaterialBinding` fails unless there
  is exactly **one** `Main.pass0.pixel` analysis stage

Plus `CjsWebGPUPackage`'s triple eager clone: the constructor `cloneJson`s
`analysis`/`wgsl`/`shaders`/`layouts`, clones again per stage, then clones a third
time into `_json` and `deepFreeze`s it, unconditionally, against 15-33 MB
documents. Independent of everything else and safe to do at any point.
