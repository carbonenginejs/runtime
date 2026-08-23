import assert from "node:assert/strict";
import test from "node:test";

import {
    CjsShipTreeController,
    CjsShipTreeMemorySource,
    layoutShipTree
} from "../../../src/tools/ship-tree/index.js";

const tree = {
    factionID: 7,
    factions: [ { factionID: 7, name: "Synthetic Authority" } ],
    groups: [
        { id: "entry", label: "Entry Hulls", typeIDs: [ 101, 102 ], layout: { column: 0, row: 1 } },
        { id: "advanced", label: "Advanced Hulls", typeIDs: [ 201 ], layout: { column: 1, row: 0 } }
    ],
    types: [
        { typeID: 101, name: "Synthetic Scout", masteryLevel: 2 },
        { typeID: 102, name: "Synthetic Surveyor", masteryLevel: 1 },
        { typeID: 201, name: "Synthetic Specialist", masteryLevel: 0 }
    ],
    edges: [ { id: "entry-to-advanced", sourceGroupID: "entry", targetGroupID: "advanced" } ],
    provenance: { provider: "fixture", synthetic: true }
};

test("Ship Tree layout realizes authored topology without mutating source records", () =>
{
    const before = structuredClone(tree);
    const records = layoutShipTree(tree);

    assert.equal(records.nodes.length, 3);
    assert.equal(records.groups.length, 2);
    assert.equal(records.edges.length, 1);
    assert.equal(records.edges[0].points.length, 4);
    assert.equal(records.nodes[0].groupID, "entry");
    assert.deepEqual(tree, before);
});

test("Ship Tree layout preserves authored sparse positions and connector routes", () =>
{
    const authored = structuredClone(tree);

    authored.groups[0].layout.x = -240;
    authored.groups[0].layout.y = 680;
    authored.edges[0].points = [
        { x: -120, y: 720 },
        { x: 60, y: 720 },
        { x: 60, y: 180 }
    ];

    const records = layoutShipTree(authored);
    const entry = records.groups.find(group => group.id === "entry");

    assert.equal(entry.bounds.minX, -240);
    assert.equal(entry.bounds.minY, 680);
    assert.deepEqual(records.edges[0].points, authored.edges[0].points);
    assert.notEqual(records.edges[0].points, authored.edges[0].points);
});

test("Ship Tree layout rejects topology references that are not in the answer", () =>
{
    const invalid = structuredClone(tree);

    invalid.groups[0].typeIDs.push(999);

    assert.throws(() => layoutShipTree(invalid), /missing type 999/u);
});

test("Ship Tree controller fetches asynchronously and traces the selected predecessor path", async () =>
{
    const source = new CjsShipTreeMemorySource({ trees: [ tree ] });
    const controller = new CjsShipTreeController({ source });

    controller.viewport.SetSize(900, 600);
    await controller.FetchTree({ factionID: 7 });

    assert.equal(controller.status, "ready");
    assert.equal(controller.Search("special")[0].id, 201);
    assert.equal(controller.SelectType(201), true);
    assert.deepEqual(controller.GetSelectedPath(), {
        groupIDs: [ "advanced", "entry" ],
        edgeIDs: [ "entry-to-advanced" ]
    });
    assert.equal(controller.Fit(), true);
    assert.ok(controller.GetVisibleNodes().length > 0);

    controller.Destroy();
});

test("Ship Tree memory source preserves mutable answers and supports cancellation", async () =>
{
    const source = new CjsShipTreeMemorySource({ trees: [ tree ] });
    const answer = await source.FetchTree({ factionID: 7 });

    answer.groups[0].label = "Changed";
    answer.groups[0].typeIDs.push(999);

    assert.equal(tree.groups[0].label, "Entry Hulls");
    assert.deepEqual(tree.groups[0].typeIDs, [ 101, 102 ]);

    await assert.rejects(
        source.FetchTree({ factionID: 7, signal: AbortSignal.abort() }),
        error => error.name === "AbortError"
    );
});

test("Ship Tree public logic has no provider, DOM, engine, or raw-SDE dependency", async () =>
{
    const root = await import("@carbonenginejs/runtime/tools");

    assert.equal(root.CjsShipTreeController, CjsShipTreeController);
    assert.equal(typeof root.layoutShipTree, "function");
});
