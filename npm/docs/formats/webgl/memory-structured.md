# DXBC → GLSL ES 3.00 Lowering Spec: Memory-Structured Family

Status: Evolving
Scope: `@carbonenginejs/runtime-resource/formats/webgl` structured-memory lowering
Audience: Shader translator maintainers and reviewers
Summary: Defines bounded WebGL2 adaptations for DXBC structured-memory operations.

Family key: `memory-structured`
Target: GLSL ES 3.00 (WebGL2), vertex + pixel stages only (no compute, no SSBOs).
Register model: every DXBC register is stored by the emitter as a `float` `vec4`; all
integer/unsigned reads and writes go through `floatBitsToInt` / `floatBitsToUint` /
`intBitsToFloat` / `uintBitsToFloat` at the use site, mirroring HLSLcc's own
`GetBitcastOp` (`vendor/HLSLcc/src/toGLSLOperand.cpp:327-353`) and
`AddOpAssignToDestWithMask` (`vendor/HLSLcc/src/toGLSLInstruction.cpp:28-153`)
machinery, which HLSLcc itself falls back to whenever static data-type analysis is
unavailable (exactly the reflection-stripped situation this fork runs in per
`vendor/HLSLcc/CARBONENGINEJS-FORK.md:34-52`).

Corpus counts (450k-instruction sweep, 1611 EVE Online DX11 effects):

| Opcode | Count | Stage reality |
|---|---:|---|
| `ld_structured` | 4014 | vs (BoneTransforms skinning) + ps (LightBuffer/LightIndexBuffer-style tbuffer reads) |
| `store_structured` | 930 | compute-only in D3D11 (requires a UAV write target); **not observed as reachable in vs/ps stages actually shipped to WebGL2** — see per-opcode note |
| `store_uav_typed` | 642 | compute-only in practice for this corpus (UAV write) |
| `sync` | 183 | compute-only (`sync` only has meaning with `dcl_thread_group`) |
| `ld_raw` | 54 | no confirmed vs/ps corpus example found (see per-opcode note); same SSBO problem as `ld_structured` if it does appear in vs/ps |
| `store_raw` | 54 | compute-only in practice (RWByteAddressBuffer write) |
| `atomic_iadd` | 27 | **confirmed present in a pixel shader** (`lensflareoccludert.sm_depth`, `stageName: "pixel"` in `dx11-instruction-coverage.json`'s `initialCandidateOpcodeExamples`) — not compute-only, see per-opcode note |
| `imm_atomic_iadd` | 24 | compute-only (UAV atomic with previous-value return) |
| `ld_uav_typed` | 18 | compute-only in this corpus — sampled instance is `measureexposure.sm_depth` (tone-mapping luminance compute pass), **not** `lensflareoccludert` (that file's confirmed opcode is `atomic_iadd`/`dcl_unordered_access_view_typed`, per `TRANSPILING-GAPS.md:100-114`); see per-opcode note |
| `imm_atomic_exch` | 9 | compute-only |
| `atomic_umax` | 6 | compute-only |
| `atomic_umin` | 3 | compute-only |
| `bufinfo` | 0 | not observed in this corpus; specified for completeness only |

**Central WebGL2 constraint** (governs every opcode below): GLSL ES 3.00 has **no
shader storage buffers** (`buffer` blocks require `#version 310 es` or GL 4.3+), **no
image load/store types** (`image2D`/`imageLoad`/`imageStore` require ES 3.10+), and
**no atomic-memory built-ins outside compute shaders** (`atomicAdd`/`imageAtomicAdd`
etc. and `barrier()`/`memoryBarrier()` are ES 3.10 compute-shader built-ins, not part
of the ES 3.00 vertex/fragment built-in set). Every HLSLcc GLSL template shown below
is therefore **reference material for what desktop/Vulkan/Metal HLSLcc emits**, not
directly compilable WebGL2 output. The one opcode with a proven, shipping WebGL2
lowering is `ld_structured` restricted to the `BoneTransforms` skinning case, via the
package-time `cb3` rewrite described in its section below.

---

## Shared machinery referenced by this family

- `HaveUnsignedTypes(eLang)` and `HaveBitEncodingOps(eLang)`
  (`vendor/HLSLcc/src/internal_includes/languages.h:156-180`) both return `1` for
  every target except `LANG_ES_100`/`LANG_120`. `LANG_ES_300` (this project's
  target) has unsigned integer types and bit-encoding intrinsics
  (`floatBitsToInt`/`floatBitsToUint`/`intBitsToFloat`/`uintBitsToFloat`) available,
  so all the `TO_FLAG_UNSIGNED_INTEGER` / bitcast branches below are live for our
  target.
- `AddAssignToDest` / `AddAssignPrologue`
  (`vendor/HLSLcc/src/toGLSLInstruction.cpp:155-171`) write the destination operand,
  the write mask, `= `, and the correct number of constructor/bitcast open-parens;
  `AddAssignPrologue` closes them and appends `;\n`. This is the generic
  "assign-with-implicit-bitcast" pattern the emitter must reproduce for `ld_structured`,
  `ld_raw`, `ld_uav_typed`, and `bufinfo`.
- `_sat` (saturate) is applied **generically, after the main switch**, only to
  operand 0 (`vendor/HLSLcc/src/toGLSLInstruction.cpp:4821-4844`): it re-clamps
  `dest = clamp(dest, 0.0, 1.0)` (with an Adreno `min(max(dest,0.0),1.0)` workaround
  path gated behind `#ifdef UNITY_ADRENO_ES3`, since `eTargetLanguage == LANG_ES_300`
  triggers the workaround branch). This only matters for opcodes that write a
  register destination — i.e. `ld_structured`, `ld_raw`, `ld_uav_typed`, `bufinfo`,
  `imm_atomic_*` (previous-value destination). Store/`sync`/non-`imm_` atomics have
  no float destination and DXBC does not encode `_sat` for them in practice.
- Structured/raw buffer declaration (`DeclareBufferVariable`,
  `vendor/HLSLcc/src/toGLSLDeclaration.cpp:1027-1092`) is the HLSLcc reference
  declaration these instructions index into:
  ```glsl
  struct t0_type { uint[<stride/4>] value; };
  layout(std430, binding = N) readonly buffer t0 { t0_type t0_buf[]; };
  ```
  (raw buffers use `uint t0_buf[]` / `int t0_buf[]` directly, no wrapper struct,
  selected by `HaveUnsignedTypes`). This declaration is unusable in GLSL ES 3.00 —
  documented here only because the per-instruction `t0_buf[...]` indexing expression
  it feeds is the exact text pattern the package-time `cb3` rewrite (see
  `ld_structured`) pattern-matches against.

---

## `ld_structured` (4014 instances) — highest priority in this family

### Semantics
Loads a structured-buffer element: given a structure index (operand 1) and a
byte offset within the structure (operand 2), reads one or more 32-bit components
from resource operand 3 (a `t#`/`u#` structured buffer) into the destination
register, per D3D11 `ld_structured` semantics (index-then-byte-offset addressing
into an array of fixed-stride structures).

### GLSL lowering — A. HLSLcc reference (desktop/Vulkan/Metal SSBO path)
`TranslateShaderStorageLoad`, case `OPCODE_LD_STRUCTURED`
(`vendor/HLSLcc/src/toGLSLInstruction.cpp:1585-1683`, dispatched at
`toGLSLInstruction.cpp:4256-4264`). Operands: `psDest=asOperands[0]`,
`psSrcAddr=asOperands[1]` (struct index), `psSrcByteOff=asOperands[2]` (byte
offset), `psSrc=asOperands[3]` (resource).

For each destination component `c` present in the destination write mask:
```glsl
<bitcast_open><resourceName>_buf[<structIndexExpr>].value[(<byteOffExpr> >> 2u) + <swz>u]<bitcast_close>
```
where `<swz>` is `psSrc->aui32Swizzle[c]` if the resource operand carries an
explicit swizzle (`OPERAND_4_COMPONENT_SWIZZLE_MODE`), else `c` itself
(`toGLSLInstruction.cpp:1673`) — i.e. the *resource* operand's own swizzle can
remap which dword of the structure element component `c` reads from. All such
per-component expressions are joined by `AddAssignToDest`/constructor into:
```glsl
dest.mask = <ctor>(comp0, comp1, ...);
```
(`toGLSLInstruction.cpp:1623-1682`).

`<bitcast_open>`/`<bitcast_close>` depend on `destDataType = psDest->GetDataType()`
(`toGLSLInstruction.cpp:1642-1654`):
- `SVT_FLOAT` → `uintBitsToFloat(...)` (since `HaveBitEncodingOps` is true for ES
  3.00); the code falls back to `float(...)` only for pre-bit-encoding targets.
- `SVT_INT`/`SVT_INT16`/`SVT_INT12` → `int(...)`.
- `SVT_UINT` → no wrapper at all (`addedBitcast` stays `0`) because the backing
  `t0_type.value` array element type is always `uint` — "always uint array atm"
  (`toGLSLInstruction.cpp:1641`).

The struct-index operand is translated with **both** `TO_FLAG_UNSIGNED_INTEGER |
TO_FLAG_INTEGER` set simultaneously (`toGLSLInstruction.cpp:1664`) — reproduce
this by picking whichever the index operand's own declared type implies (uint by
default on ES 3.00). The byte-offset operand's flag (`srcOffFlag`) is
`TO_FLAG_UNSIGNED_INTEGER` unless the target lacks unsigned types or the operand's
own `SVT_INT`/`SVT_INT16`/`SVT_INT12` type forces `TO_FLAG_INTEGER`
(`toGLSLInstruction.cpp:1618-1621`); when unsigned, both the `>> 2` and the `+
<swz>` component addend get a trailing `u` suffix (`toGLSLInstruction.cpp:1669-1675`).

### GLSL lowering — B. WebGL2 `cb3` joint-matrix rewrite contract (the shipping path)
This is the **only** `ld_structured` lowering this emitter must actually produce
runnable WebGL2 GLSL for, restricted to the `BoneTransforms` skinning case
(vertex stage). It is a two-stage pipeline:

1. Emit HLSLcc's reference SSBO GLSL exactly as in section A (this project's
   HLSLcc fork already tolerates missing `RDEF` bindings for
   `dcl_resource_structured` by falling back to the DXBC declaration's encoded
   stride — see `CARBONENGINEJS-FORK.md:41-44` and
   `TRANSPILING-GAPS.md:51-54`), producing text of the exact shape:
   ```glsl
   struct t0_type { uint[1] value; };
   layout(std430, binding = 0) readonly buffer t0 { t0_type t0_buf[]; };
   ...
   dest = vec4(uintBitsToFloat(t0_buf[idx].value[(0 >> 2) + 0]),
               uintBitsToFloat(t0_buf[idx].value[(0 >> 2) + 1]),
               uintBitsToFloat(t0_buf[idx].value[(0 >> 2) + 2]),
               uintBitsToFloat(t0_buf[idx].value[(0 >> 2) + 3]));
   ```
   Verified against an actual generated fixture
   (`../shaderdiscovery/artifacts/ab-shader-set/work/skinned_fxdirectionalv5/skinned_fxdirectionalv5.sm_hi.dxbc_29291f5662ed6781.vertex.es300.glsl:60-64`):
   all four components of one row share the **same** byte offset (row 0 uses
   `0`, row 1 uses `16`, row 2 uses `32` — i.e. the row's base byte offset, not
   a per-component offset of `0/4/8/12`), differing only in the trailing
   `+ 0/1/2/3` dword index, and **without** a `u` suffix on either the shift or
   the addend. The missing `u` is not a formatting nit: in this corpus the
   byte-offset operand is declared `SVT_INT` (not `SVT_UINT`), so
   `srcOffFlag` resolves to `TO_FLAG_INTEGER`
   (`toGLSLInstruction.cpp:1618-1621`), which suppresses the `u` suffix
   entirely (see `printImmediate32`, `toGLSLOperand.cpp:371-387` vs. `388-395`).
   This also matters functionally: `lowerStructuredBoneLoad`'s regex
   (`packageTr2WebglEffect.js:875`) matches literal `(\d+)\s*>>\s*2\s*\)` with
   no `u` tolerance, and its 4-component agreement check requires all four
   loads to share one `byteOffset` — a per-component-varying offset of
   `0/4/8/12` would both fail to match the regex *and* fail the "same
   byteOffset" agreement check, silently no-opping the rewrite. The previous
   worked example here was internally inconsistent with the very rewrite
   contract it was illustrating.
2. A package-time rewrite pass over the generated GLSL text, performing the
   steps below **in this exact order**.

   > **Superseded (2026-08-02).** This pass no longer exists. The emitter now
   > declares vertex-stage structured buffers as `std140` UBOs when it emits the
   > shader, with real bindings, rather than rewriting text afterwards — see
   > `DxbcGlslEmitter.js`, the `dcl_resource_structured` vertex branch. The
   > regex functions it describes were deleted from
   > `scripts/packageTr2WebglEffect.js`, so the line citations below point at
   > nothing. The section is kept because it records *why* each rewrite was
   > needed, which the ccpwgl runtime ABI still constrains; read it as history,
   > not as a description of the code.
   1. Strip the `#ifdef GL_ARB_shader_storage_buffer_object` /
      `GL_ARB_shader_image_load_store` extension guard blocks (regexes at
      `packageTr2WebglEffect.js:832-833`).
   2. Strip the `struct t0_type { uint[1] value; };` declaration (regex at
      `packageTr2WebglEffect.js:834`, matches only the 1-word/4-byte stride
      shape).
   3. Strip the `layout(std430, binding = 0) readonly buffer t0 { t0_type
      t0_buf[]; };` declaration (regex at `packageTr2WebglEffect.js:835`).
   4. Grow the vertex stage's `ConstantBuffer3` (`cb3`) declaration to
      `vec4 data[max(existingSize, 200)]` (`packageTr2WebglEffect.js:836-839`) —
      this is where `JointMat` lives at `cb3.data[26..199]` per the ccpwgl runtime
      ABI (`cb3[26..199]`, 58 joints × 12 floats = 696 floats,
      `AGENT-FINDINGS/decisions/016-cewg-skinning-abi-lowering-for-ccpwgl-2026-06-30.md`
      and `015-joint-matrix-jointmat-findings-ccpwgl-runtime-truth.md`).
   5. Convert `uvec4`/`ivec4` (or `uvec2/3`, `ivec2/3`) `in_BLENDINDICES<n>` vertex
      inputs to plain `vec<N>` (regex at `packageTr2WebglEffect.js:840-843`) —
      ccpwgl binds GR2 mesh blend indices as float attributes via
      `vertexAttribPointer`, not `vertexAttribIPointer`
      (`AGENT-FINDINGS/decisions/028-cewg-skinned-blend-index-abi-lowering.md`).
   6. Strip the DX11 global bone-offset add HLSLcc emits when combining
      `in_BLENDINDICES0` with a `cb3.data[26]` offset uniform (two regex forms at
      `packageTr2WebglEffect.js:845-852`, covering both the scalar `int(...)  +
      floatBitsToInt(cb3.data[26].x)` shape and the vector `(i)uvec/ivec(...) +
      floatBitsToInt(cb3.data[26].<swz>)` shape) — ccpwgl's `cb3.data[26]` slot is
      reused for `JointMat`, not the native bone-ring-buffer offset, so this add
      must be removed entirely rather than merely rewired.
   7. Rewrite each 4-component `t0_buf[...]` row-load expression
      (`vec4(t0_buf[idx].value[(byteOff>>2)+0], ...)`, all 4 components required,
      `lowerStructuredBoneLoad`) into:
      ```glsl
      cb3.data[26 + (<idx>) * 3 + <row>]
      ```
      where `<row> = floor(byteOff / 16)` and must be in `{0,1,2}` (a `Float4x3`
      bone matrix is 3 `vec4` rows); if any of the 4 component sub-expressions
      disagree on `idx`/`byteOff`, or `row` falls outside `0..2`, or the swizzle
      is anything but the identity `xyzw`/`.xyzw` is stripped when default,
      **the rewrite silently no-ops and leaves the un-lowered `t0_buf` text in
      place** (`packageTr2WebglEffect.js:886,890,895,898` all `return match`) —
      this is a silent-failure edge case the implementing engineer must guard
      against (add a diagnostic) rather than trust to fail loudly.
   8. If any rewrite happened, inject a `// CEWG: BoneTransforms lowered to cb3
      JointMat rows.` marker comment after `#version 300 es`
      (`packageTr2WebglEffect.js:859-861`).

### GLSL lowering — C. `ld_structured` in pixel stage / non-skinning resources
The corpus also uses `ld_structured` on `t#` "packed tbuffer" resources unrelated
to skinning — e.g. `LightBuffer`/`LightIndexBuffer` reads in pixel shaders such as
`decalcylindricv5.sm_depth` (`AGENT-FINDINGS/decisions/005-structured-resource-only-opcodes-2026-06-26.md`).
**No `cb3`-style *functional* ABI rewrite exists for these** — they hit the same
SSBO-unavailability wall as section A. The emitter's default path lowers them to
pixel `usampler2D` data textures (see `DxbcGlslEmitter.js` `dcl_resource_structured`
pixel branch), which compiles but consumes a texture unit each; on real drivers
the `_depth` quad variants overflow `MAX_TEXTURE_IMAGE_UNITS`(16).

**Superseded (2026-08-02) — the lights fit, and are kept.** The two light
buffers now lower to a single packed `RGBA32UI` data texture rather than one
texture each, which frees two units, and the `Detail1/2/3Map` textures merge into
one array texture, which frees one or two more. Both `.sm_depth` quad variants
land at or under 16 with lighting intact: `unpackedskinned_quaddetailv5` at 15,
`unpackedskinned_quadheatdetailv5` at 16. See
`/docs/contracts/webgl2-texture-budget.md`. Dropping the lights is still
available as `--stub-light-resources` for isolating a lighting problem, but it is
no longer the answer to the budget. The paragraph below describes that opt-in
path and remains accurate.

**Earlier resolution (2026-07-08) — stub, not rewrite.** Since CEWG does not
support this tiled lighting, the packager can DROP it instead of lowering it. Run
`packageTr2WebglEffect.js --stub-light-resources`: it resolves the light resource
names (`LightBuffer`, `LightIndexBuffer`, `LightProfileArray`) to `t#` registers
from the Carbon `.sm` reflection (RDEF is stripped, so names live only there —
and the registers vary per permutation, so this is name-driven, not fixed to
sb11/sb12/s13) and passes them to `emitGlsl` as `stubResourceRegisters`. The
emitter then drops their decl+binding and lowers reads to `uintBitsToFloat(0u)`
(structured) / `vec4(0.0)` (sampled) — zeroing the per-tile light count makes the
light loop dead. The packager also strips those `resource` bindings from the
manifest JSON (`stripLightResourcesFromManifest`) so the CEWG runtime does not
synthesize a texture def (glType 0 → "Invalid shader texture definition") for the
now-undeclared light buffers. Opt-in, default off; every other package is
unchanged. A functional light constant-buffer path remains possible but was not
built.

Tested by `test/glsl-emitter.test.js` (synthetic pixel shaders with a structured
buffer / sampler2DArray: declared by default, dropped + no binding when the
register is in `stubResourceRegisters`, and only listed registers dropped) and
`test/stub-light-resources.test.js` (the packager's `resolveStubLightRegisters`
name→register resolution and `stripLightResourcesFromManifest` manifest filter,
in `scripts/stubLightResources.js`).

### Type rules
- Struct index operand: read as int/uint (both flags set in HLSLcc; pick uint by
  default for ES 3.00).
- Byte-offset operand: uint unless the operand's own declared type is signed int.
- Result component type follows the *destination* register's inferred type
  (float → `uintBitsToFloat`, int → `int(...)`, uint → passthrough), **not** the
  source resource's declared return type — this is purely dest-driven, matching
  the "everything is `float vec4`, bitcast at use" register model this project
  already commits to.
- This is a data-movement instruction, not a comparison — it does not produce a
  0xFFFFFFFF/0 mask.

### Helpers needed
- `structuredLoadComponent(bufName, structIndex, byteOffset, component, destType)`
  — reference-only (HLSLcc SSBO shape), needed if the emitter ever targets a
  non-WebGL2 backend or documents the pre-rewrite intermediate form.
- `lowerBoneTransformsToCb3` (package-time text pass; port of
  `lowerWebgl2SkinningAbi` + `lowerStructuredBoneLoad`).
- `lowerBlendIndicesToFloatAttribute` (package-time text pass, part of the same
  rewrite; port of the `in_BLENDINDICES` regex).
- `refuseNonSkinningStructuredLoad` (detection helper for section C).

### Edge cases
- NaN/inf: none introduced by the load itself; `uintBitsToFloat` is a pure
  bit-reinterpret, so any NaN bit pattern already in the buffer round-trips as
  NaN.
- The resource-operand swizzle indirection (`psSrc->aui32Swizzle[component]`)
  means component `c` of the destination is not guaranteed to read structure
  dword `c` — verify this against real corpus DXBC before assuming identity
  swizzle always holds.
- The row/index-agreement check in `lowerStructuredBoneLoad` requires **all 4**
  components to share the same `idx`/`byteOffset`; a destination write mask
  narrower than `.xyzw` (e.g. `.xy`) will not match the 4-load regex and will
  silently fail to rewrite — this is plausible for shaders that only need part of
  a bone row and needs explicit test coverage.
- `bSaturate` on `ld_structured` is legal per the generic post-switch handling
  but is not expected to appear in real bone/light-buffer loads; still must be
  implemented for correctness if the corpus is ever re-scanned with `_sat`
  detection.

### WebGL2 notes
- SSBOs (`buffer` blocks) do not exist in GLSL ES 3.00 at all; section A's
  output is fundamentally uncompilable in WebGL2 and must never reach the
  final package unless rewritten by section B.
- `layout(std430, binding=N)` is likewise unavailable in ES 3.00 (`std430` and UBO
  binding indices exist, but SSBO binding does not).

### Confidence
**High** for the `BoneTransforms`/`cb3` path (validated end-to-end:
`336/336` and `240/240` WebGL2 program links per
`TRANSPILING-GAPS.md:60-63` and `016-cewg-skinning-abi-lowering-for-ccpwgl-2026-06-30.md`).
**Low** for non-skinning `ld_structured` in pixel stages — no validated WebGL2
lowering exists; treat as blocked pending a decision.

---

## `store_structured` (930 instances)

### Semantics
Writes one or more 32-bit components of a structured-buffer element addressed by
a structure index and byte offset, per D3D11 `store_structured` (the inverse of
`ld_structured`; only valid against a UAV, since D3D11 `structured buffer`
read-only resources cannot be written).

### GLSL lowering
`TranslateShaderStorageStore`, case `OPCODE_STORE_STRUCTURED`
(`vendor/HLSLcc/src/toGLSLInstruction.cpp:1500-1583`, dispatched at
`toGLSLInstruction.cpp:4348-4357`). Operands: `psDest=asOperands[0]` (the UAV
resource, carrying the write mask via `OPERAND_4_COMPONENT_MASK_MODE`),
`psDestAddr=asOperands[1]` (struct index), `psDestByteOff=asOperands[2]` (byte
offset), `psSrc=asOperands[3]` (value to store).

For each component present in `psDest->ui32CompMask`:
```glsl
<name>_buf[<structIndexExpr>].value[(<byteOffExpr> >> 2u) + <comp>u] = <uint-or-int-cast>(src.<swz-or-x>);
```
(`toGLSLInstruction.cpp:1534-1582`). `dstOffFlag` follows the same
unsigned-unless-signed-typed rule as `ld_structured`. The source cast (`srcFlag`)
is `TO_FLAG_UNSIGNED_INTEGER` by default, flipped to `TO_FLAG_INTEGER` only when
`DeclareRWStructuredBufferTemplateTypeAsInteger` reports the target buffer as a
single-`int`-typed `RWStructuredBuffer<int4>` (the "avoid calling the wrong
`AtomicMin` overload" special case, `toGLSLDeclaration.cpp:998-1025`) — otherwise
the destination array element type is always `uint` (`toGLSLInstruction.cpp:1569-1572`).
Source components are consumed left-to-right via an incrementing `srcComponent`
counter if the source operand has more than one swizzle element, else always
`.x` (`toGLSLInstruction.cpp:1575-1578`).

### Type rules
- Destination index/byte-offset: same int/uint rule as `ld_structured`.
- Source value: bitcast to uint (default) or int (special RWStructuredBuffer<int>
  case) before storing — never stored as float, consistent with "backing array is
  always uint".

### Helpers needed
- `structuredStoreComponent(bufName, structIndex, byteOffset, component, value,
  srcType)` — reference-only; no WebGL2 target exists for this opcode (see below).

### Edge cases
- No destination register write, so `_sat` never applies (DXBC does not attach
  `_sat` to store instructions).
- Per-component write masking must exactly follow `psDest->ui32CompMask`
  (`OPERAND_4_COMPONENT_MASK_MODE`), not the source operand's own mask.

### WebGL2 notes
`store_structured` requires a writable UAV, which in turn requires an SSBO
(`buffer`, not `readonly buffer`) — completely unavailable in GLSL ES 3.00. No
package-time rewrite analogous to the `cb3` skinning path exists for writes
(there is no ccpwgl uniform target that plausibly receives a per-invocation
compute-style scatter write). **This opcode is out of scope for the WebGL2
emitter.** The 930 corpus instances should be treated as evidence this opcode
occurs in DX11 stages that are not shipped to the current WebGL2 vs/ps target
(the sampled corpus instance is `createhistograms.sm_depth`, tagged
`stageName: "geometry"` in `dx11-instruction-coverage.json` but much more
plausibly a mislabeled compute shader given the histogram-building workload
and its co-occurring `sync`/`dcl_thread_group`-shaped instruction in the same
file — see the `atomic_iadd` section for the one confirmed **non**-compute
counterexample in this family, `lensflareoccludert`, which is a pixel shader,
not compute); the emitter should detect and refuse rather than attempt
emission.

### Confidence
**Medium** on the HLSLcc reference lowering itself (directly read from source);
**high** on the WebGL2-scope conclusion (no counter-evidence of a vs/ps
`store_structured` shipping shader was found in the decision corpus, and the
project's own draft transpiler already special-cases the sibling UAV write
opcode `store_uav_typed` as a target blocker — see that section).

---

## `store_uav_typed` (642 instances)

### Semantics
Writes a full-precision (or format-converted) texel/element to a typed UAV
(`RWTexture*`/`RWBuffer`) at an integer address, per D3D11 `store_uav_typed`.

### GLSL lowering
Case `OPCODE_STORE_UAV_TYPED` (`vendor/HLSLcc/src/toGLSLInstruction.cpp:4359-4415`):
```glsl
imageStore(<uavName>, <addr-expr-by-dimension>, <value-cast-by-return-type>);
```
The address component mask and any `TO_AUTO_EXPAND_TO_VEC{2,3,4}` flag are chosen
from the UAV's reflected `REFLECT_RESOURCE_DIMENSION_*`
(`toGLSLInstruction.cpp:4382-4407`): 1D/Buffer → `.x` only; 2D/1DArray/2DMS →
`.xy` with `TO_AUTO_EXPAND_TO_VEC2`; 2DArray/3D/2DMSArray/Cube → `.xyz` with
`TO_AUTO_EXPAND_TO_VEC3`; CubeArray → `TO_AUTO_EXPAND_TO_VEC4`. The stored value
is translated with `ResourceReturnTypeToFlag(psRes->ui32ReturnType)` — i.e. cast
to match the UAV's declared return type (float/int/uint).

### Type rules
Value operand bitcast is driven entirely by the UAV's reflected return type
(`RETURN_TYPE_FLOAT`/`SINT`/`UINT`/`UNORM`/`SNORM`), not by any DXBC instruction
flag — this requires resource-binding reflection, which per
`CARBONENGINEJS-FORK.md:34-39` is frequently stripped in this project's shipped
DXBC and falls back to register-stable naming only (no return-type recovery
implied by that fallback).

### Helpers needed
None for the WebGL2 emitter proper — see WebGL2 notes. Reference-only helper:
`imageStoreTyped(uav, addr, value, returnType)`.

### Edge cases
- `imageStore` swizzle/expansion must match the UAV's declared dimensionality
  exactly, or GLSL will reject a texel with the wrong component count.
- Missing `RDEF` reflection (this project's normal stripped-DXBC case) leaves the
  return type unrecoverable, which independently blocks this opcode even before
  the SSBO/image-type gap is considered.

### WebGL2 notes
`image2D`/`imageBuffer` UAV types and `imageStore` are GLSL ES 3.10+ built-ins,
not part of ES 3.00. **Fully out of scope for the WebGL2 emitter.** This matches
the project's own draft-transpiler decision, which already lists
`store_uav_typed` as a hard `TARGET_BLOCKER_OPCODES` entry
(`../shaderdiscovery/src/core/transpiler/gles/Dx11GlesDraftTranspiler.js:130`) and
the `TRANSPILING-GAPS.md:100-114` "UAV and atomic path... blocked for current
WebGL2 target" decision. The emitter must detect `dcl_unordered_access_view_*`
declarations plus this opcode and refuse the stage (or the whole effect) with an
explicit diagnostic, never attempt best-effort emission.

### Confidence
**High** — corroborated independently by HLSLcc source, the draft transpiler's
explicit blocker list, and the shaderdiscovery decision log.

---

## `sync` (183 instances)

### Semantics
A compute-shader thread-group synchronization barrier. DXBC encodes which memory
domains/threads to synchronize via `ui32SyncFlags`: `SYNC_THREAD_GROUP_SHARED_MEMORY`,
`SYNC_UNORDERED_ACCESS_VIEW_MEMORY_GROUP`/`_GLOBAL`, and `SYNC_THREADS_IN_GROUP`.
It only has defined meaning inside a compute shader with a `dcl_thread_group` size.

### GLSL lowering
Case `OPCODE_SYNC` (`vendor/HLSLcc/src/toGLSLInstruction.cpp:3958-3984`):
```glsl
if (flags & SYNC_THREAD_GROUP_SHARED_MEMORY)                          memoryBarrierShared();
if (flags & (SYNC_UNORDERED_ACCESS_VIEW_MEMORY_GROUP|_GLOBAL))         memoryBarrier();
if (flags & SYNC_THREADS_IN_GROUP)                                    barrier();
```
Each condition independently emits its statement (not mutually exclusive; a
single `sync` instruction can emit all three lines).

### Type rules
N/A — no operands, no data type.

### Helpers needed
None — this opcode has no GLSL ES 3.00 equivalent to helper-wrap; see WebGL2
notes.

### Edge cases
None beyond the flag decoding itself (a bitmask, not an enum — must check all
three bits independently, not `switch`/`else if`).

### WebGL2 notes
`barrier()`, `memoryBarrier()`, and `memoryBarrierShared()` are **compute-shader-
only** built-ins in GLSL ES (introduced with ES 3.10 compute shaders); they do
not exist in the ES 3.00 vertex/fragment built-in set at all, and vertex/fragment
shaders have no thread-group concept regardless of GLSL version. **Fully out of
scope for the WebGL2 emitter.** Detect `sync` (and its precondition,
`dcl_thread_group`) and refuse the stage.

### Confidence
**High** — the DXBC semantics and the compute-only nature of `barrier`/
`memoryBarrier` in GLSL ES are unambiguous.

---

## `ld_raw` (54 instances)

### Semantics
Reads one or more 32-bit components from a raw (`ByteAddressBuffer`) resource at
a byte offset, per D3D11 `ld_raw` — same addressing model as `ld_structured` but
without a structure index (flat byte-addressed array).

### GLSL lowering
Same function as `ld_structured`, `TranslateShaderStorageLoad`, case
`OPCODE_LD_RAW` (`vendor/HLSLcc/src/toGLSLInstruction.cpp:1602-1606`, dispatched
at `toGLSLInstruction.cpp:4416-4425`). Operands: `psDest=asOperands[0]`,
`psSrcByteOff=asOperands[1]`, `psSrc=asOperands[2]` — no `psSrcAddr`, so the
`TranslateShaderStorageLoad` body skips the `[<idx>].value` indirection
entirely (`toGLSLInstruction.cpp:1661-1666`, gated on `if (psSrcAddr)`), producing:
```glsl
<bitcast_open><name>_buf[(<byteOffExpr> >> 2u) + <comp>u]<bitcast_close>
```
against a flat `uint`/`int` array (`vendor/HLSLcc/src/toGLSLDeclaration.cpp:1078-1088`,
`isRaw` branch: `uint <name>_buf[];` or `int <name>_buf[];` chosen by
`HaveUnsignedTypes`), not a `_type` struct array.

### Type rules
Identical bitcast-by-destination-type rule as `ld_structured` (float →
`uintBitsToFloat`, int → `int(...)`, uint → passthrough).

### Helpers needed
- `rawLoadComponent(bufName, byteOffset, component, destType)` — reference-only;
  see WebGL2 notes for scope.

### Edge cases
Same swizzle-indirection caveat as `ld_structured` (component addressing follows
the resource operand's own swizzle if present).

### WebGL2 notes
Same SSBO unavailability as `ld_structured` section A/C. No `cb3`-style rewrite
is known or defined for raw-buffer reads — the `BoneTransforms` rewrite is
specific to the structured-buffer `t0_buf[idx].value[...]` shape, not the flat
`t0_buf[...]` raw shape. **Out of scope for the WebGL2 emitter** unless/until a
specific raw-buffer resource is proven to need a package-time ABI rewrite
analogous to skinning.

The corpus table's "vs/ps" stage claim was overreach: the only sampled
instance in `dx11-instruction-coverage.json`'s `allOpcodeExamples` is
`graphics\effect.dx11\managed\space\specialfx\particles\gpu\emit.sm_depth`
tagged `stageName: "geometry"`, paired with the sibling `store_raw` opcode in
the exact same file/technique (also tagged `"geometry"`) — a GPU particle
emission pass, which is much more plausibly a compute-style workload than a
genuine vertex/pixel `ByteAddressBuffer` read. Do not assume `ld_raw` is
`vs/ps`-reachable without a concrete counter-example (unlike `atomic_iadd`,
which has one — see that section).

### Confidence
**Medium** — HLSLcc source lowering is directly read and clear, but no shipping
corpus evidence of `ld_raw` reaching a WebGL2-validated vs/ps program was found
(only 54 instances total, none flagged in the skinning/JointMat decision
trail); the sole sampled corpus example is paired with `store_raw` in a
likely-compute GPU-particle-emission shader, not a vs/ps stage.

---

## `store_raw` (54 instances)

### Semantics
Writes one or more 32-bit components to a raw UAV (`RWByteAddressBuffer`) at a
byte offset, per D3D11 `store_raw` — inverse of `ld_raw`.

### GLSL lowering
Same function as `store_structured`, `TranslateShaderStorageStore`, case
`OPCODE_STORE_RAW` (`vendor/HLSLcc/src/toGLSLInstruction.cpp:1519-1523`,
dispatched at `toGLSLInstruction.cpp:4338-4346`). Operands: `psDest=asOperands[0]`,
`psDestByteOff=asOperands[1]`, `psSrc=asOperands[2]` — no `psDestAddr`, so no
`[<idx>].value` indirection (`toGLSLInstruction.cpp:1546-1551`, gated on `if
(psDestAddr)`):
```glsl
<name>_buf[(<byteOffExpr> >> 2u) + <comp>u] = <uint-or-int-cast>(src.<swz-or-x>);
```

### Type rules
Same as `store_structured`: uint by default, int only for the special
single-int `RWStructuredBuffer<int4>`-shaped buffer detection (which does not
actually apply to raw buffers in practice, since that check is structured-buffer
specific, but the code path is shared).

### Helpers needed
- `rawStoreComponent(bufName, byteOffset, component, value, srcType)` —
  reference-only.

### Edge cases
No destination register, so `_sat` never applies.

### WebGL2 notes
Requires a writable UAV/SSBO — unavailable in ES 3.00. **Out of scope for the
WebGL2 emitter**; treat identically to `store_structured` (detect and refuse).

### Confidence
**Medium** — same reasoning as `ld_raw`; low corpus volume (54) with no
known vs/ps shipping path.

---

## `atomic_iadd` (27) / `imm_atomic_iadd` (24) / `imm_atomic_exch` (9) / `atomic_umax` (6) / `atomic_umin` (3)

Grouped: all five are handled by the single `TranslateAtomicMemOp` function and
differ only in GLSL function name and whether a previous-value destination
exists.

### Semantics
- `atomic_iadd` / `imm_atomic_iadd`: atomically add a value to a UAV or
  groupshared (TGSM) memory location; the `imm_` form additionally returns the
  pre-add value into a destination register, the non-`imm_` form discards it.
- `imm_atomic_exch`: atomically replace the memory location's value and return
  the previous value (exchange has no non-`imm_` counterpart in DXBC).
- `atomic_umax` / `atomic_umin`: atomically store `max`/`min` of the current
  value and the source value (unsigned comparison), discarding the previous
  value (no `imm_` variants observed in this corpus, though DXBC defines
  `imm_atomic_umax`/`umin` too).

### GLSL lowering
`TranslateAtomicMemOp` (`vendor/HLSLcc/src/toGLSLInstruction.cpp:1685-2087`,
dispatched at `toGLSLInstruction.cpp:4428-4450`). Per-opcode operand layout and
GLSL function name selected at the top of the function
(`toGLSLInstruction.cpp:1700-1935`):

| Opcode | `func` | operands (dest addr order) |
|---|---|---|
| `imm_atomic_iadd` | `"Add"` | `[0]=previousValue, [1]=dest, [2]=destAddr, [3]=src` |
| `atomic_iadd` | `"Add"` | `[0]=dest, [1]=destAddr, [2]=src` (no previousValue) |
| `imm_atomic_exch` | `"Exchange"` | `[0]=previousValue, [1]=dest, [2]=destAddr, [3]=src` |
| `atomic_umin` | `"Min"` | `[0]=dest, [1]=destAddr, [2]=src` |
| `atomic_umax` | `"Max"` | `[0]=dest, [1]=destAddr, [2]=src` |

Resource-kind detection (`toGLSLInstruction.cpp:1968-2011`): if `dest` is not
`OPERAND_TYPE_THREAD_GROUP_SHARED_MEMORY`, look up its UAV binding.
`RTYPE_UAV_RWTYPED` → `isUint = (returnType == RETURN_TYPE_UINT)` and derive
`texDim` (1/2/3) from the UAV's resource dimension; `RTYPE_UAV_RWSTRUCTURED` →
`isUint=false, ui32DstDataTypeFlag |= TO_FLAG_INTEGER` only if
`DeclareRWStructuredBufferTemplateTypeAsInteger` says so; TGSM defaults to
`isUint=true, texDim=0`. Then:
```glsl
ui32DataTypeFlag = isUint ? (TO_FLAG_UNSIGNED_INTEGER|TO_AUTO_BITCAST_TO_UINT)
                           : (TO_FLAG_INTEGER|TO_AUTO_BITCAST_TO_INT);
```
(`toGLSLInstruction.cpp:2013-2016`). If `previousValue` exists, it's assigned via
`AddAssignToDest(previousValue, isUint?SVT_UINT:SVT_INT, 1, ...)` **before** the
atomic call text is emitted (`toGLSLInstruction.cpp:2018-2019`). Final emitted
shape (`toGLSLInstruction.cpp:2021-2086`):
- Typed-UAV (image) form (`texDim>0`):
  ```glsl
  [prev =] imageAtomic<Func>(<uavName>, <addr>.<xy|xyz|x>, <src-cast>);
  ```
- Buffer/TGSM form (`texDim==0`):
  ```glsl
  [prev =] atomic<Func>(<name>[_buf][<addr> >> 2u], <src-cast>);
  ```
  where `<name>_buf[<addr>]` gains an extra `.value[<addrY> >> 2u]` indirection
  if the destAddr operand carries **two** swizzle components (X and Y) — "structured
  buf if we have both x & y swizzles" (`toGLSLInstruction.cpp:2055-2062`) — vs. a
  raw buffer's single-component addressing.
- No trailing `;` is appended when `previousValue` is set (the assignment prologue
  handles closing parens/semicolon via `AddAssignPrologue`); otherwise the line
  is terminated with `;\n` directly (`toGLSLInstruction.cpp:2081-2086`).

### Type rules
- Both `compare`/`src` (when present) are cast via the same
  `ui32DataTypeFlag` (`TO_AUTO_BITCAST_TO_UINT` or `_INT`), i.e. bitcast from the
  underlying float-vec4 register storage to whichever integer type the target
  memory location actually holds.
- `previousValue` destination type is `SVT_UINT` or `SVT_INT` matching `isUint`,
  never float directly (though the register itself is stored as float and
  bitcast at the destination-write site per this project's register model).
- These do **not** produce DXBC comparison masks; `atomic_umin`/`umax` compare
  internally to select which value to store, but the DXBC/GLSL result is the
  stored/previous *value*, not a boolean or 0xFFFFFFFF/0 mask.

### Helpers needed
None implementable for WebGL2 (see below). Reference-only helpers if ever
targeting ES 3.10+/desktop: `atomicUavOrTgsmOp(func, dest, addr, src,
[compare], [returnsPrevious])`.

### Edge cases
- `atomic_umin`/`atomic_umax` are unsigned-only per DXBC (`imin`/`imax` variants
  exist separately for signed); do not conflate with `atomic_imin`/`imax`.
- The 1-vs-2-swizzle-component destAddr distinction (structured vs. raw
  addressing within the same atomic path) must be preserved if this is ever
  ported.

### WebGL2 notes
`atomicAdd`/`atomicMin`/`atomicMax`/`atomicExchange`/`atomicCompSwap` (buffer/
shared-memory atomics) and `imageAtomicAdd` etc. (image atomics) are GLSL ES
3.10+ compute-shader-only built-ins; none exist in ES 3.00 vertex/fragment
shaders, regardless of which D3D11 stage the source instruction came from.
**Fully out of scope for the WebGL2 emitter.** Detect any `atomic_*`/
`imm_atomic_*` opcode and refuse the stage.

Do **not** rely on "these only occur in compute shaders" as the reason for
skipping this check in the pixel-stage emitter: `dx11-instruction-coverage.json`
(`initialCandidateOpcodeExamples`) records a concrete `atomic_iadd` instance in
`graphics\effect.dx11\managed\space\specialfx\lensflares\lensflareoccludert.sm_depth`
tagged `stageIndex: 1` / `stageName: "pixel"` — an actual D3D11 pixel shader
(D3D11.1 permits UAV access from pixel shaders; a lens-flare occlusion query
written into a UAV counter from the pixel stage is a plausible, ordinary
technique, not a mislabeled compute pass). The other four sampled corpus
instances of this opcode group (`atomic_iadd` again in `createhistograms.sm_depth`,
`imm_atomic_iadd` in `clear.sm_depth`, `imm_atomic_exch`/`atomic_umax`/
`atomic_umin` in `computelightlists.sm_depth`) are all tagged `stageName:
"geometry"` by the same tool, but those files' names (histogram building,
particle-buffer clear, light-list culling) are classic GPGPU compute-shader
workloads, and the coverage tool has no `"compute"` stage label at all in its
vocabulary (only `vertex`/`pixel`/`geometry`/`hull`) — those four are much
better explained as compute shaders whose slot the tool mislabels than as
genuine geometry shaders (a real DX11 geometry shader cannot declare
`dcl_thread_group`/`sync`, which the *sibling* `createhistograms.sm_depth`
example for the `sync` opcode does, and DXBC does not permit that in a
geometry stage). The `lensflareoccludert` pixel-stage instance is not
explained away by that reasoning and must be treated as real: the emitter's
**ps-stage translation path itself** needs the detect-and-refuse check, not
just a pre-filter that assumes this opcode class never survives into a vs/ps
compile.

`TRANSPILING-GAPS.md:100-114` ("UAV and atomic path... blocked for current
WebGL2 target... `atomic_iadd`: 6... Affects the `lensflareoccludert` path" —
note that count was measured on a narrower earlier corpus slice than this
family's 450k-instruction sweep, which shows 27) already names
`lensflareoccludert` as the blocked case; it does not itself claim the
instruction is compute-only, and the per-instruction corpus scan confirms it
is not.

### Confidence
**High** for the DXBC/GLSL semantics (read directly from source) and for the
WebGL2-out-of-scope conclusion (ES 3.00 has no atomics in any stage, so the
`lensflareoccludert` pixel-shader counterexample does not change the outcome).
**Medium** on the blanket "compute-only" framing carried over from the
project's decision log — confirmed false for at least the `lensflareoccludert`
`atomic_iadd` instance, which is a pixel shader; the emitter must not assume
this opcode family is filtered out before reaching ps-stage translation.

---

## `ld_uav_typed` (18 instances)

### Semantics
Reads a texel/element from a typed UAV (`RWTexture*`/`RWBuffer`) at an integer
address, per D3D11 `ld_uav_typed` — the read counterpart of `store_uav_typed`.

### GLSL lowering
Case `OPCODE_LD_UAV_TYPED` (`vendor/HLSLcc/src/toGLSLInstruction.cpp:4266-4336`).
Operands: `psDest=asOperands[0]`, `psSrcAddr=asOperands[1]`,
`psSrc=asOperands[2]` (UAV resource). Address component mask derived from
`psInst->eResDim` the same way as `store_uav_typed` (1/2/3 components,
`toGLSLInstruction.cpp:4281-4300`). Source data type resolved from the UAV's
reflected return type (`RETURN_TYPE_FLOAT/SINT/UINT/SNORM/UNORM`,
`toGLSLInstruction.cpp:4302-4325`, with `UNORM`/`SNORM` both mapping to
`SVT_FLOAT`). Emitted form:
```glsl
dest.mask = imageLoad(<uavName>, <addr-by-dimension>)<swizzle-with-mask>;
```
using `AddAssignToDest`/`AddAssignPrologue` for the destination, and
`TranslateOperandSwizzleWithMask` to apply the resource operand's own swizzle to
the 4-component `imageLoad` result restricted to the destination write mask
(`toGLSLInstruction.cpp:4327-4335`).

### Type rules
Destination component type follows the UAV's reflected return type, not a fixed
uint-array convention (unlike `ld_structured`/`ld_raw`) — `imageLoad` always
returns a 4-component vector of the sampler/image's declared base type
(`ivec4`/`uvec4`/`vec4`), then swizzled down to the requested mask.

### Helpers needed
None for WebGL2 (see below). Reference-only: `imageLoadTyped(uav, addr,
returnType)`.

### Edge cases
Requires resource-binding reflection (return type, dimension) exactly like
`store_uav_typed` — doubly blocked when `RDEF` is stripped, independent of the
image-type gap below.

### WebGL2 notes
`imageLoad` and image sampler types (`image2D` etc.) are ES 3.10+-only.
**Fully out of scope for the WebGL2 emitter.** Matches the draft transpiler's
explicit blocker (`Dx11GlesDraftTranspiler.js:129`) and the
`TRANSPILING-GAPS.md` UAV decision. With only 18 corpus instances (vs.
`store_uav_typed`'s 642), this is very likely the read side of a small set of
compute/UAV effects rather than any vs/ps-reachable code path — but the
concrete sampled instance (`dx11-instruction-coverage.json`, `allOpcodeExamples`)
is `graphics\effect.dx11\managed\space\postprocess\measureexposure.sm_depth`
(a tone-mapping average-luminance compute pass), **not** `lensflareoccludert`.
`lensflareoccludert` is confirmed by `TRANSPILING-GAPS.md:100-114` to carry
`dcl_unordered_access_view_typed`/`atomic_iadd` (and per this family's own
corpus scan, `atomic_iadd` there is a **pixel**-stage instance — see that
section); do not conflate the two effects or assume `ld_uav_typed`'s
compute-only reasoning transfers to `atomic_iadd`.

### Confidence
**High** — same corroboration as `store_uav_typed`, corrected to cite the
right sampled effect (`measureexposure.sm_depth`, not `lensflareoccludert`).

---

## `bufinfo` (0 instances — specified for completeness only)

### Semantics
Returns the element count of a structured/raw/typed buffer resource, per D3D11
`bufinfo` (used for bounds-checking dynamic buffer accesses).

### GLSL lowering
Case `OPCODE_BUFINFO` (`vendor/HLSLcc/src/toGLSLInstruction.cpp:4753-4766`):
```glsl
dest = <ctor>(<resourceName>_buf.length());
```
via `AddAssignToDest(dest, SVT_INT, 1, ...)` then
`<resourceName>_buf.length()` then `AddAssignPrologue`.

### Type rules
Result is always `SVT_INT` (a signed count), regardless of the buffer's element
type.

### Helpers needed
None — zero corpus instances; no helper is justified without evidence of use.

### Edge cases
N/A — not observed in this corpus.

### WebGL2 notes
`.length()` on a GLSL array returns a compile-time constant for fixed-size
arrays (legal in ES 3.00) but is a **run-time** query only for SSBO
runtime-sized arrays (`buffer T { ... x[]; }`), which do not exist in ES 3.00.
Since this opcode's only real use (bounds-checking a structured/raw buffer) is
tied to the same SSBO-only resource kinds as `ld_structured`/`ld_raw`, it would
be out of scope for the same reason if it appeared. Zero corpus instances means
no immediate action item, but the emitter should still recognize and refuse the
opcode defensively rather than silently mis-translate.

### Confidence
**Low** — zero real-world evidence in this corpus; semantics and lowering are
read directly from HLSLcc source but entirely unvalidated against any actual
shader.

---

## Helpers summary

Helpers the memory-structured family needs the emitter to provide (grouped by
whether they produce runnable WebGL2 output or are reference/detection-only):

**Shipping (WebGL2-runnable) helpers:**
1. `lowerBoneTransformsToCb3` — package-time text-rewrite pass that removes the
   HLSLcc `t0` SSBO declaration, grows `cb3.data[]` to at least 200 `vec4`s,
   strips the native bone-ring-buffer offset add, and rewrites each 4-component
   `t0_buf[idx].value[...]` row load to `cb3.data[26 + idx*3 + row]` (optionally
   swizzled). Port of `lowerWebgl2SkinningAbi` +
   `lowerStructuredBoneLoad` in `scripts/packageTr2WebglEffect.js:826-902`.
2. `lowerBlendIndicesToFloatAttribute` — package-time rewrite of
   `uvec4`/`ivec4`/etc. `in_BLENDINDICES<n>` vertex inputs to `vec<N>`, part of
   the same pass (`packageTr2WebglEffect.js:840-843`).

**Reference-only helpers** (mirror HLSLcc's non-WebGL2 SSBO/UAV/atomic/compute
lowering, useful for documentation, debugging, and any future non-WebGL2
backend, but must never be emitted as final WebGL2 output):
3. `structuredLoadComponent(bufName, structIndex, byteOffset, component, destType)`
4. `structuredStoreComponent(bufName, structIndex, byteOffset, component, value, srcType)`
5. `rawLoadComponent(bufName, byteOffset, component, destType)`
6. `rawStoreComponent(bufName, byteOffset, component, value, srcType)`
7. `imageLoadTyped(uav, addr, returnType)`
8. `imageStoreTyped(uav, addr, value, returnType)`
9. `atomicUavOrTgsmOp(func, dest, addr, src, compare?, returnsPrevious?)`

**Detection/refusal helpers** (must run before emission; there is no GLSL ES
3.00 lowering to fall back to):
10. `refuseComputeOnlyOpcode(opcodeName)` — for `sync`, `store_structured`
    (non-skinning), `store_raw`, `store_uav_typed`, `ld_uav_typed`,
    `atomic_iadd`, `imm_atomic_iadd`, `imm_atomic_exch`, `atomic_umax`,
    `atomic_umin`, and `bufinfo` should it ever appear.
11. `refuseNonSkinningStructuredLoad(resourceName)` — for `ld_structured` /
    `ld_raw` uses that are not the vertex-stage `BoneTransforms` skinning
    pattern (e.g. `LightBuffer`/`LightIndexBuffer` pixel-stage reads).

---

*Sources consulted: `vendor/HLSLcc/src/toGLSLInstruction.cpp`,
`toGLSLOperand.cpp`, `toGLSLDeclaration.cpp`, `HLSLccToolkit.cpp`,
`internal_includes/languages.h`; `vendor/HLSLcc/CARBONENGINEJS-FORK.md`;
`../shaderdiscovery/TRANSPILING-GAPS.md`; `../shaderdiscovery/AGENT-FINDINGS/decisions/005-`,
`016-`, `028-cewg-*`, `014-`/`015-`/`016-`/`017-joint-matrix-*`;
`../shaderdiscovery/src/core/transpiler/gles/Dx11GlesDraftTranspiler.js` (hints
only); `scripts/packageTr2WebglEffect.js`;
`../shaderdiscovery/artifacts/dx11-instruction-coverage.json` (per-instruction
stage ground truth, used to correct several "compute-only" stage-reality
claims); `../shaderdiscovery/artifacts/ab-shader-set/work/skinned_fxdirectionalv5/*.es300.glsl`
(actual generated fixture, used to correct the `ld_structured` cb3 worked
example).*
