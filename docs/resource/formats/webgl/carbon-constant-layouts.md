# EVE Carbon/Trinity Shader Constant-Buffer Layout Map

Status: Evolving
Scope: Carbon/Trinity constant-buffer layouts used by `@carbonenginejs/runtime/resource/formats/webgl`
Audience: Shader translators, runtime packers, and engine integrators
Summary: Routes constant-buffer layout ownership and records family/register distinctions and legacy GLES compatibility limits.

Origin: a 2026-07-05 native-source comparison for the ccpwgl packer. The
[original field/filler tables](https://github.com/carbonenginejs/runtime/blob/ede6c17c372c6582fa2a70f72a508e589945537c/docs/resource/formats/webgl/carbon-constant-layouts.md) retain that dated evidence;
this page does not requalify today's CCPWGL implementation. Native file references
are relative to `trinity/trinity/`; offsets below are float4 (vec4) registers.
Runtime lookup offsets are floats, not registers.

Use the [canonical constant-data contract](../../../trinity/architecture.md#constant-data-ownership)
and [per-frame/per-object public entries](../../../trinity/reference/api.md#current-subpaths),
not a second backend layout. Source declarations own field order, widths and
encodings; this summary does not prove which family a shader consumes.

Scope note: Carbon has **two parallel constant-buffer families**. (a) a
*generic* Tr2 family in `Tr2ConstantBufferFormats.h`, used by generic Tr2
renderables; and (b) an *EVE-space* family (`EveSpaceScene::PerFrame*` +
`EveSpaceObjectVSData/PSData`) used by ships/stations. **ccpwgl's ships mirror
family (b)**, so that is the primary comparison target.

## 0. Register assignment (shared by all families)

From `Tr2Renderer.cpp:38-43`:

| Register | Purpose | Getter |
|---|---|---|
| `b1` | per-frame VS | `GetPerFrameVSStartRegister()` (`Tr2Renderer.cpp:1199`) |
| `b2` | per-frame PS | `GetPerFramePSStartRegister()` (`:1204`) |
| `b3` | per-object VS | `GetPerObjectVSStartRegister()` (`:1209`) |
| `b4` | per-object PS | `GetPerObjectPSStartRegister()` (`:1219`) |
| `b5` | per-object RT vertex-buffer data | `:1224` |
| `b6` | per-object VS GUI | `GetPerObjectVSGUIStartRegister()` (`:1214`) |

`b0` is left for effect/material ("custom cb0"); effect constants are handled
by the material path (`Tr2EffectDescription.cpp`), not these structs. EVE space
objects reach `b3/b4` through `Tr2Renderer::GetPerObjectStartRegister(shaderType)`
in `Tr2PersistentPerObjectData.h:122,139`.

---

## 1. EVE-space per-frame layouts (the ccpwgl-relevant path)

### 1a. `EveSpaceScene::PerFrameVSData` -> b1

**46 registers.** The `EveSpaceScenePerFrame.vs` declaration in
[CjsPerFrameLayouts](../../../../src/trinity/core/rawData/CjsPerFrameLayouts.js)
owns the fields and native citations. Ten matrices lead the block, including
the previous view/projection data; the remaining fields begin at register 40.

### 1b. `EveSpaceScene::PerFramePSData` -> b2

**118 registers**, owned by `EveSpaceScenePerFrame.ps` in the same catalog.
The shadow/froxel tail starts at register 24: four shadow values, sixteen
matrices, split info, inverse projection, sixteen cascade ranges, then five
froxel registers. Integer fields retain their declared encodings; matching
float-lane counts is not enough. Original producer assignments remain in the
dated tables linked above, not a second maintained field inventory.

---

## 2. EVE-space per-object layouts (ships/stations) -> b3 / b4

[CjsEveSpaceObjectLayout](../../../../src/trinity/core/rawData/layouts/CjsEveSpaceObjectLayout.js)
owns the persistent VS/PS pair, native citations, field defaults and encodings.
Carbon uploads these structs by copy and binds them through
`Tr2PerObjectDataWithPersistentBuffers`; do not substitute the generic family.

### 2a. `EveSpaceObjectVSData` -> b3

**29 registers.** `boneOffsets` occupies register 26, morph data 27 and
`customData` 28. **DX11 EVE joints are not inline:** those offsets index the
separate `BoneTransforms` ring/structured buffer. Each joint is `Float4x3`
(three vec4); native upload evidence is `EveSpaceObject2.cpp:1441`.
See the [historical WebGL2 `cb3` rewrite and its recorded August 2 `std140` UBO replacement](memory-structured.md#glsl-lowering--b-webgl2-cb3-joint-matrix-rewrite-contract-the-shipping-path).

### 2b. `EveSpaceObjectPSData` -> b4

**29 registers.** Three world-transform matrices lead the block; ship/clip
values, seven SH coefficient vectors, custom masks, screen size and custom data
follow. The catalog, not the legacy GLES PS field order, defines this layout.

### 2c. Other EVE per-object buffers

- **Turrets** `EveTurretSet.h:47-70`: `EveTurretSetVSData` = baseCutoffData,
  turretSetData, shipMatrix, prevShipMatrix, currentBoneOffset/prevBoneOffset/
  2x unused, then `turretTranslation[N]` + `turretRotation[N]` (per-turret).
  `EveTurretSetPSData` = shipData, clipData1, clipRadius2Sq+3unused,
  shLightingCoefficients[7]. Bound at b3/b4 (`EveTurretSet.cpp:3959,3961`).
- **Missile warhead** (ccpwgl `GLESPerObjectDataEveMissileWarhead`,
  `Tr2PerObjectData.js:317-337`) mirrors a smaller variant.

---

## 3. Generic Tr2 per-frame / per-object family (`Tr2ConstantBufferFormats.h`)

Used by non-EVE Tr2 renderables. Filled in `Tr2ConstantBufferFormats.cpp` +
bound at b1/b2/b3/b4. Included for completeness; **not** what ccpwgl ships
mirror.

- `Tr2PerFrameVSData` (`.h:53-63`): ViewInverseTransposeMat(0-3), sunDirWorld(4),
  sceneFogColor(5), ViewProjectionMat(6-9), ViewMat(10-13), ProjectionMat(14-17).
  Filled `Tr2ConstantBufferFormats.cpp:13-29`.
- `Tr2PerFramePSData` (`.h:73-92`): ViewInverseTransposeMat(0-3),
  sceneAmbientColor(4), sceneFogColor(5), sunDirWorld(6), sunDiffuseColor(7),
  sunSpecularColor(8), maxFogAmount/maxFogDistance/minFogDistance/cullDirection(9),
  ViewProjectionMat(10-13), shScale/shadowCount/invShadowSize/radius(14),
  viewPort(15), ViewProjInverse(16-19).
- `Tr2PerObjectVSData` (`.h:35-41`): WorldMat(0-3), boundingCylinderLocalHeight+
  boundingCylinderLocalXZCenter+boundingCylinderRotation(4).
- `Tr2PerObjectPSData` (`.h:43-51`): farFadeDistance/nearFadeDistance/padding(0),
  highlightColor(1), then `Tr2PerObjectPerPixelPointLightData pointLights[8]`
  (4 regs each, `.h:17-33`) = 32 regs. **<- generic path dynamic lights live in
  per-object PS constants, 8 point lights max.**
- Generic VS float buffer capacity is `40*4` floats, PS `80*4` floats
  (`Tr2PerObjectData.h:67,94`).

**Generic skinned path** (`Tr2PerObjectDataSkinned` / `Tr2PerAreaDataSkinned`,
`Tr2PerObjectData.cpp:75-193`): here joints ARE inlined into the b3 VS buffer.
Layout = `[jointMatrices | worldMat | (1 pad reg) | mirrorMatrix]`, total
`(TR2_MAX_BONES_PER_MESHAREA*3 + 5 + 4)*16` bytes. `TR2_MAX_BONES_PER_MESHAREA
= 69` (`Tr2PerObjectData.h:98`). Joints are 3 vec4 each (`Float4x3`), packed at
offset 0; worldMat at reg `69*3=207`, mirrorMatrix at reg `69*3+5=212`
(`Tr2PerObjectData.cpp:102-103,117-118`).

---

## 4. Drift vs ccpwgl GLES-v8 layouts

These are **recorded legacy comparisons**, not current CCPWGL defects or a
reason to rewrite valid GLES buffers. Use the correct family for each shader.
The [July comparison](https://github.com/carbonenginejs/runtime/blob/ede6c17c372c6582fa2a70f72a508e589945537c/docs/resource/formats/webgl/carbon-constant-layouts.md#4-drift-vs-ccpwgl-gles-v8-layouts)
retains exact old producer paths, field offsets and semantic mismatches.

### 4a. Per-frame VS drift (Carbon 1a vs ccpwgl vs, b1)

Legacy GLES used 34 registers versus EVE DX11's 46. Its missing three history
matrices shift fields from Sun onward by −12 registers. `MiscSettings.y`
was unused rather than Upscaling; TargetResolution's FovXY lanes remain a flag below.

### 4b. Per-frame PS drift (Carbon 1b vs ccpwgl ps, b2)

Legacy GLES used 23 registers versus 118. Some aligned lanes have different
semantics (NebulaIntensity/ReflectionIntensity and the target, shadow and misc
settings). The frame-index register is absent, shifting VolumetricSlices by −1;
the 94-register shadow/froxel tail is absent (95 fewer registers overall).
Equal positions do not prove equal values.

### 4c. Per-object VS drift (Carbon 2a vs ccpwgl vs, b3)

Legacy `JointMat` at registers 26–199 (696 floats, 58 joints) conflicts with
DX11's bone-offset/morph/custom slots. The recorded Carbon WebGL replacement
keeps the 29-register EVE block and uses a separate CjsSb UBO (capacity 69);
the memory-structured link above owns that distinction. The origin of 58 versus
69 is unresolved, not an inferred native limit.

### 4d. Per-object PS drift (Carbon 2b vs ccpwgl ps, b4)

Legacy GLES lacks the three leading matrices, shifting its fields by −12
registers, and omits customData. Miscdata and mask-field semantic equivalence
was incomplete. Reusing that buffer for DX11 pixel shaders is not valid merely
because the later field names resemble each other.

---

## 5. Ambiguities / flags (not guessed — verify before relying on)

1. **Which per-frame family do specific shipped DX11 shaders bind?** EVE ships
   use `EveSpaceScene::PerFrame*` (b1/b2), but the generic `Tr2PerFrame*`
   family, `Tr2InteriorScene` per-frame (`Tr2InteriorScene.cpp:644-645`) and
   shadow-only `Tr2PerFrameShadowPSData` (`Tr2ConstantBufferFormats.h:10-15`)
   also exist. Confirm per shader family before packing.
2. **`d.targetResolution` contents:** ccpwgl relies on `device.targetResolution`
   carrying FovXY in `.zw` (used at `EveSpaceScene.js:1683`). Not verified in
   `Tw2Device.js`.
3. **`Tr2PerFrameVSDataDebug`** (`Tr2ConstantBufferFormats.h:66-70`, used
   `EveSpaceScene.cpp:856`) is a smaller 8-register b1 variant for debug/shadow
   passes (ViewInverseTransposeMat + ViewProjectionMat only).
4. **Bone count 69 vs 58**: source of ccpwgl's 58 not found in Carbon; flag for
   reconciliation.
5. **Miscdata/customMaskClamps/CustomMaskBlending semantics** only positionally
   matched; exact float meanings not fully cross-verified.
6. Effect/material "custom cb0" buffers are per-effect and out of scope of the
   fixed ABI above.

Primary authoritative files: `Tr2ConstantBufferFormats.h/.cpp`,
`Tr2PerObjectData.h/.cpp`, `Tr2PersistentPerObjectData.h`,
`Eve/EveSpaceScene.h/.cpp`, `Eve/SpaceObject/EveSpaceObject2.h/.cpp`,
`Tr2Renderer.cpp`, `Tr2ShadowMap.h`, `Tr2VolumetricsRenderer.h`.
