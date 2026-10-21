import { CjsSchema, blue, meta } from "#schema";
// Source: trinity/shadercompiler/SymbolTable.h
// Source: trinity/shadercompiler/SymbolTable.cpp:91-339

import { HLSLParserTokens } from "../hlslParserTokens.js";
import { Symbol } from "./Symbol.js";
import { ASTNode } from "../ASTNode/ASTNode.js";
import { SymbolTable } from "./SymbolTable.js";

const { OP_OUT, OP_INOUT } = HLSLParserTokens;
const { NT_FUNCTION_HEADER, NT_FUNCTION_DEFINITION } = ASTNode.ASTNodeType;

/**
 * One block's symbols: Carbon's `ScopeSymbolTable`. Scopes form a tree; a
 * lookup walks to the root.
 */
export class ScopeSymbolTable
{
    _parent = null;

    /** @type {Symbol[]} */
    _symbols = [];

    /** @type {ScopeSymbolTable[]} */
    _subBlocks = [];

    /**
     * @param {ScopeSymbolTable|null} parent The enclosing scope.
     */
    constructor(parent)
    {
        this._parent = parent;
    }

    /**
     * Carbon's `ScopeSymbolTable::Lookup`: the first symbol of the name, here
     * or in an enclosing scope.
     *
     * @param {import("../InlineString.js").InlineString} name The name.
     * @returns {Symbol|null} The symbol.
     */
    Lookup(name)
    {
        const text = name.ToString();
        for (let scope = this; scope !== null; scope = scope._parent)
        {
            const found = scope._symbols.find(symbol => symbol.name.ToString() === text);
            if (found)
            {
                return found;
            }
        }
        return null;
    }

    /**
     * Carbon's `ScopeSymbolTable::LookupFunctionDeclaration`: a forward
     * declaration (`NT_FUNCTION_HEADER`) with the same return and parameter
     * types as `header`.
     *
     * @param {import("../InlineString.js").InlineString} name The function name.
     * @param {import("../ASTNode/ASTNode.js").ASTNode} header The header being declared.
     * @returns {Symbol|null} The matching declaration.
     */
    LookupFunctionDeclaration(name, header)
    {
        const overrides = [];
        for (let scope = this; scope !== null; scope = scope._parent)
        {
            for (const symbol of scope._symbols)
            {
                if (symbol.name.Equals(name) && symbol.definition && symbol.definition.GetNodeType() === NT_FUNCTION_HEADER)
                {
                    overrides.push(symbol);
                }
            }
        }
        for (const symbol of overrides)
        {
            const node = symbol.definition;
            const parameterCount = node.GetChildrenCount();
            const argumentCount = header.GetChildrenCount();
            if (argumentCount !== parameterCount)
            {
                continue;
            }
            if (!node.GetType().Equals(header.GetType()))
            {
                continue;
            }
            let match = true;
            for (let i = 0; i < argumentCount; ++i)
            {
                if (!node.GetChild(i).GetType().Equals(header.GetChild(i).GetType()))
                {
                    match = false;
                    break;
                }
            }
            if (match)
            {
                return symbol;
            }
        }
        return null;
    }

    /**
     * Carbon's `ScopeSymbolTable::LookupFunction`: overload resolution.
     *
     * Every symbol of the name is a candidate. A single candidate wins outright.
     * Otherwise each candidate scores the implicit conversions its parameters
     * need; the lowest score wins, and a tie between best candidates is no
     * match. With no match, `diagnosticMessage.value` lists the candidates.
     *
     * @param {import("../InlineString.js").InlineString} name The function name.
     * @param {import("../ASTNode/ASTNode.js").ASTNode} callNode The `NT_FUNCTION_CALL` node.
     * @param {{ value: string }} diagnosticMessage Carbon's `std::string&` out-parameter.
     * @returns {Symbol|null} The chosen overload.
     */
    LookupFunction(name, callNode, diagnosticMessage)
    {
        diagnosticMessage.value = "";

        const overrides = [];
        for (let scope = this; scope !== null; scope = scope._parent)
        {
            for (const symbol of scope._symbols)
            {
                if (symbol.name.Equals(name))
                {
                    overrides.push({ symbol, score: 100000 });
                }
            }
        }
        if (overrides.length === 0)
        {
            return null;
        }
        // Quirk (SymbolTable.cpp:227-230; Carbon known defect CE-85): a lone
        // candidate is returned without checking the arguments, so
        // `float g(float3 a)` accepts `g(1.0, 2.0)` without an error.
        if (overrides.length === 1)
        {
            return overrides[0].symbol;
        }

        let bestOverride = null;
        let bestScore = 0;
        for (const candidate of overrides)
        {
            let node = candidate.symbol.definition;
            if (node === null)
            {
                continue;
            }
            if (node.GetNodeType() === NT_FUNCTION_DEFINITION)
            {
                node = node.GetChildOrNull(0);
            }
            if (node === null)
            {
                continue;
            }
            const parameterCount = node.GetChildrenCount();
            const argumentCount = callNode.GetChildrenCount();
            if (argumentCount > parameterCount)
            {
                continue;
            }
            if (argumentCount < parameterCount)
            {
                // Check if next parameter after callNode->GetChildrenCount()
                // has default value.
                const nextParameter = node.GetChild(argumentCount);
                if (nextParameter === null)
                {
                    continue;
                }
                if (nextParameter.GetChildOrNull(1) === null)
                {
                    continue;
                }
            }
            const casts = { value: 0 };
            let match = true;
            for (let i = 0; i < argumentCount; ++i)
            {
                if (!matchParameter(node.GetChild(i), callNode.GetChild(i), casts))
                {
                    casts.value = 100000;
                    match = false;
                    break;
                }
            }
            candidate.score = casts.value;
            if (match && (bestOverride === null || candidate.score < bestScore))
            {
                bestOverride = candidate.symbol;
                bestScore = candidate.score;
            }
        }
        if (bestOverride)
        {
            for (const candidate of overrides)
            {
                if (candidate.symbol !== bestOverride && candidate.score === bestScore)
                {
                    return null;
                }
            }
        }
        else
        {
            let s = `\n  called with ${name.ToString()}(`;
            for (let i = 0; i < callNode.GetChildrenCount(); ++i)
            {
                if (i)
                {
                    s += ", ";
                }
                s += callNode.GetChild(i).GetType().ToString();
            }
            s += ")\n  possible overrides:\n";
            // Bug (SymbolTable.cpp:312-319; Carbon known defect CE-81): an
            // intrinsic has no definition, which the scoring loop above skips
            // but this one dereferences, so a failed lookup among candidates
            // that include an intrinsic crashes Carbon. Here it throws a
            // TypeError. Every `InstanceIndex()` call reaches it, since CE-64
            // registers two intrinsics of that name.
            for (const candidate of overrides)
            {
                let node = candidate.symbol.definition;
                if (node.GetNodeType() === NT_FUNCTION_DEFINITION)
                {
                    node = node.GetChildOrNull(0);
                }
                s += `    ${node.GetLocation().fileName.ToString()}(${node.GetLocation().lineNumber}): ${node.GetType().ToString()} ${name.ToString()}(`;
                for (let i = 0; i < node.GetChildrenCount(); ++i)
                {
                    if (i)
                    {
                        s += ", ";
                    }
                    s += node.GetChild(i).GetType().ToString();
                }
                s += ")\n";
            }
            diagnosticMessage.value = s;
        }
        return bestOverride;
    }

    /**
     * Carbon's `ScopeSymbolTable::AddSymbol( const InlineString&, OverrideBehavior )`.
     *
     * @param {import("../InlineString.js").InlineString} name The name.
     * @param {number} overrideBehavior An `OverrideBehavior` value.
     * @returns {Symbol|null} The new symbol, or null when the name exists here and overrides are not allowed.
     */
    AddSymbol(name, overrideBehavior)
    {
        if (overrideBehavior === SymbolTable.OverrideBehavior.DISALOW_OVERRIDES)
        {
            if (this._symbols.some(symbol => symbol.name.Equals(name)))
            {
                return null;
            }
        }
        const newSymbol = new Symbol();
        newSymbol.name = name.Copy();
        this._symbols.push(newSymbol);
        return newSymbol;
    }

    /**
     * Carbon's `ScopeSymbolTable::AddSymbol( Symbol*, OverrideBehavior )`:
     * adds a symbol the grammar already built.
     *
     * @param {Symbol} symbol The symbol.
     * @param {number} overrideBehavior An `OverrideBehavior` value.
     * @returns {Symbol|null} The symbol, or null when its name exists here and overrides are not allowed.
     */
    AddSymbol__Symbol(symbol, overrideBehavior)
    {
        if (overrideBehavior === SymbolTable.OverrideBehavior.DISALOW_OVERRIDES)
        {
            if (this._symbols.some(existing => existing.name.Equals(symbol.name)))
            {
                return null;
            }
        }
        this._symbols.push(symbol);
        return symbol;
    }

    /**
     * Carbon's `ScopeSymbolTable::AddScope`.
     *
     * @returns {ScopeSymbolTable} A new child scope.
     */
    AddScope()
    {
        const subBlock = new ScopeSymbolTable(this);
        this._subBlocks.push(subBlock);
        return subBlock;
    }

    /**
     * Carbon's `ScopeSymbolTable::GetParent`.
     *
     * @returns {ScopeSymbolTable|null} The enclosing scope.
     */
    GetParent()
    {
        return this._parent;
    }

    /**
     * Carbon's `ScopeSymbolTable::ResetUsedFlag`: clears `used` here and below.
     */
    ResetUsedFlag()
    {
        for (const symbol of this._symbols)
        {
            symbol.used = false;
        }
        for (const subBlock of this._subBlocks)
        {
            subBlock.ResetUsedFlag();
        }
    }
}

/**
 * Carbon's file-local `MatchParameter`.
 *
 * @param {import("../ASTNode/ASTNode.js").ASTNode} parameter The `NT_FUNCTION_PARAMETER` node.
 * @param {import("../ASTNode/ASTNode.js").ASTNode} argument The argument expression.
 * @param {{ value: number }} casts Conversion count.
 * @returns {boolean} Whether the argument fits the parameter.
 */
function matchParameter(parameter, argument, casts)
{
    const argumentType = argument.GetType().Copy();
    const token = parameter.GetToken();
    if (token && token.type === OP_OUT)
    {
        return parameter.GetType().CanImplicitCast(argumentType, casts);
    }
    else if (token && token.type === OP_INOUT)
    {
        const tmp = { value: 0 };
        return parameter.GetType().CanImplicitCast(argumentType, casts) &&
            parameter.GetType().CanImplicitCast(parameter.GetType(), tmp);
    }
    return argumentType.CanImplicitCast(parameter.GetType(), casts);
}

CjsSchema.decorateMethod(ScopeSymbolTable, "Lookup", blue.method);
CjsSchema.decorateMethod(ScopeSymbolTable, "LookupFunctionDeclaration", blue.method);
CjsSchema.decorateMethod(ScopeSymbolTable, "LookupFunction", blue.method);
CjsSchema.decorateMethod(ScopeSymbolTable, "AddSymbol", blue.method);
CjsSchema.decorateMethod(ScopeSymbolTable, "AddSymbol__Symbol", meta.renamed("AddSymbol"));
CjsSchema.decorateMethod(ScopeSymbolTable, "AddScope", blue.method);
CjsSchema.decorateMethod(ScopeSymbolTable, "GetParent", blue.method);
CjsSchema.decorateMethod(ScopeSymbolTable, "ResetUsedFlag", blue.method);
CjsSchema.meta.carbon("ScopeSymbolTable")(ScopeSymbolTable);
