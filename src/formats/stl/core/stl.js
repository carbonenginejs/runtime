/**
 * STL read/write and printability inspection helpers.
 */

import {
    computeBoundsFromPositions,
    computeBoundsFromTriangles,
    generateNormals,
    isDegenerateTriangle,
    triangleNormal
} from "@carbonenginejs/core-math/mesh";
import { normalize } from "@carbonenginejs/core-math/vec3";

const
    BINARY_HEADER_BYTES = 80,
    BINARY_COUNT_BYTES = 4,
    BINARY_TRIANGLE_BYTES = 50,
    DEFAULT_SOLID_NAME = "carbonenginejs";

function makeDecoder()
{
    return new TextDecoder("utf-8");
}

function makeEncoder()
{
    return new TextEncoder();
}

function assertFiniteNumber(value, feature)
{
    if (typeof value !== "number" || !Number.isFinite(value))
    {
        throw new TypeError(`CjsStlFormat: ${feature} must contain finite numbers`);
    }
    return value;
}

function cloneVertex(vertex, scale = 1)
{
    return [
        assertFiniteNumber(vertex[0], "vertex") * scale,
        assertFiniteNumber(vertex[1], "vertex") * scale,
        assertFiniteNumber(vertex[2], "vertex") * scale
    ];
}

function sanitizeSolidName(name)
{
    const value = String(name || DEFAULT_SOLID_NAME).replace(/\s+/g, "_").replace(/[^\w.-]/g, "_");
    return value || DEFAULT_SOLID_NAME;
}

function formatNumber(value)
{
    if (!Number.isFinite(value)) return "0";
    if (Object.is(value, -0)) return "0";
    return Number.parseFloat(value.toPrecision(9)).toString();
}

function binaryBytes(input)
{
    if (input instanceof Uint8Array) return input;
    if (typeof ArrayBuffer !== "undefined" && input instanceof ArrayBuffer) return new Uint8Array(input);
    if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView(input))
    {
        return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    }
    return null;
}

function readFloat32(view, offset)
{
    return view.getFloat32(offset, true);
}

function isZeroNormal(normal)
{
    return Math.hypot(normal[0], normal[1], normal[2]) <= 1e-20;
}

function triangleWithNormal(vertices, normal)
{
    const fallback = triangleNormal(vertices[0], vertices[1], vertices[2]);
    return {
        normal: isZeroNormal(normal) ? fallback : normalize([ 0, 0, 0 ], normal),
        vertices
    };
}

function quantizeNumber(value, tolerance)
{
    if (tolerance <= 0) return formatNumber(value);
    return String(Math.round(value / tolerance));
}

function quantizeVertex(vertex, tolerance)
{
    return `${quantizeNumber(vertex[0], tolerance)},${quantizeNumber(vertex[1], tolerance)},${quantizeNumber(vertex[2], tolerance)}`;
}

function bytesPerIndex(maxIndex)
{
    return maxIndex > 65535 ? 4 : 2;
}

function addIssue(issues, key, count)
{
    if (count > 0) issues.push({ key, count });
}

function rootSource(input)
{
    return input && typeof input === "object" && typeof input.grannyFileSource === "string"
        ? input.grannyFileSource
        : null;
}

class DisjointSet
{

    constructor(size)
    {
        this.parent = new Array(size);
        for (let i = 0; i < size; i++) this.parent[i] = i;
    }

    find(value)
    {
        const parent = this.parent[value];
        if (parent === value) return value;
        this.parent[value] = this.find(parent);
        return this.parent[value];
    }

    union(a, b)
    {
        const
            ra = this.find(a),
            rb = this.find(b);
        if (ra !== rb) this.parent[rb] = ra;
    }

}

/**
 * Convert supported byte-like input into a Uint8Array.
 *
 * @param {string|Uint8Array|ArrayBuffer|DataView} input STL text or bytes.
 * @returns {Uint8Array|null} Bytes when input is byte-like.
 */
export function toBytes(input)
{
    return binaryBytes(input);
}

/**
 * Convert supported input into text.
 *
 * @param {string|Uint8Array|ArrayBuffer|DataView} input STL text or bytes.
 * @returns {string} STL text.
 */
export function toText(input)
{
    if (typeof input === "string") return input;
    const bytes = binaryBytes(input);
    if (bytes) return makeDecoder().decode(bytes);
    throw new TypeError("CjsStlFormat: input must be STL text, bytes, or shared JSON geometry");
}

/**
 * Check whether byte-like input has an exact binary STL layout.
 *
 * @param {string|Uint8Array|ArrayBuffer|DataView} input Candidate STL input.
 * @returns {boolean} True when the byte length exactly matches a binary STL.
 */
export function isBinaryStl(input)
{
    const bytes = binaryBytes(input);
    if (!bytes || bytes.byteLength < BINARY_HEADER_BYTES + BINARY_COUNT_BYTES) return false;

    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const triangleCount = view.getUint32(BINARY_HEADER_BYTES, true);
    return BINARY_HEADER_BYTES + BINARY_COUNT_BYTES + triangleCount * BINARY_TRIANGLE_BYTES === bytes.byteLength;
}

/**
 * Cheap sniff for STL-like input.
 *
 * @param {string|Uint8Array|ArrayBuffer|DataView} input Candidate STL input.
 * @returns {boolean} True when the input looks like ASCII or binary STL.
 */
export function isStl(input)
{
    if (isBinaryStl(input)) return true;
    try
    {
        const text = toText(input);
        return /^\s*solid\b/i.test(text) && /\bfacet\s+normal\b/i.test(text) && /\bvertex\b/i.test(text);
    }
    catch
    {
        return false;
    }
}

/**
 * Parse ASCII STL text into triangle records.
 *
 * @param {string} text ASCII STL text.
 * @returns {object} Parsed STL payload.
 */
export function parseAsciiStl(text)
{
    const
        lines = text.split(/\r?\n/),
        triangles = [];

    let
        name = DEFAULT_SOLID_NAME,
        currentNormal = [ 0, 0, 0 ],
        vertices = [];

    for (const rawLine of lines)
    {
        const line = rawLine.trim();
        if (!line) continue;

        const solid = /^solid(?:\s+(.+))?$/i.exec(line);
        if (solid)
        {
            name = solid[1] ? solid[1].trim() : name;
            continue;
        }

        const facet = /^facet\s+normal\s+(.+)$/i.exec(line);
        if (facet)
        {
            const values = facet[1].trim().split(/\s+/).map(Number);
            currentNormal = values.length >= 3 && values.every(Number.isFinite)
                ? [ values[0], values[1], values[2] ]
                : [ 0, 0, 0 ];
            vertices = [];
            continue;
        }

        const vertex = /^vertex\s+(.+)$/i.exec(line);
        if (vertex)
        {
            const values = vertex[1].trim().split(/\s+/).map(Number);
            if (values.length < 3 || !values.every(Number.isFinite))
            {
                throw new Error("CjsStlFormat: ASCII STL contains a malformed vertex line");
            }
            vertices.push([ values[0], values[1], values[2] ]);

            if (vertices.length === 3)
            {
                triangles.push(triangleWithNormal(vertices, currentNormal));
                vertices = [];
            }
        }
    }

    if (!triangles.length)
    {
        throw new Error("CjsStlFormat: ASCII STL contains no triangles");
    }

    return { format: "ascii", name: sanitizeSolidName(name), triangles };
}

/**
 * Parse binary STL bytes into triangle records.
 *
 * @param {Uint8Array} bytes Binary STL bytes.
 * @returns {object} Parsed STL payload.
 */
export function parseBinaryStl(bytes)
{
    if (!isBinaryStl(bytes))
    {
        throw new Error("CjsStlFormat: binary STL byte length does not match its triangle count");
    }

    const
        view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength),
        header = makeDecoder().decode(bytes.subarray(0, BINARY_HEADER_BYTES)).replace(/\0+$/g, "").trim(),
        count = view.getUint32(BINARY_HEADER_BYTES, true),
        triangles = [];

    let offset = BINARY_HEADER_BYTES + BINARY_COUNT_BYTES;
    for (let i = 0; i < count; i++)
    {
        const normal = [
            readFloat32(view, offset),
            readFloat32(view, offset + 4),
            readFloat32(view, offset + 8)
        ];

        const vertices = [];
        for (let v = 0; v < 3; v++)
        {
            const vo = offset + 12 + v * 12;
            vertices.push([
                readFloat32(view, vo),
                readFloat32(view, vo + 4),
                readFloat32(view, vo + 8)
            ]);
        }

        triangles.push(triangleWithNormal(vertices, normal));
        offset += BINARY_TRIANGLE_BYTES;
    }

    if (!triangles.length)
    {
        throw new Error("CjsStlFormat: binary STL contains no triangles");
    }

    return { format: "binary", name: sanitizeSolidName(header || DEFAULT_SOLID_NAME), triangles };
}

/**
 * Parse STL text or bytes.
 *
 * @param {string|Uint8Array|ArrayBuffer|DataView} input STL text or bytes.
 * @returns {object} Parsed STL payload.
 */
export function parseStl(input)
{
    const bytes = binaryBytes(input);
    if (bytes && isBinaryStl(bytes)) return parseBinaryStl(bytes);
    return parseAsciiStl(toText(input));
}

/**
 * Build the shared CarbonEngineJS JSON mesh schema from STL triangles.
 *
 * @param {object[]} triangles Triangle records.
 * @param {object} values Normalized format values.
 * @param {object} [source] Parsed STL source metadata.
 * @returns {object} Shared JSON graph.
 */
export function trianglesToJson(triangles, values, source = {})
{
    const
        positions = [],
        normals = [],
        faces = [],
        vertexByKey = new Map();

    const addVertex = (vertex, normal) =>
    {
        if (values.weldVertices)
        {
            const key = quantizeVertex(vertex, values.weldTolerance);
            const existing = vertexByKey.get(key);
            if (existing !== undefined) return existing;
            const next = positions.length / 3;
            vertexByKey.set(key, next);
            positions.push(vertex[0], vertex[1], vertex[2]);
            return next;
        }

        const next = positions.length / 3;
        positions.push(vertex[0], vertex[1], vertex[2]);
        normals.push(normal[0], normal[1], normal[2]);
        return next;
    };

    for (const triangle of triangles)
    {
        const vertices = triangle.vertices.map(vertex => cloneVertex(vertex));
        const normal = triangle.normal && !isZeroNormal(triangle.normal)
            ? normalize([ 0, 0, 0 ], triangle.normal)
            : triangleNormal(vertices[0], vertices[1], vertices[2]);

        for (const vertex of vertices)
        {
            faces.push(addVertex(vertex, normal));
        }
    }

    const resolvedNormals = values.weldVertices ? generateNormals(positions, faces) : normals;
    const bounds = computeBoundsFromPositions(positions);

    return {
        grannyFileFormatRevision: 0,
        grannyFileSource: values.source,
        meshes: [
            {
                name: source.name || values.solidName,
                morphTargets: [],
                minBounds: bounds.minBounds,
                maxBounds: bounds.maxBounds,
                boneBindings: [],
                vertex: {
                    position: positions,
                    blendIndice: [],
                    tangent: [],
                    normal: resolvedNormals,
                    texcoord0: [],
                    texcoord1: [],
                    binormal: [],
                    blendWeight: []
                },
                indices: [
                    {
                        name: "default",
                        bytesPerIndex: bytesPerIndex(Math.max(0, positions.length / 3 - 1)),
                        faces
                    }
                ]
            }
        ],
        models: [],
        animations: []
    };
}

/**
 * Gather triangle records from the shared JSON geometry schema.
 *
 * @param {object} input Shared JSON graph or mesh record.
 * @param {object} values Normalized format values.
 * @returns {object[]} Triangle records.
 */
export function jsonToTriangles(input, values)
{
    const
        root = input && input.meshes ? input : { meshes: [ input ] },
        triangles = [];

    if (!root || !Array.isArray(root.meshes))
    {
        throw new TypeError("CjsStlFormat: write input must be a shared JSON root or mesh");
    }

    for (const [ meshIndex, mesh ] of root.meshes.entries())
    {
        const
            vertex = mesh && mesh.vertex,
            positions = vertex && vertex.position,
            normals = vertex && vertex.normal;

        if (!positions || positions.length % 3 !== 0)
        {
            throw new Error(`CjsStlFormat: mesh #${meshIndex} must provide flat vertex.position triples`);
        }

        for (const group of mesh.indices || [])
        {
            const faces = group && group.faces;
            if (!faces) continue;
            if (faces.length % 3 !== 0)
            {
                throw new Error(`CjsStlFormat: mesh #${meshIndex} index group ${JSON.stringify(group.name || "default")} is not triangular`);
            }

            for (let i = 0; i < faces.length; i += 3)
            {
                const
                    ia = faces[i] * 3,
                    ib = faces[i + 1] * 3,
                    ic = faces[i + 2] * 3;

                if (ia < 0 || ib < 0 || ic < 0 ||
                    ia + 2 >= positions.length || ib + 2 >= positions.length || ic + 2 >= positions.length)
                {
                    throw new Error(`CjsStlFormat: mesh #${meshIndex} contains an out-of-range triangle index`);
                }

                const vertices = [
                    cloneVertex([ positions[ia], positions[ia + 1], positions[ia + 2] ], values.scale),
                    cloneVertex([ positions[ib], positions[ib + 1], positions[ib + 2] ], values.scale),
                    cloneVertex([ positions[ic], positions[ic + 1], positions[ic + 2] ], values.scale)
                ];

                if (values.skipDegenerate && isDegenerateTriangle(vertices[0], vertices[1], vertices[2]))
                {
                    continue;
                }

                let normal = triangleNormal(vertices[0], vertices[1], vertices[2]);
                if (!values.recalculateNormals && normals && normals.length >= positions.length)
                {
                    const averaged = normalize([ 0, 0, 0 ], [
                        normals[ia] + normals[ib] + normals[ic],
                        normals[ia + 1] + normals[ib + 1] + normals[ic + 1],
                        normals[ia + 2] + normals[ib + 2] + normals[ic + 2]
                    ]);
                    if (!isZeroNormal(averaged)) normal = averaged;
                }

                triangles.push({ normal, vertices });
            }
        }
    }

    return triangles;
}

/**
 * Convert STL or JSON input into triangle records for inspection.
 *
 * @param {any} input STL text/bytes or shared JSON.
 * @param {object} values Normalized format values.
 * @returns {object} Inspection source and triangles.
 */
export function trianglesFromInput(input, values)
{
    if (input && typeof input === "object" && (input.meshes || input.vertex))
    {
        return {
            format: "json",
            source: rootSource(input) || values.source,
            triangles: jsonToTriangles(input, { ...values, skipDegenerate: false })
        };
    }

    const bytes = binaryBytes(input);
    const parsed = parseStl(input);
    return {
        format: parsed.format,
        name: parsed.name,
        byteLength: bytes ? bytes.byteLength : typeof input === "string" ? makeEncoder().encode(input).byteLength : 0,
        source: values.source,
        triangles: parsed.triangles
    };
}

/**
 * Write triangle records as ASCII STL text.
 *
 * @param {object[]} triangles Triangle records.
 * @param {string} solidName STL solid name.
 * @returns {string} ASCII STL text.
 */
export function writeAsciiStl(triangles, solidName)
{
    const lines = [ `solid ${sanitizeSolidName(solidName)}` ];
    for (const triangle of triangles)
    {
        const normal = triangle.normal && !isZeroNormal(triangle.normal)
            ? normalize([ 0, 0, 0 ], triangle.normal)
            : triangleNormal(triangle.vertices[0], triangle.vertices[1], triangle.vertices[2]);

        lines.push(`  facet normal ${formatNumber(normal[0])} ${formatNumber(normal[1])} ${formatNumber(normal[2])}`);
        lines.push("    outer loop");
        for (const vertex of triangle.vertices)
        {
            lines.push(`      vertex ${formatNumber(vertex[0])} ${formatNumber(vertex[1])} ${formatNumber(vertex[2])}`);
        }
        lines.push("    endloop");
        lines.push("  endfacet");
    }
    lines.push(`endsolid ${sanitizeSolidName(solidName)}`);
    return `${lines.join("\n")}\n`;
}

/**
 * Write triangle records as binary STL bytes.
 *
 * @param {object[]} triangles Triangle records.
 * @param {string} solidName STL solid name.
 * @returns {Uint8Array} Binary STL bytes.
 */
export function writeBinaryStl(triangles, solidName)
{
    const
        bytes = new Uint8Array(BINARY_HEADER_BYTES + BINARY_COUNT_BYTES + triangles.length * BINARY_TRIANGLE_BYTES),
        view = new DataView(bytes.buffer),
        header = makeEncoder().encode(`CarbonEngineJS ${sanitizeSolidName(solidName)}`);

    bytes.set(header.subarray(0, BINARY_HEADER_BYTES), 0);
    view.setUint32(BINARY_HEADER_BYTES, triangles.length, true);

    let offset = BINARY_HEADER_BYTES + BINARY_COUNT_BYTES;
    for (const triangle of triangles)
    {
        const normal = triangle.normal && !isZeroNormal(triangle.normal)
            ? normalize([ 0, 0, 0 ], triangle.normal)
            : triangleNormal(triangle.vertices[0], triangle.vertices[1], triangle.vertices[2]);

        for (let c = 0; c < 3; c++) view.setFloat32(offset + c * 4, normal[c], true);

        for (let v = 0; v < 3; v++)
        {
            const vertex = triangle.vertices[v];
            for (let c = 0; c < 3; c++)
            {
                view.setFloat32(offset + 12 + v * 12 + c * 4, vertex[c], true);
            }
        }

        view.setUint16(offset + 48, 0, true);
        offset += BINARY_TRIANGLE_BYTES;
    }

    return bytes;
}

/**
 * Inspect triangle topology for common 3D-printing blockers.
 *
 * @param {object[]} triangles Triangle records.
 * @param {object} values Normalized format values.
 * @param {object} [source] Source metadata.
 * @returns {object} Printability report.
 */
export function inspectTriangles(triangles, values, source = {})
{
    const
        vertices = new Map(),
        vertexKeys = [],
        edges = new Map(),
        dsu = new DisjointSet(triangles.length),
        issues = [];

    let
        degenerateTriangleCount = 0,
        validTriangleCount = 0;

    const vertexId = vertex =>
    {
        const key = quantizeVertex(vertex, values.weldTolerance);
        const existing = vertices.get(key);
        if (existing !== undefined) return existing;
        const next = vertexKeys.length;
        vertices.set(key, next);
        vertexKeys.push(key);
        return next;
    };

    const addEdge = (triangleIndex, a, b) =>
    {
        const
            ka = vertexKeys[a],
            kb = vertexKeys[b],
            key = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`,
            sign = ka < kb ? 1 : -1,
            entry = edges.get(key) || [];

        entry.push({ triangleIndex, sign });
        edges.set(key, entry);
    };

    for (let triangleIndex = 0; triangleIndex < triangles.length; triangleIndex++)
    {
        const triangle = triangles[triangleIndex];
        if (isDegenerateTriangle(triangle.vertices[0], triangle.vertices[1], triangle.vertices[2], values.weldTolerance))
        {
            degenerateTriangleCount++;
            continue;
        }

        const ids = triangle.vertices.map(vertexId);
        if (new Set(ids).size !== 3)
        {
            degenerateTriangleCount++;
            continue;
        }

        validTriangleCount++;
        addEdge(triangleIndex, ids[0], ids[1]);
        addEdge(triangleIndex, ids[1], ids[2]);
        addEdge(triangleIndex, ids[2], ids[0]);
    }

    let
        openEdgeCount = 0,
        nonManifoldEdgeCount = 0,
        inconsistentWindingEdgeCount = 0;

    for (const occurrences of edges.values())
    {
        if (occurrences.length === 1)
        {
            openEdgeCount++;
            continue;
        }
        if (occurrences.length > 2)
        {
            nonManifoldEdgeCount++;
        }
        if (occurrences.length === 2 && occurrences[0].sign === occurrences[1].sign)
        {
            inconsistentWindingEdgeCount++;
        }

        for (let i = 1; i < occurrences.length; i++)
        {
            dsu.union(occurrences[0].triangleIndex, occurrences[i].triangleIndex);
        }
    }

    const shells = new Set();
    for (const occurrences of edges.values())
    {
        for (const occurrence of occurrences)
        {
            shells.add(dsu.find(occurrence.triangleIndex));
        }
    }

    addIssue(issues, "no_triangles", triangles.length === 0 ? 1 : 0);
    addIssue(issues, "degenerate_triangles", degenerateTriangleCount);
    addIssue(issues, "open_edges", openEdgeCount);
    addIssue(issues, "non_manifold_edges", nonManifoldEdgeCount);
    addIssue(issues, "inconsistent_winding_edges", inconsistentWindingEdgeCount);

    const bounds = computeBoundsFromTriangles(triangles);
    const printable = triangles.length > 0 &&
        degenerateTriangleCount === 0 &&
        openEdgeCount === 0 &&
        nonManifoldEdgeCount === 0 &&
        inconsistentWindingEdgeCount === 0;

    return {
        format: source.format || "stl",
        name: source.name || "",
        byteLength: source.byteLength || 0,
        source: source.source || values.source,
        triangleCount: triangles.length,
        validTriangleCount,
        vertexCount: vertices.size,
        edgeCount: edges.size,
        shellCount: validTriangleCount > 0 ? shells.size : 0,
        openEdgeCount,
        nonManifoldEdgeCount,
        inconsistentWindingEdgeCount,
        degenerateTriangleCount,
        bounds: {
            min: bounds.minBounds,
            max: bounds.maxBounds
        },
        printable,
        issues
    };
}
