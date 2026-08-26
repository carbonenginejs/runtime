// Source: trinity/trinity/RenderJob/Tr2StepExecuteRenderNode.h
// Source: trinity/trinity/RenderJob/Tr2StepExecuteRenderNode.cpp
// Source: trinity/trinity/RenderJob/Tr2StepExecuteRenderNode_Blue.cpp
// Promoted from generated source to supply TriRenderStep.Execute.
import { carbon, impl, io, type } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";


/**
 * Executes one render-graph node into a destination target, optionally clearing
 * the target when the node is absent or fails validation.
 */
@type.define({ className: "Tr2StepExecuteRenderNode", family: "renderJob" })
export class Tr2StepExecuteRenderNode extends TriRenderStep
{

  /** m_destinationTarget (Tr2RenderTargetPtr) [READWRITE] */
  @io.readwrite
  @type.objectRef("Tr2RenderTarget")
  destinationTarget = null;

  /** m_clearTargetOnFailure (bool) [READWRITE] */
  @io.readwrite
  @type.boolean
  clearTargetOnFailure = true;

  /** m_node (ITr2RenderNodePtr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("ITr2RenderNode")
  node = null;

  /**
   * Validates and executes the owned render-node contract. The runtime render
   * context records Carbon's failure clear as engine-consumable intents.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("The JS node receives the Tr2RenderTarget graph object and a null root timer; engines realize its target and timing handles.")
  Execute(realTime, simTime, renderContext)
  {
    const target = this.destinationTarget;
    if (!target || !target.isValid)
    {
      return TriRenderStep.Result.RS_FAILED;
    }

    if (!this.node)
    {
      if (this.clearTargetOnFailure)
      {
        this.#ClearOnFailure(renderContext);
        return TriRenderStep.Result.RS_OK;
      }
      return TriRenderStep.Result.RS_FAILED;
    }

    const dimensions = {
      width: target.width,
      height: target.height,
      depth: 1,
      arraySize: target.arraySize,
      mipCount: target.mipCount,
      multiSampleType: target.multiSampleType,
      multiSampleQuality: target.multiSampleQuality,
      format: target.format,
      type: target.type
    };

    if (!this.node.Validate([dimensions], [], realTime, simTime))
    {
      if (this.clearTargetOnFailure)
      {
        this.#ClearOnFailure(renderContext);
        return TriRenderStep.Result.RS_OK;
      }
      return TriRenderStep.Result.RS_FAILED;
    }

    this.node.Execute([target], [], realTime, simTime, null, renderContext);
    return TriRenderStep.Result.RS_OK;
  }

  /** Records Carbon's black target-only clear after a recoverable failure. */
  #ClearOnFailure(renderContext)
  {
    renderContext.SetRenderTarget(0, this.destinationTarget);
    renderContext.SetDepthStencil(null);
    renderContext.SetFullScreenViewport();
    renderContext.Clear({
      color: [0, 0, 0, 1],
      depth: 0,
      stencil: 0,
      clearColor: true,
      clearDepth: false,
      clearStencil: false
    });
  }

}
