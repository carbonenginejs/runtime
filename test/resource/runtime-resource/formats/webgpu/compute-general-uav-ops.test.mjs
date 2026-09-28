// The general compute path's UAV lowerings the particle update kernel needs,
// each on a minimal fixture (test/support/computeOpFixtures.js), in bounds and
// out of bounds. D3D11's rules (Direct3D 11.3 functional specification, UAV
// access): an out-of-bounds UAV read returns 0; an out-of-bounds UAV write or
// atomic changes no memory, and a returning atomic then yields 0.
//
// These pin the emitted guards. The same fixtures were executed on a GPU
// (runtime/_dev/cppc/compute-ops-gpu.local.mjs, 2026-09-28: 11/11, with a
// guard-removed negative control failing as it must).
import { test } from "node:test";
import assert from "node:assert/strict";

import {
    bitwiseNotFixture,
    fixtureWgsl,
    immAtomicAddFixture,
    signedTypedStoreFixture,
    structuredUavLoadFixture,
    structuredUavStoreFixture
} from "../../../../support/computeOpFixtures.js";
import { CARBON_TYPED_VIEWS } from "../../../../../src/resource/formats/hlsl/core/carbonTypedViews.js";

const SINT = { "storage-resource:0:0": "R32_SINT" };

test("imm_atomic_iadd returns the prior value in bounds, and 0 with no change out of bounds", () =>
{
    for (const address of [ 1, 7 ])
    {
        const wgsl = fixtureWgsl(immAtomicAddFixture(address));
        const inRange = `(0x0000000${address}u < arrayLength(&u0))`;

        // In range: the add; out of range: 0 added to a clamped element, and a 0 result.
        assert.ok(wgsl.includes(`atomicAdd(&u0[min(0x0000000${address}u, arrayLength(&u0) - 1u)], select(u32(0), 0x00000005u, ${inRange}))`), wgsl);
        assert.ok(wgsl.includes(`select(u32(0), atomicAdd(`), "the result is selected to 0 out of range");
    }
});

test("a signed counter from the typed-view table is atomic<i32>, and refused without it", () =>
{
    assert.equal(CARBON_TYPED_VIEWS.ParticleCounters, "R32_SINT", "Tr2GpuParticleSystem.cpp:236");

    const wgsl = fixtureWgsl(immAtomicAddFixture(1, "sint"), SINT);

    assert.ok(wgsl.includes("var<storage, read_write> u0: array<atomic<i32>>"), wgsl);
    assert.ok(wgsl.includes("select(i32(0), atomicAdd(&u0["), wgsl);

    // Negative control: a sint typed UAV no table entry or profile vouches for
    // is still refused, not guessed.
    assert.throws(() => fixtureWgsl(immAtomicAddFixture(1, "sint")), /only typed uint buffer UAVs are supported/u);
});

test("ld_structured from a structured UAV reads 0 out of bounds", () =>
{
    const wgsl = fixtureWgsl(structuredUavLoadFixture(1));

    assert.ok(wgsl.includes("var<storage, read_write> u0: array<u32>"), wgsl);
    // Word 1 of structure 1 at a stride of 2 words, selected to 0 past the last structure.
    assert.ok(wgsl.includes("select(0u, u0[min(((0x00000001u) * 2u) + 1u, arrayLength(&u0) - 1u)], 0x00000001u < (arrayLength(&u0) / 2u))"), wgsl);
});

test("store_structured into a structured UAV is dropped out of bounds", () =>
{
    const wgsl = fixtureWgsl(structuredUavStoreFixture(1));

    assert.match(wgsl, /if \(store_index\d+ < \(arrayLength\(&u0\) \/ 2u\)\)/u);
    assert.match(wgsl, /u0\[\(store_index\d+ \* 2u\) \+ 0u\] = 0x00000007u;/u);
    assert.match(wgsl, /u0\[\(store_index\d+ \* 2u\) \+ 1u\] = 0x00000009u;/u);
});

test("store_uav_typed into a signed counter stores i32 and is dropped out of bounds", () =>
{
    // ClearCounters' shape: no SRV and no temps, so it takes the general path,
    // not the exact scalar-word one.
    const wgsl = fixtureWgsl(signedTypedStoreFixture(1), SINT);

    assert.match(wgsl, /if \(store_address\d+ < arrayLength\(&u0\)\)/u);
    assert.ok(wgsl.includes("atomicStore(&u0[store_address"), wgsl);
    assert.ok(wgsl.includes("bitcast<i32>(0xfffffffdu)"), "-3, as i32");
});

test("not is the bitwise complement", () =>
{
    assert.ok(fixtureWgsl(bitwiseNotFixture()).includes("(~0x0f0f0f0fu)"));
});
