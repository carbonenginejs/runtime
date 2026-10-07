import { test } from "node:test";
import assert from "node:assert/strict";
import { ParserUtils, FXAnalyzer, ASTNode, Type, HLSLParserTokens, InlineString } from "../../src/shadercompiler/index.js";
import { parse, dumpTree, createState } from "./support/parse.js";

const { NT_FUNCTION_DEFINITION, NT_TECHNIQUE } = ASTNode.ASTNodeType;

/**
 * The global symbol of a name in a parsed program.
 *
 * @param {import("../../src/shadercompiler/index.js").ParserState} state The parse.
 * @param {string} name The name.
 * @returns {import("../../src/shadercompiler/index.js").Symbol} The symbol.
 */
function global(state, name)
{
    const symbol = state.GetSymbolTable().LookupGlobal(name);
    assert.ok(symbol, `no global ${name}`);
    return symbol;
}

test("declarations, structs, swizzles and calls carry their types", () =>
{
    const { ok, state, messages } = parse([
        "struct Light { float3 position; float4 color; };",
        "Light light;",
        "float4x4 world;",
        "float3 Shade( float3 n ) { return n * light.color.rgb + mul( float4( n, 1 ), world ).xyz; }"
    ].join("\n"));
    assert.equal(ok, true, messages.join(""));
    assert.equal(global(state, "light").type.ToString(), "Light");
    assert.equal(global(state, "world").type.ToString(), "float4x4");
    const tree = dumpTree(state.GetTree());
    assert.match(tree, /NT_POSTFIX_EXPRESSION 'rgb' : float3/u);
    assert.match(tree, /NT_FUNCTION_CALL 'mul' #mul : float4/u);
    assert.match(tree, /NT_POSTFIX_EXPRESSION 'xyz' : float3/u);
});

test("a struct name scans as a type name once declared", () =>
{
    const { ok, state } = parse("struct S { float a; }; S Make() { S s; s.a = 1; return s; } S g = (S)0;");
    // Carbon's grammar gives a C-style cast its target type without checking the operand.
    assert.equal(ok, true);
    const tree = dumpTree(state.GetTree());
    assert.match(tree, /NT_FUNCTION_HEADER 'Make' #Make : S/u);
    assert.match(tree, /NT_CAST_EXPRESSION 'S' : S\n\s+NT_CONSTANT '0' : int/u);
});

test("overloads resolve to the candidate with the fewest conversions", () =>
{
    const { ok, state, messages } = parse([
        "float f( float a ) { return a; }",
        "int f( int a ) { return a; }",
        "float g() { return f( 1 ) + f( 1.0 ); }"
    ].join("\n"));
    assert.equal(ok, true, messages.join(""));
    const tree = dumpTree(state.GetTree());
    assert.match(tree, /NT_FUNCTION_CALL 'f' #f : int\n\s+NT_CONSTANT '1' : int/u);
    assert.match(tree, /NT_FUNCTION_CALL 'f' #f : float\n\s+NT_CONSTANT '1.0' : float/u);
});

test("an undeclared identifier is reported with Carbon's message", () =>
{
    const { ok, messages } = parse("float f() { return missing; }");
    assert.equal(ok, false);
    assert.match(messages.join(""), /\(1\): error t1003: undeclared identifier "missing"/u);
});

test("array sizes are evaluated constants", () =>
{
    const { ok, state } = parse("static const int N = 3;\nfloat a[2 * N + 1];\nfloat4 m[N][2];");
    assert.equal(ok, true);
    assert.equal(global(state, "a").type.ToString(), "float[7]");
    assert.equal(global(state, "m").type.ToString(), "float4[3][2]");
});

test("registers, semantics, annotations and cbuffers are recorded", () =>
{
    const { ok, state, messages } = parse([
        "cbuffer PerFrame : register( b2 ) { float4 sunDirection; };",
        "Texture2D diffuse : register( t3 ) < string UIName = \"Diffuse\"; float UIMin = 0.5; >;",
        "float4 ps( float4 pos : SV_Position ) : SV_Target { return diffuse.Load( int3( pos.xy, 0 ) ) * sunDirection; }"
    ].join("\n"));
    assert.equal(ok, true, messages.join(""));
    const buffer = state.GetSymbolTable().LookupBuffer(InlineString.makeInlineString("PerFrame"));
    assert.equal(buffer.registerSpecifier.get("").registerNumber, 2);
    const diffuse = global(state, "diffuse");
    const register = diffuse.registerSpecifier.get("");
    assert.equal(register.registerType, "t");
    assert.equal(register.registerNumber, 3);
    assert.deepEqual(diffuse.annotations.map(a => [a.name.ToString(), a.value.stringValue.ToString()]), [["UIName", "\"Diffuse\""], ["UIMin", "0.5"]]);
    assert.equal(global(state, "ps").semantic.ToString(), "SV_Target");
});

test("MarkUsedSymbols marks what one entry point reaches", () =>
{
    const { ok, state } = parse([
        "Texture2D<float3> tex;",
        "float4 unused;",
        "float4 vs() : SV_Position { return float4( 0, 0, 0, 1 ); }",
        "float4 ps() : SV_Target { return float4( tex[int2( 0, 0 )], 1.0 ); }",
        "technique t0 { pass p0 { vertexshader = compile vs_3_0 vs(); pixelshader = compile ps_3_0 ps(); } }"
    ].join("\n"));
    assert.equal(ok, true);
    const ps = global(state, "ps");
    ParserUtils.MarkUsedSymbols(ps.definition, state);
    assert.equal(global(state, "tex").used, true);
    assert.equal(global(state, "unused").used, false);
    assert.equal(global(state, "vs").used, false);
    assert.equal(ps.used, true);

    state.GetSymbolTable().ResetUsedFlag();
    ParserUtils.MarkUsedSymbols(global(state, "vs").definition, state);
    assert.equal(global(state, "tex").used, false);
});

test("pass blocks parse in FX mode: state names and values are identifiers", () =>
{
    const { ok, state, messages } = parse([
        "float4 ps() : SV_Target { return 1; }",
        "technique Main { pass p0 { CullMode = CW; ZEnable = false; SrcBlend = SrcAlpha; pixelshader = compile ps_5_0 ps(); } }"
    ].join("\n"));
    assert.equal(ok, true, messages.join(""));
    const technique = state.GetTree().GetChildren().find(n => n.GetNodeType() === NT_TECHNIQUE);
    const pass = technique.GetChild(0);
    const values = {};
    for (const assignment of pass.GetChildren())
    {
        if (assignment.GetNodeType() === ASTNode.ASTNodeType.NT_STATE_ASSIGNMENT)
        {
            const blob = { value: -1 };
            assert.equal(FXAnalyzer.ParseStateAssignment(state, assignment, FXAnalyzer.g_renderStates, blob), true);
            values[assignment.GetToken().stringValue.ToString()] = blob.value;
        }
    }
    // CW maps to D3DCULL_CCW: Carbon's comment calls it the LH to RH conversion.
    assert.deepEqual(values, { CullMode: 3, ZEnable: 0, SrcBlend: 5 });
});

test("a sampler_state block becomes a static sampler description", () =>
{
    const { ok, state, messages } = parse([
        "SamplerState pointWrap { Filter = MIN_MAG_MIP_POINT; AddressU = WRAP; AddressV = MIRROR; MaxAnisotropy = 4; BorderColor = float4( 1, 1, 1, 1 ); };",
        "SamplerState dynamicSampler;"
    ].join("\n"));
    assert.equal(ok, true, messages.join(""));
    const sampler = { borderColor: { x: 0, y: 0, z: 0, w: 0 } };
    assert.equal(FXAnalyzer.GetSamplerState(state, global(state, "pointWrap").definition, sampler), true);
    assert.equal(sampler.isDynamic, 0);
    assert.deepEqual([sampler.minFilter, sampler.magFilter, sampler.mipFilter, sampler.comparison], [1, 1, 1, 0]);
    assert.deepEqual([sampler.addressU, sampler.addressV, sampler.addressW], [1, 2, 3]);
    assert.equal(sampler.maxAnisotropy, 4);
    assert.deepEqual(sampler.borderColor, { x: 1, y: 1, z: 1, w: 1 });

    const staticSampler = {};
    assert.equal(FXAnalyzer.ConvertToStaticSampler(staticSampler, sampler), true);
    assert.equal(staticSampler.borderColor, 0, "not a border address mode, so the colour is not stored");

    const dynamic = { borderColor: { x: 0, y: 0, z: 0, w: 0 } };
    assert.equal(FXAnalyzer.GetSamplerState(state, global(state, "dynamicSampler").definition, dynamic), true);
    assert.equal(dynamic.isDynamic, 1);
    assert.equal(FXAnalyzer.ConvertToStaticSampler({}, dynamic), false);
});

test("CreateGlobalsCB gathers plain globals into cbuffer Globals : register( b0 )", () =>
{
    const { ok, state } = parse("float a;\nfloat4 b;\nTexture2D t;\nfloat4 f() { return b * a; }");
    assert.equal(ok, true);
    ParserUtils.CreateGlobalsCB(state);
    const tree = dumpTree(state.GetTree());
    assert.match(tree, /^NT_PROGRAM : \n {2}NT_CBUFFER 'cbuffer' #Globals : \n {4}NT_VAR_DECLARATION_LIST : float4\n/u);
    assert.ok(tree.indexOf("#t :") > tree.indexOf("NT_CBUFFER"), "the texture stays outside");
});

test("Type.getCommonType promotes to the higher-precedence component type", () =>
{
    const t = new Type();
    assert.equal(Type.getCommonType(Type.typeFromTokenType(HLSLParserTokens.OP_INT, 3), Type.typeFromTokenType(HLSLParserTokens.OP_FLOAT), t), true);
    assert.equal(t.ToString(), "float3");
    assert.equal(Type.getCommonType(Type.typeFromTokenType(HLSLParserTokens.OP_FLOAT, 4), Type.typeFromTokenType(HLSLParserTokens.OP_FLOAT, 2), t), true);
    assert.equal(t.ToString(), "float2");
});

test("function definitions keep their attribute lists", () =>
{
    const { ok, state } = parse("[numthreads( 8, 8, 1 )] void cs() { }");
    assert.equal(ok, true);
    const definition = state.GetTree().GetChildren().find(n => n.GetNodeType() === NT_FUNCTION_DEFINITION);
    assert.match(dumpTree(definition.GetChild(2)), /NT_FUNCTION_ATTRIBUTE 'numthreads'/u);
});

test("packoffset with a non-c register reports and keeps the number, as Carbon parses into subComponent", () =>
{
    const { ok, messages, state } = parse("cbuffer C { float z : packoffset(b3); };");
    assert.equal(ok, false);
    assert.match(messages.join(""), /error t1006: invalid pack offset/u);
    assert.equal(state.GetSymbolTable().LookupGlobal("z").packOffset.subComponent, 3);
});

test("a ## result is classified by its longest leading match, as Carbon's re-scan does", () =>
{
    // `return-` reads as `return`, so `R 1;` is `return 1;`.
    assert.equal(parse("#define R return ## -\nint f() { R 1; }").ok, true);
    // `float4.` reads as the type float4.
    const { ok, state } = parse("#define V float4 ## .\nV v;");
    assert.equal(ok, true);
    assert.equal(state.GetSymbolTable().LookupGlobal("v").type.ToString(), "float4");
});

test("a generated float literal is printf %f text, ties to even", () =>
{
    const state = createState("float x;");
    const text = value => ParserUtils.NewLiteralConst__Float(state, value).GetToken().stringValue.ToString();
    assert.equal(text(1.5), "1.500000");
    assert.equal(text(0.0078125), "0.007812");
    assert.equal(text(-0), "-0.000000");
    assert.equal(text(-1e-9), "-0.000000");
    assert.equal(text(1e21), "1000000020040877342720.000000");
    assert.equal(text(Infinity), "inf");
});

test("a C-string comparison ends at the string's first NUL", () =>
{
    const { state } = parse("float ab;");
    assert.notEqual(state.GetSymbolTable().LookupGlobal("ab\u0000cd"), null);
    assert.equal(InlineString.makeInlineString("ab").Equals__Chars("ab\u0000zz"), true);
    assert.equal(InlineString.makeInlineString("ab\u0000x").Equals(InlineString.makeInlineString("ab\u0000y")), true);
});

test("a float render state stores its bits in the state's DWORD", () =>
{
    const { state } = parse("float4 ps() : SV_Target { return 0; }\ntechnique t { pass p { DepthBias = 0.5; PixelShader = compile ps_5_0 ps(); } }");
    const node = state.GetTree().GetChildren().find(n => n.GetNodeType() === NT_TECHNIQUE).GetChild(0).GetChild(0);
    const blob = { value: 0 };
    assert.equal(FXAnalyzer.ParseStateAssignment(state, node, FXAnalyzer.g_renderStates, blob), true);
    assert.equal(blob.value, 0x3f000000);
});
