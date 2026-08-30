import { throwIfAborted } from "#utils/errors";
import { TnyShipTreeWindow } from "../ship-tree/ui/TnyShipTreeWindow.js";

/** Composes one independently mountable Ship Tree presentation. */
export class TnyShipTreeDemo
{

    #destroyed = false;

    /**
     * Creates a demo ship tree demo around caller-supplied browser
     * collaborators.
     */
    constructor(options = {})
    {
        if (!options || typeof options !== "object")
        {
            throw new TypeError("Ship Tree demo options must be an object");
        }

        this.options = Object.assign({}, options);
        this.window = null;
    }

    /** Mounts the optional SVG window into a caller-owned element. */
    async Mount(container, { signal = null } = {})
    {
        if (this.#destroyed)
        {
            throw new Error("TnyShipTreeDemo has been destroyed");
        }
        if (this.window)
        {
            throw new Error("TnyShipTreeDemo is already mounted");
        }

        throwIfAborted(signal, "Demo mount aborted");
        const window = new TnyShipTreeWindow(this.options);

        this.window = window;

        try
        {
            await AwaitWithSignal(window.Mount(container), signal);
            throwIfAborted(signal, "Demo mount aborted");

            return window;
        }
        catch (error)
        {
            await this.Destroy();
            throw error;
        }
    }

    /** Releases the window and cancels pending source work. */
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
export function CreateShipTreeDemoDefinition({
    id = "ship-tree",
    label = "Ship Tree",
    description = "Explore caller-authored hull progression through a renderer-neutral diagram model.",
    CreateOptions
} = {})
{
    const normalizedID = String(id || "").trim();

    if (!normalizedID)
    {
        throw new TypeError("Ship Tree demo definition requires an id");
    }
    if (typeof CreateOptions !== "function")
    {
        throw new TypeError("Ship Tree demo definition requires CreateOptions(context)");
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

            return new TnyShipTreeDemo(options);
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
