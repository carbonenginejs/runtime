// computelightlists (Tr2LightManager's tile light lists) through the WebGPU
// translator, from the shipped dx11 .sm_depth (real client files through
// clientResources).
//
// Its Clear technique (one signed typed counter UAV, 1x1x1, store 0) has the
// exact shape of the GPU particle system's counter reset. Only an effect that
// proved itself a particle-clear effect may claim that shape; computelightlists
// lowers it through the general compute path. The particle effects keep their
// exact profile: their translation is pinned byte for byte.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import CjsWebgpuFormat from "../../../../../src/resource/formats/webgpu/index.js";
import { readEffectAnalysis } from "../../../../../src/resource/formats/webgpu/core/effectAnalysis.js";
import { buildWgslBindingPlan } from "../../../../../src/resource/formats/webgpu/core/wgsl/buildWgslBindingPlan.js";
import {
    isParticleClearResetCandidate,
    particleClearSignedAtomicLayoutPolicy
} from "../../../../../src/resource/formats/webgpu/core/wgsl/lowerParticleClearComputePrograms.js";
import { clientResources } from "../../../../support/clientResources.js";

const client = await clientResources();
const skip = client.skip ?? false;
const LIGHT_LISTS = "res:/graphics/effect.dx11/managed/space/system/computelightlists.sm_depth";
const PARTICLES = "res:/graphics/effect.dx11/managed/space/specialfx/particles/gpu/";

const sha256 = value => createHash("sha256").update(value).digest("hex");

async function lightListsClearIr()
{
    const analysis = readEffectAnalysis(await client.Read(LIGHT_LISTS), { source: LIGHT_LISTS });
    const bytes = analysis.stageBytecodeByKey.get("Clear.pass0.compute").bytes;
    return CjsWebgpuFormat.buildShaderIr(bytes, { source: LIGHT_LISTS });
}

test("computelightlists' Clear is reset-shaped, and with no particle proof lowers through the general path", { skip }, async () =>
{
    const ir = await lightListsClearIr();
    assert.equal(isParticleClearResetCandidate(ir), true, "the particle reset's shape");

    // LightIndexCount is R32_SINT (Tr2LightManager.cpp:665; carbonTypedViews).
    const bindingPlan = buildWgslBindingPlan([ ir ], { typedViews: { "storage-resource:0:0": "R32_SINT" } });
    const code = CjsWebgpuFormat.buildWgsl(ir, { bindingPlan }).code;
    assert.ok(code.includes("var<storage, read_write> u0: array<atomic<i32>>"), code);
    // The general path's guarded typed store, not the particle profile's bare atomicStore(&u0[0u], 0i).
    assert.ok(code.includes("let store_address0: u32 = 0x00000000u;"), code);
    assert.ok(code.includes("atomicStore(&u0[store_address0], bitcast<i32>(0x00000000u));"), code);
});

test("a reset-shaped program carrying a proof that is not the particle profile's is still refused", { skip }, async () =>
{
    const ir = await lightListsClearIr();
    assert.equal(particleClearSignedAtomicLayoutPolicy(ir, null), null, "no proof: not claimed");
    assert.throws(() => particleClearSignedAtomicLayoutPolicy(ir, {}), /requires an exact whole-effect R32_SINT companion proof/u);
});

// Each shipped GPU particle effect's whole translation (every body's WGSL and
// status), hashed before computelightlists' Clear stopped being claimed by
// the particle reset profile. A different client build changes the source
// hash, and that file is skipped rather than compared.
const PARTICLE_TRANSLATIONS = {
    clear: [ "e0a7e2a90292ef6ffd03841f09b9b1b9696ac105a8ca8a0a909ac09f1a66c72a", "f721eec4c3308020e7b7cf70a42f1f85ce2bec080d1d3541b1d209238404f49f" ],
    emit: [ "6770a70528960f093219dc0394403fee4443fd4d0badaacb3931f19c021f4330", "73fda04b85f8b05449ba627f17a3596cbf8c6762c8f25e35e3bfa26fecedb939" ],
    quads: [ "311e39c3338bb2cf28d76f0109da7c9bad1226b081bfdc8f8a9610f33bd8a99b", "c00f0118809af8a8e677072b8e76e43595ec845c8db854c8c0b1fef5431e753c" ],
    setdrawparameters: [ "5a1a667b10e349c941450b2044dec138e4ebb407af14912d7bc0bfb9babf049b", "c8ea51e67c404f67215c4aa4ef73b52d67c3793e09587411052be04c84c03a1a" ],
    setsortargs: [ "1a6d81b88ae606956c9a158617ddebdc0498a87595679ff527ce7c51fb9a1889", "7d4b5c5eeb1d753072abc593a491691081055f7518bec67923160d507305d723" ],
    sort: [ "2ffb9a0dada893bc202e0d872fea03678d129520dff238da83e3f915e133a5d3", "ddb8334d55910eb20a0f8090b0680fa0e2762a3410c32964ad9ea933e6c9a943" ],
    sortinner: [ "00b9883107cda2aad862f16e7be3c3a976d31a15b5927d82ac5069461f76dbd4", "a1e19ea68dbd4710aca9e114a309ac28f32662942792ba44f21625c9bcf6d3c6" ],
    sortstep: [ "3a52e7db2c1aa3ba6627b344ed127454d2a65139e0ae0b92ed76ede6b901b627", "50ed47386eec20ffd0e09e04128ce9c5ab0c9e3d75b623eefc201e2b4c4dfc2a" ],
    update: [ "35e44678611caa0fc7e3eb595d2f2f5a0ab4c693a59920fe018ddb7c9c3dbb33", "3706871ef21e23c2f9b840637cc1b3ccd2699509e8df7bd51f426b6908a5a507" ]
};

test("the shipped GPU particle effects translate byte-identically", { skip }, async t =>
{
    for (const [ name, [ sourceHash, translationHash ] ] of Object.entries(PARTICLE_TRANSLATIONS))
    {
        await t.test(name, async st =>
        {
            const path = `${PARTICLES}${name}.sm_depth`;
            const bytes = await client.Read(path);
            if (sha256(bytes) !== sourceHash)
            {
                st.skip("a different client build: the pinned translation does not apply");
                return;
            }
            const all = CjsWebgpuFormat.buildEffect(bytes, { source: path, mode: "all" });
            const translation = JSON.stringify(all.wgsl)
                + JSON.stringify(all.backendBodySet.bodies.map(body => [ body.status, body.reason ?? null ]));
            assert.equal(sha256(translation), translationHash);
        });
    }
});
