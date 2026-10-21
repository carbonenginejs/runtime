// Source: trinity/trinity/Tr2ShadowMap.h
import { Tr2Renderer } from "./Tr2Renderer.js";
import { INotify, IsMatch } from "../../global/blue/INotify.js";
//   trinity/trinity/Tr2ShadowMap.cpp
import { meta, type, blue } from "#schema";
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { PixelFormat, Tr2GpuUsage } from "#consts/render-context";
import { Tr2Effect } from "../shader/Tr2Effect.js";
import { Tr2Denoiser } from "./Tr2Denoiser.js";
import { Tr2VariableStore } from "./variable/Tr2VariableStore.js";
import { TriFrustumOrtho } from "./view/TriFrustumOrtho.js";
import { blue as be, EnumRegistrationType } from "#blue";
import { TriVariableContentType } from "../generated/trinityCore/enums.js";

const SHADOW_FRUSTUM_COUNT = 16;
const SHADOW_MAP_WIDTH = 8;
const SHADOW_MAP_HEIGHT = 2;

const STATIC_SPLITS = Object.freeze([
  25, 75, 150, 300,
  600, 1200, 2400, 4800,
  9600, 19200, 38400, 76800,
  153600, 307200, 614400, 1228800
]);

const DX_UNIT_CUBE = Object.freeze([
  Object.freeze([ -1, -1, 0 ]), Object.freeze([ -1, 1, 0 ]),
  Object.freeze([ 1, 1, 0 ]), Object.freeze([ 1, -1, 0 ]),
  Object.freeze([ -1, -1, 1 ]), Object.freeze([ -1, 1, 1 ]),
  Object.freeze([ 1, 1, 1 ]), Object.freeze([ 1, -1, 1 ])
]);

const PROJECTION_SCRATCH = mat4.create();
const INVERSE_PROJECTION_SCRATCH = mat4.create();
const BASIS_SCRATCH = mat4.create();
const LIGHT_VIEW_SCRATCH = mat4.create();
const ORTHO_SCRATCH = mat4.create();
const TRANSFORMED_SCRATCH = vec4.create();
const WORLD_SCRATCH = vec3.create();
const LIGHT_DIRECTION_SCRATCH = vec3.create();

function createPerSplitData()
{
  return {
    ShadowMapValues: Array.from({ length: 4 }, () => vec4.create()),
    ShadowMatrixVal: Array.from({ length: SHADOW_FRUSTUM_COUNT }, () => mat4.create()),
    CascadeRanges: Array.from({ length: SHADOW_FRUSTUM_COUNT }, () => vec4.create()),
    SplitInfo: vec4.create()
  };
}

function createSplitSetup()
{
  return {
    shadowFrustum: new TriFrustumOrtho(),
    lightViewProjection: mat4.create(),
    invViewProj: mat4.create(),
    aabb: { min: vec3.create(), max: vec3.create() },
    corners: Array.from({ length: 8 }, () => vec3.create())
  };
}

function createShadowEffect()
{
  const effect = new Tr2Effect();

  effect.SetEffectPathName("res:/graphics/effect/managed/space/system/ShadowDepth.fx");

  // DECLARED BY CLEARING, which is Carbon (`cpp:41-42`), not by
  // AddResourceTexture2D. The difference is not cosmetic: a res-path slot and a
  // runtime slot are different classes, so declaring the res-path kind here left
  // SetParameter unable to find a runtime slot to update - it added a new one on
  // every call, and a per-frame resolve grew the resource list without bound.
  effect.SetParameter__TextureAL("EveSpaceSceneCascadedShadowMap", null);
  effect.SetParameter__TextureAL("DepthMap", null);
  return effect;
}

/** Carbon PerspectiveOffCenterMatrix: D3D zero-to-one depth. */
function writePerspectiveOffCenter(out, left, right, bottom, top, near, far)
{
  out.fill(0);
  out[0] = 2 * near / (right - left);
  out[5] = -2 * near / (bottom - top);
  out[8] = 1 + 2 * left / (right - left);
  out[9] = -1 - 2 * top / (bottom - top);
  out[10] = far / (near - far);
  out[11] = -1;
  out[14] = near * far / (near - far);
  return out;
}

/** Carbon OrthoOffCenterMatrix: D3D zero-to-one depth. */
function writeOrthoOffCenter(out, left, right, bottom, top, near, far)
{
  mat4.identity(out);
  out[0] = 2 / (right - left);
  out[5] = 2 / (top - bottom);
  out[10] = 1 / (near - far);
  out[12] = -1 - 2 * left / (right - left);
  out[13] = 1 + 2 * top / (bottom - top);
  out[14] = near / (near - far);
  return out;
}

/** Cascaded-shadow split producer. Its GPU operations are not ported yet. */
@blue.define("Tr2ShadowMap")
@blue.inherit(INotify)
@blue.interface(INotify)
export class Tr2ShadowMap
{
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.int32
  @type.enum("trinity.Tr2ShadowMap.ShadowSplitMode")
  shadowSplitMode = 0;

  @blue.readwrite
  @type.rootRef("Tr2Denoiser")
  denoiser = new Tr2Denoiser();

  @blue.readwrite
  @type.rootRef("Tr2Effect")
  cascadeEffect = createShadowEffect();

  @blue.notify
  @blue.read
  @type.uint32
  splitCount = SHADOW_FRUSTUM_COUNT;

  @blue.notify
  @blue.readwrite
  @type.boolean
  debugColorSplit = false;

  @blue.readwrite
  @type.float32
  SplitNr15 = STATIC_SPLITS[15];

  @blue.readwrite
  @type.float32
  SplitNr8 = STATIC_SPLITS[8];

  @blue.readwrite
  @type.float32
  SplitNr6 = STATIC_SPLITS[6];

  @blue.readwrite
  @type.float32
  SplitNr5 = STATIC_SPLITS[5];

  @blue.readwrite
  @type.float32
  SplitNr14 = STATIC_SPLITS[14];

  @blue.readwrite
  @type.float32
  SplitNr10 = STATIC_SPLITS[10];

  @blue.readwrite
  @type.float32
  SplitNr13 = STATIC_SPLITS[13];

  @blue.readwrite
  @type.float32
  SplitNr4 = STATIC_SPLITS[4];

  @blue.readwrite
  @type.float32
  SplitNr3 = STATIC_SPLITS[3];

  @blue.readwrite
  @type.float32
  SplitNr7 = STATIC_SPLITS[7];

  @blue.readwrite
  @type.float32
  SplitNr1 = STATIC_SPLITS[1];

  @blue.readwrite
  @type.float32
  SplitNr9 = STATIC_SPLITS[9];

  @blue.readwrite
  @type.float32
  SplitNr0 = STATIC_SPLITS[0];

  @blue.readwrite
  @type.float32
  SplitNr11 = STATIC_SPLITS[11];

  @blue.readwrite
  @type.float32
  SplitNr12 = STATIC_SPLITS[12];

  @blue.readwrite
  @type.float32
  SplitNr2 = STATIC_SPLITS[2];

  @blue.notify
  @blue.readwrite
  @type.boolean
  disableShimmer = true;

  @blue.readwrite
  @type.uint32
  size = 2048;

  /**
   * Carbon's `PerSplitData` record. `ShadowMatrixVal` holds each cascade's
   * logical gl-matrix light view-projection, untransposed. The scene composes
   * it with the inverse view and the atlas cell, and
   * `RawData.SetAndTransposeIndex` performs the single packing transpose;
   * engines must not transpose or rebuild these matrices.
   */
  perSplitData = createPerSplitData();

  _width = SHADOW_MAP_WIDTH;

  _height = SHADOW_MAP_HEIGHT;

  _oldZFar = 0;

  _useDenoiser = true;

  _lastNearClip = 0;

  _lastFarClip = 0;

  _splitSetups = Array.from({ length: SHADOW_FRUSTUM_COUNT }, () => createSplitSetup());

  /** Creates the logical effect/denoiser state and reserves Carbon's globals. */
  constructor()
  {
    const store = Tr2VariableStore.globalStore();
    store.RegisterVariableType("EveSpaceSceneShadowMap", TriVariableContentType.TRIVARIABLE_INVALID);
    store.RegisterVariableType("EveSpaceSceneCascadedShadowMap", TriVariableContentType.TRIVARIABLE_INVALID);
  }

  /**
   * Applies the atlas element size/count and the one-way denoiser disable.
   *
   * Adapted: The fixed PerSplitData arrays make split counts above Carbon's 16-slot capacity
   * fail immediately instead of corrupting adjacent native memory.
   */
  @blue.method
  @meta.adapted
  Setup(elementSize, elementCount, useDenoiser)
  {
    const nextSize = elementSize >>> 0;
    const nextCount = elementCount >>> 0;
    if (nextCount > SHADOW_FRUSTUM_COUNT)
    {
      throw new RangeError(`Tr2ShadowMap supports at most ${SHADOW_FRUSTUM_COUNT} splits.`);
    }
    if (this.size !== nextSize || this.splitCount !== nextCount)
    {
      this.size = nextSize;
      this.splitCount = nextCount;
      this.perSplitData.SplitInfo[0] = nextCount;
    }
    this._useDenoiser = Boolean(useDenoiser);
    if (!this._useDenoiser)
    {
      this.denoiser = null;
    }
  }

  /**
   * Carbon OnModified (Tr2ShadowMap.cpp:66-93): a debug-colour change sets the
   * shadow effect's debug option; a split-mode change applies the static splits
   * or resets the dynamic clip range; every notification refreshes the split count.
   */
  @blue.method
  @meta.implemented
  OnModified(value = null)
  {
    if (IsMatch(value, "debugColorSplit"))
    {
      this.cascadeEffect.SetOption("SHADOW_DEBUG_MODE", this.debugColorSplit ? "SDM_COLOR" : "SDM_NONE");
    }
    if (IsMatch(value, "shadowSplitMode"))
    {
      if (this.shadowSplitMode === Tr2ShadowMap.ShadowSplitMode.STATIC)
      {
        this._SetStaticShadowSplits();
      }
      else if (this.shadowSplitMode === Tr2ShadowMap.ShadowSplitMode.DYNAMIC)
      {
        this._lastNearClip = 0;
        this._lastFarClip = 0;
      }
    }
    this.perSplitData.SplitInfo[0] = this.splitCount;
    return true;
  }

  /** Changes whether an existing denoiser should be used for future results. */
  @blue.method
  @meta.implemented
  ShouldUseDenoiser(value)
  {
    this._useDenoiser = Boolean(value);
  }

  /**
   * Engine-facing read of Carbon's private denoiser-use switch.
   *
   * Adapted: The nominal engine executor needs Carbon's private denoiser-use decision
   * without reading implementation fields.
   */
  GetUseDenoiser()
  {
    return this._useDenoiser;
  }

  /** Recomputes geometric dynamic split endpoints when the clip range changes. */
  @blue.method
  @meta.implemented
  UpdateSplitValues(nearClip, farClip)
  {
    if (this.shadowSplitMode !== Tr2ShadowMap.ShadowSplitMode.DYNAMIC) return;
    if (this._lastNearClip === nearClip && this._lastFarClip === farClip) return;

    this._lastNearClip = nearClip;
    this._lastFarClip = farClip;
    const logNear = Math.log2(nearClip);
    const logFar = Math.log2(farClip);
    for (let index = 0; index < this.splitCount; index++)
    {
      this._SetSplitValue(index, Math.pow(2, logNear + (logFar - logNear) * ((index + 1) / this.splitCount)));
    }
  }

  /**
   * Transforms the D3D clip cube through projection inverse, inverse view and
   * light view, returning its light-space bounds and writing all eight corners.
   *
   * Adapted: The caller supplies owned JS output containers; matrix bytes stay in logical
   * gl-matrix form and are never pre-transposed.
   */
  @blue.method
  @meta.adapted
  static CalculateAABB(
    projection,
    invViewTransform,
    lightView,
    corners,
    out = { min: vec3.create(), max: vec3.create() }
  )
  {
    mat4.invert(INVERSE_PROJECTION_SCRATCH, projection);
    const min = out.min;
    const max = out.max;
    min[0] = min[1] = min[2] = Infinity;
    max[0] = max[1] = max[2] = -Infinity;

    for (let index = 0; index < DX_UNIT_CUBE.length; index++)
    {
      const source = DX_UNIT_CUBE[index];
      TRANSFORMED_SCRATCH[0] = source[0];
      TRANSFORMED_SCRATCH[1] = source[1];
      TRANSFORMED_SCRATCH[2] = source[2];
      TRANSFORMED_SCRATCH[3] = 1;
      vec4.transformMat4(TRANSFORMED_SCRATCH, TRANSFORMED_SCRATCH, INVERSE_PROJECTION_SCRATCH);
      const inverseW = 1 / TRANSFORMED_SCRATCH[3];
      WORLD_SCRATCH[0] = TRANSFORMED_SCRATCH[0] * inverseW;
      WORLD_SCRATCH[1] = TRANSFORMED_SCRATCH[1] * inverseW;
      WORLD_SCRATCH[2] = TRANSFORMED_SCRATCH[2] * inverseW;
      vec3.transformMat4(WORLD_SCRATCH, WORLD_SCRATCH, invViewTransform);
      vec3.transformMat4(corners[index], WORLD_SCRATCH, lightView);

      const corner = corners[index];
      min[0] = Math.min(min[0], corner[0]);
      min[1] = Math.min(min[1], corner[1]);
      min[2] = Math.min(min[2], corner[2]);
      max[0] = Math.max(max[0], corner[0]);
      max[1] = Math.max(max[1], corner[1]);
      max[2] = Math.max(max[2], corner[2]);
    }
    return out;
  }

  /**
   * Builds one logical light-view-projection split and its shader data.
   *
   * The returned object is an allocation-free borrowed view for this split and
   * is overwritten the next time the same split index is prepared.
   *
   * Adapted: Carbon stores Transpose(lightViewProjection) and returns SplitSetup by value;
   * Trinity stores the logical matrix for RawData's terminal transpose and reuses one
   * allocation-free result per split.
   */
  @blue.method
  @meta.adapted
  SetupShadowSplit(splitIndex, invViewTransform, lightDirection, zNear, leftDivNear, rightDivNear, topDivNear, bottomDivNear)
  {
    if (!Number.isInteger(splitIndex) || splitIndex < 0 || splitIndex >= this.splitCount)
    {
      throw new RangeError("Tr2ShadowMap.SetupShadowSplit received an invalid split index.");
    }

    const setup = this._splitSetups[splitIndex];
    if (splitIndex === 0) this._oldZFar = zNear;
    const zFar = this._GetSplitValue(splitIndex);
    this.perSplitData.ShadowMapValues[splitIndex >> 2][splitIndex & 3] = zFar;

    const left = leftDivNear * this._oldZFar;
    const right = rightDivNear * this._oldZFar;
    const top = topDivNear * this._oldZFar;
    const bottom = bottomDivNear * this._oldZFar;
    writePerspectiveOffCenter(PROJECTION_SCRATCH, left, right, bottom, top, this._oldZFar, zFar);
    this._oldZFar = zFar;

    mat4.invert(INVERSE_PROJECTION_SCRATCH, PROJECTION_SCRATCH);
    // Carbon inverseProjection * inverseView; gl-matrix reverses the operands.
    mat4.multiply(setup.invViewProj, invViewTransform, INVERSE_PROJECTION_SCRATCH);

    LIGHT_DIRECTION_SCRATCH[0] = -lightDirection[0];
    LIGHT_DIRECTION_SCRATCH[1] = -lightDirection[1];
    LIGHT_DIRECTION_SCRATCH[2] = -lightDirection[2];
    mat4.orthoNormalBasisZ(BASIS_SCRATCH, LIGHT_DIRECTION_SCRATCH);
    mat4.invert(LIGHT_VIEW_SCRATCH, BASIS_SCRATCH);

    Tr2ShadowMap.CalculateAABB(
      PROJECTION_SCRATCH,
      invViewTransform,
      LIGHT_VIEW_SCRATCH,
      setup.corners,
      setup.aabb
    );

    const min = setup.aabb.min;
    const max = setup.aabb.max;
    if (this.disableShimmer)
    {
      let maxDistance = 0;
      for (let first = 0; first < setup.corners.length; first++)
      {
        for (let second = first + 1; second < setup.corners.length; second++)
        {
          const a = setup.corners[first];
          const b = setup.corners[second];
          maxDistance = Math.max(maxDistance, Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]));
        }
      }

      const radius = Math.ceil(maxDistance / 2);
      const texelSize = radius * 2 / this.size;
      const centerX = Math.floor(((min[0] + max[0]) * 0.5) / texelSize + 0.5) * texelSize;
      const centerY = Math.floor(((min[1] + max[1]) * 0.5) / texelSize + 0.5) * texelSize;
      const centerZ = (min[2] + max[2]) * 0.5;
      min[0] = centerX - radius;
      min[1] = centerY - radius;
      min[2] = centerZ - radius;
      max[0] = centerX + radius;
      max[1] = centerY + radius;
      max[2] = centerZ + radius;
    }

    writeOrthoOffCenter(ORTHO_SCRATCH, max[0], min[0], max[1], min[1], -max[2], -min[2]);
    // Carbon lightView * ortho; gl-matrix reverses the operands.
    mat4.multiply(setup.lightViewProjection, ORTHO_SCRATCH, LIGHT_VIEW_SCRATCH);

    const range = this.perSplitData.CascadeRanges[splitIndex];
    range[0] = max[0] - min[0];
    range[1] = max[1] - min[1];
    range[2] = max[2] - min[2];
    range[3] = 0;
    mat4.copy(this.perSplitData.ShadowMatrixVal[splitIndex], setup.lightViewProjection);
    setup.shadowFrustum.DeriveFrustum(LIGHT_VIEW_SCRATCH, min, max);
    return setup;
  }

  /**
   * Allocates the cascaded depth surface and makes it the render target.
   *
   * @param {object} gpuResourcePool The pool to borrow the surface from.
   * @param {object} renderContext The context to set state on.
   * @returns {object|null} The borrowed depth texture, or null when the pool
   *   could not supply one - which Carbon notes happens on a lost device.
   */
  @blue.method
  @meta.implemented
  PrepareShadowRendering(gpuResourcePool, renderContext)
  {
    // Carbon's GetTempTexture( name, width, height, format, usage ) overload:
    // a 2D texture of one mip.
    const cascadedShadowDepth = gpuResourcePool.GetTempTexture__WidthHeight("cascadedShadowDepth", this.size * this._width,
      this.size * this._height, PixelFormat.PIXEL_FORMAT_D32_FLOAT, Tr2GpuUsage.DEPTH_STENCIL | Tr2GpuUsage.SHADER_RESOURCE);

    if (!cascadedShadowDepth || !cascadedShadowDepth.IsValid()) return null;

    const esm = renderContext.GetEffectStateManager();

    // The depth stencil IS the shadow map, so the colour target is pushed EMPTY -
    // Carbon passes a default-constructed Tr2TextureAL and comments it "empty
    // texture" (`cpp:238`). Null is that argument here. Omitting it would only
    // save the slot and leave the scene's colour target bound underneath the
    // whole shadow pass, which is what this line used to do.
    esm.PushViewport();
    esm.PushRenderTarget__TextureAL(null);
    esm.PushDepthStencilBuffer__TextureAL(cascadedShadowDepth.Get());
    esm.UpdateRenderTargetViewport(cascadedShadowDepth.Get().GetWidth(), cascadedShadowDepth.Get().GetHeight());

    // Carbon wants a clean depth buffer for this pass and says so.
    // Carbon: Clear( CLEARFLAGS_ZBUFFER, 0xffffffff, 1, 0 ) (Tr2ShadowMap.cpp:246).
    renderContext.Clear({ clearDepth: true, color: 0xffffffff, depth: 1 });
    renderContext.SetReadOnlyDepth(false);

    return cascadedShadowDepth;
  }

  /**
   * Points the viewport at one split's cell in the atlas.
   *
   * Eight cells per row: splits 0-7 fill the top row and 8 onward wrap to a
   * second, which is why the row index is `splitIndex % 8` and the y offset is
   * either zero or one cell down.
   *
   * @param {object} renderContext The context to set the viewport on.
   * @param {number} splitIndex Which cascade split.
   */
  @blue.method
  @meta.implemented
  BeginShadowRendering(renderContext, splitIndex)
  {
    const esm = renderContext.GetEffectStateManager();
    const topRow = splitIndex < 8;

    esm.SetViewport({
      width: this.size,
      height: this.size,
      x: (topRow ? splitIndex : splitIndex % 8) * this.size,
      y: topRow ? 0 : this.size,
      minZ: 0,
      maxZ: 1
    });
  }

  /**
   * Unwinds everything `PrepareShadowRendering` pushed, in reverse.
   *
   * @param {object} renderContext The context to restore.
   */
  @blue.method
  @meta.implemented
  EndShadowRendering(renderContext)
  {
    renderContext.SetReadOnlyDepth(false);

    const esm = renderContext.GetEffectStateManager();

    esm.PopRenderTarget();
    esm.PopDepthStencilBuffer();
    esm.PopViewport();
  }

  /**
   * Resolves the cascaded depth into a screen-space shadow factor.
   *
   * Carbon `DrawToShadowMapResult` (`cpp:278-305`). Borrow an R8 target the
   * size of the scene depth, bind it, run the shadow effect over a fullscreen
   * quad with the atlas and the depth map bound, then optionally denoise.
   *
   * THE DEPTH BUFFER IS PUSHED EMPTY, not merely saved. Carbon passes a
   * default-constructed Tr2TextureAL (`cpp:285`), which unbinds it - this pass
   * writes a full-screen factor and must not be depth-tested against the very
   * buffer it is reading.
   *
   * THE EFFECT'S TEXTURES ARE CLEARED IMMEDIATELY AFTER THE DRAW, as Carbon
   * does (`cpp:290-291`), so a later pass cannot inherit the atlas or the
   * scene depth from this one.
   *
   * `cascadeEffect` is Carbon's `m_shadowEffect` under our name - same
   * ShadowDepth.fx path, same two parameters (`cpp:39-42`).
   *
   * Adapted: Carbon reaches the blitter and the reversed-depth projection through static
   * Tr2Renderer; ours are an instance and the render context, so the renderer is passed in.
   *
   * @param {object} renderContext The context to draw against.
   * @param {object} gpuResourcePool The pool to borrow the result target from.
   * @param {object} depthMap The scene depth.
   * @param {object} cascadedShadowDepth The atlas produced by this pass.
   * @param {number} upscaling The denoiser's upscaling factor.
   * @param {object} renderer The renderer owning the blitter.
   * @returns {object|null} The shadow-factor target, or null without a pool.
   */
  @blue.method
  @meta.adapted
  DrawToShadowMapResult(renderContext, gpuResourcePool, depthMap, cascadedShadowDepth, upscaling, renderer)
  {
    let shadowMapResult = gpuResourcePool.GetTempTexture__WidthHeight("shadowMapResult", depthMap.GetWidth(), depthMap.GetHeight(),
      PixelFormat.PIXEL_FORMAT_R8_UNORM, Tr2GpuUsage.RENDER_TARGET | Tr2GpuUsage.SHADER_RESOURCE);

    const esm = renderContext.GetEffectStateManager();

    esm.PushRenderTarget__TextureAL(shadowMapResult.Get());
    esm.PushDepthStencilBuffer__TextureAL(null);

    try
    {
      this.cascadeEffect.SetParameter__TextureAL("EveSpaceSceneCascadedShadowMap", cascadedShadowDepth);
      this.cascadeEffect.SetParameter__TextureAL("DepthMap", depthMap);
      Tr2Renderer.drawScreenQuad(renderContext, this.cascadeEffect);
      this.cascadeEffect.SetParameter__TextureAL("EveSpaceSceneCascadedShadowMap", null);
      this.cascadeEffect.SetParameter__TextureAL("DepthMap", null);

      // Carbon gates on all three (`cpp:296`). Setup() nulls the denoiser when
      // it is disabled, so the useDenoiser flag and a present denoiser are not
      // the same question.
      if (this.denoiser && this._useDenoiser && depthMap.IsValid())
      {
        shadowMapResult = this.denoiser.Apply(
          shadowMapResult,
          depthMap,
          null,
          Tr2Renderer.GetReversedDepthProjectionTransform(),
          upscaling,
          gpuResourcePool,
          renderContext,
          renderer
        );
      }

      return shadowMapResult;
    }
    finally
    {
      esm.PopRenderTarget();
      esm.PopDepthStencilBuffer();
    }
  }

  /** Returns the number of active cascade splits. */
  @blue.method
  @meta.implemented
  GetShadowSplitCount()
  {
    return this.splitCount;
  }

  /** Returns the square pixel size of one atlas cell. */
  @blue.method
  @meta.implemented
  GetShadowMapSize()
  {
    return this.size;
  }

  /**
   * Returns the fixed number of atlas columns.
   *
   * Adapted: The nominal engine executor needs Carbon's private fixed atlas width without
   * reading implementation fields.
   */
  GetShadowMapWidth()
  {
    return this._width;
  }

  /**
   * Returns the fixed number of atlas rows.
   *
   * Adapted: The nominal engine executor needs Carbon's private fixed atlas height without
   * reading implementation fields.
   */
  GetShadowMapHeight()
  {
    return this._height;
  }

  /**
   * Returns the stable owned record consumed by scene per-frame packing.
   *
   * Adapted: The scene needs a nominal direct accessor to Carbon's public PerSplitData
   * without structural probing.
   */
  GetPerSplitData()
  {
    return this.perSplitData;
  }

  /** Returns the logical effect used to resolve the screen-space shadow mask. */
  @blue.method
  @meta.implemented
  GetShadowEffect()
  {
    return this.cascadeEffect;
  }

  /** Reports whether cascade-debug colouring is enabled. */
  @blue.method
  @meta.implemented
  GetDebugSplitValue()
  {
    return this.debugColorSplit;
  }

  /** Returns Carbon's packed debug colour for a cascade colour index. */
  @blue.method
  @meta.implemented
  GetDebugColors(switchCase)
  {
    switch (switchCase)
    {
      case 0: return 0xffffffff;
      case 1: return 0xffff0000;
      case 2: return 0xff00ff00;
      case 3: return 0xff0000ff;
      case 4: return 0xffffff00;
      case 5: return 0xff00ffff;
      case 6: return 0x2200ffff;
      case 7: return 0xff555555;
      case 8: return 0xff888888;
      default: return undefined;
    }
  }

  /** Restores the sixteen fixed Carbon cascade endpoints. */
  _SetStaticShadowSplits()
  {
    for (let index = 0; index < STATIC_SPLITS.length; index++)
    {
      this._SetSplitValue(index, STATIC_SPLITS[index]);
    }
  }

  /** Writes one authored/dynamic split endpoint to its public field. */
  _SetSplitValue(index, value)
  {
    this[`SplitNr${index}`] = value;
  }

  /** Reads one split endpoint from its public field. */
  _GetSplitValue(index)
  {
    return this[`SplitNr${index}`];
  }

  static ShadowSplitMode = {
    STATIC: 0,
    DYNAMIC: 1,
    MANUAL: 2
  };
}

// Registered as Carbon registers it (trinity/trinity/Tr2ShadowMap_Blue.cpp:14).
be.enums.Create("trinity.Tr2ShadowMap.ShadowSplitMode", Tr2ShadowMap.ShadowSplitMode, {
  exposedName: "ShadowSplitModeChooser", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooser: [
    { name: "Static", value: Tr2ShadowMap.ShadowSplitMode.STATIC, description: "Staticly computed splits for the shadow map" },
    { name: "Dynamic", value: Tr2ShadowMap.ShadowSplitMode.DYNAMIC, description: "Dynamic splits that are generated based on near and far planes" },
    { name: "Manual", value: Tr2ShadowMap.ShadowSplitMode.MANUAL, description: "Manual mode for use in graphite for debugging" }
  ]
});

// Exact native Blue exposure: only these identities participate in loading.
