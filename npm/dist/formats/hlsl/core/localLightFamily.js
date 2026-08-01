/**
 * Recognises Carbon's local-light resource family from reflection alone.
 *
 * Carbon puts local lights in two structured buffers plus an optional profile
 * texture. On a backend with storage buffers this needs no attention at all —
 * WebGPU binds them natively and loses nothing. WebGL 2 has no structured
 * buffers, so the same two resources have to be re-expressed as data textures,
 * and something has to say which registers they were.
 *
 * That "which registers" question is what this module answers, and it is
 * backend-neutral for the same reason the detail-map recogniser is: it is a fact
 * about Carbon's resources, not about a shading language. The registers are not
 * fixed — one permutation binds the family at t11/t12/t13 and another at
 * t13/t14/t15 — so this is name-driven and must stay that way.
 *
 * See docs/contracts/webgl2-texture-budget.md for why the two units matter.
 */

/** The structured buffers, both required for the family to be recognised. */
const LIGHT_INDEX_BUFFER = "LightIndexBuffer";
const LIGHT_DATA_BUFFER = "LightBuffer";

/** The profile texture, which is optional. */
const LIGHT_PROFILE_ARRAY = "LightProfileArray";

/** Every resource name in the family, for callers that need to strip them. */
const LOCAL_LIGHT_RESOURCE_NAMES = Object.freeze([LIGHT_INDEX_BUFFER, LIGHT_DATA_BUFFER, LIGHT_PROFILE_ARRAY]);

/** Carbon's resource type code for a structured buffer, as `BoneTransforms` uses. */
const CARBON_STRUCTURED_BUFFER = 7;

/**
 * Recognises the local-light family in one stage's reflected resources.
 *
 * Both structured buffers are required. The profile array is not: some
 * permutations never sample it, and a lowering may substitute neutral
 * attenuation for it. Returning a plan with `profileRegister: null` is a
 * different statement from returning null, and callers depend on the difference.
 *
 * @param {Array<object>} resources Reflected resources, each carrying
 *   `registerIndex`, `name` and `type`.
 * @returns {object|null} Frozen plan, or null when the family is absent.
 */
function recogniseLocalLightFamily(resources) {
  const byName = new Map();
  for (const resource of resources ?? []) {
    const value = resource?.toJSON?.() ?? resource;
    const name = value?.name;
    if (typeof name !== "string" || !LOCAL_LIGHT_RESOURCE_NAMES.includes(name)) continue;
    if (byName.has(name)) return null;
    byName.set(name, value);
  }
  const index = byName.get(LIGHT_INDEX_BUFFER);
  const data = byName.get(LIGHT_DATA_BUFFER);
  if (!index || !data) return null;

  // Both must actually be structured buffers. A same-named 2D texture is not
  // this family, and lowering it as though it were would misread every light.
  if (index.type !== CARBON_STRUCTURED_BUFFER || data.type !== CARBON_STRUCTURED_BUFFER) {
    return null;
  }
  if (!Number.isInteger(index.registerIndex) || !Number.isInteger(data.registerIndex)) {
    return null;
  }
  const profile = byName.get(LIGHT_PROFILE_ARRAY);
  return Object.freeze({
    indexRegister: index.registerIndex,
    dataRegister: data.registerIndex,
    profileRegister: Number.isInteger(profile?.registerIndex) ? profile.registerIndex : null,
    registers: Object.freeze([index.registerIndex, data.registerIndex, profile?.registerIndex].filter(register => Number.isInteger(register)).sort((a, b) => a - b))
  });
}

export { LOCAL_LIGHT_RESOURCE_NAMES, recogniseLocalLightFamily };
//# sourceMappingURL=localLightFamily.js.map
