const CURVE_SAMPLES = 65;

/** Schedules one route leg's complete Bus-Volume duck contribution. */
function scheduleSharedBusDuckGain({
  param,
  busPathIds,
  context,
  busDuckingController
} = {}) {
  if (!param) return;
  const path = (busPathIds ?? []).map(String);
  const now = Number(context?.currentTime) || 0;
  const evaluate = at => 10 ** ((busDuckingController?.EvaluateGainDb?.(path, at, "bus-volume") ?? 0) / 20);
  const boundaries = busDuckingController?.TransitionBoundaries?.(path, now, "bus-volume") ?? [];
  const startValue = evaluate(now);
  if (typeof param.cancelAndHoldAtTime === "function") {
    param.cancelAndHoldAtTime(now);
  } else {
    param.cancelScheduledValues?.(0);
  }
  param.setValueAtTime?.(startValue, now);
  if ("value" in param) param.value = startValue;
  let segmentStart = now;
  for (const segmentEnd of boundaries) {
    if (typeof param.setValueCurveAtTime === "function") {
      const values = new Float32Array(CURVE_SAMPLES);
      for (let index = 0; index < values.length; index++) {
        const ratio = index / (values.length - 1);
        values[index] = evaluate(segmentStart + (segmentEnd - segmentStart) * ratio);
      }
      param.setValueCurveAtTime(values, segmentStart, segmentEnd - segmentStart);
    } else {
      param.linearRampToValueAtTime?.(evaluate(segmentEnd), segmentEnd);
    }
    segmentStart = segmentEnd;
  }
}

export { scheduleSharedBusDuckGain };
//# sourceMappingURL=busDuckGain.js.map
