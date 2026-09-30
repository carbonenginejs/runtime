import assert from "node:assert/strict";
import test from "node:test";
import { blue } from "../../npm/dist/global/blue/index.js";
import { TriDevice, gTriDev, Tr2RenderContext_GetMainThreadRenderContext } from "../../npm/dist/trinity/core/index.js";
import { Tr2RenderContextALStub } from "../../npm/dist/trinityal/index.js";
import { Tr2RenderJobs } from "../../npm/dist/trinity/renderJob/index.js";
import { createDemoFramePump } from "./webgpu/demo/demoFramePump.js";

test("demo pump draws inside exactly one device frame and closes after a draw error", () => {
  const context = Tr2RenderContext_GetMainThreadRenderContext();
  const previousDevice = gTriDev.device;
  const previousAL = context.GetRenderContextAL();
  const al = new Tr2RenderContextALStub();
  al.CreateDevice();
  context.SetRenderContextAL(al);
  const device = new TriDevice();
  gTriDev.device = device;
  const events = [];
  const begin = al.BeginScene.bind(al), end = al.EndScene.bind(al);
  al.BeginScene = () => { events.push("begin"); return begin(); };
  al.EndScene = () => { events.push("end"); return end(); };
  let fail = false;
  const pump = createDemoFramePump(device, () => { events.push("draw"); if (fail) throw new Error("draw failed"); });
  try {
    pump.render();
    assert.deepEqual(events, ["begin", "draw", "end"]);
    assert.equal(device.frameCounter, 1);
    events.length = 0;
    fail = true;
    assert.throws(() => pump.render(), /draw failed/);
    assert.deepEqual(events, ["begin", "draw", "end"]);
    events.length = 0;
    fail = false;
    pump.render();
    assert.deepEqual(events, ["begin", "draw", "end"]);
    // Negative control: the old manual frame after PumpOS doubles boundaries.
    al.BeginScene(); al.EndScene();
    assert.equal(events.filter(e => e === "begin").length, 2);
    pump.dispose(); pump.dispose();
    assert.equal(pump.render(), false);
    assert.equal(blue.os.IsRegisteredForTicks(device), false);
    assert.equal(device.GetRenderJobs(), null);
  } finally {
    pump.dispose();
    context.SetRenderContextAL(previousAL);
    gTriDev.device = previousDevice;
  }
});

test("demo disposal preserves an existing schedule and tick registration", () => {
  const device = new TriDevice();
  const jobs = new Tr2RenderJobs();
  device.SetRenderJobs(jobs);
  blue.os.RegisterForTicks(device, TriDevice.TICK_COOKIE);
  const pump = createDemoFramePump(device, () => {});
  try {
    assert.equal(jobs.recurring.length, 1);
    pump.dispose();
    assert.equal(jobs.recurring.length, 0);
    assert.equal(device.GetRenderJobs(), jobs);
    assert.equal(blue.os.IsRegisteredForTicks(device), true);
  } finally { pump.dispose(); blue.os.UnregisterForTicks(device, TriDevice.TICK_COOKIE); }
});
