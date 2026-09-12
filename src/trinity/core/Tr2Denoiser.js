// Source: trinity/trinity/Tr2Denoiser.h
//   trinity/trinity/Tr2Denoiser.cpp
//
// A separable spatial denoiser, run over a noisy single-channel buffer - in
// practice the screen-space shadow factor, which is why Tr2ShadowMap owns one.
//
// FOUR PASSES, AND THE ORDER IS THE ALGORITHM. Estimate how noisy the source is;
// turn that into a per-pixel denoising strength; blur horizontally; blur
// vertically. The two blur passes share one effect FILE and differ only by an
// `Axis` parameter, which is what makes the filter separable and why there are
// two effect instances rather than one used twice - each carries its own axis
// and its own NORMALS_INPUT option.
//
// EDGES ARE PRESERVED BY WEIGHTING, NOT BY BRANCHING. Depth, normal and plane
// weights decide how much a neighbouring sample counts, so the blur stops at a
// geometric edge instead of smearing across it. That is why it needs the depth
// buffer and the reversed-depth projection, and why a normals buffer is optional
// rather than required - without one the effect takes its NONE permutation.
//
// WHAT IT CANNOT DO YET, stated plainly because the structure is complete and
// the output is not: nothing loads the four effects. Each is constructed with
// its res: path exactly as Carbon does, and Carbon loads them elsewhere too -
// the constructor only names them. Until a resource manager resolves those
// paths the passes run and draw nothing, which is the same state every other
// effect-driven path in this runtime is in.
import { carbon, impl, io, type } from "#schema";
import { CjsModel } from "#model";
import { vec2 } from "#math/vec2";
import { vec4 } from "#math/vec4";
import { Tr2Effect } from "../shader/Tr2Effect.js";
import { PixelFormat, TextureType, Tr2GpuUsage } from "#consts/render-context";
import { RenderingMode } from "#consts/graphics";
import { Tr2LoadAction, Tr2StoreAction } from "#consts/render-context";
import { Tr2ColorAttachment } from "../../trinityal/Tr2RenderPassAL/Tr2ColorAttachment.js";

/** Carbon's four effect paths (`Tr2Denoiser.cpp:19-28`). */
const ESTIMATE_NOISE_PATH = "res:/graphics/effect/managed/space/system/EstimateNoise.fx";
const DENOISE_ESTIMATE_PATH = "res:/graphics/effect/managed/space/system/DenoiseEstimate.fx";
const DENOISE_1D_PATH = "res:/graphics/effect/managed/space/system/Denoise1D.fx";

/** Carbon's shader option and its two values (`cpp:33-35`). */
const NORMALS_INPUT = "NORMALS_INPUT";
const NORMALS_INPUT_NORMALS = "NORMALS_INPUT_NORMALS";
const NORMALS_INPUT_NONE = "NORMALS_INPUT_NONE";

/**
 * Carbon's hint for every one of the four passes (`cpp:107` and after):
 * DONT_CARE the previous contents, STORE the result.
 *
 * DONT_CARE is not "clear". It says the old contents are not needed, which is
 * what lets a tiler skip loading them; clearing would cost a write instead.
 * Every pass here overwrites its whole target, so the load is always wasted.
 */
const OVERWRITE_AND_KEEP = new Tr2ColorAttachment(Tr2LoadAction.DONT_CARE, Tr2StoreAction.STORE);

/** Every pass target is R8, and every one is both drawn to and sampled from. */
const TARGET_USAGE = Tr2GpuUsage.RENDER_TARGET | Tr2GpuUsage.SHADER_RESOURCE;

/** Builds one effect already pointed at its path, as Carbon's constructor does. */
function effectAt(path)
{
  const effect = new Tr2Effect();

  effect.SetEffectPathName(path);
  return effect;
}

/** Carries depth, normal, and plane weights together with radius, step size, and bypass state for spatial denoising. */
@type.define({ className: "Tr2Denoiser", family: "trinityCore", purpose: "Carries depth, normal, and plane weights together with radius, step size, and bypass state for spatial denoising." })
export class Tr2Denoiser extends CjsModel
{

  /** m_bypass (bool) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.boolean
  bypass = false;

  /** m_depthWeight (float) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.float32
  depthWeight = 100;

  /** m_normalWeight (float) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.float32
  normalWeight = 1.5;

  /** m_planeWeight (float) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.float32
  planeWeight = 0;

  /** m_radius (uint32_t) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.uint32
  radius = 5;

  /** m_stepSize (uint32_t) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.uint32
  stepSize = 1;

  /** m_estimateNoise */
  #estimateNoise = effectAt(ESTIMATE_NOISE_PATH);

  /** m_denoiseEstimate */
  #denoiseEstimate = effectAt(DENOISE_ESTIMATE_PATH);

  /** m_denoiseHoriz - Denoise1D with Axis (stepSize, 0). */
  #denoiseHoriz = effectAt(DENOISE_1D_PATH);

  /** m_denoiseVert - the SAME effect file with Axis (0, stepSize). */
  #denoiseVert = effectAt(DENOISE_1D_PATH);

  /**
   * m_parametersDirty - set by OnModified, cleared at the end of Apply.
   *
   * The weights and the axis are only re-sent when something changed, which is
   * the one place this class caches anything.
   */
  #parametersDirty = true;

  /**
   * Runs the four passes and returns the denoised result.
   *
   * Carbon `Apply` (`cpp:59-162`). The one-argument overload is the `index = 0`
   * default here (`cpp:54-57`).
   *
   * INVALID IN, EMPTY OUT. A source or depth that is not valid returns null
   * rather than borrowing four textures to produce nothing.
   *
   * @param {object} source The noisy texture, as a pool handle.
   * @param {object} depth The scene depth buffer.
   * @param {object|null} normals Optional normals; absence selects a permutation.
   * @param {Array<number>} projection The REVERSED-depth projection.
   * @param {number} upscaling Divides the radius, so an upscaled pass blurs less.
   * @param {object} gpuResourcePool The pool the pass targets come from.
   * @param {object} renderContext The context to draw through.
   * @param {object} renderer The renderer owning the blitter.
   * @param {number} [index] Array slice of the result to render into.
   * @returns {object|null} The result handle, or null.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon reaches the blitter through the static Tr2Renderer; ours is an instance, so the renderer is passed in like the pool and the context.")
  Apply(source, depth, normals, projection, upscaling, gpuResourcePool, renderContext, renderer, index = 0)
  {
    // Carbon tests the HANDLE, not the texture behind it (`cpp:61`).
    if (!source.IsValid() || !depth.IsValid()) return null;

    const sourceTexture = source.Get();
    // Carbon is handed a default-constructed Tr2TextureAL when there are no
    // normals - a real object. Ours is handed null, so the object may be
    // absent; the METHOD is not optional.
    const hasNormals = Boolean(normals && normals.IsValid());
    const option = hasNormals ? NORMALS_INPUT_NORMALS : NORMALS_INPUT_NONE;

    this.#denoiseVert.SetOption(NORMALS_INPUT, option);
    this.#denoiseHoriz.SetOption(NORMALS_INPUT, option);

    const width = sourceTexture.GetWidth();
    const height = sourceTexture.GetHeight();
    const sourceSize = vec4.fromValues(width, height, 1 / width, 1 / height);

    this.#denoiseEstimate.SetParameter("SourceDimensions", sourceSize);

    const esm = renderContext.GetEffectStateManager();

    // Null is Carbon's default-constructed texture: bind EMPTY, do not merely
    // save. A depth buffer left bound would depth-test a fullscreen blur.
    esm.PushDepthStencilBuffer(null);
    esm.PushRenderTarget();

    try
    {
      esm.ApplyStandardStates(RenderingMode.RM_FULLSCREEN);

      const estimate = this.#Pass(gpuResourcePool, "Tr2Denoiser Noise Estimate", width, height);

      esm.SetRenderTarget(0, estimate.Get());
      renderContext.RenderPassHint(OVERWRITE_AND_KEEP, null);
      this.#estimateNoise.SetParameter("Source", sourceTexture);
      renderer.DrawScreenQuad(renderContext, this.#estimateNoise);
      this.#estimateNoise.SetParameter("Source", null);

      const mask = this.#Pass(gpuResourcePool, "Tr2Denoiser Denoise Mask", width, height);

      this.#denoiseEstimate.SetParameter("Source", estimate.Get());
      esm.SetRenderTarget(0, mask.Get());
      renderContext.RenderPassHint(OVERWRITE_AND_KEEP, null);
      renderer.DrawScreenQuad(renderContext, this.#denoiseEstimate);

      // Carbon releases the estimate here, before borrowing the next target, so
      // the pool can hand the same surface back rather than grow (`cpp:118`).
      gpuResourcePool.Free(estimate);

      const temp = this.#Pass(gpuResourcePool, "Tr2Denoiser Temp", width, height);

      this.#SetPassParameters(this.#denoiseHoriz, vec2.fromValues(1, 0), depth, normals, projection, sourceSize, upscaling);
      this.#denoiseHoriz.SetParameter("Source", sourceTexture);
      this.#denoiseHoriz.SetParameter("NoiseEstimate", mask.Get());
      esm.SetRenderTarget(0, temp.Get());
      renderContext.RenderPassHint(OVERWRITE_AND_KEEP, null);
      renderer.DrawScreenQuad(renderContext, this.#denoiseHoriz);
      this.#denoiseHoriz.SetParameter("Source", null);
      this.#denoiseHoriz.SetParameter("NoiseEstimate", null);

      gpuResourcePool.Free(source);

      const result = this.#Pass(gpuResourcePool, "Tr2Denoiser Result", width, height);

      this.#SetPassParameters(this.#denoiseVert, vec2.fromValues(0, 1), depth, normals, projection, sourceSize, upscaling);
      this.#denoiseVert.SetParameter("Source", temp.Get());
      this.#denoiseVert.SetParameter("NoiseEstimate", mask.Get());
      esm.SetRenderTarget(0, result.Get(), true, index);
      renderContext.RenderPassHint(OVERWRITE_AND_KEEP, null);
      renderer.DrawScreenQuad(renderContext, this.#denoiseVert);
      this.#denoiseVert.SetParameter("Source", null);
      this.#denoiseVert.SetParameter("NoiseEstimate", null);

      // Both blur effects hold the depth and normal buffers until here, so a
      // later pass cannot inherit them (`cpp:155-158`).
      for (const effect of [ this.#denoiseHoriz, this.#denoiseVert ])
      {
        effect.SetParameter("DepthBuffer", null);
        effect.SetParameter("NormalBuffer", null);
      }

      this.#parametersDirty = false;
      return result;
    }
    finally
    {
      // Carbon pops through ON_BLOCK_EXIT, which runs however the block leaves.
      esm.PopRenderTarget();
      esm.PopDepthStencilBuffer();
    }
  }

  /**
   * Carbon `SetRadius` (`cpp:170-172`).
   *
   * @param {number} value The new radius.
   * @returns {void}
   */
  @carbon.method
  @impl.implemented
  SetRadius(value)
  {
    this.radius = value >>> 0;
    this.#parametersDirty = true;
  }

  /**
   * Carbon `OnModified` (`cpp:164-168`): any authored change re-sends the
   * weights on the next Apply.
   *
   * @returns {boolean} True, as Carbon's does.
   */
  @carbon.method
  @impl.implemented
  OnModified()
  {
    this.#parametersDirty = true;
    return true;
  }

  /** Borrows one R8 pass target of the source's size. */
  #Pass(gpuResourcePool, name, width, height)
  {
    return gpuResourcePool.GetTempTexture(name, {
      type: TextureType.TEX_TYPE_2D,
      width,
      height,
      depth: 1,
      mipCount: 1,
      format: PixelFormat.PIXEL_FORMAT_R8_UNORM,
      gpuUsage: TARGET_USAGE
    });
  }

  /**
   * Carbon's `SetParams` lambda (`cpp:76-94`).
   *
   * The weights and the axis are sent only when something changed; the radius,
   * projection and buffers go every time. Carbon draws that line and it is not
   * arbitrary - the axis is per effect and constant, the radius divides by an
   * upscaling factor the caller may vary per frame.
   */
  #SetPassParameters(effect, direction, depth, normals, projection, sourceSize, upscaling)
  {
    if (this.#parametersDirty)
    {
      effect.SetParameter("DepthWeight", this.depthWeight);
      effect.SetParameter("NormalWeight", this.normalWeight);
      effect.SetParameter("PlaneWeight", this.planeWeight);
      effect.SetParameter("PassThrough", this.bypass ? 1 : 0);
      effect.SetParameter("Axis", vec2.scale(vec2.create(), direction, this.stepSize));
    }

    // Carbon's `max(uint32_t(radius / upscaling + 0.5f), 2u)`: round to nearest,
    // and never below two, or the blur would sample only itself.
    effect.SetParameter("Radius", Math.max(Math.trunc(this.radius / upscaling + 0.5), 2));

    effect.SetParameter("ProjectionInv", projection);
    // Carbon's Vector2( projection._43, projection._33 ); column-major puts
    // those at 14 and 10.
    effect.SetParameter("ClipInfo", vec2.fromValues(projection[14], projection[10]));

    effect.SetParameter("DepthBuffer", depth);
    effect.SetParameter("NormalBuffer", normals);
    effect.SetParameter("SourceDimensions", sourceSize);
  }


}
