// Source: trinity/trinity/PriorityBlend.h


/**
 * Blends one enabled attribute across priority-descending sources using
 * Carbon's equal-priority band policy.
 *
 * Each source carries `priority` and `intensity`; `getAttribute(source)` must
 * return `{ value, enabled }`. Numeric results start at zero. Passing a typed
 * array as `out` produces a component-wise sum in that same allocation.
 * Carbon subtracts each band's un-clamped enabled intensity from the remaining
 * weight; that detail is preserved, including negative and over-one totals.
 *
 * @param {Array} sources - already sorted by descending priority
 * @param {Function} getAttribute - returns the source attribute record
 * @param {Number|ArrayBufferView} [out=0] - numeric zero or mutable vector
 * @returns {Number|ArrayBufferView} the blended value
 */
export function AccumulatePriorityAttribute(sources, getAttribute, out = 0)
{
  const vectorResult = ArrayBuffer.isView(out) || Array.isArray(out);
  let result = out;
  if (vectorResult)
  {
    out.fill(0);
  }
  else
  {
    result = 0;
  }

  let remainingWeight = 1;
  for (let first = 0; first < sources.length;)
  {
    let last = first + 1;
    while (last < sources.length && sources[last].priority === sources[first].priority)
    {
      last++;
    }

    let totalPriorityIntensity = 0;
    for (let index = first; index < last; index++)
    {
      if (getAttribute(sources[index]).enabled)
      {
        totalPriorityIntensity += Number(sources[index].intensity);
      }
    }

    if (totalPriorityIntensity !== 0)
    {
      const normalization = remainingWeight / Math.max(totalPriorityIntensity, 1);
      for (let index = first; index < last; index++)
      {
        const source = sources[index];
        const attribute = getAttribute(source);
        if (!attribute.enabled) continue;
        const weight = Number(source.intensity) * normalization;
        if (vectorResult)
        {
          for (let lane = 0; lane < out.length; lane++)
          {
            out[lane] += attribute.value[lane] * weight;
          }
        }
        else
        {
          result += Number(attribute.value) * weight;
        }
      }

      remainingWeight -= totalPriorityIntensity;
      if (remainingWeight <= 0) break;
    }
    first = last;
  }

  return result;
}
