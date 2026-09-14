# DXBC -> GLSL ES 3.00 Lowering Spec: texture-sample family

Status: Evolving
Scope: `@carbonenginejs/runtime/resource/formats/webgl` texture and sampling lowering
Audience: Shader translator maintainers and reviewers
Summary: Defines DXBC texture sampling behavior and WebGL2 target adaptations.

Historical lowering study: the target and register convention below describe
the studied configuration, not today's full emitter support. Confidence ratings
and unresolved qualifications are retained; this condensation is not shader validation.

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

Filtered sampling with sampler-controlled wrap/filter state and implicit,
derivative-based LOD. DXBC operands: `dest, address, resource, sampler`.
`TranslateTextureSample(psInst, TEXSMP_FLAG_NONE)` dispatches at
`toGLSLInstruction.cpp:3161-3170` into `:1131-1459`:

`dest = texture(<TextureSamplerName>, <coord>)<returnSwizzle>;`

### Shared sampling machinery

Variants below inherit this machinery except where their sections name a delta.

- ES300 uses overloaded `texture`, not legacy `texture2D`/`textureCube`:
  `iHaveOverloadedTexFuncs` excludes only `LANG_ES_100`/`LANG_120`
  (`languages.h:37-44`). Dimension selects `funcName`, `offset`,
  `gradSwizzle`, `ui32NumOffsets` (`:1172-1251`). The study's
  cubemap-array qualification remains with its dimension/depth paths.
- `TranslateTexCoord` (`:985-1031`) selects/expands leading address
  components; the coordinate table below owns the mapping. It reads
  `TO_AUTO_BITCAST_TO_FLOAT` (`:989`), including integer-produced registers.
- `bAddressOffset` adds the `Offset` suffix and literal integer/vector
  argument (`:1391-1411`); the sample-controls section owns this rule.
- Result swizzle belongs to the **texture operand**, not the destination.
  Re-enable its `iWriteMaskEnabled`, then
  `TranslateOperandSwizzleWithMask(psContext, psSrcTex, psDest->GetAccessMask(), 0)`
  (`:1451-1457`) intersects that RGBA permutation with the destination mask.
- `_sat` is applied **after** the sampling function by the general
  instruction epilogue (`:4821-4844`): `dst = clamp(dst, 0.0, 1.0);`,
  with the `UNITY_ADRENO_ES3`-guarded `min(max(x,0.0),1.0)` form.
  This epilogue applies throughout the family, not inside `TranslateTextureSample`.

**Types:** `ShaderInfo::GetTextureDataType(texRegNo)`
(`ShaderInfo.cpp:10-18`) maps reflected return type to float/int/uint,
defaulting to `SVT_FLOAT` without RDEF. `AddAssignToDest`
(`toGLSLInstruction.cpp:1281`, `:155-171`) wraps mismatches between
texture result and declared destination type using the appropriate bitcast.
The historical float-register proposal treats results as float storage and
defers integer reinterpretation to consuming instructions; it is not a new
qualification of current integer handling.

Sampler type is selected at declaration by `GetSamplerType`
(`toGLSLDeclaration.cpp:1388-1551`); unreflected fallback is float
(`sampler2D` at `:1550` and per-dimension defaults). Core bitcast
builtins require no custom helpers: `HaveBitEncodingOps` excludes only
`LANG_ES_100`/`LANG_120` (`languages.h:169-180`).

**Edge cases**: Out-of-range coordinates follow the sampler's wrap mode (not a DXBC
concern — GLSL `texture()` handles it per the WebGL2 sampler state, which is set at the
JS/WebGL layer, outside this translator's scope). NaN/Inf in coordinates is
undefined/implementation-defined per GLSL ES spec, same as native GLSL; HLSLcc does not
special-case it.

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

Returns one selected channel from each of four bilinear-neighbor texels as a
`vec4`, without applying bilinear weights. `_PO` adds a programmable
integer offset; `_C` adds a comparison reference.
Dispatch (`toGLSLInstruction.cpp:3121-3160`) combines flags:

| Opcode | `TEXSMP_FLAG_*` |
|---|---|
| `gather4` | `GATHER` |
| `gather4_po` | `GATHER \| PARAMOFFSET` |
| `gather4_po_c` | `GATHER \| PARAMOFFSET \| DEPTHCOMPARE` |
| `gather4_c` | `GATHER \| DEPTHCOMPARE` |

`TranslateTextureSample` forces `textureGather` (`:1253-1254`):

`dest = textureGather(<TextureSamplerName>, <coord>[, <refZ>][, <offsetVec>][, <component>])<returnSwizzle>;`

Shared result-type/swizzle/mask machinery is in §1. Gather-specific arguments:

- Comparison reference is **separate**, never embedded in `txVecN`.
  The temporary condition explicitly excludes `TEXSMP_FLAG_GATHER`
  (`:1264-1265`, `:1341-1354`).
- Programmable offsets use `TranslateOperand(psSrcOff, TO_FLAG_INTEGER, mask)`
  (`:1412-1423`), with `ui32NumOffsets` components (1/2/3).
  Immediate offsets use the shared `bAddressOffset`/`iUAddrOffset` path.
  The Switch-only `GATHER4_PO` suffix quirk (`:1165-1170`) is excluded.
- A one-component **sampler-operand** swizzle selects R/G/B/A; non-X appends
  a trailing integer channel (`:1432-1447`). This is not result swizzling.
  Comparison gathers have no selectable channel (`:1442-1445`).

### Historical ES300 capability gap

`HaveGather` (`languages.h:220-227`) accepts `>=LANG_400` or
`LANG_ES_310`, not ES300. Instruction emission is unconditional, but
`AddVersionDependentCode` (`toGLSL.cpp:163-172`) tests `!HaveGather`
and attempts `GL_ARB_texture_gather` for `gather4*`.
`EnableExtension` (`HLSLCrossCompilerContext.cpp:157-167`) emits
an `#ifdef`-guarded pragma, not an unknown-extension failure. Under
ES/WebGL2 that desktop token is not predefined, so the call remains unchanged.
Unlike image atomics at `:154-160`, there is no `isES` branch choosing
`GL_OES_shader_image_atomic`. The earlier “no gate” claim was incorrect;
the attempted gate is ineffective for this target.

The study requires `hlslcc_textureGather4Emulated` (four
`textureOffset`/`texture` taps at centers derived from `textureSize`)
**or explicit translation rejection**, not literal unsupported
`textureGather`/`textureGatherOffset`. Neither is an ES300 builtin
or supplied by a WebGL2 extension. Emulation's ordering risk remains below.

**Edge cases**: `textureGather` (where available) requires the four sampled texels to be
selected by hardware bilinear-neighbor rules that are implementation-defined at exact
texel boundaries; an emulated fallback needs to replicate the "texel below-left of the
sample point" neighbor-selection rule (typically via `floor(coord*size - 0.5)` and
`+ivec2(0/1,0/1)` taps) to match D3D `Gather4` semantics closely enough for typical
consumers (contact-hardening shadows, procedural blending). This emulation is
**not sourced from HLSLcc** (HLSLcc assumes `textureGather` exists) and is the single
highest-risk item in this spec.

**Confidence**: low for WebGL2 compilability, high for HLSLcc's literal output
(fully read C++, including the global extension attempt). The risk is target
capability mismatch. The earlier `TRANSPILING-GAPS.md:188` corroboration is
withdrawn: that file is absent (see the authority-order correction), so this
assessment rests solely on the cited C++ reading.

---

## 6. `sample_c` (0 occurrences in corpus, spec required for depth paths)

Implicit-LOD sampling of a depth-format resource using a comparison sampler:
`dest, address, resource, sampler, referenceValue`.
The percentage-closer-filtered (PCF) result is **float in [0,1]**, including
intermediate linear-filter values, not a Boolean or all-ones comparison mask.
This also applies to `sample_c_lz` and `gather4_c`. Contrast ALU
`eq/ne/lt/ge`, `ieq/ige` masks (`0xFFFFFFFF`/`0x00000000`; `AddComparison`,
`toGLSLInstruction.cpp:173`; `OPCODE_GE`, `:2689-2694`).
HLSLcc forwards the shadow result without additional masking.

`TranslateTextureSample(..., TEXSMP_FLAG_DEPTHCOMPARE)` dispatches at
`:3181-3190`; reference is `operands[4 + hasParamOffset]` (`:1143`).

- Non-gather, non-`TEXTURECUBEARRAY` calls embed reference in the last
  coordinate component (`:1264-1277`), e.g.
  `vec3 txVec<N> = vec3(<coord>, <refZ>);` then
  `texture(<sampler>, txVec<N>)`. The coordinate table owns
  `depthCmpCoordType` (`:1176,1191,1206,1217,1228,1235`).
  The Adreno nonstandard-swizzle workaround motivates this local
  (`:1269`); `m_NextTexCoordTemp` (`:1267`) keeps names unique per
  shader phase. It is a per-call temporary, not a shared function.
- Cube arrays pass reference separately (`:1349-1354`):
  `texture(samplerCubeArrayShadow, vec4(dir, arrayIdx), refZ)`.
  Gather's separate-reference rule is in §5.
- Depth comparison changes sampler **type** and argument shape, not the
  function name; `texture`/`textureLod`/`textureGrad` follows other flags.
  Declaration selection uses `ui32IsShadowTex`.

**Names:** under the introduction's **overrideable combined-sampler default**,
`TextureSamplerName(..., bZCompare=1)` (`:1335`) references the
combined shadow uniform (`toGLSLDeclaration.cpp:1634-1646`), not the
bare `ResourceName` shadow declaration (`:1668-1686`). The latter
remains declared for register identity; §0 owns duplication. A texture used
for ordinary and comparison sampling has four declarations under that default:
combined plain/shadow and bare plain/shadow (`:1632-1686`), with the two
combined symbols used by these sampling calls. Without combination, the
`ResourceName(..., bZCompare=1)` branch is `:1333`.

**Types:** result stays float rather than using `GetTextureDataType` or
`ui32ReturnType` for a numeric conversion; depth formats reflect float.
Reference uses `TO_AUTO_BITCAST_TO_FLOAT` (`:1275,1353`).
2D/2D-array/cube shadow `texture` overloads are the study's ES300 baseline.
Cube-array support is conditional: `HaveCubemapArray`
(`languages.h:75-80`) excludes ES300; declaration attempts
`GL_OES_texture_cube_map_array` and `GL_EXT_texture_cube_map_array`
(`toGLSLDeclaration.cpp:1608-1619`). Verify availability rather than assume it.

**Edge cases**: see `sample_l`'s 2D-array-shadow `textureLod`-unavailable workaround —
that workaround is keyed off `TEXSMP_FLAG_DEPTHCOMPARE` and fires for `sample_c` combined
with an explicit-LOD or LOD-zero flag on a `TEXTURE2DARRAY` resource; plain `sample_c`
(implicit LOD) does not need it because ordinary `texture(sampler2DArrayShadow, ...)`
(no explicit LOD) is legal GLSL.

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
- **Source bug — malformed offset literal for `TEXTURE2D`/`TEXTURE2DARRAY`**:
  `TEXTURE2DARRAY` (`:925-926`) and `TEXTURE2D` (`:940-941`) emit
  `bformata(glsl, ", ivec3(%d, %d)", psInst->iUAddrOffset, psInst->iVAddrOffset)`.
  Two components cannot construct an `ivec3`: `ivec3(3, 5)` fails GLSL
  compilation. The JS emitter must emit `ivec2` for these dimensions, as the
  filtered-sample offset builder does (`toGLSLInstruction.cpp:1398-1402`),
  rather than copy this upstream typo. Immediate-offset `ld`/`ld_ms` on
  `Texture2D`/`Texture2DArray` hits it; `Texture1D`/`Texture3D`/
  `Texture1DArray` is unaffected. `TEXTURE1D` (`:909-910`, plain `int`)
  and `TEXTURE3D` (`:923-924`, three-argument `ivec3(%d, %d, %d)`) are
  well-formed. This is the recorded vendor-source defect, not a lowering to copy.
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

Queries dimensions at a mip and total mip count. DXBC return control is
opcode bits11–12: 0=float, 1=reciprocal float, 2=uint
(`RESINFO_INSTRUCTION_RETURN_{FLOAT,RCPFLOAT,UINT}`;
`decisions/016...018-dxbc-instruction-controls...md`, subject to the
opening missing-evidence caveat).

Dispatch visits each destination-mask component, calling
`GetResInfoData(psInst, swizzledComponentIndex, destElem)`
(`toGLSLInstruction.cpp:4734-4752`, implementation `:1033-1129`).

| Post-swizzle component | Emission |
|---|---|
| index <3 | Dimension from `textureSize(tex[, int(mipOperand)])`, then selected component and return conversion. |
| Missing dimension | Literal `0`/`0.0`/`uint(0)` (`:1064-1067`); old ES3 Adrenos misread bare `0u` as const-int. |
| index >=3 | `dest.w = <int\|uint\|float>(textureQueryLevels(tex));` (`:1112-1127`). |

`GetNumTextureDimensions` (`HLSLccToolkit.cpp:437-458`):
1D→1; 2D/2DMS/1DArray/Cube→2; 3D/2DArray/2DMSArray/CubeArray→3.
Conversions (`:1070-1080`): UINT→`uvec<dim>` (`ivec` only
without unsigned support); RCPFLOAT→`vec<dim>(1.0)/vec<dim>(textureSize(...))`;
FLOAT→`vec<dim>(textureSize(...))`. MS and UAV omit the mip argument
(`:1089-1093`); UAV uses `imageSize` (`:1082-1085`), outside the
pure-`t#` path studied here. `AddOpAssignToDestWithMask` (`:1057`)
assigns one component with `1 << destElem`: `SVT_UINT` only for UINT,
otherwise `SVT_FLOAT`, including reciprocal results.

### Mip-count gap and global-gate correction

`HaveQueryLevels` (`languages.h:247-254`) requires `>=LANG_430`.
The instruction calls `textureQueryLevels` without a **local** gate, but
`AddVersionDependentCode` (`toGLSL.cpp:234-241`) tests
`!HaveQueryLevels` plus `OPCODE_RESINFO` and attempts
`GL_ARB_texture_query_levels` / `GL_ARB_shader_image_size`.
These guarded desktop pragmas are ineffective on ES/WebGL2, as in §5;
“no gate at all” was too broad.

Only total-mip-count access has this gap: `textureSize` dimensions need no
helper. With no ES300/WebGL2 equivalent for `textureQueryLevels`, the
study proposes `hlslcc_textureQueryLevels` backed by a per-texture
out-of-band mip-count uniform, **or explicit rejection when that component
is read**. It does not qualify today's implementation by the 247 opcode count.

**Edge cases**: `textureSize` with an out-of-range `lod` argument returns `0` per GLSL ES
3.00 spec (well-defined). Buffer/`BUFFEX` resources are excluded from the `dim==0` default
path implicitly by never appearing in the `resinfo`-legal dimension set.

**Confidence**: high on HLSLcc's literal output, including the global extension
attempt; the mip-count path remains a WebGL2 compile risk. Corroboration by
`TRANSPILING-GAPS.md:186,337` is withdrawn because that file is absent (see
the authority-order correction). Confidence rests on the C++ reading alone.

---

## 10. `deriv_rtx_coarse` (209) and `deriv_rty_coarse` (215)

### (plus `deriv_rtx`/`deriv_rtx_fine`/`deriv_rty`/`deriv_rty_fine`, same lowering)

Window-space X/Y derivatives. D3D's coarse (may share across a 2×2 quad), fine (per-pixel)
and plain (compiler-chosen) distinction collapses to two ES300 builtins:

`dest = dFdx(src)<destSwizzleSubset>;` — all three RTX forms.
`dest = dFdy(src)<destSwizzleSubset>;` — all three RTY forms.

Source: `toGLSLInstruction.cpp:4579-4602`, calling
`CallHelper1("dFdx"/"dFdy", psInst, 0, 1, 1)` (`:745-762`).
`AddAssignToDest(dest, SVT_FLOAT, dstSwizCount, ...)` uses the destination
swizzle count. `paramsShouldFollowWriteMask=1` also limits the source
read to the destination access mask, through `TO_AUTO_BITCAST_TO_FLOAT`.
Input/output are float; there is no integer derivative form.

No helper or ES100 `GL_OES_standard_derivatives` extension is needed:
`dFdx`/`dFdy` (and `fwidth`) are fragment-stage ES300 builtins.
The study notes a derivative-quality hint rather than distinct coarse/fine
functions; output loses that DXBC distinction, matching the cited HLSLcc path.

**Edge cases**: derivatives are **fragment-shader only** — DXBC guarantees `deriv_*` never
appears in a vertex shader (no rasterization quad exists there), so no stage guard is
needed beyond what DXBC itself enforces. Derivatives across non-uniform control flow
(diverging discard/branch within a 2x2 quad) are undefined-ish in both D3D and GLES —
HLSLcc adds no special handling; this is an inherent GPU behavior difference the
translator cannot paper over.

**Confidence**: high — trivial, fully read, single-line-per-opcode lowering, high corpus
count (209+215 combined for the `_coarse` variants alone).

---

## 11. `lod` (0 occurrences in corpus, spec required per task)

DXBC `LOD` returns `(ClampedLOD, NonClampedLOD, 0, 0)` without fetching
texels. `toGLSLInstruction.cpp:4161-4200` emits:

`dest = textureQueryLod(<tex>, <coord>)<returnSwizzle>;` for `LANG>=400`,
or extension spelling `textureQueryLOD` otherwise.

`HaveQueryLod` (`languages.h:238-245`) selects the function name
**inside instruction lowering**, unlike gather/resinfo's separate pragma
attempts. `AddVersionDependentCode` additionally tries the equally
ES300-ineffective `GL_ARB_texture_query_lod` extension
(`toGLSL.cpp:226-231`, gated by `!HaveQueryLod`).

**Bare-resource exception:** `TranslateOperand(&asOperands[2], TO_FLAG_NONE)`
(`:4185`) takes `OPERAND_TYPE_RESOURCE` through `ResourceName`
(`toGLSLOperand.cpp:1271-1275`), never `TextureSamplerName`.
Sampler operand `asOperands[3]` is unused. Even under the introduction's
combined-sampler default, `lod` therefore reads the bare `t#`/reflected
uniform (`toGLSLDeclaration.cpp:1659-1666`), not the paired sampling
symbol. Preserve this exception to §0; a bare sampler is declared, but it is
not the same uniform ordinary sampling calls use.

Coordinates share `TranslateTexCoord` (`:4187-4189`); result swizzling
is at `:4194-4197`. `AddAssignToDest(dest, SVT_FLOAT, 4, ...)`
(`:4171`) always declares a four-component float query result, independent
of texture return type.

For ES300, `HaveQueryLod` is false: the emitted extension-style name has
no unextended WebGL2 equivalent or browser core extension supplying it
(desktop `GL_ARB_texture_query_lod` / `GL_EXT_texture_query_lod` naming).
The study proposes `hlslcc_textureQueryLod` using a CPU/uniform-supplied
approximation, or explicit rejection. Zero observed uses makes this low priority,
not support evidence or permission to emit an un-linkable call.

**Edge cases**: none beyond standard coordinate range handling; no fetch occurs so no
wrap/border-color interaction applies.

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

The opcode sections own these historical proposals and their qualification gates:

- §5: `hlslcc_textureGather4Emulated`, or explicit gather-family rejection.
- §9: `hlslcc_textureQueryLevels` for mip-count access only, or rejection.
- §11: `hlslcc_textureQueryLod` approximation or rejection; zero corpus uses.
- §6: per-call `txVec<N>`, numbered by `m_NextTexCoordTemp`; no shared
  function. Gather forms never embed the reference in this temporary (§5).

This index replaces the old summary's conflicting “no gate at all” resinfo
claim and its inclusion of `gather4_po_c` in embedded-reference temporaries.
The corrected opcode descriptions govern; no fresh runtime support is implied.
Core sampling, derivative and bitcast builtins need no custom implementation.
