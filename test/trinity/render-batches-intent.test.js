// Carbon's RenderBatches family, which had no counterpart at all: nothing could
// submit a finalized accumulator, which is why CjsBatchManager.Collect had no
// caller anywhere in src.
import assert from "node:assert/strict";
import { test } from "node:test";

import { Tr2RenderContext } from "../../npm/dist/trinity/core/index.js";

function contextWith()
{
  return new Tr2RenderContext();
}

/** Stands in for a finalized accumulator; the context never inspects it. */
const BATCHES = { id: "finalized" };

test("a submission is recorded as render work", () =>
{
  const context = contextWith();

  assert.equal(context.RenderBatches(BATCHES), true);

  const [ intent ] = context.TakeIntents();

  assert.equal(intent.type, "render-batches");
  assert.equal(intent.batches, BATCHES, "by reference: Finalize wrote group runs into it");
  assert.equal(intent.techniqueName, "Main", "Carbon's DEFAULT_TECHNIQUE");
});

test("the accumulator is not copied", () =>
{
  // Copying would lose the group runs Finalize wrote, and the whole point of a
  // finalized accumulator is that the grouping already happened.
  const context = contextWith();

  context.RenderBatches(BATCHES);

  assert.equal(context.TakeIntents()[0].batches, BATCHES);
});

test("a named technique reaches the intent", () =>
{
  const context = contextWith();

  context.RenderBatches(BATCHES, "Depth");

  assert.equal(context.TakeIntents()[0].techniqueName, "Depth");
});

test("an override rides along with the submission", () =>
{
  // How Carbon draws a depth or picking pass over geometry authored for colour.
  const context = contextWith();
  const override = { id: "depth-material" };

  context.RenderBatchesWithOverride(BATCHES, override, "Depth");

  const [ intent ] = context.TakeIntents();

  assert.equal(intent.overrideMaterial, override);
  assert.equal(intent.techniqueName, "Depth");
});

test("a null override falls through to an ordinary submission", () =>
{
  // Carbon's own no-op (Tr2RenderContext.cpp:810-814). Treating null as "draw
  // nothing" would silently drop the default visualizer path, which passes null
  // for every normal frame.
  const context = contextWith();

  context.RenderBatchesWithOverride(BATCHES, null);

  const [ intent ] = context.TakeIntents();

  assert.equal(intent.type, "render-batches");
  assert.equal(Object.hasOwn(intent, "overrideMaterial"), false);
});

test("picking is a distinct submission, because it reads user data as an id", () =>
{
  const context = contextWith();

  context.RenderBatchesForPicking(BATCHES);

  assert.equal(context.TakeIntents()[0].picking, true);
});

test("no accumulator records nothing rather than an empty draw", () =>
{
  const context = contextWith();

  assert.equal(context.RenderBatches(null), false);
  assert.equal(context.RenderBatchesForPicking(undefined), false);
  assert.equal(context.TakeIntents().length, 0);
});

test("submissions keep their order among other intents", () =>
{
  // The frame plan turns intents into passes in order; a submission that
  // floated would land in the wrong pass.
  const context = contextWith();

  context.Clear({ color: true });
  context.RenderBatches(BATCHES);
  context.RenderBatchesForPicking(BATCHES);

  assert.deepEqual(
    context.TakeIntents().map(intent => intent.type),
    [ "clear", "render-batches", "render-batches" ]
  );
});
