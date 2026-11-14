// The character factory's DNA core: reading and writing a DNA, the sex defaults, and their merge.
import test from "node:test";
import assert from "node:assert/strict";
import { CjsCharacterFactory, CjsCharacterLibraryManager, CjsCharacterPdpType, CjsPaperDollDefinition, CjsPaperDollInstance } from "../../../npm/dist/character/index.js";
import { installBlueServices } from "../../../npm/dist/blue/blue.js";
import { installPartsLibrary } from "../../support/partsLibrary.js";

test("the defaults are the clean character: eyebrows, head, body, eyes and underwear on, the underwear not overridable", () =>
{
  for (const sex of [ "female", "male" ])
  {
    const defaults = CjsCharacterLibraryManager.defaultPaperDoll(sex);
    assert.equal(defaults.sex, sex);
    assert.deepEqual(Object.keys(defaults.parts).sort(), [ "archetype", "bottomUnderwear", "eyebrows", "eyes", "skin", ...(sex === "female" ? [ "topUnderwear" ] : []) ].sort());
    assert.equal(defaults.parts.bottomUnderwear.overridable, false);
    assert.equal(defaults.parts.eyes.overridable, true);
  }
  const copy = CjsCharacterLibraryManager.defaultPaperDoll("female");
  copy.parts.eyes.option = "changed";
  assert.equal(CjsCharacterLibraryManager.defaultPaperDoll("female").parts.eyes.option, "eyes_01", "a copy the caller may change");
  assert.throws(() => CjsCharacterLibraryManager.defaultPaperDoll("other"), /Unknown character sex/);
});

test("a DNA reads from JSON text or a value, and writes back to the same DNA", () =>
{
  const dna = { sex: "male", parts: { lipstick: { enabled: true, option: "lipstick_02", weight: .5, colors: [ [ 1, 0, 0, 1 ], [ 0, 1, 0, 1 ], [ 0, 0, 1, 1 ] ] } } };
  const read = CjsCharacterFactory.readJSON(JSON.stringify(dna));
  assert.deepEqual(read, dna);
  assert.notEqual(read.parts.lipstick.colors, dna.parts.lipstick.colors, "a copy");
  assert.deepEqual(CjsCharacterFactory.readJSON(CjsCharacterFactory.writeJSON(read)), read);
});

test("a DNA naming an unknown sex, part, field or value type is refused", () =>
{
  assert.throws(() => CjsCharacterFactory.readJSON({ sex: "x", parts: {} }), /Unknown character sex/);
  assert.throws(() => CjsCharacterFactory.readJSON({ sex: "male", parts: { wings: {} } }), /Unknown character part wings/);
  assert.throws(() => CjsCharacterFactory.readJSON({ sex: "male", parts: { eyes: { size: 2 } } }), /Unknown field size/);
  assert.throws(() => CjsCharacterFactory.readJSON({ sex: "male", parts: { eyes: { enabled: "yes" } } }), /enabled is not a boolean/);
  assert.throws(() => CjsCharacterFactory.readJSON({ sex: "male", parts: { eyes: { weight: NaN } } }), /weight is not a number/);
  assert.throws(() => CjsCharacterFactory.readJSON({ sex: "male", parts: { eyes: { colors: [ [ 1, 1, 1 ] ] } } }), /three RGBA/);
  assert.throws(() => CjsCharacterFactory.readJSON({ sex: "male", parts: {}, extra: 1 }), /Unknown character DNA field extra/);
});

test("the merge lays the DNA over the defaults, switches every other part off and keeps parts that are not overridable", () =>
{
  const merged = CjsCharacterFactory.merge({ sex: "female", parts: {
    eyes: { option: "eyes_04" },
    lipstick: { enabled: true, option: "lipstick_02" },
    bottomUnderwear: { option: "other" }
  } });
  assert.deepEqual(Object.keys(merged.parts), CjsCharacterFactory.parts, "every part, in the factory's order");
  assert.equal(merged.parts.eyes.option, "eyes_04");
  assert.equal(merged.parts.eyes.enabled, true, "the default's other values stay");
  assert.deepEqual(merged.parts.lipstick, { enabled: true, option: "lipstick_02" }, "a part only the DNA names takes the DNA's values");
  assert.equal(merged.parts.bottomUnderwear.option, "bikinibottomcf01", "underwear is not overridable");
  assert.deepEqual(merged.problems, [ "bottomUnderwear is not overridable; the DNA's values are not applied" ]);
  assert.deepEqual(merged.parts.blush, { enabled: false }, "a part neither names is off");
  assert.equal(merged.parts.topUnderwear.enabled, true);
});

/** A definition with a few parts configured, and a library whose palettes are coloured by their path's length. */
function configuredDefinition(t)
{
  const characterLibrary = { FetchPalette: async path => ({ colors: [ 0, 1, 2 ].map(i => Float32Array.of(path.length % 7 / 10, i / 10, 0, 1)), specularColors: null, pattern: null }) };
  const previous = installBlueServices({ characterLibrary }, false);
  t.after(() => installBlueServices(previous, previous.running));
  const definition = new CjsPaperDollDefinition();
  definition.sex = "female";
  const resolved = [];
  const resolve = id => { resolved.push(id); return Promise.resolve({ colorAreas: [ 1, 2, 3 ] }); };
  definition.bottomUnderwear.Configure([ { id: "bikinibottomcf01", path: "bottomunderwear/bikinibottomcf01", palettes: [] } ], { resolve });
  definition.eyebrows.Configure([ { id: "eyebrows_01" } ], { resolve });
  definition.lipstick.Configure([ { id: "lipstick_01" }, { id: "lipstick_02" } ], { option: "lipstick_01", resolve });
  definition.blush.Configure([ { id: "blush_01" } ], { option: "blush_01", resolve });
  return { definition, resolved };
}

test("Build writes the merged DNA onto a definition: options resolved when on, palettes read, every other part off", async t =>
{
  const { definition, resolved } = configuredDefinition(t);
  const { problems } = await CjsCharacterFactory.build(definition, { sex: "female", parts: {
    lipstick: { enabled: true, option: "lipstick_02", colors: [ [ 1, 0, 0, 1 ], [ 0, 1, 0, 1 ], [ 0, 0, 1, 1 ] ] }
  } });
  assert.deepEqual([ definition.bottomUnderwear.enabled, definition.bottomUnderwear.option, definition.bottomUnderwear.overridable ], [ true, "bikinibottomcf01", false ]);
  assert.equal(definition.bottomUnderwear.palette, "res:/graphics/character/female/paperdoll/bottomunderwear/bikinibottomcf01/default.color");
  assert.equal(Number(definition.bottomUnderwear.color2[1].toFixed(2)), .1, "the palette file's colours");
  assert.deepEqual([ definition.lipstick.enabled, definition.lipstick.option, definition.lipstick.customColors, Array.from(definition.lipstick.color1) ], [ true, "lipstick_02", true, [ 1, 0, 0, 1 ] ]);
  assert.deepEqual([ definition.blush.enabled, definition.blush.option, definition.blush.weight ], [ false, "", 0 ], "a part neither names is off, with no option");
  assert.deepEqual(resolved.sort(), [ "bikinibottomcf01", "eyebrows_01", "lipstick_02" ], "only the parts that are on are resolved");
  assert.ok(problems.some(problem => /^archetype: option archetypes\/cdshape is not listed/.test(problem)), "what cannot apply is reported");
  assert.ok(problems.some(problem => /^eyes: option eyes_01 is not listed/.test(problem)));
});

test("ResetPart and Reset put a part, or the whole character, back to the defaults", async t =>
{
  const { definition } = configuredDefinition(t);
  await CjsCharacterFactory.build(definition, { sex: "female", parts: { lipstick: { enabled: true, option: "lipstick_02" }, eyebrows: { enabled: false } } });
  await CjsCharacterFactory.resetPart(definition, "eyebrows");
  assert.deepEqual([ definition.eyebrows.enabled, definition.eyebrows.option ], [ true, "eyebrows_01" ]);
  assert.equal(definition.lipstick.enabled, true, "only that part");
  definition.SetLayer("lipstick", 1);
  await CjsCharacterFactory.reset(definition);
  assert.deepEqual([ definition.lipstick.enabled, definition.lipstick.option, definition.lipstick.customColors ], [ false, "", false ]);
  assert.equal(definition.GetLayer("lipstick"), definition.lipstick.constructor.layer, "the layer order back to the class ranks");
  await assert.rejects(CjsCharacterFactory.resetPart(definition, "wings"), /Unknown character part wings/);
});

test("the paper doll holds a part that is not overridable on, unless a worn part occludes it", async t =>
{
  const { definition } = configuredDefinition(t);
  await CjsCharacterFactory.build(definition, { sex: "female", parts: {} });
  definition.bottomUnderwear.enabled = false;
  CjsPaperDollInstance.holdParts(definition);
  assert.equal(definition.bottomUnderwear.enabled, true, "switched back on: nothing occludes it");
  // A worn part whose option occludes the underwear's category lets it be switched off.
  definition.lipstick.Configure([ { id: "cover", occludes: [ "bottomunderwear" ] } ], { option: "cover" });
  definition.lipstick.enabled = true;
  definition.bottomUnderwear.enabled = false;
  CjsPaperDollInstance.holdParts(definition);
  assert.equal(definition.bottomUnderwear.enabled, false, "an occluder removes it");
  // An occluder that a third worn part suppresses covers nothing: the underwear is held on again.
  definition.blush.Configure([ { id: "hood", occludes: [ "makeup/lipstick" ] } ], { option: "hood" });
  definition.blush.enabled = true;
  definition.bottomUnderwear.enabled = false;
  CjsPaperDollInstance.holdParts(definition);
  assert.equal(definition.bottomUnderwear.enabled, true, "a suppressed occluder covers nothing");
  definition.blush.enabled = false;
  definition.bottomUnderwear.overridable = true;
  definition.lipstick.enabled = false;
  definition.bottomUnderwear.enabled = false;
  CjsPaperDollInstance.holdParts(definition);
  assert.equal(definition.bottomUnderwear.enabled, false, "an overridable part stays as the user set it");
});

test("a recipe reads into a DNA: each entry's option on, its weight and colours; what cannot apply is reported", async t =>
{
  const ROOT = "res:/graphics/character/female/paperdoll/", PRS = "res:/graphics/character/dnafiles/test.prs";
  const recipe = [
    "- female",
    "- { category: makeup, path: makeup/lipstick/lipstick_01, weight: 1.0, colors: '[(0.1, 0.2, 0.3, 1.0), (0.4, 0.5, 0.6, 1.0), (0.7, 0.8, 0.9, 1.0)]', colorvariation: null }",
    "- { category: makeup, path: makeup/blush/blush_01, weight: 0.5, colorvariation: pink }",
    "- { category: makeup, path: makeup/aging/aging_01, variation: v1, weight: 1.0 }",
    "- { category: archetypes, path: archetypes/msshape, weight: 1.0 }",
    "- { category: feet, path: feet/feet_nude, weight: 1.0 }",
    "- { category: outer, path: outer/coat01, variation: v9, weight: 1.0 }",
    "- { category: topmiddle, path: topmiddle/shirt01, weight: 1.0, pattern: Camo, colorvariation: plain, colors: '[(1, 0, 0, 1), (0, 1, 0, 1), (0, 0, 1, 1), (1, 1, 0, 1), (0, 1, 1, 1), (0, 0, 8, 8), 0.0]' }",
    "- { category: makeup, path: makeup/eyeliner/eyeliner_01, weight: 1.0, colors: '[(1, 0, 0, 1), (0, 1, 0, 1)]' }",
    ""
  ].join("\n");
  // Entries the paper doll does not apply: the recipe throws, naming each.
  const UNAPPLIED = "res:/graphics/character/dnafiles/unapplied.prs";
  const unapplied = [
    "- female",
    "- { category: hair, path: hair/long01, weight: 1.0 }",
    "- { category: bodyshapes, path: bodyshapes/thinshape, weight: 0.3 }",
    "- { category: dependants, path: dependants/boottucking/standard, variation: v1, weight: 1.0, tuck: true }",
    "- { category: makeup, path: makeup/blush/blush_01, weight: 0.5, colorvariation: pink }",
    ""
  ].join("\n");
  const files = [
    PRS, UNAPPLIED,
    ROOT + "makeup/lipstick/lipstick_01/types/lipstick_01.type", ROOT + "makeup/lipstick/lipstick_01/red.color",
    ROOT + "makeup/blush/blush_01/types/blush_01.type", ROOT + "makeup/blush/blush_01/pink.color",
    ROOT + "makeup/aging/aging_01/types/aging_01_v1.type", ROOT + "makeup/aging/aging_01/v1/comp_head_d.png",
    ROOT + "outer/coat01/types/coat01.type", ROOT + "hair/long01/types/long01.type", ROOT + "archetypes/msshape/head_d.png",
    ROOT + "topmiddle/shirt01/types/shirt01.type", ROOT + "topmiddle/shirt01/plain.color", ROOT + "makeup/eyeliner/eyeliner_01/types/eyeliner_01.type"
  ];
  installPartsLibrary(t, ROOT, files, { text: { [PRS]: recipe, [UNAPPLIED]: unapplied } });
  const [ first, second ] = [ await CjsCharacterFactory.fetchRecipe(PRS), await CjsCharacterFactory.fetchRecipe(PRS) ];
  assert.notEqual(first, second, "each caller its own recipe record");
  assert.deepEqual([ first._pdpID, first._pdpType ], [ PRS, CjsCharacterPdpType.RECIPE ]);
  const { dna, problems } = await CjsCharacterFactory.readRecipe(PRS);
  assert.equal(dna.sex, "female");
  assert.deepEqual(dna.parts.lipstick, { enabled: true, option: "lipstick_01", weight: 1,
    colors: [ [ .1, .2, .3, 1 ], [ .4, .5, .6, 1 ], [ .7, .8, .9, 1 ] ],
    specularColors: [ [ .5, .5, .5, 1 ], [ .5, .5, .5, 1 ], [ .5, .5, .5, 1 ] ] }, "its own colours, and their specular colours");
  assert.deepEqual(dna.parts.blush, { enabled: true, option: "blush_01", weight: .5, palette: ROOT + "makeup/blush/blush_01/pink.color" }, "the palette its colour variation names");
  assert.deepEqual(dna.parts.aging, { enabled: true, option: "aging_01_v1", weight: 1 }, "the option its variation selects");
  assert.deepEqual(dna.parts.archetype, { option: "archetypes/msshape" });
  assert.deepEqual(dna.parts.feet, { enabled: false }, "a nude feet entry turns the feet off");
  assert.deepEqual(dna.parts.outer, { enabled: true, option: "recipe", recipePath: "outer/coat01", recipeVariation: "v9", weight: 1 }, "a garment no type presets takes the recipe option");
  assert.deepEqual(dna.parts.topMiddle, { enabled: true, option: "shirt01", weight: 1, palette: ROOT + "topmiddle/shirt01/plain.color" }, "a pattern entry: its colour variation's palette");
  assert.deepEqual(dna.parts.eyeliner, { enabled: true, option: "eyeliner_01", weight: 1 }, "colours in an unread shape are skipped");
  assert.deepEqual(problems.sort(), [
    "makeup/eyeliner/eyeliner_01: 2 colours, not one per area; skipped",
    "topmiddle/shirt01: pattern Camo: its own pattern colours are not applied; its colour variation's palette is (PROVISIONAL)"
  ]);
  // Every entry is kept as read: its variation, its weight, the pattern.
  assert.deepEqual(dna.modifiers.map(modifier => modifier.path), first.modifiers.map(entry => entry.path));
  assert.deepEqual(dna.modifiers[2], { category: "makeup", path: "makeup/aging/aging_01", weight: 1, variation: "v1" });
  assert.equal(dna.modifiers[6].pattern, "Camo");
  assert.deepEqual(dna.modifiers[6].patternTransform, [ 0, 0, 8, 8 ]);
  await assert.rejects(CjsCharacterFactory.readRecipe(UNAPPLIED), new RegExp("^Error: No paper doll rule for 3 entries of the recipe " + UNAPPLIED.replace(/[./]/gu, "\\$&")
    + ": hair/long01: hair is not applied until the instance owns meshes \\(R6\\); bodyshapes/thinshape: no part \\(no paper doll category\\); dependants/boottucking/standard: no part \\(no paper doll category\\)$", "u"));
  // The modifiers survive JSON, the merge and a refused field.
  assert.deepEqual(CjsCharacterFactory.readJSON(CjsCharacterFactory.writeJSON(dna)).modifiers, dna.modifiers);
  assert.deepEqual(CjsCharacterFactory.merge(dna).modifiers, dna.modifiers);
  assert.throws(() => CjsCharacterFactory.readJSON({ ...dna, modifiers: [ { wat: 1 } ] }), /Unknown field wat on character DNA modifier 0/u);
  assert.throws(() => CjsCharacterFactory.readJSON({ ...dna, modifiers: [ { weight: "1" } ] }), /modifier 0 weight is not a number/u);
});
