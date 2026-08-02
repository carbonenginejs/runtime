import assert from "node:assert/strict";
import test from "node:test";

import {
    isComputeFragmentContract,
    inspectGlslContainerIntegrity,
    inspectRasterCompleteness
} from "../../../src/formats/webgl/core/glslEffectCompleteness.js";
import { readGlslEffectContainer } from "../../../src/formats/webgl/core/readGlslEffectContainer.js";
import { CjsWebglFormat } from "../../../src/formats/webgl/index.js";
import { buildMinimalStagedEffectBytes } from "./synthetic.js";

/**
 * The rules run from container bytes, so the fixture builds what a decoded
 * container yields: stage records with pass coordinates and their own Carbon
 * reflection, and a shader table they reference by key.
 *
 * The old fixture hand-built `info`/`metadata`/`glsl` objects mirroring the
 * INFO/META/GLSL chunks, because the rules cross-checked those three against
 * each other. That is not what the rules read now, and there is no container to
 * disagree with itself, so the tri-split is gone rather than ported.
 *
 * No test here builds container *bytes* to satisfy a fixture — a fixture that
 * builds a container is testing the container builder. The decoder is what gets
 * held against real bytes, in the last test below and in the corpus round trip.
 */

const STAGE_TYPES = { vertex: 0, pixel: 1, compute: 2, geometry: 3, hull: 4, domain: 5 };

function stage(stageName, shaderKey, bodyKey = "body_1", overrides = {})
{
    return {
        key: `${bodyKey}.Main.pass0.${stageName}`,
        bodyKey,
        techniqueName: "Main",
        passIndex: 0,
        stageName,
        stageType: STAGE_TYPES[stageName],
        shaderKey,
        manifest: { pipelineInputs: [], bindings: [] },
        ...overrides
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
        ...overrides
    };
}

/** A decoded-container graph, which is all the rules consume. */
function containerGraph(stages, shaders)
{
    return { stages, shaders };
}

test("raster completeness accepts translated vertex/pixel pairs", () =>
{
    const result = inspectRasterCompleteness(
        [ stage("vertex", "vs"), stage("pixel", "ps") ],
        [ shader("vs"), shader("ps") ]
    );

    assert.deepEqual(result, {
        expectedPassCount: 1,
        completePassCount: 1,
        incompletePasses: []
    });
});

test("raster completeness reports absent and excluded raster stages", () =>
{
    const missing = inspectRasterCompleteness(
        [ stage("vertex", "vs") ],
        [ shader("vs") ]
    );
    assert.deepEqual(missing.incompletePasses[0].missingStages, [ "pixel" ]);

    const excluded = inspectRasterCompleteness(
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
    assert.match(excluded.incompletePasses[0].unavailableStages[0].reason, /ld_uav_typed/u);
});

test("raster completeness ignores standalone compute and geometry records", () =>
{
    const result = inspectRasterCompleteness(
        [ stage("compute", "cs"), stage("geometry", "gs") ],
        [ shader("cs"), shader("gs") ]
    );

    assert.deepEqual(result, {
        expectedPassCount: 0,
        completePassCount: 0,
        incompletePasses: []
    });
});

test("raster completeness rejects duplicate stages in one raster pass", () =>
{
    const result = inspectRasterCompleteness(
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

test("the compute-fragment host contract is checked in full, not by a marker", () =>
{
    const contract = {
        threadGroup: [ 8, 8, 1 ],
        dispatchOriginUniform: "cewgDispatchOrigin",
        uavOutputs: [
            { register: 0, slice: null, location: 0, glslName: "cewgUav0" }
        ]
    };
    assert.equal(isComputeFragmentContract(contract), true);
    assert.equal(isComputeFragmentContract({ ...contract, dispatchOriginUniform: null }), true);
    assert.equal(isComputeFragmentContract(true), false);
    assert.equal(isComputeFragmentContract({ ...contract, uavOutputs: [] }), false);
    assert.equal(isComputeFragmentContract({
        ...contract,
        uavOutputs: [
            ...contract.uavOutputs,
            { register: 1, slice: 0, location: 0, glslName: "cewgUav1" }
        ]
    }), false);

    const computeShader = shader("cs", {
        computeFragment: contract,
        bindings: [
            { kind: "dispatchUniform", name: "cewgDispatchOrigin" },
            { kind: "uavTexture", registerIndex: 0, slice: null, location: 0, name: "cewgUav0" }
        ],
        source: [
            "#version 300 es",
            "uniform ivec3 cewgDispatchOrigin;",
            "layout(location = 0) out highp vec4 cewgUav0;",
            "void main() { cewgUav0 = vec4(1.0); }"
        ].join("\n")
    });

    assert.deepEqual(
        inspectGlslContainerIntegrity(containerGraph([ stage("compute", "cs") ], [ computeShader ])),
        { ok: true, errors: [] }
    );

    // A boolean marker is the failure this rule exists to catch: it reads as
    // "yes, adapted" and carries none of the routing the host needs.
    const markerOnly = inspectGlslContainerIntegrity(
        containerGraph([ stage("compute", "cs") ], [ shader("cs", { computeFragment: true }) ])
    );
    assert.ok(markerOnly.errors.some((entry) => entry.code === "unadapted_compute_stage"));

    // The UAV route must be declared at the location the contract claims, not
    // merely present in the metadata.
    const undeclared = inspectGlslContainerIntegrity(containerGraph(
        [ stage("compute", "cs") ],
        [ { ...computeShader, source: computeShader.source.replace("location = 0", "location = 1") } ]
    ));
    assert.ok(undeclared.errors.some((entry) => entry.code === "unadapted_compute_stage"));
});

test("container integrity rejects unsupported stages and stages with no program", () =>
{
    const unsupported = inspectGlslContainerIntegrity(
        containerGraph([ stage("geometry", "gs") ], [ shader("gs") ])
    );
    assert.ok(unsupported.errors.some((entry) => entry.code === "unsupported_stage"));

    // This is the shape a container gives for a body the translator could not
    // lower: the stage is declared, the program is empty.
    const absent = inspectGlslContainerIntegrity(containerGraph(
        [ stage("vertex", "vs"), stage("pixel", "ps") ],
        [ shader("vs"), shader("ps", { source: "", hlsl2webgl: { ok: false, reason: "no program was stored" } }) ]
    ));
    assert.ok(absent.errors.some((entry) => entry.code === "unavailable_stage_shader"));
});

test("container integrity requires one vertex/pixel pair or one compute stage per pass", () =>
{
    const lonely = inspectGlslContainerIntegrity(
        containerGraph([ stage("vertex", "vs") ], [ shader("vs") ])
    );
    assert.ok(lonely.errors.some((entry) => entry.code === "incomplete_pass_stage_family"));

    const mixed = inspectGlslContainerIntegrity(containerGraph(
        [ stage("vertex", "vs"), stage("pixel", "ps"), stage("compute", "cs") ],
        [ shader("vs"), shader("ps"), shader("cs") ]
    ));
    assert.ok(mixed.errors.some((entry) => entry.code === "invalid_pass_stage_family"));

    const paired = inspectGlslContainerIntegrity(containerGraph(
        [ stage("vertex", "vs"), stage("pixel", "ps") ],
        [ shader("vs"), shader("ps") ]
    ));
    assert.deepEqual(paired.errors, []);
});

test("container integrity holds emitted GLSL to the vertex input ABI", () =>
{
    // If the emitted `in` name does not match the reflection's attribute, nothing
    // fails loudly: the program links and the attribute silently never binds.
    const manifest = {
        pipelineInputs: [
            { registerIndex: 0, usageName: "POSITION", usageIndex: 0, usedMask: 7 }
        ],
        bindings: []
    };
    const vertex = stage("vertex", "vs", "body_1", { manifest });
    const inputs = [ { register: 0, name: "in_POSITION0", semanticName: "POSITION", semanticIndex: 0 } ];

    const good = inspectGlslContainerIntegrity(containerGraph(
        [ vertex, stage("pixel", "ps") ],
        [
            shader("vs", {
                stageInputs: inputs,
                source: "#version 300 es\nin vec3 in_POSITION0;\nvoid main() {}"
            }),
            shader("ps")
        ]
    ));
    assert.deepEqual(good.errors, []);

    const undeclared = inspectGlslContainerIntegrity(containerGraph(
        [ vertex, stage("pixel", "ps") ],
        [
            shader("vs", {
                stageInputs: inputs,
                source: "#version 300 es\nin vec3 in_SOMETHING_ELSE;\nvoid main() {}"
            }),
            shader("ps")
        ]
    ));
    assert.ok(undeclared.errors.some((entry) => entry.code === "vertex_input_declaration_mismatch"));

    // BITANGENT/BINORMAL and BLENDWEIGHTS/BLENDWEIGHT are the same semantic under
    // two names. Without the alias the rule would reject correct shaders, which
    // is why the negative control matters as much as the positive one.
    const aliased = inspectGlslContainerIntegrity(containerGraph(
        [
            stage("vertex", "vs", "body_1", {
                manifest: {
                    pipelineInputs: [
                        { registerIndex: 0, usageName: "BINORMAL", usageIndex: 0, usedMask: 7 }
                    ],
                    bindings: []
                }
            }),
            stage("pixel", "ps")
        ],
        [
            shader("vs", {
                stageInputs: [ { register: 0, name: "in_BITANGENT0", semanticName: "BITANGENT", semanticIndex: 0 } ],
                source: "#version 300 es\nin vec3 in_BITANGENT0;\nvoid main() {}"
            }),
            shader("ps")
        ]
    ));
    assert.deepEqual(aliased.errors, []);
});

test("container integrity holds comparison samplers to Carbon's sampler flag", () =>
{
    // A `sampler2DShadow` in GLSL must correspond to a Carbon sampler declared
    // comparison; otherwise the sampler state is wrong at runtime and the depth
    // compare silently does not happen.
    const manifest = {
        pipelineInputs: [],
        bindings: [
            { kind: "resource", registerIndex: 0 },
            { kind: "sampler", registerIndex: 0, carbon: { sampler: { comparison: true } } }
        ]
    };
    const pixel = stage("pixel", "ps", "body_1", { manifest });
    const shadowShader = (overrides = {}) => shader("ps", {
        bindings: [ {
            kind: "texture",
            registerIndex: 0,
            name: "shadowMap",
            samplerType: "sampler2DShadow",
            comparison: true,
            samplerRegisterIndices: [ 0 ]
        } ],
        source: "#version 300 es\nuniform highp sampler2DShadow shadowMap;\nvoid main() {}",
        ...overrides
    });

    const good = inspectGlslContainerIntegrity(
        containerGraph([ stage("vertex", "vs"), pixel ], [ shader("vs"), shadowShader() ])
    );
    assert.deepEqual(good.errors, []);

    // Two independent ways this contract breaks, asserted separately because
    // they share an error code. Asserting only the code would let either rule be
    // deleted while the test kept passing on the other one.

    // (1) The binding's own flag disagrees with its GLSL sampler type. Carbon's
    // manifest is left correct so only this rule can fire.
    const flagDisagrees = inspectGlslContainerIntegrity(containerGraph(
        [ stage("vertex", "vs"), pixel ],
        [ shader("vs"), shadowShader({
            bindings: [ {
                kind: "texture",
                registerIndex: 0,
                name: "shadowMap",
                samplerType: "sampler2DShadow",
                comparison: false,
                samplerRegisterIndices: [ 0 ]
            } ]
        }) ]
    ));
    assert.ok(
        flagDisagrees.errors.some((entry) => entry.code === "comparison_sampler_contract_mismatch"),
        "a binding claiming no comparison on a sampler2DShadow must be rejected"
    );

    // (2) Carbon says the paired sampler does not compare. The binding is left
    // self-consistent so only the manifest-pairing rule can fire.
    const manifestDisagrees = inspectGlslContainerIntegrity(containerGraph(
        [
            stage("vertex", "vs"),
            stage("pixel", "ps", "body_1", {
                manifest: {
                    pipelineInputs: [],
                    bindings: [
                        { kind: "resource", registerIndex: 0 },
                        { kind: "sampler", registerIndex: 0, carbon: { sampler: { comparison: false } } }
                    ]
                }
            })
        ],
        [ shader("vs"), shadowShader() ]
    ));
    assert.ok(
        manifestDisagrees.errors.some((entry) => entry.code === "comparison_sampler_contract_mismatch"),
        "a Carbon sampler that does not compare must not pair with a sampler2DShadow"
    );

    // The GLSL must actually declare the sampler at the type the binding claims.
    const undeclared = inspectGlslContainerIntegrity(containerGraph(
        [ stage("vertex", "vs"), pixel ],
        [ shader("vs"), shadowShader({ source: "#version 300 es\nuniform highp sampler2D shadowMap;\nvoid main() {}" }) ]
    ));
    assert.ok(undeclared.errors.some((entry) => entry.code === "sampler_binding_declaration_mismatch"));
});

test("the rules run on a real container decoded from bytes", () =>
{
    // The fixtures above are hand-built records. This one closes the loop: build
    // an effect, decode the container it emitted, and run the rules on what came
    // back. If the decoder ever stopped producing the vocabulary the rules read,
    // every test above would still pass and this one would not.
    const built = CjsWebglFormat.buildEffect(
        buildMinimalStagedEffectBytes({
            version: 15,
            permutations: [
                { name: "QUALITY", options: [ "LOW", "HIGH" ], defaultOption: 1, description: "quality", type: 1 }
            ],
            bodyPassCounts: [ 1, 2 ],
            distinctBodyRanges: true
        }),
        { source: "synthetic.sm_hi", allowFailures: true }
    );

    const decoded = readGlslEffectContainer(built.bytes, { source: "synthetic.sm_hi" });

    assert.ok(decoded.stages.length > 0, "the decoder must produce stage records");
    assert.equal(decoded.stages.length, decoded.shaders.length,
        "this fixture translates nothing, so every stage has its own absent-program record");

    for (const stageRecord of decoded.stages)
    {
        assert.ok(stageRecord.manifest, "every decoded stage carries its Carbon reflection");
        assert.equal(typeof stageRecord.techniqueName, "string");
        assert.equal(typeof stageRecord.passIndex, "number");
    }

    // Synthetic DXBC does not lower, so the container stores declared stages with
    // empty programs — and the rules must say so rather than report a clean file.
    const integrity = inspectGlslContainerIntegrity(decoded);
    assert.equal(integrity.ok, false);
    assert.ok(integrity.errors.some((entry) => entry.code === "unavailable_stage_shader"));

    const completeness = inspectRasterCompleteness(decoded.stages, decoded.shaders);
    assert.equal(completeness.completePassCount, 0);
});

/**
 * A stage whose Carbon description declares the local-light family.
 *
 * `LightProfileArray` is optional in the family, so two entries is the minimum
 * that counts as one.
 */
function lightStage(overrides = {})
{
    return stage("pixel", "ps", "body_1", {
        manifest: {
            pipelineInputs: [],
            bindings: [
                { kind: "resource", registerIndex: 13, name: "LightIndexBuffer" },
                { kind: "resource", registerIndex: 14, name: "LightBuffer" },
                { kind: "resource", registerIndex: 15, name: "LightProfileArray" },
                { kind: "resource", registerIndex: 2, name: "DiffuseMap" }
            ]
        },
        ...overrides
    });
}

test("a described local-light family must be declared or lowered", () =>
{
    // Not lowered: the shader declares the family at its own registers, which is
    // what `localLights: "none"` emits.
    const declared = inspectGlslContainerIntegrity(containerGraph(
        [ lightStage() ],
        [ shader("ps", { bindings: [
            { name: "sb13", registerIndex: 13 },
            { name: "sb14", registerIndex: 14 },
            { name: "t15", registerIndex: 15 }
        ] }) ]
    ));
    assert.equal(
        declared.errors.some((entry) => entry.code === "unlowered_local_light_family"),
        false
    );

    // Lowered: one synthesised uniform whose record names the sources it
    // replaced. Its own registerIndex covers only the first of the three.
    const lowered = inspectGlslContainerIntegrity(containerGraph(
        [ lightStage() ],
        [ shader("ps", { bindings: [ {
            name: "cewgLocalLightTexture",
            registerIndex: 13,
            localLightRole: "packedLocalLights",
            lightIndexRegister: 13,
            lightDataRegister: 14,
            lightProfileRegister: 15
        } ] }) ]
    ));
    assert.equal(
        lowered.errors.some((entry) => entry.code === "unlowered_local_light_family"),
        false
    );

    // Dropped: the declarations and their records both go, so the description
    // lists a family with nothing to bind it to and nothing saying why.
    const dropped = inspectGlslContainerIntegrity(containerGraph(
        [ lightStage() ],
        [ shader("ps", { bindings: [ { name: "sDiffuse", registerIndex: 2 } ] }) ]
    ));
    const error = dropped.errors.find(
        (entry) => entry.code === "unlowered_local_light_family"
    );
    assert.ok(error, "a dropped family must be reported");
    assert.deepEqual(error.registers, [ 13, 14, 15 ]);
});

test("an ordinary undeclared resource is not reported", () =>
{
    // Carbon describes resources a shader may simply not use, and the emitter
    // only declares what it samples. The rule must stay narrow enough that an
    // unused texture is not mistaken for a lowering that went missing.
    const result = inspectGlslContainerIntegrity(containerGraph(
        [ stage("pixel", "ps", "body_1", {
            manifest: {
                pipelineInputs: [],
                bindings: [
                    { kind: "resource", registerIndex: 2, name: "DiffuseMap" },
                    { kind: "resource", registerIndex: 7, name: "UnusedMap" }
                ]
            }
        }) ],
        [ shader("ps", { bindings: [ { name: "sDiffuse", registerIndex: 2 } ] }) ]
    ));

    assert.deepEqual(
        result.errors.filter((entry) => entry.code === "unlowered_local_light_family"),
        []
    );
});
