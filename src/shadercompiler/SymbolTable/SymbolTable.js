import { CjsSchema, blue, meta } from "#schema";
// Source: trinity/shadercompiler/SymbolTable.h
// Source: trinity/shadercompiler/SymbolTable.cpp:342-469

import { InlineString } from "../InlineString.js";
import { ScopeSymbolTable } from "./ScopeSymbolTable.js";

/**
 * The compiler's symbol table: Carbon's `SymbolTable`.
 *
 * The root scope holds the intrinsics, which `ParserState` adds before
 * parsing; parsing enters one more scope, so the shader's own globals live in
 * the root's first child ({@link SymbolTable#LookupGlobal}). Constant and
 * texture buffer names are kept apart in their own scope.
 */
export class SymbolTable
{
    _current = null;

    _bufferSymbols = new ScopeSymbolTable(null);

    _root = new ScopeSymbolTable(null);

    /** Starts name lookup in the root scope. */
    constructor()
    {
        this._current = this._root;
    }

    /**
     * Carbon's `SymbolTable::Lookup`, from the current scope outwards.
     *
     * @param {InlineString} name The name.
     * @returns {import("./Symbol.js").Symbol|null} The symbol.
     */
    Lookup(name)
    {
        return this._current.Lookup(name);
    }

    /**
     * Carbon's `SymbolTable::LookupFunction`.
     *
     * @param {InlineString} name The function name.
     * @param {import("../ASTNode/ASTNode.js").ASTNode} callNode The call.
     * @param {{ value: string }} diagnosticMessage Filled with the candidates when nothing matches.
     * @returns {import("./Symbol.js").Symbol|null} The chosen overload.
     */
    LookupFunction(name, callNode, diagnosticMessage)
    {
        return this._current.LookupFunction(name, callNode, diagnosticMessage);
    }

    /**
     * Carbon's `SymbolTable::LookupFunctionDeclaration`.
     *
     * @param {InlineString} name The function name.
     * @param {import("../ASTNode/ASTNode.js").ASTNode} header The header being declared.
     * @returns {import("./Symbol.js").Symbol|null} The matching forward declaration.
     */
    LookupFunctionDeclaration(name, header)
    {
        return this._current.LookupFunctionDeclaration(name, header);
    }

    /**
     * Carbon's `SymbolTable::LookupType`: a symbol that names a type.
     *
     * @param {InlineString} name The name.
     * @returns {import("./Symbol.js").Symbol|null} The type symbol.
     */
    LookupType(name)
    {
        const symbol = this._current.Lookup(name);
        if (!symbol || !symbol.isTypeName)
        {
            return null;
        }
        return symbol;
    }

    /**
     * Carbon's `SymbolTable::LookupBuffer`.
     *
     * @param {InlineString} name The buffer name.
     * @returns {import("./Symbol.js").Symbol|null} The buffer symbol.
     */
    LookupBuffer(name)
    {
        return this._bufferSymbols.Lookup(name);
    }

    /**
     * Carbon's `SymbolTable::AddSymbol( const InlineString&, OverrideBehavior )`.
     *
     * With `ALLOW_OVERRIDES` the symbol goes into the parent scope: a function
     * declaration is reduced after its parameter scope was entered (Carbon:
     * "TODO: ugly, fix me").
     *
     * @param {InlineString} name The name.
     * @param {number} [overrideBehavior=OverrideBehavior.DISALOW_OVERRIDES] An `OverrideBehavior` value.
     * @returns {import("./Symbol.js").Symbol|null} The new symbol, or null on a redefinition.
     */
    AddSymbol(name, overrideBehavior = SymbolTable.OverrideBehavior.DISALOW_OVERRIDES)
    {
        if (overrideBehavior === SymbolTable.OverrideBehavior.ALLOW_OVERRIDES)
        {
            if (this._current.GetParent())
            {
                return this._current.GetParent().AddSymbol(name, overrideBehavior);
            }
        }
        return this._current.AddSymbol(name, overrideBehavior);
    }

    /**
     * Carbon's `SymbolTable::AddTypeSymbol`.
     *
     * @param {InlineString} name The type name.
     * @param {number} [overrideBehavior=OverrideBehavior.DISALOW_OVERRIDES] An `OverrideBehavior` value.
     * @returns {import("./Symbol.js").Symbol|null} The new type symbol.
     */
    AddTypeSymbol(name, overrideBehavior = SymbolTable.OverrideBehavior.DISALOW_OVERRIDES)
    {
        const symbol = this.AddSymbol(name, overrideBehavior);
        if (symbol)
        {
            symbol.isTypeName = true;
        }
        return symbol;
    }

    /**
     * Carbon's `SymbolTable::AddSymbol( Symbol*, OverrideBehavior )`. Carbon
     * deletes a rejected symbol; here it is simply dropped.
     *
     * @param {import("./Symbol.js").Symbol} symbol The symbol.
     * @param {number} [overrideBehavior=OverrideBehavior.DISALOW_OVERRIDES] An `OverrideBehavior` value.
     * @returns {import("./Symbol.js").Symbol|null} The symbol, or null on a redefinition.
     */
    AddSymbol__Symbol(symbol, overrideBehavior = SymbolTable.OverrideBehavior.DISALOW_OVERRIDES)
    {
        return this._current.AddSymbol__Symbol(symbol, overrideBehavior);
    }

    /**
     * Carbon's `SymbolTable::AddBufferSymbol`.
     *
     * @param {InlineString} name The buffer name.
     * @returns {import("./Symbol.js").Symbol} The new buffer symbol.
     */
    AddBufferSymbol(name)
    {
        return this._bufferSymbols.AddSymbol(name, SymbolTable.OverrideBehavior.ALLOW_OVERRIDES);
    }

    /**
     * Carbon's `SymbolTable::EnterScope`.
     */
    EnterScope()
    {
        this._current = this._current.AddScope();
    }

    /**
     * Carbon's `SymbolTable::LeaveScope`.
     */
    LeaveScope()
    {
        this._current = this._current.GetParent();
    }

    /**
     * Carbon's `SymbolTable::GetCurrentScope`.
     *
     * @returns {ScopeSymbolTable} The current scope.
     */
    GetCurrentScope()
    {
        return this._current;
    }

    /**
     * Carbon's `SymbolTable::ResetUsedFlag`.
     */
    ResetUsedFlag()
    {
        this._root.ResetUsedFlag();
    }

    /**
     * Carbon's `SymbolTable::LookupGlobal`: a symbol declared at the shader's
     * global scope, the root's first child.
     *
     * @param {string} string The name.
     * @returns {import("./Symbol.js").Symbol|null} The symbol.
     */
    LookupGlobal(string)
    {
        if (this._root._subBlocks.length === 0)
        {
            return null;
        }
        return this._root._subBlocks[0]._symbols.find(symbol => symbol.name.Equals__Chars(string)) ?? null;
    }

    /**
     * Carbon's `SymbolTable::IsGlobal`.
     *
     * @param {import("./Symbol.js").Symbol} symbol The symbol.
     * @returns {boolean} Whether it is declared at the shader's global scope.
     */
    IsGlobal(symbol)
    {
        if (this._root._subBlocks.length === 0)
        {
            return false;
        }
        return this._root._subBlocks[0]._symbols.includes(symbol);
    }

    // Source: trinity/shadercompiler/SymbolTable.h

    /**
     * Carbon's `OverrideBehavior`. `DISALOW_OVERRIDES` keeps Carbon's spelling.
     */
    static OverrideBehavior = Object.freeze({
        DISALOW_OVERRIDES: 0,
        ALLOW_OVERRIDES: 1
    });
}

CjsSchema.blue.define(SymbolTable, {
    className: "SymbolTable",
    methods: {
        Lookup: [blue.method],
        LookupFunction: [blue.method],
        LookupFunctionDeclaration: [blue.method],
        LookupType: [blue.method],
        LookupBuffer: [blue.method],
        AddSymbol: [blue.method],
        AddTypeSymbol: [blue.method],
        AddSymbol__Symbol: [meta.renamed("AddSymbol")],
        AddBufferSymbol: [blue.method],
        EnterScope: [blue.method],
        LeaveScope: [blue.method],
        GetCurrentScope: [blue.method],
        ResetUsedFlag: [blue.method],
        LookupGlobal: [blue.method],
        IsGlobal: [blue.method]
    }
});
