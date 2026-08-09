import assert from "node:assert/strict";
import { test } from "node:test";

import { Tr2RenderContext } from "../npm/dist/core/index.js";

function viewWithTranslationX(tx)
{
  const matrix = new Array(16).fill(0);
  matrix[0] = matrix[5] = matrix[10] = matrix[15] = 1;
  matrix[12] = tx;
  return matrix;
}

test("PushViewport/PopViewport save and restore the current viewport", () =>
{
  const context = new Tr2RenderContext();
  context.SetViewport({ id: "a" });
  assert.equal(context.GetStackSizeViewport(), 0);

  context.PushViewport();
  assert.equal(context.GetStackSizeViewport(), 1);

  context.SetViewport({ id: "b" });
  assert.equal(context.GetViewport().id, "b");

  context.ClearIntents();
  assert.equal(context.PopViewport(), true);
  assert.equal(context.GetStackSizeViewport(), 0);
  assert.equal(context.GetViewport().id, "a", "viewport restored");

  const intents = context.GetIntents();
  assert.equal(intents.at(-1).type, "set-viewport", "restore is exposed to realization");
  assert.equal(intents.at(-1).viewport.id, "a");
});

test("PopViewport on an empty stack returns false and does not throw", () =>
{
  const context = new Tr2RenderContext();
  assert.equal(context.PopViewport(), false);
});

test("PushProjection/PopProjection save and restore the current projection", () =>
{
  const context = new Tr2RenderContext();
  context.SetProjection({ id: "p0" });
  context.PushProjection();
  context.SetProjection({ id: "p1" });
  assert.equal(context.GetProjection().id, "p1");

  assert.equal(context.PopProjection(), true);
  assert.equal(context.GetProjection().id, "p0");
  assert.equal(context.GetStackSizeProjection(), 0);
});

test("PushViewTransform/PopViewTransform save and restore the cached view matrix", () =>
{
  const context = new Tr2RenderContext();
  context.SetViewTransform(viewWithTranslationX(5));
  assert.equal(context.GetViewTransform()[12], 5);
  assert.equal(context.HasViewMatrix(), true);

  context.PushViewTransform();
  assert.equal(context.GetStackSizeViewTransform(), 1);

  context.SetViewTransform(viewWithTranslationX(9));
  assert.equal(context.GetViewTransform()[12], 9);

  assert.equal(context.PopViewTransform(), true);
  assert.equal(context.GetViewTransform()[12], 5, "view matrix restored");
  assert.equal(context.GetViewPosition()[0], -5, "eye position re-derived from inverse");
  assert.equal(context.GetStackSizeViewTransform(), 0);
});

test("TakeIntents consumes incrementally and exactly once", () =>
{
  const context = new Tr2RenderContext();
  context.SetViewport({ id: "a" });
  context.SetProjection({ id: "p" });

  const first = context.TakeIntents();
  assert.equal(first.length, 2);
  assert.equal(context.TakeIntents().length, 0, "already-taken intents are not returned again");

  context.SetRenderState(1, 2);
  assert.deepEqual(context.PeekIntents().map((i) => i.type), [ "set-render-state" ]);
  assert.equal(context.PeekIntents().length, 1, "peek does not advance the cursor");

  const second = context.TakeIntents();
  assert.equal(second.length, 1);
  assert.equal(second[0].type, "set-render-state");

  // GetIntents still returns the full history.
  assert.equal(context.GetIntents().length, 3);
});

test("ClearIntents resets the incremental cursor", () =>
{
  const context = new Tr2RenderContext();
  context.SetViewport({ id: "a" });
  context.TakeIntents();
  context.ClearIntents();

  context.SetViewport({ id: "b" });
  const taken = context.TakeIntents();
  assert.equal(taken.length, 1, "cursor reset so the new intent is taken");
  assert.equal(context.GetIntentCursor(), 1);
});
