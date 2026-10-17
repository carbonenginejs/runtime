import { CjsSchema, blue, meta } from "#schema";
// Source: trinity/shadercompiler/Type.h
// Source: trinity/shadercompiler/Type.cpp

import { HLSLParserTokens } from "./hlslParserTokens.js";

const {
    OP_INT, OP_UINT, OP_BOOL, OP_HALF, OP_FLOAT, OP_DOUBLE, OP_VOID, OP_STRING,
    OP_BINDLESSHANDLETEXTURE2D, OP_BINDLESSHANDLETEXTURE3D, OP_BINDLESSHANDLETEXTURECUBE, OP_BINDLESSHANDLESAMPLER,
    OP_TEXTURE, OP_TEXTURE1D, OP_TEXTURE2D, OP_TEXTURE3D, OP_TEXTURECUBE, OP_TEXTURE1DARRAY, OP_TEXTURE2DARRAY,
    OP_TEXTURE3DARRAY, OP_TEXTURECUBEARRAY, OP_TEXTURE2DMS, OP_TEXTURE2DMSARRAY,
    OP_RWTEXTURE1D, OP_RWTEXTURE2D, OP_RWTEXTURE3D, OP_RWTEXTURE1DARRAY, OP_RWTEXTURE2DARRAY, OP_RWTEXTURE3DARRAY,
    OP_SAMPLER, OP_SAMPLER1D, OP_SAMPLER2D, OP_SAMPLER3D, OP_SAMPLERCUBE, OP_SAMPLERCOMPARISON,
    OP_BUFFER, OP_BYTEADDRESSBUFFER, OP_STRUCTUREDBUFFER, OP_APPENDSTRUCTUREDBUFFER, OP_CONSUMESTRUCTUREDBUFFER,
    OP_RWBUFFER, OP_RWSTRUCTUREDBUFFER, OP_RWBYTEADDRESSBUFFER, OP_INPUTPATCH, OP_OUTPUTPATCH,
    OP_POINTSTREAM, OP_LINESTREAM, OP_TRIANGLESTREAM, OP_RAYTRACING_ACCELERATION_STRUCTURE, OP_RAY_DESC
} = HLSLParserTokens;

/**
 * An HLSL type: Carbon's `Type`, a value type copied on assignment.
 *
 * `builtInType` is an `HLSLParserTokens` value, or 0 for a user type named by
 * `symbol`. `width` and `height` are vector and matrix dimensions (a
 * `float4x3` scans as width 4, height 3). `templateParameter` is shared, not
 * copied, as Carbon copies the pointer.
 *
 * Carbon declares no member initializers and no constructor, so a new one
 * here holds each member's neutral value; Carbon's owners that need the
 * `FromTokenType( 0 )` type call it themselves (ASTNode.cpp:14,
 * SymbolTable.cpp:89).
 *
 * Out-parameters (`Type& type`) are filled with {@link Type#Assign}; a
 * counter passed as `int& casts` is a `{ value: number }` object.
 */
export class Type
{
    /** @type {import("./SymbolTable/Symbol.js").Symbol|null} Carbon leaves it unset. */
    symbol = null;

    /** Carbon leaves it unset. */
    builtInType = 0;

    /** Carbon leaves it unset. */
    width = 0;

    /** Carbon leaves it unset. */
    height = 0;

    /** @type {Type|null} Carbon leaves it unset. */
    templateParameter = null;

    /** Carbon leaves it unset. */
    templateSamples = 0;

    /** Carbon leaves it unset. */
    arrayDimensions = 0;

    /** Carbon leaves it unset. */
    arraySizes = [0, 0, 0, 0, 0, 0, 0, 0];

    /** Carbon leaves it unset. */
    modifier = 0;

    /** Carbon leaves it unset. */
    storageClass = 0;

    /** Carbon leaves it unset. */
    metalTextureAccess = 0;

    /** Carbon leaves it unset. */
    isDepthTexture = false;

    /**
     * Returns a copy, as assigning a Carbon `Type` copies it.
     *
     * @returns {Type} An independent type sharing `symbol` and `templateParameter`.
     */
    Copy()
    {
        return new Type().Assign(this);
    }

    /**
     * Carbon's copy assignment, `*this = other`.
     *
     * @param {Type} other The type to copy from.
     * @returns {Type} This type.
     */
    Assign(other)
    {
        this.symbol = other.symbol;
        this.builtInType = other.builtInType;
        this.width = other.width;
        this.height = other.height;
        this.templateParameter = other.templateParameter;
        this.templateSamples = other.templateSamples;
        this.arrayDimensions = other.arrayDimensions;
        for (let i = 0; i < 8; ++i)
        {
            this.arraySizes[i] = other.arraySizes[i];
        }
        this.modifier = other.modifier;
        this.storageClass = other.storageClass;
        this.metalTextureAccess = other.metalTextureAccess;
        this.isDepthTexture = other.isDepthTexture;
        return this;
    }

    /**
     * Carbon's `operator==`.
     *
     * @param {Type} type The type to compare with.
     * @returns {boolean} Whether the types are equal.
     */
    Equals(type)
    {
        if (this.symbol || type.symbol)
        {
            return this.symbol === type.symbol;
        }
        return this.builtInType === type.builtInType &&
            this.width === type.width &&
            this.height === type.height &&
            ((this.templateParameter === null && type.templateParameter === null) ||
                (this.templateParameter !== null && type.templateParameter !== null && this.templateParameter.Equals(type.templateParameter) && this.templateSamples === type.templateSamples)) &&
            (!this.IsTexture() || this.isDepthTexture === type.isDepthTexture);
    }

    /**
     * Carbon's `Type::FromToken`.
     *
     * @param {import("./ParserState/ScannerToken.js").ScannerToken} token A type token.
     * @returns {boolean} Always true.
     */
    FromToken(token)
    {
        this.symbol = null;
        this.builtInType = token.type;
        this.width = Math.max(token.intValue & 0xf, 1);
        this.height = Math.max(token.intValue >> 8, 1);
        this.templateParameter = null;
        this.modifier = 0;
        this.storageClass = 0;
        this.arrayDimensions = 0;
        this.metalTextureAccess = 0;
        this.templateSamples = -1;
        this.isDepthTexture = false;
        return true;
    }

    /**
     * Carbon's `Type::FromTokenType`.
     *
     * @param {number} type An `HLSLParserTokens` value, or 0.
     * @returns {boolean} Always true.
     */
    FromTokenType(type)
    {
        this.symbol = null;
        this.builtInType = type;
        this.width = 1;
        this.height = 1;
        this.templateParameter = null;
        this.modifier = 0;
        this.storageClass = 0;
        this.arrayDimensions = 0;
        this.metalTextureAccess = 0;
        this.templateSamples = -1;
        this.isDepthTexture = false;
        return true;
    }

    /**
     * Carbon's `Type::FromSymbol`.
     *
     * @param {import("./SymbolTable/Symbol.js").Symbol} asymbol A type-name symbol.
     * @returns {boolean} False, leaving the type unchanged, when the symbol is not a type name.
     */
    FromSymbol(asymbol)
    {
        if (!asymbol.isTypeName)
        {
            return false;
        }
        this.symbol = asymbol;
        this.builtInType = 0;
        this.width = 1;
        this.height = 1;
        this.templateParameter = null;
        this.modifier = 0;
        this.storageClass = 0;
        this.arrayDimensions = 0;
        this.metalTextureAccess = 0;
        this.templateSamples = -1;
        this.isDepthTexture = false;
        return true;
    }

    /** @returns {boolean} Carbon's `Type::IsScalar`. */
    IsScalar()
    {
        return this.IsScalarOrVector() && this.width === 1 && this.height === 1;
    }

    /** @returns {boolean} Carbon's `Type::IsVector`. */
    IsVector()
    {
        return this.IsScalarOrVector() && this.width > 1 && this.height === 1;
    }

    /** @returns {boolean} Carbon's `Type::IsMatrix`. */
    IsMatrix()
    {
        return this.IsScalarOrVector() && this.width > 1 && this.height > 1;
    }

    /** @returns {boolean} Carbon's `Type::IsStruct`. */
    IsStruct()
    {
        return this.symbol !== null;
    }

    /** @returns {boolean} Carbon's `Type::IsBindlessHandle`. */
    IsBindlessHandle()
    {
        return this.IsScalar() && (this.builtInType === OP_BINDLESSHANDLETEXTURE2D || this.builtInType === OP_BINDLESSHANDLETEXTURE3D ||
            this.builtInType === OP_BINDLESSHANDLETEXTURECUBE || this.builtInType === OP_BINDLESSHANDLESAMPLER);
    }

    /** @returns {boolean} Carbon's `Type::IsScalarOrVector`; bindless handles count as scalars. */
    IsScalarOrVector()
    {
        const t = this.builtInType;
        return this.symbol === null &&
            (t === OP_INT || t === OP_UINT || t === OP_BOOL || t === OP_HALF || t === OP_FLOAT || t === OP_DOUBLE ||
                t === OP_BINDLESSHANDLETEXTURE2D || t === OP_BINDLESSHANDLETEXTURE3D || t === OP_BINDLESSHANDLETEXTURECUBE ||
                t === OP_BINDLESSHANDLESAMPLER);
    }

    /** @returns {boolean} Carbon's `Type::IsTexture`, read-write textures included. */
    IsTexture()
    {
        const t = this.builtInType;
        return this.symbol === null &&
            (t === OP_TEXTURE || t === OP_TEXTURE1D || t === OP_TEXTURE2D || t === OP_TEXTURE3D || t === OP_TEXTURECUBE ||
                t === OP_TEXTURE1DARRAY || t === OP_TEXTURE2DARRAY || t === OP_TEXTURE3DARRAY || t === OP_TEXTURECUBEARRAY ||
                t === OP_TEXTURE2DMS || t === OP_TEXTURE2DMSARRAY || t === OP_RWTEXTURE1D || t === OP_RWTEXTURE2D ||
                t === OP_RWTEXTURE3D || t === OP_RWTEXTURE1DARRAY || t === OP_RWTEXTURE2DARRAY || t === OP_RWTEXTURE3DARRAY);
    }

    /** @returns {boolean} Carbon's `Type::IsTextureArray`. */
    IsTextureArray()
    {
        const t = this.builtInType;
        return this.symbol === null &&
            (t === OP_TEXTURE1DARRAY || t === OP_TEXTURE2DARRAY || t === OP_TEXTURE3DARRAY || t === OP_TEXTURECUBEARRAY ||
                t === OP_TEXTURE2DMSARRAY || t === OP_RWTEXTURE1DARRAY || t === OP_RWTEXTURE2DARRAY || t === OP_RWTEXTURE3DARRAY);
    }

    /** @returns {boolean} Carbon's `Type::IsSampler`. */
    IsSampler()
    {
        const t = this.builtInType;
        return this.symbol === null &&
            (t === OP_SAMPLER || t === OP_SAMPLER1D || t === OP_SAMPLER2D || t === OP_SAMPLER3D || t === OP_SAMPLERCUBE ||
                t === OP_SAMPLERCOMPARISON);
    }

    /** @returns {boolean} Carbon's `Type::IsBuffer`. */
    IsBuffer()
    {
        const t = this.builtInType;
        return this.symbol === null &&
            (t === OP_BUFFER || t === OP_BYTEADDRESSBUFFER || t === OP_STRUCTUREDBUFFER || t === OP_APPENDSTRUCTUREDBUFFER ||
                t === OP_CONSUMESTRUCTUREDBUFFER || t === OP_RWBUFFER || t === OP_RWSTRUCTUREDBUFFER || t === OP_RWBYTEADDRESSBUFFER);
    }

    /**
     * Carbon's `Type::GetMethodType`: the result type of a resource method.
     *
     * The case fall-throughs are Carbon's: a 2D texture reaches the shared
     * texture methods after the gather methods, and an append buffer reaches
     * `Consume` (quirk, Type.cpp:351, Carbon known defect CE-65).
     *
     * @param {import("./ASTNode/ASTNode.js").ASTNode} methodCall The `NT_FUNCTION_CALL` node naming the method.
     * @param {Type} returnType Filled with the result type.
     * @returns {boolean} Whether the method exists on this type.
     */
    GetMethodType(methodCall, returnType)
    {
        if (this.symbol)
        {
            return false;
        }
        const method = methodCall.GetToken().stringValue.ToString();
        const is = (...names) => names.includes(method);
        switch (this.builtInType)
        {
            case OP_TEXTURE2D:
            case OP_TEXTURE2DARRAY:
                if (is("Gather", "GatherRed", "GatherGreen", "GatherBlue", "GatherAlpha"))
                {
                    if (this.templateParameter)
                    {
                        returnType.Assign(this.templateParameter);
                    }
                    else
                    {
                        returnType.FromTokenType(OP_FLOAT);
                    }
                    returnType.width = 4;
                    return true;
                }
                if (is("GatherCmp", "GatherCmpRed", "GatherCmpGreen", "GatherCmpBlue", "GatherCmpAlpha"))
                {
                    returnType.FromTokenType(OP_FLOAT);
                    returnType.width = 4;
                    return true;
                }
            // falls through
            case OP_TEXTURE1D:
            case OP_TEXTURE3D:
            case OP_TEXTURECUBE:
            case OP_TEXTURE1DARRAY:
            case OP_TEXTURE3DARRAY:
            case OP_TEXTURECUBEARRAY:
                if (is("CalculateLevelOfDetail"))
                {
                    returnType.FromTokenType(OP_FLOAT);
                    return true;
                }
                if (is("CalculateLevelOfDetailUnclamped"))
                {
                    returnType.FromTokenType(OP_FLOAT);
                    return true;
                }
                if (is("GetDimensions"))
                {
                    returnType.FromTokenType(OP_VOID);
                    return true;
                }
                if (is("GetSamplePosition"))
                {
                    returnType.FromTokenType(OP_FLOAT);
                    returnType.width = 2;
                    return true;
                }
                if (is("Load", "Sample", "SampleBias", "SampleGrad", "SampleLevel"))
                {
                    if (this.templateParameter)
                    {
                        returnType.Assign(this.templateParameter);
                    }
                    else
                    {
                        returnType.FromTokenType(OP_FLOAT);
                        returnType.width = this.isDepthTexture ? 1 : 4;
                    }
                    return true;
                }
                if (is("SampleCmp", "SampleCmpLevelZero"))
                {
                    returnType.FromTokenType(OP_FLOAT);
                    return true;
                }
                return false;
            case OP_TEXTURE2DMS:
            case OP_TEXTURE2DMSARRAY:
                if (is("GetDimensions"))
                {
                    returnType.FromTokenType(OP_VOID);
                    return true;
                }
                if (is("GetSamplePosition"))
                {
                    returnType.FromTokenType(OP_FLOAT);
                    returnType.width = 2;
                    return true;
                }
                if (is("Load"))
                {
                    returnType.Assign(this.templateParameter);
                    return true;
                }
                return false;
            case OP_BUFFER:
                if (is("GetDimensions"))
                {
                    returnType.FromTokenType(OP_VOID);
                    return true;
                }
                if (is("Load"))
                {
                    returnType.Assign(this.templateParameter);
                    return true;
                }
                return false;
            case OP_BYTEADDRESSBUFFER:
                if (is("GetDimensions"))
                {
                    returnType.FromTokenType(OP_VOID);
                    return true;
                }
                return byteAddressLoad(method, returnType);
            case OP_APPENDSTRUCTUREDBUFFER:
                if (is("GetDimensions"))
                {
                    returnType.FromTokenType(OP_VOID);
                    return true;
                }
                if (is("Append"))
                {
                    returnType.FromTokenType(OP_VOID);
                    return true;
                }
            // falls through
            case OP_CONSUMESTRUCTUREDBUFFER:
                if (is("GetDimensions"))
                {
                    returnType.FromTokenType(OP_VOID);
                    return true;
                }
                if (is("Consume"))
                {
                    returnType.Assign(this.templateParameter);
                    return true;
                }
                return false;
            case OP_RWBUFFER:
            case OP_RWTEXTURE1D:
            case OP_RWTEXTURE1DARRAY:
            case OP_RWTEXTURE2D:
            case OP_RWTEXTURE2DARRAY:
            case OP_RWTEXTURE3D:
            case OP_RWTEXTURE3DARRAY:
            case OP_STRUCTUREDBUFFER:
                if (is("GetDimensions"))
                {
                    returnType.FromTokenType(OP_VOID);
                    return true;
                }
                return false;
            case OP_RWSTRUCTUREDBUFFER:
                if (is("GetDimensions"))
                {
                    returnType.FromTokenType(OP_VOID);
                    return true;
                }
                if (is("DecrementCounter", "IncrementCounter"))
                {
                    returnType.FromTokenType(OP_UINT);
                    return true;
                }
                return false;
            case OP_RWBYTEADDRESSBUFFER:
                if (is("GetDimensions", "InterlockedAdd", "InterlockedAnd", "InterlockedCompareExchange", "InterlockedCompareStore",
                    "InterlockedExchange", "InterlockedMax", "InterlockedMin", "InterlockedOr", "InterlockedXor",
                    "Store", "Store2", "Store3", "Store4"))
                {
                    returnType.FromTokenType(OP_VOID);
                    return true;
                }
                return byteAddressLoad(method, returnType);
            case OP_POINTSTREAM:
            case OP_LINESTREAM:
            case OP_TRIANGLESTREAM:
                if (is("Append", "RestartStrip"))
                {
                    returnType.FromTokenType(OP_VOID);
                    return true;
                }
                return false;
        }
        return false;
    }

    /**
     * Carbon's `Type::ToString`.
     *
     * @returns {string} The type as HLSL spells it, with array sizes.
     */
    ToString()
    {
        if (this.symbol)
        {
            return this.symbol.name.ToString();
        }
        let result = "";
        switch (this.builtInType)
        {
            case OP_FLOAT: result = "float"; break;
            case OP_INT: result = "int"; break;
            case OP_UINT: result = "uint"; break;
            case OP_HALF: result = "half"; break;
            case OP_DOUBLE: result = "double"; break;
            case OP_BOOL: result = "bool"; break;
            case OP_STRING: result = "string"; break;
            case OP_VOID: return "void";
            case OP_SAMPLER2D:
            case OP_SAMPLER3D:
            case OP_SAMPLERCUBE:
            case OP_SAMPLER:
            case OP_SAMPLERCOMPARISON:
                return "sampler";
            case OP_TEXTURE1D: return "Texture1D";
            case OP_TEXTURE2D: return this.isDepthTexture ? "DepthTexture2D" : "Texture2D";
            case OP_TEXTURE3D: return "Texture3D";
            case OP_TEXTURECUBE: return "TextureCube";
            case OP_TEXTURE1DARRAY: return "Texture1DArray";
            case OP_TEXTURE2DARRAY: return this.isDepthTexture ? "DepthTexture2DArray" : "Texture2DArray";
            case OP_TEXTURE3DARRAY: return "Texture3DArray";
            case OP_TEXTURECUBEARRAY: return "TextureCubeArray";
            case OP_TEXTURE2DMS: return "Texture2DMS";
            case OP_TEXTURE2DMSARRAY: return "Texture2DMSArray";
            case OP_TEXTURE: return "Texture";
            case OP_BUFFER: return "Buffer";
            case OP_APPENDSTRUCTUREDBUFFER: return "AppendStructuredBuffer";
            case OP_BYTEADDRESSBUFFER: return "ByteAddressBuffer";
            case OP_CONSUMESTRUCTUREDBUFFER: return "ConsumeStructuredBuffer";
            case OP_INPUTPATCH: return "InputPatch";
            case OP_OUTPUTPATCH: return "OutputPatch";
            case OP_RWBUFFER: return "RWBuffer";
            case OP_RWBYTEADDRESSBUFFER: return "RWByteAddressBuffer";
            case OP_RWSTRUCTUREDBUFFER: return "RWStructuredBuffer";
            case OP_RWTEXTURE1D: return "RWTexture1D";
            case OP_RWTEXTURE1DARRAY: return "RWTexture1DArray";
            case OP_RWTEXTURE2D: return "RWTexture2D";
            case OP_RWTEXTURE2DARRAY: return "RWTexture2DArray";
            case OP_RWTEXTURE3D: return "RWTexture3D";
            case OP_RWTEXTURE3DARRAY: return "RWTexture3DArray";
            case OP_STRUCTUREDBUFFER: return "StructuredBuffer";
            case OP_POINTSTREAM: return "PointStream";
            case OP_LINESTREAM: return "LineStream";
            case OP_TRIANGLESTREAM: return "TriangleStream";
            case OP_RAYTRACING_ACCELERATION_STRUCTURE: return "RaytracingAccelerationStructure";
            case OP_RAY_DESC: return "RayDesc";
        }
        if (this.width > 1 || this.height > 1)
        {
            result += String(this.width);
            if (this.height > 1)
            {
                result += "x" + String(this.height);
            }
        }
        for (let i = 0; i < this.arrayDimensions; ++i)
        {
            result += "[" + String(this.arraySizes[i]) + "]";
        }
        return result;
    }

    /**
     * Carbon's `Type::CanImplicitCast`.
     *
     * @param {Type} to The target type.
     * @param {{ value: number }} casts Incremented once per conversion the cast needs.
     * @returns {boolean} Whether the cast is allowed.
     */
    CanImplicitCast(to, casts)
    {
        // For user-defined types and resource types we don't have implicit casts
        if (this.symbol || to.symbol)
        {
            return this.symbol === to.symbol;
        }
        if (!this.IsScalarOrVector() || !to.IsScalarOrVector())
        {
            return this.Equals(to);
        }
        // Our types are scalars or vectors - check dimensions
        if (this.width === 1 && this.height === 1)
        {
            if (to.width > 1 || to.height > 1 || to.builtInType !== this.builtInType)
            {
                casts.value++;
            }
            return true;
        }
        if (this.width >= to.width && this.height >= to.height)
        {
            if (this.width !== to.width || this.height !== to.height)
            {
                casts.value++;
            }
            if (this.builtInType !== to.builtInType)
            {
                casts.value++;
            }
            return true;
        }
        return false;
    }

    /**
     * Carbon's `Type::GetIndexedType`: the type of `value[index]`.
     *
     * @param {Type} type Filled with the element type.
     * @returns {boolean} Whether the type can be indexed.
     */
    GetIndexedType(type)
    {
        if (this.arrayDimensions > 0)
        {
            type.Assign(this);
            type.arrayDimensions--;
            return true;
        }
        if (this.symbol)
        {
            return false;
        }
        switch (this.builtInType)
        {
            case OP_TEXTURE1D:
            case OP_TEXTURE1DARRAY:
            case OP_TEXTURE2D:
            case OP_TEXTURE2DARRAY:
            case OP_TEXTURE3D:
            case OP_TEXTURE3DARRAY:
                if (this.templateParameter)
                {
                    type.Assign(this.templateParameter);
                }
                else
                {
                    type.FromTokenType(OP_FLOAT);
                    type.width = this.isDepthTexture ? 1 : 4;
                }
                return true;
            case OP_BUFFER:
            case OP_INPUTPATCH:
            case OP_OUTPUTPATCH:
            case OP_RWBUFFER:
            case OP_RWSTRUCTUREDBUFFER:
            case OP_RWTEXTURE1D:
            case OP_RWTEXTURE1DARRAY:
            case OP_RWTEXTURE2D:
            case OP_RWTEXTURE2DARRAY:
            case OP_RWTEXTURE3D:
            case OP_RWTEXTURE3DARRAY:
            case OP_STRUCTUREDBUFFER:
                type.Assign(this.templateParameter);
                return true;
        }
        if (this.width === 1 && this.height === 1)
        {
            return false;
        }
        type.Assign(this);
        if (this.height > 1)
        {
            type.height = 1;
        }
        else
        {
            type.width = 1;
        }
        return true;
    }

    /**
     * Carbon's free `TypeFromSymbol`.
     *
     * @param {import("./SymbolTable/Symbol.js").Symbol} symbol A type-name symbol.
     * @returns {Type} The type.
     */
    static typeFromSymbol(symbol)
    {
        const t = new Type();
        t.FromSymbol(symbol);
        return t;
    }

    /**
     * Carbon's free `TypeFromTokenType`.
     *
     * @param {number} type An `HLSLParserTokens` value.
     * @param {number} [width=1] Vector width.
     * @param {number} [height=1] Matrix height.
     * @returns {Type} The type.
     */
    static typeFromTokenType(type, width = 1, height = 1)
    {
        const t = new Type();
        t.FromTokenType(type);
        t.width = width;
        t.height = height;
        return t;
    }

    /**
     * Carbon's free `GetCommonType`: the type both operands promote to.
     *
     * @param {Type} type0 Left operand type.
     * @param {Type} type1 Right operand type.
     * @param {Type} type Filled with the common type.
     * @returns {boolean} Whether a common type exists.
     */
    static getCommonType(type0, type1, type)
    {
        const casts = { value: 0 };
        if (!type1.CanImplicitCast(type0, casts) && !type0.CanImplicitCast(type1, casts))
        {
            return false;
        }
        if (type0.symbol)
        {
            type.Assign(type0);
            return true;
        }
        if (type1.symbol)
        {
            type.Assign(type1);
            return true;
        }
        const prec0 = Type.getNumericTypePrecedence(type0.builtInType);
        const prec1 = Type.getNumericTypePrecedence(type1.builtInType);
        if (prec0 === -1)
        {
            type.Assign(type0);
            return true;
        }
        if (prec1 === -1)
        {
            type.Assign(type1);
            return true;
        }
        type.Assign(prec0 > prec1 ? type0 : type1);
        if (type0.width === 1 || type1.width === 1)
        {
            type.width = Math.max(type0.width, type1.width);
        }
        else
        {
            type.width = Math.min(type0.width, type1.width);
        }
        if (type0.height === 1 || type1.height === 1)
        {
            type.height = Math.max(type0.height, type1.height);
        }
        else
        {
            type.height = Math.min(type0.height, type1.height);
        }
        return true;
    }

    /**
     * Carbon's free `GetNumericTypePrecedence`: bool, int, uint, half, float, double.
     *
     * @param {number} type An `HLSLParserTokens` value.
     * @returns {number} The rank, or -1 for a non-numeric type.
     */
    static getNumericTypePrecedence(type)
    {
        return [OP_BOOL, OP_INT, OP_UINT, OP_HALF, OP_FLOAT, OP_DOUBLE].indexOf(type);
    }

    /**
     * Carbon's `namespace hlsl` constants. Treat them as read-only; copy before
     * changing one.
     */
    static hlsl = {
        void_t: Type.typeFromTokenType(OP_VOID),

        bool_t: Type.typeFromTokenType(OP_BOOL),
        int_t: Type.typeFromTokenType(OP_INT),
        uint_t: Type.typeFromTokenType(OP_UINT),
        float_t: Type.typeFromTokenType(OP_FLOAT),

        bool2_t: Type.typeFromTokenType(OP_BOOL, 2),
        int2_t: Type.typeFromTokenType(OP_INT, 2),
        uint2_t: Type.typeFromTokenType(OP_UINT, 2),
        float2_t: Type.typeFromTokenType(OP_FLOAT, 2),

        bool3_t: Type.typeFromTokenType(OP_BOOL, 3),
        int3_t: Type.typeFromTokenType(OP_INT, 3),
        uint3_t: Type.typeFromTokenType(OP_UINT, 3),
        float3_t: Type.typeFromTokenType(OP_FLOAT, 3),

        bool4_t: Type.typeFromTokenType(OP_BOOL, 4),
        int4_t: Type.typeFromTokenType(OP_INT, 4),
        uint4_t: Type.typeFromTokenType(OP_UINT, 4),
        float4_t: Type.typeFromTokenType(OP_FLOAT, 4)
    };
}

/**
 * The `Load`, `Load2`, `Load3` and `Load4` cases Carbon repeats for both
 * byte-address buffers.
 *
 * @param {string} method Method name.
 * @param {Type} returnType Filled with the result type.
 * @returns {boolean} Whether the method is a load.
 */
function byteAddressLoad(method, returnType)
{
    const widths = { Load: 1, Load2: 2, Load3: 3, Load4: 4 };
    if (!Object.hasOwn(widths, method))
    {
        return false;
    }
    returnType.FromTokenType(OP_UINT);
    if (widths[method] > 1)
    {
        returnType.width = widths[method];
    }
    return true;
}

CjsSchema.blue.define(Type, {
    className: "Type",
    methods: {
        Equals: [meta.renamed("operator==")],
        FromToken: [blue.method],
        FromTokenType: [blue.method],
        FromSymbol: [blue.method],
        IsScalar: [blue.method],
        IsVector: [blue.method],
        IsMatrix: [blue.method],
        IsStruct: [blue.method],
        IsBindlessHandle: [blue.method],
        IsScalarOrVector: [blue.method],
        IsTexture: [blue.method],
        IsTextureArray: [blue.method],
        IsSampler: [blue.method],
        IsBuffer: [blue.method],
        GetMethodType: [blue.method],
        ToString: [blue.method],
        CanImplicitCast: [blue.method],
        GetIndexedType: [blue.method]
    }
});
