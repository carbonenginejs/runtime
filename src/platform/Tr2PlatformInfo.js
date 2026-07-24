import { Tr2VideoAdapter } from "./Tr2VideoAdapter.js";

export const PlatformStaticCap = Object.freeze({
    NON_SYNCHRONIZED_LOCKS: 0,
    BUFFER_SHADER_RESOURCES: 1,
    UNORDERED_ACCESS: 2,
    COMPUTE: 3,
    TEXTURE_ARRAYS: 4,
    MSAA_SAMPLE: 5,
    TAA: 6
});

const CAPABILITY_NAMES = Object.freeze(Object.fromEntries(
    Object.entries(PlatformStaticCap).map(([ name, value ]) => [ value, name ])
));

/** Browser feature report replacing Carbon's compile-time platform macros. */
export class Tr2PlatformInfo
{
    static StaticCap = PlatformStaticCap;

    /** Creates a browser platform capability report. */
    constructor(values = {})
    {
        this.platformName = values.platformName ?? "browser";
        this.platformID = values.platformID ?? 0;
        this.isLowPerformance = values.isLowPerformance ?? false;
        this.adapter = values.adapter ?? null;
        this.probeError = values.probeError ?? null;
        this.#staticCaps = new Map();
        for (const name of Object.keys(PlatformStaticCap)) this.#staticCaps.set(name, values.staticCaps?.[name] === true);
    }

    #staticCaps;

    /** Reports one named or numeric static platform capability. */
    GetStaticCap(capability)
    {
        const name = typeof capability === "string"
            ? capability
            : CAPABILITY_NAMES[capability];
        return name ? this.#staticCaps.get(name) === true : false;
    }

    /** Returns an immutable capability record suitable for CjsLibrary. */
    GetCapabilities()
    {
        const adapter = this.adapter;
        return Object.freeze({
            webgpu: adapter !== null,
            nonSynchronizedLocks: this.GetStaticCap(PlatformStaticCap.NON_SYNCHRONIZED_LOCKS),
            bufferShaderResources: this.GetStaticCap(PlatformStaticCap.BUFFER_SHADER_RESOURCES),
            unorderedAccess: this.GetStaticCap(PlatformStaticCap.UNORDERED_ACCESS),
            compute: this.GetStaticCap(PlatformStaticCap.COMPUTE),
            textureArrays: this.GetStaticCap(PlatformStaticCap.TEXTURE_ARRAYS),
            msaaSample: this.GetStaticCap(PlatformStaticCap.MSAA_SAMPLE),
            taa: this.GetStaticCap(PlatformStaticCap.TAA),
            webgpuFeatures: adapter?.features ?? Object.freeze([]),
            webgpuLimits: adapter?.limits ?? Object.freeze({}),
            lowPerformance: this.isLowPerformance
        });
    }

    /** Registers the detected capabilities with a CjsLibrary-like registry. */
    RegisterCapabilities(library)
    {
        if (!library || typeof library.RegisterCapabilities !== "function")
        {
            throw new TypeError("Tr2PlatformInfo requires a CjsLibrary-like capability registry.");
        }
        library.RegisterCapabilities(this.GetCapabilities());
        return this;
    }

    /** Detects privacy-safe browser and WebGPU capabilities. */
    static async Detect(options = {})
    {
        const navigatorObject = options.navigator ?? globalThis.navigator ?? null;
        const gpu = Object.prototype.hasOwnProperty.call(options, "gpu") ? options.gpu : navigatorObject?.gpu;
        let gpuAdapter = Object.prototype.hasOwnProperty.call(options, "adapter") ? options.adapter : null;
        let probeError = null;

        if (!Object.prototype.hasOwnProperty.call(options, "adapter") && gpu?.requestAdapter)
        {
            try
            {
                gpuAdapter = await gpu.requestAdapter(options.adapterOptions);
            }
            catch (error)
            {
                probeError = error instanceof Error ? error.message : String(error);
            }
        }

        const adapter = gpuAdapter ? await Tr2VideoAdapter.FromGPUAdapter(gpuAdapter, { index: 0 }) : null;
        const limits = adapter?.limits ?? {};
        const hasWebGPU = adapter !== null;
        const storageBuffers = Number(limits.maxStorageBuffersPerShaderStage) > 0;
        const storageTextures = Number(limits.maxStorageTexturesPerShaderStage) > 0;
        const staticCaps = {
            // Browser WebGPU exposes only synchronized async mapping.
            NON_SYNCHRONIZED_LOCKS: false,
            BUFFER_SHADER_RESOURCES: hasWebGPU && (
                storageBuffers || Number(limits.maxUniformBuffersPerShaderStage) > 0
            ),
            UNORDERED_ACCESS: hasWebGPU && (storageBuffers || storageTextures),
            COMPUTE: hasWebGPU && Number(limits.maxComputeWorkgroupSizeX) > 0,
            TEXTURE_ARRAYS: hasWebGPU && Number(limits.maxTextureArrayLayers) > 1,
            // Multisampled textures and texture_multisampled_2d are core WebGPU.
            MSAA_SAMPLE: hasWebGPU,
            // TAA is an application/engine feature, not a browser API capability.
            TAA: options.taa === true
        };

        return new Tr2PlatformInfo({
            platformName: hasWebGPU ? "browser-webgpu" : "browser",
            platformID: 0,
            isLowPerformance: adapter?.isFallbackAdapter ?? false,
            adapter,
            probeError,
            staticCaps
        });
    }
}

export default Tr2PlatformInfo;
