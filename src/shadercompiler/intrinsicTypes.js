// Source: trinity/shadercompiler/IntrinsicTypes.h
//
// Carbon describes each intrinsic's signature with function templates:
// `FunctionDescription2<ResultType, ResultDim, Arg0Type, Arg0Dim, Arg1Type, Arg1Dim>`
// instantiates to a function `(call, argIndex) -> Type`. Here each template is
// a factory taking the same components in the same order and returning that
// function. A type component is `(call) => tokenType`; a dimension component
// is `(call, dims) => void`, filling `dims.width` and `dims.height`.

import { HLSLParserTokens } from "./hlslParserTokens.js";
import { InlineString } from "./InlineString.js";
import { Type } from "./Type.js";
import { SymbolTable } from "./SymbolTable/SymbolTable.js";

const { OP_VOID } = HLSLParserTokens;

/**
 * Carbon's `MulIntrinsicType`: the parameter and result types of `mul`,
 * which depend on whether each operand is a scalar, vector or matrix.
 *
 * @param {import("./ASTNode/ASTNode.js").ASTNode} call The call.
 * @param {number} argIndex Parameter index, or -1 for the result.
 * @returns {Type} The type.
 */
export function MulIntrinsicType(call, argIndex)
{
    const arg0 = call.GetChildOrNull(0);
    const arg1 = call.GetChildOrNull(1);
    if (arg0 === null || arg1 === null)
    {
        return Type.typeFromTokenType(OP_VOID);
    }
    const t0 = arg0.GetType().Copy();
    const t1 = arg1.GetType().Copy();
    if (!t0.IsScalarOrVector() || !t1.IsScalarOrVector())
    {
        return Type.typeFromTokenType(OP_VOID);
    }
    const isScalar0 = t0.width === 1 && t0.height === 1;
    const isScalar1 = t1.width === 1 && t1.height === 1;
    const isVector0 = t0.width > 1 && t0.height === 1;
    const isVector1 = t1.width > 1 && t1.height === 1;
    const isMatrix0 = t0.width > 1 && t0.height > 1;
    const isMatrix1 = t1.width > 1 && t1.height > 1;
    if (Type.getNumericTypePrecedence(t1.builtInType) > Type.getNumericTypePrecedence(t0.builtInType))
    {
        t0.builtInType = t1.builtInType;
    }
    else
    {
        t1.builtInType = t0.builtInType;
    }
    if (isScalar0 && isScalar1)
    {
        return t0;
    }
    if (isScalar0 && (isVector1 || isMatrix1))
    {
        return argIndex === 0 ? t0 : t1;
    }
    if (isVector0 && isScalar1)
    {
        return argIndex === 1 ? t1 : t0;
    }
    if (isVector0 && isVector1)
    {
        if (argIndex === 0 || argIndex === 1)
        {
            return t0;
        }
        t0.width = 1;
        t0.height = 1;
        return t0;
    }
    if (isVector0 && isMatrix1)
    {
        if (argIndex === 0)
        {
            return t0;
        }
        if (argIndex === 1)
        {
            t1.width = t0.width;
            return t1;
        }
        t0.width = t1.height;
        return t0;
    }
    if (isMatrix0 && isScalar1)
    {
        return argIndex === 1 ? t1 : t0;
    }
    if (isMatrix0 && isVector1)
    {
        if (argIndex === 0)
        {
            return t0;
        }
        if (argIndex === 1)
        {
            t1.width = t0.height;
            return t1;
        }
        t1.width = t0.width;
        return t1;
    }
    t0.height = t1.height;
    return t0;
}

/**
 * Carbon's `TransposeIntrinsicType`.
 *
 * @param {import("./ASTNode/ASTNode.js").ASTNode} call The call.
 * @param {number} argIndex Parameter index, or -1 for the result.
 * @returns {Type} The argument's type, with width and height swapped for the result.
 */
export function TransposeIntrinsicType(call, argIndex)
{
    const arg0 = call.GetChildOrNull(0);
    if (arg0 === null)
    {
        return Type.typeFromTokenType(OP_VOID);
    }
    const t0 = arg0.GetType().Copy();
    if (argIndex === 0)
    {
        return t0;
    }
    [t0.width, t0.height] = [t0.height, t0.width];
    return t0;
}

/**
 * Carbon's `AddFunction`: declares an intrinsic, overloads allowed.
 *
 * @param {import("./SymbolTable/SymbolTable.js").SymbolTable} table The symbol table.
 * @param {string} name Function name.
 * @param {(call: import("./ASTNode/ASTNode.js").ASTNode, argIndex: number) => Type} intrinsicType Its signature.
 * @returns {import("./SymbolTable/Symbol.js").Symbol} The symbol.
 */
export function AddFunction(table, name, intrinsicType)
{
    const symbol = table.AddSymbol(InlineString.makeInlineString(name), SymbolTable.OverrideBehavior.ALLOW_OVERRIDES);
    symbol.isFunction = true;
    symbol.intrinsicType = intrinsicType;
    return symbol;
}

/**
 * Carbon's `AddConstant`: declares a built-in constant.
 *
 * @param {import("./SymbolTable/SymbolTable.js").SymbolTable} table The symbol table.
 * @param {string} name Constant name.
 * @param {number} opType Its type token.
 * @returns {import("./SymbolTable/Symbol.js").Symbol} The symbol.
 */
export function AddConstant(table, name, opType)
{
    const symbol = table.AddSymbol(InlineString.makeInlineString(name), SymbolTable.OverrideBehavior.ALLOW_OVERRIDES);
    symbol.type.FromTokenType(opType);
    return symbol;
}

/**
 * Carbon's `TypeSameAsArg<Arg>`.
 *
 * @param {number} arg Argument index.
 * @returns {(call: import("./ASTNode/ASTNode.js").ASTNode) => number} The type component.
 */
export function TypeSameAsArg(arg)
{
    return call =>
    {
        const arg0 = call.GetChildOrNull(arg);
        return arg0 === null ? OP_VOID : arg0.GetType().builtInType;
    };
}

/**
 * Carbon's `TypeIs<type>`.
 *
 * @param {number} type A type token.
 * @returns {() => number} The type component.
 */
export function TypeIs(type)
{
    return () => type;
}

/**
 * Carbon's `CommonArgType`: meant to be the highest-precedence argument type.
 *
 * Bug (IntrinsicTypes.h:201-209; Carbon known defect CE-80): `prec` is never
 * updated inside the loop, so every argument is compared with argument 0 and
 * the last one that beats it wins: `clamp(int, float, half)` gives `half`.
 *
 * @param {import("./ASTNode/ASTNode.js").ASTNode} call The call.
 * @returns {number} A type token.
 */
export function CommonArgType(call)
{
    if (call.GetChildrenCount() === 0)
    {
        return OP_VOID;
    }
    let type = call.GetChild(0).GetType().builtInType;
    const prec = Type.getNumericTypePrecedence(type);
    for (let i = 1; i < call.GetChildrenCount(); ++i)
    {
        const p1 = Type.getNumericTypePrecedence(call.GetChild(i).GetType().builtInType);
        if (p1 > prec)
        {
            type = call.GetChild(i).GetType().builtInType;
        }
    }
    return type;
}

/**
 * Carbon's `DimSameAsArg<Arg>`.
 *
 * @param {number} arg Argument index.
 * @returns {(call: import("./ASTNode/ASTNode.js").ASTNode, dims: { width: number, height: number }) => void} The dimension component.
 */
export function DimSameAsArg(arg)
{
    return (call, dims) =>
    {
        const arg0 = call.GetChildOrNull(arg);
        if (arg0 === null)
        {
            dims.width = 1;
            dims.height = 1;
        }
        else
        {
            dims.width = arg0.GetType().width;
            dims.height = arg0.GetType().height;
        }
    };
}

/**
 * Carbon's `DimIs<Width, Height>`.
 *
 * @param {number} width Width.
 * @param {number} height Height.
 * @returns {(call: import("./ASTNode/ASTNode.js").ASTNode, dims: { width: number, height: number }) => void} The dimension component.
 */
export function DimIs(width, height)
{
    return (call, dims) =>
    {
        dims.width = width;
        dims.height = height;
    };
}

/**
 * Carbon's `CommonArgDim`: the smallest non-scalar argument shape, starting
 * from argument 0. Carbon reads argument 0 without checking it exists.
 *
 * @param {import("./ASTNode/ASTNode.js").ASTNode} call The call.
 * @param {{ width: number, height: number }} dims Filled with the shape.
 */
export function CommonArgDim(call, dims)
{
    dims.width = call.GetChild(0).GetType().width;
    dims.height = call.GetChild(0).GetType().height;
    for (let i = 1; i < call.GetChildrenCount(); ++i)
    {
        const type = call.GetChild(i).GetType();
        if (type.width > 1 || type.height > 1)
        {
            dims.width = Math.min(type.width, dims.width);
            dims.height = Math.min(type.height, dims.height);
        }
    }
}

/**
 * The body shared by Carbon's `FunctionDescriptionN` templates.
 *
 * @param {Function} resultType Result type component.
 * @param {Function} resultDim Result dimension component.
 * @param {Array<[Function, Function, number]>} args Per parameter: type component, dimension component, modifier.
 * @param {boolean} argumentsFirst `FunctionDescription0` returns void for any argument index before computing the result.
 * @returns {(call: import("./ASTNode/ASTNode.js").ASTNode, argIndex: number) => Type} The intrinsic's signature.
 */
function describe(resultType, resultDim, args, argumentsFirst)
{
    return (call, argIndex) =>
    {
        const type = Type.typeFromTokenType(OP_VOID);
        if (argumentsFirst && argIndex >= 0)
        {
            return type;
        }
        let component = null;
        // `FunctionDescription0` computes the result for any negative index;
        // the others only for -1.
        if (argIndex === -1 || (argumentsFirst && argIndex < 0))
        {
            component = [resultType, resultDim, 0];
        }
        else if (argIndex >= 0 && argIndex < args.length)
        {
            component = args[argIndex];
        }
        if (component === null)
        {
            return type;
        }
        type.builtInType = component[0](call);
        component[1](call, type);
        if (argIndex >= 0 && component[2])
        {
            type.modifier = component[2];
        }
        return type;
    };
}

/**
 * Carbon's `FunctionDescription0<ResultType, ResultDim>`: no parameters.
 *
 * @param {(call: import("./ASTNode/ASTNode.js").ASTNode) => number} ResultType The result's type component.
 * @param {(call: import("./ASTNode/ASTNode.js").ASTNode, dims: { width: number, height: number }) => void} ResultDim The result's dimension component.
 * @returns {(call: import("./ASTNode/ASTNode.js").ASTNode, argIndex: number) => Type} The intrinsic's signature: the type of argument `argIndex`, or of the result for -1.
 */
export function FunctionDescription0(ResultType, ResultDim)
{
    return describe(ResultType, ResultDim, [], true);
}

/**
 * Carbon's `FunctionDescription1<ResultType, ResultDim, Arg0Type, Arg0Dim>`.
 *
 * @param {(call: import("./ASTNode/ASTNode.js").ASTNode) => number} ResultType The result's type component.
 * @param {(call: import("./ASTNode/ASTNode.js").ASTNode, dims: { width: number, height: number }) => void} ResultDim The result's dimension component.
 * @param {(call: import("./ASTNode/ASTNode.js").ASTNode) => number} Arg0Type Argument 0's type component.
 * @param {(call: import("./ASTNode/ASTNode.js").ASTNode, dims: { width: number, height: number }) => void} Arg0Dim Argument 0's dimension component.
 * @returns {(call: import("./ASTNode/ASTNode.js").ASTNode, argIndex: number) => Type} The intrinsic's signature: the type of argument `argIndex`, or of the result for -1.
 */
export function FunctionDescription1(ResultType, ResultDim, Arg0Type, Arg0Dim)
{
    return describe(ResultType, ResultDim, [[Arg0Type, Arg0Dim, 0]], false);
}

/**
 * Carbon's `FunctionDescription2<ResultType, ResultDim, Arg0Type, Arg0Dim, Arg1Type, Arg1Dim>`.
 *
 * @param {(call: import("./ASTNode/ASTNode.js").ASTNode) => number} ResultType The result's type component.
 * @param {(call: import("./ASTNode/ASTNode.js").ASTNode, dims: { width: number, height: number }) => void} ResultDim The result's dimension component.
 * @param {(call: import("./ASTNode/ASTNode.js").ASTNode) => number} Arg0Type Argument 0's type component.
 * @param {(call: import("./ASTNode/ASTNode.js").ASTNode, dims: { width: number, height: number }) => void} Arg0Dim Argument 0's dimension component.
 * @param {(call: import("./ASTNode/ASTNode.js").ASTNode) => number} Arg1Type Argument 1's type component.
 * @param {(call: import("./ASTNode/ASTNode.js").ASTNode, dims: { width: number, height: number }) => void} Arg1Dim Argument 1's dimension component.
 * @returns {(call: import("./ASTNode/ASTNode.js").ASTNode, argIndex: number) => Type} The intrinsic's signature: the type of argument `argIndex`, or of the result for -1.
 */
export function FunctionDescription2(ResultType, ResultDim, Arg0Type, Arg0Dim, Arg1Type, Arg1Dim)
{
    return describe(ResultType, ResultDim, [[Arg0Type, Arg0Dim, 0], [Arg1Type, Arg1Dim, 0]], false);
}

/**
 * Carbon's `FunctionDescription2Ex`: two parameters that carry a modifier token.
 *
 * @param {(call: import("./ASTNode/ASTNode.js").ASTNode) => number} ResultType The result's type component.
 * @param {(call: import("./ASTNode/ASTNode.js").ASTNode, dims: { width: number, height: number }) => void} ResultDim The result's dimension component.
 * @param {(call: import("./ASTNode/ASTNode.js").ASTNode) => number} Arg0Type Argument 0's type component.
 * @param {(call: import("./ASTNode/ASTNode.js").ASTNode, dims: { width: number, height: number }) => void} Arg0Dim Argument 0's dimension component.
 * @param {number} Arg0Modifier Argument 0's modifier token, such as `OP_OUT`.
 * @param {(call: import("./ASTNode/ASTNode.js").ASTNode) => number} Arg1Type Argument 1's type component.
 * @param {(call: import("./ASTNode/ASTNode.js").ASTNode, dims: { width: number, height: number }) => void} Arg1Dim Argument 1's dimension component.
 * @param {number} Arg1Modifier Argument 1's modifier token, such as `OP_OUT`.
 * @returns {(call: import("./ASTNode/ASTNode.js").ASTNode, argIndex: number) => Type} The intrinsic's signature: the type of argument `argIndex`, or of the result for -1.
 */
export function FunctionDescription2Ex(ResultType, ResultDim, Arg0Type, Arg0Dim, Arg0Modifier, Arg1Type, Arg1Dim, Arg1Modifier)
{
    return describe(ResultType, ResultDim, [[Arg0Type, Arg0Dim, Arg0Modifier], [Arg1Type, Arg1Dim, Arg1Modifier]], false);
}

/**
 * Carbon's `FunctionDescription3`: three parameters.
 *
 * @param {(call: import("./ASTNode/ASTNode.js").ASTNode) => number} ResultType The result's type component.
 * @param {(call: import("./ASTNode/ASTNode.js").ASTNode, dims: { width: number, height: number }) => void} ResultDim The result's dimension component.
 * @param {(call: import("./ASTNode/ASTNode.js").ASTNode) => number} Arg0Type Argument 0's type component.
 * @param {(call: import("./ASTNode/ASTNode.js").ASTNode, dims: { width: number, height: number }) => void} Arg0Dim Argument 0's dimension component.
 * @param {(call: import("./ASTNode/ASTNode.js").ASTNode) => number} Arg1Type Argument 1's type component.
 * @param {(call: import("./ASTNode/ASTNode.js").ASTNode, dims: { width: number, height: number }) => void} Arg1Dim Argument 1's dimension component.
 * @param {(call: import("./ASTNode/ASTNode.js").ASTNode) => number} Arg2Type Argument 2's type component.
 * @param {(call: import("./ASTNode/ASTNode.js").ASTNode, dims: { width: number, height: number }) => void} Arg2Dim Argument 2's dimension component.
 * @returns {(call: import("./ASTNode/ASTNode.js").ASTNode, argIndex: number) => Type} The intrinsic's signature: the type of argument `argIndex`, or of the result for -1.
 */
export function FunctionDescription3(ResultType, ResultDim, Arg0Type, Arg0Dim, Arg1Type, Arg1Dim, Arg2Type, Arg2Dim)
{
    return describe(ResultType, ResultDim, [[Arg0Type, Arg0Dim, 0], [Arg1Type, Arg1Dim, 0], [Arg2Type, Arg2Dim, 0]], false);
}

/**
 * Carbon's `FunctionDescription4`: four parameters.
 *
 * @param {(call: import("./ASTNode/ASTNode.js").ASTNode) => number} ResultType The result's type component.
 * @param {(call: import("./ASTNode/ASTNode.js").ASTNode, dims: { width: number, height: number }) => void} ResultDim The result's dimension component.
 * @param {(call: import("./ASTNode/ASTNode.js").ASTNode) => number} Arg0Type Argument 0's type component.
 * @param {(call: import("./ASTNode/ASTNode.js").ASTNode, dims: { width: number, height: number }) => void} Arg0Dim Argument 0's dimension component.
 * @param {(call: import("./ASTNode/ASTNode.js").ASTNode) => number} Arg1Type Argument 1's type component.
 * @param {(call: import("./ASTNode/ASTNode.js").ASTNode, dims: { width: number, height: number }) => void} Arg1Dim Argument 1's dimension component.
 * @param {(call: import("./ASTNode/ASTNode.js").ASTNode) => number} Arg2Type Argument 2's type component.
 * @param {(call: import("./ASTNode/ASTNode.js").ASTNode, dims: { width: number, height: number }) => void} Arg2Dim Argument 2's dimension component.
 * @param {(call: import("./ASTNode/ASTNode.js").ASTNode) => number} Arg3Type Argument 3's type component.
 * @param {(call: import("./ASTNode/ASTNode.js").ASTNode, dims: { width: number, height: number }) => void} Arg3Dim Argument 3's dimension component.
 * @returns {(call: import("./ASTNode/ASTNode.js").ASTNode, argIndex: number) => Type} The intrinsic's signature: the type of argument `argIndex`, or of the result for -1.
 */
export function FunctionDescription4(ResultType, ResultDim, Arg0Type, Arg0Dim, Arg1Type, Arg1Dim, Arg2Type, Arg2Dim, Arg3Type, Arg3Dim)
{
    return describe(ResultType, ResultDim, [[Arg0Type, Arg0Dim, 0], [Arg1Type, Arg1Dim, 0], [Arg2Type, Arg2Dim, 0], [Arg3Type, Arg3Dim, 0]], false);
}

/**
 * Carbon's `FunctionDescription8`: eight parameters.
 *
 * @param {(call: import("./ASTNode/ASTNode.js").ASTNode) => number} ResultType The result's type component.
 * @param {(call: import("./ASTNode/ASTNode.js").ASTNode, dims: { width: number, height: number }) => void} ResultDim The result's dimension component.
 * @param {...Function} components The eight parameters' type and dimension components, alternating: `Arg0Type, Arg0Dim, ..., Arg7Type, Arg7Dim`.
 * @returns {(call: import("./ASTNode/ASTNode.js").ASTNode, argIndex: number) => Type} The intrinsic's signature: the type of argument `argIndex`, or of the result for -1.
 */
export function FunctionDescription8(ResultType, ResultDim, ...components)
{
    const args = [];
    for (let i = 0; i < 8; ++i)
    {
        args.push([components[2 * i], components[2 * i + 1], 0]);
    }
    return describe(ResultType, ResultDim, args, false);
}
