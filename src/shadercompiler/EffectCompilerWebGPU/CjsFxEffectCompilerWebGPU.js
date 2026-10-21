import { CjsSchema } from "#schema/CjsSchema";

// Not in Carbon: the WebGPU target, the driver's PLATFORM_WEBGPU.
// Modelled on EffectCompilerMetal.cpp's CompileEffect, whose
// target-independent passes it runs unchanged; it replaces only what is
// Metal's own:
//
// - texture access stays DX10 methods, converted as the DX11 compiler does
//   (EffectCompilerDX11.cpp:1221-1223), not rewritten to Metal's;
// - samplers with static state are bound like any other, as DX11 binds
//   them, where Metal makes them `constexpr` (the runtime has no static
//   samplers);
// - constants are laid out by HLSL's cbuffer packing (CjsFxHlslPacking.js),
//   not CalculateSizeAndOffset's MSL rules, so the bytes the engine uploads
//   mean what they mean to D3D;
// - the stage program is WGSL from CjsFxOutputWGSL, and each pass carries
//   the runtime's binding block.
//
// The bindings are stage-scoped in group 0, numbered densely in the order
// the stages declare them, as the runtime's own translator does. Varyings
// take `@location`s by semantic, numbered for the pass in the order first
// seen, so the vertex outputs and pixel inputs agree.

import { writeBackendBlock } from "../../resource/format/index.js";
import { InlineString } from "../InlineString.js";
import { HLSLParserTokens } from "../hlslParserTokens.js";
import { ParserState } from "../ParserState/ParserState.js";
import { PreprocessorDefine } from "../ParserState/PreprocessorDefine.js";
import { SortProgramNodes, MarkUsedSymbols } from "../ParserUtils/parserUtils.js";
import { TransferSRGBToTexturesDX11, ConvertTextureFunctionsDX11, MergeSamplers } from "../TextureFunctionConversionDX11/index.js";
import { Constant } from "../EffectData/Constant.js";
import { Annotation } from "../EffectData/Annotation.js";
import { ParameterAnnotation } from "../EffectData/ParameterAnnotation.js";
import { StageInput } from "../EffectData/StageInput.js";
import { Pass } from "../EffectData/Pass.js";
import { Technique } from "../EffectData/Technique.js";
import {
    CollectFunctions, CollectGlobals, AssignDeviceSpaceToSymbols, AddUsedGlobalsAsFunctionParams,
    StripSemanticsInsideStucts, PatchMatrixRows, ParseShaderName, GetThreadGroupSize,
    RemapSystemSemanticsDXtoMetal, PatchShader, PrepareVertexFunction, PrepareFragmentFunction,
    PrepareKernelFunction, AutoAssignRegisters, GetStageDataForNode, FillDefaults,
    MakeEffectAnnotationFromSymbolAnnotation, callsTraceRay, ReplaceFloatModulo, ReadPassState,
    CjsFxWithMessages
} from "../EffectCompilerMetal/EffectCompilerMetal.js";
import { CjsFxHlslPacking } from "./CjsFxHlslPacking.js";
import { CjsFxOutputWGSL } from "./CjsFxOutputWGSL.js";
import { ASTNode } from "../ASTNode/ASTNode.js";
import { Symbol } from "../SymbolTable/Symbol.js";
import { EffectCompilerMetal } from "../EffectCompilerMetal/EffectCompilerMetal.js";

const T = HLSLParserTokens;
const N = ASTNode.ASTNodeType;

/** The WGSL stage, and the backend block's visibility, of each stage type. */
const STAGE_KIND = new Map([
    [StageInput.InputStageType.VERTEX_STAGE, "vertex"],
    [StageInput.InputStageType.PIXEL_STAGE, "fragment"],
    [StageInput.InputStageType.COMPUTE_STAGE, "compute"]
]);

/**
 * The WebGPU target: compiles one permutation of an effect into
 * `EffectData`, each stage's program being WGSL, each pass carrying its
 * binding block. Implements the driver's compiler interface (`Create`,
 * `CompileEffect`), as `EffectCompilerMetal` does.
 *
 * Modelled on: EffectCompilerMetal (trinity/shadercompiler/EffectCompilerMetal.h:75)
 * Modelled on: EffectCompilerDX11 (trinity/shadercompiler/EffectCompilerDX11.h:9)
 */
export class CjsFxEffectCompilerWebGPU
{
    /** The driver's globals. */
    _session = null;

    /**
     * @param {import("../ShaderCompiler/ShaderCompilerSession.js").ShaderCompilerSession} session The compile.
     */
    constructor(session)
    {
        this._session = session;
    }

    /**
     * Nothing to set up: the target runs no tool.
     *
     * @returns {boolean} True.
     */
    Create()
    {
        return true;
    }

    /**
     * Parses `source` with the permutation's defines, rewrites the tree as
     * EffectCompilerMetal does up to its Metal-only passes, and fills
     * `result` with every technique's passes, each stage's WGSL and its
     * bindings.
     *
     * @param {InlineString} source The effect source; its buffer holds Carbon's leading newline before `source.start`.
     * @param {import("../Macro.js").Macro[]} defines The permutation's defines.
     * @param {import("../EffectData/EffectData.js").EffectData} result Receives the techniques and parameter annotations.
     * @returns {boolean} False after an error, which is in the session's messages.
     */
    CompileEffect(source, defines, result)
    {
        return CjsFxWithMessages(this._session.messages, () => this._CompileEffect(source, defines, result));
    }

    /**
     * The body of `CompileEffect`.
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
        SortProgramNodes(root);

        ReplaceFloatModulo(state);

        TransferSRGBToTexturesDX11(state);
        ConvertTextureFunctionsDX11(state);
        MergeSamplers(state);

        /** @type {Map<object, import("../ASTNode/ASTNode.js").ASTNode>} */
        const functions = new Map();
        /** @type {import("../ASTNode/ASTNode.js").ASTNode[]} */
        const globals = [];

        // Each top-level declaration's position, to keep the globals in
        // declaration order when BindStaticSamplers adds to them.
        const declarationOrder = new Map();
        root.GetChildren().forEach((node, index) =>
        {
            if (node !== null)
            {
                for (const child of node.GetChildren())
                {
                    declarationOrder.set(child, index);
                }
            }
        });

        CollectFunctions(state, functions);
        CollectGlobals(state, functions, globals);
        BindStaticSamplers(state, globals, declarationOrder);

        if (callsTraceRay(state, functions))
        {
            throw new Error("CjsFxEffectCompilerWebGPU: TraceRay is not supported (ray tracing)");
        }

        AssignDeviceSpaceToSymbols(state.GetTree());

        if (globals.length !== 0)
        {
            AddUsedGlobalsAsFunctionParams(functions, globals);
            KeepDeclaredRegisters(functions, globals);
            for (const it of globals)
            {
                if (it.GetType().symbol)
                {
                    StripSemanticsInsideStucts(it.GetType().symbol.definition);
                }
            }
        }

        PatchMatrixRows(state, state.GetTree());

        // CollectGlobals' struct, found as Carbon's CollectConstants finds it.
        const globalsStructs = new Set();
        for (const node of state.GetTree().GetChildren())
        {
            if (node && node.GetNodeType() === N.NT_STRUCT && node.GetSymbol() && node.GetSymbol().name.Equals__Chars("GlobalsData"))
            {
                globalsStructs.add(node.GetSymbol());
            }
        }

        const techniqueNodes = [];
        state.GetTree().FindNodes(N.NT_TECHNIQUE, techniqueNodes);
        if (techniqueNodes.length === 0)
        {
            this._session.messages.AddMessage("\\memory(0): error X0000: No technique found");
            return false;
        }

        for (const techniqueNode of techniqueNodes)
        {
            const technique = new Technique();
            technique.name = techniqueNode.GetToken().stringValue.ToString();

            for (let passIx = 0; passIx < techniqueNode.GetChildrenCount(); ++passIx)
            {
                const passNode = techniqueNode.GetChild(passIx);
                if (passNode.GetNodeType() === N.NT_LIBRARY)
                {
                    throw new Error("CjsFxEffectCompilerWebGPU: ray-tracing libraries are not supported");
                }
                if (passNode.GetNodeType() !== N.NT_PASS)
                {
                    continue;
                }
                const outPass = new Pass();
                const bindings = [];
                const locations = new Map();
                for (let stateIx = 0; stateIx < passNode.GetChildrenCount(); ++stateIx)
                {
                    const stateNode = passNode.GetChild(stateIx);
                    if (stateNode.GetNodeType() === N.NT_STATE_ASSIGNMENT)
                    {
                        ReadPassState(state, stateNode, outPass);
                        continue;
                    }
                    if (stateNode.GetNodeType() !== N.NT_SHADER_ASSIGNMENT)
                    {
                        continue;
                    }
                    const stage = this._CompileStage(state, stateNode, result, globalsStructs, bindings, locations);
                    if (stage === null)
                    {
                        return false;
                    }
                    outPass.stages.push(stage);
                }
                if (bindings.length !== 0)
                {
                    outPass.backendBlock = writeBackendBlock({ bindGroups: [{ group: 0, bindings }], transforms: [] });
                }
                technique.passes.push(outPass);
            }

            result.techniques.push(technique);
        }

        return true;
    }

    /**
     * One stage of a pass: PatchShader's wrapper, its registers, its WGSL
     * and its stage data. The wrapper is removed from the tree afterwards, as
     * EffectCompilerMetal does.
     *
     * @param {ParserState} state The parse.
     * @param {import("../ASTNode/ASTNode.js").ASTNode} shaderNode The pass's `NT_SHADER_ASSIGNMENT`.
     * @param {import("../EffectData/EffectData.js").EffectData} result Receives parameter annotations.
     * @param {Set<object>} globalsStructs The struct symbols laid out over used members.
     * @param {object[]} bindings The pass's backend bindings, appended to.
     * @param {Map<string, number>} locations The pass's varying locations by semantic.
     * @returns {StageInput|null} The stage, or null after an error.
     */
    _CompileStage(state, shaderNode, result, globalsStructs, bindings, locations)
    {
        const stage = new StageInput();
        const stageType = { value: stage.type };
        if (!ParseShaderName(shaderNode.GetToken().stringValue, stageType))
        {
            state.ShowMessage__Location(shaderNode.GetToken().fileLocation, ParserState.ErrorCode.EC_INVALID_STATE, shaderNode.GetToken().stringValue.ToString());
            return null;
        }
        stage.type = stageType.value;

        const callNode = shaderNode.GetChild(1);
        if (callNode.GetSymbol() === null)
        {
            return null;
        }

        GetThreadGroupSize(stage, state, callNode);
        RemapSystemSemanticsDXtoMetal(callNode);

        const kind = STAGE_KIND.get(stage.type);
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
                state.ShowMessage__Location(shaderNode.GetLocation(), ParserState.ErrorCode.EC_CUSTOM_ERROR, "Shader type %i is not supported by WebGPU", stage.type);
                return null;
        }

        const patchedShader = PatchShader(patchShaderType, callNode, state);
        if (!patchedShader)
        {
            return null;
        }
        callNode.SetSymbol(patchedShader.GetChild(0).GetSymbol());

        switch (stage.type)
        {
            case StageInput.InputStageType.VERTEX_STAGE:
                PrepareVertexFunction(stage, callNode);
                break;
            case StageInput.InputStageType.PIXEL_STAGE:
                PrepareFragmentFunction(stage, callNode);
                break;
            default:
                PrepareKernelFunction(stage, callNode);
                break;
        }

        if (!AutoAssignRegisters(state, callNode))
        {
            return null;
        }

        state.GetSymbolTable().ResetUsedFlag();
        state.ResetPragmaUsage();
        MarkUsedSymbols(callNode, state);

        const printer = new CjsFxOutputWGSL({
            state,
            stage: kind,
            threadGroupSize: stage.threadGroupSize,
            entry: patchedShader,
            globalsStructs,
            bind: resource =>
            {
                const binding = bindings.length;
                bindings.push({
                    resourceKind: resource.kind,
                    registerSpace: 0,
                    binding,
                    visibility: [kind],
                    registerIndex: resource.registerIndex,
                    structureStride: resource.structureStride ?? undefined,
                    arrayLayerCount: 0,
                    type: resource.type,
                    ...(resource.type.startsWith("texture_depth_") ? { texture: { sampleType: "depth" } } : {}),
                    generatedSymbol: resource.name,
                    transformId: ""
                });
                return binding;
            },
            location: semantic =>
            {
                const key = /\d$/u.test(semantic) ? semantic : `${semantic}0`;
                if (!locations.has(key))
                {
                    locations.set(key, locations.size);
                }
                return locations.get(key);
            }
        });
        const wgsl = printer.Write();
        stage.shaderData = wgsl;
        stage.source = wgsl;

        if (!CollectConstants(state, stage, result.annotations, globalsStructs))
        {
            return null;
        }
        if (!GetStageDataForNode(state, stage, patchedShader.GetChild(0), result.annotations))
        {
            return null;
        }

        // Bug (EffectCompilerMetal.cpp:5049, :5166; Carbon known defect
        // CE-107): Metal stages read the wrapper's annotations, of which it
        // has none. The WebGPU target follows Metal.
        stage.annotations.annotations.clear();
        const wrapper = callNode.GetSymbol();
        if (wrapper && wrapper.annotations)
        {
            for (const a of wrapper.annotations)
            {
                const annotation = new Annotation();
                if (MakeEffectAnnotationFromSymbolAnnotation(a, annotation, { value: false }, { value: false }))
                {
                    stage.annotations.annotations.set(a.name.ToString(), annotation);
                }
            }
        }

        const root = state.GetTree();
        for (let n = 0; n < root.GetChildrenCount(); ++n)
        {
            if (root.GetChild(n) === patchedShader)
            {
                root.RemoveChild(n);
                break;
            }
        }
        return stage;
    }
}

/**
 * Moves the samplers CollectGlobals left at module scope as `constexpr`
 * (static state, EffectCompilerMetal.cpp CollectGlobals) into the globals,
 * so they are threaded and bound like dynamic samplers; their state is
 * recorded in the stage's samplers as DX11 records it. The globals stay in
 * declaration order, which AutoAssignRegisters' slot order depends on.
 *
 * @param {ParserState} state The parse.
 * @param {import("../ASTNode/ASTNode.js").ASTNode[]} globals CollectGlobals' globals; the samplers are added.
 * @param {Map<object, number>} declarationOrder Each top-level node's index before CollectGlobals.
 */
function BindStaticSamplers(state, globals, declarationOrder)
{
    const root = state.GetTree();
    for (let i = 0; i < root.GetChildrenCount(); ++i)
    {
        const node = root.GetChild(i);
        if (node === null || node.GetNodeType() !== N.NT_VAR_DECLARATION_LIST || node.GetChildrenCount() !== 1)
        {
            continue;
        }
        const nameNode = node.GetChild(0);
        const symbol = nameNode.GetSymbol();
        if (!symbol || symbol.addressSpace !== Symbol.AddressSpace.Constexpr || !symbol.type.IsSampler())
        {
            continue;
        }
        symbol.addressSpace = Symbol.AddressSpace.None;
        const position = declarationOrder.get(nameNode);
        const before = globals.findIndex(global => declarationOrder.has(global) && declarationOrder.get(global) > position);
        globals.splice(before < 0 ? globals.length : before, 0, nameNode);
        root.RemoveChild(i);
        --i;
    }
}

/**
 * Gives the parameters AddUsedGlobalsAsFunctionParams threads for a global
 * the `t`, `s` and `u` registers the global declares.
 *
 * Carbon's AddUsedGlobalsAsFunctionParams (EffectCompilerMetal.cpp:468)
 * makes each parameter a new symbol without the global's registers, so
 * AutoAssignRegisters gives every resource a Metal slot of its own choosing,
 * and the stage records that slot. The WebGPU runtime binds engine-supplied
 * resources (a skinned mesh's bone buffer) by their HLSL register, so the
 * declared register is kept; an undeclared one still takes the first free
 * slot, as D3D assigns it.
 *
 * @param {Map<object, import("../ASTNode/ASTNode.js").ASTNode>} functions CollectFunctions' functions.
 * @param {import("../ASTNode/ASTNode.js").ASTNode[]} globals The globals.
 */
function KeepDeclaredRegisters(functions, globals)
{
    const declared = new Map();
    for (const global of globals)
    {
        const symbol = global.GetSymbol();
        for (const [profile, reg] of symbol.registerSpecifier)
        {
            if (reg.registerType === "t" || reg.registerType === "s" || reg.registerType === "u")
            {
                declared.set(symbol.name.ToString(), [profile, reg]);
                break;
            }
        }
    }
    for (const definition of functions.values())
    {
        for (const param of definition.GetChild(0).GetChildren())
        {
            const symbol = param.GetSymbol();
            const found = declared.get(symbol.name.ToString());
            if (found && symbol.registerSpecifier.size === 0)
            {
                symbol.registerSpecifier.set(found[0], found[1].Copy());
            }
        }
    }
}

/**
 * The stage's constants: Carbon's CollectConstants
 * (EffectCompilerMetal.cpp CollectConstants) with HLSL's cbuffer packing in
 * place of CalculateSizeAndOffset. A `Constant` per used member of the
 * globals struct, its default value bytes (array elements at their
 * register stride) and its parameter annotations.
 *
 * @param {ParserState} state The parse.
 * @param {StageInput} stage Receives the constants and default values.
 * @param {import("../CjsFxStdMap.js").CjsFxStdMap} annotations The effect's parameter annotations, by name.
 * @param {Set<object>} globalsStructs The globals struct symbols.
 * @returns {boolean} False after an error.
 */
function CollectConstants(state, stage, annotations, globalsStructs)
{
    for (const structSymbol of globalsStructs)
    {
        const layout = CjsFxHlslPacking.usedMembersLayout(structSymbol);
        const defaultValues = new Uint8Array(layout.size);
        const view = new DataView(defaultValues.buffer);
        for (const memberNode of structSymbol.definition.GetChildren())
        {
            for (const childNode of memberNode.GetChildren())
            {
                const symbol = childNode.GetSymbol();
                const placed = layout.members.get(symbol);
                if (!placed)
                {
                    continue;
                }
                const type = symbol.type;
                if (type.IsBindlessHandle())
                {
                    throw new Error(`CjsFxEffectCompilerWebGPU: bindless handle ${symbol.name.ToString()} is not supported`);
                }
                let elementCount = 1;
                for (let i = 0; i < type.arrayDimensions; ++i)
                {
                    elementCount *= type.arraySizes[i];
                }

                const constant = new Constant();
                constant.name = symbol.name.ToString();
                constant.offset = placed.offset >>> 0;
                constant.size = placed.size >>> 0;
                switch (type.builtInType)
                {
                    case T.OP_FLOAT:
                        constant.type = Constant.ConstantType.CONSTANT_TYPE_FLOAT;
                        break;
                    case T.OP_INT:
                        constant.type = Constant.ConstantType.CONSTANT_TYPE_INT;
                        break;
                    case T.OP_UINT:
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

                const defaultValueNode = childNode.GetChildOrNull(1);
                if (defaultValueNode)
                {
                    if (type.arrayDimensions === 0)
                    {
                        if (!FillDefaults(state, defaultValueNode, view, constant.offset, type))
                        {
                            return false;
                        }
                    }
                    else if (type.arrayDimensions === 1)
                    {
                        for (let i = 0, n = defaultValueNode.GetChildrenCount(); i < n; ++i)
                        {
                            if (!FillDefaults(state, defaultValueNode.GetChild(i), view, constant.offset + i * placed.stride, type))
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
                            const annotation = new Annotation();
                            const isSRGB = { value: constant.isSRGB };
                            const isAutoregister = { value: constant.isAutoregister };
                            if (MakeEffectAnnotationFromSymbolAnnotation(a, annotation, isSRGB, isAutoregister))
                            {
                                paramAnnotations.annotations.set(a.name.ToString(), annotation);
                            }
                            constant.isSRGB = isSRGB.value;
                            constant.isAutoregister = isAutoregister.value;
                        }
                    }
                    if (paramAnnotations.annotations.size !== 0)
                    {
                        annotations.set(constant.name, paramAnnotations);
                    }
                }

                stage.constants.push(constant);
            }
        }
        if (layout.size > stage.defaultValues.length)
        {
            const bytes = new Uint8Array(layout.size);
            bytes.set(stage.defaultValues);
            stage.defaultValues = bytes;
        }
        stage.defaultValues.set(defaultValues.subarray(0, layout.size), 0);
    }
    return true;
}

CjsSchema.meta.define(CjsFxEffectCompilerWebGPU, { className: "CjsFxEffectCompilerWebGPU" });
