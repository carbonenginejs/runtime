import { CjsSchema } from "#schema/CjsSchema";

// Custom: an LALR(1) table builder that reproduces the LEMON parser generator's
// construction, for Carbon's `.y` grammars.
//
// LEMON was written by D. Richard Hipp and is distributed with SQLite
// (https://sqlite.org). Its author disclaims copyright: "The author of this
// program disclaims copyright." (tool/lemon.c). See THIRD-PARTY-NOTICES.md.
//
// Reference: LEMON (public domain), lemon.c FindStates, FindLinks, FindFollowSets,
// FindActions, resolve_conflict, actioncmp and CompressTables; driver template
// lempar.c. Line citations of lemon.c are to SQLite 3.39.3's tool/lemon.c, the
// lemon-parser-generator version Carbon's build requires (trinity/vcpkg.json:96-97).
//
// Carbon generates `HLSLParser.c` and `Preprocessor.c` from its grammars with
// lemon (trinity/shadercompiler/CMakeLists.txt:150-175). This library is
// JavaScript only, so the grammar is kept as text and its tables are built
// here. The LALR(1) automaton is unique for a grammar, and conflicts resolve
// the way lemon resolves them when no precedence is declared (the shift wins
// over a reduce, the earlier rule wins between two reduces).
//
// Lemon's default reductions are reproduced: `defaults` holds each state's
// default reduce, chosen as CompressTables chooses it, and the parser takes it
// for every terminal the state has no action for, as lempar.c does. That
// changes behaviour on invalid input: a state reduces before the bad token is
// found to be bad, so a reduce action with side effects (reporting an
// undeclared identifier, entering a scope) runs before the syntax error is
// reported. `actions` keeps the full uncompressed table; lemon's packing of it
// into yy_action/yy_lookahead is not reproduced, which changes nothing a parse
// can observe.

import { CjsFxLemonParser } from "./CjsFxLemonParser.js";

const RULE_PATTERN = /^\s*([a-z_][a-z0-9_]*)\s*(?:\(\s*([A-Z][A-Za-z0-9_]*)\s*\))?\s*::=(.*)\.\s*$/u;
const SYMBOL_PATTERN = /^([A-Za-z_][A-Za-z0-9_]*)(?:\(\s*([A-Z][A-Za-z0-9_]*)\s*\))?$/u;

/**
 * Builds LALR(1) parse tables from a lemon-style grammar.
 *
 * A grammar is an ordered list of rules, each the rule's lemon text and the
 * reduce action:
 *
 * ```js
 * ["postfix_expression(A) ::= postfix_expression(B) OP_DOT OP_ID(C).", ({ B, C }, extra) => ...]
 * ```
 *
 * The action receives the aliased right-hand-side values by alias and the
 * parser's extra argument (lemon's `%extra_argument`), and returns the value
 * of the left-hand side. A name starting with an upper-case letter is a
 * terminal, as in lemon. Terminals are numbered in order of first appearance
 * from 1; 0 is the end of input, lemon's `$`.
 */
export class CjsFxLemon
{
    /** @type {string} Grammar name, for messages. */
    name = null;

    /** @type {number} Lemon's `%stack_size`: entries the parser stack holds, the bottom one included. */
    stackSize = null;

    /** @type {Function|null} Lemon's `%syntax_error`: `(major, minor, extra) => void`. */
    syntaxError = null;

    /** @type {Function|null} Lemon's `%stack_overflow`: `(extra) => void`. */
    stackOverflow = null;

    /** @type {string[]} Symbol names; index is the symbol number. Terminals come first, `$` is 0. */
    symbols = [];

    /** @type {number} Number of terminals, `$` included. */
    terminalCount = 0;

    /** @type {Array<{ index: number, lhs: number, lhsAlias: string|null, rhs: number[], aliases: Array<string|null>, action: Function|null, text: string }>} */
    rules = [];

    /** @type {Int32Array[]} Per state: terminal number to encoded action, uncompressed (see {@link CjsFxLemon#Action}). */
    actions = [];

    /** @type {Int32Array[]} Per state: non-terminal number, less `terminalCount`, to target state, or `CjsFxLemon.accept`. */
    gotos = [];

    /** @type {number[]} Per state: the encoded default reduce, or `CjsFxLemon.error` when the state has none; lemon's yy_default. */
    defaults = [];

    /** @type {Array<{ state: number, symbol: string, kept: string, dropped: string }>} Conflicts lemon would report. */
    conflicts = [];

    /** @type {string[]} Texts of the rules no state reduces by; lemon reports each as "This rule can not be reduced". */
    unreducibleRules = [];

    /** @type {Array<Array<[number, number]>>} Per state, its kernel as `[ruleIndex, dot]` pairs, for reports and comparison with lemon's. */
    kernels = [];

    /**
     * @param {object} definition The grammar.
     * @param {string} definition.name Grammar name, for messages.
     * @param {Array<[string, Function|null]>} definition.rules Rules in grammar order; the first rule's left-hand side is the start symbol.
     * @param {number} [definition.stackSize=100] Lemon's `%stack_size`.
     * @param {Function} [definition.syntaxError] Lemon's `%syntax_error`: `(major, minor, extra) => void`.
     * @param {Function} [definition.stackOverflow] Lemon's `%stack_overflow`: `(extra) => void`.
     */
    constructor(definition)
    {
        this.name = definition.name;

        this.stackSize = definition.stackSize ?? 100;

        this.syntaxError = definition.syntaxError ?? null;

        this.stackOverflow = definition.stackOverflow ?? null;

        this._Build(definition.rules);
    }

    /**
     * Terminal name to number, `$` excluded: lemon's generated token header.
     *
     * @returns {Record<string, number>} The token numbers.
     */
    GetTokens()
    {
        const tokens = {};
        for (let i = 1; i < this.terminalCount; ++i)
        {
            tokens[this.symbols[i]] = i;
        }
        return tokens;
    }

    /**
     * The uncompressed table's action for a state and a terminal: a shift
     * target (`>= 0`), a reduce (see {@link CjsFxLemon.reduceAction}), or
     * `CjsFxLemon.error`. The parser does not use this; it uses
     * {@link CjsFxLemon#FindShiftAction}, which applies the state's default.
     *
     * @param {number} state Parser state.
     * @param {number} terminal Terminal number.
     * @returns {number} The encoded action.
     */
    Action(state, terminal)
    {
        return this.actions[state][terminal];
    }

    /**
     * Lemon's `yy_find_shift_action` (lempar.c:511-570): the action the
     * parser takes in a state for a terminal lookahead. A terminal the state
     * has no action for takes the state's default reduce, `yy_default`
     * (lempar.c:564), and is an error only when the state has no default.
     *
     * @param {number} state Parser state.
     * @param {number} terminal Terminal number.
     * @returns {number} A shift target (`>= 0`), an encoded reduce, or `CjsFxLemon.error`.
     */
    FindShiftAction(state, terminal)
    {
        const action = this.actions[state][terminal];
        return action === CjsFxLemon.error ? this.defaults[state] : action;
    }

    /**
     * Lemon's `yy_find_reduce_action` (lempar.c:576-600): the goto after a
     * reduce, for the rule's left-hand side in the state uncovered by popping
     * its right-hand side.
     *
     * @param {number} state Parser state.
     * @param {number} nonterminal Symbol number of the non-terminal.
     * @returns {number} The target state, or `CjsFxLemon.accept`.
     */
    FindReduceAction(state, nonterminal)
    {
        return this.gotos[state][nonterminal - this.terminalCount];
    }

    /**
     * Creates a parser driving these tables: lemon's `ParseAlloc`.
     *
     * @param {*} extra The extra argument passed to every action.
     * @returns {CjsFxLemonParser} A fresh parser.
     */
    CreateParser(extra)
    {
        return new CjsFxLemonParser(this, extra);
    }

    /**
     * Parses the rule texts, numbers the symbols and builds the tables.
     *
     * @param {Array<[string, Function|null]>} ruleList Rules in grammar order.
     */
    _Build(ruleList)
    {
        const parsed = [];
        const order = [];
        const seen = new Set();
        const note = name =>
        {
            if (!seen.has(name))
            {
                seen.add(name);
                order.push(name);
            }
        };
        for (const [text, action] of ruleList)
        {
            const match = RULE_PATTERN.exec(text);
            if (!match)
            {
                throw new SyntaxError(`${this.name}: cannot read rule "${text}"`);
            }
            const rhs = [];
            for (const part of match[3].trim().split(/\s+/u).filter(Boolean))
            {
                const symbol = SYMBOL_PATTERN.exec(part);
                if (!symbol)
                {
                    throw new SyntaxError(`${this.name}: cannot read symbol "${part}" in "${text}"`);
                }
                rhs.push({ name: symbol[1], alias: symbol[2] ?? null });
            }
            note(match[1]);
            for (const symbol of rhs)
            {
                note(symbol.name);
            }
            parsed.push({ lhs: match[1], lhsAlias: match[2] ?? null, rhs, action, text });
        }

        // Lemon sorts terminals before non-terminals, each in order of creation,
        // with "$" created first.
        const isTerminal = name => name[0] >= "A" && name[0] <= "Z";
        this.symbols = ["$", ...order.filter(isTerminal), ...order.filter(name => !isTerminal(name))];
        this.terminalCount = 1 + order.filter(isTerminal).length;
        const number = new Map(this.symbols.map((name, i) => [name, i]));

        this.rules = parsed.map((rule, index) => ({
            index,
            lhs: number.get(rule.lhs),
            lhsAlias: rule.lhsAlias,
            rhs: rule.rhs.map(symbol => number.get(symbol.name)),
            aliases: rule.rhs.map(symbol => symbol.alias),
            action: rule.action,
            text: rule.text
        }));

        this._BuildTables();
    }

    /**
     * Lemon's FindFirstSets, FindStates, FindLinks, FindFollowSets and
     * FindActions, for a grammar without precedence declarations.
     */
    _BuildTables()
    {
        const symbolCount = this.symbols.length;
        const terminalCount = this.terminalCount;
        const rulesByLhs = Array.from({ length: symbolCount }, () => []);
        for (const rule of this.rules)
        {
            rulesByLhs[rule.lhs].push(rule);
        }
        for (let symbol = terminalCount; symbol < symbolCount; ++symbol)
        {
            if (rulesByLhs[symbol].length === 0)
            {
                throw new SyntaxError(`${this.name}: non-terminal "${this.symbols[symbol]}" has no rules`);
            }
        }

        // FIRST sets and nullability (lemon's "lambda").
        const nullable = new Uint8Array(symbolCount);
        const first = Array.from({ length: symbolCount }, () => new Uint8Array(terminalCount));
        for (let changed = true; changed;)
        {
            changed = false;
            for (const rule of this.rules)
            {
                if (!nullable[rule.lhs] && rule.rhs.every(symbol => symbol >= terminalCount && nullable[symbol]))
                {
                    nullable[rule.lhs] = 1;
                    changed = true;
                }
                const target = first[rule.lhs];
                for (const symbol of rule.rhs)
                {
                    if (symbol < terminalCount)
                    {
                        if (!target[symbol])
                        {
                            target[symbol] = 1;
                            changed = true;
                        }
                        break;
                    }
                    const source = first[symbol];
                    for (let t = 0; t < terminalCount; ++t)
                    {
                        if (source[t] && !target[t])
                        {
                            target[t] = 1;
                            changed = true;
                        }
                    }
                    if (!nullable[symbol])
                    {
                        break;
                    }
                }
            }
        }

        // LR(0) states with lemon's follow-set propagation links.
        const states = [];
        const stateByKey = new Map();
        const keyOf = basis => basis.map(([rule, dot]) => `${rule.index}.${dot}`).sort().join(",");

        const closure = state =>
        {
            const configs = state.configs;
            const byItem = state.byItem;
            for (let i = 0; i < configs.length; ++i)
            {
                const config = configs[i];
                const rhs = config.rule.rhs;
                if (config.dot >= rhs.length || rhs[config.dot] < terminalCount)
                {
                    continue;
                }
                for (const rule of rulesByLhs[rhs[config.dot]])
                {
                    const item = `${rule.index}.0`;
                    let added = byItem.get(item);
                    if (!added)
                    {
                        added = { rule, dot: 0, follow: new Uint8Array(terminalCount), links: [] };
                        byItem.set(item, added);
                        configs.push(added);
                    }
                    let k = config.dot + 1;
                    for (; k < rhs.length; ++k)
                    {
                        const symbol = rhs[k];
                        if (symbol < terminalCount)
                        {
                            added.follow[symbol] = 1;
                            break;
                        }
                        const source = first[symbol];
                        for (let t = 0; t < terminalCount; ++t)
                        {
                            if (source[t])
                            {
                                added.follow[t] = 1;
                            }
                        }
                        if (!nullable[symbol])
                        {
                            break;
                        }
                    }
                    if (k === rhs.length)
                    {
                        config.links.push(added);
                    }
                }
            }
        };

        const getState = basis =>
        {
            const key = keyOf(basis);
            const existing = stateByKey.get(key);
            if (existing)
            {
                return existing;
            }
            const state = { index: states.length, configs: [], byItem: new Map(), transitions: new Map(), basisCount: basis.length };
            for (const [rule, dot] of basis)
            {
                const config = { rule, dot, follow: new Uint8Array(terminalCount), links: [] };
                state.configs.push(config);
                state.byItem.set(`${rule.index}.${dot}`, config);
            }
            states.push(state);
            stateByKey.set(key, state);
            closure(state);
            return state;
        };

        const start = this.rules[0].lhs;
        const initial = getState(rulesByLhs[start].map(rule => [rule, 0]));
        for (const rule of rulesByLhs[start])
        {
            initial.byItem.get(`${rule.index}.0`).follow[0] = 1;
        }

        for (let s = 0; s < states.length; ++s)
        {
            const state = states[s];
            const bySymbol = new Map();
            for (const config of state.configs)
            {
                if (config.dot < config.rule.rhs.length)
                {
                    const symbol = config.rule.rhs[config.dot];
                    if (!bySymbol.has(symbol))
                    {
                        bySymbol.set(symbol, []);
                    }
                    bySymbol.get(symbol).push(config);
                }
            }
            for (const [symbol, configs] of bySymbol)
            {
                const target = getState(configs.map(config => [config.rule, config.dot + 1]));
                state.transitions.set(symbol, target.index);
                for (const config of configs)
                {
                    config.links.push(target.byItem.get(`${config.rule.index}.${config.dot + 1}`));
                }
            }
        }

        for (let changed = true; changed;)
        {
            changed = false;
            for (const state of states)
            {
                for (const config of state.configs)
                {
                    for (const linked of config.links)
                    {
                        const target = linked.follow;
                        const source = config.follow;
                        for (let t = 0; t < terminalCount; ++t)
                        {
                            if (source[t] && !target[t])
                            {
                                target[t] = 1;
                                changed = true;
                            }
                        }
                    }
                }
            }
        }

        // Actions. Lemon sorts a state's actions by symbol, then shift before
        // reduce, then by rule; the first action for a symbol is kept and every
        // later one is a conflict when no precedence decides it.
        const reduced = new Uint8Array(this.rules.length);
        for (const state of states)
        {
            const actions = new Int32Array(terminalCount).fill(CjsFxLemon.error);
            const gotos = new Int32Array(symbolCount - terminalCount).fill(CjsFxLemon.error);
            for (const [symbol, target] of state.transitions)
            {
                if (symbol < terminalCount)
                {
                    actions[symbol] = target;
                }
                else
                {
                    gotos[symbol - terminalCount] = target;
                }
            }
            for (const config of state.configs)
            {
                if (config.dot !== config.rule.rhs.length)
                {
                    continue;
                }
                const encoded = CjsFxLemon.reduceAction(config.rule.index);
                for (let t = 0; t < terminalCount; ++t)
                {
                    if (!config.follow[t])
                    {
                        continue;
                    }
                    const current = actions[t];
                    if (current === CjsFxLemon.error)
                    {
                        actions[t] = encoded;
                    }
                    else if (current >= 0)
                    {
                        this.conflicts.push({ state: state.index, symbol: this.symbols[t], kept: "shift", dropped: config.rule.text });
                    }
                    else
                    {
                        const keptRule = CjsFxLemon.reduceRule(current);
                        if (config.rule.index < keptRule)
                        {
                            actions[t] = encoded;
                            this.conflicts.push({ state: state.index, symbol: this.symbols[t], kept: config.rule.text, dropped: this.rules[keptRule].text });
                        }
                        else
                        {
                            this.conflicts.push({ state: state.index, symbol: this.symbols[t], kept: this.rules[keptRule].text, dropped: config.rule.text });
                        }
                    }
                }
            }
            for (let t = 0; t < terminalCount; ++t)
            {
                if (actions[t] < CjsFxLemon.error)
                {
                    reduced[CjsFxLemon.reduceRule(actions[t])] = 1;
                }
            }
            this.actions.push(actions);
            this.gotos.push(gotos);
        }
        this.gotos[0][start - terminalCount] = CjsFxLemon.accept;

        this.unreducibleRules = this.rules.filter(rule => !reduced[rule.index]).map(rule => rule.text);

        this.kernels = states.map(state => state.configs.slice(0, state.basisCount).map(config => [config.rule.index, config.dot]));

        this._CompressTables();
    }

    /**
     * Lemon's CompressTables (lemon.c:4997-5050), the part a parse can
     * observe: each state's default reduce, into `defaults`.
     *
     * Lemon walks a state's actions in actioncmp order (lemon.c:514-530),
     * which for reduces is terminal order, and for each reduce whose rule is
     * neither a start-symbol rule (`lhsStart`, lemon.c:5009) nor the current
     * best counts that reduce and the later ones by the same rule
     * (lemon.c:5011-5017). A count strictly greater than the best so far
     * replaces it (lemon.c:5018-5021), so the rule reduced on the most
     * terminals wins and a tie goes to the rule whose first terminal is
     * lowest. A state with no counted reduce has no default
     * (lemon.c:5028). Only the winning action of a conflict is a REDUCE
     * there (resolve_conflict marks the loser SRCONFLICT or RRCONFLICT), and
     * `actions` holds only winners, so the counts agree. The wildcard
     * exclusion (lemon.c:5004-5006, 5028) does not arise: CjsFxLemon reads no
     * `%wildcard`.
     *
     * The rest of CompressTables is not reproduced, and none of it changes
     * what a parse observes:
     *
     * - A shift into a state whose only action is its default becomes a
     *   SHIFTREDUCE (lemon.c:5056-5067; lempar.c:676-681 stores the pending
     *   reduce as the stack entry's state). Lempar.c:517 then takes that
     *   reduce when the next token arrives, without looking at it. The port
     *   shifts into the state and, on the next token, finds no action there
     *   other than the default, so it reduces at the same moment by the same
     *   rule, with the same stack depth.
     * - A SHIFTREDUCE on a non-terminal by a rule with one right-hand symbol
     *   and no code is replaced by the action for that rule's left-hand side
     *   (lemon.c:5075-5097), skipping that reduce. The skipped reduce runs no
     *   code, leaves the value in place (lemon keeps the first right-hand
     *   value in the left-hand side's slot) and pops one entry to push one,
     *   so only the stack entry's `major` differs, and lempar.c reads
     *   `major` only for destructors and trace output, which Carbon's
     *   grammars do not declare. Error recovery never inspects the stack: the
     *   grammars define no `error` symbol (lempar.c:1025-1046).
     */
    _CompressTables()
    {
        const terminalCount = this.terminalCount;
        const start = this.rules[0].lhs;
        for (const actions of this.actions)
        {
            let best = CjsFxLemon.error;
            let bestCount = 0;
            for (let t = 0; t < terminalCount; ++t)
            {
                const action = actions[t];
                if (action >= CjsFxLemon.error)
                {
                    continue;
                }
                if (this.rules[CjsFxLemon.reduceRule(action)].lhs === start)
                {
                    continue;
                }
                if (action === best)
                {
                    continue;
                }
                let count = 1;
                for (let later = t + 1; later < terminalCount; ++later)
                {
                    if (actions[later] === action)
                    {
                        ++count;
                    }
                }
                if (count > bestCount)
                {
                    bestCount = count;
                    best = action;
                }
            }
            this.defaults.push(best);
        }
    }

    /**
     * The encoded reduce action for a rule. Lemon numbers reduces upward from
     * YY_MIN_REDUCE; these count down from -2, below `CjsFxLemon.error`, so
     * every reduce is `< CjsFxLemon.error` and every shift `>= 0`.
     *
     * @param {number} ruleIndex Rule number, in grammar order.
     * @returns {number} The encoded action.
     */
    static reduceAction(ruleIndex)
    {
        return CjsFxLemon.error - 1 - ruleIndex;
    }

    /**
     * The rule an encoded reduce action reduces by: the inverse of
     * {@link CjsFxLemon.reduceAction}.
     *
     * @param {number} action An encoded reduce, `< CjsFxLemon.error`.
     * @returns {number} The rule number.
     */
    static reduceRule(action)
    {
        return CjsFxLemon.error - 1 - action;
    }

    /** Encoded "no action": a syntax error, lemon's YY_ERROR_ACTION. */
    static error = -1;

    /** Goto value for the start symbol in state 0: lemon's ACCEPT (lemon.c FindActions adds it to state 0 only). */
    static accept = -2;
}

CjsSchema.meta.define(CjsFxLemon, { className: "CjsFxLemon" });
