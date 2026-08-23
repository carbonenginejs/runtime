import assert from "node:assert/strict";
import test from "node:test";
import {
    CjsBackendPreference,
    CjsBackendRejection,
    CjsLibrary,
    SelectBackend,
    Tr2PlatformInfo
} from "../../../src/core/index.js";

function capabilities(values = {})
{
    return { webgpu: false, webgl2: false, ...values };
}

test("SelectBackend commits to one backend and says why the rest lost", async () =>
{
    const selection = await SelectBackend({
        capabilities: capabilities({ webgpu: true, webgl2: true })
    });

    assert.equal(selection.effective, "webgpu");
    assert.equal(selection.requested, null);
    assert.deepEqual(selection.candidates, [
        { name: "webgpu", committed: true },
        { name: "webgl", rejected: CjsBackendRejection.NOT_REACHED }
    ]);
    assert.deepEqual([ ...CjsBackendPreference ], [ "webgpu", "webgl" ]);
});

test("SelectBackend falls back to the next supported candidate", async () =>
{
    const selection = await SelectBackend({ capabilities: capabilities({ webgl2: true }) });

    assert.equal(selection.effective, "webgl");
    assert.equal(selection.candidates[0].rejected, CjsBackendRejection.UNSUPPORTED);
});

test("SelectBackend lets application policy outrank the default order", async () =>
{
    const selection = await SelectBackend({
        capabilities: capabilities({ webgpu: true, webgl2: true }),
        preference: [ "webgl", "webgpu" ]
    });

    assert.equal(selection.effective, "webgl");
    // Requested and effective stay separately inspectable, so a preference is
    // never overwritten by what discovery happened to find.
    assert.deepEqual(selection.requested, [ "webgl", "webgpu" ]);
});

test("SelectBackend awaits the candidate's own proof and falls through a failure", async () =>
{
    const seen = [];
    const selection = await SelectBackend({
        capabilities: capabilities({ webgpu: true, webgl2: true }),
        candidates: [
            {
                name: "webgpu",
                async Prove(context)
                {
                    seen.push(context.name);
                    throw new Error("device request rejected");
                }
            },
            { name: "webgl", Prove: async () => ({ context: "gl" }) }
        ]
    });

    assert.deepEqual(seen, [ "webgpu" ], "the proof runs, and runtime-core never creates the device itself");
    assert.equal(selection.effective, "webgl");
    assert.deepEqual(selection.backend.proof, { context: "gl" });
    assert.equal(selection.backend.proven, true, "a candidate that really proved says so");
    assert.equal(selection.candidates[0].rejected, CjsBackendRejection.UNPROVEN);
    assert.equal(selection.candidates[0].error, "device request rejected");
});

test("SelectBackend labels an unproven candidate honestly", async () =>
{
    const selection = await SelectBackend({ capabilities: capabilities({ webgpu: true }) });

    assert.equal(selection.effective, "webgpu");
    assert.equal(selection.backend.proven, false, "support is a cheap report, not a proof, and is not dressed up as one");
});

test("SelectBackend hands a candidate the resolved device descriptor", async () =>
{
    const platform = await Tr2PlatformInfo.Detect({
        webgl: false,
        adapter: {
            info: {},
            features: new Set([ "texture-compression-bc" ]),
            limits: { maxSampledTexturesPerShaderStage: 32 }
        }
    });

    let handed = null;
    const selection = await SelectBackend({
        platform,
        candidates: [ {
            name: "webgpu",
            limits: { maxSampledTexturesPerShaderStage: 20 },
            features: [ "texture-compression-bc", "shader-f16" ],
            Prove: context => { handed = context; return true; }
        } ]
    });

    assert.deepEqual(handed.descriptor, {
        requiredLimits: { maxSampledTexturesPerShaderStage: 20 },
        requiredFeatures: [ "texture-compression-bc" ]
    });
    assert.deepEqual(handed.unavailableFeatures, [ "shader-f16" ]);
    assert.deepEqual(selection.backend.descriptor, handed.descriptor);
});

test("SelectBackend fails closed", async () =>
{
    // Nothing to render with is a composition failure, not a silent no-op.
    await assert.rejects(
        () => SelectBackend({ capabilities: capabilities() }),
        error =>
        {
            assert.equal(error.code, "CJS_LIBRARY_BACKEND_UNAVAILABLE");
            assert.deepEqual(error.candidates.map(entry => entry.rejected), [
                CjsBackendRejection.UNSUPPORTED,
                CjsBackendRejection.UNSUPPORTED
            ]);
            return true;
        }
    );

    // An explicit request for something no candidate offers is a mistake, not a
    // reason to quietly render through a backend the caller did not ask for.
    await assert.rejects(
        () => SelectBackend({ capabilities: capabilities({ webgpu: true }), preference: [ "metal" ] }),
        error => error.code === "CJS_LIBRARY_BACKEND_UNKNOWN"
    );

    await assert.rejects(
        () => SelectBackend({ capabilities: capabilities({ webgpu: true }), candidates: [ "webgpu", "webgpu" ] }),
        TypeError
    );
});

test("SelectBackend trusts a candidate it does not probe for only on its own proof", async () =>
{
    const selection = await SelectBackend({
        capabilities: capabilities(),
        candidates: [ { name: "stub", Prove: () => true } ],
        preference: [ "stub" ]
    });

    assert.equal(selection.effective, "stub");

    await assert.rejects(
        () => SelectBackend({ capabilities: capabilities(), candidates: [ "stub" ], preference: [ "stub" ] }),
        error => error.code === "CJS_LIBRARY_BACKEND_UNAVAILABLE"
    );
});

test("CjsLibrary probes, records capabilities, and commits one backend", async () =>
{
    const library = new CjsLibrary();
    const selection = await library.SelectBackendAsync({
        gpu: null,
        context: fakeWebGL2()
    });

    assert.equal(selection.effective, "webgl");
    assert.equal(library.GetCapability("webgl2"), true, "the probe result is recorded, not just consulted");
    assert.equal(library.GetCapability("backend"), "webgl");
    assert.equal(library.GetBackendSelection(), selection);

    // Backend switching is shutdown-and-reinitialize, never a hot swap.
    library.Shutdown();
    assert.equal(library.GetBackendSelection(), null);
    assert.equal(library.HasCapability("backend"), false);
});

test("CjsLibrary selects against registered capabilities when told not to probe", async () =>
{
    const library = new CjsLibrary();
    library.RegisterCapabilities(capabilities({ webgl2: true }));

    const selection = await library.SelectBackendAsync({ probe: false });
    assert.equal(selection.effective, "webgl");
});

test("CjsLibrary selects a backend as part of initialization", async () =>
{
    const library = new CjsLibrary();
    await library.InitializeAsync({
        capabilities: capabilities({ webgpu: true }),
        backend: { probe: false }
    });

    assert.equal(library.GetValues().initialized, true);
    assert.equal(library.GetCapability("backend"), "webgpu");

    // Initialization without a backend topic stays exactly as it was: nothing
    // probes, and nothing commits.
    const untouched = new CjsLibrary();
    await untouched.InitializeAsync({});
    assert.equal(untouched.GetBackendSelection(), null);
});

function fakeWebGL2()
{
    const context = {
        MAX_ARRAY_TEXTURE_LAYERS: 0x9001,
        MAX_SAMPLES: 0x9002,
        getParameter: query => (query === 0x9001 ? 256 : 4),
        getSupportedExtensions: () => [],
        getExtension: () => null
    };
    return context;
}
