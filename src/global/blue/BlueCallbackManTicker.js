import { CjsSchema } from "#schema";
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
   * IBlueEvents: starts every entry the free slots can take; a manager on its
   * own threads needs no tick.
   *
   * @param {number} _realTime Time since the client started, in 100ns ticks.
   * @param {number} _simTime The same, slowed under load.
   * @param {*} _cookie Whatever the registrant passed to RegisterForTicks.
   */
  OnTick(_realTime, _simTime, _cookie)
  {
    if (this._manager.IsRunningOwnThreads()) return;
    while (this._manager.Update());
  }
}

CjsSchema.meta.define("BlueCallbackManTicker")(BlueCallbackManTicker);
