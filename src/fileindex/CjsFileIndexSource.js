import { CjsFileIndexEntry } from "./CjsFileIndexEntry.js";

/** An immutable browser-safe mapping from a compact source ID to an HTTP(S) base URL. */
export class CjsFileIndexSource
{

    /**
     * Binds a compact source ID to a plain HTTP(S) base URL - credentials, query
     * and fragment are refused and the trailing slash is stripped - then freezes
     * the pair so every later Resolve shares one containment boundary.
     */
    constructor({ id, baseURL })
    {
        this.id = CjsFileIndexSource.normalizeID(id);
        this.baseURL = normalizeHTTPURL(baseURL);

        Object.freeze(this);
    }

    /**
     * Turns one storage location into an absolute URL beneath this source's
     * base, rejecting a location addressed to a different source ID or one that
     * resolves to another origin or above the base path.
     */
    Resolve(location)
    {
        const parsed = CjsFileIndexSource.parseLocation(location);

        if (parsed.sourceID && parsed.sourceID !== this.id)
        {
            throw new Error(`File-index location requires source ${parsed.sourceID}, not ${this.id}.`);
        }

        const base = new URL(`${this.baseURL}/`);
        const resolved = new URL(parsed.path, base);

        if (
            resolved.origin !== base.origin
            || !resolved.pathname.startsWith(base.pathname)
        )
        {
            throw new Error("File-index location escapes its configured HTTP(S) source.");
        }

        return resolved.href;
    }

    /**
     * Lowercases and validates a compact source ID; "default" is the ID the
     * library reserves for the provider's own res base URL.
     */
    static normalizeID(value)
    {
        const id = String(value ?? "").trim().toLowerCase();

        if (!/^[a-z0-9][a-z0-9._-]*$/u.test(id))
        {
            throw new TypeError(`Invalid file-index source ID: ${value}`);
        }

        return id;
    }

    /**
     * Normalizes a location and splits it into a frozen { sourceID, path }
     * record, where sourceID is null when the location names no source.
     */
    static parseLocation(value)
    {
        const location = CjsFileIndexEntry.normalizeLocation(value);
        const match = location.match(/^([a-z0-9][a-z0-9._-]*):\/(.+)$/iu);

        return Object.freeze({
            sourceID: match ? CjsFileIndexSource.normalizeID(match[1]) : null,
            path: match ? match[2] : location
        });
    }

}

function normalizeHTTPURL(value)
{
    const url = new URL(String(value ?? "").trim());

    if (
        (url.protocol !== "https:" && url.protocol !== "http:")
        || url.username
        || url.password
        || url.search
        || url.hash
    )
    {
        throw new TypeError("Browser-safe file-index sources require a plain HTTP(S) base URL.");
    }

    return url.href.replace(/\/$/u, "");
}
