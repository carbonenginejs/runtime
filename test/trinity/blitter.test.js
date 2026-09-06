import test from "node:test";
import assert from "node:assert/strict";

import { Tr2Blitter, Tr2RenderContext, Tr2VariableStore } from "../../npm/dist/trinity/core/index.js";
import { Tr2RenderContextALStub } from "../../npm/dist/trinityal/index.js";
import { Topology } from "../../npm/dist/global/consts/renderContext/index.js";
import { SCREEN_VERTEX_BYTES } from "../../npm/dist/trinity/core/index.js";
import { Tr2EffectStateManager } from "../../npm/dist/trinity/shader/index.js";

/** A Tr2RenderContext with the stub backend installed, which is what Carbon ships. */
function stubContext()
{
  const al = new Tr2RenderContextALStub();

  al.CreateDevice({ mode: { width: 64, height: 64 } });

  const context = new Tr2RenderContext();

  // SetRenderContextAL returns the AL, not the context - it is not a chaining
  // setter, so this cannot be a one-liner.
  context.SetRenderContextAL(al);

  return context;
}

/** A material whose shader reports `passCount` passes and records what ran. */
function material(passCount = 1, log = [])
{
  const shader = {
    GetPassCount: () => passCount,
    ApplyAllStateForPass: (technique, pass) => log.push(`state:${technique}:${pass}`)
  };

  return {
    log,
    shader,
    GetShaderStateInterface: () => shader,
    ApplyMaterialDataForPass: (technique, pass) => log.push(`data:${technique}:${pass}`)
  };
}

test("the screen-vertex declaration is built, and its ledger matches the stride", () =>
{
  const context = stubContext();
  const blitter = new Tr2Blitter();

  blitter.PrepareResources(context);

  // Carbon builds this with two Add calls and sizes the buffer with
  // sizeof(Tr2ScreenVertex) - two sources of truth that must agree. The
  // declaration is interned by handle, so reach it back through the intern
  // table rather than re-deriving it here.
  const definition = Tr2EffectStateManager.getVertexDeclarationElements(blitter.GetScreenVertexDeclaration());
  const items = definition.items;

  assert.equal(items.length, 2);
  assert.deepEqual(items.map(item => item.usage), [ "POSITION", "TEXCOORD" ]);
  assert.deepEqual(items.map(item => item.type), [ "FLOAT32_4", "FLOAT32_2" ]);

  // The offsets come from the ledger, not from arithmetic in this file.
  assert.deepEqual(items.map(item => item.offset), [ 0, 16 ]);

  // And the ledger's end is the stride the buffer and stream source use.
  assert.equal(definition.nextOffset[0], SCREEN_VERTEX_BYTES, "declaration and stride agree");
});

test("the blitter runs every pass of its shader over one quad", () =>
{
  const context = stubContext();
  const blitter = new Tr2Blitter();
  const effect = material(3);

  assert.equal(blitter.Draw(context, effect), true);

  // Carbon applies shader state then material data per pass, and draws inside
  // the loop rather than once after it (cpp:146-156).
  assert.deepEqual(effect.log, [
    "state:0:0", "data:0:0",
    "state:0:1", "data:0:1",
    "state:0:2", "data:0:2"
  ]);
});

test("the quad reaches the vertex buffer, as a triangle strip", () =>
{
  const context = stubContext();
  const al = context.GetRenderContextAL();
  const blitter = new Tr2Blitter();

  const topologies = [];
  const draws = [];
  al.SetTopology = (topology) => { topologies.push(topology); return true; };
  al.DrawPrimitive = (startVertex, primitiveCount) => { draws.push([ startVertex, primitiveCount ]); return true; };

  assert.equal(blitter.Draw(context, material()), true);

  // Four vertices describe two triangles as a strip. Drawing them as a list
  // would need six and silently render one triangle from garbage.
  assert.deepEqual(topologies, [ Topology.TOP_TRIANGLE_STRIP ]);
  assert.deepEqual(draws, [ [ 0, 2 ] ]);
});

test("a null material is refused rather than crashing", () =>
{
  const context = stubContext();
  const blitter = new Tr2Blitter();

  // Carbon asserts and then returns false anyway; the refusal is the shipping
  // half (cpp:101-107).
  assert.equal(blitter.Draw(context, null), false);

  // A material with no shader is the same refusal, one level in.
  assert.equal(blitter.Draw(context, { GetShaderStateInterface: () => null }), false);
});

test("BlitSource is published for a textured blit and cleared afterwards", () =>
{
  const context = stubContext();
  const blitter = new Tr2Blitter();
  const texture = { id: "source" };

  blitter.Draw(context, material(), texture);

  // Carbon clears the entry after the draw (cpp:157-158) so the next blit
  // cannot inherit this one's texture. A blitter that only ever set it would
  // look correct on the first draw and wrong on every later untextured one.
  const blitSource = Tr2VariableStore.GlobalStore().GetVariable("BlitSource");
  assert.notEqual(blitSource, null);
  assert.equal(blitSource.GetValue(), null);
});

test("resources are prepared once and released together", () =>
{
  const context = stubContext();
  const blitter = new Tr2Blitter();

  assert.equal(blitter.IsPrepared(), false);
  assert.equal(blitter.PrepareResources(context), true);
  assert.equal(blitter.IsPrepared(), true);

  // Idempotent, as Carbon's OnPrepareResources is: both halves test before
  // building.
  assert.equal(blitter.PrepareResources(context), true);

  blitter.ReleaseResources();
  assert.equal(blitter.IsPrepared(), false);

  // And it comes back, which is the point of releasing rather than destroying.
  assert.equal(blitter.PrepareResources(context), true);
});

test("DrawTexture picks the filtered effect only for linear, and refuses a missing one", () =>
{
  const context = stubContext();
  const blitter = new Tr2Blitter();
  const point = material();
  const linear = material();

  blitter.SetBlitEffects(point, linear);

  assert.equal(blitter.DrawTexture(context, { id: "t" }, {}, 0), true);
  assert.equal(point.log.length, 2);
  assert.equal(linear.log.length, 0);

  assert.equal(blitter.DrawTexture(context, { id: "t" }, {}, 1), true);
  assert.equal(linear.log.length, 2);

  // Point and linear are two different EFFECTS in Carbon, not a sampler
  // setting, so a blitter given only one cannot serve the other.
  const partial = new Tr2Blitter().SetBlitEffects(material());
  assert.equal(partial.DrawTexture(context, { id: "t" }, {}, 1), false);
});

test("camera space refuses when no projection is set rather than unprojecting through nothing", () =>
{
  const context = stubContext();
  const blitter = new Tr2Blitter();
  const effect = material();

  assert.equal(context.GetProjection(), null);
  assert.equal(blitter.DrawInCameraSpace(context, effect.GetShaderStateInterface(), effect), false);
  assert.equal(effect.log.length, 0);
});
