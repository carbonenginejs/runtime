import assert from "node:assert/strict";
import test from "node:test";
import {
  EveProceduralMethodCycling, EveProceduralMethodCyclingParameter,
  EveSpaceScene, EveSpaceSceneRenderDriver, EveUpdateContext, Tr2GpuParticleSystem
} from "../../npm/dist/trinity/index.js";

test("cycling ads keep authored seconds when the scene supplies Blue ticks", () =>
{
  // Native SelectionMethods/EveProceduralMethodCycling.cpp:57,101 converts
  // authored offset and elapsed time. Chjita's cycling ads author 12 seconds.
  const cycling = new EveProceduralMethodCycling();
  for (let i = 0; i < 2; i++)
  {
    const parameter = new EveProceduralMethodCyclingParameter();
    parameter.playDuration = 12;
    cycling.parameters.push(parameter);
  }
  const context = new EveUpdateContext();
  const update = seconds =>
  {
    context.SetTime(Math.round(seconds * 10_000_000));
    cycling.UpdateAsyncronous(context, null);
  };
  update(100);
  assert.equal(cycling.selectedChild, 0);
  update(100.01);
  assert.equal(cycling.selectedChild, 0, "one frame must not exhaust a 12-second ad");
  update(111.99);
  assert.equal(cycling.selectedChild, 0);
  update(112);
  assert.equal(cycling.selectedChild, 1, "conversion must not happen twice");
  update(112);
  assert.equal(cycling.selectedChild, 1, "a repeated timestamp cannot cycle again");
  update(124);
  assert.equal(cycling.selectedChild, 0);
  assert.equal(context.GetTime(), 1_240_000_000, "scene time stays in ticks");

  // Existing JS restart(timestamp) takes seconds, including startTimeOffset.
  cycling.startTimeOffset = 1;
  cycling.restart(200);
  const selected = cycling.selectedChild;
  update(210.99);
  assert.equal(cycling.selectedChild, selected);
  update(211);
  assert.notEqual(cycling.selectedChild, selected, "the authored offset remains one second");
});

test("scene GPU-particle handoff advances gas at real elapsed seconds", t =>
{
  // Native driver.cpp:640 passes ticks; native particle.cpp:325 converts the
  // delta. JS particle Update already takes seconds, so convert at its caller.
  const scene = new EveSpaceScene();
  const driver = new EveSpaceSceneRenderDriver();
  const system = new Tr2GpuParticleSystem();
  driver.scene = scene;
  scene.SetGpuParticleSystem(system);
  t.after(() => { scene.SetGpuParticleSystem(null); system.Destroy(); driver.Destroy(); });
  for (const slot of ["emit", "update", "clear", "setDrawParameters"])
  {
    system[slot] = {
      GetShaderStateInterface: () => ({}),
      StartUpdate() {},
      SetVariableStore() {},
      EndUpdate() {}
    };
  }
  system.enableEmit = false;
  system._clearRequested = false;
  // No live particles: exercise the real clock, turbulence and lifetime logic
  // without dispatching GPU work. Rendering itself is outside this test.
  const lifetime = { lifetime: 12, index: 0, hash: 0 };
  system._emitterParamsIndex.set(7, lifetime);
  let publications = 0;
  t.mock.method(scene, "PopulateAndApplyPerFrameData", () => { publications++; });
  const update = ticks =>
  {
    scene.updateTime = ticks;
    scene.updateContext.SetTime(ticks);
    driver.UpdateGpuParticleSystem(null);
  };
  update(100_000_000);
  assert.equal(lifetime.lifetime, 12, "first timestamp has no elapsed time");
  update(100_100_000);
  assert.ok(Math.abs(lifetime.lifetime - 11.99) < 1e-10,
    "10ms must not hit the 1/15-second simulation clamp or be converted twice");
  assert.equal(system._previousTime, 10.01);
  assert.equal(scene.updateTime, 100_100_000, "the scene retains raw ticks");
  update(100_100_000);
  assert.ok(Math.abs(lifetime.lifetime - 11.99) < 1e-10);
  system.enableUpdate = false;
  update(100_200_000);
  assert.ok(Math.abs(lifetime.lifetime - 11.99) < 1e-10, "paused simulation does not age");
  system.enableUpdate = true;
  update(110_200_000);
  assert.ok(Math.abs(lifetime.lifetime - (11.99 - 1 / 15)) < 1e-10,
    "a genuine long frame keeps Carbon's existing clamp");
  assert.equal(publications, 5);
});
