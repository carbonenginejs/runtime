// CarbonEngineJS original (no Carbon counterpart). WebAudio realization of the
// AudGameObjResource.backend seam. Signal chain:
// source -> source gain -> emitter gain -> PannerNode(HRTF, inverse distance)
// -> master gain -> destination. Each playing source owns the source gain so
// stop-fades and replays cannot bleed across concurrent events on one emitter.
//
// Injectables keep this node-testable and decode-agnostic:
// - context: an AudioContext (or compatible fake); never created here.
// - loadBuffer(eventID, eventName, controls) -> Promise<AudioBuffer|voice set>
//   - the app wires runtime-resource's wem->ogg->decode chain behind this.
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
  #globalStateValues = new Map();
  #objectRtpcValues = new Map();
  #objectSwitchValues = new Map();
  #applyRTPC = null;
  #releaseGameObj = null;
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
    applyRTPC,
    releaseGameObj
  } = {}) {
    this.#context = context ?? null;
    this.#loadBuffer = loadBuffer ?? null;
    this.#isLoop = isLoop ?? (() => false);
    this.#distanceScale = Number(distanceScale) || 1;
    this.#applyRTPC = typeof applyRTPC === "function" ? applyRTPC : null;
    this.#releaseGameObj = typeof releaseGameObj === "function" ? releaseGameObj : null;
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
      flatGain: null,
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
          for (const voice of record.voices ?? []) {
            if (voice.source) {
              voice.source.onended = null;
              voice.source.stop?.(this.#context.currentTime);
            }
          }
          this.#FinishPlaying(playingID);
        }
      }
      nodes.gain.disconnect?.();
      nodes.flatGain?.disconnect?.();
      nodes.panner.disconnect?.();
      nodes.analyser?.disconnect?.();
      this.#emitterNodes.delete(gameObjID);
    }
    this.#objectRtpcValues.delete(gameObjID);
    this.#objectSwitchValues.delete(gameObjID);
    this.#releaseGameObj?.(gameObjID);
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
    const record = {
      gameObjID,
      emitter,
      eventName,
      voices: [],
      loaded: false,
      stopped: false,
      pendingBreak: false,
      pendingSeek: null
    };
    this.#playing.set(playingID, record);
    const controls = this.#CreateSfxControls(gameObjID);
    Promise.resolve().then(() => {
      if (record.stopped || !this.#playing.has(playingID)) {
        return null;
      }
      return this.#loadBuffer(eventID, eventName, controls);
    }).then(result => {
      if (!result || record.stopped || !this.#playing.has(playingID)) {
        this.#FinishPlaying(playingID);
        return;
      }
      const descriptors = NormalizeVoiceDescriptors(result, () => !!this.#isLoop(record.eventName));
      for (const descriptor of descriptors) {
        record.voices.push(this.#CreateVoice(descriptor, nodes));
      }
      record.loaded = true;
      if (!record.voices.length) {
        this.#FinishPlaying(playingID);
        return;
      }
      this.#StartVoices(playingID, record);
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
    }
    const active = record.voices?.filter(voice => voice.source && !voice.ended && (!breaking || voice.loop)) ?? [];
    if (active.length) {
      // An explicit 0 means an immediate stop; only a missing/invalid
      // duration falls back to the default fade.
      const ms = Number(fadeOutDuration);
      const seconds = Number.isFinite(ms) ? Math.max(0, ms) / 1000 : DEFAULT_FADE_SECONDS;
      for (const voice of active) {
        voice.stopping = true;
        if (seconds > 0) {
          const param = voice.gain.gain;
          const now = this.#context.currentTime;
          if (typeof param?.cancelAndHoldAtTime === "function") {
            param.cancelAndHoldAtTime(now);
          } else {
            param?.cancelScheduledValues?.(now);
            param?.setValueAtTime?.(param.value, now);
          }
          param?.linearRampToValueAtTime?.(0, now + seconds);
        } else {
          SetAudioParam(voice.gain.gain, 0, this.#context);
        }
        voice.source.stop(this.#context.currentTime + seconds);
      }
    } else if (!breaking) {
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
    const voice = record.voices?.find(value => value.source && !value.ended);
    if (!voice || voice.startContextTime === null) {
      return 0;
    }
    let seconds = voice.offsetSeconds + Math.max(0, this.#context.currentTime - voice.startContextTime) * voice.playbackRate;
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
    const nodes = this.#emitterNodes.get(gameObjID);
    if (nodes) {
      nodes.scalingFactor = value;
      if (nodes.panner.refDistance !== undefined) {
        nodes.panner.refDistance = Math.max(1e-4, value);
      }
    }
  }

  /**
   * Per-object RTPC store. Installed SFX gain curves update active voices;
   * applications may also inject applyRTPC for project-specific mappings
   * that are outside the portable SFX graph.
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
    this.#RefreshSfxGains(gameObjID);
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
    this.#RefreshSfxGains();
    if (name === "menu_main_master_level") {
      SetAudioParam(this.#masterGain?.gain, Math.max(0, Math.min(1, numeric || 0)), this.#context);
    } else if (name === "menu_main_music_level") {
      this.#musicEngine?.SetMusicVolume(numeric);
    }
  }

  /** Global state group - feeds authored SFX and music tree arguments. */
  SetGlobalState(stateGroup, stateName) {
    this.#globalStateValues.set(String(stateGroup), String(stateName));
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
      } else {
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
    if (record.loaded) {
      this.#StartVoices(playingID, record);
    }
    return true;
  }

  /** Creates live control readers for one emitter's authored SFX post. */
  #CreateSfxControls(gameObjID) {
    return Object.freeze({
      gameObjID,
      getSwitch: group => this.GetSwitchValue(group, gameObjID),
      getState: group => this.GetGlobalState(group),
      getRTPC: name => this.GetRTPCValue(name, gameObjID),
      getGlobalRTPC: name => this.GetGlobalRTPCValue(name)
    });
  }

  /** Creates one decoded SFX voice and its independent gain stage. */
  #CreateVoice(descriptor, emitterNodes) {
    const gain = this.#context.createGain();
    if (descriptor.spatial) {
      gain.connect(emitterNodes.gain);
    } else {
      if (!emitterNodes.flatGain) {
        emitterNodes.flatGain = this.#context.createGain();
        emitterNodes.flatGain.connect(emitterNodes.analyser ?? this.#sfxGain);
      }
      gain.connect(emitterNodes.flatGain);
    }
    const voice = {
      buffer: descriptor.buffer,
      loop: descriptor.loop,
      playbackRate: descriptor.playbackRate,
      spatial: descriptor.spatial,
      getGain: descriptor.getGain,
      gain,
      source: null,
      ended: false,
      stopping: false,
      startContextTime: null,
      offsetSeconds: 0
    };
    this.#ApplyVoiceGain(voice);
    return voice;
  }

  /** Starts or restarts every decoded voice owned by one logical event. */
  #StartVoices(playingID, record) {
    if (record.stopped || !record.loaded || this.#playing.get(playingID) !== record) {
      return;
    }
    const seek = record.pendingSeek;
    const pendingBreak = record.pendingBreak;
    record.pendingSeek = null;
    record.pendingBreak = false;
    for (const voice of record.voices) {
      if (pendingBreak && voice.loop) {
        voice.ended = true;
        voice.stopping = true;
        continue;
      }
      if (voice.stopping) {
        continue;
      }
      this.#StartVoice(playingID, record, voice, seek);
    }
    if (record.voices.every(voice => voice.ended)) {
      this.#FinishPlaying(playingID);
    }
  }

  /** Creates or replaces one Web Audio buffer source. */
  #StartVoice(playingID, record, voice, seek) {
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
        previous.stop(this.#context.currentTime);
      } catch {
        // already stopped
      }
      previous.disconnect?.();
    }
    const source = this.#context.createBufferSource();
    source.buffer = voice.buffer;
    source.loop = loops;
    if (source.playbackRate && typeof source.playbackRate === "object" && "value" in source.playbackRate) {
      source.playbackRate.value = voice.playbackRate;
    }
    source.connect(voice.gain);
    source.onended = () => {
      if (voice.source === source) {
        this.#VoiceEnded(playingID, record, voice);
      }
    };
    voice.source = source;
    voice.ended = false;
    voice.offsetSeconds = Math.max(0, offsetSeconds);
    voice.startContextTime = this.#context.currentTime;
    this.#ApplyVoiceGain(voice);
    source.start(this.#context.currentTime, voice.offsetSeconds);
  }

  /** Marks one physical voice complete and closes its logical event at zero. */
  #VoiceEnded(playingID, record, voice) {
    voice.ended = true;
    voice.source?.disconnect?.();
    if (record.voices.every(value => value.ended)) {
      this.#FinishPlaying(playingID);
    }
  }

  /** Re-evaluates authored live RTPC gain curves. */
  #RefreshSfxGains(gameObjID = null) {
    for (const record of this.#playing.values()) {
      if (record.music || record.stopped || gameObjID !== null && record.gameObjID !== gameObjID) {
        continue;
      }
      for (const voice of record.voices ?? []) {
        if (!voice.stopping) {
          this.#ApplyVoiceGain(voice);
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
    SetAudioParam(voice.gain?.gain, Number.isFinite(gain) ? Math.max(0, gain) : 1, this.#context);
  }

  /** Finalizes one playing record and delivers completion callbacks once. */
  #FinishPlaying(playingID) {
    const record = this.#playing.get(playingID);
    if (record) {
      this.#playing.delete(playingID);
      record.stopped = true;
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
        voice.gain?.disconnect?.();
      }
      if (record.source) {
        record.source.onended = null;
      }
      record.source?.disconnect?.();
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
    return {
      buffer: value.buffer,
      loop: value.loop === undefined ? Boolean(eventLoop()) : Boolean(value.loop),
      playbackRate,
      spatial: value.spatial === undefined ? true : Boolean(value.spatial),
      getGain: typeof value.getGain === "function" ? value.getGain : () => Number.isFinite(constantGain) ? Math.max(0, constantGain) : 1
    };
  });
}

export { CjsAudioBackend };
//# sourceMappingURL=CjsAudioBackend.js.map
