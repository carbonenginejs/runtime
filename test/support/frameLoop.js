// TEST HELPER, not a runtime API.
//
// The host's frame loop. Prepares run only in resMan's per-frame Update, as
// Carbon's BlueResMan::Update (operator, 2026-11-01); an application ticks it
// through blue.os (Graphene's demoFramePump). A test that awaits a load without
// ticking itself imports this module, which calls the installed manager's
// Update every millisecond until the file's tests finish. A test that drives
// Update itself, on its own clock, holds the loop for its duration.
import { after } from "node:test";
import { blue, BlueResMan } from "../../npm/dist/global/blue/index.js";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";

let held = 0;

const frame = setInterval(() =>
{
  // A test may install a stub manager; only a real one is ticked.
  if (held === 0 && CjsSchema.cast(blue.resMan, BlueResMan)) blue.resMan.Update();
}, 1);
after(() => clearInterval(frame));

/**
 * Stops the frame loop for one test, which then calls Update (or Wait) itself.
 *
 * @param {import("node:test").TestContext} t The test, whose end resumes the loop.
 * @returns {void}
 */
export function HoldFrameLoop(t)
{
  held += 1;
  t.after(() => { held -= 1; });
}
