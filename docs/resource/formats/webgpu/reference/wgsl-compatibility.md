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
zero WGSL warnings. The full corpus transition moved from 502 qualified / 35
unsupported / 0 failed to 504 / 33 / 0: exactly those two packages became
qualified, and SHA-256 comparison confirmed all 502 previously qualified
package bytes remained identical.

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

### Bounded 1×1×1 compute programs → native WebGPU compute pipelines

Compute lowering is admitted only for an exact, whole-program-validated SM5.0
structural profile currently exercised by `particles/gpu/setdrawparameters` and
`particles/gpu/setsortargs`. It requires canonical global/SRV/UAV/temp/thread-
group declarations, one temporary register, `dcl_thread_group 1,1,1`, one
reachable straight-line block ending in `ret`, and exactly one typed scalar
sint buffer SRV plus one typed scalar uint buffer UAV. The supported body
opcodes are `ld`, low-half `imul`, `umax`, `iadd`, `ushr`,
`store_uav_typed`, and `ret`; every operand, selector, immediate, binding,
type-flow fact, and SSA edge is revalidated before emission.

The SRV is exposed as `var<storage, read> tN: array<i32>` and an out-of-bounds
`ld` returns zero through a clamped load plus `select`. The UAV is
`var<storage, read_write> uN: array<atomic<u32>>`; an in-range typed store
uses `atomicStore`, while an out-of-bounds store is dropped by an explicit
branch. These scalar-word layouts deliberately do not reproduce DXGI typed-view
conversion, so the engine binding contract is one raw 4-byte word per element.
Restricting the profile to scalar `x` loads and replicated full-mask stores
also avoids guessing the width of a general DXBC typed-buffer view.

The package carries the declared thread-group size as `[1, 1, 1]`. Trinity
effect metadata identifies compute as stage type `2`, while the decoded DXBC
program type remains `5`; these two enums are intentionally kept separate.
The browser gate creates and validates native shader modules, compute bind-group
layouts, pipeline layouts, and compute pipelines. It does not dispatch work or
expand the public render-only device API.

The full corpus transition moved from 504 qualified / 33 unsupported / 0
failed to 506 / 31 / 0: exactly the two programs named above became qualified,
and SHA-256 comparison confirmed all 504 previously qualified package bytes
remained identical.

### Bounded 64×1×1 structured skinning compute

A second, separate SM5.0 compute profile is currently exercised by
`system/raytracing/skinvertices`. Profile selection is structural rather than
path- or byte-hash-based, and malformed members of the selected declaration
family fail there instead of falling through to the scalar-word profile. The
declaration envelope is exactly one immediate `cb3` with three vec4 rows,
structured SRVs `t0`/`t1` with 48-/4-byte strides, one non-coherent structured
UAV `u0` with a 4-byte stride, `input_thread_id.x`, ten temporary registers,
and `dcl_thread_group 64,1,1`. Its bounded body has two nested selections and
no loops, barriers, atomics, textures, or samplers. CFG, SSA, scalar types,
bitcasts, live merges, operands, and resource identities are replayed and
compared before emission.

`input_thread_id.x` maps to
`@builtin(global_invocation_id) dispatch_thread_id: vec3<u32>` and uses only
the x component; the workgroup size is not multiplied into that already-global
identifier. The supported packed-index path treats `ubfe` as unsigned and
extracts only its observed eight-bit fields. Matrix rows and input words use
flat `array<u32>` storage so typeless f32/u32 bits survive unchanged.
Structured loads compute `arrayLength / strideWords`, clamp the eagerly
evaluated physical word access, and select zero for an out-of-range structure
index. Each scalar structured store has its own
`address < arrayLength(&u0)` branch and is dropped when out of range.
Offset-plus-swizzle accesses beyond a declared stride fail closed.

The DX12 SM5.1 comparison shader remains comparison-only: its unbounded
space1/space2 descriptor ranges do not provide the fixed WebGPU binding
contract used by the DX11 profile. The native browser gate validates the
64×1×1 module, four-entry compute bind-group layout, pipeline layout, and
compute pipeline without widening the public render-only device API or
dispatching work.

*Checked against vkd3d-shader:* its compute builtin maps to the global
invocation identifier, its raw/structured buffers flatten to scalar words, and
its structured loads/stores use direct backend accesses. Its Vulkan path
relies on runtime robustness for physical out-of-bounds behavior; the explicit
WGSL load-zero/store-drop guards above independently preserve the D3D result.

The full corpus transition moved from 506 qualified / 31 unsupported / 0
failed to 507 / 30 / 0: only `system/raytracing/skinvertices` became
qualified, and direct byte comparison confirmed all 506 previously qualified
packages remained identical.

### Bounded 256×1×1 two-word particle sort step

An isolated SM5.0/SM5.1 compute profile covers
`particles/gpu/sortstep`. Both backends declare the same finite space-zero
resources: immediate `cb3` with one vec4 row, typed uint buffer `t0`,
non-coherent structured UAV `u0` with an 8-byte stride,
`input_thread_group_id.x`, `input_thread_id_in_group.x`, two temporary
registers, and `dcl_thread_group 256,1,1`. The SM5.1 form additionally requires
canonical finite range-zero encodings; range-relative `cb0[3]` is normalized
back to physical `cb3`, not treated as a different binding. The exact 20-opcode
body has two nested selections and no loops, barriers, atomics, workgroup
memory, textures, samplers, or live register merges. Declaration, operand,
modifier, extension, binding-range, CFG, SSA, and type metadata are replayed
and compared before emission.

The two compute builtins map, in fixed order, to
`@builtin(workgroup_id) workgroup_id` and
`@builtin(local_invocation_id) local_invocation_id`. Their x components form
the global scalar lane used by the source; neither y nor z is read. Integer
arithmetic remains raw wrapping u32, including the profile's sole source
modifier: integer `NEG` is emitted as two's-complement negation rather than
floating negation. The pair comparison bitcasts the second word of each record
to f32, so ordinary WGSL `<` also preserves the source's false result for NaN.

The fixed `t0[3]` typed-buffer read uses a clamped physical word access and
selects zero when index 3 is out of range. The scalar-word view is not inferred
from the DXBC return tuple alone: the already-qualified `setsortargs` producer
publishes the same `SortParameters` binding as a typed scalar uint UAV and
writes its four words individually. The consumer therefore uses
`var<storage, read> t0: array<u32>` with `minBindingSize: 4`.

The UAV is `var<storage, read_write> u0: array<u32>` with
`minBindingSize: 8`. Structured loads divide `arrayLength` by two to obtain the
complete-record count, clamp both eagerly evaluated physical word accesses,
and select two zero words for an out-of-range record. Each two-word structured
store has its own complete-record bounds branch and is dropped as one source
instruction when out of range.

DX11 and DX12 are both substantive comparison inputs for this profile and emit
the same WGSL and portable binding layout after finite-range normalization.
The native browser gate validates the two-builtin 256×1×1 module, its compute
bind-group and pipeline layouts, and the compute pipeline with zero WGSL
warnings.

The full corpus transition moved from 507 qualified / 30 unsupported / 0
failed to 508 / 29 / 0: only `particles/gpu/sortstep` became qualified, and
direct byte comparison confirmed all 507 previously qualified packages
remained identical.

### Bounded 256×1×1 shared-memory particle bitonic merge

An isolated SM5.0/finite-SM5.1 profile covers
`particles/gpu/sortinner`. Both forms declare a typed uint Buffer `t0`, a
non-coherent structured UAV `u0` with an 8-byte stride, flattened and vector
local-thread identifiers, `workgroup_id.x`, three temporary registers,
structured thread-group memory `g0` with 512 8-byte records, and
`dcl_thread_group 256,1,1`. The flattened local identifier and
`input_thread_id_in_group.x` both map to `local_invocation_id.x` because the
admitted group shape is exactly 256×1×1.

The exact 61-opcode body has eight no-else selections and one uniform
nine-iteration loop. Its two `sync` instructions must carry exactly
`threads_in_group | thread_group_shared_memory`; the second executes once per
loop iteration, so each invocation dynamically reaches ten workgroup
barriers. The profile replays CFG, SSA, and scalar types, requires the exact
loop-carried signed stride merge and both integer `NEG` source modifiers, and
rejects declaration or executable tail words. A dedicated uniform WGSL
`stride` variable and immutable loop-exit condition avoid carrying the earlier
varying `r0.w` value into barrier control flow.

`g0` lowers to `var<workgroup> g0: array<u32, 1024>`, exactly 4 KiB. `t0`
and `u0` reuse the scalar-word and complete two-word-record contracts proven
for SetSortArgs and SortStep. External structured loads return a complete zero
record when physically out of range, and external stores drop the complete
record. The logical active count is not clamped to the physical `u0` length:
an out-of-range zero record can participate in the network and move into a
physically present slot, so pre-clamping would change defined robust-buffer
behavior.

The loop is a nine-stage compare/exchange (bitonic-merge) network, not a
standalone general sort of arbitrary input. For each stride it partitions the
512 workgroup records into disjoint pairs, compares the f32 key in word one,
and swaps both words when the high key is less than the low key. NaN therefore
keeps the source's false comparison result. The surrounding particle-sort
schedule supplies the bitonic input relationship; replacing this body with a
library sort would implement a stronger and different operation.

Shared-memory initialization has an explicit runtime orchestration premise.
SetSortArgs must complete first, the same `SortParameters` buffer range must be
usable as storage and indirect-dispatch data, its first three words must
dispatch exactly `D = ceil(max(N, 1) / 512)` groups, and SortInner must read
the fourth word, `t0[3]`, as the same `N`. A valid D3D/WebGPU x-dispatch
dimension has `D <= 65535`, hence `N <= 33,553,920 < 2^31`; for every
dispatched group and every logical record below the clamped remainder, the
source's signed outer guard then proves that record was initialized before the
network reads it.
The current WebGPU runtime prepares compute pipelines but does not dispatch
them, so same-buffer usage, ordering, and indirect dispatch remain integration
obligations rather than locally enforced runtime facts. Outside this premise
the original DXBC can read uninitialized thread-group memory (for example,
`N = 0x80000000`, group 1), and this profile makes no equivalence claim for
that source-undefined path.

The native browser gate validates one shared-memory module and both paired
compute pipelines with zero WGSL warnings. The full corpus transition moved
from 508 qualified / 29 unsupported / 0 failed to 509 / 28 / 0: only
`particles/gpu/sortinner` became qualified, and the hardened direct-byte
comparison confirmed all 508 previously qualified package outputs remained
identical.

### Exact 256×1×1 shared-memory particle chunk sort

An isolated SM5.0/finite-SM5.1 profile covers the full per-workgroup particle
sort that precedes the later merge passes. It has the same typed uint Buffer
`t0`, non-coherent stride-8 structured UAV `u0`, three thread identifiers,
512 two-word `g0` records, and 256×1×1 group shape as SortInner, but requires
exactly four temporary registers and its own exact 69-opcode body. Routing
checks this longer family before SortInner; near siblings still fail closed.
Declaration tails, body tails, operand selectors, the three integer `NEG`
sites, load extensions, synchronization flags, finite SM5.1 ranges and
references, CFG, SSA, scalar types, and both loop-carried merges are all
replayed or compared before emission.

The source begins with a storage-data-dependent `if (N == 0) return`
immediately before group barriers, which WGSL uniformity analysis cannot prove
uniform. That return is observably redundant: when `N` is zero the clamped
logical count is zero, so no external load, shared-memory read, or external
store executes. The profile validates but omits that three-opcode selection.
Every invocation can therefore reach the barriers uniformly with the same
result as the source's all-invocation return.

The two source loops are emitted with dedicated uniform state:
`merge_width`, `merge_done`, `half_width`, `stride`, and `stride_done`.
`merge_width` visits powers of two from 2 through 512; for each width, `stride`
visits descending powers of two from half the width through 1. This produces
45 compare/exchange stages. The two static `sync` sites require exactly
`threads_in_group | thread_group_shared_memory`: one follows initialization
and the other executes after every stage, for 46 dynamic barriers in a
complete invocation, including the normalized zero-count case.

For each stage, every local lane selects one disjoint pair. The first stride
of a merge width mirrors the high index; later strides use the ordinary merge
partner. Both words move together, and the second word is bitcast to f32 for
the `<` comparison. Finite keys are consequently sorted ascending within each
logical chunk of at most 512 records. Equal keys and signed zero preserve the
source's false comparison result, as does any comparison involving NaN; no
stronger total ordering is introduced.

`g0` remains the exact 4 KiB `array<u32, 1024>`. The signed difference between
`N` and the wrapping `workgroup_id.x * 512` base is clamped to `[0, 512]`.
Every shared record below that count is initialized before the first barrier,
and the guarded high member of every admitted pair implies that both pair
members are below the count. All physical shared indices remain in
`[0, 511]`, and each stage's pairs are disjoint. Shared-memory safety therefore
does not depend on a dispatch premise.

External accesses retain D3D robust-buffer behavior independently. `t0[3]`
returns zero when absent. A structured `u0` load returns one complete zero
record when either physical word is absent, while a structured store writes
both words only when the complete record exists. The logical count is not
clamped to physical `u0` length, because a robust zero record is allowed to
participate in the sort and move into a present slot.

Runtime orchestration is still responsible for the intended global result:
the producer must publish the same `N` in `t0[3]`, and the application must
dispatch the chunk groups that cover that logical range before scheduling
the subsequent merge profiles. This is a result-coverage obligation, not a
shared-memory-safety precondition of this profile.

The native browser gate validates the shared-memory module and both paired
compute pipelines with zero WGSL warnings.

The full corpus transition moved from 509 qualified / 28 unsupported / 0
failed to 510 / 27 / 0: only `particles/gpu/sort` became qualified. The
hardened direct-byte comparator cached and compared all 509 previously
qualified package outputs, with zero byte changes and zero regressions.

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

An isolated SM5.0/finite-SM5.1 profile covers
`postprocess/mergehistograms`. Both forms declare immediate one-row `cb0`,
typed uint Buffer `t0`, a non-coherent typed uint UAV `u0`,
`input_thread_id_in_group.x`, `input_thread_id.x`, four temporary registers,
64 stride-4 thread-group records in `g0`, and
`dcl_thread_group 256,1,1`. The SM5.1 declarations and body references must
use canonical finite singleton range-zero metadata. The exact 35-opcode body,
operand selectors and immediates, SM5.0 typed-load extensions, both barrier
payloads, CFG, SSA, scalar types, and the loop-carried bin index are replayed
or compared before emission. Selection occurs before the generic compute
lowerer, so malformed near siblings fail closed.

`g0` lowers to
`var<workgroup> g0: array<atomic<u32>, 64>`. Local lanes 0 through 63
atomically initialize one bin each, all 256 invocations execute an
unconditional `workgroupBarrier`, active global invocations accumulate 16
`uint4` input records with four `atomicAdd` operations per loop iteration,
and every invocation executes the second unconditional barrier. Local lanes
0 through 63 then atomically add the shared totals to `u0`. The source
barriers must carry exactly
`threads_in_group | thread_group_shared_memory`; moving either barrier under
one of the surrounding varying conditions is rejected.

The typed Buffer is represented as `var<storage, read> t0: array<u32>`.
The source record address is preserved as the wrapping sequence
`(global_invocation_id.x << 6) >> 2`, and each logical `uint4` load is admitted
only when all four physical words exist. A missing or partial record therefore
produces four zero lanes, matching typed-buffer OOB load semantics without an
eager WGSL access outside the scalar backing array. The typed UAV is
`var<storage, read_write> u0: array<atomic<u32>>`; its final atomic executes
only when the local bin index is below `arrayLength(&u0)`, so an OOB source
atomic is dropped.

The intended histogram result has explicit runtime premises. `cb0.x` and
`cb0.y` must be finite non-negative integer-valued f32 dimensions representable
as u32, because the profile's `ftou` adaptation claims equivalence only on
that domain. Their low-u32 product is the active global-invocation count.
Dispatch must cover that count, `t0` must provide the intended 64 bins for
each active invocation, and `u0` must provide at least 64 elements (normally
initialized to zero for a fresh result). The explicit robust guards remain
memory-safe outside the physical `t0`/`u0` size premises, but undersized
bindings intentionally produce the source's zero-load/drop-atomic behavior
rather than the complete intended histogram.

The substantive DX11 and DX12 shader pair passes the real comparison matrix
and emits byte-identical WGSL after finite-range normalization. The native
browser gate validates both paired compute pipelines with zero WGSL warnings.

The full corpus transition moved from 510 qualified / 27 unsupported / 0
failed to 511 / 26 / 0: only `postprocess/mergehistograms` became qualified.
The hardened direct-byte comparator cached and compared all 510 previously
qualified package outputs, with zero byte changes and zero regressions.

### Exact 16×16×1 atomic histogram creation

An isolated dual-validator profile covers `postprocess/createhistograms`.
Both backends declare immediate one-row `cb0`, float `texture2d` `t0`, a
non-coherent typed uint Buffer UAV `u0`, two-component workgroup, local, and
global invocation identifiers, 64 stride-4 thread-group records in `g0`, and
`dcl_thread_group 16,16,1`. The SM5.0 form has three temporary registers and
converts `cb0.z` inside its final selection. The finite-range SM5.1 form has
four temps and hoists that conversion ahead of the first selection. Each
literal 49-instruction schedule has its own exact opcode, operand, modifier,
extension, range/reference, CFG, SSA, and type validator; both feed one
canonical emitter only after validation.

Canonical emission hoists the pure uniform `ftou(cb0.z)` conversion. This is
equivalent on the admitted runtime domain: `ScreenTilesX` must be finite,
non-negative, integer-valued, and representable as u32. The conversion has no
side effect, changes no branch or barrier participation, and its value is used
only by the final output address. Evaluating it for all 256 lanes instead of
the 16 output lanes is therefore unobservable on that domain. NaN and
out-of-range conversion remain outside this claim.

The entry point preserves the ordered source identities as
`workgroup_id`, `local_invocation_id`, and `global_invocation_id`.
`g0` is `var<workgroup> array<atomic<u32>, 64>`. The first 64 flattened
local lanes initialize it with `atomicStore`, all lanes execute the first
unconditional `workgroupBarrier`, and in-range pixels atomically increment one
bin. All lanes then execute the second unconditional barrier before the first
16 lanes atomically load four bins each. Both source barriers must carry
exactly `threads_in_group | thread_group_shared_memory`; moved, conditional,
or differently flagged barriers fail closed.

Mip-zero `resinfo_uint` becomes `textureDimensions(t0, 0)`. The explicit
global-coordinate test surrounds the source pixel path, while the load itself
retains the texture contract's safe coordinate and zero-result selection so
no eager out-of-range `textureLoad` can be formed. The RGB transfer curve,
luminance dot product, base-two logarithms/exponent, natural-log conversion,
and source `div_sat` remain in their original f32 order and bit-exact
constants. The resulting signed bin is additionally guarded by
`0 <= bin && bin < 64` before `atomicAdd`. That guard is redundant for the
admitted finite path but contains WGSL memory access on adapted numeric edges;
D3D otherwise makes all TGSM undefined for an out-of-range shared atomic.

Each workgroup emits 16 typed `uint4` records. The wrapping address is
`((workgroup_id.y * ScreenTilesX + workgroup_id.x) << 4) + local_index`.
The atomic-word `u0` representation tests the complete typed element against
`arrayLength(&u0) / 4` before issuing all four `atomicStore` calls. An
out-of-range or physically partial element therefore writes nothing, never a
partial record. This is the exact 64-bin layout consumed by
`postprocess/mergehistograms`.

The intended numeric result additionally requires finite `MinLuminance` and
`MaxLuminance`, `MaxLuminance > MinLuminance`, and finite intermediate
normalization arithmetic. In particular, every executed pixel path admitted
by this claim must produce a finite positive `luminance`, a finite
`log_luminance`, and a finite `normalized_luminance` before the multiply and
`ftoi`; the value presented to `ftoi` is consequently in `[0, 64]` and within
the i32 conversion range. This explicitly excludes zero/negative luminance,
NaN, infinity, and any overflow or invalid intermediate from the equivalence
claim. Ordinary finite `_sat` maps exactly to WGSL
`clamp(..., 0.0, 1.0)`; D3D's special NaN-to-zero saturation result remains
the existing documented non-finite adaptation.

For every non-empty dispatch, `ScreenTilesX` must equal the dispatched
x workgroup count as well as being the output row stride, and the y workgroup
count must cover the intended source texture rows. The equality prevents an
x workgroup beyond the declared row width from aliasing a later row's output
records; a dispatch/stride mismatch and its resulting output collision are
outside the equivalence claim. `u0` must contain the intended complete output
records. Physical texture and UAV undersizing remains memory-safe through the
explicit guards, but cannot produce the complete intended histogram.

The substantive DX11 and DX12 pair passes the real comparison matrix and
emits byte-identical WGSL after schedule and finite-range normalization. The
native browser gate validates the shared module and both paired compute
pipelines with zero WGSL warnings.

The full corpus transition moved from 511 qualified / 26 unsupported / 0
failed to 512 / 25 / 0: only `postprocess/createhistograms` became qualified.
The hardened direct-byte comparator confirmed all 511 common previously
qualified package outputs remained byte-identical.

### Exact two-pass particle clear with effect-proven signed counter

An effect-level profile covers `managed/space/specialfx/particles/gpu/clear`.
It requires exactly `Main.pass0.compute` and `Main.pass1.compute`, each as the
only active stage in its pass. Reflection must identify pass 0 `u0` and pass 1
`u1` as the same one-element `ParticleCounters` UAV with Carbon type 10,
alongside pass 1 stride-4 `DeadBuffer` `u0` and stride-32 `ParticleBuffer`
`u2`. Both companion IR programs are validated before an opaque,
program-identity-bound proof is minted. A standalone pass-0 shader can never
select this profile: its signed typed-store declaration alone does not prove
the bound view is `R32_SINT`, and a missing, forged, or differently decoded
program proof fails closed. Selecting only pass 0 for package output remains
safe because preflight still examines the complete resolved effect.

Pass 0 has exact SM5.0 and finite-range SM5.1 validators for its signed typed
`u0`, `1x1x1` group, and two-instruction body. Under the effect proof it emits
`array<atomic<i32>>` with a four-byte minimum binding and
`atomicStore(&u0[0u], 0i)`. The same opaque policy gates binding-plan
construction and final lowering, so signed typed UAV layout is not admitted
as a general store feature.

Pass 1 independently proves the signed 32-bit view through its exact returned
`imm_atomic_iadd` on signed typed `u1[0]`. Its separate SM5.0 and finite-range
SM5.1 validators require the literal 26-opcode schedule, immediate `cb3`,
three UAV identities and strides, scalar flattened local index, two temps,
`16x16x1` group, both structured loops, lane-zero tail selection, operand
selectors and immediates, ranges/references, CFG, SSA, scalar types, and the
two loop-carried merges. `cb3[0].x` is read as raw bits with `bitcast<u32>`.
The complete-block index stays source-shaped as
`insertBits(local_invocation_index, block_index, 8u, 24u)`.

Together the 256 lanes visit every index in `[0, count)` exactly once: all
complete 256-record blocks run in the first loop, then lane zero visits the
remainder. Each visit first attempts both source-ordered `ParticleBuffer`
stores under a complete stride-32 record guard, then executes
`atomicAdd(&u1[0u], 1i)`, bitcasts the returned old signed value to the
dead-list `u32` index, and independently guards the stride-4 `DeadBuffer`
store. A short particle buffer therefore does not suppress the counter
increment or dead-list attempt, and a short dead-list buffer drops only its
own store. No barrier is introduced.

The intended dispatch uses one `1x1x1` pass-0 workgroup, requires its reset to
complete and become visible before pass 1, then uses exactly one `16x16x1`
pass-1 workgroup with no concurrent counter users and at least `count`
complete records in both structured buffers. Extra pass-0 workgroups only
repeat the same zero store, but extra pass-1 workgroups repeat the entire
traversal and append duplicates. External consumers must wait for pass 1 to
complete. Practical counts must also fit the application's watchdog budget.
Explicit store guards remain memory-safe for undersized buffers, but the final
counter still reaches `count`, matching the source's per-operation
dropped-write behavior rather than claiming a complete result.

The substantive DX11 and DX12 effect pair passes the real effect-level matrix:
both passes are ready and emit byte-identical WGSL after range normalization.
The intentionally standalone matrix view keeps pass 0 unsupported while pass
1 is independently emitted. The engine's fail-closed matrix validator
reconciles the exact two-pass body, stage digests, occurrence counts, per-key
coverage, reset WGSL, and signed atomic layout before admitting that contextual
pass. Its required native WebGPU gate compiled one unique independently
emitted module and prepared four compute pipelines for the paired backends
with zero WGSL warnings.

The full corpus transition moved from 512 qualified / 25 unsupported / 0
failed to 513 / 24 / 0: only
`managed/space/specialfx/particles/gpu/clear` became qualified. The hardened
direct-byte comparator confirmed all 512 common previously qualified package
outputs remained byte-identical, with zero regressions.

### Exact 16×16×1 shared-memory particle emit

A dedicated SM5.0 profile covers
`managed/space/specialfx/particles/gpu/emit`. Admission is two-layered:
the exact declaration family (immediate `cb3` of 4096 vec4s, stride-32
`ParticleBuffer` UAV, signed typed counter buffer, stride-4 `DeadBuffer`,
flattened/vector local identifiers, `workgroup_id`, 112-byte raw TGSM, and a
`16x16x1` group) plus a browser-safe SHA-256 semantic digest of the complete
normalized program. The digest implementation is proven against `node:crypto`
on known and varied vectors and hardened against property aliasing, sparse
arrays, accessors, prototypes, and unknown semantic fields. SM5.1 is
recognized by the same digest family and then deliberately rejected as
comparison-only; only the literal SM5.0 schedule may emit WGSL.

The lowered body keeps the audited execution shape: lane-zero TGSM
initialization is followed by a uniform `workgroupBarrier()`; the returned
signed `atomicAdd(u1[0u], -1i)` stays ordered before its `old - 1` signed
success test; DeadBuffer reads use a clamped physical load with an explicit
zero fallback; cbuffer rows use clamped physical access with zero selection;
raw TGSM accesses stay within the initialized words; and the final
`ParticleBuffer` write is guarded as one complete eight-word record. Source
mapping covers the executable schedule, omitting only structural closure
instructions.

The signed typed-UAV layout is owned by one self-proving policy
(`particleEmitSignedAtomicLayoutPolicy`): candidacy itself — the declaration
family and semantic digest — is the whole proof, and binding-plan
construction and the lowerer consume the same function, so no identity list
is duplicated or admitted generally. Trusted admission constants may only be
regenerated by the fixture generator from the audited effect bytes; it
verifies the effect and internal DXBC SHA-256 hashes and fails closed on any
other input.

The genuine paired effects are exercised through the optional
`CJS_PARTICLE_EMIT_DX11_EFFECT` / `CJS_PARTICLE_EMIT_DX12_EFFECT` test
inputs. With both fixtures present the suite runs with zero skips: the DX11
package qualifies with its `Main.pass0` ready, the DX12 counterpart reports
the comparison-only boundary, and the required native WebGPU gate compiled
the one unique emitted module and prepared its compute pipeline with zero
WGSL warnings.

The full corpus transition moved from 506 qualified / 31 unsupported / 0
failed to 507 / 30 / 0: only
`managed/space/specialfx/particles/gpu/emit` became qualified, and direct
comparison confirmed all 506 common previously qualified package outputs
remained byte-identical.

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

The corrective corpus transition moved from 513 qualified / 24 unsupported /
0 failed to 506 / 31 / 0. Exactly `exposuredebug`, `highpassfilter`, `taa`,
`taacopy`, `tonemapping`, `lensflare`, and `lensgrime` were retracted; direct
comparison confirmed all 506 remaining qualified packages are byte-identical.
The paired DX11/DX12 matrices retained matching axes and active topology with
zero front-end failures while moving the affected 111 stage occurrences (72
DX11 and 39 DX12) from emitted to unsupported.

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

  The source IR and semantic parameter names remain unchanged. Physical
  lowering replaces the inputs with one `texture_2d_array<f32>`, reuses the
  first input identity, removes the later bindings only from the owning pass,
  and emits fixed layers 0/1 or 0/1/2. The WGSL set becomes version 3 and
  carries the complete realization recipe. Every named layer is required; the
  runtime may use a compatible native array representation or decode all
  layers to RGBA8, but it may not silently supply a missing layer.

  Exact high (`.sm_depth`) and medium (`.sm_hi`) exhaustive matrices qualify
  all 160 DX11 bodies of `unpackedskinned_quaddetailv5` and all 32 DX11 bodies
  of `unpackedskinned_quadheatdetailv5`, with zero failed bodies. Their DX12
  matrices have the same axes/topology and zero failures; bindless bodies
  retain the pre-existing comparison-only unbounded-range boundary. The
  representative non-bindless, PPT-on, unclipped, opaque, debug-off body is
  body 4 (overlay blend for Detail): Detail falls from 17 source textures to
  15 physical textures through a three-layer recipe, while HeatDetail falls
  from 17 to 16 through a two-layer recipe. All four DX11 and four DX12
  representative fragment modules across high and medium compile in the
  browser with zero WGSL warnings.

  The exact-build corpus remains 507 qualified, 30 unsupported, and 0 failed.
  Twelve package hashes change, all within the static/skinned,
  packed/unpacked Quad Detail, HeatDetail, and Environment families; the other
  495 qualified packages are byte-identical. Every changed package carries
  exactly one two- or three-layer Detail transform.

  This closes the compiler-side sampled-texture binding limit. Raw module
  compilation alone does not prove resource realization or rendering, but the
  current engine accepts WGSL-set version 3 and realizes the documented
  `texture-2d-array` transform recipe. The Detail and HeatDetail families have
  exact draw evidence; the Environment family remains unverified. See
  [Consumer boundary: resource transforms](#consumer-boundary-resource-transforms).
- **Immediate 2D sample offsets** — `sample`, `sample_b`, `sample_d`, and
  `sample_l` lower their signed `_aoffimmi(u,v,w)` record to WGSL's final
  constant `vec2<i32>(u, v)` sampling argument. Both APIs apply that
  texel-space offset before sampler address modes, and both require components
  in `[-8, 7]`. D3D ignores `w` for a Texture2D, so only `u` and `v` are
  emitted. Fragment supports all four opcodes; vertex supports the
  explicit-gradient/LOD pair already legal there. Duplicate or malformed
  records, offsets on other opcodes, and non-2D resource shapes fail closed.
  The completed corpus transition kept 497 shaders qualified and intentionally
  changed exactly seven prior packages: `downsample`, `taa`, the tactical
  overlay `anchor`, `connector`, `ubershader`, and `velocity` shaders, and
  `ui/glowtransform`.
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
  multi-destination rule also corrects partial-mask `sincos` source lanes:
  the full-corpus rebuild intentionally changes only the affected WGSL lines
  in `beaconfx`, `raymarcher`, and `scannerbackground`; the other 494
  previously qualified packages remain byte-identical.
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

The versioned checkpoints in this section describe the retired flat-chunk wire
used before the Carbon-container switchover. Their corpus counts remain
compiler and provenance evidence; `INFO`, `META`, `PGRF`, `RFLX`, `RBLB`,
`ANLS`, and `WGSL` are no longer stored chunks. Current bytes are Carbon
version-15 records with derived compatibility views. See
[Carbon WebGPU effect container](../formats/carbon-webgpu.md).

At the 0.4.2 checkpoint, `BuildEffect` emitted selected-effect INFO schema
version 2 while the binary Carbon WebGPU container remained version 1. INFO v2
recorded the WebGPU target,
backend-package and translator semantic versions, and a lower-case SHA-256
digest computed over the exact compiled-effect input byte view. A conflicting
caller digest fails closed. The reader retains legacy selected-effect INFO v1
support and rejects unknown INFO schema versions.

The 0.4.2 strong-provenance checkpoint was metadata/container-only. Its
exact-build corpus retained 507 qualified and 30 unsupported packages with no
failures; all 537 status/error results were unchanged. Every qualified package
changed only in INFO, while all 507 `META`, `ANLS`, and `WGSL` payloads remained
byte-identical.

The 0.4.3 PGRF checkpoint additionally records the complete builder-derived
source permutation topology and identity-only unique-body table. Exact build
3444265 again retains 507 qualified and 30 unsupported packages with no
failures and all 537 status/error results unchanged. Across the 507 qualified
packages:

- all 1,521 `META`, `ANLS`, and `WGSL` chunks are byte-identical to 0.4.2;
- all INFO documents equal 0.4.2 after removing only the PGRF pointer and
  normalizing the producer/translator versions;
- an independent source-byte comparison matches all 507 PGRF documents,
  covering 8,257 permutation variants and 3,331 unique body identities; and
- a full 537-source header audit finds no anomalies across 8,722 permutations,
  3,567 unique body records, and 5,155 exact aliases (maximum 972
  permutations in one source).

The final DX11/DX12 quads matrix remains qualified with matching active
topology and both stages emitted. A new browser gate is not required for this
checkpoint because emitted WGSL, analysis, metadata, layouts, and transforms
are unchanged; old readers tolerate the additive chunk.

The 0.4.4 selected-reflection checkpoint adds complete version-15 reflection
for the selected body in `RFLX`, with every exact byte vector externalized into
canonical deduplicated `RBLB` records. A body-reflection validator was rerun
after reconstruction; package validation also reconciles INFO source identity,
META/PGRF body identity, and every ANLS pass/stage source record. Earlier
effect versions retain the legacy package surface. All-body reflection remains
unsupported, so source/backend/runtime completeness remain false.

The exact-build 3444265 corpus remains 507 qualified, 30 unsupported, and zero
failed/unqualified. All 537 statuses and errors match 0.4.3. Across the 507
qualified packages:

- all `META`, `PGRF`, `ANLS`, and `WGSL` payloads are byte-identical;
- INFO differs only by the 0.4.4 producer/translator versions and its RFLX/RBLB
  pointer;
- all 507 packages contain deterministic, structurally valid RFLX/RBLB;
- reconstructing every selected portable document from RFLX/RBLB deep-equals
  a fresh source reflection, including 16 non-default/non-first bodies; and
- the reflected corpus covers 885 techniques, 937 passes, 1,863 stage
  programs, 4,366 constants, 2,281 resources, 1,027 samplers, 16 UAVs, 1,589
  render states, and 74,912 exact constant-default bytes.

A packed-package Chrome smoke builds and reads a real version-15 effect in the
browser, resolves all reflected byte references, structured-clones the JSON
view, and fails closed after raw blob corruption with no console errors. The
engine prepares a newly generated real `quads.sm_hi` Carbon WebGPU package with 10
canonical bindings and zero WGSL warnings. The high-tier
`unpacked_quadv5.sm_depth` DX11 self-pair remains exhaustively qualified across
480 bodies, 4,480 emitted stage occurrences, and 2,240 ready pass occurrences;
the envelope slice changes none of its WGSL.

The 0.5.0 all-source-reflection checkpoint replaces selected-only RFLX v1
output with INFO v3 plus all-unique RFLX v2/RBLB. It records complete portable
reflection for every unique version-15 source body while ANLS/WGSL remain
selected-backend data. `GetPortableEffectReflection(permutationIndex)` exposes
any package permutation as a fresh, format-hlsl-validated document with owned
byte payloads. The `resource` layer owns `Tr2EffectRes` selection, canonical
`Tr2Shader` construction, and the per-index cache; renderer-owned handles
remain an engine concern.

That RFLX/RBLB apparatus and its accessor were removed after this checkpoint.
`Tr2EffectRes` now reads the Carbon container directly; the entries above are
retained as the record of what the format did at the time.

An exhaustive build-3444265 oracle retains 507 qualified, 30 unsupported, and
zero failed/unqualified results. For all 507 emitted packages, `META`, `PGRF`,
`ANLS`, and `WGSL` are byte-identical to 0.4.4 after the expected INFO/RFLX
schema change. Reconstructing all 8,257 permutations deep-equals fresh source
reflection across 3,331 unique bodies, 23,949 source programs, 11,549
techniques, 11,963 passes, 68,367 constants, 38,335 resources, 10,858
samplers, 16 UAVs, and 1,241,456 exact constant-default bytes. The shared
RBLB stores 5,901 deduplicated payloads / 20,625,492 bytes. Candidate packages
total 132,688,092 bytes versus 39,643,003 bytes at 0.4.4; the median package
ratio is 1.008 and p95 is 8.51. A second fresh build using format-hlsl 0.1.8
produces all 507 packages byte-for-byte identically.

The format-hlsl 0.1.8 prerequisite preserves Carbon's authored zero-count
bindless descriptor ranges and requires every resource/UAV map entry to match
exactly one signature record. The real DX12 High unpacked-Quad source validates
all 288 unique bodies, including its zero/unbounded SRV, UAV, and sampler
ranges. The exact DX11/DX12
`managed/space/spaceobject/v5/quad/unpacked_quadv5.sm_depth` matrix remains
qualified across 480 bodies per backend; DX11 emits all 4,480 stage
occurrences and 2,240 passes, while DX12's expected unbounded-range backend
boundary remains comparison-only for 480 pass occurrences.

Explicit `SPACE_OBJECT_PPT_ENABLED=SOPPT_ENABLED` body-4 packages were then
prepared through the unchanged engine-webgpu reader on a real WebGPU adapter.
The DX11 package contains 144 reflected bodies and the DX12 package 288; each
selected Main pass exposes two modules and 25 canonical bindings. Both browser
gates compile with zero WGSL warnings.

## All-body backend packaging

`mode: "all"` attempts every unique source body after the resolved selection
passes its initial translation gate. In the retired chunk wire, the result was
stored as a `WGSB` `CJS_WGSL_BODY_SET` document. The current Carbon wire stores
WGSL in stage program slots and bind-group/transform data in per-pass backend
blocks; `backendBodySet` is now a derived compatibility view. Selected mode
remains the default.

The translation unit is deliberately one pass of one body rather than one
stage. A pass owns its binding plan and resource-transform plan, so identical
stage bytecode can legitimately translate differently when its pass-mates
differ; sharing at stage granularity would be unsound. The Carbon wire has no
unit table. Exact emitted program and backend-block bytes share storage through
the arena's bytewise deduplication.

All mode first requires the resolved selection to lower successfully. After
that gate, a later body the compiler cannot lower is retained with empty
program slots and coverage degrades to `partial`. The in-memory build result
retains its specific reason; the wire does not. A reread can say only that the
body carries no translated programs. Permutation topology and representable
non-program description fields remain present, but source-stage programs are
not stored. Non-dynamic sampler names and the authored stage order are both
preserved.

Translating every body is deliberately **not** treated as backend completeness.
`backendComplete` and `runtimeComplete` remain false, matching the sibling
WebGL package. The engine now realizes the documented layouts and
`texture-2d-array` transforms and has exact draw evidence for representative
Detail and HeatDetail families. That proof does not cover every required
translated program, layout, and transform, and complete resource hydration and
selection also remain open. The `BuildEffect` result carries the
translated-body scope in `info.backendBodyCoverage`; the bytes express it
structurally through which bodies carry programs.

Historical evidence for the retired WGSB implementation: its
every-permutation reader join resolved
every permutation of a real Quad family package to translated programs and
reached every unique body; the selected body's shared units were byte-identical
to that package's derived `WGSL` view; a full corpus rebuild leaves every
selected-mode package byte-identical with unchanged statuses; every effect in
the corpus builds in all-body mode with no build failures, the small number of
partial results losing bodies only to already-documented compiler boundaries;
and 202 translated modules from bodies that selected-mode packaging never
emitted were compiled on a real WebGPU adapter with zero warnings, including a
High `.sm_depth` explicit PPT-on Detail-family package with version-3
resource-transform units and the exact bounded particle-clear compute profile.
That is compiler and module evidence for the newly packaged bodies. It is not a
prepared-pipeline or rendered claim for them.

Two defects in the first implementation were found only by building the whole
corpus in all-body mode, not by the package suite: stage selection outside the
per-body guard turned one geometry-stage body into a whole-package failure, and
the all-body path initially omitted the particle-clear effect-profile
preflight. The synthetic fixtures cannot express either condition, so an
all-body corpus sweep is part of this feature's verification, not an optional
extra.

## Consumer boundary: resource transforms

`engine-webgpu` accepts `CJS_WGSL_SET` versions 1, 2 and 3, and realizes
`texture-2d-array` resource transforms. The discriminator is the **feature**,
never the document version and never `texture.viewDimension`:

- a **source-declared** `texture_2d_array` keeps every one of its bindings and
  needs no assembly. Gating on `viewDimension` would reject the very packages
  the exact draw gate renders — the selected Quad V5 body binds a plain
  `texture_2d_array<f32>` with no transform, and both Quad families carry
  `cube` bindings.
- a **transformed** binding carries `transformId` and `arrayLayerCount`, and its
  merged-away inputs are absent from the layout. It cannot be fed from one
  source texture, so the consumer assembles the layers.

Only `kind: texture-2d-array`, `version: 1`,
`representation: native-or-rgba8`, and `missingLayer: reject` are realized.
Anything else throws a diagnostic naming the offending field, because the
failure mode of guessing is WGSL a device accepts and pixels that are quietly
wrong.

Both halves of the claim are validated, not just the record: exactly one binding
must carry each declared transform, at the declared output identity, with a
matching `arrayLayerCount`, a `texture_2d_array<f32>` type, visibility to the
transform's stage, and **no surviving binding for any merged-away input**. A
survivor would still be bindable and would silently receive a texture the shader
never reads. Symmetrically, a binding claiming an undeclared transform, or
declaring array layers without one, is rejected.

### The analysis is pre-transform; the layout is post-transform

This asymmetry is the one thing a consumer must not get wrong. The reflection
still lists every declared resource under its own register, including inputs the
producer merged away; the layout is shorter by exactly those inputs. Checking
one against the other reports the merge as drift. The merged array occupies the
**layer-0 input's slot**, which is required rather than assumed, so the binding a
consumer must fill is unambiguous.

Layers are written in declared order, layer *i* from `inputs[i]`, and must agree
on size and format because one texture cannot hold layers that do not. A missing
input is rejected rather than substituted: any stand-in layer would change the
rendered result while still validating.

Realized and drawn, all with zero WGSL warnings:

| Family | Layers | Merged into | Evidence |
| --- | --- | --- | --- |
| `unpackedskinned_quadheatdetailv5` | 2 | `Detail1Map` slot | 22 over 22 bindings, 3 cases, detail changed 570/635 covered pixels |
| `unpacked_quaddetailv5` | 3 | `Detail1Map` slot | both detail controls changed 1116/1116 covered pixels |
| `unpackedskinned_quaddetailv5` | 3 | `Detail1Map` slot | 634/635 and 635/635, indexed non-identity bones observed |

The `Detail1` and `Detail2` delta maps were **distinct** in every case. That is
the assertion that matters: a collapsed or misordered assembly would produce
identical deltas while still rendering and still validating.

Source-declared array textures are now realized rather than merely accepted:
the engine creates a layered 2D texture with a `2d-array` view and binds it
through the same adapter, gated by a synthetic two-layer draw that asserts each
layer's pixels exactly. A single-layer array view is legal and distinct from a
plain 2D view, because a shader declaring `texture_2d_array<f32>` needs the
array view whatever its layer count. A layout asking for the dimension the view
was not created with fails closed, since a view's dimension is fixed at
creation and cannot be reinterpreted.

This matters beyond the transform case: the High `.sm_depth` Quad V5 `Main`
pass binds `LightProfileArray` as a plain `texture_2d_array<f32>` with no
transform at all, so array-texture realization is a prerequisite for any
High-tier draw gate, not a detail of transform support.

Array-texture realization is what made transform support possible: the engine
allocates the array itself and fills layer *i* from `inputs[i]`, which is the
only way a binding whose other inputs were removed can be filled at all. The
Detail and HeatDetail family gates draw under this contract. The Environment
family has not been exercised and should be treated as unverified rather than
working.

Accepting version 3 also tightened three structural checks that were written
`=== 2` and would otherwise have silently downgraded every version-3 package to
version-1 semantics: shared binding identities must span at least two stages,
and explicit D3D and scope identities are both required. That downgrade would
have been invisible to the exact draw gate, because DX11 and DX12 downgrade
identically and the bit-exact comparison would have stayed green.

## Verification contract

Every shader-emission, layout, or transform compatibility change requires the
package suite and a representative `engine-webgpu` browser gate on a real
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
