import {
    installAudioLibraryDocument,
} from "@carbonenginejs/runtime-audio/library";

/**
 * Reads complete documents, caller-selected builder inputs, individual files,
 * complete banks, and exact bank ranges over browser fetch and remote file
 * indexes.
 *
 * This class performs no audio-library selection and owns no runtime resource
 * cache. CjsAudioMan selects exact records; the optional runtime-audio library
 * builder consumes the plain inputs returned here.
 */
export class CjsAudioLibrary
{
    #fetch;

    #fileIndex;

    #requestInit;

    /** Creates a remote client from caller-owned Fetch and file-index capabilities. */
    constructor({
        fileIndex = null,
        fetch = globalThis.fetch,
        requestInit = null,
    } = {})
    {
        if (typeof fetch !== "function")
        {
            throw new TypeError("CjsAudioLibrary fetch must be a function");
        }
        if (fileIndex !== null
            && typeof fileIndex.Resolve !== "function")
        {
            throw new TypeError(
                "CjsAudioLibrary fileIndex must provide Resolve",
            );
        }

        // Native Window.fetch is receiver-sensitive in Chromium. Retain the
        // browser global when the client invokes a stored Fetch capability.
        this.#fetch = fetch.bind(globalThis);
        this.#fileIndex = fileIndex;
        this.#requestInit = requestInit;
    }

    /** Returns the optional exact-build remote file-index library. */
    get fileIndex()
    {
        return this.#fileIndex;
    }

    /**
     * Lists builder-ready `res:/audio/` rows from the loaded remote indexes.
     *
     * Logical-path duplicates are resolved through normal file-index layer
     * precedence before a plain deterministic record is returned.
     */
    GetAudioIndexEntries()
    {
        if (!this.#fileIndex
            || !Array.isArray(this.#fileIndex.resFileIndexes))
        {
            throw new Error(
                "CjsAudioLibrary requires a loaded file index for audio rows",
            );
        }

        const paths = new Set();

        for (const item of this.#fileIndex.resFileIndexes)
        {
            for (const entry of item.index.entries)
            {
                if (entry.logicalPath.startsWith("res:/audio/"))
                {
                    paths.add(entry.logicalPath);
                }
            }
        }

        return Object.freeze([ ...paths ].sort().map(logicalPath =>
        {
            const resolved = this.#fileIndex.Resolve(logicalPath);
            const entry = resolved?.entry;

            if (!entry)
            {
                throw new Error(
                    `Audio file-index path did not resolve: ${logicalPath}`,
                );
            }

            return Object.freeze({
                logicalPath: entry.logicalPath,
                storagePath: entry.location,
                checksum: entry.checksum,
                byteLength: entry.uncompressedSize ?? 0,
            });
        }));
    }

    /**
     * Reads caller-selected SoundbanksInfo, optional enrichment, and index rows
     * into the plain option shape accepted by CjsAudioLibraryBuilder.
     */
    async GetBuilderInputs({
        soundbanksInfo,
        enrichment = null,
        indexEntries = null,
        signal,
    } = {})
    {
        if (soundbanksInfo === undefined || soundbanksInfo === null)
        {
            throw new TypeError(
                "CjsAudioLibrary soundbanksInfo input is required",
            );
        }

        const [ soundbanks, enriched ] = await Promise.all([
            this.ReadJSON(soundbanksInfo, { signal }),
            enrichment === null
                ? null
                : this.ReadJSON(enrichment, { signal }),
        ]);

        return Object.freeze({
            indexEntries: indexEntries ?? this.GetAudioIndexEntries(),
            soundbanksInfo: soundbanks,
            enrichment: enriched,
        });
    }

    /**
     * Returns a bank loader suitable for
     * `CjsAudioLibraryBuilder.buildFromBanks({ loadBank })`.
     */
    CreateBankLoader()
    {
        return (bank, context = {}) => this.Read(bank, {
            ...context,
            kind: "bank",
        });
    }

    /**
     * Reads and validates one complete audio-library document.
     *
     * Input may be a plain document, JSON text, Blob/Response-like value,
     * HTTP(S) URL, or `res:/` path resolved through the file index.
     */
    async ReadDocument(source, options = {})
    {
        const value = IsRecord(source)
            && source.schema === "carbonenginejs.audioLibrary"
            ? source
            : await this.ReadJSON(source, options);

        return installAudioLibraryDocument(value);
    }

    /** Reads one JSON input from a plain value, text, URL, or indexed record. */
    async ReadJSON(source, options = {})
    {
        if (IsRecord(source)
            && !IsReadableRecord(source)
            && typeof source.arrayBuffer !== "function"
            && typeof source.text !== "function"
            && typeof source.json !== "function")
        {
            return source;
        }
        if (typeof source === "string"
            && /^[\s]*[\[{]/u.test(source))
        {
            return JSON.parse(source);
        }
        if (typeof source?.json === "function")
        {
            return source.json();
        }

        const text = await this.ReadText(source, options);

        try
        {
            return JSON.parse(text);
        }
        catch (cause)
        {
            throw new SyntaxError("Remote audio JSON is invalid", { cause });
        }
    }

    /** Reads one UTF-8 text input from text, URL, or an indexed record. */
    async ReadText(source, options = {})
    {
        if (typeof source === "string"
            && !LooksLikeLocation(source))
        {
            return source;
        }
        if (typeof source?.text === "function")
        {
            return source.text();
        }

        const result = await this.Read(source, options);
        const bytes = ToUint8Array(result?.bytes ?? result);

        return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    }

    /**
     * Reads one complete exact descriptor.
     *
     * This is the `CjsAudioMan` media-provider `Read` capability.
     */
    async Read(source, options = {})
    {
        const url = this.#ResolveURL(source);
        const response = await this.#fetch(url, MergeRequestInit(
            this.#requestInit,
            options,
        ));

        RequireResponse(response, url);

        return Object.freeze({
            bytes: await response.arrayBuffer(),
            mediaType: ResponseMediaType(response),
            complete: true,
            url,
        });
    }

    /**
     * Reads one exact byte range from a bank descriptor.
     *
     * HTTP 206 results contain the requested bytes. HTTP 200 is retained as a
     * complete response so CjsAudioMan can slice locally when a server ignores
     * the Range header.
     */
    async ReadRange(source, {
        offset,
        byteLength,
        ...options
    } = {})
    {
        const start = NormalizeNonNegativeInteger(offset, "Audio range offset");
        const length = NormalizePositiveInteger(
            byteLength,
            "Audio range byteLength",
        );
        const end = start + length - 1;
        const headers = new Headers(
            options.headers ?? this.#requestInit?.headers,
        );

        headers.set("Range", `bytes=${start}-${end}`);

        const url = this.#ResolveURL(source);
        const response = await this.#fetch(url, MergeRequestInit(
            this.#requestInit,
            {
                ...options,
                headers,
            },
        ));

        RequireResponse(response, url);

        return Object.freeze({
            bytes: await response.arrayBuffer(),
            mediaType: ResponseMediaType(response),
            complete: response.status !== 206,
            offset: start,
            byteLength: length,
            url,
        });
    }

    #ResolveURL(source)
    {
        if (source instanceof URL)
        {
            return RequireHttpURL(source.href);
        }
        if (typeof source === "string")
        {
            if (/^https?:\/\//iu.test(source))
            {
                return RequireHttpURL(source);
            }

            return this.#ResolveLogicalPath(source);
        }
        if (!IsRecord(source))
        {
            throw new TypeError(
                "Audio remote source must be a URL, path, or record",
            );
        }

        const explicit = source.url ?? source.sourceURL;

        if (explicit)
        {
            return RequireHttpURL(explicit);
        }

        const logicalPath = source.resPath
            ?? source.logicalPath
            ?? source.path;

        if (!logicalPath)
        {
            throw new TypeError(
                "Audio remote source record has no URL or logical path",
            );
        }

        return this.#ResolveLogicalPath(logicalPath);
    }

    #ResolveLogicalPath(path)
    {
        if (!this.#fileIndex)
        {
            throw new Error(
                `No remote file index can resolve audio path: ${path}`,
            );
        }

        const resolved = this.#fileIndex.Resolve(path);

        if (!resolved)
        {
            throw new Error(`Remote audio path is not indexed: ${path}`);
        }

        return RequireHttpURL(resolved.sourceURL);
    }
}

function MergeRequestInit(base, options)
{
    const result = {
        ...(base ?? {}),
        ...options,
    };

    delete result.kind;
    delete result.mediaID;
    delete result.mediaType;
    delete result.language;
    delete result.offset;
    delete result.byteLength;

    return result;
}

function RequireResponse(response, url)
{
    if (!response
        || typeof response.arrayBuffer !== "function"
        || response.ok === false)
    {
        throw new Error(
            `Remote audio request failed${response?.status
                ? ` (${response.status})`
                : ""}: ${url}`,
        );
    }
}

function ResponseMediaType(response)
{
    return String(response.headers?.get?.("content-type") ?? "")
        .split(";", 1)[0]
        .trim()
        .toLowerCase();
}

function RequireHttpURL(value)
{
    const url = new URL(String(value));

    if (url.protocol !== "https:" && url.protocol !== "http:")
    {
        throw new TypeError("Remote audio sources require HTTP(S) URLs");
    }
    return url.href;
}

function LooksLikeLocation(value)
{
    const source = String(value).trim();

    return /^https?:\/\//iu.test(source)
        || /^[a-z][a-z0-9+.-]*:\//iu.test(source);
}

function IsRecord(value)
{
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function IsReadableRecord(value)
{
    return Boolean(value.url
        ?? value.sourceURL
        ?? value.resPath
        ?? value.logicalPath
        ?? value.path);
}

function ToUint8Array(value)
{
    if (value instanceof ArrayBuffer)
    {
        return new Uint8Array(value);
    }
    if (ArrayBuffer.isView(value))
    {
        return new Uint8Array(
            value.buffer,
            value.byteOffset,
            value.byteLength,
        );
    }
    throw new TypeError("Remote audio input did not return bytes");
}

function NormalizeNonNegativeInteger(value, label)
{
    const number = Number(value);

    if (!Number.isSafeInteger(number) || number < 0)
    {
        throw new TypeError(`${label} must be a non-negative integer`);
    }
    return number;
}

function NormalizePositiveInteger(value, label)
{
    const number = NormalizeNonNegativeInteger(value, label);

    if (number === 0)
    {
        throw new TypeError(`${label} must be greater than zero`);
    }
    return number;
}
