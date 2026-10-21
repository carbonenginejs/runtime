import { CjsSchema, meta } from "#schema";
// Source: trinity/shadercompiler/SymbolTable.h
// Source: trinity/shadercompiler/SymbolTable.cpp:47-68

/**
 * Carbon's `CompareSymbols`, the strict-weak order of a `std::set<Symbol*>`:
 * by name, then shorter first; two functions of one name order by their
 * definitions.
 *
 * Adapted: Carbon compares the two definitions' heap addresses. JavaScript
 * has none, so definitions order by `ASTNode.serial`, their creation order;
 * an allocator usually, but not always, hands out rising addresses.
 */
export class CompareSymbols
{
    /**
     * Carbon's `operator()`.
     *
     * @param {import("./Symbol.js").Symbol} symbol0 Left symbol.
     * @param {import("./Symbol.js").Symbol} symbol1 Right symbol.
     * @returns {boolean} Whether `symbol0` orders before `symbol1`.
     */
    static compare(symbol0, symbol1)
    {
        const name0 = symbol0.name.ToString();
        const name1 = symbol1.name.ToString();
        const shared = Math.min(name0.length, name1.length);
        const head0 = name0.slice(0, shared);
        const head1 = name1.slice(0, shared);
        if (head0 < head1)
        {
            return true;
        }
        if (head0 === head1)
        {
            if (name0.length < name1.length)
            {
                return true;
            }
            if (symbol0.isFunction && symbol1.isFunction)
            {
                return serialOf(symbol0.definition) < serialOf(symbol1.definition);
            }
            return false;
        }
        return false;
    }
}

/**
 * A definition's creation order; a missing definition orders first, as a null
 * pointer does.
 *
 * @param {import("../ASTNode/ASTNode.js").ASTNode|null} node The definition.
 * @returns {number} Its serial, or -1.
 */
function serialOf(node)
{
    return node === null ? -1 : node.serial;
}

CjsSchema.decorateMethod(CompareSymbols, "compare", meta.renamed("operator()"));
CjsSchema.meta.carbon("CompareSymbols")(CompareSymbols);
