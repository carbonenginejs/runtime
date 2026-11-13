import test from "node:test";
import { EveChildProceduralContainer } from "../../npm/dist/trinity/index.js";
import { assertChildOwnerDestruct } from "../support/childOwnerDestruct.js";
import { CjsGraph } from "../../npm/dist/global/model/graph/CjsGraph.js";

test("procedural-container teardown detaches its retained selection", () =>
{
  const owner = new EveChildProceduralContainer();
  CjsGraph.finalDelete(owner);
  assertChildOwnerDestruct(owner, "selectedObject");
});
