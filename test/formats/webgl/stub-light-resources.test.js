import test from "node:test";
import assert from "node:assert/strict";

import {
    DETAIL3_STUB_RESOURCE_NAMES,
    LIGHT_STUB_RESOURCE_NAMES,
    resolveLightConstantBufferProfile,
    resolveLightPackedTextureProfile,
    resolveStubResourceRegisters,
    resolveStubLightRegisters,
    stripResourcesFromManifest,
    stripLightResourcesFromManifest
} from "./support/stubLightResources.js";

test("LIGHT_STUB_RESOURCE_NAMES is exactly the three tiled-lighting resources", () =>
{
    assert.deepEqual(
        [ ...LIGHT_STUB_RESOURCE_NAMES ].sort(),
        [ "LightBuffer", "LightIndexBuffer", "LightProfileArray" ]
    );
});

test("DETAIL3_STUB_RESOURCE_NAMES is reversible and separate from light stubs", () =>
{
    assert.deepEqual([ ...DETAIL3_STUB_RESOURCE_NAMES ], [ "Detail3Map" ]);
    assert.equal(LIGHT_STUB_RESOURCE_NAMES.has("Detail3Map"), false);
});

test("resolveStubLightRegisters maps light resource names to their registers", () =>
{
    const record = { contracts: [ { contract: { resources: [
        { name: "AlbedoMap", register: 6 },
        { name: "LightIndexBuffer", register: 11 },
        { name: "LightBuffer", register: 12 },
        { name: "LightProfileArray", register: 13 }
    ] } } ] };
    assert.deepEqual(resolveStubLightRegisters(record), [ 11, 12, 13 ]);
});

test("resolveStubLightRegisters returns [] when no light resources are present", () =>
{
    const record = { contracts: [ { contract: { resources: [ { name: "AlbedoMap", register: 6 } ] } } ] };
    assert.deepEqual(resolveStubLightRegisters(record), []);
});

test("resolveStubLightRegisters dedupes across contracts, sorts, and tolerates gaps", () =>
{
    const record = { contracts: [
        { contract: { resources: [ { name: "LightProfileArray", register: 15 }, { name: "LightBuffer", register: 14 } ] } },
        { contract: { resources: [ { name: "LightBuffer", register: 14 } ] } }, // duplicate register
        { contract: {} },                                                        // no resources
        {}                                                                        // no contract
    ] };
    assert.deepEqual(resolveStubLightRegisters(record), [ 14, 15 ]);
    assert.deepEqual(resolveStubLightRegisters({}), []);
    assert.deepEqual(resolveStubLightRegisters(null), []);
});

test("resolveStubLightRegisters accepts registerIndex as an alias for register", () =>
{
    // The registers vary per permutation, so this is name-driven, not fixed.
    const record = { contracts: [ { contract: { resources: [
        { name: "LightBuffer", registerIndex: 12 },
        { name: "LightIndexBuffer", registerIndex: 11 }
    ] } } ] };
    assert.deepEqual(resolveStubLightRegisters(record), [ 11, 12 ]);
});

test("resolveStubResourceRegisters maps arbitrary named resources to registers", () =>
{
    const record = { contracts: [ { contract: { resources: [
        { name: "Detail3Map", register: 12 },
        { name: "LightIndexBuffer", register: 13 },
        { name: "LightBuffer", register: 14 },
        { name: "LightProfileArray", register: 15 }
    ] } } ] };
    const dropNames = new Set([ ...DETAIL3_STUB_RESOURCE_NAMES, ...LIGHT_STUB_RESOURCE_NAMES ]);

    assert.deepEqual(resolveStubResourceRegisters(record, DETAIL3_STUB_RESOURCE_NAMES), [ 12 ]);
    assert.deepEqual(resolveStubResourceRegisters(record, dropNames), [ 12, 13, 14, 15 ]);
});

test("resolveLightConstantBufferProfile maps named tiled-light resources to cb6 by default", () =>
{
    const record = { contracts: [ { contract: { resources: [
        { name: "AlbedoMap", register: 6 },
        { name: "LightIndexBuffer", register: 11 },
        { name: "LightBuffer", register: 12 },
        { name: "LightProfileArray", register: 13 }
    ] } } ] };

    assert.deepEqual(resolveLightConstantBufferProfile(record), {
        indexRegister: 11,
        dataRegister: 12,
        profileRegister: 13,
        registerIndex: 6,
        name: "cb6",
        capacity: 40
    });
});

test("resolveLightConstantBufferProfile requires both structured light buffers", () =>
{
    assert.equal(resolveLightConstantBufferProfile({ contracts: [ { contract: { resources: [
        { name: "LightBuffer", register: 12 }
    ] } } ] }), null);
    assert.equal(resolveLightConstantBufferProfile({}), null);
});

test("resolveLightConstantBufferProfile accepts cb slot and capacity overrides", () =>
{
    const record = { contracts: [ { contract: { resources: [
        { name: "LightIndexBuffer", registerIndex: 14 },
        { name: "LightBuffer", registerIndex: 15 }
    ] } } ] };
    assert.deepEqual(resolveLightConstantBufferProfile(record, { registerIndex: 8, capacity: 12 }), {
        indexRegister: 14,
        dataRegister: 15,
        profileRegister: null,
        registerIndex: 8,
        name: "cb8",
        capacity: 12
    });
});

test("resolveLightPackedTextureProfile maps named tiled-light resources to one texture profile", () =>
{
    const record = { contracts: [ { contract: { resources: [
        { name: "LightIndexBuffer", registerIndex: 13 },
        { name: "LightBuffer", registerIndex: 14 },
        { name: "LightProfileArray", registerIndex: 15 }
    ] } } ] };

    assert.deepEqual(resolveLightPackedTextureProfile(record), {
        indexRegister: 13,
        dataRegister: 14,
        profileRegister: 15,
        registerIndex: 13,
        name: "cewgLocalLightTexture",
        dataTexelBase: 131072
    });
});

test("resolveLightPackedTextureProfile requires both structured light buffers", () =>
{
    assert.equal(resolveLightPackedTextureProfile({ contracts: [ { contract: { resources: [
        { name: "LightBuffer", register: 12 }
    ] } } ] }), null);
    assert.equal(resolveLightPackedTextureProfile({}), null);
});

test("stripResourcesFromManifest removes Detail3Map only when requested", () =>
{
    const manifest = { stages: [ { bindings: [
        { kind: "resource", registerIndex: 11, carbon: { name: "Detail2Map" } },
        { kind: "resource", registerIndex: 12, carbon: { name: "Detail3Map" } },
        { kind: "resource", registerIndex: 13, carbon: { name: "LightIndexBuffer" } },
        { kind: "sampler", registerIndex: 12, carbon: { name: "Detail3MapSampler" } }
    ] } ] };

    const out = stripResourcesFromManifest(manifest, DETAIL3_STUB_RESOURCE_NAMES);
    const names = out.stages[0].bindings.map((b) => b.metadataName || b.carbon?.name);

    assert.deepEqual(names, [ "Detail2Map", "LightIndexBuffer", "Detail3MapSampler" ]);
});

test("stripLightResourcesFromManifest removes only light resource-kind bindings", () =>
{
    const manifest = { stages: [ { bindings: [
        { kind: "resource", registerIndex: 6, carbon: { name: "AlbedoMap" } },
        { kind: "resource", registerIndex: 11, carbon: { name: "LightIndexBuffer" } },
        { kind: "resource", registerIndex: 13, metadataName: "LightProfileArray" },
        { kind: "sampler", registerIndex: 13, carbon: { name: "LightProfileArraySampler" } },
        { kind: "constantBuffer", registerIndex: 0, carbon: { name: "GeneralData" } }
    ] } ] };

    const out = stripLightResourcesFromManifest(manifest);
    const names = out.stages[0].bindings.map((b) => b.metadataName || b.carbon?.name);

    // Light resource-kind bindings removed; the non-resource sampler and the
    // non-light constant buffer are retained.
    assert.deepEqual(names, [ "AlbedoMap", "LightProfileArraySampler", "GeneralData" ]);
});

test("stripLightResourcesFromManifest matches by metadataName before carbon.name", () =>
{
    const manifest = { stages: [ { bindings: [
        { kind: "resource", metadataName: "LightBuffer", carbon: { name: "SomethingElse" } }
    ] } ] };
    assert.equal(stripLightResourcesFromManifest(manifest).stages[0].bindings.length, 0);
});

test("stripLightResourcesFromManifest tolerates empty or missing stages", () =>
{
    assert.deepEqual(stripLightResourcesFromManifest({}), {});
    assert.deepEqual(stripLightResourcesFromManifest({ stages: [] }), { stages: [] });
    assert.deepEqual(stripLightResourcesFromManifest({ stages: [ {} ] }), { stages: [ { bindings: [] } ] });
});
