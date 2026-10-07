// Carbon defects the port reproduces on purpose, one test per entry in the
// organization's Carbon known-defects register. A port never silently fixes
// Carbon: assets and shaders were built against this behaviour. If one of
// these starts failing, the port has drifted from Carbon. Where Carbon's
// behaviour is undefined, the port throws and names the entry; those tests
// assert the throw.

import { test } from "node:test";
import assert from "node:assert/strict";
import { ParserUtils, FXAnalyzer, InlineString, ASTNode } from "../../src/shadercompiler/index.js";
import { parse, preprocess, createState } from "./support/parse.js";
import { GetSourceHash } from "../../src/shadercompiler/ShaderCompiler/shaderCompiler.js";
import { ShaderCompilerSession } from "../../src/shadercompiler/ShaderCompiler/ShaderCompilerSession.js";

/**
 * Every node of a type in a tree, depth first.
 *
 * @param {import("../../src/shadercompiler/index.js").ASTNode|null} node The root.
 * @param {number} type An `ASTNodeType` value.
 * @param {import("../../src/shadercompiler/index.js").ASTNode[]} [out=[]] Receives the nodes.
 * @returns {import("../../src/shadercompiler/index.js").ASTNode[]} The nodes.
 */
function findNodes(node, type, out = [])
{
    if (node)
    {
        if (node.GetNodeType() === type)
        {
            out.push(node);
        }
        for (const child of node.GetChildren())
        {
            findNodes(child, type, out);
        }
    }
    return out;
}

/**
 * The first array size of global `a` after parsing `source`.
 *
 * @param {string} source HLSL text declaring `a`.
 * @returns {number} `a`'s size.
 */
function arraySizeOfA(source)
{
    const { state } = parse(source);
    return state.GetSymbolTable().LookupGlobal("a").type.arraySizes[0];
}

/**
 * The permutations `source` declares, as Carbon's discovery pass finds them.
 *
 * @param {string} source HLSL text.
 * @returns {{ ok: boolean, permutations: object[], messages: string[] }} The result.
 */
function discover(source)
{
    const state = createState(source);
    const permutations = [];
    const ok = state.DiscoverPermutations(permutations);
    return { ok, permutations, messages: state._messages.GetMessages() };
}

test("CE-57: #if evaluates >> as a left shift", () =>
{
    assert.deepEqual(preprocess("#if (8 >> 1) == 16\nshiftedLeft\n#endif").tokens, ["shiftedLeft"]);
});

test("CE-58: ParseString turns an octal escape into NUL and keeps the digits", () =>
{
    assert.equal(ParserUtils.ParseString(InlineString.makeInlineString("\"a\\101b\"")), "a\u000001b");
    assert.equal(ParserUtils.ParseString(InlineString.makeInlineString("\"\\x41\"")), "\u0000x41");
});

test("CE-59: a generated false literal carries the integer value 1", () =>
{
    const state = createState("float x;");
    assert.equal(ParserUtils.NewLiteralConst__Bool(state, false).GetToken().intValue, 1);
});

test("CE-60: #line N \"file\" numbers the next line 0", () =>
{
    const { tokens, state } = preprocess("#line 10 \"other.fx\"\n__LINE__");
    assert.deepEqual(tokens, ["0"]);
    assert.equal(state.GetCurrentLocation().fileName.ToString(), "other.fx");
});

test("CE-61: vector<T, N> and matrix<T, R, C> lose their dimensions", () =>
{
    const { ok, state } = parse("vector<float, 3> v;\nmatrix<float, 4, 4> m;");
    assert.equal(ok, true);
    assert.equal(state.GetSymbolTable().LookupGlobal("v").type.ToString(), "float");
    assert.equal(state.GetSymbolTable().LookupGlobal("m").type.ToString(), "float");
});

test("CE-62: DepthTexture2DArray scans as DepthTexture2D", () =>
{
    const { ok, state } = parse("DepthTexture2DArray d;");
    assert.equal(ok, true);
    assert.equal(state.GetSymbolTable().LookupGlobal("d").type.ToString(), "DepthTexture2D");
});

test("CE-63: a second #else is accepted and its block is active", () =>
{
    assert.deepEqual(preprocess("#if 0\na\n#else\nb\n#else\nc\n#endif").tokens, ["b", "c"]);
});

test("CE-64: PrimitiveIndex has ReportHit's signature and ReportHit is undeclared", () =>
{
    const call = parse("float f() { return PrimitiveIndex(); }");
    assert.equal(call.ok, true);
    assert.match(call.messages.join(""), /^$/u);
    const report = parse("void f() { ReportHit( 1.0, 0, 0 ); }");
    assert.equal(report.ok, false);
    assert.match(report.messages.join(""), /error t1011: no suitable function override found for function call "ReportHit"/u);
});

test("CE-65: an AppendStructuredBuffer accepts Consume", () =>
{
    const { ok } = parse("AppendStructuredBuffer<float4> b;\nfloat4 f() { return b.Consume(); }");
    assert.equal(ok, true);
});

test("CE-66: for( ;; ) and a leading semicolon read the location of a null node", () =>
{
    assert.throws(() => parse("void f() { for( ;; ) { } }"), TypeError);
    assert.throws(() => parse(";\nfloat x;"), TypeError);
});

test("CE-67: CreateGlobalsCB reads child 0 of an empty program", () =>
{
    const state = createState("float x;");
    state.SetTree(state.NewNode(ASTNode.ASTNodeType.NT_PROGRAM));
    assert.throws(() => ParserUtils.CreateGlobalsCB(state), /child 0 of 0/u);
});

test("CE-68: an empty macro argument, or one across buffers, is undefined in Carbon and throws here", () =>
{
    assert.throws(() => preprocess("#define F(x) x\nF()"), /empty macro argument \(Carbon known defect CE-68\)/u);
    assert.throws(() => preprocess("#define F(x) x\nF(__LINE__ + 1)"), /spans buffers \(Carbon known defect CE-68\)/u);
});

test("CE-68: an argument whose ends share a buffer spans the text between them", () =>
{
    // `A` expands from the #define line, `b` is read in place: the argument's
    // range runs from the define's `x` to the `b` of the call.
    const { tokens } = preprocess("#define A x\n#define F(a) [a]\nF(A b)\n");
    assert.deepEqual(tokens.slice(0, 2), ["[", "x"]);
});

test("CE-69: the constant evaluator accepts a swizzle one past the vector, and matrix digits past its size", () =>
{
    assert.throws(() => parse("float a[int2( 4, 5 ).z];"), /component 2 of a 2-component constant \(Carbon known defect CE-69\)/u);
    assert.throws(() => parse("float a[float2x2( 1, 2, 3, 4 )._m22];"), /component 6 of a 4-component constant \(Carbon known defect CE-69\)/u);
});

test("CE-70: redefining a struct member dereferences a null symbol", () =>
{
    assert.throws(() => parse("struct S { float a; float a; };"), TypeError);
});

test("CE-71: ## pastes one Carbon token, and Carbon scans 2D as two", () =>
{
    // C would paste the pp-number `2D` whole and give Texture2D.
    assert.deepEqual(preprocess("#define NAME(n) Texture ## n\nNAME(2D)").tokens, ["Texture2", "D"]);
});

test("CE-72: a ninth array dimension overflows Type::arraySizes", () =>
{
    assert.equal(parse("const float y[1][2][3][4][5][6][7][8] = { 0 };").state.GetSymbolTable().LookupGlobal("y").type.arrayDimensions, 8);
    assert.throws(() => parse("const float y[1][2][3][4][5][6][7][8][9];"), /Carbon known defect CE-72/u);
});

test("CE-73: concatenated string literals keep the text between them", () =>
{
    const { state } = parse("float x < string s = \"ab\" /*c*/ \"cd\"; > = 0;");
    const value = state.GetSymbolTable().LookupGlobal("x").annotations[0].value.stringValue;
    assert.equal(ParserUtils.ParseString(value), "ab\" /*c*/ \"cd");
});

test("CE-74: constant subscripts are not checked against the value", () =>
{
    assert.throws(() => parse("float a[int2( 4, 5 )[3]];"), /component 3 of a 2-component constant \(Carbon known defect CE-74\)/u);
    // A negative matrix row passes Carbon's signed test and reads before the value.
    assert.throws(() => parse("float a[float2x2( 1, 2, 3, 4 )[-1].x + 1];"), /Carbon known defect CE-74/u);
});

test("CE-75: binary operators follow the left operand's type", () =>
{
    assert.equal(arraySizeOfA("float a[2.0 + 1];"), 3);
    assert.throws(() => parse("float a[1 + 2.0];"), /uninitialised ExpressionValueElement member \(Carbon known defect CE-75\)/u);
});

test("CE-76: a non-square matrix is indexed with the wrong stride", () =>
{
    // HLSL's float2x3 has rows (1,2,3) and (4,5,6); _m10 is 4 and [2] does not exist.
    assert.equal(arraySizeOfA("float a[float2x3( 1, 2, 3, 4, 5, 6 )._m10];"), 3);
    assert.equal(arraySizeOfA("float a[float2x3( 1, 2, 3, 4, 5, 6 )[2].x];"), 5);
});

test("CE-77: a scalar integer border colour broadcasts instead of reading as 0xAARRGGBB", () =>
{
    const { state } = parse("SamplerState s = sampler_state { BorderColor = 0x00FF0000; };");
    const sampler = { borderColor: { x: 0, y: 0, z: 0, w: 0 } };
    assert.equal(FXAnalyzer.GetSamplerState(state, findNodes(state.GetTree(), ASTNode.ASTNodeType.NT_NAME_DECLARATION)[0], sampler), true);
    assert.deepEqual(sampler.borderColor, { x: 16711680, y: 16711680, z: 16711680, w: 16711680 });
});

test("CE-78: ColorWriteEnable1 to 3 are booleans", () =>
{
    const { state } = parse("float4 ps() : SV_Target { return 0; }\ntechnique t { pass p { ColorWriteEnable = 7; ColorWriteEnable1 = 7; PixelShader = compile ps_5_0 ps(); } }");
    const values = findNodes(state.GetTree(), ASTNode.ASTNodeType.NT_STATE_ASSIGNMENT).slice(0, 2).map(node =>
    {
        const blob = { value: 0 };
        FXAnalyzer.ParseStateAssignment(state, node, FXAnalyzer.g_renderStates, blob);
        return blob.value;
    });
    assert.deepEqual(values, [7, 1]);
});

test("CE-79: an automatically placed register can collide with an explicit one", () =>
{
    const { state } = parse("Texture2D a : register(t0);\nTexture2D b;");
    const symbols = ["a", "b"].map(name => state.GetSymbolTable().LookupGlobal(name));
    symbols.forEach(symbol => (symbol.used = true));
    ParserUtils.AssignRegisters(state.GetTree(), 1);
    assert.deepEqual(symbols.map(symbol => [...symbol.registerSpecifier.values()].map(r => `${r.registerType}${r.registerNumber}`)), [["t0"], ["t0"]]);
});

test("CE-80: CommonArgType lets the last argument that beats argument 0 win", () =>
{
    const { state } = parse("half h;\nfloat f() { return clamp( 1, 2.0, h ); }");
    const call = findNodes(state.GetTree(), ASTNode.ASTNodeType.NT_FUNCTION_CALL)[0];
    assert.equal(call.GetType().ToString(), "half");
});

test("CE-81: a failed lookup among candidates that include an intrinsic dereferences its null definition", () =>
{
    assert.throws(() => parse("float saturate(float3 a, float b) { return b; }\nfloat f() { return saturate( 1.0, 2.0, 3.0 ); }"), TypeError);
    // CE-64 registers two intrinsics named InstanceIndex, so every call fails this way.
    assert.throws(() => parse("uint f() { return InstanceIndex(); }"), TypeError);
});

test("CE-82: the fixed constant buffer slots match by prefix", () =>
{
    assert.equal(ParserUtils.GetCBufferIndex(InlineString.makeInlineString("Globalscale")), 0);
    assert.equal(ParserUtils.GetCBufferIndex(InlineString.makeInlineString("PerFrameVSExtra")), 1);
});

test("CE-83: fixed-size name and message buffers overflow", () =>
{
    const state = createState("float x;");
    for (let i = 0; i < 10000; ++i)
    {
        state.AllocateName();
    }
    assert.throws(() => state.AllocateName(), /Carbon known defect CE-83/u);
    assert.throws(() => parse(`#error ${"x".repeat(3000)}\nfloat x;`), /2048-character buffer \(Carbon known defect CE-83\)/u);
});

test("CE-84: trapping divisions and unrepresentable conversions are unchecked", () =>
{
    assert.throws(() => parse("float a[1 / 0];"), /Carbon known defect CE-84/u);
    assert.throws(() => parse("static const int m = -2147483647 - 1;\nfloat a[m / -1];"), /Carbon known defect CE-84/u);
    assert.throws(() => parse("float a[(int)3e9];"), /Carbon known defect CE-84/u);
    assert.throws(() => preprocess("#if 1 / 0\n#endif"), /Carbon known defect CE-84/u);
    assert.throws(() => preprocess("#if (-2147483647 - 1) / -1\n#endif"), /Carbon known defect CE-84/u);
    assert.throws(() => ParserUtils.ParseRegisterID(InlineString.makeInlineString("u99999999999"), { registerType: "", registerNumber: 0 }), /Carbon known defect CE-84/u);
    assert.equal(parse("Texture2D t : register(t0, space2);").ok, true);
    assert.throws(() => parse("Texture2D t : register(t0, space99999999999);"), /Carbon known defect CE-84/u);
});

test("CE-85: a lone candidate function is chosen without checking the arguments", () =>
{
    const { ok, messages } = parse("float g(float3 a) { return a.x; }\nfloat h() { return g( 1.0, 2.0 ); }");
    assert.equal(ok, true);
    assert.deepEqual(messages, []);
});

test("CE-86: permutation discovery stops at the first other pragma", () =>
{
    assert.equal(discover("#pragma permutation(M, (A, B))\n#pragma pack_matrix(row_major)\nfloat x;").permutations.length, 1);
    assert.equal(discover("#pragma pack_matrix(row_major)\n#pragma permutation(M, (A, B))\nfloat x;").permutations.length, 0);
});

test("CE-87: a failed #if leaves condition mode on, and discovery reads a skipped block", () =>
{
    assert.equal(discover("#ifdef NOPE\n#pragma permutation(M, (A, B))\n#endif\nfloat x;").permutations.length, 0);
    assert.equal(discover("#if 1 $\n#endif\n#ifdef NOPE\n#pragma permutation(M, (A, B))\n#endif\nfloat x;").permutations.length, 1);
});

test("CE-88: a bare `defined`, or another name called in #if, leaves the value uninitialised", () =>
{
    assert.throws(() => preprocess("#if defined\nx\n#endif"), /Carbon known defect CE-88/u);
    assert.throws(() => preprocess("#if FOO(X)\nx\n#endif"), /Carbon known defect CE-88/u);
});

test("CE-89: inactive blocks are still scanned", () =>
{
    assert.match(parse("#if 0\ndon't\n#endif\nfloat x;").messages.join(""), /error t1002: unexpected character '''/u);
    assert.match(parse("#if 0\n#include nowhere\n#endif\nfloat x;").messages.join(""), /error t1041: invalid include path/u);
});

test("CE-90: a block comment opened on a directive line leaks its remainder", () =>
{
    assert.deepEqual(preprocess("#define A 1 /* c\nd */\nA").tokens, ["d", "*", "/", "1"]);
});

test("CE-91: #define parameter names are macro-expanded", () =>
{
    assert.match(parse("#define N 3\n#define F(N) N\nfloat x;").messages.join(""), /error t1000: unexpected token '3'/u);
});

test("CE-92: a function-like macro produced as another macro's last token is not invoked", () =>
{
    assert.deepEqual(preprocess("#define F(x) x\n#define G F\nG(1)").tokens, ["F", "(", "1", ")"]);
});

test("CE-93: #pragma permutation_x counts as a permutation pragma", () =>
{
    const { ok, messages } = discover("#pragma permutation_x\nfloat x;");
    assert.equal(ok, false);
    assert.match(messages.join(""), /error t1000: unexpected token 'pragma permutation'/u);
});

test("CE-94: a message containing `memory:` loses everything before it", () =>
{
    assert.deepEqual(parse("#error out of memory: x\nfloat x;").messages, [": x"]);
});

test("CE-96: a parenthesised constant expression does not evaluate", () =>
{
    assert.equal(arraySizeOfA("float a[8];"), 8);
    assert.equal(arraySizeOfA("float a[(8)];"), 0);
});

test("CE-97: GetSourceHash roots a relative entry path at the file itself and hashes no source", () =>
{
    const files = { "fx/a.fx": "float a;", "fx/b.fx": "float b;", "/fx/a.fx": "float a;", "/fx/b.fx": "float b;" };
    const session = new ShaderCompilerSession({ read: path => (Object.hasOwn(files, path) ? files[path] : null), compilerFactories: new Map() });
    // Relative: each resolves to "fx/x.fx/fx/x.fx", so only the settings are hashed.
    assert.equal(GetSourceHash("fx/a.fx", [], session), GetSourceHash("fx/b.fx", [], session));
    // Absolute paths are used as written, and the sources differ.
    assert.notEqual(GetSourceHash("/fx/a.fx", [], session), GetSourceHash("/fx/b.fx", [], session));
});
