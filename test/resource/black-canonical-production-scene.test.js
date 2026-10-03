import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { CjsSchema } from "../../npm/dist/global/schema/CjsSchema.js";
import { CjsBlackReader } from "../../npm/dist/resource/formats/black/core/CjsBlackReader.js";
import { CjsBlackSchemaRegistry } from "../../npm/dist/resource/formats/black/core/CjsBlackSchemaRegistry.js";
import { EveSpaceScene } from "../../npm/dist/trinity/eve/scene/EveSpaceScene.js";
import { Tr2Effect } from "../../npm/dist/trinity/shader/Tr2Effect.js";
import { TriTextureParameter } from "../../npm/dist/trinity/shader/parameter/TriTextureParameter.js";

// Structural qualification only. These production classes retain their current
// bases and interface mappings; initialize:false does not qualify their lifecycle.
class RecordingReader extends CjsBlackReader
{
    allocations = [];
    CreateRuntimeTarget(kind, shape)
    {
        const instance = super.CreateRuntimeTarget(kind, shape);
        this.allocations.push({ instance, ambientColor: instance.ambientColor,
            resources: instance.resources, constParameters: instance.constParameters });
        return instance;
    }
}

function verify(bytes)
{
    const reader = new RecordingReader(bytes, { schema: null, initialize: false });
    const scene = reader.CreateObject();
    assert.equal(scene.constructor, EveSpaceScene);
    const effect = scene.backgroundEffect;
    assert.equal(effect.constructor, Tr2Effect);
    assert.equal(effect.resources.length, 4);
    assert.ok(effect.resources.every(texture => texture.constructor === TriTextureParameter));
    assert.equal(new Set(effect.resources).size, 4);
    assert.equal(effect.constParameters.length, 5);
    assert.equal(reader.allocations.length, 6);
    const sceneAllocation = reader.allocations.find(entry => entry.instance === scene);
    const effectAllocation = reader.allocations.find(entry => entry.instance === effect);
    assert.ok(scene.ambientColor instanceof Float32Array);
    assert.equal(scene.ambientColor, sceneAllocation.ambientColor);
    assert.equal(effect.resources, effectAllocation.resources);
    assert.equal(effect.constParameters, effectAllocation.constParameters);
    assert.equal(reader.references.size, 0, "the builder does not retain the returned graph");
    assert.equal(reader.reader.AtEnd(), true);
    assert.deepEqual(reader.reports, []);
    return scene;
}

function forbidInitialization(context)
{
    for (const Constructor of [EveSpaceScene, Tr2Effect, TriTextureParameter])
    {
        context.mock.method(Constructor.prototype, "Initialize", function ()
        {
            // Carbon's volumetrics constructor loads these internal effects
            // (Tr2VolumetricsRenderer.cpp:51-66), independent of Black hydration.
            if (Constructor === Tr2Effect && ["VolumeBlit", "DownsampleDepth", "BlurVolumetric"]
                .some(name => this.effectFilePath === `res:/Graphics/Effect/Managed/Space/SpecialFX/Volumetric/${name}.fx`)) return;
            assert.fail("Structural Black qualification must not initialize production objects");
        });
    }
}

test("canonical Black populates the registered production scene graph without initialization", context =>
{
    forbidInitialization(context);
    const scene = verify(authoredScene());
    assert.equal(scene.backgroundRenderingEnabled, true);
    assert.equal(scene.fogStart, 5);
    assert.equal(scene.fogEnd, 25);
    assert.equal(scene.reflectionIntensity, .5);
    assert.deepEqual([...scene.ambientColor], [...new Float32Array([.1, .2, .3, 1])]);
    const effect = scene.backgroundEffect;
    assert.equal(effect.effectFilePath, "res:/authored/effect.fx");
    for (let i = 0; i < 5; i++)
    {
        assert.equal(effect.constParameters[i].name, `AuthoredParameter${i}`);
        assert.deepEqual(effect.constParameters[i].value, [i, i + .25, i + .5, 1]);
    }
    for (let i = 0; i < 4; i++)
    {
        assert.equal(effect.resources[i].name, `AuthoredTexture${i}`);
        assert.equal(effect.resources[i].resourcePath, `res:/authored/texture${i}.dds`);
    }
});

test("prior production reference-list declaration cannot decode native constant records", () =>
{
    class PriorDeclarationReader extends CjsBlackReader
    {
        ResolveSourceShape(kind)
        {
            if (kind !== "Tr2Effect") return super.ResolveSourceShape(kind);
            const info = CjsSchema.getSchema(Tr2Effect);
            return CjsBlackSchemaRegistry.fromClassInfo({ ...info, members: info.members.map(member =>
                member.name === "constParameters"
                    ? { ...member, type: { kind: "list", itemType: "Tr2ConstantEffectParameter" } }
                    : member) });
        }
    }
    assert.throws(() => new PriorDeclarationReader(authoredScene(), {
        schema: null, initialize: false
    }).CreateObject(), /Tr2Effect\.constParameters/);
});

const externalPath = process.env.CJS_BLACK_CANONICAL_CUBE;
test("captured cube bytes decode with registered production declarations", {
    skip: externalPath ? false : "Captured cube unavailable; portable fixture is structural proof only."
}, context =>
{
    forbidInitialization(context);
    const bytes = readFileSync(externalPath);
    assert.equal(bytes.length, 1062);
    assert.equal(createHash("sha256").update(bytes).digest("hex"),
        "a817beefa07ba8623c08a04e22545eeb0652dbc68ab19bd4542ab78f96314e9d");
    verify(bytes);
});

/** Independently authored bytes; no game data is embedded in the portable test. */
function authoredScene()
{
    const fixture = new BlackFixture();
    const parameters = [u32(5), u16(24)];
    for (let i = 0; i < 5; i++)
    {
        parameters.push(concat([fixture.String(`AuthoredParameter${i}`), new Uint8Array(6), floats([i, i + .25, i + .5, 1])]));
    }
    const textures = [u32(4)];
    for (let i = 0; i < 4; i++)
    {
        textures.push(fixture.Object(i + 3, "TriTextureParameter", [
            ["name", fixture.String(`AuthoredTexture${i}`)], ["resourcePath", fixture.String(`res:/authored/texture${i}.dds`)]
        ]));
    }
    const effect = fixture.Object(2, "Tr2Effect", [
        ["effectFilePath", fixture.String("res:/authored/effect.fx")],
        ["constParameters", concat(parameters)], ["resources", concat(textures)]
    ]);
    return fixture.Finish(fixture.Object(1, "EveSpaceScene", [
        ["backgroundEffect", effect], ["backgroundRenderingEnabled", new Uint8Array([1])],
        ["ambientColor", floats([.1, .2, .3, 1])], ["fogStart", floats([5])],
        ["fogEnd", floats([25])], ["reflectionIntensity", floats([.5])]
    ]));
}

function floats(values)
{
    const bytes = new Uint8Array(values.length * 4);
    const view = new DataView(bytes.buffer);
    values.forEach((value, index) => view.setFloat32(index * 4, value, true));
    return bytes;
}

/** Bounded wire fixture for Black header/object framing, with no runtime schema source. */
class BlackFixture
{
    strings = [];
    String(value)
    {
        let index = this.strings.indexOf(value);
        if (index === -1) { index = this.strings.length; this.strings.push(value); }
        return u16(index);
    }
    Object(id, kind = null, fields = [])
    {
        if (kind === null) return u32(id);
        const parts = [this.String(kind)];
        for (const [name, value] of fields) parts.push(concat([this.String(name), value]));
        const body = concat(parts);
        return concat([u32(id), u32(body.length), body]);
    }
    Finish(root, wide = [])
    {
        const narrowParts = [u16(this.strings.length)];
        for (const value of this.strings) narrowParts.push(concat([new TextEncoder().encode(value), new Uint8Array(1)]));
        const wideParts = [u16(wide.length)];
        for (const value of wide)
        {
            for (let i = 0; i < value.length; i++) wideParts.push(u16(value.charCodeAt(i)));
            wideParts.push(u16(0));
        }
        const strings = concat(narrowParts), wideStrings = concat(wideParts);
        return concat([u32(0xb1acf11e), u32(1), u32(strings.length), strings, u32(wideStrings.length), wideStrings, root]);
    }
}

function concat(parts)
{
    const bytes = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
    let offset = 0;
    for (const part of parts) { bytes.set(part, offset); offset += part.length; }
    return bytes;
}
function u16(value)
{
    const bytes = new Uint8Array(2);
    new DataView(bytes.buffer).setUint16(0, value, true);
    return bytes;
}
function u32(value)
{
    const bytes = new Uint8Array(4);
    new DataView(bytes.buffer).setUint32(0, value, true);
    return bytes;
}
