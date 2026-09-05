import test from "node:test";
import assert from "node:assert/strict";
import CjsWebglFormat from "../../../../../src/resource/formats/webgl/index.js";
import CjsDxbcFormat from "../../../../../src/resource/formats/dxbc/index.js";
import { buildPackedLightDecodeDxbc } from "./synthetic.js";

const bytes = buildPackedLightDecodeDxbc();
const options = { dataTextureWidth: 4, lightPackedTexture: { indexRegister: 13, dataRegister: 14, dataTexelBase: 0 } };

test("packed half words and profile indices stay integer through moves and aliases", () =>
{
    const listing = CjsDxbcFormat.disassemble(bytes);
    assert.match(listing, /f16tof32/);
    assert.match(listing, /movc/);
    assert.match(listing, /ushr/);
    const { source } = CjsWebglFormat.emitGlsl(bytes, options);
    assert.match(source, /cjsBitsR0.x = texelFetch/);
    assert.match(source, /unpackHalf2x16\(cjsBitsR1.x & 0xffffu\)/);
    assert.match(source, /uvec4 hlslcc_movcTemp = cjsBitsR1/);
    assert.match(source, /cjsBitsR2.xyz = uvec3\(cjsBitsR1.xyz\)/);
    assert.match(source, /float\(cjsBitsR2.z\)/);
});

test("GPU: packed half values and profile indices survive on the selected ANGLE backend", {
    skip: !process.env.WEBGL_TEST_ANGLE && "set WEBGL_TEST_ANGLE=d3d11 or swiftshader"
}, async () =>
{
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({ headless: true, executablePath: process.env.WEBGL_TEST_BROWSER, args: [
        `--use-angle=${process.env.WEBGL_TEST_ANGLE}`, "--enable-unsafe-swiftshader"
    ] });
    try
    {
        const page = await browser.newPage();
        const result = await page.evaluate(source =>
        {
            const gl = document.createElement("canvas").getContext("webgl2");
            const compile = (type, text) =>
            {
                const shader = gl.createShader(type); gl.shaderSource(shader, text); gl.compileShader(shader);
                if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(shader));
                return shader;
            };
            const program = gl.createProgram();
            gl.attachShader(program, compile(gl.VERTEX_SHADER, "#version 300 es\nvoid main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));gl_Position=vec4(p*2.0-1.0,0,1);}"));
            gl.attachShader(program, compile(gl.FRAGMENT_SHADER, source));
            gl.linkProgram(program);
            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program));
            gl.useProgram(program); gl.viewport(0, 0, 1, 1);
            const texture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            const pixels = [];
            for (const profile of [0, 1, 3])
            {
                const words = new Uint32Array(16); words[0] = (profile << 20) | 0x13800; words[1] = 0x34003A00;
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32UI, 4, 1, 0, gl.RGBA_INTEGER, gl.UNSIGNED_INT, words);
                gl.drawArrays(gl.TRIANGLES, 0, 3);
                const pixel = new Uint8Array(4); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
                pixels.push(Array.from(pixel));
            }
            const ext = gl.getExtension("WEBGL_debug_renderer_info");
            return { pixels, error: gl.getError(), renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "unavailable" };
        }, CjsWebglFormat.emitGlsl(bytes, options).source);
        assert.equal(result.error, 0);
        const expected = [[128, 64, 0, 255], [64, 128, 64, 255], [64, 128, 191, 255]];
        for (let row = 0; row < expected.length; row++)
            for (let lane = 0; lane < 4; lane++)
                assert.ok(Math.abs(result.pixels[row][lane] - expected[row][lane]) <= 1, JSON.stringify(result));
        console.log(JSON.stringify(result));
    }
    finally { await browser.close(); }
});
