import { evaluateWwiseInterpolation } from './internal/wwiseCurve.js';

// CarbonEngineJS original (no Carbon counterpart). WebAudio realization of the
// AudGameObjResource.backend seam. Signal chain:
// source -> authored voice filters -> source gain -> emitter gain
// -> PannerNode(HRTF, inverse distance)
// -> master gain -> destination. Each playing source owns the source gain so
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
const DEFAULT_FADE_SECONDS = 1;
const DEFAULT_RENDER_QUANTUM_SECONDS = 128 / 48000;
const LINEAR_FADE_CURVE = 4;
const FADE_CURVE_SAMPLES = 65;
const WWISE_FILTER_CUTOFF_HZ = Object.freeze([20000, 19567, 19133, 18700, 18267, 17833, 17400, 16967, 16533, 16100, 15667, 15233, 14800, 14367, 13933, 13500, 13067, 12633, 12200, 11767, 11333, 10900, 10467, 10033, 9600, 9167, 8733, 8300, 7867, 7433, 7000, 6422, 5892, 5405, 4959, 4550, 4174, 3829, 3513, 3223, 2957, 2713, 2489, 2283, 2095, 1922, 1763, 1618, 1484, 1361, 1249, 1146, 1051, 964, 885, 812, 745, 683, 627, 575, 528, 484, 444, 407, 374, 343, 315, 289, 265, 243, 223, 204, 188, 172, 158, 145, 133, 122, 112, 103, 94, 86, 79, 73, 67, 61, 56, 51, 47, 43, 40, 36, 33, 31, 28, 26, 24, 22, 20, 18, 17]);

/** WebAudio backend for the audio graph: emitter nodes, playing sources, listener pose. */
class CjsAudioBackend {
  #context = null;
  #loadBuffer = null;
  #isLoop = null;
  #hasEventStops = null;
  #hasSfxEvent = null;
  #resolveSfxProgram = null;
  #continueSfxProgram = null;
  #masterGain = null;
  #sfxGain = null;
  #emitterNodes = new Map();
  #playing = new Map();
  #scheduledSfxStops = [];
  #globalRtpcValues = new Map();
  #globalStateValues = new Map();
  #objectRtpcValues = new Map();
  #objectSwitchValues = new Map();
  #applyRTPC = null;
  #nextPlayingID = 1;

  // Wwise-scale world units -> WebAudio panner units. EVE positions run to
  // thousands of meters; the inverse distance model with refDistance 1 makes
  // that inaudible. Scale is the app's acoustic choice.
  #distanceScale = 1;

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
    distanceScale,
    musicEngine,
    applyRTPC
  } = {}) {
    this.#context = context ?? null;
    this.#loadBuffer = loadBuffer ?? null;
    this.#isLoop = isLoop ?? (() => false);
    this.#hasEventStops = typeof hasEventStops === "function" ? hasEventStops : () => false;
    this.#hasSfxEvent = typeof hasSfxEvent === "function" ? hasSfxEvent : null;
    this.#resolveSfxProgram = typeof resolveSfxProgram === "function" ? resolveSfxProgram : null;
    this.#continueSfxProgram = typeof continueSfxProgram === "function" ? continueSfxProgram : null;
    this.#distanceScale = Number(distanceScale) || 1;
    this.#applyRTPC = typeof applyRTPC === "function" ? applyRTPC : null;
    if (this.#context) {
      this.#masterGain = this.#context.createGain();
      // Safety limiter: many concurrent one-shots (weapon volleys) sum
      // well past 0 dBFS and hard-clip audibly without it. Wwise
      // projects carry a master-bus limiter for the same reason.
      const limiter = this.#context.createDynamicsCompressor?.() ?? null;
      if (limiter) {
        limiter.threshold.value = -6;
        limiter.knee.value = 6;
        limiter.ratio.value = 12;
        limiter.attack.value = 0.003;
        limiter.release.value = 0.25;
        this.#masterGain.connect(limiter);
        limiter.connect(this.#context.destination);
      } else {
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
  get masterGain() {
    return this.#masterGain;
  }

  /** Returns the effect-only bus feeding the master output. */
  get sfxGain() {
    return this.#sfxGain;
  }

  /** Effect-bus volume (0..1); music is unaffected. */
  SetSfxVolume(value) {
    SetAudioParam(this.#sfxGain?.gain, Math.max(0, Math.min(1, Number(value) || 0)), this.#context);
  }

  /** Returns the currently attached built-in or application music engine. */
  get musicEngine() {
    return this.#musicEngine;
  }

  /** Late attachment: the engine needs the master gain, which needs the context. */
  set musicEngine(engine) {
    this.SetMusicEngine(engine);
  }

  /**
   * Replaces the music engine without leaving voices owned by the previous
   * engine in backend bookkeeping. Disposal remains the composition root's
   * responsibility so an injected engine can choose its own lifecycle.
   */
  SetMusicEngine(engine) {
    const next = engine ?? null;
    if (next === this.#musicEngine) {
      return;
    }
    const previous = this.#musicEngine;
    for (const [playingID, record] of [...this.#playing]) {
      if (record.music && record.musicEngine === previous) {
        previous?.ExecuteAction?.("stop", playingID, 0);
        this.#FinishMusicPlaying(playingID);
      }
    }
    this.#musicEngine = next;
  }

  /** Engine init (Carbon's InitLowLevel/InitSound collapse into context supply). */
  Init() {
    return !!this.#context;
  }

  /** Registers an emitter's node chain (gain -> panner -> [analyser] -> master). */
  RegisterGameObj(gameObjID) {
    if (!this.#context || this.#emitterNodes.has(gameObjID)) {
      return;
    }
    const panner = this.#context.createPanner();
    panner.panningModel = "HRTF";
    panner.distanceModel = "inverse";
    const gain = this.#context.createGain();
    gain.connect(panner);
    // Optional per-emitter level tap (post-panner, so it reflects what is
    // actually heard incl. distance attenuation). Absent on minimal fake
    // contexts - metering then reports 0.
    const analyser = this.#context.createAnalyser?.() ?? null;
    if (analyser) {
      analyser.fftSize = 256;
      panner.connect(analyser);
      analyser.connect(this.#sfxGain);
    } else {
      panner.connect(this.#sfxGain);
    }
    this.#emitterNodes.set(gameObjID, {
      gain,
      flatGain: null,
      panner,
      analyser,
      scalingFactor: 1
    });
  }

  /**
   * Logically unregisters an emitter while allowing already-posted sounds to
   * finish on their retired node generation, matching Wwise.
   */
  UnregisterGameObj(gameObjID) {
    const nodes = this.#emitterNodes.get(gameObjID);
    if (nodes) {
      nodes.retiredRtpcValues = new Map(this.#objectRtpcValues.get(gameObjID) ?? []);
      this.#emitterNodes.delete(gameObjID);
      this.#ReleaseRetiredEmitterNodes(gameObjID, nodes);
    }
    this.#objectRtpcValues.delete(gameObjID);
    this.#objectSwitchValues.delete(gameObjID);
  }

  /** Permanently releases an emitter and every loaded or pending sound it owns. */
  ReleaseGameObj(gameObjID) {
    for (const [playingID, record] of [...this.#playing]) {
      if (record.gameObjID !== gameObjID) {
        continue;
      }
      record.stopped = true;
      if (record.music) {
        record.musicEngine?.ExecuteAction?.("stop", playingID, 0);
      }
      for (const voice of record.voices ?? []) {
        if (voice.source) {
          voice.source.onended = null;
          voice.source.stop?.(this.#context.currentTime);
        }
      }
      this.#FinishPlaying(playingID);
    }
    const nodes = this.#emitterNodes.get(gameObjID);
    if (nodes) {
      this.#emitterNodes.delete(gameObjID);
      this.#DisconnectEmitterNodes(nodes);
    }
    this.#objectRtpcValues.delete(gameObjID);
    this.#objectSwitchValues.delete(gameObjID);
  }

  /** Returns whether an installed authored program owns Stop execution. */
  HandlesEventStops(eventName) {
    return this.#hasEventStops(String(eventName)) === true;
  }

  /** Starts an event: allocates the playing id synchronously, starts when the media resolves. */
  PostEvent(eventID, gameObjID, additionalFlags, emitter, eventName) {
    const music = this.#musicEngine?.HandlesEvent(eventName) === true;
    const sfx = this.#hasSfxEvent ? this.#hasSfxEvent(String(eventName)) === true : true;
    if (music && !sfx) {
      return this.#PostMusicEvent(eventName, {
        gameObjID,
        emitter
      });
    }
    if (!sfx) {
      return 0;
    }
    const nodes = this.#emitterNodes.get(gameObjID);
    if (!this.#context || !this.#loadBuffer || !nodes) {
      return 0;
    }
    const playingID = this.#nextPlayingID++;
    const controller = new AbortController();
    const record = {
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
      pendingProgramStops: 0,
      planningProgram: false,
      loading: false,
      posting: true,
      sfxControls: null
    };
    this.#playing.set(playingID, record);
    if (music) {
      this.#StartMusicComponent(playingID, record);
    }
    const controls = this.#CreateSfxControls(gameObjID, controller.signal, playingID, record);
    record.sfxControls = controls;
    let resolvedProgram = null;
    try {
      if (this.#resolveSfxProgram) {
        resolvedProgram = this.#resolveSfxProgram(eventID, eventName, controls);
        if (resolvedProgram !== null && resolvedProgram !== undefined) {
          this.#InstallSfxProgram(playingID, record, resolvedProgram);
        }
      }
    } catch {
      record.loading = false;
      record.posting = false;
      Promise.resolve().then(() => this.#FinishSfxPlaying(playingID));
      return playingID;
    }
    record.posting = false;
    Promise.resolve().then(() => {
      this.#MaybeFinishSfxProgram(playingID, record);
      if (record.stopped || record.sfxFinished || !this.#playing.has(playingID)) {
        return null;
      }
      record.loading = true;
      return this.#loadBuffer(eventID, eventName, controls, resolvedProgram);
    }).then(result => {
      record.loading = false;
      // Rendering may have paused while media was pending. Apply every
      // now-overdue Stop before a cancelled slot can become a voice.
      this.#ProcessScheduledSfxStops();
      if (!result || record.stopped || !this.#playing.has(playingID)) {
        this.#FinishSfxPlaying(playingID);
        return;
      }
      const descriptors = NormalizeVoiceDescriptors(result, () => !!this.#isLoop(record.eventName));
      const realizedSlots = new Set();
      for (const descriptor of descriptors) {
        const slot = record.sfxProgram ? record.programSlots?.get(descriptor.programSlotId) : null;
        if (record.sfxProgram && (!slot || slot.state !== "pending" && !(slot.continuation && slot.state === "voice"))) {
          continue;
        }
        if (slot?.cancelledSelectionKeys?.has(ProgramSelectionKey(descriptor))) {
          continue;
        }
        const selectionMetadata = slot?.selections?.find(selection => ProgramSelectionKey(selection) === ProgramSelectionKey(descriptor));
        const voice = this.#CreateVoice(selectionMetadata ? {
          ...descriptor,
          actionIndex: selectionMetadata.actionIndex,
          leafIndex: selectionMetadata.leafIndex,
          matchIds: selectionMetadata.matchIds
        } : descriptor, nodes, record.gameObjID);
        record.voices.push(voice);
        if (slot) {
          slot.state = "voice";
          slot.voice = voice;
          slot.voices.add(voice);
          voice.programSlotId = slot.id;
          realizedSlots.add(slot.id);
        }
      }
      record.loaded = true;
      if (record.sfxProgram) {
        for (const slot of record.programSlots.values()) {
          if (slot.state !== "pending" || realizedSlots.has(slot.id)) {
            continue;
          }
          if (slot.continuation) {
            this.#AdvanceSfxProgramSlot(playingID, record, slot, Number(this.#context.currentTime) || 0);
          } else {
            slot.state = "ended";
          }
        }
      }
      if (!record.voices.length) {
        if (record.sfxProgram) {
          this.#MaybeFinishSfxProgram(playingID, record);
        } else {
          this.#FinishSfxPlaying(playingID);
        }
        return;
      }
      this.#StartVoices(playingID, record);
    }).catch(() => {
      record.loading = false;
      this.#FinishSfxPlaying(playingID);
    });
    return playingID;
  }

  /**
   * Direct host-facing music route. This intentionally bypasses Carbon's
   * event catalog so injected music engines can own arbitrary event names.
   */
  PostMusicEvent(eventName, onFinished) {
    if (!this.#musicEngine?.HandlesEvent?.(eventName)) {
      return 0;
    }
    return this.#PostMusicEvent(eventName, {
      gameObjID: 3,
      emitter: null,
      onFinished: typeof onFinished === "function" ? onFinished : null
    });
  }

  /** Stops a direct or emitter-routed music event. */
  StopMusicEvent(playingID, fadeOutDuration = 1000) {
    const record = this.#playing.get(playingID);
    if (!record?.music) {
      return false;
    }
    this.ExecuteActionOnPlayingID("stop", playingID, fadeOutDuration);
    return true;
  }

  /** Stop ("stop") fades then halts; break ("break") lets non-loops finish, halts loops at the fade. */
  ExecuteActionOnPlayingID(action, playingID, fadeOutDuration = 1000) {
    const record = this.#playing.get(playingID);
    if (!record) {
      return;
    }
    if (record.music) {
      record.musicEngine?.ExecuteAction?.(action, playingID, fadeOutDuration);
      if (!record.sfx) {
        return;
      }
    }
    if (action === "break") {
      this.#BreakContinuousSlots(record);
    }
    if (action === "break" && !record.loaded) {
      // Authored SFX leaves may override the event-level loop flag.
      // Keep the pending record until its descriptors resolve, then
      // discard only looping leaves and let one-shots play out.
      record.pendingBreak = true;
      return;
    }
    const breaking = action === "break";
    if (!breaking) {
      record.stopped = true;
      for (const slot of record.programSlots?.values?.() ?? []) {
        if (!slot.continuation) {
          continue;
        }
        slot.continuation = null;
        slot.broken = true;
        slot.generation++;
        AbortProgramSlot(slot);
        if (slot.state === "pending" || slot.state === "loading") {
          slot.state = "cancelled";
        }
      }
      record.pendingProgramStops = 0;
      this.#scheduledSfxStops = this.#scheduledSfxStops.filter(stop => stop.ownerPlayingID !== playingID);
    }
    const active = record.voices?.filter(voice => voice.source && !voice.ended && (!breaking || !this.#IsContinuousProgramVoice(record, voice) && (voice.loop || voice.playCount > 1))) ?? [];
    if (active.length) {
      // An explicit 0 means an immediate stop; only a missing/invalid
      // duration falls back to the default fade.
      const ms = Number(fadeOutDuration);
      const seconds = Number.isFinite(ms) ? Math.max(0, ms) / 1000 : DEFAULT_FADE_SECONDS;
      const actionTime = this.#context.currentTime;
      for (const voice of active) {
        if (breaking && !voice.loop && voice.playCount > 1) {
          voice.stopping = true;
          const duration = Number(voice.buffer?.duration);
          const rate = voice.playbackRate;
          if (Number.isFinite(duration) && duration > 0 && Number.isFinite(rate) && rate > 0) {
            const now = actionTime;
            const elapsed = voice.offsetSeconds + Math.max(0, now - voice.positionAnchorContextTime) * rate;
            const position = elapsed % duration;
            const remaining = position === 0 && elapsed > 0 ? duration : duration - position;
            const boundaryBase = Math.max(now, voice.startContextTime);
            const boundary = boundaryBase + remaining / rate;
            const stopAt = voice.scheduledEndContextTime === null ? boundary : Math.max(now, Math.min(boundary, voice.scheduledEndContextTime));
            voice.source.stop(stopAt);
            continue;
          }
        }
        voice.stopping = true;
        if (voice.startContextTime > actionTime) {
          SetAudioParam(voice.stopGain.gain, 0, this.#context);
          voice.source.stop(actionTime);
          continue;
        }
        this.#HoldVoiceFade(voice, actionTime);
        if (seconds > 0) {
          const param = voice.stopGain.gain;
          const now = actionTime;
          if (typeof param?.cancelAndHoldAtTime === "function") {
            param.cancelAndHoldAtTime(now);
          } else {
            param?.cancelScheduledValues?.(now);
            param?.setValueAtTime?.(param.value, now);
          }
          param?.linearRampToValueAtTime?.(0, now + seconds);
        } else {
          SetAudioParam(voice.stopGain.gain, 0, this.#context);
        }
        const fadeStopTime = actionTime + seconds;
        const sourceStopTime = voice.scheduledEndContextTime === null ? fadeStopTime : Math.max(actionTime, Math.min(fadeStopTime, voice.scheduledEndContextTime));
        voice.source.stop(sourceStopTime);
      }
    } else if (!breaking) {
      this.#FinishSfxPlaying(playingID);
    }
    if (breaking) {
      this.#MaybeFinishSfxProgram(playingID, record);
    }
  }

  /** Emitter placement -> panner. WebAudio is right-handed like Carbon's scene; Wwise's RH->LH flip does not apply. */
  SetPosition(gameObjID, front, top, position) {
    const panner = this.#emitterNodes.get(gameObjID)?.panner;
    if (panner) {
      SetAudioParam(panner.positionX, position[0] * this.#distanceScale, this.#context);
      SetAudioParam(panner.positionY, position[1] * this.#distanceScale, this.#context);
      SetAudioParam(panner.positionZ, position[2] * this.#distanceScale, this.#context);
      if (panner.orientationX) {
        SetAudioParam(panner.orientationX, front[0], this.#context);
        SetAudioParam(panner.orientationY, front[1], this.#context);
        SetAudioParam(panner.orientationZ, front[2], this.#context);
      } else {
        panner.setOrientation?.(front[0], front[1], front[2]);
      }
    }
  }

  /** Current source play position in milliseconds; -1 when invalid or finished. */
  GetSourcePlayPosition(playingID) {
    const record = this.#playing.get(playingID);
    if (!record || record.stopped) {
      return -1;
    }
    if (record.music && !record.sfx) {
      return record.musicEngine?.GetSourcePlayPosition?.(playingID) ?? -1;
    }
    const voice = record.voices?.find(value => value.source && !value.ended);
    if (!voice || voice.startContextTime === null) {
      return 0;
    }
    let seconds = voice.offsetSeconds + Math.max(0, this.#context.currentTime - voice.positionAnchorContextTime) * voice.playbackRate;
    const duration = Number(voice.buffer?.duration);
    if (Number.isFinite(duration) && duration > 0) {
      seconds = voice.source.loop ? seconds % duration : Math.min(seconds, duration);
    }
    return Math.max(0, Math.round(seconds * 1000));
  }

  /** Seeks one playing source by normalized duration. */
  SeekOnEventPercent(playingID, percentToSeek) {
    const value = Number(percentToSeek);
    if (!Number.isFinite(value) || value < 0) {
      return false;
    }
    return this.#Seek(playingID, {
      kind: "percent",
      value
    });
  }

  /** Seeks one playing source by elapsed milliseconds. */
  SeekOnEventMs(playingID, msToSeek) {
    const value = Number(msToSeek);
    if (!Number.isFinite(value) || value < 0) {
      return false;
    }
    return this.#Seek(playingID, {
      kind: "ms",
      value
    });
  }

  /** Listener pose -> context.listener. */
  SetListenerPosition(gameObjID, front, top, position) {
    const listener = this.#context?.listener;
    if (listener) {
      SetAudioParam(listener.positionX, position[0] * this.#distanceScale, this.#context);
      SetAudioParam(listener.positionY, position[1] * this.#distanceScale, this.#context);
      SetAudioParam(listener.positionZ, position[2] * this.#distanceScale, this.#context);
      SetAudioParam(listener.forwardX, front[0], this.#context);
      SetAudioParam(listener.forwardY, front[1], this.#context);
      SetAudioParam(listener.forwardZ, front[2], this.#context);
      SetAudioParam(listener.upX, top[0], this.#context);
      SetAudioParam(listener.upY, top[1], this.#context);
      SetAudioParam(listener.upZ, top[2], this.#context);
    }
  }

  /** Attenuation scaling -> panner distance scaling. */
  SetScalingFactor(gameObjID, value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return false;
    }
    const nodes = this.#emitterNodes.get(gameObjID);
    if (!nodes) {
      return false;
    }
    nodes.scalingFactor = numeric;
    if (nodes.panner.refDistance !== undefined) {
      nodes.panner.refDistance = numeric;
    }
    return true;
  }

  /**
   * Per-object RTPC store. Installed SFX gain curves update active voices;
   * applications may also inject applyRTPC for project-specific mappings
   * that are outside the portable SFX graph.
   */
  SetRTPCValue(rtpcName, value, gameObjID) {
    const name = String(rtpcName);
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return false;
    }
    let values = this.#objectRtpcValues.get(gameObjID);
    if (!values) {
      values = new Map();
      this.#objectRtpcValues.set(gameObjID, values);
    }
    values.set(name, numeric);
    this.#RefreshSfxControls(gameObjID);
    const nodes = this.#emitterNodes.get(gameObjID) ?? null;
    this.#applyRTPC?.({
      gameObjID,
      rtpcName: name,
      value: numeric,
      context: this.#context,
      gain: nodes?.gain?.gain ?? null,
      flatGain: nodes?.flatGain?.gain ?? null,
      panner: nodes?.panner ?? null
    });
    return true;
  }

  /** Per-object RTPC query for adapters, diagnostics, and tests. */
  GetRTPCValue(rtpcName, gameObjID) {
    return this.#objectRtpcValues.get(gameObjID)?.get(String(rtpcName));
  }

  /**
   * Per-object switch store. Only the fixed music object steers the built-in
   * global music tree; ordinary scene emitters remain isolated.
   */
  SetSwitch(switchGroup, switchState, gameObjID) {
    const group = String(switchGroup);
    const state = String(switchState);
    let values = this.#objectSwitchValues.get(gameObjID);
    if (!values) {
      values = new Map();
      this.#objectSwitchValues.set(gameObjID, values);
    }
    values.set(group, state);
    if (gameObjID === 3) {
      this.#musicEngine?.SetSwitch?.(group, state, gameObjID);
    }
  }

  /** Per-object switch query for adapters, diagnostics, and tests. */
  GetSwitchValue(switchGroup, gameObjID) {
    return this.#objectSwitchValues.get(gameObjID)?.get(String(switchGroup));
  }

  /**
   * Global RTPC store (feeds GetGlobalRTPCValue / monitored parameters).
   * Carbon's volume control groups are RTPCs (menu_main_master_level,
   * menu_main_music_level, ... - all 0..1 user settings); the known volume
   * levels are applied audibly to the matching bus. Category levels
   * (menu_advanced_*) are stored but not yet mapped.
   */
  SetGlobalRTPCValue(rtpcName, value) {
    const name = String(rtpcName);
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return false;
    }
    this.#globalRtpcValues.set(name, numeric);
    this.#RefreshSfxControls();
    if (name === "menu_main_master_level") {
      SetAudioParam(this.#masterGain?.gain, Math.max(0, Math.min(1, numeric || 0)), this.#context);
    } else if (name === "menu_main_music_level") {
      this.#musicEngine?.SetMusicVolume(numeric);
    }
    return true;
  }

  /** Global state group - feeds authored SFX and music tree arguments. */
  SetGlobalState(stateGroup, stateName) {
    this.#globalStateValues.set(String(stateGroup), String(stateName));
    this.#RefreshSfxControls();
    this.#musicEngine?.SetState(stateGroup, stateName);
  }

  /** Global state query for authored SFX selection. */
  GetGlobalState(stateGroup) {
    return this.#globalStateValues.get(String(stateGroup));
  }

  /** Monitored-parameter query source. */
  GetGlobalRTPCValue(rtpcName) {
    return this.#globalRtpcValues.get(String(rtpcName));
  }

  /** Banks are virtual on the catalog route: media resolves per event, so loads complete immediately. */
  LoadBank(name, callback) {
    callback?.(true);
  }

  /** Virtual unload. */
  UnloadBank(name, callback) {
    callback?.();
  }

  /** Virtual clear. */
  ClearBanks() {}

  /** WebAudio renders continuously; the tick drives music-engine lookahead scheduling. */
  RenderAudio() {
    this.#ProcessScheduledSfxStops();
    this.#musicEngine?.Process();
  }

  /** Active playing ids (introspection/tests). */
  GetPlayingCount() {
    return this.#playing.size;
  }

  /** Stops every backend-owned event, including direct music posts. */
  StopAll() {
    for (const [playingID, record] of [...this.#playing]) {
      record.stopped = true;
      if (record.music) {
        record.musicEngine?.ExecuteAction?.("stop", playingID, 0);
      }
      if (record.sfx) {
        for (const voice of record.voices ?? []) {
          if (voice.source) {
            voice.source.onended = null;
            try {
              voice.source.stop?.(this.#context.currentTime);
            } catch {
              // already stopped
            }
          }
        }
      }
      if (this.#playing.has(playingID)) {
        this.#FinishPlaying(playingID);
      }
    }
  }

  /** Prevents another Continuous batch while the current object loops out. */
  #BreakContinuousSlots(record) {
    const now = Number(this.#context.currentTime) || 0;
    for (const slot of record.programSlots?.values?.() ?? []) {
      if (!slot.continuation) {
        continue;
      }
      slot.broken = true;
      if (slot.state === "loading") {
        slot.generation++;
        AbortProgramSlot(slot);
        slot.state = "ended";
      }
      for (const voice of slot.voices) {
        if (!voice.ended && slot.generation > 0 && voice.startContextTime > now) {
          voice.ended = true;
          voice.stopping = true;
          if (voice.source) {
            voice.source.onended = null;
            try {
              voice.source.stop(now);
            } catch {
              // already stopped
            }
            voice.source.disconnect?.();
          }
          continue;
        }
        if (!voice.ended && voice.loop) {
          voice.loop = false;
          if (voice.source) {
            voice.source.loop = false;
          }
        }
      }
      const active = [...slot.voices].filter(voice => !voice.ended);
      slot.voice = active[0] ?? null;
      if (slot.state === "voice" && !active.length) {
        slot.state = "ended";
      }
    }
  }

  /** Returns whether a physical voice belongs to a Continuous batch slot. */
  #IsContinuousProgramVoice(record, voice) {
    return Boolean(voice.programSlotId !== undefined && record.programSlots?.get(voice.programSlotId)?.continuation);
  }

  /**
   * Stops owned voices and disconnects WebAudio nodes. The AudioContext is
   * host-owned and is deliberately not closed here.
   */
  Dispose() {
    this.StopAll();
    this.SetMusicEngine(null);
    for (const gameObjID of [...this.#emitterNodes.keys()]) {
      this.UnregisterGameObj(gameObjID);
    }
    this.#objectRtpcValues.clear();
    this.#objectSwitchValues.clear();
    this.#globalRtpcValues.clear();
    this.#globalStateValues.clear();
    this.#sfxGain?.disconnect?.();
    this.#masterGain?.disconnect?.();
    this.#sfxGain = null;
    this.#masterGain = null;
  }

  /**
   * Current output level (RMS, 0..~0.7) of one emitter's post-panner signal.
   * 0 when the context has no analyser support or the emitter is unknown.
   */
  GetGameObjLevel(gameObjID) {
    const analyser = this.#emitterNodes.get(gameObjID)?.analyser;
    if (!analyser?.getFloatTimeDomainData) {
      return 0;
    }
    const samples = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(samples);
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += samples[i] * samples[i];
    }
    return Math.sqrt(sum / samples.length);
  }

  /** Allocates and posts one event owned by the active music engine. */
  #PostMusicEvent(eventName, {
    gameObjID = 3,
    emitter = null,
    onFinished = null
  } = {}) {
    const musicEngine = this.#musicEngine;
    if (!musicEngine?.HandlesEvent?.(eventName)) {
      return 0;
    }
    const playingID = this.#nextPlayingID++;
    const record = {
      gameObjID,
      emitter,
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
  #StartMusicComponent(playingID, record) {
    let posting = true;
    let finished = false;
    const complete = () => {
      if (posting) {
        finished = true;
        return;
      }
      this.#FinishMusicPlaying(playingID);
    };
    try {
      record.musicEngine.PostEvent(record.eventName, playingID, complete);
    } catch {
      finished = true;
    } finally {
      posting = false;
    }
    if (finished) {
      Promise.resolve().then(() => this.#FinishMusicPlaying(playingID));
    }
  }

  /** Applies or defers a millisecond/percentage seek for one playing id. */
  #Seek(playingID, seek) {
    const record = this.#playing.get(playingID);
    if (!record || record.stopped) {
      return false;
    }
    let handled = false;
    if (record.music) {
      const method = seek.kind === "percent" ? "SeekOnEventPercent" : "SeekOnEventMs";
      handled = record.musicEngine?.[method]?.(playingID, seek.value) === true;
      if (!record.sfx) {
        return handled;
      }
    }
    if (record.loaded) {
      const now = Number(this.#context.currentTime) || 0;
      const renderQuantum = RenderQuantumSeconds(this.#context);
      const started = record.voices.filter(voice => voice.source && !voice.ended && voice.startContextTime <= now + renderQuantum);
      if (!started.length) {
        return handled;
      }
      record.pendingSeek = seek;
      this.#StartVoices(playingID, record, started);
      return true;
    }
    record.pendingSeek = seek;
    return true;
  }

  /** Installs one synchronously resolved authored SFX program. */
  #InstallSfxProgram(playingID, record, program) {
    if (!record || this.#playing.get(playingID) !== record || !Array.isArray(program)) {
      throw new TypeError("Resolved SFX program is invalid");
    }
    if (record.sfxProgram) {
      throw new Error("Resolved SFX program was installed twice");
    }
    record.sfxProgram = true;
    record.programSlots = new Map();
    record.planningProgram = true;
    try {
      for (const operation of program) {
        if (operation.kind === "play") {
          const continuations = new Map();
          for (const continuation of operation.continuations ?? []) {
            const id = String(continuation.programSlotId ?? "");
            if (!id || continuations.has(id) || record.programSlots.has(id)) {
              throw new Error(`Invalid SFX continuation slot ${id}`);
            }
            const selections = operation.selections?.filter(selection => selection.programSlotId === id) ?? [];
            const selectionMetadata = selections.map(selection => CreateProgramSelectionMetadata(selection, record.postContextTime));
            const leafIndex = selections.length ? Math.min(...selections.map(selection => Number(selection.leafIndex))) : 0;
            const matchIds = Object.freeze([...new Set(selections.flatMap(selection => (selection.matchIds ?? []).map(String)))]);
            const slot = {
              id,
              playingID,
              actionIndex: Number(operation.actionIndex),
              leafIndex,
              actionTime: selectionMetadata.length ? Math.min(...selectionMetadata.map(selection => selection.actionTime)) : record.postContextTime,
              matchIds,
              selections: Object.freeze(selectionMetadata),
              cancelledSelectionKeys: new Set(),
              selectionControllers: CreateProgramSelectionControllers(selectionMetadata),
              state: "pending",
              voice: null,
              voices: new Set(),
              controller: new AbortController(),
              continuation: continuation.token,
              transitionDelayMs: Math.max(0, Number(continuation.delayMs) || 0),
              generation: 0,
              broken: false
            };
            continuations.set(id, slot);
            record.programSlots.set(id, slot);
          }
          for (const selection of operation.selections ?? []) {
            const actionIndex = Number(selection.actionIndex ?? operation.actionIndex);
            const leafIndex = Number(selection.leafIndex);
            const selectionMetadata = CreateProgramSelectionMetadata(selection, record.postContextTime);
            const id = selection.programSlotId ?? `${actionIndex}:${leafIndex}`;
            const existing = record.programSlots.get(id);
            if (existing) {
              if (!continuations.has(id)) {
                throw new Error(`Duplicate SFX program slot ${id}`);
              }
              existing.matchIds = Object.freeze([...new Set([...existing.matchIds, ...(selection.matchIds ?? []).map(String)])]);
              continue;
            }
            record.programSlots.set(id, {
              id,
              playingID,
              actionIndex,
              leafIndex,
              actionTime: selectionMetadata.actionTime,
              matchIds: Object.freeze((selection.matchIds ?? []).map(String)),
              selections: Object.freeze([selectionMetadata]),
              cancelledSelectionKeys: new Set(),
              selectionControllers: CreateProgramSelectionControllers([selectionMetadata]),
              state: "pending",
              voice: null,
              voices: new Set(),
              controller: new AbortController(),
              continuation: null,
              transitionDelayMs: 0,
              generation: 0,
              broken: false
            });
          }
          continue;
        }
        if (operation.kind !== "stop") {
          throw new TypeError(`Unsupported resolved SFX operation ${operation.kind}`);
        }
        const stop = {
          ...operation,
          ownerPlayingID: playingID,
          gameObjID: record.gameObjID,
          actionTime: record.postContextTime + Math.max(0, Number(operation.delayMs) || 0) / 1000
        };
        const now = Number(this.#context.currentTime) || 0;
        if (stop.actionTime <= now) {
          this.#ApplySfxStop(stop, now);
        } else {
          record.pendingProgramStops++;
          this.#scheduledSfxStops.push(stop);
        }
      }
      this.#scheduledSfxStops.sort(CompareStopActions);
    } finally {
      record.planningProgram = false;
    }
    this.#MaybeFinishSfxProgram(playingID, record);
  }

  /** Executes every authored Stop whose absolute action time has arrived. */
  #ProcessScheduledSfxStops() {
    const now = Number(this.#context?.currentTime) || 0;
    while (this.#scheduledSfxStops.length && this.#scheduledSfxStops[0].actionTime <= now) {
      const stop = this.#scheduledSfxStops.shift();
      const owner = this.#playing.get(stop.ownerPlayingID);
      if (!owner || owner.stopped) {
        continue;
      }
      owner.pendingProgramStops = Math.max(0, owner.pendingProgramStops - 1);
      this.#ApplySfxStop(stop, now);
      this.#MaybeFinishSfxProgram(stop.ownerPlayingID, owner);
    }
  }

  /** Applies one due Stop to eligible pending slots and live SFX voices. */
  #ApplySfxStop(stop, now) {
    const actionTime = Math.max(Number(stop.actionTime) || 0, Number(now) || 0);
    for (const [playingID, record] of this.#playing) {
      if (!record.sfx || stop.scope === "game-object" && record.gameObjID !== stop.gameObjID) {
        continue;
      }
      if (!record.sfxProgram) {
        if ((stop.mode === "all" || stop.mode === "all-except") && stop.exceptions.length === 0 && CompareFallbackOrder(record, playingID, stop) <= 0) {
          this.#StopFallbackRecord(playingID, record, stop, now);
        }
        continue;
      }
      for (const slot of record.programSlots.values()) {
        if (slot.state !== "pending" && slot.state !== "loading" && slot.state !== "voice") {
          continue;
        }
        const selections = slot.selections ?? [];
        const matchingSelections = selections.filter(selection => CompareProgramOrder(selection, slot, stop) <= 0 && StopMatchesProgramValue(stop, selection));
        if (!matchingSelections.length) {
          continue;
        }
        const stopsWholeSlot = matchingSelections.length === selections.length;
        for (const selection of matchingSelections) {
          const key = ProgramSelectionKey(selection);
          slot.cancelledSelectionKeys?.add(key);
          slot.selectionControllers?.get(key)?.abort();
        }
        if (slot.state === "pending" || slot.state === "loading") {
          if (stopsWholeSlot) {
            slot.continuation = null;
            slot.broken = true;
            slot.generation++;
            slot.state = "cancelled";
            AbortProgramSlot(slot);
          }
          continue;
        }
        const matchingSelectionKeys = new Set(matchingSelections.map(ProgramSelectionKey));
        for (const voice of slot.voices) {
          if (!voice.ended && matchingSelectionKeys.has(ProgramSelectionKey(voice))) {
            this.#StopSfxProgramVoice(voice, stop.actionTime, stop.transitionMs, stop.curve, actionTime);
          }
        }
        if (stopsWholeSlot) {
          slot.continuation = null;
          slot.broken = true;
          slot.generation++;
          AbortProgramSlot(slot);
        }
      }
      this.#MaybeFinishSfxProgram(playingID, record);
    }
  }

  /** Applies one authored fade/stop without changing live RTPC controls. */
  #StopSfxProgramVoice(voice, actionTime, transitionMs, curve, now = actionTime) {
    if (!voice.source) {
      return;
    }
    const authoredActionTime = Number(actionTime) || 0;
    const currentTime = Math.max(authoredActionTime, Number(now) || 0);
    const seconds = Math.max(0, Number(transitionMs) || 0) / 1000;
    const authoredStopTime = authoredActionTime + seconds;
    const fadeStopTime = voice.startContextTime > authoredActionTime || authoredStopTime <= currentTime ? currentTime : authoredStopTime;
    const sourceStopTime = voice.scheduledEndContextTime === null ? fadeStopTime : Math.max(currentTime, Math.min(fadeStopTime, voice.scheduledEndContextTime));
    if (voice.stopping && Number.isFinite(voice.stopContextTime) && voice.stopContextTime <= sourceStopTime) {
      return;
    }
    voice.stopping = true;
    voice.stopContextTime = sourceStopTime;
    if (voice.startContextTime > authoredActionTime || authoredStopTime <= currentTime) {
      SilenceAudioParamAt(voice.stopGain.gain, currentTime, this.#context);
      voice.source.stop(currentTime);
      return;
    }
    this.#HoldVoiceFade(voice, currentTime);
    const param = voice.stopGain.gain;
    const progress = seconds > 0 ? Math.max(0, Math.min(1, (currentTime - authoredActionTime) / seconds)) : 1;
    const remaining = Math.max(0, fadeStopTime - currentTime);
    if (remaining > 0) {
      if (typeof param?.cancelAndHoldAtTime === "function") {
        param.cancelAndHoldAtTime(currentTime);
      } else {
        param?.cancelScheduledValues?.(currentTime);
      }
      ScheduleWwiseFade(param, Number(param?.value) || 0, 0, currentTime, remaining, Number(curve ?? LINEAR_FADE_CURVE), progress);
    } else {
      SetAudioParam(param, 0, this.#context);
    }
    voice.source.stop(sourceStopTime);
  }

  /** Applies a hierarchy-free Stop-All to one flat eventMedia record. */
  #StopFallbackRecord(playingID, record, stop, now) {
    if (!record.loaded) {
      this.#FinishSfxPlaying(playingID);
      return;
    }
    for (const voice of record.voices ?? []) {
      if (!voice.ended) {
        this.#StopSfxProgramVoice(voice, stop.actionTime, stop.transitionMs, stop.curve, now);
      }
    }
  }

  /** Closes a program record only after slots and delayed actions settle. */
  #MaybeFinishSfxProgram(playingID, record) {
    if (!record?.sfxProgram || record.posting || record.planningProgram || record.pendingProgramStops > 0) {
      return;
    }
    const settled = [...record.programSlots.values()].every(slot => slot.state === "cancelled" || slot.state === "ended");
    if (settled) {
      this.#FinishSfxPlaying(playingID);
    }
  }

  /** Creates live control readers for one emitter's authored SFX post. */
  #CreateSfxControls(gameObjID, signal = null, playingID = 0, record = null) {
    return Object.freeze({
      gameObjID,
      signal,
      installSfxProgram: program => this.#InstallSfxProgram(playingID, record, program),
      getSwitch: group => this.GetSwitchValue(group, gameObjID),
      getState: group => this.GetGlobalState(group),
      getRTPC: name => record?.emitterNodes?.retiredRtpcValues instanceof Map ? record.emitterNodes.retiredRtpcValues.get(String(name)) : this.GetRTPCValue(name, gameObjID),
      getGlobalRTPC: name => this.GetGlobalRTPCValue(name),
      setSwitch: (group, value) => this.SetSwitch(group, value, gameObjID),
      setState: (group, value) => this.SetGlobalState(group, value),
      getSfxProgramSignal: (programSlotId, actionIndex, leafIndex) => {
        const slot = record?.programSlots?.get(String(programSlotId));
        const selectionSignal = slot?.selectionControllers?.get(ProgramSelectionKey({
          actionIndex,
          leafIndex
        }))?.signal;
        return selectionSignal ?? slot?.controller?.signal ?? signal;
      }
    });
  }

  /** Creates one decoded SFX voice and its independent gain stage. */
  #CreateVoice(descriptor, emitterNodes, gameObjID) {
    const gain = this.#context.createGain();
    const fadeGain = descriptor.fadeInMs > 0 ? this.#context.createGain() : null;
    const stopGain = this.#context.createGain();
    const lowPassFilter = descriptor.getLowPass ? this.#context.createBiquadFilter?.() ?? null : null;
    const highPassFilter = descriptor.getHighPass ? this.#context.createBiquadFilter?.() ?? null : null;
    if (lowPassFilter) {
      lowPassFilter.type = "lowpass";
      SetAudioParam(lowPassFilter.frequency, WWISE_FILTER_CUTOFF_HZ[0], this.#context);
      SetAudioParam(lowPassFilter.Q, Math.SQRT1_2, this.#context);
    }
    if (highPassFilter) {
      highPassFilter.type = "highpass";
      SetAudioParam(highPassFilter.frequency, WWISE_FILTER_CUTOFF_HZ[100], this.#context);
      SetAudioParam(highPassFilter.Q, Math.SQRT1_2, this.#context);
    }
    if (descriptor.spatial) {
      stopGain.connect(emitterNodes.gain);
    } else {
      if (!emitterNodes.flatGain) {
        emitterNodes.flatGain = this.#context.createGain();
        emitterNodes.flatGain.connect(emitterNodes.analyser ?? this.#sfxGain);
        // A 2D route is allocated lazily. Replay previously stored
        // object RTPCs now that adapters can finally see flatGain.
        for (const [rtpcName, value] of emitterNodes.retiredRtpcValues ?? this.#objectRtpcValues.get(gameObjID) ?? []) {
          this.#applyRTPC?.({
            gameObjID,
            rtpcName,
            value,
            context: this.#context,
            gain: emitterNodes.gain?.gain ?? null,
            flatGain: emitterNodes.flatGain.gain ?? null,
            panner: emitterNodes.panner ?? null
          });
        }
      }
      stopGain.connect(emitterNodes.flatGain);
    }
    gain.connect(stopGain);
    if (fadeGain) {
      SetAudioParam(fadeGain.gain, 0, this.#context);
      fadeGain.connect(gain);
    }
    if (highPassFilter) {
      highPassFilter.connect(fadeGain ?? gain);
    }
    if (lowPassFilter) {
      lowPassFilter.connect(highPassFilter ?? fadeGain ?? gain);
    }
    const voice = {
      buffer: descriptor.buffer,
      loop: descriptor.loop,
      playCount: descriptor.playCount,
      playbackRate: descriptor.playbackRate,
      getPlaybackRate: descriptor.getPlaybackRate,
      spatial: descriptor.spatial,
      getGain: descriptor.getGain,
      getLowPass: descriptor.getLowPass,
      getHighPass: descriptor.getHighPass,
      delayMs: descriptor.delayMs,
      fadeInMs: descriptor.fadeInMs,
      fadeCurve: descriptor.fadeCurve,
      actionIndex: descriptor.actionIndex,
      leafIndex: descriptor.leafIndex,
      matchIds: descriptor.matchIds,
      gain,
      fadeGain,
      stopGain,
      lowPassFilter,
      highPassFilter,
      fadeScheduled: false,
      fadeStartContextTime: null,
      source: null,
      ended: false,
      stopping: false,
      startContextTime: null,
      positionAnchorContextTime: null,
      scheduledEndContextTime: null,
      repeatRemainingSeconds: null,
      repeatAnchorContextTime: null,
      stopContextTime: null,
      offsetSeconds: 0
    };
    this.#ApplyVoiceGain(voice);
    this.#ApplyVoiceFilters(voice);
    this.#ApplyVoicePlaybackRate(voice);
    return voice;
  }

  /** Starts or restarts every decoded voice owned by one logical event. */
  #StartVoices(playingID, record, selectedVoices = null, batchStartContextTime = null) {
    if (record.stopped || !record.loaded || this.#playing.get(playingID) !== record) {
      return;
    }
    const seek = record.pendingSeek;
    const pendingBreak = record.pendingBreak;
    const now = Number(this.#context.currentTime) || 0;
    const renderQuantum = RenderQuantumSeconds(this.#context);
    // Scheduling one render quantum ahead keeps every leaf of a parallel
    // event on the same still-future sample boundary.
    const startContextTime = now + renderQuantum;
    record.pendingSeek = null;
    record.pendingBreak = false;
    for (const voice of selectedVoices ?? record.voices) {
      const programSlot = voice.programSlotId === undefined ? null : record.programSlots?.get(voice.programSlotId);
      const continuous = Boolean(programSlot?.continuation);
      if (pendingBreak && voice.loop && !continuous) {
        voice.ended = true;
        voice.stopping = true;
        this.#SetSfxProgramSlotEnded(playingID, record, voice);
        continue;
      }
      if (pendingBreak && voice.loop && continuous) {
        voice.loop = false;
      }
      if (pendingBreak && voice.playCount > 1 && !continuous) {
        voice.playCount = 1;
      }
      if (voice.stopping) {
        continue;
      }
      const voiceStartContextTime = voice.source === null ? Math.max(startContextTime, (Number.isFinite(batchStartContextTime) ? batchStartContextTime : record.postContextTime) + voice.delayMs / 1000) : startContextTime;
      this.#StartVoice(playingID, record, voice, seek, voiceStartContextTime);
      if (voice.ended) {
        this.#SetSfxProgramSlotEnded(playingID, record, voice);
      }
    }
    if (record.voices.every(voice => voice.ended)) {
      if (record.sfxProgram) {
        this.#MaybeFinishSfxProgram(playingID, record);
      } else {
        this.#FinishSfxPlaying(playingID);
      }
    }
  }

  /** Creates or replaces one Web Audio buffer source. */
  #StartVoice(playingID, record, voice, seek, startContextTime) {
    const duration = Number(voice.buffer.duration);
    let offsetSeconds = 0;
    if (seek?.kind === "ms") {
      offsetSeconds = seek.value / 1000;
    } else if (seek?.kind === "percent" && Number.isFinite(duration)) {
      offsetSeconds = seek.value * duration;
    }
    const loops = voice.loop;
    if (Number.isFinite(duration) && duration > 0) {
      if (loops) {
        offsetSeconds %= duration;
      } else if (offsetSeconds >= duration) {
        voice.ended = true;
        return;
      }
    }
    const previous = voice.source;
    if (previous) {
      previous.onended = null;
      try {
        previous.stop(startContextTime);
      } catch {
        // already stopped
      }
      previous.disconnect?.();
    }
    const source = this.#context.createBufferSource();
    source.buffer = voice.buffer;
    const finiteRepeats = !loops && voice.playCount > 1 && Number.isFinite(duration) && duration > 0;
    source.loop = loops || finiteRepeats;
    if (source.playbackRate && typeof source.playbackRate === "object" && "value" in source.playbackRate) {
      source.playbackRate.value = voice.playbackRate;
    }
    source.connect(voice.lowPassFilter ?? voice.highPassFilter ?? voice.fadeGain ?? voice.gain);
    source.onended = () => {
      if (voice.source === source) {
        this.#VoiceEnded(playingID, record, voice);
      }
    };
    voice.source = source;
    voice.ended = false;
    voice.offsetSeconds = Math.max(0, offsetSeconds);
    voice.startContextTime = startContextTime;
    voice.positionAnchorContextTime = startContextTime;
    if (!voice.fadeScheduled && voice.fadeGain) {
      ScheduleWwiseFade(voice.fadeGain.gain, 0, 1, startContextTime, voice.fadeInMs / 1000, voice.fadeCurve);
      voice.fadeScheduled = true;
      voice.fadeStartContextTime = startContextTime;
    }
    voice.scheduledEndContextTime = null;
    voice.repeatRemainingSeconds = null;
    voice.repeatAnchorContextTime = null;
    this.#ApplyVoiceGain(voice);
    source.start(startContextTime, voice.offsetSeconds);
    if (finiteRepeats) {
      const firstPlay = duration - voice.offsetSeconds;
      const remaining = firstPlay + duration * (voice.playCount - 1);
      voice.repeatRemainingSeconds = remaining;
      voice.repeatAnchorContextTime = startContextTime;
      voice.scheduledEndContextTime = startContextTime + remaining / voice.playbackRate;
      source.stop(voice.scheduledEndContextTime);
    }
  }

  /** Marks one physical voice complete and closes its logical event at zero. */
  #VoiceEnded(playingID, record, voice) {
    voice.ended = true;
    voice.source?.disconnect?.();
    if (record.sfxProgram) {
      this.#SetSfxProgramSlotEnded(playingID, record, voice);
      this.#MaybeFinishSfxProgram(playingID, record);
    } else if (record.voices.every(value => value.ended)) {
      this.#FinishSfxPlaying(playingID);
    }
  }

  /** Marks the logical slot behind one realized program voice complete. */
  #SetSfxProgramSlotEnded(playingID, record, voice) {
    if (!record.sfxProgram) {
      return;
    }
    const slot = record.programSlots?.get(voice.programSlotId);
    if (slot) {
      if ([...slot.voices].some(value => !value.ended)) {
        slot.voice = [...slot.voices].find(value => !value.ended) ?? null;
        return;
      }
      slot.voice = null;
      if (slot.continuation && !slot.broken && !record.stopped) {
        this.#AdvanceSfxProgramSlot(playingID, record, slot, Number(this.#context.currentTime) || 0);
      } else {
        slot.state = "ended";
      }
    }
  }

  /** Loads and starts the next child batch of one Continuous slot. */
  #AdvanceSfxProgramSlot(playingID, record, slot, boundaryContextTime) {
    if (!slot.continuation || slot.broken || record.stopped || this.#playing.get(playingID) !== record) {
      slot.state = "ended";
      return;
    }
    let program;
    try {
      program = this.#continueSfxProgram?.(slot.continuation, record.sfxControls) ?? [];
    } catch {
      slot.state = "ended";
      return;
    }
    if (!Array.isArray(program) || !program.length) {
      slot.state = "ended";
      return;
    }
    const play = program.find(operation => operation.kind === "play");
    const continuation = play?.continuations?.find(value => value.programSlotId === slot.id);
    if (!play || !continuation) {
      slot.state = "ended";
      return;
    }
    const generation = ++slot.generation;
    slot.state = "loading";
    AbortProgramSlot(slot);
    slot.controller = new AbortController();
    slot.continuation = continuation.token;
    slot.transitionDelayMs = Math.max(0, Number(continuation.delayMs) || 0);
    const batchSelections = (play.selections ?? []).filter(selection => selection.programSlotId === slot.id);
    const batchStartContextTime = boundaryContextTime + slot.transitionDelayMs / 1000;
    const selectionMetadata = batchSelections.map(selection => CreateProgramSelectionMetadata(selection, batchStartContextTime));
    slot.selections = Object.freeze(selectionMetadata);
    slot.cancelledSelectionKeys = new Set();
    slot.selectionControllers = CreateProgramSelectionControllers(selectionMetadata);
    slot.leafIndex = selectionMetadata.length ? Math.min(...selectionMetadata.map(selection => selection.leafIndex)) : 0;
    slot.actionTime = selectionMetadata.length ? Math.min(...selectionMetadata.map(selection => selection.actionTime)) : batchStartContextTime;
    slot.matchIds = Object.freeze([...new Set(selectionMetadata.flatMap(selection => selection.matchIds))]);
    this.#DisposeEndedSlotVoices(record, slot);
    Promise.resolve().then(() => this.#loadBuffer(record.eventID, record.eventName, record.sfxControls, program)).then(result => {
      // Rendering may have paused while this boundary was acquiring.
      // Apply every now-overdue Stop before the new batch can realize.
      this.#ProcessScheduledSfxStops();
      if (generation !== slot.generation || slot.state !== "loading" || record.stopped || this.#playing.get(playingID) !== record) {
        return;
      }
      const descriptors = NormalizeVoiceDescriptors(result, () => !!this.#isLoop(record.eventName)).filter(descriptor => descriptor.programSlotId === slot.id && !slot.cancelledSelectionKeys.has(ProgramSelectionKey(descriptor)));
      const voices = descriptors.map(descriptor => {
        const selection = slot.selections.find(value => ProgramSelectionKey(value) === ProgramSelectionKey(descriptor));
        return this.#CreateVoice(selection ? {
          ...descriptor,
          actionIndex: selection.actionIndex,
          leafIndex: selection.leafIndex,
          matchIds: selection.matchIds
        } : descriptor, record.emitterNodes, record.gameObjID);
      });
      slot.voices.clear();
      for (const voice of voices) {
        voice.programSlotId = slot.id;
        if (slot.broken && voice.loop) {
          voice.loop = false;
        }
        slot.voices.add(voice);
        record.voices.push(voice);
      }
      slot.voice = voices[0] ?? null;
      if (!voices.length) {
        // A missing or aborted child made no audible progress. End
        // fail-closed instead of hot-looping an infinite container.
        slot.continuation = null;
        slot.state = "ended";
        this.#MaybeFinishSfxProgram(playingID, record);
        return;
      }
      slot.state = "voice";
      this.#StartVoices(playingID, record, voices, batchStartContextTime);
    }).catch(() => {
      if (generation === slot.generation && this.#playing.get(playingID) === record) {
        slot.state = "ended";
        this.#MaybeFinishSfxProgram(playingID, record);
      }
    });
  }

  /** Disconnects completed voices before a long-running slot advances. */
  #DisposeEndedSlotVoices(record, slot) {
    for (const voice of [...slot.voices]) {
      if (!voice.ended) {
        continue;
      }
      voice.source?.disconnect?.();
      voice.lowPassFilter?.disconnect?.();
      voice.highPassFilter?.disconnect?.();
      voice.gain?.disconnect?.();
      voice.fadeGain?.disconnect?.();
      voice.stopGain?.disconnect?.();
      slot.voices.delete(voice);
      const index = record.voices.indexOf(voice);
      if (index !== -1) {
        record.voices.splice(index, 1);
      }
    }
  }

  /** Re-evaluates authored live gain and playback-rate controls. */
  #RefreshSfxControls(gameObjID = null) {
    for (const record of this.#playing.values()) {
      if (!record.sfx || gameObjID !== null && record.gameObjID !== gameObjID || gameObjID !== null && record.emitterNodes !== this.#emitterNodes.get(record.gameObjID)) {
        continue;
      }
      for (const voice of record.voices ?? []) {
        if (!voice.ended) {
          this.#ApplyVoiceGain(voice);
          this.#ApplyVoiceFilters(voice);
          this.#ApplyVoicePlaybackRate(voice);
        }
      }
    }
  }

  /** Applies one voice descriptor's current safe linear gain. */
  #ApplyVoiceGain(voice) {
    let value = 1;
    try {
      value = voice.getGain();
    } catch {
      value = 1;
    }
    const gain = Number(value);
    const target = Number.isFinite(gain) ? Math.max(0, gain) : 1;
    const param = voice.gain?.gain;
    SetAudioParam(param, target, this.#context);
  }

  /** Applies live Wwise LPF/HPF percentages to per-voice WebAudio filters. */
  #ApplyVoiceFilters(voice) {
    ApplyVoiceFilter(voice.lowPassFilter, voice.getLowPass, false, this.#context);
    ApplyVoiceFilter(voice.highPassFilter, voice.getHighPass, true, this.#context);
  }

  /** Applies one voice descriptor's current safe playback rate in place. */
  #ApplyVoicePlaybackRate(voice) {
    if (typeof voice.getPlaybackRate !== "function") {
      return;
    }
    let value;
    try {
      value = Number(voice.getPlaybackRate());
    } catch {
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      return;
    }
    const previous = Number(voice.playbackRate);
    const source = voice.source;
    const now = Number(this.#context.currentTime) || 0;
    if (source && Number.isFinite(previous) && previous > 0 && voice.positionAnchorContextTime !== null && now > voice.positionAnchorContextTime) {
      voice.offsetSeconds += (now - voice.positionAnchorContextTime) * previous;
      voice.positionAnchorContextTime = now;
    }
    if (source && !voice.stopping && Number.isFinite(previous) && previous > 0 && voice.repeatRemainingSeconds !== null && voice.repeatAnchorContextTime !== null) {
      const anchor = voice.repeatAnchorContextTime;
      const elapsed = Math.max(0, now - anchor) * previous;
      voice.repeatRemainingSeconds = Math.max(0, voice.repeatRemainingSeconds - elapsed);
      voice.repeatAnchorContextTime = Math.max(now, anchor);
      voice.scheduledEndContextTime = voice.repeatAnchorContextTime + voice.repeatRemainingSeconds / value;
      try {
        source.stop(voice.scheduledEndContextTime);
      } catch {
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
  #HoldVoiceFade(voice, actionTime) {
    const param = voice.fadeGain?.gain;
    const start = voice.fadeStartContextTime;
    const duration = voice.fadeInMs / 1000;
    if (!param || !voice.fadeScheduled || !Number.isFinite(start) || !Number.isFinite(duration) || duration <= 0 || actionTime < start || actionTime >= start + duration) {
      return;
    }
    if (typeof param.cancelAndHoldAtTime === "function") {
      param.cancelAndHoldAtTime(actionTime);
      return;
    }
    const progress = (actionTime - start) / duration;
    const value = evaluateWwiseInterpolation(voice.fadeCurve, progress);
    param.cancelScheduledValues?.(actionTime);
    param.setValueAtTime?.(value, actionTime);
    if ("value" in param) {
      param.value = value;
    }
  }

  /** Marks the SFX side complete and closes the shared id when music agrees. */
  #FinishSfxPlaying(playingID) {
    const record = this.#playing.get(playingID);
    if (!record || record.sfxFinished) {
      return;
    }
    record.sfxFinished = true;
    if (!record.music || record.musicFinished) {
      this.#FinishPlaying(playingID);
    }
  }

  /** Marks the music side complete and closes the shared id when SFX agrees. */
  #FinishMusicPlaying(playingID) {
    const record = this.#playing.get(playingID);
    if (!record || record.musicFinished) {
      return;
    }
    record.musicFinished = true;
    if (!record.sfx || record.sfxFinished) {
      this.#FinishPlaying(playingID);
    }
  }

  /** Finalizes one playing record and delivers completion callbacks once. */
  #FinishPlaying(playingID) {
    const record = this.#playing.get(playingID);
    if (record) {
      this.#playing.delete(playingID);
      this.#scheduledSfxStops = this.#scheduledSfxStops.filter(stop => stop.ownerPlayingID !== playingID);
      record.stopped = true;
      record.controller?.abort();
      for (const slot of record.programSlots?.values?.() ?? []) {
        AbortProgramSlot(slot);
      }
      for (const voice of record.voices ?? []) {
        if (voice.source) {
          voice.source.onended = null;
        }
        if (voice.source && !voice.ended) {
          try {
            voice.source.stop?.(this.#context.currentTime);
          } catch {
            // already stopped
          }
        }
        voice.source?.disconnect?.();
        voice.lowPassFilter?.disconnect?.();
        voice.highPassFilter?.disconnect?.();
        voice.gain?.disconnect?.();
        voice.fadeGain?.disconnect?.();
        voice.stopGain?.disconnect?.();
      }
      if (record.source) {
        record.source.onended = null;
      }
      record.source?.disconnect?.();
      record.sourceGain?.disconnect?.();
      record.emitter?.EventFinishedCallback?.(playingID);
      record.onFinished?.(playingID);
      this.#ReleaseRetiredEmitterNodes(record.gameObjID, record.emitterNodes);
    }
  }

  /** Disconnects one emitter generation once no current or playing record owns it. */
  #ReleaseRetiredEmitterNodes(gameObjID, nodes) {
    if (!nodes || this.#emitterNodes.get(gameObjID) === nodes || [...this.#playing.values()].some(record => record.emitterNodes === nodes)) {
      return;
    }
    this.#DisconnectEmitterNodes(nodes);
  }

  /** Disconnects a no-longer-used emitter node generation. */
  #DisconnectEmitterNodes(nodes) {
    nodes.gain.disconnect?.();
    nodes.flatGain?.disconnect?.();
    nodes.panner.disconnect?.();
    nodes.analyser?.disconnect?.();
  }
}
function SetAudioParam(param, value, context) {
  if (param && typeof param === "object" && "value" in param) {
    param.value = value;
  }
}
function ApplyVoiceFilter(node, readPercent, highPass, context) {
  if (!node || typeof readPercent !== "function") {
    return;
  }
  let value;
  try {
    value = Number(readPercent());
  } catch {
    return;
  }
  if (!Number.isFinite(value)) {
    return;
  }
  const percent = Math.max(0, Math.min(100, value));
  const tableValue = highPass ? 100 - percent : percent;
  const leftIndex = Math.floor(tableValue);
  const rightIndex = Math.ceil(tableValue);
  const left = WWISE_FILTER_CUTOFF_HZ[leftIndex];
  const right = WWISE_FILTER_CUTOFF_HZ[rightIndex];
  const cutoff = left + (right - left) * (tableValue - leftIndex);
  SetAudioParam(node.frequency, cutoff);
}
function RenderQuantumSeconds(context) {
  const sampleRate = Number(context?.sampleRate);
  return Number.isFinite(sampleRate) && sampleRate > 0 ? 128 / sampleRate : DEFAULT_RENDER_QUANTUM_SECONDS;
}
function CompareStopActions(left, right) {
  return CompareOrderTuples([left.actionTime, left.ownerPlayingID, left.actionIndex, Number.MAX_SAFE_INTEGER], [right.actionTime, right.ownerPlayingID, right.actionIndex, Number.MAX_SAFE_INTEGER]);
}
function CompareProgramOrder(value, slot, stop) {
  return CompareOrderTuples([value.actionTime ?? slot.actionTime, slot.playingID, value.actionIndex ?? slot.actionIndex, value.leafIndex ?? slot.leafIndex], [stop.actionTime, stop.ownerPlayingID, stop.actionIndex, Number.MAX_SAFE_INTEGER]);
}
function CompareFallbackOrder(record, playingID, stop) {
  return CompareOrderTuples([record.postContextTime, playingID, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER], [stop.actionTime, stop.ownerPlayingID, stop.actionIndex, Number.MAX_SAFE_INTEGER]);
}
function CompareOrderTuples(left, right) {
  for (let index = 0; index < left.length; index++) {
    const result = Number(left[index]) - Number(right[index]);
    if (result !== 0) {
      return result;
    }
  }
  return 0;
}
function SilenceAudioParamAt(param, time, context) {
  if (typeof param?.cancelAndHoldAtTime === "function") {
    param.cancelAndHoldAtTime(time);
  } else {
    param?.cancelScheduledValues?.(time);
  }
  param?.setValueAtTime?.(0, time);
  SetAudioParam(param, 0);
}
function StopMatchesProgramValue(stop, value) {
  const matchIds = new Set((value.matchIds ?? []).map(String));
  const protectedByException = stop.exceptions.some(exception => matchIds.has(String(exception.targetId)));
  if (protectedByException) {
    return false;
  }
  if (stop.mode === "all" || stop.mode === "all-except") {
    return true;
  }
  return stop.mode === "element" && matchIds.has(String(stop.targetId));
}
function CreateProgramSelectionMetadata(selection, baseContextTime) {
  return Object.freeze({
    actionIndex: Number(selection.actionIndex),
    leafIndex: Number(selection.leafIndex),
    actionTime: Number(baseContextTime) + Math.max(0, Number(selection.delayMs) || 0) / 1000,
    matchIds: Object.freeze((selection.matchIds ?? []).map(String))
  });
}
function CreateProgramSelectionControllers(selections) {
  return new Map(selections.map(selection => [ProgramSelectionKey(selection), new AbortController()]));
}
function AbortProgramSlot(slot) {
  slot.controller?.abort();
  for (const controller of slot.selectionControllers?.values?.() ?? []) {
    controller.abort();
  }
}
function ProgramSelectionKey(value) {
  return `${Number(value.actionIndex)}:${Number(value.leafIndex)}`;
}
function NormalizeVoiceDescriptors(result, eventLoop) {
  const values = Array.isArray(result?.voices) ? result.voices : [{
    buffer: result
  }];
  return values.map((value, index) => {
    if (!value?.buffer) {
      throw new TypeError(`Audio voice ${index} has no decoded buffer`);
    }
    const playbackRate = Number(value.playbackRate ?? 1);
    if (!Number.isFinite(playbackRate) || playbackRate <= 0) {
      throw new TypeError(`Audio voice ${index} playbackRate must be positive`);
    }
    const constantGain = Number(value.gain ?? 1);
    const constantLowPass = Number(value.lowPass ?? 0);
    const constantHighPass = Number(value.highPass ?? 0);
    const playCount = Number(value.playCount ?? 1);
    const delayMs = Number(value.delayMs ?? 0);
    const fadeInMs = Number(value.fadeInMs ?? 0);
    const fadeCurve = Number(value.fadeCurve ?? LINEAR_FADE_CURVE);
    if (!Number.isSafeInteger(playCount) || playCount <= 0) {
      throw new TypeError(`Audio voice ${index} playCount must be a positive integer`);
    }
    if (value.loop === true && value.playCount !== undefined) {
      throw new TypeError(`Audio voice ${index} cannot combine loop and playCount`);
    }
    if (!Number.isFinite(delayMs) || delayMs < 0) {
      throw new TypeError(`Audio voice ${index} delayMs must be non-negative`);
    }
    if (!Number.isFinite(fadeInMs) || fadeInMs < 0) {
      throw new TypeError(`Audio voice ${index} fadeInMs must be non-negative`);
    }
    if (!Number.isSafeInteger(fadeCurve) || fadeCurve < 0 || fadeCurve > 8) {
      throw new TypeError(`Audio voice ${index} fadeCurve must be a Wwise curve value from 0 to 8`);
    }
    if (value.programSlotId !== undefined && (typeof value.programSlotId !== "string" || value.programSlotId.length === 0)) {
      throw new TypeError(`Audio voice ${index} programSlotId must be a non-empty string`);
    }
    const actionIndex = Number(value.actionIndex ?? 0);
    const leafIndex = Number(value.leafIndex ?? index);
    if (!Number.isSafeInteger(actionIndex) || actionIndex < 0) {
      throw new TypeError(`Audio voice ${index} actionIndex must be a non-negative integer`);
    }
    if (!Number.isSafeInteger(leafIndex) || leafIndex < 0) {
      throw new TypeError(`Audio voice ${index} leafIndex must be a non-negative integer`);
    }
    if (value.matchIds !== undefined && (!Array.isArray(value.matchIds) || value.matchIds.some(matchID => typeof matchID !== "string" && typeof matchID !== "number"))) {
      throw new TypeError(`Audio voice ${index} matchIds must be an array of ids`);
    }
    const loop = value.loop === undefined ? value.playCount === undefined && Boolean(eventLoop()) : Boolean(value.loop);
    return {
      buffer: value.buffer,
      loop,
      playCount,
      playbackRate,
      spatial: value.spatial === undefined ? true : Boolean(value.spatial),
      delayMs,
      fadeInMs,
      fadeCurve,
      actionIndex,
      leafIndex,
      matchIds: Object.freeze((value.matchIds ?? []).map(String)),
      ...(value.programSlotId === undefined ? {} : {
        programSlotId: value.programSlotId
      }),
      getGain: typeof value.getGain === "function" ? value.getGain : () => Number.isFinite(constantGain) ? Math.max(0, constantGain) : 1,
      getPlaybackRate: typeof value.getPlaybackRate === "function" ? value.getPlaybackRate : null,
      getLowPass: typeof value.getLowPass === "function" ? value.getLowPass : value.lowPass === undefined ? null : () => constantLowPass,
      getHighPass: typeof value.getHighPass === "function" ? value.getHighPass : value.highPass === undefined ? null : () => constantHighPass
    };
  });
}
function ScheduleWwiseFade(param, from, to, when, duration, curve, progress = 0) {
  const startProgress = Math.max(0, Math.min(1, progress));
  const curveID = Number(curve);
  const startValue = from + (to - from) * evaluateWwiseInterpolation(curveID, startProgress);
  if ("value" in param) {
    param.value = startValue;
  }
  if (curveID === LINEAR_FADE_CURVE || typeof param.setValueCurveAtTime !== "function") {
    param.setValueAtTime?.(startValue, when);
    param.linearRampToValueAtTime?.(to, when + duration);
    return;
  }
  const values = new Float32Array(FADE_CURVE_SAMPLES);
  for (let index = 0; index < values.length; index++) {
    const ratio = index / (values.length - 1);
    const sampleProgress = startProgress + (1 - startProgress) * ratio;
    values[index] = from + (to - from) * evaluateWwiseInterpolation(curveID, sampleProgress);
  }
  param.setValueCurveAtTime(values, when, duration);
}

export { CjsAudioBackend };
//# sourceMappingURL=CjsAudioBackend.js.map
