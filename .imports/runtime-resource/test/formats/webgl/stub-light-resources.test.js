import test from "node:test";
import assert from "node:assert/strict";

// The real module, not a copy. A `test/formats/webgl/support/` duplicate of this
// file used to stand in for it, which meant these tests passed regardless of
// what the packager actually did.
import {
    LIGHT_STUB_RESOURCE_NAMES,
    resolveStubResourceRegisters,
    resolveStubLightRegisters,
    stripResourcesFromManifest,
    stripLightResourcesFromManifest
} from "../../../scripts/formats/webgl/stubLightResources.js";

test("LIGHT_STUB_RESOURCE_NAMES is exactly the three tiled-lighting resources", () =>
{
    assert.deepEqual(
        [ ...LIGHT_STUB_RESOURCE_NAMES ].sort(),
        [ "LightBuffer", "LightIndexBuffer", "LightProfileArray" ]
    );
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
    const dropNames = new Set([ "Detail3Map", ...LIGHT_STUB_RESOURCE_NAMES ]);

    assert.deepEqual(resolveStubResourceRegisters(record, new Set([ "Detail3Map" ])), [ 12 ]);
    assert.deepEqual(resolveStubResourceRegisters(record, dropNames), [ 12, 13, 14, 15 ]);
});

test("stripResourcesFromManifest removes Detail3Map only when requested", () =>
{
    const manifest = { stages: [ { bindings: [
        { kind: "resource", registerIndex: 11, carbon: { name: "Detail2Map" } },
        { kind: "resource", registerIndex: 12, carbon: { name: "Detail3Map" } },
        { kind: "resource", registerIndex: 13, carbon: { name: "LightIndexBuffer" } },
        { kind: "sampler", registerIndex: 12, carbon: { name: "Detail3MapSampler" } }
    ] } ] };

    const out = stripResourcesFromManifest(manifest, new Set([ "Detail3Map" ]));
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
