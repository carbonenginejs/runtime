import assert from "node:assert/strict";
import { test } from "node:test";

import { Tr2CapsALWebgl2, Tr2Webgl2PlatformCaps } from "../../../npm/dist/trinityal/webgl2/index.js";
import { FakeWebgl2 } from "./fakeWebgl2.js";

test("float16 is claimed only when the device can render into half floats", () =>
{
    const { gl } = FakeWebgl2();

    assert.equal(new Tr2CapsALWebgl2().SupportsFloat16(), false, "no device");
    assert.equal(new Tr2CapsALWebgl2(gl).SupportsFloat16(), false, "no colour-buffer extension");

    gl.extensions = { EXT_color_buffer_float: {} };
    assert.equal(new Tr2CapsALWebgl2(gl).SupportsFloat16(), true);
});

test("the backend denies what it would refuse", () =>
{
    const caps = new Tr2CapsALWebgl2();

    assert.equal(caps.SupportsStandaloneSwapChain(), false);
    assert.equal(caps.SupportsGpuBuffer(), true);
    assert.equal(Tr2Webgl2PlatformCaps.SUPPORTS_UNORDERED_ACCESS, false);
    assert.equal(Tr2Webgl2PlatformCaps.SUPPORTS_COMPUTE, false);
    assert.equal(Tr2Webgl2PlatformCaps.SUPPORTS_MSAA_SAMPLE, false);
});
