// Test support: an independent canonical LR(1) construction, merged by LR(0)
// core into LALR(1) tables, for cross-checking CjsFxLemon. It shares no code
// with CjsFxLemon: CjsFxLemon builds LR(0) states and propagates follow sets
// along links, as lemon.c does; this builds the canonical LR(1) automaton
// (Knuth's construction, items carrying lookahead sets) and merges states with
// equal cores afterwards. For a grammar the two must agree exactly.

/**
 * A fixed-size set of terminals as 32-bit words.
 */
class TerminalSet
{
    /**
     * @param {number} words Word count.
     */
    constructor(words)
    {
        /** @type {Uint32Array} The bits. */
        this.bits = new Uint32Array(words);
    }

    /**
     * Adds one terminal.
     *
     * @param {number} terminal Terminal number.
     */
    add(terminal)
    {
        this.bits[terminal >>> 5] |= 1 << (terminal & 31);
    }

    /**
     * Whether the set holds a terminal.
     *
     * @param {number} terminal Terminal number.
     * @returns {boolean} True when present.
     */
    has(terminal)
    {
        return (this.bits[terminal >>> 5] & (1 << (terminal & 31))) !== 0;
    }

    /**
     * Adds every terminal of another set.
     *
     * @param {TerminalSet} other The set to add.
     * @returns {boolean} True when this set grew.
     */
    union(other)
    {
        let changed = false;
        for (let i = 0; i < this.bits.length; ++i)
        {
            const merged = (this.bits[i] | other.bits[i]) >>> 0;
            if (merged !== this.bits[i])
            {
                this.bits[i] = merged;
                changed = true;
            }
        }
        return changed;
    }

    /**
     * A copy of this set.
     *
     * @returns {TerminalSet} The copy.
     */
    clone()
    {
        const copy = new TerminalSet(this.bits.length);
        copy.bits.set(this.bits);
        return copy;
    }

    /**
     * A string identifying the set's contents.
     *
     * @returns {string} The key.
     */
    key()
    {
        return Array.from(this.bits, word => word.toString(36)).join(".");
    }
}

/**
 * Builds LALR(1) tables by canonical LR(1) construction and core merging.
 *
 * The grammar is given as numbered symbols, terminals first with `$` as 0,
 * and rules whose first rule's left-hand side is the start symbol, as
 * CjsFxLemon numbers them. Conflicts resolve as lemon resolves them without
 * precedence: shift over reduce, the lower-numbered rule between reduces.
 *
 * @param {{ terminalCount: number, symbolCount: number, rules: Array<{ lhs: number, rhs: number[] }> }} grammar The grammar.
 * @returns {{ canonicalStates: number, states: Array<{ kernel: string, actions: Map<number, { shift?: string, reduce?: number }>, gotos: Map<number, string> }>, conflicts: number }}
 *     Merged states keyed by kernel (`rule.dot` items, sorted), with shift and goto targets as kernel keys.
 */
export function buildCanonicalLalr(grammar)
{
    const { terminalCount, symbolCount, rules } = grammar;
    const words = (terminalCount + 31) >>> 5;
    const rulesByLhs = Array.from({ length: symbolCount }, () => []);
    rules.forEach((rule, index) => rulesByLhs[rule.lhs].push(index));

    // Item numbering: rule r, dot d is itemBase[r] + d.
    const itemBase = [];
    const itemRule = [];
    const itemDot = [];
    for (let r = 0; r < rules.length; ++r)
    {
        itemBase.push(itemRule.length);
        for (let d = 0; d <= rules[r].rhs.length; ++d)
        {
            itemRule.push(r);
            itemDot.push(d);
        }
    }
    const itemCount = itemRule.length;
    const nextSymbol = item => (itemDot[item] < rules[itemRule[item]].rhs.length ? rules[itemRule[item]].rhs[itemDot[item]] : -1);

    // FIRST and nullability, by iteration to a fixed point.
    const nullable = new Uint8Array(symbolCount);
    const first = Array.from({ length: symbolCount }, () => new TerminalSet(words));
    for (let t = 0; t < terminalCount; ++t)
    {
        first[t].add(t);
    }
    for (let changed = true; changed;)
    {
        changed = false;
        for (const rule of rules)
        {
            let allNullable = true;
            for (const symbol of rule.rhs)
            {
                if (first[rule.lhs].union(first[symbol]))
                {
                    changed = true;
                }
                if (symbol < terminalCount || !nullable[symbol])
                {
                    allNullable = false;
                    break;
                }
            }
            if (allNullable && !nullable[rule.lhs])
            {
                nullable[rule.lhs] = 1;
                changed = true;
            }
        }
    }

    // For each item, FIRST of what follows the symbol after its dot, and
    // whether all of that can be empty.
    const suffixFirst = new Array(itemCount);
    const suffixNullable = new Uint8Array(itemCount);
    for (let item = 0; item < itemCount; ++item)
    {
        const rhs = rules[itemRule[item]].rhs;
        const set = new TerminalSet(words);
        let empty = 1;
        for (let k = itemDot[item] + 1; k < rhs.length; ++k)
        {
            set.union(first[rhs[k]]);
            if (rhs[k] < terminalCount || !nullable[rhs[k]])
            {
                empty = 0;
                break;
            }
        }
        suffixFirst[item] = set;
        suffixNullable[item] = empty;
    }

    const closure = kernel =>
    {
        const lookahead = new Map();
        const work = [];
        for (const [item, set] of kernel)
        {
            lookahead.set(item, set.clone());
            work.push(item);
        }
        while (work.length > 0)
        {
            const item = work.pop();
            const symbol = nextSymbol(item);
            if (symbol < terminalCount)
            {
                continue;
            }
            const spawned = suffixFirst[item].clone();
            if (suffixNullable[item])
            {
                spawned.union(lookahead.get(item));
            }
            for (const r of rulesByLhs[symbol])
            {
                const target = itemBase[r];
                const existing = lookahead.get(target);
                if (!existing)
                {
                    lookahead.set(target, spawned.clone());
                    work.push(target);
                }
                else if (existing.union(spawned))
                {
                    work.push(target);
                }
            }
        }
        return lookahead;
    };

    const coreKey = items => items.map(item => `${itemRule[item]}.${itemDot[item]}`).sort().join(",");
    const fullKey = kernel => kernel.map(([item, set]) => `${item}:${set.key()}`).sort().join(",");

    // Canonical LR(1) states.
    const states = [];
    const byKey = new Map();
    const getState = kernel =>
    {
        const key = fullKey(kernel);
        let index = byKey.get(key);
        if (index === undefined)
        {
            index = states.length;
            byKey.set(key, index);
            states.push({ core: coreKey(kernel.map(([item]) => item)), items: closure(kernel), transitions: new Map() });
        }
        return index;
    };
    const start = rules[0].lhs;
    const end = new TerminalSet(words);
    end.add(0);
    getState(rulesByLhs[start].map(r => [itemBase[r], end]));
    for (let s = 0; s < states.length; ++s)
    {
        const bySymbol = new Map();
        for (const [item, set] of states[s].items)
        {
            const symbol = nextSymbol(item);
            if (symbol < 0)
            {
                continue;
            }
            if (!bySymbol.has(symbol))
            {
                bySymbol.set(symbol, []);
            }
            bySymbol.get(symbol).push([item + 1, set]);
        }
        for (const [symbol, kernel] of bySymbol)
        {
            states[s].transitions.set(symbol, getState(kernel));
        }
    }

    // Merge by core: union the lookaheads of completed items, keep transitions by core.
    const merged = new Map();
    for (const state of states)
    {
        let target = merged.get(state.core);
        if (!target)
        {
            target = { kernel: state.core, reduces: new Map(), transitions: new Map() };
            merged.set(state.core, target);
        }
        for (const [item, set] of state.items)
        {
            if (nextSymbol(item) >= 0)
            {
                continue;
            }
            const existing = target.reduces.get(itemRule[item]);
            if (existing)
            {
                existing.union(set);
            }
            else
            {
                target.reduces.set(itemRule[item], set.clone());
            }
        }
        for (const [symbol, next] of state.transitions)
        {
            target.transitions.set(symbol, states[next].core);
        }
    }

    // Actions, with lemon's resolution.
    let conflicts = 0;
    const result = [];
    for (const state of merged.values())
    {
        const actions = new Map();
        const gotos = new Map();
        for (const [symbol, target] of state.transitions)
        {
            if (symbol < terminalCount)
            {
                actions.set(symbol, { shift: target });
            }
            else
            {
                gotos.set(symbol, target);
            }
        }
        const reduceRules = [...state.reduces.keys()].sort((a, b) => a - b);
        for (const rule of reduceRules)
        {
            const set = state.reduces.get(rule);
            for (let t = 0; t < terminalCount; ++t)
            {
                if (!set.has(t))
                {
                    continue;
                }
                if (actions.has(t))
                {
                    conflicts++;
                    continue;
                }
                actions.set(t, { reduce: rule });
            }
        }
        result.push({ kernel: state.kernel, actions, gotos });
    }
    return { canonicalStates: states.length, states: result, conflicts };
}
