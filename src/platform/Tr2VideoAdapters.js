import { Tr2DisplayMode } from "./Tr2DisplayMode.js";
import { Tr2PlatformInfo } from "./Tr2PlatformInfo.js";
import { Tr2VideoAdapter } from "./Tr2VideoAdapter.js";

/** Browser adapter/display facade for Carbon's Tr2VideoAdapters surface. */
export class Tr2VideoAdapters
{
    static DEFAULT_ADAPTER = 0;

    /** Creates an adapter and display-mode facade with optional injected hosts. */
    constructor(options = {})
    {
        this.DEFAULT_ADAPTER = Tr2VideoAdapters.DEFAULT_ADAPTER;
        this.adapters = [];
        this.displayModes = [];
        this.platformInfo = null;
        this.probeError = null;
        this.#options = { ...options };
    }

    #options;

    /** Refreshes browser adapter, display-mode, and capability snapshots. */
    async Refresh(options = {})
    {
        this.#options = { ...this.#options, ...options };
        const navigatorObject = this.#options.navigator ?? globalThis.navigator ?? null;
        const windowObject = this.#options.window ?? globalThis.window ?? null;
        const screen = this.#options.screen ?? windowObject?.screen ?? null;
        const gpu = Object.prototype.hasOwnProperty.call(this.#options, "gpu")
            ? this.#options.gpu
            : navigatorObject?.gpu;
        let adapter = Object.prototype.hasOwnProperty.call(this.#options, "adapter")
            ? this.#options.adapter
            : null;
        this.probeError = null;

        if (!Object.prototype.hasOwnProperty.call(this.#options, "adapter") && gpu?.requestAdapter)
        {
            try
            {
                adapter = await gpu.requestAdapter(this.#options.adapterOptions);
            }
            catch (error)
            {
                this.probeError = error instanceof Error ? error.message : String(error);
            }
        }

        this.adapters = adapter ? [ await Tr2VideoAdapter.FromGPUAdapter(adapter, { index: 0 }) ] : [];
        this.displayModes = screen ? [ Tr2DisplayMode.FromScreen(screen, windowObject, {
            format: this.#preferredCanvasFormat(gpu)
        }) ] : [];
        this.platformInfo = await Tr2PlatformInfo.Detect({
            adapter,
            gpu: null,
            taa: this.#options.taa,
            // Forwarded so a caller controls the WebGL probe from one place;
            // `false` skips acquiring a context, and an existing probe is reused.
            webgl: this.#options.webgl,
            canvas: this.#options.canvas,
            document: this.#options.document,
            contextAttributes: this.#options.contextAttributes
        });
        if (this.probeError && !this.platformInfo.probeError) this.platformInfo.probeError = this.probeError;
        return this;
    }

    /** Refreshes adapter data using the Carbon-compatible method name. */
    RefreshData(options = {})
    {
        return this.Refresh(options);
    }

    /** Returns the number of detected adapters. */
    GetAdapterCount()
    {
        return this.adapters.length;
    }

    /** Returns one detected adapter snapshot, or null when absent. */
    GetAdapterInfo(adapterIndex)
    {
        return this.adapters[adapterIndex] ?? null;
    }

    /** Returns the browser's current display-mode snapshot for an adapter. */
    GetCurrentDisplayMode(adapterIndex = 0)
    {
        return this.adapters[adapterIndex] ? this.displayModes[0] ?? null : null;
    }

    /** Returns the available browser display-mode count for a back-buffer format. */
    GetDisplayModeCount(adapterIndex, backBufferFormat)
    {
        return this.GetCurrentDisplayMode(adapterIndex) && this.SupportsBackBufferFormat(adapterIndex, backBufferFormat) ? 1 : 0;
    }

    /** Returns one compatible display mode, or null when unavailable. */
    GetDisplayMode(adapterIndex, backBufferFormat, modeIndex)
    {
        return modeIndex === 0 && this.SupportsBackBufferFormat(adapterIndex, backBufferFormat)
            ? this.GetCurrentDisplayMode(adapterIndex)
            : null;
    }

    /** Reports whether an adapter supports a configured back-buffer format. */
    SupportsBackBufferFormat(adapterIndex, format)
    {
        if (!this.adapters[adapterIndex]) return false;
        return this.#supportsFormat("backBufferFormats", format);
    }

    /** Reports whether an adapter supports a configured render-target format. */
    SupportsRenderTargetFormat(adapterIndex, format)
    {
        if (!this.adapters[adapterIndex]) return false;
        return this.#supportsFormat("renderTargetFormats", format);
    }

    /** Returns the adapter's maximum two-dimensional texture dimension. */
    GetMaxTextureSize(adapterIndex)
    {
        const value = this.adapters[adapterIndex]?.limits?.maxTextureDimension2D;
        return Number.isFinite(value) ? Number(value) : 0;
    }

    /** Detects and returns a refreshed browser adapter facade. */
    static async Detect(options = {})
    {
        return new Tr2VideoAdapters(options).Refresh();
    }

    #preferredCanvasFormat(gpu)
    {
        if (this.#options.preferredCanvasFormat) return this.#options.preferredCanvasFormat;
        try
        {
            return typeof gpu?.getPreferredCanvasFormat === "function" ? gpu.getPreferredCanvasFormat() : null;
        }
        catch
        {
            return null;
        }
    }

    #supportsFormat(optionName, format)
    {
        const configured = this.#options[optionName];
        if (typeof configured === "function") return configured(format) === true;
        if (configured && typeof configured.has === "function") return configured.has(format);
        if (Array.isArray(configured)) return configured.includes(format);

        const current = this.displayModes[0]?.format;
        return optionName === "backBufferFormats" && current !== null && format === current;
    }
}

export default Tr2VideoAdapters;
