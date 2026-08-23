const WWISE_REVERB_MODES = new Set(["strict", "approximate-web-audio"]);
const FDN_DELAY_SECONDS = Object.freeze([
// Four spaced values from Wwise's documented default-delay table bound
// browser node cost. The authored 4/8/12/16 count remains in metadata.
0.01362, 0.01902, 0.02478, 0.02691]);
const MINIMUM_DAMPING_HZ = 1000;
const MAXIMUM_DAMPING_HZ = 20000;

/** Validates the host policy for source-local Wwise reverb realization. */
function normalizeWwiseReverbMode(value = "strict") {
  const mode = String(value);
  if (!WWISE_REVERB_MODES.has(mode)) {
    throw new TypeError(`Unsupported Wwise reverb realization mode: ${mode}`);
  }
  return mode;
}

/**
 * Creates the bounded four-line browser approximation of Matrix Reverb.
 *
 * Wwise's proprietary matrix, channel, and damping laws are unavailable. This
 * deterministic cyclic FDN preserves dry/wet levels, pre-delay, and nominal
 * T60 only. Voice disposal intentionally cuts its remaining reverb state.
 */
function createWwiseMatrixReverbApproximation(context, effect) {
  const input = context.createGain();
  const dry = context.createGain();
  const wetInput = context.createGain();
  const preDelay = context.createDelay(1);
  const wetSum = context.createGain();
  const output = context.createGain();
  const delays = FDN_DELAY_SECONDS.map(seconds => {
    const delay = context.createDelay(0.1);
    SetParam(delay.delayTime, seconds);
    return delay;
  });
  const dampingHz = DampingFrequency(effect.hfRatio, context.sampleRate);
  const dampers = FDN_DELAY_SECONDS.map(() => {
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    SetParam(filter.frequency, dampingHz);
    SetParam(filter.Q, Math.SQRT1_2);
    return filter;
  });
  const feedback = FDN_DELAY_SECONDS.map((seconds, index) => {
    const gain = context.createGain();
    const magnitude = 10 ** (-3 * seconds / effect.reverbTimeSeconds);
    SetParam(gain.gain, index % 2 ? -magnitude : magnitude);
    return gain;
  });
  const taps = FDN_DELAY_SECONDS.map(() => {
    const gain = context.createGain();
    SetParam(gain.gain, 1 / Math.sqrt(FDN_DELAY_SECONDS.length));
    return gain;
  });
  SetParam(dry.gain, DbToGain(effect.dryLevelDb));
  SetParam(wetInput.gain, 1 / Math.sqrt(FDN_DELAY_SECONDS.length));
  SetParam(preDelay.delayTime, effect.preDelaySeconds);
  SetParam(wetSum.gain, DbToGain(effect.wetLevelDb));
  input.connect(dry);
  dry.connect(output);
  input.connect(wetInput);
  wetInput.connect(preDelay);
  wetSum.connect(output);
  for (let index = 0; index < delays.length; index++) {
    const next = (index + 1) % delays.length;
    preDelay.connect(delays[index]);
    delays[index].connect(taps[index]);
    taps[index].connect(wetSum);
    delays[index].connect(dampers[index]);
    dampers[index].connect(feedback[index]);
    feedback[index].connect(delays[next]);
  }
  return {
    input,
    output,
    nodes: [input, dry, wetInput, preDelay, ...delays, ...dampers, ...feedback, ...taps, wetSum, output]
  };
}
function DampingFrequency(hfRatio, sampleRate) {
  const position = Math.max(0, Math.min(1, (hfRatio - 0.5) / 9.5));
  const maximum = Math.max(MINIMUM_DAMPING_HZ, Math.min(MAXIMUM_DAMPING_HZ, Number(sampleRate) / 2 || 20000));
  return maximum * (MINIMUM_DAMPING_HZ / maximum) ** position;
}
function DbToGain(value) {
  return value <= -96 ? 0 : 10 ** (value / 20);
}
function SetParam(parameter, value) {
  if (parameter) parameter.value = value;
}

export { createWwiseMatrixReverbApproximation, normalizeWwiseReverbMode };
//# sourceMappingURL=wwiseMatrixReverb.js.map
