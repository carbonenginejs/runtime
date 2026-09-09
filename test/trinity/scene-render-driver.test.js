// The frame driver. Carbon's EveSpaceScene::Render is an empty function body and
// TriStepRenderScene calls it anyway, so that path draws nothing in Carbon
// either; EveSpaceSceneRenderDriver is the class that actually drives a frame.
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  EveSpaceSceneRenderDriver,
  Tr2RenderContext
} from "../../npm/dist/trinity/index.js";
import { TriBatchType } from "../../npm/dist/global/consts/graphics/index.js";
import { StubContext, StubTarget } from "../support/stubContext.js";

/**
 * A stub-backed context whose backend calls are recorded in order.
 *
 * These assertions used to read the intent queue. The queue is gone, so they
 * read what the backend was actually asked to do - the same claims, one layer
 * closer to the truth.
 */
function recordingContext()
{
  const context = StubContext();
  const al = context.GetRenderContextAL();
  const calls = [];
  const clear = al.Clear.bind(al);

  al.Clear = (options) => { calls.push({ type: "clear" }); return clear(options); };

  // The walk is Trinity's (Carbon declares RenderBatches on Tr2RenderContext,
  // not on the AL), so the submission is recorded where it happens: the
  // context's own walk, which these stand-in accumulators need not satisfy.
  context.RenderBatchesInOrder = (batches) =>
  {
    calls.push({ type: "render-batches", batches });
    return 0;
  };

  return { context, calls };
}

const OPAQUE = TriBatchType.TRIBATCHTYPE_OPAQUE;
const DECAL = TriBatchType.TRIBATCHTYPE_DECAL;

/** Records the order the driver calls the scene's CPU steps in. */
function sceneRecording(calls)
{
  return {
    calls,
    Update(realTime, simTime) { calls.push([ "Update", realTime, simTime ]); },
    BlendLightingOverrides() { calls.push([ "BlendLightingOverrides" ]); },
    UpdateFogSettings() { calls.push([ "UpdateFogSettings" ]); },
    UpdateVisibility() { calls.push([ "UpdateVisibility" ]); },
    GetRenderables(out) { calls.push([ "GetRenderables" ]); return out; },
    PopulatePerFramePSData() { calls.push([ "PopulatePerFramePSData" ]); },
    PopulatePerFrameVSData() { calls.push([ "PopulatePerFrameVSData" ]); },
    StampFrameContext(values) { calls.push([ "StampFrameContext", values ]); }
  };
}

/** A batch manager whose map hands back a distinct accumulator per type. */
function batchManager(calls)
{
  // Real enough for Trinity's own walk to run over them and draw nothing.
  const accumulators = new Map([
    [ OPAQUE, { id: "opaque", GetBatches: () => [] } ],
    [ DECAL, { id: "decal", GetBatches: () => [] } ]
  ]);

  return {
    Collect(renderables, reason, renderContext)
    {
      calls.push([ "Collect", renderables, renderContext ]);
    },
    GetBatchMap()
    {
      return { GetAccumulator: type => accumulators.get(type) ?? null };
    }
  };
}

function driverOver(calls, { enableRendering = true } = {})
{
  const driver = new EveSpaceSceneRenderDriver();

  driver.scene = sceneRecording(calls);
  driver.view = { GetView: () => null };
  driver.projection = { GetProjection: () => null };
  driver.enableRendering = enableRendering;
  driver.SetBatchManager(batchManager(calls));

  return driver;
}

test("a driver with no scene, or no camera and no view, does not draw", () =>
{
  // Carbon returns rather than failing: a driver with nothing to draw is a
  // legitimate frame (EveSpaceSceneRenderDriver.cpp:406-425).
  const driver = new EveSpaceSceneRenderDriver();

  assert.equal(driver.Validate(), false);

  driver.scene = sceneRecording([]);
  assert.equal(driver.Validate(), false, "a scene alone is not enough");

  driver.view = {};
  driver.projection = {};
  assert.equal(driver.Validate(), true);
});

test("the frame runs Carbon's order", () =>
{
  const calls = [];
  const driver = driverOver(calls);

  assert.equal(driver.Execute([ { id: "target" } ], null, 1, 2, null, StubContext()), true);

  assert.deepEqual(calls.map(([ name ]) => name), [
    "StampFrameContext",
    "Update",
    "BlendLightingOverrides",
    "UpdateFogSettings",
    "UpdateVisibility",
    "GetRenderables",
    "Collect",
    // AFTER the gather: the blended sun colour is only current once lights have
    // been gathered (EveSpaceScene.cpp:1396-1426).
    "PopulatePerFramePSData",
    "PopulatePerFrameVSData"
  ]);
});

test("the camera reaches the renderer before the scene updates", () =>
{
  // Carbon's order (cpp:476 -> 479), so the scene's own update reads this
  // frame's view rather than the previous one's.
  const calls = [];

  driverOver(calls).Execute(null, null, 0, 0, null, StubContext());

  assert.ok(
    calls.findIndex(([ name ]) => name === "StampFrameContext")
      < calls.findIndex(([ name ]) => name === "Update")
  );
});

test("opaque and decal are submitted, in that order", () =>
{
  const { context, calls } = recordingContext();

  driverOver([]).Execute(null, null, 0, 0, null, context);

  const submissions = calls.filter(call => call.type === "render-batches");

  assert.deepEqual(submissions.map(call => call.batches.id), [ "opaque", "decal" ]);
});

test("the target and a clear are recorded before anything is submitted", () =>
{
  const { context, calls } = recordingContext();
  const target = StubTarget();

  driverOver([]).Execute([ target ], null, 0, 0, null, context);

  const types = calls.map(call => call.type);

  assert.ok(types.indexOf("clear") < types.indexOf("render-batches"));
});

test("rendering disabled still updates the scene", () =>
{
  // Not a no-op in Carbon either (cpp:408-419): simulation keeps running while
  // nothing is drawn, so a paused view does not freeze the world.
  const calls = [];
  const { context, calls: backend } = recordingContext();

  assert.equal(
    driverOver(calls, { enableRendering: false }).Execute(null, null, 0, 0, null, context),
    false
  );

  assert.ok(calls.some(([ name ]) => name === "Update"), "the scene still updated");
  assert.equal(calls.some(([ name ]) => name === "Collect"), false, "but nothing gathered");
  assert.equal(backend.filter(call => call.type === "render-batches").length, 0);
});

test("no batch manager means nothing is submitted, not a throw", () =>
{
  const { context, calls } = recordingContext();
  const driver = driverOver([]);

  driver.SetBatchManager(null);

  assert.equal(driver.Execute(null, null, 0, 0, null, context), false);
  assert.equal(calls.filter(call => call.type === "render-batches").length, 0);
});

test("the collect sees the render context it will be submitted through", () =>
{
  const calls = [];
  const context = StubContext();

  driverOver(calls).Execute(null, null, 0, 0, null, context);

  const [ , , passed ] = calls.find(([ name ]) => name === "Collect");

  assert.equal(passed, context);
});
