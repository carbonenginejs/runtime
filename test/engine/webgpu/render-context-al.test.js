import assert from "node:assert/strict";
import test from "node:test";

import { CjsWebgpuRenderContextAL } from "../../../npm/dist/engine/webgpu/internal.js";
import { Tr2ColorAttachment, Tr2DepthAttachment } from "../../../npm/dist/trinity/core/index.js";
import { Topology, Tr2LoadAction, Tr2StoreAction } from "../../../npm/dist/global/consts/renderContext/index.js";

const ready = () =>
{
  const al = new CjsWebgpuRenderContextAL();

  al.CreateDevice();
  al.BeginScene();
  al.DrainTransitions();

  return al;
};

const geometry = al =>
{
  al.SetShaderProgram({ id: "program" });
  al.SetVertexLayout({ id: "layout" });
  al.SetStreamSource(0, { id: "vertices" }, 0, 32);
  al.SetIndices({ id: "indices" }, 2);
};

test("the batch-to-draw sequence records one pass and one draw", () =>
{
  // Carbon's SubmitGeometry (Tr2RenderContext.cpp:83-103): topology, then the
  // declaration, streams and indices, then the draw.
  const al = ready();

  assert.equal(al.SetTopology(Topology.TOP_TRIANGLES), true);
  geometry(al);
  assert.equal(al.DrawIndexedInstanced(36, 1, 0, 0, 0), true);

  const events = al.DrainTransitions();

  assert.deepEqual(events.map(event => event.type), [ "open", "draw" ]);
  assert.equal(al.GetWorkQueue().GetPassCount(), 1, "the draw opened the pass");
  assert.equal(events[1].indexCount, 36);
});

test("an indexed draw with nothing to index is refused", () =>
{
  // Metal returns E_INVALIDARG when m_metalIndexBuffer is nil
  // (Tr2RenderContextMetal.mm:419-422). A backend can catch that without a GPU.
  const al = ready();

  al.SetShaderProgram({ id: "program" });

  assert.equal(al.DrawIndexedInstanced(36, 1), false, "no index buffer");
  assert.deepEqual(al.DrainTransitions(), [], "and nothing was recorded");

  al.SetIndices({ id: "indices" }, 2);

  assert.equal(al.DrawIndexedInstanced(36, 1), true);
});

test("a declared clear becomes the pass load operation", () =>
{
  // The whole point of consuming RenderPassHint: Trinity DECLARES the load and
  // store actions, where the intent planner infers them by scanning what
  // follows a clear.
  const al = ready();

  al.RenderPassHint(
    new Tr2ColorAttachment(Tr2LoadAction.CLEAR, Tr2StoreAction.STORE, 0),
    new Tr2DepthAttachment(Tr2LoadAction.CLEAR, Tr2StoreAction.STORE, 1)
  );

  geometry(al);
  al.DrawIndexedInstanced(3, 1);

  const events = al.DrainTransitions();
  const open = events.find(event => event.type === "open");

  assert.deepEqual(open.attachments.colors, [ { loadOp: "clear", storeOp: "store", clearValue: 0 } ]);
  assert.equal(open.attachments.depth.loadOp, "clear");
});

test("consecutive draws share a pass until a hint cuts one", () =>
{
  const al = ready();

  geometry(al);
  al.DrawIndexedInstanced(3, 1);
  al.DrawIndexedInstanced(6, 1);

  assert.equal(al.GetWorkQueue().GetPassCount(), 1, "two draws, one pass");

  al.RenderPassHint(new Tr2ColorAttachment(Tr2LoadAction.LOAD, Tr2StoreAction.STORE, 0));
  al.DrawIndexedInstanced(9, 1);

  assert.equal(al.GetWorkQueue().GetPassCount(), 2, "the hint cut a new one");
});

test("a primitive count becomes a vertex count at the bound topology", () =>
{
  // Carbon's draw verbs take PRIMITIVES and its backends draw VERTICES, so
  // every backend converts (ComputeVertexCount). The conversion depends on the
  // bound topology, which is why the AL holds it.
  const al = ready();

  al.SetTopology(Topology.TOP_TRIANGLES);
  assert.equal(al.ComputeVertexCount(12), 36);

  al.SetTopology(Topology.TOP_TRIANGLE_STRIP);
  assert.equal(al.ComputeVertexCount(12), 14);

  al.SetTopology(Topology.TOP_LINES);
  assert.equal(al.ComputeVertexCount(12), 24);

  al.SetTopology(Topology.TOP_POINTS);
  assert.equal(al.ComputeVertexCount(12), 12);
});

test("a topology the AL has no name for is refused", () =>
{
  const al = ready();

  assert.equal(al.SetTopology(Topology.TOP_MAX_TOPOLOGY), false);
  assert.equal(al.SetTopology(99), false);
  assert.equal(al.SetTopology(Topology.TOP_INVALID), false, "INVALID is not a topology either");
});

test("ending the scene closes the pass and commits once", () =>
{
  const al = ready();

  geometry(al);
  al.DrawIndexedInstanced(3, 1);
  al.DrainTransitions();

  al.EndScene();

  assert.deepEqual(al.DrainTransitions().map(event => event.type), [ "close", "commit" ]);
});

test("the bound state is what a following draw would encode", () =>
{
  const al = ready();

  al.SetTopology(Topology.TOP_LINES);
  geometry(al);

  const bound = al.GetBoundState();

  assert.equal(bound.topology, Topology.TOP_LINES);
  assert.equal(bound.indexStride, 2);
  assert.equal(bound.streams[0].stride, 32);
  assert.equal(bound.shaderProgram.id, "program");
  assert.equal(bound.vertexLayout.id, "layout");
});

test("a scene cannot open before a device exists", () =>
{
  assert.throws(() => new CjsWebgpuRenderContextAL().BeginScene(), /before CreateDevice/);
});
