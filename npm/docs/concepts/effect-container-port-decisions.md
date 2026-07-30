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

### Sorting must be byte-wise, not locale-aware — done, and order-neutral

All eleven `localeCompare` sorts in `formats/webgpu/core/` are replaced by
`compareUtf8` (`src/format/compareUtf8.js`), applied uniformly rather than only to
the six that reach the wire. `compareAnnotationNames` was a private copy of the same
rule and now delegates to it, so the package has one byte comparator and a test
pinning that it agrees with `compareTableBlobs`.

Why locale collation could not stay: without an explicit locale it is
implementation- and ICU-dependent, so the same input can order differently across
Node builds; it treats case as a minor difference, putting `"a"` before `"Z"` where
bytes do the reverse; and it gives punctuation variable weight, so `-`, `:` and `@`
— which appear in every binding identity being sorted — are not ordered by code
point.

**Measured result: the change is byte-neutral on today's data.** Packages were built
from real dx11 effects before and after, and compared byte-for-byte:

| sample | packages | coverage | result |
|---|---|---|---|
| full builds, quad family + textureviewer | 12 | 4–34 bindings per package | identical |
| wide sweep, `.sm_lo` across the sorted path space | 43 | 534 bindings, 81 layouts, 161 shaders, 21 distinct binding counts from 0 to 38 | identical |

So no fixture re-pin was required, which is a stronger outcome than re-pinning
carefully: a re-pin you did not need is indistinguishable from one that hid a real
reorder. The result also confirms the recon's reading of
`buildWgslBindingPlan.js:172-173` — the `generatedSymbol` and `scopeIdentity`
tie-breakers are unreachable in practice, because `(registerSpace, kind,
registerIndex, stage)` is already unique and a shared and a stage-scoped form of one
identity cannot coexist.

That sort is the one piece of phase 2 whose output crosses the package boundary: it
assigns the numeric `@group`/`@binding` indices that land in emitted WGSL and that
`engine-webgpu` binds against. Byte-identical output means the draw gates cannot have
moved, so verifying them on a device is unnecessary for this change rather than
merely deferred.

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

## Measured baseline, and what it says about where the win is

Sizes are reported as **ratios and section shares, never absolute totals**. These
are build artifacts, not shipped assets, and nobody fetches them over a network. A
package that shrinks far less than the rest is the interesting signal: it means
identical program source is not sharing, which is an arena bug wearing a size
number as a costume.

Before, measured from real dx11 effects at build 3444265 — 6 webgpu packages
(20.2 MB) and 5 webgl packages (79.5 MB), same source effects both sides:

| section | webgpu share | webgl share |
|---|---|---|
| `RFLX` portable reflection | **78.5%** | 19.6% |
| `RBLB` reflection blob arena | 16.7% | 4.1% |
| `GLSL` program set | — | **55.6%** |
| `META` | 0.0% | **20.3%** |
| `PGRF` permutation graph | 2.1% | 0.4% |
| `WGSL` program set | **1.9%** | — |
| `ANLS` analysis | **0.6%** | — |
| `INFO` | 0.0% | 0.0% |

Three things follow, and two of them correct expectations the plan was working from.

**For webgpu the bulk is reflection, not program source.** `RFLX` plus `RBLB` is
95.2% of every selected package; the emitted WGSL is 1.9%. So the ~3x is expected to
come almost entirely from replacing the reflection document with Carbon description
records over a shared arena — every name and description currently repeats per body
as JSON. Moving program source into the arena is still correct, and it is what makes
all-body packages tractable, but on a selected package it is a rounding error.

**For webgl the bulk really is program source**, at 55.6%, because webgl already
defaults to carrying every permutation. Its profile does not mirror webgpu's at all,
and its second-largest section is `META` at 20.3% — `effectRes.toJSON()` plus a
per-body binding manifest, which is exactly the selection and manifest data the
container makes redundant. webgl is also 4x the size of webgpu for the same effects.

**Deleting `ANLS` was never a size play.** It is 0.6%. The reason to stop storing it
is duplication and layering, and it should be argued on those terms only.

## The retained structural checks, audited against Carbon

Every check that survives has to name the Carbon invariant it enforces, or declare
itself our invention. This is the one place where keeping our own assumptions and
renaming them would be indistinguishable from retargeting, and no test would catch
it, because our checks pass on our own files by construction.

The audit's headline result is that **the classification was wrong**. Of the ~436
webgpu and ~185 webgl lines filed as "structural, retargeted at records", most are
not invariants at all. They guard one thing, and it is not a Carbon concept: that a
single logical tree, which the chunk container shattered into flat string-keyed
arrays in separate chunks, still reassembles. `INFO`, `META`, `ANLS`, `WGSL`, `PGRF`
and `WGSB` each hold a projection of the same effect, and the checks assert the
projections agree. Carbon has no such surface — `Tr2EffectDescription::Read` walks
one contiguous stream where a stage *is* inside its pass. Containment replaces
reference, position replaces key, and the count word before an array replaces
`Array.isArray`. Those lines belong in the **deleted** column.

What genuinely survives is much smaller, and splits three ways.

**Carbon-implied — keep, and these are the valuable ones.** Two clauses, each
guarding something Carbon omits and would misbehave on:

- **Duplicate stage type within one pass.** `Tr2EffectDescription.cpp:536` assigns
  into `stageInputs[type]`, so a repeated type silently clobbers the earlier stage
  and `shaderHandles`/`stageCount` (`:592`, `:650`) then disagree. Last-wins, no
  error — the same failure class as the index clobber already on record org-wide.
- **`stageType` value range.** The value indexes `stageInputs[type]` unchecked;
  `SanityCheck` at `:529` bounds the *count*, never the value. Out of range is an
  out-of-bounds write in Carbon.

**Already enforced by phase 1 — do not write twice.** Count non-negativity (a
fixed-width unsigned decode cannot produce a negative), the count caps, arena and
offset-table containment, row density and positional indexing, and the version
range. Retargeting these means the same check at two layers.

**Our invention, correctly.** Everything guarding the two invented sections, plus the
WebGPU enum tables. Fine, but labelled. Two are worse than invented and cannot be
retargeted at all, because their operands never reach the wire:
`validateBindingDescriptor`, whose `minBindingSize`/`hasDynamicOffset`/`sampleType`/
`multisampled` are synthesised at realization, and the `viewDimension` clauses, which
the reader restores from the family defaults. Retargeting either means inventing the
value and then checking it against the rule that generated it.

Also invention, and worth naming: `STAGE_SCHEMA`'s stage numbering is Carbon's
(`EffectData.h:15-22`), but its *closure at three* is not — Carbon admits six stage
types. A WebGPU restriction wearing Carbon's numbering.

**Decided: the container admits Carbon's six.** A container that admits three is not
Carbon's container. `STAGE_SCHEMA` stays in the webgpu validator, which is the
backend layer, and rejects what WebGPU cannot express — it does not migrate into the
container during the rewrite. The rule is the one held throughout: the Carbon region
is backend-invariant, restrictions live in the backend. Already satisfied on our side,
since `CARBON_EFFECT_COUNT_CAPS.stages` is 6.

`validateBindingDescriptor` and the `viewDimension` clauses are deleted rather than
retargeted. Their operands are synthesised at realization, so checking them here
would be inventing a value and then testing it against the rule that generated it.
`minBindingSize`, `sampleType` and `multisampled` may well deserve a check where they
are actually derived from external inputs — but that is `engine-webgpu`'s realization
path and out of this port's scope.

### The final split

Superseding the partition's estimate. `validateEffectPackageEnvelope` is apportioned
by line span rather than counted whole.

| | webgpu (of 1757) | webgl (of 609) |
|---|---|---|
| **deleted** — reconciliation, info-plumbing, meta-selection, digest | ~925 | ~283 |
| **deleted** — shattered-tree bookkeeping previously filed as structural | ~330 | ~150 |
| **deleted** — untargetable, operands never reach the wire | ~48 | 0 |
| **retained, retargeted at records** | ~60 | ~35 |
| **retained, moved to the backend layer** (WebGPU enum tables, `STAGE_SCHEMA`, bind-group and transform checks) | ~350 | 0 |
| imports, shared helpers, boilerplate, JSDoc | ~380 | ~141 |
| **total** | 1757 | 609 |

The retargeted column is ~60 lines, not ~436. Two clauses in it are load-bearing;
the rest is the per-blob exhaustiveness rule and the caps already in phase 1. The
~350 retained-but-moved lines are not deleted and not retargeted — they keep working
on WebGPU concepts, which is where they always belonged.

The webgl boilerplate share is high — 141 of 609, 23% — because that file is one
large driver function plus six one-line type guards, so its per-function overhead is
proportionally larger than webgpu's thirty-six functions.

This also shrinks the commit the backend split was partly sized to justify. The split
still holds on its other grounds — webgl needs a measurement baseline, half-cost
failure discovery, and `inspectWithValues` couples write to read within a backend but
not across backends.

### The alias decision, and the free oracle for it

Aliasing is the one thing the write path **decides** rather than preserves, and
nothing in phase 1 exercised that. Phase 1 proved re-emission: read the rows, write
them back, aliases carried across without ever being chosen. Deciding is new logic —
Carbon compares packed bodies pairwise and points a duplicate's row at the surviving
twin (`ShaderCompiler.cpp:717-744`, `:804-820`), which is why `bodyKey` was dropped in
favour of "identical offset is the alias". Getting it wrong produces a structurally
valid file with wrong sharing: every check passes, the arena is sound, and the wrong
permutation resolves to the wrong body. None of the rules above catch that.

CCP's files are a free oracle, because they already contain the answer. The corpus
test now decodes each shipped effect, rebuilds it through the **deciding** path
(`CjsCarbonEffectWriter.addBody`, which dedupes bodies by content) rather than the
preserving one, and compares the alias grouping — which rows share a body,
canonicalised independently of where that body sits.

This is a **container-level** property: which bodies are byte-identical, decided
before any backend translation and independent of it. So the oracle runs over the
whole corpus rather than a chosen sample — all 4833 files across dx11, dx12 and
metal, the same sweep as the re-emit proof, with the writer deciding aliases instead
of preserving the rows it read. WGSL support is irrelevant to it, so effects that no
backend can translate are valid cases and are included.

Measured: **900 of 4833 files alias, ratios up to 20:1, zero groupings disagree with
CCP's compiler.** The spread matters more than any single figure — `.sm_lo` variants
of the quad family reach 480 rows over 24 bodies (20:1) because low quality collapses
more permutations, while `unpacked_quadv5.sm_hi` is 480 over 144 (3.3:1), reproducing
the figure the plan quoted from Carbon exactly.

The grouping is asserted by name and ahead of the byte comparison. A byte diff would
catch a wrong grouping too, but it would report "these files differ at offset
918204", which is not a diagnosis.

**Report sharing per tier, not as one headline ratio.** A single number hides the
shape, because the ratio varies more by quality tier than by backend:

| backend | `.sm_lo` | `.sm_hi` | `.sm_depth` |
|---|---|---|---|
| dx11 | 3.91:1 | 2.45:1 | 2.45:1 |
| dx12 | 2.64:1 | 1.46:1 | 1.46:1 |
| metal | 2.53:1 | 1.39:1 | 1.39:1 |

Each cell is 537 effects and 8722 rows. Individual effects go much further —
`quadv5.sm_lo` is 480 rows over 24 bodies, 20:1, against 3.3:1 for the same effect at
`.sm_hi`.

`.sm_hi` and `.sm_depth` matching to three significant figures looked like a
measurement artifact and is not. Checked per effect rather than in aggregate: dx11
and metal have identical body counts in all 537 effects, dx12 in 528 of 537 — the
nine exceptions are all organic/asteroid effects, differing by one or two bodies.
And no effect anywhere has byte-identical `.sm_hi` and `.sm_depth` files, so this is
not the same file counted twice. The two tiers are different code that collapses to
the same number of distinct bodies, because the same permutation options drive body
identity. dx12's nine exceptions are the useful part: they show the measurement can
resolve a difference when one exists.

This vindicates carrying every permutation rather than baking one. Sharing is
cheapest exactly where it matters most: low-quality tiers collapse the most
permutations, and low-quality tiers are what low-end devices fetch.

dx11 also shares substantially better than dx12 or metal at every tier, while dx12
and metal land within 0.1 of each other. So a dx11 figure is not representative of
all three, and a size report must stay per-backend as well as per-tier. The pattern
says something about how the three compilers specialise: dx11 produces byte-identical
code for permutations the other two distinguish, which means either its lowering is
less sensitive to the options that vary, or dx12 and metal encode something
option-dependent that dx11 does not.

**Systemic guard, not a one-off fix.** The `*Raw` trap does not go away when the wire
format changes, because those fields exist for the JSON hydration boundary and stay
there. It simply relocates to the mapping seam, waiting for the next field somebody
adds with that suffix. `carbon-raw-fields.test.js` therefore guards the class: no
`*Raw` property may be read on a line that does not also reinterpret it, plus a
behavioural check that `-FLT_MAX` bits map to the float and not to `4286578687`.

The guard's first version had a three-line window and was verified against a
deliberately reintroduced bug — it did not catch it, because a correct call on the
neighbouring line vouched for the broken one. Tightened to same-line, which costs
only that raw mappings be written on one line.

### How our WGSL bodies should share — predicted, then measured

The alias oracle proves we group *Carbon* bodies the way CCP's compiler does — dx11
in, dx11 out. It says nothing about how our **WGSL** bodies group, and that is what
actually determines package size. The mechanism is the same (byte identity of the
description blob) but the ratio is unknown, so it is worth predicting before running
it, while the prediction can still be wrong in public.

The prediction was made and then measured, and it was wrong twice over. Both
corrections are recorded because the reasoning that produced them is the reusable
part.

**Wrong suspect: `sourceMap` suppresses no sharing at all.** The argument was that
`sourceMap` entries carry `dxbcOffset`, a byte offset into the source DXBC, so two
permutations lowering to character-identical WGSL would still fail to share whenever
their DXBC was laid out differently. Measured across 2,866 builds covering all 537
dx11 effects at three tiers: hashing each unit's content with and without
`sourceMap` yields the same 22,793 distinct units. Whenever the rest of a unit
matches, its `sourceMap` matches too — `dxbcOffset` never splits an otherwise
identical body. The mechanism is sound and the effect is null; a plausible mechanism
is not a measurement.

**Wrong framing, which matters more: unit count and Carbon body count are not the
same quantity.** `passUnitSignature` is computed *before* translation and keys on
`passKey`, `bytecodeDigest`, `semanticBindings` and `effectProfileProof`
(`effectBackendBodySet.js:31`). That is why `Main.pass0` never dedupes — its DXBC
genuinely differs per body, and translation cannot undo that. Today's identity is
therefore **coarser** than the record layout's blob byte-identity, so comparing our
body count against dx11's Carbon body count compares two different things. The
baseline to measure against is today's unit count, not the Carbon table.

**The real prediction, with a number.** Keying on `bytecodeDigest` rather than
content means some units stay separate that are byte-identical: 420 of 23,213
(~1.8%), concentrated in ubershader, which goes 48 → 24 at every tier. So the record
layout should share **slightly better than today, never worse** — expect roughly
22,793 units where today has 23,213. Substantially less sharing is the signal, and
`sourceMap` is no longer on the suspect list.

**The tier trend is inverted between the two quantities, and that is not a
regression.** Unit sharing runs `.sm_hi` 2.75:1 > `.sm_depth` 2.65:1 > `.sm_lo`
1.87:1; Carbon dx11 bodies run `.sm_lo` 3.91:1 > `.sm_hi` 2.45:1. Both are correct
measurements of different things. Flagged because an inverted trend is exactly what a
regression looks like at a glance, and the two tables sit a page apart.

Method, to re-run: build each effect with `mode: "all"`, read back with `OUTPUT_RAW`,
and hash each `passUnit`'s `{shaders, layouts, resourceTransforms}`. 32 effects fail
the all-body build outright — storage-resource shape, typed buffer, geometry, compute
— consistent with the known-unsupported set, so they are excluded rather than
counted as zero.

### Measured, at corpus scale, with a sample-bias correction

The emit landed and the sharing was measured twice: first on five named effects,
then on the whole dx11 corpus. **The five-effect figure was wrong by 2.5x, and the
error was sample bias, not measurement error.** Both measurements are internally
correct and their accounting closes exactly; only the extrapolation from the small
one was unsafe.

The named-effect set was `specialfx/ubershader`, `v5/quad/quadv5`,
`v5/fx/skinned_fxuberoverlayv5`, `interior/avatar/auraavatar` and `ui/ubershader` —
two of five ubershaders, which is precisely the concentration that inflates it.

| quantity | 5 effects x 3 tiers | dx11 corpus (1519 files) |
|---|---|---|
| `passUnits` | 710 | 11,773 |
| `contentUnits` | 638 (**-10.1%**) | 11,563 (**-1.8%**) |
| wire contents | 500 (**-21.6%**) | 10,393 (**-10.1%**) |
| wire / `passUnits` | 70.4% | **88.3%** |

Read the headline as **11.7% fewer distinct pass contents**, not 30%. 92 of 1611
files are excluded because they fail the all-body build, consistent with the
known-unsupported set; counting them as zero would flatter every ratio.

**Do not misread the two 10.1% figures — they are different mechanisms that swapped
places between the samples.** In the five-effect set, 10.1% is the digest-coarseness
gap; corpus-wide, 10.1% is the positional gap and digest coarseness is 1.8%. The
1.8% agrees exactly with the independent 420-of-23,213 measurement, which is the
strongest evidence that the corpus figure is the trustworthy one.

Both mechanisms, named:

- **Digest coarseness, 1.8%.** `passUnitSignature` is computed before translation
  and keys on `bytecodeDigest`, so bodies whose DXBC differs but whose WGSL is
  byte-identical stay separate. Concentrated in ubershader, 48 -> 24 at every tier.
- **Positional recovery, 10.1%.** Units differing only in `key`, `techniqueName`,
  `passIndex` or `layoutKey` collapse, because the record layout restores all four
  from position. `Shadow.pass0` and `DynamicLightShadow.pass0` emit byte-identical
  WGSL and byte-identical layouts and differ only in the technique name.

Cross-technique sharing was not predicted and is the larger of the two. It also
corroborates an older table that recorded `Shadow.pass0` and
`DynamicLightShadow.pass0` at 144 body-passes, 4 units and 17 KiB unique WGSL —
identical in every column, which was this same fact sitting unread.

Per tier, positional recovery runs `.sm_lo` 12.6% > `.sm_depth` 9.7% > `.sm_hi`
9.0%, matching the Carbon body-count trend rather than the unit-sharing trend.

### The mapping oracle: our producer's data into Carbon records

Every proof above is Carbon records in, the same Carbon records out, checked against
shipped bytes. Phase 2 adds a direction none of them cover: **our producer's data
into Carbon records**. CCP never wrote one of our packages, so there is no file to
diff against, and round-tripping through our own reader would be self-consistent —
weak in exactly the way `jsonEqual` was weak.

An oracle exists anyway. Our reflection is derived from a dx11 file's own reflection
through the HLSL reader, so the Carbon region we emit for an effect must be
near-identical to the Carbon region of the file it came from. `carbon-mapping.test.js`
diffs the two field for field over 361 bodies across three effects of different
shapes, and fails on any difference not on a named list. Depth beats breadth here:
each difference needs judgement, so three effects deeply beats the corpus shallowly.

**It caught a real bug on its first run.** The portable reflection stores sampler LOD
and border-colour values as raw bit patterns — `mipLODBiasRaw`, `minLODRaw`,
`maxLODRaw`, `borderColorRaw` — so that a value like `-FLT_MAX` survives JSON without
a decimal round trip. Carbon's records store them as `float`. The mapping assigned
them straight across, which would have written `4286578687.0` where the file says
`-3.4028235e38`. Every structural check in the container accepts that: the record is
the right length, the field is in the right place, the arena is sound. Only a
comparison against the source file catches it. This is the failure class the other
four proofs cannot see — mechanically perfect, semantically wrong.

**One difference remains, and it is legitimate.** For non-dynamic samplers the file
stores a name but Carbon's reader nulls it (`Tr2EffectDescription.cpp:430-433`)
before our producer ever sees it, so we emit the empty string. 738 occurrences. The
name is unrecoverable from our input rather than dropped by our mapping, and Carbon
nulls it precisely because a non-dynamic sampler is never looked up by name. Worth
knowing that a re-read of our file cannot recover it.

### Every check demonstrates its own failure

A guard that passes on the bug it was written for is worse than no guard: it turns an
open question into false confidence. Data that is accidentally right is a latent bug;
a *check* that is accidentally right is a manufactured assurance, which is harder to
find because nothing ever goes red.

That is not hypothetical here. The `*Raw` class guard was written, passed, and then
failed to catch the exact bug it existed for when that bug was deliberately
reintroduced — a three-line window let the correct call on the next line vouch for
the broken one. It only came to light because it was tested against its own target.

So every check added in this phase carries a negative control:

| check | negative control |
|---|---|
| body region starts at header end | slack inserted between header and bodies, rows shifted to match, so containment still holds |
| exhaustiveness, long | description blob and backend block each with a trailing tail |
| exhaustiveness, short | description blob truncated by one byte |
| density fails closed | synthetic sparse table, and a misordered one |
| alias grouping | one body altered by one character; grouping must change |
| `*Raw` reinterpretation | reintroduced direct assignment; guard must name the field |
| mapping oracle | found a real bug on its first run |

The mapping oracle is the only one whose control came for free. The others had only
ever passed, which is exactly the population where a three-line-window mistake hides.

### Two traps this surfaced

**`jsonEqual` must be deleted, not retargeted — retargeted it would always pass.**
Its first line is `Object.is(left, right)`. All seven callers compare two copies of a
datum a record layout stores once, so after the rewrite both operands come from the
same decode walk and are frequently the same object: it returns `true` before
comparing anything. A check that cannot fail, on our own files, is exactly what this
audit existed to prevent. It also mishandles typed arrays in both directions — a
`Uint32Array` fails `Array.isArray`, falls to the object branch, and compares equal
to `{0:1,1:1,2:1}` while comparing unequal to `[1,1,1]`. Whatever genuinely must
still be compared gets a field-wise numeric comparison instead.

**`requireExactKeys` has no per-field successor, but exhaustiveness is still
checkable.** "No missing field" is already enforced: a short record runs the cursor
past its declared end and the reader throws. "No unknown field" survives as a
per-blob obligation — after parsing a sized record at a known version, the cursor
must land exactly on the declared end, because a tail means the writer knew fields
this reader does not.

That assertion was missing from the backend block. `readBackendBlock` returned
`trailingBytes` and nothing checked it was zero, so a same-version block with extra
bytes parsed clean and discarded them silently — version skew arriving without a
version bump, which is the case the `blobVersion` gate was meant to cover and does
not, since it only rejects *higher* versions. Now asserted, with a test.

### A test must enter through the door its caller uses

`CjsCarbonEffectReader.readDescription` accepted no options at all, so it could not
forward the backend gate: a container could be written with trailing blocks and
never read back. There were tests for the gate. They passed. Every one of them
called `readEffectDescription` directly — one layer *below* the hole — so they were
real, correct, and positioned where the bug could not reach them.

That is the same shape as the three-line window in the `*Raw` guard: not a missing
test, but a test aimed slightly past its target. The window was too wide, so a
neighbouring correct call vouched for a broken one; here the entry point was too
deep, so the broken layer was never on the path.

**So: when a test targets a behaviour, check it enters through the same door a
caller would.** Applied to the container reader — its oracle goes through
`CewgpuContainer.GetBackendBodyPrograms`, the accessor an engine calls, rather than
through the block codec that accessor sits on.

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
