// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Tr2SwapChain.h
// Hand-maintained from Carbon source; Trinity owns the graph class and engines realize live state.
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";

/** Tr2SwapChain (trinityCore) - generated from schema shapeHash 955529ab.... */
@type.define({ className: "Tr2SwapChain", family: "trinityCore" })
export class Tr2SwapChain extends CjsModel
{

  /** m_depthStencil (Tr2DepthStencilPtr) [READ] */
  @io.read
  @type.objectRef("Tr2DepthStencil")
  depthStencilBuffer = null;

  /** m_backBuffer (Tr2RenderTargetPtr) [READ] */
  @io.read
  @type.objectRef("Tr2RenderTarget")
  backBuffer = null;

  @io.read
  @type.int32
  width = 0;

  @io.read
  @type.int32
  height = 0;

  /** Carbon method CreateForWindow (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.notImplemented
  CreateForWindow(...args)
  {
    throw new Error("Tr2SwapChain.CreateForWindow is not implemented in CarbonEngineJS.");
  }

}
