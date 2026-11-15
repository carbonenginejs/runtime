import test from "node:test";
import assert from "node:assert/strict";
import {
    CjsCharacterObjectBuilder, CjsCharacterFactory, CjsCharacterLibraryConfiguration, CjsCharacterCamera,
    CjsCharacterPost, CjsCharacterPose, CjsCharacterPoseTransform,
    CjsCharacterRecipeModifier, CjsProjectedDecal, CjsCharacterLightRig, Tr2InteriorLightSource, CjsCharacterType, CjsCharacterColorVariation, CjsCharacterPdpType
} from "../../../npm/dist/character/index.js";
import { InitializeTrinityStub } from "../../support/trinityStub.js";
import { installPartsLibrary } from "../../support/partsLibrary.js";

// Character builds Trinity objects, so Trinity runs, on the stub backend.
InitializeTrinityStub();

/** A builder with the configuration that owns the kind: the factory's for recipes, the parts library's otherwise. */
function Builder(source, kind, path = "res:/test/character/source.yaml")
{
    const configuration = kind === "recipes" ? CjsCharacterFactory.recipeConfiguration : CjsCharacterLibraryConfiguration;
    return new CjsCharacterObjectBuilder(source, kind, path, configuration);
}

test("content inspection separates camera/post layouts without decoding other resources", () =>
{
    const camera = Builder("field_of_view: 0.2\nposition: !!python/tuple [0.1, 0.2, 0.3]\n", "cameras").CreateObject();
    assert.equal(Object.getPrototypeOf(camera), CjsCharacterCamera.prototype);
    assert.deepEqual(camera.position, Float64Array.of(0.1, 0.2, 0.3), "a point at the authored double precision");
    const positional = Builder("[!!python/tuple [1, 2, 3], !!python/tuple [4, 5, 6], 0.3, 0.1, 200, !!python/tuple ['','','','','']]", "cameras").CreateObject();
    assert.equal(Object.getPrototypeOf(positional), CjsCharacterCamera.prototype, "one class for both layouts");
    assert.deepEqual([ positional.position, positional.point_of_interest, positional.field_of_view, positional.front_clip, positional.back_clip ],
        [ Float64Array.of(1, 2, 3), Float64Array.of(4, 5, 6), 0.3, 0.1, 200 ]);
    assert.deepEqual([ positional.hook_names.name, positional.aspect_ratio ], [ "", 0 ]);
    assert.equal(positional._pdpType, CjsCharacterPdpType.CAMERA_SEQUENCE, "the reader names the file shape it read");
    assert.throws(() => Builder("[!!python/tuple [1, 2, 3], !!python/tuple [4, 5, 6], 1, 2, 3, !!python/tuple [a,b,c,d,e]]", "cameras").CreateObject(), /unread/u);
    const vector = Builder("lut: true\nlut_influence: !!python/tuple [0.1, 0.2, 0.3, 0.4]\nlut_path: res:/test/lut.dds\n", "posts").CreateObject();
    const scalar = Builder('lut: ""\nlut_influence: 0\nlut_path: ""\n', "posts").CreateObject();
    assert.equal(Object.getPrototypeOf(vector), CjsCharacterPost.prototype);
    assert.equal(Object.getPrototypeOf(scalar), CjsCharacterPost.prototype, "one class for both layouts");
    assert.deepEqual([ scalar.lut, scalar.lut_influence, scalar._pdpType, vector._pdpType ], [ false, Float64Array.of(0, 0, 0, 0), CjsCharacterPdpType.POST_SCALAR, CjsCharacterPdpType.POST ]);
    assert.throws(() => Builder('lut: x\nlut_influence: 0\nlut_path: ""\n', "posts").CreateObject(), /unread/u);
    assert.equal(vector.lut_path, "res:/test/lut.dds");
    assert.throws(() => Builder("lut: true\nlut_influence: 1\n", "posts").CreateObject(), /Unrecognized/);
});

test("a keyed root reads as a list of named typed records and preserves Number precision", () =>
{
    const builder = Builder("Jaw:\n  orientation: !!python/tuple [0.1, 0.2, 0.3]\n  rotation: !!python/tuple [0.4, 0.5, 0.6]\n  translation: [0.7, 0.8, 0.9]\nNeck:\n  rotation: [1, 2, 3]\n", "poses");
    const pose = builder.CreateObject();
    assert.equal(Object.getPrototypeOf(pose), CjsCharacterPose.prototype);
    assert.ok(Array.isArray(pose.value), "values hold no maps: a keyed collection is a list");
    assert.deepEqual(pose.value.map(transform => transform.name), [ "Jaw", "Neck" ], "each key names its record, in file order");
    const jaw = pose.value[0];
    assert.equal(Object.getPrototypeOf(jaw), CjsCharacterPoseTransform.prototype, "each entry is a record");
    assert.deepEqual(jaw.rotation, Float64Array.of(0.4, 0.5, 0.6), "a record's vec3d, at the authored double precision");
    const second = builder.CreateObject();
    assert.notEqual(second, pose);
    assert.notEqual(second.value[0], jaw);
    jaw.rotation[0] = 99;
    assert.equal(second.value[0].rotation[0], 0.4);
    assert.equal(builder.GetSourceDocument().getIn(["Jaw", "rotation", 0]), 0.4);
    assert.throws(() => Builder("- Jaw\n", "poses").CreateObject(), /CjsCharacterPose\.value must be a mapping/u);
    assert.throws(() => Builder("Jaw: [1, 2]\n", "poses").CreateObject(), /CjsCharacterPose\.value\.Jaw must be a mapping/u);
    assert.throws(() => Builder("Jaw:\n  name: Neck\n", "poses").CreateObject(), /CjsCharacterPose\.value\.Jaw writes name, which its key fills/u);
});

test("recipes retain leading sex, typed modifiers, source refs and embedded decal spelling", () =>
{
    const recipe = Builder('- female\n- category: tattoo\n  path: tattoo/armleft/example\n  weight: 0.2\n  colorvariation: null\n  colors: "((0.1, 0.2, 0.3, 1),)"\n  decaldata: !!python/object:paperDoll.ProjectedDecal\n    layeres: 3\n    texturePath: res:/Original/Decal.dds\n', "recipes", "res:/test/character/source.prs").CreateObject();
    assert.equal(recipe.sex, "female");
    assert.equal(Object.getPrototypeOf(recipe.modifiers[0]), CjsCharacterRecipeModifier.prototype);
    assert.equal(recipe.modifiers[0].colorVariation, "");
    assert.deepEqual(recipe.modifiers[0].colors.map(color => Array.from(color)), [ [ 0.1, 0.2, 0.3, 1 ] ]);
    assert.equal(Object.getPrototypeOf(recipe.modifiers[0].decalData), CjsProjectedDecal.prototype);
    assert.equal(recipe.modifiers[0].decalData.layeres, 3);
    assert.equal(recipe.modifiers[0].decalData.texturePath, "res:/Original/Decal.dds");
    const noSex = Builder("- category: hair\n  path: hair/style\n  weight: 1\n", "recipes").CreateObject();
    assert.equal(noSex.sex, "");
    assert.equal(noSex.modifiers.length, 1);
    assert.equal(noSex.modifiers[0].path, "hair/style");
});

test("a .type tuple's slots read into named fields; a shorter tuple keeps the defaults; a longer one throws", () =>
{
    const full = Builder("!!python/tuple [tattoo/head/example, v1, ink, [5, 6]]", "types").CreateObject();
    assert.equal(Object.getPrototypeOf(full), CjsCharacterType.prototype);
    assert.deepEqual([ full.partPath, full.variation, full.colorVariant, full.bloodlineIDs ], [ "tattoo/head/example", "v1", "ink", Int32Array.of(5, 6) ]);
    const short = Builder("!!python/tuple [hair/bob, '', '']", "types").CreateObject();
    assert.deepEqual([ short.partPath, short.colorVariant, short.bloodlineIDs ], [ "hair/bob", "", new Int32Array(0) ]);
    assert.throws(() => Builder("[a, b, c, [], extra]", "types").CreateObject(), /has 5 items/u);
});

test("a palette's seven pattern items read into its pattern fields; another length throws", () =>
{
    const colors = "colors: [!!python/tuple [1, 0, 0, 1], !!python/tuple [0, 1, 0, 1], !!python/tuple [0, 0, 1, 1]]\npattern: caldari_C\n";
    const palette = Builder(colors + "patternColors: [!!python/tuple [0.1, 0.2, 0.3], !!python/tuple [0.4, 0.5, 0.6, 1], !!python/tuple [0.7, 0.8, 0.9, 1], !!python/tuple [0, 0, 0, 1], !!python/tuple [1, 1, 1, 1], !!python/tuple [0, 0, 8, 8], 45.0]\n", "colorVariations").CreateObject();
    assert.deepEqual(Array.from(palette.patternColor1), [ 0.1, 0.2, 0.3, 1 ].map(Math.fround));
    assert.deepEqual(Array.from(palette.patternAreaColor3), [ 1, 1, 1, 1 ]);
    assert.deepEqual(Array.from(palette.patternTransform), [ 0, 0, 8, 8 ]);
    assert.equal(palette.patternRotation, 45);
    const read = CjsCharacterColorVariation.patternOf(palette);
    assert.equal(read.map, "res:/graphics/character/patterns/caldari_c_z.dds");
    assert.deepEqual([ read.colors.length, read.areas.length, read.rotation ], [ 3, 2, 45 ]);
    assert.throws(() => Builder(colors + "patternColors: []\n", "colorVariations").CreateObject(), /must list 7 item/u);
});

test("a light rig reads its scene's lights, makes no scene, and applies only the approved numeric boolean conversion", () =>
{
    const rig = Builder("type: Tr2InteriorScene\nlights:\n- type: Tr2InteriorLightSource\n  name: test\n  primaryLighting: 0\n  useKelvinColor: 1\n", "lights").CreateObject();
    assert.equal(Object.getPrototypeOf(rig), CjsCharacterLightRig.prototype);
    assert.equal(rig._pdpType, CjsCharacterPdpType.LIGHT_RIG);
    assert.equal(Object.getPrototypeOf(rig.lights[0]), Tr2InteriorLightSource.prototype);
    assert.equal(rig.lights[0].primaryLighting, false);
    assert.equal(rig.lights[0].useKelvinColor, true);
    assert.throws(() => Builder("type: MissingLight\n", "lights").CreateObject(), /saved as a Tr2InteriorScene/);
    assert.throws(() => Builder("type: Tr2InteriorScene\nsunDirection: [0, 0, 1]\n", "lights").CreateObject(), /only lights/);
    assert.throws(() => Builder("type: Tr2InteriorScene\nlights:\n- type: MissingLight\n", "lights").CreateObject(), /Unregistered/);
});

test("scalar roots stay scalar values; the record carries its file shape and no other source state", () =>
{
    const builder = Builder("a b c\n", "modifierNames");
    const names = builder.CreateObject();
    assert.equal(names.value, "a b c");
    assert.equal(names.name, "res:/test/character/source.yaml");
    assert.deepEqual([ names._pdpType, names._pdpID ], [ CjsCharacterPdpType.MODIFIER_NAMES, "" ], "the library, not the reader, assigns the ID");
    assert.equal(Object.hasOwn(names, "source"), false);
    assert.throws(() => builder.CreateObject(1), /root object marker/);
});

test("sculpting limits retain duplicate source pairs and expose the last value", () =>
{
    const source = "gender: male\nhead: example\nlimits:\n  FatShape: [0, 0.5]\n  FatShape: [0, 1]\n";
    const builder = Builder(source, "sculptingLimits");
    assert.deepEqual(builder.CreateObject().limits.map(limit => [ limit.name, limit.min, limit.max ]), [ [ "FatShape", 0, 1 ] ]);
    assert.equal(builder.GetSourceDocument().get("limits", true).items.length, 2);
    assert.throws(() => new CjsCharacterObjectBuilder(source, "sculptingLimits", "test.yaml", CjsCharacterLibraryConfiguration, { uniqueKeys: true }), /unique/);
    assert.throws(() => Builder("field_of_view: 1\nfield_of_view: 2\n", "cameras"), /unique/);
});

test("a field's keyed and tuple lists read as records; a face mapping's two tuple shapes fill named fields and the rest", () =>
{
    const trif = "Fields:\n  Default_Front:\n    Attributes: [XXX_up]\n    MarkerPosition: [0.0, 0.0, 0.0]\n"
        + "    Triangles:\n      10: [4, 5, 8]\n      2: [0, 1, 4]\n"
        + "    Tris:\n    - - !!python/tuple [0, !!python/tuple [-2.0, 2.0]]\n      - !!python/tuple [1, !!python/tuple [0.0, 2.0]]\n      - !!python/tuple [4, !!python/tuple [0.0, 0.0]]\n"
        + "    VertData:\n      0:\n      - [XXX_up, 1.0]\n      - [XXX_down, 0.25]\n"
        + "    VertPositions:\n      1: [0.0, 0.0, 2.0]\n";
    const [ field ] = Builder(trif, "fieldSets").CreateObject().Fields;
    assert.equal(field.name, "Default_Front");
    assert.deepEqual(field.Triangles.map(triangle => [ triangle.index, Array.from(triangle.vertices) ]), [ [ 2, [ 0, 1, 4 ] ], [ 10, [ 4, 5, 8 ] ] ],
        "whole-number keys are numbers, ascending");
    assert.deepEqual(field.Tris[0].corners.map(corner => [ corner.vertex, Array.from(corner.position) ]), [ [ 0, [ -2, 2 ] ], [ 1, [ 0, 2 ] ], [ 4, [ 0, 0 ] ] ]);
    assert.deepEqual(field.VertData.map(vertex => [ vertex.index, vertex.parameters.map(parameter => [ parameter.name, parameter.value ]) ]),
        [ [ 0, [ [ "XXX_up", 1 ], [ "XXX_down", 0.25 ] ] ] ]);
    assert.deepEqual(field.VertPositions.map(vertex => [ vertex.index, Array.from(vertex.position) ]), [ [ 1, [ 0, 0, 2 ] ] ]);
    assert.throws(() => Builder("Fields:\n  F:\n    VertPositions:\n      x1: [0, 0, 0]\n", "fieldSets").CreateObject(), /VertPositions\.x1 must be keyed by a whole number/u);

    const face = "fj_a: [fj_a, 4, y, 0.67575298195180011]\nfj_b: [fj_b, fj_c, 3, 1.0, 0.0, 8.884, 9.297]\n";
    const entries = Builder(face, "faceMappings").CreateObject().value;
    assert.deepEqual(entries.map(entry => [ entry.name, entry.joint, entry.pairedJoint, entry.index, entry.axis, entry.values ]), [
        [ "fj_a", "fj_a", "", 4, "y", [ 0.67575298195180011 ] ],
        [ "fj_b", "fj_b", "fj_c", 3, "", [ 1, 0, 8.884, 9.297 ] ]
    ], "the trailing numbers at double precision");
    assert.throws(() => Builder("fj_a: [fj_a, 4, y]\n", "faceMappings").CreateObject(), /value\.fj_a has 3 items; its form names no tuple of that length/u);

    const shapes = Builder("{abs_upshape: 1.0, thinshape: 0.2638888888888889}\n", "blendShapes").CreateObject().value;
    assert.deepEqual(shapes.map(shape => [ shape.name, shape.value ]), [ [ "abs_upshape", 1 ], [ "thinshape", 0.2638888888888889 ] ], "a weight keeps its double precision");
});

test("GetPost answers a post in either layout; ListPostNames lists both", async t =>
{
    const POSTS = "res:/animation_gstate/scenes/example/";
    const vector = POSTS + "a/post.yaml", scalar = POSTS + "b/post.yaml";
    const { library } = installPartsLibrary(t, "res:/graphics/character/female/paperdoll/", [ vector, scalar ], { text: {
        [vector]: "lut: true\nlut_influence: !!python/tuple [1, 1, 1, 1]\nlut_path: res:/test/lut.dds\ntransmission_noise: false\n",
        [scalar]: "lut: ''\nlut_influence: 0\nlut_path: ''\n"
    } });
    library._StartLazySource();
    assert.equal((await library.GetPost(vector)).lut_path, "res:/test/lut.dds");
    assert.deepEqual((await library.GetPost(scalar)).lut_influence, Float64Array.of(0, 0, 0, 0));
    assert.deepEqual(await library.ListPostNames(), [ vector, scalar ]);
});

test("records the file nests take their own list forms: a material set's materials, each with its attributes' colours", () =>
{
    const source = "Materials:\n  C_Test:\n    Attributes:\n      color:\n      - !!python/tuple [0.5, 0.5, 0.5]\n      incandescence:\n      - !!python/tuple [0.1, 0.2, 0.3]\n    Textures: {}\n";
    const materials = Builder(source, "materialSets").CreateObject().Materials;
    assert.deepEqual(materials.map(material => material.name), [ "C_Test" ]);
    const attributes = materials[0].Attributes;
    assert.deepEqual([ Array.from(attributes.color), Array.from(attributes.incandescence) ], [ [ 0.5, 0.5, 0.5, 1 ], [ 0.1, 0.2, 0.3, 1 ].map(Math.fround) ]);
});
