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
// implements the spine - update, gather, submit opaque and decal - and nothing
// else. Every omitted stage is a later insertion into the SAME sequence rather
// than a redesign, and they are listed on Execute so a reader can tell "not
// yet" from "not needed".
//
// It does not own the passes Carbon's scene owns. CarbonEngineJS splits
// Carbon's BeginRender/GatherBatches into scene-owned CPU methods that a driver
// calls in order; that contract is written on EveSpaceScene itself, and this is
// the driver it describes.
import { carbon, impl, edit, type } from "#schema";
import { CjsModel } from "#model";
import { vec4 } from "#math/vec4";
import { PixelFormat, TextureType, Tr2GpuUsage } from "#consts/render-context";
import { AmbientOcclusionQuality, AntiAliasingQuality, EveVisualizeMethod } from "../../generated/eve/enums.js";
import { ShadowQuality, Tr2VolumerticQuality } from "../../generated/trinityCore/enums.js";
import { Quality } from "../../generated/postProcess/enums.js";
import { RenderingMode, TriBatchType } from "#consts/graphics";
import { CjsBatchManager } from "../../core/batch/CjsBatchManager.js";
import { TriFrustum } from "../../core/view/TriFrustum.js";
import { Tr2GpuResourcePool } from "../../core/Tr2GpuResourcePool/Tr2GpuResourcePool.js";
import { Tr2Renderer } from "../../core/Tr2Renderer.js";
import { Tr2PostProcessRenderer } from "../../postProcess/Tr2PostProcessRenderer.js";
import "../../core/volumetrics/Tr2VolumetricsRenderer.js";
import "./EveSpaceScene.js";
import { blue, EnumRegistrationType } from "#blue";
import "../../postProcess/effect/Tr2PPEffect.js";
import "#blue/registerTrinityEnums";

/** Collects camera, quality, pass-toggle, overlay, background, and post-process state for driving an EVE space-scene frame. */
@type.define({ className: "EveSpaceSceneRenderDriver", family: "eve/scene", purpose: "Collects camera, quality, pass-toggle, overlay, background, and post-process state for driving an EVE space-scene frame." })
export class EveSpaceSceneRenderDriver extends CjsModel
{

  /** m_settings.aoQuality (AmbientOcclusionQuality - enum AmbientOcclusionQuality) [READWRITE, ENUM] */
  @edit.readwrite
  @type.int32
  @type.enum("trinity.EveSpaceSceneRenderDriver.AmbientOcclusionQuality")
  aoQuality = 0;

  /** m_settings.antiAliasingQuality (AntiAliasingQuality - enum AntiAliasingQuality) [READWRITE, ENUM] */
  @edit.readwrite
  @type.int32
  @type.enum("trinity.EveSpaceSceneRenderDriver.AntiAliasingQuality")
  antiAliasingQuality = 0;

  /** m_settings.visualizeMethod (EveSpaceScene::EveVisualizeMethod - enum EveVisualizeMethod) [READWRITE, ENUM] */
  @edit.readwrite
  @type.int32
  @type.enum("trinity.EveSpaceScene.EveVisualizeMethod")
  visualizeMethod = 0;

  /** m_settings.postProcessingQuality (PostProcess::Quality - enum Quality) [READWRITE, ENUM] */
  @edit.readwrite
  @type.int32
  @type.enum("trinity.PostProcess.Quality")
  postProcessingQuality = 0;

  /** m_settings.shadowQuality (ShadowQuality - enum ShadowQuality) [READWRITE, ENUM] */
  @edit.readwrite
  @type.int32
  @type.enum("trinity.ShadowQuality")
  shadowQuality = 0;

  /** m_customStencilFormat (ImageIO::PixelFormat - enum PixelFormat) [READWRITE, ENUM] */
  @edit.readwrite
  @type.int32
  @type.enum("trinity.ImageIO.PixelFormat")
  customStencilFormat = 0;

  /** m_internalPixelFormat (ImageIO::PixelFormat - enum PixelFormat) [READWRITE, ENUM] */
  @edit.readwrite
  @type.int32
  @type.enum("trinity.ImageIO.PixelFormat")
  internalPixelFormat = 10;

  /** m_settings.volumetricQuality (Tr2VolumerticQuality - enum Tr2VolumerticQuality) [READWRITE, ENUM] */
  @edit.readwrite
  @type.int32
  @type.enum("trinity.Tr2VolumerticQuality")
  volumetricQuality = 0;

  /** m_scene (EveSpaceScenePtr) [PERSISTONLY] */
  @edit.readwrite
  @edit.persistOnly
  @type.model("EveSpaceScene")
  scene = null;

  /** m_name (std::string) [READWRITE] */
  @edit.readwrite
  @type.string
  name = "";

  /** m_settings.enableUpscaling (bool) [READWRITE] */
  @edit.readwrite
  @type.boolean
  enableUpscaling = false;

  /** m_projection (TriProjectionPtr) [READWRITE] */
  @edit.readwrite
  @type.objectRef("TriProjection")
  projection = null;

  /** m_camera (EveCameraPtr) [READWRITE] */
  @edit.readwrite
  @type.objectRef("EveCamera")
  camera = null;

  /** m_view (TriViewPtr) [READWRITE] */
  @edit.readwrite
  @type.objectRef("TriView")
  view = null;

  /** m_settings.clearColor (Color) [READWRITE]; Carbon's default is opaque black (EveSpaceSceneRenderDriver.h:59). */
  @edit.readwrite
  @type.color
  clearColor = vec4.fromValues(0, 0, 0, 1);

  /** m_distortionEffect (Tr2EffectPtr) [READ] */
  @edit.read
  @type.objectRef("Tr2Effect")
  distortionEffect = null;

  /** m_settings.enableDistortion (bool) [READWRITE] */
  @edit.readwrite
  @type.boolean
  enableDistortion = false;

  /** m_reflectionCorrectionEnabled (bool) [READWRITE] */
  @edit.readwrite
  @type.boolean
  reflectionCorrectionEnabled = true;

  /** m_settings.forceOpaqueBuffer (bool) [READWRITE] */
  @edit.readwrite
  @type.boolean
  forceOpaqueBuffer = false;

  /** m_settings.forceNormalMap (bool) [READWRITE] */
  @edit.readwrite
  @type.boolean
  forceNormalMap = false;

  /** m_settings.forceVelocityMap (bool) [READWRITE] */
  @edit.readwrite
  @type.boolean
  forceVelocityMap = false;

  /** m_fpsRenderer (TriStepRenderFpsPtr) [READ] */
  @edit.read
  @type.objectRef("TriStepRenderFps")
  fpsRenderer = null;

  /** m_mainPassRenderingEnabled (bool) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.boolean
  mainPassRenderingEnabled = true;

  /** m_toolsScenes (PITr2SceneVector) [READ] */
  @edit.read
  @type.list("ITr2Scene")
  toolsScenes = [];

  /** m_depthPassTechnique (unknown) [READWRITE] */
  @edit.readwrite
  @type.string
  depthPassTechnique = "Depth";

  /** m_postProcess (Tr2PostProcessRendererPtr) [READ], created in the constructor (cpp:151). */
  @edit.read
  @type.objectRef("Tr2PostProcessRenderer")
  postProcess = new Tr2PostProcessRenderer();

  /** m_settings.showFPS (bool) [READWRITE] */
  @edit.readwrite
  @type.boolean
  showFPS = false;

  /** m_sceneOverlay (ITr2RenderNodePtr) [READWRITE] */
  @edit.readwrite
  @type.objectRef("ITr2RenderNode")
  sceneOverlay = null;

  /** m_background (ITr2RenderNodePtr) [READWRITE] */
  @edit.readwrite
  @type.objectRef("ITr2RenderNode")
  background = null;

  /** m_ssao (Tr2SSAOPtr) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.model("Tr2SSAO")
  SSAO = null;

  /** m_enableRendering (bool) [READWRITE] */
  @edit.readwrite
  @type.boolean
  enableRendering = true;

  /** Carbon method GetAllTempTextures (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.notImplemented
  GetAllTempTextures(...args)
  {
    throw new Error("EveSpaceSceneRenderDriver.GetAllTempTextures is not implemented in CarbonEngineJS.");
  }

  /** The frustum this driver derives each frame; Carbon keeps one per driver. */
  #frustum = new TriFrustum();

  /** Collects renderables into batches; composed, so the caller owns its producers. */
  #batchManager = null;

  /** m_gpuResourcePool: the scene's colour and depth, and every post-process target. */
  #gpuResourcePool = new Tr2GpuResourcePool();

  /** Carbon's Tr2Renderer is static; ours is an instance, prepared per context. */
  #renderer = new Tr2Renderer();

  #preparedContext = null;

  /**
   * The batch types this driver submits, in submission order.
   *
   * Carbon's main pass draws OPAQUE then DECAL (EveSpaceScene.cpp:2725/2731),
   * with transparent and additive following in the same pass (:2758). Only the
   * first two are submitted here; the rest are a later insertion at the marked
   * point in #Submit.
   */
  static SubmittedBatchTypes = Object.freeze([
    TriBatchType.TRIBATCHTYPE_OPAQUE,
    TriBatchType.TRIBATCHTYPE_DECAL
  ]);

  /** The standard states Carbon applies before each accumulator (EveSpaceScene.cpp:1139-1142). */
  static #standardStatesFor = Object.freeze({
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
    this.#batchManager = batchManager ?? null;
    return this;
  }

  /** @returns {CjsBatchManager|null} The composed batch manager. */
  GetBatchManager()
  {
    return this.#batchManager;
  }

  /** @returns {TriFrustum} The frustum derived by the last Execute. */
  GetFrustum()
  {
    return this.#frustum;
  }

  /**
   * Whether this node can run against the requested destinations.
   *
   * Carbon guards on a scene plus either a camera or a view/projection pair
   * (EveSpaceSceneRenderDriver.cpp:406-425) and returns rather than failing,
   * because a driver with nothing to draw is a legitimate frame.
   *
   * @returns {boolean} Whether Execute would draw.
   */
  Validate(_destinationDimensions = null, _outputs = null, _realTime = 0, _simTime = 0)
  {
    if (!this.scene) return false;

    return Boolean(this.camera || (this.view && this.projection));
  }

  /**
   * Drives one frame of a space scene into its destination.
   *
   * The spine of Carbon's Execute, in Carbon's order. NOT here, each an
   * insertion into this same sequence: the background node, the reflection
   * pass, the depth prepass, shadows, SSAO, the light-list update, distortion
   * and velocity maps, transparent and additive submission, the scene overlay,
   * lensflare occlusion queries and 3D UI. The scene renders into its own
   * colour and depth and the post process draws it into the destination.
   *
   * Rendering-disabled is not a no-op in Carbon either: the scene still
   * updates, so simulation keeps running while nothing is drawn (cpp:408-419).
   *
   * @returns {boolean} Whether anything was submitted.
   */
  Execute(destinations = null, _outputs = null, realTime = 0, simTime = 0, _rootTimer = null, renderContext = null)
  {
    if (!renderContext || !this.Validate()) return false;

    const target = Array.isArray(destinations) ? destinations[0] ?? null : destinations;

    // RENDERING DISABLED (cpp:408-419): camera onto the renderer and the scene
    // update, so simulation keeps running - and nothing else. No target borrow,
    // no clear, no camera update.
    if (!this.enableRendering)
    {
      this.#SetCameraToRenderer(renderContext);
      this.scene.Update(realTime, simTime);
      return false;
    }

    // Carbon's camera reads gTriDev->AspectRatio() (EveCamera.cpp:507); the
    // destination's is the equivalent here.
    this.camera?.Update(simTime, target ? target.GetWidth() / target.GetHeight() : 1, realTime);

    // THE SCENE RENDERS INTO ITS OWN COLOUR AND DEPTH (cpp:461, 471), and the
    // post process draws the result into the destination (cpp:602-609).
    // Carbon always has a destination; a null one - which tests use - keeps
    // drawing into whatever is bound, with no post process.
    const offscreen = target ? this.#BeginOffscreen(target, renderContext) : null;

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
    esm.PushRenderTarget(undefined, 0);
    esm.PushRenderTarget(undefined, 1);
    esm.PushDepthStencilBuffer();

    try
    {
      if (offscreen) this.#BeginRenderPass(esm, [ offscreen.color.Get() ], offscreen.depth.Get());

      renderContext.Clear({ color: this.clearColor, depth: 0 });

      // AFTER the scene target is bound (cpp:473-476), because the projection
      // and frustum read the bound viewport; BEFORE the update, so the scene's
      // own update reads this frame's view (cpp:476 -> 479).
      this.#SetCameraToRenderer(renderContext);

      this.scene.Update(realTime, simTime);

      const submitted = this.#RenderMainPass(renderContext);

      if (offscreen)
      {
        handedOff = true;
        this.#PostProcess(target, offscreen, renderContext);
      }

      return submitted;
    }
    finally
    {
      esm.PopDepthStencilBuffer();
      esm.PopRenderTarget(1);
      esm.PopRenderTarget(0);
      esm.SetInvertedDepthTest(false);

      if (offscreen && !handedOff) this.#EndOffscreen(offscreen);
    }
  }

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
  #BeginRenderPass(esm, colorAttachments, depthAttachment)
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
   * @param {object} renderContext Recording render context.
   * @returns {boolean} Whether anything was submitted.
   */
  #RenderMainPass(renderContext)
  {
    // BeginRender's CPU half, in the order EveSpaceScene's own contract gives.
    // The impact data texture is republished first (EveSpaceScene.cpp:1324-1327).
    if (this.scene.dataTextureMgr) this.scene.dataTextureMgr.SetVariables();
    this.scene.BlendLightingOverrides();
    this.scene.UpdateFogSettings();
    this.scene.UpdateVisibility?.(renderContext.GetInverseViewTransform?.() ?? null);

    const map = this.#Collect(this.scene.GetRenderables?.([]) ?? [], renderContext);

    // Carbon populates per-frame data AFTER the gather, because the blended sun
    // colour is only current once lights have been gathered (cpp:1396-1426),
    // and BEFORE the render job's steps draw the batches. RenderBatches draws
    // immediately now - Carbon's shape - so the blocks must be populated AND
    // BOUND here, between the gather and the submission.
    //
    // No explicit null for the fills' `frame`: a default parameter replaces only
    // undefined, and with null both fills threw on their first field read, so
    // every frame of a real EveSpaceScene died here.
    this.scene.PopulatePerFramePSData?.(renderContext);
    this.scene.PopulatePerFrameVSData?.(renderContext);

    // The scene's own apply (EveSpaceScene::ApplyPerFrameData, cpp:818-828),
    // not the generic Tr2BindPerFrame*Data: the space scene binds its vertex
    // block for compute as well, which dynamic exposure reads Time from.
    this.scene.ApplyPerFrameData(renderContext);

    // Carbon gates the main pass on the scene's display flag AND this switch
    // (cpp:527).
    if (!this.mainPassRenderingEnabled || this.scene.display === false) return false;

    return this.#Submit(map, renderContext);
  }

  /**
   * Borrows the scene's colour and depth (cpp:461, 471): the internal pixel
   * format at the destination's size, and a 32-bit float depth.
   */
  #BeginOffscreen(target, renderContext)
  {
    const pool = this.#gpuResourcePool;

    if (this.#preparedContext !== renderContext)
    {
      pool.SetRenderContext(renderContext);
      this.#renderer.PrepareDeviceResources(renderContext);
      this.#preparedContext = renderContext;
    }

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
      color: texture("customBackBuffer", this.internalPixelFormat, Tr2GpuUsage.RENDER_TARGET | Tr2GpuUsage.SHADER_RESOURCE),
      depth: texture("depthBuffer", PixelFormat.PIXEL_FORMAT_D32_FLOAT, Tr2GpuUsage.DEPTH_STENCIL | Tr2GpuUsage.SHADER_RESOURCE)
    };
  }

  /** Returns the scene's colour and depth when the frame ends without a post process. */
  #EndOffscreen(offscreen)
  {
    this.#gpuResourcePool.Free(offscreen.color);
    this.#gpuResourcePool.Free(offscreen.depth);
  }

  /**
   * Binds the destination and runs the post process into it (cpp:602-609).
   * Execute owns and frees both handles, as Carbon moves them into it.
   */
  #PostProcess(target, offscreen, renderContext)
  {
    const esm = renderContext.GetEffectStateManager();

    esm.SetRenderTarget(0, target);
    esm.SetDepthStencilBuffer(null);

    this.postProcess.Execute(target, offscreen.color, offscreen.depth, null, null, this.scene, null, this.#gpuResourcePool, renderContext, this.#renderer);
  }

  /**
   * Collects one frame's batches.
   *
   * @param {Array<object>} renderables Pre-culled renderables.
   * @param {object} renderContext Recording render context.
   * @returns {object|null} The batch map, or null without a manager.
   */
  #Collect(renderables, renderContext)
  {
    if (!this.#batchManager) return null;

    this.#batchManager.Collect(renderables, undefined, renderContext);

    return this.#batchManager.GetBatchMap();
  }

  /**
   * Submits one frame's collected batches.
   *
   * @param {object|null} map The batch map `#Collect` produced.
   * @param {object} renderContext Recording render context.
   * @returns {boolean} Whether anything was submitted.
   */
  #Submit(map, renderContext)
  {
    if (!map) return false;

    let submitted = false;

    for (const batchType of EveSpaceSceneRenderDriver.SubmittedBatchTypes)
    {
      const accumulator = map?.GetAccumulator?.(batchType) ?? null;

      // An empty accumulator is submitted anyway. Carbon does not test one, and
      // a pass that draws nothing is still a pass; skipping it here would move a
      // frame-planning decision into the driver.
      if (!accumulator) continue;

      // Carbon applies the accumulator's standard states first
      // (EveSpaceScene.cpp:1139-1142): a batch whose own mode is RM_ANY would
      // otherwise inherit whatever was last applied - after one frame, the
      // post process's RM_FULLSCREEN.
      renderContext.GetEffectStateManager().ApplyStandardStates(EveSpaceSceneRenderDriver.#standardStatesFor[batchType]);
      submitted = renderContext.RenderBatches(accumulator) || submitted;
    }

    // Transparent, additive and distortion submission belongs here, after the
    // opaque family and before the overlay, exactly as Carbon orders them.

    return submitted;
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
  #SetCameraToRenderer(renderContext)
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

    if (viewport) this.#frustum.DeriveFrustum(view, renderContext.GetViewPosition() ?? null, projection, viewport);

    this.scene.StampFrameContext?.({ frustum: this.#frustum });
  }

  static AmbientOcclusionQuality = AmbientOcclusionQuality;

  static AntiAliasingQuality = AntiAliasingQuality;

  static EveVisualizeMethod = EveVisualizeMethod;

  static Quality = Quality;

  static ShadowQuality = ShadowQuality;

  static Tr2VolumerticQuality = Tr2VolumerticQuality;

  static PixelFormat = PixelFormat;

}

// Registered as Carbon registers it (trinity/trinity/Eve/EveSpaceSceneRenderDriver_Blue.cpp:53).
blue.enums.RegisterEnum("trinity.EveSpaceSceneRenderDriver.AmbientOcclusionQuality", EveSpaceSceneRenderDriver.AmbientOcclusionQuality, {
  source: "trinity/trinity/Eve/EveSpaceSceneRenderDriver.h", family: "eve/scene", line: 39,
  exposedName: "EveSpaceSceneRenderDriverAmbientOcclusionQuality", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooserSource: "trinity/trinity/Eve/EveSpaceSceneRenderDriver_Blue.cpp:18",
  chooser: [
    { name: "Disabled", value: EveSpaceSceneRenderDriver.AmbientOcclusionQuality.Disabled, description: "" },
    { name: "Low", value: EveSpaceSceneRenderDriver.AmbientOcclusionQuality.Low, description: "" },
    { name: "Medium", value: EveSpaceSceneRenderDriver.AmbientOcclusionQuality.Medium, description: "" },
    { name: "High", value: EveSpaceSceneRenderDriver.AmbientOcclusionQuality.High, description: "" }
  ]
});

// Registered as Carbon registers it (trinity/trinity/Eve/EveSpaceSceneRenderDriver_Blue.cpp:52).
blue.enums.RegisterEnum("trinity.EveSpaceSceneRenderDriver.AntiAliasingQuality", EveSpaceSceneRenderDriver.AntiAliasingQuality, {
  source: "trinity/trinity/Eve/EveSpaceSceneRenderDriver.h", family: "eve/scene", line: 32,
  exposedName: "EveSpaceSceneRenderDriverAntiAliasingQuality", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooserSource: "trinity/trinity/Eve/EveSpaceSceneRenderDriver_Blue.cpp:11",
  chooser: [
    { name: "Disabled", value: EveSpaceSceneRenderDriver.AntiAliasingQuality.Disabled, description: "" },
    { name: "Low", value: EveSpaceSceneRenderDriver.AntiAliasingQuality.Low, description: "" },
    { name: "Medium", value: EveSpaceSceneRenderDriver.AntiAliasingQuality.Medium, description: "" },
    { name: "High", value: EveSpaceSceneRenderDriver.AntiAliasingQuality.High, description: "" }
  ]
});

// Registered as Carbon registers it (trinity/trinity/Eve/EveSpaceSceneRenderDriver_Blue.cpp:54).
blue.enums.RegisterEnum("trinity.ShadowQuality", EveSpaceSceneRenderDriver.ShadowQuality, {
  source: "trinity/trinity/Tr2LightManager.h", family: "eve/scene", line: 25,
  exposedName: "ShadowQuality", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooserSource: "trinity/trinity/Eve/EveSpaceSceneRenderDriver_Blue.cpp:25",
  chooser: [
    { name: "Disabled", value: EveSpaceSceneRenderDriver.ShadowQuality.SHADOW_DISABLED, description: "" },
    { name: "Low", value: EveSpaceSceneRenderDriver.ShadowQuality.SHADOW_LOW, description: "" },
    { name: "High", value: EveSpaceSceneRenderDriver.ShadowQuality.SHADOW_HIGH, description: "" },
    { name: "Raytraced", value: EveSpaceSceneRenderDriver.ShadowQuality.SHADOW_RAYTRACED, description: "" }
  ]
});
