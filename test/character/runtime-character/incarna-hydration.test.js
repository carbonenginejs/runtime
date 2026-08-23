import test from "node:test";
import assert from "node:assert/strict";
import { CjsSchema } from "../../../npm/dist/global/schema/index.js";
import { vec4 } from "../../../npm/dist/global/math/vec4.js";
import {
  IncarnaScalarCurveInterpolation,
  Tr2ColorCurve,
  Tr2ColorKey,
  Tr2InteriorCell,
  Tr2ScalarCurve,
  Tr2ScalarKey
} from "../../../npm/dist/character/index.js";

test("historical Incarna records hydrate directly from plain JSON", () =>
{
  const cell = Tr2InteriorCell.from({
    isUnbounded: true,
    shProbeResPath: "res:/synthetic/interior/example.shp"
  });
  const colorCurve = Tr2ColorCurve.from({
    length: 1,
    cycle: true,
    startValue: [0, 0, 0, 1],
    endValue: [1, 0.5, 0.25, 1],
    keys: [
      { time: 0.25, value: [0.25, 0.125, 0.0625, 1] },
      { time: 0.75, value: [0.75, 0.375, 0.1875, 1] }
    ]
  });
  const scalarCurve = Tr2ScalarCurve.from({
    length: 1,
    cycle: false,
    startValue: 0,
    endValue: 1,
    keys: [
      { time: 0.25, value: 0.25 },
      { time: 0.75, value: 0.75 }
    ]
  });

  assert.equal(cell instanceof Tr2InteriorCell, true);
  assert.equal(cell.isUnbounded, true);
  assert.equal(cell.shProbeResPath, "res:/synthetic/interior/example.shp");
  assert.equal(colorCurve.keys[0] instanceof Tr2ColorKey, true);
  assert.equal(scalarCurve.keys[0] instanceof Tr2ScalarKey, true);
  assert.deepEqual(Array.from(colorCurve.GetValueAt(0.5, vec4.create())), [0.5, 0.25, 0.125, 1]);
  assert.equal(scalarCurve.GetValueAt(0.5), 0.5);
});

test("historical Curve2 behavior retains cycle, reverse, and Hermite evaluation", () =>
{
  const colorCurve = Tr2ColorCurve.from({
    length: 2,
    cycle: true,
    startValue: [0, 0, 0, 1],
    endValue: [1, 1, 1, 1]
  });
  assert.deepEqual(Array.from(colorCurve.GetValueAt(2.5, vec4.create())), [0.25, 0.25, 0.25, 1]);

  colorCurve.SetValues({ cycle: false, reversed: true });
  assert.deepEqual(Array.from(colorCurve.GetValueAt(2.5, vec4.create())), [0, 0, 0, 1]);

  const scalarCurve = Tr2ScalarCurve.from({
    length: 1,
    startValue: 0,
    endValue: 1,
    interpolation: IncarnaScalarCurveInterpolation.HERMITE,
    startTangent: 1,
    endTangent: 1
  });
  assert.equal(scalarCurve.GetValueAt(0.5), 0.5);
  scalarCurve.UpdateValue(0.75);
  assert.equal(scalarCurve.currentValue, 0.75);
});

test("historical Incarna shells remain explicitly separated from current Carbon families", () =>
{
  for (const Constructor of [
    Tr2ColorCurve,
    Tr2ColorKey,
    Tr2InteriorCell,
    Tr2ScalarCurve,
    Tr2ScalarKey
  ])
  {
    assert.equal(CjsSchema.getSchema(Constructor).family, "incarna");
  }

  assert.equal(CjsSchema.GetConstructor("Tr2InteriorStatic"), null);
  assert.equal(CjsSchema.GetConstructor("Tr2InteriorFlare"), null);
  assert.equal(CjsSchema.GetConstructor("Tr2InteriorParticleObject"), null);
  assert.equal(CjsSchema.GetConstructor("Tr2ShaderMaterial"), null);
  assert.equal(CjsSchema.GetConstructor("Tr2ShaderManager"), null);
  assert.equal(CjsSchema.GetConstructor("Tr2HighLevelShader"), null);
});
