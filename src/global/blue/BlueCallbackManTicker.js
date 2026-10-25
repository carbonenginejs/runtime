import { CjsSchema, meta } from "#schema";
import { CjsBlueOS } from "./CjsBlueOS.js";
import { IBlueEvents } from "./IBlueEvents.js";

// Ours: drives a `BlueCallbackMan` started with `Start` from Blue's pump while
// it runs its entries through `Update`, because the host has no workers or
// none loaded. Carbon's background manager always has threads
// (ResourceLoading.cpp:85-91), so nothing ticks it there. In Carbon an
// `Update`-mode manager is ticked by its owner; the composition that starts
// the manager registers this with `RegisterForTicks`, so the manager itself
// never reaches the installed OS.

/** Ticks an `Update`-mode `BlueCallbackMan` once per Blue pump. */
export class BlueCallbackManTicker extends IBlueEvents
{
  /** @type {import("./BlueCallbackMan.js").BlueCallbackMan} */
  _manager = null;

  /** Seconds a tick may keep starting entries; Carbon's `m_mainThreadTimeSlice` (BlueResMan.cpp:77). */
  mainThreadTimeSlice = 0.005;

  /**
   * Creates a ticker for one manager.
   *
   * @param {import("./BlueCallbackMan.js").BlueCallbackMan} manager The manager to tick.
   */
  constructor(manager)
  {
    super();
    this._manager = manager;
  }

  /**
   * IBlueEvents: pumps the manager the way `BlueResMan::Update` pumps its
   * main-thread queue (BlueResMan.cpp:446-463): at least one `Update`, then
   * more while the tick is inside `mainThreadTimeSlice`, stopping as soon as
   * nothing ran. Carbon's backlog override (`m_maxAllowedInPrepareQueue`) is
   * not ported; nothing needs it yet.
   *
   * Adapted: Carbon runs `BeCallbackMan` on its own threads, so nothing ticks
   * it there; this tick exists for a browser without workers, and does nothing
   * while the manager has them. The slice bounds only synchronous entries. A
   * named entry is asynchronous, so `Update` only starts it and the work runs
   * after the tick; the manager's single `Update` slot is what limits that
   * to one entry per tick. One entry, such as a DXT encode, always runs to its
   * end.
   *
   * @param {number} _realTime Time since the client started, in 100ns ticks.
   * @param {number} _simTime The same, slowed under load.
   * @param {*} _cookie Whatever the registrant passed to RegisterForTicks.
   */
  OnTick(_realTime, _simTime, _cookie)
  {
    if (this._manager.IsRunningOwnThreads()) return;

    const started = CjsBlueOS.Monotonic();
    let timeInUpdate = 0;
    do
    {
      if (!this._manager.Update()) break;
      timeInUpdate = (CjsBlueOS.Monotonic() - started) / 1000;
    }
    while (timeInUpdate < this.mainThreadTimeSlice);
  }
}

CjsSchema.decorateMethod(BlueCallbackManTicker, "OnTick", meta.adapted);
CjsSchema.meta.define("BlueCallbackManTicker")(BlueCallbackManTicker);
