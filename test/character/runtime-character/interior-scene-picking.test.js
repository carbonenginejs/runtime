import test from "node:test";
import assert from "node:assert/strict";
import { Tr2InteriorScene } from "../../../npm/dist/character/index.js";
import { ITr2PickableScene } from "../../../npm/dist/trinity/index.js";

const { PICK_OBJECT, PICK_AREA, PICK_POSITION, PICK_UV } = ITr2PickableScene.PickComponent;

/** One picked pixel's 16 bytes: blue, green, red and alpha floats, as the float pick target stores them. */
function Pixel(b, g, r, a)
{
    return new Uint8Array(Float32Array.of(b, g, r, a).buffer);
}

test("the interior scene is a pickable scene with its own float pick target", () =>
{
    const scene = new Tr2InteriorScene();
    assert.ok(scene instanceof ITr2PickableScene);
    assert.equal(scene.RenderPickingAreasForComponents(PICK_OBJECT), true);
    assert.ok(scene.GetPickBuffer());
    assert.notEqual(scene.GetOpaquePickingBatchAccumulator(), scene.GetPickingBatchAccumulator());
});

test("all four components take two passes, UV second; anything else takes one (Tr2InteriorScene.cpp:1342-1355)", () =>
{
    const scene = new Tr2InteriorScene();
    assert.deepEqual(scene.GetRequiredPasses(PICK_OBJECT | PICK_AREA | PICK_POSITION | PICK_UV), [ PICK_OBJECT | PICK_AREA | PICK_POSITION, PICK_UV ]);
    assert.deepEqual(scene.GetRequiredPasses(PICK_OBJECT), [ PICK_OBJECT ]);
    assert.deepEqual(scene.GetRequiredPasses(PICK_UV), [ PICK_UV ]);
});

test("a pick pixel decodes as Carbon's DecodeBufferPixel (Tr2InteriorScene.cpp:1357-1386)", () =>
{
    const scene = new Tr2InteriorScene();
    const object = {};
    scene.DecodeBufferPixel(Pixel(3, 2, 0.25, 0), PICK_OBJECT | PICK_AREA | PICK_POSITION, object);
    assert.deepEqual(object, { objectId: 2, areaId: 2, depth: 0.25 }, "blue + 0.5 - 1 is the object, green the area, red the depth");

    const empty = {};
    scene.DecodeBufferPixel(Pixel(0, 0, 0, 0), PICK_OBJECT, empty);
    assert.equal(empty.objectId, 0xffff, "a cleared pixel decrements to no object");

    const uv = {};
    scene.DecodeBufferPixel(Pixel(1, 4, 0.5, 0.75), PICK_UV, uv);
    assert.deepEqual(uv, { objectId: 0, uv: [ 0.5, 0.75 ], areaId: 4 }, "a UV pass reads u from red, v from alpha, the area from green");

    const uvDepth = {};
    scene.DecodeBufferPixel(Pixel(1, 0.4, 0.5, 0.75), PICK_UV | PICK_POSITION, uvDepth);
    assert.equal(Math.fround(uvDepth.depth), Math.fround(0.4), "with position too, green is the depth");
});

test("every pick re-runs the candidate query (CE-227, adapted: Carbon reuses the first pick's list)", t =>
{
    const scene = new Tr2InteriorScene();
    const first = { name: "first" }, later = { name: "later" };
    const found = [ [ first ], [ first, later ] ];
    let queries = 0;
    t.mock.method(scene, "_ResolveVisibility", function ()
    {
        for (const object of found[queries]) this._visibleObjects.push(object);
        queries++;
    });
    assert.deepEqual(scene.GetPickingObjectsToRender([ 0, 0, 1 ]), [ first ]);
    // An object added after the first pick is a candidate of the next one.
    assert.deepEqual(scene.GetPickingObjectsToRender([ 0, 0, 1 ]), [ first, later ]);
    assert.equal(queries, 2);
});
