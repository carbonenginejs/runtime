import assert from "node:assert/strict";
import { test } from "node:test";

import { CjsFrameLifecycle } from "../../npm/dist/global/contracts/index.js";
import { CjsFrameDriver } from "../../npm/dist/core/index.js";
import * as trinityCore from "../../npm/dist/trinity/core/index.js";
import { Tr2RenderContext, Tr2VariableStore } from "../../npm/dist/trinity/core/index.js";
import { Tr2RenderJobs, TriRenderJob } from "../../npm/dist/trinity/renderJob/index.js";


class RecordingLifecycle extends CjsFrameLifecycle
{
    constructor(order, viewport = { width: 800, height: 600 })
    {
        super();
        this.order = order;
        this.viewport = viewport;
        this.profileCloseError = null;
    }

    Throttle()
    {
        this.order.push("throttle");
    }

    SyncToGpu()
    {
        this.order.push("sync");
    }

    GetViewport()
    {
        this.order.push("lifecycle-viewport");
        return this.viewport;
    }

    BeginProfileFrame(counter)
    {
        this.order.push(`profile-begin:${counter}`);
    }

    EndProfileFrame()
    {
        this.order.push("profile-end");
        if (this.profileCloseError) throw this.profileCloseError;
    }

    ReserveQuadListIndexBuffer(count)
    {
        this.order.push(`quads:${count}`);
    }
}

class RecordingRenderContext extends Tr2RenderContext
{
    constructor(order)
    {
        super();
        this.order = order;
        this.contextCloseError = null;
    }

    SetViewport(viewport)
    {
        this.order.push("context-viewport");
        return super.SetViewport(viewport);
    }

    BeginFrame()
    {
        this.order.push("frame-begin");
        return super.BeginFrame();
    }

    BeginRenderContext()
    {
        this.order.push("context-begin");
        return super.BeginRenderContext();
    }

    EndRenderContext()
    {
        this.order.push("context-end");
        super.EndRenderContext();
        if (this.contextCloseError) throw this.contextCloseError;
        return this;
    }

    EndFrame()
    {
        this.order.push("frame-end");
        return super.EndFrame();
    }
}

class RecordingRenderJobs extends Tr2RenderJobs
{
    constructor(order)
    {
        super();
        this.order = order;
        this.runError = null;
        this.receivedContext = null;
    }

    Run(realTime, simTime, context)
    {
        this.receivedContext = context;
        this.order.push(`jobs:${realTime}:${simTime}`);
        if (this.runError) throw this.runError;
    }
}

function makeDriver()
{
    const order = [];
    const renderContext = new RecordingRenderContext(order);
    const renderJobs = new RecordingRenderJobs(order);
    const frameLifecycle = new RecordingLifecycle(order);
    const driver = new CjsFrameDriver({ renderContext, renderJobs, frameLifecycle });
    renderContext.GetTriPoolAllocator();
    return { driver, renderContext, renderJobs, frameLifecycle, order };
}

test("CjsFrameLifecycle requires every engine-owned frame method", () =>
{
    const lifecycle = new CjsFrameLifecycle();
    for (const [ name, args ] of [
        [ "Throttle", [] ],
        [ "SyncToGpu", [] ],
        [ "GetViewport", [] ],
        [ "BeginProfileFrame", [ 1 ] ],
        [ "EndProfileFrame", [] ],
        [ "ReserveQuadListIndexBuffer", [ 0 ] ]
    ])
    {
        assert.throws(() => lifecycle[name](...args), new RegExp(`CjsFrameLifecycle\\.${name}`));
    }
});

test("Render runs Carbon's complete neutral frame order", () =>
{
    const { driver, renderContext, renderJobs, frameLifecycle, order } = makeDriver();

    driver.Tick(0.25);
    driver.Render(11, 22);

    assert.deepEqual(order, [
        "throttle",
        "sync",
        "lifecycle-viewport",
        "context-viewport",
        "profile-begin:1",
        "frame-begin",
        "context-begin",
        "quads:0",
        "jobs:11:22",
        "profile-end",
        "context-end",
        "frame-end"
    ]);
    assert.equal(renderJobs.receivedContext, renderContext);
    assert.equal(renderContext.GetViewport(), frameLifecycle.viewport);
});

test("Tr2RenderJobs receives the exact bracketed context", () =>
{
    const order = [];
    const renderContext = new RecordingRenderContext(order);
    const frameLifecycle = new RecordingLifecycle(order);
    let receivedContext = null;
    class ContextJob extends TriRenderJob
    {
        Run(_realTime, _simTime, context)
        {
            receivedContext = context;
            return TriRenderJob.Status.RJ_DONE;
        }
    }
    const renderJobs = new Tr2RenderJobs();
    renderJobs.recurring = [ new ContextJob() ];
    const driver = new CjsFrameDriver({ renderContext, renderJobs, frameLifecycle });

    driver.Render();
    assert.equal(receivedContext, renderContext);
});

test("Present remains outside the requested frame", () =>
{
    const { driver, renderContext } = makeDriver();

    driver.Tick(0.1);
    driver.Render();

    const intents = renderContext.GetIntents().map(intent => intent.type);
    assert.equal(intents.includes("present-swap-chain"), false);
});

test("BeginFrame publishes Carbon's Time vector, including the previous frame", () =>
{
    const { driver } = makeDriver();

    driver.Tick(2.5);
    driver.Render();
    const first = Tr2VariableStore.GlobalStore().GetVariable("Time").GetValue();
    assert.deepEqual(first, [ 2.5, 0.5, 1, 0 ]);

    driver.Tick(1);
    driver.Render();
    const second = Tr2VariableStore.GlobalStore().GetVariable("Time").GetValue();
    assert.deepEqual(second, [ 3.5, 0.5, 2, 2.5 ]);
});

test("the frame pool is rewound inside every completed render-context bracket", () =>
{
    const { driver, renderContext } = makeDriver();
    const store = renderContext.GetTriPoolAllocator();

    driver.Tick(0.1);
    const first = store.Alloc("EveBasicPerObjectData");
    driver.Render();

    driver.Tick(0.1);
    const second = store.Alloc("EveBasicPerObjectData");
    assert.equal(second.GetData().byteOffset, first.GetData().byteOffset);
});

test("a throwing render job still closes profiler, context, and frame", () =>
{
    const { driver, renderContext, renderJobs, order } = makeDriver();
    const store = renderContext.GetTriPoolAllocator();
    renderJobs.runError = new Error("job exploded");
    store.Alloc("EveBasicPerObjectData");

    assert.throws(() => driver.Render(), /job exploded/u);
    assert.deepEqual(order.slice(-3), [ "profile-end", "context-end", "frame-end" ]);
    assert.equal(store.Alloc("EveBasicPerObjectData").GetData().byteOffset, 0);
});

test("a cleanup failure does not strand later required cleanup", () =>
{
    const { driver, renderContext, frameLifecycle, order } = makeDriver();
    frameLifecycle.profileCloseError = new Error("profile close failed");
    renderContext.contextCloseError = new Error("context close failed");

    assert.throws(
        () => driver.Render(),
        error => error instanceof AggregateError
            && error.errors.map(entry => entry.message).join("|") === "profile close failed|context close failed"
    );
    assert.deepEqual(order.slice(-3), [ "profile-end", "context-end", "frame-end" ]);
});

test("the animation clock rebases hourly rather than growing without bound", () =>
{
    const { driver } = makeDriver();

    driver.Tick(3599);
    assert.equal(driver.Tick(2), 1);
});

test("the driver and lifecycle export only from their owning package surfaces", () =>
{
    assert.equal(typeof CjsFrameDriver, "function");
    assert.equal(typeof CjsFrameLifecycle, "function");
    assert.equal("CjsFrameDriver" in trinityCore, false);
});
