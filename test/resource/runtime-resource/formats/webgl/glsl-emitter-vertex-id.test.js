import test from "node:test";
import assert from "node:assert/strict";
import CjsWebglFormat from "../../../../../src/resource/formats/webgl/index.js";
import CjsDxbcFormat from "../../../../../src/resource/formats/dxbc/index.js";
import { buildVertexIdCornerDxbc, buildMinimalVertexDxbc } from "./synthetic.js";

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

test("stages without integer system inputs or packed lights keep no integer companions", () =>
{
    const { source } = CjsWebglFormat.emitGlsl(buildMinimalVertexDxbc());
    assert.doesNotMatch(source, /cjsBitsR/);
});
