import assert from "node:assert/strict";
import test from "node:test";
import {
    CjsLibrary,
    PlatformStaticCap,
    Tr2DisplayMode,
    Tr2PlatformInfo,
    Tr2VideoAdapter,
    Tr2VideoAdapters,
    Tr2VideoDriver
} from "../src/index.js";

function fakeAdapter()
{
    return {
        info: {
            vendor: "test-vendor",
            architecture: "test-architecture",
            device: "test-device",
            description: "Privacy-filtered test adapter",
            isFallbackAdapter: false
        },
        features: new Set([ "timestamp-query", "texture-compression-bc" ]),
        limits: {
            maxStorageBuffersPerShaderStage: 8,
            maxStorageTexturesPerShaderStage: 4,
            maxUniformBuffersPerShaderStage: 12,
            maxComputeWorkgroupSizeX: 256,
            maxTextureArrayLayers: 256,
            maxTextureDimension2D: 8192
        }
    };
}

test("Tr2PlatformInfo reports observed browser WebGPU capabilities", async () =>
{
    const platform = await Tr2PlatformInfo.Detect({ adapter: fakeAdapter(), taa: true });

    assert.equal(platform.platformName, "webgpu", "the platform name is the effect.<name> path segment, as Carbon's dx11 is");
    assert.equal(platform.GetStaticCap(PlatformStaticCap.NON_SYNCHRONIZED_LOCKS), false);
    assert.equal(platform.GetStaticCap(PlatformStaticCap.BUFFER_SHADER_RESOURCES), true);
    assert.equal(platform.GetStaticCap("UNORDERED_ACCESS"), true);
    assert.equal(platform.GetStaticCap(PlatformStaticCap.COMPUTE), true);
    assert.equal(platform.GetStaticCap(PlatformStaticCap.TEXTURE_ARRAYS), true);
    assert.equal(platform.GetStaticCap(PlatformStaticCap.MSAA_SAMPLE), true);
    assert.equal(platform.GetStaticCap(PlatformStaticCap.TAA), true);

    const library = new CjsLibrary();
    platform.RegisterCapabilities(library);
    assert.equal(library.GetCapability("webgpu"), true);
    assert.equal(library.GetCapability("compute"), true);
    assert.equal(library.GetCapability("nonSynchronizedLocks"), false);
});

test("Tr2PlatformInfo leaves unavailable browser capabilities false", async () =>
{
    const platform = await Tr2PlatformInfo.Detect({ gpu: null });
    assert.equal(platform.platformName, null, "no backend, no platform name");
    assert.equal(platform.GetCapabilities().webgpu, false);
    assert.equal(platform.GetStaticCap(PlatformStaticCap.COMPUTE), false);
});

test("Tr2VideoAdapter and Tr2VideoDriver preserve only browser-visible information", async () =>
{
    const adapter = await Tr2VideoAdapter.FromGPUAdapter(fakeAdapter());
    const driver = adapter.GetDriverInfo();

    assert.equal(adapter.vendorID, "test-vendor");
    assert.equal(adapter.deviceID, "test-device");
    assert.equal(adapter.GetDeviceIdentifierString(), "test-vendor:test-architecture:test-device");
    assert.deepEqual(adapter.features, [ "texture-compression-bc", "timestamp-query" ]);
    assert.equal(adapter.limits.maxTextureDimension2D, 8192);
    assert.ok(driver instanceof Tr2VideoDriver);
    assert.equal(driver.driverVendor, "test-vendor");
    assert.equal(driver.driverVersion, null);
    assert.equal(driver.driverDate, null);
});

test("Tr2DisplayMode snapshots the current Screen without inventing mode data", () =>
{
    const mode = Tr2DisplayMode.FromScreen({
        width: 1920,
        height: 1080,
        availWidth: 1900,
        availHeight: 1040,
        colorDepth: 24,
        pixelDepth: 24,
        isExtended: true,
        orientation: { type: "landscape-primary", angle: 0 }
    }, { devicePixelRatio: 2 });

    assert.equal(mode.width, 1920);
    assert.equal(mode.availHeight, 1040);
    assert.equal(mode.pixelRatio, 2);
    assert.equal(mode.refreshRateNumerator, 0);
    assert.equal(mode.format, null);
});

test("Tr2VideoAdapters exposes the single adapter selected by the browser", async () =>
{
    const adapter = fakeAdapter();
    const gpu = {
        requestAdapter: async () => adapter,
        getPreferredCanvasFormat: () => "bgra8unorm"
    };
    const manager = await Tr2VideoAdapters.Detect({
        gpu,
        screen: { width: 1280, height: 720, availWidth: 1280, availHeight: 700 },
        window: { devicePixelRatio: 1.5 },
        renderTargetFormats: new Set([ "rgba16float" ])
    });

    assert.equal(manager.GetAdapterCount(), 1);
    assert.equal(manager.GetAdapterInfo(0).description, "Privacy-filtered test adapter");
    assert.equal(manager.GetCurrentDisplayMode(0).format, "bgra8unorm");
    assert.equal(manager.GetDisplayModeCount(0, "bgra8unorm"), 1);
    assert.equal(manager.GetDisplayModeCount(0, "rgba8unorm"), 0);
    assert.equal(manager.SupportsRenderTargetFormat(0, "rgba16float"), true);
    assert.equal(manager.GetMaxTextureSize(0), 8192);
});
