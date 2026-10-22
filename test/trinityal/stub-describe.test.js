import assert from "node:assert/strict";
import test from "node:test";

import {
  Tr2BufferALStub,
  Tr2ConstantBufferALStub,
  Tr2FenceALStub,
  Tr2GpuTimerALStub,
  Tr2OcclusionQueryALStub,
  Tr2PipelineStatsQueryALStub,
  Tr2ResourceSetALStub,
  Tr2SamplerStateALStub,
  Tr2ShaderALStub,
  Tr2ShaderProgramALStub,
  Tr2SwapChainALStub,
  Tr2TextureALStub,
  Tr2VertexLayoutALStub
} from "../../npm/dist/trinityal/index.js";

// Tr2*ALStub.cpp: every stub resource's Describe leaves the map untouched
// (Tr2BufferALStub.cpp:159 ... Tr2VertexLayoutALStub.cpp:37) except
// Tr2PipelineStatsQueryALStub.cpp:65-68, which writes its type name.
const EMPTY = [
  Tr2BufferALStub,
  Tr2ConstantBufferALStub,
  Tr2FenceALStub,
  Tr2GpuTimerALStub,
  Tr2OcclusionQueryALStub,
  Tr2ResourceSetALStub,
  Tr2SamplerStateALStub,
  Tr2ShaderALStub,
  Tr2ShaderProgramALStub,
  Tr2SwapChainALStub,
  Tr2TextureALStub,
  Tr2VertexLayoutALStub
];

for (const Stub of EMPTY)
{
  test(`${Stub.name} declares its own Describe and leaves the description empty`, () =>
  {
    assert.ok(Object.hasOwn(Stub.prototype, "Describe"), "Describe is on the stub class itself");

    const description = {};
    const resource = new Stub();

    assert.equal(resource.Describe(description), undefined);
    assert.deepEqual(description, {});

    resource.Destroy();
  });
}

test("the pipeline stats query writes its own type name", () =>
{
  const description = {};
  const query = new Tr2PipelineStatsQueryALStub();

  query.Describe(description);
  assert.deepEqual(description, { type: "Tr2PipelineStatsQueryAL" });

  query.Destroy();
});
