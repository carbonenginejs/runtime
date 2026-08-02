import { evaluateWwiseInterpolation } from './wwiseCurve.js';

const MIN_GAIN_DB = -200;

/** Validates and indexes one portable Wwise Audio Bus ducking catalog. */
function indexBusDuckingCatalog(value) {
  if (value === null || value === undefined) {
    return new Map();
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("Audio Bus ducking catalog must be an object");
  }
  if (value.schemaVersion !== 1) {
    throw new TypeError(`Unsupported audio bus ducking schema version: ${value.schemaVersion}`);
  }
  const sources = RequireRecord(value.sources, "Audio Bus ducking sources");
  const result = new Map();
  for (const [rawSourceBusId, rawSource] of Object.entries(sources)) {
    const sourceBusId = CanonicalPositiveId(rawSourceBusId, `Audio Bus ducking source ${rawSourceBusId}`);
    const source = RequireRecord(rawSource, `Audio Bus ducking source ${sourceBusId}`);
    const recoveryMs = NonNegativeInteger(source.recoveryMs, `Audio Bus ducking source ${sourceBusId} recoveryMs`);
    const maxDuckVolumeDb = FiniteDb(source.maxDuckVolumeDb, `Audio Bus ducking source ${sourceBusId} maxDuckVolumeDb`);
    if (maxDuckVolumeDb > 0) {
      throw new TypeError(`Audio Bus ducking source ${sourceBusId} maxDuckVolumeDb must be nonpositive`);
    }
    if (!Array.isArray(source.targets) || !source.targets.length) {
      throw new TypeError(`Audio Bus ducking source ${sourceBusId} must have targets`);
    }
    const targetKeys = new Set();
    const targets = source.targets.map((rawTarget, index) => {
      const label = `Audio Bus ducking source ${sourceBusId} target ${index}`;
      const target = RequireRecord(rawTarget, label);
      const targetBusId = CanonicalPositiveId(target.targetBusId, `${label} bus id`);
      const volumeDb = FiniteDb(target.volumeDb, `${label} volumeDb`);
      const fadeOutMs = NonNegativeInteger(target.fadeOutMs, `${label} fadeOutMs`);
      const fadeInMs = NonNegativeInteger(target.fadeInMs, `${label} fadeInMs`);
      const curve = Number(target.curve);
      const targetProperty = String(target.targetProperty ?? "");
      const key = targetBusId;
      if (targetBusId === sourceBusId) {
        throw new TypeError(`${label} cannot target its source bus`);
      }
      if (targetKeys.has(key)) {
        throw new TypeError(`${label} duplicates ${key}`);
      }
      targetKeys.add(key);
      if (volumeDb > 0 || volumeDb < maxDuckVolumeDb) {
        throw new TypeError(`${label} volumeDb must be from ${maxDuckVolumeDb} to 0`);
      }
      if (!Number.isSafeInteger(curve) || curve < 0 || curve > 9) {
        throw new TypeError(`${label} curve must be from 0 to 9`);
      }
      if (targetProperty !== "voice-volume" && targetProperty !== "bus-volume") {
        throw new TypeError(`${label} targetProperty must be voice-volume or bus-volume`);
      }
      return Object.freeze({
        targetBusId,
        volumeDb,
        fadeOutMs,
        fadeInMs,
        curve,
        targetProperty
      });
    });
    result.set(sourceBusId, Object.freeze({
      sourceBusId,
      recoveryMs,
      maxDuckVolumeDb,
      targets: Object.freeze(targets)
    }));
  }
  return result;
}

/**
 * Shared activity clock for Wwise Audio Bus auto-ducking.
 *
 * Signals are scheduled transport intervals, not analyser levels. The same
 * controller is shared by SFX and music so either engine can duck the other.
 */
class CjsBusDuckingController {
  #catalog = new Map();
  #activities = new Map();
  #targetBusIds = new Set();
  #listeners = new Set();
  #nextTokenId = 1;
  #disposed = false;

  /** Installs one validated portable ducking catalog. */
  constructor(catalog) {
    this.#catalog = indexBusDuckingCatalog(catalog);
    for (const sourceBusId of this.#catalog.keys()) {
      this.#activities.set(sourceBusId, new Map());
    }
    for (const source of this.#catalog.values()) {
      for (const target of source.targets) {
        this.#targetBusIds.add(target.targetBusId);
      }
    }
  }

  /** True when the installed catalog has at least one authored source. */
  get active() {
    return this.#catalog.size > 0 && !this.#disposed;
  }

  /** Returns whether the live catalog owns one authored ducking source. */
  HasSource(busId) {
    return !this.#disposed && this.#catalog.has(String(busId));
  }

  /** Returns whether one Bus receives an authored ducking rule. */
  HasTarget(busId) {
    return !this.#disposed && this.#targetBusIds.has(String(busId));
  }

  /** Returns whether one dry ancestry receives authored ducking. */
  PathHasTarget(busPathIds) {
    return !this.#disposed && (busPathIds ?? []).some(busId => this.#targetBusIds.has(String(busId)));
  }

  /** Subscribes a route scheduler to activity/timing changes. */
  Subscribe(listener) {
    if (typeof listener !== "function" || this.#disposed) {
      return () => {};
    }
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  /** Schedules one physical SFX/music signal across its complete dry route. */
  ScheduleActivity(busPathIds, startContextTime, endContextTime = Infinity) {
    if (this.#disposed) {
      return NullToken();
    }
    const start = Number(startContextTime);
    let end = Number(endContextTime);
    if (!Number.isFinite(start)) {
      throw new TypeError("Audio Bus ducking activity start must be finite");
    }
    if (endContextTime === Infinity) {
      end = Infinity;
    } else if (!Number.isFinite(end) || end < start) {
      throw new TypeError("Audio Bus ducking activity end must be at or after its start");
    }
    const sourceBusIds = [...new Set((busPathIds ?? []).map(String))].filter(busId => this.#catalog.has(busId));
    if (!sourceBusIds.length || end === start) {
      return NullToken();
    }
    const id = this.#nextTokenId++;
    const record = {
      id,
      start,
      end,
      sourceBusIds,
      cancelled: false
    };
    for (const sourceBusId of sourceBusIds) {
      this.#activities.get(sourceBusId).set(id, record);
    }
    this.#Notify();
    return Object.freeze({
      End: at => this.#Settle(record, at, false),
      Cancel: at => this.#Settle(record, at, true)
    });
  }

  /** Evaluates the combined authored attenuation for one collapsed route. */
  EvaluateGainDb(busPathIds, at, targetProperty = null) {
    if (this.#disposed || !this.#catalog.size) {
      return 0;
    }
    const path = new Set((busPathIds ?? []).map(String));
    let totalDb = 0;
    for (const source of this.#catalog.values()) {
      const matching = source.targets.filter(target => path.has(target.targetBusId) && (targetProperty === null || target.targetProperty === targetProperty));
      if (!matching.length) continue;
      let sourceDb = 0;
      for (const target of matching) {
        sourceDb += this.#EvaluateTarget(source, target, at);
      }
      totalDb += Math.max(source.maxDuckVolumeDb, sourceDb);
    }
    return totalDb;
  }

  /** Returns every future point at which one route's duck envelope changes. */
  TransitionBoundaries(busPathIds, from = 0) {
    if (this.#disposed || !this.#catalog.size) {
      return [];
    }
    const path = new Set((busPathIds ?? []).map(String));
    const after = Number(from) || 0;
    const result = [];
    for (const source of this.#catalog.values()) {
      const targets = source.targets.filter(target => path.has(target.targetBusId));
      if (!targets.length) continue;
      const records = [...this.#activities.get(source.sourceBusId).values()];
      for (const record of records) {
        if (record.start > after) result.push(record.start);
        for (const target of targets) {
          const fadeOutEnd = record.start + target.fadeOutMs / 1000;
          if (fadeOutEnd > after) result.push(fadeOutEnd);
          if (!Number.isFinite(record.end)) continue;
          const release = record.end + source.recoveryMs / 1000;
          const fadeInEnd = release + target.fadeInMs / 1000;
          if (release > after) result.push(release);
          if (fadeInEnd > after) result.push(fadeInEnd);
        }
      }
    }
    return [...new Set(result.filter(Number.isFinite))].sort((left, right) => left - right);
  }

  /** Drops quiescent source histories after their last release is complete. */
  Prune(at) {
    if (this.#disposed) return 0;
    const now = Number(at);
    if (!Number.isFinite(now)) return 0;
    let removed = 0;
    for (const source of this.#catalog.values()) {
      const records = this.#activities.get(source.sourceBusId);
      if (!records?.size) continue;
      const values = [...records.values()];
      if (values.some(record => !Number.isFinite(record.end))) continue;
      const fadeInSeconds = Math.max(0, ...source.targets.map(target => target.fadeInMs / 1000));
      const complete = Math.max(...values.map(record => record.end)) + source.recoveryMs / 1000 + fadeInSeconds;
      if (complete <= now) {
        removed += records.size;
        records.clear();
      }
    }
    return removed;
  }

  /** Clears activity and subscribers. */
  Dispose() {
    if (this.#disposed) return;
    this.#disposed = true;
    for (const records of this.#activities.values()) records.clear();
    this.#Notify();
    this.#targetBusIds.clear();
    this.#listeners.clear();
  }

  /** Evaluates one source-to-target duck envelope at a context time. */
  #EvaluateTarget(source, target, at) {
    const events = [];
    for (const record of this.#activities.get(source.sourceBusId).values()) {
      events.push({
        time: record.start,
        starts: 1,
        ends: 0,
        release: false
      });
      if (Number.isFinite(record.end)) {
        events.push({
          time: record.end,
          starts: 0,
          ends: 1,
          release: false
        });
        events.push({
          time: record.end + source.recoveryMs / 1000,
          starts: 0,
          ends: 0,
          release: true
        });
      }
    }
    if (!events.length) return 0;
    events.sort((left, right) => left.time - right.time);
    let count = 0;
    let releaseAt = null;
    let segment = ConstantSegment(1);
    let index = 0;
    const time = Number(at) || 0;
    while (index < events.length && events[index].time <= time) {
      const eventTime = events[index].time;
      let starts = 0;
      let ends = 0;
      let release = false;
      while (index < events.length && events[index].time === eventTime) {
        starts += events[index].starts;
        ends += events[index].ends;
        release ||= events[index].release;
        index++;
      }
      const current = EvaluateSegment(segment, eventTime);
      const wasInactive = count === 0;
      if (starts > 0) {
        if (wasInactive && releaseAt === null) {
          segment = TransitionSegment(current, DbToGain(target.volumeDb), eventTime, target.fadeOutMs / 1000, target.curve);
        }
        releaseAt = null;
      }
      count = Math.max(0, count + starts - ends);
      if (count === 0 && ends > 0) {
        releaseAt = eventTime + source.recoveryMs / 1000;
      }
      if (release && starts === 0 && count === 0 && releaseAt === eventTime) {
        segment = TransitionSegment(EvaluateSegment(segment, eventTime), 1, eventTime, target.fadeInMs / 1000, target.curve);
        releaseAt = null;
      }
    }
    return GainToDb(EvaluateSegment(segment, time));
  }

  /** Ends or cancels one scheduled activity record exactly once. */
  #Settle(record, rawAt, cancel) {
    if (record.cancelled || this.#disposed) return false;
    const at = Number(rawAt);
    if (!Number.isFinite(at)) {
      throw new TypeError("Audio Bus ducking activity end must be finite");
    }
    if (cancel) {
      for (const sourceBusId of record.sourceBusIds) {
        this.#activities.get(sourceBusId)?.delete(record.id);
      }
      record.cancelled = true;
    } else {
      const requestedEnd = Math.max(record.start, at);
      if (requestedEnd === record.start) {
        for (const sourceBusId of record.sourceBusIds) {
          this.#activities.get(sourceBusId)?.delete(record.id);
        }
        record.cancelled = true;
        this.#Notify();
        return true;
      }
      const nextEnd = Number.isFinite(record.end) ? Math.min(record.end, requestedEnd) : requestedEnd;
      if (nextEnd === record.end) return false;
      record.end = nextEnd;
    }
    this.#Notify();
    return true;
  }

  /** Notifies every live route scheduler that duck timing changed. */
  #Notify() {
    for (const listener of [...this.#listeners]) listener();
  }
}
function TransitionSegment(from, to, start, duration, curve) {
  return {
    from,
    to,
    start,
    duration,
    curve
  };
}
function ConstantSegment(value) {
  return TransitionSegment(value, value, 0, 0, 4);
}
function EvaluateSegment(segment, at) {
  if (!(segment.duration > 0) || at >= segment.start + segment.duration) {
    return segment.to;
  }
  if (at <= segment.start) return segment.from;
  const progress = (at - segment.start) / segment.duration;
  return segment.from + (segment.to - segment.from) * evaluateWwiseInterpolation(segment.curve, progress);
}
function DbToGain(value) {
  return 10 ** (Number(value) / 20);
}
function GainToDb(value) {
  return 20 * Math.log10(Math.max(1e-10, Number(value) || 0));
}
function NullToken() {
  return Object.freeze({
    End: () => false,
    Cancel: () => false
  });
}
function RequireRecord(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`);
  }
  return value;
}
function CanonicalPositiveId(value, label) {
  const text = String(value);
  const number = Number(text);
  if (!Number.isSafeInteger(number) || number <= 0 || number > 0xffffffff || String(number) !== text) {
    throw new TypeError(`${label} must be a canonical positive id`);
  }
  return text;
}
function NonNegativeInteger(value, label) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0) {
    throw new TypeError(`${label} must be a nonnegative integer`);
  }
  return number;
}
function FiniteDb(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < MIN_GAIN_DB || number > 0) {
    throw new TypeError(`${label} must be from ${MIN_GAIN_DB} to 0 dB`);
  }
  return number;
}

export { CjsBusDuckingController, indexBusDuckingCatalog };
//# sourceMappingURL=busDucking.js.map
