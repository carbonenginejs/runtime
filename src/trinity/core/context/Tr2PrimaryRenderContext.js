// Source: trinity/trinity/Tr2RenderContext.h
// Hand-maintained from Carbon source; the back buffer is backend-private state.
import { meta } from "#schema";

/** Tr2PrimaryRenderContext (trinityCore) - generated from schema shapeHash 92b87061.... */
@meta.define({ className: "Tr2PrimaryRenderContext", family: "trinityCore" })
export class Tr2PrimaryRenderContext
{

  /** Carbon method GetDefaultBackBuffer -> GetBackBuffer (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.notImplemented
  GetDefaultBackBuffer(...args)
  {
    throw new Error("Tr2PrimaryRenderContext.GetDefaultBackBuffer is not implemented in CarbonEngineJS.");
  }

  /** Carbon method GetBackBufferFormat (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.notImplemented
  GetBackBufferFormat(...args)
  {
    throw new Error("Tr2PrimaryRenderContext.GetBackBufferFormat is not implemented in CarbonEngineJS.");
  }

}
