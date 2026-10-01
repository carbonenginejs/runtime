import test from "node:test";
import assert from "node:assert/strict";
import { CjsSchema } from "../../npm/dist/global/schema/CjsSchema.js";
import { CjsBlackReader } from "../../npm/dist/resource/formats/black/core/CjsBlackReader.js";
import { CjsBlackSchemaRegistry } from "../../npm/dist/resource/formats/black/core/CjsBlackSchemaRegistry.js";
import { Tr2CurveScalar } from "../../npm/dist/trinity/curves/curve/Tr2CurveScalar.js";

const authored = [
    { time: 0, value: 2, leftTangent: .5, rightTangent: 3, id: 0xbeef, interpolation: 1, tangentType: 3 },
    { time: 4, value: 10, leftTangent: 4, rightTangent: -.5, id: 0xfedc, interpolation: 2, tangentType: 2 }
];

// Independent bytes: native cpp12-20 offsets, full sizeof20. Short sizes are
// exercised separately as the documented JS member-boundary extension.
function curveBytes(stride = 20)
{
    const fixture = new BlackFixture();
    const records = authored.map(key =>
    {
        const bytes = new Uint8Array(20);
        const view = new DataView(bytes.buffer);
        [key.time, key.value, key.leftTangent, key.rightTangent].forEach((value, index) => view.setFloat32(index * 4, value, true));
        view.setUint16(16, key.id, true);
        view.setUint8(18, key.interpolation);
        view.setUint8(19, key.tangentType);
        return bytes.slice(0, stride);
    });
    return fixture.Finish(fixture.Object(1, "Tr2CurveScalar", [
        ["keys", concat([u32(2), u16(stride), ...records])],
        ["name", fixture.String("AuthoredScalar")]
    ]));
}

test("canonical production scalar curve preserves mixed-width keys and evaluates decoded records", context =>
{
    const changed = context.mock.method(Tr2CurveScalar.prototype, "OnKeysChanged", () => assert.fail("Decode must not settle keys"));
    assert.equal("SetValues" in Tr2CurveScalar.prototype, false);
    let originalKeys;
    class RecordingReader extends CjsBlackReader
    {
        CreateRuntimeTarget(kind, shape)
        {
            const curve = super.CreateRuntimeTarget(kind, shape);
            originalKeys = curve.keys;
            return curve;
        }
    }
    // Wire/consumer qualification only; no full class or lifecycle migration.
    const reader = new RecordingReader(curveBytes(), { schema: null, initialize: false });
    const curve = reader.CreateObject();
    assert.equal(curve.constructor, Tr2CurveScalar);
    assert.equal(reader.references.get(1), curve);
    assert.equal(curve.keys, originalKeys);
    assert.deepEqual(curve.keys, authored);
    assert.equal(curve.name, "AuthoredScalar");
    assert.equal(reader.reader.AtEnd(), true);
    assert.deepEqual(reader.reports, []);
    assert.equal(changed.mock.callCount(), 0);
    assert.equal(curve.GetValue(-1), 2);
    assert.equal(curve.GetValue(2), 6);
    assert.equal(curve.GetValue(5), 10);
    assert.equal(curve.GetTangent(2), 2);
    curve.UpdateValue(1);
    assert.equal(curve.currentValue, 4);
    assert.equal(curve.Update(3), 8);
    assert.equal(curve.currentValue, 8);
    curve.keys[0].interpolation = 2;
    assert.equal(curve.GetValue(2), 5.5, "Hermite uses decoded per-unit-time tangents");

    // Explicit owner update works on plain decoded rows; decoding did not run it.
    changed.mock.restore();
    const first = curve.keys[0], last = curve.keys[1];
    curve.keys.reverse();
    curve.OnKeysChanged();
    assert.equal(curve.keys[0], first);
    assert.equal(curve.keys[1], last);
    assert.equal(first.rightTangent, 3, "FREE_SPLIT preserves authored tangent");
    assert.equal(last.rightTangent, last.leftTangent, "FREE_JOINED update uses plain fields");
});

test("scalar keys preserve the existing JS short-record boundaries and trailing defaults", () =>
{
    // This is a JS compatibility extension, not native Black size tolerance.
    const fields = ["time", "value", "leftTangent", "rightTangent", "id", "interpolation", "tangentType"];
    const boundaries = [4, 8, 12, 16, 18, 19, 20];
    const defaults = [0, 0, 0, 0, 0, 2, 0];
    for (const stride of boundaries.slice(0, -1))
    {
        const reader = new CjsBlackReader(curveBytes(stride), { schema: null, initialize: false });
        const curve = reader.CreateObject();
        assert.equal(curve.keys.length, 2);
        for (let index = 0; index < 2; index++)
            assert.deepEqual(curve.keys[index], Object.fromEntries(fields.map((name, member) =>
                [name, boundaries[member] <= stride ? authored[index][name] : defaults[member]])), `stride ${stride}, record ${index}`);
        assert.equal(curve.name, "AuthoredScalar");
        assert.equal(reader.reader.AtEnd(), true);
        assert.deepEqual(reader.reports, []);
    }
});

test("scalar keys reject sizes outside the verified member boundaries", () =>
{
    for (const stride of [0, 1, 3, 5, 17, 21])
        assert.throws(() => new CjsBlackReader(curveBytes(stride), {
            schema: null, initialize: false
        }).CreateObject(), /Incompatible Black structure Tr2CurveScalarKey/);
});

test("the prior array-of-struct declaration lacks a canonical raw-record codec", () =>
{
    class PriorDeclarationReader extends CjsBlackReader
    {
        ResolveSourceShape(kind)
        {
            if (kind !== "Tr2CurveScalar") return super.ResolveSourceShape(kind);
            const info = CjsSchema.getSchema(Tr2CurveScalar);
            return CjsBlackSchemaRegistry.fromClassInfo({ ...info, members: info.members.map(member =>
                member.name === "keys" ? { ...member, type: { kind: "array",
                    itemType: { kind: "struct", className: "Tr2CurveScalarKey" } } } : member) });
        }
    }
    assert.throws(() => new PriorDeclarationReader(curveBytes(), {
        schema: null, initialize: false
    }).CreateObject(), /Tr2CurveScalar\.keys: Unsupported canonical Black array item type: struct/);
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
