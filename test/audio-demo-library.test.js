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

test("committed demo library carries authored setters, switches, and RTPC blends", () =>
{
    const json = fs.readFileSync(jsonPath);
    const library = JSON.parse(json);
    const graph = library.sfx;

    assert.deepEqual(gunzipSync(fs.readFileSync(gzipPath)), json);
    assert.equal(library.schema, "carbonenginejs.audioLibrary");
    assert.equal(library.schemaVersion, 2);
    assert.equal(library.hasOptionalEnrichment, false);
    assert.equal(validateAudioLibraryDocument(library), true);
    assert.ok(Object.keys(graph.eventActions).length > 0);

    assert.deepEqual(graph.eventActions.charge_abyssal_switch, [
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
        graph.eventActions.isInsideFractureBubble_yes,
        [
            {
                kind: "state",
                group: "isInsideFractureBubble",
                value: "yes",
            },
        ],
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
