import test from "node:test";
import assert from "node:assert/strict";

import { CjsCarbonEffectWriter } from "../../src/format/carbonEffect/CjsCarbonEffectWriter.js";
import { CjsCarbonEffectReader } from "../../src/format/carbonEffect/CjsCarbonEffectReader.js";
import {
    buildSyntheticDescription,
    SYNTHETIC_PERMUTATIONS
} from "../format/carbonEffectSynthetic.js";
import { Tr2EffectRes } from "../../src/resource/shader/Tr2EffectRes.js";

/**
 * Records in, classes, records out — and the two record trees must agree.
 *
 * This is the check that makes the write direction trustworthy without a second
 * mapping to review. Every field the reader decodes has to survive being held as
 * a class and emitted again, so a field dropped on either side shows up as a
 * tree difference rather than as bytes nobody looks at.
 *
 * Record equality is the claim rather than byte equality, because byte equality
 * also depends on arena layout, which the writer owns and which no class can
 * influence. The container-level test below covers that half separately.
 */

const COMPILER_VERSION = [ 1, 2, 6, 0 ];
const SOURCE_HASH = "0123456789abcdef0123456789abcdef";

/**
 * The synthetic body with its effect-level annotation groups in Carbon's order.
 *
 * Carbon sorts annotation keys by `strcmp` before writing, at both levels. The
 * shared fixture authors its stage annotations sorted but its effect-level
 * groups in declaration order, which no file Carbon wrote would be. Sorting them
 * here is what makes byte equality a meaningful claim rather than a claim about
 * a fixture. That the emitter sorts is proven separately below.
 *
 * @param {string} label Body name prefix.
 * @returns {object} Description record tree in canonical order.
 */
function canonicalDescription(label)
{
    const description = buildSyntheticDescription({ label });
    description.annotations.sort(
        (left, right) => (left.name.value < right.name.value ? -1 : 1)
    );
    return description;
}

function buildContainer()
{
    const writer = new CjsCarbonEffectWriter({
        compilerVersion: COMPILER_VERSION,
        sourceHash: SOURCE_HASH
    });
    for (const axis of SYNTHETIC_PERMUTATIONS) writer.addPermutation(axis);
    for (let index = 0; index < 4; index += 1)
    {
        writer.addBody(index, canonicalDescription(`P${index}`));
    }
    return writer.toBytes();
}

/**
 * Strips arena offsets from a record tree.
 *
 * A string reference carries both an offset and its text. The offset is assigned
 * by whichever writer built the arena, so comparing it would compare arena
 * layouts rather than content — and the emitters deliberately leave it at zero.
 *
 * @param {*} value Record tree.
 * @returns {*} The same tree with every string reference reduced to its text.
 */
function withoutOffsets(value)
{
    if (value instanceof Uint8Array) return Array.from(value);
    if (Array.isArray(value)) return value.map(withoutOffsets);
    if (!value || typeof value !== "object") return value;

    // A string reference: {offset, value}. A blob reference keeps its size,
    // which is meaningful, but its offset is arena-assigned like any other.
    const keys = Object.keys(value).sort();
    if (keys.length === 2 && keys[0] === "offset" && keys[1] === "value")
    {
        return { value: value.value };
    }
    const result = {};
    for (const key of Object.keys(value))
    {
        if (key === "offset" && "bytes" in value) continue;
        result[key] = withoutOffsets(value[key]);
    }
    return result;
}

test("a body survives records -> classes -> records unchanged", () =>
{
    const bytes = buildContainer();
    const reader = new CjsCarbonEffectReader(bytes);
    const res = new Tr2EffectRes().DoLoad(bytes);

    for (let index = 0; index < 4; index += 1)
    {
        assert.deepEqual(
            withoutOffsets(res.GetShaderByIndex(index).effect.toCarbonBinary()),
            withoutOffsets(reader.readDescription(index)),
            `permutation ${index} did not round-trip`
        );
    }
});

test("a re-emitted body reads back as the same container", () =>
{
    const bytes = buildContainer();
    const res = new Tr2EffectRes().DoLoad(bytes);

    const rebuilt = new CjsCarbonEffectWriter({
        compilerVersion: COMPILER_VERSION,
        sourceHash: SOURCE_HASH
    });
    for (const axis of SYNTHETIC_PERMUTATIONS) rebuilt.addPermutation(axis);
    for (let index = 0; index < 4; index += 1)
    {
        rebuilt.addBody(
            index,
            res.GetShaderByIndex(index).effect.toCarbonBinary()
        );
    }

    // Byte equality against the original: the classes carried enough to
    // reconstruct the file, not merely enough to describe it.
    assert.deepEqual(Array.from(rebuilt.toBytes()), Array.from(bytes));
});

test("a re-emitted body loads back into equal classes", () =>
{
    const res = new Tr2EffectRes().DoLoad(buildContainer());
    const first = res.GetShaderByIndex(0);

    const rebuilt = new CjsCarbonEffectWriter({
        compilerVersion: COMPILER_VERSION,
        sourceHash: SOURCE_HASH
    });
    rebuilt.addPermutation(SYNTHETIC_PERMUTATIONS[0]);
    rebuilt.addBody(0, first.effect.toCarbonBinary());
    rebuilt.addBody(1, first.effect.toCarbonBinary());

    const second = new Tr2EffectRes()
        .DoLoad(rebuilt.toBytes())
        .GetShaderByIndex(0);

    assert.deepEqual(second.GetValues(), first.GetValues());
});

test("an emitted stage omits absent stage slots", () =>
{
    const res = new Tr2EffectRes().DoLoad(buildContainer());
    const record = res.GetShaderByIndex(0).effect.toCarbonBinary();

    // The class holds six slots; the file stores only the populated ones.
    assert.equal(record.techniques[0].passes[0].stages.length, 2);
    assert.deepEqual(
        record.techniques[0].passes[0].stages.map(stage => stage.type),
        [ 0, 1 ]
    );
    assert.equal(record.techniques[0].passes[1].stages.length, 1);
    assert.equal(record.techniques[0].passes[1].stages[0].type, 2);
});

test("an emitted UAV record carries no isSRGB field", () =>
{
    const res = new Tr2EffectRes().DoLoad(buildContainer());
    const record = res.GetShaderByIndex(0).effect.toCarbonBinary();
    const stage = record.techniques[0].passes[0].stages[0];

    assert.ok(stage.uavs.length > 0);
    for (const uav of stage.uavs)
    {
        assert.equal(Object.hasOwn(uav, "isSRGB"), false);
    }
    // A texture record does carry it, so the difference is real and not an
    // artefact of the synthetic body declaring nothing.
    assert.equal(Object.hasOwn(stage.textures[0], "isSRGB"), true);
});

test("emitted collections are in Carbon's order, not insertion order", () =>
{
    const res = new Tr2EffectRes().DoLoad(buildContainer());
    const shader = res.GetShaderByIndex(0);
    const input = shader.effect.techniques[0].passes[0].stageInputs[0];

    // Re-insert the resources in descending register order. Carbon holds these
    // in a std::map and writes them ascending, so the emitter must sort rather
    // than trust the map it was handed.
    const entries = [ ...input.resources ].reverse();
    input.resources = new Map(entries);
    assert.deepEqual([ ...input.resources.keys() ], [ 4, 0 ]);

    const record = shader.effect.toCarbonBinary();
    assert.deepEqual(
        record.techniques[0].passes[0].stages[0].textures
            .map(texture => texture.registerIndex),
        [ 0, 4 ]
    );
});

test("emitted annotations are sorted by name", () =>
{
    const res = new Tr2EffectRes().DoLoad(buildContainer());
    const shader = res.GetShaderByIndex(0);

    const groups = [ ...shader.effect.annotations ].reverse();
    shader.effect.annotations = new Map(groups);

    const record = shader.effect.toCarbonBinary();
    const names = record.annotations.map(group => group.name.value);
    assert.deepEqual(names, [ ...names ].sort());

    const stageAnnotations = record.techniques[0].passes[0].stages[0]
        .annotations.map(entry => entry.name.value);
    assert.deepEqual(stageAnnotations, [ ...stageAnnotations ].sort());
});
