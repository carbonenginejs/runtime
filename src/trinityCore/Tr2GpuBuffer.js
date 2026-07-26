// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Tr2GpuBuffer.h
// Hand-maintained from Carbon source; runtime-device owns the canonical JS class.
import { carbon, impl, io, schema, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { PixelFormat } from "@carbonenginejs/runtime-utils/render-context";

/** Tr2GpuBuffer (trinityCore) - generated from schema shapeHash 7a225a45.... */
@type.define({ className: "Tr2GpuBuffer", family: "trinityCore" })
export class Tr2GpuBuffer extends CjsModel
{

  static CreationFlags = Object.freeze({ CPU_WRITABLE: 1, GPU_WRITABLE: 2, DRAW_INDIRECT: 4 });

  /** m_creationFlags (CreationFlags) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.uint32
  creationFlags = 0;

  /** m_format (Tr2RenderContextEnum::PixelFormat - enum PixelFormat) [READWRITE, ENUM, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.int32
  @schema.enum("PixelFormat")
  format = 0;

  /** m_count (uint32_t) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.uint32
  count = 0;

  @io.read
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
