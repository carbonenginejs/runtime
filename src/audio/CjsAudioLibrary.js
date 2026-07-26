import { CjsAudioLibraryBuilder } from "./CjsAudioLibraryBuilder.js";

const AUDIO_LIBRARY_SCHEMA = "carbonenginejs.audioLibrary";
const AUDIO_LIBRARY_VERSIONS = new Set([ 1, 2 ]);

/**
 * Immutable, browser-loadable view of one prepared audio-library document.
 *
 * Runtime packages consume the plain document exposed by `GetDocument()`;
 * this facade owns transport and validation only.
 */
export class CjsAudioLibrary
{

    /** Creates an immutable view after validating and cloning the document. */
    constructor(document)
    {
        const value = NormalizeDocument(document);

        Object.assign(this, value);
        Object.freeze(this);
    }

    /** Returns a detached plain document suitable for runtime installation. */
    GetDocument()
    {
        return NormalizeDocument(this);
    }

    /** Validates a document without retaining it. */
    static validate(document)
    {
        ValidateDocument(document);
        return true;
    }

    /** Creates an immutable library from a document, JSON string, or library. */
    static from(value)
    {
        if (value instanceof this)
        {
            return value;
        }

        const document = typeof value === "string"
            ? ParseJSON(value)
            : value;

        return new this(document);
    }

    /** Builds a source catalog without reading bank bytes. */
    static build(options = {})
    {
        return new this(CjsAudioLibraryBuilder.build(options));
    }

    /** Builds a complete event/media library through injected bank access. */
    static async buildFromBanks(options = {})
    {
        return new this(
            await CjsAudioLibraryBuilder.buildFromBanks(options),
        );
    }

    /**
     * Loads a JSON document from a URL, Response-like object, Blob, or text.
     *
     * HTTP content encoding remains server/browser policy. A caller may pass a
     * decompressed JSON string for local compressed artifacts.
     */
    static async load(source, options = {})
    {
        if (source instanceof this)
        {
            return source;
        }
        if (IsDocument(source))
        {
            return new this(source);
        }
        if (typeof source === "string"
            && source.trimStart().startsWith("{"))
        {
            return new this(ParseJSON(source));
        }
        if (IsResponseLike(source))
        {
            return new this(await ReadResponseJSON(source));
        }
        if (source && typeof source.text === "function")
        {
            return new this(ParseJSON(await source.text()));
        }

        const fetchFunction = options.fetch ?? globalThis.fetch;

        if (typeof fetchFunction !== "function")
        {
            const error = new Error(
                "fetch is unavailable for audio-library loading",
            );

            error.code = "CJS_AUDIO_LIBRARY_FETCH_UNSUPPORTED";
            throw error;
        }

        const response = await fetchFunction(source, options.requestInit);

        return new this(await ReadResponseJSON(response, source));
    }

}

function NormalizeDocument(value)
{
    ValidateDocument(value);
    return CloneJSONValue(value, "audio library");
}

function ValidateDocument(value)
{
    RequireRecord(value, "Audio library");

    if (value.schema !== AUDIO_LIBRARY_SCHEMA)
    {
        throw new TypeError(
            `Unsupported audio-library schema: ${value.schema}`,
        );
    }
    if (!AUDIO_LIBRARY_VERSIONS.has(value.schemaVersion))
    {
        throw new TypeError(
            `Unsupported audio-library schema version: ${value.schemaVersion}`,
        );
    }

    const metadata = RequireRecord(value.metadata, "Audio library metadata");

    RequireRecord(metadata.Events, "Audio library metadata.Events");
    RequireRecord(metadata.SoundBanks, "Audio library metadata.SoundBanks");
    RequireRecord(metadata.WemFileIDs, "Audio library metadata.WemFileIDs");
    RequireRecord(value.media, "Audio library media");
    RequireRecord(value.banks, "Audio library banks");

    if (value.schemaVersion === 2)
    {
        ValidateBanks(value.banks);
        ValidateEmbeddedMedia(value.embeddedMedia, value.banks);
        ValidateEventMedia(
            value.eventMedia,
            value.eventMediaLanguage,
            value.media,
            value.embeddedMedia ?? {},
        );
        ValidateMusic(
            value.music,
            value.media,
            value.embeddedMedia ?? {},
        );
    }
}

function ValidateBanks(banks)
{
    for (const [ sourceID, bank ] of Object.entries(banks))
    {
        RequireRecord(bank, `Audio library bank ${sourceID}`);

        const bankID = NormalizeUnsignedID(
            bank.bankID,
            `Audio library bank ${sourceID} bankID`,
        );
        const languageID = NormalizeUnsignedID(
            bank.languageID,
            `Audio library bank ${sourceID} languageID`,
        );
        const expected = `${bankID}:${languageID}`;

        if (sourceID !== expected || String(bank.sourceID ?? "") !== expected)
        {
            throw new TypeError(
                `Audio library bank identity must be ${expected}: ${sourceID}`,
            );
        }
    }
}

function ValidateEmbeddedMedia(embeddedMedia, banks)
{
    if (embeddedMedia === undefined)
    {
        return;
    }

    RequireRecord(embeddedMedia, "Audio library embeddedMedia");

    for (const [ mediaID, value ] of Object.entries(embeddedMedia))
    {
        NormalizePositiveID(
            mediaID,
            `Audio library embedded media ${mediaID}`,
        );

        const records = Array.isArray(value) ? value : [ value ];

        if (!records.length)
        {
            throw new TypeError(
                `Audio library embedded media ${mediaID} has no sources`,
            );
        }

        for (const record of records)
        {
            RequireRecord(
                record,
                `Audio library embedded media ${mediaID}`,
            );

            if (!banks[String(record.bank ?? "")])
            {
                throw new TypeError(
                    `Audio library embedded media ${mediaID} references unknown bank ${record.bank}`,
                );
            }

            NormalizeNonNegativeInteger(
                record.offset,
                `Audio library embedded media ${mediaID} offset`,
            );
            NormalizePositiveInteger(
                record.byteLength,
                `Audio library embedded media ${mediaID} byteLength`,
            );
        }
    }
}

function ValidateEventMedia(eventMedia, language, media, embeddedMedia)
{
    if (eventMedia === undefined)
    {
        return;
    }

    RequireRecord(eventMedia, "Audio library eventMedia");
    NormalizeLanguage(language ?? "");

    for (const [ eventName, values ] of Object.entries(eventMedia))
    {
        if (!Array.isArray(values))
        {
            throw new TypeError(
                `Audio library eventMedia.${eventName} must be an array`,
            );
        }

        const ids = values.map(value => NormalizePositiveID(
            value,
            `Audio library eventMedia.${eventName}`,
        ));

        if (new Set(ids).size !== ids.length)
        {
            throw new TypeError(
                `Audio library eventMedia.${eventName} has duplicate sources`,
            );
        }

        for (const id of ids)
        {
            if (!media[id] && !embeddedMedia[id])
            {
                throw new TypeError(
                    `Audio library eventMedia.${eventName} references missing source ${id}`,
                );
            }
        }
    }
}

function ValidateMusic(music, media, embeddedMedia)
{
    if (music === undefined)
    {
        return;
    }

    RequireRecord(music, "Audio library music");

    if (music.schemaVersion !== 1)
    {
        throw new TypeError(
            `Unsupported audio music schema version: ${music.schemaVersion}`,
        );
    }
    if (!Array.isArray(music.banks))
    {
        throw new TypeError("Audio library music banks must be an array");
    }

    const nodes = RequireRecord(
        music.nodes,
        "Audio library music nodes",
    );
    const bankNames = music.banks.map(NormalizeBankName);

    if (new Set(bankNames).size !== bankNames.length)
    {
        throw new TypeError("Audio library music banks must be unique");
    }

    for (const [ id, node ] of Object.entries(nodes))
    {
        NormalizePositiveID(id, `Audio library music node ${id}`);
        RequireRecord(node, `Audio library music node ${id}`);

        if (!bankNames.includes(NormalizeBankName(node.bank)))
        {
            throw new TypeError(
                `Audio library music node ${id} references unknown bank ${node.bank}`,
            );
        }

        for (const childID of node.children ?? [])
        {
            if (!nodes[NormalizePositiveID(
                childID,
                `Audio library music node ${id} child`,
            )])
            {
                throw new TypeError(
                    `Audio library music node ${id} references missing child ${childID}`,
                );
            }
        }

        if (node.type === "music-track")
        {
            for (const source of node.sources ?? [])
            {
                const sourceID = NormalizePositiveID(
                    source.sourceId,
                    `Audio library music track ${id} source`,
                );

                if (!media[sourceID] && !embeddedMedia[sourceID])
                {
                    throw new TypeError(
                        `Audio library music track ${id} references missing source ${sourceID}`,
                    );
                }
            }
        }
    }

    for (const field of [ "eventTargets", "eventStops" ])
    {
        const table = RequireRecord(
            music[field],
            `Audio library music ${field}`,
        );

        for (const [ name, values ] of Object.entries(table))
        {
            if (!Array.isArray(values))
            {
                throw new TypeError(
                    `Audio library music ${field}.${name} must be an array`,
                );
            }

            for (const value of values)
            {
                const id = NormalizePositiveID(
                    value,
                    `Audio library music ${field}.${name}`,
                );

                if (!nodes[id])
                {
                    throw new TypeError(
                        `Audio library music ${field}.${name} references missing node ${id}`,
                    );
                }
            }
        }
    }

    RequireRecord(
        music.switchSetters,
        "Audio library music switchSetters",
    );
}

async function ReadResponseJSON(response, source = null)
{
    if (!IsResponseLike(response))
    {
        throw new TypeError(
            "Audio-library fetch must return a Response-like value",
        );
    }

    if (response.ok === false)
    {
        const sourceURL = response.url || String(source ?? "");
        const error = new Error(
            `Unable to load audio library ${sourceURL}: HTTP ${response.status ?? "error"}`,
        );

        error.code = "CJS_AUDIO_LIBRARY_HTTP_ERROR";
        error.status = response.status ?? null;
        error.sourceURL = sourceURL;
        throw error;
    }

    try
    {
        return typeof response.json === "function"
            ? await response.json()
            : ParseJSON(await response.text());
    }
    catch (cause)
    {
        throw new SyntaxError("Unable to parse audio-library JSON", {
            cause,
        });
    }
}

function IsResponseLike(value)
{
    return Boolean(
        value
        && typeof value === "object"
        && (typeof value.json === "function"
            || typeof value.text === "function")
        && ("ok" in value || "status" in value || "url" in value),
    );
}

function IsDocument(value)
{
    return Boolean(
        value
        && typeof value === "object"
        && !Array.isArray(value)
        && value.schema === AUDIO_LIBRARY_SCHEMA,
    );
}

function ParseJSON(value)
{
    try
    {
        return JSON.parse(String(value));
    }
    catch (cause)
    {
        throw new SyntaxError("Unable to parse audio-library JSON", {
            cause,
        });
    }
}

function RequireRecord(value, label)
{
    if (!value || typeof value !== "object" || Array.isArray(value))
    {
        throw new TypeError(`${label} must be an object`);
    }

    return value;
}

function NormalizeUnsignedID(value, label)
{
    const number = Number(value);

    if (!Number.isSafeInteger(number) || number < 0 || number > 0xffffffff)
    {
        throw new TypeError(`${label} must be an unsigned 32-bit integer`);
    }

    return String(number >>> 0);
}

function NormalizePositiveID(value, label)
{
    const id = NormalizeUnsignedID(value, label);

    if (id === "0")
    {
        throw new TypeError(`${label} must be greater than zero`);
    }

    return id;
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

function NormalizeLanguage(value)
{
    const language = String(value ?? "")
        .trim()
        .replaceAll("_", "-")
        .toLowerCase();

    if (language
        && !/^[a-z]{2,8}(?:-[a-z0-9]{1,8})*$/u.test(language))
    {
        throw new TypeError(`Invalid audio language tag: ${value}`);
    }

    return language;
}

function NormalizeBankName(value)
{
    const name = String(value ?? "")
        .trim()
        .replaceAll("\\", "/")
        .split("/")
        .pop()
        .toLowerCase();

    if (!name)
    {
        throw new TypeError("Audio library bank name is required");
    }

    return name;
}

function CloneJSONValue(value, label)
{
    if (value === null
        || typeof value === "string"
        || typeof value === "boolean")
    {
        return value;
    }
    if (typeof value === "number")
    {
        if (!Number.isFinite(value))
        {
            throw new TypeError(`${label} contains a non-finite number`);
        }

        return value;
    }
    if (Array.isArray(value))
    {
        return Object.freeze(value.map((entry, index) =>
            CloneJSONValue(entry, `${label}[${index}]`)));
    }
    if (!value || typeof value !== "object")
    {
        throw new TypeError(`${label} contains a non-JSON value`);
    }

    const result = {};

    for (const key of Object.keys(value))
    {
        result[key] = CloneJSONValue(value[key], `${label}.${key}`);
    }

    return Object.freeze(result);
}
