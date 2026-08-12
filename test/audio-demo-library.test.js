import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

import { CjsSfxEngine } from "../src/CjsSfxEngine.js";
import { validateAudioLibraryDocument } from "../src/library/index.js";

const root = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
);
const jsonPath = path.join(root, "demo", "audio-library.json");
const gzipPath = `${jsonPath}.gz`;

test("authored music demo exposes a stable contextual transport", () =>
{
    const html = fs.readFileSync(
        path.join(root, "demo", "index.html"),
        "utf8",
    );
    const script = fs.readFileSync(
        path.join(root, "demo", "demo.js"),
        "utf8",
    );
    const guide = fs.readFileSync(
        path.join(root, "docs", "guides", "music.md"),
        "utf8",
    );

    for (const id of [
        "musicExamplePrevious",
        "musicExamplePlay",
        "musicExamplePause",
        "musicExampleNext",
        "musicExampleRandom",
    ])
    {
        assert.match(html, new RegExp(`id="${id}"`));
    }
    assert.match(html, /id="moodNotApplicable"[^>]*>not applicable</);
    assert.doesNotMatch(html, /id="music"[^>]*display\s*:\s*none/);
    assert.doesNotMatch(html, /id="sfx"[^>]*display\s*:\s*none/);
    assert.match(html, /id="musicExamples"[^>]*disabled/);
    assert.match(html, /id="sfxExamples"[^>]*disabled/);
    assert.match(html, /Authored Wwise programs and bounded fallbacks/);
    assert.match(html, /#music \.sfxControl select\s*\{[^}]*padding:\s*9px 36px 9px 12px/s);
    assert.match(html, /id="musicVol"[^>]*value="20"/);
    assert.match(html, /#musicExampleDetail\s*\{[^}]*height:\s*44px/s);
    assert.match(html, /\.transport button:disabled\s*\{[^}]*color:\s*rgba\([^)]*,\s*0\.24\)/s);
    assert.match(script, /#transportState = "idle"/);
    assert.match(script, /\.StepTransport\(/);
    assert.match(script, /\.RandomTransport\(/);
    assert.match(script, /\.PauseTransport\(/);
    assert.match(script, /#RefreshMoodApplicability\(/);
    assert.match(script, /toggle\.disabled = !audioEnabled \|\| !applicable/);
    assert.match(script, /this\.#select\.hidden = !applicable/);
    assert.match(script, /SetAudioEnabled\(enabled\)/);
    assert.match(script, /function FaderPercentToGain\(value\)/);
    assert.match(script, /ship_module_shield_drain_play/);
    assert.match(script, /return normalized \* normalized/);
    assert.doesNotMatch(script, /#StepExample/);
    assert.match(guide, /inside the\s+currently selected example/s);
});

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
    assert.equal(Object.keys(library.metadata.Events).length, 10766);
    assert.equal(Object.keys(graph.events).length, 4889);
    assert.equal(Object.keys(graph.programs).length, 9115);
    assert.ok(
        Object.keys(library.busRtpcs?.buses ?? {}).length > 0,
        "the committed demo retains authored Audio Bus RTPCs",
    );
    assert.ok(
        Object.keys(library.busStates?.buses ?? {}).length > 0,
        "the committed demo retains authored Audio Bus States",
    );
    assert.ok(
        Object.keys(library.busDucking?.sources ?? {}).length > 0,
        "the committed demo retains authored Audio Bus ducking",
    );
    assert.ok(
        Object.keys(library.busGraph?.buses ?? {}).length > 0,
        "the committed demo retains the authored Audio Bus graph",
    );
    assert.ok(
        Object.keys(library.busGraph?.effects ?? {}).length > 0,
        "the committed demo retains qualified Audio Bus effects",
    );
    assert.ok(
        Object.keys(library.busGraph?.sfxRoutes ?? {}).length > 0,
        "the committed demo routes real EVE SFX through the bus graph",
    );
    assert.ok(
        Object.keys(library.busGraph?.musicRoutes ?? {}).length > 0,
        "the committed demo routes real EVE music through the bus graph",
    );

    const strippedSwitches = {
        ship_effect_jumpdrive_in_bo_play: {
            audible: [ "29345318", "1065473789" ],
            silent: [ [ "980357672", 0 ], [ "140917810", 1600 ] ],
        },
        ship_effect_cyno_jumpdrive_out_play: {
            audible: [ "29345318", "1065473789" ],
            silent: [ [ "980357672", 0 ], [ "140917810", 1600 ] ],
        },
        ship_effect_cyno_jump_in_play: {
            audible: [ "599072537", "1006917402" ],
            silent: [ [ "455538153", 0 ], [ "394178349", 2000 ] ],
        },
        ship_effect_jumpdrive_out_bo_play: {
            audible: [ "6474842", "161952510" ],
            silent: [ [ "980357672", 0 ], [ "140917810", 1600 ] ],
        },
        ship_effect_cyno_jump_out_play: {
            audible: [ "846611767", "336481180" ],
            silent: [ [ "980357672", 0 ], [ "140917810", 0 ] ],
        },
    };

    for (const [ eventName, expected ] of Object.entries(strippedSwitches))
    {
        const actions = graph.programs[eventName];
        const [ audibleNodeId, audibleMediaId ] = expected.audible;

        assert.equal(graph.nodes[audibleNodeId].type, "sound");
        assert.equal(graph.nodes[audibleNodeId].mediaId, audibleMediaId);
        assert.ok(actions.some(action => action.kind === "play"
            && action.child.nodeId === audibleNodeId));
        for (const [ nodeId, delayMs ] of expected.silent)
        {
            assert.equal(graph.nodes[nodeId].type, "silence");
            assert.ok(actions.some(action => action.kind === "play"
                && action.child.nodeId === nodeId
                && (action.child.delayMs ?? 0) === delayMs));
        }
    }

    assert.deepEqual(graph.events.ship_module_shield_drain_play, [
        { nodeId: "603165888" },
    ]);
    assert.deepEqual(graph.programs.ship_module_shield_drain_play, [
        { kind: "play", child: { nodeId: "603165888" } },
    ]);
    assert.equal(graph.nodes["603165888"].type, "sound");
    assert.equal(graph.nodes["603165888"].mediaId, "278513022");
    assert.deepEqual(library.eventMedia.ship_module_shield_drain_play, [
        "278513022",
    ]);
    for (const omittedNodeId of [
        "974515202",
        "211616663",
        "488729513",
        "810168985",
    ])
    {
        assert.equal(graph.nodes[omittedNodeId], undefined);
    }

    const collectTimedSilenceNodes = eventName =>
    {
        const timedNodes = [];
        const visit = (nodeId, ancestors = new Set()) =>
        {
            const id = String(nodeId);
            const node = graph.nodes[id];

            if (!node || ancestors.has(id))
            {
                return;
            }
            if (node.type === "timed-silence")
            {
                timedNodes.push(node);
            }
            const nextAncestors = new Set(ancestors).add(id);

            for (const child of node.children ?? [])
            {
                visit(child.nodeId, nextAncestors);
            }
        };

        for (const root of graph.events[eventName] ?? [])
        {
            visit(root.nodeId);
        }
        return timedNodes;
    };
    const timedSilenceEvents = new Map([
        [ "worldobject_pillars_active_play", [ 304500, 6500 ] ],
        [ "jumpgate_suppressed_lvl_1", [ 8000 ] ],
        [ "jumpgate_suppressed_lvl_2", [ 8000 ] ],
        [ "jumpgate_suppressed_lvl_3", [ 8000 ] ],
        [ "jumpgate_suppressed_lvl_4", [ 8000 ] ],
        [ "jumpgate_suppressed_lvl_5", [ 8000 ] ],
        [ "solar_array_outburst_play", [ 6500 ] ],
        [ "solar_array_impact_play", [ 2000, 5000 ] ],
        [ "solar_array_beam_play", [ 2000 ] ],
    ]);

    for (const [ eventName, durations ] of timedSilenceEvents)
    {
        assert.deepEqual(
            collectTimedSilenceNodes(eventName).map(node =>
                node.durationMs),
            durations,
            `${eventName} retains its authored Wwise Silence timing`,
        );
    }
    for (const eventName of [
        "jumpgate_suppressed_lvl_1",
        "jumpgate_suppressed_lvl_2",
        "jumpgate_suppressed_lvl_3",
        "jumpgate_suppressed_lvl_4",
        "jumpgate_suppressed_lvl_5",
    ])
    {
        for (const node of collectTimedSilenceNodes(eventName))
        {
            assert.ok(
                node.matchIds.includes("546252031"),
                `${eventName} remains stoppable through its Actor-Mixer`,
            );
            assert.equal(node.outputBusId, "2354433251");
            assert.equal(node.busPathIds[0], "2354433251");
        }
    }
    assert.deepEqual(
        graph.programs.jumpgate_suppressed_stop,
        [ {
            kind: "stop",
            targetId: "546252031",
            scope: "game-object",
            mode: "element",
            curve: 4,
            exceptions: [],
            targetFlags: 0,
            actionFlags: 6,
            transitionMs: 100,
        } ],
        "the authored jumpgate Stop targets every retained Silence ancestry",
    );
    for (const eventName of [
        "worldobject_pillars_active_play",
        "solar_array_outburst_play",
        "solar_array_impact_play",
        "solar_array_beam_play",
    ])
    {
        for (const node of collectTimedSilenceNodes(eventName))
        {
            assert.equal(node.outputBusId, "4152719228");
            assert.equal(node.busPathIds[0], "4152719228");
        }
    }
    assert.equal(
        graph.events.in_game_video_stream_play,
        undefined,
        "host-fed Wwise Audio Input remains fail-closed",
    );

    for (const [ eventName, branchId, layerId ] of [
        [ "jita_hangar_play", "154203244", "147683999" ],
        [ "Ambience_Hangar_Caldari_Play", "235104118", "879550926" ],
        [ "Ambience_Hangar_Minmatar_Play", "334557450", "94549541" ],
    ])
    {
        assert.ok(
            graph.events[eventName].some(root =>
                String(root.nodeId) === branchId),
            `${eventName} retains its directly posted Hangar branch`,
        );
        assert.ok(
            graph.nodes[branchId].children.some(child =>
                String(child.nodeId) === layerId),
            `${eventName} reaches its zero-record Continuous Layer`,
        );
        assert.equal(graph.nodes[layerId].type, "parallel");
        assert.ok(
            graph.nodes[layerId].children.every(child =>
                graph.nodes[String(child.nodeId)].continuous?.transition
                    === "delay"),
            `${eventName} keeps each child Continuous scheduler independent`,
        );
    }

    const associationFreeShipEngines = [
        "ship_engine_XS_booster_3rd_on",
        "ship_engine_M_microwarpdrive_1st_on",
        "ship_engine_S_microwarpdrive_3rd_on",
        "ship_engine_M_afterburner_1st_on",
        "ship_engine_XL_booster_3rd_on",
        "ship_engine_L_afterburner_3rd_on",
        "ship_engine_XS_afterburner_3rd_on",
        "ship_engine_XL_afterburner_1st_on",
        "ship_engine_S_booster_1st_on",
        "ship_engine_M_microwarpdrive_3rd_on",
        "ship_engine_L_afterburner_1st_on",
        "ship_engine_XS_microwarpdrive_3rd_on",
        "ship_engine_XL_booster_1st_on",
        "ship_engine_L_booster_1st_on",
        "ship_engine_M_afterburner_3rd_on",
        "ship_engine_S_booster_3rd_on",
        "ship_engine_XS_microwarpdrive_1st_on",
        "ship_engine_XS_booster_1st_on",
        "ship_engine_XS_afterburner_1st_on",
        "ship_engine_L_booster_3rd_on",
        "ship_engine_XL_afterburner_3rd_on",
        "ship_engine_S_microwarpdrive_1st_on",
    ];

    for (const eventName of associationFreeShipEngines)
    {
        assert.ok(
            graph.events[eventName]?.length,
            `${eventName} retains its association-free Continuous Layer`,
        );
    }
    const shipEngineMedia = new Set(
        associationFreeShipEngines.flatMap(eventName =>
            library.eventMedia[eventName] ?? []),
    );

    assert.equal(shipEngineMedia.size, 63);
    const xxlProgramKinds = [
        "reset-voice-volume",
        "reset-voice-volume",
        "play",
        "play",
        "play",
        "play",
        "play",
        "set-voice-volume",
        "set-voice-volume",
        "set-voice-volume",
        "set-voice-volume",
    ];
    for (const [
        eventName,
        layerId,
        steppedLayerId,
        stopEvent,
        stopTarget,
        rootIds,
        actionTargets,
    ] of [
        [
            "ship_engine_XXL_microwarpdrive_1st_on",
            "725601076",
            "359204478",
            "ship_engine_XXL_microwarpdrive_1st_off",
            "514297817",
            [
                "852380605",
                "686243306",
                "435611758",
                "725601076",
                "641303300",
            ],
            [
                "852380605",
                "725601076",
                "852380605",
                "686243306",
                "435611758",
                "725601076",
                "641303300",
                "1005951228",
                "749662878",
                "725601076",
                "852380605",
            ],
        ],
        [
            "ship_engine_XXL_microwarpdrive_3rd_on",
            "520277715",
            "880712148",
            "ship_engine_XXL_microwarpdrive_3rd_off",
            "531507805",
            [
                "130508512",
                "897524406",
                "453013189",
                "520277715",
                "920078200",
            ],
            [
                "130508512",
                "520277715",
                "130508512",
                "897524406",
                "453013189",
                "520277715",
                "920078200",
                "1017090445",
                "1037864269",
                "520277715",
                "130508512",
            ],
        ],
    ])
    {
        assert.deepEqual(
            graph.events[eventName].map(root => String(root.nodeId)),
            rootIds,
            `${eventName} retains all five authored Play roots in order`,
        );
        assert.deepEqual(
            graph.programs[eventName].map(action => action.kind),
            xxlProgramKinds,
        );
        assert.deepEqual(
            graph.programs[eventName].map(action => String(
                action.targetId ?? action.child?.nodeId,
            )),
            actionTargets,
        );
        assert.equal(graph.nodes[layerId].type, "blend");
        assert.equal(graph.nodes[layerId].children.length, 4);
        assert.deepEqual(
            [ ...new Set(graph.nodes[layerId].children.flatMap(child =>
                (child.rtpcCurves ?? []).map(curve => curve.property))) ]
                .sort(),
            [ "highPass", "lowPass", "pitch", "volume" ],
        );
        assert.deepEqual(
            graph.nodes[steppedLayerId]
                .children[0].gainCurves[0].points.map(point => point.x),
            [
                0.30000001192092896,
                0.30000001192092896,
                1.5800000429153442,
                1.5800000429153442,
            ],
        );
        assert.equal(library.eventMedia[eventName].length, 14);
        assert.deepEqual(graph.programs[stopEvent], [
            {
                kind: "stop",
                targetId: stopTarget,
                scope: "game-object",
                mode: "element",
                curve: 4,
                exceptions: [],
                targetFlags: 0,
                actionFlags: 6,
                transitionMs: 3000,
            },
        ]);
    }

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
        graph.programs.ui_state_stack,
        [
            {
                kind: "state",
                group: "DragDrop",
                value: "stack",
            },
            {
                kind: "state",
                group: "DragDrop",
                value: "normal",
                delayMs: 1000,
            },
        ],
        "a delayed setter keeps an action-only post alive",
    );
    assert.deepEqual(
        graph.programs.ship_engine_S_warpdrive_1st_blast.at(-1),
        {
            kind: "state",
            group: "Ship_State",
            value: "Warp_TopSpeed",
            delayMs: 15000,
        },
        "the warp program retains its authored 15-second State",
    );
    assert.deepEqual(
        graph.programs.worldobject_wormhole_travel_play
            .slice(3, 6)
            .map(action => [
                action.kind,
                action.delayMs ?? action.child?.delayMs,
                action.child?.nodeId ?? action.value,
            ]),
        [
            [ "play", 1000, "774425223" ],
            [ "play", 8000, "206054671" ],
            [ "state", 8000, "no" ],
        ],
        "equal-time Play and State actions retain authored order",
    );
    assert.deepEqual(
        graph.programs.cinematic_ship_intro_begin.map(action => action.kind),
        [
            "state",
            "play",
            "reset-voice-volume",
            "play",
            "set-bus-voice-volume",
        ],
        "the cinematic begin retains its cross-event Bus Voice Volume Set",
    );
    assert.deepEqual(
        graph.programs.cinematic_ship_intro_begin.at(-1),
        {
            kind: "set-bus-voice-volume",
            targetId: "3810872320",
            scope: "game-object",
            mode: "element",
            curve: 4,
            targetFlags: 1,
            valueMode: "absolute",
            volumeDb: -30,
            volumeRangeDb: { min: 0, max: 0 },
        },
    );
    assert.deepEqual(
        graph.programs.cinematic_ship_intro_climax[5],
        {
            kind: "set-bus-voice-volume",
            targetId: "3810872320",
            scope: "game-object",
            mode: "element",
            curve: 4,
            targetFlags: 1,
            delayMs: 6000,
            transitionMs: 2000,
            valueMode: "absolute",
            volumeDb: 0,
            volumeRangeDb: { min: 0, max: 0 },
        },
        "the climax restores the same Bus voice state on the authored clock",
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
        graph.programs.stagecoach_idle_loop_play,
        [
            {
                kind: "set-voice-volume",
                targetId: "232039670",
                scope: "game-object",
                mode: "element",
                curve: 4,
                targetFlags: 0,
                transitionMs: 10000,
                valueMode: "absolute",
                volumeDb: -12,
                volumeRangeDb: { min: 0, max: 0 },
            },
            {
                kind: "play",
                child: {
                    nodeId: "232039670",
                    fadeInMs: 4000,
                    fadeCurve: 4,
                },
            },
        ],
        "the demo includes one exact authored Set Voice Volume example",
    );

    const warpRoot = graph.events.ship_engine_M_warpdrive_3rd_blast[0].nodeId;
    const warpOff = graph.programs.ship_engine_M_warpdrive_3rd_off;
    const warpStop = warpOff.find(action => action.kind === "stop");
    const warpOutro = warpOff.filter(action => action.kind === "play");
    const warpPending = [ String(warpRoot) ];
    const warpVisited = new Set();
    const warpMatchIds = new Set();

    while (warpPending.length)
    {
        const id = warpPending.pop();

        if (warpVisited.has(id))
        {
            continue;
        }
        warpVisited.add(id);
        warpMatchIds.add(id);
        const node = graph.nodes[id];

        for (const matchId of node.matchIds ?? [])
        {
            warpMatchIds.add(String(matchId));
        }
        for (const child of node.children ?? [])
        {
            warpPending.push(String(child.nodeId));
        }
    }
    assert.equal(warpStop.transitionMs, 2000);
    assert.equal(warpOutro.length, 2);
    assert.ok(
        warpMatchIds.has(String(warpStop.targetId)),
        "the warpdrive loop proves its authored Stop/outro relationship",
    );
    assert.deepEqual(
        graph.programs.voc_Aura_2850_1_play_01,
        [
            {
                kind: "play",
                child: { nodeId: "735447374" },
            },
        ],
    );
    assert.deepEqual(
        graph.programs.voc_Aura_2850_1_pause,
        [
            {
                kind: "pause",
                targetId: "735447374",
                scope: "game-object",
                mode: "element",
                curve: 4,
                exceptions: [],
                targetFlags: 0,
                actionFlags: 7,
            },
        ],
    );
    assert.deepEqual(
        graph.programs.voc_Aura_2850_1_resume,
        [
            {
                kind: "resume",
                targetId: "735447374",
                scope: "game-object",
                mode: "element",
                curve: 4,
                exceptions: [],
                targetFlags: 0,
                actionFlags: 6,
            },
        ],
        "the demo includes one exact authored Pause/Resume voice trio",
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

    const amarrStationRoots = graph.events.worldobject_station_amarr_play;
    const trappedRandom = graph.nodes["149816507"];

    assert.equal(amarrStationRoots.length, 3);
    assert.deepEqual(trappedRandom, {
        type: "random",
        children: [
            { nodeId: "744357257" },
            { nodeId: "568102745" },
        ],
        mode: "random",
        scope: "object",
        avoidRepeat: 1,
    });
    assert.equal(graph.nodes["568102745"].loop, true);
    assert.deepEqual(graph.nodes["744357257"].continuous, {
        loopCount: 0,
        transition: "delay",
        transitionMs: 3000,
        transitionRangeMs: { min: 0, max: 2000 },
    });
    const trappedEngine = new CjsSfxEngine({
        graph,
        random: () => 0,
    });
    const nestedChoice = trappedEngine.ResolveProgram(
        "worldobject_station_amarr_play",
        { gameObjID: 9 },
    )[0];
    const loopChoice = trappedEngine.ResolveProgram(
        "worldobject_station_amarr_play",
        { gameObjID: 9 },
    )[0];

    assert.equal(
        nestedChoice.continuations[0].containerId,
        "744357257",
    );
    assert.ok(nestedChoice.selections[0].matchIds.includes("149816507"));
    assert.ok(nestedChoice.selections[0].matchIds.includes("744357257"));
    assert.equal(loopChoice.continuations, undefined);
    assert.equal(loopChoice.selections[0].mediaID, "881023812");
    assert.ok(loopChoice.selections[0].matchIds.includes("149816507"));

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
    const triggerRateEvents = [
        "OSSE_amarr_running_lights_play",
        "OSSE_gallente_running_lights_play",
        "chjita_initial_docking_entrance_lights_play",
        "dot_explosions_1_play",
        "dot_explosions_2_play",
        "dot_explosions_3_play",
        "dot_explosions_4_play",
        "dot_explosions_5_play",
    ];

    assert.ok(
        triggerRateEvents.every(eventName =>
            continuousNodes(eventName).some(node =>
                node.continuous.transition === "trigger-rate")),
        "the demo carries every currently lowerable exact Trigger Rate event",
    );
    assert.ok(
        continuousNodes("OSSE_amarr_running_lights_play").some(node =>
            node.type === "random"
            && node.scope === "object"
            && node.continuous.transitionMs === 2300),
        "the demo carries an exact object-scoped Trigger Rate example",
    );
    for (const [ eventName, outerID, innerID ] of [
        [
            "upwell_hangar_armor_warning_play",
            "801912365",
            "291209419",
        ],
        [
            "upwell_hangar_hull_warning_play",
            "494273191",
            "653971843",
        ],
    ])
    {
        assert.deepEqual(graph.events[eventName], [ { nodeId: outerID } ]);
        assert.equal(graph.nodes[outerID].continuous.transition, "delay");
        assert.equal(graph.nodes[outerID].continuous.transitionMs, 60000);
        assert.equal(graph.nodes[outerID].children[0].nodeId, innerID);
        assert.equal(
            graph.nodes[innerID].continuous.transition,
            "trigger-rate",
        );
        assert.equal(graph.nodes[innerID].continuous.transitionMs, 2000);
    }
    assert.deepEqual(
        graph.events.jita_sfx_incidentals_level3_play,
        [
            { nodeId: "982470804" },
            { nodeId: "889017459" },
            { nodeId: "183292688" },
            { nodeId: "450083713" },
            { nodeId: "692150381" },
        ],
        "the demo carries all five authored Jita Play actions",
    );
    const jitaOuter = graph.nodes["450083713"];
    const jitaInner = graph.nodes["472660510"];

    assert.equal(jitaOuter.type, "random");
    assert.equal(jitaOuter.continuous.transition, "delay");
    assert.equal(jitaOuter.continuous.transitionMs, 15000);
    assert.deepEqual(
        jitaOuter.continuous.transitionRangeMs,
        { min: 0, max: 30000 },
    );
    assert.deepEqual(jitaOuter.children, [ { nodeId: "472660510" } ]);
    assert.equal(jitaInner.type, "sequence");
    assert.equal(jitaInner.initialDelayMs, 2000);
    assert.deepEqual(
        jitaInner.children,
        [ { nodeId: "211583824" }, { nodeId: "186518405" } ],
    );
    assert.equal(
        jitaInner.continuous.transition,
        "crossfade-amplitude",
    );
    assert.equal(jitaInner.continuous.transitionMs, 2000);
    assert.deepEqual(
        jitaInner.continuous.transitionRangeMs,
        { min: 0, max: 20000 },
    );
    assert.equal(jitaInner.continuous.resetPlaylistEachPlay, false);
    assert.deepEqual(
        graph.nodes["140944680"].sourceEffects,
        [ {
            effectId: "2464647643",
            slotIndex: 0,
            type: "delay",
            delayTimeSeconds: Math.fround(0.28),
            feedbackPercent: 32.5,
            wetDryMixPercent: 30.5,
            outputGainDb: 0,
            feedbackEnabled: true,
            processLfe: true,
        } ],
        "the Jita incidental leaf inherits its authored static Delay",
    );
    assert.equal(
        library.eventMedia.jita_sfx_incidentals_level3_play.length,
        48,
    );

    const warningEngine = new CjsSfxEngine({ graph });
    const warningFirst = warningEngine.ResolveProgram(
        "upwell_hangar_armor_warning_play",
        { gameObjID: 12 },
    )[0];
    const warningToken = warningFirst.continuations[0].token;

    assert.equal(warningFirst.selections[0].delayMs, 10000);
    assert.equal(warningFirst.continuations[0].containerId, "801912365");
    assert.equal(warningFirst.continuations[0].delayMs, 2000);
    warningEngine.ContinueProgram(warningToken, { gameObjID: 12 });
    const warningFinal = warningEngine.ContinueProgram(
        warningToken,
        { gameObjID: 12 },
    )[0];

    assert.equal(warningFinal.continuations[0].completionBarrier, true);
    assert.equal(warningFinal.continuations[0].delayMs, 0);
    assert.equal(
        warningEngine.ContinueProgram(
            warningToken,
            { gameObjID: 12 },
        )[0].selections[0].delayMs,
        60000,
    );
    const crossfadeNodes = continuousNodes(
        "drone_grown_infested_structure_large_play",
    ).filter(node =>
        node.type === "random"
        && node.scope === "object"
        && node.continuous.transition === "crossfade-amplitude");

    assert.equal(
        crossfadeNodes.length,
        2,
        "the exact demo carries both authored drone Crossfade containers",
    );
    assert.ok(
        crossfadeNodes.every(node =>
            node.continuous.loopCount === 0
            && node.continuous.transitionMs === 10000
            && node.children.length === 5),
        "the exact Crossfade duration, infinite traversal, and child set survive",
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
    const sourceEffectSounds = nodes.filter(node =>
        Array.isArray(node.sourceEffects));
    const sourceEqSounds = sourceEffectSounds.filter(node =>
        node.sourceEffects.some(effect =>
            effect.type === "parametric-eq"));
    const dynamicSourceEqSounds = sourceEqSounds.filter(node =>
        node.sourceEffects.some(effect =>
            effect.type === "parametric-eq"
            && Array.isArray(effect.rtpcCurves)));
    const sourceDelaySounds = sourceEffectSounds.filter(node =>
        node.sourceEffects.some(effect => effect.type === "delay"));
    const sourceCompressorSounds = sourceEffectSounds.filter(node =>
        node.sourceEffects.some(effect => effect.type === "compressor"));
    const sourcePeakLimiterSounds = sourceEffectSounds.filter(node =>
        node.sourceEffects.some(effect => effect.type === "peak-limiter"));
    const sourceFlangerSounds = sourceEffectSounds.filter(node =>
        node.sourceEffects.some(effect => effect.type === "flanger"));
    const sourceTremoloSounds = sourceEffectSounds.filter(node =>
        node.sourceEffects.some(effect => effect.type === "tremolo"));
    const sourceGuitarDistortionSounds = sourceEffectSounds.filter(node =>
        node.sourceEffects.some(effect =>
            effect.type === "guitar-distortion"));
    const dynamicGuitarDistortionSounds = sourceGuitarDistortionSounds
        .filter(node => node.sourceEffects.some(effect =>
            effect.type === "guitar-distortion"
            && effect.driveRtpcCurve));
    const sourceMatrixReverbSounds = sourceEffectSounds.filter(node =>
        node.sourceEffects.some(effect =>
            effect.type === "matrix-reverb"));
    const sourceRoomVerbSounds = sourceEffectSounds.filter(node =>
        node.sourceEffects.some(effect => effect.type === "roomverb"));
    const sourceMeterSounds = sourceEffectSounds.filter(node =>
        node.sourceEffects.some(effect => effect.type === "meter"));

    assert.equal(sourceEffectSounds.length, 3183);
    assert.equal(sourceEffectSounds.reduce((count, node) =>
        count + node.sourceEffects.length, 0), 3344);
    assert.equal(sourceEqSounds.length, 456);
    assert.equal(dynamicSourceEqSounds.length, 170);
    assert.equal(sourceDelaySounds.length, 87);
    assert.equal(sourceCompressorSounds.length, 2114);
    assert.equal(sourcePeakLimiterSounds.length, 73);
    assert.equal(sourceFlangerSounds.length, 21);
    assert.equal(sourceTremoloSounds.length, 152);
    assert.equal(sourceGuitarDistortionSounds.length, 205);
    assert.equal(dynamicGuitarDistortionSounds.length, 136);
    assert.equal(sourceMatrixReverbSounds.length, 50);
    assert.equal(sourceRoomVerbSounds.length, 52);
    assert.equal(sourceMeterSounds.length, 130);
    assert.deepEqual(graph.nodes["3270488"].sourceEffects, [ {
        effectId: "3835448648",
        slotIndex: 1,
        type: "parametric-eq",
        bands: [ {
            index: 0,
            filterType: "peaking",
            gainDb: 0,
            frequencyHz: 120,
            q: 0.5,
        } ],
        outputGainDb: -3,
        processLfe: false,
        rtpcCurves: [ {
            rtpc: "ship_Roll",
            scope: "object",
            bandIndex: 0,
            property: "frequencyHz",
            accumulation: "exclusive",
            scaling: 3,
            defaultValue: 0,
            points: [
                {
                    x: 0,
                    value: Math.fround(Math.log10(160)),
                    interpolation: 2,
                },
                {
                    x: 360,
                    value: Math.fround(Math.log10(3650)),
                    interpolation: 4,
                },
            ],
        } ],
    } ]);
    assert.deepEqual(graph.nodes["20988277"].sourceEffects, [ {
        effectId: "777891344",
        slotIndex: 0,
        type: "matrix-reverb",
        reverbTimeSeconds: 4,
        hfRatio: Math.fround(1.4),
        numberOfDelays: 12,
        dryLevelDb: 0,
        wetLevelDb: Math.fround(-27.3),
        preDelaySeconds: 0,
        processLfe: true,
        delayLengthsMode: "default",
    } ]);
    assert.deepEqual(graph.nodes["41564381"].sourceEffects, [ {
        effectId: "2315560391",
        slotIndex: 0,
        type: "meter",
        attack: 0,
        release: Math.fround(0.1),
        minimum: -48,
        maximum: 0,
        hold: 0,
        infiniteHold: false,
        mode: "peak",
        scope: "global",
        applyDownstreamVolume: false,
        gameParameterId: 765248359,
    } ]);
    assert.deepEqual(
        graph.nodes["40562840"].sourceEffects.map(effect => ({
            effectId: effect.effectId,
            type: effect.type,
        })),
        [
            { effectId: "277510878", type: "meter" },
            { effectId: "554802347", type: "compressor" },
        ],
    );
    assert.equal(
        graph.nodes["40562840"].sourceEffects[0].applyDownstreamVolume,
        true,
    );
    assert.equal(
        graph.nodes["40562840"].sourceEffects[0].gameParameterId,
        2030689742,
    );
    assert.deepEqual(graph.nodes["61866929"].sourceEffects, [
        {
            effectId: "3206968232",
            slotIndex: 0,
            type: "tremolo",
            modulationDepthPercent: 80,
            modulationFrequencyHz: Math.fround(0.02),
            waveform: "sine",
            phaseOffsetDegrees: 108,
            phaseMode: "random",
            phaseSpreadDegrees: 66,
            outputGainDb: 0,
            processCenter: true,
            processLfe: true,
        },
        {
            effectId: "2098638826",
            slotIndex: 1,
            type: "matrix-reverb",
            reverbTimeSeconds: 4.5,
            hfRatio: 7.5,
            numberOfDelays: 12,
            dryLevelDb: 0,
            wetLevelDb: -30,
            preDelaySeconds: Math.fround(0.02),
            processLfe: true,
            delayLengthsMode: "default",
        },
    ]);
    assert.deepEqual(graph.nodes["159333883"].sourceEffects, [ {
        effectId: "357574926",
        slotIndex: 0,
        type: "tremolo",
        modulationDepthPercent: 50,
        modulationFrequencyHz: Math.fround(0.05),
        waveform: "square",
        phaseOffsetDegrees: 0,
        phaseMode: "left-right",
        phaseSpreadDegrees: 0,
        outputGainDb: 0,
        processCenter: true,
        processLfe: true,
    } ]);
    assert.deepEqual(graph.nodes["525463666"].sourceEffects, [
        {
            effectId: "566093542",
            slotIndex: 0,
            type: "tremolo",
            modulationDepthPercent: 100,
            modulationFrequencyHz: Math.fround(7.62),
            waveform: "triangle",
            phaseOffsetDegrees: 0,
            phaseMode: "left-right",
            phaseSpreadDegrees: 0,
            outputGainDb: 0,
            processCenter: true,
            processLfe: true,
        },
        {
            effectId: "126257322",
            slotIndex: 1,
            type: "tremolo",
            modulationDepthPercent: 70,
            modulationFrequencyHz: Math.fround(0.2),
            waveform: "sine",
            phaseOffsetDegrees: 0,
            phaseMode: "left-right",
            phaseSpreadDegrees: 0,
            outputGainDb: 0,
            processCenter: true,
            processLfe: true,
        },
        {
            effectId: "579691495",
            slotIndex: 2,
            type: "tremolo",
            modulationDepthPercent: 100,
            modulationFrequencyHz: Math.fround(0.06),
            waveform: "triangle",
            phaseOffsetDegrees: 0,
            phaseMode: "left-right",
            phaseSpreadDegrees: 0,
            outputGainDb: 0,
            processCenter: true,
            processLfe: true,
        },
        {
            effectId: "672599830",
            slotIndex: 3,
            type: "tremolo",
            modulationDepthPercent: 100,
            modulationFrequencyHz: Math.fround(0.52),
            waveform: "triangle",
            phaseOffsetDegrees: 0,
            phaseMode: "left-right",
            phaseSpreadDegrees: 0,
            outputGainDb: 0,
            processCenter: true,
            processLfe: true,
        },
    ]);
    const shieldDrainRoomVerb = graph.nodes["603165888"].sourceEffects[0];

    assert.equal(shieldDrainRoomVerb.type, "roomverb");
    assert.equal(shieldDrainRoomVerb.effectId, "402798902");
    assert.equal(shieldDrainRoomVerb.decayTimeSeconds, Math.fround(4.1));
    assert.equal(shieldDrainRoomVerb.stereoWidthDegrees, 88);
    assert.equal(shieldDrainRoomVerb.earlyReflectionsPattern, 8);
    assert.equal(shieldDrainRoomVerb.reverbUnitCount, 8);
    assert.deepEqual(
        Object.entries(graph.nodes)
            .filter(([, node]) => sourceFlangerSounds.includes(node))
            .map(([ id, node ]) => [
                id,
                node.mediaId,
                node.sourceEffects.find(effect =>
                    effect.type === "flanger").effectId,
            ])
            .sort((left, right) => Number(left[0]) - Number(right[0])),
        [
            [ "87619569", "632408785", "2906410516" ],
            [ "206604303", "689827705", "2906410516" ],
            [ "292533695", "487219032", "706763456" ],
            [ "293792304", "46253731", "636129930" ],
            [ "298447693", "487219032", "877054924" ],
            [ "304815500", "357773066", "636129930" ],
            [ "334487613", "170814237", "2906410516" ],
            [ "337117908", "357773066", "706763456" ],
            [ "494971020", "46253731", "706763456" ],
            [ "531596895", "487219032", "746828992" ],
            [ "639168720", "287274205", "2906410516" ],
            [ "656720365", "357773066", "746828992" ],
            [ "673321208", "661144132", "290827855" ],
            [ "721771466", "487219032", "636129930" ],
            [ "797614024", "357773066", "877054924" ],
            [ "806298936", "689827705", "2906410516" ],
            [ "829586991", "170814237", "2906410516" ],
            [ "872272200", "632408785", "2906410516" ],
            [ "874311158", "46253731", "877054924" ],
            [ "908140579", "287274205", "2906410516" ],
            [ "914319909", "46253731", "746828992" ],
        ],
    );
    assert.deepEqual(
        graph.nodes["334487613"].sourceEffects[0],
        {
            effectId: "2906410516",
            slotIndex: 0,
            type: "flanger",
            delayTimeSeconds: Math.fround(12.3) / 1000,
            blend: 1,
            feedforward: 1,
            feedback: 0.5,
            modulationDepthPercent: Math.fround(33.2),
            modulationFrequencyHz: Math.fround(0.42),
            outputGainDb: 0,
            wetDryMixPercent: 100,
            lfoEnabled: true,
            processCenter: false,
            processLfe: false,
        },
    );
    assert.deepEqual(
        graph.nodes["673321208"].sourceEffects[0],
        {
            effectId: "290827855",
            slotIndex: 0,
            type: "flanger",
            delayTimeSeconds: Math.fround(81.1) / 1000,
            blend: Math.fround(0.57),
            feedforward: 1,
            feedback: Math.fround(0.1),
            modulationDepthPercent: Math.fround(8.4),
            modulationFrequencyHz: Math.fround(1.68),
            outputGainDb: 0,
            wetDryMixPercent: 55,
            lfoEnabled: false,
            processCenter: false,
            processLfe: false,
        },
    );
    const flangerSoundIds = new Set(Object.entries(graph.nodes)
        .filter(([, node]) => sourceFlangerSounds.includes(node))
        .map(([ id ]) => id));
    const flangerEvents = Object.entries(graph.events)
        .filter(([, roots ]) =>
        {
            const pending = roots.map(root => String(root.nodeId));
            const visited = new Set();

            while (pending.length)
            {
                const id = pending.pop();

                if (visited.has(id)) continue;
                visited.add(id);
                if (flangerSoundIds.has(id)) return true;
                const node = graph.nodes[id];

                if (!node) continue;
                pending.push(...(node.children ?? []).map(child =>
                    String(child.nodeId)));
                pending.push(...Object.values(node.cases ?? {}).map(child =>
                    String(child.nodeId)));
                if (node.default) pending.push(String(node.default.nodeId));
            }
            return false;
        })
        .map(([ name ]) => name)
        .sort();

    assert.deepEqual(flangerEvents, [
        "dungeon_brothel_atmo_play",
        "ecx_generic_explosive_individual_01c_play",
        "ecx_generic_explosive_long_individual_01c_play",
        "ecx_generic_lco_explosive_individual_01c_play",
        "ship_engine_S_booster_1st_on",
        "ship_engine_S_booster_3rd_on",
        "ship_engine_XS_booster_1st_on",
        "ship_engine_XS_booster_3rd_on",
        "worldobject_jumpgate_activity_play",
    ]);
    const tremoloSoundIds = new Set(Object.entries(graph.nodes)
        .filter(([, node]) => sourceTremoloSounds.includes(node))
        .map(([ id ]) => id));

    const zeroPhaseTremoloSoundIds = [ ...tremoloSoundIds ].filter(id =>
    {
        const effect = graph.nodes[id].sourceEffects.find(candidate =>
            candidate.type === "tremolo");

        return effect.phaseOffsetDegrees === 0
            && effect.phaseMode === "left-right"
            && effect.phaseSpreadDegrees === 0;
    });

    assert.deepEqual(
        zeroPhaseTremoloSoundIds.map(Number)
            .sort((left, right) => left - right),
        [
            25884399, 40436754, 43363314, 60415284, 68507679, 73677858,
            78735863, 84669040, 99994845, 123394445, 159333883, 173560074, 179016091,
            185550431, 212767959, 213549686, 216531588, 220151376,
            227488604, 234999876, 245023523, 289872408, 295844646,
            303824015, 334236564, 337505310, 342408936, 367736782,
            419444932, 422600908, 464520479, 466221579, 474875076, 479691729,
            483852729, 504198893, 513652395, 525063532, 525463666, 527348461,
            552197906,
            561895346, 563609806, 567959441, 569050443, 570940185,
            585012572, 587318855, 601025667, 604031582, 606479059,
            619225631, 627960890, 646956222, 671815947, 705896755,
            707197595, 720713023, 722707846, 729008069, 737747941,
            747245505, 767807393, 770608002, 771045205, 786791827,
            833468545, 875267345, 897337650, 936914842, 939407056,
            954428155, 962406120, 963801704, 968463064, 969222816,
            1016689010, 1072313718,
        ],
    );
    assert.deepEqual(
        graph.nodes["185550431"].sourceEffects,
        [
            {
                effectId: "683567116",
                slotIndex: 0,
                type: "parametric-eq",
                bands: [ {
                    index: 1,
                    filterType: "peaking",
                    gainDb: -6,
                    frequencyHz: 304,
                    q: 1,
                } ],
                outputGainDb: 0,
                processLfe: true,
            },
            {
                effectId: "920910989",
                slotIndex: 1,
                type: "tremolo",
                modulationDepthPercent: 65,
                modulationFrequencyHz: Math.fround(0.2),
                waveform: "sine",
                phaseOffsetDegrees: 0,
                phaseMode: "left-right",
                phaseSpreadDegrees: 0,
                outputGainDb: 0,
                processCenter: true,
                processLfe: true,
            },
        ],
    );
    const tremoloPhasePopulations = {};

    for (const id of tremoloSoundIds)
    {
        for (const effect of graph.nodes[id].sourceEffects.filter(candidate =>
            candidate.type === "tremolo"))
        {
            const key = [
                effect.phaseMode,
                effect.phaseOffsetDegrees,
                effect.phaseSpreadDegrees,
            ].join("|");

            tremoloPhasePopulations[key] =
                (tremoloPhasePopulations[key] ?? 0) + 1;
        }
    }
    assert.deepEqual(tremoloPhasePopulations, {
        "left-right|0|0": 81,
        "random|-72|112": 1,
        "random|0|20": 28,
        "random|0|100": 1,
        "random|44|93": 1,
        "random|47|95": 1,
        "random|53|45": 1,
        "random|108|66": 42,
    });
    const tremoloEvents = Object.entries(graph.events)
        .filter(([, roots ]) =>
        {
            const pending = roots.map(root => String(root.nodeId));
            const visited = new Set();

            while (pending.length)
            {
                const id = pending.pop();

                if (visited.has(id)) continue;
                visited.add(id);
                if (tremoloSoundIds.has(id)) return true;
                const node = graph.nodes[id];

                if (!node) continue;
                pending.push(...(node.children ?? []).map(child =>
                    String(child.nodeId)));
                pending.push(...Object.values(node.cases ?? {}).map(child =>
                    String(child.nodeId)));
                if (node.default) pending.push(String(node.default.nodeId));
            }
            return false;
        })
        .map(([ name ]) => name)
        .sort();

    assert.deepEqual(tremoloEvents, [
        "Ambience_Hangar_Gallente_Play",
        "OSSE_Caldari_bigscreen_play",
        "OSSE_Gallente_bigscreen_play",
        "_nanocoating_atmo_play",
        "autominer_siren_play",
        "character_creation_body_type_loop_play",
        "character_creation_customize_character_loop_play",
        "deathless_structure_warden_play",
        "hangar_platforms_aura_hologram_atmo_play",
        "hq_systems_amarr_play",
        "jita_OSSE_bigscreen_1_play",
        "jita_sfx_commerce_atmo_play",
        "jita_sfx_incidentals_level2_play",
        "jita_sfx_incidentals_level3_play",
        "jita_sfx_industrial_atmo_play",
        "jita_sfx_military_atmo_play",
        "jita_sfx_science_atmo_play",
        "large_station_amarr_play",
        "large_station_caldari_play",
        "large_station_gallente_play",
        "large_station_minmatar_play",
        "medium_station_amarr_play",
        "medium_station_caldari_play",
        "medium_station_gallente_play",
        "medium_structure_amarr_play",
        "medium_structure_caldari_play",
        "medium_structure_gallente_play",
        "medium_structure_minmatar_play",
        "mercenary_den_atmo_play",
        "navy_harbor_minmatar_m_play",
        "navy_harbor_minmatar_s_play",
        "npe_asteroid_atmo_play",
        "outpost_atmo_amarr_play",
        "outpost_atmo_caldari_play",
        "outpost_atmo_gallente_play",
        "outpost_atmo_minmatar_play",
        "phased_asteroid_impossible",
        "phased_fields_fake_rift_fracture_play",
        "phased_fields_fracture_atmo_play",
        "phased_fields_rift_play",
        "pvp_arena_atmo_loop_play",
        "ship_engine_L_afterburner_1st_idle",
        "ship_engine_L_afterburner_3rd_idle",
        "ship_engine_M_afterburner_1st_idle",
        "ship_engine_M_afterburner_3rd_idle",
        "ship_engine_S_afterburner_1st_idle",
        "ship_engine_S_afterburner_3rd_idle",
        "ship_engine_S_microwarpdrive_1st_idle",
        "ship_engine_S_microwarpdrive_3rd_idle",
        "ship_engine_XL_afterburner_1st_idle",
        "ship_engine_XL_afterburner_3rd_idle",
        "ship_engine_XS_afterburner_1st_idle",
        "ship_engine_XS_afterburner_3rd_idle",
        "ship_engine_XS_microwarpdrive_1st_idle",
        "ship_engine_XS_microwarpdrive_3rd_idle",
        "ship_engine_XXL_afterburner_1st_idle",
        "ship_engine_XXL_afterburner_3rd_idle",
        "ship_engine_XXL_microwarpdrive_1st_idle",
        "ship_engine_XXL_microwarpdrive_3rd_idle",
        "ship_smokefire_hangar_play",
        "ship_smokefire_play",
        "small_station_caldari_play",
        "small_station_gallente_play",
        "small_station_minmatar_play",
        "sov_hub_atmo_main_loop_play",
        "space_cathedral_play",
        "station_trade_hub_amarr_play",
        "station_trade_hub_gallente_play",
        "station_trade_hub_minmatar_play",
        "upwell_hangar_repair_timer_play",
        "weather_effects_dark_heavy_play",
        "weather_effects_dark_light_play",
        "weather_effects_electronic_heavy_play",
        "weather_effects_electronic_light_play",
        "weather_effects_exotic_heavy_play",
        "weather_effects_exotic_light_play",
        "weather_effects_gamma_heavy_play",
        "weather_effects_gamma_light_play",
        "weather_effects_plasma_heavy_play",
        "weather_effects_plasma_light_play",
        "weather_effects_snow_play",
        "worldobject_monument_jamyl_statue_play",
    ]);
    assert.deepEqual(graph.nodes["35906075"].sourceEffects[0], {
        effectId: "168001308",
        slotIndex: 0,
        type: "guitar-distortion",
        preEqBands: [],
        postEqBands: [
            {
                index: 0,
                filterType: "peaking",
                gainDb: 4.5,
                frequencyHz: 83,
                q: 1,
            },
            {
                index: 1,
                filterType: "peaking",
                gainDb: -4.5,
                frequencyHz: 1359,
                q: 1.5,
            },
        ],
        distortionType: "heavy",
        drivePercent: 34,
        tonePercent: 0,
        rectificationPercent: 0,
        outputGainDb: 0,
        wetDryMixPercent: 100,
    });
    assert.deepEqual(
        graph.nodes["101885"].sourceEffects[0].driveRtpcCurve,
        {
            rtpc: "ship_health_hull",
            scope: "object",
            accumulation: "additive",
            scaling: 0,
            defaultValue: 50,
            points: [
                {
                    x: 0,
                    value: Math.fround(44.51612854003906),
                    interpolation: 4,
                },
                { x: 100, value: 0, interpolation: 4 },
            ],
        },
    );
    const guitarDistortionSoundIds = new Set(Object.entries(graph.nodes)
        .filter(([, node]) => node.sourceEffects?.some(effect =>
            effect.type === "guitar-distortion"
            && !effect.driveRtpcCurve))
        .map(([ id ]) => id));
    const guitarDistortionEvents = Object.entries(graph.events)
        .filter(([, roots ]) =>
        {
            const pending = roots.map(root => String(root.nodeId));
            const visited = new Set();

            while (pending.length)
            {
                const id = pending.pop();

                if (visited.has(id)) continue;
                visited.add(id);
                if (guitarDistortionSoundIds.has(id)) return true;
                const node = graph.nodes[id];

                if (!node) continue;
                pending.push(...(node.children ?? []).map(child =>
                    String(child.nodeId)));
                pending.push(...Object.values(node.cases ?? {}).map(child =>
                    String(child.nodeId)));
                if (node.default) pending.push(String(node.default.nodeId));
            }
            return false;
        })
        .map(([ name ]) => name)
        .sort();

    assert.deepEqual(guitarDistortionEvents, [
        "drifter_gate_solo_play",
        "hangar_corruption2_play",
        "landing_pad_hardening_play",
        "sun_blue_play",
        "sun_orange_play",
        "sun_pink_play",
        "sun_red_play",
        "sun_white_play",
        "sun_yellow_play",
        "tgfu01_materialization_play",
        "tgfu01_unmaterialization_play",
        "tgfu02_materialization_play",
        "tgfu02_unmaterialization_play",
        "tgfu03_materialization_play",
        "tgfu03_unmaterialization_play",
        "tgfu04_materialization_play",
        "tgfu04_unmaterialization_play",
        "tgfu05_materialization_play",
        "tgfu05_unmaterialization_play",
        "worldobject_wormhole_middleaged_play",
        "worldobject_wormhole_old_play",
        "worldobject_wormhole_play",
        "wormhole_ambience_type_play",
    ]);
    assert.equal(
        graph.nodes["350811697"].sourceEffects,
        undefined,
        "independent Parametric EQ LFE routing keeps the whole chain dry",
    );
    const flangerShipRollIds = [
        "292533695", "293792304", "298447693", "304815500",
        "337117908", "494971020", "531596895", "656720365",
        "721771466", "797614024", "874311158", "914319909",
    ];

    assert.ok(flangerShipRollIds.every(id =>
    {
        const effects = graph.nodes[id]?.sourceEffects;
        const equalizer = effects?.[1];

        return effects?.length === 2
            && effects[0].type === "flanger"
            && equalizer.type === "parametric-eq"
            && equalizer.rtpcCurves?.[0]?.rtpc === "ship_Roll"
            && equalizer.rtpcCurves[0].property === "frequencyHz";
    }), "static Flanger plus ship-roll EQ survives as one complete chain");
    assert.equal(
        sourceEqSounds.filter(node => node.sourceEffects.some(effect =>
            effect.type === "parametric-eq"
            && (effect.outputGainDb !== 0
                || effect.bands.some(band => band.gainDb !== 0)))).length,
        360,
        "the exact demo retains every qualified non-neutral Sound-local EQ",
    );
    assert.deepEqual(
        graph.nodes["793161597"].sourceEffects[0],
        {
            effectId: "544416638",
            slotIndex: 0,
            type: "parametric-eq",
            bands: [ {
                index: 1,
                filterType: "peaking",
                gainDb: -3.5,
                frequencyHz: 361,
                q: 1,
            } ],
            outputGainDb: 0,
            processLfe: true,
        },
        "Jita hangar carries its exact qualified Sound-local EQ",
    );

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
                defaultValue: 1,
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
                defaultValue: 1,
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
                defaultValue: 1,
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
                defaultValue: 1,
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
    assert.deepEqual(
        library.music.switchSetters.music_abyssal_deadspace_tier5_room1_play,
        [
            {
                kind: "state",
                groupId: 1759824668,
                targetId: 3434871818,
            },
            {
                kind: "state",
                groupId: 1666524385,
                targetId: 1359360137,
            },
            {
                kind: "switch",
                groupId: 2573765124,
                targetId: 39390933,
                delayMs: 100,
            },
            {
                kind: "switch",
                groupId: 209172049,
                targetId: 608898761,
                delayMs: 200,
            },
        ],
        "music retains immediate and delayed setters in authored order",
    );

    const musicSourcePlugins = rootId =>
    {
        const pending = [ String(rootId) ];
        const visited = new Set();
        const plugins = [];

        while (pending.length)
        {
            const id = pending.pop();

            if (visited.has(id))
            {
                continue;
            }
            visited.add(id);
            const node = library.music.nodes[id];

            if (!node)
            {
                continue;
            }
            const sources = new Map((node.sources ?? []).map(source =>
                [ String(source.sourceId), source.pluginId ]));

            plugins.push(...(node.clips ?? []).map(clip =>
                sources.get(String(clip.sourceId))));
            pending.push(...(node.children ?? []).map(String));
        }
        return plugins;
    };

    const exordiumPlugins = musicSourcePlugins(212410920);
    const dangerPlugins = musicSourcePlugins(735320614);

    assert.ok(exordiumPlugins.length > 0, "Exordium retains its MIDI clips");
    assert.ok(
        exordiumPlugins.every(pluginId =>
            pluginId === 0x00100001),
        "Exordium is authored entirely as MIDI and is not a WebAudio mood",
    );
    assert.ok(dangerPlugins.length > 0, "Danger retains its WEM clips");
    assert.ok(
        dangerPlugins.every(pluginId =>
            pluginId === 0x00040001),
        "Danger is a WEM-backed mood whose availability depends on delivery",
    );

    const musicExamples = new Map([
        [ "music_eve_dynamic_play", "music-switch-container" ],
        [ "music_ambient001_play", "music-segment" ],
        [ "dungeon_music_cap_day_pirate_combat_r1", "music-playlist-container" ],
        [ "zarzakh_swells_3_test", "music-playlist-container" ],
        [ "music_eve_classic_play", "music-playlist-container" ],
        [ "dungeon_music_default_combat", "music-playlist-container" ],
        [ "music_havoc_insurgency_combat_play", "music-playlist-container" ],
        [ "npe_music_scene04_02_02_00_orbit", "music-playlist-container" ],
        [ "music_abyssal_deadspace_play", "music-switch-container" ],
    ]);

    for (const [ eventName, rootType ] of musicExamples)
    {
        const roots = library.music.eventTargets[eventName] ?? [];

        assert.ok(roots.length > 0, `${eventName} remains a playable demo event`);
        assert.equal(
            library.music.nodes[String(roots[0])]?.type,
            rootType,
            `${eventName} retains its demonstrated root type`,
        );
        assert.ok(
            roots.some(rootId => musicSourcePlugins(rootId).includes(0x00040001)),
            `${eventName} reaches browser-playable WEM media`,
        );
    }
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
