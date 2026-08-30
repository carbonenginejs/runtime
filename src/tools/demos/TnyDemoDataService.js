import { throwIfAborted } from "#utils/errors";

const READY_PRESENCES = new Set([ "value", "empty", "omitted" ]);
const TERMINAL_STATUSES = new Set([
    "ready",
    "unsupported",
    "authentication-required",
    "reauthorization-required",
    "unavailable",
    "failed"
]);

/** Selects one authoritative browser data provider for each demo request. */
export class TnyDemoDataService
{

    #providers = [];

    /**
     * Registers providers in authority order. A provider implements Read and
     * may implement CanRead; its storage may be bundled JSON, a remote API,
     * IndexedDB, another browser database, or caller-owned memory.
     */
    constructor({ providers = [] } = {})
    {
        for (const provider of providers)
        {
            this.Register(provider);
        }
    }

    /** Registers one provider after all existing, higher-authority providers. */
    Register(provider)
    {
        assertProvider(provider);

        if (this.#providers.some(item => item.id === provider.id))
        {
            throw new Error(`Data provider ${provider.id} is already registered`);
        }

        this.#providers.push(provider);

        return this;
    }

    /** Removes a provider by ID. */
    Unregister(id)
    {
        const index = this.#providers.findIndex(provider => provider.id === id);

        if (index === -1)
        {
            return false;
        }

        this.#providers.splice(index, 1);

        return true;
    }

    /** Lists mutable provider identity records in authority order. */
    List()
    {
        const result = [];

        for (const provider of this.#providers)
        {
            result.push({
                id: provider.id,
                label: provider.label ?? provider.id
            });
        }

        return result;
    }

    /**
     * Reads from the first provider that accepts the request. Once accepted,
     * its terminal answer is returned without a hidden fallback to a lower
     * authority source.
     */
    async Read(request, { signal = null } = {})
    {
        throwIfAborted(signal, "Data request aborted");

        for (const provider of this.#providers)
        {
            let accepted = true;

            if (typeof provider.CanRead === "function")
            {
                accepted = await provider.CanRead(request, { signal });
            }

            throwIfAborted(signal, "Data request aborted");

            if (!accepted)
            {
                continue;
            }

            let value;

            try
            {
                value = await provider.Read(request, { signal });
            }
            catch (error)
            {
                if (isAbortError(error) || signal?.aborted)
                {
                    throw error;
                }

                return {
                    status: "failed",
                    presence: "omitted",
                    providerID: provider.id,
                    value: undefined,
                    provenance: [],
                    error
                };
            }

            throwIfAborted(signal, "Data request aborted");

            return normalizeResult(value, provider.id);
        }

        return {
            status: "unsupported",
            presence: "omitted",
            providerID: null,
            value: undefined,
            provenance: []
        };
    }

}

function assertProvider(value)
{
    if (!value || typeof value !== "object")
    {
        throw new TypeError("Data providers must be records or class instances");
    }

    if (!/^[a-z0-9][a-z0-9._-]*$/u.test(String(value.id ?? "")))
    {
        throw new TypeError(`Invalid data provider ID: ${value.id}`);
    }

    if (typeof value.Read !== "function")
    {
        throw new TypeError(`Data provider ${value.id} requires Read()`);
    }

    if (value.CanRead !== undefined && typeof value.CanRead !== "function")
    {
        throw new TypeError(`Data provider ${value.id} CanRead must be a function`);
    }
}

function normalizeResult(value, providerID)
{
    if (!value || typeof value !== "object")
    {
        throw new TypeError(`Data provider ${providerID} returned no result record`);
    }

    if (!TERMINAL_STATUSES.has(value.status))
    {
        throw new TypeError(`Data provider ${providerID} returned invalid status ${value.status}`);
    }

    const result = {};

    for (const [ key, item ] of Object.entries(value))
    {
        result[key] = item;
    }

    result.providerID = providerID;
    result.provenance = Array.isArray(value.provenance) ? value.provenance : [];

    if (value.status === "ready")
    {
        if (!READY_PRESENCES.has(value.presence))
        {
            throw new TypeError(`Data provider ${providerID} returned invalid presence ${value.presence}`);
        }

        if (value.presence === "value" && !Object.hasOwn(value, "value"))
        {
            throw new TypeError(`Data provider ${providerID} omitted its declared value`);
        }
    }
    else
    {
        result.presence = "omitted";
    }

    if (!Object.hasOwn(result, "value"))
    {
        result.value = undefined;
    }

    return result;
}

function isAbortError(error)
{
    return error?.name === "AbortError";
}
