import { throwIfAborted } from "#utils/errors";
import { TnyShipShowInfoWindow } from "../ship-show-info/ui/TnyShipShowInfoWindow.js";

/** Composes one independently mountable Ship Show Info presentation. */
export class TnyShipShowInfoDemo
{

    #destroyed = false;

    /**
     * Creates a demo ship show info demo around caller-supplied browser
     * collaborators.
     */
    constructor(options = {})
    {
        if (!options || typeof options !== "object")
        {
            throw new TypeError("Ship Show Info demo options must be an object");
        }

        this.options = Object.assign({}, options);
        this.window = null;
    }

    /** Mounts the optional EVE-like window into a caller-owned element. */
    async Mount(container, { signal = null } = {})
    {
        if (this.#destroyed)
        {
            throw new Error("TnyShipShowInfoDemo has been destroyed");
        }
        if (this.window)
        {
            throw new Error("TnyShipShowInfoDemo is already mounted");
        }

        throwIfAborted(signal, "Demo mount aborted");
        const window = new TnyShipShowInfoWindow(Object.assign({}, this.options, {
            root: container
        }));

        this.window = window;

        try
        {
            await AwaitWithSignal(window.Start(), signal);
            throwIfAborted(signal, "Demo mount aborted");

            return window;
        }
        catch (error)
        {
            await this.Destroy();
            throw error;
        }
    }

    /** Opens another hull through the mounted presentation. */
    Open(request)
    {
        if (!this.window)
        {
            throw new Error("TnyShipShowInfoDemo must be mounted first");
        }

        return this.window.Open(request);
    }

    /** Releases the window and returns renderer ownership. */
    async Destroy()
    {
        if (this.#destroyed)
        {
            return;
        }

        this.#destroyed = true;
        const window = this.window;

        this.window = null;
        await window?.Destroy();
    }

}

/** Builds a catalogue definition from one explicit, caller-owned options factory. */
export function CreateShipShowInfoDemoDefinition({
    id = "ship-show-info",
    label = "Ship Show Info",
    description = "Inspect one hull through provider-neutral data and rendering adapters.",
    CreateOptions
} = {})
{
    const normalizedID = String(id || "").trim();

    if (!normalizedID)
    {
        throw new TypeError("Ship Show Info demo definition requires an id");
    }
    if (typeof CreateOptions !== "function")
    {
        throw new TypeError("Ship Show Info demo definition requires CreateOptions(context)");
    }

    return {
        id: normalizedID,
        label: String(label || normalizedID),
        description: description ? String(description) : null,
        create({ context = {} } = {})
        {
            const options = CreateOptions(context);

            if (!options || typeof options !== "object")
            {
                throw new TypeError("CreateOptions(context) must return demo options");
            }

            return new TnyShipShowInfoDemo(options);
        }
    };
}

function AwaitWithSignal(value, signal)
{
    const pending = Promise.resolve(value);

    if (!signal)
    {
        return pending;
    }
    if (signal.aborted)
    {
        return Promise.reject(signal.reason ?? AbortError("Demo mount aborted"));
    }

    return new Promise((resolve, reject) =>
    {
        const onAbort = () => reject(signal.reason ?? AbortError("Demo mount aborted"));

        signal.addEventListener("abort", onAbort, { once: true });
        pending.then(resolve, reject).finally(() =>
        {
            signal.removeEventListener("abort", onAbort);
        });
    });
}

function AbortError(message)
{
    const error = new Error(message);

    error.name = "AbortError";

    return error;
}
