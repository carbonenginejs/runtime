/*
 * Not Carbon: the `meshIndex` and `lodIndex` read options (operator,
 * 2026-10-25). Carbon's readers publish every mesh and LOD, and a Tr2Mesh picks
 * one by `meshIndex` after the load; these let a standalone reader caller ask
 * for less. Null, the default, keeps everything, and 0 is an index, not "unset".
 */

/** The threshold Carbon requires on a mesh's first LOD. */
const FIRST_LOD_THRESHOLD = 0xffffffff;

/** Mesh fields that repeat the first LOD's decoded data. */
const FIRST_LOD_FIELDS = [ "vertex", "indices", "indexBuffer" ];

/**
 * Validates a `meshIndex` or `lodIndex` option value.
 *
 * @param {*} value Requested index; null or undefined keeps everything.
 * @param {string} name Option name, for the error.
 * @returns {number|null} The index, or null.
 * @throws {TypeError} When the value is neither nullish nor a non-negative integer.
 */
export function normalizeSelectIndex(value, name)
{
    if (value === null || value === undefined) return null;
    if (!Number.isInteger(value) || value < 0)
    {
        throw new TypeError(`${name} must be null or a non-negative integer`);
    }
    return value;
}

/**
 * Keeps one mesh of a CMF graph, one LOD of each mesh, or both. The graph is
 * not changed: the result is a shallow copy sharing the kept meshes' data.
 * Skeletons and animations are kept whole, so `mesh.skeleton` stays valid.
 *
 * A kept LOD becomes its mesh's first: its threshold becomes the 0xffffffff
 * Carbon requires there, and the mesh's copies of first-LOD data point at it.
 *
 * @param {import("./helpers.js").CmfGraph} graph CMF graph.
 * @param {number|null} meshIndex Mesh to keep, or null for all.
 * @param {number|null} lodIndex LOD to keep in each kept mesh, or null for all.
 * @returns {import("./helpers.js").CmfGraph} The graph, or its selected copy.
 * @throws {RangeError} When the graph has no such mesh, or a kept mesh no such LOD.
 */
export function selectCmfMeshes(graph, meshIndex, lodIndex)
{
    if (meshIndex === null && lodIndex === null) return graph;

    if (meshIndex !== null && meshIndex >= graph.meshes.length)
    {
        throw new RangeError(`meshIndex ${meshIndex} is out of range: the geometry has ${graph.meshes.length} meshes`);
    }

    const meshes = meshIndex === null ? graph.meshes : [ graph.meshes[meshIndex] ];
    return {
        ...graph,
        meshes: lodIndex === null ? meshes : meshes.map((mesh) => selectCmfLod(mesh, lodIndex))
    };
}

/**
 * Keeps one LOD of a CMF mesh.
 *
 * @param {import("./helpers.js").CmfMesh} mesh CMF mesh.
 * @param {number} lodIndex LOD to keep.
 * @returns {import("./helpers.js").CmfMesh} A shallow copy holding that LOD alone.
 * @throws {RangeError} When the mesh has no such LOD.
 */
function selectCmfLod(mesh, lodIndex)
{
    if (lodIndex >= mesh.lods.length)
    {
        throw new RangeError(`lodIndex ${lodIndex} is out of range: mesh ${JSON.stringify(mesh.name)} has ${mesh.lods.length} LODs`);
    }

    const lod = { ...mesh.lods[lodIndex], threshold: FIRST_LOD_THRESHOLD };
    const selected = { ...mesh, lods: [ lod ] };
    for (const field of FIRST_LOD_FIELDS)
    {
        if (field in lod) selected[field] = lod[field];
    }
    return selected;
}
