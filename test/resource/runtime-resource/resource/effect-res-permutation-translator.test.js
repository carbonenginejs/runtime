import test from "node:test";
import assert from "node:assert/strict";

import { CjsCarbonEffectWriter } from "../../../../src/resource/format/carbonEffect/CjsCarbonEffectWriter.js";
import { buildSyntheticDescription, SYNTHETIC_PERMUTATIONS } from "../format/carbonEffectSynthetic.js";
import { Tr2EffectRes } from "../../../../src/resource/shader/Tr2EffectRes.js";

// A browser backend translates the default permutation at load and hands the
// resource a translator for the rest; the first request for another permutation
// translates it and reads its body from the translation.

/** A container whose four indices carry bodies labelled by `labels`. */
function container(labels)
{
    const writer = new CjsCarbonEffectWriter({ compilerVersion: [ 1, 2, 6, 0 ], sourceHash: "0123456789abcdef0123456789abcdef" });
    for (const axis of SYNTHETIC_PERMUTATIONS) writer.addPermutation(axis);
    labels.forEach((label, index) => writer.addBody(index, buildSyntheticDescription({ label })));
    return writer.toBytes();
}

const nameOf = shader => shader.effect.techniques[0].passes[0].stageInputs[0].constants[0].name;

test("a permutation the load did not translate is translated on first request", () =>
{
    const calls = [];
    const res = new Tr2EffectRes();
    res.SetPermutationTranslator(permutation =>
    {
        calls.push(permutation);
        return { bytes: container([ "X", "T", "X", "X" ]), indices: [ 1 ] };
    }, [ 2 ]);
    res.DoLoad(container([ "U", "U", "D", "U" ]));

    assert.equal(nameOf(res.GetShaderByIndex(2)), "DConstant", "the loaded body serves its own index");
    assert.equal(calls.length, 0);

    assert.equal(nameOf(res.GetShaderByIndex(1)), "TConstant", "index 1 comes from its translation");
    assert.deepEqual(calls, [ [ { name: "SKINNED", value: "1" }, { name: "DETAIL", value: "off" } ] ]);

    res.ReleaseResources();
    assert.equal(nameOf(res.GetShaderByIndex(1)), "TConstant");
    assert.equal(calls.length, 1, "a translated permutation is not translated twice");
});

test("a translation that lacks the requested body is an error, not a wrong body", () =>
{
    const res = new Tr2EffectRes();
    res.SetPermutationTranslator(() => ({ bytes: container([ "X", "X", "X", "X" ]), indices: [ 3 ] }), [ 2 ]);
    res.DoLoad(container([ "U", "U", "D", "U" ]));

    assert.throws(() => res.GetShaderByIndex(0), /produced no body/);
});

test("without a translator every index reads from the loaded container", () =>
{
    const res = new Tr2EffectRes().DoLoad(container([ "A", "B", "C", "C" ]));

    assert.equal(nameOf(res.GetShaderByIndex(1)), "BConstant");
});
