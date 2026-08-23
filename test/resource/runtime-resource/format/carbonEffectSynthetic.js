/**
 * Synthetic v15 Carbon effect description records for self-contained tests.
 *
 * Game assets are never committed (org rule), so the always-green proof runs on
 * records built here. The shape deliberately exercises every record type the
 * v15 layout has, including the ones a simple effect never reaches: static
 * samplers, UAVs, stage and effect annotations of every value type, render
 * states, and a raytracing library with both stage-data blocks.
 */

import { CARBON_ANNOTATION_TYPE } from "../../../../src/resource/format/carbonEffect/carbonEffectRecords.js";

/**
 * Builds a string reference in the shape the record reader produces.
 *
 * @param {string} value Text value.
 * @returns {{offset:number, value:string}} String reference.
 */
export function str(value)
{
    return { offset: 0, value: String(value) };
}

/**
 * Builds a blob reference in the shape the record reader produces.
 *
 * A zero-size blob keeps Carbon's null offset: the writer leaves the reference
 * unset and the reader consumes the word without dereferencing it.
 *
 * @param {number[]|Uint8Array} bytes Blob bytes.
 * @returns {{size:number, offset:number, bytes:Uint8Array}} Blob reference.
 */
export function blob(bytes)
{
    const owned = bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes);
    return {
        size: owned.length,
        offset: owned.length === 0 ? 0xffffffff : 0,
        bytes: owned
    };
}

/**
 * Builds a stage-data block with every sub-record populated.
 *
 * @param {object} [options] Shape options.
 * @param {string} [options.label] Prefix used to make names distinct.
 * @param {boolean} [options.withDefaults] Include default constant values.
 * @returns {object} Stage data record.
 */
export function stageData(options = {})
{
    const label = options.label ?? "A";
    return {
        registers: [
            { registerType: 0, registerIndex: 0, registerCount: 1, registerSpace: 0 },
            { registerType: 3, registerIndex: 7, registerCount: 4, registerSpace: 2 }
        ],
        staticSamplers: [
            {
                registerIndex: 5,
                registerSpace: 1,
                comparison: 1,
                minFilter: 2,
                magFilter: 2,
                mipFilter: 1,
                addressU: 3,
                addressV: 3,
                addressW: 0,
                mipLODBias: -0.5,
                maxAnisotropy: 16,
                comparisonFunc: 4,
                borderColor: 2,
                minLOD: 0,
                maxLOD: 3.5
            }
        ],
        constants: [
            {
                name: str(`${label}Constant`),
                offset: 0,
                size: 16,
                type: 0,
                dimension: 4,
                elements: 1,
                isSRGB: 0,
                isAutoregister: 1
            },
            {
                name: str(`${label}SamplerIndex`),
                offset: 16,
                size: 4,
                type: 2,
                dimension: 1,
                elements: 1,
                isSRGB: 0,
                isAutoregister: 0
            }
        ],
        defaultValues: options.withDefaults === false
            ? blob([])
            : blob([ 0, 0, 128, 63, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 128, 63, 3, 0, 0, 0 ]),
        textures: [
            {
                registerIndex: 0,
                name: str(`${label}DiffuseMap`),
                type: 1,
                count: 1,
                isSRGB: 1,
                isAutoregister: 0
            },
            {
                registerIndex: 4,
                name: str(`${label}DetailArray`),
                type: 4,
                count: 3,
                isSRGB: 0,
                isAutoregister: 1
            }
        ],
        samplers: [
            {
                registerIndex: 0,
                name: str(`${label}DiffuseSampler`),
                comparison: 0,
                minFilter: 2,
                magFilter: 2,
                mipFilter: 2,
                addressU: 1,
                addressV: 1,
                addressW: 1,
                mipLODBias: 0.25,
                maxAnisotropy: 8,
                comparisonFunc: 0,
                borderColor: [ 0, 0.5, 1, 1 ],
                minLOD: 0,
                maxLOD: 16,
                isDynamic: 1
            }
        ],
        uavs: [
            {
                registerIndex: 2,
                name: str(`${label}Accumulator`),
                type: 6,
                count: 1,
                isAutoregister: 0
            }
        ],
        annotations: [
            // Carbon sorts annotation keys by strcmp before writing them.
            { name: str("IsHeapView"), type: CARBON_ANNOTATION_TYPE.BOOL, stringValue: null, rawValue: Uint8Array.of(1, 0, 0, 0) },
            { name: str("Order"), type: CARBON_ANNOTATION_TYPE.INT, stringValue: null, rawValue: Uint8Array.of(7, 0, 0, 0) },
            { name: str("Scale"), type: CARBON_ANNOTATION_TYPE.FLOAT, stringValue: null, rawValue: Uint8Array.of(0, 0, 0, 64) },
            { name: str("Usage"), type: CARBON_ANNOTATION_TYPE.STRING, stringValue: str("diffuse"), rawValue: null }
        ]
    };
}

/**
 * Builds one stage record.
 *
 * @param {number} type Stage type byte.
 * @param {object} [options] Shape options.
 * @param {string} [options.label] Prefix used to make names distinct.
 * @param {number[]} [options.threadGroupSize] Compute thread group size.
 * @param {number[]|Uint8Array} [options.program] Program payload bytes.
 * @returns {object} Stage record.
 */
export function stage(type, options = {})
{
    const label = options.label ?? "A";
    return {
        type,
        shaderData: blob(options.program ?? [ 0x44, 0x58, 0x42, 0x43, type ]),
        threadGroupSize: options.threadGroupSize ?? [ 0, 0, 0 ],
        pipelineInputs: [
            { usage: 0, registerIndex: 0, usageIndex: 0, usedMask: 0x0f, type: 0, dimension: 4 },
            { usage: 5, registerIndex: 1, usageIndex: 0, usedMask: 0x03, type: 0, dimension: 2 }
        ],
        ...stageData({ label })
    };
}

/**
 * Builds a description record tree covering every v15 record type.
 *
 * @param {object} [options] Shape options.
 * @param {string} [options.label] Prefix used to make names distinct.
 * @returns {object} Description record tree.
 */
export function buildSyntheticDescription(options = {})
{
    const label = options.label ?? "A";
    return {
        techniques: [
            {
                name: str("Main"),
                passes: [
                    {
                        stages: [ stage(0, { label }), stage(1, { label: `${label}P` }) ],
                        renderStates: [
                            { state: 3, value: 1 },
                            { state: 17, value: 0x80000000 }
                        ]
                    },
                    {
                        stages: [ stage(2, { label: `${label}C`, threadGroupSize: [ 8, 8, 1 ] }) ],
                        renderStates: []
                    }
                ],
                libraries: []
            },
            {
                name: str("Raytrace"),
                passes: [
                    {
                        stages: [ stage(0, { label: `${label}R` }) ],
                        renderStates: [ { state: 1, value: 2 } ]
                    }
                ],
                libraries: [
                    {
                        payloadSize: 32,
                        shaderData: blob([ 0x44, 0x58, 0x49, 0x4c, 1, 2, 3 ]),
                        exports: [
                            { type: 0, name: str("RayGen") },
                            { type: 2, name: str("ClosestHit") }
                        ],
                        hitGroupName: str("HitGroup"),
                        globalInputs: stageData({ label: `${label}G` }),
                        localInputs: stageData({ label: `${label}L`, withDefaults: false })
                    }
                ]
            }
        ],
        annotations: [
            {
                name: str(`${label}DiffuseMap`),
                annotations: [
                    { name: str("IsHeapView"), type: CARBON_ANNOTATION_TYPE.BOOL, stringValue: null, rawValue: Uint8Array.of(1, 0, 0, 0) }
                ]
            },
            {
                name: str(`${label}DetailArray`),
                annotations: [
                    { name: str("Layers"), type: CARBON_ANNOTATION_TYPE.INT, stringValue: null, rawValue: Uint8Array.of(3, 0, 0, 0) }
                ]
            }
        ]
    };
}

/** The permutation axes used by the synthetic container: 2 x 2 = 4 permutations. */
export const SYNTHETIC_PERMUTATIONS = Object.freeze([
    Object.freeze({
        name: "SKINNED",
        defaultOption: 0,
        description: "Skinned geometry",
        type: 1,
        options: Object.freeze([ "0", "1" ])
    }),
    Object.freeze({
        name: "DETAIL",
        defaultOption: 1,
        description: "Detail maps",
        type: 0,
        options: Object.freeze([ "off", "on" ])
    })
]);
