// Source: trinity/trinity/ITr2RenderNode.h
import { CjsSchema, impl } from "../schema/index.js";


const ITR2_RENDER_NODE = Symbol.for("carbonenginejs.contract.ITr2RenderNode");


/** Dependency-free contract for one node in a Trinity render graph. */
export class ITr2RenderNode
{
  static [Symbol.hasInstance](value)
  {
    return value !== null && value !== undefined && value[ITR2_RENDER_NODE] === true;
  }

  /** Validates the node against its requested destinations and named outputs. */
  Validate(_destinationDimensions, _outputs, _realTime, _simTime)
  {
    throw new Error("ITr2RenderNode.Validate must be implemented by a render node.");
  }

  /** Executes the node into its requested destinations. */
  Execute(_destinations, _outputs, _realTime, _simTime, _rootTimer, _renderContext)
  {
    throw new Error("ITr2RenderNode.Execute must be implemented by a render node.");
  }
}

Object.defineProperty(ITr2RenderNode.prototype, ITR2_RENDER_NODE, { value: true });
CjsSchema.decorateMethod(ITr2RenderNode, "Validate", impl.abstract);
CjsSchema.decorateMethod(ITr2RenderNode, "Execute", impl.abstract);
CjsSchema.define(ITr2RenderNode, { className: "ITr2RenderNode" });


/** Adds the ITr2RenderNode contract without replacing an existing model base. */
export function withITr2RenderNode(Base)
{
  const RenderNode = class extends Base
  {
    Validate(destinationDimensions, outputs, realTime, simTime)
    {
      return ITr2RenderNode.prototype.Validate.call(
        this, destinationDimensions, outputs, realTime, simTime);
    }

    Execute(destinations, outputs, realTime, simTime, rootTimer, renderContext)
    {
      return ITr2RenderNode.prototype.Execute.call(
        this, destinations, outputs, realTime, simTime, rootTimer, renderContext);
    }
  };

  Object.defineProperty(RenderNode.prototype, ITR2_RENDER_NODE, { value: true });
  CjsSchema.decorateMethod(RenderNode, "Validate", impl.abstract);
  CjsSchema.decorateMethod(RenderNode, "Execute", impl.abstract);
  return RenderNode;
}
