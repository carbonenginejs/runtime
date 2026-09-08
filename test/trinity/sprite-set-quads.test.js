import test from "node:test";
import assert from "node:assert/strict";
import { EveSpriteSet, EveSpriteSetItem } from "../../npm/dist/trinity/index.js";
import { num } from "../../npm/dist/global/math/num.js";
import { mat4 } from "../../npm/dist/global/math/mat4.js";

const float16 = { float32To16: num.toHalfFloat, float16To32: num.fromHalfFloat };

/**
 * EveSpriteSet's quad-renderer surface (Carbon EveSpriteSet.cpp:18-33,
 * 83-124, 168-219, 300-343): the PoolVertex packing, both submission paths
 * and the registration seam.
 */

function makeSprite(values)
{
    const sprite = new EveSpriteSetItem();
    sprite.SetValues(values);
    return sprite;
}

function makeSet()
{
    const set = new EveSpriteSet();
    set.effect = { GetHashValue: () => 0x1234 };
    set.sprites.push(makeSprite({
        position: [ 1, 2, 3 ],
        blinkPhase: 0.25,
        blinkRate: 0.5,
        minScale: 2,
        maxScale: 8,
        falloff: 0.75,
        color: [ 1, 0.5, 0, 1 ],
        warpColor: [ 0, 0.25, 1, 0.5 ],
        boneIndex: 1
    }));
    set.Rebuild();
    return set;
}

function makeRenderer()
{
    const calls = { registered: [], quads: [] };
    return {
        calls,
        RegisterEffect(...args) { calls.registered.push(args); },
        AddQuads(key, bytes, count) { calls.quads.push({ key, bytes: Uint8Array.from(bytes), count }); }
    };
}

test("Rebuild packs Carbon's 32-byte PoolVertex exactly", () =>
{
    const set = makeSet();
    const renderer = makeRenderer();
    set.AddToQuadRenderer(renderer, mat4.create(), 0, 0);
    const view = new DataView(renderer.calls.quads[0].bytes.buffer);

    assert.equal(renderer.calls.quads[0].bytes.length, 32);
    assert.equal(view.getFloat32(0, true), 1);
    assert.equal(view.getFloat32(4, true), 2);
    assert.equal(view.getFloat32(8, true), 3);
    assert.equal(view.getUint16(14, true), float16.float32To16(0.25), "blinkPhase half");
    assert.equal(view.getUint16(16, true), float16.float32To16(0.5), "blinkRate half");
    assert.equal(view.getUint16(18, true), float16.float32To16(2), "minScale half");
    assert.equal(view.getUint16(20, true), float16.float32To16(8), "maxScale half");
    assert.equal(view.getUint16(22, true), float16.float32To16(0.75), "falloff half");
    // Carbon's ARGB B/R swap is little-endian r,g,b,a in byte order.
    assert.deepEqual([ ...renderer.calls.quads[0].bytes.slice(24, 28) ], [ 255, 128, 0, 255 ]);
    assert.deepEqual([ ...renderer.calls.quads[0].bytes.slice(28, 32) ], [ 0, 64, 255, 128 ]);
});

test("registration carries the additive batch, stride 32 and the hash key", () =>
{
    const set = makeSet();
    const renderer = makeRenderer();
    set.RegisterWithQuadRenderer(renderer);
    const [ key, batchType, instanceSize, quadCount, definition, effect ] = renderer.calls.registered[0];
    assert.equal(key, 0x1234);
    assert.equal(instanceSize, 32);
    assert.equal(quadCount, 1);
    assert.equal(definition, EveSpriteSet.getDefinition());
    // A real Tr2VertexDefinition built through Add - Carbon's automatic
    // per-stream offsets land exactly on the 32-byte PoolVertex layout.
    assert.equal(definition.items.length, 6);
    assert.deepEqual(definition.items.map(item => item.offset), [ 0, 0, 12, 20, 24, 28 ]);
    assert.deepEqual(definition.nextOffset.slice(0, 2), [ 4, 32 ]);
    assert.equal(effect, set.effect);
    assert.equal(typeof batchType, "number");
});

test("AddToQuadRenderer transforms positions and stamps activation * intensity", () =>
{
    const set = makeSet();
    set.intensity = 0.5;
    const renderer = makeRenderer();
    const world = mat4.fromTranslation(mat4.create(), [ 10, 20, 30 ]);
    set.AddToQuadRenderer(renderer, world, 0.8, 0);

    const { bytes, key, count } = renderer.calls.quads[0];
    const view = new DataView(bytes.buffer);
    assert.equal(key, 0x1234);
    assert.equal(count, 1);
    assert.equal(view.getFloat32(0, true), 11);
    assert.equal(view.getFloat32(4, true), 22);
    assert.equal(view.getFloat32(8, true), 33);
    assert.equal(view.getUint16(12, true), float16.float32To16(Math.fround(0.8 * 0.5)));

    // display gates the whole submission (cpp:176-179).
    set.display = false;
    set.AddToQuadRenderer(renderer, world, 0.8, 0);
    assert.equal(renderer.calls.quads.length, 1);
});

test("a skinned set routes positions through the bone then the parent", () =>
{
    const set = makeSet();
    set.skinned = true;
    const renderer = makeRenderer();

    // Bone 1 translates by (100, 0, 0); flat Float4x3 rows, stride 12.
    const bones = new Float32Array(24);
    bones.set([ 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0 ], 0);
    bones.set([ 1, 0, 0, 100, 0, 1, 0, 0, 0, 0, 1, 0 ], 12);
    const world = mat4.fromTranslation(mat4.create(), [ 0, 0, 5 ]);
    set.AddToQuadRenderer(renderer, world, 1, 0, bones, 2);

    const view = new DataView(renderer.calls.quads[0].bytes.buffer);
    assert.equal(view.getFloat32(0, true), 101);
    assert.equal(view.getFloat32(8, true), 8);

    // A bone index past boneCount falls back to the parent transform alone.
    set.sprites[0].boneIndex = 7;
    set.Rebuild();
    set.AddToQuadRenderer(renderer, world, 1, 0, bones, 2);
    const fallback = new DataView(renderer.calls.quads[1].bytes.buffer);
    assert.equal(fallback.getFloat32(0, true), 1);
});

test("the booster path carries the world Z axis and gain alphas destructively", () =>
{
    const set = makeSet();
    const renderer = makeRenderer();
    const world = mat4.create();
    world[8] = 0.25; world[9] = -1; world[10] = 4; // the Z basis (Carbon GetZ)
    set.AddBoosterGlowToQuadRenderer(renderer, world, 0.5, 2);

    const { bytes } = renderer.calls.quads[0];
    const view = new DataView(bytes.buffer);
    assert.equal(view.getUint16(12, true), float16.float32To16(0.25), "activation slot carries zDir.x");
    assert.equal(view.getUint16(16, true), float16.float32To16(-1), "blinkRate slot carries zDir.y");
    assert.equal(view.getUint16(22, true), float16.float32To16(4), "falloff slot carries zDir.z");
    assert.equal(bytes[27], 127, "colour alpha byte becomes the booster gain");
    assert.equal(bytes[31], 255, "warp alpha byte clamps at 255");
    // RGB bytes survive the alpha overwrite.
    assert.deepEqual([ ...bytes.slice(24, 27) ], [ 255, 128, 0 ]);
});
