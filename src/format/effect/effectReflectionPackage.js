import {
    buildEffectBodyReflection,
    EFFECT_BODY_REFLECTION_FORMAT,
    EFFECT_BODY_REFLECTION_VERSION,
    enumerateUniqueEffectBodies,
    validateEffectBodyReflection
} from "../../formats/hlsl/portable.js";

import { sha256Bytes, sha256Utf8 } from "./sha256.js";

export const EFFECT_REFLECTION_CHUNK = "RFLX";
export const EFFECT_REFLECTION_BLOB_CHUNK = "RBLB";
export const EFFECT_REFLECTION_FORMAT = "CJS_EFFECT_REFLECTION";
export const EFFECT_REFLECTION_VERSION = 2;

const SHA256 = /^[0-9a-f]{64}$/u;
const SELECTED_EFFECT_REFLECTION_VERSION = 1;

/**
 * Build selected-body source reflection plus its deduplicated binary store.
 *
 * @param {object} effectRes Loaded format-hlsl Tr2EffectRes.
 * @param {number} permutationIndex Exact selected permutation-table index.
 * @param {object} permutationGraph Complete source PGRF document.
 * @param {object} options Source identity and diagnostic label.
 * @param {object} options.sourceIdentity Canonical INFO source identity.
 * @param {string} options.sourcePath Diagnostic INFO/META/ANLS source label.
 * @returns {{reflection:object,blobBytes:Uint8Array,pointer:object,counts:object}}
 *   Frozen reflection documents and owned blob bytes.
 */
export function buildSelectedEffectReflection(
    effectRes,
    permutationIndex,
    permutationGraph,
    options
)
{
    const portable = buildEffectBodyReflection(effectRes, permutationIndex);
    const portableCounts = validateEffectBodyReflection(portable);
    const sourceBytes = effectRes.m_data;
    if (!(sourceBytes instanceof Uint8Array)
        || options?.sourceIdentity?.byteLength !== sourceBytes.byteLength
        || options?.sourceIdentity?.sha256 !== sha256Bytes(sourceBytes))
    {
        throw new Error(
            "Selected effect reflection source identity disagrees with exact source bytes"
        );
    }
    const store = new ReflectionBlobStore();
    const source = {
        label: portable.source.label,
        effectVersion: portable.source.effectVersion,
        compilerVersion: portable.source.compilerVersion,
        nativeHash: store.add(portable.source.nativeHash),
        stringTableByteLength: portable.source.stringTableByteLength,
        byteLength: portable.source.byteLength,
        sha256: options?.sourceIdentity?.sha256
    };
    const effect = packByteArrays(portable.effect, store);
    const blobBytes = store.finish();
    const variant = selectedVariant(permutationGraph, permutationIndex);
    const body = selectedBody(permutationGraph, variant.bodyKey);
    const exactBodyBytes = sourceBytes.subarray(
        portable.sourceRecord.offset,
        portable.sourceRecord.offset + portable.sourceRecord.byteLength
    );
    if (body.byteLength !== exactBodyBytes.byteLength
        || body.sha256 !== sha256Bytes(exactBodyBytes))
    {
        throw new Error(
            "Selected effect reflection PGRF body identity disagrees with exact source bytes"
        );
    }
    const reflection = {
        format: EFFECT_REFLECTION_FORMAT,
        formatVersion: SELECTED_EFFECT_REFLECTION_VERSION,
        portableFormat: EFFECT_BODY_REFLECTION_FORMAT,
        portableFormatVersion: EFFECT_BODY_REFLECTION_VERSION,
        keyScope: portable.keyScope,
        coverage: {
            bodies: "selected",
            reflection: "complete-for-listed",
            sourcePrograms: "complete-for-listed",
            constantDefaults: "exact-for-listed"
        },
        selectedBody: {
            permutationIndex,
            bodyKey: variant.bodyKey,
            sourceRecord: {
                offset: portable.sourceRecord.offset,
                byteLength: portable.sourceRecord.byteLength
            },
            byteLength: body.byteLength,
            sha256: body.sha256
        },
        source,
        effect,
        blobStore: {
            chunk: EFFECT_REFLECTION_BLOB_CHUNK,
            byteLength: blobBytes.byteLength,
            sha256: sha256Bytes(blobBytes),
            blobCount: store.entries.length,
            blobs: store.entries.map((entry) => ({ ...entry }))
        }
    };
    const counts = validateSelectedEffectReflection(
        reflection,
        blobBytes,
        {
            permutationGraph,
            permutationIndex,
            sourceIdentity: options?.sourceIdentity,
            sourcePath: options?.sourcePath
        }
    );
    if (counts.sourceProgramCount !== portableCounts.sourceProgramCount)
    {
        throw new Error(
            "Selected effect reflection source-program count changed while packing"
        );
    }
    const pointer = {
        chunk: EFFECT_REFLECTION_CHUNK,
        format: EFFECT_REFLECTION_FORMAT,
        formatVersion: SELECTED_EFFECT_REFLECTION_VERSION,
        blobChunk: EFFECT_REFLECTION_BLOB_CHUNK,
        bodyCount: 1,
        sourceProgramCount: counts.sourceProgramCount,
        blobCount: counts.blobCount,
        blobByteLength: counts.blobByteLength
    };

    return Object.freeze({
        reflection: deepFreeze(reflection),
        blobBytes,
        pointer: Object.freeze(pointer),
        counts
    });
}

/**
 * Build complete unique-body source reflection plus one deduplicated byte
 * arena while retaining body-local portable keys.
 *
 * @param {object} effectRes Loaded format-hlsl Tr2EffectRes.
 * @param {object} permutationGraph Complete source PGRF document.
 * @param {object} options Source identity and diagnostic label.
 * @param {object} options.sourceIdentity Canonical INFO source identity.
 * @param {string} options.sourcePath Diagnostic INFO/META/ANLS source label.
 * @returns {{reflection:object,blobBytes:Uint8Array,pointer:object,counts:object}}
 *   Frozen all-unique reflection documents and owned blob bytes.
 */
export function buildCompleteEffectReflection(
    effectRes,
    permutationGraph,
    options
)
{
    const sourceBytes = effectRes?.m_data;
    if (!(sourceBytes instanceof Uint8Array)
        || options?.sourceIdentity?.byteLength !== sourceBytes.byteLength
        || options?.sourceIdentity?.sha256 !== sha256Bytes(sourceBytes))
    {
        throw new Error(
            "Complete effect reflection source identity disagrees with exact source bytes"
        );
    }

    const inventory = enumerateUniqueEffectBodies(effectRes);
    if (inventory.length !== permutationGraph?.bodies?.length)
    {
        throw new Error(
            "Complete effect reflection body inventory disagrees with PGRF"
        );
    }

    const store = new ReflectionBlobStore();
    let source = null;
    const bodies = inventory.map((group, bodyIndex) =>
    {
        const graphBody = permutationGraph.bodies[bodyIndex];
        const representative = selectedVariant(
            permutationGraph,
            group.permutationIndex
        );
        if (representative.bodyKey !== graphBody?.key
            || group.variants.some((variant) =>
            {
                const graphVariant = selectedVariant(
                    permutationGraph,
                    variant.permutationIndex
                );
                return graphVariant.bodyKey !== graphBody.key
                    || graphVariant.sourceRecord.offset
                        !== variant.sourceRecord.offset
                    || graphVariant.sourceRecord.byteLength
                        !== variant.sourceRecord.byteLength;
            }))
        {
            throw new Error(
                `Complete effect reflection body ${bodyIndex} aliases disagree with PGRF`
            );
        }

        const portable = buildEffectBodyReflection(
            effectRes,
            group.permutationIndex
        );
        if (portable.sourceRecord.offset !== group.sourceRecord.offset
            || portable.sourceRecord.byteLength !== group.sourceRecord.byteLength)
        {
            throw new Error(
                `Complete effect reflection body ${bodyIndex} source record changed`
            );
        }
        if (!source)
        {
            source = {
                label: portable.source.label,
                effectVersion: portable.source.effectVersion,
                compilerVersion: portable.source.compilerVersion,
                nativeHash: store.add(portable.source.nativeHash),
                stringTableByteLength: portable.source.stringTableByteLength,
                byteLength: portable.source.byteLength,
                sha256: options.sourceIdentity.sha256
            };
        }
        else if (!samePortableSource(source, portable.source, store))
        {
            throw new Error(
                `Complete effect reflection body ${bodyIndex} source envelope changed`
            );
        }

        const exactBodyBytes = sourceBytes.subarray(
            portable.sourceRecord.offset,
            portable.sourceRecord.offset + portable.sourceRecord.byteLength
        );
        if (graphBody.byteLength !== exactBodyBytes.byteLength
            || graphBody.sha256 !== sha256Bytes(exactBodyBytes))
        {
            throw new Error(
                `Complete effect reflection body ${bodyIndex} identity disagrees with PGRF`
            );
        }
        return {
            bodyKey: graphBody.key,
            representativePermutationIndex: group.permutationIndex,
            byteLength: graphBody.byteLength,
            sha256: graphBody.sha256,
            effect: packByteArrays(portable.effect, store)
        };
    });
    const blobBytes = store.finish();
    const reflection = {
        format: EFFECT_REFLECTION_FORMAT,
        formatVersion: EFFECT_REFLECTION_VERSION,
        portableFormat: EFFECT_BODY_REFLECTION_FORMAT,
        portableFormatVersion: EFFECT_BODY_REFLECTION_VERSION,
        keyScope: "body-local",
        coverage: {
            bodies: "all-unique",
            reflection: "complete-for-listed",
            sourcePrograms: "complete-for-listed",
            constantDefaults: "exact-for-listed"
        },
        source,
        bodies,
        blobStore: {
            chunk: EFFECT_REFLECTION_BLOB_CHUNK,
            byteLength: blobBytes.byteLength,
            sha256: sha256Bytes(blobBytes),
            blobCount: store.entries.length,
            blobs: store.entries.map((entry) => ({ ...entry }))
        }
    };
    const counts = validateCompleteEffectReflection(
        reflection,
        blobBytes,
        {
            permutationGraph,
            sourceIdentity: options.sourceIdentity,
            sourcePath: options.sourcePath
        }
    );
    const pointer = {
        chunk: EFFECT_REFLECTION_CHUNK,
        format: EFFECT_REFLECTION_FORMAT,
        formatVersion: EFFECT_REFLECTION_VERSION,
        blobChunk: EFFECT_REFLECTION_BLOB_CHUNK,
        sha256: sha256Utf8(`${JSON.stringify(reflection)}\n`),
        coverage: "all-unique",
        permutationCount: permutationGraph.variants.length,
        bodyCount: counts.bodyCount,
        sourceProgramCount: counts.sourceProgramCount,
        blobCount: counts.blobCount,
        blobByteLength: counts.blobByteLength
    };

    return Object.freeze({
        reflection: deepFreeze(reflection),
        blobBytes,
        pointer: Object.freeze(pointer),
        counts
    });
}

/**
 * Validate selected-body reflection against its binary store, PGRF, and INFO
 * source identity.
 *
 * @param {object} reflection Parsed RFLX document.
 * @param {Uint8Array} blobBytes Raw RBLB chunk bytes.
 * @param {object} options Reconciliation context.
 * @param {object} options.permutationGraph Validated complete PGRF document.
 * @param {number} options.permutationIndex Package-selected permutation index.
 * @param {object} options.sourceIdentity Validated INFO source identity.
 * @param {string} options.sourcePath Validated INFO source label.
 * @returns {{bodyCount:number,sourceProgramCount:number,blobCount:number,blobByteLength:number}}
 *   Validated selected reflection counts.
 */
export function validateSelectedEffectReflection(
    reflection,
    blobBytes,
    options
)
{
    requireExactKeys(reflection, [
        "format",
        "formatVersion",
        "portableFormat",
        "portableFormatVersion",
        "keyScope",
        "coverage",
        "selectedBody",
        "source",
        "effect",
        "blobStore"
    ], "CEWGPU RFLX");
    requireExactKeys(reflection.coverage, [
        "bodies",
        "reflection",
        "sourcePrograms",
        "constantDefaults"
    ], "CEWGPU RFLX.coverage");
    if (reflection.format !== EFFECT_REFLECTION_FORMAT
        || reflection.formatVersion !== SELECTED_EFFECT_REFLECTION_VERSION
        || reflection.portableFormat !== EFFECT_BODY_REFLECTION_FORMAT
        || reflection.portableFormatVersion !== EFFECT_BODY_REFLECTION_VERSION
        || reflection.keyScope !== "body-local"
        || reflection.coverage.bodies !== "selected"
        || reflection.coverage.reflection !== "complete-for-listed"
        || reflection.coverage.sourcePrograms !== "complete-for-listed"
        || reflection.coverage.constantDefaults !== "exact-for-listed")
    {
        throw new Error("CEWGPU RFLX schema or coverage is unsupported");
    }

    const graph = requireRecord(
        options?.permutationGraph,
        "CEWGPU RFLX permutation graph"
    );
    const sourceIdentity = requireRecord(
        options?.sourceIdentity,
        "CEWGPU RFLX source identity"
    );
    const sourcePath = requireString(
        options?.sourcePath,
        "CEWGPU RFLX sourcePath"
    );
    const selected = requireRecord(
        reflection.selectedBody,
        "CEWGPU RFLX.selectedBody"
    );
    requireExactKeys(selected, [
        "permutationIndex",
        "bodyKey",
        "sourceRecord",
        "byteLength",
        "sha256"
    ], "CEWGPU RFLX.selectedBody");
    requireUint(selected.permutationIndex, "CEWGPU RFLX selected permutationIndex");
    if (selected.permutationIndex !== options?.permutationIndex)
    {
        throw new Error("CEWGPU RFLX selected body disagrees with META");
    }
    requireString(selected.bodyKey, "CEWGPU RFLX selected bodyKey");
    requireUint(selected.byteLength, "CEWGPU RFLX selected byteLength", true);
    requireSha256(selected.sha256, "CEWGPU RFLX selected sha256");
    const sourceRecord = requireRecord(
        selected.sourceRecord,
        "CEWGPU RFLX selected sourceRecord"
    );
    requireExactKeys(
        sourceRecord,
        [ "offset", "byteLength" ],
        "CEWGPU RFLX selected sourceRecord"
    );
    requireUint(sourceRecord.offset, "CEWGPU RFLX selected sourceRecord offset");
    requireUint(
        sourceRecord.byteLength,
        "CEWGPU RFLX selected sourceRecord byteLength",
        true
    );

    const variant = selectedVariant(graph, selected.permutationIndex);
    const body = selectedBody(graph, selected.bodyKey);
    if (variant.bodyKey !== selected.bodyKey
        || variant.sourceRecord.offset !== sourceRecord.offset
        || variant.sourceRecord.byteLength !== sourceRecord.byteLength
        || selected.byteLength !== body.byteLength
        || sourceRecord.byteLength !== body.byteLength
        || selected.sha256 !== body.sha256)
    {
        throw new Error("CEWGPU RFLX selected body disagrees with PGRF");
    }

    const source = requireRecord(reflection.source, "CEWGPU RFLX.source");
    requireExactKeys(source, [
        "label",
        "effectVersion",
        "compilerVersion",
        "nativeHash",
        "stringTableByteLength",
        "byteLength",
        "sha256"
    ], "CEWGPU RFLX.source");
    if (source.label !== sourcePath
        || source.byteLength !== sourceIdentity.byteLength
        || source.sha256 !== sourceIdentity.sha256)
    {
        throw new Error("CEWGPU RFLX source identity disagrees with INFO");
    }
    requireSha256(source.sha256, "CEWGPU RFLX source sha256");

    const blobInventory = validateBlobStore(reflection.blobStore, blobBytes);
    const usedBlobKeys = new Set();
    const portable = {
        format: reflection.portableFormat,
        formatVersion: reflection.portableFormatVersion,
        mode: "single-body",
        keyScope: reflection.keyScope,
        coverage: {
            bodies: "single",
            reflection: "complete",
            sourcePrograms: "complete",
            constantDefaults: "exact"
        },
        source: {
            label: source.label,
            effectVersion: source.effectVersion,
            compilerVersion: source.compilerVersion,
            nativeHash: unpackBlobReference(
                source.nativeHash,
                blobInventory,
                blobBytes,
                usedBlobKeys
            ),
            stringTableByteLength: source.stringTableByteLength,
            byteLength: source.byteLength
        },
        permutationIndex: selected.permutationIndex,
        sourceRecord: {
            offset: sourceRecord.offset,
            byteLength: sourceRecord.byteLength
        },
        effect: unpackByteReferences(
            reflection.effect,
            blobInventory,
            blobBytes,
            usedBlobKeys
        )
    };
    const portableCounts = validateEffectBodyReflection(portable);
    if (usedBlobKeys.size !== blobInventory.size)
    {
        throw new Error("CEWGPU RFLX blob store contains unreferenced payloads");
    }

    return Object.freeze({
        bodyCount: 1,
        sourceProgramCount: portableCounts.sourceProgramCount,
        blobCount: blobInventory.size,
        blobByteLength: blobBytes.byteLength
    });
}

/**
 * Validate complete unique-body reflection against PGRF and its shared byte
 * arena.
 *
 * @param {object} reflection Parsed RFLX v2 document.
 * @param {Uint8Array} blobBytes Raw RBLB bytes.
 * @param {object} options Reconciliation context.
 * @param {object} options.permutationGraph Validated complete PGRF document.
 * @param {object} options.sourceIdentity Validated INFO source identity.
 * @param {string} options.sourcePath Validated INFO source label.
 * @returns {{permutationCount:number,bodyCount:number,sourceProgramCount:number,blobCount:number,blobByteLength:number}}
 *   Validated complete source-reflection counts.
 */
export function validateCompleteEffectReflection(
    reflection,
    blobBytes,
    options
)
{
    requireExactKeys(reflection, [
        "format",
        "formatVersion",
        "portableFormat",
        "portableFormatVersion",
        "keyScope",
        "coverage",
        "source",
        "bodies",
        "blobStore"
    ], "CEWGPU RFLX");
    requireExactKeys(reflection.coverage, [
        "bodies",
        "reflection",
        "sourcePrograms",
        "constantDefaults"
    ], "CEWGPU RFLX.coverage");
    if (reflection.format !== EFFECT_REFLECTION_FORMAT
        || reflection.formatVersion !== EFFECT_REFLECTION_VERSION
        || reflection.portableFormat !== EFFECT_BODY_REFLECTION_FORMAT
        || reflection.portableFormatVersion !== EFFECT_BODY_REFLECTION_VERSION
        || reflection.keyScope !== "body-local"
        || reflection.coverage.bodies !== "all-unique"
        || reflection.coverage.reflection !== "complete-for-listed"
        || reflection.coverage.sourcePrograms !== "complete-for-listed"
        || reflection.coverage.constantDefaults !== "exact-for-listed"
        || !Array.isArray(reflection.bodies))
    {
        throw new Error("CEWGPU RFLX schema or coverage is unsupported");
    }

    const graph = requireRecord(
        options?.permutationGraph,
        "CEWGPU RFLX permutation graph"
    );
    const sourceIdentity = requireRecord(
        options?.sourceIdentity,
        "CEWGPU RFLX source identity"
    );
    const sourcePath = requireString(
        options?.sourcePath,
        "CEWGPU RFLX sourcePath"
    );
    if (reflection.bodies.length !== graph.bodies?.length)
    {
        throw new Error("CEWGPU RFLX does not cover every PGRF body");
    }

    const source = requireRecord(reflection.source, "CEWGPU RFLX.source");
    requireExactKeys(source, [
        "label",
        "effectVersion",
        "compilerVersion",
        "nativeHash",
        "stringTableByteLength",
        "byteLength",
        "sha256"
    ], "CEWGPU RFLX.source");
    if (source.label !== sourcePath
        || source.byteLength !== sourceIdentity.byteLength
        || source.sha256 !== sourceIdentity.sha256)
    {
        throw new Error("CEWGPU RFLX source identity disagrees with INFO");
    }
    requireSha256(source.sha256, "CEWGPU RFLX source sha256");

    const blobInventory = validateBlobStore(reflection.blobStore, blobBytes);
    const usedBlobKeys = new Set();
    const nativeHash = unpackBlobReference(
        source.nativeHash,
        blobInventory,
        blobBytes,
        usedBlobKeys
    );
    const representativeByBodyKey = new Map();
    for (const variant of graph.variants)
    {
        if (!representativeByBodyKey.has(variant.bodyKey))
        {
            representativeByBodyKey.set(variant.bodyKey, variant);
        }
    }
    let sourceProgramCount = 0;
    for (const [ bodyIndex, reflectedBody ] of reflection.bodies.entries())
    {
        requireExactKeys(reflectedBody, [
            "bodyKey",
            "representativePermutationIndex",
            "byteLength",
            "sha256",
            "effect"
        ], `CEWGPU RFLX body ${bodyIndex}`);
        const graphBody = graph.bodies[bodyIndex];
        requireString(reflectedBody.bodyKey, `CEWGPU RFLX body ${bodyIndex} key`);
        requireUint(
            reflectedBody.representativePermutationIndex,
            `CEWGPU RFLX body ${bodyIndex} representative`
        );
        requireUint(
            reflectedBody.byteLength,
            `CEWGPU RFLX body ${bodyIndex} byteLength`,
            true
        );
        requireSha256(
            reflectedBody.sha256,
            `CEWGPU RFLX body ${bodyIndex} sha256`
        );
        const representative = representativeByBodyKey.get(
            reflectedBody.bodyKey
        );
        if (!graphBody
            || reflectedBody.bodyKey !== graphBody.key
            || reflectedBody.byteLength !== graphBody.byteLength
            || reflectedBody.sha256 !== graphBody.sha256
            || !representative
            || reflectedBody.representativePermutationIndex
                !== representative.permutationIndex)
        {
            throw new Error(
                `CEWGPU RFLX body ${bodyIndex} disagrees with PGRF`
            );
        }
        const portable = {
            format: reflection.portableFormat,
            formatVersion: reflection.portableFormatVersion,
            mode: "single-body",
            keyScope: reflection.keyScope,
            coverage: {
                bodies: "single",
                reflection: "complete",
                sourcePrograms: "complete",
                constantDefaults: "exact"
            },
            source: {
                label: source.label,
                effectVersion: source.effectVersion,
                compilerVersion: source.compilerVersion,
                nativeHash: Uint8Array.from(nativeHash),
                stringTableByteLength: source.stringTableByteLength,
                byteLength: source.byteLength
            },
            permutationIndex: representative.permutationIndex,
            sourceRecord: { ...representative.sourceRecord },
            effect: unpackByteReferences(
                reflectedBody.effect,
                blobInventory,
                blobBytes,
                usedBlobKeys
            )
        };
        sourceProgramCount += validateEffectBodyReflection(portable)
            .sourceProgramCount;
    }
    if (usedBlobKeys.size !== blobInventory.size)
    {
        throw new Error("CEWGPU RFLX blob store contains unreferenced payloads");
    }

    return Object.freeze({
        permutationCount: graph.variants.length,
        bodyCount: reflection.bodies.length,
        sourceProgramCount,
        blobCount: blobInventory.size,
        blobByteLength: blobBytes.byteLength
    });
}

/**
 * Validate an INFO reflection pointer against parsed RFLX/RBLB payloads.
 *
 * @param {object} pointer INFO reflection pointer.
 * @param {object} reflection Parsed RFLX document.
 * @param {Uint8Array} blobBytes Raw RBLB bytes.
 * @param {object} options Reconciliation context for RFLX.
 * @param {Uint8Array} [options.reflectionBytes] Exact RFLX chunk bytes for v2.
 * @returns {object} Validated reflection counts.
 */
export function validateEffectReflectionPointer(
    pointer,
    reflection,
    blobBytes,
    options
)
{
    const version = pointer?.formatVersion;
    requireExactKeys(pointer, version === EFFECT_REFLECTION_VERSION ? [
        "chunk",
        "format",
        "formatVersion",
        "blobChunk",
        "sha256",
        "coverage",
        "permutationCount",
        "bodyCount",
        "sourceProgramCount",
        "blobCount",
        "blobByteLength"
    ] : [
        "chunk",
        "format",
        "formatVersion",
        "blobChunk",
        "bodyCount",
        "sourceProgramCount",
        "blobCount",
        "blobByteLength"
    ], "CEWGPU INFO.effectReflection");
    if (pointer.chunk !== EFFECT_REFLECTION_CHUNK
        || pointer.format !== EFFECT_REFLECTION_FORMAT
        || ![
            SELECTED_EFFECT_REFLECTION_VERSION,
            EFFECT_REFLECTION_VERSION
        ].includes(version)
        || pointer.blobChunk !== EFFECT_REFLECTION_BLOB_CHUNK)
    {
        throw new Error("CEWGPU INFO.effectReflection is malformed");
    }
    for (const field of [
        "bodyCount",
        "sourceProgramCount",
        "blobCount",
        "blobByteLength"
    ])
    {
        requireUint(pointer[field], `CEWGPU INFO.effectReflection.${field}`);
    }

    let counts;
    if (version === EFFECT_REFLECTION_VERSION)
    {
        requireSha256(pointer.sha256, "CEWGPU INFO.effectReflection.sha256");
        if (!(options?.reflectionBytes instanceof Uint8Array)
            || sha256Bytes(options.reflectionBytes) !== pointer.sha256)
        {
            throw new Error(
                "CEWGPU INFO effect-reflection digest disagrees with RFLX"
            );
        }
        if (pointer.coverage !== "all-unique")
        {
            throw new Error("CEWGPU INFO.effectReflection is malformed");
        }
        requireUint(
            pointer.permutationCount,
            "CEWGPU INFO.effectReflection.permutationCount",
            true
        );
        counts = validateCompleteEffectReflection(
            reflection,
            blobBytes,
            options
        );
        if (pointer.permutationCount !== counts.permutationCount)
        {
            throw new Error(
                "CEWGPU INFO effect-reflection counts disagree with RFLX/RBLB"
            );
        }
    }
    else
    {
        counts = validateSelectedEffectReflection(
            reflection,
            blobBytes,
            options
        );
    }
    if (pointer.bodyCount !== counts.bodyCount
        || pointer.sourceProgramCount !== counts.sourceProgramCount
        || pointer.blobCount !== counts.blobCount
        || pointer.blobByteLength !== counts.blobByteLength)
    {
        throw new Error("CEWGPU INFO effect-reflection counts disagree with RFLX/RBLB");
    }
    return counts;
}

/**
 * Selects the body-local reflected effect for one PGRF permutation.
 *
 * @param {object} reflection Validated RFLX v1 or v2 document.
 * @param {object} permutationGraph Validated PGRF document.
 * @param {number} permutationIndex Exact package-selected permutation index.
 * @returns {object} Reflected body-local effect graph.
 */
export function effectReflectionForPermutation(
    reflection,
    permutationGraph,
    permutationIndex
)
{
    const variant = selectedVariant(permutationGraph, permutationIndex);
    if (reflection?.formatVersion === SELECTED_EFFECT_REFLECTION_VERSION)
    {
        if (reflection.selectedBody?.permutationIndex !== permutationIndex
            || reflection.selectedBody?.bodyKey !== variant.bodyKey)
        {
            throw new Error("CEWGPU selected RFLX body disagrees with PGRF");
        }
        return requireRecord(reflection.effect, "CEWGPU RFLX.effect");
    }
    if (reflection?.formatVersion === EFFECT_REFLECTION_VERSION)
    {
        const body = reflection.bodies?.find((entry) =>
            entry.bodyKey === variant.bodyKey);
        return requireRecord(body?.effect, "CEWGPU RFLX selected effect");
    }
    throw new Error("CEWGPU RFLX schema or coverage is unsupported");
}

/**
 * Hydrates one package permutation into the validated portable reflection
 * contract owned by format-hlsl.
 *
 * @param {object} reflection Validated RFLX v1 or v2 document.
 * @param {object} permutationGraph Validated PGRF document.
 * @param {number} permutationIndex Exact package permutation index.
 * @param {(reference:object)=>Uint8Array|null} resolveBlob Exact RBLB resolver.
 * @returns {object} Fresh portable single-body reflection with owned bytes.
 */
export function hydrateEffectReflectionForPermutation(
    reflection,
    permutationGraph,
    permutationIndex,
    resolveBlob
)
{
    if (typeof resolveBlob !== "function")
    {
        throw new TypeError("CEWGPU reflection blob resolver must be a function");
    }
    const variant = selectedVariant(permutationGraph, permutationIndex);
    const selected = reflection?.formatVersion
        === SELECTED_EFFECT_REFLECTION_VERSION
        ? reflection.selectedBody
        : variant;
    const cache = new Map();
    const portable = {
        format: reflection?.portableFormat,
        formatVersion: reflection?.portableFormatVersion,
        mode: "single-body",
        keyScope: reflection?.keyScope,
        coverage: {
            bodies: "single",
            reflection: "complete",
            sourcePrograms: "complete",
            constantDefaults: "exact"
        },
        source: {
            label: reflection?.source?.label,
            effectVersion: reflection?.source?.effectVersion,
            compilerVersion: reflection?.source?.compilerVersion,
            nativeHash: hydrateResolvedBytes(
                reflection?.source?.nativeHash,
                resolveBlob,
                cache
            ),
            stringTableByteLength:
                reflection?.source?.stringTableByteLength,
            byteLength: reflection?.source?.byteLength
        },
        permutationIndex,
        sourceRecord: { ...selected?.sourceRecord },
        effect: hydrateResolvedBytes(
            effectReflectionForPermutation(
                reflection,
                permutationGraph,
                permutationIndex
            ),
            resolveBlob,
            cache
        )
    };
    validateEffectBodyReflection(portable);
    return portable;
}

/**
 * Builds a deterministic deduplicated byte arena for portable reflection.
 */
class ReflectionBlobStore
{
    /**
     * Initializes an empty first-seen blob inventory.
     */
    constructor()
    {
        this.payloads = [];
        this.entries = [];
        this.byDigest = new Map();
        this.byteLength = 0;
    }

    /**
     * Adds exact bytes and returns their canonical immutable reference.
     *
     * @param {Uint8Array} value Portable reflection bytes.
     * @returns {object} Canonical blob reference.
     */
    add(value)
    {
        if (!(value instanceof Uint8Array))
        {
            throw new TypeError("Selected effect reflection bytes must be Uint8Array");
        }
        const bytes = Uint8Array.from(value);
        const sha256 = sha256Bytes(bytes);
        const candidates = this.byDigest.get(sha256) ?? [];
        const existing = candidates.find((candidate) =>
            bytesEqual(candidate.bytes, bytes));
        if (existing)
        {
            return Object.freeze({ ...existing.reference });
        }
        if (candidates.length)
        {
            throw new Error("Selected effect reflection SHA-256 collision detected");
        }

        const entry = Object.freeze({
            blobKey: `blob${this.entries.length}`,
            offset: this.byteLength,
            byteLength: bytes.byteLength,
            sha256
        });
        const record = { bytes, reference: entry };
        candidates.push(record);
        this.byDigest.set(sha256, candidates);
        this.payloads.push(bytes);
        this.entries.push(entry);
        this.byteLength += bytes.byteLength;
        return Object.freeze({ ...entry });
    }

    /**
     * Materializes the contiguous blob arena in inventory order.
     *
     * @returns {Uint8Array} Owned RBLB payload.
     */
    finish()
    {
        const out = new Uint8Array(this.byteLength);
        let offset = 0;
        for (const bytes of this.payloads)
        {
            out.set(bytes, offset);
            offset += bytes.byteLength;
        }
        return out;
    }
}

function samePortableSource(source, portableSource, store)
{
    const nativeHash = store.add(portableSource.nativeHash);
    return source.label === portableSource.label
        && source.effectVersion === portableSource.effectVersion
        && source.compilerVersion === portableSource.compilerVersion
        && source.stringTableByteLength === portableSource.stringTableByteLength
        && source.byteLength === portableSource.byteLength
        && source.nativeHash.blobKey === nativeHash.blobKey
        && source.nativeHash.offset === nativeHash.offset
        && source.nativeHash.byteLength === nativeHash.byteLength
        && source.nativeHash.sha256 === nativeHash.sha256;
}

function packByteArrays(value, store)
{
    if (value instanceof Uint8Array) return store.add(value);
    if (Array.isArray(value))
    {
        return value.map((entry) => packByteArrays(entry, store));
    }
    if (isRecord(value))
    {
        return Object.fromEntries(Object.entries(value).map(([ key, entry ]) => [
            key,
            packByteArrays(entry, store)
        ]));
    }
    return value;
}

function unpackByteReferences(
    value,
    inventory,
    blobBytes,
    usedBlobKeys
)
{
    if (isBlobReference(value))
    {
        return unpackBlobReference(
            value,
            inventory,
            blobBytes,
            usedBlobKeys
        );
    }
    if (Array.isArray(value))
    {
        return value.map((entry) =>
            unpackByteReferences(entry, inventory, blobBytes, usedBlobKeys));
    }
    if (isRecord(value))
    {
        return Object.fromEntries(Object.entries(value).map(([ key, entry ]) => [
            key,
            unpackByteReferences(entry, inventory, blobBytes, usedBlobKeys)
        ]));
    }
    return value;
}

function unpackBlobReference(reference, inventory, blobBytes, usedBlobKeys)
{
    requireExactKeys(reference, [
        "blobKey",
        "offset",
        "byteLength",
        "sha256"
    ], "CEWGPU RFLX blob reference");
    const entry = inventory.get(reference.blobKey);
    if (!entry
        || reference.offset !== entry.offset
        || reference.byteLength !== entry.byteLength
        || reference.sha256 !== entry.sha256)
    {
        throw new Error("CEWGPU RFLX blob reference disagrees with its inventory");
    }
    usedBlobKeys.add(reference.blobKey);
    return Uint8Array.from(blobBytes.subarray(
        reference.offset,
        reference.offset + reference.byteLength
    ));
}

function validateBlobStore(blobStore, blobBytes)
{
    requireExactKeys(blobStore, [
        "chunk",
        "byteLength",
        "sha256",
        "blobCount",
        "blobs"
    ], "CEWGPU RFLX.blobStore");
    if (!(blobBytes instanceof Uint8Array))
    {
        throw new Error("CEWGPU RBLB must be raw Uint8Array bytes");
    }
    if (blobStore.chunk !== EFFECT_REFLECTION_BLOB_CHUNK
        || blobStore.byteLength !== blobBytes.byteLength
        || blobStore.sha256 !== sha256Bytes(blobBytes)
        || !Array.isArray(blobStore.blobs)
        || blobStore.blobCount !== blobStore.blobs.length)
    {
        throw new Error("CEWGPU RFLX blob-store envelope disagrees with RBLB");
    }
    requireSha256(blobStore.sha256, "CEWGPU RFLX blob-store sha256");

    const inventory = new Map();
    const digests = new Set();
    let expectedOffset = 0;
    for (const [ index, entry ] of blobStore.blobs.entries())
    {
        requireExactKeys(entry, [
            "blobKey",
            "offset",
            "byteLength",
            "sha256"
        ], `CEWGPU RFLX blob ${index}`);
        if (entry.blobKey !== `blob${index}`)
        {
            throw new Error(`CEWGPU RFLX blob ${index} has a noncanonical key`);
        }
        requireUint(entry.offset, `CEWGPU RFLX blob ${index} offset`);
        requireUint(entry.byteLength, `CEWGPU RFLX blob ${index} byteLength`);
        requireSha256(entry.sha256, `CEWGPU RFLX blob ${index} sha256`);
        const end = entry.offset + entry.byteLength;
        if (entry.offset !== expectedOffset
            || end > blobBytes.byteLength
            || digests.has(entry.sha256)
            || sha256Bytes(blobBytes.subarray(entry.offset, end)) !== entry.sha256)
        {
            throw new Error(`CEWGPU RFLX blob ${index} is malformed or duplicated`);
        }
        inventory.set(entry.blobKey, entry);
        digests.add(entry.sha256);
        expectedOffset = end;
    }
    if (expectedOffset !== blobBytes.byteLength)
    {
        throw new Error("CEWGPU RFLX blob inventory does not cover RBLB");
    }
    return inventory;
}

function selectedVariant(graph, permutationIndex)
{
    const variant = graph?.variants?.[permutationIndex];
    if (!variant || variant.permutationIndex !== permutationIndex)
    {
        throw new Error(
            `Selected effect reflection body ${permutationIndex} is absent from PGRF`
        );
    }
    return variant;
}

function selectedBody(graph, bodyKey)
{
    const body = graph?.bodies?.find((entry) => entry.key === bodyKey);
    if (!body)
    {
        throw new Error(`Selected effect reflection body ${bodyKey} is absent from PGRF`);
    }
    return body;
}

function isBlobReference(value)
{
    return isRecord(value)
        && Object.prototype.hasOwnProperty.call(value, "blobKey")
        && Object.prototype.hasOwnProperty.call(value, "offset")
        && Object.prototype.hasOwnProperty.call(value, "byteLength")
        && Object.prototype.hasOwnProperty.call(value, "sha256");
}

function hydrateResolvedBytes(value, resolveBlob, cache)
{
    if (isBlobReference(value))
    {
        const key = [
            value.blobKey,
            value.offset,
            value.byteLength,
            value.sha256
        ].join(":");
        if (!cache.has(key))
        {
            const bytes = resolveBlob(value);
            if (!(bytes instanceof Uint8Array))
            {
                throw new Error(
                    `CEWGPU reflection blob ${value.blobKey} is unavailable`
                );
            }
            cache.set(key, bytes);
        }
        return Uint8Array.from(cache.get(key));
    }
    if (Array.isArray(value))
    {
        return value.map((entry) =>
            hydrateResolvedBytes(entry, resolveBlob, cache));
    }
    if (isRecord(value))
    {
        return Object.fromEntries(Object.entries(value).map(([ key, entry ]) => [
            key,
            hydrateResolvedBytes(entry, resolveBlob, cache)
        ]));
    }
    return value;
}

function requireExactKeys(value, allowed, context)
{
    requireRecord(value, context);
    const keys = Reflect.ownKeys(value);
    if (keys.length !== allowed.length
        || keys.some((key) =>
            typeof key !== "string" || !allowed.includes(key)))
    {
        throw new Error(`${context} has unsupported or missing fields`);
    }
    return value;
}

function requireRecord(value, context)
{
    if (!isRecord(value))
    {
        throw new Error(`${context} must be an object`);
    }
    return value;
}

function requireString(value, context)
{
    if (typeof value !== "string" || !value || value !== value.trim())
    {
        throw new Error(`${context} must be a non-empty string`);
    }
    return value;
}

function requireSha256(value, context)
{
    if (typeof value !== "string" || !SHA256.test(value))
    {
        throw new Error(`${context} must be lowercase SHA-256`);
    }
    return value;
}

function requireUint(value, context, positive = false)
{
    if (!Number.isSafeInteger(value) || value < (positive ? 1 : 0)
        || value > 0xffffffff)
    {
        throw new Error(`${context} must fit uint32`);
    }
    return value;
}

function isRecord(value)
{
    return !!value && typeof value === "object"
        && !Array.isArray(value) && !ArrayBuffer.isView(value);
}

function bytesEqual(left, right)
{
    return left.byteLength === right.byteLength
        && left.every((value, index) => value === right[index]);
}

function deepFreeze(value)
{
    if (!value || typeof value !== "object" || Object.isFrozen(value)
        || ArrayBuffer.isView(value))
    {
        return value;
    }
    Object.freeze(value);
    for (const entry of Object.values(value)) deepFreeze(entry);
    return value;
}
