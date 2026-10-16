import { CjsSchema } from "#schema/CjsSchema";

// Not in Carbon: HLSL types and names as WGSL spells them, for the WebGPU
// target. Modelled on OutputHLSL.cpp's PrintTypeMSL (O:686-695), which already
// turns HLSL `floatRxC` into the column-major `floatCxR`; WGSL's `matCxR<f32>`
// is the same matrix.

import { HLSLParserTokens } from "../hlslParserTokens.js";

const T = HLSLParserTokens;

/**
 * WGSL's keywords and reserved words (WGSL spec 15.2-15.3), which an
 * identifier may not be.
 */
const RESERVED = new Set(`alias break case const const_assert continue continuing default diagnostic discard else enable
false fn for if let loop override requires return struct switch true var while
NULL Self abstract active alignas alignof as asm asm_fragment async attribute auto await become binding_array cast
catch class co_await co_return co_yield coherent column_major common compile compile_fragment concept const_cast
consteval constexpr constinit crate debugger decltype delete demote demote_to_helper do dynamic_cast enum explicit
export extends extern external fallthrough filter final finally friend from fxgroup get goto groupshared highp impl
implements import inline instanceof interface layout lowp macro macro_rules match mediump meta mod module move mut
mutable namespace new nil noexcept noinline nointerpolation noperspective null nullptr of operator package packoffset
partition pass patch pixelfragment precise precision premerge priv protected pub public readonly ref regardless
register reinterpret_cast require resource restrict self set shared sizeof smooth snorm static static_assert
static_cast std subroutine super target template this thread_local throw trait try type typedef typeid typename
typeof union unless unorm unsafe unsized use using varying virtual volatile wgsl where with writeonly yield
array atomic bool f16 f32 i32 mat2x2 mat2x3 mat2x4 mat3x2 mat3x3 mat3x4 mat4x2 mat4x3 mat4x4 ptr sampler
sampler_comparison texture_1d texture_2d texture_2d_array texture_3d texture_cube texture_cube_array u32 vec2 vec3 vec4
main`.split(/\s+/u));

/**
 * HLSL types and identifiers as WGSL text. Not instantiated; every member is
 * static.
 */
export class CjsFxWgslTypes
{
    /**
     * The WGSL scalar of an HLSL scalar token.
     *
     * Divergence: WGSL has no 64-bit float in core and `f16` needs an extension,
     * so `half` and `double` are `f32`.
     *
     * @param {number} builtInType A scalar type token.
     * @returns {string|null} `f32`, `i32`, `u32` or `bool`, or null for a non-scalar token.
     */
    static wgslScalar(builtInType)
    {
        switch (builtInType)
        {
            case T.OP_FLOAT:
            case T.OP_HALF:
            case T.OP_DOUBLE:
                return "f32";
            case T.OP_INT:
                return "i32";
            case T.OP_UINT:
                return "u32";
            case T.OP_BOOL:
                return "bool";
            default:
                return null;
        }
    }

    /**
     * The WGSL texture type of an HLSL texture type, or null when the target
     * cannot express it.
     *
     * @param {import("../Type.js").Type} type A texture type.
     * @returns {string|null} The type text.
     */
    static _wgslTexture(type)
    {
        // Carbon normalises DepthTexture2D[Array] to the ordinary texture
        // token and preserves its depth identity in this flag (HLSLParser.y).
        if (type.isDepthTexture)
        {
            if (type.templateParameter && (type.templateParameter.builtInType !== T.OP_FLOAT || type.templateParameter.width !== 1))
            {
                throw new Error("CjsFxWgslTypes: depth textures require a scalar float element");
            }
            if (type.builtInType === T.OP_TEXTURE2D) return "texture_depth_2d";
            if (type.builtInType === T.OP_TEXTURE2DARRAY) return "texture_depth_2d_array";
            return null;
        }
        const sampled = type.templateParameter ? CjsFxWgslTypes.wgslScalar(type.templateParameter.builtInType) : "f32";
        const component = sampled === "bool" || sampled === null ? "f32" : sampled;
        switch (type.builtInType)
        {
            case T.OP_TEXTURE:
            case T.OP_TEXTURE2D:
                return `texture_2d<${component}>`;
            case T.OP_TEXTURE1D:
                return `texture_1d<${component}>`;
            case T.OP_TEXTURE2DARRAY:
                return `texture_2d_array<${component}>`;
            case T.OP_TEXTURE3D:
                return `texture_3d<${component}>`;
            case T.OP_TEXTURECUBE:
                return `texture_cube<${component}>`;
            case T.OP_TEXTURECUBEARRAY:
                return `texture_cube_array<${component}>`;
            case T.OP_TEXTURE2DMS:
                return `texture_multisampled_2d<${component}>`;
            case T.OP_DEPTHTEXTURE2D:
                return "texture_depth_2d";
            case T.OP_DEPTHTEXTURE2DARRAY:
                return "texture_depth_2d_array";
            default:
                return null;
        }
    }

    /**
     * The WGSL type text of an HLSL type, without array dimensions.
     *
     * @param {import("../Type.js").Type} type The type.
     * @param {(symbol: object) => string} nameOf The WGSL name of a struct symbol.
     * @returns {string} The type text.
     */
    static wgslElementType(type, nameOf)
    {
        if (type.IsStruct())
        {
            return nameOf(type.symbol);
        }
        const scalar = CjsFxWgslTypes.wgslScalar(type.builtInType);
        if (scalar !== null)
        {
            if (type.IsMatrix())
            {
                // Rows are `width`, columns `height`: HLSL floatRxC is WGSL matCxR.
                return `mat${type.height}x${type.width}<${scalar}>`;
            }
            if (type.width > 1)
            {
                return `vec${type.width}<${scalar}>`;
            }
            return scalar;
        }
        if (type.builtInType === T.OP_VOID)
        {
            return "void";
        }
        if (type.IsSampler())
        {
            return type.builtInType === T.OP_SAMPLERCOMPARISON ? "sampler_comparison" : "sampler";
        }
        if (type.IsTexture())
        {
            const texture = CjsFxWgslTypes._wgslTexture(type);
            if (texture !== null)
            {
                return texture;
            }
        }
        if (type.builtInType === T.OP_STRUCTUREDBUFFER || type.builtInType === T.OP_RWSTRUCTUREDBUFFER || type.builtInType === T.OP_BUFFER || type.builtInType === T.OP_RWBUFFER)
        {
            return `array<${CjsFxWgslTypes.wgslElementType(type.templateParameter, nameOf)}>`;
        }
        throw new Error(`CjsFxWgslTypes: ${type.ToString()} has no WGSL type`);
    }

    /**
     * The WGSL type text of an HLSL type, array dimensions included
     * (`float a[2][3]` is `array<array<f32, 3>, 2>`).
     *
     * @param {import("../Type.js").Type} type The type.
     * @param {(symbol: object) => string} nameOf The WGSL name of a struct symbol.
     * @returns {string} The type text.
     */
    static wgslType(type, nameOf)
    {
        let text = CjsFxWgslTypes.wgslElementType(type, nameOf);
        for (let i = type.arrayDimensions - 1; i >= 0; --i)
        {
            text = `array<${text}, ${type.arraySizes[i]}>`;
        }
        return text;
    }

    /**
     * A WGSL identifier for an HLSL one. WGSL forbids identifiers starting with
     * `__` (which Carbon's generated names use: `__StageInData_0004`), a single
     * `_`, and its reserved words; those get the prefix `cjs`. `main` is reserved
     * here because every entry point is named `main` (runtime contract).
     *
     * @param {string} name The HLSL name.
     * @returns {string} The WGSL name.
     */
    static wgslName(name)
    {
        if (name.startsWith("__") || name === "_" || RESERVED.has(name))
        {
            return `cjs${name.startsWith("_") ? "" : "_"}${name}`;
        }
        return name;
    }
}

CjsSchema.meta.define(CjsFxWgslTypes, { className: "CjsFxWgslTypes" });
