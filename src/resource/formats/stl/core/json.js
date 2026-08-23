/**
 * JSON hydration helpers for the shared CarbonEngineJS mesh schema.
 */

export const CLASS_KEYS = Object.freeze([ "Root", "Mesh", "IndexGroup" ]);

function build(classes, key, props, hydrationOptions = {})
{
    const Ctor = classes[key];
    return Ctor ? populate(new Ctor(), props, hydrationOptions) : props;
}

function populate(instance, props, hydrationOptions = {})
{
    if (!instance || typeof instance.SetValues !== "function")
    {
        throw new TypeError("CjsStlFormat class population requires classes to implement SetValues(values)");
    }
    instance.SetValues(props, { ...hydrationOptions, skipUpdate: true, skipEvents: true });
    return instance;
}

/**
 * Hydrate the plain shared JSON schema with caller-supplied classes.
 *
 * @param {object} root Plain JSON graph.
 * @param {object} [options] Hydration options.
 * @param {object} [options.classes] Node constructor map.
 * @returns {object} Hydrated graph.
 */
export function hydrateJson(root, { classes = {}, ...hydrationOptions } = {})
{
    return build(classes, "Root", {
        grannyFileFormatRevision: root.grannyFileFormatRevision,
        grannyFileSource: root.grannyFileSource,
        meshes: root.meshes.map(mesh => build(classes, "Mesh", {
            name: mesh.name,
            morphTargets: mesh.morphTargets,
            minBounds: mesh.minBounds,
            maxBounds: mesh.maxBounds,
            boneBindings: mesh.boneBindings,
            vertex: mesh.vertex,
            indices: mesh.indices.map(group => build(classes, "IndexGroup", group, hydrationOptions))
        }, hydrationOptions)),
        models: root.models,
        animations: root.animations
    }, hydrationOptions);
}
