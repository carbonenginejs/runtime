import test from "node:test";
import { EveChildRef } from "../../npm/dist/trinity/index.js";
import { assertChildOwnerDestruct } from "../support/childOwnerDestruct.js";
import { CjsGraph } from "../../npm/dist/global/model/graph/CjsGraph.js";

test("child-ref teardown detaches its retained child", () =>
{
  const owner = new EveChildRef();
  CjsGraph.finalDelete(owner);
  assertChildOwnerDestruct(owner, "child");
});
