import { throwIfAborted } from "#utils/errors";

/** Coordinates one browser demo with one caller-supplied rendering adapter. */
export class TnyDemoRenderer
{

    #adapter;
    #destroyed = false;
    #loadController = null;
    #loadGeneration = 0;
    #mounted = false;

    /**
     * Accepts an engine adapter without importing or constructing its engine.
     * The adapter must implement Mount, Load, Unmount, and Destroy; SetView is
     * optional.
     */
    constructor({ adapter } = {})
    {
        assertAdapter(adapter);
        this.#adapter = adapter;
    }

    /** True after Mount succeeds and before Unmount begins. */
    get mounted()
    {
        return this.#mounted;
    }

    /** Mounts or relocates the adapter's existing viewport into a container. */
    async Mount(container)
    {
        this.#AssertUsable();

        if (this.#mounted)
        {
            await this.Unmount();
        }

        await this.#adapter.Mount(container);
        this.#mounted = true;
    }

    /**
     * Loads one adapter-owned request and suppresses a result superseded by a
     * later load. The adapter decides whether that means an atomic hull swap,
     * a rebuilt scene, a texture update, or another engine operation.
     */
    async Load(request, options = {})
    {
        this.#AssertMounted();
        this.#AbortLoad("Superseded by a newer load");

        const controller = new AbortController();
        const releaseSignal = forwardAbort(options.signal ?? null, controller);
        const generation = ++this.#loadGeneration;
        const adapterOptions = Object.assign({}, options, {
            signal: controller.signal
        });

        this.#loadController = controller;

        try
        {
            throwIfAborted(controller.signal, "Renderer operation aborted");

            const result = await this.#adapter.Load(request, adapterOptions);

            if (generation !== this.#loadGeneration)
            {
                throw createAbortError("Renderer load was superseded");
            }

            throwIfAborted(controller.signal, "Renderer operation aborted");

            return result;
        }
        finally
        {
            releaseSignal();

            if (this.#loadController === controller)
            {
                this.#loadController = null;
            }
        }
    }

    /** Passes a named or numeric camera view to adapters that support it. */
    async SetView(view, options = {})
    {
        this.#AssertMounted();

        if (typeof this.#adapter.SetView !== "function")
        {
            throw new Error("Rendering adapter does not support SetView()");
        }

        return this.#adapter.SetView(view, options);
    }

    /** Cancels the active load and returns viewport ownership through the adapter. */
    async Unmount()
    {
        this.#AssertUsable();

        if (!this.#mounted)
        {
            return;
        }

        this.#mounted = false;
        this.#AbortLoad("Renderer unmounted");
        await this.#adapter.Unmount();
    }

    /** Releases the adapter without assuming ownership of its injected engine. */
    async Destroy()
    {
        if (this.#destroyed)
        {
            return;
        }

        let unmountError = null;

        if (this.#mounted)
        {
            try
            {
                await this.Unmount();
            }
            catch (error)
            {
                unmountError = error;
            }
        }

        this.#destroyed = true;
        this.#AbortLoad("Renderer destroyed");

        try
        {
            await this.#adapter.Destroy();
        }
        catch (error)
        {
            if (unmountError)
            {
                throw new AggregateError([ unmountError, error ], "Rendering adapter cleanup failed");
            }

            throw error;
        }

        if (unmountError)
        {
            throw unmountError;
        }
    }

    /** Cancels the renderer load owned by the current request generation. */
    #AbortLoad(reason)
    {
        this.#loadGeneration++;

        if (this.#loadController)
        {
            this.#loadController.abort(reason);
            this.#loadController = null;
        }
    }

    /** Rejects renderer work before a browser mount is active. */
    #AssertMounted()
    {
        this.#AssertUsable();

        if (!this.#mounted)
        {
            throw new Error("TnyDemoRenderer must be mounted first");
        }
    }

    /** Rejects work after the demo component has been destroyed. */
    #AssertUsable()
    {
        if (this.#destroyed)
        {
            throw new Error("TnyDemoRenderer has been destroyed");
        }
    }

}

function assertAdapter(value)
{
    if (!value || (typeof value !== "object" && typeof value !== "function"))
    {
        throw new TypeError("TnyDemoRenderer requires an adapter");
    }

    for (const method of [ "Mount", "Load", "Unmount", "Destroy" ])
    {
        if (typeof value[method] !== "function")
        {
            throw new TypeError(`Rendering adapter requires ${method}()`);
        }
    }
}

function forwardAbort(signal, controller)
{
    if (!signal)
    {
        return () => undefined;
    }

    if (signal.aborted)
    {
        controller.abort(signal.reason);

        return () => undefined;
    }

    const onAbort = () => controller.abort(signal.reason);

    signal.addEventListener("abort", onAbort, { once: true });

    return () => signal.removeEventListener("abort", onAbort);
}

function createAbortError(message)
{
    if (typeof DOMException === "function")
    {
        return new DOMException(message, "AbortError");
    }

    const error = new Error(message);

    error.name = "AbortError";

    return error;
}
