// Required external-fixture proof, run explicitly with npm run test:bundle.
// No private asset bytes or machine paths ship in this repository.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { test } from "node:test";
import * as runtime from "../../npm/dist/carbonenginejs.min.js";
// Readers are opt-in subpaths, absent from the package root. Use their strictly
// minified test builds only to decode bytes. The SHIPPED DictReader performs
// all class construction and field population using its own declarations.
import { CjsBlackFormat } from "../../.cache/minified-test/dist/resource/formats/black/index.js";
import { CjsRedFormat } from "../../.cache/minified-test/dist/resource/formats/red/index.js";

async function fixture(variable)
{
    assert.ok(process.env[variable], `${variable} must name a real resource; no synthetic fallback`);
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

test("shipped minified bundle constructs a real operator-authored Red material", async () =>
{
    const bytes = await fixture("CJS_BUNDLE_RED_FILE");
    assert.equal(createHash("sha256").update(bytes).digest("hex"), "6aa2a20809597f2be71caa42b9ffce67489ac389ddfbf54ca398a58425abac4b");
    const payload = CjsRedFormat.readPayload(bytes.toString("utf8"));
    const result = { root: new runtime.DictReader({ declarations: true }).CreateObject(payload.object) };
    assert.equal(Object.getPrototypeOf(result.root), runtime.EveSOFDataMaterial.prototype);
    assert.equal(result.root.name, "reference_white");
    assert.equal(result.root.parameters.length, 4);
    for (const parameter of result.root.parameters)
        assert.equal(Object.getPrototypeOf(parameter), runtime.EveSOFDataParameter.prototype);
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
