import { exposure as be } from "#be";
import { CjsSchema, type } from "#schema";
import { IRoot } from "../../blue/exposure/IRoot.js";
import { Tr2DisplayMode } from "./Tr2DisplayMode.js";
import { Tr2PlatformInfo } from "./Tr2PlatformInfo.js";
import { Tr2VideoAdapter } from "./Tr2VideoAdapter.js";

/**
 * Browser adapter/display facade for Carbon's Tr2VideoAdapters surface.
 *
 * Exposes at most the one adapter the browser selects (index 0) and one
 * current-screen display mode. It never enumerates hidden hardware adapters
 * or creates presentation objects. Back-buffer and render-target format
 * support come from the injected `backBufferFormats`/`renderTargetFormats`
 * policies (function, Set-like or array). Without a policy, only the
 * current display mode's format (the configured or browser-preferred canvas
 * format) is a supported back buffer, and no render-target format is.
 */
export class Tr2VideoAdapters
{
    /**
     * Index of the default video adapter (Carbon const DEFAULT_ADAPTER,
     * Tr2VideoAdapters.h:47, initialised from Tr2VideoAdapterInfo::DEFAULT_ADAPTER
     * at Tr2VideoAdapters.cpp:16).
     * @type {number}
     */
    DEFAULT_ADAPTER = Tr2VideoAdapters.DEFAULT_ADAPTER;

    /**
     * Detected adapter snapshots; at most the one the browser selects.
     * @type {Tr2VideoAdapter[]}
     */
    adapters = [];

    /**
     * Current-screen display-mode snapshots; at most one.
     * @type {Tr2DisplayMode[]}
     */
    displayModes = [];

    /**
     * Platform capability snapshot from the last refresh, or null before one.
     * @type {Tr2PlatformInfo|null}
     */
    platformInfo = null;

    /**
     * Adapter request failure message from the last refresh, or null.
     * @type {string|null}
     */
    probeError = null;

    _options = {};

    static DEFAULT_ADAPTER = 0;

    /** Creates an adapter and display-mode facade with optional injected hosts. */
    constructor(options = {})
    {
        this._options = { ...options };
    }

    /**
     * Refreshes browser adapter, display-mode, and capability snapshots.
     *
     * @adapted
     * @renamed RefreshData
     */
    async Refresh(options = {})
    {
        this._options = { ...this._options, ...options };
        const navigatorObject = this._options.navigator ?? globalThis.navigator ?? null;
        const windowObject = this._options.window ?? globalThis.window ?? null;
        const screen = this._options.screen ?? windowObject?.screen ?? null;
        const gpu = Object.prototype.hasOwnProperty.call(this._options, "gpu")
            ? this._options.gpu
            : navigatorObject?.gpu;
        let adapter = Object.prototype.hasOwnProperty.call(this._options, "adapter")
            ? this._options.adapter
            : null;
        this.probeError = null;

        if (!Object.prototype.hasOwnProperty.call(this._options, "adapter") && gpu?.requestAdapter)
        {
            try
            {
                adapter = await gpu.requestAdapter(this._options.adapterOptions);
            }
            catch (error)
            {
                this.probeError = error instanceof Error ? error.message : String(error);
            }
        }

        this.adapters = adapter ? [ await Tr2VideoAdapter.FromGPUAdapter(adapter, { index: 0 }) ] : [];
        this.displayModes = screen ? [ Tr2DisplayMode.FromScreen(screen, windowObject, {
            format: this._preferredCanvasFormat(gpu)
        }) ] : [];
        this.platformInfo = await Tr2PlatformInfo.Detect({
            adapter,
            gpu: null,
            taa: this._options.taa,
            // Forwarded so a caller controls the WebGL probe from one place;
            // `false` skips acquiring a context, and an existing probe is reused.
            webgl: this._options.webgl,
            canvas: this._options.canvas,
            document: this._options.document,
            contextAttributes: this._options.contextAttributes
        });
        if (this.probeError && !this.platformInfo.probeError) this.platformInfo.probeError = this.probeError;
        return this;
    }

    /**
     * Refreshes adapter data using the Carbon-compatible method name.
     *
     * @adapted
     */
    RefreshData(options = {})
    {
        return this.Refresh(options);
    }

    /**
     * Returns the number of detected adapters.
     *
     * @adapted
     */
    GetAdapterCount()
    {
        return this.adapters.length;
    }

    /**
     * Returns one detected adapter snapshot, or null when absent.
     *
     * @adapted
     */
    GetAdapterInfo(adapterIndex)
    {
        return this.adapters[adapterIndex] ?? null;
    }

    /**
     * Returns the browser's current display-mode snapshot for an adapter.
     *
     * @adapted
     */
    GetCurrentDisplayMode(adapterIndex = 0)
    {
        return this.adapters[adapterIndex] ? this.displayModes[0] ?? null : null;
    }

    /**
     * Returns the available browser display-mode count for a back-buffer format.
     *
     * @adapted
     */
    GetDisplayModeCount(adapterIndex, backBufferFormat)
    {
        return this.GetCurrentDisplayMode(adapterIndex) && this.SupportsBackBufferFormat(adapterIndex, backBufferFormat) ? 1 : 0;
    }

    /**
     * Returns one compatible display mode, or null when unavailable.
     *
     * @adapted
     */
    GetDisplayMode(adapterIndex, backBufferFormat, modeIndex)
    {
        return modeIndex === 0 && this.SupportsBackBufferFormat(adapterIndex, backBufferFormat)
            ? this.GetCurrentDisplayMode(adapterIndex)
            : null;
    }

    /**
     * Reports whether an adapter supports a configured back-buffer format.
     *
     * @adapted
     */
    SupportsBackBufferFormat(adapterIndex, format)
    {
        if (!this.adapters[adapterIndex]) return false;
        return this._supportsFormat("backBufferFormats", format);
    }

    /**
     * Reports whether an adapter supports a configured render-target format.
     *
     * @adapted
     */
    SupportsRenderTargetFormat(adapterIndex, format)
    {
        if (!this.adapters[adapterIndex]) return false;
        return this._supportsFormat("renderTargetFormats", format);
    }

    /**
     * Returns the adapter's maximum two-dimensional texture dimension.
     *
     * @adapted
     */
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

    /** Returns the configured or browser-preferred canvas format. */
    _preferredCanvasFormat(gpu)
    {
        if (this._options.preferredCanvasFormat) return this._options.preferredCanvasFormat;
        try
        {
            return typeof gpu?.getPreferredCanvasFormat === "function" ? gpu.getPreferredCanvasFormat() : null;
        }
        catch
        {
            return null;
        }
    }

    /** Reports whether a configured format collection accepts a format. */
    _supportsFormat(optionName, format)
    {
        const configured = this._options[optionName];
        if (typeof configured === "function") return configured(format) === true;
        if (configured && typeof configured.has === "function") return configured.has(format);
        if (Array.isArray(configured)) return configured.includes(format);

        const current = this.displayModes[0]?.format;
        return optionName === "backBufferFormats" && current !== null && format === current;
    }
}


be.inherit(IRoot)(Tr2VideoAdapters);

CjsSchema.decorateField(Tr2VideoAdapters, "DEFAULT_ADAPTER", type.uint32, be.mapAttribute(be.READ));
CjsSchema.decorateMethod(Tr2VideoAdapters, "RefreshData", be.mapMethodAndWrap("Refresh"));
CjsSchema.decorateMethod(Tr2VideoAdapters, "GetAdapterCount", be.mapMethodAndWrap());
CjsSchema.decorateMethod(Tr2VideoAdapters, "GetAdapterInfo", be.mapMethodAndWrap());
CjsSchema.decorateMethod(Tr2VideoAdapters, "GetCurrentDisplayMode", be.mapMethodAndWrap());
CjsSchema.decorateMethod(Tr2VideoAdapters, "GetDisplayModeCount", be.mapMethodAndWrap());
CjsSchema.decorateMethod(Tr2VideoAdapters, "GetDisplayMode", be.mapMethodAndWrap());
CjsSchema.decorateMethod(Tr2VideoAdapters, "SupportsBackBufferFormat", be.mapMethodAndWrap());
CjsSchema.decorateMethod(Tr2VideoAdapters, "SupportsRenderTargetFormat", be.mapMethodAndWrap());
CjsSchema.decorateMethod(Tr2VideoAdapters, "GetMaxTextureSize", be.mapMethodAndWrap());
CjsSchema.exposure.define("Tr2VideoAdapters")(Tr2VideoAdapters);
