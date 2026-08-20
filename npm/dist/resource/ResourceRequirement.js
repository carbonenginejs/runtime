/**
 * The key that selects which resource class a path becomes.
 *
 * Carried by `CjsResource.requirement`, declared by each resource as
 * `static payload`, and matched by `CjsResMan.RegisterResourceType` and
 * `GetResource({ requirement })` — one vocabulary in three places, previously a
 * bare literal in each, with nothing catching a typo between them.
 *
 * Not to be confused with a format's `outputTypes`, which select a
 * representation rather than a class: one DDS read as `texture` or as `rgba` is
 * the same file in the same resource.
 *
 * @readonly
 * @enum {string}
 */
const ResourceRequirement = Object.freeze({
  /** `TriTextureRes` */
  TEXTURE: "texture",
  /** `Tr2ImageRes` */
  IMAGE: "image",
  /** `CjsTextureArrayRes` */
  TEXTURE_ARRAY: "texture-array",
  /** `TriGeometryRes` */
  GEOMETRY: "geometry",
  /** `TriGrannyRes` */
  GRANNY: "granny",
  /** `Tr2GrannyStateRes` */
  GRANNY_STATE: "granny-state",
  /** `Tr2EffectRes` */
  SHADER: "shader",
  /** `Tr2LightProfileRes` */
  LIGHT_PROFILE: "light-profile",
  /** The audio resources. */
  AUDIO: "audio"
});

/** Whether a value belongs to the requirement vocabulary. */
function isResourceRequirement(value) {
  return Object.values(ResourceRequirement).includes(value);
}

export { ResourceRequirement, isResourceRequirement };
//# sourceMappingURL=ResourceRequirement.js.map
