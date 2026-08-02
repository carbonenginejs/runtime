import test from "node:test";
import assert from "node:assert/strict";

import { CjsCarbonEffectWriter } from "../../src/format/carbonEffect/CjsCarbonEffectWriter.js";
import {
    buildSyntheticDescription,
    SYNTHETIC_PERMUTATIONS
} from "../format/carbonEffectSynthetic.js";
import { Tr2EffectRes } from "../../src/resource/shader/Tr2EffectRes.js";
import { Tr2Shader } from "../../src/resource/shader/Tr2Shader.js";

/**
 * The resource reading container bytes directly, with no intermediate document.
 *
 * The synthetic description covers every v15 record type — both sampler kinds,
 * both resource kinds, a raytracing library with its two stage-data blocks, every
 * annotation type — so a field that fails to map shows up here rather than only
 * against the shipped corpus.
 */

const COMPILER_VERSION = [ 1, 2, 6, 0 ];
const SOURCE_HASH = "0123456789abcdef0123456789abcdef";

function buildContainer()
{
    const writer = new CjsCarbonEffectWriter({
        compilerVersion: COMPILER_VERSION,
        sourceHash: SOURCE_HASH
    });
    for (const axis of SYNTHETIC_PERMUTATIONS) writer.addPermutation(axis);
    writer.addBody(0, buildSyntheticDescription({ label: "A" }));
    writer.addBody(1, buildSyntheticDescription({ label: "B" }));
    writer.addBody(2, buildSyntheticDescription({ label: "C" }));
    writer.addBody(3, buildSyntheticDescription({ label: "C" }));
    return writer.toBytes();
}

function prepared()
{
    return new Tr2EffectRes().DoLoad(buildContainer());
}

test("DoLoad exposes the container's permutation axes", () =>
{
    const res = prepared();
    const axes = res.GetPermutationDescription();

    assert.equal(axes.length, 2);
    assert.equal(axes[0].name, "SKINNED");
    assert.deepEqual(axes[0].options, [ "0", "1" ]);
    assert.equal(axes[0].defaultOption, 0);
    assert.equal(axes[0].description, "Skinned geometry");
    assert.equal(axes[0].type, 1);
    assert.equal(axes[1].name, "DETAIL");
    assert.equal(axes[1].defaultOption, 1);
});

test("GetShaderByIndex builds a shader from container bytes", () =>
{
    const shader = prepared().GetShaderByIndex(0);

    assert.ok(shader instanceof Tr2Shader);
    assert.equal(shader.effect.techniques.length, 2);
    assert.equal(shader.effect.techniques[0].name, "Main");
    assert.equal(shader.effect.techniques[1].name, "Raytrace");
});

test("permutation index selects the body that index was written with", () =>
{
    const res = prepared();

    // Each body was written with a distinct name prefix, so the constant names
    // prove which body was decoded rather than merely that one was.
    const nameAt = index => res.GetShaderByIndex(index)
        .effect.techniques[0].passes[0].stageInputs[0].constants[0].name;

    assert.equal(nameAt(0), "AConstant");
    assert.equal(nameAt(1), "BConstant");
    // Rows 2 and 3 alias one body, so both must decode to the same content.
    assert.equal(nameAt(2), "CConstant");
    assert.equal(nameAt(3), "CConstant");
});

test("GetShader resolves axis options to a permutation index", () =>
{
    const res = prepared();

    // SKINNED is axis 0 (stride 1) and defaults to option 0; DETAIL is axis 1
    // (stride 2) and defaults to option 1 — so the default selection is index 2.
    assert.equal(
        res.GetShader().effect.techniques[0].passes[0].stageInputs[0].constants[0].name,
        "CConstant"
    );
    assert.equal(
        res.GetShader([ { name: "DETAIL", value: "off" } ])
            .effect.techniques[0].passes[0].stageInputs[0].constants[0].name,
        "AConstant"
    );
    assert.equal(
        res.GetShader([
            { name: "SKINNED", value: "1" },
            { name: "DETAIL", value: "off" }
        ]).effect.techniques[0].passes[0].stageInputs[0].constants[0].name,
        "BConstant"
    );
});

test("a decoded body is memoised rather than re-read", () =>
{
    const res = prepared();
    assert.equal(res.GetShaderByIndex(1), res.GetShaderByIndex(1));
});

test("an out-of-range permutation index returns null", () =>
{
    assert.equal(prepared().GetShaderByIndex(4), null);
});

test("stages land at their own stage type, not their position in the record", () =>
{
    const pass = prepared().GetShaderByIndex(0).effect.techniques[0].passes[0];

    // The synthetic pass writes stage types 0 and 1; the remaining four slots
    // exist but are empty.
    assert.equal(pass.stageInputs.length, 6);
    assert.equal(pass.stageInputs[0].exists, true);
    assert.equal(pass.stageInputs[1].exists, true);
    assert.equal(pass.stageInputs[2].exists, false);
    assert.equal(pass.shaderTypeMask, 0b000011);

    const compute = prepared().GetShaderByIndex(0).effect.techniques[0].passes[1];
    assert.equal(compute.stageInputs[2].exists, true);
    assert.equal(compute.shaderTypeMask, 0b000100);
    assert.deepEqual(
        compute.stageInputs[2].signature.threadGroupSize,
        { x: 8, y: 8, z: 1 }
    );
});

test("resources and samplers are keyed by register, not by position", () =>
{
    const input = prepared().GetShaderByIndex(0)
        .effect.techniques[0].passes[0].stageInputs[0];

    assert.deepEqual([ ...input.resources.keys() ], [ 0, 4 ]);
    assert.equal(input.resources.get(0).name, "ADiffuseMap");
    assert.equal(input.resources.get(0).isSRGB, true);
    assert.equal(input.resources.get(0).arrayElements, 1);
    assert.equal(input.resources.get(4).name, "ADetailArray");
    assert.equal(input.resources.get(4).arrayElements, 3);
});

test("a UAV carries no isSRGB, matching Carbon's hardcoded false", () =>
{
    const input = prepared().GetShaderByIndex(0)
        .effect.techniques[0].passes[0].stageInputs[0];

    for (const uav of input.uavs.values())
    {
        assert.equal(uav.isSRGB, false);
    }
    assert.ok(input.uavs.size > 0, "the synthetic body must declare a UAV");
});

/**
 * Reads back one stage input from a container whose single sampler has been
 * rewritten, so the dynamic and non-dynamic cases are both real reads rather than
 * one read and an assumption. The shared synthetic fixture declares only a dynamic
 * sampler, and its byte layout is depended on elsewhere, so it is varied here
 * rather than changed.
 */
function stageInputWithSampler(overrides)
{
    const description = buildSyntheticDescription({ label: "A" });
    for (const technique of description.techniques)
    {
        for (const pass of technique.passes)
        {
            for (const stage of pass.stages)
            {
                Object.assign(stage.samplers[0], overrides);
            }
        }
    }

    const writer = new CjsCarbonEffectWriter({
        compilerVersion: COMPILER_VERSION,
        sourceHash: SOURCE_HASH
    });
    writer.addPermutation(SYNTHETIC_PERMUTATIONS[0]);
    writer.addBody(0, description);
    writer.addBody(1, description);

    return new Tr2EffectRes()
        .DoLoad(writer.toBytes())
        .GetShaderByIndex(0)
        .effect.techniques[0].passes[0].stageInputs[0];
}

test("a dynamic sampler keeps its name", () =>
{
    const input = stageInputWithSampler({ isDynamic: 1 });
    const sampler = input.samplers.get(0);

    assert.equal(sampler.isDynamic, true);
    assert.equal(sampler.hasName, true);
    assert.equal(sampler.name, "ADiffuseSampler");
});

test("a non-dynamic sampler drops the name the arena still holds", () =>
{
    // Carbon nulls the name of a non-dynamic sampler while reading, but the
    // string is still sitting in the arena and the record still points at it —
    // so deriving the name from the string rather than from isDynamic would
    // silently resurrect it.
    const input = stageInputWithSampler({ isDynamic: 0 });
    const sampler = input.samplers.get(0);

    assert.equal(sampler.isDynamic, false);
    assert.equal(sampler.hasName, false);
    assert.equal(sampler.name, "");
});

test("sampler float fields survive as exact bit patterns", () =>
{
    const input = prepared().GetShaderByIndex(0)
        .effect.techniques[0].passes[0].stageInputs[0];
    const staticSampler = input.signature.staticSamplers[0].descriptor;

    // -0.5 and 3.5 are exactly representable, so the bit pattern is checkable
    // against the literal the synthetic record was written with.
    assert.equal(new DataView(
        Uint32Array.of(staticSampler.mipLODBiasRaw).buffer
    ).getFloat32(0, true), -0.5);
    assert.equal(new DataView(
        Uint32Array.of(staticSampler.maxLODRaw).buffer
    ).getFloat32(0, true), 3.5);
    // A static sampler's border colour is a one-byte enum, not four floats.
    assert.equal(staticSampler.borderColor, 2);
});

test("annotations decode by their type byte", () =>
{
    const effect = prepared().GetShaderByIndex(0).effect;

    const heapView = effect.annotations.get("ADiffuseMap")[0];
    assert.equal(heapView.name, "IsHeapView");
    assert.equal(heapView.boolValue, true);

    const layers = effect.annotations.get("ADetailArray")[0];
    assert.equal(layers.name, "Layers");
    assert.equal(layers.intValue, 3);
});

test("every annotation type decodes through its own member", () =>
{
    const stageAnnotations = prepared().GetShaderByIndex(0)
        .effect.techniques[0].passes[0].stageInputs[0].annotation;
    const byName = new Map(stageAnnotations.map(entry => [ entry.name, entry ]));

    // The value travels as four untyped bytes; only the type byte says which
    // member is meaningful, and rawValue must keep the bits either way.
    assert.equal(byName.get("IsHeapView").boolValue, true);
    assert.equal(byName.get("IsHeapView").rawValue, 1);
    assert.equal(byName.get("Order").intValue, 7);
    assert.equal(byName.get("Scale").floatValue, 2);
    assert.equal(byName.get("Scale").rawValue, 0x40000000);
    assert.equal(byName.get("Usage").stringValue, "diffuse");
});

test("a raytracing library keeps both of its stage-data blocks", () =>
{
    const library = prepared().GetShaderByIndex(0)
        .effect.techniques[1].libraries[0];

    assert.equal(library.payloadSize, 32);
    assert.equal(library.hitGroupName, "HitGroup");
    assert.equal(library.rayGenName, "RayGen");
    assert.equal(library.closestHitName, "ClosestHit");
    assert.equal(library.globalInput.constants[0].name, "AGConstant");
    assert.equal(library.localInput.constants[0].name, "ALConstant");
    // The local block was written with no default constant values.
    assert.equal(library.localInput.constantValueSize, 0);
    assert.equal(library.globalInput.constantValueSize > 0, true);
});

test("a stage keeps its program bytes verbatim", () =>
{
    const input = prepared().GetShaderByIndex(0)
        .effect.techniques[0].passes[0].stageInputs[0];

    assert.deepEqual(
        [ ...input.sourceProgram.bytes ],
        [ 0x44, 0x58, 0x42, 0x43, 0 ]
    );
    assert.equal(input.sourceProgram.shaderSize, 5);
});

test("a stock Carbon body has no backend block", () =>
{
    const pass = prepared().GetShaderByIndex(0).effect.techniques[0].passes[0];
    assert.equal(pass.backendBlock, null);
});

test("render states are retained as authored pairs", () =>
{
    const pass = prepared().GetShaderByIndex(0).effect.techniques[0].passes[0];

    assert.deepEqual(pass.renderStateValues, [
        { state: 3, value: 1 },
        { state: 17, value: 0x80000000 }
    ]);
});

test("releasing the payload drops the retained reader", () =>
{
    const res = prepared();
    assert.ok(res.GetShaderByIndex(0));

    res.ReleasePayload();
    assert.equal(res.GetShaderByIndex(0), null);
});

test("attaching a plain payload drops the retained reader", () =>
{
    const res = prepared();
    assert.ok(res.GetShaderByIndex(0));

    // A container read and an attached payload are two different sources of
    // truth; the second must not be answered out of the first one's reader.
    res.SetPayload({
        permutations: [ { name: "X", options: [ "a" ], defaultOption: 0 } ]
    });
    assert.equal(res.GetShaderByIndex(0), null);
});

test("DoLoad rejects bytes that are not a v15 container", () =>
{
    assert.throws(
        () => new Tr2EffectRes().DoLoad(Uint8Array.of(9, 0, 0, 0)),
        /Unsupported Carbon effect version/u
    );
});
