// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Tr2RenderTarget.h
// Hand-maintained from Carbon source; Trinity owns the graph class and engines realize live state.
import { carbon, impl, io, schema, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { PixelFormat, TextureType } from "@carbonenginejs/runtime-utils/render-context";

/** Tr2RenderTarget (trinityCore) - generated from schema shapeHash dc39c914.... */
@type.define({ className: "Tr2RenderTarget", family: "trinityCore" })
export class Tr2RenderTarget extends CjsModel
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
  arraySize = 0;

  @io.read
  @type.uint32
  mipCount = 0;

  @io.read
  @type.uint32
  multiSampleType = 0;

  @io.read
  @type.uint32
  multiSampleQuality = 0;

  @io.read
  @type.int32
  @schema.enum("PixelFormat")
  format = 0;

  @io.read
  @type.int32
  @schema.enum("TextureType")
  type = 6;

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
    throw new Error("Tr2RenderTarget.__init__ is not implemented in CarbonEngineJS.");
  }

  /** Carbon method Create (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  @carbon.method
  @impl.notImplemented
  Create(...args)
  {
    throw new Error("Tr2RenderTarget.Create is not implemented in CarbonEngineJS.");
  }

  /** Carbon method CreateArray -> Create (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  @carbon.method
  @impl.notImplemented
  CreateArray(...args)
  {
    throw new Error("Tr2RenderTarget.CreateArray is not implemented in CarbonEngineJS.");
  }

  /** Carbon method GenerateMipMaps (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.notImplemented
  GenerateMipMaps(...args)
  {
    throw new Error("Tr2RenderTarget.GenerateMipMaps is not implemented in CarbonEngineJS.");
  }

  /** Carbon method Resolve (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.notImplemented
  Resolve(...args)
  {
    throw new Error("Tr2RenderTarget.Resolve is not implemented in CarbonEngineJS.");
  }

  /** Carbon method HasALObject (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.notImplemented
  HasALObject(...args)
  {
    throw new Error("Tr2RenderTarget.HasALObject is not implemented in CarbonEngineJS.");
  }

  /** Carbon method sharedHandle -> GetSharedHandle (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.notImplemented
  sharedHandle(...args)
  {
    throw new Error("Tr2RenderTarget.sharedHandle is not implemented in CarbonEngineJS.");
  }

  static PixelFormat = PixelFormat;

  static TextureType = TextureType;

}
