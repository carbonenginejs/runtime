import { coerceNonNegativeInteger, coercePositiveInteger } from "#utils/validation";
import { throwIfAborted } from "#utils/errors";
import { normalizeResourcePath } from "#utils/path";

// CarbonEngineJS original (no Carbon counterpart). Browser-only audio
// composition root that installs one complete semantic library and owns
// media selection, delivery, preparation, and decoded-buffer retention.
import { CjsAudioSystem } from "./CjsAudioSystem.js";
import { CjsJukebox } from "./CjsJukebox.js";
import { CjsSfxEngine } from "./CjsSfxEngine.js";
import { AudListener } from "./trinity/audio/AudListener.js";
import { AudMusicPlayer } from "./trinity/audio/AudMusicPlayer.js";
import {
    installAudioLibraryDocument,
} from "./library/audioLibraryDocument.js";
import {
    normalizeWwiseDynamicsMode,
    normalizeWwiseDistortionMode,
    normalizeWwiseModulationMode,
    normalizeWwiseMeterFeedbackMode,
    normalizeWwiseReverbMode,
    normalizeWwiseRoomVerbMode,
    normalizeWwiseVoiceLimitMode,
} from "./internal/busEffects.js";
import {
    CjsAudioManSharedAcquisition,
} from "./internal/CjsAudioManSharedAcquisition.js";
import {
    normalizeWwiseObstructionOcclusionMode,
} from "./internal/obstructionOcclusion.js";

const DELIVERY_MODES = new Set([ "auto", "individual", "whole", "range" ]);
const ORIGINAL_MEDIA_TYPES = new Set([
    "",
    "application/octet-stream",
    "bnk",
    "wem",
]);

/**
 * Installs one complete audio-library document and owns media selection,
 * delivery, preparation, decode retention, and the composed audio system.
 *
 * Lifecycle: construct with a document and provider (or `InstallLibrary()`),
 * call `Enable(soundBanks)` from a browser gesture, create or adopt emitters
 * and drive `Process(updateContext)`, then release emitters/media or
 * `Dispose()`. Playback is scheduled on the AudioContext clock, not the host
 * update context.
 *
 * Failure signals: `InstallLibrary()` throws for anything but a current
 * schema-v2 document; `Enable()` returns `false` when no AudioContext could
 * be created (requested banks stay pending); `ResolveMedia()` throws when no
 * representation/provider route exists; `LoadMedia()` rejects on acquisition,
 * range, preparation or decode failure.
 *
 * Changing the effective provider, delivery mode or languages clears decoded
 * media and the music engine's retained media. `ReleaseMedia()`,
 * `ClearMedia()` and `ClearSourceData()` drop retained data without
 * cancelling active callers; provider replacement and disposal abort every
 * pending acquisition.
 */
export class CjsAudioMan
{
    _cacheDecoded = true;

    _cacheWholeBanks = true;

    _context = null;

    _createContext = null;

    _decodedMedia = new Map();

    _defaultSoundBanks = new Set();

    _delivery = "auto";

    _languages = [];

    _languagesExplicit = false;

    _library = null;

    _jukebox = null;

    _listener = null;

    _musicPlayer = null;

    _mediaProvider = null;

    _resourceLoader = null;

    _loadOperations = new Map();

    _installGeneration = 0;

    _banksWaitingToLoad = new Set();

    _selectEventMedia = null;

    _sfxEngine = null;

    _system = null;

    _systemOptions = null;

    _timedSilenceBuffer = null;

    _wholeBanks = new Map();

    _random = null;

    /**
     * Creates an uninstalled manager or installs the supplied complete
     * audio-library document immediately.
     *
     * Construction never creates an AudioContext or performs media I/O.
     * `mediaProvider` and `resourceLoader` are forwarded to
     * `SetMediaProvider()` and `SetResourceLoader()`. `defaultSoundBanks`
     * names banks that are requested on every `Enable()` and cannot be
     * unloaded through the bank-intent methods. `musicLibrary`,
     * `loadMusicTrack` and `isMusicTrackAvailable` opt into `jukebox`; the
     * manager never fetches a song's `url` or `path` itself.
     *
     * Effect policies are host runtime options, never stored in the library
     * document. Each defaults to `"strict"`; any value other than `"strict"`
     * or its one opt-in value throws synchronously, and one policy never
     * enables another. `CjsAudioSystem` forwards them to the backend; only
     * `wwiseDynamics`, `wwiseMeterFeedback` and `wwiseVoiceLimits` reach the
     * shared bus mixer. Opt-in admission is a bounded browser approximation,
     * not Wwise DSP equivalence.
     *
     * | Option | Opt-in value | Admits | Strict outcome |
     * | --- | --- | --- | --- |
     * | `wwiseDynamics` | `"approximate-web-audio"` | static linked Compressor/Peak Limiter, shared bus and source-local | shared route blocked; source chain omitted, voice dry |
     * | `wwiseModulation` | `"approximate-web-audio"` | source-local Flanger/Tremolo static and qualified dynamic forms | source chain omitted, voice dry |
     * | `wwiseReverb` | `"approximate-web-audio"` | source-local Matrix Reverb default-delay subset | source chain omitted, voice dry |
     * | `wwiseRoomVerb` | `"approximate-web-audio"` | source-local static v150 RoomVerb | source chain omitted, voice dry |
     * | `wwiseDistortion` | `"approximate-web-audio"` | fully-wet v150 Guitar Distortion and its qualified Drive RTPC form | source chain omitted, voice dry |
     * | `wwiseObstructionOcclusion` | `"approximate-web-audio"` | fixed blockage filter/attenuation on emitter routes | backend accepts updates without DSP; `AudManager` state still runs |
     * | `wwiseMeterFeedback` | `"omit-telemetry"` | static target-bearing Meter; no Game Parameter feedback produced | shared route blocked or source chain dry |
     * | `wwiseVoiceLimits` | `"ignore"` | routes whose only barrier is a dynamic Audio Bus `MaxNumInstances` RTPC; count is not enforced | route stays outside shared routing |
     */
    constructor(library = null, {
        mediaProvider = null,
        resourceLoader = null,
        createContext = CreateBrowserAudioContext,
        delivery = "auto",
        languages = null,
        defaultSoundBanks = [],
        cacheDecoded = true,
        cacheWholeBanks = true,
        selectEventMedia = null,
        random = Math.random,
        distanceScale = 1,
        musicEngine = null,
        createMusicEngine = null,
        applyRTPC = null,
        musicLibrary = null,
        loadMusicTrack = null,
        isMusicTrackAvailable = null,
        updateContext = null,
        wwiseDynamics = "strict",
        wwiseDistortion = "strict",
        wwiseModulation = "strict",
        wwiseReverb = "strict",
        wwiseRoomVerb = "strict",
        wwiseMeterFeedback = "strict",
        wwiseObstructionOcclusion = "strict",
        wwiseVoiceLimits = "strict",
    } = {})
    {
        if (typeof createContext !== "function")
        {
            throw new TypeError("CjsAudioMan createContext must be a function");
        }
        if (selectEventMedia !== null
            && typeof selectEventMedia !== "function")
        {
            throw new TypeError(
                "CjsAudioMan selectEventMedia must be a function",
            );
        }
        if (typeof random !== "function")
        {
            throw new TypeError("CjsAudioMan random must be a function");
        }

        this._createContext = createContext;
        this._delivery = NormalizeDelivery(delivery);
        this._languagesExplicit = languages !== null;
        this._languages = NormalizeLanguages(languages ?? []);
        this._defaultSoundBanks = new Set(
            NormalizeBankNames(defaultSoundBanks),
        );
        this._cacheDecoded = Boolean(cacheDecoded);
        this._cacheWholeBanks = Boolean(cacheWholeBanks);
        this._selectEventMedia = selectEventMedia;
        this._random = random;
        this._systemOptions = {
            distanceScale,
            musicEngine,
            createMusicEngine,
            applyRTPC,
            updateContext,
            wwiseDynamics: normalizeWwiseDynamicsMode(wwiseDynamics),
            wwiseDistortion: normalizeWwiseDistortionMode(
                wwiseDistortion,
            ),
            wwiseModulation: normalizeWwiseModulationMode(
                wwiseModulation,
            ),
            wwiseReverb: normalizeWwiseReverbMode(wwiseReverb),
            wwiseRoomVerb: normalizeWwiseRoomVerbMode(wwiseRoomVerb),
            wwiseMeterFeedback: normalizeWwiseMeterFeedbackMode(
                wwiseMeterFeedback,
            ),
            wwiseObstructionOcclusion:
                normalizeWwiseObstructionOcclusionMode(
                    wwiseObstructionOcclusion,
                ),
            wwiseVoiceLimits: normalizeWwiseVoiceLimitMode(
                wwiseVoiceLimits,
            ),
        };

        if (musicLibrary !== null
            || loadMusicTrack !== null
            || isMusicTrackAvailable !== null)
        {
            this._jukebox = new CjsJukebox({
                library: musicLibrary,
                loadTrack: loadMusicTrack,
                isTrackAvailable: isMusicTrackAvailable,
            });
        }

        if (mediaProvider !== null)
        {
            this.SetMediaProvider(mediaProvider);
        }
        if (resourceLoader !== null)
        {
            this.SetResourceLoader(resourceLoader);
        }
        if (library !== null)
        {
            this.InstallLibrary(library);
        }
    }

    /** Returns the installed immutable audio-library document. */
    get library()
    {
        return this._library;
    }

    /** Returns the active low-level audio system, when a library is installed. */
    get system()
    {
        return this._system;
    }

    /** Returns the Carbon audio manager, when a library is installed. */
    get manager()
    {
        return this._system?.manager ?? null;
    }

    /** Returns the installed static-data repository. */
    get repository()
    {
        return this._system?.repository ?? null;
    }

    /** Returns the manager-owned fixed Carbon listener. */
    get listener()
    {
        return this._listener;
    }

    /** Returns Carbon's manager-owned, lazily created fixed music emitter. */
    get musicPlayer()
    {
        return this.GetMusicPlayer();
    }

    /** Returns the realized Web Audio backend after successful enablement. */
    get backend()
    {
        return this._system?.backend ?? null;
    }

    /** Returns the active built-in or injected music engine. */
    get musicEngine()
    {
        return this._system?.musicEngine ?? null;
    }

    /** Returns the optional neutral playlist player. */
    get jukebox()
    {
        return this._jukebox;
    }

    /** Returns the active authored SFX interpreter, when installed. */
    get sfxEngine()
    {
        return this._sfxEngine;
    }

    /** Returns the browser audio context after successful enablement. */
    get context()
    {
        return this._context;
    }

    /** Returns the normalized host frame context owned by the audio system. */
    get updateContext()
    {
        return this._system?.updateContext ?? null;
    }

    /** Returns the protected default bank names in deterministic order. */
    get defaultSoundBanks()
    {
        return [ ...this._defaultSoundBanks ].sort();
    }

    /** Returns bank intents retained for the next successful enable. */
    get banksWaitingToLoad()
    {
        return [ ...this._banksWaitingToLoad ].sort();
    }

    /**
     * Validates, detaches, and freezes one complete audio-library document.
     *
     * Replacing an installed library is allowed only while audio is disabled;
     * the old system and its adopted emitters are disposed.
     */
    InstallLibrary(library)
    {
        if (this._system?.manager?.enabled)
        {
            throw new Error(
                "CjsAudioMan cannot replace its library while enabled",
            );
        }

        this._installGeneration += 1;
        const installed = installAudioLibraryDocument(library);
        const stateTransitions = MergeStateTransitions(
            installed.sfx?.stateTransitions,
            installed.busStates?.stateTransitions,
        );

        this._jukebox?.Detach();
        this._system?.Dispose();
        this._listener = null;
        this._musicPlayer = null;
        this._sfxEngine?.Reset();
        this._InvalidateAcquisitions(
            "Audio library replaced during media acquisition",
        );
        this._library = installed;
        this._sfxEngine = installed.sfx
            ? new CjsSfxEngine({
                graph: installed.sfx,
                random: this._random,
            })
            : null;
        this._system = new CjsAudioSystem({
            ...this._systemOptions,
            createContext: () =>
            {
                const context = this._context ?? this._createContext();

                this._context = context ?? null;
                return this._context;
            },
            audioMetadata: installed.metadata,
            musicGraph: installed.music ?? null,
            busRtpcs: installed.busRtpcs ?? null,
            busStates: installed.busStates ?? null,
            busDucking: installed.busDucking ?? null,
            busEffects: installed.busEffects ?? null,
            busGraph: installed.busGraph ?? null,
            loadBuffer: (
                eventID,
                eventName,
                controls,
                resolvedProgram,
            ) =>
                this._LoadEventBuffer(
                    eventID,
                    eventName,
                    controls,
                    resolvedProgram,
                ),
            resolveSfxProgram: (_eventID, eventName, controls) =>
                this._sfxEngine?.HandlesEvent(eventName)
                    ? this._sfxEngine.ResolveProgram(
                        eventName,
                        controls,
                    ) ?? []
                    : null,
            continueSfxProgram: (token, controls) =>
                this._sfxEngine?.ContinueProgram(
                    token,
                    controls,
                ) ?? [],
            prepareSfxProgram: (token, controls) =>
                this._sfxEngine?.PrepareProgram(
                    token,
                    controls,
                ) ?? {
                    program: [],
                    commit() {},
                    rollback() {},
                },
            stateTransitions,
            hasEventStops: eventName =>
                this._sfxEngine?.HasStopAction(eventName) === true,
            hasSfxEvent: eventName =>
                this._sfxEngine?.HandlesEvent(eventName) === true
                || Array.isArray(installed.eventMedia?.[eventName]),
            loadMedia: sourceID => this.LoadMedia(sourceID),
            releaseGameObj: gameObjID =>
                this._sfxEngine?.ReleaseGameObj(gameObjID),
        });
        this._listener = new AudListener();
        this._listener.SetPosition(
            [ 0, 0, 1 ],
            [ 0, 1, 0 ],
            [ 0, 0, 0 ],
        );
        this._listener.MarkPositionReceived();
        this._system.AdoptEmitter(this._listener);

        if (!this._languagesExplicit)
        {
            this._languages = installed.eventMediaLanguage
                ? NormalizeLanguages([ installed.eventMediaLanguage ])
                : [];
        }

        return installed;
    }

    /** Supplies the object loader used to obtain a complete library document. */
    SetResourceLoader(loader)
    {
        if (loader !== null && typeof loader !== "function")
        {
            throw new TypeError(
                "Audio library resource loader must be a function or null",
            );
        }

        this._resourceLoader = loader;
        return this;
    }

    /** Loads and installs a complete library through the configured synchronous loader. */
    LoadLibrary(filePath)
    {
        if (!this._resourceLoader)
        {
            return false;
        }

        const path = NormalizeLibraryPath(filePath);
        const value = this._resourceLoader(path);

        if (value && typeof value.then === "function")
        {
            throw new TypeError(
                "CjsAudioMan.LoadLibrary requires a synchronous loader",
            );
        }

        if (!value)
        {
            return false;
        }

        this.InstallLibrary(value);
        return true;
    }

    /** Loads and installs one complete library while deduplicating equivalent in-flight paths. */
    async LoadLibraryAsync(filePath)
    {
        const loader = this._resourceLoader;

        if (!loader)
        {
            return false;
        }

        const path = NormalizeLibraryPath(filePath);
        const existing = this._loadOperations.get(path);

        if (existing)
        {
            return existing;
        }

        const generation = ++this._installGeneration;
        const operation = Promise.resolve()
            .then(() => loader(path))
            .then(value =>
            {
                if (!value)
                {
                    return false;
                }
                if (this._installGeneration !== generation)
                {
                    return false;
                }

                this.InstallLibrary(value);
                return true;
            });
        this._loadOperations.set(path, operation);

        const clear = () =>
        {
            if (this._loadOperations.get(path) === operation)
            {
                this._loadOperations.delete(path);
            }
        };

        operation.then(clear, clear);
        return operation;
    }

    /**
     * Builds and installs a library from raw resources through the domain
     * builder, defaulting its byte source to the installed media provider.
     *
     * Raw builds decode the FSD metadata and open every selected bank on the
     * client; a prepared document through LoadLibraryAsync stays the fast
     * path for applications.
     */
    async BuildLibraryFromResources(options = {})
    {
        const { CjsAudioLibraryBuilder } = await import(
            "#audio/library-builder"
        );
        const provider = this._mediaProvider;
        const hasSource = options.source !== undefined
            || options.read !== undefined;
        const generation = ++this._installGeneration;
        const library = await CjsAudioLibraryBuilder.buildFromResources(
            !hasSource && provider && typeof provider.Read === "function"
                ? {
                    ...options,
                    source: (path, context = {}) =>
                        provider.Read(path, context),
                }
                : options,
        );

        if (this._installGeneration !== generation)
        {
            return false;
        }

        this.InstallLibrary(library.GetValues());
        return true;
    }

    /** Installs or replaces the optional neutral music-library catalog. */
    InstallMusicLibrary(library)
    {
        this._jukebox ??= new CjsJukebox();
        const installed = this._jukebox.InstallLibrary(library);

        if (this._context && this._system?.backend?.masterGain)
        {
            this._jukebox.Attach(
                this._context,
                this._system.backend.masterGain,
            );
        }
        return installed;
    }

    /** Installs the caller-owned music-track acquisition function. */
    SetMusicTrackLoader(loadTrack)
    {
        this._jukebox ??= new CjsJukebox();
        this._jukebox.SetTrackLoader(loadTrack);
        return this._jukebox;
    }

    /** Installs the caller-owned music-track availability probe. */
    SetMusicTrackAvailabilityChecker(isTrackAvailable)
    {
        this._jukebox ??= new CjsJukebox();
        this._jukebox.SetTrackAvailabilityChecker(isTrackAvailable);
        return this._jukebox;
    }

    /**
     * Returns Carbon's fixed-id music emitter, creating and adopting it once.
     *
     * This emitter remains the authored Wwise event/switch/RTPC facade. The
     * neutral `jukebox` property is a separate direct-track player.
     */
    GetMusicPlayer()
    {
        const system = this._RequireSystem();
        const existing = system.manager.GetAudioEmitter(3);

        if (existing)
        {
            if (!(existing instanceof AudMusicPlayer))
            {
                throw new Error(
                    "Audio game-object ID 3 is not an AudMusicPlayer",
                );
            }
            this._musicPlayer = existing;
            return existing;
        }

        this._musicPlayer = system.AdoptEmitter(new AudMusicPlayer());
        return this._musicPlayer;
    }

    /**
     * Installs the structural provider used for future individual, whole-file,
     * and ranged reads. Providers perform acquisition only; they do not select
     * audio-library records.
     *
     * The provider receives exact document records, never filenames:
     * - `Read(record, { signal, kind, mediaID, ... })` reads an individual
     *   `media` record (`kind: "media"`) or a whole original bank
     *   (`kind: "bank"`) that the manager slices locally;
     * - `ReadRange?(bankRecord, { signal, kind, mediaID, offset, byteLength })`
     *   returns exactly `byteLength` bytes, or a complete original file
     *   (`complete: true`, or long enough) that is sliced locally;
     * - `CanRead?(record, context)` and `CanReadRange?(bankRecord, context)`
     *   exclude a candidate route when they return `false`.
     *
     * A read may return bytes, `{ bytes, mediaType }`, `{ audioBuffer }`, an
     * AudioBuffer-like value, or `{ channelData, sampleRate }` PCM. The
     * provider cannot change while audio is enabled; replacing it aborts every
     * pending acquisition and clears retained music media.
     */
    SetMediaProvider(provider)
    {
        if (!provider
            || (typeof provider.Read !== "function"
                && typeof provider.ReadRange !== "function"))
        {
            throw new TypeError(
                "CjsAudioMan mediaProvider must provide Read or ReadRange",
            );
        }
        if (this._system?.manager?.enabled)
        {
            throw new Error(
                "CjsAudioMan cannot replace its media provider while enabled",
            );
        }

        this._InvalidateAcquisitions(
            "Audio media provider replaced during acquisition",
        );
        this._system?.ClearMusicMedia();
        this._mediaProvider = provider;
        return this;
    }

    /**
     * Sets the delivery constraint used for future selections.
     *
     * `auto` prefers individual prepared/original media, then embedded range
     * reads, then whole-bank reads. `individual` excludes embedded media,
     * `whole` disables ranges, and `range` requires ranges for embedded media.
     * A change clears the decoded-media cache and retained music media.
     */
    SetDelivery(delivery)
    {
        const value = NormalizeDelivery(delivery);

        if (value !== this._delivery)
        {
            this._delivery = value;
            this._decodedMedia.clear();
            this._system?.ClearMusicMedia();
        }
        return this;
    }

    /**
     * Sets the ordered language preferences used for future selections. A
     * change clears the decoded-media cache and retained music media.
     */
    SetLanguages(languages)
    {
        const values = NormalizeLanguages(languages);

        this._languagesExplicit = true;
        if (values.join("\0") !== this._languages.join("\0"))
        {
            this._languages = values;
            this._decodedMedia.clear();
            this._system?.ClearMusicMedia();
        }
        return this;
    }

    /**
     * Resolves one playable representation without reading or decoding it.
     *
     * The returned descriptor identifies the exact provider operation:
     * individual file, whole bank plus a local slice, or bank range.
     */
    ResolveMedia(mediaID, {
        mediaTypes = [],
        languages = this._languages,
        delivery = this._delivery,
    } = {})
    {
        if (!this._library)
        {
            throw new Error("CjsAudioMan has no installed audio library");
        }
        if (!this._mediaProvider)
        {
            throw new Error("CjsAudioMan has no media provider");
        }

        const id = NormalizeMediaID(mediaID);
        const acceptedTypes = NormalizeMediaTypes(mediaTypes);
        const acceptedLanguages = NormalizeLanguages(languages);
        const mode = NormalizeDelivery(delivery);
        const candidates = this._CreateCandidates(id, mode)
            .map(candidate => ({
                candidate,
                mediaTypeRank: MediaTypeRank(
                    candidate.mediaType,
                    acceptedTypes,
                ),
                languageRank: LanguageRank(
                    candidate.language,
                    acceptedLanguages,
                ),
            }))
            .filter(item =>
                Number.isFinite(item.mediaTypeRank)
                && Number.isFinite(item.languageRank))
            .sort((left, right) =>
                left.mediaTypeRank - right.mediaTypeRank
                || left.languageRank - right.languageRank
                || left.candidate.sourceRank - right.candidate.sourceRank
                || left.candidate.sourceID.localeCompare(
                    right.candidate.sourceID,
                    "en",
                ));

        if (!candidates.length)
        {
            throw new Error(
                `No ${mode} representation is available for audio media ${id}`,
            );
        }

        return candidates[0].candidate;
    }

    /**
     * Reads, prepares, decodes, and optionally retains one audio media ID.
     *
     * Concurrent requests for the same selected representation share one
     * pending operation. `options.signal` cancels only the caller's lease;
     * the provider is aborted after its final pending lease ends. Failed and
     * orphaned operations are always evicted for retry.
     */
    LoadMedia(mediaID, options = {})
    {
        if (!this._context)
        {
            return Promise.reject(new Error(
                "CjsAudioMan must be enabled before media can be decoded",
            ));
        }

        let selection;

        try
        {
            selection = this.ResolveMedia(mediaID, options);
            throwIfAborted(options.signal, "Aborted");
        }
        catch (error)
        {
            return Promise.reject(error);
        }

        let entry = this._decodedMedia.get(selection.selectionKey);

        if (!entry)
        {
            entry = new CjsAudioManSharedAcquisition({
                start: signal => this._ReadAndDecode(selection, signal),
                evict: () =>
                {
                    if (this._decodedMedia.get(selection.selectionKey)
                        === entry)
                    {
                        this._decodedMedia.delete(selection.selectionKey);
                    }
                },
                retain: () => this._cacheDecoded,
            });

            this._decodedMedia.set(selection.selectionKey, entry);
        }
        return entry.Subscribe(options.signal);
    }

    /** Releases every retained decode variant for one media ID. */
    ReleaseMedia(mediaID)
    {
        const id = NormalizeMediaID(mediaID);
        let count = 0;

        for (const key of [ ...this._decodedMedia.keys() ])
        {
            if (key.startsWith(`${id}\0`))
            {
                this._decodedMedia.delete(key);
                count++;
            }
        }

        this._system?.ReleaseMusicMedia(id);
        return count;
    }

    /** Releases all decoded media retained by the manager and music engine. */
    ClearMedia()
    {
        const count = this._decodedMedia.size;

        this._decodedMedia.clear();
        this._system?.ClearMusicMedia();
        return count;
    }

    /** Releases whole-bank byte buffers retained for local embedded slicing. */
    ClearSourceData()
    {
        const count = this._wholeBanks.size;

        this._wholeBanks.clear();
        return count;
    }

    /** Aborts every pending acquisition owned by an invalidated manager setup. */
    _InvalidateAcquisitions(message)
    {
        const entries = new Set([
            ...this._decodedMedia.values(),
            ...this._wholeBanks.values(),
        ]);
        const reason = new DOMException(message, "AbortError");

        this._decodedMedia.clear();
        this._wholeBanks.clear();

        for (const entry of entries)
        {
            entry.Abort(reason);
        }
    }

    /** Acquires shared complete-bank bytes under the caller's own lease. */
    _LoadWholeBank(selection, signal)
    {
        const bankKey = String(
            selection.bank.sourceID
            ?? selection.source.bank
            ?? selection.bank.resPath
            ?? selection.bank.storagePath,
        );
        let entry = this._wholeBanks.get(bankKey);

        if (!entry)
        {
            entry = new CjsAudioManSharedAcquisition({
                start: operationSignal => Promise.resolve()
                    .then(() => this._mediaProvider.Read(
                        selection.bank,
                        {
                            signal: operationSignal,
                            kind: "bank",
                            mediaID: selection.mediaID,
                        },
                    ))
                    .then(ToDetachedBytes),
                evict: () =>
                {
                    if (this._wholeBanks.get(bankKey) === entry)
                    {
                        this._wholeBanks.delete(bankKey);
                    }
                },
                retain: () => this._cacheWholeBanks,
            });
            this._wholeBanks.set(bankKey, entry);
        }

        return entry.Subscribe(signal);
    }

    /** Attaches this manager to the static Carbon audio graph seams. */
    Attach()
    {
        return this._RequireSystem().Attach();
    }

    /** Detaches this manager from the static Carbon audio graph seams. */
    Detach()
    {
        this._system?.Detach();
    }

    /**
     * Attaches, realizes Web Audio, and enables Carbon audio.
     *
     * Call this from a browser user gesture. The default context factory uses
     * global AudioContext only at this point.
     */
    Enable(soundBanksToLoad = [])
    {
        const system = this._RequireSystem();
        const requested = new Set([
            ...this._defaultSoundBanks,
            ...this._banksWaitingToLoad,
            ...NormalizeBankNames(soundBanksToLoad),
        ]);

        system.Attach();
        const enabled = system.Enable([ ...requested ]);

        if (enabled)
        {
            this._jukebox?.Attach(
                this._context,
                system.backend?.masterGain ?? this._context?.destination,
            );
            this._banksWaitingToLoad.clear();
        }
        else if (!enabled)
        {
            for (const bank of requested)
            {
                this._banksWaitingToLoad.add(bank);
            }
        }
        return enabled;
    }

    /**
     * Disables Carbon audio without destroying the reusable AudioContext.
     *
     * The loaded and in-flight bank set is kept as pending intent for the
     * next `Enable()`, and the jukebox stops.
     */
    Disable()
    {
        if (this._system?.manager.GetStateValue() === 2)
        {
            this._banksWaitingToLoad = new Set(
                this._system.manager.GetLoadedSoundBanks(),
            );
        }
        this._jukebox?.Stop();
        this._system?.Disable();
    }

    /** Adds and loads one protected default soundbank. */
    AddAndLoadDefaultSoundBank(soundBankName)
    {
        const bank = NormalizeBankName(soundBankName);

        this._defaultSoundBanks.add(bank);
        this.LoadSoundBank(bank);
        return bank;
    }

    /** Removes and unloads one protected default soundbank. */
    RemoveAndUnloadDefaultSoundBank(soundBankName)
    {
        const bank = NormalizeBankName(soundBankName);

        if (!this._defaultSoundBanks.delete(bank))
        {
            return false;
        }
        return this.UnloadSoundBank(bank);
    }

    /**
     * Loads now when enabled, otherwise retains one bank intent for the next
     * successful `Enable()`.
     *
     * The bank-intent methods (`LoadSoundBank(s)`, `UnloadSoundBank(s)`,
     * `SwapSoundBanks()`, `ReloadSoundBanks()` and the default-bank helpers)
     * change desired state only. Backend banks are virtual, so none of them
     * reads library or media bytes; media is acquired per event.
     */
    LoadSoundBank(soundBankName)
    {
        const bank = NormalizeBankName(soundBankName);

        if (this._system?.manager.GetStateValue() === 2)
        {
            this._system.manager.LoadBank(bank);
        }
        else
        {
            this._banksWaitingToLoad.add(bank);
        }
        return bank;
    }

    /** Loads several banks through the same desired-state facade. */
    LoadSoundBanks(soundBanks)
    {
        return NormalizeBankNames(soundBanks).map(bank =>
            this.LoadSoundBank(bank));
    }

    /** Unloads one non-default bank or removes its pending load intent. */
    UnloadSoundBank(soundBankName)
    {
        const bank = NormalizeBankName(soundBankName);

        if (bank.toLowerCase() === "init.bnk"
            || this._defaultSoundBanks.has(bank))
        {
            return false;
        }

        this._banksWaitingToLoad.delete(bank);
        this._system?.manager.UnloadBank(bank);
        return true;
    }

    /** Unloads several non-default banks. */
    UnloadSoundBanks(soundBanks)
    {
        return NormalizeBankNames(soundBanks).filter(bank =>
            this.UnloadSoundBank(bank));
    }

    /** Reconciles non-default banks with one caller-owned desired set. */
    SwapSoundBanks(soundBanks)
    {
        const requested = new Set(NormalizeBankNames(soundBanks));
        const loaded = new Set(
            this._system?.manager.GetStateValue() === 2
                ? this._system.manager.GetLoadedSoundBanks()
                : this._banksWaitingToLoad,
        );
        const keep = new Set([
            "Init.bnk",
            ...this._defaultSoundBanks,
            ...requested,
        ]);
        const toLoad = [ ...requested ].filter(bank => !loaded.has(bank));
        const toUnload = [ ...loaded ].filter(bank => !keep.has(bank));

        this.LoadSoundBanks(toLoad);
        this.UnloadSoundBanks(toUnload);
        return {
            loaded: toLoad.sort(),
            unloaded: toUnload.sort(),
        };
    }

    /** Disables and re-enables while preserving the current desired banks. */
    ReloadSoundBanks()
    {
        const banks = this.GetLoadedSoundBanks();

        this.Disable();
        return this.Enable(banks);
    }

    /** Returns loaded and in-flight bank names from the Carbon manager. */
    GetLoadedSoundBanks()
    {
        return this._system?.manager.GetLoadedSoundBanks() ?? [];
    }

    /** Returns Carbon's numeric uninitialized/disabled/enabled state. */
    GetState()
    {
        return this._system?.manager.GetStateValue() ?? 0;
    }

    /** Sets one global RTPC when the audio manager is enabled. */
    SetGlobalRTPC(rtpcName, value)
    {
        if (rtpcName === "menu_main_music_level")
        {
            this._jukebox?.SetVolume(value);
        }
        return this._system?.manager.SetGlobalRTPC(rtpcName, value) ?? false;
    }

    /** Sets one global authored state when the audio manager is enabled. */
    SetState(stateGroup, stateName)
    {
        return this._system?.manager.SetState(stateGroup, stateName) ?? false;
    }

    /** Stops emitter-routed and directly posted backend playback. */
    StopAllPlayingSounds()
    {
        this._system?.manager.StopAll();
        this._system?.backend?.StopAll();
        this._jukebox?.Stop();
    }

    /** Drives culling, backend rendering, music, and log flushing. */
    Process(updateContext)
    {
        return this._system?.Process(updateContext) ?? null;
    }

    /** Creates and adopts one Carbon audio emitter. */
    CreateEmitter(descriptor = {})
    {
        return this._RequireSystem().CreateEmitter(descriptor);
    }

    /** Adopts one existing Carbon audio game object. */
    AdoptEmitter(emitter)
    {
        return this._RequireSystem().AdoptEmitter(emitter);
    }

    /** Adopts every audio game object reachable from a schema graph. */
    AdoptGraph(root)
    {
        return this._RequireSystem().AdoptGraph(root);
    }

    /** Stops and unregisters one adopted Carbon audio game object. */
    ReleaseEmitter(emitter)
    {
        const released = this._system?.ReleaseEmitter(emitter) ?? false;

        if (released && emitter === this._musicPlayer)
        {
            this._musicPlayer = null;
        }
        return released;
    }

    /** Releases every adopted audio game object reachable from a graph. */
    ReleaseGraph(root)
    {
        return this._system?.ReleaseGraph(root) ?? [];
    }

    /** Replaces the optional host or built-in music engine. */
    SetMusicEngine(engine, options)
    {
        return this._RequireSystem().SetMusicEngine(engine, options);
    }

    /** Posts an event directly to the active music engine. */
    PostMusicEvent(eventName, onFinished)
    {
        return this._system?.PostMusicEvent(eventName, onFinished) ?? 0;
    }

    /** Stops one directly posted or emitter-routed music event. */
    StopMusicEvent(playingID, fadeOutDuration = 1000)
    {
        return this._system?.StopMusicEvent(
            playingID,
            fadeOutDuration,
        ) ?? false;
    }

    /** Stops playback and releases graph, decode, and source-byte state. */
    Dispose()
    {
        this._jukebox?.Dispose();
        this._jukebox = null;
        this._system?.Dispose();
        this._system = null;
        this._listener = null;
        this._musicPlayer = null;
        this._sfxEngine?.Reset();
        this._sfxEngine = null;
        this._context = null;
        this._timedSilenceBuffer = null;
        this._banksWaitingToLoad.clear();
        this._InvalidateAcquisitions(
            "Audio manager disposed during media acquisition",
        );
    }

    /** Returns the installed lower-level system or rejects an uninstalled use. */
    _RequireSystem()
    {
        if (!this._system)
        {
            throw new Error("CjsAudioMan has no installed audio library");
        }
        return this._system;
    }

    /** Creates deterministic delivery candidates for one media identity. */
    _CreateCandidates(mediaID, delivery)
    {
        const candidates = [];
        const direct = NormalizeSourceRecords(this._library.media[mediaID]);
        const embedded = NormalizeSourceRecords(
            this._library.embeddedMedia?.[mediaID],
        );

        if (delivery !== "range" || typeof this._mediaProvider.Read === "function")
        {
            for (let index = 0; index < direct.length; index++)
            {
                const source = direct[index];

                if (typeof this._mediaProvider.Read !== "function"
                    || !ProviderAllows(
                        this._mediaProvider,
                        "CanRead",
                        source,
                        { kind: "media", mediaID },
                    ))
                {
                    continue;
                }

                const mediaType = SourceMediaType(source);
                const sourceID = String(
                    source.sourceID ?? `media:${mediaID}:${index}`,
                );

                candidates.push({
                    mediaID,
                    sourceID,
                    selectionKey: SelectionKey(
                        mediaID,
                        sourceID,
                        "individual",
                    ),
                    sourceRank: IsPreparedMedia(source, mediaType) ? 0 : 1,
                    route: "individual",
                    mediaType,
                    language: NormalizeLanguage(source.language ?? ""),
                    offset: 0,
                    byteLength: NormalizeOptionalByteLength(
                        source.byteLength,
                    ),
                    source,
                    bank: null,
                });
            }
        }

        if (delivery === "individual")
        {
            return candidates;
        }

        for (let index = 0; index < embedded.length; index++)
        {
            const source = embedded[index];
            const bank = this._library.banks[String(source.bank ?? "")];

            if (!bank)
            {
                continue;
            }

            const offset = coerceNonNegativeInteger(
                source.offset,
                `Audio media ${mediaID} embedded offset`,
            );
            const byteLength = coercePositiveInteger(
                source.byteLength,
                `Audio media ${mediaID} embedded byteLength`,
            );
            const context = {
                kind: "bank-range",
                mediaID,
                offset,
                byteLength,
            };
            let route = null;

            if ((delivery === "auto" || delivery === "range")
                && typeof this._mediaProvider.ReadRange === "function"
                && ProviderAllows(
                    this._mediaProvider,
                    "CanReadRange",
                    bank,
                    context,
                ))
            {
                route = "range";
            }
            else if (delivery !== "range"
                && typeof this._mediaProvider.Read === "function"
                && ProviderAllows(
                    this._mediaProvider,
                    "CanRead",
                    bank,
                    { ...context, kind: "bank" },
                ))
            {
                route = "whole";
            }

            if (!route)
            {
                continue;
            }

            const sourceID = String(
                source.sourceID
                ?? `embedded:${mediaID}:${String(source.bank)}:${index}`,
            );

            candidates.push({
                mediaID,
                sourceID,
                selectionKey: SelectionKey(mediaID, sourceID, route),
                sourceRank: 2,
                route,
                mediaType: SourceMediaType(source, "wem"),
                language: NormalizeLanguage(
                    source.language ?? bank.language ?? "",
                ),
                offset,
                byteLength,
                source,
                bank,
            });
        }

        return candidates;
    }

    /** Returns one constant-memory silent carrier for this audio context. */
    _GetTimedSilenceAudioBuffer()
    {
        this._timedSilenceBuffer ??=
            CreateTimedSilenceAudioBuffer(this._context);
        return this._timedSilenceBuffer;
    }

    /** Selects and loads one media buffer for an event. */
    async _LoadEventBuffer(
        eventID,
        eventName,
        controls,
        resolvedProgram = null,
    )
    {
        const eventSpatial = !Boolean(
            this._library?.metadata?.Events?.[eventName]?.is2D,
        );

        if (this._sfxEngine?.HandlesEvent(eventName))
        {
            const engine = this._sfxEngine;
            let program = Array.isArray(resolvedProgram)
                ? resolvedProgram
                : engine.ResolveProgram(eventName, controls) ?? [];

            if (!Array.isArray(resolvedProgram))
            {
                program = controls.installSfxProgram(program) ?? program;
            }

            const selections = program.flatMap(operation =>
                operation.kind === "play"
                    ? operation.selections
                    : []);

            if (!selections.length)
            {
                return { voices: [] };
            }

            const buffers = await Promise.all(
                selections.map(selection =>
                {
                    if (selection.voiceLimitRejected === true)
                    {
                        return Promise.resolve(null);
                    }
                    const programSlotId = selection.programSlotId
                        ?? `${selection.actionIndex}:${selection.leafIndex}`;
                    const selectionSignal =
                        controls.getSfxProgramSignal(
                            programSlotId,
                            selection.actionIndex,
                            selection.leafIndex,
                            selection.programBatchId,
                        )
                        ?? controls.signal;

                    if (selectionSignal?.aborted)
                    {
                        return Promise.resolve(null);
                    }

                    if (selection.silenceDurationMs !== undefined)
                    {
                        return Promise.resolve(
                            this._GetTimedSilenceAudioBuffer(),
                        );
                    }

                    return this.LoadMedia(selection.mediaID, {
                        signal: selectionSignal,
                    }).catch(error =>
                    {
                        if (controls.signal?.aborted)
                        {
                            throw error;
                        }
                        if (selectionSignal?.aborted)
                        {
                            return null;
                        }
                        if (IsAbortError(error))
                        {
                            throw error;
                        }
                        return null;
                    });
                }),
            );

            return {
                voices: selections.flatMap((selection, index) =>
                    buffers[index]
                        ? [ {
                            buffer: buffers[index],
                            ...(selection.silenceDurationMs === undefined
                                ? {}
                                : {
                                    silenceDurationSeconds:
                                        selection.silenceDurationMs / 1000,
                                }),
                            loop: selection.loop,
                            ...(selection.playCount === undefined
                                ? {}
                                : { playCount: selection.playCount }),
                            playbackRate: selection.playbackRate,
                            programSlotId: selection.programSlotId
                                ?? `${selection.actionIndex}:${selection.leafIndex}`,
                            ...(selection.programBatchId === undefined
                                ? {}
                                : {
                                    programBatchId:
                                        selection.programBatchId,
                                }),
                            actionIndex: selection.actionIndex,
                            leafIndex: selection.leafIndex,
                            busRouteNodeId: selection.busRouteNodeId,
                            matchIds: selection.matchIds,
                            busPathIds: selection.busPathIds,
                            busVoiceVolumeActionControlled:
                                selection.busVoiceVolumeActionControlled,
                            sourceEffects: selection.sourceEffects,
                            ...(selection.sourceEffects?.some(effect =>
                                effect.rtpcCurves?.length
                                || effect.driveRtpcCurve)
                                ? {
                                    getSourceEffectRtpc: (
                                        curve,
                                        at = undefined,
                                        readControl = false,
                                    ) => engine.EvaluateSourceEffectRTPC(
                                        curve,
                                        controls,
                                        at,
                                        readControl,
                                    ),
                                }
                                : {}),
                            authoredBusVolumeDb:
                                selection.authoredBusVolumeDb,
                            authoredBusMakeUpGainDb:
                                selection.authoredBusMakeUpGainDb,
                            authoredOutputBusVolumeDb:
                                selection.authoredOutputBusVolumeDb,
                            voiceLimitReservationId:
                                selection.voiceLimitReservationId,
                            getPlaybackRate: (at = undefined) =>
                                engine.EvaluatePlaybackRate(
                                    selection,
                                    controls,
                                    undefined,
                                    at,
                                ),
                            getPlaybackRateAtVoicePitchCents: (
                                value,
                                at = undefined,
                            ) =>
                                engine.EvaluatePlaybackRate(
                                    selection,
                                    controls,
                                    value,
                                    at,
                                ),
                            spatial: selection.spatial ?? eventSpatial,
                            ...(selection.dryVolumeCurve === undefined
                                ? {}
                                : {
                                    dryVolumeCurve:
                                        selection.dryVolumeCurve,
                                }),
                            ...(selection.delayMs === undefined
                                ? {}
                                : { delayMs: selection.delayMs }),
                            ...(selection.fadeInMs === undefined
                                ? {}
                                : {
                                    fadeInMs: selection.fadeInMs,
                                    fadeCurve: selection.fadeCurve,
                                }),
                            ...(selection.switchFadeInMs === undefined
                                ? {}
                                : {
                                    switchFadeInMs:
                                        selection.switchFadeInMs,
                                }),
                            getGain: (at = undefined) => engine.EvaluateGain(
                                selection,
                                controls,
                                undefined,
                                at,
                            ),
                            getGainAtVoiceVolumeDb: (
                                voiceVolumeDb,
                                at = undefined,
                            ) =>
                                engine.EvaluateGain(
                                    selection,
                                    controls,
                                    voiceVolumeDb,
                                    at,
                                ),
                            ...(selection.lowPass === undefined
                                ? {}
                                : {
                                    getLowPass: (at = undefined) =>
                                        engine.EvaluateLowPass(
                                            selection,
                                            controls,
                                            at,
                                        ),
                                    getLowPassAtAdditionalPercent: (
                                        additionalPercent = 0,
                                        at = undefined,
                                    ) =>
                                        engine.EvaluateLowPass(
                                            selection,
                                            controls,
                                            at,
                                            additionalPercent,
                                        ),
                                }),
                            ...(selection.highPass === undefined
                                ? {}
                                : {
                                    getHighPass: (at = undefined) =>
                                        engine.EvaluateHighPass(
                                            selection,
                                            controls,
                                            at,
                                        ),
                                    getHighPassAtAdditionalPercent: (
                                        additionalPercent = 0,
                                        at = undefined,
                                    ) =>
                                        engine.EvaluateHighPass(
                                            selection,
                                            controls,
                                            at,
                                            additionalPercent,
                                        ),
                                }),
                        } ]
                        : []),
            };
        }

        const values = this._library?.eventMedia?.[eventName] ?? [];

        if (!values.length)
        {
            throw new Error(
                `Audio event has no resolved media: ${eventName}`,
            );
        }

        let mediaID = values[0];

        if (this._selectEventMedia)
        {
            mediaID = this._selectEventMedia({
                eventID,
                eventName,
                mediaIDs: [ ...values ],
            });
        }

        const id = NormalizeMediaID(mediaID);

        if (!values.some(value => String(value) === id))
        {
            throw new Error(
                `Audio event selector returned unrelated media ${id} for ${eventName}`,
            );
        }

        return {
            voices: [
                {
                    buffer: await this.LoadMedia(id, {
                        signal: controls.signal,
                    }),
                    spatial: eventSpatial,
                },
            ],
        };
    }

    /** Reads and decodes one selected media representation. */
    async _ReadAndDecode(selection, signal)
    {
        throwIfAborted(signal, "Aborted");

        let result;

        if (selection.route === "individual")
        {
            result = await this._mediaProvider.Read(selection.source, {
                signal,
                kind: "media",
                mediaID: selection.mediaID,
                mediaType: selection.mediaType,
                language: selection.language,
            });
        }
        else if (selection.route === "range")
        {
            result = await this._mediaProvider.ReadRange(selection.bank, {
                signal,
                kind: "bank-range",
                mediaID: selection.mediaID,
                offset: selection.offset,
                byteLength: selection.byteLength,
            });
            result = await NormalizeRangeResult(result, selection);
        }
        else
        {
            const bytes = await this._LoadWholeBank(selection, signal);
            const end = selection.offset + selection.byteLength;

            if (end > bytes.byteLength)
            {
                throw new RangeError(
                    `Audio media ${selection.mediaID} exceeds bank bytes`,
                );
            }

            result = bytes.slice(selection.offset, end);
        }

        throwIfAborted(signal, "Aborted");
        const decoded = await this._DecodeResult(
            result,
            selection.mediaType,
        );

        throwIfAborted(signal, "Aborted");
        return decoded;
    }

    /** Normalizes provider output and decodes it into an AudioBuffer-like value. */
    async _DecodeResult(result, mediaType)
    {
        const explicitBuffer = result?.audioBuffer ?? null;

        if (explicitBuffer)
        {
            return explicitBuffer;
        }
        if (IsAudioBufferLike(result))
        {
            return result;
        }
        if (Array.isArray(result?.channelData)
            && Number(result.sampleRate) > 0)
        {
            return CreatePcmAudioBuffer(this._context, result);
        }

        const returnedType = NormalizeMediaType(result?.mediaType ?? "");
        const type = !returnedType
            || returnedType === "application/octet-stream"
            ? NormalizeMediaType(mediaType)
            : returnedType;
        const bytes = await ToDetachedBytes(result);

        if (type === "wem")
        {
            const { CjsWemFormat } = await import(
                "#resource/formats/wem"
            );
            const metadata = CjsWemFormat.inspect(bytes);

            if (metadata.codec === "wwise-vorbis")
            {
                const ogg = CjsWemFormat.toOgg(bytes);

                return DecodeAudioData(this._context, ogg.bytes);
            }
            if (metadata.codec === "wwise-ptadpcm"
                || metadata.codec === "pcm"
                || metadata.codec === "pcm-extensible")
            {
                return CreatePcmAudioBuffer(
                    this._context,
                    CjsWemFormat.toPcm(bytes),
                );
            }
        }

        return DecodeAudioData(this._context, bytes);
    }
}

function NormalizeLibraryPath(value)
{
    if (typeof value !== "string" || !value.trim())
    {
        throw new TypeError("Audio library path must be a non-empty string");
    }

    const path = normalizeResourcePath(value);

    if (!path)
    {
        throw new TypeError("Audio library path must be a non-empty string");
    }

    return path;
}

/** Creates the browser's supported AudioContext without touching it at import time. */
function CreateBrowserAudioContext()
{
    const Constructor = globalThis.AudioContext
        ?? globalThis.webkitAudioContext
        ?? null;

    return Constructor ? new Constructor() : null;
}

function NormalizeDelivery(value)
{
    const delivery = String(value ?? "auto").trim().toLowerCase();

    if (!DELIVERY_MODES.has(delivery))
    {
        throw new TypeError(`Unsupported audio delivery mode: ${value}`);
    }
    return delivery;
}

function NormalizeMediaID(value)
{
    const number = Number(value);

    if (!Number.isSafeInteger(number)
        || number <= 0
        || number > 0xffffffff)
    {
        throw new TypeError(
            "Audio media ID must be a positive unsigned 32-bit integer",
        );
    }
    return String(number >>> 0);
}

function NormalizeSourceRecords(value)
{
    if (value === undefined)
    {
        return [];
    }
    return Array.isArray(value) ? value : [ value ];
}

function NormalizeLanguages(values)
{
    const input = Array.isArray(values)
        ? values
        : values === null || values === undefined
            ? []
            : [ values ];
    return [ ...new Set(input.map(NormalizeLanguage).filter(Boolean)) ];
}

function NormalizeBankNames(values)
{
    if (typeof values === "string" || !values?.[Symbol.iterator])
    {
        throw new TypeError("Audio soundbanks must be an iterable of names");
    }

    return [ ...new Set([ ...values ].map(NormalizeBankName)) ];
}

function NormalizeBankName(value)
{
    const bank = String(value ?? "").trim();

    if (!bank)
    {
        throw new TypeError("Audio soundbank names must be non-empty strings");
    }
    return bank;
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

function NormalizeMediaTypes(values)
{
    const input = Array.isArray(values)
        ? values
        : values === null || values === undefined
            ? []
            : [ values ];
    return [ ...new Set(input.map(NormalizeMediaType).filter(Boolean)) ];
}

function NormalizeMediaType(value)
{
    const type = String(value ?? "").trim().toLowerCase();
    const aliases = {
        "audio/mpeg": "mp3",
        "audio/mp3": "mp3",
        "audio/mp4": "mp4",
        "audio/ogg": "ogg",
        "audio/wav": "wav",
        "audio/wave": "wav",
        "audio/webm": "webm",
        "audio/x-wem": "wem",
        "audio/x-wav": "wav",
        "application/x-wwise-wem": "wem",
    };

    return aliases[type] ?? type.replace(/^\./u, "");
}

function SourceMediaType(record, fallback = "")
{
    const explicit = NormalizeMediaType(
        record.mediaType ?? record.mimeType ?? "",
    );

    if (explicit)
    {
        return explicit;
    }

    const path = String(
        record.resPath
        ?? record.logicalPath
        ?? record.path
        ?? record.storagePath
        ?? "",
    ).split(/[?#]/u, 1)[0];
    const extension = path.match(/\.([a-z0-9]+)$/iu)?.[1] ?? fallback;

    return NormalizeMediaType(extension);
}

function IsPreparedMedia(record, mediaType)
{
    return record.prepared === true || !ORIGINAL_MEDIA_TYPES.has(mediaType);
}

function LanguageRank(language, accepted)
{
    if (!accepted.length)
    {
        return language ? 1 : 0;
    }

    const exact = accepted.indexOf(language);

    if (exact >= 0)
    {
        return exact;
    }
    return language ? Number.POSITIVE_INFINITY : accepted.length;
}

function MediaTypeRank(mediaType, accepted)
{
    if (!accepted.length)
    {
        return 0;
    }

    const index = accepted.indexOf(mediaType);

    return index >= 0 ? index : Number.POSITIVE_INFINITY;
}

function ProviderAllows(provider, method, source, context)
{
    return typeof provider[method] !== "function"
        || provider[method](source, context) !== false;
}

function SelectionKey(mediaID, sourceID, route)
{
    return `${mediaID}\0${sourceID}\0${route}`;
}

function NormalizeOptionalByteLength(value)
{
    if (value === undefined || value === null || value === "")
    {
        return null;
    }
    return coerceNonNegativeInteger(value, "Audio media byteLength");
}
function IsAbortError(error)
{
    return error?.name === "AbortError";
}

async function NormalizeRangeResult(result, selection)
{
    const bytes = await ToDetachedBytes(result);

    if (bytes.byteLength === selection.byteLength)
    {
        return bytes;
    }

    const end = selection.offset + selection.byteLength;

    if ((result?.complete === true || bytes.byteLength >= end)
        && end <= bytes.byteLength)
    {
        return bytes.slice(selection.offset, end);
    }

    throw new RangeError(
        `Audio range for media ${selection.mediaID} returned `
        + `${bytes.byteLength} bytes; expected ${selection.byteLength}`,
    );
}

async function ToDetachedBytes(value)
{
    const input = value?.bytes ?? value;

    if (input instanceof ArrayBuffer)
    {
        return new Uint8Array(input.slice(0));
    }
    if (ArrayBuffer.isView(input))
    {
        return new Uint8Array(
            input.buffer,
            input.byteOffset,
            input.byteLength,
        ).slice();
    }
    if (typeof input?.arrayBuffer === "function")
    {
        return new Uint8Array(await input.arrayBuffer()).slice();
    }

    throw new TypeError(
        "Audio provider results must contain bytes or an AudioBuffer",
    );
}

function IsAudioBufferLike(value)
{
    return Boolean(value
        && typeof value === "object"
        && typeof value.getChannelData === "function"
        && Number.isFinite(Number(value.sampleRate)));
}

function MergeStateTransitions(...catalogs)
{
    const result = new Map();

    for (const catalog of catalogs)
    {
        for (const group of catalog ?? [])
        {
            const key = String(group.groupId);
            const signature = StateTransitionSignature(group);
            const existing = result.get(key);

            if (existing && existing.signature !== signature)
            {
                throw new TypeError(
                    `Conflicting audio State transition group ${key}`,
                );
            }
            result.set(key, { group, signature });
        }
    }
    const values = [ ...result.values() ]
        .map(entry => entry.group)
        .sort((left, right) => Number(left.groupId) - Number(right.groupId));

    return values.length ? values : null;
}

function StateTransitionSignature(group)
{
    const normalizeName = value => value === undefined
        ? null
        : String(value).trim().toLowerCase();

    return JSON.stringify({
        groupId: String(group.groupId),
        group: normalizeName(group.group),
        defaultTransitionMs: Number(group.defaultTransitionMs),
        states: [ ...(group.states ?? []) ]
            .map(state => ({
                stateId: String(state.stateId),
                state: normalizeName(state.state),
            }))
            .sort((left, right) => Number(left.stateId) - Number(right.stateId)),
        transitions: [ ...(group.transitions ?? []) ]
            .map(transition => ({
                fromId: String(transition.fromId),
                from: normalizeName(transition.from),
                toId: String(transition.toId),
                to: normalizeName(transition.to),
                transitionMs: Number(transition.transitionMs),
            }))
            .sort((left, right) =>
                Number(left.fromId) - Number(right.fromId)
                || Number(left.toId) - Number(right.toId)),
    });
}

function CreatePcmAudioBuffer(context, payload)
{
    if (!context)
    {
        throw new TypeError("An enabled AudioContext is required for decoded WEM PCM");
    }

    const channelData = payload.channelData;
    const channels = Number(payload.channels ?? channelData.length);
    const sampleRate = Number(payload.sampleRate);
    const sampleCount = Number(
        payload.sampleCount ?? channelData[0]?.length ?? 0,
    );
    const buffer = context.createBuffer(channels, sampleCount, sampleRate);

    for (let channel = 0; channel < channels; channel++)
    {
        if (typeof buffer.copyToChannel === "function")
        {
            buffer.copyToChannel(channelData[channel], channel);
        }
        else
        {
            buffer.getChannelData(channel).set(channelData[channel]);
        }
    }

    return buffer;
}

/**
 * Creates a one-frame silent carrier for an authored timed-silence voice.
 * The backend loops this frame and owns the exact logical stop time, avoiding
 * a duration-sized PCM allocation for long Wwise Silence sources.
 */
function CreateTimedSilenceAudioBuffer(context)
{
    if (!context)
    {
        throw new TypeError("An enabled AudioContext is required for timed silence");
    }
    const sampleRate = Number(context.sampleRate) > 0
        ? Number(context.sampleRate)
        : 48000;
    const buffer = context.createBuffer(1, 1, sampleRate);

    if (!Number.isFinite(Number(buffer.duration)))
    {
        Object.defineProperty(buffer, "duration", {
            value: 1 / sampleRate,
        });
    }
    return buffer;
}

function DecodeAudioData(context, bytes)
{
    if (!context)
    {
        return Promise.reject(new TypeError(
            "An enabled AudioContext is required for encoded media",
        ));
    }

    const input = bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
    );

    return new Promise((resolve, reject) =>
    {
        let result;

        try
        {
            result = context.decodeAudioData(input, resolve, reject);
        }
        catch (error)
        {
            reject(error);
            return;
        }

        if (result && typeof result.then === "function")
        {
            result.then(resolve, reject);
        }
    });
}
