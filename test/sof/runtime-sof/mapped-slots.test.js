import assert from "node:assert/strict";
import test from "node:test";
import { DictReader } from "../../../npm/dist/global/blue/DictReader.js";
import { CjsSchema } from "../../../npm/dist/global/schema/index.js";
import { Tr2CurveConstant } from "../../../npm/dist/trinity/curves/curve/Tr2CurveConstant.js";
import { EveSOFDataArea } from "../../../npm/dist/sof/shared/EveSOFDataArea.js";
import { EveSOFDataAreaMaterial } from "../../../npm/dist/sof/shared/EveSOFDataAreaMaterial.js";
import { EveSOFDataFactionColorSet } from "../../../npm/dist/sof/faction/EveSOFDataFactionColorSet.js";

// EveSOFData_Blue.cpp:135-144 exposes m_materials[type] under the chooser names; the rows sit on the array field and each name reroutes
// into its element.

test("a SOF data bag with Primary and Glass keys fills the right area slots", () =>
{
    const area = new EveSOFDataArea();
    const primary = new EveSOFDataAreaMaterial();
    const glass = new EveSOFDataAreaMaterial();
    new DictReader().ReadInto(area, { Primary: primary, Glass: glass });
    assert.equal(area.materials[EveSOFDataArea.AreaType.TYPE_PRIMARY], primary);
    assert.equal(area.materials[EveSOFDataArea.AreaType.TYPE_GLASS], glass);
    assert.equal(area.materials[EveSOFDataArea.AreaType.TYPE_SAILS], null, "slots the bag does not name stay empty");
});

test("area slots keep their names, indices and flags", () =>
{
    const slots = CjsSchema.getSchema(EveSOFDataArea).members.map(member => [ member.name, member.key, member.index, member.exposure.flags ]);
    assert.equal(slots.length, 10);
    assert.deepEqual(slots[0], [ "Primary", "materials", EveSOFDataArea.AreaType.TYPE_PRIMARY, 19 ]);
    assert.deepEqual(slots[9], [ "Turret", "materials", EveSOFDataArea.AreaType.TYPE_TURRET, 19 ]);
});

test("faction colour slots read a bag into the right element", () =>
{
    const colors = new EveSOFDataFactionColorSet();
    new DictReader().ReadInto(colors, { Killmark: [ 0.25, 0.5, 0.75, 1 ] });
    const killmark = CjsSchema.getSchema(EveSOFDataFactionColorSet).members.find(member => member.name === "Killmark");
    assert.deepEqual(Array.from(colors.colors[killmark.index]), [ 0.25, 0.5, 0.75, 1 ]);
});

test("a READ-only second name is not written from a bag; the persisted name is", () =>
{
    const curve = new Tr2CurveConstant();
    new DictReader().ReadInto(curve, { currentValue: [ 9, 9, 9, 9 ] });
    assert.deepEqual(Array.from(curve.value), [ 0, 0, 0, 0 ], "currentValue is READ");
    new DictReader().ReadInto(curve, { value: [ 4, 3, 2, 1 ] });
    assert.deepEqual(Array.from(curve.value), [ 4, 3, 2, 1 ]);
    assert.equal(curve.currentValue, curve.value, "one storage");
});
