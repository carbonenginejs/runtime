import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { CjsSchema } from "../../src/global/schema/CjsSchema.js";
import { carbonMapInterfaceDecorator } from "../../src/global/compose/interface.js";
import { IInitialize } from "../../src/global/blue/IInitialize.js";
import { INotify } from "../../src/global/blue/INotify.js";
import { CjsBlackReader } from "../../src/resource/formats/black/core/CjsBlackReader.js";
import { CjsBlackSchemaRegistry } from "../../src/resource/formats/black/core/CjsBlackSchemaRegistry.js";
import blackDefinitions from "../../src/resource/formats/black/core/blackSchema.js";

const member = (name, kind, extra = {}) => ({
    name, key: name, role: "member", type: { kind }, edit: { persist: true }, ...extra
});

test("canonical Black selects the first persisted stored declaration without merging live flags", () =>
{
    const stored = member("boosters", "objectRef", { key: "_boosters", edit: { hidden: true, persist: true } });
    const shape = CjsBlackSchemaRegistry.fromClassInfo({
        className: "CanonicalSelection",
        members: [
            member("boosters", "uint32", { edit: { read: true } }),
            stored,
            member("boosters", "float32"),
            member("baseName", "wstring")
        ],
        properties: [member("boosters", "uint32", { role: "property", edit: { read: true, write: true } })]
    });
    assert.deepEqual(shape.fields.map(field => field.name), [ "boosters", "baseName" ]);
    assert.equal(shape.fields[0].declaration, stored);
    assert.equal(shape.fields[0].key, "_boosters");
    assert.equal(shape.fields[0].black.beType, "IROOTPTR");
    assert.equal(shape.fields[1].black.beType, "STDWSTRING");
    assert.equal(stored.edit.write, undefined, "IRootReader::FindEntry uses PERSIST, not WRITE");
});

test("canonical Black refuses missing wire facts instead of borrowing legacy field metadata", () =>
{
    assert.throws(() => CjsBlackSchemaRegistry.fromClassInfo({
        className: "Incomplete", members: [member("value", "unknown")],
        fields: [{ name: "value", black: { beType: "FLOAT" } }]
    }), /Unsupported canonical Black type/);
    assert.throws(() => CjsBlackSchemaRegistry.fromDeclaredType({ kind: "list" }), /item type: missing/);
    assert.throws(() => CjsBlackSchemaRegistry.fromDeclaredType({
        kind: "list", itemType: { kind: "rawStruct", className: "NativeRecord" }
    }), /native structure layout/);
    assert.throws(() => CjsBlackSchemaRegistry.fromDeclaredType({
        kind: "list", itemType: { kind: "rawStruct" },
        structure: { name: "BadNativeRecord", size: 4, members: [{ name: "name", offset: 0, type: "string" }] }
    }), /Invalid canonical Black structure member/);
});

test("canonical Black keeps declared reference, embedded and collection codec distinctions", () =>
{
    const codec = type => CjsBlackSchemaRegistry.fromDeclaredType(type).black;
    assert.equal(codec({ kind: "struct", className: "Child" }).beType, "IROOT");
    assert.equal(codec({ kind: "weakRef", className: "Child" }).beType, "IROOTWEAKREF");
    assert.equal(codec({ kind: "list", itemType: "Child" }).container, "list");
    assert.equal(codec({ kind: "map", valueType: { kind: "objectRef", className: "Child" } }).container, "dict");
    assert.equal(codec({ kind: "set", itemType: "Child" }).container, "set");
});

test("schema:null decodes inherited canonical members with distinct narrow and wide tables", () =>
{
    class Base {}
    class Record extends Base {}
    CjsSchema.define(Base, {
        className: "BlackCanonicalBase",
        members: [member("narrow", "string", { key: "_narrow" })]
    });
    CjsSchema.define(Record, {
        className: "BlackCanonicalRecord",
        members: [member("wide", "wstring")],
        properties: [member("narrow", "uint32", { role: "property" })]
    });
    const fixture = new BlackFixture();
    fixture.String("narrow table"); // Index zero in both tables must select different values.
    const bytes = fixture.Finish(fixture.Object(1, "BlackCanonicalRecord", [
        [ "narrow", u16(0) ], [ "wide", u16(0) ]
    ]), [ "wide table \u03a9" ]);
    const payload = new CjsBlackReader(bytes, { schema: null }).ReadPayload();
    assert.equal(payload.object.narrow, "narrow table");
    assert.equal(payload.object.wide, "wide table \u03a9");
    assert.equal(payload.object._narrow, undefined, "payload retains exposed names, not JS storage keys");
    const instance = new CjsBlackReader(bytes, { schema: null }).CreateObject();
    assert.equal(instance._narrow, "narrow table");
    assert.equal(instance.wide, "wide table \u03a9");
});

test("canonical field absence cannot use unknown-value guessing or a same-name live property", () =>
{
    class OnlyProperty {}
    CjsSchema.define(OnlyProperty, {
        className: "BlackCanonicalPropertyOnly", members: [],
        properties: [member("value", "float32", { role: "property" })]
    });
    const fixture = new BlackFixture();
    const bytes = fixture.Finish(fixture.Object(1, "BlackCanonicalPropertyOnly", [[ "value", u32(0) ]]));
    assert.throws(() => new CjsBlackReader(bytes, {
        schema: null, captureUnknownBlackFields: true, allowUnknownStringFallback: true
    }).ReadPayload(), /No persisted member declared/);
    const unknown = new BlackFixture();
    assert.throws(() => new CjsBlackReader(unknown.Finish(unknown.Object(1, "BlackUnregistered")), {
        schema: null
    }).ReadRuntime(), /No constructor registered/);
});

test("explicit caller schema still decodes without canonical registrations", () =>
{
    const fixture = new BlackFixture();
    const bytes = fixture.Finish(fixture.Object(1, "BlackCallerShape", [[ "value", u32(7) ]]));
    const reader = new CjsBlackReader(bytes, { schema: { BlackCallerShape: { value: "uint" } } });
    assert.equal(reader.ReadPayload().object.value, 7);
});

test("canonical runtime bypasses accessors and values, preserves cycles, and initializes before later siblings", () =>
{
    const events = [];
    class First
    {
        ready = false;
        Initialize() { this.ready = true; events.push("first ready"); return false; }
    }
    class Later
    {
        constructor() { assert.equal(events.at(-1), "first ready"); events.push("later constructed"); }
    }
    class Root
    {
        _label = "";
        get label() { throw new Error("live getter must not run"); }
        set label(value) { throw new Error("live setter must not run"); }
        SetValues() { throw new Error("values transport must not run"); }
        Initialize() { assert.equal(this.first.ready, true); events.push("root ready"); }
    }
    carbonMapInterfaceDecorator([IInitialize])(First);
    carbonMapInterfaceDecorator([IInitialize])(Root);
    CjsSchema.define(First, { className: "BlackCanonicalFirst", members: [] });
    CjsSchema.define(Later, { className: "BlackCanonicalLater", members: [] });
    CjsSchema.define(Root, {
        className: "BlackCanonicalRoot",
        members: [member("label", "string", { key: "_label" }), member("first", "objectRef"),
            member("later", "objectRef"), member("shared", "objectRef"), member("self", "objectRef")],
        properties: [member("label", "string", { role: "property", edit: { read: true, write: true } })]
    });
    const fixture = new BlackFixture();
    const bytes = fixture.Finish(fixture.Object(1, "BlackCanonicalRoot", [
        ["label", fixture.String("stored")], ["first", fixture.Object(2, "BlackCanonicalFirst")],
        ["later", fixture.Object(3, "BlackCanonicalLater")], ["shared", fixture.Object(2)], ["self", fixture.Object(1)]
    ]));
    const reader = new CjsBlackReader(bytes, { schema: null });
    const root = reader.CreateObject();
    assert.equal(root._label, "stored");
    assert.equal(root.self, root);
    assert.equal(root.shared, root.first);
    assert.deepEqual(events, ["first ready", "later constructed", "root ready"]);
    const another = reader.CreateObject();
    assert.notEqual(another, root);
    assert.notEqual(another.first, root.first);
    assert.equal(another.self, another);
});

test("canonical reader notifies each successful stored write and ignores unmapped Initialize", () =>
{
    const notifications = [];
    class Notified
    {
        _value = 0;
        quiet = 0;
        Initialize() { throw new Error("unmapped Initialize must not run"); }
        OnModified(name) { notifications.push([name, this._value, this.quiet]); return false; }
    }
    carbonMapInterfaceDecorator([INotify])(Notified);
    CjsSchema.define(Notified, { className: "BlackCanonicalNotified", members: [
        member("value", "uint32", { key: "_value", edit: { persist: true, notify: true } }), member("quiet", "uint32")
    ] });
    const fixture = new BlackFixture();
    const bytes = fixture.Finish(fixture.Object(1, "BlackCanonicalNotified", [
        ["value", u32(7)], ["value", u32(7)], ["quiet", u32(9)]
    ]));
    assert.equal(new CjsBlackReader(bytes, { schema: null }).CreateObject().quiet, 9);
    assert.deepEqual(notifications, [["value", 7, 0], ["value", 7, 0]]);
});

test("canonical embedded decoding populates existing storage before its initialization", () =>
{
    let original;
    class Embedded
    {
        value = 0;
        Initialize() { assert.equal(this, original); assert.equal(this.value, 12); }
    }
    class Owner { embedded = (original = new Embedded()); }
    carbonMapInterfaceDecorator([IInitialize])(Embedded);
    CjsSchema.define(Embedded, { className: "BlackCanonicalEmbedded", members: [member("value", "uint32")] });
    CjsSchema.define(Owner, { className: "BlackCanonicalEmbeddedOwner", members: [member("embedded", "struct")] });
    const fixture = new BlackFixture();
    // Native ReadIRoot ignores this type name; the existing instance owns its table.
    const inline = fixture.Object(2, "UnusedEmbeddedWireClass", [["value", u32(12)]]).subarray(4);
    const bytes = fixture.Finish(fixture.Object(1, "BlackCanonicalEmbeddedOwner", [["embedded", inline]]));
    const owner = new CjsBlackReader(bytes, { schema: null }).CreateObject();
    assert.equal(owner.embedded, original);
});

test("an explicit adapter retains its whole-graph contract with canonical declarations", () =>
{
    const events = [];
    class Child { Initialize() { throw new Error("custom adapter owns finalization"); } }
    class Parent {}
    carbonMapInterfaceDecorator([IInitialize])(Child);
    CjsSchema.define(Child, { className: "BlackCanonicalAdapterChild", members: [member("value", "uint32")] });
    CjsSchema.define(Parent, { className: "BlackCanonicalAdapterParent", members: [member("child", "objectRef")] });
    const fixture = new BlackFixture();
    const bytes = fixture.Finish(fixture.Object(1, "BlackCanonicalAdapterParent", [
        ["child", fixture.Object(2, "BlackCanonicalAdapterChild", [["value", u32(4)]])]
    ]));
    const root = new CjsBlackReader(bytes, { schema: null, adapter: {
        applyValues(instance, values, context) { events.push(`apply ${context.kind}`); Object.assign(instance, values); },
        finalize(instance, context) { events.push(`finalize ${context.kind}`); }
    } }).CreateObject();
    assert.equal(root.child.value, 4);
    assert.deepEqual(events, [
        "apply BlackCanonicalAdapterChild", "apply BlackCanonicalAdapterParent",
        "finalize BlackCanonicalAdapterChild", "finalize BlackCanonicalAdapterParent"
    ]);
});

test("canonical reference collections retain storage and map keys without losing graph identity", () =>
{
    let list, map, set;
    const retained = {};
    class Item {}
    class Collections
    {
        list = (list = []);
        map = (map = new Map([["retained", retained]]));
        set = (set = new Set());
    }
    CjsSchema.define(Item, { className: "BlackCanonicalItem", members: [] });
    CjsSchema.define(Collections, { className: "BlackCanonicalCollections", members: [
        member("list", "list", { type: { kind: "list", itemType: "BlackCanonicalItem" } }),
        member("map", "map", { type: { kind: "map", valueType: "BlackCanonicalItem" } }),
        member("set", "set", { type: { kind: "set", itemType: "BlackCanonicalItem" } })
    ] });
    const fixture = new BlackFixture();
    const bytes = fixture.Finish(fixture.Object(1, "BlackCanonicalCollections", [
        ["list", concat([u32(2), fixture.Object(2, "BlackCanonicalItem"), fixture.Object(0)])],
        ["map", concat([u32(2), fixture.String("__proto__"), fixture.Object(2), fixture.String("retained"), fixture.Object(0)])],
        ["set", concat([u32(2), fixture.Object(2), fixture.Object(2)])]
    ]));
    const root = new CjsBlackReader(bytes, { schema: null }).CreateObject();
    assert.equal(root.list, list);
    assert.equal(root.map, map);
    assert.equal(root.set, set);
    assert.equal(root.list.length, 1);
    assert.equal(root.map.get("retained"), retained);
    assert.equal(root.map.get("__proto__"), root.list[0]);
    assert.deepEqual([...root.set], root.list);
});

test("complete scene graphs decode with explicit baseless test classes and canonical declarations only", async context =>
{
    // These test constructors prove reader construction, not production class
    // migration: the maintained scene/effect/parameter classes still have a base.
    class Scene {}
    class Effect {}
    class Texture {}
    const structure = {
        name: "Tr2ConstantEffectParameter", size: 24,
        // Tr2Effect.cpp:33-37, 64-bit BlueSharedString storage followed by vec4.
        members: [{ name: "name", offset: 0, type: "string" }, { name: "value", offset: 8, type: "vector4" }]
    };
    CjsSchema.define(Scene, { className: "EveSpaceScene", members: [
        member("backgroundEffect", "objectRef"), member("backgroundRenderingEnabled", "boolean"),
        ...["envMapResPath", "envMap1ResPath", "lowQualityNebulaResPath", "lowQualityNebulaMixResPath", "envMap2ResPath"].map(name => member(name, "string")),
        member("ambientColor", "color"), member("fogStart", "float32"), member("fogEnd", "float32"), member("reflectionIntensity", "float32")
    ] });
    CjsSchema.define(Effect, { className: "Tr2Effect", members: [
        member("effectFilePath", "string"),
        member("resources", "list", { type: { kind: "list", itemType: { kind: "objectRef", className: "TriTextureParameter" } } }),
        member("constParameters", "list", { type: { kind: "list", itemType: { kind: "rawStruct", className: "Tr2ConstantEffectParameter" }, structure } })
    ] });
    CjsSchema.define(Texture, { className: "TriTextureParameter", members: [member("name", "string"), member("resourcePath", "path")] });
    const verify = bytes =>
    {
        const reader = new CjsBlackReader(bytes, { schema: null });
        const document = reader.ReadDocument();
        assert.equal(document.nodes.length, 6);
        const baseline = new CjsBlackReader(bytes, { schema: blackDefinitions }).ReadDocument();
        assert.deepEqual(document.nodes.map(({ kind, fields }) => ({ kind, fields })),
            baseline.nodes.map(({ kind, fields }) => ({ kind, fields })));
        assert.deepEqual(reader.reports, []);
        assert.equal(reader.reader.AtEnd(), true);
        const scene = reader.CreateObject();
        assert.equal(scene.constructor, Scene);
        assert.equal(scene.backgroundEffect.constructor, Effect);
        assert.equal(scene.backgroundEffect.resources.length, 4);
        assert.ok(scene.backgroundEffect.resources.every(texture => texture.constructor === Texture));
        assert.equal(scene.backgroundEffect.constParameters.length, 5);
        assert.equal(reader.reader.AtEnd(), true);
        assert.deepEqual(reader.reports, []);
        return scene;
    };
    await context.test("authored portable fixture covers the complete graph and native record stride", () =>
    {
        const scene = verify(authoredScene());
        assert.equal(scene.fogStart, 5);
        assert.equal(scene.fogEnd, 25);
        assert.equal(scene.backgroundEffect.constParameters[4].name, "AuthoredParameter4");
        assert.deepEqual(scene.backgroundEffect.constParameters[4].value, [4, 4.25, 4.5, 1]);
    });
    const externalPath = process.env.CJS_BLACK_CANONICAL_CUBE;
    await context.test("optional external real cube is fully decoded", {
        skip: externalPath ? false : "Set CJS_BLACK_CANONICAL_CUBE to the local m05_cube.black asset; game assets are not committed."
    }, () =>
    {
        const bytes = readFileSync(externalPath);
        assert.equal(bytes.length, 1062);
        assert.equal(createHash("sha256").update(bytes).digest("hex"), "a817beefa07ba8623c08a04e22545eeb0652dbc68ab19bd4542ab78f96314e9d");
        verify(bytes);
    });
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
