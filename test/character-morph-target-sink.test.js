import test from "node:test";
import assert from "node:assert/strict";
import {
    CjsCharacterControlBinding,
    CjsCharacterControlState,
    CjsCharacterMorphTargetSink
} from "../npm/dist/index.js";

function CreateTarget(values, { failAt = null } = {})
{
    const weights = new Map(Object.entries(values));
    const calls = [];

    return {
        calls,
        weights,
        GetMorphTargetNames()
        {
            return [ ...weights.keys() ];
        },
        GetMorphTargetWeight(name)
        {
            return weights.get(name) ?? 0;
        },
        SetMorphTargetWeight(name, value)
        {
            calls.push([ name, value ]);
            if (value === failAt) throw new Error("target failed");
            if (!weights.has(name)) return false;
            weights.set(name, value);
            return true;
        }
    };
}

test("drives exact mesh morph targets and restores captured authored weights", () =>
{
    const head = CreateTarget({ Smile: 0.2, Blink: 0 });
    const hair = CreateTarget({ Smile: 0.4 });
    const sink = new CjsCharacterMorphTargetSink([ head, hair ]);
    const binding = new CjsCharacterControlBinding(sink);

    binding.Apply(CjsCharacterControlState.from({ morphs: { Smile: 0.9 } }));
    assert.equal(head.weights.get("Smile"), 0.9);
    assert.equal(hair.weights.get("Smile"), 0.9);

    binding.Apply(CjsCharacterControlState.from({ morphs: { Smile: -0.5, Blink: 1 } }));
    assert.equal(head.weights.get("Smile"), -0.5);
    assert.equal(hair.weights.get("Smile"), -0.5);
    assert.equal(head.weights.get("Blink"), 1);

    binding.Apply(CjsCharacterControlState.from({}));
    assert.equal(head.weights.get("Smile"), 0.2);
    assert.equal(hair.weights.get("Smile"), 0.4);
    assert.equal(head.weights.get("Blink"), 0);
    assert.equal(sink.Reset(), false);
});

test("rejects unavailable or malformed targets without guessing a zero baseline", () =>
{
    assert.throws(() => new CjsCharacterMorphTargetSink({}), /requires GetMorphTargetNames/u);

    const duplicate = CreateTarget({ Smile: 0 });
    duplicate.GetMorphTargetNames = () => [ "Smile", "Smile" ];
    const duplicateSink = new CjsCharacterMorphTargetSink(duplicate);
    assert.throws(() => duplicateSink.SetMorph("Smile", 1), /duplicate name/u);

    const sink = new CjsCharacterMorphTargetSink(CreateTarget({ Smile: 0.25 }));
    assert.throws(() => sink.SetMorph("Unknown", 1), /unavailable/u);
    assert.throws(() => sink.SetMorph("Smile", Number.NaN), /must be finite/u);
    assert.equal(sink.ResetMorph("Smile"), false);
});

test("rolls back targets already changed when a later morph target fails", () =>
{
    const first = CreateTarget({ Smile: 0.2 });
    const second = CreateTarget({ Smile: 0.4 }, { failAt: 1 });
    const sink = new CjsCharacterMorphTargetSink([ first, second ]);

    assert.throws(() => sink.SetMorph("Smile", 1), /target failed/u);
    assert.equal(first.weights.get("Smile"), 0.2);
    assert.equal(second.weights.get("Smile"), 0.4);
    assert.equal(sink.Reset(), false);
});
