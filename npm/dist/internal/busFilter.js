import { evaluateBusStateProperties } from './busState.js';
import { wwiseFilterPercentToHz } from './wwiseFilter.js';

const CURVE_SAMPLES = 65;

/** Schedules one complete Audio Bus ancestry's additive State LPF or HPF. */
function scheduleSharedBusFilter({
  node,
  busPathIds,
  property,
  highPass = false,
  context,
  busStates,
  readGlobalStateWeights,
  readGlobalStateTransitionBoundaries
} = {}) {
  if (!node) return;
  const now = Number(context?.currentTime) || 0;
  const evaluate = at => wwiseFilterPercentToHz(evaluateBusStateProperties(busStates, busPathIds, readGlobalStateWeights, at)[property], highPass);
  const boundaries = typeof readGlobalStateTransitionBoundaries === "function" ? [...new Set(readGlobalStateTransitionBoundaries(now))].map(Number).filter(value => Number.isFinite(value) && value > now).sort((left, right) => left - right) : [];
  const param = node.frequency;
  const startValue = evaluate(now);
  if (typeof param?.cancelAndHoldAtTime === "function") {
    param.cancelAndHoldAtTime(now);
  } else {
    param?.cancelScheduledValues?.(0);
  }
  param?.setValueAtTime?.(startValue, now);
  if (param && "value" in param) param.value = startValue;
  let segmentStart = now;
  for (const segmentEnd of boundaries) {
    if (typeof param?.setValueCurveAtTime === "function") {
      const values = new Float32Array(CURVE_SAMPLES);
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

export { scheduleSharedBusFilter };
//# sourceMappingURL=busFilter.js.map
