import { MeshoptDecoder } from "meshoptimizer/decoder";

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

/** Decodes geometry sync into a normalized CMF format reader result. */
export function decodeGeometrySync(result, sourceBytes)
{
    const sections = result.sections.map((section, index) => decodeSectionSync(section, index, sourceBytes));
    attachGeometry(result, sections);
    return result;
}

/** Decodes geometry async into a normalized CMF format reader result. */
export async function decodeGeometryAsync(result, sourceBytes)
{
    await MeshoptDecoder.ready;
    const sections = result.sections.map((section, index) => decodeSectionWithMeshopt(section, index, sourceBytes));
    attachGeometry(result, sections);
    return result;
}

function decodeSectionSync(section, index, sourceBytes)
{
    if (section.compression !== "None")
    {
        throw new Error("CMF compressed GPU buffers require ReadAsync/readAsync so meshoptimizer can initialize");
    }

    return sectionBytes(section, index, sourceBytes);
}

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

function sectionBytes(section, index, sourceBytes)
{
    if (index === 0 || section.type !== "GpuBuffer")
    {
        return null;
    }

    return sourceBytes.subarray(section.offset, section.offset + section.compressedSize);
}

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

function readIndexGroups(mesh, lod, sectionData)
{
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

function viewData(view, sectionData)
{
    const section = sectionData[view.index];
    if (!section || view.size === 0)
    {
        return null;
    }

    return section.subarray(view.offset, view.offset + view.size);
}

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

function readElementComponent(reader, base, type, component)
{
    const offset = base + component * elementTypeSize(type);
    switch (type)
    {
        case "Float32":
            return reader.getFloat32(offset, true);
        case "Float16":
            return halfToFloat(reader.getUint16(offset, true));
        case "UInt16Norm":
            return reader.getUint16(offset, true) / 65535;
        case "UInt16":
            return reader.getUint16(offset, true);
        case "Int16Norm":
            return Math.max(reader.getInt16(offset, true) / 32767, -1);
        case "Int16":
            return reader.getInt16(offset, true);
        case "UInt8Norm":
            return reader.getUint8(offset) / 255;
        case "UInt8":
            return reader.getUint8(offset);
        case "Int8Norm":
            return Math.max(reader.getInt8(offset) / 127, -1);
        case "Int8":
            return reader.getInt8(offset);
        default:
            throw new Error(`Unsupported CMF vertex element type "${type}"`);
    }
}

function elementTypeSize(type)
{
    switch (type)
    {
        case "Float32":
            return 4;
        case "Float16":
        case "UInt16Norm":
        case "UInt16":
        case "Int16Norm":
        case "Int16":
            return 2;
        case "UInt8Norm":
        case "UInt8":
        case "Int8Norm":
        case "Int8":
            return 1;
        default:
            throw new Error(`Unsupported CMF vertex element type "${type}"`);
    }
}

function halfToFloat(value)
{
    const
        sign = (value & 0x8000) ? -1 : 1,
        exponent = (value >> 10) & 0x1f,
        fraction = value & 0x03ff;

    if (exponent === 0)
    {
        return sign * Math.pow(2, -14) * (fraction / 1024);
    }

    if (exponent === 31)
    {
        return fraction ? NaN : sign * Infinity;
    }

    return sign * Math.pow(2, exponent - 15) * (1 + fraction / 1024);
}

function lowerFirst(value)
{
    return value ? value[0].toLowerCase() + value.slice(1) : value;
}
