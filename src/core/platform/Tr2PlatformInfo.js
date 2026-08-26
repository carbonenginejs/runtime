import { CjsWebGLProbe } from "./CjsWebGLProbe.js";
import { ResolveDeviceRequirements } from "./deviceLimits.js";
import { ResolveEffectPath } from "./effectPath.js";
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

// Source: carbonengine/trinity/Tr2PlatformInfo.h
// Source: carbonengine/trinity/Tr2PlatformInfo.cpp
// Source: carbonengine/trinity/trinityal/include/TrinityALForward.h
// CarbonEngine MIT adaptation; TrinityALForward.h:50-90 defines the platform
// macros adapted below.
//
// Carbon's version is ENTIRELY COMPILE-TIME: every accessor returns a
// preprocessor macro of whichever backend was linked, and there is no probing
// because there is nothing to probe. We select a backend at runtime, so the
// same questions become measurements - but the ANSWERS must keep Carbon's
// meaning, and one of them had drifted.
//
// GetPlatformName IS THE RESOURCE-PATH DISCRIMINATOR, NOT A DESCRIPTION.
// Tr2Effect.cpp:326 rewrites "/effect/" to "." TRINITY_PLATFORM_NAME "/", which
// is how "dx11" reaches `effect.dx11/`. Ours is what reaches `effect.webgpu/`
// and `effect.webgl/`. It previously returned "browser" / "browser-webgpu",
// which is a sentence about the host rather than the value the path needs; the
// descriptive facts live in the capability keys instead.
//
// This is also why Carbon's stub target reports "dx11" rather than "stub", with
// the source comment "In order to use the dx11 platform specific res files as
// our own". A stub engine of ours reports a real backend name for the same
// reason.
//
// THE NAME IS DERIVED BUT NOT FIXED, AND THAT DISTINCTION IS LOAD-BEARING.
// Carbon cannot separate the two - its name IS the linked backend - so Carbon
// alone would justify a hard mapping. ccpwgl's original lineage shows the
// separation: `Tw2Device.effectDir` is an ordinary mutable field, and its
// context setup REFINES the value from a runtime capability probe, switching to
// an `effect.gles2.mali<version>` directory when the renderer string matches a
// Mali part. Both are in ccpwgl's initial commit, so this is independent
// evidence rather than our own convention reflected back.
//
// (Its later `EffectProfiles` table and its `effect.dx11` / `effect.webgl2`
// entries are NOT prior art: `git log -S` puts them in commits that added our
// own Carbon container work to ccpwgl. Do not cite them as corroboration.
// Authority: docs/documentation-rules.md, Independent corroboration.)
//
// So the backend supplies the DEFAULT and configuration wins, which is also
// where the engine-backends plan puts it: runtime core owns configuration, and
// an engine is told what to load rather than deciding it. A caller pointing a
// WebGL backend at a different compiled-effect tree is a configuration choice,
// not a different backend.
//
// AND IT IS A DEFAULT FOR UNQUALIFIED PATHS ONLY. Carbon substitutes only into
// "/effect/" (Tr2Effect.cpp:320-333), so a path that already names a tree
// passes through untouched. One name is what an unqualified path becomes, not
// a partition of what may be loaded.
//
// HOW MANY TREES THAT ALLOWS IS THE BACKEND'S ANSWER, NOT THIS FIELD'S, AND THE
// TWO BACKENDS GENUINELY DIFFER. WebGL can mix: CCP's v8-format gles2 tree is
// GLSL a WebGL context compiles, so qualified paths into it load beside a
// Carbon-derived WebGL tree. WebGPU cannot: WGSL only, so a GLSL tree is
// unloadable there at any path.
//
// That asymmetry is why the override exists and is ALL it is for. We do not
// expect to ship against CCP's trees - they are a testing convenience, useful
// for comparing our output against theirs - so nothing here should grow a
// mechanism for mixing. One overridable default covers it.
//
// Anything deciding whether an already-qualified resource is loadable must ask
// the backend about the shading language rather than read this name.

/** Browser feature report replacing Carbon's compile-time platform macros. */
export class Tr2PlatformInfo
{
    static StaticCap = PlatformStaticCap;

    // Carbon selects a backend by which shared library the launcher loads, so
    // its static caps always describe exactly one backend. Ours are probed at
    // runtime, and the caps must still describe ONE - a report claiming WebGPU's
    // compute capability on a machine that will run the WebGL engine is worse
    // than no report. This names which backend the caps below are about; a
    // library still chooses its own engine and may choose the lesser one.

    /** Which backend a capability report describes. */
    static Backend = Object.freeze({
        NONE: "none",
        WEBGPU: "webgpu",
        WEBGL: "webgl"
    });

    /**
     * The platform name each backend reports, which is the path segment a
     * compiled effect is resolved through: `effect/` becomes `effect.webgpu/`
     * or `effect.webgl/`, exactly as Carbon's `dx11` becomes `effect.dx11/`.
     */
    static PlatformName = Object.freeze({
        none: null,
        webgpu: "webgpu",
        webgl: "webgl"
    });

    /** Creates a browser platform capability report. */
    constructor(values = {})
    {
        this.backend = values.backend ?? Tr2PlatformInfo.Backend.NONE;
        this.platformName = values.platformName ?? Tr2PlatformInfo.PlatformName[this.backend] ?? null;
        // Carbon's TRINITY_PLATFORM is a per-backend build constant (dx11 = 2,
        // stub = 5, dx12 = 6, metal = 10) naming targets that do not exist
        // here, so a browser value in that numbering would be a fabrication.
        // It stays zero, as it has been, and nothing reads it.
        this.platformID = values.platformID ?? 0;
        this.isLowPerformance = values.isLowPerformance ?? false;
        this.adapter = values.adapter ?? null;
        this.webgl = values.webgl ?? null;
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

    // The WebGL keys are SEPARATE keys, not a reinterpretation of the WebGPU
    // ones. `webgpu === false` states only that WebGPU is absent; it is not
    // evidence that WebGL2 is present, and a behavior selecting a WebGL engine
    // needs the positive fact. docs/engine-backends-plan.md decision 7.

    /** Returns an immutable capability record suitable for CjsLibrary. */
    GetCapabilities()
    {
        const adapter = this.adapter;
        return Object.freeze({
            backend: this.backend,
            webgpu: adapter !== null,
            ...(this.webgl?.GetCapabilities() ?? { webgl2: false }),
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

    /**
     * Resolves a content demand into a GPUDeviceDescriptor for the probed
     * adapter, plus the demands dropped so `requestDevice` would not reject.
     *
     * This is the library's decision, and an engine receives the result through
     * its injectable `deviceDescriptor` option rather than deciding for itself.
     */
    ResolveDeviceRequirements(demand = {})
    {
        return ResolveDeviceRequirements(demand, this.adapter);
    }

    /** The GPUDeviceDescriptor alone, for a caller that wants no diagnostics. */
    GetDeviceDescriptor(demand = {})
    {
        return this.ResolveDeviceRequirements(demand).descriptor;
    }

    /**
     * Resolves an authored effect path against this report's platform name.
     * The engine is handed a resolved path and never computes one.
     */
    ResolveEffectPath(path, options = {})
    {
        return ResolveEffectPath(path, { shaderModel: options.shaderModel, platformName: this.platformName });
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

        // Probed even when WebGPU answered, because "which backends exist" and
        // "which backend was selected" are different questions and a caller may
        // legitimately compose the WebGL library on a WebGPU-capable machine.
        // Skipped only when the caller says so, since acquiring a context is
        // not free.
        const webgl = options.webgl === false
            ? new CjsWebGLProbe({ available: false })
            : (options.webgl instanceof CjsWebGLProbe ? options.webgl : CjsWebGLProbe.Detect(options));

        const backend = hasWebGPU
            ? Tr2PlatformInfo.Backend.WEBGPU
            : (webgl.available ? Tr2PlatformInfo.Backend.WEBGL : Tr2PlatformInfo.Backend.NONE);

        // A WebGL2 machine gets WebGL2's answers, which are not WebGPU's with
        // the flags cleared: texture arrays and multisampling are genuinely
        // present, while compute, storage buffers and image load/store are
        // genuinely absent from the API.
        if (backend === Tr2PlatformInfo.Backend.WEBGL)
        {
            return new Tr2PlatformInfo({
                // Configuration wins over derivation; see the note above.
                platformName: options.platformName,
                isLowPerformance: false,
                adapter,
                webgl,
                backend,
                probeError: probeError ?? webgl.probeError,
                staticCaps: { ...webgl.GetStaticCaps(), TAA: options.taa === true }
            });
        }

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
            // DELIBERATE DEVIATION. Carbon declares TAA and NON_SYNCHRONIZED_LOCKS
            // in its StaticCap enum but handles neither in the switch, so both
            // fall to `default: return false` and TRINITY_SUPPORTS_TAA is never
            // read - its HANDLE_APPLICATION_CAP macro is defined and never used
            // (Tr2PlatformInfo.cpp:22-37). TAA is genuinely an application
            // choice, so ours honours the caller's answer rather than porting
            // dead code. NON_SYNCHRONIZED_LOCKS stays false, which agrees with
            // both Carbon's behavior and the browser's.
            TAA: options.taa === true
        };

        return new Tr2PlatformInfo({
            platformName: options.platformName,
            isLowPerformance: adapter?.isFallbackAdapter ?? false,
            adapter,
            webgl,
            backend,
            probeError,
            staticCaps
        });
    }
}

export default Tr2PlatformInfo;
