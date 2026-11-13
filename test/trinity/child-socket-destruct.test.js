import test from "node:test";
import { EveChildSocket, EveChildPlug } from "../../npm/dist/trinity/index.js";
import { assertChildOwnerDestruct } from "../support/childOwnerDestruct.js";
import { CjsGraph } from "../../npm/dist/global/model/graph/CjsGraph.js";

test("socket teardown detaches its retained plug", () =>
{
  const owner = new EveChildSocket();
  CjsGraph.finalDelete(owner);
  assertChildOwnerDestruct(owner, "plug", new EveChildPlug());
});
