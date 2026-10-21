import { IRoot } from "../blue/IRoot.js";
// Source: trinity/trinity/ITr2RenderNode.h
import { CjsSchema, blue, meta } from "../schema/index.js";


/** Dependency-free contract for one node in a Trinity render graph. */
export class ITr2RenderNode extends IRoot
{

  /** Validates the node against its requested destinations and named outputs. */
  Validate(_destinationDimensions, _outputs, _realTime, _simTime) {}

  /** Executes the node into its requested destinations. */
  Execute(_destinations, _outputs, _realTime, _simTime, _rootTimer, _renderContext) {}
}

CjsSchema.decorateMethod(ITr2RenderNode, "Validate", blue.abstract);
CjsSchema.decorateMethod(ITr2RenderNode, "Execute", blue.abstract);
CjsSchema.exposure.interface("ITr2RenderNode")(ITr2RenderNode);
