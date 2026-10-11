import { vec4 } from "#math/vec4";


/**
 * Resolves Carbon's indexed faction-colour palette into caller-owned storage.
 *
 * Carbon supplies an array of colours (`SetInheritProperties(const Color*)`),
 * indexed by `SOFDataFactionColorChooser::ColorType`. An
 * EveSOFDataFactionColorSet's `colors` member is that same array.
 * @param {vec4} out Receives the colour.
 * @param {vec4} fallback Colour used when the palette is off or lacks the slot.
 * @param {boolean} enabled Whether the faction colour is used.
 * @param {number} selected ColorType index.
 * @param {Array<vec4>|null} colorSet Inherited palette.
 * @returns {vec4} out.
 */
export function resolveFactionColor(out, fallback, enabled, selected, colorSet)
{
  const index = Number(selected) | 0;
  if (enabled && hasFactionColor(colorSet, index)) return vec4.copy(out, colorSet[index]);
  return vec4.copy(out, fallback);
}

/**
 * Whether a palette holds a colour at an index.
 * @param {Array<vec4>|null} colorSet Inherited palette.
 * @param {number} selected ColorType index.
 * @returns {boolean} True when the slot exists and is set.
 */
export function hasFactionColor(colorSet, selected)
{
  if (!colorSet) return false;
  const index = Number(selected) | 0;
  return index >= 0 && index < colorSet.length && !!colorSet[index];
}
