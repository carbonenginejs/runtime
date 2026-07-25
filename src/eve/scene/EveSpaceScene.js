// Source: E:\carbonengine\trinity\trinity\Eve\EveSpaceScene.h
// Source: E:\carbonengine\trinity\trinity\Eve\EveSpaceScene.cpp
//
// Hand-maintained (promoted from src/generated/eve/scene; the generator skips it
// while this file exists). Fields mirror the generated schema shell; the
// additions are the per-frame update driver ported from Carbon
// EveSpaceScene::Update and the scene-owned EveUpdateContext member (Carbon
// m_updateContext - protected, so absent from the Blue schema scan).
import { carbon, impl, io, schema, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { quat } from "@carbonenginejs/runtime-utils/quat";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";
import { EveEntity } from "../EveEntity.js";
import { EveComponentRegistry } from "../../generated/eve/scene/EveComponentRegistry.js";
import { Tr2PostProcess2 } from "../../postProcess/Tr2PostProcess2.js";
import { Tr2PostProcessAttributes } from "../../postProcess/Tr2PostProcessAttributes.js";
import { EveComponentType } from "../EveComponentTypes.js";
import { EveUpdateContext } from "../EveUpdateContext.js";
import { EveEffectRoot2 } from "../spaceObject/EveEffectRoot2.js";


// Module scratch for the per-frame sun-direction read (assume-dirty).
const sunDirectionScratch = vec3.create();

// The scene-root parent transform for the visibility pass (Carbon
// EveSpaceScene.cpp:1441 `const Matrix& identity = IdentityMatrix()`). Module
// const, NEVER mutated - objects in m_objects are scene roots.
const IDENTITY = mat4.create();

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
//  6. (engine) volumetrics `UpdateFogSettings(scene.componentRegistry,
//     scene.updateContext)` - engine reads "FroxelFogSettings"; not scene
//     work (cpp:1365-1370).
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
// 11. (driver/engine, optional) `for (const lf of scene.lensflares)
//     lf?.PrepareRender?.(frustum)` (cpp:1419-1422; the JS lensflare shell has
//     no method yet - pure no-op today).
// 12. (engine) reads registry collections directly: "ShadowCaster" (cascade
//     gate cpp:614-621, RT push cpp:1544-1547), "VolumetricRenderable",
//     "FroxelFogSettings", "MeshMorph" (engine may call
//     `scene.componentRegistry.Clear("MeshMorph")` after bake),
//     "ReflectionRenderable" (secondary gather cpp:1886-1895).
//
// One-shot registration trigger: after graph build/mutation call
// `scene.ReregisterEntities()` - covers objects + backgroundObjects + planets
// (entity-guarded) + cameraAttachmentParent (cpp:4064-4089, matching what
// OnListModified registers incrementally, cpp:3435-3491). uiObjects are
// intentionally excluded everywhere (cpp:3462 gate) - Carbon never registers
// or culls them.
// ---------------------------------------------------------------------------

/** EveSpaceScene (eve/scene) - hand-maintained from schema shapeHash 571234b0.... */
@type.define({ className: "EveSpaceScene", family: "eve/scene" })
export class EveSpaceScene extends CjsModel
{

  /** m_visualizeMethod (EveVisualizeMethod - enum EveVisualizeMethod) [READWRITE, ENUM] */
  @io.readwrite
  @type.int32
  @schema.enum("EveVisualizeMethod")
  visualizeMethod = 0;

  /** m_envMap1ResPath (std::string) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.string
  envMap1ResPath = "";

  /** m_envMap2ResPath (std::string) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.string
  envMap2ResPath = "";

  /** m_envMap3ResPath (std::string) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.string
  envMap3ResPath = "";

  /** m_lowQualityNebulaResPath (std::string) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.string
  lowQualityNebulaResPath = "";

  /** m_lowQualityNebulaMixResPath (std::string) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.string
  lowQualityNebulaMixResPath = "";

  /** m_envMapResPath (std::string) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.string
  envMapResPath = "";

  /** m_fogColor (Color) [READWRITE, PERSIST] */
  @io.persist
  @type.color
  fogColor = vec4.create();

  /** m_sunData.DirWorld (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  sunDirection = vec3.create();

  /** m_ambientColor (Color) [READWRITE, PERSIST] */
  @io.persist
  @type.color
  ambientColor = vec4.create();

  /** m_shLightingManager (Tr2ShLightingManagerPtr) [PERSISTONLY] */
  @io.persistOnly
  @type.model("Tr2ShLightingManager")
  shLightingManager = null;

  /** m_combinedPostProcessAttributes (Tr2PostProcessAttributesPtr) [READ] -
   * default-constructed like Carbon's ctor CreateInstance (cpp:297); refreshed
   * by UpdatePostProcessAttributes' re-export at MEDIUM_PRIORITY (cpp:407). */
  @io.read
  @type.objectRef("Tr2PostProcessAttributes")
  combinedPostProcessAttributes = new Tr2PostProcessAttributes();

  /** m_dataTextureMgr (Tr2DataTextureManagerPtr) [READ] */
  @io.read
  @type.objectRef("Tr2DataTextureManager")
  dataTextureMgr = null;

  /** m_dynamicObjectReflectionEnabled (bool) [READWRITE] */
  @io.readwrite
  @type.boolean
  dynamicObjectReflectionEnabled = true;

  /** m_componentRegistry (EveComponentRegistryPtr) [READ] */
  @io.read
  @type.objectRef("EveComponentRegistry")
  componentRegistry = new EveComponentRegistry();

  /** m_cameraAttachmentParent (EveEffectRoot2Ptr) - protected Carbon scene
   * entity, default-constructed like Carbon's ctor CreateInstance (cpp:287, no
   * further setup applied). Consumers still optional-chain - deserialization
   * may null it. */
  @type.model("EveEffectRoot2")
  cameraAttachmentParent = new EveEffectRoot2();

  /** m_postProcessDebug (BluePy) - protected Carbon debug payload. */
  @type.rawStruct("BluePy")
  postProcessDebug = null;

  /** m_curveSets (PTriCurveSetVector) [READ, PERSIST] */
  @io.persist
  @type.list("TriCurveSet")
  curveSets = [];

  /** m_defaultDiffuseRoughness (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  defaultDiffuseRoughness = 1;

  /** m_fogStart (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  fogStart = 0;

  /** m_fogEnd (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  fogEnd = 0;

  /** m_reflectionIntensity (float) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.float32
  reflectionIntensity = 0;

  /** m_distanceFields (PEveDistanceFieldVector) [READ] */
  @io.read
  @type.list("EveDistanceField")
  distanceFields = [];

  /** m_backgroundEffect (Tr2EffectPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("Tr2Effect")
  backgroundEffect = null;

  /** m_backgroundReflectionIntensity (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  backgroundReflectionIntensity = 1;

  /** m_nebulaIntensity (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  nebulaIntensity = 1;

  /** m_display (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  display = true;

  /** m_backgroundRenderingEnabled (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  backgroundRenderingEnabled = false;

  /** m_update (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  update = true;

  /** m_impostorManager (Tr2ImpostorManagerPtr) [READWRITE] */
  @io.readwrite
  @type.objectRef("Tr2ImpostorManager")
  impostorManager = null;

  /** m_lensflares (PEveLensflareVector) [READ, PERSIST] */
  @io.persist
  @type.list("EveLensflare")
  lensflares = [];

  /** m_externalParameters (PTr2ExternalParameterVector) [READ, PERSIST] */
  @io.persist
  @type.list("Tr2ExternalParameter")
  externalParameters = [];

  /** m_fogMax (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  fogMax = 0;

  /** m_staticParticles (PEveSceneStaticParticlesVector) [READ] */
  @io.read
  @type.list("EveSceneStaticParticles")
  staticParticles = [];

  /** m_debugRenderer (Tr2DebugRendererPtr) [READWRITE] */
  @io.readwrite
  @type.objectRef("Tr2DebugRenderer")
  debugRenderer = null;

  /** m_objects (PIEveSpaceObject2Vector) [READ, PERSIST] */
  @io.persist
  @type.list("IEveSpaceObject2")
  objects = [];

  /** m_uiObjects (PIEveSpaceObject2Vector) [READ, PERSIST] */
  @io.persist
  @type.list("IEveSpaceObject2")
  uiObjects = [];

  /** m_backgroundObjects (PIEveSpaceObject2Vector) [READ, PERSIST] */
  @io.persist
  @type.list("IEveSpaceObject2")
  backgroundObjects = [];

  /** m_planets (PEvePlanetVector) [READ, PERSIST] */
  @io.persist
  @type.list("EvePlanet")
  planets = [];

  /** m_rtManager (Tr2RaytracingManagerPtr) [READWRITE] */
  @io.readwrite
  @type.objectRef("Tr2RaytracingManager")
  raytracingManager = null;

  /** m_reflectionBackLightingColor (Color) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.color
  reflectionBackLightingColor = vec4.fromValues(2, 2, 2, 2);

  /** m_reflectionBackLightingContrast (float) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.float32
  reflectionBackLightingContrast = 8;

  /** m_reflectionProbe (Tr2ReflectionProbePtr) [READWRITE, NOTIFY] */
  @io.notify
  @io.readwrite
  @type.objectRef("Tr2ReflectionProbe")
  reflectionProbe = null;

  /** m_volumetricsRenderer (Tr2VolumetricsRendererPtr) [READ] */
  @io.read
  @type.objectRef("Tr2VolumetricsRenderer")
  volumetricsRenderer = null;

  /** m_starfield (EveStarfieldPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("EveStarfield")
  starfield = null;

  /** m_planetScale (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  planetScale = 1000000;

  /** m_planetCameraScale (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  planetCameraScale = 1000000;

  /** m_sssss (Tr2SSSSSPtr) [READ] */
  @io.read
  @type.objectRef("Tr2SSSSS")
  subSurfaceScattering = null;

  /** m_shadowQuality (ShadowQuality - enum ShadowQuality) [READWRITE, NOTIFY] */
  @io.notify
  @io.readwrite
  @type.int32
  @schema.enum("ShadowQuality")
  shadowQualitySetting = 3;

  /** m_sunColor (Color) [READWRITE, PERSIST] */
  @io.persist
  @type.color
  sunDiffuseColor = vec4.fromValues(1, 1, 1, 1);

  /** m_sunColorWithDynamicLights (Color) [READWRITE, PERSIST] */
  @io.persist
  @type.color
  sunDiffuseColorWithDynamicLights = vec4.fromValues(1, 1, 1, 1);

  /** m_envMapRotation (Quaternion) [READWRITE, PERSIST] */
  @io.persist
  @type.quat
  envMapRotation = quat.create();

  /** m_ballpark (IEveBallparkPtr) [READWRITE] */
  @io.readwrite
  @type.objectRef("IEveBallpark")
  ballpark = null;

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** m_sunBall (ITriVectorFunctionPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("ITriVectorFunction")
  sunBall = null;

  /** m_sceneDefaultPostProcess (Tr2PostProcess2Ptr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("Tr2PostProcess2")
  postprocess = null;

  /** m_virtualCameraSystem (EveVirtualCameraSystemPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("EveVirtualCameraSystem")
  virtualCameraSystem = null;

  /** m_warpTunnel (IEveSpaceObject2Ptr) [READWRITE] */
  @io.readwrite
  @type.objectRef("IEveSpaceObject2")
  warpTunnel = null;

  /** m_perFrameDebug (float) [READWRITE] */
  @io.readwrite
  @type.float32
  perFrameDebug = 0;

  /** m_cascadedShadowMap (Tr2ShadowMapPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("Tr2ShadowMap")
  cascadedShadowMap = null;

  /** m_updateTime (Be::Time) [READ] */
  @io.read
  @type.float64
  updateTime = 0;

  /** m_useSunColorWithDynamicLights (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  useSunDiffuseColorWithDynamicLights = false;

  /** m_envMap1 (ITr2TextureProviderPtr) [READ] */
  @io.read
  @type.objectRef("ITr2TextureProvider")
  envMap1 = null;

  /** m_envMap2 (ITr2TextureProviderPtr) [READ] */
  @io.read
  @type.objectRef("ITr2TextureProvider")
  envMap2 = null;

  /** m_envMap3 (ITr2TextureProviderPtr) [READ] */
  @io.read
  @type.objectRef("ITr2TextureProvider")
  envMap3 = null;

  // Carbon m_updateContext (protected, absent from the Blue scan): the scene
  // owns ONE frame context, constructed once and re-stamped each Update. The
  // host/driver stamps updateContext.renderContext (camera view) + .device per
  // pass before calling Update - our explicit replacement for Carbon's
  // Tr2Renderer view statics.
  updateContext = new EveUpdateContext();

  // Carbon m_sceneDefaultPostProcessAttributes (EveSpaceScene.h:640, ctor
  // CreateInstance cpp:296): the scene default's attribute snapshot, refreshed
  // by UpdatePostProcessAttributes each frame.
  #sceneDefaultPostProcessAttributes = new Tr2PostProcessAttributes();

  // Carbon m_combinedPostProcess (EveSpaceScene.h:636): the merged output
  // post-process, lazily constructed on first combine (cpp:367-370).
  #combinedPostProcess = null;

  // Carbon m_currentSunColor / m_currentNebulaIntensity /
  // m_currentReflectionIntensity (EveSpaceScene.h:492-493/650, protected):
  // outputs of the BeginRender lighting-override blend (cpp:1360-1362).
  currentSunColor = vec4.create();

  currentNebulaIntensity = 0;

  currentReflectionIntensity = 0;

  // Carbon g_eveSpaceSceneDynamicLighting (registered setting
  // "eveSpaceSceneDynamicLighting", cpp:109-110, default false) - scoped to
  // the scene instead of a module global.
  dynamicLightingEnabled = false;

  // Carbon g_enablePostProcessDebugging (registered setting
  // "enablePostProcessDebugging", cpp:118-119, default false) - scoped to the
  // scene instead of a module global.
  enablePostProcessDebugging = false;

  /**
   * Stamps the per-frame frustum/threshold/LOD state onto the scene-owned
   * update context (Carbon EveSpaceScene::Update cpp:475-484, identical to the
   * already-updated fast path cpp:448-457). Carbon derives the frustum from
   * the Tr2Renderer view statics and reads the thresholds from console vars
   * divided by m_upscalingAmount (=1 by default, cpp:221); in CarbonEngineJS
   * the driver derives the frustum from the same renderContext state it
   * stamped and supplies the thresholds explicitly (pre-divided if it ever
   * upscales). Defaults are the Carbon console-var defaults (cpp:75-84).
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
    visibilityThreshold = 5,
    lowDetailThreshold = 100,
    mediumDetailThreshold = 400,
    highDetailThreshold = 800,
    lodFactor = 1,
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
  @carbon.method
  @impl.adapted
  Update(realTime, simTime)
  {
    if (!this.update)
    {
      return;
    }

    const context = this.updateContext;
    context.SetTime(simTime);
    context.UpdateOrigin(this.ballpark);
    context.dataTextureManager = this.dataTextureMgr;

    for (const object of this.backgroundObjects)
    {
      object?.UpdateSyncronous?.(context);
    }
    for (const object of this.backgroundObjects)
    {
      object?.UpdateAsyncronous?.(context);
    }

    if (this.warpTunnel)
    {
      this.warpTunnel.UpdateSyncronous?.(context);
      this.warpTunnel.UpdateAsyncronous?.(context);
    }

    this.starfield?.Update?.(simTime);

    for (const staticParticles of this.staticParticles)
    {
      staticParticles?.Update?.(context);
    }

    this.dataTextureMgr?.Update?.(context);

    for (const distanceField of this.distanceFields)
    {
      distanceField?.Update?.(context);
    }

    for (const lensflare of this.lensflares)
    {
      lensflare?.Update?.(realTime, simTime);
    }

    this.virtualCameraSystem?.Update?.(realTime);

    for (const curveSet of this.curveSets)
    {
      curveSet?.Update?.(realTime, simTime);
    }

    for (const object of this.objects)
    {
      object?.UpdateSyncronous?.(context);
    }
    for (const object of this.uiObjects)
    {
      object?.UpdateSyncronous?.(context);
    }

    for (const object of this.objects)
    {
      object?.UpdateAsyncronous?.(context);
    }
    for (const object of this.uiObjects)
    {
      object?.UpdateAsyncronous?.(context);
    }

    // Combine the post-process attributes (Carbon cpp:584, after the async
    // pass + ExecuteMainThreadActions cpp:581 and before the sun read).
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
  @carbon.method
  @impl.notImplemented
  PickObject(...args)
  {
    throw new Error("EveSpaceScene.PickObject is not implemented in CarbonEngineJS.");
  }

  /** Carbon method PickAsyncObject (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  @carbon.method
  @impl.notImplemented
  PickAsyncObject(...args)
  {
    throw new Error("EveSpaceScene.PickAsyncObject is not implemented in CarbonEngineJS.");
  }

  /** Carbon method PickObjectAndAreaID -> PyPickObjectAndAreaID (MAP_METHOD). */
  @carbon.method
  @impl.notImplemented
  PickObjectAndAreaID(...args)
  {
    throw new Error("EveSpaceScene.PickObjectAndAreaID is not implemented in CarbonEngineJS.");
  }

  /** Carbon method PickInfinity (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.notImplemented
  PickInfinity(...args)
  {
    throw new Error("EveSpaceScene.PickInfinity is not implemented in CarbonEngineJS.");
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
      object?.UpdateVisibility?.(this.updateContext, IDENTITY);
    }

    this.cameraAttachmentParent?.SetTransform?.(inverseView);
    this.cameraAttachmentParent?.UpdateSyncronous?.(this.updateContext);
    this.cameraAttachmentParent?.UpdateAsyncronous?.(this.updateContext);
    this.cameraAttachmentParent?.UpdateVisibility?.(this.updateContext, IDENTITY);

    for (const staticParticles of this.staticParticles)
    {
      staticParticles?.UpdateVisibility?.(this.updateContext);
    }

    for (const planet of this.planets)
    {
      planet?.UpdateZOnlyVisibility?.(this.updateContext);
    }

    // Sequential in Carbon too: "until we have proper support for multiple
    // lensflares we just do it in a list" (cpp:1462-1466).
    for (const lensflare of this.lensflares)
    {
      lensflare?.UpdateVisibility?.(this.updateContext);
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

    for (const object of this.objects) object?.GetRenderables?.(out);
    this.cameraAttachmentParent?.GetRenderables?.(out);
    for (const staticParticles of this.staticParticles)
    {
      staticParticles?.GetRenderables?.(this.updateContext.GetFrustum(), out);
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
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon's g_enablePostProcessDebugging global becomes the scene-scoped enablePostProcessDebugging field; the debug payload is a plain object, null when off.")
  UpdatePostProcessAttributes()
  {
    if (!this.display)
    {
      return;
    }

    // Scene default refreshed BEFORE the gather (cpp:354); FromPostProcess
    // handles a null postprocess (reset + return).
    this.#sceneDefaultPostProcessAttributes.FromPostProcess(
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
    sources.push(this.#sceneDefaultPostProcessAttributes);

    // The list is never empty (default always pushed) so Carbon's else-branch
    // (cpp:411) is unreachable; the guard is kept for shape fidelity.
    if (sources.length)
    {
      this.#combinedPostProcess ??= new Tr2PostProcess2();

      sources.sort((a, b) => b.priority - a.priority);

      if (this.enablePostProcessDebugging)
      {
        const observer = Tr2PostProcessAttributes.CreateDebugObserver();
        Tr2PostProcessAttributes.MergeInto(this.#combinedPostProcess, sources, observer);
        this.postProcessDebug = observer.GetDict();
      }
      else
      {
        Tr2PostProcessAttributes.MergeInto(this.#combinedPostProcess, sources);
        this.postProcessDebug = null;
      }

      // Engine-effect copy-through from the scene default only - NOT blended
      // (cpp:389-406).
      if (this.postprocess)
      {
        this.#combinedPostProcess.SetDynamicExposure(this.postprocess.GetDynamicExposureIfAvailable?.() ?? null);
        this.#combinedPostProcess.SetTaa(this.postprocess.GetTaaIfAvailable?.() ?? null);
        this.#combinedPostProcess.SetTonemapping(this.postprocess.GetTonemappingIfAvailable?.() ?? null);
        this.#combinedPostProcess.SetFog(this.postprocess.GetFogIfAvailable?.() ?? null);
        this.#combinedPostProcess.SetGodRays(this.postprocess.GetGodRaysIfAvailable?.() ?? null);
        this.#combinedPostProcess.SetGenericEffect(this.postprocess.GetGenericEffectIfAvailable?.() ?? null);
      }
      else
      {
        this.#combinedPostProcess.SetDynamicExposure(null);
        this.#combinedPostProcess.SetTaa(null);
        this.#combinedPostProcess.SetTonemapping(null);
        this.#combinedPostProcess.SetFog(null);
        this.#combinedPostProcess.SetGodRays(null);
        this.#combinedPostProcess.SetGenericEffect(null);
      }

      // Re-export the combined result as an attributes object at
      // MEDIUM_PRIORITY - consumed by nested-scene composition (cpp:407).
      (this.combinedPostProcessAttributes ??= new Tr2PostProcessAttributes())
        .FromPostProcess(this.#combinedPostProcess, Tr2PostProcessAttributes.MEDIUM_PRIORITY, 1.0);
    }
    else
    {
      this.#combinedPostProcess = null;
    }
  }

  /** Carbon method GetPostProcess (EveSpaceScene.cpp:420-427): the combined
   * post-process, or null while the scene is not displayed. */
  @carbon.method
  @impl.implemented
  GetPostProcess()
  {
    if (!this.display)
    {
      return null;
    }
    return this.#combinedPostProcess;
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
   * blend is symmetric within a tie group.
   */
  BlendLightingOverrides()
  {
    if (!this.display)
    {
      return;
    }

    const overrides = [];
    for (const component of this.componentRegistry?.GetComponents(EveComponentType.EveLightingOverride) ?? [])
    {
      overrides.push(component.GetOverrides());
    }
    overrides.sort((a, b) => b.priority - a.priority);

    // Baseline (cpp:1342-1357): the scene's own sun/nebula/reflection state,
    // sun color normalized by its max channel (all four components scaled).
    const sunColorSource = this.useSunDiffuseColorWithDynamicLights && this.dynamicLightingEnabled
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

    const over = EveSpaceScene.#SimplePriorityBlend(overrides);
    vec4.scale(this.currentSunColor, over.sunColor, over.sunIntensity);
    this.currentNebulaIntensity = over.backgroundIntensity;
    this.currentReflectionIntensity = over.reflectionIntensity;
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
    if (!lightManager || !this.display)
    {
      return;
    }

    lightManager.SetShadowQuality?.(this.shadowQualitySetting);
    lightManager.Clear?.(this.updateContext.renderContext);
    lightManager.SetFrustum?.(this.updateContext.GetFrustum());
    lightManager.AdjustLightCutoff?.(this.updateContext.GetLodFactor());

    for (const owner of this.componentRegistry?.GetComponents(EveComponentType.LightOwner) ?? [])
    {
      owner?.GetLights?.(lightManager);
    }

    lightManager.ResolveLightData?.();
  }

  /** Carbon method ReregisterEntities (MAP_METHOD_AND_WRAP, cpp:4064-4089).
   * Guarded no-op after ClearComponentRegistry has nulled the registry
   * (destroy-only path; Carbon would never call this afterwards). */
  @carbon.method
  @impl.implemented
  ReregisterEntities()
  {
    if (!this.componentRegistry)
    {
      return;
    }

    for (const collection of [this.objects, this.backgroundObjects, this.planets])
    {
      for (const object of collection)
      {
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
  @carbon.method
  @impl.implemented
  ClearComponentRegistry()
  {
    this.componentRegistry?.Clear();
    this.componentRegistry = null;
  }

  /** Carbon method GetPostProcessDebug (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  GetPostProcessDebug()
  {
    return this.postProcessDebug;
  }

  /** Carbon method UpdateScene -> UpdateSceneFromScript (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  UpdateScene(time)
  {
    return this.Update(time, time);
  }

  static EveVisualizeMethod = Object.freeze({
    VM_NONE: 0,
    VM_TEXCOORD0: 1,
    VM_TEXCOORD1: 2,
    VM_WHITE: 3,
    VM_OVERDRAW: 4,
    VW_WIREFRAME: 5,
    VW_LIGHT_COUNT: 6,
    VM_COUNT: 7,
  });

  static ShadowQuality = Object.freeze({
    SHADOW_DISABLED: 0,
    SHADOW_LOW: 1,
    SHADOW_HIGH: 2,
    SHADOW_RAYTRACED: 3,
  });

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
  static #SimplePriorityBlend(sources)
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
