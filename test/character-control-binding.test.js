import test from "node:test";
import assert from "node:assert/strict";
import {
    CjsCharacterControlApplicator,
    CjsCharacterControlBinding,
    CjsCharacterControlState,
    CjsCharacterGraph
} from "../npm/dist/index.js";

function CreateSink({ failParameter = false } = {})
{
    const calls = [];
    return {
        calls,
        SetMorph(name, value)
        {
            calls.push([ "set-morph", name, value ]);
        },
        ResetMorph(name)
        {
            calls.push([ "reset-morph", name ]);
        },
        SetParameter(name, value)
        {
            if (failParameter)
            {
                throw new Error("parameter sink failed");
            }
            calls.push([ "set-parameter", name, value ]);
        },
        ResetParameter(name)
        {
            calls.push([ "reset-parameter", name ]);
        },
        SetBoneOffset(name, value)
        {
            calls.push([ "set-bone", name, Array.from(value) ]);
        },
        ResetBoneOffset(name)
        {
            calls.push([ "reset-bone", name ]);
        },
        SetActivePose(name)
        {
            calls.push([ "set-pose", name ]);
        },
        ResetActivePose(name)
        {
            calls.push([ "reset-pose", name ]);
        }
    };
}

test("binds complete character-control snapshots with stable diff and reset behavior", () =>
{
    const sink = CreateSink();
    const binding = new CjsCharacterControlBinding(sink);
    const first = CjsCharacterControlState.from({
        morphs: { Smile: 0.75, Brow: -0.2 },
        parameters: { Blink: 0.5 },
        boneOffsets: { Head: [ 1, 2, 3 ] },
        activePose: "portrait"
    });

    assert.equal(binding.Apply(first), true);
    assert.deepEqual(sink.calls, [
        [ "set-morph", "Brow", -0.2 ],
        [ "set-morph", "Smile", 0.75 ],
        [ "set-parameter", "Blink", 0.5 ],
        [ "set-bone", "Head", [ 1, 2, 3 ] ],
        [ "set-pose", "portrait" ]
    ]);

    sink.calls.length = 0;
    first.boneOffsets.get("Head")[0] = 99;
    const equivalent = CjsCharacterControlState.from({
        morphs: { Brow: -0.2, Smile: 0.75 },
        parameters: { Blink: 0.5 },
        boneOffsets: { Head: [ 1, 2, 3 ] },
        activePose: "portrait"
    });
    assert.equal(binding.Apply(equivalent), false, "the binding ledger owns its vector snapshot");
    assert.deepEqual(sink.calls, []);

    const second = CjsCharacterControlState.from({
        morphs: { Smile: 0.25 },
        parameters: { Talk: 1 },
        boneOffsets: { Jaw: [ 0, 1, 0 ] },
        activePose: "speaking"
    });
    assert.equal(binding.Apply(second), true);
    assert.deepEqual(sink.calls, [
        [ "reset-morph", "Brow" ],
        [ "set-morph", "Smile", 0.25 ],
        [ "reset-parameter", "Blink" ],
        [ "set-parameter", "Talk", 1 ],
        [ "reset-bone", "Head" ],
        [ "set-bone", "Jaw", [ 0, 1, 0 ] ],
        [ "reset-pose", "portrait" ],
        [ "set-pose", "speaking" ]
    ]);

    sink.calls.length = 0;
    assert.equal(binding.Apply(new CjsCharacterControlState()), true);
    assert.deepEqual(sink.calls, [
        [ "reset-morph", "Smile" ],
        [ "reset-parameter", "Talk" ],
        [ "reset-bone", "Jaw" ],
        [ "reset-pose", "speaking" ]
    ]);
    sink.calls.length = 0;
    assert.equal(binding.Reset(), false);
    assert.deepEqual(sink.calls, []);
});

test("prevalidates control state and paired sink capabilities before mutation", () =>
{
    const calls = [];
    const binding = new CjsCharacterControlBinding({
        SetMorph(name, value)
        {
            calls.push([ name, value ]);
        }
    });
    const state = CjsCharacterControlState.from({ morphs: { Smile: 1 } });

    assert.throws(() => binding.Apply(state), /paired SetMorph and ResetMorph/);
    assert.deepEqual(calls, []);
    assert.throws(() => binding.Apply({}), /requires a CjsCharacterControlState/);

    const invalid = new CjsCharacterControlState();
    invalid.boneOffsets = new Map([ [ "Head", [ 0, Number.NaN, 0 ] ] ]);
    assert.throws(() => binding.Apply(invalid), /bone offset "Head" must be finite/);
    assert.deepEqual(calls, []);
});

test("retains enough successful binding state to recover after a sink failure", () =>
{
    const sink = CreateSink({ failParameter: true });
    const binding = new CjsCharacterControlBinding(sink);
    const state = CjsCharacterControlState.from({
        morphs: { Smile: 1 },
        parameters: { Blink: 1 }
    });

    assert.throws(() => binding.Apply(state), /parameter sink failed/);
    assert.deepEqual(sink.calls, [ [ "set-morph", "Smile", 1 ] ]);

    sink.calls.length = 0;
    assert.equal(binding.Reset(), true);
    assert.deepEqual(sink.calls, [ [ "reset-morph", "Smile" ] ]);
});

test("binds recipe-authored base morphs together with live layers", () =>
{
    const graph = CjsCharacterGraph.from({
        morphs: { Smile: 0.2 },
        activePose: "neutral"
    });
    const state = new CjsCharacterControlApplicator().Compose(graph, [
        { id: "expression", influence: 0.5, morphs: { Smile: 1 } },
        { id: "viseme", priority: 10, blendMode: "add", morphs: { JawOpen: 0.4 } }
    ]);
    const sink = CreateSink();
    const binding = new CjsCharacterControlBinding(sink);

    assert.equal(binding.Apply(state), true);
    assert.deepEqual(sink.calls[0], [ "set-morph", "JawOpen", 0.4 ]);
    assert.equal(sink.calls[1][0], "set-morph");
    assert.equal(sink.calls[1][1], "Smile");
    assert.ok(Math.abs(sink.calls[1][2] - 0.6) < 1e-6);
    assert.deepEqual(sink.calls[2], [ "set-pose", "neutral" ]);
});
