// Not in Carbon: the WGSL printer of the WebGPU target, modelled on
// OutputHLSL.cpp's MSL printer (operator<<( CodeStream&, const MSL& ),
// O:1306 onward) and run on the same tree: after the target-independent
// passes of EffectCompilerMetal.cpp and PatchShader's entry wrapper.
//
// Where the MSL printer leans on C++ (implicit conversions, references,
// overloads, the MSL_INCLUDE prelude), WGSL has none of them, so this printer
// makes each explicit:
// - every implicit HLSL conversion is written out from the expression types
//   the parser recorded (Type.getCommonType rules), including scalar-to-
//   vector splats, vector truncation and conversions to and from bool;
// - an assignment to a multi-component swizzle is split per component;
// - `out`/`inout` parameters are `ptr<function, T>`;
// - intrinsics map to WGSL builtins, or to generated helper functions.
//
// Resources are module-scope bindings (operator decision): the
// constant-buffer, storage-buffer and workgroup parameters Carbon threads
// through functions for Metal are left out of signatures and calls, and
// textures and samplers stay parameters, which WGSL allows. A constant
// buffer is `array<vec4<f32>, N>` (runtime contract), and a member read is a
// read of its HLSL-packed registers (CjsFxHlslPacking.js).

import { HLSLParserTokens } from "../hlslParserTokens.js";
import { Type } from "../Type.js";
import { ParseNumber } from "../ParserUtils/parserUtils.js";
import { CjsFxWgslTypes } from "./CjsFxWgslTypes.js";
import { CjsFxHlslPacking } from "./CjsFxHlslPacking.js";
import { MetalSystemSemanticsType } from "../EffectCompilerMetal/MetalSystemSemanticsType.js";
import { ASTNode } from "../ASTNode/ASTNode.js";
import { Symbol } from "../SymbolTable/Symbol.js";

const T = HLSLParserTokens;
const N = ASTNode.ASTNodeType;

/** HLSL binary operators WGSL spells the same. */
const BINARY = new Map([
    [T.OP_PLUS, "+"], [T.OP_DASH, "-"], [T.OP_STAR, "*"], [T.OP_SLASH, "/"], [T.OP_PERCENT, "%"],
    [T.OP_LESS, "<"], [T.OP_MORE, ">"], [T.OP_LE_OP, "<="], [T.OP_GE_OP, ">="], [T.OP_EQ_OP, "=="], [T.OP_NE_OP, "!="],
    [T.OP_AMPERSAND, "&"], [T.OP_VERTICAL_BAR, "|"], [T.OP_CARET, "^"], [T.OP_LEFT_OP, "<<"], [T.OP_RIGHT_OP, ">>"],
    [T.OP_AND_OP, "&&"], [T.OP_OR_OP, "||"]
]);

/** HLSL assignment operators and the binary operator each applies. */
const ASSIGNMENT = new Map([
    [T.OP_EQUAL, ""], [T.OP_ADD_ASSIGN, "+"], [T.OP_SUB_ASSIGN, "-"], [T.OP_MUL_ASSIGN, "*"], [T.OP_DIV_ASSIGN, "/"],
    [T.OP_MOD_ASSIGN, "%"], [T.OP_AND_ASSIGN, "&"], [T.OP_OR_ASSIGN, "|"], [T.OP_XOR_ASSIGN, "^"],
    [T.OP_LEFT_ASSIGN, "<<"], [T.OP_RIGHT_ASSIGN, ">>"]
]);

const COMPARISONS = new Set([T.OP_LESS, T.OP_MORE, T.OP_LE_OP, T.OP_GE_OP, T.OP_EQ_OP, T.OP_NE_OP]);

/**
 * HLSL intrinsics WGSL has under the same or another name, with the same
 * arguments.
 */
const INTRINSICS = new Map([
    ["abs", "abs"], ["acos", "acos"], ["asin", "asin"], ["atan", "atan"], ["atan2", "atan2"], ["ceil", "ceil"],
    ["clamp", "clamp"], ["cos", "cos"], ["cosh", "cosh"], ["cross", "cross"], ["ddx", "dpdx"], ["ddy", "dpdy"],
    ["ddx_coarse", "dpdxCoarse"], ["ddy_coarse", "dpdyCoarse"], ["ddx_fine", "dpdxFine"], ["ddy_fine", "dpdyFine"],
    ["degrees", "degrees"], ["determinant", "determinant"], ["distance", "distance"], ["dot", "dot"], ["exp", "exp"],
    ["exp2", "exp2"], ["faceforward", "faceForward"], ["floor", "floor"], ["frac", "fract"], ["fwidth", "fwidth"],
    ["ldexp", "ldexp"], ["length", "length"], ["lerp", "mix"], ["log", "log"], ["log2", "log2"], ["max", "max"],
    ["min", "min"], ["normalize", "normalize"], ["pow", "pow"], ["radians", "radians"], ["reflect", "reflect"],
    ["refract", "refract"], ["round", "round"], ["rsqrt", "inverseSqrt"], ["saturate", "saturate"], ["sign", "sign"],
    ["sin", "sin"], ["sinh", "sinh"], ["smoothstep", "smoothstep"], ["sqrt", "sqrt"], ["step", "step"], ["tan", "tan"],
    ["tanh", "tanh"], ["transpose", "transpose"], ["trunc", "trunc"], ["countbits", "countOneBits"],
    ["reversebits", "reverseBits"], ["firstbithigh", "firstLeadingBit"], ["firstbitlow", "firstTrailingBit"]
]);

/**
 * The WGSL text of one stage: its module-scope bindings, the structs and
 * functions its entry reaches, and the entry point `main`.
 */
export class CjsFxOutputWGSL
{
    /** The parse. @type {import("../ParserState/ParserState.js").ParserState|null} */
    _state = null;

    /** The stage kind. @type {"vertex"|"fragment"|"compute"|null} */
    _stage = null;

    /** PatchShader's wrapper, printed as `main`. @type {import("../ASTNode/ASTNode.js").ASTNode|null} */
    _entry = null;

    /** Allocates a pass-level binding. @type {Function|null} */
    _bind = null;

    /** The pass-level `@location` of a varying semantic. @type {Function|null} */
    _location = null;

    /** The struct symbols laid out over used members only. @type {Set<object>|null} */
    _globalsStructs = null;

    /** Constant buffers by struct symbol. @type {Map<object, { name: string, layout: { size: number, members: Map } }>} */
    _cbuffers = new Map();

    /** Generated helper functions by name. @type {Map<string, string>} */
    _helpers = new Map();

    /** Compute entry dimensions from numthreads. @type {number[]|null} */
    _threadGroupSize = null;

    /** Const symbols being expanded in a texture offset, or null outside it. @type {Set<object>|null} */
    _constantOffset = null;

    /** Counter for temporaries. */
    _temps = 0;

    /** The parameters this printer leaves out, as module-scope bindings stand for them. @type {Set<object>} */
    _moduleScopeParams = new Set();

    /** `out` and `inout` parameters, read through their pointer. @type {Set<object>} */
    _pointerParams = new Set();

    /**
     * @param {object} options The stage.
     * @param {import("../ParserState/ParserState.js").ParserState} options.state The parse, after the WebGPU passes; used symbols are marked for this stage.
     * @param {"vertex"|"fragment"|"compute"} options.stage The stage kind.
     * @param {import("../ASTNode/ASTNode.js").ASTNode} options.entry The `NT_FUNCTION_DEFINITION` PatchShader made.
     * @param {(resource: { symbol: object, kind: string, registerIndex: number, type: string, name: string, structureStride: number|null }) => number} options.bind
     *   Allocates the pass-level binding for a resource of this stage and returns its number.
     * @param {(semantic: string) => number} options.location The pass-level `@location` of a varying semantic.
     * @param {number[]|null} [options.threadGroupSize] Compute entry dimensions from numthreads.
     * @param {Set<object>} [options.globalsStructs] The struct symbols laid out over used members only (`GlobalsData`, `UITransforms`).
     */
    constructor({ state, stage, entry, bind, location, threadGroupSize = null, globalsStructs = new Set() })
    {
        this._state = state;

        this._stage = stage;

        this._threadGroupSize = threadGroupSize;

        this._entry = entry;

        this._bind = bind;

        this._location = location;

        this._globalsStructs = globalsStructs;
    }

    /**
     * Prints the stage.
     *
     * @returns {string} The WGSL module.
     */
    Write()
    {
        const bindings = this._writeBindings();
        const body = [];
        const root = this._state.GetTree();
        for (const node of root.GetChildren())
        {
            if (node === null)
            {
                continue;
            }
            switch (node.GetNodeType())
            {
                case N.NT_STRUCT:
                    body.push(this._writeStruct(node));
                    break;
                case N.NT_VAR_DECLARATION_LIST:
                    body.push(this._writeModuleDeclarations(node));
                    break;
                case N.NT_FUNCTION_DEFINITION:
                    body.push(node === this._entry ? this._writeEntry(node) : this._writeFunction(node));
                    break;
                default:
                    break;
            }
        }
        return [...bindings, ...this._helpers.values(), ...body].filter(text => text !== "").join("\n") + "\n";
    }

    // ---------------------------------------------------------------------
    // Module scope
    // ---------------------------------------------------------------------

    /**
     * The module-scope bindings of the resources the entry receives, from the
     * wrapper's registered parameters.
     *
     * @returns {string[]} The declarations.
     */
    _writeBindings()
    {
        const lines = [];
        const header = this._entry.GetChild(0);
        for (const param of header.GetChildren())
        {
            const symbol = param.GetSymbol();
            const reg = registerOf(symbol);
            if (reg === null)
            {
                continue;
            }
            const type = symbol.type;
            switch (reg.registerType)
            {
                case "c":
                {
                    const layout = this._layoutOf(type.symbol);
                    const name = `cb${reg.registerNumber}`;
                    const registers = Math.max(1, Math.ceil(layout.size / CjsFxHlslPacking.registerBytes));
                    const wgsl = `array<vec4<f32>, ${registers}>`;
                    const binding = this._bind({ symbol, kind: "uniform-buffer", registerIndex: reg.registerNumber, type: wgsl, name, structureStride: null });
                    this._cbuffers.set(type.symbol, { name, layout });
                    this._moduleScopeParams.add(symbol);
                    lines.push(`@group(0) @binding(${binding}) var<uniform> ${name} : ${wgsl};`);
                    break;
                }
                case "t":
                {
                    const name = this._nameOf(symbol);
                    const wgsl = CjsFxWgslTypes.wgslType(type, s => this._nameOf(s));
                    if (!type.IsTexture())
                    {
                        // An SRV buffer with an HLSL `register(tN)`; the block's
                        // sampled-resource with a non-texture type is a
                        // read-only storage buffer.
                        const binding = this._bind({ symbol, kind: "sampled-resource", registerIndex: reg.registerNumber, type: wgsl, name, structureStride: structuredStride(type) });
                        this._moduleScopeParams.add(symbol);
                        lines.push(`@group(0) @binding(${binding}) var<storage, read> ${name} : ${wgsl};`);
                        break;
                    }
                    const binding = this._bind({ symbol, kind: "sampled-resource", registerIndex: reg.registerNumber, type: wgsl, name, structureStride: null });
                    lines.push(`@group(0) @binding(${binding}) var ${name} : ${wgsl};`);
                    break;
                }
                case "s":
                {
                    const name = this._nameOf(symbol);
                    const wgsl = CjsFxWgslTypes.wgslType(type, s => this._nameOf(s));
                    const binding = this._bind({ symbol, kind: "sampler", registerIndex: reg.registerNumber, type: wgsl, name, structureStride: null });
                    lines.push(`@group(0) @binding(${binding}) var ${name} : ${wgsl};`);
                    break;
                }
                case "b":
                {
                    // Metal's SRV buffer register: a read-only structured buffer.
                    const name = this._nameOf(symbol);
                    const wgsl = CjsFxWgslTypes.wgslType(type, s => this._nameOf(s));
                    const binding = this._bind({ symbol, kind: "sampled-resource", registerIndex: reg.registerNumber, type: wgsl, name, structureStride: structuredStride(type) });
                    this._moduleScopeParams.add(symbol);
                    lines.push(`@group(0) @binding(${binding}) var<storage, read> ${name} : ${wgsl};`);
                    break;
                }
                case "i":
                case "v":
                    break;
                default:
                    throw new Error(`CjsFxOutputWGSL: ${symbol.name.ToString()} has a register WGSL does not bind yet (${reg.registerType})`);
            }
        }
        return lines;
    }

    /**
     * The constant-buffer layout of a struct: every member for a declared
     * constant buffer, only the used members for the synthesised globals,
     * which is how the stage's constants are recorded.
     *
     * @param {object} structSymbol The struct's symbol.
     * @returns {{ size: number, members: Map<object, { offset: number, type: Type }> }} The layout.
     */
    _layoutOf(structSymbol)
    {
        return this._globalsStructs.has(structSymbol) ? CjsFxHlslPacking.usedMembersLayout(structSymbol) : CjsFxHlslPacking.structLayout(structSymbol);
    }

    /**
     * A struct definition, unless unused or only a constant buffer's layout.
     *
     * @param {import("../ASTNode/ASTNode.js").ASTNode} node The `NT_STRUCT`.
     * @returns {string} The definition, or "".
     */
    _writeStruct(node)
    {
        const symbol = node.GetSymbol();
        if (!symbol.used || this._cbuffers.has(symbol) || this._globalsStructs.has(symbol))
        {
            return "";
        }
        const isOutput = this._entry.GetChild(0).GetSymbol().type.symbol === symbol;
        const members = [];
        for (const memberNode of node.GetChildren())
        {
            for (const nameNode of memberNode.GetChildren())
            {
                const member = nameNode.GetSymbol();
                const attributes = this._ioAttributes(member, isOutput);
                members.push(`    ${attributes}${this._nameOf(member)} : ${CjsFxWgslTypes.wgslType(member.type, s => this._nameOf(s))},`);
            }
        }
        return `struct ${this._nameOf(symbol)}\n{\n${members.join("\n")}\n};\n`;
    }

    /**
     * The `@location`/`@builtin` attributes of a stage input or output
     * member, from the register PrepareVertexFunction or
     * PrepareFragmentFunction gave it.
     *
     * @param {object} member The member's symbol.
     * @param {boolean} isOutput Whether the struct is the entry's result.
     * @returns {string} The attributes with a trailing space, or "".
     */
    _ioAttributes(member, isOutput)
    {
        const reg = registerOf(member);
        if (reg === null)
        {
            return "";
        }
        switch (reg.registerType)
        {
            case "a":
                return `@location(${reg.registerNumber}) `;
            case "x":
            {
                if (this._stage === "fragment" && isOutput)
                {
                    break;
                }
                // These are inter-stage varyings, not vertex attributes or
                // builtins. HLSL's `linear` is perspective (WGSL's default).
                const interpolation = member.interpolationModifier === T.OP_NOPERSPECTIVE ? "@interpolate(linear) "
                    : member.interpolationModifier === T.OP_NOINTERPOLATION ? "@interpolate(flat) " : "";
                return `@location(${this._location(member.semantic.ToString().toUpperCase())}) ${interpolation}`;
            }
            case "v":
                return `${systemAttribute(reg.registerNumber)} `;
            default:
                break;
        }
        throw new Error(`CjsFxOutputWGSL: stage member ${member.name.ToString()} has register ${reg.registerType}`);
    }

    /**
     * Module-scope declarations: constants and private variables. Resource and
     * constant-buffer globals were moved by CollectGlobals.
     *
     * @param {import("../ASTNode/ASTNode.js").ASTNode} node The `NT_VAR_DECLARATION_LIST`.
     * @returns {string} The declarations, or "".
     */
    _writeModuleDeclarations(node)
    {
        const lines = [];
        for (const nameNode of node.GetChildren())
        {
            const symbol = nameNode.GetSymbol();
            if (!symbol || !symbol.used)
            {
                continue;
            }
            const type = CjsFxWgslTypes.wgslType(symbol.type, s => this._nameOf(s));
            const init = nameNode.GetChildOrNull(1);
            if (symbol.addressSpace === Symbol.AddressSpace.Constant && init)
            {
                lines.push(`const ${this._nameOf(symbol)} : ${type} = ${this._initializer(init, symbol.type)};`);
            }
            else
            {
                lines.push(`var<private> ${this._nameOf(symbol)} : ${type}${init ? ` = ${this._initializer(init, symbol.type)}` : ""};`);
            }
        }
        return lines.join("\n");
    }

    // ---------------------------------------------------------------------
    // Functions
    // ---------------------------------------------------------------------

    /**
     * A user function, unless unused.
     *
     * @param {import("../ASTNode/ASTNode.js").ASTNode} node The `NT_FUNCTION_DEFINITION`.
     * @returns {string} The function, or "".
     */
    _writeFunction(node)
    {
        const header = node.GetChild(0);
        const symbol = header.GetSymbol();
        if (!symbol.used)
        {
            return "";
        }
        const params = [];
        const copies = [];
        const assigned = assignedSymbols(node.GetChild(1));
        for (const param of header.GetChildren())
        {
            const p = param.GetSymbol();
            if (this._isModuleScope(p))
            {
                continue;
            }
            const type = CjsFxWgslTypes.wgslType(p.type, s => this._nameOf(s));
            if (isReferenceParam(param))
            {
                this._pointerParams.add(p);
                params.push(`${this._nameOf(p)} : ptr<function, ${type}>`);
                continue;
            }
            params.push(`${this._copiedParam(p, type, assigned, copies)} : ${type}`);
        }
        const returnType = header.GetType();
        const result = returnType.builtInType === T.OP_VOID ? "" : ` -> ${CjsFxWgslTypes.wgslType(returnType, s => this._nameOf(s))}`;
        this._returnType = returnType;
        const body = withLeadingLines(this._block(node.GetChild(1), 1), copies);
        return `fn ${this._nameOf(symbol)}(${params.join(", ")})${result}\n${body}\n`;
    }

    /**
     * The entry point, PatchShader's wrapper, as `fn main`.
     *
     * @param {import("../ASTNode/ASTNode.js").ASTNode} node The wrapper's `NT_FUNCTION_DEFINITION`.
     * @returns {string} The entry point.
     */
    _writeEntry(node)
    {
        const header = node.GetChild(0);
        const params = [];
        const zeros = [];
        const assigned = assignedSymbols(node.GetChild(1));
        for (const param of header.GetChildren())
        {
            const p = param.GetSymbol();
            const reg = registerOf(p);
            if (reg !== null && reg.registerType === "v")
            {
                if (reg.registerNumber === BASE_VERTEX || reg.registerNumber === BASE_INSTANCE)
                {
                    // Divergence (operator decision): WebGPU has no
                    // base vertex or instance builtin, so Carbon's subtraction
                    // (EffectCompilerMetal.cpp PatchShader) subtracts zero and
                    // SV_VertexID/SV_InstanceID include the draw's base.
                    zeros.push(`    let ${this._nameOf(p)} : ${CjsFxWgslTypes.wgslType(p.type, s => this._nameOf(s))} = 0u;`);
                    continue;
                }
                const type = CjsFxWgslTypes.wgslType(p.type, s => this._nameOf(s));
                params.push(`${systemAttribute(reg.registerNumber)} ${this._copiedParam(p, type, assigned, zeros)} : ${type}`);
                continue;
            }
            if (reg !== null && reg.registerType !== "i")
            {
                // Resources and constant buffers are module-scope bindings.
                this._moduleScopeParams.add(p);
                continue;
            }
            const type = CjsFxWgslTypes.wgslType(p.type, s => this._nameOf(s));
            params.push(`${this._copiedParam(p, type, assigned, zeros)} : ${type}`);
        }
        const returnType = header.GetType();
        let result = "";
        if (returnType.builtInType !== T.OP_VOID)
        {
            result = ` -> ${CjsFxWgslTypes.wgslType(returnType, s => this._nameOf(s))}`;
        }
        this._returnType = returnType;
        let attribute = this._stage === "vertex" ? "@vertex" : this._stage === "fragment" ? "@fragment" : "@compute";
        if (this._stage === "compute")
        {
            if (this._threadGroupSize === null || this._threadGroupSize.length !== 3 || this._threadGroupSize.some(size => !Number.isInteger(size) || size <= 0))
            {
                throw new Error("CjsFxOutputWGSL: compute shaders without positive numthreads dimensions are not supported yet");
            }
            attribute += ` @workgroup_size(${this._threadGroupSize.join(", ")})`;
        }
        const body = withLeadingLines(this._block(node.GetChild(1), 1), zeros);
        return `${attribute}\nfn main(${params.join(", ")})${result}\n${body}\n`;
    }

    /**
     * The name a value parameter is received under. WGSL parameters are
     * read-only, so one the body assigns (HLSL allows it; PatchShader's
     * `id -= base_vertex` does it) arrives as `cjs_in_<name>` and is copied
     * into a local of its own name.
     *
     * @param {object} symbol The parameter's symbol.
     * @param {string} type Its WGSL type.
     * @param {Set<object>} assigned The symbols the body assigns.
     * @param {string[]} copies Receives the copy, a line of the body.
     * @returns {string} The parameter's name in the signature.
     */
    _copiedParam(symbol, type, assigned, copies)
    {
        const name = this._nameOf(symbol);
        // By name, as WGSL resolves it: PatchShader's `id -= base_vertex`
        // targets the source function's parameter symbol, which the wrapper's
        // parameter only shares a name with.
        if (![...assigned].some(other => this._nameOf(other) === name))
        {
            return name;
        }
        copies.push(`    var ${name} : ${type} = cjs_in_${name};`);
        return `cjs_in_${name}`;
    }

    /**
     * Whether a parameter stands for a module-scope binding: a constant
     * buffer, storage buffer or workgroup value Carbon threads for Metal.
     *
     * @param {object} symbol The parameter's symbol.
     * @returns {boolean} True when it is left out.
     */
    _isModuleScope(symbol)
    {
        if (this._moduleScopeParams.has(symbol))
        {
            return true;
        }
        if (symbol.addressSpace === Symbol.AddressSpace.Constant || symbol.addressSpace === Symbol.AddressSpace.Device || symbol.addressSpace === Symbol.AddressSpace.Threadgroup)
        {
            return true;
        }
        return symbol.type.IsStruct() && this._cbuffers.has(symbol.type.symbol);
    }

    // ---------------------------------------------------------------------
    // Statements
    // ---------------------------------------------------------------------

    /**
     * A block's statements, indented.
     *
     * @param {import("../ASTNode/ASTNode.js").ASTNode} node An `NT_BLOCK` or a single statement.
     * @param {number} depth Indent depth of the statements.
     * @returns {string} The block, braces included.
     */
    _block(node, depth)
    {
        const pad = "    ".repeat(depth - 1);
        const statements = node && node.GetNodeType() === N.NT_BLOCK ? node.GetChildren() : [node];
        const lines = [];
        for (const statement of statements)
        {
            if (statement !== null)
            {
                lines.push(this._statement(statement, depth));
            }
        }
        return `${pad}{\n${lines.filter(line => line !== "").join("\n")}\n${pad}}`;
    }

    /**
     * One statement.
     *
     * @param {import("../ASTNode/ASTNode.js").ASTNode} node The statement.
     * @param {number} depth Indent depth.
     * @returns {string} Its lines.
     */
    _statement(node, depth)
    {
        const pad = "    ".repeat(depth);
        switch (node.GetNodeType())
        {
            case N.NT_BLOCK:
                return this._block(node, depth + 1);
            case N.NT_VAR_DECLARATION_LIST:
                return node.GetChildren().filter(Boolean).map(n => pad + this._localDeclaration(n)).join("\n");
            case N.NT_EXPRESSION_STATEMENT:
                if (node.GetChildrenCount() === 0 || node.GetChild(0) === null)
                {
                    return "";
                }
                return this._expressionStatement(node.GetChild(0), pad);
            case N.NT_IF:
            {
                let text = `${pad}if (${this._condition(node.GetChild(0))})\n${this._block(node.GetChild(1), depth + 1)}`;
                if (node.GetChildrenCount() > 2 && node.GetChild(2) !== null)
                {
                    text += `\n${pad}else\n${this._block(node.GetChild(2), depth + 1)}`;
                }
                return text;
            }
            case N.NT_WHILE:
                return `${pad}while (${this._condition(node.GetChild(0))})\n${this._block(node.GetChild(1), depth + 1)}`;
            case N.NT_DO:
            {
                const body = this._block(node.GetChild(1), depth + 1);
                return `${pad}loop\n${pad}{\n${body}\n${pad}    continuing\n${pad}    {\n${pad}        break if !(${this._condition(node.GetChild(0))});\n${pad}    }\n${pad}}`;
            }
            case N.NT_FOR:
            {
                const init = node.GetChild(0);
                const initText = init === null ? "" : init.GetNodeType() === N.NT_VAR_DECLARATION_LIST
                    ? node.GetChild(0).GetChildren().filter(Boolean).map(n => this._localDeclaration(n).replace(/;$/u, "")).join("")
                    : this._expressionStatement(init.GetNodeType() === N.NT_EXPRESSION_STATEMENT ? init.GetChild(0) : init, "").replace(/;$/u, "");
                const condition = node.GetChild(1) === null ? "" : this._condition(node.GetChild(1).GetNodeType() === N.NT_EXPRESSION_STATEMENT ? node.GetChild(1).GetChild(0) : node.GetChild(1));
                const update = node.GetChild(2) === null ? "" : this._expressionStatement(node.GetChild(2), "").replace(/;$/u, "");
                return `${pad}for (${initText}; ${condition}; ${update})\n${this._block(node.GetChild(3), depth + 1)}`;
            }
            case N.NT_JUMP:
                switch (node.GetToken().type)
                {
                    case T.OP_CONTINUE:
                        return `${pad}continue;`;
                    case T.OP_BREAK:
                        return `${pad}break;`;
                    case T.OP_DISCARD:
                        return `${pad}discard;`;
                    default:
                        if (node.GetChildrenCount() === 0)
                        {
                            return `${pad}return;`;
                        }
                        return `${pad}return ${this._coerced(node.GetChild(0), this._returnType)};`;
                }
            default:
                throw new Error(`CjsFxOutputWGSL: statement ${nodeName(node)} is not supported yet`);
        }
    }

    /**
     * A local declaration: `var name : T = init;`.
     *
     * @param {import("../ASTNode/ASTNode.js").ASTNode} node The `NT_NAME_DECLARATION`.
     * @returns {string} The declaration.
     */
    _localDeclaration(node)
    {
        const symbol = node.GetSymbol();
        const type = CjsFxWgslTypes.wgslType(symbol.type, s => this._nameOf(s));
        const init = node.GetChildOrNull(1);
        return `var ${this._nameOf(symbol)} : ${type}${init ? ` = ${this._initializer(init, symbol.type)}` : ""};`;
    }

    /**
     * An initializer converted to its declaration's type; an inline
     * constructor `{ ... }` becomes the type's constructor.
     *
     * @param {import("../ASTNode/ASTNode.js").ASTNode} node The initializer.
     * @param {Type} type The declared type.
     * @returns {string} The expression.
     */
    _initializer(node, type)
    {
        if (node.GetNodeType() === N.NT_INLINE_CONSTRUCTOR)
        {
            const target = CjsFxWgslTypes.wgslType(type, s => this._nameOf(s));
            const element = type.Copy();
            if (type.arrayDimensions > 0)
            {
                element.arrayDimensions = 0;
                return `${target}(${node.GetChildren().map(child => this._initializer(child, element)).join(", ")})`;
            }
            const component = type.Copy();
            component.width = 1;
            component.height = 1;
            return `${target}(${node.GetChildren().map(child => this._coerced(child, component)).join(", ")})`;
        }
        return this._coerced(node, type);
    }

    /**
     * An expression in statement position: an assignment, an increment or a
     * call. A multi-component swizzle target is assigned per component, as
     * WGSL cannot assign to a swizzle.
     *
     * @param {import("../ASTNode/ASTNode.js").ASTNode} node The expression.
     * @param {string} pad Indent.
     * @returns {string} The statement.
     */
    _expressionStatement(node, pad)
    {
        if (node.GetNodeType() === N.NT_EXPRESSION && node.GetToken() && ASSIGNMENT.has(node.GetToken().type))
        {
            return this._assignment(node, pad);
        }
        if (node.GetNodeType() === N.NT_EXPRESSION && node.GetToken() && node.GetToken().type === T.OP_LEFT_PAREN)
        {
            return this._expressionStatement(node.GetChild(0), pad);
        }
        if (node.GetNodeType() === N.NT_POSTFIX_EXPRESSION && node.GetToken().type === T.OP_DOT &&
            node.GetChild(1).GetToken().stringValue.ToString() === "GetDimensions")
        {
            return this._getDimensions(node.GetChild(0), node.GetChild(1).GetChildren(), pad);
        }
        if ((node.GetNodeType() === N.NT_POSTFIX_EXPRESSION || node.GetNodeType() === N.NT_PREFIX_EXPRESSION) &&
            (node.GetToken().type === T.OP_INC_OP || node.GetToken().type === T.OP_DEC_OP))
        {
            return `${pad}${this._lvalue(node.GetChild(0))}${node.GetToken().type === T.OP_INC_OP ? "++" : "--"};`;
        }
        if (node.GetNodeType() === N.NT_FUNCTION_CALL)
        {
            const call = this._expression(node);
            return node.GetType().builtInType === T.OP_VOID || node.GetType().builtInType === 0 ? `${pad}${call};` : `${pad}_ = ${call};`;
        }
        throw new Error(`CjsFxOutputWGSL: expression statement ${nodeName(node)} is not supported yet`);
    }

    /**
     * HLSL's `texture.GetDimensions(out width, out height)` on a 2D texture,
     * a statement in WGSL: each out argument is assigned its component of
     * `textureDimensions`, converted to the argument's type as HLSL does.
     *
     * @param {import("../ASTNode/ASTNode.js").ASTNode} object The texture.
     * @param {import("../ASTNode/ASTNode.js").ASTNode[]} args The out arguments.
     * @param {string} pad Indent.
     * @returns {string} The statements.
     */
    _getDimensions(object, args, pad)
    {
        const objectType = typeOf(object);
        if (!objectType.IsTexture() || args.length !== 2 || objectType.IsTextureArray())
        {
            throw new Error("CjsFxOutputWGSL: GetDimensions with these arguments is not supported yet");
        }
        const temp = `cjs_t${this._temps++}`;
        const uint = new Type();
        uint.FromTokenType(T.OP_UINT);
        const lines = [`${pad}{`, `${pad}    let ${temp} = textureDimensions(${this._expression(object)});`];
        args.forEach((arg, i) =>
        {
            lines.push(`${pad}    ${this._lvalue(arg)} = ${this._convert(`${temp}.${"xy"[i]}`, uint, typeOf(arg))};`);
        });
        lines.push(`${pad}}`);
        return lines.join("\n");
    }

    /**
     * An assignment statement, with HLSL's implicit conversion of the value
     * and per-component assignment to a multi-component swizzle.
     *
     * @param {import("../ASTNode/ASTNode.js").ASTNode} node The `NT_EXPRESSION` assignment.
     * @param {string} pad Indent.
     * @returns {string} The statement or statements.
     */
    _assignment(node, pad)
    {
        const target = node.GetChild(0);
        const targetType = typeOf(target);
        const operator = ASSIGNMENT.get(node.GetToken().type);
        if (operator === "*" && targetType.IsMatrix() && typeOf(node.GetChild(1)).IsMatrix())
        {
            throw new Error("CjsFxOutputWGSL: HLSL's component-wise matrix *= is not supported yet");
        }
        const swizzle = swizzleOf(target);
        if (swizzle !== null && swizzle.length > 1)
        {
            // WGSL has no swizzle assignment: evaluate the value once, then
            // assign each component.
            const temp = `cjs_t${this._temps++}`;
            const base = this._lvalue(target.GetChild(0));
            const value = operator === "" ? this._coerced(node.GetChild(1), targetType) : this._operand(node.GetChild(1), targetType, operator);
            const scalar = operator !== "" && operator !== "<<" && operator !== ">>" && typeOf(node.GetChild(1)).IsScalar();
            const lines = [`${pad}{`, `${pad}    let ${temp} = ${value};`];
            const components = "xyzw";
            for (let i = 0; i < swizzle.length; ++i)
            {
                const field = normaliseComponent(swizzle[i]);
                lines.push(`${pad}    ${base}.${field} ${operator}= ${temp}${scalar ? "" : `.${components[i]}`};`);
            }
            lines.push(`${pad}}`);
            return lines.join("\n");
        }
        const left = this._lvalue(target);
        if (operator === "")
        {
            return `${pad}${left} = ${this._coerced(node.GetChild(1), targetType)};`;
        }
        return `${pad}${left} ${operator}= ${this._operand(node.GetChild(1), targetType, operator)};`;
    }

    /**
     * The right operand of a compound assignment, converted so `left op right`
     * is valid WGSL: a scalar stays scalar beside a vector target.
     *
     * @param {import("../ASTNode/ASTNode.js").ASTNode} node The operand.
     * @param {Type} targetType The target's type.
     * @param {string} operator The binary operator.
     * @returns {string} The expression.
     */
    _operand(node, targetType, operator)
    {
        const type = typeOf(node);
        if (operator === "<<" || operator === ">>")
        {
            return this._coerced(node, withComponent(targetType.width > 1 ? shapeOf(targetType) : scalarOf(targetType), T.OP_UINT));
        }
        if (type.IsScalar() && !targetType.IsScalar() && !targetType.IsMatrix())
        {
            return this._coerced(node, scalarOf(targetType));
        }
        return this._coerced(node, targetType);
    }

    /**
     * A condition as WGSL `bool`.
     *
     * @param {import("../ASTNode/ASTNode.js").ASTNode} node The condition.
     * @returns {string} The expression.
     */
    _condition(node)
    {
        const bool = new Type();
        bool.FromTokenType(T.OP_BOOL);
        return this._coerced(node, bool);
    }

    // ---------------------------------------------------------------------
    // Expressions
    // ---------------------------------------------------------------------

    /**
     * An expression converted to `type` the way HLSL converts implicitly.
     *
     * @param {import("../ASTNode/ASTNode.js").ASTNode} node The expression.
     * @param {Type} type The type wanted.
     * @returns {string} The expression.
     */
    _coerced(node, type)
    {
        return this._convert(this._expression(node), typeOf(node), type);
    }

    /**
     * Converts an expression of one HLSL type to another as HLSL does
     * implicitly: component conversion, scalar splat, vector truncation
     * and conversions to and from bool.
     *
     * @param {string} text The expression.
     * @param {Type} from Its type.
     * @param {Type} to The type wanted.
     * @returns {string} The converted expression.
     */
    _convert(text, from, to)
    {
        if (to.IsStruct() || from.IsStruct() || to.arrayDimensions > 0 || from.arrayDimensions > 0)
        {
            return text;
        }
        if (to.IsMatrix() || from.IsMatrix())
        {
            if (to.IsMatrix() && from.IsMatrix() && (to.width !== from.width || to.height !== from.height))
            {
                return this._matrixTruncation(text, from, to);
            }
            return text;
        }
        if (!to.IsScalarOrVector() || !from.IsScalarOrVector())
        {
            return text;
        }
        const fromScalar = CjsFxWgslTypes.wgslScalar(from.builtInType);
        const toScalar = CjsFxWgslTypes.wgslScalar(to.builtInType);
        if (fromScalar === null || toScalar === null)
        {
            return text;
        }
        let result = text;
        let width = from.width;
        if (to.width < width)
        {
            result = width === 1 ? result : `(${result}).${"xyzw".slice(0, to.width)}`;
            width = to.width;
        }
        if (fromScalar !== toScalar)
        {
            result = width === 1 ? `${toScalar}(${result})` : `vec${width}<${toScalar}>(${result})`;
        }
        if (to.width > width)
        {
            if (width !== 1)
            {
                throw new Error(`CjsFxOutputWGSL: cannot widen a ${from.ToString()} to a ${to.ToString()}`);
            }
            result = `vec${to.width}<${toScalar}>(${result})`;
        }
        return result;
    }

    /**
     * HLSL's matrix truncation, `(float3x3)m`: the upper-left rows and
     * columns, as a generated helper.
     *
     * @param {string} text The matrix.
     * @param {Type} from Its type.
     * @param {Type} to The smaller type.
     * @returns {string} The call.
     */
    _matrixTruncation(text, from, to)
    {
        const scalar = CjsFxWgslTypes.wgslScalar(to.builtInType);
        const fromWgsl = `mat${from.height}x${from.width}<${scalar}>`;
        const toWgsl = `mat${to.height}x${to.width}<${scalar}>`;
        const name = `cjs_truncate_${from.height}x${from.width}_to_${to.height}x${to.width}`;
        if (!this._helpers.has(name))
        {
            const columns = [];
            for (let c = 0; c < to.height; ++c)
            {
                columns.push(`m[${c}].${"xyzw".slice(0, to.width)}`);
            }
            this._helpers.set(name, `fn ${name}(m : ${fromWgsl}) -> ${toWgsl}\n{\n    return ${toWgsl}(${columns.join(", ")});\n}\n`);
        }
        return `${name}(${text})`;
    }

    /**
     * An assignable expression.
     *
     * @param {import("../ASTNode/ASTNode.js").ASTNode} node The target.
     * @returns {string} The expression.
     */
    _lvalue(node)
    {
        return this._expression(node);
    }

    /**
     * An expression of its own HLSL type.
     *
     * @param {import("../ASTNode/ASTNode.js").ASTNode} node The expression.
     * @returns {string} The expression.
     */
    _expression(node)
    {
        // WGSL offsets must be const-expressions. Mutable locals and uniforms
        // with initializers are still runtime values; user calls and side
        // effects cannot become constants merely by printing their arguments.
        if (this._constantOffset !== null)
        {
            const kind = node.GetNodeType();
            const token = node.GetToken()?.type;
            if ((kind === N.NT_FUNCTION_CALL && node.GetSymbol() !== null)
                || (kind === N.NT_PREFIX_EXPRESSION && ![T.OP_PLUS, T.OP_DASH, T.OP_BANG, T.OP_TILDE].includes(token))
                || (kind === N.NT_POSTFIX_EXPRESSION && token !== T.OP_ID && token !== T.OP_LEFT_BRACKET))
            {
                throw new Error("CjsFxOutputWGSL: texture offset must be a constant expression; this expression is not supported yet");
            }
        }
        switch (node.GetNodeType())
        {
            case N.NT_VAR_IDENTIFIER:
            {
                const symbol = node.GetSymbol();
                if (this._constantOffset !== null)
                {
                    const initializer = symbol.definition?.GetChildOrNull(1);
                    if (symbol.type.modifier !== T.OP_CONST || !initializer || this._constantOffset.has(symbol))
                    {
                        throw new Error("CjsFxOutputWGSL: texture offset must be constant; runtime or recursive offsets are not supported yet");
                    }
                    this._constantOffset.add(symbol);
                    try
                    {
                        return this._coerced(initializer, symbol.type);
                    }
                    finally
                    {
                        this._constantOffset.delete(symbol);
                    }
                }
                const name = this._nameOf(symbol);
                return this._pointerParams.has(symbol) ? `(*${name})` : name;
            }
            case N.NT_CONSTANT:
                return literal(node);
            case N.NT_EXPRESSION:
                return this._binary(node);
            case N.NT_PREFIX_EXPRESSION:
                return this._prefix(node);
            case N.NT_POSTFIX_EXPRESSION:
                return this._postfix(node);
            case N.NT_CONDITIONAL_EXPRESSION:
            {
                const type = typeOf(node);
                const condition = this._coerced(node.GetChild(0), withComponent(type.width > 1 ? shapeOf(type) : scalarOf(type), T.OP_BOOL));
                return `select(${this._coerced(node.GetChild(2), type)}, ${this._coerced(node.GetChild(1), type)}, ${condition})`;
            }
            case N.NT_CAST_EXPRESSION:
                return this._convertExplicit(node.GetChild(0), node.GetType());
            case N.NT_FUNCTION_CALL:
                return this._call(node);
            default:
                throw new Error(`CjsFxOutputWGSL: expression ${nodeName(node)} is not supported yet`);
        }
    }

    /**
     * An explicit cast: like an implicit conversion, plus scalar-to-matrix.
     *
     * @param {import("../ASTNode/ASTNode.js").ASTNode} node The operand.
     * @param {Type} type The cast type.
     * @returns {string} The expression.
     */
    _convertExplicit(node, type)
    {
        return `(${this._coerced(node, type)})`;
    }

    /**
     * A binary expression, operands converted to their common type; a
     * scalar beside a vector stays scalar, which WGSL's arithmetic allows.
     *
     * @param {import("../ASTNode/ASTNode.js").ASTNode} node The `NT_EXPRESSION`.
     * @returns {string} The expression.
     */
    _binary(node)
    {
        const token = node.GetToken().type;
        if (token === T.OP_LEFT_PAREN || token === 0)
        {
            return `(${this._expression(node.GetChild(0))})`;
        }
        if (ASSIGNMENT.has(token))
        {
            throw new Error("CjsFxOutputWGSL: an assignment inside an expression is not supported");
        }
        if (token === T.OP_COMA)
        {
            throw new Error("CjsFxOutputWGSL: the comma operator is not supported");
        }
        const operator = BINARY.get(token);
        if (operator === undefined)
        {
            throw new Error(`CjsFxOutputWGSL: operator ${node.GetToken().stringValue.ToString()} is not supported yet`);
        }
        const left = node.GetChild(0);
        const right = node.GetChild(1);
        const leftType = typeOf(left);
        const rightType = typeOf(right);
        const common = new Type();
        if (!Type.getCommonType(leftType, rightType, common))
        {
            common.Assign(leftType);
        }
        if (token === T.OP_AND_OP || token === T.OP_OR_OP)
        {
            const bool = withComponent(common.width > 1 ? shapeOf(common) : scalarOf(common), T.OP_BOOL);
            const op = common.width > 1 ? (token === T.OP_AND_OP ? "&" : "|") : operator;
            return `(${this._coerced(left, bool)} ${op} ${this._coerced(right, bool)})`;
        }
        if (token === T.OP_LEFT_OP || token === T.OP_RIGHT_OP)
        {
            const amount = withComponent(rightType.width > 1 ? shapeOf(common) : scalarOf(common), T.OP_UINT);
            return `(${this._coerced(left, common)} ${operator} ${this._coerced(right, amount)})`;
        }
        if (token === T.OP_STAR && leftType.IsMatrix() && rightType.IsMatrix())
        {
            throw new Error("CjsFxOutputWGSL: HLSL's component-wise matrix * is not supported yet");
        }
        const leftScalar = leftType.IsScalar() && !COMPARISONS.has(token) && (rightType.IsVector() || rightType.IsMatrix());
        const rightScalar = rightType.IsScalar() && !COMPARISONS.has(token) && (leftType.IsVector() || leftType.IsMatrix());
        const leftText = leftScalar ? this._coerced(left, scalarOf(common)) : this._coerced(left, common);
        const rightText = rightScalar ? this._coerced(right, scalarOf(common)) : this._coerced(right, common);
        return `(${leftText} ${operator} ${rightText})`;
    }

    /**
     * A prefix expression.
     *
     * @param {import("../ASTNode/ASTNode.js").ASTNode} node The `NT_PREFIX_EXPRESSION`.
     * @returns {string} The expression.
     */
    _prefix(node)
    {
        const operand = node.GetChild(0);
        const type = typeOf(node);
        switch (node.GetToken().type)
        {
            case T.OP_DASH:
                return `(-${this._coerced(operand, type)})`;
            case T.OP_PLUS:
                return this._coerced(operand, type);
            case T.OP_BANG:
                return `(!${this._coerced(operand, withComponent(type.width > 1 ? shapeOf(type) : scalarOf(type), T.OP_BOOL))})`;
            case T.OP_TILDE:
                return `(~${this._coerced(operand, type)})`;
            default:
                throw new Error("CjsFxOutputWGSL: increment or decrement inside an expression is not supported");
        }
    }

    /**
     * A postfix expression: member, swizzle, index or method call. A member
     * of a constant buffer is read from its registers.
     *
     * @param {import("../ASTNode/ASTNode.js").ASTNode} node The `NT_POSTFIX_EXPRESSION`.
     * @returns {string} The expression.
     */
    _postfix(node)
    {
        const object = node.GetChild(0);
        const token = node.GetToken().type;
        const cbuffer = this._cbufferAccess(node);
        if (cbuffer !== null)
        {
            if (this._constantOffset !== null)
            {
                throw new Error("CjsFxOutputWGSL: texture offset must be constant; uniform reads are not supported yet");
            }
            return cbuffer;
        }
        switch (token)
        {
            case T.OP_ID:
            {
                const objectType = typeOf(object);
                const field = node.GetToken().stringValue.ToString();
                if (objectType.IsScalarOrVector() && !objectType.IsMatrix())
                {
                    const swizzle = field.split("").map(normaliseComponent).join("");
                    if (objectType.width === 1)
                    {
                        const scalar = this._expression(object);
                        return swizzle.length === 1 ? scalar : `vec${swizzle.length}<${CjsFxWgslTypes.wgslScalar(objectType.builtInType)}>(${scalar})`;
                    }
                    return `${this._expression(object)}.${swizzle}`;
                }
                if (objectType.IsMatrix())
                {
                    throw new Error(`CjsFxOutputWGSL: matrix member ${field} is not supported yet`);
                }
                return `${this._expression(object)}.${this._nameOf(node.GetSymbol())}`;
            }
            case T.OP_LEFT_BRACKET:
            {
                const index = node.GetChild(1);
                const indexType = typeOf(index);
                const integer = indexType.builtInType === T.OP_INT || indexType.builtInType === T.OP_UINT ? indexType : withComponent(indexType, T.OP_INT);
                return `${this._expression(object)}[${this._coerced(index, integer)}]`;
            }
            case T.OP_DOT:
                return this._method(object, node.GetChild(1), node);
            case T.OP_INC_OP:
            case T.OP_DEC_OP:
                throw new Error("CjsFxOutputWGSL: increment or decrement inside an expression is not supported");
            default:
                throw new Error(`CjsFxOutputWGSL: postfix ${node.GetToken().stringValue.ToString()} is not supported yet`);
        }
    }

    /**
     * A read of a constant-buffer member, `PerObjectVS.worldTransform` or
     * CollectGlobals' `Globals.x`, as its packed registers, or null when
     * `node` is not one.
     *
     * @param {import("../ASTNode/ASTNode.js").ASTNode} node A postfix expression.
     * @returns {string|null} The expression.
     */
    _cbufferAccess(node)
    {
        const path = [];
        let current = node;
        while (current.GetNodeType() === N.NT_POSTFIX_EXPRESSION && (current.GetToken().type === T.OP_ID || current.GetToken().type === T.OP_DOT || current.GetToken().type === T.OP_LEFT_BRACKET))
        {
            path.unshift(current);
            current = current.GetChild(0);
        }
        if (current.GetNodeType() !== N.NT_VAR_IDENTIFIER)
        {
            return null;
        }
        const root = current.GetSymbol();
        const rootType = root.type;
        if (!rootType.IsStruct() || !this._cbuffers.has(rootType.symbol))
        {
            return null;
        }
        const cbuffer = this._cbuffers.get(rootType.symbol);
        let layout = cbuffer.layout;
        let offset = 0;
        let type = null;
        let dynamicIndex = null;
        let consumed = 0;
        for (const step of path)
        {
            const token = step.GetToken().type;
            if (token === T.OP_LEFT_BRACKET)
            {
                if (type === null || type.arrayDimensions === 0)
                {
                    break;
                }
                const element = type.Copy();
                element.arrayDimensions = 0;
                const stride = CjsFxHlslPacking.place(element, 0).stride;
                const index = step.GetChild(1);
                const intType = withComponent(scalarOf(typeOf(index)), T.OP_INT);
                const indexText = this._coerced(index, intType);
                dynamicIndex = dynamicIndex === null ? `(${indexText}) * ${stride / CjsFxHlslPacking.registerBytes}` : `${dynamicIndex} + (${indexText}) * ${stride / CjsFxHlslPacking.registerBytes}`;
                type = element;
                consumed++;
                continue;
            }
            const memberSymbol = token === T.OP_DOT ? step.GetChild(1).GetSymbol() : step.GetSymbol();
            if (layout === null || !memberSymbol || !layout.members.has(memberSymbol))
            {
                break;
            }
            const member = layout.members.get(memberSymbol);
            offset += member.offset;
            type = member.type;
            layout = type.IsStruct() && type.arrayDimensions === 0 ? CjsFxHlslPacking.structLayout(type.symbol) : null;
            consumed++;
        }
        if (type === null)
        {
            throw new Error(`CjsFxOutputWGSL: constant buffer ${root.name.ToString()} is used whole, which WGSL registers cannot express`);
        }
        if (type.IsStruct() || type.arrayDimensions > 0)
        {
            throw new Error(`CjsFxOutputWGSL: a whole struct or array is read from constant buffer ${root.name.ToString()}, which is not supported yet`);
        }
        let text = this._readRegisters(cbuffer.name, offset, type, dynamicIndex);
        // Anything after the member (a swizzle or an index into a vector) applies to the value.
        for (let i = consumed; i < path.length; ++i)
        {
            const step = path[i];
            if (step.GetToken().type === T.OP_ID && type.IsScalarOrVector())
            {
                const swizzle = step.GetToken().stringValue.ToString().split("").map(normaliseComponent).join("");
                text = type.width === 1 ? (swizzle.length === 1 ? text : `vec${swizzle.length}<${CjsFxWgslTypes.wgslScalar(type.builtInType)}>(${text})`) : `${text}.${swizzle}`;
                type = typeOf(step);
                continue;
            }
            if (step.GetToken().type === T.OP_LEFT_BRACKET)
            {
                const index = step.GetChild(1);
                text = `${text}[${this._coerced(index, withComponent(scalarOf(typeOf(index)), T.OP_INT))}]`;
                type = typeOf(step);
                continue;
            }
            throw new Error(`CjsFxOutputWGSL: unsupported access after constant-buffer member in ${root.name.ToString()}`);
        }
        return text;
    }

    /**
     * Reads a value of `type` at a byte offset of a constant buffer
     * declared `array<vec4<f32>, N>`: vectors from register lanes,
     * matrices from consecutive registers, integers by bit cast.
     *
     * @param {string} name The buffer variable.
     * @param {number} offset The value's byte offset.
     * @param {Type} type Its type, not an array.
     * @param {string|null} dynamicIndex A register offset computed at run time, or null.
     * @returns {string} The expression.
     */
    _readRegisters(name, offset, type, dynamicIndex)
    {
        const register = Math.floor(offset / CjsFxHlslPacking.registerBytes);
        const lane = (offset % CjsFxHlslPacking.registerBytes) / 4;
        const at = r => (dynamicIndex === null ? `${name}[${register + r}]` : `${name}[${register + r} + ${dynamicIndex}]`);
        const scalar = CjsFxWgslTypes.wgslScalar(type.builtInType);
        const cast = (text, width) =>
        {
            if (scalar === "f32")
            {
                return text;
            }
            if (scalar === "bool")
            {
                return width === 1 ? `(bitcast<u32>(${text}) != 0u)` : `(bitcast<vec${width}<u32>>(${text}) != vec${width}<u32>(0u))`;
            }
            return width === 1 ? `bitcast<${scalar}>(${text})` : `bitcast<vec${width}<${scalar}>>(${text})`;
        };
        if (type.IsMatrix())
        {
            const columns = CjsFxHlslPacking.isRowMajor(type) ? type.width : type.height;
            const lanes = CjsFxHlslPacking.isRowMajor(type) ? type.height : type.width;
            const vectors = [];
            for (let c = 0; c < columns; ++c)
            {
                vectors.push(lanes === 4 ? at(c) : `${at(c)}.${"xyzw".slice(0, lanes)}`);
            }
            const stored = CjsFxHlslPacking.isRowMajor(type) ? `mat${type.width}x${type.height}<f32>` : `mat${type.height}x${type.width}<f32>`;
            const matrix = `${stored}(${vectors.join(", ")})`;
            return CjsFxHlslPacking.isRowMajor(type) ? `transpose(${matrix})` : matrix;
        }
        const components = "xyzw".slice(lane, lane + type.width);
        const vector = type.width === 4 ? at(0) : `${at(0)}.${components}`;
        return cast(vector, type.width);
    }

    /**
     * A method call on an object: texture sampling and loads, structured
     * buffer loads.
     *
     * @param {import("../ASTNode/ASTNode.js").ASTNode} object The object.
     * @param {import("../ASTNode/ASTNode.js").ASTNode} call The method's `NT_FUNCTION_CALL`.
     * @param {import("../ASTNode/ASTNode.js").ASTNode} node The postfix expression, typed with the result.
     * @returns {string} The expression.
     */
    _method(object, call, node)
    {
        const method = call.GetToken().stringValue.ToString();
        const objectType = typeOf(object);
        const target = this._expression(object);
        const args = call.GetChildren();
        if (objectType.IsTexture())
        {
            const float = new Type();
            float.FromTokenType(T.OP_FLOAT);
            const coordinate = arg => this._coerced(arg, withComponent(typeOf(arg), T.OP_FLOAT));
            const isArray = objectType.IsTextureArray();
            const coords = arg =>
            {
                const text = coordinate(arg);
                if (!isArray)
                {
                    return text;
                }
                const width = typeOf(arg).width;
                return `(${text}).${"xyzw".slice(0, width - 1)}, i32((${text}).${"xyzw"[width - 1]})`;
            };
            let sampled;
            const argumentCount = { Sample: 2, SampleLevel: 3, SampleBias: 3, SampleGrad: 4 }[method];
            const offset = argumentCount === undefined ? "" : this._sampleOffset(objectType, method, args, argumentCount);
            switch (method)
            {
                case "Sample":
                    sampled = `textureSample(${target}, ${this._expression(args[0])}, ${coords(args[1])}${offset})`;
                    break;
                case "SampleLevel":
                    sampled = `textureSampleLevel(${target}, ${this._expression(args[0])}, ${coords(args[1])}, ${this._coerced(args[2], float)}${offset})`;
                    break;
                case "SampleBias":
                    sampled = `textureSampleBias(${target}, ${this._expression(args[0])}, ${coords(args[1])}, ${this._coerced(args[2], float)}${offset})`;
                    break;
                case "SampleGrad":
                    sampled = `textureSampleGrad(${target}, ${this._expression(args[0])}, ${coords(args[1])}, ${coordinate(args[2])}, ${coordinate(args[3])}${offset})`;
                    break;
                case "Load":
                {
                    // HLSL's Load(int3(x, y, mip)) on a 2D texture; the offset
                    // overload has no textureLoad equivalent.
                    if (args.length !== 1 || isArray || objectType.builtInType === T.OP_TEXTURECUBE)
                    {
                        throw new Error(`CjsFxOutputWGSL: ${method} with these arguments is not supported yet`);
                    }
                    const location = this._coerced(args[0], withComponent(typeOf(args[0]), T.OP_INT));
                    sampled = `textureLoad(${target}, (${location}).xy, (${location}).z)`;
                    break;
                }
                default:
                    throw new Error(`CjsFxOutputWGSL: texture method ${method} is not supported yet`);
            }
            const resultType = typeOf(node);
            return resultType.width === 4 || resultType.width === 0 ? sampled : `${sampled}.${"xyzw".slice(0, resultType.width)}`;
        }
        throw new Error(`CjsFxOutputWGSL: method ${method} on ${objectType.ToString()} is not supported yet`);
    }

    /**
     * The optional Sample* offset, expanded as a WGSL const-expression.
     * WGSL separates an array layer from its spatial coordinates and has no
     * cube offset or HLSL clamp/status overloads.
     *
     * @param {Type} texture The sampled texture.
     * @param {string} method The HLSL method.
     * @param {import("../ASTNode/ASTNode.js").ASTNode[]} args Its arguments.
     * @param {number} count The argument count without an offset.
     * @returns {string} A comma and the offset, or an empty string.
     */
    _sampleOffset(texture, method, args, count)
    {
        if (args.length !== count && args.length !== count + 1)
        {
            throw new Error(`CjsFxOutputWGSL: ${method} with these arguments is not supported yet`);
        }
        if (args.length === count)
        {
            return "";
        }
        const width = texture.builtInType === T.OP_TEXTURE2D || texture.builtInType === T.OP_TEXTURE2DARRAY ? 2
            : texture.builtInType === T.OP_TEXTURE3D ? 3 : 0;
        const type = typeOf(args[count]);
        if (width === 0 || !type.IsVector() || type.width !== width)
        {
            throw new Error(`CjsFxOutputWGSL: ${method} offset for this texture or offset shape is not supported yet`);
        }
        this._constantOffset = new Set();
        try
        {
            return `, ${this._coerced(args[count], withComponent(type, T.OP_INT))}`;
        }
        finally
        {
            this._constantOffset = null;
        }
    }

    /**
     * A function call: a type constructor, an intrinsic, or a user function
     * with its arguments converted to the parameter types.
     *
     * @param {import("../ASTNode/ASTNode.js").ASTNode} node The `NT_FUNCTION_CALL`.
     * @returns {string} The expression.
     */
    _call(node)
    {
        const symbol = node.GetSymbol();
        const args = node.GetChildren();
        if (symbol === null)
        {
            // A type constructor: float4(a, b), float3x3(...).
            const type = typeOf(node);
            const component = scalarOf(type);
            const converted = args.map(arg =>
            {
                const argType = typeOf(arg);
                return this._coerced(arg, argType.IsScalarOrVector() ? withComponent(argType, type.builtInType) : argType);
            });
            if (type.IsScalar())
            {
                return this._coerced(args[0], component);
            }
            return `${CjsFxWgslTypes.wgslType(type, s => this._nameOf(s))}(${converted.join(", ")})`;
        }
        if (symbol.definition === null || symbol.intrinsicType)
        {
            return this._intrinsic(symbol.name.ToString(), node, args);
        }
        const header = symbol.definition.GetNodeType() === N.NT_FUNCTION_DEFINITION ? symbol.definition.GetChild(0) : symbol.definition;
        const parts = [];
        for (let i = 0; i < args.length; ++i)
        {
            const param = header.GetChildOrNull(i);
            if (param && this._isModuleScope(param.GetSymbol()))
            {
                continue;
            }
            if (param && isReferenceParam(param))
            {
                parts.push(`&${this._lvalue(args[i])}`);
                continue;
            }
            parts.push(param ? this._coerced(args[i], param.GetSymbol().type) : this._expression(args[i]));
        }
        return `${this._nameOf(symbol)}(${parts.join(", ")})`;
    }

    /**
     * An HLSL intrinsic call.
     *
     * @param {string} name The intrinsic.
     * @param {import("../ASTNode/ASTNode.js").ASTNode} node The call, typed with the result.
     * @param {import("../ASTNode/ASTNode.js").ASTNode[]} args The arguments.
     * @returns {string} The expression.
     */
    _intrinsic(name, node, args)
    {
        const type = typeOf(node);
        const sameAs = arg => this._coerced(arg, type);
        switch (name)
        {
            case "mul":
            {
                const left = typeOf(args[0]);
                const right = typeOf(args[1]);
                // HLSL's vector/vector overload is a dot product. Other
                // shapes retain WGSL multiplication with HLSL conversions.
                const component = type.builtInType;
                const a = this._coerced(args[0], withComponent(left, component));
                const rightShape = left.IsVector() && right.IsVector() ? left : right;
                const b = this._coerced(args[1], withComponent(rightShape, component));
                return left.IsVector() && right.IsVector() ? `dot(${a}, ${b})` : `(${a} * ${b})`;
            }
            case "mad":
                return `(${sameAs(args[0])} * ${sameAs(args[1])} + ${sameAs(args[2])})`;
            case "rcp":
                return `(1.0 / ${sameAs(args[0])})`;
            case "fmod":
                return `(${sameAs(args[0])} % ${sameAs(args[1])})`;
            case "log10":
                return `(log(${sameAs(args[0])}) * 0.43429448190325176)`;
            case "any":
            case "all":
            {
                const argType = typeOf(args[0]);
                const bools = withComponent(argType, T.OP_BOOL);
                return `${name}(${this._coerced(args[0], bools)})`;
            }
            case "asfloat":
            case "asint":
            case "asuint":
            {
                const target = name === "asfloat" ? "f32" : name === "asint" ? "i32" : "u32";
                const width = typeOf(args[0]).width;
                return `bitcast<${width === 1 ? target : `vec${width}<${target}>`}>(${this._expression(args[0])})`;
            }
            case "length":
            case "distance":
            case "dot":
            case "cross":
            case "normalize":
            case "reflect":
            case "refract":
            case "faceforward":
            {
                // Arguments take the argument shape, not the (scalar) result's.
                const shape = withComponent(typeOf(args[0]), T.OP_FLOAT);
                const converted = args.map((arg, i) => this._coerced(arg, name === "refract" && i === 2 ? scalarOf(shape) : shape));
                return `${INTRINSICS.get(name)}(${converted.join(", ")})`;
            }
            case "sign":
            {
                // HLSL's sign returns int; WGSL's returns the argument's type.
                const argType = typeOf(args[0]);
                return this._convert(`sign(${this._expression(args[0])})`, argType, type);
            }
            default:
                break;
        }
        const wgsl = INTRINSICS.get(name);
        if (wgsl === undefined)
        {
            throw new Error(`CjsFxOutputWGSL: intrinsic ${name} is not supported yet`);
        }
        return `${wgsl}(${args.map(sameAs).join(", ")})`;
    }

    // ---------------------------------------------------------------------
    // Names
    // ---------------------------------------------------------------------

    /**
     * The WGSL name of a symbol.
     *
     * @param {object} symbol The symbol.
     * @returns {string} The name.
     */
    _nameOf(symbol)
    {
        // The runtime finds a pixel stage's colour targets in a struct named
        // FragmentOutput (CjsWebgpuShaderAL GetFragmentOutputs).
        if (this._stage === "fragment" && symbol === this._entry.GetChild(0).GetSymbol().type.symbol && symbol !== null)
        {
            return "FragmentOutput";
        }
        return CjsFxWgslTypes.wgslName(symbol.name.ToString());
    }
}

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

/**
 * The symbols a statement tree assigns: assignment targets, increments and
 * decrements, and arguments passed to `out`/`inout` parameters, each by the
 * variable at the root of the target (`v.x = 1` assigns `v`).
 *
 * @param {import("../ASTNode/ASTNode.js").ASTNode|null} node The tree.
 * @param {Set<object>} [out] Receives the symbols.
 * @returns {Set<object>} The symbols.
 */
function assignedSymbols(node, out = new Set())
{
    if (node === null)
    {
        return out;
    }
    const root = target =>
    {
        let current = target;
        while (current !== null && (current.GetNodeType() === N.NT_POSTFIX_EXPRESSION || (current.GetNodeType() === N.NT_EXPRESSION && current.GetToken() && current.GetToken().type === T.OP_LEFT_PAREN)))
        {
            current = current.GetChild(0);
        }
        if (current !== null && current.GetNodeType() === N.NT_VAR_IDENTIFIER && current.GetSymbol())
        {
            out.add(current.GetSymbol());
        }
    };
    const type = node.GetNodeType();
    const token = node.GetToken();
    if (type === N.NT_EXPRESSION && token && ASSIGNMENT.has(token.type))
    {
        root(node.GetChild(0));
    }
    if ((type === N.NT_POSTFIX_EXPRESSION || type === N.NT_PREFIX_EXPRESSION) && token && (token.type === T.OP_INC_OP || token.type === T.OP_DEC_OP))
    {
        root(node.GetChild(0));
    }
    if (type === N.NT_FUNCTION_CALL && node.GetSymbol() && node.GetSymbol().definition)
    {
        const definition = node.GetSymbol().definition;
        const header = definition.GetNodeType() === N.NT_FUNCTION_DEFINITION ? definition.GetChild(0) : definition;
        node.GetChildren().forEach((argument, i) =>
        {
            const param = header.GetChildOrNull(i);
            if (param && isReferenceParam(param))
            {
                root(argument);
            }
        });
    }
    for (const child of node.GetChildren())
    {
        assignedSymbols(child, out);
    }
    return out;
}

/**
 * A block with lines inserted after its opening brace.
 *
 * @param {string} block The block, braces included.
 * @param {string[]} lines The lines, indented.
 * @returns {string} The block.
 */
function withLeadingLines(block, lines)
{
    return lines.length === 0 ? block : block.replace(/^\{\n/u, `{\n${lines.map(line => `${line}\n`).join("")}`);
}

/**
 * The register of a symbol, or null.
 *
 * @param {object} symbol The symbol.
 * @returns {{ registerType: string, registerNumber: number }|null} The first register specifier.
 */
function registerOf(symbol)
{
    for (const [, reg] of symbol.registerSpecifier)
    {
        return reg;
    }
    return null;
}

/**
 * The storage element stride of a buffer, or null without an element type.
 * HLSL packs structured-buffer elements tightly (4-byte members, no register
 * padding); WGSL's storage layout aligns `vec3` and `vec4` to 16 bytes, so
 * an element is accepted only where both layouts put every member at the
 * same offset.
 *
 * @param {Type} type A buffer type.
 * @returns {number|null} The stride in bytes.
 */
function structuredStride(type)
{
    const element = type.templateParameter;
    if (!element)
    {
        return null;
    }
    const tight = tightLayout(element);
    const wgsl = storageLayout(element);
    const stride = Math.ceil(wgsl.size / wgsl.align) * wgsl.align;
    if (tight.size !== stride || tight.offsets.some((offset, i) => offset !== wgsl.offsets[i]))
    {
        throw new Error(`CjsFxOutputWGSL: structured buffer element ${element.ToString()} lays out differently in HLSL and WGSL storage (offsets ${tight.offsets} against ${wgsl.offsets}), which is not supported yet`);
    }
    return tight.size;
}

/**
 * HLSL's tight structured-buffer layout of a type.
 *
 * @param {Type} type The type.
 * @returns {{ size: number, offsets: number[] }} Its size and, for a struct, each member's offset.
 */
function tightLayout(type)
{
    let size;
    const offsets = [];
    if (type.IsStruct())
    {
        size = 0;
        for (const memberNode of type.symbol.definition.GetChildren())
        {
            for (const nameNode of memberNode.GetChildren())
            {
                offsets.push(size);
                size += tightLayout(nameNode.GetSymbol().type).size;
            }
        }
    }
    else
    {
        size = type.width * Math.max(1, type.height) * 4;
    }
    for (let i = 0; i < type.arrayDimensions; ++i)
    {
        size *= type.arraySizes[i];
    }
    return { size, offsets };
}

/**
 * WGSL's storage-buffer layout of a type (WGSL spec, memory layout).
 *
 * @param {Type} type The type.
 * @returns {{ size: number, align: number, offsets: number[] }} Its size, alignment and member offsets.
 */
function storageLayout(type)
{
    const roundUp = (value, align) => Math.ceil(value / align) * align;
    let size;
    let align;
    const offsets = [];
    if (type.IsStruct())
    {
        size = 0;
        align = 4;
        for (const memberNode of type.symbol.definition.GetChildren())
        {
            for (const nameNode of memberNode.GetChildren())
            {
                const member = storageLayout(nameNode.GetSymbol().type);
                size = roundUp(size, member.align);
                offsets.push(size);
                size += member.size;
                align = Math.max(align, member.align);
            }
        }
        size = roundUp(size, align);
    }
    else if (type.IsMatrix())
    {
        // matCxR: C columns of vecR, R = `width` rows.
        const columnAlign = type.width === 2 ? 8 : 16;
        align = columnAlign;
        size = type.height * roundUp(type.width * 4, columnAlign);
    }
    else
    {
        align = type.width === 1 ? 4 : type.width === 2 ? 8 : 16;
        size = type.width * 4;
    }
    for (let i = 0; i < type.arrayDimensions; ++i)
    {
        size = roundUp(size, align) * type.arraySizes[i];
    }
    return { size, align, offsets };
}

/**
 * Whether a parameter is `out` or `inout`, passed in WGSL as a pointer.
 *
 * @param {import("../ASTNode/ASTNode.js").ASTNode} param The `NT_FUNCTION_PARAMETER`.
 * @returns {boolean} True for `out` and `inout`.
 */
function isReferenceParam(param)
{
    const token = param.GetToken();
    return token !== null && (token.type === T.OP_OUT || token.type === T.OP_INOUT);
}

const BASE_VERTEX = MetalSystemSemanticsType.Enum.base_vertex;
const BASE_INSTANCE = MetalSystemSemanticsType.Enum.base_instance;

/**
 * The WGSL attribute of a Metal system register (MetalSystemSemanticsType):
 * a builtin, or for a render target `@location(N)`.
 *
 * Divergence (operator decision): `vertex_index` and
 * `instance_index` include the draw's base vertex and instance, where HLSL's
 * SV_VertexID and SV_InstanceID start at 0; WebGPU has no builtin to
 * subtract.
 *
 * @param {number} registerNumber The system semantic.
 * @returns {string} The attribute.
 */
function systemAttribute(registerNumber)
{
    const E = MetalSystemSemanticsType.Enum;
    if (registerNumber >= E.color_0 && registerNumber <= E.color_7)
    {
        return `@location(${registerNumber - E.color_0})`;
    }
    switch (registerNumber)
    {
        case E.position:
            return "@builtin(position)";
        case E.position_invariant:
            return "@builtin(position) @invariant";
        case E.front_facing:
            return "@builtin(front_facing)";
        case E.vertex_id:
            return "@builtin(vertex_index)";
        case E.instance_id:
            return "@builtin(instance_index)";
        case E.depth:
            return "@builtin(frag_depth)";
        case E.sample_id:
            return "@builtin(sample_index)";
        case E.thread_position_in_grid:
            return "@builtin(global_invocation_id)";
        case E.thread_position_in_threadgroup:
            return "@builtin(local_invocation_id)";
        case E.thread_index_in_threadgroup:
            return "@builtin(local_invocation_index)";
        case E.threadgroup_position_in_grid:
            return "@builtin(workgroup_id)";
        case E.threads_per_grid:
            // WGSL has only the workgroup count, not the thread count.
            break;
        default:
            break;
    }
    throw new Error(`CjsFxOutputWGSL: system semantic ${MetalSystemSemanticsType.getString(registerNumber)} has no WGSL attribute`);
}

/**
 * The type a node evaluates to; a threaded parameter's node carries none,
 * so its symbol's is used.
 *
 * @param {import("../ASTNode/ASTNode.js").ASTNode} node The expression.
 * @returns {Type} The type.
 */
function typeOf(node)
{
    const type = node.GetType();
    if (type.builtInType === 0 && type.symbol === null && node.GetSymbol())
    {
        return node.GetSymbol().type;
    }
    return type;
}

/**
 * A type's scalar.
 *
 * @param {Type} type The type.
 * @returns {Type} A scalar of its component type.
 */
function scalarOf(type)
{
    const scalar = new Type();
    scalar.FromTokenType(type.builtInType);
    return scalar;
}

/**
 * A type's vector shape, without array or matrix.
 *
 * @param {Type} type The type.
 * @returns {Type} A vector of its width and component type.
 */
function shapeOf(type)
{
    const shape = scalarOf(type);
    shape.width = type.width;
    return shape;
}

/**
 * A type with another component type.
 *
 * @param {Type} type The type.
 * @param {number} builtInType The component token.
 * @returns {Type} The changed copy.
 */
function withComponent(type, builtInType)
{
    const copy = type.Copy();
    copy.builtInType = builtInType;
    return copy;
}

/**
 * The swizzle a target writes, or null when it is not a swizzle.
 *
 * @param {import("../ASTNode/ASTNode.js").ASTNode} node The target.
 * @returns {string|null} The components.
 */
function swizzleOf(node)
{
    if (node.GetNodeType() !== N.NT_POSTFIX_EXPRESSION || node.GetToken().type !== T.OP_ID)
    {
        return null;
    }
    const objectType = typeOf(node.GetChild(0));
    if (!objectType.IsScalarOrVector() || objectType.IsMatrix() || objectType.width === 1)
    {
        return null;
    }
    return node.GetToken().stringValue.ToString();
}

/**
 * An HLSL swizzle letter as WGSL's `xyzw`; WGSL allows `rgba` too, but not
 * mixed sets, so one set is used throughout.
 *
 * @param {string} letter The letter.
 * @returns {string} Its `xyzw` letter.
 */
function normaliseComponent(letter)
{
    const at = "rgba".indexOf(letter);
    return at >= 0 ? "xyzw"[at] : letter;
}

/**
 * A literal in WGSL form: no `h`/`l` suffixes, no octal.
 *
 * @param {import("../ASTNode/ASTNode.js").ASTNode} node The `NT_CONSTANT`.
 * @returns {string} The literal.
 */
function literal(node)
{
    const token = node.GetToken();
    const text = token.stringValue.ToString();
    switch (token.type)
    {
        case T.OP_FLOAT_CONST:
        {
            const plain = text.replace(/[fFhHlL]$/u, "");
            return /[.eE]/u.test(plain) ? plain : `${plain}.0`;
        }
        case T.OP_INT_CONST:
        {
            const unsigned = /[uU]/u.test(text);
            const value = ParseNumber(token.stringValue) >>> 0;
            return unsigned ? `${value}u` : String(ParseNumber(token.stringValue) | 0);
        }
        case T.OP_BOOL_CONST:
            return text;
        default:
            throw new Error(`CjsFxOutputWGSL: literal ${text} is not supported`);
    }
}

/**
 * A node's type name, for messages.
 *
 * @param {import("../ASTNode/ASTNode.js").ASTNode} node The node.
 * @returns {string} The name.
 */
function nodeName(node)
{
    for (const [name, value] of Object.entries(N))
    {
        if (value === node.GetNodeType())
        {
            return name;
        }
    }
    return String(node.GetNodeType());
}
