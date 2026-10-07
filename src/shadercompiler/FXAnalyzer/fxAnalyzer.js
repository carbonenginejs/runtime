// Source: trinity/shadercompiler/FXAnalyzer.h:47-60
// Source: trinity/shadercompiler/FXAnalyzer.cpp
//
// Constant evaluation of FX state assignments, sampler states and array
// sizes. Carbon's values are C `long` (32-bit on Windows) and `double`.
//
// Adapted: Carbon writes a state's value into a struct by byte offset; here a
// state description names the field it writes (see StateDescription.js).
//
// Where Carbon's evaluation is undefined (an indeterminate or out-of-range
// read, a trapping division, an unrepresentable conversion), the port throws
// and names the Carbon known defect.

import { HLSLParserTokens } from "../hlslParserTokens.js";
import { InlineString } from "../InlineString.js";
import { Type } from "../Type.js";
import { ParseNumber, ParseFloat, ParseString } from "../ParserUtils/parserUtils.js";
import {
    D3D11_TEXTURE_ADDRESS_MODE, D3D11_FILTER, D3D11_COMPARISON_FUNC, D3D11_BLEND, D3D11_BLEND_OP, D3D11_FILL_MODE,
    D3D11_DECODE_IS_ANISOTROPIC_FILTER, D3D11_DECODE_MAG_FILTER, D3D11_DECODE_MIN_FILTER, D3D11_DECODE_MIP_FILTER,
    D3D11_DECODE_IS_COMPARISON_FILTER
} from "../stdafx.js";
import { ExpressionValueElement } from "./ExpressionValueElement.js";
import { StateValue } from "./StateValue.js";
import { StateDescription } from "./StateDescription.js";
import { ASTNode } from "../ASTNode/ASTNode.js";
import { ParserState } from "../ParserState/ParserState.js";
import { ShaderExport } from "../EffectData/ShaderExport.js";

const T = HLSLParserTokens;
const {
    NT_CONSTANT, NT_VAR_IDENTIFIER, NT_STATE_VALUE, NT_EXPRESSION, NT_PREFIX_EXPRESSION, NT_POSTFIX_EXPRESSION,
    NT_CAST_EXPRESSION, NT_CONDITIONAL_EXPRESSION, NT_FUNCTION_CALL, NT_INLINE_CONSTRUCTOR, NT_STATE_ASSIGNMENT,
    NT_SAMPLER_STATE_LIST
} = ASTNode.ASTNodeType;

/** Reinterprets a float state's value as the `DWORD` a render state stores. */
const FLOAT_BITS = new DataView(new ArrayBuffer(4));

const D3DCOLORWRITEENABLE_RED = 1 << 0;
const D3DCOLORWRITEENABLE_GREEN = 1 << 1;
const D3DCOLORWRITEENABLE_BLUE = 1 << 2;
const D3DCOLORWRITEENABLE_ALPHA = 1 << 3;

/** Carbon's local `D3DTEXTUREFILTERTYPE`. */
const D3DTEXF = Object.freeze({ D3DTEXF_NONE: 0, D3DTEXF_POINT: 1, D3DTEXF_LINEAR: 2, D3DTEXF_ANISOTROPIC: 3 });

/** Carbon's local `D3DCULL`. */
const D3DCULL = Object.freeze({ D3DCULL_NONE: 1, D3DCULL_CW: 2, D3DCULL_CCW: 3 });

/** The members of Carbon's local `D3DRENDERSTATETYPE` that `g_renderStateNames` uses. */
const D3DRS = Object.freeze({
    D3DRS_ZENABLE: 7, D3DRS_FILLMODE: 8, D3DRS_ZWRITEENABLE: 14, D3DRS_ALPHATESTENABLE: 15, D3DRS_SRCBLEND: 19,
    D3DRS_DESTBLEND: 20, D3DRS_CULLMODE: 22, D3DRS_ZFUNC: 23, D3DRS_ALPHAREF: 24, D3DRS_ALPHAFUNC: 25,
    D3DRS_ALPHABLENDENABLE: 27, D3DRS_COLORWRITEENABLE: 168, D3DRS_BLENDOP: 171, D3DRS_SLOPESCALEDEPTHBIAS: 175,
    D3DRS_COLORWRITEENABLE1: 190, D3DRS_COLORWRITEENABLE2: 191, D3DRS_COLORWRITEENABLE3: 192, D3DRS_SRGBWRITEENABLE: 194,
    D3DRS_DEPTHBIAS: 195, D3DRS_SEPARATEALPHABLENDENABLE: 206, D3DRS_SRCBLENDALPHA: 207, D3DRS_DESTBLENDALPHA: 208,
    D3DRS_BLENDOPALPHA: 209
});

/**
 * A `StateValue` from a table row; Carbon's tables are aggregate initialisers.
 *
 * @param {{ name: string, value: number }} row The name and value.
 * @returns {StateValue} The state value.
 */
function toStateValue(row)
{
    const stateValue = new StateValue();
    stateValue.name = row.name;
    stateValue.value = row.value;
    return stateValue;
}

/**
 * A `StateDescription` from a table row.
 *
 * @param {{ stateName: string, type: number, stateValues: StateValue[]|null, field: string }} row The members.
 * @returns {StateDescription} The description.
 */
function toStateDescription(row)
{
    const description = new StateDescription();
    description.stateName = row.stateName;
    description.type = row.type;
    description.stateValues = row.stateValues;
    description.field = row.field;
    return description;
}

const { SVT_BYTE, SVT_DWORD, SVT_FLOAT, SVT_BOOL, SVT_COLOR } = StateDescription.StateValueType;
const A = D3D11_TEXTURE_ADDRESS_MODE;
const F = D3D11_FILTER;
const C = D3D11_COMPARISON_FUNC;
const B = D3D11_BLEND;
const O = D3D11_BLEND_OP;

const s_addressValues = [
    { name: "WRAP", value: A.D3D11_TEXTURE_ADDRESS_WRAP },
    { name: "MIRROR", value: A.D3D11_TEXTURE_ADDRESS_MIRROR },
    { name: "CLAMP", value: A.D3D11_TEXTURE_ADDRESS_CLAMP },
    { name: "BORDER", value: A.D3D11_TEXTURE_ADDRESS_BORDER },
    { name: "MIRRORONCE", value: A.D3D11_TEXTURE_ADDRESS_MIRROR_ONCE }
].map(toStateValue);
const s_filterValues = [
    { name: "NONE", value: D3DTEXF.D3DTEXF_NONE },
    { name: "POINT", value: D3DTEXF.D3DTEXF_POINT },
    { name: "LINEAR", value: D3DTEXF.D3DTEXF_LINEAR },
    { name: "ANISOTROPIC", value: D3DTEXF.D3DTEXF_ANISOTROPIC }
].map(toStateValue);
const s_filter11Values = [
    "MIN_MAG_MIP_POINT", "MIN_MAG_POINT_MIP_LINEAR", "MIN_POINT_MAG_LINEAR_MIP_POINT", "MIN_POINT_MAG_MIP_LINEAR",
    "MIN_LINEAR_MAG_MIP_POINT", "MIN_LINEAR_MAG_POINT_MIP_LINEAR", "MIN_MAG_LINEAR_MIP_POINT", "MIN_MAG_MIP_LINEAR",
    "ANISOTROPIC", "COMPARISON_MIN_MAG_MIP_POINT", "COMPARISON_MIN_MAG_POINT_MIP_LINEAR",
    "COMPARISON_MIN_POINT_MAG_LINEAR_MIP_POINT", "COMPARISON_MIN_POINT_MAG_MIP_LINEAR", "COMPARISON_MIN_LINEAR_MAG_MIP_POINT",
    "COMPARISON_MIN_LINEAR_MAG_POINT_MIP_LINEAR", "COMPARISON_MIN_MAG_LINEAR_MIP_POINT", "COMPARISON_MIN_MAG_MIP_LINEAR",
    "COMPARISON_ANISOTROPIC"
].map(name => toStateValue({ name, value: F[`D3D11_FILTER_${name}`] }));
const s_comparisonValues = [
    { name: "NEVER", value: C.D3D11_COMPARISON_NEVER },
    { name: "LESS", value: C.D3D11_COMPARISON_LESS },
    { name: "EQUAL", value: C.D3D11_COMPARISON_EQUAL },
    { name: "LESS_EQUAL", value: C.D3D11_COMPARISON_LESS_EQUAL },
    { name: "GREATER", value: C.D3D11_COMPARISON_GREATER },
    { name: "NOT_EQUAL", value: C.D3D11_COMPARISON_NOT_EQUAL },
    { name: "GREATER_EQUAL", value: C.D3D11_COMPARISON_GREATER_EQUAL },
    { name: "ALWAYS", value: C.D3D11_COMPARISON_ALWAYS },

    { name: "LESSEQUAL", value: C.D3D11_COMPARISON_LESS_EQUAL },
    { name: "NOTEQUAL", value: C.D3D11_COMPARISON_NOT_EQUAL },
    { name: "GREATEREQUAL", value: C.D3D11_COMPARISON_GREATER_EQUAL }
].map(toStateValue);
const s_blendValues = [
    { name: "ZERO", value: B.D3D11_BLEND_ZERO },
    { name: "ONE", value: B.D3D11_BLEND_ONE },
    { name: "SRCCOLOR", value: B.D3D11_BLEND_SRC_COLOR },
    { name: "INVSRCCOLOR", value: B.D3D11_BLEND_INV_SRC_COLOR },
    { name: "SRCALPHA", value: B.D3D11_BLEND_SRC_ALPHA },
    { name: "INVSRCALPHA", value: B.D3D11_BLEND_INV_SRC_ALPHA },
    { name: "DESTALPHA", value: B.D3D11_BLEND_DEST_ALPHA },

    { name: "INVDESTALPHA", value: B.D3D11_BLEND_INV_DEST_ALPHA },
    { name: "DESTCOLOR", value: B.D3D11_BLEND_DEST_COLOR },
    { name: "INVDESTCOLOR", value: B.D3D11_BLEND_INV_DEST_COLOR },
    { name: "SRCALPHASAT", value: B.D3D11_BLEND_SRC_ALPHA_SAT },
    { name: "BLENDFACTOR", value: B.D3D11_BLEND_BLEND_FACTOR },
    { name: "INVBLENDFACTOR", value: B.D3D11_BLEND_INV_BLEND_FACTOR },
    { name: "SRCCOLOR2", value: B.D3D11_BLEND_SRC1_COLOR },
    { name: "INVSRCCOLOR2", value: B.D3D11_BLEND_INV_SRC1_COLOR }
].map(toStateValue);
const s_blendOpValues = [
    { name: "ADD", value: O.D3D11_BLEND_OP_ADD },
    { name: "SUBTRACT", value: O.D3D11_BLEND_OP_SUBTRACT },
    { name: "REVSUBTRACT", value: O.D3D11_BLEND_OP_REV_SUBTRACT },
    { name: "MIN", value: O.D3D11_BLEND_OP_MIN },
    { name: "MAX", value: O.D3D11_BLEND_OP_MAX }
].map(toStateValue);
const s_fillModeValues = [
    { name: "WIREFRAME", value: D3D11_FILL_MODE.D3D11_FILL_WIREFRAME },
    { name: "SOLID", value: D3D11_FILL_MODE.D3D11_FILL_SOLID }
].map(toStateValue);
// This was an elegant way to convert effects from LH to RH
const s_cullModeValues = [
    { name: "NONE", value: D3DCULL.D3DCULL_NONE },
    { name: "CW", value: D3DCULL.D3DCULL_CCW },
    { name: "CCW", value: D3DCULL.D3DCULL_CW }
].map(toStateValue);
const s_colorWriteValues = [
    { name: "RED", value: D3DCOLORWRITEENABLE_RED },
    { name: "GREEN", value: D3DCOLORWRITEENABLE_GREEN },
    { name: "BLUE", value: D3DCOLORWRITEENABLE_BLUE },
    { name: "ALPHA", value: D3DCOLORWRITEENABLE_ALPHA },
    { name: "false", value: 0 },
    { name: "true", value: 0xf }
].map(toStateValue);
const s_boolValues = [
    { name: "true", value: 1 },
    { name: "false", value: 0 }
].map(toStateValue);
const s_shaderValues = [
    { name: "NULL", value: 0 }
].map(toStateValue);

/**
 * Carbon's `g_renderStateNames`: FX render state name to `D3DRENDERSTATETYPE`
 * code, plus the shader stages' pseudo-codes.
 */
export const g_renderStateNames = [
    ...[
        "ALPHATESTENABLE", "SRCBLEND", "DESTBLEND", "ALPHAREF", "ALPHAFUNC", "ALPHABLENDENABLE", "BLENDOP", "ZENABLE",
        "ZWRITEENABLE", "ZFUNC", "FILLMODE", "COLORWRITEENABLE", "DEPTHBIAS", "SLOPESCALEDEPTHBIAS", "SRGBWRITEENABLE",
        "SEPARATEALPHABLENDENABLE", "BLENDOPALPHA", "SRCBLENDALPHA", "DESTBLENDALPHA", "COLORWRITEENABLE1",
        "COLORWRITEENABLE2", "COLORWRITEENABLE3", "CULLMODE"
    ].map(name => ({ name, value: D3DRS[`D3DRS_${name}`] })),
    { name: "vertexshader", value: 0xffffffff - 1 },
    { name: "pixelshader", value: 0xffffffff - 2 },
    { name: "computeshader", value: 0xffffffff - 3 },
    { name: "geometryshader", value: 0xffffffff - 4 },
    { name: "hullshader", value: 0xffffffff - 5 },
    { name: "domainshader", value: 0xffffffff - 6 }
].map(toStateValue);

/**
 * Carbon's `g_samplerStates`. `field` stands for Carbon's offset into
 * `Sampler`; `MaxMipLevel` writes `minLOD`, as Carbon's offset does.
 */
export const g_samplerStates = [
    { stateName: "AddressU", type: SVT_BYTE, stateValues: s_addressValues, field: "addressU" },
    { stateName: "AddressV", type: SVT_BYTE, stateValues: s_addressValues, field: "addressV" },
    { stateName: "AddressW", type: SVT_BYTE, stateValues: s_addressValues, field: "addressW" },
    { stateName: "BorderColor", type: SVT_COLOR, stateValues: null, field: "borderColor" },
    { stateName: "MagFilter", type: SVT_BYTE, stateValues: s_filterValues, field: "magFilter" },
    { stateName: "MinFilter", type: SVT_BYTE, stateValues: s_filterValues, field: "minFilter" },
    { stateName: "MipFilter", type: SVT_BYTE, stateValues: s_filterValues, field: "mipFilter" },
    { stateName: "Filter", type: SVT_BYTE, stateValues: s_filter11Values, field: "filter" },
    { stateName: "MaxAnisotropy", type: SVT_BYTE, stateValues: null, field: "maxAnisotropy" },
    { stateName: "MaxMipLevel", type: SVT_FLOAT, stateValues: null, field: "minLOD" },
    { stateName: "MinLOD", type: SVT_FLOAT, stateValues: null, field: "minLOD" },
    { stateName: "MaxLOD", type: SVT_FLOAT, stateValues: null, field: "maxLOD" },
    { stateName: "MipMapLodBias", type: SVT_FLOAT, stateValues: null, field: "mipLODBias" },
    { stateName: "ComparisonFunc", type: SVT_BYTE, stateValues: s_comparisonValues, field: "comparisonFunc" },
    { stateName: "SRGBTexture", type: SVT_BOOL, stateValues: s_boolValues, field: "srgbTexture" },
    { stateName: "IsDynamic", type: SVT_BOOL, stateValues: s_boolValues, field: "isDynamic" }
].map(toStateDescription);

/**
 * Carbon's `g_renderStates`. Each writes the field `value`.
 */
export const g_renderStates = [
    ["AlphaTestEnable", SVT_BOOL, s_boolValues],
    ["SrcBlend", SVT_DWORD, s_blendValues],
    ["DestBlend", SVT_DWORD, s_blendValues],
    ["AlphaRef", SVT_DWORD, null],
    ["AlphaFunc", SVT_DWORD, s_comparisonValues],
    ["AlphaBlendEnable", SVT_BOOL, s_boolValues],
    ["BlendOp", SVT_DWORD, s_blendOpValues],
    ["ZEnable", SVT_BOOL, s_boolValues],
    ["ZWriteEnable", SVT_BOOL, s_boolValues],
    ["ZFunc", SVT_DWORD, s_comparisonValues],
    ["FillMode", SVT_DWORD, s_fillModeValues],
    ["ColorWriteEnable", SVT_DWORD, s_colorWriteValues],
    ["DepthBias", SVT_FLOAT, null],
    ["SlopeScaleDepthBias", SVT_FLOAT, null],
    ["SRGBWriteEnable", SVT_BOOL, s_boolValues],
    ["SeparateAlphaBlendEnable", SVT_BOOL, s_boolValues],
    ["BlendOpAlpha", SVT_DWORD, s_blendOpValues],
    ["SrcBlendAlpha", SVT_DWORD, s_blendValues],
    ["DestBlendAlpha", SVT_DWORD, s_blendValues],
    // Bug (FXAnalyzer.cpp:338-340; Carbon known defect CE-78): the extra render
    // targets' write masks are typed as booleans, so `ColorWriteEnable1 = 7;`
    // stores 1 (red only) and `RED | GREEN` is rejected.
    ["ColorWriteEnable1", SVT_BOOL, s_boolValues],
    ["ColorWriteEnable2", SVT_BOOL, s_boolValues],
    ["ColorWriteEnable3", SVT_BOOL, s_boolValues],
    ["CullMode", SVT_DWORD, s_cullModeValues],
    ["LocalViewer", SVT_BOOL, s_boolValues],

    ["vertexshader", SVT_DWORD, s_shaderValues],
    ["pixelshader", SVT_DWORD, s_shaderValues],
    ["computeshader", SVT_DWORD, s_shaderValues],
    ["geometryshader", SVT_DWORD, s_shaderValues],
    ["hullshader", SVT_DWORD, s_shaderValues],
    ["domainshader", SVT_DWORD, s_shaderValues]
].map(([stateName, type, stateValues]) => toStateDescription({ stateName, type, stateValues, field: "value" }));

/**
 * C `_stricmp( a, b ) == 0`.
 *
 * @param {string} a First string.
 * @param {string} b Second string.
 * @returns {boolean} Whether they match ignoring ASCII case.
 */
function stricmpEqual(a, b)
{
    return InlineString.iEquals__Chars(InlineString.makeInlineString(a), b);
}

/**
 * An element whose `intValue` is set, as Carbon's
 * `ExpressionValueElement element; element.intValue = ...;` sequences are.
 *
 * @param {number} intValue The value, as a C `long`.
 * @returns {ExpressionValueElement} The element.
 */
function intElement(intValue)
{
    const element = new ExpressionValueElement();
    element.intValue = intValue | 0;
    return element;
}

/**
 * An element whose `floatValue` is set.
 *
 * @param {number} floatValue The value.
 * @returns {ExpressionValueElement} The element.
 */
function floatElement(floatValue)
{
    const element = new ExpressionValueElement();
    element.floatValue = floatValue;
    return element;
}

/**
 * Reads an element's numeric member, throwing where Carbon would read an
 * indeterminate one.
 *
 * Bug (FXAnalyzer.cpp:657-1050; Carbon known defect CE-75): the binary
 * operators pick the operation by the left operand's type, so an int on the
 * left reads the right operand's `intValue` after both were cast to float,
 * and a float constant never set it. The result is indeterminate in Carbon.
 *
 * @param {number|undefined} member `intValue` or `floatValue`.
 * @returns {number} The member.
 */
function read(member)
{
    if (member === undefined)
    {
        throw new RangeError("FXAnalyzer: read of an uninitialised ExpressionValueElement member (Carbon known defect CE-75)");
    }
    return member;
}

/**
 * Indexes a constant's components, throwing where Carbon reads outside its
 * `std::vector`.
 *
 * @param {ExpressionValueElement[]} value The components.
 * @param {number} index The component index.
 * @param {string} defect The Carbon known defect that lets the index through.
 * @returns {ExpressionValueElement} The component.
 */
function component(value, index, defect)
{
    if (!(index >= 0 && index < value.length))
    {
        throw new RangeError(`FXAnalyzer: component ${index} of a ${value.length}-component constant (Carbon known defect ${defect})`);
    }
    return value[index];
}

/**
 * Carbon's file-local `CastExpressionElementValue`: int to float and float to
 * int only.
 *
 * Bug (FXAnalyzer.cpp:378; Carbon known defect CE-84): `int( floatValue )` is
 * undefined when the truncated value does not fit a 32-bit `int`, NaN
 * included, so that throws here.
 *
 * @param {ExpressionValueElement} value Converted in place.
 * @param {number} from Source type token.
 * @param {number} to Target type token.
 * @returns {boolean} Whether the conversion exists.
 */
function CastExpressionElementValue(value, from, to)
{
    if (from === to)
    {
        return true;
    }
    switch (from)
    {
        case T.OP_INT:
            if (to === T.OP_FLOAT)
            {
                value.floatValue = read(value.intValue);
                return true;
            }
            return false;
        case T.OP_FLOAT:
            if (to === T.OP_INT)
            {
                const truncated = Math.trunc(read(value.floatValue));
                if (!(truncated >= -2147483648 && truncated <= 2147483647))
                {
                    throw new RangeError(`FXAnalyzer: ${value.floatValue} does not convert to int (Carbon known defect CE-84)`);
                }
                value.intValue = truncated;
                return true;
            }
            return false;
    }
    return false;
}

/**
 * Carbon's `CastExpressionValue`: converts a constant to another shape and
 * component type; a scalar broadcasts.
 *
 * @param {ExpressionValueElement[]} value Converted in place.
 * @param {Type} from Its type.
 * @param {Type} to The target type.
 * @returns {boolean} Whether the cast is possible.
 */
export function CastExpressionValue(value, from, to)
{
    if (from.Equals(to))
    {
        return true;
    }

    if (from.width === 1 && from.height === 1)
    {
        if (from.builtInType !== to.builtInType)
        {
            if (!CastExpressionElementValue(value[0], from.builtInType, to.builtInType))
            {
                return false;
            }
        }
        const element = value[0];
        const size = to.width * to.height;
        if (value.length > size)
        {
            value.length = size;
        }
        while (value.length < size)
        {
            value.push(element.Copy());
        }
        return true;
    }

    if (to.width > from.width || to.height > from.height)
    {
        return false;
    }

    const result = [];
    for (let j = 0; j < to.height; ++j)
    {
        for (let i = 0; i < to.width; ++i)
        {
            const element = value[Math.min(j, from.height) * from.width + Math.min(i, from.width)].Copy();
            if (from.builtInType !== to.builtInType)
            {
                if (!CastExpressionElementValue(element, from.builtInType, to.builtInType))
                {
                    return false;
                }
            }
            result.push(element);
        }
    }
    value.length = 0;
    for (const element of result)
    {
        value.push(element);
    }
    return true;
}

/**
 * Carbon's file-local `GetElementType`: the type of element `index` of an
 * initializer. For a struct the test is `index <= count`, as Carbon writes it.
 *
 * Bug (FXAnalyzer.cpp:456, :466-470, :1189, :1195; Carbon known defect CE-74): a matrix
 * row is tested as `int( index ) >= height`, so a negative index passes, and
 * any index of a vector or scalar passes. The caller then reads outside the
 * value.
 *
 * @param {Type} type The aggregate type.
 * @param {number} index Element index, as Carbon's `unsigned`.
 * @param {Type} elementType Filled with the element type.
 * @returns {boolean} Whether the element exists.
 */
function GetElementType(type, index, elementType)
{
    if (type.symbol)
    {
        if (!type.symbol.definition)
        {
            return false;
        }
        const definition = type.symbol.definition;
        for (let i = 0; i < definition.GetChildrenCount(); ++i)
        {
            if (index <= definition.GetChild(i).GetChildrenCount())
            {
                elementType.Assign(definition.GetChild(i).GetType());
                return true;
            }
            index = (index - definition.GetChild(i).GetChildrenCount()) >>> 0;
        }
        return false;
    }
    if (type.height > 1)
    {
        if ((index | 0) >= type.height)
        {
            return false;
        }
        elementType.Assign(type);
        elementType.height = 1;
        return true;
    }
    elementType.Assign(type);
    elementType.height = 1;
    elementType.width = 1;
    return true;
}

/**
 * Carbon's `EvaluateInitializer`: evaluates an initializer against the type
 * it initialises. An inline constructor `{ ... }` must supply exactly
 * `width * height` components.
 *
 * @param {import("../ParserState/ParserState.js").ParserState} state Reports errors.
 * @param {import("../ASTNode/ASTNode.js").ASTNode} node The initializer.
 * @param {Type} type The expected type; `symbol` is cleared.
 * @param {ExpressionValueElement[]} value Receives the components.
 * @param {StateValue[]|null} stateValues Named constants, for state assignments.
 * @returns {boolean} False after reporting an error.
 */
export function EvaluateInitializer(state, node, type, value, stateValues)
{
    type.symbol = null;
    if (node.GetNodeType() === NT_INLINE_CONSTRUCTOR)
    {
        let elements = type.width * type.height;

        for (let i = 0; i < node.GetChildrenCount(); ++i)
        {
            const childType = new Type();
            const childValue = [];
            if (!EvaluateExpression(state, node.GetChild(i), childType, childValue, stateValues))
            {
                return false;
            }

            const newChildType = childType.Copy();
            newChildType.builtInType = type.builtInType;
            if (!CastExpressionValue(childValue, childType, newChildType))
            {
                state.ShowMessage__Location(node.GetToken().fileLocation, ParserState.ErrorCode.EC_INVALID_IMPLICIT_CAST);
                return false;
            }

            for (let j = 0; j < childType.width * childType.height; ++j)
            {
                value.push(childValue[j]);
                if (elements === 0)
                {
                    state.ShowMessage__Location(node.GetToken().fileLocation, ParserState.ErrorCode.EC_INCORRECT_NUMBER_OF_ARGS);
                    return false;
                }
                elements--;
            }
        }
        if (elements > 0)
        {
            state.ShowMessage__Location(node.GetToken().fileLocation, ParserState.ErrorCode.EC_INCORRECT_NUMBER_OF_ARGS);
            return false;
        }
    }
    else
    {
        const exprType = new Type();
        if (!EvaluateExpression(state, node, exprType, value, stateValues))
        {
            return false;
        }
        if (!exprType.Equals(type))
        {
            if (!CastExpressionValue(value, exprType, type))
            {
                state.ShowMessage__Location(node.GetLocation(), ParserState.ErrorCode.EC_TYPE_MISMATCH);
                return false;
            }
        }
    }
    return true;
}

/**
 * The element-wise binary operators of `EvaluateExpression`, by token, for
 * int and float operands; Carbon spells each out as its own `case`. A missing
 * kind is unsupported; `mismatch` operators report `EC_OPERATOR_TYPE_MISMATCH`
 * for floats before the unsupported-type error, as Carbon's case fall-through
 * does. Comparisons of floats produce ints.
 */
const BINARY = new Map([
    [T.OP_STAR, { int: (a, b) => Math.imul(a, b), float: (a, b) => a * b }],
    [T.OP_SLASH, { int: (a, b) => cDivide(a, b), float: (a, b) => a / b }],
    [T.OP_PERCENT, { int: (a, b) => cRemainder(a, b), float: (a, b) => a % b }],
    [T.OP_PLUS, { int: (a, b) => a + b, float: (a, b) => a + b }],
    [T.OP_DASH, { int: (a, b) => a - b, float: (a, b) => a - b }],
    [T.OP_LEFT_OP, { int: (a, b) => a << b, mismatch: true }],
    [T.OP_RIGHT_OP, { int: (a, b) => a >> b, mismatch: true }],
    [T.OP_LESS, { int: (a, b) => (a < b ? 1 : 0), compare: (a, b) => a < b }],
    [T.OP_MORE, { int: (a, b) => (a > b ? 1 : 0), compare: (a, b) => a > b }],
    [T.OP_LE_OP, { int: (a, b) => (a <= b ? 1 : 0), compare: (a, b) => a <= b }],
    [T.OP_GE_OP, { int: (a, b) => (a >= b ? 1 : 0), compare: (a, b) => a >= b }],
    [T.OP_EQ_OP, { int: (a, b) => (a === b ? 1 : 0), compare: (a, b) => a === b }],
    [T.OP_NE_OP, { int: (a, b) => (a !== b ? 1 : 0), compare: (a, b) => a !== b }],
    [T.OP_AMPERSAND, { int: (a, b) => a & b, mismatch: true }],
    [T.OP_CARET, { int: (a, b) => a ^ b, mismatch: true }],
    [T.OP_VERTICAL_BAR, { int: (a, b) => a | b, mismatch: true }],
    [T.OP_AND_OP, { int: (a, b) => (a && b ? 1 : 0), compare: (a, b) => a !== 0 && b !== 0 }],
    [T.OP_OR_OP, { int: (a, b) => (a || b ? 1 : 0), compare: (a, b) => a !== 0 || b !== 0 }]
]);

const SIDE_EFFECT_OPERATORS = new Set([
    T.OP_EQUAL, T.OP_MUL_ASSIGN, T.OP_DIV_ASSIGN, T.OP_MOD_ASSIGN, T.OP_ADD_ASSIGN, T.OP_SUB_ASSIGN,
    T.OP_LEFT_ASSIGN, T.OP_RIGHT_ASSIGN, T.OP_AND_ASSIGN, T.OP_XOR_ASSIGN, T.OP_OR_ASSIGN
]);

/**
 * C `long` division, which truncates.
 *
 * Bug (FXAnalyzer.cpp:689, :712; Carbon known defect CE-84): nothing checks
 * the divisor, and x64 `idiv` traps on zero and on `LONG_MIN / -1`, so both
 * throw here.
 *
 * @param {number} a Dividend.
 * @param {number} b Divisor.
 * @returns {number} The quotient.
 */
function cDivide(a, b)
{
    if (b === 0 || (a === -2147483648 && b === -1))
    {
        throw new RangeError(`FXAnalyzer: ${a} / ${b} traps in a constant expression (Carbon known defect CE-84)`);
    }
    return Math.trunc(a / b);
}

/**
 * C `long` remainder; traps as `cDivide` does.
 *
 * @param {number} a Dividend.
 * @param {number} b Divisor.
 * @returns {number} The remainder.
 */
function cRemainder(a, b)
{
    if (b === 0 || (a === -2147483648 && b === -1))
    {
        throw new RangeError(`FXAnalyzer: ${a} % ${b} traps in a constant expression (Carbon known defect CE-84)`);
    }
    return a % b;
}

/**
 * Carbon's `EvaluateExpression`: the value of a constant expression, for
 * state assignments, sampler states, annotations and array sizes. Variables
 * read their initializers; function calls other than type constructors are
 * rejected; only int and float arithmetic is supported.
 *
 * @param {import("../ParserState/ParserState.js").ParserState} state Reports errors.
 * @param {import("../ASTNode/ASTNode.js").ASTNode|null} node The expression.
 * @param {Type} type Filled with the value's type.
 * @param {ExpressionValueElement[]} value Receives the components.
 * @param {StateValue[]|null} stateValues Named constants allowed as bare identifiers.
 * @returns {boolean} False after reporting an error.
 */
export function EvaluateExpression(state, node, type, value, stateValues)
{
    if (!node)
    {
        return false;
    }

    type.symbol = null;
    switch (node.GetNodeType())
    {
        case NT_CONSTANT:
            switch (node.GetToken().type)
            {
                case T.OP_INT_CONST:
                    type.FromTokenType(T.OP_INT);
                    value.push(intElement(ParseNumber(node.GetToken().stringValue)));
                    return true;
                case T.OP_BOOL_CONST:
                    type.FromTokenType(T.OP_INT);
                    value.push(intElement(node.GetToken().intValue !== 0 ? 1 : 0));
                    return true;
                case T.OP_FLOAT_CONST:
                    type.FromTokenType(T.OP_FLOAT);
                    value.push(floatElement(ParseFloat(node.GetToken().stringValue)));
                    return true;
                case T.OP_STRING_CONST:
                {
                    type.FromTokenType(T.OP_STRING);
                    const element = new ExpressionValueElement();
                    element.stringValue = ParseString(node.GetToken().stringValue);
                    value.push(element);
                    return true;
                }
            }
            return false;
        case NT_VAR_IDENTIFIER:
        {
            if (node.GetSymbol().definition === null)
            {
                state.ShowMessage__Location(node.GetLocation(), ParserState.ErrorCode.EC_UNINITIALIZED_VAR, node.GetSymbol().name.ToString());
                return false;
            }
            const definition = node.GetSymbol().definition;
            if (definition.GetChildOrNull(1) === null)
            {
                state.ShowMessage__Location(definition.GetToken().fileLocation, ParserState.ErrorCode.EC_UNINITIALIZED_VAR, definition.GetSymbol().name.ToString());
                return false;
            }
            type.Assign(node.GetSymbol().type);
            return EvaluateInitializer(state, definition.GetChildOrNull(1), type, value, null);
        }
        case NT_STATE_VALUE:
            if (stateValues)
            {
                const name = node.GetToken().stringValue.ToString();
                for (const stateValue of stateValues)
                {
                    if (stricmpEqual(name, stateValue.name))
                    {
                        type.Assign(new Type());
                        type.FromTokenType(T.OP_INT);
                        value.push(intElement(stateValue.value));
                        return true;
                    }
                }
            }
            state.ShowMessage__Location(node.GetToken().fileLocation, ParserState.ErrorCode.EC_INVALID_STATE_VALUE, node.GetToken().stringValue.ToString());
            return false;
        case NT_EXPRESSION:
        {
            // Bug (Carbon known defect CE-75): the operation is chosen by
            // the left operand's type, not the common type both operands were
            // cast to, as Carbon's `switch( leftType.builtInType )` is.
            const token = node.GetToken();
            if (token.type === 0)
            {
                return EvaluateExpression(state, node.GetChild(0), type, value, stateValues);
            }
            const left = [];
            const right = [];
            const leftType = new Type();
            const rightType = new Type();
            // Quirk (FXAnalyzer.cpp:615-627, HLSLParser.y:178-183; Carbon known
            // defect CE-96): a parenthesised expression is an NT_EXPRESSION
            // with the `(` token and one child, so it fails here without a
            // message. `float a[(8)];` gets the default size, 0, and a state
            // assignment such as `CullMode = (NONE);` is dropped.
            if (node.GetChildrenCount() < 2)
            {
                return false;
            }
            if (!EvaluateExpression(state, node.GetChild(0), leftType, left, stateValues))
            {
                return false;
            }
            if (!EvaluateExpression(state, node.GetChild(1), rightType, right, stateValues))
            {
                return false;
            }
            if (leftType.symbol || rightType.symbol)
            {
                state.ShowMessage__Location(token.fileLocation, ParserState.ErrorCode.EC_STRUCTS_NOT_SUPPORTED);
                return false;
            }
            if (!Type.getCommonType(leftType, rightType, type))
            {
                state.ShowMessage__Location(token.fileLocation, ParserState.ErrorCode.EC_INVALID_IMPLICIT_CAST);
                return false;
            }

            CastExpressionValue(left, leftType, type);
            CastExpressionValue(right, rightType, type);

            if (SIDE_EFFECT_OPERATORS.has(token.type))
            {
                state.ShowMessage__Location(token.fileLocation, ParserState.ErrorCode.EC_SIDE_EFFECT_IN_STATE_ASSIGMENT, token.stringValue.ToString());
                return true;
            }
            if (token.type === T.OP_COMA)
            {
                for (const element of right)
                {
                    value.push(element);
                }
                return true;
            }
            const operator = BINARY.get(token.type);
            if (!operator)
            {
                state.ShowMessage__Location(token.fileLocation, ParserState.ErrorCode.EC_OPERATOR_NOT_SUPPORTED);
                return false;
            }
            switch (leftType.builtInType)
            {
                case T.OP_INT:
                    for (let i = 0; i < left.length; ++i)
                    {
                        value.push(intElement(operator.int(read(left[i].intValue), read(right[i].intValue))));
                    }
                    return true;
                case T.OP_FLOAT:
                    if (operator.float)
                    {
                        for (let i = 0; i < left.length; ++i)
                        {
                            value.push(floatElement(operator.float(read(left[i].floatValue), read(right[i].floatValue))));
                        }
                        return true;
                    }
                    if (operator.compare)
                    {
                        type.builtInType = T.OP_INT;
                        for (let i = 0; i < left.length; ++i)
                        {
                            value.push(intElement(operator.compare(read(left[i].floatValue), read(right[i].floatValue)) ? 1 : 0));
                        }
                        return true;
                    }
                    state.ShowMessage__Location(token.fileLocation, ParserState.ErrorCode.EC_OPERATOR_TYPE_MISMATCH, token.stringValue.ToString());
                // falls through
                default:
                    state.ShowMessage__Location(token.fileLocation, ParserState.ErrorCode.EC_UNSUPPORTED_TYPE, leftType.ToString());
                    return false;
            }
        }
        case NT_PREFIX_EXPRESSION:
        {
            const left = [];
            if (!EvaluateExpression(state, node.GetChild(0), type, left, stateValues))
            {
                return false;
            }
            const token = node.GetToken();
            switch (token.type)
            {
                case T.OP_INC_OP:
                case T.OP_DEC_OP:
                    state.ShowMessage__Location(token.fileLocation, ParserState.ErrorCode.EC_SIDE_EFFECT_IN_STATE_ASSIGMENT, token.stringValue.ToString());
                    return false;
                case T.OP_DASH:
                    switch (type.builtInType)
                    {
                        case T.OP_INT:
                            left.forEach(element => value.push(intElement(-read(element.intValue))));
                            return true;
                        case T.OP_FLOAT:
                            left.forEach(element => value.push(floatElement(-read(element.floatValue))));
                            return true;
                        default:
                            state.ShowMessage__Location(token.fileLocation, ParserState.ErrorCode.EC_UNSUPPORTED_TYPE, type.ToString());
                            return false;
                    }
                case T.OP_BANG:
                    switch (type.builtInType)
                    {
                        case T.OP_INT:
                            left.forEach(element => value.push(intElement(read(element.intValue) ? 0 : 1)));
                            return true;
                        case T.OP_FLOAT:
                            left.forEach(element => value.push(floatElement(read(element.floatValue) === 0 ? 1 : 0)));
                            return true;
                        default:
                            state.ShowMessage__Location(token.fileLocation, ParserState.ErrorCode.EC_UNSUPPORTED_TYPE, type.ToString());
                            return false;
                    }
                case T.OP_TILDE:
                    switch (type.builtInType)
                    {
                        case T.OP_INT:
                            left.forEach(element => value.push(intElement(~read(element.intValue))));
                            return true;
                        case T.OP_FLOAT:
                            state.ShowMessage__Location(token.fileLocation, ParserState.ErrorCode.EC_OPERATOR_TYPE_MISMATCH, token.stringValue.ToString());
                        // falls through
                        default:
                            state.ShowMessage__Location(token.fileLocation, ParserState.ErrorCode.EC_UNSUPPORTED_TYPE, type.ToString());
                            return false;
                    }
                default:
                    state.ShowMessage__Location(token.fileLocation, ParserState.ErrorCode.EC_OPERATOR_NOT_SUPPORTED);
                    return false;
            }
        }
        case NT_POSTFIX_EXPRESSION:
        {
            // Bug (FXAnalyzer.cpp:1332; Carbon known defect CE-69): a vector
            // swizzle accepts a component index equal to the width
            // (`index > width`); the matrix form checks neither digit against
            // the matrix's size, and a one-based column not at all. Carbon
            // reads outside the value there; here that throws.
            //
            // Bug (FXAnalyzer.cpp:1189, :1300; Carbon known defect CE-76):
            // components are read at `row * width + column`, but the scanner
            // stores a `floatRxC`'s rows in `width` (HLSLScanner.re:831), so a
            // non-square matrix reads the wrong components.
            const leftType = new Type();
            const left = [];
            if (!EvaluateExpression(state, node.GetChild(0), leftType, left, stateValues))
            {
                return false;
            }
            const token = node.GetToken();
            switch (token.type)
            {
                case T.OP_LEFT_BRACKET:
                {
                    const indexType = new Type();
                    indexType.FromTokenType(T.OP_INT);
                    const index = [];
                    const oldIndexType = new Type();
                    if (!EvaluateExpression(state, node.GetChild(1), oldIndexType, index, stateValues))
                    {
                        return false;
                    }
                    if (!CastExpressionValue(index, oldIndexType, indexType))
                    {
                        state.ShowMessage__Location(token.fileLocation, ParserState.ErrorCode.EC_INT_TYPE_REQUIRED);
                        return false;
                    }
                    const at = read(index[0].intValue);
                    if (!GetElementType(leftType, at >>> 0, type))
                    {
                        state.ShowMessage__Location(token.fileLocation, ParserState.ErrorCode.EC_INDEX_OUT_OF_RANGE, at);
                        return false;
                    }
                    type.Assign(leftType);
                    if (leftType.height > 1)
                    {
                        for (let i = 0; i < leftType.width; ++i)
                        {
                            value.push(component(left, at * leftType.width + i, "CE-74"));
                        }
                        type.height = 1;
                    }
                    else
                    {
                        value.push(component(left, at, "CE-74"));
                        type.width = 1;
                        type.height = 1;
                    }
                    return true;
                }
                case T.OP_ID:
                {
                    if (leftType.symbol)
                    {
                        state.ShowMessage__Location(token.fileLocation, ParserState.ErrorCode.EC_STRUCTS_NOT_SUPPORTED);
                        return false;
                    }
                    type.Assign(leftType);
                    const member = token.stringValue;
                    const swizzleError = () =>
                    {
                        state.ShowMessage__Location(token.fileLocation, ParserState.ErrorCode.EC_INVALID_SWIZZLE, member.ToString());
                        return false;
                    };
                    const at = c => member.CharAt(c);
                    if (leftType.height !== 1)
                    {
                        type.height = 1;
                        type.width = 0;
                        let swizzleSet = -1;
                        for (let c = member.start; c !== member.end; ++c)
                        {
                            if (at(c) !== 95)
                            {
                                return swizzleError();
                            }
                            ++c;
                            if (c === member.end)
                            {
                                return swizzleError();
                            }
                            if (at(c) === 109)
                            {
                                if (swizzleSet === -1)
                                {
                                    swizzleSet = 1;
                                }
                                else if (swizzleSet === 0)
                                {
                                    return swizzleError();
                                }
                                ++c;
                                if (c === member.end)
                                {
                                    return swizzleError();
                                }
                            }
                            else
                            {
                                if (swizzleSet === -1)
                                {
                                    swizzleSet = 0;
                                }
                                else if (swizzleSet === 1)
                                {
                                    return swizzleError();
                                }
                            }
                            if (at(c) < 48 || at(c) > 52)
                            {
                                return swizzleError();
                            }
                            let row = at(c) - 48;
                            if (swizzleSet === 0)
                            {
                                if (row === 0)
                                {
                                    return swizzleError();
                                }
                                --row;
                            }
                            else if (row >= 4)
                            {
                                return swizzleError();
                            }
                            ++c;
                            if (c === member.end)
                            {
                                return swizzleError();
                            }
                            let column = at(c) - 48;
                            if (swizzleSet === 0)
                            {
                                if (column === 0)
                                {
                                    return swizzleError();
                                }
                                --column;
                            }
                            else if (column >= 4)
                            {
                                return swizzleError();
                            }
                            type.width++;
                            value.push(component(left, row * leftType.width + column, "CE-69"));
                        }
                    }
                    else
                    {
                        const swizzle = ["xyzw", "rgba"];
                        let swizzleIndex = -1;
                        for (let c = member.start; c !== member.end; ++c)
                        {
                            const ch = String.fromCharCode(at(c));
                            if (swizzleIndex === -1)
                            {
                                swizzleIndex = swizzle.findIndex(set => set.includes(ch));
                                if (swizzleIndex === -1)
                                {
                                    return swizzleError();
                                }
                            }
                            const index = swizzle[swizzleIndex].indexOf(ch);
                            if (index < 0)
                            {
                                return swizzleError();
                            }
                            if (index > leftType.width)
                            {
                                return swizzleError();
                            }
                            value.push(component(left, index, "CE-69"));
                        }
                        type.width = member.end - member.start;
                        type.height = 1;
                    }
                    return true;
                }
                case T.OP_INC_OP:
                case T.OP_DEC_OP:
                    state.ShowMessage__Location(token.fileLocation, ParserState.ErrorCode.EC_SIDE_EFFECT_IN_STATE_ASSIGMENT, token.stringValue.ToString());
                    return false;
                default:
                    state.ShowMessage__Location(token.fileLocation, ParserState.ErrorCode.EC_OPERATOR_NOT_SUPPORTED);
                    return false;
            }
        }
        case NT_CAST_EXPRESSION:
        {
            if (node.GetType().symbol)
            {
                state.ShowMessage__Location(node.GetToken().fileLocation, ParserState.ErrorCode.EC_STRUCTS_NOT_SUPPORTED);
                return false;
            }
            const leftType = new Type();
            if (!EvaluateExpression(state, node.GetChild(0), leftType, value, stateValues))
            {
                return false;
            }
            type.Assign(node.GetType());
            switch (type.builtInType)
            {
                case T.OP_BOOL:
                case T.OP_INT:
                case T.OP_UINT:
                    type.builtInType = T.OP_INT;
                    break;
                case T.OP_HALF:
                case T.OP_FLOAT:
                case T.OP_DOUBLE:
                    type.builtInType = T.OP_FLOAT;
                    break;
                default:
                    state.ShowMessage__Location(node.GetToken().fileLocation, ParserState.ErrorCode.EC_UNSUPPORTED_TYPE, node.GetToken().stringValue.ToString());
                    return false;
            }
            return CastExpressionValue(value, leftType, type);
        }
        case NT_CONDITIONAL_EXPRESSION:
        {
            const cond = [];
            const left = [];
            const right = [];
            const condType = new Type();
            const leftType = new Type();
            const rightType = new Type();
            const token = node.GetToken();
            if (!EvaluateExpression(state, node.GetChild(0), condType, cond, stateValues))
            {
                return false;
            }
            if (!EvaluateExpression(state, node.GetChild(1), leftType, left, stateValues))
            {
                return false;
            }
            if (!EvaluateExpression(state, node.GetChild(2), rightType, right, stateValues))
            {
                return false;
            }
            if (condType.symbol || leftType.symbol || rightType.symbol)
            {
                state.ShowMessage__Location(token.fileLocation, ParserState.ErrorCode.EC_STRUCTS_NOT_SUPPORTED);
                return false;
            }
            if (!Type.getCommonType(leftType, rightType, type))
            {
                state.ShowMessage__Location(token.fileLocation, ParserState.ErrorCode.EC_INVALID_IMPLICIT_CAST);
                return false;
            }
            // Carbon passes `type` as both an input and the output; the result
            // depends on that aliasing, so it is kept.
            if (!Type.getCommonType(condType, type, type))
            {
                state.ShowMessage__Location(token.fileLocation, ParserState.ErrorCode.EC_INVALID_IMPLICIT_CAST);
                return false;
            }
            if (!CastExpressionValue(cond, condType, type) || !CastExpressionValue(left, leftType, type) || !CastExpressionValue(right, rightType, type))
            {
                state.ShowMessage__Location(token.fileLocation, ParserState.ErrorCode.EC_INVALID_IMPLICIT_CAST);
                return false;
            }
            for (let i = 0; i < cond.length; ++i)
            {
                if (type.builtInType === T.OP_INT)
                {
                    value.push(read(cond[i].intValue) ? left[i] : right[i]);
                }
                else if (type.builtInType === T.OP_FLOAT)
                {
                    value.push(read(cond[i].floatValue) !== 0 ? left[i] : right[i]);
                }
            }
            return true;
        }
        case NT_FUNCTION_CALL:
        {
            if (node.GetSymbol())
            {
                state.ShowMessage__Location(node.GetToken().fileLocation, ParserState.ErrorCode.EC_FUNCTIONS_NOT_SUPPORTED, node.GetSymbol().name.ToString());
                return false;
            }
            type.Assign(new Type());
            type.FromToken(node.GetToken());
            switch (type.builtInType)
            {
                case T.OP_BOOL:
                case T.OP_INT:
                case T.OP_UINT:
                    type.builtInType = T.OP_INT;
                    break;
                case T.OP_HALF:
                case T.OP_FLOAT:
                case T.OP_DOUBLE:
                    type.builtInType = T.OP_FLOAT;
                    break;
                default:
                    state.ShowMessage__Location(node.GetToken().fileLocation, ParserState.ErrorCode.EC_UNSUPPORTED_TYPE, node.GetToken().stringValue.ToString());
                    return false;
            }

            let elements = type.width * type.height;

            for (let i = 0; i < node.GetChildrenCount(); ++i)
            {
                const childType = new Type();
                const childValue = [];
                if (!EvaluateExpression(state, node.GetChild(i), childType, childValue, stateValues))
                {
                    return false;
                }
                const newChildType = childType.Copy();
                newChildType.builtInType = type.builtInType;
                if (!CastExpressionValue(childValue, childType, newChildType))
                {
                    state.ShowMessage__Location(node.GetToken().fileLocation, ParserState.ErrorCode.EC_INVALID_IMPLICIT_CAST);
                    return false;
                }
                for (let j = 0; j < childType.width * childType.height; ++j)
                {
                    value.push(childValue[j]);
                    if (elements === 0)
                    {
                        state.ShowMessage__Location(node.GetToken().fileLocation, ParserState.ErrorCode.EC_INCORRECT_NUMBER_OF_ARGS);
                        return false;
                    }
                    elements--;
                }
            }
            if (elements > 0)
            {
                state.ShowMessage__Location(node.GetToken().fileLocation, ParserState.ErrorCode.EC_INCORRECT_NUMBER_OF_ARGS);
                return false;
            }
            return true;
        }
        default:
            state.ShowMessage__Location(node.GetLocation(), ParserState.ErrorCode.EC_OPERATOR_NOT_SUPPORTED);
            return false;
    }
}

/**
 * Carbon's `GetStateValue`: evaluates a state's value and writes it.
 *
 * A colour that does not cast to `float4` is read as one `0xAARRGGBB`
 * integer. Bug (FXAnalyzer.cpp:1561-1585; Carbon known defect CE-77): a
 * scalar integer always casts to `float4` by broadcasting, so
 * `BorderColor = 0x00FF0000;` gives four components of 16711680 and only a
 * non-scalar that fails the cast, such as `float3(1,0,0)`, reaches the
 * integer path.
 *
 * A render state's blob is one `DWORD` (EffectCompilerDX11.cpp:1270), which
 * `{ value }` stands for: Carbon writes a float state's bits into it
 * (`DepthBias = 0.5` stores `0x3F000000`), so the float write stores the bits
 * when the field is `value`.
 *
 * @param {import("../ParserState/ParserState.js").ParserState} state Reports errors.
 * @param {import("../ASTNode/ASTNode.js").ASTNode|null} value The value expression.
 * @param {StateDescription} desc The state.
 * @param {object} dataBlob Receives the value in `dataBlob[desc.field]`.
 * @returns {boolean} False after an error.
 */
export function GetStateValue(state, value, desc, dataBlob)
{
    if (value === null)
    {
        return false;
    }
    const expectedType = new Type();
    const type = new Type();
    switch (desc.type)
    {
        case SVT_BYTE:
        case SVT_DWORD:
        case SVT_BOOL:
            expectedType.FromTokenType(T.OP_INT);
            break;
        case SVT_FLOAT:
            expectedType.FromTokenType(T.OP_FLOAT);
            break;
        case SVT_COLOR:
            expectedType.FromTokenType(T.OP_FLOAT);
            expectedType.width = 4;
            break;
    }
    const exprValue = [];

    if (value.GetNodeType() === NT_INLINE_CONSTRUCTOR)
    {
        if (!EvaluateInitializer(state, value, expectedType, exprValue, desc.stateValues))
        {
            return false;
        }
    }
    else
    {
        if (!EvaluateExpression(state, value, type, exprValue, desc.stateValues))
        {
            return false;
        }
        if (!expectedType.Equals(type))
        {
            if (!CastExpressionValue(exprValue, type, expectedType))
            {
                if (desc.type === SVT_COLOR)
                {
                    expectedType.builtInType = T.OP_INT;
                    expectedType.width = 1;
                    if (!CastExpressionValue(exprValue, type, expectedType))
                    {
                        return false;
                    }
                    const f = Math.fround(1 / 255);
                    const dw = read(exprValue[0].intValue) >>> 0;
                    const color = dataBlob[desc.field];
                    color.x = Math.fround(f * ((dw >>> 16) & 0xff));
                    color.y = Math.fround(f * ((dw >>> 8) & 0xff));
                    color.z = Math.fround(f * (dw & 0xff));
                    color.w = Math.fround(f * ((dw >>> 24) & 0xff));
                    return true;
                }
                return false;
            }
        }
    }
    switch (desc.type)
    {
        case SVT_DWORD:
            dataBlob[desc.field] = read(exprValue[0].intValue) >>> 0;
            return true;
        case SVT_BYTE:
            dataBlob[desc.field] = read(exprValue[0].intValue) & 0xff;
            return true;
        case SVT_FLOAT:
            if (desc.field === "value")
            {
                FLOAT_BITS.setFloat32(0, read(exprValue[0].floatValue), true);
                dataBlob[desc.field] = FLOAT_BITS.getUint32(0, true);
            }
            else
            {
                dataBlob[desc.field] = Math.fround(read(exprValue[0].floatValue));
            }
            return true;
        case SVT_BOOL:
            dataBlob[desc.field] = read(exprValue[0].intValue) ? 1 : 0;
            return true;
        case SVT_COLOR:
        {
            const color = dataBlob[desc.field];
            color.x = Math.fround(read(exprValue[0].floatValue));
            color.y = Math.fround(read(exprValue[1].floatValue));
            color.z = Math.fround(read(exprValue[2].floatValue));
            color.w = Math.fround(read(exprValue[3].floatValue));
            return true;
        }
    }
    return false;
}

/**
 * Carbon's `ParseStateAssignment`: finds the state by name, ignoring case,
 * and writes its value.
 *
 * @param {import("../ParserState/ParserState.js").ParserState} parserState Reports errors.
 * @param {import("../ASTNode/ASTNode.js").ASTNode} state An `NT_STATE_ASSIGNMENT` node.
 * @param {StateDescription[]} states `g_samplerStates` or `g_renderStates`.
 * @param {object} dataBlob Receives the value.
 * @returns {boolean} False after an error.
 */
export function ParseStateAssignment(parserState, state, states, dataBlob)
{
    if (state.GetNodeType() !== NT_STATE_ASSIGNMENT)
    {
        return false;
    }
    const name = state.GetToken().stringValue.ToString();
    const value = state.GetChildOrNull(0);
    if (value === null)
    {
        return false;
    }
    for (const desc of states)
    {
        if (stricmpEqual(name, desc.stateName))
        {
            return GetStateValue(parserState, value, desc, dataBlob);
        }
    }
    parserState.ShowMessage__Location(state.GetToken().fileLocation, ParserState.ErrorCode.EC_INVALID_STATE, name);
    return false;
}

/**
 * Carbon's `GetSamplerState`: a sampler's state from its declaration's
 * `sampler_state { ... }` block, or the dynamic default when it has none.
 *
 * @param {import("../ParserState/ParserState.js").ParserState} parserState Reports errors.
 * @param {import("../ASTNode/ASTNode.js").ASTNode} node The sampler's `NT_NAME_DECLARATION`.
 * @param {object} sampler A `Sampler` (EffectData.h), filled in.
 * @returns {boolean} False after an error.
 */
export function GetSamplerState(parserState, node, sampler)
{
    sampler.comparison = 0;
    sampler.minFilter = D3DTEXF.D3DTEXF_LINEAR;
    sampler.magFilter = D3DTEXF.D3DTEXF_LINEAR;
    sampler.mipFilter = D3DTEXF.D3DTEXF_LINEAR;
    sampler.addressU = A.D3D11_TEXTURE_ADDRESS_CLAMP;
    sampler.addressV = A.D3D11_TEXTURE_ADDRESS_CLAMP;
    sampler.addressW = A.D3D11_TEXTURE_ADDRESS_CLAMP;
    sampler.minLOD = -3.4028234663852886e38;
    sampler.maxLOD = 3.4028234663852886e38;
    sampler.mipLODBias = 0;
    sampler.maxAnisotropy = 16;
    sampler.comparisonFunc = C.D3D11_COMPARISON_NEVER;
    sampler.borderColor.x = 0;
    sampler.borderColor.y = 0;
    sampler.borderColor.z = 0;
    sampler.borderColor.w = 0;
    sampler.srgbTexture = 0;
    sampler.isDynamic = 1;

    const states = node.GetChildOrNull(1);
    if (states && states.GetNodeType() === NT_SAMPLER_STATE_LIST)
    {
        sampler.isDynamic = 0;
        sampler.filter = 0xff;
        sampler.minFilter = 0xff;
        sampler.magFilter = 0xff;
        sampler.mipFilter = 0xff;

        for (let k = 0; k < states.GetChildrenCount(); ++k)
        {
            const state = states.GetChild(k);
            const name = state.GetToken().stringValue.ToString();
            if (stricmpEqual(name, "texture"))
            {
                continue;
            }
            if (!ParseStateAssignment(parserState, state, g_samplerStates, sampler))
            {
                return false;
            }
        }
        if (sampler.filter !== 0xff)
        {
            if (D3D11_DECODE_IS_ANISOTROPIC_FILTER(sampler.filter))
            {
                sampler.minFilter = sampler.magFilter = sampler.mipFilter = D3DTEXF.D3DTEXF_ANISOTROPIC;
            }
            else
            {
                sampler.magFilter = D3D11_DECODE_MAG_FILTER(sampler.filter) + 1;
                sampler.minFilter = D3D11_DECODE_MIN_FILTER(sampler.filter) + 1;
                sampler.mipFilter = D3D11_DECODE_MIP_FILTER(sampler.filter) + 1;
            }
            sampler.comparison = D3D11_DECODE_IS_COMPARISON_FILTER(sampler.filter) ? 1 : 0;
        }
        else
        {
            if (sampler.mipFilter === 0xff)
            {
                sampler.mipFilter = D3DTEXF.D3DTEXF_LINEAR;
            }
            if (sampler.minFilter === 0xff)
            {
                sampler.minFilter = D3DTEXF.D3DTEXF_LINEAR;
            }
            if (sampler.magFilter === 0xff)
            {
                sampler.magFilter = D3DTEXF.D3DTEXF_LINEAR;
            }
        }
    }
    return true;
}

/**
 * Carbon's `ConvertToStaticSampler`: a non-dynamic sampler as a static
 * sampler, whose border colour must be transparent black, opaque black or
 * opaque white.
 *
 * @param {object} staticSampler A `StaticSampler` (EffectData.h), filled in.
 * @param {object} sampler The `Sampler`.
 * @returns {boolean} False when the sampler cannot be static.
 */
export function ConvertToStaticSampler(staticSampler, sampler)
{
    if (sampler.isDynamic)
    {
        return false;
    }
    const border = A.D3D11_TEXTURE_ADDRESS_BORDER;
    if (sampler.addressU === border || sampler.addressV === border || sampler.addressW === border)
    {
        const { x, y, z, w } = sampler.borderColor;
        if (x === 0 && y === 0 && z === 0 && w === 0)
        {
            staticSampler.borderColor = 0;
        }
        else if (x === 0 && y === 0 && z === 0 && w === 1)
        {
            staticSampler.borderColor = 1;
        }
        else if (x === 1 && y === 1 && z === 1 && w === 1)
        {
            staticSampler.borderColor = 2;
        }
        else
        {
            return false;
        }
    }
    else
    {
        staticSampler.borderColor = 0;
    }
    staticSampler.comparison = sampler.comparison;
    staticSampler.minFilter = sampler.minFilter;
    staticSampler.magFilter = sampler.magFilter;
    staticSampler.mipFilter = sampler.mipFilter;
    staticSampler.addressU = sampler.addressU;
    staticSampler.addressV = sampler.addressV;
    staticSampler.addressW = sampler.addressW;
    staticSampler.minLOD = sampler.minLOD;
    staticSampler.maxLOD = sampler.maxLOD;
    staticSampler.mipLODBias = sampler.mipLODBias;
    staticSampler.maxAnisotropy = sampler.maxAnisotropy;
    staticSampler.comparisonFunc = sampler.comparisonFunc;
    return true;
}

/**
 * Carbon's `EvaluateIntegerExpression`: an array size or similar integer
 * constant, or a default when the expression is not constant.
 *
 * @param {import("../ParserState/ParserState.js").ParserState} state Reports errors.
 * @param {import("../ASTNode/ASTNode.js").ASTNode|null} node The expression.
 * @param {number} defaultValue Returned when evaluation fails.
 * @returns {number} The value.
 */
export function EvaluateIntegerExpression(state, node, defaultValue)
{
    const type = new Type();
    const value = [];
    if (!EvaluateExpression(state, node, type, value, null))
    {
        return defaultValue;
    }

    const newType = new Type();
    newType.FromTokenType(T.OP_INT);
    if (!CastExpressionValue(value, type, newType))
    {
        state.ShowMessage__Location(node.GetToken().fileLocation, ParserState.ErrorCode.EC_INVALID_IMPLICIT_CAST);
        return defaultValue;
    }
    return read(value[0].intValue) | 0;
}

/**
 * Carbon's `ParseRtShaderName`.
 *
 * @param {InlineString} name A pass state name.
 * @returns {number|null} An `RtShaderType` value, or null.
 */
export function ParseRtShaderName(name)
{
    if (InlineString.equalsCaseInsensitive__Chars(name, "raygenshader"))
    {
        return ShaderExport.RtShaderType.RAY_GEN;
    }
    else if (InlineString.equalsCaseInsensitive__Chars(name, "missshader"))
    {
        return ShaderExport.RtShaderType.MISS;
    }
    else if (InlineString.equalsCaseInsensitive__Chars(name, "closesthitshader"))
    {
        return ShaderExport.RtShaderType.CLOSEST_HIT;
    }
    else if (InlineString.equalsCaseInsensitive__Chars(name, "anyhitshader"))
    {
        return ShaderExport.RtShaderType.ANY_HIT;
    }
    else if (InlineString.equalsCaseInsensitive__Chars(name, "intersectionshader"))
    {
        return ShaderExport.RtShaderType.INTERSECTION;
    }
    return null;
}
