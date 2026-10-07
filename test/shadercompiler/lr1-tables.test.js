import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { CjsFxLemon } from "../../src/shadercompiler/lemon/index.js";
import { HLSLParser, Preprocessor } from "../../src/shadercompiler/index.js";
import { buildCanonicalLalr } from "./support/lr1Canonical.js";

// CjsFxLemon builds LALR(1) tables as lemon.c does: LR(0) states, then follow
// sets propagated along links. These tests rebuild Carbon's two grammars by an
// unrelated construction, canonical LR(1) merged by LR(0) core, and require
// the full uncompressed action and goto tables to be identical. Needs no
// Carbon checkout or lemon build; scripts/compare-lemon.mjs is the comparison
// against lemon's own report.

/**
 * Compares CjsFxLemon's tables with the canonical construction, entry by entry.
 *
 * @param {CjsFxLemon} tables CjsFxLemon's tables.
 * @returns {{ canonicalStates: number, states: number, entries: number, conflicts: number }} Counts, for the assertions.
 */
function crossCheck(tables)
{
    const canonical = buildCanonicalLalr({
        terminalCount: tables.terminalCount,
        symbolCount: tables.symbols.length,
        rules: tables.rules.map(rule => ({ lhs: rule.lhs, rhs: rule.rhs }))
    });
    const kernelKey = kernel => kernel.map(([rule, dot]) => `${rule}.${dot}`).sort().join(",");
    const ours = new Map(tables.kernels.map((kernel, state) => [kernelKey(kernel), state]));
    assert.equal(ours.size, tables.kernels.length, "CjsFxLemon has two states with one kernel");
    assert.equal(canonical.states.length, tables.kernels.length, "merged canonical state count");

    const start = tables.rules[0].lhs;
    let entries = 0;
    for (const state of canonical.states)
    {
        const mine = ours.get(state.kernel);
        assert.notEqual(mine, undefined, `no CjsFxLemon state has kernel ${state.kernel}`);
        for (let t = 0; t < tables.terminalCount; ++t)
        {
            const action = state.actions.get(t);
            let expected = CjsFxLemon.error;
            if (action && action.shift !== undefined)
            {
                expected = ours.get(action.shift);
            }
            else if (action)
            {
                expected = CjsFxLemon.reduceAction(action.reduce);
            }
            assert.equal(tables.Action(mine, t), expected, `state ${mine}, ${tables.symbols[t]}`);
            entries++;
        }
        for (let n = tables.terminalCount; n < tables.symbols.length; ++n)
        {
            const target = state.gotos.get(n);
            let expected = target === undefined ? CjsFxLemon.error : ours.get(target);
            // Lemon adds ACCEPT as state 0's action on the start symbol (lemon.c FindActions, :1194).
            if (mine === 0 && n === start)
            {
                expected = CjsFxLemon.accept;
            }
            assert.equal(tables.FindReduceAction(mine, n), expected, `state ${mine}, goto ${tables.symbols[n]}`);
            entries++;
        }
    }
    assert.equal(canonical.conflicts, tables.conflicts.length, "dropped actions");
    return { canonicalStates: canonical.canonicalStates, states: canonical.states.length, entries, conflicts: canonical.conflicts };
}

/**
 * A digest of every state's default reduce, in CjsFxLemon's state order.
 *
 * @param {CjsFxLemon} tables CjsFxLemon's tables.
 * @returns {string} SHA-256 hex digest.
 */
function defaultsDigest(tables)
{
    return createHash("sha256").update(tables.defaults.join(",")).digest("hex");
}

/**
 * States whose only action is their default reduce: lemon's `autoReduce`
 * states, the targets of its shift-reduce actions.
 *
 * @param {CjsFxLemon} tables CjsFxLemon's tables.
 * @returns {number} The count.
 */
function defaultOnlyCount(tables)
{
    let count = 0;
    for (let state = 0; state < tables.actions.length; ++state)
    {
        const fallback = tables.defaults[state];
        if (fallback !== CjsFxLemon.error
            && tables.actions[state].every(action => action === CjsFxLemon.error || action === fallback)
            && tables.gotos[state].every(target => target === CjsFxLemon.error))
        {
            count++;
        }
    }
    return count;
}

test("HLSLParser.y: CjsFxLemon's tables equal canonical LR(1) merged by core", () =>
{
    const tables = HLSLParser.getTables();
    const result = crossCheck(tables);
    assert.equal(result.canonicalStates, 3128);
    assert.equal(result.states, 690);
    assert.equal(result.entries, 690 * 258);
    assert.equal(result.conflicts, 1);
});

test("Preprocessor.y: CjsFxLemon's tables equal canonical LR(1) merged by core", () =>
{
    const tables = Preprocessor.getTables();
    const result = crossCheck(tables);
    assert.equal(result.canonicalStates, 221);
    assert.equal(result.states, 75);
    assert.equal(result.entries, 75 * 46);
    assert.equal(result.conflicts, 0);
});

// Default reductions, lemon.c CompressTables. scripts/compare-lemon.mjs found
// CjsFxLemon's defaults identical to lemon 3.39.3's reports for both grammars on
// 2026-10-07: HLSLParser.y 372 states with a default (82 listed, 290
// default-only states omitted from the report), Preprocessor.y 44 (26 listed,
// 18 omitted). The digests pin that result; if one changes, rerun that
// comparison before updating it.
test("default reductions match lemon's CompressTables for both grammars", () =>
{
    const hlsl = HLSLParser.getTables();
    assert.equal(hlsl.defaults.length, 690);
    assert.equal(hlsl.defaults.filter(action => action !== CjsFxLemon.error).length, 372);
    assert.equal(defaultOnlyCount(hlsl), 290);
    assert.equal(defaultsDigest(hlsl), "4e7bfccc62922b31f05fdcf82c0cc42ae14871268c2cdc8bce6de5b2324e89ac");

    const pp = Preprocessor.getTables();
    assert.equal(pp.defaults.length, 75);
    assert.equal(pp.defaults.filter(action => action !== CjsFxLemon.error).length, 44);
    assert.equal(defaultOnlyCount(pp), 18);
    assert.equal(defaultsDigest(pp), "5f61ca907d61f00de509733a51fe61af9783518c1cb73dab45be3da7e5c16613");
});
