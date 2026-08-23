const OBSTRUCTION_OCCLUSION_MODES = new Set(["strict", "approximate-web-audio"]);
const MINIMUM_CUTOFF_HZ = 600;
const CLEAR_CUTOFF_HZ = 20000;
const MAXIMUM_ATTENUATION_DB = -18;
const PARAMETER_TIME_CONSTANT_SECONDS = 0.005;

/** Validates the host-selected obstruction/occlusion realization policy. */
function normalizeWwiseObstructionOcclusionMode(value = "strict") {
  const mode = String(value ?? "strict");
  if (!OBSTRUCTION_OCCLUSION_MODES.has(mode)) {
    throw new TypeError(`Unsupported Wwise obstruction/occlusion realization mode: ${mode}`);
  }
  return mode;
}

/** Creates one optional browser approximation stage before a destination. */
function createWwiseObstructionOcclusionStage(context, destination, mode) {
  if (mode !== "approximate-web-audio" || typeof context?.createBiquadFilter !== "function" || typeof context?.createGain !== "function") {
    return null;
  }
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  filter.type = "lowpass";
  SetParam(filter.frequency, GetClearCutoffHz(context));
  SetParam(filter.Q, 0.707);
  SetParam(gain.gain, 1);
  filter.connect(gain);
  gain.connect(destination);
  return {
    input: filter,
    output: gain,
    nodes: [filter, gain]
  };
}

/** Applies the explicit monotonic browser approximation to one stage. */
function applyWwiseObstructionOcclusionStage(stage, obstruction, occlusion, context) {
  if (!stage) return;
  const direct = ClampUnit(obstruction);
  const environmental = ClampUnit(occlusion);
  const blockage = 1 - (1 - direct) * (1 - environmental);
  const clearCutoffHz = GetClearCutoffHz(context);
  const cutoffHz = clearCutoffHz * (MINIMUM_CUTOFF_HZ / clearCutoffHz) ** blockage;
  const gain = 10 ** (MAXIMUM_ATTENUATION_DB * blockage / 20);
  SmoothParam(stage.input.frequency, cutoffHz, context);
  SmoothParam(stage.output.gain, gain, context);
}

/** Disconnects every node owned by one optional approximation stage. */
function disconnectWwiseObstructionOcclusionStage(stage) {
  for (const node of stage?.nodes ?? []) {
    node.disconnect?.();
  }
}
function ClampUnit(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : 0;
}
function GetClearCutoffHz(context) {
  const nyquistHz = Number(context?.sampleRate) / 2;
  return Number.isFinite(nyquistHz) && nyquistHz > MINIMUM_CUTOFF_HZ ? Math.min(CLEAR_CUTOFF_HZ, nyquistHz) : CLEAR_CUTOFF_HZ;
}
function SetParam(parameter, value) {
  if (parameter) parameter.value = value;
}
function SmoothParam(parameter, value, context) {
  if (!parameter) return;
  const now = Number(context?.currentTime) || 0;
  if (typeof parameter.setTargetAtTime === "function") {
    parameter.setTargetAtTime(value, now, PARAMETER_TIME_CONSTANT_SECONDS);
  } else {
    parameter.value = value;
  }
}

export { applyWwiseObstructionOcclusionStage, createWwiseObstructionOcclusionStage, disconnectWwiseObstructionOcclusionStage, normalizeWwiseObstructionOcclusionMode };
//# sourceMappingURL=obstructionOcclusion.js.map
