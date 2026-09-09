// Source: trinity/trinityal/metal/Tr2CapsALMetal.h
// Source: trinity/trinityal/stub/Tr2CapsALStub.h
//
// What the WebGPU backend says it can do.
//
// Carbon's caps object is six questions a caller BRANCHES on, so answering them
// wrongly sends Trinity down a path this device never takes - which is why the
// stub answers "yes" to four of its ten platform constants rather than denying
// everything. These are WebGPU's answers, each one decided against the spec's
// baseline guarantees rather than against a particular adapter, EXCEPT
// `SupportsFloat16`, which is an optional feature and is therefore asked of the
// device when there is one.

/**
 * The platform capability constants, WebGPU's answers.
 *
 * The stub's equivalent is `Tr2StubPlatformCaps`, and this table said yes to
 * three things the stub says no to. Two of them were wrong, and the reason is
 * worth keeping because it is easy to make again:
 *
 * **A CAP DESCRIBES THIS BACKEND, NOT THE API IT IS BUILT ON.** "Storage
 * buffers are core WebGPU" is true and answers a different question than
 * "can this backend honour a caller that takes the unordered-access branch".
 * A caller reads a cap to decide, and a cap is the LAST place that can say no -
 * after it, the caller is committed and the refusals it meets have no branch to
 * take. Both corrected entries are commented where they sit.
 *
 * What still differs from the stub, and holds: buffer shader resources, and the
 * platform not being declared low-performance, because a caller uses that to
 * pick reduced paths and a GPU is doing this work.
 */
export const CjsWebgpuPlatformCaps = Object.freeze({
  SUPPORTS_BUFFER_SHADER_RESOURCES: true,

  SUPPORTS_BUFFER_COUNTERS: false,

  // FALSE, AND IT SAID TRUE FOR A DAY. The argument was "storage buffers and
  // storage textures are core WebGPU" - true of the API, and the wrong question.
  // A cap describes WHAT THIS BACKEND CAN DO, and today `ClearUav` refuses,
  // nothing dispatches compute, and `CjsWebgpuDevice` fails any binding
  // visibility that is not vertex or fragment. Carbon's own stub denies this one
  // (`stub/Tr2CapsALStub.h:10`) while claiming compute, and a caller taking the
  // UAV branch would meet three refusals in a row - with the cap being the last
  // place that could have said no.
  SUPPORTS_UNORDERED_ACCESS: false,

  // Carbon's stub claims compute too. The dispatch verbs refuse here exactly as
  // they do there, so this promises no more than the stub does.
  SUPPORTS_COMPUTE: true,

  SUPPORTS_TEXTURE_ARRAYS: true,

  // Real: the render target creates the multisample attachment and sets a
  // resolve target (`core/renderTarget.js:388-407`, `:303`).
  SUPPORTS_MSAA_SAMPLE: true,

  // FALSE for the same reason as unordered access. Carbon's callers DELETE
  // their explicit clears under this cap (`Tr2ReflectionProbe.cpp:128-138`,
  // `EveSpaceScene.cpp:2312`), and this backend honours only the first colour
  // slot's load action and the depth load action: every store action is dropped,
  // colour slots 1-7 are ignored, and the pass descriptor is always built from
  // the canvas rather than from what `SetRenderTarget` bound. A caller that
  // trusted this and dropped its clear would get no clear on anything else.
  SUPPORTS_RENDER_PASS_HINTS: false,

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

}
