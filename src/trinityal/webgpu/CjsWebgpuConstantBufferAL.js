// Source: trinity/trinityal/include/Tr2ConstantBufferAL.h
//   trinity/trinityal/metal/Tr2ConstantBufferALMetal.mm
//   trinity/trinityal/dx12/Tr2ConstantBufferALDx12.cpp
//
// A device-backed `Tr2ConstantBufferAL` for WebGPU - the type behind b0 and the
// per-object blocks, which until now only ever landed in `Tr2ConstantBufferALStub`'s
// shadow copy and reached no device.
//
// CARBON'S LOCK IS NOT A MAP. Metal's `Lock` returns a CPU allocation and
// invalidates an upload token (`Tr2ConstantBufferALMetal.mm:60-69`); `Unlock` is
// a no-op; the bytes are uploaded when the buffer is BOUND
// (`SetConstants` → `workQueue->SetConstants(..., m_token, ...)`, `:79-89`).
// DX12 is the same shape with `m_data` and a frame-number token
// (`Tr2ConstantBufferALDx12.cpp:49-84`). So this keeps a retained shadow, marks
// it dirty on Lock, and uploads on `Upload()`, which the render context calls
// when it binds the buffer for a draw. A buffer locked three times and drawn
// once uploads once.
//
// FIELDS ARE PUBLIC AND CARBON-NAMED, for the reason recorded on
// `CjsWebgpuShaderAL`: Carbon's impl class carries public state.
import { ALResult, Tr2ALMemoryType, Tr2ConstantUsageAL } from "#trinityal";


/**
 * WebGPU's uniform-buffer size granularity.
 *
 * `minBindingSize` in every layout this backend reads is a multiple of 16
 * (`carbonEffectBackendBlock.js` derives it from `array<vec4<f32>, N>`), so a
 * buffer bound to it must be at least that long. Carbon's stub rounds its
 * mirror the same way.
 */
const ALIGNMENT = 16;

let nextConstantBufferId = 1;


export class CjsWebgpuConstantBufferAL
{
  /** m_shadowCopy */
  m_shadowCopy = new Uint8Array(0);

  /** m_size, the REQUESTED size; the shadow and device buffer are aligned up. */
  m_size = 0;

  /** m_usage */
  m_usage = Tr2ConstantUsageAL.REUSABLE;

  /** The device-buffer handle from `CjsWebgpuDevice.CreateDeviceBuffer`, or null. */
  m_handle = null;

  m_webgpu = null;

  /** m_token, as a flag: whether the shadow has bytes the device lacks. */
  m_dirty = false;

  /** A process-unique identity, for the context's bind-group cache. Zero until Create. */
  m_id = 0;

  /**
   * Creates the buffer.
   *
   * @param {number} size Bytes requested.
   * @param {number} usage A `Tr2ConstantUsageAL`.
   * @param {ArrayBufferView|null} initialData Initial contents, if any.
   * @param {object} renderContext The WebGPU render context AL.
   * @returns {number} An `ALResult` value.
   */
  Create(size, usage, initialData, renderContext)
  {
    this.Destroy();

    if (!renderContext || !renderContext.IsValid()) return ALResult.E_INVALIDARG;
    if (!Number.isInteger(size) || size <= 0) return ALResult.E_INVALIDARG;
    if (usage === Tr2ConstantUsageAL.IMMUTABLE && !initialData) return ALResult.E_INVALIDARG;

    const webgpu = renderContext.GetWebgpu();
    if (!webgpu) return ALResult.E_INVALIDCALL;

    const aligned = Math.ceil(size / ALIGNMENT) * ALIGNMENT;
    const usageFlags = webgpu.GetBufferUsage();

    if (!usageFlags || !Number.isInteger(usageFlags.UNIFORM)) return ALResult.E_INVALIDCALL;

    this.m_handle = webgpu.CreateDeviceBuffer({ label: "Tr2ConstantBufferAL", size: aligned, usage: usageFlags.UNIFORM });
    this.m_webgpu = webgpu;
    this.m_shadowCopy = new Uint8Array(this.m_handle.size);
    this.m_size = size;
    this.m_usage = usage;
    this.m_id = nextConstantBufferId;
    nextConstantBufferId += 1;

    if (initialData)
    {
      const bytes = new Uint8Array(initialData.buffer, initialData.byteOffset, initialData.byteLength);

      this.m_shadowCopy.set(bytes.subarray(0, Math.min(bytes.length, this.m_shadowCopy.length)));
      this.m_dirty = true;
      this.Upload();
    }

    return ALResult.S_OK;
  }

  /**
   * Hands back the shadow to write into, and marks it for upload.
   *
   * @param {object} [_renderContext] Unused; the device came from Create.
   * @returns {{result: number, data: Uint8Array|null}} The shadow.
   */
  Lock(_renderContext)
  {
    if (!this.IsValid()) return { result: ALResult.E_FAIL, data: null };

    this.m_dirty = true;

    return { result: ALResult.S_OK, data: this.m_shadowCopy };
  }

  /**
   * Carbon's is a no-op on Metal and a token bump on DX12; the upload waits
   * for the bind.
   *
   * @returns {number} `S_OK`.
   */
  Unlock(_renderContext)
  {
    return ALResult.S_OK;
  }

  /**
   * Uploads the shadow if anything changed since the last upload.
   *
   * The render context calls this when it binds the buffer for a draw, which
   * is where Carbon's token is consumed.
   *
   * @returns {boolean} Whether bytes were written.
   */
  Upload()
  {
    if (!this.IsValid() || !this.m_dirty) return false;

    this.m_webgpu.WriteDeviceBuffer(this.m_handle, this.m_shadowCopy);
    this.m_dirty = false;

    return true;
  }

  /** The `GPUBuffer`, for a bind group. @returns {object|null} */
  GetDeviceBuffer()
  {
    return this.m_handle ? this.m_webgpu.GetDeviceBuffer(this.m_handle) : null;
  }

  IsValid()
  {
    return this.m_handle !== null;
  }

  /** The requested size, as Carbon's `GetSize` reports it. */
  GetSize()
  {
    return this.m_size;
  }

  Destroy()
  {
    if (this.m_handle) this.m_handle.Destroy();

    this.m_handle = null;
    this.m_webgpu = null;
    this.m_shadowCopy = new Uint8Array(0);
    this.m_size = 0;
    this.m_dirty = false;
    this.m_id = 0;
  }

  /**
   * Binds this buffer at one stage and register, uploading first.
   *
   * Metal's context delegates to the buffer for this
   * (`Tr2RenderContextMetal.mm:664-677` → `Tr2ConstantBufferALMetal.mm:79-89`),
   * which hands the work queue the bytes and the token. Here the token is
   * consumed - the shadow is uploaded if it changed - and the context records
   * the binding for the draw.
   *
   * @param {number} shaderType A `ShaderType`.
   * @param {number} constantIndex The constant-buffer register.
   * @param {object} renderContext The render context AL to bind on.
   * @returns {number} An `ALResult` value.
   */
  SetConstants(shaderType, constantIndex, renderContext)
  {
    if (!this.IsValid()) return ALResult.E_INVALIDCALL;

    this.Upload();

    return renderContext.SetConstants(this, shaderType, constantIndex) ? ALResult.S_OK : ALResult.E_INVALIDARG;
  }

  GetMemoryClass()
  {
    return Tr2ALMemoryType.AL_MEMORY_MANAGED;
  }

  /**
   * Fills in a device-resource description.
   *
   * @param {object} description The description to fill.
   * @returns {object} The description, filled.
   */
  Describe(description)
  {
    if (!description) return description;

    description.memoryClass = this.GetMemoryClass();
    description.size = this.m_shadowCopy.length;

    return description;
  }

  /**
   * @param {string} name The label.
   * @returns {number} `S_OK`.
   */
  SetName(name)
  {
    const buffer = this.GetDeviceBuffer();

    if (buffer) buffer.label = String(name);

    return ALResult.S_OK;
  }
}
