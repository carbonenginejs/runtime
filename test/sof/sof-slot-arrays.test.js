import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { DictReader, DictWriter } from "../../npm/dist/global/blue/index.js";
import { CjsGraphFormat } from "../../npm/dist/resource/formats/graph/index.js";
import { EveSOFDataArea } from "../../npm/dist/sof/shared/EveSOFDataArea.js";
import { EveSOFDataAreaMaterial } from "../../npm/dist/sof/shared/EveSOFDataAreaMaterial.js";
import { EveSOFDataLogoSet } from "../../npm/dist/sof/shared/EveSOFDataLogoSet.js";
import { EveSOFDataLogo } from "../../npm/dist/sof/shared/EveSOFDataLogo.js";
import { EveSOFDataBlinkType } from "../../npm/dist/sof/shared/EveSOFDataBlinkType.js";
import { EveSOFDataBlink } from "../../npm/dist/sof/shared/EveSOFDataBlink.js";
import { EveSOFDataFactionColorSet } from "../../npm/dist/sof/faction/EveSOFDataFactionColorSet.js";

// Carbon stores these slots as one array indexed by a type enum and exposes
// each slot under its chooser name. Every export must carry those names, never
// the storage array, and must leave empty slots out.
const ColorType = EveSOFDataFactionColorSet.ColorType;
const CASES = [
  {
    Class: EveSOFDataArea, key: "materials",
    // EveSOFData_Blue.cpp:132-145; Wreck (5) is not exposed.
    names: { Primary: 0, Glass: 1, Sails: 2, Reactor: 3, Darkhull: 4, Rock: 6, Monument: 7, Ornament: 8, SimplePrimary: 9, Turret: 10 },
    make: () => new EveSOFDataAreaMaterial(),
    bag: () => ({ _type: "EveSOFDataAreaMaterial" })
  },
  {
    Class: EveSOFDataLogoSet, key: "logos",
    // EveSOFData_Blue.cpp:1128-1132.
    names: { Primary: 0, Secondary: 1, Tertiary: 2, Marking_01: 3, Marking_02: 4 },
    make: () => new EveSOFDataLogo(),
    bag: () => ({ _type: "EveSOFDataLogo" })
  },
  {
    Class: EveSOFDataBlinkType, key: "blinkType",
    // EveSOFData_Blue.cpp:1143-1146; Static (0) is not exposed, Cycle is CE-115.
    names: { Blink: 1, FadeIn: 2, FadeOut: 3, Cycle: 4 },
    make: () => new EveSOFDataBlink(),
    bag: () => ({ _type: "EveSOFDataBlink" })
  },
  {
    Class: EveSOFDataFactionColorSet, key: "colors",
    // EveSOFData_Blue.cpp:153-198: every ColorType slot is exposed.
    names: Object.fromEntries(CjsSchema.getSchema(EveSOFDataFactionColorSet).members.map(field => [ field.name, field.index ])),
    make: () => new Float32Array([ 0.5, 0.25, 0.125, 1 ]),
    bag: () => [ 0.5, 0.25, 0.125, 1 ]
  }
];

/** Member keys of an exported record, without type, id and metadata tags. */
const memberKeys = record => Object.keys(record).filter(key => !key.startsWith("_")).sort();

/** The three exports: values, persisted Blue dictionary and graph wire. */
const exports = instance => ({
  values: CjsSchema.getValues(instance),
  dict: new DictWriter().WriteObject(instance, {}, { persistOnly: true }),
  graph: JSON.parse(new TextDecoder().decode(CjsGraphFormat.write(instance))).root
});

test("colour slot names are the 44 chooser names, one per ColorType", () =>
{
  const { names } = CASES[3];
  assert.equal(Object.keys(names).length, ColorType.TYPE_MAX);
  assert.deepEqual(Object.values(names).sort((a, b) => a - b), Array.from({ length: ColorType.TYPE_MAX }, (_, index) => index));
});

for (const { Class, key, names, make } of CASES)
test(`${CjsSchema.getClassName(Class)} exports exactly Carbon's slot names, never "${key}"`, () =>
{
  const instance = new Class();
  for (const index of Object.values(names)) instance[key][index] = make();
  for (const [ format, record ] of Object.entries(exports(instance)))
  {
    assert.deepEqual(memberKeys(record), Object.keys(names).sort(), format);
    assert.equal(key in record, false, format);
  }
});

for (const { Class, key, names, make } of CASES)
{
  if (Class === EveSOFDataFactionColorSet) continue; // every colour slot always holds a colour
  test(`${CjsSchema.getClassName(Class)} leaves empty slots out of every export`, () =>
  {
    const [ name, index ] = Object.entries(names)[1];
    const instance = new Class();
    instance[key][index] = make();
    for (const [ format, record ] of Object.entries(exports(instance)))
      assert.deepEqual(memberKeys(record), [ name ], format);
  });
}

for (const { Class, key, names, bag } of CASES)
test(`${CjsSchema.getClassName(Class)} reads each slot name back to its index`, () =>
{
  const className = CjsSchema.getClassName(Class);
  for (const [ name, index ] of Object.entries(names))
  {
    const viaReader = new DictReader({ declarations: true }).CreateObject({ _type: className, [name]: bag() });
    const viaValues = new Class();
    CjsSchema.setValues(viaValues, { [name]: bag() });
    for (const instance of [ viaReader, viaValues ])
    {
      assert.notEqual(instance[key][index], null, name);
      if (Class !== EveSOFDataFactionColorSet)
        assert.equal(instance[key].filter(slot => slot !== null).length, 1, name);
    }
    const round = CjsGraphFormat.read(CjsGraphFormat.write(viaReader), { emit: "runtime" }).root;
    assert.notEqual(round[key][index], null, name);
  }
});
