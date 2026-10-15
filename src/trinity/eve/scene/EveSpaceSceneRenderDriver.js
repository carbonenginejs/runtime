// Source: trinity/trinity/Eve/EveSpaceSceneRenderDriver.{h,cpp}
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
//
// THE FRAME DRIVER. Carbon's EveSpaceScene::Render is an empty function body
// (EveSpaceScene.cpp:2947-2949) and TriStepRenderScene calls it anyway, so a
// scene draws nothing through that path in Carbon either. The real driver is
// this class, an ITr2RenderNode reached through Tr2StepExecuteRenderNode from a
// render job (EveSpaceSceneRenderDriver.cpp:404).
//
// DELIBERATELY PARTIAL. Carbon's Execute is a forty-step frame: background,
// reflection, depth prepass, shadows, SSAO, light lists, distortion, the main
// colour pass, overlays, lensflare occlusion, post-process and 3D UI. This
// implements the frame sequence through scene overlays and post-processing.
// Unported upscaling, named outputs and 3D UI remain explicit limitations.
//
// It does not own the passes Carbon's scene owns. CarbonEngineJS splits
// Carbon's BeginRender/GatherBatches into scene-owned CPU methods that a driver
// calls in order; that contract is written on EveSpaceScene itself, and this is
// the driver it describes.
import { meta, type, blue } from "#schema";
import { ITr2RenderNode } from "#interfaces/ITr2RenderNode";
import { CcpTime } from "#blue";
import { vec4 } from "#math/vec4";
import { mat4 } from "#math/mat4";
import { PixelFormat, TextureType, Tr2GpuUsage, Tr2LoadAction, Tr2StoreAction } from "#consts/render-context";
import { Tr2ColorAttachment, Tr2DepthAttachment, Tr2SubresourceData, Tr2TextureSubresource, Tr2TextureAL } from "#trinityal";
import { Tr2Effect } from "../../shader/Tr2Effect.js";
import { AmbientOcclusionQuality, AntiAliasingQuality, EveVisualizeMethod } from "../../generated/eve/enums.js";
import { ShadowQuality, SSAOQuality, Tr2VolumerticQuality } from "../../generated/trinityCore/enums.js";
import { TR2SHADERMODEL } from "#consts/graphics";
import { Quality } from "../../generated/postProcess/enums.js";
import { RenderingMode, TriBatchType } from "#consts/graphics";
import { CjsBatchManager } from "../../core/batch/CjsBatchManager.js";
import { TriFrustum } from "../../core/view/TriFrustum.js";
import { GpuResourceHandle } from "../../core/Tr2GpuResourcePool/GpuResourceHandle.js";
import { Tr2GpuResourcePool } from "../../core/Tr2GpuResourcePool/Tr2GpuResourcePool.js";
import { Tr2Renderer } from "../../core/Tr2Renderer.js";
import { Tr2ShadowMap } from "../../core/Tr2ShadowMap.js";
import { Tr2LightManager } from "../../core/lighting/Tr2LightManager.js";
import { COMPUTE_LIGHT_LISTS_EFFECT_PATH } from "#consts/effectPaths";
import { Tr2TextureReference } from "../../core/Tr2TextureReference.js";
import { Tr2VariableStore } from "../../core/variable/Tr2VariableStore.js";
import { Tr2PostProcessRenderer } from "../../postProcess/Tr2PostProcessRenderer.js";
import { Tr2PPTaaEffect } from "../../postProcess/effect/Tr2PPTaaEffect.js";
import "../../core/volumetrics/Tr2VolumetricsRenderer.js";
// A cycle with EveSpaceScene.js; each side reads the other only inside methods.
import { EveSpaceScene } from "./EveSpaceScene.js";
import { be } from "#blue";
import { TriVariableContentType } from "../../generated/trinityCore/enums.js";
import "../../postProcess/effect/Tr2PPEffect.js";
import "#consts/renderContext/formats";

/** Collects camera, quality, pass-toggle, overlay, background, and post-process state for driving an EVE space-scene frame. */
@blue.define({ className: "EveSpaceSceneRenderDriver", purpose: "Collects camera, quality, pass-toggle, overlay, background, and post-process state for driving an EVE space-scene frame." })
@blue.inherit(ITr2RenderNode)
@blue.interface(ITr2RenderNode)
export class EveSpaceSceneRenderDriver
{

  /** m_settings.aoQuality (AmbientOcclusionQuality - enum AmbientOcclusionQuality) [READWRITE, ENUM] */
  @blue.readwrite
  @type.int32
  @type.enum("trinity.EveSpaceSceneRenderDriver.AmbientOcclusionQuality")
  aoQuality = 0;

  /** m_settings.antiAliasingQuality (AntiAliasingQuality - enum AntiAliasingQuality) [READWRITE, ENUM] */
  @blue.readwrite
  @type.int32
  @type.enum("trinity.EveSpaceSceneRenderDriver.AntiAliasingQuality")
  antiAliasingQuality = 0;

  /** m_settings.visualizeMethod (EveSpaceScene::EveVisualizeMethod - enum EveVisualizeMethod) [READWRITE, ENUM] */
  @blue.readwrite
  @type.int32
  @type.enum("trinity.EveSpaceScene.EveVisualizeMethod")
  visualizeMethod = 0;

  /** m_settings.postProcessingQuality (PostProcess::Quality - enum Quality) [READWRITE, ENUM] */
  @blue.readwrite
  @type.int32
  @type.enum("trinity.PostProcess.Quality")
  postProcessingQuality = 0;

  /** m_settings.shadowQuality (ShadowQuality - enum ShadowQuality) [READWRITE, ENUM] */
  @blue.readwrite
  @type.int32
  @type.enum("trinity.ShadowQuality")
  shadowQuality = 0;

  /** m_customStencilFormat (ImageIO::PixelFormat - enum PixelFormat) [READWRITE, ENUM] */
  @blue.readwrite
  @type.int32
  @type.enum("trinity.ImageIO.PixelFormat")
  customStencilFormat = 0;

  /** m_internalPixelFormat (ImageIO::PixelFormat - enum PixelFormat) [READWRITE, ENUM] */
  @blue.readwrite
  @type.int32
  @type.enum("trinity.ImageIO.PixelFormat")
  internalPixelFormat = 10;

  /** m_settings.volumetricQuality (Tr2VolumerticQuality - enum Tr2VolumerticQuality) [READWRITE, ENUM] */
  @blue.readwrite
  @type.int32
  @type.enum("trinity.Tr2VolumerticQuality")
  volumetricQuality = 0;

  /** m_scene (EveSpaceScenePtr) [PERSISTONLY] */
  @blue.readwrite
  @blue.persistOnly
  @type.rootRef("EveSpaceScene")
  scene = null;

  /** m_name (std::string) [READWRITE] */
  @blue.readwrite
  @type.string
  name = "";

  /** m_settings.enableUpscaling (bool) [READWRITE] */
  @blue.readwrite
  @type.boolean
  enableUpscaling = false;

  /** m_projection (TriProjectionPtr) [READWRITE] */
  @blue.readwrite
  @type.rootRef("TriProjection")
  projection = null;

  /** m_camera (EveCameraPtr) [READWRITE] */
  @blue.readwrite
  @type.rootRef("EveCamera")
  camera = null;

  /** m_view (TriViewPtr) [READWRITE] */
  @blue.readwrite
  @type.rootRef("TriView")
  view = null;

  /** m_settings.clearColor (Color) [READWRITE]; Carbon's default is opaque black (EveSpaceSceneRenderDriver.h:59). */
  @blue.readwrite
  @type.color
  clearColor = vec4.fromValues(0, 0, 0, 1);

  /** m_distortionEffect (Tr2EffectPtr) [READ] */
  @blue.read
  @type.rootRef("Tr2Effect")
  distortionEffect = null;

  /** m_settings.enableDistortion (bool) [READWRITE] */
  @blue.readwrite
  @type.boolean
  enableDistortion = false;

  /** m_reflectionCorrectionEnabled (bool) [READWRITE] */
  @blue.readwrite
  @type.boolean
  reflectionCorrectionEnabled = true;

  /** m_settings.forceOpaqueBuffer (bool) [READWRITE] */
  @blue.readwrite
  @type.boolean
  forceOpaqueBuffer = false;

  /** m_settings.forceNormalMap (bool) [READWRITE] */
  @blue.readwrite
  @type.boolean
  forceNormalMap = false;

  /** m_settings.forceVelocityMap (bool) [READWRITE] */
  @blue.readwrite
  @type.boolean
  forceVelocityMap = false;

  /** m_fpsRenderer (TriStepRenderFpsPtr) [READ] */
  @blue.read
  @type.rootRef("TriStepRenderFps")
  fpsRenderer = null;

  /** m_mainPassRenderingEnabled (bool) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.boolean
  mainPassRenderingEnabled = true;

  /** m_toolsScenes (PITr2SceneVector) [READ] */
  @blue.read
  @type.list("ITr2Scene")
  toolsScenes = [];

  /** m_depthPassTechnique (unknown) [READWRITE] */
  @blue.readwrite
  @type.string
  depthPassTechnique = "Depth";

  /** m_postProcess (Tr2PostProcessRendererPtr) [READ], created in the constructor (cpp:151). */
  @blue.read
  @type.rootRef("Tr2PostProcessRenderer")
  postProcess = new Tr2PostProcessRenderer();

  /** m_settings.showFPS (bool) [READWRITE] */
  @blue.readwrite
  @type.boolean
  showFPS = false;

  /** m_sceneOverlay (ITr2RenderNodePtr) [READWRITE] */
  @blue.readwrite
  @type.rootRef("ITr2RenderNode")
  sceneOverlay = null;

  /** m_background (ITr2RenderNodePtr) [READWRITE] */
  @blue.readwrite
  @type.rootRef("ITr2RenderNode")
  background = null;

  /** m_ssao (Tr2SSAOPtr) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.rootRef("Tr2SSAO")
  SSAO = null;

  /** m_enableRendering (bool) [READWRITE] */
  @blue.readwrite
  @type.boolean
  enableRendering = true;

  /** Carbon method GetAllTempTextures (MAP_METHOD_AND_WRAP). */
  @blue.method
  @meta.notImplemented
  GetAllTempTextures(...args)
  {
    throw new Error("EveSpaceSceneRenderDriver.GetAllTempTextures is not implemented in CarbonEngineJS.");
  }

  /** The frustum this driver derives each frame; Carbon keeps one per driver. */
  _frustum = new TriFrustum();

  /** Collects renderables into batches; composed, so the caller owns its producers. */
  _batchManager = null;

  /** m_gpuResourcePool: the scene's colour and depth, and every post-process target. */
  _gpuResourcePool = new Tr2GpuResourcePool();

  /** Carbon's Tr2Renderer is static; ours is an instance, prepared per context. */
  _renderer = new Tr2Renderer();

  /**
   * m_distortionEffect: the full-screen pass that warps the scene colour by the
   * distortion map, pointed at its path in the constructor (cpp:148-149).
   */
  _distortionEffect = EveSpaceSceneRenderDriver._CreateDistortionEffect();

  /**
   * Creates the scene distortion effect and assigns its authored postprocess
   * effect path.
   */
  static _CreateDistortionEffect()
  {
    const effect = new Tr2Effect();
    effect.SetEffectPathName("res:/graphics/effect/managed/space/postprocess/distortion.fx");
    return effect;
  }

  _preparedContext = null;

  /** Explicit final retirement; Execute cannot restart an owner after teardown. */
  _destroyed = false;

  /** Releases this driver's values after its render job has stopped. */
  Destroy()
  {
    if (this._destroyed) return;
    this._destroyed = true;
    this.enableRendering = false;
    this._depthMapReference.SetTexture(null);
    this._ssaoMapReference.SetTexture(null);
    this._normalMapReference.SetTexture(null);
    this._opaqueMapReference.SetTexture(null);
    this._distortionEffect.Destroy();
    this.postProcess.Destroy();
    this._gpuResourcePool.Destroy();
    this._preparedContext = null;
  }

  /** The provider "DepthMap" is registered with; it holds this frame's scene depth. */
  _depthMapReference = new Tr2TextureReference();

  /** The provider "SSAOMap" is registered with: the SSAO, the empty SSAO, or nothing. */
  _ssaoMapReference = new Tr2TextureReference();

  /** The provider "SpaceSceneNormalMap" is registered with: the depth pass's normals. */
  _normalMapReference = new Tr2TextureReference();

  /** The provider "EveSpaceSceneOpaqueMap" is registered with: the opaque colour copy. */
  _opaqueMapReference = new Tr2TextureReference();

  /**
   * m_viewLast / m_projectionLast (EveSpaceSceneRenderDriver.h:147-149): the
   * previous frame's camera. The driver owns them, not the scene, because
   * several drivers can render one scene; they are handed in at the start of
   * Execute and back out after the main pass (cpp:431-432, 597-598).
   */
  _viewLast = mat4.create();

  _projectionLast = mat4.create();

  /**
   * The opaque family, in submission order: Carbon's RenderOpaqueBatches
   * draws OPAQUE then DECAL (EveSpaceScene.cpp:1124-1150). The transparent
   * family follows after the opaque copy; see _SubmitTransparent.
   */
  static SubmittedBatchTypes = Object.freeze([
    TriBatchType.TRIBATCHTYPE_OPAQUE,
    TriBatchType.TRIBATCHTYPE_DECAL
  ]);

  /** The standard states Carbon applies before each accumulator (EveSpaceScene.cpp:1139-1142). */
  static _standardStatesFor = Object.freeze({
    [TriBatchType.TRIBATCHTYPE_OPAQUE]: RenderingMode.RM_OPAQUE,
    [TriBatchType.TRIBATCHTYPE_DECAL]: RenderingMode.RM_DECAL
  });

  /**
   * Supplies the batch manager this driver collects through.
   *
   * Composed rather than constructed, because which producers and collectors are
   * registered is the caller's: Carbon's equivalent is the scene's component
   * registry plus the quad and instanced-mesh collectors it gathers from
   * (EveSpaceScene.cpp:1509-1520).
   *
   * @param {CjsBatchManager} batchManager Initialized batch manager.
   * @returns {EveSpaceSceneRenderDriver} This driver.
   */
  SetBatchManager(batchManager)
  {
    this._batchManager = batchManager ?? null;
    return this;
  }

  /** @returns {CjsBatchManager|null} The composed batch manager. */
  GetBatchManager()
  {
    return this._batchManager;
  }

  /** @returns {TriFrustum} The frustum derived by the last Execute. */
  GetFrustum()
  {
    return this._frustum;
  }

  /**
   * Validates the frame and its child nodes before the render job executes it
   * (EveSpaceSceneRenderDriver.cpp:299-345).
   * Adapted: destination spans contain JS dimension records. Upscaling and
   * named outputs are not ported, so render size is the destination size.
   * @param {Array<object>} destinationDimensions Destination descriptions.
   * @param {Array<string>} _outputs Named outputs, not yet supported.
   * @param {number} realTime Real time in Blue ticks.
   * @param {number} simTime Simulation time in Blue ticks.
   * @returns {boolean} Whether the render-job step may execute this frame.
   */
  @blue.method
  @meta.adapted
  Validate(destinationDimensions = [], _outputs = [], realTime = 0, simTime = 0)
  {
    if (!destinationDimensions.length) return false;
    if (!this.enableRendering) return true;
    if (!this.scene || !(this.camera || (this.view && this.projection))) return false;

    const { width, height } = destinationDimensions[0];
    // EveSpaceSceneRenderDriver.cpp:326-333: background validates first.
    if (this.background && !this.background.Validate([
      { width, height, depth: 1, mipCount: 1, arraySize: 1, type: TextureType.TEX_TYPE_2D, format: this.internalPixelFormat }
    ], [], realTime, simTime)) return false;

    // EveSpaceSceneRenderDriver.cpp:334-345: slot 1 describes velocity even
    // when this frame will not allocate a velocity texture.
    if (this.sceneOverlay && !this.sceneOverlay.Validate([
      { width, height, depth: 1, mipCount: 1, arraySize: 1, type: TextureType.TEX_TYPE_2D, format: this.internalPixelFormat },
      { width, height, depth: 1, mipCount: 1, arraySize: 1, type: TextureType.TEX_TYPE_2D, format: PixelFormat.PIXEL_FORMAT_R16G16_FLOAT }
    ], [], realTime, simTime)) return false;

    return true;
  }

  /**
   * Drives one frame of a space scene into its destination.
   *
   * Run through a TriRenderJob containing Tr2StepExecuteRenderNode, which
   * validates the driver and its children before executing. Direct execution
   * is not a supported application entry point. The scene renders into
   * its own colour and depth, plus the depth pass's normal map when ambient
   * occlusion is on and TAA's velocity map and opaque copy when
   * anti-aliasing is on, and the post process draws it into the destination.
   *
   * Rendering-disabled is not a no-op in Carbon either: the scene still
   * updates, so simulation keeps running while nothing is drawn (cpp:408-419).
   *
   * Adapted: the scene's CPU gather is split across driver and scene methods;
   * upscaling, named outputs and 3D UI remain unported. A null destination is
   * retained only for isolated legacy tests. JS returns a submission boolean.
   * @returns {boolean} Whether anything was submitted.
   */
  @blue.method
  @meta.adapted
  Execute(destinations = null, _outputs = null, realTime = 0, simTime = 0, rootTimer = null, renderContext = null)
  {
    if (this._destroyed || !renderContext || !this.scene || !(this.camera || (this.view && this.projection))) return false;

    const target = Array.isArray(destinations) ? destinations[0] ?? null : destinations;

    // Step 1 of EveSpaceScene's driver order: the update context carries the
    // frame's render context, whose view the scene's view-dependent updates
    // read (billboards, the flare occluders' transforms).
    this.scene.updateContext.renderContext = renderContext;

    // RENDERING DISABLED (cpp:408-419): camera onto the renderer and the scene
    // update, so simulation keeps running - and nothing else. No target borrow,
    // no clear, no camera update.
    if (!this.enableRendering)
    {
      this._SetCameraToRenderer(renderContext);
      this.scene.Update(realTime, simTime);
      this.UpdateGpuParticleSystem(renderContext);
      return false;
    }

    // The previous frame's camera, for motion vectors (cpp:431-432).
    mat4.copy(this.scene.viewLast, this._viewLast);
    mat4.copy(this.scene.projectionLast, this._projectionLast);

    // Carbon's camera reads gTriDev->AspectRatio() (EveCamera.cpp:507); the
    // destination's is the equivalent here.
    this.camera?.Update(simTime, target ? target.GetWidth() / target.GetHeight() : 1, realTime);

    this._PropagateSettings();

    this._PrepareContext(renderContext);

    // cpp:444 - the white "EmptySSAO" until an SSAO pass replaces it. None is
    // ported, so it is what the main pass samples, as when Carbon's SSAO is
    // off (RenderSSAO, cpp:360-381).
    this._RegisterSSAOMap(EveSpaceSceneRenderDriver.getEmptySSAO(this._gpuResourcePool));

    // THE SCENE RENDERS INTO ITS OWN COLOUR AND DEPTH (cpp:461, 471), and the
    // post process draws the result into the destination (cpp:602-609).
    // Carbon always has a destination; a null one - which tests use - keeps
    // drawing into whatever is bound, with no post process.
    const offscreen = target ? this._BeginOffscreen(target, renderContext) : null;

    // Carbon's pool handles are RAII locals (cpp:461, 471) and release on any
    // exit; the post process owns them once it is called (cpp:608).
    let handedOff = false;

    // The caller's targets are saved for the frame and restored on every exit
    // (cpp:450-457): colour slots 0 and 1, and the depth stencil.
    const esm = renderContext.GetEffectStateManager();

    // REVERSE-Z FOR THE WHOLE FRAME (cpp:446-447): the depth test is inverted
    // and depth clears to 0, and the scene hands shaders the reversed-depth
    // projection. Carbon's post passes (fog, depth of field, god rays) read
    // the depth buffer under that convention.
    esm.SetInvertedDepthTest(true);
    esm.PushRenderTarget__Current(0);
    esm.PushRenderTarget__Current(1);
    esm.PushDepthStencilBuffer__Current();

    try
    {
      // EveSpaceSceneRenderDriver.cpp:463-468: background has no depth and
      // starts with a target-only clear before executing into scene colour.
      if (offscreen && this.background)
      {
        this._BeginRenderPass(esm, [ offscreen.color.Get() ], null);
        renderContext.Clear({ clearColor: true, color: this.clearColor, depth: 0 });
        this.background.Execute([ offscreen.color.Get() ], [], realTime, simTime, rootTimer, renderContext);
      }

      if (offscreen)
      {
        offscreen.depth = this._TempTexture("depthBuffer", offscreen.size, PixelFormat.PIXEL_FORMAT_D32_FLOAT,
          Tr2GpuUsage.DEPTH_STENCIL | Tr2GpuUsage.SHADER_RESOURCE);
        this._BeginRenderPass(esm, [ offscreen.color.Get() ], offscreen.depth.Get());
      }

      // EveSpaceSceneRenderDriver.cpp:474: preserve the authored background.
      renderContext.Clear({ clearColor: !this.background, clearDepth: true, color: this.clearColor, depth: 0 });

      // AFTER the scene target is bound (cpp:473-476), because the projection
      // and frustum read the bound viewport; BEFORE the update, so the scene's
      // own update reads this frame's view (cpp:476 -> 479).
      this._SetCameraToRenderer(renderContext);

      this.scene.Update(realTime, simTime);
      this.UpdateGpuParticleSystem(renderContext);

      // THE SCENE DEPTH IS A GLOBAL, "DepthMap" (cpp:494): TAA, the circle of
      // confusion and the fog composite sample it by name. A texture variable
      // holds a provider, not a bare AL texture, so the depth goes in through
      // this driver's reference, as the blitter publishes BlitSource.
      if (offscreen)
      {
        this._depthMapReference.SetTexture(offscreen.depth.Get());
        Tr2VariableStore.globalStore().RegisterVariableInternal("DepthMap", TriVariableContentType.TRIVARIABLE_TEXTURE_RES, this._depthMapReference);
      }

      // The shadow globals start empty, with the white fallbacks: the shadow
      // pass fills them for the main pass only (cpp:550, 557).
      EveSpaceScene.registerWithVariableStore(EveSpaceSceneRenderDriver._noShadowResources, this._gpuResourcePool);

      // THE DISTORTION MAP (cpp:551-562): borrowed before the main pass, which
      // draws the DISTORTION batches into it, then applied to the scene colour
      // when the setting is on and anything was drawn.
      if (offscreen) offscreen.distortion = this._GetDistortionMapIfNeeded(offscreen.size);

      const submitted = this._RenderMainPass(renderContext, offscreen);

      if (offscreen?.distortion && this.enableDistortion && offscreen.hasDistortion)
      {
        this._ApplyDistortion(offscreen.color.Get(), offscreen.distortion.Get(), renderContext);
      }

      // cpp:565 - SSAOMap is emptied after the main pass.
      this._RegisterSSAOMap(null);

      // EveSpaceSceneRenderDriver.cpp:579-583: outside the main-pass gate,
      // after its opaque copy and distortion, before normal-map retirement.
      if (offscreen && this.sceneOverlay)
      {
        this.sceneOverlay.Execute([ offscreen.color.Get(), offscreen.velocity?.Get() ?? null ],
          [], realTime, simTime, rootTimer, renderContext);
      }

      // EveSpaceSceneRenderDriver.cpp:584-585: the overlay is the last reader.
      this._normalMapReference.SetTexture(null);
      if (offscreen?.normal)
      {
        this._gpuResourcePool.Free(offscreen.normal);
        offscreen.normal = null;
      }

      // LENS-FLARE OCCLUSION (cpp:587-592), after the main pass on the scene
      // target with read-only depth: each lensflare's queries, then the
      // occlusion buffer's Clear/CopyCounters compute - which the god rays
      // read through FlareOcclusionBuffer.
      if (offscreen)
      {
        this._BeginRenderPass(esm, [ offscreen.color.Get() ], offscreen.depth.Get());
        renderContext.SetReadOnlyDepth(true);
        this.scene.RunLensflareOcclusionQueries(offscreen.depth.Get(), renderContext);
        renderContext.SetReadOnlyDepth(false);
      }

      // EndRender's last-frame store, handed back out to this driver (cpp:597-598).
      this.scene.EndRender(renderContext);
      mat4.copy(this._viewLast, this.scene.viewLast);
      mat4.copy(this._projectionLast, this.scene.projectionLast);

      if (offscreen)
      {
        handedOff = true;
        this._PostProcess(target, offscreen, renderContext);
      }

      return submitted;
    }
    finally
    {
      esm.PopDepthStencilBuffer();
      esm.PopRenderTarget(1);
      esm.PopRenderTarget(0);
      esm.SetInvertedDepthTest(false);

      // Carbon restores the empty SSAO and empties DepthMap at the frame's end
      // (cpp:625-626); the pool reclaims the depth texture after this.
      this._RegisterSSAOMap(EveSpaceSceneRenderDriver.getEmptySSAO(this._gpuResourcePool));
      this._depthMapReference.SetTexture(null);

      // An interrupted scene pass must also drop the opaque-map share.
      if (this._opaqueMapReference.GetTexture()) this._opaqueMapReference.SetTexture(null);

      this._normalMapReference.SetTexture(null);

      // The normal map is an Execute local in Carbon (cpp:514), never handed
      // to the post process.
      if (offscreen?.normal)
      {
        this._gpuResourcePool.Free(offscreen.normal);
        offscreen.normal = null;
      }

      // So is the distortion map (cpp:499, 552).
      if (offscreen?.distortion)
      {
        this._gpuResourcePool.Free(offscreen.distortion);
        offscreen.distortion = null;
      }

      // So are the shadow resources (cpp:526).
      for (const handle of Object.values(offscreen?.shadows ?? {}))
      {
        if (handle.IsValid()) this._gpuResourcePool.Free(handle);
      }

      if (offscreen && !handedOff) this._EndOffscreen(offscreen);
    }
  }

  /**
   * GlobalStore().RegisterVariable( "SSAOMap", texture ): the texture goes in
   * through this driver's reference, and a null is Carbon's typed-null
   * Tr2TextureAL{}. A pool handle is released once its texture is taken, as
   * Carbon's temporary does at the end of the statement.
   */
  _RegisterSSAOMap(handle)
  {
    try
    {
      this._ssaoMapReference.SetTexture(handle ? handle.Get() : null);
    }
    finally
    {
      if (handle) this._gpuResourcePool.Free(handle);
    }
    Tr2VariableStore.globalStore().RegisterVariableInternal("SSAOMap", TriVariableContentType.TRIVARIABLE_TEXTURE_RES, this._ssaoMapReference);
  }

  /**
   * Carbon's anonymous-namespace GetEmptySSAO (cpp:40-46): a persistent white
   * 1x1 RGBA8, "no occlusion", for frames without an SSAO pass.
   *
   * @param {Tr2GpuResourcePool} gpuResourcePool The driver's pool.
   * @returns {GpuResourceHandle} The texture.
   */
  @meta.implemented
  static getEmptySSAO(gpuResourcePool)
  {
    return gpuResourcePool.GetPersistentTexture("EmptySSAO", {
      type: TextureType.TEX_TYPE_2D,
      width: 1,
      height: 1,
      depth: 1,
      mipCount: 1,
      format: PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM,
      gpuUsage: Tr2GpuUsage.SHADER_RESOURCE,
      initialData: [ new Tr2SubresourceData(new Uint8Array([ 255, 255, 255, 255 ]), 4, 4) ]
    });
  }

  /** EveSpaceScene::ShadowResources with every texture empty: no shadow pass is ported. */
  static _noShadowResources = {
    shadowMap: new GpuResourceHandle(),
    cascadedShadowDepth: new GpuResourceHandle(),
    pointLightShadowMap: new GpuResourceHandle(),
    pointLightShadowDepth: new GpuResourceHandle()
  };

  /**
   * Carbon's anonymous-namespace BeginRenderPass (cpp:23-38): binds the colour
   * attachments through the effect state manager, unbinds the slots after
   * them, binds the depth, and sets the full-screen viewport - which the
   * projection and frustum then read.
   *
   * QUIRK, reproduced: Carbon's clearing loop increments `index` twice per
   * iteration (`SetRenderTarget( index++, ... )` inside `for( ; ...; ++index )`),
   * so after one attachment it unbinds slots 1 and 3 and leaves slot 2 bound.
   *
   * @param {Tr2EffectStateManager} esm The context's effect state manager.
   * @param {object[]} colorAttachments Colour targets for slots 0..n-1.
   * @param {object|null} depthAttachment The depth stencil.
   * @returns {void}
   */
  _BeginRenderPass(esm, colorAttachments, depthAttachment)
  {
    let index = 0;
    for (const colorAttachment of colorAttachments) esm.SetRenderTarget(index++, colorAttachment);

    // Generously assuming max 4 render targets, as Carbon's comment says.
    const maxRenderTargets = 4;
    for (; index < maxRenderTargets; ++index) esm.SetRenderTarget(index++, null);

    esm.SetDepthStencilBuffer(depthAttachment);
    esm.SetFullScreenViewport();
  }

  /**
   * The gather and main pass of one frame: BeginRender's CPU half, the
   * per-frame blocks, and the opaque family's submission.
   *
   * With an off-screen target it also borrows the TAA maps, as Carbon's
   * Execute does around BeginRender and RenderMainPass (cpp:501, 549): the
   * velocity map after BeginRender, the opaque colour copy only when the main
   * pass runs. They land on `offscreen` so the post process receives them and
   * an early exit frees them.
   *
   * Adapted: BeginRender's CPU gather is split with the scene and native
   * RenderMainPass batches are submitted here through the JS batch manager.
   * @param {object} renderContext Recording render context.
   * @param {object|null} offscreen The scene's borrowed targets, if any.
   * @returns {boolean} Whether anything was submitted.
   */
  @meta.adapted
  _RenderMainPass(renderContext, offscreen)
  {
    // BeginRender's CPU half, in the order EveSpaceScene's own contract gives.
    // Carbon returns from the whole of BeginRender for an undisplayed scene
    // (EveSpaceScene.cpp:1306-1310); the scene-side tail checks it again.
    let map = null;
    let lightManager = null;
    if (this.scene.display)
    {
      // Carbon refreshes directional and source SH data before publishing textures
      // (EveSpaceScene.cpp:1319-1327). This is the CPU sun direction, not the
      // oppositely signed GPU Sun.DirWorld; Carbon supplies unit white here.
      if (this.scene.shLightingManager)
      {
        this.scene.shLightingManager.UpdateWithDirectionalLight(this.scene.sunDirection, [1, 1, 1]);
      }
      // The impact data texture follows the SH refresh.
      if (this.scene.dataTextureMgr) this.scene.dataTextureMgr.SetVariables();


      // BeginRender jitters the camera's projection and draws with the result
      // (EveSpaceScene.cpp:1329-1331).
      this.scene.Jitter(renderContext);
      renderContext.SetProjection(this.scene.jitteredProjection);
      this.scene.BlendLightingOverrides();
      // Carbon's volumetrics block (EveSpaceScene.cpp:1374-1379): the fog settings, the scene's variable store, then
      // the fog's Mie environment map.
      this.scene.UpdateFogSettings();
      this.scene.UpdateVariableStore();
      this.scene.volumetricsRenderer.UpdateFogEnvironmentMap(renderContext);

      // The light manager exists only while dynamic lighting is on
      // (EveSpaceScene.cpp:1378-1388), and publishes its buffers before the gather.
      if (EveSpaceScene.eveSpaceSceneDynamicLighting)
      {
        Tr2LightManager.getOrCreateInstance(COMPUTE_LIGHT_LISTS_EFFECT_PATH).SetVariableStore();
      }
      else
      {
        Tr2LightManager.deleteInstance();
      }
      this.scene.UpdateVisibility(renderContext.GetInverseViewTransform());

      map = this._Collect(this.scene.GetRenderables([], renderContext), renderContext);
      // Carbon's allObjects is the scene list plus camera parent, not flattened
      // renderables or planets. Dispatch after FinalizeBatches (cpp:1470-1527).
      if (this.scene.shLightingManager)
      {
        this.scene.UpdateShLighting([...this.scene.objects, this.scene.cameraAttachmentParent]);
      }

      // After the gather, the scene's global textures - the nebula and the
      // reflection - go through the variable store (UpdateVariableStore,
      // EveSpaceScene.cpp:1390-1397).
      this.scene.UpdateVariableStore();

      // The dynamic lights, after the gather (EveSpaceScene.cpp:1398-1416).
      lightManager = Tr2LightManager.getInstance();

      if (lightManager) this.scene.GatherLights(lightManager);
    }

    if (offscreen) offscreen.velocity = this._GetVelocityMapIfNeeded(offscreen.size);

    // BeginRender's tail, which lives on the scene (EveSpaceScene.cpp:1427-1436):
    // the lensflare pre-render update, then the per-frame fills and their apply,
    // after the gather and lights and BEFORE the batches are drawn. RenderBatches
    // draws immediately - Carbon's shape - so the blocks must be bound here.
    this.scene.BeginRender(this.enableDistortion, renderContext);

    // The reflection probe's cube faces, right after BeginRender (cpp:491-494).
    this.scene.RenderReflectionPass(this._gpuResourcePool, renderContext, this._renderer);

    // THE BACKGROUND PASS (cpp:502-511): the nebula and the rest of the
    // background, into the scene colour before the depth pass, with the
    // velocity map in slot 1 when there is one. Background distortion is
    // applied at once, and the depth buffer rebound.
    if (offscreen)
    {
      const hasBackgroundDistortionBatches = this.scene.RenderBackgroundPass(offscreen.depth.Get(), offscreen.distortion?.Get() ?? null, offscreen.velocity?.Get() ?? null, renderContext, this._renderer);
      if (this.enableDistortion && hasBackgroundDistortionBatches && offscreen.distortion)
      {
        this._ApplyDistortion(offscreen.color.Get(), offscreen.distortion.Get(), renderContext);
        renderContext.GetEffectStateManager().SetDepthStencilBuffer(offscreen.depth.Get());
      }
    }

    // THE DEPTH PASS (cpp:514-521): depth and, when AO or a forced map wants
    // it, the normal map, before shadows and SSAO read them. The depth
    // buffer stays bound; the scene colour is back in slot 0 afterwards.
    if (offscreen && map)
    {
      offscreen.normal = this._GetNormalMapIfNeeded(offscreen.size);
      this.scene.RenderDepthPass(offscreen.depth.Get(), offscreen.normal?.Get() ?? null, null, renderContext, this.depthPassTechnique, map);
    }

    this._normalMapReference.SetTexture(offscreen?.normal?.Get() ?? null);
    Tr2VariableStore.globalStore().RegisterVariableInternal("SpaceSceneNormalMap", TriVariableContentType.TRIVARIABLE_TEXTURE_RES, this._normalMapReference);

    // Carbon gates the main pass on the scene's display flag AND this switch
    // (cpp:527).
    if (!this.mainPassRenderingEnabled || this.scene.display === false)
    {
      // EveSpaceSceneRenderDriver.cpp:567-578: TAA may still need a colour
      // copy when the main pass is skipped. It precedes the scene overlay.
      if (offscreen)
      {
        offscreen.opaque = this._GetOpaqueColorMapIfNeeded(offscreen.size);
        if (offscreen.opaque)
        {
          renderContext.RenderPassHint(new Tr2ColorAttachment(Tr2LoadAction.DONT_CARE, Tr2StoreAction.STORE), null);
          const esm = renderContext.GetEffectStateManager();
          this._BeginRenderPass(esm, [ offscreen.opaque.Get() ], null);
          esm.ApplyStandardStates(RenderingMode.RM_FULLSCREEN);
          Tr2Renderer.drawTexture(renderContext, offscreen.color.Get());
        }
      }
      return false;
    }

    // SHADOWS (cpp:529-532), after the depth pass: the cascaded shadow map and
    // its screen-space factor, held until the frame ends.
    if (offscreen) offscreen.shadows = this.scene.RenderShadows(offscreen.depth.Get(), offscreen.normal?.Get() ?? null, this._gpuResourcePool, renderContext, this._renderer);

    // SSAO (cpp:534-537), after the shadows and before the main pass samples
    // SSAOMap.
    if (offscreen) this._RegisterSSAOMap(this._RenderSSAO(offscreen.depth.Get(), offscreen.normal?.Get() ?? null, renderContext));

    // The light lists, against this frame's depth read-only (cpp:539-546).
    if (offscreen && lightManager)
    {
      renderContext.SetReadOnlyDepth(true);
      lightManager.UpdateLists(offscreen.depth.Get(), renderContext);
      renderContext.SetReadOnlyDepth(false);
    }

    if (offscreen) offscreen.opaque = this._GetOpaqueColorMapIfNeeded(offscreen.size);

    // cpp:550 - the shadow pass's textures as globals, for the main pass.
    if (offscreen?.shadows) EveSpaceScene.registerWithVariableStore(offscreen.shadows, this._gpuResourcePool);

    const velocity = offscreen?.velocity?.Get() ?? null;
    const opaque = offscreen?.opaque?.Get() ?? null;
    const esm = renderContext.GetEffectStateManager();
    let submitted;

    // EveSpaceScene::RenderMainPass's managed-rendering span (cpp:2713, :2789),
    // around the whole main pass as Carbon's is.
    esm.BeginManagedRendering();
    try
    {

      // THE VELOCITY SCOPE (EveSpaceScene.cpp:2715-2735): the velocity map is
      // colour slot 1 for the opaque family, cleared by the pass hint to (0, 0)
      // unless the background pass already wrote it this frame
      // (m_velocityMapDirty), in which case it loads; slot 0 and depth load and
      // store. Carbon's extra ClearRenderTargetIfNoBatches (cpp:2721-2724) is
      // for platforms that drop the hint's clear when nothing is drawn; ours
      // always honours the hint, so it is not ported. Shaders that do not write
      // SV_Target1 leave it alone (the AL masks the target off).
      //
      // Without velocity Carbon hints the colour LOAD/STORE and the depth
      // LOAD/DONT_CARE (cpp:2733); that hint is not ported, because this frame's
      // post process still reads the depth the pass would discard.
      if (velocity)
      {
        esm.PushRenderTarget__TextureAL(velocity, 1);
        try
        {
          renderContext.RenderPassHint(
            new Tr2ColorAttachment(Tr2LoadAction.LOAD, Tr2StoreAction.STORE),
            new Tr2ColorAttachment(this.scene._velocityMapDirty ? Tr2LoadAction.LOAD : Tr2LoadAction.CLEAR, Tr2StoreAction.STORE, 0),
            new Tr2DepthAttachment(Tr2LoadAction.LOAD, Tr2StoreAction.STORE)
          );
          submitted = this._Submit(map, renderContext);
          this.scene._velocityMapDirty = true;
        }
        finally
        {
          esm.PopRenderTarget(1);
        }
      }
      else
      {
        submitted = this._Submit(map, renderContext);
      }

      // THE OPAQUE COLOUR COPY (EveSpaceScene.cpp:2738-2750): the scene colour
      // after the opaque family, which TAA reads as CurrentFrameOpaque and
      // transparent shaders read as the global EveSpaceSceneOpaqueMap.
      if (opaque)
      {
        renderContext.RenderPassHint(new Tr2ColorAttachment(Tr2LoadAction.DONT_CARE, Tr2StoreAction.STORE), null);
        esm.PushDepthStencilBuffer__TextureAL(null);
        esm.PushRenderTarget__TextureAL(opaque);
        try
        {
          esm.ApplyStandardStates(RenderingMode.RM_FULLSCREEN);
          Tr2Renderer.drawTexture(renderContext, offscreen.color.Get());
        }
        finally
        {
          esm.PopRenderTarget();
          esm.PopDepthStencilBuffer();
        }

        this._opaqueMapReference.SetTexture(opaque);
        Tr2VariableStore.globalStore().RegisterVariableInternal("EveSpaceSceneOpaqueMap", TriVariableContentType.TRIVARIABLE_TEXTURE_RES, this._opaqueMapReference);
      }

      // EveSpaceScene.cpp:2754-2774: cloud composition precedes transparency;
      // both sampled volumes stay alive through distortion and GPU particles.
      renderContext.SetProjection(this.scene.jitteredProjection);
      this.scene.PopulateAndApplyPerFrameData(renderContext);
      const volumes = offscreen ? this.scene.RenderVolumetrics(offscreen.depth.Get(), this._gpuResourcePool, renderContext) : null;
      const store = Tr2VariableStore.globalStore();
      if (volumes)
      {
        store.RegisterVariable__TextureAL("EveSceneFroxelFogMap", volumes[0].Get());
        store.RegisterVariable__TextureAL("EveSceneFogVolumeMap", volumes[1].Get());
      }
      try
      {
        submitted = this._SubmitTransparent(map, renderContext) || submitted;

        // THE DISTORTION BATCHES (EveSpaceScene.cpp:2759-2765), into the distortion
        // map with the depth read-only, as Carbon's whole colour pass holds it.
        if (offscreen?.distortion && map)
        {
          renderContext.SetReadOnlyDepth(true);
          try
          {
            offscreen.hasDistortion = this.scene.RenderDistortionBatches(map, offscreen.distortion.Get(), offscreen.depth.Get(), renderContext);
          }
          finally
          {
            renderContext.SetReadOnlyDepth(false);
          }
        }

        // THE GPU PARTICLES (EveSpaceScene.cpp:2766-2771), after the transparent
        // and distortion batches.
        this.scene.GetGpuParticleSystem()?.Render(renderContext);
      }
      finally
      {
        if (volumes)
        {
          store.RegisterVariable__TextureAL("EveSceneFroxelFogMap", new Tr2TextureAL());
          store.RegisterVariable__TextureAL("EveSceneFogVolumeMap", new Tr2TextureAL());
          // Native handle destruction ignores an empty return (Tr2GpuResourcePool.h:180-187).
          for (const volume of volumes) if (volume.IsValid()) this._gpuResourcePool.Free(volume);
        }
      }

    }
    finally
    {
      esm.EndManagedRendering();
    }

    // cpp:557 - the shadow globals are emptied after the main pass.
    if (offscreen?.shadows) EveSpaceScene.registerWithVariableStore(EveSpaceSceneRenderDriver._noShadowResources, this._gpuResourcePool);

    return submitted;
  }

  /**
   * Carbon's private PropagateSettings (cpp:212-280), the anti-aliasing and
   * ambient-occlusion parts. Anti-aliasing creates, updates or removes the TAA
   * effect on the scene's default post process, whose quality is the
   * setting's value. Ambient occlusion enables the SSAO, when there is one,
   * at the quality the setting maps to.
   *
   * Adapted: Carbon's shadow propagation sits between the two, and its
   * post-process quality, volumetric and upscaling propagation follow; none
   * of those passes run in this driver yet.
   *
   * @returns {void}
   */
  @blue.method
  _PropagateSettings()
  {
    const postprocess = this.scene.postprocess;

    if (postprocess)
    {
      if (this.antiAliasingQuality === AntiAliasingQuality.Disabled)
      {
        postprocess.SetTaa(null);
      }
      else
      {
        if (!postprocess.GetTaaIfAvailable()) postprocess.SetTaa(new Tr2PPTaaEffect());

        postprocess.GetTaaIfAvailable().quality = this.antiAliasingQuality;
      }
    }

    // Shadow quality (cpp:233-255): the cascaded shadow map exists at LOW and
    // HIGH. Carbon's raytracing manager is not ported, so RAYTRACED has none.
    if (this.shadowQuality === ShadowQuality.SHADOW_DISABLED || this.shadowQuality === ShadowQuality.SHADOW_RAYTRACED)
    {
      this.scene.cascadedShadowMap = null;
    }
    else if (!this.scene.cascadedShadowMap)
    {
      this.scene.cascadedShadowMap = new Tr2ShadowMap();
    }

    this.scene.shadowQualitySetting = this.shadowQuality;

    if (this.SSAO)
    {
      if (this.aoQuality === AmbientOcclusionQuality.Disabled)
      {
        this.SSAO.Enable(false);
      }
      else
      {
        this.SSAO.Enable(true);

        switch (this.aoQuality)
        {
          case AmbientOcclusionQuality.Low:
            this.SSAO.SetQuality(SSAOQuality.LOW, true);
            break;
          case AmbientOcclusionQuality.Medium:
            this.SSAO.SetQuality(SSAOQuality.MEDIUM, false);
            break;
          default:
            this.SSAO.SetQuality(SSAOQuality.HIGHEST, false);
            break;
        }
      }
    }
    if (this.scene.volumetricsRenderer) this.scene.volumetricsRenderer.SetQuality(this.volumetricQuality);
  }

  /**
   * Carbon's private RenderSSAO (cpp:360-382): the SSAO filtered from the
   * depth and normal maps with depth bound read-only, or the empty SSAO when
   * there is none.
   *
   * Adapted: Carbon's `temporal` is also true under a temporal upscaler,
   * which is not ported, so only the post process's TAA sets it.
   *
   * @param {object} depthMap The scene depth.
   * @param {object|null} normalMap The depth pass's normal map.
   * @param {object} renderContext The frame's context.
   * @returns {GpuResourceHandle} The SSAO texture.
   */
  @blue.method
  _RenderSSAO(depthMap, normalMap, renderContext)
  {
    let ssao = new GpuResourceHandle();

    if (this.scene.display && this.SSAO)
    {
      renderContext.SetReadOnlyDepth(true);

      const scenePostProcess = this.scene.postprocess;
      const temporal = scenePostProcess !== null && scenePostProcess.GetTaaIfAvailable() !== null;

      ssao = this.SSAO.Filter(depthMap, normalMap, this._gpuResourcePool, renderContext, temporal);
      renderContext.SetReadOnlyDepth(false);
    }

    return ssao.IsValid() ? ssao : EveSpaceSceneRenderDriver.getEmptySSAO(this._gpuResourcePool);
  }

  /**
   * Carbon's GetNormalMapIfNeeded (cpp:672-685): an R10G10B10A2_UNORM map
   * when ambient occlusion or ray-traced shadows want normals, on any shader
   * model but the lowest, or when forced.
   *
   * Adapted: Carbon also allocates it for a named render-job output; none
   * exists here.
   *
   * @param {{width: number, height: number}} size The render size.
   * @returns {GpuResourceHandle|null} The map, or null.
   */
  @blue.method
  _GetNormalMapIfNeeded(size)
  {
    const wanted = (this.aoQuality !== AmbientOcclusionQuality.Disabled || this.shadowQuality === ShadowQuality.SHADOW_RAYTRACED)
      && Tr2Renderer.GetShaderModel() !== TR2SHADERMODEL.TR2SM_3_0_LO;

    if (!wanted && !this.forceNormalMap) return null;

    return this._TempTexture("normalMap", size, PixelFormat.PIXEL_FORMAT_R10G10B10A2_UNORM);
  }

  /**
   * Carbon's GetVelocityMapIfNeeded (cpp:653-668): an R16G16_FLOAT map while
   * anti-aliasing is on, or when forced.
   *
   * Adapted: Carbon also allocates it for a temporal upscaler and for a named
   * render-job output; neither exists here.
   *
   * @param {{width: number, height: number}} size The render size.
   * @returns {GpuResourceHandle|null} The map, or null.
   */
  @blue.method
  _GetVelocityMapIfNeeded(size)
  {
    if (this.antiAliasingQuality === AntiAliasingQuality.Disabled && !this.forceVelocityMap) return null;

    return this._TempTexture("velocityMap", size, PixelFormat.PIXEL_FORMAT_R16G16_FLOAT);
  }

  /**
   * Carbon's GetOpaqueColorMapIfNeeded (cpp:702-719): a copy of the scene
   * colour at anti-aliasing Medium and above, or when forced.
   *
   * Adapted: Carbon also allocates it for an upscaler, a named output, and a
   * frame with SSSSS opaque batches; none exists here.
   *
   * @param {{width: number, height: number}} size The render size.
   * @returns {GpuResourceHandle|null} The copy, or null.
   */
  @blue.method
  _GetOpaqueColorMapIfNeeded(size)
  {
    if (this.antiAliasingQuality < AntiAliasingQuality.Medium && !this.forceOpaqueBuffer) return null;

    return this._TempTexture("opaqueBackBuffer", size, this.internalPixelFormat);
  }

  /**
   * Carbon's GetDistortionMapIfNeeded (cpp:644-651): a B8G8R8A8_UNORM target
   * while distortion is enabled.
   *
   * @param {{width: number, height: number}} size The render size.
   * @returns {GpuResourceHandle|null} The map, or null.
   */
  @blue.method
  _GetDistortionMapIfNeeded(size)
  {
    if (!this.enableDistortion) return null;

    return this._TempTexture("distortionMap", size, PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM);
  }

  /**
   * Carbon's ApplyDistortion (cpp:58-70): copies the destination, then draws
   * Distortion.fx over it full screen, reading the copy as BlitCurrent at the
   * offsets the distortion map holds (TexDistortion).
   *
   * @param {object} destination The scene colour.
   * @param {object} distortion The distortion map.
   * @param {object} renderContext The frame's context.
   * @returns {void}
   */
  _ApplyDistortion(destination, distortion, renderContext)
  {
    const effect = this._distortionEffect;
    const backBufferCopy = this._gpuResourcePool.GetTempTexture("backBufferCopy", {
      type: TextureType.TEX_TYPE_2D,
      width: destination.GetWidth(),
      height: destination.GetHeight(),
      depth: 1,
      mipCount: 1,
      format: this.internalPixelFormat,
      gpuUsage: Tr2GpuUsage.COPY_DESTINATION | Tr2GpuUsage.SHADER_RESOURCE
    });

    try
    {
      backBufferCopy.Get().CopySubresourceRegion(new Tr2TextureSubresource(), destination, new Tr2TextureSubresource(), renderContext);

      const esm = renderContext.GetEffectStateManager();
      this._BeginRenderPass(esm, [ destination ], null);
      esm.ApplyStandardStates(RenderingMode.RM_FULLSCREEN);
      effect.SetParameter__TextureAL("BlitCurrent", backBufferCopy.Get());
      effect.SetParameter__TextureAL("TexDistortion", distortion);
      Tr2Renderer.drawFullScreenWithShader(renderContext, effect);
      effect.SetParameter__TextureAL("BlitCurrent", null);
      effect.SetParameter__TextureAL("TexDistortion", null);
    }
    finally
    {
      this._gpuResourcePool.Free(backBufferCopy);
    }
  }

  /** A render-target pool texture of the scene's size. */
  _TempTexture(name, size, format, gpuUsage = Tr2GpuUsage.RENDER_TARGET | Tr2GpuUsage.SHADER_RESOURCE)
  {
    return this._gpuResourcePool.GetTempTexture(name, {
      type: TextureType.TEX_TYPE_2D,
      width: size.width,
      height: size.height,
      depth: 1,
      mipCount: 1,
      format,
      gpuUsage
    });
  }

  /**
   * Binds the pool and prepares the renderer against the frame's context, once
   * per context. Carbon's pool and renderer are device resources, ready before
   * any frame; ours are handed the context here instead.
   */
  _PrepareContext(renderContext)
  {
    if (this._preparedContext === renderContext) return;

    this._gpuResourcePool.SetRenderContext(renderContext);
    Tr2Renderer.prepareDeviceResources(renderContext);
    this._preparedContext = renderContext;
  }

  /**
   * Borrows scene colour (cpp:461); Execute borrows depth after the background
   * node (cpp:471). Adapted: JS groups the native local pool handles in one
   * frame record for explicit cleanup instead of C++ RAII.
   */
  _BeginOffscreen(target, renderContext)
  {
    const pool = this._gpuResourcePool;

    this._PrepareContext(renderContext);

    const size = { width: target.GetWidth(), height: target.GetHeight() };
    const texture = (name, format, gpuUsage) => pool.GetTempTexture(name, {
      type: TextureType.TEX_TYPE_2D,
      width: size.width,
      height: size.height,
      depth: 1,
      mipCount: 1,
      format,
      gpuUsage
    });

    return {
      size,
      color: texture("customBackBuffer", this.internalPixelFormat, Tr2GpuUsage.RENDER_TARGET | Tr2GpuUsage.SHADER_RESOURCE),
      depth: null,
      // Borrowed by the main pass when TAA needs them (_RenderMainPass).
      velocity: null,
      opaque: null,
      // Borrowed for the depth pass when AO needs it; the driver's to free.
      normal: null,
      // The shadow pass's ShadowResources; the driver's to free.
      shadows: null,
      // The distortion map and whether the main pass drew into it.
      distortion: null,
      hasDistortion: false
    };
  }

  /** Returns the scene's targets when the frame ends without a post process. */
  _EndOffscreen(offscreen)
  {
    for (const handle of [ offscreen.color, offscreen.depth, offscreen.velocity, offscreen.opaque ])
    {
      if (handle) this._gpuResourcePool.Free(handle);
    }
  }

  /**
   * Binds the destination and runs the post process into it (cpp:602-609).
   * Execute owns and frees both handles, as Carbon moves them into it.
   */
  _PostProcess(target, offscreen, renderContext)
  {
    const esm = renderContext.GetEffectStateManager();

    esm.SetRenderTarget(0, target);
    esm.SetDepthStencilBuffer(null);

    // Carbon clears this global before post-processing (cpp:604). Leaving
    // the provider populated retains the opaque copy after AA is disabled.
    this._opaqueMapReference.SetTexture(null);
    Tr2VariableStore.globalStore().RegisterVariableInternal("EveSpaceSceneOpaqueMap", TriVariableContentType.TRIVARIABLE_TEXTURE_RES, this._opaqueMapReference);

    this.postProcess.Execute(target, offscreen.color, offscreen.depth, offscreen.velocity, offscreen.opaque, this.scene, null, this._gpuResourcePool, renderContext, this._renderer);
  }

  /**
   * Collects one frame's batches.
   *
   * @param {Array<object>} renderables Pre-culled renderables.
   * @param {object} renderContext Recording render context.
   * @returns {object|null} The batch map, or null without a manager.
   */
  _Collect(renderables, renderContext)
  {
    if (!this._batchManager) return null;

    this._batchManager.Collect(renderables, undefined, renderContext);

    return this._batchManager.GetBatchMap();
  }

  /**
   * Submits one frame's collected batches.
   *
   * @param {object|null} map The batch map `_Collect` produced.
   * @param {object} renderContext Recording render context.
   * @returns {boolean} Whether anything was submitted.
   */
  _Submit(map, renderContext)
  {
    if (!map) return false;

    let submitted = false;

    for (const batchType of EveSpaceSceneRenderDriver.SubmittedBatchTypes)
    {
      const accumulator = map.GetAccumulator(batchType);

      // An empty accumulator is submitted anyway. Carbon does not test one, and
      // a pass that draws nothing is still a pass; skipping it here would move a
      // frame-planning decision into the driver.
      if (!accumulator) continue;

      // Carbon applies the accumulator's standard states first
      // (EveSpaceScene.cpp:1139-1142): a batch whose own mode is RM_ANY would
      // otherwise inherit whatever was last applied - after one frame, the
      // post process's RM_FULLSCREEN.
      renderContext.GetEffectStateManager().ApplyStandardStates(EveSpaceSceneRenderDriver._standardStatesFor[batchType]);
      submitted = renderContext.RenderBatches(accumulator) || submitted;
    }

    return submitted;
  }

  /**
   * Carbon's RenderTransparentBatches (EveSpaceScene.cpp:1156-1178): the
   * transparent accumulator under RM_ALPHA, then the additive one under
   * RM_ALPHA_ADDITIVE. Transparent batches were sorted back to front at
   * collection. Carbon's whole colour pass runs with read-only depth
   * (cpp:2710, 2771); ours makes the transparent family read-only, so these
   * test against the scene depth without writing it.
   *
   * Distortion (cpp:2759-2762) follows, in _RenderMainPass.
   *
   * @param {object|null} map The batch map `_Collect` produced.
   * @param {object} renderContext Recording render context.
   * @returns {boolean} Whether anything was submitted.
   */
  _SubmitTransparent(map, renderContext)
  {
    if (!map) return false;

    const esm = renderContext.GetEffectStateManager();
    let submitted = false;

    renderContext.SetReadOnlyDepth(true);
    try
    {
      for (const [ batchType, renderingMode ] of EveSpaceSceneRenderDriver._transparentFamily)
      {
        const accumulator = map.GetAccumulator(batchType);
        if (!accumulator) continue;

        esm.ApplyStandardStates(renderingMode);
        submitted = renderContext.RenderBatches(accumulator) || submitted;
      }
    }
    finally
    {
      renderContext.SetReadOnlyDepth(false);
    }

    return submitted;
  }

  /** The transparent family and the standard states each is drawn under (cpp:1170-1173). */
  static _transparentFamily = Object.freeze([
    [ TriBatchType.TRIBATCHTYPE_TRANSPARENT, RenderingMode.RM_ALPHA ],
    [ TriBatchType.TRIBATCHTYPE_ADDITIVE, RenderingMode.RM_ALPHA_ADDITIVE ]
  ]);

  /**
   * Carbon UpdateGpuParticleSystem (EveSpaceSceneRenderDriver.cpp:634-642):
   * after the scene update, the per-frame data the particle kernels read, then
   * the particle system's update. Carbon's GPU region is not ported.
   * Adapted: scene time retains Blue ticks; the existing JS particle Update
   * takes seconds. Convert once at this boundary; the native particle method
   * instead converts its tick delta (Tr2GpuParticleSystem.cpp:325).
   *
   * @param {object} renderContext The Tr2RenderContext.
   * @returns {void}
   */
  @blue.method
  @meta.adapted
  UpdateGpuParticleSystem(renderContext)
  {
    const ps = this.scene.GetGpuParticleSystem();

    if (!ps) return;

    this.scene.PopulateAndApplyPerFrameData(renderContext);
    ps.Update(CcpTime.timeAsDouble(this.scene.updateTime), this.scene.updateContext.GetOriginShift(), renderContext);
  }

  /**
   * Puts this frame's projection and view onto the render context, and derives
   * the frustum the scene culls against.
   *
   * Carbon's SetCameraToRenderer (cpp:384-391) sets the projection then the view
   * transform. The frustum derivation is the driver step our own scene contract
   * names, because Carbon derives it inside BeginRender.
   *
   * @param {object} renderContext Recording render context.
   * @returns {void}
   */
  @blue.method
  _SetCameraToRenderer(renderContext)
  {
    // Carbon (cpp:384-391): the camera's TriProjection and TriView when there
    // is a camera, else this driver's own pair - Validate guarantees one.
    //
    // Carbon calls projection->SetProjection( renderContext ), which also
    // folds the bound viewport into the projection (TriProjection.cpp:71-106);
    // that adjustment is not ported, so the projection's transform is set as
    // it stands.
    const projection = (this.camera ? this.camera.GetProjection() : this.projection).GetTransform();
    const view = (this.camera ? this.camera.GetViewMatrix() : this.view).GetTransform();

    renderContext.SetProjection(projection);
    renderContext.SetViewTransform(view);

    // Against the viewport the scene target just bound (the camera is set
    // after BeginOffscreen, as Carbon's is after BeginRenderPass).
    // Carbon always has a device viewport; ours is null until something binds
    // a target, as on the disabled path or a frame with no destination.
    const viewport = renderContext.GetViewport();

    if (viewport) this._frustum.DeriveFrustum(view, renderContext.GetViewPosition(), projection, viewport);

    this.scene.StampFrameContext({ frustum: this._frustum });
  }

  static AmbientOcclusionQuality = AmbientOcclusionQuality;

  static AntiAliasingQuality = AntiAliasingQuality;

  static EveVisualizeMethod = EveVisualizeMethod;

  static Quality = Quality;

  static ShadowQuality = ShadowQuality;

  static Tr2VolumerticQuality = Tr2VolumerticQuality;

  static PixelFormat = PixelFormat;

}
