import test from "node:test";
import assert from "node:assert/strict";
import { CjsSchema } from "../../../npm/dist/blue/schema/CjsSchema.js";
import { CjsYamlFormat } from "../../../npm/dist/resource/formats/yaml/index.js";
import { CjsAvatarPartMetaData, CjsProjectedDecal, Tr2InteriorLightSource } from "../../../npm/dist/character/index.js";
import { createCharacterYamlTagHandlers, readCharacterYamlObject } from "../../../npm/dist/character/formats/yaml.js";

const prefix = "tag:yaml.org,2002:python/object:";

function Read(source)
{
    return CjsYamlFormat.readRaw(source, {
        tagPolicy: "handle",
        sourceName: "res:/test/character.yaml",
        tagHandlers: createCharacterYamlTagHandlers()
    });
}

test("Python content aliases resolve to the existing constructor identities", () =>
{
    assert.equal(CjsSchema.getConstructor("paperDoll.AvatarPartMetaData"), CjsAvatarPartMetaData);
    for (const name of [ "paperDoll.ProjectedDecal", "eve.client.script.paperDoll.projectedDecals.ProjectedDecal" ])
    {
        assert.equal(CjsSchema.getConstructor(name), CjsProjectedDecal);
        const decal = Read(`!!python/object:${name}\nlabel: authored\nlayer: 3\ntexturePath: res:/Original/Decal.dds\n`);
        assert.equal(Object.getPrototypeOf(decal), CjsProjectedDecal.prototype);
        assert.equal(decal.label, "authored");
        assert.equal(decal.layer, 3);
        assert.equal(decal.texturePath, "res:/Original/Decal.dds");
    }
});

test("one handler supports registry names and preserves YAML alias identity", () =>
{
    const handlers = createCharacterYamlTagHandlers();
    assert.equal(handlers.get(prefix + "paperDoll.ProjectedDecal"), handlers.get(prefix + "paperDoll.AvatarPartMetaData"));
    const source = "first: &part !!python/object:paperDoll.AvatarPartMetaData\n  dependantModifiers: [hair/style#0.5]\n  numColorAreas: 2\nsecond: *part\n";
    const value = Read(source);
    assert.equal(Object.getPrototypeOf(value.first), CjsAvatarPartMetaData.prototype);
    assert.equal(value.first, value.second);
    assert.deepEqual(value.first.dependantModifiers, [ "hair/style#0.5" ]);
    assert.equal(value.first.numColorAreas, 2);
    assert.notEqual(Read(source).first, value.first);
});

test("an unstated numColorAreas reads as -1, apart from an authored 0", () =>
{
    // 8 of 548 shipped metadata.yaml files omit it; readers then count the zone map's areas.
    assert.equal(Read("!!python/object:paperDoll.AvatarPartMetaData\nforcesLooseTop: false\n").numColorAreas, -1);
    assert.equal(Read("!!python/object:paperDoll.AvatarPartMetaData\nnumColorAreas: 0\n").numColorAreas, 0);
});

test("unknown object tags and non-mapping values are rejected without execution", () =>
{
    assert.throws(() => Read("!!python/object:missing.Class {}"), /no explicit handler/);
    assert.throws(() => readCharacterYamlObject({}, { tag: prefix + "missing.Class", sourceName: "sample" }), /unregistered Python object/);
    assert.throws(() => Read("!!python/object:paperDoll.ProjectedDecal [1, 2]"), /plain values object/);
    assert.throws(() => Read("!!python/object:paperDoll.ProjectedDecal null"), /plain values object/);
});

test("tag hydration normalizes declared null strings/lists without changing other nulls", () =>
{
    const metadata = Read("!!python/object:paperDoll.AvatarPartMetaData\noccludesModifiers: null\nalternativeTextureSourcePath: null\nwap: null\nsoundTag: null\n");
    assert.deepEqual(metadata.occludesModifiers, []);
    assert.equal(metadata.alternativeTextureSourcePath, "");
    assert.equal(metadata.wap, null);
    assert.equal(metadata.soundTag, null);
    const decal = Read("!!python/object:paperDoll.ProjectedDecal\nmaskResource: null\ntextureResource: null\nlayeres: 2\n");
    assert.equal(decal.maskResource, "");
    assert.equal(decal.textureResource, "");
    assert.equal(decal.layeres, 2);
    assert.equal(decal.layer, 0);
    // Not authored: the reader leaves the field's default, -1.
    assert.equal(Read("!!python/object:paperDoll.ProjectedDecal {}").layeres, -1);
});

test("only the two reviewed light YAML flags accept numeric boolean normalization", () =>
{
    const light = Read("!!python/object:Tr2InteriorLightSource\nprimaryLighting: 0\nuseKelvinColor: 1\n");
    assert.equal(Object.getPrototypeOf(light), Tr2InteriorLightSource.prototype);
    assert.equal(light.primaryLighting, false);
    assert.equal(light.useKelvinColor, true);
    assert.equal(CjsSchema.getSchema(Tr2InteriorLightSource).fields.find(field => field.name === "primaryLighting").type.kind, "boolean");
});
