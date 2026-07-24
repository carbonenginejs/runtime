import { CjsFileIndexEntry } from "./CjsFileIndexEntry.js";

/** An immutable browser-safe mapping from a compact source ID to an HTTP(S) base URL. */
export class CjsFileIndexSource
{

    constructor({ id, baseURL })
    {
        this.id = CjsFileIndexSource.normalizeID(id);
        this.baseURL = normalizeHTTPURL(baseURL);

        Object.freeze(this);
    }

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

    static normalizeID(value)
    {
        const id = String(value ?? "").trim().toLowerCase();

        if (!/^[a-z0-9][a-z0-9._-]*$/u.test(id))
        {
            throw new TypeError(`Invalid file-index source ID: ${value}`);
        }

        return id;
    }

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
