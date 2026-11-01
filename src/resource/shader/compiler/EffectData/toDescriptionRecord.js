import { Annotation } from "./Annotation.js";
// Source: trinity/shadercompiler/EffectData.h (the Save methods, :160-854)
//
// Not in Carbon: EffectData's structs save themselves into a PackedStream.
// The runtime's Carbon effect writer already ports that serialisation over a
// record tree (runtime carbonEffectRecords.js writeEffectDescription), so a
// compiled EffectData is mapped onto those records rather than serialised a
// second time. Register maps keep Carbon's iteration order: CjsFxStdMap
// iterates as std::map does. Annotation maps are saved sorted by name with
// `strcmp` (EffectData.h:605-620, :834-848), so they are sorted here by UTF-8
// bytes, which is the order `strcmp` gives.


/** An empty blob, as Carbon saves one: size 0 and an unset offset. */
const EMPTY_BLOB = Object.freeze({ size: 0, offset: 0xffffffff, bytes: new Uint8Array(0) });

/**
 * A blob record from program text or bytes.
 *
 * @param {Uint8Array|string|null} data The bytes, or text saved as UTF-8.
 * @returns {{ size: number, offset: number, bytes: Uint8Array }} The blob.
 */
function blob(data)
{
    if (data === null || data.length === 0)
    {
        return EMPTY_BLOB;
    }
    const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
    return { size: bytes.length, offset: 0, bytes };
}

/**
 * A string record.
 *
 * @param {string} value The text.
 * @returns {{ value: string }} The record.
 */
function text(value)
{
    return { value };
}

/**
 * Annotation records from a `ParameterAnnotation`, in name order.
 *
 * @param {import("./ParameterAnnotation.js").ParameterAnnotation} parameter The annotations.
 * @returns {object[]} The records.
 */
function annotationRecords(parameter)
{
    const records = [];
    for (const [name, annotation] of byName([...parameter.annotations]))
    {
        const record = { name: text(name), type: annotation.type, stringValue: null, rawValue: null };
        if (annotation.type === Annotation.AnnotationType.ANNOTATION_TYPE_STRING)
        {
            record.stringValue = text(annotation.stringValue);
        }
        else
        {
            const raw = new Uint8Array(4);
            new DataView(raw.buffer).setUint32(0, annotation.GetBits(), true);
            record.rawValue = raw;
        }
        records.push(record);
    }
    return records;
}

/**
 * The record of a `StageData`: registers, samplers, constants, resources and
 * annotations, in `StageData::Save`'s order.
 *
 * @param {import("./StageData.js").StageData} data The stage data.
 * @returns {object} The record fields.
 */
function stageDataRecord(data)
{
    return {
        registers: data.registerInputs.map(r => ({
            registerType: r.registerType,
            registerIndex: r.registerIndex,
            registerCount: r.registerCount,
            registerSpace: r.registerSpace
        })),
        staticSamplers: data.staticSamplers.map(s => ({ ...s })),
        constants: data.constants.map(c => ({
            name: text(c.name),
            offset: c.offset,
            size: c.size,
            type: c.type,
            dimension: c.dimension,
            elements: c.elements,
            isSRGB: c.isSRGB ? 1 : 0,
            isAutoregister: c.isAutoregister ? 1 : 0
        })),
        defaultValues: blob(data.defaultValues),
        textures: [...data.textures].map(([registerIndex, t]) => ({
            registerIndex,
            name: text(t.name),
            type: t.type,
            count: t.count,
            isSRGB: t.isSRGB ? 1 : 0,
            isAutoregister: t.isAutoregister ? 1 : 0
        })),
        samplers: [...data.samplers].map(([registerIndex, s]) => ({
            registerIndex,
            name: text(s.name),
            comparison: s.comparison,
            minFilter: s.minFilter,
            magFilter: s.magFilter,
            mipFilter: s.mipFilter,
            addressU: s.addressU,
            addressV: s.addressV,
            addressW: s.addressW,
            mipLODBias: s.mipLODBias,
            maxAnisotropy: s.maxAnisotropy,
            comparisonFunc: s.comparisonFunc,
            borderColor: [s.borderColor.x, s.borderColor.y, s.borderColor.z, s.borderColor.w],
            minLOD: s.minLOD,
            maxLOD: s.maxLOD,
            isDynamic: s.isDynamic
        })),
        uavs: [...data.uavs].map(([registerIndex, u]) => ({
            registerIndex,
            name: text(u.name),
            type: u.type,
            count: u.count,
            isAutoregister: u.isAutoregister ? 1 : 0
        })),
        annotations: annotationRecords(data.annotations)
    };
}

/**
 * Map entries sorted by name as `strcmp` orders them: by UTF-8 byte.
 *
 * @template T
 * @param {Array<[string, T]>} entries The entries.
 * @returns {Array<[string, T]>} The entries, sorted.
 */
function byName(entries)
{
    const encoder = new TextEncoder();
    const keyed = entries.map(entry => ({ entry, bytes: encoder.encode(entry[0]) }));
    keyed.sort((a, b) =>
    {
        const length = Math.min(a.bytes.length, b.bytes.length);
        for (let i = 0; i < length; ++i)
        {
            if (a.bytes[i] !== b.bytes[i])
            {
                return a.bytes[i] - b.bytes[i];
            }
        }
        return a.bytes.length - b.bytes.length;
    });
    return keyed.map(k => k.entry);
}

/**
 * The runtime's description record for one compiled permutation.
 *
 * @param {import("./EffectData.js").EffectData} data The permutation's EffectData.
 * @returns {object} The record tree `writeEffectDescription` takes.
 */
export function toDescriptionRecord(data)
{
    return {
        techniques: data.techniques.map(technique => ({
            name: text(technique.name),
            passes: technique.passes.map(pass => ({
                stages: pass.stages.map(stage => ({
                    type: stage.type,
                    shaderData: blob(stage.shaderData),
                    threadGroupSize: [...stage.threadGroupSize],
                    pipelineInputs: stage.pipelineInputs.map(input => ({
                        usage: input.name,
                        registerIndex: input.registerIndex,
                        usageIndex: input.index,
                        usedMask: input.usedMask,
                        type: input.type,
                        dimension: input.dimension
                    })),
                    ...stageDataRecord(stage)
                })),
                renderStates: [...pass.states].map(([state, value]) => ({ state, value })),
                backendBlock: pass.backendBlock ? blob(pass.backendBlock) : null
            })),
            libraries: technique.libraries.map(library => ({
                payloadSize: library.payloadSize,
                shaderData: blob(library.shaderData),
                exports: library.exports.map(e => ({ type: e.type, name: text(e.name) })),
                hitGroupName: text(library.hitGroupName),
                globalInputs: stageDataRecord(library.globalInputs),
                localInputs: stageDataRecord(library.localInputs)
            }))
        })),
        annotations: byName([...data.annotations]).map(([name, parameter]) => ({ name: text(name), annotations: annotationRecords(parameter) }))
    };
}
