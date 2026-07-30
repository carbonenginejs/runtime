import { CjsAudioSystem } from './CjsAudioSystem.js';
import { CjsJukebox } from './CjsJukebox.js';
import { CjsSfxEngine } from './CjsSfxEngine.js';
import { AudListener as _AudListener } from './trinity/audio/AudListener.js';
import { AudMusicPlayer as _AudMusicPlayer } from './trinity/audio/AudMusicPlayer.js';
import { installAudioLibraryDocument } from './library/audioLibraryDocument.js';

// CarbonEngineJS original (no Carbon counterpart). Browser-only audio
// composition root that installs one complete semantic library and owns
// media selection, delivery, preparation, and decoded-buffer retention.
const DELIVERY_MODES = new Set(["auto", "individual", "whole", "range"]);
const ORIGINAL_MEDIA_TYPES = new Set(["", "application/octet-stream", "bnk", "wem"]);

/**
 * Installs one complete audio-library document and owns media selection,
 * delivery, preparation, decode retention, and the composed audio system.
 */
class CjsAudioMan {
  #cacheDecoded = true;
  #cacheWholeBanks = true;
  #context = null;
  #createContext = null;
  #decodedMedia = new Map();
  #defaultSoundBanks = new Set();
  #delivery = "auto";
  #languages = [];
  #languagesExplicit = false;
  #library = null;
  #jukebox = null;
  #listener = null;
  #musicPlayer = null;
  #mediaProvider = null;
  #banksWaitingToLoad = new Set();
  #selectEventMedia = null;
  #sfxEngine = null;
  #system = null;
  #systemOptions = null;
  #wholeBanks = new Map();
  #random = null;

  /**
   * Creates an uninstalled manager or installs the supplied complete
   * audio-library document immediately.
   *
   * Construction never creates an AudioContext or performs media I/O.
   */
  constructor(library = null, {
    mediaProvider = null,
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
    isMusicTrackAvailable = null
  } = {}) {
    if (typeof createContext !== "function") {
      throw new TypeError("CjsAudioMan createContext must be a function");
    }
    if (selectEventMedia !== null && typeof selectEventMedia !== "function") {
      throw new TypeError("CjsAudioMan selectEventMedia must be a function");
    }
    if (typeof random !== "function") {
      throw new TypeError("CjsAudioMan random must be a function");
    }
    this.#createContext = createContext;
    this.#delivery = NormalizeDelivery(delivery);
    this.#languagesExplicit = languages !== null;
    this.#languages = NormalizeLanguages(languages ?? []);
    this.#defaultSoundBanks = new Set(NormalizeBankNames(defaultSoundBanks));
    this.#cacheDecoded = Boolean(cacheDecoded);
    this.#cacheWholeBanks = Boolean(cacheWholeBanks);
    this.#selectEventMedia = selectEventMedia;
    this.#random = random;
    this.#systemOptions = {
      distanceScale,
      musicEngine,
      createMusicEngine,
      applyRTPC
    };
    if (musicLibrary !== null || loadMusicTrack !== null || isMusicTrackAvailable !== null) {
      this.#jukebox = new CjsJukebox({
        library: musicLibrary,
        loadTrack: loadMusicTrack,
        isTrackAvailable: isMusicTrackAvailable
      });
    }
    if (mediaProvider !== null) {
      this.SetMediaProvider(mediaProvider);
    }
    if (library !== null) {
      this.InstallLibrary(library);
    }
  }

  /** Returns the installed immutable audio-library document. */
  get library() {
    return this.#library;
  }

  /** Returns the active low-level audio system, when a library is installed. */
  get system() {
    return this.#system;
  }

  /** Returns the Carbon audio manager, when a library is installed. */
  get manager() {
    return this.#system?.manager ?? null;
  }

  /** Returns the installed static-data repository. */
  get repository() {
    return this.#system?.repository ?? null;
  }

  /** Returns the manager-owned fixed Carbon listener. */
  get listener() {
    return this.#listener;
  }

  /** Returns Carbon's manager-owned, lazily created fixed music emitter. */
  get musicPlayer() {
    return this.GetMusicPlayer();
  }

  /** Returns the realized Web Audio backend after successful enablement. */
  get backend() {
    return this.#system?.backend ?? null;
  }

  /** Returns the active built-in or injected music engine. */
  get musicEngine() {
    return this.#system?.musicEngine ?? null;
  }

  /** Returns the optional neutral playlist player. */
  get jukebox() {
    return this.#jukebox;
  }

  /** Returns the active authored SFX interpreter, when installed. */
  get sfxEngine() {
    return this.#sfxEngine;
  }

  /** Returns the browser audio context after successful enablement. */
  get context() {
    return this.#context;
  }

  /** Returns the protected default bank names in deterministic order. */
  get defaultSoundBanks() {
    return [...this.#defaultSoundBanks].sort();
  }

  /** Returns bank intents retained for the next successful enable. */
  get banksWaitingToLoad() {
    return [...this.#banksWaitingToLoad].sort();
  }

  /**
   * Validates, detaches, and freezes one complete audio-library document.
   *
   * Replacing an installed library is allowed only while audio is disabled;
   * the old system and its adopted emitters are disposed.
   */
  InstallLibrary(library) {
    if (this.#system?.manager?.enabled) {
      throw new Error("CjsAudioMan cannot replace its library while enabled");
    }
    const installed = installAudioLibraryDocument(library);
    this.#jukebox?.Detach();
    this.#system?.Dispose();
    this.#listener = null;
    this.#musicPlayer = null;
    this.#sfxEngine?.Reset();
    this.#decodedMedia.clear();
    this.#wholeBanks.clear();
    this.#library = installed;
    this.#sfxEngine = installed.sfx ? new CjsSfxEngine({
      graph: installed.sfx,
      random: this.#random
    }) : null;
    this.#system = new CjsAudioSystem({
      ...this.#systemOptions,
      createContext: () => {
        const context = this.#context ?? this.#createContext();
        this.#context = context ?? null;
        return this.#context;
      },
      audioMetadata: installed.metadata,
      musicGraph: installed.music ?? null,
      loadBuffer: (eventID, eventName, controls) => this.#LoadEventBuffer(eventID, eventName, controls),
      loadMedia: sourceID => this.LoadMedia(sourceID),
      releaseGameObj: gameObjID => this.#sfxEngine?.ReleaseGameObj(gameObjID)
    });
    this.#listener = new _AudListener();
    this.#listener.SetPosition([0, 0, 1], [0, 1, 0], [0, 0, 0]);
    this.#listener.MarkPositionReceived();
    this.#system.AdoptEmitter(this.#listener);
    if (!this.#languagesExplicit) {
      this.#languages = installed.eventMediaLanguage ? NormalizeLanguages([installed.eventMediaLanguage]) : [];
    }
    return installed;
  }

  /** Installs or replaces the optional neutral music-library catalog. */
  InstallMusicLibrary(library) {
    this.#jukebox ??= new CjsJukebox();
    const installed = this.#jukebox.InstallLibrary(library);
    if (this.#context && this.#system?.backend?.masterGain) {
      this.#jukebox.Attach(this.#context, this.#system.backend.masterGain);
    }
    return installed;
  }

  /** Installs the caller-owned music-track acquisition function. */
  SetMusicTrackLoader(loadTrack) {
    this.#jukebox ??= new CjsJukebox();
    this.#jukebox.SetTrackLoader(loadTrack);
    return this.#jukebox;
  }

  /** Installs the caller-owned music-track availability probe. */
  SetMusicTrackAvailabilityChecker(isTrackAvailable) {
    this.#jukebox ??= new CjsJukebox();
    this.#jukebox.SetTrackAvailabilityChecker(isTrackAvailable);
    return this.#jukebox;
  }

  /**
   * Returns Carbon's fixed-id music emitter, creating and adopting it once.
   *
   * This emitter remains the authored Wwise event/switch/RTPC facade. The
   * neutral `jukebox` property is a separate direct-track player.
   */
  GetMusicPlayer() {
    const system = this.#RequireSystem();
    const existing = system.manager.GetAudioEmitter(3);
    if (existing) {
      if (!(existing instanceof _AudMusicPlayer)) {
        throw new Error("Audio game-object ID 3 is not an AudMusicPlayer");
      }
      this.#musicPlayer = existing;
      return existing;
    }
    this.#musicPlayer = system.AdoptEmitter(new _AudMusicPlayer());
    return this.#musicPlayer;
  }

  /**
   * Installs the structural provider used for future individual, whole-file,
   * and ranged reads. Providers perform acquisition only; they do not select
   * audio-library records.
   */
  SetMediaProvider(provider) {
    if (!provider || typeof provider.Read !== "function" && typeof provider.ReadRange !== "function") {
      throw new TypeError("CjsAudioMan mediaProvider must provide Read or ReadRange");
    }
    if (this.#system?.manager?.enabled) {
      throw new Error("CjsAudioMan cannot replace its media provider while enabled");
    }
    this.#mediaProvider = provider;
    this.#decodedMedia.clear();
    this.#wholeBanks.clear();
    return this;
  }

  /**
   * Sets the delivery constraint used for future selections.
   *
   * `auto` prefers individual prepared/original media, then embedded range
   * reads, then whole-bank reads. `individual` excludes embedded media,
   * `whole` disables ranges, and `range` requires ranges for embedded media.
   */
  SetDelivery(delivery) {
    const value = NormalizeDelivery(delivery);
    if (value !== this.#delivery) {
      this.#delivery = value;
      this.#decodedMedia.clear();
    }
    return this;
  }

  /** Sets the ordered language preferences used for future selections. */
  SetLanguages(languages) {
    const values = NormalizeLanguages(languages);
    this.#languagesExplicit = true;
    if (values.join("\0") !== this.#languages.join("\0")) {
      this.#languages = values;
      this.#decodedMedia.clear();
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
    languages = this.#languages,
    delivery = this.#delivery
  } = {}) {
    if (!this.#library) {
      throw new Error("CjsAudioMan has no installed audio library");
    }
    if (!this.#mediaProvider) {
      throw new Error("CjsAudioMan has no media provider");
    }
    const id = NormalizeMediaID(mediaID);
    const acceptedTypes = NormalizeMediaTypes(mediaTypes);
    const acceptedLanguages = NormalizeLanguages(languages);
    const mode = NormalizeDelivery(delivery);
    const candidates = this.#CreateCandidates(id, mode).map(candidate => ({
      candidate,
      mediaTypeRank: MediaTypeRank(candidate.mediaType, acceptedTypes),
      languageRank: LanguageRank(candidate.language, acceptedLanguages)
    })).filter(item => Number.isFinite(item.mediaTypeRank) && Number.isFinite(item.languageRank)).sort((left, right) => left.mediaTypeRank - right.mediaTypeRank || left.languageRank - right.languageRank || left.candidate.sourceRank - right.candidate.sourceRank || left.candidate.sourceID.localeCompare(right.candidate.sourceID, "en"));
    if (!candidates.length) {
      throw new Error(`No ${mode} representation is available for audio media ${id}`);
    }
    return candidates[0].candidate;
  }

  /**
   * Reads, prepares, decodes, and optionally retains one audio media ID.
   *
   * Concurrent requests for the same selected representation share one
   * pending operation. Failed operations are always evicted for retry.
   */
  LoadMedia(mediaID, options = {}) {
    if (!this.#context) {
      return Promise.reject(new Error("CjsAudioMan must be enabled before media can be decoded"));
    }
    let selection;
    try {
      selection = this.ResolveMedia(mediaID, options);
      ThrowIfAborted(options.signal);
    } catch (error) {
      return Promise.reject(error);
    }
    const retained = this.#decodedMedia.get(selection.selectionKey);
    if (retained) {
      return retained;
    }
    const operation = this.#ReadAndDecode(selection, options.signal).catch(error => {
      this.#decodedMedia.delete(selection.selectionKey);
      throw error;
    }).then(buffer => {
      if (!this.#cacheDecoded) {
        this.#decodedMedia.delete(selection.selectionKey);
      }
      return buffer;
    });
    this.#decodedMedia.set(selection.selectionKey, operation);
    return operation;
  }

  /** Releases every retained decode variant for one media ID. */
  ReleaseMedia(mediaID) {
    const id = NormalizeMediaID(mediaID);
    let count = 0;
    for (const key of [...this.#decodedMedia.keys()]) {
      if (key.startsWith(`${id}\0`)) {
        this.#decodedMedia.delete(key);
        count++;
      }
    }
    this.#system?.ReleaseMusicMedia(id);
    return count;
  }

  /** Releases all decoded media retained by the manager and music engine. */
  ClearMedia() {
    const count = this.#decodedMedia.size;
    this.#decodedMedia.clear();
    this.#system?.ClearMusicMedia();
    return count;
  }

  /** Releases whole-bank byte buffers retained for local embedded slicing. */
  ClearSourceData() {
    const count = this.#wholeBanks.size;
    this.#wholeBanks.clear();
    return count;
  }

  /** Attaches this manager to the static Carbon audio graph seams. */
  Attach() {
    return this.#RequireSystem().Attach();
  }

  /** Detaches this manager from the static Carbon audio graph seams. */
  Detach() {
    this.#system?.Detach();
  }

  /**
   * Attaches, realizes Web Audio, and enables Carbon audio.
   *
   * Call this from a browser user gesture. The default context factory uses
   * global AudioContext only at this point.
   */
  Enable(soundBanksToLoad = []) {
    const system = this.#RequireSystem();
    const requested = new Set([...this.#defaultSoundBanks, ...this.#banksWaitingToLoad, ...NormalizeBankNames(soundBanksToLoad)]);
    system.Attach();
    const enabled = system.Enable([...requested]);
    if (enabled && this.#listener) {
      this.#jukebox?.Attach(this.#context, system.backend?.masterGain ?? this.#context?.destination);
      this.#banksWaitingToLoad.clear();
      this.#listener.SetPosition(this.#listener.GetFront(), this.#listener.GetTop(), this.#listener.GetPosition());
    } else if (!enabled) {
      for (const bank of requested) {
        this.#banksWaitingToLoad.add(bank);
      }
    }
    return enabled;
  }

  /** Disables Carbon audio without destroying the reusable AudioContext. */
  Disable() {
    if (this.#system?.manager.GetStateValue() === 2) {
      this.#banksWaitingToLoad = new Set(this.#system.manager.GetLoadedSoundBanks());
    }
    this.#jukebox?.Stop();
    this.#system?.Disable();
  }

  /** Adds and loads one protected default soundbank. */
  AddAndLoadDefaultSoundBank(soundBankName) {
    const bank = NormalizeBankName(soundBankName);
    this.#defaultSoundBanks.add(bank);
    this.LoadSoundBank(bank);
    return bank;
  }

  /** Removes and unloads one protected default soundbank. */
  RemoveAndUnloadDefaultSoundBank(soundBankName) {
    const bank = NormalizeBankName(soundBankName);
    if (!this.#defaultSoundBanks.delete(bank)) {
      return false;
    }
    return this.UnloadSoundBank(bank);
  }

  /** Loads now when enabled, otherwise retains one bank intent. */
  LoadSoundBank(soundBankName) {
    const bank = NormalizeBankName(soundBankName);
    if (this.#system?.manager.GetStateValue() === 2) {
      this.#system.manager.LoadBank(bank);
    } else {
      this.#banksWaitingToLoad.add(bank);
    }
    return bank;
  }

  /** Loads several banks through the same desired-state facade. */
  LoadSoundBanks(soundBanks) {
    return NormalizeBankNames(soundBanks).map(bank => this.LoadSoundBank(bank));
  }

  /** Unloads one non-default bank or removes its pending load intent. */
  UnloadSoundBank(soundBankName) {
    const bank = NormalizeBankName(soundBankName);
    if (bank.toLowerCase() === "init.bnk" || this.#defaultSoundBanks.has(bank)) {
      return false;
    }
    this.#banksWaitingToLoad.delete(bank);
    this.#system?.manager.UnloadBank(bank);
    return true;
  }

  /** Unloads several non-default banks. */
  UnloadSoundBanks(soundBanks) {
    return NormalizeBankNames(soundBanks).filter(bank => this.UnloadSoundBank(bank));
  }

  /** Reconciles non-default banks with one caller-owned desired set. */
  SwapSoundBanks(soundBanks) {
    const requested = new Set(NormalizeBankNames(soundBanks));
    const loaded = new Set(this.#system?.manager.GetStateValue() === 2 ? this.#system.manager.GetLoadedSoundBanks() : this.#banksWaitingToLoad);
    const keep = new Set(["Init.bnk", ...this.#defaultSoundBanks, ...requested]);
    const toLoad = [...requested].filter(bank => !loaded.has(bank));
    const toUnload = [...loaded].filter(bank => !keep.has(bank));
    this.LoadSoundBanks(toLoad);
    this.UnloadSoundBanks(toUnload);
    return {
      loaded: toLoad.sort(),
      unloaded: toUnload.sort()
    };
  }

  /** Disables and re-enables while preserving the current desired banks. */
  ReloadSoundBanks() {
    const banks = this.GetLoadedSoundBanks();
    this.Disable();
    return this.Enable(banks);
  }

  /** Returns loaded and in-flight bank names from the Carbon manager. */
  GetLoadedSoundBanks() {
    return this.#system?.manager.GetLoadedSoundBanks() ?? [];
  }

  /** Returns Carbon's numeric uninitialized/disabled/enabled state. */
  GetState() {
    return this.#system?.manager.GetStateValue() ?? 0;
  }

  /** Sets one global RTPC when the audio manager is enabled. */
  SetGlobalRTPC(rtpcName, value) {
    if (rtpcName === "menu_main_music_level") {
      this.#jukebox?.SetVolume(value);
    }
    return this.#system?.manager.SetGlobalRTPC(rtpcName, value) ?? false;
  }

  /** Sets one global authored state when the audio manager is enabled. */
  SetState(stateGroup, stateName) {
    return this.#system?.manager.SetState(stateGroup, stateName) ?? false;
  }

  /** Stops emitter-routed and directly posted backend playback. */
  StopAllPlayingSounds() {
    this.#system?.manager.StopAll();
    this.#system?.backend?.StopAll();
    this.#jukebox?.Stop();
  }

  /** Drives culling, backend rendering, music, and log flushing. */
  Process(now) {
    this.#system?.Process(now);
  }

  /** Creates and adopts one Carbon audio emitter. */
  CreateEmitter(descriptor = {}) {
    return this.#RequireSystem().CreateEmitter(descriptor);
  }

  /** Adopts one existing Carbon audio game object. */
  AdoptEmitter(emitter) {
    return this.#RequireSystem().AdoptEmitter(emitter);
  }

  /** Adopts every audio game object reachable from a schema graph. */
  AdoptGraph(root) {
    return this.#RequireSystem().AdoptGraph(root);
  }

  /** Stops and unregisters one adopted Carbon audio game object. */
  ReleaseEmitter(emitter) {
    const released = this.#system?.ReleaseEmitter(emitter) ?? false;
    if (released && emitter === this.#musicPlayer) {
      this.#musicPlayer = null;
    }
    return released;
  }

  /** Releases every adopted audio game object reachable from a graph. */
  ReleaseGraph(root) {
    return this.#system?.ReleaseGraph(root) ?? [];
  }

  /** Replaces the optional host or built-in music engine. */
  SetMusicEngine(engine, options) {
    return this.#RequireSystem().SetMusicEngine(engine, options);
  }

  /** Posts an event directly to the active music engine. */
  PostMusicEvent(eventName, onFinished) {
    return this.#system?.PostMusicEvent(eventName, onFinished) ?? 0;
  }

  /** Stops one directly posted or emitter-routed music event. */
  StopMusicEvent(playingID, fadeOutDuration = 1000) {
    return this.#system?.StopMusicEvent(playingID, fadeOutDuration) ?? false;
  }

  /** Stops playback and releases graph, decode, and source-byte state. */
  Dispose() {
    this.#jukebox?.Dispose();
    this.#jukebox = null;
    this.#system?.Dispose();
    this.#system = null;
    this.#listener = null;
    this.#musicPlayer = null;
    this.#sfxEngine?.Reset();
    this.#sfxEngine = null;
    this.#context = null;
    this.#banksWaitingToLoad.clear();
    this.#decodedMedia.clear();
    this.#wholeBanks.clear();
  }

  /** Returns the installed lower-level system or rejects an uninstalled use. */
  #RequireSystem() {
    if (!this.#system) {
      throw new Error("CjsAudioMan has no installed audio library");
    }
    return this.#system;
  }

  /** Creates deterministic delivery candidates for one media identity. */
  #CreateCandidates(mediaID, delivery) {
    const candidates = [];
    const direct = NormalizeSourceRecords(this.#library.media[mediaID]);
    const embedded = NormalizeSourceRecords(this.#library.embeddedMedia?.[mediaID]);
    if (delivery !== "range" || typeof this.#mediaProvider.Read === "function") {
      for (let index = 0; index < direct.length; index++) {
        const source = direct[index];
        if (typeof this.#mediaProvider.Read !== "function" || !ProviderAllows(this.#mediaProvider, "CanRead", source, {
          kind: "media",
          mediaID
        })) {
          continue;
        }
        const mediaType = SourceMediaType(source);
        const sourceID = String(source.sourceID ?? `media:${mediaID}:${index}`);
        candidates.push(Object.freeze({
          mediaID,
          sourceID,
          selectionKey: SelectionKey(mediaID, sourceID, "individual"),
          sourceRank: IsPreparedMedia(source, mediaType) ? 0 : 1,
          route: "individual",
          mediaType,
          language: NormalizeLanguage(source.language ?? ""),
          offset: 0,
          byteLength: NormalizeOptionalByteLength(source.byteLength),
          source,
          bank: null
        }));
      }
    }
    if (delivery === "individual") {
      return candidates;
    }
    for (let index = 0; index < embedded.length; index++) {
      const source = embedded[index];
      const bank = this.#library.banks[String(source.bank ?? "")];
      if (!bank) {
        continue;
      }
      const offset = NormalizeNonNegativeInteger(source.offset, `Audio media ${mediaID} embedded offset`);
      const byteLength = NormalizePositiveInteger(source.byteLength, `Audio media ${mediaID} embedded byteLength`);
      const context = {
        kind: "bank-range",
        mediaID,
        offset,
        byteLength
      };
      let route = null;
      if ((delivery === "auto" || delivery === "range") && typeof this.#mediaProvider.ReadRange === "function" && ProviderAllows(this.#mediaProvider, "CanReadRange", bank, context)) {
        route = "range";
      } else if (delivery !== "range" && typeof this.#mediaProvider.Read === "function" && ProviderAllows(this.#mediaProvider, "CanRead", bank, {
        ...context,
        kind: "bank"
      })) {
        route = "whole";
      }
      if (!route) {
        continue;
      }
      const sourceID = String(source.sourceID ?? `embedded:${mediaID}:${String(source.bank)}:${index}`);
      candidates.push(Object.freeze({
        mediaID,
        sourceID,
        selectionKey: SelectionKey(mediaID, sourceID, route),
        sourceRank: 2,
        route,
        mediaType: SourceMediaType(source, "wem"),
        language: NormalizeLanguage(source.language ?? bank.language ?? ""),
        offset,
        byteLength,
        source,
        bank
      }));
    }
    return candidates;
  }

  /** Selects and loads one media buffer for an event. */
  async #LoadEventBuffer(eventID, eventName, controls = {}) {
    const spatial = !Boolean(this.#library?.metadata?.Events?.[eventName]?.is2D);
    if (this.#sfxEngine?.HandlesEvent(eventName)) {
      const engine = this.#sfxEngine;
      const selections = engine.ResolveEvent(eventName, controls);
      if (!selections.length) {
        return {
          voices: []
        };
      }
      const buffers = await Promise.all(selections.map(selection => this.LoadMedia(selection.mediaID)));
      return {
        voices: selections.map((selection, index) => ({
          buffer: buffers[index],
          loop: selection.loop,
          playbackRate: selection.playbackRate,
          spatial,
          getGain: () => engine.EvaluateGain(selection, controls)
        }))
      };
    }
    const values = this.#library?.eventMedia?.[eventName] ?? [];
    if (!values.length) {
      throw new Error(`Audio event has no resolved media: ${eventName}`);
    }
    let mediaID = values[0];
    if (this.#selectEventMedia) {
      mediaID = this.#selectEventMedia(Object.freeze({
        eventID,
        eventName,
        mediaIDs: Object.freeze([...values])
      }));
    }
    const id = NormalizeMediaID(mediaID);
    if (!values.some(value => String(value) === id)) {
      throw new Error(`Audio event selector returned unrelated media ${id} for ${eventName}`);
    }
    return {
      voices: [{
        buffer: await this.LoadMedia(id),
        spatial
      }]
    };
  }

  /** Reads and decodes one selected media representation. */
  async #ReadAndDecode(selection, signal) {
    ThrowIfAborted(signal);
    let result;
    if (selection.route === "individual") {
      result = await this.#mediaProvider.Read(selection.source, {
        signal,
        kind: "media",
        mediaID: selection.mediaID,
        mediaType: selection.mediaType,
        language: selection.language
      });
    } else if (selection.route === "range") {
      result = await this.#mediaProvider.ReadRange(selection.bank, {
        signal,
        kind: "bank-range",
        mediaID: selection.mediaID,
        offset: selection.offset,
        byteLength: selection.byteLength
      });
      result = await NormalizeRangeResult(result, selection);
    } else {
      const bankKey = String(selection.bank.sourceID ?? selection.source.bank ?? selection.bank.resPath ?? selection.bank.storagePath);
      let operation = this.#wholeBanks.get(bankKey);
      if (!operation) {
        operation = Promise.resolve(this.#mediaProvider.Read(selection.bank, {
          signal,
          kind: "bank",
          mediaID: selection.mediaID
        })).then(ToDetachedBytes);
        this.#wholeBanks.set(bankKey, operation);
        operation.catch(() => this.#wholeBanks.delete(bankKey));
      }
      const bytes = await operation;
      const end = selection.offset + selection.byteLength;
      if (end > bytes.byteLength) {
        throw new RangeError(`Audio media ${selection.mediaID} exceeds bank bytes`);
      }
      result = bytes.slice(selection.offset, end);
      if (!this.#cacheWholeBanks) {
        this.#wholeBanks.delete(bankKey);
      }
    }
    ThrowIfAborted(signal);
    return this.#DecodeResult(result, selection.mediaType);
  }

  /** Normalizes provider output and decodes it into an AudioBuffer-like value. */
  async #DecodeResult(result, mediaType) {
    const explicitBuffer = result?.audioBuffer ?? null;
    if (explicitBuffer) {
      return explicitBuffer;
    }
    if (IsAudioBufferLike(result)) {
      return result;
    }
    if (Array.isArray(result?.channelData) && Number(result.sampleRate) > 0) {
      return CreatePcmAudioBuffer(this.#context, result);
    }
    const returnedType = NormalizeMediaType(result?.mediaType ?? "");
    const type = !returnedType || returnedType === "application/octet-stream" ? NormalizeMediaType(mediaType) : returnedType;
    const bytes = await ToDetachedBytes(result);
    if (type === "wem") {
      const {
        CjsWemFormat
      } = await import('@carbonenginejs/runtime-resource/formats/wem');
      const metadata = CjsWemFormat.inspect(bytes);
      if (metadata.codec === "wwise-vorbis") {
        const ogg = CjsWemFormat.toOgg(bytes);
        return DecodeAudioData(this.#context, ogg.bytes);
      }
      if (metadata.codec === "wwise-ptadpcm" || metadata.codec === "pcm" || metadata.codec === "pcm-extensible") {
        return CreatePcmAudioBuffer(this.#context, CjsWemFormat.toPcm(bytes));
      }
    }
    return DecodeAudioData(this.#context, bytes);
  }
}

/** Creates the browser's supported AudioContext without touching it at import time. */
function CreateBrowserAudioContext() {
  const Constructor = globalThis.AudioContext ?? globalThis.webkitAudioContext ?? null;
  return Constructor ? new Constructor() : null;
}
function NormalizeDelivery(value) {
  const delivery = String(value ?? "auto").trim().toLowerCase();
  if (!DELIVERY_MODES.has(delivery)) {
    throw new TypeError(`Unsupported audio delivery mode: ${value}`);
  }
  return delivery;
}
function NormalizeMediaID(value) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number <= 0 || number > 0xffffffff) {
    throw new TypeError("Audio media ID must be a positive unsigned 32-bit integer");
  }
  return String(number >>> 0);
}
function NormalizeSourceRecords(value) {
  if (value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}
function NormalizeLanguages(values) {
  const input = Array.isArray(values) ? values : values === null || values === undefined ? [] : [values];
  return [...new Set(input.map(NormalizeLanguage).filter(Boolean))];
}
function NormalizeBankNames(values) {
  if (typeof values === "string" || !values?.[Symbol.iterator]) {
    throw new TypeError("Audio soundbanks must be an iterable of names");
  }
  return [...new Set([...values].map(NormalizeBankName))];
}
function NormalizeBankName(value) {
  const bank = String(value ?? "").trim();
  if (!bank) {
    throw new TypeError("Audio soundbank names must be non-empty strings");
  }
  return bank;
}
function NormalizeLanguage(value) {
  const language = String(value ?? "").trim().replaceAll("_", "-").toLowerCase();
  if (language && !/^[a-z]{2,8}(?:-[a-z0-9]{1,8})*$/u.test(language)) {
    throw new TypeError(`Invalid audio language tag: ${value}`);
  }
  return language;
}
function NormalizeMediaTypes(values) {
  const input = Array.isArray(values) ? values : values === null || values === undefined ? [] : [values];
  return [...new Set(input.map(NormalizeMediaType).filter(Boolean))];
}
function NormalizeMediaType(value) {
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
    "application/x-wwise-wem": "wem"
  };
  return aliases[type] ?? type.replace(/^\./u, "");
}
function SourceMediaType(record, fallback = "") {
  const explicit = NormalizeMediaType(record.mediaType ?? record.mimeType ?? "");
  if (explicit) {
    return explicit;
  }
  const path = String(record.resPath ?? record.logicalPath ?? record.path ?? record.storagePath ?? "").split(/[?#]/u, 1)[0];
  const extension = path.match(/\.([a-z0-9]+)$/iu)?.[1] ?? fallback;
  return NormalizeMediaType(extension);
}
function IsPreparedMedia(record, mediaType) {
  return record.prepared === true || !ORIGINAL_MEDIA_TYPES.has(mediaType);
}
function LanguageRank(language, accepted) {
  if (!accepted.length) {
    return language ? 1 : 0;
  }
  const exact = accepted.indexOf(language);
  if (exact >= 0) {
    return exact;
  }
  return language ? Number.POSITIVE_INFINITY : accepted.length;
}
function MediaTypeRank(mediaType, accepted) {
  if (!accepted.length) {
    return 0;
  }
  const index = accepted.indexOf(mediaType);
  return index >= 0 ? index : Number.POSITIVE_INFINITY;
}
function ProviderAllows(provider, method, source, context) {
  return typeof provider[method] !== "function" || provider[method](source, context) !== false;
}
function SelectionKey(mediaID, sourceID, route) {
  return `${mediaID}\0${sourceID}\0${route}`;
}
function NormalizeOptionalByteLength(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  return NormalizeNonNegativeInteger(value, "Audio media byteLength");
}
function NormalizeNonNegativeInteger(value, label) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0) {
    throw new TypeError(`${label} must be a non-negative integer`);
  }
  return number;
}
function NormalizePositiveInteger(value, label) {
  const number = NormalizeNonNegativeInteger(value, label);
  if (number === 0) {
    throw new TypeError(`${label} must be greater than zero`);
  }
  return number;
}
function ThrowIfAborted(signal) {
  if (!signal?.aborted) {
    return;
  }
  if (typeof signal.throwIfAborted === "function") {
    signal.throwIfAborted();
  }
  throw signal.reason ?? new DOMException("Aborted", "AbortError");
}
async function NormalizeRangeResult(result, selection) {
  const bytes = await ToDetachedBytes(result);
  if (bytes.byteLength === selection.byteLength) {
    return bytes;
  }
  const end = selection.offset + selection.byteLength;
  if ((result?.complete === true || bytes.byteLength >= end) && end <= bytes.byteLength) {
    return bytes.slice(selection.offset, end);
  }
  throw new RangeError(`Audio range for media ${selection.mediaID} returned ` + `${bytes.byteLength} bytes; expected ${selection.byteLength}`);
}
async function ToDetachedBytes(value) {
  const input = value?.bytes ?? value;
  if (input instanceof ArrayBuffer) {
    return new Uint8Array(input.slice(0));
  }
  if (ArrayBuffer.isView(input)) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength).slice();
  }
  if (typeof input?.arrayBuffer === "function") {
    return new Uint8Array(await input.arrayBuffer()).slice();
  }
  throw new TypeError("Audio provider results must contain bytes or an AudioBuffer");
}
function IsAudioBufferLike(value) {
  return Boolean(value && typeof value === "object" && typeof value.getChannelData === "function" && Number.isFinite(Number(value.sampleRate)));
}
function CreatePcmAudioBuffer(context, payload) {
  if (!context || typeof context.createBuffer !== "function") {
    throw new TypeError("AudioContext.createBuffer is required for decoded WEM PCM");
  }
  const channelData = payload.channelData;
  const channels = Number(payload.channels ?? channelData.length);
  const sampleRate = Number(payload.sampleRate);
  const sampleCount = Number(payload.sampleCount ?? channelData[0]?.length ?? 0);
  const buffer = context.createBuffer(channels, sampleCount, sampleRate);
  for (let channel = 0; channel < channels; channel++) {
    if (typeof buffer.copyToChannel === "function") {
      buffer.copyToChannel(channelData[channel], channel);
    } else {
      buffer.getChannelData(channel).set(channelData[channel]);
    }
  }
  return buffer;
}
function DecodeAudioData(context, bytes) {
  if (!context || typeof context.decodeAudioData !== "function") {
    return Promise.reject(new TypeError("AudioContext.decodeAudioData is required for encoded media"));
  }
  const input = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return new Promise((resolve, reject) => {
    let result;
    try {
      result = context.decodeAudioData(input, resolve, reject);
    } catch (error) {
      reject(error);
      return;
    }
    if (result && typeof result.then === "function") {
      result.then(resolve, reject);
    }
  });
}

export { CjsAudioMan };
//# sourceMappingURL=CjsAudioMan.js.map
