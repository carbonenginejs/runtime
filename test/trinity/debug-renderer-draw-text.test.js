// Tr2DebugRenderer.DrawText (Tr2DebugRenderer.cpp:723-745): the projected
// point, the depth gate and the queued rect, over Tr2Renderer's view and
// projection statics, which each test sets explicitly.
import assert from "node:assert/strict";
import test from "node:test";
import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { color } from "../../npm/dist/global/math/color.js";
import {
  Tr2DebugRenderer,
  Tr2Renderer,
  TriDebugFont,
  TriDebugFontStyle,
  TriDebugTextRenderer,
  Tr2RenderContext_GetMainThreadRenderContext
} from "../../npm/dist/trinity/core/index.js";

/** Records every Vprintf on the shared text renderer, then forwards it. */
function RecordVprintf(t)
{
  const calls = [];
  const original = TriDebugTextRenderer.prototype.Vprintf;
  TriDebugTextRenderer.prototype.Vprintf = function(font, rect, format, textColor, msg, args)
  {
    calls.push({ renderer: this, font, rect: { ...rect }, format, color: Array.from(textColor), msg, args });
    return original.call(this, font, rect, format, textColor, msg, args);
  };
  t.after(() => { TriDebugTextRenderer.prototype.Vprintf = original; });
  return calls;
}

function SetupFrame()
{
  Tr2Renderer.SetViewTransform(mat4.create());
  Tr2Renderer.SetProjectionTransform(mat4.create());
  Tr2RenderContext_GetMainThreadRenderContext().GetRenderContextAL()
    .SetViewport({ x: 10, y: 20, width: 200, height: 100, minZ: 0, maxZ: 1 });
}

test("DrawText queues left-aligned text in a 1024x512 rect at the projected point", t =>
{
  SetupFrame();
  const calls = RecordVprintf(t);
  const renderer = new Tr2DebugRenderer();
  const textColor = color.fromValues(1, 0.5, 0.25, 1);

  // Identity view and projection: NDC (0.5, 0.5) lands at x = 10 + 200 * 0.75,
  // y = 20 + 100 * 0.25, depth 0.25.
  renderer.DrawText(TriDebugFont.TRI_DBG_FONT_MEDIUM, [ 0.5, 0.5, 0.25 ], textColor, "hp %d", 42);

  assert.equal(calls.length, 1);
  const [ call ] = calls;
  assert.deepEqual(call.rect, { top: 45, left: 160, bottom: 45 + 512, right: 160 + 1024 });
  assert.equal(call.font, TriDebugFont.TRI_DBG_FONT_MEDIUM);
  assert.equal(call.format, TriDebugFontStyle.TRI_DFS_LEFT);
  assert.deepEqual(call.color, [ 1, 0.5, 0.25, 1 ]);
  assert.equal(call.msg, "hp %d");
  assert.deepEqual(call.args, [ 42 ]);
});

test("DrawText truncates the projected position toward zero, as the int32_t casts do", t =>
{
  SetupFrame();
  const calls = RecordVprintf(t);

  // x = 10 + 200 * (0.5 + 0.5 * 0.0013) = 110.13; y = 20 + 100 * (0.5 - 0.5 * 0.0013) = 69.935.
  new Tr2DebugRenderer().DrawText(0, [ 0.0013, 0.0013, 0.5 ], color.fromValues(1, 1, 1, 1), "x");

  assert.equal(calls.length, 1);
  assert.equal(calls[0].rect.left, 110);
  assert.equal(calls[0].rect.top, 69);
});

test("DrawText queues nothing unless the projected depth is strictly inside (0, 1)", t =>
{
  SetupFrame();
  const calls = RecordVprintf(t);
  const renderer = new Tr2DebugRenderer();
  const white = color.fromValues(1, 1, 1, 1);

  for (const z of [ 0, 1, -0.5, 1.5 ])
  {
    renderer.DrawText(0, [ 0, 0, z ], white, "clipped");
  }
  assert.equal(calls.length, 0);

  renderer.DrawText(0, [ 0, 0, 0.999 ], white, "inside");
  assert.equal(calls.length, 1);
});

test("DrawText projects through the view and projection statics", t =>
{
  SetupFrame();
  // A view translating x by +0.25 moves the text right by 200 * 0.5 * 0.25 = 25 px.
  Tr2Renderer.SetViewTransform(mat4.fromTranslation(mat4.create(), [ 0.25, 0, 0 ]));
  const calls = RecordVprintf(t);

  new Tr2DebugRenderer().DrawText(0, [ 0, 0, 0.5 ], color.fromValues(1, 1, 1, 1), "moved");

  assert.equal(calls.length, 1);
  assert.equal(calls[0].rect.left, 10 + 100 + 25);
});
