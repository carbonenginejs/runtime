// EveLineSet uploads its lines to a vertex buffer and draws them as a line list (EveLineSet.cpp:35-96, 166-201,
// 246-283), on the stub backend with a real effect, accumulator and context.
import assert from "node:assert/strict";
import test from "node:test";
import { TriBatchType } from "../../npm/dist/global/consts/graphics/index.js";
import { Topology } from "../../npm/dist/global/consts/renderContext/index.js";
import {
  EveLineSet, EveUpdateContext, Tr2Effect, Tr2TranslationAdapter, Tr2RenderContext_GetMainThreadRenderContext
} from "../../npm/dist/trinity/index.js";
import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { vec4 } from "../../npm/dist/global/math/vec4.js";
import { makePerObjectStore } from "./helpers/perObjectStore.js";
import { TriRenderBatchAccumulator } from "../../npm/dist/trinity/core/batch/TriRenderBatch/TriRenderBatchAccumulator.js";
import { Tr2RenderContextALStub } from "../../npm/dist/trinityal/index.js";
import { Tr2Renderer } from "../../npm/dist/trinity/core/Tr2Renderer.js";

function setup(t)
{
  const context = Tr2RenderContext_GetMainThreadRenderContext();
  const prior = context.GetRenderContextAL();
  const al = new Tr2RenderContextALStub();
  context.SetRenderContextAL(al);
  al.CreateDevice();
  const sets = [];
  t.after(() =>
  {
    for (const set of sets) set.Destruct();
    context.SetRenderContextAL(prior);
  });
  const make = () => { const set = new EveLineSet(); sets.push(set); return set; };
  return { context, make };
}

/** The floats the vertex buffer holds, read back through the stub's own storage. */
function uploaded(set, context, lines)
{
  const mapping = set._vertexBuffer.MapForWriting(context);
  return Array.from(new Float32Array(mapping.data.buffer, mapping.data.byteOffset, lines * 14));
}

/** The batches GetBatches commits, recorded by a spy that calls through to a real accumulator. */
function batchesOf(set, type)
{
  const accumulator = new TriRenderBatchAccumulator();
  const committed = [];
  const commit = accumulator.Commit.bind(accumulator);
  accumulator.Commit = (batch) => { committed.push(batch); return commit(batch); };
  set.GetBatches(accumulator, type, null, 0);
  return committed;
}

test("SubmitChanges packs each line as two position and colour vertices and grows the sphere from their end points", (t) =>
{
  const { context, make } = setup(t);
  const set = make();
  assert.equal(set.Initialize(), true);
  assert.equal(set.maxCurrentLineCount, 100);
  set.AddLine([ 1, 2, 3 ], [ 1, 0, 0, 1 ], [ 4, 5, 6 ], [ 0, 1, 0, 0.5 ]);
  assert.equal(set.AddLine([ -10, 0, 0 ], [ 0, 0, 1, 1 ], [ 10, 0, 0 ], [ 1, 1, 1, 1 ]), 1);
  assert.equal(set.SubmitChanges(), true);
  assert.equal(set.currentSubmittedLineCount, 2);
  assert.deepEqual(uploaded(set, context, 2), [
    1, 2, 3, 1, 0, 0, 1, 4, 5, 6, 0, 1, 0, 0.5,
    -10, 0, 0, 0, 0, 1, 1, 10, 0, 0, 1, 1, 1, 1
  ]);
  // BoundingSphereUpdate from the zero sphere (BoundingSphere.cpp:33-47): it covers every end point.
  const sphere = vec4.create();
  assert.equal(set.GetBoundingSphere(sphere), true);
  for (const point of [ [ 1, 2, 3 ], [ 4, 5, 6 ], [ -10, 0, 0 ], [ 10, 0, 0 ] ])
  {
    assert.ok(Math.hypot(point[0] - sphere[0], point[1] - sphere[1], point[2] - sphere[2]) <= sphere[3] + 1e-4, `covers ${point}`);
  }
});

test("lines past the buffer's capacity regrow it to the line count", (t) =>
{
  const { context, make } = setup(t);
  const set = make();
  set.Initialize();
  for (let index = 0; index < 150; index++) set.AddLine([ index, 0, 0 ], [ 1, 1, 1, 1 ], [ index, 1, 0 ], [ 1, 1, 1, 1 ]);
  assert.equal(set.SubmitChanges(), true);
  assert.equal(set.maxCurrentLineCount, 150);
  assert.equal(set._vertexBuffer.GetDesc().count, 150);
  assert.equal(uploaded(set, context, 150)[149 * 14], 149);
});

test("GetBatches draws the submitted lines as a line list, additive unless renderTransparent", (t) =>
{
  const { make } = setup(t);
  const set = make();
  set.effect = new Tr2Effect();
  set.Initialize();
  set.AddLine([ 0, 0, 0 ], [ 1, 1, 1, 1 ], [ 1, 0, 0 ], [ 1, 1, 1, 1 ]);
  set.AddLine([ 0, 0, 0 ], [ 1, 1, 1, 1 ], [ 0, 1, 0 ], [ 1, 1, 1, 1 ]);
  set.AddLine([ 0, 0, 0 ], [ 1, 1, 1, 1 ], [ 0, 0, 1 ], [ 1, 1, 1, 1 ]);
  set.SubmitChanges();

  assert.equal(batchesOf(set, TriBatchType.TRIBATCHTYPE_TRANSPARENT).length, 0, "additive by default");
  const [ batch ] = batchesOf(set, TriBatchType.TRIBATCHTYPE_ADDITIVE);
  assert.equal(batch.topology, Topology.TOP_LINES);
  assert.equal(batch.indexCountPerInstance, 6, "two vertices per submitted line");
  assert.equal(batch.stride[0], 28, "half an EveLineData");
  assert.equal(batch.material, set.effect);

  set.renderTransparent = true;
  assert.equal(batchesOf(set, TriBatchType.TRIBATCHTYPE_ADDITIVE).length, 0);
  assert.equal(batchesOf(set, TriBatchType.TRIBATCHTYPE_TRANSPARENT).length, 1);

  set.display = false;
  assert.equal(batchesOf(set, TriBatchType.TRIBATCHTYPE_TRANSPARENT).length, 0, "hidden");
  assert.deepEqual(set.GetRenderables([]), [], "a hidden set is not collected");
});

test("edits by an out-of-range id are ignored, and RemoveLine shifts the later lines down", (t) =>
{
  const { make } = setup(t);
  const set = make();
  set.AddLine([ 0, 0, 0 ], [ 1, 1, 1, 1 ], [ 1, 0, 0 ], [ 1, 1, 1, 1 ]);
  set.AddLine([ 2, 0, 0 ], [ 1, 1, 1, 1 ], [ 3, 0, 0 ], [ 1, 1, 1, 1 ]);
  set.ChangeLinePosition(5, [ 9, 9, 9 ], [ 9, 9, 9 ]);
  set.RemoveLine(5);
  assert.equal(set.lines.length, 2);
  set.RemoveLine(0);
  assert.deepEqual(Array.from(set.lines[0].position1), [ 2, 0, 0 ]);
  set.ChangeLineColor(0, [ 0, 0, 0, 1 ], [ 0, 0, 0, 0 ]);
  assert.deepEqual(Array.from(set.lines[0].color2), [ 0, 0, 0, 0 ]);
});

test("Update places the set by its curves and scaling, and the sort value is its distance from the view", (t) =>
{
  const { context: renderContext, make } = setup(t);
  const set = make();
  set.scaling.set([ 2, 2, 2 ]);
  set.translationCurve = new Tr2TranslationAdapter();
  set.translationCurve.value.set([ 3, 4, 5 ]);
  const context = new EveUpdateContext();
  context.SetTime(10_000_000);
  set.Update(context);
  assert.deepEqual(Array.from(set.worldTransform), [ 2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 2, 0, 3, 4, 5, 1 ]);

  // GetSortValue (cpp:203-208): the camera at (3, 8, 5) is 4 from the set's translation.
  Tr2Renderer.SetViewTransform(mat4.fromTranslation(mat4.create(), [ -3, -8, -5 ]));
  assert.ok(Math.abs(set.GetSortValue() - 4) < 1e-6);

  // GetPerObjectData (cpp:210-231): two structs, one WorldMat each, both stored transposed.
  const accumulator = new TriRenderBatchAccumulator().SetTriPoolAllocator(makePerObjectStore());
  const data = set.GetPerObjectData(accumulator);
  assert.deepEqual([ ...data.vs.GetLayout().stages ], [ "vs" ]);
  assert.deepEqual([ ...data.ps.GetLayout().stages ], [ "ps" ]);
  assert.equal(data.vs.GetData()[3], 3, "vs WorldMat transposed: translation x at [3]");
  assert.equal(data.ps.GetData()[7], 4, "ps WorldMat transposed: translation y at [7]");
});
