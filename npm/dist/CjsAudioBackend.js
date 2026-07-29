// CarbonEngineJS original (no Carbon counterpart). WebAudio realization of the
// AudGameObjResource.backend seam. Signal chain:
// source -> source gain -> emitter gain -> PannerNode(HRTF, inverse distance)
// -> master gain -> destination. Each playing source owns the source gain so
// stop-fades and replays cannot bleed across concurrent events on one emitter.
//
// Injectables keep this node-testable and decode-agnostic:
// - context: an AudioContext (or compatible fake); never created here.
// - loadBuffer(eventID, eventName) -> Promise<AudioBuffer> - the app wires
//   runtime-resource's wem->ogg->decode chain (catalog route) behind this.
// - isLoop(eventName) - loop flag source (usually the static data repository).

const DEFAULT_FADE_SECONDS = 1;

/** WebAudio backend for the audio graph: emitter nodes, playing sources, listener pose. */
class CjsAudioBackend {
  #context = null;
  #loadBuffer = null;
  #isLoop = null;
  #masterGain = null;
  #sfxGain = null;
  #emitterNodes = new Map();
  #playing = new Map();
  #globalRtpcValues = new Map();
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
    distanceScale,
    musicEngine,
    applyRTPC
  } = {}) {
    this.#context = context ?? null;
    this.#loadBuffer = loadBuffer ?? null;
    this.#isLoop = isLoop ?? (() => false);
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
        record.stopped = true;
        previous?.ExecuteAction?.("stop", playingID, 0);
        this.#FinishPlaying(playingID);
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
      panner,
      analyser,
      scalingFactor: 1
    });
  }

  /** Tears down an emitter's node chain and halts its playing sources, loaded or pending. */
  UnregisterGameObj(gameObjID) {
    const nodes = this.#emitterNodes.get(gameObjID);
    if (nodes) {
      for (const [playingID, record] of [...this.#playing]) {
        if (record.gameObjID === gameObjID) {
          record.stopped = true;
          if (record.music) {
            record.musicEngine?.ExecuteAction?.("stop", playingID, 0);
          }
          record.source?.stop?.(this.#context.currentTime);
          this.#FinishPlaying(playingID);
        }
      }
      nodes.gain.disconnect?.();
      nodes.panner.disconnect?.();
      nodes.analyser?.disconnect?.();
      this.#emitterNodes.delete(gameObjID);
    }
    this.#objectRtpcValues.delete(gameObjID);
    this.#objectSwitchValues.delete(gameObjID);
  }

  /** Starts an event: allocates the playing id synchronously, starts when the media resolves. */
  PostEvent(eventID, gameObjID, additionalFlags, emitter, eventName) {
    // Music-graph events route to the interactive-music engine.
    if (this.#musicEngine?.HandlesEvent(eventName)) {
      return this.#PostMusicEvent(eventName, {
        gameObjID,
        emitter
      });
    }
    const nodes = this.#emitterNodes.get(gameObjID);
    if (!this.#context || !this.#loadBuffer || !nodes) {
      return 0;
    }
    const playingID = this.#nextPlayingID++;
    const sourceGain = this.#context.createGain();
    sourceGain.connect(nodes.gain);
    const record = {
      gameObjID,
      emitter,
      eventName,
      source: null,
      sourceGain,
      buffer: null,
      stopped: false,
      startContextTime: null,
      offsetSeconds: 0,
      pendingSeek: null
    };
    this.#playing.set(playingID, record);
    Promise.resolve(this.#loadBuffer(eventID, eventName)).then(buffer => {
      if (!buffer || record.stopped || !this.#playing.has(playingID)) {
        this.#FinishPlaying(playingID);
        return;
      }
      record.buffer = buffer;
      this.#StartSource(playingID, record);
    }).catch(() => this.#FinishPlaying(playingID));
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
      return;
    }
    if (action === "break") {
      // Pending sources have no BufferSource yet; the loop flag comes
      // from the injected delegate so a broken pending one-shot still
      // plays out once its media resolves, like a loaded one.
      const loops = record.source ? !!record.source.loop : !!this.#isLoop(record.eventName);
      if (!loops) {
        return;
      }
    }
    record.stopped = true;
    if (record.source) {
      // An explicit 0 means an immediate stop; only a missing/invalid
      // duration falls back to the default fade.
      const ms = Number(fadeOutDuration);
      const seconds = Number.isFinite(ms) ? Math.max(0, ms) / 1000 : DEFAULT_FADE_SECONDS;
      if (seconds > 0) {
        record.sourceGain.gain?.linearRampToValueAtTime?.(0, this.#context.currentTime + seconds);
      } else {
        SetAudioParam(record.sourceGain.gain, 0, this.#context);
      }
      record.source.stop(this.#context.currentTime + seconds);
    } else {
      this.#FinishPlaying(playingID);
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
    if (record.music) {
      return record.musicEngine?.GetSourcePlayPosition?.(playingID) ?? -1;
    }
    if (!record.source || record.startContextTime === null) {
      return 0;
    }
    let seconds = record.offsetSeconds + Math.max(0, this.#context.currentTime - record.startContextTime);
    const duration = Number(record.buffer?.duration);
    if (Number.isFinite(duration) && duration > 0) {
      seconds = record.source.loop ? seconds % duration : Math.min(seconds, duration);
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
    const nodes = this.#emitterNodes.get(gameObjID);
    if (nodes) {
      nodes.scalingFactor = value;
      if (nodes.panner.refDistance !== undefined) {
        nodes.panner.refDistance = Math.max(1e-4, value);
      }
    }
  }

  /**
   * Per-object RTPC store. Authored Wwise response curves are not available
   * in the runtime catalog; applications may inject applyRTPC to realize a
   * known project-specific mapping without runtime-audio inventing one.
   */
  SetRTPCValue(rtpcName, value, gameObjID) {
    const name = String(rtpcName);
    const numeric = Number(value);
    let values = this.#objectRtpcValues.get(gameObjID);
    if (!values) {
      values = new Map();
      this.#objectRtpcValues.set(gameObjID, values);
    }
    values.set(name, numeric);
    const nodes = this.#emitterNodes.get(gameObjID) ?? null;
    this.#applyRTPC?.({
      gameObjID,
      rtpcName: name,
      value: numeric,
      context: this.#context,
      gain: nodes?.gain?.gain ?? null,
      panner: nodes?.panner ?? null
    });
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
    this.#globalRtpcValues.set(name, numeric);
    if (name === "menu_main_master_level") {
      SetAudioParam(this.#masterGain?.gain, Math.max(0, Math.min(1, numeric || 0)), this.#context);
    } else if (name === "menu_main_music_level") {
      this.#musicEngine?.SetMusicVolume(numeric);
    }
  }

  /** Global state group - feeds the music engine's tree arguments. */
  SetGlobalState(stateGroup, stateName) {
    this.#musicEngine?.SetState(stateGroup, stateName);
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
    this.#musicEngine?.Process();
  }

  /** Active playing ids (introspection/tests). */
  GetPlayingCount() {
    return this.#playing.size;
  }

  /**
   * Stops owned voices and disconnects WebAudio nodes. The AudioContext is
   * host-owned and is deliberately not closed here.
   */
  Dispose() {
    this.SetMusicEngine(null);
    for (const gameObjID of [...this.#emitterNodes.keys()]) {
      this.UnregisterGameObj(gameObjID);
    }
    for (const playingID of [...this.#playing.keys()]) {
      this.#FinishPlaying(playingID);
    }
    this.#objectRtpcValues.clear();
    this.#objectSwitchValues.clear();
    this.#globalRtpcValues.clear();
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
      music: true,
      musicEngine,
      onFinished
    };
    this.#playing.set(playingID, record);
    try {
      musicEngine.PostEvent(eventName, playingID, () => this.#FinishPlaying(playingID));
    } catch {
      this.#FinishPlaying(playingID);
      return 0;
    }
    return playingID;
  }

  /** Applies or defers a millisecond/percentage seek for one playing id. */
  #Seek(playingID, seek) {
    const record = this.#playing.get(playingID);
    if (!record || record.stopped) {
      return false;
    }
    if (record.music) {
      const method = seek.kind === "percent" ? "SeekOnEventPercent" : "SeekOnEventMs";
      return record.musicEngine?.[method]?.(playingID, seek.value) === true;
    }
    record.pendingSeek = seek;
    if (record.buffer) {
      this.#StartSource(playingID, record);
    }
    return true;
  }

  /** Creates or replaces the Web Audio source for one decoded SFX record. */
  #StartSource(playingID, record) {
    if (record.stopped || !record.buffer || this.#playing.get(playingID) !== record) {
      return;
    }
    const duration = Number(record.buffer.duration);
    let offsetSeconds = 0;
    if (record.pendingSeek?.kind === "ms") {
      offsetSeconds = record.pendingSeek.value / 1000;
    } else if (record.pendingSeek?.kind === "percent" && Number.isFinite(duration)) {
      offsetSeconds = record.pendingSeek.value * duration;
    }
    record.pendingSeek = null;
    const loops = !!this.#isLoop(record.eventName);
    if (Number.isFinite(duration) && duration > 0) {
      if (loops) {
        offsetSeconds %= duration;
      } else if (offsetSeconds >= duration) {
        this.#FinishPlaying(playingID);
        return;
      }
    }
    const previous = record.source;
    if (previous) {
      previous.onended = null;
      try {
        previous.stop(this.#context.currentTime);
      } catch {
        // already stopped
      }
      previous.disconnect?.();
    }
    const source = this.#context.createBufferSource();
    source.buffer = record.buffer;
    source.loop = loops;
    source.connect(record.sourceGain);
    source.onended = () => {
      if (record.source === source) {
        this.#FinishPlaying(playingID);
      }
    };
    record.source = source;
    record.offsetSeconds = Math.max(0, offsetSeconds);
    record.startContextTime = this.#context.currentTime;
    source.start(this.#context.currentTime, record.offsetSeconds);
  }

  /** Finalizes one playing record and delivers completion callbacks once. */
  #FinishPlaying(playingID) {
    const record = this.#playing.get(playingID);
    if (record) {
      this.#playing.delete(playingID);
      record.stopped = true;
      if (record.source) {
        record.source.onended = null;
      }
      record.sourceGain?.disconnect?.();
      record.emitter?.EventFinishedCallback?.(playingID);
      record.onFinished?.(playingID);
    }
  }
}
function SetAudioParam(param, value, context) {
  if (param && typeof param === "object" && "value" in param) {
    param.value = value;
  }
}

export { CjsAudioBackend };
//# sourceMappingURL=CjsAudioBackend.js.map
