# DXBC -> GLSL ES 3.00 Lowering Spec: texture-sample family

Status: Evolving
Scope: `@carbonenginejs/runtime/resource/formats/webgl` texture and sampling lowering
Audience: Shader translator maintainers and reviewers
Summary: Defines DXBC texture sampling behavior and WebGL2 target adaptations.

Target: GLSL ES 3.00 (WebGL2), vertex + pixel stages, no SSBO/compute.
Register storage model: every register is a float `vec4`; typed reads/writes bitcast at
the use site (`floatBitsToInt`, `floatBitsToUint`, `intBitsToFloat`, `uintBitsToFloat`),
mirroring HLSLcc's own behavior when reflected data-type analysis is unavailable
(`ShaderInfo::GetTextureDataType` returns `SVT_FLOAT` when no `RDEF` binding is found —
`vendor/HLSLcc/src/ShaderInfo.cpp:10-18`).

Authority order used below: (1) `toGLSLInstruction.cpp` / `toGLSLOperand.cpp` /
`toGLSLDeclaration.cpp` / `HLSLccToolkit.cpp`, (2) `CARBONENGINEJS-FORK.md`, (3)
`TRANSPILING-GAPS.md`, (4) `AGENT-FINDINGS/decisions/*.md`, (5) `Dx11GlesDraftTranspiler.js`
(hints only, cross-checked, never trusted standalone).

**Correction (verification pass, 2026-07-05)**: sources (3) and (4) above —
`TRANSPILING-GAPS.md`, `AGENT-FINDINGS/decisions/*.md` — and source (5),
`Dx11GlesDraftTranspiler.js`, do not exist anywhere in this repository: neither in the
working tree nor in `git log --all` history, under any path (checked repo-wide, not just
under `docs/` or `vendor/`). Only `CARBONENGINEJS-FORK.md`
(`vendor/HLSLcc/CARBONENGINEJS-FORK.md`) and the `toGLSLInstruction.cpp`/`toGLSLOperand.cpp`/
`toGLSLDeclaration.cpp`/`HLSLccToolkit.cpp` C++ sources actually exist and were readable for
this review. Every citation to `TRANSPILING-GAPS.md:*`, `decisions/*.md`, or
`Dx11GlesDraftTranspiler.js` elsewhere in this document is therefore **unverifiable** and
must not be treated as independent corroboration until those files are located or
reconstructed — treat any "Confidence" rating that leaned on them as resting on the C++
citations alone (which were independently re-verified line-by-line for this pass and, apart
from the corrections called out below, held up).

This project's own `hlsl2webgl` CLI tool is the concrete configuration this spec targets:
`LANG_ES_300` with `HLSLCC_FLAG_COMBINE_TEXTURE_SAMPLERS | HLSLCC_FLAG_UNIFORM_BUFFER_OBJECT |
HLSLCC_FLAG_INOUT_SEMANTIC_NAMES | HLSLCC_FLAG_INCLUDE_INSTRUCTIONS_COMMENTS |
HLSLCC_FLAG_KEEP_VARYING_LOCATIONS` (`vendor/HLSLcc/tools/hlsl2webgl/hlsl2webgl.cpp:38-44`).
So the combined-texture-sampler path (single opaque GLSL `samplerND` per t#/s# pair) is
this CLI tool's **default** configuration (both `hlsl2webgl.cpp`'s `--flags`/
`--no-default-flags` options and `scripts/packageTr2WebglEffect.js`'s `--flags` passthrough
can override it), not a hardcoded, unconditional invariant — but it is the configuration
this spec targets and the one assumed throughout.

---

## 0. Register-stable ABI: how t#/s# become GLSL names

Ground truth: `toGLSLOperand.cpp:1738-1882` (`ResourceName`, `TextureSamplerName`),
`toGLSLDeclaration.cpp:1597-1686` (`TranslateResourceTexture`), and
`CARBONENGINEJS-FORK.md`.

- **Plain resource name** (`ResourceName`, `toGLSLOperand.cpp:1738-1810`): if the register
  has a resolved `RDEF`/reflection binding, the name is the reflected identifier (with `[`/`]`
  array syntax rewritten to `_`, and an array-offset suffix appended if the register is not
  the base of its binding). If no binding is found (stripped `RDEF` — the documented
  `CARBONENGINEJS-FORK.md` scenario), the fallback is the literal register-stable symbol:
  `"t" + regNo` for textures, `"s" + regNo` for samplers (prefixed with the literal string
  `sampler` if it doesn't already start with it — so unresolved sampler `s3` becomes
  `samplers3`), `"cb" + regNo` for constant buffers, `"u" + regNo` for UAVs
  (`toGLSLOperand.cpp:1780-1799`).
- **Combined texture+sampler name** (`TextureSamplerName`, `toGLSLOperand.cpp:1819-1876`):
  built independently of `ResourceName`. If either the texture or the sampler binding is
  unresolved, the fallback is literally `"t" + texRegNo + "TEX_with_SMPs" + smpRegNo`
  (e.g. `t0TEX_with_SMPs0`) — the `t#`/`s#` symbols survive intact inside the combined name.
  If both bindings resolve, the name is `<textureName>[arrayOffset]TEX_with_SMP<samplerName>`.
  A `bZCompare` flag prefixes `hlslcc_zcmp` onto either name for the shadow-sampler variant
  used by depth-compare ops (see `sample_c` below).
- **Declaration duplication**: `TranslateResourceTexture` (`toGLSLDeclaration.cpp:1632-1666`)
  emits **both** symbols as separate `uniform` declarations when
  `HLSLCC_FLAG_COMBINE_TEXTURE_SAMPLERS` is set: one `uniform sampler2D <TextureSamplerName>`
  per (texture, sampler) pair actually used together in the shader, **and** a plain
  `uniform sampler2D <ResourceName>` (the bare `t#` symbol) that is declared but not
  referenced by instruction bodies (instruction bodies call `TextureSamplerName`, not
  `ResourceName`, when `useCombinedTextureSamplers` is true — `toGLSLInstruction.cpp:1332-1336`).
  This is deliberate register-identity preservation per `CARBONENGINEJS-FORK.md`
  ("emitting deterministic register-stable GLSL symbols such as `cb3`, `t0`, and `s0`" /
  "preserving enough register identity for `HlslEffectBindingManifest`... and eventual
  trinityjs binding work"): the emitter must keep declaring the bare `t#` uniform even
  though the sampling calls use the combined name, so downstream tooling can still find a
  `t#`-named uniform to correlate against Carbon metadata.
- **Texture/sampler pairing is register-based, not name-based**
  (`AGENT-FINDINGS/decisions/003-texture-sampler-translation-boundary-2026-06-26.md`):
  do not infer texture ownership from a sampler's metadata label; the (t#, s#) pair observed
  on the actual instruction operands is the only truth.
- **Samplerless resource access is real** (`decisions/005-samplerless-texture-access-evidence-2026-06-26.md`):
  `ld` and `resinfo` carry no sampler operand at all. `TranslateTexelFetch` handles a
  missing reflected binding by synthesizing a `fallbackBinding` from the `SHEX`-derived
  resource dimension (`toGLSLInstruction.cpp:825-870`), defaulting
  `ui32ReturnType = RETURN_TYPE_FLOAT`, matching the fork's stripped-`RDEF` fallback policy.

---

## 1. `sample` (3064 occurrences)

**Semantics**: Standard filtered texture sample using the sampler's declared filter/wrap
state and an implicitly-computed LOD (derivative-based, like a normal pixel-shader texture
fetch). D3D11 `SAMPLE` opcode: `dest, address, resource, sampler`.

**GLSL lowering**: `TranslateTextureSample(psInst, TEXSMP_FLAG_NONE)`
(`toGLSLInstruction.cpp:3161-3170`, dispatch into `toGLSLInstruction.cpp:1131-1459`).
Template (combined-sampler, ES 3.00, dimension = 2D):

```glsl
dest = texture(<TextureSamplerName>, <coord>)<returnSwizzle>;
```

- Function name defaults to `"texture"` (`iHaveOverloadedTexFuncs` is true for every
  language except `LANG_ES_100`/`LANG_120`, `languages.h:37-44`, so ES 3.00 always uses the
  overloaded `texture()` builtin, never legacy `texture2D`/`textureCube`/etc.).
  `funcName`/`offset`/`gradSwizzle`/`ui32NumOffsets` are chosen per resource dimension at
  `toGLSLInstruction.cpp:1172-1251`.
- Coordinate build is `TranslateTexCoord(eResDim, psDestAddr)` (`:985-1031`), which selects
  and expands the address operand's leading components per dimension — see the coordinate
  table in section "Coordinate component selection" below.
- If `psInst->bAddressOffset` (immediate texel offset present, see section on
  `sample_controls` below), `offset = "Offset"` is appended to the function name and an
  `ivec2`/`ivec3`/int offset literal argument is appended (`:1391-1411`).
- After the call closes, the **return-channel swizzle** is applied by re-reading the
  swizzle encoded on the **texture (`t#`) operand itself** (not the destination): DXBC
  texture instructions carry a component swizzle on the resource operand describing how the
  hardware's raw fetched RGBA maps onto the instruction's result vector before the
  destination write mask applies. HLSLcc re-enables the write mask on that operand
  (`iWriteMaskEnabled = 1`) and calls `TranslateOperandSwizzleWithMask(psContext, psSrcTex,
  psDest->GetAccessMask(), 0)` (`:1451-1457`) to append e.g. `.yzwx` intersected with the
  destination's write mask.
- Saturate (`_sat`) is **not** applied inside `TranslateTextureSample`; it is a uniform
  post-processing step applied by the general instruction-loop epilogue
  (`toGLSLInstruction.cpp:4821-4844`): after any instruction with `bSaturate` set, the
  destination register is re-emitted as `dst = clamp(dst, 0.0, 1.0);` (with an
  `#ifdef UNITY_ADRENO_ES3` `min(max(x,0.0),1.0)` variant guard). This applies identically
  to every opcode in this family.

**Type rules**: destination type comes from `ShaderInfo::GetTextureDataType(texRegNo)`
(`ShaderInfo.cpp:10-18`) — `SVT_FLOAT`, `SVT_INT`, or `SVT_UINT` from the reflected
`RESOURCE_RETURN_TYPE`, or `SVT_FLOAT` if unreflected. `AddAssignToDest`
(`toGLSLInstruction.cpp:1281`, `:155-171`) wraps the whole call in `floatBitsToInt(...)`/
`floatBitsToUint(...)`/`intBitsToFloat(...)`/`uintBitsToFloat(...)` only if the destination's
*declared register type* (from prior data-type analysis) disagrees with the texture's
return type — since this project stores everything as float vec4 and skips full data-type
analysis, the safe default is to always treat the texture-op result as float and defer any
int/uint reinterpretation to the consuming instruction's own bitcast (matches the "bitcast
at use site" policy stated in the task, and matches `GetSamplerType`'s int/uint sampler
selection below). Coordinates are read with `TO_AUTO_BITCAST_TO_FLOAT` (`TranslateTexCoord`
always sets this flag, `:989`) — i.e. address components are reinterpreted as float via
`intBitsToFloat`/`uintBitsToFloat` if the source register was produced as int/uint.
The **sampler variant type** (`sampler2D` vs `isampler2D` vs `usampler2D`) is chosen once,
at declaration time, from the reflected return type via `GetSamplerType`
(`toGLSLDeclaration.cpp:1388-1551`); if unreflected it falls back to `default: return
"sampler2D"` (float) at `:1550` and per-dimension `default:` cases, again matching the
stripped-`RDEF` fallback.

**Helpers needed**: none beyond the coordinate-assembly and bitcast machinery already
required by every opcode family (`floatBitsToInt`/`intBitsToFloat`/etc. are native GLSL ES
3.00 builtins, not custom helpers — `HaveBitEncodingOps` is true for every language except
`LANG_ES_100`/`LANG_120`, `languages.h:169-180`).

**Edge cases**: Out-of-range coordinates follow the sampler's wrap mode (not a DXBC
concern — GLSL `texture()` handles it per the WebGL2 sampler state, which is set at the
JS/WebGL layer, outside this translator's scope). NaN/Inf in coordinates is
undefined/implementation-defined per GLSL ES spec, same as native GLSL; HLSLcc does not
special-case it.

**WebGL2 notes**: `texture()` (the "vec form" overloaded builtin) is core GLSL ES 3.00 —
no extension needed for 1D/2D/3D/Cube/array textures except cubemap arrays (see below).
Legacy `texture2D`/`textureCube`/etc. names are never emitted because `iHaveOverloadedTexFuncs`
is true for ES 3.00.

**Confidence**: high — this is the highest-volume opcode in the corpus and the core
`TranslateTextureSample` path is fully read and directly cited line-by-line.

---

## 2. `sample_l` (9124 occurrences — highest volume in family)

**Semantics**: Texture sample with an explicit, caller-supplied LOD (mip level), no
derivative computation. D3D11 `SAMPLE_L`: `dest, address, resource, sampler, LOD`. Used
heavily for skinned/environment/UI shaders that need deterministic mip selection outside a
derivative-having stage (this is also the *only* sampling form legal in a vertex shader,
which cannot compute screen-space derivatives).

**GLSL lowering**: `TranslateTextureSample(psInst, TEXSMP_FLAG_LOD)`
(`toGLSLInstruction.cpp:3171-3180`). LOD operand is `psInst->asOperands[4]`
(`:1144`). Template:

```glsl
dest = textureLod(<TextureSamplerName>, <coord>, <lod>)<returnSwizzle>;
```

or with an immediate texel offset: `textureLodOffset(<sampler>, <coord>, <lod>, <offsetVec>)`
(`:1308-1309`, offset suffix logic `:1163-1170`).

- LOD argument: `TranslateOperand(psSrcLOD, TO_AUTO_BITCAST_TO_FLOAT)` (`:1361-1372`); if
  `psContext->psShader->ui32MajorVersion < 4` (SM1–3 legacy bytecode) a `.w` swizzle is
  appended, but for DX11/SM5 bytecode (the corpus target) this branch does not apply — the
  scalar LOD operand is used directly.
- **2D-array shadow-sampler LOD workaround** (`needsLodWorkaround`,
  `toGLSLInstruction.cpp:1284,1297-1300,1357-1360`): GLSL has no `textureLod()` overload for
  `sampler2DArrayShadow`. When `eResDim == RESOURCE_DIMENSION_TEXTURE2DARRAY` **and**
  `TEXSMP_FLAG_DEPTHCOMPARE` is set (i.e. this is really a `sample_c`/`sample_c_lz` case on
  a 2D-array depth resource, not plain `sample_l`), HLSLcc substitutes
  `textureGrad(sampler, coord, vec2(0.0,0.0), vec2(0.0,0.0))` — zero gradients approximate
  LOD 0. This is a correctness approximation, not exact LOD selection, and only fires for
  the depth-compare + 2D-array combination.

**Type rules**: identical destination-type rule to `sample` (texture reflected return
type, `SVT_FLOAT` fallback). LOD operand is bitcast to float via `TO_AUTO_BITCAST_TO_FLOAT`
regardless of the DXBC register's nominal type, because DXBC LOD is always a float value
even when stored in an otherwise-integer temp register.

**Helpers needed**: none beyond core bitcast machinery.

**Edge cases**: LOD is clamped to `[0, textureQueryLevels-1]` by the GL implementation
itself, per GLSL spec — HLSLcc emits no explicit clamp. A negative or out-of-range LOD is
implementation-defined-clamped, not a translator concern.

**WebGL2 notes**: `textureLod` is core GLSL ES 3.00 for all sampler types except
`sampler2DArrayShadow`/`samplerCubeShadow` (no such overload exists at all — hence the
grad workaround above). `textureLodOffset` is also core ES 3.00 (`texelFetchOffset`-family
functions, GLSL ES 3.00 spec section 8.9) — no extension required.

**Confidence**: high — dominant opcode, full lowering path read directly, workaround logic
explicitly commented in source.

---

## 3. `sample_b` (3312 occurrences)

**Semantics**: Texture sample with a LOD **bias** added to the automatically computed
(derivative-based) LOD. D3D11 `SAMPLE_B`: `dest, address, resource, sampler, bias`.
Pixel-shader only (requires derivatives to compute the base LOD before biasing).

**GLSL lowering**: `TranslateTextureSample(psInst, TEXSMP_FLAG_BIAS)`
(`toGLSLInstruction.cpp:3211-3220`). Bias operand is `psInst->asOperands[4]` (`:1147`).
Template:

```glsl
dest = texture(<TextureSamplerName>, <coord>, <bias>)<returnSwizzle>;
```

The bias is appended as the GLSL `texture()` builtin's optional trailing `bias` parameter
(`:1426-1430`, appended after any offset/gather-component arguments) — **not** a separate
function name (`textureBias` does not exist; core `texture()` already accepts an optional
bias argument in both desktop GLSL and GLSL ES 3.00 for non-shadow, non-array-shadow
samplers in fragment shaders).

**Type rules**: same destination-type rule as `sample`. Bias is
`TranslateOperand(psSrcBias, TO_AUTO_BITCAST_TO_FLOAT)` — always read/bitcast as float.

**Helpers needed**: none.

**Edge cases**: per GLSL ES 3.00 spec, the optional bias parameter to `texture()` is **only
legal in fragment shaders**; DXBC `sample_b` cannot legally appear in a vertex shader
either (no derivatives), so this is a non-issue in practice, but the emitter should assert
stage == pixel for `sample_b` rather than silently emit invalid vertex-shader GLSL.

**WebGL2 notes**: the bias-argument overload of `texture()` is core GLSL ES 3.00 (unlike
GLSL ES 1.00/`LANG_ES_100`, which required the `GL_OES_shader_texture_lod`-style `EXT`
suffix handled by the `ext = "EXT"` branch at `:1303-1306` — that branch only triggers for
`LANG_ES_100`, never for ES 3.00, so no extension suffix is emitted for this target).

**Confidence**: high — straightforward, fully read lowering path.

---

## 4. `sample_d` (153 occurrences)

**Semantics**: Texture sample with explicit user-supplied screen-space gradients
(`ddx`, `ddy`) instead of automatically-computed derivatives — used to avoid derivative
discontinuities across non-uniform control flow, or to sample from a vertex/geometry-style
context with manually supplied gradients. D3D11 `SAMPLE_D`: `dest, address, resource,
sampler, xDerivatives, yDerivatives`.

**GLSL lowering**: `TranslateTextureSample(psInst, TEXSMP_FLAG_GRAD)`
(`toGLSLInstruction.cpp:3201-3210`). `psSrcDx = operands[4]`, `psSrcDy = operands[5]`
(`:1145-1146`). Template:

```glsl
dest = textureGrad(<TextureSamplerName>, <coord>, vec4(<dx>)<gradSwizzle>, vec4(<dy>)<gradSwizzle>)<returnSwizzle>;
```

- Gradient arguments are always wrapped `vec4(...)` then swizzled down to the dimension's
  `gradSwizzle` (`.x`/`.xy`/`.xyz` per resource dimension, `:1177,1192,1207,1218,1229,1236,1242`)
  — i.e. the DXBC gradient operand is always a full 4-component register, and only the
  dimension-appropriate leading components are kept (`:1378-1388`).
- With an immediate offset, `textureGradOffset(sampler, coord, dx, dy, offsetVec)` is used
  instead (`offset = "Offset"`, `:1311`).

**Type rules**: same destination-type rule as `sample`. Gradient operands are
`TranslateOperand(psSrcDx/Dy, TO_AUTO_BITCAST_TO_FLOAT)` — always bitcast to float.

**Helpers needed**: none.

**Edge cases**: the 2D-array-shadow LOD-workaround described under `sample_l` also applies
here in principle (`needsLodWorkaround` is dimension/depth-compare gated, not
opcode-gated) but `sample_d` is not itself a depth-compare opcode in this corpus (DXBC has
no `sample_d_c`), so it does not fire for plain `sample_d`.

**WebGL2 notes**: `textureGrad`/`textureGradOffset` are core GLSL ES 3.00 builtins for all
non-shadow sampler types plus `sampler2DShadow`/`samplerCubeShadow` (but not
`sampler2DArrayShadow`, consistent with the `sample_l` workaround note). Low corpus count
(153) means most usages likely target ordinary color textures, but if a Carbon effect ever
uses `sample_d` on a 2D-array depth resource, the same "no textureGrad-family overload"
class of gap could theoretically surface — unconfirmed in this corpus, flagged as a risk.

**Confidence**: medium — the lowering path is fully read and low-ambiguity, but the low
occurrence count (153) means it has had less indirect validation than `sample`/`sample_l`/
`sample_b` from the corpus-count-as-confidence-proxy perspective.

---

## 5. `gather4` (195 occurrences) — and `gather4_po` / `gather4_po_c` / `gather4_c`

**Semantics**: Fetches the same single component (selectable) from the 4 texels used in
bilinear filtering at the given coordinate, without applying the bilinear weights — one
`vec4` result where each component is that channel from one of the 4 neighboring texels
(D3D11 `GATHER4` family). `_PO` variants add a programmable integer texel offset operand;
`_C` variants add a depth-comparison reference (shadow gather).

**GLSL lowering**: dispatch at `toGLSLInstruction.cpp:3121-3160`:
- `gather4` -> `TranslateTextureSample(psInst, TEXSMP_FLAG_GATHER)`
- `gather4_po` -> `TEXSMP_FLAG_GATHER | TEXSMP_FLAG_PARAMOFFSET`
- `gather4_po_c` -> `TEXSMP_FLAG_GATHER | TEXSMP_FLAG_PARAMOFFSET | TEXSMP_FLAG_DEPTHCOMPARE`
- `gather4_c` -> `TEXSMP_FLAG_GATHER | TEXSMP_FLAG_DEPTHCOMPARE`

Inside `TranslateTextureSample`, `funcName` is forced to `"textureGather"`
(`:1253-1254`). Template:

```glsl
dest = textureGather(<TextureSamplerName>, <coord>[, <refZ>][, <offsetVec>][, <component>])<returnSwizzle>;
```

- Depth-compare reference (`gather4_c`/`gather4_po_c`): unlike ordinary depth-compare
  sampling, the gather forms pass the reference as a **separate trailing argument**, never
  embedded into the coordinate vector — the code explicitly special-cases
  `!(ui32Flags & TEXSMP_FLAG_GATHER)` when deciding whether to build the `txVecN` embedded-
  reference temp (`:1264-1265`, `:1341-1354`), matching real
  `textureGather(sampler, coord, refZ)` GLSL signature for shadow samplers.
- Programmable offset (`gather4_po`/`gather4_po_c`): read via
  `TranslateOperand(psSrcOff, TO_FLAG_INTEGER, mask)` and appended with a leading comma
  (`:1412-1423`), mask width = `ui32NumOffsets` (1/2/3 per dimension).
  Immediate (non-programmable) offsets on plain `gather4` follow the same
  `bAddressOffset`/`iUAddrOffset` path as `sample`.
- **Gather component selection**: `gather4`/`gather4_po` may carry a 1-component swizzle on
  the *sampler* (`s#`) operand selecting which of R/G/B/A to gather; if that swizzle is not
  `X` (red, the GLSL default), the component index is appended as a trailing int argument
  (`:1432-1447`). Component selection is explicitly **not supported** for the `_C` (depth
  compare) gather variants — HLSLcc's comment states this outright (`:1442-1445`); shadow
  gather always returns the comparison result, there is no channel to select.
- Switch-console-specific `GATHER4_PO` `Offset`-suffix quirk (`:1165-1170`) is not relevant
  to this WebGL2-only target (`psContext->IsSwitch()` is always false here).

**Type rules**: destination type same rule as `sample` (reflected return type,
`SVT_FLOAT` fallback). Offset operand is read with `TO_FLAG_INTEGER` (never bitcast to
float) since GLSL's `ivec` offset parameters require true integer values, not a
reinterpreted float register.

**Helpers needed**: `hlslcc_textureGather4Emulated` (**mandatory for this target** — see
WebGL2 notes below). **Correction**: an earlier draft of this spec claimed "zero hits for
`HaveGather` outside `languages.h`" — that grep claim is false. `toGLSLInstruction.cpp`/
`toGLSLDeclaration.cpp`/`toGLSLOperand.cpp` (the instruction/declaration/operand lowering
proper) indeed never check `HaveGather`, but `toGLSL.cpp`'s `AddVersionDependentCode`
(`:163-172`) does: `if (!HaveGather(eLang)) { if (any gather4* opcode used)
EnableExtension("GL_ARB_texture_gather"); }`. `EnableExtension` (`HLSLCrossCompilerContext.cpp:157-167`)
emits a guarded pragma — `#ifdef GL_ARB_texture_gather` / `#extension GL_ARB_texture_gather
: enable` / `#endif` — so it never hard-fails on an unrecognized extension name; it is a
best-effort "enable it if the compiler happens to advertise it" pattern. For `LANG_ES_300`
this is a no-op in practice: `GL_ARB_texture_gather` is a **desktop**-only ARB extension
token with no ES/WebGL2-side branch (contrast the image-atomics case a few lines above at
`:154-160`, which does pick `GL_OES_shader_image_atomic` on `isES`) — no WebGL2 GLSL ES
preprocessor predefines that macro, so the `#ifdef` never fires, no `#extension` line is
emitted, and the instruction body's hardcoded `funcName = "textureGather"`
(`toGLSLInstruction.cpp:1253-1254`, still unconditional) is unaffected either way. So the
end conclusion is unchanged — this target still needs the emulation helper — but the
"HLSLcc never gates this at all" framing is wrong: it does attempt a gate, the gate is just
built for desktop GL and silently does nothing useful on `LANG_ES_300`. The JS emitter must
supply its own 4-tap emulation (four `textureOffset`/`texture` calls at the four
bilinear-neighbor texel centers, computed from `textureSize`) wherever the real
`textureGather` builtin is unavailable.

**Edge cases**: `textureGather` (where available) requires the four sampled texels to be
selected by hardware bilinear-neighbor rules that are implementation-defined at exact
texel boundaries; an emulated fallback needs to replicate the "texel below-left of the
sample point" neighbor-selection rule (typically via `floor(coord*size - 0.5)` and
`+ivec2(0/1,0/1)` taps) to match D3D `Gather4` semantics closely enough for typical
consumers (contact-hardening shadows, procedural blending). This emulation is
**not sourced from HLSLcc** (HLSLcc assumes `textureGather` exists) and is the single
highest-risk item in this spec.

**WebGL2 notes — critical gap**: `languages.h:220-227` defines
`HaveGather(eLang)` as true only for `eLang >= LANG_400` (desktop GL 4.0+) **or**
`eLang == LANG_ES_310`. **`LANG_ES_300` (this project's actual target) is excluded.**
`textureGather`/`textureGatherOffset` are GLSL ES 3.10 / desktop-GLSL-4.00 builtins; they
do not exist in GLSL ES 3.00 core and WebGL2 (which is GLSL ES 3.00-based) exposes no
extension that adds them. **Correction**: an earlier draft of this spec claimed "HLSLcc's
GLSL backend never checks `HaveGather` before emitting `textureGather(...)`" — that is not
quite right; see the "Helpers needed" correction above: `toGLSL.cpp` does check
`!HaveGather(eLang)` and attempts to `EnableExtension("GL_ARB_texture_gather")`, it's just
that the attempt is built for desktop GL and is a silent no-op on `LANG_ES_300`
(the `#ifdef`-guarded extension macro is never predefined by an ES/WebGL2 preprocessor, and
the instruction body's `funcName` is set unconditionally regardless of that check's
outcome). Net effect is unchanged: it will happily produce GLSL that fails to compile under
strict WebGL2/ES 3.00 validation. This spec's emitter must either (a) always emit the
`hlslcc_textureGather4Emulated` helper instead of raw `textureGather` for this family, or
(b) detect and reject `gather4*` shaders at translation time with an explicit diagnostic —
but silently trusting HLSLcc's literal `textureGather(...)` output will break at WebGL2
shader-compile time. This is the most important actionable finding in this spec for the
`gather4` opcodes.

**Confidence**: low for WebGL2 compilability, high for what HLSLcc *literally emits*
(fully read source, zero ambiguity in the C++, including the `toGLSL.cpp` extension-attempt
correction above) — the risk is entirely in the target capability mismatch documented
above, not in misreading HLSLcc's intent. An earlier draft cited `TRANSPILING-GAPS.md:188`
as corroboration for this being a known pending item; that file does not exist anywhere in
this repository (see the authority-order correction at the top of this document), so that
citation is withdrawn and this section's confidence rests solely on the C++ reading above.

---

## 6. `sample_c` (0 occurrences in corpus, spec required for depth paths)

**Semantics**: Depth-comparison ("shadow") sample: fetches from a depth-format resource
using a comparison sampler, compares the fetched depth against a supplied reference value,
and returns the hardware's percentage-closer-filtered (PCF) result — a **float in
`[0.0, 1.0]`**, not a 0/1 boolean and **not** the DXBC ALU integer comparison-mask
convention. D3D11 `SAMPLE_C`: `dest, address, resource, sampler, referenceValue`, implicit
(derivative-based) LOD like `sample`.

**Important — comparison-mask convention does NOT apply here**: DXBC's scalar/vector ALU
comparison opcodes (`eq`/`ne`/`lt`/`ge`, `ieq`/`ige`/etc., handled by `AddComparison`,
`toGLSLInstruction.cpp:173` and the `OPCODE_GE` comment "the result is a boolean but HLSL
asm returns 0xFFFFFFFF/0x0 instead", `:2689-2694`) produce a full-lane
`0xFFFFFFFF`/`0x00000000` integer mask per component. **`sample_c`/`sample_c_lz`/
`gather4_c` are unrelated to that convention** — hardware depth comparison sampling
returns a genuinely-filtered floating-point value (0.0, 1.0, or any PCF-blended value in
between when the sampler uses linear filtering across multiple depth texels), matching
standard D3D11 `SampleCmp`/`SampleCmpLevelZero` semantics that HLSLcc's GLSL backend
forwards unchanged (it applies no extra masking logic to the depth-compare result — the
value comes directly out of GLSL `texture(sampler2DShadow, ...)`, which itself returns a
filtered float per the GLSL spec).

**GLSL lowering**: `TranslateTextureSample(psInst, TEXSMP_FLAG_DEPTHCOMPARE)`
(`toGLSLInstruction.cpp:3181-3190`). `psSrcRef = operands[4 + hasParamOffset]` (`:1143`).

- For every resource dimension **except** `TEXTURECUBEARRAY` and non-gather ops, the
  reference value is embedded as the **last component of the texture coordinate vector**
  (this matches core GLSL's shadow-sampler convention, where `sampler2DShadow` takes a
  `vec3(u, v, refZ)`): HLSLcc builds a temp,
  ```glsl
  vec3 txVec<N> = vec3(<coord>, <refZ>);
  ```
  (`:1264-1277`; `depthCmpCoordType` is `"vec2"`/`"vec3"`/`"vec4"` per dimension,
  `:1176,1191,1206,1217,1228,1235`), then samples `texture(<sampler>, txVec<N>)`.
  The temp exists "as Adrenos hate nonstandard swizzles in the texcoords" (source comment,
  `:1269`).
- For `TEXTURECUBEARRAY` (no `depthCmpCoordType` case defined) the reference is passed as a
  separate trailing argument instead (`:1349-1354`), matching GLSL's
  `texture(samplerCubeArrayShadow, vec4(dir, arrayIdx), refZ)` signature, which has no room
  in the coordinate vector for both array index and reference.
- Function name is plain `funcName` (`"texture"`, or `"textureLod"`/`"textureGrad"` variants
  per other combined flags) — depth-compare does **not** change the function name, only the
  sampler *type* (`sampler2DShadow` etc., chosen at declaration time from `ui32IsShadowTex`)
  and the coordinate/argument shape.
- `ResourceName`/`TextureSamplerName` calls pass `bZCompare = 1` when
  `TEXSMP_FLAG_DEPTHCOMPARE` is set (`:1333,1335`). **Correction**: because
  `HLSLCC_FLAG_COMBINE_TEXTURE_SAMPLERS` is always set for this fork (see section 0),
  `useCombinedTextureSamplers` is always true, so the instruction body always takes the
  `:1335` branch — `TextureSamplerName(..., bZCompare=1)` — never the `:1333` bare-
  `ResourceName` branch. The declaration that actually matches what the instruction body
  calls is therefore the **combined**-sampler shadow uniform emitted at
  `toGLSLDeclaration.cpp:1634-1646` (`uniform <samplerType>Shadow <TextureSamplerName(...,
  bZCompare=1)>`), **not** `toGLSLDeclaration.cpp:1668-1686` as an earlier draft of this spec
  claimed — that `1668-1686` block declares the *bare* `ResourceName`-based shadow uniform
  (`hlslcc_zcmp`-prefixed plain `t#` symbol), which is emitted unconditionally alongside the
  combined one (regardless of the combine flag) purely for register-identity duplication
  (the same "declared but not referenced by instruction bodies" pattern section 0 already
  documents for the non-shadow case) and is never the symbol the instruction body's call
  resolves to. Concretely, a shader that both plain-samples and depth-compares the same
  `t#` texture with this fork's always-on combine flag gets **four** declared GLSL sampler
  uniforms for that texture (combined non-shadow `TEX_with_SMP` name, combined shadow
  `hlslcc_zcmp...TEX_with_SMP` name, bare non-shadow `t#`/reflected name, bare shadow
  `hlslcc_zcmp`+`t#`/reflected name — `toGLSLDeclaration.cpp:1632-1686`), of which only the
  two combined ones are ever referenced by instruction bodies.

**Type rules**: destination is always float (D3D `SampleCmp` result type is float;
`ui32ReturnType`/`GetTextureDataType` is not consulted for the shadow path's numeric
result — it stays float because depth formats reflect as float). Reference value:
`TranslateOperand(psSrcRef, TO_AUTO_BITCAST_TO_FLOAT)` (`:1275,1353`) — always float.

**Helpers needed**: none beyond the `txVecN` embedding pattern (a per-call-site local
`vec2/vec3/vec4` temp, not a shared function — the JS emitter should replicate this
inline-temp pattern rather than centralizing it, to match HLSLcc's numbering scheme
`m_NextTexCoordTemp` used to keep temp names unique per shader phase, `:1267`).

**Edge cases**: see `sample_l`'s 2D-array-shadow `textureLod`-unavailable workaround —
that workaround is keyed off `TEXSMP_FLAG_DEPTHCOMPARE` and fires for `sample_c` combined
with an explicit-LOD or LOD-zero flag on a `TEXTURE2DARRAY` resource; plain `sample_c`
(implicit LOD) does not need it because ordinary `texture(sampler2DArrayShadow, ...)`
(no explicit LOD) is legal GLSL.

**WebGL2 notes**: `sampler2DShadow`/`sampler2DArrayShadow`/`samplerCubeShadow` and the
`texture()` shadow-comparison overloads are core GLSL ES 3.00. `samplerCubeArrayShadow`
requires cubemap-array support, which itself needs `GL_OES_texture_cube_map_array`/
`GL_EXT_texture_cube_map_array` on ES targets (`HaveCubemapArray` is false for
`LANG_ES_300`, `languages.h:75-80`; `TranslateResourceTexture` enables both OES and EXT
extension strings for ES languages when a cubemap array is declared,
`toGLSLDeclaration.cpp:1608-1619`) — so a `sample_c` against a `TextureCubeArray` shadow
resource depends on a WebGL2 extension actually being available at runtime, which is not
guaranteed.

**Confidence**: medium — the lowering path itself is fully and unambiguously read from
source; the medium (not high) rating is solely because the corpus has 0 real-world
instances to cross-check the reading against, per the task's own instruction to still
document it for depth-path completeness.

---

## 7. `sample_c_lz` (12,640 Frontier occurrences; 0 in the EVE corpus)

**Semantics**: Identical to `sample_c` except the LOD is forced to `0` (no derivative
computation) — D3D11 `SampleCmpLevelZero`. Used for shadow-map lookups from a
non-derivative-having context (frequently a loop-unrolled PCF kernel where the compiler
wants to guarantee LOD-0 regardless of control flow uniformity).

**GLSL lowering**: `TranslateTextureSample(psInst, TEXSMP_FLAG_DEPTHCOMPARE |
TEXSMP_FLAG_FIRSTLOD)` (`toGLSLInstruction.cpp:3191-3200`). `TEXSMP_FLAG_FIRSTLOD` alone
(without `TEXSMP_FLAG_LOD`) selects the `...Lod...` function-name branch
(`:1308`, condition includes `TEXSMP_FLAG_FIRSTLOD`) but supplies a **literal `0.0`**
argument instead of reading an LOD operand (`:1373-1377`, `bcatcstr(glsl, ", 0.0")`) —
there is no LOD source operand for this opcode at all (DXBC `sample_c_lz` has no LOD field
in its operand list; zero is implied by the opcode itself).
Template (non-2D-array-shadow case):

```glsl
dest = textureLod(<sampler2DShadow>, vec3(<coord>, <refZ>), 0.0);
```

- **2D-array shadow workaround applies here directly and unconditionally** for
  `RESOURCE_DIMENSION_TEXTURE2DARRAY` (`needsLodWorkaround` is true whenever
  dimension is 2D-array **and** depth-compare is set — true for both `sample_c` with an
  explicit/zero LOD and, notably, always true for `sample_c_lz` combined with a
  `TEXTURE2DARRAY` resource, which is an extremely common real-world case: cascaded shadow
  maps stored as a `Texture2DArray`). In that case the emitted call becomes:
  ```glsl
  dest = textureGrad(<sampler2DArrayShadow>, txVecN, vec2(0.0,0.0), vec2(0.0,0.0));
  ```
  (`:1297-1300,1357-1360`) — the literal `0.0` LOD argument is dropped entirely in this
  branch (`!needsLodWorkaroundES2` gate at `:1375-1377` only affects the ES-1.00 pixel-
  shader case, irrelevant here).
- A Nintendo-Switch-specific override exists (`:1287-1295`) that reverts this workaround
  back to a plain fetch for `sample_c_lz` specifically, because `textureGrad` on shadow
  samplers is software-emulated (slow) on that platform; this branch is gated by
  `psContext->IsSwitch()` and never applies to this WebGL2-only target.

**Type rules**: same as `sample_c` (float result, float reference operand).

**Helpers needed**: none (same `txVecN` inline-temp pattern as `sample_c`).

**Edge cases**: because the LOD-zero constant is baked in at translation time (not read
from a register), there is no NaN/Inf risk from the LOD argument itself. The 2D-array
`textureGrad`-with-zero-gradients substitution is an *approximation* — it does not
guarantee literal mip level 0 selection the way a true `textureLod(..., 0.0)` would if
that overload existed; zero gradients make the implementation compute the coarsest
(or a very fine) LOD depending on its `dFdx`/`dFdy`-from-zero handling, which is
implementation-defined at the edges but converges to LOD 0 in practice on all GLES/ANGLE
implementations observed by upstream HLSLcc (this is HLSLcc's own accepted tradeoff;
Frontier's observed comparison samples are all 2D and therefore do not exercise it).

**WebGL2 notes**: identical to `sample_c`'s notes; the `textureGrad`-for-shadow-2D-array
substitution is specifically a WebGL2/GLSL-ES-3.00 accommodation (GLSL ES 3.00 core simply
has no `textureLod` overload for `sampler2DArrayShadow` — same restriction exists in
desktop GLSL, this is not an ES-only gap).

**Corpus evidence**: the cached Frontier Stillness high-tier catalog from 2026-07-10
contains 12,640 instructions across 784 unique pixel shaders and 99 effects. Every
observed instruction targets `texture2d`; no affected shader samples the same resource
through both comparison and ordinary filtered operations. The EVE build-3430261
high-tier corpus contains no `sample_c` or `sample_c_lz` instructions.

**Confidence**: high for the observed `texture2d` path — the full Frontier corpus emits,
and representative StandardPBR and QuadV5 programs compile/link in Chromium WebGL2.
Synthetic 2D, cube, and 2D-array shadow variants also compile/link; cube/array remain
lower-confidence semantically because Frontier does not exercise those dimensions.

---

## 8. `ld` (667 occurrences)

**Semantics**: Direct, unfiltered texel fetch by **integer** coordinates plus an explicit
integer mip level — no sampler object involved at all (samplerless access, confirmed by
`decisions/005-samplerless-texture-access-evidence-2026-06-26.md`). D3D11 `LD`: `dest,
address(int), resource[, swizzle]`, where `address.w` (or `.a`) holds the mip level for
non-multisample resources.

**GLSL lowering**: dispatches through the shared `OPCODE_LD`/`OPCODE_LD_MS` case
(`toGLSLInstruction.cpp:4092-4109`) into `TranslateTexelFetch`
(`:819-980`). Per-dimension templates (`:896-976`):

| Resource dimension | Template |
|---|---|
| `TEXTURE1D` / `BUFFER` | `texelFetch(tex, int(coord.x), int(coord.w))` (buffer has no LOD arg) |
| `TEXTURE2D` / `TEXTURE1DARRAY` | `texelFetch(tex, ivec2(coord.xy), int(coord.w))` |
| `TEXTURE2DARRAY` / `TEXTURE3D` | `texelFetch(tex, ivec3(coord.xyz), int(coord.w))` |
| `TEXTURE2DMS` (`ld_ms` only) | `texelFetch(tex, ivec2(coord.xy), int(sampleIndexOperand.x))` — 3rd instruction operand, not `.w` |
| `TEXTURE2DMSARRAY` (`ld_ms`) | `texelFetch(tex, ivec3(coord.xyz), int(sampleIndexOperand.x))` |
| Cube / CubeArray / BufferEx | not possible in HLSL or GLSL — `ASSERT(0)` (`:970-974`) |

- `hasOffset` (`psInst->bAddressOffset`) swaps in `texelFetchOffset(...)` with a trailing
  `ivec2`/`ivec3`/int offset literal (`:875,891-894,909-911,923-926,938-941`).
- **Source bug — malformed offset literal for `TEXTURE2D`/`TEXTURE2DARRAY`**: the
  `TEXTURE1D` (`:909-910`, plain `int`) and `TEXTURE3D` (`:923-924`, `ivec3(%d, %d, %d)`,
  3 args) offset literals are well-formed, but the `TEXTURE2DARRAY` (`:925-926`) and
  `TEXTURE2D` (`:940-941`) cases both emit the literal text `ivec3(%d, %d)` —
  labeled `ivec3` but with only **two** `%d` substitutions
  (`bformata(glsl, ", ivec3(%d, %d)", psInst->iUAddrOffset, psInst->iVAddrOffset)`).
  `ivec3(3, 5)` is not a legal GLSL constructor call (an `ivec3` needs 3 components, or a
  single scalar to splat, not 2), so this is invalid GLSL that will fail to compile — this
  looks like a copy-paste typo in the vendor source (should read `ivec2`, matching the
  correct 2-arg, 2D offset shape used elsewhere, e.g. `sample`'s own offset-building code at
  `toGLSLInstruction.cpp:1398-1402` which correctly emits `ivec2(%d, %d)` for 2 offsets).
  Any Carbon effect that uses an immediate texel offset (`sample_controls`) on a `ld`/`ld_ms`
  against a `Texture2D` or `Texture2DArray` resource will hit this bug and get
  non-compiling GLSL; `Texture1D`/`Texture3D`/`Texture1DArray` immediate-offset `ld` is
  unaffected. This is a real upstream HLSLcc defect (ground truth wins per this review's
  brief), not a misreading — the JS emitter must special-case these two dimensions to emit
  `ivec2` instead of replicating the literal `ivec3` text.
- Coordinates are read `TO_FLAG_INTEGER | TO_AUTO_EXPAND_TO_VEC2/VEC3` (`:903,920,935,950,961`)
  — **integer**, not the `TO_AUTO_BITCAST_TO_FLOAT` used by filtered sampling; the mip/LOD
  (or sample index for MS) is separately read with plain `TO_FLAG_INTEGER` on the `.w`/`.a`
  mask or the dedicated 4th operand.
- Return-channel swizzle is applied the same way as `sample` (via the texture operand's
  own swizzle re-enabled and masked by the destination access mask, `:978`).
- On Vulkan the texture name is wrapped `<samplerType>(<tex>, <dummySampler>)` because
  SPIR-V requires every texel fetch to go through a combined-image-sampler even when HLSL
  had none (`:872-886`) — **not applicable** to this non-Vulkan WebGL2 target; plain
  `texelFetch(tex, ...)` is used directly with no dummy sampler wrapper.

**Type rules**: destination type comes from the (possibly synthesized-fallback) resource
binding's `ui32ReturnType` via `ResourceReturnTypeToFlag`/`TypeFlagsToSVTType`
(`:889`), defaulting to `RETURN_TYPE_FLOAT` when unreflected
(`fallbackBinding.ui32ReturnType = RETURN_TYPE_FLOAT`, `:830`) — this is the exact
`CARBONENGINEJS-FORK.md` "samplerless texture fetches synthesize a fallback resource
binding from `SHEX` declaration data" behavior. Coordinate and mip/sample-index operands
are always read as true integers (`TO_FLAG_INTEGER`), never bitcast-to-float — this is the
one texture opcode family where address components are genuinely integer, not
float-reinterpreted-as-address.

**Helpers needed**: none — `texelFetch`/`texelFetchOffset` are core GLSL ES 3.00 builtins
for all the dimensions DXBC `ld` legally targets.

**Edge cases**: out-of-range integer coordinates or mip level return `vec4(0)` per GLSL ES
3.00 spec (well-defined, unlike desktop GL's implementation-defined behavior in some
older versions) — no clamp needed from the translator. Buffer resources have no mip/LOD
argument at all (`:904-911` conditionally omits it).

**WebGL2 notes**: fully native, no gaps. This is one of the safest opcodes in the family
for WebGL2 portability.

**Confidence**: high — `TranslateTexelFetch` fully read, dimension table directly
transcribed from source, and its `SHEX`-fallback path is independently corroborated by
`CARBONENGINEJS-FORK.md`.

---

## 9. `resinfo` (247 occurrences)

**Semantics**: Queries a resource's dimensions (width/height/depth-or-array-size) at a
given mip level, plus the resource's total mip-chain length, with a caller-selectable
return-type encoding (float / reciprocal-float / uint) — D3D11 `RESINFO`, decoded
return-type control per `decisions/016...018-dxbc-instruction-controls...md`: bits 11-12 of
the opcode token, `0` = float, `1` = reciprocal float, `2` = uint
(`RESINFO_INSTRUCTION_RETURN_{FLOAT,RCPFLOAT,UINT}`).

**GLSL lowering**: dispatch loop iterates the destination write mask, calling
`GetResInfoData(psInst, swizzledComponentIndex, destElem)` once per live destination
component (`toGLSLInstruction.cpp:4734-4752`), implementation at `:1033-1129`:

- For `index` (post-swizzle component index) `< 3` — width/height/depth-or-arraysize:
  ```glsl
  dest.<comp> = <returnCast>( <maybe 1.0/> textureSize(<tex>[, int(mipOperand)]) [.x|.y|.z] );
  ```
  - `dim = GetNumTextureDimensions(eResDim)` (`HLSLccToolkit.cpp:437-458`: 1 for
    `TEXTURE1D`; 2 for `TEXTURE2D`/`TEXTURE2DMS`/`TEXTURE1DARRAY`/`TEXTURECUBE`; 3 for
    `TEXTURE3D`/`TEXTURE2DARRAY`/`TEXTURE2DMSARRAY`/`TEXTURECUBEARRAY`).
  - If the requested `index` exceeds `dim` (e.g. asking for `.z` on a 2D texture), the
    literal constant `0`/`0.0`/`uint(0)` is emitted instead of calling `textureSize`
    (`:1064-1067`) — the source comment notes `0u` is mistreated as a const-int by "old
    ES3.0 Adrenos", hence `uint(0)` is spelled out rather than a bare `0u`.
  - Return-type wrapping: `RESINFO_INSTRUCTION_RETURN_UINT` → `uvec<dim>(...)` (or
    `ivec<dim>` if `HaveUnsignedTypes` is false, not applicable to ES 3.00);
    `RESINFO_INSTRUCTION_RETURN_RCPFLOAT` → `vec<dim>(1.0) / vec<dim>(textureSize(...))`;
    else → `vec<dim>(textureSize(...))` (`:1070-1080`).
  - MS resources (`isMS`) and UAVs (`isUAV`) omit the mip-level argument to
    `textureSize`/`imageSize` entirely (`:1089-1093`; UAV uses `imageSize` instead of
    `textureSize`, `:1082-1085` — not reachable via the pure `t#` `resinfo` path this family
    documents, but present in the same function since `resinfo` can also target a UAV).
- For `index >= 3` (total mip-level count):
  ```glsl
  dest.w = <int|uint|float>(textureQueryLevels(<tex>));
  ```
  (`:1112-1127`) — **unconditionally emitted with no target-language capability check**
  (see WebGL2 notes below).

**Type rules**: each live destination component is assigned independently via
`AddOpAssignToDestWithMask(..., eResInfoReturnType == RESINFO_INSTRUCTION_RETURN_UINT ?
SVT_UINT : SVT_FLOAT, 1, ..., 1 << destElem)` (`:1057`) — i.e. `resinfo`'s destination type
per-component is uint only for the UINT return-type control, float for both FLOAT and
RCPFLOAT controls (RCPFLOAT is still a float result, just the reciprocal).

**Helpers needed**: `hlslcc_textureQueryLevels` (**mandatory for the 4th/mip-count
component on this target** — see WebGL2 notes). No helper needed for the width/height/
depth components (`textureSize` is fully core).

**Edge cases**: `textureSize` with an out-of-range `lod` argument returns `0` per GLSL ES
3.00 spec (well-defined). Buffer/`BUFFEX` resources are excluded from the `dim==0` default
path implicitly by never appearing in the `resinfo`-legal dimension set.

**WebGL2 notes — gap on the mip-count component**: `languages.h:247-254` defines
`HaveQueryLevels(eLang)` true only for `eLang >= LANG_430`. `LANG_ES_300` does **not**
qualify, and `GetResInfoData`'s `index >= 3` branch (`:1112-1127`) itself calls
`textureQueryLevels(...)` unconditionally, with no local `HaveQueryLevels` gate. **Correction**:
an earlier draft of this spec said this was "no gate at all" and contrasted it with `lod`'s
`HaveQueryLod` as the supposed sole gated case in the family — that contrast overstates the
difference. `toGLSL.cpp`'s `AddVersionDependentCode` **does** check `HaveQueryLevels`
(`:234-241`): `if (!HaveQueryLevels(eLang)) { if (OPCODE_RESINFO used)
{ EnableExtension("GL_ARB_texture_query_levels"); EnableExtension("GL_ARB_shader_image_size"); } }`.
As with `gather4`'s analogous `GL_ARB_texture_gather` attempt above, both are desktop-only
ARB extension tokens behind an `EnableExtension` `#ifdef` guard that is never true under a
GLSL ES/WebGL2 preprocessor, so on `LANG_ES_300` this is a no-op in practice: no
`#extension` line is emitted and `GetResInfoData`'s call site is unaffected. The practical
conclusion is therefore unchanged — `textureQueryLevels` does not exist in GLSL ES 3.00
core, has no WebGL2-exposed extension equivalent, and any Carbon effect that reads
`resinfo`'s 4th (`.w`, "total mip count") component on this target will receive GLSL that
fails to compile. Given 247 corpus occurrences of `resinfo`, this is a second actionable,
high-value gap for this spec (alongside `gather4`'s `textureGather` gap) — the emitter must
substitute `hlslcc_textureQueryLevels` (fallback strategy: accept the mip count as an
out-of-band uniform per texture, since there is no in-shader WebGL2-legal way to query it;
or hard-fail translation if this exact component is read). The first-3-components path
(`textureSize`) has no such gap.

**Confidence**: high on what HLSLcc emits (fully read, unambiguous, including the
`toGLSL.cpp` extension-attempt correction above), but explicitly flagged as a real WebGL2
compile-time risk for the mip-count component. The general opcode was previously described
as "corroborated by `TRANSPILING-GAPS.md:186,337`" — that file does not exist in this
repository (see the authority-order correction at the top of this document), so that
corroboration claim is withdrawn; this section's confidence now rests solely on the C++
reading above.

---

## 10. `deriv_rtx_coarse` (209) and `deriv_rty_coarse` (215)
### (plus `deriv_rtx`/`deriv_rtx_fine`/`deriv_rty`/`deriv_rty_fine`, same lowering)

**Semantics**: Screen-space partial derivative of the source value with respect to
window-space X (`rtx`) or Y (`rty`). D3D11 distinguishes `_coarse` (may share a derivative
across a 2x2 quad, cheaper) from `_fine` (per-pixel) and from the plain (compiler's choice)
form, but **GLSL only exposes one derivative pair** (`dFdx`/`dFdy`), with precision
controlled by an optional `GL_OES_standard_derivatives`-style hint, not a distinct
coarse/fine builtin.

**GLSL lowering**: all six coarse/fine/plain DERIV opcodes collapse onto the same two
`case` blocks (`toGLSLInstruction.cpp:4579-4602`):
```glsl
dest = dFdx(src)<destSwizzleSubset>;   // DERIV_RTX_COARSE / DERIV_RTX_FINE / DERIV_RTX
dest = dFdy(src)<destSwizzleSubset>;   // DERIV_RTY_COARSE / DERIV_RTY_FINE / DERIV_RTY
```
via `CallHelper1("dFdx", psInst, 0, 1, 1)` / `CallHelper1("dFdy", psInst, 0, 1, 1)`.
`CallHelper1` (`:745-762`): destination is assigned `SVT_FLOAT` with the destination's own
swizzle-element count (`AddAssignToDest(dest, SVT_FLOAT, dstSwizCount, ...)`), the call is
`name(TranslateOperand(src0, TO_AUTO_BITCAST_TO_FLOAT, destMask))` where `destMask` is the
destination's own access mask (the 4th `CallHelper1` argument, `paramsShouldFollowWriteMask
= 1`, restricts the source read to the same components being written).

**Type rules**: always float in and float out; source is
`TO_AUTO_BITCAST_TO_FLOAT` (reinterpret as float if the register was produced as int/uint).
No int/uint derivative form exists in DXBC or GLSL.

**Helpers needed**: none — `dFdx`/`dFdy` are core GLSL ES 3.00 builtins (fragment-shader
only).

**Edge cases**: derivatives are **fragment-shader only** — DXBC guarantees `deriv_*` never
appears in a vertex shader (no rasterization quad exists there), so no stage guard is
needed beyond what DXBC itself enforces. Derivatives across non-uniform control flow
(diverging discard/branch within a 2x2 quad) are undefined-ish in both D3D and GLES —
HLSLcc adds no special handling; this is an inherent GPU behavior difference the
translator cannot paper over.

**WebGL2 notes**: `dFdx`/`dFdy` (and `fwidth`) are **core, unconditional** in GLSL ES 3.00
(unlike GLSL ES 1.00/WebGL1, where they required the `GL_OES_standard_derivatives`
extension — irrelevant here since target is ES 3.00). The coarse/fine distinction is
simply lost/unified; there is no GLSL ES 3.00 way to request coarse-only derivatives, so
`_fine` and `_coarse` and plain forms are indistinguishable in the output, matching
upstream HLSLcc behavior exactly (not a gap this project introduces).

**Confidence**: high — trivial, fully read, single-line-per-opcode lowering, high corpus
count (209+215 combined for the `_coarse` variants alone).

---

## 11. `lod` (0 occurrences in corpus, spec required per task)

**Semantics**: Computes the LOD the hardware *would* select for a given sample (both the
"clamped" and "unclamped" values), without actually sampling — D3D11 `LOD`: result is
`(ClampedLOD, NonClampedLOD, 0, 0)`. Distinct from every `sample_*` opcode: this one never
fetches texels.

**GLSL lowering**: `toGLSLInstruction.cpp:4161-4200`.
```glsl
dest = textureQueryLod(<tex>, <coord>)<returnSwizzle>;   // core-language name, LANG>=400
// or
dest = textureQueryLOD(<tex>, <coord>)<returnSwizzle>;   // extension name, otherwise
```
Function-name casing is chosen by `HaveQueryLod(eLang)` (`languages.h:238-245`, true only
for `eLang >= LANG_400`) — this is the one check in this family that gates a **function
name** directly inside the instruction-lowering switch itself (`gather4`'s `HaveGather` and
`resinfo`'s `HaveQueryLevels` are instead checked separately in `toGLSL.cpp`'s
`AddVersionDependentCode`, purely to attempt an `EnableExtension` pragma — see the
corrections in those sections above; `lod` gets an analogous, equally ES-3.00-ineffective
`EnableExtension("GL_ARB_texture_query_lod")` attempt there too, gated on the same
`!HaveQueryLod` check, at `toGLSL.cpp:226-231`).

**Correction — resource-name resolution bypasses the combined-sampler ABI**: unlike every
other opcode in this family, the texture operand here (`psInst->asOperands[2]`) is emitted
via a plain `TranslateOperand(&psInst->asOperands[2], TO_FLAG_NONE)` call (`:4185`), which
for an `OPERAND_TYPE_RESOURCE` operand routes into `toGLSLOperand.cpp:1271-1275`'s
`case OPERAND_TYPE_RESOURCE: ResourceName(glsl, psContext, RGROUP_TEXTURE,
psOperand->ui32RegisterNumber, 0);` — the **bare** `ResourceName` path, not
`TextureSamplerName`. `lod` never touches its sampler operand
(`psInst->asOperands[3]`) at all. So even though `HLSLCC_FLAG_COMBINE_TEXTURE_SAMPLERS` is
always on for this fork, `lod` always references the bare, non-combined `t#`/reflected-name
sampler uniform (the one declared unconditionally at `toGLSLDeclaration.cpp:1659-1666`) —
a *different* GLSL uniform than the combined `TEX_with_SMP...` name that `sample`/
`sample_l`/etc. use to read the same DXBC texture register. This is architecturally
consistent (`textureQueryLod` only needs one sampler object, and a real one is always
declared), but it means `lod` is the one opcode in this family that does not follow
section 0's combined-sampler naming rule, which the earlier draft of this section did not
call out at all. Coordinates use the same `TranslateTexCoord` per-dimension selection as
`sample` (`:4187-4189`). Return-channel swizzle applied the same way as other texture ops
(`:4194-4197`).

**Type rules**: destination is always `SVT_FLOAT`, 4 components (`AddAssignToDest(dest,
SVT_FLOAT, 4, ...)`, `:4171`) — DXBC `lod` always produces float regardless of the
resource's reflected return type (this is a query result, not a texel fetch).

**Helpers needed**: `hlslcc_textureQueryLod` fallback (see WebGL2 notes — `LANG_ES_300`
falls into the `textureQueryLOD` extension-name branch, but that extension is not part of
WebGL2's guaranteed baseline).

**Edge cases**: none beyond standard coordinate range handling; no fetch occurs so no
wrap/border-color interaction applies.

**WebGL2 notes — gap**: `HaveQueryLod(LANG_ES_300)` is false, so HLSLcc emits the
extension-style name `textureQueryLOD(...)`. That name corresponds to
`GL_ARB_texture_query_lod` (desktop) / `GL_EXT_texture_query_lod`-equivalent — **not** a
function that exists in unextended WebGL2/GLSL ES 3.00, and no such extension is part of
the WebGL2 core extension set exposed by browsers. Since the corpus shows 0 real usages,
this is a low-priority gap in practice, but the emitter should either detect `lod`
opcode usage and fail translation explicitly, or provide a CPU-side/uniform-supplied LOD
approximation, rather than emit a GLSL call that will not link on any real WebGL2
implementation.

**Confidence**: low — zero corpus occurrences means this reading has no cross-check
against real Carbon effect output; the source reading itself (line-cited above) is
unambiguous, but "will this ever actually appear" is unverified.

---

## Coordinate component selection per resource dimension

Ground truth: `TranslateTexCoord` (`toGLSLInstruction.cpp:985-1031`), used by every
filtered-sample opcode (`sample`, `sample_l`, `sample_b`, `sample_d`, `sample_c`,
`sample_c_lz`, `gather4*`, `lod`) — **not** used by `ld`/`ld_ms` (integer path, see
`TranslateTexelFetch` table above) or `resinfo` (no coordinate operand for width/height
query; only an optional mip-level scalar).

| `eResDim` | Access mask kept | Auto-expand | Meaning of DXBC address components |
|---|---|---|---|
| `TEXTURE1D` | `.x` only | none (scalar) | `x` = u |
| `TEXTURE2D` | `.xy` | `vec2` | `xy` = (u, v) |
| `TEXTURE1DARRAY` | `.xy` | `vec2` | `x` = u, `y` = array slice |
| `TEXTURECUBE` | `.xyz` | `vec3` | `xyz` = direction vector |
| `TEXTURE3D` | `.xyz` | `vec3` | `xyz` = (u, v, w) |
| `TEXTURE2DARRAY` | `.xyz` | `vec3` | `xy` = (u, v), `z` = array slice |
| `TEXTURECUBEARRAY` | all 4 (`.xyzw`) | `vec4` | `xyz` = direction, `w` = array slice |

All texcoord operands are read with `TO_AUTO_BITCAST_TO_FLOAT` (`:989`) regardless of
dimension — the address register is always treated as float data (reinterpreted via
`intBitsToFloat`/`uintBitsToFloat` if it was produced by an integer-typed instruction),
consistent with DXBC's convention that sample-instruction addresses are always float even
though the same register file backs int/uint temps.

The depth-compare embedded-coordinate type (`depthCmpCoordType`, one dimension wider than
the plain coordinate type to make room for the reference value) is: `TEXTURE1D` → `vec2`,
`TEXTURE2D`/`TEXTURE1DARRAY` → `vec3`, `TEXTURECUBE`/`TEXTURE3D`/`TEXTURE2DARRAY` → `vec4`,
`TEXTURECUBEARRAY` → none (reference passed as a separate trailing argument instead, see
`sample_c` above).

---

## `sample_controls` extension: immediate texel offsets

Ground truth: `decisions/016-018-dxbc-instruction-controls-used-by-the-gles-draft-transpiler.md`
plus `toGLSLInstruction.cpp:1161-1170,1391-1423`.

- The extended-opcode-token field `sample_controls` (bits 0-5 of an extended token,
  decoded per Microsoft DXC's `d3d12TokenizedProgramFormat.hpp`) carries three signed
  immediate texel-offset values (U/V/W, each roughly -8..+7) attached to a `sample*`/`ld*`/
  `gather4*` instruction. HLSLcc surfaces this as `psInst->bAddressOffset` +
  `iUAddrOffset`/`iVAddrOffset`/`iWAddrOffset` on the `Instruction` struct.
- When present, every texture-op template in this family appends `"Offset"` to the GLSL
  function name (`texture` → `textureOffset`, `textureLod` → `textureLodOffset`,
  `textureGrad` → `textureGradOffset`, `texelFetch` → `texelFetchOffset`,
  `textureGather` → `textureGatherOffset`) and appends a trailing integer/`ivecN` literal
  argument built directly from the decoded immediate offset values — **not** a runtime
  register read, since D3D11 requires these offsets to be compile-time immediates.
- `gather4_po`/`gather4_po_c` instead carry a **programmable** (runtime, register-valued)
  offset via a distinct extra source operand (`psSrcOff`), read with
  `TO_FLAG_INTEGER` and appended as a comma-separated argument rather than a function-name
  suffix — this is the one offset form in the family that is not a literal.
- `TRANSPILING-GAPS.md:338` ("Already handled"): "DXBC sample offsets lower to WebGL2
  offset texture calls where resource dimension supports it" — corroborates the
  above from the draft-transpiler side.
- WebGL2 note: `textureOffset`/`textureLodOffset`/`textureGradOffset`/`texelFetchOffset`
  are all core GLSL ES 3.00 (§8.9 of the spec) and impose a **compile-time-constant**
  offset requirement — the offset argument must be a constant expression, matching DXBC's
  own immediate-only restriction, so no runtime-variable-offset gap exists for the literal
  (`bAddressOffset`) path. `textureGatherOffset` shares the `HaveGather`-gap noted for
  `gather4` above (ES 3.00 does not have it at all, regardless of constant-offset support).

---

## Helpers summary

Helpers this family requires the JS emitter to define (native GLSL ES 3.00 builtins used
directly — `texture`, `textureLod`, `textureGrad`, `texelFetch`, `textureSize`,
`textureOffset`/`textureLodOffset`/`textureGradOffset`/`texelFetchOffset`, `dFdx`, `dFdy`,
`floatBitsToInt`/`floatBitsToUint`/`intBitsToFloat`/`uintBitsToFloat` — are **not** listed
here since they need no custom implementation):

1. **`hlslcc_textureGather4Emulated`** — mandatory. `textureGather`/`textureGatherOffset`
   do not exist in GLSL ES 3.00 (`HaveGather` excludes `LANG_ES_300`,
   `languages.h:220-227`), yet HLSLcc's GLSL backend emits them unconditionally for
   `gather4`/`gather4_po`/`gather4_po_c`/`gather4_c`. Must emulate via four texel taps
   (computed from `textureSize`) replicating D3D `Gather4`'s neighbor-selection order.
   Needed for both the plain-channel-gather and (separately, since component selection is
   unsupported there per source) the depth-compare gather variants.
2. **`hlslcc_textureQueryLevels`** — mandatory for `resinfo`'s 4th (mip-count) destination
   component only. `textureQueryLevels` requires `LANG >= 430`
   (`languages.h:247-254`) but `GetResInfoData` calls it with **no gate at all**
   (`toGLSLInstruction.cpp:1112-1127`). No WebGL2/ES-3.00 extension provides an equivalent;
   fallback strategy (out-of-band uniform, or explicit translation failure on this specific
   component) must be decided by the emitter.
3. **`hlslcc_textureQueryLod`** — needed only if the (zero-occurrence-so-far) `lod` opcode
   is ever exercised. `HaveQueryLod` correctly excludes `LANG_ES_300`
   (`languages.h:238-245`), and the resulting `textureQueryLOD(...)` extension name has no
   WebGL2-guaranteed equivalent either. Lowest priority of the three, but same class of gap.
4. **Depth-compare inline coordinate temp (`txVec<N>`)** — not a shared function, but a
   per-call-site codegen pattern (`vecK txVecN = vecK(coord, refZ);`) the emitter must
   replicate for `sample_c`/`sample_c_lz`/`gather4_po_c` on non-cube-array dimensions,
   using a monotonically increasing per-phase counter matching HLSLcc's
   `m_NextTexCoordTemp` (`toGLSLInstruction.cpp:1267`) to keep temp names collision-free.

No helper is needed for `sample`, `sample_l`, `sample_b`, `sample_d`, `ld`, or the
`deriv_rtx*`/`deriv_rty*` family — all of those map directly onto unconditional GLSL ES
3.00 core builtins.
