// Source: trinity/trinity/Eve/EveSpaceScene.h
// Source: trinity/trinity/Eve/EveSpaceScene.cpp
//
// Hand-maintained (promoted from src/trinity/generated/eve/scene; the generator skips it
// while this file exists). Fields mirror the generated schema shell; the
// additions are the per-frame update driver ported from Carbon
// EveSpaceScene::Update and the scene-owned EveUpdateContext member (Carbon
// m_updateContext - protected, so absent from the Blue schema scan).
import { CjsSchema, meta, type, blue } from "#schema";
import { IsMatch, BlueList, IInitialize, INotify, IListNotify, CjsResource } from "#blue";
import { ITr2Scene } from "../../core/ITr2Scene.js";
import { ITr2Updateable } from "../../core/ITr2Updateable.js";
import { EvePlanet } from "../spaceObject/planet/EvePlanet.js";
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { EveEntity } from "../EveEntity.js";
import { BLUELISTEVENT } from "#consts/blue";
import { EveComponentRegistry } from "./components/EveComponentRegistry.js";
import { EveInstancedMeshManager } from "../instancedMeshManager/EveInstancedMeshManager.js";
import { Tr2PostProcess2 } from "../../postProcess/Tr2PostProcess2.js";
import { Tr2PostProcessAttributes } from "../../postProcess/Tr2PostProcessAttributes.js";
import { Tr2ShaderBuffer } from "../../shader/Tr2ShaderBuffer.js";
import { Tr2DataTextureManager } from "../../shader/Tr2DataTextureManager.js";
import { EveComponentType, ReflectionSetting, EntityComponents } from "../EntityComponents.js";
import { TriSettingsRegistrar } from "../../core/TriSettingsRegistrar.js";
import { EveUpdateContext } from "../EveUpdateContext.js";
import { EveEffectRoot2 } from "../spaceObject/EveEffectRoot2.js";
import { EveCamera } from "../camera/EveCamera.js";
import { CjsPerFrameLayouts } from "../../core/rawData/CjsPerFrameLayouts.js";
import { CullMode, PixelFormat, RenderState, ShaderType, Tr2GpuUsage, Tr2LoadAction, Tr2StoreAction } from "#consts/render-context";
import { Tr2ColorAttachment, Tr2ConstantBufferAL, Tr2DepthAttachment, Tr2SubresourceData } from "#trinityal";
import { RenderingMode, TriBatchType, TriStorageFlags } from "#consts/graphics";
import { Tr2DeviceResource } from "../../core/device/Tr2DeviceResource.js";
import { TriDevice } from "../../core/device/TriDevice.js";
import { DefaultKeyGenerator, EffectKeyGenerator, TriRenderBatchAccumulator } from "../../core/batch/TriRenderBatch/index.js";
import { Tr2RenderUtils } from "../../core/Tr2RenderUtils.js";
import { PER_FRAME_PS, PER_FRAME_VS, Tr2Renderer } from "../../core/Tr2Renderer.js";
import * as CcpLog from "../../../global/logging/ccpLog.js";
import { BackgroundRenderingReason } from "../../generated/eve/enums.js";
import { Tr2RenderContext, Tr2RenderContext_GetMainThreadRenderContext } from "../../core/context/Tr2RenderContext.js";
import { Tr2OcclusionBuffer } from "../effect/lensflare/Tr2OcclusionBuffer.js";
import { Tr2VariableStore } from "../../core/variable/Tr2VariableStore.js";
import { TriVariableContentType } from "../../generated/trinityCore/enums.js";
import { Tr2TextureReference } from "../../core/Tr2TextureReference.js";
import { Tr2RingBuffer } from "../../core/device/Tr2RingBuffer/Tr2RingBuffer.js";
import { ResourceRequirement } from "#resource";
import { RawData } from "../../core/rawData/RawData.js";
import { Tr2ShadowMap } from "../../core/Tr2ShadowMap.js";
import { Tr2QuadRenderer } from "../../core/Tr2QuadRenderer/index.js";
import { IEveSpaceObject2 } from "../IEveSpaceObject2.js";
import { ITr2SecondaryLightSource } from "../../core/lighting/ITr2SecondaryLightSource.js";
import { ITr2ShLightingReceiver } from "../../core/lighting/ITr2ShLightingReceiver.js";
import { Tr2VolumetricsRenderer } from "../../core/volumetrics/Tr2VolumetricsRenderer.js";
import { convertProjectionCoordToWorldPickRay, screenToProjection } from "../../core/view/pickRay.js";
import { EveVisualizeMethod, VisualizerType } from "../../generated/eve/enums.js";
import { ShadowQuality, Tr2RenderReason } from "../../generated/trinityCore/enums.js";
import { TriFrustum } from "../../core/view/TriFrustum.js";
import { TriShadowFrustum } from "./shadows/TriShadowFrustum.js";
import { TriShadowOrthoFrustum } from "./shadows/TriShadowOrthoFrustum.js";
import { Tr2LightManager } from "../../core/lighting/Tr2LightManager.js";
import { GpuResourceHandle } from "../../core/Tr2GpuResourcePool/GpuResourceHandle.js";
import { be } from "#blue";
import { ExecuteMainThreadActions } from "../../core/continueOnMainThread.js";
import { ITr2Pickable } from "../../core/ITr2Pickable.js";
import { EvePickingContext, EvePendingPickingReadback } from "./picking/index.js";
import { Tr2TextureAL, Tr2BitmapDimensions, Tr2TextureSubresource, Failed, ALResult } from "#trinityal";
import { Tr2CpuUsage } from "#consts/render-context";
import { Tr2PickType, TR2_PICK_TYPE_DEFAULT } from "#consts/graphics/tr2PickType";
import "./EveSpaceSceneRenderDriver.js";
import { EveSpaceScenePerThreadAccumulator } from "./EveSpaceScenePerThreadAccumulator.js";
import { Tr2Effect } from "../../shader/Tr2Effect.js";


/** VISUALIZER_EFFECT_PATH (EveSpaceScene.cpp:124-132), indexed by EveVisualizeMethod. */
const VISUALIZER_EFFECT_PATH = [
  "",
  "res:/Graphics/Effect/Managed/Space/Visualizer/Texcoord0.fx",
  "res:/Graphics/Effect/Managed/Space/Visualizer/Texcoord1.fx",
  "res:/Graphics/Effect/Managed/Space/Visualizer/White.fx",
  "res:/Graphics/Effect/Managed/Space/Visualizer/Overdraw.fx",
  "res:/Graphics/Effect/Managed/Space/Visualizer/Wireframe.fx",
  "res:/Graphics/Effect/Managed/Space/Visualizer/LightCount.fx"
];


/** The overlay's full-viewport texture coordinates (cpp:2885). */
const OVERLAY_TL = [ 0, 0 ];
const OVERLAY_BR = [ 1, 1 ];

// Module scratch for the per-frame sun-direction read (assume-dirty).
const sunDirectionScratch = vec3.create();

// Module scratch for the per-frame constant fills. Two are needed because the
// composed result and one operand are live at the same time; neither survives
// the call that wrote it.
const perFrameMatrixScratch = mat4.create();
const perFrameLastProjectionScratch = mat4.create();

const ZERO_JITTER = vec4.create();

/** Jitter's TAA sampling pattern, in pixels (EveSpaceScene.cpp:1269-1272). */
const JITTER_SAMPLING_PATTERNS = Object.freeze([
  Object.freeze([ 0.125, -0.375 ]),
  Object.freeze([ -0.125, 0.375 ]),
  Object.freeze([ 0.375, 0.125 ]),
  Object.freeze([ -0.375, -0.125 ])
]);

// EveSpaceScene.cpp:3196-3199 - the four froxel-fog slice distances, constant
// every frame.
const VOLUMETRIC_SLICES = Object.freeze([1000, 10000, 100000, 1000000]);

// Flip y and change the range from (-1, +1) to (0, 1): Carbon's
// `ScalingMatrix(0.5, -0.5, 1) * TranslationMatrix(0.5, 0.5, 0)`
// (EveSpaceScene.cpp:3179), pre-built because it never changes.
const SHADOW_CLIP_TO_UV = mat4.fromValues(
  0.5, 0, 0, 0,
  0, -0.5, 0, 0,
  0, 0, 1, 0,
  0.5, 0.5, 0, 1
);

// The scene-root parent transform for the visibility pass (Carbon
// EveSpaceScene.cpp:1441 `const Matrix& identity = IdentityMatrix()`). Module
// const, NEVER mutated - objects in m_objects are scene roots.
const IDENTITY = mat4.create();

/** Carbon's TRI_2PI (TriMath.h:245), the float literal 6.283185307f. */
const TRI_2PI = Math.fround(6.283185307);

/** RenderShadowMapForLight's six cube-face directions (EveSpaceScene.cpp:2581-2583). Never mutated. */
const POINT_LIGHT_DIRECTIONS = [
  vec3.fromValues(1, 0, 0), vec3.fromValues(0, 1, 0), vec3.fromValues(0, 0, 1),
  vec3.fromValues(-1, 0, 0), vec3.fromValues(0, -1, 0), vec3.fromValues(0, 0, -1)
];

/** GetLightMatrices' two up vectors (EveSpaceScene.cpp:4191). Never mutated. */
const LIGHT_UP_Y = vec3.fromValues(0, 1, 0);
const LIGHT_UP_X = vec3.fromValues(1, 0, 0);

// GetLightMatrices' look-at target, live only inside the call.
const lightMatricesAtScratch = vec3.create();

// Module scratch for the cloud and light shadow passes. RenderShadowMapForLight's
// light camera stays live across its RenderShadowMapForSpotLight calls, so
// each pass has fields of its own.
const shadowPassScratch = {
  cloudProjection: mat4.create(),
  cloudInverseProjection: mat4.create(),
  cloudInvViewProj: mat4.create(),
  cloudViewProj: mat4.create(),
  spotMarginScale: vec3.create(),
  spotMarginMatrix: mat4.create(),
  spotViewProj: mat4.create(),
  lightProjection: mat4.create(),
  lightView: mat4.create(),
  lightUp: vec3.create(),
  lightAt: vec3.create(),
  lightMatrices: { projection: mat4.create(), view: mat4.create() },
  lightCell: { shadowMapScale: 0, shadowMapOffsetX: 0, shadowMapOffsetY: 0 }
};

/** Carbon's default-constructed EveSpaceScene::ShadowResources: every texture empty. */
function EmptyShadowResources()
{
  return {
    shadowMap: new GpuResourceHandle(),
    cascadedShadowDepth: new GpuResourceHandle(),
    pointLightShadowMap: new GpuResourceHandle(),
    pointLightShadowDepth: new GpuResourceHandle()
  };
}

// ---------------------------------------------------------------------------
// DRIVER-ORDER CONTRACT (per frame) - the CPU visibility/gather drive.
// Carbon runs steps 5-12 inside EveSpaceScene::BeginRender/GatherBatches
// (EveSpaceScene.cpp:1295-1427/1433-1525); CarbonEngineJS splits them into
// scene-owned methods that an engine driver calls in this exact order:
//
//  1. Host stamps `updateContext.renderContext` (view -> derived inverse-view
//     + viewPos) and `updateContext.device`.
//  2. Driver derives the frustum:
//     `frustum.DeriveFrustum(view, viewPos, projection, viewport)` from that
//     same renderContext state (Carbon cpp:476).
//  3. `scene.StampFrameContext({ frustum, thresholds..., lodFactor,
//     raytracingEnabled })`.
//  4. `scene.Update(realTime, simTime)` - internally ends with
//     `UpdatePostProcessAttributes()` then the sun-direction read (Carbon
//     cpp:584 -> 589).
//  5. `scene.BlendLightingOverrides()` - BeginRender phase, before any gather
//     (Carbon cpp:1333, before GatherBatches cpp:1387).
//  6. `scene.UpdateFogSettings()` - portable Trinity state production over
//     "FroxelFogSettings" (cpp:1365-1370). An engine realizes the later render
//     intent; it does not own this blend/update method.
//  7. `scene.UpdateVisibility(updateContext.renderContext
//     .GetInverseViewTransform())` - the cpp:1443-1467 block.
//  8. `const renderables = scene.GetRenderables([])` - pre-culled
//     (cpp:1470-1507 minus impostors).
//  9. `batchManager.Collect(renderables, reason, updateContext.renderContext)`
//     - with engine-registered collectors covering Carbon's [QUADS]
//     (cpp:1509-1511) and [INSTANCED] (cpp:1516-1520; the instanced collector
//     reads "InstancedMeshProvider" from `scene.componentRegistry`);
//     `Finalize` inside Collect = Carbon FinalizeBatches cpp:1522.
// 10. `scene.GatherLights(lightManager)` - AFTER step 9 (Carbon cpp:1396-1416
//     runs after GatherBatches cpp:1387).
// 10b. `scene.UpdateShLighting(objects)` - the LAST thing Carbon's gather does
//     (cpp:1524), so every receiver's secondary-lighting coefficients are
//     current for the frame being submitted. Skipped entirely when the scene
//     carries no shLightingManager.
// 10c. `scene.PopulatePerFramePSData__ShadowMap(data, shadowMap, renderContext)` then
//     `scene.PopulatePerFrameVSData(data, renderContext)` - Carbon's order at
//     cpp:1424-1425, PS first, because the pixel fill is what resolves
//     m_upscalingAmount that the vertex fill then reads. Runs after GatherLights
//     so the blended sun colour is current. The engine binds the two records at
//     Tr2Renderer::GetPerFrame{VS,PS}StartRegister; their layouts are published
//     on the `/perframe` subpath.
// 11. (scene) `for (const lf of scene.lensflares)
//     lf.PrepareRender(frustum)` in BeginRender (cpp:1428-1431).
// 12. (engine) reads registry collections directly: "ShadowCaster" (cascade
//     gate cpp:614-621, RT push cpp:1544-1547), "VolumetricRenderable",
//     "FroxelFogSettings", "MeshMorph" (engine may call
//     `scene.componentRegistry.Clear("MeshMorph")` after bake),
//     "ReflectionRenderable" (secondary gather cpp:1886-1895).
//
// Registration triggers: adding or removing through the notified list helpers
// (`objects.Append` / `objects.Remove`) raises
// OnListModified, which registers or unregisters that one object as Carbon's
// BlueList does. After a plain-array graph build or mutation, call
// `scene.ReregisterEntities()` - covers objects + backgroundObjects + planets
// (entity-guarded) + cameraAttachmentParent (cpp:4064-4089, matching what
// OnListModified registers incrementally, cpp:3435-3491). uiObjects are
// intentionally excluded everywhere (cpp:3462 gate) - Carbon never registers
// or culls them.
// ---------------------------------------------------------------------------

/** Owns and updates an Eve space scene's entities, component registry, lighting, fog, post-process state, culling, and per-frame shader data. */
@blue.define("EveSpaceScene")
@blue.inherit(ITr2Scene, IInitialize, INotify, IListNotify, Tr2DeviceResource)
@blue.interface(ITr2Scene, ITr2Updateable, IInitialize, INotify)
export class EveSpaceScene
{

  /** m_visualizeMethod (EveVisualizeMethod - enum EveVisualizeMethod) [READWRITE, ENUM] */
  @blue.readwrite
  @type.int32
  @type.enum("trinity.EveSpaceScene.EveVisualizeMethod")
  visualizeMethod = 0;

  /**
   * m_visualizerEffects[VM_COUNT] (EveSpaceScene.h:571-589): one
   * { effect, type } record per EveVisualizeMethod. VisualizerEffect's
   * constructor sets PIXEL_SHADER_REPLACEMENT and no effect (h:580-584); the
   * scene's constructor makes LIGHT_COUNT an overlay (cpp:285), and each effect
   * is created the first time its method renders (cpp:1315-1322).
   */
  _visualizerEffects = Array.from({ length: EveVisualizeMethod.VM_COUNT }, () => ({
    effect: null,
    type: VisualizerType.PIXEL_SHADER_REPLACEMENT
  }));

  /** m_envMap1ResPath (std::string) [READWRITE, PERSIST, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.path("TriTextureRes")
  envMap1ResPath = "";

  /** m_envMap2ResPath (std::string) [READWRITE, PERSIST, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.path("TriTextureRes")
  envMap2ResPath = "";

  /** m_envMap3ResPath (std::string) [READWRITE, PERSIST, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.path("TriTextureRes")
  envMap3ResPath = "";

  /** m_lowQualityNebulaResPath (std::string) [READWRITE, PERSIST, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.path("TriTextureRes")
  lowQualityNebulaResPath = "";

  /** m_lowQualityNebulaMixResPath (std::string) [READWRITE, PERSIST, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.path("TriTextureRes")
  lowQualityNebulaMixResPath = "";

  /** m_envMapResPath (std::string) [READWRITE, PERSIST, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.path("TriTextureRes")
  envMapResPath = "";

  /** m_fogColor (Color) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.color
  fogColor = vec4.fromValues(0.25, 0.25, 0.25, 1);

  /** m_sunData.DirWorld (Vector3) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.vec3
  sunDirection = vec3.fromValues(0, -1, 0);

  /** m_ambientColor (Color) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.color
  ambientColor = vec4.fromValues(0.25, 0.25, 0.25, 1);

  /**
   * m_shLightingManager (Tr2ShLightingManagerPtr, h:625), persisted under its
   * exposed name by MAP_ATTRIBUTE "shLightingManager" PERSISTONLY
   * (EveSpaceScene_Blue.cpp:175-179). Readers write it directly, bypassing
   * the setter; Initialize replays it through SetShLightingManager
   * (cpp:3252-3257).
   */
  @blue.attribute("shLightingManager")
  @blue.persistOnly
  @type.rootRef("Tr2ShLightingManager")
  _shLightingManager = null;

  /**
   * Carbon MAP_PROPERTY "shLightingManager" over
   * GetShLightingManager/SetShLightingManager (EveSpaceScene_Blue.cpp:169-173):
   * the setter moves the planets' and objects' secondary light sources to the
   * new manager.
   */
  @blue.property()
  @type.rootRef("Tr2ShLightingManager")
  @meta.implemented
  get shLightingManager()
  {
    return this.GetShLightingManager();
  }

  /** Re-registers the scene's secondary light sources with the replacement manager. */
  @meta.implemented
  set shLightingManager(value)
  {
    this.SetShLightingManager(value);
  }

  /** m_combinedPostProcessAttributes (Tr2PostProcessAttributesPtr) [READ] -
   * default-constructed like Carbon's ctor CreateInstance (cpp:297); refreshed
   * by UpdatePostProcessAttributes' re-export at MEDIUM_PRIORITY (cpp:407). */
  @blue.read
  @type.rootRef("Tr2PostProcessAttributes")
  combinedPostProcessAttributes = new Tr2PostProcessAttributes();

  /** m_dataTextureMgr (Tr2DataTextureManagerPtr) [READ] */
  @blue.read
  @type.rootRef("Tr2DataTextureManager")
  dataTextureMgr = new Tr2DataTextureManager();

  /** m_dynamicObjectReflectionEnabled (bool) [READWRITE] */
  @blue.readwrite
  @type.boolean
  dynamicObjectReflectionEnabled = true;

  /** m_componentRegistry (EveComponentRegistryPtr) [READ] */
  @blue.read
  @type.rootRef("EveComponentRegistry")
  componentRegistry = new EveComponentRegistry();

  /** m_cameraAttachmentParent (EveEffectRoot2Ptr) - protected Carbon scene
   * entity, default-constructed like Carbon's ctor CreateInstance (cpp:287, no
   * further setup applied). Consumers still optional-chain - deserialization
   * may null it. */
  @type.rootRef("EveEffectRoot2")
  cameraAttachmentParent = new EveEffectRoot2();

  /**
   * Carbon MAP_PROPERTY_READONLY "cameraAttachments" over GetCameraAttachments
   * (EveSpaceScene_Blue.cpp:164-167): the effect children of the camera
   * attachment parent.
   */
  @blue.property()
  @type.list("IEveSpaceObjectChild")
  @meta.implemented
  get cameraAttachments()
  {
    return this._GetCameraAttachments();
  }

  /** m_postProcessDebug (BluePy) - protected Carbon debug payload. */
  @type.rawStruct("BluePy")
  postProcessDebug = null;

  /** m_curveSets (PTriCurveSetVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("TriCurveSet")
  curveSets = [];

  /** m_defaultDiffuseRoughness (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  defaultDiffuseRoughness = 1;

  /** m_fogStart (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  fogStart = 0;

  /** m_fogEnd (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  fogEnd = 0;

  /** m_reflectionIntensity (float) [READWRITE, PERSIST, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.float32
  reflectionIntensity = 1;

  /** m_distanceFields (PEveDistanceFieldVector) [READ] */
  @blue.read
  @type.list("EveDistanceField")
  distanceFields = [];

  /** m_backgroundEffect (Tr2EffectPtr) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.rootRef("Tr2Effect")
  backgroundEffect = null;

  /** m_backgroundReflectionIntensity (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  backgroundReflectionIntensity = 1;

  /** m_nebulaIntensity (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  nebulaIntensity = 1;

  /** m_display (bool) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.boolean
  display = true;

  /** m_backgroundRenderingEnabled (bool) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.boolean
  backgroundRenderingEnabled = false;

  /** m_update (bool) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.boolean
  update = true;

  /** m_impostorManager (Tr2ImpostorManagerPtr) [READWRITE] */
  @blue.readwrite
  @type.rootRef("Tr2ImpostorManager")
  impostorManager = null;

  /** m_lensflares (PEveLensflareVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("EveLensflare")
  lensflares = [];

  /** m_externalParameters (PTr2ExternalParameterVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("Tr2ExternalParameter")
  externalParameters = [];

  /** m_fogMax (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  fogMax = 0;

  /** m_staticParticles (PEveSceneStaticParticlesVector) [READ] */
  @blue.read
  @type.list("EveSceneStaticParticles")
  staticParticles = [];

  /** m_debugRenderer (Tr2DebugRendererPtr) [READWRITE] */
  @blue.readwrite
  @type.rootRef("Tr2DebugRenderer")
  debugRenderer = null;

  /**
   * m_instancedMeshManager (std::unique_ptr<EveInstancedMeshManager>,
   * EveSpaceScene.h:708, public), created with the scene (cpp:301). Its
   * CollectMeshes runs in GatherBatches (cpp:1525); the JS gather is split
   * between this class and EveSpaceSceneRenderDriver, which calls it after
   * collecting the renderables' batches. Its draw
   * side (GetBatches, GetShadowBatches, GetPickingBatches, GetPickedObject,
   * ReportUsedScreenSizes) is not ported.
   */
  @type.rawStruct("EveInstancedMeshManager")
  instancedMeshManager = new EveInstancedMeshManager();

  /** m_objects (PIEveSpaceObject2Vector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("IEveSpaceObject2")
  objects = new BlueList(IEveSpaceObject2);

  /** m_uiObjects (PIEveSpaceObject2Vector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("IEveSpaceObject2")
  uiObjects = new BlueList(IEveSpaceObject2);

  /** m_backgroundObjects (PIEveSpaceObject2Vector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("IEveSpaceObject2")
  backgroundObjects = new BlueList(IEveSpaceObject2);

  /** m_planets (PEvePlanetVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("EvePlanet")
  planets = new BlueList(EvePlanet, { className: "EvePlanet" });

  /** m_rtManager (Tr2RaytracingManagerPtr) [READWRITE] */
  @blue.readwrite
  @type.rootRef("Tr2RaytracingManager")
  raytracingManager = null;

  /** m_reflectionBackLightingColor (Color) [READWRITE, PERSIST, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.color
  reflectionBackLightingColor = vec4.fromValues(2, 2, 2, 2);

  /** m_reflectionBackLightingContrast (float) [READWRITE, PERSIST, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.float32
  reflectionBackLightingContrast = 8;

  /** m_reflectionProbe (Tr2ReflectionProbePtr) [READWRITE, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @type.rootRef("Tr2ReflectionProbe")
  reflectionProbe = null;

  /** m_volumetricsRenderer (Tr2VolumetricsRendererPtr) [READ] */
  @blue.read
  @type.rootRef("Tr2VolumetricsRenderer")
  volumetricsRenderer = new Tr2VolumetricsRenderer();

  /** m_starfield (EveStarfieldPtr) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.rootRef("EveStarfield")
  starfield = null;

  /** m_planetScale (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  planetScale = EvePlanet.scale;

  /** m_planetCameraScale (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  planetCameraScale = EvePlanet.scale;

  /** m_sssss (Tr2SSSSSPtr) [READ] */
  @blue.read
  @type.rootRef("Tr2SSSSS")
  subSurfaceScattering = null;

  /** m_shadowQuality (ShadowQuality - enum ShadowQuality) [READWRITE, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @type.int32
  @type.enum("trinity.ShadowQuality")
  shadowQualitySetting = 3;

  /** m_sunColor (Color) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.color
  sunDiffuseColor = vec4.fromValues(1, 1, 1, 1);

  /** m_sunColorWithDynamicLights (Color) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.color
  sunDiffuseColorWithDynamicLights = vec4.fromValues(1, 1, 1, 1);

  /** m_envMapRotation (Quaternion) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.quat
  envMapRotation = quat.create();

  /** m_ballpark (IEveBallparkPtr) [READWRITE] */
  @blue.readwrite
  @type.rootRef("IEveBallpark")
  ballpark = null;

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  name = "";

  /** m_sunBall (ITriVectorFunctionPtr) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.rootRef("ITriVectorFunction")
  sunBall = null;

  /** m_sceneDefaultPostProcess (Tr2PostProcess2Ptr) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.rootRef("Tr2PostProcess2")
  postprocess = null;

  /** m_virtualCameraSystem (EveVirtualCameraSystemPtr) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.rootRef("EveVirtualCameraSystem")
  virtualCameraSystem = null;

  /** m_warpTunnel (IEveSpaceObject2Ptr) [READWRITE] */
  @blue.readwrite
  @type.rootRef("IEveSpaceObject2")
  warpTunnel = null;

  /** m_perFrameDebug (float) [READWRITE] */
  @blue.readwrite
  @type.float32
  perFrameDebug = 0;

  /** m_cascadedShadowMap (Tr2ShadowMapPtr) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.rootRef("Tr2ShadowMap")
  cascadedShadowMap = null;

  /** m_reflectionShadowMap (h:406): reflections' own cascaded map, made by EnableShadowsInReflections. */
  _reflectionShadowMap = null;

  /**
   * Carbon MAP_PROPERTY "shadowsInReflections" over
   * IsShadowsInReflectionsEnabled/EnableShadowsInReflections
   * (EveSpaceScene_Blue.cpp:532-537): whether reflections own a cascaded
   * shadow map (used only while shadows are enabled).
   */
  @blue.property()
  @type.boolean
  @meta.implemented
  get shadowsInReflections()
  {
    return this.IsShadowsInReflectionsEnabled();
  }

  /** Creates or drops the reflection shadow map. */
  @meta.implemented
  set shadowsInReflections(value)
  {
    this.EnableShadowsInReflections(value);
  }

  /**
   * Carbon MAP_PROPERTY_READONLY "quadRenderer" over GetQuadRenderer
   * (EveSpaceScene_Blue.cpp:448-451): the shared quad renderer that batches
   * space object attachments.
   */
  @blue.property()
  @type.rootRef("Tr2QuadRenderer")
  @meta.implemented
  get quadRenderer()
  {
    return this.GetQuadRenderer();
  }

  /** g_lensflaresInReflections (cpp:115-116): draw lens flares into ULTRA reflections. */
  @meta.setting("lensflaresInReflections")
  static lensflaresInReflections = true;

  /** RenderReflectionPass's per-face DepthMap provider and matrices. */
  _reflectionFaceDepth = new Tr2TextureReference();
  _reflectionView = mat4.create();
  _reflectionPlanetView = mat4.create();
  _reflectionPlanetProjection = mat4.create();
  _reflectionProjection = mat4.create();
  _reflectionJitter = mat4.create();

  /** m_updateTime (Be::Time) [READ] */
  @blue.read
  @type.float64
  updateTime = 0;

  /** m_useSunColorWithDynamicLights (bool) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.boolean
  useSunDiffuseColorWithDynamicLights = false;

  /** m_envMap1 (ITr2TextureProviderPtr) [READ] */
  @blue.read
  @type.rootRef("ITr2TextureProvider")
  envMap1 = null;

  /** m_envMap2 (ITr2TextureProviderPtr) [READ] */
  @blue.read
  @type.rootRef("ITr2TextureProvider")
  envMap2 = null;

  /** m_envMap3 (ITr2TextureProviderPtr) [READ] */
  @blue.read
  @type.rootRef("ITr2TextureProvider")
  envMap3 = null;

  // Carbon m_updateContext (protected, absent from the Blue scan): the scene
  // owns ONE frame context, constructed once and re-stamped each Update. The
  // host/driver stamps updateContext.renderContext (camera view) + .device per
  // pass before calling Update - our explicit replacement for Carbon's
  // Tr2Renderer view statics.
  updateContext = new EveUpdateContext();

  /**
   * MAP_PROPERTY "gpuParticleSystem" (EveSpaceScene_Blue.cpp:472): the GPU
   * particle system, held by the update context, which hands it to emitters.
   */
  @blue.property()
  @type.rootRef("Tr2GpuParticleSystem")
  get gpuParticleSystem()
  {
    return this.GetGpuParticleSystem();
  }

  /** MAP_PROPERTY "gpuParticleSystem"; see the getter. */
  set gpuParticleSystem(ps)
  {
    this.SetGpuParticleSystem(ps);
  }

  /**
   * Carbon GetGpuParticleSystem (EveSpaceScene.h:522-525).
   *
   * @returns {object|null} The Tr2GpuParticleSystem, or null.
   */
  @blue.method
  @meta.implemented
  GetGpuParticleSystem()
  {
    return this.updateContext.GetGpuParticleSystem();
  }

  /**
   * Carbon SetGpuParticleSystem (EveSpaceScene.h:526-529).
   * Shared assignment never destroys the old system; JS callers explicitly Destroy
   * only when its final owner releases it, replacing Carbon shared-pointer destruction.
   *
   * @param {object|null} ps The Tr2GpuParticleSystem, or null.
   */
  @blue.method
  @meta.adapted
  SetGpuParticleSystem(ps)
  {
    this.updateContext.SetGpuParticleSystem(ps);
  }

  // Carbon m_sceneDefaultPostProcessAttributes (EveSpaceScene.h:640, ctor
  // CreateInstance cpp:296): the scene default's attribute snapshot, refreshed
  // by UpdatePostProcessAttributes each frame.
  _sceneDefaultPostProcessAttributes = new Tr2PostProcessAttributes();

  // Carbon m_combinedPostProcess (EveSpaceScene.h:636): the merged output
  // post-process, lazily constructed on first combine (cpp:367-370).
  _combinedPostProcess = null;

  // Carbon m_currentSunColor / m_currentNebulaIntensity /
  // m_currentReflectionIntensity (EveSpaceScene.h:492-493/650, protected):
  // outputs of the BeginRender lighting-override blend (cpp:1360-1362).
  currentSunColor = vec4.fromValues(1, 1, 1, 1);

  currentNebulaIntensity = 1;

  currentReflectionIntensity = 1;

  // Carbon m_viewLast / m_projectionLast / m_jitterMatrix
  // (EveSpaceScene.h:296-297, protected): the previous frame's camera, which
  // the per-frame vertex block hands to the shader for motion vectors.
  viewLast = mat4.create();

  projectionLast = mat4.create();

  jitterMatrix = mat4.create();

  // Carbon m_jitter (EveSpaceScene.h:624) - xy: projection offset, zw: pixel
  // offset. The per-frame pixel block reports only whether it is non-zero.
  jitter = vec4.create();

  // Jitter writes jitterMatrix and jitter each frame, EndRender stores
  // viewLast and projectionLast, and EveSpaceSceneRenderDriver hands the
  // last-frame pair in and out around them (cpp:431-432, 597-598).

  // Carbon m_projection (the camera's unjittered projection, which EndRender
  // stores as next frame's projectionLast) and m_jitteredProjection (what the
  // frame draws with), both written by Jitter.
  projection = mat4.create();

  jitteredProjection = mat4.create();

  // Carbon m_upscalingAmount (EveSpaceScene.h:623, =1 by default at cpp:221).
  // Reset by the per-frame pixel fill and raised by an upscaler, if any.
  upscalingAmount = 1;

  /**
   * Stamps the per-frame frustum/threshold/LOD state onto the scene-owned
   * update context (Carbon EveSpaceScene::Update cpp:475-484, identical to the
   * already-updated fast path cpp:448-457). Carbon derives the frustum from
   * the Tr2Renderer view statics and reads the thresholds from console vars
   * divided by m_upscalingAmount (=1 by default, cpp:221); in CarbonEngineJS
   * the driver derives the frustum from the same renderContext state it
   * stamped and supplies the thresholds explicitly (pre-divided if it ever
   * upscales). An omitted threshold or LOD factor is the registered setting
   * divided by upscalingAmount, as Carbon's Update computes it (cpp:455-459).
   * The raytracing flag is Carbon's `m_shadowQuality == SHADOW_RAYTRACED &&
   * m_enableShadows` (cpp:457/484) - the driver computes it; the scene does
   * not. Stamps unconditionally: Carbon's same-frame fast path restamps
   * regardless of m_update (cpp:444-462); only the cold path skips stamping
   * when !m_update (cpp:466 precedes 475) - benign divergence.
   * @param {Object} [options]
   * @param {TriFrustum} options.frustum - a ready TriFrustum, copied into the update context (ruling 16)
   * @param {Number} [options.visibilityThreshold]
   * @param {Number} [options.lowDetailThreshold]
   * @param {Number} [options.mediumDetailThreshold]
   * @param {Number} [options.highDetailThreshold]
   * @param {Number} [options.lodFactor]
   * @param {Boolean} [options.raytracingEnabled]
   */
  StampFrameContext({
    frustum,
    visibilityThreshold = EveSpaceScene.eveSpaceSceneVisibilityThreshold / this.upscalingAmount,
    lowDetailThreshold = EveSpaceScene.eveSpaceSceneLowDetailThreshold / this.upscalingAmount,
    mediumDetailThreshold = EveSpaceScene.eveSpaceSceneMediumDetailThreshold / this.upscalingAmount,
    highDetailThreshold = EveSpaceScene.eveSpaceSceneHighDetailThreshold / this.upscalingAmount,
    lodFactor = EveSpaceScene.eveSpaceSceneLODFactor / this.upscalingAmount,
    raytracingEnabled = false
  })
  {
    const context = this.updateContext;
    context.SetFrustum(frustum);
    context.SetHighDetailThreshold(highDetailThreshold);
    context.SetMediumDetailThreshold(mediumDetailThreshold);
    context.SetLowDetailThreshold(lowDetailThreshold);
    context.SetVisibilityThreshold(visibilityThreshold);
    context.SetLodFactor(lodFactor);
    context.raytracingEnabled = !!raytracingEnabled;
  }

  /**
   * Per-frame scene update, ported from Carbon EveSpaceScene::Update: stamps the
   * scene-owned frame context (time, origin, data-texture manager), then drives
   * every collection in Carbon's order - background objects, warp tunnel,
   * starfield, static particles, data textures, distance fields, lensflares,
   * virtual camera system, curve sets, then all space/UI objects synchronous
   * first and asynchronous second (Carbon parallelizes the async pass on a task
   * group; JS runs it sequentially). Then combines the post-process attributes
   * (cpp:584) and finally reads the sun direction from the sun ball
   * (cpp:589-596).
   *
   * Adapted - deferred vs Carbon: the recording-frame dedup fast path,
   * frustum/threshold/LOD/raytracing stamping (now the driver's job via
   * StampFrameContext, called BEFORE Update), and main-thread action flush (N/A).
   * @param {Number} realTime
   * @param {Number} simTime
   */
  @blue.method
  @meta.adapted
  Update(realTime, simTime)
  {
    // Carbon cpp:441-444, first thing: fence the rings by the main-thread
    // context's frames, so uploads the GPU has finished with are reclaimed.
    const mainContext = Tr2RenderContext_GetMainThreadRenderContext();
    Tr2RingBuffer.setInstanceFrameNumbers(mainContext.GetRecordingFrameNumber(), mainContext.GetRenderedFrameNumber());

    if (!this.update)
    {
      return;
    }

    const context = this.updateContext;
    context.SetTime(simTime);
    context.UpdateOrigin(this.ballpark);
    context.SetDataTextureManager(this.dataTextureMgr);

    for (const object of this.backgroundObjects)
    {
      object?.UpdateSyncronous(context);
    }
    for (const object of this.backgroundObjects)
    {
      object?.UpdateAsyncronous(context);
    }

    if (this.warpTunnel)
    {
      this.warpTunnel.UpdateSyncronous(context);
      this.warpTunnel.UpdateAsyncronous(context);
    }

    this.UpdatePlanets(context);

    if (this.starfield) this.starfield.Update(simTime);

    for (const staticParticles of this.staticParticles)
    {
      staticParticles?.Update(context);
    }

    this.dataTextureMgr?.Update(context);

    for (const distanceField of this.distanceFields)
    {
      distanceField?.Update(context);
    }

    for (const lensflare of this.lensflares)
    {
      lensflare?.Update(realTime, simTime);
    }

    this.virtualCameraSystem?.Update(realTime);

    for (const curveSet of this.curveSets)
    {
      curveSet.Update__RealTimeSimTime(realTime, simTime);
    }

    for (const object of this.objects)
    {
      object?.UpdateSyncronous(context);
    }
    for (const object of this.uiObjects)
    {
      object?.UpdateSyncronous(context);
    }

    for (const object of this.objects)
    {
      object?.UpdateAsyncronous(context);
    }
    for (const object of this.uiObjects)
    {
      object?.UpdateAsyncronous(context);
    }

    // Drain the actions the updates queued (EveSpaceScene.cpp:584), after the
    // async pass and before the post-process combine and the sun read.
    ExecuteMainThreadActions();

    // Combine the post-process attributes (Carbon cpp:587).
    this.UpdatePostProcessAttributes();

    // Sun direction from the sun ball: the normalized sun position, negated
    // (Carbon: m_sunData.DirWorld = -Normalize(sunDirection)).
    if (this.sunBall)
    {
      this.sunBall.Update__Ticks(simTime, sunDirectionScratch);
      vec3.normalize(sunDirectionScratch, sunDirectionScratch);
      vec3.negate(this.sunDirection, sunDirectionScratch);
    }

    this.updateTime = simTime;
  }

  /** Immediate pick, awaitable because WebGPU cannot block on readback. */
  @blue.method
  @meta.adapted
  async PickObject(x, y, projection, view, viewport, pickTypes = TR2_PICK_TYPE_DEFAULT)
  {
    const result = await this.PickObjectAndExtraData(x, y, projection, view, viewport, pickTypes);
    return result ? result[0] : null;
  }

  /** Carbon method PickAsyncObject (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  @blue.method
  @meta.implemented
  PickAsyncObject(listener, x, y, projection, view, viewport, pickTypes = TR2_PICK_TYPE_DEFAULT)
  {
    if (!listener) return null;
    return this.PerformPicking(listener, false, x, y, projection, view, viewport, pickTypes)[0];
  }

  /** Carbon method PickObjectAndAreaID -> PyPickObjectAndAreaID (MAP_METHOD). */
  @blue.method
  @meta.adapted
  async PickObjectAndAreaID(x, y, projection, view, viewport, pickTypes = TR2_PICK_TYPE_DEFAULT)
  {
    const result = await this.PickObjectAndExtraData(x, y, projection, view, viewport, pickTypes);
    return result ? result.slice(0, 2) : null;
  }

  /** Owns a fresh listener, so an immediate call can never return an earlier hit. */
  @blue.method
  @meta.adapted
  async PickObjectAndExtraData(x, y, projection, view, viewport, pickTypes = TR2_PICK_TYPE_DEFAULT)
  {
    const listener = new EvePickingContext();
    try
    {
      const result = await this.PerformPicking(listener, true, x, y, projection, view, viewport, pickTypes);
      return result[0] ? result : null;
    }
    finally
    {
      listener.Destroy();
    }
  }

  /** Native polling: submit this pixel and return the latest completed result. */
  @blue.method
  @meta.implemented
  PickAsyncObjectAndExtraData(listener, x, y, projection, view, viewport, pickTypes = TR2_PICK_TYPE_DEFAULT)
  {
    if (!listener) return null;
    const result = this.PerformPicking(listener, false, x, y, projection, view, viewport, pickTypes);
    return result[0] ? result : null;
  }

  _pickBuffer = new Tr2TextureAL();
  _pickDepthBuffer = new Tr2TextureAL();
  _pickingBatches = new TriRenderBatchAccumulator(DefaultKeyGenerator);

  /** Explicit native destruction cannot be followed by another picking submission. */
  _destroyed = false;

  /**
   * Replaces ~EveSpaceScene and destruction of its owned AL values
   * (EveSpaceScene.cpp:309-345, EveSpaceScene.h:546-549). JavaScript has no
   * deterministic destructor. Stop the scene's render job before calling.
   * The scene-created data texture manager is released with its owner; shared
   * scene objects/managers remain caller-owned. Readback snapshots are
   * owned by their picking contexts and remain usable after the scene retires.
   */
  @meta.adapted
  Destroy()
  {
    if (this._destroyed) return;
    this._destroyed = true;
    this.ClearVariableStore();
    this.SetShLightingManager(null);
    this._pickingBatches.Clear();
    this.ClearBatches(this._secondaryBatches);
    this._secondaryAdditiveBatches.Clear();
    for (const batches of this._shadowBatches) batches.Clear();
    this._pickBuffer.Destroy();
    this._pickDepthBuffer.Destroy();
    // m_xBuffer = Tr2ConstantBufferAL() (cpp:342-344).
    this._perFrameVSBuffer.Destroy();
    this._perFramePSBuffer.Destroy();
    this._shadowPerFrameVSBuffer.Destroy();
    this.dataTextureMgr.Release();
    this.ClearComponentRegistry();
    // Carbon's Tr2DeviceResource destructor (Tr2DeviceResource.cpp:11-14).
    TriDevice.UnregisterResource(this);
  }

  /**
   * Carbon ReleaseResources (EveSpaceScene.cpp:327-346): clears both env-map
   * variables, and on a full release drops the per-frame constant buffers.
   * @param {number} s TriStorageFlags.
   */
  @blue.method
  @meta.implemented
  ReleaseResources(s)
  {
    if (this._staticEnvMapHandle)
    {
      this._staticEnvMapHandle.Clear();
    }
    if (this._envMapHandle)
    {
      this._envMapHandle.Clear();
    }

    if ((s & TriStorageFlags.TRISTORAGE_ALL) === TriStorageFlags.TRISTORAGE_ALL)
    {
      // m_xBuffer = Tr2ConstantBufferAL().
      this._perFrameVSBuffer.Destroy();
      this._perFramePSBuffer.Destroy();
      this._shadowPerFrameVSBuffer.Destroy();
    }
  }

  /**
   * Carbon OnPrepareResources (EveSpaceScene.cpp:432-440): the 1x1 picking
   * target and its depth buffer.
   * @returns {boolean} False when either cannot be created.
   */
  @blue.method
  @meta.implemented
  OnPrepareResources()
  {
    const renderContext = Tr2RenderContext_GetMainThreadRenderContext();

    if (Failed(this._pickBuffer.Create__GpuUsageCpuUsage(
      Tr2BitmapDimensions.create__WidthHeightMipCountFormat(1, 1, 1, PixelFormat.PIXEL_FORMAT_R32G32B32A32_UINT),
      Tr2GpuUsage.RENDER_TARGET, Tr2CpuUsage.READ_OFTEN, renderContext)))
    {
      return false;
    }
    if (Failed(this._pickDepthBuffer.Create__GpuUsage(
      Tr2BitmapDimensions.create__WidthHeightMipCountFormat(1, 1, 1, PixelFormat.PIXEL_FORMAT_D24_UNORM_S8_UINT),
      Tr2GpuUsage.DEPTH_STENCIL, renderContext)))
    {
      return false;
    }

    return true;
  }

  /**
   * Clears environment publications (EveSpaceScene.cpp:3018-3026). The native
   * shared-index and baked-morph handles are not owned by this scene port.
   */
  @blue.method
  @meta.adapted
  ClearVariableStore()
  {
    this._envMap1Handle.Clear();
    this._envMap2Handle.Clear();
    this._reflectionMapHandle.Clear();
    this._reflectionMaskMapHandle.Clear();
  }

  /**
   * Carbon GetShLightingManager (EveSpaceScene.cpp:3368-3371).
   *
   * @returns {import("../../core/lighting/Tr2ShLightingManager.js").Tr2ShLightingManager|null} The scene's SH lighting manager, or null.
   */
  @meta.implemented
  GetShLightingManager()
  {
    return this._shLightingManager;
  }

  /**
   * Carbon SetShLightingManager (EveSpaceScene.cpp:3373-3423): unregisters the
   * planets' and objects' secondary light sources from the old manager and
   * clears the objects' SH lighting, then registers them with the new one.
   *
   * @param {import("../../core/lighting/Tr2ShLightingManager.js").Tr2ShLightingManager|null} manager The replacement manager, or null.
   * @returns {void}
   */
  @meta.implemented
  SetShLightingManager(manager)
  {
    if (this._shLightingManager === manager) return;
    if (this._shLightingManager)
    {
      for (const planet of this.planets)
        CjsSchema.cast(planet, ITr2SecondaryLightSource)?.UnregisterSecondaryLightSource(this._shLightingManager);
      for (const object of this.objects)
      {
        CjsSchema.cast(object, ITr2SecondaryLightSource)?.UnregisterSecondaryLightSource(this._shLightingManager);
        CjsSchema.cast(object, ITr2ShLightingReceiver)?.ClearShLighting();
      }
    }
    this._shLightingManager = manager;
    if (manager)
    {
      for (const planet of this.planets)
        CjsSchema.cast(planet, ITr2SecondaryLightSource)?.RegisterSecondaryLightSource(manager);
      for (const object of this.objects)
        CjsSchema.cast(object, ITr2SecondaryLightSource)?.RegisterSecondaryLightSource(manager);
    }
  }

  /**
   * Our wrapper selecting one Carbon picking revision. Each request retains
   * its framework so changing the setting cannot reinterpret queued results.
   */
  @blue.method
  PerformPicking(listener, immediate, x, y, projection, view, viewport, pickTypes = TR2_PICK_TYPE_DEFAULT,
    renderContext = Tr2RenderContext_GetMainThreadRenderContext())
  {
    switch (Tr2RenderContext.eveSpacePickingFramework)
    {
      case "objectId": return this.PerformPicking__ObjectId(listener, immediate, x, y, projection, view, viewport, pickTypes, renderContext);
      case "pointer": return this.PerformPicking__Pointer(listener, immediate, x, y, projection, view, viewport, pickTypes, renderContext);
      default: throw new TypeError("Unknown eveSpacePickingFramework; expected objectId or pointer.");
    }
  }

  /**
   * Pre-92483097 EveSpaceScene.cpp:3578-3771: retained collision-set indices,
   * request-owned BGRA8 main target and independent float debug target.
   * Browser readback readiness replaces native frame-number synchronization.
   * Instanced meshes are not picked in this framework: current Carbon picks
   * them only through the readback framework (EveInstancedMeshManager.h:100,
   * 279), and the pre-92483097 manager bodies are not ported. The debug renderer's
   * Pick entry is an explicit unported obligation, not silently skipped.
   */
  @meta.adapted
  PerformPicking__ObjectId(listener, immediate, x, y, projection, view, viewport, pickTypes = TR2_PICK_TYPE_DEFAULT,
    renderContext = Tr2RenderContext_GetMainThreadRenderContext())
  {
    if (this._destroyed) throw new Error("Cannot pick a destroyed EveSpaceScene.");
    if (!renderContext.IsValid()) return immediate ? Promise.resolve([null, 0, 0]) : [null, 0, 0];
    const request = new EvePendingPickingReadback(x, y, "objectId");
    listener.readbacks.push(request);
    const esm = renderContext.GetEffectStateManager();
    const inverted = esm.IsDepthTestInverted(), managed = esm.IsManagedRendering();
    renderContext.PushProjection();
    renderContext.PushViewTransform();
    esm.PushViewport();
    try
    {
      const pixel = screenToProjection(x, y, viewport);
      this.SetupTransformsForPicking(pixel.x, pixel.y, projection, view, viewport, renderContext);
      if (this.debugRenderer) this.debugRenderer.Pick(request, immediate, renderContext);
      const visible = this.GetPickingObjectsToRender(renderContext);
      for (const renderable of visible)
      {
        const pickable = CjsSchema.cast(renderable, ITr2Pickable);
        if (pickable) request.collisionSet.push([pickable, renderable]);
      }
      const batches = this._pickingBatches;
      batches.SetTriPoolAllocator(renderContext.GetTriPoolAllocator());
      // Waiting: EvePendingPickingReadback. Pre-92483097 cpp:3621-3639 gathered
      // the instanced meshes here; current Carbon picks them only through the
      // readback framework (EveInstancedMeshManager.h:100, 279), so this
      // framework gathers none.
      if ((request.collisionSet.length || batches.GetBatchCount()) && !Failed(renderContext.BeginScene()))
      {
        try
        {
          esm.SetInvertedDepthTest(true);
          esm.BeginManagedRendering();
          const buffer = request.mainPickBuffer;
          buffer.PrepareResources(renderContext);
          if (buffer.BeginRendering(0, renderContext))
          {
            try
            {
              for (let index = 0; index < request.collisionSet.length; index++)
              {
                const [pickable, renderable] = request.collisionSet[index];
                const data = renderable.GetPerObjectData(batches);
                if (data)
                {
                  data.SetUserData(index);
                }
                if (pickTypes !== Tr2PickType.PICK_TYPE_PICKING)
                  pickable.GetPickingBatches(batches, pickTypes & ~Tr2PickType.PICK_TYPE_PICKING, data);
                if (pickTypes & Tr2PickType.PICK_TYPE_PICKING)
                  pickable.GetPickingBatches(batches, Tr2PickType.PICK_TYPE_PICKING, data);
              }
              batches.Finalize();
              esm.ApplyStandardStates(RenderingMode.RM_PICKING);
              renderContext.RenderBatchesForPicking__ObjectId(batches, "Picking");
            }
            finally { buffer.EndRendering(renderContext); }
            batches.Clear();
            request.MapMain(immediate, renderContext);
          }
        }
        finally { renderContext.EndScene(); }
      }
    }
    catch (error)
    {
      listener.readbacks.splice(listener.readbacks.indexOf(request), 1);
      request.Destroy();
      throw error;
    }
    finally
    {
      this._pickingBatches.Clear();
      if (!managed) esm.EndManagedRendering();
      esm.SetInvertedDepthTest(inverted);
      esm.PopViewport();
      renderContext.PopViewTransform();
      renderContext.PopProjection();
    }
    return immediate ? this._AwaitPicking(listener, renderContext) : this._PollPicking(listener, renderContext);
  }

  /** Native one-pixel picking frustum for the retained legacy instancing seam. */
  @meta.adapted
  CreatePickingFrustum(renderContext = Tr2RenderContext_GetMainThreadRenderContext())
  {
    const frustum = new TriFrustum();
    frustum.DeriveFrustum(renderContext.GetViewTransform(), renderContext.GetViewPosition(),
      renderContext.GetProjection(), { width: 1, height: 1 });
    return frustum;
  }

  /**
   * Carbon 92483097's regular-object GPU pass. Call between scene renders. Submission and
   * state restoration finish synchronously before any WebGPU readback is awaited.
   * Instanced meshes come from the manager's GetPickingBatches (cpp:3643-3661).
   * Skinned, interior and debug-renderer picking remain separate ports.
   *
   * Adapted: Carbon gathers the instanced batches before it checks the pick
   * buffers; here they are gathered once the buffers exist, inside the block
   * whose finally clears the picking accumulator, so a failed pick cannot
   * leave them queued for the next one.
   */
  @meta.adapted
  PerformPicking__Pointer(listener, immediate, x, y, projection, view, viewport, pickTypes = TR2_PICK_TYPE_DEFAULT,
    renderContext = Tr2RenderContext_GetMainThreadRenderContext())
  {
    if (this._destroyed) throw new Error("Cannot pick a destroyed EveSpaceScene.");
    if (!renderContext.IsValid()) return immediate ? Promise.resolve([null, 0, 0]) : [null, 0, 0];
    const request = new EvePendingPickingReadback(x, y);
    listener.readbacks.push(request);
    const esm = renderContext.GetEffectStateManager();
    const inverted = esm.IsDepthTestInverted();
    const managed = esm.IsManagedRendering();
    renderContext.PushProjection();
    renderContext.PushViewTransform();
    esm.PushViewport();
    try
    {
      const pixel = screenToProjection(x, y, viewport);
      this.SetupTransformsForPicking(pixel.x, pixel.y, projection, view, viewport, renderContext);
      const visible = this.GetPickingObjectsToRender(renderContext);
      if (!this._pickBuffer.IsValid())
      {
        this._pickBuffer.Create__GpuUsageCpuUsage(Tr2BitmapDimensions.create__WidthHeightMipCountFormat(1, 1, 1, PixelFormat.PIXEL_FORMAT_R32G32B32A32_UINT),
          Tr2GpuUsage.RENDER_TARGET, Tr2CpuUsage.READ_OFTEN, renderContext);
      }
      if (!this._pickDepthBuffer.IsValid())
      {
        this._pickDepthBuffer.Create__GpuUsage(Tr2BitmapDimensions.create__WidthHeightMipCountFormat(1, 1, 1, PixelFormat.PIXEL_FORMAT_D24_UNORM_S8_UINT),
          Tr2GpuUsage.DEPTH_STENCIL, renderContext);
      }
      if (this._pickBuffer.IsValid() && this._pickDepthBuffer.IsValid() && !Failed(renderContext.BeginScene()))
      {
        try
        {
          esm.SetInvertedDepthTest(true);
          esm.BeginManagedRendering();
          esm.PushRenderTarget__TextureAL(this._pickBuffer);
          esm.PushDepthStencilBuffer__TextureAL(this._pickDepthBuffer);
          try
          {
            renderContext.Clear({ clearColor: true, clearDepth: true, color: [0, 0, 0, 0], depth: 0 });
            esm.SetFullScreenViewport();
            const batches = this._pickingBatches;
            batches.SetTriPoolAllocator(renderContext.GetTriPoolAllocator());
            // Carbon cpp:3643-3661: the shared instanced meshes' batches.
            {
              const instancedBatches = [];
              if ((pickTypes & Tr2PickType.PICK_TYPE_OPAQUE) !== 0)
              {
                instancedBatches.push([ TriBatchType.TRIBATCHTYPE_OPAQUE, batches ]);
              }
              if ((pickTypes & Tr2PickType.PICK_TYPE_TRANSPARENT) !== 0)
              {
                instancedBatches.push([ TriBatchType.TRIBATCHTYPE_TRANSPARENT, batches ]);
                instancedBatches.push([ TriBatchType.TRIBATCHTYPE_ADDITIVE, batches ]);
              }
              if (instancedBatches.length !== 0)
              {
                this.instancedMeshManager.GetPickingBatches(request, this.updateContext.GetFrustum(), this.CreatePickingFrustum(renderContext),
                  this.updateContext.GetInvLodFactor(), instancedBatches);
              }
            }
            for (const renderable of visible)
            {
              const pickable = CjsSchema.cast(renderable, ITr2Pickable);
              if (!pickable) continue;
              const pointer = request.RetainObject(pickable);
              const data = renderable.GetPerObjectData(batches);
              if (data) data.SetPickingPointer(pointer);
              if (pickTypes !== Tr2PickType.PICK_TYPE_PICKING)
                pickable.GetPickingBatches(batches, pickTypes & ~Tr2PickType.PICK_TYPE_PICKING, data);
              if (pickTypes & Tr2PickType.PICK_TYPE_PICKING)
                pickable.GetPickingBatches(batches, Tr2PickType.PICK_TYPE_PICKING, data);
            }
            batches.Finalize();
            esm.ApplyStandardStates(RenderingMode.RM_PICKING);
            renderContext.RenderBatchesForPicking__Pointer(batches, "Picking");
          }
          finally
          {
            this._pickingBatches.Clear();
            esm.PopDepthStencilBuffer();
            esm.PopRenderTarget();
          }
        }
        finally
        {
          renderContext.EndScene();
        }
        request.readback = this._pickBuffer.CreateReadback(Tr2TextureSubresource.create__MipLevel(0), renderContext);
      }
    }
    catch (error)
    {
      listener.readbacks.splice(listener.readbacks.indexOf(request), 1);
      request.Destroy();
      throw error;
    }
    finally
    {
      if (!managed) esm.EndManagedRendering();
      esm.SetInvertedDepthTest(inverted);
      esm.PopViewport();
      renderContext.PopViewTransform();
      renderContext.PopProjection();
    }
    return immediate ? this._AwaitPicking(listener, renderContext) : this._PollPicking(listener, renderContext);
  }

  /** Polls request-owned snapshots using their recorded framework, including mixed queues. */
  _PollPicking(listener, renderContext)
  {
    while (listener.readbacks.length)
    {
      const pending = listener.readbacks[0];
      if (pending.framework === "pointer" && !pending.readback.IsValid())
      {
        listener.readbacks.shift().Destroy();
        continue;
      }
      if (pending.readback.IsValid() && !pending.readback.IsReady(renderContext)) break;
      if (pending.debugReadback.IsValid() && !pending.debugReadback.IsReady(renderContext)) break;
      this._ConsumePicking(listener, pending, pending.readback.Map(renderContext), pending.debugReadback.Map(renderContext), false);
    }
    return [listener.GetObject(), listener.GetExtraData1(), listener.GetExtraData2()];
  }

  /** Wait only on the listener's own snapshots; cancellation drops the result. */
  async _AwaitPicking(listener, renderContext)
  {
    while (listener.readbacks.length)
    {
      const pending = listener.readbacks[0];
      const mapping = await pending.readback.Map(renderContext);
      const debug = await pending.debugReadback.Map(renderContext);
      if (listener.readbacks[0] !== pending) continue;
      this._ConsumePicking(listener, pending, mapping, debug, true);
    }
    return [listener.GetObject(), listener.GetExtraData1(), listener.GetExtraData2()];
  }

  /** Decodes before releasing the borrowed mapping and its retained objects. */
  _ConsumePicking(listener, pending, mapping, debug, immediate)
  {
    const mainData = mapping.result === ALResult.S_OK ? mapping.data : null;
    const debugData = debug.result === ALResult.S_OK ? debug.data : null;
    const result = pending.framework === "objectId"
      // Waiting: EvePendingPickingReadback. Pre-92483097 cpp:3749-3754 decoded
      // an immediate instanced hit with the manager's GetPickedObject, which
      // current Carbon declares (h:101) without a body; no manager is passed.
      ? pending.DecodeResult__ObjectId(mainData, debugData, immediate, null)
      : mainData ? pending.DecodeResult(mainData) : [null, 0, 0];
    listener.UpdateResult(pending.pickedX, pending.pickedY, ...result);
    listener.readbacks.shift();
    pending.Destroy();
  }

  /** Crops the current projection to one pixel; gl-matrix reverses native composition. */
  @blue.method
  @meta.adapted
  SetupTransformsForPicking(fx, fy, projection, view, viewport, renderContext)
  {
    const mat4_0 = mat4.alloc();
    try
    {
      const crop = mat4.identity(mat4_0);
      crop[0] = viewport.width;
      crop[5] = viewport.height;
      crop[12] = -fx * viewport.width;
      crop[13] = -fy * viewport.height;
      mat4.multiply(crop, crop, projection.GetMatrixWithoutViewAdjustment());
      renderContext.SetViewTransform(view.GetTransform());
      renderContext.SetProjection(crop, projection.fov);
    }
    finally
    {
      mat4.unalloc(mat4_0);
    }

    // Carbon (cpp:3829-3845): fill LOCAL per-frame records for the pick
    // projection and bind them, leaving the scene's own records at their
    // frame values. The pick target is not pushed yet, so the target
    // resolution is forced to the 1x1 pick buffer's.
    const perFramePS = RawData.create("EveSpaceScenePerFramePSData");
    const perFrameVS = RawData.create("EveSpaceScenePerFrameVSData");
    this.PopulatePerFramePSData(perFramePS, renderContext);
    this.PopulatePerFrameVSData(perFrameVS, renderContext);
    perFrameVS.Set("TargetResolution", [ 1, 1 ]);
    this._FillAndSetPerFrameConstants(perFrameVS, perFramePS, renderContext);
  }

  /** Native one-pixel frustum visibility gather, with the previous frustum restored. */
  @blue.method
  @meta.adapted
  GetPickingObjectsToRender(renderContext)
  {
    const visible = [];
    // Carbon copies the frustum it restores (TriFrustum frustum = GetFrustum(), cpp:660).
    const previous = new TriFrustum().Copy(this.updateContext.GetFrustum());
    const frustum = new TriFrustum();
    frustum.DeriveFrustum(renderContext.GetViewTransform(), renderContext.GetViewPosition(),
      renderContext.GetProjection(), { width: 1, height: 1 });
    this.updateContext.SetFrustum(frustum);
    try
    {
      for (const object of this.objects)
      {
        if (!object.IsPickable()) continue;
        object.UpdateVisibility(this.updateContext, IDENTITY);
        object.GetRenderables__Impostors(visible, null);
      }
    }
    finally
    {
      this.updateContext.SetFrustum(previous);
    }
    if (this.cameraAttachmentParent)
    {
      this.cameraAttachmentParent.UpdateVisibility(this.updateContext, IDENTITY);
      this.cameraAttachmentParent.GetRenderables__Impostors(visible, null);
    }
    return visible;
  }

  /**
   * Carbon EveSpaceScene::PickInfinity (cpp:4087-4098): the world-space
   * DIRECTION a screen pixel points along - the pick ray with nothing to hit,
   * which is what a click on empty space resolves to. Pure math, no readback.
   *
   * @param {Number} x - screen x, in pixels
   * @param {Number} y - screen y, in pixels
   * @param {Float32Array} projection - the projection matrix
   * @param {Float32Array} view - the view matrix
   * @param {Object} [viewport] - { x, y, width, height }; the frame's render
   *   context supplies one when this is omitted
   * @param {Float32Array} [out] - caller-owned direction
   * @returns {Float32Array|null} the normalized world direction, or null when
   *   either matrix cannot be inverted
   */
  @blue.method
  @meta.implemented
  PickInfinity(x, y, projection, view, viewport = null, out = vec3.create())
  {
    const resolved = viewport ?? this.updateContext.renderContext.GetViewport();
    const projected = screenToProjection(x, y, resolved);
    const ray = convertProjectionCoordToWorldPickRay(projected.x, projected.y, projection, view);

    return ray ? vec3.copy(out, ray.direction) : null;
  }

  /**
   * The per-frame CPU visibility pass, ported from the [VISIBILITY] block of
   * Carbon EveSpaceScene::GatherBatches (EveSpaceScene.cpp:1443-1467; the
   * enclosing display gate is BeginRender cpp:1299-1302). Carbon's
   * Tr2ParallelDo loops (objects cpp:1445-1447, staticParticles cpp:1454-1456,
   * planets cpp:1458-1460) run sequentially in the same order; the lensflare
   * loop is sequential in Carbon too (cpp:1462-1466). LOD stamping (lodLevel,
   * isVisible, pixel diameters) happens INSIDE each object's UpdateVisibility;
   * per-object display gates live there too - the scene does not pre-filter.
   * uiObjects are never visited (Carbon never culls them). The camera parent's
   * SetTransform is pure decomposition (EveEffectRoot2.cpp:677-680 Decompose)
   * - no composition, so no row-vector operand swap here; this per-gather
   * Sync/Async pair is the camera parent's ONLY update, so its world transform
   * is the camera pose of the frame being gathered (cpp:1449-1452).
   * @param {Float32Array} inverseView - the inverse view matrix
   *   (updateContext.renderContext.GetInverseViewTransform(); Carbon reads the
   *   Tr2Renderer static at cpp:1449)
   */
  UpdateVisibility(inverseView)
  {
    if (!this.display)
    {
      return;
    }

    for (const object of this.objects)
    {
      object.UpdateVisibility(this.updateContext, IDENTITY);
    }

    this.cameraAttachmentParent.SetTransform(inverseView);
    this.cameraAttachmentParent.UpdateSyncronous(this.updateContext);
    this.cameraAttachmentParent.UpdateAsyncronous(this.updateContext);
    this.cameraAttachmentParent.UpdateVisibility(this.updateContext, IDENTITY);

    for (const staticParticles of this.staticParticles)
    {
      staticParticles.UpdateVisibility(this.updateContext);
    }

    for (const planet of this.planets)
    {
      planet.UpdateZOnlyVisibility(this.updateContext);
    }

    // Sequential in Carbon too: "until we have proper support for multiple
    // lensflares we just do it in a list" (cpp:1462-1466).
    for (const lensflare of this.lensflares)
    {
      lensflare?.UpdateVisibility(this.updateContext);
    }
  }

  /** Gathers batchable renderables from the scene's objects for the batch
   * collection pass - the [GATHER] block of Carbon
   * EveSpaceScene::GatherBatches (EveSpaceScene.cpp:1470-1507): m_objects in
   * list order (cpp:1470-1475), then cameraAttachmentParent pushed LAST
   * (cpp:1476), then the staticParticles leg (cpp:1504-1507; Carbon signature
   * `GetRenderables(frustum, renderables)`, EveSceneStaticParticles.h - kept
   * with the out-parameter last per convention). Objects self-filter on the
   * visibility flags stamped by UpdateVisibility, so the array handed to
   * CjsBatchManager.Collect is pre-culled and this aggregation stays GPU-free.
   * The impostor-manager argument (cpp:1478-1502) is dropped - engine-owned.
   * Gather order matters downstream: the opaque accumulator receives batches
   * in gather order before Finalize sorts. */
  GetRenderables(out = [], renderContext = Tr2RenderContext_GetMainThreadRenderContext())
  {
    if (!this.display)
    {
      return out;
    }

    // Carbon GatherBatches (cpp:1487-1511): with an impostor manager, and the
    // reflection probe (if any) holding data, size the atlas items from the
    // low-detail threshold and collect impostors while gathering.
    let impostors = null;
    if (this.impostorManager && (!this.reflectionProbe || this.reflectionProbe.HasData()))
    {
      let size = 2;
      const threshold = Math.trunc(EveSpaceScene.eveSpaceSceneLowDetailThreshold) >>> 1;
      while (size * 2 < threshold) size *= 2;
      this.impostorManager.SetItemSize(size, size);
      this.impostorManager.BeginUpdate();
      impostors = this.impostorManager;
    }

    for (const object of this.objects) object?.GetRenderables__Impostors(out, this.impostorManager);
    this.cameraAttachmentParent?.GetRenderables__Impostors(out, this.impostorManager);

    if (impostors)
    {
      impostors.EndUpdate();
      this.UpdateImpostors(renderContext);
    }

    for (const staticParticles of this.staticParticles)
    {
      staticParticles?.GetRenderables(this.updateContext.GetFrustum(), out);
    }
    return out;
  }

  /**
   * Refreshes the scene default's attribute snapshot, gathers every registered
   * PostProcessOwner's attributes, priority-blends them into the combined
   * post-process, copies the six engine effects through from the scene
   * default, and re-exports the result (Carbon
   * EveSpaceScene::UpdatePostProcessAttributes, EveSpaceScene.cpp:346-413).
   * Sort is descending by priority (cpp:372-377); Carbon's std::sort is
   * unstable while JS sort is stable - equal-priority ties keep registry
   * insertion order, which is blend-order-independent for every Sum-accumulated
   * attribute (the whole tie group is normalized together); only MaxWeight
   * ties at exactly equal weight (string paths / bools / DoF shape) could
   * differ from C++.
   *
   * Adapted: the debug payload is a plain object, null while the
   * enablePostProcessDebugging setting is off.
   */
  @blue.method
  @meta.adapted
  UpdatePostProcessAttributes()
  {
    if (!this.display)
    {
      return;
    }

    // Scene default refreshed BEFORE the gather (cpp:354); FromPostProcess
    // handles a null postprocess (reset + return).
    this._sceneDefaultPostProcessAttributes.FromPostProcess(
      this.postprocess, Tr2PostProcessAttributes.SCENE_DEFAULT_PRIORITY, 1.0);

    const sources = [];
    for (const owner of this.componentRegistry.GetComponents(EveComponentType.PostProcessOwner))
    {
      // Carbon cpp:360-363 consumes each owner's required attributes directly.
      sources.push(owner.GetPostProcessAttributes());
    }

    // Scene default appended LAST (cpp:363).
    sources.push(this._sceneDefaultPostProcessAttributes);

    // The list is never empty (default always pushed) so Carbon's else-branch
    // (cpp:411) is unreachable; the guard is kept for shape fidelity.
    if (sources.length)
    {
      this._combinedPostProcess ??= new Tr2PostProcess2();

      sources.sort((a, b) => b.priority - a.priority);

      if (EveSpaceScene.enablePostProcessDebugging)
      {
        const observer = Tr2PostProcessAttributes.CreateDebugObserver();
        Tr2PostProcessAttributes.MergeInto(this._combinedPostProcess, sources, observer);
        this.postProcessDebug = observer.GetDict();
      }
      else
      {
        Tr2PostProcessAttributes.MergeInto(this._combinedPostProcess, sources);
        this.postProcessDebug = null;
      }

      // Engine-effect copy-through from the scene default only - NOT blended
      // (cpp:389-406).
      if (this.postprocess)
      {
        this._combinedPostProcess.SetDynamicExposure(this.postprocess.GetDynamicExposureIfAvailable());
        this._combinedPostProcess.SetTaa(this.postprocess.GetTaaIfAvailable());
        this._combinedPostProcess.SetTonemapping(this.postprocess.GetTonemappingIfAvailable());
        this._combinedPostProcess.SetFog(this.postprocess.GetFogIfAvailable());
        this._combinedPostProcess.SetGodRays(this.postprocess.GetGodRaysIfAvailable());
        this._combinedPostProcess.SetGenericEffect(this.postprocess.GetGenericEffectIfAvailable());
      }
      else
      {
        this._combinedPostProcess.SetDynamicExposure(null);
        this._combinedPostProcess.SetTaa(null);
        this._combinedPostProcess.SetTonemapping(null);
        this._combinedPostProcess.SetFog(null);
        this._combinedPostProcess.SetGodRays(null);
        this._combinedPostProcess.SetGenericEffect(null);
      }

      // Re-export the combined result as an attributes object at
      // MEDIUM_PRIORITY - consumed by nested-scene composition (cpp:407).
      (this.combinedPostProcessAttributes ??= new Tr2PostProcessAttributes())
        .FromPostProcess(this._combinedPostProcess, Tr2PostProcessAttributes.MEDIUM_PRIORITY, 1.0);
    }
    else
    {
      this._combinedPostProcess = null;
    }
  }

  /** Carbon method GetPostProcess (EveSpaceScene.cpp:420-427): the combined
   * post-process, or null while the scene is not displayed. */
  @blue.method
  @meta.implemented
  GetPostProcess()
  {
    if (!this.display)
    {
      return null;
    }
    return this._combinedPostProcess;
  }

  /**
   * Blends every registered EveLightingOverride against the scene baseline and
   * stamps currentSunColor / currentNebulaIntensity /
   * currentReflectionIntensity - the lighting-override block of Carbon
   * EveSpaceScene::BeginRender (EveSpaceScene.cpp:1333-1363). The baseline is
   * appended AFTER the sort at raw priority -1 - one below
   * SCENE_DEFAULT_PRIORITY=0, outside the legal enum range (Carbon casts -1,
   * cpp:1343) - so it always sits last. Scalar/color math only - no matrix
   * compositions, no row-vector swaps anywhere in this method. Same
   * stable-sort note as UpdatePostProcessAttributes - here fully benign, the
   * blend is symmetric within a tie group. The velocity map's dirty flag is
   * cleared first, as Carbon's BeginRender clears it just before (cpp:1334).
   */
  BlendLightingOverrides()
  {
    if (!this.display)
    {
      return;
    }
    this._velocityMapDirty = false;

    const overrides = [];
    for (const component of this.componentRegistry.GetComponents(EveComponentType.EveLightingOverride))
    {
      overrides.push(component.GetOverrides());
    }
    overrides.sort((a, b) => b.priority - a.priority);

    // Baseline (cpp:1342-1357): the scene's own sun/nebula/reflection state,
    // sun color normalized by its max channel (all four components scaled).
    const sunColorSource = this.useSunDiffuseColorWithDynamicLights && EveSpaceScene.eveSpaceSceneDynamicLighting
      ? this.sunDiffuseColorWithDynamicLights
      : this.sunDiffuseColor;
    const sunIntensity = Math.max(sunColorSource[0], sunColorSource[1], sunColorSource[2]);
    const baselineSunColor = vec4.create();
    if (sunIntensity !== 0)
    {
      vec4.scale(baselineSunColor, sunColorSource, 1 / sunIntensity);
    }
    else
    {
      vec4.copy(baselineSunColor, sunColorSource);
    }
    overrides.push({
      priority: -1,
      intensity: 1,
      value: {
        sunColor: baselineSunColor,
        sunIntensity,
        backgroundIntensity: this.nebulaIntensity,
        reflectionIntensity: this.reflectionIntensity
      }
    });

    const over = EveSpaceScene._SimplePriorityBlend(overrides);
    vec4.scale(this.currentSunColor, over.sunColor, over.sunIntensity);
    this.currentNebulaIntensity = over.backgroundIntensity;
    this.currentReflectionIntensity = over.reflectionIntensity;
  }

  /**
   * Runs Carbon's portable froxel-fog blend against the scene-owned registry
   * and update context. The frame driver calls this immediately after lighting
   * overrides and before visibility/gather.
   *
   * Adapted: Carbon performs this inside BeginRender; CarbonEngineJS exposes the scene-owned
   * CPU phase because the engine driver owns the surrounding frame order.
   */
  UpdateFogSettings()
  {
    this.volumetricsRenderer.UpdateFogSettings(this.componentRegistry, this.updateContext);
  }

  /**
   * Gathers dynamic lights through the supplied manager, clearing previous lights
   * even when the registry contains no light owners.
   * Carbon BeginRender (EveSpaceScene.cpp:1406-1427).
   *
   * Adapted: Takes a manager explicitly and visits owners sequentially. A null
   * manager or hidden scene skips gathering. The update context supplies the
   * recording frame, render context, frustum and LOD factor.
   *
   * @param {Tr2LightManager|null} lightManager Manager receiving the lights.
   * @returns {void}
   */
  GatherLights(lightManager)
  {
    // Retain the manager for the per-frame pixel shader shadow-atlas settings.
    this._lightManager = lightManager ?? null;

    if (!lightManager || !this.display)
    {
      return;
    }

    lightManager.SetShadowQuality(this.shadowQualitySetting, this.updateContext.renderContext.GetRecordingFrameNumber());
    lightManager.Clear(this.updateContext.renderContext);
    lightManager.SetFrustum(this.updateContext.GetFrustum());
    lightManager.AdjustLightCutoff(this.updateContext.GetLodFactor());

    for (const owner of this.componentRegistry.GetComponents(EveComponentType.LightOwner))
    {
      owner.GetLights(lightManager);
    }

    lightManager.ResolveLightData();
  }

  /**
   * Carbon EveSpaceScene::UpdateShLighting (cpp:1685-1703): hands every
   * secondary-lighting receiver the scene's SH manager, so each one samples the
   * bounce light at its own position. A scene with no manager does nothing, as
   * Carbon does.
   *
   * Carbon runs this at the very END of the gather (cpp:1524, after
   * FinalizeBatches), and over a parallel range; the JS pass is sequential
   * because the receivers write only their own records and share no state.
   *
   * Adapted: Carbon's Tr2ParallelFor becomes a sequential pass; the receivers touch only
   * their own per-object records.
   *
   * @param {Array} objects - scene objects and the camera attachment parent
   * @returns {Number} how many receivers were updated
   */
  @blue.method
  @meta.adapted
  UpdateShLighting(objects = [])
  {
    if (!this._shLightingManager)
    {
      return 0;
    }

    let updated = 0;

    for (const object of objects)
    {
      const receiver = CjsSchema.cast(object, ITr2ShLightingReceiver);
      if (!receiver)
      {
        continue;
      }
      receiver.UpdateShLighting(this._shLightingManager, this.updateContext);
      updated++;
    }

    return updated;
  }

  /**
   * The scene's own per-frame vertex record (Carbon m_perFrameVS,
   * EveSpaceScene.h:300). Persistent, not arena-leased: it is rewritten each
   * frame and bound once, and the PS fill reads m_upscalingAmount back out of
   * the same pass.
   */
  _perFrameVS = RawData.create("EveSpaceScenePerFrameVSData");

  /** Carbon m_perFramePS (EveSpaceScene.h:240). */
  _perFramePS = RawData.create("EveSpaceScenePerFramePSData");

  /** The record PopulatePerFrameVSData fills. */
  GetPerFrameVSData()
  {
    return this._perFrameVS;
  }

  /** The record PopulatePerFramePSData fills. */
  GetPerFramePSData()
  {
    return this._perFramePS;
  }

  /**
   * Carbon RunLensflareOcclusionQueries (cpp:2782-2789): every lensflare's
   * foreground occlusion queries, then the occlusion buffer's per-frame
   * compute - unconditionally, as Carbon runs it with no lensflares too.
   *
   * @param {object} _depthMap The scene depth; unused by Carbon's body too.
   * @param {Tr2RenderContext} renderContext The frame's context.
   * @returns {void}
   */
  @blue.method
  @meta.implemented
  RunLensflareOcclusionQueries(_depthMap, renderContext)
  {
    for (const lensflare of this.lensflares) lensflare.RunOcclusionQueries(renderContext, this.updateContext);
    Tr2OcclusionBuffer.getInstance().ProcessBuffer(renderContext);
  }

  /** Native scene Render entry point is intentionally empty (EveSpaceScene.cpp:2950). */
  @blue.method
  @meta.implemented
  Render(_renderContext)
  {
  }

  /** Scene debugging requires the pending debug renderer and global flush port. */
  @blue.method
  @meta.notImplemented
  RenderDebugInfo(_renderContext)
  {
    if (!this.debugRenderer) return;
    throw new Error("EveSpaceScene.RenderDebugInfo requires the debug renderer BeginRender/EndRender and global flush port.");
  }

  /**
   * Updates only the notified scene property (EveSpaceScene.cpp:3279-3366).
   */
  @blue.method
  @meta.implemented
  OnModified(property, renderContext = Tr2RenderContext_GetMainThreadRenderContext())
  {
    if (IsMatch(property, "reflectionProbe") || IsMatch(property, "envMapResPath"))
    {
      this._staticEnvMapTextureRes = null;
      if (this._staticEnvMapHandle)
        this._staticEnvMapTextureRes = be.resMan.GetResource(this.envMapResPath, { requirement: ResourceRequirement.TEXTURE });
      if (this.reflectionProbe && this.reflectionProbe.IsValid(renderContext))
      {
        this._envMapTextureRes = this.reflectionProbe.GetReflection();
        this.reflectionProbe.SetBackLightColor(this.reflectionBackLightingColor);
        this.reflectionProbe.SetBackLightContrast(this.reflectionBackLightingContrast);
      }
      else if (this._envMapHandle) this._envMapTextureRes = this._staticEnvMapTextureRes;
    }
    for (const field of ["envMap1", "envMap2", "envMap3"])
    {
      if (!IsMatch(property, field + "ResPath")) continue;
      this[field] = null;
      if (this[field + "ResPath"])
        this[field] = be.resMan.GetResource(this[field + "ResPath"], { requirement: ResourceRequirement.TEXTURE });
    }
    if ((IsMatch(property, "reflectionBackLightingColor") || IsMatch(property, "reflectionBackLightingContrast"))
      && this.reflectionProbe && this.reflectionProbe.IsValid(renderContext))
    {
      if (IsMatch(property, "reflectionBackLightingColor")) this.reflectionProbe.SetBackLightColor(this.reflectionBackLightingColor);
      if (IsMatch(property, "reflectionBackLightingContrast")) this.reflectionProbe.SetBackLightContrast(this.reflectionBackLightingContrast);
    }
    if (IsMatch(property, "shadowQualitySetting") && this.cascadedShadowMap)
    {
      if (this.shadowQualitySetting === ShadowQuality.SHADOW_LOW) this.cascadedShadowMap.ShouldUseDenoiser(false);
      if (this.shadowQualitySetting === ShadowQuality.SHADOW_HIGH) this.cascadedShadowMap.ShouldUseDenoiser(true);
    }
    return true;
  }

  /**
   * Registers the bone provider before effect hydration (EveSpaceScene.cpp:257-258),
   * and registers with the device as Carbon's Tr2DeviceResource base does
   * (Tr2DeviceResource.cpp:6-9); Destroy unregisters.
   */
  constructor()
  {
    TriDevice.RegisterResource(this);

    // cpp:285.
    this._visualizerEffects[EveVisualizeMethod.VW_LIGHT_COUNT].type = VisualizerType.FULL_SCREEN_QUAD_OVERLAY;

    for (const list of [this.backgroundObjects, this.planets, this.objects, this.uiObjects]) list.SetNotify(this);
    const bones = Tr2RingBuffer.GetInstance("Float4x3", 48, Tr2RenderContext_GetMainThreadRenderContext());
    bones.SetName("BoneTransformsBuffer");
    Tr2VariableStore.globalStore().RegisterVariableInternal("BoneTransforms", TriVariableContentType.TRIVARIABLE_GPUBUFFER, bones);
  }

  // THE SCENE'S GLOBAL TEXTURES (EveSpaceScene.cpp:252-261). Carbon registers
  // each with a TYPED null - `(ITr2TextureProvider*)nullptr` - so the name is a
  // texture variable before anything fills it; a JS null has no type, so an
  // empty Tr2TextureReference stands for it (as the blitter's BlitSource).
  // Effects bind these by name when their materials map, so they exist from
  // construction.

  /** m_envMapHandle: "EveSpaceSceneEnvMap", the reflection (probe or nebula). */
  _envMapHandle = Tr2VariableStore.globalStore().RegisterVariableInternal("EveSpaceSceneEnvMap", TriVariableContentType.TRIVARIABLE_TEXTURE_RES, new Tr2TextureReference());

  /** m_staticEnvMapHandle: "EveSpaceSceneStaticEnvMap", the nebula itself. */
  _staticEnvMapHandle = Tr2VariableStore.globalStore().RegisterVariableInternal("EveSpaceSceneStaticEnvMap", TriVariableContentType.TRIVARIABLE_TEXTURE_RES, new Tr2TextureReference());

  /** "SSAOMap", registered empty (cpp:256); the driver fills it when SSAO runs. */
  _ssaoMapHandle = Tr2VariableStore.globalStore().RegisterVariableInternal("SSAOMap", TriVariableContentType.TRIVARIABLE_TEXTURE_RES, new Tr2TextureReference());

  /** m_envMap1Var / m_envMap2Var: "EnvMap1" and "EnvMap2" (cpp:188-189). */
  _envMap1Handle = Tr2VariableStore.globalStore().RegisterVariableInternal("EnvMap1", TriVariableContentType.TRIVARIABLE_TEXTURE_RES, new Tr2TextureReference());

  _envMap2Handle = Tr2VariableStore.globalStore().RegisterVariableInternal("EnvMap2", TriVariableContentType.TRIVARIABLE_TEXTURE_RES, new Tr2TextureReference());

  /** m_reflectionMapVar / m_reflectionMaskMapVar: the same two maps under "ReflectionMap" and "ReflectionMaskMap" (cpp:190-191). */
  _reflectionMapHandle = Tr2VariableStore.globalStore().RegisterVariableInternal("ReflectionMap", TriVariableContentType.TRIVARIABLE_TEXTURE_RES, new Tr2TextureReference());

  _reflectionMaskMapHandle = Tr2VariableStore.globalStore().RegisterVariableInternal("ReflectionMaskMap", TriVariableContentType.TRIVARIABLE_TEXTURE_RES, new Tr2TextureReference());

  /** m_nebulaIntensityVar: the float "NebulaIntensity" (cpp:202), which the background effect reads. */
  _nebulaIntensityHandle = Tr2VariableStore.globalStore().RegisterVariableInternal("NebulaIntensity", TriVariableContentType.TRIVARIABLE_FLOAT, 1);

  /**
   * m_velocityMapDirty (EveSpaceScene.h:476): whether the background pass has
   * already drawn into the velocity map this frame, so the main pass loads it
   * instead of clearing it. Cleared per frame by BlendLightingOverrides
   * (Carbon's BeginRender, cpp:1334). The driver reads it, because our main
   * pass runs there.
   */
  _velocityMapDirty = false;

  /** Scene parts the background pass does not draw yet, each warned once. */
  _warnedBackgroundParts = new Set();

  /**
   * Carbon's free function RegisterWithVariableStore (EveSpaceScene.cpp:4253-4266,
   * declared EveSpaceScene.h:725): publishes the shadow pass's four textures as
   * globals. Where a pass produced no screen-space shadow, a persistent white
   * 1x1 R8 "EmptyShadow" stands in, and a white R8_UINT "EmptyShadowUint" for
   * the point-light indices, so an unshadowed frame samples "fully lit"
   * rather than the backend's zero dummy. The two depth atlases go in as they
   * are, empty included.
   *
   * A texture variable holds a provider here, not a bare AL texture, so each
   * name is published through its own Tr2TextureReference, as the driver
   * publishes DepthMap.
   *
   * @param {object} shadowResources Carbon's EveSpaceScene::ShadowResources:
   *   `shadowMap`, `cascadedShadowDepth`, `pointLightShadowMap` and
   *   `pointLightShadowDepth`, each a GpuResourceHandle, empty when absent.
   * @param {Tr2GpuResourcePool} gpuResourcePool The driver's pool.
   * @returns {void}
   */
  @blue.method
  @meta.adapted
  static registerWithVariableStore(shadowResources, gpuResourcePool)
  {
    const store = Tr2VariableStore.globalStore();
    const references = EveSpaceScene._shadowReferences;

    const publish = (name, texture) =>
    {
      references[name].SetTexture(texture);
      store.RegisterVariableInternal(name, TriVariableContentType.TRIVARIABLE_TEXTURE_RES, references[name]);
    };

    const emptyShadow = (name, format, publication) =>
    {
      const handle = gpuResourcePool.GetPersistentTexture__WidthHeight(name, 1, 1, format, Tr2GpuUsage.SHADER_RESOURCE,
        [ new Tr2SubresourceData(new Uint8Array([ 255 ]), 1, 1) ]);
      try
      {
        publish(publication, handle.Get());
      }
      finally
      {
        gpuResourcePool.Free(handle);
      }
    };

    if (shadowResources.shadowMap.IsValid()) publish("EveSpaceSceneShadowMap", shadowResources.shadowMap.Get());
    else emptyShadow("EmptyShadow", PixelFormat.PIXEL_FORMAT_R8_UNORM, "EveSpaceSceneShadowMap");
    publish("EveSpaceSceneCascadedShadowMap", shadowResources.cascadedShadowDepth.Get());
    if (shadowResources.pointLightShadowMap.IsValid()) publish("EveSpaceSceneDynamicShadowMap", shadowResources.pointLightShadowMap.Get());
    else emptyShadow("EmptyShadowUint", PixelFormat.PIXEL_FORMAT_R8_UINT, "EveSpaceSceneDynamicShadowMap");
    publish("ShadowMapAtlas", shadowResources.pointLightShadowDepth.Get());
  }

  /** Device-owned final release of the static shadow publications. */
  static ReleaseStaticResources()
  {
    for (const reference of Object.values(EveSpaceScene._shadowReferences)) reference.SetTexture(null);
  }

  /** The providers registerWithVariableStore publishes through, one per name. */
  static _shadowReferences = {
    EveSpaceSceneShadowMap: new Tr2TextureReference(),
    EveSpaceSceneCascadedShadowMap: new Tr2TextureReference(),
    EveSpaceSceneDynamicShadowMap: new Tr2TextureReference(),
    ShadowMapAtlas: new Tr2TextureReference()
  };

  /** m_envMapTextureRes / m_staticEnvMapTextureRes, set by Initialize. */
  _envMapTextureRes = null;

  _staticEnvMapTextureRes = null;

  /**
   * Loads the nebula/reflection and registers initial scene objects (cpp:3207-3263).
   *
   * Adapted: the optional render context supports the probe validity query;
   * Carbon obtains its main-thread context internally. BoneTransforms is
   * already registered at construction, before any object effect can map it.
   *
   * @param {Tr2RenderContext} [renderContext] The frame's context.
   * @returns {boolean} True.
   */
  @blue.method
  @meta.adapted
  Initialize(renderContext = Tr2RenderContext_GetMainThreadRenderContext())
  {
    this._staticEnvMapTextureRes = this.envMapResPath
      ? be.resMan.GetResource(this.envMapResPath, { requirement: ResourceRequirement.TEXTURE })
      : null;

    if (this.reflectionProbe && this.reflectionProbe.IsValid(renderContext))
    {
      this._envMapTextureRes = this.reflectionProbe.GetReflection();
      this.reflectionProbe.SetBackLightColor(this.reflectionBackLightingColor);
      this.reflectionProbe.SetBackLightContrast(this.reflectionBackLightingContrast);
    }
    else
    {
      this._envMapTextureRes = this._staticEnvMapTextureRes;
    }

    // cpp:3228-3239: the scene's extra environment maps.
    if (this.envMap1ResPath)
    {
      this.envMap1 = be.resMan.GetResource(this.envMap1ResPath, { requirement: ResourceRequirement.TEXTURE });
    }
    if (this.envMap2ResPath)
    {
      this.envMap2 = be.resMan.GetResource(this.envMap2ResPath, { requirement: ResourceRequirement.TEXTURE });
    }
    if (this.envMap3ResPath)
    {
      this.envMap3 = be.resMan.GetResource(this.envMap3ResPath, { requirement: ResourceRequirement.TEXTURE });
    }

    // cpp:3252-3257: a reader stored the persisted manager without its
    // setter, so it is cleared and set again to register the light sources.
    if (this._shLightingManager)
    {
      const manager = this._shLightingManager;
      this._shLightingManager = null;
      this.SetShLightingManager(manager);
    }

    // cpp:3247-3263: every object entity joins the scene's component registry
    // - its light owners, post-process owners, shadow casters - and so does
    // the camera attachment parent. Without it GatherLights finds no owners
    // and no attachment light reaches a shader. Each also registers its quad
    // effects (sprite and spotlight sets), and so do the UI objects. The
    // list-insert registration (OnListChanged, cpp:3455-3470) has no array
    // event to hang on: objects pushed after Initialize join through
    // ReregisterEntities, which does both registrations.
    // Carbon's BlueCastPtr<EveEntity> is CjsSchema.cast.
    const quadRenderer = Tr2QuadRenderer.Instance();
    for (const object of this.objects)
    {
      CjsSchema.cast(object, EveEntity)?.Register(this.componentRegistry);
      object?.RegisterWithQuadRenderer(quadRenderer);
    }
    CjsSchema.cast(this.cameraAttachmentParent, EveEntity)?.Register(this.componentRegistry);
    this.cameraAttachmentParent?.RegisterWithQuadRenderer(quadRenderer);
    for (const object of this.uiObjects) object?.RegisterWithQuadRenderer(quadRenderer);

    return true;
  }

  /**
   * Carbon UpdateVariableStore's environment-map half (cpp:2984-2993): the
   * nebula and the reflection go through the global store each frame.
   *
   * @returns {void}
   */
  @blue.method
  @meta.adapted
  UpdateVariableStore()
  {
    // Ours: every ship samples these through the global store, and nothing
    // else holding them renews them, so the scene that publishes them does,
    // once a frame (CjsResource.KeepAlive). A provider that is not a cached
    // resource holds nothing to renew.
    for (const provider of [ this.envMap1, this.envMap2, this.envMap3, this._staticEnvMapTextureRes, this._envMapTextureRes ])
    {
      const resource = CjsSchema.cast(provider, CjsResource);
      if (resource) resource.KeepAlive();
    }
    this._envMap1Handle.SetValue(this.envMap1);
    this._envMap2Handle.SetValue(this.envMap2);
    this._reflectionMapHandle.SetValue(this.envMap1);
    this._reflectionMaskMapHandle.SetValue(this.envMap2);
    this._nebulaIntensityHandle.SetValue(this.currentNebulaIntensity);
    this._staticEnvMapHandle.SetValue(this._staticEnvMapTextureRes);
    this._envMapHandle.SetValue(this._envMapTextureRes);
  }

  /** The Tr2LightManager GatherLights last ran with; see _EngineFrameState. */
  _lightManager = null;

  /**
   * The engine state Carbon's per-frame fills read from Tr2Renderer statics
   * and the effect state manager (EveSpaceScene.cpp:3018-3205): render-target
   * size and device viewport (3045-3046, 3060), animation time (3066, 3118),
   * frame counter (3121), gamma (3099), the non-reversed projection and
   * aspect ratio for FovXY (3049-3050; s_aspectRatio is _22/_11,
   * Tr2Renderer.cpp:80), the scene post process's mip bias (3161-3164) and
   * the light manager's shadow atlas (3126-3137).
   *
   * The fills keep a `frame` argument whose fields OVERRIDE these, for
   * callers that drive a frame without a live device; with none passed, every
   * value is the engine's, as Carbon's is. Until 2026-09-26 the driver passed
   * nothing and every field fell to zero: Time and FrameIndex frozen,
   * GammaBrightness 0, FovXY and TargetResolution 0.
   *
   * @param {Tr2RenderContext} renderContext The frame's context.
   * @returns {object} The frame fields.
   */
  _EngineFrameState(renderContext)
  {
    const esm = renderContext.GetEffectStateManager();
    const projection = renderContext.GetProjection();
    const atlas = this._lightManager ? this._lightManager.GetShadowMapAtlasSettings() : null;

    return {
      renderTargetWidth: esm.renderTargetWidth,
      renderTargetHeight: esm.renderTargetHeight,
      deviceViewport: esm.GetDeviceViewport(),
      animationTime: Tr2Renderer.GetAnimationTime(),
      frameIndex: Number(Tr2Renderer.GetCurrentFrameCounter()) >>> 0,
      gammaBrightness: EveSpaceScene.eveSpaceSceneGammaBrightness,
      projectionTransform: projection,
      aspectRatio: projection && projection[0] ? projection[5] / projection[0] : 1,
      sceneMipLodBias: this.postprocess ? this.postprocess.GetMipLodBias() : 0,
      inverseShadowMapAtlasSize: atlas && atlas.actualTextureSize > 0 ? 1 / atlas.actualTextureSize : 0,
      shadowMapAtlasEntryMinSizeLog2: atlas ? atlas.entryMinSizeLog2 : 0
    };
  }

  /** m_perFrameVSBuffer (EveSpaceScene.h:536), by value: invalid until FillAndSetConstants sizes it (cpp:833). */
  _perFrameVSBuffer = new Tr2ConstantBufferAL();

  /** m_perFramePSBuffer (h:537), by value; filled at cpp:834. */
  _perFramePSBuffer = new Tr2ConstantBufferAL();

  /**
   * Carbon EveSpaceScene::Jitter (cpp:1253-1291), called from BeginRender
   * (cpp:1329): the frame's sub-pixel projection offset for TAA.
   *
   * With TAA on the scene's default post process, a FIXED 4-SAMPLE PATTERN
   * (not Halton) indexed by the recording frame number, scaled to clip space
   * by the bound target's size; otherwise identity. Carbon's
   * `m_projection * m_jitterMatrix` is row-vector, so gl-matrix multiplies the
   * other way round: the offset is applied after the projection.
   *
   * Adapted: Carbon's first branch takes a temporal upscaler's jitter
   * (cpp:1257-1264). No upscaler is ported, so it is absent.
   *
   * @param {Tr2RenderContext} renderContext The frame's context.
   * @returns {void}
   */
  @blue.method
  @meta.adapted
  Jitter(renderContext)
  {
    mat4.copy(this.projection, renderContext.GetProjection());

    if (this.postprocess && this.postprocess.GetTaaIfAvailable() !== null)
    {
      const esm = renderContext.GetEffectStateManager();
      const sample = JITTER_SAMPLING_PATTERNS[renderContext.GetRecordingFrameNumber() % JITTER_SAMPLING_PATTERNS.length];

      this.jitter[0] = Math.fround(2 * sample[0] / esm.renderTargetWidth);
      this.jitter[1] = Math.fround(2 * sample[1] / esm.renderTargetHeight);
      mat4.fromTranslation(this.jitterMatrix, [ this.jitter[0], this.jitter[1], 0 ]);
      mat4.multiply(this.jitteredProjection, this.jitterMatrix, this.projection);
      return;
    }

    mat4.identity(this.jitterMatrix);
    mat4.copy(this.jitteredProjection, this.projection);
    this.jitter[0] = 0;
    this.jitter[1] = 0;
  }

  /**
   * Carbon's EveSpaceScene::EndRender, two parts of it:
   * - the quad renderer's DoneRendering (cpp:2806), which fences the ring
   *   region this frame's quads were uploaded into;
   * - the lens flares (cpp:2839-2859): each flare's renderables drawn
   *   additively into the scene target, with depth read-only, after the main
   *   pass - so after TAA's opaque copy, which excludes them as Carbon's does;
   * - the last-frame store (cpp:2866-2868): this frame's view, and its
   *   UNJITTERED projection, become next frame's viewLast and projectionLast,
   *   which the per-frame vertex block hands the velocity shaders;
   * - the instanced mesh manager's ReportUsedScreenSizes (cpp:2896).
   *
   * Adapted: the rest of Carbon's EndRender (the secondary transparent and
   * additive gathers, batch clearing, the variable store) belongs to passes
   * this runtime's driver does not run yet.
   *
   * @param {Tr2RenderContext} renderContext The frame's context.
   * @returns {void}
   */
  @blue.method
  @meta.adapted
  EndRender(renderContext)
  {
    if (!this.display) return;

    Tr2QuadRenderer.Instance().DoneRendering(renderContext);

    // Carbon begins a span here with no End in EndRender (cpp:2819-2820); the
    // next frame's BeginRender begins the next one.
    renderContext.GetEffectStateManager().BeginManagedRendering();
    renderContext.GetEffectStateManager().ApplyStandardStates(RenderingMode.RM_OPAQUE);

    if (this.lensflares.length)
    {
      const visible = [];

      for (const lensflare of this.lensflares) lensflare.GetRenderables(this.updateContext.GetFrustum(), visible);

      if (visible.length)
      {
        renderContext.SetReadOnlyDepth(true);
        this.RenderRenderables(visible, this._secondaryAdditiveBatches, TriBatchType.TRIBATCHTYPE_ADDITIVE, RenderingMode.RM_ALPHA_ADDITIVE, renderContext);
        renderContext.SetReadOnlyDepth(false);
      }
    }

    mat4.copy(this.viewLast, renderContext.GetViewTransform());
    mat4.copy(this.projectionLast, this.projection);

    // An overlay visualizer draws over the finished frame (cpp:2883-2886).
    const visualizerEffect = this._visualizerEffects[this.visualizeMethod];
    if (visualizerEffect.type === VisualizerType.FULL_SCREEN_QUAD_OVERLAY)
    {
      Tr2Renderer.DrawTexture__EffectTexCoords(renderContext, visualizerEffect.effect, OVERLAY_TL, OVERLAY_BR);
    }

    // The instanced meshes' screen sizes, last (cpp:2896).
    this.instancedMeshManager.ReportUsedScreenSizes();
  }

  /**
   * Carbon UpdateQuadRenderer (cpp:1715-1733): every object adds its quads for
   * the frame, then the renderer merges and uploads them. Carbon runs the adds
   * in parallel; here they run in order.
   *
   * @param {object} frustum The frame's frustum.
   * @param {Array<object>} objects The objects to add quads from.
   * @param {Tr2RenderContext} renderContext The frame's context.
   * @returns {void}
   */
  @blue.method
  @meta.implemented
  UpdateQuadRenderer(frustum, objects, renderContext)
  {
    const quadRenderer = Tr2QuadRenderer.Instance();

    for (const object of objects) object?.AddQuadsToQuadRenderer(frustum, quadRenderer);

    quadRenderer.BeginRendering(renderContext);
  }

  /** Carbon GetQuadRenderer (cpp:1765-1768): the shared quad renderer. */
  @meta.implemented
  GetQuadRenderer()
  {
    return Tr2QuadRenderer.Instance();
  }

  /**
   * Carbon GetCameraAttachments (protected, EveSpaceScene.cpp:304-307): the
   * camera attachment parent's effect-child list, as the list's own root.
   *
   * @returns {Array} The camera attachment parent's effect children.
   */
  @meta.implemented
  _GetCameraAttachments()
  {
    return this.cameraAttachmentParent.GetChildren();
  }

  /** m_secondaryBatches[TRIBATCHTYPE_ADDITIVE]: the accumulator EndRender's
   * lens flares are gathered into (effect-sorted, as every non-transparent
   * batch type is). */
  _secondaryAdditiveBatches = new TriRenderBatchAccumulator(EffectKeyGenerator);

  /**
   * Carbon EveSpaceScene::RenderRenderables (cpp:1065-1085): each renderable's
   * per-object data and batches into the accumulator, then RenderBatch. No
   * pool allocator, no draw, as in Carbon.
   *
   * @param {Array} renderables The renderables to draw.
   * @param {object} batch The accumulator to gather into.
   * @param {number} batchType The TriBatchType to gather.
   * @param {number} rm The RenderingMode to draw with.
   * @param {Tr2RenderContext} renderContext The frame's context.
   * @param {number} [reason] The render reason.
   * @returns {void}
   */
  @blue.method
  @meta.implemented
  RenderRenderables(renderables, batch, batchType, rm, renderContext, reason = undefined)
  {
    const allocator = renderContext.GetTriPoolAllocator();

    if (!allocator) return;

    batch.SetTriPoolAllocator(allocator);

    for (const renderable of renderables)
    {
      const objectData = renderable.GetPerObjectData(batch);
      renderable.GetBatches(batch, batchType, objectData, reason);
    }

    this.RenderBatch(batch, rm, renderContext);
  }

  /**
   * Carbon EveSpaceScene::RenderBatch (cpp:1101-1121): finalize, apply the
   * rendering mode's standard states, draw through the current visualizer -
   * its effect replacing every material, or the ordinary materials under an
   * overlay - and clear. VM_NONE has no effect, so its replacement draw is the
   * ordinary one.
   *
   * @param {object} batch The accumulator to draw.
   * @param {number} rm The RenderingMode.
   * @param {Tr2RenderContext} renderContext The frame's context.
   * @returns {void}
   */
  @blue.method
  @meta.implemented
  RenderBatch(batch, rm, renderContext)
  {
    const visualizerEffect = this._visualizerEffects[this.visualizeMethod];

    batch.Finalize();
    renderContext.GetEffectStateManager().ApplyStandardStates(rm);
    switch (visualizerEffect.type)
    {
      case VisualizerType.PIXEL_SHADER_REPLACEMENT:
        renderContext.RenderBatchesWithOverride(batch, visualizerEffect.effect);
        break;
      case VisualizerType.FULL_SCREEN_QUAD_OVERLAY:
        renderContext.RenderBatches(batch);
        break;
      default:
        break;
    }
    batch.Clear();
  }

  /**
   * Carbon EveSpaceScene::RenderBackgroundPass (cpp:2005-2073): the nebula and
   * the rest of the background, drawn before the depth pass into the bound
   * scene colour. With a velocity map, it is bound in slot 1 and cleared (or
   * loaded, if already written this frame), and the pass marks it dirty for
   * the main pass.
   *
   * Adapted: the renderer is an added argument, as for RenderShadows, because
   * DrawCameraSpaceScreenQuad is an instance method here where Carbon's is a
   * static. Carbon clears the velocity map with an explicit Clear after its
   * pass hint; here the hint's CLEAR does it, as in our main pass. Planet LOD and visibility preserve Carbon's order (cpp:2023-2048).
   *
   * @param {object|null} depthMap The scene depth.
   * @param {object|null} distortionMap The distortion map, if distortion is on.
   * @param {object|null} velocityMap The velocity map, if one is rendered.
   * @param {Tr2RenderContext} renderContext The frame's context.
   * @param {Tr2Renderer} renderer The renderer that draws screen quads.
   * @returns {boolean} Whether any background distortion batches were drawn.
   */
  @blue.method
  @meta.adapted
  RenderBackgroundPass(depthMap, distortionMap, velocityMap, renderContext, renderer)
  {
    let hasBackgroundDistortionBatches = false;

    if (!this.backgroundRenderingEnabled)
    {
      return hasBackgroundDistortionBatches;
    }
    if (!this.display)
    {
      return hasBackgroundDistortionBatches;
    }

    // Carbon cpp:2023-2048: LOD uses the previous estimate, then visibility
    // records the next one. Only the view and child frustum change here.
    if (this.planets.length)
    {
      renderContext.PushViewTransform();
      // Carbon: auto normalFrustum = m_updateContext.GetFrustum() copies (cpp:1830).
      const normalFrustum = new TriFrustum().Copy(this.updateContext.GetFrustum());
      const planetView = mat4.alloc();
      const planetProjection = mat4.alloc();
      try
      {
        this.CreatePlanetViewMatrix(renderContext.GetViewTransform(), planetView);
        renderContext.SetViewTransform(planetView);
        EveCamera.ModifyClipPlanes(renderContext.GetProjection(), 0.01, 1e5, planetProjection);
        this._planetFrustum.DeriveFrustum(planetView, renderContext.GetViewPosition(), planetProjection, renderContext.GetViewport());
        this.updateContext.SetFrustum(this._planetFrustum);
        for (const planet of this.planets)
        {
          planet.SetRenderScale(this.planetScale);
          planet.UpdateLOD();
        }
        for (const planet of this.planets) planet.UpdatePlanetVisibility(this.updateContext, this.planetScale);
      }
      finally
      {
        this.updateContext.SetFrustum(normalFrustum);
        renderContext.PopViewTransform();
        mat4.unalloc(planetProjection);
        mat4.unalloc(planetView);
      }
    }

    const esm = renderContext.GetEffectStateManager();
    if (velocityMap)
    {
      esm.PushRenderTarget__TextureAL(velocityMap, 1);
      try
      {
        renderContext.RenderPassHint(
          new Tr2ColorAttachment(Tr2LoadAction.LOAD, Tr2StoreAction.STORE),
          new Tr2ColorAttachment(this._velocityMapDirty ? Tr2LoadAction.LOAD : Tr2LoadAction.CLEAR, Tr2StoreAction.STORE, 0),
          new Tr2DepthAttachment(Tr2LoadAction.LOAD, Tr2StoreAction.STORE)
        );
        hasBackgroundDistortionBatches = this.RenderBackgroundPassObjects(depthMap, distortionMap, renderContext, renderer, EveSpaceScene.BackgroundRenderingReason.BACKGROUND_RENDER_COLOR);
        this._velocityMapDirty = true;
      }
      finally
      {
        esm.PopRenderTarget(1);
      }
    }
    else
    {
      renderContext.RenderPassHint(
        new Tr2ColorAttachment(Tr2LoadAction.LOAD, Tr2StoreAction.STORE),
        new Tr2DepthAttachment(Tr2LoadAction.LOAD, Tr2StoreAction.STORE)
      );
      hasBackgroundDistortionBatches = this.RenderBackgroundPassObjects(depthMap, distortionMap, renderContext, renderer, EveSpaceScene.BackgroundRenderingReason.BACKGROUND_RENDER_COLOR);
    }

    if (this.planets.length) renderContext.Clear({ clearDepth: true, depth: 0 });
    esm.EndManagedRendering();
    return hasBackgroundDistortionBatches;
  }

  /**
   * Carbon EveSpaceScene::UpdateImpostors (cpp:1578-1684): renders each queued
   * impostor into its atlas tile. DepthMap points at the atlas item's depth
   * buffer; each object is captured from ten bounding radii out along the line
   * from the camera, with a perspective that just fits its sphere, then its
   * opaque, transparent and additive batches are drawn.
   *
   * Adapted: the batches go through the scene's secondary accumulators (the
   * driver owns the primary gather here), cleared after each object; Carbon
   * locks the saved DepthMap provider while it is swapped out, which a JS
   * reference does not need.
   *
   * @param {Tr2RenderContext} renderContext The frame's context.
   * @returns {void}
   */
  @blue.method
  @meta.adapted
  UpdateImpostors(renderContext)
  {
    const manager = this.impostorManager;
    if (!manager || manager.GetRenderQueueLength() === 0) return;

    const esm = renderContext.GetEffectStateManager();
    renderContext.PushViewTransform();
    renderContext.PushProjection();
    esm.PushViewport();
    try
    {
      manager.BeginUpdateAtlas(renderContext);
      try
      {
        const depthMapVar = Tr2VariableStore.globalStore().GetVariable("DepthMap");
        const swapDepthMap = depthMapVar.GetType() === TriVariableContentType.TRIVARIABLE_TEXTURE_RES;
        const savedDepthMap = swapDepthMap ? depthMapVar.GetValue() : null;
        if (swapDepthMap) depthMapVar.SetValue(manager.GetItemDepthStencil());
        try
        {
          this.UpdateVariableStore();
          this._CaptureImpostors(manager, renderContext);
        }
        finally
        {
          if (swapDepthMap) depthMapVar.SetValue(savedDepthMap);
          this.UpdateVariableStore();
        }
      }
      finally
      {
        manager.EndUpdateAtlas(renderContext);
      }
    }
    finally
    {
      esm.PopViewport();
      renderContext.PopProjection();
      renderContext.PopViewTransform();
    }
  }

  /** The per-impostor loop of Carbon UpdateImpostors (cpp:1636-1683). */
  _CaptureImpostors(manager, renderContext)
  {
    const esm = renderContext.GetEffectStateManager();
    const scratch = EveSpaceScene._impostorScratch;
    const inverseView = renderContext.GetInverseViewTransform();
    const eye = vec3.set(scratch.eye, inverseView[12], inverseView[13], inverseView[14]);
    const up = vec3.set(scratch.up, inverseView[4], inverseView[5], inverseView[6]);
    const batches = this._secondaryBatches;
    const fakeViewport = { x: 0, y: 0, width: 128, height: 128 };

    for (let index = 0; index < manager.GetRenderQueueLength(); index++)
    {
      const object = manager.BeginImpostorUpdate(index, renderContext);
      const sphere = vec4.set(scratch.sphere, 0, 0, 0, 1);
      object.GetImpostorBoundingSphere(sphere);
      const radius = sphere[3];
      const position = vec3.set(scratch.position, sphere[0], sphere[1], sphere[2]);
      const viewDir = vec3.normalize(scratch.viewDir, vec3.subtract(scratch.viewDir, eye, position));
      const distance = radius * 10;
      const eyePosition = vec3.scaleAndAdd(scratch.eyePosition, position, viewDir, distance);

      // XMMatrixLookToLH( eyePosition, viewDir, up ) is lookAtD3D toward eyePosition + viewDir.
      mat4.lookAtD3D(scratch.view, eyePosition, vec3.add(scratch.target, eyePosition, viewDir), up);
      mat4.perspectiveRHD3D(scratch.projection, radius * 2, radius * 2, distance - radius, distance + radius);
      renderContext.SetViewTransform(scratch.view);
      renderContext.SetProjection(scratch.projection);

      const frustum = new TriFrustum();
      frustum.DeriveFrustum(renderContext.GetViewTransform(), renderContext.GetViewPosition(), renderContext.GetProjection(), fakeViewport);

      this.PopulatePerFramePSData(this._perFramePS, renderContext);
      this.PopulatePerFrameVSData(this._perFrameVS, renderContext);
      const fogFactors = Array.from(this._perFrameVS.Get("FogFactors"));
      fogFactors[2] = 0;
      this._perFrameVS.Set("FogFactors", fogFactors);
      this.ApplyPerFrameData(renderContext);

      object.GetImpostorBatches(frustum, batches);
      this.FinalizeBatches(batches);

      esm.ApplyStandardStates(RenderingMode.RM_OPAQUE);
      renderContext.RenderBatches(batches.get(TriBatchType.TRIBATCHTYPE_OPAQUE));
      renderContext.SetReadOnlyDepth(true);
      esm.ApplyStandardStates(RenderingMode.RM_ALPHA);
      renderContext.RenderBatches(batches.get(TriBatchType.TRIBATCHTYPE_TRANSPARENT));
      esm.ApplyStandardStates(RenderingMode.RM_ALPHA_ADDITIVE);
      renderContext.RenderBatches(batches.get(TriBatchType.TRIBATCHTYPE_ADDITIVE));
      renderContext.SetReadOnlyDepth(false);

      this.ClearBatches(batches);
      manager.EndImpostorUpdate(index, renderContext);
    }
  }

  static _impostorScratch = {
    eye: vec3.create(), up: vec3.create(), sphere: vec4.create(), position: vec3.create(), viewDir: vec3.create(),
    eyePosition: vec3.create(), target: vec3.create(), view: mat4.create(), projection: mat4.create()
  };

  /** Carbon HasReflectionProbe (cpp:4106-4109). */
  @blue.method
  @meta.implemented
  HasReflectionProbe()
  {
    return !!this.reflectionProbe && this.reflectionProbe.IsValid();
  }

  /** Carbon EnableShadowsInReflections (cpp:4154-4168): a 512 cascaded map for reflections, or none. */
  @meta.implemented
  EnableShadowsInReflections(enable)
  {
    if (enable)
    {
      if (!this._reflectionShadowMap)
      {
        this._reflectionShadowMap = new Tr2ShadowMap();
        this._reflectionShadowMap.Setup(512, CjsPerFrameLayouts.SHADOW_FRUSTUM_COUNT, false);
      }
    }
    else
    {
      this._reflectionShadowMap = null;
    }
  }

  /** Carbon IsShadowsInReflectionsEnabled (cpp:4170-4173). */
  @meta.implemented
  IsShadowsInReflectionsEnabled()
  {
    return this._reflectionShadowMap !== null;
  }

  /**
   * Carbon EveSpaceScene::RenderReflectionPass (cpp:1770-2008): renders the scene
   * into the reflection probe's cube faces. The volumetrics renderer is told it
   * is drawing a probe; reflection intensity is lowered so reflections of
   * reflections do not brighten; DepthMap points at each face's depth buffer;
   * jitter is off. Each face draws the background (planets culled against a
   * planet-scale frustum), ULTRA lens flares, then the visible dynamic objects
   * with depth, optional reflection shadows, fog and transparency.
   *
   * Adapted:
   * - `renderer` is passed in, as RenderBackgroundPassObjects and
   *   SetupCascadedShadows take it here.
   * - Raytraced shadows are unported, so the RAYTRACED quality
   *   draws no reflection shadows (Carbon's m_rtManager is absent).
   * - Carbon locks the saved DepthMap provider while it is swapped out; a JS
   *   reference needs no lock.
   *
   * @param {Tr2GpuResourcePool} gpuResourcePool The driver's pool.
   * @param {Tr2RenderContext} renderContext The frame's context.
   * @param {Tr2Renderer} renderer The renderer that draws screen quads.
   * @returns {void}
   */
  @blue.method
  @meta.adapted
  RenderReflectionPass(gpuResourcePool, renderContext, renderer)
  {
    if (!this.HasReflectionProbe() || !this.display) return;

    const probe = this.reflectionProbe;
    const esm = renderContext.GetEffectStateManager();
    const volumetrics = this.volumetricsRenderer;
    volumetrics.SetIsReflectionProbe(true);
    try
    {
      const savedIntensity = this.currentReflectionIntensity;
      if (this.currentReflectionIntensity !== 0)
      {
        this.currentReflectionIntensity = Math.min(0.8, 1 / (this.currentReflectionIntensity * this.currentReflectionIntensity));
      }

      // Override DepthMap with each face's depth buffer (cpp:1797-1820).
      const depthMapVar = Tr2VariableStore.globalStore().GetVariable("DepthMap");
      const swapDepthMap = depthMapVar.GetType() === TriVariableContentType.TRIVARIABLE_TEXTURE_RES;
      const savedDepthMap = swapDepthMap ? depthMapVar.GetValue() : null;
      if (swapDepthMap) depthMapVar.SetValue(this._reflectionFaceDepth);

      mat4.copy(this._reflectionProjection, this.projection);
      mat4.copy(this._reflectionJitter, this.jitterMatrix);
      mat4.identity(this.jitterMatrix);
      // Carbon: auto normalFrustum = m_updateContext.GetFrustum() copies (cpp:2042).
      const normalFrustum = new TriFrustum().Copy(this.updateContext.GetFrustum());
      try
      {
        probe.InitRenderPass(renderContext);
        mat4.copy(this.projection, renderContext.GetProjection());

        for (let face = probe.GetStartFace(); face < probe.GetEndFace(); face += 1)
        {
          probe.StartRenderFace(face, renderContext);

          this.PopulatePerFramePSData(this._perFramePS, renderContext);
          this.PopulatePerFrameVSData(this._perFrameVS, renderContext);
          this.ApplyPerFrameData(renderContext);
          this._reflectionFaceDepth.SetTexture(probe.GetDepthBuffer(face));

          // Planets are culled against a planet-scale frustum (cpp:1847-1866).
          const view = mat4.copy(this._reflectionView, renderContext.GetViewTransform());
          renderContext.SetViewTransform(this.CreatePlanetViewMatrix(view, this._reflectionPlanetView));
          const planetProjection = EveCamera.ModifyClipPlanes(renderContext.GetProjection(), 0.01, 1e5, this._reflectionPlanetProjection);
          const planetFrustum = new TriFrustum();
          planetFrustum.DeriveFrustum(renderContext.GetViewTransform(), renderContext.GetViewPosition(), planetProjection, esm.GetViewport());
          this.updateContext.SetFrustum(planetFrustum);
          for (const planet of this.planets) planet.UpdatePlanetVisibility(this.updateContext, this.planetScale);
          renderContext.SetViewTransform(view);

          const currentFrustum = probe.GetFrustum(face, renderContext);
          this.updateContext.SetFrustum(currentFrustum);
          this.RenderBackgroundPassObjects(null, null, renderContext, renderer, EveSpaceScene.BackgroundRenderingReason.BACKGROUND_RENDER_REFLECTION);

          if (EveSpaceScene.lensflaresInReflections && this.lensflares.length
            && EntityComponents.getReflectionSetting() === ReflectionSetting.REFLECTION_SETTING_ULTRA)
          {
            const visible = [];
            for (const lensflare of this.lensflares) lensflare.GetRenderables(currentFrustum, visible);
            if (visible.length)
            {
              renderContext.SetReadOnlyDepth(true);
              this.RenderRenderables(visible, this._secondaryBatches.get(TriBatchType.TRIBATCHTYPE_ADDITIVE), TriBatchType.TRIBATCHTYPE_ADDITIVE,
                RenderingMode.RM_ALPHA_ADDITIVE, renderContext, Tr2RenderReason.TR2RENDERREASON_REFLECTION);
              renderContext.SetReadOnlyDepth(false);
            }
          }

          if (this.dynamicObjectReflectionEnabled && probe.ReadyForDynamicObjectReflections())
          {
            this._RenderReflectionDynamicObjects(face, currentFrustum, gpuResourcePool, renderContext, renderer);
          }
        }

        probe.EndRenderPass(renderContext);
        this.updateContext.SetFrustum(normalFrustum);
        this.currentReflectionIntensity = savedIntensity;
      }
      finally
      {
        if (swapDepthMap) depthMapVar.SetValue(savedDepthMap);
        this.UpdateVariableStore();
        mat4.copy(this.projection, this._reflectionProjection);
        mat4.copy(this.jitterMatrix, this._reflectionJitter);
      }
    }
    finally
    {
      volumetrics.SetIsReflectionProbe(false);
    }

    this.PopulatePerFramePSData(this._perFramePS, renderContext);
    this.PopulatePerFrameVSData(this._perFrameVS, renderContext);
    this.ApplyPerFrameData(renderContext);
  }

  /**
   * The dynamic-object block of Carbon's RenderReflectionPass (cpp:1897-1992):
   * the visible ITr2Renderables, depth first, optional reflection shadows, then
   * opaque, fog and transparent batches with culling left as the cube needs it.
   */
  _RenderReflectionDynamicObjects(face, currentFrustum, gpuResourcePool, renderContext, renderer)
  {
    const visibleRenderables = [];
    for (const renderable of this.componentRegistry.GetComponents(EveComponentType.ReflectionRenderable))
    {
      if (renderable.IsVisible(this.updateContext)) visibleRenderables.push(renderable);
    }

    const hasFog = !!this.volumetricsRenderer && this.volumetricsRenderer.HasFog();
    const batches = this._secondaryBatches;
    this.ClearBatches(batches);

    // Carbon cpp:1915-1925: the shared instanced meshes, into the secondary
    // batches. Carbon quirk, reproduced: no reason is passed, so the
    // manager's default TR2RENDERREASON_NORMAL drops the RENDER_IN_REFLECTION
    // filter and every instanced mesh reflects (CE-183).
    const hasInstancedBatches = this.instancedMeshManager.GetBatches(
      this.updateContext.GetFrustum(),
      this.updateContext.GetInvLodFactor(),
      [
        [ TriBatchType.TRIBATCHTYPE_OPAQUE, batches.get(TriBatchType.TRIBATCHTYPE_OPAQUE) ],
        [ TriBatchType.TRIBATCHTYPE_DECAL, batches.get(TriBatchType.TRIBATCHTYPE_DECAL) ],
        [ TriBatchType.TRIBATCHTYPE_ADDITIVE, batches.get(TriBatchType.TRIBATCHTYPE_ADDITIVE) ],
        [ TriBatchType.TRIBATCHTYPE_DEPTH, batches.get(TriBatchType.TRIBATCHTYPE_DEPTH) ]
      ]) > 0;

    this.instancedMeshManager.ReportUsedScreenSizes();

    if (!hasFog && !visibleRenderables.length && !hasInstancedBatches) return;

    const esm = renderContext.GetEffectStateManager();
    renderContext.Clear({ clearDepth: true, depth: 0 });
    // Left-handed cube targets: leave the cull mode alone.
    esm.BeginManagedRendering(CullMode.CULLMODE_NONE);

    const transparentObjects = [];
    this.GetAllBatchesFromRenderables(visibleRenderables, transparentObjects, false, batches, renderContext, Tr2RenderReason.TR2RENDERREASON_REFLECTION);
    this.PrepareTransparentBatch(transparentObjects, batches, Tr2RenderReason.TR2RENDERREASON_REFLECTION);
    this.FinalizeBatches(batches);

    esm.ApplyStandardStates(RenderingMode.RM_DEPTH_ONLY);
    renderContext.RenderBatches(batches.get(TriBatchType.TRIBATCHTYPE_OPAQUE), "Depth");
    renderContext.RenderBatches(batches.get(TriBatchType.TRIBATCHTYPE_DEPTH), "Depth");

    let shadowResources = EmptyShadowResources();
    if (this._enableShadows && this.shadowQualitySetting !== ShadowQuality.SHADOW_DISABLED && this._reflectionShadowMap)
    {
      // Raytraced shadows are unported (Carbon's m_rtManager), so only the cascaded branch can run.
      const reallyHaveShadows = this.shadowQualitySetting === ShadowQuality.SHADOW_RAYTRACED ? false : !!this.cascadedShadowMap;
      if (reallyHaveShadows)
      {
        esm.SetInvertedCullMode(false);
        shadowResources = this.SetupCascadedShadows(Tr2RenderReason.TR2RENDERREASON_REFLECTION, this._reflectionShadowMap, currentFrustum,
          this.reflectionProbe.GetDepthBuffer(face), gpuResourcePool, renderContext, renderer);
        esm.SetInvertedCullMode(true);
      }
    }
    EveSpaceScene.registerWithVariableStore(shadowResources, gpuResourcePool);

    renderContext.SetReadOnlyDepth(true);
    this.RenderOpaqueBatches(batches, renderContext);

    const store = Tr2VariableStore.globalStore();
    let froxelFog = null;
    if (this.volumetricsRenderer)
    {
      const viewport = esm.GetViewport();
      froxelFog = this.volumetricsRenderer.RenderFogIntoReflectionMap(renderContext, gpuResourcePool, viewport.width, viewport.height,
        this.sunDirection, this.currentSunColor, this.updateContext.GetOrigin(), renderContext.GetViewTransform(),
        renderContext.GetReversedDepthProjectionTransform());
    }
    store.RegisterVariable__TextureAL("EveSceneFroxelFogMap", froxelFog ? froxelFog.Get() : new Tr2TextureAL());

    this.RenderTransparentBatches(batches, renderContext);
    renderContext.SetReadOnlyDepth(false);

    store.RegisterVariable__TextureAL("EveSceneFroxelFogMap", new Tr2TextureAL());
    EveSpaceScene.registerWithVariableStore(EmptyShadowResources(), gpuResourcePool);

    this.ClearBatches(batches);
    esm.EndManagedRendering();
  }

  /**
   * Carbon EveSpaceScene::RenderBackgroundPassObjects (cpp:2082-2195): the
   * nebula - the background effect drawn as a camera-space screen quad with
   * opaque states - then the starfield, background objects, planets and warp
   * tunnel. For a reflection render the nebula intensity is swapped for the
   * background reflection intensity around the draw.
   *
   * Adapted: the nebula, seeded starfield and planets are ported. Background objects
   * and the warp tunnel each log
   * a warning once when the scene has them, rather than being skipped
   * silently, so this never reports distortion batches yet.
   *
   * @param {object|null} depthMap The scene depth.
   * @param {object|null} distortionMap The distortion map.
   * @param {Tr2RenderContext} renderContext The frame's context.
   * @param {Tr2Renderer} renderer The renderer that draws screen quads.
   * @param {number} reason An EveSpaceScene.BackgroundRenderingReason value.
   * @returns {boolean} Whether any background distortion batches were drawn.
   */
  @blue.method
  @meta.adapted
  RenderBackgroundPassObjects(depthMap, distortionMap, renderContext, renderer, reason)
  {
    const hasBackgroundDistortionBatches = false;

    if (this.backgroundEffect)
    {
      if (reason === EveSpaceScene.BackgroundRenderingReason.BACKGROUND_RENDER_REFLECTION)
      {
        this._nebulaIntensityHandle.SetValue(this.backgroundReflectionIntensity);
      }

      renderContext.GetEffectStateManager().ApplyStandardStates(RenderingMode.RM_OPAQUE);
      // Ask before drawing: renews what the effect holds, and skips it while its resource is not good.
      if (this.backgroundEffect.IsGood())
        Tr2Renderer.drawCameraSpaceScreenQuad(renderContext, this.backgroundEffect.GetShaderStateInterface(), this.backgroundEffect);

      if (reason === EveSpaceScene.BackgroundRenderingReason.BACKGROUND_RENDER_REFLECTION)
      {
        this._nebulaIntensityHandle.SetValue(this.currentNebulaIntensity);
      }
    }

    if (this.starfield)
    {
      this.starfield.GetBatches(this._secondaryAdditiveBatches, null);
      this.RenderBatch(this._secondaryAdditiveBatches, RenderingMode.RM_ALPHA_ADDITIVE, renderContext);
    }
    if (this.backgroundObjects.length) this._WarnBackgroundPart("backgroundObjects", "background objects in the background pass");
    if (this.planets.length)
    {
      this.RenderPlanets(renderContext);
      if (reason === EveSpaceScene.BackgroundRenderingReason.BACKGROUND_RENDER_COLOR)
      {
        const oldReadOnlyDepth = renderContext.GetRenderContextAL().GetReadOnlyDepth();
        renderContext.SetReadOnlyDepth(true);
        try
        {
          for (const flare of this.lensflares) flare.RunBackgroundOcclusionQueries(renderContext, this.updateContext);
        }
        finally
        {
          renderContext.SetReadOnlyDepth(oldReadOnlyDepth);
        }
      }
    }
    if (this.warpTunnel) this._WarnBackgroundPart("warpTunnel", "the warp tunnel in the background pass");

    renderContext.GetEffectStateManager().EndManagedRendering();
    return hasBackgroundDistortionBatches;
  }

  /** Native celestial visibility scratch, retained between frames. */
  _planetFrustum = new TriFrustum();

  /** Carbon m_secondaryBatches: effect-sorted except order-preserving transparency. */
  _secondaryBatches = new Map([
    [ TriBatchType.TRIBATCHTYPE_OPAQUE, new TriRenderBatchAccumulator(EffectKeyGenerator) ],
    [ TriBatchType.TRIBATCHTYPE_DECAL, new TriRenderBatchAccumulator(EffectKeyGenerator) ],
    [ TriBatchType.TRIBATCHTYPE_ADDITIVE, new TriRenderBatchAccumulator(EffectKeyGenerator) ],
    [ TriBatchType.TRIBATCHTYPE_DEPTH, new TriRenderBatchAccumulator(EffectKeyGenerator) ],
    [ TriBatchType.TRIBATCHTYPE_DISTORTION, new TriRenderBatchAccumulator(EffectKeyGenerator) ],
    [ TriBatchType.TRIBATCHTYPE_TRANSPARENT, new TriRenderBatchAccumulator(DefaultKeyGenerator) ]
  ]);

  /**
   * Scales view translation only (EveSpaceScene.cpp:3908-3915).
   * Adapted: the output is caller-owned instead of returned by value.
   */
  @blue.method
  @meta.adapted
  CreatePlanetViewMatrix(original, out)
  {
    mat4.copy(out, original);
    out[12] /= this.planetCameraScale;
    out[13] /= this.planetCameraScale;
    out[14] /= this.planetCameraScale;
    return out;
  }

  /**
   * Updates planet children with the scaled camera required by child modifiers
   * (cpp:3828-3841). Adapted: renderer globals are explicit on the update context.
   */
  @blue.method
  @meta.adapted
  UpdatePlanets(updateContext)
  {
    if (!this.planets.length) return;
    const context = updateContext.renderContext;
    const view = mat4.alloc();
    context.PushViewTransform();
    try
    {
      this.CreatePlanetViewMatrix(context.GetViewTransform(), view);
      context.SetViewTransform(view);
      for (const planet of this.planets) planet.UpdatePlanetSyncronous(updateContext, this.planetScale);
    }
    finally
    {
      context.PopViewTransform();
      mat4.unalloc(view);
    }
  }

  /**
   * Collects native opaque/decal/additive/depth batches plus the transparency list
   * (cpp:856-876,956-981). Adapted: no parallel tasks; the context carries the pool.
   */
  @blue.method
  @meta.adapted
  GetAllBatchesFromRenderables(renderables, transparent, includeDistortions, batches, context, reason = Tr2RenderReason.TR2RENDERREASON_NORMAL)
  {
    const pool = context.GetTriPoolAllocator();
    if (!renderables.length) return;
    for (const batch of batches.values()) batch.SetTriPoolAllocator(pool);
    const types = [ TriBatchType.TRIBATCHTYPE_OPAQUE, TriBatchType.TRIBATCHTYPE_DECAL, TriBatchType.TRIBATCHTYPE_ADDITIVE, TriBatchType.TRIBATCHTYPE_DEPTH ];
    if (includeDistortions) types.push(TriBatchType.TRIBATCHTYPE_DISTORTION);
    for (const item of renderables)
    {
      const data = item.GetPerObjectData(batches.get(TriBatchType.TRIBATCHTYPE_OPAQUE));
      for (const type of types) item.GetBatches(batches.get(type), type, data, reason);
      if (item.HasTransparentBatches()) transparent.push({ object: item, distance: item.GetSortValue() });
    }
  }

  /** Stable front-to-back sort, visited backwards, as cpp:838-852. */
  @blue.method
  @meta.implemented
  PrepareTransparentBatch(transparent, batches, reason = Tr2RenderReason.TR2RENDERREASON_NORMAL)
  {
    transparent.sort((a, b) => a.distance - b.distance);
    const batch = batches.get(TriBatchType.TRIBATCHTYPE_TRANSPARENT);
    for (let index = transparent.length - 1; index >= 0; index--)
    {
      const item = transparent[index].object;
      item.GetBatches(batch, TriBatchType.TRIBATCHTYPE_TRANSPARENT, item.GetPerObjectData(batch), reason);
    }
  }

  /** Finalizes every accumulator in the native BatchMap (cpp:2974-2982). */
  @blue.method
  @meta.implemented
  FinalizeBatches(batches)
  {
    for (const batch of batches.values()) batch.Finalize();
  }

  /** Clears every accumulator in the native BatchMap (cpp:2960-2966). */
  @blue.method
  @meta.implemented
  ClearBatches(batches)
  {
    for (const batch of batches.values()) batch.Clear();
  }

  /**
   * Carbon RenderOpaqueBatches (cpp:1130-1156): opaque then decal batches,
   * through the current visualizer as RenderBatch does.
   */
  @blue.method
  @meta.implemented
  RenderOpaqueBatches(batches, context)
  {
    const visualizerEffect = this._visualizerEffects[this.visualizeMethod];
    const esm = context.GetEffectStateManager();

    switch (visualizerEffect.type)
    {
      case VisualizerType.PIXEL_SHADER_REPLACEMENT:
        esm.ApplyStandardStates(RenderingMode.RM_OPAQUE);
        context.RenderBatchesWithOverride(batches.get(TriBatchType.TRIBATCHTYPE_OPAQUE), visualizerEffect.effect);
        esm.ApplyStandardStates(RenderingMode.RM_DECAL);
        context.RenderBatchesWithOverride(batches.get(TriBatchType.TRIBATCHTYPE_DECAL), visualizerEffect.effect);
        break;
      case VisualizerType.FULL_SCREEN_QUAD_OVERLAY:
        esm.ApplyStandardStates(RenderingMode.RM_OPAQUE);
        context.RenderBatches(batches.get(TriBatchType.TRIBATCHTYPE_OPAQUE));
        esm.ApplyStandardStates(RenderingMode.RM_DECAL);
        context.RenderBatches(batches.get(TriBatchType.TRIBATCHTYPE_DECAL));
        break;
      default:
        break;
    }
  }

  /**
   * Carbon RenderTransparentBatches (cpp:1163-1185): transparent then
   * additive batches, through the current visualizer as RenderBatch does.
   */
  @blue.method
  @meta.implemented
  RenderTransparentBatches(batches, context)
  {
    const visualizerEffect = this._visualizerEffects[this.visualizeMethod];
    const esm = context.GetEffectStateManager();

    switch (visualizerEffect.type)
    {
      case VisualizerType.PIXEL_SHADER_REPLACEMENT:
        esm.ApplyStandardStates(RenderingMode.RM_ALPHA);
        context.RenderBatchesWithOverride(batches.get(TriBatchType.TRIBATCHTYPE_TRANSPARENT), visualizerEffect.effect);
        esm.ApplyStandardStates(RenderingMode.RM_ALPHA_ADDITIVE);
        context.RenderBatchesWithOverride(batches.get(TriBatchType.TRIBATCHTYPE_ADDITIVE), visualizerEffect.effect);
        break;
      case VisualizerType.FULL_SCREEN_QUAD_OVERLAY:
        esm.ApplyStandardStates(RenderingMode.RM_ALPHA);
        context.RenderBatches(batches.get(TriBatchType.TRIBATCHTYPE_TRANSPARENT));
        esm.ApplyStandardStates(RenderingMode.RM_ALPHA_ADDITIVE);
        context.RenderBatches(batches.get(TriBatchType.TRIBATCHTYPE_ADDITIVE));
        break;
      default:
        break;
    }
  }

  /**
   * Draws celestials at scale 1e6 with clips 0.01..1e5 (cpp:3844-3906).
   * Adapted: renderer globals are the supplied context; try/finally implements
   * native scope guards. The background caller queries occlusion before clearing
   * this pass's depth. Per-frame constants are refilled for both camera spaces.
   */
  @blue.method
  @meta.adapted
  RenderPlanets(context)
  {
    const view = mat4.alloc();
    const projection = mat4.alloc();
    const lastView = mat4.alloc();
    const lastProjection = mat4.alloc();
    let constantsChanged = false;
    context.PushProjection();
    context.PushViewTransform();
    try
    {
      this.CreatePlanetViewMatrix(context.GetViewTransform(), view);
      context.SetViewTransform(view);
      EveCamera.ModifyClipPlanes(this.projection, 0.01, 1e5, projection);
      // Carbon projection * jitter: gl-matrix applies projection first.
      mat4.multiply(projection, this.jitterMatrix, projection);
      context.SetProjection(projection);
      const visible = [];
      for (const planet of this.planets) planet.GetRenderables(visible);
      if (!visible.length) return;

      constantsChanged = true;
      this.PopulatePerFramePSData(this._perFramePS, context);
      this.PopulatePerFrameVSData(this._perFrameVS, context);
      this.CreatePlanetViewMatrix(this.viewLast, lastView);
      EveCamera.ModifyClipPlanes(this.projectionLast, 0.01, 1e5, lastProjection);
      mat4.multiply(lastProjection, this.jitterMatrix, lastProjection);
      mat4.multiply(lastProjection, lastProjection, lastView);
      this._perFrameVS.SetAndTranspose("ViewProjectionLast", lastProjection);
      this.ApplyPerFrameData(context);
      const transparent = [];
      this.GetAllBatchesFromRenderables(visible, transparent, false, this._secondaryBatches, context);
      this.PrepareTransparentBatch(transparent, this._secondaryBatches);
      this.FinalizeBatches(this._secondaryBatches);
      const esm = context.GetEffectStateManager();
      esm.ApplyStandardStates(RenderingMode.RM_DEPTH_ONLY);
      context.RenderBatches(this._secondaryBatches.get(TriBatchType.TRIBATCHTYPE_DEPTH), "Depth");
      this.RenderOpaqueBatches(this._secondaryBatches, context);
      const oldDepth = context.GetRenderContextAL().GetReadOnlyDepth();
      context.SetReadOnlyDepth(true);
      esm.PushRenderTarget__TextureAL(null, 1);
      try
      {
        this.RenderTransparentBatches(this._secondaryBatches, context);
      }
      finally
      {
        context.SetReadOnlyDepth(oldDepth);
        esm.PopRenderTarget(1);
      }
    }
    finally
    {
      this.ClearBatches(this._secondaryBatches);
      context.PopViewTransform();
      context.PopProjection();
      mat4.unalloc(lastProjection);
      mat4.unalloc(lastView);
      mat4.unalloc(projection);
      mat4.unalloc(view);
      if (constantsChanged)
      {
        this.PopulatePerFramePSData(this._perFramePS, context);
        this.PopulatePerFrameVSData(this._perFrameVS, context);
        this.ApplyPerFrameData(context);
      }
    }
  }

  /** Logs once per scene that part of Carbon's background pass is not drawn yet. */
  _WarnBackgroundPart(key, what)
  {
    if (this._warnedBackgroundParts.has(key)) return;
    this._warnedBackgroundParts.add(key);
    CcpLog.CCP_LOGWARN_CH(CcpLog.GetModuleChannel("trinity"), "%s", `EveSpaceScene: ${what} is not ported yet; it is not drawn.`);
  }

  /** Carbon EveSpaceScene::BackgroundRenderingReason (EveSpaceScene.h:613-616). */
  static BackgroundRenderingReason = BackgroundRenderingReason;

  /**
   * Carbon EveSpaceScene::RenderDepthPass (cpp:2201-2356): the opaque, decal
   * and depth batches drawn with the depth technique into the bound depth
   * buffer, and into the normal map and custom stencil when they are given.
   * Both targets and the depth are cleared to zero, reverse-Z's far.
   *
   * Carbon's Metal branch is the one taken (cpp:2255-2259, 2319-2321): with
   * no normal map, colour slot 0 is unbound for the pass rather than left on
   * the scene colour.
   *
   * Adapted. The batches come in as `batchMap`: Carbon draws its own
   * m_primaryBatches, and the gather that fills them is the driver's here.
   * Not ported, each a later insertion at its place in this order: the
   * mesh-morph update before the pass (cpp:2212-2228; nothing registers an
   * ITr2MeshMorph). The sun angle and planet shadow casters follow the pass
   * (cpp:2328-2355).
   *
   * @param {object} depthMap The scene depth; the caller has bound it.
   * @param {object|null} normalMap The normal map, or null.
   * @param {object|null} customStencil The custom stencil target, or null.
   * @param {Tr2RenderContext} renderContext The frame's context.
   * @param {string} techniqueName The depth technique ("Depth" from the driver).
   * @param {object} batchMap The frame's batch map.
   * @returns {void}
   */
  @blue.method
  @meta.adapted
  RenderDepthPass(depthMap, normalMap, customStencil, renderContext, techniqueName, batchMap)
  {
    if (!this.display) return;

    const esm = renderContext.GetEffectStateManager();
    const clearAndStore = () => new Tr2ColorAttachment(Tr2LoadAction.CLEAR, Tr2StoreAction.STORE);
    const clearDepth = new Tr2DepthAttachment(Tr2LoadAction.CLEAR, Tr2StoreAction.STORE, 0);
    let renderingMode;

    esm.BeginManagedRendering();
    esm.SetRenderTarget(1, customStencil);
    esm.PushRenderTarget__Current();

    if (normalMap)
    {
      esm.SetRenderTarget(0, normalMap);
      if (customStencil)
      {
        renderContext.RenderPassHint(clearAndStore(), clearAndStore(), clearDepth);
        renderContext.Clear({ clearColor: true, color: [ 0, 0, 0, 0 ], slot: 1 });
      }
      else
      {
        renderContext.RenderPassHint(clearAndStore(), clearDepth);
      }
      renderContext.Clear({ clearColor: true, clearDepth: true, color: [ 0, 0, 0, 0 ], depth: 0 });
      renderingMode = RenderingMode.RM_OPAQUE;
    }
    else
    {
      esm.SetRenderTarget(0, null);
      if (customStencil)
      {
        renderContext.RenderPassHint(new Tr2ColorAttachment(), clearAndStore(), clearDepth);
        renderContext.Clear({ clearColor: true, color: [ 0, 0, 0, 0 ], slot: 1 });
        renderingMode = RenderingMode.RM_OPAQUE;
      }
      else
      {
        renderContext.RenderPassHint(new Tr2ColorAttachment(), clearDepth);
        renderingMode = RenderingMode.RM_DEPTH_ONLY;
      }
      renderContext.Clear({ clearDepth: true, depth: 0 });
    }

    this.ApplyPerFrameData(renderContext);

    for (const batchType of [ TriBatchType.TRIBATCHTYPE_OPAQUE, TriBatchType.TRIBATCHTYPE_DECAL, TriBatchType.TRIBATCHTYPE_DEPTH ])
    {
      esm.ApplyStandardStates(renderingMode);

      const accumulator = batchMap.GetAccumulator(batchType);

      if (accumulator) renderContext.RenderBatches(accumulator, techniqueName);
    }

    const planetDepth = [];
    for (const planet of this.planets) planet.GetZOnlyRenderables(planetDepth);
    if (planetDepth.length)
    {
      // Carbon cpp:2285-2308: collect the ordinary-world proxy in the main depth space.
      for (const type of [ TriBatchType.TRIBATCHTYPE_OPAQUE, TriBatchType.TRIBATCHTYPE_DECAL, TriBatchType.TRIBATCHTYPE_DEPTH ])
      {
        const batch = this._secondaryBatches.get(type);
        batch.SetTriPoolAllocator(renderContext.GetTriPoolAllocator());
        try
        {
          for (const item of planetDepth) item.GetBatches(batch, type, item.GetPerObjectData(batch), Tr2RenderReason.TR2RENDERREASON_NORMAL);
          batch.Finalize();
          esm.ApplyStandardStates(renderingMode);
          renderContext.RenderBatches(batch, techniqueName);
        }
        finally
        {
          batch.Clear();
        }
      }
    }

    // Metal supports render-pass hints, so the hinted pass ends here
    // (cpp:2310-2314); without a normal map Carbon's Metal branch only pops.
    if (normalMap) renderContext.EndRenderPassHint();

    esm.PopRenderTarget();
    esm.SetRenderTarget(1, null);
    esm.EndManagedRendering();
    if (this.volumetricsRenderer)
    {
      // Carbon cpp:2328-2355: identity of the shared translation curve selects the sun.
      let angle = 0;
      for (const planet of this.planets)
      {
        if (planet.GetTranslationCurve() !== null && planet.GetTranslationCurve() === this.sunBall)
        {
          const position = vec3.alloc();
          try
          {
            planet.GetWorldPosition(position);
            const distance = vec3.length(position);
            const radius = planet.GetRadius() * 0.5;
            // Native quirk: distance < radius or distance == 0 is not guarded; keep its NaN behavior.
            angle = Math.acos(Math.sqrt(distance * distance - radius * radius) / distance);
          }
          finally { vec3.unalloc(position); }
          break;
        }
      }
      this.volumetricsRenderer.SetSunAngle(angle);
      this.SetupPlanetsAsShadowCaster__Planets(this._planetShadowSpheres, 2);
      this.volumetricsRenderer.SetPlanets(this._planetShadowSpheres);
    }
  }

  /** Carbon's two nearest significant planet shadow spheres (cpp:2350-2354). */
  _planetShadowSpheres = [ vec4.create(), vec4.create() ];

  /** m_planetPerObjData (EveSpaceScene.h:336-340), two packed float4 spheres. */
  _planetPerObjData = RawData.create("EvePlanetPerObjData");

  /** m_planetPerObjBuffer, constructed in EveSpaceScene.cpp:283. */
  _planetPerObjBuffer = new Tr2ShaderBuffer();

  /**
   * Carbon SetupPlanetsAsShadowCaster (cpp:4028-4037): replace the previous
   * mesh's pixel constants before the shadow resolve reads its planet spheres.
   * Even a scene with no planets must bind two zero-radius spheres; otherwise
   * a hull's translated world matrix is interpreted as a pair of planets.
   * @param {Tr2RenderContext} renderContext The shadow pass context.
   */
  @meta.implemented
  SetupPlanetsAsShadowCaster__RenderContext(renderContext)
  {
    this.SetupPlanetsAsShadowCaster__Planets(this._planetShadowSpheres, 2);
    this._planetPerObjData.SetIndex("planetSphere", 0, this._planetShadowSpheres[0]);
    this._planetPerObjData.SetIndex("planetSphere", 1, this._planetShadowSpheres[1]);
    const data = this._planetPerObjData.GetData();
    this._planetPerObjBuffer.SetData(data, data.byteLength);
    this._planetPerObjBuffer.ApplyBuffer(renderContext);
  }

  /**
   * Selects the largest on-screen planets, excluding the sun and bodies behind it
   * (cpp:3930-3980). Adapted: caller-owned vec4 values represent native spheres.
   */
  @meta.adapted
  SetupPlanetsAsShadowCaster__Planets(planets, maxPlanets)
  {
    const sun = vec3.alloc();
    const position = vec3.alloc();
    vec3.set(sun, 0, 0, 0);
    const visible = [];
    try
    {
      if (this.sunBall) this.sunBall.GetValueAt__Ticks(this.updateContext.GetTime(), sun);
      for (const planet of this.planets)
      {
        const size = planet.GetEstimatedPixelDiameter();
        if (!(size > 50)) continue;
        const curve = planet.GetTranslationCurve();
        if (curve !== null && curve === this.sunBall) continue;
        if (curve && this.sunBall)
        {
          curve.GetValueAt__Ticks(this.updateContext.GetTime(), position);
          if ((position[0] - sun[0]) * -sun[0] + (position[1] - sun[1]) * -sun[1] + (position[2] - sun[2]) * -sun[2] < 0) continue;
        }
        planet.GetWorldPosition(position);
        visible.push({ size, sphere: [ position[0], position[1], position[2], planet.GetRadius() ] });
      }
      visible.sort((a, b) => b.size - a.size);
      for (let index = 0; index < maxPlanets; index++)
      {
        if (index < visible.length) vec4.copy(planets[index], visible[index].sphere);
        else vec4.set(planets[index], 0, 0, 0, 0);
      }
    }
    finally
    {
      vec3.unalloc(position);
      vec3.unalloc(sun);
    }
  }

  /**
   * Carbon RenderDistortionBatches (EveSpaceScene.cpp:1230-1262): draws the
   * DISTORTION batches additively into the distortion map, tested against the
   * scene depth. The map clears to Carbon's 0x007f7f00 (ARGB: red and green
   * 0x7f), the "no offset" value the Distortion.fx apply reads. The caller
   * holds the depth read-only, as Carbon's whole colour pass does.
   *
   * @param {object} batches The frame's batch map.
   * @param {object} distortionMap The B8G8R8A8 target.
   * @param {object|null} depthMap The scene depth, or null.
   * @param {object} renderContext The frame's context.
   * @returns {boolean} Whether any distortion batch was drawn.
   */
  @blue.method
  @meta.implemented
  RenderDistortionBatches(batches, distortionMap, depthMap, renderContext)
  {
    const accumulator = batches.GetAccumulator(TriBatchType.TRIBATCHTYPE_DISTORTION);
    if (!accumulator.GetBatchCount()) return false;

    const esm = renderContext.GetEffectStateManager();
    esm.PushRenderTarget__TextureAL(distortionMap);
    esm.PushDepthStencilBuffer__Current();
    try
    {
      if (depthMap) esm.SetDepthStencilBuffer(depthMap);

      renderContext.Clear({ clearColor: true, color: [ 0x7f / 255, 0x7f / 255, 0, 0 ] });

      this.ApplyPerFrameData(renderContext);

      esm.ApplyStandardStates(RenderingMode.RM_ALPHA_ADDITIVE);
      renderContext.RenderBatches(accumulator);
    }
    finally
    {
      esm.PopDepthStencilBuffer();
      esm.PopRenderTarget();
    }
    return true;
  }

  /** m_enableShadows: C++-only, set in the constructor and never cleared (EveSpaceScene.cpp:180). */
  _enableShadows = true;

  /**
   * m_shadowBatches: one accumulator per cascade split (cpp:245-250). Carbon
   * gives each its own pool allocator; ours draw from the context's.
   */
  _shadowBatches = Array.from({ length: CjsPerFrameLayouts.SHADOW_FRUSTUM_COUNT }, () => new TriRenderBatchAccumulator(EffectKeyGenerator));

  /** The shadow pass's per-frame vertex block, of which only ViewProjectionMat is set (cpp:764-765). */
  _shadowPerFrameVS = RawData.create("EveSpaceScenePerFrameVSData");

  /** m_shadowPerFrameVSBuffer (h:538), by value; filled at cpp:778 and cpp:2429. */
  _shadowPerFrameVSBuffer = new Tr2ConstantBufferAL();

  /**
   * Carbon EveSpaceScene::RenderShadows (cpp:2629-2694): the cascaded shadow
   * map at LOW or HIGH shadow quality, then the point and spot light shadow
   * atlas.
   *
   * Adapted: the renderer is passed in for the resolve's blitter, as
   * `Tr2ShadowMap.DrawToShadowMapResult` takes it. Two branches wait on
   * subsystems that are not ported, each marked at its site: the raytraced
   * branch (no Tr2RaytracingManager), and the light atlas pass, which needs
   * the light manager's GetShadowMapAtlas. The atlas pass's per-light work,
   * RenderShadowMapForLight and its helpers, is ported.
   *
   * @param {object} depthMap The scene depth.
   * @param {object|null} normalMap The depth pass's normal map (the raytraced branch reads it).
   * @param {object} gpuResourcePool The driver's pool.
   * @param {Tr2RenderContext} renderContext The frame's context.
   * @param {object} renderer The renderer owning the blitter.
   * @returns {object} ShadowResources: `shadowMap`, `cascadedShadowDepth`,
   *   `pointLightShadowMap`, `pointLightShadowDepth`, each a GpuResourceHandle,
   *   empty when absent.
   */
  @blue.method
  @meta.adapted
  RenderShadows(depthMap, normalMap, gpuResourcePool, renderContext, renderer)
  {
    if (!this.display || !this._enableShadows) return EmptyShadowResources();

    let result = EmptyShadowResources();

    if (this.cascadedShadowMap
      && (this.shadowQualitySetting === ShadowQuality.SHADOW_LOW || this.shadowQualitySetting === ShadowQuality.SHADOW_HIGH))
    {
      result = this.SetupCascadedShadows(Tr2RenderReason.TR2RENDERREASON_NORMAL, this.cascadedShadowMap, this.updateContext.GetFrustum(), depthMap, gpuResourcePool, renderContext, renderer);
    }

    // Waiting: Tr2RaytracingManager (EveSpaceScene.cpp:2641-2671). Carbon's
    // `else if( m_rtManager && m_shadowQuality == SHADOW_RAYTRACED ... )`
    // branch goes here; it is the only caller of RenderVolumetricShadowMap
    // (cpp:2658), after the volumetrics renderer's own RenderShadows.

    const lightManager = Tr2LightManager.getInstance();

    if (lightManager
      && lightManager.GetShadowCastingLights().length > 0
      && this.shadowQualitySetting !== ShadowQuality.SHADOW_DISABLED
      && this.shadowQualitySetting !== ShadowQuality.SHADOW_RAYTRACED)
    {
      // Waiting: Tr2LightManager.GetShadowMapAtlas (Tr2LightManager.cpp:703,
      // called at EveSpaceScene.cpp:2678). With a valid atlas Carbon runs
      // PrepareShadowMapForLights, then RenderShadowMapForLight for each
      // index in GetShadowCastingLights against the registry's shadow
      // casters, then FinishRenderingShadowMapForLights, and returns the
      // atlas as pointLightShadowDepth (cpp:2679-2690).
    }

    return result;
  }

  /**
   * Carbon EveSpaceScene::SetupCascadedShadows (cpp:608-798): splits the view
   * into cascades, finds each one's shadow casters, draws them with their
   * "Shadow" technique into the cascade's cell of the depth atlas, then
   * resolves the atlas against the scene depth into a screen-space shadow
   * factor.
   *
   * Adapted: Carbon reads the camera off Tr2Renderer's statics, which the
   * render context holds here, and finds casters and gathers batches in
   * parallel, which runs in order here. Not ported, each a later insertion:
   * the instanced mesh manager's shadow batches and planets as shadow casters.
   *
   * @param {number} renderReason A `Tr2RenderReason`.
   * @param {Tr2ShadowMap} shadowMap The scene's cascaded shadow map.
   * @param {TriFrustum} viewFrustum The camera frustum.
   * @param {object} depthMap The scene depth.
   * @param {object} gpuResourcePool The driver's pool.
   * @param {Tr2RenderContext} renderContext The frame's context.
   * @param {object} renderer The renderer owning the blitter.
   * @returns {object} ShadowResources, as RenderShadows.
   */
  @blue.method
  @meta.adapted
  SetupCascadedShadows(renderReason, shadowMap, viewFrustum, depthMap, gpuResourcePool, renderContext, renderer)
  {
    if (!this.componentRegistry) return EmptyShadowResources();

    const shadowCasters = this.componentRegistry.GetComponents(EveComponentType.ShadowCaster);
    const volumetricCount = this.componentRegistry.ComponentCount(EveComponentType.VolumetricRenderable);
    const fogCount = this.componentRegistry.ComponentCount(EveComponentType.FroxelFogSettings);

    if (shadowCasters.length + volumetricCount + fogCount === 0) return EmptyShadowResources();

    shadowMap.UpdateSplitValues(renderContext.GetFrontClip(), renderContext.GetBackClip());

    const shadowMapSize = shadowMap.GetShadowMapSize();
    const splitCount = CjsPerFrameLayouts.SHADOW_FRUSTUM_COUNT;

    // The frustum's left, right, top and bottom over the near plane, from the
    // projection (cpp:633-644); Carbon's _11, _22, _31 and _32 are 0, 5, 8, 9.
    const projection = renderContext.GetProjection();
    const rightMinusLeft = 2 / projection[0];
    const bottomMinusTop = 2 / -projection[5];
    const left = (projection[8] - 1) / 2 * rightMinusLeft;
    const top = (-projection[9] - 1) / 2 * bottomMinusTop;
    const right = rightMinusLeft + left;
    const bottom = bottomMinusTop + top;
    const sunDir = this.sunDirection;
    const cameraFrustums = [];
    const shadowFrustums = [];
    const splitSetups = [];

    for (let splitIndex = 0; splitIndex < splitCount; ++splitIndex)
    {
      const splitSetup = shadowMap.SetupShadowSplit(splitIndex, renderContext.GetInverseViewTransform(), sunDir, viewFrustum.zNear, left, right, top, bottom);

      // The split's slice of the camera frustum, for half-space culling of
      // casters: a copy of the update context's frustum with its planes
      // replaced (cpp:660-663). The instanced mesh manager also reads its
      // view position and projection for instance pixel sizes.
      const cameraFrustum = new TriFrustum().Copy(this.updateContext.GetFrustum());
      // Carbon's Inverse returns its input when the determinant is zero
      // (Matrix.cpp:13-16), as it is for a split the near clip has passed;
      // gl-matrix returns null there.
      const viewProj = mat4.invert(mat4.create(), splitSetup.invViewProj) ?? mat4.clone(splitSetup.invViewProj);

      cameraFrustum.ExtractFrustum(viewProj);
      cameraFrustums.push(cameraFrustum);
      shadowFrustums.push(TriShadowOrthoFrustum.create__AllFields(splitSetup.shadowFrustum, shadowMapSize, sunDir));
      splitSetups.push(splitSetup);
    }

    // Without the atlas there is nothing to draw into (cpp:661-665).
    const cascadedShadowDepth = shadowMap.PrepareShadowRendering(gpuResourcePool, renderContext);

    if (!cascadedShadowDepth || !cascadedShadowDepth.IsValid()) return EmptyShadowResources();

    const allocator = renderContext.GetTriPoolAllocator();

    for (let frustumIndex = 0; frustumIndex < splitCount; ++frustumIndex)
    {
      const batches = this._shadowBatches[frustumIndex];
      const shadowCasterInfo = [];

      if (allocator) batches.SetTriPoolAllocator(allocator);

      for (const caster of shadowCasters)
      {
        const radius = [ 0 ];

        if (caster.IsCastingShadow__ShadowFrustum(cameraFrustums[frustumIndex], shadowFrustums[frustumIndex], renderReason, radius))
        {
          shadowCasterInfo.push({ radius: radius[0], caster, perObjectData: null });
        }
      }

      for (const info of shadowCasterInfo) info.perObjectData = info.caster.GetShadowPerObjectData(batches);
      for (const info of shadowCasterInfo) info.caster.GetShadowBatches(batches, info.perObjectData, info.radius);

      // Carbon cpp:741-745: the shared instanced meshes' casters for this split.
      this.instancedMeshManager.GetShadowBatches(cameraFrustums[frustumIndex], shadowFrustums[frustumIndex], this.updateContext.GetInvLodFactor(),
        [ [ TriBatchType.TRIBATCHTYPE_OPAQUE, batches ] ], renderReason);
      batches.Finalize();
    }

    const esm = renderContext.GetEffectStateManager();
    const shaderTypeMask = renderContext.GetRenderContextAL().constructor.SHADER_TYPE_MASK;
    const perFrameVsMask = (1 << ShaderType.VERTEX_SHADER) | (shaderTypeMask & (
      (1 << ShaderType.COMPUTE_SHADER)
      | (1 << ShaderType.GEOMETRY_SHADER)
      | (1 << ShaderType.HULL_SHADER)
      | (1 << ShaderType.DOMAIN_SHADER)
    ));

    renderContext.SetRenderState(RenderState.RS_DEPTH_CLIP_ENABLE, 0);

    try
    {
      for (let splitIndex = 0; splitIndex < splitCount; ++splitIndex)
      {
        const batches = this._shadowBatches[splitIndex];

        if (batches.GetBatchCount() === 0)
        {
          batches.Clear();
          continue;
        }

        shadowMap.BeginShadowRendering(renderContext, splitIndex);

        // column_major for shaders: Carbon stores Transpose(lightViewProjection).
        this._shadowPerFrameVS.SetAndTranspose("ViewProjectionMat", splitSetups[splitIndex].lightViewProjection);

        const data = this._shadowPerFrameVS.GetData();

        Tr2RenderUtils.fillAndSetConstants(this._shadowPerFrameVSBuffer, data, data.byteLength, perFrameVsMask, PER_FRAME_VS, renderContext);

        // The atlas is a forward-depth surface cleared to 1 (PrepareShadowRendering).
        esm.SetInvertedDepthTest(false);

        try
        {
          esm.ApplyStandardStates(RenderingMode.RM_OPAQUE);
          renderContext.RenderBatches(batches, "Shadow");
        }
        finally
        {
          esm.SetInvertedDepthTest(true);
        }

        batches.Clear();
      }

      shadowMap.EndShadowRendering(renderContext);
    }
    finally
    {
      renderContext.SetRenderState(RenderState.RS_DEPTH_CLIP_ENABLE, 1);
    }

    this.PopulatePerFramePSData__ShadowMap(this._perFramePS, shadowMap, renderContext);
    this.ApplyPerFrameData(renderContext);

    this.SetupPlanetsAsShadowCaster__RenderContext(renderContext);

    const result = shadowMap.DrawToShadowMapResult(renderContext, gpuResourcePool, depthMap, cascadedShadowDepth.Get(), this.upscalingAmount, renderer);
    if (renderReason === Tr2RenderReason.TR2RENDERREASON_NORMAL
      && this.componentRegistry && this.volumetricsRenderer && volumetricCount > 0)
    {
      this.volumetricsRenderer.RenderShadows(this.componentRegistry, result.Get(), renderContext);
    }


    return {
      shadowMap: result ?? new GpuResourceHandle(),
      cascadedShadowDepth,
      pointLightShadowMap: new GpuResourceHandle(),
      pointLightShadowDepth: new GpuResourceHandle()
    };
  }

  /**
   * Carbon EveSpaceScene::RenderVolumetricShadowMap (cpp:2369-2385): for each
   * volumetric renderable, takes its shadow camera, and when it prepares its
   * cloud shadow map, draws the scene's shadow casters into it with
   * RenderIntoCloudShadowMap and publishes the map.
   *
   * Its only Carbon caller is RenderShadows' raytraced branch (cpp:2658),
   * which waits on Tr2RaytracingManager, so nothing calls it yet.
   *
   * Adapted: the shadow camera is a plain record with
   * ITr2VolumetricRenderable::ShadowInfo's fields (ITr2VolumetricRenderable.h:37-43),
   * whose members start null where Carbon default-constructs them. The
   * renderable assigns all four (EveChildCloud2.cpp:903-906), and allocating
   * defaults it replaces would be per-frame garbage.
   *
   * @param {Tr2RenderContext} renderContext The frame's context.
   * @returns {void}
   */
  @blue.method
  @meta.adapted
  RenderVolumetricShadowMap(renderContext)
  {
    const shadowCasters = this.componentRegistry.GetComponents(EveComponentType.ShadowCaster);

    this.componentRegistry.ProcessComponents(EveComponentType.VolumetricRenderable, volumetric =>
    {
      const shadowInfo = { shadowFrustum: null, lightViewProj: null, aabbMax: null, shadowMapSize: 0 };

      volumetric.GetVolumetricShadowInfo(shadowInfo, this.sunDirection);

      if (volumetric.PrepareCloudShadowMap(renderContext))
      {
        this.RenderIntoCloudShadowMap(renderContext, shadowInfo, shadowCasters);
        volumetric.SetCloudShadowMapHandle();
      }
    });
  }

  /**
   * Carbon EveSpaceScene::RenderIntoCloudShadowMap (cpp:2387-2446): draws the
   * shadow casters between the camera and a cloud into the cloud's shadow
   * map, with their "Shadow" technique and the cloud's light view-projection.
   * The cloud's PrepareCloudShadowMap pushed the target, depth-stencil and
   * viewport this pops.
   *
   * Adapted: Carbon reads the camera off Tr2Renderer's statics, which the
   * render context holds here, as SetupCascadedShadows does; the aspect ratio
   * is Tr2Renderer's `_22 / _11` of the projection (Tr2Renderer.cpp:80). The
   * accumulator draws from the context's pool allocator, where Carbon gives
   * it its own (cpp:245-250). Carbon fills a fresh PerFrameVSData of which it
   * sets only ViewProjectionMat; ours reuses the cascades' record, which sets
   * the same one field.
   *
   * @param {Tr2RenderContext} renderContext The frame's context.
   * @param {object} cloudShadowInformation ITr2VolumetricRenderable::ShadowInfo:
   *   `{ shadowFrustum, lightViewProj, aabbMax, shadowMapSize }`.
   * @param {Array<IEveShadowCaster>} shadowCasters The registry's shadow casters.
   * @returns {void}
   */
  @blue.method
  @meta.adapted
  RenderIntoCloudShadowMap(renderContext, cloudShadowInformation, shadowCasters)
  {
    const scratch = shadowPassScratch;

    // Get distance from camera to zFar (cpp:2391-2393).
    // Carbon quirk (CE-189), reproduced: aabbMax is the cloud's bound in LIGHT-VIEW
    // space (EveChildCloud2.cpp:893-906) while the view position is in world
    // space, so this distance mixes two frames.
    const dist = vec3.distance(renderContext.GetViewPosition(), cloudShadowInformation.aabbMax);

    const cameraProjection = renderContext.GetProjection();
    const aspectRatio = cameraProjection[0] ? cameraProjection[5] / cameraProjection[0] : 0;

    // PerspectiveFovMatrix (Matrix_inline.h:704-714) is gl-matrix's
    // perspectiveZO element for element while the far clip is finite.
    mat4.perspectiveZO(scratch.cloudProjection, renderContext.GetFieldOfView(), aspectRatio, this.updateContext.GetFrustum().zNear, dist);

    // Carbon's Inverse returns its input when the determinant is zero
    // (Matrix.cpp:13-16); gl-matrix returns null there.
    if (!mat4.invert(scratch.cloudInverseProjection, scratch.cloudProjection)) mat4.copy(scratch.cloudInverseProjection, scratch.cloudProjection);

    // Carbon (row-vector): Inverse( projection ) * GetInverseViewTransform()
    // - the inverse projection applies first, so gl-matrix reverses the operands (cpp:2396).
    mat4.multiply(scratch.cloudInvViewProj, renderContext.GetInverseViewTransform(), scratch.cloudInverseProjection);

    if (!mat4.invert(scratch.cloudViewProj, scratch.cloudInvViewProj)) mat4.copy(scratch.cloudViewProj, scratch.cloudInvViewProj);

    // A default TriFrustum, of which only the planes are set (cpp:2399-2400).
    const frustum = new TriFrustum();

    frustum.ExtractFrustum(scratch.cloudViewProj);

    const batches = this._shadowBatches[0];
    const allocator = renderContext.GetTriPoolAllocator();

    if (allocator) batches.SetTriPoolAllocator(allocator);

    const shadowFrustum = TriShadowOrthoFrustum.create__AllFields(cloudShadowInformation.shadowFrustum, cloudShadowInformation.shadowMapSize, this.sunDirection);

    // Carbon quirk (CE-187), reproduced: one sizeInShadow serves every caster
    // (cpp:2405) and IsCastingShadow's result is ignored, so a caster that
    // returns before writing the size is gathered with the previous caster's
    // size.
    const sizeInShadow = [ 0 ];

    for (const caster of shadowCasters)
    {
      caster.IsCastingShadow__ShadowFrustum(frustum, shadowFrustum, Tr2RenderReason.TR2RENDERREASON_NORMAL, sizeInShadow);

      // special threshold check
      if (sizeInShadow[0] > 5)
      {
        const perObjData = caster.GetShadowPerObjectData(batches);

        caster.GetShadowBatches(batches, perObjData, sizeInShadow[0]);
      }
    }

    // The instanced meshes cull against the update context's frustum, not
    // the clipped one the casters were given (cpp:2416).
    // As Carbon has it: the instanced meshes take the update context's frustum (cpp:2416), the casters the cloud-clipped one (cpp:2408).
    this.instancedMeshManager.GetShadowBatches(this.updateContext.GetFrustum(), shadowFrustum, this.updateContext.GetInvLodFactor(),
      [ [ TriBatchType.TRIBATCHTYPE_OPAQUE, batches ] ]);

    batches.Finalize();

    // column_major for shaders: Carbon stores Transpose( lightViewProj ) (cpp:2421).
    this._shadowPerFrameVS.SetAndTranspose("ViewProjectionMat", cloudShadowInformation.lightViewProj);

    const data = this._shadowPerFrameVS.GetData();

    const shaderTypeMask = renderContext.GetRenderContextAL().constructor.SHADER_TYPE_MASK;
    // Carbon's perFrameVsMask (cpp:2423-2429): vertex, and every other non-pixel stage the backend has.
    const perFrameVsMask = (1 << ShaderType.VERTEX_SHADER) | (shaderTypeMask & (
      (1 << ShaderType.COMPUTE_SHADER)
      | (1 << ShaderType.GEOMETRY_SHADER)
      | (1 << ShaderType.HULL_SHADER)
      | (1 << ShaderType.DOMAIN_SHADER)
    ));

    Tr2RenderUtils.fillAndSetConstants(this._shadowPerFrameVSBuffer, data, data.byteLength, perFrameVsMask, PER_FRAME_VS, renderContext);

    const esm = renderContext.GetEffectStateManager();

    if (batches.GetBatchCount())
    {
      esm.SetInvertedDepthTest(false);

      try
      {
        esm.ApplyStandardStates(RenderingMode.RM_OPAQUE);
        renderContext.RenderBatches(batches, "Shadow");
      }
      finally
      {
        esm.SetInvertedDepthTest(true);
      }
    }

    batches.Clear();

    renderContext.SetReadOnlyDepth(false);

    esm.PopRenderTarget();
    esm.PopDepthStencilBuffer();
    esm.PopViewport();
  }

  /**
   * Carbon EveSpaceScene::PrepareShadowMapForLights (cpp:2490-2503): binds
   * the light shadow atlas as the depth-stencil, with no colour target, and
   * clears it to 0 for the reversed-depth light projections.
   *
   * Carbon's empty `Tr2TextureAL()` is null here, as every other empty
   * target bind in this file. Carbon's CR only reports a failed clear, so the
   * result is ignored as in a release build.
   *
   * @param {Tr2RenderContext} renderContext The frame's context.
   * @param {object} shadowMap The light shadow atlas.
   * @returns {boolean} True, as Carbon's.
   */
  @blue.method
  @meta.implemented
  PrepareShadowMapForLights(renderContext, shadowMap)
  {
    const esm = renderContext.GetEffectStateManager();

    // Using depth stencil as shadow map
    esm.PushRenderTarget__TextureAL(null);
    esm.PushDepthStencilBuffer__TextureAL(shadowMap);

    // we want a clean depth buffer for this
    renderContext.SetReadOnlyDepth(false);
    renderContext.Clear({ clearDepth: true, color: 0, depth: 0, stencil: 0 });

    return true;
  }

  /**
   * Carbon EveSpaceScene::RenderShadowMapForSpotLight (cpp:2505-2572): draws
   * the shadow casters seen by one light camera into its cell of the light
   * shadow atlas, with their "DynamicLightShadow" technique. Point lights
   * call it once per cube face.
   *
   * Adapted: the accumulator draws from the context's pool allocator, where
   * Carbon gives it its own (cpp:245-250). Carbon builds a temporary
   * `TriShadowFrustum( shadowFrustum )` for every caster (cpp:2534); each is
   * a copy of the same frustum, so one built before the loop is the same
   * value. The per-frame record is the cascades', as in
   * RenderIntoCloudShadowMap.
   *
   * @param {Tr2RenderContext} renderContext The frame's context.
   * @param {Array<IEveShadowCaster>} shadowCasters The registry's shadow casters.
   * @param {number} shadowMapScale The cell's size in texels.
   * @param {number} shadowMapOffsetX The cell's left edge in texels.
   * @param {number} shadowMapOffsetY The cell's top edge in texels.
   * @param {vec3} lightPosition The light's world position.
   * @param {mat4} view The light camera's view.
   * @param {mat4} projection The light camera's reversed-depth projection.
   * @param {object} shadowMap The light shadow atlas.
   * @returns {void}
   */
  @blue.method
  @meta.adapted
  RenderShadowMapForSpotLight(renderContext, shadowCasters, shadowMapScale, shadowMapOffsetX, shadowMapOffsetY, lightPosition, view, projection, shadowMap)
  {
    const scratch = shadowPassScratch;
    const esm = renderContext.GetEffectStateManager();

    esm.PushViewport();
    esm.UpdateRenderTargetViewport(shadowMap.GetWidth(), shadowMap.GetHeight());
    esm.SetViewport({ width: shadowMapScale, height: shadowMapScale, x: shadowMapOffsetX, y: shadowMapOffsetY, minZ: 0, maxZ: 1 });

    // A 16 texel guard band inside the cell (cpp:2522-2524).
    const margin = 16;
    const marginScale = 1 - (margin / shadowMapScale);

    vec3.set(scratch.spotMarginScale, marginScale, marginScale, 1);
    mat4.fromScaling(scratch.spotMarginMatrix, scratch.spotMarginScale);

    // Carbon (row-vector): view * projection * marginMatrix - view first,
    // then projection, then the margin; gl-matrix reverses each pair (cpp:2525).
    mat4.multiply(scratch.spotViewProj, projection, view);
    mat4.multiply(scratch.spotViewProj, scratch.spotMarginMatrix, scratch.spotViewProj);

    const shadowFrustum = new TriFrustum();

    shadowFrustum.DeriveFrustum(view, lightPosition, projection, esm.GetViewport());

    const batches = this._shadowBatches[0];
    const allocator = renderContext.GetTriPoolAllocator();

    if (allocator) batches.SetTriPoolAllocator(allocator);

    const casterShadowFrustum = TriShadowFrustum.create__Shadow(shadowFrustum);

    // Carbon quirk (CE-187), reproduced: one sizeInShadow serves every caster
    // (cpp:2531) and IsCastingShadow's result is ignored, as in
    // RenderIntoCloudShadowMap.
    const sizeInShadow = [ 0 ];

    for (const caster of shadowCasters)
    {
      caster.IsCastingShadow__ShadowFrustum(this.updateContext.GetFrustum(), casterShadowFrustum, Tr2RenderReason.TR2RENDERREASON_NORMAL, sizeInShadow);

      // special threshold check
      if (sizeInShadow[0] > 5)
      {
        const perObjData = caster.GetShadowPerObjectData(batches);

        caster.GetShadowBatches(batches, perObjData, Math.min(shadowMapScale, sizeInShadow[0]));
      }
    }

    this.instancedMeshManager.GetShadowBatches(this.updateContext.GetFrustum(), TriShadowFrustum.create__Shadow(shadowFrustum), this.updateContext.GetInvLodFactor(),
      [ [ TriBatchType.TRIBATCHTYPE_OPAQUE, batches ] ]);

    batches.Finalize();

    // column_major for shaders: Carbon stores Transpose( viewProj ) (cpp:2548).
    this._shadowPerFrameVS.SetAndTranspose("ViewProjectionMat", scratch.spotViewProj);

    const data = this._shadowPerFrameVS.GetData();

    const shaderTypeMask = renderContext.GetRenderContextAL().constructor.SHADER_TYPE_MASK;
    // Carbon's perFrameVsMask (cpp:2550-2556): vertex, and every other non-pixel stage the backend has.
    const perFrameVsMask = (1 << ShaderType.VERTEX_SHADER) | (shaderTypeMask & (
      (1 << ShaderType.COMPUTE_SHADER)
      | (1 << ShaderType.GEOMETRY_SHADER)
      | (1 << ShaderType.HULL_SHADER)
      | (1 << ShaderType.DOMAIN_SHADER)
    ));

    Tr2RenderUtils.fillAndSetConstants(this._shadowPerFrameVSBuffer, data, data.byteLength, perFrameVsMask, PER_FRAME_VS, renderContext);

    if (batches.GetBatchCount())
    {
      if (!esm.IsDepthTestInverted())
      {
        esm.SetInvertedDepthTest(true);

        // Carbon quirk (CE-188), reproduced: the ON_BLOCK_EXIT restore belongs to
        // this inner block (cpp:2560-2564), so it runs here, before the
        // draw; the casters draw with the depth test as it was found.
        esm.SetInvertedDepthTest(false);
      }

      esm.ApplyStandardStates(RenderingMode.RM_OPAQUE);
      renderContext.RenderBatches(batches, "DynamicLightShadow");
    }

    batches.Clear();
    esm.PopViewport();
  }

  /**
   * Carbon EveSpaceScene::RenderShadowMapForLight (cpp:2574-2618): one
   * shadow-casting light's cells of the atlas. A point light (innerAngle at
   * most 0) draws six 90 degree cube faces into a 3x2 block of cells; a spot
   * light draws one cell with GetLightMatrices' camera.
   *
   * The light is one of Tr2LightManager.GetLightData()'s records, which
   * carries Carbon's PerLightData fields. The 10-bit cell fields are unpacked
   * by the light manager's GetUnpackedShadowMapData.
   *
   * @param {Tr2RenderContext} renderContext The frame's context.
   * @param {Array<IEveShadowCaster>} shadowCasters The registry's shadow casters.
   * @param {object} lightData The light's record.
   * @param {object} shadowMap The light shadow atlas.
   * @returns {void}
   */
  @blue.method
  @meta.implemented
  RenderShadowMapForLight(renderContext, shadowCasters, lightData, shadowMap)
  {
    const scratch = shadowPassScratch;
    const lightManager = Tr2LightManager.getInstance();

    if (lightData.innerAngle <= 0)
    {
      // pointlight
      const fov = 90 / 360 * TRI_2PI;

      // we flip near and far plane for reverse z
      mat4.perspectiveZO(scratch.lightProjection, fov, 1, lightData.radius, lightData.radius / 1000);

      for (let y = 0; y < 2; y++)
      {
        for (let x = 0; x < 3; x++)
        {
          const direction = POINT_LIGHT_DIRECTIONS[x + y * 3];

          vec3.set(scratch.lightUp, direction[2], direction[0], direction[1]);
          vec3.subtract(scratch.lightAt, lightData.position, direction);
          mat4.lookAtCarbon(scratch.lightView, lightData.position, scratch.lightAt, scratch.lightUp);

          const cell = lightManager.GetUnpackedShadowMapData(lightData, scratch.lightCell);
          const shadowMapOffsetX = cell.shadowMapOffsetX + x * cell.shadowMapScale;
          const shadowMapOffsetY = cell.shadowMapOffsetY + y * cell.shadowMapScale;

          this.RenderShadowMapForSpotLight(renderContext, shadowCasters, cell.shadowMapScale, shadowMapOffsetX, shadowMapOffsetY,
            lightData.position, scratch.lightView, scratch.lightProjection, shadowMap);
        }
      }
    }
    else
    {
      // spotlight
      const matrices = this.GetLightMatrices(lightData, scratch.lightMatrices);
      const cell = lightManager.GetUnpackedShadowMapData(lightData, scratch.lightCell);

      this.RenderShadowMapForSpotLight(renderContext, shadowCasters, cell.shadowMapScale, cell.shadowMapOffsetX, cell.shadowMapOffsetY,
        lightData.position, matrices.view, matrices.projection, shadowMap);
    }
  }

  /**
   * Carbon EveSpaceScene::FinishRenderingShadowMapForLights (cpp:2620-2627):
   * unbinds the atlas PrepareShadowMapForLights bound and rebinds the scene's
   * per-frame data, which the light passes replaced.
   *
   * @param {Tr2RenderContext} renderContext The frame's context.
   * @returns {void}
   */
  @blue.method
  @meta.implemented
  FinishRenderingShadowMapForLights(renderContext)
  {
    const esm = renderContext.GetEffectStateManager();

    renderContext.SetReadOnlyDepth(true);

    esm.PopRenderTarget();
    esm.PopDepthStencilBuffer();
    this.ApplyPerFrameData(renderContext);
  }

  /**
   * Carbon EveSpaceScene::GetLightMatrices (cpp:4175-4193): a spot light's
   * camera, a reversed-depth perspective whose near plane is the light's
   * radius and far plane a thousandth of it, looking along the light's
   * direction.
   *
   * Adapted: Carbon's two output references become one record, filled and
   * returned, as a C++ output pointer becomes the return value here.
   *
   * @param {object} lightData The light's record.
   * @param {{projection: mat4, view: mat4}} out Receives the matrices.
   * @returns {{projection: mat4, view: mat4}} out
   */
  @blue.method
  @meta.adapted
  GetLightMatrices(lightData, out)
  {
    // we flip near and far plane for reverse z
    const zn = lightData.radius;
    const zf = lightData.radius / 1000;
    const aspect = 1;
    const d = lightData.projectionPlaneDistance;
    const projection = mat4.identity(out.projection);

    // Carbon m[r][c] is flat r * 4 + c on the shared layout.
    projection[0] = d / aspect;
    projection[5] = d;
    projection[10] = zf / (zn - zf);
    projection[11] = -1;
    projection[14] = (zf * zn) / (zn - zf);
    projection[15] = 0;

    const up = Math.abs(lightData.direction[1]) < 0.7 ? LIGHT_UP_Y : LIGHT_UP_X;

    vec3.subtract(lightMatricesAtScratch, lightData.position, lightData.direction);
    mat4.lookAtCarbon(out.view, lightData.position, lightMatricesAtScratch, up);

    return out;
  }

  /**
   * Carbon scene fog/cloud ordering (EveSpaceScene.cpp:2437-2477).
   * Adapted: context transforms replace the renderer's pending view statics;
   * returned pool handles require explicit release by the caller.
   */
  @blue.method
  @meta.adapted
  RenderVolumetrics(depthMap, gpuResourcePool, renderContext)
  {
    if (!this.componentRegistry || !this.volumetricsRenderer || !depthMap.IsValid())
    {
      // Native bug: cpp:2441 reverses the ordinary (fog, clouds) tuple.
      return [Tr2VolumetricsRenderer.getEmptyVolumetricTexture(gpuResourcePool),
        Tr2VolumetricsRenderer.getEmptyFogTexture(gpuResourcePool)];
    }
    const fog = this.volumetricsRenderer.RenderFog(renderContext, gpuResourcePool,
      depthMap.GetWidth(), depthMap.GetHeight(), this.cascadedShadowMap, null,
      this.shadowQualitySetting, this.sunDirection, this.currentSunColor,
      this.updateContext.GetOrigin(), this.updateContext.GetOriginShift(),
      renderContext.GetViewTransform(), renderContext.GetReversedDepthProjectionTransform(),
      this.viewLast, this.projectionLast);
    try
    {
      const clouds = this.volumetricsRenderer.RenderVolumetrics(this.componentRegistry,
        this.updateContext.GetFrustum(), depthMap, fog.Get(), this.sunDirection,
        this._perFramePS.Get("VolumetricSlices"),
        this.shadowQualitySetting === ShadowQuality.SHADOW_RAYTRACED && this._enableShadows,
        gpuResourcePool, renderContext);
      return [fog, clouds];
    }
    catch (error)
    {
      gpuResourcePool.Free(fog);
      throw error;
    }
  }

  /**
   * Carbon EveSpaceScene::PopulateAndApplyPerFrameData: fills both per-frame
   * blocks and binds them. The render driver runs it before the GPU particle
   * update, whose kernels read the per-frame data.
   *
   * @param {Tr2RenderContext} renderContext The context to bind on.
   * @returns {void}
   */
  @blue.method
  @meta.implemented
  PopulateAndApplyPerFrameData(renderContext)
  {
    this.PopulatePerFramePSData(this._perFramePS, renderContext);
    this.PopulatePerFrameVSData(this._perFrameVS, renderContext);
    this.ApplyPerFrameData(renderContext);
  }

  /**
   * Carbon EveSpaceScene::ApplyPerFrameData (cpp:818-828): uploads and binds
   * both per-frame blocks. The VERTEX block is bound for every non-pixel
   * stage the backend has - vertex always, compute, geometry, hull and domain
   * where SHADER_TYPE_EXISTS - because compute passes read it too: dynamic
   * exposure's measure pass reads Time (register 45.x) to advance its
   * adaptation, and with the block bound for vertex only it read zero and
   * exposure never left its initial 0.
   *
   * The buffers are by-value members, sized by FillAndSetConstants as
   * Carbon's are.
   *
   * @param {Tr2RenderContext} renderContext The context to bind on.
   * @returns {void}
   */
  @blue.method
  @meta.implemented
  ApplyPerFrameData(renderContext)
  {
    this._FillAndSetPerFrameConstants(this._perFrameVS, this._perFramePS, renderContext);
  }

  /**
   * Fills and binds the per-frame VS and PS constant buffers from the given
   * records: ApplyPerFrameData's body (cpp:818-828), shared with
   * SetupTransformsForPicking's local records (cpp:3838-3845).
   */
  _FillAndSetPerFrameConstants(perFrameVS, perFramePS, renderContext)
  {
    const shaderTypeMask = renderContext.GetRenderContextAL().constructor.SHADER_TYPE_MASK;
    const perFrameVsMask = (1 << ShaderType.VERTEX_SHADER) | (shaderTypeMask & (
      (1 << ShaderType.COMPUTE_SHADER)
      | (1 << ShaderType.GEOMETRY_SHADER)
      | (1 << ShaderType.HULL_SHADER)
      | (1 << ShaderType.DOMAIN_SHADER)
    ));

    const vs = perFrameVS.GetData();
    const ps = perFramePS.GetData();

    Tr2RenderUtils.fillAndSetConstants(this._perFrameVSBuffer, vs, vs.byteLength, perFrameVsMask, PER_FRAME_VS, renderContext);
    Tr2RenderUtils.fillAndSetConstants(this._perFramePSBuffer, ps, ps.byteLength, 1 << ShaderType.PIXEL_SHADER, PER_FRAME_PS, renderContext);
  }

  /**
   * Fills the per-frame VERTEX constants (Carbon
   * EveSpaceScene::PopulatePerFrameVSData, cpp:3015-3068).
   *
   * Carbon reads the camera off `Tr2Renderer` statics and the render-target /
   * viewport sizes off `renderContext.m_esm`; here those are read through
   * _EngineFrameState from the render context. Everything the scene itself
   * owns - sun, fog, env-map rotation, the previous frame's view/projection -
   * is read from the scene, as Carbon does.
   *
   * Matrices are stored TRANSPOSED because the shaders are column_major, with
   * one deliberate exception Carbon calls out at cpp:3037-3038: the value wanted
   * for `ViewInverseTransposeMat` is already a transpose, so transposing it again
   * cancels and the inverse view is copied in as-is.
   *
   * Carbon's PopulatePerFrameVSData( data, renderContext ) (cpp:3029).
   *
   * Adapted: Tr2Renderer view statics and the ESM's render-target/viewport sizes are read
   * through _EngineFrameState.
   *
   * @param {Object} data - the per-frame VS record to fill (Carbon m_perFrameVS,
   *   or a local one as the shadow pass uses, cpp:760-769)
   * @param {Object} renderContext - the frame's Tr2RenderContext
   * @returns {Object} data
   */
  @blue.method
  @meta.adapted
  PopulatePerFrameVSData(data, renderContext)
  {
    const out = data;
    const frame = this._EngineFrameState(renderContext);
    const view = renderContext.GetViewTransform();
    // Carbon's frame is reverse-Z: the shaders get the REVERSED-depth
    // projection (cpp:3022), matching the inverted depth test and the clear to
    // 0 the driver sets. The forward one here put depth the other way round.
    const projection = renderContext.GetReversedDepthProjectionTransform();

    // column_major for shaders
    out.SetAndTranspose("ViewMat", view);
    out.SetAndTranspose("ProjectionMat", projection);

    // Carbon `view * proj` (row-vector); gl-matrix swaps the operands.
    mat4.multiply(perFrameMatrixScratch, projection, view);
    out.SetAndTranspose("ViewProjectionMat", perFrameMatrixScratch);

    // "need the transposed, but shader also needs column_major, so it is
    // transpose(transpose(m)) == m" (cpp:3037-3038): a plain copy.
    out.SetWithoutTransposing("ViewInverseTransposeMat", renderContext.GetInverseViewTransform());

    // Carbon `m_projectionLast * m_jitterMatrix` then `m_viewLast * that`.
    mat4.multiply(perFrameLastProjectionScratch, this.jitterMatrix, this.projectionLast);
    out.SetAndTranspose("ProjLast", perFrameLastProjectionScratch);
    out.SetAndTranspose("ViewLast", this.viewLast);
    mat4.multiply(perFrameMatrixScratch, perFrameLastProjectionScratch, this.viewLast);
    out.SetAndTranspose("ViewProjectionLast", perFrameMatrixScratch);

    // Each scene has a nebula, and that can be rotated and inverted by scaling.
    mat4.fromQuat(perFrameMatrixScratch, this.envMapRotation);
    out.SetAndTranspose("EnvMapRotationMat", perFrameMatrixScratch);

    this._FillSunData(out);

    out.Set("TargetResolution", [
      frame.renderTargetWidth ?? 0,
      frame.renderTargetHeight ?? 0
    ]);

    this._FillFovXY(out, frame);

    // Guarded so a zero-width fog band cannot divide by zero (cpp:3049-3054).
    let distance = this.fogEnd - this.fogStart;
    if (Math.abs(distance) < 1e-5)
    {
      distance = 1e-5;
    }
    out.Set("FogFactors", [ this.fogEnd / distance, 1 / distance, this.fogMax ]);

    // Derived from SetupViewport in Tr2Renderer.cpp (cpp:3056-3062).
    const viewport = renderContext.GetViewport();
    const device = frame.deviceViewport ?? viewport;

    if (viewport && device)
    {
      out.Set("ViewportAdjustment", [
        viewport.x < 0 ? -1 : 1,
        viewport.y + viewport.height > (frame.renderTargetHeight ?? 0) ? -1 : 1,
        device.width / viewport.width,
        device.height / viewport.height
      ]);
    }

    out.Set("Time", frame.animationTime ?? 0);
    out.Set("Upscaling", this.upscalingAmount);
    out.Set("ViewportSize", device ? [ device.width, device.height ] : [ 0, 0 ]);

    return out;
  }

  /**
   * Carbon's EveSpaceScene::BeginRender( enableDistortion, renderContext )
   * (cpp:1308-1436) - PARTIAL: only its tail is here (cpp:1427-1436): the
   * lensflares' pre-render update against this frame's frustum, then the
   * per-frame PS and VS fills and ApplyPerFrameData. Carbon populates after the
   * gather because the blended sun colour is only current once lights have been
   * gathered. The earlier part of Carbon's body (display gate, SH lighting,
   * data textures, jitter, the lighting-override blend, fog settings, managed
   * rendering, light manager, gather, raytraced shadows, UpdateVariableStore,
   * light gather) still runs in EveSpaceSceneRenderDriver._RenderMainPass.
   *
   * Adapted: Only the tail of Carbon's BeginRender has moved here; the rest is still in the
   * render driver.
   *
   * @param {boolean} _enableDistortion - Carbon's gather flag; the gather is
   *   not in this part yet
   * @param {Object} renderContext - the frame's Tr2RenderContext
   * @returns {void}
   */
  @blue.method
  @meta.adapted
  BeginRender(_enableDistortion, renderContext)
  {
    if (!this.display) return;

    // The current visualizer's effect, created on first use (cpp:1315-1322).
    if (this.visualizeMethod !== EveVisualizeMethod.VM_NONE)
    {
      const visualizerEffect = this._visualizerEffects[this.visualizeMethod];
      if (!visualizerEffect.effect)
      {
        visualizerEffect.effect = new Tr2Effect();
        visualizerEffect.effect.SetEffectPathName(VISUALIZER_EFFECT_PATH[this.visualizeMethod]);
      }
    }

    // Carbon opens BeginRender's managed-rendering span here (cpp:1381-1382);
    // RenderBackgroundPass closes it (cpp:2083).
    const esm = renderContext.GetEffectStateManager();
    esm.BeginManagedRendering();
    esm.ApplyStandardStates(RenderingMode.RM_OPAQUE);

    for (const lensflare of this.lensflares) lensflare.PrepareRender(this.updateContext.GetFrustum());

    this.PopulatePerFramePSData(this._perFramePS, renderContext);
    this.PopulatePerFrameVSData(this._perFrameVS, renderContext);
    this.ApplyPerFrameData(renderContext);
  }

  /**
   * Carbon's PopulatePerFramePSData( data, renderContext ) (cpp:3084): fills
   * data with the scene's own cascaded shadow map.
   *
   * @param {Object} data - the per-frame PS record to fill (Carbon m_perFramePS)
   * @param {Object} renderContext - the frame's Tr2RenderContext
   * @returns {Object} data
   */
  @blue.method
  @meta.implemented
  PopulatePerFramePSData(data, renderContext)
  {
    return this.PopulatePerFramePSData__ShadowMap(data, this.cascadedShadowMap, renderContext);
  }

  /**
   * Carbon's PopulatePerFramePSData( data, shadowMap, renderContext )
   * (cpp:3089-3202), named by its extra shadowMap parameter: fills the
   * per-frame PIXEL constants.
   *
   * The cascaded-shadow block (ShadowMapValues / CascadeRanges /
   * ShadowMatrixVal / SplitInfo) is filled only when a shadow map is passed,
   * exactly as Carbon's `if( shadowMap )` gate does; without one the record
   * leaves the persistent cascade bytes untouched. `ShadowCameraRange` remains
   * disabled, so stale cascade bytes are not consumed until a map is supplied
   * again.
   *
   * Adapted: Tr2Renderer statics, the ESM viewport, Tr2LightManager's atlas settings and the
   * upscaler's mip bias are read through _EngineFrameState.
   *
   * @param {Object} data - the per-frame PS record to fill
   * @param {Tr2ShadowMap|null} shadowMap - null disables cascade packing
   * @param {Object} renderContext - the frame's Tr2RenderContext
   * @returns {Object} data
   */
  @meta.adapted
  PopulatePerFramePSData__ShadowMap(data, shadowMap, renderContext)
  {
    const out = data;
    const frame = this._EngineFrameState(renderContext);
    // The reversed-depth projection, as the vertex fill (cpp:3140).
    const projection = renderContext.GetReversedDepthProjectionTransform();

    out.SetAndTranspose("ViewMat", renderContext.GetViewTransform());

    // transpose(transpose(m)) == m, as in the vertex fill (cpp:3093-3094): a plain copy.
    out.SetWithoutTransposing("ViewInverseTransposeMat", renderContext.GetInverseViewTransform());

    mat4.fromQuat(perFrameMatrixScratch, this.envMapRotation);
    out.SetAndTranspose("EnvMapRotationMat", perFrameMatrixScratch);

    this._FillSunData(out);

    // The pixel fill alone overrides the sun's alpha with the roughness
    // (cpp:3087) - the vertex fill leaves the blended colour's own alpha.
    out.Set("Sun.DiffuseColor", [
      this.currentSunColor[0],
      this.currentSunColor[1],
      this.currentSunColor[2],
      this.defaultDiffuseRoughness
    ]);

    out.Set("AmbientColor", [ this.ambientColor[0], this.ambientColor[1], this.ambientColor[2] ]);
    out.Set("ReflectionIntensity", this.currentReflectionIntensity);
    out.Set("FogColor", [ this.fogColor[0], this.fogColor[1], this.fogColor[2], this.fogMax ]);

    out.Set("GammaBrightness", frame.gammaBrightness ?? 0);

    out.Set("TargetResolution", [
      frame.renderTargetWidth ?? 0,
      frame.renderTargetHeight ?? 0
    ]);

    this._FillFovXY(out, frame);

    // Shadows are disabled by default (cpp:3107).
    out.Set("ShadowCameraRange", [ 1, 0 ]);

    const viewport = renderContext.GetViewport();
    const device = frame.deviceViewport ?? viewport;

    out.Set("ViewportOffset", viewport ? [ viewport.x, viewport.y ] : [ 0, 0 ]);
    out.Set("ViewportSize", device ? [ device.width, device.height ] : [ 0, 0 ]);

    out.Set("Time", frame.animationTime ?? 0);

    out.Set("FrameIndex", frame.frameIndex ?? 0);
    out.Set("Jittering", vec4.exactEquals(this.jitter, ZERO_JITTER) ? 0 : 1);

    // Carbon stores 1 << m_shadowQuality, not the enum value.
    out.Set("ShadowQuality", 1 << this.shadowQualitySetting);

    out.Set("InverseShadowMapAtlasSize", frame.inverseShadowMapAtlasSize ?? 0);
    out.Set("ShadowMapAtlasEntryMinSizeLog2", frame.shadowMapAtlasEntryMinSizeLog2 ?? 0);

    out.Set("ShadowMapSettings", [ 1, 1, 0, 0 ]);
    out.Set("ShadowLightness", 0);
    out.Set("DepthMapSampleCount", 1); // legacy

    // The reversed-depth projection's _43/_33, which the shader uses to turn a
    // depth sample back into a view-space distance (cpp:3140-3142).
    out.Set("ProjectionToView", [ projection[14], projection[10] ]);

    // Carbon resets m_upscalingAmount here and lets the upscaler raise it; with
    // no upscaler the scene stays at 1 and only the post-process bias applies.
    this.upscalingAmount = frame.upscalingAmount ?? 1;
    out.Set("Upscaling", this.upscalingAmount);
    out.Set("SceneMipLodBias", frame.sceneMipLodBias ?? 0);

    if (shadowMap)
    {
      this._FillShadowCascades(out, shadowMap, renderContext);
    }

    // Carbon writes Inverse(Transpose(P)). RawData supplies that terminal
    // transpose, so derive only the logical inverse here.
    mat4.invert(perFrameMatrixScratch, projection);
    out.SetAndTranspose("ProjectionInverseMat", perFrameMatrixScratch);

    out.Set("Debug", this.perFrameDebug);

    out.Set("VolumetricSlices", VOLUMETRIC_SLICES);

    this.volumetricsRenderer.PopulatePerFrameData(out);

    return out;
  }

  /**
   * The SunData block both fills share (cpp:3035-3039 / 3085-3089). The
   * direction is normalized AND negated: shaders work with the direction TO
   * the light, not the direction it travels.
   */
  _FillSunData(out)
  {
    vec3.normalize(sunDirectionScratch, this.sunDirection);
    out.Set("Sun.DirWorld", [
      -sunDirectionScratch[0],
      -sunDirectionScratch[1],
      -sunDirectionScratch[2]
    ]);
    out.Set("Sun.DiffuseColor", this.currentSunColor);
  }

  /**
   * FOV both ways - width in x, height in y (cpp:3046-3047 / 3103-3104).
   * Carbon recovers it from the NON reversed-depth projection, so a driver
   * that reverses depth must pass the original in `frame.projectionTransform`.
   */
  _FillFovXY(out, frame)
  {
    const source = frame.projectionTransform;
    const fovY = source ? EveCamera.CalculateFovFromProjection(source) : 0;

    out.Set("FovXY", [ fovY * (frame.aspectRatio ?? 1), fovY ]);
  }

  /**
   * The cascaded-shadow block (cpp:3163-3190). Each cascade's shadow matrix is
   * rebased into the current view, flipped in y, remapped from (-1,+1) to
   * (0,1), then scaled and offset into its cell of the 8x2 atlas.
   */
  _FillShadowCascades(out, shadowMap, renderContext)
  {
    const split = shadowMap.GetPerSplitData();

    for (let index = 0; index < 4; index++)
    {
      out.SetIndex("ShadowMapValues", index, split.ShadowMapValues[index]);
    }

    for (let index = 0; index < 16; index++)
    {
      out.SetIndex("CascadeRanges", index, split.CascadeRanges[index]);
    }

    const inverseView = renderContext.GetInverseViewTransform();
    const cellsX = 8;
    const cellsY = 2;

    for (let index = 0; index < CjsPerFrameLayouts.SHADOW_FRUSTUM_COUNT; index++)
    {
      const stored = split.ShadowMatrixVal[index];

      // Carbon stores Transpose(LVP), then computes inverseView * LVP. The JS
      // producer keeps logical LVP, so gl-matrix reverses only that product.
      mat4.multiply(perFrameMatrixScratch, stored, inverseView);

      // Flip y and change the range from (-1, +1) to (0, 1).
      mat4.multiply(perFrameMatrixScratch, SHADOW_CLIP_TO_UV, perFrameMatrixScratch);

      // Then into this cascade's cell of the 8x2 atlas.
      mat4.identity(perFrameLastProjectionScratch);
      mat4.translate(perFrameLastProjectionScratch, perFrameLastProjectionScratch, [
        (index % cellsX) / cellsX,
        Math.floor(index / cellsX) / cellsY,
        0
      ]);
      mat4.scale(perFrameLastProjectionScratch, perFrameLastProjectionScratch, [
        1 / cellsX,
        1 / cellsY,
        1
      ]);
      mat4.multiply(perFrameMatrixScratch, perFrameLastProjectionScratch, perFrameMatrixScratch);

      out.SetAndTransposeIndex("ShadowMatrixVal", index, perFrameMatrixScratch);
    }

    out.Set("SplitInfo", split.SplitInfo);
  }

  /**
   * Carbon EveSpaceScene::OnListModified (cpp:3414-3491): the scene's lists
   * register what enters them and unregister what leaves. An inserted object
   * joins the SH lighting manager as a secondary light source and the quad
   * renderer, and an entity in objects, backgroundObjects or planets joins the
   * component registry; a removed one leaves the manager (its SH lighting
   * cleared) and the registry; unloading a list does the same for all of it.
   * Casts are Carbon's BlueCastPtr, CjsSchema.cast.
   *
   * The subscribed BlueList raises these events from Append/Remove;
   * a plain array push raises none, and ReregisterEntities joins such late
   * objects instead.
   *
   * @param {number} event A BLUELISTEVENT value.
   * @param {number} _key Index of the change.
   * @param {number} _key2 Second index (swap/move).
   * @param {object|null} value The inserted or removed item.
   * @param {Array} list The list that changed.
   */
  @blue.method
  @meta.implemented
  OnListModified(event, _key = 0, _key2 = 0, value = null, list = null)
  {
    const entityList = list === this.objects || list === this.backgroundObjects || list === this.planets;
    switch (event & BLUELISTEVENT.BELIST_EVENTMASK)
    {
      case BLUELISTEVENT.BELIST_UNLOADSTART:
        if (this._shLightingManager)
        {
          for (const item of list)
          {
            CjsSchema.cast(item, ITr2SecondaryLightSource)?.UnregisterSecondaryLightSource(this._shLightingManager);
            CjsSchema.cast(item, ITr2ShLightingReceiver)?.ClearShLighting();
          }
        }
        if (entityList && this.componentRegistry)
        {
          for (const item of list) CjsSchema.cast(item, EveEntity)?.UnRegister(this.componentRegistry);
        }
        break;
      case BLUELISTEVENT.BELIST_INSERTED:
        if (this._shLightingManager)
        {
          CjsSchema.cast(value, ITr2SecondaryLightSource)?.RegisterSecondaryLightSource(this._shLightingManager);
        }
        CjsSchema.cast(value, IEveSpaceObject2)?.RegisterWithQuadRenderer(Tr2QuadRenderer.Instance());
        if (entityList && this.componentRegistry)
        {
          CjsSchema.cast(value, EveEntity)?.Register(this.componentRegistry);
        }
        break;
      case BLUELISTEVENT.BELIST_REMOVED:
        if (this._shLightingManager)
        {
          CjsSchema.cast(value, ITr2SecondaryLightSource)?.UnregisterSecondaryLightSource(this._shLightingManager);
          CjsSchema.cast(value, ITr2ShLightingReceiver)?.ClearShLighting();
        }
        if (entityList && this.componentRegistry)
        {
          CjsSchema.cast(value, EveEntity)?.UnRegister(this.componentRegistry);
        }
        break;
      default:
        break;
    }
  }

  /**
   * Re-registers the scene entities and their quad effects with the live registry.
   * Carbon ReregisterEntities (EveSpaceScene.cpp:4112-4137).
   *
   * Adapted: Does nothing after the registry has been cleared. Plain-array insertion
   * has no Blue list event, so late objects also register their quad effects here;
   * Carbon performs that registration in OnListModified (cpp:3471-3475).
   *
   * @returns {void}
   */
  @blue.method
  @meta.adapted
  ReregisterEntities()
  {
    if (!this.componentRegistry)
    {
      return;
    }

    const quadRenderer = Tr2QuadRenderer.Instance();
    for (const collection of [this.objects, this.backgroundObjects, this.planets])
    {
      for (const object of collection)
      {
        // Carbon casts to IEveSpaceObject2 (BlueCastPtr, cpp:3462).
        CjsSchema.cast(object, IEveSpaceObject2)?.RegisterWithQuadRenderer(quadRenderer);
        if (object instanceof EveEntity)
        {
          this.componentRegistry.ReRegister(object);
        }
      }
    }
    if (this.cameraAttachmentParent instanceof EveEntity)
    {
      this.componentRegistry.ReRegister(this.cameraAttachmentParent);
    }
  }

  /** Carbon method ClearComponentRegistry (EveSpaceScene.cpp:4091-4099, called
   * from the destructor cpp:322). Entity component-state is deliberately NOT
   * cleared beyond what Clear() does - either the scene is being destroyed
   * (entities go too) or entities move to another scene and re-register there.
   * The JS registry Clear() additionally detaches entity.registry when it
   * points at this registry - strictly more hygienic than Carbon; kept. */
  @blue.method
  @meta.implemented
  ClearComponentRegistry()
  {
    this.componentRegistry?.Clear();
    this.componentRegistry = null;
  }

  /** Carbon method GetPostProcessDebug (MAP_METHOD_AND_WRAP). */
  @blue.method
  @meta.implemented
  GetPostProcessDebug()
  {
    return this.postProcessDebug;
  }

  /** Carbon method UpdateScene -> UpdateSceneFromScript (MAP_METHOD_AND_WRAP). */
  @blue.method
  @meta.implemented
  UpdateScene(time)
  {
    return this.Update(time, time);
  }

  static EveVisualizeMethod = EveVisualizeMethod;

  /** EveSpaceScene::VisualizerEffect::VisualizerType (h:573-578). */
  static VisualizerType = VisualizerType;

  /** Carbon EveSpaceScene::PerThreadAccumulator (public, h:194-200). */
  static PerThreadAccumulator = EveSpaceScenePerThreadAccumulator;

  /** g_eveSpaceSceneGammaBrightness (TRI_REGISTER_SETTING "eveSpaceSceneGammaBrightness",
   * cpp:102-103): the tonemapper's OutputGamma and the per-frame GammaBrightness. */
  @meta.setting("eveSpaceSceneGammaBrightness")
  static eveSpaceSceneGammaBrightness = 1;

  /** g_eveSpaceSceneDynamicLighting ("eveSpaceSceneDynamicLighting", cpp:109-110): local lights, off as Carbon ships it. */
  @meta.setting("eveSpaceSceneDynamicLighting")
  static eveSpaceSceneDynamicLighting = false;

  /** g_enablePostProcessDebugging ("enablePostProcessDebugging", cpp:118-119): records how the post-process attributes combined. */
  @meta.setting("enablePostProcessDebugging")
  static enablePostProcessDebugging = false;

  /** g_eveSpaceSceneVisibilityThreshold ("eveSpaceSceneVisibilityThreshold", cpp:75-76), in pixels. */
  @meta.setting("eveSpaceSceneVisibilityThreshold")
  static eveSpaceSceneVisibilityThreshold = 5;

  /** g_eveSpaceSceneLowDetailThreshold ("eveSpaceSceneLowDetailThreshold", cpp:81, 87). */
  @meta.setting("eveSpaceSceneLowDetailThreshold")
  static eveSpaceSceneLowDetailThreshold = 100;

  /** g_eveSpaceSceneMediumDetailThreshold ("eveSpaceSceneMediumDetailThreshold", cpp:82, 88). */
  @meta.setting("eveSpaceSceneMediumDetailThreshold")
  static eveSpaceSceneMediumDetailThreshold = 400;

  /** g_eveSpaceSceneHighDetailThreshold ("eveSpaceSceneHighDetailThreshold", cpp:83, 89). */
  @meta.setting("eveSpaceSceneHighDetailThreshold")
  static eveSpaceSceneHighDetailThreshold = 800;

  /** g_eveSpaceSceneLODFactor ("eveSpaceSceneLODFactor", cpp:84, 90). */
  @meta.setting("eveSpaceSceneLODFactor")
  static eveSpaceSceneLODFactor = 1;

  static ShadowQuality = ShadowQuality;

  /**
   * Carbon SimplePriorityBlend (PriorityBlend.h:371-413) specialized to the
   * IEveLightingOverride::Overrides value type
   * { sunColor: vec4, sunIntensity, backgroundIntensity, reflectionIntensity }
   * (EveChildLightingOverride.h:15-32) - `+` and `* weight` componentwise.
   * Walks the (already priority-desc-sorted) list in equal-priority groups:
   *   factor = (1 / max(groupTotal, 1)) * remainingWeight
   * then subtracts the UNCLAMPED group total from remainingWeight. Two quirks
   * preserved exactly: (a) a group with total intensity 0.3 contributes at
   * weight 0.3*remaining and leaves 0.7 for lower priorities; (b) a group with
   * total 2 is normalized to consume exactly remainingWeight and terminates
   * (remaining goes to -1).
   * @param {Array} sources - [{ priority, intensity, value }] sorted high->low
   * @returns {{ sunColor: Float32Array, sunIntensity: Number,
   *   backgroundIntensity: Number, reflectionIntensity: Number }}
   */
  static _SimplePriorityBlend(sources)
  {
    const result = {
      sunColor: vec4.create(),
      sunIntensity: 0,
      backgroundIntensity: 0,
      reflectionIntensity: 0
    };
    let remainingWeight = 1;

    for (let first = 0; first < sources.length;)
    {
      // The range of sources sharing the current priority.
      let last = first + 1;
      while (last < sources.length && sources[last].priority === sources[first].priority)
      {
        last++;
      }

      let totalPriorityIntensity = 0;
      for (let index = first; index < last; index++)
      {
        totalPriorityIntensity += sources[index].intensity;
      }
      if (totalPriorityIntensity === 0)
      {
        first = last;
        continue;
      }

      const normalizationFactor = 1 / Math.max(totalPriorityIntensity, 1) * remainingWeight;

      for (let index = first; index < last; index++)
      {
        const weight = sources[index].intensity * normalizationFactor;
        const value = sources[index].value;
        vec4.scaleAndAdd(result.sunColor, result.sunColor, value.sunColor, weight);
        result.sunIntensity += value.sunIntensity * weight;
        result.backgroundIntensity += value.backgroundIntensity * weight;
        result.reflectionIntensity += value.reflectionIntensity * weight;
      }

      // Subtracts the UNCLAMPED total (PriorityBlend.h:405).
      remainingWeight -= totalPriorityIntensity;
      first = last;
      if (remainingWeight <= 0)
      {
        break;
      }
    }
    return result;
  }

}


// TRI_REGISTER_SETTING( "eveReflectionSetting", g_eveReflectionMode )
// (cpp:112-113). The value is EntityComponents' module variable, not a class
// static, so it is registered here through its accessors.
new TriSettingsRegistrar("eveReflectionSetting", {
  get eveReflectionSetting() { return EntityComponents.getReflectionSetting(); },
  set eveReflectionSetting(value) { EntityComponents.setReflectionSetting(value); }
}, "eveReflectionSetting", { enum: ReflectionSetting, carbon: true });

