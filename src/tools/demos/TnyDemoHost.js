import { throwIfAborted } from "#utils/errors";

/** Mounts independently constructible browser demos into one shared container. */
export class TnyDemoHost
{

    #active = null;
    #definitions = new Map();
    #destroyPromise = null;
    #destroyed = false;
    #pendingController = null;
    #queue = Promise.resolve();

    /**
     * Creates a host around one caller-owned container. Demo definitions are
     * records with an ID and a create function; the host does not own routing,
     * navigation chrome, data providers, or rendering engines.
     */
    constructor({ container, context = null, demos = [] } = {})
    {
        if (container === null || (typeof container !== "object" && typeof container !== "function"))
        {
            throw new TypeError("TnyDemoHost requires a caller-owned container");
        }

        this.container = container;
        this.context = context;

        for (const demo of demos)
        {
            this.Register(demo);
        }
    }

    /** The active demo ID, or null while no demo is mounted. */
    get activeID()
    {
        return this.#active?.id ?? null;
    }

    /** The number of registered demo definitions. */
    get size()
    {
        return this.#definitions.size;
    }

    /** Registers one independently constructible demo definition. */
    Register(definition)
    {
        this.#AssertUsable();

        const normalized = normalizeDefinition(definition);

        if (this.#definitions.has(normalized.id))
        {
            throw new Error(`Demo ${normalized.id} is already registered`);
        }

        this.#definitions.set(normalized.id, normalized);

        return this;
    }

    /** Removes an inactive demo definition. */
    Unregister(id)
    {
        this.#AssertUsable();

        const normalizedID = normalizeID(id);

        if (normalizedID === this.activeID)
        {
            throw new Error(`Cannot unregister active demo ${normalizedID}`);
        }

        return this.#definitions.delete(normalizedID);
    }

    /** Lists mutable presentation records without exposing factory functions. */
    List()
    {
        const result = [];

        for (const definition of this.#definitions.values())
        {
            result.push({
                id: definition.id,
                label: definition.label,
                description: definition.description
            });
        }

        return result;
    }

    /**
     * Closes the current demo, constructs the selected one, and awaits its
     * Mount(container, options) Promise. Calls are serialized so two demos
     * never own the same container at once.
     */
    Open(id, { signal = null, options = null } = {})
    {
        this.#AssertUsable();

        const normalizedID = normalizeID(id);
        const definition = this.#definitions.get(normalizedID);

        if (!definition)
        {
            throw new Error(`Unknown demo: ${normalizedID}`);
        }

        this.#pendingController?.abort("Superseded by another demo");
        this.#active?.controller.abort("Superseded by another demo");

        const controller = new AbortController();
        const releaseSignal = forwardAbort(signal, controller);

        this.#pendingController = controller;

        return this.#Enqueue(async () =>
        {
            let instance = null;

            try
            {
                this.#AssertUsable();

                if (this.#pendingController === controller)
                {
                    this.#pendingController = null;
                }

                await this.#CloseActive();
                throwIfAborted(controller.signal, "Operation aborted");
                instance = await definition.create({
                    id: definition.id,
                    context: this.context,
                    options,
                    signal: controller.signal
                });

                assertDemoInstance(instance, definition.id);

                this.#active = {
                    id: definition.id,
                    instance,
                    controller,
                    releaseSignal
                };

                await instance.Mount(this.container, {
                    context: this.context,
                    options,
                    signal: controller.signal
                });

                throwIfAborted(controller.signal, "Operation aborted");

                return instance;
            }
            catch (error)
            {
                controller.abort(error);
                releaseSignal();

                if (this.#active?.instance === instance)
                {
                    this.#active = null;
                }

                if (instance && typeof instance.Destroy === "function")
                {
                    await instance.Destroy();
                }

                throw error;
            }
        });
    }

    /** Closes the current demo without removing its definition. */
    Close()
    {
        if (this.#destroyPromise)
        {
            return this.#destroyPromise.then(() => undefined);
        }

        this.#pendingController?.abort("Demo close requested");
        this.#active?.controller.abort("Demo close requested");

        return this.#Enqueue(() => this.#CloseActive());
    }

    /** Closes the active demo and permanently releases this host. */
    Destroy()
    {
        if (this.#destroyPromise)
        {
            return this.#destroyPromise;
        }

        this.#pendingController?.abort("Demo host destruction requested");
        this.#active?.controller.abort("Demo host destruction requested");

        this.#destroyPromise = this.#Enqueue(async () =>
        {
            await this.#CloseActive();
            this.#pendingController = null;
            this.#definitions.clear();
            this.#destroyed = true;
        });

        return this.#destroyPromise;
    }

    /** Destroys the active demo and clears its mounted host state. */
    async #CloseActive()
    {
        const active = this.#active;

        if (!active)
        {
            return;
        }

        this.#active = null;
        active.controller.abort("Demo closed");
        active.releaseSignal();
        await active.instance.Destroy();
    }

    /** Serializes one demo transition behind previously requested host work. */
    #Enqueue(operation)
    {
        const pending = this.#queue.then(operation, operation);

        this.#queue = pending.catch(() => undefined);

        return pending;
    }

    /** Rejects work after the demo component has been destroyed. */
    #AssertUsable()
    {
        if (this.#destroyed || this.#destroyPromise)
        {
            throw new Error("TnyDemoHost has been destroyed");
        }
    }

}

function normalizeDefinition(value)
{
    if (!value || typeof value !== "object")
    {
        throw new TypeError("Demo definitions must be records");
    }

    const id = normalizeID(value.id);

    if (typeof value.create !== "function")
    {
        throw new TypeError(`Demo ${id} requires a create function`);
    }

    return {
        id,
        label: String(value.label ?? id),
        description: value.description === undefined || value.description === null
            ? null
            : String(value.description),
        create: value.create
    };
}

function normalizeID(value)
{
    const id = String(value ?? "").trim().toLowerCase();

    if (!/^[a-z0-9][a-z0-9._-]*$/u.test(id))
    {
        throw new TypeError(`Invalid demo ID: ${value}`);
    }

    return id;
}

function assertDemoInstance(value, id)
{
    if (!value || typeof value !== "object")
    {
        throw new TypeError(`Demo ${id} factory did not return an object`);
    }

    for (const method of [ "Mount", "Destroy" ])
    {
        if (typeof value[method] !== "function")
        {
            throw new TypeError(`Demo ${id} requires ${method}()`);
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

