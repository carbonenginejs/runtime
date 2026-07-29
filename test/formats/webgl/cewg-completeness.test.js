import assert from "node:assert/strict";
import test from "node:test";

import {
    isCewgComputeFragmentContract,
    isCewgDiagnosticIntegrityError,
    inspectCewgCoreChunks,
    inspectCewgPackageIntegrity,
    inspectCewgRasterCompleteness
} from "../../../src/formats/webgl/core/cewgCompleteness.js";

function stage(stageName, shaderKey, bodyKey = "body_1")
{
    const localKey = `Main.pass0.${stageName}`;
    const stageTypes = { vertex: 0, pixel: 1, compute: 2, geometry: 3, hull: 4, domain: 5 };
    return {
        key: `${bodyKey}.${localKey}`,
        bodyKey,
        localKey,
        techniqueName: "Main",
        passIndex: 0,
        stageName,
        stageType: stageTypes[stageName],
        shaderKey
    };
}

function shader(key, overrides = {})
{
    const stageName = key.startsWith("vs") ? "vertex"
        : key.startsWith("ps") ? "pixel"
            : key.startsWith("cs") ? "compute"
                : key.startsWith("gs") ? "geometry" : null;
    return {
        key,
        stageName,
        source: `#version 300 es\n// ${key}`,
        hlsl2webgl: { ok: true },
        bindings: [],
        stageInputs: [],
        stageOutputs: [],
        ...overrides
    };
}

test("CEWG completeness accepts translated vertex/pixel pairs", () =>
{
    const result = inspectCewgRasterCompleteness(
        [ stage("vertex", "vs"), stage("pixel", "ps") ],
        [ shader("vs"), shader("ps") ]
    );

    assert.deepEqual(result, {
        expectedPassCount: 1,
        completePassCount: 1,
        incompletePasses: []
    });
});

test("CEWG completeness reports absent and excluded raster stages", () =>
{
    const missing = inspectCewgRasterCompleteness(
        [ stage("vertex", "vs") ],
        [ shader("vs") ]
    );
    assert.deepEqual(missing.incompletePasses[0].missingStages, [ "pixel" ]);

    const excluded = inspectCewgRasterCompleteness(
        [ stage("vertex", "vs"), stage("pixel", "ps") ],
        [
            shader("vs"),
            shader("ps", {
                source: null,
                hlsl2webgl: { ok: false },
                excluded: { reason: "ld_uav_typed is not a WebGL2 raster operation" }
            })
        ]
    );
    assert.equal(excluded.completePassCount, 0);
    assert.equal(excluded.incompletePasses[0].unavailableStages[0].stageName, "pixel");
    assert.match(excluded.incompletePasses[0].unavailableStages[0].reason, /ld_uav_typed/);
});

test("CEWG completeness ignores standalone compute and geometry records", () =>
{
    const result = inspectCewgRasterCompleteness(
        [ stage("compute", "cs"), stage("geometry", "gs") ],
        [ shader("cs"), shader("gs") ]
    );

    assert.deepEqual(result, {
        expectedPassCount: 0,
        completePassCount: 0,
        incompletePasses: []
    });
});

test("CEWG completeness supports the legacy selected-only embedded shader shape", () =>
{
    const stages = [
        { ...stage("vertex", "vs"), ...shader("vs") },
        { ...stage("pixel", "ps"), ...shader("ps") }
    ];
    const result = inspectCewgRasterCompleteness(stages, undefined);

    assert.equal(result.expectedPassCount, 1);
    assert.equal(result.completePassCount, 1);
    assert.deepEqual(result.incompletePasses, []);
});

test("CEWG completeness rejects duplicate stages in one raster pass", () =>
{
    const result = inspectCewgRasterCompleteness(
        [
            stage("vertex", "vs-a"),
            { ...stage("vertex", "vs-b"), key: "body_1.Main.pass0.vertex.duplicate" },
            stage("pixel", "ps")
        ],
        [ shader("vs-a"), shader("vs-b"), shader("ps") ]
    );

    assert.equal(result.completePassCount, 0);
    assert.deepEqual(result.incompletePasses[0].duplicateStages, [ "vertex" ]);
});

test("CEWG integrity accepts one complete all-permutation body", () =>
{
    const vertex = stage("vertex", "vs");
    const pixel = stage("pixel", "ps");
    const data = packageGraph([ vertex, pixel ], [ shader("vs"), shader("ps") ]);
    const result = inspectCewgPackageIntegrity(data.info, data.metadata, data.glsl);

    assert.deepEqual(result, { ok: true, errors: [] });
});

test("CEWG integrity rejects declared partial packages and broken body graphs", () =>
{
    const vertex = stage("vertex", "vs");
    const pixel = stage("pixel", "ps");
    const data = packageGraph([ vertex, pixel ], [ shader("vs"), shader("ps") ]);
    data.info.excludedShaderCount = 1;
    data.glsl.variants[0].bodyKey = "body_missing";
    const result = inspectCewgPackageIntegrity(data.info, data.metadata, data.glsl);
    const codes = result.errors.map((entry) => entry.code);

    assert.equal(result.ok, false);
    assert.ok(codes.includes("declared_partial_package"));
    assert.ok(codes.includes("missing_variant_body"));
});

test("CEWG integrity rejects referenced bodies without runnable programs", () =>
{
    const data = packageGraph([], []);
    const result = inspectCewgPackageIntegrity(data.info, data.metadata, data.glsl);

    assert.ok(result.errors.some((entry) => entry.code === "variant_body_has_no_program"));
});

test("CEWG integrity rejects unsupported and unadapted native stages", () =>
{
    const geometry = stage("geometry", "gs");
    const compute = stage("compute", "cs", "body_2");
    const data = packageGraph(
        [ geometry, compute ],
        [ shader("gs"), shader("cs") ],
        [ "body_1", "body_2" ]
    );
    const result = inspectCewgPackageIntegrity(data.info, data.metadata, data.glsl);
    const codes = result.errors.map((entry) => entry.code);

    assert.ok(codes.includes("unsupported_stage"));
    assert.ok(codes.includes("unadapted_compute_stage"));
});

test("CEWG compute-fragment integrity requires the emitted host contract", () =>
{
    const contract = {
        threadGroup: [ 8, 8, 1 ],
        dispatchOriginUniform: "cewgDispatchOrigin",
        uavOutputs: [
            { register: 0, slice: null, location: 0, glslName: "cewgUav0" }
        ]
    };
    assert.equal(isCewgComputeFragmentContract(contract), true);
    assert.equal(isCewgComputeFragmentContract({ ...contract, dispatchOriginUniform: null }), true);
    assert.equal(isCewgComputeFragmentContract(true), false);
    assert.equal(isCewgComputeFragmentContract({ ...contract, uavOutputs: [] }), false);
    assert.equal(isCewgComputeFragmentContract({
        ...contract,
        uavOutputs: [
            ...contract.uavOutputs,
            { register: 1, slice: 0, location: 0, glslName: "cewgUav1" }
        ]
    }), false);

    const compute = stage("compute", "cs");
    const valid = packageGraph([ compute ], [ shader("cs", {
        computeFragment: contract,
        bindings: [
            { kind: "dispatchUniform", name: "cewgDispatchOrigin" },
            {
                kind: "uavTexture",
                registerIndex: 0,
                slice: null,
                location: 0,
                name: "cewgUav0"
            }
        ],
        source: [
            "#version 300 es",
            "uniform ivec3 cewgDispatchOrigin;",
            "layout(location = 0) out highp vec4 cewgUav0;",
            "void main() { cewgUav0 = vec4(1.0); }"
        ].join("\n")
    }) ]);
    assert.deepEqual(inspectCewgPackageIntegrity(valid.info, valid.metadata, valid.glsl), {
        ok: true,
        errors: []
    });

    const markerOnly = packageGraph([ compute ], [ shader("cs", { computeFragment: true }) ]);
    assert.ok(inspectCewgPackageIntegrity(markerOnly.info, markerOnly.metadata, markerOnly.glsl).errors
        .some((entry) => entry.code === "unadapted_compute_stage"));
});

test("CEWG integrity rejects permutation-table mismatches and duplicate keys", () =>
{
    const data = packageGraph(
        [ stage("vertex", "vs"), stage("pixel", "ps") ],
        [ shader("vs"), shader("ps") ]
    );
    data.metadata.variants[0].tableIndexMatchesPermutationIndex = false;
    data.glsl.shaders.push({ ...data.glsl.shaders[0] });
    data.info.uniqueShaderCount += 1;
    const result = inspectCewgPackageIntegrity(data.info, data.metadata, data.glsl);
    const codes = result.errors.map((entry) => entry.code);

    assert.ok(codes.includes("permutation_table_mismatch"));
    assert.ok(codes.includes("duplicate_shader_key"));
});

test("CEWG integrity requires variants and cross-correlates metadata", () =>
{
    const data = packageGraph(
        [ stage("vertex", "vs"), stage("pixel", "ps") ],
        [ shader("vs"), shader("ps") ]
    );
    data.glsl.variants = [];
    data.metadata.variants = [];
    data.info.permutationCount = 0;
    let codes = inspectCewgPackageIntegrity(data.info, data.metadata, data.glsl).errors
        .map((entry) => entry.code);
    assert.ok(codes.includes("missing_variants"));
    assert.ok(codes.includes("orphan_body"));

    const mismatch = packageGraph(
        [ stage("vertex", "vs"), stage("pixel", "ps") ],
        [ shader("vs"), shader("ps") ]
    );
    mismatch.metadata.variants[0].bodyKey = "body_other";
    codes = inspectCewgPackageIntegrity(mismatch.info, mismatch.metadata, mismatch.glsl).errors
        .map((entry) => entry.code);
    assert.ok(codes.includes("variant_metadata_mismatch"));
});

test("CEWG integrity rejects duplicate permutation indexes and invalid envelopes", () =>
{
    const stages = [
        stage("vertex", "vs1", "body_1"),
        stage("pixel", "ps1", "body_1"),
        stage("vertex", "vs2", "body_2"),
        stage("pixel", "ps2", "body_2")
    ];
    const data = packageGraph(
        stages,
        [ shader("vs1"), shader("ps1"), shader("vs2"), shader("ps2") ],
        [ "body_1", "body_2" ]
    );
    data.glsl.variants[1].permutationIndex = 0;
    data.metadata.variants[1].permutationIndex = 0;
    data.info.format = "wrong";
    data.info.packageKind = "wrong";
    data.info.failedShaderCount = -1;
    data.glsl.permutationMode = "selected";
    const codes = inspectCewgPackageIntegrity(data.info, data.metadata, data.glsl).errors
        .map((entry) => entry.code);

    assert.ok(codes.includes("duplicate_permutation_index"));
    assert.ok(codes.includes("invalid_package_envelope"));
    assert.ok(codes.includes("unsupported_package_kind"));
    assert.ok(codes.includes("invalid_declared_count"));
    assert.ok(codes.includes("package_mode_mismatch"));
});

test("CEWG integrity rejects shared-graph downgrades and filtered production scope", () =>
{
    const data = packageGraph(
        [ stage("vertex", "vs"), stage("pixel", "ps") ],
        [ shader("vs"), shader("ps") ]
    );
    delete data.glsl.shaders;
    let errors = inspectCewgPackageIntegrity(data.info, data.metadata, data.glsl).errors;
    assert.ok(errors.some((entry) => entry.code === "missing_graph_array"));

    const filtered = packageGraph(
        [ stage("vertex", "vs"), stage("pixel", "ps") ],
        [ shader("vs"), shader("ps") ]
    );
    filtered.info.selection.technique = "Main";
    filtered.glsl.selection.technique = "Main";
    errors = inspectCewgPackageIntegrity(filtered.info, filtered.metadata, filtered.glsl).errors;
    const scopeError = errors.find((entry) => entry.code === "filtered_package_scope");
    assert.equal(isCewgDiagnosticIntegrityError(scopeError), true);
    assert.equal(isCewgDiagnosticIntegrityError({ code: "duplicate_shader_key" }), false);
});

test("CEWG integrity validates vertex names and comparison sampler ABI", () =>
{
    const vertex = stage("vertex", "vs");
    const pixel = stage("pixel", "ps");
    const data = packageGraph([ vertex, pixel ], [
        shader("vs", {
            stageInputs: [ {
                register: 0,
                mask: 7,
                name: "wrongName",
                semanticName: "POSITION",
                semanticIndex: 0
            } ],
            source: "#version 300 es\nin highp vec3 actualName;\nvoid main() { gl_Position=vec4(actualName,1.0); }"
        }),
        shader("ps", {
            bindings: [ {
                kind: "resource",
                registerIndex: 4,
                name: "shadowMap",
                samplerType: "sampler2DShadow",
                comparison: false,
                samplerRegisterIndices: [ 2 ]
            } ],
            source: "#version 300 es\nuniform mediump sampler2DShadow shadowMap;\nout vec4 c;\nvoid main(){c=vec4(1.0);}"
        })
    ]);
    data.metadata.bodies[0].manifest.stages[0].pipelineInputs = [ {
        registerIndex: 0,
        usedMask: 7,
        usageName: "POSITION",
        usageIndex: 0
    } ];
    data.metadata.bodies[0].manifest.stages[1].bindings = [
        { kind: "resource", registerIndex: 4 },
        { kind: "sampler", registerIndex: 2, carbon: { sampler: { comparison: true } } }
    ];
    const codes = inspectCewgPackageIntegrity(data.info, data.metadata, data.glsl).errors
        .map((entry) => entry.code);

    assert.ok(codes.includes("vertex_input_declaration_mismatch"));
    assert.ok(codes.includes("comparison_sampler_contract_mismatch"));
});

test("CEWG vertex ABI accepts Carbon semantic aliases and signature-width masks", () =>
{
    const data = packageGraph(
        [ stage("vertex", "vs"), stage("pixel", "ps") ],
        [
            shader("vs", {
                stageInputs: [ {
                    register: 7,
                    mask: 15,
                    name: "in_BLENDWEIGHT0",
                    semanticName: "BLENDWEIGHT",
                    semanticIndex: 0
                } ],
                source: "#version 300 es\nin highp vec4 in_BLENDWEIGHT0;\nvoid main(){gl_Position=in_BLENDWEIGHT0;}"
            }),
            shader("ps")
        ]
    );
    data.metadata.bodies[0].manifest.stages[0].pipelineInputs = [ {
        registerIndex: 7,
        usedMask: 3,
        usageName: "BLENDWEIGHTS",
        usageIndex: 0
    } ];

    assert.deepEqual(inspectCewgPackageIntegrity(data.info, data.metadata, data.glsl), {
        ok: true,
        errors: []
    });
});

test("CEWG integrity requires exact permutation coverage and one stage family per pass", () =>
{
    const data = packageGraph(
        [ stage("vertex", "vs"), stage("pixel", "ps"), stage("compute", "cs") ],
        [ shader("vs"), shader("ps"), shader("cs") ]
    );
    data.metadata.permutations = [ {
        name: "QUALITY",
        options: [ "LOW", "HIGH" ],
        defaultOption: 0
    } ];
    const codes = inspectCewgPackageIntegrity(data.info, data.metadata, data.glsl).errors
        .map((entry) => entry.code);

    assert.ok(codes.includes("incomplete_permutation_coverage"));
    assert.ok(codes.includes("invalid_pass_stage_family"));
});

test("CEWG core chunk integrity rejects missing and duplicate runtime chunks", () =>
{
    assert.equal(inspectCewgCoreChunks([
        { tag: "INFO" }, { tag: "META" }, { tag: "GLSL" }
    ]).ok, true);
    const result = inspectCewgCoreChunks([
        { tag: "INFO" }, { tag: "INFO" }, { tag: "GLSL" }
    ]);
    assert.equal(result.ok, false);
    assert.deepEqual(result.errors.map((entry) => entry.tag), [ "INFO", "META" ]);
});

function packageGraph(stages, shaders, bodyKeys = [ "body_1" ])
{
    const bodies = bodyKeys.map((key) => ({
        key,
        error: null,
        stages: stages.filter((entry) => entry.bodyKey === key).map((entry) => entry.key)
    }));
    const variants = bodyKeys.map((bodyKey, index) => ({
        key: `variant_${index}`,
        permutationIndex: index,
        bodyKey
    }));
    const completeness = inspectCewgRasterCompleteness(stages, shaders);
    const excludedShaderCount = shaders.filter((entry) => entry.excluded).length;
    const failedShaderCount = shaders.filter((entry) => !entry.hlsl2webgl?.ok && !entry.excluded).length;
    const availableShaderCount = shaders.filter((entry) => entry.hlsl2webgl?.ok && entry.source).length;

    return {
        info: {
            format: "CEWG",
            formatVersion: 1,
            packageKind: "tr2-effect-webgl-permutations",
            permutationMode: "all",
            selection: { technique: null, pass: null, stage: null },
            sourceByteLength: 1,
            sourceMd5: "00000000000000000000000000000000",
            sourceSha256: "0000000000000000000000000000000000000000000000000000000000000000",
            sourceIdentity: {
                filePath: "fixture.sm_hi",
                logicalPath: null,
                game: null,
                client: null,
                build: null,
                byteLength: 1,
                md5: "00000000000000000000000000000000",
                sha256: "0000000000000000000000000000000000000000000000000000000000000000"
            },
            permutationCount: variants.length,
            uniqueBodyCount: bodies.length,
            bodyStageCount: stages.length,
            uniqueShaderCount: shaders.length,
            translatedShaderCount: shaders.length - failedShaderCount - excludedShaderCount,
            failedShaderCount,
            excludedShaderCount,
            failedBodyCount: bodies.filter((entry) => entry.error).length,
            availableShaderCount,
            expectedRasterPassCount: completeness.expectedPassCount,
            completeRasterPassCount: completeness.completePassCount,
            incompleteRasterPassCount: completeness.incompletePasses.length
        },
        metadata: {
            permutations: [],
            variants: variants.map((entry, index) => ({
                ...entry,
                tableIndexMatchesPermutationIndex: true,
                tableIndex: index
            })),
            bodies: bodies.map((body) => ({
                key: body.key,
                error: body.error,
                manifest: {
                    stages: stages.filter((entry) => entry.bodyKey === body.key).map((entry) => ({
                        techniqueName: entry.techniqueName,
                        passIndex: entry.passIndex,
                        stageType: entry.stageType,
                        stageName: entry.stageName,
                        pipelineInputs: []
                    }))
                }
            }))
        },
        glsl: {
            format: "CEWG_GLSL_SET",
            formatVersion: 1,
            permutationMode: "all",
            selection: { technique: null, pass: null, stage: null },
            variants,
            bodies,
            stages,
            shaders
        }
    };
}
