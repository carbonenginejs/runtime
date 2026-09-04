/**
 * Hydration helpers for the shared CarbonEngineJS mesh/animation schema.
 */

export const CLASS_KEYS = Object.freeze([
    "Root", "Mesh", "BoneBinding", "IndexGroup", "MorphTarget", "Model",
    "Skeleton", "Bone", "Animation", "TrackGroup", "TransformTrack", "VectorTrack", "Curve"
]);

function build(classes, key, props, hydrationOptions = {})
{
    const Ctor = classes[key];
    return Ctor ? populate(new Ctor(), props, hydrationOptions) : props;
}

function populate(instance, props, hydrationOptions = {})
{
    if (!instance || typeof instance.SetValues !== "function")
    {
        throw new TypeError("CjsGltfFormat class population requires classes to implement SetValues(values)");
    }
    instance.SetValues(props, { ...hydrationOptions, skipUpdate: true, skipEvents: true });
    return instance;
}

function hydrateCurve(curve, classes, hydrationOptions)
{
    return curve ? build(classes, "Curve", curve, hydrationOptions) : curve;
}

/**
 * Hydrate the plain shared graph with caller-supplied classes.
 *
 * @param {object} root Plain JSON graph.
 * @param {object} [options] Hydration options.
 * @param {object} [options.classes] Node constructor map.
 * @returns {object} Hydrated graph.
 */
export function hydrateShared(root, { classes = {}, ...hydrationOptions } = {})
{
    const skeletons = new Map();
    const hydrateSkeleton = (skeleton) =>
    {
        if (skeletons.has(skeleton)) return skeletons.get(skeleton);
        const hydrated = build(classes, "Skeleton", {
            ...skeleton,
            bones: skeleton.bones.map(bone => build(classes, "Bone", bone, hydrationOptions))
        }, hydrationOptions);
        skeletons.set(skeleton, hydrated);
        return hydrated;
    };

    return build(classes, "Root", {
        ...root,
        grannyFileFormatRevision: root.grannyFileFormatRevision,
        grannyFileSource: root.grannyFileSource,
        meshes: root.meshes.map(mesh => build(classes, "Mesh", {
            ...mesh,
            name: mesh.name,
            morphTargets: mesh.morphTargets.map(target => build(classes, "MorphTarget", target, hydrationOptions)),
            minBounds: mesh.minBounds,
            maxBounds: mesh.maxBounds,
            boneBindings: mesh.boneBindings.map(binding => build(classes, "BoneBinding", binding, hydrationOptions)),
            vertex: mesh.vertex,
            indices: mesh.indices.map(group => build(classes, "IndexGroup", group, hydrationOptions))
        }, hydrationOptions)),
        models: root.models.map(model => build(classes, "Model", {
            ...model,
            name: model.name,
            skeleton: hydrateSkeleton(model.skeleton),
            meshBindings: model.meshBindings
        }, hydrationOptions)),
        animations: root.animations.map(animation => build(classes, "Animation", {
            ...animation,
            name: animation.name,
            duration: animation.duration,
            timeStep: animation.timeStep,
            oversampling: animation.oversampling,
            defaultLoopCount: animation.defaultLoopCount,
            flags: animation.flags,
            trackGroups: animation.trackGroups.map(group => build(classes, "TrackGroup", {
                ...group,
                name: group.name,
                transformTracks: group.transformTracks.map(track => build(classes, "TransformTrack", {
                    ...track,
                    name: track.name,
                    flags: track.flags,
                    orientation: hydrateCurve(track.orientation, classes, hydrationOptions),
                    position: hydrateCurve(track.position, classes, hydrationOptions),
                    scaleShear: hydrateCurve(track.scaleShear, classes, hydrationOptions)
                }, hydrationOptions)),
                vectorTracks: (group.vectorTracks ?? []).map(track => build(classes, "VectorTrack", {
                    ...track,
                    valueCurve: hydrateCurve(track.valueCurve, classes, hydrationOptions)
                }, hydrationOptions))
            }, hydrationOptions))
        }, hydrationOptions))
    }, hydrationOptions);
}
