import { IRoot } from "../../../global/blue/IRoot.js";
import { exposure as be } from "#be";
// Source: trinity/trinity/Tr2GpuBuffer.h
// Hand-maintained from Carbon source. Unimplemented backend methods here are
// unported Carbon behaviour, not a boundary: Carbon holds its handles on this
// class and calls the AL from it.
import { meta, type, blue } from "#schema";
import { INotify, IInitialize } from "#blue";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../context/Tr2RenderContext.js";
import { PixelFormat, Tr2CpuUsage, Tr2GpuUsage } from "#consts/render-context";
import { ALResult, Tr2BufferDescriptionAL } from "#trinityal";
import "#consts/renderContext/formats";
import { ITr2GpuBuffer } from "../ITr2GpuBuffer.js";
import { blueEnums, EnumRegistrationType } from "#blue/enums/CjsBlueEnumRegistry";

/** Tr2GpuBuffer::CreationFlag bits of m_creationFlags. */
const CreationFlags = Object.freeze({ CPU_WRITABLE: 1, GPU_WRITABLE: 2, DRAW_INDIRECT: 4 });

// Source: trinity/trinity/Tr2GpuBuffer_Blue.cpp:9
blueEnums.Create("trinity.Tr2GpuBufferFlags", CreationFlags, {
  exposedName: "Tr2GpuBufferFlags", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooser: [
    { name: "CPU_WRITABLE", value: CreationFlags.CPU_WRITABLE, description: "Can the buffer be locked with write-only access" },
    { name: "GPU_WRITABLE", value: CreationFlags.GPU_WRITABLE, description: "Is the buffer used for GPU write access" },
    { name: "DRAW_INDIRECT", value: CreationFlags.DRAW_INDIRECT, description: "Is the buffer used for indirect draw calls" }
  ]
});


/** Tr2GpuBuffer (trinityCore) - generated from schema shapeHash 7a225a45.... */
@be.define("Tr2GpuBuffer")
@be.inherit(ITr2GpuBuffer, INotify, IInitialize)
@be.mapInterface(INotify)
@be.mapInterface(IInitialize)
@be.mapInterface(ITr2GpuBuffer)
export class Tr2GpuBuffer extends IRoot
{

  /**
   * Carbon Tr2GpuBuffer.cpp: create from persisted parameters on the ambient context.
   *
   * @implemented
   */
  @meta.implemented
  Initialize()
  {
    this.CreateBuffer(Tr2RenderContext_GetMainThreadRenderContext());
    return true;
  }

  /**
   * Carbon ignores the AL result here; failed creation follows CreateBuffer's ownership rules.
   *
   * @implemented
   */
  @meta.implemented
  OnModified(_names)
  {
    this.CreateBuffer(Tr2RenderContext_GetMainThreadRenderContext());
    return true;
  }


  static CreationFlags = CreationFlags;

  /**
   * m_creationFlags (CreationFlags) [READWRITE, PERSIST, NOTIFY]
   * Carbon: MAP_ATTRIBUTE_WITH_CHOOSER (trinity/trinity/Tr2GpuBuffer_Blue.cpp:98); chooser Tr2GpuBufferCreationFlagChooser (trinity/trinity/Tr2GpuBuffer_Blue.cpp:9).
   */
  @be.mapAttributeWithChooser(be.READWRITE | be.PERSIST | be.NOTIFY, "trinity.Tr2GpuBufferFlags")
  @type.uint32
  creationFlags = 0;

  /**
   * m_format (Tr2RenderContextEnum::PixelFormat - enum PixelFormat) [READWRITE, ENUM, PERSIST, NOTIFY]
   * Carbon: MAP_ATTRIBUTE_WITH_CHOOSER (trinity/trinity/Tr2GpuBuffer_Blue.cpp:92); chooser Tr2RenderContextEnum_PixelFormat_Chooser (trinity/trinity/Tr2RenderContext_Blue.cpp:141).
   */
  @be.mapAttributeWithChooser(be.READWRITE | be.ENUM | be.PERSIST | be.NOTIFY, "trinity.ImageIO.PixelFormat")
  @type.int32
  @type.enum("trinity.ImageIO.PixelFormat")
  format = 0;

  /** m_count (uint32_t) [READWRITE, PERSIST, NOTIFY] */
  @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY)


  @type.uint32
  count = 0;

  /** m_name - debug label; not Blue-exposed. */
  @type.string
  #name = "";

  /**
   * Sets the debug label, coercing null to an empty string; Carbon keeps this
   * private with no getter, so the paired GetName is a JS addition.
   *
   * @implemented
   */
  @meta.implemented
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
   * @adapted
   * @param {number} count Element count.
   * @param {number} format A `PixelFormat`.
   * @param {number} creationFlags `Tr2GpuBuffer.CreationFlags` bits.
   * @param {Tr2RenderContext} renderContext The context to create on.
   * @returns {number} An `ALResult`.
   */
  @meta.adapted
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
   * @adapted
   * @param {Tr2RenderContext} renderContext The context to create on.
   * @returns {number} An `ALResult`.
   */
  @meta.adapted
  CreateBuffer(renderContext)
  {
    if (this.#buffer) this.#buffer.Destroy();
    this.#buffer = null;

    if (!this.count || this.format === PixelFormat.PIXEL_FORMAT_UNKNOWN) return ALResult.E_INVALIDARG;

    const { CPU_WRITABLE, GPU_WRITABLE, DRAW_INDIRECT } = Tr2GpuBuffer.CreationFlags;
    let gpuUsage = Tr2GpuUsage.SHADER_RESOURCE;
    let cpuUsage = Tr2CpuUsage.READ;

    if (this.creationFlags & GPU_WRITABLE) gpuUsage |= Tr2GpuUsage.UNORDERED_ACCESS;
    else if (this.creationFlags & CPU_WRITABLE) cpuUsage |= Tr2CpuUsage.WRITE;
    if (this.creationFlags & DRAW_INDIRECT) gpuUsage |= Tr2GpuUsage.DRAW_INDIRECT_ARGS;

    const buffer = renderContext.CreateBuffer(Tr2BufferDescriptionAL.create__Format(this.format, this.count, gpuUsage, cpuUsage), null);

    if (!buffer) return ALResult.E_FAIL;

    if (this.#name) buffer.SetName(this.#name);
    this.#buffer = buffer;
    return ALResult.S_OK;
  }

  /**
   * Explicit final-owner teardown replaces destruction of Carbon's AL value member.
   * Operational device-resource release remains separate.
   *
   * Temporary destructor stand-in: exists because teardown is required before
   * the lifecycle (Destructor) pattern exists. NOT the final mechanism; do not
   * copy this as a pattern. Replaced by the lifecycle API after the IRoot pilot.
   *
   * @adapted
   */
  @meta.adapted
  Destruct()
  {
    if (this.#buffer) this.#buffer.Destroy();
    this.#buffer = null;
  }

  /**
   * Carbon GetGpuBuffer (cpp:118-121), the ITr2GpuBuffer face a GPUBUFFER
   * variable binds through. Carbon returns its member, invalid until created;
   * here that is null, which the backend binds as its null buffer.
   *
   * @implemented
   * @param {number} [_index] Unused, as in Carbon.
   * @returns {object|null} The AL buffer.
   */
  @meta.implemented
  GetGpuBuffer(_index = 0)
  {
    return this.#buffer;
  }

  /**
   * Carbon IsValid (cpp:130-133).
   *
   * @implemented
   */
  @meta.implemented
  IsValid()
  {
    return this.#buffer !== null;
  }

  /**
   * isValid (MAP_PROPERTY_READONLY): Carbon's property over IsValid, which the macro calls.
   * Carbon: MAP_PROPERTY_READONLY (trinity/trinity/Tr2GpuBuffer_Blue.cpp:104).
   *
   * @implemented
   */
  @be.mapPropertyReadOnly()
  @meta.implemented
  get isValid()
  {
    return this.IsValid();
  }

  /**
   * Carbon GetCount (cpp:190-193): the created buffer's element count.
   *
   * @implemented
   */
  @meta.implemented
  GetCount()
  {
    return this.#buffer ? this.#buffer.GetDesc().count : 0;
  }

  /**
   * Carbon method __init__ (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS).
   *
   * @notImplemented
   */
  @be.mapMethodAndWrapOptionalArgs()
  @meta.notImplemented
  __init__(...args)
  {
    throw new Error("Tr2GpuBuffer.__init__ is not implemented in CarbonEngineJS.");
  }

  /**
   * Carbon method DebugGetData -> PyGetData (MAP_METHOD).
   *
   * @notImplemented
   */
  @be.mapMethod()
  @meta.notImplemented
  DebugGetData(...args)
  {
    throw new Error("Tr2GpuBuffer.DebugGetData is not implemented in CarbonEngineJS.");
  }

  static PixelFormat = PixelFormat;

}
