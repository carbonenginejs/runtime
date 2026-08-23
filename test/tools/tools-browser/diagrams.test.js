import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
    CjsDiagramLinearIndex,
    CjsDiagramModel,
    CjsDiagramSelection,
    CjsDiagramViewport,
    diagramBoundsFromRecords
} from "../../../src/tools/diagrams/index.js";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

test("diagram model retains mutable records and stable-ID lookups", () =>
{
    const node = {
        id: 10,
        label: "Frigate",
        position: { x: 20, y: 30 },
        size: { width: 10, height: 20 }
    };
    const model = new CjsDiagramModel({
        nodes: [ node ],
        edges: [ { id: "progression", sourceID: 10, targetID: 20 } ],
        groups: [ { id: "lane", memberIDs: [ 10 ] } ],
        layers: [ { id: "ships" } ]
    });

    node.label = "Assault Frigate";

    assert.equal(model.GetNode(10), node);
    assert.equal(model.GetNode(10).label, "Assault Frigate");
    assert.equal(model.GetEdge("progression").sourceID, 10);
    assert.equal(model.GetGroup("lane").memberIDs[0], 10);
    assert.equal(model.GetLayer("ships").id, "ships");
    assert.deepEqual(model.GetBounds(), { minX: 15, minY: 20, maxX: 25, maxY: 40 });
});

test("diagram model rejects duplicate stable IDs and malformed edges", () =>
{
    assert.throws(() => new CjsDiagramModel({
        nodes: [
            { id: 1, position: { x: 0, y: 0 } },
            { id: 1, position: { x: 1, y: 1 } }
        ]
    }), /Duplicate diagram node ID/u);

    assert.throws(() => new CjsDiagramModel({
        edges: [ { id: "edge", sourceID: null, targetID: 2 } ]
    }), /sourceID/u);
});

test("linear visible-set queries preserve order, importance, and paint-order picking", () =>
{
    const back = { id: "back", bounds: { minX: 0, minY: 0, maxX: 20, maxY: 20 }, importance: 1 };
    const front = { id: "front", bounds: { minX: 5, minY: 5, maxX: 15, maxY: 15 }, importance: 5 };
    const index = new CjsDiagramLinearIndex([ back, front ]);

    assert.deepEqual(index.Query(
        { minX: 4, minY: 4, maxX: 16, maxY: 16 },
        { minimumImportance: 2 }
    ), [ front ]);
    assert.equal(index.HitTest(10, 10), front);
    assert.equal(index.Get("back"), back);
    assert.deepEqual(index.List(), [ back, front ]);
});

test("diagram bounds handle externally sized iterables without variadic expansion", () =>
{
    function* records()
    {
        for (let index = 0; index < 50000; index++)
        {
            yield { id: index, position: { x: index, y: -index } };
        }
    }

    assert.deepEqual(diagramBoundsFromRecords(records()), {
        minX: 0,
        minY: -49999,
        maxX: 49999,
        maxY: 0
    });
});

test("viewport transforms round-trip and anchored zoom preserves the cursor world point", () =>
{
    const viewport = new CjsDiagramViewport({
        centerX: 100,
        centerY: -50,
        zoom: 2,
        width: 800,
        height: 600
    });
    const screen = viewport.WorldToScreen(125, -25);

    assert.deepEqual(screen, { x: 450, y: 350 });
    assert.deepEqual(viewport.ScreenToWorld(screen.x, screen.y), { x: 125, y: -25 });

    const before = viewport.ScreenToWorld(700, 120);

    viewport.SetZoom(8, { anchorX: 700, anchorY: 120 });

    assert.deepEqual(viewport.ScreenToWorld(700, 120), before);
});

test("viewport pan and fit operate in CSS pixels without owning gestures", () =>
{
    const viewport = new CjsDiagramViewport({ zoom: 2, width: 400, height: 200 });

    viewport.PanByScreen(20, -10);

    assert.equal(viewport.centerX, -10);
    assert.equal(viewport.centerY, 5);
    assert.equal(viewport.FitBounds({ minX: 0, minY: 0, maxX: 100, maxY: 50 }), true);
    assert.equal(viewport.centerX, 50);
    assert.equal(viewport.centerY, 25);
    assert.equal(viewport.zoom, 4);
    assert.deepEqual(viewport.GetVisibleBounds(), { minX: 0, minY: 0, maxX: 100, maxY: 50 });
});

test("selection distinguishes selected, focused, and hovered IDs", () =>
{
    const selection = new CjsDiagramSelection();
    const events = [];
    const unsubscribe = selection.Subscribe(event => events.push(event));

    assert.equal(selection.Select("frigate"), true);
    assert.equal(selection.Select("cruiser", { additive: true }), true);
    assert.equal(selection.SetHover("cruiser"), true);
    assert.equal(selection.SetFocus("frigate"), true);
    assert.equal(selection.IsSelected("cruiser"), true);

    selection.Retain([ "cruiser" ]);
    unsubscribe();

    assert.deepEqual(selection.Snapshot(), {
        selectedIDs: [ "cruiser" ],
        focusedID: null,
        hoveredID: "cruiser"
    });
    assert.equal(selection.Select("cruiser", { toggle: true }), true);
    assert.deepEqual(selection.Snapshot(), {
        selectedIDs: [],
        focusedID: "cruiser",
        hoveredID: "cruiser"
    });
    assert.ok(events.length >= 4);
});

test("diagram logic is DOM-, CSS-, engine-, and provider-independent", async () =>
{
    const directory = path.join(packageRoot, "src", "tools", "diagrams");

    for (const name of await fs.readdir(directory))
    {
        if (!name.endsWith(".js")) continue;

        const source = await fs.readFile(path.join(directory, name), "utf8");

        assert.doesNotMatch(source, /\b(?:document|window|HTMLElement|SVGElement|CanvasRenderingContext2D)\b|\.css["']/u, name);
        assert.doesNotMatch(source, /ccpwgl|trinity|esi|\/sde\//iu, name);
    }
});

test("the package root exports the reusable diagram foundation", async () =>
{
    const root = await import("../../../npm/dist/tools/index.js");

    assert.equal(root.CjsDiagramModel.name, CjsDiagramModel.name);
    assert.equal(root.CjsDiagramViewport.name, CjsDiagramViewport.name);
    assert.equal(root.CjsDiagramSelection.name, CjsDiagramSelection.name);
});
