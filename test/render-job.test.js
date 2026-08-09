import test from "node:test";
import { readFile } from "node:fs/promises";
import { CjsSchema } from "@carbonenginejs/runtime-utils/schema";
import { Tr2RenderContext, Tr2VariableStore, Tr2VisibilityResults } from "../npm/dist/core/index.js";
import { Tr2RenderJobs, TriRenderJob, TriRenderStep, TriStepClear, TriStepCopyRenderTarget, TriStepEnableWireframeMode, TriStepGenerateMipMaps, TriStepPopDepthStencil, TriStepPopRenderTarget, TriStepPresentSwapChain, TriStepPushDepthStencil, TriStepPushRenderTarget, TriStepRemoteSync, TriStepResolve, TriStepRunJob, TriStepSetDepthStencil, TriStepSetProjection, TriStepSetRenderState, TriStepSetRenderTarget, TriStepSetStdRndStates, TriStepSetView, TriStepSetViewport, TriStepSetVisualizationMode } from "../npm/dist/renderJob/index.js";
import { TriStepFilterVisibilityResults } from "../npm/dist/renderJob/index.js";
import { TriStepPythonCB } from "../npm/dist/renderJob/index.js";
import { TriStepRenderEffect } from "../npm/dist/renderJob/index.js";
import { TriStepRenderObject } from "../npm/dist/renderJob/index.js";
import { TriStepRenderPass } from "../npm/dist/renderJob/index.js";
import { TriStepRenderScene } from "../npm/dist/renderJob/index.js";
import { TriStepRenderSceneDebug } from "../npm/dist/renderJob/index.js";
import { TriStepRunComputeShader } from "../npm/dist/renderJob/index.js";
import { TriStepSetUpscalingContextID } from "../npm/dist/renderJob/index.js";
import { TriStepSetDebugRenderer } from "../npm/dist/renderJob/index.js";
import { TriStepSetVariableStore } from "../npm/dist/renderJob/index.js";
import { TriStepUpdate } from "../npm/dist/renderJob/index.js";
import { Tr2RenderNodeEffect } from "../npm/dist/renderJob/index.js";
import { TriStepClearUav } from "../npm/dist/renderJob/index.js";
import { TriStepRenderAtlas } from "../npm/dist/renderJob/index.js";
import { TriStepRenderLineGraph } from "../npm/dist/renderJob/index.js";
import { TriStepRenderTexture } from "../npm/dist/renderJob/index.js";
import { TriStepRenderDebug } from "../npm/dist/renderJob/index.js";
import { TriStepToggleCubemap } from "../npm/dist/renderJob/index.js";
import { Tr2LineGraph } from "../npm/dist/core/line/Tr2LineGraph.js";


function assertEquals(actual, expected, message)
{
  if (actual !== expected) throw new Error(message || `expected ${String(expected)}, got ${String(actual)}`);
}

function step(name, execute, events = null)
{
  return {
    name,
    enabled: true,
    BeginExecute(context) { events?.push(`begin:${name}`); this.beginContext = context; },
    Execute(realTime, simTime, context) { events?.push(`execute:${name}`); this.executeContext = context; return execute?.(this, context, realTime, simTime) ?? TriRenderJob.StepResult.RS_OK; },
    EndExecute(context) { events?.push(`end:${name}`); this.endContext = context; }
  };
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
  const context = new Tr2RenderContext();
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

  const renderObject = new TriStepRenderObject();
  renderObject.__init__({ name: "renderable" });
  assertEquals(renderObject.renderOpaque, true);
  renderObject.Execute(0, 0, context);

  const renderEffect = new TriStepRenderEffect();
  renderEffect.__init__({ name: "effect" }, { name: "constants" });
  renderEffect.Execute(0, 0, context);

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

  const intents = context.GetIntents();
  assertEquals(intents.map(intent => intent.type).join(","), "render-object,draw-effect,run-compute-shader,set-upscaling-context-id");
  assertEquals(events[0][0], "scene");
  assertEquals(events.at(-1).join(","), "update,5,6");
});

test("Tr2RenderNodeEffect groups Carbon source bindings and named outputs", () =>
{
  const node = new Tr2RenderNodeEffect();
  const source = {};
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
  const context = new Tr2RenderContext();
  const buffer = {};
  const clear = new TriStepClearUav();
  clear.__init__(buffer, new Float32Array([0.25, 0.5, 0.75, 1]));
  assertEquals(clear.clearWithFloat, true);
  assertEquals(clear.Execute(0, 0, context), TriRenderStep.RS_OK);

  const atlas = {};
  const focus = {};
  const renderAtlas = new TriStepRenderAtlas();
  renderAtlas.__init__(atlas, focus);
  renderAtlas.Execute(0, 0, context);
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
  renderGraphs.Execute(0, 0, context);
  assertEquals(renderGraphs.scale, 0.05);
  assertEquals(scaleChanges, 1);

  const texture = { width: 64, height: 32 };
  const renderTexture = new TriStepRenderTexture();
  renderTexture.__init__(texture);
  renderTexture.Execute(0, 0, context);
  assertEquals(renderTexture.textureSize[0], 64);
  assertEquals(renderTexture.textureSize[1], 32);

  assertEquals(context.GetIntents().map(intent => intent.type).join(","), "clear-uav,render-atlas,render-line-graphs,render-texture");
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
  const context = new Tr2RenderContext();
  assertEquals(debug.Execute(0, 0, context), TriRenderStep.RS_OK);
  const intent = context.GetIntents().at(-1);
  assertEquals(intent.type, "render-debug");
  assertEquals(intent.vertices.length, 106);
  assertEquals(intent.text2d[0].message, "screen");
  assertEquals(intent.text3d[0].position.join(","), "1,2,3");
  assertEquals(debug.lineSet.vertices.length, 0);
  assertEquals(debug.text2d.length, 0);
  assertEquals(debug.text3d.length, 0);
});

test("callback, debug-renderer, and variable-store steps preserve Carbon behavior", () =>
{
  const context = new Tr2RenderContext();
  let callbackCount = 0;
  const callback = new TriStepPythonCB();
  callback.__init__(() => callbackCount++);
  assertEquals(callback.Execute(0, 0, context), TriRenderStep.RS_OK);
  assertEquals(callbackCount, 1);

  const renderer = { name: "debug" };
  const debug = new TriStepSetDebugRenderer();
  debug.__init__(renderer);
  debug.Execute(0, 0, context);
  assertEquals(context.GetIntents().at(-1).type, "set-debug-renderer");
  assertEquals(context.GetIntents().at(-1).renderer, renderer);

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
  const context = new Tr2RenderContext();
  const events = [];
  const job = new TriRenderJob();
  let attempts = 0;
  const yielding = step("yield", () => ++attempts === 1 ? TriRenderJob.StepResult.RS_IN_PROGRESS : TriRenderJob.StepResult.RS_OK, events);
  const tail = step("tail", null, events);
  job.steps.push(null, { enabled: false }, yielding, tail);

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
  const context = new Tr2RenderContext();
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
  const context = new Tr2RenderContext();
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
  const context = new Tr2RenderContext();
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

  const throwingContext = new Tr2RenderContext();
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
  const context = new Tr2RenderContext();
  const target = {};
  const depth = {};
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
  const context = new Tr2RenderContext();
  const target = {};
  const depth = {};
  const viewport = {};
  const projection = {};

  const setRT = new TriStepSetRenderTarget();
  assertEquals(setRT instanceof TriRenderStep, true);
  setRT.Execute(0, 0, context);
  assertEquals(context.GetIntents().length, 0, "null render target is a no-op");
  setRT.__init__(target);
  setRT.Execute(0, 0, context);
  assertEquals(context.GetRenderTarget(0), target);

  const setDS = new TriStepSetDepthStencil();
  setDS.Execute(0, 0, context);
  assertEquals(context.GetIntents().at(-1).type, "set-depth-stencil");
  setDS.__init__(depth);
  setDS.Execute(0, 0, context);
  assertEquals(context.GetDepthStencil(), depth);

  const setViewport = new TriStepSetViewport();
  setViewport.Execute(0, 0, context);
  assertEquals(context.GetIntents().at(-1).type, "set-fullscreen-viewport");
  setViewport.__init__(viewport);
  setViewport.Execute(0, 0, context);
  assertEquals(context.GetViewport(), viewport);

  const setProjection = new TriStepSetProjection();
  setProjection.__init__(projection);
  setProjection.Execute(0, 0, context);
  assertEquals(context.GetProjection(), projection);
});

test("TriStepClear preserves raw defaults, optional initializer rules, and color clamps", () =>
{
  const context = new Tr2RenderContext();
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
  assertEquals(clear.Execute(0, 0, context), TriRenderJob.StepResult.RS_OK);
  const intent = context.GetIntents().at(-1);
  assertEquals(intent.type, "clear");
  assertEquals(intent.color.join(","), "0,0.25,1,1");
  assertEquals(intent.depth, 0.5);
  assertEquals(intent.stencil, 7);
  assertEquals(intent.clearColor && intent.clearDepth && intent.clearStencil, true);
});

test("TriStepSetView gives view precedence and updates camera before emitting intent", () =>
{
  const context = new Tr2RenderContext();
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
  const context = new Tr2RenderContext();

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
  assertEquals(context.GetIntents().map(intent => intent.type).slice(-3).join(","), "set-render-state,apply-standard-states,set-wireframe-rendering");

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
  const context = new Tr2RenderContext();
  context.SetDepthStencil = () => false;
  let tailRuns = 0;
  const job = new TriRenderJob();
  job.steps.push(new TriStepSetDepthStencil(), step("tail", () => { tailRuns++; }));
  assertEquals(job.Run(0, 0, context), TriRenderJob.Status.RJ_FAILED);
  assertEquals(tailRuns, 0);
});

test("resolve, mipmap, and present steps preserve Carbon result observation rules", () =>
{
  const context = new Tr2RenderContext();
  const source = {};
  const destination = {};
  const resolve = new TriStepResolve();
  resolve.__init__(destination, source);
  resolve.generateMipmap = true;
  assertEquals(resolve.Execute(0, 0, context), TriRenderJob.StepResult.RS_OK);
  assertEquals(context.GetIntents().map(intent => intent.type).slice(-2).join(","), "resolve-render-target,generate-mipmaps");

  context.ResolveRenderTarget = () => false;
  assertEquals(resolve.Execute(0, 0, context), TriRenderJob.StepResult.RS_FAILED);
  const mips = new TriStepGenerateMipMaps();
  assertEquals(mips.Execute(0, 0, context), TriRenderJob.StepResult.RS_OK);
  mips.__init__(destination);
  assertEquals(mips.Execute(0, 0, context), TriRenderJob.StepResult.RS_OK);

  const present = new TriStepPresentSwapChain();
  present.Execute(0, 0, context);
  const before = context.GetIntents().length;
  const swapChain = {};
  present.__init__(swapChain);
  assertEquals(present.Execute(0, 0, context), TriRenderJob.StepResult.RS_OK);
  assertEquals(context.GetIntents().length, before + 1);
  assertEquals(context.GetIntents().at(-1).swapChain, swapChain);
});

test("TriStepCopyRenderTarget normalizes Carbon copy rectangles before delegation", () =>
{
  const source = { width: 100, height: 50 };
  const destination = {};
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

  const context = new Tr2RenderContext();
  assertEquals(textureCopy.Execute(0, 0, context), TriRenderJob.StepResult.RS_OK);
  context.CopyRenderTarget = () => false;
  assertEquals(textureCopy.Execute(0, 0, context), TriRenderJob.StepResult.RS_FAILED);
});

test("Tr2RenderJobs preserves recurring, once, chained, and update scheduling", () =>
{
  const context = new Tr2RenderContext();
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
  const context = new Tr2RenderContext();
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

test("maintained render-job sources remain backend-free", async () =>
{
  for (const file of ["TriRenderJob.js", "Tr2RenderJobs.js", "TriStepRunJob.js", "TriStepPushRenderTarget.js", "TriStepPopRenderTarget.js", "TriStepPushDepthStencil.js", "TriStepPopDepthStencil.js", "TriStepSetRenderTarget.js", "TriStepSetDepthStencil.js", "TriStepClear.js", "TriStepSetViewport.js", "TriStepSetView.js", "TriStepSetProjection.js", "TriStepResolve.js", "TriStepCopyRenderTarget.js", "TriStepGenerateMipMaps.js", "TriStepPresentSwapChain.js"])
  {
    const source = await readFile(new URL(`../src/renderJob/${file}`, import.meta.url), "utf8");
    if (/GPUDevice|WebGLRenderingContext|GPUBuffer|GPUTexture|GPUCommandEncoder|engine-webgpu|engine-webgl/.test(source))
    {
      throw new Error(`${file} contains a backend API`);
    }
  }
});
