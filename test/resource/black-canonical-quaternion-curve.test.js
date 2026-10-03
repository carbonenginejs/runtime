import test from "node:test";
import assert from "node:assert/strict";
import { CjsSchema } from "../../npm/dist/global/schema/CjsSchema.js";
import { CjsBlackReader } from "../../npm/dist/resource/formats/black/core/CjsBlackReader.js";
import { CjsBlackSchemaRegistry } from "../../npm/dist/resource/formats/black/core/CjsBlackSchemaRegistry.js";
import { classStructureLayout } from "../../npm/dist/resource/formats/black/core/blackClassStructures.js";
import { Tr2CurveQuaternion } from "../../npm/dist/trinity/curves/curve/Tr2CurveQuaternion.js";

const authored = [
    { time: 0, value: [0, 0, 0, 1], id: 0xbeef, interpolation: 1 },
    { time: 4, value: [0, 0, 1, 0], id: 0xfedc, interpolation: 0xabcd }
];

// Native cpp11-17 offsets: float32 time, four quaternion floats, two uint16s.
function curveBytes(stride = 24)
{
    const fixture = new BlackFixture();
    const records = authored.map(key =>
    {
        const bytes = new Uint8Array(24), view = new DataView(bytes.buffer);
        view.setFloat32(0, key.time, true);
        key.value.forEach((value, index) => view.setFloat32(4 + index * 4, value, true));
        view.setUint16(20, key.id, true);
        view.setUint16(22, key.interpolation, true);
        return bytes.slice(0, stride);
    });
    return fixture.Finish(fixture.Object(1, "Tr2CurveQuaternion", [
        ["keys", concat([u32(2), u16(stride), ...records])],
        ["name", fixture.String("AuthoredQuaternion")]
    ]));
}

function near(actual, expected)
{
    assert.equal(actual.length, expected.length);
    expected.forEach((value, index) => assert.ok(Math.abs(actual[index] - value) < 1e-6,
        `component ${index}: ${actual[index]} versus ${value}`));
}

test("canonical quaternion records preserve storage and drive production slerp and update consumers", context =>
{
    const changed = context.mock.method(Tr2CurveQuaternion.prototype, "OnKeysChanged", () => assert.fail("Decode must not sort keys"));
    assert.equal("SetValues" in Tr2CurveQuaternion.prototype, false);
    let keys, currentValue;
    class RecordingReader extends CjsBlackReader
    {
        CreateRuntimeTarget(kind, shape)
        {
            const curve = super.CreateRuntimeTarget(kind, shape);
            keys = curve.keys;
            currentValue = curve.currentValue;
            return curve;
        }
    }
    // Declaration/consumer proof only; initialization and full class migration are unqualified.
    const reader = new RecordingReader(curveBytes(), { schema: null, initialize: false });
    const curve = reader.CreateObject();
    assert.equal(curve.constructor, Tr2CurveQuaternion);
    assert.equal(reader.references.size, 0, "the builder does not retain the returned graph");
    assert.equal(curve.keys, keys);
    assert.equal(curve.currentValue, currentValue);
    assert.ok(currentValue instanceof Float32Array);
    assert.deepEqual(curve.keys, authored);
    assert.notEqual(curve.keys[0].value, curve.keys[1].value);
    assert.equal(curve.name, "AuthoredQuaternion");
    assert.equal(reader.reader.AtEnd(), true);
    assert.deepEqual(reader.reports, []);
    assert.equal(changed.mock.callCount(), 0);
    const out = new Float32Array(4);
    assert.equal(curve.GetValueAt(-1, out), out);
    near(out, [0, 0, 0, 1]);
    curve.GetValueAt(5, out);
    near(out, [0, 0, 1, 0]);
    curve.GetValueAt(2, out);
    near(out, [0, 0, Math.SQRT1_2, Math.SQRT1_2]);
    curve.UpdateValue(1);
    assert.equal(curve.currentValue, currentValue);
    near(currentValue, [0, 0, Math.sin(Math.PI / 8), Math.cos(Math.PI / 8)]);
    assert.equal(curve.Update(3, out), out);
    assert.equal(curve.currentValue, currentValue);
    near(out, [0, 0, Math.sin(3 * Math.PI / 8), Math.cos(3 * Math.PI / 8)]);
    assert.deepEqual(curve.keys, authored, "evaluation does not mutate decoded key values");
    changed.mock.restore();
    const first = curve.keys[0], last = curve.keys[1];
    curve.keys.reverse();
    curve.OnKeysChanged();
    assert.equal(curve.keys[0], first);
    assert.equal(curve.keys[1], last);
});

test("quaternion keys retain verified JS short-record defaults with fresh per-record arrays", () =>
{
    // Existing JS compatibility rule, not native Black tolerance for short records.
    for (const stride of [4, 20, 22])
    {
        const reader = new CjsBlackReader(curveBytes(stride), { schema: null, initialize: false });
        const curve = reader.CreateObject();
        assert.deepEqual(curve.keys, authored.map(key => ({ time: key.time,
            value: stride >= 20 ? key.value : [0, 0, 0, 1],
            id: stride >= 22 ? key.id : 0, interpolation: 1 })));
        assert.notEqual(curve.keys[0].value, curve.keys[1].value);
        assert.equal(curve.name, "AuthoredQuaternion");
        assert.equal(reader.reader.AtEnd(), true);
        assert.deepEqual(reader.reports, []);
        if (stride === 4)
        {
            curve.keys[0].value[0] = 99;
            assert.deepEqual(curve.keys[1].value, [0, 0, 0, 1]);
            assert.deepEqual(classStructureLayout("Tr2CurveQuaternion", "keys").defaults.value, [0, 0, 0, 1]);
            const next = new CjsBlackReader(curveBytes(4), { schema: null, initialize: false }).CreateObject();
            assert.deepEqual(next.keys[0].value, [0, 0, 0, 1]);
            assert.notEqual(next.keys[0].value, curve.keys[1].value);
        }
    }
});

test("quaternion key strides outside verified member boundaries are rejected", () =>
{
    for (const stride of [0, 3, 8, 19, 21, 23, 25])
        assert.throws(() => new CjsBlackReader(curveBytes(stride), {
            schema: null, initialize: false
        }).CreateObject(), /Incompatible Black structure Tr2CurveQuaternionKey/);
});

test("the unchanged prior quaternion array-of-struct descriptor has no canonical record codec", () =>
{
    class PriorDeclarationReader extends CjsBlackReader
    {
        ResolveSourceShape(kind)
        {
            if (kind !== "Tr2CurveQuaternion") return super.ResolveSourceShape(kind);
            const info = CjsSchema.getSchema(Tr2CurveQuaternion);
            return CjsBlackSchemaRegistry.fromClassInfo({ ...info, members: info.members.map(member =>
                member.name === "keys" ? { ...member, type: { kind: "array",
                    itemType: { kind: "struct", className: "Tr2CurveQuaternionKey" } } } : member) });
        }
    }
    assert.throws(() => new PriorDeclarationReader(curveBytes(), {
        schema: null, initialize: false
    }).CreateObject(), /Tr2CurveQuaternion\.keys: Unsupported canonical Black array item type: struct/);
});

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
