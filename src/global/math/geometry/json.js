import { toArray } from "../utils.js";
import { calculateNormals, calculateTangents } from "../vertex.js";


function isAreaLike(value)
{
    if (!value) return false;
    if (Array.isArray(value)) return !!value.length && typeof value[0] === "object" && value[0] !== null && "start" in value[0];
    return typeof value === "object" && "start" in value;
}


/**
 * Converts index and vertex buffer data to geometry json
 * @param {Array|TypedArray} indices
 * @param {Array|TypedArray} positions
 * @param {Array|TypedArray} uvs
 * @param {Array|TypedArray|Array|Object} [normals]
 * @param {Array|Object} [areas]
 * @param {Array|TypedArray} [tangents]
 * @throw If required data is not provided
 * @returns {Object}
 */
export function toJSON(indices, positions, uvs, normals, areas, tangents)
{
    if (!indices || !positions || !uvs || !indices.length || !positions.length || !uvs.length)
    {
        throw new Error("Invalid inputs");
    }

    if (isAreaLike(normals))
    {
        const temp = areas;
        areas = normals;
        normals = temp;
    }

    const vertexCount = positions.length / 3;
    if (!Number.isInteger(vertexCount) ||
        indices.length % 3 !== 0 ||
        uvs.length !== vertexCount * 2)
    {
        throw new Error("Invalid geometry channel lengths");
    }

    for (let i = 0; i < indices.length; i++)
    {
        if (!Number.isInteger(indices[i]) || indices[i] < 0 || indices[i] >= vertexCount)
        {
            throw new Error(`Invalid vertex index at ${i}`);
        }
    }

    if (normals && normals.length && normals.length !== positions.length)
    {
        throw new Error("Invalid normal channel length");
    }

    if (tangents && tangents.length &&
        tangents.length !== vertexCount * 3 &&
        tangents.length !== vertexCount * 4)
    {
        throw new Error("Invalid tangent channel length");
    }

    areas = toArray(areas && areas.length !== 0 ? areas : { start: 0, count: indices.length });
    for (const area of areas)
    {
        if (!area ||
            !Number.isInteger(area.start) ||
            !Number.isInteger(area.count) ||
            area.start < 0 ||
            area.count < 0 ||
            area.start % 3 !== 0 ||
            area.count % 3 !== 0 ||
            area.start + area.count > indices.length)
        {
            throw new Error("Invalid geometry area");
        }
    }

    if (!normals || !normals.length)
    {
        normals = calculateNormals(indices, positions);
    }

    if (!tangents || !tangents.length)
    {
        tangents = calculateTangents(indices, positions, uvs, areas, normals);
    }

    return {
        meshes: [ {
            name: "",
            vertex: {
                position: positions,
                texcoord0: uvs,
                tangent: tangents,
                normal: normals,
                texcoord1: null,
                binormal: null,
                blendIndice: null,
                blendWeight: null
            },
            indices: areas.map(area =>
            {
                const faces = indices.slice(area.start, area.start + area.count);
                const requires32Bit = faces.some(index => index > 0xffff);
                const bytesPerIndex = area.bytesPerIndex ?? (requires32Bit ? 4 : 2);
                if ((bytesPerIndex !== 2 && bytesPerIndex !== 4) ||
                    (bytesPerIndex === 2 && requires32Bit))
                {
                    throw new Error("Invalid bytes per index");
                }
                return {
                    bytesPerIndex,
                    start: area.start,
                    count: area.count,
                    faces
                };
            })
        } ]
    };
}


/**
 * Creates a mesh container from geometry json
 * @param {Object} tw2
 * @param {Object} json
 * @param {String} [name=""]
 * @param {Object} [autoCreateMeshAreas={}]
 * @returns {Object}
 */
export function toContainer(tw2, json, name = "", autoCreateMeshAreas = {})
{
    const
        container = new tw2.EveChildMesh(),
        mesh = container.mesh = new tw2.Tw2Mesh(),
        res = mesh.geometryResource = new tw2.Tw2GeometryRes();

    container.name = name;
    res.UpdateFromJSON(json);
    res.OnPrepared();

    Object
        .keys(autoCreateMeshAreas)
        .forEach(areaName =>
        {
            const effect = autoCreateMeshAreas[areaName] || {};
            for (let m = 0; m < res.meshes.length; m++)
            {
                for (let a = 0; a < res.meshes[m].areas.length; a++)
                {
                    const meshArea = new tw2.Tw2MeshArea();
                    meshArea.meshIndex = m;
                    meshArea.index = a;
                    meshArea.effect = tw2.Tw2Effect.from(effect);
                    mesh[areaName].push(meshArea);
                }
            }
        });

    return container;
}
