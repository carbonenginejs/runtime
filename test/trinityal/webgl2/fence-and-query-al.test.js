import assert from "node:assert/strict";
import { test } from "node:test";

import {
    Tr2FenceALWebgl2,
    Tr2GpuTimerALWebgl2,
    Tr2OcclusionQueryALWebgl2,
    Tr2PipelineStatsQueryALWebgl2
} from "../../../npm/dist/trinityal/webgl2/index.js";
import { ALResult } from "../../../npm/dist/trinityal/index.js";
import { FakeRenderContext, FakeWebgl2, TIMER_QUERY } from "./fakeWebgl2.js";

test("a fence is reached when its sync object signals", () =>
{
    const { gl } = FakeWebgl2();
    const context = FakeRenderContext(gl);
    const fence = new Tr2FenceALWebgl2();

    assert.equal(fence.PutFence(context), ALResult.E_INVALIDCALL, "not created");
    assert.equal(fence.Create(context), ALResult.S_OK);
    assert.deepEqual(fence.IsReached(context), { result: ALResult.S_OK, isReached: true }, "nothing put, nothing outstanding");

    assert.equal(fence.PutFence(context), ALResult.S_OK);
    const [ , sync ] = gl.calls.find(call => call[0] === "fenceSync");
    assert.equal(sync.condition, gl.SYNC_GPU_COMMANDS_COMPLETE);
    assert.equal(fence.IsReached(context).isReached, false);

    sync.signaled = true;
    assert.equal(fence.IsReached(context).isReached, true);
});

test("putting a fence again replaces the sync object", () =>
{
    const { gl, calls } = FakeWebgl2();
    const context = FakeRenderContext(gl);
    const fence = new Tr2FenceALWebgl2();
    fence.Create(context);

    fence.PutFence(context);
    fence.PutFence(context);
    const [ first, second ] = calls.filter(call => call[0] === "fenceSync").map(call => call[1]);

    assert.ok(calls.some(call => call[0] === "deleteSync" && call[1] === first));
    first.signaled = true;
    assert.equal(fence.IsReached(context).isReached, false, "the second fence is the one asked about");
    second.signaled = true;
    assert.equal(fence.IsReached(context).isReached, true);
});

test("Wait finishes the context instead of spinning on the sync object", () =>
{
    const { gl, calls } = FakeWebgl2();
    const context = FakeRenderContext(gl);
    const fence = new Tr2FenceALWebgl2();
    fence.Create(context);
    fence.PutFence(context);

    assert.equal(fence.Wait(context), ALResult.S_OK);
    assert.equal(calls.filter(call => call[0] === "finish").length, 1);
    assert.equal(fence.IsReached(context).isReached, true);

    fence.Wait(context);
    assert.equal(calls.filter(call => call[0] === "finish").length, 1, "a passed fence needs no second finish");
});

test("the fence answers dx11's errors for an invalid context", () =>
{
    const { gl } = FakeWebgl2();
    const fence = new Tr2FenceALWebgl2();

    assert.equal(fence.Create(FakeRenderContext(gl, false)), ALResult.E_FAIL);
    fence.Create(FakeRenderContext(gl));
    assert.equal(fence.PutFence(FakeRenderContext(gl, false)), ALResult.E_FAIL);
    assert.equal(fence.Wait(FakeRenderContext(gl, false)), ALResult.E_FAIL);

    fence.Destroy();
    assert.equal(fence.IsValid(), false);
    assert.equal(fence.Wait(FakeRenderContext(gl)), ALResult.E_INVALIDCALL);
});

test("an occlusion query reports 1 when any sample passed, 0 when none, S_FALSE until then", () =>
{
    const { gl, calls } = FakeWebgl2();
    const context = FakeRenderContext(gl);
    const query = new Tr2OcclusionQueryALWebgl2();

    assert.equal(query.Begin(context), ALResult.E_INVALIDARG, "not created");
    assert.equal(query.Create(context), ALResult.S_OK);
    assert.equal(query.Begin(context), ALResult.S_OK);
    assert.equal(query.End(context), ALResult.S_OK);

    const [ , target, native ] = calls.find(call => call[0] === "beginQuery");
    assert.equal(target, gl.ANY_SAMPLES_PASSED);

    assert.deepEqual(query.GetPixelCount(context, 1), { result: ALResult.S_FALSE, count: 0 }, "WAIT cannot block");

    native.available = true;
    native.result = 1;
    assert.deepEqual(query.GetPixelCount(context), { result: ALResult.S_OK, count: 1 });
    native.result = 0;
    assert.deepEqual(query.GetPixelCount(context), { result: ALResult.S_OK, count: 0 });
});

test("only one occlusion query may be active", () =>
{
    const { gl } = FakeWebgl2();
    const context = FakeRenderContext(gl);
    const outer = new Tr2OcclusionQueryALWebgl2();
    const inner = new Tr2OcclusionQueryALWebgl2();
    outer.Create(context);
    inner.Create(context);

    outer.Begin(context);
    assert.equal(inner.Begin(context), ALResult.E_INVALIDCALL);
    assert.equal(inner.End(context), ALResult.E_INVALIDCALL, "ending a query that is not the active one");
    assert.equal(outer.End(context), ALResult.S_OK);
});

test("a GPU timer without the extension cannot be created", () =>
{
    const { gl } = FakeWebgl2();
    const timer = new Tr2GpuTimerALWebgl2();

    assert.equal(timer.Create(FakeRenderContext(gl)), ALResult.E_FAIL);
    assert.equal(timer.IsValid(), false);
    assert.equal(timer.Begin(FakeRenderContext(gl)), false);
    assert.equal(timer.GetTime(FakeRenderContext(gl)), -1);
});

test("a GPU timer reports elapsed seconds and keeps the last time over a disjoint period", () =>
{
    const { gl, calls } = FakeWebgl2();
    gl.extensions = { EXT_disjoint_timer_query_webgl2: TIMER_QUERY };
    const context = FakeRenderContext(gl);
    const timer = new Tr2GpuTimerALWebgl2();

    assert.equal(timer.Create(context), ALResult.S_OK);
    assert.equal(timer.Begin(context), true);
    assert.equal(timer.Begin(context), false, "already running");
    timer.End(context);

    const [ , target, native ] = calls.find(call => call[0] === "beginQuery");
    assert.equal(target, TIMER_QUERY.TIME_ELAPSED_EXT);
    assert.equal(timer.GetTime(context), -1, "not yet available");

    native.available = true;
    native.result = 2_500_000;
    assert.equal(timer.GetTime(context), Math.fround(0.0025));

    timer.Begin(context);
    timer.End(context);
    native.result = 9_000_000;
    gl.disjoint = true;
    assert.equal(timer.GetTime(context), Math.fround(0.0025), "a disjoint measurement is discarded");
    assert.equal(timer.Begin(context), true, "and the timer is ready again");
});

test("a GPU timer will not nest inside another", () =>
{
    const { gl } = FakeWebgl2();
    gl.extensions = { EXT_disjoint_timer_query_webgl2: TIMER_QUERY };
    const context = FakeRenderContext(gl);
    const outer = new Tr2GpuTimerALWebgl2();
    const inner = new Tr2GpuTimerALWebgl2();
    outer.Create(context);
    inner.Create(context);

    outer.Begin(context);
    assert.equal(inner.Begin(context), false);
});

test("a pipeline statistics query cannot be created on WebGL2", () =>
{
    const { gl } = FakeWebgl2();
    const query = new Tr2PipelineStatsQueryALWebgl2();

    assert.equal(query.Create(FakeRenderContext(gl)), ALResult.E_FAIL);
    assert.equal(query.IsValid(), false);
    assert.equal(query.Begin(FakeRenderContext(gl)), ALResult.E_INVALIDARG);
    const stats = query.GetStats(FakeRenderContext(gl));
    assert.equal(stats.result, ALResult.E_INVALIDARG);
    assert.deepEqual(stats.data.data, []);
    assert.equal(Tr2PipelineStatsQueryALWebgl2.GetValueCount([]), 0);
});
