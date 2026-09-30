// Source: trinity/trinity/Tr2GpuStructuredBuffer.h
// Source: trinity/trinity/Tr2GpuStructuredBuffer.cpp
// Hand-maintained from Carbon source; promoted from generated/trinityCore.
import { carbon, impl, edit, type } from "#schema";
import { CjsModel } from "#model";
import { Tr2CpuUsage, Tr2GpuUsage } from "#consts/render-context";
import { ALResult, Tr2BufferDescriptionAL } from "#trinityal";

/** Describes the element count, stride, and creation flags of a GPU structured buffer. */
@type.define({ className: "Tr2GpuStructuredBuffer", family: "trinityCore", purpose: "Describes the element count, stride, and creation flags of a GPU structured buffer." })
export class Tr2GpuStructuredBuffer extends CjsModel
{

  /** Carbon's CreationFlag (Tr2GpuStructuredBuffer.h:30-36). */
  static CreationFlag = Object.freeze({ CPU_WRITABLE: 1, GPU_WRITABLE: 2 });

  /** m_creationFlags (CreationFlags) [READWRITE, PERSIST, NOTIFY] */
  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.uint32
  creationFlags = 0;

  /** m_count (uint32_t) [READWRITE, PERSIST, NOTIFY] */
  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.uint32
  count = 0;

  /** m_stride (uint32_t) [READWRITE, PERSIST, NOTIFY] */
  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.uint32
  stride = 0;

  /** m_name - debug label; not Blue-exposed. */
  _name = "";

  /** m_buffer: the AL buffer, null until CreateBuffer succeeds. */
  _buffer = null;

  /**
   * Carbon Create (cpp:78-84): records count, stride and flags, then builds
   * the AL buffer.
   *
   * The render context is an ADDED argument, as on Tr2GpuBuffer.Create:
   * Carbon's CreateBuffer reaches the main-thread context through
   * USE_MAIN_THREAD_RENDER_CONTEXT, and callers here hold their context.
   *
   * @param {number} count Element count.
   * @param {number} stride Bytes per element.
   * @param {number} creationFlags `Tr2GpuStructuredBuffer.CreationFlag` bits.
   * @param {Tr2RenderContext} renderContext The context to create on.
   * @returns {number} An `ALResult`.
   */
  @carbon.method
  @impl.adapted
  Create(count, stride, creationFlags, renderContext)
  {
    this.count = count;
    this.stride = stride;
    this.creationFlags = creationFlags;
    return this.CreateBuffer(renderContext);
  }

  /**
   * Carbon CreateBuffer (cpp:118-149): SHADER_RESOURCE always, plus
   * UNORDERED_ACCESS when GPU-writable; CPU READ, or WRITE_OFTEN when
   * CPU-writable. A zero count or stride refuses and keeps the current
   * buffer; a failed create leaves none.
   *
   * @param {Tr2RenderContext} renderContext The context to create on.
   * @returns {number} An `ALResult`.
   */
  @carbon.method
  @impl.adapted
  CreateBuffer(renderContext)
  {
    if (!this.count || !this.stride) return ALResult.E_INVALIDARG;
    if (this._buffer) this._buffer.Destroy();
    this._buffer = null;

    const { CPU_WRITABLE, GPU_WRITABLE } = Tr2GpuStructuredBuffer.CreationFlag;
    let gpuUsage = Tr2GpuUsage.SHADER_RESOURCE;
    let cpuUsage = Tr2CpuUsage.READ;
    if (this.creationFlags & GPU_WRITABLE) gpuUsage |= Tr2GpuUsage.UNORDERED_ACCESS;
    else if (this.creationFlags & CPU_WRITABLE) cpuUsage = Tr2CpuUsage.WRITE_OFTEN;

    const buffer = renderContext.CreateBuffer(Tr2BufferDescriptionAL.FromStride(this.stride, this.count, gpuUsage, cpuUsage), null);
    if (!buffer) return ALResult.E_FAIL;
    if (this._name) buffer.SetName(this._name);
    this._buffer = buffer;
    return ALResult.S_OK;
  }

  /** Carbon SetName (cpp:151-158): labels the buffer now and on every re-create. */
  @carbon.method
  @impl.implemented
  SetName(name)
  {
    this._name = String(name ?? "");
    if (this._buffer) this._buffer.SetName(this._name);
  }

  /**
   * Explicit final-owner teardown replaces destruction of Carbon's AL value member.
   * Operational device-resource release remains separate.
   */
  @impl.adapted
  Destroy()
  {
    if (this._buffer) this._buffer.Destroy();
    this._buffer = null;
  }

  /**
   * Carbon GetGpuBuffer (cpp:94-97), the ITr2GpuBuffer face a GPUBUFFER
   * variable binds through; null until created.
   *
   * @param {number} [_index] Unused, as in Carbon.
   * @returns {object|null} The AL buffer.
   */
  @carbon.method
  @impl.implemented
  GetGpuBuffer(_index = 0)
  {
    return this._buffer;
  }

  /** Carbon IsValid (cpp:106-109). */
  @carbon.method
  @impl.implemented
  IsValid()
  {
    return this._buffer !== null;
  }

  /** Carbon GetCount (cpp:173-175): the created buffer's element count, 0 without one. */
  @carbon.method
  @impl.implemented
  GetCount()
  {
    return this._buffer ? this._buffer.GetDesc().count : 0;
  }

  /** Carbon method __init__ -> py__init__ (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  @carbon.method
  @impl.notImplemented
  __init__(...args)
  {
    throw new Error("Tr2GpuStructuredBuffer.__init__ is not implemented in CarbonEngineJS.");
  }

  /** Carbon method DebugGetData -> PyGetData (MAP_METHOD). */
  @carbon.method
  @impl.notImplemented
  DebugGetData(...args)
  {
    throw new Error("Tr2GpuStructuredBuffer.DebugGetData is not implemented in CarbonEngineJS.");
  }

}
