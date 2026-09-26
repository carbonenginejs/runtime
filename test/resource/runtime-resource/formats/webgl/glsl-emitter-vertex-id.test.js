import test from "node:test";
import assert from "node:assert/strict";
import CjsWebglFormat from "../../../../../src/resource/formats/webgl/index.js";
import CjsDxbcFormat from "../../../../../src/resource/formats/dxbc/index.js";
import { buildVertexIdCornerDxbc, buildMinimalVertexDxbc, buildIntegerInputMoveDxbc } from "./synthetic.js";

const bytes = buildVertexIdCornerDxbc();

test("SV_VertexID integer reads use the built-in and stay in integer companions", () =>
{
    const listing = CjsDxbcFormat.disassemble(bytes);
    assert.match(listing, /vertex_id/);
    const { source } = CjsWebglFormat.emitGlsl(bytes);
    assert.match(source, /uvec4 cjsBitsR0;/);
    assert.match(source, /cjsBitsR0\.x = \(?uint\(gl_VertexID\) & 3u\)?;/);
    assert.match(source, /float\(cjsBitsR0\.x\)/);
    // The denormal round trip ANGLE/D3D11 collapses must be gone.
    assert.doesNotMatch(source, /floatBitsToUint\(vec4\(intBitsToFloat\(gl_VertexID\)\)/);
});

test("an integer vertex input moved into a temporary value-converts into its companion", () =>
{
    const { source } = CjsWebglFormat.emitGlsl(buildIntegerInputMoveDxbc());
    assert.match(source, /in highp vec4 in_TEXCOORD7;/);
    assert.match(source, /uvec4 cjsBitsR0;/);
    assert.match(source, /cjsBitsR0\.x = uint\(in_TEXCOORD7\.x\);/);
    assert.match(source, /float\(cjsBitsR0\.x\)/);
    // Bit-casting the float VALUE 3.0 was the haze corner-index defect.
    assert.doesNotMatch(source, /r0\.x = in_TEXCOORD7\.x;/);
    assert.doesNotMatch(source, /floatBitsToUint\(r0\.x\)/);
});

// Every stage keeps integer companions, not only the vertex-id and packed-light
// ones: ANGLE/D3D11 flushes the denormal bit patterns of small integers held in
// float temporaries, in any stage (the shield impact's pixel-stage hit loop).
test("every stage keeps integer companions for its temporaries", () =>
{
    const { source } = CjsWebglFormat.emitGlsl(buildMinimalVertexDxbc());
    assert.match(source, /uvec4 cjsBitsR0;/);
});
