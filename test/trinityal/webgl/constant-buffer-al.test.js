import assert from "node:assert/strict";
import { test } from "node:test";

import { Tr2ConstantBufferALWebgl } from "../../../npm/dist/trinityal/webgl/index.js";
import { ALResult, Tr2ConstantUsageAL } from "../../../npm/dist/trinityal/index.js";
import { FakeRenderContext, FakeWebgl } from "./fakeWebgl.js";

test("a ONE_SHOT constant buffer is only a CPU mirror, as in dx11", () =>
{
    const { gl, calls } = FakeWebgl();
    const context = FakeRenderContext(gl);
    const buffer = new Tr2ConstantBufferALWebgl();

    assert.equal(buffer.Create(64, Tr2ConstantUsageAL.ONE_SHOT, null, context), ALResult.S_OK);
    assert.equal(buffer.IsValid(), true);
    assert.equal(buffer.GetGpuResource(), null);
    assert.equal(calls.filter(call => call[0] === "createBuffer").length, 0);

    const { result, data } = buffer.Lock(context);
    assert.equal(result, ALResult.S_OK);
    assert.equal(data, buffer.GetMirror());
    assert.equal(buffer.Unlock(context), ALResult.S_OK);
});

test("a REUSABLE constant buffer is a uniform buffer, orphaned and refilled on Unlock", () =>
{
    const { gl, calls } = FakeWebgl();
    const context = FakeRenderContext(gl);
    const buffer = new Tr2ConstantBufferALWebgl();

    assert.equal(buffer.Create(16, Tr2ConstantUsageAL.REUSABLE, null, context), ALResult.S_OK);
    assert.ok(buffer.GetGpuResource());

    const { data } = buffer.Lock(context);
    new Float32Array(data.buffer, data.byteOffset, 4).set([ 1, 2, 3, 4 ]);
    assert.equal(buffer.Unlock(context), ALResult.S_OK);

    const last = calls.filter(call => call[0] === "bufferData").at(-1);
    assert.equal(last[1], gl.UNIFORM_BUFFER);
    assert.equal(last[4], gl.DYNAMIC_DRAW);
    assert.deepEqual(Array.from(new Float32Array(last[3].buffer)), [ 1, 2, 3, 4 ]);
});

test("an IMMUTABLE constant buffer needs its data at Create", () =>
{
    const { gl } = FakeWebgl();
    const buffer = new Tr2ConstantBufferALWebgl();

    assert.equal(buffer.Create(16, Tr2ConstantUsageAL.IMMUTABLE, null, FakeRenderContext(gl)), ALResult.E_INVALIDARG);
    assert.equal(buffer.IsValid(), false);
});
