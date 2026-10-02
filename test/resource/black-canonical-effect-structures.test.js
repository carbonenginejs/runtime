import test from "node:test";
import assert from "node:assert/strict";
import { CjsSchema } from "../../npm/dist/global/schema/CjsSchema.js";
import { CjsBlackReader } from "../../npm/dist/resource/formats/black/core/CjsBlackReader.js";
import { CjsBlackSchemaRegistry } from "../../npm/dist/resource/formats/black/core/CjsBlackSchemaRegistry.js";
import { Tr2Effect } from "../../npm/dist/trinity/shader/Tr2Effect.js";

// Native class facts: READ|PERSIST structure list (Tr2Effect_Blue.cpp:139-144).
// Supported 64-bit wire facts: two 8-byte shared-string slots, full stride16
// (Tr2EffectDescription.h:272-276; Tr2Effect.cpp:110-114).
function optionBytes(stride = 16)
{
    const fixture = new BlackFixture();
    const records = [["QUALITY", "HIGH"], ["MODE", ""]].map(([name, value]) =>
        concat([fixture.String(name), new Uint8Array(6).fill(0xa5),
            fixture.String(value), new Uint8Array(6).fill(0x5a)]));
    return fixture.Finish(fixture.Object(1, "Tr2Effect", [
        ["options", concat([u32(2), u16(stride), ...records])],
        ["effectFilePath", fixture.String("res:/authored/options.fx")]
    ]));
}

test("canonical production effect retains its option list and decodes full native string slots", context =>
{
    context.mock.method(Tr2Effect.prototype, "Initialize", () => assert.fail("Initialization is unqualified"));
    let allocated, originalOptions;
    class RecordingReader extends CjsBlackReader
    {
        CreateRuntimeTarget(kind, shape)
        {
            allocated = super.CreateRuntimeTarget(kind, shape);
            originalOptions = allocated.options;
            return allocated;
        }
    }
    const reader = new RecordingReader(optionBytes(), { schema: null, initialize: false });
    const effect = reader.CreateObject();
    assert.equal(effect.constructor, Tr2Effect);
    assert.equal(effect, allocated);
    assert.equal(reader.references.get(1), effect);
    assert.equal(effect.options, originalOptions);
    assert.deepEqual(effect.options, [{ name: "QUALITY", value: "HIGH" }, { name: "MODE", value: "" }]);
    assert.equal(effect.effectFilePath, "res:/authored/options.fx", "next field follows the full record stride");
    assert.equal(reader.reader.AtEnd(), true);
    assert.deepEqual(reader.reports, []);

    // Existing authored-option consumers operate on the decoded plain records.
    // Spy only on rebuild dispatch; this does not qualify shader/device lifecycle.
    const rebuild = context.mock.method(effect, "RebuildCachedDataInternal", () => {});
    const first = effect.options[0];
    assert.equal(effect.GetOption("QUALITY"), "HIGH");
    effect.SetOption("QUALITY", "LOW");
    assert.equal(effect.options[0], first);
    assert.equal(effect.options, originalOptions);
    assert.equal(effect.GetOption("QUALITY"), "LOW");
    assert.equal(rebuild.mock.callCount(), 1);
    effect.SetOption("QUALITY", "LOW");
    assert.equal(rebuild.mock.callCount(), 1);
});

test("prior production option reference-list declaration rejects native raw records", () =>
{
    class PriorDeclarationReader extends CjsBlackReader
    {
        ResolveSourceShape(kind)
        {
            if (kind !== "Tr2Effect") return super.ResolveSourceShape(kind);
            const info = CjsSchema.getSchema(Tr2Effect);
            return CjsBlackSchemaRegistry.fromClassInfo({ ...info, members: info.members.map(member =>
                member.name === "options"
                    ? { ...member, type: { kind: "list", itemType: "Tr2ShaderOption" } } : member) });
        }
    }
    assert.throws(() => new PriorDeclarationReader(optionBytes(), {
        schema: null, initialize: false
    }).CreateObject(), /Tr2Effect\.options/);
});

test("canonical options reject an incompatible native record stride", () =>
{
    assert.throws(() => new CjsBlackReader(optionBytes(7), {
        schema: null, initialize: false
    }).CreateObject(), /Incompatible Black structure Tr2ShaderOption/);
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
