import assert from "node:assert/strict";
import test from "node:test";

import {
    CjsBusDuckingController,
    indexBusDuckingCatalog,
} from "../src/internal/busDucking.js";

function Catalog(sources)
{
    return { schemaVersion: 1, sources };
}

function Source({
    recoveryMs = 1000,
    maxDuckVolumeDb = -96,
    targets,
})
{
    return { recoveryMs, maxDuckVolumeDb, targets };
}

function Target(targetBusId, overrides = {})
{
    return {
        targetBusId: String(targetBusId),
        volumeDb: -6,
        fadeOutMs: 1000,
        fadeInMs: 1000,
        curve: 4,
        targetProperty: "bus-volume",
        ...overrides,
    };
}

test("Audio Bus ducking catalogs reject noncanonical and unsupported rules", () =>
{
    assert.throws(() => indexBusDuckingCatalog(Catalog({
        "01": Source({ targets: [ Target("2") ] }),
    })), /canonical positive id/u);
    assert.throws(() => indexBusDuckingCatalog(Catalog({
        "1": Source({ targets: [ Target("1") ] }),
    })), /cannot target its source bus/u);
    assert.throws(() => indexBusDuckingCatalog(Catalog({
        "1": Source({ targets: [
            Target("2"),
            Target("2", { targetProperty: "voice-volume" }),
        ] }),
    })), /duplicates 2/u);
    assert.throws(() => indexBusDuckingCatalog(Catalog({
        "1": Source({
            maxDuckVolumeDb: -10,
            targets: [ Target("2", { volumeDb: -12 }) ],
        }),
    })), /must be from -10 to 0/u);
    assert.throws(() => indexBusDuckingCatalog(Catalog({
        "1": Source({
            targets: [ Target("2", { targetProperty: "pitch" }) ],
        }),
    })), /targetProperty/u);
});

test("Audio Bus ducking fades in linear gain and honors recovery", () =>
{
    const controller = new CjsBusDuckingController(Catalog({
        "1": Source({
            recoveryMs: 1000,
            targets: [ Target("2", {
                volumeDb: -6,
                fadeOutMs: 2000,
                fadeInMs: 2000,
            }) ],
        }),
    }));
    const token = controller.ScheduleActivity([ "1" ], 1, 4);
    const halfGain = (1 + 10 ** (-6 / 20)) / 2;

    assert.equal(controller.HasSource("1"), true);
    assert.equal(controller.HasSource("2"), false);
    assert.equal(controller.HasTarget("1"), false);
    assert.equal(controller.HasTarget("2"), true);
    assert.equal(controller.PathHasTarget([ "3", "2" ]), true);
    assert.equal(controller.PathHasTarget([ "3", "4" ]), false);
    assert.equal(controller.EvaluateGainDb([ "2" ], 0), 0);
    assert.equal(controller.EvaluateGainDb([ "2" ], 1), 0);
    assert.ok(Math.abs(
        controller.EvaluateGainDb([ "2" ], 2)
        - 20 * Math.log10(halfGain),
    ) < 1e-9);
    assert.ok(Math.abs(controller.EvaluateGainDb([ "2" ], 3) + 6) < 1e-9);
    assert.ok(Math.abs(controller.EvaluateGainDb([ "2" ], 5) + 6) < 1e-9);
    assert.ok(Math.abs(
        controller.EvaluateGainDb([ "2" ], 6)
        - 20 * Math.log10(halfGain),
    ) < 1e-9);
    assert.equal(controller.EvaluateGainDb([ "2" ], 7), 0);
    assert.equal(token.End(3), true);
    assert.equal(token.End(2), true);
    assert.equal(token.End(2), false);
    controller.Dispose();
    assert.equal(controller.HasSource("1"), false);
    assert.equal(controller.HasTarget("2"), false);
    assert.equal(controller.PathHasTarget([ "2" ]), false);
});

test("activity settlement only shortens known intervals and cancellation removes them", () =>
{
    const controller = new CjsBusDuckingController(Catalog({
        "1": Source({
            recoveryMs: 0,
            targets: [ Target("2", {
                fadeOutMs: 0,
                fadeInMs: 0,
            }) ],
        }),
    }));
    const finite = controller.ScheduleActivity([ "1" ], 1, 4);

    assert.equal(finite.End(8), false, "a late callback cannot extend activity");
    assert.equal(controller.EvaluateGainDb([ "2" ], 5), 0);
    assert.equal(finite.End(3), true, "an earlier physical end shortens activity");
    assert.equal(controller.EvaluateGainDb([ "2" ], 3.5), 0);

    const future = controller.ScheduleActivity([ "1" ], 10, Infinity);

    assert.equal(future.End(12), true);
    assert.equal(future.Cancel(9), true, "a never-started source is removed");
    assert.equal(controller.EvaluateGainDb([ "2" ], 11), 0);

    controller.ScheduleActivity([ "1" ], 20, 20);
    assert.equal(controller.EvaluateGainDb([ "2" ], 20), 0);
});

test("same-source overlap is boolean while different sources accumulate", () =>
{
    const controller = new CjsBusDuckingController(Catalog({
        "1": Source({
            recoveryMs: 0,
            targets: [
                Target("10", { volumeDb: -8, fadeOutMs: 0, fadeInMs: 0 }),
                Target("11", { volumeDb: -8, fadeOutMs: 0, fadeInMs: 0 }),
            ],
            maxDuckVolumeDb: -10,
        }),
        "2": Source({
            recoveryMs: 0,
            targets: [
                Target("10", { volumeDb: -8, fadeOutMs: 0, fadeInMs: 0 }),
            ],
            maxDuckVolumeDb: -10,
        }),
    }));

    controller.ScheduleActivity([ "1" ], 0, 10);
    controller.ScheduleActivity([ "1" ], 1, 9);
    assert.equal(controller.EvaluateGainDb([ "10", "11" ], 2), -10);

    controller.ScheduleActivity([ "2" ], 0, 10);
    assert.equal(controller.EvaluateGainDb([ "10", "11" ], 2), -18);
    assert.equal(
        controller.EvaluateGainDb([ "10" ], 2, "voice-volume"),
        0,
    );
});

test("duck target-property queries preserve placement and collective floors", () =>
{
    const controller = new CjsBusDuckingController(Catalog({
        "1": Source({
            recoveryMs: 0,
            maxDuckVolumeDb: -10,
            targets: [
                Target("10", {
                    volumeDb: -8,
                    fadeOutMs: 0,
                    fadeInMs: 0,
                    targetProperty: "bus-volume",
                }),
                Target("11", {
                    volumeDb: -8,
                    fadeOutMs: 0,
                    fadeInMs: 0,
                    targetProperty: "voice-volume",
                }),
            ],
        }),
        "2": Source({
            recoveryMs: 0,
            targets: [ Target("11", {
                volumeDb: -3,
                fadeOutMs: 0,
                fadeInMs: 0,
                targetProperty: "bus-volume",
            }) ],
        }),
    }));

    controller.ScheduleActivity([ "1", "2" ], 0, 10);

    assert.equal(controller.HasTarget("10", "bus-volume"), true);
    assert.equal(controller.HasTarget("10", "voice-volume"), false);
    assert.equal(controller.PathHasTarget([ "10" ], "bus-volume"), true);
    assert.equal(controller.EvaluateGainDb(
        [ "10", "11" ],
        1,
        "bus-volume",
    ), -11);
    assert.equal(controller.EvaluateGainDb(
        [ "10", "11" ],
        1,
        "voice-volume",
    ), -8);
    assert.equal(
        controller.CanSplitTargetProperties([ "10", "11" ]),
        false,
        "one source cannot have its collective floor split across stages",
    );
    assert.equal(
        controller.CanSplitTargetProperties([ "10" ]),
        true,
    );
    assert.deepEqual(
        controller.TransitionBoundaries(
            [ "10", "11" ],
            0,
            "bus-volume",
        ),
        [ 10 ],
    );
});

test("reactivation during recovery does not restart fade-out", () =>
{
    const controller = new CjsBusDuckingController(Catalog({
        "1": Source({
            recoveryMs: 2000,
            targets: [ Target("2", {
                volumeDb: -12,
                fadeOutMs: 4000,
                fadeInMs: 1000,
            }) ],
        }),
    }));

    controller.ScheduleActivity([ "1" ], 0, 1);
    controller.ScheduleActivity([ "1" ], 2, 5);

    assert.ok(Math.abs(controller.EvaluateGainDb([ "2" ], 4) + 12) < 1e-9);
    assert.ok(Math.abs(controller.EvaluateGainDb([ "2" ], 7) + 12) < 1e-9);
    assert.equal(controller.EvaluateGainDb([ "2" ], 8), 0);
});
