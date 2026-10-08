import { CjsSchema, meta } from "#schema";
import { blue } from "#blue";
import { ITr2RenderNode } from "#interfaces/ITr2RenderNode";
import { vec4 } from "#math/vec4";
import { PixelFormat, TextureType } from "#consts/render-context";
import { ResourceRequirement } from "#resource";
import { Tr2RenderTarget } from "../../trinity/core/device/Tr2RenderTarget.js";
import { Tr2Effect } from "../../trinity/shader/Tr2Effect.js";
import { Tr2EffectStateManager } from "../../trinity/shader/Tr2EffectStateManager.js";
import { Tr2VariableStore } from "../../trinity/core/variable/Tr2VariableStore.js";
import { Tr2Renderer } from "../../trinity/core/Tr2Renderer.js";
import { TriStepRenderObject } from "../../trinity/renderJob/step/TriStepRenderObject.js";
import { TnyOutlineCompositeNode } from "./TnyOutlineCompositeNode.js";

const EFFECTS = {
  mask: "res:/graphics/effect/cjs/selection/selectionmask.fx",
  skinnedMask: "res:/graphics/effect/cjs/selection/skinned_selectionmask.fx",
  outline: "res:/graphics/effect/cjs/selection/selectionoutline.fx"
};

/**
 * Draws independently styled hover and selection outlines through render nodes.
 * Custom: this application helper composes Carbon's TriStepRenderObject override
 * pass and screen quad; Carbon has no hover/selection outline policy.
 *
 * Set driver.sceneOverlay to this node. For the default afterPost placement,
 * put a Tr2StepExecuteRenderNode holding compositeNode after the driver's step,
 * targeting the same frame target, before the gizmo. Set the driver's step's
 * clearTargetOnFailure=false so failed validation stops the job. beforePost
 * composites inside sceneOverlay instead; the later node then does nothing.
 *
 * Configure the application's shader resource manager for the compiled cjs
 * overlay: RegisterShaderResources(resMan, { translates: path =>
 * !path.includes("/effect.webgpu/cjs/") }). Effects use the configured platform
 * and quality path conversion. Await loading and inspect error on failure.
 * While loading or with no active objects this node allows the scene to draw.
 * The application owns picking, clicks and retained hover during camera drags.
 */
export class TnyOutlineHelper extends ITr2RenderNode
{
  hovered = null;

  selected = new Set();

  hoveredEnabled = true;

  selectedEnabled = true;

  selectedWins = true;

  hoveredColour = vec4.fromValues(1, 0.55, 0.1, 1);

  selectedColour = vec4.fromValues(1, 1, 1, 1);

  hoveredWidth = 2;

  selectedWidth = 2;

  compositePlacement = "afterPost";

  error = null;

  compositeNode = null;

  loading = null;

  _effects = {};

  _mask = null;

  _context = null;

  _frame = null;

  _ready = false;

  _destroyed = false;

  _settings = vec4.create();

  _channel = vec4.create();

  _step = new TriStepRenderObject();

  /**
   * Starts resource-manager acquisition without installing input or changing a driver.
   * @param {object} [options] hovered/selectedEnabled, Colour and Width (1–8 frame
   * pixels), selectedWins, and compositePlacement (afterPost or beforePost).
   */
  constructor(options = {})
  {
    super();
    for (const name of ["hoveredEnabled", "selectedEnabled", "selectedWins", "hoveredWidth", "selectedWidth", "compositePlacement"])
    {
      if (Object.hasOwn(options, name)) this[name] = options[name];
    }
    if (options.hoveredColour) vec4.copy(this.hoveredColour, options.hoveredColour);
    if (options.selectedColour) vec4.copy(this.selectedColour, options.selectedColour);
    this._step.renderDecal = false;
    this._step.renderTransparent = false;
    this._step.renderAdditive = false;
    this.compositeNode = new TnyOutlineCompositeNode(this);
    this.loading = this._LoadEffects().then(() => !this._destroyed).catch(error =>
    {
      this.error = error;
      return false;
    });
  }

  /** Acquires only through Blue; the application supplies resource routing. */
  async _LoadEffects()
  {
    await Promise.all(Object.entries(EFFECTS).map(async ([name, path]) =>
    {
      const resource = blue.resMan.GetResource(Tr2Effect.convertEffectPath(path), { requirement: ResourceRequirement.SHADER });
      await resource.Ready();
      if (this._destroyed) return;
      const effect = new Tr2Effect();
      this._effects[name] = effect;
      effect.effectResource = resource;
      effect.RebuildCachedData();
      Tr2EffectStateManager.registerShaderHandles(effect.shader);
    }));
    this._ready = !this._destroyed;
  }

  /** Resets stale mask state before the driver's validation gate each frame. */
  Validate(dimensions, outputs)
  {
    this._frame = null;
    return !this._destroyed && dimensions.length === 2 && outputs.length === 0
      && dimensions[0].width > 0 && dimensions[0].height > 0
      && (this.compositePlacement === "afterPost" || this.compositePlacement === "beforePost");
  }

  /** Snapshots active objects and their styles; the winning mode owns overlap. */
  _Modes()
  {
    const hovered = this.hoveredEnabled ? this.hovered : null;
    const selected = this.selectedEnabled ? Array.from(this.selected) : [];
    const hoverObjects = hovered && !(this.selectedWins && this.selectedEnabled && this.selected.has(hovered)) ? [hovered] : [];
    const selectedObjects = !this.selectedWins && hovered ? selected.filter(object => object !== hovered) : selected;
    const mode = (objects, colour, width, channel) => ({
      objects, colour: Array.from(colour), width: Math.min(8, Math.max(1, Number(width) || 1)), channel
    });
    const hover = mode(hoverObjects, this.hoveredColour, this.hoveredWidth, 0);
    const selection = mode(selectedObjects, this.selectedColour, this.selectedWidth, 1);
    return (this.selectedWins ? [hover, selection] : [selection, hover]).filter(item => item.objects.length);
  }

  /** Draws opaque hull batches into RG8 against the scene's published DepthMap. */
  Execute(destinations, _outputs, realTime, simTime, _rootTimer, renderContext)
  {
    this._frame = null;
    if (this._destroyed || !this._ready) return;
    const modes = this._Modes();
    if (!modes.length || !Object.values(this._effects).every(effect => effect.IsGood())) return;
    const variable = Tr2VariableStore.globalStore().FindVariable("DepthMap");
    const provider = variable ? variable.GetValue() : null;
    const depth = provider ? provider.GetTexture() : null;
    if (!depth || !depth.IsValid()) return;
    this._EnsureMask(depth, renderContext);
    const frame = { modes, realTime, simTime, context: renderContext };
    const esm = renderContext.GetEffectStateManager();
    esm.PushViewport();
    esm.PushRenderTarget__Current(0);
    esm.PushRenderTarget__Current(1);
    esm.PushDepthStencilBuffer__Current();
    try
    {
      esm.SetRenderTarget(0, this._mask.GetRenderTarget());
      esm.SetRenderTarget(1, null);
      esm.SetDepthStencilBuffer(depth);
      esm.SetFullScreenViewport();
      // Colour only: the reverse-Z scene depth must survive this pass.
      renderContext.Clear({ clearColor: true, color: [0, 0, 0, 0] });
      for (const mode of modes)
      {
        vec4.set(this._channel, mode.channel === 0 ? 1 : 0, mode.channel === 1 ? 1 : 0, 0, 0);
        for (const object of mode.objects)
        {
          const skinned = (object.mesh?.opaqueAreas ?? []).some(area => /(^|\/)(unpacked)?skinned_/u.test(area.effect?.effectFilePath ?? ""));
          const effect = skinned ? this._effects.skinnedMask : this._effects.mask;
          effect.SetParameter__Vector4("SelectionChannel", this._channel);
          this._step.renderable = object;
          this._step.effectOverride = effect;
          // TriStepRenderObject.cpp:43-72 keeps the object's geometry and data.
          this._step.Execute(realTime, simTime, renderContext);
        }
      }
    }
    finally
    {
      this._step.renderable = null;
      this._step.effectOverride = null;
      esm.PopDepthStencilBuffer();
      esm.PopRenderTarget(1);
      esm.PopRenderTarget(0);
      esm.PopViewport();
    }
    if (this.compositePlacement === "beforePost") this._Composite(destinations[0], frame, renderContext);
    else this._frame = frame;
  }

  /** Replaces the owned mask when depth size or rendering context changes. */
  _EnsureMask(depth, renderContext)
  {
    const width = depth.GetWidth(), height = depth.GetHeight();
    if (this._mask && this._context === renderContext && this._mask.GetWidth() === width && this._mask.GetHeight() === height) return;
    if (this._mask) this._mask.Destroy();
    this._mask = new Tr2RenderTarget();
    this._context = renderContext;
    this._mask.Create(width, height, 1, PixelFormat.PIXEL_FORMAT_R8G8_UNORM,
      1, 0, 0, TextureType.TEX_TYPE_2D, renderContext);
    if (!this._mask.IsValid()) throw new Error("Unable to create selection outline mask.");
  }

  /** Blends one quad per active mode; widths are measured in destination pixels. */
  _Composite(destination, frame, renderContext)
  {
    const effect = this._effects.outline;
    const esm = renderContext.GetEffectStateManager();
    esm.PushViewport();
    esm.PushRenderTarget__Current(0);
    esm.PushRenderTarget__Current(1);
    esm.PushDepthStencilBuffer__Current();
    try
    {
      esm.SetRenderTarget(0, destination);
      esm.SetRenderTarget(1, null);
      esm.SetDepthStencilBuffer(null);
      esm.SetFullScreenViewport();
      effect.SetParameter__TextureAL("SelectionMask", this._mask.GetRenderTarget());
      effect.SetParameter__Vector4("OutlineTargetSize", vec4.set(this._settings, destination.GetWidth(), destination.GetHeight(), 0, 0));
      for (const mode of frame.modes)
      {
        effect.SetParameter__Vector4("OutlineColour", mode.colour);
        effect.SetParameter__Vector4("OutlineSettings", vec4.set(this._settings, 1, mode.width, 0, 0));
        effect.SetParameter__Vector4("SelectionChannel", vec4.set(this._channel, mode.channel === 0 ? 1 : 0, mode.channel === 1 ? 1 : 0, 0, 0));
        Tr2Renderer.drawScreenQuad(renderContext, effect);
      }
    }
    finally
    {
      effect.SetParameter__TextureAL("SelectionMask", null);
      esm.PopDepthStencilBuffer();
      esm.PopRenderTarget(1);
      esm.PopRenderTarget(0);
      esm.PopViewport();
    }
  }

  /** Releases owned textures/effects; detaching the nodes from the job is the caller's job. */
  Destroy()
  {
    if (this._destroyed) return;
    this._destroyed = true;
    this._ready = false;
    this._frame = null;
    this.hovered = null;
    this.selected.clear();
    if (this._mask) this._mask.Destroy();
    this._mask = null;
    this._context = null;
    for (const effect of Object.values(this._effects)) effect.Destroy();
    this._effects = {};
  }
}

CjsSchema.define(TnyOutlineHelper, {
  className: "TnyOutlineHelper",
  methods: Object.fromEntries(["Validate", "Execute", "Destroy", "_LoadEffects", "_Modes", "_EnsureMask", "_Composite"].map(name => [name, [meta.ours]]))
});
