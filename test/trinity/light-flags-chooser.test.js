import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema, meta, type } from "../../npm/dist/global/schema/index.js";
import { blue } from "../../npm/dist/global/blue/index.js";
import {
  Tr2LightManager,
  Tr2Light,
  Tr2FactionLight,
  Tr2PointLight,
  Tr2SpotLight,
  Tr2TexturedPointLight
} from "../../npm/dist/trinity/index.js";

const EDIT_FLAGS = 0x100;
const EDIT_ENUM = 0x200;

// Tr2Light_Blue.cpp:16-19, Tr2LightFlagChooser.
const TR2_LIGHT_FLAG_CHOOSER = [
  [ "AFFECTS_SURFACES", 1, "Affects surfaces" ],
  [ "AFFECTS_PARTICLES", 2, "Affects lit particles" ]
];

test("Tr2LightManager owns Carbon's light flag bits (Tr2LightManager.h:100-105)", () =>
{
  assert.equal(Tr2LightManager.FLAG_AFFECTS_SURFACES, 1);
  assert.equal(Tr2LightManager.FLAG_AFFECTS_PARTICLES, 2);
  assert.equal(Tr2LightManager.FLAG_CASTS_SHADOWS, 4);
  assert.equal(Tr2LightManager.FLAG_IS_VOLUMETRIC, 8);
  assert.equal(Tr2LightManager.FLAG_DEFAULT, Tr2LightManager.FLAG_AFFECTS_SURFACES);
});

test("trinity.Tr2LightFlags registers Carbon's chooser keys (Tr2Light_Blue.cpp:16-21)", () =>
{
  const info = blue.enums.GetEnumInfo("trinity.Tr2LightFlags");
  assert.equal(info.type, Tr2Light.Tr2LightFlags);
  assert.deepEqual({ ...info.type }, { AFFECTS_SURFACES: 1, AFFECTS_PARTICLES: 2 });
  assert.equal(info.exposedName, "Tr2LightFlags");
  assert.equal(info.exposure, 2);
  assert.deepEqual(info.chooser.map(item => [ item.name, item.value, item.description ]), TR2_LIGHT_FLAG_CHOOSER);
});

// The four MAP_ATTRIBUTE_WITH_CHOOSER( "flags", ..., Be::READWRITE | Be::PERSIST,
// Tr2LightFlagChooser ) rows, *Light_Blue.cpp:18. Tr2TexturedPointLight inherits
// the member from Tr2PointLight.
for (const Light of [ Tr2FactionLight, Tr2PointLight, Tr2SpotLight, Tr2TexturedPointLight ])
{
  const className = CjsSchema.getClassName(Light);

  test(`${className}.flags reports Tr2LightFlagChooser with no ENUM or FLAGS bit`, () =>
  {
    const [ , , members ] = blue.classes.GetTypeInfo(new Light());
    assert.equal(members.flags.editflags, 0x013, "READWRITE | PERSIST only");
    assert.equal(members.flags.editflags & EDIT_ENUM, 0);
    assert.equal(members.flags.editflags & EDIT_FLAGS, 0);
    assert.deepEqual(members.flags.choosers, TR2_LIGHT_FLAG_CHOOSER);

    // castsShadows is the contrast: its row passes Be::ENUM with PerLightShadowSettingChooser.
    assert.equal(members.castsShadows.editflags & EDIT_ENUM, EDIT_ENUM);
    assert.equal(members.castsShadows.choosers.length, 3);

    const field = CjsSchema.getField(Light, "flags");
    assert.equal(field.enum, undefined);
    assert.equal(field.chooser.identity, "trinity.Tr2LightFlags");
    assert.equal(field.carbon.member, true);
  });
}

test("meta.chooser declares a chooser without the ENUM bit; a missing chooser throws on read", () =>
{
  blue.enums.Create("test.ChooserProbeFlags", { ONE: 1, TWO: 2 }, {
    chooser: [ { name: "One", value: 1, description: "first" } ]
  });
  blue.enums.Create("test.ChooserProbeNoChooser", { ONE: 1 });

  class ChooserProbe {}
  CjsSchema.define(ChooserProbe, {
    className: "ChooserProbe",
    fields: {
      bits: [ type.uint16, CjsSchema.meta.readwrite, meta.chooser("test.ChooserProbeFlags") ]
    }
  });
  const [ , , members ] = blue.classes.GetTypeInfo(new ChooserProbe());
  assert.equal(members.bits.editflags, 0x003);
  assert.deepEqual(members.bits.choosers, [ [ "One", 1, "first" ] ]);
  assert.equal(CjsSchema.getField(ChooserProbe, "bits").carbon, undefined, "meta.chooser is ours");

  class NoChooserProbe {}
  CjsSchema.define(NoChooserProbe, {
    className: "NoChooserProbe",
    fields: { bits: [ type.uint16, meta.chooser("test.ChooserProbeNoChooser") ] }
  });
  assert.throws(() => CjsSchema.getField(NoChooserProbe, "bits"), /registers no chooser/);
  assert.throws(() => meta.chooser("Unqualified"), /qualified name/);
});
