import { IRoot as ExposureRoot } from "../../npm/dist/global/blue/IRoot.js";
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
  assert.deepEqual([...mappedInterfaces(Type)], [ExposureRoot, Type]);
  assert.equal(Type.from, undefined);
  for (const method of ["SetValues", "GetValues", "UpdateValues", "Initialize", "Dispose"])
    assert.equal(value[method], undefined);
});

test("blink declarations name the ordered nullable persistent slots of m_blinkType", () =>
{
  const { BlinkType } = EveSOFDataBlinkType;
  const fields = CjsSchema.getSchema(EveSOFDataBlinkType).members;
  assert.deepEqual(fields.map(f => [ f.name, f.key, f.index ]), [
    [ "Blink", "blinkType", BlinkType.TYPE_BLINK ],
    [ "FadeIn", "blinkType", BlinkType.TYPE_FADE_IN ],
    [ "FadeOut", "blinkType", BlinkType.TYPE_FADE_OUT ],
    [ "Cycle", "blinkType", BlinkType.TYPE_CYCLE ]
  ]);
  const value = new EveSOFDataBlinkType();
  // CE-115: Carbon's array holds TYPE_CYCLE slots but exposes Cycle at TYPE_CYCLE.
  assert.equal(value.blinkType.length, BlinkType.TYPE_CYCLE + 1);
  assert.deepEqual(value.blinkType, [ null, null, null, null, null ]);
  for (const field of fields)
  {
    assert.equal(field.edit.read, true);
    assert.equal(field.edit.write, true);
    assert.equal(field.edit.persist, true);
    assert.notEqual(field.edit.notify, true);
  }
  assert.equal(CjsSchema.getSchema(EveSOFDataBlink).members.length, 0);
  assert.equal(new EveSOFDataBlink().IsEmpty(), true);
});

test("actual BlinkType parent hydrates and copies shared Blink children through Blue operations", () =>
{
  const parent = new DictReader({ declarations: true }).CreateObject({
    _type: "EveSOFDataBlinkType", Blink: { _ref: "shared" },
    FadeIn: { _type: "EveSOFDataBlink", _id: "shared" },
    FadeOut: null, Cycle: { _type: "EveSOFDataBlink" }
  });
  const [ , BLINK, FADE_IN, FADE_OUT, CYCLE ] = [ 0, 1, 2, 3, 4 ];
  assert.ok(parent instanceof EveSOFDataBlinkType);
  assert.ok(parent.blinkType[BLINK] instanceof EveSOFDataBlink);
  assert.equal(parent.blinkType[BLINK], parent.blinkType[FADE_IN]);
  assert.equal(parent.blinkType[FADE_OUT], null);
  assert.notEqual(parent.blinkType[CYCLE], parent.blinkType[BLINK]);
  assert.equal(parent.blinkType[0], null);
  const copy = new Copier().CloneTo(parent);
  assert.notEqual(copy, parent);
  assert.notEqual(copy.blinkType, parent.blinkType);
  assert.notEqual(copy.blinkType[BLINK], parent.blinkType[BLINK]);
  assert.equal(copy.blinkType[BLINK], copy.blinkType[FADE_IN]);
  assert.equal(copy.blinkType[FADE_OUT], null);
  assert.notEqual(copy.blinkType[CYCLE], copy.blinkType[BLINK]);
  const bag = new DictWriter().WriteObject(parent, {}, { persistOnly: true, refs: true });
  // Exported keys are the slot names; the empty FadeOut slot is not written.
  assert.deepEqual(Object.keys(bag).filter(key => !key.startsWith("_")), [ "Blink", "FadeIn", "Cycle" ]);
  const restored = new DictReader({ declarations: true }).CreateObject({ _type: "EveSOFDataBlinkType", ...bag });
  assert.equal(restored.blinkType[BLINK], restored.blinkType[FADE_IN]);
  assert.equal(restored.blinkType[FADE_OUT], null);
  assert.ok(restored.blinkType[CYCLE] instanceof EveSOFDataBlink);
});

test("actual hull plane owner hydration and copy preserve the shared blink enum identity", () =>
{
  const nativeEnum = EveSOFDataBlinkType.BlinkType;
  assert.equal(EveSOFDataHullPlaneSetItem.BlinkType, nativeEnum);
  assert.equal(blue.enums.GetEnum("trinity.EveSOFDataBlinkType.BlinkType"), nativeEnum);
  assert.equal(CjsSchema.getField(EveSOFDataHullPlaneSetItem, "blinkMode").enum.members, nativeEnum);
  assert.equal(Object.isFrozen(nativeEnum), true);
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
