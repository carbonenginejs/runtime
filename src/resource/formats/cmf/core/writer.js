import { MeshoptEncoder } from "meshoptimizer/encoder";
import {
    AnimationChannelTargetType,
    ElementType,
    FILE_SIGNATURE,
    FILE_VERSION,
    Interpolation,
    MeshTopology,
    STRUCT_SIZE,
    SectionCompression,
    SectionType,
    Usage
} from "./constants.js";
import { crc32 } from "./binary.js";
import { readCmf } from "./schema.js";
import { validateCmfGraph } from "./validate.js";

/**
 * Binary CMF v1 writer.
 *
 * Mirrors CarbonEngine's `cmf::BuildFile`: the object graph is flattened into
 * the Data section as structs with self-relative tagged span offsets
 * (depth-first in member order, 8-byte chunk alignment, identical leaf chunks
 * deduplicated), GPU buffers referenced by BufferViews become one section
 * each (remapped to section indices in first-encounter order, meshoptimizer
 * compressed by default), optional metadata flattens into a trailing section,
 * and the header CRC covers everything after the crc32 field.
 */

const textEncoder = new TextEncoder();
const FLOAT32_MAX = 3.4028234663852886e38;

let encoderReady = false;
MeshoptEncoder.ready.then(() => { encoderReady = true; });

function writeError(message)
{
    const error = new Error(`CMF write: ${message}`);
    error.code = "CJS_FORMAT_WRITE_ERROR";
    return error;
}

function enumValue(names, value, label)
{
    if (typeof value === "number") return value;
    const index = names.indexOf(value);
    if (index >= 0) return index;
    const unknown = /^Unknown\((\d+)\)$/u.exec(String(value ?? ""));
    if (unknown) return Number(unknown[1]);
    throw writeError(`unknown ${label} value ${JSON.stringify(value)}`);
}

/**
 * Growable little-endian struct buffer with tagged span support.
 */
class Flattener
{
    #bytes = new Uint8Array(1024);
    #view = new DataView(this.#bytes.buffer);
    #chunkCache = new Map();
    size = 0;

    /**
     * Grows the output buffer when the requested write would exceed capacity for
     * the CMF binary writer.
     */
    #ensure(capacity)
    {
        if (capacity <= this.#bytes.length) return;
        let next = this.#bytes.length * 2;
        while (next < capacity) next *= 2;
        const grown = new Uint8Array(next);
        grown.set(this.#bytes.subarray(0, this.size));
        this.#bytes = grown;
        this.#view = new DataView(grown.buffer);
    }

    /** Reserves output storage in the current CMF binary writer. */
    reserve(byteLength)
    {
        const offset = this.size;
        this.#ensure(offset + byteLength);
        this.#bytes.fill(0, offset, offset + byteLength);
        this.size = offset + byteLength;
        return offset;
    }

    /** Reserves aligned in the current CMF binary writer. */
    reserveAligned(byteLength, alignment = 8)
    {
        const padded = Math.ceil(this.size / alignment) * alignment;
        this.#ensure(padded);
        this.#bytes.fill(0, this.size, padded);
        this.size = padded;
        return this.reserve(byteLength);
    }

    /**
     * Writes an unsigned 8-bit integer into the output buffer for the CMF binary
     * writer.
     */
    u8(offset, value) { this.#view.setUint8(offset, value); }

    /**
     * Writes an unsigned 16-bit little-endian integer into the output buffer for
     * the CMF binary writer.
     */
    u16(offset, value) { this.#view.setUint16(offset, value, true); }

    /**
     * Writes an unsigned 32-bit little-endian integer into the output buffer for
     * the CMF binary writer.
     */
    u32(offset, value) { this.#view.setUint32(offset, value, true); }

    /**
     * Writes a 32-bit little-endian float into the output buffer for the CMF
     * binary writer.
     */
    f32(offset, value) { this.#view.setFloat32(offset, value ?? 0, true); }

    /**
     * Writes a signed 64-bit little-endian integer into the output buffer for
     * the CMF binary writer.
     */
    i64(offset, value) { this.#view.setBigInt64(offset, BigInt(value), true); }

    /**
     * Writes an unsigned 64-bit little-endian integer into the output buffer for
     * the CMF binary writer.
     */
    u64(offset, value) { this.#view.setBigUint64(offset, BigInt(value), true); }

    /**
     * Copies bytes into a previously reserved output range for the CMF binary
     * writer.
     */
    setBytes(offset, bytes)
    {
        this.#bytes.set(bytes, offset);
    }

    /**
     * Write a span field and append its element chunk.
     *
     * `writeElement(flattener, offset, element)` may itself append nested
     * chunks; leaf chunks (`dedup: true`) are shared when byte-identical,
     * matching the reference writer.
     */
    span(fieldOffset, elements, elementSize, writeElement, { dedup = false } = {})
    {
        const count = elements ? elements.length : 0;
        const byteSize = count * elementSize;
        if (byteSize === 0)
        {
            // tagged self-relative offset of 0 keeps span pointers valid
            this.i64(fieldOffset, 1);
            this.u64(fieldOffset + 8, 0);
            return;
        }

        if (dedup)
        {
            const scratch = new Flattener();
            const scratchOffset = scratch.reserve(byteSize);
            for (let i = 0; i < count; i++) writeElement(scratch, scratchOffset + i * elementSize, elements[i]);
            const chunk = scratch.bytes();
            const key = chunkKey(chunk);
            const cached = this.#chunkCache.get(key);
            if (cached !== undefined && bytesEqual(this.#bytes, cached, chunk))
            {
                this.i64(fieldOffset, cached - fieldOffset + 1);
                this.u64(fieldOffset + 8, byteSize);
                return;
            }
            const chunkOffset = this.reserveAligned(byteSize);
            this.setBytes(chunkOffset, chunk);
            this.#chunkCache.set(key, chunkOffset);
            this.i64(fieldOffset, chunkOffset - fieldOffset + 1);
            this.u64(fieldOffset + 8, byteSize);
            return;
        }

        const chunkOffset = this.reserveAligned(byteSize);
        this.i64(fieldOffset, chunkOffset - fieldOffset + 1);
        this.u64(fieldOffset + 8, byteSize);
        for (let i = 0; i < count; i++) writeElement(this, chunkOffset + i * elementSize, elements[i]);
    }

    /**
     * Writes a length-prefixed UTF-8 string into the output buffer for the CMF
     * binary writer.
     */
    string(fieldOffset, value)
    {
        const encoded = textEncoder.encode(value || "");
        this.span(fieldOffset, encoded, 1, (buffer, offset, byte) => buffer.u8(offset, byte), { dedup: true });
    }

    /**
     * Writes a length-prefixed byte block into the output buffer for the CMF
     * binary writer.
     */
    bytes()
    {
        return this.#bytes.slice(0, this.size);
    }
}

function chunkKey(bytes)
{
    let hash = 2166136261 >>> 0;
    for (let i = 0; i < bytes.length; i++)
    {
        hash = Math.imul(hash, 16777619) >>> 0;
        hash = (hash ^ bytes[i]) >>> 0;
    }
    return `${bytes.length}:${hash}`;
}

function bytesEqual(target, offset, chunk)
{
    for (let i = 0; i < chunk.length; i++)
    {
        if (target[offset + i] !== chunk[i]) return false;
    }
    return true;
}

function writeBounds(buffer, offset, bounds)
{
    const min = bounds?.min ?? [ FLOAT32_MAX, FLOAT32_MAX, FLOAT32_MAX ];
    const max = bounds?.max ?? [ -FLOAT32_MAX, -FLOAT32_MAX, -FLOAT32_MAX ];
    for (let i = 0; i < 3; i++) buffer.f32(offset + i * 4, min[i]);
    for (let i = 0; i < 3; i++) buffer.f32(offset + 12 + i * 4, max[i]);
}

function writeBufferView(buffer, offset, view, remap)
{
    const size = view?.size || 0;
    const index = view?.index || 0;
    buffer.u32(offset, size === 0 ? index : (remap.get(index) ?? index));
    buffer.u32(offset + 4, view?.offset || 0);
    buffer.u32(offset + 8, size);
    buffer.u32(offset + 12, view?.stride || 0);
}

function writeVertexElement(buffer, offset, element)
{
    buffer.u8(offset, enumValue(Usage, element.usage, "vertex usage"));
    buffer.u8(offset + 1, element.usageIndex || 0);
    buffer.u8(offset + 2, enumValue(ElementType, element.type, "element type"));
    buffer.u8(offset + 3, element.elementCount || 0);
    buffer.u32(offset + 4, element.offset || 0);
}

function writeData(buffer, offset, graph, remap)
{
    const writeMesh = (target, meshOffset, mesh) =>
    {
        target.string(meshOffset, mesh.name);
        target.span(meshOffset + 16, mesh.decl || [], STRUCT_SIZE.VertexElement, writeVertexElement, { dedup: true });
        target.span(meshOffset + 32, mesh.lods || [], STRUCT_SIZE.MeshLod, (lodTarget, lodOffset, lod) =>
        {
            writeBufferView(lodTarget, lodOffset, lod.vb, remap);
            writeBufferView(lodTarget, lodOffset + 16, lod.ib, remap);
            lodTarget.span(lodOffset + 32, lod.areas || [], STRUCT_SIZE.LodMeshArea, (areaTarget, areaOffset, area) =>
            {
                areaTarget.u32(areaOffset, area.firstElement || 0);
                areaTarget.u32(areaOffset + 4, area.elementCount || 0);
            }, { dedup: true });
            lodTarget.span(lodOffset + 48, lod.morphTargets || [], STRUCT_SIZE.LodMorphTarget, (morphTarget, morphOffset, morph) =>
            {
                writeBufferView(morphTarget, morphOffset, morph.vb, remap);
            });
            lodTarget.u32(lodOffset + 64, lod.threshold ?? 0xffffffff);
        });
        target.span(meshOffset + 48, mesh.areas || [], STRUCT_SIZE.MeshArea, (areaTarget, areaOffset, area) =>
        {
            areaTarget.string(areaOffset, area.name);
            writeBounds(areaTarget, areaOffset + 16, area.bounds);
            areaTarget.span(areaOffset + 40, area.bones || [], 2, (boneTarget, boneOffset, bone) => boneTarget.u16(boneOffset, bone), { dedup: true });
            areaTarget.u8(areaOffset + 56, area.affectedByBones ? 1 : 0);
            areaTarget.u8(areaOffset + 57, area.affectedByMorphTargets ? 1 : 0);
        });
        target.span(meshOffset + 64, mesh.boneBindings || [], STRUCT_SIZE.BoneBinding, (bindingTarget, bindingOffset, binding) =>
        {
            bindingTarget.string(bindingOffset, binding.name);
            writeBounds(bindingTarget, bindingOffset + 16, binding.bounds);
        });
        target.span(meshOffset + 80, mesh.morphTargets?.decl || [], STRUCT_SIZE.VertexElement, writeVertexElement, { dedup: true });
        target.span(meshOffset + 96, mesh.morphTargets?.targets || [], STRUCT_SIZE.MorphTarget, (morphTarget, morphOffset, morph) =>
        {
            morphTarget.string(morphOffset, morph.name);
            morphTarget.f32(morphOffset + 16, morph.maxDisplacement ?? 0);
        });
        target.span(meshOffset + 112, mesh.uvDensities || [], 4, (densityTarget, densityOffset, value) => densityTarget.f32(densityOffset, value), { dedup: true });
        writeBounds(target, meshOffset + 128, mesh.bounds);
        const occlusion = mesh.audioOcclusionMesh || {};
        target.span(meshOffset + 152, occlusion.vertices || [], 12, (vertexTarget, vertexOffset, vertex) =>
        {
            for (let i = 0; i < 3; i++) vertexTarget.f32(vertexOffset + i * 4, vertex[i]);
        }, { dedup: true });
        target.span(meshOffset + 168, occlusion.indices || [], 2, (indexTarget, indexOffset, index) => indexTarget.u16(indexOffset, index), { dedup: true });
        writeBounds(target, meshOffset + 184, occlusion.bounds);
        target.u8(meshOffset + 208, enumValue(MeshTopology, mesh.topology ?? "TriangleList", "topology"));
        target.u8(meshOffset + 209, mesh.skeleton === null || mesh.skeleton === undefined ? 0xff : mesh.skeleton);
    };

    const writeSkeleton = (target, skeletonOffset, skeleton) =>
    {
        if ((skeleton.bones || []).some((bone) => typeof bone !== "string"))
        {
            throw writeError(
                "skeleton bones must be name strings; GR2-shaped skeletons need conversion (use writeShared) before writing"
            );
        }
        target.string(skeletonOffset, skeleton.name);
        target.span(skeletonOffset + 16, skeleton.bones || [], 16, (boneTarget, boneOffset, bone) => boneTarget.string(boneOffset, bone));
        target.span(skeletonOffset + 32, skeleton.parents || [], 4, (parentTarget, parentOffset, parent) => parentTarget.u32(parentOffset, parent), { dedup: true });
        target.span(skeletonOffset + 48, skeleton.restTransforms || [], STRUCT_SIZE.Transform, (transformTarget, transformOffset, transform) =>
        {
            const position = transform.position || [ 0, 0, 0 ];
            const rotation = transform.rotation || [ 0, 0, 0, 1 ];
            const scale = transform.scale || [ 1, 1, 1 ];
            for (let i = 0; i < 3; i++) transformTarget.f32(transformOffset + i * 4, position[i]);
            for (let i = 0; i < 4; i++) transformTarget.f32(transformOffset + 12 + i * 4, rotation[i]);
            for (let i = 0; i < 3; i++) transformTarget.f32(transformOffset + 28 + i * 4, scale[i]);
        }, { dedup: true });
        target.span(skeletonOffset + 64, skeleton.invBindTransforms || [], 64, (matrixTarget, matrixOffset, matrix) =>
        {
            for (let i = 0; i < 16; i++) matrixTarget.f32(matrixOffset + i * 4, matrix[i]);
        }, { dedup: true });
        target.span(skeletonOffset + 80, skeleton.boneMasks || [], STRUCT_SIZE.BoneMask, (maskTarget, maskOffset, mask) =>
        {
            maskTarget.string(maskOffset, mask.name);
            maskTarget.span(maskOffset + 16, mask.weights || [], STRUCT_SIZE.BoneWeight, (weightTarget, weightOffset, weight) =>
            {
                weightTarget.u32(weightOffset, weight.index || 0);
                weightTarget.f32(weightOffset + 4, weight.weight ?? 1);
            }, { dedup: true });
        });
    };

    const writeAnimation = (target, animationOffset, animation) =>
    {
        target.string(animationOffset, animation.name);
        target.span(animationOffset + 16, animation.channels || [], STRUCT_SIZE.AnimationChannel, (channelTarget, channelOffset, channel) =>
        {
            channelTarget.string(channelOffset, channel.target);
            channelTarget.u8(channelOffset + 16, enumValue(AnimationChannelTargetType, channel.targetType, "channel target type"));
            channelTarget.u32(channelOffset + 20, channel.curveIndex || 0);
        });
        target.span(animationOffset + 32, animation.curves || [], STRUCT_SIZE.AnimationCurve, (curveTarget, curveOffset, curve) =>
        {
            curveTarget.u8(curveOffset, curve.valueDimension || 0);
            curveTarget.u8(curveOffset + 1, enumValue(Interpolation, curve.interpolation, "interpolation"));
            curveTarget.u8(curveOffset + 2, enumValue(ElementType, curve.knotType, "knot type"));
            curveTarget.u8(curveOffset + 3, enumValue(ElementType, curve.valueType, "value type"));
            curveTarget.u32(curveOffset + 4, curve.knotCount || 0);
            curveTarget.span(curveOffset + 8, curve.knots || [], 1, (knotTarget, knotOffset, knot) => knotTarget.u8(knotOffset, knot), { dedup: true });
            curveTarget.span(curveOffset + 24, curve.values || [], 1, (valueTarget, valueOffset, value) => valueTarget.u8(valueOffset, value), { dedup: true });
        });
        target.f32(animationOffset + 48, animation.duration ?? 0);
    };

    buffer.span(offset, graph.meshes || [], STRUCT_SIZE.Mesh, writeMesh);
    buffer.span(offset + 16, graph.skeletons || [], STRUCT_SIZE.Skeleton, writeSkeleton);
    buffer.span(offset + 32, graph.animations || [], STRUCT_SIZE.Animation, writeAnimation);
}

/**
 * Collect BufferView usage in reference-writer order and decide per-buffer
 * compression (conflicting stride/kind across views falls back to None).
 */
function collectBufferRecords(graph, compress)
{
    const records = [];
    const recordsByIndex = new Map();
    const visit = (view, compression) =>
    {
        if (!view || !view.size) return;
        const existing = recordsByIndex.get(view.index);
        if (!existing)
        {
            const record = {
                index: view.index,
                stride: view.stride || 0,
                compression: compress ? compression : "None"
            };
            records.push(record);
            recordsByIndex.set(view.index, record);
        }
        else if (existing.stride !== (view.stride || 0) || (compress ? compression : "None") !== existing.compression)
        {
            existing.stride = 0;
            existing.compression = "None";
        }
    };

    for (const mesh of graph.meshes || [])
    {
        for (const lod of mesh.lods || [])
        {
            visit(lod.vb, "MeshOptimizerVertexBuffer");
            visit(lod.ib, "MeshOptimizerIndexBuffer");
            for (const morph of lod.morphTargets || [])
            {
                visit(morph.vb, "MeshOptimizerVertexBuffer");
            }
        }
    }
    return records;
}

function resolveBufferBytes(graph, record)
{
    const buffers = graph.buffers || [];
    const entry = buffers.find?.((buffer) => buffer && buffer.index === record.index) ?? buffers[record.index];
    const data = entry?.data ?? (entry instanceof Uint8Array ? entry : null);
    if (!data)
    {
        throw writeError(`no buffer data supplied for BufferView index ${record.index}`);
    }
    return data instanceof Uint8Array ? data : new Uint8Array(data);
}

function compressBuffer(bytes, record)
{
    if (record.compression === "None" || bytes.byteLength === 0)
    {
        return { data: bytes, compression: "None", gpuAlignment: record.stride };
    }
    if (!encoderReady)
    {
        throw writeError("compressed output requires writeAsync/WriteAsync so meshoptimizer can initialize (or pass compress: false)");
    }

    if (record.compression === "MeshOptimizerVertexBuffer")
    {
        if (record.stride === 0 || bytes.byteLength % record.stride !== 0)
        {
            return { data: bytes, compression: "None", gpuAlignment: record.stride };
        }
        const count = bytes.byteLength / record.stride;
        const data = MeshoptEncoder.encodeVertexBuffer(bytes, count, record.stride);
        return { data, compression: "MeshOptimizerVertexBuffer", gpuAlignment: record.stride };
    }

    // index buffers: meshopt encodes triangle lists of u32; u16 sources widen
    const stride = record.stride;
    if ((stride !== 2 && stride !== 4) || bytes.byteLength % stride !== 0)
    {
        return { data: bytes, compression: "None", gpuAlignment: stride };
    }
    const count = bytes.byteLength / stride;
    if (count % 3 !== 0)
    {
        return { data: bytes, compression: "None", gpuAlignment: stride };
    }
    let source = bytes;
    if (stride === 2)
    {
        const wide = new Uint32Array(count);
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        for (let i = 0; i < count; i++) wide[i] = view.getUint16(i * 2, true);
        source = new Uint8Array(wide.buffer);
    }
    const data = MeshoptEncoder.encodeIndexBuffer(source, count, 4);
    return { data, compression: "MeshOptimizerIndexBuffer", gpuAlignment: stride };
}

/**
 * Serialize a CMF-native graph into .cmf bytes.
 *
 * @param {object} graph Native graph: `{ meshes, skeletons, animations, metadata?, buffers? }`
 *   where `buffers` supplies uncompressed GPU bytes for each BufferView
 *   `index` (as `{ index, data }` entries or an index-keyed array).
 * @param {object} [options] `compress` (default false for the sync writer)
 *   enables meshoptimizer vertex/index compression.
 * @returns {Uint8Array} Complete .cmf file bytes.
 */
export function writeCmf(graph, options = {})
{
    if (!graph || typeof graph !== "object")
    {
        throw writeError("input graph must be an object");
    }
    if ((graph.skeletons ?? []).some(skeleton =>
        (skeleton?.bones ?? []).some(bone => typeof bone !== "string")))
    {
        throw writeError(
            "skeleton bones must be name strings; GR2-shaped skeletons need conversion (use writeShared) before writing"
        );
    }
    validateCmfGraph(graph, { phase: "write" });
    const compress = options.compress === true;

    const records = collectBufferRecords(graph, compress);
    const compressed = records.map((record) =>
    {
        const bytes = resolveBufferBytes(graph, record);
        return { record, ...compressBuffer(bytes, record), uncompressedSize: bytes.byteLength };
    });
    const remap = new Map(records.map((record, position) => [ record.index, position + 1 ]));

    const data = new Flattener();
    data.reserve(STRUCT_SIZE.Data);
    writeData(data, 0, graph, remap);
    const dataBytes = data.bytes();

    let metadataBytes = null;
    if (graph.metadata && (graph.metadata.entries || []).length)
    {
        const metadata = new Flattener();
        metadata.reserve(STRUCT_SIZE.Metadata);
        metadata.span(0, graph.metadata.entries, STRUCT_SIZE.MetadataEntry, (target, offset, entry) =>
        {
            target.string(offset, entry.key);
            target.string(offset + 16, entry.value);
        });
        metadataBytes = metadata.bytes();
    }

    const sections = [
        { type: "Data", compression: "None", gpuAlignment: 0, compressedSize: dataBytes.byteLength, uncompressedSize: dataBytes.byteLength, data: dataBytes }
    ];
    for (const entry of compressed)
    {
        sections.push({
            type: "GpuBuffer",
            compression: entry.compression,
            gpuAlignment: entry.gpuAlignment,
            compressedSize: entry.data.byteLength,
            uncompressedSize: entry.uncompressedSize,
            data: entry.data
        });
    }
    if (metadataBytes)
    {
        sections.push({ type: "Metadata", compression: "None", gpuAlignment: 0, compressedSize: metadataBytes.byteLength, uncompressedSize: metadataBytes.byteLength, data: metadataBytes });
    }

    const header = new Flattener();
    header.reserve(STRUCT_SIZE.Header);
    header.u32(0, FILE_SIGNATURE);
    header.u32(4, FILE_VERSION);
    header.span(16, sections, STRUCT_SIZE.Section, () => {});
    const headerSize = header.size;
    header.u32(8, headerSize);

    let offset = headerSize;
    const sectionOffsets = sections.map((section) =>
    {
        offset = Math.ceil(offset / 8) * 8;
        const sectionOffset = offset;
        offset += section.compressedSize;
        return sectionOffset;
    });

    const sectionsChunk = headerSize - sections.length * STRUCT_SIZE.Section;
    sections.forEach((section, index) =>
    {
        const base = sectionsChunk + index * STRUCT_SIZE.Section;
        header.u32(base, sectionOffsets[index]);
        header.u32(base + 4, section.compressedSize);
        header.u32(base + 8, section.uncompressedSize);
        header.u16(base + 12, section.gpuAlignment || 0);
        header.u8(base + 14, enumValue(SectionType, section.type, "section type"));
        header.u8(base + 15, enumValue(SectionCompression, section.compression, "section compression"));
    });

    const total = offset;
    const file = new Uint8Array(total);
    file.set(header.bytes(), 0);
    sections.forEach((section, index) =>
    {
        file.set(section.data, sectionOffsets[index]);
    });

    const checksum = crc32(file, 16, file.byteLength);
    new DataView(file.buffer).setUint32(12, checksum, true);
    // Carbon validates every produced file at its save boundary. Re-read the
    // structural result here as the writer's equivalent postcondition; source
    // buffer finiteness was already checked by validateCmfGraph above.
    readCmf(file, { decodeBuffers: false, validateCrc: true });
    return file;
}

/**
 * Serialize a CMF-native graph asynchronously with compression enabled by
 * default (awaits meshoptimizer encoder initialization).
 *
 * @param {object} graph Native graph (see `writeCmf`).
 * @param {object} [options] `compress` defaults to true.
 * @returns {Promise<Uint8Array>} Complete .cmf file bytes.
 */
export async function writeCmfAsync(graph, options = {})
{
    await MeshoptEncoder.ready;
    encoderReady = true;
    return writeCmf(graph, { ...options, compress: options.compress !== false });
}
