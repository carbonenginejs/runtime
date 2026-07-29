import { readRaw } from "./helpers.js";
import { HlslEffectStateManager } from "./HlslEffectStateManager.js";
import {
    HlslRenderContextEnum,
    hlslShaderStageName
} from "./tr2/HlslRenderContextEnum.js";
import { HlslShader } from "./tr2/shader/HlslShader.js";

export const EFFECT_BODY_REFLECTION_FORMAT = "CJS_EFFECT_BODY_REFLECTION";
export const EFFECT_BODY_REFLECTION_VERSION = 1;

const PORTABLE_EFFECT_VERSION = 15;
const UINT8_MAX = 0xff;
const UINT32_MAX = 0xffffffff;
const CONSTANT_BYTES_MAX = 4096;
const EFFECT_BODY_COUNT_MAX = 0x10000;

/**
 * Reads one exact permutation-table body into the versioned portable reflection
 * contract used by backend effect packagers.
 *
 * @param {Uint8Array|ArrayBuffer|ArrayBufferView} input Compiled Tr2 effect bytes.
 * @param {object} [options] Source label and exact body index.
 * @param {string} [options.source] Diagnostic source label.
 * @param {number} [options.permutationIndex] Exact zero-based body-table index.
 * @returns {object} Complete portable reflection for the selected source body.
 */
export function readEffectBodyReflection(input, options = {})
{
    const source = String(options.source ?? "memory").trim() || "memory";
    const effectRes = readRaw(input, { source });
    return buildEffectBodyReflection(
        effectRes,
        options.permutationIndex ?? 0
    );
}

/**
 * Serializes one already-loaded effect body without applying global or local
 * option overrides.
 *
 * Returned byte arrays are owned copies. The document contains source
 * reflection and source programs only; renderer handles and derived resource
 * objects are deliberately excluded.
 *
 * @param {object} effectRes Loaded raw HlslEffectRes graph.
 * @param {number} permutationIndex Exact zero-based body-table index.
 * @returns {object} Complete portable body-reflection document.
 */
export function buildEffectBodyReflection(effectRes, permutationIndex)
{
    if (!effectRes || typeof effectRes !== "object"
        || typeof effectRes.GetShaderByIndex !== "function")
    {
        throw new TypeError(
            "Portable effect reflection requires a loaded HlslEffectRes with GetShaderByIndex"
        );
    }
    assertUint(permutationIndex, "Portable effect reflection permutationIndex");
    if (permutationIndex >= effectRes.m_offsetCount)
    {
        throw new RangeError(
            `Portable effect reflection body index ${permutationIndex} is unavailable`
        );
    }
    if (effectRes.m_version !== PORTABLE_EFFECT_VERSION)
    {
        throw new Error(
            `Portable effect reflection requires source effect version ${PORTABLE_EFFECT_VERSION}`
        );
    }
    const sourceRecord = normalizeBodySourceRecord(
        effectRes.m_offsets?.[permutationIndex],
        permutationIndex,
        effectRes.m_data?.byteLength
    );

    const shader = decodeEffectBodyFresh(effectRes, sourceRecord);
    const description = shader?.GetEffectDescription?.();
    if (!description || description.readError)
    {
        throw description?.readError
            || new Error(`Effect body ${permutationIndex} could not be decoded`);
    }

    const document = {
        format: EFFECT_BODY_REFLECTION_FORMAT,
        formatVersion: EFFECT_BODY_REFLECTION_VERSION,
        mode: "single-body",
        keyScope: "body-local",
        coverage: {
            bodies: "single",
            reflection: "complete",
            sourcePrograms: "complete",
            constantDefaults: "exact"
        },
        source: {
            label: String(effectRes.sourcePath ?? ""),
            effectVersion: effectRes.m_version,
            compilerVersion: effectRes.m_compilerVersion,
            nativeHash: copyBytes(effectRes.m_hash),
            stringTableByteLength: effectRes.m_stringTableSize,
            byteLength: effectRes.m_data?.byteLength
        },
        permutationIndex,
        sourceRecord: {
            offset: sourceRecord.offset,
            byteLength: sourceRecord.byteLength
        },
        effect: emitEffect(description)
    };

    validateEffectBodyReflection(document);
    return document;
}

/**
 * Enumerates first-occurrence-ordered groups of byte-identical effect bodies.
 *
 * This inspects owned source bytes without decoding bodies or touching parser
 * caches. Distinct source ranges with identical bytes are grouped together.
 *
 * @param {object} effectRes Loaded raw version-15 HlslEffectRes graph.
 * @returns {object[]} Frozen unique-body inventory with every permutation alias.
 */
export function enumerateUniqueEffectBodies(effectRes)
{
    if (!effectRes || typeof effectRes !== "object"
        || effectRes.m_version !== PORTABLE_EFFECT_VERSION
        || !(effectRes.m_data instanceof Uint8Array)
        || !Array.isArray(effectRes.m_offsets)
        || effectRes.m_offsetCount !== effectRes.m_offsets.length
        || !effectRes.m_offsets.length)
    {
        throw new TypeError(
            "Portable effect body inventory requires a loaded version-15 HlslEffectRes"
        );
    }
    if (effectRes.m_offsets.length > EFFECT_BODY_COUNT_MAX)
    {
        throw new RangeError(
            `Portable effect body inventory exceeds ${EFFECT_BODY_COUNT_MAX} records`
        );
    }

    const sourceRecords = effectRes.m_offsets.map((record, permutationIndex) =>
        normalizeBodySourceRecord(
            record,
            permutationIndex,
            effectRes.m_data.byteLength
        ));
    validateDisjointBodySourceRecords(sourceRecords);

    const groups = [];
    const groupByRange = new Map();
    const groupsByFingerprint = new Map();
    for (const [ permutationIndex, sourceRecord ] of sourceRecords.entries())
    {
        const rangeKey = `${sourceRecord.offset}:${sourceRecord.byteLength}`;
        let group = groupByRange.get(rangeKey);
        if (!group)
        {
            const bytes = effectRes.m_data.subarray(
                sourceRecord.offset,
                sourceRecord.offset + sourceRecord.byteLength
            );
            const fingerprint = fingerprintBytes(bytes);
            const candidates = groupsByFingerprint.get(fingerprint) ?? [];
            group = candidates.find((candidate) =>
                bytesEqual(candidate.bytes, bytes));
            if (!group)
            {
                group = {
                    bytes,
                    permutationIndex,
                    sourceRecord,
                    variants: []
                };
                candidates.push(group);
                groupsByFingerprint.set(fingerprint, candidates);
                groups.push(group);
            }
            groupByRange.set(rangeKey, group);
        }
        group.variants.push({
            permutationIndex,
            sourceRecord
        });
    }

    return Object.freeze(groups.map((group) => Object.freeze({
        permutationIndex: group.permutationIndex,
        sourceRecord: group.sourceRecord,
        variants: Object.freeze(group.variants.map((variant) =>
            Object.freeze(variant)))
    })));
}

/**
 * Validates a portable body-reflection document independently of its source
 * parser objects.
 *
 * @param {object} document Candidate reflection document.
 * @returns {{permutationIndex:number,techniqueCount:number,passCount:number,stageCount:number,libraryCount:number,sourceProgramCount:number}}
 *   Validated structural counts.
 */
export function validateEffectBodyReflection(document)
{
    requireExactKeys(document, [
        "format",
        "formatVersion",
        "mode",
        "keyScope",
        "coverage",
        "source",
        "permutationIndex",
        "sourceRecord",
        "effect"
    ], "Portable effect body reflection");
    requireExactKeys(document.coverage, [
        "bodies",
        "reflection",
        "sourcePrograms",
        "constantDefaults"
    ], "Portable reflection coverage");
    if (!isRecord(document)
        || document.format !== EFFECT_BODY_REFLECTION_FORMAT
        || document.formatVersion !== EFFECT_BODY_REFLECTION_VERSION
        || document.mode !== "single-body"
        || document.keyScope !== "body-local"
        || !isRecord(document.coverage)
        || document.coverage.bodies !== "single"
        || document.coverage.reflection !== "complete"
        || document.coverage.sourcePrograms !== "complete"
        || document.coverage.constantDefaults !== "exact")
    {
        throw new Error("Portable effect body reflection schema or coverage is unsupported");
    }

    assertUint(document.permutationIndex, "Portable reflection permutationIndex");
    validateSource(document.source);
    const sourceRecord = requireRecord(
        document.sourceRecord,
        "Portable reflection sourceRecord"
    );
    requireExactKeys(
        sourceRecord,
        [ "offset", "byteLength" ],
        "Portable reflection sourceRecord"
    );
    assertUint(sourceRecord.offset, "Portable reflection sourceRecord offset");
    assertUint(
        sourceRecord.byteLength,
        "Portable reflection sourceRecord byteLength"
    );
    if (!sourceRecord.byteLength
        || sourceRecord.offset + sourceRecord.byteLength > document.source.byteLength)
    {
        throw new Error("Portable reflection sourceRecord is outside the source envelope");
    }
    const effect = requireRecord(document.effect, "Portable reflection effect");
    requireExactKeys(effect, [
        "annotations",
        "annotationGroupCount",
        "techniqueCount",
        "techniques"
    ], "Portable reflection effect");
    if (!Array.isArray(effect.annotations)
        || !Array.isArray(effect.techniques)
        || effect.annotationGroupCount !== effect.annotations.length
        || effect.techniqueCount !== effect.techniques.length)
    {
        throw new Error("Portable reflection effect is malformed");
    }
    validateAnnotationGroups(effect.annotations, "effect annotations");

    const counts = {
        permutationIndex: document.permutationIndex,
        techniqueCount: effect.techniques.length,
        passCount: 0,
        stageCount: 0,
        libraryCount: 0,
        sourceProgramCount: 0
    };
    const techniqueKeys = new Set();
    for (const [ techniqueIndex, technique ] of effect.techniques.entries())
    {
        const context = `technique ${techniqueIndex}`;
        requireExactKeys(technique, [
            "key",
            "name",
            "passCount",
            "libraryCount",
            "passes",
            "libraries"
        ], `Portable reflection ${context}`);
        requireKey(technique?.key, `technique${techniqueIndex}`, context, techniqueKeys);
        if (typeof technique.name !== "string"
            || !Array.isArray(technique.passes)
            || !Array.isArray(technique.libraries)
            || technique.passCount !== technique.passes.length
            || technique.libraryCount !== technique.libraries.length)
        {
            throw new Error(`Portable reflection ${context} is malformed`);
        }

        const passKeys = new Set();
        for (const [ passIndex, pass ] of technique.passes.entries())
        {
            const passKey = `${technique.key}.pass${passIndex}`;
            requireExactKeys(pass, [
                "key",
                "renderStateCount",
                "renderStates",
                "stageCount",
                "stages"
            ], `Portable reflection ${context} pass ${passIndex}`);
            requireKey(pass?.key, passKey, `${context} pass ${passIndex}`, passKeys);
            validatePass(pass, counts, document.source);
            counts.passCount += 1;
        }

        const libraryKeys = new Set();
        for (const [ libraryIndex, library ] of technique.libraries.entries())
        {
            const libraryKey = `${technique.key}.library${libraryIndex}`;
            requireExactKeys(library, [
                "key",
                "payloadSize",
                "sourceProgram",
                "exportCount",
                "exports",
                "hitGroupName",
                "globalInput",
                "localInput"
            ], `Portable reflection ${context} library ${libraryIndex}`);
            requireKey(
                library?.key,
                libraryKey,
                `${context} library ${libraryIndex}`,
                libraryKeys
            );
            validateLibrary(library, counts, document.source);
            counts.libraryCount += 1;
        }
    }

    return Object.freeze({ ...counts });
}

function emitEffect(description)
{
    return {
        annotations: emitAnnotationGroups(description.annotations),
        annotationGroupCount: description.annotations?.size ?? 0,
        techniqueCount: description.techniques?.length ?? 0,
        techniques: (description.techniques || []).map((technique, techniqueIndex) =>
            emitTechnique(technique, techniqueIndex))
    };
}

function emitTechnique(technique, techniqueIndex)
{
    const key = `technique${techniqueIndex}`;
    return {
        key,
        name: String(technique.name ?? ""),
        passCount: technique.passes?.length ?? 0,
        libraryCount: technique.libraries?.length ?? 0,
        passes: (technique.passes || []).map((pass, passIndex) =>
            emitPass(pass, key, passIndex)),
        libraries: (technique.libraries || []).map((library, libraryIndex) =>
            emitLibrary(library, key, libraryIndex))
    };
}

function emitPass(pass, techniqueKey, passIndex)
{
    const key = `${techniqueKey}.pass${passIndex}`;
    const stages = [];
    for (let stageType = 0;
        stageType < HlslRenderContextEnum.SHADER_TYPE_COUNT;
        stageType += 1)
    {
        const input = pass.stageInputs?.[stageType];
        if (!input?.m_exists) continue;
        stages.push(emitStage(input, key, stageType));
    }

    return {
        key,
        renderStateCount: pass.cjsRenderStateSetup?.entries?.length ?? 0,
        renderStates: (pass.cjsRenderStateSetup?.entries || []).map((entry) => ({
            state: entry.key >>> 0,
            value: entry.value >>> 0
        })),
        stageCount: stages.length,
        stages
    };
}

function emitStage(input, passKey, stageType)
{
    return {
        key: `${passKey}.stage${stageType}`,
        stageType,
        stageName: hlslShaderStageName(stageType),
        sourceProgram: emitSourceProgram(input.cjsShaderBytecode, "stage"),
        input: emitInput(input)
    };
}

function emitLibrary(library, techniqueKey, libraryIndex)
{
    return {
        key: `${techniqueKey}.library${libraryIndex}`,
        payloadSize: library.payloadSize >>> 0,
        sourceProgram: emitSourceProgram(library.cjsShaderBytecode, "library"),
        exportCount: library.exports?.length ?? 0,
        exports: (library.exports || []).map((entry) => ({
            type: entry.type,
            name: String(entry.name ?? "")
        })),
        hitGroupName: String(library.hitGroupName ?? ""),
        globalInput: emitInput(library.globalInput),
        localInput: emitInput(library.localInput)
    };
}

function emitSourceProgram(bytecode, kind)
{
    if (!bytecode)
    {
        throw new Error("Portable reflection source program is missing");
    }
    const program = {
        kind,
        shaderSize: bytecode.shaderSize,
        stringTableOffset: bytecode.stringTableOffset,
        bytes: copyBytes(bytecode.bytes)
    };
    if (kind === "stage")
    {
        program.stageType = bytecode.stageType;
        program.stageName = String(bytecode.stageName ?? "");
    }
    return program;
}

function emitInput(input)
{
    const sourceConstantValues = copyBytes(input?.sourceConstantValues);
    const sourceConstantValueSize = input?.sourceConstantValueSize ?? 0;
    if (sourceConstantValues.byteLength !== sourceConstantValueSize)
    {
        throw new Error("Portable reflection source constant defaults are incomplete");
    }

    return {
        constantDefaults: {
            declaredByteLength: sourceConstantValueSize,
            bytes: sourceConstantValues
        },
        constantCount: input?.constants?.length ?? 0,
        constants: (input?.constants || []).map((constant) => ({
            name: String(constant.name ?? ""),
            offset: constant.offset,
            size: constant.size,
            type: constant.type,
            dimension: constant.dimension,
            elements: constant.elements,
            isSRGB: !!constant.isSRGB,
            isAutoregister: !!constant.isAutoregister
        })),
        resourceCount: input?.resources?.size ?? 0,
        resources: emitResourceMap(input?.resources),
        uavCount: input?.uavs?.size ?? 0,
        uavs: emitResourceMap(input?.uavs),
        samplerCount: input?.samplers?.size ?? 0,
        samplers: emitSamplerMap(input?.samplers),
        annotationCount: input?.annotation?.length ?? 0,
        annotations: emitAnnotations(input?.annotation),
        signature: emitSignature(input?.signature)
    };
}

function emitResourceMap(map)
{
    return Array.from(map || [], ([ registerIndex, resource ]) => ({
        registerIndex,
        name: String(resource.name ?? ""),
        type: resource.type,
        arrayElements: resource.arrayElements,
        isSRGB: !!resource.isSRGB,
        isAutoregister: !!resource.isAutoregister
    }));
}

function emitSamplerMap(map)
{
    return Array.from(map || [], ([ registerIndex, setup ]) => ({
        registerIndex,
        name: setup.name === null || setup.name === undefined
            ? null
            : String(setup.name),
        isDynamic: !!setup.sampler?.isDynamic,
        descriptor: emitDynamicSampler(setup.sampler)
    }));
}

function emitDynamicSampler(sampler = {})
{
    return {
        comparison: !!sampler.comparison,
        minFilter: sampler.minFilter,
        magFilter: sampler.magFilter,
        mipFilter: sampler.mipFilter,
        addressU: sampler.addressU,
        addressV: sampler.addressV,
        addressW: sampler.addressW,
        mipLODBiasRaw: sampler.mipLODBiasRaw,
        maxAnisotropy: sampler.maxAnisotropy,
        comparisonFunc: sampler.comparisonFunc,
        borderColorRaw: (sampler.borderColorRaw || []).slice(),
        minLODRaw: sampler.minLODRaw,
        maxLODRaw: sampler.maxLODRaw
    };
}

function emitStaticSampler(entry)
{
    const sampler = entry.sampler || {};
    return {
        registerIndex: entry.registerIndex,
        registerSpace: entry.registerSpace,
        descriptor: {
            comparison: !!sampler.comparison,
            minFilter: sampler.minFilter,
            magFilter: sampler.magFilter,
            mipFilter: sampler.mipFilter,
            addressU: sampler.addressU,
            addressV: sampler.addressV,
            addressW: sampler.addressW,
            mipLODBiasRaw: sampler.mipLODBiasRaw,
            maxAnisotropy: sampler.maxAnisotropy,
            comparisonFunc: sampler.comparisonFunc,
            borderColor: sampler.borderColor,
            minLODRaw: sampler.minLODRaw,
            maxLODRaw: sampler.maxLODRaw
        }
    };
}

function emitSignature(signature = {})
{
    return {
        pipelineInputCount: signature.pipelineInputs?.length ?? 0,
        pipelineInputs: (signature.pipelineInputs || []).map((entry) => ({
            usage: entry.usage,
            registerIndex: entry.registerIndex,
            usageIndex: entry.usageIndex,
            usedMask: entry.usedMask,
            type: entry.type,
            dimension: entry.dimension
        })),
        registerCount: signature.registers?.length ?? 0,
        registers: (signature.registers || []).map((entry) => ({
            registerType: entry.registerType,
            registerIndex: entry.registerIndex,
            arrayCount: entry.arrayCount,
            registerCount: entry.registerCount,
            registerSpace: entry.registerSpace
        })),
        staticSamplerCount: signature.samplers?.length ?? 0,
        staticSamplers: (signature.samplers || []).map(emitStaticSampler),
        threadGroupSize: {
            x: signature.threadGroupSize?.x ?? 0,
            y: signature.threadGroupSize?.y ?? 0,
            z: signature.threadGroupSize?.z ?? 0
        }
    };
}

function emitAnnotationGroups(map)
{
    return Array.from(map || [], ([ parameterName, annotations ]) => ({
        parameterName: String(parameterName),
        annotations: emitAnnotations(annotations)
    }));
}

function emitAnnotations(annotations)
{
    return (annotations || []).map((annotation) =>
    {
        const record = {
            name: String(annotation.name ?? ""),
            type: annotation.type
        };
        if (annotation.type === 3)
        {
            record.stringValue = String(annotation.stringValue ?? "");
        }
        else
        {
            record.rawValue = annotation.rawValue >>> 0;
        }
        return record;
    });
}

function validateSource(source)
{
    requireRecord(source, "Portable reflection source");
    requireExactKeys(source, [
        "label",
        "effectVersion",
        "compilerVersion",
        "nativeHash",
        "stringTableByteLength",
        "byteLength"
    ], "Portable reflection source");
    if (typeof source.label !== "string")
    {
        throw new Error("Portable reflection source label is malformed");
    }
    assertUint(source.effectVersion, "Portable reflection effectVersion");
    assertUint(
        source.stringTableByteLength,
        "Portable reflection stringTableByteLength"
    );
    assertUint(source.byteLength, "Portable reflection source byteLength");
    if (!source.byteLength
        || source.stringTableByteLength > source.byteLength)
    {
        throw new Error("Portable reflection source byteLength must be positive");
    }
    if (source.effectVersion !== PORTABLE_EFFECT_VERSION)
    {
        throw new Error("Portable reflection effectVersion is unsupported");
    }
    if (source.compilerVersion !== null)
    {
        assertUint(source.compilerVersion, "Portable reflection compilerVersion");
    }
    const hash = requireBytes(source.nativeHash, "Portable reflection nativeHash");
    if (source.compilerVersion === null || hash.byteLength !== 32)
    {
        throw new Error("Portable reflection v15 source identity is incomplete");
    }
}

function validatePass(pass, counts, source)
{
    if (!Array.isArray(pass.renderStates) || !Array.isArray(pass.stages)
        || pass.renderStateCount !== pass.renderStates.length
        || pass.stageCount !== pass.stages.length)
    {
        throw new Error(`Portable reflection pass ${pass.key} is malformed`);
    }
    validateRegisterIndexed(
        pass.renderStates,
        "state",
        `pass ${pass.key} render states`,
        (entry) =>
        {
            requireExactKeys(
                entry,
                [ "state", "value" ],
                `Portable reflection pass ${pass.key} render state`
            );
            assertUint(entry.value, `pass ${pass.key} render-state value`);
        }
    );

    const stageTypes = new Set();
    const stageKeys = new Set();
    for (const stage of pass.stages)
    {
        requireExactKeys(stage, [
            "key",
            "stageType",
            "stageName",
            "sourceProgram",
            "input"
        ], `Portable reflection pass ${pass.key} stage`);
        assertUint(stage?.stageType, `pass ${pass.key} stage type`);
        if (stage.stageType >= HlslRenderContextEnum.SHADER_TYPE_COUNT
            || stageTypes.has(stage.stageType))
        {
            throw new Error(`Portable reflection pass ${pass.key} stage type is invalid or duplicated`);
        }
        stageTypes.add(stage.stageType);
        requireKey(
            stage.key,
            `${pass.key}.stage${stage.stageType}`,
            `pass ${pass.key} stage`,
            stageKeys
        );
        if (stage.stageName !== hlslShaderStageName(stage.stageType))
        {
            throw new Error(`Portable reflection stage ${stage.key} name disagrees`);
        }
        validateSourceProgram(
            stage.sourceProgram,
            "stage",
            stage.stageType,
            stage.stageName,
            source.stringTableByteLength
        );
        validateInput(stage.input, stage.key);
        counts.stageCount += 1;
        counts.sourceProgramCount += 1;
    }
}

function validateLibrary(library, counts, source)
{
    assertUint(library.payloadSize, `library ${library.key} payloadSize`);
    validateSourceProgram(
        library.sourceProgram,
        "library",
        null,
        null,
        source.stringTableByteLength
    );
    if (!Array.isArray(library.exports)
        || library.exportCount !== library.exports.length
        || typeof library.hitGroupName !== "string")
    {
        throw new Error(`Portable reflection library ${library.key} is malformed`);
    }
    const exportIdentities = new Set();
    for (const [ index, entry ] of library.exports.entries())
    {
        requireExactKeys(
            entry,
            [ "type", "name" ],
            `Portable reflection library ${library.key} export ${index}`
        );
        assertUint8(entry?.type, `library ${library.key} export ${index} type`);
        const identity = `${entry.type}:${entry.name}`;
        if (entry.type > 4 || typeof entry.name !== "string" || !entry.name
            || exportIdentities.has(identity))
        {
            throw new Error(
                `Portable reflection library ${library.key} export ${index} is malformed or duplicated`
            );
        }
        exportIdentities.add(identity);
    }
    validateInput(library.globalInput, `${library.key}.globalInput`);
    validateInput(library.localInput, `${library.key}.localInput`);
    counts.sourceProgramCount += 1;
}

function validateSourceProgram(
    program,
    expectedKind,
    stageType,
    stageName,
    stringTableByteLength
)
{
    requireRecord(program, "Portable reflection source program");
    requireExactKeys(program, expectedKind === "stage" ? [
        "kind",
        "stageType",
        "stageName",
        "shaderSize",
        "stringTableOffset",
        "bytes"
    ] : [
        "kind",
        "shaderSize",
        "stringTableOffset",
        "bytes"
    ], "Portable reflection source program");
    if (program.kind !== expectedKind)
    {
        throw new Error("Portable reflection source program kind disagrees");
    }
    if (expectedKind === "stage"
        && (program.stageType !== stageType || program.stageName !== stageName))
    {
        throw new Error("Portable reflection source program stage identity disagrees");
    }
    assertUint(program.shaderSize, "Portable reflection source program shaderSize");
    const bytes = requireBytes(program.bytes, "Portable reflection source program bytes");
    if (!bytes.byteLength || program.shaderSize !== bytes.byteLength)
    {
        throw new Error("Portable reflection source program bytes are incomplete");
    }
    assertUint(
        program.stringTableOffset,
        "Portable reflection source program stringTableOffset"
    );
    if (program.stringTableOffset + program.shaderSize > stringTableByteLength)
    {
        throw new Error("Portable reflection source program is outside the shared string table");
    }
}

function validateInput(input, context)
{
    requireRecord(input, `Portable reflection ${context} input`);
    requireExactKeys(input, [
        "constantDefaults",
        "constantCount",
        "constants",
        "resourceCount",
        "resources",
        "uavCount",
        "uavs",
        "samplerCount",
        "samplers",
        "annotationCount",
        "annotations",
        "signature"
    ], `Portable reflection ${context} input`);
    const defaults = requireRecord(
        input.constantDefaults,
        `Portable reflection ${context} constant defaults`
    );
    requireExactKeys(defaults, [
        "declaredByteLength",
        "bytes"
    ], `Portable reflection ${context} constant defaults`);
    assertUint(
        defaults.declaredByteLength,
        `Portable reflection ${context} constant-default length`
    );
    const defaultBytes = requireBytes(
        defaults.bytes,
        `Portable reflection ${context} constant-default bytes`
    );
    if (defaults.declaredByteLength !== defaultBytes.byteLength
        || defaultBytes.byteLength > CONSTANT_BYTES_MAX)
    {
        throw new Error(`Portable reflection ${context} constant defaults are invalid`);
    }

    if (!Array.isArray(input.constants)
        || !Array.isArray(input.resources)
        || !Array.isArray(input.uavs)
        || !Array.isArray(input.samplers)
        || !Array.isArray(input.annotations)
        || input.constantCount !== input.constants.length
        || input.resourceCount !== input.resources.length
        || input.uavCount !== input.uavs.length
        || input.samplerCount !== input.samplers.length
        || input.annotationCount !== input.annotations.length)
    {
        throw new Error(`Portable reflection ${context} input collections are malformed`);
    }
    const constantNames = new Set();
    for (const [ index, constant ] of input.constants.entries())
    {
        requireExactKeys(constant, [
            "name",
            "offset",
            "size",
            "type",
            "dimension",
            "elements",
            "isSRGB",
            "isAutoregister"
        ], `Portable reflection ${context} constant ${index}`);
        if (!isRecord(constant)
            || typeof constant.name !== "string" || !constant.name
            || constantNames.has(constant.name))
        {
            throw new Error(`Portable reflection ${context} constant ${index} is malformed or duplicated`);
        }
        constantNames.add(constant.name);
        assertUint(constant.offset, `${context} constant ${constant.name} offset`);
        assertUint(constant.size, `${context} constant ${constant.name} size`);
        assertUint8(constant.type, `${context} constant ${constant.name} type`);
        assertUint8(constant.dimension, `${context} constant ${constant.name} dimension`);
        assertUint(constant.elements, `${context} constant ${constant.name} elements`);
        if (!constant.size || constant.type > 4
            || constant.dimension < 1
            || constant.offset + constant.size > CONSTANT_BYTES_MAX
            || typeof constant.isSRGB !== "boolean"
            || typeof constant.isAutoregister !== "boolean")
        {
            throw new Error(`Portable reflection ${context} constant ${constant.name} is invalid`);
        }
    }

    validateResourceList(input.resources, `${context} resources`);
    validateResourceList(input.uavs, `${context} UAVs`);
    validateSamplerList(input.samplers, `${context} samplers`);
    validateAnnotations(input.annotations, `${context} annotations`);
    validateSignature(input.signature, context);
    validateMapSignatureReconciliation(input, context);
}

function validateResourceList(entries, context)
{
    validateRegisterIndexed(entries, "registerIndex", context, (entry) =>
    {
        requireExactKeys(entry, [
            "registerIndex",
            "name",
            "type",
            "arrayElements",
            "isSRGB",
            "isAutoregister"
        ], `Portable reflection ${context} entry`);
        assertUint8(entry.registerIndex, `${context} registerIndex`);
        if (typeof entry.name !== "string" || !entry.name)
        {
            throw new Error(`Portable reflection ${context} name is malformed`);
        }
        assertUint8(entry.type, `${context} type`);
        assertUint(entry.arrayElements, `${context} arrayElements`);
        if (typeof entry.isSRGB !== "boolean"
            || typeof entry.isAutoregister !== "boolean")
        {
            throw new Error(`Portable reflection ${context} entry is malformed`);
        }
    });
}

function validateSamplerList(entries, context)
{
    validateRegisterIndexed(entries, "registerIndex", context, (entry) =>
    {
        requireExactKeys(entry, [
            "registerIndex",
            "name",
            "isDynamic",
            "descriptor"
        ], `Portable reflection ${context} entry`);
        assertUint8(entry.registerIndex, `${context} registerIndex`);
        if ((entry.isDynamic && typeof entry.name !== "string")
            || (!entry.isDynamic && entry.name !== null)
            || typeof entry.isDynamic !== "boolean")
        {
            throw new Error(`Portable reflection ${context} entry is malformed`);
        }
        validateSamplerDescriptor(entry.descriptor, context, false);
    });
}

function validateSignature(signature, context)
{
    requireRecord(signature, `Portable reflection ${context} signature`);
    requireExactKeys(signature, [
        "pipelineInputCount",
        "pipelineInputs",
        "registerCount",
        "registers",
        "staticSamplerCount",
        "staticSamplers",
        "threadGroupSize"
    ], `Portable reflection ${context} signature`);
    if (!Array.isArray(signature.pipelineInputs)
        || !Array.isArray(signature.registers)
        || !Array.isArray(signature.staticSamplers)
        || signature.pipelineInputCount !== signature.pipelineInputs.length
        || signature.registerCount !== signature.registers.length
        || signature.staticSamplerCount !== signature.staticSamplers.length)
    {
        throw new Error(`Portable reflection ${context} signature is malformed`);
    }
    for (const [ index, input ] of signature.pipelineInputs.entries())
    {
        requireExactKeys(input, [
            "usage",
            "registerIndex",
            "usageIndex",
            "usedMask",
            "type",
            "dimension"
        ], `Portable reflection ${context} pipeline input ${index}`);
        for (const field of [ "usage", "registerIndex", "usageIndex", "usedMask", "type", "dimension" ])
        {
            assertUint8(input?.[field], `${context} pipeline input ${index} ${field}`);
        }
    }

    const registerRanges = new Map();
    for (const [ index, register ] of signature.registers.entries())
    {
        requireExactKeys(register, [
            "registerType",
            "registerIndex",
            "arrayCount",
            "registerCount",
            "registerSpace"
        ], `Portable reflection ${context} register ${index}`);
        assertUint8(register?.registerType, `${context} register ${index} type`);
        assertUint(register.registerIndex, `${context} register ${index} index`);
        assertUint(register.arrayCount, `${context} register ${index} arrayCount`);
        assertUint(register.registerCount, `${context} register ${index} registerCount`);
        assertUint8(register.registerSpace, `${context} register ${index} space`);
        const classification = registerClass(register.registerType);
        const isUnbounded = register.arrayCount === 0
            && register.registerCount === 0;
        const rangeEnd = isUnbounded
            ? UINT32_MAX + 1
            : register.registerIndex + register.registerCount;
        if (register.registerCount !== register.arrayCount
            || (isUnbounded
                && classification !== "sampler"
                && classification !== "resource"
                && classification !== "uav")
            || rangeEnd > UINT32_MAX + 1)
        {
            throw new Error(`Portable reflection ${context} register ${index} is malformed`);
        }
        const rangeKey = `${classification}:${register.registerSpace}`;
        const ranges = registerRanges.get(rangeKey) || [];
        if (ranges.some(([ start, end ]) =>
            register.registerIndex < end && rangeEnd > start))
        {
            throw new Error(`Portable reflection ${context} signature register range overlaps`);
        }
        ranges.push([ register.registerIndex, rangeEnd ]);
        registerRanges.set(rangeKey, ranges);
    }

    validateRegisterIndexed(
        signature.staticSamplers,
        "registerIndex",
        `${context} static samplers`,
        (entry) =>
        {
            requireExactKeys(entry, [
                "registerIndex",
                "registerSpace",
                "descriptor"
            ], `Portable reflection ${context} static sampler`);
            assertUint8(entry.registerSpace, `${context} static sampler space`);
            validateSamplerDescriptor(entry.descriptor, context, true);
        },
        (entry) => `${entry.registerSpace}:${entry.registerIndex}`
    );
    const group = requireRecord(
        signature.threadGroupSize,
        `Portable reflection ${context} threadGroupSize`
    );
    requireExactKeys(
        group,
        [ "x", "y", "z" ],
        `Portable reflection ${context} threadGroupSize`
    );
    assertUint(group.x, `${context} threadGroupSize.x`);
    assertUint(group.y, `${context} threadGroupSize.y`);
    assertUint(group.z, `${context} threadGroupSize.z`);
}

function validateMapSignatureReconciliation(input, context)
{
    const signature = input.signature;
    validateMappedBindings(
        input.resources,
        signature.registers.filter((entry) =>
            registerClass(entry.registerType) === "resource"),
        `${context} resources`
    );
    validateMappedBindings(
        input.uavs,
        signature.registers.filter((entry) =>
            registerClass(entry.registerType) === "uav"),
        `${context} UAVs`
    );

    for (const sampler of input.samplers)
    {
        const matches = sampler.isDynamic
            ? signature.registers.filter((entry) =>
                registerClass(entry.registerType) === "sampler"
                && entry.registerIndex === sampler.registerIndex)
            : signature.staticSamplers.filter((entry) =>
                entry.registerIndex === sampler.registerIndex);
        if (matches.length > 1
            || (matches.length === 1
                && sampler.isDynamic
                && matches[0].arrayCount !== 0
                && matches[0].arrayCount !== 1))
        {
            throw new Error(
                `Portable reflection ${context} sampler map disagrees with its signature`
            );
        }
    }
}

function validateMappedBindings(entries, registers, context)
{
    for (const entry of entries)
    {
        const matches = registers.filter((register) =>
            register.registerIndex === entry.registerIndex);
        if (matches.length !== 1
            || matches[0].arrayCount !== entry.arrayElements)
        {
            throw new Error(
                `Portable reflection ${context} map disagrees with its signature`
            );
        }
    }
}

function registerClass(registerType)
{
    if (registerType === 0) return "constantBuffer";
    if (registerType === 1) return "sampler";
    if (registerType >= 32 && registerType <= 63) return "resource";
    if (registerType >= 64 && registerType <= 95) return "uav";
    return `raw${registerType}`;
}

function validateSamplerDescriptor(descriptor, context, staticSampler)
{
    requireRecord(descriptor, `Portable reflection ${context} sampler descriptor`);
    requireExactKeys(descriptor, [
        "comparison",
        "minFilter",
        "magFilter",
        "mipFilter",
        "addressU",
        "addressV",
        "addressW",
        "mipLODBiasRaw",
        "maxAnisotropy",
        "comparisonFunc",
        staticSampler ? "borderColor" : "borderColorRaw",
        "minLODRaw",
        "maxLODRaw"
    ], `Portable reflection ${context} sampler descriptor`);
    if (typeof descriptor.comparison !== "boolean")
    {
        throw new Error(`Portable reflection ${context} sampler comparison is malformed`);
    }
    for (const field of [
        "minFilter", "magFilter", "mipFilter", "addressU", "addressV",
        "addressW", "maxAnisotropy", "comparisonFunc"
    ])
    {
        assertUint8(descriptor[field], `${context} sampler ${field}`);
    }
    for (const field of [ "mipLODBiasRaw", "minLODRaw", "maxLODRaw" ])
    {
        assertUint(descriptor[field], `${context} sampler ${field}`);
    }
    if (staticSampler)
    {
        assertUint8(descriptor.borderColor, `${context} static sampler borderColor`);
    }
    else if (!Array.isArray(descriptor.borderColorRaw)
        || descriptor.borderColorRaw.length !== 4)
    {
        throw new Error(`Portable reflection ${context} sampler borderColorRaw is malformed`);
    }
    else
    {
        descriptor.borderColorRaw.forEach((value, index) =>
            assertUint(value, `${context} sampler borderColorRaw[${index}]`));
    }
}

function validateAnnotationGroups(groups, context)
{
    const names = new Set();
    for (const [ index, group ] of groups.entries())
    {
        requireExactKeys(group, [
            "parameterName",
            "annotations"
        ], `Portable reflection ${context} group ${index}`);
        if (!isRecord(group)
            || typeof group.parameterName !== "string"
            || names.has(group.parameterName)
            || !Array.isArray(group.annotations))
        {
            throw new Error(`Portable reflection ${context} group ${index} is malformed or duplicated`);
        }
        names.add(group.parameterName);
        validateAnnotations(group.annotations, `${context} ${group.parameterName}`);
    }
}

function validateAnnotations(annotations, context)
{
    for (const [ index, annotation ] of annotations.entries())
    {
        requireExactKeys(annotation, annotation?.type === 3
            ? [ "name", "type", "stringValue" ]
            : [ "name", "type", "rawValue" ],
        `Portable reflection ${context} annotation ${index}`);
        if (!isRecord(annotation)
            || typeof annotation.name !== "string" || !annotation.name)
        {
            throw new Error(`Portable reflection ${context} annotation ${index} is malformed`);
        }
        assertUint8(annotation.type, `${context} annotation ${index} type`);
        if (annotation.type === 3)
        {
            if (typeof annotation.stringValue !== "string"
                || Object.prototype.hasOwnProperty.call(annotation, "rawValue"))
            {
                throw new Error(`Portable reflection ${context} string annotation is malformed`);
            }
        }
        else if (annotation.type <= 2)
        {
            assertUint(annotation.rawValue, `${context} annotation ${index} rawValue`);
            if (Object.prototype.hasOwnProperty.call(annotation, "stringValue"))
            {
                throw new Error(`Portable reflection ${context} numeric annotation is malformed`);
            }
        }
        else
        {
            throw new Error(`Portable reflection ${context} annotation type is unsupported`);
        }
    }
}

function validateRegisterIndexed(entries, field, context, validate, identityFor = null)
{
    const identities = new Set();
    for (const [ index, entry ] of entries.entries())
    {
        if (!isRecord(entry))
        {
            throw new Error(`Portable reflection ${context} entry ${index} is malformed`);
        }
        assertUint(entry[field], `${context} entry ${index} ${field}`);
        const identity = identityFor ? identityFor(entry) : entry[field];
        if (identities.has(identity))
        {
            throw new Error(`Portable reflection ${context} entry ${index} is duplicated`);
        }
        identities.add(identity);
        validate(entry);
    }
}

function requireKey(value, expected, context, keys)
{
    if (value !== expected || keys.has(value))
    {
        throw new Error(`Portable reflection ${context} key is malformed or duplicated`);
    }
    keys.add(value);
}

function requireRecord(value, context)
{
    if (!isRecord(value))
    {
        throw new Error(`${context} must be an object`);
    }
    return value;
}

function requireExactKeys(value, allowed, context)
{
    requireRecord(value, context);
    const actual = Reflect.ownKeys(value);
    if (actual.length !== allowed.length
        || actual.some((key) => typeof key !== "string" || !allowed.includes(key)))
    {
        throw new Error(`${context} has unsupported or missing fields`);
    }
}

function isRecord(value)
{
    return !!value && typeof value === "object"
        && !Array.isArray(value) && !ArrayBuffer.isView(value);
}

function requireBytes(value, context)
{
    if (!(value instanceof Uint8Array))
    {
        throw new Error(`${context} must be Uint8Array bytes`);
    }
    return value;
}

function copyBytes(value)
{
    if (value === undefined || value === null)
    {
        return new Uint8Array(0);
    }
    if (value instanceof Uint8Array)
    {
        return Uint8Array.from(value);
    }
    if (value instanceof ArrayBuffer)
    {
        return new Uint8Array(value.slice(0));
    }
    if (ArrayBuffer.isView(value))
    {
        return Uint8Array.from(new Uint8Array(
            value.buffer,
            value.byteOffset,
            value.byteLength
        ));
    }
    throw new TypeError("Portable reflection bytes must be a byte view");
}

function decodeEffectBodyFresh(effectRes, sourceRecord)
{
    const shader = new HlslShader();
    const buffer = effectRes.m_data.subarray(
        sourceRecord.offset,
        sourceRecord.offset + sourceRecord.byteLength
    );
    const ok = shader.GetEffect().Read(
        buffer,
        sourceRecord.byteLength,
        effectRes.m_version,
        effectRes.m_stringTable,
        effectRes.m_stringTableSize,
        effectRes.sourcePath,
        { effectStateManager: new HlslEffectStateManager() }
    );
    if (ok) shader.ProcessEffect();
    return shader;
}

function normalizeBodySourceRecord(
    record,
    permutationIndex,
    sourceByteLength
)
{
    const end = record?.offset + record?.size;
    if (!record || record.index !== permutationIndex
        || !Number.isSafeInteger(record.offset) || record.offset < 0
        || record.offset > UINT32_MAX
        || !Number.isSafeInteger(record.size) || record.size < 1
        || record.size > UINT32_MAX
        || !Number.isSafeInteger(end)
        || record.end !== end
        || !Number.isSafeInteger(sourceByteLength)
        || end > sourceByteLength)
    {
        throw new Error(
            `Portable effect reflection body index ${permutationIndex} `
            + "disagrees with its source record"
        );
    }
    return Object.freeze({
        offset: record.offset,
        byteLength: record.size
    });
}

function validateDisjointBodySourceRecords(sourceRecords)
{
    const unique = new Map();
    for (const record of sourceRecords)
    {
        const key = `${record.offset}:${record.byteLength}`;
        if (!unique.has(key)) unique.set(key, record);
    }
    const ordered = Array.from(unique.values()).sort((left, right) =>
        left.offset - right.offset || left.byteLength - right.byteLength);
    for (let index = 1; index < ordered.length; index += 1)
    {
        const previous = ordered[index - 1];
        const current = ordered[index];
        if (current.offset < previous.offset + previous.byteLength)
        {
            throw new Error(
                "Portable effect reflection body source records partially overlap"
            );
        }
    }
}

function fingerprintBytes(bytes)
{
    let hash = 0x811c9dc5;
    for (const value of bytes)
    {
        hash = Math.imul(hash ^ value, 0x01000193) >>> 0;
    }
    return `${bytes.byteLength}:${hash.toString(16).padStart(8, "0")}`;
}

function bytesEqual(left, right)
{
    return left.byteLength === right.byteLength
        && left.every((value, index) => value === right[index]);
}

function assertUint8(value, context)
{
    assertUint(value, context);
    if (value > UINT8_MAX)
    {
        throw new Error(`${context} must fit uint8`);
    }
}

function assertUint(value, context)
{
    if (!Number.isSafeInteger(value) || value < 0 || value > UINT32_MAX)
    {
        throw new Error(`${context} must fit uint32`);
    }
}
