import { IRoot as ExposureRoot } from "../../npm/dist/global/blue/IRoot.js";
import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { DictReader, DictWriter, Copier, be } from "../../npm/dist/global/blue/index.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { EveSOFDataLogo } from "../../npm/dist/sof/shared/EveSOFDataLogo.js";
import { EveSOFDataLogoSet } from "../../npm/dist/sof/shared/EveSOFDataLogoSet.js";
import { EveSOFDataTexture } from "../../npm/dist/sof/shared/EveSOFDataTexture.js";
import { EveSOFDataFaction } from "../../npm/dist/sof/faction/EveSOFDataFaction.js";

for (const Type of [EveSOFDataLogo, EveSOFDataLogoSet])
test(`${Type.name} retains only native self queries without model helpers`, () =>
{
  const value = new Type();
  assert.equal(Object.getPrototypeOf(Type.prototype), Object.prototype);
  assert.equal("GetValues" in value, false);
  assert.deepEqual([...mappedInterfaces(Type)], [ExposureRoot, Type]);
  assert.equal(Type.from, undefined);
  for (const name of ["GetValues", "SetValues", "UpdateValues", "Initialize", "Dispose"])
    assert.equal(value[name], undefined);
});

test("native fields and enum identity retain null slots and persistence", () =>
{
  const { LogoType } = EveSOFDataLogoSet;
  const names = ["Primary", "Secondary", "Tertiary", "Marking_01", "Marking_02"];
  assert.deepEqual(CjsSchema.getSchema(EveSOFDataLogoSet).members.map(f => [ f.name, f.key, f.index ]), [
    [ "Primary", "logos", LogoType.TYPE_PRIMARY ],
    [ "Secondary", "logos", LogoType.TYPE_SECONDARY ],
    [ "Tertiary", "logos", LogoType.TYPE_TERTIARY ],
    [ "Marking_01", "logos", LogoType.TYPE_MARKING_01 ],
    [ "Marking_02", "logos", LogoType.TYPE_MARKING_02 ]
  ]);
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
  assert.deepEqual(set.logos, new Array(LogoType.TYPE_MAX).fill(null));
  for (const name of names) assert.equal(name in set, false);
  assert.equal(be.enums.GetEnum("trinity.EveSOFDataLogoSet.LogoType"), LogoType);
  assert.equal(Object.isFrozen(LogoType), true);
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
  const { logos } = faction.logoSet;
  assert.ok(logos[0] instanceof EveSOFDataLogo);
  assert.ok(logos[0].textures[0] instanceof EveSOFDataTexture);
  assert.equal(logos[0], logos[1]);
  assert.deepEqual(logos[0].Assign(), { textures: { LogoMap: "res:/test/logo.dds" } });
  const copy = new Copier().CloneTo(faction);
  assert.notEqual(copy.logoSet, faction.logoSet);
  assert.notEqual(copy.logoSet.logos, logos);
  assert.notEqual(copy.logoSet.logos[0], logos[0]);
  assert.notEqual(copy.logoSet.logos[0].textures[0], logos[0].textures[0]);
  assert.equal(copy.logoSet.logos[0], copy.logoSet.logos[1]);
  assert.equal(copy.logoSet.logos[2], null);
  assert.deepEqual(copy.logoSet.logos[0].AssignTextures(), { LogoMap: "res:/test/logo.dds" });
  const bag = new DictWriter().WriteObject(faction, {}, { persistOnly: true, refs: true });
  // Exported keys are the slot names; empty slots are not written.
  assert.deepEqual(Object.keys(bag.logoSet).filter(key => !key.startsWith("_")), [ "Primary", "Secondary" ]);
  const restored = new DictReader({ declarations: true }).CreateObject({ _type: "EveSOFDataFaction", ...bag });
  assert.equal(restored.logoSet.logos[0], restored.logoSet.logos[1]);
  assert.equal(restored.logoSet.logos[2], null);
  assert.deepEqual(restored.logoSet.logos[0].AssignTextures(), { LogoMap: "res:/test/logo.dds" });
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
  set.logos[EveSOFDataLogoSet.LogoType.TYPE_PRIMARY] = base;
  const result = EveSOFDataLogoSet.combine(set, null);
  assert.deepEqual(result.logos[0].AssignTextures(), { LogoMap: "base" });
  assert.ok(result.logos[1] instanceof EveSOFDataLogo);
  assert.deepEqual(result.logos[1].textures, []);
});
