# EVE Carbon/Trinity Shader Constant-Buffer Layout Map

Status: Evolving
Scope: Carbon/Trinity constant-buffer layouts used by `@carbonenginejs/runtime/resource/formats/webgl`
Audience: Shader translators, runtime packers, and engine integrators
Summary: Maps Carbon constant-buffer registers and field layouts for WebGL integration.

> Produced 2026-07-05 from ../carbonengine source (authoritative) for the Carbon WebGL
> per-frame/per-object packer in ccpwgl. All register offsets are in float4
> (vec4) units. File references are relative to
> `../carbonengine/trinity/trinity/`.

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

Struct: `Eve/EveSpaceScene.h:300-327`. Filled: `EveSpaceScene.cpp:3011-3064`
(`PopulatePerFrameVSData`).

| Field | Type | vec4 off | count | Fed from (EveSpaceScene.cpp) |
|---|---|---|---|---|
| ViewInverseTransposeMat | Matrix | 0 | 4 | `GetInverseViewTransform()` (`:3020`) |
| ViewProjectionMat | Matrix | 4 | 4 | `Transpose(view*reversedProj)` (`:3017-3018`) |
| ViewMat | Matrix | 8 | 4 | `Transpose(GetViewTransform())` (`:3014`) |
| ProjectionMat | Matrix | 12 | 4 | `Transpose(GetReversedDepthProjectionTransform())` (`:3015-3016`) |
| ShadowViewMat | Matrix | 16 | 4 | (populated by shadow path) |
| ShadowViewProjectionMat | Matrix | 20 | 4 | (shadow path) |
| EnvMapRotationMat | Matrix | 24 | 4 | `Transpose(RotationMatrix(m_envMapRotation))` (`:3028`) |
| ViewProjectionLast | Matrix | 28 | 4 | `Transpose(m_viewLast * m_projectionLast*m_jitterMatrix)` (`:3022-3023`) |
| ViewLast | Matrix | 32 | 4 | `Transpose(m_viewLast)` (`:3024`) |
| ProjLast | Matrix | 36 | 4 | `Transpose(lastProjection)` (`:3025`) |
| Sun.DirWorld + unused_pad0 | Vector3+float | 40 | 1 | `-Normalize(m_sunData.DirWorld)` (`:3035`) |
| Sun.DiffuseColor | Color | 41 | 1 | `m_currentSunColor` (`:3032`) |
| FogFactors + pad | Vector3+float | 42 | 1 | `(fogEnd/d, 1/d, fogMax)` (`:3045-3050`) |
| TargetResolution + FovXY | Vector2+Vector2 | 43 | 1 | RT w/h (`:3038-3039`); FovXY from projection+aspect (`:3042-3043`) |
| ViewportAdjustment | Vector4 | 44 | 1 | device/logical viewport ratios (`:3055-3058`) |
| Time, Upscaling, ViewportSize | float,float,Vector2 | 45 | 1 | `GetAnimationTime()`, `m_upscalingAmount`, device viewport (`:3059-3063`) |

Total = **46 registers**. `SunData` struct: `EveSpaceScene.h:218-223`
(Vector3 DirWorld, float pad, Color DiffuseColor).

### 1b. `EveSpaceScene::PerFramePSData` -> b2

Struct: `EveSpaceScene.h:240-294`. Filled: `EveSpaceScene.cpp:3066-3198`
(`PopulatePerFramePSData`).

| Field | Type | vec4 off | count | Fed from |
|---|---|---|---|---|
| ViewInverseTransposeMat | Matrix | 0 | 4 | `GetInverseViewTransform()` (`:3076`) |
| ViewMat | Matrix | 4 | 4 | `Transpose(GetViewTransform())` (`:3074`) |
| EnvMapRotationMat | Matrix | 8 | 4 | `Transpose(RotationMatrix(m_envMapRotation))` (`:3079`) |
| Sun.DirWorld+pad | Vector3+float | 12 | 1 | `-Normalize(sun dir)` (`:3085`) |
| Sun.DiffuseColor | Color | 13 | 1 | `m_currentSunColor`, `.a=m_defaultDiffuseRoughness` (`:3082-3083`) |
| AmbientColor + ReflectionIntensity | Vector3+float | 14 | 1 | `m_ambientColor` (`:3086`), `m_currentReflectionIntensity` (`:3088`) |
| FogColor | Vector4 | 15 | 1 | `(m_fogColor.rgb, m_fogMax)` (`:3089`) |
| ViewportOffset + ViewportSize | Vector2+Vector2 | 16 | 1 | viewport x/y (`:3105-3106`), device viewport (`:3108-3109`) |
| TargetResolution + DepthMapSampleCount + Debug | Vector2+f+f | 17 | 1 | RT w/h (`:3095-3096`); DepthMapSampleCount=1 legacy (`:3134`); Debug=`m_perFrameDebug` (`:3190`) |
| ShadowMapSettings | Vector4 | 18 | 1 | `(1,1,0,0)` (`:3131`) |
| ShadowCameraRange + ShadowLightness + ShadowQuality | Vec2+f+uint | 19 | 1 | `(1,0)` default (`:3103`), lightness=0 (`:3133`), `1<<m_shadowQuality` (`:3117`) |
| ProjectionToView + FovXY | Vector2+Vector2 | 20 | 1 | proj `_43,_33` (`:3137-3138`); FovXY (`:3099-3100`) |
| Time, SceneMipLodBias, Upscaling, GammaBrightness | 4xfloat | 21 | 1 | `GetAnimationTime()` (`:3111`), mip bias (`:3140-3157`), upscaling (`:3112,3152`), `g_eveSpaceSceneGammaBrightness` (`:3092`) |
| FrameIndex, Jittering, InverseShadowMapAtlasSize, ShadowMapAtlasEntryMinSizeLog2 | uint,uint,f,uint | 22 | 1 | frame counter (`:3114`), jitter!=0 (`:3115`), light-manager atlas (`:3121-3124`) |
| VolumetricSlices[4] | float[4] | 23 | 1 | hard-coded 1e3..1e6 (`:3192-3195`) |
| ShadowMapValues[4] | Vector4[4] | 24 | 4 | `shadowMap->m_perSplitData` (`:3161-3164`) |
| ShadowMatrixVal[16] | Matrix[16] | 28 | 64 | per-split shadow matrices, atlas-tiled 8x2 (`:3171-3184`) |
| SplitInfo | Vector4 | 92 | 1 | `shadowMap->m_perSplitData.SplitInfo` (`:3185`) |
| ProjectionInverseMat | Matrix | 93 | 4 | `Inverse(Transpose(reversedProj))` (`:3189`) |
| CascadeRanges[16] | Vector4[16] | 97 | 16 | `shadowMap->m_perSplitData.CascadeRanges` (`:3166-3169`) |
| FroxelFogData | FroxelPerFrameData | 113 | 5 | `m_volumetricsRenderer->PopulatePerFrameData` (`:3197`) |

Total = **118 registers**. `SHADOW_FRUSTUM_COUNT = 16` (`Tr2ShadowMap.h:15`).
`FroxelPerFrameData` (`Tr2VolumetricsRenderer.h:119-135`): FogColor(vec3)+
BackgroundVisibility, BaseDensity/MaxDistance/MaxDistanceVisibility/
EnvironmentIntensity, EnvironmentG+3pad, planets[2] (2xSphere=2 vec4)
= 5 registers.

---

## 2. EVE-space per-object layouts (ships/stations) -> b3 / b4

Structs: `Eve/SpaceObject/EveSpaceObject2.h:99-141`. Copied verbatim into the
buffers by `EveSpaceObject2::UpdatePerObjectBuffer` (`EveSpaceObject2.cpp:1469-1483`,
plain `memcpy` of the struct). Bound to b3/b4 via
`Tr2PerObjectDataWithPersistentBuffers` (`Tr2PersistentPerObjectData.h`).
`EVE_SPACEOBJECT_CUSTOWMASK_MAX = 2` (`EveSpaceObject2.h:49`);
`PACKED_COEFFICIENT_COUNT = 7` (`Tr2ShLightingManager.h:51`).

### 2a. `EveSpaceObjectVSData` -> b3

| Field | Type | vec4 off | count | Fed from (EveSpaceObject2.cpp) |
|---|---|---|---|---|
| worldTransform | Matrix | 0 | 4 | `Transpose(m_worldTransform)` (`:637`) |
| worldTransformLast | Matrix | 4 | 4 | `Transpose(m_worldTransform)` prev frame (`:2675`) |
| invWorldTransform | Matrix | 8 | 4 | `Transpose(m_invWorldTransform)` (`:638`) |
| shipData | Vector4 | 12 | 1 | `m_spaceObjectShipData` = (boosterGain, activation, dirt, boundingRadius) (`:639`,`734-744`) |
| clipData | Vector4 | 13 | 1 | `(clipSphereCenter, clipRadiusSq)` (`:758`) |
| ellpsoidRadii | Vector4 | 14 | 1 | `GetShapeEllipsoid` radius (`:643`) |
| ellpsoidCenter | Vector4 | 15 | 1 | `GetShapeEllipsoid` center (`:644`) |
| customMaskMatrix[2] | Matrix[2] | 16 | 8 | `m_customMasks[i]->FillPerObjectData` (`:654-664`) |
| customMaskData[2] | Vector4[2] | 24 | 2 | custom-mask fill (`:654-664`) |
| boneOffsets[4] | uint32[4] | 26 | 1 | `[curFrameOffset, prevFrameOffset, boneCount, -]` (`:1440-1444`) |
| morphTargetVertexDataOffset / AnimationDataOffset / activeMorphTargetsCount / bakedMorphTargetVertexDataOffset | uint32x4 | 27 | 1 | morph-target path |
| customData | Vector4 | 28 | 1 | copied from PS customData (`:1445`) |

Total = **29 registers**.

**Joints are NOT in this buffer on DX11.** `boneOffsets` (reg 26) index a
separate `BoneTransforms` ring buffer/SSBO
(`m_boneOffsets.UploadTransforms(... Float4x3 ...)`, `EveSpaceObject2.cpp:1441`).
Bones are `Float4x3` (3 vec4 per joint). This is the structured-buffer path
that `docs/dxbc-lowering/memory-structured.md:131-213` rewrites for WebGL2.

### 2b. `EveSpaceObjectPSData` -> b4

| Field | Type | vec4 off | count | Fed from |
|---|---|---|---|---|
| worldTransform | Matrix | 0 | 4 | `m_vsData.worldTransform` (`:646`) |
| worldTransformLast | Matrix | 4 | 4 | (`:2676`) |
| invWorldTransform | Matrix | 8 | 4 | (`:647`) |
| shipData | Vector4 | 12 | 1 | `m_spaceObjectShipData` (`:636`) |
| clipSphereCenter + clipRadiusSq | Vector3+float | 13 | 1 | (`:755-756`) |
| clipRadius2Sq, impactDataOffset, clipSphereFactor2, clipSphereFactor | 4xfloat | 14 | 1 | (`:651,760-762`) |
| shLightingCoefficients[7] | Vector4[7] | 15 | 7 | `UpdateShLighting` / cleared `:1425` |
| customMaskMaterialIDs[2] | Vector4[2] | 22 | 2 | custom-mask fill |
| customMaskTargets[2] | Vector4[2] | 24 | 2 | custom-mask fill |
| customMaskClamps | Vector4 | 26 | 1 | custom-mask fill |
| screenSize | Vector4 | 27 | 1 | screen size |
| customData | Vector4 | 28 | 1 | |

Total = **29 registers**.

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

ccpwgl per-frame: `../ccpwgl/src/eve/EveSpaceScene.js:1906-1949`, filled
`:1659-1855`. ccpwgl per-object: `../ccpwgl/src/core/data/Tr2PerObjectData.js:52-105`.

### 4a. Per-frame VS drift (Carbon 1a vs ccpwgl vs, b1)

ccpwgl VS = ViewInverseTransposeMat, ViewProjectionMat, ViewMat, ProjectionMat,
ShadowViewMat, ShadowViewProjectionMat, EnvMapRotationMat, SunData.DirWorld,
SunData.DiffuseColor, FogFactors, TargetResolution, ViewportAdjustment,
MiscSettings = **34 regs**.

| Carbon field (off) | ccpwgl field (off) | Status |
|---|---|---|
| ViewInverseTransposeMat..EnvMapRotationMat (0-27) | same (0-27) | OK aligned |
| **ViewProjectionLast (28-31)** | - | MISSING in ccpwgl |
| **ViewLast (32-35)** | - | MISSING in ccpwgl |
| **ProjLast (36-39)** | - | MISSING in ccpwgl |
| Sun.DirWorld+pad (40) | SunData.DirWorld (28) | semantic match, **-12 reg shift** |
| Sun.DiffuseColor (41) | SunData.DiffuseColor (29) | (-12) |
| FogFactors+pad (42) | FogFactors (30) | (-12) |
| TargetResolution+FovXY (43) | TargetResolution (31) | Carbon packs FovXY in .zw; verify `d.targetResolution` carries fov |
| ViewportAdjustment (44) | ViewportAdjustment (32) | (-12) |
| Time,Upscaling,ViewportSize (45) | MiscSettings (33)=time,**unused**,vpW,vpH | `.y` differs: Carbon=Upscaling, ccpwgl=0 |

Net: ccpwgl VS omits the 3 motion-vector matrices (12 regs); every field from
Sun onward is shifted -12 registers. DX11 shaders reading `cb1[28+]` need the
Carbon-shaped buffer.

### 4b. Per-frame PS drift (Carbon 1b vs ccpwgl ps, b2)

ccpwgl PS = 13 entries ending at VolumetricSlices = **23 regs** vs Carbon's
**118**.

| Carbon field (off) | ccpwgl field (off) | Status |
|---|---|---|
| ViewInverseTransposeMat/ViewMat/EnvMapRotationMat (0-11) | same (0-11) | OK |
| Sun.DirWorld (12), Sun.DiffuseColor (13) | SunData.DirWorld (12), .DiffuseColor (13) | OK |
| AmbientColor+ReflectionIntensity (14) | AmbientColor+**NebulaIntensity** (14) | `.w` semantic differs |
| FogColor (15) | FogColor (15) | OK |
| ViewportOffset+ViewportSize (16) | ViewportOffset+ViewportSize (16) | OK |
| TargetResolution+DepthMapSampleCount+Debug (17) | TargetResolution vec4 (17) | `.z/.w` differ |
| ShadowMapSettings (18) | ShadowMapSettings (18) | OK |
| ShadowCameraRange+ShadowLightness+ShadowQuality (19) | ShadowCameraRange vec4 (19) | `.z/.w` differ |
| ProjectionToView+FovXY (20) | ProjectionToView+FovXY (20) | OK |
| Time,SceneMipLodBias,Upscaling,GammaBrightness (21) | MiscSettings=time,fogType,fogBlur,contrast (21) | only `.x` matches |
| **FrameIndex,Jittering,invAtlasSize,atlasMinLog2 (22)** | - | MISSING entirely |
| VolumetricSlices (23) | VolumetricSlices (22) | **-1 reg shift** |
| **ShadowMapValues[4] (24-27)** | - | MISSING |
| **ShadowMatrixVal[16] (28-91)** | - | MISSING (64 regs) |
| **SplitInfo (92)** | - | MISSING |
| **ProjectionInverseMat (93-96)** | - | MISSING |
| **CascadeRanges[16] (97-112)** | - | MISSING |
| **FroxelFogData (113-117)** | - | MISSING |

Net: aligned through reg ~20, diverges at 21, -1 shift from 23, and the whole
cascaded-shadow + froxel tail (95 regs) is absent in ccpwgl.

### 4c. Per-object VS drift (Carbon 2a vs ccpwgl vs, b3)

| Carbon field (off) | ccpwgl field (off) | Status |
|---|---|---|
| worldTransform..customMaskData[1] (0-25) | WorldMat..CustomMaskData1 (0-25) | OK aligned |
| **boneOffsets[4] (26)** | - (JointMat starts at 26) | CONFLICT |
| morph data (27) | (part of JointMat) | CONFLICT |
| customData (28) | (part of JointMat) | CONFLICT |
| - (joints in separate SSBO) | **JointMat cb3[26..199], 696 floats = 58 joints** | architecture drift |

In Carbon DX11, cb3[26]=boneOffsets, cb3[27]=morph, cb3[28]=customData, and
joints live in the separate `BoneTransforms` structured buffer (69 max,
Float4x3). ccpwgl WebGL2 splices 58 joints inline at cb3[26..199] instead.
The Carbon WebGL path keeps Carbon's shape: cb3 stays 29 regs, joints go to the
dedicated CjsSb UBO (capacity 69). Bone-count note: Carbon
TR2_MAX_BONES_PER_MESHAREA=69 vs ccpwgl inline 58 (likely a WebGL uniform
budget choice, not a Carbon constant).

### 4d. Per-object PS drift (Carbon 2b vs ccpwgl ps, b4)

| Carbon field (off) | ccpwgl field (off) | Status |
|---|---|---|
| **worldTransform (0-3)** | - | MISSING in ccpwgl |
| **worldTransformLast (4-7)** | - | MISSING in ccpwgl |
| **invWorldTransform (8-11)** | - | MISSING in ccpwgl |
| shipData (12) | Shipdata (0) | match, **-12 reg** |
| clipSphereCenter+clipRadiusSq (13) | Clipdata1 (1) | (-12) |
| clipRadius2Sq,impactDataOffset,clipSphereFactor2,clipSphereFactor (14) | Miscdata (2) | partial semantic overlap |
| shLightingCoefficients[7] (15-21) | ShLighting 4x7 (3-9) | same 7 vec4 (-12) |
| customMaskMaterialIDs[2] (22-23) | CustomMaskMaterialID0/1 (10-11) | (-12) |
| customMaskTargets[2] (24-25) | CustomMaskTarget0/1 (12-13) | (-12) |
| customMaskClamps (26) | CustomMaskBlending (14) | name differs, same slot |
| screenSize (27) | Screensize (15) | (-12) |
| customData (28) | - | MISSING in ccpwgl |

Net: Carbon's per-object PS leads with three matrices (12 regs) ccpwgl lacks —
every ccpwgl PS field is -12 registers vs the DX11 expectation. Largest
per-object drift; most likely to break translated pixel shaders if the
GLES-shaped buffer were reused.

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
