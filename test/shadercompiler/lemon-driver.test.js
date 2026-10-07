import { test } from "node:test";
import assert from "node:assert/strict";
import { CjsFxLemon } from "../../src/shadercompiler/lemon/index.js";
import { parse } from "./support/parse.js";

// The driver against lempar.c, Carbon's copy in trinity/shadercompiler: the
// end-of-input failure, accept, the stack bound in yy_shift and in yy_reduce
// for an empty rule, and default reductions running before a syntax error.

/**
 * A right-recursive grammar whose stack grows by one entry per `A`, with an
 * empty rule reduced when `B` arrives: `program ::= r. r ::= A r. r ::= e B. e ::= .`
 *
 * @param {number} stackSize Lemon's `%stack_size`.
 * @param {string[]} log Receives "e", "r", "program", "overflow" and "error <token>" as they happen.
 * @returns {CjsFxLemon} The tables.
 */
function deepGrammar(stackSize, log)
{
    return new CjsFxLemon({
        name: "deep",
        stackSize,
        rules: [
            ["program ::= r.", () => { log.push("program"); }],
            ["r ::= A r.", () => { log.push("r"); }],
            ["r ::= e B.", () => { log.push("r"); }],
            ["e ::= .", () => { log.push("e"); }]
        ],
        syntaxError: major => log.push(`error ${major}`),
        stackOverflow: () => log.push("overflow")
    });
}

test("end of input in mid-rule reports the error, fails the parse and resets the error count", () =>
{
    // lempar.c:1035-1046: the error is reported for token 0 too, then
    // yy_parse_failed pops the stack and yyerrcnt returns to -1.
    const errors = [];
    const grammar = new CjsFxLemon({
        name: "eoi",
        rules: [["program ::= A B.", null]],
        syntaxError: major => errors.push(major)
    });
    const t = grammar.GetTokens();
    const parser = grammar.CreateParser({});
    parser.Parse(t.A, null);
    parser.Parse(0, null);
    assert.deepEqual(errors, [0], "lempar.c:1035-1037 reports the end-of-input token");
    assert.equal(parser.failed, true, "lempar.c:1040-1041 yy_parse_failed");
    assert.equal(parser.accepted, false);
    assert.equal(parser.stack.length, 1, "lempar.c:821 pops to the bottom entry");
    assert.equal(parser.errorCount, -1, "lempar.c:1043 yyerrcnt = -1");
});

test("an error before end of input does not fail the parse; the end of input then does", () =>
{
    const errors = [];
    const grammar = new CjsFxLemon({
        name: "eoi2",
        rules: [["program ::= A B.", null]],
        syntaxError: major => errors.push(major)
    });
    const t = grammar.GetTokens();
    const parser = grammar.CreateParser({});
    parser.Parse(t.A, null);
    parser.Parse(t.A, null);
    assert.equal(parser.failed, false);
    assert.equal(parser.errorCount, 3, "lempar.c:1038");
    parser.Parse(0, null);
    // The end-of-input error is suppressed (yyerrcnt is 3), but the parse still fails.
    assert.deepEqual(errors, [t.A], "lempar.c:1035 reports only while yyerrcnt <= 0");
    assert.equal(parser.failed, true, "lempar.c:1040-1041");
});

test("accept runs the start rule's action, pops the stack and resets the error count", () =>
{
    // lempar.c:943-947 and yy_accept, lempar.c:853-874.
    const log = [];
    const grammar = deepGrammar(100, log);
    const t = grammar.GetTokens();
    const parser = grammar.CreateParser({});
    parser.Parse(t.A, null);
    parser.Parse(t.B, null);
    parser.Parse(0, null);
    assert.deepEqual(log, ["e", "r", "r", "program"]);
    assert.equal(parser.accepted, true);
    assert.equal(parser.failed, false);
    assert.equal(parser.stack.length, 1, "lempar.c:944 pops the accepted entry");
    assert.equal(parser.errorCount, -1, "lempar.c:864");
});

test("a shift overflows exactly when the stack already holds %stack_size entries", () =>
{
    // yy_shift, lempar.c:662-666: yystackEnd is entry %stack_size - 1
    // (lempar.c:346), and the bottom entry counts.
    const stackSize = 6;
    const log = [];
    const grammar = deepGrammar(stackSize, log);
    const t = grammar.GetTokens();
    const parser = grammar.CreateParser({});
    for (let i = 0; i < stackSize - 1; ++i)
    {
        parser.Parse(t.A, null);
    }
    assert.equal(parser.stack.length, stackSize, "five shifts fit above the bottom entry");
    assert.deepEqual(log, []);
    parser.Parse(t.A, null);
    assert.deepEqual(log, ["overflow"], "the sixth shift overflows");
    assert.equal(parser.stack.length, 1, "lempar.c:613 pops to the bottom entry");
    assert.equal(parser.errorCount, -1 - stackSize, "lempar.c:940 counts every shift, the overflowing one included");
});

test("an empty rule overflows before its action when the stack is full", () =>
{
    // yy_reduce, lempar.c:745-759: an empty rule needs room for the entry it
    // pushes, so at a full stack the overflow comes before the action runs.
    const stackSize = 6;
    const log = [];
    const grammar = deepGrammar(stackSize, log);
    const t = grammar.GetTokens();
    const parser = grammar.CreateParser({});
    for (let i = 0; i < stackSize - 1; ++i)
    {
        parser.Parse(t.A, null);
    }
    assert.equal(parser.stack.length, stackSize);
    parser.Parse(t.B, null);
    assert.deepEqual(log, ["overflow"], "e's action must not run");
    assert.equal(parser.stack.length, 1);
});

test("an empty rule one entry below the bound reduces, and the shift after it overflows", () =>
{
    const stackSize = 6;
    const log = [];
    const grammar = deepGrammar(stackSize, log);
    const t = grammar.GetTokens();
    const parser = grammar.CreateParser({});
    for (let i = 0; i < stackSize - 2; ++i)
    {
        parser.Parse(t.A, null);
    }
    assert.equal(parser.stack.length, stackSize - 1);
    parser.Parse(t.B, null);
    assert.deepEqual(log, ["e", "overflow"], "lempar.c:745-759 passes; yy_shift's check, lempar.c:662, then fails");
    assert.equal(parser.stack.length, 1);
});

test("default reductions run before a syntax error is reported", () =>
{
    // lempar.c:531-564: a terminal the state has no action for takes the
    // state's default reduce, yy_default; only a state without one reports.
    const log = [];
    const grammar = new CjsFxLemon({
        name: "defaults",
        rules: [
            ["program ::= expr SEMI.", null],
            ["expr ::= id.", () => { log.push("expr"); }],
            ["id ::= ID.", () => { log.push("id"); }]
        ],
        syntaxError: major => log.push(`error ${major}`)
    });
    const t = grammar.GetTokens();
    const parser = grammar.CreateParser({});
    parser.Parse(t.ID, null);
    parser.Parse(t.ID, null);
    assert.deepEqual(log, ["id", "expr", `error ${t.ID}`]);
});

test("Carbon reports an undeclared identifier before the unexpected token after it", () =>
{
    // `b` reduces by variable_identifier ::= OP_ID (HLSLParser.y), which
    // reports t1003, as a default reduction when `c` arrives; only then does
    // `c` meet a state with no action for it and report t1000 through
    // %syntax_error. Lemon 3.39.3's generated parser, driven over the same
    // tokens, reduces in this order.
    const { ok, messages } = parse("float a = b c;");
    assert.equal(ok, false);
    assert.equal(messages.length, 2, messages.join(""));
    assert.match(messages[0], /error t1003: undeclared identifier "b"/u);
    assert.match(messages[1], /error t1000: unexpected token 'c'/u);
});
