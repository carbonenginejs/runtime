// Source: trinity/trinity/Eve/EveSpaceScene.h
// Source: trinity/trinity/Eve/EveSpaceScene.cpp
//
// Hand-maintained (promoted from src/trinity/generated/eve/scene; the generator skips it
// while this file exists). Fields mirror the generated schema shell; the
// additions are the per-frame update driver ported from Carbon
// EveSpaceScene::Update and the scene-owned EveUpdateContext member (Carbon
// m_updateContext - protected, so absent from the Blue schema scan).
import { CjsSchema, meta } from "#schema";
import { IsMatch, BlueList, IInitialize, INotify, IListNotify } from "#blue";
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
import { Tr2PostProcess2 } from "../../postProcess/Tr2PostProcess2.js";
import { Tr2PostProcessAttributes } from "../../postProcess/Tr2PostProcessAttributes.js";
import { Tr2DataTextureManager } from "../../shader/Tr2DataTextureManager.js";
import { EveComponentType, GetReflectionSetting, ReflectionSetting, SetReflectionSetting } from "../EveComponentTypes.js";
import { TriSettingsRegistrar } from "../../core/TriSettingsRegistrar.js";
import { EveUpdateContext } from "../EveUpdateContext.js";
import { EveEffectRoot2 } from "../spaceObject/EveEffectRoot2.js";
import { EveCamera } from "../camera/EveCamera.js";
import { CjsPerFrameLayouts } from "../../core/rawData/CjsPerFrameLayouts.js";
import { PixelFormat, RenderState, ShaderType, TextureType, Tr2GpuUsage, Tr2LoadAction, Tr2StoreAction } from "#consts/render-context";
import { Tr2ColorAttachment, Tr2DepthAttachment, Tr2SubresourceData } from "#trinityal";
import { RenderingMode, TriBatchType } from "#consts/graphics";
import { EffectKeyGenerator, TriRenderBatchAccumulator } from "../../core/batch/TriRenderBatch/index.js";
import { FillAndSetConstants } from "../../core/Tr2RenderUtils.js";
import { PER_FRAME_PS, PER_FRAME_VS, Tr2Renderer } from "../../core/Tr2Renderer.js";
import * as CcpLog from "../../../global/logging/ccpLog.js";
import { BackgroundRenderingReason } from "../../generated/eve/enums.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../../core/context/Tr2RenderContext.js";
import { Tr2OcclusionBuffer } from "../effect/lensflare/Tr2OcclusionBuffer.js";
import { Tr2VariableStore } from "../../core/variable/Tr2VariableStore.js";
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
import { EveVisualizeMethod } from "../../generated/eve/enums.js";
import { ShadowQuality, Tr2RenderReason } from "../../generated/trinityCore/enums.js";
import { TriFrustum } from "../../core/view/TriFrustum.js";
import { TriShadowOrthoFrustum } from "./shadows/TriShadowOrthoFrustum.js";
import { GpuResourceHandle } from "../../core/Tr2GpuResourcePool/GpuResourceHandle.js";
import { blue } from "#blue";
import { ExecuteMainThreadActions } from "../../core/continueOnMainThread.js";
import "./EveSpaceSceneRenderDriver.js";


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
// 10c. `scene.PopulatePerFramePSData(renderContext, frame, shadowMap)` then
//     `scene.PopulatePerFrameVSData(renderContext, frame)` - Carbon's order at
//     cpp:1424-1425, PS first, because the pixel fill is what resolves
//     m_upscalingAmount that the vertex fill then reads. Runs after GatherLights
//     so the blended sun colour is current. The engine binds the two records at
//     Tr2Renderer::GetPerFrame{VS,PS}StartRegister; their layouts are published
//     on the `/perframe` subpath.
// 11. (driver) `for (const lf of scene.lensflares)
//     lf.PrepareRender(frustum)` (cpp:1419-1422). EveLensflare still needs that
//     Carbon method ported; its absence is an explicit driver-readiness gap,
//     not an optional capability to hide with a guarded call.
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
@meta.define({ className: "EveSpaceScene", family: "eve/scene" })
@meta.blue.inherit(ITr2Scene, ITr2Updateable, IInitialize, INotify, IListNotify)
export class EveSpaceScene
{

  /** m_visualizeMethod (EveVisualizeMethod - enum EveVisualizeMethod) [READWRITE, ENUM] */
  @meta.blue.readwrite
  @meta.type.int32
  @meta.type.enum("trinity.EveSpaceScene.EveVisualizeMethod")
  visualizeMethod = 0;

  /** m_envMap1ResPath (std::string) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.path
  envMap1ResPath = "";

  /** m_envMap2ResPath (std::string) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.path
  envMap2ResPath = "";

  /** m_envMap3ResPath (std::string) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.path
  envMap3ResPath = "";

  /** m_lowQualityNebulaResPath (std::string) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.path
  lowQualityNebulaResPath = "";

  /** m_lowQualityNebulaMixResPath (std::string) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.path
  lowQualityNebulaMixResPath = "";

  /** m_envMapResPath (std::string) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.path
  envMapResPath = "";

  /** m_fogColor (Color) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  fogColor = vec4.fromValues(0.25, 0.25, 0.25, 1);

  /** m_sunData.DirWorld (Vector3) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  sunDirection = vec3.fromValues(0, -1, 0);

  /** m_ambientColor (Color) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  ambientColor = vec4.fromValues(0.25, 0.25, 0.25, 1);

  /** m_shLightingManager (Tr2ShLightingManagerPtr) [PERSISTONLY] */
  @meta.blue.readwrite
  @meta.blue.persistOnly
  @meta.type.model("Tr2ShLightingManager")
  shLightingManager = null;

  /** m_combinedPostProcessAttributes (Tr2PostProcessAttributesPtr) [READ] -
   * default-constructed like Carbon's ctor CreateInstance (cpp:297); refreshed
   * by UpdatePostProcessAttributes' re-export at MEDIUM_PRIORITY (cpp:407). */
  @meta.blue.read
  @meta.type.objectRef("Tr2PostProcessAttributes")
  combinedPostProcessAttributes = new Tr2PostProcessAttributes();

  /** m_dataTextureMgr (Tr2DataTextureManagerPtr) [READ] */
  @meta.blue.read
  @meta.type.objectRef("Tr2DataTextureManager")
  dataTextureMgr = new Tr2DataTextureManager();

  /** m_dynamicObjectReflectionEnabled (bool) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.boolean
  dynamicObjectReflectionEnabled = true;

  /** m_componentRegistry (EveComponentRegistryPtr) [READ] */
  @meta.blue.read
  @meta.type.objectRef("EveComponentRegistry")
  componentRegistry = new EveComponentRegistry();

  /** m_cameraAttachmentParent (EveEffectRoot2Ptr) - protected Carbon scene
   * entity, default-constructed like Carbon's ctor CreateInstance (cpp:287, no
   * further setup applied). Consumers still optional-chain - deserialization
   * may null it. */
  @meta.type.model("EveEffectRoot2")
  cameraAttachmentParent = new EveEffectRoot2();

  /** m_postProcessDebug (BluePy) - protected Carbon debug payload. */
  @meta.type.rawStruct("BluePy")
  postProcessDebug = null;

  /** m_curveSets (PTriCurveSetVector) [READ, PERSIST] */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("TriCurveSet")
  curveSets = [];

  /** m_defaultDiffuseRoughness (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  defaultDiffuseRoughness = 1;

  /** m_fogStart (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  fogStart = 0;

  /** m_fogEnd (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  fogEnd = 0;

  /** m_reflectionIntensity (float) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  reflectionIntensity = 1;

  /** m_distanceFields (PEveDistanceFieldVector) [READ] */
  @meta.blue.read
  @meta.type.list("EveDistanceField")
  distanceFields = [];

  /** m_backgroundEffect (Tr2EffectPtr) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("Tr2Effect")
  backgroundEffect = null;

  /** m_backgroundReflectionIntensity (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  backgroundReflectionIntensity = 1;

  /** m_nebulaIntensity (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  nebulaIntensity = 1;

  /** m_display (bool) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  display = true;

  /** m_backgroundRenderingEnabled (bool) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  backgroundRenderingEnabled = false;

  /** m_update (bool) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  update = true;

  /** m_impostorManager (Tr2ImpostorManagerPtr) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.objectRef("Tr2ImpostorManager")
  impostorManager = null;

  /** m_lensflares (PEveLensflareVector) [READ, PERSIST] */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("EveLensflare")
  lensflares = [];

  /** m_externalParameters (PTr2ExternalParameterVector) [READ, PERSIST] */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("Tr2ExternalParameter")
  externalParameters = [];

  /** m_fogMax (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  fogMax = 0;

  /** m_staticParticles (PEveSceneStaticParticlesVector) [READ] */
  @meta.blue.read
  @meta.type.list("EveSceneStaticParticles")
  staticParticles = [];

  /** m_debugRenderer (Tr2DebugRendererPtr) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.objectRef("Tr2DebugRenderer")
  debugRenderer = null;

  /** m_objects (PIEveSpaceObject2Vector) [READ, PERSIST] */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("IEveSpaceObject2")
  objects = new BlueList(IEveSpaceObject2);

  /** m_uiObjects (PIEveSpaceObject2Vector) [READ, PERSIST] */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("IEveSpaceObject2")
  uiObjects = new BlueList(IEveSpaceObject2);

  /** m_backgroundObjects (PIEveSpaceObject2Vector) [READ, PERSIST] */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("IEveSpaceObject2")
  backgroundObjects = new BlueList(IEveSpaceObject2);

  /** m_planets (PEvePlanetVector) [READ, PERSIST] */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("EvePlanet")
  planets = new BlueList(EvePlanet, { className: "EvePlanet" });

  /** m_rtManager (Tr2RaytracingManagerPtr) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.objectRef("Tr2RaytracingManager")
  raytracingManager = null;

  /** m_reflectionBackLightingColor (Color) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  reflectionBackLightingColor = vec4.fromValues(2, 2, 2, 2);

  /** m_reflectionBackLightingContrast (float) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  reflectionBackLightingContrast = 8;

  /** m_reflectionProbe (Tr2ReflectionProbePtr) [READWRITE, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.type.objectRef("Tr2ReflectionProbe")
  reflectionProbe = null;

  /** m_volumetricsRenderer (Tr2VolumetricsRendererPtr) [READ] */
  @meta.blue.read
  @meta.type.objectRef("Tr2VolumetricsRenderer")
  volumetricsRenderer = new Tr2VolumetricsRenderer();

  /** m_starfield (EveStarfieldPtr) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("EveStarfield")
  starfield = null;

  /** m_planetScale (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  planetScale = 1000000;

  /** m_planetCameraScale (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  planetCameraScale = 1000000;

  /** m_sssss (Tr2SSSSSPtr) [READ] */
  @meta.blue.read
  @meta.type.objectRef("Tr2SSSSS")
  subSurfaceScattering = null;

  /** m_shadowQuality (ShadowQuality - enum ShadowQuality) [READWRITE, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.type.int32
  @meta.type.enum("trinity.ShadowQuality")
  shadowQualitySetting = 3;

  /** m_sunColor (Color) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  sunDiffuseColor = vec4.fromValues(1, 1, 1, 1);

  /** m_sunColorWithDynamicLights (Color) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  sunDiffuseColorWithDynamicLights = vec4.fromValues(1, 1, 1, 1);

  /** m_envMapRotation (Quaternion) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.quat
  envMapRotation = quat.create();

  /** m_ballpark (IEveBallparkPtr) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.objectRef("IEveBallpark")
  ballpark = null;

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  /** m_sunBall (ITriVectorFunctionPtr) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("ITriVectorFunction")
  sunBall = null;

  /** m_sceneDefaultPostProcess (Tr2PostProcess2Ptr) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("Tr2PostProcess2")
  postprocess = null;

  /** m_virtualCameraSystem (EveVirtualCameraSystemPtr) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("EveVirtualCameraSystem")
  virtualCameraSystem = null;

  /** m_warpTunnel (IEveSpaceObject2Ptr) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.objectRef("IEveSpaceObject2")
  warpTunnel = null;

  /** m_perFrameDebug (float) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.float32
  perFrameDebug = 0;

  /** m_cascadedShadowMap (Tr2ShadowMapPtr) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("Tr2ShadowMap")
  cascadedShadowMap = null;

  /** m_updateTime (Be::Time) [READ] */
  @meta.blue.read
  @meta.type.float64
  updateTime = 0;

  /** m_useSunColorWithDynamicLights (bool) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  useSunDiffuseColorWithDynamicLights = false;

  /** m_envMap1 (ITr2TextureProviderPtr) [READ] */
  @meta.blue.read
  @meta.type.objectRef("ITr2TextureProvider")
  envMap1 = null;

  /** m_envMap2 (ITr2TextureProviderPtr) [READ] */
  @meta.blue.read
  @meta.type.objectRef("ITr2TextureProvider")
  envMap2 = null;

  /** m_envMap3 (ITr2TextureProviderPtr) [READ] */
  @meta.blue.read
  @meta.type.objectRef("ITr2TextureProvider")
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
  @meta.type.objectRef("Tr2GpuParticleSystem")
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
  @meta.blue.method
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
  @meta.blue.method
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
   * @param {Object|null} [options.frustum] - a ready TriFrustum, held by reference
   * @param {Number} [options.visibilityThreshold]
   * @param {Number} [options.lowDetailThreshold]
   * @param {Number} [options.mediumDetailThreshold]
   * @param {Number} [options.highDetailThreshold]
   * @param {Number} [options.lodFactor]
   * @param {Boolean} [options.raytracingEnabled]
   */
  StampFrameContext({
    frustum = null,
    visibilityThreshold = EveSpaceScene.eveSpaceSceneVisibilityThreshold / this.upscalingAmount,
    lowDetailThreshold = EveSpaceScene.eveSpaceSceneLowDetailThreshold / this.upscalingAmount,
    mediumDetailThreshold = EveSpaceScene.eveSpaceSceneMediumDetailThreshold / this.upscalingAmount,
    highDetailThreshold = EveSpaceScene.eveSpaceSceneHighDetailThreshold / this.upscalingAmount,
    lodFactor = EveSpaceScene.eveSpaceSceneLODFactor / this.upscalingAmount,
    raytracingEnabled = false
  } = {})
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
   * StampFrameContext, called BEFORE Update), planet update (planet
   * view-matrix swap unported), and main-thread action flush (N/A).
   * @param {Number} realTime
   * @param {Number} simTime
   */
  @meta.blue.method
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
      curveSet.Update(realTime, simTime, context.renderContext);
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
    if (this.sunBall?.Update)
    {
      this.sunBall.Update(simTime, sunDirectionScratch);
      vec3.normalize(sunDirectionScratch, sunDirectionScratch);
      vec3.negate(this.sunDirection, sunDirectionScratch);
    }

    this.updateTime = simTime;
  }

  /** Carbon method PickObject (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  @meta.blue.method
  @meta.notImplemented
  PickObject(...args)
  {
    throw new Error("EveSpaceScene.PickObject is not implemented in CarbonEngineJS.");
  }

  /** Carbon method PickAsyncObject (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  @meta.blue.method
  @meta.notImplemented
  PickAsyncObject(...args)
  {
    throw new Error("EveSpaceScene.PickAsyncObject is not implemented in CarbonEngineJS.");
  }

  /** Carbon method PickObjectAndAreaID -> PyPickObjectAndAreaID (MAP_METHOD). */
  @meta.blue.method
  @meta.notImplemented
  PickObjectAndAreaID(...args)
  {
    throw new Error("EveSpaceScene.PickObjectAndAreaID is not implemented in CarbonEngineJS.");
  }

  /**
   * Carbon EveSpaceScene::PickInfinity (cpp:4039-4050): the world-space
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
  @meta.blue.method
  @meta.implemented
  PickInfinity(x, y, projection, view, viewport = null, out = vec3.create())
  {
    const resolved = viewport ?? this.updateContext?.renderContext?.GetViewport?.();
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
      object?.UpdateVisibility(this.updateContext, IDENTITY);
    }

    this.cameraAttachmentParent?.SetTransform?.(inverseView);
    this.cameraAttachmentParent?.UpdateSyncronous(this.updateContext);
    this.cameraAttachmentParent?.UpdateAsyncronous(this.updateContext);
    this.cameraAttachmentParent?.UpdateVisibility(this.updateContext, IDENTITY);

    for (const staticParticles of this.staticParticles)
    {
      staticParticles?.UpdateVisibility(this.updateContext);
    }

    for (const planet of this.planets)
    {
      planet?.UpdateZOnlyVisibility?.(this.updateContext);
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
  GetRenderables(out = [])
  {
    if (!this.display)
    {
      return out;
    }

    for (const object of this.objects) object?.GetRenderables(out);
    this.cameraAttachmentParent?.GetRenderables(out);
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
  @meta.blue.method
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
    for (const owner of this.componentRegistry?.GetComponents(EveComponentType.PostProcessOwner) ?? [])
    {
      // Carbon pushes unguarded (cpp:358-361); JS ducks may return null.
      const attributes = owner?.GetPostProcessAttributes?.();
      if (attributes)
      {
        sources.push(attributes);
      }
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
        this._combinedPostProcess.SetDynamicExposure(this.postprocess.GetDynamicExposureIfAvailable?.() ?? null);
        this._combinedPostProcess.SetTaa(this.postprocess.GetTaaIfAvailable?.() ?? null);
        this._combinedPostProcess.SetTonemapping(this.postprocess.GetTonemappingIfAvailable?.() ?? null);
        this._combinedPostProcess.SetFog(this.postprocess.GetFogIfAvailable?.() ?? null);
        this._combinedPostProcess.SetGodRays(this.postprocess.GetGodRaysIfAvailable?.() ?? null);
        this._combinedPostProcess.SetGenericEffect(this.postprocess.GetGenericEffectIfAvailable?.() ?? null);
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
  @meta.blue.method
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
    for (const component of this.componentRegistry?.GetComponents(EveComponentType.EveLightingOverride) ?? [])
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
   */
  @meta.ours
  @meta.reason("Carbon performs this inside BeginRender; CarbonEngineJS exposes the scene-owned CPU phase because the engine driver owns the surrounding frame order.")
  UpdateFogSettings()
  {
    this.volumetricsRenderer.UpdateFogSettings(this.componentRegistry, this.updateContext);
  }

  /**
   * Drives the injected light manager through Carbon's dynamic-light gather
   * (EveSpaceScene::BeginRender, EveSpaceScene.cpp:1396-1416, AFTER
   * GatherBatches cpp:1387): shadow quality, clear (runs even with zero owners
   * - stale lights must drop), frustum, LOD cutoff, then every registered
   * LightOwner's GetLights (Carbon Tr2ParallelFor chunk-20 cpp:1405-1413; JS
   * sequential in collection order), then ResolveLightData. No JS
   * Tr2LightManager class exists - the manager is a duck and every manager
   * call is optional-chained so a partial duck still gets the owner loop.
   * Carbon runs the block only when a manager instance exists (dynamic
   * lighting on) - a null manager is a no-op. The recording frame number
   * Carbon passes to SetShadowQuality and the renderContext it passes to Clear
   * are engine recording state - the JS Clear receives the frame's
   * renderContext for ducks that want it.
   * @param {Object|null} lightManager
   */
  GatherLights(lightManager)
  {
    // Kept for the PS fill's shadow-atlas settings: Carbon reads them from the
    // Tr2LightManager singleton (cpp:3126-3137), which is not ported; the
    // manager this scene last gathered with is the same one.
    this._lightManager = lightManager ?? null;

    if (!lightManager || !this.display)
    {
      return;
    }

    lightManager.SetShadowQuality(this.shadowQualitySetting, this.updateContext.renderContext.GetRecordingFrameNumber());
    lightManager.Clear(this.updateContext.renderContext);
    lightManager.SetFrustum(this.updateContext.GetFrustum());
    lightManager.AdjustLightCutoff(this.updateContext.GetLodFactor());

    for (const owner of this.componentRegistry?.GetComponents(EveComponentType.LightOwner) ?? [])
    {
      owner?.GetLights?.(lightManager);
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
   * @param {Array} objects - scene objects and the camera attachment parent
   * @returns {Number} how many receivers were updated
   */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Carbon's Tr2ParallelFor becomes a sequential pass; the receivers touch only their own per-object records.")
  UpdateShLighting(objects = [])
  {
    if (!this.shLightingManager)
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
      receiver.UpdateShLighting(this.shLightingManager, this.updateContext);
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
  @meta.blue.method
  @meta.implemented
  RunLensflareOcclusionQueries(_depthMap, renderContext)
  {
    for (const lensflare of this.lensflares) lensflare.RunOcclusionQueries(renderContext, this.updateContext);
    Tr2OcclusionBuffer.getInstance().ProcessBuffer(renderContext);
  }

  /** Native scene Render entry point is intentionally empty (EveSpaceScene.cpp:2950). */
  @meta.blue.method
  @meta.implemented
  Render(_renderContext)
  {
  }

  /** Scene debugging requires the pending debug renderer and global flush port. */
  @meta.blue.method
  @meta.notImplemented
  RenderDebugInfo(_renderContext)
  {
    if (!this.debugRenderer) return;
    throw new Error("EveSpaceScene.RenderDebugInfo requires the debug renderer BeginRender/EndRender and global flush port.");
  }

  /** Updates only the notified scene property (EveSpaceScene.cpp:3268-3353). */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Exposed member names replace native addresses; null releases references and resource requirements replace interface IIDs.")
  OnModified(property, renderContext = Tr2RenderContext_GetMainThreadRenderContext())
  {
    if (IsMatch(property, "reflectionProbe") || IsMatch(property, "envMapResPath"))
    {
      this._staticEnvMapTextureRes = null;
      if (this._staticEnvMapHandle)
        this._staticEnvMapTextureRes = blue.resMan.GetResource(this.envMapResPath, { requirement: ResourceRequirement.TEXTURE });
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
        this[field] = blue.resMan.GetResource(this[field + "ResPath"], { requirement: ResourceRequirement.TEXTURE });
    }
    if ((IsMatch(property, "reflectionBackLightingColor") || IsMatch(property, "reflectionBackLightingContrast"))
      && this.reflectionProbe && this.reflectionProbe.IsValid(renderContext))
    {
      if (IsMatch(property, "reflectionBackLightingColor")) this.reflectionProbe.SetBackLightColor(this.reflectionBackLightingColor);
      if (IsMatch(property, "reflectionBackLightingContrast")) this.reflectionProbe.SetBackLightContrast(this.reflectionBackLightingContrast);
    }
    if (IsMatch(property, "shadowQuality") && this.cascadedShadowMap)
    {
      if (this.shadowQuality === ShadowQuality.SHADOW_LOW) this.cascadedShadowMap.ShouldUseDenoiser(false);
      if (this.shadowQuality === ShadowQuality.SHADOW_HIGH) this.cascadedShadowMap.ShouldUseDenoiser(true);
    }
    return true;
  }

  /** Registers the bone provider before effect hydration (EveSpaceScene.cpp:257-258). */
  constructor()
  {
    for (const list of [this.backgroundObjects, this.planets, this.objects, this.uiObjects]) list.SetNotify(this);
    const bones = Tr2RingBuffer.GetInstance("Float4x3", 48, Tr2RenderContext_GetMainThreadRenderContext());
    bones.SetName("BoneTransformsBuffer");
    Tr2VariableStore.globalStore().RegisterVariable("BoneTransforms", bones);
  }

  // THE SCENE'S GLOBAL TEXTURES (EveSpaceScene.cpp:252-261). Carbon registers
  // each with a TYPED null - `(ITr2TextureProvider*)nullptr` - so the name is a
  // texture variable before anything fills it; a JS null has no type, so an
  // empty Tr2TextureReference stands for it (as the blitter's BlitSource).
  // Effects bind these by name when their materials map, so they exist from
  // construction.

  /** m_envMapHandle: "EveSpaceSceneEnvMap", the reflection (probe or nebula). */
  _envMapHandle = Tr2VariableStore.globalStore().RegisterVariable("EveSpaceSceneEnvMap", new Tr2TextureReference());

  /** m_staticEnvMapHandle: "EveSpaceSceneStaticEnvMap", the nebula itself. */
  _staticEnvMapHandle = Tr2VariableStore.globalStore().RegisterVariable("EveSpaceSceneStaticEnvMap", new Tr2TextureReference());

  /** "SSAOMap", registered empty (cpp:256); the driver fills it when SSAO runs. */
  _ssaoMapHandle = Tr2VariableStore.globalStore().RegisterVariable("SSAOMap", new Tr2TextureReference());

  /** m_envMap1Var / m_envMap2Var: "EnvMap1" and "EnvMap2" (cpp:188-189). */
  _envMap1Handle = Tr2VariableStore.globalStore().RegisterVariable("EnvMap1", new Tr2TextureReference());

  _envMap2Handle = Tr2VariableStore.globalStore().RegisterVariable("EnvMap2", new Tr2TextureReference());

  /** m_reflectionMapVar / m_reflectionMaskMapVar: the same two maps under "ReflectionMap" and "ReflectionMaskMap" (cpp:190-191). */
  _reflectionMapHandle = Tr2VariableStore.globalStore().RegisterVariable("ReflectionMap", new Tr2TextureReference());

  _reflectionMaskMapHandle = Tr2VariableStore.globalStore().RegisterVariable("ReflectionMaskMap", new Tr2TextureReference());

  /** m_nebulaIntensityVar: "NebulaIntensity" (cpp:202), which the background effect reads. */
  _nebulaIntensityHandle = Tr2VariableStore.globalStore().RegisterVariable("NebulaIntensity", 1);

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
  @meta.blue.method
  @meta.adapted
  static registerWithVariableStore(shadowResources, gpuResourcePool)
  {
    const store = Tr2VariableStore.globalStore();
    const references = EveSpaceScene._shadowReferences;

    const publish = (name, texture) =>
    {
      references[name].SetTexture(texture);
      store.RegisterVariable(name, references[name]);
    };

    const emptyShadow = (name, format, publication) =>
    {
      const handle = gpuResourcePool.GetPersistentTexture(name, {
        type: TextureType.TEX_TYPE_2D,
        width: 1,
        height: 1,
        depth: 1,
        mipCount: 1,
        format,
        gpuUsage: Tr2GpuUsage.SHADER_RESOURCE,
        initialData: [ new Tr2SubresourceData(new Uint8Array([ 255 ]), 1, 1) ]
      });
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
  @meta.ours
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
  @meta.blue.method
  @meta.adapted
  Initialize(renderContext = Tr2RenderContext_GetMainThreadRenderContext())
  {
    this._staticEnvMapTextureRes = this.envMapResPath
      ? blue.resMan.GetResource(this.envMapResPath, { requirement: ResourceRequirement.TEXTURE })
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
      this.envMap1 = blue.resMan.GetResource(this.envMap1ResPath, { requirement: ResourceRequirement.TEXTURE });
    }
    if (this.envMap2ResPath)
    {
      this.envMap2 = blue.resMan.GetResource(this.envMap2ResPath, { requirement: ResourceRequirement.TEXTURE });
    }
    if (this.envMap3ResPath)
    {
      this.envMap3 = blue.resMan.GetResource(this.envMap3ResPath, { requirement: ResourceRequirement.TEXTURE });
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
  @meta.blue.method
  @meta.adapted
  UpdateVariableStore()
  {
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

  /** Carbon m_perFrameVSBuffer / m_perFramePSBuffer: created empty on first apply, sized by FillAndSetConstants. */
  _perFrameVSBuffer = null;

  _perFramePSBuffer = null;

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
  @meta.blue.method
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
   *   which the per-frame vertex block hands the velocity shaders.
   *
   * Adapted: the rest of Carbon's EndRender (the secondary transparent and
   * additive gathers, batch clearing, the variable store) belongs to passes
   * this runtime's driver does not run yet.
   *
   * @param {Tr2RenderContext} renderContext The frame's context.
   * @returns {void}
   */
  @meta.blue.method
  @meta.adapted
  EndRender(renderContext)
  {
    if (!this.display) return;

    Tr2QuadRenderer.Instance().DoneRendering(renderContext);

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
  @meta.blue.method
  @meta.implemented
  UpdateQuadRenderer(frustum, objects, renderContext)
  {
    const quadRenderer = Tr2QuadRenderer.Instance();

    for (const object of objects) object?.AddQuadsToQuadRenderer(frustum, quadRenderer);

    quadRenderer.BeginRendering(renderContext);
  }

  /** Carbon GetQuadRenderer (cpp:1759-1762): the shared quad renderer. */
  @meta.blue.method
  @meta.implemented
  GetQuadRenderer()
  {
    return Tr2QuadRenderer.Instance();
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
  @meta.blue.method
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
   * Carbon EveSpaceScene::RenderBatch (cpp:1095-1115): finalize, apply the
   * rendering mode's standard states, draw, clear.
   *
   * Adapted: Carbon draws through the scene's visualizer effect (a pixel-shader
   * replacement, or none for the ordinary view); visualizer effects are not
   * ported, so this always draws the ordinary view.
   *
   * @param {object} batch The accumulator to draw.
   * @param {number} rm The RenderingMode.
   * @param {Tr2RenderContext} renderContext The frame's context.
   * @returns {void}
   */
  @meta.blue.method
  @meta.adapted
  RenderBatch(batch, rm, renderContext)
  {
    batch.Finalize();
    renderContext.GetEffectStateManager().ApplyStandardStates(rm);
    renderContext.RenderBatches(batch);
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
   * pass hint; here the hint's CLEAR does it, as in our main pass. The planet
   * LOD and visibility update (cpp:2023-2045) is not ported: a scene with
   * planets logs a warning once.
   *
   * @param {object|null} depthMap The scene depth.
   * @param {object|null} distortionMap The distortion map, if distortion is on.
   * @param {object|null} velocityMap The velocity map, if one is rendered.
   * @param {Tr2RenderContext} renderContext The frame's context.
   * @param {Tr2Renderer} renderer The renderer that draws screen quads.
   * @returns {boolean} Whether any background distortion batches were drawn.
   */
  @meta.blue.method
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

    if (this.planets.length) this._WarnBackgroundPart("planets", "EvePlanet LOD, visibility and rendering in the background pass");

    const esm = renderContext.GetEffectStateManager();
    if (velocityMap)
    {
      esm.PushRenderTarget(velocityMap, 1);
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

    esm.EndManagedRendering();
    return hasBackgroundDistortionBatches;
  }

  /**
   * Carbon EveSpaceScene::RenderBackgroundPassObjects (cpp:2082-2195): the
   * nebula - the background effect drawn as a camera-space screen quad with
   * opaque states - then the starfield, background objects, planets and warp
   * tunnel. For a reflection render the nebula intensity is swapped for the
   * background reflection intensity around the draw.
   *
   * Adapted: the nebula and seeded starfield are ported. Background objects,
   * planets and the warp tunnel each log
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
  @meta.blue.method
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
    if (this.warpTunnel) this._WarnBackgroundPart("warpTunnel", "the warp tunnel in the background pass");

    renderContext.GetEffectStateManager().EndManagedRendering();
    return hasBackgroundDistortionBatches;
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
   * ITr2MeshMorph), the planets' z-only areas (cpp:2285-2308; EvePlanet has no
   * GetZOnlyRenderables), and the volumetrics sun angle and planet shadow
   * casters after it (cpp:2328-2355).
   *
   * @param {object} depthMap The scene depth; the caller has bound it.
   * @param {object|null} normalMap The normal map, or null.
   * @param {object|null} customStencil The custom stencil target, or null.
   * @param {Tr2RenderContext} renderContext The frame's context.
   * @param {string} techniqueName The depth technique ("Depth" from the driver).
   * @param {object} batchMap The frame's batch map.
   * @returns {void}
   */
  @meta.blue.method
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
    esm.PushRenderTarget();

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

    // Metal supports render-pass hints, so the hinted pass ends here
    // (cpp:2310-2314); without a normal map Carbon's Metal branch only pops.
    if (normalMap) renderContext.EndRenderPassHint();

    esm.PopRenderTarget();
    esm.SetRenderTarget(1, null);
    esm.EndManagedRendering();
  }

  /**
   * Carbon RenderDistortionBatches (EveSpaceScene.cpp:1224-1250): draws the
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
  @meta.blue.method
  @meta.implemented
  RenderDistortionBatches(batches, distortionMap, depthMap, renderContext)
  {
    const accumulator = batches.GetAccumulator(TriBatchType.TRIBATCHTYPE_DISTORTION);
    if (!accumulator?.GetBatchCount()) return false;

    const esm = renderContext.GetEffectStateManager();
    esm.PushRenderTarget(distortionMap);
    esm.PushDepthStencilBuffer();
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

  /** m_shadowPerFrameVSBuffer */
  _shadowPerFrameVSBuffer = null;

  /**
   * Carbon EveSpaceScene::RenderShadows (cpp:2618-2676): the cascaded shadow
   * map at LOW or HIGH shadow quality.
   *
   * Adapted: the renderer is passed in for the resolve's blitter, as
   * `Tr2ShadowMap.DrawToShadowMapResult` takes it. Not ported, each a later
   * insertion here: the raytraced branch (no Tr2RaytracingManager), and the
   * point and spot light shadow atlas (the light manager's shadow maps).
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
  @meta.blue.method
  @meta.adapted
  RenderShadows(depthMap, normalMap, gpuResourcePool, renderContext, renderer)
  {
    if (!this.display || !this._enableShadows) return EmptyShadowResources();

    if (this.cascadedShadowMap
      && (this.shadowQualitySetting === ShadowQuality.SHADOW_LOW || this.shadowQualitySetting === ShadowQuality.SHADOW_HIGH))
    {
      return this.SetupCascadedShadows(Tr2RenderReason.TR2RENDERREASON_NORMAL, this.cascadedShadowMap, this.updateContext.GetFrustum(), depthMap, gpuResourcePool, renderContext, renderer);
    }

    return EmptyShadowResources();
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
  @meta.blue.method
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
      // casters. Only the planes are read, so they are all that is made.
      const cameraFrustum = new TriFrustum();

      cameraFrustum.ExtractFrustum(mat4.invert(mat4.create(), splitSetup.invViewProj));
      cameraFrustums.push(cameraFrustum);
      shadowFrustums.push(new TriShadowOrthoFrustum(splitSetup.shadowFrustum, shadowMapSize, sunDir));
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

        if (caster.IsCastingShadow(cameraFrustums[frustumIndex], shadowFrustums[frustumIndex], renderReason, radius))
        {
          shadowCasterInfo.push({ radius: radius[0], caster, perObjectData: null });
        }
      }

      for (const info of shadowCasterInfo) info.perObjectData = info.caster.GetShadowPerObjectData(batches);
      for (const info of shadowCasterInfo) info.caster.GetShadowBatches(batches, info.perObjectData, info.radius);

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
        this._shadowPerFrameVSBuffer ??= renderContext.CreateConstantBuffer();

        const data = this._shadowPerFrameVS.GetData();

        FillAndSetConstants(this._shadowPerFrameVSBuffer, data, data.byteLength, perFrameVsMask, PER_FRAME_VS, renderContext);

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

    this.PopulatePerFramePSData(renderContext, {}, shadowMap);
    this.ApplyPerFrameData(renderContext);

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
   * Carbon scene fog/cloud ordering (EveSpaceScene.cpp:2437-2477).
   * Adapted: context transforms replace the renderer's pending view statics;
   * returned pool handles require explicit release by the caller.
   */
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
  @meta.blue.method
  @meta.implemented
  PopulateAndApplyPerFrameData(renderContext)
  {
    this.PopulatePerFramePSData(renderContext);
    this.PopulatePerFrameVSData(renderContext);
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
   * The buffers come from the render context on first use, as Carbon's
   * default-constructed members are sized by FillAndSetConstants.
   *
   * @param {Tr2RenderContext} renderContext The context to bind on.
   * @returns {void}
   */
  @meta.blue.method
  @meta.implemented
  ApplyPerFrameData(renderContext)
  {
    const shaderTypeMask = renderContext.GetRenderContextAL().constructor.SHADER_TYPE_MASK;
    const perFrameVsMask = (1 << ShaderType.VERTEX_SHADER) | (shaderTypeMask & (
      (1 << ShaderType.COMPUTE_SHADER)
      | (1 << ShaderType.GEOMETRY_SHADER)
      | (1 << ShaderType.HULL_SHADER)
      | (1 << ShaderType.DOMAIN_SHADER)
    ));

    this._perFrameVSBuffer ??= renderContext.CreateConstantBuffer();
    this._perFramePSBuffer ??= renderContext.CreateConstantBuffer();

    const vs = this._perFrameVS.GetData();
    const ps = this._perFramePS.GetData();

    FillAndSetConstants(this._perFrameVSBuffer, vs, vs.byteLength, perFrameVsMask, PER_FRAME_VS, renderContext);
    FillAndSetConstants(this._perFramePSBuffer, ps, ps.byteLength, 1 << ShaderType.PIXEL_SHADER, PER_FRAME_PS, renderContext);
  }

  /**
   * Fills the per-frame VERTEX constants (Carbon
   * EveSpaceScene::PopulatePerFrameVSData, cpp:3015-3068).
   *
   * Adapted in one respect, the same way StampFrameContext is: Carbon reads
   * the camera off `Tr2Renderer` statics and the render-target/viewport sizes
   * off `renderContext.m_esm`, neither of which exists GPU-free here. The
   * driver passes them in `frame` instead. Everything the scene itself owns -
   * sun, fog, env-map rotation, the previous frame's view/projection - is read
   * from the scene, as Carbon does.
   *
   * Matrices are stored TRANSPOSED because the shaders are column_major, with
   * one deliberate exception Carbon calls out at cpp:3023: the value wanted for
   * `ViewInverseTransposeMat` is already a transpose, so transposing it again
   * cancels and the inverse view goes in as-is.
   *
   * @param {Object} renderContext - the frame's Tr2RenderContext
   * @param {Object} [frame] - the engine-supplied state Carbon reads statically
   * @param {Number} [frame.renderTargetWidth]
   * @param {Number} [frame.renderTargetHeight]
   * @param {Number} [frame.aspectRatio]
   * @param {Number} [frame.animationTime] - Tr2Renderer::GetAnimationTime
   * @param {Object|null} [frame.deviceViewport] - {width, height}
   * @param {Object|null} [frame.projectionTransform] - the NON reversed-depth
   *   projection, which Carbon uses only to recover the field of view
   * @param {Object} [out] - the record to fill; defaults to the scene's own
   * @returns {Object} the filled record
   */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Tr2Renderer view statics and the ESM's render-target/viewport sizes are engine state; the driver supplies them in `frame`.")
  PopulatePerFrameVSData(renderContext, frame = {}, out = this._perFrameVS)
  {
    frame = { ...this._EngineFrameState(renderContext), ...frame };
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

    // Needs the transposed, but the shader also wants column_major, so it is
    // transpose(transpose(m)) == m (cpp:3023-3024).
    mat4.transpose(perFrameMatrixScratch, renderContext.GetInverseViewTransform());
    out.SetAndTranspose("ViewInverseTransposeMat", perFrameMatrixScratch);

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
   * Fills the per-frame PIXEL constants (Carbon
   * EveSpaceScene::PopulatePerFramePSData, cpp:3075-3202). Same `frame`
   * adaptation as the vertex fill.
   *
   * The cascaded-shadow block (ShadowMapValues / CascadeRanges /
   * ShadowMatrixVal / SplitInfo) is filled only when a shadow map is passed,
   * exactly as Carbon's `if( shadowMap )` gate does; without one the record
   * leaves the persistent cascade bytes untouched. `ShadowCameraRange` remains
   * disabled, so stale cascade bytes are not consumed until a map is supplied
   * again.
   *
   * @param {Object} renderContext - the frame's Tr2RenderContext
   * @param {Object} [frame] - as PopulatePerFrameVSData, plus:
   * @param {Number} [frame.frameIndex] - Tr2Renderer::GetCurrentFrameCounter
   * @param {Number} [frame.gammaBrightness]
   * @param {Number} [frame.sceneMipLodBias] - the upscaler's bias, plus the
   *   scene post-process's own; the upscaling info is engine state
   * @param {Number} [frame.inverseShadowMapAtlasSize] - 0 with no light manager
   * @param {Number} [frame.shadowMapAtlasEntryMinSizeLog2]
   * @param {Tr2ShadowMap|null} [shadowMap=this.cascadedShadowMap] - the owned
   *   cascaded shadow map; explicit null disables cascade packing
   * @param {Object} [out] - the record to fill; defaults to the scene's own
   * @returns {Object} the filled record
   */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Tr2Renderer statics, the ESM viewport, Tr2LightManager's atlas settings and the upscaler's mip bias are engine state; the driver supplies them in `frame`.")
  PopulatePerFramePSData(renderContext, frame = {}, shadowMap = this.cascadedShadowMap, out = this._perFramePS)
  {
    frame = { ...this._EngineFrameState(renderContext), ...frame };
    if (shadowMap !== null && !(shadowMap instanceof Tr2ShadowMap))
    {
      throw new TypeError("EveSpaceScene.PopulatePerFramePSData requires a Tr2ShadowMap or null.");
    }
    // The reversed-depth projection, as the vertex fill (cpp:3140).
    const projection = renderContext.GetReversedDepthProjectionTransform();

    out.SetAndTranspose("ViewMat", renderContext.GetViewTransform());

    // transpose(transpose(m)) == m, as in the vertex fill (cpp:3079-3080).
    mat4.transpose(perFrameMatrixScratch, renderContext.GetInverseViewTransform());
    out.SetAndTranspose("ViewInverseTransposeMat", perFrameMatrixScratch);

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
  @meta.blue.method
  @meta.implemented
  OnListModified(event, _key = 0, _key2 = 0, value = null, list = null)
  {
    const entityList = list === this.objects || list === this.backgroundObjects || list === this.planets;
    switch (event & BLUELISTEVENT.BELIST_EVENTMASK)
    {
      case BLUELISTEVENT.BELIST_UNLOADSTART:
        if (this.shLightingManager)
        {
          for (const item of list)
          {
            CjsSchema.cast(item, ITr2SecondaryLightSource)?.UnregisterSecondaryLightSource(this.shLightingManager);
            CjsSchema.cast(item, ITr2ShLightingReceiver)?.ClearShLighting();
          }
        }
        if (entityList && this.componentRegistry)
        {
          for (const item of list) CjsSchema.cast(item, EveEntity)?.UnRegister(this.componentRegistry);
        }
        break;
      case BLUELISTEVENT.BELIST_INSERTED:
        if (this.shLightingManager)
        {
          CjsSchema.cast(value, ITr2SecondaryLightSource)?.RegisterSecondaryLightSource(this.shLightingManager);
        }
        CjsSchema.cast(value, IEveSpaceObject2)?.RegisterWithQuadRenderer(Tr2QuadRenderer.Instance());
        if (entityList && this.componentRegistry)
        {
          CjsSchema.cast(value, EveEntity)?.Register(this.componentRegistry);
        }
        break;
      case BLUELISTEVENT.BELIST_REMOVED:
        if (this.shLightingManager)
        {
          CjsSchema.cast(value, ITr2SecondaryLightSource)?.UnregisterSecondaryLightSource(this.shLightingManager);
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

  /** Carbon method ReregisterEntities (MAP_METHOD_AND_WRAP, cpp:4064-4089).
   * Guarded no-op after ClearComponentRegistry has nulled the registry
   * (destroy-only path; Carbon would never call this afterwards). */
  //
  // Adapted: Carbon's list-insert handler registers every inserted object with
  // the quad renderer (OnListModified, cpp:3455-3470). An object pushed onto
  // the plain array raises no insert event, so this method, where such late
  // objects join, registers their quad effects too. RegisterEffect ignores a
  // key it already has, so registering again is harmless.
  @meta.blue.method
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
  @meta.blue.method
  @meta.implemented
  ClearComponentRegistry()
  {
    this.componentRegistry?.Clear();
    this.componentRegistry = null;
  }

  /** Carbon method GetPostProcessDebug (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.implemented
  GetPostProcessDebug()
  {
    return this.postProcessDebug;
  }

  /** Carbon method UpdateScene -> UpdateSceneFromScript (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.implemented
  UpdateScene(time)
  {
    return this.Update(time, time);
  }

  static EveVisualizeMethod = EveVisualizeMethod;

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
// (cpp:112-113). The value is EveComponentTypes' module variable, not a class
// static, so it is registered here through its accessors.
new TriSettingsRegistrar("eveReflectionSetting", {
  get eveReflectionSetting() { return GetReflectionSetting(); },
  set eveReflectionSetting(value) { SetReflectionSetting(value); }
}, "eveReflectionSetting", { enum: ReflectionSetting, carbon: true });

meta.blue.interfaceTable({ interfaces: [EveSpaceScene, ITr2Scene, ITr2Updateable, IInitialize, INotify], chainTo: null })(EveSpaceScene, { kind: "class" });
