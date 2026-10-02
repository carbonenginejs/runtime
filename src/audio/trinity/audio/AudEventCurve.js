// Source: audio/src/AudEventCurve.h + AudEventCurve.cpp
// Hand-owned since 2026-07-18 (behavior port); the generator skips this file.
// Verify against audio/AudEventCurve.json.
import { meta } from "#schema";
import { IInitialize } from "#blue/IInitialize";
import { ITriFunction } from "#blue/ITriFunction";
import { ITriCurveLength } from "#blue/ITriCurveLength";
import { TRIEXTRAPOLATION } from "#consts/graphics";
import { AudEmitter } from "./AudEmitter.js";
import { IsWwiseInitPosition } from "./AudGameObjResource.js";
import { AudEventKey } from "../../generated/audio/AudEventKey.js";
import "#consts/graphics/trinityEnums";

/** Fires authored audio events as playback time crosses ordered event keys on a timeline curve. */
@meta.define({ className: "AudEventCurve", family: "audio" })
@meta.blue.inherit(IInitialize, ITriFunction, ITriCurveLength)
export class AudEventCurve
{

  /** m_extrapolation (TRIEXTRAPOLATION - enum TRIEXTRAPOLATION) [READWRITE, PERSIST, ENUM] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.int32
  @meta.type.enum("blue.TRIEXTRAPOLATION")
  extrapolation = 0;

  /** m_time (double) [READ] */
  @meta.blue.read
  @meta.type.float64
  time = 0;

  /** m_length (float) [READ] */
  @meta.blue.read
  @meta.type.float32
  length = 0;

  /** m_localTime (float) [READ] */
  @meta.blue.read
  @meta.type.float32
  localTime = 0;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  /** m_value (std::wstring) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  value = "";

  /** m_sourceTriObserver (ITriObserverLocalPtr) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("ITriObserverLocal")
  sourceTriObserver = null;

  /** m_keys (PAudEventKeyVector) [PERSISTONLY] */
  @meta.blue.persistOnly
  @meta.type.list("AudEventKey")
  keys = [];

  /** m_audioEmitter (AudEmitterPtr) [READ] */
  @meta.blue.read
  @meta.type.objectRef("AudEmitter")
  audioEmitter = null;

  // Playback cursor (C++ m_currentKeyIt) - runtime state, rebuildable.
  _currentKeyIndex = 0;

  _queuedEvent = "";

  /** Carbon method AddKey (MAP_METHOD_AND_WRAP). Appends a key and resorts. */
  @meta.blue.method
  @meta.implemented
  AddKey(time, evtName)
  {
    const key = new AudEventKey();
    key.time = Number(time) || 0;
    key.value = String(evtName ?? "");
    this.InsertKey(key);
  }

  /** Carbon method InsertKey (not Blue-mapped): insert, sort, reset cursor, refresh length. */
  @meta.blue.method
  @meta.implemented
  InsertKey(key)
  {
    this.keys.push(key);
    SortKeys(this.keys);
    this._currentKeyIndex = 0;
    this.length = this.keys[this.keys.length - 1].time;
  }

  /** Carbon method GetKeyCount (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.implemented
  GetKeyCount()
  {
    return this.keys.length;
  }

  /** Carbon method GetKeyTime (MAP_METHOD_AND_WRAP). Returns 0 out of range. */
  @meta.blue.method
  @meta.implemented
  GetKeyTime(ix)
  {
    return InRange(this.keys, ix) ? this.keys[ix].time : 0;
  }

  /** Carbon method GetKeyValue (MAP_METHOD_AND_WRAP). Returns "" out of range. */
  @meta.blue.method
  @meta.implemented
  GetKeyValue(ix)
  {
    return InRange(this.keys, ix) ? this.keys[ix].value : "";
  }

  /** Carbon method SetKeyTime (MAP_METHOD_AND_WRAP). Resorts and refreshes length. */
  @meta.blue.method
  @meta.implemented
  SetKeyTime(ix, time)
  {
    if (!InRange(this.keys, ix))
    {
      return;
    }
    this.keys[ix].time = Number(time) || 0;
    SortKeys(this.keys);
    this.length = this.keys[this.keys.length - 1].time;
  }

  /** Carbon method SetKeyValue (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.implemented
  SetKeyValue(ix, value)
  {
    if (InRange(this.keys, ix))
    {
      this.keys[ix].value = String(value ?? "");
    }
  }

  // Carbon leaves length untouched when the last key is removed - preserved.
  /** Carbon method RemoveKey (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.implemented
  RemoveKey(ix)
  {
    if (!InRange(this.keys, ix))
    {
      return;
    }
    this.keys.splice(ix, 1);
    SortKeys(this.keys);
    this._currentKeyIndex = 0;
    if (this.keys.length > 0)
    {
      this.length = this.keys[this.keys.length - 1].time;
    }
  }

  /** Carbon method Initialize (IInitialize): sort persisted keys, refresh length and attach an emitter. */
  @meta.blue.method
  @meta.implemented
  Initialize()
  {
    SortKeys(this.keys);
    this._currentKeyIndex = 0;
    if (this.keys.length > 0)
    {
      this.length = this.keys[this.keys.length - 1].time;
    }
    if (this.sourceTriObserver)
    {
      this.CreateAudioEmitter();
    }
    return true;
  }

  /**
   * Carbon declares Sort() (AudEventCurve.h:42) but NEVER DEFINES it - no
   * body exists anywhere in the donor and it is not Blue-mapped. The
   * semantics are unambiguous regardless: all four key-mutating call sites
   * (Initialize, InsertKey, SetKeyTime, RemoveKey) run the same
   * CompareKeys time sort (cpp:96-99), which is SortKeys here. Public so an
   * externally tweaked key list can restore the invariant, which is what
   * the declaration was evidently for.
   */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Declared but never defined in Carbon; the body is the shared key sort every mutating call site runs.")
  Sort()
  {
    SortKeys(this.keys);
    return this;
  }

  /** Carbon method Length (ITriCurveLength): returns the cached final key time. */
  @meta.blue.method
  @meta.implemented
  Length()
  {
    return this.length;
  }

  /** Carbon method Reset (ITriFunction, not Blue-mapped): rewind the playback cursor. */
  @meta.blue.method
  @meta.implemented
  Reset()
  {
    this._currentKeyIndex = 0;
  }

  /** Carbon method GetSourceTriObserver (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.implemented
  GetSourceTriObserver()
  {
    return this.sourceTriObserver;
  }

  /** Carbon method SetSourceTriObserver (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.implemented
  SetSourceTriObserver(sourceTriObserver)
  {
    this.sourceTriObserver = sourceTriObserver;
    this.CreateAudioEmitter();
  }

  /** Carbon method CreateAudioEmitter: reuse or attach an AudEmitter placement observer. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("This preserves the donor's structural placement-observer seam until the combined runtime has a nominal multi-interface representation for the cross-layer Carbon contract.")
  CreateAudioEmitter()
  {
    if (!this.sourceTriObserver)
    {
      return null;
    }
    const existing = this.sourceTriObserver.GetObserver() ?? this.sourceTriObserver.observer ?? null;
    if (existing instanceof AudEmitter)
    {
      this.audioEmitter = existing;
      return existing;
    }
    const emitter = new AudEmitter();
    emitter.__init__(this.name);
    this.sourceTriObserver.SetObserver(emitter);
    if (!this.sourceTriObserver.SetObserver)
    {
      this.sourceTriObserver.observer = emitter;
    }
    this.audioEmitter = emitter;
    return emitter;
  }

  /** Carbon method UpdateValue (ITriFunction): fires keyed events as time advances. */
  @meta.blue.method
  @meta.implemented
  UpdateValue(time)
  {
    if (this.length === 0)
    {
      return;
    }
    const before = this.time;
    this.time = Number(time) || 0;
    if (this.time < before)
    {
      this._currentKeyIndex = 0;
    }

    if (this.extrapolation === TRIEXTRAPOLATION.TRIEXT_CYCLE)
    {
      const localNow = this.time % this.length;
      if (localNow < this.localTime)
      {
        this._currentKeyIndex = 0;
      }
      this.localTime = localNow;
    }
    else
    {
      this.localTime = this.time;
    }

    if (!this.audioEmitter && this.sourceTriObserver)
    {
      this.CreateAudioEmitter();
    }
    // Carbon tests the emitter's position against the WWISE_INIT_POSITION
    // sentinel (AudEventCurve.cpp:59,72): an emitter nobody has placed queues.
    const positioned = this.audioEmitter !== null && !IsWwiseInitPosition(this.audioEmitter.GetPosition());
    if (this._queuedEvent && positioned)
    {
      this.audioEmitter.SendEvent(this._queuedEvent);
      this._queuedEvent = "";
    }

    while (this._currentKeyIndex < this.keys.length
      && this.localTime >= this.keys[this._currentKeyIndex].time)
    {
      const eventName = this.keys[this._currentKeyIndex].value;
      if (eventName)
      {
        if (positioned)
        {
          this.audioEmitter.SendEvent(eventName);
        }
        else
        {
          this._queuedEvent = eventName;
        }
      }
      this._currentKeyIndex++;
    }
  }

  // Carbon enum TRIEXTRAPOLATION (blue/include/ITriConstants.h:33) - shared
  // vocabulary owned by the global foundation; aliased as a class static per the org
  // enum rule so @type.enum("blue.TRIEXTRAPOLATION") resolves and users address
  // AudEventCurve.TRIEXTRAPOLATION.TRIEXT_CYCLE (TRIOPERATOR pattern).
  static TRIEXTRAPOLATION = TRIEXTRAPOLATION;

}

function SortKeys(keys)
{
  keys.sort((a, b) => a.time - b.time);
}

function InRange(keys, ix)
{
  return Number.isInteger(ix) && ix >= 0 && ix < keys.length;
}

meta.blue.interfaceTable({ interfaces: [AudEventCurve, ITriFunction, IInitialize, ITriCurveLength], chainTo: null })(AudEventCurve, { kind: "class" });
