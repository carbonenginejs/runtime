/**
 * JSON hydration helpers for the shared CarbonEngineJS mesh/animation schema.
 */

const CLASS_KEYS = Object.freeze(["Root", "Mesh", "BoneBinding", "IndexGroup", "MorphTarget", "Model", "Skeleton", "Bone", "Animation", "TrackGroup", "TransformTrack", "Curve"]);
function build(classes, key, props, hydrationOptions = {}) {
  const Ctor = classes[key];
  return Ctor ? populate(new Ctor(), props, hydrationOptions) : props;
}
function populate(instance, props, hydrationOptions = {}) {
  if (!instance || typeof instance.SetValues !== "function") {
    throw new TypeError("CjsGltfFormat class population requires classes to implement SetValues(values)");
  }
  instance.SetValues(props, {
    ...hydrationOptions,
    skipUpdate: true,
    skipEvents: true
  });
  return instance;
}
function hydrateCurve(curve, classes, hydrationOptions) {
  return curve ? build(classes, "Curve", curve, hydrationOptions) : curve;
}

/**
 * Hydrate the plain shared JSON schema with caller-supplied classes.
 *
 * @param {object} root Plain JSON graph.
 * @param {object} [options] Hydration options.
 * @param {object} [options.classes] Node constructor map.
 * @returns {object} Hydrated graph.
 */
function hydrateJson(root, {
  classes = {},
  ...hydrationOptions
} = {}) {
  return build(classes, "Root", {
    grannyFileFormatRevision: root.grannyFileFormatRevision,
    grannyFileSource: root.grannyFileSource,
    meshes: root.meshes.map(mesh => build(classes, "Mesh", {
      name: mesh.name,
      morphTargets: mesh.morphTargets.map(target => build(classes, "MorphTarget", target, hydrationOptions)),
      minBounds: mesh.minBounds,
      maxBounds: mesh.maxBounds,
      boneBindings: mesh.boneBindings.map(binding => build(classes, "BoneBinding", binding, hydrationOptions)),
      vertex: mesh.vertex,
      indices: mesh.indices.map(group => build(classes, "IndexGroup", group, hydrationOptions))
    }, hydrationOptions)),
    models: root.models.map(model => build(classes, "Model", {
      name: model.name,
      skeleton: build(classes, "Skeleton", {
        name: model.skeleton.name,
        bones: model.skeleton.bones.map(bone => build(classes, "Bone", bone, hydrationOptions))
      }, hydrationOptions),
      meshBindings: model.meshBindings
    }, hydrationOptions)),
    animations: root.animations.map(animation => build(classes, "Animation", {
      name: animation.name,
      duration: animation.duration,
      timeStep: animation.timeStep,
      oversampling: animation.oversampling,
      defaultLoopCount: animation.defaultLoopCount,
      flags: animation.flags,
      trackGroups: animation.trackGroups.map(group => build(classes, "TrackGroup", {
        name: group.name,
        transformTracks: group.transformTracks.map(track => build(classes, "TransformTrack", {
          name: track.name,
          flags: track.flags,
          orientation: hydrateCurve(track.orientation, classes, hydrationOptions),
          position: hydrateCurve(track.position, classes, hydrationOptions),
          scaleShear: hydrateCurve(track.scaleShear, classes, hydrationOptions)
        }, hydrationOptions))
      }, hydrationOptions))
    }, hydrationOptions))
  }, hydrationOptions);
}

export { CLASS_KEYS, hydrateJson };
//# sourceMappingURL=json.js.map
