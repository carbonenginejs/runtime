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
 * Those two sampler units matter against the WebGL2 limit of 16.
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

/**
 * Removes the local-light resource bindings from a binding manifest.
 *
 * Needed when the family is dropped rather than lowered: the emitter no longer
 * declares those resources, and a consumer that still sees them in the manifest
 * tries to build textures for resources the shader does not have.
 *
 * Mutates in place, matching the manifest's own conventions.
 *
 * @param {object} manifestJson Serialized binding manifest.
 * @returns {object} The same manifest, light resource bindings removed.
 */
function stripLocalLightBindings(manifestJson) {
  for (const stage of manifestJson?.stages ?? []) {
    stage.bindings = (stage.bindings ?? []).filter(binding => {
      if (binding?.kind !== "resource") return true;
      const name = binding.metadataName || binding.carbon?.name;
      return !LOCAL_LIGHT_RESOURCE_NAMES.includes(name);
    });
  }
  return manifestJson;
}

/** Transform family recording a profile array replaced by a constant. */
const LOCAL_LIGHT_PROFILE_NEUTRAL_FAMILY = "local-light-profile-neutral";

/**
 * Builds the resource transform recording that `LightProfileArray` was replaced
 * by a constant one.
 *
 * A transform rather than a binding because nothing is bound: the resource is
 * gone and its samples are a literal. What has to survive is the *statement*
 * that it was dropped deliberately, since a described Carbon resource with no
 * declaration and no record is exactly what the integrity rules treat as lost.
 *
 * The single input is the profile register itself. `detail-map-array` lists
 * several inputs because it merges them into one output; this family has no
 * output at all, so its input list names only the resource that went away.
 *
 * @param {object} plan Recognised local-light family.
 * @param {string} layoutKey Enclosing pass key.
 * @returns {object|null} Transform record, or null when there is no profile.
 */
function localLightProfileNeutralTransformFor(plan, layoutKey) {
  if (!Number.isInteger(plan?.profileRegister)) return null;
  const registerSpace = plan.registerSpace ?? 0;
  return {
    id: `${layoutKey}:${LOCAL_LIGHT_PROFILE_NEUTRAL_FAMILY}:sampled-resource:${registerSpace}:${plan.profileRegister}`,
    family: LOCAL_LIGHT_PROFILE_NEUTRAL_FAMILY,
    layoutKey,
    inputs: [{
      registerSpace,
      registerIndex: plan.profileRegister,
      parameter: LIGHT_PROFILE_ARRAY
    }]
  };
}

export { LOCAL_LIGHT_PROFILE_NEUTRAL_FAMILY, LOCAL_LIGHT_RESOURCE_NAMES, localLightProfileNeutralTransformFor, recogniseLocalLightFamily, stripLocalLightBindings };
//# sourceMappingURL=localLightFamily.js.map
