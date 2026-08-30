// NON-CARBON EXTENSION. Carbon selects a backend at link time and has no WebGL
// target at all, so there is no Carbon class to port here. This exists because
// a library must be able to answer "is WebGL2 available" as a fact of its own,
// not as the negation of a WebGPU probe: `capabilities.webgpu === false` says
// only that WebGPU is absent, which is not the same statement as "WebGL2 is
// present" and cannot select an engine. Authority:
// docs/engine-backends-plan.md decision 7; registered in
// docs/architecture/non-carbon-extensions.md.
//
// PROBING IS THE LIBRARY'S JOB, NOT AN ENGINE'S. An engine that probes is an
// engine that will disagree with its library about what it is running on, so
// this reports and an engine is told.
//
// The probe creates a throwaway context and gives it back. Browsers cap the
// number of live WebGL contexts per page (commonly sixteen) and evict the
// oldest, so a probe that held its context would cost a real renderer one.
import { finiteNumber } from "./browserHelpers.js";


/**
 * The WebGL2 parameters a renderer plans against, by their GL names rather than
 * invented camel-case: these are the spellings that can be re-checked against
 * the specification and against a live context in one step.
 *
 * `MAX_TEXTURE_IMAGE_UNITS` is the load-bearing one. WebGL2 guarantees sixteen
 * per stage and the v5 quad `.sm_depth` family lands at exactly fifteen and
 * sixteen after lowering, with zero headroom. See
 * docs/contracts/webgl2-texture-budget.md.
 */
export const WEBGL2_PARAMETERS = Object.freeze([
    "MAX_TEXTURE_IMAGE_UNITS",
    "MAX_VERTEX_TEXTURE_IMAGE_UNITS",
    "MAX_COMBINED_TEXTURE_IMAGE_UNITS",
    "MAX_TEXTURE_SIZE",
    "MAX_CUBE_MAP_TEXTURE_SIZE",
    "MAX_3D_TEXTURE_SIZE",
    "MAX_ARRAY_TEXTURE_LAYERS",
    "MAX_RENDERBUFFER_SIZE",
    "MAX_SAMPLES",
    "MAX_DRAW_BUFFERS",
    "MAX_COLOR_ATTACHMENTS",
    "MAX_VERTEX_ATTRIBS",
    "MAX_VERTEX_UNIFORM_VECTORS",
    "MAX_FRAGMENT_UNIFORM_VECTORS",
    "MAX_VARYING_VECTORS",
    "MAX_VERTEX_UNIFORM_BLOCKS",
    "MAX_FRAGMENT_UNIFORM_BLOCKS",
    "MAX_UNIFORM_BUFFER_BINDINGS",
    "MAX_UNIFORM_BLOCK_SIZE",
    "UNIFORM_BUFFER_OFFSET_ALIGNMENT",
    "MAX_ELEMENTS_INDICES",
    "MAX_ELEMENTS_VERTICES"
]);


/** A privacy-safe snapshot of one WebGL2 context's advertised capabilities. */
export class CjsWebGLProbe
{
    /** Creates a WebGL2 capability snapshot from already-read values. */
    constructor(values = {})
    {
        this.available = values.available === true;
        this.contextType = values.contextType ?? null;
        this.limits = { ...(values.limits ?? {}) };
        this.extensions = Array.from(values.extensions ?? [], String).sort();
        this.probeError = values.probeError ?? null;
    }

    /** Reports whether a named WebGL extension is advertised by the context. */
    HasExtension(name)
    {
        return this.extensions.includes(String(name));
    }

    /** Returns one advertised WebGL2 parameter, or the supplied fallback. */
    GetLimit(name, fallback = 0)
    {
        return finiteNumber(this.limits[name], fallback);
    }

    // These are Carbon's Tr2PlatformInfo static caps answered for WebGL2, which
    // is a genuinely different answer from WebGPU's and is why the engines
    // diverge where they do. WebGL2 has no compute stage, no shader storage
    // buffers and no image load/store, so the three compute-family caps are
    // false by the API's definition rather than by measurement - which is
    // exactly why a WebGL2 engine must lower Carbon's structured buffers to
    // data textures where the runtime WebGPU engine layer binds them natively.

    /** Carbon's static-capability vocabulary as WebGL2 answers it. */
    GetStaticCaps()
    {
        return {
            // WebGL2 buffer uploads are synchronous against the context.
            NON_SYNCHRONIZED_LOCKS: false,
            BUFFER_SHADER_RESOURCES: false,
            UNORDERED_ACCESS: false,
            COMPUTE: false,
            TEXTURE_ARRAYS: this.available && this.GetLimit("MAX_ARRAY_TEXTURE_LAYERS") > 1,
            MSAA_SAMPLE: this.available && this.GetLimit("MAX_SAMPLES") > 1,
            // TAA is an application feature, not a browser API capability.
            TAA: false
        };
    }

    /**
     * The capability keys this probe contributes to a library. They are named
     * for WebGL rather than sharing the WebGPU keys, because a consumer must be
     * able to read the two facts independently.
     */
    GetCapabilities()
    {
        return {
            webgl2: this.available,
            webgl2Limits: this.limits,
            webgl2Extensions: this.extensions
        };
    }

    /** Returns a detached record of the probed values. */
    GetValues()
    {
        return {
            available: this.available,
            contextType: this.contextType,
            limits: { ...this.limits },
            extensions: [ ...this.extensions ],
            probeError: this.probeError
        };
    }

    // Synchronous, unlike the WebGPU probe: WebGL context acquisition has no
    // asynchronous form. Tr2PlatformInfo.Detect stays async because its WebGPU
    // half is, and awaits nothing here.

    /**
     * Probes WebGL2 through an injected context, an injected canvas, or a
     * canvas this creates and releases. Never throws: an unavailable or failing
     * context is an unavailable capability, not a library bootstrap failure.
     */
    static Detect(options = {})
    {
        const supplied = Object.prototype.hasOwnProperty.call(options, "context");
        let context = supplied ? options.context : null;
        let owned = null;
        let probeError = null;

        if (!supplied)
        {
            try
            {
                owned = CjsWebGLProbe.#createCanvas(options);
                context = owned?.getContext?.("webgl2", options.contextAttributes) ?? null;
            }
            catch (error)
            {
                probeError = error instanceof Error ? error.message : String(error);
            }
        }

        if (!context) return new CjsWebGLProbe({ available: false, probeError });

        try
        {
            return new CjsWebGLProbe({
                available: true,
                contextType: "webgl2",
                limits: CjsWebGLProbe.#readLimits(context),
                extensions: context.getSupportedExtensions?.() ?? []
            });
        }
        catch (error)
        {
            return new CjsWebGLProbe({
                available: false,
                probeError: error instanceof Error ? error.message : String(error)
            });
        }
        finally
        {
            // Only release what this probe created. A caller's context is the
            // caller's to keep.
            if (owned) CjsWebGLProbe.#release(context);
        }
    }

    /** The canvas to probe against, preferring an offscreen one. */
    static #createCanvas(options)
    {
        if (options.canvas) return options.canvas;

        const offscreen = options.OffscreenCanvas ?? globalThis.OffscreenCanvas;
        if (typeof offscreen === "function") return new offscreen(1, 1);

        const documentObject = options.document ?? globalThis.document ?? null;
        return documentObject?.createElement?.("canvas") ?? null;
    }

    /**
     * Reads every parameter in the catalog, resolving each GL enum off the
     * context itself so an unsupported name is simply absent rather than a
     * hardcoded constant read against the wrong context.
     */
    static #readLimits(context)
    {
        const limits = {};

        for (const name of WEBGL2_PARAMETERS)
        {
            const token = context[name];
            if (typeof token !== "number") continue;

            try
            {
                const value = context.getParameter(token);
                if (Number.isFinite(value)) limits[name] = Number(value);
            }
            catch
            {
                // A context can refuse a parameter; absence is the answer.
            }
        }

        return limits;
    }

    // Deliberately does NOT touch WEBGL_debug_renderer_info. The unmasked
    // vendor and renderer strings are a fingerprinting surface, and no
    // backend decision here needs them - matching Tr2VideoAdapter, which
    // keeps only privacy-filtered adapter information.

    /** Returns a probe-created context to the browser. */
    static #release(context)
    {
        try
        {
            context.getExtension?.("WEBGL_lose_context")?.loseContext?.();
        }
        catch
        {
            // Releasing is best effort; the context lapses with the canvas.
        }
    }
}

export default CjsWebGLProbe;
