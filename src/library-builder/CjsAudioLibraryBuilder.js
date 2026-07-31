// Browser-safe audio-library construction. Acquisition remains caller-owned:
// the builder accepts index values, metadata values, and optional injected
// bank-byte/inspection capabilities without discovering files or services.
import { audioMetadataFromSoundbanksInfo } from "../audioMetadata.js";
import { validateAudioLibraryDocument } from "../library/audioLibraryDocument.js";
import { normalizeSfxGraph } from "../library/sfxGraph.js";
import { CjsBnkFormat } from "@carbonenginejs/runtime-resource/formats/bnk";

const MUSIC_BANK_NAMES = Object.freeze([ "music.bnk", "music_essential.bnk" ]);
const MUSIC_HIRC_TYPES = new Set([ 10, 11, 12, 13 ]);
const SFX_PLAY_ACTION = 0x0403;
const SFX_PLAY_EVENT_ACTION = 0x2103;
const SFX_STOP_ACTION_FAMILY = 0x01;
const SFX_SET_STATE_ACTION_FAMILY = 0x12;
const SFX_SET_SWITCH_ACTION_FAMILY = 0x19;
const SFX_UNSUPPORTED_PLAY_ACTIONS = new Set([ 0x0503 ]);
const SFX_VOLUME_PROPERTY = 0;
const SFX_PITCH_PROPERTY = 1;
const SFX_LOW_PASS_PROPERTY = 2;
const SFX_HIGH_PASS_PROPERTY = 3;
const SFX_INITIAL_DELAY_PROPERTY = 34;
const SFX_ADDITIVE_ACCUMULATION = 2;
const SFX_FILTER_ACCUMULATION = 6;
const SFX_IMMEDIATE_STATE_SYNC = 0;
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
     * Projects exact event-to-media reachability from a validated SFX graph.
     *
     * Every possible authored branch is included. Events absent from the
     * graph are intentionally absent from the result rather than falling back
     * to heuristic container-byte scanning.
     */
    static createSfxEventMediaTable(sfx)
    {
        return CreateSfxEventMediaTable(sfx);
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
        const selected = SelectLanguageInspections(inspections, language);

        return [
            CjsBnkFormat.wwise.eventMediaFromBanks(
                selected,
                graphOptions,
            ),
        ];
    }

    /**
     * Projects the conservative v150 Step SFX subset from typed BNK nodes.
     *
     * runtime-resource owns HIRC decoding. This method only names and lowers
     * codec sounds, Step Random/Sequence, Step Switch/State containers, and
     * supported non-continuous Layer containers and crossfades. It also returns a sparse
     * event-metadata projection after resolving NodeBase positioning through
     * hierarchy-only Actor-Mixers. Unsupported events are omitted whole and
     * described in diagnostics; unresolved spatial inheritance omits only
     * that metadata projection.
     */
    static createSfxGraph({
        inspections,
        metadata,
        soundbanksInfo = null,
        enrichment = null,
        media = {},
        embeddedMedia = {},
    } = {})
    {
        if (!Array.isArray(inspections))
        {
            throw new TypeError(
                "Audio SFX construction requires bank inspections",
            );
        }

        const parsed = CjsBnkFormat.wwise.sfxNodesFromBanks(inspections);
        const eventNames = new Map();

        for (const [ name, record ] of metadataEntries(
            metadata?.Events,
            "Audio metadata Events",
        ))
        {
            eventNames.set(Number(record.eventID) >>> 0, name);
        }

        return LowerSfxGraph({
            parsed,
            eventNames,
            names: CreateSfxNameCatalog(soundbanksInfo, enrichment),
            media,
            embeddedMedia,
        });
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
        eventInspections = inspections,
        metadata,
        media = {},
        embeddedMedia = {},
        musicBankNames = MUSIC_BANK_NAMES,
    } = {})
    {
        if (!Array.isArray(inspections))
        {
            throw new TypeError("Audio music construction requires bank inspections");
        }
        if (!Array.isArray(eventInspections))
        {
            throw new TypeError(
                "Audio music event construction requires bank inspections",
            );
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

        const requiredNames = musicBankNames.map(bankSourceName);

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

        const eventProjection = this.createMusicEventProjection({
            inspections: eventInspections,
            metadata,
            nodes,
        });

        return {
            schemaVersion: 1,
            generator: "@carbonenginejs/runtime-audio/library-builder",
            banks: musicBankNames.map(bankSourceName),
            nodes,
            ...eventProjection,
        };
    }

    /**
     * Projects typed Wwise actions from every selected bank onto music nodes.
     *
     * Music events are identified by their authored targets and argument
     * groups, not by a bank location or event-name convention.
     */
    static createMusicEventProjection({
        inspections,
        metadata,
        nodes,
    } = {})
    {
        if (!Array.isArray(inspections))
        {
            throw new TypeError(
                "Audio music event projection requires bank inspections",
            );
        }
        if (!nodes || typeof nodes !== "object" || Array.isArray(nodes))
        {
            throw new TypeError(
                "Audio music event projection requires music nodes",
            );
        }

        return createMusicEventProjection(inspections, metadata, nodes);
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

        const result = {
            ...library,
            metadata: sortedKeys({
                Events: sortedKeys(metadata.Events),
                SoundBanks: sortedKeys(metadata.SoundBanks),
                WemFileIDs: sortedKeys(metadata.WemFileIDs),
            }),
        };

        if (enrichment?.sfx)
        {
            result.sfx = normalizeSfxGraph(
                enrichment.sfx,
                library.media ?? {},
                library.embeddedMedia ?? {},
            );
        }

        validateAudioLibraryDocument(result);
        return result;
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
        const includeSfx = options.includeSfx === true;
        const signal = options.signal ?? null;

        if (includeSfx && (options.sfx || options.enrichment?.sfx))
        {
            throw new TypeError(
                "Audio SFX construction cannot combine includeSfx with a supplied sfx graph",
            );
        }
        if (options.onSfxDiagnostics !== undefined
            && typeof options.onSfxDiagnostics !== "function")
        {
            throw new TypeError(
                "Audio onSfxDiagnostics must be a function",
            );
        }
        const preliminaryOptions = {
            ...options,
            sfx: null,
            music: null,
            enrichment: options.enrichment
                ? {
                    ...options.enrichment,
                    sfx: null,
                }
                : options.enrichment,
        };
        let library = this.build(preliminaryOptions);

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

        const graphInspections = SelectLanguageInspections(
            inspections,
            eventMediaLanguage,
        );
        let eventMedia = {};

        if (!includeSfx)
        {
            const merged = this.createEventMediaGraphs(graphInspections, {
                knownWemIds: Object.keys(library.media),
                language: eventMediaLanguage,
            });

            eventMedia = this.createEventMediaTable(
                library.metadata,
                merged,
            );
        }
        const completeOptions = {
            ...options,
            music: includeMusic || options.music === false
                ? null
                : options.music,
            bankIdentities,
            eventMedia,
            eventMediaLanguage,
            embeddedMedia,
        };
        let assembledOptions = completeOptions;

        library = this.build(assembledOptions);

        if (includeSfx)
        {
            const sfx = this.createSfxGraph({
                inspections: graphInspections,
                metadata: library.metadata,
                soundbanksInfo: options.soundbanksInfo,
                enrichment: options.enrichment,
                media: library.media,
                embeddedMedia: library.embeddedMedia ?? {},
            });

            options.onSfxDiagnostics?.(sfx.diagnostics);

            if (Object.keys(sfx.events).length
                || Object.keys(sfx.programs).length)
            {
                assembledOptions = {
                    ...assembledOptions,
                    bankProjection: sfx.metadataProjection,
                    eventMedia: this.createSfxEventMediaTable(sfx),
                    sfx,
                };
                library = this.build(assembledOptions);
            }
        }

        if (includeMusic)
        {
            const music = this.createMusicGraph({
                inspections: inspections.filter(inspection =>
                    MUSIC_BANK_NAMES.includes(
                        bankSourceName(inspection.source),
                    )),
                eventInspections: graphInspections,
                metadata: library.metadata,
                media: library.media,
                embeddedMedia: library.embeddedMedia ?? {},
            });

            assembledOptions = {
                ...assembledOptions,
                music,
            };
            library = this.build(assembledOptions);
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
            bankProjection = null,
            enrichment = null,
            eventMedia = null,
            eventMediaLanguage = null,
            embeddedMedia = null,
            bankIdentities = null,
            sfx: sfxInput = null,
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
            bankProjection,
            enrichment,
        });
        const sfx = sfxInput ?? enrichment?.sfx ?? null;

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

        if (sfx !== null)
        {
            library.sfx = normalizeSfxGraph(
                sfx,
                library.media,
                library.embeddedMedia ?? {},
            );
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

        validateAudioLibraryDocument(library);
        return library;
    }

}

function LowerSfxGraph({
    parsed,
    eventNames,
    names,
    media,
    embeddedMedia,
})
{
    const nodes = {};
    const events = {};
    const programs = {};
    const lowered = new Map();
    const leavesByNode = new Map();
    const containsContinuousByNode = new Map();
    const leavesByEvent = new Map();
    const stopTargetsByEvent = new Map();
    const active = new Set();
    const omittedEvents = [];
    const usedIDs = new Set(
        [ ...parsed.nodes.keys() ].map(value => String(value >>> 0)),
    );
    let syntheticID = 0xffffffff;

    const allocate = (node) =>
    {
        while (syntheticID > 0 && usedIDs.has(String(syntheticID)))
        {
            syntheticID--;
        }
        if (syntheticID === 0)
        {
            throw new Error("Audio SFX construction exhausted node identities");
        }

        const id = String(syntheticID--);

        usedIDs.add(id);
        nodes[id] = node;
        return id;
    };

    const aggregate = (childIDs) =>
    {
        if (!childIDs.length)
        {
            return allocate({ type: "silence" });
        }
        if (childIDs.length === 1)
        {
            return childIDs[0];
        }
        return allocate({
            type: "parallel",
            children: childIDs.map(nodeId => ({ nodeId })),
        });
    };

    const aggregateRoots = (roots, force = false) =>
    {
        if (roots.length === 1 && !force)
        {
            return roots[0];
        }

        return {
            nodeId: allocate({
                type: "parallel",
                children: roots,
            }),
        };
    };

    const lower = (rawID) =>
    {
        const id = String(Number(rawID) >>> 0);

        if (lowered.has(id))
        {
            return lowered.get(id);
        }
        if (active.has(id))
        {
            throw new Error(`cycle at node ${id}`);
        }

        const source = parsed.nodes.get(Number(id));

        if (!source)
        {
            throw new Error(`missing typed node ${id}`);
        }

        active.add(id);

        try
        {
            let node;
            const leaves = new Set();
            let childContainsContinuous = false;
            const lowerChild = (childID) =>
            {
                const loweredID = lower(childID);
                const childKey = String(Number(childID) >>> 0);

                AddSet(leaves, leavesByNode.get(childKey));
                childContainsContinuous ||= Boolean(
                    containsContinuousByNode.get(childKey),
                );
                return loweredID;
            };

            if (source.type === "sound")
            {
                const mediaID = String(source.sourceId >>> 0);
                const loopCount = parsed.nodeBases
                    ?.get(Number(id))
                    ?.loopCount;
                const matchIds = CreateSfxMatchIds(parsed, id);

                if (source.pluginType !== 1)
                {
                    throw new Error(`source plug-in sound ${id}`);
                }
                if (!media[mediaID] && !embeddedMedia[mediaID])
                {
                    throw new Error(
                        `sound ${id} references unavailable media ${mediaID}`,
                    );
                }
                node = {
                    type: "sound",
                    mediaId: mediaID,
                    ...(matchIds.length > 1
                        ? { matchIds }
                        : {}),
                    ...(loopCount === 0
                        ? { loop: true }
                        : Number.isSafeInteger(loopCount) && loopCount > 0
                            ? {
                                loop: false,
                                playCount: loopCount,
                            }
                            : {}),
                };
                leaves.add(Number(id) >>> 0);
            }
            else if (source.type === "random"
                || source.type === "sequence")
            {
                if (source.restartBackward)
                {
                    throw new Error(`reverse sequence ${id}`);
                }
                if (source.continuous
                    && (source.loopModMin !== 0
                        || source.loopModMax !== 0))
                {
                    throw new Error(
                        `randomized continuous loop count ${id}`,
                    );
                }
                if (source.continuous && source.loopCount > 32767)
                {
                    throw new Error(
                        `continuous loop count exceeds 32767 at ${id}`,
                    );
                }
                if (source.continuous
                    && source.transitionMode !== 0
                    && source.transitionMode !== 3
                    && source.transitionMode !== 5)
                {
                    throw new Error(
                        `unsupported continuous transition ${source.transitionMode} at ${id}`,
                    );
                }
                if (source.continuous
                    && source.transitionMode === 5
                    && source.transitionTime
                        + source.transitionTimeModMin < 21)
                {
                    throw new Error(
                        `continuous trigger rate below 21ms at ${id}`,
                    );
                }

                const playlist = source.playlist.length
                    ? source.playlist
                    : source.children.map(playId => ({
                        playId,
                        weight: 1,
                    }));
                const children = [];

                for (const item of playlist)
                {
                    if (source.type === "random"
                        && source.usingWeight
                        && item.weight <= 0)
                    {
                        continue;
                    }

                    children.push({
                        nodeId: lowerChild(item.playId),
                        ...(source.type === "random" && source.usingWeight
                            ? { weight: item.weight }
                            : {}),
                    });
                }

                if (!children.length)
                {
                    throw new Error(`empty ${source.type} ${id}`);
                }
                if (source.continuous && childContainsContinuous)
                {
                    throw new Error(`nested continuous container ${id}`);
                }

                node = {
                    type: source.type,
                    // Wwise applies Continuous playback per game object even
                    // when the serialized container scope flag is global.
                    scope: source.continuous
                        ? "object"
                        : source.global
                            ? "global"
                            : "object",
                    children,
                    ...(source.type === "random"
                        ? {
                            mode: source.randomMode === 1
                                ? "shuffle"
                                : "random",
                            avoidRepeat: source.avoidRepeatCount,
                        }
                        : {}),
                    ...(source.continuous
                        ? {
                            continuous: {
                                loopCount: source.loopCount,
                                transition: source.transitionMode === 3
                                    ? "delay"
                                    : source.transitionMode === 5
                                        ? "trigger-rate"
                                        : "disabled",
                                ...(source.transitionMode === 3
                                    || source.transitionMode === 5
                                    ? {
                                        transitionMs:
                                            source.transitionTime,
                                        ...(
                                            source.transitionTimeModMin !== 0
                                            || source.transitionTimeModMax !== 0
                                                ? {
                                                    transitionRangeMs: {
                                                        min: source.transitionTimeModMin,
                                                        max: source.transitionTimeModMax,
                                                    },
                                                }
                                                : {}
                                        ),
                                    }
                                    : {}),
                                ...(source.type === "sequence"
                                    ? {
                                        resetPlaylistEachPlay:
                                            source.resetPlaylistEachPlay,
                                    }
                                    : {}),
                            },
                        }
                        : {}),
                };
            }
            else if (source.type === "switch")
            {
                if (source.continuousValidation)
                {
                    throw new Error(`continuous switch ${id}`);
                }
                // Step switches choose once per post, so their default Stop
                // mode is dormant; only live-continuation flags or fades
                // require the unsupported continuous-switch scheduler.
                if (source.parameters.some(parameter =>
                    parameter.firstOnly
                    || parameter.continuePlayback
                    || parameter.fadeOutMs !== 0
                    || parameter.fadeInMs !== 0))
                {
                    throw new Error(`transitioned switch ${id}`);
                }

                const scope = source.groupType === 1 ? "state" : "switch";
                const group = names.groups.get(
                    `${scope}:${source.groupId}`,
                );

                if (!group?.name)
                {
                    throw new Error(
                        `unnamed ${scope} group ${source.groupId}`,
                    );
                }

                const cases = {};
                let defaultChild = null;

                for (const assignment of source.assignments)
                {
                    const valueName = group.values.get(assignment.valueId);

                    if (!valueName)
                    {
                        throw new Error(
                            `unnamed ${scope} value ${assignment.valueId}`,
                        );
                    }
                    const child = aggregate(
                        assignment.childIds.map(lowerChild),
                    );

                    cases[valueName] = { nodeId: child };
                    if (assignment.valueId === source.defaultValueId)
                    {
                        defaultChild = child;
                    }
                }

                if (!Object.keys(cases).length)
                {
                    throw new Error(`empty switch ${id}`);
                }
                if (defaultChild === null)
                {
                    defaultChild = aggregate([]);
                }

                node = {
                    type: "switch",
                    scope,
                    group: group.name,
                    cases,
                    default: { nodeId: defaultChild },
                };
            }
            else if (source.type === "layer")
            {
                if (source.continuousValidation)
                {
                    throw new Error(`continuous layer ${id}`);
                }

                const children = source.children.map(nodeId => ({
                    nodeId: lowerChild(nodeId),
                }));
                const childByID = new Map(
                    source.children.map((childID, index) => [
                        Number(childID) >>> 0,
                        children[index],
                    ]),
                );
                let curveCount = 0;

                for (const layer of source.layers)
                {
                    const associations = layer.associations;

                    if (!associations.length)
                    {
                        continue;
                    }
                    if (layer.controlType !== 0
                        && associations.some(association =>
                            association.points.length))
                    {
                        throw new Error(
                            `unsupported layer control type ${layer.controlType}`,
                        );
                    }

                    const parameter = associations.some(association =>
                        association.points.length)
                        ? names.parameters.get(
                            Number(layer.controlId) >>> 0,
                        )
                        : null;

                    if (associations.some(association =>
                        association.points.length) && !parameter)
                    {
                        throw new Error(
                            `unnamed game parameter ${layer.controlId}`,
                        );
                    }

                    for (const association of associations)
                    {
                        const child = childByID.get(
                            Number(association.childId) >>> 0,
                        );

                        if (!child)
                        {
                            throw new Error(
                                `missing layer child ${association.childId}`,
                            );
                        }

                        if (association.points.length)
                        {
                            const points = association.points.map(point =>
                            {
                                if (point.to < 0 || point.to > 1)
                                {
                                    throw new Error(
                                        `invalid layer gain ${point.to}`,
                                    );
                                }
                                return {
                                    x: point.from,
                                    gain: point.to,
                                    interpolation: point.interpolation,
                                };
                            });

                            (child.gainCurves ??= []).push({
                                rtpc: parameter,
                                scope: "object",
                                points,
                            });
                            curveCount++;
                        }

                        for (const rtpc of layer.initialRtpcs)
                        {
                            const curve = CreateSfxRtpcCurve(
                                rtpc,
                                names,
                            );

                            if (!curve)
                            {
                                throw new Error(
                                    "unsupported layer RTPC property "
                                    + `${rtpc.parameterId}`,
                                );
                            }
                            (child.rtpcCurves ??= []).push(curve);
                        }
                    }
                }

                if (!children.length)
                {
                    throw new Error(`empty layer ${id}`);
                }

                node = {
                    type: curveCount ? "blend" : "parallel",
                    children,
                };
            }
            else
            {
                throw new Error(`unsupported node type ${source.type}`);
            }

            Object.assign(
                node,
                CreateSfxNodeBasePlaybackProjection(parsed, id, names),
            );
            nodes[id] = node;
            lowered.set(id, id);
            leavesByNode.set(id, leaves);
            containsContinuousByNode.set(
                id,
                childContainsContinuous
                    || node.continuous !== undefined,
            );
            return id;
        }
        finally
        {
            active.delete(id);
        }
    };

    const loweredEvents = new Map();
    const activeEvents = new Set();
    const lowerEvent = (rawID) =>
    {
        const eventID = Number(rawID) >>> 0;

        if (loweredEvents.has(eventID))
        {
            return loweredEvents.get(eventID);
        }
        if (activeEvents.has(eventID))
        {
            throw new Error(`Play-Event cycle at event ${eventID}`);
        }

        const event = parsed.events.get(eventID);

        if (!event)
        {
            throw new Error(`missing Play-Event target ${eventID}`);
        }

        const result = {
            roots: [],
            leaves: new Set(),
            stopTargets: new Set(),
            setters: [],
            program: [],
            unsupportedActions: [],
        };

        activeEvents.add(eventID);

        try
        {
            for (const actionID of event.actionIds)
            {
                const action = parsed.actions.get(actionID);

                if (!action)
                {
                    throw new Error(`missing action ${actionID}`);
                }
                if (SFX_UNSUPPORTED_PLAY_ACTIONS.has(action.actionType))
                {
                    throw new Error(
                        `unsupported play action 0x${action.actionType.toString(16)}`,
                    );
                }
                if (action.actionType === SFX_PLAY_ACTION)
                {
                    const child = ReadSfxPlayActionChild(
                        { nodeId: lower(action.targetId) },
                        action,
                        true,
                    );

                    result.roots.push(child);
                    result.program.push({
                        kind: "play",
                        child,
                    });
                    AddSet(
                        result.leaves,
                        leavesByNode.get(
                            String(Number(action.targetId) >>> 0),
                        ),
                    );
                }
                else if (action.actionType === SFX_PLAY_EVENT_ACTION)
                {
                    const nested = lowerEvent(action.targetId);
                    const hasTiming = HasSfxPlayActionTiming(
                        action,
                        false,
                    );

                    if (hasTiming
                        && (nested.setters.length
                            || nested.program.some(value =>
                                value.kind === "stop")))
                    {
                        throw new Error(
                            `scheduled Play-Event ${action.id} targets non-play actions`,
                        );
                    }
                    const actionChild = ReadSfxPlayActionChild(
                        nested.roots.length
                            ? aggregateRoots(nested.roots, hasTiming)
                            : null,
                        action,
                        false,
                    );

                    if (actionChild)
                    {
                        result.roots.push(actionChild);
                    }
                    if (hasTiming)
                    {
                        if (actionChild)
                        {
                            result.program.push({
                                kind: "play",
                                child: actionChild,
                            });
                        }
                    }
                    else
                    {
                        result.program.push(...nested.program);
                    }
                    AddSet(result.leaves, nested.leaves);
                    AddSet(result.stopTargets, nested.stopTargets);
                    result.setters.push(...nested.setters);
                    result.unsupportedActions.push(
                        ...nested.unsupportedActions,
                    );
                }
                else if (((action.actionType >> 8) & 0xff)
                    === SFX_STOP_ACTION_FAMILY)
                {
                    const stop = ReadSfxStopAction(action);

                    result.program.push(stop);
                    if (stop.mode === "element")
                    {
                        result.stopTargets.add(
                            Number(stop.targetId) >>> 0,
                        );
                    }
                }
                else if (((action.actionType >> 8) & 0xff)
                    === SFX_SET_SWITCH_ACTION_FAMILY
                    || ((action.actionType >> 8) & 0xff)
                    === SFX_SET_STATE_ACTION_FAMILY)
                {
                    if (HasSfxPlayActionTiming(action, false))
                    {
                        throw new Error(
                            `scheduled setter action ${action.id}`,
                        );
                    }
                    const setter = ReadSfxSetterAction(action, names);

                    result.setters.push(setter);
                    result.program.push(setter);
                }
                else
                {
                    result.unsupportedActions.push(action.actionType);
                }
            }

            result.roots = result.program
                .filter(action => action.kind === "play")
                .map(action => action.child);
            loweredEvents.set(eventID, result);
            return result;
        }
        finally
        {
            activeEvents.delete(eventID);
        }
    };

    for (const [ eventID, event ] of [ ...parsed.events.entries() ]
        .sort(([ left ], [ right ]) => left - right))
    {
        const name = eventNames.get(eventID >>> 0);

        if (!name || IsMusicEventName(name))
        {
            continue;
        }

        try
        {
            const {
                roots,
                leaves,
                stopTargets,
                setters,
                program,
                unsupportedActions,
            } = lowerEvent(eventID);

            if (stopTargets.size)
            {
                stopTargetsByEvent.set(name, stopTargets);
            }

            if (program.length)
            {
                if (unsupportedActions.length)
                {
                    throw new Error(
                        "mixed event actions "
                        + unsupportedActions
                            .map(value => `0x${value.toString(16)}`)
                            .join(", "),
                    );
                }
                if (roots.length)
                {
                    events[name] = roots;
                    leavesByEvent.set(name, leaves);
                }
                if (program.length)
                {
                    programs[name] = program;
                }
            }
        }
        catch (error)
        {
            omittedEvents.push({
                id: eventID,
                name,
                reason: error.message,
            });
        }
    }

    const spatial = CreateSfxSpatialProjection(
        parsed,
        leavesByEvent,
        nodes,
    );
    const stopRelationships = CreateSfxStopRelationships(
        parsed,
        leavesByEvent,
        stopTargetsByEvent,
    );
    const pruned = PruneSfxNodes(events, nodes);

    return {
        schemaVersion: 2,
        generator: "@carbonenginejs/runtime-audio/library-builder",
        events,
        programs,
        nodes: pruned,
        metadataProjection: {
            Events: MergeSfxEventMetadata(
                spatial.events,
                stopRelationships.events,
            ),
        },
        diagnostics: {
            parser: parsed.diagnostics,
            omittedEvents,
            stopRelationships: stopRelationships.diagnostics,
            spatial: spatial.diagnostics,
        },
    };
}

function HasSfxPlayActionTiming(action, includeFade)
{
    const details = action.action ?? action;

    return details.delayTimeMs !== undefined
        || details.delayRangeMs !== undefined
        || details.probability !== undefined
        || (includeFade
            && (details.transitionTimeMs !== undefined
                || details.transitionRangeMs !== undefined));
}

function ReadSfxPlayActionChild(child, action, includeFade)
{
    if (!child)
    {
        return null;
    }

    const details = action.action ?? action;
    const result = { ...child };

    if (details.delayTimeMs !== undefined)
    {
        result.delayMs = Number(details.delayTimeMs);
    }
    if (details.delayRangeMs !== undefined)
    {
        result.delayRangeMs = {
            min: Number(details.delayRangeMs.min),
            max: Number(details.delayRangeMs.max),
        };
    }
    if (details.probability !== undefined)
    {
        result.probability = Number(details.probability);
    }
    if (includeFade
        && (details.transitionTimeMs !== undefined
            || details.transitionRangeMs !== undefined))
    {
        if (details.transitionTimeMs !== undefined)
        {
            result.fadeInMs = Number(details.transitionTimeMs);
        }
        if (details.transitionRangeMs !== undefined)
        {
            result.fadeInRangeMs = {
                min: Number(details.transitionRangeMs.min),
                max: Number(details.transitionRangeMs.max),
            };
        }
        result.fadeCurve = Number(details.fadeCurve ?? 4);
    }

    return result;
}

function ReadSfxSetterAction(action, names)
{
    const family = (Number(action.actionType) >> 8) & 0xff;
    const scope = family === SFX_SET_SWITCH_ACTION_FAMILY
        ? "switch"
        : "state";
    const payload = action.payload instanceof Uint8Array
        ? action.payload
        : null;

    if (!payload || payload.byteLength < 8)
    {
        throw new Error(
            `truncated ${scope} setter action ${action.id}`,
        );
    }

    const view = new DataView(
        payload.buffer,
        payload.byteOffset,
        payload.byteLength,
    );
    const groupID = view.getUint32(payload.byteLength - 8, true);
    const valueID = view.getUint32(payload.byteLength - 4, true);
    const group = names.groups.get(`${scope}:${groupID}`);
    const value = group?.values.get(valueID);

    if (!group?.name)
    {
        throw new Error(`unnamed ${scope} group ${groupID}`);
    }
    if (!value)
    {
        throw new Error(`unnamed ${scope} value ${valueID}`);
    }

    return {
        kind: scope,
        group: group.name,
        value,
    };
}

function ReadSfxStopAction(action)
{
    const details = action.action ?? action;
    const actionType = Number(action.actionType) >>> 0;
    const targetFlags = Number(details.targetFlags ?? 0);
    const actionFlags = Number(details.actionFlags ?? 6);
    const mode = details.actionMode ?? SfxActionMode(actionType & 0xff);
    const scope = details.actionScope ?? SfxActionScope(actionType & 0xff);
    const targetId = Number(
        details.targetId ?? action.targetId,
    ) >>> 0;
    const exceptions = Array.isArray(details.exceptions)
        ? details.exceptions
        : [];

    if (details.targetIsBus || (targetFlags & 0x01))
    {
        throw new Error(`bus Stop action ${action.id}`);
    }
    if (mode !== "element"
        && mode !== "all"
        && mode !== "all-except")
    {
        throw new Error(`unsupported Stop mode ${mode}`);
    }
    if (scope !== "game-object" && scope !== "global")
    {
        throw new Error(`unsupported Stop scope ${scope}`);
    }
    if (mode === "element" && targetId === 0)
    {
        throw new Error(`empty Stop target ${action.id}`);
    }
    if (actionFlags !== 6)
    {
        throw new Error(
            `unsupported Stop action flags ${actionFlags}`,
        );
    }

    const normalizedExceptions = exceptions.map(exception =>
    {
        const exceptionFlags = Number(exception.targetFlags ?? 0);

        if (exception.targetIsBus || (exceptionFlags & 0x01))
        {
            throw new Error(`bus Stop exception ${action.id}`);
        }

        return {
            targetId: String(Number(exception.targetId) >>> 0),
            targetFlags: exceptionFlags,
        };
    });
    const result = {
        kind: "stop",
        targetId: String(targetId),
        targetFlags,
        scope,
        mode,
        curve: Number(details.fadeCurve ?? 4),
        actionFlags,
        exceptions: normalizedExceptions,
    };

    if (details.delayTimeMs !== undefined)
    {
        result.delayMs = Number(details.delayTimeMs);
    }
    if (details.delayRangeMs !== undefined)
    {
        result.delayRangeMs = {
            min: Number(details.delayRangeMs.min),
            max: Number(details.delayRangeMs.max),
        };
    }
    if (details.transitionTimeMs !== undefined)
    {
        result.transitionMs = Number(details.transitionTimeMs);
    }
    if (details.transitionRangeMs !== undefined)
    {
        result.transitionRangeMs = {
            min: Number(details.transitionRangeMs.min),
            max: Number(details.transitionRangeMs.max),
        };
    }

    return result;
}

function SfxActionMode(value)
{
    if (value === 0x02 || value === 0x03) return "element";
    if (value === 0x04 || value === 0x05) return "all";
    if (value === 0x08 || value === 0x09) return "all-except";
    return "unknown";
}

function SfxActionScope(value)
{
    if (value === 0x02 || value === 0x04 || value === 0x08)
    {
        return "global";
    }
    if (value === 0x03 || value === 0x05 || value === 0x09)
    {
        return "game-object";
    }
    return "unknown";
}

function CreateSfxMatchIds(parsed, rawID)
{
    const result = [];
    const active = new Set();
    let current = Number(rawID) >>> 0;

    while (current && !active.has(current))
    {
        active.add(current);
        result.push(String(current));
        current = Number(
            parsed.nodeBases?.get(current)?.directParentId,
        ) >>> 0;
    }

    return result;
}

function CreateSfxStopRelationships(
    parsed,
    leavesByEvent,
    stopTargetsByEvent,
)
{
    const events = {};
    const projected = [];
    const unresolved = [];
    const ancestry = new Map();

    const ancestors = (leafID) =>
    {
        const leaf = Number(leafID) >>> 0;

        if (ancestry.has(leaf))
        {
            return ancestry.get(leaf);
        }

        const result = new Set();
        const active = new Set();
        let current = leaf;

        while (current && !active.has(current))
        {
            active.add(current);
            result.add(current);

            const parent = Number(
                parsed.nodeBases?.get(current)?.directParentId,
            ) >>> 0;

            current = parent;
        }

        ancestry.set(leaf, result);
        return result;
    };

    const stopEntries = [ ...stopTargetsByEvent.entries() ]
        .sort(([ left ], [ right ]) => compareText(left, right));

    for (const [ stoppingName, targets ] of stopEntries)
    {
        const matchedTargets = new Set();

        for (const [ stoppedName, leaves ] of [ ...leavesByEvent.entries() ]
            .sort(([ left ], [ right ]) => compareText(left, right)))
        {
            const stops = [ ...targets ].some(target =>
            {
                for (const leaf of leaves)
                {
                    if (ancestors(leaf).has(target))
                    {
                        matchedTargets.add(target);
                        return true;
                    }
                }
                return false;
            });

            if (!stops)
            {
                continue;
            }

            const record = events[stoppedName]
                ?? (events[stoppedName] = { eventsStoppedBy: [] });

            record.eventsStoppedBy.push(stoppingName);
            projected.push({
                stopped: stoppedName,
                stopping: stoppingName,
            });
        }

        for (const targetId of [ ...targets ].sort((left, right) => left - right))
        {
            if (!matchedTargets.has(targetId))
            {
                unresolved.push({
                    event: stoppingName,
                    targetId,
                });
            }
        }
    }

    return {
        events,
        diagnostics: {
            projected,
            unresolved,
        },
    };
}

function MergeSfxEventMetadata(...projections)
{
    const names = new Set();

    for (const projection of projections)
    {
        for (const name of Object.keys(projection ?? {}))
        {
            names.add(name);
        }
    }

    const result = {};

    for (const name of [ ...names ].sort(compareText))
    {
        result[name] = Object.assign(
            {},
            ...projections.map(projection => projection?.[name] ?? {}),
        );
    }

    return result;
}

function CreateSfxEventMediaTable(sfx)
{
    const events = sfx?.events;
    const nodes = sfx?.nodes;

    if (!events || typeof events !== "object"
        || Array.isArray(events)
        || !nodes || typeof nodes !== "object"
        || Array.isArray(nodes))
    {
        throw new TypeError(
            "Authored SFX event-media projection requires events and nodes",
        );
    }

    const table = {};

    for (const eventName of Object.keys(events).sort())
    {
        const pending = (events[eventName] ?? [])
            .map(child => String(child?.nodeId ?? child));
        const visited = new Set();
        const media = new Set();

        while (pending.length)
        {
            const id = pending.pop();

            if (visited.has(id))
            {
                continue;
            }
            visited.add(id);

            const node = nodes[id];

            if (!node)
            {
                throw new TypeError(
                    `Authored SFX event ${eventName} references missing node ${id}`,
                );
            }
            if (node.type === "sound")
            {
                media.add(String(node.mediaId));
                continue;
            }
            for (const child of SfxNodeChildren(node))
            {
                pending.push(String(child?.nodeId ?? child));
            }
        }

        if (media.size)
        {
            table[eventName] = [ ...media ].sort(
                (left, right) => Number(left) - Number(right),
            );
        }
    }

    return table;
}

function SfxNodeChildren(node)
{
    if (node.type === "switch")
    {
        return [
            ...Object.values(node.cases ?? {}),
            ...(node.default === undefined || node.default === null
                ? []
                : [ node.default ]),
        ];
    }

    return node.children ?? [];
}

function CreateSfxSpatialProjection(parsed, leavesByEvent, nodes)
{
    const cache = new Map();
    const active = new Set();
    const events = {};
    const projected = [];
    const omitted = [];

    const resolve = (rawID) =>
    {
        const id = Number(rawID) >>> 0;

        if (cache.has(id))
        {
            return cache.get(id);
        }
        if (active.has(id))
        {
            return {
                known: false,
                reason: `positioning parent cycle at ${id}`,
            };
        }

        const nodeBase = parsed.nodeBases?.get(id);

        if (!nodeBase)
        {
            const result = {
                known: false,
                reason: `missing NodeBase ${id}`,
            };

            cache.set(id, result);
            return result;
        }

        active.add(id);

        let result;

        try
        {
            if (nodeBase.positioning?.overrideParent)
            {
                result = {
                    known: true,
                    // Carbon's generated is2D metadata follows the resolved
                    // positioning owner's attenuation assignment, not merely
                    // Wwise's listener-relative-routing bit. A v150
                    // Common+Effects+Modules corpus comparison matched the
                    // source audio metadata for every fully lowered event.
                    is2D: nodeBase.attenuationId === null
                        || nodeBase.attenuationId === 0,
                };
            }
            else
            {
                const parentId = Number(nodeBase.directParentId) >>> 0;

                result = parentId
                    ? resolve(parentId)
                    : {
                        known: false,
                        reason: `NodeBase ${id} inherits from no serialized parent`,
                    };
            }
        }
        finally
        {
            active.delete(id);
        }

        cache.set(id, result);
        return result;
    };

    for (const [ name, leafSet ] of leavesByEvent)
    {
        const leafIds = [ ...leafSet ].sort((left, right) => left - right);
        const resolved = leafIds.map(resolve);
        const unknown = resolved
            .filter(value => !value.known)
            .map(value => value.reason);

        for (let index = 0; index < leafIds.length; index++)
        {
            const result = resolved[index];
            const node = nodes[String(leafIds[index])];

            if (result.known && node?.type === "sound")
            {
                node.spatial = !result.is2D;
            }
        }

        if (!leafIds.length || unknown.length)
        {
            omitted.push({
                name,
                leafIds,
                reasons: [ ...new Set(
                    unknown.length ? unknown : [ "event has no playable leaves" ],
                ) ],
            });
            continue;
        }

        const is2D = resolved.every(value => value.is2D) ? 1 : 0;

        events[name] = { is2D };
        projected.push({ name, leafIds, is2D });
    }

    return {
        events,
        diagnostics: {
            projected,
            omitted,
        },
    };
}

function AddSet(target, source)
{
    for (const value of source ?? [])
    {
        target.add(value);
    }
}

function CreateSfxNodeBasePlaybackProjection(parsed, rawID, names)
{
    const chain = [];
    const visited = new Set();
    let currentID = Number(rawID) >>> 0;

    while (currentID && !visited.has(currentID))
    {
        visited.add(currentID);

        const nodeBase = parsed.nodeBases?.get(currentID);

        if (!nodeBase)
        {
            break;
        }
        chain.push(nodeBase);

        const parentID = Number(nodeBase.directParentId) >>> 0;

        if (!parentID || parsed.nodes.has(parentID))
        {
            break;
        }
        currentID = parentID;
    }

    let gainDb = 0;
    let pitchCents = 0;
    let lowPass = 0;
    let highPass = 0;
    let initialDelayMs = 0;
    const gainDbRanges = [];
    const pitchCentsRanges = [];
    const lowPassRanges = [];
    const highPassRanges = [];
    const initialDelayRangesMs = [];
    const rtpcCurves = [];
    const stateProperties = [];

    for (const nodeBase of chain.reverse())
    {
        for (const property of nodeBase.properties ?? [])
        {
            const value = Number(property.floatValue);

            if (!Number.isFinite(value))
            {
                continue;
            }
            if (property.id === SFX_VOLUME_PROPERTY)
            {
                gainDb += value;
            }
            else if (property.id === SFX_PITCH_PROPERTY)
            {
                pitchCents += value;
            }
            else if (property.id === SFX_LOW_PASS_PROPERTY)
            {
                lowPass += value;
            }
            else if (property.id === SFX_HIGH_PASS_PROPERTY)
            {
                highPass += value;
            }
            else if (property.id === SFX_INITIAL_DELAY_PROPERTY)
            {
                initialDelayMs += value * 1000;
            }
        }

        for (const range of nodeBase.ranges ?? [])
        {
            const min = Number(range.minFloat);
            const max = Number(range.maxFloat);

            if (!Number.isFinite(min) || !Number.isFinite(max))
            {
                continue;
            }

            if (range.id === SFX_VOLUME_PROPERTY)
            {
                gainDbRanges.push({ min, max });
            }
            else if (range.id === SFX_PITCH_PROPERTY)
            {
                pitchCentsRanges.push({ min, max });
            }
            else if (range.id === SFX_LOW_PASS_PROPERTY)
            {
                lowPassRanges.push({ min, max });
            }
            else if (range.id === SFX_HIGH_PASS_PROPERTY)
            {
                highPassRanges.push({ min, max });
            }
            else if (range.id === SFX_INITIAL_DELAY_PROPERTY)
            {
                initialDelayRangesMs.push({
                    min: min * 1000,
                    max: max * 1000,
                });
            }
        }

        for (const rtpc of nodeBase.rtpcs ?? [])
        {
            const curve = CreateSfxRtpcCurve(rtpc, names);

            if (curve)
            {
                rtpcCurves.push(curve);
            }
        }

        for (const group of nodeBase.state?.groups ?? [])
        {
            const activeStates = group.states?.filter(state =>
                state.values?.length) ?? [];

            if (!activeStates.length)
            {
                continue;
            }

            const namedGroup = names.groups.get(
                `state:${Number(group.groupId) >>> 0}`,
            );
            const definitions = new Map(
                (nodeBase.state?.properties ?? []).map(property => [
                    Number(property.propertyId),
                    property,
                ]),
            );
            const cases = {};

            if (group.syncType !== SFX_IMMEDIATE_STATE_SYNC
                || !namedGroup?.name)
            {
                throw new Error(
                    group.syncType !== SFX_IMMEDIATE_STATE_SYNC
                        ? `non-Immediate state group ${group.groupId}`
                        : `unnamed state group ${group.groupId}`,
                );
            }

            for (const state of activeStates)
            {
                const stateName = namedGroup.values.get(
                    Number(state.stateId) >>> 0,
                );
                let stateGainDb = 0;
                let statePitchCents = 0;
                let stateLowPass = 0;
                let stateHighPass = 0;

                if (!stateName)
                {
                    throw new Error(
                        `unnamed state value ${state.stateId}`,
                    );
                }

                for (const value of state.values)
                {
                    const propertyID = Number(value.propertyId);
                    const definition = definitions.get(propertyID);
                    const isFilter = propertyID === SFX_LOW_PASS_PROPERTY
                        || propertyID === SFX_HIGH_PASS_PROPERTY;

                    if (!definition
                        || (propertyID !== SFX_VOLUME_PROPERTY
                            && propertyID !== SFX_PITCH_PROPERTY
                            && !isFilter)
                        || definition.accumulation !== (
                            isFilter
                                ? SFX_FILTER_ACCUMULATION
                                : SFX_ADDITIVE_ACCUMULATION
                        ))
                    {
                        throw new Error(
                            `unsupported state property ${propertyID}`,
                        );
                    }
                    if (propertyID === SFX_VOLUME_PROPERTY)
                    {
                        stateGainDb += Number(value.value);
                    }
                    else
                    {
                        if (propertyID === SFX_PITCH_PROPERTY)
                        {
                            statePitchCents += Number(value.value);
                        }
                        else if (propertyID === SFX_LOW_PASS_PROPERTY)
                        {
                            stateLowPass += Number(value.value);
                        }
                        else
                        {
                            stateHighPass += Number(value.value);
                        }
                    }
                }
                if (stateGainDb !== 0
                    || statePitchCents !== 0
                    || stateLowPass !== 0
                    || stateHighPass !== 0)
                {
                    cases[stateName] = {
                        ...(stateGainDb === 0 ? {} : {
                            gainDb: stateGainDb,
                        }),
                        ...(statePitchCents === 0 ? {} : {
                            pitchCents: statePitchCents,
                        }),
                        ...(stateLowPass === 0 ? {} : {
                            lowPass: stateLowPass,
                        }),
                        ...(stateHighPass === 0 ? {} : {
                            highPass: stateHighPass,
                        }),
                    };
                }
            }

            if (Object.keys(cases).length)
            {
                stateProperties.push({
                    group: namedGroup.name,
                    cases,
                });
            }
        }
    }

    return {
        ...(gainDb === 0 ? {} : { gainDb }),
        ...(gainDbRanges.length ? { gainDbRanges } : {}),
        ...(pitchCents === 0 ? {} : { pitchCents }),
        ...(pitchCentsRanges.length ? { pitchCentsRanges } : {}),
        ...(lowPass === 0 ? {} : { lowPass }),
        ...(lowPassRanges.length ? { lowPassRanges } : {}),
        ...(highPass === 0 ? {} : { highPass }),
        ...(highPassRanges.length ? { highPassRanges } : {}),
        ...(initialDelayMs === 0 ? {} : { initialDelayMs }),
        ...(initialDelayRangesMs.length
            ? { initialDelayRangesMs }
            : {}),
        ...(rtpcCurves.length ? { rtpcCurves } : {}),
        ...(stateProperties.length
            ? { stateProperties }
            : {}),
    };
}

function CreateSfxRtpcCurve(rtpc, names)
{
    const propertyID = Number(rtpc.parameterId);
    const definitions = {
        [SFX_VOLUME_PROPERTY]: {
            property: "volume",
            accumulation: SFX_ADDITIVE_ACCUMULATION,
            scaling: 2,
        },
        [SFX_PITCH_PROPERTY]: {
            property: "pitch",
            accumulation: SFX_ADDITIVE_ACCUMULATION,
            scaling: 0,
        },
        [SFX_LOW_PASS_PROPERTY]: {
            property: "lowPass",
            accumulation: SFX_FILTER_ACCUMULATION,
            scaling: 0,
        },
        [SFX_HIGH_PASS_PROPERTY]: {
            property: "highPass",
            accumulation: SFX_FILTER_ACCUMULATION,
            scaling: 0,
        },
        [SFX_INITIAL_DELAY_PROPERTY]: {
            property: "initialDelay",
            accumulation: SFX_ADDITIVE_ACCUMULATION,
            scaling: 0,
        },
    };
    const definition = definitions[propertyID];

    if (Number(rtpc.controlType) !== 0 || !definition)
    {
        return null;
    }

    const controlID = Number(rtpc.controlId) >>> 0;
    const parameter = names.parameters.get(controlID);
    const defaultValue = names.parameterDefaults.get(controlID);

    if (!rtpc.points?.length)
    {
        throw new Error(
            `empty ${definition.property} RTPC curve ${rtpc.curveId}`,
        );
    }
    if (Number(rtpc.accumulation) !== definition.accumulation)
    {
        throw new Error(
            `unsupported RTPC accumulation ${rtpc.accumulation}`,
        );
    }
    if (Number(rtpc.scaling) !== definition.scaling)
    {
        throw new Error(
            `unsupported ${definition.property} RTPC scaling ${rtpc.scaling}`,
        );
    }
    if (!parameter)
    {
        throw new Error(
            `unnamed game parameter ${rtpc.controlId}`,
        );
    }

    let previous = -Infinity;
    const points = rtpc.points.map(point =>
    {
        const x = Number(point.from);
        const value = Number(point.to);
        const interpolation = Number(point.interpolation);

        if (!Number.isFinite(x) || !Number.isFinite(value))
        {
            throw new Error(
                `non-finite RTPC curve ${rtpc.curveId}`,
            );
        }
        if (!Number.isSafeInteger(interpolation)
            || interpolation < 0
            || interpolation > 9)
        {
            throw new Error(
                `invalid RTPC interpolation ${rtpc.curveId}`,
            );
        }
        if (x < previous)
        {
            throw new Error(
                `unsorted RTPC curve ${rtpc.curveId}`,
            );
        }
        previous = x;
        return {
            x,
            value,
            interpolation,
        };
    });

    return {
        rtpc: parameter,
        scope: "object",
        property: definition.property,
        scaling: definition.scaling,
        ...(defaultValue === undefined
            ? {}
            : { defaultValue }),
        points,
    };
}

function CreateSfxNameCatalog(soundbanksInfo, enrichment)
{
    const groups = new Map();
    const parameters = new Map();
    const parameterDefaults = new Map();

    if (soundbanksInfo)
    {
        const parsed = CjsBnkFormat.wwise.parseSoundbanksInfo(
            soundbanksInfo,
        );

        for (const bank of parsed.banks)
        {
            for (const [ scope, entries, valuesField ] of [
                [ "switch", bank.switchGroups, "switches" ],
                [ "state", bank.stateGroups, "states" ],
            ])
            {
                for (const entry of entries)
                {
                    const key = `${scope}:${Number(entry.id) >>> 0}`;
                    const group = groups.get(key) ?? {
                        name: entry.name,
                        values: new Map(),
                    };

                    for (const value of entry[valuesField])
                    {
                        group.values.set(
                            Number(value.id) >>> 0,
                            value.name,
                        );
                    }
                    groups.set(key, group);
                }
            }

            for (const parameter of bank.gameParameters)
            {
                parameters.set(
                    Number(parameter.id) >>> 0,
                    parameter.name,
                );
            }
        }
    }

    if (enrichment?.gameParameters !== undefined)
    {
        for (const [ rawID, value ] of metadataEntries(
            enrichment.gameParameters,
            "Audio enrichment gameParameters",
        ))
        {
            const id = NormalizeGameParameterID(rawID);

            if (!value
                || typeof value !== "object"
                || Array.isArray(value))
            {
                throw new TypeError(
                    `Audio enrichment gameParameters.${rawID}`
                    + " must be an object",
                );
            }

            if (value.name !== undefined)
            {
                const name = String(value.name).trim();

                if (!name)
                {
                    throw new TypeError(
                        `Audio enrichment gameParameters.${rawID}`
                        + " name must be non-empty",
                    );
                }

                const existing = parameters.get(id);

                if (existing && existing !== name)
                {
                    throw new TypeError(
                        `Audio enrichment gameParameters.${rawID}`
                        + ` name conflicts with ${existing}`,
                    );
                }
                parameters.set(id, name);
            }

            if (value.defaultValue !== undefined)
            {
                const defaultValue = Number(value.defaultValue);

                if (!Number.isFinite(defaultValue))
                {
                    throw new TypeError(
                        `Audio enrichment gameParameters.${rawID}`
                        + " defaultValue must be finite",
                    );
                }
                parameterDefaults.set(id, defaultValue);
            }
        }
    }

    return { groups, parameters, parameterDefaults };
}

function NormalizeGameParameterID(value)
{
    const text = String(value);
    const number = Number(text);

    if (!/^(?:0|[1-9]\d*)$/u.test(text)
        || !Number.isSafeInteger(number)
        || number < 0
        || number > 0xffffffff)
    {
        throw new TypeError(
            `Audio enrichment game parameter ID ${text} must be uint32`,
        );
    }

    return number >>> 0;
}

function IsMusicEventName(name)
{
    return String(name).toLowerCase().startsWith("music_");
}

function PruneSfxNodes(events, nodes)
{
    const reachable = new Set();
    const visit = (child) =>
    {
        const id = String(
            child && typeof child === "object"
                ? child.nodeId
                : child,
        );

        if (reachable.has(id) || !nodes[id])
        {
            return;
        }
        reachable.add(id);

        const node = nodes[id];

        if (node.type === "switch")
        {
            for (const value of Object.values(node.cases)) visit(value);
            if (node.default) visit(node.default);
        }
        else
        {
            for (const value of node.children ?? []) visit(value);
        }
    };

    for (const roots of Object.values(events))
    {
        for (const root of roots) visit(root);
    }

    const result = {};

    for (const id of [ ...reachable ].sort((left, right) =>
        Number(left) - Number(right)))
    {
        result[id] = nodes[id];
    }
    return result;
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
    const bankVersion = Number(normalizeUnsignedID(
        value.bankVersion ?? 0,
        `Audio bank ${bank.resPath} inspected bankVersion`,
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
        bankVersion,
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
    const missing = MUSIC_BANK_NAMES.filter(name => !names.has(name));

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

function createAudioMetadata({
    metadata,
    soundbanksInfo,
    bankProjection = null,
    enrichment,
})
{
    let result = {
        Events: {},
        SoundBanks: {},
        WemFileIDs: {},
    };
    let hasBase = false;

    if (soundbanksInfo !== null && soundbanksInfo !== undefined)
    {
        result = normalizeAudioMetadata(
            audioMetadataFromSoundbanksInfo(soundbanksInfo),
            "SoundbanksInfo metadata",
        );
        hasBase = true;
    }

    if (bankProjection !== null && bankProjection !== undefined)
    {
        result = mergeAudioMetadata(
            result,
            normalizeAudioMetadata(
                bankProjection,
                "bank-derived audio metadata",
                { partial: true },
            ),
        );
    }

    if (metadata !== null && metadata !== undefined)
    {
        result = mergeAudioMetadata(
            result,
            normalizeAudioMetadata(metadata, "audio metadata", {
                partial: hasBase,
            }),
        );
        hasBase = true;
    }

    if (!hasBase)
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

function SelectLanguageInspections(inspections, language)
{
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
        return shared.sort(compareBankInspections);
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

    return selected.sort(compareBankInspections);
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

function createMusicEventProjection(inspections, metadata, nodes)
{
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
    const musicGroups = MusicArgumentGroups(nodes);

    for (const inspection of inspections)
    {
        const actionsByID = new Map();
        const eventsByID = new Map();

        for (const entry of inspection.hirc ?? [])
        {
            if (entry.typeName === "event-action")
            {
                actionsByID.set(entry.id, entry);
            }
            else if (entry.typeName === "event")
            {
                eventsByID.set(entry.id, entry);
            }
        }

        for (const [ eventID, event ] of eventsByID)
        {
            const name = eventNamesByID.get(eventID >>> 0);

            if (!name)
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
                    const setter = ReadMusicSetterAction(
                        fields,
                        actionID,
                        family,
                    );

                    if (musicGroups.has(setter.groupId))
                    {
                        const values = switchSetters[name]
                            ?? (switchSetters[name] = []);

                        values.push(setter);
                    }
                }
            }
        }
    }

    return {
        eventTargets: normalizeTargetTable(eventTargets),
        eventStops: normalizeTargetTable(eventStops),
        switchSetters: normalizeSetterTable(switchSetters),
    };
}

function MusicArgumentGroups(nodes)
{
    const result = new Set();

    for (const node of Object.values(nodes))
    {
        for (const argument of node.argumentGroups ?? [])
        {
            result.add(Number(argument.groupId) >>> 0);
        }

        if (node.switchParams?.groupId !== undefined)
        {
            result.add(Number(node.switchParams.groupId) >>> 0);
        }
    }

    return result;
}

function ReadMusicSetterAction(fields, actionID, family)
{
    // runtime-resource types the action family and target. Wwise does not yet
    // expose SetSwitch/SetState's two tail IDs, so this is the deliberately
    // narrow remaining payload read.
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

    return {
        kind: family === 0x19 ? "switch" : "state",
        groupId: view.getUint32(fields.payload.byteLength - 8, true),
        targetId: view.getUint32(fields.payload.byteLength - 4, true),
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
