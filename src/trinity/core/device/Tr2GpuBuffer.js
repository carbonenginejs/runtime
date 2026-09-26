// Source: trinity/trinity/Tr2GpuBuffer.h
// Hand-maintained from Carbon source. Unimplemented backend methods here are
// unported Carbon behaviour, not a boundary: Carbon holds its handles on this
// class and calls the AL from it.
import { carbon, impl, edit, type } from "#schema";
import { CjsModel } from "#model";
import { PixelFormat, Tr2CpuUsage, Tr2GpuUsage } from "#consts/render-context";
import { ALResult, Tr2BufferDescriptionAL } from "#trinityal";
import "#blue/registerTrinityEnums";

/** Tr2GpuBuffer (trinityCore) - generated from schema shapeHash 7a225a45.... */
@type.define({ className: "Tr2GpuBuffer", family: "trinityCore" })
export class Tr2GpuBuffer extends CjsModel
{

  static CreationFlags = Object.freeze({ CPU_WRITABLE: 1, GPU_WRITABLE: 2, DRAW_INDIRECT: 4 });

  /** m_creationFlags (CreationFlags) [READWRITE, PERSIST, NOTIFY] */
  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.uint32
  creationFlags = 0;

  /** m_format (Tr2RenderContextEnum::PixelFormat - enum PixelFormat) [READWRITE, ENUM, PERSIST, NOTIFY] */
  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.int32
  @type.enum("trinity.ImageIO.PixelFormat")
  format = 0;

  /** m_count (uint32_t) [READWRITE, PERSIST, NOTIFY] */
  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.uint32
  count = 0;

  @edit.read
  @type.boolean
  isValid = false;

  /** m_name - debug label; not Blue-exposed. */
  #name = "";

  /**
   * Sets the debug label, coercing null to an empty string; Carbon keeps this
   * private with no getter, so the paired GetName is a JS addition.
   */
  @carbon.method
  @impl.implemented
  SetName(name)
  {
    this.#name = String(name ?? "");
  }

  /** JS accessor for the debug label; Carbon keeps m_name private with no getter. */
  GetName()
  {
    return this.#name;
  }

  /** m_buffer: the AL buffer, null until CreateBuffer succeeds. */
  #buffer = null;

  /**
   * Carbon Create (Tr2GpuBuffer.cpp:100-108): records the element count,
   * format and flags, then builds the AL buffer.
   *
   * The render context is an ADDED argument. Carbon's CreateBuffer reaches the
   * main-thread context through USE_MAIN_THREAD_RENDER_CONTEXT; every caller
   * here holds its frame's context, which is the one the backend lives on,
   * so it is passed down as that macro's own header asks.
   *
   * @param {number} count Element count.
   * @param {number} format A `PixelFormat`.
   * @param {number} creationFlags `Tr2GpuBuffer.CreationFlags` bits.
   * @param {Tr2RenderContext} renderContext The context to create on.
   * @returns {number} An `ALResult`.
   */
  @carbon.method
  @impl.adapted
  Create(count, format, creationFlags, renderContext)
  {
    this.count = count;
    this.format = format;
    this.creationFlags = creationFlags;
    return this.CreateBuffer(renderContext);
  }

  /**
   * Carbon CreateBuffer (cpp:142-176): SHADER_RESOURCE always, UNORDERED_ACCESS
   * when GPU-writable, CPU WRITE when CPU-writable, DRAW_INDIRECT_ARGS for
   * indirect draws; CPU READ always. A zero count or unknown format refuses.
   *
   * @param {Tr2RenderContext} renderContext The context to create on.
   * @returns {number} An `ALResult`.
   */
  @carbon.method
  @impl.adapted
  CreateBuffer(renderContext)
  {
    this.#buffer = null;
    this.isValid = false;

    if (!this.count || this.format === PixelFormat.PIXEL_FORMAT_UNKNOWN) return ALResult.E_INVALIDARG;

    const { CPU_WRITABLE, GPU_WRITABLE, DRAW_INDIRECT } = Tr2GpuBuffer.CreationFlags;
    let gpuUsage = Tr2GpuUsage.SHADER_RESOURCE;
    let cpuUsage = Tr2CpuUsage.READ;

    if (this.creationFlags & GPU_WRITABLE) gpuUsage |= Tr2GpuUsage.UNORDERED_ACCESS;
    else if (this.creationFlags & CPU_WRITABLE) cpuUsage |= Tr2CpuUsage.WRITE;
    if (this.creationFlags & DRAW_INDIRECT) gpuUsage |= Tr2GpuUsage.DRAW_INDIRECT_ARGS;

    const buffer = renderContext.CreateBuffer(Tr2BufferDescriptionAL.FromFormat(this.format, this.count, gpuUsage, cpuUsage), null);

    if (!buffer) return ALResult.E_FAIL;

    if (this.#name) buffer.SetName(this.#name);
    this.#buffer = buffer;
    this.isValid = true;
    return ALResult.S_OK;
  }

  /**
   * Carbon GetGpuBuffer (cpp:118-121), the ITr2GpuBuffer face a GPUBUFFER
   * variable binds through. Carbon returns its member, invalid until created;
   * here that is null, which the backend binds as its null buffer.
   *
   * @param {number} [_index] Unused, as in Carbon.
   * @returns {object|null} The AL buffer.
   */
  @carbon.method
  @impl.implemented
  GetGpuBuffer(_index = 0)
  {
    return this.#buffer;
  }

  /** Carbon IsValid (cpp:130-133). */
  @carbon.method
  @impl.implemented
  IsValid()
  {
    return this.#buffer !== null;
  }

  /** Carbon GetCount (cpp:190-193): the created buffer's element count. */
  @carbon.method
  @impl.implemented
  GetCount()
  {
    return this.#buffer ? this.#buffer.GetDesc().count : 0;
  }

  /** Carbon method __init__ (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  @carbon.method
  @impl.notImplemented
  __init__(...args)
  {
    throw new Error("Tr2GpuBuffer.__init__ is not implemented in CarbonEngineJS.");
  }

  /** Carbon method DebugGetData -> PyGetData (MAP_METHOD). */
  @carbon.method
  @impl.notImplemented
  DebugGetData(...args)
  {
    throw new Error("Tr2GpuBuffer.DebugGetData is not implemented in CarbonEngineJS.");
  }

  static PixelFormat = PixelFormat;

}
