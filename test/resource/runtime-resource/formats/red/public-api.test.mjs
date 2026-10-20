import { test } from "node:test";
import assert from "node:assert/strict";
import CjsRedFormat, * as entry from "../../../../../npm/dist/resource/formats/red/index.js";
import { CjsFormat } from "../../../../../npm/dist/resource/format/CjsFormat.js";
import { CjsSchema } from "../../../../../npm/dist/global/schema/index.js";
import { YamlReader } from "../../../../../npm/dist/global/blue/YamlReader.js";
import { IInitialize } from "../../../../../npm/dist/global/blue/IInitialize.js";
import { BeObjectMetadata } from "../../../../../npm/dist/global/blue/BlueObjectMetadata.js";
import "../../../../../npm/dist/global/blue/values.js";

class RedContractLeaf
{
    value = 0;
    initializeCount = 0;
    Initialize() { ++this.initializeCount; }
}
class RedContractRoot
{
    name = "";
    left = null;
    right = null;
    items = [];
    position = new Float32Array(3);
}
function declare(Constructor, name, fields)
{
    CjsSchema.define(Constructor, { className: name, members: Object.entries(fields).map(([key, type]) => ({
        key, name: key, type: typeof type === "string" ? { kind: type } : type,
        edit: { persist: true, read: true, write: true }
    })) });
}
declare(RedContractLeaf, "RedContractLeaf", { value: "float32" });
CjsSchema.blue.interface(IInitialize)(RedContractLeaf);
declare(RedContractRoot, "RedContractRoot", {
    name: "string", left: "rootRef", right: "rootRef",
    items: { kind: "array", itemType: { kind: "rootRef" } }, position: "vec3"
});
const source = `type: RedContractRoot
__bluemetadata__:
  arbitrary: "retained"
name: "Takahē"
left: &child {type: RedContractLeaf, value: 0.123456789}
right: *child
items: [*child, null]
position: [0.123456789, 2, 3]
`;

test("the public Red entry exports only its object-loading format", () =>
{
    assert.deepEqual(Object.keys(entry).sort(), ["CjsRedFormat", "default"]);
    assert.equal(entry.CjsRedFormat, CjsRedFormat);
    CjsFormat.validateContract(CjsRedFormat);
    assert.deepEqual(CjsRedFormat.extensions, [".red"]);
    assert.deepEqual(Object.keys(CjsRedFormat.outputs), ["runtime"]);
    assert.equal(CjsRedFormat.outputs.runtime.default, true);
    for (const key of ["readPayload", "readRaw", "readRuntime", "classKeys", "copyReaderOptions"])
        assert.equal(Object.hasOwn(CjsRedFormat, key), false);
    for (const key of ["SetClass", "SetClasses", "ReadPayload", "ReadRaw", "ReadRuntime"])
        assert.equal(key in CjsRedFormat.prototype, false);
});

test("format reads construct the same canonical objects as YamlReader", () =>
{
    RedContractLeaf.prototype.SetValues = () => { throw new Error("YamlReader must not use the hydration adapter"); };
    let root;
    try { root = CjsRedFormat.read(source); }
    finally { delete RedContractLeaf.prototype.SetValues; }
    assert.equal(root.constructor, RedContractRoot);
    assert.equal(root.left.constructor, RedContractLeaf);
    assert.equal(root.name, "Takahē");
    assert.equal(root.left, root.right);
    assert.equal(root.items[0], root.left);
    assert.equal(root.items.length, 1, "native lists discard null entries");
    assert.equal(root.left.initializeCount, 1);
    assert.ok(root.position instanceof Float32Array);
    assert.equal(root.position[0], Math.fround(0.123456789));
    assert.equal(root.left.value, Math.fround(0.123456789));
    assert.deepEqual(root, new YamlReader().CreateObjectFromString(source));
});

test("UTF-8 buffers and bounded views decode only the supplied bytes", () =>
{
    const bytes = new TextEncoder().encode(source);
    const padded = new Uint8Array(bytes.length + 8);
    padded.fill(255);
    padded.set(bytes, 4);
    for (const input of [bytes.buffer, bytes, padded.subarray(4, 4 + bytes.length),
        new DataView(padded.buffer, 4, bytes.length)])
    {
        assert.equal(CjsRedFormat.read(input).name, "Takahē");
    }
});

test("values export belongs to DictWriter and retains Blue metadata and references", () =>
{
    const root = CjsRedFormat.read(source);
    assert.equal(BeObjectMetadata.Get(root, "arbitrary"), "retained");
    assert.equal(Object.hasOwn(root, "__bluemetadata__"), false);
    const values = CjsSchema.getValues(root, {}, { typeTags: true });
    assert.equal(values._type, "RedContractRoot");
    assert.equal(values.__bluemetadata__.arbitrary, "retained");
    assert.equal(values.left._id, values.right._ref);
    assert.equal(values.items[0]._ref, values.left._id);
    assert.equal(values.left.value, Math.fround(0.123456789));
    const restored = CjsSchema.from(values._type, values);
    assert.equal(restored.left, restored.right);
    assert.equal(restored.items[0], restored.left);
});

test("profile and async reads preserve native reader options", async () =>
{
    const profile = new CjsRedFormat({ doInitialize: false });
    assert.equal(profile.Read(source).left.initializeCount, 0);
    assert.equal((await profile.ReadAsync(source)).left.initializeCount, 0);
    assert.equal(profile.Read(source, { doInitialize: true }).left.initializeCount, 1);
    assert.equal((await CjsRedFormat.readAsync(source)).constructor, RedContractRoot);
});

test("support verification exercises runtime output and refuses retired payload output", async () =>
{
    const report = await CjsRedFormat.verifySupport(source);
    assert.equal(report.verified, true);
    assert.equal(report.supported, true);
    assert.equal(report.output, "runtime");
    const retired = await CjsRedFormat.verifySupport(source, { emit: "payload" });
    assert.equal(retired.supported, false);
    assert.equal(retired.error.code, "CJS_FORMAT_OUTPUT_UNDECLARED");
    for (const emit of ["json", "payload", "raw"])
        assert.throws(() => CjsRedFormat.read(source, { emit }), /only runtime output/);
});

test("Red requires text and canonical classes; generic parsed graphs are retired", () =>
{
    assert.throws(() => CjsRedFormat.read({ type: "RedContractRoot" }), /text or UTF-8 bytes/);
    assert.throws(() => CjsRedFormat.read("type: UnregisteredRedContract\n"));
    assert.throws(() => CjsRedFormat.read("type: RedContractRoot\nunknown: 1\n", { isStrict: true }), /unknown/);
});

test("native backward aliases have no expansion limit; ancestor cycles remain unsupported", () =>
{
    const many = "type: RedContractRoot\nitems:\n- &child {type: RedContractLeaf}\n" + "- *child\n".repeat(727);
    const root = CjsRedFormat.read(many);
    assert.equal(root.items.length, 728);
    assert.ok(root.items.every(item => item === root.items[0]));
    assert.throws(() => CjsRedFormat.read("&self {type: RedContractRoot, left: *self}"), /hasn't been previously defined/);
});
