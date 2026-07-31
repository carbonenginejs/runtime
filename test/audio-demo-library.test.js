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
        graph.programs.es_screen_2_2_play
            .map(action => action.kind),
        [ "state", "stop", "stop", "stop", "play", "stop", "switch" ],
        "a real filter-State path now retains its complete action order",
    );
    assert.deepEqual(
        graph.nodes["472375073"].stateProperties,
        [
            {
                group: "Pop_up_active",
                cases: {
                    Active: { lowPass: 25 },
                },
            },
        ],
        "the recovered path carries its authored low-pass State",
    );
    assert.deepEqual(
        graph.nodes["464520479"].stateProperties,
        [
            {
                group: "isInsideFractureBubble",
                cases: {
                    no: { gainDb: -108 },
                },
            },
            {
                group: "riftState",
                cases: {
                    global: {
                        gainDb: -1,
                        pitchCents: -400,
                    },
                },
            },
        ],
        "the committed graph carries exact additive State gain and pitch",
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

    const artillerySwitch = graph.nodes[
        graph.events.Play_Impact_Artillery[0].nodeId
    ];

    assert.equal(artillerySwitch.type, "switch");
    assert.equal(artillerySwitch.group, "Impact_On");
    assert.deepEqual(Object.keys(artillerySwitch.cases), [
        "Armor",
        "Hull",
        "Shield",
    ]);
    assert.ok(
        library.eventMedia.Play_Impact_Artillery.length > 100,
        "non-continuous Step switches retain every reachable impact variant",
    );

    const continuousNodes = eventName =>
    {
        const pending = graph.events[eventName]
            .map(child => String(child.nodeId));
        const visited = new Set();
        const result = [];

        while (pending.length)
        {
            const id = pending.pop();

            if (visited.has(id))
            {
                continue;
            }
            visited.add(id);
            const node = graph.nodes[id];

            if (node.continuous)
            {
                result.push(node);
            }
            for (const child of node.children ?? [])
            {
                pending.push(String(child.nodeId));
            }
            for (const child of Object.values(node.cases ?? {}))
            {
                pending.push(String(child.nodeId));
            }
            if (node.default)
            {
                pending.push(String(node.default.nodeId));
            }
        }
        return result;
    };

    assert.ok(
        continuousNodes("space_cathedral_play").some(node =>
            node.type === "random"
            && node.continuous.transition === "delay"),
        "the demo carries an exact Continuous Random Delay example",
    );
    assert.ok(
        continuousNodes("phase_anchor_atmo_play").some(node =>
            node.type === "random"
            && node.continuous.transition === "disabled"),
        "the demo carries an exact completion-driven Continuous Random example",
    );
    assert.ok(
        continuousNodes("pvp_arena_clock_tick_loop_play").some(node =>
            node.type === "sequence"
            && node.continuous.transition === "delay"),
        "the demo carries an exact Continuous Sequence Delay example",
    );
    assert.ok(
        continuousNodes("remote_hullrepair").some(node =>
            node.type === "sequence"
            && node.continuous.transition === "disabled"),
        "the demo carries an exact completion-driven Continuous Sequence example",
    );
    assert.equal(
        graph.events.OSSE_amarr_running_lights_play,
        undefined,
        "Trigger Rate remains fail-closed until overlap scheduling exists",
    );
    assert.equal(
        graph.events.drone_grown_infested_structure_large_play,
        undefined,
        "amplitude crossfade remains fail-closed until fades overlap",
    );

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
    assert.ok(
        nodes.flatMap(node => node.rtpcCurves ?? []).length > 200,
        "the exact demo graph carries playable NodeBase RTPC curves",
    );
    assert.deepEqual(
        graph.nodes["22474881"].rtpcCurves,
        [
            {
                rtpc: "lightning_intensity",
                scope: "object",
                property: "volume",
                scaling: 2,
                points: [
                    {
                        x: 0,
                        value: -0.7488113641738892,
                        interpolation: 4,
                    },
                    {
                        x: 1,
                        value: 0,
                        interpolation: 4,
                    },
                ],
            },
            {
                rtpc: "lightning_intensity",
                scope: "object",
                property: "lowPass",
                scaling: 0,
                points: [
                    {
                        x: 0,
                        value: 35,
                        interpolation: 6,
                    },
                    {
                        x: 1,
                        value: 0,
                        interpolation: 4,
                    },
                ],
            },
            {
                rtpc: "lightning_intensity",
                scope: "object",
                property: "pitch",
                scaling: 0,
                points: [
                    {
                        x: 0,
                        value: 0,
                        interpolation: 4,
                    },
                    {
                        x: 1,
                        value: 100,
                        interpolation: 4,
                    },
                ],
            },
            {
                rtpc: "lightning_intensity",
                scope: "object",
                property: "highPass",
                scaling: 0,
                points: [
                    {
                        x: 0,
                        value: 18,
                        interpolation: 4,
                    },
                    {
                        x: 1,
                        value: 0,
                        interpolation: 4,
                    },
                ],
            },
        ],
        "one real lightning Sound carries live authored volume, pitch, and filters",
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
