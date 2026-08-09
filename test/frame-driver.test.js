import assert from "node:assert/strict";
import { test } from "node:test";

import { CjsFrameDriver, Tr2RenderContext } from "../npm/dist/trinityCore/index.js";
import { Tr2VariableStore } from "../npm/dist/trinityCore/index.js";

// Records every frame step in the order it happened, so the test asserts the
// SEQUENCE rather than that each step merely ran.
function makeDriver()
{
  const order = [];
  const renderContext = new Tr2RenderContext();

  const hooks = {
    Throttle: () => order.push("throttle"),
    SyncToGpu: () => order.push("sync"),
    BeginProfileFrame: counter => order.push(`profile-begin:${counter}`),
    EndProfileFrame: () => order.push("profile-end"),
    ReserveQuadListIndexBuffer: quads => order.push(`quads:${quads}`)
  };

  const renderJobs = {
    Run(realTime, simTime)
    {
      order.push(`jobs:${realTime}:${simTime}`);
      return true;
    }
  };

  const driver = new CjsFrameDriver({ renderContext, renderJobs, hooks });

  // The pool is the frame's own; leasing from it proves the reset below.
  renderContext.GetTriPoolAllocator();

  return { driver, renderContext, order };
}

test("Render runs Carbon's frame steps in order, with the asymmetric brackets", () =>
{
  const { driver, order } = makeDriver();

  driver.Tick(0.25);
  driver.Render(11, 22);

  assert.deepEqual(order, [
    "throttle",
    "sync",
    "profile-begin:1",
    "quads:0",
    "jobs:11:22",
    "profile-end"
  ], "entry is throttle/sync/profiler then the frame brackets; exit is profiler first");
});

test("Present is not part of Render; Carbon presents the previous frame next tick", () =>
{
  const { driver, renderContext } = makeDriver();

  driver.Tick(0.1);
  driver.Render();

  const intents = renderContext.GetIntents().map(intent => intent.type);
  assert.ok(!intents.includes("present-swap-chain"),
    "a driver that presents at the end of Render has Carbon's ordering wrong");
});

test("BeginFrame publishes Carbon's Time vector, including the previous frame", () =>
{
  const { driver, renderContext } = makeDriver();

  driver.Tick(2.5);
  driver.Render();

  const first = Tr2VariableStore.GlobalStore().GetVariable("Time").GetValue();
  assert.equal(first[0], 2.5, "x is the animation time");
  assert.equal(first[1], 0.5, "y is its fractional part");
  assert.equal(first[2], 1, "z is the frame counter");
  assert.equal(first[3], 0, "w is the PREVIOUS frame's animation time");

  driver.Tick(1);
  driver.Render();

  const second = Tr2VariableStore.GlobalStore().GetVariable("Time").GetValue();
  assert.equal(second[0], 3.5);
  assert.equal(second[2], 2);
  assert.equal(second[3], 2.5, "the previous frame's time is what makes a shader delta possible");
});

test("the frame pool is rewound every frame, so payloads do not accumulate", () =>
{
  const { driver, renderContext } = makeDriver();
  const store = renderContext.GetTriPoolAllocator();

  driver.Tick(0.1);
  const first = store.Alloc("EveBasicPerObjectData");
  driver.Render();

  driver.Tick(0.1);
  const second = store.Alloc("EveBasicPerObjectData");

  assert.equal(second.GetData().byteOffset, first.GetData().byteOffset,
    "EndRenderContext rewound the arena inside the scene bracket that leased it");
});

test("a throwing render job still closes the frame", () =>
{
  const { driver, renderContext, order } = makeDriver();
  const store = renderContext.GetTriPoolAllocator();

  driver.SetRenderJobs({ Run() { throw new Error("job exploded"); } });
  driver.Tick(0.1);
  store.Alloc("EveBasicPerObjectData");

  assert.throws(() => driver.Render(), /job exploded/);
  assert.deepEqual(order.slice(-1), [ "profile-end" ], "the exit bracket still ran");

  const reused = store.Alloc("EveBasicPerObjectData");
  assert.equal(reused.GetData().byteOffset, 0, "the pool was not stranded");
});

test("the animation clock rebases hourly rather than growing without bound", () =>
{
  const { driver } = makeDriver();

  driver.Tick(3599);
  assert.equal(driver.Tick(2), 1, "3601 rebases to 1, keeping the fractional part continuous");
});

test("a driver with no jobs and no hooks still runs a whole frame", () =>
{
  const driver = new CjsFrameDriver({ renderContext: new Tr2RenderContext() });

  driver.Tick(0.5);
  assert.equal(driver.Render(), true);
  assert.equal(driver.GetRenderContext().GetCurrentFrameCounter(), 1);
});

test("the driver imports nothing, so relocating it is a file move", () =>
{
  assert.throws(() => new CjsFrameDriver(), /requires a renderContext/,
    "the context is injected rather than constructed");
});
