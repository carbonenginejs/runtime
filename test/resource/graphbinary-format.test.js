import assert from "node:assert/strict";
import test from "node:test";
import { CjsGraphBinaryFormat as Format, opaqueBytes } from "../../src/resource/formats/graphbinary/index.js";
import { fixtures } from "./graph-fixtures.js";

const { Node } = fixtures("GraphBinary");
const options = { customHandlers: { state: opaqueBytes("state") } };
function unpack(bytes)
{
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return JSON.parse(new TextDecoder().decode(bytes.subarray(16, 16 + view.getUint32(8, true))));
}
function repack(original, envelope)
{
    const header = new DataView(original.buffer, original.byteOffset, original.byteLength);
    const oldStart = Math.ceil((16 + header.getUint32(8, true)) / 8) * 8;
    const json = new TextEncoder().encode(JSON.stringify(envelope));
    const start = Math.ceil((16 + json.length) / 8) * 8;
    const bin = original.subarray(oldStart);
    const result = new Uint8Array(start + bin.length);
    result.set([67, 74, 83, 66]);
    const out = new DataView(result.buffer);
    out.setUint32(4, 1, true); out.setUint32(8, json.length, true); out.setUint32(12, bin.length, true);
    result.set(json, 16); result.set(bin, start);
    return result;
}

test("binary round trip keeps graph identity, opaque bytes and independently owned arrays", () =>
{
    const source = new Node(); source.peer = source; source.weak = source;
    const bytes = Format.write(source, options);
    const envelope = unpack(bytes);
    assert.deepEqual(envelope.root.indices, { _view: 0 });
    assert.equal(envelope.root.flags, 0x80000001);
    assert.ok(envelope.bufferViews.every(view => view.byteOffset % 8 === 0));
    const a = Format.read(bytes, { ...options, emit: "runtime" });
    const b = Format.read(bytes, { ...options, emit: "runtime" });
    assert.deepEqual(a.reports, []);
    assert.equal(a.root.peer, a.root);
    assert.equal(a.root.weak, a.root);
    assert.deepEqual(a.root.indices, source.indices);
    assert.deepEqual(a.root.state, source.state);
    a.root.indices[0] = 90;
    assert.equal(b.root.indices[0], 1);
    assert.equal(source.indices[0], 1);
    bytes.fill(0);
    assert.equal(b.root.indices[1], 65537);
});

test("header selection is exact and claims no extension", () =>
{
    assert.deepEqual(Format.extensions, []);
    const bytes = Format.write(new Node(), options);
    assert.equal(Format.is(bytes), true);
    assert.equal(Format.is(new TextEncoder().encode('{"format":"cjs.graph","version":1}')), false);
    assert.throws(() => Format.read(bytes.subarray(0, bytes.length - 1)), /length/u);
    const wrongVersion = bytes.slice(); new DataView(wrongVersion.buffer).setUint32(4, 2, true);
    assert.throws(() => Format.read(wrongVersion), /version/u);
    const envelope = unpack(bytes); envelope.version = 2;
    assert.throws(() => Format.read(repack(bytes, envelope)), /version/u);
});

test("sliced unaligned inputs return aligned owned storage without adjacent bytes", () =>
{
    const bytes = Format.write(new Node(), options);
    const padded = new Uint8Array(bytes.length + 3); padded.set(bytes, 1);
    const result = Format.read(padded.subarray(1, bytes.length + 1), { ...options, emit: "runtime" });
    assert.deepEqual(result.reports, []);
    assert.deepEqual(result.root.indices, new Node().indices);
    assert.notEqual(result.root.indices.buffer, padded.buffer);
});

test("bad views fail at their member and leave siblings readable", () =>
{
    const bytes = Format.write(new Node(), options);
    for (const change of [
        view => { view.byteOffset = 1; }, view => { view.byteLength = 3; },
        view => { view.count = Number.MAX_SAFE_INTEGER; }, view => { view.type = "float32"; },
        view => { view.byteOffset = 9999992; }
    ])
    {
        const envelope = unpack(bytes); change(envelope.bufferViews[0]);
        const result = Format.read(repack(bytes, envelope), { ...options, emit: "runtime" });
        assert.equal(result.root.name, "default");
        assert.equal(result.reports[0].path, "/root/indices");
        assert.deepEqual(result.root.state, Uint8Array.of(0, 128, 255));
    }
});

test("large typed values are bulk payloads and keep exact floating bits", () =>
{
    const values = new Float32Array(250000);
    values[0] = -0; values[1] = NaN; values[2] = Infinity;
    for (let index = 3; index < values.length; index++) values[index] = index / 7;
    const source = { _type: "UnregisteredBulk", values, integers: BigUint64Array.of(18446744073709551615n) };
    const bytes = Format.write(source, { input: "values" });
    assert.ok(bytes.length < values.byteLength + 1024);
    const result = Format.read(bytes);
    assert.deepEqual(result.reports, []);
    assert.deepEqual(new Uint8Array(result.root.values.buffer), new Uint8Array(values.buffer));
    assert.equal(result.root.integers[0], 18446744073709551615n);
    assert.notEqual(result.root.values.buffer, bytes.buffer);
});

test("binary custom handlers do not leak into another operation", () =>
{
    assert.throws(() => Format.write(new Node()), /Missing custom handler/u);
    const bytes = Format.write(new Node(), options);
    const result = Format.read(bytes, { emit: "runtime" });
    assert.equal(result.reports[0].path, "/root/state");
});

test("duplicate IDs are errors in binary as well as text", () =>
{
    const bytes = Format.write(new Node(), options);
    const envelope = unpack(bytes);
    envelope.root._id = 1;
    envelope.root.peer = { _type: envelope.root._type, _id: 1 };
    assert.throws(() => Format.read(repack(bytes, envelope)), /duplicate _id/u);
});

test("opaque values can be repackaged without a class registry or losing their byte type", () =>
{
    const source = new Node(); source.state = Buffer.from([0, 7, 255]);
    const values = Format.read(Format.write(source, options)).root;
    const repacked = Format.write(values, { input: "values" });
    const result = Format.read(repacked, { ...options, emit: "runtime" });
    assert.deepEqual(result.reports, []);
    assert.deepEqual(result.root.state, Uint8Array.of(0, 7, 255));
});

test("class-free writes reject caller-supplied dangling view markers", () =>
{
    for (const payload of [{ _view: 999 }, { _custom: "state", _view: 0 }])
    {
        assert.throws(() => Format.write({ _type: "Unknown", payload }, { input: "values" }), /Caller-authored _view/u);
    }
});
