import { AudGameObjResource as _AudGameObjResource } from './trinity/audio/AudGameObjResource.js';
import { AudEmitter as _AudEmitter } from './trinity/audio/AudEmitter.js';
import { AudManager as _AudManager } from './trinity/audio/AudManager.js';
import { AudStaticDataRepository as _AudStaticDataReposit } from './trinity/audio/AudStaticDataRepository.js';
import { AudioCurveSetDriver as _AudioCurveSetDriver } from './trinity/audio/AudioCurveSetDriver.js';
import { CjsAudioBackend } from './CjsAudioBackend.js';
import { CjsMusicEngine } from './CjsMusicEngine.js';
import { createAudioUpdateContext } from './CjsAudioUpdateContext.js';
import { CjsBusDuckingController } from './internal/busDucking.js';

// CarbonEngineJS original (no Carbon counterpart). The audio system
// composition root: owns the AudManager + AudStaticDataRepository + WebAudio
// backend and wires them into the AudGameObjResource realization seams.
// Implements the ICjsAudioSystem contract shape (runtime-core service slot).
//
// Headless-first: constructing the system does NOT require an AudioContext -
// pass one (or a factory) only when sound should actually be realized. Without
// it, the graph runs in Carbon's null-manager/headless mode untouched.

/** Audio system composition root: repository + manager + backend, attached to the graph seams. */
class CjsAudioSystem {
  /** Validates the small host-owned music-engine contract. */
  static ValidateMusicEngine(engine) {
    if (engine === null || engine === undefined) {
      return null;
    }
    if (typeof engine?.then === "function") {
      throw new TypeError("A music-engine factory must return an engine synchronously.");
    }
    const required = ["HandlesEvent", "PostEvent", "ExecuteAction", "Process", "Dispose"];
    const missing = required.filter(name => typeof engine[name] !== "function");
    if (missing.length) {
      throw new TypeError(`A music engine must implement: ${required.join(", ")}. Missing: ${missing.join(", ")}.`);
    }
    return engine;
  }
  manager = new _AudManager();
  repository = new _AudStaticDataReposit();
  backend = null;
  musicEngine = null;
  updateContext = createAudioUpdateContext();
  #attached = false;
  #loadBuffer = null;
  #hasEventStops = null;
  #hasSfxEvent = null;
  #resolveSfxProgram = null;
  #continueSfxProgram = null;
  #prepareSfxProgram = null;
  #stateTransitions = null;
  #createContext = null;
  #distanceScale = 1;
  #musicGraph = null;
  #loadMedia = null;
  #createMusicEngine = null;
  #providedMusicEngine = null;
  #applyRTPC = null;
  #releaseGameObj = null;
  #busRtpcs = null;
  #busStates = null;
  #busDucking = null;
  #busDuckingController = null;
  #providedUpdateContext = null;
  #adoptedEmitters = new Set();
  #adoptedCurveSetDrivers = new Set();

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
    busDucking
  } = {}) {
    this.#createContext = createContext ?? null;
    this.#loadBuffer = loadBuffer ?? null;
    this.#hasEventStops = typeof hasEventStops === "function" ? hasEventStops : null;
    this.#hasSfxEvent = typeof hasSfxEvent === "function" ? hasSfxEvent : null;
    this.#resolveSfxProgram = typeof resolveSfxProgram === "function" ? resolveSfxProgram : null;
    this.#continueSfxProgram = typeof continueSfxProgram === "function" ? continueSfxProgram : null;
    this.#prepareSfxProgram = typeof prepareSfxProgram === "function" ? prepareSfxProgram : null;
    this.#stateTransitions = stateTransitions ?? null;
    this.#distanceScale = Number(distanceScale) || 1;
    this.#musicGraph = musicGraph ?? null;
    this.#loadMedia = loadMedia ?? null;
    this.#providedMusicEngine = musicEngine ?? null;
    this.#createMusicEngine = typeof createMusicEngine === "function" ? createMusicEngine : null;
    this.#applyRTPC = typeof applyRTPC === "function" ? applyRTPC : null;
    this.#releaseGameObj = typeof releaseGameObj === "function" ? releaseGameObj : null;
    this.#busRtpcs = busRtpcs ?? null;
    this.#busStates = busStates ?? null;
    this.#busDucking = busDucking ?? null;
    this.#providedUpdateContext = updateContext ?? null;
    if (audioMetadata) {
      this.repository.Initialize(audioMetadata);
    }
  }

  /** Wires the three AudGameObjResource seams to this system. One system at a time. */
  Attach() {
    _AudGameObjResource.manager = this.manager;
    _AudGameObjResource.staticDataRepository = this.repository;
    _AudGameObjResource.backend = this.backend;
    this.#attached = true;
    return this;
  }

  /** Clears the seams (back to headless). */
  Detach() {
    if (this.#attached) {
      _AudGameObjResource.manager = null;
      _AudGameObjResource.staticDataRepository = null;
      _AudGameObjResource.backend = null;
      this.#attached = false;
    }
  }

  /**
   * Creates the WebAudio backend (browser-gesture time) and enables the engine.
   * Returns whether the engine actually enabled. Without a context the manager
   * stays a true null manager (Carbon Init-failure semantics): banks are never
   * tracked, posts return 0 and queue emitter-side for replay on a later
   * successful Enable's wake pass.
   */
  Enable(soundBanksToLoad = []) {
    if (!this.backend && this.#createContext) {
      const context = this.#createContext();
      if (context) {
        this.#busDuckingController = new CjsBusDuckingController(this.#busDucking);
        this.backend = new CjsAudioBackend({
          context,
          loadBuffer: this.#loadBuffer,
          isLoop: eventName => this.repository.EventIsLoop(eventName),
          hasEventStops: this.#hasEventStops,
          hasSfxEvent: this.#hasSfxEvent,
          resolveSfxProgram: this.#resolveSfxProgram,
          continueSfxProgram: this.#continueSfxProgram,
          prepareSfxProgram: this.#prepareSfxProgram,
          stateTransitions: this.#stateTransitions,
          distanceScale: this.#distanceScale,
          applyRTPC: this.#applyRTPC,
          busRtpcs: this.#busRtpcs,
          busStates: this.#busStates,
          busDuckingController: this.#busDuckingController
        });
        if (!this.musicEngine) {
          const destination = this.backend.masterGain ?? context.destination;
          if (this.#providedMusicEngine) {
            this.musicEngine = CjsAudioSystem.ValidateMusicEngine(this.#providedMusicEngine);
          } else if (this.#createMusicEngine) {
            this.musicEngine = CjsAudioSystem.ValidateMusicEngine(this.#createMusicEngine({
              context,
              destination,
              graph: this.#musicGraph,
              loadMedia: this.#loadMedia,
              busRtpcs: this.#busRtpcs,
              busStates: this.#busStates,
              busDuckingController: this.#busDuckingController,
              getGlobalRTPC: (name, at) => this.backend.GetGlobalRTPCValue(name, at),
              getGlobalRTPCTransitionBoundaries: from => this.backend.GetGlobalRTPCTransitionBoundaries(from),
              getGlobalStatePropertyWeights: (group, at) => this.backend.GetGlobalStatePropertyWeights(group, at),
              getGlobalStateTransitionBoundaries: from => this.backend.GetGlobalStateTransitionBoundaries(from)
            }));
          } else if (this.#musicGraph) {
            this.musicEngine = new CjsMusicEngine({
              graph: this.#musicGraph,
              context,
              loadMedia: this.#loadMedia,
              destination,
              busRtpcs: this.#busRtpcs,
              busStates: this.#busStates,
              busDuckingController: this.#busDuckingController,
              getGlobalRTPC: (name, at) => this.backend.GetGlobalRTPCValue(name, at),
              getGlobalRTPCTransitionBoundaries: from => this.backend.GetGlobalRTPCTransitionBoundaries(from),
              getGlobalStatePropertyWeights: (group, at) => this.backend.GetGlobalStatePropertyWeights(group, at),
              getGlobalStateTransitionBoundaries: from => this.backend.GetGlobalStateTransitionBoundaries(from)
            });
          }
        }
        this.backend.SetMusicEngine(this.musicEngine);
      }
    }
    if (this.#attached) {
      _AudGameObjResource.backend = this.backend;
    }
    for (const emitter of this.#adoptedEmitters) {
      this.#RecoverInitialEvent(emitter);
    }
    this.manager.Enable(soundBanksToLoad);
    if (this.manager.enabled) {
      for (const emitter of this.#adoptedEmitters) {
        emitter.RealizePlacement?.();
      }
      for (const driver of this.#adoptedCurveSetDrivers) {
        driver.Initialize();
      }
    }
    return this.manager.enabled;
  }

  /** Culls, clears banks, drops the engine to disabled. */
  Disable() {
    this.manager.Disable();
    this.backend?.StopAll();
  }

  /**
   * Per-frame drive: captures optional host timing, then culls, renders and
   * flushes. Carbon audio does not use host real/simulation time for playback.
   */
  Process(updateContext) {
    const source = updateContext === undefined ? this.#providedUpdateContext : updateContext;
    this.updateContext.Update(source);
    this.manager.Process();
    return this.updateContext;
  }

  /**
   * Replaces the optional music engine. Applications can inject an engine
   * backed by WebAudio buffers, HTMLMediaElement streaming, or another host
   * source as long as it implements the documented music-engine contract.
   */
  SetMusicEngine(engine, {
    disposePrevious = true
  } = {}) {
    const next = CjsAudioSystem.ValidateMusicEngine(engine);
    const previous = this.musicEngine;
    if (previous === next) {
      return next;
    }
    this.backend?.SetMusicEngine(null);
    if (disposePrevious) {
      previous?.Dispose?.();
    }
    this.musicEngine = next;
    this.#providedMusicEngine = next;
    this.backend?.SetMusicEngine(next);
    return next;
  }

  /** Posts an event directly to the injected/built-in music engine. */
  PostMusicEvent(eventName, onFinished) {
    return this.backend?.PostMusicEvent(eventName, onFinished) ?? 0;
  }

  /** Stops a directly posted or emitter-routed music event. */
  StopMusicEvent(playingID, fadeOutDuration = 1000) {
    return this.backend?.StopMusicEvent(playingID, fadeOutDuration) ?? false;
  }

  /** Releases one decoded source from the built-in music cache. */
  ReleaseMusicMedia(sourceId) {
    return this.musicEngine?.ReleaseMedia?.(sourceId) ?? false;
  }

  /** Releases all inactive decoded sources retained by the music engine. */
  ClearMusicMedia() {
    return this.musicEngine?.ClearMedia?.() ?? 0;
  }

  /** Creates and adopts one Carbon AudEmitter from a plain descriptor. */
  CreateEmitter(descriptor = {}) {
    const values = {
      ...descriptor
    };
    if (values.eventPrefix === undefined && values.prefix !== undefined) {
      values.eventPrefix = values.prefix;
    }
    if (values.scalingFactor === undefined && values.attenuationScalingFactor !== undefined) {
      values.scalingFactor = values.attenuationScalingFactor;
    }
    delete values.prefix;
    delete values.attenuationScalingFactor;
    return this.AdoptEmitter(_AudEmitter.from(values));
  }

  /**
   * Registers an emitter constructed before system attachment. Idempotent
   * for the same object and rejects a different object reusing its ID.
   */
  AdoptEmitter(emitter) {
    if (!(emitter instanceof _AudGameObjResource)) {
      throw new TypeError("CjsAudioSystem.AdoptEmitter requires an AudGameObjResource.");
    }
    const existing = this.manager.GetAudioEmitter(emitter.ID);
    if (existing && existing !== emitter) {
      throw new Error(`Audio game-object ID ${emitter.ID} is already registered.`);
    }
    if (!existing) {
      this.manager.RegisterGameObject(emitter.ID, emitter);
    }
    emitter.UpdateValues({
      skipEvents: true
    });
    this.#adoptedEmitters.add(emitter);
    if (this.manager.enabled) {
      this.#RecoverInitialEvent(emitter);
      emitter.Wake();
      emitter.RealizePlacement?.();
    }
    return emitter;
  }

  /** Recovers one persisted Initialize-time event lost before graph seams existed. */
  #RecoverInitialEvent(emitter) {
    if (!emitter.isUsed && emitter.eventName) {
      emitter.PostEvent(emitter.eventName);
    }
  }

  /** Registers a preconstructed audio curve-set driver. */
  AdoptCurveSetDriver(driver) {
    if (!(driver instanceof _AudioCurveSetDriver)) {
      throw new TypeError("CjsAudioSystem.AdoptCurveSetDriver requires an AudioCurveSetDriver.");
    }
    if (!this.#adoptedCurveSetDrivers.has(driver)) {
      driver.Initialize();
      this.#adoptedCurveSetDrivers.add(driver);
    }
    return driver;
  }

  /** Adopts every audio game object and curve driver reachable from a schema graph. */
  AdoptGraph(root) {
    const adopted = [];
    if (root instanceof _AudGameObjResource) {
      adopted.push(this.AdoptEmitter(root));
    } else if (root instanceof _AudioCurveSetDriver) {
      adopted.push(this.AdoptCurveSetDriver(root));
    } else {
      root?.Traverse?.(model => {
        if (model instanceof _AudGameObjResource) {
          adopted.push(this.AdoptEmitter(model));
        } else if (model instanceof _AudioCurveSetDriver) {
          adopted.push(this.AdoptCurveSetDriver(model));
        }
      });
    }
    return adopted;
  }

  /** Stops and unregisters an adopted emitter. */
  ReleaseEmitter(emitter) {
    if (!(emitter instanceof _AudGameObjResource) || !this.#adoptedEmitters.has(emitter) || this.manager.GetAudioEmitter(emitter.ID) !== emitter) {
      return false;
    }
    emitter.StopAll();
    emitter.UnregisterWwiseObject();
    this.backend?.ReleaseGameObj?.(emitter.ID);
    this.manager.RemoveCallbackGameObject(emitter.ID);
    this.manager.UnregisterGameObject(emitter.ID);
    this.#adoptedEmitters.delete(emitter);
    this.#releaseGameObj?.(emitter.ID);
    return true;
  }

  /** Releases one adopted audio curve-set driver's monitored watcher. */
  ReleaseCurveSetDriver(driver) {
    if (!(driver instanceof _AudioCurveSetDriver) || !this.#adoptedCurveSetDrivers.has(driver)) {
      return false;
    }
    driver.Dispose();
    this.#adoptedCurveSetDrivers.delete(driver);
    return true;
  }

  /** Releases every adopted audio game object and curve driver in a schema graph. */
  ReleaseGraph(root) {
    const released = [];
    if (root instanceof _AudGameObjResource) {
      if (this.ReleaseEmitter(root)) released.push(root);
    } else if (root instanceof _AudioCurveSetDriver) {
      if (this.ReleaseCurveSetDriver(root)) released.push(root);
    } else {
      root?.Traverse?.(model => {
        if (model instanceof _AudGameObjResource && this.ReleaseEmitter(model)) {
          released.push(model);
        } else if (model instanceof _AudioCurveSetDriver && this.ReleaseCurveSetDriver(model)) {
          released.push(model);
        }
      });
    }
    return released;
  }

  /** Stops music, releases its decoded cache, and detaches graph seams. */
  Dispose() {
    this.manager.Disable();
    for (const emitter of [...this.#adoptedEmitters]) {
      this.ReleaseEmitter(emitter);
    }
    for (const driver of [...this.#adoptedCurveSetDrivers]) {
      this.ReleaseCurveSetDriver(driver);
    }
    this.backend?.SetMusicEngine(null);
    this.musicEngine?.Dispose?.();
    this.musicEngine = null;
    this.#providedMusicEngine = null;
    this.backend?.Dispose?.();
    this.backend = null;
    this.#busDuckingController?.Dispose?.();
    this.#busDuckingController = null;
    this.Detach();
  }
}

export { CjsAudioSystem };
//# sourceMappingURL=CjsAudioSystem.js.map
