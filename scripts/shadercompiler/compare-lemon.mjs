// Checks a transcribed grammar against Carbon's .y file and lemon's tables.
//
//   node scripts/compare-lemon.mjs <grammar.y> <report .out> <uncompressed report .out> <HLSLParser|Preprocessor>
//
// The two reports come from lemon itself, built from SQLite's public-domain
// tool/lemon.c at 3.39.3 (the lemon-parser-generator version Carbon's build
// requires) and run on Carbon's grammar:
//
//   lemon -s -T<template> HLSLParser.y       the report Carbon's build makes
//   lemon -c -s -T<template> HLSLParser.y    "-c": tables left uncompressed
//
// 1. Rules: the module's rule list must be the .y file's rules, in order,
//    with the same aliases.
// 2. Full tables, from the uncompressed report. Lemon lists every state and,
//    for each, every action it keeps; anything unlisted is an error. Each
//    lemon state is matched to one CjsFxLemon state by kernel, the match must
//    be one to one, and every terminal and non-terminal must have the same
//    action: shift or goto to the state with the same kernel, reduce by the
//    same rule, accept, or error. Lemon's dropped conflict actions must be
//    CjsFxLemon's conflicts.
// 3. Compression, from the compressed report. Each listed state's `{default}`
//    must be CjsFxLemon's `defaults` entry (none when lemon lists none). A
//    listed reduce must not be the default (lemon folds those into it), and
//    an unlisted terminal must be an error or the default. A shift-reduce
//    must be a shift or goto into a state whose only action is its default,
//    by that rule. The states lemon omits must be exactly those
//    default-only states.
//
// Last run 2026-10-07 (lemon 3.39.3): HLSLParser.y 690 states x 258 symbols,
// 178020 entries, 1 conflict; 400 compressed states, 82 listed defaults, 290
// default-only states omitted: no differences. Preprocessor.y 75 states x 46
// symbols, 3450 entries; 57 compressed states, 26 listed defaults, 18
// omitted: no differences. Negative controls, one CjsFxLemon entry mutated
// before comparing, each detected: a reduce changed to error (state 2,
// OP_LEFT_BRACKET), a default changed to error, a default swapped for another
// rule, a shift retargeted, a goto changed to error.

import { readFileSync } from "node:fs";
import { CjsFxLemon } from "../../src/shadercompiler/lemon/CjsFxLemon.js";
import { HLSLParser } from "../../src/shadercompiler/shadercompiler/HLSLParser.js";
import { Preprocessor } from "../../src/shadercompiler/shadercompiler/Preprocessor.js";

const [, , grammarPath, reportPath, uncompressedPath, grammarName] = process.argv;
const grammar = { HLSLParser, Preprocessor }[grammarName];
if (!grammarPath || !reportPath || !uncompressedPath || !grammar)
{
    console.error("usage: node scripts/compare-lemon.mjs <grammar.y> <report .out> <uncompressed report .out> <HLSLParser|Preprocessor>");
    process.exit(2);
}

let failures = 0;
const fail = message =>
{
    if (failures++ < 20)
    {
        console.log(message);
    }
};

// 1. Rules.
const normalise = rule => rule.replace(/\{.*$/u, "").replace(/\s+/gu, " ").replace(/\s*\.\s*$/u, ".").trim();
const carbonRules = readFileSync(grammarPath, "utf8").replace(/\r/gu, "").split("\n")
    .filter(line => /^[a-z_0-9]+(\([A-Z]+\))?\s*::=/u.test(line))
    .map(normalise);
const ourRules = grammar.getRules().map(([text]) => normalise(text));
for (let i = 0; i < Math.max(carbonRules.length, ourRules.length); ++i)
{
    if (carbonRules[i] !== ourRules[i])
    {
        fail(`rule ${i}:\n  carbon: ${carbonRules[i]}\n  ours:   ${ourRules[i]}`);
    }
}
console.log(`rules: carbon ${carbonRules.length}, ours ${ourRules.length}`);

const tables = grammar.getTables();
const terminalCount = tables.terminalCount;
const stateCount = tables.actions.length;
const ruleText = rule => `${tables.symbols[rule.lhs]} ::= ${rule.rhs.map(s => tables.symbols[s]).join(" ")}`.trim();
const ruleByText = new Map(tables.rules.map((rule, i) => [ruleText(rule), i]));
const symbolIndex = new Map(tables.symbols.map((name, i) => [name, i]));
const kernelKey = items => items.map(([rule, dot]) => `${rule}.${dot}`).sort().join(",");
const ourByKernel = new Map(tables.kernels.map((kernel, i) => [kernelKey(kernel), i]));
const startLhs = tables.rules[0].lhs;
const ruleOf = action => ruleByText.get(action.text.replace(/\s+/gu, " ").trim());
const lookup = (state, symbol) => (symbol < terminalCount ? tables.actions[state][symbol] : tables.gotos[state][symbol - terminalCount]);
const name = symbol => tables.symbols[symbol];

/**
 * A state whose only action is its default reduce: lemon's `autoReduce`
 * (lemon.c:5042-5049), the target of a shift-reduce.
 *
 * @param {number} state CjsFxLemon state.
 * @returns {boolean} True when the state has a default and no other action.
 */
const isDefaultOnly = state =>
{
    const fallback = tables.defaults[state];
    if (fallback === CjsFxLemon.error)
    {
        return false;
    }
    return tables.actions[state].every(action => action === CjsFxLemon.error || action === fallback)
        && tables.gotos[state].every(target => target === CjsFxLemon.error);
};

/**
 * Reads lemon's .out report: per state, its configurations, kept actions and
 * dropped conflict actions.
 *
 * @param {string} path Report path.
 * @returns {Array<{ id: number, items: Array<[number, number]>, actions: object[], conflicts: string[] }>} The states.
 */
const readReport = path =>
{
    const states = [];
    let current = null;
    for (const line of readFileSync(path, "utf8").replace(/\r/gu, "").split("\n"))
    {
        const head = /^State (\d+):$/u.exec(line);
        if (head)
        {
            current = { id: Number(head[1]), items: [], actions: [], conflicts: [] };
            states.push(current);
            continue;
        }
        if (!current)
        {
            continue;
        }
        if (/^-{5,}/u.test(line))
        {
            current = null;
            continue;
        }
        const config = /^\s+(?:\(\d+\)\s+)?([a-z_0-9]+) ::=(.*)$/u.exec(line);
        if (config)
        {
            const rhs = config[2].trim().split(/\s+/u).filter(Boolean);
            const text = `${config[1]} ::= ${rhs.filter(s => s !== "*").join(" ")}`.trim();
            current.items.push([ruleByText.get(text), rhs.indexOf("*")]);
            continue;
        }
        const action = /^\s*(\S+)\s+(shift-reduce|shift|reduce|accept)\s*(\d+)?\s*(.*?)\s*$/u.exec(line);
        if (!action)
        {
            continue;
        }
        if (line.includes("** Parsing conflict **"))
        {
            current.conflicts.push(action[1]);
            continue;
        }
        current.actions.push({ symbol: action[1], kind: action[2], number: action[3] === undefined ? null : Number(action[3]), text: action[4] });
    }
    return states;
};

/**
 * Matches lemon's states to CjsFxLemon's by kernel.
 *
 * @param {Array<{ id: number, items: Array<[number, number]> }>} states Lemon's states.
 * @param {string} label Report label, for messages.
 * @returns {{ ours: Map<number, number>, matched: Set<number>, byId: Map<number, object> }} Lemon id to CjsFxLemon state, and the CjsFxLemon states matched.
 */
const matchStates = (states, label) =>
{
    const ours = new Map();
    const matched = new Set();
    for (const state of states)
    {
        const kernel = state.items.filter(([rule, dot]) => dot > 0 || (state.id === 0 && tables.rules[rule].lhs === startLhs));
        const mine = ourByKernel.get(kernelKey(kernel));
        if (mine === undefined)
        {
            fail(`${label} state ${state.id} has no counterpart`);
            continue;
        }
        if (matched.has(mine))
        {
            fail(`${label} state ${state.id} matches CjsFxLemon state ${mine} a second time`);
        }
        matched.add(mine);
        ours.set(state.id, mine);
    }
    return { ours, matched, byId: new Map(states.map(state => [state.id, state])) };
};

// 2. Full tables.
const full = readReport(uncompressedPath);
const fullMatch = matchStates(full, "uncompressed");
let checked = 0;
let conflictCount = 0;
for (let s = 0; s < stateCount; ++s)
{
    if (!fullMatch.matched.has(s))
    {
        fail(`CjsFxLemon state ${s} is not in the uncompressed report`);
    }
}
for (const state of full)
{
    const mine = fullMatch.ours.get(state.id);
    if (mine === undefined)
    {
        continue;
    }
    const listed = new Set();
    for (const action of state.actions)
    {
        const symbol = symbolIndex.get(action.symbol);
        if (symbol === undefined)
        {
            fail(`uncompressed state ${state.id}: unexpected ${action.symbol} ${action.kind}`);
            continue;
        }
        listed.add(symbol);
        const ours = lookup(mine, symbol);
        let expected;
        switch (action.kind)
        {
            case "accept":
                expected = symbol >= terminalCount && ours === CjsFxLemon.accept;
                break;
            case "shift":
                expected = ours >= 0 && kernelKey(tables.kernels[ours]) === kernelKey(tables.kernels[fullMatch.ours.get(action.number)]);
                break;
            case "reduce":
                expected = symbol < terminalCount && ours === CjsFxLemon.reduceAction(ruleOf(action));
                break;
            default:
                expected = false;
        }
        if (!expected)
        {
            fail(`uncompressed state ${state.id}, ${action.symbol}: lemon ${action.kind} ${action.number ?? ""} ${action.text}, ours ${ours}`);
        }
    }
    for (let symbol = 0; symbol < tables.symbols.length; ++symbol)
    {
        checked++;
        if (!listed.has(symbol) && lookup(mine, symbol) !== CjsFxLemon.error)
        {
            fail(`uncompressed state ${state.id}, ${name(symbol)}: lemon error, ours ${lookup(mine, symbol)}`);
        }
    }
    for (const symbol of state.conflicts)
    {
        conflictCount++;
        if (!tables.conflicts.some(conflict => conflict.state === mine && conflict.symbol === symbol))
        {
            fail(`uncompressed state ${state.id}, ${symbol}: lemon reports a conflict, ours does not`);
        }
    }
}
if (conflictCount !== tables.conflicts.length)
{
    fail(`conflicts: lemon ${conflictCount}, ours ${tables.conflicts.length}`);
}
console.log(`full tables: lemon states ${full.length}, ours ${stateCount}, actions and gotos checked ${checked}, conflicts ${conflictCount}`);

// 3. Compression.
const compressed = readReport(reportPath);
const compressedMatch = matchStates(compressed, "compressed");
let defaultCount = 0;
let omitted = 0;
for (let s = 0; s < stateCount; ++s)
{
    if (!compressedMatch.matched.has(s))
    {
        omitted++;
        if (!isDefaultOnly(s))
        {
            fail(`CjsFxLemon state ${s} is omitted from the compressed report but has actions besides a default`);
        }
    }
}
for (const state of compressed)
{
    const mine = compressedMatch.ours.get(state.id);
    if (mine === undefined)
    {
        continue;
    }
    if (isDefaultOnly(mine) && mine !== 0)
    {
        fail(`compressed state ${state.id}: listed, but CjsFxLemon state ${mine} has only its default`);
    }
    const fallback = tables.defaults[mine];
    let lemonDefault = CjsFxLemon.error;
    const listed = new Set();
    for (const action of state.actions)
    {
        if (action.symbol === "{default}")
        {
            lemonDefault = CjsFxLemon.reduceAction(ruleOf(action));
            defaultCount++;
            continue;
        }
        const symbol = symbolIndex.get(action.symbol);
        listed.add(symbol);
        const ours = lookup(mine, symbol);
        let expected;
        switch (action.kind)
        {
            case "accept":
                expected = ours === CjsFxLemon.accept;
                break;
            case "shift":
                expected = ours >= 0 && kernelKey(tables.kernels[ours]) === kernelKey(tables.kernels[compressedMatch.ours.get(action.number)]);
                break;
            case "shift-reduce":
                expected = ours >= 0 && isDefaultOnly(ours) && tables.defaults[ours] === CjsFxLemon.reduceAction(ruleOf(action));
                break;
            case "reduce":
                expected = ours === CjsFxLemon.reduceAction(ruleOf(action)) && ours !== fallback;
                break;
        }
        if (!expected)
        {
            fail(`compressed state ${state.id}, ${action.symbol}: lemon ${action.kind} ${action.number ?? ""} ${action.text}, ours ${ours} (default ${fallback})`);
        }
    }
    if (lemonDefault !== fallback)
    {
        fail(`compressed state ${state.id}: lemon {default} ${lemonDefault}, ours ${fallback}`);
    }
    for (let t = 0; t < terminalCount; ++t)
    {
        const ours = tables.actions[mine][t];
        if (!listed.has(t) && ours !== CjsFxLemon.error && ours !== fallback)
        {
            fail(`compressed state ${state.id}, ${name(t)}: lemon error or default, ours ${ours} (default ${fallback})`);
        }
    }
}
console.log(`compression: lemon states ${compressed.length}, defaults ${defaultCount}, ours ${tables.defaults.filter(action => action !== CjsFxLemon.error).length}, default-only states omitted ${omitted}`);
console.log(failures === 0 ? "no differences" : `${failures} differences`);
process.exit(failures === 0 ? 0 : 1);
