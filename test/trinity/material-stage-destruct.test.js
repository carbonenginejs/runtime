import assert from "node:assert/strict";
import test from "node:test";
import { Tr2MaterialStageInput } from "../../npm/dist/trinity/shader/material/Tr2MaterialStageInput.js";
import { Tr2RenderContext } from "../../npm/dist/trinity/core/index.js";
import { Tr2ConstantBufferAL } from "../../npm/dist/trinityal/index.js";
import { CjsGraph } from "../../npm/dist/global/model/graph/CjsGraph.js";

test("stage teardown releases its constant-buffer share once without invalidating a peer", () =>
{
  const context = new Tr2RenderContext();
  context.GetRenderContextAL().CreateDevice();
  const stage = new Tr2MaterialStageInput();
  stage.constantBuffer.Create__Size(16, context);
  assert.equal(stage.constantBuffer.IsValid(), true);
  const peer = new Tr2ConstantBufferAL({ copy: stage.constantBuffer });
  const shared = peer._buffer;
  stage.AllocateConstants(16);
  const mirror = stage.constantMirror;
  try
  {
    CjsGraph.finalDelete(stage);
    CjsGraph.finalDelete(stage);
    assert.equal(stage.constantBuffer.IsValid(), false);
    assert.equal(peer.IsValid(), true);
    assert.equal(shared.owners, 1);
    assert.equal(stage.constantMirror, mirror);
  }
  finally { peer.Destroy(); }
  assert.equal(shared.owners, 0);
  assert.equal(shared.implementation.IsValid(), false);
});
