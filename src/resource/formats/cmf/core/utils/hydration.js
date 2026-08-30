/**
 * Hydrate a native CMF graph through caller-provided node constructors.
 *
 * @param {object} root Native CMF graph.
 * @param {object} [classes] CMF class-key to constructor map.
 * @param {object} [hydrationOptions] Values forwarded to SetValues.
 * @param {string} [populationLabel] Reader label used by population errors.
 * @returns {object} Hydrated CMF root or the original plain node shapes.
 */
export function hydrateCmf(root, classes = {}, hydrationOptions = {}, populationLabel = "CjsCmfFormat")
{
    const fields = {
        ...root,
        metadata: root.metadata ? hydrateMetadata(root.metadata, classes, hydrationOptions, populationLabel) : null,
        meshes: (root.meshes ?? []).map((mesh) => hydrateMesh(mesh, classes, hydrationOptions, populationLabel)),
        skeletons: (root.skeletons ?? []).map((skeleton) => hydrateSkeleton(skeleton, classes, hydrationOptions, populationLabel)),
        animations: (root.animations ?? []).map((animation) => hydrateAnimation(animation, classes, hydrationOptions, populationLabel))
    };

    if (Array.isArray(root.sections))
    {
        fields.sections = root.sections.map((section) => hydrateNode(
            "Section",
            section,
            classes,
            hydrationOptions,
            populationLabel
        ));
    }

    return hydrateNode("Root", fields, classes, hydrationOptions, populationLabel);
}

function hydrateMetadata(metadata, classes, hydrationOptions, populationLabel)
{
    return hydrateNode("Metadata", {
        ...metadata,
        entries: (metadata.entries ?? []).map((entry) => hydrateNode(
            "MetadataEntry",
            entry,
            classes,
            hydrationOptions,
            populationLabel
        ))
    }, classes, hydrationOptions, populationLabel);
}

function hydrateMesh(mesh, classes, hydrationOptions, populationLabel)
{
    const
        morphTargets = mesh.morphTargets ?? { decl: [], targets: [] },
        lods = (mesh.lods ?? []).map((lod) => hydrateLod(lod, classes, hydrationOptions, populationLabel)),
        indices = Array.isArray(lods[0]?.indices)
            ? lods[0].indices
            : (mesh.indices ?? []).map((group) => hydrateNode(
                "IndexGroup",
                group,
                classes,
                hydrationOptions,
                populationLabel
            )),
        vertex = lods[0]?.vertex ?? mesh.vertex;

    return hydrateNode("Mesh", {
        ...mesh,
        vertex,
        indices,
        decl: (mesh.decl ?? []).map((element) => hydrateNode(
            "VertexElement",
            element,
            classes,
            hydrationOptions,
            populationLabel
        )),
        lods,
        areas: (mesh.areas ?? []).map((area) => hydrateNode(
            "MeshArea",
            area,
            classes,
            hydrationOptions,
            populationLabel
        )),
        boneBindings: (mesh.boneBindings ?? []).map((binding) => hydrateNode(
            "BoneBinding",
            binding,
            classes,
            hydrationOptions,
            populationLabel
        )),
        morphTargets: hydrateNode("MorphTargets", {
            ...morphTargets,
            decl: (morphTargets.decl ?? []).map((element) => hydrateNode(
                "VertexElement",
                element,
                classes,
                hydrationOptions,
                populationLabel
            )),
            targets: (morphTargets.targets ?? []).map((target) => hydrateNode(
                "MorphTarget",
                target,
                classes,
                hydrationOptions,
                populationLabel
            ))
        }, classes, hydrationOptions, populationLabel),
        audioOcclusionMesh: hydrateNode(
            "AudioOcclusionMesh",
            mesh.audioOcclusionMesh ?? {
                vertices: [],
                indices: [],
                bounds: { min: [ 0, 0, 0 ], max: [ 0, 0, 0 ] }
            },
            classes,
            hydrationOptions,
            populationLabel
        )
    }, classes, hydrationOptions, populationLabel);
}

function hydrateLod(lod, classes, hydrationOptions, populationLabel)
{
    const fields = {
        ...lod,
        areas: (lod.areas ?? []).map((area) => hydrateNode(
            "LodMeshArea",
            area,
            classes,
            hydrationOptions,
            populationLabel
        )),
        morphTargets: (lod.morphTargets ?? []).map((target) => hydrateNode(
            "LodMorphTarget",
            target,
            classes,
            hydrationOptions,
            populationLabel
        ))
    };

    if (Array.isArray(lod.indices))
    {
        fields.indices = lod.indices.map((group) => hydrateNode(
            "IndexGroup",
            group,
            classes,
            hydrationOptions,
            populationLabel
        ));
    }

    return hydrateNode("MeshLod", fields, classes, hydrationOptions, populationLabel);
}

function hydrateSkeleton(skeleton, classes, hydrationOptions, populationLabel)
{
    return hydrateNode("Skeleton", {
        ...skeleton,
        boneMasks: (skeleton.boneMasks ?? []).map((mask) => hydrateNode("BoneMask", {
            ...mask,
            weights: (mask.weights ?? []).map((weight) => hydrateNode(
                "BoneWeight",
                weight,
                classes,
                hydrationOptions,
                populationLabel
            ))
        }, classes, hydrationOptions, populationLabel))
    }, classes, hydrationOptions, populationLabel);
}

function hydrateAnimation(animation, classes, hydrationOptions, populationLabel)
{
    return hydrateNode("Animation", {
        ...animation,
        channels: (animation.channels ?? []).map((channel) => hydrateNode(
            "AnimationChannel",
            channel,
            classes,
            hydrationOptions,
            populationLabel
        )),
        curves: (animation.curves ?? []).map((curve) => hydrateNode(
            "AnimationCurve",
            curve,
            classes,
            hydrationOptions,
            populationLabel
        ))
    }, classes, hydrationOptions, populationLabel);
}

function hydrateNode(type, fields, classes, hydrationOptions, populationLabel)
{
    const Class = classes?.[type];
    if (!Class)
    {
        return fields;
    }

    const instance = new Class();
    if (!instance || typeof instance.SetValues !== "function")
    {
        throw new TypeError(`${populationLabel} class population requires classes to implement SetValues(values)`);
    }

    instance.SetValues(fields, { ...hydrationOptions, skipUpdate: true, skipEvents: true });
    return instance;
}
