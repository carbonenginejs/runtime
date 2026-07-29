import test from "node:test";
import assert from "node:assert/strict";

import CjsWebglFormat, { CjsWebglFormat as NamedCjsFormatWebgl } from "../../../src/formats/webgl/index.js";
import { buildCewgPackage } from "./synthetic.js";

const SAMPLE_CHUNKS = [
    [ "INFO", { format: "CEWG", formatVersion: 1, translator: "dxbc-js-emitter" } ],
    [ "META", { effectName: "quadv5", stages: [] } ],
    [ "GLSL", {
        format: "CEWG_GLSL_SET",
        formatVersion: 1,
        stages: [ { key: "Main.pass0.vertex", shaderKey: "dxbc_abc" } ],
        shaders: [ { key: "dxbc_abc", stageName: "vertex", source: "#version 300 es\nvoid main(){}\n" } ]
    } ]
];

function sampleBytes()
{
    return buildCewgPackage(SAMPLE_CHUNKS);
}

test("package root exports one public class", async () =>
{
    const mod = await import("../../../src/formats/webgl/index.js");

    assert.deepEqual(Object.keys(mod).sort(), [ "CjsWebglFormat", "default" ].sort());
    assert.equal(mod.default, CjsWebglFormat);
    assert.equal(mod.CjsWebglFormat, CjsWebglFormat);
    assert.equal(NamedCjsFormatWebgl, CjsWebglFormat);
});

test("static read and instance Read share one code path", () =>
{
    const bytes = sampleBytes();
    const fromStatic = CjsWebglFormat.read(bytes, { source: "synthetic" });
    const fromInstance = new CjsWebglFormat({ source: "synthetic" }).Read(bytes);
    assert.deepEqual(fromStatic, fromInstance);
});

test("json emit parses INFO/META/GLSL chunks and lists shader records", () =>
{
    const result = CjsWebglFormat.read(sampleBytes(), { source: "synthetic" });

    assert.equal(result.format, "CEWG");
    assert.equal(result.version, 1);
    assert.deepEqual(result.chunks.map((chunk) => chunk.tag), [ "INFO", "META", "GLSL" ]);
    assert.equal(result.info.translator, "dxbc-js-emitter");
    assert.equal(result.metadata.effectName, "quadv5");
    assert.equal(result.glsl.format, "CEWG_GLSL_SET");
    assert.equal(result.shaders.length, 1);
    assert.equal(result.shaders[0].key, "dxbc_abc");
    assert.equal(typeof JSON.stringify(result), "string");
});

test("raw emit exposes the CewgPackage instance", () =>
{
    const pkg = CjsWebglFormat.read(sampleBytes(), { emit: CjsWebglFormat.OUTPUT_RAW });

    assert.equal(pkg.constructor.name, "CewgPackage");
    assert.equal(pkg.IsGood(), true);
    assert.equal(pkg.GetJson("INFO").format, "CEWG");
    assert.equal(pkg.info.formatVersion, 1);
    assert.equal(pkg.metadata.effectName, "quadv5");
    assert.equal(pkg.glslJson.shaders[0].key, "dxbc_abc");
});

test("inspect summarizes without building the full JSON shape", () =>
{
    const summary = CjsWebglFormat.inspect(sampleBytes());

    assert.equal(summary.isCewg, true);
    assert.equal(summary.version, 1);
    assert.deepEqual(summary.chunks.map((chunk) => chunk.tag), [ "INFO", "META", "GLSL" ]);
    assert.equal(summary.shaderCount, 1);
    assert.equal(summary.stageCount, 1);
    assert.equal("info" in summary, false);
});

test("isCewg sniffs the magic and rejects junk", () =>
{
    assert.equal(CjsWebglFormat.isCewg(sampleBytes()), true);
    assert.equal(CjsWebglFormat.isCewg(new Uint8Array([ 1, 2, 3 ])), false);
    assert.equal(CjsWebglFormat.isCewg(new TextEncoder().encode("GARBAGE!")), false);
});

test("read rejects a payload with a bad magic", () =>
{
    assert.throws(() => CjsWebglFormat.read(new TextEncoder().encode("NOPE1234")), /CjsWebglReadError|Invalid CEWG magic/);
});

test("profiles hold values and reject invalid emits/unknown options", () =>
{
    const reader = new CjsWebglFormat({ emit: CjsWebglFormat.OUTPUT_RAW, source: "profile" });
    assert.equal(reader.GetValues().emit, CjsWebglFormat.OUTPUT_RAW);
    assert.equal(reader.GetValues({ source: "override" }).source, "override");
    assert.equal(reader.GetValues().source, "profile");
    assert.throws(() => new CjsWebglFormat({ emit: "nonsense" }), /emit must be/);
    assert.throws(() => new CjsWebglFormat({ bogus: true }), /unknown option/);
});

test("toJSON converts typed arrays and nested structures", () =>
{
    const converted = CjsWebglFormat.toJSON({
        tokens: new Uint32Array([ 1, 2 ]),
        nested: [ { mask: new Uint8Array([ 3 ]) } ]
    });
    assert.deepEqual(converted, { tokens: [ 1, 2 ], nested: [ { mask: [ 3 ] } ] });
});
