// EveStretch2's display and intensity setters re-register its components on the transitions Carbon names
// (EveStretch2.cpp:187-206), and its lights are skipped only while hidden or at exactly zero intensity (cpp:400-418).
import test from "node:test";
import assert from "node:assert/strict";
import { EveStretch2, Tr2PointLight } from "../../npm/dist/trinity/index.js";

/** A real stretch, shown at intensity 1 by default, whose ReRegister calls are counted. */
function counted()
{
  const stretch = new EveStretch2();
  let calls = 0;
  stretch.ReRegister = () => { calls++; };
  return { stretch, calls: () => calls };
}

/** Gives the stretch a real source light whose AddLight records the scale it is offered at. */
function recordLights(stretch)
{
  const scales = [];
  stretch.sourceLight = new Tr2PointLight();
  stretch.sourceLight.AddLight = (_manager, _transform, scale) => scales.push(scale);
  return scales;
}

test("SetIntensity re-registers only when the intensity crosses zero", () =>
{
  const { stretch, calls } = counted();
  stretch.SetIntensity(1);
  assert.equal(calls(), 0, "unchanged");
  stretch.SetIntensity(0);
  assert.equal(calls(), 1, "positive to zero");
  stretch.SetIntensity(0);
  assert.equal(calls(), 1, "zero to zero");
  stretch.SetIntensity(1);
  assert.equal(calls(), 2, "zero to positive");
  stretch.SetIntensity(0.5);
  assert.equal(calls(), 2, "positive to positive");
});

test("SetIntensity keeps a negative value unclamped, and a negative intensity still offers lights", () =>
{
  const { stretch, calls } = counted();
  stretch.SetIntensity(-1);
  assert.equal(calls(), 0, "positive to negative is not a crossing Carbon re-registers on");
  const scales = recordLights(stretch);
  stretch.GetLights({});
  assert.deepEqual(scales, [ 1 ], "only exactly zero intensity skips the lights");
});

test("SetDisplay re-registers on a change only, and a hidden stretch offers no lights", () =>
{
  const { stretch, calls } = counted();
  stretch.SetDisplay(true);
  assert.equal(calls(), 0, "unchanged");
  stretch.SetDisplay(false);
  assert.equal(calls(), 1, "hidden");
  stretch.SetDisplay(false);
  assert.equal(calls(), 1, "unchanged");
  const scales = recordLights(stretch);
  stretch.GetLights({});
  assert.deepEqual(scales, [], "hidden");
  stretch.SetDisplay(true);
  assert.equal(calls(), 2, "shown");
  stretch.GetLights({});
  assert.deepEqual(scales, [ 1 ], "shown");
});
