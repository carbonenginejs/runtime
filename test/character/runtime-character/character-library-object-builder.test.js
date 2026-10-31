import test from "node:test";
import assert from "node:assert/strict";
import {
    CjsCharacterObjectBuilder, CjsCharacterCamera, CjsCharacterCameraSequence,
    CjsCharacterPost, CjsCharacterScalarPost, CjsCharacterPose,
    CjsCharacterRecipeModifier, CjsProjectedDecal, Tr2InteriorScene
} from "../../../npm/dist/character/index.js";

function Builder(source, kind)
{
    return new CjsCharacterObjectBuilder(source, kind, "res:/test/character/source.yaml");
}

test("content inspection separates camera/post layouts without decoding other resources", () =>
{
    const camera = Builder("field_of_view: 0.2\nposition: !!python/tuple [0.1, 0.2, 0.3]\n", "cameras").CreateObject();
    assert.equal(Object.getPrototypeOf(camera), CjsCharacterCamera.prototype);
    assert.deepEqual(camera.position, [0.1, 0.2, 0.3]);
    const positional = Builder("[!!python/tuple [1, 2, 3], !!python/tuple [4, 5, 6], 1, 2, 3, !!python/tuple [a,b,c,d,e]]", "cameras").CreateObject();
    assert.equal(Object.getPrototypeOf(positional), CjsCharacterCameraSequence.prototype);
    assert.equal(positional.value.length, 6);
    assert.equal(CjsCharacterObjectBuilder.getSource(positional).kind, "cameraSequences");
    const vector = Builder("lut: true\nlut_influence: !!python/tuple [0.1, 0.2, 0.3, 0.4]\nlut_path: res:/test/lut.dds\n", "posts").CreateObject();
    const scalar = Builder('lut: ""\nlut_influence: 0\nlut_path: ""\n', "posts").CreateObject();
    assert.equal(Object.getPrototypeOf(vector), CjsCharacterPost.prototype);
    assert.equal(Object.getPrototypeOf(scalar), CjsCharacterScalarPost.prototype);
    assert.equal(vector.lut_path, "res:/test/lut.dds");
    assert.throws(() => Builder("lut: true\nlut_influence: 1\n", "posts").CreateObject(), /Unrecognized/);
});

test("root dictionaries hydrate typed records and preserve Number precision", () =>
{
    const builder = Builder("Jaw:\n  orientation: !!python/tuple [0.1, 0.2, 0.3]\n  rotation: !!python/tuple [0.4, 0.5, 0.6]\n  translation: [0.7, 0.8, 0.9]\n", "poses");
    const pose = builder.CreateObject();
    assert.equal(Object.getPrototypeOf(pose), CjsCharacterPose.prototype);
    assert.deepEqual(pose.value.get("Jaw").rotation, [0.4, 0.5, 0.6]);
    const second = builder.CreateObject();
    assert.notEqual(second, pose);
    assert.notEqual(second.value.get("Jaw"), pose.value.get("Jaw"));
    pose.value.get("Jaw").rotation[0] = 99;
    assert.equal(second.value.get("Jaw").rotation[0], 0.4);
    assert.equal(builder.GetSourceDocument().getIn(["Jaw", "rotation", 0]), 0.4);
});

test("recipes retain leading sex, typed modifiers, source refs and embedded decal spelling", () =>
{
    const recipe = Builder('- female\n- category: tattoo\n  path: tattoo/armleft/example\n  weight: 0.2\n  colorvariation: null\n  colors: "((0.1, 0.2, 0.3, 1),)"\n  decaldata: !!python/object:paperDoll.ProjectedDecal\n    layeres: 3\n    texturePath: res:/Original/Decal.dds\n', "recipes").CreateObject();
    assert.equal(recipe.value[0], "female");
    assert.equal(Object.getPrototypeOf(recipe.value[1]), CjsCharacterRecipeModifier.prototype);
    assert.equal(recipe.value[1].colorvariation, "");
    assert.equal(recipe.value[1].colors, "((0.1, 0.2, 0.3, 1),)");
    assert.equal(Object.getPrototypeOf(recipe.value[1].decaldata), CjsProjectedDecal.prototype);
    assert.equal(recipe.value[1].decaldata.layeres, 3);
    assert.equal(recipe.value[1].decaldata.texturePath, "res:/Original/Decal.dds");
    const noSex = Builder("- category: hair\n  path: hair/style\n  weight: 1\n", "recipes").CreateObject();
    assert.equal(noSex.value.length, 1);
    assert.equal(noSex.value[0].path, "hair/style");
});

test("native light type records apply only the approved numeric boolean conversion", () =>
{
    const scene = Builder("type: Tr2InteriorScene\nlights:\n- type: Tr2InteriorLightSource\n  name: test\n  primaryLighting: 0\n  useKelvinColor: 1\n", "lights").CreateObject();
    assert.equal(Object.getPrototypeOf(scene), Tr2InteriorScene.prototype);
    assert.equal(scene.lights[0].primaryLighting, false);
    assert.equal(scene.lights[0].useKelvinColor, true);
    assert.throws(() => Builder("type: MissingLight\n", "lights").CreateObject(), /Unregistered/);
});

test("scalar roots stay scalar values and source associations do not enter records", () =>
{
    const builder = Builder("a b c\n", "modifierNames");
    const names = builder.CreateObject();
    assert.equal(names.value, "a b c");
    assert.equal(names.name, "res:/test/character/source.yaml");
    assert.equal(CjsCharacterObjectBuilder.getSource(names).builder, builder);
    assert.equal(Object.hasOwn(names, "source"), false);
    assert.equal(CjsCharacterObjectBuilder.getSource({}), null);
    assert.throws(() => builder.CreateObject(1), /root object marker/);
});

test("sculpting limits retain duplicate source pairs and expose the last value", () =>
{
    const source = "gender: male\nhead: example\nlimits:\n  FatShape: [0, 0.5]\n  FatShape: [0, 1]\n";
    const builder = Builder(source, "sculptingLimits");
    assert.deepEqual(builder.CreateObject().limits.get("FatShape"), [0, 1]);
    assert.equal(builder.GetSourceDocument().get("limits", true).items.length, 2);
    assert.throws(() => new CjsCharacterObjectBuilder(source, "sculptingLimits", "test.yaml", { uniqueKeys: true }), /unique/);
    assert.throws(() => Builder("field_of_view: 1\nfield_of_view: 2\n", "cameras"), /unique/);
});
