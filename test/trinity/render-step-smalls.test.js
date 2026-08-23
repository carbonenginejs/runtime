import assert from "node:assert/strict";
import { test } from "node:test";

import {
  Tr2RenderNodeSprite2dScene,
  TriRenderStep,
  TriStepRenderFps,
  TriStepTestBlocking
} from "../../npm/dist/trinity/renderJob/index.js";

test("the blocking test step holds a job open until its flag clears", () =>
{
  const step = new TriStepTestBlocking();

  assert.equal(step.Execute(0, 0, null), TriRenderStep.Result.RS_IN_PROGRESS);

  step.inProgress = false;
  assert.equal(step.Execute(0, 0, null), TriRenderStep.Result.RS_OK);
});

test("the frame-rate average is recomputed only every quarter second", () =>
{
  const step = new TriStepRenderFps();

  // Samples inside the first interval accumulate but do not publish, except
  // the very first, which fires because the next-calculation time starts at 0.
  step.Sample(60, 0);
  assert.equal(step.averageFPS, 60, "the first sample publishes immediately");

  step.Sample(30, 0.1);
  step.Sample(30, 0.2);
  assert.equal(step.averageFPS, 60, "the displayed value holds between recalculations");

  step.Sample(30, 0.25);
  assert.equal(step.averageFPS, 30, "three samples of 30 average to 30");
});

test("milliseconds per frame come from the average, guarded against zero", () =>
{
  const step = new TriStepRenderFps();

  step.Sample(50, 0);
  assert.ok(Math.abs(step.averageMSPerFrame - 20) < 1e-6, "50 fps is 20 ms");

  const stalled = new TriStepRenderFps();
  stalled.Sample(0, 0);
  assert.equal(stalled.averageMSPerFrame, 0, "a zero average reports zero, not infinity");
});

test("the text colour follows Carbon's thresholds", () =>
{
  const step = new TriStepRenderFps();

  step.averageFPS = 60;
  assert.equal(step.GetTextColor(), TriStepRenderFps.Color.GOOD);

  step.averageFPS = 59.9;
  assert.equal(step.GetTextColor(), TriStepRenderFps.Color.FAIR, "the boundary is exclusive");

  step.averageFPS = 29.5;
  assert.equal(step.GetTextColor(), TriStepRenderFps.Color.POOR);
});

test("the display rect insets the viewport by the configured offsets", () =>
{
  const step = new TriStepRenderFps();
  step.displayX = 10;
  step.displayY = 4;

  assert.deepEqual(
    step.GetDisplayRect({ x: 100, y: 200, width: 800, height: 600 }),
    { left: 110, top: 204, right: 890, bottom: 796 });
});

test("the sprite scene node refuses to run without a destination or a scene", () =>
{
  const node = new Tr2RenderNodeSprite2dScene();

  assert.equal(node.Validate([], [], 0, 0), false, "no destination");

  node.scene = { id: "scene" };
  assert.equal(node.Validate([], [], 0, 0), false, "still no destination");
  assert.equal(node.Validate([ { width: 4, height: 4 } ], [], 0, 0), true);

  node.scene = null;
  assert.equal(node.Validate([ { width: 4, height: 4 } ], [], 0, 0), false, "no scene");
});

test("a background that cannot validate stops the node validating", () =>
{
  const node = new Tr2RenderNodeSprite2dScene();
  node.scene = { id: "scene" };

  const seen = [];
  node.background = {
    Validate(destinations, outputs)
    {
      seen.push({ destinations: destinations.length, outputs: outputs.length });
      return false;
    }
  };

  assert.equal(node.Validate([ { width: 4, height: 4 } ], [ "out" ], 1, 2), false);
  assert.deepEqual(seen, [ { destinations: 1, outputs: 0 } ],
    "the background validates against the same destinations but no outputs");
});
