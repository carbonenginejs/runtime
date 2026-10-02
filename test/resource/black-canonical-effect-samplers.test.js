import test from "node:test";
import assert from "node:assert/strict";
import { CjsSchema } from "../../npm/dist/global/schema/CjsSchema.js";
import { CjsBlackReader } from "../../npm/dist/resource/formats/black/core/CjsBlackReader.js";
import { CjsBlackSchemaRegistry } from "../../npm/dist/resource/formats/black/core/CjsBlackSchemaRegistry.js";
import { Tr2Effect } from "../../npm/dist/trinity/shader/Tr2Effect.js";
import { Tr2SamplerOverride } from "../../npm/dist/trinity/shader/sampler/Tr2SamplerOverride.js";

// Native class facts: READ|PERSIST structure list, no NOTIFY.
// Wire facts: cpp84-95 members, h23-37 + Tr2SamplerStateAL.h36 full64-bit
// sizeof56, including the unexposed shared_ptr tail at40..55.
function samplerBytes(stride = 56)
{
    const fixture = new BlackFixture();
    const records = ["PatternSampler", "OtherSampler"].map((name, index) =>
    {
        const bytes = new Uint8Array(56);
        const view = new DataView(bytes.buffer);
        bytes.set(fixture.String(name));
        bytes.fill(0xa5, 2, 8);
        for (const [offset, value] of [[8, index ? 0xffffffff : 1], [12, 2], [16, 3],
            [20, 2], [24, 2], [32, index + 4], [36, index + 8]]) view.setUint32(offset, value, true);
        view.setFloat32(28, index + .25, true);
        bytes.fill(0xab, 40, 56);
        return bytes;
    });
    return fixture.Finish(fixture.Object(1, "Tr2Effect", [
        ["samplerOverrides", concat([u32(2), u16(stride), ...records])],
        ["effectFilePath", fixture.String("res:/authored/samplers.fx")]
    ]));
}

function forbidValues(context)
{
    context.mock.method(Tr2Effect.prototype, "Initialize", () => assert.fail("Lifecycle is unqualified"));
    assert.equal("SetValues" in Tr2SamplerOverride.prototype, false);
    Object.defineProperty(Tr2SamplerOverride.prototype, "SetValues", {
        configurable: true,
        value: () => assert.fail("Native rows must not require values machinery")
    });
    context.after(() => { delete Tr2SamplerOverride.prototype.SetValues; });
}

test("canonical sampler records preserve list identity, unsigned fields and full opaque native stride", context =>
{
    forbidValues(context);
    let originalList;
    class RecordingReader extends CjsBlackReader
    {
        CreateRuntimeTarget(kind, shape)
        {
            const effect = super.CreateRuntimeTarget(kind, shape);
            originalList = effect.samplerOverrides;
            return effect;
        }
    }
    const reader = new RecordingReader(samplerBytes(), { schema: null, initialize: false });
    const effect = reader.CreateObject();
    assert.equal(effect.constructor, Tr2Effect);
    assert.equal(reader.references.get(1), effect);
    assert.equal(effect.samplerOverrides, originalList);
    assert.equal(effect.samplerOverrides.length, 2);
    assert.deepEqual(effect.samplerOverrides[0], { name: "PatternSampler", addressU: 1, addressV: 2,
        addressW: 3, filter: 2, mipFilter: 2, lodBias: .25, maxMipLevel: 4, maxAnisotropy: 8 });
    assert.equal(effect.samplerOverrides[1].addressU, 0xffffffff);
    assert.equal(effect.samplerOverrides[1].lodBias, 1.25);
    assert.ok(effect.samplerOverrides.every(row => !Object.hasOwn(row, "sampler")));
    assert.equal(effect.effectFilePath, "res:/authored/samplers.fx");
    assert.equal(reader.reader.AtEnd(), true);
    assert.deepEqual(reader.reports, []);

    const row = effect.samplerOverrides[0];
    const rebuild = context.mock.method(effect, "RebuildCachedDataInternal", () => {});
    assert.equal(effect.SetSamplerOverrides({ PatternSampler: { addressU: "4", lodBias: "1.5" } }), true);
    assert.equal(effect.samplerOverrides[0], row);
    assert.equal(effect.samplerOverrides, originalList);
    assert.equal(row.addressU, 4);
    assert.equal(row.lodBias, 1.5);
    assert.equal(rebuild.mock.callCount(), 1);
    assert.equal(effect.SetSamplerOverrides({ PatternSampler: { addressU: 4, lodBias: 1.5 } }), false);
    assert.equal(rebuild.mock.callCount(), 1);

    // Exercise the production material consumer with a recording backend.
    const authored = { addressU: 1 };
    effect.shader = { GetEffect: () => ({ techniques: [{ passes: [{ stageInputs: [{ exists: true,
        samplers: new Map([[2, { name: "PatternSampler", isDynamic: true, sampler: authored }],
            [3, { name: "OtherSampler", isDynamic: false, sampler: authored }]]) }] }] }] }) };
    const bindings = new Map();
    const pass = { compatibleWithGdr: true, resourceSetDesc: {
        SetSampler(stage, register, state) { bindings.set(`${stage}:${register}`, state); return true; }
    } };
    effect.SeedSamplers(0, 0, pass, { CreateSamplerState: description => description });
    const sampler = bindings.get("0:2");
    assert.equal(sampler.addressU, 4);
    assert.equal(sampler.addressV, 2);
    assert.equal(sampler.addressW, 3);
    assert.equal(sampler.minFilter, row.filter);
    assert.equal(sampler.magFilter, row.filter);
    assert.equal(sampler.mipFilter, row.mipFilter);
    assert.equal(sampler.mipLODBias, 1.5);
    assert.equal(sampler.minLOD, 4);
    assert.equal(sampler.maxAnisotropy, 8);
    assert.equal(bindings.get("0:3"), authored, "non-dynamic sampler is not overridden");
    assert.equal(pass.compatibleWithGdr, false);
});

test("sampler scalar edits retain existing coercion, defaults, replacement and removal semantics", context =>
{
    forbidValues(context);
    const effect = new Tr2Effect();
    const rebuild = context.mock.method(effect, "RebuildCachedDataInternal", () => {});
    assert.equal(effect.SetSamplerOverrides({ First: { addressU: "4" }, Skipped: undefined }), true);
    const row = effect.samplerOverrides[0];
    assert.equal(row.constructor, Tr2SamplerOverride);
    assert.equal(row.name, "First");
    assert.deepEqual([row.addressV, row.addressW, row.filter, row.mipFilter, row.lodBias, row.maxMipLevel, row.maxAnisotropy],
        [1, 1, 2, 2, 0, 0, 4]);
    assert.equal(effect.SetSamplerOverrides({ First: { name: 7, addressU: 0xffffffff, addressV: true,
        addressW: 3.8, filter: "2", mipFilter: undefined, lodBias: Infinity,
        maxMipLevel: -1, maxAnisotropy: null } }), true);
    assert.deepEqual([row.name, row.addressU, row.addressV, row.addressW, row.filter, row.mipFilter,
        row.lodBias, row.maxMipLevel, row.maxAnisotropy], ["7", -1, 1, 3, 2, 0, 0, 0xffffffff, null]);
    const replacement = new Tr2SamplerOverride();
    assert.equal(effect.SetSamplerOverrides({ "7": replacement }), true);
    assert.equal(replacement.name, "7");
    assert.equal(effect.samplerOverrides[0], replacement);
    assert.equal(effect.SetSamplerOverrides({ "7": replacement }), true, "instance replacement still reports changed");
    assert.equal(effect.SetSamplerOverrides({ "7": null }), true);
    assert.equal(effect.SetSamplerOverrides({ "7": null }), false);
    assert.equal(effect.SetSamplerOverrides(null), false);
    assert.equal(effect.samplerOverrides.length, 0);
    assert.equal(rebuild.mock.callCount(), 5);
});

test("native sampler bags reject metadata, identity/editor keys and nonscalar values visibly", context =>
{
    forbidValues(context);
    const effect = new Tr2Effect();
    context.mock.method(effect, "RebuildCachedDataInternal", () => {});
    effect.SetSamplerOverrides({ Existing: {} });
    for (const key of ["_metadata", "_id", "_type", "_ref", "unknown", "sampler"])
        assert.throws(() => effect.SetSamplerOverrides({ Existing: { [key]: "unsupported" } }), /does not support field/);
    for (const value of [{}, [], new Uint8Array(1), () => 1, Symbol("invalid")])
        assert.throws(() => effect.SetSamplerOverrides({ Existing: { addressU: value } }), /requires a scalar/);
    for (const value of [1, "invalid", [], new Uint8Array(1)])
    {
        assert.throws(() => effect.SetSamplerOverrides(value), /requires a sampler value map/);
        assert.throws(() => effect.SetSamplerOverrides({ Existing: value }), /requires override values/);
    }
    assert.throws(() => effect.SetSamplerOverrides({ Existing: { addressU: 4, unknown: 1 } }), /does not support field/);
    assert.equal(effect.samplerOverrides[0].addressU, 4, "earlier writes are not rolled back on later failure");
});

test("prior sampler reference-list declaration cannot decode native records", () =>
{
    class PriorDeclarationReader extends CjsBlackReader
    {
        ResolveSourceShape(kind)
        {
            const info = CjsSchema.getSchema(Tr2Effect);
            return CjsBlackSchemaRegistry.fromClassInfo({ ...info, members: info.members.map(member =>
                member.name === "samplerOverrides" ? { ...member,
                    type: { kind: "list", itemType: "Tr2SamplerOverride" } } : member) });
        }
    }
    assert.throws(() => new PriorDeclarationReader(samplerBytes(), {
        schema: null, initialize: false
    }).CreateObject(), /Tr2Effect\.samplerOverrides/);
});

test("sampler records reject a stride off a member boundary", () =>
{
    assert.throws(() => new CjsBlackReader(samplerBytes(39), {
        schema: null, initialize: false
    }).CreateObject(), /Incompatible Black structure Tr2SamplerOverride/);
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
