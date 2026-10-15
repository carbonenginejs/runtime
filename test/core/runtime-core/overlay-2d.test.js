// CjsOverlay2D: a 2D canvas pinned over the 3D canvas, drawn on Blue ticks.
import assert from "node:assert/strict";
import test from "node:test";

import { CjsOverlay2D, CjsLibrary } from "../../../npm/dist/core/index.js";
import { be } from "../../../npm/dist/global/blue/index.js";

function fakeView()
{
  const context = { clears: [], clearRect(...args) { this.clears.push(args); } };
  const overlay = { style: {}, width: 300, height: 150, removed: false,
    getContext: kind => (kind === "2d" ? context : null), remove() { this.removed = true; } };
  const target = { width: 800, height: 600, offsetLeft: 10, offsetTop: 20, clientLeft: 1, clientTop: 1,
    clientWidth: 533, clientHeight: 400, inserted: null,
    insertAdjacentElement(position, element) { this.inserted = [ position, element ]; } };
  const document = { createElement: tag => { assert.equal(tag, "canvas"); return overlay; }, defaultView: {} };
  target.ownerDocument = document;
  return { target, overlay, context, document };
}


test("the overlay sits after the 3D canvas with its backing size and CSS box", () =>
{
  const { target, overlay } = fakeView();
  const view = new CjsOverlay2D({ canvas: target, tick: false });
  assert.deepEqual(target.inserted, [ "afterend", overlay ]);
  assert.equal(overlay.width, 800);
  assert.equal(overlay.height, 600);
  assert.deepEqual([ overlay.style.left, overlay.style.top, overlay.style.width, overlay.style.height ],
    [ "11px", "21px", "533px", "400px" ]);
  assert.equal(overlay.style.position, "absolute");
  view.Destroy();
  assert.equal(overlay.removed, true);
});


test("each frame clears, then runs the drawers in order; a resize frame skips the clear", () =>
{
  const { target, context } = fakeView();
  const view = new CjsOverlay2D({ canvas: target, tick: false });
  const calls = [];
  view.AddDrawer((ctx, overlay) => calls.push([ "a", ctx === context, overlay === view ]));
  const second = view.AddDrawer(() => calls.push([ "b" ]));
  view.Render();
  assert.deepEqual(calls, [ [ "a", true, true ], [ "b" ] ]);
  assert.deepEqual(context.clears, [ [ 0, 0, 800, 600 ] ]);

  target.width = 1024;
  view.Render();
  assert.equal(view.canvas.width, 1024, "follows a backing-size change made without a CSS resize");
  assert.equal(context.clears.length, 1, "resizing the backing store already cleared it");

  assert.equal(view.RemoveDrawer(second), true);
  calls.length = 0;
  view.Render();
  assert.deepEqual(calls, [ [ "a", true, true ] ]);
  view.Destroy();
});


test("it draws on every Blue pump and stops when destroyed; the library creates it", () =>
{
  const { target } = fakeView();
  const view = new CjsLibrary().CreateOverlay2D({ canvas: target });
  let frames = 0;
  view.AddDrawer(() => frames++);
  assert.equal(be.os.IsRegisteredForTicks(view), true);
  be.os.PumpOS();
  be.os.PumpOS();
  assert.equal(frames, 2);
  view.Destroy();
  assert.equal(be.os.IsRegisteredForTicks(view), false);
  be.os.PumpOS();
  assert.equal(frames, 2);
});
