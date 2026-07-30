import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

import { validateAudioLibraryDocument } from "../src/library/index.js";

const root = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
);
const jsonPath = path.join(root, "demo", "audio-library.json");
const gzipPath = `${jsonPath}.gz`;

test("committed demo library carries authored SFX and music semantics", () =>
{
    const json = fs.readFileSync(jsonPath);
    const library = JSON.parse(json);
    const graph = library.sfx;

    assert.deepEqual(gunzipSync(fs.readFileSync(gzipPath)), json);
    assert.equal(library.schema, "carbonenginejs.audioLibrary");
    assert.equal(library.schemaVersion, 2);
    assert.equal(library.hasOptionalEnrichment, false);
    assert.equal(validateAudioLibraryDocument(library), true);
    assert.equal(graph.schemaVersion, 2);
    assert.ok(Object.keys(graph.programs).length > 0);

    assert.deepEqual(graph.programs.charge_abyssal_switch, [
        {
            kind: "switch",
            group: "mining_quality",
            value: "abyssal",
        },
    ]);
    assert.equal(
        graph.events.charge_abyssal_switch,
        undefined,
        "the committed artifact retains a real setter-only event",
    );

    assert.deepEqual(
        graph.programs.isInsideFractureBubble_yes
            .map(action => action.kind),
        [ "play", "state" ],
        "the real artifact keeps a setter authored after Play",
    );
    assert.deepEqual(
        graph.programs.isInsideFractureBubble_yes.at(-1),
        {
            kind: "state",
            group: "isInsideFractureBubble",
            value: "yes",
        },
    );
    assert.deepEqual(
        graph.programs.es_screen_2_2_play.map(action => action.kind),
        [
            "state",
            "stop",
            "stop",
            "stop",
            "play",
            "stop",
            "switch",
        ],
        "the real artifact keeps every control action around Play",
    );
    assert.deepEqual(
        graph.programs.Abyssal_exit_play.map(action => action.kind),
        [ "play", "stop", "stop", "state", "state" ],
        "the real artifact preserves mixed Play, Stop, and setter order",
    );
    assert.deepEqual(
        graph.programs.Abyssal_exit_play[1],
        {
            kind: "stop",
            targetId: "597976082",
            scope: "game-object",
            mode: "element",
            curve: 4,
            exceptions: [],
            targetFlags: 0,
            actionFlags: 6,
            delayMs: 2000,
            transitionMs: 300,
        },
    );
    assert.deepEqual(
        graph.programs.tutorial_music_5_05_aura_3765,
        [
            {
                kind: "stop",
                targetId: "0",
                scope: "game-object",
                mode: "all",
                curve: 4,
                exceptions: [
                    {
                        targetId: "955420928",
                        targetFlags: 0,
                    },
                ],
                targetFlags: 0,
                actionFlags: 6,
                delayMs: 4000,
                transitionMs: 10000,
            },
        ],
        "the real artifact retains delayed Stop-All exceptions",
    );

    const switchRoot = graph.nodes[
        graph.events.phased_asteroid_collapsed[0].nodeId
    ];

    assert.equal(switchRoot.type, "switch");
    assert.equal(switchRoot.group, "phased_asteroid_size");
    assert.deepEqual(Object.keys(switchRoot.cases), [
        "large",
        "medium",
        "small",
    ]);

    const blendRoot = graph.nodes[
        graph.events.msg_newscan_probe_scan_results_play[0].nodeId
    ];
    const curves = blendRoot.children.flatMap(child =>
        child.gainCurves ?? []);

    assert.equal(blendRoot.type, "blend");
    assert.equal(curves.length, 4);
    assert.ok(curves.every(curve =>
        curve.rtpc === "msg_newscan_probe_scan_results_rtpc"
        && curve.scope === "object"));
    assert.deepEqual(
        [ ...new Set(curves.flatMap(curve =>
            curve.points.map(point => point.interpolation))) ].sort(),
        [ 5, 9 ],
    );

    const roots = Object.values(graph.events).flat();

    assert.equal(graph.events.Abyssal_exit_play[0].delayMs, 500);
    assert.equal(
        graph.events._nanocoating_atmo_play[0].fadeInMs,
        1000,
    );
    assert.ok(roots.filter(root => root.delayMs !== undefined).length > 800);
    assert.ok(roots.filter(root => root.fadeInMs !== undefined).length > 800);

    const matchedSounds = Object.entries(graph.nodes)
        .filter(([, node]) =>
            node.type === "sound"
            && Array.isArray(node.matchIds));

    assert.ok(matchedSounds.length > 4000);
    assert.ok(matchedSounds.every(([ id, node ]) =>
        node.matchIds[0] === id));

    const nodes = Object.values(graph.nodes);

    assert.ok(nodes.filter(node => node.gainDb !== undefined).length > 3000);
    assert.ok(
        nodes.filter(node => node.pitchCents !== undefined).length > 400,
    );
    assert.ok(
        nodes.filter(node => node.initialDelayMs !== undefined).length > 30,
    );

    assert.deepEqual(
        library.music.eventTargets.dungeon_music_pochven_mining,
        [ 657124212 ],
        "music targets are discovered outside common.bnk and music_ names",
    );
    assert.ok(graph.events.character_select_character);
    assert.deepEqual(
        library.music.eventStops.character_select_character,
        [ 289339910 ],
        "one authored event may contain both SFX and music actions",
    );
});

test("committed demo library contains no optional enrichment payload", () =>
{
    const text = fs.readFileSync(jsonPath, "utf8");

    for (const key of [
        "maxRadiusAttenuation",
        "isLoop",
        "is2D",
        "isVital",
        "eventsStoppedBy",
        "EssentialSoundBank",
    ])
    {
        assert.equal(text.includes(`"${key}"`), false, key);
    }
});
