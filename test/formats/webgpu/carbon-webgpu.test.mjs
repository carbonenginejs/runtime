import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";


import { readContainer } from "./support/readContainer.js";
import CjsWebgpuFormat from "../../../src/formats/webgpu/index.js";
import { validateEffectContainer } from "../../../src/formats/webgpu/core/carbonWebgpu/validateContainer.js";
import { buildEffectAnalysis } from "../../../src/formats/webgpu/core/helpers.js";
import {
    buildEffectPermutationGraph,
    validateEffectPermutationGraph
} from "../../../src/format/effect/effectPermutationGraph.js";
import {
    buildEffectBytes,
    buildMinimalStagedEffectBytes,
    buildMinimalVertexDxbc
} from "./synthetic.js";

function uniformLayoutBinding(overrides = {})
{
    return {
        identity: "uniform-buffer:0:0",
        scopeIdentity: "uniform-buffer:0:0@vertex",
        resourceKind: "uniform-buffer",
        generatedSymbol: "cb0",
        registerSpace: 0,
        registerIndex: 0,
        group: 0,
        binding: 0,
        visibility: [ "vertex" ],
        type: "array<vec4<f32>, 1>",
        buffer: {
            type: "uniform",
            hasDynamicOffset: false,
            minBindingSize: 16
        },
        ...overrides
    };
}

function textureLayoutBinding(overrides = {})
{
    return {
        identity: "sampled-resource:0:0",
        scopeIdentity: "sampled-resource:0:0@vertex",
        resourceKind: "sampled-resource",
        generatedSymbol: "t0",
        registerSpace: 0,
        registerIndex: 0,
        group: 0,
        binding: 0,
        visibility: [ "vertex" ],
        type: "texture_2d<f32>",
        texture: {
            sampleType: "float",
            viewDimension: "2d",
            multisampled: false
        },
        ...overrides
    };
}

function samplerCarbon()
{
    return {
        name: null,
        sampler: {
            comparison: false,
            minFilter: 0,
            magFilter: 0,
            mipFilter: 0,
            addressU: 0,
            addressV: 0,
            addressW: 0,
            mipLODBias: 0,
            maxAnisotropy: 1,
            comparisonFunc: 0,
            borderColor: [ 0, 0, 0, 0 ],
            minLOD: 0,
            maxLOD: 0,
            isDynamic: true
        }
    };
}

function resourceCarbon(name = "Resource")
{
    return {
        name,
        type: 0,
        arrayElements: 1,
        isSRGB: false,
        isAutoregister: false
    };
}

function analysisBinding(overrides = {})
{
    return {
        kind: "resource",
        generatedSymbol: "t0",
        registerIndex: 0,
        registerType: 36,
        registerSpace: 0,
        registerCount: 1,
        arrayCount: 1,
        dynamic: true,
        metadataName: null,
        carbon: null,
        annotations: [],
        heapView: false,
        sourceTruth: "carbon-stage-register",
        ...overrides
    };
}

test("effect permutation graph preserves mixed-radix variants and body aliases", () =>
{
    const source = Uint8Array.from([
        1, 2, 3,
        1, 2, 3,
        4, 5, 6
    ]);
    const graph = buildEffectPermutationGraph({
        m_data: source,
        m_permutations: [
            {
                name: "A",
                options: [ "A0", "A1" ],
                defaultOption: 1,
                description: "first",
                type: 2
            },
            {
                name: "B",
                options: [ "B0", "B1" ],
                defaultOption: 0,
                description: "second",
                type: 3
            }
        ],
        m_offsetCount: 4,
        m_offsets: [
            { index: 0, offset: 0, size: 3, end: 3 },
            { index: 1, offset: 0, size: 3, end: 3 },
            { index: 2, offset: 3, size: 3, end: 6 },
            { index: 3, offset: 6, size: 3, end: 9 }
        ]
    });

    assert.equal(graph.format, "CJS_EFFECT_PERMUTATION_GRAPH");
    assert.equal(graph.formatVersion, 1);
    assert.deepEqual(graph.variants.map((variant) => variant.optionIndices), [
        [ 0, 0 ],
        [ 1, 0 ],
        [ 0, 1 ],
        [ 1, 1 ]
    ]);
    assert.deepEqual(graph.variants.map((variant) => variant.bodyKey), [
        "body0",
        "body0",
        "body0",
        "body1"
    ]);
    assert.equal(graph.bodies.length, 2);
    assert.equal(
        graph.bodies[0].sha256,
        createHash("sha256").update(Uint8Array.from([ 1, 2, 3 ])).digest("hex")
    );
    assert.equal(
        graph.bodies[1].sha256,
        createHash("sha256").update(Uint8Array.from([ 4, 5, 6 ])).digest("hex")
    );
    assert.deepEqual(validateEffectPermutationGraph(graph), {
        permutationCount: 4,
        uniqueBodyCount: 2
    });

    const wrongIndex = structuredClone(graph);
    wrongIndex.variants[1].permutationIndex = 2;
    assert.throws(
        () => validateEffectPermutationGraph(wrongIndex),
        /variant 1 is malformed/
    );

    const wrongTuple = structuredClone(graph);
    wrongTuple.variants[2].optionIndices = [ 1, 0 ];
    assert.throws(
        () => validateEffectPermutationGraph(wrongTuple),
        /variant 2 is malformed/
    );

    const missingReference = structuredClone(graph);
    missingReference.variants = missingReference.variants.map((variant) => ({
        ...variant,
        bodyKey: "body0"
    }));
    assert.throws(
        () => validateEffectPermutationGraph(missingReference),
        /body body1 is unreferenced/
    );

    const partialOverlap = structuredClone(graph);
    partialOverlap.variants[3].sourceRecord.offset = 5;
    assert.throws(
        () => validateEffectPermutationGraph(partialOverlap),
        /source body records partially overlap/
    );

    assert.throws(
        () => validateEffectPermutationGraph(graph, { sourceByteLength: 8 }),
        /source record is malformed/
    );

    const unsafeSourceRecord = structuredClone(graph);
    unsafeSourceRecord.variants[3].sourceRecord.offset = Number.MAX_SAFE_INTEGER;
    assert.throws(
        () => validateEffectPermutationGraph(unsafeSourceRecord),
        /source record is malformed/
    );

    const duplicateDigest = structuredClone(graph);
    duplicateDigest.bodies[1].sha256 = duplicateDigest.bodies[0].sha256;
    assert.throws(
        () => validateEffectPermutationGraph(duplicateDigest),
        /body 1 is malformed or duplicated/
    );

    const oversizedBody = structuredClone(graph);
    oversizedBody.bodies[1].byteLength = 0x100000000;
    assert.throws(
        () => validateEffectPermutationGraph(oversizedBody),
        /body 1 is malformed/
    );

    const danglingBody = structuredClone(graph);
    danglingBody.variants[3].bodyKey = "missing";
    assert.throws(
        () => validateEffectPermutationGraph(danglingBody),
        /variant 3 is malformed/
    );

    const tooManyAxes = structuredClone(graph);
    tooManyAxes.axes = Array.from({ length: 256 }, (_, index) => ({
        index,
        name: `A${index}`,
        options: [ "ON" ],
        defaultOption: 0,
        description: "",
        type: 0
    }));
    assert.throws(
        () => validateEffectPermutationGraph(tooManyAxes),
        /axes must be an array/
    );

    const tooManyOptions = structuredClone(graph);
    tooManyOptions.axes = [ {
        index: 0,
        name: "A",
        options: Array.from({ length: 256 }, (_, index) => `O${index}`),
        defaultOption: 0,
        description: "",
        type: 0
    } ];
    assert.throws(
        () => validateEffectPermutationGraph(tooManyOptions),
        /axis 0 is malformed/
    );

    const tooManyPermutations = structuredClone(graph);
    tooManyPermutations.axes = [ 41, 40, 40 ].map((count, index) => ({
        index,
        name: `A${index}`,
        options: Array.from({ length: count }, (_, optionIndex) => `O${optionIndex}`),
        defaultOption: 0,
        description: "",
        type: 0
    }));
    assert.throws(
        () => validateEffectPermutationGraph(tooManyPermutations),
        /implementation limit 65536/
    );

    const maximumNativeRange = {
        format: "CJS_EFFECT_PERMUTATION_GRAPH",
        formatVersion: 1,
        coverage: {
            permutations: "complete",
            bodies: "identity-only",
            reflection: "absent"
        },
        axes: [],
        variants: [ {
            permutationIndex: 0,
            optionIndices: [],
            bodyKey: "body0",
            sourceRecord: {
                offset: 0xFFFFFFFF,
                byteLength: 0xFFFFFFFF
            }
        } ],
        bodies: [ {
            key: "body0",
            byteLength: 0xFFFFFFFF,
            sha256: "0".repeat(64)
        } ]
    };
    assert.deepEqual(validateEffectPermutationGraph(maximumNativeRange, {
        sourceByteLength: 0x1FFFFFFFE
    }), {
        permutationCount: 1,
        uniqueBodyCount: 1
    });

    assert.throws(
        () => buildEffectPermutationGraph({
            m_data: source,
            m_permutations: [],
            m_offsetCount: 1,
            m_offsets: [ { index: 7, offset: 0, size: 3, end: 3 } ]
        }),
        /invalid source body record/
    );

    assert.throws(
        () => buildEffectPermutationGraph({
            m_data: source,
            m_permutations: [ {
                name: "A",
                options: [ "A0", "A1" ],
                defaultOption: 0,
                description: "",
                type: 0
            } ],
            m_offsetCount: 2,
            m_offsets: [
                { index: 0, offset: 0, size: 6, end: 6 },
                { index: 1, offset: 3, size: 6, end: 9 }
            ]
        }),
        /source body records partially overlap/
    );
});

/*
 * The chunk-package tests stood here: roughly 1,750 lines across nineteen cases,
 * including a fifty-nine case reconciliation table.
 *
 * They are deleted rather than retargeted, and the audit that decided so is
 * worth restating, because "we deleted the tests" and "we removed the checks"
 * look identical in a diff.
 *
 * Those cases guarded one thing, and it was not a Carbon concept: that a single
 * logical tree, which the chunk container shattered into flat string-keyed
 * arrays across INFO, META, ANLS, WGSL, PGRF, RFLX and WGSB, still reassembled.
 * Each chunk held a projection of the same effect, and the checks asserted the
 * projections agreed -- INFO counts against PGRF topology, META selection
 * against ANLS scope, RFLX pointers against RBLB bytes, WGSB bodies against
 * PGRF bodies.
 *
 * A record layout makes that question unaskable rather than answering it.
 * Containment replaces reference, position replaces key, and the count word
 * before an array replaces Array.isArray. There is one document, so there is
 * nothing left to disagree, and a check that cannot fail on our own files is
 * exactly what this port set out to remove.
 *
 * What genuinely survived the audit did not stay here:
 *
 * - byte-level soundness -- caps, arena containment, offset-table density,
 *   Rule 1 exhaustiveness -- is phase 1's, in carbon-effect.test.js;
 * - the emitter/reader oracle over real effects is in carbon-webgpu-container.test.js;
 * - the derived analysis view is diffed against the source-derived analysis in
 *   carbon-analysis-adapter.test.mjs, and over every shipped permutation in
 *   carbon-analysis-adapter-corpus.test.mjs;
 * - the Carbon-implied clauses that are load-bearing -- duplicate stage type in
 *   a pass, stage-type range -- fail closed in the shape adapter, where a
 *   runtime description is actually built.
 *
 * What remains below is what this file still owns: that the public build path
 * emits a container, that reading it back gives the derived views, and that the
 * WebGPU-specific restriction is enforced in the backend layer where it belongs.
 */

test("buildEffect emits a container that reads back through the derived views", () =>
{
    const result = CjsWebgpuFormat.buildEffect(buildMinimalStagedEffectBytes({ version: 15 }), {
        source: "synthetic.sm_hi"
    });

    // Stock Carbon v15 from byte 0: no envelope, no magic, no version of ours.
    assert.equal(new DataView(result.bytes.buffer, result.bytes.byteOffset).getUint32(0, true), 15);

    const read = CjsWebgpuFormat.read(result.bytes, { source: "synthetic.sm_hi" });
    assert.equal(read.format, "CARBON_WEBGPU");
    assert.equal(read.version, 15);
    assert.equal(read.analysis.format, "CARBON_WEBGPU_ANALYSIS");
    assert.deepEqual(
        read.shaders.map((shader) => shader.key),
        result.wgsl.shaders.map((shader) => shader.key),
        "the derived WGSL view must expose what the emitter wrote"
    );
    assert.deepEqual(
        read.stages.map((stage) => stage.key),
        result.analysis.stages.map((stage) => stage.key),
        "the derived analysis view must expose the same stages the packager saw"
    );
});

test("the derived analysis view carries the engine's whole read surface", () =>
{
    // engine-webgpu reads this view and nothing else, and one field in it fails
    // silently: carbon.constants[] packs real cb0 material bytes, and a view that
    // omits it does not throw on read -- it reaches packMaterial's fail-closed
    // branch only when something actually draws.
    const result = CjsWebgpuFormat.buildEffect(buildMinimalStagedEffectBytes({ version: 15 }), {
        source: "synthetic.sm_hi"
    });
    const read = CjsWebgpuFormat.read(result.bytes, { source: "synthetic.sm_hi" });

    const stage = read.analysis.stages.find((entry) => entry.key === "Main.pass0.vertex");
    assert.ok(stage, "the fixture must carry a Main.pass0.vertex stage");

    for (const binding of stage.bindings)
    {
        assert.ok("metadataName" in binding);
        assert.ok("heapView" in binding);
        assert.ok(Array.isArray(binding.annotations));
        assert.ok("carbon" in binding);

        if (binding.kind !== "constantBuffer") continue;

        // The synthesised carbonPayload branch: all three fields computed, none
        // copied. `hasLocalConstants: undefined` is what a field-copying adapter
        // produces, and it is invisible until a draw.
        assert.equal(typeof binding.carbon.hasLocalConstants, "boolean");
        assert.equal(typeof binding.carbon.constantValueSize, "number");
        assert.ok(Array.isArray(binding.carbon.constants));
    }
});

test("the backend layer rejects a program WebGPU cannot express", () =>
{
    // The container admits all six of Carbon's stage types by design -- a
    // container that admitted three would not be Carbon's container. The
    // restriction belongs to the backend, so it is enforced on read here rather
    // than narrowed on the wire.
    const result = CjsWebgpuFormat.buildEffect(buildMinimalStagedEffectBytes({ version: 15 }), {
        source: "synthetic.sm_hi"
    });
    const container = readContainer(result.bytes);

    const description = container.GetDescription(0);
    const stage = description.techniques[0].passes[0].stages[0];
    assert.ok(stage.shaderData.size > 0, "the fixture stage must carry a program");

    // Geometry, which Carbon numbers 3 and WebGPU cannot express.
    stage.type = 3;
    assert.throws(
        () => validateEffectContainer(container, { source: "synthetic.sm_hi" }),
        /WebGPU cannot express/u
    );

    // Negative control: the same stage type with NO program is legitimate --
    // 107 shipped body-passes carry a geometry stage, and dropping them would
    // remove source truth the container is the only remaining home for.
    stage.shaderData = { ...stage.shaderData, size: 0 };
    validateEffectContainer(container, { source: "synthetic.sm_hi" });
});

test("AnalyzeEffect resolves exact permutation assertions even when the body cannot decode", () =>
{
    const bytes = buildEffectBytes({
        permutations: [
            {
                name: "QUALITY",
                description: "Quality selector",
                defaultOption: 0,
                options: [ "LOW", "HIGH" ]
            }
        ],
        bodies: [ { size: 1 }, { size: 1 } ]
    });

    const analysis = CjsWebgpuFormat.analyzeEffect(bytes, {
        source: "synthetic.sm_hi",
        permutation: [ { name: "QUALITY", value: "HIGH" } ]
    });

    assert.equal(analysis.format, "CARBON_WEBGPU_ANALYSIS");
    assert.equal(analysis.source, "synthetic.sm_hi");
    assert.equal(analysis.bodyIndex, 1);
    assert.deepEqual(analysis.selectedOptions.map((entry) => [ entry.name, entry.value, entry.source ]), [
        [ "QUALITY", "HIGH", "local" ]
    ]);
    assert.deepEqual(analysis.stages, []);

    const fromMap = CjsWebgpuFormat.analyzeEffect(bytes, {
        permutation: new Map([ [ "QUALITY", "HIGH" ] ])
    });
    assert.equal(fromMap.bodyIndex, 1);

    const withDefault = CjsWebgpuFormat.analyzeEffect(bytes);
    assert.equal(withDefault.bodyIndex, 0);
    assert.equal(withDefault.selectedOptions[0].value, "LOW");
    assert.equal(withDefault.selectedOptions[0].source, "default");

    assert.throws(
        () => CjsWebgpuFormat.analyzeEffect(bytes, {
            permutation: [ { name: "UNKNOWN", value: "HIGH" } ]
        }),
        /Unknown effect permutation axis UNKNOWN/
    );
    assert.throws(
        () => CjsWebgpuFormat.analyzeEffect(bytes, {
            permutation: [ { name: "QUALITY", value: "INVALID" } ]
        }),
        /requested INVALID but resolved LOW/
    );
    assert.throws(
        () => CjsWebgpuFormat.analyzeEffect(bytes, {
            permutation: [
                { name: "QUALITY", value: "HIGH" },
                { name: "QUALITY", value: "HIGH" }
            ]
        }),
        /duplicates axis QUALITY/
    );
    assert.throws(
        () => CjsWebgpuFormat.analyzeEffect(bytes, {
            permutation: [ { name: "QUALITY", value: 1 } ]
        }),
        /Requested effect permutation is malformed/
    );
    assert.throws(
        () => CjsWebgpuFormat.analyzeEffect(bytes, {
            permutation: { QUALITY: "HIGH" }
        }),
        /must be an array or Map/
    );
});

test("buildEffectAnalysis normalizes manifest stages and decodes DXBC", () =>
{
    const dxbc = buildMinimalVertexDxbc();

    const analysis = buildEffectAnalysis({
        effectRes: {
            sourcePath: "synthetic.sm_hi",
            m_version: 8,
            m_compilerVersion: null
        },
        selection: {
            bodyIndex: 0,
            selectedOptions: []
        },
        effectDescription: {
            version: 8,
            effectName: "fixture"
        },
        bindingManifest: {
            toJSON()
            {
                return {
                    effectName: "fixture",
                    version: 8,
                    passes: [ {
                        techniqueName: "Main",
                        passIndex: 0,
                        renderStates: 0,
                        states: []
                    } ],
                    stages: [ {
                        techniqueName: "Main",
                        passIndex: 0,
                        stageType: 0,
                        stageName: "vertex",
                        shaderHandle: 12,
                        shaderBytecode: {
                            stageType: 0,
                            stageName: "vertex",
                            shaderSize: dxbc.length,
                            stringTableOffset: 0,
                            effectName: "fixture",
                            bytes: Array.from(dxbc)
                        },
                        pipelineInputs: [ { usage: "POSITION", registerIndex: 0 } ],
                        threadGroupSize: null,
                        bindings: []
                    } ]
                };
            }
        }
    }, {
        source: "synthetic.sm_hi",
        decodeInstructions: false
    });

    assert.equal(analysis.format, "CARBON_WEBGPU_ANALYSIS");
    assert.equal(analysis.effectName, "fixture");
    assert.equal(analysis.passes.length, 1);
    assert.equal(analysis.stages.length, 1);
    assert.equal(analysis.stages[0].key, "Main.pass0.vertex");
    assert.equal(analysis.stages[0].shaderBytecode.bytes, undefined);
    assert.equal(analysis.stages[0].dxbc.program.programTypeName, "vertex");
    assert.equal(analysis.stages[0].dxbc.instructions, null);
    assert.equal(analysis.stages[0].dxbcError, null);
    assert.equal(analysis.stages[0].ir, null);
    assert.equal(analysis.stages[0].irError, null);

    const withIr = buildEffectAnalysis({
        effectRes: { m_version: 8, m_compilerVersion: 1 },
        effectDescription: { version: 8, effectName: "fixture" },
        selection: { bodyIndex: 0, selectedOptions: [] },
        bindingManifest: {
            toJSON()
            {
                return {
                    effectName: "fixture",
                    version: 8,
                    passes: [],
                    stages: [ {
                        techniqueName: "Main",
                        passIndex: 0,
                        stageType: 0,
                        stageName: "vertex",
                        shaderBytecode: { bytes: Array.from(dxbc) },
                        bindings: []
                    } ]
                };
            }
        }
    }, { source: "synthetic.sm_hi", decodeInstructions: true });
    assert.equal(withIr.stages[0].shaderBytecode.bytes, undefined);
    assert.equal(withIr.stages[0].ir.format, "CJS_SHADER_IR");
    assert.equal(withIr.stages[0].ir.stage, "vertex");
    assert.equal(withIr.stages[0].irError, null);
});

test("buildEffectAnalysis validates transient raw stage identity and bytes", () =>
{
    const dxbc = buildMinimalVertexDxbc();
    const padded = new Uint8Array(dxbc.length + 4);
    padded.set(dxbc, 2);
    const activeBytes = padded.subarray(2, 2 + dxbc.length);
    const manifestStage = {
        techniqueName: "Main",
        passIndex: 0,
        stageType: 0,
        stageName: "vertex",
        shaderBytecode: {
            stageType: 0,
            stageName: "vertex",
            shaderSize: dxbc.length
        },
        bindings: []
    };
    const resolved = {
        effectRes: { m_version: 8, m_compilerVersion: 1 },
        effectDescription: { version: 8, effectName: "fixture" },
        selection: { bodyIndex: 0, selectedOptions: [] },
        bindingManifest: {
            toJSON()
            {
                return {
                    effectName: "fixture",
                    version: 8,
                    passes: [],
                    stages: [ manifestStage ]
                };
            }
        },
        stageBytecodeByKey: new Map([ [
            "Main.pass0.vertex",
            { stageType: 0, stageName: "vertex", bytes: activeBytes }
        ] ])
    };

    const analysis = buildEffectAnalysis(resolved, { decodeInstructions: false });
    assert.equal(analysis.stages[0].dxbc.program.programTypeName, "vertex");
    assert.equal(analysis.stages[0].shaderBytecode.bytes, undefined);

    const mismatchedType = {
        ...resolved,
        stageBytecodeByKey: new Map([ [
            "Main.pass0.vertex",
            { stageType: 1, stageName: "vertex", bytes: activeBytes }
        ] ])
    };
    assert.throws(
        () => buildEffectAnalysis(mismatchedType),
        /manifest and raw stage metadata disagree/
    );

    const mismatchedName = {
        ...resolved,
        stageBytecodeByKey: new Map([ [
            "Main.pass0.pixel",
            {
                techniqueName: "Main",
                passIndex: 0,
                stageType: 0,
                stageName: "pixel",
                bytes: activeBytes
            }
        ] ])
    };
    assert.throws(
        () => buildEffectAnalysis(mismatchedName),
        /manifest and raw stage metadata disagree/
    );

    const invalidInnerType = {
        ...resolved,
        bindingManifest: {
            toJSON()
            {
                return {
                    effectName: "fixture",
                    version: 8,
                    passes: [],
                    stages: [ {
                        ...manifestStage,
                        shaderBytecode: {
                            ...manifestStage.shaderBytecode,
                            stageType: "0"
                        }
                    } ]
                };
            }
        }
    };
    assert.throws(
        () => buildEffectAnalysis(invalidInnerType),
        /manifest stage bytecode type is invalid/
    );

    const conflictingBytes = {
        ...resolved,
        bindingManifest: {
            toJSON()
            {
                return {
                    effectName: "fixture",
                    version: 8,
                    passes: [],
                    stages: [ {
                        ...manifestStage,
                        shaderBytecode: {
                            ...manifestStage.shaderBytecode,
                            bytes: [ ...dxbc.slice(0, -1), dxbc.at(-1) ^ 0xff ]
                        }
                    } ]
                };
            }
        }
    };
    assert.throws(
        () => buildEffectAnalysis(conflictingBytes),
        /manifest and raw stage bytecode disagree/
    );

    const compactManifestOnly = {
        ...resolved,
        stageBytecodeByKey: null,
        bindingManifest: {
            toJSON()
            {
                return {
                    effectName: "fixture",
                    version: 8,
                    passes: [],
                    stages: [ {
                        ...manifestStage,
                        shaderBytecode: {
                            ...manifestStage.shaderBytecode,
                            bytes: Array.from(dxbc)
                        }
                    } ]
                };
            }
        }
    };
    const compact = buildEffectAnalysis(compactManifestOnly, {
        decodeBytecode: false,
        decodeInstructions: false
    });
    assert.equal(compact.stages[0].shaderBytecode.bytes, undefined);
    assert.equal(compact.stages[0].dxbc, null);
    assert.equal(compact.stages[0].ir, null);

    const invalidManifestBytes = {
        ...resolved,
        stageBytecodeByKey: null,
        bindingManifest: {
            toJSON()
            {
                return {
                    effectName: "fixture",
                    version: 8,
                    passes: [],
                    stages: [ {
                        ...manifestStage,
                        shaderBytecode: {
                            ...manifestStage.shaderBytecode,
                            bytes: [ 0, 256 ]
                        }
                    } ]
                };
            }
        }
    };
    assert.throws(
        () => buildEffectAnalysis(invalidManifestBytes),
        /must contain only byte values/
    );
});


// The emitted container is Carbon v15 and says so. `info.formatVersion` is the
// version of the info DOCUMENT (3 at the time of writing) and is routinely
// mistaken for the container version, so the container version is stated
// separately and pinned here against the byte that actually goes on the wire.
//
// The reader accepts 8..15; the writer emits 15 only. A consumer must be able to
// learn which one it was handed without re-reading the file, and a v15 reader
// elsewhere - ccpwgl's Tw2Shader, Carbon itself - needs it before it parses.
test("the emitted package states its Carbon container version, and it matches the wire", () =>
{
    const source = buildMinimalStagedEffectBytes({ version: 15 });
    const built = CjsWebgpuFormat.buildEffect(source, { source: "graphics/effect.webgpu/pin.sm_hi" });

    assert.equal(built.info.containerVersion, 15);
    assert.equal(built.metadata.containerVersion, 15);

    const wireVersion = new DataView(
        built.bytes.buffer,
        built.bytes.byteOffset,
        built.bytes.byteLength
    ).getUint32(0, true);
    assert.equal(wireVersion, built.info.containerVersion);

    // Not the info document's own version. These are different numbers and
    // conflating them is the mistake this test exists to catch.
    assert.notEqual(built.info.formatVersion, built.info.containerVersion);
});


// The version is a parameter, not a constant. The point is that adding a future
// version means adding branches plus one entry in CARBON_EFFECT_WRITE_VERSIONS,
// not re-plumbing every caller — so the plumbing is pinned here even though only
// one version is currently writable.
//
// The failure this guards is the tempting one: accepting a version we have no
// branches for and emitting the v15 shape under its number, producing a file
// that lies about itself.
test("the container version is a parameter, and an unwritable one is refused", () =>
{
    const source = buildMinimalStagedEffectBytes({ version: 15 });
    const wireVersionOf = (bytes) => new DataView(
        bytes.buffer,
        bytes.byteOffset,
        bytes.byteLength
    ).getUint32(0, true);

    // Asking for the version we can write is honoured, not merely tolerated.
    const explicit = CjsWebgpuFormat.buildEffect(source, {
        source: "graphics/effect.webgpu/pin.sm_hi",
        version: 15
    });
    assert.equal(explicit.info.containerVersion, 15);
    assert.equal(wireVersionOf(explicit.bytes), 15);

    // Omitting it defaults to the same thing, byte for byte.
    const defaulted = CjsWebgpuFormat.buildEffect(source, {
        source: "graphics/effect.webgpu/pin.sm_hi"
    });
    assert.deepEqual(defaulted.bytes, explicit.bytes);

    // A version the reader accepts but the writer has no branches for must be
    // refused, NOT silently emitted as v15. 14 is readable and unwritable, which
    // is exactly the case that would otherwise produce a mislabelled file.
    assert.throws(
        () => CjsWebgpuFormat.buildEffect(source, {
            source: "graphics/effect.webgpu/pin.sm_hi",
            version: 14
        }),
        /Cannot write Carbon effect container version 14/
    );

    // And a version that does not exist at all.
    assert.throws(
        () => CjsWebgpuFormat.buildEffect(source, {
            source: "graphics/effect.webgpu/pin.sm_hi",
            version: 16
        }),
        /Cannot write Carbon effect container version 16/
    );
});
