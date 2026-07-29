import { HlslReader } from "../../HlslReader.js";
import { asUint8Array } from "@carbonenginejs/runtime-utils/bytes";
import { cjsUint32ToFloat32 } from "../../HlslBinaryUtils.js";
import { HlslRenderStateSetup } from "../../HlslRenderStateSetup.js";
import { HlslResourceSetDescription } from "../../HlslResourceSetDescription.js";
import { HlslShaderBytecode } from "../../HlslShaderBytecode.js";
import {
    HlslRenderContextEnum,
    HlslUsageCodeNames,
    hlslShaderStageName
} from "../HlslRenderContextEnum.js";
import { HlslEffectConstant } from "./HlslEffectConstant.js";
import { HlslEffectLibrary } from "./HlslEffectLibrary.js";
import { HlslEffectParameterAnnotation } from "./HlslEffectParameterAnnotation.js";
import { HlslEffectResource } from "./HlslEffectResource.js";
import { HlslEffectStageInput } from "./HlslEffectStageInput.js";
import { HlslEffectTechnique } from "./HlslEffectTechnique.js";
import { HlslPass } from "./HlslPass.js";
import { HlslSamplerDescription } from "./HlslSamplerDescription.js";
import { HlslSamplerSetup } from "./HlslSamplerSetup.js";

export const DEFAULT_TECHNIQUE = "Main";
export const ANY_TECHNIQUE = "";

/**
 * Trinity effect-description body decoded from one compiled permutation record.
 */
export class HlslEffectDescription
{
    /**
   * Creates an empty decoded effect description.
   */
    constructor()
    {
        this.techniques = [];
        this.annotations = new Map();
        this.version = 0;
        this.effectName = "";
        this.readError = null;
        this.effectStateManager = null;
    }

    /**
   * Reads a compiled effect body using the shared string table from `HlslEffectRes`.
   *
   * @param {ArrayBuffer|ArrayBufferView|Uint8Array} data Effect body bytes.
   * @param {number} dataSize Valid byte size of the effect body.
   * @param {number} version Carbon effect data version.
   * @param {ArrayBuffer|ArrayBufferView|Uint8Array} stringTable Shared effect string table.
   * @param {number} stringTableSize Valid string-table byte count.
   * @param {string} effectName Source effect name or path.
   * @param {object} [options] Reader options and dependency overrides.
   * @returns {boolean} True when the body was decoded successfully.
   */
    Read(data, dataSize, version, stringTable, stringTableSize, effectName, options = {})
    {
        this.techniques = [];
        this.annotations = new Map();
        this.version = Number(version) || 0;
        this.effectName = effectName || "";
        this.readError = null;
        this.effectStateManager = options.effectStateManager || options.renderContext?.m_esm || null;

        try
        {
            const bodyBytes = asUint8Array(data).subarray(0, Number(dataSize) || 0);
            const tableBytes = asUint8Array(stringTable).subarray(0, Number(stringTableSize) || 0);
            const stream = new HlslReader(bodyBytes, {
                stringTable: tableBytes,
                stringTableSize: tableBytes.length,
                source: effectName || "HlslEffectDescription"
            });
            const context = createReadContext(options, this.effectStateManager);
            this.effectStateManager = context.effectStateManager;

            let techniqueCount = 1;
            if (version > 6)
            {
                techniqueCount = stream.readUint8();
            }

            for (let techniqueIndex = 0; techniqueIndex < techniqueCount; techniqueIndex += 1)
            {
                const technique = new HlslEffectTechnique();
                technique.name = version > 6 ? stream.readString() : DEFAULT_TECHNIQUE;
                technique.shaderTypeMask = 0;

                const passCount = sanityCheck(stream.readUint8(), 64, "pass count");
                for (let passIndex = 0; passIndex < passCount; passIndex += 1)
                {
                    const pass = readPass(stream, version, effectName || "", context);
                    technique.passes.push(pass);
                    technique.shaderTypeMask |= pass.shaderTypeMask;
                }

                if (version > 13)
                {
                    const libraryCount = stream.readUint8();
                    for (let libraryIndex = 0; libraryIndex < libraryCount; libraryIndex += 1)
                    {
                        technique.libraries.push(readLibrary(stream, version, context));
                    }
                }

                this.techniques.push(technique);
            }

            const parameterCount = sanityCheck(stream.readUint16(), 256, "parameter annotation count");
            for (let parameterIndex = 0; parameterIndex < parameterCount; parameterIndex += 1)
            {
                const name = stream.readString();
                if (this.annotations.has(name))
                {
                    throw new Error(`Duplicate effect parameter annotation group ${name}`);
                }
                this.annotations.set(name, readAnnotations(stream));
            }

            applyHeapViewAnnotations(this, context);
            return true;
        }
        catch (error)
        {
            this.readError = error;
            this.techniques = [];
            this.annotations = new Map();
            return false;
        }
    }

    /**
   * Returns a JSON-safe summary of decoded techniques and annotations.
   *
   * @returns {object} Serializable effect-description summary.
   */
    toJSON()
    {
        return {
            version: this.version,
            effectName: this.effectName,
            techniques: this.techniques.map((entry) => entry.toJSON()),
            annotations: mapAnnotationToJson(this.annotations),
            readError: this.readError ? {
                name: this.readError.name,
                message: this.readError.message,
                details: this.readError.details || null
            } : null
        };
    }
}

/**
 * Builds the shared parser context used while reading one effect body.
 *
 * @param {object} options Reader options from `Read`.
 * @param {object|null} effectStateManager Effect-state registry override.
 * @returns {object} Parser context.
 */
function createReadContext(options, effectStateManager)
{
    return {
        effectStateManager,
        perFrameVSStartRegister: Number.isInteger(options.perFrameVSStartRegister)
            ? options.perFrameVSStartRegister
            : null,
        perFramePSStartRegister: Number.isInteger(options.perFramePSStartRegister)
            ? options.perFramePSStartRegister
            : null
    };
}

/**
 * Reads one technique pass, including shader stages, signatures, resources, and states.
 *
 * @param {HlslReader} stream Binary reader positioned at a pass record.
 * @param {number} version Carbon effect data version.
 * @param {string} effectName Source effect name or path.
 * @param {object} context Shared parser context.
 * @returns {HlslPass} Decoded pass.
 */
function readPass(stream, version, effectName, context)
{
    const pass = new HlslPass();
    const shaderTypes = [];
    const signatures = [];
    const shaderHandles = [];
    const stageCount = sanityCheck(stream.readUint8(), HlslRenderContextEnum.SHADER_TYPE_COUNT, "stage count");

    for (let stageIndex = 0; stageIndex < stageCount; stageIndex += 1)
    {
        const stageType = stream.readUint8();
        if (stageType >= HlslRenderContextEnum.SHADER_TYPE_COUNT
            || pass.stageInputs[stageType]?.m_exists)
        {
            throw new Error(`Duplicate or invalid shader stage type ${stageType}`);
        }
        const stageInput = pass.stageInputs[stageType] || new HlslEffectStageInput();
        pass.stageInputs[stageType] = stageInput;
        pass.shaderTypeMask |= 1 << stageType;
        stageInput.m_exists = true;

        if (version < 14)
        {
            readPipelineInputs(stageInput.signature.pipelineInputs, stream, version);
            if (version > 8)
            {
                readRegisters(stageInput.signature, stream, version, stageType, context);
            }
        }

        const shaderSize = stream.readUint32();
        let shaderBlob;
        if (version < 5)
        {
            shaderBlob = {
                offset: null,
                bytes: stream.readRaw(shaderSize)
            };
            stream.readRaw(stream.readUint32());
        }
        else
        {
            shaderBlob = stream.readTableBlob(shaderSize);
            if (version < 12)
            {
                stream.readUint32();
                stream.readUint32();
            }
        }

        if (version >= 3)
        {
            stageInput.signature.threadGroupSize = {
                x: stream.readUint32(),
                y: stream.readUint32(),
                z: stream.readUint32()
            };
        }

        if (version >= 14)
        {
            readPipelineInputs(stageInput.signature.pipelineInputs, stream, version);
            readRegisters(stageInput.signature, stream, version, stageType, context);
        }

        readInput(stageInput, stream, version, stageType, context);

        const bytecode = new HlslShaderBytecode({
            stageType,
            stageName: hlslShaderStageName(stageType),
            bytes: shaderBlob.bytes,
            shaderSize,
            stringTableOffset: shaderBlob.offset,
            effectName
        });
        stageInput.cjsShaderBytecode = bytecode;
        stageInput.m_shader = context.effectStateManager.RegisterShader(stageType, bytecode, stageInput.signature, effectName);
        shaderHandles[stageIndex] = stageInput.m_shader;
        shaderTypes.push(stageType);
        signatures.push(stageInput.signature);
    }

    pass.resourceSetDesc = new HlslResourceSetDescription(shaderTypes, signatures);
    for (let stageType = 0; stageType < HlslRenderContextEnum.SHADER_TYPE_COUNT; stageType += 1)
    {
        const stageInput = pass.stageInputs[stageType];
        if (!stageInput?.m_exists) continue;
        for (const [ registerIndex, sampler ] of stageInput.samplers.entries())
        {
            pass.resourceSetDesc.SetSampler(stageType, registerIndex, sampler.sampler);
        }
    }

    pass.shaderProgram = context.effectStateManager.RegisterShaderProgram(shaderHandles, stageCount);

    const stateCount = sanityCheck(stream.readUint8(), 64, "render state count");
    const states = new Map();
    for (let stateIndex = 0; stateIndex < stateCount; stateIndex += 1)
    {
        const state = stream.readUint32();
        const value = stream.readUint32();
        if (states.has(state))
        {
            throw new Error(`Duplicate render state ${state}`);
        }
        states.set(state, value);
    }
    pass.cjsRenderStateSetup = new HlslRenderStateSetup(states);
    pass.renderStates = context.effectStateManager.RegisterRenderStateSetup(pass.cjsRenderStateSetup);

    return pass;
}

/**
 * Reads one ray-tracing shader library block from v14+ effect data.
 *
 * @param {HlslReader} stream Binary reader positioned at a library record.
 * @param {number} version Carbon effect data version.
 * @param {object} context Shared parser context.
 * @returns {HlslEffectLibrary} Decoded library metadata.
 */
function readLibrary(stream, version, context)
{
    const library = new HlslEffectLibrary();
    library.payloadSize = stream.readUint32();
    const bytecodeSize = stream.readUint32();
    const bytecodeBlob = stream.readTableBlob(bytecodeSize);
    library.cjsShaderBytecode = new HlslShaderBytecode({
        stageType: HlslRenderContextEnum.COMPUTE_SHADER,
        stageName: "library",
        bytes: bytecodeBlob.bytes,
        shaderSize: bytecodeSize,
        stringTableOffset: bytecodeBlob.offset
    });
    library.libraryHandle = context.effectStateManager.RegisterShaderLibrary(
        library.cjsShaderBytecode
    );

    const exportCount = stream.readUint32();
    for (let exportIndex = 0; exportIndex < exportCount; exportIndex += 1)
    {
        const type = stream.readUint8();
        const name = stream.readString();
        library.exports.push({ type, name });
        if (type === 0) library.rayGenName = name;
        if (type === 1) library.missName = name;
        if (type === 2) library.closestHitName = name;
        if (type === 3) library.anyHitName = name;
        if (type === 4) library.intersectionName = name;
    }
    library.hitGroupName = stream.readString();

    const shaderType = HlslRenderContextEnum.COMPUTE_SHADER;
    readRegisters(library.globalInput.signature, stream, version, shaderType, context);
    readInput(library.globalInput, stream, version, shaderType, context);
    library.globalResourceSetDesc = new HlslResourceSetDescription([ shaderType ], [ library.globalInput.signature ]);
    for (const [ registerIndex, sampler ] of library.globalInput.samplers.entries())
    {
        library.globalResourceSetDesc.SetSampler(shaderType, registerIndex, sampler.sampler);
    }

    readRegisters(library.localInput.signature, stream, version, shaderType, context);
    readInput(library.localInput, stream, version, shaderType, context);

    return library;
}

/**
 * Reads constants, resources, samplers, UAVs, and annotations for one shader input.
 *
 * @param {HlslEffectStageInput} input Stage or library input to populate.
 * @param {HlslReader} stream Binary reader positioned at an input record.
 * @param {number} version Carbon effect data version.
 * @param {number} stageType Trinity shader stage enum value.
 * @param {object} context Shared parser context.
 */
function readInput(input, stream, version, stageType, context)
{
    const constantCount = stream.readUint32();
    input.constants = [];
    for (let constantIndex = 0; constantIndex < constantCount; constantIndex += 1)
    {
        input.constants.push(readConstant(stream, version));
    }

    const constantValueSize = stream.readUint32();
    input.sourceConstantValueSize = constantValueSize;
    let sourceConstantValues;
    if (version < 5)
    {
        sourceConstantValues = constantValueSize
            ? stream.readRaw(constantValueSize)
            : new Uint8Array(0);
    }
    else
    {
        const blob = stream.readTableBlobOptional(constantValueSize);
        sourceConstantValues = blob.bytes;
    }
    input.sourceConstantValues = Uint8Array.from(sourceConstantValues);
    input.m_constantValueSize = Math.min(
        constantValueSize,
        HlslEffectStageInput.SHADER_CONSTANTS_MAX
    );
    input.constantValues = input.sourceConstantValues.slice(0, input.m_constantValueSize);

    const textureCount = sanityCheck(stream.readUint8(), 64, "texture count");
    input.resources = new Map();
    for (let textureIndex = 0; textureIndex < textureCount; textureIndex += 1)
    {
        const registerIndex = stream.readUint8();
        if (input.resources.has(registerIndex))
        {
            throw new Error(`Duplicate resource register ${registerIndex}`);
        }
        input.resources.set(registerIndex, readResource(stream, version));
    }

    const samplerCount = sanityCheck(stream.readUint8(), 64, "sampler count");
    input.samplers = new Map();
    for (let samplerIndex = 0; samplerIndex < samplerCount; samplerIndex += 1)
    {
        const registerIndex = stream.readUint8();
        const samplerSetup = new HlslSamplerSetup();
        samplerSetup.name = version >= 4 ? stream.readString() : null;
        samplerSetup.sampler = readSampler(stream);
        if (version < 4)
        {
            stream.readBool();
        }
        if (version > 12)
        {
            samplerSetup.sampler.isDynamic = stream.readBool();
            if (!samplerSetup.sampler.isDynamic)
            {
                samplerSetup.name = null;
            }
        }
        if (input.samplers.has(registerIndex))
        {
            throw new Error(`Duplicate sampler register ${registerIndex}`);
        }
        input.samplers.set(registerIndex, samplerSetup);
    }

    if (version >= 3)
    {
        const uavCount = sanityCheck(stream.readUint8(), 64, "uav count");
        input.uavs = new Map();
        for (let uavIndex = 0; uavIndex < uavCount; uavIndex += 1)
        {
            const registerIndex = stream.readUint8();
            const resource = new HlslEffectResource();
            resource.isSRGB = false;
            resource.name = stream.readString();
            resource.type = stream.readUint8();
            resource.arrayElements = version >= 13 ? stream.readUint32() : 1;
            resource.isAutoregister = stream.readBool();
            if (input.uavs.has(registerIndex))
            {
                throw new Error(`Duplicate UAV register ${registerIndex}`);
            }
            input.uavs.set(registerIndex, resource);
        }

        if (version >= 8)
        {
            input.annotation = readAnnotations(stream);
        }
    }

    for (const constant of input.constants)
    {
        patchSamplerHeapIndexConstant(input, constant, context, stageType);
    }
}

/**
 * Reads a vector of parameter annotations from the effect stream.
 *
 * @param {HlslReader} stream Binary reader positioned at an annotation vector.
 * @returns {HlslEffectParameterAnnotation[]} Decoded annotations.
 */
function readAnnotations(stream)
{
    const annotations = [];
    const annotationCount = stream.readUint8();
    for (let annotationIndex = 0; annotationIndex < annotationCount; annotationIndex += 1)
    {
        const annotation = new HlslEffectParameterAnnotation();
        annotation.name = stream.readString();
        annotation.type = stream.readUint8();

        if (annotation.type === HlslEffectParameterAnnotation.Type.STRING)
        {
            annotation.stringValue = stream.readString();
        }
        else
        {
            annotation.rawValue = stream.readUint32();
            annotation.boolValue = annotation.rawValue !== 0;
            annotation.intValue = annotation.rawValue | 0;
            annotation.floatValue = cjsUint32ToFloat32(annotation.rawValue);
        }
        annotations.push(annotation);
    }
    return annotations;
}

/**
 * Reads one constant-buffer metadata record.
 *
 * @param {HlslReader} stream Binary reader positioned at a constant record.
 * @param {number} version Carbon effect data version.
 * @returns {HlslEffectConstant} Decoded constant metadata.
 */
function readConstant(stream, version)
{
    const constant = new HlslEffectConstant();
    constant.name = stream.readString();
    constant.offset = stream.readUint32();
    constant.size = stream.readUint32();
    if (version < 11)
    {
        const oldType = stream.readUint8();
        if (oldType === 0) constant.type = HlslEffectConstant.Type.FLOAT;
        else if (oldType === 1) constant.type = HlslEffectConstant.Type.INT;
        else if (oldType === 2) constant.type = HlslEffectConstant.Type.BOOL;
        else constant.type = HlslEffectConstant.Type.OTHER;
    }
    else
    {
        constant.type = stream.readUint8();
    }
    constant.dimension = stream.readUint8();
    constant.elements = stream.readUint32();
    constant.isSRGB = stream.readBool();
    constant.isAutoregister = stream.readBool();
    return constant;
}

/**
 * Reads one shader resource metadata record.
 *
 * @param {HlslReader} stream Binary reader positioned at a resource record.
 * @param {number} version Carbon effect data version.
 * @returns {HlslEffectResource} Decoded resource metadata.
 */
function readResource(stream, version)
{
    const resource = new HlslEffectResource();
    resource.name = stream.readString();
    resource.type = stream.readUint8();
    resource.arrayElements = version >= 13 ? stream.readUint32() : 1;
    resource.isSRGB = stream.readBool();
    resource.isAutoregister = stream.readBool();
    return resource;
}

/**
 * Reads one static or dynamic sampler descriptor.
 *
 * @param {HlslReader} stream Binary reader positioned at a sampler descriptor.
 * @returns {HlslSamplerDescription} Decoded sampler descriptor.
 */
function readSampler(stream)
{
    const sampler = new HlslSamplerDescription();
    sampler.comparison = stream.readBool();
    sampler.minFilter = stream.readUint8();
    sampler.magFilter = stream.readUint8();
    sampler.mipFilter = stream.readUint8();
    sampler.addressU = stream.readUint8();
    sampler.addressV = stream.readUint8();
    sampler.addressW = stream.readUint8();
    const mipLODBias = readFloat32WithBits(stream);
    sampler.mipLODBias = mipLODBias.value;
    sampler.mipLODBiasRaw = mipLODBias.rawValue;
    sampler.maxAnisotropy = stream.readUint8();
    sampler.comparisonFunc = stream.readUint8();
    const borderColor = Array.from({ length: 4 }, () => readFloat32WithBits(stream));
    sampler.borderColor = borderColor.map((entry) => entry.value);
    sampler.borderColorRaw = borderColor.map((entry) => entry.rawValue);
    const minLOD = readFloat32WithBits(stream);
    sampler.minLOD = minLOD.value;
    sampler.minLODRaw = minLOD.rawValue;
    const maxLOD = readFloat32WithBits(stream);
    sampler.maxLOD = maxLOD.value;
    sampler.maxLODRaw = maxLOD.rawValue;
    return sampler;
}

/**
 * Reads vertex/input-layout signature records for one shader stage.
 *
 * @param {object[]} pipelineInputs Destination pipeline-input array.
 * @param {HlslReader} stream Binary reader positioned at the input list.
 * @param {number} version Carbon effect data version.
 */
function readPipelineInputs(pipelineInputs, stream, version)
{
    const inputCount = sanityCheck(stream.readUint8(), 64, "pipeline input count");
    pipelineInputs.length = 0;
    for (let inputIndex = 0; inputIndex < inputCount; inputIndex += 1)
    {
        const usage = stream.readUint8();
        const registerIndex = stream.readUint8();
        const usageIndex = stream.readUint8();
        const usedMask = stream.readUint8();
        const input = {
            usage,
            usageName: HlslUsageCodeNames[usage] || `USAGE_${usage}`,
            registerIndex,
            usageIndex,
            usedMask,
            type: 0,
            dimension: 4
        };
        if (version > 10)
        {
            input.type = stream.readUint8();
            input.dimension = stream.readUint8();
        }
        else
        {
            input.type = usage === 6 ? HlslEffectConstant.Type.UINT : HlslEffectConstant.Type.FLOAT;
            input.dimension = 4;
        }
        pipelineInputs.push(input);
    }
}

/**
 * Reads resource-register signatures and static sampler signatures for one stage.
 *
 * @param {object} signature Stage signature object to populate.
 * @param {HlslReader} stream Binary reader positioned at the register list.
 * @param {number} version Carbon effect data version.
 * @param {number} stageType Trinity shader stage enum value.
 * @param {object} context Shared parser context.
 */
function readRegisters(signature, stream, version, stageType, context)
{
    let inputCount = stream.readUint8();
    signature.registers = [];
    for (let inputIndex = 0; inputIndex < inputCount; inputIndex += 1)
    {
        const register = {};
        if (version > 9)
        {
            register.registerType = stream.readUint8();
        }
        else
        {
            register.registerType = mapOldRegisterType(stream.readUint8());
        }
        register.registerIndex = stream.readUint32();
        if (version > 12)
        {
            register.arrayCount = stream.readUint32();
            register.registerCount = register.arrayCount;
            register.registerSpace = stream.readUint8();
        }
        else
        {
            register.arrayCount = 1;
            register.registerCount = 1;
            register.registerSpace = stageType;
        }
        register.dynamic = isRegisterDynamic(register, stageType, context);
        signature.registers.push(register);
    }

    if (version > 12)
    {
        inputCount = stream.readUint8();
        signature.samplers = [];
        for (let inputIndex = 0; inputIndex < inputCount; inputIndex += 1)
        {
            signature.samplers.push(readStaticSampler(stream));
        }
    }
}

/**
 * Reads one static sampler signature entry from v13+ effect data.
 *
 * @param {HlslReader} stream Binary reader positioned at a static sampler record.
 * @returns {object} Decoded static sampler entry.
 */
function readStaticSampler(stream)
{
    const record = {
        registerIndex: stream.readUint32(),
        registerSpace: stream.readUint8(),
        sampler: {
            comparison: stream.readBool(),
            minFilter: stream.readUint8(),
            magFilter: stream.readUint8(),
            mipFilter: stream.readUint8(),
            addressU: stream.readUint8(),
            addressV: stream.readUint8(),
            addressW: stream.readUint8(),
            mipLODBias: 0,
            maxAnisotropy: 0,
            comparisonFunc: 0,
            borderColor: 0,
            minLOD: 0,
            maxLOD: 0
        }
    };
    Object.defineProperties(record.sampler, {
        mipLODBiasRaw: { value: 0, writable: true },
        minLODRaw: { value: 0, writable: true },
        maxLODRaw: { value: 0, writable: true }
    });
    const mipLODBias = readFloat32WithBits(stream);
    record.sampler.mipLODBias = mipLODBias.value;
    record.sampler.mipLODBiasRaw = mipLODBias.rawValue;
    record.sampler.maxAnisotropy = stream.readUint8();
    record.sampler.comparisonFunc = stream.readUint8();
    record.sampler.borderColor = stream.readUint8();
    const minLOD = readFloat32WithBits(stream);
    record.sampler.minLOD = minLOD.value;
    record.sampler.minLODRaw = minLOD.rawValue;
    const maxLOD = readFloat32WithBits(stream);
    record.sampler.maxLOD = maxLOD.value;
    record.sampler.maxLODRaw = maxLOD.rawValue;
    return record;
}

/**
 * Reads one float while preserving its exact serialized IEEE-754 bits.
 *
 * @param {HlslReader} stream Binary reader positioned at a float.
 * @returns {{value:number,rawValue:number}} Decoded value and raw uint32 bits.
 */
function readFloat32WithBits(stream)
{
    const rawValue = stream.readUint32();
    return {
        value: cjsUint32ToFloat32(rawValue),
        rawValue
    };
}

/**
 * Maps pre-v10 register type ids to Carbon's newer register type values.
 *
 * @param {number} value Legacy register type id.
 * @returns {number} Modern register type value.
 */
function mapOldRegisterType(value)
{
    if (value === 0) return 0;
    if (value === 1) return 36;
    if (value === 2) return 68;
    if (value === 3) return 1;
    return 36;
}

/**
 * Determines whether a resource register is dynamic for the current stage.
 *
 * @param {object} register Register signature metadata.
 * @param {number} stageType Trinity shader stage enum value.
 * @param {object} context Shared parser context.
 * @returns {boolean} True when the register should be treated as dynamic.
 */
function isRegisterDynamic(register, stageType, context)
{
    if (register.registerType !== 0)
    {
        return true;
    }
    if (stageType === HlslRenderContextEnum.VERTEX_SHADER && register.registerIndex === context.perFrameVSStartRegister)
    {
        return false;
    }
    if (stageType === HlslRenderContextEnum.PIXEL_SHADER && register.registerIndex === context.perFramePSStartRegister)
    {
        return false;
    }
    return true;
}

/**
 * Ensures sampler heap-index constants have enough backing constant data.
 *
 * @param {HlslEffectStageInput} input Stage input containing samplers and constants.
 * @param {HlslEffectConstant} constant Constant metadata to compare with sampler names.
 */
function patchSamplerHeapIndexConstant(input, constant)
{
    if (constant.type !== HlslEffectConstant.Type.UINT || constant.dimension !== 1)
    {
        return;
    }
    for (const sampler of input.samplers.values())
    {
        if (sampler.name !== constant.name) continue;
        const neededSize = constant.offset + constant.size;
        if (neededSize > input.m_constantValueSize)
        {
            const next = new Uint8Array(neededSize);
            next.set(input.constantValues);
            input.constantValues = next;
            input.m_constantValueSize = neededSize;
        }
        break;
    }
}

/**
 * Applies `IsHeapView` parameter annotations to resource-set descriptions.
 *
 * @param {HlslEffectDescription} effectDescription Fully read effect description.
 */
function applyHeapViewAnnotations(effectDescription)
{
    const isHeapView = (name) =>
    {
        if (!name) return false;
        const annotations = effectDescription.annotations.get(name) || [];
        return annotations.some((annotation) =>
            annotation.name === "IsHeapView" &&
      annotation.type === HlslEffectParameterAnnotation.Type.BOOL &&
      annotation.boolValue
        );
    };

    for (const technique of effectDescription.techniques)
    {
        for (const library of technique.libraries)
        {
            const shaderType = HlslRenderContextEnum.COMPUTE_SHADER;
            for (const [ registerIndex, resource ] of library.globalInput.resources.entries())
            {
                if (isHeapView(resource.name)) library.globalResourceSetDesc?.SetSrvHeapView(shaderType, registerIndex);
            }
            for (const [ registerIndex, resource ] of library.globalInput.uavs.entries())
            {
                if (isHeapView(resource.name)) library.globalResourceSetDesc?.SetUavHeapView(shaderType, registerIndex);
            }
            for (const [ registerIndex, sampler ] of library.globalInput.samplers.entries())
            {
                if (isHeapView(sampler.name)) library.globalResourceSetDesc?.SetSamplerHeapView(shaderType, registerIndex);
            }
        }

        for (const pass of technique.passes)
        {
            for (let stageType = 0; stageType < pass.stageInputs.length; stageType += 1)
            {
                const stage = pass.stageInputs[stageType];
                if (!stage?.m_exists) continue;
                for (const [ registerIndex, resource ] of stage.resources.entries())
                {
                    if (isHeapView(resource.name)) pass.resourceSetDesc?.SetSrvHeapView(stageType, registerIndex);
                }
                for (const [ registerIndex, resource ] of stage.uavs.entries())
                {
                    if (isHeapView(resource.name)) pass.resourceSetDesc?.SetUavHeapView(stageType, registerIndex);
                }
                for (const [ registerIndex, sampler ] of stage.samplers.entries())
                {
                    if (isHeapView(sampler.name)) pass.resourceSetDesc?.SetSamplerHeapView(stageType, registerIndex);
                }
            }
        }
    }
}

/**
 * Rejects unexpectedly large counts before allocating or iterating.
 *
 * @param {number} value Count read from the effect stream.
 * @param {number} limit Maximum expected count.
 * @param {string} label Name used in the thrown error.
 * @returns {number} The original value when it is within range.
 */
function sanityCheck(value, limit, label)
{
    if (value > limit)
    {
        throw new Error(`Unexpected ${label}: ${value}`);
    }
    return value;
}

/**
 * Serializes a map of parameter names to annotation arrays.
 *
 * @param {Map<string, HlslEffectParameterAnnotation[]>} map Annotation map.
 * @returns {object[]} JSON-safe annotation groups.
 */
function mapAnnotationToJson(map)
{
    return Array.from(map.entries()).map(([ name, annotations ]) => ({
        name,
        annotations: annotations.map((entry) => entry.toJSON())
    }));
}
