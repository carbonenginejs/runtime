import { random as carbonRandom } from "#math/random";
// Source: trinity/trinity/Eve/SpaceObject/Utils/EveBoosterUtilities.cpp
//
// Here rather than beside the rest of the booster utilities in trinity because
// SOF writes booster records too and may not import trinity; both draw the
// phase from this one implementation.

/** g_lightNoiseSize (EveBoosterUtilities.cpp:135): entries in the booster light flicker noise table. */
export const BOOSTER_LIGHT_NOISE_SIZE = 128;

/**
 * Carbon GenerateBoosterLightPhase (EveBoosterUtilities.cpp:158-161): a random
 * flicker phase spread over the whole noise table.
 *
 * @returns {number} A phase in [0, BOOSTER_LIGHT_NOISE_SIZE).
 */
export function GenerateBoosterLightPhase()
{
  return BOOSTER_LIGHT_NOISE_SIZE * carbonRandom.triFloatRandom01();
}
