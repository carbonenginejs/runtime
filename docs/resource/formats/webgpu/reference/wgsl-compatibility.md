# WGSL compatibility

Status: Evolving
Scope: `@carbonenginejs/runtime/resource/formats/webgpu` DXBC-to-WGSL lowering
Audience: Shader-tool authors, engine integrators, and maintainers
Summary: Records deliberate semantic adaptations, unsupported inputs, and bounded compiler behavior.

## Purpose

This page records every deliberate divergence between the DXBC contract and
emitted WGSL, every fail-closed boundary, and every bounded support decision.
Consult and update it whenever compiler behavior changes;
each entry says why it exists and what revisiting it would take. Categories:

- **Adapted** — accepted input whose WGSL semantics deliberately differ from
  the exact D3D contract. These are the entries to re-read first when hunting
  a rendering difference against the native client.
- **Not supported (fail closed)** — inputs the compiler rejects with an
  explicit diagnostic rather than guessing.
- **Bounded / temporary** — supported within stated limits; the limits are the
  first thing to widen when a shader trips them.

## Adapted

Completed per-profile corpus-count transitions remain in
[pinned history](https://github.com/carbonenginejs/runtime/blob/ede6c17c372c6582fa2a70f72a508e589945537c/docs/resource/formats/webgpu/reference/wgsl-compatibility.md#adapted).
The support limits, browser-gate scope and runtime premises below remain active;
retiring those measurements does not widen qualification.

### `precise` floating-point operations → ordinary math + `@invariant` position

Current package policy adapts DXBC `precise`, which forbids
reassociation/fusion so multi-pass position math is bit-identical.
WGSL has no general no-contraction control, so instead of rejecting these
operations (a previous compiler boundary for higher-quality shader profiles):

- `precise`-marked operations lower as ordinary IEEE float math;
- every vertex `SV_Position` output is emitted `@invariant @builtin(position)`
  (unconditionally, all vertex shaders), which guarantees identical position
  results across pipelines built from the same emitted WGSL — the multi-pass
  crack/z-fight artifact `precise` protects against;
- precise-mask metadata is still validated structurally (well-formed mask,
  lanes covered by a destination write) in
  `src/resource/formats/webgpu/core/wgsl/precisionControls.js`.

NOT promised: bit-exact arithmetic parity with native D3D11; differential
tests against native output may differ in final ulps. Globally-non-refactorable
shaders (missing `REFACTORING_ALLOWED`) remain rejected — that contract is
stronger and genuinely unrepresentable. Revisit: if WGSL ever gains a
no-contraction control, restore exact lowering and drop this entry.

### DXBC comparison masks → `select` masks

DXBC comparisons produce 0xFFFFFFFF/0 integer masks; WGSL comparisons produce
`bool`. All comparison opcodes (`lt/ge/eq/ne`, `ilt/ige/ieq/ine`, `ult/uge`)
lower as `select(0u, 0xffffffffu, a OP b)` so downstream mask arithmetic
(`and`/`movc` chains) stays bit-faithful.

### Typeless registers → per-lane storage types with explicit bitcasts

DXBC registers are typeless 32-bit lanes. The type-inference union assigns one
storage type per SSA lane (conflicts become `bitpattern32` = `u32`) and every
crossing emits an explicit `bitcast`. Mixed-component writes (one instruction
writing lanes of different resolved types) split into per-component `let`s
(`valueN_x`, …) for immediate movs, structured loads, packed intrinsic
projections, and per-lane `movc` selects — in BOTH stages.

### SSA-legal cross-scope reads → hoisted function-top `var`s

SSA may resolve a post-join read to one arm's definition (the other path
diverges via return/discard); structured WGSL scoping cannot express that
directly. `src/resource/formats/webgpu/core/wgsl/hoistEscapingValues.js` hoists
escaping declarations to uninitialized function-top `var`s (WGSL
zero-initializes) plus in-place assignments. The zero is unobservable — SSA
proves the value is only read on assigning paths.

### Switch clauses without a `default` → empty WGSL `default`

WGSL requires a `default` clause; DXBC switches without one fall through to
`endswitch`. The emitter appends an empty `default: {}`. Switches carrying
live merges DO require a real DXBC default (fail closed otherwise).

### `SV_IsFrontFace` → `front_facing` mask projection

DXBC reads the front-face flag as a 0xFFFFFFFF/0 mask; WGSL's builtin is
`bool`. Consumers receive `select(0u, 0xffffffffu, front_facing)` (or the
signed variant).

### Selection arms may write outputs alongside a live merge

A vertex `if`/`else` whose arms write shader outputs (typically `SV_Position`
in a Picking/stretch pass — one arm computes the real transform, the other
writes a constant/off-screen position) AND also carry a scalar phi merge
(e.g. a `TEXCOORD` lane read after the join) used to be rejected outright.
Output writes inside a branch compose correctly with the merge machinery: the
merge `var` is pre-declared before the `if` and assigned at each arm's end,
while output completeness is enforced by the post-branch component
intersection and the reachable-`ret` coverage check. The guard is therefore
removed for selections; the genuine "terminates before merge assignments"
(return inside an arm ahead of the appended merge write) guard stays.
This shape is covered by browser validation across vertex selections and live
merges.

The fragment stage kept this guard longer than the vertex stage even though its
surrounding machinery (per-arm written-component cloning, post-branch
intersection, merge-var appends) is identical; the fragment guard is now
removed too, browser-validated across fragment selections with live merges.

### Scalar merge inputs inherited through an arm tail

A two-armed selection merge's inputs are matched to arms by
`incoming.blockId === trueBlockId/falseBlockId`; canonical IR records the CFG
predecessor there even when its value ref resolves to an upstream definition.
For accepted prebuilt IR where exactly one edge identity is unavailable, the
remaining input is assigned to the remaining arm by elimination — a two-armed
join has exactly two edges and the phi exactly two inputs. The referenced input
may still be inherited through an arm tail, which requires the scope handling
described below.

The inherited input frequently does not lexically dominate its arm-tail merge
assignment. That is safe for the two arms whose assignment is emitted *inside* a
branch body (the true arm, and the else arm of an if/else): a selection region
is acyclic, so on the path reaching the arm tail the value was already assigned
before the merge write, and `hoistEscapingValues` lifts its declaration to a
function-top `var` (the zero initializer is unobservable on paths that skip it).
The **no-else false input is excluded** from this relaxation — it pre-initializes
the merge `var` *before* the `if`, so it must genuinely dominate the header;
hoisting cannot rescue a value that may be unassigned on a path reaching the
pre-init. Inputs that neither dominate nor are hoistable (and undefined-register
inputs on the true edge) still fail closed. Browser-validated on avatar tattoo
picking selections whose merges inherit a true-arm value through an inner join.

### Source modifiers (`neg`/`abs`/`absneg`) → per-consumer-type lowering

DXBC source-modifier semantics depend on the consuming instruction's type, and
the supported cases lower according to that consumer:

- float consumers: IEEE negate/abs (`-(x)`, `abs(x)`, `-(abs(x))`);
- signed-integer consumers: `neg` is two's-complement negation (`-(x)` on
  `i32`);
- unsigned-integer consumers: `neg` is two's-complement negation, emitted as
  the wrapping `(0u - x)` (WGSL has no unary minus on `u32`);
- integer consumers: `abs`/`absneg` fail closed because the absolute modifier
  is defined only for floating-point instructions;
- bit-preserving movers (`mov`/`movc` with unknown or conflicting lane types):
  the modifier applies FLOAT semantics to the raw lane bits, and IEEE
  negate/abs/absneg are pure sign-bit operations, so they lower to
  `^ 0x80000000u` / `& 0x7fffffffu` / `| 0x80000000u` on the `u32` storage
  (with `bitcast` in/out for `i32`-stored lanes).

The ordinary WGSL float operators match finite non-zero inputs; signed-zero
and non-finite behavior inherits WGSL's floating-point latitude. The
bit-preserving mover path uses explicit sign-bit arithmetic.

Previously the modifier was applied as a type-blind `-(x)`/`abs(x)`, which was
invalid WGSL on `u32` lanes (caught by the browser gate) and a silent
miscompile on integer-stored mover lanes (two's-complement where the contract
is a sign-bit flip). The corpus-wide rebuild confirmed every previously
qualified package is byte-identical under the typed lowering: no already
qualified shader used the changed paths. Both stages; per-lane (mixed-type
`movc`) reads share the same storage-typed rules.

*Confirmed against vkd3d-shader:* `vsir_program_lower_modifiers` (ir.c) lowers
`NEG` as `data_type_is_integer(src) ? INEG : NEG` — integer vs float negate
dispatched on the operand's data type, the same per-consumer typing — with
`ABS` as float abs and `ABSNEG` as abs-then-neg. (vkd3d resolves the type before
lowering, so it has no separate bit-mover case; our sign-bit-on-raw-bits path is
the WGSL-specific equivalent for lanes whose type is still `bitpattern32`.)

When a `movc` writes lanes whose inferred storage types differ, both stages
emit one scalar `select` per lane instead of an unrepresentable mixed-type WGSL
vector. Each condition and value source is selected with that destination
lane's original swizzle, modifier, and storage reinterpretation. This path is
bounded to unsaturated temporary results and register, immediate, or constant-
buffer lane sources; other mixed mover shapes remain fail-closed. Condition
modifiers follow the `u32` consumer rules (two's-complement `neg`, with
`abs`/`absneg` rejected), while the two value operands retain the raw float-
data mover rules above.

### `continue`/`continuec` in loops → WGSL `continuing {}` latch

Loop phi-latch updates are emitted in a WGSL `continuing {}` block (which runs
on both fall-through and `continue` paths) instead of being appended to the loop
body. `continue` lowers to `continue;` and `continuec` to `if (cond) { continue;
}`. Behavior is unchanged for loops without `continue` (the continuing block
still runs the latch each iteration); it simply makes body `continue` correct
rather than skipping the latch. Both stages.

### Declared-but-unwritten location outputs → zero-filled (vertex only)

A **vertex** output signature may declare a `location` varying (COLOR/TEXCOORD)
that a given permutation never writes. D3D leaves such
lanes undefined; WGSL zero-initializes `var output`, so the unwritten lanes read
as 0 — a safe, valid choice. Completeness is still enforced for **builtin**
outputs (`SV_Position` must be fully written; zero is not a meaningful position).

The **fragment** stage does NOT relax this: an unwritten `SV_Target` lane still
fails closed (an undefined render-target lane is not a safe zero — it feeds
blending). Only the vertex `ret` completeness check was relaxed.

### Dead untyped temp writes → skipped

Compiler-emitted dead stores whose values nothing reads (and whose types are
therefore unresolvable) are dropped instead of failing the module.

### Terminal control flow → dead tail dropped

An `if`/`else` whose both arms return, or a `switch` with a default whose every
clause returns, terminates all paths; instructions after it (a trailing
unreachable `ret`, common after fully-branched Picking/depth outputs) are dead
and not lowered. Output-completeness is validated only on reachable `ret`s.

### `immediate_constant_buffer` (DXBC icb) → module `const` array

DXBC's inline constant table (`customdata`, dataClass 3) is emitted as a
module-scope `const icb = array<vec4<f32>, N>(vec4<f32>(...), ...)`. Finite
non-zero lanes use a shortest f32 decimal; non-finite lanes and negative zero
use `bitcast<f32>(0x..u)` so the exceptional or sign bit pattern is preserved.
WGSL does not fix the rounding direction for an inexact decimal-to-f32
conversion, so readable finite decimal emission is not a normative raw-bit
guarantee; guaranteed preservation would require raw-bit literals for every
lane. The same literal emitter is used for immutable indexable-temp tables.
`immediate_constant_buffer` operands lower as
`icb[<index>].<comp>` reusing the dynamic constant-buffer index machinery
(pure-relative and base+relative indices both supported), with int/uint
consumers bitcast exactly like uniform cbuffers. Out-of-bounds dynamic indices
are an adaptation: D3D constant/ICB reads return zero, while the emitted
unchecked WGSL array access has implementation-chosen out-of-bounds behavior;
qualified corpus shaders stay in range.

### Fixed-slot indexable temps → scalarized SSA locals

A declared width-four `indexable_temp` addressed as an exact
`x#[immediate-slot]` is treated as a bounded family of ordinary register
locals. The declaration must be unique, both index dimensions and the register
identity must be exact, the slot must be in range, and source selectors,
destination masks, and direct-IR SSA metadata must agree with the referenced
lanes. Each slot/lane then participates independently in the existing SSA,
masked-write, and structured merge machinery in both vertex and fragment
stages. No mutable WGSL array or dynamic array write is emitted.

Relative/dynamic addressing and narrower mutable declarations remain
fail-closed. Fixed reads of a register recognized as the immutable table shape
below are routed through that table rather than through mutable SSA. The
`cloud` and `cloudsimple` browser gates cover fixed-slot writes and reads with
zero WGSL warnings.

### Relative indexable temps → module `const` tables (immutable shape only)

An indexable temp (`x#`) accessed with relative addressing is recognized when
it is an immutable constant table: every write is a straight-line
pre-control-flow `mov x#[slot].mask, l(...)` immediate, all initializers precede
every read, one write mask is shared, every declared slot is fully written for
that mask, and reads select only written lanes. Operand roles (including
dual-destination instructions), register identities, index widths, modifiers,
and precision metadata are validated exactly. Initializer source
selection/swizzles are applied before storage, and scalar immediates replicate
across every written lane. Such registers lower exactly like the icb — a
module-scope
`const xt# = array<vec4<f32>, N>(...)` with reads through the shared dynamic
index machinery (`xt#[base + i32(index)].comp`) — so the dynamic read needs no
mutable-register SSA and inherits index-driven uniformity. This is the
compiler-generated shape for small lookup tables (e.g. the six quad-corner
UVs in `particles/gpu/quads`). Any other relative indexable-temp use —
mutable writes, non-immediate initializers, initializers under control flow,
partial slots — fails closed with a per-reason diagnostic. Out-of-bounds
dynamic indices retain WGSL's implementation-chosen array-access behavior
rather than D3D's out-of-bounds register semantics; no qualified corpus shader
indexes out of bounds.

### Component-packed varyings → one merged interface field per register

DXBC signature tables can emit several rows for a single interpolant register
when distinct semantics occupy different lanes (e.g. three `TEXCOORD`s packed
into `x`/`y`/`z` of output register 2, as in `starsprites`). Each row carries a
non-prefix mask (`y`-only, `z`-only) that would individually be rejected as a
gap in the WGSL location layout. Both stages now group signature rows by
`registerIndex`, union their masks, and emit ONE interface field per register
(validated prefix, single component type across the group). This is a
faithfulness fix, not a divergence — the merged field reproduces the register's
true lane occupancy.

### `linear_noperspective` varyings → `@interpolate(linear)` on both stages

DXBC `linear` interpolation is perspective-correct — the WGSL default — and
needs no attribute. DXBC `linear_noperspective` maps exactly to WGSL
`@interpolate(linear)` (center sampling on both sides). Because WebGPU
requires the vertex output and fragment input attributes at one location to
MATCH at pipeline creation, and DXBC declares interpolation only on the
fragment side (`dcl_input_ps`), the pass-global binding plan records the
non-default modes (`varyingInterpolation`) and the vertex module mirrors them
onto its paired outputs. Mixed modes on one packed register, centroid and
sample variants, and `constant` fail closed.

### Non-float `saturate` on movers → float clamp on the raw bits

D3D `saturate` assumes float data (like source modifiers). When a
bit-preserving `mov`/`movc` result's lanes resolve to integer storage, the
saturate lowers as `bitcast<T>(clamp(bitcast<f32-vec>(bits), 0.0, 1.0))` —
the direct WGSL float clamp on the raw lanes, keeping the storage type. Finite
values match the D3D clamp; non-finite inputs do not have portable
D3D-equivalent results in WGSL. Saturate on
genuinely integer arithmetic results still fails closed.

*Confirmed against vkd3d-shader:* `spirv_compiler_emit_sat` (spirv.c) is
`nclamp(x, 0.0, 1.0)` with float constants for floating-point data and a
`FIXME("Unhandled data type")` for non-float — saturate is a float clamp and
integer saturate is unhandled, matching "assumes float". Our bitcast-clamp on
`bitpattern32` mover lanes is the WGSL-specific handling for the float-data-in-
integer-storage case vkd3d left as a FIXME.

### `rcp` (both stages) → ordinary f32 division

DXBC `rcp` is a reduced-precision component-wise reciprocal; its maximum
relative error is 2^-21. It lowers to `1.0 / x`. For a finite, normal,
non-zero f32 with `abs(x)` in `[2^-126, 2^126]`, WGSL gives f32 division a
maximum error of 2.5 ULP, which satisfies that DXBC accuracy allowance.

The special-value contract is adapted. D3D specifies signed infinities for
signed-zero and subnormal inputs, signed zero for infinities, and NaN for NaN.
WGSL permits zero signs to be ignored and makes a runtime result that is
infinite or NaN indeterminate under its finite-math assumption. Exact behavior
for those inputs is therefore not portable. Finite normal denominators outside
the stated magnitude range can produce a subnormal reciprocal that D3D flushes
to signed zero but WGSL may preserve, so only the stated range has the claimed
accuracy match. Immediate operands are a fail-closed portability boundary:
each consumed lane whose raw f32 exponent is zero (signed zero or subnormal) or
255 (infinity or NaN) is rejected before modifiers and result saturation.
Unused immediate lanes are ignored, one-word immediates replicate normally,
and finite normal lanes remain accepted. Dynamic operands remain supported
with the signed-zero, subnormal, and non-finite caveats above. The same
signed-zero and non-finite caveats apply to the supported `div` opcode in both
stages.

*Confirmed against vkd3d-shader within the finite-normal scope above:* its
IR applies float source modifiers before `rcp` and destination saturation
afterward, while its SPIR-V backend emits floating division with a `1.0`
numerator using the active destination-mask/source-swizzle lanes. Scalar
immediates replicate across active lanes. Its tests also record D3D's
sign-sensitive zero/infinity results. This confirmation does not widen the
portable WGSL claim: signed zero, subnormal, infinity, NaN, overflow, and a
subnormal reciprocal retain the caveats above, and the GLSL/MSL backends do
not independently corroborate `rcp`.

### Vertex-stage texture sampling → explicit LOD/gradient only

The vertex binding restriction now admits texture and sampler bindings, and the
vertex stage lowers `sample_l` (`textureSampleLevel`) and `sample_d`
(`textureSampleGrad`). Implicit-LOD `sample`/`sample_b` stay fragment-only —
WGSL forbids implicit derivatives in a vertex entry point.

### Typed uint buffer UAVs + atomic operations → guarded storage atomics

A `dcl_unordered_access_view_typed` buffer with a uniform uint return type
lowers to `var<storage, read_write> uN: array<atomic<u32>>`. In fragment
programs, `atomic_iadd` becomes a bounds-guarded statement:
`if (i < arrayLength(&uN)) { atomicAdd(&uN[i], v); }`. The guard reproduces
D3D's defined behavior — out-of-bounds typed-UAV atomics are dropped — where
an unguarded WGSL access could target a live element or otherwise raise a
dynamic error. The result-returning form (`imm_atomic_iadd`), other atomic
opcodes, and non-uint or non-buffer UAV shapes fail closed. Vertex writable
storage remains outside the current portability contract. The bounded compute
profile below uses the same representation and `atomicStore` for ordinary
typed stores because WGSL requires every access to an atomic-typed element to
use an atomic builtin. The engine must bind either form as storage containing
raw 4-byte u32 words (`minBindingSize: 4`); the admitted typed-atomic contract
is one scalar word per element. No DXGI view-format conversion is reproduced.
*Confirmed against vkd3d-shader for operation shape and the
robustness-dependent OOB mechanism:* its backend emits the corresponding
atomic through a directly computed buffer/image pointer and inserts no
explicit bounds guard. A zero/drop result therefore depends on the applicable
target and runtime robustness guarantees; vkd3d-shader alone does not prove
that result for every target. This compiler independently implements D3D's
dropped-write result for the supported non-result atomic with an explicit
statement-level guard. A future result-returning OOB atomic must additionally
synthesize a zero old-value result.

### Exact compute admission and evidence

These are bounded whole-program profiles, not general compute support.
`lowerComputeProgram.js` selects dedicated families before its scalar fallback;
malformed members fail closed. The source validators own the literal declaration,
opcode, operand, modifier, extension, range, CFG, SSA and type schedules. A
matching path, workgroup size or declaration alone is insufficient. Shared checks
live in `validateExactComputeIr.js`; Emit additionally uses
`particleEmitSemanticDigest.js`. All owners below are under
[`src/resource/formats/webgpu/core/wgsl/`](../../../../../src/resource/formats/webgpu/core/wgsl/).

| Profile / lowerer | Emitted shader models | Workgroup | External storage interpretation |
|---|---|---|---|
| `setdrawparameters`, `setsortargs` — `lowerComputeProgram.js` | SM5.0 | 1×1×1 | Scalar i32 SRV; atomic-u32 UAV, 4 bytes per element |
| `system/raytracing/skinvertices` — `lowerSkinVerticesComputeProgram.js` | SM5.0; SM5.1 comparison-only | 64×1×1 | SRV strides 48/4; UAV stride 4; flat u32 words |
| `particles/gpu/sortstep` — `lowerSortStepComputeProgram.js` | SM5.0 / finite SM5.1 | 256×1×1 | Scalar-u32 SortParameters; two-word UAV records |
| `particles/gpu/sortinner` — `lowerSortInnerComputeProgram.js` | SM5.0 / finite SM5.1 | 256×1×1 | Same external storage; 512 two-word shared records |
| `particles/gpu/sort` — `lowerSortComputeProgram.js` | SM5.0 / finite SM5.1 | 256×1×1 | Same storage, different sorting and safety premises |
| `postprocess/mergehistograms` — `lowerMergeHistogramsComputeProgram.js` | SM5.0 / finite SM5.1 | 256×1×1 | Scalar-u32 SRV backing logical uint4 loads; atomic-u32 UAV |
| `postprocess/createhistograms` — `lowerCreateHistogramsComputeProgram.js` | SM5.0 / finite SM5.1 | 16×16×1 | Float Texture2D; atomic-u32 UAV backing uint4 stores |
| `particles/gpu/clear` — `lowerParticleClearComputePrograms.js` | SM5.0 / finite SM5.1 | Reset 1×1×1; initialize 16×16×1 | Effect-proven signed counter; dead/particle strides 4/32 |
| `particles/gpu/emit` — `lowerParticleEmitComputeProgram.js` | SM5.0; SM5.1 comparison-only | 16×16×1 | Self-proven signed counter; dead/particle strides 4/32 |

Finite SM5.1 support means validated canonical ranges/references, not unbounded
descriptor indexing. Trinity's compute stage type `2` and DXBC program type `5`
remain different enums. Browser qualification covers native modules, binding and
pipeline layouts, and compute pipelines—not dispatch or the public render-only
device API. Completed per-profile comparisons, zero-warning receipts and corpus
counts are retained in
[pushed history](https://github.com/carbonenginejs/runtime/blob/ede6c17c372c6582fa2a70f72a508e589945537c/docs/resource/formats/webgpu/reference/wgsl-compatibility.md#bounded-111-compute-programs--native-webgpu-compute-pipelines),
not presented as a new execution test. Paired Sort, histogram and Clear profiles
record byte-identical WGSL after their admitted normalization; this does not
extend to the comparison-only skinning or Emit inputs.

### Bounded 1×1×1 compute programs → native WebGPU compute pipelines

The straight-line scalar profile admits `ld`, low-half `imul`, `umax`, `iadd`,
`ushr`, `store_uav_typed` and `ret`. SRVs use `array<i32>`; UAVs use
`array<atomic<u32>>` and `atomicStore`. Each has `minBindingSize: 4`, with no
DXGI typed-view conversion. Scalar-x loads and replicated full-mask stores avoid
inferring a general typed-buffer width. Out-of-bounds loads clamp the eager
physical access and select zero; stores branch and drop the write.

### Bounded 64×1×1 structured skinning compute

`global_invocation_id.x` is already global: do not multiply it by the workgroup
size. The observed packed-index extraction is unsigned `ubfe` over eight-bit
fields. Flat u32 storage preserves matrix/input f32 bit patterns. Structured
loads use `arrayLength / strideWords`, clamp eager accesses and select zero for
an absent structure; each scalar store independently drops an absent word.
Offset-plus-swizzle beyond the declared stride is rejected.

SM5.1's unbounded space1/space2 ranges do not supply this fixed binding contract.
The recorded vkd3d-shader comparison supports global invocation mapping and
scalar-word flattening, but its direct accesses rely on target/runtime robustness.
Explicit WGSL zero/drop guards—not that comparison alone—preserve D3D OOB results.

### Bounded 256×1×1 two-word particle sort step

Workgroup-x and local-invocation-x form the source lane. Arithmetic wraps as u32;
integer `NEG` is two's-complement, not floating negation. Both record words move
together; the second is bitcast to f32 for `<`, preserving false comparisons
involving NaN. Finite SM5.1 `cb0[3]` normalizes to physical `cb3`.

`t0[3]` uses a clamped physical read with zero fallback. Its scalar-u32 view
(`minBindingSize: 4`) is established by SetSortArgs writing four separate words,
not inferred from the return tuple. `u0` has `minBindingSize: 8`: divide length
by two, clamp both eager loads, and return a complete zero record if absent.
Each store independently writes both words or drops the whole record.

### Bounded 256×1×1 shared-memory particle bitonic merge

SortInner uses the same external zero/drop contracts and exactly 4 KiB of shared
`array<u32, 1024>`. Do not clamp logical N to physical UAV length: robust zero
records may move into present slots. Flattened/local-x identifiers coincide only
because the admitted group is 256×1×1.

Its nine-stage compare/exchange network merges **bitonic input**, not arbitrary
input. Each stage partitions 512 records into disjoint pairs and swaps both words
when the high f32 key is lower; NaN retains the source's false result. A library
sort would be a different operation. A dedicated uniform signed stride and
immutable exit condition keep earlier varying register values out of barrier
control. The two sync sites require exactly
`threads_in_group | thread_group_shared_memory`; initialization plus nine stages
produce ten unconditional workgroup barriers.

**Shared-memory safety requires orchestration:** SetSortArgs completes first;
the same SortParameters range supports storage and indirect dispatch; its first
three words dispatch `D = ceil(max(N, 1) / 512)` groups; the fourth word is the
same N consumed as `t0[3]`. Valid x-dispatch requires `D <= 65535`, hence
`N <= 33,553,920 < 2^31`; under that bound the signed outer guard proves shared
records initialized before use. Outside it, the source can read uninitialized
TGSM (`N = 0x80000000`, group 1), and equivalence is not claimed. The runtime
does not dispatch compute yet: same-buffer usage, ordering and indirect dispatch
are integration obligations, not locally enforced facts.

### Exact 256×1×1 shared-memory particle chunk sort

Chunk Sort precedes the merge passes; its longer family is selected before
SortInner. The validated storage-dependent `if (N == 0) return` before barriers
is omitted: zero logical count causes no external load, shared read or store,
so letting every invocation reach the barriers gives the same result and makes
WGSL barrier participation uniform.

Dedicated uniform merge-width/stride state implements 45 compare/exchange stages
over up to 512 records. The initial barrier plus one per stage yields 46, including
zero-count dispatches; both sync sites require exactly
`threads_in_group | thread_group_shared_memory`. Each stage has disjoint pairs;
the first stride mirrors the high index and later strides use the merge partner.
Both words move together. Finite f32 keys sort ascending; equal keys, signed zero
and NaN keep the source comparison behavior, not a stronger total ordering.

Shared memory is exactly 4 KiB. The signed difference between N and wrapping
`workgroup_id.x * 512` is clamped to `[0, 512]`. All records below that count are
initialized before the first barrier; the guarded high pair member proves both
members below that count, and physical indices remain `[0, 511]`. Unlike SortInner,
shared-memory safety does not require a dispatch premise.

External t0 reads and complete two-word UAV records retain zero/drop behavior;
logical N is not clamped to physical length. **Global result coverage** still
requires the producer's same N in `t0[3]`, all chunk groups covering that range,
and the subsequent merge schedule. Memory safety alone does not prove the result.

### `float_16` minimum precision → full-precision f32

D3D minimum precision is a floor, not a format: an implementation that computes
`min16float` operands at full 32-bit precision is conforming, and the registers
are 32-bit regardless of the hint. Numeric/value operands tagged `float_16`
therefore lower as ordinary f32 lanes — the hint is dropped, which changes
nothing observable versus a conforming D3D driver running at full precision.
Resource, sampler, and UAV handles are not value lanes and require default
precision. The other operand minimum-precision kinds (`float_2_8`, `sint_16`,
`uint_16`) stay fail-closed until a shader needs them.

*Confirmed against vkd3d-shader:* its SPIR-V backend (`spirv.c`) never reads the
decoded `min_precision` field — arithmetic lowers at full 32-bit width, the same
promotion. I/O-signature precision is a separate field. This compiler ignores
it and emits the signature's base 32-bit component type, so valid 10/16-bit
float or integer minima are conformingly widened; reserved or unknown
signature-precision values are not yet rejected.

### Exact 256×1×1 atomic histogram merge

Shared storage is 64 atomic-u32 bins. Local lanes 0–63 initialize bins, all 256
lanes synchronize, active global invocations accumulate 16 uint4 records with
four atomic adds each, all lanes synchronize again, then lanes 0–63 atomically
add totals to u0. Both unconditional barriers require exactly
`threads_in_group | thread_group_shared_memory`; conditional or moved barriers
are rejected.

t0 is scalar u32 backing logical uint4 records at wrapping address
`(global_invocation_id.x << 6) >> 2`. All four words must exist or the load returns
four zeros; no eager access may escape the backing array. u0 is atomic-u32;
out-of-range bin atomics are dropped. Four-byte minimum bindings do not authorize
partial logical records.

For the intended result, cb0.x/y must be finite, non-negative, integer-valued f32
dimensions representable as u32 (`ftou` is qualified only there). Their low-u32
product defines the active invocation count. Dispatch covers it; t0 supplies 64
bins per active invocation; u0 supplies at least 64 elements, normally zeroed for
a fresh histogram. Undersized bindings remain memory-safe through zero/drop
guards but do not yield the complete intended histogram.

### Exact 16×16×1 atomic histogram creation

Separate SM5.0 and finite-SM5.1 validators feed one emitter. It hoists pure uniform
`ftou(cb0.z)` to match SM5.1; ScreenTilesX must be finite, non-negative,
integer-valued and u32-representable. The hoist affects neither branch/barrier
participation nor observable state on that domain; NaN/out-of-range conversion
is not qualified.

Ordered workgroup/local/global identifiers are preserved. The first 64 flattened
lanes initialize 64 shared atomic-u32 bins; all lanes synchronize; in-range pixels
increment bins; all synchronize again; the first 16 lanes load four bins each.
Both barriers require exactly `threads_in_group | thread_group_shared_memory`;
conditional, moved or differently flagged forms fail closed.

Mip-zero `resinfo_uint` becomes `textureDimensions(t0, 0)`. The source coordinate
test plus safe physical texture load/zero selection prevent eager OOB accesses.
RGB transfer, luminance dot product, logarithms/exponent, natural-log conversion
and `div_sat` retain source f32 order and exact constants. An additional
`0 <= bin && bin < 64` guard contains shared atomic accesses on adapted numeric
edges; D3D otherwise makes all TGSM undefined for an OOB shared atomic.

Each group emits 16 complete uint4 records at wrapping address
`((workgroup_id.y * ScreenTilesX + workgroup_id.x) << 4) + local_index`.
Atomic-word u0 checks `arrayLength / 4` before all four stores: partial/absent
records write nothing. This is MergeHistograms' 64-bin layout, not four separate
scalar-result contracts.

**Numeric domain:** MinLuminance/MaxLuminance are finite and strictly increasing;
normalization intermediates are finite. Every executed pixel path must produce
positive finite luminance, finite log_luminance and normalized_luminance before
multiply/ftoi, whose input is in `[0, 64]`. Zero/negative luminance, NaN, infinity,
overflow and invalid intermediates are excluded. Finite saturation uses clamp;
D3D's NaN-to-zero saturation remains the documented non-finite adaptation.

For a non-empty dispatch, ScreenTilesX must equal the x workgroup count **and**
output row stride; y covers the intended texture rows. A mismatch can alias
output records and is outside equivalence. u0 must contain the complete intended
output. Texture/UAV undersizing stays memory-safe, not result-complete.

### Exact two-pass particle clear with effect-proven signed counter

Admission requires exactly Main.pass0.compute and Main.pass1.compute as their
passes' only active stages. Reflection must identify pass0 u0 and pass1 u1 as the
same one-element ParticleCounters UAV, Carbon type 10, alongside stride-4
DeadBuffer u0 and stride-32 ParticleBuffer u2. Both IR programs must validate
before an opaque, program-identity-bound proof permits the reset pass's signed
R32_SINT store. A standalone reset declaration proves no view format: missing,
forged or differently decoded proofs fail closed. Selected-pass output still
preflights the whole resolved effect.

Reset emits `atomicStore(&u0[0u], 0i)` over atomic-i32 storage (minimum 4 bytes).
The same proof gates binding planning and lowering; this is not general signed
typed-store support. Initialization independently proves its signed view through
returned `imm_atomic_iadd`. Count is `bitcast<u32>(cb3[0].x)`; complete-block
indices retain `insertBits(local_invocation_index, block_index, 8u, 24u)`.

All 256 lanes cover complete blocks, then lane zero covers the remainder, visiting
`[0, count)` once. Each visit attempts both source-ordered ParticleBuffer stores
under a complete-record guard, increments the signed counter, bitcasts its old
value to the dead-list u32 index, then independently guards the DeadBuffer store.
Short particle/dead buffers never suppress another operation. No barrier is added.

Dispatch one reset group, make its reset complete/visible, then exactly one
initialization group with no concurrent counter users and count complete records
in both structured buffers. Extra reset groups repeat zero stores; extra initialize
groups append duplicate traversals. Consumers wait for completion; counts must
fit the watchdog budget. Undersized stores are safe, but the counter still reaches
count, not the number of successful writes.

The effect-level matrix admits both normalized paired passes; the standalone
matrix rejects reset while emitting initialization independently. The engine's
fail-closed validator must reconcile both bodies, stage digests, occurrence counts,
per-key coverage, reset WGSL and signed layout before admitting contextual reset.

### Exact 16×16×1 shared-memory particle emit

Admission combines the exact declaration family (including 4096 vec4 cb3 rows
and 112-byte raw TGSM) with a browser-safe SHA-256 digest of the complete normalized
program. The digest rejects aliases, sparse arrays, accessors, prototypes and
unknown semantic fields; recorded node:crypto vector comparisons test hashing,
not shader execution. Recognized SM5.1 still fails comparison-only.

Lane zero initializes TGSM before a uniform barrier. Returned signed
`atomicAdd(u1[0u], -1i)` remains before its `old - 1` signed success test.
DeadBuffer and cbuffer reads clamp physical accesses and select zero when absent;
TGSM stays inside initialized words; the final particle write requires a complete
eight-word record. Source mapping omits only structural closure instructions.

`particleEmitSignedAtomicLayoutPolicy` owns both candidacy and signed layout:
declaration plus digest is the proof consumed by binding planning and lowering,
not a general identity whitelist. Only the fixture generator may regenerate
trusted admission constants from audited effect bytes; effect and internal DXBC
SHA-256 checks reject other input.

Optional `CJS_PARTICLE_EMIT_DX11_EFFECT` / `CJS_PARTICLE_EMIT_DX12_EFFECT`
fixtures enable the genuine paired test: DX11 Main.pass0 is ready, DX12 remains
comparison-only. Historical zero-skip/native-pipeline results require both inputs;
they are not an unconditional local-suite or dispatch result.

### The exact compute-profile set is complete and frozen

The emit profile completes the audited GPU particle pipeline
(`setdrawparameters`, `setsortargs`, `sortstep`, `sort`, `sortinner`,
`createhistograms`, `mergehistograms`, `clear`, `emit`) alongside structured
skinning. No further package-specific exact compute profiles should be added:
remaining or future compute coverage (for example `particles/gpu/update` or
`computelightlists`) must instead extend the general typed IR path with
reusable thread-group memory, barrier, atomic, and loop lowering, retiring
profile-by-profile growth. Exact profiles remain pinned to their audited
bytecode, so any game-build shader recompile demotes the affected package to
unsupported until it is re-audited — a corpus rebuild after a build bump is
the standing re-qualification gate.

### Fail-closed intentional nontermination: `system/crash`

`system/crash` is not a bounded compute candidate. Without the required
sentinel its loop deliberately traverses all `2^32` indices and never
terminates; adding an iteration cap would change observable semantics.
Multiple workgroups also race rather than preserving the intended
exactly-one-group behavior. Because the package proves neither the sentinel
nor the exact-one-group runtime contract, the shader remains permanently
fail-closed.

### Resource handles → fixed, unmodified identities

Every supported resource, sampler, or UAV role requires the declared handle
type, default minimum precision, no source modifier, and a fixed descriptor
identity within the admitted singleton binding range. Relative identities fail
closed before binding lookup; a present fixed absolute identity is checked
against the resolved singleton binding. Legal resource-result swizzles remain
supported. *Confirmed against vkd3d-shader:* its register and descriptor
validation likewise restricts modifier types and verifies descriptor indices
against their declared ranges. This compiler is stricter about relative member
indices because its binding layout deliberately supports singleton ranges only.

### Typed `Buffer` SRVs require bound-view metadata

A render-stage `dcl_resource` with dimension `buffer` declares the component
class returned by `ld`, but it does not encode the width or conversion rules of
the bound DXGI view. The same uniform uint declaration can be paired with an
`R32_UINT` view or an `R32G32B32A32_UINT` view; lowering both to one WGSL
storage-array element type changes indexing for at least one valid binding.

Render typed-buffer SRVs therefore fail closed until trusted bound-view format
metadata is part of the binding policy, manifest, and compatibility
fingerprint. A future lowering must derive the physical WGSL element type,
element stride, D3D missing-channel values, format conversion, and
`minBindingSize` from that metadata rather than from the declaration return
token. The bounded compute profiles described above use separately validated
scalar-word contracts and are not widened by this restriction.

## Not supported (fail closed)

- **Globally non-refactorable shaders** (`dcl_global_flags` without
  `REFACTORING_ALLOWED`) — every operation would be precise; see the Adapted
  entry for why per-op precise is representable but this is not.
- **DX12 bindless sampled-resource ranges** (`space1` arrays/unbounded
  ranges) — comparison-only limitation under the current DX11 translation target
  (DX11 is the target; DX12 exists to confirm equal results). Needs its own
  audited design if it ever becomes target work.
- **`imul`/`umul` high-half results** — WGSL has no 32×32→64 multiply
  builtin; only the low-half destination is supported.
- **Dynamic constant-buffer register selection** (`cbX[dynamic][…]` selecting
  the *buffer*) — only the vector index may be dynamic.
- **Non-immediate mip levels in `resinfo`**; texture `ld` accepts a dynamic
  address/mip but remains bounded to the resource shapes listed below.
- **Unknown texture dimensions** (`texturecubearray`, MSAA kinds, …) in
  sampled layouts.
- **Render typed `Buffer` SRVs without explicit bound-view format metadata** —
  the DXBC declaration identifies a return component class but not whether the
  runtime view is scalar, vector, normalized, integer, or floating point.
- **Immediate texture offsets** (`sample_controls` / `_aoffimmi`) outside the
  bounded 2D sample family below. In particular, offset texture `ld` and
  non-2D sampling fail closed.
- **Mutable relative `indexable_temp` registers** (fixed, declared, bounded
  width-four slots are scalarized as described above; any relative shape outside
  the immutable constant-table form still fails closed), and subroutine control flow
  (`call`/`callc`/`label`/`interface_call`) — front-end rejections.
- **Geometry, hull, and domain stage kinds, plus compute programs outside the
  bounded profile above** — WGSL has no geometry/hull/domain stage. General
  compute resource shapes, thread-group sizes, builtins, control flow, and
  instruction families are not yet lowered. These fail closed per stage kind
  or bounded-profile reason instead of being misreported as malformed records.
- **Sampler modes other than `default`**, fragment input interpolation modes
  other than `linear` and `linear_noperspective`, minimum-precision operand
  kinds other than `float_16` (which promotes; see Adapted), and vertex system semantics
  outside `SV_Position`/`SV_VertexID`/`SV_InstanceID` (fragment:
  `SV_Position`/`SV_IsFrontFace`, output `SV_Target`).

## Supported mappings

### `sample_d` gradient sampling and integer/rounding opcodes

`sample_d` lowers to `textureSampleGrad(t, s, coord, ddx, ddy)` (2/3-component
spatial gradients by dimension). A 2D-array address consumes three source
lanes (xy coordinate plus array layer) but its gradients consume only xy;
3D/cube addresses and gradients consume xyz. Added `imax/imin/umax/umin` (WGSL overloaded
`max`/`min`), `ishl`/`ishr` (`<< u32(...)` / `>> u32(...)` — DXBC shift counts
cast to the WGSL-required u32), `ineg` (signed negation), `round_ne`
(`round`, ties to even), `round_pi` (`ceil`), and the previously handler-only
`ult`/`uge` to the applicable stage support sets.

### 2D-array sample layers → round-to-nearest-even

DXBC sampling rounds a floating Texture2DArray layer coordinate to the nearest
integer with ties to even, then clamps it to the available layer range. The
layer argument therefore lowers as `i32(round(layer))`; WGSL `round` has the
same tie rule and WGSL sampling clamps the resulting array index. The spatial
xy coordinate stays separate from that layer argument in every supported
sample form and in both stages.

## Bounded / temporary

- **Carbon Detail maps → one physical 2D-array texture (fragment stage).**
  The late resource-transform planner recognizes exactly two logical
  `Detail1Map`/`Detail2Map` inputs or exactly three consecutive
  `Detail1Map`/`Detail2Map`/`Detail3Map` inputs. Each must be a scalar,
  non-sRGB, float4 Texture2D in the same register space, and every shader use
  must be an unmodified, fixed-register `sample_b` using the same sampler and
  bias operand. Relative/non-uniform handles, sample offsets, other opcodes,
  incompatible metadata, incomplete names, missing samples, or ambiguous
  bindings reject the transform.

  Source IR and semantic names are unchanged. Physical recipe encoding, ordered
  layers, pass-scoped binding removal and missing-layer rejection belong to the
  [version-3 wire contract](../formats/carbon-webgpu.md#version-3-resource-transforms);
  the [device API](../../../../trinityal/webgpu/reference/api.md#device-boundary)
  owns caller-supplied compatible layer assembly.

  Recorded High (.sm_depth) and Medium (.sm_hi) exhaustive matrices cover
  unpackedskinned_quaddetailv5 and unpackedskinned_quadheatdetailv5. The
  representative body 4 is non-bindless, PPT-on, unclipped, opaque and debug-off
  (overlay blend for Detail): three layers reduce 17 source textures to 15
  physical textures; HeatDetail's two layers reduce 17 to 16. Paired DX12
  bindless bodies remain comparison-only. The pinned history above retains
  body counts and zero-warning module/corpus receipts.

  This resolves the compiler-side sampled-texture limit, not rendering in
  general. [Consumer evidence](#consumer-boundary-resource-transforms) qualifies
  particular Detail/HeatDetail draws; **Environment remains unverified**.
- **Immediate 2D sample offsets** — `sample`, `sample_b`, `sample_d`, and
  `sample_l` lower their signed `_aoffimmi(u,v,w)` record to WGSL's final
  constant `vec2<i32>(u, v)` sampling argument. Both APIs apply that
  texel-space offset before sampler address modes, and both require components
  in `[-8, 7]`. D3D ignores `w` for a Texture2D, so only `u` and `v` are
  emitted. Fragment supports all four opcodes; vertex supports the
  explicit-gradient/LOD pair already legal there. Duplicate or malformed
  records, offsets on other opcodes, and non-2D resource shapes fail closed.
  *Confirmed against vkd3d-shader:* its IR preserves the signed immediate
  offset on sample instructions, and its SPIR-V, GLSL, and MSL backends pass
  those constants through as the target sampling operation's constant offset.
- **`resinfo` (fragment stage)** — 2D and 3D textures, scalar immediate mip, components x/y
  (dimensions), z (depth, 3D only), and w (`textureNumLevels`); z rejected
  for 2D. A non-zero mip is queried through an in-range clamped level and its
  dimensions are selected to zero when the requested level is out of range,
  reproducing D3D instead of exposing WGSL's indeterminate out-of-range
  `textureDimensions` result. `_rcpFloat` reciprocates only dimensions, never
  the mip count; its specified infinity for zero dimensions shares the
  non-finite WGSL limitation documented for `rcp` above. Unknown return-type
  encodings fail closed. Ordinary float saturation is valid in D3D but
  currently unsupported here; saturation on the uint return mode is invalid
  because saturation requires a floating-point destination. D3D's zero result
  for an unbound resource is outside
  this shader mapping: WebGPU requires every declared binding, and the engine
  rejects a missing caller resource. A fallback texture cannot reproduce the
  exact result because WebGPU textures cannot have zero dimensions (and
  `_rcpFloat` requires infinity for applicable zero dimensions); exact
  emulation would need explicit bound-state metadata and a selected result.
  Widen per dimension when a shader needs it.
  *Confirmed against vkd3d-shader:* `spirv_compiler_emit_resinfo` (spirv.c)
  emits image-size and mip-level-count queries, pads missing dimension
  components with zero, applies the resource swizzle, and converts the uint
  vector to float for the ordinary float form. It also accepts ordinary float
  saturation after forming that result. It explicitly rejects
  `VKD3DSI_RESINFO_RCP_FLOAT`; that form here follows the D3D contract
  independently. vkd3d also issues the size query directly, so our explicit
  clamped-query/zero-select is the WGSL-specific guard needed to preserve
  D3D's defined out-of-range result.
- **`ld`** — 2D textures (fragment only; original address lanes xy=texel and
  w=mip, packed into a three-lane u32 WGSL address). Typed-buffer loads are
  admitted only by bounded compute profiles with a separately validated
  scalar-word contract.
  Texture coordinates and mip are clamped to a valid texel for the eagerly
  evaluated `textureLoad`, then the result is selected to zero unless the
  original address was fully in range. This excludes WGSL's otherwise
  permitted live in-bounds texel result for an invalid logical texel address.
  The zero vector is exact under the current engine contract that these
  bindings use four-component views (`rgba8unorm` or `rgba8unorm-srgb` today).
  A future one- or two-component view would require view-channel metadata so
  the explicit out-of-bounds replacement can reproduce D3D's missing-component
  defaults (normally alpha one).
- **`ld_structured`** — fixed immediate DWORD byte offsets, one scalar
  address, fixed (non-relative) resource operands. Every word fetch is clamped
  to valid storage-buffer memory and selected to zero when the structure index
  is outside `arrayLength / stride`. Offset-plus-swizzle accesses beyond the
  declared stride fail closed, so D3D's undefined byte-offset-overrun case is
  never emitted.
  *Confirmed against vkd3d-shader for address formation and the
  robustness-dependent OOB mechanism:* its texture `ld` takes coordinates from
  the resource-dimensional coordinate mask and LOD separately from source lane
  `w`; texture and raw/structured buffer loads then use direct backend accesses
  with no compiler-inserted bounds guard. A zero result therefore depends on
  the applicable target and runtime robustness guarantees (buffer robustness
  must not be generalized to every image access), and vkd3d-shader alone does
  not prove exact zero on every target. The explicit WGSL clamps and logical
  in-range selects above independently implement D3D's zero result without
  executing an invalid logical access.
- **`f16tof32`/`f32tof16`** — per-lane `unpack2x16float`/`pack2x16float`.
  `f16tof32` is exact for finite normal inputs, but WGSL may flush binary16
  subnormals and ignore zero sign. `f32tof16` keeps only the low 16 result bits
  and is exact for finite non-zero inputs representable as normal binary16.
  Subnormal and zero-sign behavior shares the preceding caveat. For other
  finite normal-range values D3D requires round-toward-zero while WGSL does not
  fix a rounding direction; on finite overflow D3D yields signed max-f16 while
  WGSL permits an indeterminate result. Those inputs are an adapted boundary.
- **`udiv` (both stages)** — quotient and remainder lower to WGSL `u32`
  division and remainder. Immediate divisors whose lanes are all non-zero keep
  the direct byte-stable `/` or `%` form. Dynamic or possibly-zero divisors use
  `select(0xffffffffu, a / max(b, 1u), b != 0u)` (and the corresponding `%`
  form); clamping the eagerly evaluated operation is necessary because WGSL
  evaluates both `select` alternatives. Both destinations may be written by
  one instruction when their masks match; mismatched live masks fail closed.
  A `null` destination does not contribute active source lanes. That shared
  multi-destination rule also applies to partial-mask `sincos` source lanes.
  *Confirmed against vkd3d-shader:* its
  `vsir_program_lower_udiv` comments that "division by zero is well-defined for
  … UDIV, and returns UINT_MAX", and it emits a `MOVC` selecting `0xffffffff`
  for both quotient and remainder when the divisor is zero — the same semantic
  reproduced by the eager-safe WGSL guard.
- **Loop merges** — scalar header phis with exactly one entry and one
  backedge incoming. The entry and backedge use their actual reaching
  references, including an inherited preheader value. Multi-exit loops resolve
  and validate one assignment for every live scalar exit phi at every reachable
  `break` edge.
- **Loop-exit (break-join) and header-backedge merges — cross-plan reaching
  values.** A loop exited only through `break` edges yields phis at the after-
  `endloop` join; a header phi likewise takes a value back along the latch edge.
  In both cases the per-edge value is resolved by `reachingRef` — a walk up the
  dominator chain from the edge's predecessor to the nearest block whose
  `outputValues` actually define the register. This is necessary because a break
  predecessor (or latch block) commonly only *inherits* the register: it has no
  matching entry in its own `outputValues`, while the canonical phi incoming
  retains the predecessor `blockId` but may reference an upstream definition.
  The resolved value is accepted when it is (a) an instruction result / program
  input that dominates the edge; (b) this loop's own header phi (a `var` before
  the loop / a no-op
  self-latch); or (c) any other **live** merge phi — an enclosing selection/
  switch/loop plan declares it as a `var` and `hoistEscapingValues` lifts that
  declaration to function scope, so the cross-plan read resolves. A non-live phi
  is never declared and fails closed.
- **Switch merges** — break-terminated clauses; at most ONE pass-through
  incoming (a clause that keeps the prior value); a shared-join planner exists
  for `if { switch } endif` joins.
- **Selection merges** — scalar phis; two-armed regions identify arm tails by
  edge kind; guaranteed-output tracking intersects arms.
- **Observable undefined merge paths** — validation follows the exact
  references emitted by ordinary selections, switch clauses, shared
  `if { switch }` joins, loop header entry/backedge assignments, and loop-exit
  break assignments. Correlation keys include both SSA value identity and
  component, so two lanes written by one vector comparison are not conflated.
  Conditions are preserved through acyclic selection paths but cleared across
  loop backedges/exits, where they may change between iterations. Switch
  selector correlations are not modeled. Direct instruction uses fail closed
  except for one lane-exact rule: an undefined carrier consumed by raw bitwise
  `and` is safe when the sibling lane is the exact SSA condition proven zero on
  that path (`0 & unknown` is deterministically zero). The proof is repeated
  independently for every use and lane, requires the canonical unmodified
  default-precision `and` shape, and is cleared across loop boundaries; other
  operations, sibling identities, components, modifiers, index reads, and
  additional uses remain unsupported.
- **`gather4`** — front-end lanes reserved, WGSL emission not yet built.

Unless a mapping states otherwise, ordinary WGSL floating-point operations
inherit WGSL's permitted rounding, denormal, and zero-sign behavior plus its
finite-math assumption. D3D's prescribed NaN/infinity tables are therefore not
portable on those edge inputs.

## Adapted — numeric conversion edges

`ftoi`/`ftou` lower to WGSL `i32(x)`/`u32(x)`. Finite inputs within the target
integer range match D3D's truncation toward zero. NaN and positive overflow do
not: D3D specifies zero for NaN and the full integer maximum for overflow,
whereas WGSL makes the NaN conversion indeterminate and clamps positive
overflow to the largest target integer exactly representable by f32
(`2147483520` for i32 and `4294967040` for u32). These inputs are an adapted
boundary.

## Adapted — uniformity

### Derivatives / implicit-LOD samples in non-uniform control flow → `diagnostic(off, derivative_uniformity)`

WGSL forbids screen-space derivatives — the `dpdx*`/`dpdy*` family and the
implicit-LOD samples that derive internally (`textureSample` /
`textureSampleBias`) — inside **non-uniform** control flow (a branch whose
condition can differ between the pixels of a 2x2 quad), because the derivative
compares neighbor pixels that may not all be present.
`src/resource/formats/webgpu/core/wgsl/uniformity.js` tags each SSA value uniform or
varying; when the fragment lowerer finds one of these operations under a
varying-conditioned branch it records `requiresDerivativeUniformityOptOut` on
the program, and `emitWgsl` prepends the module-level filter
`diagnostic(off, derivative_uniformity);` (a standard WGSL opt-out that
Dawn/Tint and Naga both honor — browser-gate confirmed) rather than rejecting
the shader.

Why the directive and not gradient hoisting: the DXBC came from HLSL that relied
on **D3D11's permissive divergent-derivative behavior** (non-participating quad
lanes yield undefined derivatives). The directive keeps the operation at its
original source-level control-flow point; both APIs leave the divergent result
nonportable or undefined, and WGSL does not guarantee a particular hardware
evaluation strategy. Converting to `textureSampleGrad` with a gradient computed in
uniform control flow (hoisting) would substitute a *different* gradient than the
one D3D11 used, i.e. be less faithful. The directive is emitted only when the
analysis actually detects a non-uniform derivative/sample, and it is visible in
the WGSL (with an explanatory comment) plus flagged on the typed program, so the
reliance on the opt-out is never silent.

Soundness of the trigger: constant-buffer and immediate operands are not SSA
values. Varying seeds are interpolated fragment inputs (`input[N]`, including
`SV_Position`) and, conservatively, all texture sampling/loading and derivative
results. This avoids known false negatives but may add the opt-out for a branch
whose producer happens to be dynamically uniform; that only broadens where the
diagnostic is disabled.

Loop-exit uniformity **is** modelled: `loopHasNonUniformExit` flags a loop whose
exit is non-uniform — a `breakc`/`continuec` with a varying condition, or an
unconditional `break`/`continue` guarded by a varying `if`/`switch` (nested loops
skipped, as their breaks belong to the inner loop). Per the WGSL uniformity rules
such a break taints both the loop body **and every statement after the loop** (the
break edges carry non-uniformity to the merge), so the lowerer folds it into a
running per-range flow flag: a requires-uniform op inside or below such a loop
picks up the opt-out directive. This is what qualifies `system/shadowdepth`,
whose top-level `textureSample` follows a loop with a varying-guarded `break` —
top-level in the emitted WGSL, but non-uniform per the spec, and rejected by Dawn
without the directive.

Representative implicit-LOD and derivative cases are browser-gated with the
directive enabled, while uniform control-flow cases verify that the directive
is not emitted unnecessarily.

## Selected-effect package provenance

The 0.4.2–0.5.0 checkpoints describe the retired flat-chunk wire, not current
reader APIs. Their provenance, reflection reconstruction, byte-identity, corpus
and browser receipts remain in [pinned history](https://github.com/carbonenginejs/runtime/blob/1e7f6d83684d37d6f39615beb7ab18d8c9f072cb/docs/resource/formats/webgpu/reference/wgsl-compatibility.md#selected-effect-package-provenance).
They are historical evidence, not a fresh qualification of this compiler.

Current bytes use Carbon v15 records with derived compatibility views; the
former INFO/PGRF/RFLX/RBLB apparatus and reflection accessor were removed.
See [the wire owner](../formats/carbon-webgpu.md#no-stored-chunks), not those
retired schemas, for integration.

The ownership statement recorded at the 0.5.0 checkpoint is retained:
The `resource` layer owns `Tr2EffectRes` selection, canonical
`Tr2Shader` construction, and the per-index cache; renderer-owned handles
remain an engine concern.

The same history retains the build-3444265 source-header audit and the
format-hlsl 0.1.8 zero-count bindless-range prerequisite. Those DX12 comparisons
did not qualify unbounded ranges for backend execution. Current bindless
limitations remain under [Not supported](#not-supported-fail-closed).
All-body translation and runtime completeness are separate gates below.

## All-body backend packaging

The [all-mode contract](../formats/carbon-webgpu.md#all-mode) owns the
selection-first gate, later unsupported-body representation and pass-scoped
translation/deduplication rules. Selected mode remains the default.
Later unsupported bodies degrade coverage to `partial`.
The wire has no WGSB document or unit table: `backendBodySet` is a derived view.

Translating every body is deliberately **not** treated as backend completeness.
`backendComplete` and `runtimeComplete` remain false, matching the sibling
WebGL package. The engine now realizes the documented layouts and
`texture-2d-array` transforms and has exact draw evidence for representative
Detail and HeatDetail families. That proof does not cover every required
translated program, layout, and transform, and complete resource hydration and
selection also remain open. The `BuildEffect` result carries the
translated-body scope in `info.backendBodyCoverage`; the bytes express it
structurally through which bodies carry programs.

The [retired WGSB receipt](https://github.com/carbonenginejs/runtime/blob/1e7f6d83684d37d6f39615beb7ab18d8c9f072cb/docs/resource/formats/webgpu/reference/wgsl-compatibility.md#all-body-backend-packaging)
records every-permutation joins, selected-mode byte stability, the all-body
corpus sweep and 202 newly exposed modules compiled with zero WGSL warnings.
It is compiler/module evidence, not a prepared-pipeline or rendered claim.

Two defects in the first implementation were found only by building the whole
corpus in all-body mode, not by the package suite: stage selection outside the
per-body guard turned one geometry-stage body into a whole-package failure, and
the all-body path initially omitted the particle-clear effect-profile
preflight. The synthetic fixtures cannot express either condition, so an
all-body corpus sweep is part of this feature's verification, not an optional
extra.

## Consumer boundary: resource transforms

The [version-3 contract](../formats/carbon-webgpu.md#version-3-resource-transforms)
owns supported recipes and record/layout validation; the
[device API](../../../../trinityal/webgpu/reference/api.md#device-boundary)
owns caller-supplied layer assembly. Unsupported fields fail with a diagnostic
naming the field. Validation rejects undeclared transforms, orphan layer-count
claims, and surviving bindings for merged-away inputs.

Discriminate by **feature**, not document version or `texture.viewDimension`:

- **Source-declared** arrays retain their bindings and need no assembly. The
  selected Quad V5 body binds `texture_2d_array<f32>` without a transform;
  both Quad families also carry `cube` bindings.
- **Transformed** bindings carry `transformId` and `arrayLayerCount`; their
  merged-away inputs are absent. Supply the assembled layers, not one source.

### The analysis is pre-transform; the layout is post-transform

Reflection retains each declared register, including merged-away inputs;
physical layout omits those inputs. Comparing them as identical would report
the intended merge as drift. The contract requires the array to reuse layer
zero's slot, preserve declared input order, and reject missing or incompatible
layers.

Realized and drawn, all with zero WGSL warnings:

| Family | Layers | Merged into | Evidence |
| --- | --- | --- | --- |
| `unpackedskinned_quadheatdetailv5` | 2 | `Detail1Map` slot | 22 over 22 bindings, 3 cases, detail changed 570/635 covered pixels |
| `unpacked_quaddetailv5` | 3 | `Detail1Map` slot | both detail controls changed 1116/1116 covered pixels |
| `unpackedskinned_quaddetailv5` | 3 | `Detail1Map` slot | 634/635 and 635/635, indexed non-identity bones observed |

`Detail1` and `Detail2` delta maps were **distinct** in every case: collapsed
or misordered assembly could render and validate but produce identical deltas.

Source-declared arrays are also realized: a synthetic two-layer draw checks
each layer's pixels exactly through the same adapter. A single-layer
`2d-array` view remains distinct from plain 2D; a layout requesting a dimension
other than the view's fixed creation dimension fails closed. High `.sm_depth`
Quad V5 `Main` binds `LightProfileArray` without a transform, so this support
is a prerequisite for High-tier draw gates.

The Detail and HeatDetail gates exercise layer assembly under this contract;
**Environment remains unverified**.

Version 3 exposed three checks incorrectly gated by `=== 2`: shared identities
must span at least two stages, and explicit D3D and scope identities are both
required. Otherwise version 3 would silently acquire version-1 semantics. Exact
DX11/DX12 draw comparison would miss that regression because both would downgrade
identically.

## Verification contract

Every shader-emission, layout, or transform compatibility change requires the
package suite and a representative `trinityal/webgpu` browser gate on a real
WebGPU device with zero WGSL warnings. Format-level qualification cannot detect
every WGSL scoping or validator failure, so browser validation remains part of
the compiler contract. A reviewed record-layout or derived-view-only change
may omit a new browser run when corpus comparison proves unchanged
status/errors and byte-identical runtime-consumed programs/backend blocks, and
downstream reader tolerance is separately confirmed.

The browser gate proves the emitted WGSL is *valid and runs*; it does not by
itself prove the translation is *semantically equivalent to D3D*. Semantic
decisions (out-of-bounds behavior, source-modifier typing, minimum-precision,
division-by-zero, atomics) are therefore taken from the Direct3D 11 functional
specification and independently cross-referenced against
[vkd3d-shader](https://gitlab.winehq.org/wine/vkd3d), Wine's DXBC→SPIR-V/GLSL
translator, which is the closest independent implementation of the same
input. vkd3d is used strictly as a **behavioral reference for verification** —
no code is derived from it; this compiler is implemented independently from the
D3D specification. (The reference checkout is kept quarantined outside every
package, never bundled or published.)
