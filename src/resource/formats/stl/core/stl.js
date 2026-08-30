import { assertFiniteNumber } from "#utils/validation";
import { asUint8Array } from "#utils/bytes";

/**
 * STL read/write and printability inspection helpers.
 */

import {
    computeBoundsFromPositions,
    computeBoundsFromTriangles,
    generateNormals,
    isDegenerateTriangle,
    triangleNormal
} from "#math/mesh";
import { normalize } from "#math/vec3";

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

/**
 * Validate one shared-geometry triangle index before converting it to a byte
 * offset. Fractional, unsafe, negative, and out-of-range values are rejected
 * with the mesh and index-group context retained.
 *
 * @param {*} value Candidate vertex index.
 * @param {number} vertexCount Number of position triples in the mesh.
 * @param {number} meshIndex Zero-based mesh index in the shared root.
 * @param {string} groupName Source index-group name.
 * @returns {number} Valid non-negative vertex index.
 * @throws {RangeError} If the value cannot address a complete mesh vertex.
 */
function assertTriangleIndex(value, vertexCount, meshIndex, groupName)
{
    if (!Number.isSafeInteger(value) || value < 0 || value >= vertexCount)
    {
        throw new RangeError(
            `CjsStlFormat: mesh #${meshIndex} index group ${JSON.stringify(groupName)} ` +
            `contains invalid vertex index ${String(value)} for ${vertexCount} vertices`
        );
    }
    return value;
}

function cloneVertex(vertex, scale = 1)
{
    const result = [];
    for (let component = 0; component < 3; component++)
    {
        const value = assertFiniteNumber(vertex[component], "vertex") * scale;
        result.push(assertFiniteNumber(value, "scaled vertex"));
    }
    return result;
}

function sanitizeSolidName(name)
{
    const value = String(name || DEFAULT_SOLID_NAME).replace(/\s+/g, "_").replace(/[^\w.-]/g, "_");
    return value || DEFAULT_SOLID_NAME;
}

/**
 * Recover the caller's solid name from this writer's binary provenance header
 * while retaining compatibility with arbitrary third-party STL headers.
 *
 * @param {string} header Decoded and null-trimmed 80-byte binary STL header.
 * @returns {string} Sanitized shared-mesh name.
 */
function readBinarySolidName(header)
{
    return sanitizeSolidName(header.replace(/^CarbonEngineJS\s+/u, "") || DEFAULT_SOLID_NAME);
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

/**
 * Return a finite unit facet normal, preferring an explicit non-zero normal
 * and otherwise deriving it from triangle winding.
 *
 * @param {object} triangle Triangle record with three vertices and optional normal.
 * @returns {number[]} Finite xyz unit normal.
 * @throws {TypeError} If normal calculation produces a non-finite component.
 */
function resolveTriangleNormal(triangle)
{
    const normal = triangle.normal && !isZeroNormal(triangle.normal)
        ? normalize([ 0, 0, 0 ], triangle.normal)
        : triangleNormal(triangle.vertices[0], triangle.vertices[1], triangle.vertices[2]);

    return [
        assertFiniteNumber(normal[0], "facet normal"),
        assertFiniteNumber(normal[1], "facet normal"),
        assertFiniteNumber(normal[2], "facet normal")
    ];
}

/**
 * Store one finite binary STL float without silently overflowing to infinity.
 *
 * @param {DataView} view Destination byte view.
 * @param {number} offset Byte offset of the little-endian float.
 * @param {number} value Numeric component to encode.
 * @param {string} feature Context included in validation errors.
 * @returns {void}
 * @throws {TypeError|RangeError} If the value is non-finite or exceeds float32 range.
 */
function writeFloat32(view, offset, value, feature)
{
    const floatValue = Math.fround(assertFiniteNumber(value, feature));
    if (!Number.isFinite(floatValue))
    {
        throw new RangeError(`CjsStlFormat: ${feature} exceeds binary STL float32 range`);
    }
    view.setFloat32(offset, floatValue, true);
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

/**
 * Union-find structure with path compression used to group edge-connected
 * triangles during STL printability inspection.
 */
class DisjointSet
{

    /** Creates a DisjointSet with caller-provided initial state. */
    constructor(size)
    {
        this.parent = new Array(size);
        for (let i = 0; i < size; i++) this.parent[i] = i;
    }

    /** Finds the canonical entry in the current STL format reader. */
    find(value)
    {
        const parent = this.parent[value];
        if (parent === value) return value;
        this.parent[value] = this.find(parent);
        return this.parent[value];
    }

    /**
     * Merges the connected components containing two mesh vertices for the STL
     * format reader.
     */
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
 *//**
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
 * Headers written as `CarbonEngineJS <solidName>` retain their provenance in
 * the file while exposing `<solidName>` as parsed mesh metadata.
 *
 * @param {Uint8Array} bytes Binary STL bytes.
 * @returns {object} Parsed format/name metadata and triangle records.
 * @throws {Error} If byte length/count disagree or no triangles are present.
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

    return { format: "binary", name: readBinarySolidName(header), triangles };
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
 * Meshes and index groups are flattened in encounter order. Coordinates are
 * copied and scaled, so the caller's shared graph remains unchanged. Only
 * positions, optional normals, and triangular indices participate in STL.
 *
 * @param {object} input Shared JSON graph or mesh record.
 * @param {object} values Normalized format values.
 * @returns {object[]} Scaled triangle records ready for inspection/encoding.
 * @throws {TypeError|RangeError|Error} If geometry, coordinates, or indices are invalid.
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
            const groupName = group.name || "default";
            if (faces.length % 3 !== 0)
            {
                throw new Error(`CjsStlFormat: mesh #${meshIndex} index group ${JSON.stringify(groupName)} is not triangular`);
            }

            for (let i = 0; i < faces.length; i += 3)
            {
                const
                    vertexCount = positions.length / 3,
                    ia = assertTriangleIndex(faces[i], vertexCount, meshIndex, groupName) * 3,
                    ib = assertTriangleIndex(faces[i + 1], vertexCount, meshIndex, groupName) * 3,
                    ic = assertTriangleIndex(faces[i + 2], vertexCount, meshIndex, groupName) * 3;

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
 * Solid names and numeric components are normalized deterministically. The
 * function does not mutate triangle records.
 *
 * @param {object[]} triangles Triangle records.
 * @param {string} solidName STL solid name.
 * @returns {string} ASCII STL text.
 * @throws {TypeError} If a facet normal cannot be represented as finite text.
 */
export function writeAsciiStl(triangles, solidName)
{
    const lines = [ `solid ${sanitizeSolidName(solidName)}` ];
    for (const triangle of triangles)
    {
        const normal = resolveTriangleNormal(triangle);

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
 * Output uses the standard 80-byte header, little-endian uint32 triangle
 * count, 50-byte triangle records, and zero attribute words. The header keeps
 * a `CarbonEngineJS` provenance prefix. Every numeric component is checked for
 * finite float32 representation before storage.
 *
 * @param {object[]} triangles Triangle records.
 * @param {string} solidName STL solid name.
 * @returns {Uint8Array} Binary STL bytes.
 * @throws {TypeError|RangeError} If count or numeric components exceed binary STL's representable domain.
 */
export function writeBinaryStl(triangles, solidName)
{
    if (triangles.length > 0xffffffff)
    {
        throw new RangeError("CjsStlFormat: binary STL cannot contain more than 4294967295 triangles");
    }

    const
        bytes = new Uint8Array(BINARY_HEADER_BYTES + BINARY_COUNT_BYTES + triangles.length * BINARY_TRIANGLE_BYTES),
        view = new DataView(bytes.buffer),
        header = makeEncoder().encode(`CarbonEngineJS ${sanitizeSolidName(solidName)}`);

    bytes.set(header.subarray(0, BINARY_HEADER_BYTES), 0);
    view.setUint32(BINARY_HEADER_BYTES, triangles.length, true);

    let offset = BINARY_HEADER_BYTES + BINARY_COUNT_BYTES;
    for (const triangle of triangles)
    {
        const normal = resolveTriangleNormal(triangle);

        for (let c = 0; c < 3; c++)
        {
            writeFloat32(view, offset + c * 4, normal[c], "facet normal");
        }

        for (let v = 0; v < 3; v++)
        {
            const vertex = triangle.vertices[v];
            for (let c = 0; c < 3; c++)
            {
                writeFloat32(view, offset + 12 + v * 12 + c * 4, vertex[c], "vertex coordinate");
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

