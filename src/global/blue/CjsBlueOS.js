// Source: blue/include/IBlueOS.h, blue/src/BlueOS.h and BlueOS.cpp.
// Host-driven clock and tick pump; scheduler, IO and process services remain on the interface.
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
  /** Wallclock at construction, in Blue UTC ticks, as the anchor for elapsed host time. */
  _utcAnchor = 0;

  /** The host clock at construction, in milliseconds. */
  _originMs = 0;

  /** `m_pumpTicksTotal` - pump cycles since creation. */
  _pumpTicks = 0;

  /** The cached actual-time sample, in Blue UTC ticks. */
  _currentFrameTime = 0;

  /** Registrants of `RegisterForTicks`, each with the cookie it supplied. */
  _tickers = [];

  /** Registrants of `RegisterForSimTimeRebase`. */
  _rebaseListeners = [];

  /** Anchors the host clock to the current UTC wallclock. */
  constructor()
  {
    super();
    const wallclock = Date.now();
    this._originMs = CjsBlueOS.Monotonic();
    this._utcAnchor = FILETIME_EPOCH_OFFSET + Math.round(wallclock * TICKS_PER_MILLISECOND);
    this._currentFrameTime = this._utcAnchor;
  }

  /**
   * Reads host milliseconds, preferring performance.now over Date.now.
   *
   * The Date.now fallback follows wallclock adjustments and is not monotonic.
   * The performance global must be defined, even when its now method is absent.
   *
   * @returns {number} Host milliseconds; the origin depends on the clock used.
   * @throws {ReferenceError} If the performance global is absent.
   */
  static Monotonic()
  {
    return typeof performance?.now === "function" ? performance.now() : Date.now();
  }

  /**
   * Reads Blue UTC ticks from a wallclock anchor and elapsed host milliseconds.
   *
   * Adapted: Carbon adds mUTCAdj to its wallclock (BlueOS.cpp:1102-1107).
   * This service has no server-sync adjustment and anchors its host clock at
   * construction. The performance.now path avoids later wallclock adjustments;
   * the Date.now fallback can move backwards. Number precision limits the
   * resolution of absolute Blue UTC ticks.
   *
   * @returns {number} Blue UTC in 100ns units, subject to host clock and Number precision.
   */
  GetActualTime()
  {
    const elapsedMs = CjsBlueOS.Monotonic() - this._originMs;
    return this._utcAnchor + Math.round(elapsedMs * TICKS_PER_MILLISECOND);
  }

  /**
   * Returns the actual-time sample cached at construction or the latest pump.
   *
   * Adapted: Carbon returns mSimTime (BlueOS.h:51). This service caches
   * GetActualTime without simulation-clock dilation or rebasing.
   *
   * @returns {number} Cached Blue UTC in 100ns units.
   */
  GetCurrentFrameTime()
  {
    return this._currentFrameTime;
  }

  /**
   * Refreshes the frame clock and delivers a tick to a snapshot of registrants.
   *
   * Adapted: Carbon also drives scheduler, IO, recycling and statistics work.
   * This host-driven pump supplies the same elapsed-origin time for both callback
   * clocks; Carbon supplies its absolute real and simulation times
   * (BlueOS.cpp:552,2190). It increments the pump count before callbacks rather
   * than after them, permits nested pumping, and still calls snapshot entries
   * removed during another callback. Native pumping guards reentrancy and checks
   * current registration before each tick (BlueOS.cpp:674-679,2172-2182).
   * Callback exceptions are caught so delivery continues. The retained failure
   * is rethrown only if truthy; falsy thrown values may be swallowed. The method
   * returns this service instead of Carbon's void return.
   *
   * @returns {CjsBlueOS} This service when no truthy failure remains.
   * @throws {*} The retained callback failure, when truthy.
   */
  PumpOS()
  {
    this._pumpTicks++;
    this._currentFrameTime = this.GetActualTime();

    const realTime = this.GetRealTime();
    let failure = null;

    // Snapshot entries remain eligible even if removed during an earlier callback.
    for (const { cb, cookie } of [ ...this._tickers ])
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
   * Returns elapsed host time since this service was constructed.
   *
   * Custom: Carbon exposes no such accessor. This elapsed-origin value is used
   * for this service's OnTick arguments; it is not equivalent to native
   * BeInfo.mRealTime, which contains absolute Blue UTC. Integer tick precision
   * is limited by Number, and measurement precision depends on the host clock.
   *
   * @returns {number} Elapsed time in 100ns units.
   */
  GetRealTime()
  {
    return Math.round((CjsBlueOS.Monotonic() - this._originMs) * TICKS_PER_MILLISECOND);
  }

  /**
   * Returns a new BeInfo snapshot containing clocks and the pump count.
   *
   * Adapted: Carbon returns its live state (BlueOS.cpp:1339-1342). A retained
   * JavaScript snapshot does not update. Only actual time, matching simulation
   * time, construction time and pump count are populated; other fields retain
   * BeInfo defaults. Simulation dilation and rebasing are not represented.
   *
   * @returns {BeInfo} A new, partially populated snapshot.
   */
  GetInfo()
  {
    const info = new BeInfo();
    info.realTime = this.GetActualTime();
    info.simTime = info.realTime;
    info.startTime = this._utcAnchor;
    info.pumpTicksTotal = this._pumpTicks;
    return info;
  }

  /**
   * Registers a callback and cookie for pump ticks, ignoring duplicate pairs.
   *
   * Adapted: Schema identity enforces IBlueEvents at runtime. Carbon accepts a
   * typed pointer and returns void; this method returns the service.
   *
   * @param {object} cb An object implementing IBlueEvents.
   * @param {*} [cookie=null] Value passed back on each tick.
   * @returns {CjsBlueOS} This service.
   * @throws {TypeError} If cb does not declare IBlueEvents.
   */
  RegisterForTicks(cb, cookie = null)
  {
    // Enforce the declared IBlueEvents interface before registration.
    if (!CjsSchema.cast(cb, IBlueEvents))
    {
      throw new TypeError("CjsBlueOS.RegisterForTicks expects an IBlueEvents.");
    }
    if (!this._tickers.some(entry => entry.cb === cb && entry.cookie === cookie))
    {
      this._tickers.push({ cb, cookie });
    }
    return this;
  }

  /**
   * Removes the registration matching both callback and cookie, if present.
   *
   * Adapted: Returns this service instead of Carbon's void return.
   *
   * @param {object} cb The registered IBlueEvents object.
   * @param {*} [cookie=null] The cookie supplied at registration.
   * @returns {CjsBlueOS} This service.
   */
  UnregisterForTicks(cb, cookie = null)
  {
    const index = this._tickers.findIndex(entry => entry.cb === cb && entry.cookie === cookie);
    if (index >= 0) this._tickers.splice(index, 1);
    return this;
  }

  /**
   * Checks whether a callback is registered with any cookie.
   *
   * Custom: Carbon exposes no registration query. This method checks callback
   * identity without delivering ticks.
   *
   * @param {object} cb An IBlueEvents object.
   * @returns {boolean} Whether any registration contains the callback.
   */
  IsRegisteredForTicks(cb)
  {
    return this._tickers.some(entry => entry.cb === cb);
  }

  /**
   * Registers a simulation-clock rebase listener, ignoring duplicates.
   *
   * Adapted: Schema identity enforces ISimTimeRebaseNotify at runtime. Carbon
   * accepts a typed pointer and returns void; this method returns the service.
   * The listener is retained, but this service does not perform clock rebasing.
   *
   * @param {object} cb An object implementing ISimTimeRebaseNotify.
   * @returns {CjsBlueOS} This service.
   * @throws {TypeError} If cb does not declare ISimTimeRebaseNotify.
   */
  RegisterForSimTimeRebase(cb)
  {
    if (!CjsSchema.cast(cb, ISimTimeRebaseNotify))
    {
      throw new TypeError("CjsBlueOS.RegisterForSimTimeRebase expects an ISimTimeRebaseNotify.");
    }
    if (!this._rebaseListeners.includes(cb)) this._rebaseListeners.push(cb);
    return this;
  }

  /**
   * Removes a simulation-clock rebase listener, if present.
   *
   * Adapted: Returns this service instead of Carbon's void return.
   *
   * @param {object} cb The registered ISimTimeRebaseNotify object.
   * @returns {CjsBlueOS} This service.
   */
  UnregisterForSimTimeRebase(cb)
  {
    const index = this._rebaseListeners.indexOf(cb);
    if (index >= 0) this._rebaseListeners.splice(index, 1);
    return this;
  }

  /**
   * Returns the fallback result for a runtime without Stackless Python.
   *
   * Adapted: Carbon invokes StacklessMain and reports whether it succeeds with
   * Stackless support (BlueOS.cpp:855-896). This method follows only its
   * non-Stackless branch; it does not query scheduler status or run a scheduler.
   *
   * @returns {boolean} False.
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
    GetActualTime: [ impl.adapted ],
    GetCurrentFrameTime: [ impl.adapted ],
    PumpOS: [ impl.adapted ],
    GetRealTime: [ impl.custom ],
    GetInfo: [ impl.adapted ],
    RegisterForTicks: [ impl.adapted ],
    UnregisterForTicks: [ impl.adapted ],
    IsRegisteredForTicks: [ impl.custom ],
    RegisterForSimTimeRebase: [ impl.adapted ],
    UnregisterForSimTimeRebase: [ impl.adapted ],
    RunStackless: [ impl.adapted ]
  }
});
