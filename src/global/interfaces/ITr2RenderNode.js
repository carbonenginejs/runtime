// Source: trinity/trinity/ITr2RenderNode.h
import { CjsSchema, blue, meta } from "../schema/index.js";


/** Dependency-free contract for one node in a Trinity render graph. */
export class ITr2RenderNode
{

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

CjsSchema.decorateMethod(ITr2RenderNode, "Validate", blue.method, meta.abstract);
CjsSchema.decorateMethod(ITr2RenderNode, "Execute", blue.method, meta.abstract);
CjsSchema.blue.define(ITr2RenderNode, { className: "ITr2RenderNode" });
