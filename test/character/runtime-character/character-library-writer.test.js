import test from "node:test";
import assert from "node:assert/strict";
import { parseDocument } from "yaml";
import { CjsSchema } from "../../../npm/dist/global/schema/index.js";
import {
    CjsCharacterObjectBuilder, CjsCharacterLibraryWriter, CjsCharacterColorVariation,
    CjsCharacterRecipe, CjsCharacterLibraryConfiguration
} from "../../../npm/dist/character/index.js";

function read(source, kind)
{
    return new CjsCharacterObjectBuilder(source, kind, "res:/example").CreateObject();
}

test("all configured text shapes declare a canonical layout", () =>
{
    for (const [kind, declaration] of Object.entries(CjsCharacterLibraryConfiguration.kinds))
        if (!declaration.pathOnly && !declaration.derived) assert.ok(CjsCharacterLibraryConfiguration.layouts[kind], kind);
});

test("new and hydrated colours write mixed tuple layouts without needing an original document", () =>
{
    const color = new CjsCharacterColorVariation();
    color.colors = [[0.1, 0.2, 0.3, 1]];
    color.specularColors = [[0.5, 0.6, 0.7, 1]];
    color.patternColors = [...Array.from({length: 6}, () => [0.1, 0.2, 0.3, 1]), 2];
    const text = CjsCharacterLibraryWriter.write(color);
    assert.equal((text.match(/!!python\/tuple/gu) ?? []).length, 8);
    const loaded = read(text, "colorVariations");
    assert.deepEqual(CjsSchema.getValues(loaded), CjsSchema.getValues(color));
    const hydrated = CjsSchema.from("CjsCharacterColorVariation", CjsSchema.getValues(loaded), { initialize: false });
    assert.equal(CjsCharacterObjectBuilder.getSource(hydrated), null);
    assert.deepEqual(CjsSchema.getValues(read(CjsCharacterLibraryWriter.write(hydrated), "colorVariations")), CjsSchema.getValues(hydrated));
});

test("source optional absence is preserved but deliberate absent-field edits are written", () =>
{
    const color = read("colors: [!!python/tuple [0.1,0.2,0.3,1]]\npattern: ''\npatternColors: []\n", "colorVariations");
    assert.doesNotMatch(CjsCharacterLibraryWriter.write(color), /specularColors/u);
    color.specularColors = [[1, 0, 0, 1]];
    const text = CjsCharacterLibraryWriter.write(color);
    assert.deepEqual(read(text, "colorVariations").specularColors, [[1,0,0,1]]);
    assert.equal(parseDocument(text).getIn(["specularColors", 0], true).tag, "tag:yaml.org,2002:python/tuple");
    const decal = read("!!python/object:eve.client.script.paperDoll.projectedDecals.ProjectedDecal\ntextureResource: null\nmaskResource: null\n", "projectedDecals");
    decal.layeres = 4;
    const projected = CjsCharacterLibraryWriter.write(decal);
    assert.match(projected, /eve\.client\.script\.paperDoll\.projectedDecals\.ProjectedDecal/u);
    assert.equal(read(projected, "projectedDecals").layeres, 4);
});

test("recipes keep optional leading sex and Python-looking color strings", () =>
{
    for (const leading of [[], ["female"]])
    {
        const recipe = new CjsCharacterRecipe();
        recipe.value = [...leading, {category: "hair", path: "hair/style", weight: 1, colors: "((0.1,0.2,0.3,1),)", specularcolors: [[1,1,1,1]], decaldata: null}];
        const text = CjsCharacterLibraryWriter.write(recipe);
        const result = read(text, "recipes");
        assert.equal(result.value.length, recipe.value.length);
        if (leading.length) assert.equal(result.value[0], "female");
        const modifier = result.value.at(-1);
        assert.equal(modifier.colors, recipe.value.at(-1).colors);
        assert.deepEqual(modifier.specularcolors, [[1,1,1,1]]);
        assert.equal(modifier.decaldata, null);
    }
});

test("canonical poses distinguish rotation tuples from translation lists", () =>
{
    const pose = read("Jaw: {orientation: [1,2,3], rotation: [4,5,6], translation: [7,8,9]}\n", "poses");
    const hydrated = CjsSchema.from("CjsCharacterPose", CjsSchema.getValues(pose), { initialize: false });
    const doc = parseDocument(CjsCharacterLibraryWriter.write(hydrated));
    assert.equal(doc.getIn(["Jaw", "rotation"], true).tag, "tag:yaml.org,2002:python/tuple");
    assert.equal(doc.getIn(["Jaw", "translation"], true).tag, undefined);
});

test("canonical native lights retain concrete types after persisted values hydration", () =>
{
    const scene = read("type: Tr2InteriorScene\nlights:\n- type: Tr2InteriorLightSource\n  name: sample\n  primaryLighting: 0\n  useKelvinColor: 1\n", "lights");
    const options = { persistOnly: true, typeTags: true };
    const values = CjsSchema.getValues(scene, {}, options);
    const hydrated = CjsSchema.from("Tr2InteriorScene", JSON.parse(JSON.stringify(values)), { initialize: false });
    const text = CjsCharacterLibraryWriter.write(hydrated);
    assert.match(text, /type: Tr2InteriorLightSource/u);
    assert.doesNotMatch(text, /viewProjection/u);
    const restored = read(text, "lights");
    assert.deepEqual(CjsSchema.getValues(restored, {}, options), CjsSchema.getValues(hydrated, {}, options));
});
