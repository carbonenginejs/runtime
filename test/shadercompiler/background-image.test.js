import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { compileLibrary } from "../../scripts/shadercompiler/compile-library.mjs";
import { CjsCarbonEffectReader } from "../../src/resource/format/carbonEffect/CjsCarbonEffectReader.js";

const EFFECT = "specialfx/backgroundimage.fx";

/**
 * Compiles the background image effect and reads its one body back.
 *
 * @returns {object} The body's description.
 */
function compileBackground()
{
    const out = mkdtempSync(join(tmpdir(), "cjs-background-"));
    try
    {
        compileLibrary(out, [ EFFECT ]);
        const bytes = new Uint8Array(readFileSync(join(out, "graphics/effect.webgpu/cjs/specialfx/backgroundimage.sm_hi")));
        return new CjsCarbonEffectReader(bytes, { source: EFFECT }).readDescription(0);
    }
    finally
    {
        rmSync(out, { recursive: true, force: true });
    }
}

test("the background image binds the space scene's per-frame buffers as the background pass does", () =>
{
    const pass = compileBackground().techniques[0].passes[0];
    const [ vs, ps ] = [ 0, 1 ].map(type => pass.stages.find(stage => stage.type === type));

    // b1 is PerFrameVS and b2 PerFramePS (EveSpaceScenePerFrame.fxh); b0 is the effect's own constants.
    assert.deepEqual(vs.registers.map(register => [ register.registerType, register.registerIndex ]), [ [ 0, 1 ] ]);
    assert.ok(ps.registers.some(register => register.registerType === 0 && register.registerIndex === 2));
    assert.deepEqual(ps.constants.map(constant => constant.name.value),
        [ "BackgroundPlacement", "BackgroundSettings", "BackgroundColor", "BackgroundTint" ]);
    assert.deepEqual(ps.textures.map(texture => texture.name.value), [ "BackgroundMap" ]);
});

test("the background image samples clamped and writes no depth, like Carbon's nebula pass", () =>
{
    const pass = compileBackground().techniques[0].passes[0];
    const sampler = pass.stages.find(stage => stage.type === 1).samplers[0];
    assert.equal(sampler.name.value, "BackgroundMapSampler");
    // D3D11_TEXTURE_ADDRESS_CLAMP.
    assert.equal(sampler.addressU, 3);
    assert.equal(sampler.addressV, 3);

    // The nebula (specialfx/background) disables depth the same way: ZEnable 0, ZWriteEnable 0, ZFunc ALWAYS.
    const states = Object.fromEntries(pass.renderStates.map(state => [ state.state, state.value ]));
    assert.equal(states[7], 0);
    assert.equal(states[14], 0);
    assert.equal(states[23], 8);
});
