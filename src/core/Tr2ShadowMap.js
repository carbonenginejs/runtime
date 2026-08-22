// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Tr2ShadowMap.h
//   trinity/trinity/Tr2ShadowMap.cpp
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";
import { Tr2Effect } from "../shader/Tr2Effect.js";
import { Tr2Denoiser } from "../generated/trinityCore/Tr2Denoiser.js";
import { Tr2VariableStore } from "./variable/Tr2VariableStore.js";
import { TriFrustumOrtho } from "./view/TriFrustumOrtho.js";

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
  effect.AddResourceTexture2D("EveSpaceSceneCascadedShadowMap");
  effect.AddResourceTexture2D("DepthMap");
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

/** Carbon OrthoNormalBasisZ. Flat matrix bytes match gl-matrix storage. */
function writeOrthoNormalBasisZ(out, z)
{
  mat4.identity(out);
  const length = Math.hypot(z[0], z[1], z[2]);
  const zx = z[0] / length;
  const zy = z[1] / length;
  const zz = z[2] / length;
  out[8] = zx;
  out[9] = zy;
  out[10] = zz;

  const xx = Math.abs(zx) > 0.99 ? 0 : 1;
  const xy = Math.abs(zx) > 0.99 ? 1 : 0;
  let yx = xy * zz;
  let yy = -xx * zz;
  let yz = xx * zy - xy * zx;
  const yLength = Math.hypot(yx, yy, yz);
  yx /= yLength;
  yy /= yLength;
  yz /= yLength;

  out[4] = yx;
  out[5] = yy;
  out[6] = yz;
  out[0] = yy * zz - yz * zy;
  out[1] = yz * zx - yx * zz;
  out[2] = yx * zy - yy * zx;
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

/** Cascaded-shadow split producer; engines realize only its GPU operations. */
@type.define({ className: "Tr2ShadowMap", family: "trinityCore" })
export class Tr2ShadowMap extends CjsModel
{
  @io.notify
  @io.persist
  @type.int32
  @type.enum("ShadowSplitMode")
  shadowSplitMode = 0;

  @io.readwrite
  @type.objectRef("Tr2Denoiser")
  denoiser = new Tr2Denoiser();

  @io.readwrite
  @type.objectRef("Tr2Effect")
  cascadeEffect = createShadowEffect();

  @io.notify
  @io.read
  @type.uint32
  splitCount = SHADOW_FRUSTUM_COUNT;

  @io.notify
  @io.readwrite
  @type.boolean
  debugColorSplit = false;

  @io.readwrite
  @type.float32
  SplitNr15 = STATIC_SPLITS[15];

  @io.readwrite
  @type.float32
  SplitNr8 = STATIC_SPLITS[8];

  @io.readwrite
  @type.float32
  SplitNr6 = STATIC_SPLITS[6];

  @io.readwrite
  @type.float32
  SplitNr5 = STATIC_SPLITS[5];

  @io.readwrite
  @type.float32
  SplitNr14 = STATIC_SPLITS[14];

  @io.readwrite
  @type.float32
  SplitNr10 = STATIC_SPLITS[10];

  @io.readwrite
  @type.float32
  SplitNr13 = STATIC_SPLITS[13];

  @io.readwrite
  @type.float32
  SplitNr4 = STATIC_SPLITS[4];

  @io.readwrite
  @type.float32
  SplitNr3 = STATIC_SPLITS[3];

  @io.readwrite
  @type.float32
  SplitNr7 = STATIC_SPLITS[7];

  @io.readwrite
  @type.float32
  SplitNr1 = STATIC_SPLITS[1];

  @io.readwrite
  @type.float32
  SplitNr9 = STATIC_SPLITS[9];

  @io.readwrite
  @type.float32
  SplitNr0 = STATIC_SPLITS[0];

  @io.readwrite
  @type.float32
  SplitNr11 = STATIC_SPLITS[11];

  @io.readwrite
  @type.float32
  SplitNr12 = STATIC_SPLITS[12];

  @io.readwrite
  @type.float32
  SplitNr2 = STATIC_SPLITS[2];

  @io.notify
  @io.readwrite
  @type.boolean
  disableShimmer = true;

  @io.readwrite
  @type.uint32
  size = 2048;

  perSplitData = createPerSplitData();

  #width = SHADOW_MAP_WIDTH;

  #height = SHADOW_MAP_HEIGHT;

  #oldZFar = 0;

  #useDenoiser = true;

  #lastNearClip = 0;

  #lastFarClip = 0;

  #lastShadowSplitMode = Tr2ShadowMap.ShadowSplitMode.STATIC;

  #lastDebugColorSplit = false;

  #splitSetups = Array.from({ length: SHADOW_FRUSTUM_COUNT }, () => createSplitSetup());

  /** Creates the logical effect/denoiser state and reserves Carbon's globals. */
  constructor()
  {
    super();
    const store = Tr2VariableStore.GlobalStore();
    store.RegisterVariable("EveSpaceSceneShadowMap");
    store.RegisterVariable("EveSpaceSceneCascadedShadowMap");
  }

  /** Applies the atlas element size/count and the one-way denoiser disable. */
  @carbon.method
  @impl.adapted
  @impl.reason("The fixed PerSplitData arrays make split counts above Carbon's 16-slot capacity fail immediately instead of corrupting adjacent native memory.")
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
    this.#useDenoiser = Boolean(useDenoiser);
    if (!this.#useDenoiser)
    {
      this.denoiser = null;
    }
  }

  /** Applies Carbon's notification consequences from the current owned state. */
  @carbon.method
  @impl.adapted
  @impl.reason("CjsModel notifications expose settled state rather than Be::Var identity, so this compares the two notify-backed values against their cached state.")
  OnModified()
  {
    if (this.debugColorSplit !== this.#lastDebugColorSplit)
    {
      this.cascadeEffect.SetOption("SHADOW_DEBUG_MODE", this.debugColorSplit ? "SDM_COLOR" : "SDM_NONE");
      this.#lastDebugColorSplit = this.debugColorSplit;
    }

    if (this.shadowSplitMode !== this.#lastShadowSplitMode)
    {
      if (this.shadowSplitMode === Tr2ShadowMap.ShadowSplitMode.STATIC)
      {
        this.#SetStaticShadowSplits();
      }
      else if (this.shadowSplitMode === Tr2ShadowMap.ShadowSplitMode.DYNAMIC)
      {
        this.#lastNearClip = 0;
        this.#lastFarClip = 0;
      }
      this.#lastShadowSplitMode = this.shadowSplitMode;
    }

    this.perSplitData.SplitInfo[0] = this.splitCount;
    return true;
  }

  @carbon.method
  @impl.implemented
  /** Changes whether an existing denoiser should be used for future results. */
  ShouldUseDenoiser(value)
  {
    this.#useDenoiser = Boolean(value);
  }

  /** Engine-facing read of Carbon's private denoiser-use switch. */
  @impl.custom
  @impl.reason("The nominal engine executor needs Carbon's private denoiser-use decision without reading implementation fields.")
  GetUseDenoiser()
  {
    return this.#useDenoiser;
  }

  /** Recomputes geometric dynamic split endpoints when the clip range changes. */
  @carbon.method
  @impl.implemented
  UpdateSplitValues(nearClip, farClip)
  {
    if (this.shadowSplitMode !== Tr2ShadowMap.ShadowSplitMode.DYNAMIC) return;
    if (this.#lastNearClip === nearClip && this.#lastFarClip === farClip) return;

    this.#lastNearClip = nearClip;
    this.#lastFarClip = farClip;
    const logNear = Math.log2(nearClip);
    const logFar = Math.log2(farClip);
    for (let index = 0; index < this.splitCount; index++)
    {
      this.#SetSplitValue(index, Math.pow(2, logNear + (logFar - logNear) * ((index + 1) / this.splitCount)));
    }
  }

  /**
   * Transforms the D3D clip cube through projection inverse, inverse view and
   * light view, returning its light-space bounds and writing all eight corners.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("The caller supplies owned JS output containers; matrix bytes stay in logical gl-matrix form and are never pre-transposed.")
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
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon stores Transpose(lightViewProjection) and returns SplitSetup by value; Trinity stores the logical matrix for RawData's terminal transpose and reuses one allocation-free result per split.")
  SetupShadowSplit(splitIndex, invViewTransform, lightDirection, zNear, leftDivNear, rightDivNear, topDivNear, bottomDivNear)
  {
    if (!Number.isInteger(splitIndex) || splitIndex < 0 || splitIndex >= this.splitCount)
    {
      throw new RangeError("Tr2ShadowMap.SetupShadowSplit received an invalid split index.");
    }

    const setup = this.#splitSetups[splitIndex];
    if (splitIndex === 0) this.#oldZFar = zNear;
    const zFar = this.#GetSplitValue(splitIndex);
    this.perSplitData.ShadowMapValues[splitIndex >> 2][splitIndex & 3] = zFar;

    const left = leftDivNear * this.#oldZFar;
    const right = rightDivNear * this.#oldZFar;
    const top = topDivNear * this.#oldZFar;
    const bottom = bottomDivNear * this.#oldZFar;
    writePerspectiveOffCenter(PROJECTION_SCRATCH, left, right, bottom, top, this.#oldZFar, zFar);
    this.#oldZFar = zFar;

    mat4.invert(INVERSE_PROJECTION_SCRATCH, PROJECTION_SCRATCH);
    // Carbon inverseProjection * inverseView; gl-matrix reverses the operands.
    mat4.multiply(setup.invViewProj, invViewTransform, INVERSE_PROJECTION_SCRATCH);

    LIGHT_DIRECTION_SCRATCH[0] = -lightDirection[0];
    LIGHT_DIRECTION_SCRATCH[1] = -lightDirection[1];
    LIGHT_DIRECTION_SCRATCH[2] = -lightDirection[2];
    writeOrthoNormalBasisZ(BASIS_SCRATCH, LIGHT_DIRECTION_SCRATCH);
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

  /** Delegates physical atlas allocation and setup to the installed engine. */
  @carbon.method
  @impl.adapted
  @impl.reason("GPU pool allocation is realized by the nominal shadow executor installed on the render context.")
  PrepareShadowRendering(renderContext)
  {
    return renderContext.GetShadowMapExecutor().PrepareShadowRendering(this, renderContext);
  }

  /** Delegates one atlas-cell render-pass begin to the installed engine. */
  @carbon.method
  @impl.adapted
  @impl.reason("Viewport and physical depth-target state are engine realization details.")
  BeginShadowRendering(renderContext, splitIndex)
  {
    return renderContext.GetShadowMapExecutor().BeginShadowRendering(this, splitIndex, renderContext);
  }

  /** Delegates shadow rendering teardown to the installed engine. */
  @carbon.method
  @impl.adapted
  @impl.reason("Physical render-state restoration is owned by the engine executor.")
  EndShadowRendering(renderContext)
  {
    return renderContext.GetShadowMapExecutor().EndShadowRendering(this, renderContext);
  }

  /** Delegates shadow-result realization and optional denoising to the engine. */
  @carbon.method
  @impl.adapted
  @impl.reason("The engine owns temporary targets, fullscreen drawing and physical denoising.")
  DrawToShadowMapResult(renderContext, depthMap, cascadedShadowDepth, upscaling)
  {
    return renderContext.GetShadowMapExecutor().DrawToShadowMapResult(
      this,
      depthMap,
      cascadedShadowDepth,
      upscaling,
      renderContext
    );
  }

  @carbon.method
  @impl.implemented
  /** Returns the number of active cascade splits. */
  GetShadowSplitCount()
  {
    return this.splitCount;
  }

  @carbon.method
  @impl.implemented
  /** Returns the square pixel size of one atlas cell. */
  GetShadowMapSize()
  {
    return this.size;
  }

  /** Returns the fixed number of atlas columns. */
  @impl.custom
  @impl.reason("The nominal engine executor needs Carbon's private fixed atlas width without reading implementation fields.")
  GetShadowMapWidth()
  {
    return this.#width;
  }

  /** Returns the fixed number of atlas rows. */
  @impl.custom
  @impl.reason("The nominal engine executor needs Carbon's private fixed atlas height without reading implementation fields.")
  GetShadowMapHeight()
  {
    return this.#height;
  }

  /** Returns the stable owned record consumed by scene per-frame packing. */
  @impl.custom
  @impl.reason("The scene needs a nominal direct accessor to Carbon's public PerSplitData without structural probing.")
  GetPerSplitData()
  {
    return this.perSplitData;
  }

  @carbon.method
  @impl.implemented
  /** Returns the logical effect used to resolve the screen-space shadow mask. */
  GetShadowEffect()
  {
    return this.cascadeEffect;
  }

  @carbon.method
  @impl.implemented
  /** Reports whether cascade-debug colouring is enabled. */
  GetDebugSplitValue()
  {
    return this.debugColorSplit;
  }

  @carbon.method
  @impl.implemented
  /** Returns Carbon's packed debug colour for a cascade colour index. */
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
  #SetStaticShadowSplits()
  {
    for (let index = 0; index < STATIC_SPLITS.length; index++)
    {
      this.#SetSplitValue(index, STATIC_SPLITS[index]);
    }
  }

  /** Writes one authored/dynamic split endpoint to its public field. */
  #SetSplitValue(index, value)
  {
    this[`SplitNr${index}`] = value;
  }

  /** Reads one split endpoint from its public field. */
  #GetSplitValue(index)
  {
    return this[`SplitNr${index}`];
  }

  static ShadowSplitMode = Object.freeze({
    STATIC: 0,
    DYNAMIC: 1,
    MANUAL: 2
  });
}
