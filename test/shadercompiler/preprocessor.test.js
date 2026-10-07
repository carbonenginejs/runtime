import { test } from "node:test";
import assert from "node:assert/strict";
import { CompileMessageQueue, CachingIncludeHandler } from "../../src/shadercompiler/index.js";
import { createState, preprocess } from "./support/parse.js";

test("object-like and function-like macros expand", () =>
{
    assert.deepEqual(preprocess("#define A 1 + 2\nA").tokens, ["1", "+", "2"]);
    assert.deepEqual(preprocess("#define F(x, y) (x * y)\nF(a, b)").tokens, ["(", "a", "*", "b", ")"]);
    assert.deepEqual(preprocess("#define F(x) x\nF(F(q))").tokens, ["q"]);
});

test("a function-like macro name without an argument list stays a name", () =>
{
    assert.deepEqual(preprocess("#define F(x) x\nF + 1").tokens, ["F", "+", "1"]);
});

test("## pastes tokens", () =>
{
    assert.deepEqual(preprocess("#define CAT(a, b) a ## b\nCAT(foo, bar)").tokens, ["foobar"]);
    assert.deepEqual(preprocess("#define J x ## y\nJ").tokens, ["xy"]);
});

test("a backslash continues a define", () =>
{
    assert.deepEqual(preprocess("#define A 1 + \\\n 2\nA").tokens, ["1", "+", "2"]);
});

test("#if evaluates C arithmetic and defined()", () =>
{
    assert.deepEqual(preprocess("#if 2 + 3 * 4 == 14\nyes\n#else\nno\n#endif").tokens, ["yes"]);
    assert.deepEqual(preprocess("#define X\n#if defined(X)\na\n#endif\n#if defined(Y)\nb\n#endif").tokens, ["a"]);
    assert.deepEqual(preprocess("#define N 3\n#if N > 2 && !defined(M)\nbig\n#endif").tokens, ["big"]);
    assert.deepEqual(preprocess("#if 7 / 2 == 3 && 7 % 4 == 3 && -1 < 0\nc\n#endif").tokens, ["c"]);
});

test("#ifdef, #ifndef, #elif, #else and nesting select one branch", () =>
{
    const source = [
        "#define B",
        "#ifdef A",
        "a",
        "#elif defined(B)",
        "  #ifndef C",
        "  b",
        "  #else",
        "  c",
        "  #endif",
        "#else",
        "d",
        "#endif"
    ].join("\n");
    assert.deepEqual(preprocess(source).tokens, ["b"]);
});

test("#undef removes a define", () =>
{
    assert.deepEqual(preprocess("#define A 1\n#undef A\nA").tokens, ["A"]);
});

test("#error in an active block stops with Carbon's user-error message", () =>
{
    const { result, state } = preprocess("#if 1\n#error stop here\n#endif");
    assert.equal(result, 0);
    assert.match(state._messages.GetMessages()[0], /error t1043:  ?stop here/u);
    assert.deepEqual(preprocess("#if 0\n#error not reached\n#endif\nok").tokens, ["ok"]);
});

test("__LINE__ is the current line of the file", () =>
{
    assert.deepEqual(preprocess("a\n\n__LINE__").tokens, ["a", "3"]);
});

test("#line N renumbers the following line", () =>
{
    assert.deepEqual(preprocess("#line 10\n__LINE__").tokens, ["10"]);
});

test("comments are skipped and block comments count their lines", () =>
{
    assert.deepEqual(preprocess("a // b\n/* c\n d */ __LINE__").tokens, ["a", "3"]);
});

test("#include resolves relative to the including file and caches files", () =>
{
    const files = {
        "lib/common.fxh": "#include \"inner.fxh\"\n#define LIB 1\nfloat common;",
        "lib/inner.fxh": "float inner;"
    };
    const { tokens } = preprocess("#include \"lib/common.fxh\"\nLIB", files);
    assert.deepEqual(tokens, ["float", "inner", ";", "float", "common", ";", "1"]);
});

test("a missing include reports Carbon's file-not-found error", () =>
{
    const { state } = preprocess("#include \"nowhere.fxh\"\nx");
    assert.match(state._messages.GetMessages().join(""), /error t1038: file 'nowhere.fxh' not found/u);
});

test("an include inside an inactive block is not read", () =>
{
    assert.deepEqual(preprocess("#if 0\n#include \"nowhere.fxh\"\n#endif\nok").tokens, ["ok"]);
});

test("permutation pragmas are discovered with values, default, description and type", () =>
{
    const state = createState([
        "#pragma permutation(MODE, (A, B = 3, C), B, \"Render mode\", dynamic)",
        "#pragma permutation(LOD, values = (HIGH, LOW))",
        "float x;"
    ].join("\n"));
    const permutations = [];
    assert.equal(state.DiscoverPermutations(permutations), true);
    assert.equal(permutations.length, 2);
    const [mode, lod] = permutations;
    assert.equal(mode.name, "MODE");
    assert.deepEqual(mode.options.map(o => [o.name, o.value]), [["A", 0], ["B", 3], ["C", 1]]);
    assert.equal(mode.defaultOption, "B");
    assert.equal(mode.description, "Render mode");
    assert.equal(mode.type, 1);
    assert.equal(lod.defaultOption, "HIGH");
    assert.equal(lod.type, 0);
});

test("a malformed permutation pragma is a syntax error", () =>
{
    const state = createState("#pragma permutation(MODE, (A, A = 300))\nfloat x;");
    assert.equal(state.DiscoverPermutations([]), false);
    assert.match(state._messages.GetMessages().join(""), /pragma permutation/u);
});

test("messages are split, deduplicated and given the entry file's name, as Carbon's OutputMessages does", () =>
{
    const queue = new CompileMessageQueue();
    queue.SetEntryFileName("C:/effects/x.fx");
    queue.AddMessage("\\memory(3): error t1000: a\n  detail\n\\memory(4): error t1001: b\n");
    queue.AddMessage("\\memory(3): error t1000: a\n  detail\n");
    assert.deepEqual(queue.GetMessages(), ["C:/effects/x.fx(3): error t1000: a\n  detail", "C:/effects/x.fx(4): error t1001: b"]);
});

test("an absolute include path is used as written, and Open returns a copy", () =>
{
    const handler = new CachingIncludeHandler(path => (path === "/a/./b.fxh" ? "float b;" : null));
    const first = handler.Open("/a/./b.fxh");
    assert.equal(first.fullPath, "/a/./b.fxh");
    assert.equal(handler.Open("/a/b.fxh"), null);
    handler.AddPrefix("/a/./b.fxh", "#define P 1\n");
    assert.equal(first.data.text, "\nfloat b;");
    assert.equal(handler.Open("/a/./b.fxh").data.text, "\n#define P 1\nfloat b;");
});
