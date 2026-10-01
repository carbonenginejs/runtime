import assert from "node:assert/strict";
import test from "node:test";
import { blue } from "../../npm/dist/global/blue/index.js";
import { PixelFormat } from "../../npm/dist/global/consts/renderContext/index.js";
import {
  EveSpaceScene, EveSpaceSceneRenderDriver, EveTurretFiringFX, EveUpdateContext,
  gTriDev, TriCurveSet, TriDevice, TriProjection, TriRenderJob, TriView, Tr2RenderJobs,
  Tr2RenderContext_GetMainThreadRenderContext, Tr2RenderTarget, Tr2StepExecuteRenderNode
} from "../../npm/dist/trinity/index.js";
import { ALResult, Tr2RenderContextALStub } from "../../npm/dist/trinityal/index.js";

test("EveUpdateContext preserves raw ticks and converts only the delta to seconds", () =>
{
  // Carbon EveUpdateContext.h:39-58; core/CcpTime.cpp:219-252.
  const context = new EveUpdateContext();
  assert.equal(context.GetTime(), 0);
  assert.equal(context.GetDeltaT(), 0);
  context.SetTime(10_000_000);
  assert.equal(context.GetTime(), 10_000_000);
  assert.equal(context.GetDeltaT(), 0, "first nonzero frame has no previous timestamp");
  context.SetTime(12_500_000);
  assert.equal(context.GetTime(), 12_500_000);
  assert.equal(context.lastTime, 10_000_000);
  assert.equal(context.GetDeltaT(), 0.25);
});

test("EveUpdateContext keeps Carbon's float32 duration and zero timestamp sentinel", () =>
{
  const context = new EveUpdateContext();
  context.SetTime(0);
  context.SetTime(10_000_000);
  assert.equal(context.GetDeltaT(), 0, "zero previous stamp is the native sentinel");
  context.SetTime(11_000_000);
  assert.equal(context.GetDeltaT(), Math.fround(0.1));
  context.SetTime(10_000_000);
  assert.equal(context.GetDeltaT(), Math.fround(-0.1), "the context does not clamp backwards time");
});

test("TriCurveSet converts selected tick clocks to double seconds before its driver", () =>
{
  // Carbon TriCurveSet.cpp:51-64 and the scalar seconds overload at line 78.
  const set = new TriCurveSet();
  const driverTimes = [];
  set.driver = { GetCurveSetTime(time) { driverTimes.push(time); return time; } };
  set.Update(30_000_000, 12_500_000);
  set.Update(30_000_000, 0);
  set.useRealTime = true;
  set.Update(1_000_001, 90_000_000);
  set.Update(1.25);
  set.Update(1.5, undefined);
  assert.deepEqual(driverTimes, [1.25, 0, 0.1000001, 1.25, 1.5]);
  assert.notEqual(driverTimes[2], Math.fround(0.1000001), "curve clocks retain double precision");
});

test("device render jobs preserve tick timestamps through the real scene context", t =>
{
  const previousDevice = gTriDev.device;
  const renderContext = Tr2RenderContext_GetMainThreadRenderContext();
  const previousAL = renderContext.GetRenderContextAL();
  renderContext.SetRenderContextAL(new Tr2RenderContextALStub());
  const device = new TriDevice();
  const simCurves = new TriCurveSet();
  const realCurves = new TriCurveSet();
  realCurves.useRealTime = true;
  simCurves.Play();
  realCurves.Play();
  device.curveSets.push(simCurves, realCurves);
  gTriDev.device = device;
  const target = new Tr2RenderTarget();
  const driver = new EveSpaceSceneRenderDriver();
  t.after(() =>
  {
    device.SetRenderJobs(null);
    driver.Destroy();
    target.Destroy();
    device.InvalidateAndUnregisterForTicks();
    blue.os.UnregisterForTicks(device, TriDevice.TICK_COOKIE);
    gTriDev.device = previousDevice;
    Tr2RenderContext_GetMainThreadRenderContext().SetRenderContextAL(previousAL);
  });
  assert.equal(device.CreateSimpleDevice({ canvas: true }, 64, 64), true);
  assert.equal(target.Create(64, 64, 1, PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM), ALResult.S_OK);
  assert.equal(target.isValid, true);
  const scene = new EveSpaceScene();
  driver.scene = scene;
  driver.view = new TriView();
  driver.projection = new TriProjection();
  // Native driver still updates the scene when rendering is disabled.
  driver.enableRendering = false;
  const step = new Tr2StepExecuteRenderNode();
  step.destinationTarget = target;
  step.node = driver;
  step.clearTargetOnFailure = false;
  const job = new TriRenderJob();
  job.steps.push(step);
  const jobs = new Tr2RenderJobs();
  jobs.recurring.push(job);
  device.SetRenderJobs(jobs);

  device.OnTick(20_000_000, 10_000_000);
  assert.equal(job.status, TriRenderJob.Status.RJ_DONE);
  assert.equal(scene.updateContext.GetTime(), 10_000_000);
  assert.equal(scene.updateContext.GetDeltaT(), 0);
  assert.equal(scene.updateTime, 10_000_000);
  assert.equal(scene.updateContext.renderContext, renderContext);
  assert.equal(simCurves.GetScaledTime(), 0);
  assert.equal(realCurves.GetScaledTime(), 0);
  device.OnTick(27_500_000, 12_500_000);
  assert.equal(job.status, TriRenderJob.Status.RJ_DONE);
  assert.equal(device.realTime, 27_500_000);
  assert.equal(device.simTime, 12_500_000);
  assert.equal(scene.updateContext.GetTime(), 12_500_000);
  assert.equal(scene.updateContext.GetDeltaT(), 0.25);
  assert.equal(scene.updateTime, 12_500_000);
  assert.equal(simCurves.GetScaledTime(), 0.25);
  assert.equal(realCurves.GetScaledTime(), 0.75);
  simCurves.Play();
  simCurves.Update(2);
  simCurves.Update(2.125);
  assert.equal(simCurves.GetScaledTime(), 0.125, "single-argument playback still accepts seconds");
});

test("firing cleanup passes raw Blue ticks into each fresh EveUpdateContext", t =>
{
  const firing = new EveTurretFiringFX();
  const contexts = [];
  const update = firing.UpdateAsynchronous;
  t.mock.method(firing, "UpdateAsynchronous", function(context)
  {
    contexts.push(context);
    return update.call(this, context);
  });
  let ticks = 25_000_000;
  t.mock.method(blue.os, "GetCurrentFrameTime", () => ticks);
  firing.CleanUp();
  ticks = 50_000_000;
  firing.CleanUp();
  assert.equal(contexts.length, 2);
  assert.notStrictEqual(contexts[0], contexts[1]);
  assert.deepEqual(contexts.map(context => context.GetTime()), [25_000_000, 50_000_000]);
  assert.deepEqual(contexts.map(context => context.GetDeltaT()), [0, 0]);
});
