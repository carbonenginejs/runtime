// Source: trinity/trinityal/include/Tr2ConstantBufferAL.h
//   trinity/trinityal/metal/Tr2ConstantBufferALMetal.mm
//   trinity/trinityal/dx12/Tr2ConstantBufferALDx12.cpp
//
// A `Tr2ConstantBufferAL` for WebGPU - the type behind b0 and the per-object
// blocks, which until 2026-09-10 only ever landed in `Tr2ConstantBufferALStub`'s
// shadow copy and reached no device.
//
// IT OWNS NO DEVICE BUFFER, AND NEITHER DOES METAL'S. Metal's constant buffer
// is a CPU allocation and a token (`Tr2ConstantBufferALMetal.mm:42`, `:60-69`):
// `Lock` hands back the allocation and invalidates the token, `Unlock` is a
// no-op, and `SetConstants` copies the bytes into the context's per-frame
// constant ARENA and binds `(page, offset)` (`MetalWorkQueue.mm:2396-2440`).
// A buffer locked three times and drawn three times therefore lands in three
// regions, and each draw reads its own. The first version of this class owned
// one `GPUBuffer` and `writeBuffer`'d into it, which is correct for a single
// draw and wrong for a frame: every draw read the LAST write.
//
// FIELDS ARE PUBLIC AND CARBON-NAMED, for the reason recorded on
// `CjsWebgpuShaderAL`: Carbon's impl class carries public state.
import { ALResult, Tr2ALMemoryType, Tr2ConstantUsageAL } from "#trinityal";
import { RenderContextALOf } from "../renderContextAL.js";


/**
 * The shadow's size granularity. Every uniform layout this backend reads has a
 * `minBindingSize` that is a multiple of 16 (`array<vec4<f32>, N>`), and
 * Carbon's stub rounds its mirror the same way.
 */
const ALIGNMENT = 16;

let nextConstantBufferId = 1;


export class CjsWebgpuConstantBufferAL
{
  /** m_shadowCopy */
  m_shadowCopy = new Uint8Array(0);

  /** m_size, the REQUESTED size; the shadow is aligned up. */
  m_size = 0;

  /** m_usage */
  m_usage = Tr2ConstantUsageAL.REUSABLE;

  /**
   * m_token: the arena region the shadow was last uploaded to, and for which
   * frame. `frame` is -1 after a Lock (Carbon's `Invalidate`), so the next bind
   * uploads again - to a NEW region.
   */
  m_token = { frame: -1, page: 0, offset: 0, size: 0 };

  /** A process-unique identity, for caches and diagnostics. Zero until Create. */
  m_id = 0;

  /**
   * Creates the buffer.
   *
   * @param {number} size Bytes requested.
   * @param {number} usage A `Tr2ConstantUsageAL`.
   * @param {ArrayBufferView|null} initialData Initial contents, if any.
   * @param {object} renderContext The render context, Trinity's or the AL.
   * @returns {number} An `ALResult` value.
   */
  Create(size, usage, initialData, renderContext)
  {
    this.Destroy();

    const al = RenderContextALOf(renderContext);

    if (!al || !al.IsValid()) return ALResult.E_INVALIDARG;
    if (!Number.isInteger(size) || size <= 0) return ALResult.E_INVALIDARG;
    if (usage === Tr2ConstantUsageAL.IMMUTABLE && !initialData) return ALResult.E_INVALIDARG;

    this.m_shadowCopy = new Uint8Array(Math.ceil(size / ALIGNMENT) * ALIGNMENT);
    this.m_size = size;
    this.m_usage = usage;
    this.m_id = nextConstantBufferId;
    nextConstantBufferId += 1;

    if (initialData)
    {
      const bytes = new Uint8Array(initialData.buffer, initialData.byteOffset, initialData.byteLength);

      this.m_shadowCopy.set(bytes.subarray(0, Math.min(bytes.length, this.m_shadowCopy.length)));
    }

    return ALResult.S_OK;
  }

  /**
   * Hands back the shadow to write into, and invalidates the token.
   *
   * @param {object} [_renderContext] Unused.
   * @returns {{result: number, data: Uint8Array|null}} The shadow.
   */
  Lock(_renderContext)
  {
    if (!this.IsValid()) return { result: ALResult.E_FAIL, data: null };

    this.m_token.frame = -1;

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
   * Metal's `UploadConstants` (`MetalWorkQueue.mm:2429-2439`): if the token is
   * not this frame's, copy the shadow into a fresh arena region and remember
   * where. Called by the render context when it binds the buffer for a draw.
   *
   * @param {object} arena The context's `CjsWebgpuConstantArena`.
   * @param {number} frame The recording frame number.
   * @param {number} [minimumSize] Bytes the binding layout demands at least.
   * @returns {{page: number, offset: number, size: number}} The bound region.
   */
  UploadConstants(arena, frame, minimumSize = 0)
  {
    const token = this.m_token;

    if (token.frame !== frame || token.size < minimumSize)
    {
      const region = arena.Allocate(this.m_shadowCopy, Math.max(this.m_shadowCopy.length, minimumSize));

      token.frame = frame;
      token.page = region.page;
      token.offset = region.offset;
      token.size = region.size;
    }

    return token;
  }

  /**
   * Binds this buffer at one stage and register.
   *
   * Metal's context delegates to the buffer for this
   * (`Tr2RenderContextMetal.mm:664-677` → `Tr2ConstantBufferALMetal.mm:79-89`);
   * the upload itself happens when the draw emits its bindings.
   *
   * @param {number} shaderType A `ShaderType`.
   * @param {number} constantIndex The constant-buffer register.
   * @param {object} renderContext The render context to bind on.
   * @returns {number} An `ALResult` value.
   */
  SetConstants(shaderType, constantIndex, renderContext)
  {
    if (!this.IsValid()) return ALResult.E_INVALIDCALL;

    const al = RenderContextALOf(renderContext);

    return al && al.SetConstants(this, shaderType, constantIndex) ? ALResult.S_OK : ALResult.E_INVALIDARG;
  }

  IsValid()
  {
    return this.m_shadowCopy.length !== 0;
  }

  /** The requested size, as Carbon's `GetSize` reports it. */
  GetSize()
  {
    return this.m_size;
  }

  Destroy()
  {
    this.m_shadowCopy = new Uint8Array(0);
    this.m_size = 0;
    this.m_token = { frame: -1, page: 0, offset: 0, size: 0 };
    this.m_id = 0;
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
   * Nothing device-side carries a label; the arena pages are shared.
   *
   * @returns {number} `S_OK`.
   */
  SetName(_name)
  {
    return ALResult.S_OK;
  }
}
