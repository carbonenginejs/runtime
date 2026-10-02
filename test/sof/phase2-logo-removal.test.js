import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { CjsModel } from "../../npm/dist/global/model/index.js";
import { DictReader, DictWriter, Copier, blue } from "../../npm/dist/global/blue/index.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { EveSOFDataLogo } from "../../npm/dist/sof/shared/EveSOFDataLogo.js";
import { EveSOFDataLogoSet } from "../../npm/dist/sof/shared/EveSOFDataLogoSet.js";
import { EveSOFDataTexture } from "../../npm/dist/sof/shared/EveSOFDataTexture.js";
import { EveSOFDataFaction } from "../../npm/dist/sof/faction/EveSOFDataFaction.js";
import { ErrSOFLogoSetTypeUnknown } from "../../npm/dist/sof/shared/ErrSOFLogoSetTypeUnknown.js";
import { ErrSOFLogoSetTypeNotFound } from "../../npm/dist/sof/shared/ErrSOFLogoSetTypeNotFound.js";

for (const Type of [EveSOFDataLogo, EveSOFDataLogoSet])
test(`${Type.name} retains only native self queries without model helpers`, () =>
{
  const value = new Type();
  assert.equal(Object.getPrototypeOf(Type.prototype), Object.prototype);
  assert.equal(CjsSchema.cast(value, CjsModel), null);
  assert.deepEqual([...mappedInterfaces(Type)], [Type]);
  assert.equal(Type.from, undefined);
  for (const name of ["GetValues", "SetValues", "UpdateValues", "Initialize", "Dispose"])
    assert.equal(value[name], undefined);
});

test("native fields and enum identity retain null slots, persistence and lookup errors", () =>
{
  const names = ["Primary", "Secondary", "Tertiary", "Marking_01", "Marking_02"];
  assert.deepEqual(CjsSchema.getSchema(EveSOFDataLogoSet).members.map(f => f.name), names);
  assert.deepEqual(CjsSchema.getSchema(EveSOFDataLogo).members.map(f => f.name), ["textures"]);
  for (const Type of [EveSOFDataLogo, EveSOFDataLogoSet])
    for (const field of CjsSchema.getSchema(Type).members)
    {
      assert.equal(field.edit.read, true);
      assert.equal(field.edit.persist, true);
      assert.equal(!!field.edit.write, field.name !== "textures");
      assert.notEqual(field.edit.notify, true);
    }
  const set = new EveSOFDataLogoSet();
  for (const name of names) assert.equal(set[name], null);
  assert.equal(set.Has(0), false);
  assert.throws(() => set.Get(0), ErrSOFLogoSetTypeNotFound);
  assert.throws(() => set.Get(5), ErrSOFLogoSetTypeUnknown);
  assert.equal(blue.enums.GetEnum("trinity.EveSOFDataLogoSet.LogoType"), EveSOFDataLogoSet.LogoType);
  assert.equal(Object.isFrozen(EveSOFDataLogoSet.LogoType), true);
  assert.equal(Object.isFrozen(EveSOFDataLogoSet.Types), true);
});

test("actual Faction parent hydrates shared logo children and copies their named textures", () =>
{
  const faction = new DictReader({ declarations: true }).CreateObject({
    _type: "EveSOFDataFaction", name: "authored-logo-owner", logoSet: {
      _type: "EveSOFDataLogoSet", Primary: { _ref: "logo" }, Secondary: {
        _type: "EveSOFDataLogo", _id: "logo", textures: [{
          _type: "EveSOFDataTexture", name: "LogoMap", resFilePath: "res:/test/logo.dds"
        }]
      }
    }
  });
  assert.ok(faction instanceof EveSOFDataFaction);
  assert.ok(faction.logoSet instanceof EveSOFDataLogoSet);
  assert.ok(faction.logoSet.Primary instanceof EveSOFDataLogo);
  assert.ok(faction.logoSet.Primary.textures[0] instanceof EveSOFDataTexture);
  assert.equal(faction.logoSet.Primary, faction.logoSet.Secondary);
  assert.equal(faction.GetLogoType(2, 0), faction.logoSet.Primary);
  assert.deepEqual(faction.GetLogoType(0).Assign(), { textures: { LogoMap: "res:/test/logo.dds" } });
  const copy = new Copier().CloneTo(faction);
  assert.notEqual(copy.logoSet, faction.logoSet);
  assert.notEqual(copy.logoSet.Primary, faction.logoSet.Primary);
  assert.notEqual(copy.logoSet.Primary.textures[0], faction.logoSet.Primary.textures[0]);
  assert.equal(copy.logoSet.Primary, copy.logoSet.Secondary);
  assert.equal(copy.logoSet.Tertiary, null);
  assert.deepEqual(copy.GetLogoType(0).AssignTextures(), { LogoMap: "res:/test/logo.dds" });
  const bag = new DictWriter().WriteObject(faction, {}, { persistOnly: true, refs: true });
  const restored = new DictReader({ declarations: true }).CreateObject({ _type: "EveSOFDataFaction", ...bag });
  assert.equal(restored.logoSet.Primary, restored.logoSet.Secondary);
  assert.deepEqual(restored.GetLogoType(0).AssignTextures(), { LogoMap: "res:/test/logo.dds" });
});

test("custom composition preserves reusable outputs and empty-base-slot behavior", () =>
{
  const reader = new DictReader({ declarations: true });
  const make = path => reader.CreateObject({ _type: "EveSOFDataLogo", textures: [{
    _type: "EveSOFDataTexture", name: "LogoMap", resFilePath: path
  }] });
  const base = make("base"), override = make("override"), output = make("old");
  const outputList = output.textures, outputTexture = output.textures[0];
  assert.equal(EveSOFDataLogo.combine(base, override, output), output);
  assert.equal(output.textures, outputList);
  assert.equal(output.textures[0], outputTexture);
  assert.deepEqual(output.AssignTextures(), { LogoMap: "override" });
  assert.equal(EveSOFDataLogo.combine(null, base, output), output);
  assert.deepEqual(output.AssignTextures(), { LogoMap: "override" });
  const set = new EveSOFDataLogoSet();
  set.Primary = base;
  const result = EveSOFDataLogoSet.combine(set, null);
  assert.deepEqual(result.Get(0).AssignTextures(), { LogoMap: "base" });
  assert.ok(result.Secondary instanceof EveSOFDataLogo);
  assert.deepEqual(result.Secondary.textures, []);
  assert.equal(result.Has(1), true);
});
