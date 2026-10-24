import { exposure as be } from "#be";
import { ITr2DebugRenderable } from "#interfaces/ITr2DebugRenderable";
import { ITr2VisualizationModeRenderer } from "../../../trinity/core/ITr2VisualizationModeRenderer.js";
import { ITr2Updateable } from "../../../trinity/core/ITr2Updateable.js";
import { ITr2MultiPassScene } from "../../../trinity/core/ITr2MultiPassScene.js";
import { ITr2Scene } from "../../../trinity/core/ITr2Scene.js";
import { BlueList, CjsBlueClasses, IListNotify } from "#blue";
import { BLUELISTEVENT } from "#consts/blue";
import { ITr2InteriorDynamic } from "./ITr2InteriorDynamic.js";
import { ITr2InteriorLight } from "./ITr2InteriorLight.js";
import { VisualizeMethod, VisibilityQueryType, Tr2InteriorBatchGroup } from "../../generated/interior/enums.js";
// Source: trinity/trinity/Interior/Tr2InteriorScene.h
// Source: trinity/trinity/Interior/Tr2InteriorScene.cpp
// Source: trinity/trinity/Interior/Tr2InteriorScene_Blue.cpp
import { CjsSchema, meta, type } from "#schema";
import { blue, IInitialize, INotify, IsMatch, ResourceRequirement } from "#blue";
import { PixelFormat, DepthStencilFormat } from "#consts/render-context";
import { Tr2RenderTarget } from "../../../trinity/core/device/Tr2RenderTarget.js";
import { Tr2DepthStencil } from "../../../trinity/core/device/Tr2DepthStencil.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../../../trinity/core/context/Tr2RenderContext.js";
import { Tr2DebugRenderer } from "../../../trinity/core/line/Tr2DebugRenderer.js";
import { Tr2RenderContext } from "../../../trinity/core/context/Tr2RenderContext.js";
import { ITr2DebugRenderer2 } from "#interfaces";
import { color } from "#math/color";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { mat4 } from "#math/mat4";
import { ShaderType } from "#consts/render-context";
import { RenderingMode, TriBatchType } from "#consts/graphics";
import { Tr2ConstantBufferAL } from "#trinityal";
import { PER_FRAME_VS, PER_FRAME_PS, Tr2Renderer } from "../../../trinity/core/Tr2Renderer.js";
import { Tr2RenderUtils } from "../../../trinity/core/Tr2RenderUtils.js";
import { RawData } from "../../../trinity/core/rawData/RawData.js";
import * as CcpLog from "../../../global/logging/ccpLog.js";
import { TriFrustum } from "../../../trinity/core/view/TriFrustum.js";
import { TriViewport } from "../../../trinity/core/view/TriViewport.js";
import { Tr2VisibilityEvent, Tr2VisibilityResults } from "../../../trinity/core/context/Tr2VisibilityResults/index.js";
import { TriRenderBatchAccumulator } from "../../../trinity/core/batch/TriRenderBatch/TriRenderBatchAccumulator.js";
import { ITr2Renderable } from "../../../trinity/core/ITr2Renderable.js";
import { ITr2Interior } from "./ITr2Interior.js";
import { Tr2InteriorLightSet } from "./Tr2InteriorLightSet.js";
import { Tr2IntKeyGenerator } from "./Tr2IntKeyGenerator.js";
import { Tr2ConstantBufferFormats } from "../../../trinity/core/rawData/Tr2ConstantBufferFormats.js";
import { Tr2VariableStore } from "../../../trinity/core/variable/Tr2VariableStore.js";
import { TriVariableContentType } from "../../../trinity/generated/trinityCore/enums.js";

/**
 * Interior-scene state record for authored dynamics, lights, environment, fog,
 * sun, shadows, and diagnostics. Member notifications acquire the cubemap
 * through the installed resource manager and rebuild shadow-target wrappers
 * through the supplied or installed Trinity context. Picking, physics-scene creation
 * remain unported. Forward submission is supported with shadows disabled;
 * allocating shadow targets does not implement shadow rendering.
 */
@be.define("Tr2InteriorScene")
@be.inherit(IInitialize, INotify, ITr2Scene, ITr2MultiPassScene, ITr2VisualizationModeRenderer, ITr2DebugRenderable)
@be.mapInterface(ITr2Scene)
@be.mapInterface(ITr2MultiPassScene)
@be.mapInterface(IInitialize)
@be.mapInterface(INotify)
@be.mapInterface(ITr2Updateable)
@be.inherit(IListNotify)
export class Tr2InteriorScene
{
  // Carbon m_apexScene remains empty until the physics scene is installed.
  _apexScene = null;

  // Carbon m_dynamicsPendingLoad retains dynamics awaiting AddToScene success.
  _dynamicsPendingLoad = [];

  /** Native forward-pass accumulator; its allocator is bound to the active context. */
  _primaryRenderBatches = new TriRenderBatchAccumulator(Tr2IntKeyGenerator);

  _activeLightSet = new Tr2InteriorLightSet();
  _visibilityQueryType = VisibilityQueryType.PRIMARY_QUERY;
  _visibleObjects = [];
  _renderBackgroundCubeMap = true;
  _perFrameVSData = RawData.create("Tr2PerFrameVSData");
  _perFramePSData = RawData.create("Tr2PerFramePSData");
  _perFramePSBuffer = new Tr2ConstantBufferAL();

  /** Native m_whiteTexture (h:282), retained by the scene and shadow variables. */
  _whiteTexture = null;
  /**
   * Carbon Tr2InteriorScene.cpp:229-284 updates lights and dynamic membership.
   * Adapted: array identity search replaces FindKey; JS has no QI reference unlock.
   */

  @meta.adapted
  OnListModified(event, _key = 0, _key2 = 0, value = null, list = null)
  {
    if (list === this.lights) this.SetupShadowMaps();
    else if (list === this.dynamics && !(event & BLUELISTEVENT.BELIST_LOADING) && value)
    {
      const dynamic = CjsSchema.cast(value, ITr2InteriorDynamic);
      if (!dynamic) return;
      const masked = event & BLUELISTEVENT.BELIST_EVENTMASK;
      if (masked === BLUELISTEVENT.BELIST_REMOVED)
      {
        dynamic.RemoveFromScene();
        const index = this._dynamicsPendingLoad.indexOf(dynamic);
        if (index !== -1) this._dynamicsPendingLoad.splice(index, 1);
      }
      else if (masked === BLUELISTEVENT.BELIST_INSERTED && !dynamic.AddToScene(this._apexScene) && !this._dynamicsPendingLoad.includes(dynamic))
      {
        this._dynamicsPendingLoad.push(dynamic);
      }
    }
  }

  /**
   * Installs native list observers and forward-render variable registrations
   * (cpp:133-168). JS states each variable's native type explicitly.
   * Physics, picking preparation and noise acquisition remain open. The native
   * white shadow texture is acquired during Initialize after host registration.
   */
  constructor()
  {
    this.dynamics.SetNotify(this);
    this.lights.SetNotify(this);

    const store = Tr2VariableStore.globalStore();
    const { vec3_0, vec4_0 } = Tr2InteriorScene.scratch;
    vec3.normalize(vec3_0, this.sunDirection);
    vec3.negate(vec3_0, vec3_0);
    store.RegisterVariableInternal("Sun.DirWorld", TriVariableContentType.TRIVARIABLE_FLOAT3, vec3_0);
    store.RegisterVariableInternal("Sun.WodDiffuseColor", TriVariableContentType.TRIVARIABLE_COLOR, this.sunDiffuseColor);
    store.RegisterVariableInternal("Sun.SpecularColor", TriVariableContentType.TRIVARIABLE_COLOR, this.sunSpecularColor);
    store.RegisterVariableInternal("Scene.AmbientColor", TriVariableContentType.TRIVARIABLE_COLOR, this.ambientColor);
    vec3.zero(vec3_0);
    store.RegisterVariableInternal("Camera.eyePosWorld", TriVariableContentType.TRIVARIABLE_FLOAT3, vec3_0);
    vec4.zero(vec4_0);
    store.RegisterVariableInternal("PickingComponents", TriVariableContentType.TRIVARIABLE_FLOAT4, vec4_0);
    store.RegisterVariableInternal("EnvMap1", TriVariableContentType.TRIVARIABLE_TEXTURE_RES, this.backgroundCubemapRes);
    for (const name of ["LightPrePassMap", "LightAccumulationMap", "LightPrePassDepthMap", "SpotlightShadow0", "SpotlightShadow1", "SpotlightShadow2", "SpotlightShadow3"])
      store.RegisterVariableInternal(name, TriVariableContentType.TRIVARIABLE_TEXTURE_RES, null);
  }


  /**
   * m_backgroundCubeMapPath (std::string) [READWRITE, PERSIST, NOTIFY]
   * Carbon: MAP_ATTRIBUTE_WITH_CHOOSER (trinity/trinity/Interior/Tr2InteriorScene_Blue.cpp:347); chooser TriTextureChooser (trinity/trinity/TriConstants.cpp:79).
   */
  @be.mapAttributeWithChooser(be.READWRITE | be.PERSIST | be.NOTIFY, "blue.TriTextureChooser")
  @type.path("TriTextureRes")
  backgroundCubemapPath = "";

  /**
   * m_visualizeMethod (VisualizeMethod - enum VisualizeMethod) [READWRITE, ENUM, NOTIFY]
   * Carbon: MAP_ATTRIBUTE_WITH_CHOOSER (trinity/trinity/Interior/Tr2InteriorScene_Blue.cpp:350); chooser VisualizerChooser (trinity/trinity/Interior/Tr2InteriorScene_Blue.cpp:15).
   */
  @be.mapAttributeWithChooser(be.READWRITE | be.ENUM | be.NOTIFY, "trinity.Tr2InteriorVisualizerMethod")
  @type.int32
  @type.enum("trinity.Tr2InteriorVisualizerMethod")
  visualizeMethod = 0;

  /** m_curveSets (PTriCurveSetVector) [READ, PERSIST] */
  @be.mapAttribute(be.READ | be.PERSIST)

  @type.list("TriCurveSet")
  curveSets = [];

  /** m_renderShadows (bool) [READWRITE, NOTIFY] */
  @be.mapAttribute(be.READWRITE | be.NOTIFY)

  @type.boolean
  renderShadows = true;

  /** m_debugRenderShadowMaps (bool) [READWRITE, NOTIFY] */
  @be.mapAttribute(be.READWRITE | be.NOTIFY)

  @type.boolean
  debugRenderShadowMaps = false;

  /** m_shadowCount (int) [READWRITE, NOTIFY] */
  @be.mapAttribute(be.READWRITE | be.NOTIFY)

  @type.int32
  shadowCount = 4;

  /** m_minFogDistance (float) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  minFogDistance = 0;

  /** m_maxFogDistance (float) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  maxFogDistance = 1000;

  /** m_fogColor (Color) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.color
  fogColor = vec4.fromValues(1, 1, 1, 1);

  /** m_dynamics (PITr2InteriorDynamicVector) [READ, PERSIST, NOTIFY] */
  @be.mapAttribute(be.READ | be.PERSIST | be.NOTIFY)


  @type.list("ITr2InteriorDynamic")
  dynamics = new BlueList(ITr2InteriorDynamic);

  /** m_lights (PITr2InteriorLightVector) [READ, PERSIST, NOTIFY] */
  @be.mapAttribute(be.READ | be.PERSIST | be.NOTIFY)


  @type.list("ITr2InteriorLight")
  lights = new BlueList(ITr2InteriorLight);

  /** m_maxFogAmount (float) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  maxFogAmount = 0;

  /** m_debugRenderer (Tr2DebugRendererPtr) [READWRITE] */
  @be.mapAttribute(be.READWRITE)
  @type.object.ref("Tr2DebugRenderer")
  debugRenderer = null;

  /** m_visibilityResults (Tr2VisibilityResultsPtr) [READ] */
  @be.mapAttribute(be.READ)
  @type.object.ref("Tr2VisibilityResults")
  visibilityResults = null;

  /** m_ambientColor (Color) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.color
  ambientColor = vec4.create();

  /** m_optimizeShadows (bool) [READWRITE, NOTIFY] */
  @be.mapAttribute(be.READWRITE | be.NOTIFY)

  @type.boolean
  optimizeShadows = true;

  /** m_shadowSize (int) [READWRITE, NOTIFY] */
  @be.mapAttribute(be.READWRITE | be.NOTIFY)

  @type.int32
  shadowSize = 1024;

  /** m_lightRenderTargets (PTr2RenderTargetVector) [READ] */
  @be.mapAttribute(be.READ)
  @type.list("Tr2RenderTarget")
  lightRenderTargets = [];

  /** m_sunDiffuseColor (Color) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.color
  sunDiffuseColor = color.createLinear();

  /** m_sunDirection (Vector3) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.vec3
  sunDirection = vec3.fromValues(0, 0, 1);

  /** m_sunSpecularColor (Color) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.color
  sunSpecularColor = vec4.fromValues(0.8, 0.8, 0.8, 1);

  /** m_backgroundCubeMapRes (TriTextureResPtr) [READ] */
  @be.mapAttribute(be.READ)
  @type.object.ref("TriTextureRes")
  backgroundCubemapRes = null;

  /** m_backgroundEffect (Tr2EffectPtr) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.object.ref("Tr2Effect")
  backgroundEffect = null;

  /** Carbon method PickObject -> PickObjectOnly (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  @meta.renamed("PickObjectOnly")
  @meta.notImplemented
  PickObject(...args)
  {
    throw new Error("Tr2InteriorScene.PickObject is not implemented in CarbonEngineJS.");
  }

  /**
   * Carbon AddDynamic (h:113, cpp:970-992): add a unique dynamic and retain
   * unavailable members in the pending-load list. The Blue list observer also
   * calls AddToScene, as native OnListModified does; do not suppress that call.
   * Adapted: validate the JS interface argument before the native typed call.
   * @param {ITr2InteriorDynamic|null} dynamic Dynamic object to attach.
   * @returns {void}
   */
  @be.mapMethodAndWrap()
  @meta.adapted
  AddDynamic(dynamic)
  {
    if (!dynamic)
    {
      CcpLog.CCP_LOGERR("Attempt to add NULL dynamic to interior scene!");
      return;
    }
    if (typeof dynamic !== "object" || blue.classes.QueryThisInterface(dynamic, ITr2InteriorDynamic, dynamic.constructor, CjsBlueClasses.BLUEQIOPT.BEQI_SILENT) === null)
      throw new TypeError("Tr2InteriorScene.AddDynamic requires ITr2InteriorDynamic.");

    if (this.dynamics.FindKey(dynamic) === -1)
    {
      if (!dynamic.AddToScene(this._apexScene) && !this._dynamicsPendingLoad.includes(dynamic))
        this._dynamicsPendingLoad.push(dynamic);

      this.dynamics.Insert(-1, dynamic);
    }
  }

  /**
   * Carbon AddLightSource (h:109, cpp:912-930): retain one light identity and
   * refresh shadow targets even when it was already present. Blue-list insertion
   * also invokes SetupShadowMaps through the native observer. Adapted: validate
   * the JS argument against Blue-list interface admission before side effects.
   * @param {ITr2InteriorLight|null} lightSource Light to attach.
   * @returns {void}
   */
  @be.mapMethodAndWrap()
  @meta.adapted
  AddLightSource(lightSource)
  {
    if (!lightSource)
    {
      CcpLog.CCP_LOGERR("Attempt to add NULL light source to interior scene!");
      return;
    }
    if (typeof lightSource !== "object" || blue.classes.QueryThisInterface(lightSource, ITr2InteriorLight, lightSource.constructor, CjsBlueClasses.BLUEQIOPT.BEQI_SILENT) === null)
      throw new TypeError("Tr2InteriorScene.AddLightSource requires ITr2InteriorLight.");
    if (this.lights.FindKey(lightSource) === -1) this.lights.Insert(-1, lightSource);
    this.SetupShadowMaps();
  }

  /** Carbon method Pick -> PyPick (MAP_METHOD). */
  @be.mapMethod()
  @meta.notImplemented
  Pick(...args)
  {
    throw new Error("Tr2InteriorScene.Pick is not implemented in CarbonEngineJS.");
  }

  /** Carbon method PickObjectAndArea -> PyPickObjectAndArea (MAP_METHOD). */
  @be.mapMethod()
  @meta.notImplemented
  PickObjectAndArea(...args)
  {
    throw new Error("Tr2InteriorScene.PickObjectAndArea is not implemented in CarbonEngineJS.");
  }

  /** Carbon method PickPointAndObject -> PyInteriorPickPointAndObject (MAP_METHOD). */
  @be.mapMethod()
  @meta.notImplemented
  PickPointAndObject(...args)
  {
    throw new Error("Tr2InteriorScene.PickPointAndObject is not implemented in CarbonEngineJS.");
  }

  /** Carbon method PickObjectUV (MAP_METHOD_AND_WRAP). */
  @be.mapMethodAndWrap()
  @meta.notImplemented
  PickObjectUV(...args)
  {
    throw new Error("Tr2InteriorScene.PickObjectUV is not implemented in CarbonEngineJS.");
  }

  /**
   * Carbon RebuildSceneData (h:106, cpp:1402-1422): rebuild dynamic membership
   * and its unique pending-load set without replacing the authored list.
   * @returns {void}
   */
  @be.mapMethodAndWrap()
  @meta.implemented
  RebuildSceneData()
  {
    this._dynamicsPendingLoad.length = 0;
    for (const dynamic of this.dynamics)
    {
      dynamic.RemoveFromScene();
      if (!dynamic.AddToScene(this._apexScene) && !this._dynamicsPendingLoad.includes(dynamic))
        this._dynamicsPendingLoad.push(dynamic);
    }
  }

  /**
   * Carbon RemoveDynamic (h:115, cpp:1004-1022): remove scene membership and
   * pending load. Blue-list removal also delivers the native observer callback.
   * @param {ITr2InteriorDynamic|null} dynamic Dynamic object to remove.
   * @returns {void}
   */
  @be.mapMethodAndWrap()
  @meta.implemented
  RemoveDynamic(dynamic)
  {
    const index = this.dynamics.FindKey(dynamic);
    if (index === -1)
    {
      CcpLog.CCP_LOG("Tr2InteriorScene::RemoveDynamic() - interiorDynamic not found in the scene!");
      return;
    }

    dynamic.RemoveFromScene();
    this.dynamics.Remove(index);

    const pending = this._dynamicsPendingLoad.indexOf(dynamic);
    if (pending !== -1) this._dynamicsPendingLoad.splice(pending, 1);
  }

  /**
   * Carbon RemoveLightSource (h:111, cpp:941-962): remove a present light and
   * refresh shadow targets, including the Blue-list observer's own refresh.
   * @param {ITr2InteriorLight|null} lightSource Light to detach.
   * @returns {void}
   */
  @be.mapMethodAndWrap()
  @meta.implemented
  RemoveLightSource(lightSource)
  {
    if (!lightSource)
    {
      CcpLog.CCP_LOGERR("Attempt to remove a NULL light source from interior scene!");
      return;
    }
    const index = this.lights.FindKey(lightSource);
    if (index === -1)
    {
      CcpLog.CCP_LOGERR("Tr2InteriorScenel::RemoveLightSource() - interiorLightSource not found in the scene!");
      return;
    }
    this.lights.Remove(index);
    this.SetupShadowMaps();
  }

  /** Carbon method UpdateScene -> UpdateSceneFromScript (MAP_METHOD_AND_WRAP). */
  @meta.renamed("UpdateSceneFromScript")
  @meta.notImplemented
  UpdateScene(...args)
  {
    throw new Error("Tr2InteriorScene.UpdateScene is not implemented in CarbonEngineJS.");
  }

  /** Native depth-stencil owner, replaced whenever shadow targets are rebuilt. */
  _lightDepthStencil = null;

  /**
   * m_perFrameVSBuffer (Tr2InteriorScene.h:304).
   * Waiting: Carbon replaces it in ReleaseResources( TRISTORAGE_ALL )
   * (cpp:287-293); this scene has no ReleaseResources yet.
   */
  _perFrameVSBuffer = new Tr2ConstantBufferAL();

  /** Carbon Render (h:76, cpp:488-500): forward, debug, then clear active lights. */
  @meta.implemented
  Render(renderContext)
  {
    this._RenderFullForward(renderContext);
    this.RenderDebugInfo__RenderContext(renderContext);
    this._activeLightSet.Clear();
  }

  /** Carbon RenderPass (h:81, cpp:885-898) only renders the main pass. */
  @meta.implemented
  RenderPass(pass, renderContext)
  {
    if (pass === ITr2MultiPassScene.PassType.RP_MAIN_RENDER) this.Render(renderContext);
    return ITr2MultiPassScene.RenderPassResult.PASS_RESULT_OK;
  }

  /** Carbon SetRenderBackgroundCubeMap (h:104, cpp:901-904). */
  @meta.implemented
  SetRenderBackgroundCubeMap(renderBackgroundCubeMap)
  {
    this._renderBackgroundCubeMap = renderBackgroundCubeMap;
  }

  /** Carbon VisibilityQuery (h:83, cpp:511-560): choose LOD before culling. */
  @meta.implemented
  VisibilityQuery(results, renderContext)
  {
    if (!results)
    {
      CcpLog.CCP_LOGERR("Attempt to issue a visibility query on an interior scene with a NULL result set!");
      return;
    }
    this.visibilityResults = results;
    results.Clear();

    const { frustum_0 } = Tr2InteriorScene.scratch;
    frustum_0.DeriveFrustum(Tr2Renderer.GetViewTransform(), Tr2Renderer.GetViewPosition(), Tr2Renderer.GetProjectionTransform(), renderContext.GetEffectStateManager().GetViewport());
    const size = this.dynamics.length;
    for (const dynamic of this.dynamics)
    {
      if (size !== this.dynamics.length) CcpLog.CCP_LOGERR("VisibilityQuery-m_dynamics changed size while we iterated over it! (before setlod)");
      if (!dynamic) CcpLog.CCP_LOGERR("VisibilityQuery-null pointer in m_dynamics");
      dynamic.SetLOD(frustum_0);
      if (size !== this.dynamics.length) CcpLog.CCP_LOGERR("VisibilityQuery-m_dynamics changed size while we iterated over it! (after setlod)");
    }
    this._visibilityQueryType = VisibilityQueryType.PRIMARY_QUERY;
    this._ResolveVisibility(Tr2Renderer.GetViewTransform(), Tr2Renderer.GetProjectionTransform(), true);
  }

  /** Carbon ResolveVisibility (h:144, cpp:562-585); maxDepth is unused natively. */
  @meta.implemented
  _ResolveVisibility(view, projection, _maxDepth)
  {
    const { frustum_1, viewport_0, mat4_0, mat4_1, vec3_0 } = Tr2InteriorScene.scratch;
    mat4.invert(mat4_0, view);
    vec3.set(vec3_0, mat4_0[12], mat4_0[13], mat4_0[14]);
    frustum_1.DeriveFrustum(view, vec3_0, projection, viewport_0);
    this._OnQueryBegin();
    for (const dynamic of this.dynamics)
      if (dynamic.IsInFrustum(frustum_1, mat4_1)) this._OnInstanceVisible(dynamic, mat4_1);
    for (const light of this.lights)
      if (light.IsInFrustum(frustum_1, mat4_1)) this._OnInstanceVisible(light, mat4_1);
  }

  /** Carbon OnQueryBegin (h:128, cpp:1030-1039). */
  @meta.implemented
  _OnQueryBegin()
  {
    const event = new Tr2VisibilityEvent();
    event.eventType = Tr2VisibilityEvent.EventType.QUERY_BEGIN;
    if (this._visibilityQueryType === VisibilityQueryType.PRIMARY_QUERY)
      this.visibilityResults.AddVisibilityEvent(event);
  }

  /** Carbon OnInstanceVisible (h:129, cpp:1041-1061), copying the native matrix value. */
  @meta.implemented
  _OnInstanceVisible(cullable, objectToWorld)
  {
    const event = new Tr2VisibilityEvent();
    event.eventType = Tr2VisibilityEvent.EventType.INSTANCE_VISIBLE;
    event.userData = cullable;
    mat4.copy(event.objectToWorldMatrix, objectToWorld);
    if (this._visibilityQueryType === VisibilityQueryType.PRIMARY_QUERY)
      this.visibilityResults.AddVisibilityEvent(event);
    else if (this._visibilityQueryType === VisibilityQueryType.PICKING_QUERY)
    {
      const renderable = CjsSchema.cast(cullable, ITr2Renderable);
      if (renderable) this._visibleObjects.push(renderable);
    }
  }

  /** Carbon DoQueryBegin (h:135, cpp:1077-1090) includes every scene light. */
  @meta.implemented
  _DoQueryBegin(_event)
  {
    this._activeLightSet.Clear();
    const { vec3_1 } = Tr2InteriorScene.scratch;
    vec3.zero(vec3_1);
    for (const light of this.lights) this._activeLightSet.AddLight(light, vec3_1);
  }

  /** Carbon DoInstanceVisible (h:137, cpp:1104-1132): opaque, decal, then blend. */
  @meta.implemented
  _DoInstanceVisible(event)
  {
    const interior = CjsSchema.cast(event.userData, ITr2Interior);
    const renderable = CjsSchema.cast(event.userData, ITr2Renderable);
    if (!interior || !renderable) return;
    const batches = this._primaryRenderBatches;
    const data = interior.GetPerObjectDataWithPerInstanceLighting(batches, this._activeLightSet, event.objectToWorldMatrix);
    if (!batches) return;

    batches.SetRenderingMode(RenderingMode.RM_OPAQUE);
    batches.SetUserData(this._ConstructKey(0, Tr2InteriorBatchGroup.WODINTBATCHGROUP_OPAQUE));
    renderable.GetBatches(batches, TriBatchType.TRIBATCHTYPE_OPAQUE, data);
    batches.SetRenderingMode(RenderingMode.RM_DECAL);
    batches.SetUserData(this._ConstructKey(0, Tr2InteriorBatchGroup.WODINTBATCHGROUP_DECAL));
    renderable.GetBatches(batches, TriBatchType.TRIBATCHTYPE_DECAL, data);
    batches.SetRenderingMode(RenderingMode.RM_ALPHA);
    batches.SetUserData(this._ConstructKey(0, Tr2InteriorBatchGroup.WODINTBATCHGROUP_BLEND));
    renderable.GetBatches(batches, TriBatchType.TRIBATCHTYPE_TRANSPARENT, data);
  }

  /** Carbon GatherFullForwardBatches (h:140, cpp:1144-1171). */
  @meta.implemented
  _GatherFullForwardBatches(results)
  {
    if (!results) return;
    for (const event of results.GetEvents())
    {
      if (event.eventType === Tr2VisibilityEvent.EventType.QUERY_BEGIN) this._DoQueryBegin(event);
      else if (event.eventType === Tr2VisibilityEvent.EventType.INSTANCE_VISIBLE) this._DoInstanceVisible(event);
    }
  }

  /** Carbon ConstructKey (h:241, cpp:1252-1259); BigInt retains all 64 bits. */
  @meta.adapted
  _ConstructKey(objectGroup, batchGroup)
  {
    return BigInt.asIntN(64, (BigInt(objectGroup >>> 0) << 48n) | (BigInt(batchGroup) << 32n));
  }

  /** Carbon PopulatePerFrameVSData (h:245, cpp:1261-1271). */
  @meta.implemented
  _PopulatePerFrameVSData(data)
  {
    Tr2ConstantBufferFormats.tr2PopulatePerFrameVSDataTransformations(data);
    Tr2VariableStore.globalStore().FindVariable("Sun.DirWorld").GetValue(data.Get("sunDirWorld"));
  }

  /**
   * Carbon PopulatePerFramePSData (h:244, cpp:1273-1318).
   * Adapted: gl-matrix reverses composition; the ESM exposes target dimensions
   * as fields. Viewport arithmetic rounds at native float operation boundaries.
   */
  @meta.adapted
  _PopulatePerFramePSData(data, renderContext)
  {
    const { mat4_0 } = Tr2InteriorScene.scratch;
    data.Zero();
    mat4.multiply(mat4_0, Tr2Renderer.GetProjectionTransform(), Tr2Renderer.GetViewTransform());
    data.SetAndTranspose("ViewProjectionMat", mat4_0);
    data.SetWithoutTransposing("ViewInverseTransposeMat", Tr2Renderer.GetInverseViewTransform());
    mat4.invert(mat4_0, mat4_0);
    data.SetAndTranspose("ViewProjInverse", mat4_0);

    const esm = renderContext.GetEffectStateManager();
    const viewport = esm.GetViewport();
    const width = Math.fround(esm.renderTargetWidth), height = Math.fround(esm.renderTargetHeight);
    const viewPort = data.Get("viewPort");
    viewPort[0] = Math.fround(viewport.width) / width;
    viewPort[1] = Math.fround(viewport.height) / height;
    viewPort[2] = Math.fround(Math.fround(viewport.x) / width) + Math.fround(0.5 / width);
    viewPort[3] = Math.fround(Math.fround(viewport.y) / height) + Math.fround(0.5 / height);

    const store = Tr2VariableStore.globalStore();
    store.FindVariable("Sun.WodDiffuseColor").GetValue(data.Get("sunDiffuseColor"));
    store.FindVariable("Sun.SpecularColor").GetValue(data.Get("sunSpecularColor"));
    store.FindVariable("Scene.AmbientColor").GetValue(data.Get("sceneAmbientColor"));
    store.FindVariable("Sun.DirWorld").GetValue(data.Get("sunDirWorld"));
    data.Set("cullDirection", 1);
    data.Set("shScale", 0);
    data.Set("shadowCount", this.shadowCount);
    data.Set("invShadowSize", 1 / Math.fround(this.shadowSize));
    data.Set("sceneFogColor", this.fogColor);
    data.Set("maxFogAmount", this.maxFogAmount);
    data.Set("maxFogDistance", this.maxFogDistance);
    data.Set("minFogDistance", this.minFogDistance);
  }

  /**
   * Carbon RenderFullForward (h:146, cpp:587-658).
   * Adapted: the allocator belongs to the active JS context, so bind it here.
   * Profiling markers are omitted; shadows retain their explicit unported gate.
   */
  @meta.adapted
  _RenderFullForward(renderContext)
  {
    if (!this.visibilityResults) this.visibilityResults = new Tr2VisibilityResults();
    this._primaryRenderBatches.SetTriPoolAllocator(renderContext.GetTriPoolAllocator());
    Tr2VariableStore.globalStore().FindVariable("EnvMap1").SetValue(this.backgroundCubemapRes);
    this._RenderShadows(renderContext);
    this.VisibilityQuery(this.visibilityResults, renderContext);
    this._GatherFullForwardBatches(this.visibilityResults);

    // Native legacy ordering reverses each consecutive equal-depth run before sorting.
    const batches = this._primaryRenderBatches.GetBatches();
    for (let start = 0; start < batches.length;)
    {
      if (batches[start].renderingMode !== RenderingMode.RM_ALPHA) { start++; continue; }
      let end = start + 1;
      while (end < batches.length && batches[start].depth === batches[end].depth) end++;
      for (let left = start, right = end - 1; left < right; left++, right--)
      {
        const batch = batches[left]; batches[left] = batches[right]; batches[right] = batch;
      }
      start = end;
    }

    this._PopulatePerFramePSData(this._perFramePSData, renderContext);
    this._PopulatePerFrameVSData(this._perFrameVSData);
    const vs = this._perFrameVSData.GetData(), ps = this._perFramePSData.GetData();
    Tr2RenderUtils.fillAndSetConstants(this._perFrameVSBuffer, vs, vs.byteLength, 1 << ShaderType.VERTEX_SHADER, PER_FRAME_VS, renderContext);
    Tr2RenderUtils.fillAndSetConstants(this._perFramePSBuffer, ps, ps.byteLength, 1 << ShaderType.PIXEL_SHADER, PER_FRAME_PS, renderContext);
    if (this._renderBackgroundCubeMap && this.backgroundEffect)
      Tr2Renderer.drawCameraSpaceScreenQuad(renderContext, this.backgroundEffect.GetShaderStateInterface(), this.backgroundEffect);
    this._RenderGeometry(null, renderContext);
    this._primaryRenderBatches.Clear();
  }

  /**
   * Carbon RenderShadows (h:148, cpp:687-809). Only the disabled-shadow early
   * return is ported; enabled shadows must not silently render without their pass.
   */
  @meta.notImplemented
  _RenderShadows(_renderContext)
  {
    if (!this.renderShadows) return;
    throw new Error("Tr2InteriorScene.RenderShadows is not implemented; disable shadows for forward-only rendering.");
  }

  /** Carbon RenderGeometry (h:222, cpp:811-829) submits through the normal context. */
  @meta.implemented
  _RenderGeometry(overrideEffect, renderContext)
  {
    const esm = renderContext.GetEffectStateManager();
    esm.BeginManagedRendering();
    this._primaryRenderBatches.Finalize();
    esm.ApplyStandardStates(RenderingMode.RM_OPAQUE);
    renderContext.RenderBatchesWithOverride(this._primaryRenderBatches, overrideEffect);
    esm.ApplyStandardStates(RenderingMode.RM_ALPHA);
    esm.EndManagedRendering();
  }

  /**
   * Acquires the background and native unshadowed spotlight texture, without
   * allocating shadow targets (cpp:181-185). Adapted: constructor acquisition
   * moves to Initialize so browser hosts can install their resource handlers
   * before any request; the four variables retain the normal loading handle.
   * @returns {boolean} Whether initialization was accepted.
   */
  @meta.adapted
  Initialize()
  {
    this.SetBackgroundCubemapResPath();
    this._whiteTexture = blue.resMan.GetResource("res:/texture/global/white.dds", { requirement: ResourceRequirement.TEXTURE });
    const store = Tr2VariableStore.globalStore();
    for (let i = 0; i < 4; i++) store.FindVariable(`SpotlightShadow${i}`).SetValue(this._whiteTexture);
    return true;
  }

  /**
   * Applies the native background and shadow member branches. JS coalesces
   * changed names, so a size/count batch rebuilds once using both final values.
   */

  @meta.implemented
  OnModified(name)
  {
    if (IsMatch(name, "backgroundCubemapPath")) this.SetBackgroundCubemapResPath();
    if (IsMatch(name, "shadowSize") || IsMatch(name, "shadowCount")) this.SetupShadowMaps();
    return true;
  }

  /**
   * Acquires a shared texture through the installed or supplied resource host.
   * An empty native path clears the pointer; JS omits that request because its
   * resource manager rejects empty paths. The background effect is unchanged.
   */

  @meta.adapted
  SetBackgroundCubemapResPath(resMan = blue.resMan)
  {
    this.backgroundCubemapRes = null;
    if (this.backgroundCubemapPath)
    {
      this.backgroundCubemapRes = resMan.GetResource(this.backgroundCubemapPath, { requirement: ResourceRequirement.TEXTURE });
    }
  }

  /**
   * Recreates native R32_FLOAT targets and the D32 depth surface, even with no
   * lights. Shared Trinity wrappers realize them through the injected context;
   * JS explicitly destroys replaced wrappers instead of releasing BluePtrs.
   * Carbon ignores Create results here; failed wrappers remain visibly invalid.
   */
  @be.mapMethodAndWrap()
  @meta.adapted
  SetupShadowMaps(renderContext = Tr2RenderContext_GetMainThreadRenderContext())
  {
    for (const target of this.lightRenderTargets) target.Destroy();
    this.lightRenderTargets.length = 0;
    for (let i = 0; i < this.lights.length && i < this.shadowCount; i++)
    {
      const target = new Tr2RenderTarget();
      target.SetName("ShadowMap");
      target.Create(this.shadowSize, this.shadowSize, 1, PixelFormat.PIXEL_FORMAT_R32_FLOAT, 1, 0, 0, undefined, renderContext);
      this.lightRenderTargets.push(target);
    }
    if (this._lightDepthStencil) this._lightDepthStencil.Destroy();
    this._lightDepthStencil = new Tr2DepthStencil();
    this._lightDepthStencil.Create(this.shadowSize, this.shadowSize, DepthStencilFormat.DSFMT_D32, 0, 0, 0, renderContext);
  }

  /**
   * Carbon's ITr2Scene `RenderDebugInfo( Tr2RenderContext& renderContext )`
   * (Tr2InteriorScene.cpp:831-883): the scene's debug pass. Without a debug
   * renderer it creates one only when shadow maps are to be shown, and
   * otherwise does nothing (cpp:833-845). Past the early out it uploads the
   * debug per-frame block - the transposed view-projection and the untransposed
   * inverse view, which the shader reads column-major (cpp:847-856) - then,
   * with the projection re-set from its own transform and restored afterwards
   * (cpp:858-861, ON_BLOCK_EXIT becomes finally), lets every debug-renderable
   * light and dynamic draw, draws the scene's own debug info under full-screen
   * states, and ends with the debug renderer's EndRender and
   * Tr2Renderer.RenderDebugInfo (cpp:862-882).
   *
   * Carbon's row-vector `view * projection` is gl-matrix's
   * `multiply(projection, view)`.
   * @param {Tr2RenderContext} renderContext
   */
  @meta.implemented
  RenderDebugInfo__RenderContext(renderContext)
  {
    if (!this.debugRenderer)
    {
      if (this.debugRenderShadowMaps)
      {
        // Need to create a debug renderer
        this.debugRenderer = new Tr2DebugRenderer();
      }
      else
      {
        return;
      }
    }

    // Display the debug meshes for the lights
    const debugPerFrameData = RawData.create("Tr2PerFrameVSDataDebug");
    const { mat4_0, mat4_2 } = Tr2InteriorScene.scratch;
    mat4.multiply(mat4_0, Tr2Renderer.GetProjectionTransform(), Tr2Renderer.GetViewTransform());
    debugPerFrameData.SetAndTranspose("ViewProjectionMat", mat4_0);

    // attention: need the transposed, but shader also needs column_major, so it is transpose(transpose(m)) == m
    debugPerFrameData.SetWithoutTransposing("ViewInverseTransposeMat", Tr2Renderer.GetInverseViewTransform());

    const bytes = debugPerFrameData.GetData();
    Tr2RenderUtils.fillAndSetConstants(this._perFrameVSBuffer, bytes, bytes.byteLength, 1 << ShaderType.VERTEX_SHADER, PER_FRAME_VS, renderContext);

    this.debugRenderer.BeginRender();
    mat4.copy(mat4_2, Tr2Renderer.GetProjectionRawTransform());

    Tr2Renderer.SetProjectionTransform(Tr2Renderer.GetProjectionTransform());
    try
    {
      for (const light of this.lights)
      {
        const renderable = CjsSchema.cast(light, ITr2DebugRenderable);
        if (renderable)
        {
          renderable.RenderDebugInfo(this.debugRenderer);
        }
      }
      for (const dynamic of this.dynamics)
      {
        const renderable = CjsSchema.cast(dynamic, ITr2DebugRenderable);
        if (renderable)
        {
          renderable.RenderDebugInfo(this.debugRenderer);
        }
      }
      renderContext.GetEffectStateManager().ApplyStandardStates(RenderingMode.RM_FULLSCREEN);
      this.RenderDebugInfo__Renderer(this.debugRenderer);

      this.debugRenderer.EndRender(renderContext);
      Tr2Renderer.RenderDebugInfo(renderContext);
    }
    finally
    {
      Tr2Renderer.SetProjectionTransform(mat4_2);
    }
  }

  /**
   * Carbon's two RenderDebugInfo overloads under the bare name: ITr2Scene's
   * `( Tr2RenderContext& )` (h:77) and ITr2DebugRenderable's
   * `( ITr2DebugRenderer2& )` (h:92). Routes by an exact cast of the
   * argument and throws when it is neither (rule 11).
   * @param {Tr2RenderContext|ITr2DebugRenderer2} contextOrRenderer
   */

  @meta.implemented
  RenderDebugInfo(contextOrRenderer)
  {
    if (CjsSchema.cast(contextOrRenderer, Tr2RenderContext))
    {
      return this.RenderDebugInfo__RenderContext(contextOrRenderer);
    }
    if (CjsSchema.cast(contextOrRenderer, ITr2DebugRenderer2))
    {
      return this.RenderDebugInfo__Renderer(contextOrRenderer);
    }
    throw new TypeError("Tr2InteriorScene.RenderDebugInfo needs a Tr2RenderContext (RenderDebugInfo__RenderContext) or an ITr2DebugRenderer2 (RenderDebugInfo__Renderer).");
  }

  /**
   * Carbon GetDebugOptions (Tr2InteriorScene.cpp:1428-1431).
   * @param {Set<string>} options
   */

  @meta.implemented
  GetDebugOptions(options)
  {
    options.add("Shadow Maps");
  }

  /**
   * Carbon's ITr2DebugRenderable `RenderDebugInfo( ITr2DebugRenderer2& renderer )`
   * (Tr2InteriorScene.cpp:1433-1449): under "Shadow Maps" (or the scene's
   * own flag), each light render target drawn as a 200x200 tile down the
   * left edge, the viewport pushed around the tiles (cpp:1437-1447).
   * Carbon's DrawTexture( renderContext, texture ) with its default
   * coordinates and point filter is Tr2Renderer.drawTexture with no options.
   * @param {ITr2DebugRenderer2} renderer
   */
  @meta.implemented
  RenderDebugInfo__Renderer(renderer)
  {
    if (renderer.HasOption(this, "Shadow Maps") || this.debugRenderShadowMaps)
    {
      const renderContext = Tr2RenderContext_GetMainThreadRenderContext();
      const esm = renderContext.GetEffectStateManager();
      esm.PushViewport();
      let i = 0;
      for (const target of this.lightRenderTargets)
      {
        esm.SetViewport({ width: 200, height: 200, x: 10, y: 10 + i * 210, minZ: 0.0, maxZ: 1.0 });
        const tex = target.GetTexture();
        Tr2Renderer.drawTexture(renderContext, tex);
        i++;
      }
      esm.PopViewport();
    }
  }

  /**
   * Explicit JS final lifetime releases the shadow wrappers owned by this scene.
   *
   * Temporary destructor stand-in: exists because teardown is required before
   * the lifecycle (Destructor) pattern exists. NOT the final mechanism; do not
   * copy this as a pattern. Replaced by the lifecycle API after the IRoot pilot.
   */
  Destruct()
  {
    for (const target of this.lightRenderTargets) target.Destroy();
    this.lightRenderTargets.length = 0;
    if (this._lightDepthStencil) this._lightDepthStencil.Destroy();
    this._lightDepthStencil = null;
    this.backgroundCubemapRes = null;
    this._whiteTexture = null;
  }

  static VisualizeMethod = VisualizeMethod;

  static scratch = {
    mat4_0: mat4.create(), mat4_1: mat4.create(), mat4_2: mat4.create(),
    vec3_0: vec3.create(), vec3_1: vec3.create(), vec4_0: vec4.create(),
    frustum_0: new TriFrustum(), frustum_1: new TriFrustum(), viewport_0: new TriViewport()
  };

}
