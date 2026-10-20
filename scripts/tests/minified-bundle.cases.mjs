// Required external-fixture proof, run explicitly with npm run test:bundle.
// No private asset bytes or machine paths ship in this repository.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { test } from "node:test";
import * as runtime from "../../npm/dist/carbonenginejs.min.js";
// Readers are opt-in subpaths, absent from the package root. Use their strictly
// minified test builds only to decode bytes. The SHIPPED DictReader performs
// Black class construction and field population using its own declarations.
// Red uses the shipped YamlReader and the values service's DictWriter.
import { CjsBlackFormat } from "../../.cache/minified-test/dist/resource/formats/black/index.js";

async function fixture(variable)
{
    assert.ok(process.env[variable], `${variable} must name the required external fixture`);
    return readFile(process.env[variable]);
}

test("shipped minified bundle constructs real Black hull classes", async () =>
{
    const bytes = await fixture("CJS_BUNDLE_BLACK_FILE");
    assert.equal(bytes.length, 87626);
    const payload = CjsBlackFormat.readPayload(bytes);
    const result = { root: new runtime.DictReader({ declarations: true }).CreateObject(payload.object) };
    assert.equal(Object.getPrototypeOf(result.root), runtime.EveSOFDataHull.prototype);
    assert.equal(runtime.blue.classes.GetClassRegistration("EveSOFDataHull").name, "EveSOFDataHull");
    assert.notEqual(runtime.EveSOFDataHull.name, "EveSOFDataHull", "negative control: identifiers really were minified");
    assert.equal(result.root.name, "ab1_t1");
    assert.equal(result.root.locatorSets.length, 8);
    assert.equal(Object.getPrototypeOf(result.root.locatorSets[0]), runtime.EveSOFDataHullLocatorSet.prototype);
});

// Operator-provided, ChatGPT-generated material: object-loading smoke coverage,
// never a Carbon-authored oracle for YamlWriter text fidelity.
test("shipped minified bundle constructs an operator-provided generated Red material", async () =>
{
    const bytes = await fixture("CJS_BUNDLE_RED_FILE");
    assert.equal(createHash("sha256").update(bytes).digest("hex"), "da2144e298b1e27b90ca6c4fedf735c32c73edb5c837d1155c1272f5ba61d437");
    const result = { root: new runtime.YamlReader().CreateObjectFromString(bytes.toString("utf8")) };
    // CjsSchema is a separate public subpath; keep this check inside the shipped bundle.
    const values = new runtime.DictWriter().WriteObject(result.root, {}, { typeTags: true });
    assert.equal(values._type, "EveSOFDataMaterial");
    assert.equal(typeof values.name, "string");
    assert.equal(values.parameters.length, 4);
    assert.notEqual(runtime.YamlReader.name, "YamlReader", "negative control: reader identity survives minification");
    assert.equal(Object.getPrototypeOf(result.root), runtime.EveSOFDataMaterial.prototype);
    assert.equal(typeof result.root.name, "string");
    assert.equal(result.root.parameters.length, 4);
    for (const parameter of result.root.parameters)
    {
        assert.equal(Object.getPrototypeOf(parameter), runtime.EveSOFDataParameter.prototype);
        assert.ok(parameter.value instanceof Float32Array);
        assert.equal(parameter.value.length, 4);
        assert.ok(parameter.value.every(Number.isFinite));
    }
});

test("shipped minified SOF builds a hull from real catalog DNA", async () =>
{
    const black = await fixture("CJS_BUNDLE_SOF_FILE");
    assert.equal(createHash("md5").update(black).digest("hex"), "a800b64240ea16a7efba1d1b96df3365");
    const sof = await runtime.EveSOF.Create({ black });
    const values = await sof.BuildValuesFromDNA("ab1_t1:amarrbase:amarr");
    assert.equal(values._type, "EveShip2");
    assert.ok(values.mesh.opaqueAreas.length > 0);
    assert.equal(runtime.blue.classes.GetClassRegistration(values._type).type, runtime.EveShip2);
});

test("shipped minified ResMan resolves and reads the real Black format", async () =>
{
    const bytes = await fixture("CJS_BUNDLE_BLACK_FILE");
    const manager = new runtime.CjsBlueResMan({ source: { Read: () => bytes } });
    try
    {
        manager.RegisterFormat(CjsBlackFormat);
        assert.equal(manager.ResolveFormat("black", { emit: "payload" }), CjsBlackFormat);
        const descriptor = manager.GetFormatDescriptors("black")[0];
        const payload = await manager.ReadFormat(descriptor, bytes, { emit: "payload" });
        const hull = new runtime.DictReader({ declarations: true }).CreateObject(payload.object);
        assert.equal(Object.getPrototypeOf(hull), runtime.EveSOFDataHull.prototype);
        assert.equal(hull.name, "ab1_t1");
    }
    finally { manager.Clear(); }
});
