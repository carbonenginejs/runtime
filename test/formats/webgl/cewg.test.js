import test from "node:test";
import assert from "node:assert/strict";

import CjsWebglFormat from "../../../src/formats/webgl/index.js";
import { buildCewgPackage } from "./synthetic.js";

test("static build and instance Build share one code path", () =>
{
    const chunks = [
        [ "INFO", { format: "CEWG", formatVersion: 1, stageCount: 2 } ],
        [ "META", { effectName: "quadv5", stages: [] } ]
    ];

    const fromStatic = CjsWebglFormat.build(chunks);
    const fromInstance = new CjsWebglFormat().Build(chunks);
    assert.deepEqual(Array.from(fromStatic), Array.from(fromInstance));
});

test("Build assembles a package that Read parses back with matching chunk tags/JSON", () =>
{
    const bytes = CjsWebglFormat.build([
        [ "INFO", { format: "CEWG", formatVersion: 1, stageCount: 2 } ],
        [ "META", { effectName: "quadv5", stages: [ { techniqueName: "Main" } ] } ],
        [ "GLSL", {
            format: "CEWG_GLSL_SET",
            formatVersion: 1,
            stages: [
                { key: "Main.pass0.vertex", shaderKey: "dxbc_v1" },
                { key: "Main.pass0.pixel", shaderKey: "dxbc_p1" }
            ],
            shaders: [
                { key: "dxbc_v1", stageName: "vertex", source: "#version 300 es\nvoid main(){gl_Position=vec4(0.0);}\n" },
                { key: "dxbc_p1", stageName: "pixel", source: "#version 300 es\nvoid main(){}\n" }
            ]
        } ]
    ]);

    const result = CjsWebglFormat.read(bytes, { source: "quadv5.cewg" });

    assert.equal(result.format, "CEWG");
    assert.equal(result.version, 1);
    assert.equal(result.sourcePath, "quadv5.cewg");
    assert.deepEqual(result.chunks.map((chunk) => chunk.tag), [ "INFO", "META", "GLSL" ]);
    assert.equal(result.info.stageCount, 2);
    assert.equal(result.metadata.effectName, "quadv5");
    assert.equal(result.metadata.stages[0].techniqueName, "Main");
    assert.equal(result.glsl.format, "CEWG_GLSL_SET");
    assert.equal(result.shaders.length, 2);
    assert.deepEqual(result.shaders.map((shader) => shader.key), [ "dxbc_v1", "dxbc_p1" ]);

    const summary = CjsWebglFormat.inspect(bytes);
    assert.equal(summary.version, 1);
    assert.equal(summary.shaderCount, 2);
    assert.equal(summary.stageCount, 2);
});

test("Build accepts string and raw-byte chunk payloads (single-stage package shape)", () =>
{
    const bytes = CjsWebglFormat.build([
        [ "INFO", { format: "CEWG", formatVersion: 1, shaderType: 35632 } ],
        [ "GLSL", "#version 300 es\nvoid main(){}\n" ],
        [ "DXBC", Uint8Array.from([ 0x44, 0x58, 0x42, 0x43 ]) ]
    ]);

    const raw = CjsWebglFormat.read(bytes, { emit: CjsWebglFormat.OUTPUT_RAW });
    assert.equal(raw.info.shaderType, 35632);
    assert.match(raw.glsl, /#version 300 es/);
    assert.equal(raw.glslJson, null);
    assert.equal(raw.dxbc[0], 0x44);

    const json = CjsWebglFormat.read(bytes);
    assert.match(json.glsl, /#version 300 es/);
    assert.deepEqual(json.shaders, []);
});

test("buildCewgPackage cross-checks against CewgPackageBuilder's own encoding", () =>
{
    const chunks = [ [ "INFO", { a: 1 } ], [ "META", { b: 2 } ] ];
    const viaBuilder = CjsWebglFormat.build(chunks);
    const viaRawHelper = buildCewgPackage(chunks);
    assert.deepEqual(Array.from(viaBuilder), Array.from(viaRawHelper));
});

test("isCewg magic sniff rejects non-CEWG and truncated junk", () =>
{
    assert.equal(CjsWebglFormat.isCewg(CjsWebglFormat.build([ [ "INFO", { ok: true } ] ])), true);
    assert.equal(CjsWebglFormat.isCewg(new Uint8Array(0)), false);
    assert.equal(CjsWebglFormat.isCewg(new TextEncoder().encode("CE")), false);
    assert.equal(CjsWebglFormat.isCewg(new TextEncoder().encode("RIFFxxxx")), false);
});

test("Read rejects an unsupported CEWG version", () =>
{
    const bytes = buildCewgPackage([]);
    // Overwrite the version field immediately after the package magic.
    const view = new DataView(bytes.buffer);
    view.setUint32("CEWG".length, 99, true);
    assert.throws(() => CjsWebglFormat.read(bytes), /Unsupported CEWG version 99/);
});
