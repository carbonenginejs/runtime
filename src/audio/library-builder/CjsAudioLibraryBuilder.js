import { CjsSchema } from "#schema";

import { throwIfAborted } from "#utils/errors";

// Browser-safe audio-library construction. The high-level resource seam reads
// through be.resMan by default and accepts an injected byte source for
// local/tool callers.
import { audioMetadataFromSoundbanksInfo } from "../audioMetadata.js";
import { validateAudioLibraryDocument } from "../library/audioLibraryDocument.js";
import { CjsAudioLibrary } from "../library/CjsAudioLibrary.js";
import {
    normalizeSfxGraph,
    NormalizeStateTransitions,
} from "../library/sfxGraph.js";
import { CjsBnkFormat } from "#resource/formats/bnk";
import { normalizeBusGraphCatalog } from "../internal/busGraph.js";
import {
    createAudioResourceReader,
    decodeAudioResourceJson,
    decodeAudioResourceText,
} from "./resourceSource.js";
import {
    PARAMETRIC_EQ_PLUGIN_ID,
    WWISE_DELAY_PLUGIN_ID,
    WWISE_COMPRESSOR_PLUGIN_ID,
    WWISE_PEAK_LIMITER_PLUGIN_ID,
    WWISE_FLANGER_PLUGIN_ID,
    WWISE_GUITAR_DISTORTION_PLUGIN_ID,
    WWISE_METER_PLUGIN_ID,
    WWISE_MATRIX_REVERB_PLUGIN_ID,
    WWISE_ROOMVERB_PLUGIN_ID,
    WWISE_TREMOLO_PLUGIN_ID,
    parseGraphSharedBusEffect,
    parseStaticParametricEqBytes,
    parseStaticWwiseDelayBytes,
    parseStaticWwiseFlangerBytes,
    parseStaticWwiseGuitarDistortionBytes,
    parseStaticWwiseMeterBytes,
    parseStaticWwiseMatrixReverbBytes,
    parseStaticWwiseRoomVerbBytes,
    parseStaticWwiseTremoloBytes,
} from "../internal/busEffects.js";
import { CjsAudioLibraryBuilderUtils, SFX_VOLUME_PROPERTY, BUS_RTPC_PROPERTIES, SFX_ADDITIVE_ACCUMULATION, SFX_FILTER_ACCUMULATION } from "./CjsAudioLibraryBuilderUtils.js";
import { CjsAudioLibraryBuilderWwiseNodeBaseAncestry } from "./CjsAudioLibraryBuilderWwiseNodeBaseAncestry.js";
import { CjsAudioLibraryBuilderBankInspectionSession } from "./CjsAudioLibraryBuilderBankInspectionSession.js";
import { CjsAudioLibraryBuilderSfxNodeLoweringSession } from "./CjsAudioLibraryBuilderSfxNodeLoweringSession.js";
import { CjsAudioLibraryBuilderSfxEventLoweringSession } from "./CjsAudioLibraryBuilderSfxEventLoweringSession.js";
import { CjsAudioLibraryBuilderSfxNameCatalogAccumulator } from "./CjsAudioLibraryBuilderSfxNameCatalogAccumulator.js";
import { CjsAudioLibraryBuilderBusGraphConstructionSession } from "./CjsAudioLibraryBuilderBusGraphConstructionSession.js";

const MUSIC_BANK_NAMES = [ "music.bnk", "music_essential.bnk" ];
const AUTO_MUSIC_BANK_NAMES = [ "common.bnk", ...MUSIC_BANK_NAMES ];
const MUSIC_HIRC_TYPES = new Set([ 10, 11, 12, 13 ]);
const EFFECT_HIRC_TYPES = new Set([ 16, 17 ]);

const BUS_PITCH_STATE_PROPERTY = 1;
const BUS_LOW_PASS_STATE_PROPERTY = 2;
const BUS_HIGH_PASS_STATE_PROPERTY = 3;
const BUS_VOLUME_STATE_PROPERTY = 4;
const BUS_STATE_FIELDS = new Map([
    [ BUS_PITCH_STATE_PROPERTY, "pitchCents" ],
    [ BUS_LOW_PASS_STATE_PROPERTY, "lowPass" ],
    [ BUS_HIGH_PASS_STATE_PROPERTY, "highPass" ],
    [ BUS_VOLUME_STATE_PROPERTY, "gainDb" ],
]);
const DUCK_VOICE_VOLUME_PROPERTY = 0;
const DUCK_BUS_VOLUME_PROPERTY = 4;

const AUDIO_LANGUAGE_TAGS = {
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
};
/**
 * Builds a deterministic schema-v2 audio-library document from caller-supplied
 * values and bank access.
 *
 * Every bank is keyed by its `bankID:languageID` pair, so localized variants
 * of one bank stay distinct; each keeps the canonical BCP-47 `language` beside
 * the SoundbanksInfo `authoredLanguage`. A media ID repeated across loose files
 * (`media`) or across banks (`embeddedMedia`) keeps every source variant; an
 * embedded member whose ID is already loose is not recorded. `embeddedMedia` and `eventMedia` (with
 * the `eventMediaLanguage` that selected its graph) exist only after bank
 * inspection; `build()` alone yields a source catalog, not an
 * event-to-playable-media index.
 */
export class CjsAudioLibraryBuilder
{

    static schema = "carbonenginejs.audioLibrary";

    static schemaVersion = 2;

    /** Hydrates the deterministic document produced by build(). */
    static buildLibrary(options = {})
    {
        return CjsAudioLibrary.from(this.build(options));
    }

    /**
     * Builds a hydrated library from raw resources through be.resMan by
     * default or one caller-supplied byte source.
     *
     * `source.read(path, context)` replaces be.resMan. Each input has a path
     * override and a value option that skips its read:
     * - audio metadata FSD: read only when the caller supplies
     *   `audioMetadataReader`, a cFSD dataset reader such as a
     *   `CjsFsd64SchemaReader` subclass instance whose `constructor.path` is
     *   the logical path (`res:/staticdata/audiometadata.fsdbinary`). The
     *   runtime ships no such reader. `audioMetadataPath` overrides where the
     *   bytes are read from; they are still decoded under the reader's logical
     *   path, which the read context carries as `logicalPath`. `metadata`
     *   supplies decoded metadata and skips the read;
     * - resource index: `indexPath` (no default) or `indexEntries`;
     * - SoundbanksInfo: `soundbanksInfoPath` (default
     *   `res:/audio/soundbanksinfo.json` without an index, otherwise found in
     *   the index) or `soundbanksInfo`.
     *
     * Without `audioMetadataReader` or `metadata`, no FSD is read and the
     * metadata is built from SoundbanksInfo alone. Passing
     * `audioMetadataPath` or `fsdOptions` without a reader throws
     * `CJS_FSD_READER_REQUIRED`.
     *
     * The index is optional. Without one, banks and streamed media are
     * derived from SoundbanksInfo plus the metadata `IsEssential` flag (all
     * streamed media resolve under `media/` when no FSD metadata is read); an
     * index still contributes storage paths, checksums and byte lengths.
     * `inspectBanks: false` returns the catalog without opening banks.
     * `includeSfx` defaults to true here; `music` defaults to on when
     * `common.bnk`, `music.bnk` and `music_essential.bnk` are all indexed. `fsdOptions: { bitWidth: 32 }` selects
     * legacy FSD, whose reader throws as unsupported. The builder never
     * discovers installations, selects providers, touches caches or uses the
     * Node filesystem.
     *
     * @param {object} [options={}] Builder, resource and FSD options.
     * @param {{Read: Function, ReadJSON: Function, constructor: {path: string}}} [options.audioMetadataReader] Caller-supplied audio metadata cFSD reader.
     * @param {object} [options.metadata] Decoded audio metadata; skips the FSD read.
     * @param {string} [options.audioMetadataPath] Where the audio metadata FSD bytes are read from.
     * @param {object} [options.fsdOptions] Extra options for the FSD format read.
     * @returns {Promise<CjsAudioLibrary>} The hydrated library.
     * @throws {TypeError} `CJS_FSD_READER_REQUIRED` when FSD options are given without a reader.
     */
    static async buildFromResources(options = {})
    {
        RequireBuilderOptions(options);

        const read = createAudioResourceReader(options);
        const signal = options.signal ?? null;
        const metadataReader = options.audioMetadataReader ?? null;

        if (metadataReader === null
            && options.metadata === undefined
            && (options.audioMetadataPath !== undefined || options.fsdOptions !== undefined))
        {
            const error = new TypeError(
                "Audio metadata FSD options require options.audioMetadataReader; the runtime ships no FSD schemas.",
            );

            error.code = "CJS_FSD_READER_REQUIRED";
            throw error;
        }

        const resolvedIndexEntries = await ResolveResourceIndexEntries(
            options,
            read,
            signal,
        );
        const metadata = options.metadata
            ?? await ReadAudioMetadataFsd(options, metadataReader, read, signal);
        const soundbanksInfo = await ResolveSoundbanksInfo(
            options,
            resolvedIndexEntries,
            read,
            signal,
        );
        const indexEntries = resolvedIndexEntries
            ?? DeriveDefaultPathIndexEntries(soundbanksInfo, metadata);
        const buildOptions = OmitResourceOptions(options);

        // Catalog-only builds still decode the FSD metadata when a reader is
        // supplied, but do not open every Wwise bank. Tools can use this path for a
        // compact prepared payload and opt into graph inspection separately.
        if (options.inspectBanks === false)
        {
            return this.buildLibrary({
                ...buildOptions,
                indexEntries,
                metadata,
                music: options.music === false ? null : options.music,
                ...(soundbanksInfo === undefined ? {} : { soundbanksInfo }),
            });
        }

        const availableBankNames = new Set(indexEntries
            .map(entry => CjsAudioLibraryBuilderUtils.bankSourceName(entry.logicalPath))
            .filter(name => name.endsWith(".bnk")));
        const includeMusic = options.music === undefined
            ? AUTO_MUSIC_BANK_NAMES.every(name => availableBankNames.has(name))
            : options.music;
        const values = await this.buildFromBanks({
            ...buildOptions,
            indexEntries,
            metadata,
            ...(soundbanksInfo === undefined ? {} : { soundbanksInfo }),
            includeSfx: options.includeSfx ?? true,
            music: includeMusic,
            loadBank: options.loadBank ?? (async (bank, context = {}) =>
                read(bank.resPath, {
                    ...context,
                    kind: "audioBank",
                    bank,
                    signal: context.signal ?? signal,
                })),
        });

        return CjsAudioLibrary.from(values);
    }

    /** Normalizes audio rows from index text, a file index, or an iterable. */
    static parseIndexEntries(indexValue)
    {
        return normalizeIndexEntries(indexValue);
    }

    /** Projects inspected Wwise event edges onto canonical event names. */
    static createEventMediaTable(metadata, bankResults)
    {
        const namesByID = new Map();
        for (const [ name, record ] of CjsAudioLibraryBuilderUtils.metadataEntries(
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
     * The resource layer owns HIRC decoding. This method only names and lowers
     * codec sounds, Step Random/Sequence, Step Switch/State containers, and
     * supported non-continuous Layer containers and crossfades. It also
     * returns a sparse event-metadata projection after resolving NodeBase
     * positioning through hierarchy-only Actor-Mixers. Unsupported events
     * are normally omitted whole and described in diagnostics; one documented
     * Crossfade-to-Layer shape retains an independent finite Sound action.
     * Unresolved spatial inheritance omits only that metadata projection.
     */
    static createSfxGraph({
        inspections,
        metadata,
        soundbanksInfo = null,
        enrichment = null,
        media = {},
        embeddedMedia = {},
        buses = null,
    } = {})
    {
        if (!Array.isArray(inspections))
        {
            throw new TypeError(
                "Audio SFX construction requires bank inspections",
            );
        }

        const parsed = CjsBnkFormat.wwise.sfxNodesFromBanks(inspections);
        const parsedEffects = CjsBnkFormat.wwise.effectNodesFromBanks(
            inspections,
        );
        const effectVersions = new Map();

        for (const inspection of inspections)
        {
            for (const entry of inspection.hirc ?? [])
            {
                if (EFFECT_HIRC_TYPES.has(entry.type))
                {
                    effectVersions.set(
                        Number(entry.id) >>> 0,
                        Number(inspection.bankVersion) >>> 0,
                    );
                }
            }
        }
        const effects = new Map([ ...parsedEffects.effects ]
            .map(([ id, effect ]) => [
                id,
                {
                    ...effect,
                    bankVersion: effectVersions.get(Number(id) >>> 0),
                },
            ]));
        const eventNames = new Map();

        for (const [ name, record ] of CjsAudioLibraryBuilderUtils.metadataEntries(
            metadata?.Events,
            "Audio metadata Events",
        ))
        {
            eventNames.set(Number(record.eventID) >>> 0, name);
        }

        return LowerSfxGraph({
            parsed,
            effects,
            buses,
            eventNames,
            musicNodeIds: new Set(inspections.flatMap(inspection =>
                (inspection.hirc ?? [])
                    .filter(entry => MUSIC_HIRC_TYPES.has(entry.type))
                    .map(entry => Number(entry.id) >>> 0))),
            names: CreateSfxNameCatalog(
                soundbanksInfo,
                enrichment,
                inspections,
            ),
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
        soundbanksInfo = null,
        enrichment = null,
        media = {},
        embeddedMedia = {},
        musicBankNames = MUSIC_BANK_NAMES,
        buses = null,
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
            const name = CjsAudioLibraryBuilderUtils.bankSourceName(inspection?.source);

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

        const requiredNames = musicBankNames.map(CjsAudioLibraryBuilderUtils.bankSourceName);

        for (const name of requiredNames)
        {
            if (!byName.has(name))
            {
                throw new Error(`Music construction requires inspected bank: ${name}`);
            }
        }

        const musicInspections = musicBankNames.map(name =>
            byName.get(CjsAudioLibraryBuilderUtils.bankSourceName(name)));
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

        const names = CreateSfxNameCatalog(
            soundbanksInfo,
            enrichment,
            eventInspections,
        );
        const ancestry = new CjsAudioLibraryBuilderWwiseNodeBaseAncestry(
            id => parsed.nodes.get(id)?.nodeBase,
        );
        const nodes = {};

        for (const [ id, value ] of [ ...parsed.nodes.entries() ]
            .sort(([ left ], [ right ]) => left - right))
        {
            const {
                id: parsedID,
                nodeBase,
                ...node
            } = value;

            if ((parsedID >>> 0) !== (id >>> 0))
            {
                throw new Error(`Music-node identity mismatch: ${parsedID} !== ${id}`);
            }

            const routing = node.type === "music-track"
                ? CjsAudioLibraryBuilderUtils.createMusicBusRouting(ancestry, id, buses)
                : null;
            const rtpcCurves = node.type === "music-track"
                ? CreateMusicRtpcCurves(nodeBase, names)
                : [];

            nodes[id] = {
                ...node,
                ...(routing ?? {}),
                ...(rtpcCurves.length ? { rtpcCurves } : {}),
            };
        }

        validateMusicNodeReferences(nodes, media, embeddedMedia);

        const eventProjection = this.createMusicEventProjection({
            inspections: eventInspections,
            metadata,
            nodes,
        });

        return {
            schemaVersion: 1,
            generator: "@carbonenginejs/runtime/audio/library-builder",
            banks: musicBankNames.map(CjsAudioLibraryBuilderUtils.bankSourceName),
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

    /**
     * Classifies embedded media by its four-byte container magic.
     *
     * A bank's media index (DIDX) records only id, offset and length, so
     * nothing in the bank says what an entry is, and not every entry is a WEM.
     * EVE banks also embed Wwise plug-in media: the Convolution Reverb impulse
     * `154360724` in `hangar.bnk` is a `PLUG` payload, not audio. The bytes
     * decide: `RIFF`/`RIFX` is `wem`, `MIDI` is `midi`, `PLUG` is `plugin`,
     * anything else (or too short to hold a magic) is `unknown`.
     */
    static mediaTypeFromMagic(bytes, offset = 0)
    {
        const value = CjsAudioLibraryBuilderUtils.toUint8Array(bytes);
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
     *
     * `includeSfx: true` lets inspected v150 banks contribute a conservative
     * SFX program, typed-graph `eventMedia` reachability and inherited `is2D`
     * metadata; it cannot be combined with a supplied `sfx` graph (pass that
     * as `sfx` or `enrichment.sfx` instead). Each lowered event also gets
     * `eventsStoppedBy` from its authored Stop targets, and each leaf keeps
     * its resolved `spatial` flag and dry-volume curve. `language` (default
     * `en-us`, recorded as `eventMediaLanguage`) selects one localized bank
     * variant before HIRC objects merge, because localized banks reuse object
     * IDs; every variant stays in `banks` and the media tables, but graph
     * references name only the selected language and shared banks.
     * `onSfxDiagnostics` receives
     * what was omitted and why. `music: true` decodes the
     * authored music hierarchy; music events are found from typed Play/Stop
     * targets and music argument groups across every selected bank, never
     * from bank or event names.
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

        const {
            inspections,
            bankIdentities,
            embeddedMedia,
        } = await new CjsAudioLibraryBuilderBankInspectionSession({
            builder: this,
            loadBank,
            inspectBank,
            signal,
        }).Inspect(library);

        const graphInspections = SelectLanguageInspections(
            inspections,
            eventMediaLanguage,
        );
        const busCatalog = includeSfx || includeMusic
            ? CreateTypedBusCatalog(graphInspections)
            : null;
        const busNames = busCatalog
            ? CreateSfxNameCatalog(
                options.soundbanksInfo,
                options.enrichment,
                graphInspections,
            )
            : null;
        const busRtpcs = busCatalog
            ? CreateBusRtpcCatalog(busCatalog, busNames)
            : null;
        const musicBusIds = includeMusic && busCatalog
            ? CreateMusicRouteBusIds(
                inspections.filter(inspection =>
                    MUSIC_BANK_NAMES.includes(
                        CjsAudioLibraryBuilderUtils.bankSourceName(inspection.source),
                    )),
                busCatalog,
            )
            : new Set();
        const sfxBusIds = includeSfx && busCatalog
            ? CreateSfxRouteBusIds(graphInspections, busCatalog)
            : new Set();
        const routedBusIds = new Set([ ...sfxBusIds, ...musicBusIds ]);
        const busStates = busCatalog
            ? CreateBusStateCatalog(busCatalog, busNames, musicBusIds)
            : null;
        const busDucking = busCatalog
            ? CreateBusDuckingCatalog(busCatalog)
            : null;
        const busEffects = busCatalog
            ? CreateBusEffectCatalog(
                graphInspections,
                busCatalog,
                routedBusIds,
            )
            : null;
        const busGraph = busCatalog && routedBusIds.size
            ? CreateBusGraphCatalog(
                graphInspections,
                includeMusic
                    ? inspections.filter(inspection =>
                        MUSIC_BANK_NAMES.includes(
                            CjsAudioLibraryBuilderUtils.bankSourceName(inspection.source),
                        ))
                    : [],
                busCatalog,
            )
            : null;
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
            busRtpcs,
            busStates,
            busDucking,
            busEffects,
            busGraph,
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
                buses: busCatalog,
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
                        CjsAudioLibraryBuilderUtils.bankSourceName(inspection.source),
                    )),
                eventInspections: graphInspections,
                metadata: library.metadata,
                soundbanksInfo: options.soundbanksInfo,
                enrichment: options.enrichment,
                media: library.media,
                embeddedMedia: library.embeddedMedia ?? {},
                buses: busCatalog,
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
            busRtpcs = null,
            busStates = null,
            busDucking = null,
            busEffects = null,
            busGraph = null,
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
                CjsAudioLibraryBuilderUtils.addSourceRecord(media, id, {
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

        if (busRtpcs !== null
            && Object.keys(busRtpcs.buses ?? {}).length)
        {
            library.busRtpcs = NormalizeBusRtpcCatalog(busRtpcs);
        }

        if (busStates !== null
            && Object.keys(busStates.buses ?? {}).length)
        {
            library.busStates = NormalizeBusStateCatalog(busStates);
        }

        if (busDucking !== null
            && Object.keys(busDucking.sources ?? {}).length)
        {
            library.busDucking = NormalizeBusDuckingCatalog(busDucking);
        }

        if (busEffects !== null
            && Object.keys(busEffects.buses ?? {}).length)
        {
            library.busEffects = NormalizeBusEffectCatalog(busEffects);
        }

        if (busGraph !== null
            && Object.keys(busGraph.buses ?? {}).length)
        {
            library.busGraph = normalizeBusGraphCatalog(
                MarkBusGraphVolumeActionControls(busGraph, library.sfx),
                library.embeddedMedia ?? {},
            );
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

function RequireBuilderOptions(value)
{
    if (!value || typeof value !== "object" || Array.isArray(value))
    {
        throw new TypeError("Audio resource builder options must be an object");
    }
}

async function ResolveResourceIndexEntries(options, read, signal)
{
    if (options.indexEntries !== undefined)
    {
        return CjsAudioLibraryBuilder.parseIndexEntries(options.indexEntries);
    }

    // Without an explicit index the build stays on default resource paths:
    // discovery derives from SoundbanksInfo and, when read, the FSD metadata,
    // which is all a plain fetch consumer can reach.
    if (options.indexPath === undefined)
    {
        return null;
    }

    return CjsAudioLibraryBuilder.parseIndexEntries(decodeAudioResourceText(
        await read(options.indexPath, {
            kind: "audioIndex",
            signal,
        }),
    ));
}

/**
 * Derives the resource listing an index would have provided, from default
 * paths alone: banks from each SoundbanksInfo `Path` (bare names live under
 * `essential_media/`), and streamed media from each bank's `Media` rows with
 * the metadata `WemFileIDs` `IsEssential` flag selecting between the
 * `media/` and `essential_media/` directories. Validated exact against the
 * shipped resfileindex (3186/3186 audio entries, build 3489895).
 */
function DeriveDefaultPathIndexEntries(soundbanksInfo, metadata)
{
    const banks = soundbanksInfo?.SoundBanksInfo?.SoundBanks;

    if (!Array.isArray(banks))
    {
        throw new TypeError(
            "Audio builds without an index require SoundbanksInfo bank and"
            + " streamed-media listings at their default resource paths",
        );
    }

    const entries = new Map();

    for (const bank of banks)
    {
        const path = String(bank?.Path ?? "")
            .trim()
            .replaceAll("\\", "/")
            .toLowerCase();

        if (!path)
        {
            continue;
        }

        const logicalPath = `res:/audio/${path.includes("/")
            ? path
            : `essential_media/${path}`}`;

        entries.set(logicalPath, { logicalPath });

        for (const media of bank?.Media ?? [])
        {
            if (String(media?.Streaming).toLowerCase() !== "true")
            {
                continue;
            }

            const id = String(media?.Id ?? "").trim();

            if (!id)
            {
                continue;
            }

            const essential = Number(
                metadata?.WemFileIDs?.[id]?.IsEssential ?? 0,
            ) !== 0;
            const wemPath = `res:/audio/${essential
                ? "essential_media"
                : "media"}/${id}.wem`;

            entries.set(wemPath, { logicalPath: wemPath });
        }
    }

    return CjsAudioLibraryBuilder.parseIndexEntries([ ...entries.values() ]);
}

async function ResolveSoundbanksInfo(options, indexEntries, read, signal)
{
    if (options.soundbanksInfo !== undefined)
    {
        return options.soundbanksInfo;
    }

    const explicit = options.soundbanksInfoPath;
    const entry = explicit
        ? { logicalPath: explicit }
        : indexEntries === null
            ? { logicalPath: "res:/audio/soundbanksinfo.json" }
            : indexEntries.find(value =>
                value.logicalPath.toLowerCase().endsWith("/soundbanksinfo.json"));

    if (!entry)
    {
        return undefined;
    }

    return decodeAudioResourceJson(
        await read(entry.logicalPath, {
            kind: "soundbanksInfo",
            signal,
        }),
        entry.logicalPath,
    );
}

/**
 * Decodes the audio metadata cFSD through the caller's reader, or returns
 * undefined when no reader was supplied so the build uses SoundbanksInfo alone.
 *
 * @param {object} options Builder options.
 * @param {{Read: Function, ReadJSON: Function, constructor: {path: string}}|null} metadataReader Caller-supplied reader.
 * @param {Function} read Resource byte reader.
 * @param {AbortSignal|null} signal Abort signal.
 * @returns {Promise<object|undefined>} Decoded metadata, or undefined without a reader.
 */
async function ReadAudioMetadataFsd(options, metadataReader, read, signal)
{
    if (metadataReader === null)
    {
        return undefined;
    }

    const fsdModule = await import("#resource/formats/fsd");
    const logicalPath = metadataReader.constructor.path;
    const registry = new fsdModule.CjsFsd64Reader()
        .Register(logicalPath, metadataReader);

    return fsdModule.CjsFsdFormat.readJSON(
        await read(options.audioMetadataPath ?? logicalPath, {
            kind: "audioMetadata",
            logicalPath,
            signal,
        }),
        {
            ...(options.fsdOptions ?? {}),
            path: logicalPath,
            reader: registry,
        },
    );
}

function OmitResourceOptions(options)
{
    const result = { ...options };

    for (const key of [
        "audioMetadataPath",
        "audioMetadataReader",
        "fsdOptions",
        "indexPath",
        "inspectBanks",
        "read",
        "source",
        "soundbanksInfoPath",
    ])
    {
        delete result[key];
    }

    return result;
}

function MarkBusGraphVolumeActionControls(busGraph, sfx)
{
    const buses = Object.fromEntries(Object.entries(busGraph.buses ?? {})
        .map(([ busId, bus ]) => [ busId, { ...bus } ]));
    const busIds = Object.keys(buses);

    for (const actions of Object.values(sfx?.programs ?? {}))
    {
        for (const action of actions)
        {
            if (action?.kind !== "set-bus-volume"
                && action?.kind !== "reset-bus-volume")
            {
                continue;
            }
            const excluded = new Set(
                (action.exceptions ?? []).map(value => String(value.targetId)),
            );
            const targets = action.mode === "element"
                ? [ String(action.targetId) ]
                : busIds.filter(busId =>
                    action.mode !== "all-except" || !excluded.has(busId));

            for (const busId of targets)
            {
                if (!buses[busId]) continue;
                buses[busId].busVolumeActionControlled = true;
                if (action.kind !== "set-bus-volume") continue;
                const maximum = Number(action.busVolumeDb)
                    + Number(action.busVolumeRangeDb?.max ?? 0);
                const mayIncrease = action.valueMode === "absolute"
                    || !Number.isFinite(maximum)
                    || maximum > 0;

                if (mayIncrease) buses[busId].busVolumeMayIncrease = true;
            }
        }
    }
    return { ...busGraph, buses };
}

function LowerSfxGraph({
    parsed,
    effects,
    buses,
    eventNames,
    musicNodeIds,
    names,
    media,
    embeddedMedia,
})
{
    const ancestry = new CjsAudioLibraryBuilderWwiseNodeBaseAncestry(
        id => parsed.nodeBases?.get(id),
    );
    const nodeSession = new CjsAudioLibraryBuilderSfxNodeLoweringSession({
        parsed,
        effects,
        buses,
        names,
        media,
        embeddedMedia,
        ancestry,
    });
    const eventSession = new CjsAudioLibraryBuilderSfxEventLoweringSession({
        parsed,
        buses,
        eventNames,
        musicNodeIds,
        names,
        nodeSession,
    });
    const {
        events,
        programs,
        leavesByEvent,
        stopTargetsByEvent,
        omittedEvents,
        approximatedEvents,
    } = eventSession.LowerNamedEvents();

    const nodes = nodeSession.GetPlainNodes();
    const spatial = CreateSfxSpatialProjection(
        parsed,
        leavesByEvent,
        nodes,
    );
    const stopRelationships = CreateSfxStopRelationships(
        ancestry,
        leavesByEvent,
        stopTargetsByEvent,
    );
    OmitFutureScheduledVoiceLimits(events, programs, nodes);
    const pruned = PruneSfxNodes(events, nodes);

    return {
        schemaVersion: 2,
        generator: "@carbonenginejs/runtime/audio/library-builder",
        events,
        programs,
        nodes: pruned,
        ...(names.stateTransitions.length
            ? { stateTransitions: names.stateTransitions }
            : {}),
        metadataProjection: {
            Events: MergeSfxEventMetadata(
                spatial.events,
                stopRelationships.events,
            ),
        },
        diagnostics: {
            parser: parsed.diagnostics,
            omittedEvents,
            approximatedEvents,
            stopRelationships: stopRelationships.diagnostics,
            spatial: spatial.diagnostics,
        },
    };
}

// Playback limiting is evaluated when Wwise starts the pending Sound, not when
// an earlier delayed action or Crossfade prefetch first selects its media. The
// browser arbiter currently admits at selection time, so keep those future
// scheduling shapes out of the otherwise exact cap-one projection.
function OmitFutureScheduledVoiceLimits(events, programs, nodes)
{
    const visited = new Set();
    const delayed = value =>
    {
        const base = Number(value?.delayMs) || 0;
        const maximum = Number(value?.delayRangeMs?.max) || 0;

        return base + maximum > 0;
    };
    const visit = (child, future) =>
    {
        const rawID = child && typeof child === "object"
            ? child.nodeId
            : child;

        if (rawID === undefined || rawID === null || rawID === "")
        {
            return;
        }
        const id = String(rawID);
        const risk = future
            || (child && typeof child === "object" && delayed(child));
        const key = `${id}\0${risk ? 1 : 0}`;

        if (visited.has(key))
        {
            return;
        }
        visited.add(key);
        const node = nodes[id];

        if (!node)
        {
            return;
        }
        if (node.type === "sound")
        {
            const maximumRandomDelay = (node.initialDelayRangesMs ?? [])
                .reduce((sum, range) =>
                    sum + (Number(range.max) || 0), 0);
            const ownDelay = (Number(node.initialDelayMs) || 0)
                    + maximumRandomDelay > 0
                || (node.rtpcCurves ?? []).some(curve =>
                    curve.property === "initialDelay");

            if (risk || ownDelay)
            {
                delete node.voiceLimit;
            }
            return;
        }

        const continuousFuture = node.continuous !== undefined
            && (node.continuous.transition === "crossfade-amplitude"
                || node.continuous.transition === "crossfade-power"
                || (node.continuous.transition === "delay"
                    && (Number(node.continuous.transitionMs) || 0)
                        + (Number(
                            node.continuous.transitionRangeMs?.max,
                        ) || 0) > 0));
        const childFuture = risk || continuousFuture;

        for (const nested of node.children ?? [])
        {
            visit(nested, childFuture);
        }
        for (const nested of Object.values(node.cases ?? {}))
        {
            visit(nested, childFuture);
        }
        visit(node.default, childFuture);
    };

    for (const roots of Object.values(events))
    {
        for (const root of roots)
        {
            visit(root, false);
        }
    }
    for (const program of Object.values(programs))
    {
        for (const operation of program)
        {
            if (operation.kind === "play")
            {
                visit(operation.child, false);
            }
        }
    }
}

function CreateTypedBusCatalog(inspections)
{
    const result = CjsBnkFormat.wwise.busNodesFromBanks(inspections);

    if (result.diagnostics.failed.length)
    {
        const details = result.diagnostics.failed
            .map(failure => `${failure.bank}:${failure.type}:${failure.id}`)
            .join(", ");

        throw new Error(`Audio bus parsing failed: ${details}`);
    }
    return result.buses;
}

function CreateBusRtpcCatalog(buses, names)
{
    const result = {};

    for (const [ rawBusId, bus ] of [ ...buses.entries() ]
        .sort(([ left ], [ right ]) => left - right))
    {
        const curves = (bus.rtpcs ?? [])
            .filter(rtpc => BUS_RTPC_PROPERTIES.has(
                Number(rtpc.parameterId),
            ))
            .map(rtpc => CreateBusRtpcCurve(
                rtpc,
                names,
                BUS_RTPC_PROPERTIES.get(Number(rtpc.parameterId)),
            ))
            .sort((left, right) => left.curveId - right.curveId);

        if (curves.length)
        {
            result[String(Number(rawBusId) >>> 0)] = curves;
        }
    }

    return {
        schemaVersion: 2,
        buses: result,
    };
}

function CreateBusRtpcCurve(rtpc, names, property)
{
    const label = property === "voice-volume"
        ? "Audio Bus Voice Volume"
        : "Audio Bus Volume";
    const curveId = CjsAudioLibraryBuilderUtils.normalizeWwiseUint32(
        rtpc.curveId,
        `${label} RTPC curve id`,
    );
    const controlId = CjsAudioLibraryBuilderUtils.normalizeWwiseUint32(
        rtpc.controlId,
        `${label} RTPC ${curveId} control id`,
    );
    const rtpcName = names.parameters.get(controlId);
    const defaultValue = names.parameterDefaults.get(controlId);

    if (Number(rtpc.controlType) !== 0)
    {
        throw new Error(
            `unsupported ${label} RTPC control type ${rtpc.controlType}`,
        );
    }
    if (Number(rtpc.accumulation) !== SFX_ADDITIVE_ACCUMULATION)
    {
        throw new Error(
            `unsupported ${label} RTPC accumulation ${rtpc.accumulation}`,
        );
    }
    if (Number(rtpc.scaling) !== 2)
    {
        throw new Error(
            `unsupported ${label} RTPC scaling ${rtpc.scaling}`,
        );
    }
    if (!rtpcName)
    {
        throw new Error(`unnamed ${label} game parameter ${controlId}`);
    }
    if (!Number.isFinite(defaultValue))
    {
        throw new Error(
            `missing ${label} game parameter default ${controlId}`,
        );
    }
    if (!rtpc.points?.length)
    {
        throw new Error(`empty ${label} RTPC curve ${curveId}`);
    }

    let previous = -Infinity;
    const points = rtpc.points.map((point, index) =>
    {
        const x = Number(point.from);
        const value = Number(point.to);
        const interpolation = Number(point.interpolation);

        if (!Number.isFinite(x) || !Number.isFinite(value))
        {
            throw new Error(`non-finite ${label} RTPC curve ${curveId}`);
        }
        if (value < -1 || value > 1)
        {
            throw new Error(
                `out-of-range ${label} RTPC curve ${curveId} point ${index}`,
            );
        }
        if (!Number.isSafeInteger(interpolation)
            || interpolation < 0
            || interpolation > 9)
        {
            throw new Error(
                `invalid ${label} RTPC interpolation ${curveId}`,
            );
        }
        if (x < previous)
        {
            throw new Error(`unsorted ${label} RTPC curve ${curveId}`);
        }
        previous = x;

        return { x, value, interpolation };
    });

    return {
        curveId,
        property,
        rtpc: String(rtpcName),
        defaultValue,
        scaling: 2,
        points,
    };
}

function NormalizeBusRtpcCatalog(value)
{
    const buses = {};

    for (const busId of Object.keys(value.buses ?? {})
        .sort((left, right) => Number(left) - Number(right)))
    {
        buses[String(busId)] = value.buses[busId].map(curve => ({
            curveId: Number(curve.curveId),
            property: curve.property === undefined
                ? "bus-volume"
                : String(curve.property),
            rtpc: String(curve.rtpc),
            defaultValue: Number(curve.defaultValue),
            scaling: Number(curve.scaling),
            points: curve.points.map(point => ({
                x: Number(point.x),
                value: Number(point.value),
                interpolation: Number(point.interpolation),
            })),
        }));
    }

    return {
        schemaVersion: 2,
        buses,
    };
}

function CreateBusStateCatalog(buses, names, musicBusIds)
{
    const result = {};
    const usedGroupIds = new Set();
    let usesFilters = false;

    for (const [ rawBusId, bus ] of [ ...buses.entries() ]
        .sort(([ left ], [ right ]) => left - right))
    {
        const definitions = new Map();

        for (const definition of bus.state?.properties ?? [])
        {
            const propertyId = Number(definition.propertyId);

            if (definitions.has(propertyId))
            {
                throw new Error(
                    `duplicate Audio Bus state property ${propertyId}`,
                );
            }
            definitions.set(propertyId, definition);
        }

        const groups = (bus.state?.groups ?? [])
            .map(group => CreateBusStateGroup(
                group,
                definitions,
                names,
                musicBusIds.has(String(Number(rawBusId) >>> 0)),
            ))
            .filter(Boolean)
            .sort((left, right) => Number(left.groupId) - Number(right.groupId));

        if (groups.length)
        {
            result[String(Number(rawBusId) >>> 0)] = groups;
            for (const group of groups)
            {
                usedGroupIds.add(group.groupId);
                usesFilters ||= group.states.some(state =>
                    state.lowPass !== undefined
                    || state.highPass !== undefined);
            }
        }
    }

    const stateTransitions = names.stateTransitions.filter(group =>
        usedGroupIds.has(String(group.groupId)));

    if (stateTransitions.length !== usedGroupIds.size)
    {
        throw new Error("Audio Bus State group is missing STMG transition data");
    }

    if (usesFilters && names.stateFilterBehavior !== 0)
    {
        throw new Error(
            `unsupported Audio Bus State filter behavior ${names.stateFilterBehavior}`,
        );
    }

    return {
        schemaVersion: 2,
        ...(usesFilters ? { filterBehavior: "additive" } : {}),
        stateTransitions,
        buses: result,
    };
}

function CreateBusStateGroup(group, definitions, names, musicRouted)
{
    const groupId = CjsAudioLibraryBuilderUtils.normalizeWwiseUint32(
        group.groupId,
        "Audio Bus state group id",
    );
    const syncType = Number(group.syncType);
    const namedGroup = names.groups.get(`state:${groupId}`);
    const states = [];
    const unsupportedValue = (group.states ?? [])
        .flatMap(state => state.values ?? [])
        .find(value => !BUS_STATE_FIELDS.has(Number(value.propertyId)));

    if (unsupportedValue)
    {
        throw new Error(
            `unsupported Audio Bus state property ${unsupportedValue.propertyId}`
            + ` in group ${groupId}`,
        );
    }
    const authoredStates = (group.states ?? []).filter(state =>
        (state.values ?? []).some(value =>
            BUS_STATE_FIELDS.has(Number(value.propertyId))));

    if (!authoredStates.length) return null;

    if (!Number.isSafeInteger(syncType) || syncType < 0 || syncType > 9)
    {
        throw new Error(`invalid Audio Bus state sync type ${syncType}`);
    }
    if (!namedGroup?.name)
    {
        throw new Error(`unnamed Audio Bus state group ${groupId}`);
    }
    const affectsMusic = authoredStates.some(state =>
        (state.values ?? []).some(value =>
            Number(value.propertyId) !== BUS_PITCH_STATE_PROPERTY));

    if (syncType !== 0 && musicRouted && affectsMusic)
    {
        throw new Error(
            `unsupported music-synchronized Audio Bus state group ${groupId}`,
        );
    }

    for (const state of authoredStates)
    {
        const values = (state.values ?? []).filter(value =>
            BUS_STATE_FIELDS.has(Number(value.propertyId)));

        if (!values.length) continue;

        const stateId = CjsAudioLibraryBuilderUtils.normalizeWwiseUint32(
            state.stateId,
            `Audio Bus state group ${groupId} state id`,
        );
        const stateName = namedGroup.values.get(stateId);

        if (!stateName)
        {
            throw new Error(
                `unnamed Audio Bus state ${stateId} in group ${groupId}`,
            );
        }
        const normalized = {
            stateId: String(stateId),
            state: stateName,
        };
        const seenProperties = new Set();

        for (const value of values)
        {
            const propertyId = Number(value.propertyId);
            const field = BUS_STATE_FIELDS.get(propertyId);
            const definition = definitions.get(propertyId);
            const filter = propertyId === BUS_LOW_PASS_STATE_PROPERTY
                || propertyId === BUS_HIGH_PASS_STATE_PROPERTY;
            const expectedAccumulation = filter
                ? SFX_FILTER_ACCUMULATION
                : SFX_ADDITIVE_ACCUMULATION;
            const expectedInDb = propertyId === BUS_VOLUME_STATE_PROPERTY;

            if (seenProperties.has(propertyId))
            {
                throw new Error(
                    `duplicate Audio Bus ${field} state value in group ${groupId}`,
                );
            }
            seenProperties.add(propertyId);
            if (!definition
                || Number(definition.accumulation) !== expectedAccumulation
                || definition.inDb !== expectedInDb)
            {
                throw new Error(
                    `unsupported Audio Bus ${field} state definition in group ${groupId}`,
                );
            }
            const number = Number(value.value);

            if (!Number.isFinite(number))
            {
                throw new Error(
                    `non-finite Audio Bus ${field} state ${stateId} in group ${groupId}`,
                );
            }
            normalized[field] = number;
        }
        states.push(normalized);
    }

    if (!states.length) return null;
    states.sort((left, right) => Number(left.stateId) - Number(right.stateId));

    return {
        groupId: String(groupId),
        group: namedGroup.name,
        syncType,
        effectiveSyncType: 0,
        states,
    };
}

function NormalizeBusStateCatalog(value)
{
    const buses = {};

    for (const busId of Object.keys(value.buses ?? {})
        .sort((left, right) => Number(left) - Number(right)))
    {
        buses[String(busId)] = value.buses[busId].map(group => ({
            groupId: String(group.groupId),
            group: String(group.group),
            syncType: Number(group.syncType),
            effectiveSyncType: Number(group.effectiveSyncType),
            states: group.states.map(state => ({
                stateId: String(state.stateId),
                state: String(state.state),
                ...Object.fromEntries(
                    [ "gainDb", "pitchCents", "lowPass", "highPass" ]
                        .filter(field => state[field] !== undefined)
                        .map(field => [ field, Number(state[field]) ]),
                ),
            })),
        }));
    }

    return {
        schemaVersion: Number(value.schemaVersion),
        ...(Number(value.schemaVersion) === 1
            ? {
                property: String(value.property),
                accumulation: String(value.accumulation),
                unit: String(value.unit),
            }
            : {}),
        ...(value.filterBehavior === undefined
            ? {}
            : { filterBehavior: String(value.filterBehavior) }),
        stateTransitions: NormalizeStateTransitions(value.stateTransitions),
        buses,
    };
}

function CreateBusDuckingCatalog(buses)
{
    const sources = {};

    for (const [ rawSourceBusId, bus ] of [ ...buses.entries() ]
        .sort(([ left ], [ right ]) => left - right))
    {
        if (!bus.ducks?.length) continue;
        const sourceBusId = CjsAudioLibraryBuilderUtils.normalizeWwiseUint32(
            rawSourceBusId,
            "Audio Bus ducking source id",
        );

        if (bus.type !== "audio-bus")
        {
            throw new Error(
                `unsupported Auxiliary Bus ducking source ${sourceBusId}`,
            );
        }
        const recoveryMs = Number(bus.recoveryTime);
        const maxDuckVolumeDb = Number(bus.maxDuckVolume);

        if (!Number.isSafeInteger(recoveryMs) || recoveryMs < 0)
        {
            throw new Error(
                `invalid Audio Bus ducking recovery ${sourceBusId}`,
            );
        }
        if (!Number.isFinite(maxDuckVolumeDb)
            || maxDuckVolumeDb < -200
            || maxDuckVolumeDb > 0)
        {
            throw new Error(
                `invalid Audio Bus maximum duck volume ${sourceBusId}`,
            );
        }
        const ancestors = new Set();
        let ancestor = Number(bus.overrideBusId) >>> 0;

        while (ancestor)
        {
            if (ancestors.has(ancestor))
            {
                throw new Error(`Audio bus ancestry cycle at ${ancestor}`);
            }
            ancestors.add(ancestor);
            const parent = buses.get(ancestor);

            if (!parent)
            {
                throw new Error(`Audio bus ancestry is missing ${ancestor}`);
            }
            ancestor = Number(parent.overrideBusId) >>> 0;
        }
        const targetIds = new Set();
        const targets = bus.ducks.map((duck, index) =>
        {
            const targetBusId = CjsAudioLibraryBuilderUtils.normalizeWwiseUint32(
                duck.busId,
                `Audio Bus ducking source ${sourceBusId} target ${index}`,
            );
            const targetBus = buses.get(Number(targetBusId));
            const volumeDb = Number(duck.volume);
            const fadeOutMs = Number(duck.fadeOutTime);
            const fadeInMs = Number(duck.fadeInTime);
            const curve = Number(duck.curve);
            const targetPropertyId = Number(duck.targetPropertyId);

            if (!targetBus || targetBus.type !== "audio-bus")
            {
                throw new Error(
                    `Audio Bus ducking target ${targetBusId} is not an Audio Bus`,
                );
            }
            if (targetBusId === sourceBusId || ancestors.has(Number(targetBusId)))
            {
                throw new Error(
                    `Audio Bus ${sourceBusId} cannot duck itself or parent ${targetBusId}`,
                );
            }
            if (targetIds.has(targetBusId))
            {
                throw new Error(
                    `Audio Bus ${sourceBusId} has duplicate duck target ${targetBusId}`,
                );
            }
            targetIds.add(targetBusId);
            if (!Number.isFinite(volumeDb)
                || volumeDb < maxDuckVolumeDb
                || volumeDb > 0)
            {
                throw new Error(
                    `invalid Audio Bus duck volume ${sourceBusId}:${targetBusId}`,
                );
            }
            if (!Number.isSafeInteger(fadeOutMs) || fadeOutMs < 0
                || !Number.isSafeInteger(fadeInMs) || fadeInMs < 0)
            {
                throw new Error(
                    `invalid Audio Bus duck fade ${sourceBusId}:${targetBusId}`,
                );
            }
            if (!Number.isSafeInteger(curve) || curve < 0 || curve > 9)
            {
                throw new Error(
                    `invalid Audio Bus duck curve ${sourceBusId}:${targetBusId}`,
                );
            }
            const targetProperty = targetPropertyId
                === DUCK_VOICE_VOLUME_PROPERTY
                ? "voice-volume"
                : targetPropertyId === DUCK_BUS_VOLUME_PROPERTY
                    ? "bus-volume"
                    : null;

            if (!targetProperty)
            {
                throw new Error(
                    `unsupported Audio Bus duck target property ${targetPropertyId}`,
                );
            }
            return {
                targetBusId,
                volumeDb,
                fadeOutMs,
                fadeInMs,
                curve,
                targetProperty,
            };
        }).sort((left, right) => Number(left.targetBusId)
            - Number(right.targetBusId));

        sources[sourceBusId] = {
            recoveryMs,
            maxDuckVolumeDb,
            targets,
        };
    }
    return { schemaVersion: 1, sources };
}

function CreateBusEffectCatalog(inspections, buses, routedBusIds)
{
    if (!routedBusIds.size)
    {
        return { schemaVersion: 1, buses: {} };
    }
    const parsed = CjsBnkFormat.wwise.effectNodesFromBanks(inspections);

    if (parsed.diagnostics.failed.length
        || parsed.diagnostics.unsupportedVersions.length)
    {
        throw new Error("Audio Bus effect qualification failed");
    }
    const result = {};
    const activeEffectsByBus = new Map();
    const unsupportedBusIds = new Set();

    for (const rawBusId of [ ...routedBusIds ]
        .map(Number)
        .sort((left, right) => left - right))
    {
        const bus = buses.get(rawBusId);

        if (!bus || bus.fx?.bypassAll) continue;
        const activeEffects = [];

        for (const slot of [ ...(bus.fx?.slots ?? []) ]
            .sort((left, right) => left.index - right.index))
        {
            if (slot.bypass) continue;
            if ((Number(slot.flags) & ~0x03) !== 0)
            {
                throw new Error(
                    `Audio Bus ${rawBusId} effect ${slot.fxId} has unsupported slot flags`,
                );
            }
            const effect = parsed.effects.get(slot.fxId);

            if (!effect)
            {
                throw new Error(
                    `Audio Bus ${rawBusId} effect ${slot.fxId} is missing`,
                );
            }
            const expectsShareSet = effect.type === "effect-share-set";

            if (slot.shareSet !== expectsShareSet)
            {
                throw new Error(
                    `Audio Bus ${rawBusId} effect ${slot.fxId} has a mismatched ShareSet flag`,
                );
            }
            activeEffects.push({ slot, effect });
            if (effect.pluginId !== PARAMETRIC_EQ_PLUGIN_ID)
            {
                unsupportedBusIds.add(rawBusId);
            }
        }
        if (activeEffects.length)
        {
            activeEffectsByBus.set(rawBusId, activeEffects);
        }
    }

    // A distributed linear adapter may only cross a route whose complete
    // active slot sequence is understood. Skipping an unsupported Compressor,
    // limiter, reverb, or other slot and applying a later EQ changes authored
    // order and, for nonlinear stages, cross-voice behavior. Conservatively
    // suppress every catalog entry on any routed ancestry that crosses such a
    // barrier. A future shared bus graph can qualify and realize those paths.
    const unsafeBusIds = new Set();

    for (const rawBusId of [ ...routedBusIds ].map(Number))
    {
        const path = [];
        const active = new Set();
        let current = rawBusId;
        let unsupported = false;

        while (current)
        {
            if (active.has(current))
            {
                throw new Error(`Audio bus ancestry cycle at ${current}`);
            }
            active.add(current);
            path.push(current);
            unsupported ||= unsupportedBusIds.has(current);
            const bus = buses.get(current);

            if (!bus)
            {
                throw new Error(`Audio bus ancestry is missing ${current}`);
            }
            current = Number(bus.overrideBusId) >>> 0;
        }
        if (unsupported)
        {
            for (const busId of path) unsafeBusIds.add(busId);
        }
    }

    for (const [ rawBusId, activeEffects ] of activeEffectsByBus)
    {
        if (unsafeBusIds.has(rawBusId)) continue;
        const effects = activeEffects.map(({ slot, effect }) =>
            CjsAudioLibraryBuilderUtils.parseStaticParametricEq(`Bus ${rawBusId}`, slot, effect));

        if (effects.length) result[String(rawBusId)] = effects;
    }
    return { schemaVersion: 1, buses: result };
}

function CreateBusGraphCatalog(inspections, musicInspections, buses)
{
    return new CjsAudioLibraryBuilderBusGraphConstructionSession({
        inspections,
        musicInspections,
        buses,
    }).Build();
}

function NormalizeBusDuckingCatalog(value)
{
    const sources = {};

    for (const sourceBusId of Object.keys(value.sources ?? {})
        .sort((left, right) => Number(left) - Number(right)))
    {
        const source = value.sources[sourceBusId];

        sources[String(sourceBusId)] = {
            recoveryMs: Number(source.recoveryMs),
            maxDuckVolumeDb: Number(source.maxDuckVolumeDb),
            targets: source.targets.map(target => ({
                targetBusId: String(target.targetBusId),
                volumeDb: Number(target.volumeDb),
                fadeOutMs: Number(target.fadeOutMs),
                fadeInMs: Number(target.fadeInMs),
                curve: Number(target.curve),
                targetProperty: String(target.targetProperty),
            })),
        };
    }
    return { schemaVersion: 1, sources };
}

function NormalizeBusEffectCatalog(value)
{
    const buses = {};

    for (const busId of Object.keys(value.buses ?? {})
        .sort((left, right) => Number(left) - Number(right)))
    {
        buses[String(busId)] = value.buses[busId].map(effect => ({
            effectId: String(effect.effectId),
            slotIndex: Number(effect.slotIndex),
            type: String(effect.type),
            bands: effect.bands.map(band => ({
                index: Number(band.index),
                filterType: String(band.filterType),
                gainDb: Number(band.gainDb),
                frequencyHz: Number(band.frequencyHz),
                q: Number(band.q),
            })),
            outputGainDb: Number(effect.outputGainDb),
            processLfe: effect.processLfe === true,
        }));
    }
    return { schemaVersion: 1, buses };
}

function CreateMusicRouteBusIds(inspections, buses)
{
    if (!inspections.length) return new Set();

    const parsed = CjsBnkFormat.wwise.musicNodesFromBanks(inspections);

    if (parsed.diagnostics.failed.length)
    {
        throw new Error("Music bus-route qualification failed");
    }

    const result = new Set();
    const ancestry = new CjsAudioLibraryBuilderWwiseNodeBaseAncestry(
        id => parsed.nodes.get(id)?.nodeBase,
    );

    for (const [ id, node ] of parsed.nodes)
    {
        if (node.type !== "music-track") continue;

        const routing = CjsAudioLibraryBuilderUtils.createMusicBusRouting(ancestry, id, buses);

        for (const busId of routing?.busPathIds ?? [])
        {
            result.add(String(busId));
        }
    }
    return result;
}

function CreateSfxRouteBusIds(inspections, buses)
{
    if (!inspections.length) return new Set();

    const parsed = CjsBnkFormat.wwise.sfxNodesFromBanks(inspections);

    if (parsed.diagnostics.failed.length)
    {
        throw new Error("SFX bus-route qualification failed");
    }
    const result = new Set();
    const ancestry = new CjsAudioLibraryBuilderWwiseNodeBaseAncestry(
        id => parsed.nodeBases?.get(id),
    );

    for (const [ id, node ] of parsed.nodes)
    {
        if (node.type !== "sound") continue;

        const routing = CjsAudioLibraryBuilderUtils.createSfxBusRouting(ancestry, id, buses);

        for (const busId of routing?.busPathIds ?? [])
        {
            result.add(String(busId));
        }
    }
    return result;
}

function CreateSfxStopRelationships(
    ancestry,
    leavesByEvent,
    stopTargetsByEvent,
)
{
    const events = {};
    const projected = [];
    const unresolved = [];
    const ancestorsByLeaf = new Map();

    const ancestors = (leafID) =>
    {
        const leaf = Number(leafID) >>> 0;

        if (ancestorsByLeaf.has(leaf))
        {
            return ancestorsByLeaf.get(leaf);
        }

        const trace = ancestry.Trace(leaf);
        const result = new Set(trace.entries.map(entry => entry.id));

        if (trace.terminal === "missing")
        {
            result.add(trace.terminalId);
        }

        ancestorsByLeaf.set(leaf, result);
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
                const attenuationId = Number(
                    nodeBase.attenuationId,
                ) >>> 0;
                const attenuationProjection = attenuationId
                    ? GetSfxAttenuationProjection(parsed, attenuationId)
                    : null;

                result = {
                    known: true,
                    // Carbon's generated is2D metadata follows the resolved
                    // positioning owner's attenuation assignment, not merely
                    // Wwise's listener-relative-routing bit. A v150
                    // Common+Effects+Modules corpus comparison matched the
                    // source audio metadata for every fully lowered event.
                    is2D: attenuationId === 0,
                    ...(attenuationProjection === null
                        ? {}
                        : attenuationProjection),
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
                if (result.dryVolumeCurve)
                {
                    node.dryVolumeCurve = result.dryVolumeCurve;
                }
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
        const spatialLeaves = resolved.filter(value => !value.is2D);
        const radii = spatialLeaves.map(value =>
            value.maxRadiusAttenuation);
        const hasCompleteRadius = spatialLeaves.length > 0
            && radii.every(value => Number.isFinite(value));
        const maxRadiusAttenuation = hasCompleteRadius
            ? Math.max(...radii)
            : null;

        events[name] = {
            is2D,
            ...(maxRadiusAttenuation === null
                ? {}
                : { maxRadiusAttenuation }),
        };
        projected.push({
            name,
            leafIds,
            is2D,
            ...(maxRadiusAttenuation === null
                ? {}
                : { maxRadiusAttenuation }),
        });
    }

    return {
        events,
        diagnostics: {
            projected,
            omitted,
        },
    };
}

/** Returns one complete authored dry-volume distance curve and its radius. */
function GetSfxAttenuationProjection(parsed, attenuationId)
{
    const attenuation = parsed.attenuations?.get(attenuationId);
    const curveIndex = Number(attenuation?.curveToUse?.[0]);

    if (!Number.isSafeInteger(curveIndex) || curveIndex < 0)
    {
        return null;
    }

    const curve = attenuation.curves?.[curveIndex];
    const points = curve?.points;

    if (Number(curve?.scaling) !== 2
        || !Array.isArray(points)
        || !points.length)
    {
        return null;
    }

    let maximum = -Infinity;
    let previous = -Infinity;
    const projectedPoints = [];

    for (const point of points)
    {
        const distance = Number(point.from);
        const value = Number(point.to);
        const interpolation = Number(point.interpolation ?? 4);

        if (!Number.isFinite(distance)
            || distance < 0
            || distance < previous
            || !Number.isFinite(value)
            || !Number.isSafeInteger(interpolation)
            || interpolation < 0
            || interpolation > 9)
        {
            return null;
        }
        previous = distance;
        maximum = Math.max(maximum, distance);
        projectedPoints.push({
            x: distance,
            value,
            interpolation,
        });
    }

    return Number.isFinite(maximum)
        ? {
            maxRadiusAttenuation: maximum,
            dryVolumeCurve: {
                scaling: 2,
                points: projectedPoints,
            },
        }
        : null;
}

function CreateMusicRtpcCurves(nodeBase, names)
{
    return (nodeBase?.rtpcs ?? [])
        .filter(rtpc => Number(rtpc.parameterId) === SFX_VOLUME_PROPERTY)
        .map(rtpc =>
        {
            const curve = CjsAudioLibraryBuilderUtils.createSfxRtpcCurve(rtpc, names);

            if (!curve)
            {
                throw new Error(
                    `unsupported Music Track volume RTPC ${rtpc.curveId}`,
                );
            }
            return {
                ...curve,
                // Built-in music consumes the global Game Parameter lane;
                // it has no per-emitter game-object identity in this runtime.
                scope: "global",
            };
        });
}

function CreateSfxNameCatalog(soundbanksInfo, enrichment, inspections)
{
    return new CjsAudioLibraryBuilderSfxNameCatalogAccumulator()
        .AddSoundbanksInfo(soundbanksInfo)
        .AddInspections(inspections)
        .AddEnrichment(enrichment)
        .Build();
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

    // Host feature check: the bank provider is supplied by the host application.
    if (provider && typeof provider.LoadBank === "function")
    {
        return (bank, context) => provider.LoadBank(bank, context);
    }
    // Host feature check: the bank provider is supplied by the host application.
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

function defaultInspectBank(bytes, { source })
{
    if (!bytes)
    {
        throw new TypeError("Default audio bank inspection requires bytes");
    }

    return CjsBnkFormat.inspect(bytes, { source });
}

function requireMusicBanks(library, enabled)
{
    if (!enabled)
    {
        return;
    }

    const names = new Set(
        Object.values(library.banks)
            .map(bank => CjsAudioLibraryBuilderUtils.bankSourceName(bank.resPath)),
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
        const sourceName = CjsAudioLibraryBuilderUtils.bankSourceName(key);
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
        const bankID = CjsAudioLibraryBuilderUtils.normalizeUnsignedID(
            override?.bankID ?? authored.id,
            `Audio bank ${logicalPath} bankID`,
        );
        const authoredLanguageID = authored.language
            ? CjsBnkFormat.wwise.wwiseIdFromName(authored.language)
            : 0;
        const languageID = CjsAudioLibraryBuilderUtils.normalizeUnsignedID(
            override?.languageID ?? authoredLanguageID,
            `Audio bank ${logicalPath} languageID`,
        );

        if (override?.bankID !== undefined
            && String(bankID) !== String(CjsAudioLibraryBuilderUtils.normalizeUnsignedID(
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
            && String(languageID) !== String(CjsAudioLibraryBuilderUtils.normalizeUnsignedID(
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
        const bankID = CjsAudioLibraryBuilderUtils.normalizeUnsignedID(
            inspection?.bankId,
            "Audio inspection bankId",
        );
        const languageID = CjsAudioLibraryBuilderUtils.normalizeUnsignedID(
            inspection?.languageId ?? 0,
            `Audio inspection ${bankID} languageId`,
        );
        const group = groups.get(bankID) ?? [];

        if (group.some(value =>
            CjsAudioLibraryBuilderUtils.normalizeUnsignedID(value.languageId ?? 0, "Audio languageId")
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
        CjsAudioLibraryBuilderUtils.bankSourceName(left?.source),
        CjsAudioLibraryBuilderUtils.bankSourceName(right?.source),
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

    for (const [ name, record ] of CjsAudioLibraryBuilderUtils.metadataEntries(
        metadata?.Events,
        "Audio metadata Events",
    ))
    {
        eventNamesByID.set(Number(record.eventID) >>> 0, name);
    }

    const eventTargets = {};
    const eventStops = {};
    const switchSetters = {};
    const programs = {};
    const musicGroups = MusicArgumentGroups(nodes);
    const eventsWithOtherActions = new Set();

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

            const actionIDs = eventActionIDs(event);

            if (actionIDs.some(actionID =>
            {
                const candidate = actionsByID.get(actionID);
                const family = candidate
                    ? (actionFields(candidate).actionType >> 8) & 0xff
                    : null;

                return family !== 0x02 && family !== 0x03;
            }))
            {
                eventsWithOtherActions.add(name);
            }

            for (const actionID of actionIDs)
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
                    const identity = CjsAudioLibraryBuilderUtils.readSetterActionIDs(
                        fields.action,
                        fields.payload,
                        `Music setter action ${actionID}`,
                    );

                    if (!musicGroups.has(identity.groupID))
                    {
                        continue;
                    }
                    const setter = ReadMusicSetterAction(
                        fields,
                        actionID,
                        family,
                        identity,
                    );
                    const values = switchSetters[name]
                        ?? (switchSetters[name] = []);

                    values.push(setter);
                }
                else if (family === 0x02 || family === 0x03)
                {
                    const playbackControl = ReadMusicPlaybackControlAction(
                        action,
                        family === 0x02 ? "pause" : "resume",
                        nodes,
                    );
                    if (!playbackControl)
                    {
                        continue;
                    }
                    const program = programs[name]
                        ?? (programs[name] = []);

                    program.push(playbackControl);
                }
            }
        }
    }

    const roots = new Set(
        Object.values(eventTargets).flat().map(String),
    );

    for (const [ name, actions ] of Object.entries(programs))
    {
        if (eventsWithOtherActions.has(name))
        {
            throw new Error(
                `unsupported ordered Music action mix ${name}`,
            );
        }
        programs[name] = actions.filter(action =>
            action.mode === "all" || roots.has(action.targetId));
        if (!programs[name].length)
        {
            delete programs[name];
        }
        else if (eventTargets[name]?.length
            || eventStops[name]?.length
            || switchSetters[name]?.length)
        {
            throw new Error(
                `unsupported ordered Music action mix ${name}`,
            );
        }
    }

    return {
        eventTargets: normalizeTargetTable(eventTargets),
        eventStops: normalizeTargetTable(eventStops),
        switchSetters: normalizeSetterTable(switchSetters),
        programs: normalizeMusicProgramTable(programs),
    };
}

/** Retains only the authored music playback controls qualified by EVE banks. */
function ReadMusicPlaybackControlAction(action, kind, nodes)
{
    const result = CjsAudioLibraryBuilderUtils.readSfxPlaybackControlAction(action, kind);
    const unsupported = [
        "delayMs",
        "delayRangeMs",
        "transitionRangeMs",
        "probability",
    ].find(field => result[field] !== undefined);

    if (unsupported !== undefined)
    {
        throw new Error(
            `unsupported Music ${kind} ${unsupported} ${action.id}`,
        );
    }
    if (result.scope !== "game-object"
        || (result.mode !== "element" && result.mode !== "all")
        || result.targetFlags !== 0
        || result.exceptions.length)
    {
        throw new Error(`unsupported Music ${kind} form ${action.id}`);
    }
    if (result.mode === "element" && !nodes[result.targetId])
    {
        return null;
    }
    if (result.mode === "all" && result.targetId !== "0")
    {
        throw new Error(`invalid Music ${kind} all target ${action.id}`);
    }
    if (!Number.isSafeInteger(result.curve)
        || result.curve < 0
        || result.curve > 9)
    {
        throw new Error(`invalid Music ${kind} curve ${action.id}`);
    }
    const transitionMs = Number(result.transitionMs ?? 0);

    if (!Number.isFinite(transitionMs) || transitionMs < 0)
    {
        throw new Error(`invalid Music ${kind} transition ${action.id}`);
    }
    return {
        ...result,
        transitionMs,
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

function ReadMusicSetterAction(fields, actionID, family, identity)
{
    const details = fields.action ?? {};
    const { groupID, valueID } = identity;
    const delayMs = CjsAudioLibraryBuilderUtils.readExactSetterDelay(details, {
        actionID,
        actionType: fields.actionType,
        family,
        targetID: fields.targetID,
        label: "Music setter action",
    });
    const result = {
        kind: family === 0x19 ? "switch" : "state",
        groupId: groupID,
        targetId: valueID,
    };

    if (delayMs !== undefined)
    {
        result.delayMs = delayMs;
    }
    return result;
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
        action: entry.action ?? null,
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
            for (const field of [
                "delayRangeMs",
                "probability",
                "transitionMs",
                "transitionTimeMs",
                "transitionRangeMs",
                "properties",
                "ranges",
            ])
            {
                if (setter[field] !== undefined)
                {
                    throw new TypeError(
                        `Music setter ${name} has unsupported ${field}`,
                    );
                }
            }
            const normalized = {
                kind: setter.kind,
                groupId: Number(setter.groupId) >>> 0,
                targetId: Number(setter.targetId) >>> 0,
                ...(setter.delayMs === undefined
                    ? {}
                    : { delayMs: Number(setter.delayMs) }),
            };

            unique.set(
                `${normalized.kind}:${normalized.groupId}:`
                    + `${normalized.targetId}:`
                    + `${Number(normalized.delayMs) || 0}`,
                normalized,
            );
        }

        result[name] = [ ...unique.values() ];
    }

    return result;
}

function normalizeMusicProgramTable(table)
{
    const result = {};

    for (const name of Object.keys(table ?? {}).sort())
    {
        result[name] = table[name].map(action => ({
            kind: action.kind,
            targetId: String(Number(action.targetId) >>> 0),
            targetFlags: Number(action.targetFlags),
            scope: action.scope,
            mode: action.mode,
            curve: Number(action.curve),
            actionFlags: Number(action.actionFlags),
            exceptions: [],
            transitionMs: Number(action.transitionMs),
        }));
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

    const bankNames = music.banks.map(CjsAudioLibraryBuilderUtils.bankSourceName);

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

        if (!bankNames.includes(CjsAudioLibraryBuilderUtils.bankSourceName(node.bank)))
        {
            throw new TypeError(
                `Audio library music node ${id} references unknown bank: ${node.bank}`,
            );
        }
        ValidateMusicBusRouting(node, id);
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

            const delayMs = Number(setter.delayMs ?? 0);

            if (!Number.isFinite(delayMs) || delayMs < 0)
            {
                throw new TypeError(
                    `Audio library music switchSetters.${name} has an invalid delay`,
                );
            }
            return `${setter.kind}:${setter.groupId}:${setter.targetId}:${delayMs}`;
        });

        if (new Set(keys).size !== keys.length)
        {
            throw new TypeError(
                `Audio library music switchSetters.${name} has duplicate setters`,
            );
        }
    }

    ValidateMusicPrograms(
        music.programs,
        music.nodes,
        music.eventTargets,
        music.eventStops,
        music.switchSetters,
    );
}

function ValidateMusicPrograms(
    programs,
    nodes,
    eventTargets,
    eventStops,
    switchSetters,
)
{
    if (programs === undefined)
    {
        return;
    }
    if (!programs || typeof programs !== "object" || Array.isArray(programs))
    {
        throw new TypeError("Audio library music programs must be an object");
    }
    const roots = new Set(
        Object.values(eventTargets ?? {}).flat().map(value =>
            CjsAudioLibraryBuilderUtils.normalizeUnsignedID(value, "Audio library music event target")),
    );
    for (const [ name, actions ] of Object.entries(programs))
    {
        if (eventTargets?.[name]?.length
            || eventStops?.[name]?.length
            || switchSetters?.[name]?.length)
        {
            throw new TypeError(
                `Audio library music programs.${name} has an ordered action mix`,
            );
        }
        if (!Array.isArray(actions) || !actions.length)
        {
            throw new TypeError(
                `Audio library music programs.${name} must be non-empty`,
            );
        }
        for (const action of actions)
        {
            const expectedFlags = action?.kind === "pause" ? 7 : 6;
            const targetId = CjsAudioLibraryBuilderUtils.normalizeUnsignedID(
                action?.targetId,
                `Audio library music programs.${name} targetId`,
            );
            const transitionMs = Number(action?.transitionMs);
            const unsupported = [
                "delayMs",
                "delayRangeMs",
                "transitionRangeMs",
                "probability",
            ].some(field => action?.[field] !== undefined);

            if (!action || ![ "pause", "resume" ].includes(action.kind)
                || action.scope !== "game-object"
                || ![ "element", "all" ].includes(action.mode)
                || Number(action.targetFlags) !== 0
                || Number(action.actionFlags) !== expectedFlags
                || !Array.isArray(action.exceptions)
                || action.exceptions.length
                || !Number.isSafeInteger(Number(action.curve))
                || Number(action.curve) < 0
                || Number(action.curve) > 9
                || !Number.isFinite(transitionMs)
                || transitionMs < 0
                || unsupported)
            {
                throw new TypeError(
                    `Audio library music programs.${name} has an invalid action`,
                );
            }
            if ((action.mode === "element"
                    && (!nodes[targetId] || !roots.has(targetId)))
                || (action.mode === "all" && targetId !== "0"))
            {
                throw new TypeError(
                    `Audio library music programs.${name} has an invalid target`,
                );
            }
        }
    }
}

function normalizeMusicGraph(music)
{
    return {
        schemaVersion: 1,
        generator: String(music.generator ?? "@carbonenginejs/runtime/audio/library-builder"),
        banks: [ ...new Set((music.banks ?? []).map(CjsAudioLibraryBuilderUtils.bankSourceName)) ].sort(),
        nodes: sortedKeys(music.nodes),
        eventTargets: normalizeTargetTable(music.eventTargets),
        eventStops: normalizeTargetTable(music.eventStops),
        switchSetters: normalizeSetterTable(music.switchSetters),
        programs: normalizeMusicProgramTable(music.programs),
    };
}

function ValidateMusicBusRouting(node, id)
{
    const hasOutput = node.outputBusId !== undefined;
    const hasPath = node.busPathIds !== undefined;
    const hasAuthored = node.authoredBusVolumeDb !== undefined;
    const hasMakeUp = node.authoredBusMakeUpGainDb !== undefined;
    const hasOutputVolume = node.authoredOutputBusVolumeDb !== undefined;

    if (node.type !== "music-track"
        && (hasOutput || hasPath || hasAuthored || hasMakeUp || hasOutputVolume))
    {
        throw new TypeError(
            `Audio library music node ${id} bus routing is track-only`,
        );
    }

    if (!hasOutput)
    {
        if (hasPath || hasAuthored || hasMakeUp || hasOutputVolume)
        {
            throw new TypeError(
                `Audio library music node ${id} bus routing requires outputBusId`,
            );
        }
        return;
    }

    const outputBusId = Number(node.outputBusId);

    if (!Number.isSafeInteger(outputBusId) || outputBusId <= 0)
    {
        throw new TypeError(
            `Audio library music node ${id} outputBusId must be a positive id`,
        );
    }
    if (!Array.isArray(node.busPathIds) || !node.busPathIds.length)
    {
        throw new TypeError(
            `Audio library music node ${id} busPathIds must be non-empty`,
        );
    }

    const path = node.busPathIds.map(Number);

    if (path.some(value => !Number.isSafeInteger(value) || value <= 0)
        || String(path[0]) !== String(outputBusId)
        || new Set(path).size !== path.length)
    {
        throw new TypeError(
            `Audio library music node ${id} has invalid busPathIds`,
        );
    }
    if (hasAuthored && !Number.isFinite(Number(node.authoredBusVolumeDb)))
    {
        throw new TypeError(
            `Audio library music node ${id} authoredBusVolumeDb must be finite`,
        );
    }
    if (hasMakeUp && !Number.isFinite(Number(node.authoredBusMakeUpGainDb)))
    {
        throw new TypeError(
            `Audio library music node ${id} authoredBusMakeUpGainDb must be finite`,
        );
    }
    if (hasOutputVolume
        && !Number.isFinite(Number(node.authoredOutputBusVolumeDb)))
    {
        throw new TypeError(
            `Audio library music node ${id} authoredOutputBusVolumeDb must be finite`,
        );
    }
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

CjsSchema.meta.define(CjsAudioLibraryBuilder, { className: "CjsAudioLibraryBuilder" });
