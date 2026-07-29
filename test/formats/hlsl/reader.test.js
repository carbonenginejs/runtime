import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { CjsHlslFormat } from "../../../src/formats/hlsl/index.js";
import { readEffectAnalysis } from "../../../src/formats/hlsl/core/analysis.js";
import { HlslEffectBindingManifest } from "../../../src/formats/hlsl/core/tr2/shader/HlslEffectBindingManifest.js";
import { HlslRenderContextEnum } from "../../../src/formats/hlsl/core/tr2/HlslRenderContextEnum.js";
import { emitEffectMetadata } from "../../../src/formats/hlsl/core/metadata.js";
import { buildEffectBytes } from "./synthetic.js";

test("static read and instance Read share one code path", () =>
{
    const bytes = buildEffectBytes();
    const fromStatic = CjsHlslFormat.read(bytes, { source: "synthetic" });
    const fromInstance = new CjsHlslFormat({ source: "synthetic" }).Read(bytes);
    assert.deepEqual(fromStatic, fromInstance);
});

test("json emit is the documented plain effect graph", () =>
{
    const bytes = buildEffectBytes({
        permutations: [ {
            name: "BLEND_MODE",
            description: "Blend mode selector",
            defaultOption: 0,
            options: [ "OPAQUE", "TRANSPARENT" ]
        } ]
    });
    const result = CjsHlslFormat.read(bytes, { source: "synthetic" });

    assert.equal(result.version, 8);
    assert.equal(result.bodyCount, 1);
    assert.equal(result.loadError, null);
    assert.deepEqual(result.permutations.map((entry) => entry.name), [ "BLEND_MODE" ]);
    assert.deepEqual(result.permutations[0].options, [ "OPAQUE", "TRANSPARENT" ]);
    // The synthetic body is zero-length, so the default permutation cannot
    // be decoded into an effect description; the graph reports that plainly.
    assert.equal(result.effect, null);
    // JSON-compatible end to end
    assert.equal(typeof JSON.stringify(result), "string");
});

test("raw emit exposes the live HlslEffectRes graph", () =>
{
    const result = CjsHlslFormat.read(buildEffectBytes(), { emit: CjsHlslFormat.OUTPUT_RAW });

    assert.equal(result.constructor.name, "HlslEffectRes");
    assert.equal(result.IsGood(), true);
    assert.equal(result.m_version, 8);
});

test("Inspect summarizes the default permutation without a full JSON conversion", () =>
{
    const summary = CjsHlslFormat.inspect(buildEffectBytes(), { source: "synthetic" });

    assert.equal(summary.version, 8);
    assert.equal(summary.isGood, true);
    assert.equal(summary.permutationCount, 0);
    assert.equal(summary.bodyCount, 1);
    // The synthetic body is zero-length, so the default permutation cannot
    // be decoded into a HlslShader; Inspect reports that gracefully.
    assert.deepEqual(summary.techniques, []);
    assert.equal(summary.effectName, null);
});

test("metadata emit reports selected permutation options without shader bytecode", () =>
{
    const bytes = buildEffectBytes({
        permutations: [
            {
                name: "BLEND_MODE",
                description: "Blend mode selector",
                defaultOption: 1,
                options: [ "OPAQUE", "TRANSPARENT" ]
            },
            {
                name: "QUALITY",
                description: "Quality selector",
                defaultOption: 0,
                options: [ "LOW", "HIGH" ]
            }
        ],
        bodies: [ { size: 0 }, { size: 0 }, { size: 0 }, { size: 0 } ]
    });

    const defaults = CjsHlslFormat.read(bytes, {
        emit: CjsHlslFormat.OUTPUT_METADATA,
        source: "synthetic"
    });
    assert.equal(defaults.bodyCount, 4);
    assert.equal(defaults.bodyIndex, 1);
    assert.deepEqual(defaults.selectedOptions.map((entry) => [ entry.name, entry.value, entry.source ]), [
        [ "BLEND_MODE", "TRANSPARENT", "default" ],
        [ "QUALITY", "LOW", "default" ]
    ]);
    assert.equal(defaults.effect, null);

    const selected = new CjsHlslFormat({
        emit: CjsHlslFormat.OUTPUT_METADATA,
        source: "synthetic"
    }).Read(bytes, {
        permutation: new Map([
            [ "BLEND_MODE", "OPAQUE" ],
            [ "QUALITY", "HIGH" ]
        ])
    });
    assert.equal(selected.bodyIndex, 2);
    assert.deepEqual(selected.selectedOptions.map((entry) => [ entry.name, entry.value, entry.source ]), [
        [ "BLEND_MODE", "OPAQUE", "local" ],
        [ "QUALITY", "HIGH", "local" ]
    ]);
});

test("readEffectAnalysis resolves one permutation without changing stable emits", () =>
{
    const bytes = buildEffectBytes({
        permutations: [
            {
                name: "BLEND_MODE",
                description: "Blend mode selector",
                defaultOption: 1,
                options: [ "OPAQUE", "TRANSPARENT" ]
            },
            {
                name: "QUALITY",
                description: "Quality selector",
                defaultOption: 0,
                options: [ "LOW", "HIGH" ]
            }
        ],
        bodies: [ { size: 0 }, { size: 0 }, { size: 0 }, { size: 0 } ]
    });

    const analysis = readEffectAnalysis(bytes, {
        source: "synthetic",
        permutation: new Map([
            [ "BLEND_MODE", "OPAQUE" ],
            [ "QUALITY", "HIGH" ]
        ])
    });

    assert.equal(analysis.effectRes.constructor.name, "HlslEffectRes");
    assert.equal(analysis.shader, null);
    assert.equal(analysis.effectDescription, null);
    assert.equal(analysis.bindingManifest, null);
    assert.equal(analysis.selection.bodyIndex, 2);
    assert.deepEqual(analysis.selection.selectedOptions.map((entry) => [ entry.name, entry.value, entry.source ]), [
        [ "BLEND_MODE", "OPAQUE", "local" ],
        [ "QUALITY", "HIGH", "local" ]
    ]);
});

test("metadata projection includes shader bindings and omits runtime-heavy fields", () =>
{
    const stageInput = {
        m_exists: true,
        m_constantValueSize: 64,
        constants: [ {
            name: "WorldViewProjection",
            offset: 0,
            size: 64,
            type: 0,
            dimension: 4,
            elements: 1,
            isSRGB: false,
            isAutoregister: true
        } ],
        resources: new Map([ [ 0, {
            name: "DiffuseMap",
            type: 2,
            arrayElements: 1,
            isSRGB: true,
            isAutoregister: false
        } ] ]),
        samplers: new Map([ [ 0, {
            name: "LinearSampler",
            sampler: {
                isDynamic: true,
                comparison: false,
                minFilter: 1,
                magFilter: 1,
                mipFilter: 1,
                addressU: 1,
                addressV: 1,
                addressW: 1,
                mipLODBias: 0,
                maxAnisotropy: 0,
                comparisonFunc: 0,
                borderColor: [ 0, 0, 0, 0 ],
                minLOD: 0,
                maxLOD: 0
            }
        } ] ]),
        uavs: new Map(),
        annotation: [],
        signature: {
            pipelineInputs: [ { usage: "POSITION", registerIndex: 0 } ],
            registers: [ { name: "$LocalConstants", registerIndex: 0 } ],
            samplers: [ { name: "LinearSampler", registerIndex: 0 } ],
            threadGroupSize: { x: 1, y: 1, z: 1 }
        },
        constantValues: new Uint8Array([ 1, 2, 3, 4 ]),
        cjsShaderBytecode: { bytes: new Uint8Array([ 5, 6, 7, 8 ]) }
    };

    const result = emitEffectMetadata(
        {
            m_version: 8,
            m_compilerVersion: null,
            sourcePath: "fixture.sm_hi",
            m_offsetCount: 1,
            m_permutations: [],
            loadError: null
        },
        {
            GetEffectDescription: () => ({
                version: 8,
                effectName: "fixture",
                techniques: [ {
                    name: "Main",
                    shaderTypeMask: 1,
                    passes: [ {
                        shaderTypeMask: 1,
                        cjsRenderStateSetup: {
                            entries: [
                                { key: 22, value: 3 },
                                { key: 168, value: 0 },
                                { key: 175, value: 1065353216 }
                            ]
                        },
                        stageInputs: [ stageInput ],
                        renderStates: 123
                    } ],
                    libraries: []
                } ],
                annotations: new Map(),
                readError: null
            })
        },
        { bodyIndex: 0, selectedOptions: [] }
    );

    const pass = result.effect.techniques[0].passes[0];
    const stage = pass.stageInputs[0];
    assert.deepEqual(pass.renderStates, [
        { key: 22, name: "RS_CULLMODE", value: 3, valueName: "CULL_CCW" },
        { key: 168, name: "RS_COLORWRITEENABLE", value: 0, valueName: "NONE", valueFlags: [] },
        { key: 175, name: "RS_SLOPESCALEDEPTHBIAS", value: 1065353216, valueFloat: 1 }
    ]);
    assert.equal(stage.bytecode, undefined);
    assert.equal(stage.constantValues, undefined);
    assert.equal(stage.constants[0].name, "WorldViewProjection");
    assert.equal(stage.resources[0].name, "DiffuseMap");
    assert.equal(stage.samplers[0].name, "LinearSampler");
    assert.deepEqual(stage.signature.pipelineInputs, [ { usage: "POSITION", registerIndex: 0 } ]);
    assert.equal(typeof JSON.stringify(result), "string");
});

test("binding manifest retains stage bytecode for advanced tooling", () =>
{
    const manifest = HlslEffectBindingManifest.fromEffectDescription({
        version: 8,
        effectName: "fixture",
        techniques: [ {
            name: "Main",
            shaderTypeMask: 1,
            passes: [ {
                renderStates: 123,
                cjsRenderStateSetup: {
                    entries: []
                },
                resourceSetDesc: {
                    heapViews: [
                        {
                            kind: "srv",
                            stageType: HlslRenderContextEnum.VERTEX_SHADER,
                            registerIndex: 0
                        }
                    ]
                },
                stageInputs: [ {
                    m_exists: true,
                    m_shader: 77,
                    m_constantValueSize: 16,
                    constants: [ {
                        name: "World",
                        offset: 0,
                        size: 16,
                        type: 0,
                        dimension: 4,
                        elements: 1,
                        isSRGB: false,
                        isAutoregister: true
                    } ],
                    resources: new Map([ [ 0, {
                        name: "DiffuseMap",
                        type: HlslRenderContextEnum.TEX_TYPE_2D,
                        arrayElements: 1,
                        isSRGB: true,
                        isAutoregister: false
                    } ] ]),
                    samplers: new Map([ [ 0, {
                        name: "LinearSampler",
                        sampler: {
                            isDynamic: true,
                            comparison: false,
                            minFilter: 1,
                            magFilter: 1,
                            mipFilter: 1,
                            addressU: 1,
                            addressV: 1,
                            addressW: 1,
                            mipLODBias: 0,
                            maxAnisotropy: 0,
                            comparisonFunc: 0,
                            borderColor: [ 0, 0, 0, 0 ],
                            minLOD: 0,
                            maxLOD: 0
                        }
                    } ] ]),
                    uavs: new Map(),
                    signature: {
                        pipelineInputs: [ { usage: "POSITION", registerIndex: 0 } ],
                        registers: [
                            {
                                registerType: 0,
                                registerIndex: 0,
                                registerSpace: 0,
                                registerCount: 1,
                                arrayCount: 1,
                                dynamic: false
                            },
                            {
                                registerType: 32,
                                registerIndex: 0,
                                registerSpace: 0,
                                registerCount: 1,
                                arrayCount: 1,
                                dynamic: false
                            },
                            {
                                registerType: 1,
                                registerIndex: 0,
                                registerSpace: 0,
                                registerCount: 1,
                                arrayCount: 1,
                                dynamic: false
                            }
                        ],
                        samplers: [ { name: "LinearSampler", registerIndex: 0 } ],
                        threadGroupSize: null
                    },
                    cjsShaderBytecode: {
                        toJSON()
                        {
                            return {
                                stageType: HlslRenderContextEnum.VERTEX_SHADER,
                                stageName: "vertex",
                                shaderSize: 4,
                                stringTableOffset: 0,
                                effectName: "fixture",
                                bytes: [ 5, 6, 7, 8 ]
                            };
                        }
                    }
                } ]
            } ],
            libraries: []
        } ],
        annotations: new Map([
            [ "DiffuseMap", [ { toJSON: () => ({ label: "albedo" }) } ] ]
        ]),
        readError: null
    });

    const json = manifest.toJSON();
    assert.equal(json.stages.length, 1);
    assert.equal(json.stages[0].shaderBytecode.effectName, "fixture");
    assert.deepEqual(json.stages[0].shaderBytecode.bytes, [ 5, 6, 7, 8 ]);
    assert.equal(manifest.resolve({
        techniqueName: "Main",
        passIndex: 0,
        stageType: HlslRenderContextEnum.VERTEX_SHADER,
        symbol: "cb0"
    }).metadataName, "$LocalConstants");
    assert.equal(manifest.resolve({
        techniqueName: "Main",
        passIndex: 0,
        stageType: HlslRenderContextEnum.VERTEX_SHADER,
        symbol: "t0"
    }).heapView, true);
});

test("binding manifest retains SM 5.1 static samplers omitted from signature registers", () =>
{
    const sampler = {
        comparison: false,
        minFilter: 1,
        magFilter: 1,
        mipFilter: 1,
        addressU: 1,
        addressV: 1,
        addressW: 1,
        mipLODBias: 0,
        maxAnisotropy: 16,
        comparisonFunc: 0,
        borderColor: 0,
        minLOD: 0,
        maxLOD: Number.MAX_VALUE
    };
    const manifest = HlslEffectBindingManifest.fromEffectDescription({
        version: 13,
        effectName: "sm51-static-sampler",
        techniques: [ {
            name: "Main",
            passes: [ {
                renderStates: 0,
                cjsRenderStateSetup: { entries: [] },
                resourceSetDesc: { heapViews: [] },
                stageInputs: [ null, {
                    m_exists: true,
                    m_shader: 51,
                    m_constantValueSize: 0,
                    constants: [],
                    resources: new Map([ [ 0, {
                        name: "Texture0",
                        type: HlslRenderContextEnum.TEX_TYPE_2D,
                        arrayElements: 1
                    } ] ]),
                    samplers: new Map([ [ 0, {
                        name: "Sampler0",
                        sampler: { ...sampler, maxAnisotropy: 4 }
                    } ] ]),
                    uavs: new Map(),
                    signature: {
                        pipelineInputs: [],
                        registers: [ {
                            registerType: 32,
                            registerIndex: 0,
                            registerSpace: 0,
                            registerCount: 1,
                            arrayCount: 1,
                            dynamic: false
                        } ],
                        samplers: [
                            { registerIndex: 0, registerSpace: 0, sampler },
                            { registerIndex: 0, registerSpace: 2, sampler }
                        ],
                        threadGroupSize: null
                    },
                    cjsShaderBytecode: null
                } ]
            } ]
        } ],
        annotations: new Map()
    });

    const stage = manifest.stages[0];
    assert.deepEqual(stage.bindings.map((entry) => [
        entry.generatedSymbol,
        entry.kind,
        entry.registerSpace,
        entry.sourceTruth
    ]), [
        [ "t0", "resource", 0, "carbon-stage-register" ],
        [ "s0", "sampler", 0, "carbon-signature-sampler" ],
        [ "s0", "sampler", 2, "carbon-signature-sampler" ]
    ]);
    assert.equal(stage.bindings[1].carbon.sampler.maxAnisotropy, 16);
    assert.equal(manifest.resolve({
        techniqueName: "Main",
        passIndex: 0,
        stageType: HlslRenderContextEnum.PIXEL_SHADER,
        symbol: "s0",
        registerSpace: 2
    }).registerSpace, 2);
});

test("profiles hold values and reject invalid emits", () =>
{
    const reader = new CjsHlslFormat({ emit: CjsHlslFormat.OUTPUT_RAW, source: "profile" });
    assert.equal(reader.GetValues().emit, CjsHlslFormat.OUTPUT_RAW);
    assert.equal(reader.GetValues({ source: "override" }).source, "override");
    assert.equal(reader.GetValues().source, "profile");
    assert.equal(new CjsHlslFormat({ emit: CjsHlslFormat.OUTPUT_METADATA }).GetValues().emit, "metadata");
    assert.throws(() => new CjsHlslFormat({ emit: "nonsense" }), /emit must be/);
    assert.throws(() => CjsHlslFormat.read(buildEffectBytes(), { emit: "nonsense" }), /emit must be/);
});

test("toJSON converts typed arrays and nested structures", () =>
{
    const converted = CjsHlslFormat.toJSON({
        tokens: new Uint32Array([ 1, 2 ]),
        nested: [ { mask: new Uint8Array([ 3 ]) } ]
    });
    assert.deepEqual(converted, { tokens: [ 1, 2 ], nested: [ { mask: [ 3 ] } ] });

    const reader = new CjsHlslFormat();
    assert.deepEqual(reader.ToJSON(new Uint8Array([ 4, 5 ])), [ 4, 5 ]);
});

test("isSupported accepts a well-formed header and rejects garbage or truncated data", () =>
{
    assert.equal(CjsHlslFormat.isSupported(buildEffectBytes()), true);
    assert.equal(CjsHlslFormat.isSupported(new Uint8Array([ 1, 2, 3, 4, 5 ])), false);
    assert.equal(CjsHlslFormat.isSupported(new Uint8Array(0)), false);
    assert.equal(CjsHlslFormat.isSupported(buildEffectBytes({ version: 99 })), false);
});

test("out-of-range version is rejected with a read error", () =>
{
    assert.throws(() => CjsHlslFormat.read(buildEffectBytes({ version: 99 })), /HlslEffectRes/);
});

test("truncated header is rejected with a read error", () =>
{
    const bytes = buildEffectBytes().subarray(0, 2);
    assert.throws(() => CjsHlslFormat.read(bytes));
});

test("readFile validates its path argument", async () =>
{
    await assert.rejects(() => CjsHlslFormat.readFile(123), TypeError);
    await assert.rejects(() => CjsHlslFormat.readFile(""), TypeError);
    await assert.rejects(() => CjsHlslFormat.readFile("does-not-exist.sm_hi"));
});

test("readFile reads and parses a compiled effect file from disk", async () =>
{
    const dir = await mkdtemp(path.join(tmpdir(), "format-hlsl-"));
    const filePath = path.join(dir, "synthetic.sm_hi");
    try
    {
        await writeFile(filePath, buildEffectBytes());
        const result = await CjsHlslFormat.readFile(filePath);
        assert.equal(result.version, 8);
        assert.equal(result.bodyCount, 1);
    }
    finally
    {
        await rm(dir, { recursive: true, force: true });
    }
});

test("CLASS_KEYS lists the hydratable node kinds", () =>
{
    assert.deepEqual(CjsHlslFormat.CLASS_KEYS, [
        "Root",
        "Permutation",
        "EffectDescription",
        "Technique",
        "Pass",
        "StageInput",
        "Constant",
        "Resource",
        "Sampler",
        "ShaderBytecode"
    ]);
});

test("classes option hydrates registered node kinds instead of plain objects", () =>
{
    class EffectRoot
    {}
    class ShaderPermutation
    {}

    const bytes = buildEffectBytes({
        permutations: [ { name: "BLEND_MODE", description: "", defaultOption: 0, options: [ "OPAQUE" ] } ]
    });
    const result = CjsHlslFormat.read(bytes, {
        source: "synthetic",
        classes: { Root: EffectRoot, Permutation: ShaderPermutation }
    });

    assert.ok(result instanceof EffectRoot);
    assert.ok(result.permutations[0] instanceof ShaderPermutation);
    assert.equal(result.permutations[0].name, "BLEND_MODE");
});

test("instance SetClass/SetClasses/GetClass/HasClass manage the node class map", () =>
{
    class EffectRoot
    {}

    const reader = new CjsHlslFormat();
    assert.equal(reader.HasClass("Root"), false);
    reader.SetClass("Root", EffectRoot);
    assert.equal(reader.HasClass("Root"), true);
    assert.equal(reader.GetClass("Root"), EffectRoot);

    reader.SetClass("Root", null);
    assert.equal(reader.HasClass("Root"), false);

    reader.SetClasses({ Root: EffectRoot });
    assert.equal(reader.GetClass("Root"), EffectRoot);

    assert.throws(() => reader.GetClass("NotARealKey"), /unknown class key/);
    assert.throws(() => reader.SetClass("NotARealKey", EffectRoot), /unknown class key/);
    assert.throws(() => reader.SetClass("Root", 123), /must be a constructor/);
});

test("unknown options and non-object classes are rejected", () =>
{
    assert.throws(() => new CjsHlslFormat({ nonsense: true }), /unknown option/);
    assert.throws(() => CjsHlslFormat.read(buildEffectBytes(), { classes: 123 }), /classes option must be an object/);
});
