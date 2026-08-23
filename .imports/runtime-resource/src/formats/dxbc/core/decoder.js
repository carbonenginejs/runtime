import { DxbcReadError } from "./errors.js";
import {
    DXBC_OPCODE_CUSTOMDATA,
    DxbcBooleanTestOpcodeNames,
    DxbcOpcodeNames,
    dxbcIsDeclarationOpcode,
    dxbcOpcodeName
} from "./opcodes.js";

const COMPONENTS = [ "x", "y", "z", "w" ];

/**
 * Operand register-file names indexed by the operand-token type field.
 */
export const DxbcOperandTypeNames = Object.freeze([
    "temp", "input", "output", "indexable_temp", "immediate32", "immediate64",
    "sampler", "resource", "constant_buffer", "immediate_constant_buffer",
    "label", "input_primitive_id", "output_depth", "null", "rasterizer",
    "output_coverage", "stream", "function_body", "function_table", "interface",
    "function_input", "function_output", "output_control_point_id",
    "input_fork_instance_id", "input_join_instance_id", "input_control_point",
    "output_control_point", "input_patch_constant", "input_domain_point",
    "this_pointer", "uav", "thread_group_shared_memory", "input_thread_id",
    "input_thread_group_id", "input_thread_id_in_group", "input_coverage_mask",
    "input_thread_id_in_group_flattened", "input_gs_instance_id",
    "output_depth_greater_equal", "output_depth_less_equal", "cycle_counter"
]);

/**
 * Operand modifier names indexed by the extended-operand modifier field.
 */
export const DxbcOperandModifierNames = Object.freeze([ "none", "neg", "abs", "absneg" ]);

/**
 * System-value names indexed by DXBC name-token values.
 */
export const DxbcSystemValueNames = Object.freeze([
    "undefined", "position", "clip_distance", "cull_distance",
    "render_target_array_index", "viewport_array_index", "vertex_id",
    "primitive_id", "instance_id", "is_front_face", "sample_index"
]);

/**
 * Resource dimension names indexed by declaration resource-dimension ids.
 */
export const DxbcResourceDimensionNames = Object.freeze([
    "unknown", "buffer", "texture1d", "texture2d", "texture2dms", "texture3d",
    "texturecube", "texture1darray", "texture2darray", "texture2dmsarray",
    "texturecubearray", "raw_buffer", "structured_buffer"
]);

/**
 * Resource return-type names indexed by return-type nibble values.
 */
export const DxbcResourceReturnTypeNames = Object.freeze([
    "unknown", "unorm", "snorm", "sint", "uint", "float", "mixed", "double",
    "continued"
]);

const RESINFO_RETURN_TYPE_NAMES = [ "float", "rcpfloat", "uint" ];
const SAMPLER_MODE_NAMES = [ "default", "comparison", "mono" ];
const INTERPOLATION_MODE_NAMES = [
    "undefined", "constant", "linear", "linear_centroid", "linear_noperspective",
    "linear_noperspective_centroid", "linear_sample", "linear_noperspective_sample"
];
const MIN_PRECISION_NAMES = [ "default", "float_16", "float_2_8", "reserved", "sint_16", "uint_16" ];
const CUSTOM_DATA_CLASS_NAMES = [
    "comment", "debug_info", "opaque", "dcl_immediate_constant_buffer",
    "shader_message"
];
const SYNC_FLAG_NAMES = [
    "threads_in_group",
    "thread_group_shared_memory",
    "thread_group_uav_memory",
    "global_uav_memory"
];

const SM51_RESOURCE_OPERAND_TYPES = new Set([ 6, 7, 8, 30 ]);
const SM51_UNBOUNDED_REGISTER = 0xffffffff;

function signExtend4(value)
{
    return (value & 0x8) ? value - 0x10 : value;
}

function maskToComponents(mask)
{
    return COMPONENTS.filter((_, index) => (mask & (1 << index)) !== 0).join("");
}

/**
 * Decodes an opcode-extension token (`sample_controls`, `resource_dimension`,
 * or `resource_return_type`).
 *
 * @param {number} token Extension token.
 * @returns {object} Decoded extension record.
 */
function decodeOpcodeExtension(token)
{
    const type = token & 0x3f;
    const out = { token, type };
    if (type === 1)
    {
        out.typeName = "sample_controls";
        out.sampleOffsets = {
            u: signExtend4((token >>> 9) & 0xf),
            v: signExtend4((token >>> 13) & 0xf),
            w: signExtend4((token >>> 17) & 0xf)
        };
    }
    else if (type === 2)
    {
        out.typeName = "resource_dimension";
        out.resourceDimension = (token >>> 6) & 0x1f;
        out.resourceDimensionName = DxbcResourceDimensionNames[out.resourceDimension] || "unknown";
        out.structureStride = (token >>> 11) & 0xfff;
    }
    else if (type === 3)
    {
        out.typeName = "resource_return_type";
        out.resourceReturnTypes = [ 0, 1, 2, 3 ].map((coord) => (token >>> (coord * 4 + 6)) & 0xf);
    }
    else
    {
        out.typeName = type === 0 ? "empty" : `extended_opcode_${type}`;
    }
    return out;
}

/**
 * Decodes a standalone resource return-type token (four nibbles from bit 0).
 *
 * @param {number} token Return-type token.
 * @returns {{token:number,returnTypes:number[],returnTypeNames:string[]}} Decoded record.
 */
function decodeReturnTypeToken(token)
{
    const returnTypes = [ 0, 1, 2, 3 ].map((coord) => (token >>> (coord * 4)) & 0xf);
    return {
        token,
        returnTypes,
        returnTypeNames: returnTypes.map((value) => DxbcResourceReturnTypeNames[value] || `return_type_${value}`)
    };
}

function decodeSm51BindingRange(operand, registerSpace, fail)
{
    if (operand.indices.length !== 3)
    {
        throw fail("SM5.1 resource declaration must use a 3D binding-range operand", {
            indexDimension: operand.indices.length
        });
    }

    const values = operand.indices.map((index) =>
    {
        if (index.representation !== 0 || index.values.length !== 1 || index.relative)
        {
            throw fail("SM5.1 binding-range indices must be immediate32 values", {
                dimension: index.dimension,
                representation: index.representation
            });
        }
        return index.values[0];
    });
    const [ rangeId, lowerBound, upperBound ] = values;
    const unbounded = upperBound === SM51_UNBOUNDED_REGISTER;
    if (!unbounded && upperBound < lowerBound)
    {
        throw fail("SM5.1 binding range has an upper bound below its lower bound", {
            rangeId,
            lowerBound,
            upperBound
        });
    }

    return {
        bindingModel: "sm5.1-range",
        rangeId,
        lowerBound,
        upperBound,
        unbounded,
        registerCount: unbounded ? null : upperBound - lowerBound + 1,
        registerSpace
    };
}

function decodeSm51ResourceReference(operand)
{
    if (!SM51_RESOURCE_OPERAND_TYPES.has(operand.type) || operand.indices.length === 0)
    {
        return null;
    }

    const reference = {
        bindingModel: "sm5.1-range",
        rangeId: operand.indices[0]?.values[0] ?? null,
        nonUniform: operand.nonUniform,
        absoluteIndex: null,
        bufferIndex: null,
        vectorOffset: null
    };
    if (operand.type === 8)
    {
        reference.bufferIndex = operand.indices[1] || null;
        reference.vectorOffset = operand.indices[2] || null;
    }
    else
    {
        reference.absoluteIndex = operand.indices[1] || null;
    }
    return reference;
}

function decodeThreadGroupSharedMemoryRegister(operand, fail)
{
    if (operand.typeName !== "thread_group_shared_memory")
    {
        throw fail("DXBC thread-group shared-memory declaration must use a thread-group shared-memory operand", {
            operandType: operand.type,
            operandTypeName: operand.typeName
        });
    }
    if (operand.componentCount !== 0)
    {
        throw fail("DXBC thread-group shared-memory declaration operand must not select components", {
            componentCount: operand.componentCount,
            selectionModeName: operand.selectionModeName
        });
    }
    if ((operand.token & 0xfff) !== 0
        || (operand.token & 0x7e000000) !== 0
        || (operand.token >>> 31) !== 0
        || operand.modifierName !== "none"
        || operand.minPrecisionName !== "default"
        || operand.nonUniform)
    {
        throw fail("DXBC thread-group shared-memory declaration operand must be unmodified", {
            token: operand.token,
            modifierName: operand.modifierName,
            minPrecisionName: operand.minPrecisionName,
            nonUniform: operand.nonUniform
        });
    }
    if (operand.indices.length !== 1)
    {
        throw fail("DXBC thread-group shared-memory declaration must use a 1D register operand", {
            indexDimension: operand.indices.length
        });
    }

    const index = operand.indices[0];
    if (index.representation !== 0 || index.values.length !== 1 || index.relative)
    {
        throw fail("DXBC thread-group shared-memory register index must be an immediate32 value", {
            representation: index.representation
        });
    }
    if (operand.length !== 2)
    {
        throw fail("DXBC thread-group shared-memory declaration operand has an unsupported encoding", {
            length: operand.length
        });
    }
    return index.values[0];
}

function requirePositiveDwordAligned(value, fieldName, fail)
{
    if (value === 0 || (value & 0x3) !== 0)
    {
        throw fail(`DXBC thread-group shared-memory ${fieldName} must be a positive multiple of 4`, {
            [fieldName]: value
        });
    }
    return value;
}

/**
 * SM4/SM5 instruction-stream decoder over a `DxbcShaderProgram` token array.
 *
 * Executable instructions decode strictly: operands must consume the exact
 * instruction length or the decoder throws. Declarations decode the payloads
 * the vertex/pixel corpus uses and keep any remaining dwords as `tailTokens`
 * so unusual stages stay inspectable without failing the framing walk.
 */
export class DxbcInstructionDecoder
{
    /**
     * Creates an empty instruction decoder; call a read entry point to decode a token stream.
     */
    constructor()
    {
        this.tokens = new Uint32Array(0);
        this.instructions = [];
        this.source = "memory";
    }

    /**
   * Decodes every instruction in a shader program token stream.
   *
   * @param {import("./program.js").DxbcShaderProgram} program Parsed `SHEX`/`SHDR` program.
   * @param {object} [options] Decode options.
   * @param {string} [options.source] Source name used in error details.
   * @returns {DxbcInstructionDecoder} This decoder.
   */
    Decode(program, options = {})
    {
        this.tokens = program.tokens;
        this.source = options.source || program.source || "memory";
        this.programType = program.programType;
        this.programTypeName = program.programTypeName;
        this.majorVersion = program.majorVersion;
        this.minorVersion = program.minorVersion;
        this.instructions = [];

        let position = 2;
        while (position < this.tokens.length)
        {
            const instruction = this._decodeInstruction(position);
            this.instructions.push(instruction);
            position += instruction.length;
        }
        return this;
    }

    /**
   * Counts decoded instructions per mnemonic.
   *
   * @returns {Map<string, number>} Opcode-name histogram.
   */
    opcodeHistogram()
    {
        const histogram = new Map();
        for (const instruction of this.instructions)
        {
            histogram.set(instruction.opcodeName, (histogram.get(instruction.opcodeName) || 0) + 1);
        }
        return histogram;
    }

    /**
   * Decodes one instruction starting at a token position.
   *
   * @param {number} position Token index of the instruction's first token.
   * @returns {object} Instruction record.
   * @private
   */
    _decodeInstruction(position)
    {
        const token0 = this.tokens[position];
        const opcode = token0 & 0x7ff;
        const opcodeName = dxbcOpcodeName(opcode);

        if (opcode >= DxbcOpcodeNames.length)
        {
            throw new DxbcReadError("Unknown DXBC opcode", {
                source: this.source,
                offset: position,
                opcode
            });
        }

        if (opcode === DXBC_OPCODE_CUSTOMDATA)
        {
            return this._decodeCustomData(position, token0);
        }

        const length = (token0 >>> 24) & 0x7f;
        if (length < 1 || position + length > this.tokens.length)
        {
            throw new DxbcReadError("DXBC instruction length lies outside the program", {
                source: this.source,
                offset: position,
                opcode,
                opcodeName,
                length,
                programLength: this.tokens.length
            });
        }

        const extensions = [];
        let cursor = position + 1;
        let chainToken = token0;
        while ((chainToken >>> 31) === 1)
        {
            if (cursor >= position + length)
            {
                throw new DxbcReadError("DXBC extended-opcode chain overruns the instruction", {
                    source: this.source,
                    offset: position,
                    opcodeName
                });
            }
            chainToken = this.tokens[cursor];
            extensions.push(decodeOpcodeExtension(chainToken));
            cursor += 1;
        }

        const instruction = {
            offset: position,
            opcode,
            opcodeName,
            length,
            token0,
            isDeclaration: dxbcIsDeclarationOpcode(opcode),
            saturate: opcodeName === "sync" ? false : (token0 & 0x00002000) !== 0,
            preciseMask: maskToComponents((token0 >>> 19) & 0xf),
            extensions,
            operands: [],
            declaration: null,
            customData: null,
            tailTokens: []
        };

        if (DxbcBooleanTestOpcodeNames.has(opcodeName))
        {
            instruction.testBoolean = ((token0 >>> 18) & 1) === 0 ? "zero" : "nonzero";
        }
        if (opcodeName === "resinfo")
        {
            const returnType = (token0 >>> 11) & 0x3;
            instruction.resinfoReturnType = returnType;
            instruction.resinfoReturnTypeName = RESINFO_RETURN_TYPE_NAMES[returnType] || `return_type_${returnType}`;
        }
        if (opcodeName === "sync")
        {
            instruction.syncFlags = (token0 >>> 11) & 0xff;
            instruction.syncFlagNames = SYNC_FLAG_NAMES.filter((_, index) =>
                (instruction.syncFlags & (1 << index)) !== 0);
        }

        const end = position + length;
        if (instruction.isDeclaration)
        {
            this._decodeDeclaration(instruction, cursor, end);
        }
        else if (opcodeName === "sync")
        {
            if (instruction.extensions.length
                || cursor !== end
                || (token0 & 0x00f80000) !== 0)
            {
                throw new DxbcReadError("DXBC sync instruction must not contain extensions, operands, or reserved controls", {
                    source: this.source,
                    offset: instruction.offset,
                    opcodeName
                });
            }
        }
        else
        {
            instruction.operands = this._decodeOperandRun(cursor, end, instruction);
            if (this.majorVersion === 5 && this.minorVersion >= 1)
            {
                for (const operand of instruction.operands)
                {
                    const resourceReference = decodeSm51ResourceReference(operand);
                    if (resourceReference) operand.resourceReference = resourceReference;
                }
            }
        }
        return instruction;
    }

    /**
   * Decodes a custom-data block, including immediate constant buffers.
   *
   * @param {number} position Token index of the custom-data token.
   * @param {number} token0 Custom-data opcode token.
   * @returns {object} Instruction record.
   * @private
   */
    _decodeCustomData(position, token0)
    {
        if (position + 1 >= this.tokens.length)
        {
            throw new DxbcReadError("DXBC custom-data block is missing its length token", {
                source: this.source,
                offset: position
            });
        }
        const length = this.tokens[position + 1];
        if (length < 2 || position + length > this.tokens.length)
        {
            throw new DxbcReadError("DXBC custom-data length lies outside the program", {
                source: this.source,
                offset: position,
                length,
                programLength: this.tokens.length
            });
        }

        const dataClass = token0 >>> 11;
        const customData = {
            dataClass,
            dataClassName: CUSTOM_DATA_CLASS_NAMES[dataClass] || `custom_data_${dataClass}`,
            valueCount: length - 2,
            immediateConstantBuffer: null
        };

        if (dataClass === 3)
        {
            if ((length - 2) % 4 !== 0)
            {
                throw new DxbcReadError("DXBC immediate constant buffer is not vec4-aligned", {
                    source: this.source,
                    offset: position,
                    length
                });
            }
            const floatView = new Float32Array(this.tokens.buffer, this.tokens.byteOffset, this.tokens.length);
            const rows = [];
            for (let index = position + 2; index < position + length; index += 4)
            {
                rows.push([ 0, 1, 2, 3 ].map((component) => ({
                    uint32: this.tokens[index + component],
                    float32: floatView[index + component]
                })));
            }
            customData.immediateConstantBuffer = rows;
        }

        return {
            offset: position,
            opcode: DXBC_OPCODE_CUSTOMDATA,
            opcodeName: "customdata",
            length,
            token0,
            isDeclaration: true,
            saturate: false,
            preciseMask: "",
            extensions: [],
            operands: [],
            declaration: null,
            customData,
            tailTokens: []
        };
    }

    /**
   * Decodes declaration payloads for the opcodes the WebGL corpus exercises,
   * keeping unconsumed dwords as raw tail tokens.
   *
   * @param {object} instruction Instruction record being filled.
   * @param {number} cursor Token index after the opcode and extension tokens.
   * @param {number} end Exclusive token index of the instruction end.
   * @private
   */
    _decodeDeclaration(instruction, cursor, end)
    {
        const token0 = instruction.token0;
        const name = instruction.opcodeName;
        const declaration = {};
        instruction.declaration = declaration;

        const takeOperand = () =>
        {
            const operand = this._decodeOperand(cursor, end, instruction);
            instruction.operands.push(operand);
            cursor += operand.length;
            return operand;
        };
        const takeToken = () =>
        {
            if (cursor >= end)
            {
                throw new DxbcReadError("DXBC declaration payload is truncated", {
                    source: this.source,
                    offset: instruction.offset,
                    opcodeName: name
                });
            }
            const value = this.tokens[cursor];
            cursor += 1;
            return value;
        };
        const failDeclaration = (message, details = {}) => new DxbcReadError(message, {
            source: this.source,
            offset: instruction.offset,
            opcodeName: name,
            ...details
        });
        const applyBindingRange = (operand, registerSpace) =>
        {
            const bindingRange = decodeSm51BindingRange(operand, registerSpace, failDeclaration);
            declaration.bindingModel = bindingRange.bindingModel;
            declaration.bindingRange = bindingRange;
            declaration.registerIndex = bindingRange.lowerBound;
        };
        const isSm51 = this.majorVersion === 5 && this.minorVersion >= 1;

        switch (name)
        {
            case "dcl_global_flags":
                // Kept unshifted (bits 11-23) so values compare directly against the
                // GLOBAL_FLAG_* constants in HLSLcc's tokens.h.
                declaration.globalFlags = token0 & 0x00fff800;
                declaration.refactoringAllowed = (token0 & (1 << 11)) !== 0;
                break;
            case "dcl_temps":
                declaration.tempCount = takeToken();
                break;
            case "dcl_indexable_temp":
                declaration.registerIndex = takeToken();
                declaration.registerCount = takeToken();
                declaration.componentCount = takeToken();
                break;
            case "dcl_constant_buffer": {
                declaration.accessPattern = ((token0 >>> 11) & 1) === 0 ? "immediate_indexed" : "dynamic_indexed";
                const operand = takeOperand();
                if (isSm51)
                {
                    declaration.sizeInVec4 = takeToken();
                    applyBindingRange(operand, takeToken());
                }
                else
                {
                    declaration.registerIndex = operand.indices[0]?.values[0] ?? null;
                    declaration.sizeInVec4 = operand.indices[1]?.values[0] ?? null;
                }
                break;
            }
            case "dcl_sampler": {
                const samplerMode = (token0 >>> 11) & 0x3;
                declaration.samplerMode = samplerMode;
                declaration.samplerModeName = SAMPLER_MODE_NAMES[samplerMode] || `sampler_mode_${samplerMode}`;
                const operand = takeOperand();
                if (isSm51) applyBindingRange(operand, takeToken());
                else declaration.registerIndex = operand.registerIndex;
                break;
            }
            case "dcl_resource": {
                const dimension = (token0 >>> 11) & 0x1f;
                declaration.resourceDimension = dimension;
                declaration.resourceDimensionName = DxbcResourceDimensionNames[dimension] || `dimension_${dimension}`;
                declaration.sampleCount = (token0 >>> 16) & 0x7f;
                const operand = takeOperand();
                declaration.returnType = decodeReturnTypeToken(takeToken());
                if (isSm51) applyBindingRange(operand, takeToken());
                else declaration.registerIndex = operand.registerIndex;
                break;
            }
            case "dcl_resource_raw": {
                const operand = takeOperand();
                if (isSm51) applyBindingRange(operand, takeToken());
                else declaration.registerIndex = operand.registerIndex;
                break;
            }
            case "dcl_resource_structured": {
                const operand = takeOperand();
                // Corpus reality: the byte stride is a trailing dword after the operand
                // (48 for BoneTransforms float4x3 rows, 4 for uint index lists). The
                // extended-opcode RESOURCE_DIM stride is a fork-added fallback only.
                const extensionStride = instruction.extensions.find((ext) => ext.typeName === "resource_dimension");
                declaration.structureStride = cursor < end ? takeToken() : (extensionStride?.structureStride ?? null);
                if (isSm51) applyBindingRange(operand, takeToken());
                else declaration.registerIndex = operand.registerIndex;
                break;
            }
            case "dcl_input": {
                const operand = takeOperand();
                declaration.registerIndex = operand.registerIndex;
                // Compute-stage pseudo-inputs (thread id / thread group id / thread id
                // in group / flattened thread id in group) are distinguished purely by
                // the operand's own type field, not by register index — surface it so
                // the emitter can branch without re-decoding the operand.
                declaration.operandType = operand.type;
                declaration.operandTypeName = operand.typeName;
                break;
            }
            case "dcl_output":
                declaration.registerIndex = takeOperand().registerIndex;
                break;
            case "dcl_thread_group":
                // Three raw dwords, no operand (`decode.cpp` OPCODE_DCL_THREAD_GROUP:
                // pui32Token[1..3] are the X/Y/Z workgroup sizes).
                declaration.threadGroupX = takeToken();
                declaration.threadGroupY = takeToken();
                declaration.threadGroupZ = takeToken();
                break;
            case "dcl_unordered_access_view_typed": {
                // Same dimension-bits layout as `dcl_resource` (bits 11-15); bit 16 is
                // the globally-coherent access flag here rather than an MS sample count.
                const dimension = (token0 >>> 11) & 0x1f;
                declaration.resourceDimension = dimension;
                declaration.resourceDimensionName = DxbcResourceDimensionNames[dimension] || `dimension_${dimension}`;
                declaration.globallyCoherent = (token0 & 0x00010000) !== 0;
                const operand = takeOperand();
                declaration.returnType = decodeReturnTypeToken(takeToken());
                if (isSm51) applyBindingRange(operand, takeToken());
                else declaration.registerIndex = operand.registerIndex;
                break;
            }
            case "dcl_unordered_access_view_raw": {
                const operand = takeOperand();
                declaration.globallyCoherent = (token0 & 0x00010000) !== 0;
                if (isSm51) applyBindingRange(operand, takeToken());
                else declaration.registerIndex = operand.registerIndex;
                break;
            }
            case "dcl_unordered_access_view_structured": {
                const operand = takeOperand();
                declaration.globallyCoherent = (token0 & 0x00010000) !== 0;
                declaration.structureStride = takeToken();
                if (isSm51) applyBindingRange(operand, takeToken());
                else declaration.registerIndex = operand.registerIndex;
                break;
            }
            case "dcl_thread_group_shared_memory_raw": {
                const operand = takeOperand();
                declaration.registerIndex = decodeThreadGroupSharedMemoryRegister(operand, failDeclaration);
                declaration.byteCount = requirePositiveDwordAligned(takeToken(), "byteCount", failDeclaration);
                break;
            }
            case "dcl_thread_group_shared_memory_structured": {
                const operand = takeOperand();
                declaration.registerIndex = decodeThreadGroupSharedMemoryRegister(operand, failDeclaration);
                declaration.structureStride = requirePositiveDwordAligned(takeToken(), "structureStride", failDeclaration);
                declaration.structureCount = takeToken();
                if (declaration.structureCount === 0)
                {
                    throw failDeclaration("DXBC thread-group shared-memory structureCount must be positive");
                }
                break;
            }
            case "dcl_input_ps": {
                const interpolation = (token0 >>> 11) & 0xf;
                declaration.interpolationMode = interpolation;
                declaration.interpolationModeName = INTERPOLATION_MODE_NAMES[interpolation] || `interpolation_${interpolation}`;
                declaration.registerIndex = takeOperand().registerIndex;
                break;
            }
            case "dcl_input_sgv":
            case "dcl_input_siv":
            case "dcl_output_sgv":
            case "dcl_output_siv":
            case "dcl_input_ps_sgv":
            case "dcl_input_ps_siv": {
                if (name === "dcl_input_ps_siv")
                {
                    const interpolation = (token0 >>> 11) & 0xf;
                    declaration.interpolationMode = interpolation;
                    declaration.interpolationModeName = INTERPOLATION_MODE_NAMES[interpolation] || `interpolation_${interpolation}`;
                }
                declaration.registerIndex = takeOperand().registerIndex;
                const nameToken = takeToken();
                declaration.systemValue = nameToken & 0xffff;
                declaration.systemValueName = DxbcSystemValueNames[declaration.systemValue] || `name_${declaration.systemValue}`;
                break;
            }
            case "dcl_index_range":
                declaration.registerIndex = takeOperand().registerIndex;
                declaration.indexRange = takeToken();
                break;
            default:
                instruction.declaration = null;
                break;
        }

        if (cursor < end)
        {
            instruction.tailTokens = Array.from(this.tokens.subarray(cursor, end));
        }
    }

    /**
   * Decodes a run of operands that must consume the region exactly.
   *
   * @param {number} cursor Token index of the first operand.
   * @param {number} end Exclusive token index of the instruction end.
   * @param {object} instruction Instruction record used in error details.
   * @returns {object[]} Decoded operands.
   * @private
   */
    _decodeOperandRun(cursor, end, instruction)
    {
        const operands = [];
        while (cursor < end)
        {
            const operand = this._decodeOperand(cursor, end, instruction);
            operands.push(operand);
            cursor += operand.length;
        }
        if (cursor !== end)
        {
            throw new DxbcReadError("DXBC operands overran the instruction length", {
                source: this.source,
                offset: instruction.offset,
                opcodeName: instruction.opcodeName
            });
        }
        return operands;
    }

    /**
   * Decodes one operand, including extension tokens, register indices,
   * relative-index nested operands, and immediate values.
   *
   * @param {number} cursor Token index of the operand token.
   * @param {number} end Exclusive token index of the instruction end.
   * @param {object} instruction Instruction record used in error details.
   * @param {number} [depth] Relative-operand nesting depth.
   * @returns {object} Decoded operand with its consumed token `length`.
   * @private
   */
    _decodeOperand(cursor, end, instruction, depth = 0)
    {
        const fail = (message, details = {}) => new DxbcReadError(message, {
            source: this.source,
            offset: instruction.offset,
            opcodeName: instruction.opcodeName,
            operandCursor: cursor,
            ...details
        });

        if (cursor >= end)
        {
            throw fail("DXBC operand lies outside the instruction");
        }
        if (depth > 4)
        {
            throw fail("DXBC relative operand nesting is too deep");
        }

        const token = this.tokens[cursor];
        const type = (token >>> 12) & 0xff;
        const componentCountMode = token & 0x3;
        const selectionMode = (token >>> 2) & 0x3;
        const operand = {
            token,
            type,
            typeName: DxbcOperandTypeNames[type] || `operand_type_${type}`,
            componentCount: componentCountMode === 0 ? 0 : (componentCountMode === 1 ? 1 : 4),
            selectionModeName: "none",
            mask: "",
            swizzle: "",
            selected: "",
            modifierName: "none",
            minPrecisionName: "default",
            nonUniform: false,
            registerIndex: null,
            indices: [],
            immediateValues: [],
            length: 1
        };
        if (componentCountMode === 3)
        {
            throw fail("DXBC N-component operands are not supported", { token });
        }

        if (operand.componentCount === 4)
        {
            if (selectionMode === 0)
            {
                operand.selectionModeName = "mask";
                operand.mask = maskToComponents((token >>> 4) & 0xf);
            }
            else if (selectionMode === 1)
            {
                operand.selectionModeName = "swizzle";
                operand.swizzle = [ 0, 1, 2, 3 ]
                    .map((slot) => COMPONENTS[(token >>> (4 + slot * 2)) & 0x3])
                    .join("");
            }
            else if (selectionMode === 2)
            {
                operand.selectionModeName = "select1";
                operand.selected = COMPONENTS[(token >>> 4) & 0x3];
            }
        }

        let chainToken = token;
        while ((chainToken >>> 31) === 1)
        {
            if (cursor + operand.length >= end)
            {
                throw fail("DXBC extended-operand chain overruns the instruction");
            }
            chainToken = this.tokens[cursor + operand.length];
            operand.length += 1;
            if ((chainToken & 0x3f) === 1)
            {
                const modifier = (chainToken >>> 6) & 0xff;
                const minPrecision = (chainToken >>> 14) & 0x7;
                operand.modifierName = DxbcOperandModifierNames[modifier] || `modifier_${modifier}`;
                operand.minPrecisionName = MIN_PRECISION_NAMES[minPrecision] || `min_precision_${minPrecision}`;
                operand.nonUniform = ((chainToken >>> 17) & 1) !== 0;
            }
        }

        const indexDimension = (token >>> 20) & 0x3;
        for (let dimension = 0; dimension < indexDimension; dimension += 1)
        {
            const representation = (token >>> (22 + dimension * 3)) & 0x7;
            const index = { dimension, representation, values: [], relative: null };
            const immediateCount = representation === 1 || representation === 4 ? 2 : (representation === 2 ? 0 : 1);

            for (let word = 0; word < immediateCount; word += 1)
            {
                if (cursor + operand.length >= end)
                {
                    throw fail("DXBC operand index lies outside the instruction", { dimension, representation });
                }
                index.values.push(this.tokens[cursor + operand.length]);
                operand.length += 1;
            }
            if (representation >= 2 && representation <= 4)
            {
                const relative = this._decodeOperand(cursor + operand.length, end, instruction, depth + 1);
                index.relative = relative;
                operand.length += relative.length;
            }
            else if (representation > 4)
            {
                throw fail("Unknown DXBC operand index representation", { dimension, representation });
            }

            if (dimension === 0 && index.values.length > 0)
            {
                operand.registerIndex = index.values[0];
            }
            operand.indices.push(index);
        }

        if (type === 4 || type === 5)
        {
            const words = operand.componentCount * (type === 5 ? 2 : 1);
            if (cursor + operand.length + words > end)
            {
                throw fail("DXBC immediate values lie outside the instruction");
            }
            const floatView = new Float32Array(this.tokens.buffer, this.tokens.byteOffset, this.tokens.length);
            for (let word = 0; word < words; word += 1)
            {
                operand.immediateValues.push({
                    uint32: this.tokens[cursor + operand.length + word],
                    float32: type === 4 ? floatView[cursor + operand.length + word] : null
                });
            }
            operand.length += words;
        }

        return operand;
    }
}
