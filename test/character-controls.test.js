import test from "node:test";
import assert from "node:assert/strict";
import { CjsSchema } from "@carbonenginejs/runtime-utils/schema";
import {
    CjsCharacterBlendshapeLimits,
    CjsCharacterControlApplicator,
    CjsCharacterControlLayer,
    CjsCharacterControlState,
    CjsCharacterGraph,
    CjsCharacterUniqueCharacter
} from "../npm/dist/index.js";

test("hydrates typed backend-neutral character control records", () =>
{
    const layer = CjsCharacterControlLayer.from({
        id: "expression",
        priority: 10,
        blendMode: "add",
        morphs: { Smile: 0.5 }
    });
    const state = CjsCharacterControlState.from({
        morphs: { Smile: 0.5 },
        appliedLayerIDs: [ "expression" ]
    });

    assert.ok(layer.morphs instanceof Map);
    assert.ok(layer.parameters instanceof Map);
    assert.ok(layer.boneOffsets instanceof Map);
    assert.ok(state.morphs instanceof Map);
    assert.ok(state.parameters instanceof Map);
    assert.ok(state.boneOffsets instanceof Map);
    assert.deepEqual(layer.GetValues().morphs, { Smile: 0.5 });
    assert.equal(CjsSchema.getClassFamily(CjsCharacterControlLayer), "character");
    assert.equal(CjsSchema.getField(CjsCharacterControlLayer, "morphs").type.valueType, "float32");
    assert.equal(CjsSchema.getField(CjsCharacterControlLayer, "parameters").type.valueType, "float32");
    assert.equal(CjsSchema.getField(CjsCharacterControlLayer, "boneOffsets").type.valueType, "vec3");
    assert.equal(CjsSchema.getField(CjsCharacterControlState, "appliedLayerIDs").type.itemType, "string");
});

test("converts authored unique-character values through a public static control layer helper", () =>
{
    const character = CjsCharacterUniqueCharacter.from({
        id: "portrait-pilot",
        blendshapeWeights: { BrowRaise: -0.4, Smile: 1.2 },
        animationOffsets: { Head: [ 1, 2, 3 ] }
    });
    const layer = CjsCharacterControlLayer.fromUniqueCharacter(character, {
        priority: -10,
        influence: 0.75
    });

    assert.ok(layer instanceof CjsCharacterControlLayer);
    assert.equal(layer.id, "portrait-pilot");
    assert.equal(layer.priority, -10);
    assert.equal(layer.influence, 0.75);
    assert.equal(layer.blendMode, "replace");
    assert.equal(layer.morphs.get("BrowRaise"), -0.4);
    assert.equal(layer.morphs.get("Smile"), 1.2);
    assert.deepEqual(Array.from(layer.boneOffsets.get("Head")), [ 1, 2, 3 ]);

    layer.morphs.set("Smile", 0);
    layer.boneOffsets.get("Head")[0] = 99;
    assert.equal(character.blendshapeWeights.get("Smile"), 1.2);
    assert.deepEqual(Array.from(character.animationOffsets.get("Head")), [ 1, 2, 3 ]);
});

test("composes expression and viseme layers without mutating authored graph state", () =>
{
    const graph = CjsCharacterGraph.from({
        activePose: "neutral",
        morphs: {
            Brow: -1,
            Overshoot: 1.5,
            Smile: 0.2
        }
    });
    const applicator = new CjsCharacterControlApplicator();
    const layers = [
        {
            id: "viseme",
            priority: 20,
            blendMode: "add",
            influence: 0.5,
            morphs: { JawOpen: 1, Smile: 0.2 },
            activePose: "speaking"
        },
        {
            id: "expression",
            priority: 10,
            blendMode: "replace",
            influence: 0.5,
            morphs: { Brow: -2, Smile: 1 },
            activePose: "portrait"
        }
    ];

    const result = applicator.Compose(graph, layers);

    assert.ok(result instanceof CjsCharacterControlState);
    assert.ok(Math.abs(result.morphs.get("Smile") - 0.7) < 1e-6);
    assert.equal(result.morphs.get("Brow"), -1.5);
    assert.equal(result.morphs.get("JawOpen"), 0.5);
    assert.equal(result.morphs.get("Overshoot"), 1.5,
        "values outside zero-to-one remain valid without exact limits");
    assert.equal(result.activePose, "speaking");
    assert.deepEqual(result.appliedLayerIDs, [ "expression", "viseme" ]);
    assert.deepEqual(graph.GetValues().morphs, {
        Brow: -1,
        Overshoot: 1.5,
        Smile: 0.2
    });
    assert.equal(graph.activePose, "neutral");

    const limits = CjsCharacterBlendshapeLimits.from({
        id: "female_head",
        limits: {
            Brow: [ -1.2, -0.2 ],
            Smile: [ 0, 0.65 ]
        }
    });
    const clamped = applicator.Compose(graph, layers, { limits });

    assert.equal(clamped.morphs.get("Brow"), -1.2);
    assert.equal(clamped.morphs.get("Smile"), 0.65);
    assert.equal(clamped.morphs.get("JawOpen"), 0.5,
        "names absent from the supplied exact limits remain unclamped");
    assert.equal(clamped.morphs.get("Overshoot"), 1.5);
});

test("composes parameters, translation-only bone offsets, and explicit pose clearing", () =>
{
    const graph = CjsCharacterGraph.from({ activePose: "neutral" });
    const applicator = new CjsCharacterControlApplicator();
    const result = applicator.Compose(graph, [
        {
            id: "tracking",
            priority: 10,
            influence: 0.5,
            parameters: { Blink: 0.8 },
            boneOffsets: { Head: [ 2, 4, 6 ] },
            activePose: "portrait"
        },
        {
            id: "speech",
            priority: 20,
            blendMode: "add",
            parameters: { Blink: 0.1, Jaw: 0.5 },
            boneOffsets: { Head: [ 1, -2, 3 ], Jaw: [ 0, 1, 0 ] },
            activePose: ""
        }
    ]);

    assert.ok(Math.abs(result.parameters.get("Blink") - 0.5) < 1e-6);
    assert.equal(result.parameters.get("Jaw"), 0.5);
    assert.deepEqual(Array.from(result.boneOffsets.get("Head")), [ 2, 0, 6 ]);
    assert.deepEqual(Array.from(result.boneOffsets.get("Jaw")), [ 0, 1, 0 ]);
    assert.equal(result.activePose, "", "an explicit empty pose clears lower-priority selection");
});

test("uses stable caller order within one character control priority", () =>
{
    const graph = CjsCharacterGraph.from({ morphs: { Smile: 0 } });
    const applicator = new CjsCharacterControlApplicator();
    const result = applicator.Compose(graph, [
        { id: "first", priority: 5, morphs: { Smile: 0.25 }, activePose: "first" },
        { id: "disabled", priority: 5, enabled: false, morphs: { Smile: 99 }, activePose: "disabled" },
        { id: "second", priority: 5, morphs: { Smile: 0.75 }, activePose: "second" }
    ]);

    assert.equal(result.morphs.get("Smile"), 0.75);
    assert.equal(result.activePose, "second");
    assert.deepEqual(result.appliedLayerIDs, [ "first", "second" ]);
});

test("rejects invalid character control inputs deterministically", () =>
{
    const graph = new CjsCharacterGraph();
    const applicator = new CjsCharacterControlApplicator();

    assert.throws(() => applicator.Compose({}, []), /require a CjsCharacterGraph/);
    assert.throws(() => applicator.Compose(graph, {}), /must be an array/);
    assert.throws(() => applicator.Compose(graph, [ { id: "" } ]), /non-empty string/);
    assert.throws(
        () => applicator.Compose(graph, [ { id: "same" }, { id: "same" } ]),
        /Duplicate character control layer id/
    );
    assert.throws(
        () => applicator.Compose(graph, [ { id: "bad", blendMode: "multiply" } ]),
        /unsupported blend mode/
    );
    assert.throws(
        () => applicator.Compose(graph, [ { id: "bad", influence: 1.1 } ]),
        /influence must be between 0 and 1/
    );
    assert.throws(
        () => applicator.Compose(graph, [ { id: "bad", morphs: { Smile: Infinity } } ]),
        /must be finite/
    );
    assert.throws(
        () => applicator.Compose(graph, [ { id: "bad", morphs: new Map([ [ "", 1 ] ]) } ]),
        /name must be a non-empty string/
    );
    assert.throws(
        () => applicator.Compose(graph, [ { id: "bad", boneOffsets: { Head: [ 0, 1 ] } } ]),
        /must contain three components/
    );
    const first = CjsCharacterControlLayer.from({ id: "first" });
    const second = CjsCharacterControlLayer.from({ id: "second", blendMode: "add" });
    first.morphs = new Map([ [ "Overflow", Number.MAX_VALUE ] ]);
    second.morphs = new Map([ [ "Overflow", Number.MAX_VALUE ] ]);
    assert.throws(
        () => applicator.Compose(graph, [ first, second ]),
        /morph "Overflow" overflowed/
    );
    assert.throws(
        () => applicator.Compose(graph, [], { limits: { limits: { Smile: [ 1, -1 ] } } }),
        /limit "Smile" is invalid/
    );
});
