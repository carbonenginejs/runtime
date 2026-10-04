// Carbon samples a space object's ball slots through the Be::Time curve overloads (EveSpaceObject2.cpp:3053-3083).
// JavaScript cannot overload on argument type, so those are the ...Ticks methods; a sampler that used the seconds
// overload with scene ticks would read keyed curves ten million times too late.
import test from "node:test";
import assert from "node:assert/strict";
import { vec3 } from "../../npm/dist/global/math/vec3.js";
import { EveSpaceObject2 } from "../../npm/dist/trinity/eve/spaceObject/EveSpaceObject2.js";
import { Tr2CurveVector3 } from "../../npm/dist/trinity/curves/curve/Tr2CurveVector3.js";
import { Tr2TranslationAdapter } from "../../npm/dist/trinity/curves/curve/Tr2TranslationAdapter.js";
import { Tr2CurveInterpolation } from "../../npm/dist/trinity/curves/enums.js";

const TICKS_PER_SECOND = 10_000_000;
// A scene that has been up for about 5.8 days: a realistic Blue-start tick count.
const SCENE_START = 5_000_000_000_000;

function keyedRamp()
{
  const curve = new Tr2CurveVector3();
  curve.AddKey(0, vec3.fromValues(0, 0, 0), Tr2CurveInterpolation.LINEAR);
  curve.AddKey(10, vec3.fromValues(100, 0, 0), Tr2CurveInterpolation.LINEAR);
  return curve;
}

function near(actual, expected, label)
{
  for (let index = 0; index < 3; index++)
  {
    assert.ok(Math.abs(actual[index] - expected[index]) < 1e-3, `${label}: component ${index} ${actual[index]} vs ${expected[index]}`);
  }
}

test("a keyed curve in a ship translation slot is sampled at the tick time in seconds", () =>
{
  const ship = new EveSpaceObject2();
  ship.translationCurve = keyedRamp();
  ship.UpdateWorldTransform(3 * TICKS_PER_SECOND);
  // Seconds would be 3; the seconds overload fed raw ticks would sit on the last key (100).
  near(ship.worldPosition, [ 30, 0, 0 ], "3 s into the ramp");
  near([ ship.worldTransform[12], ship.worldTransform[13], ship.worldTransform[14] ], [ 30, 0, 0 ], "world translation");
});

test("a translation adapter in the slot latches its start on the first tick sample and runs from there", () =>
{
  const ship = new EveSpaceObject2();
  const adapter = new Tr2TranslationAdapter();
  adapter.curve = keyedRamp();
  ship.translationCurve = adapter;

  ship.UpdateWorldTransform(SCENE_START);
  near(ship.worldPosition, [ 0, 0, 0 ], "first sample latches the start");
  ship.UpdateWorldTransform(SCENE_START + 5 * TICKS_PER_SECOND);
  near(ship.worldPosition, [ 50, 0, 0 ], "five seconds after the start");
  // The seconds overload takes its argument as given, with no latch: Carbon's double path.
  const out = vec3.create();
  near(adapter.GetValueAt(2, out), [ 20, 0, 0 ], "seconds overload");
});
