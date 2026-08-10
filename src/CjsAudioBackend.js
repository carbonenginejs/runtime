// CarbonEngineJS original (no Carbon counterpart). WebAudio realization of the
// AudGameObjResource.backend seam. Signal chain:
// source -> authored source effects -> voice/bus filters -> source/distance and Bus gains
// -> emitter gain -> PannerNode(HRTF direction only) -> qualified shared Bus effects
// -> master gain -> destination. Blocked/graphless routes retain their legacy
// distributed Bus-effect chain before the emitter. Each playing source owns
// the source gain so
// stop-fades and replays cannot bleed across concurrent events on one emitter.
//
// Injectables keep this node-testable and decode-agnostic:
// - context: an AudioContext (or compatible fake); never created here.
// - resolveSfxProgram(eventID, eventName, controls) -> program|null
//   - runs synchronously so authored controls and Stops exist before rendering.
// - loadBuffer(eventID, eventName, controls, resolvedProgram)
//   -> Promise<AudioBuffer|voice set>
//   - the app wires runtime-resource's wem->ogg->decode chain behind this.
// - isLoop(eventName) - loop flag source (usually the static data repository).
import { evaluateWwiseInterpolation } from "./internal/wwiseCurve.js";
import {
    evaluateWwiseRtpcCurve,
    wwiseDbRtpcValueToDb,
} from "./internal/wwiseRtpc.js";
import {
    busRtpcCatalogUsesControl,
    busRtpcPathUses,
    evaluateBusRtpcGainDb,
    evaluateBusVoiceRtpcGainDb,
    indexBusRtpcCatalog,
} from "./internal/busRtpc.js";
import {
    busStatePathUses,
    evaluateBusStateProperties,
    evaluateBusStateGainDb,
    indexBusStateCatalog,
} from "./internal/busState.js";
import { wwiseFilterPercentToHz } from "./internal/wwiseFilter.js";
import {
    createBusEffectChain,
    createWwiseEffectChain,
    indexBusEffectCatalog,
    normalizeStaticSourceEffectChain,
    normalizeWwiseDynamicsMode,
    normalizeWwiseModulationMode,
} from "./internal/busEffects.js";
import {
    CjsAudioBackendSfxProgramSlot,
} from "./internal/CjsAudioBackendSfxProgramSlot.js";
import {
    CjsAudioBackendSfxVoiceLimitLedger,
} from "./internal/CjsAudioBackendSfxVoiceLimitLedger.js";
import {
    CjsAudioBackendSfxVoice,
} from "./internal/CjsAudioBackendSfxVoice.js";

const DEFAULT_FADE_SECONDS = 1;
const DEFAULT_RENDER_QUANTUM_SECONDS = 128 / 48000;
const LINEAR_FADE_CURVE = 4;
const FADE_CURVE_SAMPLES = 65;
// Reaches 95% of a new pose in about 15 ms without repeatedly cancelling an
// in-flight automation ramp during high-rate pointer or scene updates.
const SPATIAL_POSE_TIME_CONSTANT_SECONDS = 0.005;

/** WebAudio backend for the audio graph: emitter nodes, playing sources, listener pose. */
export class CjsAudioBackend
{
    #context = null;

    #loadBuffer = null;

    #isLoop = null;

    #hasEventStops = null;

    #hasSfxEvent = null;

    #resolveSfxProgram = null;

    #continueSfxProgram = null;

    #prepareSfxProgram = null;

    #masterGain = null;

    #sfxGain = null;

    #emitterNodes = new Map();

    #playing = new Map();

    #voiceLimitLedger = new CjsAudioBackendSfxVoiceLimitLedger({
        isOwnerActive: owner =>
            this.#playing.get(owner.playingID) === owner,
    });

    #scheduledSfxActions = [];

    #globalRtpcValues = new Map();

    #globalStateValues = new Map();

    #globalVoiceHighPasses = new Map();

    #globalVoiceLowPasses = new Map();

    #globalBusVolumes = new Map();

    #stateTransitionCatalog = new Map();

    #statePropertyTransitions = new Map();

    #objectRtpcValues = new Map();

    #objectSwitchValues = new Map();

    #rtpcTransitions = new Map();

    #deferSfxControlRefresh = false;

    #applyRTPC = null;

    #busRtpcCatalog = new Map();

    #busStateCatalog = new Map();

    #busDuckingController = null;

    #busEffectCatalog = new Map();

    #wwiseDynamics = "strict";

    #wwiseModulation = "strict";

    #busGraphRuntime = null;

    #busMixer = null;

    #unsubscribeBusDucking = null;

    #nextPlayingID = 1;

    // Application world units -> WebAudio HRTF position units. Authored Wwise
    // curves remain in unscaled world units; this scale is used only by the
    // compatibility inverse fallback when a graph has no retained curve.
    #distanceScale = 1;

    #listenerPoseInitialized = false;

    #listenerPosition = null;

    // Optional interactive-music engine (CjsMusicEngine); owns events found
    // in its graph and plays through its own gain into the master gain.
    #musicEngine = null;

    /** Creates the Web Audio realization over an optional context and loaders. */
    constructor({
        context,
        loadBuffer,
        isLoop,
        hasEventStops,
        hasSfxEvent,
        resolveSfxProgram,
        continueSfxProgram,
        prepareSfxProgram,
        stateTransitions,
        distanceScale,
        musicEngine,
        applyRTPC,
        busRtpcs,
        busStates,
        busDuckingController,
        busEffects,
        wwiseDynamics = "strict",
        wwiseModulation = "strict",
        busGraphRuntime,
        busMixer,
    } = {})
    {
        this.#context = context ?? null;
        this.#loadBuffer = loadBuffer ?? null;
        this.#isLoop = isLoop ?? (() => false);
        this.#hasEventStops = typeof hasEventStops === "function"
            ? hasEventStops
            : () => false;
        this.#hasSfxEvent = typeof hasSfxEvent === "function"
            ? hasSfxEvent
            : null;
        this.#resolveSfxProgram = typeof resolveSfxProgram === "function"
            ? resolveSfxProgram
            : null;
        this.#continueSfxProgram = typeof continueSfxProgram === "function"
            ? continueSfxProgram
            : null;
        this.#prepareSfxProgram = typeof prepareSfxProgram === "function"
            ? prepareSfxProgram
            : null;
        this.#stateTransitionCatalog = IndexStateTransitionCatalog(
            stateTransitions,
        );
        this.#distanceScale = Number(distanceScale) || 1;
        this.#applyRTPC = typeof applyRTPC === "function" ? applyRTPC : null;
        this.#busRtpcCatalog = indexBusRtpcCatalog(busRtpcs);
        this.#busStateCatalog = indexBusStateCatalog(busStates);
        this.#busDuckingController = busDuckingController ?? null;
        this.#busEffectCatalog = indexBusEffectCatalog(busEffects);
        this.#wwiseDynamics = normalizeWwiseDynamicsMode(wwiseDynamics);
        this.#wwiseModulation = normalizeWwiseModulationMode(
            wwiseModulation,
        );
        this.#busGraphRuntime = busGraphRuntime ?? null;
        this.#busMixer = busMixer ?? null;
        this.#unsubscribeBusDucking = this.#busDuckingController?.Subscribe?.(
            () => this.#RefreshBusDucking(),
        ) ?? null;

        if (this.#context)
        {
            this.#masterGain = this.#context.createGain();
            // Safety limiter: many concurrent one-shots (weapon volleys) sum
            // well past 0 dBFS and hard-clip audibly without it. Wwise
            // projects carry a master-bus limiter for the same reason.
            const limiter = this.#context.createDynamicsCompressor?.() ?? null;
            if (limiter)
            {
                limiter.threshold.value = -6;
                limiter.knee.value = 6;
                limiter.ratio.value = 12;
                limiter.attack.value = 0.003;
                limiter.release.value = 0.25;
                this.#masterGain.connect(limiter);
                limiter.connect(this.#context.destination);
            }
            else
            {
                this.#masterGain.connect(this.#context.destination);
            }
            // SFX bus: every emitter chain routes through it so effect volume
            // is controllable independently of music (which feeds the master
            // gain directly through the music engine's own output gain).
            this.#sfxGain = this.#context.createGain();
            this.#sfxGain.connect(this.#masterGain);
        }
        this.#musicEngine = musicEngine ?? null;
    }

    /** The mix bus new output chains should connect into (music engine, meters). */
    get masterGain()
    {
        return this.#masterGain;
    }

    /** Returns the effect-only bus feeding the master output. */
    get sfxGain()
    {
        return this.#sfxGain;
    }

    /** Effect-bus volume (0..1); music is unaffected. */
    SetSfxVolume(value)
    {
        const volume = Math.max(0, Math.min(1, Number(value) || 0));

        SetAudioParam(this.#sfxGain?.gain, volume, this.#context);
        this.#busMixer?.SetCategoryVolume?.("sfx", volume);
    }

    /** Attaches the system-owned shared Bus mixer before any voices realize. */
    SetBusMixer(mixer)
    {
        this.#busMixer = mixer ?? null;
    }

    /** Returns the currently attached built-in or application music engine. */
    get musicEngine()
    {
        return this.#musicEngine;
    }

    /** Late attachment: the engine needs the master gain, which needs the context. */
    set musicEngine(engine)
    {
        this.SetMusicEngine(engine);
    }

    /**
     * Replaces the music engine without leaving voices owned by the previous
     * engine in backend bookkeeping. Disposal remains the composition root's
     * responsibility so an injected engine can choose its own lifecycle.
     */
    SetMusicEngine(engine)
    {
        const next = engine ?? null;
        if (next === this.#musicEngine)
        {
            return;
        }
        const previous = this.#musicEngine;
        for (const [playingID, record] of [ ...this.#playing ])
        {
            if (record.music && record.musicEngine === previous)
            {
                previous?.ExecuteAction?.("stop", playingID, 0);
                this.#FinishMusicPlaying(playingID);
            }
        }
        this.#musicEngine = next;
    }

    /** Engine init (Carbon's InitLowLevel/InitSound collapse into context supply). */
    Init()
    {
        return !!this.#context;
    }

    /** Registers the legacy emitter chain and storage for lazy exact-route branches. */
    RegisterGameObj(gameObjID)
    {
        if (!this.#context || this.#emitterNodes.has(gameObjID))
        {
            return;
        }
        const panner = this.#context.createPanner();
        panner.panningModel = "HRTF";
        panner.distanceModel = "inverse";
        panner.rolloffFactor = 0;
        const gain = this.#context.createGain();
        gain.connect(panner);
        // Optional per-emitter level tap (post-panner, so it reflects what is
        // actually heard incl. distance attenuation). Absent on minimal fake
        // contexts - metering then reports 0.
        const analyser = this.#context.createAnalyser?.() ?? null;
        if (analyser)
        {
            analyser.fftSize = 256;
            panner.connect(analyser);
            analyser.connect(this.#sfxGain);
        }
        else
        {
            panner.connect(this.#sfxGain);
        }
        this.#emitterNodes.set(gameObjID, {
            gain,
            flatGain: null,
            panner,
            analyser,
            routeBranches: new Map(),
            front: null,
            position: null,
            scalingFactor: 1,
            voiceHighPasses: new Map(this.#globalVoiceHighPasses),
            voiceLowPasses: new Map(this.#globalVoiceLowPasses),
            voicePitches: new Map(),
            voiceVolumes: new Map(),
            busVoiceVolumes: new Map(),
            busVolumes: new Map(this.#globalBusVolumes),
        });
    }

    /**
     * Logically unregisters an emitter while allowing already-posted sounds to
     * finish on their retired node generation, matching Wwise.
     */
    UnregisterGameObj(gameObjID)
    {
        const nodes = this.#emitterNodes.get(gameObjID);
        if (nodes)
        {
            nodes.retiredRtpcValues = new Map(
                this.#objectRtpcValues.get(gameObjID) ?? [],
            );
            nodes.retiredRtpcTransitions = new Map();
            for (const transition of this.#rtpcTransitions.values())
            {
                if (transition.scope === "game-object"
                    && String(transition.gameObjID)
                        === String(gameObjID))
                {
                    nodes.retiredRtpcTransitions.set(
                        transition.name,
                        { ...transition },
                    );
                }
            }
            this.#emitterNodes.delete(gameObjID);
            this.#ReleaseRetiredEmitterNodes(gameObjID, nodes);
        }
        this.#CancelObjectRtpcTransitions(gameObjID);
        this.#objectRtpcValues.delete(gameObjID);
        this.#objectSwitchValues.delete(gameObjID);
    }

    /** Permanently releases an emitter and every loaded or pending sound it owns. */
    ReleaseGameObj(gameObjID)
    {
        this.#CancelObjectRtpcTransitions(gameObjID);
        for (const [playingID, record] of [ ...this.#playing ])
        {
            if (record.gameObjID !== gameObjID)
            {
                continue;
            }
            record.stopped = true;
            if (record.music)
            {
                record.musicEngine?.ExecuteAction?.("stop", playingID, 0);
            }
            for (const voice of record.voices ?? [])
            {
                if (voice.source)
                {
                    voice.source.onended = null;
                    voice.source.stop?.(this.#context.currentTime);
                }
            }
            this.#FinishPlaying(playingID);
        }
        const nodes = this.#emitterNodes.get(gameObjID);
        if (nodes)
        {
            this.#emitterNodes.delete(gameObjID);
            this.#DisconnectEmitterNodes(nodes);
        }
        this.#objectRtpcValues.delete(gameObjID);
        this.#objectSwitchValues.delete(gameObjID);
    }

    /** Returns whether an installed authored program owns Stop execution. */
    HandlesEventStops(eventName)
    {
        return this.#hasEventStops(String(eventName)) === true;
    }

    /** Starts an event: allocates the playing id synchronously, starts when the media resolves. */
    PostEvent(eventID, gameObjID, additionalFlags, emitter, eventName)
    {
        this.#CommitHeardCrossfadeTransactions();
        this.#ProcessScheduledSfxActions();
        const music = this.#musicEngine?.HandlesEvent(eventName) === true;
        const sfx = this.#hasSfxEvent
            ? this.#hasSfxEvent(String(eventName)) === true
            : true;

        if (music && !sfx)
        {
            return this.#PostMusicEvent(eventName, { gameObjID, emitter });
        }
        if (!sfx)
        {
            return 0;
        }
        const nodes = this.#emitterNodes.get(gameObjID);
        if (!this.#context || !this.#loadBuffer || !nodes)
        {
            return 0;
        }
        const playingID = this.#nextPlayingID++;
        const controller = new AbortController();
        const record = {
            playingID,
            eventID,
            gameObjID,
            emitter,
            emitterNodes: nodes,
            eventName,
            controller,
            voices: [],
            sfx: true,
            sfxFinished: false,
            music,
            musicFinished: !music,
            musicEngine: music ? this.#musicEngine : null,
            loaded: false,
            stopped: false,
            pendingBreak: false,
            pendingSeek: null,
            postContextTime: Number(this.#context.currentTime) || 0,
            sfxProgram: false,
            programSlots: null,
            pendingProgramActions: 0,
            planningProgram: false,
            loading: false,
            posting: true,
            sfxControls: null,
        };
        this.#playing.set(playingID, record);

        if (music)
        {
            this.#StartMusicComponent(playingID, record);
        }

        const controls = this.#CreateSfxControls(
            gameObjID,
            controller.signal,
            playingID,
            record,
        );
        record.sfxControls = controls;

        let resolvedProgram = null;

        try
        {
            if (this.#resolveSfxProgram)
            {
                resolvedProgram = this.#resolveSfxProgram(
                    eventID,
                    eventName,
                    controls,
                );
                if (resolvedProgram !== null
                    && resolvedProgram !== undefined)
                {
                    resolvedProgram = this.#InstallSfxProgram(
                        playingID,
                        record,
                        resolvedProgram,
                    );
                }
            }
        }
        catch
        {
            record.loading = false;
            record.posting = false;
            Promise.resolve().then(() =>
                this.#FinishSfxPlaying(playingID));
            return playingID;
        }

        record.posting = false;
        Promise.resolve().then(() =>
        {
            this.#MaybeFinishSfxProgram(playingID, record);
            if (record.stopped
                || record.sfxFinished
                || !this.#playing.has(playingID))
            {
                return null;
            }

            record.loading = true;
            return this.#loadBuffer(
                eventID,
                eventName,
                controls,
                resolvedProgram,
            );
        }).then(result =>
        {
            record.loading = false;
            // Rendering may have paused while media was pending. Apply every
            // now-overdue Stop before a cancelled slot can become a voice.
            this.#ProcessScheduledSfxActions();
            if (record.stopped || !this.#playing.has(playingID))
            {
                this.#FinishSfxPlaying(playingID);
                return;
            }
            if (!result)
            {
                const dormantSwitch = record.sfxProgram
                    && [ ...record.programSlots.values() ].some(slot =>
                        slot.advanceMode === "switch"
                        && slot.continuation
                        && !slot.broken);

                if (!dormantSwitch)
                {
                    this.#FinishSfxPlaying(playingID);
                    return;
                }
                result = { voices: [] };
            }

            const descriptors = NormalizeVoiceDescriptors(
                result,
                () => !!this.#isLoop(record.eventName),
            );

            const realizedSlots = new Set();
            const initialVoices = [];

            for (const descriptor of descriptors)
            {
                const slot = record.sfxProgram
                    ? record.programSlots?.get(descriptor.programSlotId)
                    : null;

                if (record.sfxProgram
                    && (!slot
                        || (slot.advanceMode === "switch"
                            ? slot.generation !== 0
                            : !IsOverlappingAdvanceMode(slot.advanceMode)
                                && slot.state !== "pending"
                                && !(slot.continuation
                                    && slot.state === "voice"))))
                {
                    continue;
                }
                const batch = IsOverlappingAdvanceMode(slot?.advanceMode)
                    ? slot.batches?.get(
                        String(descriptor.programBatchId ?? ""),
                    ) ?? slot.currentBatch
                    : null;
                const cancelledSelectionKeys =
                    batch?.cancelledSelectionKeys
                    ?? slot?.cancelledSelectionKeys;

                if (slot?.broken
                    || batch?.state === "cancelled"
                    || cancelledSelectionKeys?.has(
                        ProgramSelectionKey(descriptor),
                    ))
                {
                    continue;
                }
                const candidateSelections =
                    batch?.selections ?? slot?.selections;
                const selectionMetadata = candidateSelections?.find(
                    selection => ProgramSelectionKey(selection)
                        === ProgramSelectionKey(descriptor),
                ) ?? (candidateSelections?.length === 1
                    ? candidateSelections[0]
                    : null);

                if (record.sfxProgram && !selectionMetadata)
                {
                    continue;
                }

                const voice = this.#CreateVoice(
                    selectionMetadata
                        ? {
                            ...descriptor,
                            actionIndex: selectionMetadata.actionIndex,
                            leafIndex: selectionMetadata.leafIndex,
                            actionTime: selectionMetadata.actionTime,
                            busRouteNodeId:
                                selectionMetadata.busRouteNodeId,
                            matchIds: selectionMetadata.matchIds,
                            busPathIds: selectionMetadata.busPathIds,
                            authoredBusVolumeDb:
                                selectionMetadata.authoredBusVolumeDb,
                            authoredBusMakeUpGainDb:
                                selectionMetadata.authoredBusMakeUpGainDb,
                            authoredOutputBusVolumeDb:
                                selectionMetadata.authoredOutputBusVolumeDb,
                            voiceLimitReservationId:
                                selectionMetadata.voiceLimitReservationId,
                            switchPath: selectionMetadata.switchPath,
                            switchFadeInMs:
                                selectionMetadata.switchFadeInMs,
                            ...(slot?.advanceMode === "crossfade"
                                ? {
                                    crossfadeMode:
                                        slot.crossfadeMode,
                                }
                                : {}),
                        }
                        : descriptor,
                    nodes,
                    record.gameObjID,
                );

                record.voices.push(voice);
                initialVoices.push(voice);
                if (slot)
                {
                    slot.state = slot.advanceMode === "switch"
                        ? "active"
                        : "voice";
                    slot.voice = voice;
                    slot.voices.add(voice);
                    voice.programSlotId = slot.id;
                    if (slot.advanceMode === "switch")
                    {
                        voice.switchGeneration = slot.switchGeneration;
                    }
                    if (IsOverlappingAdvanceMode(slot.advanceMode))
                    {
                        if (batch)
                        {
                            voice.programBatchId = batch.id;
                            batch.voices.add(voice);
                            batch.state = "voice";
                        }
                    }
                    ApplySlotPauseDepth(voice, slot);
                    realizedSlots.add(slot.id);
                }
            }
            for (const slot of record.programSlots?.values?.() ?? [])
            {
                if (!IsOverlappingAdvanceMode(slot.advanceMode))
                {
                    continue;
                }
                for (const batch of slot.batches.values())
                {
                    if (batch.state === "pending")
                    {
                        batch.state = "ended";
                    }
                }
                const initialBatch = [ ...slot.batches.values() ][0];
                const realizedKeys = new Set(
                    [ ...(initialBatch?.voices ?? []) ].map(
                        ProgramSelectionKey,
                    ),
                );
                const missingInitialSelection =
                    initialBatch?.selections?.some(selection =>
                        !initialBatch.cancelledSelectionKeys.has(
                            ProgramSelectionKey(selection),
                        )
                        && !realizedKeys.has(
                            ProgramSelectionKey(selection),
                        ));

                if (missingInitialSelection)
                {
                    this.#FailOverlappingSlot(slot);
                }
                this.#UpdateOverlappingSlotState(slot);
            }
            record.loaded = true;
            if (record.sfxProgram)
            {
                for (const slot of record.programSlots.values())
                {
                    if (slot.state !== "pending"
                        || realizedSlots.has(slot.id))
                    {
                        continue;
                    }
                    if (slot.continuation)
                    {
                        if (slot.advanceMode === "switch")
                        {
                            slot.state = "active";
                        }
                        else
                        {
                            this.#AdvanceSfxProgramSlot(
                                playingID,
                                record,
                                slot,
                                Number(this.#context.currentTime) || 0,
                            );
                        }
                    }
                    else
                    {
                        slot.state = "ended";
                    }
                }
            }

            if (!record.voices.length)
            {
                if (record.sfxProgram)
                {
                    for (const slot of record.programSlots.values())
                    {
                        if (IsOverlappingAdvanceMode(slot.advanceMode))
                        {
                            this.#UpdateOverlappingSlotState(slot);
                        }
                    }
                    this.#MaybeFinishSfxProgram(playingID, record);
                }
                else
                {
                    this.#FinishSfxPlaying(playingID);
                }
                return;
            }

            this.#StartVoices(
                playingID,
                record,
                initialVoices,
            );
        }).catch(() =>
        {
            record.loading = false;
            const dormantSwitch = record.sfxProgram
                && [ ...record.programSlots.values() ].some(slot =>
                    slot.advanceMode === "switch"
                    && slot.continuation
                    && !slot.broken);

            if (dormantSwitch
                && !record.stopped
                && this.#playing.get(playingID) === record)
            {
                record.loaded = true;
                for (const slot of record.programSlots.values())
                {
                    if (slot.advanceMode === "switch"
                        && slot.continuation
                        && !slot.broken)
                    {
                        slot.state = "active";
                    }
                    else if (slot.state === "pending")
                    {
                        slot.state = "ended";
                    }
                }
                this.#MaybeFinishSfxProgram(playingID, record);
                return;
            }
            this.#FinishSfxPlaying(playingID);
        }).finally(() =>
        {
            this.#ReleasePendingSfxVoiceLimitReservations(
                record,
                resolvedProgram,
            );
        });

        return playingID;
    }

    /**
     * Direct host-facing music route. This intentionally bypasses Carbon's
     * event catalog so injected music engines can own arbitrary event names.
     */
    PostMusicEvent(eventName, onFinished)
    {
        if (!this.#musicEngine?.HandlesEvent?.(eventName))
        {
            return 0;
        }
        return this.#PostMusicEvent(eventName, {
            gameObjID: 3,
            emitter: null,
            onFinished: typeof onFinished === "function" ? onFinished : null
        });
    }

    /** Stops a direct or emitter-routed music event. */
    StopMusicEvent(playingID, fadeOutDuration = 1000)
    {
        const record = this.#playing.get(playingID);
        if (!record?.music)
        {
            return false;
        }
        this.ExecuteActionOnPlayingID("stop", playingID, fadeOutDuration);
        return true;
    }

    /** Stop ("stop") fades then halts; break ("break") lets non-loops finish, halts loops at the fade. */
    ExecuteActionOnPlayingID(action, playingID, fadeOutDuration = 1000)
    {
        this.#CommitHeardCrossfadeTransactions();
        const record = this.#playing.get(playingID);
        if (!record)
        {
            return;
        }
        if (record.music)
        {
            record.musicEngine?.ExecuteAction?.(action, playingID, fadeOutDuration);
            if (!record.sfx)
            {
                return;
            }
        }
        if (action === "break")
        {
            this.#BreakContinuousSlots(record);
        }
        if (action === "break" && !record.loaded)
        {
            // Authored SFX leaves may override the event-level loop flag.
            // Keep the pending record until its descriptors resolve, then
            // discard only looping leaves and let one-shots play out.
            record.pendingBreak = true;
            return;
        }
        const breaking = action === "break";

        if (!breaking)
        {
            record.stopped = true;
            for (const slot of record.programSlots?.values?.() ?? [])
            {
                if (!slot.continuation)
                {
                    continue;
                }
                slot.continuation = null;
                slot.broken = true;
                slot.generation++;
                this.#AbortSfxProgramSlot(record, slot);
                for (const batch of slot.batches?.values?.() ?? [])
                {
                    if (batch.state === "loading"
                        || batch.state === "pending")
                    {
                        batch.state = "cancelled";
                        this.#AbortSfxProgramBatch(record, batch);
                    }
                }
                if (slot.state === "pending"
                    || slot.state === "loading")
                {
                    slot.state = "cancelled";
                }
            }
            record.pendingProgramActions = 0;
            this.#scheduledSfxActions = this.#scheduledSfxActions
                .filter(value => value.ownerPlayingID !== playingID);
        }
        const active = record.voices?.filter(voice =>
            voice.source
            && !voice.ended
            && (!breaking
                || (!this.#IsContinuousProgramVoice(record, voice)
                    && (voice.loop || voice.playCount > 1)))) ?? [];

        if (active.length)
        {
            // An explicit 0 means an immediate stop; only a missing/invalid
            // duration falls back to the default fade.
            const ms = Number(fadeOutDuration);
            const seconds = Number.isFinite(ms) ? Math.max(0, ms) / 1000 : DEFAULT_FADE_SECONDS;
            const actionTime = this.#context.currentTime;

            for (const voice of active)
            {
                if (breaking && !voice.loop && voice.playCount > 1)
                {
                    voice.stopping = true;
                    voice.pausing = false;
                    voice.pauseContextTime = null;
                    voice.pauseSource = null;
                    const duration = Number(voice.buffer?.duration);
                    const rate = voice.playbackRate;

                    if (Number.isFinite(duration)
                        && duration > 0
                        && Number.isFinite(rate)
                        && rate > 0)
                    {
                        const now = actionTime;
                        const elapsed = voice.offsetSeconds
                            + Math.max(
                                0,
                                now - voice.positionAnchorContextTime,
                            ) * rate;
                        const position = elapsed % duration;
                        const remaining = position === 0 && elapsed > 0
                            ? duration
                            : duration - position;
                        const boundaryBase = Math.max(
                            now,
                            voice.startContextTime,
                        );
                        const boundary = boundaryBase + remaining / rate;
                        const stopAt = voice.scheduledEndContextTime === null
                            ? boundary
                            : Math.max(
                                now,
                                Math.min(
                                    boundary,
                                    voice.scheduledEndContextTime,
                                ),
                            );

                        voice.source.stop(stopAt);
                        continue;
                    }
                }
                voice.stopping = true;
                voice.pausing = false;
                voice.pauseContextTime = null;
                voice.pauseSource = null;
                if (voice.startContextTime > actionTime)
                {
                    voice.cancelledBeforeStart = true;
                    this.#EndVoiceDucking(voice, actionTime, true);
                    SetAudioParam(
                        voice.stopGain.gain,
                        0,
                        this.#context,
                    );
                    voice.source.stop(actionTime);
                    continue;
                }
                this.#HoldVoiceTransitionFade(voice, actionTime);
                this.#HoldVoiceFade(voice, actionTime);
                if (seconds > 0)
                {
                    const param = voice.stopGain.gain;
                    const now = actionTime;

                    if (typeof param?.cancelAndHoldAtTime === "function")
                    {
                        param.cancelAndHoldAtTime(now);
                    }
                    else
                    {
                        param?.cancelScheduledValues?.(now);
                        param?.setValueAtTime?.(param.value, now);
                    }
                    param?.linearRampToValueAtTime?.(0, now + seconds);
                }
                else
                {
                    SetAudioParam(
                        voice.stopGain.gain,
                        0,
                        this.#context,
                    );
                }
                const fadeStopTime = actionTime + seconds;
                const sourceStopTime =
                    voice.scheduledEndContextTime === null
                        ? fadeStopTime
                        : Math.max(
                            actionTime,
                            Math.min(
                                fadeStopTime,
                                voice.scheduledEndContextTime,
                            ),
                        );

                voice.source.stop(sourceStopTime);
            }
        }
        else if (!breaking)
        {
            this.#FinishSfxPlaying(playingID);
        }
        if (breaking)
        {
            this.#MaybeFinishSfxProgram(playingID, record);
        }
    }

    /** Emitter placement -> panner. WebAudio is right-handed like Carbon's scene; Wwise's RH->LH flip does not apply. */
    SetPosition(gameObjID, front, top, position)
    {
        const nodes = this.#emitterNodes.get(gameObjID);

        if (nodes)
        {
            const smooth = nodes.position !== null;

            nodes.front = [ ...front ];
            nodes.position = [ ...position ];
            SetPannerPose(
                nodes.panner,
                nodes.front,
                nodes.position,
                this.#distanceScale,
                this.#context,
                smooth,
            );
            for (const modes of nodes.routeBranches.values())
            {
                const branch = modes.get(true);

                if (branch)
                {
                    SetPannerPose(
                        branch.panner,
                        nodes.front,
                        nodes.position,
                        this.#distanceScale,
                        this.#context,
                        smooth,
                    );
                }
            }
            this.#RefreshDistanceGains(nodes, smooth);
        }
    }

    /** Current source play position in milliseconds; -1 when invalid or finished. */
    GetSourcePlayPosition(playingID)
    {
        const record = this.#playing.get(playingID);
        if (!record || record.stopped)
        {
            return -1;
        }
        if (record.music && !record.sfx)
        {
            return record.musicEngine?.GetSourcePlayPosition?.(playingID) ?? -1;
        }
        const voice = record.voices?.find(value =>
            !value.ended
            && (value.source || value.paused || value.pausing));

        if (!voice || voice.startContextTime === null)
        {
            return 0;
        }
        const silenceDuration = Number(voice.silenceDurationSeconds);
        if (Number.isFinite(silenceDuration)
            && silenceDuration > 0
            && voice.repeatRemainingSeconds !== null)
        {
            let remaining = Math.max(
                0,
                Number(voice.repeatRemainingSeconds) || 0,
            );

            if (!voice.paused
                && voice.repeatAnchorContextTime !== null)
            {
                const from = Number(voice.repeatAnchorContextTime);
                const to = Number(this.#context.currentTime);
                const elapsed = to > from
                    ? UsesVoicePitchAutomation(voice)
                        ? IntegrateVoicePitchPlaybackRate(voice, from, to)
                        : (to - from) * voice.playbackRate
                    : 0;

                remaining = Math.max(0, remaining - elapsed);
            }
            return Math.max(0, Math.round(
                Math.min(
                    silenceDuration,
                    silenceDuration - remaining,
                ) * 1000,
            ));
        }
        let seconds = voice.offsetSeconds;

        if (!voice.paused
            && voice.positionAnchorContextTime !== null)
        {
            const from = Number(voice.positionAnchorContextTime);
            const to = Number(this.#context.currentTime);

            seconds += UsesVoicePitchAutomation(voice)
                ? IntegrateVoicePitchPlaybackRate(voice, from, to)
                : Math.max(0, to - from) * voice.playbackRate;
        }
        const duration = Number(voice.buffer?.duration);
        if (Number.isFinite(duration) && duration > 0)
        {
            seconds = (voice.source?.loop
                || voice.loop
                || voice.playCount > 1)
                ? seconds % duration
                : Math.min(seconds, duration);
        }
        return Math.max(0, Math.round(seconds * 1000));
    }

    /** Seeks one playing source by normalized duration. */
    SeekOnEventPercent(playingID, percentToSeek)
    {
        const value = Number(percentToSeek);
        if (!Number.isFinite(value) || value < 0)
        {
            return false;
        }
        return this.#Seek(playingID, { kind: "percent", value });
    }

    /** Seeks one playing source by elapsed milliseconds. */
    SeekOnEventMs(playingID, msToSeek)
    {
        const value = Number(msToSeek);
        if (!Number.isFinite(value) || value < 0)
        {
            return false;
        }
        return this.#Seek(playingID, { kind: "ms", value });
    }

    /** Listener pose -> context.listener. */
    SetListenerPosition(gameObjID, front, top, position)
    {
        const listener = this.#context?.listener;
        if (listener)
        {
            const smooth = this.#listenerPoseInitialized;

            this.#listenerPosition = [ ...position ];

            const set = (param, value) => SetSpatialAudioParam(
                param,
                value,
                this.#context,
                smooth,
            );

            set(listener.positionX, position[0] * this.#distanceScale);
            set(listener.positionY, position[1] * this.#distanceScale);
            set(listener.positionZ, position[2] * this.#distanceScale);
            set(listener.forwardX, front[0]);
            set(listener.forwardY, front[1]);
            set(listener.forwardZ, front[2]);
            set(listener.upX, top[0]);
            set(listener.upY, top[1]);
            set(listener.upZ, top[2]);
            this.#listenerPoseInitialized = true;
            this.#RefreshDistanceGains(null, smooth);
        }
    }

    /** Attenuation scaling -> panner distance scaling. */
    SetScalingFactor(gameObjID, value)
    {
        const numeric = Number(value);
        if (!Number.isFinite(numeric) || numeric <= 0)
        {
            return false;
        }
        const nodes = this.#emitterNodes.get(gameObjID);
        if (!nodes)
        {
            return false;
        }
        nodes.scalingFactor = numeric;
        SetPannerScalingFactor(nodes.panner, numeric);
        for (const modes of nodes.routeBranches.values())
        {
            SetPannerScalingFactor(modes.get(true)?.panner, numeric);
        }
        this.#RefreshDistanceGains(nodes, true);
        return true;
    }

    /**
     * Per-object RTPC store. Installed SFX gain curves update active voices;
     * applications may also inject applyRTPC for project-specific mappings
     * that are outside the portable SFX graph.
     */
    SetRTPCValue(rtpcName, value, gameObjID)
    {
        const name = String(rtpcName);
        const numeric = Number(value);
        if (!Number.isFinite(numeric))
        {
            return false;
        }
        this.#deferSfxControlRefresh = true;
        let result;

        try
        {
            this.#ProcessScheduledSfxActions();
            this.#AdvanceRtpcVoices(
                "game-object",
                gameObjID,
                Number(this.#context?.currentTime) || 0,
            );
            this.#CancelRtpcTransition("game-object", name, gameObjID);
            result = this.#WriteObjectRtpcValue(
                name,
                numeric,
                gameObjID,
            );
        }
        finally
        {
            this.#deferSfxControlRefresh = false;
        }
        // Processing overdue actions above may have changed global RTPCs or
        // another emitter. Flush every suppressed refresh before returning.
        this.#RefreshSfxControls();
        return result;
    }

    /** Per-object RTPC query for adapters, diagnostics, and tests. */
    GetRTPCValue(rtpcName, gameObjID)
    {
        const name = String(rtpcName);

        return this.#ReadRtpcValue(
            "game-object",
            name,
            gameObjID,
            Number(this.#context?.currentTime) || 0,
        );
    }

    /**
     * Per-object switch store. Only the fixed music object steers the built-in
     * global music tree; ordinary scene emitters remain isolated.
     */
    SetSwitch(switchGroup, switchState, gameObjID)
    {
        const group = String(switchGroup);
        const state = String(switchState);
        let values = this.#objectSwitchValues.get(gameObjID);
        if (!values)
        {
            values = new Map();
            this.#objectSwitchValues.set(gameObjID, values);
        }
        const changed = values.get(group) !== state;

        values.set(group, state);
        if (changed)
        {
            this.#AdvanceContinuousSwitchSlots(
                "switch",
                group,
                gameObjID,
            );
        }
        if (gameObjID === 3)
        {
            this.#musicEngine?.SetSwitch?.(group, state, gameObjID);
        }
    }

    /** Per-object switch query for adapters, diagnostics, and tests. */
    GetSwitchValue(switchGroup, gameObjID)
    {
        return this.#objectSwitchValues.get(gameObjID)?.get(String(switchGroup));
    }

    /**
     * Global RTPC store (feeds GetGlobalRTPCValue / monitored parameters).
     * Carbon's volume control groups are RTPCs (menu_main_master_level,
     * menu_main_music_level, ... - all 0..1 user settings); the known volume
     * levels are applied through authored Bus Volume curves when present,
     * with legacy master/music fallbacks for older library documents.
     */
    SetGlobalRTPCValue(rtpcName, value)
    {
        const name = String(rtpcName);
        const numeric = Number(value);
        if (!Number.isFinite(numeric))
        {
            return false;
        }
        this.#deferSfxControlRefresh = true;
        let result;

        try
        {
            this.#ProcessScheduledSfxActions();
            this.#AdvanceRtpcVoices(
                "global",
                undefined,
                Number(this.#context?.currentTime) || 0,
            );
            this.#CancelRtpcTransition("global", name);
            result = this.#WriteGlobalRtpcValue(name, numeric);
        }
        finally
        {
            this.#deferSfxControlRefresh = false;
        }
        this.#RefreshSfxControls();
        return result;
    }

    /** Global state group - feeds authored SFX and music tree arguments. */
    SetGlobalState(stateGroup, stateName)
    {
        const catalogGroup = this.#stateTransitionCatalog.get(
            NormalizeStateIdentity(stateGroup),
        );
        const group = CanonicalStateGroup(catalogGroup, stateGroup);
        const state = CanonicalStateValue(catalogGroup, stateName);
        const previous = this.#globalStateValues.get(group);
        const changed = previous !== state;

        if (changed)
        {
            const now = Number(this.#context?.currentTime) || 0;

            // Pitch is a transport control. Capture elapsed media under the
            // old State-property blend before rebasing an interrupted change.
            this.#AdvanceRtpcVoices("global", undefined, now);
            const fromWeights = this.#ReadStatePropertyWeights(group, now);
            const duration = this.#StateTransitionDuration(
                group,
                previous,
                state,
            ) / 1000;

            if (duration > 0
                && !StateWeightsEqualTarget(fromWeights, state))
            {
                this.#statePropertyTransitions.set(
                    NormalizeStateIdentity(group),
                    {
                        fromWeights,
                        toState: state,
                        startTime: now,
                        duration,
                    },
                );
            }
            else
            {
                this.#statePropertyTransitions.delete(
                    NormalizeStateIdentity(group),
                );
            }
        }
        this.#globalStateValues.set(group, state);
        const transition = this.#statePropertyTransitions.get(
            NormalizeStateIdentity(group),
        );

        this.#RefreshSfxControls(
            null,
            transition
                ? transition.startTime + transition.duration
                : null,
        );
        if (changed)
        {
            this.#AdvanceContinuousSwitchSlots("state", group);
        }
        this.#musicEngine?.SetState(stateGroup, stateName);
        this.#musicEngine?.RefreshBusStates?.();
    }

    /** Global state query for authored SFX selection. */
    GetGlobalState(stateGroup)
    {
        const catalogGroup = this.#stateTransitionCatalog.get(
            NormalizeStateIdentity(stateGroup),
        );

        return this.#globalStateValues.get(
            CanonicalStateGroup(catalogGroup, stateGroup),
        );
    }

    /** Returns the current weighted property mix for one global State group. */
    GetGlobalStatePropertyWeights(stateGroup, at = undefined)
    {
        return this.#ReadStatePropertyWeights(
            stateGroup,
            at === undefined
                ? Number(this.#context?.currentTime) || 0
                : Number(at) || 0,
        );
    }

    /** Returns future global State-property transition boundaries. */
    GetGlobalStateTransitionBoundaries(from = undefined)
    {
        const now = from === undefined
            ? Number(this.#context?.currentTime) || 0
            : Number(from) || 0;
        const result = [];

        for (const transition of this.#statePropertyTransitions.values())
        {
            const start = Number(transition.startTime);
            const end = start + Math.max(0, Number(transition.duration) || 0);

            if (Number.isFinite(start) && start > now) result.push(start);
            if (Number.isFinite(end) && end > now) result.push(end);
        }
        return [ ...new Set(result) ].sort((left, right) => left - right);
    }

    /** Returns the current weighted State-property mix for one State group. */
    #ReadStatePropertyWeights(stateGroup, at)
    {
        const group = String(stateGroup);
        const transition = this.#statePropertyTransitions.get(
            NormalizeStateIdentity(group),
        );

        if (transition)
        {
            return EvaluateStatePropertyTransition(transition, at);
        }
        const state = this.GetGlobalState(group);

        return state === undefined || state === null
            ? []
            : [ { state, weight: 1 } ];
    }

    /** Resolves one directed custom State duration, then the group default. */
    #StateTransitionDuration(stateGroup, fromState, toState)
    {
        const group = this.#stateTransitionCatalog.get(
            NormalizeStateIdentity(stateGroup),
        );

        if (!group)
        {
            return 0;
        }
        const custom = group.transitions.find(transition =>
            StateTransitionEndpointMatches(
                transition.from,
                transition.fromId,
                fromState ?? group.noneState,
            )
            && StateTransitionEndpointMatches(
                transition.to,
                transition.toId,
                toState,
            ));

        return custom?.transitionMs ?? group.defaultTransitionMs;
    }

    /** Collapses completed State-property blends onto their logical target. */
    #ProcessStatePropertyTransitions()
    {
        const now = Number(this.#context?.currentTime) || 0;

        for (const [ key, transition ] of this.#statePropertyTransitions)
        {
            if (transition.startTime + transition.duration <= now)
            {
                // Preserve pitch-controlled media position before discarding
                // the historical blend that the transport integrator reads.
                this.#AdvanceRtpcVoices("global", undefined, now);
                this.#statePropertyTransitions.delete(key);
            }
        }
    }

    /** Monitored-parameter query source. */
    GetGlobalRTPCValue(rtpcName, at = undefined)
    {
        const name = String(rtpcName);

        return this.#ReadRtpcValue(
            "global",
            name,
            undefined,
            at === undefined
                ? Number(this.#context?.currentTime) || 0
                : Number(at) || 0,
        );
    }

    /** Returns future global Game Parameter transition boundaries. */
    GetGlobalRTPCTransitionBoundaries(from = undefined)
    {
        const now = from === undefined
            ? Number(this.#context?.currentTime) || 0
            : Number(from) || 0;
        const result = [];

        for (const transition of this.#rtpcTransitions.values())
        {
            if (transition.scope !== "global") continue;

            const start = Number(transition.startTime);
            const end = start + Math.max(0, Number(transition.duration) || 0);

            if (Number.isFinite(start) && start > now) result.push(start);
            if (Number.isFinite(end) && end > now) result.push(end);
        }
        return [ ...new Set(result) ].sort((left, right) => left - right);
    }

    /** Banks are virtual on the catalog route: media resolves per event, so loads complete immediately. */
    LoadBank(name, callback)
    {
        callback?.(true);
    }

    /** Virtual unload. */
    UnloadBank(name, callback)
    {
        callback?.();
    }

    /** Virtual clear. */
    ClearBanks()
    {
    }

    /** WebAudio renders continuously; the tick drives music-engine lookahead scheduling. */
    RenderAudio()
    {
        this.#busDuckingController?.Prune?.(
            Number(this.#context?.currentTime) || 0,
        );
        this.#ProcessScheduledSfxActions();
        this.#ProcessRtpcTransitions();
        this.#ProcessStatePropertyTransitions();
        this.#FinalizeDueSfxPauses();
        this.#ProcessTriggerRateSlots();
        this.#ProcessCrossfadeSlots();
        this.#musicEngine?.Process();
    }

    /** Issues due Trigger Rate children from the Web Audio clock. */
    #ProcessTriggerRateSlots()
    {
        const now = Number(this.#context?.currentTime) || 0;

        for (const [ playingID, record ] of this.#playing)
        {
            if (!record.sfxProgram || record.stopped)
            {
                continue;
            }
            for (const slot of record.programSlots?.values?.() ?? [])
            {
                if (slot.advanceMode !== "trigger-rate"
                    || slot.state === "ended"
                    || slot.state === "cancelled"
                    || !slot.continuation
                    || slot.broken
                    || slot.exhausted
                    || !Number.isFinite(slot.nextTriggerContextTime)
                    || slot.nextTriggerContextTime > now)
                {
                    continue;
                }
                const deadline = slot.nextTriggerContextTime;

                slot.nextTriggerContextTime = null;
                this.#AdvanceSfxProgramSlot(
                    playingID,
                    record,
                    slot,
                    Math.max(deadline, now),
                );
                this.#MaybeFinishSfxProgram(
                    playingID,
                    record,
                );
            }
        }
    }

    /** Arms the next Trigger Rate deadline from this batch's first action. */
    #ArmTriggerRateSlot(slot)
    {
        if (slot.advanceMode !== "trigger-rate"
            || !slot.continuation
            || slot.completionBarrier
            || slot.broken
            || slot.exhausted)
        {
            slot.nextTriggerContextTime = null;
            return;
        }
        const actionTime = Number(
            slot.currentBatch?.actionTime ?? slot.actionTime,
        );

        slot.nextTriggerContextTime = actionTime
            + slot.transitionDelayMs / 1000;
    }

    /** Promotes due Crossfade successors and begins one-batch lookahead. */
    #ProcessCrossfadeSlots()
    {
        const now = Number(this.#context?.currentTime) || 0;

        for (const [ playingID, record ] of this.#playing)
        {
            if (!record.sfxProgram || record.stopped)
            {
                continue;
            }
            for (const slot of record.programSlots?.values?.() ?? [])
            {
                if (slot.advanceMode !== "crossfade"
                    || slot.state === "ended"
                    || slot.state === "cancelled"
                    || slot.broken
                    || !slot.preparedBatch
                    || !Number.isFinite(slot.nextTriggerContextTime)
                    || slot.nextTriggerContextTime > now)
                {
                    continue;
                }

                const batch = slot.preparedBatch;

                this.#SettleCrossfadeBatchTransaction(
                    batch,
                    now,
                );
                slot.currentBatch = batch;
                slot.preparedBatch = null;
                slot.nextTriggerContextTime = null;
                slot.continuation = batch.continuation;
                slot.exhausted = batch.exhausted;
                slot.completionBarrier = batch.completionBarrier;
                slot.transitionDelayMs = batch.transitionDelayMs;
                slot.crossfadeMode = batch.crossfadeMode;
                this.#UpdateOverlappingSlotState(slot);
                if (this.#MaybeAdvanceNestedCompletionBarrier(
                    playingID,
                    record,
                    slot,
                ))
                {
                    this.#MaybeFinishSfxProgram(playingID, record);
                    continue;
                }

                if (!slot.exhausted
                    && slot.continuation
                    && !slot.completionBarrier
                    && batch.state !== "cancelled")
                {
                    this.#PrepareCrossfadeSuccessor(
                        playingID,
                        record,
                        slot,
                    );
                }
                this.#MaybeFinishSfxProgram(playingID, record);
            }
        }
    }

    /** Active playing ids (introspection/tests). */
    GetPlayingCount()
    {
        return this.#playing.size;
    }

    /** Stops every backend-owned event, including direct music posts. */
    StopAll()
    {
        for (const [ playingID, record ] of [ ...this.#playing ])
        {
            record.stopped = true;

            if (record.music)
            {
                record.musicEngine?.ExecuteAction?.("stop", playingID, 0);
            }
            if (record.sfx)
            {
                for (const voice of record.voices ?? [])
                {
                    if (voice.source)
                    {
                        voice.source.onended = null;
                        try
                        {
                            voice.source.stop?.(this.#context.currentTime);
                        }
                        catch
                        {
                            // already stopped
                        }
                    }
                }
            }

            if (this.#playing.has(playingID))
            {
                this.#FinishPlaying(playingID);
            }
        }
    }

    /** Prevents another Continuous batch while the current object loops out. */
    #BreakContinuousSlots(record)
    {
        const now = Number(this.#context.currentTime) || 0;
        const currentBoundary = now
            + RenderQuantumSeconds(this.#context);

        for (const slot of record.programSlots?.values?.() ?? [])
        {
            if (!slot.continuation)
            {
                continue;
            }
            slot.broken = true;
            slot.exhausted = true;
            slot.nextTriggerContextTime = null;
            slot.preparingCrossfade = false;
            if (slot.preparedBatch)
            {
                this.#DiscardTriggerRateBatch(
                    record,
                    slot,
                    slot.preparedBatch,
                );
            }
            slot.preparedBatch = null;
            for (const batch of slot.batches?.values?.() ?? [])
            {
                if (batch.state === "loading"
                    || batch.state === "pending")
                {
                    batch.state = "cancelled";
                    this.#AbortSfxProgramBatch(record, batch);
                }
            }
            if (slot.state === "loading")
            {
                slot.generation++;
                this.#AbortSfxProgramSlot(record, slot);
            }

            for (const voice of slot.voices)
            {
                if (!voice.ended
                    && voice.startContextTime > currentBoundary)
                {
                    voice.ended = true;
                    voice.stopping = true;
                    voice.cancelledBeforeStart = true;
                    this.#EndVoiceDucking(voice, now, true);
                    this.#voiceLimitLedger.Release(
                        record,
                        voice.voiceLimitReservationId,
                    );
                    if (voice.source)
                    {
                        voice.source.onended = null;
                        try
                        {
                            voice.source.stop(now);
                        }
                        catch
                        {
                            // already stopped
                        }
                        voice.source.disconnect?.();
                    }
                    continue;
                }
                if (!voice.ended
                    && !voice.loop
                    && voice.playCount > 1)
                {
                    StopFiniteRepeatAtBoundary(
                        voice,
                        now,
                    );
                    continue;
                }
                if (!voice.ended && voice.loop)
                {
                    voice.loop = false;
                    if (voice.source)
                    {
                        voice.source.loop = false;
                    }
                }
            }
            const active = [ ...slot.voices ].filter(voice =>
                !voice.ended);

            slot.voice = active[0] ?? null;
            slot.state = active.length ? "voice" : "ended";
        }
    }

    /** Returns whether a physical voice belongs to a Continuous batch slot. */
    #IsContinuousProgramVoice(record, voice)
    {
        return Boolean(
            voice.programSlotId !== undefined
            && record.programSlots?.get(voice.programSlotId)?.advanceMode,
        );
    }

    /** Returns whether Wwise ignores Seek for this Continuous transition. */
    #IsRestrictedContinuousProgramVoice(record, voice)
    {
        const mode = voice.programSlotId === undefined
            ? null
            : record.programSlots?.get(
                voice.programSlotId,
            )?.advanceMode;

        return mode === "trigger-rate" || mode === "crossfade";
    }

    /**
     * Stops owned voices and disconnects WebAudio nodes. The AudioContext is
     * host-owned and is deliberately not closed here.
     */
    Dispose()
    {
        this.StopAll();
        this.SetMusicEngine(null);
        for (const gameObjID of [ ...this.#emitterNodes.keys() ])
        {
            this.UnregisterGameObj(gameObjID);
        }
        this.#objectRtpcValues.clear();
        this.#objectSwitchValues.clear();
        this.#rtpcTransitions.clear();
        this.#statePropertyTransitions.clear();
        this.#globalRtpcValues.clear();
        this.#globalStateValues.clear();
        this.#globalVoiceHighPasses.clear();
        this.#globalVoiceLowPasses.clear();
        this.#globalBusVolumes.clear();
        this.#unsubscribeBusDucking?.();
        this.#unsubscribeBusDucking = null;
        this.#busDuckingController = null;
        this.#busGraphRuntime = null;
        this.#busMixer = null;
        this.#sfxGain?.disconnect?.();
        this.#masterGain?.disconnect?.();
        this.#sfxGain = null;
        this.#masterGain = null;
    }

    /**
     * Current output level (RMS, 0..~0.7) across one emitter's route signals.
     * 0 when the context has no analyser support or the emitter is unknown.
     */
    GetGameObjLevel(gameObjID)
    {
        const nodes = this.#emitterNodes.get(gameObjID);
        const analysers = [
            nodes?.analyser,
            ...[ ...(nodes?.routeBranches?.values?.() ?? []) ]
                .flatMap(modes => [ ...modes.values() ])
                .map(branch => branch.analyser),
        ].filter(analyser => analyser?.getFloatTimeDomainData);

        if (!analysers.length)
        {
            return 0;
        }
        const sampleCount = Math.max(...analysers.map(analyser =>
            Number(analyser.fftSize) || 0));

        if (sampleCount <= 0)
        {
            return 0;
        }
        const mixed = new Float32Array(sampleCount);

        for (const analyser of analysers)
        {
            const samples = new Float32Array(analyser.fftSize);

            analyser.getFloatTimeDomainData(samples);
            for (let index = 0; index < samples.length; index++)
            {
                mixed[index] += samples[index];
            }
        }
        let sum = 0;
        for (let index = 0; index < mixed.length; index++)
        {
            sum += mixed[index] * mixed[index];
        }
        return Math.sqrt(sum / mixed.length);
    }

    /** Allocates and posts one event owned by the active music engine. */
    #PostMusicEvent(eventName, { gameObjID = 3, emitter = null, onFinished = null } = {})
    {
        const musicEngine = this.#musicEngine;
        if (!musicEngine?.HandlesEvent?.(eventName))
        {
            return 0;
        }
        const playingID = this.#nextPlayingID++;
        const record = {
            gameObjID,
            emitter,
            emitterNodes: this.#emitterNodes.get(gameObjID) ?? null,
            eventName: String(eventName),
            source: null,
            sourceGain: null,
            stopped: false,
            sfx: false,
            sfxFinished: true,
            music: true,
            musicFinished: false,
            musicEngine,
            onFinished
        };
        this.#playing.set(playingID, record);
        this.#StartMusicComponent(playingID, record);
        return playingID;
    }

    /**
     * Starts one music side of an authored event and defers a synchronous
     * custom-engine completion until the posting caller can retain its id.
     */
    #StartMusicComponent(playingID, record)
    {
        let posting = true;
        let finished = false;
        const complete = () =>
        {
            if (posting)
            {
                finished = true;
                return;
            }
            this.#FinishMusicPlaying(playingID);
        };

        try
        {
            record.musicEngine.PostEvent(
                record.eventName,
                playingID,
                complete,
                {
                    busVolumeStates: record.emitterNodes?.busVolumes
                        ?? this.#globalBusVolumes,
                },
            );
        }
        catch
        {
            finished = true;
        }
        finally
        {
            posting = false;
        }

        if (finished)
        {
            Promise.resolve().then(() =>
                this.#FinishMusicPlaying(playingID));
        }
    }

    /** Applies or defers a millisecond/percentage seek for one playing id. */
    #Seek(playingID, seek)
    {
        const record = this.#playing.get(playingID);
        if (!record || record.stopped)
        {
            return false;
        }
        let handled = false;

        if (record.music)
        {
            const method = seek.kind === "percent" ? "SeekOnEventPercent" : "SeekOnEventMs";
            handled = record.musicEngine?.[method]?.(
                playingID,
                seek.value,
            ) === true;
            if (!record.sfx)
            {
                return handled;
            }
        }
        const hasRestrictedContinuous = [
            ...record.programSlots?.values?.() ?? [],
        ].some(slot =>
            slot.advanceMode === "trigger-rate"
            || slot.advanceMode === "crossfade");
        const canSeekSfx = !record.sfxProgram
            || [ ...record.programSlots?.values?.() ?? [] ]
                .some(slot =>
                    slot.advanceMode !== "trigger-rate"
                    && slot.advanceMode !== "crossfade");

        if (!canSeekSfx)
        {
            return handled;
        }
        if (record.loaded)
        {
            const now = Number(this.#context.currentTime) || 0;
            const renderQuantum = RenderQuantumSeconds(this.#context);
            const started = record.voices.filter(voice =>
                voice.source
                && !voice.ended
                && (!hasRestrictedContinuous
                    || !this.#IsRestrictedContinuousProgramVoice(
                        record,
                        voice,
                    ))
                && voice.startContextTime <= now + renderQuantum);

            if (!started.length)
            {
                return handled;
            }

            record.pendingSeek = seek;
            this.#StartVoices(playingID, record, started);
            return true;
        }
        record.pendingSeek = seek;
        return true;
    }

    /** Reserves supported Sound caps before any asynchronous media request. */
    #ReserveSfxProgram(record, program)
    {
        if (!Array.isArray(program))
        {
            throw new TypeError("Resolved SFX program is invalid");
        }
        const created = [];

        try
        {
            return program.map(operation =>
            {
                if (operation.kind !== "play")
                {
                    return operation;
                }
                const originalSelections = operation.selections ?? [];
                const selections = [];

                for (const selection of originalSelections)
                {
                    const limit = selection.voiceLimit;

                    if (limit === undefined)
                    {
                        selections.push(selection);
                        continue;
                    }
                    const counterNumber = Number(limit?.counterId);

                    if (!limit
                        || typeof limit !== "object"
                        || Array.isArray(limit)
                        || limit.scope !== "game-object"
                        || Number(limit.maxInstances) !== 1
                        || limit.behavior !== "reject-newest"
                        || !Number.isSafeInteger(counterNumber)
                        || counterNumber <= 0
                        || counterNumber > 0xffffffff
                        || String(counterNumber) !== String(limit.counterId)
                        || Number(selection.delayMs) > 0)
                    {
                        throw new TypeError(
                            "Resolved SFX voice limit is unsupported",
                        );
                    }

                    const reservationID = this.#voiceLimitLedger.Reserve(
                        record,
                        String(counterNumber),
                    );

                    if (reservationID === null)
                    {
                        selections.push({
                            ...selection,
                            voiceLimitRejected: true,
                        });
                        continue;
                    }
                    created.push(reservationID);
                    selections.push({
                        ...selection,
                        voiceLimitReservationId: reservationID,
                    });
                }

                return {
                    ...operation,
                    selections: Object.freeze(selections),
                };
            });
        }
        catch (error)
        {
            for (const reservationID of created)
            {
                this.#voiceLimitLedger.Release(
                    record,
                    reservationID,
                );
            }
            throw error;
        }
    }

    /** Releases reservations whose selected media never became a voice. */
    #ReleasePendingSfxVoiceLimitReservations(record, program)
    {
        for (const operation of Array.isArray(program) ? program : [])
        {
            for (const selection of operation.kind === "play"
                ? operation.selections ?? []
                : [])
            {
                this.#voiceLimitLedger.ReleasePending(
                    record,
                    [ selection ],
                );
            }
        }
    }

    /** Aborts one slot and releases only tokens not yet bound to a voice. */
    #AbortSfxProgramSlot(record, slot)
    {
        this.#voiceLimitLedger.ReleasePending(
            record,
            slot?.selections,
        );
        for (const batch of slot?.batches?.values?.() ?? [])
        {
            this.#voiceLimitLedger.ReleasePending(
                record,
                batch.selections,
            );
        }
        slot.Abort();
    }

    /** Aborts one overlapping batch without retaining an unclaimed cap. */
    #AbortSfxProgramBatch(record, batch)
    {
        this.#voiceLimitLedger.ReleasePending(
            record,
            batch?.selections,
        );
        batch.Abort();
    }

    /** Installs one synchronously resolved authored SFX program. */
    #InstallSfxProgram(playingID, record, program)
    {
        if (!record
            || this.#playing.get(playingID) !== record
            || !Array.isArray(program))
        {
            throw new TypeError("Resolved SFX program is invalid");
        }
        if (record.sfxProgram)
        {
            throw new Error("Resolved SFX program was installed twice");
        }

        record.sfxProgram = true;
        record.programSlots = new Map();
        record.planningProgram = true;
        const installedProgram = [];

        try
        {
            for (const rawOperation of program)
            {
                const operation = rawOperation.kind === "play"
                    ? this.#ReserveSfxProgram(
                        record,
                        [ rawOperation ],
                    )[0]
                    : rawOperation;

                installedProgram.push(operation);
                if (operation.kind === "play")
                {
                    const continuations = new Map();

                    for (const continuation
                        of operation.continuations ?? [])
                    {
                        const id = String(
                            continuation.programSlotId ?? "",
                        );

                        if (!id || continuations.has(id)
                            || record.programSlots.has(id))
                        {
                            throw new Error(
                                `Invalid SFX continuation slot ${id}`,
                            );
                        }
                        const selections =
                            operation.selections?.filter(selection =>
                                selection.programSlotId === id) ?? [];
                        const selectionMetadata = selections.map(selection =>
                            CreateProgramSelectionMetadata(
                                selection,
                                record.postContextTime,
                            ));
                        const leafIndex = selections.length
                            ? Math.min(...selections.map(selection =>
                                Number(selection.leafIndex)))
                            : 0;
                        const matchIds = Object.freeze(
                            [ ...new Set([
                                ...(continuation.matchIds ?? [])
                                    .map(String),
                                ...selections.flatMap(selection =>
                                    (selection.matchIds ?? [])
                                        .map(String)),
                            ]) ],
                        );
                        const slot = new CjsAudioBackendSfxProgramSlot({
                            id,
                            playingID,
                            actionIndex: Number(
                                operation.actionIndex,
                            ),
                            leafIndex,
                            actionTime: selectionMetadata.length
                                ? Math.min(...selectionMetadata.map(
                                    selection => selection.actionTime,
                                ))
                                : record.postContextTime,
                            continuousMatchIds: Object.freeze(
                                (continuation.matchIds ?? []).map(String),
                            ),
                            matchIds,
                            selections: Object.freeze(selectionMetadata),
                            cancelledSelectionKeys:
                                CreateProgramCancelledSelectionKeys(
                                    selectionMetadata,
                                ),
                            selectionControllers:
                                CreateProgramSelectionControllers(
                                    selectionMetadata,
                                ),
                            continuation: continuation.token,
                            continuousNodeId: String(
                                continuation.containerId ?? "",
                            ),
                            advanceMode:
                                continuation.advance === "trigger-rate"
                                    ? "trigger-rate"
                                    : continuation.advance === "crossfade"
                                        ? "crossfade"
                                        : continuation.advance === "switch"
                                            ? "switch"
                                            : "completion",
                            switchGroups: NormalizeContinuousSwitchGroups(
                                continuation.switchGroups,
                            ),
                            crossfadeMode:
                                continuation.crossfadeMode ?? null,
                            completionBarrier:
                                continuation.completionBarrier === true,
                            transitionDelayMs: Math.max(
                                0,
                                Number(continuation.delayMs) || 0,
                            ),
                            exhausted:
                                continuation.doneAfterBatch === true,
                        });

                        if (IsOverlappingAdvanceMode(slot.advanceMode))
                        {
                            slot.batches = new Map();
                            const batch = slot.CreateBatch({
                                id: continuation.programBatchId,
                                continuation: continuation.token,
                                exhausted:
                                    continuation.doneAfterBatch === true,
                                completionBarrier:
                                    continuation.completionBarrier === true,
                                transitionDelayMs:
                                    slot.transitionDelayMs,
                                crossfadeMode:
                                    slot.crossfadeMode,
                            });

                            slot.batches.set(batch.id, batch);
                            slot.currentBatch = batch;
                            slot.state = "active";
                            if (slot.advanceMode === "trigger-rate")
                            {
                                this.#ArmTriggerRateSlot(slot);
                            }
                        }
                        continuations.set(id, slot);
                        record.programSlots.set(id, slot);
                    }

                    for (const selection of operation.selections ?? [])
                    {
                        const actionIndex = Number(
                            selection.actionIndex
                            ?? operation.actionIndex,
                        );
                        const leafIndex = Number(selection.leafIndex);
                        const selectionMetadata =
                            CreateProgramSelectionMetadata(
                                selection,
                                record.postContextTime,
                            );
                        const id = selection.programSlotId
                            ?? `${actionIndex}:${leafIndex}`;
                        const existing = record.programSlots.get(id);

                        if (existing)
                        {
                            if (!continuations.has(id))
                            {
                                throw new Error(
                                    `Duplicate SFX program slot ${id}`,
                                );
                            }
                            existing.matchIds = Object.freeze(
                                [ ...new Set([
                                    ...existing.matchIds,
                                    ...(selection.matchIds ?? [])
                                        .map(String),
                                ]) ],
                            );
                            continue;
                        }

                        record.programSlots.set(
                            id,
                            new CjsAudioBackendSfxProgramSlot({
                                id,
                                playingID,
                                actionIndex,
                                leafIndex,
                                actionTime: selectionMetadata.actionTime,
                                matchIds: Object.freeze(
                                    (selection.matchIds ?? [])
                                        .map(String),
                                ),
                                selections: Object.freeze([
                                    selectionMetadata,
                                ]),
                                cancelledSelectionKeys:
                                    CreateProgramCancelledSelectionKeys([
                                        selectionMetadata,
                                    ]),
                                selectionControllers:
                                    CreateProgramSelectionControllers([
                                        selectionMetadata,
                                    ]),
                            }),
                        );
                    }
                    continue;
                }
                if (operation.kind !== "stop"
                    && operation.kind !== "pause"
                    && operation.kind !== "resume"
                    && operation.kind !== "set-voice-pitch"
                    && operation.kind !== "reset-voice-pitch"
                    && operation.kind !== "set-voice-volume"
                    && operation.kind !== "reset-voice-volume"
                    && operation.kind !== "set-bus-voice-volume"
                    && operation.kind !== "set-bus-volume"
                    && operation.kind !== "reset-bus-volume"
                    && operation.kind !== "set-voice-low-pass"
                    && operation.kind !== "reset-voice-low-pass"
                    && operation.kind !== "set-voice-high-pass"
                    && operation.kind !== "reset-voice-high-pass"
                    && operation.kind !== "set-game-parameter"
                    && operation.kind !== "reset-game-parameter"
                    && operation.kind !== "switch"
                    && operation.kind !== "state")
                {
                    throw new TypeError(
                        `Unsupported resolved SFX operation ${operation.kind}`,
                    );
                }

                const action = {
                    ...operation,
                    ownerPlayingID: playingID,
                    gameObjID: record.gameObjID,
                    emitterNodes: record.emitterNodes,
                    actionTime: record.postContextTime
                        + Math.max(
                            0,
                            Number(operation.delayMs) || 0,
                        ) / 1000,
                };
                const now = Number(this.#context.currentTime) || 0;

                if (action.actionTime <= now)
                {
                    this.#ApplySfxProgramAction(action, now);
                }
                else
                {
                    record.pendingProgramActions++;
                    this.#scheduledSfxActions.push(action);
                }
            }

            this.#scheduledSfxActions.sort(CompareSfxActions);
        }
        finally
        {
            record.planningProgram = false;
        }
        this.#MaybeFinishSfxProgram(playingID, record);
        return installedProgram;
    }

    /** Executes every authored SFX action whose absolute time has arrived. */
    #ProcessScheduledSfxActions()
    {
        const now = Number(this.#context?.currentTime) || 0;

        while (this.#scheduledSfxActions.length
            && this.#scheduledSfxActions[0].actionTime <= now)
        {
            const action = this.#scheduledSfxActions.shift();
            const owner = this.#playing.get(action.ownerPlayingID);

            if (!owner || owner.stopped)
            {
                continue;
            }

            owner.pendingProgramActions = Math.max(
                0,
                owner.pendingProgramActions - 1,
            );
            this.#ApplySfxProgramAction(action, now);
            this.#MaybeFinishSfxProgram(
                action.ownerPlayingID,
                owner,
            );
        }
    }

    /** Dispatches one due authored SFX operation. */
    #ApplySfxProgramAction(action, now)
    {
        if (action.kind === "stop")
        {
            this.#ApplySfxStop(action, now);
        }
        else if (action.kind === "pause"
            || action.kind === "resume")
        {
            this.#ApplySfxPlaybackControl(action, now);
        }
        else if (action.kind === "set-voice-pitch"
            || action.kind === "reset-voice-pitch")
        {
            this.#ApplySfxVoicePitch(action, now);
        }
        else if (action.kind === "set-game-parameter"
            || action.kind === "reset-game-parameter")
        {
            this.#ApplySfxGameParameter(action, now);
        }
        else if (action.kind === "switch")
        {
            this.SetSwitch(action.group, action.value, action.gameObjID);
        }
        else if (action.kind === "state")
        {
            this.SetGlobalState(action.group, action.value);
        }
        else if (action.kind === "set-voice-low-pass"
            || action.kind === "reset-voice-low-pass"
            || action.kind === "set-voice-high-pass"
            || action.kind === "reset-voice-high-pass")
        {
            this.#ApplySfxVoiceFilter(action);
        }
        else if (action.kind === "set-bus-volume"
            || action.kind === "reset-bus-volume")
        {
            this.#ApplySfxBusVolume(action);
        }
        else if (action.kind === "set-bus-voice-volume")
        {
            this.#ApplySfxBusVoiceVolume(action);
        }
        else
        {
            this.#ApplySfxVoiceVolume(action, now);
        }
    }

    /** Applies one persistent Voice Volume property mutation. */
    #ApplySfxVoiceVolume(action)
    {
        const targetId = String(action.targetId);
        const apply = nodes =>
        {
            ApplyVoiceVolumeAction(
                nodes.voiceVolumes,
                targetId,
                action,
            );
        };

        if (action.scope === "global")
        {
            for (const nodes of this.#emitterNodes.values())
            {
                apply(nodes);
            }
            this.#RefreshSfxVoiceVolumes();
            return;
        }

        if (this.#emitterNodes.get(action.gameObjID)
            !== action.emitterNodes)
        {
            return;
        }
        apply(action.emitterNodes);
        this.#RefreshSfxVoiceVolumes(action.gameObjID);
    }

    /** Applies one persistent Wwise Bus Volume property mutation. */
    #ApplySfxBusVolume(action)
    {
        if (action.scope === "global")
        {
            ApplyBusVolumeAction(this.#globalBusVolumes, action);
            const generations = new Set(this.#emitterNodes.values());

            for (const record of this.#playing.values())
            {
                if (record.emitterNodes)
                {
                    generations.add(record.emitterNodes);
                }
            }
            for (const nodes of generations)
            {
                ApplyBusVolumeAction(nodes.busVolumes, action);
            }
            this.#RefreshSfxBusVolumes();
            this.#musicEngine?.RefreshBusVolumeGains?.();
            return;
        }

        if (this.#emitterNodes.get(action.gameObjID)
            !== action.emitterNodes)
        {
            return;
        }
        ApplyBusVolumeAction(action.emitterNodes.busVolumes, action);
        this.#RefreshSfxBusVolumes(action.gameObjID);
        this.#musicEngine?.RefreshBusVolumeGains?.();
    }

    /** Applies one game-object Bus-target Voice Volume mutation. */
    #ApplySfxBusVoiceVolume(action)
    {
        if (action.scope !== "game-object"
            || this.#emitterNodes.get(action.gameObjID)
                !== action.emitterNodes)
        {
            return;
        }
        ApplyVoiceVolumeAction(
            action.emitterNodes.busVoiceVolumes,
            String(action.targetId),
            action,
        );
        this.#RefreshSfxBusVoiceVolumes(action.gameObjID);
    }

    /** Applies one persistent Voice Pitch property mutation. */
    #ApplySfxVoicePitch(action, now)
    {
        const targetId = String(action.targetId);
        const apply = nodes =>
        {
            this.#AdvanceMatchingSfxVoices(
                nodes,
                targetId,
                now,
            );
            ApplyVoicePitchAction(
                nodes.voicePitches,
                targetId,
                action,
            );
        };

        if (action.scope === "global")
        {
            for (const nodes of this.#emitterNodes.values())
            {
                apply(nodes);
            }
            this.#RefreshSfxVoicePitches();
            return;
        }

        if (this.#emitterNodes.get(action.gameObjID)
            !== action.emitterNodes)
        {
            return;
        }
        apply(action.emitterNodes);
        this.#RefreshSfxVoicePitches(action.gameObjID);
    }

    /** Applies one persistent Voice LPF or HPF property mutation. */
    #ApplySfxVoiceFilter(action)
    {
        const lowPass = action.kind.endsWith("low-pass");
        const apply = nodes =>
        {
            ApplyVoiceFilterAction(
                lowPass ? nodes.voiceLowPasses : nodes.voiceHighPasses,
                action,
                lowPass ? "lowPass" : "highPass",
            );
        };

        if (action.scope === "global")
        {
            ApplyVoiceFilterAction(
                lowPass
                    ? this.#globalVoiceLowPasses
                    : this.#globalVoiceHighPasses,
                action,
                lowPass ? "lowPass" : "highPass",
            );
            for (const nodes of this.#emitterNodes.values())
            {
                apply(nodes);
            }
            this.#RefreshSfxVoiceFilters();
            return;
        }

        if (this.#emitterNodes.get(action.gameObjID)
            !== action.emitterNodes)
        {
            return;
        }
        apply(action.emitterNodes);
        this.#RefreshSfxVoiceFilters(action.gameObjID);
    }

    /** Applies one persistent Set or Reset Game Parameter mutation. */
    #ApplySfxGameParameter(action, now)
    {
        const scope = action.scope;
        const name = String(action.rtpc);
        const gameObjID = action.gameObjID;

        if (scope === "game-object"
            && this.#emitterNodes.get(gameObjID)
                !== action.emitterNodes)
        {
            return false;
        }

        const currentTime = Number(now) || 0;
        const at = Math.min(
            currentTime,
            Math.max(0, Number(action.actionTime) || 0),
        );
        const key = this.#RtpcTransitionKey(scope, name, gameObjID);

        this.#AdvanceRtpcVoices(scope, gameObjID, currentTime);

        const defaultValue = Number(action.defaultValue);
        const fallback = scope === "game-object"
            ? this.#ReadRtpcValue("global", name, undefined, at)
                ?? (Number.isFinite(defaultValue)
                    ? defaultValue
                    : undefined)
            : Number.isFinite(defaultValue)
                ? defaultValue
                : undefined;
        const stored = this.#ReadRtpcValue(
            scope,
            name,
            gameObjID,
            at,
        );
        const current = stored ?? fallback ?? 0;
        const resetting = action.kind === "reset-game-parameter";
        const authoredValue = Number(action.gameParameterValue);
        const target = resetting
            ? defaultValue
            : action.valueMode === "relative"
                ? current + authoredValue
                : authoredValue;

        this.#rtpcTransitions.delete(key);
        if (!Number.isFinite(target))
        {
            return false;
        }

        const transitionMs = Math.max(
            0,
            Number(action.transitionMs) || 0,
        );

        if (transitionMs === 0
            || current === target
            || at + transitionMs / 1000 <= currentTime)
        {
            this.#WriteRtpcValue(scope, name, target, gameObjID);
            return true;
        }

        this.#rtpcTransitions.set(key, {
            key,
            scope,
            name,
            gameObjID,
            emitterNodes: action.emitterNodes ?? null,
            from: current,
            to: target,
            startTime: at,
            duration: transitionMs / 1000,
            curve: Number(action.curve ?? LINEAR_FADE_CURVE),
            resetting,
            // The action's bypass flag addresses Wwise's separate internal
            // Game Parameter interpolation. runtime-resource does not expose
            // that STMG policy yet, so the authored action transition remains
            // exact while the flag is retained for future realization.
            bypassTransition: action.bypassTransition === true,
        });
        this.#RefreshSfxControls(
            scope === "game-object" ? gameObjID : null,
            at + transitionMs / 1000,
        );
        if (scope === "global")
        {
            this.#musicEngine?.RefreshBusRtpcs?.();
        }
        return true;
    }

    /** Advances every live authored Game Parameter transition. */
    #ProcessRtpcTransitions()
    {
        const now = Number(this.#context?.currentTime) || 0;

        for (const [ key, transition ] of [ ...this.#rtpcTransitions ])
        {
            if (transition.startTime + transition.duration <= now)
            {
                this.#AdvanceRtpcVoices(
                    transition.scope,
                    transition.gameObjID,
                    now,
                );
                this.#AdvanceRtpcTransition(key, now);
            }
        }
    }

    /** Advances one transition and returns its current effective value. */
    #AdvanceRtpcTransition(key, now)
    {
        const transition = this.#rtpcTransitions.get(key);

        if (!transition)
        {
            return undefined;
        }
        if (transition.scope === "game-object"
            && this.#emitterNodes.get(transition.gameObjID)
                !== transition.emitterNodes)
        {
            this.#rtpcTransitions.delete(key);
            return undefined;
        }

        const progress = transition.duration <= 0
            ? 1
            : Math.max(0, Math.min(
                1,
                (Number(now) - transition.startTime)
                    / transition.duration,
            ));
        const amount = evaluateWwiseInterpolation(
            transition.curve,
            progress,
        );
        const value = transition.from
            + (transition.to - transition.from) * amount;

        if (progress >= 1)
        {
            this.#rtpcTransitions.delete(key);
            this.#WriteRtpcValue(
                transition.scope,
                transition.name,
                transition.to,
                transition.gameObjID,
            );
        }
        return value;
    }

    /** Reads one RTPC value at a requested point on its active timeline. */
    #ReadRtpcValue(scope, name, gameObjID, at)
    {
        const transition = this.#rtpcTransitions.get(
            this.#RtpcTransitionKey(scope, name, gameObjID),
        );

        if (transition)
        {
            return EvaluateRtpcTransition(transition, at);
        }
        return scope === "global"
            ? this.#globalRtpcValues.get(name)
            : this.#objectRtpcValues.get(gameObjID)?.get(name);
    }

    /** Advances affected SFX voice transport before an RTPC mutation. */
    #AdvanceRtpcVoices(scope, gameObjID, at)
    {
        for (const record of this.#playing.values())
        {
            if (!record.sfx
                || (scope === "game-object"
                    && (record.gameObjID !== gameObjID
                        || record.emitterNodes
                            !== this.#emitterNodes.get(gameObjID))))
            {
                continue;
            }
            for (const voice of record.voices ?? [])
            {
                if (!voice.ended)
                {
                    this.#AdvanceSfxVoiceTransport(voice, at);
                }
            }
        }
    }

    /** Returns the last relevant control-transition boundary for a record. */
    #RtpcTransitionEndForRecord(record, from)
    {
        return this.#ControlTransitionBoundariesForRecord(
            record,
            from,
        ).at(-1) ?? (Number(from) || 0);
    }

    /** Collects future State and RTPC transition boundaries for a record. */
    #ControlTransitionBoundariesForRecord(record, from)
    {
        const start = Number(from) || 0;
        const boundaries = new Set();
        const add = transition =>
        {
            const end = Number(transition?.startTime)
                + Math.max(0, Number(transition?.duration) || 0);

            if (Number.isFinite(end) && end > start)
            {
                boundaries.add(end);
            }
        };

        for (const transition of this.#statePropertyTransitions.values())
        {
            add(transition);
        }

        for (const transition of this.#rtpcTransitions.values())
        {
            if (transition.scope === "global"
                || (transition.scope === "game-object"
                    && record.gameObjID === transition.gameObjID
                    && record.emitterNodes
                        === this.#emitterNodes.get(record.gameObjID)))
            {
                add(transition);
            }
        }
        for (const transition of
            record.emitterNodes?.retiredRtpcTransitions?.values?.() ?? [])
        {
            add(transition);
        }
        return [ ...boundaries ].sort((left, right) => left - right);
    }

    /** Creates the stable map key for one scoped RTPC transition. */
    #RtpcTransitionKey(scope, name, gameObjID = "")
    {
        return scope === "global"
            ? `g\0${name}`
            : `o\0${String(gameObjID)}\0${name}`;
    }

    /** Cancels one active scoped RTPC transition. */
    #CancelRtpcTransition(scope, name, gameObjID = "")
    {
        this.#rtpcTransitions.delete(
            this.#RtpcTransitionKey(scope, name, gameObjID),
        );
    }

    /** Cancels every active RTPC transition for one game object. */
    #CancelObjectRtpcTransitions(gameObjID)
    {
        const objectID = String(gameObjID);

        for (const [ key, transition ] of this.#rtpcTransitions)
        {
            if (transition.scope === "game-object"
                && String(transition.gameObjID) === objectID)
            {
                this.#rtpcTransitions.delete(key);
            }
        }
    }

    /** Writes one resolved RTPC value through its selected scope. */
    #WriteRtpcValue(scope, name, value, gameObjID)
    {
        return scope === "global"
            ? this.#WriteGlobalRtpcValue(name, value)
            : this.#WriteObjectRtpcValue(name, value, gameObjID);
    }

    /** Stores one object RTPC value and refreshes affected realization. */
    #WriteObjectRtpcValue(name, value, gameObjID)
    {
        let values = this.#objectRtpcValues.get(gameObjID);

        if (!values)
        {
            values = new Map();
            this.#objectRtpcValues.set(gameObjID, values);
        }
        values.set(name, value);
        this.#RefreshSfxControls(gameObjID);
        const nodes = this.#emitterNodes.get(gameObjID) ?? null;

        this.#ApplyRTPCToEmitterNodes(nodes, gameObjID, name, value);
        return true;
    }

    /** Stores one global RTPC value and refreshes affected realization. */
    #WriteGlobalRtpcValue(name, value)
    {
        this.#globalRtpcValues.set(name, value);
        this.#RefreshSfxControls();
        const authoredBusControl = busRtpcCatalogUsesControl(
            this.#busRtpcCatalog,
            name,
        );

        if (!authoredBusControl && name === "menu_main_master_level")
        {
            SetAudioParam(
                this.#masterGain?.gain,
                Math.max(0, Math.min(1, value || 0)),
                this.#context,
            );
        }
        else if (!authoredBusControl && name === "menu_main_music_level")
        {
            this.#musicEngine?.SetMusicVolume(value);
        }
        this.#musicEngine?.RefreshBusRtpcs?.();
        return true;
    }

    /** Advances matching voices before replacing their active pitch curve. */
    #AdvanceMatchingSfxVoices(nodes, targetId, at)
    {
        for (const record of this.#playing.values())
        {
            if (!record.sfx || record.emitterNodes !== nodes)
            {
                continue;
            }
            for (const voice of record.voices ?? [])
            {
                if (!voice.ended
                    && voice.matchIds?.map(String).includes(targetId))
                {
                    this.#AdvanceSfxVoiceTransport(voice, at);
                }
            }
        }
    }

    /** Applies one authored Pause or Resume to matching live SFX instances. */
    #ApplySfxPlaybackControl(action, now)
    {
        const pausing = action.kind === "pause";

        for (const [ playingID, record ] of this.#playing)
        {
            if (!record.sfx
                || (action.scope === "game-object"
                    && record.gameObjID !== action.gameObjID))
            {
                continue;
            }

            if (!record.sfxProgram)
            {
                if (CompareFallbackOrder(
                    record,
                    playingID,
                    action,
                ) > 0)
                {
                    continue;
                }
                for (const voice of record.voices ?? [])
                {
                    if (!voice.ended
                        && PlaybackControlMatchesValue(action, voice))
                    {
                        this.#ApplySfxVoicePauseDepth(
                            playingID,
                            record,
                            voice,
                            action,
                            now,
                            pausing,
                        );
                    }
                }
                continue;
            }

            for (const slot of record.programSlots.values())
            {
                if (slot.state === "ended"
                    || slot.state === "cancelled")
                {
                    continue;
                }

                for (const selection of ProgramSlotSelections(slot))
                {
                    if (CompareProgramOrder(
                        selection,
                        slot,
                        action,
                    ) > 0
                        || !PlaybackControlMatchesValue(
                            action,
                            selection,
                        ))
                    {
                        continue;
                    }
                    AdjustPauseDepth(
                        slot.pauseDepths,
                        ProgramSelectionKey(selection),
                        pausing,
                    );
                }

                for (const voice of slot.voices)
                {
                    if (voice.ended
                        || CompareProgramOrder(
                            voice,
                            slot,
                            action,
                        ) > 0
                        || !PlaybackControlMatchesValue(action, voice))
                    {
                        continue;
                    }
                    this.#ApplySfxVoicePauseDepth(
                        playingID,
                        record,
                        voice,
                        action,
                        now,
                        pausing,
                    );
                }
            }
        }
    }

    /** Adjusts one logical voice's stacked Wwise pause depth. */
    #ApplySfxVoicePauseDepth(
        playingID,
        record,
        voice,
        action,
        now,
        pausing,
    )
    {
        const previous = Math.max(0, Number(voice.pauseDepth) || 0);
        const next = pausing
            ? previous + 1
            : Math.max(0, previous - 1);

        voice.pauseDepth = next;
        if (previous === 0 && next === 1)
        {
            this.#PauseSfxVoice(voice, action, now);
        }
        else if (previous === 1 && next === 0)
        {
            this.#ResumeSfxVoice(
                playingID,
                record,
                voice,
                action,
                now,
            );
        }
    }

    /** Stops one disposable WebAudio source while retaining its logical voice. */
    #PauseSfxVoice(voice, action, now)
    {
        if (voice.stopping || voice.ended)
        {
            return;
        }

        const actionTime = Number(action.actionTime) || 0;
        const seconds = Math.max(
            0,
            Number(action.transitionMs) || 0,
        ) / 1000;
        const pauseTime = actionTime + seconds;
        const currentTime = Math.max(actionTime, Number(now) || 0);

        if (!voice.source || pauseTime <= currentTime)
        {
            this.#FinalizeSfxVoicePause(
                voice,
                Math.min(pauseTime, currentTime),
            );
            return;
        }

        const progress = seconds > 0
            ? Math.max(
                0,
                Math.min(1, (currentTime - actionTime) / seconds),
            )
            : 1;
        const remaining = Math.max(0, pauseTime - currentTime);
        const param = voice.stopGain.gain;

        param?.cancelScheduledValues?.(currentTime);
        ScheduleWwiseFade(
            param,
            1,
            0,
            currentTime,
            remaining,
            Number(action.curve ?? LINEAR_FADE_CURVE),
            progress,
        );
        voice.pausing = true;
        voice.pauseContextTime = pauseTime;
        const naturalEnd = SfxVoiceNaturalEndContextTime(voice);

        if (!Number.isFinite(naturalEnd) || pauseTime < naturalEnd)
        {
            voice.pauseSource = voice.source;
            voice.source.stop(pauseTime);
        }
        else
        {
            // Let an earlier authored/natural ending win. Its onended callback
            // closes the logical voice instead of retaining a dead pause.
            voice.pauseSource = null;
        }
    }

    /** Finalizes a due pause without reporting EndOfEvent. */
    #FinalizeSfxVoicePause(voice, pauseTime)
    {
        if (voice.ended || voice.stopping || voice.paused)
        {
            return;
        }

        const now = Number(this.#context.currentTime) || 0;

        this.#AdvanceSfxVoiceTransport(
            voice,
            Number.isFinite(Number(pauseTime))
                ? Number(pauseTime)
                : now,
        );

        const source = voice.source;

        if (source)
        {
            this.#EndVoiceDucking(
                voice,
                pauseTime,
                pauseTime <= voice.startContextTime,
            );
            source.onended = null;
            try
            {
                source.stop(now);
            }
            catch
            {
                // already stopped
            }
            source.disconnect?.();
        }
        voice.source = null;
        voice.sourceStarted = false;
        voice.positionAnchorContextTime = null;
        voice.repeatAnchorContextTime = null;
        voice.pausing = false;
        voice.paused = true;
        voice.pauseContextTime = null;
        voice.pauseSource = null;
        SetAudioParam(voice.stopGain.gain, 0, this.#context);
    }

    /** Restarts one paused logical voice at its preserved media position. */
    #ResumeSfxVoice(playingID, record, voice, action, now)
    {
        if (voice.stopping || voice.ended || voice.pauseDepth > 0)
        {
            return;
        }

        const currentTime = Number(now) || 0;

        if (voice.pausing && voice.source)
        {
            this.#AdvanceSfxVoiceTransport(voice, currentTime);
            const source = voice.source;

            this.#EndVoiceDucking(voice, currentTime);
            source.onended = null;
            try
            {
                source.stop(currentTime);
            }
            catch
            {
                // already stopped
            }
            source.disconnect?.();
            voice.source = null;
        }

        ClearPauseFadeForResume(
            voice.stopGain.gain,
            currentTime,
        );

        const repeatRemaining = voice.repeatRemainingSeconds;

        if (repeatRemaining !== null && repeatRemaining <= 0)
        {
            voice.paused = false;
            voice.pausing = false;
            voice.ended = true;
            this.#SetSfxProgramSlotEnded(playingID, record, voice);
            this.#MaybeFinishSfxProgram(playingID, record);
            return;
        }

        voice.paused = false;
        voice.pausing = false;
        voice.pauseContextTime = null;
        voice.pauseSource = null;
        const startTime = currentTime
            + RenderQuantumSeconds(this.#context);

        this.#StartVoice(
            playingID,
            record,
            voice,
            {
                kind: "resume",
                offsetSeconds: voice.offsetSeconds,
                repeatRemainingSeconds: repeatRemaining,
            },
            startTime,
        );

        const seconds = Math.max(
            0,
            Number(action.transitionMs) || 0,
        ) / 1000;

        if (seconds > 0)
        {
            ScheduleWwiseFade(
                voice.stopGain.gain,
                0,
                1,
                startTime,
                seconds,
                Number(action.curve ?? LINEAR_FADE_CURVE),
            );
        }
        else
        {
            SetAudioParam(voice.stopGain.gain, 1, this.#context);
        }
    }

    /** Finalizes scheduled Pause transitions even if a host delays onended. */
    #FinalizeDueSfxPauses()
    {
        const now = Number(this.#context?.currentTime) || 0;

        for (const record of this.#playing.values())
        {
            for (const voice of record.voices ?? [])
            {
                if (voice.pausing
                    && voice.pauseSource === voice.source
                    && Number(voice.pauseContextTime) <= now)
                {
                    this.#FinalizeSfxVoicePause(
                        voice,
                        voice.pauseContextTime,
                    );
                }
            }
        }
    }

    /** Advances every live Continuous Switch session reading one game sync. */
    #AdvanceContinuousSwitchSlots(scope, group, gameObjID = null)
    {
        const normalizedScope = scope === "state" ? "state" : "switch";
        const normalizedGroup = String(group);

        for (const [ playingID, record ] of this.#playing)
        {
            if (!record.sfxProgram
                || record.stopped
                || record.planningProgram
                || (normalizedScope === "switch"
                    && record.gameObjID !== gameObjID))
            {
                continue;
            }

            for (const slot of record.programSlots?.values?.() ?? [])
            {
                if (slot.advanceMode !== "switch"
                    || !slot.continuation
                    || slot.broken
                    || !slot.switchGroups.some(value =>
                        value.scope === normalizedScope
                        && value.group === normalizedGroup))
                {
                    continue;
                }
                this.#AdvanceContinuousSwitchSlot(
                    playingID,
                    record,
                    slot,
                );
            }
        }
    }

    /** Re-routes one live Continuous Switch without discarding fade tails. */
    #AdvanceContinuousSwitchSlot(playingID, record, slot)
    {
        if (!slot.continuation
            || slot.broken
            || record.stopped
            || this.#playing.get(playingID) !== record)
        {
            return;
        }

        let program;

        try
        {
            program = this.#continueSfxProgram?.(
                slot.continuation,
                record.sfxControls,
            ) ?? [];
        }
        catch
        {
            slot.continuation = null;
            slot.broken = true;
            slot.exhausted = true;
            slot.state = [ ...slot.voices ].some(voice => !voice.ended)
                ? "voice"
                : "ended";
            this.#MaybeFinishSfxProgram(playingID, record);
            return;
        }

        if (!Array.isArray(program))
        {
            slot.continuation = null;
            slot.broken = true;
            slot.exhausted = true;
            slot.state = [ ...slot.voices ].some(voice => !voice.ended)
                ? "voice"
                : "ended";
            this.#MaybeFinishSfxProgram(playingID, record);
            return;
        }
        if (!program.length)
        {
            return;
        }

        let play = program.find(operation => operation.kind === "play");
        let continuation = play?.continuations?.find(value =>
            value.programSlotId === slot.id);

        if (!play
            || continuation?.advance !== "switch"
            || !continuation.token)
        {
            slot.continuation = null;
            slot.broken = true;
            slot.exhausted = true;
            slot.state = [ ...slot.voices ].some(voice => !voice.ended)
                ? "voice"
                : "ended";
            this.#MaybeFinishSfxProgram(playingID, record);
            return;
        }
        try
        {
            this.#voiceLimitLedger.ReleasePending(
                record,
                slot.selections,
            );
            program = this.#ReserveSfxProgram(record, program);
        }
        catch
        {
            slot.continuation = null;
            slot.broken = true;
            slot.exhausted = true;
            slot.state = [ ...slot.voices ].some(voice => !voice.ended)
                ? "voice"
                : "ended";
            this.#MaybeFinishSfxProgram(playingID, record);
            return;
        }
        play = program.find(operation => operation.kind === "play");
        continuation = play.continuations.find(value =>
            value.programSlotId === slot.id);

        const now = Number(this.#context.currentTime) || 0;
        const previousSwitchGeneration = slot.switchGeneration;
        const generation = ++slot.generation;
        const switchGeneration = ++slot.switchGeneration;
        const changedContainerId = String(
            continuation.changedContainerId ?? slot.continuousNodeId,
        );
        const selections = (play.selections ?? []).filter(selection =>
            selection.programSlotId === slot.id);
        const selectionMetadata = selections.map(selection =>
            CreateProgramSelectionMetadata(selection, now));

        this.#AbortSfxProgramSlot(record, slot);
        slot.controller = new AbortController();
        slot.continuation = continuation.token;
        slot.exhausted = false;
        slot.switchGroups = NormalizeContinuousSwitchGroups(
            continuation.switchGroups,
        );
        slot.selections = Object.freeze(selectionMetadata);
        slot.cancelledSelectionKeys =
            CreateProgramCancelledSelectionKeys(selectionMetadata);
        slot.selectionControllers = CreateProgramSelectionControllers(
            selectionMetadata,
        );
        slot.leafIndex = selectionMetadata.length
            ? Math.min(...selectionMetadata.map(selection =>
                selection.leafIndex))
            : 0;
        slot.actionTime = selectionMetadata.length
            ? Math.min(...selectionMetadata.map(selection =>
                selection.actionTime))
            : now;
        slot.matchIds = Object.freeze([ ...new Set([
            ...(continuation.matchIds ?? []).map(String),
            ...selectionMetadata.flatMap(selection =>
                selection.matchIds),
        ]) ]);
        slot.continuousMatchIds = Object.freeze(
            (continuation.matchIds ?? []).map(String),
        );
        slot.state = "active";

        for (const voice of slot.voices)
        {
            if (voice.ended
                || voice.switchGeneration !== previousSwitchGeneration)
            {
                continue;
            }
            const transition = voice.switchPath?.find(value =>
                value.containerId === changedContainerId);

            this.#StopSfxProgramVoice(
                voice,
                now,
                transition?.fadeOutMs ?? 0,
                LINEAR_FADE_CURVE,
                now,
            );
        }
        this.#DisposeEndedSlotVoices(record, slot);

        if (!selectionMetadata.length)
        {
            slot.voice = [ ...slot.voices ].find(voice =>
                !voice.ended
                && voice.switchGeneration === switchGeneration) ?? null;
            return;
        }

        Promise.resolve().then(() => this.#loadBuffer(
            record.eventID,
            record.eventName,
            record.sfxControls,
            program,
        )).then(result =>
        {
            this.#ProcessScheduledSfxActions();
            if (generation !== slot.generation
                || slot.broken
                || record.stopped
                || this.#playing.get(playingID) !== record)
            {
                return;
            }

            const descriptors = NormalizeVoiceDescriptors(
                result ?? { voices: [] },
                () => !!this.#isLoop(record.eventName),
            ).filter(descriptor =>
                descriptor.programSlotId === slot.id
                && !slot.cancelledSelectionKeys.has(
                    ProgramSelectionKey(descriptor),
                ));
            const voices = descriptors.flatMap(descriptor =>
            {
                const selection = slot.selections.find(value =>
                    ProgramSelectionKey(value)
                        === ProgramSelectionKey(descriptor));

                if (!selection)
                {
                    return [];
                }
                const voice = this.#CreateVoice(
                    {
                        ...descriptor,
                        actionIndex: selection.actionIndex,
                        leafIndex: selection.leafIndex,
                        actionTime: selection.actionTime,
                        busRouteNodeId: selection.busRouteNodeId,
                        matchIds: selection.matchIds,
                        busPathIds: selection.busPathIds,
                        sourceEffects: selection.sourceEffects,
                        authoredBusVolumeDb:
                            selection.authoredBusVolumeDb,
                        authoredBusMakeUpGainDb:
                            selection.authoredBusMakeUpGainDb,
                        authoredOutputBusVolumeDb:
                            selection.authoredOutputBusVolumeDb,
                        voiceLimitReservationId:
                            selection.voiceLimitReservationId,
                        switchPath: selection.switchPath,
                        switchFadeInMs: selection.switchFadeInMs,
                        switchGeneration,
                    },
                    record.emitterNodes,
                    record.gameObjID,
                );

                voice.programSlotId = slot.id;
                ApplySlotPauseDepth(voice, slot);
                return [ voice ];
            });

            for (const voice of voices)
            {
                slot.voices.add(voice);
                record.voices.push(voice);
            }
            slot.voice = voices[0] ?? null;
            slot.state = "active";
            this.#DisposeEndedSlotVoices(record, slot);

            if (voices.length)
            {
                try
                {
                    this.#StartVoices(
                        playingID,
                        record,
                        voices,
                        now,
                    );
                }
                catch
                {
                    const failureTime = Number(
                        this.#context.currentTime,
                    ) || 0;

                    for (const voice of voices)
                    {
                        this.#EndVoiceDucking(
                            voice,
                            failureTime,
                            voice.sourceStarted !== true
                                || voice.startContextTime > failureTime,
                        );
                        if (voice.source)
                        {
                            voice.source.onended = null;
                            try
                            {
                                voice.source.stop?.(
                                    failureTime,
                                );
                            }
                            catch
                            {
                                // already stopped
                            }
                        }
                        voice.ended = true;
                    }
                    slot.voice = null;
                    slot.state = "active";
                    this.#DisposeEndedSlotVoices(record, slot);
                }
            }
        }).catch(() =>
        {
            if (generation === slot.generation
                && !slot.broken
                && this.#playing.get(playingID) === record)
            {
                slot.voice = [ ...slot.voices ].find(voice =>
                    !voice.ended
                    && voice.switchGeneration === switchGeneration)
                    ?? null;
                slot.state = "active";
                this.#DisposeEndedSlotVoices(record, slot);
            }
        }).finally(() =>
        {
            this.#ReleasePendingSfxVoiceLimitReservations(record, program);
        });
    }

    /** Applies one due Stop to eligible pending slots and live SFX voices. */
    #ApplySfxStop(stop, now)
    {
        const actionTime = Math.max(
            Number(stop.actionTime) || 0,
            Number(now) || 0,
        );

        for (const [ playingID, record ] of this.#playing)
        {
            if (!record.sfx
                || (stop.scope === "game-object"
                    && record.gameObjID !== stop.gameObjID))
            {
                continue;
            }
            if (!record.sfxProgram)
            {
                if ((stop.mode === "all"
                        || stop.mode === "all-except")
                    && stop.exceptions.length === 0
                    && CompareFallbackOrder(
                        record,
                        playingID,
                        stop,
                    ) <= 0)
                {
                    this.#StopFallbackRecord(
                        playingID,
                        record,
                        stop,
                        now,
                    );
                }
                continue;
            }

            for (const slot of record.programSlots.values())
            {
                if (slot.advanceMode === "switch")
                {
                    this.#ApplyContinuousSwitchStop(
                        playingID,
                        record,
                        slot,
                        stop,
                        actionTime,
                    );
                    continue;
                }
                if (slot.state !== "pending"
                    && slot.state !== "loading"
                    && slot.state !== "voice")
                {
                    if (!IsOverlappingAdvanceMode(slot.advanceMode)
                        || slot.state === "ended"
                        || slot.state === "cancelled")
                    {
                        continue;
                    }
                }
                if (IsOverlappingAdvanceMode(slot.advanceMode))
                {
                    this.#ApplyTriggerRateStop(
                        record,
                        slot,
                        stop,
                        actionTime,
                    );
                    continue;
                }
                const selections = slot.selections ?? [];
                const matchingSelections = selections.filter(selection =>
                    CompareProgramOrder(selection, slot, stop) <= 0
                    && PlaybackControlMatchesValue(stop, selection));
                const matchingVoices = [ ...slot.voices ].filter(voice =>
                    !voice.ended
                    && CompareProgramOrder(voice, slot, stop) <= 0
                    && PlaybackControlMatchesValue(stop, voice));

                if (!matchingSelections.length
                    && !matchingVoices.length)
                {
                    continue;
                }
                const stopsWholeSlot =
                    slot.advanceMode === "trigger-rate"
                        && stop.mode === "element"
                        ? String(stop.targetId)
                            === slot.continuousNodeId
                        : matchingSelections.length === selections.length;

                for (const selection of matchingSelections)
                {
                    const key = ProgramSelectionKey(selection);

                    slot.cancelledSelectionKeys?.add(key);
                    slot.selectionControllers?.get(key)?.abort();
                    this.#voiceLimitLedger.ReleasePending(
                        record,
                        [ selection ],
                    );
                }

                if (slot.state === "pending"
                    || slot.state === "loading")
                {
                    if (stopsWholeSlot)
                    {
                        slot.continuation = null;
                        slot.broken = true;
                        slot.exhausted = true;
                        slot.nextTriggerContextTime = null;
                        slot.generation++;
                        this.#AbortSfxProgramSlot(record, slot);
                        if (slot.currentBatch)
                        {
                            slot.currentBatch.state = "cancelled";
                        }
                        slot.state = matchingVoices.length
                            ? "voice"
                            : "cancelled";
                    }
                    if (!IsOverlappingAdvanceMode(slot.advanceMode))
                    {
                        continue;
                    }
                }
                for (const voice of matchingVoices)
                {
                    this.#StopSfxProgramVoice(
                        voice,
                        stop.actionTime,
                        stop.transitionMs,
                        stop.curve,
                        actionTime,
                    );
                    if (voice.ended)
                    {
                        this.#SetSfxProgramSlotEnded(
                            playingID,
                            record,
                            voice,
                        );
                    }
                }
                if (stopsWholeSlot)
                {
                    slot.continuation = null;
                    slot.broken = true;
                    slot.exhausted = true;
                    slot.nextTriggerContextTime = null;
                    slot.generation++;
                    this.#AbortSfxProgramSlot(record, slot);
                }
            }

            this.#MaybeFinishSfxProgram(playingID, record);
        }
    }

    /** Applies an authored Stop to a live or dormant Continuous Switch. */
    #ApplyContinuousSwitchStop(
        playingID,
        record,
        slot,
        stop,
        actionTime,
    )
    {
        if ((slot.state === "ended" || slot.state === "cancelled")
            || CompareProgramOrder(slot, slot, stop) > 0)
        {
            return;
        }

        const sessionMatchIds = new Set(
            (slot.continuousMatchIds ?? [ slot.continuousNodeId ])
                .map(String),
        );
        const protectedMatchIds = new Set(
            (slot.matchIds ?? slot.continuousMatchIds ?? [])
                .map(String),
        );
        const sessionProtected = stop.exceptions.some(exception =>
            protectedMatchIds.has(String(exception.targetId)));
        const stopsWholeSlot = stop.mode === "element"
            ? sessionMatchIds.has(String(stop.targetId))
            : stop.mode === "all"
                || (stop.mode === "all-except" && !sessionProtected);
        const matchingSelections = (slot.selections ?? []).filter(selection =>
            CompareProgramOrder(selection, slot, stop) <= 0
            && PlaybackControlMatchesValue(stop, selection));
        const matchingVoices = [ ...slot.voices ].filter(voice =>
            !voice.ended
            && CompareProgramOrder(voice, slot, stop) <= 0
            && PlaybackControlMatchesValue(stop, voice));

        if (!stopsWholeSlot
            && !matchingSelections.length
            && !matchingVoices.length)
        {
            return;
        }

        if (stopsWholeSlot)
        {
            slot.continuation = null;
            slot.broken = true;
            slot.exhausted = true;
            slot.generation++;
            slot.switchGeneration++;
            this.#AbortSfxProgramSlot(record, slot);
        }
        else
        {
            for (const selection of matchingSelections)
            {
                const key = ProgramSelectionKey(selection);

                slot.cancelledSelectionKeys.add(key);
                slot.selectionControllers?.get(key)?.abort();
                this.#voiceLimitLedger.ReleasePending(
                    record,
                    [ selection ],
                );
            }
        }

        const voices = stopsWholeSlot
            ? [ ...slot.voices ].filter(voice => !voice.ended)
            : matchingVoices;

        for (const voice of voices)
        {
            this.#StopSfxProgramVoice(
                voice,
                stop.actionTime,
                stop.transitionMs,
                stop.curve,
                actionTime,
            );
            if (voice.ended)
            {
                this.#SetSfxProgramSlotEnded(
                    playingID,
                    record,
                    voice,
                );
            }
        }

        if (stopsWholeSlot)
        {
            slot.voice = [ ...slot.voices ].find(voice => !voice.ended)
                ?? null;
            slot.state = slot.voice ? "voice" : "ended";
        }
    }

    /** Applies one Stop across every overlapping Trigger Rate batch. */
    #ApplyTriggerRateStop(record, slot, stop, actionTime)
    {
        const batches = [ ...slot.batches?.values?.() ?? [] ];
        const eligibleSelections = [];
        const matchingSelections = [];
        const eligibleBatches = batches.filter(batch =>
            CompareProgramOrder(
                {
                    actionTime: batch.actionTime,
                    actionIndex: slot.actionIndex,
                    leafIndex: slot.leafIndex,
                },
                slot,
                stop,
            ) <= 0);

        for (const batch of batches)
        {
            for (const selection of batch.selections ?? [])
            {
                if (CompareProgramOrder(selection, slot, stop) > 0)
                {
                    continue;
                }
                eligibleSelections.push(selection);
                if (PlaybackControlMatchesValue(stop, selection))
                {
                    matchingSelections.push({ batch, selection });
                }
            }
        }
        const matchingVoices = [ ...slot.voices ].filter(voice =>
            !voice.ended
            && CompareProgramOrder(voice, slot, stop) <= 0
            && PlaybackControlMatchesValue(stop, voice));
        const containerProtected = stop.exceptions.some(exception =>
            String(exception.targetId) === slot.continuousNodeId);
        const stopsWholeSlot = stop.mode === "element"
            ? eligibleBatches.length > 0
                && String(stop.targetId) === slot.continuousNodeId
            : eligibleBatches.length > 0
                && !containerProtected
                && matchingSelections.length === eligibleSelections.length;

        if (!matchingSelections.length
            && !matchingVoices.length
            && !stopsWholeSlot)
        {
            return;
        }

        for (const { batch, selection } of matchingSelections)
        {
            const key = ProgramSelectionKey(selection);

            batch.cancelledSelectionKeys.add(key);
            batch.selectionControllers?.get(key)?.abort();
            this.#voiceLimitLedger.ReleasePending(
                record,
                [ selection ],
            );
        }
        for (const batch of batches)
        {
            if ((batch.state === "loading"
                    || batch.state === "pending")
                && (batch.selections?.length ?? 0) > 0
                && batch.selections.every(selection =>
                    batch.cancelledSelectionKeys.has(
                        ProgramSelectionKey(selection),
                    )))
            {
                batch.state = "cancelled";
                this.#AbortSfxProgramBatch(record, batch);
            }
        }
        for (const voice of matchingVoices)
        {
            this.#StopSfxProgramVoice(
                voice,
                stop.actionTime,
                stop.transitionMs,
                stop.curve,
                actionTime,
            );
            if (voice.ended)
            {
                this.#SetSfxProgramSlotEnded(
                    slot.playingID,
                    record,
                    voice,
                );
            }
        }
        if (stopsWholeSlot)
        {
            slot.continuation = null;
            slot.broken = true;
            slot.exhausted = true;
            slot.nextTriggerContextTime = null;
            slot.preparingCrossfade = false;
            if (slot.preparedBatch)
            {
                this.#DiscardTriggerRateBatch(
                    record,
                    slot,
                    slot.preparedBatch,
                );
                slot.preparedBatch = null;
            }
            for (const batch of batches)
            {
                if (batch.state === "loading"
                    || batch.state === "pending")
                {
                    batch.state = "cancelled";
                    this.#AbortSfxProgramBatch(record, batch);
                }
            }
        }
        this.#UpdateOverlappingSlotState(slot);
    }

    /** Applies one authored fade/stop without changing live RTPC controls. */
    #StopSfxProgramVoice(
        voice,
        actionTime,
        transitionMs,
        curve,
        now = actionTime,
    )
    {
        if (!voice.source)
        {
            if (voice.paused || voice.pauseDepth > 0)
            {
                voice.pauseDepth = 0;
                voice.paused = false;
                voice.pausing = false;
                voice.pauseContextTime = null;
                voice.stopping = true;
                voice.ended = true;
            }
            return;
        }

        const authoredActionTime = Number(actionTime) || 0;
        const currentTime = Math.max(
            authoredActionTime,
            Number(now) || 0,
        );
        const seconds = Math.max(
            0,
            Number(transitionMs) || 0,
        ) / 1000;
        const authoredStopTime = authoredActionTime + seconds;
        const fadeStopTime = voice.startContextTime > authoredActionTime
            || authoredStopTime <= currentTime
            ? currentTime
            : authoredStopTime;
        const sourceStopTime = voice.scheduledEndContextTime === null
            ? fadeStopTime
            : Math.max(
                currentTime,
                Math.min(
                    fadeStopTime,
                    voice.scheduledEndContextTime,
                ),
            );

        if (voice.stopping
            && Number.isFinite(voice.stopContextTime)
            && voice.stopContextTime <= sourceStopTime)
        {
            return;
        }

        voice.stopping = true;
        voice.stopContextTime = sourceStopTime;
        voice.pausing = false;
        voice.pauseContextTime = null;
        voice.pauseSource = null;

        if (voice.startContextTime > authoredActionTime
            || authoredStopTime <= currentTime)
        {
            if (voice.startContextTime > currentTime)
            {
                voice.cancelledBeforeStart = true;
                this.#EndVoiceDucking(voice, currentTime, true);
            }
            SilenceAudioParamAt(
                voice.stopGain.gain,
                currentTime,
                this.#context,
            );
            voice.source.stop(currentTime);
            return;
        }

        this.#HoldVoiceTransitionFade(voice, currentTime);
        this.#HoldVoiceFade(voice, currentTime);

        const param = voice.stopGain.gain;
        const progress = seconds > 0
            ? Math.max(
                0,
                Math.min(
                    1,
                    (currentTime - authoredActionTime) / seconds,
                ),
            )
            : 1;
        const remaining = Math.max(0, fadeStopTime - currentTime);

        if (remaining > 0)
        {
            if (typeof param?.cancelAndHoldAtTime === "function")
            {
                param.cancelAndHoldAtTime(currentTime);
            }
            else
            {
                param?.cancelScheduledValues?.(currentTime);
            }

            ScheduleWwiseFade(
                param,
                Number(param?.value) || 0,
                0,
                currentTime,
                remaining,
                Number(curve ?? LINEAR_FADE_CURVE),
                progress,
            );
        }
        else
        {
            SetAudioParam(param, 0, this.#context);
        }
        voice.source.stop(sourceStopTime);
    }

    /** Applies a hierarchy-free Stop-All to one flat eventMedia record. */
    #StopFallbackRecord(playingID, record, stop, now)
    {
        if (!record.loaded)
        {
            this.#FinishSfxPlaying(playingID);
            return;
        }

        for (const voice of record.voices ?? [])
        {
            if (!voice.ended)
            {
                this.#StopSfxProgramVoice(
                    voice,
                    stop.actionTime,
                    stop.transitionMs,
                    stop.curve,
                    now,
                );
            }
        }
    }

    /** Closes a program record only after slots and delayed actions settle. */
    #MaybeFinishSfxProgram(playingID, record)
    {
        if (!record?.sfxProgram
            || record.posting
            || record.planningProgram
            || record.pendingProgramActions > 0)
        {
            return;
        }

        const settled = [ ...record.programSlots.values() ]
            .every(slot =>
                slot.state === "cancelled"
                || slot.state === "ended");

        if (settled)
        {
            this.#FinishSfxPlaying(playingID);
        }
    }

    /** Creates live control readers for one emitter's authored SFX post. */
    #CreateSfxControls(
        gameObjID,
        signal = null,
        playingID = 0,
        record = null,
    )
    {
        return Object.freeze({
            gameObjID,
            signal,
            installSfxProgram: program =>
                this.#InstallSfxProgram(
                    playingID,
                    record,
                    program,
                ),
            getSwitch: group =>
                this.GetSwitchValue(group, gameObjID),
            getState: group =>
                this.GetGlobalState(group),
            getStatePropertyWeights: (group, at = undefined) =>
                this.#ReadStatePropertyWeights(
                    group,
                    at ?? (Number(this.#context?.currentTime) || 0),
                ),
            getRTPC: (name, at = undefined) =>
                record?.emitterNodes?.retiredRtpcValues instanceof Map
                    ? ReadRetiredRtpcValue(
                        record.emitterNodes,
                        String(name),
                        at ?? (Number(this.#context?.currentTime) || 0),
                    )
                    : this.#ReadRtpcValue(
                        "game-object",
                        String(name),
                        gameObjID,
                        at ?? (Number(this.#context?.currentTime) || 0),
                    ),
            getGlobalRTPC: (name, at = undefined) =>
                this.#ReadRtpcValue(
                    "global",
                    String(name),
                    undefined,
                    at ?? (Number(this.#context?.currentTime) || 0),
                ),
            getVoiceVolumeDb: matchIds =>
                EvaluateVoiceVolumeTargets(
                    record?.emitterNodes?.voiceVolumes,
                    matchIds,
                    Number(this.#context?.currentTime) || 0,
                ),
            getVoicePitchCents: matchIds =>
                EvaluateVoicePitchTargets(
                    record?.emitterNodes?.voicePitches,
                    matchIds,
                    Number(this.#context?.currentTime) || 0,
                ),
            getVoiceLowPass: (matchIds, at = undefined) =>
                EvaluateVoiceFilterTargets(
                    record?.emitterNodes?.voiceLowPasses,
                    matchIds,
                    at ?? (Number(this.#context?.currentTime) || 0),
                ),
            getVoiceHighPass: (matchIds, at = undefined) =>
                EvaluateVoiceFilterTargets(
                    record?.emitterNodes?.voiceHighPasses,
                    matchIds,
                    at ?? (Number(this.#context?.currentTime) || 0),
                ),
            setSwitch: (group, value) =>
                this.SetSwitch(group, value, gameObjID),
            setState: (group, value) =>
                this.SetGlobalState(group, value),
            getSfxProgramSignal: (
                programSlotId,
                actionIndex,
                leafIndex,
                programBatchId,
            ) =>
            {
                const slot = record?.programSlots?.get(
                    String(programSlotId),
                );
                const batch = programBatchId === undefined
                    ? null
                    : slot?.batches?.get(String(programBatchId));
                const selectionSignal =
                    (batch?.selectionControllers
                        ?? slot?.selectionControllers)
                        ?.get(ProgramSelectionKey({
                            actionIndex,
                            leafIndex,
                            programBatchId,
                        }))?.signal;

                return selectionSignal ?? slot?.controller?.signal ?? signal;
            },
        });
    }

    /** Gets or creates one graph-backed route branch within an emitter generation. */
    #GetEmitterRouteBranch(
        emitterNodes,
        gameObjID,
        spatial,
        busGraphRoute,
    )
    {
        if (!busGraphRoute)
        {
            return null;
        }
        let modes = emitterNodes.routeBranches.get(busGraphRoute);

        if (!modes)
        {
            modes = new Map();
            emitterNodes.routeBranches.set(busGraphRoute, modes);
        }
        const mode = Boolean(spatial);
        let branch = modes.get(mode);

        if (branch)
        {
            return branch;
        }
        const mixerInput = this.#busMixer?.GetInput?.(
            busGraphRoute,
            "sfx",
        ) ?? null;
        const sharedBusFilters = Boolean(mixerInput)
            && this.#busMixer?.OwnsRouteStateFilters?.(busGraphRoute) === true;
        const sharedBusDucking = sharedBusFilters;
        const analyser = mixerInput
            ? this.#context.createAnalyser?.() ?? null
            : null;

        if (analyser)
        {
            analyser.fftSize = 256;
            analyser.connect(mixerInput);
        }
        const destination = analyser
            ?? mixerInput
            ?? emitterNodes.analyser
            ?? this.#sfxGain;

        if (spatial)
        {
            const gain = this.#context.createGain();
            const panner = this.#context.createPanner();

            panner.panningModel = "HRTF";
            panner.distanceModel = "inverse";
            panner.rolloffFactor = 0;
            SetPannerScalingFactor(panner, emitterNodes.scalingFactor);
            if (emitterNodes.front && emitterNodes.position)
            {
                SetPannerPose(
                    panner,
                    emitterNodes.front,
                    emitterNodes.position,
                    this.#distanceScale,
                    this.#context,
                );
            }
            gain.connect(panner);
            panner.connect(destination);
            branch = {
                busGraphRoute,
                gain,
                flatGain: null,
                panner,
                analyser,
                mixerInput,
                sharedBusFaders: Boolean(mixerInput),
                sharedBusFilters,
                sharedBusDucking,
            };
        }
        else
        {
            const flatGain = this.#context.createGain();

            flatGain.connect(destination);
            branch = {
                busGraphRoute,
                gain: null,
                flatGain,
                panner: null,
                analyser,
                mixerInput,
                sharedBusFaders: Boolean(mixerInput),
                sharedBusFilters,
                sharedBusDucking,
            };
        }
        modes.set(mode, branch);
        for (const [ rtpcName, value ] of
            emitterNodes.retiredRtpcValues
                ?? this.#objectRtpcValues.get(gameObjID)
                ?? [])
        {
            this.#ApplyRTPCToRouteBranch(
                branch,
                gameObjID,
                rtpcName,
                value,
            );
        }
        return branch;
    }

    /** Applies one host RTPC adapter update to the legacy and graph-backed routes. */
    #ApplyRTPCToEmitterNodes(nodes, gameObjID, rtpcName, value)
    {
        if (!nodes)
        {
            return;
        }
        this.#ApplyRTPCToLegacyEmitterNodes(
            nodes,
            gameObjID,
            rtpcName,
            value,
        );
        for (const modes of nodes.routeBranches.values())
        {
            for (const branch of modes.values())
            {
                this.#ApplyRTPCToRouteBranch(
                    branch,
                    gameObjID,
                    rtpcName,
                    value,
                );
            }
        }
    }

    /** Applies one host RTPC adapter update to the legacy emitter route. */
    #ApplyRTPCToLegacyEmitterNodes(nodes, gameObjID, rtpcName, value)
    {
        this.#applyRTPC?.({
            gameObjID,
            rtpcName,
            value,
            context: this.#context,
            gain: nodes.gain?.gain ?? null,
            flatGain: nodes.flatGain?.gain ?? null,
            panner: nodes.panner ?? null,
        });
    }

    /** Applies one host RTPC adapter update to one exact graph route branch. */
    #ApplyRTPCToRouteBranch(branch, gameObjID, rtpcName, value)
    {
        this.#applyRTPC?.({
            gameObjID,
            rtpcName,
            value,
            context: this.#context,
            gain: branch.gain?.gain ?? null,
            flatGain: branch.flatGain?.gain ?? null,
            panner: branch.panner,
            busGraphRoute: branch.busGraphRoute,
        });
    }

    /** Creates one decoded SFX voice and its independent gain stage. */
    #CreateVoice(descriptor, emitterNodes, gameObjID)
    {
        const busGraphRoute = this.#busGraphRuntime?.ResolveSfxRoute(
            descriptor.busRouteNodeId,
            {
                ...descriptor,
                outputBusId: descriptor.busPathIds[0],
            },
        ) ?? null;
        const allowAudibleAux = !descriptor.getLowPass
            && !descriptor.getLowPassAtAdditionalPercent
            && !descriptor.getHighPass
            && !descriptor.getHighPassAtAdditionalPercent;
        const mixerOwnsRouteFilters = this.#busMixer
            ?.OwnsRouteStateFilters?.(busGraphRoute) === true;
        const emitterRouteBranch = mixerOwnsRouteFilters && !allowAudibleAux
            ? null
            : this.#GetEmitterRouteBranch(
                emitterNodes,
                gameObjID,
                descriptor.spatial,
                busGraphRoute,
            );
        const gain = this.#context.createGain();
        const busVoiceActionGain =
            descriptor.busVoiceVolumeActionControlled
                ? this.#context.createGain()
                : null;
        const busVoiceGain = busRtpcPathUses(
            this.#busRtpcCatalog,
            descriptor.busPathIds,
            "voice-volume",
        ) ? this.#context.createGain() : null;
        const busGain = descriptor.busPathIds.length
            ? this.#context.createGain()
            : null;
        const fadeGain = descriptor.fadeInMs > 0
            ? this.#context.createGain()
            : null;
        const transitionGain = descriptor.crossfadeMode
            || descriptor.switchFadeInMs > 0
            ? this.#context.createGain()
            : null;
        const stopGain = this.#context.createGain();
        const usesBusPitch = busStatePathUses(
            this.#busStateCatalog,
            descriptor.busPathIds,
            "pitchCents",
        );
        const usesBusLowPass = busStatePathUses(
            this.#busStateCatalog,
            descriptor.busPathIds,
            "lowPass",
        );
        const usesBusHighPass = busStatePathUses(
            this.#busStateCatalog,
            descriptor.busPathIds,
            "highPass",
        );
        const sharedBusFilters = emitterRouteBranch?.sharedBusFilters === true;
        const lowPassFilter = (descriptor.getLowPass
            || descriptor.getLowPassAtAdditionalPercent
            || (usesBusLowPass && !sharedBusFilters))
            ? this.#context.createBiquadFilter?.() ?? null
            : null;
        const highPassFilter = (descriptor.getHighPass
            || descriptor.getHighPassAtAdditionalPercent
            || (usesBusHighPass && !sharedBusFilters))
            ? this.#context.createBiquadFilter?.() ?? null
            : null;
        const busEffectChain = emitterRouteBranch?.mixerInput
            ? null
            : createBusEffectChain(
                this.#context,
                this.#busEffectCatalog,
                descriptor.busPathIds,
            );
        const sourceEffectChain = createWwiseEffectChain(
            this.#context,
            descriptor.sourceEffects ?? [],
            {
                wwiseDynamics: this.#wwiseDynamics,
                wwiseModulation: this.#wwiseModulation,
            },
        );

        if (lowPassFilter)
        {
            lowPassFilter.type = "lowpass";
            SetAudioParam(
                lowPassFilter.frequency,
                wwiseFilterPercentToHz(0),
                this.#context,
            );
            SetAudioParam(
                lowPassFilter.Q,
                Math.SQRT1_2,
                this.#context,
            );
        }
        if (highPassFilter)
        {
            highPassFilter.type = "highpass";
            SetAudioParam(
                highPassFilter.frequency,
                wwiseFilterPercentToHz(0, true),
                this.#context,
            );
            SetAudioParam(
                highPassFilter.Q,
                Math.SQRT1_2,
                this.#context,
            );
        }

        if (emitterRouteBranch)
        {
            stopGain.connect(
                emitterRouteBranch.gain
                    ?? emitterRouteBranch.flatGain,
            );
        }
        else if (descriptor.spatial)
        {
            stopGain.connect(emitterNodes.gain);
        }
        else
        {
            if (!emitterNodes.flatGain)
            {
                emitterNodes.flatGain = this.#context.createGain();
                emitterNodes.flatGain.connect(
                    emitterNodes.analyser ?? this.#sfxGain,
                );
                // A 2D route is allocated lazily. Replay previously stored
                // object RTPCs now that adapters can finally see flatGain.
                for (const [ rtpcName, value ] of
                    emitterNodes.retiredRtpcValues
                        ?? this.#objectRtpcValues.get(gameObjID)
                        ?? [])
                {
                    this.#ApplyRTPCToLegacyEmitterNodes(
                        emitterNodes,
                        gameObjID,
                        rtpcName,
                        value,
                    );
                }
            }
            stopGain.connect(emitterNodes.flatGain);
        }
        const busEffectInput = busEffectChain?.input ?? stopGain;

        gain.connect(
            busVoiceActionGain
                ?? busVoiceGain
                ?? transitionGain
                ?? busGain
                ?? busEffectInput,
        );
        busVoiceActionGain?.connect(
            busVoiceGain ?? transitionGain ?? busGain ?? busEffectInput,
        );
        busVoiceGain?.connect(transitionGain ?? busGain ?? busEffectInput);
        transitionGain?.connect(busGain ?? busEffectInput);
        busGain?.connect(busEffectInput);
        busEffectChain?.output?.connect(stopGain);
        if (transitionGain && descriptor.switchFadeInMs > 0)
        {
            SetAudioParam(
                transitionGain.gain,
                0,
                this.#context,
            );
        }
        if (fadeGain)
        {
            SetAudioParam(fadeGain.gain, 0, this.#context);
            fadeGain.connect(gain);
        }
        if (highPassFilter)
        {
            highPassFilter.connect(fadeGain ?? gain);
        }
        if (lowPassFilter)
        {
            lowPassFilter.connect(highPassFilter ?? fadeGain ?? gain);
        }
        sourceEffectChain?.output?.connect(
            lowPassFilter ?? highPassFilter ?? fadeGain ?? gain,
        );

        const voice = new CjsAudioBackendSfxVoice({
            gameObjID,
            descriptor,
            emitterNodes,
            busGraphRoute,
            emitterRouteBranch,
            sharedBusFilters,
            usesBusPitch,
            getBusStateProperties: at => evaluateBusStateProperties(
                this.#busStateCatalog,
                descriptor.busPathIds,
                (group, time) => this.#ReadStatePropertyWeights(group, time),
                at,
            ),
            rtpcTransitionEnd: this.#RtpcTransitionEndForRecord(
                { gameObjID, emitterNodes },
                Number(this.#context?.currentTime) || 0,
            ),
            controlTransitionBoundaries:
                this.#ControlTransitionBoundariesForRecord(
                    { gameObjID, emitterNodes },
                    Number(this.#context?.currentTime) || 0,
                ),
            nodes: {
                gain,
                busVoiceActionGain,
                busVoiceGain,
                busGain,
                fadeGain,
                transitionGain,
                stopGain,
                lowPassFilter,
                highPassFilter,
                sourceEffectInput: sourceEffectChain?.input ?? null,
                sourceEffectNodes: sourceEffectChain?.nodes ?? [],
                busEffectNodes: busEffectChain?.nodes ?? [],
            },
        });

        this.#ApplyVoiceDistanceGain(voice, emitterNodes);
        this.#ApplyVoiceBusActionGain(voice);
        this.#ApplyVoiceBusRtpcGain(voice);
        this.#ApplyVoiceBusGain(voice);
        this.#ApplyVoiceFilters(voice);
        this.#ApplyVoicePlaybackRate(voice);
        this.#voiceLimitLedger.Bind(
            voice,
            descriptor.voiceLimitReservationId,
        );
        return voice;
    }

    /** Starts or restarts every decoded voice owned by one logical event. */
    #StartVoices(
        playingID,
        record,
        selectedVoices = null,
        batchStartContextTime = null,
    )
    {
        if (record.stopped
            || (!record.loaded && selectedVoices === null)
            || this.#playing.get(playingID) !== record)
        {
            return;
        }

        const voices = selectedVoices ?? record.voices;
        const hasOrdinaryVoice = voices.some(voice =>
            !this.#IsRestrictedContinuousProgramVoice(record, voice));
        const seek = hasOrdinaryVoice
            ? record.pendingSeek
            : null;
        const pendingBreak = hasOrdinaryVoice
            ? record.pendingBreak
            : false;
        const now = Number(this.#context.currentTime) || 0;
        const renderQuantum = RenderQuantumSeconds(this.#context);
        // Scheduling one render quantum ahead keeps every leaf of a parallel
        // event on the same still-future sample boundary.
        const startContextTime = now + renderQuantum;

        if (hasOrdinaryVoice)
        {
            record.pendingSeek = null;
            record.pendingBreak = false;
        }

        for (const voice of voices)
        {
            const programSlot = voice.programSlotId === undefined
                ? null
                : record.programSlots?.get(voice.programSlotId);
            const continuous = Boolean(programSlot?.continuation);

            if (pendingBreak && voice.loop && !continuous)
            {
                voice.ended = true;
                voice.stopping = true;
                this.#SetSfxProgramSlotEnded(
                    playingID,
                    record,
                    voice,
                );
                continue;
            }
            if (pendingBreak && voice.loop && continuous)
            {
                voice.loop = false;
            }
            if (pendingBreak && voice.playCount > 1 && !continuous)
            {
                voice.playCount = 1;
            }
            if (voice.stopping
                || voice.pauseDepth > 0
                || voice.paused
                || voice.pausing)
            {
                continue;
            }
            const voiceStartContextTime = voice.source === null
                ? Math.max(
                    startContextTime,
                    (
                        Number.isFinite(batchStartContextTime)
                            ? batchStartContextTime
                            : record.postContextTime
                    ) + voice.delayMs / 1000,
                )
                : startContextTime;

            this.#StartVoice(
                playingID,
                record,
                voice,
                this.#IsRestrictedContinuousProgramVoice(record, voice)
                    ? null
                    : seek,
                voiceStartContextTime,
            );
            if (voice.ended)
            {
                this.#SetSfxProgramSlotEnded(
                    playingID,
                    record,
                    voice,
                );
            }
        }

        if (batchStartContextTime === null)
        {
            const crossfadeSlots = new Set(
                voices.map(voice =>
                    record.programSlots?.get(
                        voice.programSlotId,
                    ))
                    .filter(slot =>
                        slot?.advanceMode === "crossfade"),
            );

            for (const slot of crossfadeSlots)
            {
                if (!slot.exhausted && slot.continuation)
                {
                    this.#PrepareCrossfadeSuccessor(
                        playingID,
                        record,
                        slot,
                    );
                }
            }
        }

        if (record.voices.every(voice => voice.ended))
        {
            if (record.sfxProgram)
            {
                this.#MaybeFinishSfxProgram(playingID, record);
            }
            else
            {
                this.#FinishSfxPlaying(playingID);
            }
        }
    }

    /** Creates or replaces one Web Audio buffer source. */
    #StartVoice(
        playingID,
        record,
        voice,
        seek,
        startContextTime,
    )
    {
        const duration = Number(voice.buffer.duration);
        const silenceDuration = Number(voice.silenceDurationSeconds);
        // Timed Silence is a finite logical voice over one physically looping
        // zero sample. Keep its authored clock separate from buffer duration
        // so long gaps consume constant memory and transport remains seekable.
        const timedSilence = Number.isFinite(silenceDuration)
            && silenceDuration > 0;
        const effectiveDuration = timedSilence
            ? silenceDuration
            : duration;
        let logicalOffsetSeconds = 0;
        const resumed = seek?.kind === "resume";
        const resumeRepeatRemaining = resumed
            && Number.isFinite(seek.repeatRemainingSeconds)
                ? Math.max(0, Number(seek.repeatRemainingSeconds))
                : null;

        if (resumed)
        {
            logicalOffsetSeconds = Number(seek.offsetSeconds) || 0;
        }
        else if (seek?.kind === "ms")
        {
            logicalOffsetSeconds = seek.value / 1000;
        }
        else if (seek?.kind === "percent"
            && Number.isFinite(effectiveDuration))
        {
            logicalOffsetSeconds = seek.value * effectiveDuration;
        }

        const loops = voice.loop;
        if (Number.isFinite(effectiveDuration) && effectiveDuration > 0)
        {
            if (loops)
            {
                logicalOffsetSeconds %= effectiveDuration;
            }
            else if (resumeRepeatRemaining === null
                && logicalOffsetSeconds >= effectiveDuration)
            {
                voice.ended = true;
                return;
            }
        }
        const offsetSeconds = timedSilence
            && Number.isFinite(duration)
            && duration > 0
                ? logicalOffsetSeconds % duration
                : logicalOffsetSeconds;

        const previous = voice.source;
        if (previous)
        {
            this.#EndVoiceDucking(
                voice,
                startContextTime,
                startContextTime <= voice.startContextTime,
            );
            previous.onended = null;
            try
            {
                previous.stop(startContextTime);
            }
            catch
            {
                // already stopped
            }
            previous.disconnect?.();
        }

        const source = this.#context.createBufferSource();
        source.buffer = voice.buffer;
        const finiteRepeats = !loops
            && (timedSilence
                || resumeRepeatRemaining !== null
                || voice.playCount > 1)
            && Number.isFinite(duration)
            && duration > 0;

        source.loop = loops || finiteRepeats;
        if (source.playbackRate
            && typeof source.playbackRate === "object"
            && "value" in source.playbackRate)
        {
            source.playbackRate.value = voice.playbackRate;
        }
        source.connect(
            voice.sourceEffectInput
                ?? voice.lowPassFilter
                ?? voice.highPassFilter
                ?? voice.fadeGain
                ?? voice.gain,
        );
        source.onended = () =>
        {
            if (voice.source === source)
            {
                if (voice.stopping)
                {
                    this.#VoiceEnded(playingID, record, voice);
                }
                else if (voice.pausing
                    && voice.pauseSource === source)
                {
                    this.#FinalizeSfxVoicePause(
                        voice,
                        voice.pauseContextTime,
                    );
                }
                else
                {
                    this.#VoiceEnded(playingID, record, voice);
                }
            }
        };
        voice.source = source;
        voice.ended = false;
        voice.paused = false;
        voice.pausing = false;
        voice.pauseContextTime = null;
        voice.pauseSource = null;
        voice.offsetSeconds = Math.max(0, offsetSeconds);
        voice.startContextTime = startContextTime;
        voice.positionAnchorContextTime = startContextTime;
        if (!voice.fadeScheduled && voice.fadeGain)
        {
            ScheduleWwiseFade(
                voice.fadeGain.gain,
                0,
                1,
                startContextTime,
                voice.fadeInMs / 1000,
                voice.fadeCurve,
            );
            voice.fadeScheduled = true;
            voice.fadeStartContextTime = startContextTime;
        }
        if (!voice.switchFadeScheduled
            && voice.switchFadeInMs > 0
            && voice.transitionGain)
        {
            this.#ScheduleVoiceCrossfade(
                voice,
                0,
                1,
                startContextTime,
                voice.switchFadeInMs / 1000,
                "crossfade-amplitude",
            );
            voice.switchFadeScheduled = true;
        }
        voice.scheduledEndContextTime = null;
        voice.repeatRemainingSeconds = null;
        voice.repeatAnchorContextTime = null;
        this.#ApplyVoiceGain(voice);
        voice.sourceStarted = false;
        voice.cancelledBeforeStart = false;
        source.start(startContextTime, voice.offsetSeconds);
        voice.StartSourceEffects(startContextTime);
        voice.sourceStarted = true;
        if (finiteRepeats)
        {
            const remaining = resumeRepeatRemaining
                ?? (timedSilence
                    ? effectiveDuration - logicalOffsetSeconds
                    : duration - voice.offsetSeconds
                        + duration * (voice.playCount - 1));

            voice.repeatRemainingSeconds = remaining;
            voice.repeatAnchorContextTime = startContextTime;
            voice.scheduledEndContextTime = startContextTime
                + remaining / voice.playbackRate;
            source.stop(voice.scheduledEndContextTime);
        }
        this.#ApplyVoicePlaybackRate(voice);
        voice.duckActivity = this.#busDuckingController?.ScheduleActivity?.(
            voice.busPathIds,
            startContextTime,
        ) ?? null;
    }

    /** Marks one physical voice complete and closes its logical event at zero. */
    #VoiceEnded(playingID, record, voice)
    {
        // Source-owned effects share the disposable voice lifetime. In
        // particular, Web Audio's DelayNode exposes no Wwise tail-completion
        // signal, so natural completion remains the decoded dry-source
        // boundary and #FinishPlaying disconnects any residual feedback.
        this.#EndVoiceDucking(
            voice,
            Number(this.#context?.currentTime) || 0,
            voice.cancelledBeforeStart === true,
        );
        voice.ended = true;
        voice.DisconnectNodes();
        this.#voiceLimitLedger.Release(
            record,
            voice.voiceLimitReservationId,
        );

        if (record.sfxProgram)
        {
            this.#SetSfxProgramSlotEnded(
                playingID,
                record,
                voice,
            );
            this.#MaybeFinishSfxProgram(playingID, record);
        }
        else if (record.voices.every(value => value.ended))
        {
            this.#FinishSfxPlaying(playingID);
        }
    }

    /** Marks the logical slot behind one realized program voice complete. */
    #SetSfxProgramSlotEnded(playingID, record, voice)
    {
        this.#voiceLimitLedger.Release(
            record,
            voice.voiceLimitReservationId,
        );
        if (!record.sfxProgram)
        {
            return;
        }
        const slot = record.programSlots?.get(
            voice.programSlotId,
        );

        if (slot)
        {
            if (slot.advanceMode === "switch")
            {
                const active = [ ...slot.voices ].filter(value =>
                    !value.ended);

                slot.voice = active.find(value =>
                    value.switchGeneration === slot.switchGeneration)
                    ?? active[0]
                    ?? null;
                slot.state = slot.continuation
                    && !slot.broken
                    && !record.stopped
                    ? "active"
                    : active.length
                        ? "voice"
                        : "ended";
                this.#DisposeEndedSlotVoices(record, slot);
                return;
            }
            if (IsOverlappingAdvanceMode(slot.advanceMode))
            {
                const batch = slot.batches?.get(
                    String(voice.programBatchId ?? ""),
                );

                if (batch
                    && [ ...batch.voices ].every(value => value.ended))
                {
                    batch.state = "ended";
                }
                const active = [ ...slot.voices ].filter(value =>
                    !value.ended);

                slot.voice = active[0] ?? null;
                if (this.#MaybeAdvanceNestedCompletionBarrier(
                    playingID,
                    record,
                    slot,
                ))
                {
                    return;
                }
                this.#UpdateOverlappingSlotState(slot);
                return;
            }
            if ([ ...slot.voices ].some(value => !value.ended))
            {
                slot.voice = [ ...slot.voices ]
                    .find(value => !value.ended) ?? null;
                return;
            }

            slot.voice = null;
            if (slot.continuation
                && !slot.broken
                && !slot.exhausted
                && !record.stopped)
            {
                this.#AdvanceSfxProgramSlot(
                    playingID,
                    record,
                    slot,
                    Number(this.#context.currentTime) || 0,
                );
            }
            else
            {
                slot.state = "ended";
            }
        }
    }

    /** Loads and starts the next child batch of one Continuous slot. */
    #AdvanceSfxProgramSlot(
        playingID,
        record,
        slot,
        boundaryContextTime,
        forceCompletionDelay = false,
    )
    {
        const triggerRate = slot.advanceMode === "trigger-rate";

        if (triggerRate && !forceCompletionDelay)
        {
            this.#AdvanceTriggerRateSlot(
                playingID,
                record,
                slot,
                boundaryContextTime,
            );
            return;
        }
        if (slot.advanceMode === "crossfade" && !forceCompletionDelay)
        {
            this.#PrepareCrossfadeSuccessor(
                playingID,
                record,
                slot,
            );
            return;
        }
        if (!slot.continuation
            || slot.broken
            || record.stopped
            || this.#playing.get(playingID) !== record)
        {
            slot.state = "ended";
            return;
        }

        let program;

        try
        {
            program = this.#continueSfxProgram?.(
                slot.continuation,
                record.sfxControls,
            ) ?? [];
        }
        catch
        {
            slot.state = "ended";
            return;
        }

        if (!Array.isArray(program) || !program.length)
        {
            this.#ExhaustSfxProgramSlot(slot);
            return;
        }

        let play = program.find(operation =>
            operation.kind === "play");
        let continuation = play?.continuations?.find(value =>
            value.programSlotId === slot.id);

        if (!play || !continuation)
        {
            this.#ExhaustSfxProgramSlot(slot);
            return;
        }
        const continuationDelayMs = Math.max(
            0,
            Number(continuation.delayMs) || 0,
        );
        const pendingTransitionDelayMs = forceCompletionDelay
            ? 0
            : continuationDelayMs;
        const pendingSelections = (play.selections ?? [])
            .filter(selection =>
                selection.programSlotId === slot.id);

        if (pendingTransitionDelayMs > 0
            && pendingSelections.some(selection =>
                selection.voiceLimit !== undefined))
        {
            this.#ExhaustSfxProgramSlot(slot);
            return;
        }
        try
        {
            program = this.#ReserveSfxProgram(record, program);
        }
        catch
        {
            this.#ExhaustSfxProgramSlot(slot);
            return;
        }
        play = program.find(operation => operation.kind === "play");
        continuation = play.continuations.find(value =>
            value.programSlotId === slot.id);
        const generation = ++slot.generation;

        slot.state = "loading";
        this.#AbortSfxProgramSlot(record, slot);
        slot.controller = new AbortController();
        slot.continuation = continuation.token;
        slot.exhausted = continuation.doneAfterBatch === true;
        slot.completionBarrier =
            continuation.completionBarrier === true;
        slot.advanceMode = continuation.advance === "trigger-rate"
            ? "trigger-rate"
            : continuation.advance === "crossfade"
                ? "crossfade"
                : "completion";
        slot.crossfadeMode = continuation.crossfadeMode ?? null;
        slot.transitionDelayMs = continuationDelayMs;
        const batchSelections = (play.selections ?? [])
            .filter(selection =>
                selection.programSlotId === slot.id);
        const batchStartContextTime = boundaryContextTime
            + pendingTransitionDelayMs / 1000;
        const selectionMetadata = batchSelections.map(selection =>
            CreateProgramSelectionMetadata(
                selection,
                batchStartContextTime,
            ));

        slot.selections = Object.freeze(selectionMetadata);
        slot.cancelledSelectionKeys =
            CreateProgramCancelledSelectionKeys(selectionMetadata);
        slot.selectionControllers = CreateProgramSelectionControllers(
            selectionMetadata,
        );
        slot.leafIndex = selectionMetadata.length
            ? Math.min(...selectionMetadata.map(selection =>
                selection.leafIndex))
            : 0;
        slot.actionTime = selectionMetadata.length
            ? Math.min(...selectionMetadata.map(selection =>
                selection.actionTime))
            : batchStartContextTime;
        slot.matchIds = Object.freeze(
            [ ...new Set(selectionMetadata.flatMap(selection =>
                selection.matchIds)) ],
        );
        this.#DisposeEndedSlotVoices(record, slot);
        const overlappingBatch = IsOverlappingAdvanceMode(
            slot.advanceMode,
        ) ? slot.CreateBatch({
                id: continuation.programBatchId,
                actionTime: slot.actionTime,
                selections: slot.selections,
                selectionControllers: slot.selectionControllers,
                cancelledSelectionKeys: slot.cancelledSelectionKeys,
                controller: slot.controller,
                state: "loading",
                continuation: slot.continuation,
                exhausted: slot.exhausted,
                completionBarrier: slot.completionBarrier,
                transitionDelayMs: slot.transitionDelayMs,
                crossfadeMode: slot.crossfadeMode,
            }) : null;

        if (overlappingBatch)
        {
            slot.batches ??= new Map();
            if (slot.batches.has(overlappingBatch.id))
            {
                this.#FailOverlappingSlot(slot);
                return;
            }
            slot.batches.set(overlappingBatch.id, overlappingBatch);
            slot.currentBatch = overlappingBatch;
        }

        Promise.resolve().then(() => this.#loadBuffer(
                record.eventID,
                record.eventName,
                record.sfxControls,
                program,
            )).then(result =>
        {
            // Rendering may have paused while this boundary was acquiring.
            // Apply every now-overdue Stop before the new batch can realize.
            this.#ProcessScheduledSfxActions();
            if (generation !== slot.generation
                || slot.state !== "loading"
                || record.stopped
                || this.#playing.get(playingID) !== record)
            {
                return;
            }

            const descriptors = NormalizeVoiceDescriptors(
                result,
                () => !!this.#isLoop(record.eventName),
            ).filter(descriptor =>
                descriptor.programSlotId === slot.id
                && !slot.cancelledSelectionKeys.has(
                    ProgramSelectionKey(descriptor),
                ));
            const voices = descriptors.map(descriptor =>
            {
                const selection = slot.selections.find(value =>
                    ProgramSelectionKey(value)
                        === ProgramSelectionKey(descriptor));

                return this.#CreateVoice(
                    selection
                        ? {
                            ...descriptor,
                            actionIndex: selection.actionIndex,
                            leafIndex: selection.leafIndex,
                            actionTime: selection.actionTime,
                            busRouteNodeId: selection.busRouteNodeId,
                            matchIds: selection.matchIds,
                            busPathIds: selection.busPathIds,
                            sourceEffects: selection.sourceEffects,
                            authoredBusVolumeDb:
                                selection.authoredBusVolumeDb,
                            authoredBusMakeUpGainDb:
                                selection.authoredBusMakeUpGainDb,
                            authoredOutputBusVolumeDb:
                                selection.authoredOutputBusVolumeDb,
                            voiceLimitReservationId:
                                selection.voiceLimitReservationId,
                        }
                        : descriptor,
                    record.emitterNodes,
                    record.gameObjID,
                );
            });

            slot.voices.clear();
            for (const voice of voices)
            {
                voice.programSlotId = slot.id;
                ApplySlotPauseDepth(voice, slot);
                if (slot.broken && voice.loop)
                {
                    voice.loop = false;
                }
                slot.voices.add(voice);
                overlappingBatch?.voices.add(voice);
                record.voices.push(voice);
            }
            if (overlappingBatch)
            {
                overlappingBatch.state = voices.length
                    ? "voice"
                    : "ended";
            }
            slot.voice = voices[0] ?? null;

            if (!voices.length)
            {
                // A missing or aborted child made no audible progress. End
                // fail-closed instead of hot-looping an infinite container.
                slot.continuation = null;
                slot.exhausted = true;
                slot.nextTriggerContextTime = null;
                slot.completionBarrier = false;
                slot.state = [ ...slot.voices ]
                    .some(voice => !voice.ended)
                    ? "voice"
                    : "ended";
                this.#MaybeFinishSfxProgram(playingID, record);
                return;
            }

            slot.state = "voice";
            this.#StartVoices(
                playingID,
                record,
                voices,
                batchStartContextTime,
            );
            if (slot.advanceMode === "crossfade"
                && !slot.exhausted
                && !slot.completionBarrier
                && slot.continuation)
            {
                this.#PrepareCrossfadeSuccessor(
                    playingID,
                    record,
                    slot,
                );
            }
        }).catch(() =>
        {
            if (generation === slot.generation
                && this.#playing.get(playingID) === record)
            {
                slot.continuation = null;
                slot.exhausted = true;
                slot.completionBarrier = false;
                slot.nextTriggerContextTime = null;
                if (overlappingBatch)
                {
                    overlappingBatch.state = "ended";
                }
                slot.state = [ ...slot.voices ]
                    .some(voice => !voice.ended)
                    ? "voice"
                    : "ended";
                this.#MaybeFinishSfxProgram(playingID, record);
            }
        }).finally(() =>
        {
            this.#ReleasePendingSfxVoiceLimitReservations(record, program);
        });
    }

    /** Loads one Trigger Rate child without serializing the authored clock. */
    #AdvanceTriggerRateSlot(
        playingID,
        record,
        slot,
        boundaryContextTime,
    )
    {
        if (!slot.continuation
            || slot.broken
            || slot.exhausted
            || record.stopped
            || this.#playing.get(playingID) !== record)
        {
            this.#UpdateOverlappingSlotState(slot);
            return;
        }

        let program;

        try
        {
            program = this.#continueSfxProgram?.(
                slot.continuation,
                record.sfxControls,
            ) ?? [];
        }
        catch
        {
            this.#FailOverlappingSlot(slot);
            return;
        }

        if (!Array.isArray(program) || !program.length)
        {
            this.#ExhaustSfxProgramSlot(slot);
            return;
        }

        let play = program.find(operation =>
            operation.kind === "play");
        let continuation = play?.continuations?.find(value =>
            value.programSlotId === slot.id);

        if (!play
            || (continuation
                && continuation.advance !== "trigger-rate"))
        {
            this.#FailOverlappingSlot(slot);
            return;
        }
        try
        {
            program = this.#ReserveSfxProgram(record, program);
        }
        catch
        {
            this.#FailOverlappingSlot(slot);
            return;
        }
        play = program.find(operation => operation.kind === "play");
        continuation = play?.continuations?.find(value =>
            value.programSlotId === slot.id);

        const batchStartContextTime = Number(boundaryContextTime) || 0;
        const batchSelections = (play.selections ?? [])
            .filter(selection =>
                selection.programSlotId === slot.id);
        const selectionMetadata = batchSelections.map(selection =>
            CreateProgramSelectionMetadata(
                selection,
                batchStartContextTime,
            ));
        const selectionControllers =
            CreateProgramSelectionControllers(selectionMetadata);
        const cancelledSelectionKeys =
            CreateProgramCancelledSelectionKeys(selectionMetadata);
        const controller = new AbortController();
        const batch = slot.CreateBatch({
            id: continuation?.programBatchId,
            actionTime: selectionMetadata.length
                ? Math.min(...selectionMetadata.map(selection =>
                    selection.actionTime))
                : batchStartContextTime,
            selections: Object.freeze(selectionMetadata),
            selectionControllers,
            cancelledSelectionKeys,
            controller,
            state: "loading",
        });

        if (slot.batches.has(batch.id))
        {
            this.#ReleasePendingSfxVoiceLimitReservations(
                record,
                program,
            );
            this.#FailOverlappingSlot(slot);
            return;
        }
        slot.batches.set(batch.id, batch);
        slot.currentBatch = batch;
        slot.selections = batch.selections;
        slot.selectionControllers = batch.selectionControllers;
        slot.cancelledSelectionKeys = batch.cancelledSelectionKeys;
        slot.controller = batch.controller;
        slot.actionTime = batch.actionTime;
        slot.leafIndex = selectionMetadata.length
            ? Math.min(...selectionMetadata.map(selection =>
                selection.leafIndex))
            : 0;
        slot.matchIds = Object.freeze(
            [ ...new Set(selectionMetadata.flatMap(selection =>
                selection.matchIds)) ],
        );
        slot.continuation = continuation?.token ?? null;
        slot.exhausted = !continuation
            || continuation.doneAfterBatch === true;
        slot.completionBarrier =
            continuation?.completionBarrier === true;
        slot.transitionDelayMs = Math.max(
            0,
            Number(continuation?.delayMs) || 0,
        );
        slot.state = "active";
        this.#ArmTriggerRateSlot(slot);
        this.#DisposeEndedSlotVoices(record, slot);

        if (!selectionMetadata.length)
        {
            this.#ReleasePendingSfxVoiceLimitReservations(
                record,
                program,
            );
            batch.state = "ended";
            this.#UpdateOverlappingSlotState(slot);
            this.#MaybeAdvanceNestedCompletionBarrier(
                playingID,
                record,
                slot,
            );
            this.#MaybeFinishSfxProgram(playingID, record);
            return;
        }

        Promise.resolve().then(() => this.#loadBuffer(
                record.eventID,
                record.eventName,
                record.sfxControls,
                program,
            )).then(result =>
        {
            this.#ProcessScheduledSfxActions();
            if (batch.state !== "loading"
                || slot.broken
                || record.stopped
                || this.#playing.get(playingID) !== record)
            {
                return;
            }

            const descriptors = NormalizeVoiceDescriptors(
                result,
                () => !!this.#isLoop(record.eventName),
            ).filter(descriptor =>
                descriptor.programSlotId === slot.id
                && descriptor.programBatchId === batch.id
                && !batch.cancelledSelectionKeys.has(
                    ProgramSelectionKey(descriptor),
                ));
            const voices = descriptors.map(descriptor =>
            {
                const selection = batch.selections.find(value =>
                    ProgramSelectionKey(value)
                        === ProgramSelectionKey(descriptor));

                return this.#CreateVoice(
                    selection
                        ? {
                            ...descriptor,
                            actionIndex: selection.actionIndex,
                            leafIndex: selection.leafIndex,
                            actionTime: selection.actionTime,
                            busRouteNodeId: selection.busRouteNodeId,
                            matchIds: selection.matchIds,
                            busPathIds: selection.busPathIds,
                            sourceEffects: selection.sourceEffects,
                            authoredBusVolumeDb:
                                selection.authoredBusVolumeDb,
                            authoredBusMakeUpGainDb:
                                selection.authoredBusMakeUpGainDb,
                            authoredOutputBusVolumeDb:
                                selection.authoredOutputBusVolumeDb,
                            voiceLimitReservationId:
                                selection.voiceLimitReservationId,
                        }
                        : descriptor,
                    record.emitterNodes,
                    record.gameObjID,
                );
            });

            for (const voice of voices)
            {
                voice.programSlotId = slot.id;
                voice.programBatchId = batch.id;
                ApplySlotPauseDepth(voice, slot);
                batch.voices.add(voice);
                slot.voices.add(voice);
                record.voices.push(voice);
            }
            slot.voice = voices[0]
                ?? [ ...slot.voices ].find(voice => !voice.ended)
                ?? null;

            if (!voices.length)
            {
                const intentionallyCancelled = batch.selections.every(
                    selection => batch.cancelledSelectionKeys.has(
                        ProgramSelectionKey(selection),
                    ),
                );

                batch.state = intentionallyCancelled
                    ? "cancelled"
                    : "ended";
                if (!intentionallyCancelled)
                {
                    this.#FailOverlappingSlot(slot);
                }
                else
                {
                    this.#UpdateOverlappingSlotState(slot);
                    this.#MaybeAdvanceNestedCompletionBarrier(
                        playingID,
                        record,
                        slot,
                    );
                }
                this.#MaybeFinishSfxProgram(playingID, record);
                return;
            }

            batch.state = "voice";
            this.#UpdateOverlappingSlotState(slot);
            this.#StartVoices(
                playingID,
                record,
                voices,
                batchStartContextTime,
            );
        }).catch(() =>
        {
            if ((batch.state === "loading"
                    || batch.state === "voice")
                && this.#playing.get(playingID) === record)
            {
                this.#DiscardTriggerRateBatch(
                    record,
                    slot,
                    batch,
                );
                this.#FailOverlappingSlot(slot);
                this.#MaybeFinishSfxProgram(playingID, record);
            }
        }).finally(() =>
        {
            this.#ReleasePendingSfxVoiceLimitReservations(record, program);
        });
    }

    /** Prefetches and schedules one duration-clamped Crossfade successor. */
    #PrepareCrossfadeSuccessor(
        playingID,
        record,
        slot,
    )
    {
        if (slot.advanceMode !== "crossfade"
            || slot.preparingCrossfade
            || slot.preparedBatch
            || slot.completionBarrier
            || !slot.continuation
            || slot.broken
            || slot.exhausted
            || record.stopped
            || this.#playing.get(playingID) !== record)
        {
            this.#UpdateOverlappingSlotState(slot);
            return;
        }

        const outgoingBatch = slot.currentBatch;
        const outgoingVoices = [
            ...outgoingBatch?.voices ?? [],
        ];

        if (outgoingVoices.length !== 1)
        {
            this.#FailOverlappingSlot(slot);
            return;
        }
        const outgoingVoice = outgoingVoices[0];
        const now = Number(this.#context.currentTime) || 0;
        const timing = outgoingVoice.ended
            ? {
                boundary:
                    now + RenderQuantumSeconds(this.#context),
                duration: 0,
                naturalEnd:
                    now + RenderQuantumSeconds(this.#context),
            }
            : CrossfadeTiming(
                outgoingVoice,
                slot.transitionDelayMs,
            );

        if (!timing)
        {
            this.#FailOverlappingSlot(slot);
            return;
        }

        let program;
        let transaction = null;

        try
        {
            if (!this.#prepareSfxProgram)
            {
                this.#FailOverlappingSlot(slot);
                return;
            }
            transaction = this.#prepareSfxProgram(
                slot.continuation,
                record.sfxControls,
            );
            if (!transaction
                || typeof transaction.commit !== "function"
                || typeof transaction.rollback !== "function")
            {
                throw new TypeError(
                    "Crossfade preparation must return a transaction",
                );
            }
            program = transaction.program;
        }
        catch
        {
            this.#FailOverlappingSlot(slot);
            return;
        }

        if (!Array.isArray(program) || !program.length)
        {
            transaction?.rollback?.();
            this.#ExhaustSfxProgramSlot(slot);
            return;
        }

        let play = program.find(operation =>
            operation.kind === "play");
        let continuation = play?.continuations?.find(value =>
            value.programSlotId === slot.id);

        if (!play
            || !continuation
            || continuation.advance !== "crossfade"
            || (continuation.crossfadeMode !== "crossfade-amplitude"
                && continuation.crossfadeMode !== "crossfade-power"))
        {
            transaction?.rollback?.();
            this.#FailOverlappingSlot(slot);
            return;
        }

        let batchSelections = (play.selections ?? [])
            .filter(selection =>
                selection.programSlotId === slot.id);

        if (batchSelections.length !== 1)
        {
            transaction?.rollback?.();
            this.#FailOverlappingSlot(slot);
            return;
        }
        if (batchSelections[0].voiceLimit !== undefined)
        {
            transaction?.rollback?.();
            this.#FailOverlappingSlot(slot);
            return;
        }

        try
        {
            program = this.#ReserveSfxProgram(record, program);
        }
        catch
        {
            transaction?.rollback?.();
            this.#FailOverlappingSlot(slot);
            return;
        }
        play = program.find(operation => operation.kind === "play");
        continuation = play.continuations.find(value =>
            value.programSlotId === slot.id);
        batchSelections = (play.selections ?? []).filter(selection =>
            selection.programSlotId === slot.id);

        const selectionMetadata = batchSelections.map(selection =>
            CreateProgramSelectionMetadata(
                selection,
                timing.boundary,
            ));
        const selectionControllers =
            CreateProgramSelectionControllers(selectionMetadata);
        const cancelledSelectionKeys =
            CreateProgramCancelledSelectionKeys(selectionMetadata);
        const controller = new AbortController();
        const batch = slot.CreateBatch({
            id: continuation.programBatchId,
            actionTime: selectionMetadata[0].actionTime,
            selections: Object.freeze(selectionMetadata),
            selectionControllers,
            cancelledSelectionKeys,
            controller,
            state: "loading",
            continuation: continuation.token,
            exhausted: continuation.doneAfterBatch === true,
            completionBarrier:
                continuation.completionBarrier === true,
            transitionDelayMs: Math.max(
                0,
                Number(continuation.delayMs) || 0,
            ),
            crossfadeMode: continuation.crossfadeMode,
            transaction,
        });

        if (slot.batches.has(batch.id))
        {
            transaction?.rollback?.();
            this.#FailOverlappingSlot(slot);
            return;
        }

        slot.preparingCrossfade = true;
        slot.batches.set(batch.id, batch);
        slot.state = "active";

        Promise.resolve().then(() => this.#loadBuffer(
                record.eventID,
                record.eventName,
                record.sfxControls,
                program,
            )).then(result =>
        {
            this.#ProcessScheduledSfxActions();
            if (batch.state !== "loading"
                || slot.broken
                || record.stopped
                || this.#playing.get(playingID) !== record)
            {
                return;
            }

            const descriptors = NormalizeVoiceDescriptors(
                result,
                () => !!this.#isLoop(record.eventName),
            ).filter(descriptor =>
                descriptor.programSlotId === slot.id
                && descriptor.programBatchId === batch.id
                && !batch.cancelledSelectionKeys.has(
                    ProgramSelectionKey(descriptor),
                ));

            if (descriptors.length !== 1)
            {
                batch.state = "ended";
                this.#FailOverlappingSlot(slot);
                this.#MaybeFinishSfxProgram(playingID, record);
                return;
            }

            const now = Number(this.#context.currentTime) || 0;
            const boundary = outgoingVoice.ended
                ? now + RenderQuantumSeconds(this.#context)
                : Math.max(
                    timing.boundary,
                    now + RenderQuantumSeconds(this.#context),
                );
            const selection = batch.selections[0];
            const actionTime = boundary
                + Math.max(
                    0,
                    Number(descriptors[0].delayMs) || 0,
                ) / 1000;
            const voice = this.#CreateVoice(
                {
                    ...descriptors[0],
                    actionIndex: selection.actionIndex,
                    leafIndex: selection.leafIndex,
                    actionTime,
                    busRouteNodeId: selection.busRouteNodeId,
                    matchIds: selection.matchIds,
                    busPathIds: selection.busPathIds,
                    sourceEffects: selection.sourceEffects,
                    authoredBusVolumeDb:
                        selection.authoredBusVolumeDb,
                    authoredBusMakeUpGainDb:
                        selection.authoredBusMakeUpGainDb,
                    authoredOutputBusVolumeDb:
                        selection.authoredOutputBusVolumeDb,
                    voiceLimitReservationId:
                        selection.voiceLimitReservationId,
                    crossfadeMode:
                        continuation.crossfadeMode,
                },
                record.emitterNodes,
                record.gameObjID,
            );

            voice.programSlotId = slot.id;
            voice.programBatchId = batch.id;
            ApplySlotPauseDepth(voice, slot);
            SetAudioParam(
                voice.transitionGain?.gain,
                0,
                this.#context,
            );
            batch.actionTime = actionTime;
            batch.voices.add(voice);
            slot.voices.add(voice);
            record.voices.push(voice);
            batch.state = "voice";
            slot.preparingCrossfade = false;
            slot.preparedBatch = batch;
            slot.nextTriggerContextTime = actionTime;
            slot.voice = outgoingVoice.ended
                ? voice
                : outgoingVoice;

            this.#StartVoices(
                playingID,
                record,
                [ voice ],
                boundary,
            );

            const overlap = outgoingVoice.ended
                ? 0
                : Math.max(
                    0,
                    Math.min(
                        timing.duration,
                        timing.naturalEnd
                            - voice.startContextTime,
                    ),
                );

            if (overlap > 0)
            {
                this.#ScheduleVoiceCrossfade(
                    outgoingVoice,
                    1,
                    0,
                    voice.startContextTime,
                    overlap,
                    slot.crossfadeMode,
                );
                this.#ScheduleVoiceCrossfade(
                    voice,
                    0,
                    1,
                    voice.startContextTime,
                    overlap,
                    slot.crossfadeMode,
                );
            }
            else
            {
                SetAudioParam(
                    voice.transitionGain?.gain,
                    1,
                    this.#context,
                );
            }

            this.#DisposeEndedSlotVoices(record, slot);
            this.#UpdateOverlappingSlotState(slot);
        }).catch(() =>
        {
            if (this.#playing.get(playingID) === record)
            {
                slot.preparingCrossfade = false;
                if (batch.voices.size)
                {
                    this.#DiscardTriggerRateBatch(
                        record,
                        slot,
                        batch,
                    );
                }
                else
                {
                    batch.state = "ended";
                }
                this.#FailOverlappingSlot(slot);
                this.#MaybeFinishSfxProgram(playingID, record);
            }
        }).finally(() =>
        {
            this.#ReleasePendingSfxVoiceLimitReservations(record, program);
        });
    }

    /** Removes a failed physical batch without touching earlier overlap tails. */
    #DiscardTriggerRateBatch(record, slot, batch)
    {
        const now = Number(this.#context.currentTime) || 0;

        for (const voice of batch.voices)
        {
            this.#EndVoiceDucking(
                voice,
                now,
                voice.sourceStarted !== true
                    || voice.startContextTime > now
                    || voice.cancelledBeforeStart === true,
            );
            this.#voiceLimitLedger.Release(
                record,
                voice.voiceLimitReservationId,
            );
            if (voice.source && !voice.ended)
            {
                voice.source.onended = null;
                try
                {
                    voice.source.stop(now);
                }
                catch
                {
                    // already stopped
                }
            }
            voice.ended = true;
        }
        this.#SettleCrossfadeBatchTransaction(batch, now);
        batch.state = "ended";
        this.#DisposeEndedSlotVoices(record, slot);
    }

    /** Cancels one Trigger Rate traversal after an acquisition failure. */
    #FailOverlappingSlot(slot)
    {
        const record = this.#playing.get(slot.playingID);

        slot.continuation = null;
        slot.exhausted = true;
        slot.completionBarrier = false;
        slot.nextTriggerContextTime = null;
        slot.preparingCrossfade = false;
        this.#SettleCrossfadeBatchTransaction(
            slot.preparedBatch,
        );
        slot.preparedBatch = null;
        for (const batch of slot.batches?.values?.() ?? [])
        {
            this.#SettleCrossfadeBatchTransaction(batch);
            if (batch.state === "loading"
                || batch.state === "pending")
            {
                batch.state = "cancelled";
                if (record)
                {
                    this.#AbortSfxProgramBatch(record, batch);
                }
                else
                {
                    batch.Abort();
                }
            }
        }
        this.#UpdateOverlappingSlotState(slot);
    }

    /** Derives logical Trigger Rate activity from cadence, loads, and tails. */
    #UpdateOverlappingSlotState(slot)
    {
        const activeVoices = [ ...slot.voices ]
            .filter(voice => !voice.ended);
        const acquiring = [ ...slot.batches?.values?.() ?? [] ]
            .some(batch =>
                batch.state === "loading"
                || batch.state === "pending");
        const scheduled = Boolean(
            slot.continuation
            && !slot.broken
            && !slot.exhausted
            && (Number.isFinite(slot.nextTriggerContextTime)
                || slot.completionBarrier),
        );

        slot.voice = activeVoices[0] ?? null;
        slot.state = activeVoices.length || acquiring || scheduled
            ? "active"
            : "ended";
    }

    /** Restarts one qualified nested scheduler after every dry voice tail. */
    #MaybeAdvanceNestedCompletionBarrier(playingID, record, slot)
    {
        if (!IsOverlappingAdvanceMode(slot.advanceMode)
            || !slot.completionBarrier
            || !slot.continuation
            || slot.broken
            || slot.exhausted
            || record.stopped
            || this.#playing.get(playingID) !== record
            || [ ...slot.voices ].some(voice => !voice.ended)
            || [ ...slot.batches?.values?.() ?? [] ].some(batch =>
                batch.state === "loading" || batch.state === "pending"))
        {
            return false;
        }

        const forceCompletionDelay = slot.advanceMode === "crossfade";

        slot.completionBarrier = false;
        this.#AdvanceSfxProgramSlot(
            playingID,
            record,
            slot,
            Number(this.#context.currentTime) || 0,
            forceCompletionDelay,
        );
        return true;
    }

    /** Commits prefetched choices already heard by the Web Audio clock. */
    #CommitHeardCrossfadeTransactions()
    {
        const now = Number(this.#context?.currentTime) || 0;

        for (const record of this.#playing.values())
        {
            for (const slot of record.programSlots?.values?.() ?? [])
            {
                this.#SettleCrossfadeBatchTransaction(
                    slot.preparedBatch,
                    now,
                    false,
                );
            }
        }
    }

    /** Commits a heard Crossfade choice or rolls back an unheard discard. */
    #SettleCrossfadeBatchTransaction(
        batch,
        now = Number(this.#context?.currentTime) || 0,
        rollbackUnheard = true,
    )
    {
        if (!batch?.transaction)
        {
            return;
        }
        const heard = [ ...batch.voices ].some(voice =>
            voice.sourceStarted === true
            && voice.cancelledBeforeStart !== true
            && Number.isFinite(voice.startContextTime)
            && voice.startContextTime <= now);

        if (heard)
        {
            batch.transaction.commit();
            batch.transaction = null;
        }
        else if (rollbackUnheard)
        {
            batch.transaction.rollback();
            batch.transaction = null;
        }
    }

    /** Stops scheduling one traversal while preserving audible overlap tails. */
    #ExhaustSfxProgramSlot(slot)
    {
        slot.continuation = null;
        slot.exhausted = true;
        slot.completionBarrier = false;
        slot.nextTriggerContextTime = null;
        if (IsOverlappingAdvanceMode(slot.advanceMode))
        {
            this.#UpdateOverlappingSlotState(slot);
        }
        else
        {
            slot.state = [ ...slot.voices ].some(voice => !voice.ended)
                ? "voice"
                : "ended";
        }
    }

    /** Disconnects completed voices before a long-running slot advances. */
    #DisposeEndedSlotVoices(record, slot)
    {
        for (const voice of [ ...slot.voices ])
        {
            if (!voice.ended)
            {
                continue;
            }
            const now = Number(this.#context.currentTime) || 0;

            this.#EndVoiceDucking(
                voice,
                now,
                voice.sourceStarted !== true
                    || voice.startContextTime > now
                    || voice.cancelledBeforeStart === true,
            );
            this.#voiceLimitLedger.Release(
                record,
                voice.voiceLimitReservationId,
            );
            voice.DisconnectNodes();
            slot.voices.delete(voice);
            const index = record.voices.indexOf(voice);

            if (index !== -1)
            {
                record.voices.splice(index, 1);
            }
        }
        for (const [ id, batch ] of slot.batches ?? [])
        {
            if (batch !== slot.currentBatch
                && batch !== slot.preparedBatch
                && (batch.state === "ended"
                    || batch.state === "cancelled")
                && [ ...batch.voices ].every(voice => voice.ended))
            {
                slot.batches.delete(id);
            }
        }
    }

    /** Re-evaluates authored live gain and playback-rate controls. */
    #RefreshSfxControls(gameObjID = null, transitionEnd = null)
    {
        if (this.#deferSfxControlRefresh)
        {
            return;
        }
        const now = Number(this.#context?.currentTime) || 0;

        for (const record of this.#playing.values())
        {
            if (!record.sfx
                || (gameObjID !== null && record.gameObjID !== gameObjID)
                || (gameObjID !== null
                    && record.emitterNodes
                        !== this.#emitterNodes.get(record.gameObjID)))
            {
                continue;
            }
            for (const voice of record.voices ?? [])
            {
                if (!voice.ended)
                {
                    const boundaries =
                        this.#ControlTransitionBoundariesForRecord(
                            record,
                            now,
                        );
                    const explicit = Number(transitionEnd);

                    if (Number.isFinite(explicit) && explicit > now)
                    {
                        boundaries.push(explicit);
                        boundaries.sort((left, right) => left - right);
                    }
                    voice.controlTransitionBoundaries = [
                        ...new Set(boundaries),
                    ];
                    voice.rtpcTransitionEnd =
                        voice.controlTransitionBoundaries.at(-1) ?? now;
                    this.#ApplyVoiceGain(voice);
                    this.#ApplyVoiceBusRtpcGain(voice);
                    this.#ApplyVoiceBusGain(voice);
                    this.#ApplyVoiceFilters(voice);
                    this.#ApplyVoicePlaybackRate(voice);
                }
            }
        }
        this.#busMixer?.RefreshBusControls?.();
    }

    /** Re-evaluates the live Voice Volume contribution during transitions. */
    #RefreshSfxVoiceVolumes(gameObjID = null)
    {
        if (this.#deferSfxControlRefresh)
        {
            return;
        }
        for (const record of this.#playing.values())
        {
            if (!record.sfx
                || (gameObjID !== null
                    && record.gameObjID !== gameObjID))
            {
                continue;
            }
            for (const voice of record.voices ?? [])
            {
                if (!voice.ended)
                {
                    this.#ApplyVoiceGain(voice);
                }
            }
        }
    }

    /** Re-evaluates Bus-target Voice Volume before shared Bus processing. */
    #RefreshSfxBusVoiceVolumes(gameObjID = null)
    {
        if (this.#deferSfxControlRefresh)
        {
            return;
        }
        for (const record of this.#playing.values())
        {
            if (!record.sfx
                || (gameObjID !== null
                    && record.gameObjID !== gameObjID))
            {
                continue;
            }
            for (const voice of record.voices ?? [])
            {
                if (!voice.ended)
                {
                    this.#ApplyVoiceBusActionGain(voice);
                }
            }
        }
    }

    /** Re-evaluates live Wwise Bus Volume contributions. */
    #RefreshSfxBusVolumes(gameObjID = null)
    {
        if (this.#deferSfxControlRefresh)
        {
            return;
        }
        for (const record of this.#playing.values())
        {
            if (!record.sfx
                || (gameObjID !== null
                    && record.gameObjID !== gameObjID))
            {
                continue;
            }
            for (const voice of record.voices ?? [])
            {
                if (!voice.ended)
                {
                    this.#ApplyVoiceBusGain(voice);
                }
            }
        }
    }

    /** Re-evaluates the live Voice Pitch contribution during transitions. */
    #RefreshSfxVoicePitches(gameObjID = null)
    {
        if (this.#deferSfxControlRefresh)
        {
            return;
        }
        for (const record of this.#playing.values())
        {
            if (!record.sfx
                || (gameObjID !== null
                    && record.gameObjID !== gameObjID))
            {
                continue;
            }
            for (const voice of record.voices ?? [])
            {
                if (!voice.ended)
                {
                    this.#ApplyVoicePlaybackRate(voice);
                }
            }
        }
    }

    /** Re-evaluates live Voice LPF and HPF action contributions. */
    #RefreshSfxVoiceFilters(gameObjID = null)
    {
        if (this.#deferSfxControlRefresh)
        {
            return;
        }
        for (const record of this.#playing.values())
        {
            if (!record.sfx
                || (gameObjID !== null
                    && record.gameObjID !== gameObjID))
            {
                continue;
            }
            for (const voice of record.voices ?? [])
            {
                if (!voice.ended)
                {
                    this.#ApplyVoiceFilters(voice);
                }
            }
        }
    }

    /** Applies one voice descriptor's current safe linear gain. */
    #ApplyVoiceGain(voice, smoothDistance = false)
    {
        const param = voice.gain?.gain;

        if (typeof voice.getGainAtVoiceVolumeDb === "function"
            && voice.voiceVolumeStates instanceof Map)
        {
            ScheduleVoiceVolumeGain(
                param,
                voice,
                this.#context,
                smoothDistance,
            );
            return;
        }

        let value = 1;

        try
        {
            value = voice.getGain(
                Number(this.#context?.currentTime) || 0,
            );
        }
        catch
        {
            value = 1;
        }

        const gain = Number(value);
        const authored = Number.isFinite(gain) ? Math.max(0, gain) : 1;
        const target = authored * (
            Number.isFinite(voice.distanceGainValue)
                ? Math.max(0, voice.distanceGainValue)
                : 1
        );

        if (smoothDistance)
        {
            SetSpatialAudioParam(
                param,
                target,
                this.#context,
                true,
            );
        }
        else
        {
            SetAudioParam(
                param,
                target,
                this.#context,
            );
        }
    }

    /** Re-evaluates per-voice distance gains after listener/emitter changes. */
    #RefreshDistanceGains(emitterNodes = null, smooth = true)
    {
        for (const record of this.#playing.values())
        {
            if (!record.sfx
                || (emitterNodes !== null
                    && record.emitterNodes !== emitterNodes))
            {
                continue;
            }
            for (const voice of record.voices ?? [])
            {
                if (!voice.ended)
                {
                    this.#ApplyVoiceDistanceGain(
                        voice,
                        record.emitterNodes,
                        smooth,
                    );
                }
            }
        }
    }

    /** Applies one spatial voice's authored or compatibility distance gain. */
    #ApplyVoiceDistanceGain(voice, emitterNodes, smooth = false)
    {
        if (!voice.spatial)
        {
            return;
        }
        voice.distanceGainValue = EvaluateSfxDistanceGain({
            curve: voice.dryVolumeCurve,
            emitterPosition: emitterNodes?.position,
            listenerPosition: this.#listenerPosition,
            scalingFactor: emitterNodes?.scalingFactor,
            distanceScale: this.#distanceScale,
        });

        this.#ApplyVoiceGain(voice, smooth);
    }

    /** Applies the current authored Wwise bus contribution to one voice. */
    #ApplyVoiceBusGain(voice)
    {
        if (!voice.busGain)
        {
            return;
        }
        ScheduleBusVolumeGain(
            voice.busGain.gain,
            voice,
            this.#context,
            this.#busRtpcCatalog,
            (name, at) => this.#ReadRtpcValue(
                "global",
                name,
                undefined,
                at,
            ),
            this.#busStateCatalog,
            (group, at) => this.#ReadStatePropertyWeights(group, at),
            this.#busDuckingController,
        );
    }

    /** Applies Bus-target Voice Volume before Bus effects and faders. */
    #ApplyVoiceBusActionGain(voice)
    {
        if (!voice.busVoiceActionGain)
        {
            return;
        }
        ScheduleBusVoiceActionGain(
            voice.busVoiceActionGain.gain,
            voice,
            this.#context,
        );
    }

    /** Applies Audio Bus Voice Volume RTPCs before Bus Volume/effects. */
    #ApplyVoiceBusRtpcGain(voice)
    {
        if (!voice.busVoiceGain)
        {
            return;
        }
        ScheduleBusVoiceRtpcGain(
            voice.busVoiceGain.gain,
            voice,
            this.#context,
            this.#busRtpcCatalog,
            (name, at) => this.#ReadRtpcValue(
                "global",
                name,
                undefined,
                at,
            ),
        );
    }

    /** Reapplies duck envelopes after either engine changes bus activity. */
    #RefreshBusDucking()
    {
        for (const record of this.#playing.values())
        {
            for (const voice of record.voices ?? [])
            {
                if (!voice.ended) this.#ApplyVoiceBusGain(voice);
            }
        }
        this.#musicEngine?.RefreshBusDucking?.();
        this.#busMixer?.RefreshBusControls?.();
    }

    /** Settles one disposable source's bus activity exactly once. */
    #EndVoiceDucking(voice, at, cancel = false)
    {
        const activity = voice?.duckActivity;

        if (!activity) return false;
        voice.duckActivity = null;
        return cancel ? activity.Cancel(at) : activity.End(at);
    }

    /** Applies live Wwise LPF/HPF percentages to per-voice WebAudio filters. */
    #ApplyVoiceFilters(voice)
    {
        const now = Number(this.#context?.currentTime) || 0;
        const evaluateBus = at => voice.sharedBusFilters
            ? { lowPass: 0, highPass: 0 }
            : voice.getBusStateProperties?.(at) ?? {
            lowPass: 0,
            highPass: 0,
        };

        ApplyVoiceFilter(
            voice.lowPassFilter,
            (additional, at) =>
                voice.getLowPassAtAdditionalPercent?.(additional, at)
                ?? ((Number(voice.getLowPass?.(at)) || 0) + additional),
            at => evaluateBus(at).lowPass,
            false,
            this.#context,
            [
                ...(voice.controlTransitionBoundaries ?? []),
                ...VoiceTargetTransitionBoundaries(
                    voice.voiceLowPassStates,
                    voice.matchIds,
                    now,
                ),
            ],
        );
        ApplyVoiceFilter(
            voice.highPassFilter,
            (additional, at) =>
                voice.getHighPassAtAdditionalPercent?.(additional, at)
                ?? ((Number(voice.getHighPass?.(at)) || 0) + additional),
            at => evaluateBus(at).highPass,
            true,
            this.#context,
            [
                ...(voice.controlTransitionBoundaries ?? []),
                ...VoiceTargetTransitionBoundaries(
                    voice.voiceHighPassStates,
                    voice.matchIds,
                    now,
                ),
            ],
        );
    }

    /** Advances one live voice's media and finite-repeat clocks to a context time. */
    #AdvanceSfxVoiceTransport(voice, contextTime)
    {
        const anchor = Number(voice.positionAnchorContextTime);
        const time = Number(contextTime);
        const rate = Number(voice.playbackRate);
        const variablePitch = UsesVoicePitchAutomation(voice);

        if (!voice.source
            || voice.positionAnchorContextTime === null
            || !Number.isFinite(anchor)
            || !Number.isFinite(time)
            || (!variablePitch
                && (!Number.isFinite(rate) || rate <= 0))
            || time <= anchor)
        {
            return;
        }

        const elapsedMedia = variablePitch
            ? IntegrateVoicePitchPlaybackRate(voice, anchor, time)
            : (time - anchor) * rate;
        const duration = Number(voice.buffer?.duration);
        let offset = Math.max(0, Number(voice.offsetSeconds) || 0)
            + elapsedMedia;

        if (Number.isFinite(duration) && duration > 0)
        {
            if (voice.loop || voice.repeatRemainingSeconds !== null)
            {
                offset %= duration;
            }
            else
            {
                offset = Math.min(offset, duration);
            }
        }
        voice.offsetSeconds = offset;
        voice.positionAnchorContextTime = time;
        if (variablePitch)
        {
            voice.playbackRate = EvaluateVoicePitchPlaybackRate(
                voice,
                time,
            );
        }

        if (voice.repeatRemainingSeconds !== null)
        {
            voice.repeatRemainingSeconds = Math.max(
                0,
                voice.repeatRemainingSeconds - elapsedMedia,
            );
            voice.repeatAnchorContextTime = time;
        }
    }

    /** Applies one voice descriptor's current safe playback rate in place. */
    #ApplyVoicePlaybackRate(voice)
    {
        if (typeof voice.getPlaybackRate !== "function")
        {
            return;
        }

        const source = voice.source;
        const now = Number(this.#context.currentTime) || 0;
        const variablePitch = UsesVoicePitchAutomation(voice);

        this.#AdvanceSfxVoiceTransport(voice, now);

        if (variablePitch)
        {
            const value = EvaluateVoicePitchPlaybackRate(voice, now);

            if (!Number.isFinite(value) || value <= 0)
            {
                return;
            }

            voice.playbackRate = value;
            ScheduleVoicePitchPlaybackRate(
                source?.playbackRate,
                voice,
                this.#context,
            );
            if (source
                && !voice.stopping
                && voice.repeatRemainingSeconds !== null
                && voice.repeatAnchorContextTime !== null)
            {
                voice.scheduledEndContextTime =
                    SolveVoicePitchRepeatEnd(voice, now);
                try
                {
                    source.stop(voice.scheduledEndContextTime);
                }
                catch
                {
                    // already stopped
                }
            }
            return;
        }

        let value;

        try
        {
            value = Number(voice.getPlaybackRate(now));
        }
        catch
        {
            return;
        }
        if (!Number.isFinite(value) || value <= 0)
        {
            return;
        }

        const previous = Number(voice.playbackRate);

        if (source
            && !voice.stopping
            && Number.isFinite(previous)
            && previous > 0
            && voice.repeatRemainingSeconds !== null
            && voice.repeatAnchorContextTime !== null)
        {
            voice.scheduledEndContextTime =
                voice.repeatAnchorContextTime
                + voice.repeatRemainingSeconds / value;
            try
            {
                source.stop(voice.scheduledEndContextTime);
            }
            catch
            {
                // already stopped
            }
        }

        voice.playbackRate = value;
        SetAudioParam(source?.playbackRate, value, this.#context);
    }

    /**
     * Freezes an in-progress authored Play fade before a Stop fade begins.
     * Otherwise the rising Play envelope would multiply the falling Stop
     * envelope and could become louder after the stop action.
     */
    #HoldVoiceFade(voice, actionTime)
    {
        const param = voice.fadeGain?.gain;
        const start = voice.fadeStartContextTime;
        const duration = voice.fadeInMs / 1000;

        if (!param
            || !voice.fadeScheduled
            || !Number.isFinite(start)
            || !Number.isFinite(duration)
            || duration <= 0
            || actionTime < start
            || actionTime >= start + duration)
        {
            return;
        }
        if (typeof param.cancelAndHoldAtTime === "function")
        {
            param.cancelAndHoldAtTime(actionTime);
            return;
        }

        const progress = (actionTime - start) / duration;
        const value = evaluateWwiseInterpolation(
            voice.fadeCurve,
            progress,
        );

        param.cancelScheduledValues?.(actionTime);
        param.setValueAtTime?.(value, actionTime);
        if ("value" in param)
        {
            param.value = value;
        }
    }

    /** Freezes one active Crossfade envelope before applying a Stop fade. */
    #HoldVoiceTransitionFade(voice, actionTime)
    {
        const param = voice.transitionGain?.gain;
        const start = voice.transitionFadeStartContextTime;
        const duration = voice.transitionFadeDuration;

        if (!param
            || !voice.transitionFadeScheduled
            || !Number.isFinite(start)
            || !Number.isFinite(duration)
            || duration <= 0
            || actionTime < start
            || actionTime >= start + duration)
        {
            return;
        }
        if (typeof param.cancelAndHoldAtTime === "function")
        {
            param.cancelAndHoldAtTime(actionTime);
            voice.transitionFadeScheduled = false;
            return;
        }

        const progress = (actionTime - start) / duration;
        const value = EvaluateCrossfadeGain(
            voice.transitionFadeFrom,
            voice.transitionFadeTo,
            progress,
            voice.transitionFadeMode,
        );

        param.cancelScheduledValues?.(actionTime);
        param.setValueAtTime?.(value, actionTime);
        if ("value" in param)
        {
            param.value = value;
        }
        voice.transitionFadeScheduled = false;
    }

    /** Schedules and records one Crossfade envelope for later Stop holds. */
    #ScheduleVoiceCrossfade(
        voice,
        from,
        to,
        when,
        duration,
        mode,
    )
    {
        voice.transitionFadeScheduled = duration > 0;
        voice.transitionFadeStartContextTime = when;
        voice.transitionFadeDuration = duration;
        voice.transitionFadeFrom = from;
        voice.transitionFadeTo = to;
        voice.transitionFadeMode = mode;
        ScheduleCrossfadeGain(
            voice.transitionGain?.gain,
            from,
            to,
            when,
            duration,
            mode,
        );
    }

    /** Marks the SFX side complete and closes the shared id when music agrees. */
    #FinishSfxPlaying(playingID)
    {
        const record = this.#playing.get(playingID);

        if (!record || record.sfxFinished)
        {
            return;
        }
        this.#voiceLimitLedger.ReleaseAll(record);
        record.sfxFinished = true;
        if (!record.music || record.musicFinished)
        {
            this.#FinishPlaying(playingID);
        }
    }

    /** Marks the music side complete and closes the shared id when SFX agrees. */
    #FinishMusicPlaying(playingID)
    {
        const record = this.#playing.get(playingID);

        if (!record || record.musicFinished)
        {
            return;
        }
        record.musicFinished = true;
        if (!record.sfx || record.sfxFinished)
        {
            this.#FinishPlaying(playingID);
        }
    }

    /** Finalizes one playing record and delivers completion callbacks once. */
    #FinishPlaying(playingID)
    {
        const record = this.#playing.get(playingID);
        if (record)
        {
            this.#voiceLimitLedger.ReleaseAll(record);
            this.#playing.delete(playingID);
            this.#scheduledSfxActions = this.#scheduledSfxActions
                .filter(value => value.ownerPlayingID !== playingID);
            record.stopped = true;
            record.controller?.abort();
            for (const slot of record.programSlots?.values?.() ?? [])
            {
                slot.Abort();
                for (const batch of slot.batches?.values?.() ?? [])
                {
                    this.#SettleCrossfadeBatchTransaction(batch);
                    batch.Abort();
                }
            }

            const now = Number(this.#context?.currentTime) || 0;

            for (const voice of record.voices ?? [])
            {
                this.#EndVoiceDucking(
                    voice,
                    now,
                    voice.sourceStarted !== true
                        || voice.startContextTime > now
                        || voice.cancelledBeforeStart === true,
                );
                if (voice.source)
                {
                    voice.source.onended = null;
                }
                if (voice.source && !voice.ended)
                {
                    try
                    {
                        voice.source.stop?.(now);
                    }
                    catch
                    {
                        // already stopped
                    }
                }
                voice.DisconnectNodes();
            }

            if (record.source)
            {
                record.source.onended = null;
            }
            record.source?.disconnect?.();
            record.sourceGain?.disconnect?.();
            record.emitter?.EventFinishedCallback?.(playingID);
            record.onFinished?.(playingID);
            this.#ReleaseRetiredEmitterNodes(
                record.gameObjID,
                record.emitterNodes,
            );
        }
    }

    /** Disconnects one emitter generation once no current or playing record owns it. */
    #ReleaseRetiredEmitterNodes(gameObjID, nodes)
    {
        if (!nodes
            || this.#emitterNodes.get(gameObjID) === nodes
            || [ ...this.#playing.values() ]
                .some(record => record.emitterNodes === nodes))
        {
            return;
        }
        this.#DisconnectEmitterNodes(nodes);
    }

    /** Disconnects a no-longer-used emitter node generation. */
    #DisconnectEmitterNodes(nodes)
    {
        for (const modes of nodes.routeBranches?.values?.() ?? [])
        {
            for (const branch of modes.values())
            {
                branch.gain?.disconnect?.();
                branch.flatGain?.disconnect?.();
                branch.panner?.disconnect?.();
                branch.analyser?.disconnect?.();
            }
            modes.clear();
        }
        nodes.routeBranches?.clear?.();
        nodes.gain.disconnect?.();
        nodes.flatGain?.disconnect?.();
        nodes.panner.disconnect?.();
        nodes.analyser?.disconnect?.();
    }
}

function SetPannerPose(
    panner,
    front,
    position,
    distanceScale,
    context,
    smooth = false,
)
{
    if (!panner)
    {
        return;
    }
    SetSpatialAudioParam(
        panner.positionX,
        position[0] * distanceScale,
        context,
        smooth,
    );
    SetSpatialAudioParam(
        panner.positionY,
        position[1] * distanceScale,
        context,
        smooth,
    );
    SetSpatialAudioParam(
        panner.positionZ,
        position[2] * distanceScale,
        context,
        smooth,
    );
    if (panner.orientationX)
    {
        SetSpatialAudioParam(panner.orientationX, front[0], context, smooth);
        SetSpatialAudioParam(panner.orientationY, front[1], context, smooth);
        SetSpatialAudioParam(panner.orientationZ, front[2], context, smooth);
    }
    else
    {
        panner.setOrientation?.(front[0], front[1], front[2]);
    }
}

function SetPannerScalingFactor(panner, value)
{
    if (panner && panner.refDistance !== undefined)
    {
        panner.refDistance = value;
    }
}

/**
 * Resolves Wwise distance attenuation in authored world units. Older/custom
 * graphs without a retained curve preserve the prior Web Audio inverse model.
 */
function EvaluateSfxDistanceGain({
    curve,
    emitterPosition,
    listenerPosition,
    scalingFactor,
    distanceScale,
})
{
    if (!Array.isArray(emitterPosition)
        || !Array.isArray(listenerPosition))
    {
        return 1;
    }
    const distance = Math.hypot(
        Number(emitterPosition[0]) - Number(listenerPosition[0]),
        Number(emitterPosition[1]) - Number(listenerPosition[1]),
        Number(emitterPosition[2]) - Number(listenerPosition[2]),
    );
    if (!Number.isFinite(distance))
    {
        return 1;
    }
    const scale = Number(scalingFactor);
    const factor = Number.isFinite(scale) && scale > 0 ? scale : 1;

    if (curve?.scaling === 2
        && Array.isArray(curve.points)
        && curve.points.length)
    {
        // Wwise playback scales the authored range linearly. Carbon's separate
        // culling path intentionally remains its shipped radius² * factor
        // calculation, whose effective radius is radius * sqrt(factor).
        const raw = evaluateWwiseRtpcCurve(
            curve.points,
            distance / factor,
        );
        const gainDb = wwiseDbRtpcValueToDb(raw);

        return 10 ** (gainDb / 20);
    }

    const acousticDistance = distance
        * Math.abs(Number(distanceScale) || 1);

    return acousticDistance <= factor
        ? 1
        : factor / acousticDistance;
}

function SetAudioParam(param, value, context)
{
    if (param && typeof param === "object" && "value" in param)
    {
        param.value = value;
    }
}

/**
 * Smooths live HRTF pose changes so pointer or scene updates do not become
 * audible discontinuities. Web Audio explicitly recommends a low-time-
 * constant target for de-zippering AudioParams. Unlike cancelling and
 * replacing a short linear ramp on every input event, consecutive target
 * events continue from the computed value of the preceding event. The first
 * pose remains immediate so a newly posted source never approaches from Web
 * Audio's default origin.
 */
function SetSpatialAudioParam(param, value, context, smooth)
{
    if (!param || typeof param !== "object" || !("value" in param))
    {
        return;
    }
    const now = Number(context?.currentTime);

    if (!smooth
        || !Number.isFinite(now))
    {
        param.value = value;
        return;
    }
    if (typeof param.setTargetAtTime === "function")
    {
        param.setTargetAtTime(
            value,
            now,
            SPATIAL_POSE_TIME_CONSTANT_SECONDS,
        );
        return;
    }
    if (typeof param.linearRampToValueAtTime !== "function")
    {
        param.value = value;
        return;
    }
    if (typeof param.cancelAndHoldAtTime === "function")
    {
        param.cancelAndHoldAtTime(now);
    }
    else
    {
        param.cancelScheduledValues?.(now);
        param.setValueAtTime?.(param.value, now);
    }
    param.linearRampToValueAtTime(
        value,
        now + SPATIAL_POSE_TIME_CONSTANT_SECONDS * 3,
    );
}

function IndexStateTransitionCatalog(value)
{
    const result = new Map();

    if (value === null || value === undefined)
    {
        return result;
    }
    if (!Array.isArray(value))
    {
        throw new TypeError("State transition catalog must be an array");
    }

    for (const rawGroup of value)
    {
        if (!rawGroup
            || typeof rawGroup !== "object"
            || Array.isArray(rawGroup)
            || !Array.isArray(rawGroup.transitions))
        {
            throw new TypeError(
                "State transition group must contain transitions",
            );
        }
        const defaultTransitionMs = Number(
            rawGroup.defaultTransitionMs,
        );

        if (!Number.isSafeInteger(defaultTransitionMs)
            || defaultTransitionMs < 0)
        {
            throw new TypeError(
                "State transition defaultTransitionMs"
                + " must be a non-negative integer",
            );
        }
        const group = {
            groupId: String(rawGroup.groupId),
            ...(rawGroup.group === undefined
                ? {}
                : { group: String(rawGroup.group).trim() }),
            defaultTransitionMs,
            stateAliases: new Map(),
            transitions: rawGroup.transitions.map(raw =>
            {
                const transitionMs = Number(raw?.transitionMs);

                if (!raw
                    || typeof raw !== "object"
                    || Array.isArray(raw)
                    || !Number.isSafeInteger(transitionMs)
                    || transitionMs < 0)
                {
                    throw new TypeError(
                        "State transition must define a non-negative"
                        + " integer transitionMs",
                    );
                }
                return {
                    fromId: String(raw.fromId),
                    ...(raw.from === undefined
                        ? {}
                        : { from: String(raw.from) }),
                    toId: String(raw.toId),
                    ...(raw.to === undefined
                        ? {}
                        : { to: String(raw.to) }),
                    transitionMs,
                };
            }),
        };
        const stateIdentities = new Map();

        if (rawGroup.states !== undefined)
        {
            if (!Array.isArray(rawGroup.states))
            {
                throw new TypeError(
                    "State transition states must be an array",
                );
            }
            for (const state of rawGroup.states)
            {
                AddRuntimeStateAlias(
                    group.stateAliases,
                    stateIdentities,
                    state?.stateId,
                    state?.state,
                );
            }
        }
        for (const transition of group.transitions)
        {
            ReserveRuntimeStateIdentity(
                stateIdentities,
                transition.fromId,
                transition.fromId,
            );
            ReserveRuntimeStateIdentity(
                stateIdentities,
                transition.toId,
                transition.toId,
            );
            if (transition.from !== undefined)
            {
                AddRuntimeStateAlias(
                    group.stateAliases,
                    stateIdentities,
                    transition.fromId,
                    transition.from,
                );
            }
            if (transition.to !== undefined)
            {
                AddRuntimeStateAlias(
                    group.stateAliases,
                    stateIdentities,
                    transition.toId,
                    transition.to,
                );
            }
        }
        for (const transition of group.transitions)
        {
            for (const [ nameField, idField ] of [
                [ "from", "fromId" ],
                [ "to", "toId" ],
            ])
            {
                if (transition[nameField] !== undefined)
                {
                    continue;
                }
                const alias = group.stateAliases.get(
                    NormalizeStateIdentity(transition[idField]),
                );

                if (alias !== undefined)
                {
                    transition[nameField] = alias;
                }
            }
        }
        group.noneState = group.stateAliases.get("none");

        for (const identity of [ group.groupId, group.group ])
        {
            if (identity === undefined)
            {
                continue;
            }
            const key = NormalizeStateIdentity(identity);

            if (result.has(key) && result.get(key) !== group)
            {
                throw new TypeError(
                    `Duplicate State transition group ${identity}`,
                );
            }
            result.set(key, group);
        }
    }
    return result;
}

function NormalizeStateIdentity(value)
{
    return String(value).trim().toLowerCase();
}

function AddRuntimeStateAlias(aliases, identities, id, name)
{
    const stateId = String(id);
    const state = String(name ?? "").trim();

    if (!state)
    {
        throw new TypeError("State transition alias must be non-empty");
    }
    ReserveRuntimeStateIdentity(identities, stateId, stateId);
    ReserveRuntimeStateIdentity(identities, state, stateId);
    const canonical = state;

    for (const alias of [ stateId, state ])
    {
        const key = NormalizeStateIdentity(alias);
        const existing = aliases.get(key);

        if (existing !== undefined && existing !== canonical)
        {
            throw new TypeError(
                `Conflicting State transition alias ${alias}`,
            );
        }
        aliases.set(key, canonical);
    }
}

function ReserveRuntimeStateIdentity(identities, alias, stateId)
{
    const key = NormalizeStateIdentity(alias);
    const canonical = String(stateId);
    const existing = identities.get(key);

    if (existing !== undefined && existing !== canonical)
    {
        throw new TypeError(
            `Conflicting State transition identity ${alias}`,
        );
    }
    identities.set(key, canonical);
}

function CanonicalStateGroup(group, fallback)
{
    return group?.group ?? group?.groupId ?? String(fallback);
}

function CanonicalStateValue(group, fallback)
{
    return group?.stateAliases.get(NormalizeStateIdentity(fallback))
        ?? String(fallback);
}

function StateTransitionEndpointMatches(name, id, value)
{
    if (name !== undefined)
    {
        return value !== undefined
            && value !== null
            && (NormalizeStateIdentity(name)
                    === NormalizeStateIdentity(value)
                || String(id) === String(value));
    }
    return value !== undefined
        && value !== null
        && String(id) === String(value);
}

function EvaluateStatePropertyTransition(transition, at)
{
    const duration = Math.max(0, Number(transition?.duration) || 0);
    const progress = duration === 0
        ? 1
        : Math.max(0, Math.min(
            1,
            ((Number(at) || 0) - Number(transition.startTime))
                / duration,
        ));
    const weights = new Map();

    for (const entry of transition.fromWeights ?? [])
    {
        const weight = (Number(entry?.weight) || 0) * (1 - progress);

        if (weight > 0)
        {
            const key = NormalizeStateIdentity(entry.state);
            const existing = weights.get(key);

            weights.set(key, {
                state: existing?.state ?? String(entry.state),
                weight: (existing?.weight ?? 0) + weight,
            });
        }
    }
    if (progress > 0)
    {
        const key = NormalizeStateIdentity(transition.toState);
        const existing = weights.get(key);

        weights.set(key, {
            state: existing?.state ?? String(transition.toState),
            weight: (existing?.weight ?? 0) + progress,
        });
    }
    return [ ...weights.values() ];
}

function StateWeightsEqualTarget(weights, target)
{
    return weights.length === 1
        && NormalizeStateIdentity(weights[0].state)
            === NormalizeStateIdentity(target)
        && Math.abs(Number(weights[0].weight) - 1) < 1e-12;
}

function EvaluateRtpcTransition(transition, at)
{
    const duration = Math.max(0, Number(transition?.duration) || 0);
    const progress = duration === 0
        ? 1
        : Math.max(0, Math.min(
            1,
            ((Number(at) || 0) - Number(transition.startTime))
                / duration,
        ));

    return Number(transition.from)
        + (Number(transition.to) - Number(transition.from))
            * evaluateWwiseInterpolation(transition.curve, progress);
}

function ReadRetiredRtpcValue(nodes, name, at)
{
    const transition = nodes.retiredRtpcTransitions?.get(name);

    return transition
        ? EvaluateRtpcTransition(transition, at)
        : nodes.retiredRtpcValues?.get(name);
}

function ApplyVoiceFilter(
    node,
    readPercent,
    readAdditionalPercent,
    highPass,
    context,
    transitionBoundaries = [],
)
{
    if (!node || typeof readPercent !== "function")
    {
        return;
    }

    const now = Number(context?.currentTime) || 0;
    const cutoffAt = at =>
    {
        const additional = Number(readAdditionalPercent?.(at)) || 0;
        const value = Number(readPercent(additional, at));

        if (!Number.isFinite(value))
        {
            return null;
        }
        return wwiseFilterPercentToHz(value, highPass);
    };
    let cutoff;

    try
    {
        cutoff = cutoffAt(now);
    }
    catch
    {
        return;
    }
    if (!Number.isFinite(cutoff))
    {
        return;
    }
    const param = node.frequency;
    const boundaries = FutureAutomationBoundaries(
        transitionBoundaries,
        now,
    );

    if (typeof param?.cancelAndHoldAtTime === "function")
    {
        param.cancelAndHoldAtTime(now);
    }
    else
    {
        // A value curve is one event at its start time. Cancelling from `now`
        // cannot remove a curve which began earlier and is still in progress.
        param?.cancelScheduledValues?.(0);
    }
    param?.setValueAtTime?.(cutoff, now);
    SetAudioParam(param, cutoff, context);
    let segmentStart = now;

    for (const segmentEnd of boundaries)
    {
        if (typeof param?.setValueCurveAtTime === "function")
        {
            const values = new Float32Array(FADE_CURVE_SAMPLES);

            for (let index = 0; index < values.length; index++)
            {
                const at = segmentStart
                    + (segmentEnd - segmentStart)
                        * index / (values.length - 1);

                values[index] = cutoffAt(at) ?? cutoff;
            }
            param.setValueCurveAtTime(
                values,
                segmentStart,
                segmentEnd - segmentStart,
            );
        }
        else
        {
            param?.linearRampToValueAtTime?.(
                cutoffAt(segmentEnd) ?? cutoff,
                segmentEnd,
            );
        }
        segmentStart = segmentEnd;
    }
}

function FutureAutomationBoundaries(value, from)
{
    const start = Number(from) || 0;

    return [ ...new Set(
        (Array.isArray(value) ? value : [ value ])
            .map(Number)
            .filter(boundary => Number.isFinite(boundary) && boundary > start),
    ) ].sort((left, right) => left - right);
}

function RenderQuantumSeconds(context)
{
    const sampleRate = Number(context?.sampleRate);

    return Number.isFinite(sampleRate) && sampleRate > 0
        ? 128 / sampleRate
        : DEFAULT_RENDER_QUANTUM_SECONDS;
}

function IsOverlappingAdvanceMode(value)
{
    return value === "crossfade" || value === "trigger-rate";
}

function CompareSfxActions(left, right)
{
    return CompareOrderTuples(
        [
            left.actionTime,
            left.ownerPlayingID,
            left.actionIndex,
            Number.MAX_SAFE_INTEGER,
        ],
        [
            right.actionTime,
            right.ownerPlayingID,
            right.actionIndex,
            Number.MAX_SAFE_INTEGER,
        ],
    );
}

function CompareProgramOrder(value, slot, stop)
{
    return CompareOrderTuples(
        [
            value.actionTime ?? slot.actionTime,
            slot.playingID,
            value.actionIndex ?? slot.actionIndex,
            value.leafIndex ?? slot.leafIndex,
        ],
        [
            stop.actionTime,
            stop.ownerPlayingID,
            stop.actionIndex,
            Number.MAX_SAFE_INTEGER,
        ],
    );
}

function CompareFallbackOrder(record, playingID, stop)
{
    return CompareOrderTuples(
        [
            record.postContextTime,
            playingID,
            Number.MAX_SAFE_INTEGER,
            Number.MAX_SAFE_INTEGER,
        ],
        [
            stop.actionTime,
            stop.ownerPlayingID,
            stop.actionIndex,
            Number.MAX_SAFE_INTEGER,
        ],
    );
}

function CompareOrderTuples(left, right)
{
    for (let index = 0; index < left.length; index++)
    {
        const result = Number(left[index]) - Number(right[index]);

        if (result !== 0)
        {
            return result;
        }
    }
    return 0;
}

function SilenceAudioParamAt(param, time, context)
{
    if (typeof param?.cancelAndHoldAtTime === "function")
    {
        param.cancelAndHoldAtTime(time);
    }
    else
    {
        param?.cancelScheduledValues?.(time);
    }
    param?.setValueAtTime?.(0, time);
    SetAudioParam(param, 0, context);
}

/** Clears the Pause envelope before a replacement source fades back in. */
function ClearPauseFadeForResume(param, time)
{
    if (!param)
    {
        return;
    }
    if (typeof param.cancelAndHoldAtTime === "function")
    {
        param.cancelAndHoldAtTime(time);
    }
    else
    {
        // A value curve is one event at its start time, so cancelling from
        // `time` cannot remove a curve that is already in progress.
        param.cancelScheduledValues?.(0);
    }
    param.setValueAtTime?.(0, time);
    if ("value" in param)
    {
        param.value = 0;
    }
}

/** Returns the current disposable source's authored/natural end time. */
function SfxVoiceNaturalEndContextTime(voice)
{
    if (voice.scheduledEndContextTime !== null)
    {
        const scheduled = Number(voice.scheduledEndContextTime);

        if (Number.isFinite(scheduled))
        {
            return scheduled;
        }
    }
    if (voice.loop)
    {
        return Infinity;
    }

    const duration = Number(voice.buffer?.duration);
    const rate = Number(voice.playbackRate);
    const start = Number(voice.startContextTime);
    const offset = Math.max(0, Number(voice.offsetSeconds) || 0);

    if (!Number.isFinite(duration)
        || duration <= 0
        || !Number.isFinite(rate)
        || rate <= 0
        || !Number.isFinite(start))
    {
        return Infinity;
    }
    return start + Math.max(0, duration - offset) / rate;
}

function PlaybackControlMatchesValue(action, value)
{
    const matchIds = new Set(
        (value.matchIds ?? []).map(String),
    );
    const protectedByException = action.exceptions
        .some(exception =>
            matchIds.has(String(exception.targetId)));

    if (protectedByException)
    {
        return false;
    }
    if (action.mode === "all" || action.mode === "all-except")
    {
        return true;
    }
    return action.mode === "element"
        && matchIds.has(String(action.targetId));
}

function ProgramSlotSelections(slot)
{
    if (!IsOverlappingAdvanceMode(slot.advanceMode))
    {
        return slot.selections ?? [];
    }
    return [ ...slot.batches?.values?.() ?? [] ]
        .flatMap(batch => batch.selections ?? []);
}

function AdjustPauseDepth(depths, key, pausing)
{
    const previous = Math.max(0, Number(depths.get(key)) || 0);
    const next = pausing
        ? previous + 1
        : Math.max(0, previous - 1);

    if (next > 0)
    {
        depths.set(key, next);
    }
    else
    {
        depths.delete(key);
    }
    return next;
}

function ApplySlotPauseDepth(voice, slot)
{
    const depth = Math.max(
        0,
        Number(slot.pauseDepths?.get(ProgramSelectionKey(voice))) || 0,
    );

    voice.pauseDepth = depth;
    voice.paused = depth > 0;
}

function CreateProgramSelectionMetadata(selection, baseContextTime)
{
    return Object.freeze({
        actionIndex: Number(selection.actionIndex),
        leafIndex: Number(selection.leafIndex),
        ...(selection.programBatchId === undefined
            ? {}
            : { programBatchId: String(selection.programBatchId) }),
        ...(selection.voiceLimitReservationId === undefined
            ? {}
            : {
                voiceLimitReservationId: Number(
                    selection.voiceLimitReservationId,
                ),
            }),
        ...(selection.voiceLimitRejected === true
            ? { voiceLimitRejected: true }
            : {}),
        actionTime: Number(baseContextTime)
            + Math.max(
                0,
                Number(selection.delayMs) || 0,
            ) / 1000,
        matchIds: Object.freeze(
            (selection.matchIds ?? []).map(String),
        ),
        ...(selection.busRouteNodeId === undefined
            ? {}
            : { busRouteNodeId: String(selection.busRouteNodeId) }),
        busPathIds: Object.freeze(
            (selection.busPathIds ?? []).map(String),
        ),
        ...(selection.sourceEffects === undefined
            ? {}
            : { sourceEffects: selection.sourceEffects }),
        ...(selection.authoredBusVolumeDb === undefined
            ? {}
            : {
                authoredBusVolumeDb: Number(
                    selection.authoredBusVolumeDb,
                ),
            }),
        ...(selection.authoredBusMakeUpGainDb === undefined
            ? {}
            : {
                authoredBusMakeUpGainDb: Number(
                    selection.authoredBusMakeUpGainDb,
                ),
            }),
        ...(selection.authoredOutputBusVolumeDb === undefined
            ? {}
            : {
                authoredOutputBusVolumeDb: Number(
                    selection.authoredOutputBusVolumeDb,
                ),
            }),
        switchPath: NormalizeSwitchPath(selection.switchPath),
        switchFadeInMs: Math.max(
            0,
            Number(selection.switchFadeInMs) || 0,
        ),
    });
}

function NormalizeContinuousSwitchGroups(value)
{
    if (!Array.isArray(value))
    {
        return Object.freeze([]);
    }
    return Object.freeze(value.map(item => Object.freeze({
        scope: item?.scope === "state" ? "state" : "switch",
        group: String(item?.group ?? ""),
    })).filter(item => item.group));
}

function NormalizeSwitchPath(value)
{
    if (!Array.isArray(value))
    {
        return Object.freeze([]);
    }
    return Object.freeze(value.map(item => Object.freeze({
        containerId: String(item.containerId),
        scope: item.scope === "state" ? "state" : "switch",
        group: String(item.group),
        value: item.value === null ? null : String(item.value),
        childId: String(item.childId),
        fadeOutMs: Math.max(0, Number(item.fadeOutMs) || 0),
        fadeInMs: Math.max(0, Number(item.fadeInMs) || 0),
    })));
}

function CreateProgramSelectionControllers(selections)
{
    return new Map(selections.map(selection => [
        ProgramSelectionKey(selection),
        new AbortController(),
    ]));
}

function CreateProgramCancelledSelectionKeys(selections)
{
    return new Set(selections
        .filter(selection => selection.voiceLimitRejected === true)
        .map(ProgramSelectionKey));
}

function StopFiniteRepeatAtBoundary(voice, now)
{
    const duration = Number(voice.buffer?.duration);
    const rate = Number(voice.playbackRate);

    if (!voice.source
        || !Number.isFinite(duration)
        || duration <= 0
        || !Number.isFinite(rate)
        || rate <= 0)
    {
        return;
    }
    voice.stopping = true;
    const elapsed = voice.offsetSeconds
        + Math.max(
            0,
            now - voice.positionAnchorContextTime,
        ) * rate;
    const position = elapsed % duration;
    const remaining = position === 0 && elapsed > 0
        ? duration
        : duration - position;
    const boundaryBase = Math.max(now, voice.startContextTime);
    const boundary = boundaryBase + remaining / rate;
    const stopAt = voice.scheduledEndContextTime === null
        ? boundary
        : Math.max(
            now,
            Math.min(boundary, voice.scheduledEndContextTime),
        );

    voice.source.stop(stopAt);
    voice.scheduledEndContextTime = stopAt;
}

function ProgramSelectionKey(value)
{
    return `${value.programBatchId ?? ""}:`
        + `${Number(value.actionIndex)}:${Number(value.leafIndex)}`;
}

function NormalizeVoiceDescriptors(result, eventLoop)
{
    const values = Array.isArray(result?.voices)
        ? result.voices
        : [ { buffer: result } ];

    return values.map((value, index) =>
    {
        if (!value?.buffer)
        {
            throw new TypeError(
                `Audio voice ${index} has no decoded buffer`,
            );
        }

        const playbackRate = Number(value.playbackRate ?? 1);

        if (!Number.isFinite(playbackRate) || playbackRate <= 0)
        {
            throw new TypeError(
                `Audio voice ${index} playbackRate must be positive`,
            );
        }

        const constantGain = Number(value.gain ?? 1);
        const constantLowPass = Number(value.lowPass ?? 0);
        const constantHighPass = Number(value.highPass ?? 0);
        const playCount = Number(value.playCount ?? 1);
        const delayMs = Number(value.delayMs ?? 0);
        const fadeInMs = Number(value.fadeInMs ?? 0);
        const switchFadeInMs = Number(value.switchFadeInMs ?? 0);
        const fadeCurve = Number(value.fadeCurve ?? LINEAR_FADE_CURVE);
        const dryVolumeCurve = NormalizeVoiceDryVolumeCurve(
            value.dryVolumeCurve,
            index,
        );
        const sourceEffects = value.sourceEffects === undefined
            ? undefined
            : normalizeStaticSourceEffectChain(
                value.sourceEffects,
                `Audio voice ${index} sourceEffects`,
            );
        const silenceDurationSeconds =
            value.silenceDurationSeconds === undefined
                ? undefined
                : Number(value.silenceDurationSeconds);

        if (!Number.isSafeInteger(playCount) || playCount <= 0)
        {
            throw new TypeError(
                `Audio voice ${index} playCount must be a positive integer`,
            );
        }
        if (silenceDurationSeconds !== undefined
            && (!Number.isFinite(silenceDurationSeconds)
                || silenceDurationSeconds <= 0))
        {
            throw new TypeError(
                `Audio voice ${index} silenceDurationSeconds must be positive`,
            );
        }
        if (value.loop === true && value.playCount !== undefined)
        {
            throw new TypeError(
                `Audio voice ${index} cannot combine loop and playCount`,
            );
        }
        if (!Number.isFinite(delayMs) || delayMs < 0)
        {
            throw new TypeError(
                `Audio voice ${index} delayMs must be non-negative`,
            );
        }
        if (!Number.isFinite(fadeInMs) || fadeInMs < 0)
        {
            throw new TypeError(
                `Audio voice ${index} fadeInMs must be non-negative`,
            );
        }
        if (!Number.isFinite(switchFadeInMs)
            || switchFadeInMs < 0)
        {
            throw new TypeError(
                `Audio voice ${index} switchFadeInMs must be non-negative`,
            );
        }
        if (!Number.isSafeInteger(fadeCurve)
            || fadeCurve < 0
            || fadeCurve > 9)
        {
            throw new TypeError(
                `Audio voice ${index} fadeCurve must be a Wwise curve value from 0 to 9`,
            );
        }
        if (value.programSlotId !== undefined
            && (typeof value.programSlotId !== "string"
                || value.programSlotId.length === 0))
        {
            throw new TypeError(
                `Audio voice ${index} programSlotId must be a non-empty string`,
            );
        }
        if (value.programBatchId !== undefined
            && (typeof value.programBatchId !== "string"
                || value.programBatchId.length === 0))
        {
            throw new TypeError(
                `Audio voice ${index} programBatchId must be a non-empty string`,
            );
        }
        const actionIndex = Number(value.actionIndex ?? 0);
        const leafIndex = Number(value.leafIndex ?? index);
        const voiceLimitReservationId =
            value.voiceLimitReservationId === undefined
                ? undefined
                : Number(value.voiceLimitReservationId);

        if (!Number.isSafeInteger(actionIndex) || actionIndex < 0)
        {
            throw new TypeError(
                `Audio voice ${index} actionIndex must be a non-negative integer`,
            );
        }
        if (!Number.isSafeInteger(leafIndex) || leafIndex < 0)
        {
            throw new TypeError(
                `Audio voice ${index} leafIndex must be a non-negative integer`,
            );
        }
        if (voiceLimitReservationId !== undefined
            && (!Number.isSafeInteger(voiceLimitReservationId)
                || voiceLimitReservationId <= 0))
        {
            throw new TypeError(
                `Audio voice ${index} voiceLimitReservationId must be a positive integer`,
            );
        }
        if (value.matchIds !== undefined
            && (!Array.isArray(value.matchIds)
                || value.matchIds.some(matchID =>
                    typeof matchID !== "string"
                    && typeof matchID !== "number")))
        {
            throw new TypeError(
                `Audio voice ${index} matchIds must be an array of ids`,
            );
        }
        const busRouteNodeId = value.busRouteNodeId === undefined
            ? undefined
            : String(value.busRouteNodeId);

        if (busRouteNodeId !== undefined
            && (!Number.isSafeInteger(Number(busRouteNodeId))
                || Number(busRouteNodeId) <= 0
                || Number(busRouteNodeId) > 0xffffffff
                || String(Number(busRouteNodeId)) !== busRouteNodeId))
        {
            throw new TypeError(
                `Audio voice ${index} busRouteNodeId must be a canonical positive id`,
            );
        }
        if (value.busPathIds !== undefined
            && (!Array.isArray(value.busPathIds)
                || !value.busPathIds.length
                || value.busPathIds.some(busID =>
                {
                    const normalized = Number(busID);

                    return !Number.isSafeInteger(normalized)
                        || normalized <= 0
                        || normalized > 0xffffffff;
                })))
        {
            throw new TypeError(
                `Audio voice ${index} busPathIds must be a non-empty array of positive ids`,
            );
        }
        const busPathIds = (value.busPathIds ?? []).map(busID =>
            String(Number(busID) >>> 0));
        if (value.busVoiceVolumeActionControlled !== undefined
            && typeof value.busVoiceVolumeActionControlled !== "boolean")
        {
            throw new TypeError(
                `Audio voice ${index} busVoiceVolumeActionControlled must be boolean`,
            );
        }
        if (value.busVoiceVolumeActionControlled === true
            && !busPathIds.length)
        {
            throw new TypeError(
                `Audio voice ${index} busVoiceVolumeActionControlled requires a bus route`,
            );
        }
        const hasAuthoredBusVolume =
            value.authoredBusVolumeDb !== undefined;
        const authoredBusVolumeDb = Number(value.authoredBusVolumeDb);
        const hasAuthoredBusMakeUpGain =
            value.authoredBusMakeUpGainDb !== undefined;
        const authoredBusMakeUpGainDb = Number(
            value.authoredBusMakeUpGainDb,
        );
        const hasAuthoredOutputBusVolume =
            value.authoredOutputBusVolumeDb !== undefined;
        const authoredOutputBusVolumeDb = Number(
            value.authoredOutputBusVolumeDb,
        );

        if (hasAuthoredBusVolume
            && (!busPathIds.length
                || !Number.isFinite(authoredBusVolumeDb)))
        {
            throw new TypeError(
                `Audio voice ${index} authoredBusVolumeDb requires a bus route and must be finite`,
            );
        }
        if (hasAuthoredBusMakeUpGain
            && (!busPathIds.length
                || !Number.isFinite(authoredBusMakeUpGainDb)))
        {
            throw new TypeError(
                `Audio voice ${index} authoredBusMakeUpGainDb requires a bus route and must be finite`,
            );
        }
        if (hasAuthoredOutputBusVolume
            && (!busPathIds.length
                || !Number.isFinite(authoredOutputBusVolumeDb)))
        {
            throw new TypeError(
                `Audio voice ${index} authoredOutputBusVolumeDb requires a bus route and must be finite`,
            );
        }

        if (new Set(busPathIds).size !== busPathIds.length)
        {
            throw new TypeError(
                `Audio voice ${index} busPathIds must not contain duplicates`,
            );
        }

        const loop = value.loop === undefined
            ? value.playCount === undefined && Boolean(eventLoop())
            : Boolean(value.loop);

        return {
            buffer: value.buffer,
            ...(silenceDurationSeconds === undefined
                ? {}
                : { silenceDurationSeconds }),
            loop,
            playCount,
            playbackRate,
            spatial: value.spatial === undefined
                ? true
                : Boolean(value.spatial),
            ...(dryVolumeCurve === undefined ? {} : { dryVolumeCurve }),
            ...(sourceEffects === undefined ? {} : { sourceEffects }),
            delayMs,
            fadeInMs,
            switchFadeInMs,
            fadeCurve,
            actionIndex,
            leafIndex,
            matchIds: Object.freeze(
                (value.matchIds ?? []).map(String),
            ),
            ...(busRouteNodeId === undefined ? {} : { busRouteNodeId }),
            busPathIds: Object.freeze(busPathIds),
            ...(value.busVoiceVolumeActionControlled === true
                ? { busVoiceVolumeActionControlled: true }
                : {}),
            ...(hasAuthoredBusVolume ? { authoredBusVolumeDb } : {}),
            ...(hasAuthoredBusMakeUpGain
                ? { authoredBusMakeUpGainDb }
                : {}),
            ...(hasAuthoredOutputBusVolume
                ? { authoredOutputBusVolumeDb }
                : {}),
            ...(value.programSlotId === undefined
                ? {}
                : { programSlotId: value.programSlotId }),
            ...(value.programBatchId === undefined
                ? {}
                : { programBatchId: value.programBatchId }),
            ...(voiceLimitReservationId === undefined
                ? {}
                : { voiceLimitReservationId }),
            getGain: typeof value.getGain === "function"
                ? value.getGain
                : () => (
                    Number.isFinite(constantGain)
                        ? Math.max(0, constantGain)
                        : 1
                ),
            getGainAtVoiceVolumeDb:
                typeof value.getGainAtVoiceVolumeDb === "function"
                    ? value.getGainAtVoiceVolumeDb
                    : null,
            getPlaybackRate: typeof value.getPlaybackRate === "function"
                ? value.getPlaybackRate
                : null,
            getPlaybackRateAtVoicePitchCents:
                typeof value.getPlaybackRateAtVoicePitchCents === "function"
                    ? value.getPlaybackRateAtVoicePitchCents
                    : null,
            getLowPass: typeof value.getLowPass === "function"
                ? value.getLowPass
                : value.lowPass === undefined
                    ? null
                    : () => constantLowPass,
            getHighPass: typeof value.getHighPass === "function"
                ? value.getHighPass
                : value.highPass === undefined
                    ? null
                    : () => constantHighPass,
        };
    });
}

function NormalizeVoiceDryVolumeCurve(value, index)
{
    if (value === undefined)
    {
        return undefined;
    }
    if (!value || Number(value.scaling) !== 2
        || !Array.isArray(value.points)
        || !value.points.length)
    {
        throw new TypeError(
            `Audio voice ${index} dryVolumeCurve must be a non-empty Wwise scaling-2 curve`,
        );
    }
    let previous = -Infinity;
    const points = value.points.map((point, pointIndex) =>
    {
        const x = Number(point?.x);
        const curveValue = Number(point?.value);
        const interpolation = Number(point?.interpolation ?? 4);

        if (!Number.isFinite(x) || x < 0 || x < previous
            || !Number.isFinite(curveValue)
            || !Number.isSafeInteger(interpolation)
            || interpolation < 0
            || interpolation > 9)
        {
            throw new TypeError(
                `Audio voice ${index} dryVolumeCurve point ${pointIndex} is invalid`,
            );
        }
        previous = x;
        return Object.freeze({ x, value: curveValue, interpolation });
    });

    return Object.freeze({
        scaling: 2,
        points: Object.freeze(points),
    });
}

function ApplyVoiceVolumeAction(states, targetId, action)
{
    const actionTime = Number(action.actionTime) || 0;
    const fromDb = EvaluateVoiceVolumeState(
        states.get(targetId),
        actionTime,
    );
    const requested = action.kind === "reset-voice-volume"
        ? 0
        : action.valueMode === "relative"
            ? fromDb + Number(action.volumeDb)
            : Number(action.volumeDb);
    const toDb = Math.max(
        -200,
        Math.min(200, Number.isFinite(requested) ? requested : 0),
    );

    states.set(targetId, {
        fromDb,
        toDb,
        startTime: actionTime,
        duration: Math.max(
            0,
            Number(action.transitionMs) || 0,
        ) / 1000,
        curve: Number(action.curve ?? LINEAR_FADE_CURVE),
    });
}

function ApplyBusVolumeAction(states, action)
{
    if (!(states instanceof Map))
    {
        return;
    }
    // All/All-Except operate on the exact bus identities represented in the
    // current property map. The serialized exceptions carry no descendant
    // expansion, and EVE currently exercises Element only.
    const excluded = new Set(
        (action.exceptions ?? []).map(value => String(value.targetId)),
    );
    const targets = action.mode === "element"
        ? [ String(action.targetId) ]
        : [ ...states.keys() ].filter(targetId =>
            action.mode !== "all-except" || !excluded.has(targetId));

    for (const targetId of targets)
    {
        const actionTime = Number(action.actionTime) || 0;
        const fromDb = EvaluateVoiceVolumeState(
            states.get(targetId),
            actionTime,
        );
        const requested = action.kind === "reset-bus-volume"
            ? 0
            : action.valueMode === "relative"
                ? fromDb + Number(action.busVolumeDb)
                : Number(action.busVolumeDb);
        const toDb = Math.max(
            -200,
            Math.min(
                200,
                Number.isFinite(requested) ? requested : 0,
            ),
        );

        states.set(targetId, {
            fromDb,
            toDb,
            startTime: actionTime,
            duration: Math.max(
                0,
                Number(action.transitionMs) || 0,
            ) / 1000,
            curve: Number(action.curve ?? LINEAR_FADE_CURVE),
        });
    }
}

function ApplyVoiceFilterAction(states, action, property)
{
    if (!(states instanceof Map))
    {
        return;
    }
    const resetting = action.kind.startsWith("reset-");
    // Voice-property state is stored on exact Wwise object identities. Because
    // the serialized exception contains only an object ID/flags, the current
    // qualified interpretation excludes exact keys rather than hierarchy
    // branches; EVE does not exercise this broader mode.
    const excluded = new Set(
        (action.exceptions ?? []).map(value => String(value.targetId)),
    );
    const targets = action.mode === "element"
        ? [ String(action.targetId) ]
        : [ ...states.keys() ].filter(targetId =>
            action.mode !== "all-except" || !excluded.has(targetId));

    for (const targetId of targets)
    {
        const actionTime = Number(action.actionTime) || 0;
        const fromPercent = EvaluateVoiceFilterState(
            states.get(targetId),
            actionTime,
        );
        const authored = Number(action[property]);
        const requested = resetting
            ? 0
            : action.valueMode === "relative"
                ? fromPercent + authored
                : authored;
        const toPercent = Math.max(
            -100,
            Math.min(
                100,
                Number.isFinite(requested) ? requested : 0,
            ),
        );

        states.set(targetId, {
            fromPercent,
            toPercent,
            startTime: actionTime,
            duration: Math.max(
                0,
                Number(action.transitionMs) || 0,
            ) / 1000,
            curve: Number(action.curve ?? LINEAR_FADE_CURVE),
        });
    }
}

function EvaluateVoiceFilterTargets(states, matchIds, at)
{
    if (!(states instanceof Map) || !Array.isArray(matchIds))
    {
        return 0;
    }

    let result = 0;
    const seen = new Set();

    for (const value of matchIds)
    {
        const targetId = String(value);

        if (!seen.has(targetId))
        {
            seen.add(targetId);
            result += EvaluateVoiceFilterState(states.get(targetId), at);
        }
    }
    return result;
}

function EvaluateVoiceFilterState(state, at)
{
    if (!state)
    {
        return 0;
    }

    const duration = Number(state.duration) || 0;
    const progress = duration <= 0
        ? 1
        : Math.max(0, Math.min(
            1,
            ((Number(at) || 0) - state.startTime) / duration,
        ));

    if (progress <= 0)
    {
        return state.fromPercent;
    }
    if (progress >= 1)
    {
        return state.toPercent;
    }
    return state.fromPercent
        + (state.toPercent - state.fromPercent)
            * evaluateWwiseInterpolation(state.curve, progress);
}

function VoiceTargetTransitionBoundaries(states, matchIds, from)
{
    if (!(states instanceof Map) || !Array.isArray(matchIds))
    {
        return [];
    }

    const boundaries = [];

    for (const value of new Set(matchIds.map(String)))
    {
        const state = states.get(value);

        boundaries.push(
            Number(state?.startTime),
            Number(state?.startTime)
                + Math.max(0, Number(state?.duration) || 0),
        );
    }
    return FutureAutomationBoundaries(boundaries, from);
}

function ScheduleVoiceVolumeGain(
    param,
    voice,
    context,
    smoothDistance = false,
)
{
    if (!param)
    {
        return;
    }

    const now = Number(context?.currentTime) || 0;
    const states = voice.voiceVolumeStates;
    const matchIds = Array.isArray(voice.matchIds)
        ? voice.matchIds
        : [];
    const rawBoundaries = [
        ...(voice.controlTransitionBoundaries ?? []),
    ];

    for (const value of new Set(matchIds.map(String)))
    {
        const state = states.get(value);
        const start = Number(state?.startTime);
        const end = Number(state?.startTime)
            + Math.max(0, Number(state?.duration) || 0);

        rawBoundaries.push(start, end);
    }
    const boundaries = FutureAutomationBoundaries(
        rawBoundaries,
        now,
    );

    const evaluate = at =>
    {
        let value = 1;

        try
        {
            value = voice.getGainAtVoiceVolumeDb(
                EvaluateVoiceVolumeTargets(states, matchIds, at),
                at,
            );
        }
        catch
        {
            value = 1;
        }

        const gain = Number(value);

        const authored = Number.isFinite(gain) ? Math.max(0, gain) : 1;
        const distance = Number(voice.distanceGainValue);

        return authored * (
            Number.isFinite(distance) ? Math.max(0, distance) : 1
        );
    };
    const startValue = evaluate(now);

    if (smoothDistance && !boundaries.length)
    {
        if (typeof param.cancelAndHoldAtTime === "function")
        {
            param.cancelAndHoldAtTime(now);
        }
        else
        {
            param.cancelScheduledValues?.(now);
        }
        SetSpatialAudioParam(param, startValue, context, true);
        return;
    }

    if (typeof param.cancelAndHoldAtTime === "function")
    {
        param.cancelAndHoldAtTime(now);
    }
    else
    {
        // A value curve is one event at its start time, so cancelling only
        // from `now` cannot remove a curve that is already in progress.
        // This gain stage owns no unrelated automation; clear its timeline
        // and immediately restore the evaluated current value instead.
        param.cancelScheduledValues?.(0);
    }
    param.setValueAtTime?.(startValue, now);
    if ("value" in param)
    {
        param.value = startValue;
    }
    let segmentStart = now;

    for (const segmentEnd of boundaries)
    {
        if (typeof param.setValueCurveAtTime === "function")
        {
            const values = new Float32Array(FADE_CURVE_SAMPLES);

            for (let index = 0; index < values.length; index++)
            {
                const ratio = index / (values.length - 1);

                values[index] = evaluate(
                    segmentStart
                    + (segmentEnd - segmentStart) * ratio,
                );
            }
            param.setValueCurveAtTime(
                values,
                segmentStart,
                segmentEnd - segmentStart,
            );
        }
        else
        {
            param.linearRampToValueAtTime?.(
                evaluate(segmentEnd),
                segmentEnd,
            );
        }
        segmentStart = segmentEnd;
    }
}

function ScheduleBusVoiceRtpcGain(
    param,
    voice,
    context,
    busRtpcCatalog,
    readGlobalRtpc,
)
{
    if (!param)
    {
        return;
    }
    const now = Number(context?.currentTime) || 0;
    const busPathIds = Array.isArray(voice.busPathIds)
        ? voice.busPathIds
        : [];
    const boundaries = [ ...new Set(
        (voice.controlTransitionBoundaries ?? [])
            .map(Number)
            .filter(value => Number.isFinite(value) && value > now),
    ) ].sort((left, right) => left - right);
    const evaluate = at => 10 ** (
        evaluateBusVoiceRtpcGainDb(
            busRtpcCatalog,
            busPathIds,
            readGlobalRtpc,
            at,
        ) / 20
    );
    const startValue = evaluate(now);

    if (typeof param.cancelAndHoldAtTime === "function")
    {
        param.cancelAndHoldAtTime(now);
    }
    else
    {
        param.cancelScheduledValues?.(0);
    }
    param.setValueAtTime?.(startValue, now);
    if ("value" in param)
    {
        param.value = startValue;
    }
    let segmentStart = now;

    for (const segmentEnd of boundaries)
    {
        if (typeof param.setValueCurveAtTime === "function")
        {
            const values = new Float32Array(FADE_CURVE_SAMPLES);

            for (let index = 0; index < values.length; index++)
            {
                const ratio = index / (values.length - 1);

                values[index] = evaluate(
                    segmentStart
                    + (segmentEnd - segmentStart) * ratio,
                );
            }
            param.setValueCurveAtTime(
                values,
                segmentStart,
                segmentEnd - segmentStart,
            );
        }
        else
        {
            param.linearRampToValueAtTime?.(
                evaluate(segmentEnd),
                segmentEnd,
            );
        }
        segmentStart = segmentEnd;
    }
}

function ScheduleBusVoiceActionGain(param, voice, context)
{
    if (!param)
    {
        return;
    }
    const now = Number(context?.currentTime) || 0;
    const states = voice.busVoiceVolumeStates;
    const busPathIds = Array.isArray(voice.busPathIds)
        ? voice.busPathIds
        : [];
    const boundaries = VoiceTargetTransitionBoundaries(
        states,
        busPathIds,
        now,
    );
    const evaluate = at => 10 ** (
        EvaluateVoiceVolumeTargets(states, busPathIds, at) / 20
    );
    const startValue = evaluate(now);

    if (typeof param.cancelAndHoldAtTime === "function")
    {
        param.cancelAndHoldAtTime(now);
    }
    else
    {
        param.cancelScheduledValues?.(0);
    }
    param.setValueAtTime?.(startValue, now);
    if ("value" in param)
    {
        param.value = startValue;
    }
    let segmentStart = now;

    for (const segmentEnd of boundaries)
    {
        if (typeof param.setValueCurveAtTime === "function")
        {
            const values = new Float32Array(FADE_CURVE_SAMPLES);

            for (let index = 0; index < values.length; index++)
            {
                const ratio = index / (values.length - 1);

                values[index] = evaluate(
                    segmentStart
                    + (segmentEnd - segmentStart) * ratio,
                );
            }
            param.setValueCurveAtTime(
                values,
                segmentStart,
                segmentEnd - segmentStart,
            );
        }
        else
        {
            param.linearRampToValueAtTime?.(
                evaluate(segmentEnd),
                segmentEnd,
            );
        }
        segmentStart = segmentEnd;
    }
}

function ScheduleBusVolumeGain(
    param,
    voice,
    context,
    busRtpcCatalog,
    readGlobalRtpc,
    busStateCatalog,
    readGlobalStateWeights,
    busDuckingController,
)
{
    if (!param)
    {
        return;
    }
    const now = Number(context?.currentTime) || 0;
    const states = voice.busVolumeStates;
    const busPathIds = Array.isArray(voice.busPathIds)
        ? voice.busPathIds
        : [];
    const boundaries = [ ...new Set([
        ...VoiceTargetTransitionBoundaries(
            states,
            busPathIds,
            now,
        ),
        ...(voice.controlTransitionBoundaries ?? [])
            .map(Number)
            .filter(value => Number.isFinite(value) && value > now),
        ...(busDuckingController?.TransitionBoundaries?.(
            busPathIds,
            now,
            voice.sharedBusDucking ? "voice-volume" : null,
        ) ?? []),
    ]) ].sort((left, right) => left - right);
    const authoredBusVolumeDb = Number(voice.authoredBusVolumeDb) || 0;
    const authoredBusMakeUpGainDb =
        Number(voice.authoredBusMakeUpGainDb) || 0;
    const authoredOutputBusVolumeDb =
        Number(voice.authoredOutputBusVolumeDb) || 0;
    const evaluate = at => 10 ** ((
        (voice.sharedBusFaders ? 0 : authoredBusVolumeDb)
        + authoredBusMakeUpGainDb
        + authoredOutputBusVolumeDb
        + EvaluateVoiceVolumeTargets(states, busPathIds, at)
        + (voice.sharedBusFaders ? 0 : evaluateBusRtpcGainDb(
            busRtpcCatalog,
            busPathIds,
            readGlobalRtpc,
            at,
        ))
        + (voice.sharedBusFaders ? 0 : evaluateBusStateGainDb(
            busStateCatalog,
            busPathIds,
            readGlobalStateWeights,
            at,
        ))
        + (busDuckingController?.EvaluateGainDb?.(
            busPathIds,
            at,
            voice.sharedBusDucking ? "voice-volume" : null,
        ) ?? 0)
    ) / 20);
    const startValue = evaluate(now);

    if (typeof param.cancelAndHoldAtTime === "function")
    {
        param.cancelAndHoldAtTime(now);
    }
    else
    {
        param.cancelScheduledValues?.(0);
    }
    param.setValueAtTime?.(startValue, now);
    if ("value" in param)
    {
        param.value = startValue;
    }
    let segmentStart = now;

    for (const segmentEnd of boundaries)
    {
        if (typeof param.setValueCurveAtTime === "function")
        {
            const values = new Float32Array(FADE_CURVE_SAMPLES);

            for (let index = 0; index < values.length; index++)
            {
                const ratio = index / (values.length - 1);

                values[index] = evaluate(
                    segmentStart
                    + (segmentEnd - segmentStart) * ratio,
                );
            }
            param.setValueCurveAtTime(
                values,
                segmentStart,
                segmentEnd - segmentStart,
            );
        }
        else
        {
            param.linearRampToValueAtTime?.(
                evaluate(segmentEnd),
                segmentEnd,
            );
        }
        segmentStart = segmentEnd;
    }
}

function EvaluateVoiceVolumeTargets(states, matchIds, at)
{
    if (!(states instanceof Map) || !Array.isArray(matchIds))
    {
        return 0;
    }

    let result = 0;
    const seen = new Set();

    for (const value of matchIds)
    {
        const targetId = String(value);

        if (!seen.has(targetId))
        {
            seen.add(targetId);
            result += EvaluateVoiceVolumeState(
                states.get(targetId),
                at,
            );
        }
    }
    return result;
}

function EvaluateVoiceVolumeState(state, at)
{
    if (!state)
    {
        return 0;
    }

    const duration = Number(state.duration) || 0;
    const progress = duration <= 0
        ? 1
        : Math.max(
            0,
            Math.min(
                1,
                ((Number(at) || 0) - state.startTime) / duration,
            ),
        );

    if (progress <= 0)
    {
        return state.fromDb;
    }
    if (progress >= 1)
    {
        return state.toDb;
    }

    const from = 10 ** (state.fromDb / 20);
    const to = 10 ** (state.toDb / 20);
    const gain = from + (to - from) * evaluateWwiseInterpolation(
        state.curve,
        progress,
    );

    return 20 * Math.log10(Math.max(1e-10, gain));
}

function ApplyVoicePitchAction(states, targetId, action)
{
    const actionTime = Number(action.actionTime) || 0;
    const fromCents = EvaluateVoicePitchState(
        states.get(targetId),
        actionTime,
    );
    const requested = action.kind === "reset-voice-pitch"
        ? 0
        : action.valueMode === "relative"
            ? fromCents + Number(action.pitchCents)
            : Number(action.pitchCents);
    const toCents = Math.max(
        -2400,
        Math.min(
            2400,
            Number.isFinite(requested) ? requested : 0,
        ),
    );

    states.set(targetId, {
        fromCents,
        toCents,
        startTime: actionTime,
        duration: Math.max(
            0,
            Number(action.transitionMs) || 0,
        ) / 1000,
        curve: Number(action.curve ?? LINEAR_FADE_CURVE),
    });
}

function UsesVoicePitchAutomation(voice)
{
    return typeof voice?.getPlaybackRateAtVoicePitchCents === "function"
        && (voice.voicePitchStates instanceof Map || voice.usesBusPitch);
}

function EvaluateVoicePitchTargets(states, matchIds, at)
{
    if (!(states instanceof Map) || !Array.isArray(matchIds))
    {
        return 0;
    }

    let result = 0;
    const seen = new Set();

    for (const value of matchIds)
    {
        const targetId = String(value);

        if (!seen.has(targetId))
        {
            seen.add(targetId);
            result += EvaluateVoicePitchState(
                states.get(targetId),
                at,
            );
        }
    }
    return result;
}

function EvaluateVoicePitchState(state, at)
{
    if (!state)
    {
        return 0;
    }

    const duration = Number(state.duration) || 0;
    const progress = duration <= 0
        ? 1
        : Math.max(
            0,
            Math.min(
                1,
                ((Number(at) || 0) - state.startTime) / duration,
            ),
        );

    if (progress <= 0)
    {
        return state.fromCents;
    }
    if (progress >= 1)
    {
        return state.toCents;
    }
    return state.fromCents
        + (state.toCents - state.fromCents)
            * evaluateWwiseInterpolation(state.curve, progress);
}

function VoicePitchTransitionEnd(voice, from)
{
    return VoicePitchTransitionBoundaries(voice, from).at(-1)
        ?? (Number(from) || 0);
}

function VoicePitchTransitionBoundaries(voice, from)
{
    const states = voice.voicePitchStates;
    const matchIds = Array.isArray(voice.matchIds)
        ? voice.matchIds
        : [];
    const boundaries = [
        ...(voice.controlTransitionBoundaries ?? []),
    ];

    for (const value of new Set(matchIds.map(String)))
    {
        const state = states.get(value);
        const start = Number(state?.startTime);
        const end = Number(state?.startTime)
            + Math.max(0, Number(state?.duration) || 0);

        boundaries.push(start, end);
    }
    return FutureAutomationBoundaries(boundaries, from);
}

function EvaluateVoicePitchPlaybackRate(voice, at)
{
    let value = 1;

    try
    {
        const busPitchCents = Number(
            voice.getBusStateProperties?.(at)?.pitchCents,
        ) || 0;

        value = voice.getPlaybackRateAtVoicePitchCents(
            EvaluateVoicePitchTargets(
                voice.voicePitchStates,
                voice.matchIds,
                at,
            ) + busPitchCents,
            at,
        );
    }
    catch
    {
        value = 1;
    }

    const rate = Number(value);

    return Number.isFinite(rate) && rate > 0 ? rate : 1;
}

function IntegrateVoicePitchPlaybackRate(voice, from, to)
{
    const start = Number(from);
    const end = Number(to);

    if (!Number.isFinite(start)
        || !Number.isFinite(end)
        || end <= start)
    {
        return 0;
    }

    const boundaries = new Set([ start, end ]);

    for (const boundary of VoicePitchTransitionBoundaries(voice, start))
    {
        if (boundary < end)
        {
            boundaries.add(boundary);
        }
    }

    for (const value of new Set((voice.matchIds ?? []).map(String)))
    {
        const state = voice.voicePitchStates.get(value);
        const transitionStart = Number(state?.startTime);
        const transitionEnd = transitionStart
            + Math.max(0, Number(state?.duration) || 0);

        if (Number.isFinite(transitionStart)
            && transitionStart > start
            && transitionStart < end)
        {
            boundaries.add(transitionStart);
        }
        if (Number.isFinite(transitionEnd)
            && transitionEnd > start
            && transitionEnd < end)
        {
            boundaries.add(transitionEnd);
        }
    }

    const ordered = [ ...boundaries ].sort((a, b) => a - b);
    let result = 0;

    for (let segment = 1; segment < ordered.length; segment++)
    {
        const segmentStart = ordered[segment - 1];
        const segmentEnd = ordered[segment];
        const step = (segmentEnd - segmentStart) / FADE_CURVE_SAMPLES;

        for (let index = 0; index < FADE_CURVE_SAMPLES; index++)
        {
            result += EvaluateVoicePitchPlaybackRate(
                voice,
                segmentStart + (index + 0.5) * step,
            ) * step;
        }
    }
    return result;
}

function ScheduleVoicePitchPlaybackRate(param, voice, context)
{
    if (!param)
    {
        return;
    }

    const now = Number(context?.currentTime) || 0;
    const boundaries = VoicePitchTransitionBoundaries(voice, now);
    const startValue = EvaluateVoicePitchPlaybackRate(voice, now);

    if (typeof param.cancelAndHoldAtTime === "function")
    {
        param.cancelAndHoldAtTime(now);
    }
    else
    {
        param.cancelScheduledValues?.(0);
    }
    param.setValueAtTime?.(startValue, now);
    if ("value" in param)
    {
        param.value = startValue;
    }
    let segmentStart = now;

    for (const segmentEnd of boundaries)
    {
        if (typeof param.setValueCurveAtTime === "function")
        {
            const values = new Float32Array(FADE_CURVE_SAMPLES);

            for (let index = 0; index < values.length; index++)
            {
                const ratio = index / (values.length - 1);

                values[index] = EvaluateVoicePitchPlaybackRate(
                    voice,
                    segmentStart
                        + (segmentEnd - segmentStart) * ratio,
                );
            }
            param.setValueCurveAtTime(
                values,
                segmentStart,
                segmentEnd - segmentStart,
            );
        }
        else
        {
            param.linearRampToValueAtTime?.(
                EvaluateVoicePitchPlaybackRate(voice, segmentEnd),
                segmentEnd,
            );
        }
        segmentStart = segmentEnd;
    }
}

function SolveVoicePitchRepeatEnd(voice, now)
{
    const start = Math.max(
        Number(now) || 0,
        Number(voice.repeatAnchorContextTime) || 0,
    );
    const remaining = Math.max(
        0,
        Number(voice.repeatRemainingSeconds) || 0,
    );
    const transitionEnd = VoicePitchTransitionEnd(voice, start);
    const duringTransition = IntegrateVoicePitchPlaybackRate(
        voice,
        start,
        transitionEnd,
    );

    if (remaining <= duringTransition && transitionEnd > start)
    {
        let low = start;
        let high = transitionEnd;

        for (let index = 0; index < 32; index++)
        {
            const middle = (low + high) * 0.5;

            if (IntegrateVoicePitchPlaybackRate(
                voice,
                start,
                middle,
            ) < remaining)
            {
                low = middle;
            }
            else
            {
                high = middle;
            }
        }
        return high;
    }

    const finalRate = EvaluateVoicePitchPlaybackRate(
        voice,
        transitionEnd,
    );

    return transitionEnd
        + Math.max(0, remaining - duringTransition) / finalRate;
}

function ScheduleWwiseFade(
    param,
    from,
    to,
    when,
    duration,
    curve,
    progress = 0,
)
{
    const startProgress = Math.max(0, Math.min(1, progress));
    const curveID = Number(curve);
    const startValue = from
        + (to - from) * evaluateWwiseInterpolation(
            curveID,
            startProgress,
        );

    if ("value" in param)
    {
        param.value = startValue;
    }
    if (curveID === LINEAR_FADE_CURVE
        || typeof param.setValueCurveAtTime !== "function")
    {
        param.setValueAtTime?.(startValue, when);
        param.linearRampToValueAtTime?.(to, when + duration);
        return;
    }

    const values = new Float32Array(FADE_CURVE_SAMPLES);

    for (let index = 0; index < values.length; index++)
    {
        const ratio = index / (values.length - 1);
        const sampleProgress = startProgress
            + (1 - startProgress) * ratio;

        values[index] = from
            + (to - from) * evaluateWwiseInterpolation(
                curveID,
                sampleProgress,
            );
    }
    param.setValueCurveAtTime(values, when, duration);
}

function CrossfadeTiming(voice, transitionMs)
{
    const duration = Number(voice?.buffer?.duration);
    const rate = Number(voice?.playbackRate);
    const start = Number(voice?.startContextTime);
    const offset = Math.max(0, Number(voice?.offsetSeconds) || 0);
    const playCount = Math.max(
        1,
        Number(voice?.playCount) || 1,
    );

    if (voice?.loop
        || !Number.isFinite(duration)
        || duration <= 0
        || !Number.isFinite(rate)
        || rate <= 0
        || !Number.isFinite(start))
    {
        return null;
    }

    const remaining = Math.max(0, duration - offset)
        + duration * (playCount - 1);
    const naturalEnd = start + remaining / rate;
    const authored = Math.max(
        0,
        Number(transitionMs) || 0,
    ) / 1000;
    const crossfadeDuration = Math.min(
        authored,
        duration / rate / 2,
        remaining / rate,
    );

    return {
        boundary: naturalEnd - crossfadeDuration,
        duration: crossfadeDuration,
        naturalEnd,
    };
}

function ScheduleCrossfadeGain(
    param,
    from,
    to,
    when,
    duration,
    mode,
)
{
    if (!param)
    {
        return;
    }
    if (!(duration > 0))
    {
        param.setValueAtTime?.(to, when);
        if ("value" in param)
        {
            param.value = to;
        }
        return;
    }
    if (mode !== "crossfade-power"
        || typeof param.setValueCurveAtTime !== "function")
    {
        param.setValueAtTime?.(from, when);
        param.linearRampToValueAtTime?.(to, when + duration);
        return;
    }

    const values = new Float32Array(FADE_CURVE_SAMPLES);
    const incoming = to > from;

    for (let index = 0; index < values.length; index++)
    {
        const ratio = index / (values.length - 1);

        values[index] = incoming
            ? Math.sin(ratio * Math.PI / 2)
            : Math.cos(ratio * Math.PI / 2);
    }
    if ("value" in param)
    {
        param.value = from;
    }
    param.setValueCurveAtTime(values, when, duration);
}

function EvaluateCrossfadeGain(from, to, progress, mode)
{
    const ratio = Math.max(0, Math.min(1, Number(progress) || 0));

    if (mode === "crossfade-power")
    {
        return to > from
            ? Math.sin(ratio * Math.PI / 2)
            : Math.cos(ratio * Math.PI / 2);
    }
    return from + (to - from) * ratio;
}
