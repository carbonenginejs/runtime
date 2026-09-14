# DXBC -> GLSL ES 3.00 Lowering Spec: `decl-io` Family

Status: Evolving
Scope: `@carbonenginejs/runtime/resource/formats/webgl` declaration and stage-I/O lowering
Audience: Shader translator maintainers and reviewers
Summary: Defines the DXBC declaration and I/O rules used by the GLSL emitter.

Historical lowering study: the package-time `cb3` rewrite was superseded
2026-08-02. Remaining confidence/qualification questions are not current
support certification. The [full study and retired receipts](https://github.com/carbonenginejs/runtime/blob/917c644807fa7d4802dbba572af50cb98fff0bef/docs/resource/formats/webgl/decl-io.md)
remain in pinned history; condensation does not re-qualify their claims.

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

HLSLcc concatenates `extensions` then `glsl` (`1039`). Preserve this order:

1. `#version 300 es` (`GetVersionString`, `387`, seeded at `617`), followed
   by required/enabled extensions.
2. `AddVersionDependentCode` (`93`, called at `647`): for ES pixel shaders,
   `precision highp float;` and `precision highp int;` (`307-328`). High integer
   precision avoids real mediump implementations (`326`). This path emits no
   default-precision block for vertex shaders.
3. Constant-buffer/texture macros (`667-691`): the JS emitter uses their enabled
   concrete expansion, such as `layout(std140) uniform ... { vec4 data[N]; } cbN;`,
   without Unity `UNITY_LOCATION`/`UNITY_BINDING`/`HLSLCC_ENABLE_UNIFORM_BUFFERS`
   indirection or runtime toggles.
4. `TranslateDeclaration` in bytecode order, then `main` with early-main
   redirects before translated instructions.

**WebGL2 note**: emit `#version 300 es` as line 1, nothing before it. Do not copy the ES100-only
`GL_FRAGMENT_PRECISION_HIGH` conditional (`311-320`); ES300 takes the
unconditional highp float branch (`321-324`).

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

**GLSL lowering (stock HLSLcc)**: `toGLSLDeclaration.cpp:2425-2523` declares
one native-typed shadow per used type after `DataTypeAnalysis`: `u_xlatN`
(float), `u_xlatiN` (int), `u_xlatuN` (uint), with bool, minimum-precision
16/12/10-bit and fp64 variants. `HLSLCC_TEMP_PREFIX` is `u_xlat`
(`vendor/HLSLcc/include/hlslcc.h:127`). Switch alone initializes them to zero
(`2436-2498`); other targets leave them uninitialized (`2501-2521`).

**This study's required deviation**: without the stock def/use type analysis,
declare one `vec4 rN;` per temporary, not typed shadows. Use the opening
float-register convention: int/uint reads use `floatBitsToInt`/`floatBitsToUint`;
writes use `intBitsToFloat`/`uintBitsToFloat`. These are core ES300 builtins,
not custom helpers. The consuming/producing opcode determines the actual type.
Every instruction family must honor this convention; one missed bitcast can
silently corrupt values without a compilation failure.

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

**GLSL lowering — stripped-RDEF fallback**: `toGLSLDeclaration.cpp:2530-2559`
handles a missing buffer from `GetConstantBufferFromBindingPoint`, whether RDEF
is absent or merely omits that binding. It emits:

```glsl
layout(std140) uniform ConstantBuffer3 { vec4 data[200]; } cb3;
```

`ConstantBuffer{N}` is synthesized at `2541-2542`; the instance is `cb{N}`.
The slot count is the declaration's `psOperand->aui32ArraySizes[1]`, not a
reflection-derived size. Preserve the register-stable `cbN.data[i]` ABI
(`CARBONENGINEJS-FORK.md`, “Runtime Contract” and stripped-reflection fallback).
For linked stages sharing a binding, normalize to the maximum declared slot
count; see the cross-stage link failure and qualification below.
If the `UNITY_LOCATION` macros apply (`2550-2555`), this study calls for their
concrete `layout(location = N)` expansion rather than macro indirection.

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
  are Vulkan/Unity-specific and outside this study's DX11→WebGL2 scope.
  Keep `$Globals` separate: `psCBuf->name[0] == '$'` at `2674` in the named
  path (`2672-2687`) selects `DeclareStructConstants` over `DeclareUBOConstants`
  when `HLSLCC_FLAG_GLOBAL_CONSTS_NEVER_IN_UBO` is set. The helper-internal
  `$Globals` checks are at `883`, `888`, `1105`, `1142`, not `2561-2670`.
  None runs in the stripped-RDEF fallback: it returns at `2558`, using the
  synthesized `ConstantBufferN` name.

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
above for a WebGL2 target; it will not compile. The following **historical
package-time ABI rewrite was superseded 2026-08-02**. The current emitter uses
dedicated `std140` UBOs for vertex-stage structured buffers; see the
[recorded closure](memory-structured.md#glsl-lowering--b-webgl2-cb3-joint-matrix-rewrite-contract-the-shipping-path).
The [retired splice instructions and link receipts](https://github.com/carbonenginejs/runtime/blob/917c644807fa7d4802dbba572af50cb98fff0bef/docs/resource/formats/webgl/decl-io.md#dcl_resource_structured-684)
are history, not pending work. The splice was ccpwgl compatibility policy,
not native Carbon/Trinity representation. Keep that distinction:
[per-object layout comparison](carbon-constant-layouts.md#4c-per-object-vs-drift-carbon-2a-vs-ccpwgl-vs-b3)
records native `BoneTransforms` separately from ccpwgl's inline joints.
The historical formula and its qualification below apply only to the observed
`BoneTransforms` case, never to arbitrary structured resources.

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
   this code path). The separate combine-flag branch (`1632-1657`) emits one
   additional uniform per used `(texture, sampler)` pair from `psDecl->samplersUsed`;
   it does not replace the plain declaration (`1659-1666`). See
   [register-stable naming](texture-sample.md#0-register-stable-abi-how-ts-become-glsl-names)
   for `TextureSamplerName`, duplicate declarations and the stock instruction
   consumer. This study still requires confirming which name (`t{N}` vs. the
   combo name) the consuming `sample`/`sample_c` instruction family references
   before assuming plain `t{N}` is the only symbol that matters.

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

**Semantics**: declares sampler-state binding `s#`—filter/address mode,
comparison mode and LOD clamp/bias—paired with a `t#` resource through
`samplersUsed` for `sample`/`sample_c`/`sample_l`.

**GLSL lowering**: `toGLSLDeclaration.cpp:3348-3365` emits text only inside
`if (psContext->IsVulkan()) { ...; break; }`. Non-Vulkan targets emit no
declaration, GLSL variable or helper for this opcode. Resource declarations
provide combined texture/sampler uniforms; see
[register-stable naming](texture-sample.md#0-register-stable-abi-how-ts-become-glsl-names)
and the consumer-name qualification in `dcl_resource`.

`D3D10_SB_SAMPLER_MODE_COMPARISON` still affects codegen: declaration planning
uses the `s#`/`t#` pairs in `sample_c`-family instructions to set
`ui32IsShadowTex` for `TranslateResourceTexture`. This is not GLSL emitted
by `dcl_sampler` itself.

**Runtime boundary**: address/filter mode, LOD bias/clamp, anisotropy and
border color are binding-state policy, not shader text. These must be applied
at draw time via `gl.texParameteri`/`gl.samplerParameteri` from Carbon/Trinity
sampler metadata, outside this translator (`TRANSPILING-GAPS.md`, “Exporter and runtime policy”,
“WebGL sampler-state application”: deferred/out-of-scope for the DXBC reader
and draft transpiler).

Do not look for a separately declared `s0` GLSL variable. Its register identity
belongs to Carbon binding-manifest metadata (`CARBONENGINEJS-FORK.md`,
`HlslEffectBindingManifest`).

**Confidence: high** for the source's Vulkan/non-Vulkan branch. The study
requires the combined texture/sampler model for WebGL2/GLSL ES 3.00, which
has no separate shader-language sampler-object type; this does not close
the consumer-name qualification above.

---

## `dcl_input` (11726)

Declares a non-pixel stage input register: normally a vertex attribute whose
ISGN row supplies semantic name/index, component mask/type and, for non-VS
stages, interpolation. Stock lowering is at `toGLSLDeclaration.cpp:2061-2186`;
early-outs at `2070-2105` cover pseudo-inputs and already-array-declared
registers, not ordinary VS attributes.

| Declaration fact | Source and emitted form |
|---|---|
| Name | `GetDeclaredInputName`, `HLSLCrossCompilerContext.cpp:169-211`; VS prefix `in_` from `toGLSL.cpp:33`: `in_POSITION0`, `in_NORMAL0`, `in_TEXCOORD3`, `in_BLENDINDICES0`. |
| Storage | `InOutSupported` selects `in` for ES300 (`2121-2127`), not ES100 `attribute`/`varying`. |
| Precision | `highp` unless `OPERAND_MIN_PRECISION_*` says otherwise (`2129-2159`); such hints were rare in the studied corpus. |
| Type/width | `DeclareInput` (`232-390`, especially `265-291`): ISGN `eComponentType` selects `float`/`vecN`, `int`/`ivecN`, or `uint`/`uvecN`; `GetNumberBitsSet(ui32Mask)` sets width, **not the operand write mask**. |
| Text | `in <precision> <type> in_<SEMANTIC><index>;` (`362-388`, ordinary non-array branch). |

ISGN types are independent of the opening float-temp-register convention.
`HandleInputRedirect` (`1689-1806`) stages hull/domain phase inputs in
`phase{N}_Input...` temporaries; this VS/PS study needs no equivalent helper.

### Metadata-conditioned BINORMAL alias

DXBC names the split-tangent channel `BINORMAL`; Carbon/Trinity GR2 stream
metadata names the same channel `BITANGENT`
(`../shaderdiscovery/knowledge/trinity-metadata/shader-discovery-truths.md:126-133`,
`../shaderdiscovery/knowledge/carbon-metadata-contract/hlslcc-transpile-spike.md:195-201`).
This is a naming alias, not a different channel. The studied
`scripts/packageTr2WebglEffect.js` rewrites `in_BINORMAL{n}` to
`in_BITANGENT{n}` **after emission**, only when the VS contract declares a
`BITANGENT` pipeline input. Keep DXBC naming in opcode lowering; the
metadata-driven binder owns this compatibility requirement.

Recorded validation: regenerated `unpackedskinned_quadv5` and
`unpackedskinned_quadheatv5` had no `in_BINORMAL*` left and linked
336/336 and 80/80 WebGL2 programs.

### Historical CCPWGL integer-attribute constraint

The studied CCPWGL consumer used `vertexAttribPointer` for all mesh
channels, including blend indices, not `vertexAttribIPointer`.
`028-carbonwebgl-skinned-blend-index-abi-lowering.md` records that raw
integer attributes could link yet fail at runtime or produce invisible
geometry. Stock `DeclareInput` instead emits true `uvec4` for UINT32
`BLENDINDICES` (`270-274`). The historical proposal lowers integer-component
vertex declarations to float equivalents; its generalization remains unproven
per producer. The recorded workaround declares
`in vec4 in_BLENDINDICES0;` and casts at use sites; the general action plan
is in `TRANSPILING-GAPS.md`, “Ranked helper action plan”. Recorded
post-rewrite link counts are 336/336 and 240/240 programs, not proof of every
attribute producer's encoding.

The unresolved distinction is `floatBitsToUint(in_BLENDINDICES0)` for
bit-pattern-encoded uints versus `uint(in_BLENDINDICES0.x)` for plain
float index values. Verify each uploaded stream before generalizing.
GLSL ES300 supports genuine integer inputs with `vertexAttribIPointer`:
this is a CCPWGL binding constraint, **not a language limitation or a default
requirement for a CarbonEngineJS-native consumer**.

**Confidence: medium** — the *requirement* to avoid integer vertex-attribute types is
high confidence (proven by a specific regression + fix with before/after link
counts); the *exact* per-attribute cast convention (bitcast-reinterpret vs.
truncating-convert at the use site) is not nailed down to opcode-level precision in
the cited evidence and should be confirmed against the actual uploaded vertex-buffer
encoding for each integer semantic (`BLENDINDICES` specifically is documented;
generalize cautiously to any other integer-typed vertex semantic found in the corpus).

---

## `dcl_input_ps` (6995)

Declares a pixel input with an ISGN row and explicit
`value.eInterpolation` payload, unlike plain `dcl_input`.
`toGLSLDeclaration.cpp:2217-2423` emits
`<interp>in <precision> <type> vs_<SEMANTIC><index>;` through
`DeclareInput` (`2418`). Type/width and minimum-precision derivation
are as in `dcl_input` (precision: `2287-2317`). Storage is `in`
(`2228-2231`). `GetDeclaredInputName` takes the previous VS's
`vs_` prefix (`toGLSL.cpp:59-79`), matching its output prefix
(`toGLSL.cpp:34`).

Interpolation mapping (`2238-2284`):

| Input | Qualifier |
|---|---|
| UINT32/SINT32 | Always `flat`, regardless of DXBC mode (`2238-2242`). |
| `INTERPOLATION_CONSTANT` | `flat` |
| `LINEAR` | None |
| `LINEAR_CENTROID` | `centroid` |
| `LINEAR_NOPERSPECTIVE` | `noperspective` only with `hasNoPerspective` (`2263-2265`). |
| `LINEAR_SAMPLE` / `LINEAR_NOPERSPECTIVE_SAMPLE` | `sample` / `noperspective sample`, under the source gates. |

The study calls for mirroring `hasNoPerspective`
(`eTargetLanguage > LANG_ES_310`, `2225`), not removing the gate.
On ES300, dropping `noperspective` gives perspective-correct interpolation:
a visible quality difference, not an equivalent interpolation rule. No
custom helper is needed for the qualifiers.

**Framebuffer-fetch blocker:** `2319-2416` handles `SV_TargetN` as
both input and output using `#define vs_SV_TargetN gl_LastFragData[N]`
or `layout(location=N) inout`, gated by
`EXT_shader_framebuffer_fetch` plus
`HLSLCC_FLAG_SHADER_FRAMEBUFFER_FETCH`. This is outside the study's
standard WebGL2 target and was not expected in the EVE corpus. If encountered,
verify the extension at runtime; do not silently assume availability.

**Confidence: high** — the name-prefix pairing and integer-flat rule are high
confidence (direct source read, universal GLSL requirement); the
`noperspective`-in-ES-3.00 gate was re-checked directly against the GLSL ES 3.00
language facts (no `noperspective` keyword until ES 3.20 core / the
`NV_shader_noperspective_interpolation` extension) and confirmed correct as written,
so this is no longer an open question for this opcode.

---

## `dcl_output` (15197) — highest-frequency opcode in this family

Declares an OSGN-bound output register. `toGLSLDeclaration.cpp:2760-2779`
calls `AddUserOutput` (`594-854`), gated by `OutputNeedsDeclaring`
(`HLSLCrossCompilerContext.cpp:279-330`). Its `acOutputDeclared`
bitmask deduplicates repeated partial-mask declarations; only undeclared
components trigger text. Type/width comes from OSGN
`eComponentType`/`GetNumberBitsSet(mask)` (`622-655`), not the
declaration write mask; precision comes from `OPERAND_MIN_PRECISION_*`
(`657-689`). Declarations have no `_sat`: saturation belongs to
instructions writing the register.

### Pixel outputs (691–795)

- `OPERAND_TYPE_OUTPUT_DEPTH`: builtin `gl_FragDepth` (`701-708`),
  no declaration. The `EXT_frag_depth` shim (`703-706`) is ES100-only.
- `OUTPUT_DEPTH_GREATER_EQUAL` / `OUTPUT_DEPTH_LESS_EQUAL`:
  `GL_ARB_conservative_depth` qualifiers (`709-723`). This study's
  ES300 policy drops `depth_greater`/`depth_less` hints and writes
  plain unconstrained `gl_FragDepth`; the desktop extension is not assumed.
  The study treats this as removing a performance hint, not changing correctness.
- Ordinary `SV_TargetN` (`725-793`): empty output prefix plus semantic
  and render-target index. First use of target N emits
  `layout(location = N) out <precision><type> SV_TargetN;`
  (`748-789`), including explicit locations for MRT instead of legacy
  `gl_FragData[N]` (`WriteToFragData` is legacy/ES100-only).

**Location-gate correction:** `752-753` tests
`HaveInOutLocationQualifier || HaveLimitedInOutLocationQualifier`.
The former (`languages.h:102-109`, true for `>=LANG_410` or
`LANG_ES_310`) is false for ES300. The latter
(`languages.h:93-100`, “Only on vertex inputs and pixel outputs”) supplies
the true ES300 branch. Plain `dcl_input` tests the former alone and
therefore does not receive an explicit location there. Do not conflate the gates.

### Vertex outputs (796–846)

`vs_<SEMANTIC><index>` (`804`) matches the PS input name.
Integer outputs are `flat` (`810-814`); floats use cross-stage
`GetInterpolationMode` (`815-818`). This study recommends resolving
that mode from the paired PS `dcl_input_ps` because VS outputs encode no
interpolation payload. This remains a recommendation, qualified below.

`GetVaryingLocation` is at `821-825`; this study recommends omitting
explicit varying locations and linking by name to avoid VS/PS numbering
mismatches. If explicit varying locations are used, paired stage locations
must match. Final text (`838`):
`<interp>out <precision><type> vs_<SEMANTIC><index>;`.
VS register 0 with legacy `POS` returns early (`619-620`):
`dcl_output_siv NAME_POSITION` handles `gl_Position`, so do not
double-declare it. Hull-only `HandleOutputRedirect` is out of scope,
as is the hull control-point output case.

**Signature-only outputs:** `023-signature-only-vertex-output-fallback.md`
records OSGN outputs with zero bytecode write references:
`starmapnew` (`o3 -> COLOR2`, `o4 -> TEXCOORD1`) and
`ubershader3d` (`o2 -> COLOR1`, `o7 -> TEXCOORD4`). They are
expected inputs to the fallback, not parser defects. Since unwritten varyings
are not guaranteed zero, emit deterministic early-main initialization, e.g.
`vs_COLOR2 = vec4(0.0);`, before translated instructions.

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

Pixel system-value inputs lower at `toGLSLDeclaration.cpp:2188-2207`:

- `NAME_POSITION` calls `AddBuiltinInput(psDecl, "gl_FragCoord")`
  and emits this **early-main local substitution**, not a callable helper
  (`2195`):

  `vec4 hlslcc_FragCoord = vec4(gl_FragCoord.xyz, 1.0/gl_FragCoord.w);`

  Redirect **every** PS `SV_Position` read to `hlslcc_FragCoord`,
  not raw `gl_FragCoord`. Preserve xyz and the reciprocal-W expression
  exactly; it reconciles HLSL/GLSL fourth-component conventions. Both are
  `vec4`; the GLSL builtin needs no declaration or extension.
- `NAME_RENDER_TARGET_ARRAY_INDEX` maps to `gl_Layer`
  (`2198-2201`), requiring upstream layered/geometry rendering outside
  this study's scope.
- Other special names reach `ASSERT(0)` (`2203-2205`).

**Edge cases**: `1.0/gl_FragCoord.w` can produce infinity at exactly
zero W. No such corpus case was found; degenerate/infinite-depth fragments
normally do not survive clipping. Retain this as a theoretical NaN/Inf source,
not a request for a defensive guard without evidence.

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

`customdata` subtype `ICB` embeds immediate constants in DXBC rather
than binding an external `cb#`. Each element is four raw dwords, with
fixed or dynamic indexing (`x0[aL]`-style reads).

### Stock target branches

Non-Vulkan/non-Switch (`toGLSLDeclaration.cpp:3007-3076`) walks
`m_ConstantArrayInfo.m_Chunks`: contiguous slices grouped by component width.

1. Declare mutable global arrays (`3017-3020`):
   `float ImmCB_{phase}_{chunkFirst}_{rebase}[{size}];` for scalar chunks,
   or `vec{N}` for N-wide chunks.
2. `DeclareDynamicIndexWrapper` (`3022-3029`) is for targets without
   dynamic indexing. `HaveDynamicIndexing` is true for ES300: use real
   arrays and direct index expressions, no wrapper.
3. Assign each element/component in early-main (`3032-3074`), not a
   `const` initializer. Ordinary literals may be decimal, e.g.
   `ImmCB_0_0_0[0] = 1.5;`. `fpcheck` (`3045-3048`,
   `3067-3070`) preserves NaN/Inf as raw-bit expressions such as
   `ImmCB_0_0_0[1] = uintBitsToFloat(uint(0x7FC00000u));`.

Vulkan (`2975-2990`, background only) instead declares
`const uvec4 ImmCB_{phase}[] = uvec4[{count}](uvec4(0x..., ...), ...);`.
Switch (`2991-3006`) uses a global `const vec4` array constructor
with `uintBitsToFloat`-preserved elements.

### Proposed ES300 shape — not a validated closure

This study recommends the Switch-like flat array, avoiding mutable early-main
assignments and chunk splitting when genuine dynamic indexing is available:

```glsl
const vec4 ImmCB_{phase}[{count}] = vec4[{count}](
    vec4(uintBitsToFloat(0x3FC00000u), ...), ...);
```

Carry every raw `uint32` dword unchanged into `uintBitsToFloat`,
including denormals, NaN payloads and signed infinities; do not round-trip
through decimal floats or `JSON.stringify`. GLSL has no NaN/Inf literal
syntax. Integer consumers use `floatBitsToInt`/`floatBitsToUint`
as in the opening register convention. The bitcast is a core builtin, not a
custom helper. The proposed `const` initializer still requires the
actual WebGL2 compile/link validation stated below.

**Confidence: medium** — the NaN/Inf bit-pattern-preserving requirement and the
"prefer the Switch-shaped `const vec4[]` over the non-Vulkan/non-Switch mutable
early-main array" recommendation are both this spec's own synthesis reasoned from
reading three different target branches in the same source function, not a literal
restatement of a single already-proven CarbonEngineJS-fork code path — validate the
`const vec4[]` shape compiles and links correctly on an actual WebGL2 context before
treating it as final.

---

## Helpers summary

Definitions and qualifications live with their opcode, not in a second table:

- Float-register bitcasts: opening register model and [temps](#dcl_temps-5035).
- Fixed early-main `hlslcc_FragCoord` redirect: [PS position](#dcl_input_ps_siv-538).
- Inline all-ones front-face mask and signed builtin casts:
  [system-generated inputs](#dcl_input_ps_sgv-42--dcl_input_sgv-18).
- Integer-attribute lowering and metadata-keyed post-emission BINORMAL alias:
  [vertex inputs](#dcl_input-11726).
- Cross-stage maximum cbuffer size: [constant buffers](#dcl_constant_buffer-10160).
- Retired bone splice: [structured resources](#dcl_resource_structured-684).
- Early-fragment qualifier gate: [global flags](#dcl_global_flags-5848).

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


