# DXBC -> GLSL ES 3.00 Lowering Spec: `decl-io` Family

Status: Evolving
Scope: `@carbonenginejs/runtime/resource/formats/webgl` declaration and stage-I/O lowering
Audience: Shader translator maintainers and reviewers
Summary: Defines the DXBC declaration and I/O rules used by the GLSL emitter.

Target: GLSL ES 3.00 (WebGL2), vertex + pixel stages only. No SSBOs, no compute, no
tessellation/geometry stages (facts for those stages are cited where they explain
*why* a code path in the authority source is skipped, never as things this emitter
must implement).

Register model for this emitter (differs from stock HLSLcc, stated once here so every
section below can just say "the float vec4 register file"): every DXBC temp/output
register is stored as a `vec4` of floats. Instructions that need int or uint semantics
bitcast at the use site with `floatBitsToInt` / `floatBitsToUint` on read and
`intBitsToFloat` / `uintBitsToFloat` on write, exactly mirroring the bitcast operator
names HLSLcc itself uses when it emits its own (non-register-collapsed) integer path
(`GetBitcastOp`, `vendor/HLSLcc/src/toGLSLOperand.cpp:327-353`). Stock HLSLcc instead
runs `DataTypeAnalysis` and gives each temp register a native-typed shadow variable
(`u_xlatN` float, `u_xlatiN` int, `u_xlatuN` uint, ...). This spec calls out every
place our float-only convention diverges from that stock behavior.

Corpus counts (450k-instruction sweep, 1611 EVE Online DX11 effects), used to order
sections by real-world impact:

| Opcode | Count |
|---|---|
| `dcl_output` | 15197 |
| `dcl_input` | 11726 |
| `dcl_constant_buffer` | 10160 |
| `dcl_input_ps` | 6995 |
| `dcl_resource` | 6317 |
| `dcl_global_flags` | 5848 |
| `dcl_temps` | 5035 |
| `dcl_sampler` | 3277 |
| `dcl_output_siv` | 2825 |
| `dcl_resource_structured` | 684 |
| `dcl_input_ps_siv` | 538 |
| `dcl_input_ps_sgv` | 42 |
| `dcl_input_sgv` | 18 |
| `dcl_indexable_temp` | 16 |
| `dcl_input_siv` | 3 |
| `customdata` | 159 |

All line numbers below refer to `vendor/HLSLcc/src/toGLSLDeclaration.cpp`
unless another file is named.

---

## Emission order and `#version` boilerplate

Authority: `vendor/HLSLcc/src/toGLSL.cpp`.

HLSLcc builds the final GLSL text as two bstrings that get concatenated at the very
end (`toGLSL.cpp:1039` region: `// Concat extensions and glsl for the final shader
code.`):

1. `extensions` — seeded with the version string (`toGLSL.cpp:617`,
   `GetVersionString(LANG_ES_300)` returns `"#version 300 es\n"` at `toGLSL.cpp:387`),
   then every `#extension ... : require|enable` line added by `RequireExtension` /
   `EnableExtension` calls made while walking declarations and instructions.
2. `glsl` — populated in this order:
   a. `AddVersionDependentCode` (`toGLSL.cpp:93`, called at `toGLSL.cpp:647`) emits,
      for pixel shaders on an ES target (`toGLSL.cpp:307-328`):
      ```
      precision highp float;
      precision highp int;
      ```
      (int precision is forced to `highp` "to avoid issues on platforms that
      actually implement mediump" — comment at `toGLSL.cpp:326`). Vertex shaders get
      no default-precision block from this path.
   b. If the shader has any constant buffers or textures, two `#define` blocks for
      `UNITY_LOCATION`/`UNITY_BINDING`/`HLSLCC_ENABLE_UNIFORM_BUFFERS` macros
      (`toGLSL.cpp:667-691`). These are Unity-build plumbing; a from-scratch JS
      emitter does not need the macro indirection, only the concrete
      `layout(std140) uniform ... { vec4 data[N]; } cbN;` text it expands to when the
      macros are defined to `1` (the emitter should hardcode the "enabled" expansion,
      not restate the `#if`/`#else` machinery, since WebGL2 has no runtime toggle for
      it).
   c. `TranslateDeclaration` for every `Declaration` in bytecode order — this is the
      entire `decl-io` family plus every other declaration opcode.
   d. `void main() { ... }` with early-main redirect code, then translated
      instructions.

**WebGL2 note**: emit exactly `#version 300 es` as line 1, nothing before it (WebGL2
rejects any non-comment/non-whitespace token before `#version`). Do not emit the
`GL_FRAGMENT_PRECISION_HIGH` `#ifdef` dance used for `LANG_ES_100`
(`toGLSL.cpp:311-320`) — that branch is ES 2.0-only; ES 3.00 always has `highp`
fragment-shader float support and HLSLcc itself only takes the unconditional
`precision highp float;` branch for `LANG_ES_300` (`toGLSL.cpp:321-324`).

**Confidence: high** — this is a straight read of the concatenation order in
`toGLSL.cpp`, not a translated instruction whose semantics could be ambiguous.

---

## `dcl_global_flags` (5848)

**Semantics**: DXBC global shader flags (`D3D10_SB_GLOBAL_FLAGS`) declared once per
shader: refactoring-allowed, force-early-depth-stencil, enable double-precision float
ops, skip-optimization, enable raw/structured buffers, etc. Purely a compiler-hint
bitfield, not a register declaration.

**GLSL lowering**: `toGLSLDeclaration.cpp:2781-2809`. Only two bits produce any GLSL
text in our target subset:
- `GLOBAL_FLAG_FORCE_EARLY_DEPTH_STENCIL` on a pixel shader emits
  `layout(early_fragment_tests) in;\n` (`2785-2789`) unconditionally — no target
  language gate in the C++ source.
- `GLOBAL_FLAG_REFACTORING_ALLOWED` combined with `HavePreciseQualifier` emits four
  `precise <type> u_xlat_precise_<type>;` globals (`2790-2802`) — desktop-only
  qualifier gate, unreachable for `LANG_ES_300`.
- `GLOBAL_FLAG_ENABLE_DOUBLE_PRECISION_FLOAT_OPS` requires
  `GL_ARB_gpu_shader_fp64` (`2803-2807`) — desktop-only, unreachable for ES targets.

All other flag bits (skip-optimization, minimum-precision, enable-raw-and-structured,
force-early-*, all-resources-bound, etc.) are read by the decoder for correctness of
other lowering decisions but emit no GLSL text here.

**Type rules**: n/a — no operands, no register.

**Helpers needed**: none.

**Edge cases**: this instruction fires on almost every real shader (5848/1611 files ≈
one per shader stage), but the `FORCE_EARLY_DEPTH_STENCIL` bit itself is set on only a
minority of those. **WebGL2 note (important deviation from stock HLSLcc)**:
`layout(early_fragment_tests) in;` is a GLSL ES 3.10 / desktop-4.20 feature
(`GL_ARB_shader_image_load_store` era) and is **not part of GLSL ES 3.00** — WebGL2
will fail to compile a fragment shader containing this qualifier. Since the C++
source emits it unconditionally whenever the flag bit is set and the stage is a
pixel shader, this JS emitter must add a language gate stock HLSLcc does not have:
suppress the `layout(early_fragment_tests) in;` line entirely when targeting ES 3.00
(early-fragment-tests is a depth-test-ordering optimization hint only; skipping it is
always semantically safe, just potentially slower).

**Confidence: medium** — the flag-to-GLSL mapping is a direct source read (high
confidence), but whether any EVE shader in the corpus actually sets
`FORCE_EARLY_DEPTH_STENCIL` (making the WebGL2 gate load-bearing) was not verified
against the corpus in this pass.

---

## `dcl_temps` (5035)

**Semantics**: declares the count of general-purpose temporary registers (`r0..r{N-1}`)
used by the current shader phase (`D3D10_SB_OPCODE_DCL_TEMPS`, one dword: `ui32NumTemps`).

**GLSL lowering (stock HLSLcc)**: `toGLSLDeclaration.cpp:2425-2523`. For each temp
index `i`, HLSLcc's `DataTypeAnalysis` pass has already recorded which *native* GLSL
types that register was ever read/written as (`psFloatTempSizes[i]`,
`psIntTempSizes[i]`, `psUIntTempSizes[i]`, `psBoolTempSizes[i]`, plus 16/12/10-bit
minimum-precision and `fp64` variants), and HLSLcc declares one shadow variable per
type actually used, e.g.:
```
vec4 u_xlat0;
int u_xlati0;    // only if r0 was ever read/written as int
uint u_xlatu0;   // only if r0 was ever read/written as uint
```
(prefix macro `HLSLCC_TEMP_PREFIX` = `"u_xlat"`, `vendor/HLSLcc/include/hlslcc.h:127`).
On Switch targets only, each gets a `= <ctor>(0)` default initializer
(`2436-2498`) to dodge a false-positive uninitialized-variable compiler warning;
non-Switch targets declare with no initializer (`2501-2521`).

**GLSL lowering (this emitter's float-only register file — required deviation)**:
because this project does not run `DataTypeAnalysis` (that pass requires full
def/use dataflow over the instruction stream, ref: project brief), declare exactly
one `vec4` per temp index, unconditionally:
```
vec4 r0;
vec4 r1;
...
vec4 r{N-1};
```
Every instruction that consumes `rN` as int/uint wraps the read in
`floatBitsToInt(rN)` / `floatBitsToUint(rN)`; every instruction that produces an
int/uint result destined for `rN` wraps the write in `intBitsToFloat(...)` /
`uintBitsToFloat(...)` before assigning. This is the single largest structural
deviation from the stock HLSLcc temp-register model in this whole family — flag it
prominently to the instruction-family authors, since every arithmetic/logic opcode's
lowering depends on this convention holding for `dcl_temps`-declared registers.

**Type rules**: declared type is always `vec4` (float). Actual read/write type is
determined per-instruction by the consuming/producing opcode, not by this
declaration.

**Helpers needed**: none beyond the four bitcast builtins (already core GLSL ES 3.00,
not user-defined helpers).

**Edge cases**: initializing temps to zero (as HLSLcc does only for Switch) is *not*
required for GLSL ES 3.00/WebGL2 correctness in general, but this project's
`vec4(0.0)` fallback convention for signature-only outputs (see `dcl_output` below)
suggests the same defensive default-init could be applied here too if any code path
is ever found reading a temp before it is written; no corpus evidence of that has
been found (`TRANSPILING-GAPS.md` "Already handled" section reports 0 instruction
blockers). Recommend leaving temps uninitialized (matches non-Switch stock
behavior) unless a specific shader is found to depend on zero-init.

**Confidence: high** for the *stock* semantics (direct source read); **medium** for
the float-only deviation's completeness, since it depends on every opcode in the
sibling instruction-lowering families correctly bitcasting at every read/write site —
a single missed bitcast silently corrupts values without a compile error.

---

## `dcl_indexable_temp` (16)

**Semantics**: declares a dynamically-indexable local array of temp registers
(`x0[i]`-style addressing, as opposed to the flat `r#` file), used when HLSL source
has to write to computed indices (e.g. unrolled small loops writing into a local
array). Encodes register index, element count, and per-element component width.

**GLSL lowering**: `toGLSLDeclaration.cpp:3085-3092`:
```cpp
bformata(glsl, "vec%d TempArray%d[%d];\n", ui32RegComponentSize, ui32RegIndex, ui32RegCount);
```
i.e. `vec{ComponentSize} TempArray{RegIndex}[{RegCount}];` — component width (1-4)
comes directly from the DXBC declaration's `sIdxTemp.ui32RegComponentSize`, not from
signature/DataTypeAnalysis lookups.

**Type rules**: always declared as `float`-family vector (`vecN`), never `ivecN`/
`uvecN`, even in stock HLSLcc — indexable temps are HLSL-source local arrays, whose
element type is resolved by the DXBC compiler down to float storage before emission
in every observed case in this authority source. This emitter should mirror that:
declare `vecN TempArray{RegIndex}[RegCount];` where `N` is exactly the decoded
`ui32RegComponentSize` (do not force to `vec4` — unlike the flat temp-register file,
indexable-temp width is a hard DXBC-encoded fact, not a convention this project
gets to choose). Bitcast at use sites the same way as regular temps if any consumer
reads/writes it as int/uint.

**Helpers needed**: none.

**Edge cases**: rare (16 total instructions across the whole corpus) — low priority,
but get the declared width right since a mismatched vector size is a hard GLSL
compile error, not a silent bug.

**WebGL2 notes**: none beyond standard array declaration syntax, which GLSL ES 3.00
supports natively.

**Confidence: high** — single unconditional code path, no branching on target
language or shader stage.

---

## `dcl_constant_buffer` (10160)

**Semantics**: declares a constant-buffer binding (`cb#`) and its total `vec4`-slot
count, used by later `mov`/arithmetic instructions that read `cb#[i].component`.
Authoritative source for constant *names/offsets/layout* is Carbon/Trinity RDEF-derived
metadata, not this fork (`CARBONENGINEJS-FORK.md`: "Carbon/Trinity metadata remains
authoritative for ... per-frame and per-object constant buffer layout"); this fork's
job is only to keep the register-stable `cb#` GLSL symbol emitting correctly when that
reflection metadata is present *or stripped*.

**GLSL lowering — stripped-RDEF fallback (the path this project actually depends on)**:
`toGLSLDeclaration.cpp:2530-2559`. When `GetConstantBufferFromBindingPoint` returns
`nullptr` (no RDEF, or RDEF present but missing this specific buffer — the CarbonEngineJS
fork's stripped-reflection case, `CARBONENGINEJS-FORK.md` "Constant-buffer operands
emit fallback register access such as `cb3.data[0]`"), HLSLcc emits:
```cpp
bformata(glsl, "layout(std140) uniform %s {\n\tvec4 data[%d];\n} cb%d;\n",
    name, psOperand->aui32ArraySizes[1], ui32BindingPoint);
```
i.e. exactly:
```glsl
layout(std140) uniform ConstantBuffer3 {
    vec4 data[200];
} cb3;
```
where `ConstantBuffer{N}` is a synthesized block-type name (`name` built at
`2541-2542`, `sprintf(name, "ConstantBuffer%d", ui32BindingPoint)`), the instance
name is always `cb{N}` (`ui32BindingPoint`), and the array size is
`psOperand->aui32ArraySizes[1]` — the DXBC declaration's own encoded slot count, read
directly off the `dcl_constant_buffer` instruction, independent of any reflection
data. This `cbN.data[i]` register-stable access convention is the ABI this whole
project is built to preserve (`CARBONENGINEJS-FORK.md` "Runtime Contract";
`TRANSPILING-GAPS.md` records the cross-stage `ConstantBuffer0` size-mismatch bug
this produces when VS/PS declare different slot counts for the same `cb#` — normalize
to the maximum observed size across stages sharing a binding point before emitting).
If `UNITY_LOCATION`/binding macros are relevant (`2550-2555`) they add a
`UNITY_LOCATION(%d)` prefix, which this emitter should expand directly to
`layout(location = N)` text (WebGL2 has no runtime macro toggle, so skip the
`#if`/`#else` indirection described above).

**GLSL lowering — named/reflected path**: when RDEF metadata for the named cbuffer
*is* present, HLSLcc instead calls `DeclareUBOConstants`
(`877-997`, used when `HLSLCC_FLAG_UNIFORM_BUFFER_OBJECT` is set) or
`DeclareStructConstants` (`1094+`) to emit one named `float`/`vecN`/matrix member per
reflected constant, inside `uniform {CBufferName} { ... };`. This path is **not** the
ABI this project keeps stable end-to-end (Carbon metadata is the source of truth for
per-constant names/offsets, per `CARBONENGINEJS-FORK.md`); treat the fallback
`cbN.data[i]` form above as the primary target shape for this emitter, and the named
path as background context only.

**Type rules**: every `data[i]` slot is a `vec4` of floats; a `mov` or arithmetic
instruction reading `cb3.data[5].x` as an int/uint bitcasts with `floatBitsToInt` /
`floatBitsToUint` exactly like a temp register read (this project's cbuffers are
`vec4`-slot float storage regardless of the HLSL source's cbuffer member types,
mirroring how the fallback path above has no member-type information at all).

**Helpers needed**: none for the declaration itself.

**Edge cases**:
- Cross-stage size mismatch: VS and PS `dcl_constant_buffer` for the same binding
  point can carry different `aui32ArraySizes[1]` if each stage only reads a prefix of
  the buffer (`TRANSPILING-GAPS.md`, "AB hull test-set blockers" — `boostervolumetric`
  and `planeglow` failed WebGL2 *linking* because of this, not compilation). Emit the
  **max** slot count seen for a given `cb#` across the linked program's stages.
- Vulkan-subpass-input (`2561-2636`) and `OVR_multiview` (`2638-2664`) special cases
  are Vulkan/Unity-specific and out of scope for this project's DX11→WebGL2 EVE
  corpus. **Correction**: these two are the only special cases actually in the
  `2561-2670` range; the `"$Globals"` name check is a *different* piece of code, not
  located there. There are two distinct `$Globals`-related checks elsewhere in this
  file: (1) `psCBuf->name[0] == '$'` at `2674`, inside the *named/reflected* path
  (`2672-2687`), which chooses `DeclareStructConstants` over `DeclareUBOConstants`
  when `HLSLCC_FLAG_GLOBAL_CONSTS_NEVER_IN_UBO` is also set; and (2) the `"$Globals"`
  string checks inside `DeclareUBOConstants`/`DeclareStructConstants` themselves
  (`883`, `888`, `1105`, `1142`). None of this is reached by the stripped-RDEF
  fallback path this project depends on (that path returns at `2558` before any of
  `2561` onward runs) — so the conclusion ("$Globals is out of scope, handled
  generically by the synthesized `ConstantBufferN` name") still holds, just not for
  the reason/line-range originally cited.

**WebGL2 notes**: `layout(std140) uniform` blocks are core GLSL ES 3.00 — no
extension required. `std140` layout rules (16-byte vec4 alignment, `vec4 data[]`
array) mean every array element is a full 16 bytes regardless of the HLSL source
type, which is exactly why the flat `vec4 data[N]` fallback shape is both simple and
correct for any packed constant layout.

**Confidence: high** for the stripped-RDEF fallback shape (this is exactly what
`CARBONENGINEJS-FORK.md` documents as the load-bearing convention and what
`toGLSLDeclaration.cpp:2557` literally emits); **medium** on the cross-stage
normalization requirement, since that is a package/link-time policy documented in
`TRANSPILING-GAPS.md` as a known bug rather than something already fixed in
`toGLSLDeclaration.cpp` itself.

---

## `dcl_resource_structured` (684)

**Semantics**: declares a structured-buffer shader resource (`t#`) with a known
per-element byte stride, read via `ld_structured`. In EVE's skinned space-object
shaders this is `BoneTransforms` (a `Buffer<float4x3>`-shaped structured resource of
joint matrices), always paired with `ld_structured` in the instruction stream.

**GLSL lowering (stock HLSLcc)**: `toGLSLDeclaration.cpp:3680-3684` calls
`DeclareBufferVariable(..., isRaw=0, isUAV=0, ...)` (`1027-1092`), which emits an
SSBO. **Correction to the exact emitted text** (verified against `1042-1088`): the
struct member uses GLSL's `type[size] name;` array-declarator ordering, not
`type name[size];`, and the buffer *block* name is plain `t0` (`BufName`), not a
synthesized `t0_type_block_name` — the block's *member* variable is `t0_buf`:
```glsl
struct t0_type {
    uint[3] value;   // stride/4, via bformata("...\t%s[%d] value;\n...", typeStr, stride/4)
};
layout(std430, binding = N) readonly buffer t0 {
    t0_type t0_buf[];
};
```
(exact struct/instance naming per `1035-1088`; `readonly` is unconditional for
non-UAV structured buffers, `1069-1070`; on Switch targets only, the block name gets
an `hlslcc_readonly` prefix instead, `1073`).

**Stripped-RDEF fallback**: `CARBONENGINEJS-FORK.md` — "Structured-buffer
declarations tolerate missing `RDEF` bindings by using the stride encoded in the DXBC
declaration extension" — i.e. `psDecl->ui32BufferStride` is read directly off the
`dcl_resource_structured` instruction's declaration-extension dword rather than off
reflection metadata, so the struct-element count (`stride/4`) is always available
even with `RDEF` stripped (decision shard
`022-dxbc-dcl-resource-declaration-tails.md` covers the sibling `dcl_resource`
one-word-tail decoding that established this pattern).

**Type rules**: SSBO element type is `uint[]` (raw dwords); the consuming
`ld_structured` instruction bitcasts each loaded dword to float/int/uint as needed
at the read site (out of this family's scope — instruction family territory).

**Helpers needed**: none for the declaration text itself.

**Edge cases / WebGL2 notes (hard blocker, not a lowering detail)**: **GLSL ES 3.00
has no shader storage buffers** — `buffer` blocks require GLSL ES 3.10+ or desktop
`GL_ARB_shader_storage_buffer_object`. This emitter **must not** emit the SSBO form
above for a WebGL2 target; it will not compile. The proven working path for this
project is a **package-time ABI rewrite**, not a change to this opcode's GLSL
lowering:
- `CARBONENGINEJS-FORK.md` / `016-carbonwebgl-skinning-abi-lowering-for-ccpwgl-2026-06-30.md`
  / `TRANSPILING-GAPS.md`: drop the `t0` SSBO declaration entirely, grow the
  paired `ConstantBuffer3` (`cb3`) to at least `vec4 data[200]`, and rewrite every
  `ld_structured` row load against `t0` into `cb3.data[26 + blendIndex * 3 + row]`
  (the ccpwgl `EveShip2` `JointMat` uniform-block projection, `58` joints × `12`
  floats/joint = `696` floats appended at `cb3[26..199]`).
- This rewrite is package/runtime-ABI policy for the current ccpwgl compatibility
  target, **not** a native CarbonEngineJS/Trinity representation
  (`016-...md`, "Boundary" section) — a future non-ccpwgl consumer may want a real
  buffer-texture or uniform-array representation of `BoneTransforms` instead of this
  specific `cb3` splice.
- Validated: `skinned_quadv5.sm_converted_hi` 75/75 shaders translate, 336/336
  WebGL2 programs link after the rewrite; `skinned_quadheatv5` 63/63 / 240/240.

**Confidence: high** on both "stock HLSLcc emits an SSBO" and "WebGL2 cannot use
SSBOs" (directly cited, unambiguous); **medium** on the exact `cb3.data[26 + ...]`
offset formula for any *other* structured buffer this family's opcode might describe
in a shader outside the skinned space-object set — this is proven only for
`BoneTransforms` specifically, not as a general `dcl_resource_structured` policy.

---

## `dcl_resource` (6317)

**Semantics**: declares a texture shader-resource-view binding (`t#`) with a resource
dimension (1D/2D/3D/Cube/arrays/MS variants/buffer) and a 4-nibble per-component
return type (float/unorm/snorm/int/uint), consumed later by `sample*`/`ld`/`resinfo`
instructions.

**GLSL lowering**: `toGLSLDeclaration.cpp:2689-2758`. Non-Vulkan path:
1. Optional `UNITY_LOCATION(%d)` prefix (`2700-2718`) — expand directly to
   `layout(location = N)` for this project (see cbuffer section's note on macro
   indirection).
2. `RESOURCE_DIMENSION_BUFFER` → `uniform samplerBuffer`/`isamplerBuffer`/
   `usamplerBuffer` (`2722-2733`, requires `GL_EXT_texture_buffer` on ES targets,
   `1404-1405` inside `GetSamplerType`) — not expected in this project's vertex/pixel
   corpus (texel buffers are rare in EVE effects; treat as low-priority).
3. All 2D/1D/Cube/array-of-those dimensions → `TranslateResourceTexture(..., 1)`
   (`1597-1687`), which emits:
   ```glsl
   uniform <precision> <samplerType> t{N};
   ```
   and, only if the resource is a shadow-comparison texture
   (`psDecl->ui32IsShadowTex`), an *additional* `<samplerType>Shadow t{N}_shadow`-style
   binding (`1668-1686`) — this second declaration is **unconditional** on
   `ui32IsShadowTex`/`samplerCanDoShadowCmp` and fires regardless of whether
   `HLSLCC_FLAG_COMBINE_TEXTURE_SAMPLERS` is set (that flag is not tested anywhere in
   this code path). What the combine flag actually gates is a *separate*, earlier
   block (`1632-1657`, inside `TranslateResourceTexture`): when
   `HLSLCC_FLAG_COMBINE_TEXTURE_SAMPLERS` is set, HLSLcc emits one *additional*
   `uniform <samplerType> <name>;` per (texture, sampler) pair actually used together
   (name from `TextureSamplerName`, iterating `psDecl->samplersUsed`) — on top of, not
   instead of, the plain `t{N}` declaration at `1659-1666`. Since this project's
   `dcl_sampler` section concludes the combine flag is required for any GLSL-ES
   target, expect these extra per-combo uniforms to be emitted too, and confirm which
   name (`t{N}` vs. the combo name) the consuming `sample`/`sample_c` instruction
   family actually references before assuming plain `t{N}` is the only symbol that
   matters.
4. `TEXTURE2DMS`/`TEXTURE3D`/`TEXTURE2DMSARRAY` → `TranslateResourceTexture(..., 0)`
   (same emission, `samplerCanDoShadowCmp=0`, i.e. never a comparison sampler).

**Sampler-type selection** (`GetSamplerType`, `1388-1551`): base type name keyed on
`RESOURCE_DIMENSION` (`sampler2D`, `sampler3D`, `samplerCube`, `sampler2DArray`,
`samplerCubeArray`, `sampler2DMS`, `sampler2DMSArray`, `sampler1D`/`1DArray`,
`samplerBuffer`), then prefixed `i`/`u` if the resource's reflected
`RESOURCE_RETURN_TYPE` is `RETURN_TYPE_SINT`/`RETURN_TYPE_UINT` (`1406-1544`); every
other return type (`UNORM`/`SNORM`/`FLOAT`/`TYPELESS`) maps to the plain (float)
sampler. Return type comes from `ResourceBinding::ui32ReturnType`
(RDEF-reflected) when available; when RDEF is stripped, this fork's
`dcl_resource` one-word declaration-tail decoding
(`022-dxbc-dcl-resource-declaration-tails.md`) supplies the same fact from the raw
DXBC declaration instead: the trailing dword is four 4-bit return-type nibbles,
preserved as `declarationData.resourceReturnType` — decode return type from there
when no RDEF binding is found, rather than defaulting to float/unorm blindly.

**Texture type 3 == native 3D** (`027-texture-type-3-is-native-3d-not-legacy-atlas.md`):
DXBC/Carbon resource type `3` (`RESOURCE_DIMENSION_TEXTURE3D`) is an authoritative
native volume texture, not a legacy packed-2D-atlas convention some older ccpwgl code
assumed — lower it to `sampler3D`/`texture3D`-family calls, never collapse it into
`sampler2D`.

**Type rules**: the sampler's *component* return type (float vs int vs uint) governs
which `texture()`/`texelFetch()` overload the consuming instruction must call
(`vec4`- vs `ivec4`- vs `uvec4`-returning) — declaration-time fact, consumed by the
`sample`/`ld` instruction family (out of scope here beyond noting the dependency).

**Helpers needed**: none for the declaration; sampler precision comes from
`GetSamplerPrecision` (`1553-1569`) — **not** `highp` by default. The function only
returns `"highp "` when the resource's reflected precision is explicitly
`REFLECT_RESOURCE_PRECISION_HIGHP`; the `default`/`UNKNOWN`/`LOWP` case (`1560-1563`,
the path this project's stripped-RDEF fallback always hits, since there is no
reflected `ResourceBinding::ePrecision` to consult) returns `EmitLowp(...) ? "lowp "
: "mediump "`, and `EmitLowp` (`languages.h:69-73`) is `true` only for `LANG_ES_100` —
so for this project's `LANG_ES_300` target the *actual* default sampler precision
emitted is **`mediump`**, not `highp`. (WebGL2 does support `highp` samplers in
fragment shaders, unlike GLSL ES 1.00, but stock HLSLcc does not default to
requesting it — this project must decide separately whether to request `highp`
samplers, rather than assuming the stock lowering already does.)

**Edge cases**: MSAA resource dimensions (`TEXTURE2DMS`/`TEXTURE2DMSARRAY`) need
`GL_OES_texture_storage_multisample_2d_array` on ES targets for the array variant
(`1516-1519`) — WebGL2 exposes multisample textures but **not** `texelFetch` on them
from a fragment shader in the same way desktop does; treat multisample resources as
out-of-scope/low-confidence for this corpus unless a specific EVE effect is proven to
need them. Cube-array (`TEXTURECUBEARRAY`) needs
`GL_OES_texture_cube_map_array`/`GL_EXT_texture_cube_map_array` (`1608-1619`) — **not
core in GLSL ES 3.00**, only in 3.20/desktop or via those extensions, which are not
universally available on WebGL2 (`OES_texture_cube_map_array` is an optional WebGL2
extension) — flag as a target blocker if any EVE effect requires it without checking
extension availability at runtime.

**WebGL2 notes**: combined texture+sampler objects (GLSL `sampler2D` as a single
opaque uniform) are exactly WebGL2's own texture model — no separate texture/sampler
descriptor split is needed for this target (that split only matters for the Vulkan
backend in `TranslateVulkanResource`, out of scope).

**Confidence: high** for 2D/Cube/array dimension mapping (heavily used, directly
cited); **medium** for MS/cube-array/buffer dimensions (low corpus incidence, GLSL ES
3.00 extension availability not verified per-device).

---

## `dcl_sampler` (3277)

**Semantics**: declares a sampler-state binding (`s#`) — filter mode, address mode,
comparison mode, LOD clamp/bias — consumed by `sample`/`sample_c`/`sample_l`
instructions when combined with a `t#` resource via `dcl_resource`'s
`samplersUsed` set.

**GLSL lowering**: `toGLSLDeclaration.cpp:3348-3365`. For **non-Vulkan** targets (this
project's WebGL2 target), the entire case body is gated behind
`if (psContext->IsVulkan()) { ...; break; }` — falling through to `break;` with **no
GLSL text emitted at all** for OpenGL/GLSL/GLSL-ES targets. The separate sampler
object is *not* represented as its own GLSL declaration on this target; it is folded
into the combined `uniform sampler2D t{N};` declaration emitted by `dcl_resource`
above (`HLSLCC_FLAG_COMBINE_TEXTURE_SAMPLERS`-style combined texture+sampler model,
the only model GLSL ES 3.00 supports). The one piece of state this instruction does
carry into codegen is whether the sampler is a comparison sampler
(`D3D10_SB_SAMPLER_MODE_COMPARISON`) — that fact reaches
`TranslateResourceTexture`'s shadow-texture branch (`ui32IsShadowTex`, decided
upstream at declaration-plan time from which `s#`/`t#` pairs get used together in
`sample_c`-family instructions, not from this opcode's own GLSL emission path).

**Type rules**: n/a — no GLSL variable is produced for this opcode on WebGL2/GLSL
targets.

**Helpers needed**: none.

**Edge cases**: DX11 sampler-state fields that have no WebGL2 shader-side
representation at all (address mode, filter mode, LOD bias/clamp, anisotropy,
border color) are **runtime binding-state policy**, not shader text — they must be
applied via `gl.texParameteri`/`gl.samplerParameteri` from Carbon/Trinity sampler
metadata at draw time, entirely outside this translator
(`TRANSPILING-GAPS.md`, "Exporter and runtime policy": "WebGL sampler-state
application" is explicitly listed as deferred/out-of-scope for the DXBC reader and
draft transpiler).

**WebGL2 notes**: this is the single opcode in the family whose stock-HLSLcc-for-our-
target lowering is "emit nothing" — worth flagging clearly to the implementing
engineer so they don't go looking for a `s0` GLSL symbol; the register-stable name
`s0` only shows up in Carbon binding-manifest metadata (`CARBONENGINEJS-FORK.md`:
"`s0`" is one of the register-stable symbols this fork preserves for
`HlslEffectBindingManifest`), not in the GLSL source text itself.

**Confidence: high** — the Vulkan/non-Vulkan branch is unconditional and
unambiguous; the only judgment call is confirming this project always wants
`HLSLCC_FLAG_COMBINE_TEXTURE_SAMPLERS`-style combined sampling (yes — required for
any WebGL2/GLSL-ES target, since GLSL ES 3.00 has no separate sampler-object type).

---

## `dcl_input` (11726)

**Semantics**: declares a shader-stage input register (vertex-shader per-vertex
attribute, or any non-pixel stage's plain input) bound to an input-signature (ISGN)
row: semantic name/index, component mask, component type (float/sint/uint),
interpolation mode (non-VS stages).

**GLSL lowering**: `toGLSLDeclaration.cpp:2061-2186`. Several early-outs
(`2070-2105`) skip declaration for control-flow/thread-ID-style pseudo-inputs and
already-declared-as-array registers — none apply to plain vertex-shader attributes,
the dominant case in this corpus. For a normal vertex input:
1. Name: `GetDeclaredInputName` → `inputPrefix + semanticName + semanticIndex`
   (`HLSLCrossCompilerContext.cpp:169-211`); for a vertex shader `inputPrefix =
   "in_"` (`toGLSL.cpp:33`) — i.e. **`in_POSITION0`, `in_NORMAL0`, `in_TEXCOORD3`,
   `in_BLENDINDICES0`**, etc. This `in_<SEMANTIC><index>` naming is the register-
   stable vertex-attribute ABI surface Carbon metadata and package/runtime tooling
   bind against.
2. Storage qualifier: `"in"` for any target where `InOutSupported` is true
   (`2121-2127`) — true for `LANG_ES_300` (WebGL2's `in`/`out` keyword model, not the
   legacy `attribute`/`varying` GLSL ES 1.00 keywords).
3. Precision: `highp` unless the operand carries a `OPERAND_MIN_PRECISION_*` hint
   (`2129-2159`) — DXBC minimum-precision annotations are rare in this corpus; default
   to `highp` for all vertex attributes absent contrary evidence.
4. Component type/count (`DeclareInput`, `232-390`, using the ISGN row's
   `eComponentType` and `GetNumberBitsSet(ui32Mask)` for element count, **not** the
   operand's own write mask) → `float`/`vecN` (`INOUT_COMPONENT_FLOAT32`),
   `int`/`ivecN` (`SINT32`), or `uint`/`uvecN` (`UINT32`) (`265-291`).
5. Final text: `in <precision> <type> in_<SEMANTIC><index>;` (`362-388` default
   branch, non-array case — the common case for VS attributes).

**Attribute naming / BINORMAL→BITANGENT alias (load-bearing for this project)**:
HLSLcc derives the attribute name purely from the DXBC ISGN semantic string, which
for EVE's split-tangent-space vertex format is literally `BINORMAL` (`in_BINORMAL0`)
— but Carbon/Trinity per-vertex-stream metadata for that exact same GR2 mesh channel
calls it `BITANGENT`
(`../shaderdiscovery/knowledge/trinity-metadata/shader-discovery-truths.md:126-133`,
`../shaderdiscovery/knowledge/carbon-metadata-contract/hlslcc-transpile-spike.md:195-201`).
This is a **naming alias, not a semantic difference** — same vertex buffer channel,
two different names used by two different authorities. The proven fix is a
package-time rewrite, *after* HLSLcc emission, not a change to this opcode's GLSL
lowering itself: `scripts/packageTr2WebglEffect.js` normalizes every
`in_BINORMAL{n} -> in_BITANGENT{n}` for a vertex shader whose stage contract
declares a `BITANGENT` pipeline input, so the runtime's metadata-driven attribute
binder (which looks up attributes by the Carbon name) finds the symbol it expects.
Validated: `unpackedskinned_quadv5`/`unpackedskinned_quadheatv5` regenerated with no
`in_BINORMAL*` symbols remaining, still link (336/336, 80/80 WebGL2 programs).
**This emitter should keep emitting `in_BINORMALn`** (matching HLSLcc/DXBC ISGN
truth) **and rely on the package-time rewrite step**, not bake a BINORMAL→BITANGENT
special case into the opcode lowering itself — the alias is a runtime-ABI fact, not a
DXBC-to-GLSL translation fact.

**Type rules**: component type/count are ISGN facts (declaration-time), independent
of this project's float-register-file convention for `r#` temps — a vertex attribute
declared `uvec4` really is a GLSL `uvec4`-typed `in` variable at declaration time (see
next paragraph for why that is still a problem at the runtime-binding layer).

**Helpers needed**: `HandleInputRedirect` (`toGLSLDeclaration.cpp:1689-1806`) is an
HLSLcc-internal hull/domain-shader phase-input staging mechanism (`phase{N}_Input...`
temporaries) — out of scope for this project's vertex/pixel-only target; no
equivalent helper is needed here.

**Edge cases — the uvec/ivec attribute problem (required deviation, highest-priority
item in this family)**: stock HLSLcc, run as designed, declares integer-semantic
vertex inputs with their true GLSL integer vector type, e.g. `in uvec4
in_BLENDINDICES0;` for a `BLENDINDICES` stream reflected as `UINT32` component type
(`DeclareInput`, `270-274`). **This project's runtime (ccpwgl) binds all mesh
attribute channels, including blend indices, as float vertex attributes via
`gl.vertexAttribPointer` (not `vertexAttribIPointer`)** — a real `uvec4 in_...`
declaration either fails to link against that float-typed buffer binding, or links
but silently produces garbage/invisible geometry
(`028-carbonwebgl-skinned-blend-index-abi-lowering.md`: "Raw Carbon WebGL validation can link
integer attributes, but ccpwgl runtime binding can still fail or produce invisible
geometry if the source reaches compile as `uvec4`."). The proven, validated fix
(`028-...md`; `TRANSPILING-GAPS.md` "Ranked helper action plan" documents the general
version of this class of bug): **lower every integer-component-type `dcl_input`
vertex attribute to its float-vector equivalent at declaration time** —
```glsl
in vec4 in_BLENDINDICES0;   // not uvec4
```
and bitcast at every *use* site instead: any instruction reading `in_BLENDINDICES0`
as an index wraps it in `floatBitsToUint(in_BLENDINDICES0)` (or, if the actual buffer
data was uploaded as plain float index values rather than bit-pattern-encoded uints —
verify per-attribute — a plain `uint(in_BLENDINDICES0.x)` truncating conversion
instead of a bitcast; the Carbon WebGL lowering evidence describes casting at use sites but
does not pin down which of these two forms every producer used, see Confidence
below). This is the **general form** of the family-level "every register is a float
vec4" convention applied specifically to `dcl_input`: unlike the `r#` temp file
(where float-only storage is this project's own choice), for vertex attributes it is
required by a concrete runtime constraint (float-only `vertexAttribPointer` binding),
proven necessary by regression (skinned geometry disappearing) and proven sufficient
(336/336 and 240/240 WebGL2 programs pass after the rewrite) in the corpus evidence
cited above.

**WebGL2 notes**: GLSL ES 3.00 does support genuine integer vertex attributes
(`in uvec4`/`in ivec4` with `vertexAttribIPointer`) — the float-only lowering above is
not a GLSL-ES-3.00 *language* limitation, it is a **runtime binding-layer**
limitation specific to this project's current ccpwgl consumer. A future
CarbonEngineJS-native consumer that binds attributes with `vertexAttribIPointer`
could use the stock HLSLcc `uvec4`/`ivec4` declarations directly and should not
inherit this workaround by default.

**Confidence: medium** — the *requirement* to avoid integer vertex-attribute types is
high confidence (proven by a specific regression + fix with before/after link
counts); the *exact* per-attribute cast convention (bitcast-reinterpret vs.
truncating-convert at the use site) is not nailed down to opcode-level precision in
the cited evidence and should be confirmed against the actual uploaded vertex-buffer
encoding for each integer semantic (`BLENDINDICES` specifically is documented;
generalize cautiously to any other integer-typed vertex semantic found in the corpus).

---

## `dcl_input_ps` (6995)

**Semantics**: declares a pixel-shader input register (an interpolated varying from
the previous stage) bound to an ISGN row, carrying an explicit DXBC interpolation
mode (`INTERPOLATION_CONSTANT`/`LINEAR`/`LINEAR_CENTROID`/`LINEAR_NOPERSPECTIVE`/etc.)
that this instruction's own `value.eInterpolation` field encodes (distinct from plain
`dcl_input`, which has no interpolation-mode payload).

**GLSL lowering**: `toGLSLDeclaration.cpp:2217-2423`. Name via `GetDeclaredInputName`
with `inputPrefix = "vs_"` (when the previous stage is a vertex shader, the common
case for this corpus — `toGLSL.cpp:59-79`) → **`vs_<SEMANTIC><index>`**, matching the
vertex shader's `outputPrefix = "vs_"` output name exactly (`toGLSL.cpp:34`), which is
how HLSLcc keeps VS-output/PS-input varying names paired across the two independently
compiled GLSL stage sources. Storage qualifier `"in"` (`2228-2231`, `InOutSupported`
true for ES 300). Interpolation qualifier:
- integer component type (`UINT32`/`SINT32`) forces `flat ` regardless of the DXBC
  interpolation mode (`2238-2242`) — **GLSL spec requirement**, not a DXBC fact:
  integer varyings must be flat-interpolated in any GLSL version.
- otherwise, map `psDecl->value.eInterpolation` (`2245-2284`): `INTERPOLATION_CONSTANT`
  → `"flat "`; `LINEAR` → `""`; `LINEAR_CENTROID` → `"centroid "`;
  `LINEAR_NOPERSPECTIVE` → `"noperspective "` **only if** `hasNoPerspective` (true for
  `eTargetLanguage > LANG_ES_310`, i.e. **false for `LANG_ES_300`** — `2225`,
  `2263-2265`); `LINEAR_SAMPLE`/`LINEAR_NOPERSPECTIVE_SAMPLE` → `"sample "`/
  `"noperspective sample "` similarly gated.
- Precision: same `highp`/`mediump`/`lowp` mapping from `OPERAND_MIN_PRECISION_*` as
  `dcl_input` (`2287-2317`).
- Final text: `DeclareInput(...)` (`2418`) → same underlying emitter as `dcl_input`,
  producing `<interp>in <precision> <type> vs_<SEMANTIC><index>;`.

**Type rules**: identical component-type derivation to `dcl_input` (ISGN
`eComponentType` → `float`/`int`/`uint` base, `GetNumberBitsSet(mask)` → vector
width). The **integer-varying-must-be-flat** rule is a hard GLSL requirement in every
GLSL version, not a WebGL2-specific quirk — always emit `flat` for integer pixel
inputs regardless of the source DXBC interpolation mode field.

**Helpers needed**: none beyond core-language `flat`/`centroid` qualifiers (both core
in GLSL ES 3.00).

**Edge cases — framebuffer-fetch special case**: `2319-2416` handles reading back a
previously-written render target value (`SV_TargetN` bound both as PS input and PS
output, gated on `EXT_shader_framebuffer_fetch` + `HLSLCC_FLAG_SHADER_FRAMEBUFFER_FETCH`)
via `#define vs_SV_TargetN gl_LastFragData[N]` or a `layout(location=N) inout`
declaration. `GL_EXT_shader_framebuffer_fetch` **is not universally available in
WebGL2** and this project's target is standard WebGL2 fragment shaders reading only
their own current-fragment inputs — treat this branch as out of scope / not expected
to trigger in the EVE corpus; if it ever does, it is a target blocker requiring the
extension's presence to be verified at runtime, not silently assumed.

**WebGL2 notes**: `centroid`/`sample` interpolation qualifiers are core GLSL ES 3.00
keywords (no extension needed). `noperspective` is **not** — GLSL ES 3.00's spec does
not include `noperspective` as a keyword at all (it was added later, e.g. via
`NV_shader_noperspective_interpolation` for ES 3.0/3.1, and core only from ES 3.20);
WebGL2/ES 3.00 has no standard `noperspective` qualifier. The C++ source's own
`hasNoPerspective` gate (`eTargetLanguage <= LANG_ES_310 ? 0 : 1`, `2225`) is
therefore **correct as written, not stale or overly conservative** — it already
disables `noperspective` for `LANG_ES_300` (and `LANG_ES_310`) and only enables it for
targets above `LANG_ES_310`. This emitter should simply mirror that gate rather than
second-guess it: if any EVE pixel shader declares `INTERPOLATION_LINEAR_NOPERSPECTIVE`,
drop the qualifier for a `LANG_ES_300` target (falls back to perspective-correct
interpolation, a visible but non-fatal quality difference, vs. a hard compile error
from an unrecognized qualifier).

**Confidence: high** — the name-prefix pairing and integer-flat rule are high
confidence (direct source read, universal GLSL requirement); the
`noperspective`-in-ES-3.00 gate was re-checked directly against the GLSL ES 3.00
language facts (no `noperspective` keyword until ES 3.20 core / the
`NV_shader_noperspective_interpolation` extension) and confirmed correct as written,
so this is no longer an open question for this opcode.

---

## `dcl_output` (15197) — highest-frequency opcode in this family

**Semantics**: declares a vertex/pixel-shader output register (`o#`) bound to an
OSGN row (semantic name/index, component mask, component type), or (hull-shader
control-point phase only, not in this project's scope) routed to `gl_Position`.

**GLSL lowering**: `toGLSLDeclaration.cpp:2760-2779` → `AddUserOutput`
(`594-854`), gated by `OutputNeedsDeclaring` (`HLSLCrossCompilerContext.cpp:279-330`)
which dedups repeated partial-mask declarations of the same register via an
`acOutputDeclared` bitmask (a register can legally receive several `dcl_output`
instructions each covering a different component subset; only undeclared components
trigger new text).
- Component type/count: OSGN `eComponentType`/`GetNumberBitsSet(mask)` →
  `float`/`vecN` (`FLOAT32`), `int`/`ivecN` (`SINT32`), `uint`/`uvecN` (`UINT32`)
  (`622-655`) — identical derivation pattern to `dcl_input`.
- Precision: `highp`/`mediump`/`lowp` from `OPERAND_MIN_PRECISION_*` (`657-689`).
- **Pixel shader** (`691-795`): special output types first —
  `OPERAND_TYPE_OUTPUT_DEPTH` → plain `gl_FragDepth` (built-in, no declaration
  needed on GL/ES targets, `701-708`; the `EXT_frag_depth` `#define` shim at `703-706`
  is `LANG_ES_100`-only, irrelevant for ES 300 where `gl_FragDepth` is core).
  `OUTPUT_DEPTH_GREATER_EQUAL`/`OUTPUT_DEPTH_LESS_EQUAL` → `GL_ARB_conservative_depth`
  layout qualifiers (`709-723`) — **desktop-only extension, not available in GLSL ES
  3.00**; if an EVE pixel shader uses conditional depth output, this project must fall
  back to plain unconstrained `gl_FragDepth` writes (drop the `depth_greater`/
  `depth_less` hint — it is a performance hint only, never required for correctness).
  Otherwise (`725-793`, the common `SV_TargetN` case): name =
  `outputPrefix("") + semanticName + renderTargetIndex` i.e. plain `SV_TargetN`, and
  an explicit `layout(location = N) out <precision><type> SV_TargetN;` the first time
  render target `N` is seen (`748-789`). **Correction to the gating fact**: the
  `layout(location=N)` here is *not* gated by `HaveInOutLocationQualifier` — that
  function (`languages.h:102-109`) is `false` for `LANG_ES_300` (only `true` for
  `>=LANG_410` or `LANG_ES_310`). The actual gate at `752-753` is
  `HaveInOutLocationQualifier(...) || HaveLimitedInOutLocationQualifier(...)`, and it
  is `HaveLimitedInOutLocationQualifier` (`languages.h:93-100`, explicitly commented
  "Only on vertex inputs and pixel outputs") that returns `true` for `LANG_ES_300`,
  satisfying the `||` and producing the explicit location. Net behavior is unchanged
  (ES 300 pixel outputs do get `layout(location=N)`), but the responsible function is
  `HaveLimitedInOutLocationQualifier`, not `HaveInOutLocationQualifier` — worth getting
  right since the two gates diverge for other declarations in this same family (see
  `dcl_input`'s vertex-attribute declaration below, which tests
  `HaveInOutLocationQualifier` alone and therefore does *not* get an explicit location
  on `LANG_ES_300`). WebGL2 **requires** explicit `layout(location=N)` for any
  multi-render-target fragment shader (no implicit `gl_FragData[N]` indexing in the
  ES 3.00 core profile; `WriteToFragData` is true only for legacy/ES 100 targets).
- **Vertex shader** (`796-846`, the common case here since this project has no
  geometry/hull/domain stages): name =
  `outputPrefix("vs_") + semanticName + semanticIndex` → **`vs_<SEMANTIC><index>`**
  (`804`), matching the pixel shader's `vs_`-prefixed input names described above.
  Interpolation: integer types forced `flat` (`810-814`), float types resolved from
  cross-stage dependency data (`GetInterpolationMode`, `815-818`) — in practice this
  project should resolve interpolation per-varying from the **pixel shader's**
  `dcl_input_ps` `value.eInterpolation` for the same semantic, since that is the only
  side that actually encodes an interpolation mode in DXBC (vertex-shader outputs
  carry no interpolation-mode field of their own). `layout(location=N)` from
  `GetVaryingLocation` (`821-825`) — WebGL2 requires **matching** explicit varying
  locations between the two independently compiled VS/PS GLSL programs when using
  explicit locations, or (simpler, and what this project should default to) omit
  `layout(location=...)` for varyings entirely and let the GLSL **linker** match by
  name — WebGL2/GLSL ES 3.00 supports both; matching by name avoids a whole class of
  location-numbering bugs across independently emitted VS/PS sources and is
  recommended here. Final text: `<interp>out <precision><type> vs_<SEMANTIC><index>;`
  (`838`).
- Early-out: register 0 with legacy `"POS"` semantic name in a vertex shader returns
  without declaring anything (`619-620`) — that register is expected to be routed to
  `gl_Position` via a separate `dcl_output_siv` `NAME_POSITION` declaration elsewhere
  in the same instruction stream (see next section); do not double-declare it.

**Type rules**: identical component-type/count derivation to `dcl_input`/
`dcl_input_ps` (OSGN-driven, not write-mask-driven). The destination write mask on
the *declaration* itself only ever narrows which components get declared this pass
(merged across multiple partial declarations via `acOutputDeclared`); it has no
`_sat` concept — `saturate` only applies to the *instructions* that write the
register, never to a `dcl_output` declaration itself.

**Helpers needed**: `HandleOutputRedirect` — like `HandleInputRedirect`, this is
HLSLcc's hull-shader phase-output staging machinery; out of scope for this project's
vertex/pixel-only target.

**Edge cases — signature-only vertex outputs**: `023-signature-only-vertex-output-fallback.md`
documents `starmapnew`/`ubershader3d` variants whose OSGN declares outputs (`o3
-> COLOR2`, `o4 -> TEXCOORD1`, etc. for `starmapnew`; `o2 -> COLOR1`, `o7 ->
TEXCOORD4` for `ubershader3d`) with **no corresponding bytecode write** anywhere in
the instruction stream (audited: `references: 0`). GLSL ES 3.00 does not guarantee
zero-initialization of `out` varyings, and reading an unwritten varying downstream is
undefined/implementation-defined — this project's proven, adopted policy is to emit
an explicit deterministic zero-fill in early-main for any declared-but-never-written
output: `vs_COLOR2 = vec4(0.0);` before the translated instruction stream runs. Treat
this as expected, not a parser bug, for any output register with zero write
references.

**WebGL2 notes**: `layout(location=N)` for fragment-shader color outputs is
mandatory when more than one is declared (no implicit indexing); prefer
name-based linking (no `layout(location=...)`) for VS→PS varyings specifically,
per the recommendation above, to avoid cross-stage location-numbering mismatches.

**Confidence: high** for the SV_Target/varying declaration shape and naming
convention (heavily used, directly cited, corpus-validated linking counts exist
elsewhere in this family for related opcodes); **medium** for the
"resolve VS-output interpolation from the paired PS-input's `dcl_input_ps` mode"
policy recommendation, since that is this spec's own synthesis of how to handle
cross-stage interpolation resolution for a from-scratch JS emitter, not a literal
restatement of an already-proven CarbonEngineJS-fork behavior.

---

## `dcl_output_siv` (2825)

**Semantics**: declares a vertex/geometry/domain-shader output register bound to a
**system-value** semantic (`SV_Position`, `SV_RenderTargetArrayIndex`,
`SV_ClipDistance`, `SV_CullDistance`, `SV_ViewportArrayIndex`, `SV_PrimitiveID`, plus
tessellation-factor system values not relevant to this project's VS/PS-only scope)
rather than an arbitrary user semantic.

**GLSL lowering**: `toGLSLDeclaration.cpp:1899-2058`, switch on
`psDecl->asOperands[0].eSpecialName`:
- `NAME_POSITION` → `AddBuiltinOutput(psDecl, 0, "gl_Position")` (`1903-1907`) — the
  **only** system value this project's vertex-shader corpus needs. `gl_Position` is
  built-in in every GLSL version; no declaration text at all is emitted for it (the
  register's read/write sites are simply redirected to the literal string
  `gl_Position` instead of a synthesized varying name — see `AddBuiltinOutput`,
  `413-...`, and note it early-returns immediately for any special name other than
  `NAME_CLIP_DISTANCE`/`NAME_CULL_DISTANCE`, `419-420`, meaning **for `NAME_POSITION`
  specifically this call is a pure no-op**: the redirection to `gl_Position` as an
  operand string happens entirely in the instruction-translation/operand layer, not
  here).
- `NAME_RENDER_TARGET_ARRAY_INDEX` → `gl_Layer`, requiring
  `GL_AMD_vertex_shader_layer` on a vertex shader (`1908-1928`) — **not standard in
  GLSL ES 3.00/WebGL2**; this is a desktop-GL vendor extension. Multi-layer
  rendering from a vertex shader is out of scope for this project's target; treat as
  a target blocker if encountered, not a silently-degraded feature.
- `NAME_CLIP_DISTANCE`/`NAME_CULL_DISTANCE` → `gl_ClipDistance`/`gl_CullDistance`
  (`1929-1938`), requiring `GL_EXT_clip_cull_distance` on ES targets
  (`449` inside `AddBuiltinOutput`) — this is a **real, available WebGL2 extension**
  (`EXT_clip_cull_distance`), but is optional/not universally supported; treat as
  conditionally available, verify at runtime before relying on it.
- `NAME_VIEWPORT_ARRAY_INDEX` → `gl_ViewportIndex` (`1939-1943`) — desktop-only
  (`GL_ARB_shader_viewport_layer_array`/`GL_NV_viewport_array2`), no WebGL2
  equivalent; out of scope.
- `NAME_PRIMITIVE_ID` → `gl_PrimitiveID` (`1949-1953`) — vertex shaders cannot write
  `SV_PrimitiveID` in D3D (it is a geometry-shader-only output there); this branch is
  reached only for geometry shaders, out of this project's scope.
- `NAME_VERTEX_ID`/`NAME_INSTANCE_ID`/`NAME_IS_FRONT_FACE` → `ASSERT(0)` (`1944-1963`,
  these are never legal *outputs*, only inputs — DXBC-level invariant, not a lowering
  choice).
- Tessellation-factor names (`NAME_FINAL_*_TESSFACTOR`, `1964-2047`) → hull-shader-only
  `gl_TessLevelOuter`/`gl_TessLevelInner` array slots; entirely out of this project's
  vertex/pixel-only scope.

**Type rules**: `gl_Position` is always `vec4`; the `_siv` declaration itself carries
no separate component-type fact beyond what the built-in GLSL variable already
mandates.

**Helpers needed**: none — every reachable case in this project's scope
(`NAME_POSITION`) redirects to a language built-in with zero emitted declaration
text.

**Edge cases**: the DXBC-level invariant that `SV_Position` is always written in a
vertex shader means this opcode should appear at least once per vertex-shader stage
in the corpus (2825 occurrences across 1611 files' vertex + pixel-adjacent stages is
consistent with "roughly one per vertex/domain/geometry stage, most of which are
plain VS-only stages here").

**WebGL2 notes**: of the system values this opcode can carry, only `SV_Position` (no
extension) and, conditionally, `SV_ClipDistance`/`SV_CullDistance`
(`EXT_clip_cull_distance`, optional) have any real WebGL2 story; every other branch
listed above is a target blocker for this project's WebGL2 scope, not a lowering
detail to implement.

**Confidence: high** for `NAME_POSITION` (dominant case, direct source read,
`TRANSPILING-GAPS.md` "Already handled": "`SV_Position`... [is] handled"); **low**
for every other branch, since none of them are exercised in this project's proven
VS/PS-only WebGL2 validation runs.

---

## `dcl_input_ps_siv` (538)

**Semantics**: declares a pixel-shader input bound to a system-value semantic
(`SV_Position` as `gl_FragCoord`, or `SV_RenderTargetArrayIndex` as `gl_Layer`).

**GLSL lowering**: `toGLSLDeclaration.cpp:2188-2207`:
- `NAME_POSITION` → `AddBuiltinInput(psDecl, "gl_FragCoord")` (built-in, no
  declaration text — `gl_FragCoord` is core GLSL ES 3.00), **plus** an early-main
  statement:
  ```glsl
  vec4 hlslcc_FragCoord = vec4(gl_FragCoord.xyz, 1.0/gl_FragCoord.w);
  ```
  (`2195`) — every read of the DXBC `SV_Position` pixel-shader input must be
  redirected to `hlslcc_FragCoord`, **not** raw `gl_FragCoord`: the literal C++
  text takes `gl_FragCoord.xyz` unchanged but replaces the `.w` component with
  `1.0/gl_FragCoord.w`, reconciling a difference between what HLSL's
  `SV_Position.w` and GLSL's `gl_FragCoord.w` each store in the 4th component.
  Treat `hlslcc_FragCoord` as the mandatory redirect target for any
  `SV_Position`-as-input read in a pixel shader, not `gl_FragCoord` directly — do
  not attempt to re-derive or "simplify" the `1.0/gl_FragCoord.w` swap, just
  reproduce the line as emitted.
- `NAME_RENDER_TARGET_ARRAY_INDEX` → `gl_Layer` (`2198-2201`) — reading back which
  array layer/cubemap face the primitive rasterized into; requires geometry-shader
  layered rendering upstream, out of this project's scope.
- Anything else → `ASSERT(0)` (`2203-2205`) — DXBC-level invariant, no other system
  value is legal as a pixel-shader `_siv` input.

**Type rules**: `gl_FragCoord`/`hlslcc_FragCoord` is always `vec4`.

**Helpers needed**: the `hlslcc_FragCoord` early-main redirect line above — declare
it as a **named helper convention** (a fixed early-main statement emitted whenever a
`dcl_input_ps_siv NAME_POSITION` is seen), not a callable function, since it is a
local variable substitution rather than a reusable GLSL function.

**Edge cases**: `1.0/gl_FragCoord.w` divides by the fragment's window-space `w`
reciprocal — if `gl_FragCoord.w` is ever exactly `0.0` (a fragment at infinite
depth/degenerate clip-space w), this produces `inf`; no corpus evidence this occurs
in practice (fragments with `w=0` do not typically survive clipping), but note it as
a theoretical NaN/inf source worth being aware of, not one this project needs to
guard defensively against absent contrary evidence.

**WebGL2 notes**: `gl_FragCoord` is core; no extension needed. `gl_Layer` requires
geometry-shader support, out of scope for this project.

**Confidence: high** for `NAME_POSITION` (directly cited, dominant case — 538
occurrences is consistent with "most pixel shaders read `SV_Position`"); **low** for
`gl_Layer` (unreachable without geometry shaders in this project's stage set).

---

## `dcl_input_ps_sgv` (42) / `dcl_input_sgv` (18)

**Semantics**: declares a pixel-shader (`_ps_sgv`) or vertex/other-stage (`_sgv`)
input bound to a **system-generated-value** semantic — the DXBC category for values
the *rasterizer/assembler* synthesizes rather than values passed through the
interpolator pipeline: `SV_IsFrontFace`, `SV_SampleIndex`, `SV_VertexID`,
`SV_InstanceID`, `SV_PrimitiveID`, plus the same position/layer/clip/cull/viewport
names `_siv` also carries (both opcodes share one switch statement in the source).

**GLSL lowering**: `toGLSLDeclaration.cpp:1815-1896` (both opcodes dispatch to this
single `case` block). The branches relevant to this project's VS/PS-only scope:
- `NAME_IS_FRONT_FACE` (pixel-shader-only in practice — `SV_IsFrontFace` is a PS
  input) → `gl_FrontFacing`, with an explicit **cast trick**
  (`1856-1869`):
  ```cpp
  if (HaveUnsignedTypes(psContext->psShader->eTargetLanguage))
      AddBuiltinInput(psDecl, "(gl_FrontFacing ? 0xffffffffu : uint(0))");
  else
      AddBuiltinInput(psDecl, "(gl_FrontFacing ? 1 : 0)");
  ```
  The comment explains why: `if(gl_FrontFacing != 0)` failed to compile on Intel HD
  4000 — no implicit bool↔int conversion on that driver — so HLSLcc always
  materializes the DXBC **comparison-mask convention** explicitly at the point of
  use: `SV_IsFrontFace` in DXBC is an integer that reads as `0xFFFFFFFF` (true) or
  `0x00000000` (false), **not** a GLSL `bool`. For GLSL ES 3.00 (`HaveUnsignedTypes`
  true), every read of this input must produce `0xffffffffu`/`uint(0)`, then get
  bitcast with `uintBitsToFloat(...)` if the register file stores it as a float (per
  this project's register convention) — i.e. the declaration-time substitution text
  for `in_IS_FRONT_FACE`-style reads should literally be
  `(gl_FrontFacing ? uintBitsToFloat(0xffffffffu) : uintBitsToFloat(uint(0)))` when
  materializing it into this project's float register file, or equivalently
  `uintBitsToFloat(gl_FrontFacing ? 0xffffffffu : 0u)` (matches the JS draft
  transpiler's own hypothesis at
  `../shaderdiscovery/src/core/transpiler/gles/Dx11GlesDraftTranspiler.js:1405`:
  `splatScalarExpression("uintBitsToFloat(gl_FrontFacing ? 0xffffffffu : 0u)", count)`
  — cross-checked against `toGLSLDeclaration.cpp:1864-1867` and confirmed
  consistent).
- `NAME_SAMPLE_INDEX` → `gl_SampleID`, requiring `GL_OES_sample_variables` on ES
  targets (`1870-1876`) — this **is** a real, available WebGL2 extension
  (`OES_sample_variables`), but optional; treat as conditionally available.
- `NAME_VERTEX_ID` → `gl_VertexID` (`1878-1881`) — core in GLSL ES 3.00 for vertex
  shaders, no extension needed. `TRANSPILING-GAPS.md` "Already handled":
  "`SV_VertexID`... [is] handled."
- `NAME_INSTANCE_ID` → `gl_InstanceID` (`1851-1854`) — core in GLSL ES 3.00, no
  extension needed.
- `NAME_PRIMITIVE_ID` → `gl_PrimitiveID`/`gl_PrimitiveIDIn` (`1883-1889`) — requires a
  geometry shader upstream in practice, out of scope.
- `NAME_RENDER_TARGET_ARRAY_INDEX`/`NAME_CLIP_DISTANCE`/`NAME_CULL_DISTANCE`/
  `NAME_VIEWPORT_ARRAY_INDEX` (`1826-1850`) — same extension caveats as the `_siv`
  output section above.
- `default` (`1891-1894`) — falls back to a plain `in vec4 %s;` declaration using the
  DXBC-provided special-name string directly, for any system-generated value this
  switch doesn't special-case.

**Type rules**: `gl_FrontFacing` is GLSL `bool`; every other value in this list is
`int` (`gl_VertexID`, `gl_InstanceID`, `gl_SampleID`, `gl_PrimitiveID`). None of these
match DXBC's `0xFFFFFFFF`/`0x00000000` mask convention natively except
`SV_IsFrontFace`, which is why it alone gets the explicit ternary-to-mask
materialization above; `gl_VertexID`/`gl_InstanceID`/etc. are read as plain signed
`int` and bitcast with `intBitsToFloat` when stored into this project's float
register file (not `uintBitsToFloat` — these are genuinely signed-int builtins in the
GLSL spec, unlike the synthesized front-facing mask).

**Helpers needed**: none beyond the inline ternary-to-mask expression for
`SV_IsFrontFace` (a fixed substitution text, not a callable helper function).

**Edge cases**: `SV_IsFrontFace`'s `0/0xFFFFFFFF` convention is exactly the
**comparison-mask convention** called out at the top level of this spec family — even
though this is a *declaration*-family opcode rather than an instruction, it is one of
the few `decl-io` opcodes where the DXBC 0/0xFFFFFFFF-vs-GLSL-bool boundary has to be
crossed at declaration time rather than left to a later comparison instruction.

**WebGL2 notes**: `gl_VertexID`/`gl_InstanceID`/`gl_FrontFacing` are all core GLSL ES
3.00 (no extension) — the dominant, high-confidence cases for this project.
`gl_SampleID` needs an optional extension; primitive-ID/layer/clip/cull/viewport
branches need geometry-shader support this project's target does not have.

**Confidence: high** for `NAME_IS_FRONT_FACE`/`NAME_VERTEX_ID`/`NAME_INSTANCE_ID`
(directly cited, corpus-relevant, `TRANSPILING-GAPS.md`-confirmed); **low** for every
other branch (geometry-shader-dependent or low corpus incidence: 42+18=60 total
instances is small next to the 15k+ `dcl_output` count, and most of that 60 is
plausibly `SV_IsFrontFace`/`SV_VertexID` given this corpus is VS/PS-dominated).

---

## `dcl_input_siv` (3)

**Semantics**: declares a non-pixel-shader input bound to a system-value semantic
(shares the `NAME_*` enum with `dcl_output_siv`/`dcl_input_ps_siv`/`dcl_input_sgv`,
but with its own narrow handling).

**GLSL lowering**: `toGLSLDeclaration.cpp:2209-2215`:
```cpp
case OPCODE_DCL_INPUT_SIV:
{
    if (psShader->eShaderType == PIXEL_SHADER && psContext->psDependencies)
    {
        psContext->psDependencies->SetInterpolationMode(psDecl->asOperands[0].ui32RegisterNumber, psDecl->value.eInterpolation);
    }
    break;
}
```
This opcode emits **no GLSL text of its own** in this project's scope. Its only
effect is recording an interpolation-mode fact for a later `dcl_input_ps`/
`dcl_input` declaration of the *same register* to consume when choosing that
declaration's interpolation qualifier — and only when the current shader is itself
the pixel shader (unreachable in the VS/PS pair unless this specific opcode is
emitted for a PS input, which is unusual — `dcl_input_ps`/`dcl_input_ps_siv` normally
carry that role for pixel shaders; `dcl_input_siv` proper is more commonly a
non-pixel-stage opcode in the wider HLSLcc target matrix, e.g. domain/geometry-shader
inputs receiving a previous stage's system value as an ordinary interpolated input).

**Type rules**: n/a — no declaration text, no operand type conversion here.

**Helpers needed**: none.

**Edge cases**: only 3 occurrences in the entire 450k-instruction/1611-file corpus —
lowest-frequency opcode in this family by a wide margin. Given this project has no
geometry/domain/hull stages, verify what these 3 instances actually are before
assuming the pixel-shader branch above is even the relevant one; they may be
vertex-shader-side declarations that fall through this `case` doing nothing
observable at all (the `if` guard requires `PIXEL_SHADER`, so a vertex-shader
occurrence of this opcode is a complete no-op).

**WebGL2 notes**: none — no GLSL is emitted.

**Confidence: low** — three instances is too small a sample to be confident which
concrete DXBC pattern in the EVE corpus produces this opcode versus its much more
common `_ps_siv`/`_sgv`/`_ps_sgv` siblings; implement the no-op/interpolation-mode-
recording behavior above as written in the source, but do not assume it is
exercised meaningfully by this project's corpus.

---

## `customdata` (159, encodes an Immediate Constant Buffer)

**Semantics**: DXBC `customdata` with subtype `ICB` (Immediate Constant Buffer) —
an inline array of literal `vec4`-shaped constant data baked directly into the
bytecode (as opposed to `dcl_constant_buffer`'s externally-bound `cb#`), addressed
either directly by a fixed index or dynamically (`x0[aL]`-style) from instructions
later in the stream.

**GLSL lowering (non-Vulkan, non-Switch — this project's target)**:
`toGLSLDeclaration.cpp:3007-3076`. HLSLcc walks `m_ConstantArrayInfo.m_Chunks`
(pre-computed groupings of same-component-width, contiguously-accessed ICB slices)
and, per chunk:
1. Declares an array: `float ImmCB_{phase}_{chunkFirst}_{rebase}[{size}];` (scalar
   chunk) or `vec{N} ImmCB_{phase}_{chunkFirst}_{rebase}[{size}];` (`N`-wide chunk)
   (`3017-3020`).
2. If the target lacks dynamic indexing support, additionally registers a
   `DeclareDynamicIndexWrapper` (`3022-3029`) — irrelevant here since GLSL ES 3.00
   (`HaveDynamicIndexing` true for ES 300) supports genuine dynamic array indexing
   natively; this project should skip the wrapper machinery entirely and always emit
   a real GLSL array.
3. Populates each array element in **early-main** (not as a `const` initializer list
   — note this is a *mutable* global-scope-declared, early-main-assigned array in
   stock HLSLcc, not a `const` array), one assignment per element per component
   (`3032-3074`):
   ```glsl
   ImmCB_0_0_0[0] = 1.5;
   ImmCB_0_0_0[1] = uintBitsToFloat(uint(0x7FC00000u));  // NaN literal, bit-pattern form
   ```
   Float literals that are themselves NaN/Inf bit patterns
   (`fpcheck(val[...])`, `3045-3048`, `3067-3070`) are re-encoded as
   `uintBitsToFloat(uint(0x{hex}u))` rather than a literal `nan`/`inf` token (which
   GLSL cannot parse directly) — **this bit-pattern-preserving encoding is the
   correct/required approach for any ICB constant that is NaN or ±Inf, and this
   project's emitter must replicate it**, since a plain decimal float literal cannot
   represent those bit patterns exactly and GLSL has no `nan`/`inf` literal syntax.
4. Vulkan target (`2975-2990`, background only — not this project's target):
   `const uvec4 ImmCB_{phase}[] = uvec4[{count}](uvec4(0x..., ...), ...);` — a true
   `const` array of raw-bit `uvec4`s.
5. Switch target (`2991-3006`, background only): a `const vec4
   ImmCB_{phase}[]` initialized with a `vec4[{count}]` array constructor whose
   elements preserve raw bits with `uintBitsToFloat`; this is the
   shape closest to "a `const vec4 array`" as the family brief describes, and is a
   **better model for this project's emitter to imitate** than the non-Vulkan/
   non-Switch mutable-early-main-array path above: declare
   ```glsl
   const vec4 ImmCB_{phase}[{count}] = vec4[{count}](
       vec4(uintBitsToFloat(0x3FC00000u), uintBitsToFloat(0x00000000u), ...),
       ...
   );
   ```
   at global scope (every raw dword reinterpreted through `uintBitsToFloat`
   uniformly, whether or not it happens to be a "nice" float, sidestepping the
   `fpcheck`-conditional branching the CPU-target path uses) — simpler to implement
   correctly in a from-scratch JS emitter and avoids the early-main mutable-global
   pattern (which exists in stock HLSLcc mainly to support per-chunk dynamic-array
   splitting this project doesn't need, since `HaveDynamicIndexing` is true and a
   single flat `const vec4[]` can be indexed directly).

**Type rules**: every ICB element is exactly 4 raw dwords; **always reinterpret via
`uintBitsToFloat`** rather than trusting a decimal float re-parse of the DXBC literal
value, to guarantee exact bit-for-bit reproduction of the original constant
(including denormals/NaNs/Infs the HLSL compiler folded in). Consumers needing an
int/uint view of an ICB element bitcast again at the use site
(`floatBitsToInt`/`floatBitsToUint`) exactly like any other float-register-file read.

**Helpers needed**: none — `uintBitsToFloat` is core GLSL ES 3.00.

**Edge cases**: NaN/Inf constants are the primary edge case, handled correctly by
the bit-pattern-preserving encoding above — do not let a JS `JSON.stringify`/decimal
round-trip of the float value silently normalize a NaN payload or lose an Inf's
sign bit; carry the raw `uint32` dword through to the emitted GLSL untouched.
Dynamic indexing of the ICB (`x0[aL]`-style reads) is a plain GLSL array-index
expression on this project's target (`HaveDynamicIndexing` true for ES 300),
needing none of stock HLSLcc's non-dynamic-indexing wrapper-function fallback.

**WebGL2 notes**: dynamic (non-constant-expression) array indexing of a global
array is supported in GLSL ES 3.00's core profile (unlike GLSL ES 1.00, where it was
restricted) — this project's target does not need the
`DeclareDynamicIndexWrapper` fallback stock HLSLcc carries for older targets.

**Confidence: medium** — the NaN/Inf bit-pattern-preserving requirement and the
"prefer the Switch-shaped `const vec4[]` over the non-Vulkan/non-Switch mutable
early-main array" recommendation are both this spec's own synthesis reasoned from
reading three different target branches in the same source function, not a literal
restatement of a single already-proven CarbonEngineJS-fork code path — validate the
`const vec4[]` shape compiles and links correctly on an actual WebGL2 context before
treating it as final.

---

## Helpers summary

Every helper function/macro/convention this family requires the JS emitter to
provide, in one place:

| Helper | Kind | Used by | Definition |
|---|---|---|---|
| `floatBitsToInt` | core GLSL ES 3.00 builtin | any int-typed read of a float-register-file value (`dcl_temps`, `dcl_indexable_temp`, `dcl_constant_buffer` fallback slots, `customdata`, integer-lowered `dcl_input`) | built-in, no definition needed |
| `floatBitsToUint` | core GLSL ES 3.00 builtin | same as above, uint-typed reads (also the `SV_IsFrontFace` mask materialization, `dcl_input_ps_sgv`/`dcl_input_sgv`) | built-in |
| `intBitsToFloat` | core GLSL ES 3.00 builtin | writing an int-typed result into a float register (`gl_VertexID`/`gl_InstanceID`/`gl_PrimitiveID`/`gl_SampleID` materialization into the float register file) | built-in |
| `uintBitsToFloat` | core GLSL ES 3.00 builtin | writing a uint-typed result into a float register; ICB literal decoding (`customdata`); `SV_IsFrontFace` mask materialization | built-in |
| `hlslcc_FragCoord` early-main redirect | fixed substitution statement, not a function | `dcl_input_ps_siv` (`NAME_POSITION`) | `vec4 hlslcc_FragCoord = vec4(gl_FragCoord.xyz, 1.0/gl_FragCoord.w);` — every `SV_Position`-as-PS-input read must use this name, not raw `gl_FragCoord` |
| `SV_IsFrontFace` mask expression | fixed substitution expression, not a function | `dcl_input_ps_sgv`/`dcl_input_sgv` (`NAME_IS_FRONT_FACE`) | `uintBitsToFloat(gl_FrontFacing ? 0xffffffffu : 0u)` materialized wherever the DXBC 0/0xFFFFFFFF mask value is read |
| Integer-vertex-attribute float lowering | declaration-shape convention, not a function | `dcl_input` for any `INOUT_COMPONENT_UINT32`/`SINT32` vertex attribute (proven for `BLENDINDICES`; generalize cautiously) | declare `vec4`/`vecN` instead of `uvecN`/`ivecN`; bitcast at every use site |
| `in_BINORMALn -> in_BITANGENTn` rename | package-time post-process, not a GLSL-emission-time helper | `dcl_input` split-tangent-space vertex shaders | applied by `scripts/packageTr2WebglEffect.js`-equivalent tooling **after** this family's GLSL text is emitted, keyed off the stage's Carbon metadata contract — do not bake into the opcode lowering itself |
| Cross-stage `cbN` size normalization | package/link-time policy, not a per-shader GLSL-emission helper | `dcl_constant_buffer` | emit the **max** `data[]` slot count observed for a given `cb#` across every stage sharing that binding point in one linked program |
| `BoneTransforms` SSBO→`cb3` splice | package-time ABI rewrite, not a GLSL-emission-time helper | `dcl_resource_structured` (skinned space-object shaders specifically) | drop the `t0` SSBO decl; grow `cb3` to `vec4 data[200]`; rewrite `ld_structured` row reads to `cb3.data[26 + blendIndex*3 + row]` |
| `layout(early_fragment_tests) in;` suppression | emission-time language gate (not present in stock HLSLcc) | `dcl_global_flags` (`FORCE_EARLY_DEPTH_STENCIL`) | drop the qualifier entirely when targeting GLSL ES 3.00 |

---

## Cross-cutting risks (lowest-confidence areas across this whole family)

1. **`dcl_input_siv`** (3 corpus instances) — sample too small to be confident the
   documented no-op/interpolation-recording behavior is even the path exercised;
   verify against the actual 3 instances before trusting this section.
2. ~~`noperspective` on `dcl_input_ps`~~ — resolved during review: the C++ source's
   `hasNoPerspective` gate (`>LANG_ES_310`) is correct, not stale — GLSL ES 3.00
   genuinely has no `noperspective` keyword, so the gate should be mirrored as-is
   rather than second-guessed. `sample`/`centroid` remain core ES 3.00 keywords with
   no gating concern.
3. **Integer-vertex-attribute float-lowering generalization** — proven and validated
   specifically for `BLENDINDICES`/`uvec4`; whether the same treatment is correct for
   every other `INOUT_COMPONENT_UINT32`/`SINT32` vertex semantic in the corpus (and
   whether the use-site cast should be a bit-pattern `floatBitsToUint` reinterpret vs.
   a value-preserving `uint(...)` truncating convert) has not been separately proven
   per-semantic.
4. **`customdata` emission shape** — this spec recommends the Switch-target's
   `const vec4[]` shape over the stock non-Vulkan/non-Switch mutable-early-main-array
   shape as simpler and sufficient for this project's ES-300-with-dynamic-indexing
   target; this recommendation is this document's own synthesis, not a literally
   cited already-proven CarbonEngineJS-fork code path, and should be validated by an
   actual WebGL2 compile before being treated as settled.
5. **`dcl_global_flags` / `layout(early_fragment_tests) in;`** — whether any EVE
   effect in the corpus actually sets `FORCE_EARLY_DEPTH_STENCIL` (making the WebGL2
   suppression gate load-bearing rather than theoretical) was not verified in this
   pass.


