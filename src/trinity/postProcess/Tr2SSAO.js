// Carbon source: trinity/trinity/Tr2SSAO.h
// Carbon source: trinity/trinity/Tr2SSAO.cpp
// Carbon source: trinity/trinity/Tr2SSAO_Blue.cpp
import { carbon, impl, edit, type } from "#schema";
import { CjsModel } from "#model";
import { mat4 } from "#math/mat4";
import { PixelFormat, ShaderType, TextureType, Tr2GpuUsage } from "#consts/render-context";
import { Failed, Tr2ConstantUsageAL } from "#trinityal";
import { ResourceRequirement } from "#resource";
import { SSAOQuality } from "../generated/trinityCore/enums.js";
import { Tr2Effect } from "../shader/Tr2Effect.js";
import { PER_OBJECT_VS, Tr2Renderer } from "../core/Tr2Renderer.js";
import { GpuResourceHandle } from "../core/Tr2GpuResourcePool/GpuResourceHandle.js";
import { blue, EnumRegistrationType } from "#blue";

/** CORTAO's effects and lookup table (`Tr2SSAO.cpp:99, 102, 108`). */
const CORTAO_EFFECT_PATH = "res:/Graphics/Effect/Managed/Space/System/CORTAO/CORTAO.fx";
const CORTAO_BLUR_EFFECT_PATH = "res:/Graphics/Effect/Managed/Space/System/CORTAO/Blur.fx";
const CORTAO_LOOKUP_TABLE_PATH = "res:/texture/ssao/24x24x16x16.dds";

/** The SAMPLE_COUNT option per `SSAOQuality`, highest first (`Tr2SSAO.cpp:647-653`). */
const SAMPLE_COUNTS = Object.freeze([
  "SAMPLE_COUNT_16",
  "SAMPLE_COUNT_12",
  "SAMPLE_COUNT_8",
  "SAMPLE_COUNT_6",
  "SAMPLE_COUNT_4"
]);

/** sizeof( CortaoPerObjectData ) (`Tr2SSAO.h:59-86`). */
const CORTAO_PER_OBJECT_DATA_SIZE = 176;

/** The kernels' thread-group edges (`Tr2SSAO.cpp:675, 680, 689`). */
const PACK_WORK_GROUP_SIZE = 8;
const MAIN_PASS_WORK_GROUP_SIZE = 16;
const BLUR_WORK_GROUP_SIZE = 8;

/** Carbon's float literal for 2π (`Tr2SSAO.cpp:617`). */
const TWO_PI = 6.283185307179586476925286766559;

/** Every CORTAO target is computed into and then sampled. */
const CORTAO_USAGE = Tr2GpuUsage.UNORDERED_ACCESS | Tr2GpuUsage.SHADER_RESOURCE;

/** Carbon's file-local DispatchSize (`Tr2SSAO.cpp:42-45`): groups covering a size. */
function DispatchSize(tileSize, totalSize)
{
  return Math.floor((totalSize + tileSize - 1) / tileSize);
}

/**
 * Carbon's SSAO: its authored settings and quality controls, and the CORTAO
 * filter that turns the depth and normal maps into the SSAOMap.
 *
 * Carbon has two filters. CORTAO is the one it runs (`m_cortaoEnabled` is set
 * in the constructor, `Tr2SSAO.cpp:20`) and the one ported here; CACAO
 * (`PerformPass`, AMD's FidelityFX CACAO) is not.
 */
@type.define({ className: "Tr2SSAO", family: "trinityCore" })
export class Tr2SSAO extends CjsModel
{
  @edit.notify
  @edit.readwrite
  @type.int32
  @type.enum("trinity.SSAOQuality")
  quality = SSAOQuality.HIGHEST;

  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.boolean
  cortaoBentNormal = true;

  @edit.readwrite
  @edit.persist
  @type.float32
  zoomLevel = 5;

  @edit.readwrite
  @edit.persist
  @type.float32
  shadowClamp = 0.98;

  @edit.readwrite
  @edit.persist
  @type.float32
  shadowPower = 2.6;

  @edit.readwrite
  @edit.persist
  @type.float32
  shadowMultiplier = 1;

  @edit.notify
  @edit.readwrite
  @type.boolean
  cortaoBlur = true;

  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.boolean
  cortaoEnabled = true;

  @edit.readwrite
  @edit.persist
  @type.float32
  sharpness = 0.5;

  @edit.readwrite
  @type.boolean
  enabled = true;

  @edit.notify
  @edit.readwrite
  @type.float32
  cortaoMipBias = -4;

  @edit.notify
  @edit.readwrite
  @type.float32
  cortaoMaxBlockerSearchRadius = 0.25;

  @edit.notify
  @edit.readwrite
  @type.float32
  cortaoRadius = 1e10;

  @edit.notify
  @edit.readwrite
  @type.float32
  cortaoStrength = 1;

  @edit.notify
  @edit.readwrite
  @type.boolean
  downsampled = false;

  @edit.readwrite
  @edit.persist
  @type.float32
  radius = 6;

  /** Enables or disables Carbon's detail SSAO layer. */
  @carbon.method
  @impl.implemented
  Enable(enable)
  {
    this.enabled = Boolean(enable);
  }

  /** Selects the detail-layer quality and resolution policy. */
  @carbon.method
  @impl.implemented
  SetQuality(quality, downsampled)
  {
    this.quality = quality;
    this.downsampled = Boolean(downsampled);
  }

  /** m_cortaoInitialized: CORTAO's effects and table are made on first use. */
  _cortaoInitialized = false;

  /** m_cortaoEffect: the Pack and MainPass kernels. */
  _cortaoEffect = null;

  /** m_cortaoBlurEffect: the two-pass (or temporal) blur. */
  _cortaoBlurEffect = null;

  /** m_cortaoLookupTable: the occlusion lookup, a 3D R16_UNORM texture. */
  _cortaoLookupTable = null;

  /** m_cortaoConstantBuffer: CortaoPerObjectData. */
  _cortaoConstantBuffer = null;

  /**
   * m_cortaoRandSeeds. Carbon never initialises them (`Tr2SSAO.h:113`), so
   * a non-temporal frame reads whatever the allocation held; zero here.
   */
  _cortaoRandSeeds = new Uint32Array(4);

  /**
   * Filters the depth and normal maps into the SSAO texture, or answers an
   * empty handle when the detail layer is disabled (`Tr2SSAO.cpp:84-123`).
   *
   * CORTAO's effects and lookup table are made on the first call, as Carbon's
   * are. Carbon's GPU regions are not ported.
   *
   * @param {object} depthBuffer The scene depth, a `Tr2TextureAL`.
   * @param {object} normalBuffer The depth pass's normal map, a `Tr2TextureAL`.
   * @param {object} gpuResourcePool The driver's `Tr2GpuResourcePool`.
   * @param {object} renderContext The render context.
   * @param {boolean} temporal Whether a temporal pass (TAA or a temporal
   *   upscaler) follows, which reseeds the sampling every frame.
   * @returns {GpuResourceHandle} The SSAO texture, or an empty handle.
   * @throws {Error} When CORTAO is off: the CACAO path is not ported.
   */
  @carbon.method
  @impl.adapted
  Filter(depthBuffer, normalBuffer, gpuResourcePool, renderContext, temporal)
  {
    if (!this.enabled) return new GpuResourceHandle();

    if (!this.cortaoEnabled)
    {
      throw new Error("Tr2SSAO.Filter: the CACAO path (PerformPass) is not ported; CORTAO is.");
    }

    if (!this._cortaoInitialized)
    {
      this._cortaoEffect = new Tr2Effect();
      this._cortaoEffect.SetEffectPathName(CORTAO_EFFECT_PATH);

      this._cortaoBlurEffect = new Tr2Effect();
      this._cortaoBlurEffect.SetEffectPathName(CORTAO_BLUR_EFFECT_PATH);

      this._cortaoLookupTable = blue.resMan.GetResource(CORTAO_LOOKUP_TABLE_PATH, { requirement: ResourceRequirement.TEXTURE });

      this._cortaoInitialized = true;
    }

    return this.ComputeCORTAO(depthBuffer, normalBuffer, gpuResourcePool, renderContext, temporal);
  }

  /**
   * Carbon's private ComputeCORTAO (`Tr2SSAO.cpp:540-714`): packs depth and
   * normals into a mipped R32_FLOAT texture, runs the main pass into the
   * output, and blurs it twice through a second target.
   *
   * The pool textures Carbon holds as locals (the packed buffer, the blur
   * buffer) are freed before returning; the output is the caller's.
   *
   * Adapted in three places. The constants bind at `PER_OBJECT_VS`, the value
   * of Carbon's static `Tr2Renderer::GetPerObjectVSStartRegister()`, which is
   * an instance method here. The view, projection and clip planes come from
   * the render context, which holds Tr2Renderer's camera state in this
   * runtime. Carbon's GPU regions are not ported.
   *
   * @param {object} depthBuffer The scene depth.
   * @param {object} normalBuffer The normal map.
   * @param {object} gpuResourcePool The driver's pool.
   * @param {object} renderContext The render context.
   * @param {boolean} temporal Whether to reseed and blur temporally.
   * @returns {GpuResourceHandle} The SSAO texture, or an empty handle.
   */
  @carbon.method
  @impl.adapted
  ComputeCORTAO(depthBuffer, normalBuffer, gpuResourcePool, renderContext, temporal)
  {
    const width = depthBuffer.GetWidth();
    const height = depthBuffer.GetHeight();

    // One mip per halving while the larger side stays at least 32, up to 8.
    let mipLevels = 1;
    let res = Math.max(width, height);

    for (; mipLevels < 8; mipLevels++)
    {
      res = Math.floor(res / 2);
      if (res < 32) break;
    }

    const packedBuffer = gpuResourcePool.GetTempTexture("cortao_packed", this._Target(width, height, mipLevels, PixelFormat.PIXEL_FORMAT_R32_FLOAT));
    const packed = packedBuffer.Get();

    try
    {
      if (!this._cortaoConstantBuffer?.IsValid())
      {
        this._cortaoConstantBuffer = renderContext.CreateConstantBuffer();
        if (Failed(this._cortaoConstantBuffer.Create(CORTAO_PER_OBJECT_DATA_SIZE, Tr2ConstantUsageAL.REUSABLE, null, renderContext)))
        {
          return new GpuResourceHandle();
        }
      }

      const { result, data } = this._cortaoConstantBuffer.Lock(renderContext);

      if (Failed(result) || !data) return new GpuResourceHandle();

      this._FillCortaoPerObjectData(new DataView(data.buffer, data.byteOffset, CORTAO_PER_OBJECT_DATA_SIZE), width, height, packed.GetMipCount(), temporal, renderContext);

      if (Failed(this._cortaoConstantBuffer.Unlock(renderContext))) return new GpuResourceHandle();
      if (!renderContext.SetConstants(this._cortaoConstantBuffer, ShaderType.COMPUTE_SHADER, PER_OBJECT_VS)) return new GpuResourceHandle();

      const outputFormat = this.cortaoBentNormal ? PixelFormat.PIXEL_FORMAT_R8G8B8A8_SNORM : PixelFormat.PIXEL_FORMAT_R8_UNORM;
      const outputTarget = gpuResourcePool.GetTempTexture("cortao_output", this._Target(width, height, 1, outputFormat));
      const output = outputTarget.Get();
      const bentNormal = this.cortaoBentNormal ? "BENT_NORMAL_ENABLED" : "BENT_NORMAL_DISABLED";
      const cortao = this._cortaoEffect;

      cortao.SetOption("SAMPLE_COUNT", SAMPLE_COUNTS[this.quality]);
      cortao.SetOption("BENT_NORMAL", bentNormal);

      cortao.SetParameter("NormalBuffer", normalBuffer);
      cortao.SetParameter("DepthBuffer", depthBuffer);

      // Every mip slot is set, "to ensure no warnings produced by unset
      // resources" (Tr2SSAO.cpp:659-665); past the last mip they repeat it.
      for (let i = 0; i < 8; i++)
      {
        cortao.SetParameter(`PackedOutputBuffer${i}`, packed, Math.min(i, packed.GetMipCount() - 1));
      }

      cortao.SetParameter("PackedBuffer", packed);
      cortao.SetParameter("LookupTable", this._cortaoLookupTable);
      cortao.SetParameter("OutputBuffer", output);

      Tr2Renderer.runComputeShader(cortao, "Pack", DispatchSize(PACK_WORK_GROUP_SIZE, width), DispatchSize(PACK_WORK_GROUP_SIZE, height), 1, renderContext);
      Tr2Renderer.runComputeShader(cortao, "MainPass", DispatchSize(MAIN_PASS_WORK_GROUP_SIZE, width), DispatchSize(MAIN_PASS_WORK_GROUP_SIZE, height), 1, renderContext);

      if (this.cortaoBlur)
      {
        const blurBuffer = gpuResourcePool.GetTempTexture("cortao_blur", this._Target(width, height, 1, outputFormat));
        const blur = this._cortaoBlurEffect;
        const groupsX = DispatchSize(BLUR_WORK_GROUP_SIZE, width);
        const groupsY = DispatchSize(BLUR_WORK_GROUP_SIZE, height);

        try
        {
          blur.SetParameter("PackedDataBuffer", packed);
          blur.SetOption("BENT_NORMAL", bentNormal);

          blur.SetOption("MODE", temporal ? "MODE_TEMPORAL" : "MODE_PASS1");
          blur.SetParameter("SSAOInputBuffer", output);
          blur.SetParameter("SSAOOutputBuffer", blurBuffer.Get());
          Tr2Renderer.runComputeShader(blur, "Blur", groupsX, groupsY, 1, renderContext);

          blur.SetOption("MODE", temporal ? "MODE_TEMPORAL" : "MODE_PASS2");
          blur.SetParameter("SSAOInputBuffer", blurBuffer.Get());
          blur.SetParameter("SSAOOutputBuffer", output);
          Tr2Renderer.runComputeShader(blur, "Blur", groupsX, groupsY, 1, renderContext);
        }
        finally
        {
          gpuResourcePool.Free(blurBuffer);
        }
      }

      return outputTarget;
    }
    finally
    {
      gpuResourcePool.Free(packedBuffer);
    }
  }

  /**
   * Fills CortaoPerObjectData (`Tr2SSAO.h:59-86`) as Carbon's lock block does
   * (`Tr2SSAO.cpp:569-636`).
   *
   * Carbon's `_rc` is element `(r - 1) * 4 + (c - 1)` here: the row-major and
   * column-major byte layouts coincide. Near and far are read from the back
   * and front clip, as Carbon reads them (`Tr2SSAO.cpp:575-576`); with
   * Tr2Renderer's clip derivation (`Tr2Renderer.cpp:81-82`) that hands the
   * shader far as "near" and near as "far", which is what linearises a
   * reversed depth buffer.
   *
   * @param {DataView} view The locked buffer.
   * @param {number} width Render width.
   * @param {number} height Render height.
   * @param {number} mipCount The packed buffer's mip count.
   * @param {boolean} temporal Whether to reseed.
   * @param {object} renderContext The context holding the view and projection.
   */
  _FillCortaoPerObjectData(view, width, height, mipCount, temporal, renderContext)
  {
    const viewMatrix = renderContext.GetViewTransform();
    const projection = renderContext.GetProjection();
    const inverseProjection = mat4.invert(mat4.create(), projection);

    // Tr2Renderer's UpdateProjectionParameters (Tr2Renderer.cpp:81-82).
    const frontClip = projection[10] ? projection[14] / projection[10] : 0;
    const backClip = projection[14] / (1 + projection[10]);
    const nearPlane = Math.fround(backClip);
    const farPlane = Math.fround(frontClip);

    const floats = (offset, ...values) => values.forEach((value, index) => view.setFloat32(offset + index * 4, value, true));
    const uints = (offset, ...values) => values.forEach((value, index) => view.setUint32(offset + index * 4, value >>> 0, true));

    // resolution
    floats(0, width, height, 1 / width, 1 / height);

    // projectionParams
    floats(16,
      0.5 * projection[0],
      -0.5 * projection[5],
      -0.5 + projection[8] * 0.5,
      -0.5 + projection[9] * -0.5);

    // unprojectParams
    floats(32,
      2 * inverseProjection[0],
      -2 * inverseProjection[5],
      -inverseProjection[0] + inverseProjection[12],
      inverseProjection[5] - inverseProjection[13]);

    // depthParams, radius, normalBias
    floats(48,
      (nearPlane - farPlane) / (nearPlane * farPlane),
      1 / nearPlane,
      this.cortaoRadius,
      inverseProjection[0] * Math.SQRT2 / width);

    const maxApparentCircleRadius = this.cortaoMaxBlockerSearchRadius * 2 * Math.min(inverseProjection[0], inverseProjection[5]);
    const circleBias = Math.log2(projection[0] * width * 0.5);

    // maxApparentCircleRadiusCoefficient, mipBias, radiusMultiplier, lookupOccluderRadiusScale
    floats(64,
      maxApparentCircleRadius / Math.sqrt(maxApparentCircleRadius * maxApparentCircleRadius + 1),
      this.cortaoMipBias + circleBias,
      this.cortaoStrength,
      1);

    // Carbon adds the C runtime's rand(), 0..RAND_MAX (32767 on MSVC).
    if (temporal)
    {
      for (let i = 0; i < 4; i++)
      {
        this._cortaoRandSeeds[i] = Tr2SSAO.hash(this._cortaoRandSeeds[i] + Math.floor(Math.random() * 32768));
      }
    }

    // randomVectorSeedX, randomVectorSeedY, randomAngleOffset, inverseMaxSlopeWeight
    uints(80, this._cortaoRandSeeds[0], this._cortaoRandSeeds[1]);
    floats(88,
      Math.fround(TWO_PI / Math.fround(0xFFFFFFFF)) * Math.fround(this._cortaoRandSeeds[2]),
      1 / 5);

    // The view without its translation, after a bias taking [0, 1] to
    // [-1, +1]. Carbon's row-vector `biasMatrix * normalMatrix`, with
    // biasMatrix = ScalingMatrix( 2 ) * TranslationMatrix( -1 ), is gl-matrix's
    // `normalMatrix * biasMatrix`; the same bytes, then transposed.
    const normalMatrix = mat4.copy(mat4.create(), viewMatrix);

    normalMatrix[12] = 0;
    normalMatrix[13] = 0;
    normalMatrix[14] = 0;

    const biasMatrix = mat4.fromValues(
      2, 0, 0, 0,
      0, 2, 0, 0,
      0, 0, 2, 0,
      -1, -1, -1, 1);
    const biased = mat4.multiply(mat4.create(), normalMatrix, biasMatrix);

    floats(96, ...mat4.transpose(biased, biased));

    // mipCount and the three padding words
    uints(160, mipCount, 0, 0, 0);
  }

  /** A CORTAO pool target: a 2D texture computed into and sampled. */
  _Target(width, height, mipCount, format)
  {
    return {
      type: TextureType.TEX_TYPE_2D,
      width,
      height,
      depth: 1,
      mipCount,
      format,
      gpuUsage: CORTAO_USAGE
    };
  }

  /**
   * Carbon Hash (Tr2SSAO.cpp:535): `n * (n ^ (n >> 15))` - the integer
   * bit-mix that decorrelates per-frame/per-pixel sampling. Static in
   * Carbon (a file-local-style helper on the class), uint32 wrap preserved
   * with imul.
   */
  static hash(n)
  {
    const value = n >>> 0;
    return Math.imul(value, value ^ (value >>> 15)) >>> 0;
  }

  static SSAOQuality = SSAOQuality;

}

// Carbon's chooser lists the qualities lowest first.
blue.enums.RegisterEnum("trinity.SSAOQuality", SSAOQuality, {
  source: "trinity/trinity/Tr2SSAO.h", family: "postProcess", line: 9,
  exposedName: "SSAOQuality", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooserSource: "trinity/trinity/Tr2SSAO_Blue.cpp:8",
  chooser: [
    { name: "Lowest", value: SSAOQuality.LOWEST, description: "Lowest quality" },
    { name: "Low", value: SSAOQuality.LOW, description: "Low quality" },
    { name: "Medium", value: SSAOQuality.MEDIUM, description: "Medium quality" },
    { name: "High", value: SSAOQuality.HIGH, description: "High quality" },
    { name: "Highest", value: SSAOQuality.HIGHEST, description: "Highest (adaptive) quality" }
  ]
});
