import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import CjsWebgpuFormat, { CjsWebgpuFormat as NamedCjsFormatWebgpu } from "../../../src/formats/webgpu/index.js";
import { buildCewgpuPackage, buildMinimalStagedEffectBytes } from "./synthetic.js";

class Package {}
class Resource {}

// The compiler is a format inside runtime-resource now, so its packageVersion
// is the emitted producer/format version, no longer the host manifest version.
const FORMAT_VERSION = "0.6.0";

const SAMPLE_CHUNKS = [
    [ "INFO", { format: "CEWGPU", formatVersion: 1, analyzer: "dxbc-phase1" } ],
    [ "META", { effectName: "quadv5", stages: [] } ],
    [ "ANLS", {
        format: "CEWGPU_ANALYSIS",
        formatVersion: 1,
        stages: [ { key: "Main.pass0.vertex", stageName: "vertex" } ]
    } ]
];

function sampleBytes()
{
    return buildCewgpuPackage(SAMPLE_CHUNKS);
}

test("package root exports one public class", async () =>
{
    const mod = await import("../../../src/formats/webgpu/index.js");

    assert.deepEqual(Object.keys(mod).sort(), [ "CjsWebgpuFormat", "default" ]);
    assert.equal(mod.default, CjsWebgpuFormat);
    assert.equal(mod.CjsWebgpuFormat, CjsWebgpuFormat);
    assert.equal(NamedCjsFormatWebgpu, CjsWebgpuFormat);
});

test("reader exposes the expected public profile API", () =>
{
    assert.deepEqual(Object.getOwnPropertyNames(CjsWebgpuFormat.prototype).sort(), [
        "AnalyzeEffect",
        "BuildEffect",
        "BuildShaderIr",
        "BuildWgsl",
        "BuildWgslBindingPlan",
        "BuildWgslSet",
        "Build",
        "GetClass",
        "GetValues",
        "HasClass",
        "Inspect",
        "Read",
        "SetClass",
        "SetClasses",
        "SetValues",
        "ToJSON",
        "constructor"
    ].sort());
});

test("reader manages values and classes", () =>
{
    const reader = new CjsWebgpuFormat({
        classes: { Package },
        source: "profile",
        decodeInstructions: false
    }).SetClass("Resource", Resource);

    assert.equal(reader.HasClass("Package"), true);
    assert.equal(reader.HasClass("Resource"), true);
    assert.equal(reader.GetClass("Package"), Package);
    assert.equal(reader.GetValues().emit, CjsWebgpuFormat.OUTPUT_JSON);
    assert.equal(reader.GetValues().source, "profile");
    assert.equal(reader.GetValues().decodeInstructions, false);
});

test("implemented metadata advertises the package surface", () =>
{
    assert.deepEqual(CjsWebgpuFormat.mediaTypes, [ "shader" ]);
    assert.deepEqual(CjsWebgpuFormat.inputTypes, [ "cewgpu" ]);
    assert.deepEqual(CjsWebgpuFormat.outputTypes, [ "json" ]);
    assert.deepEqual(CjsWebgpuFormat.debugOutputTypes, [ "raw" ]);
    assert.equal(CjsWebgpuFormat.implementationStatus, "partial");
    assert.equal(CjsWebgpuFormat.format, "CEWGPU");
    assert.equal(CjsWebgpuFormat.analysisFormat, "CEWGPU_ANALYSIS");
    assert.equal(CjsWebgpuFormat.packageVersion, "0.6.0");
    assert.equal(CjsWebgpuFormat.packageVersion, FORMAT_VERSION);
});

test("static read and instance Read share one code path", () =>
{
    const bytes = sampleBytes();
    const fromStatic = CjsWebgpuFormat.read(bytes, { source: "synthetic" });
    const fromInstance = new CjsWebgpuFormat({ source: "synthetic" }).Read(bytes);
    assert.deepEqual(fromStatic, fromInstance);
});

test("json emit parses INFO/META/ANLS chunks and lists stage records", () =>
{
    const result = CjsWebgpuFormat.read(sampleBytes(), { source: "synthetic" });

    assert.equal(result.format, "CEWGPU");
    assert.equal(result.version, 1);
    assert.deepEqual(result.chunks.map((chunk) => chunk.tag), [ "INFO", "META", "ANLS" ]);
    assert.equal(result.info.analyzer, "dxbc-phase1");
    assert.equal(result.metadata.effectName, "quadv5");
    assert.equal(result.analysis.format, "CEWGPU_ANALYSIS");
    assert.equal(result.stages.length, 1);
    assert.equal(result.stages[0].key, "Main.pass0.vertex");
    assert.equal(typeof JSON.stringify(result), "string");
});

test("raw emit exposes the CewgpuPackage instance", () =>
{
    const pkg = CjsWebgpuFormat.read(sampleBytes(), { emit: CjsWebgpuFormat.OUTPUT_RAW });

    assert.equal(pkg.constructor.name, "CewgpuPackage");
    assert.equal(pkg.IsGood(), true);
    assert.equal(pkg.info.formatVersion, 1);
    assert.equal(pkg.metadata.effectName, "quadv5");
    assert.equal(pkg.analysisJson.stages[0].key, "Main.pass0.vertex");
});

test("inspect summarizes without building the full JSON shape", () =>
{
    const summary = CjsWebgpuFormat.inspect(sampleBytes());

    assert.equal(summary.isCewgpu, true);
    assert.equal(summary.version, 1);
    assert.deepEqual(summary.chunks.map((chunk) => chunk.tag), [ "INFO", "META", "ANLS" ]);
    assert.equal(summary.stageCount, 1);
    assert.equal(summary.shaderCount, 0);
    assert.equal("info" in summary, false);
});

test("isCewgpu sniffs the magic and rejects junk", () =>
{
    assert.equal(CjsWebgpuFormat.isCewgpu(sampleBytes()), true);
    assert.equal(CjsWebgpuFormat.isCewgpu(new Uint8Array([ 1, 2, 3 ])), false);
    assert.equal(CjsWebgpuFormat.isCewgpu(new TextEncoder().encode("GARBAGE!")), false);
});

test("Read rejects a payload with a bad magic", () =>
{
    assert.throws(() => CjsWebgpuFormat.read(new TextEncoder().encode("NOPE1234")), /CjsWebgpuReadError|Invalid CEWGPU magic/);
});

test("toJSON converts typed arrays and nested structures", () =>
{
    const converted = CjsWebgpuFormat.toJSON({
        tokens: new Uint32Array([ 1, 2 ]),
        nested: [ { mask: new Uint8Array([ 3 ]) } ]
    });
    assert.deepEqual(converted, { tokens: [ 1, 2 ], nested: [ { mask: [ 3 ] } ] });
});

test("analyzeEffect decodes real parser stage bytes without embedding them", () =>
{
    const analysis = CjsWebgpuFormat.analyzeEffect(buildMinimalStagedEffectBytes());
    const stage = analysis.stages[0];

    assert.equal(stage.key, "Main.pass0.vertex");
    assert.equal(stage.shaderBytecode.bytes, undefined);
    assert.equal(stage.dxbc.program.programTypeName, "vertex");
    assert.equal(stage.ir.format, "CJS_SHADER_IR");
});

test("buildEffect exposes structurally qualified selected-body CEWGPU packaging", () =>
{
    const source = buildMinimalStagedEffectBytes({ version: 15 });
    const result = CjsWebgpuFormat.buildEffect(source, {
        source: "res:/graphics/effect.dx11/synthetic.sm_hi",
        sourceIdentity: {
            logicalPath: "res:/graphics/effect.dx11/synthetic.sm_hi",
            game: "Eve",
            build: "3430261",
            md5: "00000000000000000000000000000000",
            sha256: createHash("sha256").update(source).digest("hex")
        }
    });

    assert.equal(CjsWebgpuFormat.isCewgpu(result.bytes), true);
    assert.equal(result.info.formatVersion, 3);
    assert.equal(result.info.targetBackend, "webgpu");
    assert.equal(result.info.backendPackage, "@carbonenginejs/format-webgpu");
    assert.equal(
        result.info.backendPackageVersion,
        CjsWebgpuFormat.packageVersion
    );
    assert.equal(result.info.translator, "dxbc-js-wgsl");
    assert.equal(result.info.translatorVersion, CjsWebgpuFormat.packageVersion);
    assert.match(result.info.permutationGraph.sha256, /^[0-9a-f]{64}$/u);
    assert.deepEqual(result.info.permutationGraph, {
        chunk: "PGRF",
        format: "CJS_EFFECT_PERMUTATION_GRAPH",
        formatVersion: 1,
        sha256: result.info.permutationGraph.sha256,
        permutationCount: 1,
        uniqueBodyCount: 1
    });
    assert.equal(result.info.sourceIdentity.build, "3430261");
    assert.equal(
        result.info.sourceIdentity.sha256,
        createHash("sha256").update(source).digest("hex")
    );
    assert.equal(result.qualification.ok, true);
    assert.equal(result.qualification.level, "structural");
    assert.equal(result.qualification.validator, "cewgpu-structural");
    assert.equal(result.qualification.mode, "selected");
    assert.equal(result.qualification.packageValid, true);
    assert.equal(result.qualification.sourceComplete, true);
    assert.equal(result.qualification.backendComplete, false);
    assert.equal(result.qualification.runtimeComplete, false);
    assert.equal(result.qualification.nativeComparison, false);
    assert.equal(result.info.bodyMode, "selected");
    assert.deepEqual(result.info.completeness, {
        packageValid: true,
        sourceComplete: true,
        backendComplete: false,
        runtimeComplete: false
    });
    for (const field of Object.keys(result.info.completeness))
    {
        assert.equal(result.info.completeness[field], result.qualification[field]);
    }
    assert.equal(result.metadata.bodyMode, "selected");
    assert.equal(result.permutationGraph.coverage.permutations, "complete");
    assert.equal(result.permutationGraph.coverage.bodies, "identity-only");
    assert.equal(result.permutationGraph.coverage.reflection, "absent");
    assert.equal(result.permutationGraph.variants.length, 1);
    assert.equal(result.permutationGraph.bodies.length, 1);
    assert.equal(result.info.selectedStageCount, 1);
    assert.equal(result.analysis.stages[0].key, "Main.pass0.vertex");
    assert.equal(result.analysis.stages[0].shaderBytecode.bytes, undefined);
    assert.equal(result.analysis.stages[0].dxbc, null);
    assert.equal(result.analysis.stages[0].ir, null);
    assert.equal(result.wgsl.shaders.length, 1);
    assert.equal(result.inspection.shaderCount, 1);
    assert.equal(result.inspection.permutationCount, 1);
    assert.equal(result.inspection.uniqueBodyCount, 1);
    const packaged = CjsWebgpuFormat.read(result.bytes);
    assert.deepEqual(packaged.info.sourceIdentity, result.info.sourceIdentity);
    assert.equal(packaged.info.bodyMode, "selected");
    assert.deepEqual(packaged.info.completeness, result.info.completeness);
    assert.equal(packaged.metadata.bodyMode, "selected");

    const distinctIdentity = CjsWebgpuFormat.buildEffect(source, {
        source: "diagnostic-label",
        sourceIdentity: {
            logicalPath: "res:/graphics/effect.dx11/synthetic.sm_hi"
        }
    });
    assert.equal(distinctIdentity.info.sourcePath, "diagnostic-label");
    assert.equal(
        distinctIdentity.info.sourceIdentity.logicalPath,
        "res:/graphics/effect.dx11/synthetic.sm_hi"
    );

    const compatibilityResult = CjsWebgpuFormat.buildEffect(source, {
        allPermutations: false
    });
    assert.equal(compatibilityResult.info.bodyMode, "selected");
});

test("version 15 buildEffect exposes source-complete selected-backend coverage", () =>
{
    const result = CjsWebgpuFormat.buildEffect(
        buildMinimalStagedEffectBytes({ version: 15 }),
        { source: "synthetic.sm_depth" }
    );

    assert.equal(result.info.formatVersion, 3);
    assert.equal(result.info.sourceBodyCoverage, "all-unique");
    assert.equal(result.info.backendBodyCoverage, "selected");
    assert.equal(result.info.bodyMode, "selected");
    assert.deepEqual(result.info.completeness, {
        packageValid: true,
        sourceComplete: true,
        backendComplete: false,
        runtimeComplete: false
    });
    assert.equal(result.qualification.sourceComplete, true);
    assert.equal(result.qualification.backendComplete, false);
    assert.equal(result.qualification.runtimeComplete, false);
    assert.equal(result.reflection.formatVersion, 2);
    assert.equal(result.reflection.coverage.bodies, "all-unique");
    assert.equal(result.info.effectReflection.bodyCount, 1);
    assert.match(result.info.permutationGraph.sha256, /^[0-9a-f]{64}$/u);
    assert.match(result.info.effectReflection.sha256, /^[0-9a-f]{64}$/u);
});

test("buildEffect rejects a caller source hash that disagrees with its exact bytes", () =>
{
    assert.throws(
        () => CjsWebgpuFormat.buildEffect(buildMinimalStagedEffectBytes(), {
            sourceIdentity: { sha256: "0".repeat(64) }
        }),
        /sourceIdentity\.sha256 does not match/
    );
});

test("instance BuildEffect honors reusable source and permutation values", () =>
{
    const source = buildMinimalStagedEffectBytes({ version: 15 });
    const profile = new CjsWebgpuFormat({
        source: "profile.sm_hi",
        permutation: [ { name: "UNKNOWN", value: "ON" } ]
    });

    assert.throws(
        () => profile.BuildEffect(source),
        /Unknown effect permutation axis UNKNOWN/
    );

    const result = profile.BuildEffect(source, { permutation: [] });
    assert.equal(result.info.sourcePath, "profile.sm_hi");
});

test("buildEffect gates all-body packaging on complete source reflection", () =>
{
    // Version 8-14 inputs carry no portable reflection, so there is no
    // validated unique-body inventory to translate against.
    assert.throws(
        () => CjsWebgpuFormat.buildEffect(
            buildMinimalStagedEffectBytes(),
            { mode: "all" }
        ),
        /requires a version-15 compiled effect, got version 8/u
    );
    assert.throws(
        () => CjsWebgpuFormat.buildEffect(
            buildMinimalStagedEffectBytes(),
            { allPermutations: true }
        ),
        /requires a version-15 compiled effect, got version 8/u
    );
    assert.throws(
        () => CjsWebgpuFormat.buildEffect(
            buildMinimalStagedEffectBytes(),
            { allPermutations: "false" }
        ),
        /allPermutations compatibility option must be boolean/u
    );
    assert.throws(
        () => CjsWebgpuFormat.buildEffect(
            buildMinimalStagedEffectBytes(),
            { mode: "partial" }
        ),
        /supported modes are selected and all/u
    );
});
