// Carbon's RenderBatches family, which had no counterpart at all: nothing could
// submit a finalized accumulator, which is why CjsBatchManager.Collect had no
// caller anywhere in src.
//
// These used to assert on recorded INTENTS. The intent queue is gone
// (2026-09-06) and every verb calls the installed backend, so each claim is now
// made against what the backend actually receives - which is a stronger version
// of the same claim, since it proves the call arrived rather than that a
// description of it was filed.
import assert from "node:assert/strict";
import { test } from "node:test";

import { StubContext } from "../support/stubContext.js";

/** Stands in for a finalized accumulator; the context never inspects it. */
const BATCHES = { id: "finalized" };

/** A stub-backed context whose RenderBatches calls are recorded verbatim. */
function contextWith()
{
  const context = StubContext();
  const al = context.GetRenderContextAL();
  const calls = [];

  al.RenderBatches = (batches, techniqueName, options) =>
  {
    calls.push({ batches, techniqueName, options });
    return true;
  };

  return { context, calls };
}

test("a submission reaches the backend as render work", () =>
{
  const { context, calls } = contextWith();

  assert.equal(context.RenderBatches(BATCHES), true);

  assert.equal(calls.length, 1);
  assert.equal(calls[0].batches, BATCHES, "by reference: Finalize wrote group runs into it");
  assert.equal(calls[0].techniqueName, "Main", "Carbon's DEFAULT_TECHNIQUE");
});

test("the accumulator is not copied", () =>
{
  // Copying would lose the group runs Finalize wrote, and the whole point of a
  // finalized accumulator is that the grouping already happened.
  const { context, calls } = contextWith();

  context.RenderBatches(BATCHES);

  assert.equal(calls[0].batches, BATCHES);
});

test("a named technique reaches the backend", () =>
{
  const { context, calls } = contextWith();

  context.RenderBatches(BATCHES, "Depth");

  assert.equal(calls[0].techniqueName, "Depth");
});

test("an override rides along with the submission", () =>
{
  // How Carbon draws a depth or picking pass over geometry authored for colour.
  const { context, calls } = contextWith();
  const override = { id: "depth-material" };

  context.RenderBatchesWithOverride(BATCHES, override, "Depth");

  assert.equal(calls[0].options.overrideMaterial, override);
  assert.equal(calls[0].techniqueName, "Depth");
});

test("a null override falls through to an ordinary submission", () =>
{
  // Carbon's own no-op (Tr2RenderContext.cpp:810-814). Treating null as "draw
  // nothing" would silently drop the default visualizer path, which passes null
  // for every normal frame.
  const { context, calls } = contextWith();

  context.RenderBatchesWithOverride(BATCHES, null);

  assert.equal(calls.length, 1);
  assert.equal(calls[0].options, undefined, "no override selector at all");
});

test("picking is a distinct submission, because it reads user data as an id", () =>
{
  const { context, calls } = contextWith();

  context.RenderBatchesForPicking(BATCHES);

  assert.equal(calls[0].options.picking, true);
});

test("no accumulator submits nothing rather than an empty draw", () =>
{
  const { context, calls } = contextWith();

  assert.equal(context.RenderBatches(null), false);
  assert.equal(context.RenderBatchesForPicking(undefined), false);
  assert.equal(calls.length, 0);
});

test("submissions keep their order among other backend calls", () =>
{
  // A submission that floated would land in the wrong pass.
  const { context, calls } = contextWith();
  const al = context.GetRenderContextAL();
  const order = [];
  const submit = al.RenderBatches;

  al.Clear = () => { order.push("clear"); return true; };
  al.RenderBatches = (...args) => { order.push("render-batches"); return submit(...args); };

  context.Clear({ clearColor: true });
  context.RenderBatches(BATCHES);
  context.RenderBatchesForPicking(BATCHES);

  assert.deepEqual(order, [ "clear", "render-batches", "render-batches" ]);
  assert.equal(calls.length, 2);
});
