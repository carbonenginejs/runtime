// Source: trinity/trinity/Tr2ReflectionProbe.h
// Source: trinity/trinity/Tr2ReflectionProbe.cpp
// Source: trinity/trinity/Tr2ReflectionProbe_Blue.cpp
//
// Filters a cube into the prefiltered reflection EveSpaceSceneEnvMap reads:
// a 256x256 HDR cube whose mips 1..7 hold the environment convolved for
// increasing roughness and whose mip 0 is the source itself. The shaders pick
// the mip from roughness (`7 * (1 - 0.0357 * log2(2 / r^2 - 1))`), so a surface
// reading the unfiltered source sees sharp reflections at every roughness.
//
// Two halves, as in Carbon. FILTERING is ported: `RunFilter` filters the
// `customSourceTexture` (a nebula cube), and `Filter` is the pre-filter,
// mip generation, main filter and copy. RENDERING the scene into six faces
// (InitRenderPass/StartRenderFace/EndRenderPass/GetFrustum) needs the scene's
// reflection pass and refuses by name until it is ported.
//
// THE RENDER CONTEXT. Carbon reaches the main-thread context through
// USE_MAIN_THREAD_RENDER_CONTEXT(); ours is Tr2RenderContext_GetMainThreadRenderContext(),
// the default here, with an optional trailing context.
import { carbon, impl, edit, type } from "#schema";
import { CjsModel } from "#model";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { ExFlag, PixelFormat, ShaderType, TextureType, Tr2GpuUsage } from "#consts/render-context";
import { BitmapDimensions as Tr2BitmapDimensions } from "#imageio";
import { Tr2RenderTarget } from "./device/Tr2RenderTarget.js";
import { Tr2Renderer } from "./Tr2Renderer.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "./context/Tr2RenderContext.js";
import { Tr2Effect } from "../shader/Tr2Effect.js";
import { Tr2RuntimeTextureParameter } from "../shader/parameter/Tr2RuntimeTextureParameter.js";

/** Carbon's MIP_COUNT (`cpp:15`): filtered levels below the top. */
const MIP_COUNT = 7;

/** Carbon's FILTER_SIZE (`cpp:16`). */
const FILTER_SIZE = 128;

/** Carbon's FILTER_GROUP_DIM (`cpp:17`): ceil(sum(4^x for x in 1..MIP_COUNT) / group size). */
const FILTER_GROUP_DIM = 342;

const PRE_FILTER_EFFECT = "res:/graphics/effect/managed/space/System/Reflection/ReflectionFilterActivisionPre.fx";
const FILTER_EFFECT = "res:/graphics/effect/managed/space/System/Reflection/ReflectionFilterActivision128.fx";
const COPY_MIP_EFFECT = "res:/graphics/effect/managed/space/System/Reflection/CopyCube.fx";

/** Filters a cube into the prefiltered HDR reflection cube Eve's scene binds as its environment map. */
@type.define({ className: "Tr2ReflectionProbe", family: "trinityCore", purpose: "Filters a cube into the prefiltered HDR reflection cube Eve's scene binds as its environment map." })
export class Tr2ReflectionProbe extends CjsModel
{

  /** m_renderFrequency (ReflectionProbeRenderFrequency - enum ReflectionProbeRenderFrequency) [READWRITE, NOTIFY, ENUM] */
  @edit.notify
  @edit.readwrite
  @type.int32
  @type.enum("ReflectionProbeRenderFrequency")
  renderFrequency = 0;

  /** m_currentFrame (uint8_t) [READ] */
  @edit.read
  @type.uint8
  currentFrame = 0;

  /** m_customSourceTexture (ITriTextureResPtr) [READWRITE, NOTIFY] */
  @edit.notify
  @edit.readwrite
  @type.objectRef("ITriTextureRes")
  customSourceTexture = null;

  /** m_backlightColor (Color) [READ] */
  @edit.read
  @type.color
  backlightColor = vec4.fromValues(1, 1, 1, 1);

  /** m_backlightContrast (float) [READ] */
  @edit.read
  @type.float32
  backlightContrast = 16;

  /** m_hollywoodMode (bool) [READWRITE, NOTIFY] */
  @edit.notify
  @edit.readwrite
  @type.boolean
  hollywoodMode = true;

  /** m_postFilterTarget (Tr2RenderTargetPtr) [READ] */
  @edit.read
  @type.objectRef("Tr2RenderTarget")
  reflectionTexture = null;

  /** m_hdrOutput (bool) [READWRITE, NOTIFY] */
  @edit.notify
  @edit.readwrite
  @type.boolean
  hdrOutput = true;

  /** m_lockPosition (bool) [READWRITE] */
  @edit.readwrite
  @type.boolean
  lockPosition = false;

  /** m_position (Vector3) [READWRITE] */
  @edit.readwrite
  @type.vec3
  position = vec3.create();

  /** m_intermediateSize (int) [READWRITE, NOTIFY]; Carbon's default is FILTER_SIZE * 4 (`cpp:32`). */
  @edit.notify
  @edit.readwrite
  @type.int32
  reflectionSize = FILTER_SIZE * 4;

  /** m_renderTargetCube (Tr2RenderTargetPtr) [READ] */
  @edit.read
  @type.objectRef("Tr2RenderTarget")
  unfilteredTexture = null;

  /** m_initialized */
  _initialized = false;

  /** m_hasData */
  _hasData = false;

  /** m_onePassDone */
  _onePassDone = false;

  /** m_renderTargets: the six face targets the scene renders into. */
  _renderTargets = Array.from({ length: 6 }, () => new Tr2RenderTarget());

  /** m_stencilMaps: their depth buffers, Tr2TextureAL each. */
  _stencilMaps = new Array(6).fill(null);

  /** m_preFilterTarget */
  _preFilterTarget = new Tr2RenderTarget();

  /** m_preFilterEffect */
  _preFilterEffect = new Tr2Effect();

  /** m_filterEffect */
  _filterEffect = new Tr2Effect();

  /** m_copyMipEffect */
  _copyMipEffect = new Tr2Effect();

  /**
   * Carbon's constructor (`cpp:28-56`) creates the targets and effects and
   * prepares resources; ours creates them as fields and prepares on first use,
   * because a render context may not exist yet when the probe is built.
   */
  constructor(values)
  {
    super(values);
    this.unfilteredTexture = new Tr2RenderTarget();
    this.reflectionTexture = new Tr2RenderTarget();
  }

  /**
   * Carbon `IsValid` (`cpp:63-66`): whether the probe's resources are ready.
   *
   * @returns {boolean} True when prepared.
   */
  @carbon.method
  @impl.implemented
  IsValid(renderContext = Tr2RenderContext_GetMainThreadRenderContext())
  {
    return this.OnPrepareResources(renderContext);
  }

  /** Carbon `HasData` (`cpp:68-71`): whether a filter has written the reflection. */
  @carbon.method
  @impl.implemented
  HasData()
  {
    return this._hasData && this.reflectionTexture.IsValid();
  }

  /** Carbon `GetReflection` (`cpp:206-209`): the filtered cube. */
  @carbon.method
  @impl.implemented
  GetReflection()
  {
    return this.reflectionTexture;
  }

  /** Carbon `SetBackLightColor` (`cpp:211-214`). */
  @carbon.method
  @impl.implemented
  SetBackLightColor(color)
  {
    vec4.copy(this.backlightColor, color);
  }

  /** Carbon `SetBackLightContrast` (`cpp:216-219`). */
  @carbon.method
  @impl.implemented
  SetBackLightContrast(contrast)
  {
    this.backlightContrast = contrast;
  }

  /** Carbon `ReleaseResources` (`cpp:221-224`). */
  @carbon.method
  @impl.implemented
  ReleaseResources(_storage)
  {
    this._initialized = false;
  }

  /**
   * Carbon `OnPrepareResources` (`cpp:226-241`): needs compute, then prepares
   * in R11G11B10 (DX12 falls back to RGBA16F where R11G11B10 is not
   * UAV-compatible, `cpp:234-236`). WebGPU cannot write R11G11B10 from compute,
   * so it takes Carbon's DX12 fallback.
   *
   * @returns {boolean} Whether the resources are ready.
   */
  @carbon.method
  @impl.adapted
  OnPrepareResources(renderContext = Tr2RenderContext_GetMainThreadRenderContext())
  {
    const al = renderContext.GetRenderContextAL();

    if (!(al.constructor.SHADER_TYPE_MASK & (1 << ShaderType.COMPUTE_SHADER))) return false;

    return this.DoPrepareResources(PixelFormat.PIXEL_FORMAT_R16G16B16A16_FLOAT, renderContext);
  }

  /**
   * Carbon `DoPrepareResources` (`cpp:243-321`): the six face targets and
   * their depth buffers, the unfiltered cube, the pre-filter cube (8 mips),
   * the reflection cube (MIP_COUNT + 1 mips), and on first run the three
   * effects with their parameters.
   *
   * @returns {boolean} Whether every target was created.
   */
  @carbon.method
  @impl.implemented
  DoPrepareResources(rtFormat, renderContext)
  {
    const size = this.reflectionSize;

    for (let face = 0; face < 6; face += 1)
    {
      if (!this._renderTargets[face].IsValid()
        && this._renderTargets[face].CreateManual(size, size, 1, rtFormat, 0, 0, ExFlag.EX_BIND_UNORDERED_ACCESS,
          TextureType.TEX_TYPE_2D, 0, Tr2GpuUsage.RENDER_TARGET, renderContext) < 0) return false;

      if (!this._stencilMaps[face])
      {
        const source = this.customSourceTexture;
        const stencilSize = source && source.IsValid() ? source.GetWidth() : size;
        this._stencilMaps[face] = renderContext.CreateTexture(
          Tr2BitmapDimensions.texture2D(stencilSize, stencilSize, 1, PixelFormat.PIXEL_FORMAT_D32_FLOAT),
          { gpuUsage: Tr2GpuUsage.DEPTH_STENCIL | Tr2GpuUsage.SHADER_RESOURCE });
        if (!this._stencilMaps[face]) return false;
      }
    }

    if (!this.unfilteredTexture.IsValid()
      && this.unfilteredTexture.Create(size, size, 1, rtFormat, 0, 0, ExFlag.EX_BIND_UNORDERED_ACCESS, TextureType.TEX_TYPE_CUBE, renderContext) < 0) return false;

    if (!this._preFilterTarget.IsValid()
      && this._preFilterTarget.Create(FILTER_SIZE, FILTER_SIZE, 8, rtFormat, 0, 0, ExFlag.EX_BIND_UNORDERED_ACCESS, TextureType.TEX_TYPE_CUBE, renderContext) < 0) return false;

    if (!this.reflectionTexture.IsValid())
    {
      if (this.reflectionTexture.Create(FILTER_SIZE * 2, FILTER_SIZE * 2, MIP_COUNT + 1,
        this.hdrOutput ? rtFormat : PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM, 0, 0, ExFlag.EX_BIND_UNORDERED_ACCESS,
        TextureType.TEX_TYPE_CUBE, renderContext) < 0) return false;
      this._hasData = false;
    }

    if (!this._initialized)
    {
      const source = this.customSourceTexture ?? this.unfilteredTexture;

      this._filterEffect.SetEffectPathName(FILTER_EFFECT);
      this._preFilterEffect.SetEffectPathName(PRE_FILTER_EFFECT);
      this._preFilterEffect.SetParameter("tex_hi_res", source);
      this._preFilterEffect.SetParameter("tex_lo_res", this._preFilterTarget);
      this._preFilterEffect.SetOption("HOLLYWOOD_MODE", this.hollywoodMode ? "HOLLYWOOD_ON" : "HOLLYWOOD_OFF");
      if (this.hollywoodMode)
      {
        this._preFilterEffect.SetParameter("BackLightColor", Array.from(this.backlightColor));
        this._preFilterEffect.SetParameter("BackLightContrast", this.backlightContrast);
        this._preFilterEffect.SetParameter("ViewDirection", [ 0, 1, 0 ]);
      }

      this._filterEffect.SetParameter("tex_in", this._preFilterTarget);
      for (let mip = 0; mip < MIP_COUNT; mip += 1)
      {
        const parameter = new Tr2RuntimeTextureParameter();
        parameter.Create(`tex_out${mip}`, this.reflectionTexture, mip + 1);
        this._filterEffect.AddResource(parameter);
      }
      this._filterEffect.SetParameter("output_srgb", this.hdrOutput ? 0 : 1);

      this._copyMipEffect.SetEffectPathName(COPY_MIP_EFFECT);
      this._copyMipEffect.SetParameter("tex_hi_res", source);
      this._copyMipEffect.SetParameter("tex_lo_res", this.reflectionTexture);
      this._copyMipEffect.SetOption("HOLLYWOOD_MODE", this.hollywoodMode ? "HOLLYWOOD_ON" : "HOLLYWOOD_OFF");
      if (this.hollywoodMode)
      {
        this._copyMipEffect.SetParameter("BackLightColor", Array.from(this.backlightColor));
        this._copyMipEffect.SetParameter("BackLightContrast", this.backlightContrast);
        this._copyMipEffect.SetParameter("ViewDirection", [ 0, 1, 0 ]);
      }

      this._initialized = true;
    }

    return true;
  }

  /** Carbon `OnModified` (`cpp:323-329`): rebuild everything on any change. */
  @carbon.method
  @impl.implemented
  OnModified(_value)
  {
    this.DestroyRenderTargets();
    return true;
  }

  /** Carbon `DestroyRenderTargets` (`cpp:331-345`). */
  @carbon.method
  @impl.implemented
  DestroyRenderTargets()
  {
    for (let face = 0; face < 6; face += 1)
    {
      this._renderTargets[face].Destroy();
      this._stencilMaps[face] = null;
    }

    this.unfilteredTexture.Destroy();
    this._preFilterTarget.Destroy();
    this.reflectionTexture.Destroy();
    this._initialized = false;
    this._onePassDone = false;
    this.currentFrame = 0;
  }

  /**
   * Carbon `Filter` (`cpp:347-381`): pre-filter the source into the 128x128
   * cube, generate its mips, filter those into the reflection's mips 1..7,
   * and copy the source into mip 0 - the last two with Hollywood backlighting
   * seen from the current view.
   */
  @carbon.method
  @impl.implemented
  Filter(renderContext)
  {
    if (!this.IsValid(renderContext)) return;

    if (this.hollywoodMode)
    {
      // Tr2Renderer::GetInverseViewTransform().GetZ(): the third row, which
      // gl-matrix stores at the same offsets.
      const inverseView = renderContext.GetInverseViewTransform();
      const viewDirection = [ inverseView[8], inverseView[9], inverseView[10] ];

      for (const effect of [ this._preFilterEffect, this._copyMipEffect ])
      {
        effect.SetParameter("BackLightColor", Array.from(this.backlightColor));
        effect.SetParameter("BackLightContrast", this.backlightContrast);
        effect.SetParameter("ViewDirection", viewDirection);
      }
    }

    Tr2Renderer.runComputeShader(this._preFilterEffect, FILTER_SIZE * 2 / 8, FILTER_SIZE * 2 / 8, 6, renderContext);
    this._preFilterTarget.GenerateMipMaps(renderContext);
    Tr2Renderer.runComputeShader(this._filterEffect, FILTER_GROUP_DIM, 6, 1, renderContext);
    Tr2Renderer.runComputeShader(this._copyMipEffect, FILTER_SIZE * 2 / 8, FILTER_SIZE * 2 / 8, 6, renderContext);
  }

  /**
   * Carbon `RunFilter` (`cpp:383-389`), exposed to Blue as "Filters the
   * currently set texture": rebuild the targets in RGBA16F and filter
   * `customSourceTexture`.
   */
  @carbon.method
  @impl.implemented
  RunFilter(renderContext = Tr2RenderContext_GetMainThreadRenderContext())
  {
    this.DestroyRenderTargets();
    this.DoPrepareResources(PixelFormat.PIXEL_FORMAT_R16G16B16A16_FLOAT, renderContext);
    this.Filter(renderContext);
  }

  /** Carbon `IsHollyWoodModeOn` (`cpp:391-394`). */
  @carbon.method
  @impl.implemented
  IsHollyWoodModeOn()
  {
    return this.hollywoodMode;
  }

  /** Carbon `ReadyForDynamicObjectReflections` (`cpp:396-400`). */
  @carbon.method
  @impl.implemented
  ReadyForDynamicObjectReflections()
  {
    return this._onePassDone;
  }

  /** Carbon `GetStartFace` (`cpp:80-87`). */
  @carbon.method
  @impl.implemented
  GetStartFace()
  {
    return this.renderFrequency === Tr2ReflectionProbe.ReflectionProbeRenderFrequency.ALL_SIDES_PER_FRAME || !this._onePassDone
      ? 0
      : this.currentFrame;
  }

  /** Carbon `GetEndFace` (`cpp:89-96`). */
  @carbon.method
  @impl.implemented
  GetEndFace()
  {
    return this.renderFrequency === Tr2ReflectionProbe.ReflectionProbeRenderFrequency.ALL_SIDES_PER_FRAME || !this._onePassDone
      ? 6
      : this.currentFrame + 1;
  }

  /**
   * Carbon `InitRenderPass` (`cpp:99-138`). Not ported: rendering the scene
   * into the six faces needs the scene's reflection pass.
   */
  @carbon.method
  @impl.notImplemented
  InitRenderPass(_renderContext)
  {
    throw new Error("Tr2ReflectionProbe.InitRenderPass is not ported yet; it needs the scene's reflection pass.");
  }

  /** Carbon `StartRenderFace` (`cpp:145-176`). Not ported; see InitRenderPass. */
  @carbon.method
  @impl.notImplemented
  StartRenderFace(_face, _renderContext)
  {
    throw new Error("Tr2ReflectionProbe.StartRenderFace is not ported yet; it needs the scene's reflection pass.");
  }

  /** Carbon `EndRenderPass` (`cpp:178-204`). Not ported; see InitRenderPass. */
  @carbon.method
  @impl.notImplemented
  EndRenderPass(_renderContext)
  {
    throw new Error("Tr2ReflectionProbe.EndRenderPass is not ported yet; it needs the scene's reflection pass.");
  }

  /** Carbon `GetFrustum` (`cpp:73-78`). Not ported; see InitRenderPass. */
  @carbon.method
  @impl.notImplemented
  GetFrustum(_face, _renderContext)
  {
    throw new Error("Tr2ReflectionProbe.GetFrustum is not ported yet; it needs the scene's reflection pass.");
  }

  /** Carbon `GetDepthBuffer` (`h:59`): face `face`'s depth buffer. */
  @carbon.method
  @impl.implemented
  GetDepthBuffer(face)
  {
    return this._stencilMaps[face];
  }

  static ReflectionProbeRenderFrequency = Object.freeze({
    ONE_SIDE_PER_FRAME: 0,
    ALL_SIDES_PER_FRAME: 1,
  });

}
