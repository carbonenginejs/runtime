// Carbon's texture-access passes (TextureFunctionConversionDX11.cpp), driven
// on parsed HLSL and checked by printing the rewritten tree back with the
// ported HLSL and Metal printers. Carbon's own test of these passes,
// MetalConversionTest.cpp `TextureIndexingWorks`, needs the native Metal
// compiler; its expected source text is asserted here on the printed tree.

import { test } from "node:test";
import assert from "node:assert/strict";
import { ASTNode, HLSLParserTokens } from "../../src/shadercompiler/index.js";
import { parse } from "./support/parse.js";
import {
    ConvertTextureFunctionsDX11,
    TransferSRGBToTexturesDX11,
    ConvertTextureFunctionsToMetal,
    MergeSamplers,
    BindlessTextureType,
    SplitCoordVec
} from "../../src/shadercompiler/TextureFunctionConversionDX11/index.js";
import { CodeStream, WriteHLSL, WriteMSL } from "../../src/shadercompiler/OutputHLSL/index.js";
import { Type } from "../../src/shadercompiler/Type.js";
import { Texture } from "../../src/shadercompiler/EffectData/Texture.js";

const T = HLSLParserTokens;
const N = ASTNode.ASTNodeType;

/**
 * A code stream that prints one line per `Endl` and ignores locations and
 * indentation, so a printed expression is easy to compare.
 */
class TestStream extends CodeStream
{
    Endl()
    {
        this.Write("");
    }

    ChangeLocation()
    {
    }

    Indent()
    {
    }

    Unindent()
    {
    }
}

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
 * Marks every symbol a tree references as used, so the printers write every
 * declaration.
 *
 * @param {import("../../src/shadercompiler/index.js").ASTNode|null} node The root.
 */
function markUsed(node)
{
    if (!node)
    {
        return;
    }
    if (node.GetSymbol())
    {
        node.GetSymbol().used = true;
    }
    for (const child of node.GetChildren())
    {
        markUsed(child);
    }
}

/**
 * Prints a node with a ported printer.
 *
 * @param {import("../../src/shadercompiler/index.js").ASTNode} node The node.
 * @param {import("../../src/shadercompiler/index.js").ParserState} state The parse.
 * @param {number} lang A `ShadingLanguage` value.
 * @returns {string} The text.
 */
function print(node, state, lang)
{
    markUsed(state.GetTree());
    const os = new TestStream(lang);
    (lang === CodeStream.ShadingLanguage.MSL ? WriteMSL : WriteHLSL)(os, node, state.GetSymbolTable());
    return os.GetString();
}

/**
 * The printed value of each `return` in a function, in order.
 *
 * @param {import("../../src/shadercompiler/index.js").ParserState} state The parse.
 * @param {string} name The function's name.
 * @param {number} lang A `ShadingLanguage` value.
 * @returns {string[]} The returned expressions.
 */
function returns(state, name, lang)
{
    const definition = findNodes(state.GetTree(), N.NT_FUNCTION_DEFINITION)
        .find(node => node.GetChild(0).GetSymbol().name.ToString() === name);
    return findNodes(definition, N.NT_JUMP).map(jump => print(jump.GetChild(0), state, lang));
}

/**
 * The printed header of a function.
 *
 * @param {import("../../src/shadercompiler/index.js").ParserState} state The parse.
 * @param {string} name The function's name.
 * @returns {string} Its HLSL header.
 */
function header(state, name)
{
    const node = findNodes(state.GetTree(), N.NT_FUNCTION_HEADER).find(h => h.GetSymbol().name.ToString() === name);
    return print(node, state, CodeStream.ShadingLanguage.HLSL).trim();
}

/**
 * Parses `source`, failing on a parse error.
 *
 * @param {string} source HLSL text.
 * @returns {import("../../src/shadercompiler/index.js").ParserState} The state.
 */
function parsed(source)
{
    const { state, ok, messages } = parse(source);
    assert.ok(ok, messages.join(""));
    return state;
}

/**
 * The messages a state has reported.
 *
 * @param {import("../../src/shadercompiler/index.js").ParserState} state The parse.
 * @returns {string[]} The messages.
 */
function messagesOf(state)
{
    return state._messages.GetMessages();
}

const METAL_DECLARATIONS = `
Texture2D<float4> t2;
Texture2D<float2> t2f2;
Texture2DArray<float4> ta;
Texture3D<float4> t3;
TextureCube<float4> tc;
Texture2DMS<float4> tms;
RWTexture2D<float4> rw;
RWTexture2D<float> rwf;
RWTexture2DArray<float2> rwa;
Texture2D<uint> idx;
Buffer<float4> buf;
SamplerState ss;
SamplerComparisonState sc;
`;

/**
 * Runs the Metal conversion on a pixel shader with `body`, over a fixed set
 * of resources, and prints what it returns.
 *
 * @param {string} body The function body.
 * @returns {{ state: import("../../src/shadercompiler/index.js").ParserState, returned: string[] }} The state and the printed returns.
 */
function metal(body)
{
    const state = parsed(`${METAL_DECLARATIONS}\nfloat4 ps(float2 uv : TEXCOORD0) : SV_Target { ${body} }\n`);
    ConvertTextureFunctionsToMetal(state);
    return { state, returned: returns(state, "ps", CodeStream.ShadingLanguage.MSL) };
}

test("DX9 tex* intrinsics become DX10 methods on the sampler's texture (TextureFunctionConversionDX11.cpp:210-471)", () =>
{
    const state = parsed(`
texture tex;
sampler2D s = sampler_state { Texture = <tex>; };
samplerCUBE sc = sampler_state { Texture = <tex>; };
float4 ps(float2 uv : TEXCOORD0) : COLOR0
{
    return tex2D(s, uv);
    return tex2Dlod(s, float4(uv, 0, 1));
    return tex2Dbias(s, float4(uv, 0, 1));
    return tex2Dproj(s, float4(uv, 1, 2));
    return tex2Dgrad(s, uv, uv, uv);
    return tex2D(s, uv, uv, uv);
    return texCUBElod(sc, float4(uv, 0, 1));
}
`);
    ConvertTextureFunctionsDX11(state);
    assert.deepEqual(messagesOf(state), [
        "(13): warning t1032: texture \"tex\" is declared as 2D, but is used as CUBE"
    ]);
    assert.deepEqual(returns(state, "ps", CodeStream.ShadingLanguage.HLSL), [
        "( tex ).Sample( s, uv )",
        "( tex ).SampleLevel( s, ( float4( uv, 0, 1 ) ).xy, ( float4( uv, 0, 1 ) ).w )",
        "( tex ).SampleBias( s, ( float4( uv, 0, 1 ) ).xy, ( float4( uv, 0, 1 ) ).w )",
        "( tex ).Sample( s, ( ( float4( uv, 1, 2 ) ).xy ) / ( ( float4( uv, 1, 2 ) ).w ) )",
        "( tex ).SampleGrad( s, uv, uv, uv )",
        "( tex ).SampleGrad( s, uv, uv, uv )",
        "( tex ).SampleLevel( sc, ( float4( uv, 0, 1 ) ).xyz, ( float4( uv, 0, 1 ) ).w )"
    ]);
    // The untyped texture takes the first type used; the CUBE use warned and retyped it.
    assert.equal(state.GetSymbolTable().LookupGlobal("tex").type.builtInType, T.OP_TEXTURECUBE);
});

test("the texture node carries the texture's type and the rewritten call has no symbol (TextureFunctionConversionDX11.cpp:243-457)", () =>
{
    const state = parsed(`
Texture2D tex;
sampler2D s = sampler_state { Texture = <tex>; };
float4 ps(float2 uv : TEXCOORD0) : COLOR0 { return tex2D(s, uv); }
`);
    ConvertTextureFunctionsDX11(state);
    const [dot] = findNodes(state.GetTree(), N.NT_POSTFIX_EXPRESSION);
    assert.equal(dot.GetToken().type, T.OP_DOT);
    assert.equal(dot.GetChild(0).GetType().builtInType, T.OP_TEXTURE2D);
    assert.equal(dot.GetChild(1).GetSymbol(), null);
    assert.equal(dot.GetChild(1).GetToken().type, T.OP_ID);
    assert.equal(dot.GetChild(1).GetToken().fileLocation.lineNumber, 0);
});

test("a sampler used as two texture types is an error (TextureFunctionConversionDX11.cpp:146-149)", () =>
{
    const state = parsed(`
texture tex;
sampler2D s = sampler_state { Texture = <tex>; };
float4 ps(float2 uv : TEXCOORD0) : COLOR0 { return tex2D(s, uv) + tex3D(s, float3(uv, 0)); }
`);
    ConvertTextureFunctionsDX11(state);
    assert.deepEqual(messagesOf(state), ["(4): error t1031: sampler \"s\" is used both as 3D and as 2D sampler"]);
    assert.ok(state.HasErrors());
});

test("a texture takes the sampler's registers as t registers (TextureFunctionConversionDX11.cpp:189-199)", () =>
{
    const state = parsed(`
texture tex;
sampler2D s : register(s3) = sampler_state { Texture = <tex>; };
float4 ps(float2 uv : TEXCOORD0) : COLOR0 { return tex2D(s, uv); }
`);
    ConvertTextureFunctionsDX11(state);
    const tex = state.GetSymbolTable().LookupGlobal("tex");
    assert.deepEqual([...tex.registerSpecifier].map(([, reg]) => `${reg.registerType}${reg.registerNumber}`), ["t3"]);
    const s = state.GetSymbolTable().LookupGlobal("s");
    assert.deepEqual([...s.registerSpecifier].map(([, reg]) => `${reg.registerType}${reg.registerNumber}`), ["s3"]);
});

test("a sampler without a texture gets one of its own name, and is renamed (TextureFunctionConversionDX11.cpp:169-186, 232-238)", () =>
{
    const state = parsed(`
sampler2D s;
float4 ps(float2 uv : TEXCOORD0) : COLOR0 { return tex2D(s, uv); }
`);
    ConvertTextureFunctionsDX11(state);
    assert.deepEqual(messagesOf(state), [
        "(3): warning t1033: sampler \"s\" does not have texture assignment, but is used in DX9 texture function"
    ]);
    const first = state.GetTree().GetChild(0);
    assert.equal(first.GetNodeType(), N.NT_NAME_DECLARATION);
    assert.equal(first.GetSymbol().name.ToString(), "s");
    assert.equal(first.GetSymbol().type.builtInType, T.OP_TEXTURE2D);
    // Carbon never sets the new symbol's definition, so the declaration node keeps `texture`.
    assert.equal(first.GetSymbol().definition, null);
    assert.equal(first.GetType().builtInType, T.OP_TEXTURE);
    assert.deepEqual(returns(state, "ps", CodeStream.ShadingLanguage.HLSL), ["( s ).Sample( _new_symbol_0000, uv )"]);
});

test("functions taking samplers get texture parameters, and their calls texture arguments (TextureFunctionConversionDX11.cpp:473-657)", () =>
{
    const state = parsed(`
texture tex;
sampler2D s = sampler_state { Texture = <tex>; };
float4 inner(sampler2D q, float2 uv) { return tex2Dlod(q, float4(uv, 0, 0)); }
float4 middle(sampler2D r, float2 uv) { return inner(r, uv); }
float4 ps(float2 uv : TEXCOORD0) : COLOR0 { return middle(s, uv) + inner((s), uv); }
`);
    ConvertTextureFunctionsDX11(state);
    assert.deepEqual(messagesOf(state), []);
    assert.equal(header(state, "inner"), "float4 inner( Texture2D _new_symbol_0000, sampler q, float2 uv )");
    assert.equal(header(state, "middle"), "float4 middle( Texture2D _new_symbol_0001, sampler r, float2 uv )");
    assert.deepEqual(returns(state, "middle", CodeStream.ShadingLanguage.HLSL), ["inner( _new_symbol_0001, r, uv )"]);
    assert.deepEqual(returns(state, "ps", CodeStream.ShadingLanguage.HLSL), ["( middle( tex, s, uv ) ) + ( inner( tex, ( s ), uv ) )"]);
});

test("the inserted texture argument has the texture's symbol and no type (quirk, TextureFunctionConversionDX11.cpp:617-619; Carbon known defect CE-102)", () =>
{
    const state = parsed(`
texture tex;
sampler2D s = sampler_state { Texture = <tex>; };
float4 inner(sampler2D q, float2 uv) { return tex2D(q, uv); }
float4 ps(float2 uv : TEXCOORD0) : COLOR0 { return inner(s, uv); }
`);
    ConvertTextureFunctionsDX11(state);
    const call = findNodes(state.GetTree(), N.NT_FUNCTION_CALL).find(node => node.GetSymbol() && node.GetSymbol().name.ToString() === "inner");
    assert.equal(call.GetChild(0).GetSymbol(), state.GetSymbolTable().LookupGlobal("tex"));
    assert.equal(call.GetChild(0).GetType().builtInType, 0);
});

test("a sampler parameter not passed first pairs a texture with argument 0 (bug, TextureFunctionConversionDX11.cpp:593; Carbon known defect CE-98)", () =>
{
    const state = parsed(`
float4 inner(float2 uv, sampler2D q) { return tex2D(q, uv); }
float4 outer(float2 uv, sampler2D q2) { return inner(uv, q2); }
texture tex;
sampler2D s = sampler_state { Texture = <tex>; };
float4 ps(float2 uv : TEXCOORD0) : COLOR0 { return outer(uv, s); }
`);
    ConvertTextureFunctionsDX11(state);
    assert.deepEqual(messagesOf(state), []);
    // The texture for `q2` is made for `uv`, so `outer` gains it before `uv`,
    // and `ps`, which passes `uv` first, gains one too; `tex` is never passed.
    assert.equal(header(state, "inner"), "float4 inner( float2 uv, Texture2D _new_symbol_0000, sampler q )");
    assert.equal(header(state, "outer"), "float4 outer( Texture2D _new_symbol_0001, float2 uv, sampler q2 )");
    assert.equal(header(state, "ps"), "float4 ps( Texture2D _new_symbol_0002, float2 uv : TEXCOORD0 ) : COLOR0");
    assert.deepEqual(returns(state, "outer", CodeStream.ShadingLanguage.HLSL), ["inner( uv, _new_symbol_0001, q2 )"]);
    assert.deepEqual(returns(state, "ps", CodeStream.ShadingLanguage.HLSL), ["outer( _new_symbol_0002, uv, s )"]);
});

test("a sampler argument with no texture leaves the call unpatched, silently (quirk, TextureFunctionConversionDX11.cpp:597-601; Carbon known defect CE-101)", () =>
{
    const state = parsed(`
sampler2D s;
float4 inner(sampler2D q, float2 uv) { return tex2D(q, uv); }
float4 ps(float2 uv : TEXCOORD0) : COLOR0 { return inner(s, uv); }
`);
    ConvertTextureFunctionsDX11(state);
    assert.deepEqual(messagesOf(state), []);
    assert.equal(header(state, "inner"), "float4 inner( Texture2D _new_symbol_0000, sampler q, float2 uv )");
    assert.deepEqual(returns(state, "ps", CodeStream.ShadingLanguage.HLSL), ["inner( s, uv )"]);
});

test("a retyped texture keeps its old type on its declaration node (quirk, TextureFunctionConversionDX11.cpp:110-113, 122-125; Carbon known defect CE-100)", () =>
{
    const state = parsed(`
texture tex;
sampler2D s = sampler_state { Texture = <tex>; };
float4 ps(float2 uv : TEXCOORD0) : COLOR0 { return tex2D(s, uv); }
`);
    ConvertTextureFunctionsDX11(state);
    const tex = state.GetSymbolTable().LookupGlobal("tex");
    assert.equal(tex.type.builtInType, T.OP_TEXTURE2D);
    assert.equal(tex.definition.GetNodeType(), N.NT_NAME_DECLARATION);
    assert.equal(tex.definition.GetType().builtInType, T.OP_TEXTURE);
});

test("SRGBTexture becomes a Tr2sRGB annotation on the texture (TextureFunctionConversionDX11.cpp:659-717)", () =>
{
    const state = parsed(`
texture a;
texture b;
texture c;
sampler2D sa = sampler_state { Texture = <a>; SRGBTexture = true; };
sampler2D sb = sampler_state { SRGBTexture = false; Texture = <b>; };
sampler2D sc = sampler_state { Texture = <c>; };
`);
    TransferSRGBToTexturesDX11(state);
    const annotation = name =>
    {
        const annotations = state.GetSymbolTable().LookupGlobal(name).annotations;
        return annotations === null ? null : annotations.map(an => [an.type, an.name.ToString(), an.value.type, an.value.intValue, an.value.stringValue.ToString()]);
    };
    assert.deepEqual(annotation("a"), [[T.OP_BOOL, "Tr2sRGB", T.OP_BOOL_CONST, 1, "true"]]);
    assert.deepEqual(annotation("b"), [[T.OP_BOOL, "Tr2sRGB", T.OP_BOOL_CONST, 0, "false"]]);
    assert.equal(annotation("c"), null);
});

test("samplers with equal static state are merged (TextureFunctionConversionDX11.cpp:1260-1295)", () =>
{
    const state = parsed(`
texture tex;
sampler2D s1 = sampler_state { Texture = <tex>; AddressU = Wrap; };
sampler2D s2 = sampler_state { Texture = <tex>; AddressU = Wrap; SRGBTexture = true; };
sampler2D s3 = sampler_state { Texture = <tex>; AddressU = Clamp; };
sampler2D s4;
float4 ps(float2 uv : TEXCOORD0) : COLOR0 { return tex2D(s1, uv) + tex2D(s2, uv) + tex2D(s3, uv) + tex2D(s4, uv); }
`);
    ConvertTextureFunctionsDX11(state);
    MergeSamplers(state);
    assert.deepEqual(returns(state, "ps", CodeStream.ShadingLanguage.HLSL), [
        "( ( ( ( tex ).Sample( s1, uv ) ) + ( ( tex ).Sample( s1, uv ) ) ) + ( ( tex ).Sample( s3, uv ) ) ) + ( ( s4 ).Sample( _new_symbol_0000, uv ) )"
    ]);
    // The merged sampler's declaration keeps its own symbol.
    const s2 = findNodes(state.GetTree(), N.NT_NAME_DECLARATION).find(node => node.GetSymbol().name.ToString() === "s2");
    assert.ok(s2);
});

test("Metal: TextureIndexingWorks (MetalConversionTest.cpp:9-37)", () =>
{
    const state = parsed(`
Texture2D<float3> tex;

float4 vs(): SV_Position
{
	return float4( 0.0, 0.0, 0.0, 1.0 );
}

float4 ps(): SV_Target
{
	return float4( tex[int2( 0, 0 )], 1.0 );
}
`);
    ConvertTextureFunctionsToMetal(state);
    const [returned] = returns(state, "ps", CodeStream.ShadingLanguage.MSL);
    assert.ok(returned.includes("( ( tex ).read( (uint2)( int2( 0, 0 ) ) ) ).xyz"), returned);
});

test("Metal: sample methods take Metal's option calls (TextureFunctionConversionDX11.cpp:820-860, 960-977)", () =>
{
    const { state, returned } = metal(`
    return t2.Sample(ss, uv);
    return t2.SampleBias(ss, uv, 1.0);
    return t2.SampleLevel(ss, uv, 2);
    return t2.SampleGrad(ss, uv, uv, uv);
    return t3.SampleGrad(ss, float3(uv, 0), float3(uv, 0), float3(uv, 0));
    return tc.SampleGrad(ss, float3(uv, 0), float3(uv, 0), float3(uv, 0));
    return t2.SampleCmp(sc, uv, 0.5);
    return t2.SampleCmpLevelZero(sc, uv, 0.5);
    return t2f2.Sample(ss, uv).xyxy;
`);
    assert.deepEqual(messagesOf(state), []);
    assert.deepEqual(returned, [
        "( t2 ).sample( ss, uv )",
        "( t2 ).sample( ss, uv, bias( 1.0 ) )",
        "( t2 ).sample( ss, uv, level( 2 ) )",
        "( t2 ).sample( ss, uv, gradient2d( uv, uv ) )",
        "( t3 ).sample( ss, float3( uv, 0 ), gradient3d( float3( uv, 0 ), float3( uv, 0 ) ) )",
        "( tc ).sample( ss, float3( uv, 0 ), gradientcube( float3( uv, 0 ), float3( uv, 0 ) ) )",
        "( t2 ).sample_compare( sc, uv, 0.5 )",
        "( t2 ).sample_compare( sc, uv, 0.5, level( 0 ) )",
        "( ( ( t2f2 ).sample( ss, uv ) ).xy ).xyxy"
    ]);
});

test("Metal: texture arrays take the array index as a separate argument (TextureFunctionConversionDX11.cpp:719-751)", () =>
{
    const { returned } = metal("return ta.SampleLevel(ss, float3(uv, 1), 2);");
    assert.deepEqual(returned, ["( ta ).sample( ss, ( float3( uv, 1 ) ).xy, (uint)( ( float3( uv, 1 ) ).z ), level( 2 ) )"]);
});

test("Metal: gathers name their component (TextureFunctionConversionDX11.cpp:861-899)", () =>
{
    const { returned } = metal(`
    return t2.GatherRed(ss, uv);
    return t2.GatherGreen(ss, uv);
    return t2.GatherBlue(ss, uv);
`);
    assert.deepEqual(returned, [
        "( t2 ).gather( ss, uv )",
        "( t2 ).gather( ss, uv, component::y )",
        "( t2 ).gather( ss, uv, component::z )"
    ]);
});

test("Metal: Load becomes read with a uint position and the mip level apart (TextureFunctionConversionDX11.cpp:900-959)", () =>
{
    const { returned } = metal(`
    return t2.Load(int3(1, 2, 0));
    return tms.Load(int2(1, 2), 0);
    return ta.Load(int4(1, 2, 3, 0));
`);
    assert.deepEqual(returned, [
        "( t2 ).read( (uint2)( ( int3( 1, 2, 0 ) ).xy ), ( int3( 1, 2, 0 ) ).z )",
        "( tms ).read( (uint2)( int2( 1, 2 ) ), 0 )",
        "( ta ).read( ( (uint3)( ( int4( 1, 2, 3, 0 ) ).xyz ) ).xy, (uint)( ( (uint3)( ( int4( 1, 2, 3, 0 ) ).xyz ) ).z ), ( int4( 1, 2, 3, 0 ) ).w )"
    ]);
});

test("Metal: GetDimensions becomes a free call and Buffer.Load indexing (TextureFunctionConversionDX11.cpp:754-794, 978-983)", () =>
{
    const { state, returned } = metal("uint w; uint h; t2.GetDimensions(w, h); return buf.Load(3);");
    const statement = findNodes(state.GetTree(), N.NT_EXPRESSION_STATEMENT)[0];
    assert.equal(print(statement.GetChild(0), state, CodeStream.ShadingLanguage.MSL), "GetDimensions( t2, w, h )");
    assert.deepEqual(returned, ["( buf )[3]"]);
    assert.deepEqual(messagesOf(state), []);
});

test("Metal: buffers report Load with status and GetDimensions (TextureFunctionConversionDX11.cpp:772-788)", () =>
{
    const { state } = metal("uint status; uint n; buf.GetDimensions(n); return buf.Load(3, status);");
    assert.deepEqual(messagesOf(state), [
        "(16): error t1046: Metal does not support GetDimensions method for buffers",
        "(16): error t1046: Metal does not support Load with status argument"
    ]);
});

test("Metal: texture reads and writes become read and write (TextureFunctionConversionDX11.cpp:1034-1222)", () =>
{
    const { state, returned } = metal(`
    rwf[int2(1, 2)] = 1.0;
    rwa[int3(1, 2, 3)] = float2(1, 2);
    rw[uint2(3, 4)] = float4(1, 2, 3, 4);
    return rw[uint2(0, 0)] + rwf[uint2(0, 0)];
`);
    assert.deepEqual(messagesOf(state), []);
    const statements = findNodes(state.GetTree(), N.NT_EXPRESSION_STATEMENT).map(node => print(node.GetChild(0), state, CodeStream.ShadingLanguage.MSL));
    assert.deepEqual(statements, [
        "( rwf ).write( float4( 1.0, 0, 0, 0 ), (uint2)( int2( 1, 2 ) ) )",
        "( rwa ).write( float4( float2( 1, 2 ), 0, 0 ), (uint2)( ( int3( 1, 2, 3 ) ).xy ), (uint)( ( int3( 1, 2, 3 ) ).z ) )",
        "( rw ).write( float4( 1, 2, 3, 4 ), uint2( 3, 4 ) )"
    ]);
    assert.deepEqual(returned, ["( ( rw ).read( uint2( 0, 0 ) ) ) + ( ( ( rwf ).read( uint2( 0, 0 ) ) ).x )"]);
    const rw = state.GetSymbolTable().LookupGlobal("rw");
    assert.equal(rw.type.metalTextureAccess, 1);
});

test("Metal: indexing a texture under a compound assignment is an error (TextureFunctionConversionDX11.cpp:1118-1121)", () =>
{
    const { state } = metal("rw[uint2(1, 2)] += 1.0; return 0;");
    assert.deepEqual(messagesOf(state), ["(16): error t1046: cannot rewite texture assignment for Metal"]);
});

test("Metal: a texture read inside an assignment's left operand is an error (quirk, TextureFunctionConversionDX11.cpp:1247; Carbon known defect CE-103)", () =>
{
    const { state } = metal("float a[4]; a[idx[uint2(0, 0)]] = 1.0; return a[0];");
    assert.deepEqual(messagesOf(state), ["(16): error t1046: cannot rewite texture assignment for Metal"]);
});

test("Metal: reading a texture array splits its index twice (bug, TextureFunctionConversionDX11.cpp:1116; Carbon known defect CE-99)", () =>
{
    const { returned } = metal("return ta[int3(1, 2, 3)];");
    // Correct would be read( uint2 position, uint array ); Carbon reads with
    // position x, array y and level i.
    assert.deepEqual(returned, [
        "( ta ).read( ( ( (uint3)( int3( 1, 2, 3 ) ) ).xy ).x, (uint)( ( ( (uint3)( int3( 1, 2, 3 ) ) ).xy ).y ), ( (uint3)( int3( 1, 2, 3 ) ) ).z )"
    ]);
});

test("Metal: DX9 intrinsics go through the DX11 conversion first (TextureFunctionConversionDX11.cpp:1252-1257)", () =>
{
    const state = parsed(`
texture tex;
sampler2D s = sampler_state { Texture = <tex>; };
float4 ps(float2 uv : TEXCOORD0) : COLOR0 { return tex2Dlod(s, float4(uv, 0, 1)); }
`);
    ConvertTextureFunctionsToMetal(state);
    assert.deepEqual(returns(state, "ps", CodeStream.ShadingLanguage.MSL), ["( tex ).sample( s, ( float4( uv, 0, 1 ) ).xy, level( ( float4( uv, 0, 1 ) ).w ) )"]);
});

test("Metal: SampleCmpLevelZero with too few arguments throws, where Carbon inserts past the end", () =>
{
    const state = parsed(`${METAL_DECLARATIONS}\nfloat4 ps(float2 uv : TEXCOORD0) : SV_Target { return t2.SampleCmpLevelZero(sc); }\n`);
    assert.throws(() => ConvertTextureFunctionsToMetal(state), RangeError);
});

test("SplitCoordVec leaves non-array textures alone (TextureFunctionConversionDX11.cpp:719-751)", () =>
{
    const state = parsed(`${METAL_DECLARATIONS}\nfloat4 ps(float2 uv : TEXCOORD0) : SV_Target { return t2.Sample(ss, uv); }\n`);
    const call = findNodes(state.GetTree(), N.NT_FUNCTION_CALL).find(node => node.GetToken().stringValue.ToString() === "Sample");
    const before = call.GetChildrenCount();
    SplitCoordVec(call, Type.typeFromTokenType(T.OP_TEXTURE2D));
    assert.equal(call.GetChildrenCount(), before);
    SplitCoordVec(call, Type.typeFromTokenType(T.OP_TEXTURE2DARRAY));
    assert.equal(call.GetChildrenCount(), before + 1);
    assert.equal(call.GetChild(2).GetNodeType(), N.NT_CAST_EXPRESSION);
    assert.equal(call.GetChild(2).GetType().builtInType, T.OP_UINT);
});

test("BindlessTextureType maps bindless handles to texture types (TextureFunctionConversionDX11.cpp:1296-1309)", () =>
{
    assert.equal(BindlessTextureType(T.OP_BINDLESSHANDLETEXTURE2D), Texture.TextureType.TEX_TYPE_2D);
    assert.equal(BindlessTextureType(T.OP_BINDLESSHANDLETEXTURE3D), Texture.TextureType.TEX_TYPE_3D);
    assert.equal(BindlessTextureType(T.OP_BINDLESSHANDLETEXTURECUBE), Texture.TextureType.TEX_TYPE_CUBE);
    assert.equal(BindlessTextureType(T.OP_BINDLESSHANDLESAMPLER), Texture.TextureType.TEX_TYPE_INVALID);
});
