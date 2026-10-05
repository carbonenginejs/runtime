// Source: blue/include/IBlueOS.h, blue/src/BlueOS.h and BlueOS.cpp.
// Host-driven clock and tick pump; scheduler, IO and process services remain on the interface.
import { CjsSchema, meta } from "#schema";
import { BeInfo } from "./BeInfo.js";
import { IBlueEvents } from "./IBlueEvents.js";
import { IBlueOS } from "./IBlueOS.js";
import { ISimTimeRebaseNotify } from "./ISimTimeRebaseNotify.js";
import { CcpTime } from "./CcpTime.js";

/** 100ns ticks in a millisecond. */
const TICKS_PER_MILLISECOND = 10000;

/**
 * Carbon's `BeOS`, as much of it as is honest: the clock and the pump.
 *
 * Composed at runtime without authored fields or serialized instance state.
 */
export class CjsBlueOS extends IBlueOS
{
  /**
   * The wallclock at construction, in Blue ticks on the runtime epoch
   * (`BLUE_EPOCH_UNIX_MS`), as the anchor for elapsed host time.
   */
  _startTime = 0;

  /** The host clock at construction, in milliseconds. */
  _originMs = 0;

  /** `m_pumpTicksTotal` - pump cycles since creation. */
  _pumpTicks = 0;

  /** `mRealTime`: the frame's real time, set at construction and by each pump. */
  _realTime = 0;

  /** `mSimTime`: the frame's simulation time, set at construction and by each pump. */
  _simTime = 0;

  /** Registrants of `RegisterForTicks`, each with the cookie it supplied. */
  _tickers = [];

  /** Registrants of `RegisterForSimTimeRebase`. */
  _rebaseListeners = [];

  /**
   * `mFrameClock` (BlueOS.h:56), Blue's READWRITE `frameClock` attribute
   * (BlueOS_Blue.cpp:280, "Clock that ticks on frame basis"): an optional
   * object the host installs to filter the frame's real time. Its
   * `Sample()` returns a sequence whose first entry is the time, in Blue
   * ticks on the runtime epoch. Null samples the actual time.
   *
   * Carbon's game client installs a Python clock here; that algorithm is not
   * in Carbon's source, so none ships with the runtime.
   * @type {?{ Sample(): ArrayLike<number> }}
   */
  frameClock = null;

  /**
   * Anchors the host clock to the current wallclock, and starts real and
   * simulation time there, as Carbon's constructor does (BlueOS.cpp:255-256).
   */
  constructor()
  {
    super();
    const wallclock = Date.now();
    this._originMs = CjsBlueOS.Monotonic();
    this._startTime = Math.round((wallclock - CcpTime.BLUE_EPOCH_UNIX_MS) * TICKS_PER_MILLISECOND);
    this._realTime = this._startTime;
    this._simTime = this._realTime;
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
   * Reads the current time in Blue ticks from the wallclock anchor and elapsed
   * host milliseconds.
   *
   * Adapted, two ways:
   * - Carbon returns absolute Blue UTC, `mUTCAdj + mWallclock`
   *   (BlueOS.cpp:1102-1107). Ours counts the same 100ns ticks from the
   *   runtime epoch, 2026-01-01 UTC (`BLUE_EPOCH_UNIX_MS`), because absolute
   *   FILETIME (about 1.3e17) is past Number.MAX_SAFE_INTEGER, and one shared
   *   epoch lets pages, workers and the server exchange times without
   *   offsets. Differences are unchanged. Carbon's own TimeIsUTC reads values
   *   this small as stopwatch time, so TimeAsDouble keeps full precision
   *   (CcpTime.cpp:219-246, :271-286). UTC is `TimeToFileTime` in CcpTime.
   * - There is no server-sync adjustment, and the host clock is anchored at
   *   construction. The performance.now path avoids later wallclock
   *   adjustments; the Date.now fallback can move backwards.
   *
   * @returns {number} Blue ticks since the runtime epoch.
   */
  GetActualTime()
  {
    const elapsedMs = CjsBlueOS.Monotonic() - this._originMs;
    return this._startTime + Math.round(elapsedMs * TICKS_PER_MILLISECOND);
  }

  /**
   * Returns the current frame's simulation time, `mSimTime` (BlueOS.h:51),
   * on the runtime epoch (see GetActualTime). It is set at construction and by
   * each PumpOS, so every reader in one frame sees the same value.
   *
   * @returns {number} Blue ticks since the runtime epoch.
   */
  GetCurrentFrameTime()
  {
    return this._simTime;
  }

  /**
   * Carbon's GetSmoothedTime (BlueOS.cpp:1109-1138): the installed frame
   * clock's sample, or the actual time when none is installed.
   *
   * Adapted: Carbon falls back to the actual time when the Python call fails;
   * a JavaScript frame clock that throws propagates.
   *
   * @returns {number} Blue ticks since the runtime epoch.
   */
  GetSmoothedTime()
  {
    if (!this.frameClock) return this.GetActualTime();
    return this.frameClock.Sample()[0];
  }

  /**
   * Refreshes the frame clock and delivers a tick to a snapshot of registrants.
   *
   * Real time is the smoothed time (BlueOS.cpp:512, 552) and simulation time
   * follows it, as Carbon's does while the sim clock is locked to the real one
   * (:554-556); both are on the runtime epoch (see GetActualTime) and are what
   * OnTick receives (BlueOS.cpp:2190).
   *
   * Adapted: Carbon also drives scheduler, IO, recycling and statistics work,
   * and can dilate or rebase simulation time; none of that is ported. Carbon's
   * clamp of a negative smoothed delta (:537-543) is not ported because only
   * the statistics and sim-time dilation read that delta; the real time takes
   * the unclamped sample (:552) here as there. It increments the pump count before callbacks rather
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
    this._realTime = this.GetSmoothedTime();
    this._simTime = this._realTime;

    const realTime = this._realTime;
    const simTime = this._simTime;
    let failure = null;

    // Snapshot entries remain eligible even if removed during an earlier callback.
    for (const { cb, cookie } of [ ...this._tickers ])
    {
      try
      {
        cb.OnTick(realTime, simTime, cookie);
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
   * Returns the current frame's real time, `mRealTime`, on the runtime epoch:
   * the value OnTick received as realTime. Hosts that drive a scene pass this
   * and GetCurrentFrameTime as its real and simulation time.
   *
   * Ours: Carbon exposes mRealTime to Python but declares no C++ accessor on
   * IBlueOS.
   *
   * @returns {number} Blue ticks since the runtime epoch.
   */
  GetRealTime()
  {
    return this._realTime;
  }

  /**
   * Returns a new BeInfo snapshot containing clocks and the pump count.
   *
   * Adapted: Carbon returns its live state (BlueOS.cpp:1339-1342). A retained
   * JavaScript snapshot does not update. Only the frame's real and simulation
   * times, construction time and pump count are populated, on the runtime
   * epoch; other fields retain BeInfo defaults. Simulation dilation and
   * rebasing are not represented.
   *
   * @returns {BeInfo} A new, partially populated snapshot.
   */
  GetInfo()
  {
    const info = new BeInfo();
    info.realTime = this._realTime;
    info.simTime = this._simTime;
    info.startTime = this._startTime;
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
    GetActualTime: [ meta.adapted ],
    GetCurrentFrameTime: [ meta.adapted ],
    PumpOS: [ meta.adapted ],
    GetRealTime: [ meta.ours ],
    GetInfo: [ meta.adapted ],
    RegisterForTicks: [ meta.adapted ],
    UnregisterForTicks: [ meta.adapted ],
    IsRegisteredForTicks: [ meta.ours ],
    RegisterForSimTimeRebase: [ meta.adapted ],
    UnregisterForSimTimeRebase: [ meta.adapted ],
    RunStackless: [ meta.adapted ]
  }
});
