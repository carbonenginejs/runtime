// EveTacticalTrails samples its registered balls into fading control points and draws them (EveTacticalTrails.cpp:
// 84-258, 299-317), on the stub backend. A real Tr2TranslationAdapter stands in for each ball: its InterpolatedPosition
// returns the value the test sets per frame.
import assert from "node:assert/strict";
import test from "node:test";
import { TriBatchType, RenderingMode } from "../../npm/dist/global/consts/graphics/index.js";
import {
  EveTacticalTrails, EveUpdateContext, Tr2Effect, Tr2TranslationAdapter, Tr2RenderContext_GetMainThreadRenderContext
} from "../../npm/dist/trinity/index.js";
import { TriRenderBatchAccumulator } from "../../npm/dist/trinity/core/batch/TriRenderBatch/TriRenderBatchAccumulator.js";
import { Tr2RenderContextALStub } from "../../npm/dist/trinityal/index.js";

const SECOND = 10_000_000;

function setup(t)
{
  const context = Tr2RenderContext_GetMainThreadRenderContext();
  const prior = context.GetRenderContextAL();
  const al = new Tr2RenderContextALStub();
  context.SetRenderContextAL(al);
  al.CreateDevice();
  const made = [];
  t.after(() =>
  {
    for (const trails of made) trails.Destroy();
    context.SetRenderContextAL(prior);
  });
  return { context, make: () => { const trails = new EveTacticalTrails(); made.push(trails); return trails; } };
}

function ball(x, y, z)
{
  const adapter = new Tr2TranslationAdapter();
  adapter.currentValue.set([ x, y, z ]);
  return adapter;
}

/** Runs one frame at the given second with the ball at the given position. */
function frame(trails, seconds, target = null, position = null)
{
  if (target) target.currentValue.set(position);
  const context = new EveUpdateContext();
  context.SetTime(seconds * SECOND);
  trails.UpdateSyncronous(context);
}

test("straight motion moves the last control point; a bend adds one", (t) =>
{
  const { make } = setup(t);
  const trails = make();
  const target = ball(0, 0, 0);
  trails.RegisterObject(target);
  frame(trails, 1, target, [ 0, 0, 0 ]);
  frame(trails, 2, target, [ 100, 0, 0 ]);
  assert.equal(trails.trackedObjects[0].positions.length, 2, "the first two samples are always kept");
  // Within a metre of the line from the second-last point, still moving away, segment under 10 km: the last point
  // moves rather than a new one being added (cpp:144-164).
  frame(trails, 3, target, [ 200, 0, 0 ]);
  frame(trails, 4, target, [ 300, 0.5, 0 ]);
  const positions = trails.trackedObjects[0].positions;
  assert.equal(positions.length, 2);
  assert.deepEqual(Array.from(positions[1].position), [ 300, 0.5, 0 ]);
  assert.equal(positions[1].time, 4 * SECOND);
  // More than a metre off that line: a new point.
  frame(trails, 5, target, [ 400, 50, 0 ]);
  assert.equal(trails.trackedObjects[0].positions.length, 3);
  // Turning back towards the second-last point: a new point.
  frame(trails, 6, target, [ 350, 0, 0 ]);
  assert.equal(trails.trackedObjects[0].positions.length, 4);
});

test("points older than fadeOutTime are dropped, and an unregistered ball is forgotten once faded", (t) =>
{
  const { make } = setup(t);
  const trails = make();
  trails.fadeOutTime = 5;
  const target = ball(0, 0, 0);
  trails.RegisterObject(target);
  frame(trails, 1, target, [ 0, 0, 0 ]);
  frame(trails, 2, target, [ 0, 100, 0 ]);
  frame(trails, 3, target, [ 100, 100, 0 ]);
  frame(trails, 4, target, [ 100, 200, 0 ]);
  assert.equal(trails.trackedObjects[0].positions.length, 4);
  // At 8.5 s the points from 2 s and 3 s are older than 5 s; the point before the first live one is kept.
  frame(trails, 8.5, target, [ 200, 200, 0 ]);
  assert.deepEqual(trails.trackedObjects[0].positions.map((point) => point.time / SECOND), [ 3, 4, 8.5 ]);

  trails.UnregisterObject(target);
  assert.equal(trails.trackedObjects[0].ball, null);
  frame(trails, 20);
  assert.equal(trails.trackedObjects.length, 0, "faded to one point, then removed");
});

test("the vertices are rebased against the ego ball and fade with the time since each point", (t) =>
{
  const { context, make } = setup(t);
  const trails = make();
  trails.fadeOutTime = 5;
  trails.egoBall = ball(1000, 0, 0);
  const target = ball(0, 0, 0);
  trails.RegisterObject(target);
  frame(trails, 1, target, [ 1000, 0, 0 ]);
  frame(trails, 2, target, [ 1010, 0, 0 ]);
  assert.equal(trails.segments, 1);

  const buffer = trails._vertexBuffer;
  assert.equal(buffer.GetDesc().stride, 36, "LineVertex is 36 bytes");
  assert.equal(buffer.GetDesc().count, 1024, "capacity floors at 1024 vertices");
  const mapping = buffer.MapForWriting(context);
  const floats = new Float32Array(mapping.data.buffer, mapping.data.byteOffset, 12 * 9);
  // Vertex 0: pos1 rebased to the ego ball, lineDir = pos2 - pos1, fade (2 - 1) / 5, quad (-1, -1).
  assert.deepEqual(Array.from(floats.slice(0, 9)), [ 0, 0, 0, 10, 0, 0, Math.fround(0.2), -1, -1 ]);
  // The last segment's connector fans towards the extrapolated pos2 + (pos2 - pos1).
  assert.deepEqual(Array.from(floats.slice(8 * 9 + 3, 8 * 9 + 6)), [ 10, 0, 0 ]);
});

test("GetBatches draws twelve vertices per segment, transparent only, under RM_ALPHA", (t) =>
{
  const { make } = setup(t);
  const trails = make();
  trails.trailEffect = new Tr2Effect();
  const target = ball(0, 0, 0);
  trails.RegisterObject(target);
  frame(trails, 1, target, [ 0, 0, 0 ]);
  frame(trails, 2, target, [ 0, 100, 0 ]);
  frame(trails, 3, target, [ 100, 100, 0 ]);
  assert.equal(trails.segments, 2);

  const committed = [];
  const accumulator = new TriRenderBatchAccumulator();
  const commit = accumulator.Commit.bind(accumulator);
  accumulator.Commit = (batch) => { committed.push(batch); return commit(batch); };
  trails.GetBatches(accumulator, TriBatchType.TRIBATCHTYPE_ADDITIVE, null, 0);
  assert.equal(committed.length, 0);
  trails.GetBatches(accumulator, TriBatchType.TRIBATCHTYPE_TRANSPARENT, null, 0);
  assert.equal(committed.length, 1);
  assert.equal(committed[0].indexCountPerInstance, 24);
  assert.equal(committed[0].renderingMode, RenderingMode.RM_ALPHA);
  assert.equal(committed[0].material, trails.trailEffect);
});

test("RegisterObject ignores a null and a repeat registration", (t) =>
{
  const { make } = setup(t);
  const trails = make();
  const target = ball(0, 0, 0);
  const logged = [];
  const { error, warn } = console;
  console.error = (message) => logged.push(message);
  console.warn = (message) => logged.push(message);
  try
  {
    trails.RegisterObject(null);
    trails.RegisterObject(target);
    trails.RegisterObject(target);
  }
  finally { Object.assign(console, { error, warn }); }
  assert.equal(trails.trackedObjects.length, 1);
  assert.equal(trails.trackedObjects[0].ball.deref(), target);
  assert.deepEqual(logged, [ "EveTacticalTrails::RegisterObject: Object is null", "EveTacticalTrails::RegisterObject: Object already registered" ]);
});
