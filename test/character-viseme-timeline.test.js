import test from "node:test";
import assert from "node:assert/strict";
import { CjsSchema } from "@carbonenginejs/runtime-utils/schema";
import {
    CjsCharacterVisemeFrame,
    CjsCharacterVisemeSet,
    CjsCharacterVisemeTimeline
} from "../npm/dist/index.js";

function CreateVisemeSet()
{
    return CjsCharacterVisemeSet.prepare({
        id: "speech",
        parameterNode: "Visemes",
        neutralVisemeID: "x",
        visemes: [ "AA", "m", "x" ].map(id => ({ id }))
    });
}

test("hydrates ordered timed viseme snapshots", () =>
{
    const timeline = CjsCharacterVisemeTimeline.prepare({
        id: "hello",
        duration: 1,
        frames: [
            { time: 0, weights: {} },
            { time: 0.25, weights: { AA: 1, m: 0.25 } },
            { time: 1, weights: { x: 1 } }
        ]
    }, CreateVisemeSet());

    assert.ok(timeline instanceof CjsCharacterVisemeTimeline);
    assert.ok(timeline.frames.every(frame => frame instanceof CjsCharacterVisemeFrame));
    assert.deepEqual([ ...timeline.frames[1].weights ], [ [ "AA", 1 ], [ "m", 0.25 ] ]);
    assert.equal(CjsSchema.getClassFamily(CjsCharacterVisemeTimeline), "character");
    assert.equal(
        CjsSchema.getField(CjsCharacterVisemeTimeline, "frames").type.itemType,
        "CjsCharacterVisemeFrame"
    );
});

test("samples overlapping weights without winner selection or normalization", () =>
{
    const timeline = CjsCharacterVisemeTimeline.prepare({
        duration: 1,
        frames: [
            { time: 0, weights: {} },
            { time: 0.5, weights: { AA: 1, m: 0.5 } },
            { time: 1, weights: {} }
        ]
    });

    assert.deepEqual([ ...CjsCharacterVisemeTimeline.sample(timeline, 0.25) ], [
        [ "AA", 0.5 ],
        [ "m", 0.25 ]
    ]);
    assert.deepEqual([ ...CjsCharacterVisemeTimeline.sample(timeline, 0.75) ], [
        [ "AA", 0.5 ],
        [ "m", 0.25 ]
    ]);
    assert.deepEqual([ ...CjsCharacterVisemeTimeline.sample(timeline, 1) ], []);
});

test("wraps only explicit looping timelines and creates exact control layers", () =>
{
    const set = CreateVisemeSet();
    const timeline = CjsCharacterVisemeTimeline.prepare({
        duration: 1,
        loop: true,
        frames: [
            { time: 0, weights: {} },
            { time: 0.5, weights: { AA: 1 } },
            { time: 1, weights: {} }
        ]
    }, set);
    const layer = CjsCharacterVisemeTimeline.createControlLayer(timeline, set, 1.25);

    assert.equal(layer.parameters.get("Visemes/AA"), 0.5);
    assert.equal(layer.parameters.size, 1);
    assert.deepEqual([ ...CjsCharacterVisemeTimeline.sample(timeline, -0.25) ], [ [ "AA", 0.5 ] ]);
    assert.deepEqual([ ...CjsCharacterVisemeTimeline.sample(timeline, 2, { loop: false }) ], []);
});

test("rejects invalid timing and weights without guessing", () =>
{
    const set = CreateVisemeSet();

    assert.throws(() => CjsCharacterVisemeTimeline.prepare({
        duration: 1,
        frames: [ { time: 0.5 }, { time: 0.5 } ]
    }), /strictly increasing/);
    assert.throws(() => CjsCharacterVisemeTimeline.prepare({
        duration: 1,
        frames: [ { time: 2 } ]
    }), /outside its duration/);
    assert.throws(() => CjsCharacterVisemeTimeline.prepare({
        duration: 0,
        loop: true
    }), /positive duration/);
    assert.throws(() => CjsCharacterVisemeTimeline.prepare({
        duration: 1,
        frames: [ { time: 0, weights: { unknown: 0.5 } } ]
    }, set), /does not contain "unknown"/);
    assert.throws(() => CjsCharacterVisemeTimeline.prepare({
        duration: 1,
        frames: [ { time: 0, weights: { AA: 2 } } ]
    }, set), /between 0 and 1/);
    assert.throws(() => CjsCharacterVisemeTimeline.sample({ duration: 1 }, Number.NaN), /must be finite/);
});
