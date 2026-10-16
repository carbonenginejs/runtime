import assert from "node:assert/strict";
import test from "node:test";
import { be } from "../../npm/dist/global/blue/index.js";
import { CjsLightData, Tr2Light, Tr2PointLight } from "../../npm/dist/trinity/index.js";


test("light construction captures frame ticks and retains its original start time", t =>
{
  let frameTime = 300000001;
  t.mock.method(be.os, "GetCurrentFrameTime", () => frameTime);
  for (const Type of [CjsLightData, Tr2Light, Tr2PointLight])
  {
    const first = new Type();
    assert.equal(first.startTime, frameTime);
    const originalTime = frameTime;
    frameTime += 10000003;
    const second = new Type();
    assert.equal(second.startTime, frameTime);
    assert.equal(first.startTime, originalTime);
  }
});
