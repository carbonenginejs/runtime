import { MeshoptDecoder } from "meshoptimizer/decoder";

import { elementTypeSize, readElementComponent as readCmfElementComponent } from "./utils/vertex.js";

const CHANNEL_NAMES = Object.freeze({
    Position: "position",
    Normal: "normal",
    Tangent: "tangent",
    Binormal: "binormal",
    TexCoord: "texcoord",
    Color: "color",
    BoneIndices: "blendIndice",
    BoneWeights: "blendWeight",
    PackedTangent: "packedTangent",
    PackedTangentLegacy: "packedTangentLegacy"
});

/**
 * Decodes geometry sync into a normalized CMF format reader result.
 *
 * @param {import("./helpers.js").CmfGraph} result Parsed graph; receives buffers and decoded channels.
 * @param {Uint8Array} sourceBytes File bytes.
 * @returns {import("./helpers.js").CmfGraph} The same graph.
 */
export function decodeGeometrySync(result, sourceBytes)
{
    const sections = result.sections.map((section, index) => decodeSectionSync(section, index, sourceBytes));
    attachGeometry(result, sections);
    return result;
}

/**
 * Decodes geometry async into a normalized CMF format reader result.
 *
 * @param {import("./helpers.js").CmfGraph} result Parsed graph; receives buffers and decoded channels.
 * @param {Uint8Array} sourceBytes File bytes.
 * @returns {Promise<import("./helpers.js").CmfGraph>} The same graph.
 */
export async function decodeGeometryAsync(result, sourceBytes)
{
    await MeshoptDecoder.ready;
    const sections = result.sections.map((section, index) => decodeSectionWithMeshopt(section, index, sourceBytes));
    attachGeometry(result, sections);
    return result;
}

/**
 * Returns an uncompressed GPU section's bytes.
 *
 * @param {import("./helpers.js").CmfSection} section Section record.
 * @param {number} index Section index.
 * @param {Uint8Array} sourceBytes File bytes.
 * @returns {Uint8Array|null} The section bytes, or null for non-GPU sections.
 * @throws {Error} When the section is compressed.
 */
function decodeSectionSync(section, index, sourceBytes)
{
    if (section.compression !== "None")
    {
        throw new Error("CMF compressed GPU buffers require ReadAsync/readAsync so meshoptimizer can initialize");
    }

    return sectionBytes(section, index, sourceBytes);
}

/**
 * Returns a GPU section's bytes, decoding meshoptimizer compression.
 *
 * @param {import("./helpers.js").CmfSection} section Section record.
 * @param {number} index Section index.
 * @param {Uint8Array} sourceBytes File bytes.
 * @returns {Uint8Array|null} The uncompressed bytes, or null for non-GPU sections.
 * @throws {Error} When the compression is not supported.
 */
function decodeSectionWithMeshopt(section, index, sourceBytes)
{
    const source = sectionBytes(section, index, sourceBytes);
    if (section.compression === "None")
    {
        return source;
    }

    const target = new Uint8Array(section.uncompressedSize);
    const count = section.gpuAlignment === 0 ? 0 : section.uncompressedSize / section.gpuAlignment;

    if (section.compression === "MeshOptimizerVertexBuffer")
    {
        MeshoptDecoder.decodeVertexBuffer(target, count, section.gpuAlignment, source);
        return target;
    }

    if (section.compression === "MeshOptimizerIndexBuffer")
    {
        MeshoptDecoder.decodeIndexBuffer(target, count, section.gpuAlignment, source);
        return target;
    }

    throw new Error(`Unsupported CMF section compression "${section.compression}"`);
}

/**
 * Returns the stored bytes of a GPU buffer section.
 *
 * @param {import("./helpers.js").CmfSection} section Section record.
 * @param {number} index Section index.
 * @param {Uint8Array} sourceBytes File bytes.
 * @returns {Uint8Array|null} A view over the stored bytes, or null for the Data section and non-GPU sections.
 */
function sectionBytes(section, index, sourceBytes)
{
    if (index === 0 || section.type !== "GpuBuffer")
    {
        return null;
    }

    return sourceBytes.subarray(section.offset, section.offset + section.compressedSize);
}

/**
 * Attaches decoded buffers to the graph and decoded vertex channels and index
 * groups to every mesh and LOD.
 *
 * @param {import("./helpers.js").CmfGraph} result Parsed graph.
 * @param {Array<Uint8Array|null>} sectionData Uncompressed bytes per section.
 */
function attachGeometry(result, sectionData)
{
    result.buffers = result.sections.map((section, index) =>
    {
        const data = sectionData[index];
        return {
            index,
            type: section.type,
            compression: section.compression,
            byteLength: data?.byteLength ?? 0,
            data
        };
    });

    for (const mesh of result.meshes)
    {
        for (const lod of mesh.lods)
        {
            lod.vertex = readVertexChannels(mesh.decl, lod.vb, sectionData);
            lod.indices = readIndexGroups(mesh, lod, sectionData);

            for (let i = 0; i < lod.morphTargets.length; i++)
            {
                const target = lod.morphTargets[i];
                target.vertex = readVertexChannels(mesh.morphTargets.decl, target.vb, sectionData);
                target.name = mesh.morphTargets.targets[i]?.name ?? target.name ?? "";
                target.maxDisplacement = mesh.morphTargets.targets[i]?.maxDisplacement ?? target.maxDisplacement ?? 0;
            }
        }

        if (mesh.lods.length > 0)
        {
            mesh.vertex = mesh.lods[0].vertex;
            mesh.indices = mesh.lods[0].indices;
        }
        else
        {
            mesh.vertex = createVertexChannels();
            mesh.indices = [];
        }
    }
}

/**
 * Deinterleaves a vertex buffer view into named channels.
 *
 * @param {Array<import("./helpers.js").CmfVertexElement>} decl Vertex declaration.
 * @param {import("./helpers.js").CmfBufferView} view Vertex buffer view.
 * @param {Array<Uint8Array|null>} sectionData Uncompressed bytes per section.
 * @returns {import("./helpers.js").CmfVertexChannels} The channels.
 */
function readVertexChannels(decl, view, sectionData)
{
    const channels = createVertexChannels();
    const bytes = viewData(view, sectionData);
    if (!bytes || view.stride === 0)
    {
        return channels;
    }

    const reader = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const count = Math.floor(view.size / view.stride);
    for (const element of decl)
    {
        const channel = channelName(element);
        if (!channels[channel]) channels[channel] = [];

        for (let vertex = 0; vertex < count; vertex++)
        {
            const base = vertex * view.stride + element.offset;
            for (let component = 0; component < element.elementCount; component++)
            {
                channels[channel].push(readElementComponent(reader, base, element.type, component));
            }
        }
    }

    return channels;
}

/**
 * Splits a LOD's index buffer into one group per area.
 *
 * @param {import("./helpers.js").CmfMesh} mesh Owning mesh.
 * @param {import("./helpers.js").CmfMeshLod} lod LOD.
 * @param {Array<Uint8Array|null>} sectionData Uncompressed bytes per section.
 * @returns {Array<import("./helpers.js").CmfIndexGroup>} The index groups.
 */
function readIndexGroups(mesh, lod, sectionData)
{
    if (mesh.topology === "PointList")
    {
        return lod.areas.map((area, areaIndex) => ({
            name: mesh.areas[areaIndex]?.name ?? "",
            bytesPerIndex: 0,
            firstElement: area.firstElement,
            elementCount: area.elementCount,
            pointCount: area.elementCount,
            faces: []
        }));
    }

    const bytes = viewData(lod.ib, sectionData);
    if (!bytes || lod.ib.stride === 0)
    {
        return [];
    }

    const
        reader = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength),
        allFaces = readIndices(reader, lod.ib.size, lod.ib.stride);

    if (lod.areas.length === 0)
    {
        return [ {
            name: "",
            bytesPerIndex: lod.ib.stride,
            faces: allFaces
        } ];
    }

    return lod.areas.map((area, areaIndex) =>
    {
        const sourceArea = mesh.areas[areaIndex];
        return {
            name: sourceArea?.name ?? "",
            bytesPerIndex: lod.ib.stride,
            firstElement: area.firstElement,
            elementCount: area.elementCount,
            faces: allFaces.slice(area.firstElement * 3, (area.firstElement + area.elementCount) * 3)
        };
    });
}

/**
 * Reads little-endian indices of the given width.
 *
 * @param {DataView} reader Index bytes.
 * @param {number} byteSize Byte count to read.
 * @param {number} stride Index width in bytes.
 * @returns {Array<number>} The indices.
 */
function readIndices(reader, byteSize, stride)
{
    const result = [];
    for (let offset = 0; offset < byteSize; offset += stride)
    {
        if (stride === 2) result.push(reader.getUint16(offset, true));
        else if (stride === 4) result.push(reader.getUint32(offset, true));
        else result.push(reader.getUint8(offset));
    }
    return result;
}

/**
 * Returns the bytes a buffer view covers.
 *
 * @param {import("./helpers.js").CmfBufferView} view Buffer view.
 * @param {Array<Uint8Array|null>} sectionData Uncompressed bytes per section.
 * @returns {Uint8Array|null} A subarray, or null when the section is missing or the view is empty.
 */
function viewData(view, sectionData)
{
    const section = sectionData[view.index];
    if (!section || view.size === 0)
    {
        return null;
    }

    return section.subarray(view.offset, view.offset + view.size);
}

/**
 * Returns the shared channel name for a vertex element.
 *
 * @param {import("./helpers.js").CmfVertexElement} element Vertex element.
 * @returns {string} The channel name.
 */
function channelName(element)
{
    const base = CHANNEL_NAMES[element.usage] ?? lowerFirst(element.usage);
    if (element.usage === "TexCoord" || element.usage === "Color")
    {
        return `${base}${element.usageIndex}`;
    }

    if (element.usageIndex > 0)
    {
        return `${base}${element.usageIndex}`;
    }

    return base;
}

/**
 * Creates empty vertex channels.
 *
 * @returns {import("./helpers.js").CmfVertexChannels} Empty channels.
 */
function createVertexChannels()
{
    return {
        position: [],
        normal: [],
        tangent: [],
        binormal: [],
        texcoord0: [],
        texcoord1: [],
        color0: [],
        blendIndice: [],
        blendWeight: [],
        packedTangent: [],
        packedTangentLegacy: []
    };
}

/**
 * Reads one component of a vertex element.
 *
 * @param {DataView} reader Vertex bytes.
 * @param {number} base Element byte offset.
 * @param {string} type ElementType name.
 * @param {number} component Component index.
 * @returns {number} The decoded value.
 */
function readElementComponent(reader, base, type, component)
{
    const offset = base + component * elementTypeSize(type);
    return readCmfElementComponent(reader, offset, type);
}

/**
 * Lower-cases the first character.
 *
 * @param {string} value Input.
 * @returns {string} The converted string.
 */
function lowerFirst(value)
{
    return value ? value[0].toLowerCase() + value.slice(1) : value;
}
