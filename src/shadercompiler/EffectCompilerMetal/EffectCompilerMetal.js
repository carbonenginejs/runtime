import { CjsSchema, blue, meta } from "#schema";
// Source: trinity/shadercompiler/EffectCompilerMetal.h
// Source: trinity/shadercompiler/EffectCompilerMetal.cpp
//
// Carbon's Metal effect compiler: parses an effect, rewrites its tree for
// Metal (constant buffers as structs, globals threaded through as function
// parameters, texture calls as Metal methods, one wrapper entry point per
// stage) and prints each stage as Metal Shading Language with OutputHLSL's
// MSL printer. The free functions below are file-local in Carbon (its
// anonymous namespace) and keep Carbon's names; overloads are split as
// `Name__Discriminator`.
//
// Adapted, and why:
//
// - CompileCode is a seam. Carbon writes the MSL to a temporary file and runs
//   Apple's `metal` tool (MetalTool, RunProcess) to get AIR bytes. A browser
//   cannot run a process and the tool is Apple's, so CompileCode returns the
//   MSL text itself: each stage's `shaderData` holds its Metal source (and
//   `source` holds it too, as in Carbon). Create() therefore has no
//   `metal --version` to run and returns true. RunProcess, MetalTool,
//   SplitString and DetectUnusedArguments (disabled in Carbon, M:4620-4621)
//   are not ported.
// - Carbon's globals: `g_messages` is the session's message queue, set for
//   the duration of CompileEffect (JavaScript runs one CompileEffect at a
//   time); `g_stringTable` handles are the strings themselves, which the
//   runtime's container writer interns.
// - Threads: Carbon's compile cache (`m_compiled`) is shared by worker
//   threads, guarded by `m_compiledCS` and per-entry condition variables. The
//   port's driver compiles permutations one after another, so the cache is a
//   plain Map and the `IWorkQueue` argument is not taken.
// - The YAML listing (`/listing`: PrintAnnotations, PrintStageInfo,
//   SanitizeCode) is not ported; the driver ports no listings either.
// - `std::map<Symbol*, ASTNode*>` iterates by heap address. The port's
//   `functions` Map iterates in the order CollectFunctions met the
//   definitions. Every walk of it below has an order-independent result.
// - Carbon's `assert`s are compiled out of the release tool and are not
//   checked here, except where a violated one would read outside an array or
//   through a null pointer, which is undefined: there the port throws.
//
// Not ported: the ray-tracing path (`technique { library ... }` and TraceRay):
// ClassifyRtShaderArguments, PatchRtShader, CreateGlobalInputsStruct,
// GetGlobalInputData, AddShaderTableArguments/CreateShaderTableArgument,
// GetStageData's rtConstantBuffers overload and CompileEffect's library loop
// (M:5224-5442). Each sits at its place in the flow below as a comment, and
// an effect that would reach one throws instead of compiling differently.

import { InlineString } from "../InlineString.js";
import { HLSLParserTokens } from "../hlslParserTokens.js";
import { ASTNode } from "../ASTNode/ASTNode.js";
import { Type } from "../Type.js";
import { ScannerToken } from "../ParserState/ScannerToken.js";
import { ParserState } from "../ParserState/ParserState.js";
import { PreprocessorDefine } from "../ParserState/PreprocessorDefine.js";
import { CjsFxStdMap } from "../CjsFxStdMap.js";
import { Symbol } from "../SymbolTable/Symbol.js";
import { RegisterSpecifier } from "../SymbolTable/RegisterSpecifier.js";
import {
    SortProgramNodes, MarkUsedSymbols, GetCBufferIndex, GetCBufferIndex__Symbol, IsUniformInputArgument, ParseFloat,
    ParseNumber, ParseString, NewStruct, NewVarIdentifier, NewDot__Symbol, NewDot__InlineString, NewBinaryExpression,
    NewVarDeclaration__Type, NewExpressionStatement, NewReturn, NewFunctionParameter
} from "../ParserUtils/parserUtils.js";
import {
    g_renderStateNames, g_renderStates, ParseStateAssignment, GetSamplerState, ConvertToStaticSampler, EvaluateInitializer
} from "../FXAnalyzer/fxAnalyzer.js";
import { CompilerInputStream } from "../OutputHLSL/CompilerInputStream.js";
import { WriteMSL } from "../OutputHLSL/outputHLSL.js";
import { D3D11_TEXTURE_ADDRESS_MODE } from "../stdafx.js";
import { Constant } from "../EffectData/Constant.js";
import { Texture } from "../EffectData/Texture.js";
import { Uav } from "../EffectData/Uav.js";
import { Sampler } from "../EffectData/Sampler.js";
import { StaticSampler } from "../EffectData/StaticSampler.js";
import { PipelineInputDescription } from "../EffectData/PipelineInputDescription.js";
import { RegisterInputDescription } from "../EffectData/RegisterInputDescription.js";
import { Annotation } from "../EffectData/Annotation.js";
import { ParameterAnnotation } from "../EffectData/ParameterAnnotation.js";
import { StageInput } from "../EffectData/StageInput.js";
import { Pass } from "../EffectData/Pass.js";
import { Technique } from "../EffectData/Technique.js";
import { TransferSRGBToTexturesDX11, ConvertTextureFunctionsToMetal, BindlessTextureType } from "../TextureFunctionConversionDX11/index.js";
import { MetalRegister } from "./MetalRegister.js";
import { MetalSystemSemanticsType } from "./MetalSystemSemanticsType.js";
import { MSL_INCLUDE } from "./mslInclude.js";
import { AtomicFn } from "./AtomicFn.js";
import { SyncData } from "./SyncData.js";
import { SymbolTable } from "../SymbolTable/SymbolTable.js";
import { CodeStream } from "../OutputHLSL/CodeStream.js";

const T = HLSLParserTokens;
const N = ASTNode.ASTNodeType;
const { DISALOW_OVERRIDES, ALLOW_OVERRIDES } = SymbolTable.OverrideBehavior;

// Values below must be synchronized with (propagated from) TrinityAL/metal/MetalWorkQueue.h
const METAL_MAX_BOUND_BUFFERS = 31;
const METAL_MAX_BOUND_TEXTURES = 31; // 31+ on iOS, 128 on macOS
const METAL_MAX_BOUND_SAMPLERS = 16;

const METAL_VERTEX_STREAM_BUFFER_COUNT = 4;

// Carbon's METAL_MAX_VERTEX_STREAMS, METAL_MAX_RENDER_TARGETS and
// METAL_BUFFER_COUNT are read only by asserts, and the five ray-tracing slots
// (METAL_INTERSECTION_FUNCTION_TABLE_SLOT ...) only by the ray-tracing path.

/**
 * Carbon's `g_messages` while a CompileEffect runs: the session's queue.
 *
 * @type {import("../CompileMessageQueue.js").CompileMessageQueue|null}
 */
let g_messages = null;

/**
 * Carbon's `operator<<( CodeStream&, const AtomicFn& )`: the eight
 * `Interlocked<op>` overloads (threadgroup and device, uint and int, with and
 * without the original value) over `atomic_fetch_<op>_explicit`.
 *
 * @param {import("../OutputHLSL/CodeStream.js").CodeStream} os The stream.
 * @param {AtomicFn} afun The operation.
 * @returns {import("../OutputHLSL/CodeStream.js").CodeStream} The stream.
 */
function WriteAtomicFn(os, afun)
{
    const h = afun.opHlsl;
    const m = afun.opMsl;
    os.Write(`void Interlocked${h}(threadgroup uint& dest, uint value, thread uint& original_value) {original_value = atomic_fetch_${m}_explicit((threadgroup atomic_uint*)&dest, value, memory_order_relaxed);}\n\n`);
    os.Write(`void Interlocked${h}(threadgroup uint& dest, uint value) {atomic_fetch_${m}_explicit((threadgroup atomic_uint*)&dest, value, memory_order_relaxed);}\n\n`);
    os.Write(`void Interlocked${h}(threadgroup int& dest, int value, thread int& original_value) {original_value = atomic_fetch_${m}_explicit((threadgroup atomic_int*)&dest, value, memory_order_relaxed);}\n\n`);
    os.Write(`void Interlocked${h}(threadgroup int& dest, int value) {atomic_fetch_${m}_explicit((threadgroup atomic_int*)&dest, value, memory_order_relaxed);}\n\n`);
    os.Write(`void Interlocked${h}(device uint& dest, uint value, thread uint& original_value) {original_value = atomic_fetch_${m}_explicit((device atomic_uint*)&dest, value, memory_order_relaxed);}\n\n`);
    os.Write(`void Interlocked${h}(device uint& dest, uint value) {atomic_fetch_${m}_explicit((device atomic_uint*)&dest, value, memory_order_relaxed);}\n\n`);
    os.Write(`void Interlocked${h}(device int& dest, int value, thread int& original_value) {original_value = atomic_fetch_${m}_explicit((device atomic_int*)&dest, value, memory_order_relaxed);}\n\n`);
    os.Write(`void Interlocked${h}(device int& dest, int value) {atomic_fetch_${m}_explicit((device atomic_int*)&dest, value, memory_order_relaxed);}\n\n`);
    return os;
}

/**
 * Carbon's `PatchStdlibFunctions`: renames the intrinsics whose Metal names
 * differ, in the symbol table, so every call prints the Metal name.
 *
 * @param {ParserState} state The parse.
 */
function PatchStdlibFunctions(state)
{
    let symbol = state.GetSymbolTable().Lookup(InlineString.makeInlineString("lerp"));
    symbol.name = InlineString.makeInlineString("mix");

    symbol = state.GetSymbolTable().Lookup(InlineString.makeInlineString("frac"));
    symbol.name = InlineString.makeInlineString("fract");

    symbol = state.GetSymbolTable().Lookup(InlineString.makeInlineString("ddx"));
    symbol.name = InlineString.makeInlineString("dfdx");

    symbol = state.GetSymbolTable().Lookup(InlineString.makeInlineString("ddy"));
    symbol.name = InlineString.makeInlineString("dfdy");

    symbol = state.GetSymbolTable().Lookup(InlineString.makeInlineString("atan2"));
    symbol.name = InlineString.makeInlineString("precise::atan2");
}

/**
 * Carbon's `ReplaceFloatModulo`: `a % b` with a float scalar or vector right
 * operand becomes a call to `fmod( a, b )`.
 *
 * @param {ParserState} state The parse.
 */
function ReplaceFloatModulo(state)
{
    state.GetTree().Map(node =>
    {
        if (node.GetNodeType() === N.NT_EXPRESSION && node.GetToken().type === T.OP_PERCENT)
        {
            if (node.GetChild(1).GetType().IsScalarOrVector() && node.GetChild(1).GetType().builtInType === T.OP_FLOAT)
            {
                const token = ScannerToken.id(InlineString.makeInlineString("fmod"), node.GetLocation());
                const call = new ASTNode(N.NT_FUNCTION_CALL, node.GetLocation(), node.GetScope(), token);
                call.AddChild(node.GetChild(0));
                call.AddChild(node.GetChild(1));
                const diagnosticMessage = { value: "" };
                const symbol = state.GetSymbolTable().LookupFunction(token.stringValue, call, diagnosticMessage);
                if (symbol)
                {
                    if (symbol.intrinsicType)
                    {
                        call.SetType(symbol.intrinsicType(call, -1));
                    }
                    else
                    {
                        call.SetType(symbol.type);
                    }
                    call.SetSymbol(symbol);
                    return call;
                }
            }
        }
        return node;
    });
}

/**
 * Carbon's `ConvertSyncFunctionsToMetal( ASTNode* )`: renames
 * `GroupMemoryBarrierWithGroupSync` to `threadgroup_barrier` and gives each
 * call the `mem_flags::mem_threadgroup` argument.
 *
 * The rename is on the shared symbol, so after the first call every later
 * call is matched by its new name.
 *
 * @param {ASTNode|null} node The subtree.
 */
function ConvertSyncFunctionsToMetal__Node(node)
{
    if (!node)
    {
        return;
    }

    if (node.GetNodeType() === N.NT_FUNCTION_CALL)
    {
        const symbol = node.GetSymbol();
        if (symbol)
        {
            if (symbol.name.Equals__Chars("GroupMemoryBarrierWithGroupSync") ||
                symbol.name.Equals__Chars("threadgroup_barrier"))
            {
                symbol.name = InlineString.makeInlineString("threadgroup_barrier");

                const token = new ScannerToken();
                token.type = T.OP_IN;
                token.stringValue = InlineString.makeInlineString("mem_flags::mem_threadgroup");
                token.fileLocation = node.GetLocation().Copy();

                const arg = new ASTNode(N.NT_CONSTANT, node.GetLocation(), node.GetScope(), token);

                node.AddChild(arg);

                return;
            }
        }
    }

    for (let i = 0, n = node.GetChildrenCount(); i < n; ++i)
    {
        const child = node.GetChild(i);
        ConvertSyncFunctionsToMetal__Node(child);
    }
}

/**
 * Carbon's `ConvertSyncFunctionsToMetal( std::map<Symbol*, ASTNode*>& )`:
 * converts the barrier calls in every function body.
 *
 * @param {Map<Symbol, ASTNode>} functions Function symbol to definition.
 */
function ConvertSyncFunctionsToMetal(functions)
{
    for (const node of functions.values())
    {
        const body = node.GetChild(1);

        ConvertSyncFunctionsToMetal__Node(body);
    }
}

/**
 * Carbon's `CollectFunctions`: maps each function defined at program scope
 * to its definition.
 *
 * @param {ParserState} state The parse.
 * @param {Map<Symbol, ASTNode>} functions Receives function symbol to definition.
 */
function CollectFunctions(state, functions)
{
    const root = state.GetTree();
    if (!root)
    {
        return;
    }

    for (let i = 0, n = root.GetChildrenCount(); i < n; ++i)
    {
        const node = root.GetChild(i);
        if (node && node.GetNodeType() === N.NT_FUNCTION_DEFINITION)
        {
            const header = node.GetChild(0);

            functions.set(header.GetSymbol(), node);
        }
    }
}

/**
 * Carbon's `AddStructDotPrefix`: every reference to a member of
 * `structMembers` becomes `symbol.member`.
 *
 * @param {ASTNode} node The subtree.
 * @param {Set<Symbol>} structMembers The members' symbols.
 * @param {Symbol} symbol The struct variable to prefix with.
 */
function AddStructDotPrefix(node, structMembers, symbol)
{
    for (let i = 0, n = node.GetChildrenCount(); i < n; ++i)
    {
        const childNode = node.GetChild(i);
        if (!childNode)
        {
            continue;
        }

        if (childNode.GetNodeType() === N.NT_VAR_IDENTIFIER)
        {
            if (structMembers.has(childNode.GetSymbol()))
            {
                const token = new ScannerToken();
                token.type = T.OP_DOT;

                const prefix = new ASTNode(N.NT_VAR_IDENTIFIER, childNode.GetLocation(), childNode.GetScope(), null);
                prefix.SetSymbol(symbol);

                const dotNode = new ASTNode(N.NT_POSTFIX_EXPRESSION, childNode.GetLocation(), childNode.GetScope(), token);
                dotNode.AddChild(prefix);
                dotNode.AddChild(childNode);
                dotNode.SetType(childNode.GetType());

                node.ReplaceChild(i, dotNode);
            }
        }

        AddStructDotPrefix(childNode, structMembers, symbol);
    }
}

/**
 * Carbon's `AddFunctionArgument( ASTNode*, const Symbol*, Symbol* )`: every
 * call of `functionSymbol` in the subtree gets `arg` as its first argument.
 *
 * @param {ASTNode} parent The subtree.
 * @param {Symbol} functionSymbol The called function.
 * @param {Symbol} arg The argument's variable.
 */
function AddFunctionArgument__Node(parent, functionSymbol, arg)
{
    for (let i = 0, n = parent.GetChildrenCount(); i < n; ++i)
    {
        const node = parent.GetChild(i);
        if (!node)
        {
            continue;
        }

        if (node.GetNodeType() === N.NT_FUNCTION_CALL &&
            node.GetSymbol() === functionSymbol)
        {
            const child = new ASTNode(N.NT_VAR_IDENTIFIER, node.GetLocation(), node.GetScope(), null);
            child.SetSymbol(arg);

            node.InsertChild(0, child);
        }

        AddFunctionArgument__Node(node, functionSymbol, arg);
    }
}

/**
 * Carbon's `AddFunctionArgument( std::map<Symbol*, ASTNode*>&, ... )`: as
 * the node overload, over every function body.
 *
 * @param {Map<Symbol, ASTNode>} functions Function symbol to definition.
 * @param {Symbol} functionSymbol The called function.
 * @param {Symbol} arg The argument's variable.
 */
function AddFunctionArgument(functions, functionSymbol, arg)
{
    for (const node of functions.values())
    {
        const body = node.GetChild(1);

        AddFunctionArgument__Node(body, functionSymbol, arg);
    }
}

/**
 * Carbon's `SearchFunctionsForGlobals( ASTNode*, ... )`: whether the subtree
 * reads a member of `structMembers`, directly or through a function it calls.
 * Functions it searches on the way are filed as using globals or not.
 *
 * @param {ASTNode} node The subtree.
 * @param {Set<Symbol>} structMembers The members' symbols.
 * @param {Map<Symbol, ASTNode>} functions Function symbol to definition.
 * @param {Map<Symbol, ASTNode>} functionsWithGlobals Functions found to use the members.
 * @param {Map<Symbol, ASTNode>} functionsWithoutGlobals Functions found not to.
 * @returns {boolean} Whether a member is used.
 */
function SearchFunctionsForGlobals__Node(node, structMembers, functions, functionsWithGlobals, functionsWithoutGlobals)
{
    for (let i = 0, n = node.GetChildrenCount(); i < n; ++i)
    {
        const childNode = node.GetChild(i);
        if (!childNode)
        {
            continue;
        }

        if (childNode.GetNodeType() === N.NT_VAR_IDENTIFIER)
        {
            const symbol = childNode.GetSymbol();

            if (structMembers.has(symbol))
            {
                return true;
            }
        }
        else if (childNode.GetNodeType() === N.NT_FUNCTION_CALL)
        {
            const symbol = childNode.GetSymbol();
            if (symbol)
            {
                if (functionsWithGlobals.has(symbol))
                {
                    // The function was aready marked as using globals.
                    return true;
                }
                else if (!functionsWithoutGlobals.has(symbol))
                {
                    // If the function wasn't found in both lists it means either it was not checked yet
                    // or it's a standard library function.
                    const definition = functions.get(symbol);
                    if (definition !== undefined)
                    {
                        const body = definition.GetChild(1);

                        const found = SearchFunctionsForGlobals__Node(body, structMembers, functions, functionsWithGlobals, functionsWithoutGlobals);
                        if (found)
                        {
                            if (!functionsWithGlobals.has(symbol))
                            {
                                functionsWithGlobals.set(symbol, definition);
                            }
                            return true;
                        }
                        else
                        {
                            if (!functionsWithoutGlobals.has(symbol))
                            {
                                functionsWithoutGlobals.set(symbol, definition);
                            }
                        }
                    }
                }
            }
        }

        // Search child nodes.
        const found = SearchFunctionsForGlobals__Node(childNode, structMembers, functions, functionsWithGlobals, functionsWithoutGlobals);
        if (found)
        {
            return true;
        }
    }
    return false;
}

/**
 * Carbon's `SearchFunctionsForGlobals( const std::set<Symbol*>&, ... )`:
 * files every function as using a member of `structMembers` or not.
 *
 * @param {Set<Symbol>} structMembers The members' symbols.
 * @param {Map<Symbol, ASTNode>} functions Function symbol to definition.
 * @param {Map<Symbol, ASTNode>} functionsWithGlobals Receives the functions that use the members.
 * @param {Map<Symbol, ASTNode>} functionsWithoutGlobals Receives the functions that do not.
 */
function SearchFunctionsForGlobals(structMembers, functions, functionsWithGlobals, functionsWithoutGlobals)
{
    for (const [symbol, node] of functions)
    {
        // Is already processed?
        if (functionsWithGlobals.has(symbol) || functionsWithoutGlobals.has(symbol))
        {
            continue;
        }

        const body = node.GetChild(1);

        const found = SearchFunctionsForGlobals__Node(body, structMembers, functions, functionsWithGlobals, functionsWithoutGlobals);
        if (found)
        {
            functionsWithGlobals.set(symbol, node);
        }
        else
        {
            functionsWithoutGlobals.set(symbol, node);
        }
    }
}

/**
 * Carbon's `PatchGlobalsInFunctions`: every function that uses a member of a
 * struct of globals gets an `inout` parameter of that struct, in the
 * `constant` address space with the struct's register, as its first
 * parameter; its callers pass it on, and member references become
 * `globalsName.member`.
 *
 * @param {Map<Symbol, ASTNode>} functions Function symbol to definition.
 * @param {Symbol} typeSymbol The struct type.
 * @param {InlineString} globalsName The parameter's name.
 * @param {Set<Symbol>} structMembers The members' symbols.
 */
function PatchGlobalsInFunctions(functions, typeSymbol, globalsName, structMembers)
{
    const functionsWithGlobals = new Map();
    const functionsWithoutGlobals = new Map();

    SearchFunctionsForGlobals(structMembers, functions, functionsWithGlobals, functionsWithoutGlobals);

    const token = new ScannerToken();
    token.type = T.OP_INOUT;

    for (const node of functionsWithGlobals.values())
    {
        const header = node.GetChild(0);

        const body = node.GetChild(1);

        const symbol = node.GetScope().AddSymbol(globalsName, DISALOW_OVERRIDES);
        if (!symbol)
        {
            // Carbon dereferences the null symbol AddSymbol returns for a name
            // the function's scope already has.
            throw new TypeError(`PatchGlobalsInFunctions: ${globalsName.ToString()} already exists in the function's scope (null dereference in Carbon)`);
        }
        symbol.type.FromSymbol(typeSymbol);
        symbol.addressSpace = Symbol.AddressSpace.Constant;
        symbol.registerSpecifier = copyRegisterSpecifiers(typeSymbol.registerSpecifier);

        token.fileLocation = header.GetLocation().Copy();

        const type = new Type();
        type.FromSymbol(typeSymbol);

        const globalsParam = new ASTNode(N.NT_FUNCTION_PARAMETER, header.GetLocation(), header.GetScope(), token);
        globalsParam.SetType(type);
        globalsParam.SetSymbol(symbol);

        header.InsertChild(0, globalsParam);

        AddFunctionArgument(functionsWithGlobals, header.GetSymbol(), symbol);

        AddStructDotPrefix(body, structMembers, symbol);
    }
}

/**
 * Carbon's `IsGlobalVarUsed`: whether the subtree, or a function it calls,
 * refers to a symbol named `name`.
 *
 * @param {Map<Symbol, ASTNode>} functions Function symbol to definition.
 * @param {InlineString} name The global's name.
 * @param {ASTNode} node The subtree.
 * @returns {boolean} Whether the name is used.
 */
function IsGlobalVarUsed(functions, name, node)
{
    for (let i = 0, n = node.GetChildrenCount(); i < n; ++i)
    {
        const childNode = node.GetChild(i);
        if (!childNode)
        {
            continue;
        }

        if (childNode.GetSymbol() &&
            childNode.GetSymbol().name.Equals(name))
        {
            return true;
        }

        const isUsed = IsGlobalVarUsed(functions, name, childNode);
        if (isUsed)
        {
            return true;
        }

        // Recursively search in functions.
        if (childNode.GetNodeType() === N.NT_FUNCTION_CALL &&
            childNode.GetSymbol())
        {
            const definition = functions.get(childNode.GetSymbol());
            if (definition !== undefined)
            {
                const body = definition.GetChild(1);

                if (IsGlobalVarUsed(functions, name, body))
                {
                    return true;
                }
            }
        }
    }

    return false;
}

/**
 * Carbon's `AddUsedGlobalsAsFunctionParams`: every function that uses one of
 * `globals` (directly or through a callee) gets it as a new first parameter,
 * and every call of the function passes it. Structs are `constant` (or
 * `threadgroup` when groupshared) and passed `inout` unless they are arrays;
 * buffers, acceleration structures and arrays of textures or samplers are
 * `device`; groupshared values are `threadgroup`.
 *
 * The parameter copies the global's type only, not its register bindings.
 *
 * Quirk (EffectCompilerMetal.cpp:495-507; Carbon known defect CE-113): so an
 * explicit `register(tN)`, `register(sN)` or `register(uN)` on a global
 * texture, sampler or buffer is dropped, and `AutoAssignRegisters` places it
 * in the first free slot: `Texture2D t : register(t5);` is `[[ texture(0) ]]`
 * and is recorded at register 0. Reproduced.
 *
 * @param {Map<Symbol, ASTNode>} functions Function symbol to definition.
 * @param {ASTNode[]} globals The globals' `NT_NAME_DECLARATION` nodes.
 */
function AddUsedGlobalsAsFunctionParams(functions, globals)
{
    for (const node of functions.values())
    {
        const header = node.GetChild(0);

        const body = node.GetChild(1);

        for (const globalIt of globals)
        {
            const varSymbol = globalIt.GetSymbol();
            const type = varSymbol.type;

            const used = IsGlobalVarUsed(functions, varSymbol.name, body);
            if (used)
            {
                const token = new ScannerToken();
                token.type = T.OP_IN;
                token.fileLocation = header.GetLocation().Copy();

                let symbol = node.GetScope().AddSymbol(varSymbol.name, DISALOW_OVERRIDES);

                // If symbol is null it means the function already has a parameter with such name.
                if (!symbol)
                {
                    // Make sure the existing symbol has the same type we expect.
                    symbol = node.GetScope().Lookup(varSymbol.name);

                    continue;
                }

                symbol.type = type.Copy();

                // Textures and samplers do not need an address space attribute.
                if (type.symbol &&
                    type.symbol.definition &&
                    type.symbol.definition.GetNodeType() === N.NT_STRUCT)
                {
                    if (type.storageClass === T.OP_GROUPSHARED)
                    {
                        symbol.addressSpace = Symbol.AddressSpace.Threadgroup;
                    }
                    else
                    {
                        symbol.addressSpace = Symbol.AddressSpace.Constant;
                    }

                    if (varSymbol.type.symbol && type.arrayDimensions === 0)
                    {
                        token.type = T.OP_INOUT;
                    }
                }
                else
                {
                    switch (type.builtInType)
                    {
                        case T.OP_BUFFER:
                        case T.OP_STRUCTUREDBUFFER:
                        case T.OP_RWBUFFER:
                        case T.OP_RWSTRUCTUREDBUFFER:
                        case T.OP_RAYTRACING_ACCELERATION_STRUCTURE:
                            symbol.addressSpace = Symbol.AddressSpace.Device;
                            break;
                        default:
                            if (type.arrayDimensions && (type.IsTexture() || type.IsSampler()))
                            {
                                symbol.addressSpace = Symbol.AddressSpace.Device;
                            }
                            else if (type.storageClass === T.OP_GROUPSHARED)
                            {
                                symbol.addressSpace = Symbol.AddressSpace.Threadgroup;
                                if (type.arrayDimensions === 0)
                                {
                                    token.type = T.OP_INOUT;
                                }
                            }
                            break;
                    }
                }

                const param = new ASTNode(N.NT_FUNCTION_PARAMETER, header.GetLocation(), header.GetScope(), token);
                param.SetType(varSymbol.type);
                param.SetSymbol(symbol);

                const bracketList = globalIt.GetChildOrNull(0);
                if (bracketList)
                {
                    param.AddChild(bracketList.Copy());
                }
                header.InsertChild(0, param);

                AddFunctionArgument(functions, header.GetSymbol(), symbol);
            }
        }
    }
}

/**
 * Carbon's `StripSemanticsInsideStucts` (sic): clears the semantics of a
 * struct's members.
 *
 * @param {ASTNode} structNode The `NT_STRUCT`.
 */
function StripSemanticsInsideStucts(structNode)
{
    for (const memberNode of structNode.GetChildren())
    {
        for (const childNode of memberNode.GetChildren())
        {
            const symbol = childNode.GetSymbol();
            if (symbol && symbol.semantic.IsSet())
            {
                symbol.semantic = new InlineString();
            }
        }
    }
}

/**
 * Carbon's `CollectGlobals`: sorts the program's globals for Metal.
 *
 * - A `cbuffer` becomes a struct type of its name, register `CBuffer` (its
 *   own number, or 0).
 * - `const` globals stay, in the `constant` address space.
 * - Groupshared globals, struct-typed globals (their `c` registers dropped),
 *   buffers, textures and dynamic samplers leave the program and are queued
 *   in `globals`, to be threaded through as parameters.
 * - Samplers that can be static stay as `constexpr` samplers, with their
 *   `StaticSampler` on the sampler state node's `extraData`.
 * - `g_uiTransforms` moves into a struct `UITransforms`, and every other
 *   global into a struct `GlobalsData`; functions using them get `UI` and
 *   `Globals` parameters, and cbuffer users a generated one.
 *
 * Bug (EffectCompilerMetal.cpp:646-649; Carbon known defect CE-105): only a
 * declaration's first name is classified. `float a, b;` moves both into
 * `GlobalsData` but files only `a` as a member, so `b` is never prefixed with
 * `Globals.` and the Metal source refers to an undeclared `b`;
 * `Texture2D a, b;` queues only `a`, and `b` disappears from the program.
 * Reproduced.
 *
 * @param {ParserState} state The parse.
 * @param {Map<Symbol, ASTNode>} functions Function symbol to definition.
 * @param {ASTNode[]} globals Receives the queued globals' `NT_NAME_DECLARATION` nodes.
 */
function CollectGlobals(state, functions, globals)
{
    const root = state.GetTree();
    if (!root)
    {
        return;
    }

    let globalsStruct = null;
    let uiStruct = null;

    const globalsStructMembers = new Set();
    const uiStructMembers = new Set();
    const cbuffers = [];

    // Move all globals to the new buffer.
    for (let i = 0; i < root.GetChildrenCount(); ++i)
    {
        const node = root.GetChild(i);
        if (node && node.GetNodeType() === N.NT_CBUFFER)
        {
            const cbufferStruct = new ASTNode(N.NT_STRUCT, node.GetLocation(), node.GetScope(), null);

            const globalsSymbol = node.GetSymbol();
            globalsSymbol.isTypeName = true;
            globalsSymbol.definition = cbufferStruct;
            if (globalsSymbol.registerSpecifier.size === 0)
            {
                // Quirk (EffectCompilerMetal.cpp:623-626; Carbon known defect
                // CE-112): 0 is GlobalsData's slot too, so a stage using both an
                // unregistered cbuffer and a loose global fails in
                // AutoAssignRegistersForNode ("register 4 already assigned").
                // Reproduced.
                globalsSymbol.registerSpecifier.set("", RegisterSpecifier.register(MetalRegister.Enum.CBuffer, 0));
            }
            else
            {
                globalsSymbol.registerSpecifier.First()[1].registerType = MetalRegister.Enum.CBuffer;
            }

            cbufferStruct.SetSymbol(globalsSymbol);

            for (let j = 0; j < node.GetChildrenCount(); ++j)
            {
                node.GetChild(j).SetNodeType(N.NT_STRUCT_MEMBER);
                cbufferStruct.AddChild(node.GetChild(j));
            }

            state.GetTree().ReplaceChild(i, cbufferStruct);
            cbuffers.push(cbufferStruct);
            continue;
        }
        if (node && node.GetNodeType() === N.NT_VAR_DECLARATION_LIST)
        {
            const childNode = node.GetChildOrNull(0);
            if (childNode && childNode.GetNodeType() === N.NT_NAME_DECLARATION)
            {
                const symbol = childNode.GetSymbol();
                const type = childNode.GetType();

                if (childNode.GetType().modifier === T.OP_CONST)
                {
                    symbol.addressSpace = Symbol.AddressSpace.Constant;
                }
                else if (childNode.GetType().storageClass === T.OP_GROUPSHARED)
                {
                    symbol.addressSpace = Symbol.AddressSpace.Threadgroup;

                    globals.push(childNode);
                    root.RemoveChild(i);
                    --i;
                }
                else if (symbol.name.Equals__Chars("g_uiTransforms"))
                {
                    symbol.registerSpecifier.clear();

                    if (!uiStruct)
                    {
                        uiStruct = new ASTNode(N.NT_STRUCT, node.GetLocation(), node.GetScope(), null);

                        // Carbon spells this binding out field by field; it is
                        // exactly RegisterSpecifier::Register.
                        const reg = RegisterSpecifier.register(MetalRegister.Enum.CBuffer, GetCBufferIndex(InlineString.makeInlineString("g_uiTransforms")));

                        const uiSymbol = state.GetSymbolTable().AddSymbol(InlineString.makeInlineString("UITransforms"));
                        uiSymbol.isTypeName = true;
                        uiSymbol.definition = uiStruct;
                        uiSymbol.registerSpecifier.set(reg.shaderProfile.ToString(), reg);

                        uiStruct.SetSymbol(uiSymbol);

                        node.SetNodeType(N.NT_STRUCT_MEMBER);
                        uiStruct.AddChild(node);

                        root.ReplaceChild(i, uiStruct);
                    }
                    else
                    {
                        node.SetNodeType(N.NT_STRUCT_MEMBER);
                        uiStruct.AddChild(node);

                        root.RemoveChild(i);
                        --i;
                    }

                    uiStructMembers.add(symbol);
                }
                else
                {
                    if (type.symbol &&
                        type.symbol.definition &&
                        type.symbol.definition.GetNodeType() === N.NT_STRUCT)
                    {
                        // Strip cbuffer registers.
                        for (const [profile, reg] of symbol.registerSpecifier)
                        {
                            if (reg.registerType === MetalRegister.Enum.CBuffer)
                            {
                                symbol.registerSpecifier.delete(profile);
                                break;
                            }
                        }

                        globals.push(childNode);

                        root.RemoveChild(i);
                        --i;
                    }
                    else if (type.builtInType === T.OP_BUFFER ||
                        type.builtInType === T.OP_STRUCTUREDBUFFER ||
                        type.builtInType === T.OP_RWBUFFER ||
                        type.builtInType === T.OP_RWSTRUCTUREDBUFFER ||
                        type.builtInType === T.OP_RAYTRACING_ACCELERATION_STRUCTURE ||
                        type.builtInType === T.OP_TEXTURE ||
                        type.builtInType === T.OP_TEXTURE1D ||
                        type.builtInType === T.OP_TEXTURE1DARRAY ||
                        type.builtInType === T.OP_TEXTURE2D ||
                        type.builtInType === T.OP_TEXTURE2DARRAY ||
                        type.builtInType === T.OP_TEXTURE3D ||
                        // type.builtInType == OP_TEXTURE3DARRAY ||
                        type.builtInType === T.OP_TEXTURECUBE ||
                        type.builtInType === T.OP_TEXTURECUBEARRAY ||
                        type.builtInType === T.OP_TEXTURE2DMS ||
                        type.builtInType === T.OP_TEXTURE2DMSARRAY ||
                        type.builtInType === T.OP_RWTEXTURE1D ||
                        type.builtInType === T.OP_RWTEXTURE1DARRAY ||
                        type.builtInType === T.OP_RWTEXTURE2D ||
                        type.builtInType === T.OP_RWTEXTURE2DARRAY ||
                        type.builtInType === T.OP_RWTEXTURE3D
                        // type.builtInType == OP_RWTEXTURE3DARRAY ||
                    )
                    {
                        globals.push(childNode);

                        root.RemoveChild(i);
                        --i;
                    }
                    else if (type.IsSampler())
                    {
                        let isDynamic = true;
                        const sampler = new Sampler();
                        const staticSampler = new StaticSampler();
                        if (GetSamplerState(state, childNode, sampler))
                        {
                            isDynamic = sampler.isDynamic !== 0;
                            if (!isDynamic)
                            {
                                if (!ConvertToStaticSampler(staticSampler, sampler))
                                {
                                    isDynamic = true;
                                }
                            }
                        }

                        if (isDynamic)
                        {
                            globals.push(childNode);

                            root.RemoveChild(i);
                            --i;
                        }
                        else
                        {
                            symbol.addressSpace = Symbol.AddressSpace.Constexpr;
                            childNode.GetChild(1).extraData = staticSampler;
                        }
                    }
                    else
                    {
                        if (!globalsStruct)
                        {
                            const name = InlineString.makeInlineString("GlobalsData");
                            globalsStruct = new ASTNode(N.NT_STRUCT, node.GetLocation(), node.GetScope(), null);

                            // Carbon spells this binding out field by field; it
                            // is exactly RegisterSpecifier::Register.
                            const reg = RegisterSpecifier.register(MetalRegister.Enum.CBuffer, GetCBufferIndex(name));

                            const globalsSymbol = state.GetSymbolTable().AddSymbol(name);
                            globalsSymbol.isTypeName = true;
                            globalsSymbol.definition = globalsStruct;
                            globalsSymbol.registerSpecifier.set(reg.shaderProfile.ToString(), reg);

                            globalsStruct.SetSymbol(globalsSymbol);

                            node.SetNodeType(N.NT_STRUCT_MEMBER);
                            globalsStruct.AddChild(node);

                            root.ReplaceChild(i, globalsStruct);
                        }
                        else
                        {
                            node.SetNodeType(N.NT_STRUCT_MEMBER);
                            globalsStruct.AddChild(node);

                            root.RemoveChild(i);
                            --i;
                        }

                        globalsStructMembers.add(symbol);
                    }
                }
            }
        }
    }

    if (globalsStruct && globalsStructMembers.size !== 0)
    {
        PatchGlobalsInFunctions(functions, globalsStruct.GetSymbol(), InlineString.makeInlineString("Globals"), globalsStructMembers);

        StripSemanticsInsideStucts(globalsStruct);
    }

    if (uiStruct && uiStructMembers.size !== 0)
    {
        PatchGlobalsInFunctions(functions, uiStruct.GetSymbol(), InlineString.makeInlineString("UI"), uiStructMembers);

        StripSemanticsInsideStucts(uiStruct);
    }

    for (const cbuffer of cbuffers)
    {
        const members = new Set();
        for (const child of cbuffer.GetChildren())
        {
            for (const name of child.GetChildren())
            {
                members.add(name.GetSymbol());
            }
        }

        PatchGlobalsInFunctions(functions, cbuffer.GetSymbol(), state.AllocateNameWithPrefix("cbuffer"), members);
    }
}

// CreateShaderTableArgument and AddShaderTableArguments (M:861-957) belong to
// the ray-tracing path and are not ported; see AddShaderTableArguments'
// place in CompileEffect.
//
// PrintAnnotations and PrintStageInfo (M:959-1182) and SanitizeCode
// (M:1184-1188) write the debug listing and are not ported.

/**
 * Carbon's `ParseShaderName`: the stage a pass assignment names
 * (`vertexshader`, `pixelshader`, ...), ignoring case.
 *
 * @param {InlineString} name The assignment's state name.
 * @param {{ value: number }} type Receives an `InputStageType` value.
 * @returns {boolean} False when the name is not a stage.
 */
function ParseShaderName(name, type)
{
    if (InlineString.iEquals__Chars(name, "vertexshader"))
    {
        type.value = StageInput.InputStageType.VERTEX_STAGE;
    }
    else if (InlineString.iEquals__Chars(name, "pixelshader"))
    {
        type.value = StageInput.InputStageType.PIXEL_STAGE;
    }
    else if (InlineString.iEquals__Chars(name, "computeshader"))
    {
        type.value = StageInput.InputStageType.COMPUTE_STAGE;
    }
    else if (InlineString.iEquals__Chars(name, "geometryshader"))
    {
        type.value = StageInput.InputStageType.GEOMETRY_STAGE;
    }
    else if (InlineString.iEquals__Chars(name, "hullshader"))
    {
        type.value = StageInput.InputStageType.HULL_STAGE;
    }
    else if (InlineString.iEquals__Chars(name, "domainshader"))
    {
        type.value = StageInput.InputStageType.DOMAIN_STAGE;
    }
    else
    {
        return false;
    }
    return true;
}

/**
 * Carbon's `MetalSystemSemantics`: a `System` binding to a Metal built-in.
 *
 * @param {number} type A `MetalSystemSemanticsType.Enum` value.
 * @returns {RegisterSpecifier} The binding.
 */
function MetalSystemSemantics(type)
{
    return RegisterSpecifier.register(MetalRegister.Enum.System, type);
}

/**
 * Carbon's `s_systemSemantics`: the HLSL system-value semantics that become
 * Metal built-ins, keyed case-insensitively (`ILess`).
 */
const s_systemSemantics = [
    // vertex shader input semantics
    ["SV_VertexID", MetalSystemSemanticsType.Enum.vertex_id],
    ["SV_InstanceID", MetalSystemSemanticsType.Enum.instance_id],
    // compute shader
    ["SV_DispatchThreadID", MetalSystemSemanticsType.Enum.thread_position_in_grid],
    ["SV_GroupThreadID", MetalSystemSemanticsType.Enum.thread_position_in_threadgroup],
    ["SV_GroupIndex", MetalSystemSemanticsType.Enum.thread_index_in_threadgroup],
    ["SV_GroupID", MetalSystemSemanticsType.Enum.threadgroup_position_in_grid],
    ["SV_SampleIndex", MetalSystemSemanticsType.Enum.sample_id]
    // TODO: Add more.
];

/**
 * `s_systemSemantics.find( semantic )`: the built-in a semantic maps to.
 * Carbon's map compares with `ILess`, so two keys are equivalent when they
 * are equal ignoring ASCII case.
 *
 * @param {InlineString} semantic The semantic.
 * @returns {number|null} A `MetalSystemSemanticsType.Enum` value, or null when it is not a system semantic.
 */
function findSystemSemantic(semantic)
{
    for (const [name, type] of s_systemSemantics)
    {
        if (InlineString.iEquals__Chars(semantic, name))
        {
            return type;
        }
    }
    return null;
}

/**
 * Carbon's `RemapSystemSemanticsDXtoMetal`: entry-point parameters with a
 * system semantic (`SV_VertexID`, `SV_DispatchThreadID`, ...) get a `System`
 * binding to the Metal built-in.
 *
 * @param {ASTNode} callNode The pass's call of the entry point.
 */
function RemapSystemSemanticsDXtoMetal(callNode)
{
    const shaderProfile = "";

    const entryPointSymbol = callNode.GetSymbol();
    if (!entryPointSymbol || !entryPointSymbol.definition)
    {
        return;
    }

    const header = entryPointSymbol.definition.GetChildOrNull(0);

    for (let i = 0, n = header.GetChildrenCount(); i < n; ++i)
    {
        const param = header.GetChild(i);
        const symbol = param.GetSymbol();

        const found = findSystemSemantic(symbol.semantic);
        if (found !== null)
        {
            symbol.registerSpecifier.set(shaderProfile, MetalSystemSemantics(found));
        }
    }
}

/** Carbon's `vsSemantics` regex, `std::regex_match` with `icase`. */
const VS_SEMANTICS = /^(?:(position)|(color)|(normal)|(tangent)|(binormal)|(texcoord)|(blendindices)|(blendweight))(\d*)$/iu;

/**
 * Carbon's `RemapVertexInputSemanticsDXToMetal( StageInput&, Symbol*, int& )`:
 * a vertex input with a usage semantic (`POSITION`, `TEXCOORD3`, ...) gets
 * the next `Attribute` binding, a `PipelineInputDescription` is recorded, and
 * its semantic is cleared. Any other semantic is warned about.
 *
 * @param {StageInput} stage Receives the pipeline input.
 * @param {Symbol|null} symbol The input.
 * @param {{ value: number }} nextAttributeNumber The next attribute, advanced on success.
 * @returns {boolean} Whether the input was mapped.
 */
function RemapVertexInputSemanticsDXToMetal__Symbol(stage, symbol, nextAttributeNumber)
{
    if (!symbol || !symbol.semantic.IsSet())
    {
        return false;
    }

    const semantic = symbol.semantic.ToString();
    const match = VS_SEMANTICS.exec(semantic);
    if (match)
    {
        const input = new PipelineInputDescription();
        for (let i = 0; i < 8; ++i)
        {
            if (match[i + 1] !== undefined)
            {
                input.name = i & 0xff;
                break;
            }
        }
        input.registerIndex = nextAttributeNumber.value & 0xff;
        // Carbon's `stoi` throws std::out_of_range past INT_MAX, which nothing catches.
        if (match[9] !== "" && Number(match[9]) > 0x7fffffff)
        {
            throw new RangeError(`RemapVertexInputSemanticsDXToMetal: semantic index ${match[9]} overflows stoi (an uncaught exception in Carbon)`);
        }
        input.index = match[9] === "" ? 0 : Number(match[9]) & 0xff;
        input.usedMask = 0xff;
        switch (symbol.type.builtInType)
        {
            case T.OP_FLOAT:
                input.type = Constant.ConstantType.CONSTANT_TYPE_FLOAT;
                break;
            case T.OP_INT:
                input.type = Constant.ConstantType.CONSTANT_TYPE_INT;
                break;
            case T.OP_UINT:
                input.type = Constant.ConstantType.CONSTANT_TYPE_UINT;
                break;
            case T.OP_BOOL:
                input.type = Constant.ConstantType.CONSTANT_TYPE_BOOL;
                break;
            default:
                input.type = Constant.ConstantType.CONSTANT_TYPE_OTHER;
                break;
        }
        input.dimension = (symbol.type.width * symbol.type.height) & 0xff;

        stage.pipelineInputs.push(input);

        // Carbon spells this binding out field by field; it is exactly
        // RegisterSpecifier::Register.
        const reg = RegisterSpecifier.register(MetalRegister.Enum.Attribute, nextAttributeNumber.value);

        symbol.registerSpecifier.set(reg.shaderProfile.ToString(), reg);
        symbol.semantic = new InlineString();

        ++nextAttributeNumber.value;
        return true;
    }
    else
    {
        g_messages.AddMessage(`\\memory(0): warning X0000: Vertex shader uses unsupported input semantics "${semantic}"`);
        return false;
    }
}

/**
 * Carbon's `RemapVertexInputSemanticsDXToMetal( StageInput&, ASTNode*, int& )`:
 * maps a struct's members, nested structs included. Only each member
 * declaration's first name is looked at (Carbon: "TODO: Is it actually
 * enough to handle only the first child?").
 *
 * @param {StageInput} stage Receives the pipeline inputs.
 * @param {ASTNode} node The `NT_STRUCT`.
 * @param {{ value: number }} nextAttributeNumber The next attribute.
 * @returns {boolean} Whether any member was mapped.
 */
function RemapVertexInputSemanticsDXToMetal__Node(stage, node, nextAttributeNumber)
{
    let result = false;

    for (let i = 0, n = node.GetChildrenCount(); i < n; ++i)
    {
        const member = node.GetChild(i);

        // TODO: Is it actually enough to handle only the first child?
        const decl = member.GetChild(0);

        const symbol = decl.GetSymbol();
        const type = symbol.type;

        // Is it a nested struct?
        if (type.symbol &&
            type.symbol.definition &&
            type.symbol.definition.GetNodeType() === N.NT_STRUCT)
        {
            result = RemapVertexInputSemanticsDXToMetal__Node(stage, type.symbol.definition, nextAttributeNumber) || result;
        }
        else
        {
            if (!symbol.semantic.IsSet())
            {
                continue;
            }

            result = RemapVertexInputSemanticsDXToMetal__Symbol(stage, symbol, nextAttributeNumber) || result;
        }
    }

    return result;
}

/**
 * Carbon's `RemapVertexOutputSemanticsDXToMetal( Symbol* )`: a vertex output
 * becomes `position, invariant`, `clip_distance`, `point_size` or a `user`
 * varying named by its semantic.
 *
 * @param {Symbol} symbol The output.
 */
function RemapVertexOutputSemanticsDXToMetal__Symbol(symbol)
{
    if (InlineString.iEquals__Chars(symbol.semantic, "POSITION") || InlineString.iEquals__Chars(symbol.semantic, "POSITION0") || InlineString.iEquals__Chars(symbol.semantic, "SV_Position"))
    {
        symbol.registerSpecifier.set("", MetalSystemSemantics(MetalSystemSemanticsType.Enum.position_invariant));
    }
    else if (InlineString.iEquals__Chars(symbol.semantic, "SV_ClipDistance"))
    {
        symbol.registerSpecifier.set("", MetalSystemSemantics(MetalSystemSemanticsType.Enum.clip_distance));
    }
    else if (InlineString.iEquals__Chars(symbol.semantic, "PSIZE"))
    {
        symbol.registerSpecifier.set("", MetalSystemSemantics(MetalSystemSemanticsType.Enum.point_size));
    }
    else
    {
        // Carbon spells this binding out field by field; it is exactly
        // RegisterSpecifier::Register.
        const reg = RegisterSpecifier.register(MetalRegister.Enum.User, -1);
        symbol.registerSpecifier.set(reg.shaderProfile.ToString(), reg);
    }
}

/**
 * Carbon's `RemapVertexOutputSemanticsDXToMetal( ASTNode* )`: maps each
 * member of an output struct (first names only).
 *
 * @param {ASTNode} node The `NT_STRUCT`.
 */
function RemapVertexOutputSemanticsDXToMetal__Node(node)
{
    for (let i = 0, n = node.GetChildrenCount(); i < n; ++i)
    {
        const member = node.GetChild(i);

        const decl = member.GetChild(0);

        const symbol = decl.GetSymbol();
        RemapVertexOutputSemanticsDXToMetal__Symbol(symbol);
    }
}

/**
 * Carbon's `RemapFragmentInputSemanticsDXToMetal( Symbol* )`: a fragment
 * input becomes `position`, `front_facing` or a `user` varying.
 *
 * @param {Symbol|null} symbol The input.
 * @returns {boolean} Whether it has a semantic.
 */
function RemapFragmentInputSemanticsDXToMetal__Symbol(symbol)
{
    if (!symbol || !symbol.semantic.IsSet())
    {
        return false;
    }

    let found = false;

    if (InlineString.iEquals__Chars(symbol.semantic, "SV_Position") ||
        InlineString.iEquals__Chars(symbol.semantic, "POSITION") ||
        InlineString.iEquals__Chars(symbol.semantic, "POSITION0") ||
        InlineString.iEquals__Chars(symbol.semantic, "VPOS"))
    {
        symbol.registerSpecifier.set("", MetalSystemSemantics(MetalSystemSemanticsType.Enum.position));
        found = true;
    }
    else if (InlineString.iEquals__Chars(symbol.semantic, "VFACE") ||
        InlineString.iEquals__Chars(symbol.semantic, "SV_IsFrontFace"))
    {
        symbol.registerSpecifier.set("", MetalSystemSemantics(MetalSystemSemanticsType.Enum.front_facing));
        found = true;
    }
    else if (symbol.semantic.IsSet())
    {
        // Carbon spells this binding out field by field; it is exactly
        // RegisterSpecifier::Register.
        const reg = RegisterSpecifier.register(MetalRegister.Enum.User, -1);

        symbol.registerSpecifier.set(reg.shaderProfile.ToString(), reg);
        found = true;
    }

    return found;
}

/**
 * Carbon's `RemapFragmentInputSemanticsDXToMetal( ASTNode* )`: maps the
 * members of an input struct that have semantics (first names only).
 *
 * @param {ASTNode} node The `NT_STRUCT`.
 * @returns {boolean} Whether any member has a semantic.
 */
function RemapFragmentInputSemanticsDXToMetal__Node(node)
{
    let result = false;

    for (let i = 0, n = node.GetChildrenCount(); i < n; ++i)
    {
        const member = node.GetChild(i);

        const decl = member.GetChild(0);

        const symbol = decl.GetSymbol();
        if (!symbol.semantic.IsSet())
        {
            continue;
        }

        result = RemapFragmentInputSemanticsDXToMetal__Symbol(symbol) || result;
    }

    return result;
}

/**
 * C `_strnicmp( semantic.start, prefix, n ) == 0` where Carbon reads the
 * semantic's buffer directly: the comparison runs on past the semantic's end
 * into whatever text follows it, and stops at a NUL.
 *
 * @param {InlineString} semantic The semantic; Carbon's null pointer is undefined.
 * @param {string} prefix The prefix.
 * @returns {boolean} Whether the buffer starts with `prefix`, ignoring ASCII case.
 */
function semanticStartsWith(semantic, prefix)
{
    if (!semantic.IsSet())
    {
        throw new TypeError(`RemapFragmentOutputSemanticsDXToMetal: an output without a semantic (_strnicmp of a null pointer in Carbon)`);
    }
    for (let i = 0; i < prefix.length; ++i)
    {
        const c = semantic.CharAt(semantic.start + i);
        const lower = c >= 65 && c <= 90 ? c + 32 : c;
        const expected = prefix.toLowerCase().charCodeAt(i);
        if (lower !== expected)
        {
            return false;
        }
        if (c === 0)
        {
            return true;
        }
    }
    return true;
}

/**
 * Carbon's `RemapFragmentOutputSemanticsDXToMetal( Symbol* )`: a fragment
 * output becomes `color(n)`, `depth` or `stencil`; anything else is warned
 * about.
 *
 * The index of `COLORn` and `SV_Targetn` is the one character after the
 * prefix, minus `'0'`. Carbon asserts it is 0 to 7 and then reads its
 * eight-entry table with it, which is undefined past the table, so the port
 * throws there. `SV_Target10` reads as `color(1)`.
 *
 * @param {Symbol} symbol The output.
 */
function RemapFragmentOutputSemanticsDXToMetal__Symbol(symbol)
{
    const E = MetalSystemSemanticsType.Enum;
    const colorN = [E.color_0, E.color_1, E.color_2, E.color_3, E.color_4, E.color_5, E.color_6, E.color_7];
    const colorAt = offset =>
    {
        const index = symbol.semantic.CharAt(symbol.semantic.start + offset) - 48;
        if (!(index >= 0 && index < 8))
        {
            throw new RangeError(`RemapFragmentOutputSemanticsDXToMetal: "${symbol.semantic.ToString()}" indexes colorN[${index}] (undefined in Carbon)`);
        }
        return colorN[index];
    };

    if (semanticStartsWith(symbol.semantic, "COLOR"))
    {
        const len = symbol.semantic.end - symbol.semantic.start;
        if (len > 5)
        {
            // Handle cases of COLORN.
            symbol.registerSpecifier.set("", MetalSystemSemantics(colorAt(5)));
        }
        else
        {
            symbol.registerSpecifier.set("", MetalSystemSemantics(E.color_0));
        }
    }
    else if (semanticStartsWith(symbol.semantic, "SV_Target"))
    {
        const len = symbol.semantic.end - symbol.semantic.start;
        if (len > 9)
        {
            // Handle cases of SV_TargetN.
            symbol.registerSpecifier.set("", MetalSystemSemantics(colorAt(9)));
        }
        else
        {
            symbol.registerSpecifier.set("", MetalSystemSemantics(E.color_0));
        }
    }
    else if (InlineString.iEquals__Chars(symbol.semantic, "DEPTH") ||
        InlineString.iEquals__Chars(symbol.semantic, "SV_Depth"))
    {
        symbol.registerSpecifier.set("", MetalSystemSemantics(E.depth));
    }
    else if (InlineString.iEquals__Chars(symbol.semantic, "SV_StencilRef"))
    {
        symbol.registerSpecifier.set("", MetalSystemSemantics(E.stencil));
    }
    else
    {
        g_messages.AddMessage(`\\memory(0): warning X0000: Fragment shader uses unsupported output semantics "${symbol.semantic.ToString()}"`);
    }
}

/**
 * Carbon's `RemapFragmentOutputSemanticsDXToMetal( ASTNode* )`: maps each
 * member of an output struct (first names only).
 *
 * @param {ASTNode} node The `NT_STRUCT`.
 */
function RemapFragmentOutputSemanticsDXToMetal__Node(node)
{
    for (let i = 0, n = node.GetChildrenCount(); i < n; ++i)
    {
        const member = node.GetChild(i);

        const decl = member.GetChild(0);

        const symbol = decl.GetSymbol();
        RemapFragmentOutputSemanticsDXToMetal__Symbol(symbol);
    }
}

/**
 * Copies a symbol's register bindings, as assigning a C++
 * `std::map<InlineString, RegisterSpecifier>` copies every entry.
 *
 * @param {CjsFxStdMap} registerSpecifier The bindings.
 * @returns {CjsFxStdMap} An independent copy.
 */
function copyRegisterSpecifiers(registerSpecifier)
{
    const copy = new CjsFxStdMap();
    for (const [profile, reg] of registerSpecifier)
    {
        copy.set(profile, reg.Copy());
    }
    return copy;
}

/**
 * Carbon's `PrepareVertexFunction`: on the wrapper entry point, struct
 * parameters with vertex input semantics become `[[stage_in]]` (their
 * members numbered as attributes), other struct parameters take their type's
 * bindings, scalar inputs are numbered too, and the returned struct's members
 * become vertex outputs.
 *
 * @param {StageInput} stage Receives the pipeline inputs.
 * @param {ASTNode} callNode The pass's call, pointing at the wrapper.
 */
function PrepareVertexFunction(stage, callNode)
{
    const entryPointSymbol = callNode.GetSymbol();
    if (!entryPointSymbol || !entryPointSymbol.definition)
    {
        return;
    }

    const header = entryPointSymbol.definition.GetChildOrNull(0);

    const nextAttributeNumber = { value: 0 };
    for (let i = 0, n = header.GetChildrenCount(); i < n; ++i)
    {
        const param = header.GetChild(i);
        const symbol = param.GetSymbol();
        const typeSymbol = symbol.type.symbol;

        if (typeSymbol)
        {
            // This funciton parameter is of struct type. Check if this struct has declarations
            // with input semantics.
            const hasInputs = RemapVertexInputSemanticsDXToMetal__Node(stage, typeSymbol.definition, nextAttributeNumber);

            if (hasInputs)
            {
                // [[stage_in]]
                const reg = RegisterSpecifier.register(MetalRegister.Enum.StageIn, -1);
                symbol.registerSpecifier.set(reg.shaderProfile.ToString(), reg);
            }
            else
            {
                // Inherit register specifier from the type.
                symbol.registerSpecifier = copyRegisterSpecifiers(typeSymbol.registerSpecifier);
            }
        }
        else if (symbol.type.builtInType)
        {
            RemapVertexInputSemanticsDXToMetal__Symbol(stage, symbol, nextAttributeNumber);
        }
    }

    const returnType = header.GetType();
    if (returnType.symbol)
    {
        const def = returnType.symbol.definition;
        if (def && def.GetNodeType() === N.NT_STRUCT)
        {
            RemapVertexOutputSemanticsDXToMetal__Node(def);
        }
    }
}

/**
 * Carbon's `PrepareFragmentFunction`: as `PrepareVertexFunction`, with the
 * fragment input and output mappings.
 *
 * @param {StageInput} stage Unused, as in Carbon.
 * @param {ASTNode} callNode The pass's call, pointing at the wrapper.
 */
function PrepareFragmentFunction(stage, callNode)
{
    void stage;

    const entryPointSymbol = callNode.GetSymbol();
    if (!entryPointSymbol || !entryPointSymbol.definition)
    {
        return;
    }

    const header = entryPointSymbol.definition.GetChildOrNull(0);
    if (!header)
    {
        return;
    }

    for (let i = 0, n = header.GetChildrenCount(); i < n; ++i)
    {
        const param = header.GetChild(i);
        const symbol = param.GetSymbol();
        const typeSymbol = symbol.type.symbol;

        if (typeSymbol)
        {
            // This funciton parameter is of struct type. Check if this struct has declarations
            // with input semantics.
            const hasInputs = RemapFragmentInputSemanticsDXToMetal__Node(typeSymbol.definition);

            if (hasInputs)
            {
                // [[stage_in]]
                const reg = RegisterSpecifier.register(MetalRegister.Enum.StageIn, -1);
                symbol.registerSpecifier.set(reg.shaderProfile.ToString(), reg);
            }
            else
            {
                // Inherit register specifier from the type.
                symbol.registerSpecifier = copyRegisterSpecifiers(typeSymbol.registerSpecifier);
            }
        }
        else if (symbol.type.builtInType)
        {
            if (param.GetToken() && param.GetToken().type === T.OP_OUT)
            {
                RemapFragmentOutputSemanticsDXToMetal__Symbol(symbol);
            }
            else
            {
                RemapFragmentInputSemanticsDXToMetal__Symbol(symbol);
            }
        }
    }

    const returnType = header.GetType();
    if (returnType.symbol)
    {
        const def = returnType.symbol.definition;
        if (def && def.GetNodeType() === N.NT_STRUCT)
        {
            RemapFragmentOutputSemanticsDXToMetal__Node(def);
        }
    }
}

/**
 * Carbon's `PrepareKernelFunction`, which is empty.
 *
 * @param {StageInput} stage Unused.
 * @param {ASTNode} callNode Unused.
 */
function PrepareKernelFunction(stage, callNode)
{
    void stage;
    void callNode;
}

/**
 * C `strtoul( text, nullptr, 10 )` from an offset of a buffer, with
 * Windows' 32-bit `unsigned long`: leading space, an optional sign, then
 * digits; saturates at `ULONG_MAX`, and a `-` negates in unsigned arithmetic.
 *
 * @param {InlineString} string Where to start reading.
 * @returns {number} The value, 0 to 0xffffffff.
 */
function strtoul10(string)
{
    let i = string.start;
    while ([32, 9, 10, 11, 12, 13].includes(string.CharAt(i)))
    {
        ++i;
    }
    let negative = false;
    if (string.CharAt(i) === 43 || string.CharAt(i) === 45)
    {
        negative = string.CharAt(i) === 45;
        ++i;
    }
    let value = 0;
    let digits = 0;
    while (string.CharAt(i) >= 48 && string.CharAt(i) <= 57)
    {
        value = Math.min(value * 10 + (string.CharAt(i) - 48), 0x100000000);
        ++i;
        ++digits;
    }
    if (digits === 0)
    {
        return 0;
    }
    if (value > 0xffffffff)
    {
        return 0xffffffff;
    }
    return negative ? (-value) >>> 0 : value;
}

/**
 * Carbon's `GetThreadGroupSize`: 1, 1, 1, or for a compute stage the entry
 * point's `[numthreads( x, y, z )]`, warning above 512 threads (Intel Macs).
 * It runs before `PatchShader`, which does not keep the attributes.
 *
 * @param {StageInput} stage Receives `threadGroupSize`.
 * @param {ParserState} state Reports the warning.
 * @param {ASTNode} callNode The pass's call of the entry point.
 */
function GetThreadGroupSize(stage, state, callNode)
{
    stage.threadGroupSize[0] = 1;
    stage.threadGroupSize[1] = 1;
    stage.threadGroupSize[2] = 1;

    if (stage.type !== StageInput.InputStageType.COMPUTE_STAGE)
    {
        return;
    }

    const entryPointSymbol = callNode.GetSymbol();
    if (!entryPointSymbol || !entryPointSymbol.definition)
    {
        return;
    }

    const attribList = entryPointSymbol.definition.GetChildOrNull(2);
    if (attribList && attribList.GetNodeType() === N.NT_FUNCTION_ATTRIBUTE_LIST)
    {
        // Find [numthreads(X, Y, Z)] attribute.
        for (let i = 0, n = attribList.GetChildrenCount(); i < n; ++i)
        {
            const attribute = attribList.GetChild(i);

            if (!attribute.GetToken().stringValue.Equals__Chars("numthreads"))
            {
                continue;
            }

            for (let j = 0; j < 3; ++j)
            {
                const child = attribute.GetChildOrNull(j);

                const valueString = (child && child.GetToken()) ? child.GetToken().stringValue : new InlineString();
                const value = valueString.IsSet() ? strtoul10(valueString) : 1;

                stage.threadGroupSize[j] = value >>> 0;
            }

            if ((Math.imul(Math.imul(stage.threadGroupSize[0], stage.threadGroupSize[1]), stage.threadGroupSize[2]) >>> 0) > 512)
            {
                state.ShowMessage__Location(attribute.GetLocation(), ParserState.ErrorCode.EC_CUSTOM_WARNING, "number of threads per group exceeds Intel limit of 512; computer shader invoketion will fail on Intel macs");
            }
        }
    }
}

/**
 * Carbon's `AutoAssignRegistersForNode`: gives every resource parameter of a
 * wrapper entry point a Metal binding.
 *
 * Carbon's own account (M:1756-1773): Metal has `[[buffer(n)]]` and
 * `[[texture(n)]]` sets where Trinity has DirectX's constant buffers, SRVs
 * and UAVs. Buffer slots 0-3 are the vertex streams; constant buffer `bN` is
 * `[[buffer(4 + N)]]`; SRV and UAV buffers take the free buffer slots and the
 * same SRV register number (`[[buffer(5)]]` is SRV `t5`), which their
 * textures must then avoid; textures and samplers take the first free slots
 * of their own sets. Parameters already bound keep their binding (only the
 * first is checked); the three assignment passes walk the parameters last to
 * first, which is declaration order, as the globals were inserted at the
 * front.
 *
 * @param {ParserState} state Reports a collision or a full set.
 * @param {ASTNode} functionHeader The wrapper's `NT_FUNCTION_HEADER`.
 * @param {import("../ParserState/FileLocation.js").FileLocation} messageLocation Where a full set is reported.
 * @returns {boolean} False after an error.
 */
function AutoAssignRegistersForNode(state, functionHeader, messageLocation)
{
    const GetAssignedSymbolNames = symbols =>
    {
        let result = "";
        for (const symbol of symbols)
        {
            if (result.length !== 0)
            {
                result += ", ";
            }
            // Carbon's ToString( symbol->name ) of a null slot dereferences
            // null; every caller passes a full set, so no slot is null.
            result += symbol.name.ToString();
        }
        return result;
    };

    const RecordRegister = (index, registers, node) =>
    {
        const symbol = node.GetSymbol();

        if (index < 0 || index >= registers.length)
        {
            state.ShowMessage__Location(
                node.GetLocation(),
                ParserState.ErrorCode.EC_CUSTOM_ERROR,
                "Couldn't allocate a register for %s. Reason: Invalid register index.",
                symbol.name.ToString());
            return false;
        }

        if (!registers[index])
        {
            registers[index] = symbol;
            return true;
        }
        else
        {
            state.ShowMessage__Location(
                node.GetLocation(),
                ParserState.ErrorCode.EC_CUSTOM_ERROR,
                "Couldn't allocate a register for %s. Reason: register %d already assigned to %s.",
                symbol.name.ToString(),
                index,
                registers[index].name.ToString());
            return false;
        }
    };

    const FindUnusedRegister = (registers, index) =>
    {
        for (let i = 0; i < registers.length; ++i)
        {
            if (!registers[i])
            {
                index.value = i;
                return true;
            }
        }
        return false;
    };

    // Carbon spells this binding out field by field; it is exactly
    // RegisterSpecifier::Register with the type Invalid.
    const reg = RegisterSpecifier.register(MetalRegister.Enum.Invalid, -1);

    const AssignRegister = (symbol, registers, registerType) =>
    {
        reg.registerType = registerType;
        const index = { value: reg.registerNumber };
        if (FindUnusedRegister(registers, index))
        {
            reg.registerNumber = index.value;
            symbol.registerSpecifier.set(reg.shaderProfile.ToString(), reg.Copy());
            registers[reg.registerNumber] = symbol;
            return true;
        }
        state.ShowMessage__Location(
            messageLocation,
            ParserState.ErrorCode.EC_CUSTOM_ERROR,
            "Couldn't allocate a register for %s. Reason: no free registers left. Already assigned registers: %s",
            symbol.name.ToString(),
            GetAssignedSymbolNames(registers));
        return false;
    };

    // strictly for constant buffers
    const buffers = new Array(METAL_MAX_BOUND_BUFFERS).fill(null);
    // shared between SRVs and UAVs: both textures and buffers
    const textures = new Array(METAL_MAX_BOUND_TEXTURES).fill(null);
    // samplers
    const samplers = new Array(METAL_MAX_BOUND_SAMPLERS).fill(null);

    // Mark the first 4 buffer slots as occupied for vertex streams
    const vertexStream = new Symbol();
    buffers[0] = vertexStream;
    buffers[1] = vertexStream;
    buffers[2] = vertexStream;
    buffers[3] = vertexStream;

    // Accumulate already used registers.
    for (let i = 0; i < functionHeader.GetChildrenCount(); ++i)
    {
        const paramNode = functionHeader.GetChild(i);
        const symbol = paramNode.GetSymbol();

        const type = paramNode.GetType();
        if (type.IsStruct())
        {
            if (symbol.registerSpecifier.size === 0)
            {
                const index = GetCBufferIndex__Symbol(symbol);
                if (index >= 0)
                {
                    if (RecordRegister(index + METAL_VERTEX_STREAM_BUFFER_COUNT, buffers, paramNode))
                    {
                        reg.registerType = MetalRegister.Enum.CBuffer;
                        reg.registerNumber = index;

                        symbol.registerSpecifier.set(reg.shaderProfile.ToString(), reg.Copy());
                    }
                    else
                    {
                        return false;
                    }
                }
            }
            else
            {
                // Note: We only check the first register.
                const existingReg = symbol.registerSpecifier.First()[1];

                if (existingReg.registerType === MetalRegister.Enum.CBuffer)
                {
                    const index = existingReg.registerNumber;
                    if (!RecordRegister(index + METAL_VERTEX_STREAM_BUFFER_COUNT, buffers, paramNode))
                    {
                        return false;
                    }
                }
            }

            continue;
        }

        if (symbol.registerSpecifier.size === 0)
        {
            continue;
        }

        // Note: We only check the first register.
        const existingReg = symbol.registerSpecifier.First()[1];

        switch (type.builtInType)
        {
            case T.OP_BUFFER:
            case T.OP_STRUCTUREDBUFFER:
            case T.OP_RAYTRACING_ACCELERATION_STRUCTURE:
                if (!RecordRegister(existingReg.registerNumber, textures, paramNode))
                {
                    return false;
                }
                break;

            case T.OP_RWBUFFER:
            case T.OP_RWSTRUCTUREDBUFFER:
                if (!RecordRegister(existingReg.registerNumber, textures, paramNode))
                {
                    return false;
                }
                break;

            case T.OP_TEXTURE:
            case T.OP_TEXTURE1D:
            case T.OP_TEXTURE1DARRAY:
            case T.OP_TEXTURE2D:
            case T.OP_TEXTURE2DARRAY:
            case T.OP_TEXTURE3D:
            // case OP_TEXTURE3DARRAY:
            case T.OP_TEXTURECUBE:
            case T.OP_TEXTURECUBEARRAY:
            case T.OP_TEXTURE2DMS:
            case T.OP_TEXTURE2DMSARRAY:
                if (!RecordRegister(existingReg.registerNumber, textures, paramNode))
                {
                    return false;
                }
                break;

            case T.OP_RWTEXTURE1D:
            case T.OP_RWTEXTURE1DARRAY:
            case T.OP_RWTEXTURE2D:
            case T.OP_RWTEXTURE2DARRAY:
            case T.OP_RWTEXTURE3D:
                // case OP_RWTEXTURE3DARRAY:
                if (!RecordRegister(existingReg.registerNumber, textures, paramNode))
                {
                    return false;
                }
                break;

            case T.OP_SAMPLER:
            case T.OP_SAMPLER2D:
            case T.OP_SAMPLER3D:
            case T.OP_SAMPLERCUBE:
            case T.OP_SAMPLERCOMPARISON:
                if (type.arrayDimensions > 0)
                {
                    if (!RecordRegister(existingReg.registerNumber, textures, paramNode))
                    {
                        return false;
                    }
                }
                else
                {
                    if (!RecordRegister(existingReg.registerNumber, samplers, paramNode))
                    {
                        return false;
                    }
                }
                break;

            default:
                break;
        }
    }

    // Assign registers for constant buffers
    for (let i = 0; i < functionHeader.GetChildrenCount(); ++i)
    {
        const paramNode = functionHeader.GetChild(functionHeader.GetChildrenCount() - 1 - i);
        const symbol = paramNode.GetSymbol();
        if (symbol.registerSpecifier.size !== 0)
        {
            continue;
        }
        const type = paramNode.GetType();
        if (type.IsStruct())
        {
            // Quirk (EffectCompilerMetal.cpp:2022-2023; Carbon known defect
            // CE-111): a struct global that is not one of the known constant
            // buffers has index -1, so it asks for buffer slot 3, a vertex
            // stream, and the compile fails with "register 3 already assigned
            // to ." (the stream's placeholder symbol has no name). Reproduced.
            const index = GetCBufferIndex__Symbol(symbol);
            if (RecordRegister(index + METAL_VERTEX_STREAM_BUFFER_COUNT, buffers, paramNode))
            {
                reg.registerType = MetalRegister.Enum.CBuffer;
                reg.registerNumber = index;
                symbol.registerSpecifier.set(reg.shaderProfile.ToString(), reg.Copy());
            }
            else
            {
                return false;
            }
        }
    }

    // Assign registers for SRV/UAV buffers
    for (let i = 0; i < functionHeader.GetChildrenCount(); ++i)
    {
        const paramNode = functionHeader.GetChild(functionHeader.GetChildrenCount() - 1 - i);
        const symbol = paramNode.GetSymbol();

        if (symbol.registerSpecifier.size !== 0)
        {
            continue;
        }
        const type = paramNode.GetType();
        if (type.IsStruct())
        {
            continue;
        }

        reg.registerType = MetalRegister.Enum.Invalid;
        reg.registerNumber = -1;

        let assign = true;
        switch (type.builtInType)
        {
            case T.OP_BUFFER:
            case T.OP_STRUCTUREDBUFFER:
            case T.OP_RAYTRACING_ACCELERATION_STRUCTURE:
                reg.registerType = MetalRegister.Enum.SRV;
                break;
            case T.OP_RWBUFFER:
            case T.OP_RWSTRUCTUREDBUFFER:
                reg.registerType = MetalRegister.Enum.UAV;
                break;
            case T.OP_TEXTURE:
            case T.OP_TEXTURE1D:
            case T.OP_TEXTURE1DARRAY:
            case T.OP_TEXTURE2D:
            case T.OP_TEXTURE2DARRAY:
            case T.OP_TEXTURE3D:
            // case OP_TEXTURE3DARRAY:
            case T.OP_TEXTURECUBE:
            case T.OP_TEXTURECUBEARRAY:
            case T.OP_TEXTURE2DMS:
            case T.OP_TEXTURE2DMSARRAY:
                if (type.arrayDimensions)
                {
                    reg.registerType = MetalRegister.Enum.SRV;
                }
                else
                {
                    assign = false;
                }
                break;
            case T.OP_SAMPLER:
            case T.OP_SAMPLER2D:
            case T.OP_SAMPLER3D:
            case T.OP_SAMPLERCUBE:
            case T.OP_SAMPLERCOMPARISON:
                if (symbol.type.arrayDimensions > 0)
                {
                    reg.registerType = MetalRegister.Enum.SRV;
                }
                else
                {
                    assign = false;
                }
                break;
            default:
                assign = false;
                break;
        }
        if (!assign)
        {
            continue;
        }

        if (!AssignRegister(symbol, buffers, reg.registerType))
        {
            return false;
        }
        // Also mark texture slot occupied
        textures[reg.registerNumber] = symbol;
    }

    // Assign texture and sampler registers.
    for (let i = 0; i < functionHeader.GetChildrenCount(); ++i)
    {
        const paramNode = functionHeader.GetChild(functionHeader.GetChildrenCount() - 1 - i);

        const symbol = paramNode.GetSymbol();

        if (symbol.registerSpecifier.size !== 0)
        {
            // The register already assigned.
            continue;
        }
        const type = paramNode.GetType();
        if (type.IsStruct())
        {
            continue;
        }

        reg.registerType = MetalRegister.Enum.Invalid;
        reg.registerNumber = -1;

        switch (type.builtInType)
        {
            case T.OP_TEXTURE:
            case T.OP_TEXTURE1D:
            case T.OP_TEXTURE1DARRAY:
            case T.OP_TEXTURE2D:
            case T.OP_TEXTURE2DARRAY:
            case T.OP_TEXTURE3D:
            // case OP_TEXTURE3DARRAY:
            case T.OP_TEXTURECUBE:
            case T.OP_TEXTURECUBEARRAY:
            case T.OP_TEXTURE2DMS:
            case T.OP_TEXTURE2DMSARRAY:
                if (type.arrayDimensions === 0)
                {
                    if (!AssignRegister(symbol, textures, MetalRegister.Enum.Texture))
                    {
                        return false;
                    }
                }
                break;

            case T.OP_RWTEXTURE1D:
            case T.OP_RWTEXTURE1DARRAY:
            case T.OP_RWTEXTURE2D:
            case T.OP_RWTEXTURE2DARRAY:
            case T.OP_RWTEXTURE3D:
                // case OP_RWTEXTURE3DARRAY:
                if (!AssignRegister(symbol, textures, MetalRegister.Enum.UAV))
                {
                    return false;
                }
                break;

            case T.OP_SAMPLER:
            case T.OP_SAMPLER2D:
            case T.OP_SAMPLER3D:
            case T.OP_SAMPLERCUBE:
            case T.OP_SAMPLERCOMPARISON:
                if (symbol.type.arrayDimensions === 0)
                {
                    if (!AssignRegister(symbol, samplers, MetalRegister.Enum.Sampler))
                    {
                        return false;
                    }
                }
                break;

            default:
                continue;
        }
    }

    return true;
}

/**
 * Carbon's `AutoAssignRegisters`: `AutoAssignRegistersForNode` on the
 * called entry point's parameters.
 *
 * @param {ParserState} state Reports errors.
 * @param {ASTNode} callNode The pass's call, pointing at the wrapper.
 * @returns {boolean} False when there is no entry point or after an error.
 */
function AutoAssignRegisters(state, callNode)
{
    const entryPointSymbol = callNode.GetSymbol();
    if (!entryPointSymbol || !entryPointSymbol.definition)
    {
        return false;
    }

    const functionHeader = entryPointSymbol.definition.GetChildOrNull(0);
    if (!functionHeader)
    {
        return false;
    }
    return AutoAssignRegistersForNode(state, functionHeader, callNode.GetLocation());
}

/**
 * Carbon's `NewStructMember`: a member declaration copying a symbol's type,
 * interpolation modifier and semantic, under a generated `__name_NNNN`.
 *
 * @param {ParserState} state The parse.
 * @param {Symbol} sourceSymbol The symbol to copy.
 * @returns {ASTNode} The `NT_STRUCT_MEMBER`.
 */
function NewStructMember(state, sourceSymbol)
{
    const symbol = state.GetSymbolTable().AddSymbol(state.AllocateNameWithPrefix__InlineString(sourceSymbol.name));
    const nameDecl = state.NewNode(N.NT_NAME_DECLARATION);
    symbol.definition = nameDecl;
    symbol.type = sourceSymbol.type.Copy();
    symbol.interpolationModifier = sourceSymbol.interpolationModifier;
    symbol.semantic = sourceSymbol.semantic.Copy();
    nameDecl.SetSymbol(symbol);
    nameDecl.SetType(sourceSymbol.type);

    const member = state.NewNode(N.NT_STRUCT_MEMBER);
    member.AddChild(nameDecl);
    member.SetType(sourceSymbol.type);
    return member;
}

/**
 * Carbon's `GatherFields`: copies the non-system fields of a struct, nested
 * structs flattened, into `destStruct`, and records how to reach each from
 * `accessParent` (`input.base.position`).
 *
 * @param {ASTNode} destStruct Receives the flat members.
 * @param {ASTNode[]} accessors Receives one access expression per member.
 * @param {ASTNode} accessParent The expression reaching the source struct.
 * @param {ASTNode} sourceStruct The source `NT_STRUCT`.
 * @param {ParserState} state The parse.
 */
function GatherFields(destStruct, accessors, accessParent, sourceStruct, state)
{
    for (const member of sourceStruct.GetChildren())
    {
        if (member.GetType().IsStruct())
        {
            for (const name of member.GetChildren())
            {
                GatherFields(destStruct, accessors, NewDot__Symbol(state, accessParent.Copy(), name.GetSymbol()), name.GetType().symbol.definition, state);
            }
        }
        else
        {
            for (const name of member.GetChildren())
            {
                if (findSystemSemantic(name.GetSymbol().semantic) === null)
                {
                    destStruct.AddChild(NewStructMember(state, name.GetSymbol()));
                    accessors.push(NewDot__Symbol(state, accessParent.Copy(), name.GetSymbol()));
                }
            }
        }
    }
}

/**
 * Carbon's `GatherSystemFields`: each system-semantic field of a struct,
 * nested structs included, becomes a parameter of `destStruct` (the wrapper
 * header) bound to its Metal built-in. `SV_VertexID` and `SV_InstanceID` also
 * get a `base_vertex` or `base_instance` parameter, subtracted in the
 * wrapper's body (Carbon: "to match dx12 behaviour").
 *
 * Quirk (EffectCompilerMetal.cpp:2269, :2279, :2295; Carbon known defect
 * CE-108): the system semantic is found ignoring case, but the base
 * subtraction compares case-sensitively, so `SV_VERTEXID` gets `vertex_id`
 * without `base_vertex`. Reproduced.
 *
 * @param {ASTNode} destStruct The wrapper header; receives the parameters.
 * @param {ASTNode[]} accessors Receives the field access expressions.
 * @param {ASTNode[]} argumentAccessors Receives the parameter references.
 * @param {ASTNode} accessParent The expression reaching the source struct.
 * @param {ASTNode} sourceStruct The source `NT_STRUCT`.
 * @param {ASTNode} shaderBody The wrapper body; receives the subtractions.
 * @param {ParserState} state The parse.
 */
function GatherSystemFields(destStruct, accessors, argumentAccessors, accessParent, sourceStruct, shaderBody, state)
{
    for (const member of sourceStruct.GetChildren())
    {
        if (member.GetType().IsStruct())
        {
            for (const name of member.GetChildren())
            {
                GatherSystemFields(destStruct, accessors, argumentAccessors, NewDot__Symbol(state, accessParent.Copy(), name.GetSymbol()), name.GetType().symbol.definition, shaderBody, state);
            }
        }
        else
        {
            for (const name of member.GetChildren())
            {
                const found = findSystemSemantic(name.GetSymbol().semantic);
                if (found !== null)
                {
                    const param = NewFunctionParameter(state, name.GetType());
                    param.GetSymbol().registerSpecifier.set("", MetalSystemSemantics(found));
                    destStruct.AddChild(param);
                    argumentAccessors.push(NewVarIdentifier(state, param.GetSymbol()));
                    accessors.push(NewDot__Symbol(state, accessParent.Copy(), name.GetSymbol()));

                    // subtract base_vertex from vertex_id to match dx12 behaviour for SV_VertexID
                    if (name.GetSymbol().semantic.Equals__Chars("SV_VertexID"))
                    {
                        const base_param = NewFunctionParameter(state, Type.hlsl.uint_t);
                        base_param.GetSymbol().registerSpecifier.set("", MetalSystemSemantics(MetalSystemSemanticsType.Enum.base_vertex));
                        destStruct.AddChild(base_param);

                        const assignment = NewBinaryExpression(
                            state,
                            T.OP_SUB_ASSIGN,
                            NewVarIdentifier(state, param.GetSymbol()),
                            NewVarIdentifier(state, base_param.GetSymbol()));
                        const node = NewExpressionStatement(state, assignment);
                        shaderBody.AddChild(node);
                    }

                    // subtract base_instance from instance_id to match dx12 behaviour for SV_InstanceID
                    if (name.GetSymbol().semantic.Equals__Chars("SV_InstanceID"))
                    {
                        const base_param = NewFunctionParameter(state, Type.hlsl.uint_t);
                        base_param.GetSymbol().registerSpecifier.set("", MetalSystemSemantics(MetalSystemSemanticsType.Enum.base_instance));
                        destStruct.AddChild(base_param);

                        const assignment = NewBinaryExpression(
                            state,
                            T.OP_SUB_ASSIGN,
                            NewVarIdentifier(state, param.GetSymbol()),
                            NewVarIdentifier(state, base_param.GetSymbol()));
                        const node = NewExpressionStatement(state, assignment);
                        shaderBody.AddChild(node);
                    }
                }
            }
        }
    }
}

/**
 * Carbon's `HasSystemRegister`: whether any of a symbol's bindings is a
 * Metal built-in.
 *
 * @param {Symbol} symbol The symbol.
 * @returns {boolean} Whether it has a `System` binding.
 */
function HasSystemRegister(symbol)
{
    let hasSystemRegister = false;
    for (const [, reg] of symbol.registerSpecifier)
    {
        if (reg.registerType === MetalRegister.Enum.System)
        {
            hasSystemRegister = true;
            break;
        }
    }

    return hasSystemRegister;
}

/**
 * Whether an entry-point parameter is an input: no qualifier, or `in`.
 *
 * @param {ASTNode} arg The `NT_FUNCTION_PARAMETER`.
 * @returns {boolean} Carbon's `isIn`.
 */
function isInParameter(arg)
{
    return arg.GetToken() === null || arg.GetToken().type === T.OP_IN;
}

/**
 * Carbon's `GatherInputs`: the entry point's non-system inputs, struct
 * fields flattened, into the `[[stage_in]]` struct.
 *
 * @param {ASTNode} destStruct Receives the flat members.
 * @param {ASTNode[]} accessors Receives how each is reached through the wrapper's locals.
 * @param {Array<Symbol|null>} params The wrapper's local per original parameter.
 * @param {ASTNode} header The original entry point's header.
 * @param {ParserState} state The parse.
 */
function GatherInputs(destStruct, accessors, params, header, state)
{
    for (let i = 0; i < header.GetChildrenCount(); ++i)
    {
        const arg = header.GetChild(i);

        if (IsUniformInputArgument(arg) || arg.GetSymbol().addressSpace !== Symbol.AddressSpace.None)
        {
            continue;
        }
        const isIn = isInParameter(arg);
        if (!isIn)
        {
            continue;
        }

        const symbol = arg.GetSymbol();
        if (!symbol)
        {
            continue;
        }

        if (HasSystemRegister(symbol))
        {
            continue;
        }

        if (!params[i])
        {
            continue;
        }

        if (symbol.type.IsStruct())
        {
            GatherFields(destStruct, accessors, NewVarIdentifier(state, params[i]), symbol.type.symbol.definition, state);
        }
        else if (symbol.type.IsScalarOrVector())
        {
            destStruct.AddChild(NewStructMember(state, symbol));
            accessors.push(NewVarIdentifier(state, params[i]));
        }
    }
}

/**
 * Carbon's `GatherSystemInputs`: system-semantic fields of struct inputs
 * become wrapper parameters (`GatherSystemFields`); a scalar `SV_VertexID` or
 * `SV_InstanceID` parameter gets its `base_vertex` or `base_instance`
 * parameter and subtraction. Scalar system parameters themselves are added
 * later, with the resources.
 *
 * Quirk (EffectCompilerMetal.cpp:2402, :2418; Carbon known defect CE-108): as
 * in `GatherSystemFields`, the base subtraction compares the semantic
 * case-sensitively. Reproduced.
 *
 * @param {ASTNode} destStruct The wrapper header; receives the parameters.
 * @param {ASTNode[]} accessors Receives the field access expressions.
 * @param {ASTNode[]} argumentAccessors Receives the parameter references.
 * @param {Array<Symbol|null>} params The wrapper's local per original parameter.
 * @param {ASTNode} header The original entry point's header.
 * @param {ASTNode} shaderBody The wrapper body; receives the subtractions.
 * @param {ParserState} state The parse.
 */
function GatherSystemInputs(destStruct, accessors, argumentAccessors, params, header, shaderBody, state)
{
    for (let i = 0; i < header.GetChildrenCount(); ++i)
    {
        const arg = header.GetChild(i);

        if (IsUniformInputArgument(arg) || arg.GetSymbol().addressSpace !== Symbol.AddressSpace.None)
        {
            continue;
        }
        const isIn = isInParameter(arg);
        if (!isIn)
        {
            continue;
        }

        const symbol = arg.GetSymbol();
        if (!symbol)
        {
            continue;
        }

        if (HasSystemRegister(symbol))
        {
            // subtract base_vertex from vertex_id to match dx12 behaviour for SV_VertexID
            if (symbol.semantic.Equals__Chars("SV_VertexID"))
            {
                const param = NewFunctionParameter(state, Type.hlsl.uint_t);
                param.GetSymbol().registerSpecifier.set("", MetalSystemSemantics(MetalSystemSemanticsType.Enum.base_vertex));
                destStruct.AddChild(param);

                const assignment = NewBinaryExpression(
                    state,
                    T.OP_SUB_ASSIGN,
                    NewVarIdentifier(state, header.GetChild(i).GetSymbol()),
                    NewVarIdentifier(state, param.GetSymbol()));
                const node = NewExpressionStatement(state, assignment);
                shaderBody.AddChild(node);
            }

            // subtract base_instance from instance_id to match dx12 behaviour for SV_InstanceID
            if (symbol.semantic.Equals__Chars("SV_InstanceID"))
            {
                const param = NewFunctionParameter(state, Type.hlsl.uint_t);
                param.GetSymbol().registerSpecifier.set("", MetalSystemSemantics(MetalSystemSemanticsType.Enum.base_instance));
                destStruct.AddChild(param);

                const assignment = NewBinaryExpression(
                    state,
                    T.OP_SUB_ASSIGN,
                    NewVarIdentifier(state, header.GetChild(i).GetSymbol()),
                    NewVarIdentifier(state, param.GetSymbol()));
                const node = NewExpressionStatement(state, assignment);
                shaderBody.AddChild(node);
            }

            continue;
        }

        if (!params[i])
        {
            continue;
        }

        if (symbol.type.IsStruct())
        {
            GatherSystemFields(destStruct, accessors, argumentAccessors, NewVarIdentifier(state, params[i]), symbol.type.symbol.definition, shaderBody, state);
        }
    }
}

/**
 * Carbon's `GatherOutputs`: the entry point's `out` parameters and return
 * value, struct fields flattened, into the stage output struct.
 *
 * @param {ASTNode} destStruct Receives the flat members.
 * @param {ASTNode[]} accessors Receives how each is reached through the wrapper's locals.
 * @param {Array<Symbol|null>} params The wrapper's local per original parameter, then the result's.
 * @param {ASTNode} header The original entry point's header.
 * @param {ParserState} state The parse.
 */
function GatherOutputs(destStruct, accessors, params, header, state)
{
    for (let i = 0; i < header.GetChildrenCount(); ++i)
    {
        const arg = header.GetChild(i);

        if (IsUniformInputArgument(arg) || arg.GetSymbol().addressSpace !== Symbol.AddressSpace.None)
        {
            continue;
        }

        const isIn = isInParameter(arg);
        if (isIn)
        {
            continue;
        }

        const symbol = arg.GetSymbol();
        if (symbol === null)
        {
            continue;
        }

        const access = NewVarIdentifier(state, params[i]);

        if (symbol.type.IsStruct())
        {
            GatherFields(destStruct, accessors, access, symbol.type.symbol.definition, state);
        }
        else if (symbol.type.IsScalarOrVector())
        {
            destStruct.AddChild(NewStructMember(state, symbol));
            accessors.push(access);
        }
    }
    if (header.GetType().IsStruct() || header.GetType().IsScalarOrVector())
    {
        const symbol = header.GetSymbol();
        const access = NewVarIdentifier(state, params[params.length - 1]);

        if (symbol.type.IsStruct())
        {
            GatherFields(destStruct, accessors, access, symbol.type.symbol.definition, state);
        }
        else
        {
            destStruct.AddChild(NewStructMember(state, symbol));
            accessors.push(access);
        }
    }
}

/**
 * Carbon's `PatchVpos`: a pixel shader's second `POSITION`/`VPOS` input is
 * read from the first `POSITION` instead (swizzled to its width), so the
 * `[[stage_in]]` struct has one position; a lone narrower `VPOS` is widened
 * to `float4` and swizzled back.
 *
 * Bug (EffectCompilerMetal.cpp:2552, :2566; Carbon known defect CE-106): the
 * swizzle is the first `4 - width` letters of `xyzw` rather than the first
 * `width`, so a `float3` VPOS reads `.x` and a `float` one `.xyz`; the usual
 * `float2` VPOS is right only because 4 - 2 = 2. Reproduced.
 *
 * Latent (EffectCompilerMetal.cpp:2550, :2558): `argumentAccessors[index]`
 * is indexed by the struct's member index, which is offset when struct inputs
 * had nested system fields, and after a removed member.
 *
 * @param {ParserState} state Reports a position of the wrong type.
 * @param {ASTNode} inputsStruct The `[[stage_in]]` struct.
 * @param {ASTNode[]} argumentAccessors The expressions the wrapper reads each input from.
 * @returns {boolean} False after an error.
 */
function PatchVpos(state, inputsStruct, argumentAccessors)
{
    const float4 = Type.typeFromTokenType(T.OP_FLOAT);
    float4.width = 4;
    const swizzles = { text: "xyzw" };

    // First find POSITION input
    let position = null;
    let positionIndex = 0;
    for (let index = 0; index < inputsStruct.GetChildrenCount(); ++index)
    {
        const child = inputsStruct.GetChild(index);
        const member = child.GetChild(0);
        if (InlineString.iEquals__Chars(member.GetSymbol().semantic, "SV_Position") || InlineString.iEquals__Chars(member.GetSymbol().semantic, "POSITION") || InlineString.iEquals__Chars(member.GetSymbol().semantic, "POSITION0"))
        {
            if (!child.GetType().Equals(float4))
            {
                state.ShowMessage(ParserState.ErrorCode.EC_CUSTOM_ERROR, "Pixel shader %s input needs to be a float4", member.GetSymbol().semantic.ToString());
                return false;
            }
            position = child;
            positionIndex = index;
            break;
        }
    }

    // Find any other POSITION/VPOS inputs and remap them to the first POSITION
    for (let index = 0; index < inputsStruct.GetChildrenCount(); ++index)
    {
        const child = inputsStruct.GetChild(index);
        if (child === position)
        {
            continue;
        }
        const member = child.GetChild(0);
        if (InlineString.iEquals__Chars(member.GetSymbol().semantic, "SV_Position") || InlineString.iEquals__Chars(member.GetSymbol().semantic, "POSITION") || InlineString.iEquals__Chars(member.GetSymbol().semantic, "POSITION0") || InlineString.iEquals__Chars(member.GetSymbol().semantic, "VPOS"))
        {
            if (!child.GetType().IsScalarOrVector() || child.GetType().builtInType !== T.OP_FLOAT)
            {
                state.ShowMessage(ParserState.ErrorCode.EC_CUSTOM_ERROR, "Pixel shader %s input needs to be a float vector", member.GetSymbol().semantic.ToString());
                return false;
            }
            if (position)
            {
                if (!position.GetType().Equals(child.GetType()))
                {
                    argumentAccessors[index] = NewDot__InlineString(state,
                        argumentAccessors[positionIndex].Copy(),
                        InlineString.makeInlineString__StartEnd(swizzles, 0, 4 - child.GetType().width));
                }
                else
                {
                    argumentAccessors[index] = argumentAccessors[positionIndex].Copy();
                }
                inputsStruct.RemoveChild(index);
                --index;
            }
            else if (child.GetType().width !== 4)
            {
                argumentAccessors[index] = NewDot__InlineString(state,
                    argumentAccessors[index].Copy(),
                    InlineString.makeInlineString__StartEnd(swizzles, 0, 4 - child.GetType().width));
                child.SetType(float4);
                member.SetType(float4);
                member.GetSymbol().type = float4.Copy();
            }
        }
    }
    return true;
}

/**
 * Carbon's `ApplyPackedModifier`: marks a struct's `float3`-like members (or,
 * with `tightPacking`, every vector) as packed, nested structs included, so
 * Metal lays them out as HLSL does. `OP_PACKOFFSET` is reused as the marker
 * (Carbon: "let us abuse this token type!") and prints as `packed_`.
 *
 * @param {ASTNode} structNode The `NT_STRUCT`.
 * @param {boolean} tightPacking Pack every non-bool vector.
 */
function ApplyPackedModifier(structNode, tightPacking)
{
    for (const member of structNode.GetChildren())
    {
        for (const variable of member.GetChildren())
        {
            const type = variable.GetSymbol().type;
            if (type.IsVector() && (tightPacking || type.width === 3) && type.builtInType !== T.OP_BOOL)
            {
                type.modifier = T.OP_PACKOFFSET; // let us abuse this token type!
            }
            else if (type.IsStruct())
            {
                ApplyPackedModifier(type.symbol.definition, tightPacking);
            }
        }
    }
}

/**
 * Carbon's `ApplyPackedModifiersToConstantBuffers`: packs the members of the
 * wrapper's constant buffer parameters, and tightly packs the element
 * structs of its structured buffers.
 *
 * @param {ASTNode} functionDefinition The wrapper's `NT_FUNCTION_DEFINITION`.
 */
function ApplyPackedModifiersToConstantBuffers(functionDefinition)
{
    const functionHeader = functionDefinition.GetChildOrNull(0);
    if (!functionHeader)
    {
        return;
    }

    for (const arg of functionHeader.GetChildren())
    {
        const symbol = arg.GetSymbol();
        if (symbol)
        {
            const type = symbol.type;
            if (type.IsStruct() && GetCBufferIndex__Symbol(symbol) >= 0)
            {
                ApplyPackedModifier(type.symbol.definition, false);
            }
            else if (type.IsStruct() && symbol.registerSpecifier.size !== 0 && symbol.registerSpecifier.First()[1].registerType === MetalRegister.Enum.CBuffer)
            {
                ApplyPackedModifier(type.symbol.definition, false);
            }
            else if (type.symbol === null && (type.builtInType === T.OP_STRUCTUREDBUFFER || type.builtInType === T.OP_RWSTRUCTUREDBUFFER))
            {
                if (type.templateParameter && type.templateParameter.IsStruct())
                {
                    ApplyPackedModifier(type.templateParameter.symbol.definition, true);
                }
            }
        }
    }
}

/**
 * Carbon's `GetEntryPointName`: `mainVS`, `mainPS` or `mainCS`; a
 * ray-tracing shader keeps its own name.
 *
 * @param {number} shaderType A `PatchShaderType` value.
 * @param {ASTNode} callNode The pass's call of the entry point.
 * @returns {InlineString} The wrapper's name.
 */
function GetEntryPointName(shaderType, callNode)
{
    switch (shaderType)
    {
        case EffectCompilerMetal.PatchShaderType.VERTEX:
            return InlineString.makeInlineString("mainVS");
        case EffectCompilerMetal.PatchShaderType.PIXEL:
            return InlineString.makeInlineString("mainPS");
        case EffectCompilerMetal.PatchShaderType.COMPUTE:
            return InlineString.makeInlineString("mainCS");
        default:
            return callNode.GetSymbol().name;
    }
}

/**
 * Carbon's `GetShaderAttribute`: the Metal function qualifier of a wrapper.
 *
 * @param {number} shaderType A `PatchShaderType` value.
 * @returns {InlineString} `vertex`, `fragment`, `kernel` or a ray-tracing attribute.
 */
function GetShaderAttribute(shaderType)
{
    switch (shaderType)
    {
        case EffectCompilerMetal.PatchShaderType.VERTEX:
            return InlineString.makeInlineString("vertex");
        case EffectCompilerMetal.PatchShaderType.PIXEL:
            return InlineString.makeInlineString("fragment");
        case EffectCompilerMetal.PatchShaderType.COMPUTE:
            return InlineString.makeInlineString("kernel");
        case EffectCompilerMetal.PatchShaderType.RAY_GEN:
            return InlineString.makeInlineString("kernel");
        case EffectCompilerMetal.PatchShaderType.MISS:
        case EffectCompilerMetal.PatchShaderType.CLOSEST_HIT:
            return InlineString.makeInlineString("[[visible]]");
        case EffectCompilerMetal.PatchShaderType.ANY_HIT:
            return InlineString.makeInlineString("[[intersection(triangle, __INTERSECION_TAGS)]]");
        default:
            return InlineString.makeInlineString("");
    }
}

/**
 * Carbon's `FindCallsToSymbol`: every call of `symbol` in the subtree and in
 * the functions it calls. Carbon defines it and nothing calls it.
 *
 * @param {ASTNode} node The subtree.
 * @param {Symbol} symbol The function.
 * @param {ASTNode[]} calls Receives the calls.
 */
function FindCallsToSymbol(node, symbol, calls)
{
    if (node.GetNodeType() === N.NT_FUNCTION_CALL)
    {
        if (node.GetSymbol() === symbol)
        {
            calls.push(node);
        }
        if (node.GetSymbol() && node.GetSymbol().definition)
        {
            FindCallsToSymbol(node.GetSymbol().definition, symbol, calls);
        }
    }
    for (const child of node.GetChildren())
    {
        if (child)
        {
            FindCallsToSymbol(child, symbol, calls);
        }
    }
}

/**
 * Carbon's `PatchShader`: builds the stage's Metal entry point, a wrapper
 * named by `GetEntryPointName` that calls the original entry point
 * (Carbon's account, M:2698-2703):
 *
 * - all `[[stage_in]]` inputs are put into a new flat struct
 *   (`__StageInData_NNNN`), and all outputs into another
 *   (`__StageOutData_NNNN`), which the wrapper returns;
 * - `uniform` arguments become locals initialised from the technique's
 *   `compile` arguments;
 * - the other arguments (resources, address-spaced values, system values)
 *   are passed as they are, and their bindings move onto the wrapper's
 *   parameters.
 *
 * The wrapper is appended to the program. Building it moves the parser's
 * current location to line 1 of a file named after the wrapper, which every
 * node created afterwards carries.
 *
 * @param {number} shaderType A `PatchShaderType` value.
 * @param {ASTNode} callNode The pass's call of the entry point.
 * @param {ParserState} state The parse.
 * @returns {ASTNode|null} The wrapper's `NT_FUNCTION_DEFINITION`, or null after an error.
 */
function PatchShader(shaderType, callNode, state)
{
    const entryPointSymbol = callNode.GetSymbol();
    if (!entryPointSymbol || !entryPointSymbol.definition)
    {
        return null;
    }

    const functionHeader = entryPointSymbol.definition.GetChildOrNull(0);
    if (!functionHeader)
    {
        return null;
    }

    const shaderName = ScannerToken.id(GetEntryPointName(shaderType, callNode));

    state.GetCurrentLocation().fileName = shaderName.stringValue.Copy();
    state.GetCurrentLocation().lineNumber = 1;

    let inputsStruct = NewStruct(state, state.AllocateNameWithPrefix("StageInData"));
    let outputsStruct = NewStruct(state, state.AllocateNameWithPrefix("StageOutData"));

    const header = state.NewNode__Token(N.NT_FUNCTION_HEADER, shaderName);
    const shaderSymbol = state.GetSymbolTable().AddSymbol(shaderName.stringValue, ALLOW_OVERRIDES);
    shaderSymbol.isFunction = true;
    header.SetSymbol(shaderSymbol);

    state.GetSymbolTable().EnterScope();

    const shaderBody = state.NewNode(N.NT_BLOCK);

    /** @type {Array<Symbol|null>} */
    const params = [];

    let uniformArgIndex = 0;

    for (let i = 0; i < functionHeader.GetChildrenCount(); ++i)
    {
        // Create local variable declarations for original shader function arguments

        const sourceArg = functionHeader.GetChild(i);
        const sourceSymbol = sourceArg.GetSymbol();
        const bracketList = sourceArg.GetChildOrNull(0);

        if (sourceSymbol.addressSpace !== Symbol.AddressSpace.Threadgroup &&
            !IsUniformInputArgument(sourceArg) &&
            ((!sourceArg.GetType().IsStruct() && !sourceArg.GetType().IsScalarOrVector()) ||
                sourceSymbol.addressSpace !== Symbol.AddressSpace.None ||
                HasSystemRegister(sourceSymbol)))
        {
            params.push(null);
            continue;
        }

        const isUniform = IsUniformInputArgument(sourceArg);
        if (shaderType >= EffectCompilerMetal.PatchShaderType.RAY_GEN && !isUniform)
        {
            params.push(null);
            continue;
        }

        const declList = NewVarDeclaration__Type(state,
            sourceArg.GetType(),
            state.AllocateName__InlineString(sourceSymbol.name));
        const declaration = declList.GetChild(0);
        const nameSymbol = declaration.GetSymbol();
        nameSymbol.addressSpace = sourceSymbol.addressSpace;
        shaderBody.AddChild(declList);

        params.push(nameSymbol);

        if (isUniform)
        {
            // uniform arguments are initialized with whatever was passed in the call node

            if (callNode.GetChildrenCount() <= uniformArgIndex)
            {
                state.ShowMessage__Location(callNode.GetLocation(), ParserState.ErrorCode.EC_NO_OVERRIDE, functionHeader.GetToken().stringValue.ToString(), "");
                return null;
            }

            declaration.AddChild(null);
            declaration.AddChild(callNode.GetChild(uniformArgIndex++));
        }
        else if (bracketList)
        {
            declaration.AddChild(bracketList.Copy());
        }
    }
    if (callNode.GetChildrenCount() !== uniformArgIndex)
    {
        state.ShowMessage__Location(callNode.GetLocation(), ParserState.ErrorCode.EC_NO_OVERRIDE, functionHeader.GetToken().stringValue.ToString(), "");
        return null;
    }

    const hasReturnType = !functionHeader.GetType().Equals(Type.hlsl.void_t);
    if (hasReturnType)
    {
        // Local variable for return value

        const declList = NewVarDeclaration__Type(state, functionHeader.GetType(), state.AllocateNameWithPrefix("result"));
        const nameSymbol = declList.GetChild(0).GetSymbol();
        shaderBody.AddChild(declList);

        params.push(nameSymbol);
    }

    const inputAccessors = [];
    const outputAccessors = [];
    const argumentAccessors = [];

    GatherSystemInputs(header, inputAccessors, argumentAccessors, params, functionHeader, shaderBody, state);
    GatherInputs(inputsStruct, inputAccessors, params, functionHeader, state);
    GatherOutputs(outputsStruct, outputAccessors, params, functionHeader, state);

    let stageInSymbol = null;

    // Don't add an empty input struct.
    if (inputsStruct.GetChildrenCount() === 0)
    {
        inputsStruct = null;
    }
    else
    {
        state.GetTree().AddChild(inputsStruct);

        // Add [[stage_in]] parameter.
        const stageIn = NewFunctionParameter(state, Type.typeFromSymbol(inputsStruct.GetSymbol()), state.AllocateNameWithPrefix("stageIn"));
        header.AddChild(stageIn);

        stageInSymbol = stageIn.GetSymbol();
        stageInSymbol.registerSpecifier.set("", RegisterSpecifier.register(MetalRegister.Enum.StageIn));
    }

    // Don't add an empty output struct.
    if (outputsStruct.GetChildrenCount() === 0)
    {
        outputsStruct = null;
    }
    else
    {
        state.GetTree().AddChild(outputsStruct);
    }

    if (inputsStruct)
    {
        for (let i = 0; i < inputsStruct.GetChildrenCount(); ++i)
        {
            argumentAccessors.push(NewDot__Symbol(state, NewVarIdentifier(state, stageInSymbol), inputsStruct.GetChild(i).GetChild(0).GetSymbol()));
        }

        if (shaderType === EffectCompilerMetal.PatchShaderType.PIXEL)
        {
            if (!PatchVpos(state, inputsStruct, argumentAccessors))
            {
                return null;
            }
        }
    }

    for (let i = 0; i < functionHeader.GetChildrenCount(); ++i)
    {
        // Add parameters for the rest of original shader inputs
        const sourceArg = functionHeader.GetChild(i);
        const sourceSymbol = sourceArg.GetSymbol();

        if (sourceSymbol.addressSpace !== Symbol.AddressSpace.Threadgroup &&
            !IsUniformInputArgument(sourceArg) &&
            ((!sourceArg.GetType().IsStruct() && !sourceArg.GetType().IsScalarOrVector()) ||
                sourceSymbol.addressSpace !== Symbol.AddressSpace.None ||
                HasSystemRegister(sourceSymbol)))
        {
            const arg = NewFunctionParameter(state, sourceArg.GetType(), state.AllocateName__InlineString(sourceSymbol.name));
            arg.GetSymbol().addressSpace = sourceSymbol.addressSpace;
            // std::map::swap: the bindings move to the wrapper's parameter.
            const registerSpecifier = arg.GetSymbol().registerSpecifier;
            arg.GetSymbol().registerSpecifier = sourceSymbol.registerSpecifier;
            sourceSymbol.registerSpecifier = registerSpecifier;
            // arg->GetSymbol()->registerSpecifier = sourceSymbol->registerSpecifier;

            if (sourceArg.GetType().IsStruct())
            {
                const ref = new ScannerToken();
                ref.type = T.OP_INOUT;

                arg.SetToken(ref);
            }

            header.AddChild(arg);
            params[i] = arg.GetSymbol();
        }
    }

    if (inputsStruct)
    {
        for (let i = 0; i < inputAccessors.length; ++i)
        {
            // Add assignments for all inputsStruct fields.
            const assignment = NewBinaryExpression(
                state,
                T.OP_EQUAL,
                inputAccessors[i],
                argumentAccessors[i]);
            shaderBody.AddChild(NewExpressionStatement(state, assignment));
        }
    }
    if (shaderType >= EffectCompilerMetal.PatchShaderType.RAY_GEN)
    {
        const statements = entryPointSymbol.definition.GetChild(1).GetChildren();
        for (const stmt of statements)
        {
            shaderBody.AddChild(stmt.Copy());
        }
        header.SetType(Type.hlsl.void_t);
    }
    else
    {
        // Call the original function
        const call = state.NewNode__Token(N.NT_FUNCTION_CALL, ScannerToken.id(entryPointSymbol.name));
        call.SetSymbol(entryPointSymbol);
        call.SetType(functionHeader.GetType());
        for (let i = 0; i < functionHeader.GetChildrenCount(); ++i)
        {
            if ((params[i].type.IsTexture() || params[i].type.IsSampler() || params[i].type.IsBuffer()) && params[i].type.arrayDimensions > 0)
            {
                const cast = state.NewNode(N.NT_CAST_EXPRESSION);
                cast.SetType(params[i].type);
                cast.AddChild(NewVarIdentifier(state, params[i]));
                call.AddChild(cast);
                cast.SetSymbol(params[i]);
            }
            else
            {
                call.AddChild(NewVarIdentifier(state, params[i]));
            }
        }
        if (hasReturnType)
        {
            const assignment = NewBinaryExpression(
                state,
                T.OP_EQUAL,
                NewVarIdentifier(state, params[params.length - 1]),
                call);

            shaderBody.AddChild(NewExpressionStatement(state, assignment));
        }
        else
        {
            shaderBody.AddChild(NewExpressionStatement(state, call));
        }

        if (outputsStruct)
        {
            header.SetType(Type.typeFromSymbol(outputsStruct.GetSymbol()));

            // Create a local variable for outputs
            const resultDeclList = NewVarDeclaration__Type(state, Type.typeFromSymbol(outputsStruct.GetSymbol()), state.AllocateNameWithPrefix("stageOut"));
            const resultSymbol = resultDeclList.GetChild(0).GetSymbol();
            shaderBody.AddChild(resultDeclList);

            for (let i = 0; i < outputsStruct.GetChildrenCount(); ++i)
            {
                // Add assignments for all fields in the output struct
                const assignment = NewBinaryExpression(
                    state,
                    T.OP_EQUAL,
                    NewDot__Symbol(state, NewVarIdentifier(state, resultSymbol), outputsStruct.GetChild(i).GetChild(0).GetSymbol()),
                    outputAccessors[i]);
                shaderBody.AddChild(NewExpressionStatement(state, assignment));
            }

            shaderBody.AddChild(NewReturn(state, NewVarIdentifier(state, resultSymbol)));
        }
        else
        {
            header.SetType(Type.typeFromTokenType(T.OP_VOID));
        }
    }

    state.GetSymbolTable().LeaveScope();

    const shader = state.NewNode(N.NT_FUNCTION_DEFINITION);
    shaderSymbol.type = header.GetType().Copy();
    shaderSymbol.definition = shader;
    shader.AddChild(header);
    shader.AddChild(shaderBody);

    const attribList = state.NewNode(N.NT_FUNCTION_ATTRIBUTE_LIST);
    attribList.AddChild(state.NewNode__Token(N.NT_FUNCTION_ATTRIBUTE, ScannerToken.id(GetShaderAttribute(shaderType))));
    shader.AddChild(attribList);
    state.GetTree().AddChild(shader);

    // If the patched shader ends up using global scalar variables via uniform arguments, we need to
    // convert their references into GlobalsData field lookups
    const globalStructSymbol = state.GetSymbolTable().Lookup(InlineString.makeInlineString("GlobalsData"));
    if (globalStructSymbol)
    {
        const globalsStructMembers = new Set();
        for (const member of globalStructSymbol.definition.GetChildren())
        {
            globalsStructMembers.add(member.GetChild(0).GetSymbol());
        }
        let globalsParam = null;
        for (const param of header.GetChildren())
        {
            if (param.GetType().symbol === globalStructSymbol)
            {
                globalsParam = param.GetSymbol();
                break;
            }
        }
        shaderBody.Map(node =>
        {
            if (node.GetNodeType() === N.NT_VAR_IDENTIFIER && globalsStructMembers.has(node.GetSymbol()))
            {
                if (!globalsParam)
                {
                    const type = Type.typeFromSymbol(globalStructSymbol);
                    const token = new ScannerToken();
                    token.type = T.OP_INOUT;

                    const param = NewFunctionParameter(state, type, InlineString.makeInlineString("Globals"));
                    param.SetToken(token);
                    header.AddChild(param);
                    globalsParam = param.GetSymbol();
                    globalsParam.addressSpace = Symbol.AddressSpace.Constant;
                }
                return NewDot__InlineString(state, NewVarIdentifier(state, globalsParam), node.GetSymbol().name);
            }
            return node;
        });
    }

    return shader;
}

// ClassifyRtShaderArguments and PatchRtShader (M:3039-3367) belong to the
// ray-tracing path and are not ported.

/**
 * Carbon's `MakeEffectAnnotationFromSymbolAnnotation`: an HLSL annotation as
 * an effect annotation. A `bool Tr2sRGB` or `bool AutoRegister` annotation
 * also sets the flag of the same meaning.
 *
 * @param {import("../SymbolTable/SymbolAnnotation.js").SymbolAnnotation} annotation The HLSL annotation.
 * @param {Annotation} result Receives the effect annotation.
 * @param {{ value: boolean }} isSRGB Set by a `Tr2sRGB` annotation.
 * @param {{ value: boolean }} isAutoregister Set by an `AutoRegister` annotation.
 * @returns {boolean} False for an annotation of another type.
 */
function MakeEffectAnnotationFromSymbolAnnotation(annotation, result, isSRGB, isAutoregister)
{
    switch (annotation.type)
    {
        case T.OP_FLOAT:
        case T.OP_HALF:
        case T.OP_DOUBLE:
            result.type = Annotation.AnnotationType.ANNOTATION_TYPE_FLOAT;
            result.floatValue = Math.fround(ParseFloat(annotation.value.stringValue));
            return true;

        case T.OP_UINT:
        case T.OP_INT:
            result.type = Annotation.AnnotationType.ANNOTATION_TYPE_INT;
            result.intValue = ParseNumber(annotation.value.stringValue) | 0;
            return true;

        case T.OP_BOOL:
            result.type = Annotation.AnnotationType.ANNOTATION_TYPE_BOOL;
            result.intValue = annotation.value.intValue ? 1 : 0;
            if (annotation.name.Equals__Chars("Tr2sRGB"))
            {
                isSRGB.value = result.intValue !== 0;
            }
            else if (annotation.name.Equals__Chars("AutoRegister"))
            {
                isAutoregister.value = result.intValue !== 0;
            }
            return true;

        case T.OP_STRING:
            result.type = Annotation.AnnotationType.ANNOTATION_TYPE_STRING;
            result.stringValue = ParseString(annotation.value.stringValue);
            return true;
    }

    return false;
}

/**
 * Carbon's `CalculateSizeAndOffset`: a value's size under Metal's layout,
 * and `offset` rounded up to its alignment. `float3` is 16 bytes, 12 when
 * packed; `bool` is one byte per component; matrices are columns of
 * vectors.
 *
 * Bug (EffectCompilerMetal.cpp:3495-3503; Carbon known defect CE-109): any
 * other scalar type (`half`, `double`) falls to `default`, which leaves the
 * alignment 0, and `offset % 0` is a division by zero; a used `half` global
 * crashes the compiler. The port throws there. Integer matrices take the
 * vector table by width only, so `int2x2` is sized as `int2`.
 *
 * @param {Type} type The value's type.
 * @param {{ value: number }} size Receives the size in bytes.
 * @param {{ value: number }} offset The running offset, aligned in place.
 */
function CalculateSizeAndOffset(type, size, offset)
{
    let typeSize = 0;
    let typeAlignment = 0;

    const boolSize = [1, 2, 4, 4];
    const boolAlignment = [1, 2, 4, 4];

    const intSize = [4, 8, 16, 16];
    const intAlignment = [4, 8, 16, 16];

    const packedIntSize = [4, 8, 12, 16];
    const packedIntAlignment = [4, 4, 4, 4];

    const floatSize = [4, 8, 16, 16];
    const floatAlignment = [4, 8, 16, 16];

    const packedFloatSize = [4, 8, 12, 16];
    const packedFloatAlignment = [4, 4, 4, 4];

    const floatMatrixSize = [
        [16, 32, 32], // 2x2, 2x3, 2x4
        [24, 48, 48], // 3x2, 3x3, 3x4
        [32, 64, 64] // 4x2, 4x3, 4x4
    ];
    const floatMatrixAlignment = [
        [8, 16, 16], // 2x2, 2x3, 2x4
        [8, 16, 16], // 3x2, 3x3, 3x4
        [8, 16, 16] // 4x2, 4x3, 4x4
    ];

    const isPacked = type.modifier === T.OP_PACKOFFSET;

    // Carbon asserts 1 <= width, height <= 4 and indexes its tables with them.
    const at = (table, index) =>
    {
        if (!(index >= 0 && index < table.length))
        {
            throw new RangeError(`CalculateSizeAndOffset: ${type.ToString()} reads outside Carbon's size tables`);
        }
        return table[index];
    };

    switch (type.builtInType)
    {
        case T.OP_BOOL:
            typeSize = at(boolSize, type.width - 1);
            typeAlignment = at(boolAlignment, type.width - 1);
            break;
        case T.OP_INT:
        case T.OP_UINT:
        case T.OP_BINDLESSHANDLETEXTURE2D:
        case T.OP_BINDLESSHANDLETEXTURE3D:
        case T.OP_BINDLESSHANDLETEXTURECUBE:
        case T.OP_BINDLESSHANDLESAMPLER:
            if (isPacked)
            {
                typeSize = at(packedIntSize, type.width - 1);
                typeAlignment = at(packedIntAlignment, type.width - 1);
            }
            else
            {
                typeSize = at(intSize, type.width - 1);
                typeAlignment = at(intAlignment, type.width - 1);
            }
            break;
        case T.OP_FLOAT:
            if (type.height === 1)
            {
                if (isPacked)
                {
                    typeSize = at(packedFloatSize, type.width - 1);
                    typeAlignment = at(packedFloatAlignment, type.width - 1);
                }
                else
                {
                    typeSize = at(floatSize, type.width - 1);
                    typeAlignment = at(floatAlignment, type.width - 1);
                }
            }
            else
            {
                const row = type.width - 2;
                const col = type.height - 2;

                // Matrices are column-major in MSL.
                typeSize = at(at(floatMatrixSize, col), row);
                typeAlignment = at(at(floatMatrixAlignment, col), row);
            }
            break;
        default:
            break;
    }

    size.value = typeSize;

    if (typeAlignment === 0)
    {
        throw new RangeError(`CalculateSizeAndOffset: ${type.ToString()} has no Metal size, and Carbon divides by its zero alignment (Carbon known defect CE-109)`);
    }
    offset.value += typeAlignment - 1;
    offset.value -= offset.value % typeAlignment;
}

/**
 * Carbon's `FillDefaults`: writes a constant's initializer into the default
 * value bytes, as 32-bit floats or ints.
 *
 * Quirk (EffectCompilerMetal.cpp:3511-3543; Carbon known defect CE-110): only
 * `float` and `int` initializers are written; a matrix or any other type
 * with an initializer fails the compile with "unsupported type". A used
 * `uint` or `bool` global with an initializer fails one step earlier, in
 * `EvaluateInitializer`, whose casts convert only between int and float
 * (FXAnalyzer.cpp:358-384): "type mismatch".
 *
 * @param {ParserState} state Reports an unsupported type.
 * @param {ASTNode} node The initializer.
 * @param {DataView} outDefaultValues The default value bytes.
 * @param {number} byteOffset Where this value starts.
 * @param {Type} type The constant's type.
 * @returns {boolean} False after an error.
 */
function FillDefaults(state, node, outDefaultValues, byteOffset, type)
{
    const expectedType = type.Copy();
    const value = [];

    if (type.IsMatrix())
    {
        state.ShowMessage__Location(node.GetLocation(), ParserState.ErrorCode.EC_UNSUPPORTED_TYPE, type.ToString());
        return false;
    }

    if (EvaluateInitializer(state, node, expectedType, value, null))
    {
        const count = type.width * type.height;

        if (type.builtInType === T.OP_FLOAT)
        {
            for (let i = 0; i < count; ++i)
            {
                const element = value[i];
                if (element === undefined || element.floatValue === undefined)
                {
                    throw new RangeError("FillDefaults: reads a default value Carbon's evaluator did not produce (undefined in Carbon)");
                }
                outDefaultValues.setFloat32(byteOffset + i * 4, element.floatValue, true);
            }
        }
        else if (type.builtInType === T.OP_INT)
        {
            for (let i = 0; i < count; ++i)
            {
                const element = value[i];
                if (element === undefined || element.intValue === undefined)
                {
                    throw new RangeError("FillDefaults: reads a default value Carbon's evaluator did not produce (undefined in Carbon)");
                }
                outDefaultValues.setInt32(byteOffset + i * 4, element.intValue | 0, true);
            }
        }
        else
        {
            // Type not supported.
            state.ShowMessage__Location(node.GetLocation(), ParserState.ErrorCode.EC_UNSUPPORTED_TYPE, type.ToString());
            return false;
        }

        return true;
    }

    return false;
}

/**
 * Grows a stage's default value bytes, as `std::vector<BYTE>::resize` does:
 * new bytes are zero.
 *
 * @param {StageInput} stage The stage.
 * @param {number} size The new size, at least the current one.
 */
function resizeDefaultValues(stage, size)
{
    if (size === stage.defaultValues.length)
    {
        return;
    }
    const bytes = new Uint8Array(size);
    bytes.set(stage.defaultValues);
    stage.defaultValues = bytes;
}

/**
 * Carbon's `CollectConstants( ParserState&, StageData&, ASTNode*, ... )`: a
 * `Constant` per used member of the globals struct, laid out by
 * `CalculateSizeAndOffset`, with its default value bytes and its
 * parameter annotations (and a bindless handle's type and sampler).
 *
 * @param {ParserState} state The parse.
 * @param {StageInput} stage Receives the constants and default values.
 * @param {ASTNode} node The `GlobalsData` `NT_STRUCT`.
 * @param {CjsFxStdMap} annotations The effect's parameter annotations, by name.
 * @returns {boolean} False after an error.
 */
function CollectConstants__Node(state, stage, node, annotations)
{
    const offset = { value: 0 };

    for (const memberNode of node.GetChildren())
    {
        for (const childNode of memberNode.GetChildren())
        {
            const symbol = childNode.GetSymbol();

            if (!symbol.used)
            {
                continue;
            }

            const type = symbol.type;

            const size = { value: 0 };
            CalculateSizeAndOffset(type, size, offset);

            let elementCount = 1;
            for (let i = 0; i < type.arrayDimensions; ++i)
            {
                elementCount *= type.arraySizes[i];
            }

            // Note: This calculation is correct only when type can be tightly packed in an array,
            // i.e. type size divisible by alignment.
            size.value *= elementCount;

            const constant = new Constant();
            constant.name = symbol.name.ToString();
            constant.offset = offset.value >>> 0;
            constant.size = size.value >>> 0;

            offset.value += size.value;

            switch (type.builtInType)
            {
                case T.OP_FLOAT:
                    constant.type = Constant.ConstantType.CONSTANT_TYPE_FLOAT;
                    break;
                case T.OP_INT:
                    constant.type = Constant.ConstantType.CONSTANT_TYPE_INT;
                    break;
                case T.OP_UINT:
                case T.OP_BINDLESSHANDLETEXTURE2D:
                case T.OP_BINDLESSHANDLETEXTURE3D:
                case T.OP_BINDLESSHANDLETEXTURECUBE:
                case T.OP_BINDLESSHANDLESAMPLER:
                    constant.type = Constant.ConstantType.CONSTANT_TYPE_UINT;
                    break;
                case T.OP_BOOL:
                    constant.type = Constant.ConstantType.CONSTANT_TYPE_BOOL;
                    break;
                default:
                    constant.type = Constant.ConstantType.CONSTANT_TYPE_OTHER;
                    break;
            }

            constant.dimension = (type.width * type.height) & 0xff;
            constant.elements = elementCount >>> 0;
            constant.isSRGB = false;
            constant.isAutoregister = false;

            resizeDefaultValues(stage, Math.max(stage.defaultValues.length, constant.offset + constant.size));

            // Init with zeroes.
            stage.defaultValues.fill(0, constant.offset, constant.offset + constant.size);

            const defaultValues = new DataView(stage.defaultValues.buffer, stage.defaultValues.byteOffset, stage.defaultValues.byteLength);

            // Has default value?
            const defaultValueNode = childNode.GetChildOrNull(1);
            if (defaultValueNode)
            {
                if (type.arrayDimensions === 0)
                {
                    if (!FillDefaults(state, defaultValueNode, defaultValues, constant.offset, type))
                    {
                        return false;
                    }
                }
                else if (type.arrayDimensions === 1)
                {
                    for (let i = 0, n = defaultValueNode.GetChildrenCount(); i < n; ++i)
                    {
                        const elementOffset = constant.offset + i * size.value / elementCount;
                        if (!FillDefaults(state, defaultValueNode.GetChild(i), defaultValues, elementOffset, type))
                        {
                            return false;
                        }
                    }
                }
                else
                {
                    state.ShowMessage__Location(defaultValueNode.GetLocation(), ParserState.ErrorCode.EC_UNSUPPORTED_TYPE, type.ToString());
                    return false;
                }
            }

            if (!annotations.has(constant.name))
            {
                const paramAnnotations = new ParameterAnnotation();

                if (symbol.annotations)
                {
                    for (const a of symbol.annotations)
                    {
                        const result = new Annotation();
                        const isSRGB = { value: constant.isSRGB };
                        const isAutoregister = { value: constant.isAutoregister };
                        if (MakeEffectAnnotationFromSymbolAnnotation(a, result, isSRGB, isAutoregister))
                        {
                            paramAnnotations.annotations.set(a.name.ToString(), result);
                        }
                        constant.isSRGB = isSRGB.value;
                        constant.isAutoregister = isAutoregister.value;
                    }
                }
                if (symbol.type.IsBindlessHandle())
                {
                    const symbolAnnotation = new Annotation();
                    symbolAnnotation.type = Annotation.AnnotationType.ANNOTATION_TYPE_INT;
                    symbolAnnotation.intValue = symbol.type.builtInType === T.OP_BINDLESSHANDLESAMPLER ? 100 : BindlessTextureType(symbol.type.builtInType);
                    paramAnnotations.annotations.set("BindlessHandleType", symbolAnnotation);
                }
                if (paramAnnotations.annotations.size !== 0)
                {
                    annotations.set(constant.name, paramAnnotations);
                }
            }

            if (type.builtInType === T.OP_BINDLESSHANDLESAMPLER)
            {
                const found = state.bindlessSamplers.findIndex(bs => bs.name === symbol);
                if (found >= 0)
                {
                    const sampler = new Sampler();
                    if (GetSamplerState(state, state.bindlessSamplers[found].definition, sampler))
                    {
                        sampler.name = constant.name;
                        stage.samplers.set((100 + found) & 0xff, sampler);
                    }
                }
            }

            stage.constants.push(constant);
        }
    }
    return true;
}

/**
 * Carbon's `TypeToRegisterInputType`.
 *
 * @param {Type} type A resource type.
 * @returns {number} A `RegisterInputType` value; `RT_SRV_TEXTURE2D` for anything else.
 */
function TypeToRegisterInputType(type)
{
    const R = RegisterInputDescription.RegisterInputType;
    switch (type.builtInType)
    {
        case T.OP_BUFFER:
        case T.OP_RAYTRACING_ACCELERATION_STRUCTURE:
            return R.RT_SRV_BUFFER;
        case T.OP_STRUCTUREDBUFFER:
            return R.RT_SRV_STRUCTURED_BUFFER;
        case T.OP_RWBUFFER:
            return R.RT_UAV_BUFFER;
        case T.OP_RWSTRUCTUREDBUFFER:
            return R.RT_UAV_STRUCTURED_BUFFER;
        case T.OP_TEXTURE:
            return R.RT_SRV_TEXTURE2D;
        case T.OP_TEXTURE1D:
            return R.RT_SRV_TEXTURE1D;
        case T.OP_TEXTURE1DARRAY:
            return R.RT_SRV_TEXTURE1DARRAY;
        case T.OP_TEXTURE2D:
            return R.RT_SRV_TEXTURE2D;
        case T.OP_TEXTURE2DARRAY:
            return R.RT_SRV_TEXTURE2DARRAY;
        case T.OP_TEXTURE3D:
            return R.RT_SRV_TEXTURE3D;
        case T.OP_TEXTURECUBE:
            return R.RT_SRV_TEXTURECUBE;
        case T.OP_TEXTURECUBEARRAY:
            return R.RT_SRV_TEXTURECUBEARRAY;
        case T.OP_TEXTURE2DMS:
            return R.RT_SRV_TEXTURE2DMS;
        case T.OP_TEXTURE2DMSARRAY:
            return R.RT_SRV_TEXTURE2DMSARRAY;
        case T.OP_RWTEXTURE1D:
            return R.RT_UAV_TEXTURE1D;
        case T.OP_RWTEXTURE1DARRAY:
            return R.RT_UAV_TEXTURE1DARRAY;
        case T.OP_RWTEXTURE2D:
            return R.RT_UAV_TEXTURE2D;
        case T.OP_RWTEXTURE2DARRAY:
            return R.RT_UAV_TEXTURE2DARRAY;
        case T.OP_RWTEXTURE3D:
            return R.RT_UAV_TEXTURE3D;
        case T.OP_SAMPLER:
        case T.OP_SAMPLER2D:
        case T.OP_SAMPLER3D:
        case T.OP_SAMPLERCUBE:
        case T.OP_SAMPLERCOMPARISON:
            return R.RT_SAMPLER;
        default:
            return R.RT_SRV_TEXTURE2D;
    }
}

/**
 * Carbon's `TypeToTextureType`.
 *
 * @param {Type} type A resource type.
 * @returns {number} A `TextureType` value; `TEX_TYPE_INVALID` for anything else.
 */
function TypeToTextureType(type)
{
    switch (type.builtInType)
    {
        case T.OP_TEXTURE1D:
        case T.OP_TEXTURE1DARRAY:
        case T.OP_RWTEXTURE1D:
        case T.OP_RWTEXTURE1DARRAY:
            return Texture.TextureType.TEX_TYPE_1D;
        case T.OP_TEXTURE:
        case T.OP_TEXTURE2D:
        case T.OP_TEXTURE2DARRAY:
        case T.OP_TEXTURE2DMS:
        case T.OP_TEXTURE2DMSARRAY:
        case T.OP_RWTEXTURE2D:
        case T.OP_RWTEXTURE2DARRAY:
            return Texture.TextureType.TEX_TYPE_2D;
        case T.OP_TEXTURE3D:
        case T.OP_RWTEXTURE3D:
        case T.OP_TEXTURE3DARRAY:
            return Texture.TextureType.TEX_TYPE_3D;
        case T.OP_TEXTURECUBE:
        case T.OP_TEXTURECUBEARRAY:
            return Texture.TextureType.TEX_TYPE_CUBE;
        case T.OP_BUFFER:
        case T.OP_RWBUFFER:
            return Texture.TextureType.TEX_TYPE_BUFFER;
        case T.OP_STRUCTUREDBUFFER:
        case T.OP_RWSTRUCTUREDBUFFER:
            return Texture.TextureType.TEX_TYPE_STRUCTURED_BUFFER;
        case T.OP_RAYTRACING_ACCELERATION_STRUCTURE:
            return Texture.TextureType.TEX_TYPE_RAYTRACING_ACCELERATION_STRUCTURE;
        default:
            return Texture.TextureType.TEX_TYPE_INVALID;
    }
}

/**
 * Carbon's `ExtractAnnotations`: the effect annotations of the global of a
 * name, and its `Tr2sRGB` and `AutoRegister` flags.
 *
 * @param {InlineString} name The global's name.
 * @param {ParserState} state The parse.
 * @param {ParameterAnnotation} paramAnnotations Cleared, then filled.
 * @param {{ value: boolean }|null} srgb Receives the `Tr2sRGB` flag, when given.
 * @param {{ value: boolean }|null} autoregister Receives the `AutoRegister` flag, when given.
 * @returns {boolean} Whether there are any annotations.
 */
function ExtractAnnotations(name, state, paramAnnotations, srgb, autoregister)
{
    paramAnnotations.annotations.clear();

    const localSrgb = { value: false };
    const localAutoregister = { value: false };

    const globalSymbol = state.GetSymbolTable().LookupGlobal(name.ToString());
    if (globalSymbol && globalSymbol.annotations)
    {
        for (const ai of globalSymbol.annotations)
        {
            const result = new Annotation();
            if (MakeEffectAnnotationFromSymbolAnnotation(ai, result, localSrgb, localAutoregister))
            {
                paramAnnotations.annotations.set(ai.name.ToString(), result);
            }
        }
    }
    if (srgb)
    {
        srgb.value = localSrgb.value;
    }
    if (autoregister)
    {
        autoregister.value = localAutoregister.value;
    }
    return paramAnnotations.annotations.size !== 0;
}

/**
 * Carbon's `CollectConstants( ParserState&, StageData&, ... )`: the
 * constants of every `GlobalsData` struct in the program.
 *
 * @param {ParserState} state The parse.
 * @param {StageInput} stage Receives the constants.
 * @param {CjsFxStdMap} annotations The effect's parameter annotations, by name.
 * @returns {boolean} False after an error.
 */
function CollectConstants(state, stage, annotations)
{
    const root = state.GetTree();
    if (root)
    {
        // Find "GlobalsData" struct.
        for (let i = 0, n = root.GetChildrenCount(); i < n; ++i)
        {
            const node = root.GetChild(i);
            if (node && node.GetNodeType() === N.NT_STRUCT &&
                node.GetSymbol() && node.GetSymbol().name.Equals__Chars("GlobalsData"))
            {
                if (!CollectConstants__Node(state, stage, node, annotations))
                {
                    return false;
                }
            }
        }
    }
    return true;
}

// GetStageData( ParserState&, StageData&, std::vector<Symbol*> rtConstantBuffers, ... )
// (M:3854-3874) is the ray-tracing overload and is not ported.

/**
 * A `RegisterInputDescription` from Carbon's brace initializer.
 *
 * @param {number} registerType A `RegisterInputType` value.
 * @param {number} registerIndex The register.
 * @param {number} registerCount How many.
 * @param {number} registerSpace The space.
 * @returns {RegisterInputDescription} The description.
 */
function registerInput(registerType, registerIndex, registerCount, registerSpace)
{
    const r = new RegisterInputDescription();
    r.registerType = registerType;
    r.registerIndex = registerIndex >>> 0;
    r.registerCount = registerCount >>> 0;
    r.registerSpace = registerSpace;
    return r;
}

/**
 * Carbon's sampler border colour check, which it writes out twice
 * (EffectCompilerMetal.cpp:3921-3931 and :4123-4133): Metal samplers can
 * only border with transparent black, opaque black or opaque white.
 *
 * @param {Sampler} sampler The sampler.
 * @returns {boolean} Whether the sampler borders with another colour.
 */
function hasUnsupportedBorderColor(sampler)
{
    const B = D3D11_TEXTURE_ADDRESS_MODE.D3D11_TEXTURE_ADDRESS_BORDER;
    if (sampler.addressU === B || sampler.addressV === B || sampler.addressW === B)
    {
        const c = sampler.borderColor;
        return (c.x !== 0 || c.y !== 0 || c.z !== 0 || c.w !== 0) &&
            (c.x !== 0 || c.y !== 0 || c.z !== 0 || c.w !== 1) &&
            (c.x !== 1 || c.y !== 1 || c.z !== 1 || c.w !== 1);
    }
    return false;
}

/**
 * Carbon's `GetStageDataForNode`: records each wrapper parameter's binding:
 * constant buffers by index; buffers, textures, UAVs and samplers by
 * register, with their texture, UAV and sampler descriptions and annotations
 * when used; arrays (bindless heap views) as ranges.
 *
 * @param {ParserState} state The parse.
 * @param {StageInput} stage Receives the bindings.
 * @param {ASTNode} functionHeader The wrapper's header.
 * @param {CjsFxStdMap} annotations The effect's parameter annotations, by name.
 * @returns {boolean} False after an error.
 */
function GetStageDataForNode(state, stage, functionHeader, annotations)
{
    for (let i = 0, n = functionHeader.GetChildrenCount(); i < n; ++i)
    {
        const child = functionHeader.GetChild(i);

        const symbol = child.GetSymbol();

        const type = child.GetType();

        // Carbon asserts the parameter is bound and reads `cbegin()`, which
        // is undefined for an empty map.
        if (symbol.registerSpecifier.size === 0)
        {
            throw new RangeError(`GetStageDataForNode: parameter ${symbol.name.ToString()} has no binding (Carbon reads past an empty map)`);
        }
        const reg = symbol.registerSpecifier.First()[1];

        if (reg.registerType === MetalRegister.Enum.CBuffer)
        {
            stage.registerInputs.push(registerInput(RegisterInputDescription.RegisterInputType.RT_CONSTANT_BUFFER, reg.registerNumber, 1, 0));
            continue;
        }

        if (type.arrayDimensions > 0)
        {
            if (symbol.used)
            {
                if (reg.registerType === MetalRegister.Enum.SRV)
                {
                    if (type.IsSampler())
                    {
                        stage.registerInputs.push(registerInput(RegisterInputDescription.RegisterInputType.RT_SAMPLER, reg.registerNumber, type.arraySizes[0], 0));

                        const sampler = new Sampler();

                        const globalSamplerSymbol = state.GetSymbolTable().LookupGlobal(symbol.name.ToString());
                        if (!GetSamplerState(state, globalSamplerSymbol.definition, sampler))
                        {
                            return false;
                        }

                        if (hasUnsupportedBorderColor(sampler))
                        {
                            state.ShowMessage__Location(globalSamplerSymbol.definition.GetLocation(), ParserState.ErrorCode.EC_CUSTOM_ERROR, "sampler border color is not one of colors supported by Metal");
                            return false;
                        }

                        sampler.name = symbol.name.ToString();

                        const paramAnnotations = new ParameterAnnotation();
                        if (ExtractAnnotations(symbol.name, state, paramAnnotations, null, null))
                        {
                            annotations.set(sampler.name, paramAnnotations);
                        }

                        stage.samplers.set(reg.registerNumber & 0xff, sampler);
                    }
                    else
                    {
                        stage.registerInputs.push(registerInput(RegisterInputDescription.RegisterInputType.RT_SRV_BUFFER, reg.registerNumber, type.arraySizes[0], 0));

                        const texture = new Texture();
                        texture.name = symbol.name.ToString();
                        texture.type = TypeToTextureType(type);
                        if (texture.type === Texture.TextureType.TEX_TYPE_INVALID)
                        {
                            continue;
                        }
                        const paramAnnotations = new ParameterAnnotation();
                        const srgb = { value: texture.isSRGB };
                        const autoregister = { value: texture.isAutoregister };
                        if (ExtractAnnotations(symbol.name, state, paramAnnotations, srgb, autoregister))
                        {
                            annotations.set(texture.name, paramAnnotations);
                        }
                        texture.isSRGB = srgb.value;
                        texture.isAutoregister = autoregister.value;
                        stage.textures.set(reg.registerNumber & 0xff, texture);
                    }
                }
                else
                {
                    stage.registerInputs.push(registerInput(RegisterInputDescription.RegisterInputType.RT_UAV_BUFFER, reg.registerNumber, type.arraySizes[0], 0));

                    const texture = new Uav();
                    texture.name = symbol.name.ToString();
                    texture.type = TypeToTextureType(type);
                    if (texture.type === Texture.TextureType.TEX_TYPE_INVALID)
                    {
                        continue;
                    }

                    const paramAnnotations = new ParameterAnnotation();
                    const autoregister = { value: texture.isAutoregister };
                    if (ExtractAnnotations(symbol.name, state, paramAnnotations, null, autoregister))
                    {
                        annotations.set(texture.name, paramAnnotations);
                    }
                    texture.isAutoregister = autoregister.value;

                    stage.uavs.set(reg.registerNumber & 0xff, texture);
                }
            }
        }
        else
        {
            switch (type.builtInType)
            {
                case T.OP_BUFFER:
                case T.OP_STRUCTUREDBUFFER:
                case T.OP_RAYTRACING_ACCELERATION_STRUCTURE:
                {
                    stage.registerInputs.push(registerInput(TypeToRegisterInputType(type), reg.registerNumber, 1, 0));

                    if (symbol.used)
                    {
                        const texture = new Texture();
                        texture.name = symbol.name.ToString();
                        texture.type = TypeToTextureType(type);

                        const paramAnnotations = new ParameterAnnotation();
                        const srgb = { value: texture.isSRGB };
                        const autoregister = { value: texture.isAutoregister };
                        if (ExtractAnnotations(symbol.name, state, paramAnnotations, srgb, autoregister))
                        {
                            annotations.set(texture.name, paramAnnotations);
                        }
                        texture.isSRGB = srgb.value;
                        texture.isAutoregister = autoregister.value;

                        stage.textures.set(reg.registerNumber & 0xff, texture);
                    }
                    break;
                }

                case T.OP_RWBUFFER:
                case T.OP_RWSTRUCTUREDBUFFER:
                {
                    stage.registerInputs.push(registerInput(TypeToRegisterInputType(type), reg.registerNumber, 1, 1));

                    if (symbol.used)
                    {
                        const uav = new Uav();
                        uav.name = symbol.name.ToString();
                        uav.type = TypeToTextureType(type);

                        const paramAnnotations = new ParameterAnnotation();
                        const autoregister = { value: uav.isAutoregister };
                        if (ExtractAnnotations(symbol.name, state, paramAnnotations, null, autoregister))
                        {
                            annotations.set(uav.name, paramAnnotations);
                        }
                        uav.isAutoregister = autoregister.value;

                        stage.uavs.set(reg.registerNumber & 0xff, uav);
                    }
                    break;
                }

                case T.OP_TEXTURE:
                case T.OP_TEXTURE1D:
                case T.OP_TEXTURE1DARRAY:
                case T.OP_TEXTURE2D:
                case T.OP_TEXTURE2DARRAY:
                case T.OP_TEXTURE3D:
                // case OP_TEXTURE3DARRAY:
                case T.OP_TEXTURECUBE:
                case T.OP_TEXTURECUBEARRAY:
                case T.OP_TEXTURE2DMS:
                case T.OP_TEXTURE2DMSARRAY:
                {
                    stage.registerInputs.push(registerInput(TypeToRegisterInputType(type), reg.registerNumber, 1, 0));

                    if (symbol.used)
                    {
                        const texture = new Texture();
                        texture.name = symbol.name.ToString();
                        texture.type = TypeToTextureType(type);
                        if (texture.type === Texture.TextureType.TEX_TYPE_INVALID)
                        {
                            continue;
                        }

                        const paramAnnotations = new ParameterAnnotation();
                        const srgb = { value: texture.isSRGB };
                        const autoregister = { value: texture.isAutoregister };
                        if (ExtractAnnotations(symbol.name, state, paramAnnotations, srgb, autoregister))
                        {
                            annotations.set(texture.name, paramAnnotations);
                        }
                        texture.isSRGB = srgb.value;
                        texture.isAutoregister = autoregister.value;

                        stage.textures.set(reg.registerNumber & 0xff, texture);
                    }
                    break;
                }
                case T.OP_RWTEXTURE1D:
                case T.OP_RWTEXTURE1DARRAY:
                case T.OP_RWTEXTURE2D:
                case T.OP_RWTEXTURE2DARRAY:
                case T.OP_RWTEXTURE3D:
                // case OP_RWTEXTURE3DARRAY:
                {
                    stage.registerInputs.push(registerInput(TypeToRegisterInputType(type), reg.registerNumber, 1, 0));

                    if (symbol.used)
                    {
                        const uav = new Uav();
                        uav.name = symbol.name.ToString();
                        uav.type = TypeToTextureType(type);
                        if (uav.type === Texture.TextureType.TEX_TYPE_INVALID)
                        {
                            continue;
                        }

                        const paramAnnotations = new ParameterAnnotation();
                        const autoregister = { value: uav.isAutoregister };
                        if (ExtractAnnotations(symbol.name, state, paramAnnotations, null, autoregister))
                        {
                            annotations.set(uav.name, paramAnnotations);
                        }
                        uav.isAutoregister = autoregister.value;

                        stage.uavs.set(reg.registerNumber & 0xff, uav);
                    }

                    break;
                }

                case T.OP_SAMPLER:
                case T.OP_SAMPLER2D:
                case T.OP_SAMPLER3D:
                case T.OP_SAMPLERCUBE:
                case T.OP_SAMPLERCOMPARISON:
                {
                    stage.registerInputs.push(registerInput(TypeToRegisterInputType(type), reg.registerNumber, 1, 0));

                    if (symbol.used)
                    {
                        const sampler = new Sampler();

                        const globalSamplerSymbol = state.GetSymbolTable().LookupGlobal(symbol.name.ToString());
                        if (!GetSamplerState(state, globalSamplerSymbol.definition, sampler))
                        {
                            return false;
                        }

                        if (hasUnsupportedBorderColor(sampler))
                        {
                            state.ShowMessage__Location(globalSamplerSymbol.definition.GetLocation(), ParserState.ErrorCode.EC_CUSTOM_ERROR, "sampler border color is not one of colors supported by Metal");
                            return false;
                        }

                        sampler.name = symbol.name.ToString();

                        stage.samplers.set(reg.registerNumber & 0xff, sampler);
                    }

                    break;
                }

                default:
                    break;
            }
        }
    }

    return true;
}

/**
 * Carbon's `GetStageData( ParserState&, StageData&, ASTNode* callNode, ... )`:
 * the stage's constants, then its parameters' bindings.
 *
 * @param {ParserState} state The parse.
 * @param {StageInput} stage Receives the data.
 * @param {ASTNode} callNode The pass's call, pointing at the wrapper.
 * @param {CjsFxStdMap} annotations The effect's parameter annotations, by name.
 * @returns {boolean} False after an error.
 */
function GetStageData(state, stage, callNode, annotations)
{
    if (!CollectConstants(state, stage, annotations))
    {
        return false;
    }

    const entryPointSymbol = callNode.GetSymbol();
    if (!entryPointSymbol || !entryPointSymbol.definition)
    {
        return false;
    }

    const functionHeader = entryPointSymbol.definition.GetChildOrNull(0);
    if (!functionHeader)
    {
        return false;
    }
    return GetStageDataForNode(state, stage, functionHeader, annotations);
}

// GetGlobalInputData (M:4173-4195) is ray tracing; RunProcess, SplitString,
// MetalTool (M:4198-4263) and DetectUnusedArguments (M:4266-4344, disabled at
// M:4620-4621) run Apple's tools. None is ported.

/**
 * Carbon's `IsIndexOperator`: whether a node is `x[i]`.
 *
 * @param {ASTNode} node The node.
 * @returns {boolean} Whether it is an index expression.
 */
function IsIndexOperator(node)
{
    return node.GetNodeType() === N.NT_POSTFIX_EXPRESSION && node.GetToken() !== null && node.GetToken().type === T.OP_LEFT_BRACKET;
}

/**
 * Carbon's `ExpandInitializerList`: the leaves of a nested `{ ... }`
 * initializer, in order.
 *
 * @param {ASTNode} initializer The `NT_INLINE_CONSTRUCTOR`.
 * @param {ASTNode[]} children Receives the leaves.
 */
function ExpandInitializerList(initializer, children)
{
    for (const child of initializer.GetChildren())
    {
        if (child.GetNodeType() === N.NT_INLINE_CONSTRUCTOR)
        {
            ExpandInitializerList(child, children);
        }
        else
        {
            children.push(child);
        }
    }
}

/**
 * Carbon's `PatchMatrixInitializer`: a matrix's `{ a, b, ... }` initializer
 * (each element's, for an array) is regrouped into `height` rows of `width`
 * values and wrapped in a constructor of the matrix type, which
 * `PatchMatrixRows` then transposes.
 *
 * @param {ASTNode} parent The node holding the initializer.
 * @param {number} index The initializer's child index.
 * @param {Type} type The initialised type.
 */
function PatchMatrixInitializer(parent, index, type)
{
    // wrap matrix initializer in a "constructor", i.e. { a, b,..} -> float4x4( { a, b, ..} )
    const initializer = parent.GetChild(index);
    if (type.arrayDimensions > 0)
    {
        const elementType = type.Copy();
        --elementType.arrayDimensions;

        for (let i = 0; i < initializer.GetChildrenCount(); ++i)
        {
            PatchMatrixInitializer(initializer, i, elementType);
        }
    }
    else
    {
        const children = [];
        ExpandInitializerList(initializer, children);

        if (children.length === type.width * type.height)
        {
            initializer.GetChildren().length = 0;

            for (let row = 0; row < type.height; ++row)
            {
                const rowNode = new ASTNode(N.NT_INLINE_CONSTRUCTOR, initializer.GetLocation(), initializer.GetScope(), null);
                rowNode.SetType(Type.typeFromTokenType(T.OP_FLOAT, type.width));
                for (let col = 0; col < type.width; ++col)
                {
                    rowNode.AddChild(children[row * type.width + col]);
                }
                initializer.AddChild(rowNode);
            }
        }

        const token = new ScannerToken();
        token.type = type.builtInType;
        token.fileLocation = initializer.GetLocation().Copy();
        token.intValue = type.width | (type.height << 8);
        const constructor = new ASTNode(N.NT_FUNCTION_CALL, initializer.GetLocation(), initializer.GetScope(), token);
        constructor.AddChild(initializer);
        initializer.SetType(type);
        constructor.SetType(type);
        parent.ReplaceChild(index, constructor);
    }
}

/**
 * Carbon's `PatchMatrixRows`: HLSL indexes a matrix by rows, Metal by
 * columns (the printer swaps a matrix type's dimensions, so the data is the
 * same). Matrix constructors become `transpose( ... )`, `m[x][y]` becomes
 * `m[y][x]`, a read of `m[x]` becomes `matrixRow( m, x )` and a written
 * `m[x]` becomes `MatrixRow<height>LH<<width>>( m, x )`, the prelude's
 * reference to a row.
 *
 * @param {ParserState} state The parse.
 * @param {ASTNode} node The subtree.
 * @param {ASTNode|null} [parent=null] Its parent.
 * @param {boolean} [rvalue=true] Whether the subtree is read rather than written.
 * @param {ASTNode|null} [assignment=null] The enclosing assignment.
 */
function PatchMatrixRows(state, node, parent = null, rvalue = true, assignment = null)
{
    if (node.GetNodeType() === N.NT_NAME_DECLARATION && node.GetType().IsMatrix() && node.GetChildOrNull(1) && node.GetChild(1).GetNodeType() === N.NT_INLINE_CONSTRUCTOR)
    {
        PatchMatrixInitializer(node, 1, node.GetType());
    }

    if (node.GetNodeType() === N.NT_FUNCTION_CALL && node.GetSymbol() === null && node.GetType().IsMatrix())
    {
        // transpose matrix constructors
        const copy = node.Copy();
        const transpose = ScannerToken.id(InlineString.makeInlineString("transpose"), node.GetLocation());
        node.SetToken(transpose);
        node.GetChildren().length = 0;
        node.AddChild(copy);

        const diagnosticMessage = { value: "" };
        const symbol = state.GetSymbolTable().LookupFunction(transpose.stringValue, node, diagnosticMessage);
        node.SetSymbol(symbol);

        if (symbol.intrinsicType)
        {
            node.SetType(symbol.intrinsicType(node, -1));
        }
        else
        {
            node.SetType(symbol.type);
        }
        node = copy;
    }
    // looking for matrix[] expressions
    if (IsIndexOperator(node) && node.GetChild(0).GetType().IsMatrix() && node.GetChild(0).GetType().arrayDimensions === 0)
    {
        if (parent && parent.GetChild(0) === node && IsIndexOperator(parent))
        {
            // m[x][y] -> m[y][x]
            const x = node.GetChild(1);
            node.ReplaceChild(1, parent.GetChild(1));
            parent.ReplaceChild(1, x);
        }
        else
        {
            const matrixType = node.GetChild(0).GetType();
            if (rvalue)
            {
                // replace m[x] with matrixRow(m, x)
                const callToken = ScannerToken.id(InlineString.makeInlineString("matrixRow"), node.GetLocation());
                node.SetToken(callToken);
                node.SetNodeType(N.NT_FUNCTION_CALL);
            }
            else
            {
                // replace m[x] with MatrixRow#LH<#>(m, x)
                const buffer = state.AllocateString(`MatrixRow${matrixType.height}LH<${matrixType.width}>`.slice(0, 31));
                const callToken = ScannerToken.id(InlineString.makeInlineString__StartEnd(buffer, 0, buffer.text.length), node.GetLocation());
                node.SetToken(callToken);
                node.SetNodeType(N.NT_FUNCTION_CALL);
            }
        }
    }
    if (node.GetNodeType() === N.NT_EXPRESSION && node.GetToken())
    {
        switch (node.GetToken().type)
        {
            case T.OP_EQUAL:
            case T.OP_MUL_ASSIGN:
            case T.OP_DIV_ASSIGN:
            case T.OP_MOD_ASSIGN:
            case T.OP_ADD_ASSIGN:
            case T.OP_SUB_ASSIGN:
            case T.OP_AND_ASSIGN:
            case T.OP_OR_ASSIGN:
            case T.OP_XOR_ASSIGN:
            case T.OP_LEFT_ASSIGN:
            case T.OP_RIGHT_ASSIGN:
                PatchMatrixRows(state, node.GetChild(0), node, false, node);
                PatchMatrixRows(state, node.GetChild(1), node, true, node);
                return;
        }
    }
    if (node.GetNodeType() !== N.NT_POSTFIX_EXPRESSION)
    {
        rvalue = true;
    }
    for (const child of node.GetChildren())
    {
        if (!child)
        {
            continue;
        }
        PatchMatrixRows(state, child, node, rvalue, assignment);
    }
}

/**
 * Carbon's `CompileCode`, as a seam.
 *
 * Adapted: Carbon writes `code` to a temporary `.metal` file, runs Apple's
 * `metal` (`-std=macos-metal2.1 -mmacos-version-min=10.14`, or
 * `-std=metal3.0` when `forceOldVersion` is false, with each define as
 * `-D`), forwards its output to `g_messages`, and returns the `.air` bytes,
 * or nothing when the compile failed. There is no `metal` tool to run in a
 * browser, so the compiled program is the Metal source itself, and nothing
 * here can fail. A port that gains a Metal compiler replaces this function
 * only.
 *
 * @param {string} code The Metal source.
 * @param {import("../Macro.js").Macro[]} defines The permutation's defines; Carbon passes them to `metal`.
 * @param {boolean} [forceOldVersion=true] Carbon's language version switch.
 * @returns {string} The compiled program: here, `code`.
 */
function CompileCode(code, defines, forceOldVersion = true)
{
    void defines;
    void forceOldVersion;
    return code;
}

/**
 * Carbon's `AssignDeviceSpaceToSymbols`: every symbol in the tree that is a
 * buffer, an acceleration structure, or an array of textures or samplers is
 * put in the `device` address space.
 *
 * @param {ASTNode|null} node The subtree.
 */
function AssignDeviceSpaceToSymbols(node)
{
    if (!node)
    {
        return;
    }
    const symbol = node.GetSymbol();
    if (symbol)
    {
        const type = symbol.type;
        switch (type.builtInType)
        {
            case T.OP_BUFFER:
            case T.OP_STRUCTUREDBUFFER:
            case T.OP_RWBUFFER:
            case T.OP_RWSTRUCTUREDBUFFER:
            case T.OP_RAYTRACING_ACCELERATION_STRUCTURE:
                symbol.addressSpace = Symbol.AddressSpace.Device;
                break;
            default:
                if (type.arrayDimensions && (type.IsTexture() || type.IsSampler()))
                {
                    symbol.addressSpace = Symbol.AddressSpace.Device;
                }
                break;
        }
    }
    for (const child of node.GetChildren())
    {
        AssignDeviceSpaceToSymbols(child);
    }
}

// CreateGlobalInputsStruct (M:4699-4788) is ray tracing and is not ported.

/**
 * Whether any function calls the `TraceRay` intrinsic, which is when
 * Carbon's `AddShaderTableArguments` changes the tree (it returns at once
 * when the intrinsic is missing and otherwise only patches functions that
 * reach a `TraceRay` call).
 *
 * @param {ParserState} state The parse.
 * @param {Map<Symbol, ASTNode>} functions Function symbol to definition.
 * @returns {boolean} Whether `TraceRay` is called.
 */
function callsTraceRay(state, functions)
{
    const traceRay = state.GetDX9Functions().get("TraceRay");
    if (traceRay === undefined)
    {
        return false;
    }
    let found = false;
    for (const definition of functions.values())
    {
        // Carbon's own walk is `Map` with an identity callback.
        definition.Map(node =>
        {
            if (node.GetNodeType() === N.NT_FUNCTION_CALL && node.GetSymbol() === traceRay)
            {
                found = true;
            }
            return node;
        });
    }
    return found;
}

/**
 * Not a Carbon function: the render-state branch of Carbon's `CompileEffect`
 * pass loop (EffectCompilerMetal.cpp:4953-4988), split out unchanged so the
 * WebGPU target reads pass states with the same code. Parses one state
 * assignment into `outPass.states`; a state that resolves to nothing or to a
 * removed code is reported, not stored.
 *
 * @param {ParserState} state The parse.
 * @param {ASTNode} stateNode The `NT_STATE_ASSIGNMENT`.
 * @param {Pass} outPass Receives the state.
 */
function ReadPassState(state, stateNode, outPass)
{
    let stateCode = 0;
    const value = { value: 0 };
    if (ParseStateAssignment(state, stateNode, g_renderStates, value))
    {
        const name = stateNode.GetToken().stringValue.ToString();
        for (const renderState of g_renderStateNames)
        {
            if (InlineString.iEquals__Chars(InlineString.makeInlineString(name), renderState.name))
            {
                stateCode = renderState.value >>> 0;
            }
        }
        switch (stateCode)
        {
            case 0xffffffff:
            case 0xfffffffe:
            case 0xfffffffd:
            case 0xfffffffc:
            case 0xfffffffb:
            case 0xfffffffa:
                if (value.value !== 0)
                {
                    state.ShowMessage__Location(stateNode.GetLocation(), ParserState.ErrorCode.EC_INVALID_STATE_VALUE, name);
                }
                break;
            case 0:
                state.ShowMessage__Location(stateNode.GetLocation(), ParserState.ErrorCode.EC_STATE_DEPRECATED, name);
                break;
            default:
                outPass.states.set(stateCode, value.value >>> 0);
        }
    }
}

/**
 * Carbon's `EffectCompilerMetal`: compiles one permutation of an effect into
 * `EffectData`, each stage's program being its Metal source (see
 * `CompileCode`). The driver creates one per platform and keeps it for every
 * permutation, so identical stages across permutations share one compile.
 */
export class EffectCompilerMetal
{
    /** The driver's globals. */
    _session = null;

    /**
     * Carbon's `m_compiled`: compiled programs keyed by the Metal text of
     * the stage before patching.
     *
     * @type {Map<string, SyncData>}
     */
    _compiled = new Map();

    /**
     * @param {import("../ShaderCompiler/ShaderCompilerSession.js").ShaderCompilerSession} session The compile:
     *   Carbon's `g_includeHandler` and `g_messages`.
     */
    constructor(session)
    {
        this._session = session;
    }

    /**
     * Carbon's `EffectCompilerMetal::Create`.
     *
     * Adapted: Carbon runs `metal --version` and fails when Apple's tool is
     * not installed. `CompileCode` runs no tool, so there is nothing to check.
     *
     * @returns {boolean} True.
     */
    Create()
    {
        return true;
    }

    /**
     * Carbon's `EffectCompilerMetal::CompileEffect`: parses `source` with the
     * permutation's defines, rewrites the tree for Metal, and fills `result`
     * with every technique's passes, each stage's Metal program and its
     * bindings.
     *
     * @param {InlineString} source The effect source; its buffer holds Carbon's leading newline before `source.start`.
     * @param {import("../Macro.js").Macro[]} defines The permutation's defines.
     * @param {import("../EffectData/EffectData.js").EffectData} result Receives the techniques and parameter annotations.
     * @returns {boolean} False after an error, which is in the session's messages.
     */
    CompileEffect(source, defines, result)
    {
        const previousMessages = g_messages;
        g_messages = this._session.messages;
        try
        {
            return this._CompileEffect(source, defines, result);
        }
        finally
        {
            g_messages = previousMessages;
        }
    }

    /**
     * Not a Carbon method: the body of Carbon's `CompileEffect`
     * (EffectCompilerMetal.cpp:4852-5450), split off so `CompileEffect` can
     * set `g_messages` around it and restore it on every exit.
     *
     * @param {InlineString} source The effect source.
     * @param {import("../Macro.js").Macro[]} defines The permutation's defines.
     * @param {import("../EffectData/EffectData.js").EffectData} result Receives the effect.
     * @returns {boolean} False after an error.
     */
    _CompileEffect(source, defines, result)
    {
        const state = new ParserState(source, { includeHandler: this._session.includeHandler, messages: this._session.messages });
        for (const it of defines)
        {
            const d = new PreprocessorDefine();
            d.location.fileName = InlineString.makeInlineString("");
            d.location.lineNumber = 0;
            d.value = InlineString.makeInlineString(it.value);
            state.defines.set(InlineString.makeInlineString(it.name).ToString(), d);
        }

        if (!state.Parse())
        {
            return false;
        }

        const root = state.GetTree();
        if (root)
        {
            SortProgramNodes(root);
        }

        PatchStdlibFunctions(state);
        // PatchCBuffers( state );

        ReplaceFloatModulo(state);

        /** @type {Map<Symbol, ASTNode>} */
        const functions = new Map();
        /** @type {ASTNode[]} */
        const globals = [];

        TransferSRGBToTexturesDX11(state);

        CollectFunctions(state, functions);
        CollectGlobals(state, functions, globals);

        // AddShaderTableArguments( state, functions ) (M:4890): ray tracing,
        // not ported. It changes nothing unless a function calls TraceRay.
        if (callsTraceRay(state, functions))
        {
            throw new Error("EffectCompilerMetal: TraceRay calls need AddShaderTableArguments, which is not ported (ray tracing)");
        }

        ConvertTextureFunctionsToMetal(state);
        ConvertSyncFunctionsToMetal(functions);

        AssignDeviceSpaceToSymbols(state.GetTree());

        if (globals.length !== 0)
        {
            AddUsedGlobalsAsFunctionParams(functions, globals);

            for (const it of globals)
            {
                if (it.GetType().symbol) // Not a built-in type?
                {
                    StripSemanticsInsideStucts(it.GetType().symbol.definition);
                }
            }
        }

        PatchMatrixRows(state, state.GetTree());

        const techniqueNodes = [];
        state.GetTree().FindNodes(N.NT_TECHNIQUE, techniqueNodes);
        if (techniqueNodes.length === 0)
        {
            g_messages.AddMessage("\\memory(0): error X0000: No technique found");
            return false;
        }

        // The YAML listing (M:4920-4928 and its every use below) is not ported.

        for (const techniqueNode of techniqueNodes)
        {
            const technique = new Technique();
            technique.name = techniqueNode.GetToken().stringValue.ToString();

            for (let passIx = 0; passIx < techniqueNode.GetChildrenCount(); ++passIx)
            {
                const passNode = techniqueNode.GetChild(passIx);
                if (passNode.GetNodeType() !== N.NT_PASS)
                {
                    continue;
                }
                const outPass = new Pass();
                for (let stateIx = 0; stateIx < passNode.GetChildrenCount(); ++stateIx)
                {
                    if (passNode.GetChild(stateIx).GetNodeType() === N.NT_STATE_ASSIGNMENT)
                    {
                        ReadPassState(state, passNode.GetChild(stateIx), outPass);
                        continue;
                    }

                    if (passNode.GetChild(stateIx).GetNodeType() !== N.NT_SHADER_ASSIGNMENT)
                    {
                        continue;
                    }

                    const shaderNode = passNode.GetChild(stateIx);

                    const stage = new StageInput();
                    const stageType = { value: stage.type };
                    if (!ParseShaderName(shaderNode.GetToken().stringValue, stageType))
                    {
                        state.ShowMessage__Location(shaderNode.GetToken().fileLocation, ParserState.ErrorCode.EC_INVALID_STATE, shaderNode.GetToken().stringValue.ToString());
                        return false;
                    }
                    stage.type = stageType.value;

                    // Carbon reads the profile (`vs_3_0`) only for the listing.

                    if (shaderNode.GetChild(1).GetSymbol() === null)
                    {
                        return false;
                    }

                    // This must be called before PatchShader, because patching doesn't preserve
                    // entry function's attributes.
                    GetThreadGroupSize(stage, state, shaderNode.GetChild(1));

                    RemapSystemSemanticsDXtoMetal(shaderNode.GetChild(1));

                    let shaderCacheKey;
                    {
                        state.GetSymbolTable().ResetUsedFlag();
                        MarkUsedSymbols(shaderNode.GetChild(1), state);

                        const os = new CompilerInputStream(state, CodeStream.ShadingLanguage.MSL);
                        WriteMSL(os, state.GetTree(), state.GetSymbolTable());
                        shaderCacheKey = os.GetString();
                        state.GetSymbolTable().ResetUsedFlag();
                    }
                    let patchShaderType;
                    switch (stage.type)
                    {
                        case StageInput.InputStageType.VERTEX_STAGE:
                            patchShaderType = EffectCompilerMetal.PatchShaderType.VERTEX;
                            break;
                        case StageInput.InputStageType.PIXEL_STAGE:
                            patchShaderType = EffectCompilerMetal.PatchShaderType.PIXEL;
                            break;
                        case StageInput.InputStageType.COMPUTE_STAGE:
                            patchShaderType = EffectCompilerMetal.PatchShaderType.COMPUTE;
                            break;
                        default:
                            state.ShowMessage__Location(shaderNode.GetLocation(), ParserState.ErrorCode.EC_CUSTOM_ERROR, "Shader type %i is not supported by Metal", stage.type);
                            return false;
                    }

                    const patchedShader = PatchShader(patchShaderType, shaderNode.GetChild(1), state);
                    if (!patchedShader)
                    {
                        return false;
                    }
                    shaderNode.GetChild(1).SetSymbol(patchedShader.GetChild(0).GetSymbol());

                    ApplyPackedModifiersToConstantBuffers(patchedShader);

                    switch (stage.type)
                    {
                        case StageInput.InputStageType.VERTEX_STAGE:
                            PrepareVertexFunction(stage, shaderNode.GetChild(1));
                            break;
                        case StageInput.InputStageType.PIXEL_STAGE:
                            PrepareFragmentFunction(stage, shaderNode.GetChild(1));
                            break;
                        case StageInput.InputStageType.COMPUTE_STAGE:
                            PrepareKernelFunction(stage, shaderNode.GetChild(1));
                            break;
                        default:
                            break;
                    }

                    // Assign register numbers to all input textures, buffers, and samplers if they
                    // don't have any register assigned already.
                    if (!AutoAssignRegisters(state, shaderNode.GetChild(1)))
                    {
                        return false;
                    }

                    state.GetSymbolTable().ResetUsedFlag();
                    state.ResetPragmaUsage();
                    MarkUsedSymbols(shaderNode.GetChild(1), state);

                    const os = new CompilerInputStream(state, CodeStream.ShadingLanguage.MSL);
                    os.Write(MSL_INCLUDE);
                    WriteAtomicFn(os, new AtomicFn("add", "Add"));
                    WriteAtomicFn(os, new AtomicFn("max", "Max"));
                    WriteAtomicFn(os, new AtomicFn("min", "Min"));
                    WriteAtomicFn(os, new AtomicFn("and", "And"));
                    WriteAtomicFn(os, new AtomicFn("or", "Or"));
                    WriteAtomicFn(os, new AtomicFn("xor", "Xor"));
                    WriteMSL(os, state.GetTree(), state.GetSymbolTable());

                    // Let only one thread compile this permutation. (One
                    // thread here: the entry is compiled the first time its
                    // key is seen and reused after.)
                    let syncData = this._compiled.get(shaderCacheKey);
                    if (syncData === undefined)
                    {
                        syncData = new SyncData();
                        this._compiled.set(shaderCacheKey, syncData);

                        // We need to compile, nobody else is doing it for this permutation.
                        syncData.compiledCode = CompileCode(os.GetString(), defines);
                        syncData.compiled = true;
                    }

                    const compiledCode = syncData.compiledCode;

                    if (compiledCode.length === 0)
                    {
                        // No compiledCode on the cache entry! This means compilation must have failed.
                        return false;
                    }

                    // Carbon's shaderSize and shaderDataStr: the writer derives both.
                    stage.shaderData = compiledCode;

                    if (!GetStageData(state, stage, shaderNode.GetChild(1), result.annotations))
                    {
                        return false;
                    }

                    // Bug (EffectCompilerMetal.cpp:5049, :5166; Carbon known
                    // defect CE-107): the call node was pointed at the wrapper
                    // above, so this reads the wrapper's annotations, of which
                    // it has none, never the entry point's (`float4 ps() :
                    // SV_Target < string Tag = "x"; >`). Metal stages carry no
                    // annotations; DX11 reads the entry point's. Reproduced.
                    {
                        stage.annotations.annotations.clear();
                        const symbol = shaderNode.GetChild(1).GetSymbol();
                        if (symbol && symbol.annotations)
                        {
                            for (const a of symbol.annotations)
                            {
                                const annotation = new Annotation();
                                const isSrgb = { value: false };
                                const isAutoregister = { value: false };
                                if (MakeEffectAnnotationFromSymbolAnnotation(a, annotation, isSrgb, isAutoregister))
                                {
                                    stage.annotations.annotations.set(a.name.ToString(), annotation);
                                }
                            }
                        }
                    }

                    // Carbon's defaultValuesStr is the string-table handle of
                    // defaultValues; the writer makes it.
                    stage.source = os.GetString();

                    outPass.stages.push(stage);

                    for (let n = 0; n < state.GetTree().GetChildrenCount(); ++n)
                    {
                        if (state.GetTree().GetChild(n) === patchedShader)
                        {
                            state.GetTree().RemoveChild(n);
                            break;
                        }
                    }
                }
                technique.passes.push(outPass);
            }

            // The library loop (M:5224-5442) compiles a technique's
            // ray-tracing libraries and is not ported.
            for (let passIx = 0; passIx < techniqueNode.GetChildrenCount(); ++passIx)
            {
                if (techniqueNode.GetChild(passIx).GetNodeType() === N.NT_LIBRARY)
                {
                    throw new Error("EffectCompilerMetal: ray-tracing libraries are not ported");
                }
            }

            result.techniques.push(technique);
        }

        return true;
    }

    // Source: trinity/shadercompiler/EffectCompilerMetal.cpp:2627-2637
    //
    // Carbon declares this enum in EffectCompilerMetal.cpp; it is not exported
    // from the folder's index. The ray-tracing members are kept although the
    // ray-tracing path is not ported, because `PatchShader` compares against
    // `RAY_GEN` and the values must stay Carbon's.

    /**
     * Carbon's `enum class PatchShaderType`: which entry point `PatchShader`
     * builds. Members from `RAY_GEN` on are the ray-tracing shaders.
     */
    static PatchShaderType = Object.freeze({
        VERTEX: 0,
        PIXEL: 1,
        COMPUTE: 2,

        RAY_GEN: 3,
        MISS: 4,
        CLOSEST_HIT: 5,
        ANY_HIT: 6
    });
}

// Carbon's file-local helpers, exported under their Carbon names for the
// WebGPU target (EffectCompilerWebGPU/), which runs the same target-
// independent passes and replaces only the Metal-specific ones. Carbon
// declares them in the .cpp only.
export {
    CollectFunctions, CollectGlobals, AssignDeviceSpaceToSymbols, AddUsedGlobalsAsFunctionParams,
    StripSemanticsInsideStucts, PatchMatrixRows, ParseShaderName, GetThreadGroupSize,
    RemapSystemSemanticsDXtoMetal, PatchShader, PrepareVertexFunction, PrepareFragmentFunction,
    PrepareKernelFunction, AutoAssignRegisters, GetStageDataForNode, FillDefaults, ExtractAnnotations,
    MakeEffectAnnotationFromSymbolAnnotation, callsTraceRay, ReplaceFloatModulo, ReadPassState
};

/**
 * Not in Carbon: runs `body` with `g_messages` set to `messages`, as
 * `CompileEffect` does, for the WebGPU target calling the passes above.
 *
 * @template R
 * @param {import("../CompileMessageQueue.js").CompileMessageQueue} messages The session's queue.
 * @param {() => R} body The work.
 * @returns {R} What `body` returns.
 */
export function CjsFxWithMessages(messages, body)
{
    const previousMessages = g_messages;
    g_messages = messages;
    try
    {
        return body();
    }
    finally
    {
        g_messages = previousMessages;
    }
}

CjsSchema.blue.define(EffectCompilerMetal, {
    className: "EffectCompilerMetal",
    methods: {
        Create: [blue.method, meta.adapted],
        CompileEffect: [blue.method, meta.adapted]
    }
});
