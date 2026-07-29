// Browser-safe audio-library construction. Acquisition remains caller-owned:
// the builder accepts index values, metadata values, and optional injected
// bank-byte/inspection capabilities without discovering files or services.
import { audioMetadataFromSoundbanksInfo } from "../audioMetadata.js";
import { CjsBnkFormat } from "@carbonenginejs/runtime-resource/formats/bnk";

const MUSIC_BANK_NAMES = Object.freeze([ "music.bnk", "music_essential.bnk" ]);
const MUSIC_EVENT_BANK_NAME = "common.bnk";
const MUSIC_HIRC_TYPES = new Set([ 10, 11, 12, 13 ]);
const AUDIO_LANGUAGE_TAGS = Object.freeze({
    chinese: "zh-cn",
    "chinese(prc)": "zh-cn",
    "english(us)": "en-us",
    "french(france)": "fr-fr",
    german: "de",
    japanese: "ja",
    korean: "ko",
    russian: "ru",
    sfx: "",
    spanish: "es",
});

/**
 * Builds a deterministic schema-v2 audio-library document from caller-supplied
 * values and bank access.
 */
export class CjsAudioLibraryBuilder
{

    static schema = "carbonenginejs.audioLibrary";

    static schemaVersion = 2;

    /** Normalizes audio rows from index text, a file index, or an iterable. */
    static parseIndexEntries(indexValue)
    {
        return normalizeIndexEntries(indexValue);
    }

    /** Projects inspected Wwise event edges onto canonical event names. */
    static createEventMediaTable(metadata, bankResults)
    {
        const namesByID = new Map();
        for (const [ name, record ] of metadataEntries(
            metadata?.Events,
            "Audio metadata Events",
        ))
        {
            namesByID.set(record.eventID >>> 0, name);
        }
        const table = {};
        for (const result of bankResults)
        {
            for (const [ eventID, wemIDs ] of result.eventMedia)
            {
                const name = namesByID.get(eventID >>> 0);
                if (!name)
                {
                    continue;
                }
                const merged = new Set(table[name] ?? []);
                for (const wemID of wemIDs)
                {
                    merged.add(String(wemID));
                }
                table[name] = [ ...merged ].sort((a, b) => Number(a) - Number(b));
            }
        }
        return table;
    }

    /**
     * Resolves event graphs with explicit bank and language precedence.
     *
     * Localized variants share a bank ID and reuse HIRC object IDs. One
     * requested language is therefore selected before graph resolution rather
     * than unioning incompatible event choices. Source-name ordering preserves
     * authored overlay behavior such as music_essential replacing the
     * corresponding base music objects.
     */
    static createEventMediaGraphs(inspections, options = {})
    {
        if (!Array.isArray(inspections))
        {
            throw new TypeError(
                "Audio event-media construction requires bank inspections",
            );
        }

        const {
            language = "",
            ...graphOptions
        } = options;
        const requestedLanguage = String(language ?? "")
            .trim()
            .replaceAll("_", "-")
            .toLowerCase();
        const groups = new Map();

        for (const inspection of inspections)
        {
            const bankID = normalizeUnsignedID(
                inspection?.bankId,
                "Audio inspection bankId",
            );
            const languageID = normalizeUnsignedID(
                inspection?.languageId ?? 0,
                `Audio inspection ${bankID} languageId`,
            );
            const group = groups.get(bankID) ?? [];

            if (group.some(value =>
                normalizeUnsignedID(value.languageId ?? 0, "Audio languageId")
                    === languageID))
            {
                throw new TypeError(
                    `Duplicate audio inspection identity ${bankID}:${languageID}`,
                );
            }

            group.push(inspection);
            groups.set(bankID, group);
        }

        const shared = [];
        const variants = [];

        for (const group of groups.values())
        {
            group.sort(compareBankInspections);

            if (group.length === 1
                && !String(group[0].language ?? "").trim())
            {
                shared.push(group[0]);
            }
            else
            {
                variants.push(group);
            }
        }

        if (!variants.length)
        {
            return [
                CjsBnkFormat.wwise.eventMediaFromBanks(
                    [ ...shared ].sort(compareBankInspections),
                    graphOptions,
                ),
            ];
        }

        const selected = [ ...shared ];
        let matchedLanguage = !requestedLanguage;

        for (const group of variants)
        {
            const exact = group.find(value =>
                String(value.language ?? "").toLowerCase()
                    === requestedLanguage);
            const inspection = exact
                ?? group.find(value =>
                    !String(value.language ?? "").trim())
                ?? (!requestedLanguage ? group[0] : null);

            if (exact)
            {
                matchedLanguage = true;
            }
            if (inspection)
            {
                selected.push(inspection);
            }
        }

        if (!matchedLanguage)
        {
            throw new Error(
                `Audio event-media language is unavailable: ${requestedLanguage}`,
            );
        }

        return [
            CjsBnkFormat.wwise.eventMediaFromBanks(
                selected.sort(compareBankInspections),
                graphOptions,
            ),
        ];
    }

    /**
     * Builds the dynamic-music section from already inspected BNK files.
     *
     * Inspections must carry their source bank name. The format package owns
     * all HIRC payload decoding; this method only validates and projects the
     * parsed graph into the audio-library contract.
     */
    static createMusicGraph({
        inspections,
        metadata,
        media = {},
        embeddedMedia = {},
        musicBankNames = MUSIC_BANK_NAMES,
        eventBankName = MUSIC_EVENT_BANK_NAME,
    } = {})
    {
        if (!Array.isArray(inspections))
        {
            throw new TypeError("Audio music construction requires bank inspections");
        }

        const byName = new Map();

        for (const inspection of inspections)
        {
            const name = bankSourceName(inspection?.source);

            if (!name)
            {
                throw new TypeError("Audio bank inspection is missing its source name");
            }

            if (byName.has(name))
            {
                throw new TypeError(`Duplicate audio bank inspection source: ${name}`);
            }

            byName.set(name, inspection);
        }

        const requiredNames = [
            ...musicBankNames.map(bankSourceName),
            bankSourceName(eventBankName),
        ];

        for (const name of requiredNames)
        {
            if (!byName.has(name))
            {
                throw new Error(`Music construction requires inspected bank: ${name}`);
            }
        }

        const musicInspections = musicBankNames.map(name =>
            byName.get(bankSourceName(name)));
        const musicEntries = musicInspections.flatMap(inspection =>
            (inspection.hirc ?? [])
                .filter(entry => MUSIC_HIRC_TYPES.has(entry.type)));
        const musicEntryCount = musicEntries.length;
        const uniqueMusicEntryCount = new Set(
            musicEntries.map(entry => entry.id >>> 0),
        ).size;
        let parsed;

        try
        {
            // Authored duplicate IDs are resolved in bank order. The essential
            // bank is intentionally later and therefore replaces the base
            // definition, matching Wwise loading and the transitional builder.
            parsed = CjsBnkFormat.wwise.musicNodesFromBanks(musicInspections);
        }
        catch (cause)
        {
            throw new Error("Music-node parsing failed", { cause });
        }

        if (parsed.diagnostics.failed.length)
        {
            const details = parsed.diagnostics.failed
                .map(failure => `${failure.bank}:${failure.type}:${failure.id}`)
                .join(", ");

            throw new Error(`Music-node parsing failed: ${details}`);
        }

        if (parsed.diagnostics.parsed !== musicEntryCount
            || parsed.nodes.size !== uniqueMusicEntryCount)
        {
            throw new Error(
                "Music-node parsing did not preserve every authored entry",
            );
        }

        const nodes = {};

        for (const [ id, value ] of [ ...parsed.nodes.entries() ]
            .sort(([ left ], [ right ]) => left - right))
        {
            const { id: parsedID, ...node } = value;

            if ((parsedID >>> 0) !== (id >>> 0))
            {
                throw new Error(`Music-node identity mismatch: ${parsedID} !== ${id}`);
            }

            nodes[id] = node;
        }

        validateMusicNodeReferences(nodes, media, embeddedMedia);

        const eventProjection = createMusicEventProjection(
            byName.get(bankSourceName(eventBankName)),
            metadata,
            nodes,
        );

        return {
            schemaVersion: 1,
            generator: "@carbonenginejs/runtime-audio/library-builder",
            banks: musicBankNames.map(bankSourceName),
            nodes,
            ...eventProjection,
        };
    }

    /** Classifies embedded media by its four-byte container magic. */
    static mediaTypeFromMagic(bytes, offset = 0)
    {
        const value = toUint8Array(bytes);
        const at = Number(offset);

        if (!Number.isSafeInteger(at) || at < 0 || at + 4 > value.byteLength)
        {
            return "unknown";
        }

        const magic = String.fromCharCode(
            value[at],
            value[at + 1],
            value[at + 2],
            value[at + 3],
        );

        if (magic === "RIFF" || magic === "RIFX")
        {
            return "wem";
        }
        if (magic === "MIDI")
        {
            return "midi";
        }
        if (magic === "PLUG")
        {
            return "plugin";
        }
        return "unknown";
    }

    /** Applies additive audio metadata enrichment over a built library. */
    static applyEnrichment(library, enrichment)
    {
        if (!library || typeof library !== "object" || Array.isArray(library))
        {
            throw new TypeError(
                "Audio-library enrichment requires a library object",
            );
        }

        const metadata = createAudioMetadata({
            metadata: library.metadata,
            enrichment,
        });

        return {
            ...library,
            metadata: sortedKeys({
                Events: sortedKeys(metadata.Events),
                SoundBanks: sortedKeys(metadata.SoundBanks),
                WemFileIDs: sortedKeys(metadata.WemFileIDs),
            }),
        };
    }

    /**
     * Builds a complete library by reading every indexed bank through one
     * caller-supplied capability. The capability may delegate acquisition and
     * inspection to workers; this class never discovers a network endpoint.
     */
    static async buildFromBanks(options = {})
    {
        const loadBank = normalizeBankLoader(options);
        const inspectBank = options.inspectBank ?? defaultInspectBank;
        const eventMediaLanguage = normalizeEventMediaLanguage(
            options.language ?? "en-us",
        );
        const includeMusic = options.music === true;
        const signal = options.signal ?? null;
        let library = this.build(options);

        if (typeof inspectBank !== "function")
        {
            throw new TypeError("Audio inspectBank must be a function");
        }

        requireMusicBanks(library, includeMusic);

        const inspections = [];
        const bankIdentities = {};
        const embeddedMedia = {};

        for (const [ sourceID, bank ] of Object.entries(library.banks))
        {
            throwIfAborted(signal);

            let loaded;

            try
            {
                loaded = await loadBank(bank, {
                    sourceID,
                    signal,
                });
            }
            catch (cause)
            {
                throw new Error(
                    `Unable to load audio bank ${sourceID}: ${bank.resPath}`,
                    { cause },
                );
            }

            throwIfAborted(signal);

            const source = bankSourceName(bank.resPath);
            const prepared = normalizeLoadedBank(loaded, sourceID);
            const inspection = prepared.inspection ?? await inspectBank(
                prepared.bytes,
                {
                    bank,
                    source,
                    sourceID,
                    signal,
                },
            );
            const compact = compactBankInspection(
                inspection,
                source,
                bank,
            );
            const inspectedSourceID = `${compact.bankId}:${compact.languageId}`;

            bankIdentities[bank.resPath.toLowerCase()] = {
                bankID: compact.bankId,
                languageID: compact.languageId,
            };
            inspections.push(compact);

            for (const record of compact.media)
            {
                const id = String(record.id);

                if (!record.available || library.media[id])
                {
                    continue;
                }

                const mediaType = record.mediaType
                    ?? (prepared.bytes
                        ? this.mediaTypeFromMagic(
                            prepared.bytes,
                            record.absoluteOffset,
                        )
                        : "unknown");

                addSourceRecord(embeddedMedia, id, {
                    sourceID: `embedded:${id}:${inspectedSourceID}`,
                    bank: inspectedSourceID,
                    offset: record.absoluteOffset,
                    byteLength: record.length,
                    language: bank.language,
                    mediaType,
                });
            }
        }

        const merged = this.createEventMediaGraphs(inspections, {
            knownWemIds: Object.keys(library.media),
            language: eventMediaLanguage,
        });
        const eventMedia = this.createEventMediaTable(
            library.metadata,
            merged,
        );
        const completeOptions = {
            ...options,
            bankIdentities,
            eventMedia,
            eventMediaLanguage,
            embeddedMedia,
        };

        library = this.build(completeOptions);

        if (includeMusic)
        {
            const music = this.createMusicGraph({
                inspections: inspections.filter(inspection =>
                    [
                        MUSIC_EVENT_BANK_NAME,
                        ...MUSIC_BANK_NAMES,
                    ].includes(bankSourceName(inspection.source))),
                metadata: library.metadata,
                media: library.media,
                embeddedMedia: library.embeddedMedia ?? {},
            });

            library = this.build({
                ...completeOptions,
                music,
            });
        }

        return library;
    }

    /** Builds a deterministic source catalog without opening bank bytes. */
    static build(options = {})
    {
        const {
            indexEntries = [],
            metadata: metadataInput = null,
            soundbanksInfo,
            enrichment = null,
            eventMedia = null,
            eventMediaLanguage = null,
            embeddedMedia = null,
            bankIdentities = null,
            music = null,
            sourceTarget = null,
            sourceGame = null,
            sourceProvider = null,
            sourceBuild = null,
            generatedAt = null,
        } = options;

        const source = normalizeSourceIdentity({
            target: sourceTarget,
            game: sourceGame,
            provider: sourceProvider,
            build: sourceBuild,
        });

        const entries = normalizeIndexEntries(indexEntries);

        const metadata = createAudioMetadata({
            metadata: metadataInput,
            soundbanksInfo,
            enrichment,
        });

        const authoredBanks = createAuthoredBankCatalog(
            soundbanksInfo,
            metadata,
        );

        const media = {};

        const banks = createBankTable(
            entries,
            authoredBanks,
            bankIdentities,
        );

        for (const entry of entries)
        {
            const lower = entry.logicalPath.toLowerCase();
            const base = lower.split("/").pop();
            if (base.endsWith(".wem"))
            {
                const id = base.slice(0, -4);
                addSourceRecord(media, id, {
                    resPath: entry.logicalPath,
                    storagePath: entry.storagePath,
                    byteLength: entry.byteLength,
                    checksum: entry.checksum,
                    essential: lower.includes("/essential_media/"),
                    language: languageSegment(lower)
                });
            }
        }

        const library = {
            schema: this.schema,
            schemaVersion: this.schemaVersion,
            metadata: sortedKeys({
                Events: sortedKeys(metadata.Events),
                SoundBanks: sortedKeys(metadata.SoundBanks),
                WemFileIDs: sortedKeys(metadata.WemFileIDs)
            }),
            media: normalizeSourceTable(media),
            banks: sortedKeys(banks)
        };

        if (eventMedia && Object.keys(eventMedia).length)
        {
            library.eventMedia = sortedKeys(eventMedia);
            library.eventMediaLanguage = eventMediaLanguage === null
                ? ""
                : String(eventMediaLanguage);
        }

        if (embeddedMedia && Object.keys(embeddedMedia).length)
        {
            library.embeddedMedia = normalizeSourceTable(embeddedMedia);
        }

        if (music !== null)
        {
            validateMusicGraph(
                music,
                library.media,
                library.embeddedMedia ?? {},
            );
            library.music = normalizeMusicGraph(music);
        }

        if (source)
        {
            library.sourceTarget = source.target;
            library.sourceGame = source.game;
            library.sourceProvider = source.provider;
            library.sourceBuild = source.build;
        }

        if (generatedAt !== null)
        {
            library.generatedAt = String(generatedAt);
        }

        return library;
    }

}

function normalizeBankLoader(options)
{
    if (typeof options.loadBank === "function")
    {
        return options.loadBank;
    }

    const provider = options.bankProvider;

    if (provider && typeof provider.LoadBank === "function")
    {
        return (bank, context) => provider.LoadBank(bank, context);
    }
    if (provider && typeof provider.Read === "function")
    {
        return (bank, context) => provider.Read(bank, context);
    }

    const values = options.bankData;

    if (values instanceof Map)
    {
        return (bank, { sourceID }) =>
            values.get(sourceID)
            ?? values.get(bank.resPath)
            ?? values.get(bank.storagePath)
            ?? null;
    }
    if (values && typeof values === "object" && !Array.isArray(values))
    {
        return (bank, { sourceID }) =>
            values[sourceID]
            ?? values[bank.resPath]
            ?? values[bank.storagePath]
            ?? null;
    }

    throw new TypeError(
        "Complete audio-library construction requires loadBank, bankProvider, or bankData",
    );
}

function normalizeLoadedBank(value, sourceID)
{
    if (value === null || value === undefined)
    {
        throw new Error(`Audio bank provider returned no data for ${sourceID}`);
    }

    if (isBytes(value))
    {
        return {
            bytes: toUint8Array(value),
            inspection: null,
        };
    }
    if (!value || typeof value !== "object" || Array.isArray(value))
    {
        throw new TypeError(
            `Audio bank provider returned an invalid value for ${sourceID}`,
        );
    }

    const bytes = value.bytes === null || value.bytes === undefined
        ? null
        : toUint8Array(value.bytes);
    const inspection = value.inspection ?? null;

    if (!bytes && !inspection)
    {
        throw new TypeError(
            `Audio bank provider returned no bytes or inspection for ${sourceID}`,
        );
    }

    return { bytes, inspection };
}

function isBytes(value)
{
    return value instanceof ArrayBuffer
        || ArrayBuffer.isView(value);
}

function defaultInspectBank(bytes, { source })
{
    if (!bytes)
    {
        throw new TypeError("Default audio bank inspection requires bytes");
    }

    return CjsBnkFormat.inspect(bytes, { source });
}

function compactBankInspection(value, source, bank)
{
    if (!value || typeof value !== "object" || Array.isArray(value))
    {
        throw new TypeError(`Audio bank inspection is invalid: ${bank.resPath}`);
    }

    const bankId = Number(normalizeUnsignedID(
        value.bankId,
        `Audio bank ${bank.resPath} inspected bankId`,
    ));
    const languageId = Number(normalizeUnsignedID(
        value.languageId ?? 0,
        `Audio bank ${bank.resPath} inspected languageId`,
    ));
    const hirc = Array.from(value.hirc ?? [], entry =>
    {
        if (!entry || typeof entry !== "object" || Array.isArray(entry))
        {
            throw new TypeError(
                `Audio bank ${bank.resPath} contains an invalid HIRC entry`,
            );
        }

        return {
            ...entry,
            ...(entry.payload === null || entry.payload === undefined
                ? {}
                : { payload: toUint8Array(entry.payload).slice() }),
        };
    });
    const media = Array.from(value.media ?? [], entry =>
    {
        if (!entry || typeof entry !== "object" || Array.isArray(entry))
        {
            throw new TypeError(
                `Audio bank ${bank.resPath} contains an invalid media entry`,
            );
        }

        const id = normalizeUnsignedID(
            entry.id,
            `Audio bank ${bank.resPath} media ID`,
        );
        const available = entry.available === true;
        const absoluteOffset = Number(entry.absoluteOffset ?? 0);
        const length = Number(entry.length ?? 0);

        if (!Number.isSafeInteger(absoluteOffset) || absoluteOffset < 0)
        {
            throw new TypeError(
                `Audio bank ${bank.resPath} media offset is invalid`,
            );
        }
        if (!Number.isSafeInteger(length) || length < 0)
        {
            throw new TypeError(
                `Audio bank ${bank.resPath} media length is invalid`,
            );
        }

        return {
            ...entry,
            id: Number(id),
            available,
            absoluteOffset,
            length,
        };
    });

    return {
        source,
        resPath: bank.resPath,
        bankId,
        languageId,
        language: bank.language,
        hirc,
        media,
    };
}

function requireMusicBanks(library, enabled)
{
    if (!enabled)
    {
        return;
    }

    const names = new Set(
        Object.values(library.banks)
            .map(bank => bankSourceName(bank.resPath)),
    );
    const missing = [
        MUSIC_EVENT_BANK_NAME,
        ...MUSIC_BANK_NAMES,
    ].filter(name => !names.has(name));

    if (missing.length)
    {
        throw new Error(
            `Audio music construction requires indexed banks: ${missing.join(", ")}`,
        );
    }
}

function normalizeEventMediaLanguage(value)
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

function throwIfAborted(signal)
{
    if (!signal?.aborted)
    {
        return;
    }

    if (signal.reason instanceof Error)
    {
        throw signal.reason;
    }

    const error = new Error("Audio-library construction was aborted");

    error.name = "AbortError";
    throw error;
}

function normalizeIndexEntries(value)
{
    if (typeof value === "string")
    {
        return parseIndexText(value);
    }

    let input;

    if (value === null || value === undefined)
    {
        input = [];
    }
    else if (Array.isArray(value))
    {
        input = value;
    }
    else if (Array.isArray(value.entries))
    {
        input = value.entries;
    }
    else if (typeof value[Symbol.iterator] === "function")
    {
        input = [ ...value ];
    }
    else
    {
        throw new TypeError(
            "Audio index entries must be file-index text or an iterable",
        );
    }

    const entries = [];

    for (const entry of input)
    {
        if (!entry || typeof entry !== "object" || Array.isArray(entry))
        {
            throw new TypeError("Audio index entries must contain objects");
        }

        const logicalPath = String(entry.logicalPath ?? "").trim()
            .replaceAll("\\", "/");

        if (!logicalPath.toLowerCase().startsWith("res:/audio/"))
        {
            continue;
        }

        const storagePath = String(
            entry.storagePath ?? entry.location ?? "",
        ).trim().replaceAll("\\", "/");
        const byteLength = Number(
            entry.byteLength ?? entry.uncompressedSize ?? 0,
        );

        if (!Number.isSafeInteger(byteLength) || byteLength < 0)
        {
            throw new TypeError(
                `Audio index byteLength must be a non-negative integer: ${logicalPath}`,
            );
        }

        entries.push({
            logicalPath,
            storagePath,
            checksum: String(entry.checksum ?? ""),
            byteLength,
        });
    }

    return entries.sort(compareIndexEntries);
}

function parseIndexText(value)
{
    const entries = [];

    for (const line of value.split(/\r?\n/u))
    {
        if (!line)
        {
            continue;
        }

        const [ logicalPath, storagePath, checksum, byteLength ] = line.split(",");

        entries.push({
            logicalPath,
            storagePath,
            checksum,
            byteLength,
        });
    }

    return normalizeIndexEntries(entries);
}

function compareIndexEntries(left, right)
{
    return compareText(
        String(left.logicalPath).toLowerCase(),
        String(right.logicalPath).toLowerCase(),
    ) || compareText(left.storagePath, right.storagePath);
}

function createAudioMetadata({ metadata, soundbanksInfo, enrichment })
{
    let result;

    if (soundbanksInfo !== null && soundbanksInfo !== undefined)
    {
        result = normalizeAudioMetadata(
            audioMetadataFromSoundbanksInfo(soundbanksInfo),
            "SoundbanksInfo metadata",
        );

        if (metadata !== null && metadata !== undefined)
        {
            result = mergeAudioMetadata(
                result,
                normalizeAudioMetadata(metadata, "audio metadata", {
                    partial: true,
                }),
            );
        }
    }
    else if (metadata !== null && metadata !== undefined)
    {
        result = normalizeAudioMetadata(metadata, "audio metadata");
    }
    else
    {
        throw new TypeError(
            "Audio-library construction requires metadata or soundbanksInfo",
        );
    }

    if (enrichment !== null && enrichment !== undefined)
    {
        result = mergeAudioMetadata(
            result,
            normalizeAudioMetadata(enrichment, "audio metadata enrichment", {
                partial: true,
            }),
        );
    }

    return result;
}

function normalizeAudioMetadata(value, label, { partial = false } = {})
{
    if (!value || typeof value !== "object" || Array.isArray(value))
    {
        throw new TypeError(`${label} must be an object`);
    }

    return {
        Events: normalizeMetadataSection(
            value.Events,
            `${label}.Events`,
            partial,
        ),
        SoundBanks: normalizeMetadataSection(
            value.SoundBanks,
            `${label}.SoundBanks`,
            partial,
        ),
        WemFileIDs: normalizeMetadataSection(
            value.WemFileIDs,
            `${label}.WemFileIDs`,
            partial,
        ),
    };
}

function normalizeMetadataSection(value, label, optional = false)
{
    let entries;

    if (value === undefined && optional)
    {
        entries = [];
    }
    else if (value instanceof Map)
    {
        entries = [ ...value.entries() ];
    }
    else if (value && typeof value === "object" && !Array.isArray(value))
    {
        entries = Object.entries(value);
    }
    else
    {
        throw new TypeError(`${label} must be an object or Map`);
    }

    const result = {};

    for (const [ rawKey, rawRecord ] of entries.sort(([ left ], [ right ]) =>
        compareText(String(left), String(right))))
    {
        const key = String(rawKey);

        if (!key)
        {
            throw new TypeError(`${label} contains an empty key`);
        }
        if (!rawRecord || typeof rawRecord !== "object" || Array.isArray(rawRecord))
        {
            throw new TypeError(`${label}.${key} must be an object`);
        }

        result[key] = normalizeJSONValue(rawRecord, `${label}.${key}`);
    }

    return result;
}

function normalizeJSONValue(value, label)
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
            throw new TypeError(`${label} must contain finite numbers`);
        }

        return value;
    }
    if (Array.isArray(value))
    {
        return value.map((entry, index) =>
            normalizeJSONValue(entry, `${label}[${index}]`));
    }

    const entries = value instanceof Map
        ? [ ...value.entries() ]
        : value && typeof value === "object"
            && (Object.getPrototypeOf(value) === Object.prototype
                || Object.getPrototypeOf(value) === null)
            ? Object.entries(value)
            : null;

    if (!entries)
    {
        throw new TypeError(`${label} must contain JSON-compatible values`);
    }

    const result = {};

    for (const [ key, entry ] of entries)
    {
        result[String(key)] = normalizeJSONValue(
            entry,
            `${label}.${String(key)}`,
        );
    }

    return result;
}

function mergeAudioMetadata(base, overlay)
{
    const result = {
        Events: { ...base.Events },
        SoundBanks: { ...base.SoundBanks },
        WemFileIDs: { ...base.WemFileIDs },
    };

    for (const section of [ "Events", "SoundBanks", "WemFileIDs" ])
    {
        for (const [ key, record ] of Object.entries(overlay[section]))
        {
            result[section][key] = {
                ...(result[section][key] ?? {}),
                ...record,
            };
        }

        result[section] = sortedKeys(result[section]);
    }

    return result;
}

function createAuthoredBankCatalog(soundbanksInfo, metadata)
{
    if (soundbanksInfo !== null && soundbanksInfo !== undefined)
    {
        return CjsBnkFormat.wwise.parseSoundbanksInfo(soundbanksInfo).banks;
    }

    return Object.entries(metadata.SoundBanks).map(([ key, record ]) =>
    {
        const sourceName = bankSourceName(key);
        const path = String(record.path ?? key);
        const shortName = String(
            record.shortName
            ?? record.name
            ?? sourceName.replace(/\.bnk$/u, ""),
        );
        const id = record.shortId
            ?? record.shortID
            ?? record.bankID
            ?? (/^\d+$/u.test(String(record.id ?? "")) ? record.id : undefined);

        if (id === undefined)
        {
            throw new TypeError(
                `Audio metadata bank ${key} has no numeric bank identity`,
            );
        }

        return {
            id,
            shortName,
            path,
            language: authoredBankLanguage(record, path),
        };
    });
}

function authoredBankLanguage(record, path)
{
    const explicit = record.authoredLanguage ?? record.language;

    if (explicit !== undefined && explicit !== null)
    {
        return normalizeAuthoredLanguage(explicit);
    }

    const parentName = record.parent?.name;

    if (parentName !== undefined && parentName !== null)
    {
        return normalizeAuthoredLanguage(parentName);
    }

    const segments = String(path).replaceAll("\\", "/")
        .split("/").filter(Boolean);
    const bankIndex = segments.findIndex(value =>
        value.toLowerCase() === "soundbanks");

    if (bankIndex >= 0 && bankIndex + 2 < segments.length)
    {
        return normalizeAuthoredLanguage(segments[bankIndex + 1]);
    }

    return "";
}

function normalizeAuthoredLanguage(value)
{
    const language = String(value ?? "").trim();

    return normalizeLanguageToken(language) === "sfx" ? "" : language;
}

function createBankTable(indexEntries, authoredBanks, bankIdentities)
{
    const identities = normalizeBankIdentities(bankIdentities);
    const banks = {};

    for (const entry of indexEntries)
    {
        const logicalPath = String(entry.logicalPath ?? "");
        const base = logicalPath.toLowerCase().split("/").pop();

        if (!base?.endsWith(".bnk"))
        {
            continue;
        }

        const authored = matchAuthoredBank(logicalPath, authoredBanks);

        if (!authored)
        {
            throw new TypeError(
                `Audio bank source has no SoundbanksInfo identity: ${logicalPath}`,
            );
        }

        const override = identities.get(logicalPath.toLowerCase()) ?? null;
        const bankID = normalizeUnsignedID(
            override?.bankID ?? authored.id,
            `Audio bank ${logicalPath} bankID`,
        );
        const authoredLanguageID = authored.language
            ? CjsBnkFormat.wwise.wwiseIdFromName(authored.language)
            : 0;
        const languageID = normalizeUnsignedID(
            override?.languageID ?? authoredLanguageID,
            `Audio bank ${logicalPath} languageID`,
        );

        if (override?.bankID !== undefined
            && String(bankID) !== String(normalizeUnsignedID(
                authored.id,
                `SoundbanksInfo bank ${authored.shortName} ID`,
            )))
        {
            throw new Error(
                `Audio bank identity mismatch for ${logicalPath}: `
                + `${bankID} !== ${authored.id}`,
            );
        }
        if (override?.languageID !== undefined
            && String(languageID) !== String(normalizeUnsignedID(
                authoredLanguageID,
                `SoundbanksInfo bank ${authored.shortName} language ID`,
            )))
        {
            throw new Error(
                `Audio bank language identity mismatch for ${logicalPath}: `
                + `${languageID} !== ${authoredLanguageID}`,
            );
        }

        const sourceID = `${bankID}:${languageID}`;

        if (banks[sourceID])
        {
            throw new TypeError(
                `Duplicate audio bank identity ${sourceID}: `
                + `${banks[sourceID].resPath} and ${logicalPath}`,
            );
        }

        banks[sourceID] = {
            sourceID,
            bankID,
            languageID,
            language: audioLanguageTag(authored.language),
            authoredLanguage: String(authored.language ?? ""),
            shortName: String(authored.shortName ?? ""),
            resPath: logicalPath,
            storagePath: entry.storagePath,
            byteLength: entry.byteLength,
            checksum: entry.checksum,
        };
    }

    return sortedKeys(banks);
}

function matchAuthoredBank(logicalPath, authoredBanks)
{
    const path = normalizeBankPath(logicalPath);
    const tail = path.replace(/^res:\/audio\//u, "");
    const base = tail.split("/").pop();
    const stem = base?.replace(/\.bnk$/u, "") ?? "";
    const scored = [];

    for (const bank of authoredBanks)
    {
        const authoredPath = normalizeBankPath(bank.path)
            .replace(/^soundbanks\//u, "");
        const authoredBase = authoredPath.split("/").pop()
            || `${String(bank.shortName).toLowerCase()}.bnk`;
        let score = 0;

        if (authoredPath && tail.endsWith(authoredPath)) score += 100;
        if (base === authoredBase) score += 50;
        if (stem === String(bank.id)) score += 50;
        if (stem === String(bank.shortName).toLowerCase()) score += 50;

        const language = normalizeLanguageToken(bank.language);

        if (language && normalizeLanguageToken(tail).includes(language))
        {
            score += 20;
        }

        if (score)
        {
            scored.push({ bank, score });
        }
    }

    scored.sort((left, right) => right.score - left.score);

    if (!scored.length)
    {
        return null;
    }

    if (scored.length > 1 && scored[0].score === scored[1].score)
    {
        throw new TypeError(`Ambiguous SoundbanksInfo identity for ${logicalPath}`);
    }

    return scored[0].bank;
}

function normalizeBankIdentities(value)
{
    const identities = new Map();

    if (value === null || value === undefined)
    {
        return identities;
    }

    const entries = value instanceof Map ? value.entries() : Object.entries(value);

    for (const [ sourcePath, identity ] of entries)
    {
        if (!identity || typeof identity !== "object" || Array.isArray(identity))
        {
            throw new TypeError(`Invalid audio bank identity for ${sourcePath}`);
        }

        identities.set(String(sourcePath).toLowerCase(), identity);
    }

    return identities;
}

function normalizeUnsignedID(value, label)
{
    const numeric = Number(value);

    if (!Number.isSafeInteger(numeric) || numeric < 0 || numeric > 0xffffffff)
    {
        throw new TypeError(`${label} must be an unsigned 32-bit integer`);
    }

    return String(numeric >>> 0);
}

function normalizeBankPath(value)
{
    return String(value ?? "").trim().replaceAll("\\", "/").toLowerCase();
}

function compareBankInspections(left, right)
{
    return compareText(
        bankSourceName(left?.source),
        bankSourceName(right?.source),
    )
        || compareText(
            normalizeBankPath(left?.resPath),
            normalizeBankPath(right?.resPath),
        )
        || (Number(left?.bankId ?? 0) >>> 0)
            - (Number(right?.bankId ?? 0) >>> 0)
        || (Number(left?.languageId ?? 0) >>> 0)
            - (Number(right?.languageId ?? 0) >>> 0);
}

function addSourceRecord(table, key, record)
{
    const current = table[key];

    if (current === undefined)
    {
        table[key] = record;
    }
    else if (Array.isArray(current))
    {
        current.push(record);
    }
    else
    {
        table[key] = [ current, record ];
    }
}

function normalizeSourceTable(table)
{
    const result = {};

    for (const key of Object.keys(table).sort())
    {
        const input = Array.isArray(table[key]) ? table[key] : [ table[key] ];
        const unique = new Map();

        for (const record of input)
        {
            unique.set(JSON.stringify(record), record);
        }

        const records = [ ...unique.values() ].sort(compareSourceRecords);

        result[key] = records.length === 1 ? records[0] : records;
    }

    return result;
}

function compareSourceRecords(left, right)
{
    const leftKey = [
        left?.sourceID,
        left?.bank,
        left?.resPath ?? left?.logicalPath ?? left?.path,
        left?.language,
        left?.offset,
        left?.byteLength,
    ].map(value => String(value ?? "")).join("\0");
    const rightKey = [
        right?.sourceID,
        right?.bank,
        right?.resPath ?? right?.logicalPath ?? right?.path,
        right?.language,
        right?.offset,
        right?.byteLength,
    ].map(value => String(value ?? "")).join("\0");

    return compareText(leftKey, rightKey)
        || compareText(JSON.stringify(left), JSON.stringify(right));
}

function compareText(left, right)
{
    return left < right ? -1 : left > right ? 1 : 0;
}

function toUint8Array(value)
{
    if (value instanceof Uint8Array)
    {
        return value;
    }

    if (value instanceof ArrayBuffer)
    {
        return new Uint8Array(value);
    }

    if (ArrayBuffer.isView(value))
    {
        return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    }

    throw new TypeError("Audio media classification requires bytes");
}

function normalizeLanguageToken(value)
{
    return String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/gu, "");
}

function audioLanguageTag(value)
{
    const input = String(value ?? "").trim().replaceAll("_", "-").toLowerCase();

    if (!input)
    {
        return "";
    }

    if (Object.hasOwn(AUDIO_LANGUAGE_TAGS, input))
    {
        return AUDIO_LANGUAGE_TAGS[input];
    }

    if (/^[a-z]{2,8}(?:-[a-z0-9]{1,8})*$/u.test(input))
    {
        return input;
    }

    return "";
}

function bankSourceName(value)
{
    const normalized = String(value ?? "").trim().replaceAll("\\", "/");

    return normalized.split("/").pop().toLowerCase();
}

function validateMusicNodeReferences(nodes, media, embeddedMedia)
{
    for (const [ id, node ] of Object.entries(nodes))
    {
        for (const childID of node.children ?? [])
        {
            if (!nodes[childID])
            {
                throw new Error(
                    `Music node ${id} references missing child ${childID}`,
                );
            }
        }

        if (node.type !== "music-track")
        {
            continue;
        }

        for (const source of node.sources ?? [])
        {
            const sourceID = String(source.sourceId);

            if (!media[sourceID] && !embeddedMedia[sourceID])
            {
                throw new Error(
                    `Music track ${id} references missing source ${sourceID}`,
                );
            }
        }
    }
}

function createMusicEventProjection(inspection, metadata, nodes)
{
    const actionsByID = new Map();
    const eventsByID = new Map();

    for (const entry of inspection.hirc ?? [])
    {
        if (entry.typeName === "event-action") actionsByID.set(entry.id, entry);
        else if (entry.typeName === "event") eventsByID.set(entry.id, entry);
    }

    const eventNamesByID = new Map();

    for (const [ name, record ] of metadataEntries(
        metadata?.Events,
        "Audio metadata Events",
    ))
    {
        eventNamesByID.set(Number(record.eventID) >>> 0, name);
    }

    const eventTargets = {};
    const eventStops = {};
    const switchSetters = {};

    for (const [ eventID, event ] of eventsByID)
    {
        const name = eventNamesByID.get(eventID >>> 0);

        if (!name || !name.toLowerCase().startsWith("music_"))
        {
            continue;
        }

        for (const actionID of eventActionIDs(event))
        {
            const action = actionsByID.get(actionID);

            if (!action)
            {
                continue;
            }

            const fields = actionFields(action);

            const family = (fields.actionType >> 8) & 0xff;

            if (family === 0x04 && nodes[fields.targetID])
            {
                addEventTarget(eventTargets, name, fields.targetID);
            }
            else if (family === 0x01 && nodes[fields.targetID])
            {
                addEventTarget(eventStops, name, fields.targetID);
            }
            else if (family === 0x19 || family === 0x12)
            {
                // runtime-resource types the action family and target. Wwise
                // does not yet expose SetSwitch/SetState's two tail IDs, so
                // this is the deliberately narrow remaining payload read.
                if (!fields.payload || fields.payload.byteLength < 8)
                {
                    throw new Error(
                        `Music setter action ${actionID} has a truncated payload`,
                    );
                }

                const view = new DataView(
                    fields.payload.buffer,
                    fields.payload.byteOffset,
                    fields.payload.byteLength,
                );
                const groupID = view.getUint32(fields.payload.byteLength - 8, true);
                const targetID = view.getUint32(fields.payload.byteLength - 4, true);
                const values = switchSetters[name] ?? (switchSetters[name] = []);

                values.push({
                    kind: family === 0x19 ? "switch" : "state",
                    groupId: groupID,
                    targetId: targetID,
                });
            }
        }
    }

    return {
        eventTargets: normalizeTargetTable(eventTargets),
        eventStops: normalizeTargetTable(eventStops),
        switchSetters: normalizeSetterTable(switchSetters),
    };
}

function eventActionIDs(entry)
{
    const actionIDs = entry.actionIds ?? entry.actions;

    if (!Array.isArray(actionIDs))
    {
        throw new Error(
            `Music event ${entry.id} has no typed action list`,
        );
    }

    return actionIDs;
}

function actionFields(entry)
{
    const payload = entry.payload instanceof Uint8Array ? entry.payload : null;
    const actionType = entry.actionType;
    const targetID = entry.targetId ?? entry.target;

    if (actionType === undefined || targetID === undefined)
    {
        throw new Error(
            `Music action ${entry.id} has no typed action fields`,
        );
    }

    return {
        actionType: Number(actionType) >>> 0,
        targetID: Number(targetID) >>> 0,
        payload,
    };
}

function addEventTarget(table, name, targetID)
{
    (table[name] ?? (table[name] = [])).push(targetID >>> 0);
}

function normalizeTargetTable(table)
{
    const result = {};

    for (const name of Object.keys(table).sort())
    {
        result[name] = [ ...new Set(table[name]) ].sort((left, right) => left - right);
    }

    return result;
}

function normalizeSetterTable(table)
{
    const result = {};

    for (const name of Object.keys(table).sort())
    {
        const unique = new Map();

        for (const setter of table[name])
        {
            unique.set(
                `${setter.kind}:${setter.groupId}:${setter.targetId}`,
                setter,
            );
        }

        result[name] = [ ...unique.values() ].sort((left, right) =>
            left.kind.localeCompare(right.kind, "en")
            || left.groupId - right.groupId
            || left.targetId - right.targetId);
    }

    return result;
}

function validateMusicGraph(music, media, embeddedMedia)
{
    if (!music || typeof music !== "object" || Array.isArray(music))
    {
        throw new TypeError("Audio library music must be an object");
    }

    if (music.schemaVersion !== 1)
    {
        throw new TypeError(
            `Unsupported audio music schema version: ${music.schemaVersion}`,
        );
    }

    if (!music.nodes || typeof music.nodes !== "object" || Array.isArray(music.nodes))
    {
        throw new TypeError("Audio library music nodes must be an object");
    }

    if (!Array.isArray(music.banks))
    {
        throw new TypeError("Audio library music banks must be an array");
    }

    const bankNames = music.banks.map(bankSourceName);

    if (bankNames.some(name => !name)
        || new Set(bankNames).size !== bankNames.length)
    {
        throw new TypeError(
            "Audio library music banks must be unique source names",
        );
    }

    for (const [ id, node ] of Object.entries(music.nodes))
    {
        if (!node || typeof node !== "object" || Array.isArray(node))
        {
            throw new TypeError(`Audio library music node ${id} must be an object`);
        }

        if (!bankNames.includes(bankSourceName(node.bank)))
        {
            throw new TypeError(
                `Audio library music node ${id} references unknown bank: ${node.bank}`,
            );
        }
    }

    validateMusicNodeReferences(music.nodes, media, embeddedMedia);

    for (const field of [ "eventTargets", "eventStops" ])
    {
        if (!music[field] || typeof music[field] !== "object"
            || Array.isArray(music[field]))
        {
            throw new TypeError(`Audio library music ${field} must be an object`);
        }

        for (const [ name, targets ] of Object.entries(music[field]))
        {
            if (!Array.isArray(targets))
            {
                throw new TypeError(
                    `Audio library music ${field}.${name} must be an array`,
                );
            }

            const ids = targets.map(value => Number(value) >>> 0);

            if (new Set(ids).size !== ids.length)
            {
                throw new TypeError(
                    `Audio library music ${field}.${name} has duplicate targets`,
                );
            }

            for (const id of ids)
            {
                if (!music.nodes[id])
                {
                    throw new TypeError(
                        `Audio library music ${field}.${name} `
                        + `references missing node ${id}`,
                    );
                }
            }
        }
    }

    if (!music.switchSetters || typeof music.switchSetters !== "object"
        || Array.isArray(music.switchSetters))
    {
        throw new TypeError("Audio library music switchSetters must be an object");
    }

    for (const [ name, setters ] of Object.entries(music.switchSetters))
    {
        if (!Array.isArray(setters))
        {
            throw new TypeError(
                `Audio library music switchSetters.${name} must be an array`,
            );
        }

        const keys = setters.map(setter =>
        {
            if (!setter || ![ "switch", "state" ].includes(setter.kind))
            {
                throw new TypeError(
                    `Audio library music switchSetters.${name} has an invalid setter`,
                );
            }

            return `${setter.kind}:${setter.groupId}:${setter.targetId}`;
        });

        if (new Set(keys).size !== keys.length)
        {
            throw new TypeError(
                `Audio library music switchSetters.${name} has duplicate setters`,
            );
        }
    }
}

function normalizeMusicGraph(music)
{
    return {
        schemaVersion: 1,
        generator: String(music.generator ?? "@carbonenginejs/runtime-audio/library-builder"),
        banks: [ ...new Set((music.banks ?? []).map(bankSourceName)) ].sort(),
        nodes: sortedKeys(music.nodes),
        eventTargets: normalizeTargetTable(music.eventTargets),
        eventStops: normalizeTargetTable(music.eventStops),
        switchSetters: normalizeSetterTable(music.switchSetters),
    };
}

function normalizeSourceIdentity({ target, game, provider, build })
{
    const values = [ target, game, provider, build ];

    if (values.every(value => value === null || value === undefined))
    {
        return null;
    }

    if (values.some(value => value === null || value === undefined))
    {
        throw new TypeError(
            "Audio source identity requires target, game, provider, and build",
        );
    }

    const normalized = {
        target: normalizeIdentityPart(target, "target"),
        game: normalizeIdentityPart(game, "game"),
        provider: normalizeIdentityPart(provider, "provider"),
        build: normalizeIdentityPart(build, "build"),
    };

    return normalized;
}

function normalizeIdentityPart(value, label)
{
    const result = String(value ?? "").trim();

    if (!result)
    {
        throw new TypeError(`Audio source ${label} must be a non-empty string`);
    }

    return result;
}

// res:/audio/<language>/<id>.wem carries a language folder; Media/ and
// Essential_Media/ do not, matching the authored AudPathResolver routing.
function languageSegment(lowerPath)
{
    const segments = lowerPath.split("/");
    if (segments.length === 4 && segments[2] !== "media" && segments[2] !== "essential_media")
    {
        return audioLanguageTag(segments[2]);
    }
    return "";
}

function sortedKeys(value)
{
    const sorted = {};
    for (const key of Object.keys(value).sort())
    {
        sorted[key] = value[key];
    }
    return sorted;
}

function metadataEntries(value, label)
{
    if (value instanceof Map)
    {
        return value.entries();
    }
    if (value && typeof value === "object" && !Array.isArray(value))
    {
        return Object.entries(value);
    }

    throw new TypeError(`${label} must be an object or Map`);
}
