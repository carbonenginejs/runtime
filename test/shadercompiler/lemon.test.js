import { test } from "node:test";
import assert from "node:assert/strict";
import { CjsFxLemon } from "../../src/shadercompiler/lemon/index.js";

function run(grammar, tokens, extra = {})
{
    const parser = grammar.CreateParser(extra);
    for (const [major, minor] of tokens)
    {
        parser.Parse(major, minor);
    }
    parser.Parse(0, null);
    return { parser, extra };
}

test("expression grammar evaluates with the expected associativity and precedence", () =>
{
    const grammar = new CjsFxLemon({
        name: "calc",
        rules: [
            ["program ::= expr(A).", ({ A }, extra) => { extra.result = A; }],
            ["expr(A) ::= expr(B) PLUS term(C).", ({ B, C }) => B + C],
            ["expr(A) ::= expr(B) MINUS term(C).", ({ B, C }) => B - C],
            ["expr(A) ::= term(B).", ({ B }) => B],
            ["term(A) ::= term(B) TIMES factor(C).", ({ B, C }) => B * C],
            ["term(A) ::= factor(B).", ({ B }) => B],
            ["factor(A) ::= NUM(B).", ({ B }) => B],
            ["factor(A) ::= LPAREN expr(B) RPAREN.", ({ B }) => B]
        ]
    });
    assert.equal(grammar.conflicts.length, 0);
    const t = grammar.GetTokens();
    const { extra, parser } = run(grammar, [
        [t.NUM, 10], [t.MINUS], [t.NUM, 4], [t.MINUS], [t.NUM, 3],
        [t.PLUS], [t.NUM, 2], [t.TIMES], [t.LPAREN], [t.NUM, 1], [t.PLUS], [t.NUM, 2], [t.RPAREN]
    ]);
    assert.equal(parser.accepted, true);
    assert.equal(extra.result, 10 - 4 - 3 + 2 * (1 + 2));
});

test("terminals are numbered in order of first appearance, after $", () =>
{
    const grammar = new CjsFxLemon({
        name: "order",
        rules: [
            ["a ::= Z b.", null],
            ["b ::= Y X.", null],
            ["b ::= Z.", null]
        ]
    });
    assert.deepEqual(grammar.GetTokens(), { Z: 1, Y: 2, X: 3 });
});

test("dangling else keeps the shift, as lemon does without precedence", () =>
{
    const grammar = new CjsFxLemon({
        name: "if",
        rules: [
            ["program ::= stmt(A).", ({ A }, extra) => { extra.result = A; }],
            ["stmt(A) ::= IF COND(C) stmt(B).", ({ C, B }) => `if(${C}){${B}}`],
            ["stmt(A) ::= IF COND(C) stmt(B) ELSE stmt(E).", ({ C, B, E }) => `if(${C}){${B}}else{${E}}`],
            ["stmt(A) ::= S(B).", ({ B }) => B]
        ]
    });
    assert.equal(grammar.conflicts.length, 1);
    assert.equal(grammar.conflicts[0].kept, "shift");
    const t = grammar.GetTokens();
    const { extra } = run(grammar, [[t.IF, "a"], [t.COND, "a"], [t.IF, "b"], [t.COND, "b"], [t.S, "x"], [t.ELSE], [t.S, "y"]]);
    assert.equal(extra.result, "if(a){if(b){x}else{y}}");
});

test("reduce/reduce keeps the earlier rule", () =>
{
    const grammar = new CjsFxLemon({
        name: "rr",
        rules: [
            ["program ::= x(A).", ({ A }, extra) => { extra.result = A; }],
            ["x(A) ::= first(B).", ({ B }) => B],
            ["x(A) ::= second(B).", ({ B }) => B],
            ["first(A) ::= ID.", () => "first"],
            ["second(A) ::= ID.", () => "second"]
        ]
    });
    assert.ok(grammar.conflicts.length > 0);
    const t = grammar.GetTokens();
    assert.equal(run(grammar, [[t.ID]]).extra.result, "first");
});

test("an empty rule's action runs when the next token arrives, before that token shifts", () =>
{
    const log = [];
    const grammar = new CjsFxLemon({
        name: "scope",
        rules: [
            ["program ::= block.", null],
            ["block ::= LBRACE enter ID(B) RBRACE.", ({ B }) => { log.push(`id ${B}`); }],
            ["enter ::= .", () => { log.push("enter"); }]
        ]
    });
    const t = grammar.GetTokens();
    const parser = grammar.CreateParser({});
    parser.Parse(t.LBRACE);
    log.push("scanned id");
    parser.Parse(t.ID, "x");
    parser.Parse(t.RBRACE);
    parser.Parse(0, null);
    assert.deepEqual(log, ["scanned id", "enter", "id x"]);
});

test("a syntax error is reported once and further reports wait for three shifts", () =>
{
    const errors = [];
    const grammar = new CjsFxLemon({
        name: "errors",
        rules: [
            ["program ::= list.", null],
            ["list ::= list A.", null],
            ["list ::= A.", null],
            ["unused ::= B.", null]
        ],
        syntaxError: (major) => errors.push(major)
    });
    const t = grammar.GetTokens();
    const parser = grammar.CreateParser({});
    parser.Parse(t.A);
    parser.Parse(t.B);
    parser.Parse(t.B);
    parser.Parse(t.A);
    parser.Parse(t.A);
    parser.Parse(t.A);
    parser.Parse(t.B);
    parser.Parse(0, null);
    assert.deepEqual(errors, [t.B, t.B]);
    assert.equal(parser.accepted, true);
});

/**
 * The state whose kernel is exactly these `[ruleIndex, dot]` items.
 *
 * @param {CjsFxLemon} grammar The tables.
 * @param {Array<[number, number]>} kernel The kernel.
 * @returns {number} The state number.
 */
function stateWithKernel(grammar, kernel)
{
    const key = items => items.map(([rule, dot]) => `${rule}.${dot}`).sort().join(",");
    const state = grammar.kernels.findIndex(items => key(items) === key(kernel));
    assert.notEqual(state, -1, `no state has kernel ${key(kernel)}`);
    return state;
}

test("a state's default is the reduce on the most terminals (lemon.c CompressTables)", () =>
{
    // After X Z, a ::= Z reduces on P and R, b ::= Z on Q: a wins, 2 to 1
    // (lemon.c:5011-5021).
    const grammar = new CjsFxLemon({
        name: "most",
        rules: [
            ["program ::= s.", null],
            ["s ::= X b Q.", null],
            ["s ::= X a P.", null],
            ["s ::= X a R.", null],
            ["a ::= Z.", null],
            ["b ::= Z.", null]
        ]
    });
    const t = grammar.GetTokens();
    const state = stateWithKernel(grammar, [[4, 1], [5, 1]]);
    assert.equal(grammar.defaults[state], CjsFxLemon.reduceAction(4));
    assert.equal(grammar.FindShiftAction(state, t.Q), CjsFxLemon.reduceAction(5), "an explicit reduce is kept");
    assert.equal(grammar.FindShiftAction(state, t.X), CjsFxLemon.reduceAction(4), "any other terminal takes the default");
});

test("a tie goes to the rule whose first terminal is lowest (lemon.c:5018, a strict >)", () =>
{
    const build = rules => new CjsFxLemon({ name: "tie", rules: [["program ::= s.", null], ...rules, ["a ::= Z.", null], ["b ::= Z.", null]] });
    // P is numbered before Q, so a's reduce on P comes first in lemon's action order.
    const aFirst = build([["s ::= X a P.", null], ["s ::= X b Q.", null]]);
    assert.equal(aFirst.defaults[stateWithKernel(aFirst, [[3, 1], [4, 1]])], CjsFxLemon.reduceAction(3));
    const bFirst = build([["s ::= X b Q.", null], ["s ::= X a P.", null]]);
    assert.equal(bFirst.defaults[stateWithKernel(bFirst, [[3, 1], [4, 1]])], CjsFxLemon.reduceAction(4));
});

test("a start-symbol rule is never a default (lemon.c:5009)", () =>
{
    const errors = [];
    const grammar = new CjsFxLemon({
        name: "start",
        rules: [["program ::= A.", null]],
        syntaxError: major => errors.push(major)
    });
    const t = grammar.GetTokens();
    const state = stateWithKernel(grammar, [[0, 1]]);
    assert.equal(grammar.defaults[state], CjsFxLemon.error);
    const parser = grammar.CreateParser({});
    parser.Parse(t.A, null);
    parser.Parse(t.A, null);
    assert.deepEqual(errors, [t.A], "the second A is an error in the state that would accept");
    parser.Parse(0, null);
    assert.equal(parser.accepted, true);
});
