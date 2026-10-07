import { test } from "node:test";
import assert from "node:assert/strict";
import { HLSLParser, Preprocessor, HLSLParserTokens, PreprocessorTokens } from "../../src/shadercompiler/index.js";
import { carbonTestShaders, carbonTestsSkipReason } from "./support/carbonTestShaders.js";
import { parse } from "./support/parse.js";

// The tables were compared state by state with lemon's reports for Carbon's
// grammars (scripts/compare-lemon.mjs): no differences. These tests keep the
// properties that comparison established; test/lr1-tables.test.js checks the
// full tables against an independent construction.

test("HLSLParser.y builds with lemon's token numbering, one conflict and every rule reducible", () =>
{
    const tables = HLSLParser.getTables();
    assert.equal(tables.rules.length, 358);
    assert.equal(tables.terminalCount, Object.keys(HLSLParserTokens).length + 1);
    assert.deepEqual(tables.GetTokens(), { ...HLSLParserTokens });
    assert.deepEqual(tables.unreducibleRules, []);
    assert.equal(tables.conflicts.length, 1);
    assert.equal(tables.conflicts[0].symbol, "OP_ELSE");
    assert.equal(tables.conflicts[0].kept, "shift");
});

test("Preprocessor.y builds with lemon's token numbering and no conflicts", () =>
{
    const tables = Preprocessor.getTables();
    assert.equal(tables.rules.length, 45);
    assert.deepEqual(tables.GetTokens(), { ...PreprocessorTokens });
    assert.equal(tables.conflicts.length, 0);
    assert.deepEqual(tables.unreducibleRules, []);
});

test("an else binds to the nearest if, lemon's shift resolution", () =>
{
    const { ok, state } = parse("float f( float a ) { if( a > 0 ) if( a > 1 ) return 1; else return 2; return 3; }");
    assert.equal(ok, true);
    const outer = state.GetTree().GetChild(0).GetChild(1).GetChild(0);
    const inner = outer.GetChild(1);
    assert.equal(outer.GetChildrenCount(), 2, "outer if has no else");
    assert.equal(inner.GetChildrenCount(), 3, "inner if has the else");
});

test("every shader embedded in Carbon's compiler tests parses", { skip: carbonTestsSkipReason() }, () =>
{
    const shaders = carbonTestShaders();
    assert.ok(shaders.length >= 40, `found ${shaders.length} shaders`);
    for (const { file, test: name, source } of shaders)
    {
        // GlobalInputTest fills %s placeholders with FormatString; the empty fill is one of its cases.
        const text = source.replaceAll("%s", "").slice(1);
        const { ok, messages } = parse(text);
        assert.equal(ok, true, `${file} ${name}: ${messages.join("")}`);
    }
});
