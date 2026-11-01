// Source: trinity/shadercompiler/OutputHLSL.h
// Source: trinity/shadercompiler/OutputHLSL.cpp
//
// Carbon's code writer: prints a syntax tree as HLSL (handed to D3DCompile)
// or as Metal (handed to xcrun), after the platform compiler has rewritten
// the tree. Carbon dispatches on `operator<<` argument types; the port has
// one function per overload:
//
//   operator<<( CodeStream&, const Type& )  -> WriteType
//   operator<<( CodeStream&, const HLSL& )  -> WriteHLSL
//   operator<<( CodeStream&, const MSL& )   -> WriteMSL
//
// Every node print starts with `os << node->GetLocation()`, which is how the
// output keeps the source's lines (see CompilerInputStream).

import { HLSLParserTokens } from "../hlslParserTokens.js";
import { Type } from "../Type.js";
import { D3D11_TEXTURE_ADDRESS_MODE, D3D11_COMPARISON_FUNC } from "../stdafx.js";
import { MetalRegister } from "../EffectCompilerMetal/MetalRegister.js";
import { MetalSystemSemanticsType } from "../EffectCompilerMetal/MetalSystemSemanticsType.js";
import { ASTNode } from "../ASTNode/ASTNode.js";
import { Symbol } from "../SymbolTable/Symbol.js";
import { CodeStream } from "./CodeStream.js";

const T = HLSLParserTokens;
const N = ASTNode.ASTNodeType;
const FLT_MAX = 3.4028234663852886e38;

const s_operators = new Map([
    [T.OP_MUL_ASSIGN, "*="],
    [T.OP_DIV_ASSIGN, "/="],
    [T.OP_MOD_ASSIGN, "%="],
    [T.OP_ADD_ASSIGN, "+="],
    [T.OP_SUB_ASSIGN, "-="],
    [T.OP_LEFT_ASSIGN, "<<="],
    [T.OP_RIGHT_ASSIGN, ">>="],
    [T.OP_AND_ASSIGN, "&="],
    [T.OP_XOR_ASSIGN, "^="],
    [T.OP_OR_ASSIGN, "|="],
    [T.OP_INC_OP, "++"],
    [T.OP_DEC_OP, "--"],
    [T.OP_LEFT_OP, "<<"],
    [T.OP_RIGHT_OP, ">>"],
    [T.OP_LE_OP, "<="],
    [T.OP_GE_OP, ">="],
    [T.OP_EQ_OP, "=="],
    [T.OP_NE_OP, "!="],
    [T.OP_AND_OP, "&&"],
    [T.OP_OR_OP, "||"],
    [T.OP_PLUS, "+"],
    [T.OP_DASH, "-"],
    [T.OP_BANG, "!"],
    [T.OP_TILDE, "~"],
    [T.OP_STAR, "*"],
    [T.OP_SLASH, "/"],
    [T.OP_PERCENT, "%"],
    [T.OP_COMA, ","],
    [T.OP_LESS, "<"],
    [T.OP_MORE, ">"],
    [T.OP_AMPERSAND, "&"],
    [T.OP_CARET, "^"],
    [T.OP_VERTICAL_BAR, "|"],
    [T.OP_EQUAL, "="]
]);

/**
 * Carbon's file-local `GetOperatorSymbol`.
 *
 * @param {number} operatorID An operator token.
 * @returns {string} Its text, or "".
 */
function GetOperatorSymbol(operatorID)
{
    return s_operators.get(operatorID) ?? "";
}

/**
 * Carbon's file-local `HasUsedDeclarations`, the writer's copy: unlike
 * ParserUtils' it does not look inside struct members.
 *
 * @param {import("../ASTNode/ASTNode.js").ASTNode} node A buffer or declaration list.
 * @returns {boolean} Whether any declared name in it is used.
 */
function HasUsedDeclarations(node)
{
    for (let i = 0; i < node.GetChildrenCount(); ++i)
    {
        const child = node.GetChild(i);
        if (child)
        {
            if (child.GetNodeType() === N.NT_VAR_DECLARATION_LIST)
            {
                if (HasUsedDeclarations(child))
                {
                    return true;
                }
            }
            else if (child.GetNodeType() === N.NT_NAME_DECLARATION)
            {
                if (child.GetSymbol() && child.GetSymbol().used)
                {
                    return true;
                }
            }
        }
    }
    return false;
}

/**
 * Carbon's `Children<XSL>`: prints children from `offset`, with `glue`
 * before every child whose index is not 0.
 *
 * @param {import("./CodeStream.js").CodeStream} os The stream.
 * @param {(os: import("./CodeStream.js").CodeStream, node: *, symbolTable: *) => void} write The language's writer.
 * @param {import("../ASTNode/ASTNode.js").ASTNode} node The parent.
 * @param {import("../SymbolTable/SymbolTable.js").SymbolTable} symbolTable The symbol table.
 * @param {string} glue The separator.
 * @param {number} [offset=0] First child to print.
 */
function writeChildren(os, write, node, symbolTable, glue, offset = 0)
{
    for (let i = offset; i < node.GetChildrenCount(); ++i)
    {
        if (i)
        {
            os.Write(glue);
        }
        write(os, node.GetChild(i), symbolTable);
    }
}

/**
 * The storage-class and modifier prefix both type printers share for HLSL.
 *
 * @param {import("./CodeStream.js").CodeStream} os The stream.
 * @param {Type} type The type.
 */
function writeHLSLQualifiers(os, type)
{
    switch (type.storageClass)
    {
        case T.OP_EXTERN: os.Write("extern "); break;
        case T.OP_NOINTERPOLATION: os.Write("nointerpolation "); break;
        case T.OP_PRECISE: os.Write("precise "); break;
        case T.OP_SHARED: os.Write("shared "); break;
        case T.OP_GROUPSHARED: os.Write("groupshared "); break;
        case T.OP_STATIC: os.Write("static "); break;
        case T.OP_UNIFORM: os.Write("uniform "); break;
        case T.OP_VOLATILE: os.Write("volatile "); break;
    }
    switch (type.modifier)
    {
        case T.OP_CONST: os.Write("const "); break;
        case T.OP_ROW_MAJOR: os.Write("row_major "); break;
        case T.OP_COLUMN_MAJOR: os.Write("column_major "); break;
    }
}

/**
 * Carbon's file-local `PrintTypeHLSL11`.
 *
 * @param {import("./CodeStream.js").CodeStream} os The stream.
 * @param {Type} type The type.
 */
function PrintTypeHLSL11(os, type)
{
    writeHLSLQualifiers(os, type);
    if (type.symbol)
    {
        os.Write(type.symbol.name);
        return;
    }
    const templated = name =>
    {
        os.Write(name);
        if (type.templateParameter)
        {
            os.Write("<");
            WriteType(os, type.templateParameter);
            os.Write(">");
        }
    };
    const withParameter = name =>
    {
        os.Write(name).Write("<");
        PrintTypeHLSL11(os, type.templateParameter);
        os.Write(">");
    };
    switch (type.builtInType)
    {
        case T.OP_FLOAT: os.Write("float"); break;
        case T.OP_INT: os.Write("int"); break;
        case T.OP_UINT: os.Write("uint"); break;
        case T.OP_HALF: os.Write("min16float"); break;
        case T.OP_DOUBLE: os.Write("double"); break;
        case T.OP_BOOL: os.Write("bool"); break;
        case T.OP_STRING: os.Write("string"); break;
        case T.OP_VOID: os.Write("void"); return;
        case T.OP_SAMPLER2D:
        case T.OP_SAMPLER3D:
        case T.OP_SAMPLERCUBE:
        case T.OP_SAMPLER:
            os.Write("sampler");
            return;
        case T.OP_SAMPLERCOMPARISON: os.Write("SamplerComparisonState"); return;
        case T.OP_TEXTURE1D: templated("Texture1D"); return;
        case T.OP_TEXTURE2D: templated("Texture2D"); return;
        case T.OP_TEXTURE3D: templated("Texture3D"); return;
        case T.OP_TEXTURECUBE: templated("TextureCube"); return;
        case T.OP_TEXTURE1DARRAY: templated("Texture1DArray"); return;
        case T.OP_TEXTURE2DARRAY: templated("Texture2DArray"); return;
        case T.OP_TEXTURE3DARRAY: templated("Texture3DArray"); return;
        case T.OP_TEXTURECUBEARRAY: templated("TextureCubeArray"); return;
        case T.OP_TEXTURE2DMS:
        case T.OP_TEXTURE2DMSARRAY:
            os.Write(type.builtInType === T.OP_TEXTURE2DMS ? "Texture2DMS" : "Texture2DMSArray").Write("<");
            WriteType(os, type.templateParameter);
            if (type.templateSamples > 0)
            {
                os.Write(", ").Write(type.templateSamples);
            }
            os.Write(">");
            return;
        case T.OP_TEXTURE: os.Write("Texture2D"); return;
        case T.OP_BUFFER:
            os.Write("Buffer<");
            WriteType(os, type.templateParameter);
            os.Write(">");
            return;
        case T.OP_APPENDSTRUCTUREDBUFFER:
            os.Write("AppendStructuredBuffer<");
            WriteType(os, type.templateParameter);
            os.Write(">");
            return;
        case T.OP_BYTEADDRESSBUFFER: os.Write("ByteAddressBuffer"); return;
        case T.OP_CONSUMESTRUCTUREDBUFFER:
            os.Write("ConsumeStructuredBuffer<");
            WriteType(os, type.templateParameter);
            os.Write(">");
            return;
        case T.OP_INPUTPATCH:
        case T.OP_OUTPUTPATCH:
            os.Write(type.builtInType === T.OP_INPUTPATCH ? "InputPatch" : "OutputPatch").Write("<");
            PrintTypeHLSL11(os, type.templateParameter);
            os.Write(", ").Write(type.templateSamples).Write(">");
            return;
        case T.OP_RWBUFFER: withParameter("RWBuffer"); return;
        case T.OP_RWBYTEADDRESSBUFFER: os.Write("RWByteAddressBuffer"); return;
        case T.OP_RWSTRUCTUREDBUFFER: withParameter("RWStructuredBuffer"); return;
        case T.OP_RWTEXTURE1D: withParameter("RWTexture1D"); return;
        case T.OP_RWTEXTURE1DARRAY: withParameter("RWTexture1DArray"); return;
        case T.OP_RWTEXTURE2D: withParameter("RWTexture2D"); return;
        case T.OP_RWTEXTURE2DARRAY: withParameter("RWTexture2DArray"); return;
        case T.OP_RWTEXTURE3D: withParameter("RWTexture3D"); return;
        case T.OP_RWTEXTURE3DARRAY: withParameter("RWTexture3DArray"); return;
        case T.OP_STRUCTUREDBUFFER: withParameter("StructuredBuffer"); return;
        case T.OP_POINTSTREAM: withParameter("PointStream"); return;
        case T.OP_LINESTREAM: withParameter("LineStream"); return;
        case T.OP_TRIANGLESTREAM: withParameter("TriangleStream"); return;
        case T.OP_BINDLESSHANDLETEXTURE2D:
        case T.OP_BINDLESSHANDLETEXTURE3D:
        case T.OP_BINDLESSHANDLETEXTURECUBE:
        case T.OP_BINDLESSHANDLESAMPLER:
            os.Write("uint");
            return;
        case T.OP_RAYTRACING_ACCELERATION_STRUCTURE: os.Write("RaytracingAccelerationStructure"); return;
        case T.OP_RAY_DESC: os.Write("RayDesc"); return;
        default:
            os.Write("!!error_type!!");
            return;
    }
    if (type.width > 1 || type.height > 1)
    {
        os.Write(type.width);
        if (type.height > 1)
        {
            os.Write("x").Write(type.height);
        }
    }
}

/**
 * Carbon's file-local `ScalarType`.
 *
 * @param {Type} type A scalar, vector or matrix type.
 * @returns {Type} Its component type.
 */
function ScalarType(type)
{
    const scalarType = type.Copy();
    scalarType.width = scalarType.height = 1;
    return scalarType;
}

/**
 * Carbon's file-local `MslTextureTemplateType`: Metal names one component.
 *
 * @param {Type} textureType A texture type.
 * @returns {Type} The component type.
 */
function MslTextureTemplateType(textureType)
{
    if (textureType.templateParameter)
    {
        // Metal expects type of only one texture component here.
        return ScalarType(textureType.templateParameter);
    }
    return Type.typeFromTokenType(T.OP_FLOAT);
}

/**
 * Carbon's file-local `PrintTypeMSL`. Types Metal lacks print
 * `!!unsupported type: ...!!`, as Carbon's do.
 *
 * @param {import("./CodeStream.js").CodeStream} os The stream.
 * @param {Type} type The type.
 */
function PrintTypeMSL(os, type)
{
    switch (type.storageClass)
    {
        case T.OP_EXTERN: os.Write("extern "); break;
        // Already processed and mapped to AddressSpace::Threadgroup.
        case T.OP_GROUPSHARED: break;
        case T.OP_STATIC: os.Write("static "); break;
        case T.OP_VOLATILE: os.Write("volatile "); break;
    }
    if (type.modifier === T.OP_CONST)
    {
        os.Write("const ");
    }
    else if (type.modifier === T.OP_PACKOFFSET)
    {
        os.Write("packed_");
    }
    if (type.symbol)
    {
        os.Write(type.symbol.name);
        return;
    }
    const constIfArray = () =>
    {
        if (type.arrayDimensions > 0)
        {
            os.Write("const ");
        }
    };
    const texture = name =>
    {
        constIfArray();
        os.Write(name).Write("<");
        WriteType(os, MslTextureTemplateType(type));
        os.Write(">");
    };
    const writable = name =>
    {
        os.Write(name).Write("<");
        WriteType(os, MslTextureTemplateType(type));
        os.Write(", access::").Write(type.metalTextureAccess ? "read_" : "").Write("write>");
    };
    switch (type.builtInType)
    {
        case T.OP_BOOL: os.Write("bool"); break;
        case T.OP_INT: os.Write("int"); break;
        case T.OP_UINT: os.Write("uint"); break;
        case T.OP_HALF: os.Write("half"); break;
        case T.OP_FLOAT: os.Write("float"); break;
        case T.OP_VOID: os.Write("void"); return;
        case T.OP_STRING: os.Write("string"); break;
        case T.OP_SAMPLER2D:
        case T.OP_SAMPLER3D:
        case T.OP_SAMPLERCUBE:
        case T.OP_SAMPLER:
        case T.OP_SAMPLERCOMPARISON:
            os.Write("sampler");
            return;
        case T.OP_TEXTURE1D: texture("texture1d"); return;
        case T.OP_TEXTURE1DARRAY: texture("texture1d_array"); return;
        case T.OP_TEXTURE:
        case T.OP_TEXTURE2D: texture(type.isDepthTexture ? "depth2d" : "texture2d"); return;
        case T.OP_TEXTURE2DARRAY: texture(type.isDepthTexture ? "depth2d_array" : "texture2d_array"); return;
        case T.OP_TEXTURE3D: texture("texture3d"); return;
        case T.OP_TEXTURECUBE: texture("texturecube"); return;
        case T.OP_TEXTURECUBEARRAY: texture("texturecube_array"); return;
        case T.OP_TEXTURE2DMS: texture("texture2d_ms"); return;
        // Supported since Metal 2.0 (macOS) and Metal 1.0 (iOS).
        case T.OP_TEXTURE2DMSARRAY: texture("texture2d_ms_array"); return;
        case T.OP_BUFFER:
        case T.OP_STRUCTUREDBUFFER:
            os.Write("const ");
            WriteType(os, type.templateParameter);
            os.Write("*");
            return;
        case T.OP_RWBUFFER:
        case T.OP_RWSTRUCTUREDBUFFER:
            WriteType(os, type.templateParameter);
            os.Write("*");
            return;
        case T.OP_RWTEXTURE1D: writable("texture1d"); return;
        case T.OP_RWTEXTURE1DARRAY: writable("texture1d_array"); return;
        case T.OP_RWTEXTURE2D: writable("texture2d"); return;
        case T.OP_RWTEXTURE2DARRAY: writable("texture2d_array"); return;
        case T.OP_RWTEXTURE3D: writable("texture3d"); return;
        case T.OP_BINDLESSHANDLETEXTURE2D:
        case T.OP_BINDLESSHANDLETEXTURE3D:
        case T.OP_BINDLESSHANDLETEXTURECUBE:
        case T.OP_BINDLESSHANDLESAMPLER:
            os.Write("uint");
            return;
        case T.OP_RAYTRACING_ACCELERATION_STRUCTURE: os.Write("RaytracingAccelerationStructure"); return;
        case T.OP_RAY_DESC: os.Write("RayDesc"); return;
        default:
            os.Write("!!unsupported type: ").Write(type.ToString()).Write("!!");
            return;
    }
    if (type.width > 1 || type.height > 1)
    {
        if (type.height > 1)
        {
            os.Write(type.height).Write("x").Write(type.width);
        }
        else
        {
            os.Write(type.width);
        }
    }
}

/**
 * Carbon's `operator<<( CodeStream&, const Type& )`: the type in the stream's
 * language.
 *
 * @param {import("./CodeStream.js").CodeStream} os The stream.
 * @param {Type} type The type.
 * @returns {import("./CodeStream.js").CodeStream} The stream.
 */
export function WriteType(os, type)
{
    if (os.shadingLanguage === CodeStream.ShadingLanguage.HLSL)
    {
        PrintTypeHLSL11(os, type);
    }
    else if (os.shadingLanguage === CodeStream.ShadingLanguage.MSL)
    {
        PrintTypeMSL(os, type);
    }
    else
    {
        throw new Error("WriteType: unknown shading language");
    }
    return os;
}

/**
 * The interpolation keyword of a symbol, as Carbon's HLSL printer writes it.
 *
 * @param {import("./CodeStream.js").CodeStream} os The stream.
 * @param {number} modifier An interpolation token.
 */
function writeInterpolation(os, modifier)
{
    switch (modifier)
    {
        case T.OP_LINEAR: os.Write("linear "); break;
        case T.OP_CENTROID: os.Write("centroid "); break;
        case T.OP_NOINTERPOLATION: os.Write("nointerpolation "); break;
        case T.OP_NOPERSPECTIVE: os.Write("noperspective "); break;
    }
}

/**
 * Carbon's `operator<<( CodeStream&, const HLSL& )`: prints a node as HLSL.
 * Unused functions, declarations, structs and buffers print nothing; that is
 * the tree shaking `MarkUsedSymbols` prepares.
 *
 * @param {import("./CodeStream.js").CodeStream} os The stream.
 * @param {import("../ASTNode/ASTNode.js").ASTNode} node The node.
 * @param {import("../SymbolTable/SymbolTable.js").SymbolTable} symbolTable The symbol table.
 * @returns {import("./CodeStream.js").CodeStream} The stream.
 */
export function WriteHLSL(os, node, symbolTable)
{
    os.ChangeLocation(node.GetLocation());

    const Child = index => WriteHLSL(os, node.GetChild(index), symbolTable);
    const children = (glue, offset = 0) => writeChildren(os, WriteHLSL, node, symbolTable, glue, offset);
    const attribute = () =>
    {
        if (node.GetToken())
        {
            os.Write("[").Write(node.GetToken().stringValue).Write("] ");
        }
    };

    switch (node.GetNodeType())
    {
        case N.NT_VAR_IDENTIFIER:
            os.Write(node.GetSymbol().name);
            break;
        case N.NT_CONSTANT:
            os.Write(node.GetToken().stringValue);
            break;
        case N.NT_INLINE_CONSTRUCTOR:
            os.Write("{ ");
            os.Indent();
            children(", ");
            os.Unindent();
            os.Write(" }");
            break;
        case N.NT_PREFIX_EXPRESSION:
            os.Write(GetOperatorSymbol(node.GetToken().type)).Write("( ");
            Child(0);
            os.Write(" )");
            break;
        case N.NT_POSTFIX_EXPRESSION:
            os.Write("( ");
            Child(0);
            os.Write(" )");
            switch (node.GetToken().type)
            {
                case T.OP_LEFT_BRACKET:
                    os.Write("[");
                    Child(1);
                    os.Write("]");
                    break;
                case T.OP_DOT:
                    os.Write(".");
                    Child(1);
                    break;
                case T.OP_ID:
                    os.Write(".").Write(node.GetToken().stringValue);
                    break;
                default:
                    os.Write(GetOperatorSymbol(node.GetToken().type));
                    break;
            }
            break;
        case N.NT_EXPRESSION:
            os.Write("( ");
            Child(0);
            os.Write(" )");
            if (node.GetToken().type !== T.OP_LEFT_PAREN)
            {
                os.Write(" ").Write(GetOperatorSymbol(node.GetToken().type)).Write(" ( ");
                Child(1);
                os.Write(" )");
            }
            break;
        case N.NT_CONDITIONAL_EXPRESSION:
            os.Write("( ");
            Child(0);
            os.Write(" ) ? ( ");
            Child(1);
            os.Write(" ) : ( ");
            Child(2);
            os.Write(" )");
            break;
        case N.NT_CAST_EXPRESSION:
            os.Write("(");
            WriteType(os, node.GetType());
            os.Write(")( ");
            Child(0);
            os.Write(" )");
            break;
        case N.NT_FUNCTION_CALL:
            writeCallee(os, node);
            os.Write("( ");
            os.Indent();
            children(", ");
            os.Unindent();
            os.Write(" )");
            break;
        case N.NT_FUNCTION_HEADER:
            if (!node.GetSymbol().used)
            {
                break;
            }
            os.Endl();
            WriteType(os, node.GetType());
            os.Write(" ").Write(node.GetSymbol().name).Write("( ");
            os.Indent();
            children(", ");
            os.Unindent();
            os.Write(" )");
            if (node.GetSymbol().semantic.IsSet())
            {
                os.Write(" : ").Write(node.GetSymbol().semantic);
            }
            os.Endl();
            break;
        case N.NT_FUNCTION_PARAMETER:
            if (node.GetToken())
            {
                switch (node.GetToken().type)
                {
                    case T.OP_OUT: os.Write("out "); break;
                    case T.OP_INOUT: os.Write("inout "); break;
                }
            }
            if (node.GetSymbol())
            {
                writeInterpolation(os, node.GetSymbol().interpolationModifier);
            }
            if (node.GetChildOrNull(2))
            {
                Child(2);
                os.Write(" ");
            }
            WriteType(os, node.GetType());
            if (node.GetSymbol())
            {
                os.Write(" ").Write(node.GetSymbol().name);
            }
            if (node.GetChildOrNull(0))
            {
                Child(0);
            }
            if (node.GetSymbol() && node.GetSymbol().semantic.IsSet())
            {
                os.Write(" : ").Write(node.GetSymbol().semantic);
            }
            if (node.GetChildOrNull(1))
            {
                os.Write(" = ");
                Child(1);
            }
            break;
        case N.NT_NAME_DECLARATION:
        {
            const symbol = node.GetSymbol();
            if (!symbol.used)
            {
                break;
            }
            writeInterpolation(os, symbol.interpolationModifier);
            WriteType(os, symbol.type);
            os.Write(" ").Write(symbol.name);
            if (node.GetChildOrNull(0))
            {
                Child(0);
            }
            if (symbol.semantic.IsSet())
            {
                os.Write(" : ").Write(symbol.semantic);
            }
            if (symbol.packOffset.subComponent >= 0)
            {
                os.Write(" : packoffset( c").Write(symbol.packOffset.subComponent);
                if (symbol.packOffset.component.IsSet())
                {
                    os.Write(".").Write(symbol.packOffset.component);
                }
                os.Write(" )");
            }
            for (const [, reg] of symbol.registerSpecifier)
            {
                if ("tTbBuUsS".includes(reg.registerType) && reg.registerType !== "")
                {
                    os.Write(" : register( ");
                    if (reg.shaderProfile.start !== reg.shaderProfile.end)
                    {
                        os.Write(reg.shaderProfile).Write(", ");
                    }
                    os.Write(reg.registerType).Write(reg.registerNumber);
                    if (reg.subComponent >= 0)
                    {
                        os.Write("[").Write(reg.subComponent).Write("]");
                    }
                    if (reg.space >= 0)
                    {
                        os.Write(", space").Write(reg.space);
                    }
                    os.Write(" )");
                }
            }
            if (node.GetChildOrNull(1) && !node.GetType().IsSampler())
            {
                os.Write(" = ");
                Child(1);
            }
            os.Write(";");
            os.Endl();
            break;
        }
        case N.NT_VAR_DECLARATION_LIST:
            os.Indent();
            children("");
            os.Unindent();
            break;
        case N.NT_STRUCT:
            if (node.GetSymbol().used)
            {
                os.Write("struct ").Write(" ").Write(node.GetSymbol().name);
                os.Endl();
                os.Write("{");
                os.Endl();
                os.Indent();
                children("");
                os.Unindent();
                os.Endl();
                os.Write("};");
                os.Endl();
            }
            break;
        case N.NT_STRUCT_MEMBER:
            children("");
            break;
        case N.NT_BRACKET_LIST:
            for (let i = 0; i < node.GetChildrenCount(); i++)
            {
                os.Write("[");
                if (node.GetChildOrNull(i))
                {
                    Child(i);
                }
                os.Write("]");
            }
            break;
        case N.NT_PROGRAM:
            for (let i = 0; i < node.GetChildrenCount(); ++i)
            {
                Child(i);
                if (node.GetChild(i) && node.GetChild(i).GetNodeType() === N.NT_FUNCTION_HEADER)
                {
                    os.Write(";");
                }
            }
            break;
        case N.NT_BLOCK:
            os.Write("{");
            os.Indent();
            os.Endl();
            children("");
            os.Unindent();
            os.Endl();
            os.Write("}");
            os.Endl();
            break;
        case N.NT_EXPRESSION_STATEMENT:
            if (node.GetChildrenCount())
            {
                Child(0);
            }
            os.Write(";");
            os.Endl();
            break;
        case N.NT_IF:
            attribute();
            os.Write("if( ");
            Child(0);
            os.Write(" )");
            os.Endl();
            Child(1);
            if (node.GetChildrenCount() > 2)
            {
                os.Write("else");
                os.Endl();
                Child(2);
            }
            break;
        case N.NT_WHILE:
            attribute();
            os.Write("while( ");
            Child(0);
            os.Write(" )");
            os.Endl();
            Child(1);
            break;
        case N.NT_DO:
            os.Write("do");
            os.Endl();
            Child(1);
            os.Write("while( ");
            Child(0);
            os.Write(" );");
            os.Endl();
            break;
        case N.NT_FOR:
            attribute();
            os.Write("for( ");
            Child(0);
            if (node.GetChild(1))
            {
                Child(1);
            }
            os.Write("; ");
            if (node.GetChild(2))
            {
                Child(2);
            }
            os.Write(" )");
            os.Endl();
            Child(3);
            break;
        case N.NT_SWITCH:
            attribute();
            os.Write("switch( ");
            Child(0);
            os.Write(" )");
            os.Endl();
            os.Write("{");
            os.Endl();
            children("", 1);
            os.Write("}");
            os.Endl();
            break;
        case N.NT_CASE:
            if (node.GetChildOrNull(0) === null)
            {
                os.Write("default:");
                os.Endl();
            }
            else
            {
                os.Write("case ");
                Child(0);
                os.Write(":");
                os.Endl();
            }
            os.Indent();
            Child(1);
            os.Unindent();
            break;
        case N.NT_JUMP:
            switch (node.GetToken().type)
            {
                case T.OP_CONTINUE: os.Write("continue;"); break;
                case T.OP_BREAK: os.Write("break;"); break;
                case T.OP_RETURN:
                    if (node.GetChildrenCount() === 0)
                    {
                        os.Write("return;");
                    }
                    else
                    {
                        os.Write("return ");
                        Child(0);
                        os.Write(";");
                    }
                    break;
                case T.OP_DISCARD: os.Write("discard;"); break;
            }
            os.Endl();
            break;
        case N.NT_FUNCTION_DEFINITION:
            if (node.GetChild(0).GetSymbol().used)
            {
                if (node.GetChildOrNull(2))
                {
                    Child(2);
                }
                Child(0);
                Child(1);
            }
            break;
        case N.NT_SAMPLER_STATE_LIST:
            os.Write("sampler_state");
            os.Endl();
            os.Write("{");
            os.Endl();
            os.Write("}");
            os.Endl();
            break;
        case N.NT_STATE_ASSIGNMENT:
            writeStateAssignment(os, node, () => Child(0));
            break;
        case N.NT_CBUFFER:
        {
            if (!HasUsedDeclarations(node))
            {
                break;
            }
            os.Write(node.GetToken().type === T.OP_TBUFFER ? "tbuffer " : "cbuffer ");
            os.Write(node.GetSymbol().name);
            for (const [, reg] of node.GetSymbol().registerSpecifier)
            {
                os.Write(" : register( ").Write(reg.registerType).Write(reg.registerNumber);
                if (reg.space >= 0)
                {
                    os.Write(", space").Write(reg.space);
                }
                os.Write(" )");
            }
            os.Endl();
            os.Write("{");
            os.Endl();
            children("");
            os.Endl();
            os.Write("}");
            os.Endl();
            break;
        }
        case N.NT_STATE_VALUE:
            os.Write(node.GetToken().stringValue);
            break;
        case N.NT_FUNCTION_ATTRIBUTE_LIST:
            children("");
            break;
        case N.NT_FUNCTION_ATTRIBUTE:
            if (node.GetToken().stringValue.Equals__Chars("globalinput"))
            {
                break;
            }
            os.Write("[").Write(node.GetToken().stringValue);
            if (node.GetChildrenCount())
            {
                os.Write("(");
                children(", ");
                os.Write(")");
            }
            os.Write("]");
            os.Endl();
            break;
        case N.NT_FUNCTION_ATTRIBUTE_VALUE:
        case N.NT_PRIMITIVE_TYPE:
            os.Write(node.GetToken().stringValue);
            break;
        default:
            break;
    }
    return os;
}

/**
 * The callee of an `NT_FUNCTION_CALL`, shared by both printers: the
 * resolved symbol's name, else the identifier, else the constructor type.
 *
 * @param {import("./CodeStream.js").CodeStream} os The stream.
 * @param {import("../ASTNode/ASTNode.js").ASTNode} node The call.
 */
function writeCallee(os, node)
{
    if (node.GetSymbol() === null)
    {
        if (node.GetToken().type === T.OP_ID)
        {
            os.Write(node.GetToken().stringValue);
        }
        else
        {
            const t = new Type();
            t.FromToken(node.GetToken());
            WriteType(os, t);
        }
    }
    else
    {
        os.Write(node.GetSymbol().name);
    }
}

/**
 * `NT_STATE_ASSIGNMENT`, the same in both printers.
 *
 * @param {import("./CodeStream.js").CodeStream} os The stream.
 * @param {import("../ASTNode/ASTNode.js").ASTNode} node The assignment.
 * @param {() => void} writeValue Prints child 0.
 */
function writeStateAssignment(os, node, writeValue)
{
    os.Write(node.GetToken().stringValue).Write(" = ");
    if (node.GetSymbol())
    {
        os.Write("<").Write(node.GetSymbol().name).Write(">");
    }
    else
    {
        writeValue();
    }
    os.Write(";");
    os.Endl();
}

/**
 * Carbon's file-local `IsVectorReferenceParameter`: whether parameter
 * `paramIndex` of a user function is an `out`/`inout` scalar or vector, which
 * Metal passes by reference.
 *
 * @param {import("../SymbolTable/Symbol.js").Symbol|null} functionSymbol The callee.
 * @param {number} paramIndex Parameter index.
 * @param {{ paramType: Type|null, addressSpace: number }} out Filled when true.
 * @returns {boolean} Whether it is such a parameter.
 */
function IsVectorReferenceParameter(functionSymbol, paramIndex, out)
{
    if (functionSymbol && functionSymbol.definition)
    {
        const params = functionSymbol.definition.GetChild(0);
        const param = params.GetChildOrNull(paramIndex);
        if (param && param.GetToken() && param.GetToken().type !== T.OP_IN && param.GetType().IsScalarOrVector())
        {
            out.paramType = param.GetType().Copy();
            out.addressSpace = Symbol.AddressSpace.Thread;
            if (param.GetSymbol())
            {
                out.addressSpace = param.GetSymbol().addressSpace;
            }
            return true;
        }
    }
    return false;
}

/** @param {number} addressMode A D3D11 address mode. @returns {string} Carbon's `MSLAddressMode`. */
function MSLAddressMode(addressMode)
{
    switch (addressMode)
    {
        case D3D11_TEXTURE_ADDRESS_MODE.D3D11_TEXTURE_ADDRESS_WRAP: return "repeat";
        case D3D11_TEXTURE_ADDRESS_MODE.D3D11_TEXTURE_ADDRESS_MIRROR: return "mirrored_repeat";
        case D3D11_TEXTURE_ADDRESS_MODE.D3D11_TEXTURE_ADDRESS_CLAMP: return "clamp_to_edge";
        case D3D11_TEXTURE_ADDRESS_MODE.D3D11_TEXTURE_ADDRESS_BORDER: return "clamp_to_border";
        default: return "clamp_to_edge";
    }
}

/** @param {number} border A static sampler border colour code. @returns {string} Carbon's `MSLBorderColor`. */
function MSLBorderColor(border)
{
    switch (border)
    {
        case 0: return "transparent_black";
        case 1: return "opaque_black";
        case 2: return "opaque_white";
        default: return "transparent_black";
    }
}

/** @param {number} filter A D3D9-style filter. @returns {string} Carbon's `MSLFilterMode`. */
function MSLFilterMode(filter)
{
    return filter === 0 || filter === 1 ? "nearest" : "linear";
}

/** @param {number} filter A D3D9-style filter. @returns {string} Carbon's `MSLMipFilterMode`. */
function MSLMipFilterMode(filter)
{
    switch (filter)
    {
        case 0: return "none";
        case 1: return "nearest";
        default: return "linear";
    }
}

/** @param {number} func A D3D11 comparison. @returns {string} Carbon's `MSLCompareFunc`. */
function MSLCompareFunc(func)
{
    const C = D3D11_COMPARISON_FUNC;
    switch (func)
    {
        case C.D3D11_COMPARISON_ALWAYS: return "always";
        case C.D3D11_COMPARISON_LESS: return "less";
        case C.D3D11_COMPARISON_EQUAL: return "equal";
        case C.D3D11_COMPARISON_LESS_EQUAL: return "less_equal";
        case C.D3D11_COMPARISON_GREATER: return "greater";
        case C.D3D11_COMPARISON_NOT_EQUAL: return "not_equal";
        case C.D3D11_COMPARISON_GREATER_EQUAL: return "greater_equal";
        default: return "never";
    }
}

/**
 * Metal's address-space keyword, as Carbon's MSL printer writes it.
 *
 * @param {import("./CodeStream.js").CodeStream} os The stream.
 * @param {number} space An `AddressSpace` value.
 * @param {object} [options] Which spaces this site prints.
 * @param {boolean} [options.rayData=false] Print `ray_data`.
 * @param {boolean} [options.constexpr=false] Print `constexpr`.
 * @param {string} [options.pad=""] Text on both sides, for the pointer-level variant.
 */
function writeAddressSpace(os, space, { rayData = false, constexpr = false, pad = "" } = {})
{
    switch (space)
    {
        case Symbol.AddressSpace.Constant: os.Write(`${pad}constant `); break;
        case Symbol.AddressSpace.Device: os.Write(`${pad}device `); break;
        case Symbol.AddressSpace.Thread: os.Write(`${pad}thread `); break;
        case Symbol.AddressSpace.Threadgroup: os.Write(`${pad}threadgroup `); break;
        case Symbol.AddressSpace.RayData:
            if (rayData)
            {
                os.Write(`${pad}ray_data `);
            }
            break;
        case Symbol.AddressSpace.Constexpr:
            if (constexpr)
            {
                os.Write(`${pad}constexpr `);
            }
            break;
        default:
            break;
    }
}

/**
 * Carbon's `operator<<( CodeStream&, const MSL& )`: prints a node as Metal,
 * after `EffectCompilerMetal` has rewritten the tree (entry points, argument
 * attributes, address spaces, constant buffers as structs).
 *
 * Note that printing an `out`/`inout` parameter with no address space sets it
 * to `thread`, as Carbon's printer does.
 *
 * @param {import("./CodeStream.js").CodeStream} os The stream.
 * @param {import("../ASTNode/ASTNode.js").ASTNode} node The node.
 * @param {import("../SymbolTable/SymbolTable.js").SymbolTable} symbolTable The symbol table.
 * @returns {import("./CodeStream.js").CodeStream} The stream.
 */
export function WriteMSL(os, node, symbolTable)
{
    os.ChangeLocation(node.GetLocation());

    const Child = index => WriteMSL(os, node.GetChild(index), symbolTable);
    const children = (glue, offset = 0) => writeChildren(os, WriteMSL, node, symbolTable, glue, offset);

    switch (node.GetNodeType())
    {
        case N.NT_VAR_IDENTIFIER:
            os.Write(node.GetSymbol().name);
            break;
        case N.NT_CONSTANT:
            os.Write(node.GetToken().stringValue);
            break;
        case N.NT_INLINE_CONSTRUCTOR:
            os.Write("{ ");
            os.Indent();
            children(", ");
            os.Unindent();
            os.Write(" }");
            break;
        case N.NT_PREFIX_EXPRESSION:
            os.Write(GetOperatorSymbol(node.GetToken().type)).Write("( ");
            Child(0);
            os.Write(" )");
            break;
        case N.NT_POSTFIX_EXPRESSION:
        {
            if (node.GetToken().type === T.OP_ID)
            {
                const objectType = node.GetChild(0).GetType();
                if (objectType.IsScalarOrVector() && objectType.width === 1 && objectType.height === 1)
                {
                    // swizzle for a scalar "f"
                    if (node.GetType().width === 1 && node.GetType().height === 1)
                    {
                        // f.x -> x
                        Child(0);
                    }
                    else
                    {
                        // f.xx -> float2(f)
                        WriteType(os, node.GetType());
                        os.Write("(");
                        Child(0);
                        os.Write(")");
                    }
                    break;
                }
            }
            os.Write("( ");
            Child(0);
            os.Write(" )");
            switch (node.GetToken().type)
            {
                case T.OP_LEFT_BRACKET:
                {
                    const indexType = node.GetChild(1).GetType().Copy();
                    if (indexType.IsScalarOrVector() && indexType.builtInType !== T.OP_INT && indexType.builtInType !== T.OP_UINT)
                    {
                        indexType.builtInType = T.OP_INT;
                        os.Write("[(");
                        WriteType(os, indexType);
                        os.Write(")(");
                        Child(1);
                        os.Write(")]");
                    }
                    else
                    {
                        os.Write("[");
                        Child(1);
                        os.Write("]");
                    }
                    break;
                }
                case T.OP_DOT:
                    os.Write(".");
                    Child(1);
                    break;
                case T.OP_ID:
                    os.Write(".").Write(node.GetToken().stringValue);
                    break;
                default:
                    os.Write(GetOperatorSymbol(node.GetToken().type));
                    break;
            }
            break;
        }
        case N.NT_EXPRESSION:
            os.Write("( ");
            Child(0);
            os.Write(" )");
            if (node.GetToken().type !== T.OP_LEFT_PAREN)
            {
                os.Write(" ").Write(GetOperatorSymbol(node.GetToken().type)).Write(" ( ");
                Child(1);
                os.Write(" )");
            }
            break;
        case N.NT_CONDITIONAL_EXPRESSION:
            os.Write("( ");
            Child(0);
            os.Write(" ) ? ( ");
            Child(1);
            os.Write(" ) : ( ");
            Child(2);
            os.Write(" )");
            break;
        case N.NT_CAST_EXPRESSION:
        {
            const castType = node.GetType();
            const operand = node.GetChild(0);
            if (castType.IsStruct() && operand.GetType().IsScalarOrVector())
            {
                WriteType(os, castType);
                os.Write("{ ");
                Child(0);
                os.Write(" }");
            }
            else if (castType.IsMatrix() &&
                (operand.GetType().IsMatrix() ||
                    (operand.GetNodeType() === N.NT_POSTFIX_EXPRESSION && operand.GetChild(1).GetType().IsMatrix())))
            {
                os.Write("to_");
                WriteType(os, castType);
                os.Write("( ");
                Child(0);
                os.Write(" )");
            }
            else if (node.GetSymbol())
            {
                const symbol = node.GetSymbol();
                os.Write("(");
                writeAddressSpace(os, symbol.addressSpace);
                WriteType(os, castType);
                for (let i = 0; i < castType.arrayDimensions; ++i)
                {
                    if (castType.IsBuffer())
                    {
                        writeAddressSpace(os, symbol.addressSpace, { pad: " " });
                    }
                    os.Write("*");
                }
                if (symbol.addressSpace === Symbol.AddressSpace.Constant && castType.arrayDimensions === 0)
                {
                    os.Write("&");
                }
                os.Write(")( ");
                Child(0);
                os.Write(" )");
            }
            else
            {
                os.Write("(");
                WriteType(os, castType);
                os.Write(")( ");
                Child(0);
                os.Write(" )");
            }
            break;
        }
        case N.NT_FUNCTION_CALL:
            writeCallee(os, node);
            os.Write("( ");
            os.Indent();
            for (let i = 0; i < node.GetChildrenCount(); ++i)
            {
                if (i)
                {
                    os.Write(", ");
                }
                const reference = { paramType: null, addressSpace: Symbol.AddressSpace.None };
                if (IsVectorReferenceParameter(node.GetSymbol(), i, reference))
                {
                    const arg = node.GetChild(i);
                    if (arg.GetNodeType() === N.NT_POSTFIX_EXPRESSION && arg.GetToken() && arg.GetToken().type === T.OP_ID && arg.GetChild(0).GetType().IsVector())
                    {
                        os.Write("VectorReference").Write(reference.paramType.width).Write("<thread ");
                        WriteType(os, arg.GetChild(0).GetType());
                        os.Write("&,");
                        switch (reference.addressSpace)
                        {
                            case Symbol.AddressSpace.Constant: os.Write("constant "); break;
                            case Symbol.AddressSpace.Device: os.Write("device "); break;
                            case Symbol.AddressSpace.Threadgroup: os.Write("threadgroup "); break;
                            default: os.Write("thread "); break;
                        }
                        os.Write(" ");
                        WriteType(os, reference.paramType);
                        os.Write("&>(");
                        WriteMSL(os, arg.GetChild(0), symbolTable);
                        os.Write(", int4( 0, 1, 2, 3 ).").Write(arg.GetToken().stringValue).Write(")");
                        continue;
                    }
                }
                WriteMSL(os, node.GetChild(i), symbolTable);
            }
            os.Unindent();
            os.Write(" )");
            break;
        case N.NT_FUNCTION_HEADER:
            if (!node.GetSymbol().used)
            {
                break;
            }
            os.Endl();
            WriteType(os, node.GetType());
            os.Write(" ").Write(node.GetSymbol().name).Write("( ");
            os.Indent();
            children(", ");
            os.Unindent();
            os.Write(" )");
            os.Endl();
            break;
        case N.NT_FUNCTION_PARAMETER:
            writeMSLParameter(os, node, symbolTable, Child);
            break;
        case N.NT_NAME_DECLARATION:
            writeMSLNameDeclaration(os, node, Child);
            break;
        case N.NT_VAR_DECLARATION_LIST:
            os.Indent();
            children("");
            os.Unindent();
            break;
        case N.NT_STRUCT:
            if (node.GetSymbol().used)
            {
                os.Write("struct ").Write(" ").Write(node.GetSymbol().name);
                os.Endl();
                os.Write("{");
                os.Endl();
                os.Indent();
                children("");
                os.Unindent();
                os.Endl();
                os.Write("};");
                os.Endl();
            }
            break;
        case N.NT_STRUCT_MEMBER:
            children("");
            break;
        case N.NT_BRACKET_LIST:
            for (let i = 0; i < node.GetChildrenCount(); i++)
            {
                os.Write("[");
                if (node.GetChildOrNull(i))
                {
                    Child(i);
                }
                os.Write("]");
            }
            break;
        case N.NT_PROGRAM:
            for (let i = 0; i < node.GetChildrenCount(); ++i)
            {
                Child(i);
                if (node.GetChild(i) && node.GetChild(i).GetNodeType() === N.NT_FUNCTION_HEADER)
                {
                    os.Write(";");
                }
            }
            break;
        case N.NT_BLOCK:
            os.Write("{");
            os.Indent();
            os.Endl();
            children("");
            os.Unindent();
            os.Endl();
            os.Write("}");
            os.Endl();
            break;
        case N.NT_EXPRESSION_STATEMENT:
            if (node.GetChildrenCount())
            {
                Child(0);
            }
            os.Write(";");
            os.Endl();
            break;
        case N.NT_IF:
            os.Write("if( ");
            Child(0);
            os.Write(" )");
            os.Endl();
            Child(1);
            if (node.GetChildrenCount() > 2)
            {
                os.Write("else");
                os.Endl();
                Child(2);
            }
            break;
        case N.NT_WHILE:
            os.Write("while( ");
            Child(0);
            os.Write(" )");
            os.Endl();
            Child(1);
            break;
        case N.NT_DO:
            os.Write("do");
            os.Endl();
            Child(1);
            os.Write("while( ");
            Child(0);
            os.Write(" );");
            os.Endl();
            break;
        case N.NT_FOR:
            os.Write("for( ");
            Child(0);
            if (node.GetChild(1))
            {
                Child(1);
            }
            os.Write("; ");
            if (node.GetChild(2))
            {
                Child(2);
            }
            os.Write(" )");
            os.Endl();
            Child(3);
            break;
        case N.NT_SWITCH:
        {
            os.Write("switch( ");
            const childType = node.GetChild(0).GetType().Copy();
            if (childType.IsScalarOrVector() && childType.builtInType !== T.OP_INT && childType.builtInType !== T.OP_UINT)
            {
                childType.builtInType = T.OP_INT;
                os.Write("(");
                WriteType(os, childType);
                os.Write(")(");
                Child(0);
                os.Write(")");
            }
            else
            {
                Child(0);
            }
            os.Write(" )");
            os.Endl();
            os.Write("{");
            os.Endl();
            children("", 1);
            os.Write("}");
            os.Endl();
            break;
        }
        case N.NT_CASE:
            if (node.GetChildOrNull(0) === null)
            {
                os.Write("default:");
                os.Endl();
            }
            else
            {
                os.Write("case ");
                Child(0);
                os.Write(":");
                os.Endl();
            }
            os.Indent();
            Child(1);
            os.Unindent();
            break;
        case N.NT_JUMP:
            switch (node.GetToken().type)
            {
                case T.OP_CONTINUE: os.Write("continue;"); break;
                case T.OP_BREAK: os.Write("break;"); break;
                case T.OP_RETURN:
                    if (node.GetChildrenCount() === 0)
                    {
                        os.Write("return;");
                    }
                    else
                    {
                        os.Write("return ");
                        Child(0);
                        os.Write(";");
                    }
                    break;
                case T.OP_DISCARD: os.Write("discard_fragment();"); break;
            }
            os.Endl();
            break;
        case N.NT_FUNCTION_DEFINITION:
            if (node.GetChild(0).GetSymbol().used)
            {
                // function attributes
                if (node.GetChildOrNull(2))
                {
                    Child(2);
                }
                else
                {
                    os.Write(" __attribute__((always_inline)) ");
                }
                // header
                Child(0);
                os.Endl();
                // body
                Child(1);
                os.Endl();
            }
            break;
        case N.NT_SAMPLER_STATE_LIST:
        {
            const sampler = node.extraData;
            if (sampler)
            {
                os.Write("(");
                os.Write("s_address::").Write(MSLAddressMode(sampler.addressU));
                os.Write(", t_address::").Write(MSLAddressMode(sampler.addressV));
                os.Write(", r_address::").Write(MSLAddressMode(sampler.addressW));
                os.Write(", border_color::").Write(MSLBorderColor(sampler.borderColor));
                os.Write(", mag_filter::").Write(MSLFilterMode(sampler.magFilter));
                os.Write(", min_filter::").Write(MSLFilterMode(sampler.minFilter));
                os.Write(", mip_filter::").Write(MSLMipFilterMode(sampler.mipFilter));
                os.Write(", compare_func::").Write(MSLCompareFunc(sampler.comparisonFunc));
                if (sampler.minFilter === 3 || sampler.magFilter === 3 || sampler.mipFilter === 3)
                {
                    os.Write(", max_anisotropy(").Write(sampler.maxAnisotropy).Write(")");
                }
                if (sampler.minLOD !== -FLT_MAX || sampler.maxLOD !== FLT_MAX)
                {
                    os.Write(", lod_clamp(").WriteFloat(sampler.minLOD).Write(", ").WriteFloat(sampler.maxLOD).Write(")");
                }
                os.Write(")");
            }
            break;
        }
        case N.NT_STATE_ASSIGNMENT:
            writeStateAssignment(os, node, () => Child(0));
            break;
        case N.NT_CBUFFER:
            // Assert here. All NT_CBUFFER nodes should have been replaced with NT_STRUCT nodes
            // plus necessary adjustments in other places.
            throw new Error("WriteMSL: NT_CBUFFER reached the Metal printer");
        case N.NT_STATE_VALUE:
            os.Write(node.GetToken().stringValue);
            break;
        case N.NT_FUNCTION_ATTRIBUTE_LIST:
            children("");
            break;
        case N.NT_FUNCTION_ATTRIBUTE:
        {
            const attrib = node.GetToken().stringValue.ToString();
            if (attrib === "vertex" || attrib === "fragment" || attrib === "kernel" || (attrib.length > 4 && attrib.slice(0, 2) === "[["))
            {
                os.Write(" ").Write(attrib).Write(" ");
            }
            break;
        }
        case N.NT_FUNCTION_ATTRIBUTE_VALUE:
        case N.NT_PRIMITIVE_TYPE:
            os.Write(node.GetToken().stringValue);
            break;
        default:
            break;
    }
    return os;
}

/**
 * The register attributes of a Metal parameter or declaration.
 *
 * @param {import("./CodeStream.js").CodeStream} os The stream.
 * @param {import("../SymbolTable/Symbol.js").Symbol} symbol The symbol.
 * @param {import("../ASTNode/ASTNode.js").ASTNode} node Its node (for the UAV texture test).
 */
function writeMSLParameterAttributes(os, symbol, node)
{
    for (const [, reg] of symbol.registerSpecifier)
    {
        switch (reg.registerType)
        {
            case MetalRegister.Enum.StageIn: os.Write(" [[ stage_in ]]"); break;
            case MetalRegister.Enum.Attribute: os.Write("[[ attribute(").Write(reg.registerNumber).Write(") ]]"); break;
            case MetalRegister.Enum.CBuffer: os.Write(" [[ CBUFFER(").Write(reg.registerNumber).Write(") ]]"); break;
            case MetalRegister.Enum.SRV: os.Write(" [[ buffer(").Write(reg.registerNumber).Write(") ]]"); break;
            case MetalRegister.Enum.Texture: os.Write(" [[ texture(").Write(reg.registerNumber).Write(") ]]"); break;
            case MetalRegister.Enum.Sampler: os.Write(" [[ sampler(").Write(reg.registerNumber).Write(") ]]"); break;
            case MetalRegister.Enum.UAV:
                os.Write(node.GetType().IsTexture() ? " [[ texture(" : " [[ buffer(").Write(reg.registerNumber).Write(") ]]");
                break;
            case MetalRegister.Enum.ThreadGroup: os.Write(" [[ threadgroup(").Write(reg.registerNumber).Write(") ]]"); break;
            case MetalRegister.Enum.User: os.Write(" [[ user(").Write(symbol.semantic).Write(") ]]"); break;
            case MetalRegister.Enum.System: os.Write("[[ ").Write(MetalSystemSemanticsType.getString(reg.registerNumber)).Write(" ]]"); break;
            default: os.Write(" [[ !!unsupported_attribute ").Write(reg.registerType).Write("!! ]]"); break;
        }
    }
}

/**
 * The `NT_FUNCTION_PARAMETER` case of Carbon's MSL printer.
 *
 * @param {import("./CodeStream.js").CodeStream} os The stream.
 * @param {import("../ASTNode/ASTNode.js").ASTNode} node The parameter.
 * @param {import("../SymbolTable/SymbolTable.js").SymbolTable} symbolTable The symbol table.
 * @param {(index: number) => void} Child Prints a child.
 */
function writeMSLParameter(os, node, symbolTable, Child)
{
    const symbol = node.GetSymbol();
    let isReference = false;
    if (node.GetToken())
    {
        // Treat "out" and "inout" parameters as references.
        switch (node.GetToken().type)
        {
            case T.OP_OUT:
            case T.OP_INOUT:
                // References need an address space. The default will be "thread".
                if (symbol.addressSpace === Symbol.AddressSpace.None)
                {
                    symbol.addressSpace = Symbol.AddressSpace.Thread;
                }
                isReference = true;
                break;
        }
    }
    writeAddressSpace(os, symbol.addressSpace, { rayData: true });
    let isArrayOfTextures = symbol.type.arrayDimensions > 0 && (symbol.type.IsTexture() || symbol.type.IsBuffer() || symbol.type.IsSampler()) && symbol.registerSpecifier.size !== 0;
    if (isArrayOfTextures)
    {
        os.Write("const _ResourceRef<");
        if (symbol.type.IsBuffer())
        {
            writeAddressSpace(os, symbol.addressSpace, { rayData: true });
        }
        WriteType(os, node.GetType());
        os.Write(">*");
    }
    else
    {
        WriteType(os, node.GetType());
        if (symbol.type.arrayDimensions > 0 && symbol.type.IsBuffer())
        {
            isArrayOfTextures = true;
            for (let i = 0; i < node.GetType().arrayDimensions; ++i)
            {
                if (node.GetType().IsBuffer())
                {
                    writeAddressSpace(os, symbol.addressSpace, { pad: " " });
                }
                os.Write("*");
            }
        }
    }
    if (isReference)
    {
        // Don't need to add & for arrays.
        if (node.GetType().arrayDimensions === 0)
        {
            os.Write("&");
        }
    }
    os.Write(" ").Write(symbol.name);
    if (!isArrayOfTextures && node.GetChildOrNull(0))
    {
        Child(0);
    }
    writeMSLParameterAttributes(os, symbol, node);
    if (node.GetChildOrNull(1))
    {
        os.Write(" = ");
        Child(1);
    }
    void symbolTable;
}

/**
 * The `NT_NAME_DECLARATION` case of Carbon's MSL printer.
 *
 * @param {import("./CodeStream.js").CodeStream} os The stream.
 * @param {import("../ASTNode/ASTNode.js").ASTNode} node The declaration.
 * @param {(index: number) => void} Child Prints a child.
 */
function writeMSLNameDeclaration(os, node, Child)
{
    const symbol = node.GetSymbol();
    if (!symbol.used)
    {
        return;
    }
    writeAddressSpace(os, symbol.addressSpace, { constexpr: true });

    const isArrayOfTextures = symbol.resourceRefWrapped && symbol.type.arrayDimensions > 0 && (symbol.type.IsTexture() || symbol.type.IsBuffer() || symbol.type.IsSampler());
    if (isArrayOfTextures)
    {
        os.Write("const _ResourceRef<");
        if (symbol.type.IsBuffer())
        {
            writeAddressSpace(os, symbol.addressSpace, { constexpr: true });
        }
        WriteType(os, node.GetType());
        os.Write(">*");
    }
    else
    {
        WriteType(os, symbol.type);
    }
    os.Write(" ").Write(symbol.name);
    if (!isArrayOfTextures && node.GetChildOrNull(0))
    {
        Child(0);
    }
    if (symbol.addressSpace !== Symbol.AddressSpace.Constexpr)
    {
        for (const [, reg] of symbol.registerSpecifier)
        {
            switch (reg.registerType)
            {
                case MetalRegister.Enum.Attribute: os.Write("[[ attribute(").Write(reg.registerNumber).Write(") ]]"); break;
                // just ignore it
                case MetalRegister.Enum.CBuffer: break;
                case MetalRegister.Enum.User: os.Write(" [[ user(").Write(symbol.semantic).Write(") ]]"); break;
                case MetalRegister.Enum.System: os.Write("[[ ").Write(MetalSystemSemanticsType.getString(reg.registerNumber)).Write(" ]]"); break;
                default: os.Write("[[ !!unsupported_register ").Write(reg.registerType).Write("!! ]]"); break;
            }
        }
    }
    if (node.GetChildOrNull(1))
    {
        if (!node.GetType().IsSampler())
        {
            os.Write(" = ");
        }
        Child(1);
    }
    os.Write(";");
    os.Endl();
}
