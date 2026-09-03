// Which of a hull's triangles a decal covers.
//
// Carbon does NOT clip geometry to build a decal. It SELECTS whole triangles -
// a broad-phase slab test against the decal's world box, then a
// separating-axis test in the decal's own space - and keeps their original
// indices (`EveSpaceObjectDecal.cpp:592-809`). The decal therefore shares the
// hull's vertex buffer and owns nothing but a filtered index buffer, and no
// vertex is ever created. Anything written elsewhere about clipping is wrong.
//
// TWO DELIBERATE DIFFERENCES FROM CARBON, both representational:
//
//   1. Carbon walks its GPU vertex buffer at `index * bytesPerVertex`, because
//      that is the only form it has. A decoded CMF payload holds separate
//      channels, so positions are read from the position channel directly.
//      Same triangles either way; this simply skips an interleave.
//
//   2. Carbon allocates the result into a shared GPU index buffer as its last
//      step. That is the engine's job here, so this returns CPU indices and
//      leaves the buffer to whoever owns the device.
//
// One Carbon behaviour that is NOT a difference and must be kept: the output is
// always 32-bit. Carbon collects into a `vector<uint32_t>` and allocates stride
// 4 even when the source mesh indexes at 16 bits, so a decal on a small mesh
// still produces a wide buffer.
import { mat4, tri3, vec3 } from "#math";


/** Carbon's unit decal volume, before the decal matrix places it. */
const UNIT_MIN = Object.freeze([ -1, -1, -1 ]);

/** @see UNIT_MIN */
const UNIT_MAX = Object.freeze([ 1, 1, 1 ]);


/**
 * The world-space bounds of a decal's unit volume.
 *
 * Carbon calls `BoundingBoxTransform` on the unit box, which transforms the
 * eight corners and takes their extent - not the box's own min and max through
 * the matrix, which would be wrong under rotation.
 *
 * The corner transform goes through `vec3.transformMat4`, which IS Carbon's
 * `TransformCoord` on the shared byte layout. Row-vector Carbon and
 * column-vector gl-matrix agree for a single matrix and disagree for every
 * composition, so the one place worth being explicit is which of the two this
 * is. See the carbon-math-conventions skill.
 *
 * The `[-1, 1]` box is not arbitrary: it is the same box the decal's own
 * projection uses, dotting the position with rows 1 and 2 of the inverse decal
 * matrix. /docs/research/quad-family-blender-port.md carries the measurement.
 *
 * @param {mat4} decalMatrix Places the unit volume in the hull's space.
 * @returns {{min: number[], max: number[]}} Axis-aligned world bounds.
 */
export function DecalWorldBounds(decalMatrix)
{
    const min = [ Infinity, Infinity, Infinity ];
    const max = [ -Infinity, -Infinity, -Infinity ];
    const corner = vec3.create();

    for (let index = 0; index < 8; index++)
    {
        vec3.set(
            corner,
            (index & 1) ? UNIT_MAX[0] : UNIT_MIN[0],
            (index & 2) ? UNIT_MAX[1] : UNIT_MIN[1],
            (index & 4) ? UNIT_MAX[2] : UNIT_MIN[2]
        );
        vec3.transformMat4(corner, corner, decalMatrix);

        for (let axis = 0; axis < 3; axis++)
        {
            if (corner[axis] < min[axis]) min[axis] = corner[axis];
            if (corner[axis] > max[axis]) max[axis] = corner[axis];
        }
    }

    return { min, max };
}

/**
 * How many components the position channel carries per vertex.
 *
 * Asked of the declaration rather than inferred from the channel length: a
 * mesh whose trailing vertices are unindexed would infer the wrong stride, and
 * a wrong stride reads a decal's triangles from the wrong vertices entirely.
 *
 * @param {Array<object>} decl Vertex declaration.
 * @returns {number|null} Component count, or null when the declaration has no position.
 */
function PositionComponents(decl)
{
    for (const element of decl ?? [])
    {
        if (element?.usage === "Position" && (element.usageIndex ?? 0) === 0)
        {
            return element.elementCount ?? null;
        }
    }

    return null;
}

/**
 * The indices of one LOD, concatenated in group order.
 *
 * Group order is the order the packer writes them (`pack.js` packIndexBuffer),
 * so a start index computed here addresses the same buffer the device gets.
 *
 * @param {object} lod Decoded LOD.
 * @returns {number[]} Flat index list.
 */
function lodIndices(lod)
{
    const flat = [];

    for (const group of lod?.indices ?? [])
    {
        for (const index of group.faces ?? []) flat.push(index);
    }

    return flat;
}

/**
 * Selects the triangles of one LOD that a decal covers.
 *
 * @param {object} lod Decoded LOD carrying `indices` and `vertex`.
 * @param {mat4} decalMatrix Places the unit decal volume.
 * @param {mat4} inverseDecalMatrix Its inverse, for the oriented test.
 * @param {object} [bounds] Precomputed world bounds, to avoid redoing them per LOD.
 * @param {Array<object>} [decl] Vertex declaration, which states the position
 *   component count. Three is assumed only when no declaration is given.
 * @returns {number[]} Selected indices, three per covered triangle.
 */
export function SelectDecalTriangles(lod, decalMatrix, inverseDecalMatrix, bounds = null, decl = null)
{
    const positions = lod?.vertex?.position;

    // No positions is not a failure. Carbon returns from a dozen conditions in
    // this function and commits no batch, and a decal on geometry that has not
    // arrived is the ordinary first-frame case rather than a broken asset.
    if (!Array.isArray(positions) || !positions.length) return [];

    const indices = lodIndices(lod);

    if (indices.length < 3) return [];

    const { min, max } = bounds ?? DecalWorldBounds(decalMatrix);
    const triangle = tri3.create();
    const selected = [];

    const stride = PositionComponents(decl) ?? 3;

    for (let at = 0; at + 2 < indices.length; at += 3)
    {
        const a = indices[at] * stride;
        const b = indices[at + 1] * stride;
        const c = indices[at + 2] * stride;

        tri3.fromVertices(
            triangle,
            [ positions[a], positions[a + 1], positions[a + 2] ],
            [ positions[b], positions[b + 1], positions[b + 2] ],
            [ positions[c], positions[c + 1], positions[c + 2] ]
        );

        if (!tri3.intersectsBounds(triangle, min, max)) continue;
        if (!tri3.intersectsOrientedBox(triangle, inverseDecalMatrix)) continue;

        selected.push(indices[at], indices[at + 1], indices[at + 2]);
    }

    return selected;
}

/**
 * Builds the decal geometry for every LOD of a mesh.
 *
 * The shape mirrors Carbon's `MeshDecalData`: one `{startIndex,
 * primitiveCount}` per LOD addressing a single concatenated index buffer, so a
 * draw picks its LOD by offset rather than by owning a buffer each.
 *
 * @param {object} mesh Decoded mesh carrying `lods`.
 * @param {mat4} decalMatrix Places the unit decal volume.
 * @param {mat4} inverseDecalMatrix Its inverse.
 * @returns {{lods: Array<{startIndex: number, primitiveCount: number}>, indices: Uint32Array}}
 */
export function BuildDecalGeometry(mesh, decalMatrix, inverseDecalMatrix)
{
    const bounds = DecalWorldBounds(decalMatrix);

    // The declaration belongs to the MESH, not a LOD: a LOD varies which
    // triangles it draws, not what a vertex is.
    const decl = mesh?.decl ?? mesh?.vertexElements ?? null;
    const lods = [];
    const all = [];

    for (const lod of mesh?.lods ?? [])
    {
        const selected = SelectDecalTriangles(lod, decalMatrix, inverseDecalMatrix, bounds, decl);

        // The start index is recorded even for a LOD that selected nothing, so
        // a zero primitive count is what says "this LOD is not covered" -
        // exactly as Carbon records it, and the reason GetBatches tests the
        // count rather than the buffer.
        lods.push({ startIndex: all.length, primitiveCount: selected.length / 3 });

        for (const index of selected) all.push(index);
    }

    return { lods, indices: new Uint32Array(all) };
}

/**
 * Finds an already-built decal geometry for the same volume.
 *
 * Carbon caches these on the MESH, keyed by the inverse decal matrix
 * (`EveSpaceObjectDecal.cpp:620-631`), so two decals occupying the same volume
 * select the same triangles once. A hull carrying eleven decals is the ordinary
 * case, and the selection walks every triangle of every LOD.
 *
 * @param {Array<object>} cached Existing entries.
 * @param {mat4} inverseDecalMatrix Volume to match.
 * @returns {object|null} The matching entry, or null.
 */
export function FindCachedDecalGeometry(cached, inverseDecalMatrix)
{
    for (const entry of cached ?? [])
    {
        if (entry?.inverseDecalMatrix && mat4.exactEquals(entry.inverseDecalMatrix, inverseDecalMatrix))
        {
            return entry;
        }
    }

    return null;
}

/**
 * Builds decal geometry from index lists the SOF already computed.
 *
 * THIS IS THE PATH A SHIP TAKES. Every decal on a shipped hull arrives with
 * `staticIndexBuffers` populated - all eleven of af1_t1's do, five to seven
 * groups each - and Carbon checks for them FIRST, falling back to triangle
 * selection only behind the `g_buildDecalBuffers` global
 * (`EveSpaceObjectDecal.cpp:196-207`). Selection is for a decal placed at
 * runtime; this is for one that shipped.
 *
 * Two details are Carbon's and are easy to get wrong:
 *
 *   - The lists are indexed by the LOD's ORIGINAL index, not by its position in
 *     the mesh's LOD list. LOD generation can drop parts of a model, so the two
 *     diverge.
 *   - An out-of-range original index STOPS the loop rather than skipping that
 *     LOD. Carbon's own comment explains why: precomputed decal LODs omit any
 *     LOD whose index buffer came out empty, so the absence marks the end of
 *     the precomputed set rather than a hole in it.
 *
 * @param {object} mesh Decoded mesh carrying `lods`.
 * @param {Array<Array<number>>} staticIndexBuffers Per-LOD index lists.
 * @returns {{lods: Array<{startIndex: number, primitiveCount: number}>, indices: Uint32Array}}
 */
export function BuildStaticDecalGeometry(mesh, staticIndexBuffers)
{
    const buffers = staticIndexBuffers ?? [];
    const lods = [];
    const all = [];

    let position = 0;

    for (const lod of mesh?.lods ?? [])
    {
        // A decoded CMF payload carries its LODs as authored, so the position
        // IS the original index unless something upstream says otherwise.
        const originalIndex = lod?.originalLodIndex ?? position;

        if (originalIndex >= buffers.length) break;

        const buffer = buffers[originalIndex] ?? [];

        lods.push({ startIndex: all.length, primitiveCount: Math.trunc(buffer.length / 3) });

        for (const index of buffer) all.push(index);

        position += 1;
    }

    return { lods, indices: new Uint32Array(all) };
}
