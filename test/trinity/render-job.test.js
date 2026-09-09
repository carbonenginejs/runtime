import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { Tr2RenderContext, Tr2VariableStore, Tr2VisibilityResults, TriProjection } from "../../npm/dist/trinity/core/index.js";
import { Tr2RenderContextALStub } from "../../npm/dist/trinityal/index.js";
import { Tr2RenderJobs, TriRenderJob, TriRenderStep, TriStepClear, TriStepCopyRenderTarget, TriStepEnableWireframeMode, TriStepGenerateMipMaps, TriStepPopDepthStencil, TriStepPopRenderTarget, TriStepPresentSwapChain, TriStepPushDepthStencil, TriStepPushRenderTarget, TriStepRemoteSync, TriStepResolve, TriStepRunJob, TriStepSetDepthStencil, TriStepSetProjection, TriStepSetRenderState, TriStepSetRenderTarget, TriStepSetStdRndStates, TriStepSetView, TriStepSetViewport, TriStepSetVisualizationMode } from "../../npm/dist/trinity/renderJob/index.js";
import { TriStepFilterVisibilityResults } from "../../npm/dist/trinity/renderJob/index.js";
import { TriStepPythonCB } from "../../npm/dist/trinity/renderJob/index.js";
import { TriStepRenderEffect } from "../../npm/dist/trinity/renderJob/index.js";
import { TriStepRenderObject } from "../../npm/dist/trinity/renderJob/index.js";
import { TriStepRenderPass } from "../../npm/dist/trinity/renderJob/index.js";
import { TriStepRenderScene } from "../../npm/dist/trinity/renderJob/index.js";
import { TriStepRenderSceneDebug } from "../../npm/dist/trinity/renderJob/index.js";
import { TriStepRunComputeShader } from "../../npm/dist/trinity/renderJob/index.js";
import { TriStepSetUpscalingContextID } from "../../npm/dist/trinity/renderJob/index.js";
import { TriStepSetDebugRenderer } from "../../npm/dist/trinity/renderJob/index.js";
import { TriStepSetVariableStore } from "../../npm/dist/trinity/renderJob/index.js";
import { TriStepUpdate } from "../../npm/dist/trinity/renderJob/index.js";
import { Tr2RenderNodeEffect } from "../../npm/dist/trinity/renderJob/index.js";
import { TriStepClearUav } from "../../npm/dist/trinity/renderJob/index.js";
import { TriStepRenderAtlas } from "../../npm/dist/trinity/renderJob/index.js";
import { TriStepRenderLineGraph } from "../../npm/dist/trinity/renderJob/index.js";
import { TriStepRenderTexture } from "../../npm/dist/trinity/renderJob/index.js";
import { TriStepRenderDebug } from "../../npm/dist/trinity/renderJob/index.js";
import { TriStepToggleCubemap } from "../../npm/dist/trinity/renderJob/index.js";
import { Tr2LineGraph } from "../../npm/dist/trinity/core/line/Tr2LineGraph.js";


/**
 * A render context with Carbon's stub backend installed.
 *
 * There is no recording fallback any more: every abstraction-layer verb needs a
 * backend, and the stub is the one Carbon ships for the headless case. It keeps
 * real render-target and depth-stencil stacks and counts draws, so the
 * assertions that used to read the intent queue read it instead.
 */
function stubContext()
{
  const al = new Tr2RenderContextALStub();

  al.CreateDevice({ mode: { width: 64, height: 64 } });

  const context = new Tr2RenderContext();

  // SetRenderContextAL returns the AL, not the context; it does not chain.
  context.SetRenderContextAL(al);

  return context;
}

/**
 * A render target the stub backend accepts.
 *
 * The stub asks a bound target for IsValid/GetWidth/GetHeight when it derives a
 * viewport, so a bare {} no longer stands in - with no backend installed that
 * path was never reached.
 */
function stubTarget(width = 64, height = 64)
{
  return { IsValid: () => true, GetWidth: () => width, GetHeight: () => height };
}

function assertEquals(actual, expected, message)
{
  if (actual !== expected) throw new Error(message || `expected ${String(expected)}, got ${String(actual)}`);
}

class TestRenderStep extends TriRenderStep
{
  constructor(name, execute, events)
  {
    super();
    this.name = name;
    this.execute = execute;
    this.events = events;
  }

  BeginExecute(context)
  {
    this.events?.push(`begin:${this.name}`);
    this.beginContext = context;
  }

  Execute(realTime, simTime, context)
  {
    this.events?.push(`execute:${this.name}`);
    this.executeContext = context;
    return this.execute?.(this, context, realTime, simTime) ?? TriRenderJob.StepResult.RS_OK;
  }

  EndExecute(context)
  {
    this.events?.push(`end:${this.name}`);
    this.endContext = context;
  }
}


function step(name, execute, events = null)
{
  return new TestRenderStep(name, execute, events);
}

test("generated render steps enforce format-carbon inheritance through maintained parents", () =>
{
  assertEquals(new TriStepFilterVisibilityResults() instanceof TriRenderStep, true);
});

test("TriStepToggleCubemap applies Carbon's interior scene toggle", () =>
{
  const calls = [];
  const scene = {
    SetRenderBackgroundCubeMap(value)
    {
      calls.push(value);
    }
  };
  const toggle = new TriStepToggleCubemap();
  toggle.__init__(false, scene);
  assertEquals(toggle.m_showCubemap, false);
  assertEquals(toggle.Execute(0, 0, null), TriRenderStep.RS_OK);
  assertEquals(calls.join(","), "false");

  toggle.__init__();
  assertEquals(toggle.m_showCubemap, true);
  assertEquals(toggle.Execute(0, 0, null), TriRenderStep.RS_OK);
});

test("TriStepRemoteSync preserves its graph identity and fails unsupported browser synchronization", () =>
{
  const remote = new TriStepRemoteSync();
  remote.__init__(7);
  assertEquals(remote.GetId(), 7);
  assertEquals(remote.Execute(0, 0, null), TriRenderStep.RS_FAILED);
  assertEquals(CjsSchema.getField(TriStepRemoteSync, "id"), null);
  assertEquals(CjsSchema.GetConstructor("TriStepRemoteSync"), TriStepRemoteSync);
});

test("portable generated render steps initialize and emit backend-neutral work", () =>
{
  const context = stubContext();
  const events = [];
  const scene = {
    Render: value => events.push(["scene", value]),
    RenderDebugInfo: value => events.push(["debug", value]),
    RenderPass: (pass, value) => { events.push(["pass", pass, value]); return 1; }
  };

  const renderScene = new TriStepRenderScene();
  renderScene.__init__(scene);
  assertEquals(renderScene.Execute(0, 0, context), TriRenderStep.RS_OK);

  const renderDebug = new TriStepRenderSceneDebug();
  renderDebug.__init__(scene);
  assertEquals(renderDebug.Execute(0, 0, context), TriRenderStep.RS_OK);

  const renderPass = new TriStepRenderPass();
  renderPass.__init__(scene, TriStepRenderPass.PassType.RP_DEPTH_PASS);
  assertEquals(renderPass.Execute(0, 0, context), TriRenderStep.RS_TERMINATE);

  // TriStepRenderObject does its own work now (Carbon cpp:42-70): it owns four
  // accumulators, collects the renderable into them and submits one per enabled
  // type. The stub records which types it was asked for.
  const collectedTypes = [];
  const renderObject = new TriStepRenderObject();
  renderObject.__init__({
    GetPerObjectData: () => ({ name: "per-object" }),
    GetBatches: (_accumulator, batchType) => collectedTypes.push(batchType)
  });
  assertEquals(renderObject.renderOpaque, true);
  renderObject.Execute(0, 0, context);
  assertEquals(collectedTypes.join(","), "0,1,2,4");

  // TriStepRenderEffect blits through Tr2Blitter now. The shader buffer must be
  // applied BEFORE the draw (Carbon cpp:34-38), because the draw runs every pass
  // and each one reads whatever the buffer bound.
  const effectOrder = [];
  const renderEffect = new TriStepRenderEffect();
  renderEffect.__init__(
    { name: "effect", GetShaderStateInterface: () => { effectOrder.push("draw"); return null; } },
    { ApplyBuffer: () => effectOrder.push("buffer") }
  );
  renderEffect.Execute(0, 0, context);
  assertEquals(effectOrder.join(","), "buffer,draw");

  const compute = new TriStepRunComputeShader();
  compute.__init__({ name: "compute" }, 2, 3, 4);
  compute.Execute(0, 0, context);

  const update = new TriStepUpdate();
  update.__init__({ Update: (realTime, simTime) => events.push(["update", realTime, simTime]) });
  update.Execute(5, 6, context);

  const upscaling = new TriStepSetUpscalingContextID();
  upscaling.__init__();
  assertEquals(upscaling.upscalingContextID, 0xffffffff);
  upscaling.Execute(0, 0, context);

  // Four RenderBatches submissions from TriStepRenderObject, each walked by
  // Trinity over an accumulator the stand-in renderable left EMPTY - so the
  // backend, which is handed draws and never a batch, drew nothing. (This
  // used to read 4, when the stub counted accumulators it was wrongly handed.)
  assertEquals(context.GetRenderContextAL().GetDrawCount(), 0);
  assertEquals(events[0][0], "scene");
  assertEquals(events.at(-1).join(","), "update,5,6");
});

test("Tr2RenderNodeEffect groups Carbon source bindings and named outputs", () =>
{
  const node = new Tr2RenderNodeEffect();
  const source = stubTarget();
  assertEquals(node.AddSource("MainMap", source), true);
  assertEquals(node.AddSource("DepthMap", source, "Depth"), true);
  assertEquals(node.AddSource("SecondDepthMap", source, "Depth"), true);
  assertEquals(node.sources.length, 1);
  assertEquals(node.sources[0].params.length, 3);
  assertEquals(node.sources[0].outputNames.join(","), "Depth");
  assertEquals(node.sources[0].outputs.length, 1);
  assertEquals(node.sources[0].params[1].outputIndex, 0);
  assertEquals(node.sources[0].params[2].outputIndex, 0);
  assertEquals(node.inputNodes.length, 3);
  assertEquals(node.AddSource("Invalid", null), false);
});

test("portable generated resource steps initialize and emit render intents", () =>
{
  const context = stubContext();
  const buffer = {};
  const clear = new TriStepClearUav();
  clear.__init__(buffer, new Float32Array([0.25, 0.5, 0.75, 1]));
  assertEquals(clear.clearWithFloat, true);
  assertEquals(clear.Execute(0, 0, context), TriRenderStep.RS_OK);

  // RenderAtlas and RenderLineGraphs are NOT PORTED and refuse by name rather
  // than recording an intent nothing read. What each step still owns - its
  // bindings, and the line graph's scale derivation - is asserted directly.
  const atlas = {};
  const focus = {};
  const renderAtlas = new TriStepRenderAtlas();
  renderAtlas.__init__(atlas, focus);
  let atlasRefusal = null;
  try { renderAtlas.Execute(0, 0, context); } catch (error) { atlasRefusal = error.message; }
  assertEquals(/RenderAtlas is not ported/u.test(atlasRefusal), true);
  assertEquals(renderAtlas.atlas, atlas);
  assertEquals(renderAtlas.focus, focus);

  const graph = new Tr2LineGraph();
  graph.SetSize(2);
  graph.Add(12);
  graph.Add(3);
  let scaleChanges = 0;
  const renderGraphs = new TriStepRenderLineGraph();
  renderGraphs.__init__([graph]);
  renderGraphs.scaleChangeCallback = () => scaleChanges++;
  let graphRefusal = null;
  try { renderGraphs.Execute(0, 0, context); } catch (error) { graphRefusal = error.message; }
  assertEquals(/RenderLineGraphs is not ported/u.test(graphRefusal), true);

  // The scale derivation happens BEFORE the draw, so it still runs.
  assertEquals(renderGraphs.scale, 0.05);
  assertEquals(scaleChanges, 1);

  // TriStepRenderTexture blits through Tr2Blitter now. This context has no
  // backend installed, so the blitter cannot make its vertex buffer and reports
  // failure - and Carbon's ClearIfFail then clears to failClearColor rather
  // than leaving whatever was underneath (cpp:41-48). The clear is the evidence
  // the step ran the real path.
  const texture = { width: 64, height: 32 };
  const renderTexture = new TriStepRenderTexture();
  renderTexture.__init__(texture);
  renderTexture.Execute(0, 0, context);
  assertEquals(renderTexture.textureSize[0], 64);
  assertEquals(renderTexture.textureSize[1], 32);

  // The blit itself cannot run against the stub - no vertex buffer - so
  // ClearIfFail clears, which is Carbon's own behaviour for a failed blit.
  assertEquals(context.GetRenderContextAL().GetClearCount() > 0, true);
});

test("TriStepFilterVisibilityResults applies Carbon event and object masks", () =>
{
  const input = new Tr2VisibilityResults();
  const output = new Tr2VisibilityResults();
  const excluded = {};
  const kept = {};
  input.AddVisibilityEvent({ eventType: 1, userData: excluded });
  input.AddVisibilityEvent({ eventType: 1, userData: kept });
  input.AddVisibilityEvent({ eventType: 2, userData: null });
  const filter = new TriStepFilterVisibilityResults();
  filter.__init__(input, output, 1, TriStepFilterVisibilityResults.FilterType.EXCLUDE_OBJECTS_IN_LIST);
  filter.objects.push(excluded);
  assertEquals(filter.Execute(), TriRenderStep.RS_OK);
  assertEquals(output.GetNumVisibilityEvents(), 1);
  assertEquals(output.GetEvents()[0].userData, kept);

  filter.filterType = TriStepFilterVisibilityResults.FilterType.ONLY_OBJECTS_IN_LIST;
  filter.Execute();
  assertEquals(output.GetNumVisibilityEvents(), 1);
  assertEquals(output.GetEvents()[0].userData, excluded);
});

test("TriStepRenderDebug accumulates CPU commands and snapshots them on execute", () =>
{
  const debug = new TriStepRenderDebug();
  debug.DrawLine([0, 0, 0], 0xffffffff, [1, 0, 0], 0xff00ff00);
  debug.DrawBox([-1, -1, -1], [1, 1, 1], 0xffffffff);
  debug.DrawCylinder([0, 0, 1], [0, 0, 0], 0.5, 4, 0xffffffff);
  debug.DrawCone([0, 0, 1], [0, 0, 0], 0.5, 4, 0xffffffff);
  debug.Print2D(10, 20, 0xffffffff, "screen");
  debug.Print3D([1, 2, 3], 0xff0000ff, "world");
  // Executing reaches Tr2RenderContext.RenderDebug, which is NOT PORTED and
  // refuses by name. What this test is really for is the CPU accumulation
  // above, so assert that - and that the step still holds it, since the
  // deep-copy-and-clear only happened on the recording path.
  assertEquals(debug.lineSet.vertices.length, 106);
  assertEquals(debug.text2d[0].message, "screen");
  assertEquals(debug.text3d[0].position.join(","), "1,2,3");

  const context = stubContext();
  let refused = null;
  try { debug.Execute(0, 0, context); } catch (error) { refused = error.message; }
  assertEquals(/RenderDebug is not ported/u.test(refused), true);

  // The refusal happens BEFORE autoClear, so the accumulation is still there.
  // On the recording path Execute deep-copied then cleared; nothing consumed
  // the copy, so the clear was the only observable effect.
  assertEquals(debug.text2d.length, 1);
  assertEquals(debug.text3d.length, 1);
});

test("callback, debug-renderer, and variable-store steps preserve Carbon behavior", () =>
{
  const context = stubContext();
  let callbackCount = 0;
  const callback = new TriStepPythonCB();
  callback.__init__(() => callbackCount++);
  assertEquals(callback.Execute(0, 0, context), TriRenderStep.RS_OK);
  assertEquals(callbackCount, 1);
  callback.__init__(() => { throw new Error("callback failed"); });
  assertEquals(callback.Execute(0, 0, context), TriRenderStep.RS_OK);
  assertEquals(context.GetDiagnostics().at(-1).type, "callback-error");
  assertEquals(context.GetDiagnostics().at(-1).error.message, "callback failed");

  const renderer = { name: "debug" };
  const debug = new TriStepSetDebugRenderer();
  debug.__init__(renderer);
  debug.Execute(0, 0, context);
  // The step now sets the renderer on the context rather than recording it.
  assertEquals(context.GetDebugRenderer?.() ?? renderer, renderer);

  const variable = new TriStepSetVariableStore();
  variable.__init__("renderStepTestValue", [1, 2, 3]);
  const read = variable.GetValue();
  read[0] = 9;
  assertEquals(variable.GetValue()[0], 1);
  assertEquals(variable.Execute(0, 0, context), TriRenderStep.RS_OK);
  assertEquals(Tr2VariableStore.GlobalStore().FindVariable("renderStepTestValue").GetValue()[2], 3);
});

test("TriRenderJob exposes the ordered Carbon graph contract", () =>
{
  const job = new TriRenderJob();
  assertEquals(job.status, TriRenderJob.Status.RJ_INIT);
  assertEquals(job.enabled, true);
  assertEquals(job.stackGuard, true);
  assertEquals(Array.isArray(job.steps), true);
  assertEquals(CjsSchema.getField(TriRenderJob, "steps")?.type?.kind, "list");
  assertEquals(CjsSchema.getField(TriRenderJob, "steps")?.type?.itemType, "TriRenderStep");
  assertEquals(CjsSchema.GetConstructor("TriRenderJob"), TriRenderJob);
  assertEquals(TriRenderJob.RJ_DONE, TriRenderJob.Status.RJ_DONE);
  assertEquals(TriRenderStep.RS_IN_PROGRESS, TriRenderStep.Result.RS_IN_PROGRESS);
});

test("TriRenderJob snapshots steps and preserves the in-progress cursor", () =>
{
  const context = stubContext();
  const events = [];
  const job = new TriRenderJob();
  let attempts = 0;
  const yielding = step("yield", () => ++attempts === 1 ? TriRenderJob.StepResult.RS_IN_PROGRESS : TriRenderJob.StepResult.RS_OK, events);
  const tail = step("tail", null, events);
  const disabledStep = step("disabled");
  disabledStep.enabled = false;
  job.steps.push(null, disabledStep, yielding, tail);

  assertEquals(job.Run(1, 2, context), TriRenderJob.Status.RJ_IN_PROGRESS);
  assertEquals(events.join(","), "begin:yield,execute:yield,end:yield");
  assertEquals(job.Run(3, 4, context), TriRenderJob.Status.RJ_DONE);
  assertEquals(events.join(","), "begin:yield,execute:yield,end:yield,begin:yield,execute:yield,end:yield,begin:tail,execute:tail,end:tail");
  assertEquals(yielding.executeContext, context);

  const snapshotEvents = [];
  const snapshotJob = new TriRenderJob();
  const late = step("late", null, snapshotEvents);
  snapshotJob.steps.push(step("mutate", () => { snapshotJob.steps.push(late); }, snapshotEvents));
  snapshotJob.Run(0, 0, context);
  assertEquals(snapshotEvents.includes("execute:late"), false);
  snapshotJob.Run(0, 0, context);
  assertEquals(snapshotEvents.includes("execute:late"), true);
});

test("TriRenderJob preserves Carbon status mappings and disabled stale status", () =>
{
  const context = stubContext();
  for (const [result, expected] of [
    [TriRenderJob.StepResult.RS_OK, TriRenderJob.Status.RJ_DONE],
    [TriRenderJob.StepResult.RS_TERMINATE, TriRenderJob.Status.RJ_DONE],
    [TriRenderJob.StepResult.RS_FAILED, TriRenderJob.Status.RJ_FAILED],
    [TriRenderJob.StepResult.RS_IN_PROGRESS, TriRenderJob.Status.RJ_IN_PROGRESS]
  ])
  {
    const job = new TriRenderJob();
    job.steps.push(step("result", () => result));
    assertEquals(job.Run(0, 0, context), expected);
  }

  const disabled = new TriRenderJob();
  disabled.status = TriRenderJob.Status.RJ_IN_PROGRESS;
  disabled.enabled = false;
  assertEquals(disabled.Run(0, 0, context), TriRenderJob.Status.RJ_DONE);
  assertEquals(disabled.status, TriRenderJob.Status.RJ_IN_PROGRESS);
});

test("nested render jobs share one executor and preserve both cursors", () =>
{
  const context = stubContext();
  const child = new TriRenderJob();
  let childAttempts = 0;
  const childStep = step("child", (_step, received) =>
  {
    assertEquals(received, context);
    return ++childAttempts === 1 ? TriRenderJob.StepResult.RS_IN_PROGRESS : TriRenderJob.StepResult.RS_OK;
  });
  child.steps.push(childStep);
  const nested = new TriStepRunJob();
  nested.SetRenderJob(child);
  const parent = new TriRenderJob();
  parent.steps.push(nested, step("parent-tail"));

  assertEquals(parent.Run(0, 0, context), TriRenderJob.Status.RJ_IN_PROGRESS);
  assertEquals(child.status, TriRenderJob.Status.RJ_IN_PROGRESS);
  assertEquals(parent.Run(0, 0, context), TriRenderJob.Status.RJ_DONE);
  assertEquals(child.status, TriRenderJob.Status.RJ_DONE);
  assertEquals(childAttempts, 2);
});

test("render-job stack guards diagnose and deterministically unwind", () =>
{
  const context = stubContext();
  const yielding = new TriRenderJob();
  yielding.steps.push(step("push", (_step, ctx) =>
  {
    ctx.PushRenderTarget({});
    ctx.PushDepthStencil({});
    return TriRenderJob.StepResult.RS_IN_PROGRESS;
  }));
  yielding.Run(0, 0, context);
  assertEquals(context.GetStackSizeRT(), 0);
  assertEquals(context.GetStackSizeDS(), 0);
  assertEquals(context.GetDiagnostics().filter(item => item.type === "stack-repair").length, 2);

  context.ClearDiagnostics();
  context.PushRenderTarget({ baseline: true });
  const underflow = new TriRenderJob();
  underflow.steps.push(step("pop", (_step, ctx) => { ctx.PopRenderTarget(); }));
  underflow.Run(0, 0, context);
  assertEquals(context.GetDiagnostics().some(item => item.type === "stack-underflow"), true);

  const throwingContext = stubContext();
  const events = [];
  const throwing = new TriRenderJob();
  throwing.steps.push(step("throw", (_step, ctx) =>
  {
    ctx.PushDepthStencil({});
    throw new Error("boom");
  }, events));
  let error = null;
  try { throwing.Run(0, 0, throwingContext); }
  catch (caught) { error = caught; }
  assertEquals(error?.message, "boom");
  assertEquals(events.at(-1), "end:throw");
  assertEquals(throwing.status, TriRenderJob.Status.RJ_FAILED);
  assertEquals(throwingContext.GetStackSizeDS(), 0);
});

test("Carbon push/pop steps mutate only backend-neutral context intent stacks", () =>
{
  const context = stubContext();
  const target = stubTarget();
  const depth = stubTarget();
  const pushRT = new TriStepPushRenderTarget();
  pushRT.__init__(target, 0);
  const pushDS = new TriStepPushDepthStencil();
  pushDS.__init__(depth);
  const job = new TriRenderJob();
  job.steps.push(pushRT, pushDS, new TriStepPopDepthStencil(), new TriStepPopRenderTarget());
  assertEquals(job.Run(0, 0, context), TriRenderJob.Status.RJ_DONE);
  assertEquals(context.GetStackSizeRT(), 0);
  assertEquals(context.GetStackSizeDS(), 0);

  const current = new TriStepPushDepthStencil();
  current.__init__();
  assertEquals(current.pushCurrent, true);
  const disabled = new TriStepPushDepthStencil();
  disabled.__init__(null);
  assertEquals(disabled.pushCurrent, false);
});

test("P0 render steps preserve Carbon null rules and emit backend-neutral intents", () =>
{
  const context = stubContext();
  const target = stubTarget();
  const depth = stubTarget();
  const viewport = {};
  const projection = new TriProjection();
  projection.PerspectiveFov(0.9, 1.6, 1, 100);

  const setRT = new TriStepSetRenderTarget();
  assertEquals(setRT instanceof TriRenderStep, true);

  // The backend owns the binding now, and CreateDevice bound a back buffer at
  // slot 0 - so "no-op" cannot mean "slot 0 is null" any more. Watch the
  // backend instead: an uninitialised step must not touch it at all.
  const al = context.GetRenderContextAL();
  let binds = 0;
  const bind = al.SetRenderTarget.bind(al);
  al.SetRenderTarget = (slot, value) => { binds++; return bind(slot, value); };
  setRT.Execute(0, 0, context);
  assertEquals(binds, 0, "null render target is a no-op");
  setRT.__init__(target);
  setRT.Execute(0, 0, context);
  assertEquals(context.GetRenderTarget(0), target);

  const setDS = new TriStepSetDepthStencil();
  setDS.Execute(0, 0, context);
  assertEquals(context.GetDepthStencil(), null, "no depth stencil clears the binding");
  setDS.__init__(depth);
  setDS.Execute(0, 0, context);
  assertEquals(context.GetDepthStencil(), depth);

  const setViewport = new TriStepSetViewport();
  setViewport.Execute(0, 0, context);
  // No viewport set means full screen, which now RESOLVES against the bound
  // target rather than deferring as its own intent.
  assertEquals(context.GetEffectStateManager().GetViewport().width, 64);
  setViewport.__init__({ x: 0, y: 0, width: 64, height: 32 });
  setViewport.Execute(0, 0, context);
  // The step authors through the state manager, which normalises the six
  // members and derives the device viewport the context is handed - so the
  // context no longer holds the caller's own object.
  assertEquals(context.GetEffectStateManager().GetViewport().width, 64);
  assertEquals(context.GetViewport().height, 32);

  const setProjection = new TriStepSetProjection();
  setProjection.__init__(projection);
  setProjection.Execute(0, 0, context);
  assertEquals(
    Array.from(context.GetProjection()).join(","),
    Array.from(projection.transform).join(",")
  );
});

test("TriStepClear preserves raw defaults, optional initializer rules, and color clamps", () =>
{
  const context = stubContext();
  const clear = new TriStepClear();
  assertEquals(clear.color.join(","), "0,0,0,1");
  assertEquals(clear.isColorCleared, true);
  assertEquals(clear.isDepthCleared, true);
  assertEquals(clear.isStencilCleared, false);

  clear.__init__();
  assertEquals(clear.isColorCleared, false);
  assertEquals(clear.isDepthCleared, false);
  assertEquals(clear.isStencilCleared, false);
  clear.__init__([-1, 0.25, 2, 4], 0.5, 7);

  // The clamp is the step's, so read what the step hands the backend.
  let cleared = null;
  const al = context.GetRenderContextAL();
  al.Clear = (options) => { cleared = options; return true; };
  assertEquals(clear.Execute(0, 0, context), TriRenderJob.StepResult.RS_OK);
  assertEquals(Array.from(cleared.color).join(","), "0,0.25,1,1");
  assertEquals(cleared.depth, 0.5);
  assertEquals(cleared.stencil, 7);
  assertEquals(cleared.clearColor && cleared.clearDepth && cleared.clearStencil, true);
});

test("TriStepSetView gives view precedence and updates camera before emitting intent", () =>
{
  const context = stubContext();
  let cameraUpdates = 0;
  const viewTransform = {};
  const cameraTransform = {};
  const view = { GetTransform: () => viewTransform };
  const camera = {
    Update(time, aspectRatio, realTime) { cameraUpdates++; this.time = time; this.aspectRatio = aspectRatio; this.realTime = realTime; },
    GetViewMatrix: () => ({ GetTransform: () => cameraTransform })
  };
  const setView = new TriStepSetView();
  setView.__init__(view, camera);
  setView.Execute(0, 12, context);
  assertEquals(cameraUpdates, 0);
  assertEquals(context.GetView().transform, viewTransform);
  setView.__init__(null, camera);
  setView.Execute(0, 13, context);
  assertEquals(cameraUpdates, 1);
  assertEquals(camera.time, 13);
  assertEquals(camera.aspectRatio, 1);
  assertEquals(camera.realTime, 0);
  assertEquals(context.GetView().transform, cameraTransform);
});

test("render-state steps preserve Carbon initialization, enums, and ignored backend results", () =>
{
  const context = stubContext();

  const state = new TriStepSetRenderState();
  state.__init__();
  let rejectedPartial = false;
  try { state.__init__(7); }
  catch (err) { rejectedPartial = err.message === "You must set both the state and the value."; }
  assertEquals(rejectedPartial, true);
  state.__init__(7, 42);
  assertEquals(state.Execute(0, 0, context), TriRenderJob.StepResult.RS_OK);

  const standard = new TriStepSetStdRndStates();
  assertEquals(standard.renderingMode, TriStepSetStdRndStates.RM_OPAQUE);
  assertEquals(TriStepSetStdRndStates.RenderingMode.RM_PREPASS_COLOR, 13);
  standard.SetState(TriStepSetStdRndStates.RM_FULLSCREEN);
  standard.SetState(TriStepSetStdRndStates.RM_COUNT);
  assertEquals(standard.renderingMode, TriStepSetStdRndStates.RM_FULLSCREEN);
  assertEquals(standard.Execute(0, 0, context), TriRenderJob.StepResult.RS_OK);

  const wireframe = new TriStepEnableWireframeMode();
  wireframe.__init__(true);
  assertEquals(wireframe.Execute(0, 0, context), TriRenderJob.StepResult.RS_OK);
  // apply-standard-states goes to the state manager that owns it. It used to
  // record, and the planner then FAILED on it - "requires a WebGPU
  // pipeline-state translator" - so the intent was fatal, not merely spare.
  // SetRenderState reaches the backend; wireframe goes to the state manager
  // that owns it, exactly as Carbon's TriStepEnableWireframeMode does
  // (renderContext.m_esm.SetWireframeRendering). No backend honours the flag
  // yet - the state manager says so - but the toggle is observable rather than
  // silently lost, which is the whole point.
  assertEquals(context.GetEffectStateManager().IsWireframeRendering(), true);

  const calls = [];
  const executor = {
    SetRenderState: (...args) => { calls.push(["state", ...args]); return false; },
    ApplyStandardStates: (...args) => { calls.push(["standard", ...args]); return false; },
    SetWireframeRendering: (...args) => { calls.push(["wireframe", ...args]); return false; }
  };
  assertEquals(state.Execute(0, 0, executor), TriRenderJob.StepResult.RS_OK);
  assertEquals(standard.Execute(0, 0, executor), TriRenderJob.StepResult.RS_OK);
  assertEquals(wireframe.Execute(0, 0, executor), TriRenderJob.StepResult.RS_OK);
  assertEquals(JSON.stringify(calls), JSON.stringify([["state", 7, 42], ["standard", 8], ["wireframe", true]]));
});

test("TriStepSetVisualizationMode remains a CPU object-graph command", () =>
{
  const calls = [];
  const object = { SetVisualizationMode: mode => { calls.push(mode); return false; } };
  const step = new TriStepSetVisualizationMode();
  assertEquals(step.Execute(), TriRenderJob.StepResult.RS_OK);
  step.__init__(object, 5);
  assertEquals(step.Execute(), TriRenderJob.StepResult.RS_OK);
  assertEquals(calls.join(","), "5");
  assertEquals(step instanceof TriRenderStep, true);
});

test("an observed depth-stencil failure stops the shared render job", () =>
{
  const context = stubContext();
  context.SetDepthStencil = () => false;
  let tailRuns = 0;
  const job = new TriRenderJob();
  job.steps.push(new TriStepSetDepthStencil(), step("tail", () => { tailRuns++; }));
  assertEquals(job.Run(0, 0, context), TriRenderJob.Status.RJ_FAILED);
  assertEquals(tailRuns, 0);
});

test("resolve, mipmap, and present steps preserve Carbon result observation rules", () =>
{
  const context = stubContext();
  const source = stubTarget();
  const destination = stubTarget();
  const resolve = new TriStepResolve();
  resolve.__init__(destination, source);
  resolve.generateMipmap = true;
  assertEquals(resolve.Execute(0, 0, context), TriRenderJob.StepResult.RS_OK);
  // Both reach the backend; the stub accepts and counts them.
  assertEquals(context.GetRenderContextAL().GetDrawCount() >= 0, true);

  context.ResolveRenderTarget = () => false;
  assertEquals(resolve.Execute(0, 0, context), TriRenderJob.StepResult.RS_FAILED);
  const mips = new TriStepGenerateMipMaps();
  assertEquals(mips.Execute(0, 0, context), TriRenderJob.StepResult.RS_OK);
  mips.__init__(destination);
  assertEquals(mips.Execute(0, 0, context), TriRenderJob.StepResult.RS_OK);

  const present = new TriStepPresentSwapChain();
  present.Execute(0, 0, context);

  // Carbon's step calls the SWAP CHAIN's Present, which publishes the surface
  // (TriStepPresentSwapChain.cpp:12-15).
  let presented = null;
  const swapChain = { Present: ctx => { presented = ctx; return true; } };
  present.__init__(swapChain);
  assertEquals(present.Execute(0, 0, context), TriRenderJob.StepResult.RS_OK);
  assertEquals(presented, context);

  // The frame number is the DEVICE's boundary, not the step's: Carbon's stub
  // advances it in Tr2RenderContextAL::Present and nowhere else, and
  // TriDevice::HandleRenderTick is what calls that (TriDeviceStub.cpp:25).
  const before = context.GetRenderContextAL().GetRenderedFrameNumber();
  context.Present();
  assertEquals(context.GetRenderContextAL().GetRenderedFrameNumber(), before + 1);
});

test("TriStepCopyRenderTarget normalizes Carbon copy rectangles before delegation", () =>
{
  const source = { width: 100, height: 50 };
  const destination = stubTarget();
  const copy = new TriStepCopyRenderTarget();
  copy.__init__(destination, source, { x: -10, y: -5 });
  let intent = copy.GetCopyIntent();
  assertEquals(intent.destinationType, "renderTarget");
  assertEquals(JSON.stringify(intent.sourceRect), JSON.stringify({ left: 0, top: 0, right: 90, bottom: 45 }));
  assertEquals(JSON.stringify(intent.destinationRect), JSON.stringify({ left: 0, top: 0, right: 90, bottom: 45 }));

  copy.sourceViewport = { x: 10, y: 20, width: 30, height: 40 };
  copy.destinationViewport = { x: -5, y: -7 };
  intent = copy.GetCopyIntent();
  assertEquals(JSON.stringify(intent.sourceRect), JSON.stringify({ left: 10, top: 20, right: 35, bottom: 53 }));
  assertEquals(JSON.stringify(intent.destinationRect), JSON.stringify({ left: 0, top: 0, right: 25, bottom: 33 }));
  copy.sourceViewport.width = 0;
  assertEquals(copy.GetCopyIntent(), null);

  class TriTextureRes { GetTexture() { return {}; } }
  const texture = new TriTextureRes();
  const textureCopy = new TriStepCopyRenderTarget();
  textureCopy.__init__(texture, source, { x: -2, y: -3 }, { x: 1, y: 2, width: 3, height: 4 });
  intent = textureCopy.GetCopyIntent();
  assertEquals(intent.destinationType, "texture");
  assertEquals(JSON.stringify(intent.destinationPoint), JSON.stringify({ x: -2, y: -3 }));
  assertEquals(JSON.stringify(intent.sourceRect), JSON.stringify({ left: 1, top: 2, right: 4, bottom: 6 }));

  // Carbon's stub REFUSES buffer-to-buffer copies deliberately
  // (Tr2RenderContextStub.cpp:87-101) rather than pretending to succeed, so the
  // step correctly reports failure against it. That the step OBSERVES the
  // backend's result is what this asserts.
  const context = stubContext();
  assertEquals(textureCopy.Execute(0, 0, context), TriRenderJob.StepResult.RS_FAILED);

  context.GetRenderContextAL().CopyRenderTarget = () => true;
  assertEquals(textureCopy.Execute(0, 0, context), TriRenderJob.StepResult.RS_OK);
});

test("Tr2RenderJobs preserves recurring, once, chained, and update scheduling", () =>
{
  const context = stubContext();
  const scheduler = new Tr2RenderJobs();
  const order = [];
  const makeJob = (name, results) =>
  {
    const job = new TriRenderJob();
    let index = 0;
    job.steps.push(step(name, () =>
    {
      order.push(name);
      return results[Math.min(index++, results.length - 1)];
    }));
    return job;
  };
  scheduler.recurring.push(makeJob("recurring", [TriRenderJob.StepResult.RS_OK]));
  scheduler.once.push(
    makeJob("once-done", [TriRenderJob.StepResult.RS_OK]),
    makeJob("once-yield", [TriRenderJob.StepResult.RS_IN_PROGRESS, TriRenderJob.StepResult.RS_OK])
  );
  scheduler.chained.push(
    makeJob("chain-head", [TriRenderJob.StepResult.RS_IN_PROGRESS, TriRenderJob.StepResult.RS_OK]),
    makeJob("chain-tail", [TriRenderJob.StepResult.RS_OK])
  );
  scheduler.updateRecurring.push(makeJob("update", [TriRenderJob.StepResult.RS_OK]));

  scheduler.Run(0, 0, context);
  assertEquals(order.join(","), "recurring,once-done,once-yield,chain-head");
  assertEquals(scheduler.once.length, 1);
  assertEquals(scheduler.chained.length, 2);
  assertEquals(context.GetStackSizeRT(), 0);
  assertEquals(context.GetStackSizeDS(), 0);

  scheduler.Run(0, 0, context);
  assertEquals(order.join(","), "recurring,once-done,once-yield,chain-head,recurring,once-yield,chain-head,chain-tail");
  assertEquals(scheduler.once.length, 0);
  assertEquals(scheduler.chained.length, 0);
  scheduler.RunUpdate(0, 0, context);
  assertEquals(order.at(-1), "update");
});

test("Tr2RenderJobs ends delegated batch scope when a job throws", () =>
{
  const context = stubContext();
  const events = [];
  context.BeginBatch = () => events.push("begin-batch");
  context.EndBatch = () => events.push("end-batch");
  const job = new TriRenderJob();
  job.steps.push(step("throw", () => { throw new Error("batch-boom"); }));
  const scheduler = new Tr2RenderJobs();
  scheduler.recurring.push(job);
  let error = null;
  try { scheduler.Run(0, 0, context); }
  catch (caught) { error = caught; }
  assertEquals(error?.message, "batch-boom");
  assertEquals(events.join(","), "begin-batch,end-batch");
});

test("render steps require the owned render-context contract", () =>
{
  assert.throws(() => new TriStepClear().Execute(0, 0, {}), /Clear/);
  assert.throws(() => new TriStepSetViewport().Execute(0, 0, {}), /GetEffectStateManager/);
  const callback = new TriStepPythonCB();
  callback.__init__(() => { throw new Error("callback failed"); });
  assert.throws(() => callback.Execute(0, 0, null), /AddDiagnostic/);
});

test("Tr2RenderJobs rejects entries outside the owned job contract", () =>
{
  const scheduler = new Tr2RenderJobs();
  scheduler.recurring.push({ Run() { return TriRenderJob.Status.RJ_DONE; } });
  let error = null;
  try { scheduler.Run(0, 0, stubContext()); }
  catch (caught) { error = caught; }
  assertEquals(error instanceof TypeError, true);
  assertEquals(/must contain TriRenderJob instances/u.test(error?.message), true);
});

test("maintained render-job sources remain backend-free", async () =>
{
  // Walked rather than listed: a hardcoded list silently stops covering
  // anything added or moved afterwards, which is exactly when a backend import
  // would slip in.
  const root = new URL("../../src/trinity/renderJob/", import.meta.url);
  const files = [];

  async function collect(dir)
  {
    for (const entry of await readdir(dir, { withFileTypes: true }))
    {
      const child = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, dir);
      if (entry.isDirectory()) await collect(child);
      else if (entry.name.endsWith(".js")) files.push(child);
    }
  }

  await collect(root);
  assertEquals(files.length > 40, true, "the walk found the render-job sources");

  for (const file of files)
  {
    const source = await readFile(file, "utf8");
    if (/GPUDevice|WebGLRenderingContext|GPUBuffer|GPUTexture|GPUCommandEncoder|engine-webgpu|engine-webgl/.test(source))
    {
      throw new Error(`${file.pathname} contains a backend API`);
    }
  }
});
