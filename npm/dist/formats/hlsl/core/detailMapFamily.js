/**
 * Recognises Carbon's Detail-map resource family from reflection alone.
 *
 * Both backends merge `Detail1Map`/`Detail2Map`/`Detail3Map` into a single
 * array texture, and both need to agree exactly on *which* registers take part.
 * That decision is about the resources, not about the shading language, so it
 * lives here rather than twice in the two emitters.
 *
 * What this module does **not** do is prove the merge is safe. Recognising the
 * family is necessary but not sufficient: a backend must also confirm that every
 * use of those registers is a plain sample it can redirect at an array layer. A
 * detail map fetched by integer coordinate, or queried for its size, cannot be
 * merged, and only the code walking the shader can see that. So each backend
 * pairs this recogniser with its own use check and fails closed on anything it
 * does not understand.
 *
 * The WebGL 2 motivation is a hard limit rather than tidiness: the affected
 * shaders sit at exactly 16 textures against a 16-unit guarantee, so merging
 * three maps into one is what creates the headroom lighting needs. See
 * docs/contracts/webgl2-texture-budget.md.
 */

/** Resource names that make up the family, in layer order. */
const DETAIL_PARAMETERS = Object.freeze(["Detail1Map", "Detail2Map", "Detail3Map"]);

/** Carbon's resource type code for a 2D texture. */
const CARBON_TEXTURE_2D = 2;

/** The merged array's name, and the transform family it belongs to. */
const DETAIL_MAP_ARRAY_NAME = "DetailMapArray";
const DETAIL_MAP_ARRAY_FAMILY = "detail-map-array";

/**
 * Recognises the detail-map family in one stage's reflected resources.
 *
 * Requires the maps to be contiguous from `Detail1Map` with no gap, in one
 * register space, at strictly ascending registers, and each an ordinary
 * non-sRGB single-element 2D texture. Anything else returns null: a partial or
 * unusual family is not merged, because guessing produces a shader that links
 * and samples the wrong thing.
 *
 * @param {Array<object>} resources Reflected resources, each carrying
 *   `registerIndex`, `name`, `type`, and optionally `registerSpace`,
 *   `arrayElements` and `isSRGB`.
 * @param {object} [options] Recognition options.
 * @param {number} [options.registerSpace] Default register space.
 * @returns {object|null} Frozen plan, or null when the family is absent or unusable.
 */
function recogniseDetailMapFamily(resources, options = {}) {
  const registerSpace = options.registerSpace ?? 0;
  const byParameter = new Map();
  for (const resource of resources ?? []) {
    const value = resource?.toJSON?.() ?? resource;
    const name = value?.name;
    if (typeof name !== "string" || !DETAIL_PARAMETERS.includes(name)) continue;

    // A duplicate name means the reflection is not what this recogniser
    // assumes, so it declines rather than picking one.
    if (byParameter.has(name)) return null;
    byParameter.set(name, {
      registerIndex: value.registerIndex,
      value
    });
  }
  if (byParameter.size < 2) return null;

  // Contiguous from Detail1Map: {1,2} and {1,2,3} merge, {1,3} does not.
  const parameters = DETAIL_PARAMETERS.slice(0, byParameter.size);
  if (parameters.some(parameter => !byParameter.has(parameter))) return null;
  const layers = [];
  for (const [layer, parameter] of parameters.entries()) {
    const {
      registerIndex,
      value
    } = byParameter.get(parameter);
    if (!Number.isInteger(registerIndex) || registerIndex < 0 || value.type !== CARBON_TEXTURE_2D || (value.arrayElements ?? 1) !== 1 || value.isSRGB === true) {
      return null;
    }
    if (layer > 0 && registerIndex <= layers[layer - 1].registerIndex) return null;
    layers.push({
      parameter,
      layer,
      registerIndex,
      registerSpace: value.registerSpace ?? registerSpace
    });
  }
  return Object.freeze({
    family: DETAIL_MAP_ARRAY_FAMILY,
    outputName: DETAIL_MAP_ARRAY_NAME,
    registerSpace,
    layerCount: layers.length,
    layers: Object.freeze(layers.map(entry => Object.freeze(entry))),
    registers: Object.freeze(layers.map(entry => entry.registerIndex))
  });
}

/**
 * Builds the transform record the container's shared transform section stores.
 *
 * @param {object} plan Recognised family plan.
 * @param {string} layoutKey Enclosing pass key.
 * @returns {object} Transform record.
 */
function detailMapTransformFor(plan, layoutKey) {
  return {
    id: `${layoutKey}:${DETAIL_MAP_ARRAY_FAMILY}:sampled-resource:${plan.registerSpace}:${plan.registers[0]}`,
    family: DETAIL_MAP_ARRAY_FAMILY,
    layoutKey,
    inputs: plan.layers.map(entry => ({
      registerSpace: entry.registerSpace,
      registerIndex: entry.registerIndex,
      parameter: entry.parameter
    }))
  };
}

export { DETAIL_MAP_ARRAY_FAMILY, DETAIL_MAP_ARRAY_NAME, detailMapTransformFor, recogniseDetailMapFamily };
//# sourceMappingURL=detailMapFamily.js.map
