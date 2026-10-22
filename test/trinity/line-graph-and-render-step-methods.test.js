import assert from "node:assert/strict";
import { test } from "node:test";
import { Tr2LineGraph, TriRenderStep } from "../../npm/dist/trinity/index.js";

test("Tr2LineGraph name and colour accessors", () =>
{
  const graph = new Tr2LineGraph();
  graph.name = "fps";
  assert.equal(graph.GetName(), "fps");

  graph.SetColor([ 0.25, 0.5, 0.75, 1 ]);
  const out = new Float32Array(4);
  assert.equal(graph.GetColor(out), out);
  assert.deepEqual(Array.from(out), [ 0.25, 0.5, 0.75, 1 ]);
  out[0] = 9;
  assert.equal(graph.color[0], 0.25);

  assert.throws(() => graph.Render(1, null), /unported/);
  assert.throws(() => graph.ReleaseResources(0), /unported/);
});

test("TriRenderStep timer accessors name the missing Tr2ProfileTimer", () =>
{
  for (const name of [ "GetCaptureGpuTime", "SetCaptureGpuTime", "GetCaptureCpuTime", "SetCaptureCpuTime", "GpuTime", "CpuTime", "GetStatName", "SetStatName" ])
  {
    assert.equal(typeof TriRenderStep.prototype[`_${name}`], "function", name);
    assert.throws(() => TriRenderStep.prototype[`_${name}`].call({}, 1), /Tr2ProfileTimer/);
  }
});
