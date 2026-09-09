// Source: trinity/trinityal/metal/Tr2CapsALMetal.h
// Source: trinity/trinityal/stub/Tr2CapsALStub.h
//
// What the WebGPU backend says it can do.
//
// Carbon's caps object is six questions a caller BRANCHES on, so answering them
// wrongly sends Trinity down a path this device never takes - which is why the
// stub answers "yes" to five of its ten platform constants rather than denying
// everything. These are WebGPU's answers, each one decided against the spec's
// baseline guarantees rather than against a particular adapter, EXCEPT
// `SupportsFloat16`, which is an optional feature and is therefore asked of the
// device when there is one.

/**
 * The platform capability constants, WebGPU's answers.
 *
 * The stub's equivalent is `Tr2StubPlatformCaps`; the differences are the
 * interesting part:
 *
 * - buffer shader resources and unordered access are TRUE here and false there,
 *   because storage buffers and storage textures are core WebGPU;
 * - render-pass hints are TRUE, because a WebGPU render pass takes its load and
 *   store actions at pass creation and cannot change them afterwards - the hint
 *   is not an optimisation here, it is the only way to express a clear;
 * - the platform is not declared low-performance, because the caller uses that
 *   to pick reduced paths and a GPU is doing this work.
 */
export const CjsWebgpuPlatformCaps = Object.freeze({
  SUPPORTS_BUFFER_SHADER_RESOURCES: true,
  SUPPORTS_BUFFER_COUNTERS: false,
  SUPPORTS_UNORDERED_ACCESS: true,
  SUPPORTS_COMPUTE: true,
  SUPPORTS_TEXTURE_ARRAYS: true,
  SUPPORTS_MSAA_SAMPLE: true,
  SUPPORTS_RENDER_PASS_HINTS: true,
  IS_LOW_PERFORMANCE: false,
  /** WebGPU's guaranteed `maxUniformBufferBindingSize`, 64 KiB. */
  MAX_CONSTANT_BUFFER_SIZE: 64 * 1024,
  SUPPORTS_RAY_TRACING: false
});


/**
 * The capabilities the WebGPU backend reports.
 */
export class CjsWebgpuCapsAL
{
  #webgpu = null;

  /**
   * @param {object} [webgpu] The `CjsWebgpuDevice`, when one is composed.
   */
  constructor(webgpu = null)
  {
    this.#webgpu = webgpu ?? null;
  }

  /**
   * Whether half-precision floats are available in a shader.
   *
   * `shader-f16` is an OPTIONAL WebGPU feature, so this is the one answer that
   * cannot be decided from the spec. Without a device the answer is false: a
   * caller that emits f16 on a promise, against a device that turns out to lack
   * the feature, gets a shader that fails to compile rather than a slow one.
   *
   * @returns {boolean} Whether the device has `shader-f16`.
   */
  SupportsFloat16()
  {
    if (!this.#webgpu) return false;

    return this.#webgpu.GetDevice().features.has("shader-f16");
  }

  /**
   * Whether a shader can read a buffer resource.
   *
   * @returns {boolean} True; storage buffers are core WebGPU.
   */
  SupportsGpuBuffer()
  {
    return true;
  }

  /**
   * Whether the backend can create a swap chain of its own.
   *
   * FALSE, and not because it is unimplemented. The browser owns presentation:
   * a WebGPU surface is a canvas the page already has, configured with
   * `GPUCanvasContext.configure`, and the frame is shown when the turn ends.
   * There is no chain for Trinity to create, resize or flip.
   *
   * @returns {boolean} False.
   */
  SupportsStandaloneSwapChain()
  {
    return false;
  }

  /**
   * Whether a vertex shader can sample a texture.
   *
   * @returns {boolean} True; WebGPU binds textures to any stage.
   */
  SupportsVertexShaderTextures()
  {
    return true;
  }

  /**
   * Whether the display refresh rate varies.
   *
   * @returns {boolean} False; the page presents through
   *   `requestAnimationFrame` and is not told what the display is doing.
   */
  SupportsVariableRefreshRate()
  {
    return false;
  }

  /**
   * Whether hardware ray tracing is available.
   *
   * @returns {boolean} False; WebGPU has no ray-tracing pipeline.
   */
  SupportsRaytracing()
  {
    return false;
  }

  /**
   * The largest constant buffer that can be bound.
   *
   * @returns {number} The device's `maxUniformBufferBindingSize`, or WebGPU's
   *   guaranteed minimum when no device is composed.
   */
  GetMaxConstantBufferSize()
  {
    if (!this.#webgpu) return CjsWebgpuPlatformCaps.MAX_CONSTANT_BUFFER_SIZE;

    return this.#webgpu.GetDevice().limits.maxUniformBufferBindingSize;
  }
}
