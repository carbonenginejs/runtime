import { throwIfAborted } from "#utils/errors";

/**
 * Browser-image fallback for Show Info hosts that do not inject a 3D engine.
 *
 * A decoded replacement is swapped in atomically, so the current preview does
 * not collapse while a new image is downloading. It creates no WebGL context.
 */
export class TnyShipShowInfoImageRenderer
{

    #activeController = null;
    #destroyed = false;

    /**
     * Creates a ship-detail ship show info image renderer around caller-supplied
     * browser collaborators.
     */
    constructor({ imageFactory = null } = {})
    {
        if (imageFactory !== null && typeof imageFactory !== "function")
        {
            throw new TypeError("imageFactory must be a function or null");
        }

        this.imageFactory = imageFactory || (() => new Image());
        this.container = null;
        this.image = null;
        this.ship = null;
    }

    /** Attaches the image renderer to its caller-owned browser container. */
    Mount(container)
    {
        if (!container || typeof container.replaceChildren !== "function")
        {
            throw new TypeError("TnyShipShowInfoImageRenderer requires a DOM container");
        }
        if (this.#destroyed) throw new Error("Image renderer has been destroyed");

        this.container = container;
    }

    /** Loads normalized ship data from the configured ship-detail source. */
    async FetchShip({ ship, signal = null } = {})
    {
        if (!this.container) throw new Error("Image renderer must be mounted before FetchShip");
        if (this.#destroyed) throw new Error("Image renderer has been destroyed");

        this.#activeController?.abort(AbortError("A newer preview was selected"));

        const controller = new AbortController();
        const release = ForwardAbort(signal, controller);

        this.#activeController = controller;

        try
        {
            const url = String(ship?.renderURL || ship?.iconURL || "");

            if (!url)
            {
                this.container.replaceChildren();
                this.image = null;
                this.ship = ship || null;
                return false;
            }

            const image = this.imageFactory();

            image.className = "ship-info-preview-image";
            image.alt = ship?.name ? `${ship.name} preview` : "Ship preview";
            image.decoding = "async";
            image.draggable = false;

            await LoadImage(image, url, controller.signal);
            throwIfAborted(controller.signal, "Operation aborted");

            if (typeof image.decode === "function")
            {
                try { await image.decode(); }
                catch { /* A successful load remains usable when decode is unsupported. */ }
            }

            throwIfAborted(controller.signal, "Operation aborted");
            this.container.replaceChildren(image);
            this.image = image;
            this.ship = ship || null;
            return true;
        }
        finally
        {
            release();
            if (this.#activeController === controller) this.#activeController = null;
        }
    }

    /** Loads normalized skin data from the configured ship-detail source. */
    async FetchSkin({ skin, signal = null } = {})
    {
        throwIfAborted(signal, "Operation aborted");

        if (skin?.renderURL)
        {
            const baseShip = this.ship;

            try
            {
                return await this.FetchShip({
                    ship: Object.assign({}, baseShip, {
                        name: skin.name || baseShip?.name,
                        renderURL: skin.renderURL
                    }),
                    signal
                });
            }
            finally
            {
                this.ship = baseShip;
            }
        }
        if (!skin && this.ship?.renderURL && this.image?.src !== this.ship.renderURL)
        {
            return this.FetchShip({ ship: this.ship, signal });
        }
        return false;
    }

    /** Applies the requested panel selection through the active controller. */
    SelectPanel()
    {
        return false;
    }

    /** Releases browser nodes and pending work owned by this renderer. */
    Destroy()
    {
        if (this.#destroyed) return;

        this.#destroyed = true;
        this.#activeController?.abort(AbortError("Image renderer destroyed"));
        this.#activeController = null;
        this.container?.replaceChildren();
        this.container = null;
        this.image = null;
        this.ship = null;
    }

}

function LoadImage(image, url, signal)
{
    throwIfAborted(signal, "Operation aborted");

    return new Promise((resolve, reject) =>
    {
        let finished = false;
        const onLoad = () => finish(resolve);
        const onError = () => finish(reject, new Error(`Ship preview image failed to load: ${url}`));
        const onAbort = () => finish(reject, signal.reason || AbortError("Ship preview load aborted"));
        const finish = (complete, value) =>
        {
            if (finished) return;
            finished = true;
            image.removeEventListener("load", onLoad);
            image.removeEventListener("error", onError);
            signal?.removeEventListener("abort", onAbort);
            complete(value);
        };

        image.addEventListener("load", onLoad, { once: true });
        image.addEventListener("error", onError, { once: true });
        signal?.addEventListener("abort", onAbort, { once: true });
        image.src = url;

        if (image.complete && Number(image.naturalWidth) > 0) finish(resolve);
    });
}

function ForwardAbort(source, target)
{
    if (!source) return () => {};
    if (source.aborted)
    {
        target.abort(source.reason);
        return () => {};
    }

    const forward = () => target.abort(source.reason);

    source.addEventListener("abort", forward, { once: true });
    return () => source.removeEventListener("abort", forward);
}

function AbortError(message)
{
    const error = new Error(message);

    error.name = "AbortError";
    return error;
}
