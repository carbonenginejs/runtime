import { evaluateWwiseRtpcCurve, wwiseDbRtpcValueToDb } from './wwiseRtpc.js';

// CarbonEngineJS original (no Carbon counterpart). Per-voice Web Audio
// realization of already-qualified Wwise source-effect RTPC curves.
const AUTOMATION_SAMPLES = 33;
const MIN_EQ_GAIN_DB = -24;
const MAX_EQ_GAIN_DB = 24;
const MIN_EQ_FREQUENCY_HZ = 20;
const MAX_EQ_FREQUENCY_HZ = 20000;
const MIN_DISTORTION_DRIVE_PERCENT = 0;
const MAX_DISTORTION_DRIVE_PERCENT = 100;
const MIN_FLANGER_MIX_PERCENT = 0;
const MAX_FLANGER_MIX_PERCENT = 100;
const MIN_TREMOLO_FREQUENCY_HZ = 0.02;
const MIN_TREMOLO_DEPTH_PERCENT = 0;
const MAX_TREMOLO_DEPTH_PERCENT = 100;
const FILTER_SETTLE_MULTIPLIER = 2;
const FILTER_REMAINING_AT_AUTHORED_TIME = 0.005;

/** Owns live AudioParam bindings for one realized source-effect chain. */
class CjsWwiseSourceEffectRtpcLane {
  #bindings;
  #context;
  #readCurve;
  #filteredControls = new Map();

  /** Creates a lane over qualified bindings and one authored RTPC reader. */
  constructor(context, bindings, readCurve) {
    this.#context = context;
    this.#bindings = [...(bindings ?? [])];
    this.#readCurve = readCurve;
  }

  /** Schedules every bound effect parameter over known control transitions. */
  Apply(boundaries = [], smooth = false) {
    if (typeof this.#readCurve !== "function") return;
    const now = Number(this.#context?.currentTime) || 0;
    const ends = [...new Set(boundaries.map(Number).filter(value => Number.isFinite(value) && value > now))].sort((left, right) => left - right);
    for (const binding of this.#bindings) {
      const transition = binding.curve.controlTransition;
      if (!transition) continue;
      const key = FilteredControlKey(binding.curve);
      if (!this.#filteredControls.has(key)) {
        const target = Number(this.#readCurve(binding.curve, now, true));
        if (Number.isFinite(target)) {
          this.#filteredControls.set(key, new CjsWwiseFilteredControl(target, now));
        }
        continue;
      }
      const control = this.#filteredControls.get(key);
      const target = Number(this.#readCurve(binding.curve, now, true));
      control.SetTarget(target, now, transition);
    }
    for (const binding of this.#bindings) {
      const transition = binding.curve.controlTransition;
      const bindingEnds = transition ? [...ends,
      // Wwise specifies 99.5% at the authored time. Continue
      // the same exponential for one more authored interval,
      // where only 0.0025% remains, before settling exactly.
      this.#filteredControls.get(FilteredControlKey(binding.curve))?.GetSettleTime()].filter(value => Number.isFinite(value) && value > now) : ends;
      ScheduleBinding(binding, at => this.#ValueAt(binding, at), now, [...new Set(bindingEnds)].sort((left, right) => left - right), smooth);
    }
  }

  /** Releases references after the owning voice disconnects its nodes. */
  Dispose() {
    this.#bindings = [];
    this.#readCurve = null;
    this.#filteredControls.clear();
  }

  /** Resolves one bound AudioParam value at an AudioContext time. */
  #ValueAt(binding, at) {
    const filtered = binding.curve.controlTransition ? this.#filteredControls.get(FilteredControlKey(binding.curve)) : null;
    const output = filtered ? evaluateWwiseRtpcCurve(binding.curve.points, filtered.Evaluate(at)) : Number(this.#readCurve(binding.curve, at));
    const value = ScaleCurveOutput(output, binding.curve.scaling);
    const combined = binding.curve.accumulation === "additive" ? binding.baseValue + value : value;
    if (binding.curve.property === "gainDb") {
      return Clamp(combined, MIN_EQ_GAIN_DB, MAX_EQ_GAIN_DB);
    }
    if (binding.curve.property === "drivePercent") {
      const drivePercent = Clamp(combined, MIN_DISTORTION_DRIVE_PERCENT, MAX_DISTORTION_DRIVE_PERCENT);
      const drive = 1 + drivePercent / binding.driveDivisor;
      if (binding.transform === "distortion-drive-input") {
        return drive / binding.maximumDrive;
      }
      return Math.tanh(binding.maximumDrive) / Math.tanh(drive);
    }
    if (binding.curve.property === "modulationDepthPercent") {
      const depth = Clamp(combined, MIN_TREMOLO_DEPTH_PERCENT, MAX_TREMOLO_DEPTH_PERCENT) / 100;
      return binding.transform === "tremolo-depth-midpoint" ? 1 - depth / 2 : depth / 2;
    }
    if (binding.curve.property === "wetDryMixPercent") {
      const mix = Clamp(combined, MIN_FLANGER_MIX_PERCENT, MAX_FLANGER_MIX_PERCENT) / 100;
      return binding.transform === "flanger-dry-mix" ? 1 - mix : mix;
    }
    const nyquist = Number(this.#context?.sampleRate) / 2;
    const maximum = Number.isFinite(nyquist) && nyquist > 0 ? Math.min(MAX_EQ_FREQUENCY_HZ, nyquist) : MAX_EQ_FREQUENCY_HZ;
    if (binding.curve.property === "modulationFrequencyHz") {
      return Clamp(combined, MIN_TREMOLO_FREQUENCY_HZ, maximum);
    }
    return Clamp(combined, MIN_EQ_FREQUENCY_HZ, maximum);
  }
}

/** Creates a lane only when the chain retained live source-effect controls. */
function createWwiseSourceEffectRtpcLane(context, bindings, readCurve) {
  return bindings?.length && typeof readCurve === "function" ? new CjsWwiseSourceEffectRtpcLane(context, bindings, readCurve) : null;
}
function ScaleCurveOutput(value, scaling) {
  if (!Number.isFinite(value)) return 0;
  if (scaling === 2) return wwiseDbRtpcValueToDb(value);
  if (scaling === 3) return 10 ** value;
  return value;
}
function ScheduleBinding(binding, evaluate, now, boundaries, smooth) {
  const param = binding.param;
  const startValue = evaluate(now);
  if (typeof param?.cancelAndHoldAtTime === "function") {
    param.cancelAndHoldAtTime(now);
  } else {
    param?.cancelScheduledValues?.(0);
  }
  if (smooth && binding.smooth && typeof param?.setTargetAtTime === "function") {
    param.setTargetAtTime(startValue, now, 0.005);
    return;
  } else {
    param?.setValueAtTime?.(startValue, now);
    if (param && "value" in param) param.value = startValue;
  }
  let segmentStart = now;
  for (const segmentEnd of boundaries) {
    if (typeof param?.setValueCurveAtTime === "function") {
      const values = new Float32Array(AUTOMATION_SAMPLES);
      for (let index = 0; index < values.length; index++) {
        const ratio = index / (values.length - 1);
        values[index] = evaluate(segmentStart + (segmentEnd - segmentStart) * ratio);
      }
      param.setValueCurveAtTime(values, segmentStart, segmentEnd - segmentStart);
    } else {
      param?.linearRampToValueAtTime?.(evaluate(segmentEnd), segmentEnd);
    }
    segmentStart = segmentEnd;
  }
}
function Clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}
function FilteredControlKey(curve) {
  return `${curve.scope}\0${curve.rtpc}`;
}

/** Owns one voice-local approximation of a filtered Wwise control timeline. */
class CjsWwiseFilteredControl {
  #from;
  #to;
  #startTime;
  #timeConstant = 0;
  #settleTime;

  /** Creates a settled control at one initial value and context time. */
  constructor(value, at) {
    this.#from = value;
    this.#to = value;
    this.#startTime = at;
    this.#settleTime = at;
  }

  /** Returns the context time at which the current filter settles exactly. */
  GetSettleTime() {
    return this.#settleTime;
  }

  /** Rebases the filter toward a new target using authored ramp timing. */
  SetTarget(value, at, transition) {
    if (!Number.isFinite(value) || value === this.#to) return;
    const current = this.Evaluate(at);
    const duration = value > current ? transition.rampUpSeconds : transition.rampDownSeconds;
    this.#from = current;
    this.#to = value;
    this.#startTime = at;
    this.#timeConstant = duration / -Math.log(FILTER_REMAINING_AT_AUTHORED_TIME);
    this.#settleTime = at + duration * FILTER_SETTLE_MULTIPLIER;
  }

  /** Evaluates the filtered control at one context time. */
  Evaluate(at) {
    const time = Number(at);
    if (!Number.isFinite(time) || this.#timeConstant <= 0 || time >= this.#settleTime) {
      return this.#to;
    }
    const elapsed = Math.max(0, time - this.#startTime);
    return this.#to + (this.#from - this.#to) * Math.exp(-elapsed / this.#timeConstant);
  }
}

export { CjsWwiseSourceEffectRtpcLane, createWwiseSourceEffectRtpcLane };
//# sourceMappingURL=sourceEffectRtpc.js.map
