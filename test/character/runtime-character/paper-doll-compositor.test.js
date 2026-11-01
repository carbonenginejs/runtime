import assert from "node:assert/strict";
import test from "node:test";
import { CjsPaperDollCompositor, CjsPaperDollCompositionTarget, CjsPaperDollMaterialLayer } from "../../../npm/dist/character/index.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../../../npm/dist/trinity/index.js";
import { Tr2RenderContextALStub } from "../../../npm/dist/trinityal/index.js";
import { PixelFormat } from "../../../npm/dist/global/consts/renderContext/index.js";

const build = { CheckActive() {}, Ready: value => value };

function stubContext(t)
{
    const context = Tr2RenderContext_GetMainThreadRenderContext(), oldAL = context.GetRenderContextAL();
    const al = new Tr2RenderContextALStub();
    al.CreateDevice();
    context.SetRenderContextAL(al);
    t.after(() => { context.SetRenderContextAL(oldAL); al.Destroy(); });
    return context;
}

test("the compositor's region statics: cutout, bounds and a rounded viewport", () =>
{
    assert.deepEqual(Array.from(CjsPaperDollCompositor.full), [ 0, 0, 1, 1 ]);
    assert.deepEqual(Array.from(CjsPaperDollCompositor.clear), [ 0, 0, 0, 0 ]);
    assert.deepEqual(Array.from(CjsPaperDollCompositor.crop({ cutoutX: .25, cutoutY: .5, cutoutWidth: .5, cutoutHeight: .25 })), [ .25, .5, .5, .25 ]);
    assert.deepEqual(Array.from(CjsPaperDollCompositor.bounds([ .25, .5, .5, .25 ])), [ .25, .5, .75, .75 ]);
    // Both edges round, so two adjacent regions meet without a gap or overlap.
    const left = CjsPaperDollCompositor.viewport(1000, 100, [ 0, 0, .3333, 1 ]);
    const right = CjsPaperDollCompositor.viewport(1000, 100, [ .3333, 0, .6667, 1 ]);
    assert.equal(left.x + left.width, right.x);
    assert.deepEqual(right, { x: 333, y: 0, width: 667, height: 100, minZ: 0, maxZ: 1 });
});

test("a material layer draws its pattern for a patterned palette, else its diffuse with the selection's colours", () =>
{
    const writes = [];
    const diffuse = { SetParameter__Vector4: (name, value) => writes.push([ name, Array.from(value) ]) };
    const pattern = {};
    const layer = new CjsPaperDollMaterialLayer();
    layer.DiffuseMap = { effect: diffuse, region: CjsPaperDollCompositor.full };
    layer.patterns.set("res:/patterned.color", pattern);
    const colors = [ [ 1, 0, 0, 1 ], [ 0, 1, 0, 1 ], [ 0, 0, 1, 1 ] ];
    assert.equal(layer.DiffuseFor({ palette: "res:/patterned.color", colors }), pattern);
    assert.equal(layer.DiffuseFor({ palette: "res:/plain.color", colors }), diffuse);
    assert.deepEqual(writes, [], "a plain (not colourised) diffuse keeps its own colours");
    layer.colourised = true;
    layer.DiffuseFor({ palette: "res:/plain.color", colors });
    assert.deepEqual(writes, [ [ "Color1", [ 1, 0, 0, 1 ] ], [ "Color2", [ 0, 1, 0, 1 ] ], [ "Color3", [ 0, 0, 1, 1 ] ] ]);
});

test("the compositor makes, finishes and releases its targets; a composition target draws through it", t =>
{
    const context = stubContext(t);
    const compositor = new CjsPaperDollCompositor(context, build);
    const plain = compositor.MakeTarget(64, 32);
    const mipped = compositor.MakeTarget(64, 32, true);
    assert.deepEqual(compositor.targets, [ plain, mipped ]);
    // A mipped target is RGBA (Carbon generates no mips for BGR formats); the others BGRA.
    assert.equal(plain.GetFormat(), PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM);
    assert.equal(mipped.GetFormat(), PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM);
    assert.equal(mipped.GetMipCount(), 7);

    const target = compositor.TargetTexture(16, 8);
    assert.equal(target.constructor, CjsPaperDollCompositionTarget);
    assert.equal(compositor.targets.at(-1), target.target);
    assert.equal(target.width, 16);
    const draws = [];
    compositor.Draw = (...args) => draws.push(args);
    target.Draw("effect", CjsPaperDollCompositor.full, true);
    assert.deepEqual(draws, [ [ target.target, 16, 8, "effect", CjsPaperDollCompositor.full, true, true ] ]);

    compositor.Destruct();
    assert.deepEqual(compositor.targets, []);
    assert.deepEqual(compositor.effects, []);
    compositor.Destruct();
});

test("the compositor's encoding flags follow the source's channel count", t =>
{
    const compositor = new CjsPaperDollCompositor(stubContext(t), build);
    assert.deepEqual(compositor._Flags({ format: PixelFormat.PIXEL_FORMAT_R8_UNORM }, "texture"), { texture_L8: 1, texture_L8A8: 0 });
    assert.deepEqual(compositor._Flags({ format: PixelFormat.PIXEL_FORMAT_R8G8_UNORM }, "zonemap"), { zonemap_L8: 0, zonemap_L8A8: 1 });
    assert.deepEqual(compositor._Flags({ format: PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM }, "detailmap"), { detailmap_L8: 0, detailmap_L8A8: 0 });
    compositor.Destruct();
});
