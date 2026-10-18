// Source: trinity/trinity/Tr2ReflectionProbe.h
// Source: trinity/trinity/Tr2ReflectionProbe.cpp
// Source: trinity/trinity/Tr2ReflectionProbe_Blue.cpp
import { INotify } from "../../global/blue/INotify.js";
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
import { meta, type, blue } from "#schema";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { mat4 } from "#math/mat4";
import { Tr2TextureSubresource } from "#trinityal";
import { Tr2ColorAttachment } from "../../trinityal/Tr2RenderPassAL/Tr2ColorAttachment.js";
import { Tr2DepthAttachment } from "../../trinityal/Tr2RenderPassAL/Tr2DepthAttachment.js";
import { TriFrustum } from "./view/TriFrustum.js";
import { ExFlag, PixelFormat, ShaderType, TextureType, Tr2GpuUsage, Tr2LoadAction, Tr2StoreAction } from "#consts/render-context";
import { BitmapDimensions as Tr2BitmapDimensions } from "#imageio";
import { Tr2RenderTarget } from "./device/Tr2RenderTarget.js";
import { Tr2Renderer } from "./Tr2Renderer.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "./context/Tr2RenderContext.js";
import { Tr2Effect } from "../shader/Tr2Effect.js";
import { Tr2RuntimeTextureParameter } from "../shader/parameter/Tr2RuntimeTextureParameter.js";
import { be, EnumRegistrationType } from "#blue";

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
@blue.define({ className: "Tr2ReflectionProbe", purpose: "Filters a cube into the prefiltered HDR reflection cube Eve's scene binds as its environment map." })
@blue.inherit(INotify)
@blue.interface(INotify)
export class Tr2ReflectionProbe
{

  /** m_renderFrequency (ReflectionProbeRenderFrequency - enum ReflectionProbeRenderFrequency) [READWRITE, NOTIFY, ENUM] */
  @blue.notify
  @blue.readwrite
  @type.int32
  @type.enum("trinity.Tr2ReflectionProbe.ReflectionProbeRenderFrequency")
  renderFrequency = 0;

  /** m_currentFrame (uint8_t) [READ] */
  @blue.read
  @type.uint8
  currentFrame = 0;

  /** m_customSourceTexture (ITriTextureResPtr) [READWRITE, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @type.rootRef("ITriTextureRes")
  customSourceTexture = null;

  /** m_backlightColor (Color) [READ] */
  @blue.read
  @type.color
  backlightColor = vec4.fromValues(1, 1, 1, 1);

  /** m_backlightContrast (float) [READ] */
  @blue.read
  @type.float32
  backlightContrast = 16;

  /** m_hollywoodMode (bool) [READWRITE, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @type.boolean
  hollywoodMode = true;

  /** m_postFilterTarget (Tr2RenderTargetPtr) [READ] */
  @blue.read
  @type.rootRef("Tr2RenderTarget")
  reflectionTexture = null;

  /** m_hdrOutput (bool) [READWRITE, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @type.boolean
  hdrOutput = true;

  /** m_lockPosition (bool) [READWRITE] */
  @blue.readwrite
  @type.boolean
  lockPosition = false;

  /** m_position (Vector3) [READWRITE] */
  @blue.readwrite
  @type.vec3
  position = vec3.create();

  /** m_intermediateSize (int) [READWRITE, NOTIFY]; Carbon's default is FILTER_SIZE * 4 (`cpp:32`). */
  @blue.notify
  @blue.readwrite
  @type.int32
  reflectionSize = FILTER_SIZE * 4;

  /** m_renderTargetCube (Tr2RenderTargetPtr) [READ] */
  @blue.read
  @type.rootRef("Tr2RenderTarget")
  unfilteredTexture = null;

  /** m_initialized */
  _initialized = false;

  /** m_hasData */
  _hasData = false;

  /** m_onePassDone */
  _onePassDone = false;

  /** m_renderTargets: the six face targets the scene renders into. */
  _renderTargets = Array.from({ length: 6 }, () => new Tr2RenderTarget());

  /** m_prevCullInversion (h:87): the cull inversion InitRenderPass replaces. */
  _prevCullInversion = false;

  /** InitRenderPass's square projection. */
  _faceProjection = mat4.create();

  /** StartRenderFace's view and look-at target. */
  _faceView = mat4.create();
  _faceTarget = vec3.create();

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
    this.unfilteredTexture = new Tr2RenderTarget();
    this.reflectionTexture = new Tr2RenderTarget();
  }

  /**
   * Carbon `IsValid` (`cpp:63-66`): whether the probe's resources are ready.
   *
   * @returns {boolean} True when prepared.
   */
  @blue.method
  @meta.implemented
  IsValid(renderContext = Tr2RenderContext_GetMainThreadRenderContext())
  {
    return this.OnPrepareResources(renderContext);
  }

  /** Carbon `HasData` (`cpp:68-71`): whether a filter has written the reflection. */
  @blue.method
  @meta.implemented
  HasData()
  {
    return this._hasData && this.reflectionTexture.IsValid();
  }

  /** Carbon `GetReflection` (`cpp:206-209`): the filtered cube. */
  @blue.method
  @meta.implemented
  GetReflection()
  {
    return this.reflectionTexture;
  }

  /** Carbon `SetBackLightColor` (`cpp:211-214`). */
  @blue.method
  @meta.implemented
  SetBackLightColor(color)
  {
    vec4.copy(this.backlightColor, color);
  }

  /** Carbon `SetBackLightContrast` (`cpp:216-219`). */
  @blue.method
  @meta.implemented
  SetBackLightContrast(contrast)
  {
    this.backlightContrast = contrast;
  }

  /** Carbon `ReleaseResources` (`cpp:221-224`). */
  @blue.method
  @meta.implemented
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
  @blue.method
  @meta.adapted
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
  @blue.method
  @meta.implemented
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
          Tr2BitmapDimensions.create__WidthHeightMipCountFormat(stencilSize, stencilSize, 1, PixelFormat.PIXEL_FORMAT_D32_FLOAT),
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
      this._preFilterEffect.SetParameter__TextureProvider("tex_hi_res", source);
      this._preFilterEffect.SetParameter__TextureProvider("tex_lo_res", this._preFilterTarget);
      this._preFilterEffect.SetOption("HOLLYWOOD_MODE", this.hollywoodMode ? "HOLLYWOOD_ON" : "HOLLYWOOD_OFF");
      if (this.hollywoodMode)
      {
        this._preFilterEffect.SetParameter__Vector4("BackLightColor", Array.from(this.backlightColor));
        this._preFilterEffect.SetParameter("BackLightContrast", this.backlightContrast);
        this._preFilterEffect.SetParameter__Vector3("ViewDirection", [ 0, 1, 0 ]);
      }

      this._filterEffect.SetParameter__TextureProvider("tex_in", this._preFilterTarget);
      for (let mip = 0; mip < MIP_COUNT; mip += 1)
      {
        const parameter = new Tr2RuntimeTextureParameter();
        parameter.Create(`tex_out${mip}`, this.reflectionTexture, mip + 1);
        this._filterEffect.AddResource(parameter);
      }
      this._filterEffect.SetParameter("output_srgb", this.hdrOutput ? 0 : 1);

      this._copyMipEffect.SetEffectPathName(COPY_MIP_EFFECT);
      this._copyMipEffect.SetParameter__TextureProvider("tex_hi_res", source);
      this._copyMipEffect.SetParameter__TextureProvider("tex_lo_res", this.reflectionTexture);
      this._copyMipEffect.SetOption("HOLLYWOOD_MODE", this.hollywoodMode ? "HOLLYWOOD_ON" : "HOLLYWOOD_OFF");
      if (this.hollywoodMode)
      {
        this._copyMipEffect.SetParameter__Vector4("BackLightColor", Array.from(this.backlightColor));
        this._copyMipEffect.SetParameter("BackLightContrast", this.backlightContrast);
        this._copyMipEffect.SetParameter__Vector3("ViewDirection", [ 0, 1, 0 ]);
      }

      this._initialized = true;
    }

    return true;
  }

  /** Carbon `OnModified` (`cpp:323-329`): rebuild everything on any change. */
  @blue.method
  @meta.implemented
  OnModified(_value)
  {
    this.DestroyRenderTargets();
    return true;
  }

  /** Carbon `DestroyRenderTargets` (`cpp:331-345`). */
  @blue.method
  @meta.implemented
  DestroyRenderTargets()
  {
    for (let face = 0; face < 6; face += 1)
    {
      this._renderTargets[face].Destroy();
      if (this._stencilMaps[face]) this._stencilMaps[face].Destroy();
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
  @blue.method
  @meta.implemented
  Filter(renderContext)
  {
    if (!this.IsValid(renderContext)) return;

    if (this.hollywoodMode)
    {
      // Tr2Renderer::GetInverseViewTransform().GetZ(): the third row, which
      // gl-matrix stores at the same offsets.
      const inverseView = Tr2Renderer.GetInverseViewTransform();
      const viewDirection = [ inverseView[8], inverseView[9], inverseView[10] ];

      for (const effect of [ this._preFilterEffect, this._copyMipEffect ])
      {
        effect.SetParameter__Vector4("BackLightColor", Array.from(this.backlightColor));
        effect.SetParameter("BackLightContrast", this.backlightContrast);
        effect.SetParameter__Vector3("ViewDirection", viewDirection);
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
  @blue.method
  @meta.implemented
  RunFilter(renderContext = Tr2RenderContext_GetMainThreadRenderContext())
  {
    this.DestroyRenderTargets();
    this.DoPrepareResources(PixelFormat.PIXEL_FORMAT_R16G16B16A16_FLOAT, renderContext);
    this.Filter(renderContext);
  }

  /** Carbon `IsHollyWoodModeOn` (`cpp:391-394`). */
  @blue.method
  @meta.implemented
  IsHollyWoodModeOn()
  {
    return this.hollywoodMode;
  }

  /** Carbon `ReadyForDynamicObjectReflections` (`cpp:396-400`). */
  @blue.method
  @meta.implemented
  ReadyForDynamicObjectReflections()
  {
    return this._onePassDone;
  }

  /** Carbon `GetStartFace` (`cpp:80-87`). */
  @blue.method
  @meta.implemented
  GetStartFace()
  {
    return this.renderFrequency === Tr2ReflectionProbe.ReflectionProbeRenderFrequency.ALL_SIDES_PER_FRAME || !this._onePassDone
      ? 0
      : this.currentFrame;
  }

  /** Carbon `GetEndFace` (`cpp:89-96`). */
  @blue.method
  @meta.implemented
  GetEndFace()
  {
    return this.renderFrequency === Tr2ReflectionProbe.ReflectionProbeRenderFrequency.ALL_SIDES_PER_FRAME || !this._onePassDone
      ? 6
      : this.currentFrame + 1;
  }

  /**
   * Carbon `InitRenderPass` (`cpp:99-140`): takes the camera position unless
   * locked, saves the viewport, view, projection, target and depth buffer, sets
   * the intermediate-size viewport and a square projection that keeps the
   * current near/far terms, and inverts culling (the cube target is
   * left-handed). Without render-pass hints the faces are cleared here.
   */
  @blue.method
  @meta.implemented
  InitRenderPass(renderContext)
  {
    if (!this.lockPosition) vec3.copy(this.position, Tr2Renderer.GetViewPosition());

    const esm = renderContext.GetEffectStateManager();
    esm.PushViewport();
    Tr2Renderer.PushViewTransform();
    Tr2Renderer.PushProjection();
    esm.PushRenderTarget__Current();
    esm.PushDepthStencilBuffer__Current();

    esm.SetViewport({ x: 0, y: 0, width: this.reflectionSize, height: this.reflectionSize, minZ: 0, maxZ: 1 });

    // Carbon m[2][2], m[2][3], m[3][2], m[3][3]: the same offsets in gl-matrix's layout.
    const current = Tr2Renderer.GetProjectionTransform();
    const projection = mat4.identity(this._faceProjection);
    projection[10] = current[10];
    projection[11] = -1;
    projection[14] = current[14];
    projection[15] = 0;
    Tr2Renderer.SetProjectionTransform(projection);

    this._prevCullInversion = esm.IsCullModeInverted();
    esm.SetInvertedCullMode(true);

    // Carbon compiles this clear out where render-pass hints exist (cpp:128-139).
    if (!renderContext.GetCaps().SUPPORTS_RENDER_PASS_HINTS)
    {
      for (let face = this.GetStartFace(); face < this.GetEndFace(); face += 1)
      {
        renderContext.SetRenderTarget(0, this._renderTargets[face].GetRenderTarget());
        esm.SetDepthStencilBuffer(this._stencilMaps[face]);
        renderContext.Clear({ clearColor: true, clearDepth: true, color: [ 0, 0, 0, 0 ], depth: 0 });
      }
    }
  }

  /**
   * Carbon `StartRenderFace` (`cpp:147-175`): binds the face's target and depth
   * buffer and looks from the probe along the face's axis. The X axis is
   * mirrored for the left-handed cube: Carbon's `LookAtMatrix(...) * xInverter`
   * (row-vector) is `xInverter` applied after the look-at, so in gl order the
   * inverter is the left operand.
   */
  @blue.method
  @meta.implemented
  StartRenderFace(face, renderContext)
  {
    renderContext.RenderPassHint(
      new Tr2ColorAttachment(Tr2LoadAction.CLEAR, Tr2StoreAction.STORE, 0),
      new Tr2DepthAttachment(Tr2LoadAction.CLEAR, Tr2StoreAction.DONT_CARE, 0));

    const esm = renderContext.GetEffectStateManager();
    esm.SetRenderTarget(0, this._renderTargets[face].GetRenderTarget());
    esm.SetDepthStencilBuffer(this._stencilMaps[face]);

    const up = Tr2ReflectionProbe._faceDirections[face * 2];
    const at = vec3.add(this._faceTarget, this.position, Tr2ReflectionProbe._faceDirections[face * 2 + 1]);
    const view = mat4.lookAtCarbon(this._faceView, this.position, at, up);
    mat4.multiply(view, Tr2ReflectionProbe._xInverter, view);
    Tr2Renderer.SetViewTransform(view);
  }

  /**
   * Carbon `EndRenderPass` (`cpp:177-204`): copies the rendered faces into the
   * cube, restores culling and the saved state, filters, and advances the face
   * when only one side renders per frame.
   */
  @blue.method
  @meta.implemented
  EndRenderPass(renderContext)
  {
    const cube = this.unfilteredTexture.GetRenderTarget();
    for (let face = this.GetStartFace(); face < this.GetEndFace(); face += 1)
    {
      cube.CopySubresourceRegion(Tr2TextureSubresource.create__FaceMipLevel(face, 0), this._renderTargets[face].GetRenderTarget(),
        Tr2TextureSubresource.create__FaceMipLevel(0, 0), renderContext);
    }

    const esm = renderContext.GetEffectStateManager();
    esm.SetInvertedCullMode(this._prevCullInversion);

    esm.PopDepthStencilBuffer();
    esm.PopRenderTarget();
    Tr2Renderer.PopProjection();
    Tr2Renderer.PopViewTransform();
    esm.PopViewport();

    this.Filter(renderContext);
    this._hasData = true;
    this._onePassDone = true;

    if (this.renderFrequency !== Tr2ReflectionProbe.ReflectionProbeRenderFrequency.ALL_SIDES_PER_FRAME)
    {
      this.currentFrame = (this.currentFrame + 1) % 6;
    }
  }

  /**
   * Carbon `GetFrustum` (`cpp:73-78`): the frustum of the current view and
   * projection from the probe position, over the current viewport.
   */
  @blue.method
  @meta.implemented
  GetFrustum(_face, renderContext)
  {
    const frustum = new TriFrustum();
    frustum.DeriveFrustum(Tr2Renderer.GetViewTransform(), this.position, Tr2Renderer.GetProjectionTransform(),
      renderContext.GetEffectStateManager().GetViewport());
    return frustum;
  }

  /** Carbon `GetDepthBuffer` (`h:59`): face `face`'s depth buffer. */
  @blue.method
  @meta.implemented
  GetDepthBuffer(face)
  {
    return this._stencilMaps[face];
  }

  /** Carbon's faceDirections (cpp:154-167): up then look direction for +X, -X, +Y, -Y, +Z, -Z. */
  static _faceDirections = [
    vec3.fromValues(0, 1, 0), vec3.fromValues(1, 0, 0),
    vec3.fromValues(0, 1, 0), vec3.fromValues(-1, 0, 0),
    vec3.fromValues(0, 0, -1), vec3.fromValues(0, 1, 0),
    vec3.fromValues(0, 0, 1), vec3.fromValues(0, -1, 0),
    vec3.fromValues(0, 1, 0), vec3.fromValues(0, 0, 1),
    vec3.fromValues(0, 1, 0), vec3.fromValues(0, 0, -1)
  ];

  /** Carbon's xInverter (cpp:169-171): mirrors X for the left-handed cube. */
  static _xInverter = mat4.fromValues(-1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);

  static ReflectionProbeRenderFrequency = {
    ONE_SIDE_PER_FRAME: 0,
    ALL_SIDES_PER_FRAME: 1,
  };

}

// Registered as Carbon registers it (trinity/trinity/Tr2ReflectionProbe_Blue.cpp:14).
be.enums.Create("trinity.Tr2ReflectionProbe.ReflectionProbeRenderFrequency", Tr2ReflectionProbe.ReflectionProbeRenderFrequency, {
  exposedName: "ReflectionProbeRenderFrequency", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooser: [
    { name: "OneSidePerFrame", value: Tr2ReflectionProbe.ReflectionProbeRenderFrequency.ONE_SIDE_PER_FRAME, description: "One side per frame" },
    { name: "AllSidesPerFrame", value: Tr2ReflectionProbe.ReflectionProbeRenderFrequency.ALL_SIDES_PER_FRAME, description: "All sides per frame" }
  ]
});

// Exact native Blue exposure: only these identities participate in loading.
