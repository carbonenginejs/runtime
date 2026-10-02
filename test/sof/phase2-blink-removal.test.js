import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { DictReader, DictWriter, Copier, blue } from "../../npm/dist/global/blue/index.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { EveSOFDataBlink } from "../../npm/dist/sof/shared/EveSOFDataBlink.js";
import { EveSOFDataBlinkType } from "../../npm/dist/sof/shared/EveSOFDataBlinkType.js";
import { EveSOFDataHull } from "../../npm/dist/sof/hull/EveSOFDataHull.js";
import { EveSOFDataHullPlaneSet } from "../../npm/dist/sof/hull/EveSOFDataHullPlaneSet.js";
import { EveSOFDataHullPlaneSetItem } from "../../npm/dist/sof/hull/EveSOFDataHullPlaneSetItem.js";

for (const Type of [EveSOFDataBlink, EveSOFDataBlinkType])
test(`${Type.name} is an IRoot-shaped record with only its native self query`, () =>
{
  const value = new Type();
  assert.equal(Object.getPrototypeOf(Type.prototype), Object.prototype);
  assert.equal("GetValues" in value, false);
  assert.deepEqual([...mappedInterfaces(Type)], [Type]);
  assert.equal(Type.from, undefined);
  for (const method of ["SetValues", "GetValues", "UpdateValues", "Initialize", "Dispose"])
    assert.equal(value[method], undefined);
});

test("blink declarations retain ordered nullable persistent slots and empty child shape", () =>
{
  const names = ["Blink", "FadeIn", "FadeOut", "Cycle"];
  const fields = CjsSchema.getSchema(EveSOFDataBlinkType).members;
  assert.deepEqual(fields.map(f => f.name), names);
  const value = new EveSOFDataBlinkType();
  for (const field of fields)
  {
    assert.equal(field.edit.read, true);
    assert.equal(field.edit.write, true);
    assert.equal(field.edit.persist, true);
    assert.notEqual(field.edit.notify, true);
    assert.equal(value[field.name], null);
  }
  assert.equal(CjsSchema.getSchema(EveSOFDataBlink).members.length, 0);
  assert.equal(new EveSOFDataBlink().IsEmpty(), true);
  for (const mode of [0, -1, 5, NaN]) assert.equal(value.GetByType(mode), null);
});

test("actual BlinkType parent hydrates and copies shared Blink children through Blue operations", () =>
{
  const parent = new DictReader({ declarations: true }).CreateObject({
    _type: "EveSOFDataBlinkType", Blink: { _ref: "shared" },
    FadeIn: { _type: "EveSOFDataBlink", _id: "shared" },
    FadeOut: null, Cycle: { _type: "EveSOFDataBlink" }
  });
  assert.ok(parent instanceof EveSOFDataBlinkType);
  assert.ok(parent.Blink instanceof EveSOFDataBlink);
  assert.equal(parent.Blink, parent.FadeIn);
  assert.notEqual(parent.Cycle, parent.Blink);
  assert.equal(parent.GetByType(4), parent.Cycle);
  const copy = new Copier().CloneTo(parent);
  assert.notEqual(copy, parent);
  assert.notEqual(copy.Blink, parent.Blink);
  assert.equal(copy.Blink, copy.FadeIn);
  assert.equal(copy.FadeOut, null);
  assert.notEqual(copy.Cycle, copy.Blink);
  const bag = new DictWriter().WriteObject(parent, {}, { persistOnly: true, refs: true });
  const restored = new DictReader({ declarations: true }).CreateObject({ _type: "EveSOFDataBlinkType", ...bag });
  assert.equal(restored.Blink, restored.FadeIn);
  assert.ok(restored.Cycle instanceof EveSOFDataBlink);
});

test("actual hull plane owner hydration and copy preserve the shared blink enum identity", () =>
{
  const nativeEnum = EveSOFDataBlinkType.BlinkType;
  assert.equal(EveSOFDataHullPlaneSetItem.BlinkType, nativeEnum);
  assert.equal(blue.enums.GetEnum("trinity.EveSOFDataBlinkType.BlinkType"), nativeEnum);
  assert.equal(CjsSchema.getField(EveSOFDataHullPlaneSetItem, "blinkMode").enum.members, nativeEnum);
  for (const values of [nativeEnum, EveSOFDataBlinkType.Type, EveSOFDataBlinkType.Types])
    assert.equal(Object.isFrozen(values), true);
  assert.deepEqual(EveSOFDataBlinkType.Types, [null, "Blink", "FadeIn", "FadeOut", "Cycle"]);
  const hull = new DictReader({ declarations: true }).CreateObject({
    _type: "EveSOFDataHull", name: "authored-blink-owner", planeSets: [{
      _type: "EveSOFDataHullPlaneSet", name: "planes", items: [{
        _type: "EveSOFDataHullPlaneSetItem", blinkMode: nativeEnum.TYPE_CYCLE
      }]
    }]
  });
  assert.ok(hull instanceof EveSOFDataHull);
  assert.ok(hull.planeSets[0] instanceof EveSOFDataHullPlaneSet);
  assert.ok(hull.planeSets[0].items[0] instanceof EveSOFDataHullPlaneSetItem);
  const copy = new Copier().CloneTo(hull);
  assert.notEqual(copy.planeSets[0].items[0], hull.planeSets[0].items[0]);
  assert.equal(copy.planeSets[0].items[0].blinkMode, 4);
  assert.equal(copy.planeSets[0].items[0].constructor.BlinkType, nativeEnum);
});
