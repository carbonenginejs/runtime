import { CjsSchema, blue, meta } from "#schema";
// Source: trinity/shadercompiler/ParserState.h
// Source: trinity/shadercompiler/ParserState.cpp

import { InlineString } from "../InlineString.js";
import { HLSLParserTokens } from "../hlslParserTokens.js";
import { PreprocessorTokens } from "../preprocessorTokens.js";
import { ASTNode } from "../ASTNode/ASTNode.js";
import { SymbolTable } from "../SymbolTable/SymbolTable.js";
import { CjsFxStdMap } from "../CjsFxStdMap.js";
import { CompileMessageQueue } from "../CompileMessageQueue.js";
import { GetPreprocessorToken as scanPreprocessorToken, ConvertToScannerToken } from "../hlslScanner.js";
import { Preprocessor } from "../Preprocessor.js";
import { HLSLParser } from "../HLSLParser.js";
import {
    AddFunction, AddConstant, MulIntrinsicType, TransposeIntrinsicType, TypeIs, TypeSameAsArg, DimIs, DimSameAsArg,
    CommonArgType, CommonArgDim, FunctionDescription0, FunctionDescription1, FunctionDescription2, FunctionDescription2Ex,
    FunctionDescription3, FunctionDescription4, FunctionDescription8
} from "../intrinsicTypes.js";
import { FileLocation } from "./FileLocation.js";
import { FileContents } from "./FileContents.js";
import { Pragma } from "./Pragma.js";
import { SamplerDefinition } from "./SamplerDefinition.js";
import { ScannerToken } from "./ScannerToken.js";
import { PreprocessorToken } from "./PreprocessorToken.js";
import { PreprocessorDefine } from "./PreprocessorDefine.js";
import { Permutation } from "./Permutation.js";
import { PermutationOption } from "./PermutationOption.js";

const T = HLSLParserTokens;

const ERROR_MESSAGES = [
    "unexpected token '%s'",
    "unexpected end of file",
    "unexpected character '%c'",
    "undeclared identifier \"%s\"",
    "identifier \"%s\" redefinition",
    "function parameter \"%s\" redefinition",
    "invalid pack offset",
    "invalid register",
    "effect contains no techniques",
    "annotation type mismatch for annotation \"%s\"",
    "explicit register bindings for scalaras are deprecated",
    "no suitable function override found for function call \"%s\"",

    "array, matrix, vector, or indexable object type expected in index expression",
    "invalid subscript '%s'",
    "type mismatch",
    "int or unsigned int type required",
    "scalar, vector, or matrix expected",
    "cannot convert from '%s' to '%s'",

    "invalid state name \"%s\"",
    "invalid state value \"%s\"",
    "type \"%s\" is not supported in state assignment",
    "use of uninitialized variable \"%s\"",
    "structs are not supported in state assignment",
    "invalid implicit type cast",
    "operator \"%s\" is not supported for given argument types",
    "side effects are not permitted in state assignments (operator \"%s\")",
    "index [%i] is out of range",
    "invalid swizzle \"%s\"",
    "function calls are not supported in state assignments",
    "operator is not supported in state assignments",
    "incorrect number of arguments to numeric type constructor",
    "sampler \"%s\" is used both as %s and as %s sampler",
    "texture \"%s\" is declared as %s, but is used as %s",
    "sampler \"%s\" does not have texture assignment, but is used in DX9 texture function",

    "undeclared preprocessor symbol '%'",
    "unexpected preprocessor directive 'elif'",
    "unexpected preprocessor directive 'else'",
    "unexpected preprocessor directive 'endif'",
    "file '%s' not found",
    "unexpected end of file in macro expansion",
    "not enough actual parameters for macro '%s'",
    "invalid include path",
    "syntax error : unexpected end of line",
    "%s",
    "state '%s' is deprecated",
    "cannot bind the same variable to multiple constants in the same constant bank"
];

/**
 * The subset of C `vsprintf` Carbon's messages use: `%s`, `%c`, `%i`, `%d`,
 * `%u` and `%%`.
 *
 * @param {string} formatText The format.
 * @param {Array<*>} args The arguments.
 * @returns {string} The text.
 */
function format(formatText, args)
{
    let next = 0;
    return formatText.replace(/%([%sciud])/gu, (whole, kind) =>
    {
        if (kind === "%")
        {
            return "%";
        }
        const value = args[next++];
        if (kind === "s" || kind === "c")
        {
            return String(value);
        }
        return String(Math.trunc(Number(value)));
    });
}

/**
 * The state of one preprocessing and parsing pass over a shader:
 * Carbon's `ParserState`.
 *
 * It owns the file stack the scanner reads (source files, included files,
 * macro bodies and macro arguments), the defines and open conditional blocks,
 * the symbol table with the intrinsics, and the syntax tree the grammar
 * builds. Carbon makes a new one for each pass: permutation discovery and each
 * permutation's parse.
 */
export class ParserState
{
    _includeHandler = null;

    _messages = null;

    /**
     * @param {InlineString} code The source. Its buffer must hold Carbon's
     *   leading newline at `code.start - 1`, as `CompileEffect` callers pass
     *   `src + 1` of a string starting with one.
     * @param {object} [options] Port-side wiring of Carbon's globals.
     * @param {import("../CachingIncludeHandler/index.js").CachingIncludeHandler|null} [options.includeHandler=null] Carbon's `g_includeHandler`.
     * @param {CompileMessageQueue} [options.messages] Carbon's `g_messages`.
     */
    constructor(code, { includeHandler = null, messages = new CompileMessageQueue() } = {})
    {
        this._includeHandler = includeHandler;

        this._messages = messages;

        const location = new FileLocation(0, InlineString.makeInlineString("\\memory"));
        const fileContents = new FileContents();
        fileContents.location = location;
        fileContents.code = InlineString.makeInlineString__StartEnd(code.buffer, code.start - 1, code.end);
        fileContents.position = code.start - 1;
        /** @type {FileContents[]} */
        this._fileStack = [fileContents];

        this.newLine = true;

        this.mode = ParserState.Mode.HLSL;

        this.preprocessorConditionResult = 0;

        this.expandMacros = true;

        /** Defines by name. @type {CjsFxStdMap} */
        this.defines = new CjsFxStdMap();

        /** @type {import("./PreprocessorCondition.js").PreprocessorCondition[]} */
        this.prepocessorConditions = [];

        /** @type {SamplerDefinition[]} */
        this.bindlessSamplers = [];

        /** @type {Pragma[]} */
        this._pragmas = [];

        this._symbols = new SymbolTable();

        /** @type {ASTNode|null} */
        this._root = null;

        this._offlineStatements = new ASTNode(ASTNode.ASTNodeType.NT_BLOCK, location, null, null);

        this._hasErrors = false;

        this._inPreprocessorCondition = false;

        this._inDiscoverMode = false;

        /** Carbon's `m_strings`: every string this state allocated; names count them. */
        this._strings = [];

        /** @type {Set<import("../SymbolTable/Symbol.js").Symbol>} */
        this._dx9TextureFunctions = new Set();

        /** Carbon keys this map by string-literal address; here by name. @type {Map<string, import("../SymbolTable/Symbol.js").Symbol>} */
        this._dx9Functions = new Map();

        this._AddIntrinsics();
    }

    /**
     * Carbon's `ParserState::AddIntrinsics`, in Carbon's order.
     *
     * Bug (ParserState.cpp:172,186; Carbon known defect CE-64): the symbol
     * filed as `PrimitiveIndex` is declared under the name `InstanceIndex`, and
     * the one filed as `ReportHit` under the name `PrimitiveIndex`, so HLSL
     * calls to `ReportHit` find no declaration and `PrimitiveIndex` gets
     * `ReportHit`'s signature. Reproduced.
     */
    _AddIntrinsics()
    {
        const table = this._symbols;
        const f = this._dx9Functions;
        const FLOAT = TypeIs(T.OP_FLOAT);
        const INT = TypeIs(T.OP_INT);
        const UINT = TypeIs(T.OP_UINT);
        const BOOL = TypeIs(T.OP_BOOL);
        const VOID = TypeIs(T.OP_VOID);
        const DOUBLE = TypeIs(T.OP_DOUBLE);
        const SAME0 = DimSameAsArg(0);
        const D11 = DimIs(1, 1);
        const unaryFloat = FunctionDescription1(FLOAT, SAME0, FLOAT, SAME0);

        f.set("abs", AddFunction(table, "abs", FunctionDescription1(TypeSameAsArg(0), SAME0, TypeSameAsArg(0), SAME0)));
        f.set("acos", AddFunction(table, "acos", unaryFloat));
        f.set("all", AddFunction(table, "all", FunctionDescription1(BOOL, D11, TypeSameAsArg(0), SAME0)));
        f.set("AllMemoryBarrier", AddFunction(table, "AllMemoryBarrier", FunctionDescription0(VOID, D11)));
        f.set("AllMemoryBarrierWithGroupSync", AddFunction(table, "AllMemoryBarrierWithGroupSync", FunctionDescription0(VOID, D11)));
        f.set("any", AddFunction(table, "any", FunctionDescription1(BOOL, D11, TypeSameAsArg(0), SAME0)));
        f.set("asdouble", AddFunction(table, "asdouble", FunctionDescription2(DOUBLE, D11, UINT, D11, UINT, D11)));
        f.set("asfloat", AddFunction(table, "asfloat", FunctionDescription1(FLOAT, DimIs(2, 1), UINT, D11)));
        f.set("asin", AddFunction(table, "asin", unaryFloat));
        f.set("asint", AddFunction(table, "asint", FunctionDescription1(INT, DimIs(2, 1), DOUBLE, D11)));
        f.set("asuint", AddFunction(table, "asuint", FunctionDescription3(UINT, D11, DOUBLE, D11, UINT, D11, UINT, D11)));
        f.set("atan", AddFunction(table, "atan", unaryFloat));
        f.set("atan2", AddFunction(table, "atan2", FunctionDescription2(FLOAT, CommonArgDim, FLOAT, CommonArgDim, FLOAT, CommonArgDim)));
        f.set("ceil", AddFunction(table, "ceil", unaryFloat));
        f.set("clamp", AddFunction(table, "clamp", FunctionDescription3(CommonArgType, CommonArgDim, CommonArgType, CommonArgDim, CommonArgType, CommonArgDim, CommonArgType, CommonArgDim)));
        f.set("clip", AddFunction(table, "clip", FunctionDescription1(VOID, D11, FLOAT, SAME0)));
        f.set("cos", AddFunction(table, "cos", unaryFloat));

        f.set("cosh", AddFunction(table, "cosh", unaryFloat));
        f.set("countbits", AddFunction(table, "countbits", FunctionDescription1(UINT, SAME0, UINT, SAME0)));
        f.set("cross", AddFunction(table, "cross", FunctionDescription2(FLOAT, DimIs(3, 1), FLOAT, DimIs(3, 1), FLOAT, DimIs(3, 1))));
        f.set("D3DCOLORtoUBYTE4", AddFunction(table, "D3DCOLORtoUBYTE4", FunctionDescription1(INT, DimIs(4, 1), FLOAT, DimIs(4, 1))));
        f.set("ddx", AddFunction(table, "ddx", unaryFloat));
        f.set("ddx_coarse", AddFunction(table, "ddx_coarse", unaryFloat));
        f.set("ddx_fine", AddFunction(table, "ddx_fine", unaryFloat));
        f.set("ddy", AddFunction(table, "ddy", unaryFloat));
        f.set("ddy_coarse", AddFunction(table, "ddy_coarse", unaryFloat));
        f.set("ddy_fine", AddFunction(table, "ddy_fine", unaryFloat));
        f.set("degrees", AddFunction(table, "degrees", unaryFloat));
        f.set("determinant", AddFunction(table, "determinant", FunctionDescription1(FLOAT, D11, FLOAT, SAME0)));
        f.set("DeviceMemoryBarrier", AddFunction(table, "DeviceMemoryBarrier", FunctionDescription0(VOID, D11)));
        f.set("DeviceMemoryBarrierWithGroupSync", AddFunction(table, "DeviceMemoryBarrierWithGroupSync", FunctionDescription0(VOID, D11)));
        f.set("distance", AddFunction(table, "distance", FunctionDescription2(FLOAT, D11, FLOAT, CommonArgDim, FLOAT, CommonArgDim)));
        f.set("dot", AddFunction(table, "dot", FunctionDescription2(FLOAT, D11, FLOAT, CommonArgDim, FLOAT, CommonArgDim)));
        f.set("dst", AddFunction(table, "dst", FunctionDescription2(FLOAT, D11, FLOAT, CommonArgDim, FLOAT, CommonArgDim)));
        f.set("EvaluateAttributeAtCentroid", AddFunction(table, "EvaluateAttributeAtCentroid", FunctionDescription1(TypeSameAsArg(0), SAME0, TypeSameAsArg(0), SAME0)));
        f.set("EvaluateAttributeAtSample", AddFunction(table, "EvaluateAttributeAtSample", FunctionDescription1(TypeSameAsArg(0), SAME0, TypeSameAsArg(0), SAME0)));
        f.set("EvaluateAttributeSnapped", AddFunction(table, "EvaluateAttributeSnapped", FunctionDescription1(TypeSameAsArg(0), SAME0, TypeSameAsArg(0), SAME0)));
        f.set("exp", AddFunction(table, "exp", unaryFloat));
        f.set("exp2", AddFunction(table, "exp2", unaryFloat));
        f.set("f16tof32", AddFunction(table, "f16tof32", FunctionDescription1(FLOAT, SAME0, UINT, SAME0)));
        f.set("f32tof16", AddFunction(table, "f32tof16", FunctionDescription1(UINT, SAME0, FLOAT, SAME0)));
        f.set("faceforward", AddFunction(table, "faceforward", FunctionDescription3(FLOAT, CommonArgDim, FLOAT, CommonArgDim, FLOAT, CommonArgDim, FLOAT, CommonArgDim)));

        f.set("firstbithigh", AddFunction(table, "firstbithigh", FunctionDescription1(INT, SAME0, INT, SAME0)));
        f.set("firstbitlow", AddFunction(table, "firstbitlow", FunctionDescription1(INT, SAME0, INT, SAME0)));
        f.set("floor", AddFunction(table, "floor", unaryFloat));
        f.set("fmod", AddFunction(table, "fmod", FunctionDescription2(FLOAT, CommonArgDim, FLOAT, CommonArgDim, FLOAT, CommonArgDim)));
        f.set("frac", AddFunction(table, "frac", unaryFloat));
        f.set("frexp", AddFunction(table, "frexp", FunctionDescription2(FLOAT, SAME0, FLOAT, SAME0, FLOAT, SAME0)));
        f.set("fwidth", AddFunction(table, "fwidth", unaryFloat));
        f.set("GetRenderTargetSampleCount", AddFunction(table, "GetRenderTargetSampleCount", FunctionDescription0(UINT, D11)));
        f.set("GetRenderTargetSamplePosition", AddFunction(table, "GetRenderTargetSamplePosition", FunctionDescription1(UINT, D11, INT, D11)));
        f.set("GroupMemoryBarrier", AddFunction(table, "GroupMemoryBarrier", FunctionDescription0(VOID, D11)));
        f.set("GroupMemoryBarrierWithGroupSync", AddFunction(table, "GroupMemoryBarrierWithGroupSync", FunctionDescription0(VOID, D11)));
        const interlocked3 = FunctionDescription3(VOID, D11, INT, D11, INT, D11, INT, D11);
        f.set("InterlockedAdd", AddFunction(table, "InterlockedAdd", interlocked3));
        f.set("InterlockedAnd", AddFunction(table, "InterlockedAnd", interlocked3));
        f.set("InterlockedCompareExchange", AddFunction(table, "InterlockedCompareExchange", FunctionDescription4(VOID, D11, INT, D11, INT, D11, INT, D11, INT, D11)));
        f.set("InterlockedCompareStore", AddFunction(table, "InterlockedCompareStore", interlocked3));
        f.set("InterlockedExchange", AddFunction(table, "InterlockedExchange", interlocked3));
        f.set("InterlockedMax", AddFunction(table, "InterlockedMax", interlocked3));
        f.set("InterlockedMin", AddFunction(table, "InterlockedMin", interlocked3));
        f.set("InterlockedOr", AddFunction(table, "InterlockedOr", interlocked3));
        f.set("InterlockedXor", AddFunction(table, "InterlockedXor", interlocked3));
        f.set("NonUniformResourceIndex", AddFunction(table, "NonUniformResourceIndex", FunctionDescription1(UINT, SAME0, UINT, D11)));
        f.set("isfinite", AddFunction(table, "isfinite", FunctionDescription1(BOOL, D11, FLOAT, SAME0)));
        f.set("isinf", AddFunction(table, "isinf", FunctionDescription1(BOOL, D11, FLOAT, SAME0)));
        f.set("isnan", AddFunction(table, "isnan", FunctionDescription1(BOOL, D11, FLOAT, SAME0)));
        f.set("ldexp", AddFunction(table, "ldexp", FunctionDescription2(FLOAT, CommonArgDim, FLOAT, CommonArgDim, FLOAT, CommonArgDim)));
        f.set("length", AddFunction(table, "length", FunctionDescription1(FLOAT, D11, FLOAT, SAME0)));
        f.set("lerp", AddFunction(table, "lerp", FunctionDescription3(FLOAT, CommonArgDim, FLOAT, SAME0, FLOAT, SAME0, FLOAT, SAME0)));
        f.set("lit", AddFunction(table, "lit", FunctionDescription3(FLOAT, D11, FLOAT, D11, FLOAT, D11, FLOAT, D11)));
        f.set("log", AddFunction(table, "log", unaryFloat));

        f.set("log10", AddFunction(table, "log10", unaryFloat));
        f.set("log2", AddFunction(table, "log2", unaryFloat));
        f.set("mad", AddFunction(table, "mad", FunctionDescription3(CommonArgType, CommonArgDim, CommonArgType, CommonArgDim, CommonArgType, CommonArgDim, CommonArgType, CommonArgDim)));
        f.set("max", AddFunction(table, "max", FunctionDescription2(CommonArgType, CommonArgDim, CommonArgType, CommonArgDim, CommonArgType, CommonArgDim)));
        f.set("min", AddFunction(table, "min", FunctionDescription2(CommonArgType, CommonArgDim, CommonArgType, CommonArgDim, CommonArgType, CommonArgDim)));
        f.set("modf", AddFunction(table, "modf", FunctionDescription2Ex(CommonArgType, CommonArgDim, CommonArgType, CommonArgDim, 0, CommonArgType, CommonArgDim, T.OP_OUT)));
        f.set("mul", AddFunction(table, "mul", MulIntrinsicType));
        f.set("noise", AddFunction(table, "noise", FunctionDescription1(FLOAT, D11, FLOAT, SAME0)));
        f.set("normalize", AddFunction(table, "normalize", unaryFloat));
        f.set("pow", AddFunction(table, "pow", FunctionDescription2(FLOAT, CommonArgDim, FLOAT, CommonArgDim, FLOAT, CommonArgDim)));
        f.set("radians", AddFunction(table, "radians", unaryFloat));
        f.set("rcp", AddFunction(table, "rcp", unaryFloat));
        f.set("reflect", AddFunction(table, "reflect", FunctionDescription2(FLOAT, CommonArgDim, FLOAT, CommonArgDim, FLOAT, CommonArgDim)));
        f.set("refract", AddFunction(table, "refract", FunctionDescription3(FLOAT, CommonArgDim, FLOAT, CommonArgDim, FLOAT, CommonArgDim, FLOAT, D11)));

        f.set("reversebits", AddFunction(table, "reversebits", FunctionDescription1(UINT, SAME0, UINT, SAME0)));
        f.set("round", AddFunction(table, "round", unaryFloat));
        f.set("rsqrt", AddFunction(table, "rsqrt", unaryFloat));
        f.set("saturate", AddFunction(table, "saturate", unaryFloat));
        f.set("sign", AddFunction(table, "sign", FunctionDescription1(INT, SAME0, TypeSameAsArg(0), SAME0)));
        f.set("sin", AddFunction(table, "sin", unaryFloat));
        f.set("sincos", AddFunction(table, "sincos", FunctionDescription3(VOID, D11, FLOAT, SAME0, FLOAT, SAME0, FLOAT, SAME0)));
        f.set("sinh", AddFunction(table, "sinh", unaryFloat));
        f.set("smoothstep", AddFunction(table, "smoothstep", FunctionDescription3(FLOAT, CommonArgDim, FLOAT, CommonArgDim, FLOAT, CommonArgDim, FLOAT, CommonArgDim)));
        f.set("sqrt", AddFunction(table, "sqrt", unaryFloat));
        f.set("step", AddFunction(table, "step", FunctionDescription2(FLOAT, CommonArgDim, FLOAT, CommonArgDim, FLOAT, CommonArgDim)));
        f.set("tan", AddFunction(table, "tan", unaryFloat));
        f.set("tanh", AddFunction(table, "tanh", unaryFloat));

        f.set("transpose", AddFunction(table, "transpose", TransposeIntrinsicType));
        f.set("trunc", AddFunction(table, "trunc", unaryFloat));

        // DXR - raytracing
        f.set("DispatchRaysIndex", AddFunction(table, "DispatchRaysIndex", FunctionDescription0(UINT, DimIs(3, 1))));
        f.set("DispatchRaysDimensions", AddFunction(table, "DispatchRaysDimensions", FunctionDescription0(UINT, DimIs(3, 1))));

        f.set("WorldRayOrigin", AddFunction(table, "WorldRayOrigin", FunctionDescription0(FLOAT, DimIs(3, 1))));
        f.set("WorldRayDirection", AddFunction(table, "WorldRayDirection", FunctionDescription0(FLOAT, DimIs(3, 1))));
        f.set("RayTMin", AddFunction(table, "RayTMin", FunctionDescription0(FLOAT, D11)));
        f.set("RayTCurrent", AddFunction(table, "RayTCurrent", FunctionDescription0(FLOAT, D11)));
        f.set("RayFlags", AddFunction(table, "RayFlags", FunctionDescription0(UINT, D11)));

        f.set("InstanceIndex", AddFunction(table, "InstanceIndex", FunctionDescription0(UINT, D11)));
        f.set("InstanceID", AddFunction(table, "InstanceID", FunctionDescription0(UINT, D11)));
        f.set("GeometryIndex", AddFunction(table, "GeometryIndex", FunctionDescription0(UINT, D11)));
        // CE-64: declared as "InstanceIndex".
        f.set("PrimitiveIndex", AddFunction(table, "InstanceIndex", FunctionDescription0(UINT, D11)));

        f.set("ObjectRayOrigin", AddFunction(table, "ObjectRayOrigin", FunctionDescription0(FLOAT, DimIs(3, 1))));
        f.set("ObjectRayDirection", AddFunction(table, "ObjectRayDirection", FunctionDescription0(FLOAT, DimIs(3, 1))));

        f.set("ObjectToWorld3x4", AddFunction(table, "ObjectToWorld3x4", FunctionDescription0(FLOAT, DimIs(3, 4))));
        f.set("ObjectToWorld4x3", AddFunction(table, "ObjectToWorld4x3", FunctionDescription0(FLOAT, DimIs(4, 3))));
        f.set("WorldToObject3x4", AddFunction(table, "WorldToObject3x4", FunctionDescription0(FLOAT, DimIs(3, 4))));
        f.set("WorldToObject4x3", AddFunction(table, "WorldToObject4x3", FunctionDescription0(FLOAT, DimIs(4, 3))));

        f.set("HitKind", AddFunction(table, "HitKind", FunctionDescription0(UINT, D11)));

        f.set("AcceptHitAndEndSearch", AddFunction(table, "AcceptHitAndEndSearch", FunctionDescription0(VOID, D11)));
        f.set("IgnoreHit", AddFunction(table, "IgnoreHit", FunctionDescription0(VOID, D11)));
        // CE-64: declared as "PrimitiveIndex".
        f.set("ReportHit", AddFunction(table, "PrimitiveIndex", FunctionDescription3(BOOL, D11, FLOAT, D11, UINT, D11, VOID, D11)));
        f.set("TraceRay", AddFunction(table, "TraceRay", FunctionDescription8(
            VOID, D11,
            TypeIs(T.OP_RAYTRACING_ACCELERATION_STRUCTURE), D11,
            UINT, D11,
            UINT, D11,
            UINT, D11,
            UINT, D11,
            UINT, D11,
            TypeIs(T.OP_RAY_DESC), D11,
            VOID, D11)));

        const SAMPLER = TypeIs(T.OP_SAMPLER);
        const texture4 = dim => FunctionDescription4(FLOAT, DimIs(4, 1), SAMPLER, D11, FLOAT, DimIs(dim, 1), FLOAT, D11, FLOAT, D11);
        const texture2 = () => FunctionDescription2(FLOAT, DimIs(4, 1), SAMPLER, D11, FLOAT, DimIs(4, 1));
        const textureFunctions = [
            ["tex1D", texture4(1)], ["tex1Dbias", texture2()], ["tex1Dgrad", texture4(1)], ["tex1Dlod", texture2()], ["tex1Dproj", texture2()],
            ["tex2D", texture4(2)], ["tex2Dbias", texture2()], ["tex2Dgrad", texture4(2)], ["tex2Dlod", texture2()], ["tex2Dproj", texture2()],
            ["tex3D", texture4(3)], ["tex3Dbias", texture2()], ["tex3Dgrad", texture4(3)], ["tex3Dlod", texture2()], ["tex3Dproj", texture2()],
            ["texCUBE", texture4(3)], ["texCUBEbias", texture2()], ["texCUBEgrad", texture4(3)], ["texCUBElod", texture2()], ["texCUBEproj", texture2()]
        ];
        for (const [name, description] of textureFunctions)
        {
            this._dx9TextureFunctions.add(AddFunction(table, name, description));
        }
        for (const symbol of this._dx9TextureFunctions)
        {
            f.set(symbol.name.ToString(), symbol);
        }

        for (const name of ["RAY_FLAG_NONE", "RAY_FLAG_FORCE_OPAQUE", "RAY_FLAG_FORCE_NON_OPAQUE", "RAY_FLAG_ACCEPT_FIRST_HIT_AND_END_SEARCH",
            "RAY_FLAG_SKIP_CLOSEST_HIT_SHADER", "RAY_FLAG_CULL_BACK_FACING_TRIANGLES", "RAY_FLAG_CULL_FRONT_FACING_TRIANGLES",
            "RAY_FLAG_CULL_OPAQUE", "RAY_FLAG_CULL_NON_OPAQUE"])
        {
            AddConstant(table, name, T.OP_UINT);
        }
    }

    /**
     * Carbon's `ParserState::ParseMacroArguments`: reads `a, b, (c, d))`,
     * after the opening parenthesis, into one range per argument. Arguments are
     * macro-expanded while they are read.
     *
     * Bug (ParserState.cpp:321,334; Carbon known defect CE-68): an argument's
     * range runs from its first token's start to its last token's end. With
     * no tokens that reads an empty vector, and with the two ends in different
     * buffers (a macro's text, `__LINE__` or a `##` result) the range spans
     * two allocations; both are undefined behaviour, and this port throws. Two
     * ends in one buffer give a range over whatever lies between them, as in
     * Carbon.
     *
     * @param {InlineString[]} args Receives the argument ranges.
     * @returns {boolean} False after reporting an error.
     */
    _ParseMacroArguments(args)
    {
        let argument = [];
        let parenDepth = 0;
        const depth = this._fileStack.length;
        const flush = () =>
        {
            if (argument.length === 0)
            {
                throw new Error("ParserState: empty macro argument (Carbon known defect CE-68)");
            }
            const first = argument[0].string;
            const last = argument[argument.length - 1].string;
            if (first.buffer !== last.buffer)
            {
                throw new Error("ParserState: macro argument spans buffers (Carbon known defect CE-68)");
            }
            args.push(InlineString.makeInlineString__StartEnd(first.buffer, first.start, last.end));
            argument = [];
        };
        while (true)
        {
            const token = new PreprocessorToken();
            const code = this.GetPreprocessorToken(token);
            if (code === ParserState.PreprocessorScanResult.PPSR_ERROR)
            {
                return false;
            }
            else if (code === ParserState.PreprocessorScanResult.PPSR_EOF)
            {
                if (depth < this._fileStack.length)
                {
                    this._fileStack.pop();
                    continue;
                }
                this.ShowMessage(ParserState.ErrorCode.EC_UNEXPECTED_EOF);
                return false;
            }
            if (token.type === ParserState.PreprocessorTokenType.PPT_OPERATOR && token.string.end - token.string.start === 1)
            {
                const c = token.string.CharAt(token.string.start);
                if (c === 44)
                {
                    if (parenDepth === 0)
                    {
                        flush();
                    }
                    continue;
                }
                else if (c === 40)
                {
                    parenDepth++;
                }
                else if (c === 41)
                {
                    if (parenDepth === 0)
                    {
                        flush();
                        return true;
                    }
                    parenDepth--;
                }
            }
            argument.push(token);
        }
    }

    /**
     * Carbon's `ParserState::InSkipMode`: inside an inactive conditional block.
     *
     * @returns {boolean} Whether tokens are being skipped.
     */
    InSkipMode()
    {
        if (this._inPreprocessorCondition)
        {
            return false;
        }
        if (this.prepocessorConditions.length === 0)
        {
            return false;
        }
        const back = this.prepocessorConditions[this.prepocessorConditions.length - 1];
        return back.inheridedSkipMode || back.skipMode;
    }

    /** @returns {boolean} Carbon's `ParserState::InDiscoverMode`. */
    InDiscoverMode()
    {
        return this._inDiscoverMode;
    }

    /**
     * Carbon's `ParserState::FindConcatOperator`: looks past spaces for `##`,
     * popping exhausted macro frames on the way.
     *
     * Quirk: after a macro's last token the macro frame is popped and the
     * search continues in the text that follows the macro, so `M ## x` written
     * outside any macro also pastes.
     *
     * @param {number} depth Stack depth at the token being pasted.
     * @returns {boolean} Whether `##` was found and consumed.
     */
    _FindConcatOperator(depth)
    {
        while (true)
        {
            const backup = this.GetStreamPosition();
            const code = this.GetStreamCode();
            for (; this.GetStreamPosition() < this.GetStreamEnd(); this.SetStreamPosition(this.GetStreamPosition() + 1))
            {
                const c = code.CharAt(this.GetStreamPosition());
                if (c === 32)
                {
                    continue;
                }
                if (c === 35 && this.GetStreamPosition() + 1 < this.GetStreamEnd() && code.CharAt(this.GetStreamPosition() + 1) === 35)
                {
                    this.SetStreamPosition(this.GetStreamPosition() + 2);
                    return true;
                }
                this.SetStreamPosition(backup);
                return false;
            }
            if (this.InMacro() && this._fileStack.length > 1)
            {
                this._fileStack.pop();
            }
            else if (this._fileStack.length > depth)
            {
                this._fileStack.pop();
            }
            else
            {
                break;
            }
        }
        return false;
    }

    /**
     * Carbon's `ParserState::GetPreprocessorToken`: the next token after skip
     * mode, `__LINE__`, macro expansion and `##` pasting.
     *
     * @param {PreprocessorToken} token Filled with the token.
     * @returns {number} A `PreprocessorScanResult` value.
     */
    GetPreprocessorToken(token)
    {
        // Quirk (ParserState.cpp:406-414; Carbon known defect CE-89): an
        // inactive block is skipped token by token with the full scanner, so
        // a character the scanner rejects (HLSLScanner.re:737-741), such as
        // the apostrophe of `don't` inside `#if 0`, is still an error.
        do
        {
            const code = scanPreprocessorToken(this, token);
            if (code !== ParserState.PreprocessorScanResult.PPSR_OK)
            {
                return code;
            }
        } while (this.InSkipMode());

        if (token.type === ParserState.PreprocessorTokenType.PPT_ID && this.expandMacros)
        {
            if (token.string.ToString() === "__LINE__")
            {
                token.type = ParserState.PreprocessorTokenType.PPT_INT_CONST;
                let found = false;
                for (let i = this._fileStack.length - 1; i >= 0; --i)
                {
                    if (!this._fileStack[i].isMacro)
                    {
                        found = true;
                        const text = String(this._fileStack[i].location.lineNumber);
                        token.string = InlineString.makeInlineString__StartEnd(this.AllocateString(text), 0, text.length);
                        break;
                    }
                }
                if (!found)
                {
                    token.string = InlineString.makeInlineString("0");
                }
            }
            else
            {
                const found = this.FindDefine(token.string);
                if (found)
                {
                    const args = [];
                    if (found.parameters.length !== 0)
                    {
                        // Quirk (ParserState.cpp:457-465; Carbon known defect
                        // CE-92): the `(` is looked for in the current frame
                        // only. When the macro name is the last token of
                        // another macro's body, the lookahead meets that
                        // body's end and gives up: `#define G F` / `G(1)`
                        // leaves `F ( 1 )` unexpanded.
                        const paren = new PreprocessorToken();
                        const backup = this.GetStreamPosition();
                        if (this.GetPreprocessorToken(paren) !== ParserState.PreprocessorScanResult.PPSR_OK || paren.type !== ParserState.PreprocessorTokenType.PPT_OPERATOR ||
                            paren.string.end - paren.string.start !== 1 || paren.string.CharAt(paren.string.start) !== 40)
                        {
                            this.SetStreamPosition(backup);
                            return ParserState.PreprocessorScanResult.PPSR_OK;
                        }
                        if (!this._ParseMacroArguments(args))
                        {
                            return ParserState.PreprocessorScanResult.PPSR_ERROR;
                        }
                        if (args.length !== found.parameters.length)
                        {
                            this.ShowMessage(ParserState.ErrorCode.EC_INCORRECT_MACRO_PARAMETER_COUNT, token.string.ToString());
                            return ParserState.PreprocessorScanResult.PPSR_ERROR;
                        }
                    }
                    this.ParseDefine(found, token.fileLocation, args);
                    const code = this.GetPreprocessorToken(token);
                    if (code !== ParserState.PreprocessorScanResult.PPSR_OK)
                    {
                        return code;
                    }
                }
            }
        }

        if (this.InMacro())
        {
            const depth = this._fileStack.length;
            if (this._FindConcatOperator(depth))
            {
                // Quirk (ParserState.cpp:489-505, Carbon known defect CE-71):
                // each `##` pastes one token as Carbon's scanner splits them,
                // and that scanner reads `2D` as `2` then `D`, where C reads one
                // pp-number; `Texture ## 2D` gives `Texture2` and `D`.
                let concatToken = token.string.ToString();
                do
                {
                    const nextToken = new PreprocessorToken();
                    const code = this.GetPreprocessorToken(nextToken);
                    if (code !== ParserState.PreprocessorScanResult.PPSR_OK)
                    {
                        return code;
                    }
                    concatToken += nextToken.string.ToString();
                } while (this._FindConcatOperator(depth));
                token.string = InlineString.makeInlineString__StartEnd(this.AllocateString(concatToken), 0, concatToken.length);
            }
        }

        return ParserState.PreprocessorScanResult.PPSR_OK;
    }

    /**
     * Carbon's `ParserState::DiscoverPermutations`: preprocesses the whole
     * source and reads the `#pragma permutation` declarations.
     *
     * Quirk (ParserState.cpp:667-670; Carbon known defect CE-86): the loop
     * stops at the first pragma that is not a permutation, so permutations
     * declared after, say, `#pragma pack_matrix` are not found.
     *
     * @param {Permutation[]} permutations Receives the axes.
     * @returns {boolean} False after reporting a malformed pragma.
     */
    DiscoverPermutations(permutations)
    {
        this._inDiscoverMode = true;
        const token = new ScannerToken();

        let done = false;
        while (!done)
        {
            const ppToken = new PreprocessorToken();
            const scanCode = this.GetPreprocessorToken(ppToken);
            switch (scanCode)
            {
                case ParserState.PreprocessorScanResult.PPSR_ERROR:
                    break;
                case ParserState.PreprocessorScanResult.PPSR_EOF:
                    if (this._fileStack.length > 1)
                    {
                        this._fileStack.pop();
                    }
                    else
                    {
                        done = true;
                    }
                    break;
                case ParserState.PreprocessorScanResult.PPSR_OK:
                    ConvertToScannerToken(this, ppToken, token);
                    break;
            }
        }

        for (const pragma of this._pragmas)
        {
            const text = pragma.pragma.ToString();
            if (!IsPermutationPragma(text))
            {
                break;
            }
            const p = GetPermutationInfo(text);
            if (p === null)
            {
                this.ShowMessage__Location(pragma.location, ParserState.ErrorCode.EC_SYNTAX_ERROR, "pragma permutation");
                return false;
            }
            p.location = pragma.location.Copy();
            permutations.push(p);
        }
        this._inDiscoverMode = false;
        return true;
    }

    /**
     * Carbon's `ParserState::Parse`: preprocesses and parses the source,
     * building the tree and the symbol table.
     *
     * One scanner token is reused for the whole parse, as in Carbon, because
     * literal tokens inherit its previous `intValue` (CE-61); the parser is
     * given a copy, as Carbon passes the token by value.
     *
     * @returns {boolean} Whether a tree was built without errors.
     */
    Parse()
    {
        const parser = HLSLParser.parseAlloc(this);

        this._symbols.EnterScope();

        const token = new ScannerToken();

        let done = false;
        while (!done)
        {
            const ppToken = new PreprocessorToken();
            const scanCode = this.GetPreprocessorToken(ppToken);
            switch (scanCode)
            {
                case ParserState.PreprocessorScanResult.PPSR_ERROR:
                    return false;
                case ParserState.PreprocessorScanResult.PPSR_EOF:
                    if (this._fileStack.length > 1)
                    {
                        this._fileStack.pop();
                    }
                    else
                    {
                        done = true;
                    }
                    break;
                case ParserState.PreprocessorScanResult.PPSR_OK:
                    if (!ConvertToScannerToken(this, ppToken, token))
                    {
                        this.ShowMessage__Location(ppToken.fileLocation, ParserState.ErrorCode.EC_SYNTAX_ERROR, ppToken.string.ToString());
                        return false;
                    }
                    parser.Parse(token.type, token.Copy());
                    break;
            }
        }

        token.type = 0;
        parser.Parse(0, token.Copy());

        this._symbols.LeaveScope();

        return this._root !== null && !this._hasErrors;
    }

    /**
     * Carbon's `ParserState::EvaluatePreprocessorCondition`: evaluates the
     * text of an `#if` or `#elif` line, macros expanded.
     *
     * Bug (ParserState.cpp:805-806, :817-827; Carbon known defect CE-87): on a
     * scan error Carbon returns without leaving condition mode or popping the
     * line's frame. A parse fails on the error, but permutation discovery
     * ignores it (:644-645), and `InSkipMode` then answers false until the next
     * condition evaluates, so a permutation inside a skipped block is found.
     *
     * @param {InlineString} string The condition text.
     * @param {{ value: boolean }} result Receives the condition's truth.
     * @returns {number} A `PreprocessorScanResult` value.
     */
    EvaluatePreprocessorCondition(string, result)
    {
        const preprocessor = Preprocessor.parseAlloc(this);

        const fileContents = new FileContents();
        fileContents.location = this.GetCurrentLocation().Copy();
        fileContents.code = string;
        fileContents.position = string.start;

        const depth = this._fileStack.length;
        this._fileStack.push(fileContents);

        this.preprocessorConditionResult = 0;
        this.expandMacros = true;
        this._inPreprocessorCondition = true;
        const token = new ScannerToken();
        let done = false;
        while (!done)
        {
            const ppToken = new PreprocessorToken();
            const scanCode = this.GetPreprocessorToken(ppToken);
            switch (scanCode)
            {
                case ParserState.PreprocessorScanResult.PPSR_ERROR:
                    return ParserState.PreprocessorScanResult.PPSR_ERROR;
                case ParserState.PreprocessorScanResult.PPSR_EOF:
                    this._fileStack.pop();
                    if (this._fileStack.length === depth)
                    {
                        done = true;
                    }
                    break;
                case ParserState.PreprocessorScanResult.PPSR_OK:
                {
                    if (!ConvertToScannerToken(this, ppToken, token))
                    {
                        this.ShowMessage(ParserState.ErrorCode.EC_SYNTAX_ERROR, ppToken.string.ToString());
                        return ParserState.PreprocessorScanResult.PPSR_ERROR;
                    }
                    const type = ConvertToPreprocessorToken(token.type);
                    if (type === 0)
                    {
                        this.ShowMessage(ParserState.ErrorCode.EC_SYNTAX_ERROR, ppToken.string.ToString());
                        return ParserState.PreprocessorScanResult.PPSR_ERROR;
                    }
                    token.type = type;
                    preprocessor.Parse(token.type, token.Copy());
                    break;
                }
            }
        }
        token.type = 0;
        preprocessor.Parse(0, token.Copy());
        this.expandMacros = true;
        this._inPreprocessorCondition = false;

        result.value = this.preprocessorConditionResult !== 0;

        return ParserState.PreprocessorScanResult.PPSR_OK;
    }

    /** @returns {boolean} Whether an error (not a warning) was reported. */
    HasErrors()
    {
        return this._hasErrors;
    }

    /** @returns {ASTNode|null} The program node. */
    GetTree()
    {
        return this._root;
    }

    /** @returns {SymbolTable} The symbol table. */
    GetSymbolTable()
    {
        return this._symbols;
    }

    /** @returns {FileLocation} The location of the file or macro being read; live, not a copy. */
    GetCurrentLocation()
    {
        return this._fileStack[this._fileStack.length - 1].location;
    }

    /**
     * Carbon's `AllocateName()`: a fresh `_new_symbol_NNNN`, numbered by the
     * strings allocated so far.
     *
     * @returns {InlineString} The name.
     */
    AllocateName()
    {
        const name = `_new_symbol_${allocatedNumber(this._strings.length)}`;
        const buffer = { text: name };
        this._strings.push(buffer);
        return InlineString.makeInlineString__StartEnd(buffer, 0, name.length);
    }

    /**
     * Carbon's `AllocateName( const char* )`: a copy of a name in storage this
     * state owns.
     *
     * @param {string} name The C string.
     * @returns {InlineString} The copy.
     */
    AllocateName__Chars(name)
    {
        const text = InlineString.makeInlineString(name).ToString();
        const buffer = { text };
        this._strings.push(buffer);
        return InlineString.makeInlineString__StartEnd(buffer, 0, text.length);
    }

    /**
     * Carbon's `AllocateName( const InlineString& )`: a copy of a range in
     * storage this state owns.
     *
     * @param {InlineString} name The range.
     * @returns {InlineString} The copy.
     */
    AllocateName__InlineString(name)
    {
        const text = name.ToString();
        const buffer = { text };
        this._strings.push(buffer);
        return InlineString.makeInlineString__StartEnd(buffer, 0, text.length);
    }

    /**
     * Carbon's `AllocateNameWithPrefix( const char* )`: `__<prefix>_NNNN`.
     *
     * @param {string} prefix The C string.
     * @returns {InlineString} The name.
     */
    AllocateNameWithPrefix(prefix)
    {
        const text = `__${InlineString.makeInlineString(prefix).ToString()}_${allocatedNumber(this._strings.length)}`;
        const buffer = { text };
        this._strings.push(buffer);
        return InlineString.makeInlineString__StartEnd(buffer, 0, text.length);
    }

    /**
     * Carbon's `AllocateNameWithPrefix( const InlineString& )`.
     *
     * @param {InlineString} prefix The range.
     * @returns {InlineString} The name.
     */
    AllocateNameWithPrefix__InlineString(prefix)
    {
        const text = `__${prefix.ToString()}_${allocatedNumber(this._strings.length)}`;
        const buffer = { text };
        this._strings.push(buffer);
        return InlineString.makeInlineString__StartEnd(buffer, 0, text.length);
    }

    /**
     * Carbon's `AllocateString`: storage this state owns. Carbon allocates and
     * the caller fills; here the caller passes the text.
     *
     * @param {string} text The text.
     * @returns {{ text: string }} The buffer.
     */
    AllocateString(text)
    {
        const buffer = { text };
        this._strings.push(buffer);
        return buffer;
    }

    /**
     * Carbon's `ShowMessage( int32_t errorCode, ... )`, at the current location.
     *
     * @param {number} errorCode An `ErrorCode` value.
     * @param {...*} args Format arguments; for `EC_CUSTOM_ERROR` and `EC_CUSTOM_WARNING` the first is the format.
     */
    ShowMessage(errorCode, ...args)
    {
        this._ShowMessageImpl(this.GetCurrentLocation(), errorCode, args);
    }

    /**
     * Carbon's `ShowMessage( const FileLocation&, int32_t errorCode, ... )`.
     *
     * @param {FileLocation} location Where.
     * @param {number} errorCode An `ErrorCode` value.
     * @param {...*} args Format arguments.
     */
    ShowMessage__Location(location, errorCode, ...args)
    {
        this._ShowMessageImpl(location, errorCode, args);
    }

    /**
     * Carbon's `ShowMessage( const ScannerToken&, int32_t errorCode, ... )`.
     *
     * @param {ScannerToken} token At this token's location.
     * @param {number} errorCode An `ErrorCode` value.
     * @param {...*} args Format arguments.
     */
    ShowMessage__Token(token, errorCode, ...args)
    {
        this._ShowMessageImpl(token.fileLocation, errorCode, args);
    }

    /**
     * Carbon's `ShowMessageImpl`: `file(line): error tNNNN: message`, where
     * NNNN is the code plus 1000. Warnings do not count as errors.
     *
     * @param {FileLocation} location Where.
     * @param {number} errorCode An `ErrorCode` value.
     * @param {Array<*>} args Format arguments.
     */
    _ShowMessageImpl(location, errorCode, args)
    {
        const fileName = location.fileName.ToString();
        let head;
        if (WARNINGS.has(errorCode))
        {
            head = `${fileName}(${location.lineNumber | 0}): warning t${errorCode + 1000}: `;
        }
        else
        {
            head = `${fileName}(${location.lineNumber | 0}): error t${errorCode + 1000}: `;
            this._hasErrors = true;
        }
        let text;
        if (errorCode === ParserState.ErrorCode.EC_CUSTOM_ERROR || errorCode === ParserState.ErrorCode.EC_CUSTOM_WARNING)
        {
            text = format(String(args[0]), args.slice(1));
        }
        else
        {
            text = format(ERROR_MESSAGES[errorCode], args);
        }
        // Bug (ParserState.cpp:1151; Carbon known defect CE-83): both parts are
        // formatted into 2048-character buffers. Past that MSVC's `sprintf_s`
        // aborts and `snprintf` truncates, so it throws here.
        if (head.length >= 2048 || text.length >= 2048)
        {
            throw new RangeError("ParserState: message overflows its 2048-character buffer (Carbon known defect CE-83)");
        }
        this._messages.AddMessage(head + text + "\n");
    }

    /** @param {ASTNode} node Kept until the next statement or declaration list takes it. */
    AddOfflineStatement(node)
    {
        this._offlineStatements.AddChild(node);
    }

    /** @param {ASTNode} to Receives the pending offline statements. */
    MoveOfflineStatements(to)
    {
        this._offlineStatements.MoveChildren(to);
    }

    /** @param {ASTNode} root The program node. */
    SetTree(root)
    {
        this._root = root;
    }

    /** @returns {number} Carbon's `GetStreamPosition`: the cursor in the current file or macro. */
    GetStreamPosition()
    {
        return this._fileStack[this._fileStack.length - 1].position;
    }

    /**
     * Assigns Carbon's `GetStreamPosition()` reference.
     *
     * @param {number} position The new cursor.
     */
    SetStreamPosition(position)
    {
        this._fileStack[this._fileStack.length - 1].position = position;
    }

    /** @returns {number} Carbon's `GetStreamEnd`. */
    GetStreamEnd()
    {
        return this._fileStack[this._fileStack.length - 1].code.end;
    }

    /**
     * Not in Carbon: the range being scanned. Carbon's scanner reads through
     * the `const char*&` that `GetStreamPosition` returns; a JavaScript
     * position is an offset, so the scanner also needs the buffer it is into.
     *
     * @returns {InlineString} The range; the scanner reads its buffer.
     */
    GetStreamCode()
    {
        return this._fileStack[this._fileStack.length - 1].code;
    }

    /** @returns {boolean} Whether a macro body or argument is being read. */
    InMacro()
    {
        return this._fileStack[this._fileStack.length - 1].isMacro;
    }

    /**
     * Carbon's `ParserState::IncludeFile`: pushes an included file.
     *
     * @param {InlineString} fileName The path with its quotes or brackets.
     */
    IncludeFile(fileName)
    {
        const path = InlineString.makeInlineString__StartEnd(fileName.buffer, fileName.start + 1, fileName.end - 1).ToString();
        const top = this._fileStack[this._fileStack.length - 1];
        const file = this._includeHandler ? this._includeHandler.Open(path, { buffer: top.code.buffer, offset: top.code.start + 1 }) : null;
        if (file)
        {
            const fullPath = this.AllocateString(file.fullPath);
            const contents = new FileContents();
            contents.location = new FileLocation(0, InlineString.makeInlineString__StartEnd(fullPath, 0, file.fullPath.length));
            contents.code = InlineString.makeInlineString__StartEnd(file.data, 0, file.data.text.length);
            this._fileStack.push(contents);
        }
        else
        {
            this.ShowMessage(ParserState.ErrorCode.EC_FILE_NOT_FOUND, path);
        }
    }

    /**
     * Carbon's `ParserState::ParseDefine`: pushes a macro's body, with its
     * arguments bound to its parameter names.
     *
     * @param {PreprocessorDefine} define The macro.
     * @param {FileLocation} location Where it is used.
     * @param {InlineString[]} args Argument ranges.
     */
    ParseDefine(define, location, args)
    {
        const argumentMap = new Map();
        for (let i = 0; i < define.parameters.length; ++i)
        {
            const def = new PreprocessorDefine();
            def.value = args[i];
            argumentMap.set(define.parameters[i].ToString(), def);
        }
        const contents = new FileContents();
        contents.location = location.Copy();
        contents.code = define.value;
        contents.position = define.value.start;
        contents.isMacro = true;
        contents.arguments = argumentMap;
        this._fileStack.push(contents);
    }

    /**
     * Carbon's `ParserState::FindDefine`: a parameter of the macro being read,
     * else a `#define`.
     *
     * @param {InlineString} name The identifier.
     * @returns {PreprocessorDefine|null} The definition.
     */
    FindDefine(name)
    {
        const key = name.ToString();
        const argument = this._fileStack[this._fileStack.length - 1].arguments.get(key);
        if (argument !== undefined)
        {
            return argument;
        }
        return this.defines.get(key) ?? null;
    }

    /**
     * Carbon's `ParserState::AddPragma`. Outside permutation discovery,
     * permutation pragmas are dropped.
     *
     * @param {InlineString} string The pragma's text.
     */
    AddPragma(string)
    {
        const pragma = new Pragma();
        pragma.pragma = string;
        pragma.location = this.GetCurrentLocation().Copy();
        if (!this._inDiscoverMode)
        {
            if (IsPermutationPragma(pragma.pragma.ToString()))
            {
                return;
            }
        }
        this._pragmas.push(pragma);
    }

    /** Carbon's `ParserState::ResetPragmaUsage`. */
    ResetPragmaUsage()
    {
        for (const pragma of this._pragmas)
        {
            pragma.used = false;
        }
    }

    /**
     * Carbon's `ParserState::GetPragma`: the first unused pragma of the file at
     * or before a line.
     *
     * @param {FileLocation} location The line.
     * @param {{ value: InlineString|null }} string Receives the pragma.
     * @returns {boolean} Whether one was found; it is then marked used.
     */
    GetPragma(location, string)
    {
        for (const pragma of this._pragmas)
        {
            if (!pragma.used && pragma.location.fileName.Equals(location.fileName) && pragma.location.lineNumber <= location.lineNumber)
            {
                string.value = pragma.pragma;
                pragma.used = true;
                return true;
            }
        }
        return false;
    }

    /** @returns {Set<import("../SymbolTable/Symbol.js").Symbol>} The DX9 `tex*` intrinsics. */
    GetDX9TextureFunctions()
    {
        return this._dx9TextureFunctions;
    }

    /** @returns {Map<string, import("../SymbolTable/Symbol.js").Symbol>} The intrinsics by name. */
    GetDX9Functions()
    {
        return this._dx9Functions;
    }

    /**
     * Carbon's `NewNode( int )`: a node with no token, at the current location
     * and scope.
     *
     * @param {number} nodeType An `ASTNodeType` value.
     * @returns {ASTNode} The node.
     */
    NewNode(nodeType)
    {
        return new ASTNode(nodeType, this.GetCurrentLocation(), this.GetSymbolTable().GetCurrentScope(), null);
    }

    /**
     * Carbon's `NewNode( int, const ScannerToken& )`: a node with a copy of a
     * token, at the current location and scope.
     *
     * @param {number} nodeType An `ASTNodeType` value.
     * @param {ScannerToken} token The node's token.
     * @returns {ASTNode} The node.
     */
    NewNode__Token(nodeType, token)
    {
        return new ASTNode(nodeType, this.GetCurrentLocation(), this.GetSymbolTable().GetCurrentScope(), token);
    }

    /**
     * Carbon's `ParserState::AddBindlessSampler`.
     *
     * @param {import("../SymbolTable/Symbol.js").Symbol} name The sampler's symbol.
     * @param {ASTNode} definition A copy of its declaration.
     */
    AddBindlessSampler(name, definition)
    {
        const sampler = new SamplerDefinition();
        sampler.name = name;
        sampler.definition = definition;
        this.bindlessSamplers.push(sampler);
    }

    /** Carbon's public nested `ParserState::SamplerDefinition`. */
    static SamplerDefinition = SamplerDefinition;

    /** Carbon ParserState::FileContents (private, ParserState.h:274-281). */
    static FileContents = FileContents;

    /** Carbon ParserState::Pragma (private, ParserState.h:284-289). */
    static Pragma = Pragma;

    // Source: trinity/shadercompiler/ParserState.h

    /**
     * Carbon's `PreprocessorTokenType`.
     */
    static PreprocessorTokenType = Object.freeze({
        PPT_ID: 0,
        PPT_INT_CONST: 1,
        PPT_FLOAT_CONST: 2,
        PPT_CHAR_CONST: 3,
        PPT_STRING_CONST: 4,
        PPT_OPERATOR: 5,
        PPT_PP_OPERATOR: 6
    });

    // Source: trinity/shadercompiler/ParserState.h

    /**
     * Carbon's `PreprocessorScanResult`.
     */
    static PreprocessorScanResult = Object.freeze({
        PPSR_ERROR: 0,
        PPSR_EOF: 1,
        PPSR_OK: 2
    });

    // Source: trinity/shadercompiler/ParserState.h

    /**
     * Carbon's `ErrorCode`, in declaration order. A message is reported as
     * `error t<code + 1000>`, so the numbering is part of the output.
     */
    static ErrorCode = Object.freeze({
        EC_SYNTAX_ERROR: 0,
        EC_UNEXPECTED_EOF: 1,
        EC_UNEXPECTED_CHARACTER: 2,
        EC_UNDECLARED_IDENTIFIER: 3,
        EC_IDENTIFIER_REDEFINITION: 4,
        EC_PARAMETER_REDEFINITION: 5,
        EC_INVALID_PACK_OFFSET: 6,
        EC_INVALID_REGISTER: 7,
        EC_NO_TECHNIQUE: 8,
        EC_ANNOTATION_TYPE_MISMATCH: 9,
        EC_REGISTER_ASSIGNMENT_DEPRECATED: 10,
        EC_NO_OVERRIDE: 11,

        EC_INVALID_INDEXING: 12,
        EC_INVALID_SUBSCRIPT: 13,
        EC_TYPE_MISMATCH: 14,
        EC_INT_TYPE_REQUIRED: 15,
        EC_SCALAR_VECTOR_TYPE_REQUIRED: 16,
        EC_INVALID_CAST: 17,

        EC_INVALID_STATE: 18,
        EC_INVALID_STATE_VALUE: 19,
        EC_UNSUPPORTED_TYPE: 20,
        EC_UNINITIALIZED_VAR: 21,
        EC_STRUCTS_NOT_SUPPORTED: 22,
        EC_INVALID_IMPLICIT_CAST: 23,
        EC_OPERATOR_TYPE_MISMATCH: 24,
        EC_SIDE_EFFECT_IN_STATE_ASSIGMENT: 25,
        EC_INDEX_OUT_OF_RANGE: 26,
        EC_INVALID_SWIZZLE: 27,
        EC_FUNCTIONS_NOT_SUPPORTED: 28,
        EC_OPERATOR_NOT_SUPPORTED: 29,
        EC_INCORRECT_NUMBER_OF_ARGS: 30,

        EC_MISMATCHED_SAMPLER_TYPE: 31,
        EC_MISMATCHED_TEXTURE_TYPE: 32,
        EC_SAMPLER_WITHOUT_TEXTURE: 33,

        EC_PREPROCESSOR_UNDEFINED_SYMBOL: 34,
        EC_PREPROCESSOR_MISPLACED_ELIF: 35,
        EC_PREPROCESSOR_MISPLACED_ELSE: 36,
        EC_PREPROCESSOR_MISPLACED_ENDIF: 37,
        EC_FILE_NOT_FOUND: 38,
        EC_EOF_IN_MACRO: 39,
        EC_INCORRECT_MACRO_PARAMETER_COUNT: 40,
        EC_INVALID_INCLUDE_PATH: 41,
        EC_UNEXPECTED_EOL: 42,
        EC_USER_ERROR: 43,
        EC_STATE_DEPRECATED: 44,
        EC_MULTIPLE_REGISTER_BINDINGS: 45,
        EC_CUSTOM_ERROR: 46,
        EC_CUSTOM_WARNING: 47
    });

    /** Carbon's `ParserState::Mode`. */
    static Mode = Object.freeze({
        HLSL: 0,
        FX: 1
    });
}

/** The error codes reported as warnings; after the class, which owns the codes. */
const WARNINGS = new Set([
    ParserState.ErrorCode.EC_REGISTER_ASSIGNMENT_DEPRECATED,
    ParserState.ErrorCode.EC_MISMATCHED_TEXTURE_TYPE,
    ParserState.ErrorCode.EC_STATE_DEPRECATED,
    ParserState.ErrorCode.EC_SAMPLER_WITHOUT_TEXTURE,
    ParserState.ErrorCode.EC_CUSTOM_WARNING
]);

/**
 * The `%04i` number of the `AllocateName` formats.
 *
 * Bug (ParserState.cpp:862-874, :905-930; Carbon known defect CE-83): the
 * buffer is sized for exactly four digits. From the 10,000th allocated string
 * the name does not fit: MSVC's `sprintf_s` aborts, and `snprintf` on other
 * platforms truncates it to the name of an earlier symbol. Neither can be
 * reproduced as a value, so it throws.
 *
 * @param {number} count `m_strings.size()`.
 * @returns {string} The zero-padded number.
 */
function allocatedNumber(count)
{
    if (count > 9999)
    {
        throw new RangeError(`ParserState: allocated name number ${count} overflows its four-digit buffer (Carbon known defect CE-83)`);
    }
    return String(count).padStart(4, "0");
}

/**
 * Carbon's `IsPermutationPragma`: `permutation` followed by a non-alphanumeric.
 *
 * Quirk (ParserState.cpp:515-519; Carbon known defect CE-93): `_` is not
 * alphanumeric, so `#pragma permutation_x` counts as a permutation pragma and
 * then fails to parse as one.
 *
 * @param {string} pragma The pragma text.
 * @returns {boolean} Whether it declares a permutation.
 */
function IsPermutationPragma(pragma)
{
    return pragma.startsWith("permutation") && !/[A-Za-z0-9]/u.test(pragma.charAt("permutation".length));
}

const SPACE = "[ \\t\\n\\v\\f\\r]";
const PERMUTATION_EXPRESSION = new RegExp("^permutation" + SPACE + "*\\(" + SPACE + "*" +
    "([A-Za-z_][A-Za-z0-9_]*)" + SPACE + "*," + SPACE + "*" +
    "(?:values" + SPACE + "*=" + SPACE + "*)?" +
    "\\(" + SPACE + "*" +
    "([A-Za-z_][A-Za-z0-9_]*" + SPACE + "*(?:=" + SPACE + "*[0-9]+" + SPACE + "*)?" +
    "(?:," + SPACE + "*[A-Za-z_][A-Za-z0-9_]*" + SPACE + "*(?:=" + SPACE + "*[0-9]+" + SPACE + "*)?)+)" +
    SPACE + "*\\)" +
    "(?:" + SPACE + "*," + SPACE + "*(?:default" + SPACE + "*=" + SPACE + "*)?([A-Za-z_][A-Za-z0-9_]*))?" +
    "(?:" + SPACE + "*," + SPACE + "*(?:description" + SPACE + "*=" + SPACE + "*)?\"([^\"]*)\")?" +
    "(?:" + SPACE + "*," + SPACE + "*(?:type" + SPACE + "*=" + SPACE + "*)?([A-Za-z_][A-Za-z0-9_]*))?" +
    SPACE + "*\\)" + SPACE + "*$", "u");
const VALUE_EXPRESSION = new RegExp(SPACE + "*(?:," + SPACE + "*)?([A-Za-z_][A-Za-z0-9_]*)(?:" + SPACE + "*=" + SPACE + "*([0-9]+))?", "u");

/**
 * Carbon's `GetPermutationInfo`: parses
 * `permutation(NAME, (A, B = 3, ...), default, "description", static|dynamic)`.
 * Options without a value take the lowest unused value from 0.
 *
 * @param {string} pragma The pragma text.
 * @returns {Permutation|null} The axis, or null when the pragma is malformed.
 */
function GetPermutationInfo(pragma)
{
    const match = PERMUTATION_EXPRESSION.exec(pragma);
    if (!match)
    {
        return null;
    }
    const permutation = new Permutation();
    permutation.name = match[1];
    permutation.defaultOption = match[3] ?? "";
    permutation.description = match[4] ?? "";

    if (match[5] === "dynamic")
    {
        permutation.type = 1;
    }
    else if (match[5] === "static" || match[5] === undefined)
    {
        permutation.type = 0;
    }
    else
    {
        return null;
    }

    const takenValues = new Array(256).fill(false);
    const values = match[2];
    let begin = 0;
    while (true)
    {
        const found = VALUE_EXPRESSION.exec(values.slice(begin));
        if (!found)
        {
            break;
        }
        const opt = new PermutationOption();
        opt.name = found[1];
        opt.value = -1;
        if (found[2] !== undefined && found[2] !== "")
        {
            opt.value = Number.parseInt(found[2], 10);
            if (opt.value < 0 || opt.value > 255)
            {
                return null;
            }
            if (takenValues[opt.value])
            {
                return null;
            }
            takenValues[opt.value] = true;
        }
        permutation.options.push(opt);
        // Carbon advances by the match's length, not its end position.
        begin += found[0].length;
    }
    if (permutation.options.length > 256)
    {
        return null;
    }
    let next = 0;
    for (const option of permutation.options)
    {
        if (option.value < 0)
        {
            while (takenValues[next])
            {
                ++next;
            }
            option.value = next;
            takenValues[next] = true;
        }
    }
    if (permutation.defaultOption === "")
    {
        permutation.defaultOption = permutation.options[0].name;
    }
    else if (!permutation.options.some(option => option.name === permutation.defaultOption))
    {
        return null;
    }
    return permutation;
}

const TO_PREPROCESSOR = new Map([
    [T.OP_INT_CONST, PreprocessorTokens.PP_INT_CONST],
    [T.OP_ID, PreprocessorTokens.PP_ID],
    [T.OP_LEFT_PAREN, PreprocessorTokens.PP_LEFT_PAREN],
    [T.OP_RIGHT_PAREN, PreprocessorTokens.PP_RIGHT_PAREN],
    [T.OP_PLUS, PreprocessorTokens.PP_PLUS],
    [T.OP_DASH, PreprocessorTokens.PP_DASH],
    [T.OP_BANG, PreprocessorTokens.PP_BANG],
    [T.OP_TILDE, PreprocessorTokens.PP_TILDE],
    [T.OP_STAR, PreprocessorTokens.PP_STAR],
    [T.OP_SLASH, PreprocessorTokens.PP_SLASH],
    [T.OP_PERCENT, PreprocessorTokens.PP_PERCENT],
    [T.OP_LEFT_OP, PreprocessorTokens.PP_LEFT_OP],
    [T.OP_RIGHT_OP, PreprocessorTokens.PP_RIGHT_OP],
    [T.OP_LESS, PreprocessorTokens.PP_LESS],
    [T.OP_MORE, PreprocessorTokens.PP_MORE],
    [T.OP_LE_OP, PreprocessorTokens.PP_LE_OP],
    [T.OP_GE_OP, PreprocessorTokens.PP_GE_OP],
    [T.OP_EQ_OP, PreprocessorTokens.PP_EQ_OP],
    [T.OP_NE_OP, PreprocessorTokens.PP_NE_OP],
    [T.OP_AMPERSAND, PreprocessorTokens.PP_AMPERSAND],
    [T.OP_CARET, PreprocessorTokens.PP_CARET],
    [T.OP_VERTICAL_BAR, PreprocessorTokens.PP_VERTICAL_BAR],
    [T.OP_AND_OP, PreprocessorTokens.PP_AND_OP],
    [T.OP_OR_OP, PreprocessorTokens.PP_OR_OP],
    [T.OP_QUESTION, PreprocessorTokens.PP_QUESTION],
    [T.OP_COLON, PreprocessorTokens.PP_COLON]
]);

/**
 * Carbon's `ConvertToPreprocessorToken`: the `#if` grammar's token for a
 * parser token, or 0 when the token cannot appear in a condition.
 *
 * @param {number} type An `HLSLParserTokens` value.
 * @returns {number} A `PreprocessorTokens` value, or 0.
 */
function ConvertToPreprocessorToken(type)
{
    return TO_PREPROCESSOR.get(type) ?? 0;
}

CjsSchema.blue.define(ParserState, {
    className: "ParserState",
    methods: {
        _AddIntrinsics: [meta.renamed("AddIntrinsics")],
        _ParseMacroArguments: [meta.renamed("ParseMacroArguments")],
        InSkipMode: [blue.method],
        InDiscoverMode: [blue.method],
        _FindConcatOperator: [meta.renamed("FindConcatOperator")],
        GetPreprocessorToken: [blue.method],
        DiscoverPermutations: [blue.method],
        Parse: [blue.method],
        EvaluatePreprocessorCondition: [blue.method],
        HasErrors: [blue.method],
        GetTree: [blue.method],
        GetSymbolTable: [blue.method],
        GetCurrentLocation: [blue.method],
        AllocateName: [blue.method],
        AllocateName__Chars: [meta.renamed("AllocateName")],
        AllocateName__InlineString: [meta.renamed("AllocateName")],
        AllocateNameWithPrefix: [blue.method],
        AllocateNameWithPrefix__InlineString: [meta.renamed("AllocateNameWithPrefix")],
        AllocateString: [blue.method],
        ShowMessage: [blue.method],
        ShowMessage__Location: [meta.renamed("ShowMessage")],
        ShowMessage__Token: [meta.renamed("ShowMessage")],
        _ShowMessageImpl: [meta.renamed("ShowMessageImpl")],
        AddOfflineStatement: [blue.method],
        MoveOfflineStatements: [blue.method],
        SetTree: [blue.method],
        GetStreamPosition: [blue.method],
        GetStreamEnd: [blue.method],
        InMacro: [blue.method],
        IncludeFile: [blue.method],
        ParseDefine: [blue.method],
        FindDefine: [blue.method],
        AddPragma: [blue.method],
        ResetPragmaUsage: [blue.method],
        GetPragma: [blue.method],
        GetDX9TextureFunctions: [blue.method],
        GetDX9Functions: [blue.method],
        NewNode: [blue.method],
        NewNode__Token: [meta.renamed("NewNode")],
        AddBindlessSampler: [blue.method]
    }
});
