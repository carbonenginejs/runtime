import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { readFile, stat } from "node:fs/promises";

import { buildEffectPackage } from "../../../src/formats/webgpu/core/packageEffect.js";
import { buildCarbonEffectContainer } from "../../../src/formats/webgpu/core/buildCarbonEffectContainer.js";
import { readEffectAnalysis } from "../../../src/formats/webgpu/core/effectAnalysis.js";
import { CewgpuContainer } from "../../../src/formats/webgpu/core/cewgpu/CewgpuContainer.js";
import {
    readBackendBlock,
    writeBackendBlock
} from "../../../src/format/carbonEffect/carbonEffectBackendBlock.js";
import { CjsCarbonEffectWriter } from "../../../src/format/carbonEffect/CjsCarbonEffectWriter.js";
import { CjsByteWriter } from "../../../src/format/CjsByteWriter.js";
import {
    buildSyntheticDescription,
    SYNTHETIC_PERMUTATIONS,
    blob
} from "../../format/carbonEffectSynthetic.js";

/**
 * Builds an always-green container carrying a per-pass backend block.
 *
 * The corpus oracle above needs real effects; these structural properties do
 * not, and must stay green without game files.
 *
 * @returns {{bytes:Uint8Array}} Container bytes.
 */
function buildFixtureContainer()
{
    const block = writeBackendBlock({
        bindGroups: [ { group: 0, bindings: [ {
            group: 0,
            binding: 0,
            registerSpace: 0,
            registerIndex: 0,
            resourceKind: "sampled-resource",
            visibility: [ "fragment" ],
            type: "texture_2d<f32>",
            generatedSymbol: "t0"
        } ] } ],
        transforms: []
    });

    const writer = new CjsCarbonEffectWriter({
        backend: true,
        compilerVersion: [ 1, 2, 6, 0 ],
        sourceHash: "0123456789abcdef0123456789abcdef"
    });
    for (const axis of SYNTHETIC_PERMUTATIONS) writer.addPermutation(axis);
    for (let index = 0; index < 4; index += 1)
    {
        const description = buildSyntheticDescription({ label: `Body${index}` });
        for (const technique of description.techniques)
        {
            technique.libraries = [];
            for (const pass of technique.passes) pass.backendBlock = blob(block);
        }
        writer.addBody(index, description);
    }
    return { bytes: writer.toBytes() };
}

/**
 * Effects chosen to span the shapes that reach different descriptor branches,
 * not to be a representative sample. The corpus-wide ratio is measured
 * separately; this test proves the reader reconstructs what the emitter had.
 */
const TARGETS = [
    "ui/ubershader.sm_hi",
    "managed/interior/avatar/auraavatar.sm_hi",
    "managed/space/spaceobject/v5/quad/quadv5.sm_lo"
];

const corpusDir = process.env.CARBON_EFFECT_CORPUS_DIR || null;

/**
 * Stringifies with sorted keys, so key order is not mistaken for a difference.
 *
 * @param {*} value Any document.
 * @returns {string} Canonical JSON.
 */
function canonical(value)
{
    return JSON.stringify(value, (key, entry) =>
        (entry && typeof entry === "object" && !Array.isArray(entry)
            ? Object.fromEntries(Object.keys(entry).sort().map((name) => [ name, entry[name] ]))
            : entry));
}

/**
 * Builds one binding record and returns what the block round-trips it to.
 *
 * @param {object} binding Binding fields.
 * @returns {object} Decoded binding.
 */
function roundTripBinding(binding)
{
    const bytes = writeBackendBlock({
        bindGroups: [ { group: 0, bindings: [ {
            group: 0,
            binding: 0,
            registerSpace: 0,
            registerIndex: 0,
            visibility: [ "vertex" ],
            generatedSymbol: "x0",
            ...binding
        } ] } ],
        transforms: []
    });
    return readBackendBlock(bytes).bindGroups[0].bindings[0];
}

test("the block derives every WebGPU binding descriptor it does not store", () =>
{
    // The descriptor is a pure function of resource kind, WGSL type and
    // structure stride, so it is derived rather than carried. Each branch of
    // lowerBindingLayout.js must come back exactly.
    assert.deepEqual(
        roundTripBinding({ resourceKind: "uniform-buffer", type: "array<vec4<f32>, 7>" }).buffer,
        { type: "uniform", hasDynamicOffset: false, minBindingSize: 112 }
    );
    assert.deepEqual(
        roundTripBinding({ resourceKind: "sampled-resource", type: "texture_2d_array<f32>" }).texture,
        { sampleType: "float", viewDimension: "2d-array", multisampled: false }
    );
    assert.deepEqual(
        roundTripBinding({ resourceKind: "sampler", type: "sampler" }).sampler,
        { type: "filtering" }
    );

    // array<u32> reaches two branches. The structure stride is what separates
    // them, and it is the only thing that does.
    assert.deepEqual(
        roundTripBinding({
            resourceKind: "sampled-resource", type: "array<u32>", structureStride: 48
        }).buffer,
        { type: "read-only-storage", hasDynamicOffset: false, minBindingSize: 48 }
    );
    assert.deepEqual(
        roundTripBinding({ resourceKind: "sampled-resource", type: "array<u32>" }).buffer,
        { type: "read-only-storage", hasDynamicOffset: false, minBindingSize: 4 }
    );
    assert.deepEqual(
        roundTripBinding({
            resourceKind: "storage-resource", type: "array<atomic<u32>>"
        }).buffer,
        { type: "storage", hasDynamicOffset: false, minBindingSize: 4 }
    );

    // Negative control: a uniform type the derivation cannot read must fail
    // rather than produce a plausible descriptor. Without this, a silently
    // wrong minBindingSize would reach the device as a validation error far
    // from its cause.
    assert.throws(
        () => roundTripBinding({ resourceKind: "uniform-buffer", type: "array<vec4<f32>>" }),
        /untranslatable type/u
    );
});

test(
    "the container reader reproduces the programs and layouts the emitter had",
    { skip: corpusDir ? false : "set CARBON_EFFECT_CORPUS_DIR to run the container oracle" },
    async () =>
    {
        assert.ok((await stat(corpusDir)).isDirectory(), `corpus dir not found: ${corpusDir}`);

        let comparedPasses = 0;
        const differences = [];

        for (const target of TARGETS)
        {
            const file = path.join(corpusDir, "dx11", target);
            const bytes = new Uint8Array(await readFile(file));
            const built = buildEffectPackage(bytes, { mode: "all", source: file });
            const resolved = readEffectAnalysis(bytes, { source: file });
            const container = buildCarbonEffectContainer(
                resolved.effectRes,
                built.permutationGraph,
                built.backendBodySet
            );

            const reader = new CewgpuContainer();
            assert.ok(reader.Read(container.bytes, { sourcePath: file }), `failed to read ${target}`);

            const graph = reader.permutationGraph;
            assert.equal(graph.variants.length, built.permutationGraph.variants.length);
            assert.equal(graph.bodies.length, built.permutationGraph.bodies.length);
            assert.deepEqual(
                graph.axes,
                built.permutationGraph.axes.map((axis) => ({
                    name: axis.name,
                    defaultOption: axis.defaultOption,
                    description: axis.description,
                    type: axis.type,
                    options: axis.options
                }))
            );

            const units = new Map(built.backendBodySet.passUnits.map((unit) => [ unit.key, unit ]));

            for (let index = 0; index < graph.variants.length; index += 1)
            {
                const variant = built.permutationGraph.variants[index];
                const body = built.backendBodySet.bodies
                    .find((entry) => entry.bodyKey === variant.bodyKey);
                if (body.status !== "translated") continue;

                const wire = reader.GetBackendBodyPrograms(index);
                assert.equal(wire.status, "translated");

                for (const pass of body.passes)
                {
                    const unit = units.get(pass.unitKey);
                    const wirePass = wire.passes.find((entry) => entry.passKey === pass.passKey);
                    comparedPasses += 1;

                    if (!wirePass)
                    {
                        differences.push(`${target}#${index} ${pass.passKey}: missing on the wire`);
                        continue;
                    }

                    const expected = unit.shaders
                        .map((shader) => `${shader.stageName}:${shader.entryPoint}:${shader.code}`)
                        .sort();
                    const actual = wirePass.shaders
                        .map((shader) => `${shader.stageName}:${shader.entryPoint}:${shader.code}`)
                        .sort();
                    if (canonical(expected) !== canonical(actual))
                    {
                        differences.push(`${target}#${index} ${pass.passKey}: programs differ`);
                    }

                    const expectedLayout = unit.layouts
                        .find((entry) => entry.key === pass.passKey)?.bindGroups ?? null;
                    const actualLayout = wirePass.layouts[0]?.bindGroups ?? null;
                    if (canonical(expectedLayout) !== canonical(actualLayout))
                    {
                        differences.push(`${target}#${index} ${pass.passKey}: layouts differ`);
                    }
                }
            }
        }

        console.log(`cewgpu container: ${comparedPasses} passes compared across ${TARGETS.length} effects`);
        if (differences.length)
        {
            for (const entry of differences.slice(0, 20)) console.log(`  ${entry}`);
        }
        assert.equal(differences.length, 0, `${differences.length} passes differ from the emitter`);
        assert.ok(comparedPasses > 2000, `expected a substantial comparison, got ${comparedPasses}`);
    }
);

test("a container is a stock Carbon v15 file, with nothing prepended", () =>
{
    // The point of the whole envelope removal: our first dword is Carbon's
    // version, so Tr2EffectRes/Tr2Shader read our containers through the Carbon
    // path rather than a bespoke format branch. Anything prepended here would
    // put that back.
    const built = buildFixtureContainer();

    const view = new DataView(built.bytes.buffer, built.bytes.byteOffset);
    assert.equal(view.getUint32(0, true), 15, "the container must open on Carbon's v15 version dword");

    // Negative control: a magic-prefixed header is NOT a container. If this were
    // accepted, something would still be reading a prefix.
    const prefixed = new CjsByteWriter(12);
    prefixed.bytes(new TextEncoder().encode("CWGP"));
    prefixed.u32(2);
    prefixed.u32(0);

    const reader = new CewgpuContainer();
    assert.equal(reader.Read(prefixed.toBytes(), { sourcePath: "prefixed" }), false);
    assert.ok(reader.readError, "a prefixed header must fail to read as a container");
});

test("the per-pass block is detected without being told, and without a version of its own", () =>
{
    // Rule 1 does the work: a body must parse to exactly its declared end, so
    // the wrong interpretation either throws or lands short. That is why the
    // container needs no envelope, no payload tag and no version number of ours
    // -- three things that were carried or proposed and none of which anything
    // required.
    const built = buildFixtureContainer();
    const container = new CewgpuContainer();
    assert.ok(container.Read(built.bytes, { sourcePath: "auto-detect" }));

    for (let index = 0; index < container.carbon.records.length; index += 1)
    {
        const told = container.carbon.readDescription(index, { backend: true });
        const detected = container.carbon.readDescription(index);
        assert.deepEqual(
            detected.techniques.map((technique) => technique.passes.map((pass) => Boolean(pass.backendBlock))),
            told.techniques.map((technique) => technique.passes.map((pass) => Boolean(pass.backendBlock))),
            `body ${index} must detect the same blocks it is told about`
        );
    }

    // Negative control: the same detection on a body with NO blocks must not
    // invent one. Read our own bodies as plain Carbon and confirm the reading
    // that ignores blocks is the one that fails, rather than both succeeding --
    // if both parsed clean, detection would be choosing arbitrarily.
    let refusedAsPlainCarbon = 0;
    for (let index = 0; index < container.carbon.records.length; index += 1)
    {
        try
        {
            container.carbon.readDescription(index, { backend: false });
        }
        catch
        {
            refusedAsPlainCarbon += 1;
        }
    }
    assert.ok(
        refusedAsPlainCarbon > 0,
        "bodies carrying blocks must not also parse cleanly as plain Carbon"
    );
});
