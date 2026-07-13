/**
 * JSON hydration helpers for the shared CarbonEngineJS mesh schema.
 */

/**
 * Node keys accepted by CjsObjFormat's `classes` map.
 */
export const CLASS_KEYS = Object.freeze([ "Root", "Mesh", "IndexGroup" ]);

/**
 * Instantiate and populate a node class, or return the plain props unchanged.
 *
 * @param {object} classes Opt-in node class map.
 * @param {string} key Node key to look up in `classes`.
 * @param {object} props Fields to populate onto the instance.
 * @returns {object} A populated class instance, or `props`.
 */
function build(classes, key, props, hydrationOptions = {})
{
    const Ctor = classes[key];
    return Ctor ? populate(new Ctor(), props, hydrationOptions) : props;
}

function populate(instance, props, hydrationOptions = {})
{
    if (!instance || typeof instance.SetValues !== "function")
    {
        throw new TypeError("CjsObjFormat class population requires classes to implement SetValues(values)");
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
            indices: mesh.indices.map(group => build(classes, "IndexGroup", {
                name: group.name,
                bytesPerIndex: group.bytesPerIndex,
                faces: group.faces
            }, hydrationOptions))
        }, hydrationOptions)),
        models: root.models,
        animations: root.animations
    }, hydrationOptions);
}
