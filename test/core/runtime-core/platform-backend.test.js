import assert from "node:assert/strict";
import test from "node:test";
import {
    CjsLibrary,
    CjsWebGLProbe,
    PlatformStaticCap,
    ResolveDeviceRequirements,
    ResolveRequiredLimits,
    Tr2PlatformInfo,
    WEBGL2_PARAMETERS,
    WEBGPU_DEFAULT_LIMITS
} from "../../../src/core/index.js";

function fakeAdapter()
{
    return {
        info: { vendor: "test-vendor", architecture: "test-architecture", device: "test-device" },
        features: new Set([ "timestamp-query", "texture-compression-bc" ]),
        limits: {
            maxStorageBuffersPerShaderStage: 8,
            maxStorageTexturesPerShaderStage: 4,
            maxUniformBuffersPerShaderStage: 12,
            maxComputeWorkgroupSizeX: 256,
            maxTextureArrayLayers: 256,
            maxTextureDimension2D: 8192,
            maxSampledTexturesPerShaderStage: 16
        }
    };
}

// A WebGL2 context stands in for the browser's. Parameter tokens are arbitrary
// numbers resolved off the context by name, exactly as the probe resolves them,
// so nothing here depends on the real GL enum values.
function fakeWebGL2(values = {}, options = {})
{
    const limits = {
        MAX_TEXTURE_IMAGE_UNITS: 16,
        MAX_COMBINED_TEXTURE_IMAGE_UNITS: 32,
        MAX_ARRAY_TEXTURE_LAYERS: 256,
        MAX_SAMPLES: 4,
        MAX_UNIFORM_BUFFER_BINDINGS: 24,
        ...values
    };
    const tokens = new Map();
    const context = { lost: false };

    let token = 0x8000;
    for (const name of WEBGL2_PARAMETERS)
    {
        if (!(name in limits)) continue;
        context[name] = ++token;
        tokens.set(token, limits[name]);
    }

    context.getParameter = query => tokens.get(query);
    context.getSupportedExtensions = () => options.extensions
        ?? [ "EXT_color_buffer_float", "EXT_texture_filter_anisotropic" ];
    context.getExtension = name => (name === "WEBGL_lose_context"
        ? { loseContext: () => { context.lost = true; } }
        : null);

    return context;
}

function fakeCanvas(context)
{
    return { getContext: type => (type === "webgl2" ? context : null) };
}

test("CjsWebGLProbe reports WebGL2 as a fact of its own", () =>
{
    const probe = CjsWebGLProbe.Detect({ context: fakeWebGL2() });

    assert.equal(probe.available, true);
    assert.equal(probe.contextType, "webgl2");
    assert.equal(probe.GetLimit("MAX_TEXTURE_IMAGE_UNITS"), 16);
    assert.equal(probe.GetLimit("MAX_TEXTURE_SIZE", -1), -1, "an unread parameter falls back rather than reporting zero");
    assert.equal(probe.HasExtension("EXT_color_buffer_float"), true);
    assert.deepEqual(probe.GetCapabilities(), {
        webgl2: true,
        webgl2Limits: probe.limits,
        webgl2Extensions: [ "EXT_color_buffer_float", "EXT_texture_filter_anisotropic" ]
    });
});

test("CjsWebGLProbe answers Carbon's static caps as WebGL2 defines them", () =>
{
    const caps = CjsWebGLProbe.Detect({ context: fakeWebGL2() }).GetStaticCaps();

    // Present in the API and measured from the context.
    assert.equal(caps.TEXTURE_ARRAYS, true);
    assert.equal(caps.MSAA_SAMPLE, true);
    // Absent from WebGL2 by definition, which is why engine-webgl must lower
    // Carbon's structured buffers where engine-webgpu binds them natively.
    assert.equal(caps.COMPUTE, false);
    assert.equal(caps.BUFFER_SHADER_RESOURCES, false);
    assert.equal(caps.UNORDERED_ACCESS, false);

    const single = CjsWebGLProbe.Detect({ context: fakeWebGL2({ MAX_ARRAY_TEXTURE_LAYERS: 1, MAX_SAMPLES: 1 }) });
    assert.equal(single.GetStaticCaps().TEXTURE_ARRAYS, false, "one layer is not an array capability");
    assert.equal(single.GetStaticCaps().MSAA_SAMPLE, false);
});

test("CjsWebGLProbe releases the context it created and keeps one it was given", () =>
{
    const owned = fakeWebGL2();
    CjsWebGLProbe.Detect({ canvas: fakeCanvas(owned) });
    assert.equal(owned.lost, true, "a probe that held its context would cost a renderer one");

    const injected = fakeWebGL2();
    CjsWebGLProbe.Detect({ context: injected });
    assert.equal(injected.lost, false, "a caller's context is the caller's to keep");
});

test("CjsWebGLProbe treats an unavailable context as a capability, not a failure", () =>
{
    const absent = CjsWebGLProbe.Detect({ canvas: { getContext: () => null } });
    assert.equal(absent.available, false);
    assert.equal(absent.GetCapabilities().webgl2, false);

    const throwing = CjsWebGLProbe.Detect({ canvas: { getContext() { throw new Error("blocked"); } } });
    assert.equal(throwing.available, false);
    assert.equal(throwing.probeError, "blocked");
});

test("Tr2PlatformInfo separates 'no WebGPU' from 'WebGL is available'", async () =>
{
    // The exact fact engine selection turns on: both machines report
    // webgpu === false, and only one of them can run an engine.
    const withGL = await Tr2PlatformInfo.Detect({ gpu: null, context: fakeWebGL2() });
    const without = await Tr2PlatformInfo.Detect({ gpu: null, webgl: false });

    assert.equal(withGL.GetCapabilities().webgpu, false);
    assert.equal(without.GetCapabilities().webgpu, false);

    assert.equal(withGL.GetCapabilities().webgl2, true);
    assert.equal(without.GetCapabilities().webgl2, false);

    assert.equal(withGL.backend, Tr2PlatformInfo.Backend.WEBGL);
    assert.equal(without.backend, Tr2PlatformInfo.Backend.NONE);
    // platformName is the resource-path discriminator, so it is the backend
    // name: it is what turns `effect/` into `effect.webgl/`.
    assert.equal(withGL.platformName, "webgl");
    assert.equal(without.platformName, null);
});

test("Tr2PlatformInfo describes exactly one backend's capabilities", async () =>
{
    const webgl = await Tr2PlatformInfo.Detect({ gpu: null, context: fakeWebGL2() });
    assert.equal(webgl.GetStaticCap(PlatformStaticCap.TEXTURE_ARRAYS), true);
    assert.equal(webgl.GetStaticCap(PlatformStaticCap.COMPUTE), false, "WebGL2 has no compute stage");

    // WebGPU wins the report when both are present, and its answers are its own.
    const both = await Tr2PlatformInfo.Detect({ adapter: fakeAdapter(), context: fakeWebGL2() });
    assert.equal(both.backend, Tr2PlatformInfo.Backend.WEBGPU);
    assert.equal(both.GetStaticCap(PlatformStaticCap.COMPUTE), true);
    assert.equal(both.GetCapabilities().webgl2, true, "the other backend is still reported as present");

    const library = new CjsLibrary();
    webgl.RegisterCapabilities(library);
    assert.equal(library.GetCapability("webgl2"), true);
    assert.equal(library.GetCapability("backend"), "webgl");
});

test("ResolveRequiredLimits asks only for what is above the default", () =>
{
    const adapterLimits = { maxSampledTexturesPerShaderStage: 32, maxStorageBuffersPerShaderStage: 10 };

    const { requiredLimits, unsatisfied } = ResolveRequiredLimits({
        maxSampledTexturesPerShaderStage: 20,
        maxStorageBuffersPerShaderStage: 8,
        maxSamplersPerShaderStage: 16
    }, adapterLimits);

    assert.deepEqual(requiredLimits, { maxSampledTexturesPerShaderStage: 20 });
    assert.equal(unsatisfied.length, 0);
    assert.equal(WEBGPU_DEFAULT_LIMITS.maxSampledTexturesPerShaderStage, 16);
});

test("ResolveRequiredLimits reports an unsupportable limit instead of requesting it", () =>
{
    // requestDevice REJECTS a limit above the adapter's, so asking would fail
    // the whole library where reporting lets a caller substitute a lowered path.
    const { requiredLimits, unsatisfied } = ResolveRequiredLimits(
        { maxSampledTexturesPerShaderStage: 64 },
        { maxSampledTexturesPerShaderStage: 32 }
    );

    assert.deepEqual(requiredLimits, {});
    assert.deepEqual(unsatisfied, [
        { name: "maxSampledTexturesPerShaderStage", requested: 64, supported: 32, default: 16 }
    ]);
});

test("ResolveRequiredLimits refuses a name it cannot reason about", () =>
{
    assert.throws(() => ResolveRequiredLimits({ maxSampledTexturesPerShaderStge: 20 }), RangeError);
    assert.throws(() => ResolveRequiredLimits({ maxSampledTexturesPerShaderStage: "many" }), RangeError);
    // An alignment limit improves DOWNWARD, so the keep-the-larger rule would
    // invert it. It is rejected rather than mishandled.
    assert.throws(() => ResolveRequiredLimits({ minUniformBufferOffsetAlignment: 32 }), RangeError);
});

test("ResolveDeviceRequirements produces a descriptor an engine passes through unchanged", async () =>
{
    const adapter = {
        limits: { maxSampledTexturesPerShaderStage: 32 },
        features: [ "texture-compression-bc", "timestamp-query" ]
    };

    const resolved = ResolveDeviceRequirements({
        label: "space",
        limits: { maxSampledTexturesPerShaderStage: 20 },
        features: [ "texture-compression-bc", "shader-f16" ]
    }, adapter);

    assert.deepEqual(resolved.descriptor, {
        requiredLimits: { maxSampledTexturesPerShaderStage: 20 },
        requiredFeatures: [ "texture-compression-bc" ],
        label: "space"
    });
    assert.deepEqual(resolved.unavailableFeatures, [ "shader-f16" ]);

    // The descriptor is exactly what engine-webgpu hands to requestDevice.
    let seen = null;
    await { requestDevice: async descriptor => { seen = descriptor; } }.requestDevice(resolved.descriptor);
    assert.equal(seen, resolved.descriptor);
});

test("ResolveDeviceRequirements stays empty when nothing above the default is wanted", async () =>
{
    assert.deepEqual(ResolveDeviceRequirements({}, null).descriptor, {});

    // Tr2PlatformInfo exposes the same decision against the probed adapter.
    const platform = await Tr2PlatformInfo.Detect({ adapter: fakeAdapter(), webgl: false });
    const demand = { limits: { maxTextureDimension2D: 16384 } };

    assert.deepEqual(platform.GetDeviceDescriptor(demand), {});
    assert.equal(
        platform.ResolveDeviceRequirements(demand).unsatisfiedLimits[0].supported,
        8192,
        "the fake adapter advertises the default, so a larger request is reported rather than sent"
    );
});

test("Tr2PlatformInfo lets configuration override the derived platform name", async () =>
{
    // The backend supplies the default. It does not fix the value: pointing a
    // backend at a different compiled-effect tree is a configuration choice,
    // and configuration is this package's to own. ccpwgl's original lineage
    // refines the same value from a capability probe (Mali renderer string ->
    // an effect.gles2.mali<version> directory), which is why this is separable
    // at all - Carbon cannot show it, because its name IS the linked backend.
    const derived = await Tr2PlatformInfo.Detect({ gpu: null, context: fakeWebGL2() });
    assert.equal(derived.platformName, "webgl");

    const configured = await Tr2PlatformInfo.Detect({
        gpu: null,
        context: fakeWebGL2(),
        platformName: "gles2.mali400"
    });
    assert.equal(configured.platformName, "gles2.mali400");
    assert.equal(configured.backend, Tr2PlatformInfo.Backend.WEBGL, "a different tree is not a different backend");
});
