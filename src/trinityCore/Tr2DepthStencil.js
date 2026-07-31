// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Tr2DepthStencil.h
// Hand-maintained from Carbon source; Trinity owns the graph class and engines realize live state.
import { carbon, impl, io, schema, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { DepthStencilFormat } from "@carbonenginejs/runtime-utils/render-context";

/** Tr2DepthStencil (trinityCore) - generated from schema shapeHash 9acb2c99.... */
@type.define({ className: "Tr2DepthStencil", family: "trinityCore" })
export class Tr2DepthStencil extends CjsModel
{

  /** m_name (std::string) [PERSISTONLY] */
  @io.persistOnly
  @type.string
  name = "";

  @io.read
  @type.uint32
  width = 0;

  @io.read
  @type.uint32
  height = 0;

  @io.read
  @type.uint32
  multiSampleType = 0;

  @io.read
  @type.uint32
  multiSampleQuality = 0;

  @io.read
  @type.uint32
  mipCount = 0;

  @io.read
  @type.int32
  @schema.enum("DepthStencilFormat")
  format = 7;

  @io.read
  @type.boolean
  isValid = false;

  @io.read
  @type.boolean
  isReadable = false;

  /** Carbon method __init__ -> py__init__ (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  @carbon.method
  @impl.notImplemented
  __init__(...args)
  {
    throw new Error("Tr2DepthStencil.__init__ is not implemented in CarbonEngineJS.");
  }

  /** Carbon method Create (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  @carbon.method
  @impl.notImplemented
  Create(...args)
  {
    throw new Error("Tr2DepthStencil.Create is not implemented in CarbonEngineJS.");
  }

  /** Carbon method HasALObject (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.notImplemented
  HasALObject(...args)
  {
    throw new Error("Tr2DepthStencil.HasALObject is not implemented in CarbonEngineJS.");
  }

  /** Carbon method sharedHandle -> GetSharedHandle (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.notImplemented
  sharedHandle(...args)
  {
    throw new Error("Tr2DepthStencil.sharedHandle is not implemented in CarbonEngineJS.");
  }

  static DepthStencilFormat = DepthStencilFormat;

}
