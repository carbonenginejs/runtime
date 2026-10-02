import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { CjsModel } from "../../npm/dist/global/model/index.js";
import { DictReader, DictWriter, Copier } from "../../npm/dist/global/blue/index.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { EveSOFDataBooster } from "../../npm/dist/sof/shared/EveSOFDataBooster.js";
import { EveSOFDataBoosterShape } from "../../npm/dist/sof/shared/EveSOFDataBoosterShape.js";
import { EveSOFDataRace } from "../../npm/dist/sof/race/EveSOFDataRace.js";
import { EveSOFDataMgr } from "../../npm/dist/sof/EveSOFDataMgr.js";

for (const Type of [EveSOFDataBooster, EveSOFDataBoosterShape])
test(`${Type.name} retains native self-only queries and no model services`, () =>
{
  const value = new Type();
  assert.equal(Object.getPrototypeOf(Type.prototype), Object.prototype);
  assert.equal(CjsSchema.cast(value, CjsModel), null);
  assert.deepEqual([...mappedInterfaces(Type)], [Type]);
  assert.equal(Type.from, undefined);
  for (const name of ["GetValues", "SetValues", "UpdateValues", "Initialize", "Dispose"])
    assert.equal(value[name], undefined);
});

test("all native fields retain ordered RW persistence and four independent default shapes", () =>
{
  const expected = [
    [EveSOFDataBooster, ["scale", "glowColor", "warpGlowColor", "glowScale", "haloColor", "warpHalpColor", "haloScaleX", "haloScaleY", "symHaloScale", "trailColor", "trailSize", "shape0", "shape1", "warpShape0", "warpShape1", "shapeAtlasResPath", "gradient0ResPath", "gradient1ResPath", "shapeAtlasHeight", "shapeAtlasCount", "lightOffset", "lightRadius", "lightWarpRadius", "lightFlickerAmplitude", "lightFlickerFrequency", "lightColor", "lightWarpColor"]],
    [EveSOFDataBoosterShape, ["noiseFunction", "noiseSpeed", "noiseAmplitureStart", "noiseAmplitureEnd", "noiseFrequency", "color"]]
  ];
  for (const [Type, names] of expected)
  {
    const fields = CjsSchema.getSchema(Type).members;
    assert.deepEqual(fields.map(f => f.name), names);
    for (const field of fields)
    {
      for (const flag of ["read", "write", "persist"]) assert.equal(field.edit[flag], true);
      assert.notEqual(field.edit.notify, true);
    }
  }
  const value = new EveSOFDataBooster();
  const shapes = [value.shape0, value.shape1, value.warpShape0, value.warpShape1];
  assert.equal(new Set(shapes).size, 4);
  assert.ok(shapes.every(shape => shape instanceof EveSOFDataBoosterShape));
  value.shape0.color[0] = 3;
  assert.equal(value.shape1.color[0], 0);
});

test("Race owner hydration and copying preserve shared shapes and manager projection", () =>
{
  const race = new DictReader({ declarations: true }).CreateObject({
    _type: "EveSOFDataRace", name: "authored-booster-race", booster: {
      _type: "EveSOFDataBooster", warpHalpColor: [1, 2, 3, 4], gradient0ResPath: "res:/test/gradient.dds",
      shape0: { _ref: "shared" }, shape1: { _type: "EveSOFDataBoosterShape", _id: "shared", noiseFunction: 2, noiseSpeed: 3, noiseAmplitureStart: [4, 5, 6, 7] }, warpShape0: null
    }
  });
  assert.ok(race instanceof EveSOFDataRace);
  assert.ok(race.booster instanceof EveSOFDataBooster);
  assert.equal(race.booster.shape0, race.booster.shape1);
  // Native Copier rejects a null source replacing a constructor-owned object.
  assert.equal(new Copier().CloneTo(race), null);
  race.booster.warpShape0 = new EveSOFDataBoosterShape();
  const copy = new Copier().CloneTo(race);
  assert.notEqual(copy.booster, race.booster);
  assert.notEqual(copy.booster.shape0, race.booster.shape0);
  assert.equal(copy.booster.shape0, copy.booster.shape1);
  assert.ok(copy.booster.warpShape0 instanceof EveSOFDataBoosterShape);
  assert.notEqual(copy.booster.shape0.noiseAmplitureStart, race.booster.shape0.noiseAmplitureStart);
  const manager = new EveSOFDataMgr();
  copy.booster.warpShape0 = null;
  assert.equal(manager.SetData({ hull: [], faction: [], race: [copy], material: [], pattern: [], layout: [], generic: {} }), true);
  const projected = manager.GetRaceData(copy.name).boosters;
  assert.deepEqual(Array.from(projected.warpHaloColor), [1, 2, 3, 4]);
  assert.deepEqual(Array.from(projected.shape0.noiseAmplitureStart), [4, 5, 6, 7]);
  assert.equal(projected.shape1.noiseFunction, 2);
  assert.equal(projected.shape1.noiseSpeed, 3);
  assert.equal(projected.gradient0ResPath, "res:/test/gradient.dds");
  assert.deepEqual(Array.from(projected.warpShape0.color), [0, 0, 0, 0]);
  assert.notEqual(projected.shape0.noiseAmplitureStart, copy.booster.shape0.noiseAmplitureStart);
  const bag = new DictWriter().WriteObject(copy, {}, { persistOnly: true, refs: true });
  const restored = new DictReader({ declarations: true }).CreateObject({ _type: "EveSOFDataRace", ...bag });
  assert.equal(restored.booster.shape0, restored.booster.shape1);
  assert.equal(restored.booster.warpShape0, null);
});

test("correctly spelled aliases copy in place while persistence keeps native spellings", () =>
{
  const value = new EveSOFDataBooster(), shape = value.shape0;
  const halo = value.warpHalpColor, start = shape.noiseAmplitureStart, end = shape.noiseAmplitureEnd;
  value.warpHaloColor = [1, 2, 3, 4];
  shape.noiseAmplitudeStart = [5, 6, 7, 8];
  shape.noiseAmplitudeEnd = [9, 10, 11, 12];
  assert.equal(value.warpHaloColor, halo);
  assert.equal(shape.noiseAmplitudeStart, start);
  assert.equal(shape.noiseAmplitudeEnd, end);
  assert.deepEqual(Array.from(start), [5, 6, 7, 8]);
  const bag = new DictWriter().WriteObject(value, {}, { persistOnly: true });
  assert.deepEqual(bag.warpHalpColor, [1, 2, 3, 4]);
  assert.equal(Object.hasOwn(bag, "warpHaloColor"), false);
  assert.equal(Object.hasOwn(bag.shape0, "noiseAmplitudeStart"), false);
  assert.deepEqual(bag.shape0.noiseAmplitureEnd, [9, 10, 11, 12]);
});

test("composition preserves vector/shape output identity and accepts zero overrides", () =>
{
  const base = new EveSOFDataBooster(), output = new EveSOFDataBooster();
  base.glowScale = 2; base.shapeAtlasResPath = "base"; base.shape0.noiseSpeed = 4;
  const vector = output.scale, shape = output.shape0, amplitude = shape.noiseAmplitureStart;
  assert.equal(EveSOFDataBooster.combine(base, { glowScale: 0, shapeAtlasResPath: "", shape0: { noiseSpeed: 0 } }, output), output);
  assert.equal(output.glowScale, 0);
  assert.equal(output.shapeAtlasResPath, "base");
  assert.equal(output.scale, vector);
  assert.equal(output.shape0, shape);
  assert.equal(output.shape0.noiseAmplitureStart, amplitude);
  assert.equal(output.shape0.noiseSpeed, 0);
  assert.equal(EveSOFDataBooster.combine(null, null, output), output);
});
