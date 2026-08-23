// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Include/ITr2Interior.h

/**
 * Carbon's contract for an interior-scene light.
 *
 * This is intentionally a type-only contract. `ITr2InteriorLight` is a
 * `BLUE_INTERFACE`, not a constructible Blue model, and therefore must not be
 * registered with `type.define` or given the fields of its nested
 * `LightSourceItem` helper structure.
 *
 * @typedef {object} ITr2InteriorLight
 * @property {(lightData: object) => void} PopulateLightData Populates the
 * per-object light data for a renderable.
 * @property {(time: number) => void} Update Performs the per-frame update.
 */

export {};
