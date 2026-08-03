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
    assert.ok(Object.keys(graph.programs).length > 0);
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
    for (const eventName of [
        "ship_engine_XXL_microwarpdrive_1st_on",
        "ship_engine_XXL_microwarpdrive_3rd_on",
    ])
    {
        assert.equal(
            graph.events[eventName],
            undefined,
            `${eventName} keeps its associated Continuous Layers fail-closed`,
        );
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
    const sourceEqSounds = nodes.filter(node =>
        Array.isArray(node.sourceEffects));

    assert.equal(sourceEqSounds.length, 20);
    assert.equal(
        sourceEqSounds.filter(node => node.sourceEffects.some(effect =>
            effect.outputGainDb !== 0
            || effect.bands.some(band => band.gainDb !== 0))).length,
        19,
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
