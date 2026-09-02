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
import { carbon, impl, io, type } from "#schema";
import { CjsModel } from "#model";
import { PixelFormat } from "#consts/render-context";
import { AmbientOcclusionQuality, AntiAliasingQuality, EveVisualizeMethod } from "../../generated/eve/enums.js";
import { ShadowQuality, Tr2VolumerticQuality } from "../../generated/trinityCore/enums.js";
import { Quality } from "../../generated/postProcess/enums.js";
import { TriBatchType } from "#consts/graphics";
import { CjsBatchManager } from "../../core/batch/CjsBatchManager.js";
import { TriFrustum } from "../../core/view/TriFrustum.js";

/** Collects camera, quality, pass-toggle, overlay, background, and post-process state for driving an EVE space-scene frame. */
@type.define({ className: "EveSpaceSceneRenderDriver", family: "eve/scene", purpose: "Collects camera, quality, pass-toggle, overlay, background, and post-process state for driving an EVE space-scene frame." })
export class EveSpaceSceneRenderDriver extends CjsModel
{

  /** m_settings.aoQuality (AmbientOcclusionQuality - enum AmbientOcclusionQuality) [READWRITE, ENUM] */
  @io.readwrite
  @type.int32
  @type.enum("AmbientOcclusionQuality")
  aoQuality = 0;

  /** m_settings.antiAliasingQuality (AntiAliasingQuality - enum AntiAliasingQuality) [READWRITE, ENUM] */
  @io.readwrite
  @type.int32
  @type.enum("AntiAliasingQuality")
  antiAliasingQuality = 0;

  /** m_settings.visualizeMethod (EveSpaceScene::EveVisualizeMethod - enum EveVisualizeMethod) [READWRITE, ENUM] */
  @io.readwrite
  @type.int32
  @type.enum("EveVisualizeMethod")
  visualizeMethod = 0;

  /** m_settings.postProcessingQuality (PostProcess::Quality - enum Quality) [READWRITE, ENUM] */
  @io.readwrite
  @type.int32
  @type.enum("Quality")
  postProcessingQuality = 0;

  /** m_settings.shadowQuality (ShadowQuality - enum ShadowQuality) [READWRITE, ENUM] */
  @io.readwrite
  @type.int32
  @type.enum("ShadowQuality")
  shadowQuality = 0;

  /** m_customStencilFormat (ImageIO::PixelFormat - enum PixelFormat) [READWRITE, ENUM] */
  @io.readwrite
  @type.int32
  @type.enum("PixelFormat")
  customStencilFormat = 0;

  /** m_internalPixelFormat (ImageIO::PixelFormat - enum PixelFormat) [READWRITE, ENUM] */
  @io.readwrite
  @type.int32
  @type.enum("PixelFormat")
  internalPixelFormat = 10;

  /** m_settings.volumetricQuality (Tr2VolumerticQuality - enum Tr2VolumerticQuality) [READWRITE, ENUM] */
  @io.readwrite
  @type.int32
  @type.enum("Tr2VolumerticQuality")
  volumetricQuality = 0;

  /** m_scene (EveSpaceScenePtr) [PERSISTONLY] */
  @io.persistOnly
  @type.model("EveSpaceScene")
  scene = null;

  /** m_name (std::string) [READWRITE] */
  @io.readwrite
  @type.string
  name = "";

  /** m_settings.enableUpscaling (bool) [READWRITE] */
  @io.readwrite
  @type.boolean
  enableUpscaling = false;

  /** m_projection (TriProjectionPtr) [READWRITE] */
  @io.readwrite
  @type.objectRef("TriProjection")
  projection = null;

  /** m_camera (EveCameraPtr) [READWRITE] */
  @io.readwrite
  @type.objectRef("EveCamera")
  camera = null;

  /** m_view (TriViewPtr) [READWRITE] */
  @io.readwrite
  @type.objectRef("TriView")
  view = null;

  /** m_settings.clearColor (Settings) [READWRITE] */
  @io.readwrite
  @type.rawStruct("Settings")
  clearColor = null;

  /** m_distortionEffect (Tr2EffectPtr) [READ] */
  @io.read
  @type.objectRef("Tr2Effect")
  distortionEffect = null;

  /** m_settings.enableDistortion (bool) [READWRITE] */
  @io.readwrite
  @type.boolean
  enableDistortion = false;

  /** m_reflectionCorrectionEnabled (bool) [READWRITE] */
  @io.readwrite
  @type.boolean
  reflectionCorrectionEnabled = true;

  /** m_settings.forceOpaqueBuffer (bool) [READWRITE] */
  @io.readwrite
  @type.boolean
  forceOpaqueBuffer = false;

  /** m_settings.forceNormalMap (bool) [READWRITE] */
  @io.readwrite
  @type.boolean
  forceNormalMap = false;

  /** m_settings.forceVelocityMap (bool) [READWRITE] */
  @io.readwrite
  @type.boolean
  forceVelocityMap = false;

  /** m_fpsRenderer (TriStepRenderFpsPtr) [READ] */
  @io.read
  @type.objectRef("TriStepRenderFps")
  fpsRenderer = null;

  /** m_mainPassRenderingEnabled (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  mainPassRenderingEnabled = true;

  /** m_toolsScenes (PITr2SceneVector) [READ] */
  @io.read
  @type.list("ITr2Scene")
  toolsScenes = [];

  /** m_depthPassTechnique (unknown) [READWRITE] */
  @io.readwrite
  @type.string
  depthPassTechnique = "Depth";

  /** m_postProcess (Tr2PostProcessRendererPtr) [READ] */
  @io.read
  @type.objectRef("Tr2PostProcessRenderer")
  postProcess = null;

  /** m_settings.showFPS (bool) [READWRITE] */
  @io.readwrite
  @type.boolean
  showFPS = false;

  /** m_sceneOverlay (ITr2RenderNodePtr) [READWRITE] */
  @io.readwrite
  @type.objectRef("ITr2RenderNode")
  sceneOverlay = null;

  /** m_background (ITr2RenderNodePtr) [READWRITE] */
  @io.readwrite
  @type.objectRef("ITr2RenderNode")
  background = null;

  /** m_ssao (Tr2SSAOPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("Tr2SSAO")
  SSAO = null;

  /** m_enableRendering (bool) [READWRITE] */
  @io.readwrite
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
   * lensflare occlusion queries, post-process and 3D UI.
   *
   * Rendering-disabled is not a no-op in Carbon either: the scene still
   * updates, so simulation keeps running while nothing is drawn (cpp:408-419).
   *
   * @returns {boolean} Whether anything was submitted.
   */
  Execute(destinations = null, _outputs = null, realTime = 0, simTime = 0, _rootTimer = null, renderContext = null)
  {
    if (!renderContext || !this.Validate()) return false;

    this.camera?.Update?.(simTime);

    // Carbon sets the camera onto the renderer before the scene updates, so the
    // scene's own update reads this frame's view (cpp:476 -> 479).
    this.#SetCameraToRenderer(renderContext);

    const target = Array.isArray(destinations) ? destinations[0] ?? null : destinations;

    if (target) renderContext.SetRenderTarget(0, target);

    renderContext.Clear({ color: this.clearColor ?? null, depth: 1 });

    this.scene.Update?.(realTime, simTime);

    if (!this.enableRendering) return false;

    // BeginRender's CPU half, in the order EveSpaceScene's own contract gives.
    this.scene.BlendLightingOverrides?.();
    this.scene.UpdateFogSettings?.();
    this.scene.UpdateVisibility?.(renderContext.GetInverseViewTransform?.() ?? null);

    const submitted = this.#Submit(this.scene.GetRenderables?.([]) ?? [], renderContext);

    // Carbon populates per-frame data AFTER the gather, because the blended sun
    // colour is only current once lights have been gathered (cpp:1396-1426).
    this.scene.PopulatePerFramePSData?.(renderContext, null, null);
    this.scene.PopulatePerFrameVSData?.(renderContext, null);

    return submitted;
  }

  /**
   * Collects one frame's batches and submits them.
   *
   * @param {Array<object>} renderables Pre-culled renderables.
   * @param {object} renderContext Recording render context.
   * @returns {boolean} Whether anything was submitted.
   */
  #Submit(renderables, renderContext)
  {
    if (!this.#batchManager) return false;

    this.#batchManager.Collect(renderables, undefined, renderContext);

    const map = this.#batchManager.GetBatchMap();
    let submitted = false;

    for (const batchType of EveSpaceSceneRenderDriver.SubmittedBatchTypes)
    {
      const accumulator = map?.GetAccumulator?.(batchType) ?? null;

      // An empty accumulator is submitted anyway. Carbon does not test one, and
      // a pass that draws nothing is still a pass; skipping it here would move a
      // frame-planning decision into the driver.
      if (accumulator) submitted = renderContext.RenderBatches(accumulator) || submitted;
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
    // Resolved explicitly rather than with ??, because a holder whose getter
    // returns null must yield NULL - coalescing would fall back to the holder
    // itself and hand a wrapper object to SetProjection.
    const projection = this.#Resolve(this.projection, "GetProjection");
    const view = this.#Resolve(this.camera, "GetView") ?? this.#Resolve(this.view, "GetView");

    if (projection) renderContext.SetProjection?.(projection);
    if (view) renderContext.SetViewTransform?.(view);

    // Derived only when there is something to derive from. Validate accepts a
    // camera OR a view/projection pair, and a holder can still yield null, so a
    // frame can legitimately reach here with nothing to cull against - that is
    // an empty frustum, not an exception thrown out of matrix code.
    const viewport = renderContext.GetViewport?.() ?? null;

    if (view && projection && viewport)
    {
      this.#frustum.DeriveFrustum(
        view,
        renderContext.GetViewPosition?.() ?? null,
        projection,
        viewport
      );
    }

    this.scene.StampFrameContext?.({ frustum: this.#frustum });
  }

  /**
   * Unwraps a holder through its getter, or takes it as the value itself.
   *
   * @param {object|null} holder Camera, view or projection holder.
   * @param {string} getter Accessor name.
   * @returns {object|null} The resolved value.
   */
  #Resolve(holder, getter)
  {
    if (!holder) return null;

    return typeof holder[getter] === "function" ? holder[getter]() ?? null : holder;
  }

  static AmbientOcclusionQuality = AmbientOcclusionQuality;

  static AntiAliasingQuality = AntiAliasingQuality;

  static EveVisualizeMethod = EveVisualizeMethod;

  static Quality = Quality;

  static ShadowQuality = ShadowQuality;

  static Tr2VolumerticQuality = Tr2VolumerticQuality;

  static PixelFormat = PixelFormat;

}
