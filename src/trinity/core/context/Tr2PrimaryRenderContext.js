// Source: trinity/trinity/Tr2RenderContext.h
// Hand-maintained from Carbon source; the back buffer is backend-private state.
import { meta, blue } from "#schema";

/** Tr2PrimaryRenderContext (trinityCore) - generated from schema shapeHash 92b87061.... */
@blue.define("Tr2PrimaryRenderContext")
export class Tr2PrimaryRenderContext
{

  /** Carbon method GetDefaultBackBuffer -> GetBackBuffer (MAP_METHOD_AND_WRAP). */
  @blue.method
  @meta.notImplemented
  GetDefaultBackBuffer(...args)
  {
    throw new Error("Tr2PrimaryRenderContext.GetDefaultBackBuffer is not implemented in CarbonEngineJS.");
  }

  /** Carbon method GetBackBufferFormat (MAP_METHOD_AND_WRAP). */
  @blue.method
  @meta.notImplemented
  GetBackBufferFormat(...args)
  {
    throw new Error("Tr2PrimaryRenderContext.GetBackBufferFormat is not implemented in CarbonEngineJS.");
  }

}
