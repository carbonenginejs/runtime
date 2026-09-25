// Source: blue/include/IBlueOS.h, blue/src/BlueOS.cpp:500-525, :1105-1135
//
// The clock and the pump, which is the half of `BeOS` this runtime needs and
// can answer honestly. The error, startup-argument and process-control half
// stays refused on the interface: it is a real operating-system service with
// no consumer here, and filling it in would be inventing.
//
// WHY THERE IS A CONCRETE ONE AT ALL: an unconfigured clock can answer its
// questions truthfully - a browser and Node both have a monotonic clock and a
// wallclock. A host that has a better clock replaces it; nothing has to be
// composed for the clock to be right. `blue.resMan` is concrete by default
// for a similar reason, and ticks through this pump.
//
// SMOOTHED TIME IS ACTUAL TIME HERE, and that is Carbon's own fallback rather
// than a shortcut. `BlueOS::GetSmoothedTime` samples a Python frame clock and
// returns `GetActualTime()` whenever there is no such clock, or sampling it
// fails (`BlueOS.cpp:1109-1135`). There is no Python here, so the fallback is
// the only branch, and the filtering Carbon's own comment calls out for
// creating artefacts of its own is absent with it.
//
// SIMULATION TIME EQUALS REAL TIME HERE. Carbon's differ because simulation
// time is "sometimes slowed down in order to manage load" (`IBlueOS.h:62`) and
// can be moved outright by a server sync, which is what `ISimTimeRebaseNotify`
// exists for. Neither happens in this runtime: there is no load manager and no
// server to sync against. The two are kept as separate parameters all the way
// through anyway, because the moment either appears the callers are already
// written for it - collapsing them into one argument is the change that would
// be expensive to undo.
import { CjsSchema, impl } from "#schema";
import { BeInfo } from "./BeInfo.js";
import { IBlueEvents } from "./IBlueEvents.js";
import { IBlueOS } from "./IBlueOS.js";
import { ISimTimeRebaseNotify } from "./ISimTimeRebaseNotify.js";

/** 100ns ticks between the FILETIME epoch (1601-01-01) and the Unix epoch. */
const FILETIME_EPOCH_OFFSET = 116444736000000000;

/** 100ns ticks in a millisecond. */
const TICKS_PER_MILLISECOND = 10000;

/**
 * Carbon's `BeOS`, as much of it as is honest: the clock and the pump.
 *
 * Not a `CjsModel`. It is composed at runtime, carries no `@edit` field and is
 * never part of a serialized object, which is the same reason `Tr2Renderer`
 * is not one.
 */
export class CjsBlueOS extends IBlueOS
{
  /** Wallclock at construction, in Blue UTC ticks, as the anchor for a monotonic reading. */
  #utcAnchor = 0;

  /** The monotonic clock at construction, in milliseconds. */
  #originMs = 0;

  /** `m_pumpTicksTotal` - pump cycles since creation. */
  #pumpTicks = 0;

  /** The cached smoothed time for this frame, in Blue UTC ticks. */
  #currentFrameTime = 0;

  /** Registrants of `RegisterForTicks`, each with the cookie it supplied. */
  #tickers = [];

  /** Registrants of `RegisterForSimTimeRebase`. */
  #rebaseListeners = [];

  /** Anchors the monotonic clock to the current UTC wallclock. */
  constructor()
  {
    super();
    const wallclock = Date.now();
    this.#originMs = CjsBlueOS.Monotonic();
    this.#utcAnchor = FILETIME_EPOCH_OFFSET + Math.round(wallclock * TICKS_PER_MILLISECOND);
    this.#currentFrameTime = this.#utcAnchor;
  }

  /**
   * The monotonic clock in milliseconds, preferring `performance.now`.
   *
   * @returns {number} Milliseconds since an arbitrary origin.
   */
  static Monotonic()
  {
    return typeof performance?.now === "function" ? performance.now() : Date.now();
  }

  /**
   * The wallclock adjusted for server sync, in Blue UTC ticks
   * (`BlueOS.cpp:1105-1107` is `mUTCAdj + mWallclock.Get()`).
   *
   * Read from the monotonic clock against a wallclock anchor taken once, so
   * the reading cannot go backwards when the system clock is adjusted - which
   * is what `mWallclock` is for on Carbon's side. There is no server to sync
   * against here, so there is no `mUTCAdj` term.
   *
   * @returns {number} Blue UTC, in 100ns ticks, to roughly 1.6 microseconds.
   */
  GetActualTime()
  {
    const elapsedMs = CjsBlueOS.Monotonic() - this.#originMs;
    return this.#utcAnchor + Math.round(elapsedMs * TICKS_PER_MILLISECOND);
  }

  /**
   * The cached smoothed time for this frame, in Blue UTC ticks.
   *
   * CACHED IS THE POINT: every consumer within one frame gets the same answer,
   * which is why 49 Carbon call sites use this rather than `GetActualTime`.
   * It moves only when the pump runs.
   *
   * @returns {number} Blue UTC, in 100ns ticks.
   */
  GetCurrentFrameTime()
  {
    return this.#currentFrameTime;
  }

  /**
   * One pump cycle: refresh the frame clock, then tick every registrant.
   *
   * Carbon's header calls this one "put here temporarily" and it has a single
   * call site, its own main loop. A host drives it - from
   * `requestAnimationFrame` in a browser - and nothing in the library calls it
   * for itself.
   *
   * A registrant that throws does not stop the others, and the first failure
   * is rethrown once every registrant has been offered the tick. A tick half
   * delivered leaves some consumers a frame behind others, which is worse than
   * a loud failure after a complete pass.
   *
   * @returns {CjsBlueOS} This service.
   */
  PumpOS()
  {
    this.#pumpTicks++;
    this.#currentFrameTime = this.GetActualTime();

    const realTime = this.GetRealTime();
    let failure = null;

    // Iterated over a copy, because a registrant may unregister itself - or
    // another - from inside its own tick.
    for (const { cb, cookie } of [ ...this.#tickers ])
    {
      try
      {
        cb.OnTick(realTime, realTime, cookie);
      }
      catch (error)
      {
        failure ??= error;
      }
    }

    if (failure) throw failure;
    return this;
  }

  /**
   * Time since this service was created, in 100ns ticks.
   *
   * This is the base `OnTick` reports in, and it is exact: a JavaScript number
   * counts 100ns ticks without loss for about nine years, where absolute Blue
   * UTC cannot be held exactly at all.
   *
   * @returns {number} Ticks since construction.
   */
  GetRealTime()
  {
    return Math.round((CjsBlueOS.Monotonic() - this.#originMs) * TICKS_PER_MILLISECOND);
  }

  /**
   * Blue's clocks, framerate state and pump counters (`BeInfo`).
   *
   * A FRESH RECORD EACH CALL, where Carbon returns a pointer to its own
   * long-lived struct. A caller that held Carbon's pointer would see the values
   * move under it, which is how some of those 19 call sites use it; a caller
   * holding this one sees a snapshot. That is the safer of the two behaviours
   * and the one a reader of this code will assume, but it IS a difference, and
   * a consumer polling a held record would silently never update.
   *
   * Only the clocks and the pump count are filled. See BeInfo for which fields
   * are Blue's own bookkeeping and stay at their defaults.
   *
   * @returns {BeInfo} A snapshot of what this service knows.
   */
  GetInfo()
  {
    const info = new BeInfo();
    info.realTime = this.GetActualTime();
    info.simTime = info.realTime;
    info.startTime = this.#utcAnchor;
    info.pumpTicksTotal = this.#pumpTicks;
    return info;
  }

  /**
   * Drives an `IBlueEvents` from the pump.
   *
   * The cookie is the registrant's own, echoed back to it on every tick;
   * `TriDevice` uses the string "Trinity" (`TriDevice.cpp:148`). Registering
   * the same object twice with the same cookie is ignored, as Carbon's
   * registration is set membership rather than a count.
   *
   * @param {object} cb An `IBlueEvents`.
   * @param {*} [cookie] Passed back on every tick.
   * @returns {CjsBlueOS} This service.
   */
  RegisterForTicks(cb, cookie = null)
  {
    // AN IDENTITY CHECK, NOT A NAME PROBE. Carbon's signature is
    // `RegisterForTicks( IBlueEvents* cb, void* cookie )`, so the type system
    // refuses anything else before the call is made; `CjsSchema.cast` is that
    // refusal here. A registrant declares `IBlueEvents` with
    // `@carbon.inherit`, as `TriDevice` does, and an object that merely
    // happens to own an `OnTick` is not one.
    if (!CjsSchema.cast(cb, IBlueEvents))
    {
      throw new TypeError("CjsBlueOS.RegisterForTicks expects an IBlueEvents.");
    }
    if (!this.#tickers.some(entry => entry.cb === cb && entry.cookie === cookie))
    {
      this.#tickers.push({ cb, cookie });
    }
    return this;
  }

  /**
   * Stops driving one. Both the object and the cookie must match, as they do
   * in Carbon's signature.
   *
   * @param {object} cb The registered `IBlueEvents`.
   * @param {*} [cookie] The cookie it registered with.
   * @returns {CjsBlueOS} This service.
   */
  UnregisterForTicks(cb, cookie = null)
  {
    const index = this.#tickers.findIndex(entry => entry.cb === cb && entry.cookie === cookie);
    if (index >= 0) this.#tickers.splice(index, 1);
    return this;
  }

  /**
   * Whether an object is registered for ticks.
   *
   * @param {object} cb An `IBlueEvents`.
   * @returns {boolean} Whether the pump drives it.
   */
  IsRegisteredForTicks(cb)
  {
    return this.#tickers.some(entry => entry.cb === cb);
  }

  /**
   * Registers to be told when the simulation clock is moved.
   *
   * @param {object} cb An `ISimTimeRebaseNotify`.
   * @returns {CjsBlueOS} This service.
   */
  RegisterForSimTimeRebase(cb)
  {
    if (!CjsSchema.cast(cb, ISimTimeRebaseNotify))
    {
      throw new TypeError("CjsBlueOS.RegisterForSimTimeRebase expects an ISimTimeRebaseNotify.");
    }
    if (!this.#rebaseListeners.includes(cb)) this.#rebaseListeners.push(cb);
    return this;
  }

  /**
   * Stops being told.
   *
   * @param {object} cb The registered `ISimTimeRebaseNotify`.
   * @returns {CjsBlueOS} This service.
   */
  UnregisterForSimTimeRebase(cb)
  {
    const index = this.#rebaseListeners.indexOf(cb);
    if (index >= 0) this.#rebaseListeners.splice(index, 1);
    return this;
  }

  /**
   * Whether the stackless scheduler is in use (`RunStackless`).
   *
   * @returns {boolean} False; there is no stackless Python here.
   */
  RunStackless()
  {
    return false;
  }
}

CjsSchema.define(CjsBlueOS, {
  className: "CjsBlueOS",
  family: "blue",
  carbon: "BlueOS",
  fields: {},
  methods: {
    GetActualTime: [ impl.adapted, impl.reason("Carbon adds a server-sync adjustment (mUTCAdj) to a wallclock object; there is no server to sync against here, so the term is absent. The reading is monotonic against an anchor taken at construction rather than a fresh Date.now(), so it cannot step backwards.") ],
    GetCurrentFrameTime: [ impl.implemented ],
    PumpOS: [ impl.adapted, impl.reason("Carbon's pump also runs the stackless scheduler, the IO scheduling runs, the recycler update and the statistics. This is the tick delivery only. The error isolation across registrants is ours: Carbon lets an exception escape, and in a browser that would silently drop every registrant after the failing one.") ],
    GetRealTime: [ impl.custom, impl.reason("Carbon has no such accessor: its equivalent is BeInfo::mRealTime, reached through GetInfo, and the pump computes the since-startup value inline. Named here because it is the base OnTick reports in, and the distinction from GetActualTime is the one thing about these clocks that is easy to get wrong.") ],
    GetInfo: [ impl.adapted, impl.reason("Carbon returns a pointer to a live struct whose values move under the caller; this returns a snapshot, because a JS object handed out would otherwise have to be mutated in place to match and nothing here needs that. Only the time and pump fields are filled - the framerate, sleep, fake-time and build fields belong to a pump this runtime does not have.") ],
    RegisterForTicks: [ impl.implemented ],
    UnregisterForTicks: [ impl.implemented ],
    IsRegisteredForTicks: [ impl.custom, impl.reason("Carbon has no such query; registration is private to BlueOS. It exists here so a host can tell whether it already registered something, and so a test can prove registration without pumping.") ],
    RegisterForSimTimeRebase: [ impl.implemented ],
    UnregisterForSimTimeRebase: [ impl.implemented ],
    RunStackless: [ impl.adapted, impl.reason("Carbon answers whether its stackless Python scheduler is running. There is no Python in this runtime, so the answer is a constant rather than a refusal - a caller asking is asking whether it may yield, and the truthful answer is no.") ]
  }
});
