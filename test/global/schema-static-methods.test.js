import assert from "node:assert/strict";
import test from "node:test";
import { transformSync } from "@babel/core";
import decoratorsPlugin from "@babel/plugin-proposal-decorators";
import { exposure as be } from "#be";
import { CjsSchema, meta } from "../../src/blue/schema/index.js";

// A static method is a method record like any other: decorateMethod finds it on the constructor, not the prototype.

test("decorateMethod records a static method as a method, with its metadata and exposure", () =>
{
    class StaticCall
    {
        static Estimate() { return 1; }
        Instance() { return 2; }
    }
    CjsSchema.decorateMethod(StaticCall, "Estimate", be.mapMethodAndWrap(), meta.note("static"));
    CjsSchema.decorateMethod(StaticCall, "Instance", meta.note("instance"));
    be.define("StaticCall")(StaticCall);

    const row = CjsSchema.getMethod(StaticCall, "Estimate");
    assert.equal(row.impl.note, "static");
    assert.equal(row.exposure.macro, "MAP_METHOD_AND_WRAP");
    assert.equal(CjsSchema.getMethod(StaticCall, "Instance").impl.note, "instance");
    assert.equal(CjsSchema.getSchema(StaticCall).fields.some(field => field.name === "Estimate"), false, "no field record");
});

test("a decorated static method records the same row as the imperative call", async () =>
{
    const beUrl = new URL("../../src/blue/blueexposure/be.js", import.meta.url).href;
    const schemaUrl = new URL("../../src/blue/schema/index.js", import.meta.url).href;
    const header = `import { exposure as be } from ${JSON.stringify(beUrl)}; import { meta } from ${JSON.stringify(schemaUrl)};\n`;
    const code = transformSync(header + `
      @be.define("StaticDecorated")
      export class StaticDecorated { @be.mapMethodAndWrap() @meta.note("static") static Estimate() { return 1; } }`,
    { configFile: false, babelrc: false, plugins: [ [ decoratorsPlugin, { version: "2023-11" } ] ] }).code;
    const { StaticDecorated } = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
    const row = CjsSchema.getMethod(StaticDecorated, "Estimate");
    assert.equal(row.impl.note, "static");
    assert.equal(row.exposure.macro, "MAP_METHOD_AND_WRAP");
});
