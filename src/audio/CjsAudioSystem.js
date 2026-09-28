// CarbonEngineJS original (no Carbon counterpart). The audio system
// composition root: owns the AudManager + AudStaticDataRepository + WebAudio
// backend and wires them into the AudGameObjResource realization seams.
// Implements the ICjsAudioSystem contract shape consumed by core composition.
//
// Headless-first: constructing the system does NOT require an AudioContext -
// pass one (or a factory) only when sound should actually be realized. Without
// it, the graph runs in Carbon's null-manager/headless mode untouched.
import { AudGameObjResource } from "./trinity/audio/AudGameObjResource.js";
import { AudEmitter } from "./trinity/audio/AudEmitter.js";
import { AudManager } from "./trinity/audio/AudManager.js";
import { AudStaticDataRepository } from "./trinity/audio/AudStaticDataRepository.js";
import { AudioCurveSetDriver } from "./trinity/audio/AudioCurveSetDriver.js";
import { CjsAudioBackend } from "./CjsAudioBackend.js";
import { CjsMusicEngine } from "./CjsMusicEngine.js";
import { createAudioUpdateContext } from "./CjsAudioUpdateContext.js";
import { CjsBusDuckingController } from "./internal/busDucking.js";
import { CjsBusGraphRuntime } from "./internal/busGraphRuntime.js";
import { CjsSharedBusMixer } from "./internal/busGraphMixer.js";
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
    normalizeWwiseObstructionOcclusionMode,
} from "./internal/obstructionOcclusion.js";

/** Audio system composition root: repository + manager + backend, attached to the graph seams. */
export class CjsAudioSystem
{
    /**
     * Validates the small host-owned music-engine contract.
     *
     * An engine implements `HandlesEvent(name)`, `PostEvent(...)`,
     * `ExecuteAction(action, playingID, fadeOutDuration)`, `Process()` and
     * `Dispose()`; switch, state, volume, play-position, seek and media-cache
     * methods are optional. `PostEvent` must call its completion callback
     * exactly once. A `createMusicEngine(options)` factory is called
     * synchronously at `Enable()` with `{ context, destination, graph,
     * loadMedia, ... }` and must return the engine, not a promise. Without a
     * factory or injected engine, a `musicGraph` selects the built-in
     * `CjsMusicEngine`.
     */
    static ValidateMusicEngine(engine)
    {
        if (engine === null || engine === undefined)
        {
            return null;
        }
        if (typeof engine?.then === "function")
        {
            throw new TypeError("A music-engine factory must return an engine synchronously.");
        }
        const required = [ "HandlesEvent", "PostEvent", "ExecuteAction", "Process", "Dispose" ];
        const missing = required.filter(name => typeof engine[name] !== "function");
        if (missing.length)
        {
            throw new TypeError(`A music engine must implement: ${required.join(", ")}. Missing: ${missing.join(", ")}.`);
        }
        return engine;
    }

    manager = new AudManager();

    repository = new AudStaticDataRepository();

    backend = null;

    musicEngine = null;

    updateContext = createAudioUpdateContext();

    _attached = false;

    _loadBuffer = null;

    _hasEventStops = null;

    _hasSfxEvent = null;

    _resolveSfxProgram = null;

    _continueSfxProgram = null;

    _prepareSfxProgram = null;

    _stateTransitions = null;

    _createContext = null;

    _distanceScale = 1;

    _musicGraph = null;

    _loadMedia = null;

    _createMusicEngine = null;

    _providedMusicEngine = null;

    _applyRTPC = null;

    _releaseGameObj = null;

    _busRtpcs = null;

    _busStates = null;

    _busDucking = null;

    _busEffects = null;

    _busGraph = null;

    _busDuckingController = null;

    _busGraphRuntime = null;

    _busMixer = null;

    _providedUpdateContext = null;

    _wwiseDynamics = "strict";

    _wwiseDistortion = "strict";

    _wwiseModulation = "strict";

    _wwiseReverb = "strict";
    _wwiseRoomVerb = "strict";

    _wwiseMeterFeedback = "strict";

    _wwiseObstructionOcclusion = "strict";

    _wwiseVoiceLimits = "strict";

    _adoptedEmitters = new Set();

    _adoptedCurveSetDrivers = new Set();

    /** Creates a headless-first audio composition with optional realization inputs. */
    constructor({
        createContext,
        loadBuffer,
        hasEventStops,
        hasSfxEvent,
        resolveSfxProgram,
        continueSfxProgram,
        prepareSfxProgram,
        stateTransitions,
        audioMetadata,
        distanceScale,
        musicGraph,
        loadMedia,
        musicEngine,
        createMusicEngine,
        applyRTPC,
        releaseGameObj,
        updateContext,
        busRtpcs,
        busStates,
        busDucking,
        busEffects,
        busGraph,
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
        this._createContext = createContext ?? null;
        this._loadBuffer = loadBuffer ?? null;
        this._hasEventStops = typeof hasEventStops === "function"
            ? hasEventStops
            : null;
        this._hasSfxEvent = typeof hasSfxEvent === "function"
            ? hasSfxEvent
            : null;
        this._resolveSfxProgram = typeof resolveSfxProgram === "function"
            ? resolveSfxProgram
            : null;
        this._continueSfxProgram =
            typeof continueSfxProgram === "function"
                ? continueSfxProgram
                : null;
        this._prepareSfxProgram =
            typeof prepareSfxProgram === "function"
                ? prepareSfxProgram
                : null;
        this._stateTransitions = stateTransitions ?? null;
        this._distanceScale = Number(distanceScale) || 1;
        this._musicGraph = musicGraph ?? null;
        this._loadMedia = loadMedia ?? null;
        this._providedMusicEngine = musicEngine ?? null;
        this._createMusicEngine = typeof createMusicEngine === "function" ? createMusicEngine : null;
        this._applyRTPC = typeof applyRTPC === "function" ? applyRTPC : null;
        this._releaseGameObj = typeof releaseGameObj === "function"
            ? releaseGameObj
            : null;
        this._busRtpcs = busRtpcs ?? null;
        this._busStates = busStates ?? null;
        this._busDucking = busDucking ?? null;
        this._busEffects = busEffects ?? null;
        this._busGraph = busGraph ?? null;
        this._wwiseDynamics = normalizeWwiseDynamicsMode(wwiseDynamics);
        this._wwiseDistortion = normalizeWwiseDistortionMode(
            wwiseDistortion,
        );
        this._wwiseModulation = normalizeWwiseModulationMode(
            wwiseModulation,
        );
        this._wwiseReverb = normalizeWwiseReverbMode(wwiseReverb);
        this._wwiseRoomVerb = normalizeWwiseRoomVerbMode(wwiseRoomVerb);
        this._wwiseMeterFeedback = normalizeWwiseMeterFeedbackMode(
            wwiseMeterFeedback,
        );
        this._wwiseObstructionOcclusion =
            normalizeWwiseObstructionOcclusionMode(
                wwiseObstructionOcclusion,
            );
        this._wwiseVoiceLimits = normalizeWwiseVoiceLimitMode(
            wwiseVoiceLimits,
        );
        this._providedUpdateContext = updateContext ?? null;
        if (audioMetadata)
        {
            this.repository.Initialize(audioMetadata);
        }
    }

    /** Wires the three AudGameObjResource seams to this system. One system at a time. */
    Attach()
    {
        AudGameObjResource.manager = this.manager;
        AudGameObjResource.staticDataRepository = this.repository;
        AudGameObjResource.backend = this.backend;
        this._attached = true;
        return this;
    }

    /** Clears the seams (back to headless). */
    Detach()
    {
        if (this._attached)
        {
            AudGameObjResource.manager = null;
            AudGameObjResource.staticDataRepository = null;
            AudGameObjResource.backend = null;
            this._attached = false;
        }
    }

    /**
     * Creates the WebAudio backend (browser-gesture time) and enables the engine.
     * Returns whether the engine actually enabled. Without a context the manager
     * stays a true null manager (Carbon Init-failure semantics): banks are never
     * tracked, posts return 0 and queue emitter-side for replay on a later
     * successful Enable's wake pass.
     */
    Enable(soundBanksToLoad = [])
    {
        if (!this.backend && this._createContext)
        {
            const context = this._createContext();
            if (context)
            {
                this._busGraphRuntime = this._busGraph
                    ? new CjsBusGraphRuntime(this._busGraph)
                    : null;
                this._busDuckingController = new CjsBusDuckingController(
                    this._busDucking,
                );
                this.backend = new CjsAudioBackend({
                    context,
                    loadBuffer: this._loadBuffer,
                    isLoop: eventName => this.repository.EventIsLoop(eventName),
                    hasEventStops: this._hasEventStops,
                    hasSfxEvent: this._hasSfxEvent,
                    resolveSfxProgram: this._resolveSfxProgram,
                    continueSfxProgram: this._continueSfxProgram,
                    prepareSfxProgram: this._prepareSfxProgram,
                    stateTransitions: this._stateTransitions,
                    distanceScale: this._distanceScale,
                    applyRTPC: this._applyRTPC,
                    busRtpcs: this._busRtpcs,
                    busStates: this._busStates,
                    busDuckingController: this._busDuckingController,
                    busEffects: this._busEffects,
                    wwiseDynamics: this._wwiseDynamics,
                    wwiseDistortion: this._wwiseDistortion,
                    wwiseModulation: this._wwiseModulation,
                    wwiseReverb: this._wwiseReverb,
                    wwiseRoomVerb: this._wwiseRoomVerb,
                    wwiseMeterFeedback: this._wwiseMeterFeedback,
                    wwiseObstructionOcclusion:
                        this._wwiseObstructionOcclusion,
                    busGraphRuntime: this._busGraphRuntime,
                });
                const globalControlReaders =
                    this._CreateGlobalControlReaders();

                this._busMixer = this._busGraphRuntime
                    ? new CjsSharedBusMixer({
                        context,
                        runtime: this._busGraphRuntime,
                        destination: this.backend.masterGain,
                        busRtpcs: this._busRtpcs,
                        busStates: this._busStates,
                        busDuckingController: this._busDuckingController,
                        ...globalControlReaders,
                        wwiseDynamics: this._wwiseDynamics,
                        wwiseMeterFeedback: this._wwiseMeterFeedback,
                        wwiseVoiceLimits: this._wwiseVoiceLimits,
                    })
                    : null;
                this.backend.SetBusMixer(this._busMixer);
                if (!this.musicEngine)
                {
                    this.musicEngine = this._CreateMusicEngine(context);
                }
                this.backend.SetMusicEngine(this.musicEngine);
            }
        }
        if (this._attached)
        {
            AudGameObjResource.backend = this.backend;
        }
        for (const emitter of this._adoptedEmitters)
        {
            this._RecoverInitialEvent(emitter);
        }
        this.manager.Enable(soundBanksToLoad);
        if (this.manager.enabled)
        {
            for (const emitter of this._adoptedEmitters)
            {
                emitter.RealizePlacement?.();
            }
            for (const driver of this._adoptedCurveSetDrivers)
            {
                driver.Initialize();
            }
        }
        return this.manager.enabled;
    }

    /** Creates the shared backend control-reader callbacks once per enable. */
    _CreateGlobalControlReaders()
    {
        return {
            getGlobalRTPC: (name, at) =>
                this.backend.GetGlobalRTPCValue(name, at),
            getGlobalRTPCTransitionBoundaries: from =>
                this.backend.GetGlobalRTPCTransitionBoundaries(from),
            getGlobalStatePropertyWeights: (group, at) =>
                this.backend.GetGlobalStatePropertyWeights(group, at),
            getGlobalStateTransitionBoundaries: from =>
                this.backend.GetGlobalStateTransitionBoundaries(from),
        };
    }

    /** Creates or validates the configured music engine for one backend. */
    _CreateMusicEngine(context)
    {
        if (this._providedMusicEngine)
        {
            return CjsAudioSystem.ValidateMusicEngine(
                this._providedMusicEngine,
            );
        }

        const options = {
            context,
            destination: this.backend.masterGain ?? context.destination,
            graph: this._musicGraph,
            loadMedia: this._loadMedia,
            busRtpcs: this._busRtpcs,
            busStates: this._busStates,
            busDuckingController: this._busDuckingController,
            busEffects: this._busEffects,
            busGraphRuntime: this._busGraphRuntime,
            busMixer: this._busMixer,
            ...this._CreateGlobalControlReaders(),
        };

        if (this._createMusicEngine)
        {
            return CjsAudioSystem.ValidateMusicEngine(
                this._createMusicEngine(options),
            );
        }
        return this._musicGraph
            ? new CjsMusicEngine(options)
            : null;
    }

    /** Culls, clears banks, drops the engine to disabled. */
    Disable()
    {
        this.manager.Disable();
        this.backend?.StopAll();
    }

    /**
     * Per-frame drive: captures optional host timing, then culls, renders and
     * flushes. Carbon audio does not use host real/simulation time for playback.
     */
    Process(updateContext)
    {
        const source = updateContext === undefined
            ? this._providedUpdateContext
            : updateContext;

        this.updateContext.Update(source);
        this.manager.Process();
        return this.updateContext;
    }

    /**
     * Replaces the optional music engine. Applications can inject an engine
     * backed by WebAudio buffers, HTMLMediaElement streaming, or another host
     * source as long as it implements the documented music-engine contract.
     */
    SetMusicEngine(engine, { disposePrevious = true } = {})
    {
        const next = CjsAudioSystem.ValidateMusicEngine(engine);
        const previous = this.musicEngine;
        if (previous === next)
        {
            return next;
        }
        this.backend?.SetMusicEngine(null);
        if (disposePrevious)
        {
            previous?.Dispose?.();
        }
        this.musicEngine = next;
        this._providedMusicEngine = next;
        this.backend?.SetMusicEngine(next);
        return next;
    }

    /**
     * Posts an event directly to the injected/built-in music engine.
     *
     * Bypasses the Carbon event catalog, so application-owned event names need
     * no Wwise metadata. Returns 0 when the engine does not handle the event.
     */
    PostMusicEvent(eventName, onFinished)
    {
        return this.backend?.PostMusicEvent(eventName, onFinished) ?? 0;
    }

    /** Stops a directly posted or emitter-routed music event. */
    StopMusicEvent(playingID, fadeOutDuration = 1000)
    {
        return this.backend?.StopMusicEvent(playingID, fadeOutDuration) ?? false;
    }

    /**
     * Releases one decoded source from the built-in music cache. Sources that
     * are still playing keep their buffer until they finish.
     */
    ReleaseMusicMedia(sourceId)
    {
        return this.musicEngine?.ReleaseMedia?.(sourceId) ?? false;
    }

    /** Releases all inactive decoded sources retained by the music engine. */
    ClearMusicMedia()
    {
        return this.musicEngine?.ClearMedia?.() ?? 0;
    }

    /** Creates and adopts one Carbon AudEmitter from a plain descriptor. */
    CreateEmitter(descriptor = {})
    {
        const values = { ...descriptor };
        if (values.eventPrefix === undefined && values.prefix !== undefined)
        {
            values.eventPrefix = values.prefix;
        }
        if (values.scalingFactor === undefined && values.attenuationScalingFactor !== undefined)
        {
            values.scalingFactor = values.attenuationScalingFactor;
        }
        delete values.prefix;
        delete values.attenuationScalingFactor;
        return this.AdoptEmitter(AudEmitter.from(values));
    }

    /**
     * Registers an emitter constructed before system attachment. Idempotent
     * for the same object and rejects a different object reusing its ID.
     */
    AdoptEmitter(emitter)
    {
        if (!(emitter instanceof AudGameObjResource))
        {
            throw new TypeError("CjsAudioSystem.AdoptEmitter requires an AudGameObjResource.");
        }
        const existing = this.manager.GetAudioEmitter(emitter.ID);
        if (existing && existing !== emitter)
        {
            throw new Error(`Audio game-object ID ${emitter.ID} is already registered.`);
        }
        if (!existing)
        {
            this.manager.RegisterGameObject(emitter.ID, emitter);
        }
        emitter.UpdateValues({ skipEvents: true });
        this._adoptedEmitters.add(emitter);
        if (this.manager.enabled)
        {
            this._RecoverInitialEvent(emitter);
            emitter.Wake();
            emitter.RealizePlacement?.();
        }
        return emitter;
    }

    /** Recovers one persisted Initialize-time event lost before graph seams existed. */
    _RecoverInitialEvent(emitter)
    {
        if (!emitter.isUsed && emitter.eventName)
        {
            emitter.PostEvent(emitter.eventName);
        }
    }

    /** Registers a preconstructed audio curve-set driver. */
    AdoptCurveSetDriver(driver)
    {
        if (!(driver instanceof AudioCurveSetDriver))
        {
            throw new TypeError(
                "CjsAudioSystem.AdoptCurveSetDriver requires an AudioCurveSetDriver.",
            );
        }
        if (!this._adoptedCurveSetDrivers.has(driver))
        {
            driver.Initialize();
            this._adoptedCurveSetDrivers.add(driver);
        }
        return driver;
    }

    /** Adopts every audio game object and curve driver reachable from a schema graph. */
    AdoptGraph(root)
    {
        const adopted = [];
        if (root instanceof AudGameObjResource)
        {
            adopted.push(this.AdoptEmitter(root));
        }
        else if (root instanceof AudioCurveSetDriver)
        {
            adopted.push(this.AdoptCurveSetDriver(root));
        }
        else
        {
            root?.Traverse?.(model =>
            {
                if (model instanceof AudGameObjResource)
                {
                    adopted.push(this.AdoptEmitter(model));
                }
                else if (model instanceof AudioCurveSetDriver)
                {
                    adopted.push(this.AdoptCurveSetDriver(model));
                }
            });
        }
        return adopted;
    }

    /** Stops and unregisters an adopted emitter. */
    ReleaseEmitter(emitter)
    {
        if (!(emitter instanceof AudGameObjResource)
            || !this._adoptedEmitters.has(emitter)
            || this.manager.GetAudioEmitter(emitter.ID) !== emitter)
        {
            return false;
        }
        emitter.StopAll();
        emitter.UnregisterWwiseObject();
        this.backend?.ReleaseGameObj(emitter.ID);
        this.manager.RemoveCallbackGameObject(emitter.ID);
        this.manager.UnregisterGameObject(emitter.ID);
        this._adoptedEmitters.delete(emitter);
        this._releaseGameObj?.(emitter.ID);
        return true;
    }

    /** Releases one adopted audio curve-set driver's monitored watcher. */
    ReleaseCurveSetDriver(driver)
    {
        if (!(driver instanceof AudioCurveSetDriver)
            || !this._adoptedCurveSetDrivers.has(driver))
        {
            return false;
        }
        driver.Dispose();
        this._adoptedCurveSetDrivers.delete(driver);
        return true;
    }

    /** Releases every adopted audio game object and curve driver in a schema graph. */
    ReleaseGraph(root)
    {
        const released = [];
        if (root instanceof AudGameObjResource)
        {
            if (this.ReleaseEmitter(root)) released.push(root);
        }
        else if (root instanceof AudioCurveSetDriver)
        {
            if (this.ReleaseCurveSetDriver(root)) released.push(root);
        }
        else
        {
            root?.Traverse?.(model =>
            {
                if (model instanceof AudGameObjResource && this.ReleaseEmitter(model))
                {
                    released.push(model);
                }
                else if (model instanceof AudioCurveSetDriver
                    && this.ReleaseCurveSetDriver(model))
                {
                    released.push(model);
                }
            });
        }
        return released;
    }

    /** Stops music, releases its decoded cache, and detaches graph seams. */
    Dispose()
    {
        this.manager.Disable();
        for (const emitter of [ ...this._adoptedEmitters ])
        {
            this.ReleaseEmitter(emitter);
        }
        for (const driver of [ ...this._adoptedCurveSetDrivers ])
        {
            this.ReleaseCurveSetDriver(driver);
        }
        this.backend?.SetMusicEngine(null);
        this.musicEngine?.Dispose?.();
        this.musicEngine = null;
        this._providedMusicEngine = null;
        this.backend?.Dispose();
        this.backend = null;
        this._busMixer?.Dispose();
        this._busMixer = null;
        this._busGraphRuntime?.Dispose();
        this._busGraphRuntime = null;
        this._busDuckingController?.Dispose();
        this._busDuckingController = null;
        this.Detach();
    }
}
