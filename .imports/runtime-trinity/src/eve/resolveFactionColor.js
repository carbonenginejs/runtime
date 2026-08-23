import { vec4 } from "@carbonenginejs/runtime-utils/vec4";


/**
 * Resolves Carbon's indexed faction-colour palette into caller-owned storage.
 *
 * Carbon supplies an array of colours. The combined JS runtime currently
 * supplies the same contract through EveSOFDataFactionColorSet: its static
 * Types array defines the valid index range and Get(index, out) performs the
 * copy. This is an explicit two-representation boundary, not an optional
 * method probe; any other owned shape fails at the direct contract access.
 */
export function resolveFactionColor(out, fallback, enabled, selected, colorSet)
{
  const index = Number(selected) | 0;
  if (enabled && hasFactionColor(colorSet, index))
  {
    if (Array.isArray(colorSet))
    {
      return vec4.copy(out, colorSet[index]);
    }
    return colorSet.Get(index, out);
  }
  return vec4.copy(out, fallback);
}

/** Whether either supported palette representation contains an index. */
export function hasFactionColor(colorSet, selected)
{
  if (!colorSet) return false;
  const index = Number(selected) | 0;
  if (Array.isArray(colorSet))
  {
    return index >= 0 && index < colorSet.length && !!colorSet[index];
  }
  const types = colorSet.constructor.Types;
  if (!Array.isArray(types))
  {
    throw new TypeError("A named faction color set must expose its static Types array.");
  }
  return index >= 0 && index < types.length;
}
