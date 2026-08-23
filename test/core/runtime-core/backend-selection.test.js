import assert from "node:assert/strict";
import test from "node:test";
import {
    CjsBackendPreference,
    CjsBackendRejection,
    CjsLibrary,
    SelectBackend,
    Tr2PlatformInfo
} from "../../../src/core/index.js";
import { CjsBackendCandidate } from "../../../src/global/contracts/index.js";


class TestBackendCandidate extends CjsBackendCandidate
{
    #prove;

    constructor(name, prove = () => true, requirements = {})
    {
        super();
        this.name = name;
        this.#prove = prove;
        this.limits = requirements.limits ?? null;
        this.features = requirements.features ?? null;
    }

    Prove(context)
    {
        return this.#prove(context);
    }
}

function candidate(name, prove, requirements)
{
    return new TestBackendCandidate(name, prove, requirements);
}

function candidates()
{
    return [ candidate("webgpu"), candidate("webgl") ];
}

function capabilities(values = {})
{
    return { webgpu: false, webgl2: false, ...values };
}

test("SelectBackend commits to one backend and says why the rest lost", async () =>
{
    const selection = await SelectBackend({
        capabilities: capabilities({ webgpu: true, webgl2: true }),
        candidates: candidates()
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
    const selection = await SelectBackend({
        capabilities: capabilities({ webgl2: true }),
        candidates: candidates()
    });

    assert.equal(selection.effective, "webgl");
    assert.equal(selection.candidates[0].rejected, CjsBackendRejection.UNSUPPORTED);
});

test("SelectBackend lets application policy outrank the default order", async () =>
{
    const selection = await SelectBackend({
        capabilities: capabilities({ webgpu: true, webgl2: true }),
        candidates: candidates(),
        preference: [ "webgl", "webgpu" ]
    });

    assert.equal(selection.effective, "webgl");
    assert.deepEqual(selection.requested, [ "webgl", "webgpu" ]);
});

test("SelectBackend awaits required proof and falls through a failure", async () =>
{
    const seen = [];
    const selection = await SelectBackend({
        capabilities: capabilities({ webgpu: true, webgl2: true }),
        candidates: [
            candidate("webgpu", async context =>
            {
                seen.push(context.name);
                throw new Error("device request rejected");
            }),
            candidate("webgl", async () => ({ context: "gl" }))
        ]
    });

    assert.deepEqual(seen, [ "webgpu" ], "the proof runs, and runtime core never creates the device itself");
    assert.equal(selection.effective, "webgl");
    assert.deepEqual(selection.backend.proof, { context: "gl" });
    assert.equal(selection.backend.proven, true);
    assert.equal(selection.candidates[0].rejected, CjsBackendRejection.UNPROVEN);
    assert.equal(selection.candidates[0].error, "device request rejected");
});

test("SelectBackend requires exact nominal candidates", async () =>
{
    await assert.rejects(
        () => SelectBackend({ capabilities: capabilities({ webgpu: true }) }),
        /candidates are required/u
    );
    await assert.rejects(
        () => SelectBackend({ capabilities: capabilities({ webgpu: true }), candidates: [ "webgpu" ] }),
        /extend CjsBackendCandidate/u
    );
    await assert.rejects(
        () => SelectBackend({
            capabilities: capabilities({ webgpu: true }),
            candidates: [ { name: "webgpu", Prove: () => true } ]
        }),
        /extend CjsBackendCandidate/u
    );
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
        candidates: [ candidate("webgpu", context =>
        {
            handed = context;
            return true;
        }, {
            limits: { maxSampledTexturesPerShaderStage: 20 },
            features: [ "texture-compression-bc", "shader-f16" ]
        }) ]
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
    await assert.rejects(
        () => SelectBackend({ capabilities: capabilities(), candidates: candidates() }),
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

    await assert.rejects(
        () => SelectBackend({
            capabilities: capabilities({ webgpu: true }),
            candidates: [ candidate("webgpu") ],
            preference: [ "metal" ]
        }),
        error => error.code === "CJS_LIBRARY_BACKEND_UNKNOWN"
    );

    await assert.rejects(
        () => SelectBackend({
            capabilities: capabilities({ webgpu: true }),
            candidates: [ candidate("webgpu"), candidate("webgpu") ]
        }),
        /duplicate backend candidate/u
    );

    await assert.rejects(
        () => SelectBackend({ candidates: [ candidate("stub") ], platform: {} }),
        /Tr2PlatformInfo/u
    );
});

test("SelectBackend trusts an unprobed backend only after its nominal proof", async () =>
{
    const selection = await SelectBackend({
        capabilities: capabilities(),
        candidates: [ candidate("stub") ],
        preference: [ "stub" ]
    });
    assert.equal(selection.effective, "stub");
    assert.equal(selection.backend.proven, true);

    const unimplemented = new CjsBackendCandidate();
    unimplemented.name = "stub";
    await assert.rejects(
        () => SelectBackend({
            capabilities: capabilities(),
            candidates: [ unimplemented ],
            preference: [ "stub" ]
        }),
        error => error.code === "CJS_LIBRARY_BACKEND_UNAVAILABLE"
            && /must be overridden/u.test(error.candidates[0].error)
    );
});

test("CjsLibrary probes, records capabilities, and commits one backend", async () =>
{
    const library = new CjsLibrary();
    const selection = await library.SelectBackendAsync({
        gpu: null,
        context: fakeWebGL2(),
        candidates: [ candidate("webgl") ]
    });

    assert.equal(selection.effective, "webgl");
    assert.equal(library.GetCapability("webgl2"), true, "the probe result is recorded, not just consulted");
    assert.equal(library.GetCapability("backend"), "webgl");
    assert.equal(library.GetBackendSelection(), selection);

    library.Shutdown();
    assert.equal(library.GetBackendSelection(), null);
    assert.equal(library.HasCapability("backend"), false);
});

test("CjsLibrary selects against registered capabilities when told not to probe", async () =>
{
    const library = new CjsLibrary();
    library.RegisterCapabilities(capabilities({ webgl2: true }));

    const selection = await library.SelectBackendAsync({
        probe: false,
        candidates: [ candidate("webgl") ]
    });
    assert.equal(selection.effective, "webgl");
});

test("CjsLibrary selects a backend as part of initialization", async () =>
{
    const library = new CjsLibrary();
    await library.InitializeAsync({
        capabilities: capabilities({ webgpu: true }),
        backend: { probe: false, candidates: [ candidate("webgpu") ] }
    });

    assert.equal(library.GetValues().initialized, true);
    assert.equal(library.GetCapability("backend"), "webgpu");

    const untouched = new CjsLibrary();
    await untouched.InitializeAsync({});
    assert.equal(untouched.GetBackendSelection(), null);
});

function fakeWebGL2()
{
    return {
        MAX_ARRAY_TEXTURE_LAYERS: 0x9001,
        MAX_SAMPLES: 0x9002,
        getParameter: query => (query === 0x9001 ? 256 : 4),
        getSupportedExtensions: () => [],
        getExtension: () => null
    };
}
