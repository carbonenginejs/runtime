import { normalizeWwiseDynamicsMode, parseGraphSharedBusEffect, createBusEffectChain } from './busEffects.js';
import { indexBusRtpcCatalog, busRtpcPathUses } from './busRtpc.js';
import { indexBusStateCatalog, busStatePathUses } from './busState.js';
import { scheduleSharedBusFilter } from './busFilter.js';
import { scheduleSharedBusDuckGain } from './busDuckGain.js';
import { scheduleSharedBusFader } from './busFader.js';
import { wwiseDbRtpcValueToDb } from './wwiseRtpc.js';

const KINDS = new Set(["sfx", "music"]);
const DISTRIBUTED_CONTROL_REASONS = new Set(["ducking", "rtpc", "state"]);
const MIN_AUDIBLE_GAIN_DB = -96;
const SILENT_AUX_REASONS = new Set(["auxiliary-bus", "rtpc", "state"]);

/**
 * Owns the shared Web Audio node topology for strictly qualified Bus routes.
 * Accepts strict dry paths, source-proven static Parametric EQ and Delay
 * stages, explicitly feedback-free Wwise Meter telemetry omissions, and exact
 * post-effect faders for the globally shared Bus gain contributions.
 */
class CjsSharedBusMixer {
  #context = null;
  #runtime = null;
  #catalog = null;
  #destination = null;
  #buses = new Map();
  #entries = new Map();
  #qualification = new Map();
  #routeAuxSends = new Map();
  #busEffects = new Map();
  #busRtpcs = new Map();
  #busStates = new Map();
  #silentAuxReturnGains = new Map();
  #auxSendGains = new Map();
  #routeFilters = new Map();
  #routeDuckGains = new Map();
  #busDuckingController = null;
  #readGlobalRtpc = null;
  #readGlobalRtpcTransitionBoundaries = null;
  #readGlobalStateWeights = null;
  #readGlobalStateTransitionBoundaries = null;
  #wwiseDynamics = "strict";
  #categoryVolumes = new Map([["sfx", 1], ["music", 1]]);
  #disposed = false;

  /** Creates a generation-scoped mixer for one validated Bus graph. */
  constructor({
    context,
    runtime,
    destination,
    busRtpcs,
    busStates,
    busDuckingController,
    getGlobalRTPC,
    getGlobalRTPCTransitionBoundaries,
    getGlobalStatePropertyWeights,
    getGlobalStateTransitionBoundaries,
    wwiseDynamics = "strict"
  } = {}) {
    if (!context || typeof context.createGain !== "function") {
      throw new TypeError("Shared Audio Bus mixer requires an AudioContext with createGain");
    }
    if (!runtime || typeof runtime.GetCatalog !== "function" || typeof runtime.OwnsRouteHandle !== "function") {
      throw new TypeError("Shared Audio Bus mixer requires one Bus graph runtime");
    }
    const catalog = runtime.GetCatalog();
    if (!catalog || catalog.schemaVersion !== 1) {
      throw new TypeError("Shared Audio Bus mixer requires one live version-1 catalog");
    }
    if (!destination || typeof destination !== "object") {
      throw new TypeError("Shared Audio Bus mixer requires a destination node");
    }
    this.#context = context;
    this.#runtime = runtime;
    this.#catalog = catalog;
    this.#destination = destination;
    this.#wwiseDynamics = normalizeWwiseDynamicsMode(wwiseDynamics);
    this.#busRtpcs = indexBusRtpcCatalog(busRtpcs);
    this.#busStates = indexBusStateCatalog(busStates);
    this.#busDuckingController = busDuckingController ?? null;
    this.#readGlobalRtpc = typeof getGlobalRTPC === "function" ? getGlobalRTPC : null;
    this.#readGlobalRtpcTransitionBoundaries = typeof getGlobalRTPCTransitionBoundaries === "function" ? getGlobalRTPCTransitionBoundaries : null;
    this.#readGlobalStateWeights = typeof getGlobalStatePropertyWeights === "function" ? getGlobalStatePropertyWeights : null;
    this.#readGlobalStateTransitionBoundaries = typeof getGlobalStateTransitionBoundaries === "function" ? getGlobalStateTransitionBoundaries : null;
  }

  /**
   * Gets a stable category entry for a qualified route, or null when any
   * authored processing barrier remains on its dry ancestry.
   */
  GetInput(handle, kind, {
    allowAudibleAux = true
  } = {}) {
    if (this.#disposed || !this.#runtime?.OwnsRouteHandle(handle)) {
      return null;
    }
    const category = String(kind);
    if (!KINDS.has(category)) {
      throw new TypeError(`Unsupported shared Audio Bus category ${category}`);
    }
    // Audio Bus Voice Volume is a per-voice stage. The SFX backend owns
    // that placement; built-in music must not silently treat it as Bus
    // Volume merely because a future bank routes music through the Bus.
    if (category === "music" && busRtpcPathUses(this.#busRtpcs, handle.route?.busPathIds, "voice-volume")) {
      return null;
    }
    if (!this.#IsRouteQualified(handle)) {
      return null;
    }
    const auxSends = this.#routeAuxSends.get(handle) ?? [];

    // The first exact wet-path slice is SFX-only. Music remains
    // fail-closed until its lifetime and transport tests cover fan-out.
    if (category === "music" && auxSends.length) {
      return null;
    }
    if (!allowAudibleAux && auxSends.length) {
      return null;
    }
    const key = `${handle.index}:${category}`;
    let entry = this.#entries.get(key);
    if (!entry) {
      entry = this.#context.createGain();
      SetParam(entry.gain, this.#categoryVolumes.get(category));
      const dryFilters = this.#CreateRouteFilters(auxSends.length ? auxSends[0].dryPathIds : []);
      const dryDuck = this.#CreateRouteDuckGain(auxSends.length ? auxSends[0].dryPathIds : []);
      const dryInput = this.#GetBusInput(handle.route.outputBusId);
      entry.connect(dryFilters?.input ?? dryDuck?.node ?? dryInput);
      dryFilters?.output.connect(dryDuck?.node ?? dryInput);
      dryDuck?.node.connect(dryInput);
      const sendGains = [];
      const filterRecords = [...(dryFilters?.records ?? [])];
      const duckRecords = [...(dryDuck ? [dryDuck] : [])];
      for (const send of auxSends) {
        const sendGain = this.#context.createGain();
        const wetFilters = this.#CreateRouteFilters(send.wetPathIds);
        const wetDuck = this.#CreateRouteDuckGain(send.wetPathIds);
        const wetInput = this.#GetBusInput(send.targetBusId);
        SetParam(sendGain.gain, 10 ** (send.gainDb / 20));
        entry.connect(sendGain);
        sendGain.connect(wetFilters?.input ?? wetDuck?.node ?? wetInput);
        wetFilters?.output.connect(wetDuck?.node ?? wetInput);
        wetDuck?.node.connect(wetInput);
        sendGains.push(sendGain);
        filterRecords.push(...(wetFilters?.records ?? []));
        if (wetDuck) duckRecords.push(wetDuck);
      }
      if (sendGains.length) this.#auxSendGains.set(key, sendGains);
      if (filterRecords.length) this.#routeFilters.set(key, filterRecords);
      if (duckRecords.length) this.#routeDuckGains.set(key, duckRecords);
      this.#entries.set(key, entry);
    }
    return entry;
  }

  /** Returns whether this mixer owns whole-path State filters for a route. */
  OwnsRouteStateFilters(handle) {
    return !this.#disposed && this.#runtime?.OwnsRouteHandle(handle) && this.#IsRouteQualified(handle) && (this.#routeAuxSends.get(handle)?.length ?? 0) > 0;
  }

  /** Updates existing and future category entries without merging routes. */
  SetCategoryVolume(kind, value) {
    const category = String(kind);
    if (!KINDS.has(category)) {
      throw new TypeError(`Unsupported shared Audio Bus category ${category}`);
    }
    const volume = Math.max(0, Math.min(1, Number(value) || 0));
    this.#categoryVolumes.set(category, volume);
    for (const [key, entry] of this.#entries) {
      if (key.endsWith(`:${category}`)) {
        SetParam(entry.gain, volume);
      }
    }
  }

  /** Re-evaluates every allocated physical Bus fader and State filter. */
  RefreshBusControls() {
    if (this.#disposed) return;
    for (const [busId, realized] of this.#buses) {
      if (realized.busGain) {
        this.#ScheduleBusFader(busId, realized.busGain.gain);
      }
    }
    for (const records of this.#routeFilters.values()) {
      for (const record of records) this.#ScheduleRouteFilter(record);
    }
    for (const records of this.#routeDuckGains.values()) {
      for (const record of records) this.#ScheduleRouteDuckGain(record);
    }
  }

  /** @deprecated Use RefreshBusControls. */
  RefreshBusFaders() {
    this.RefreshBusControls();
  }

  /** Disconnects every entry and shared Bus node. Safe to call repeatedly. */
  Dispose() {
    if (this.#disposed) return;
    this.#disposed = true;
    for (const entry of this.#entries.values()) entry.disconnect?.();
    for (const gains of this.#auxSendGains.values()) {
      for (const gain of gains) gain.disconnect?.();
    }
    for (const records of this.#routeFilters.values()) {
      for (const record of records) record.node.disconnect?.();
    }
    for (const records of this.#routeDuckGains.values()) {
      for (const record of records) record.node.disconnect?.();
    }
    for (const bus of this.#buses.values()) {
      bus.input.disconnect?.();
      bus.busGain?.disconnect?.();
      for (const node of bus.effectNodes) node.disconnect?.();
    }
    this.#entries.clear();
    this.#buses.clear();
    this.#qualification.clear();
    this.#routeAuxSends.clear();
    this.#busEffects.clear();
    this.#busRtpcs.clear();
    this.#busStates.clear();
    this.#silentAuxReturnGains.clear();
    this.#auxSendGains.clear();
    this.#routeFilters.clear();
    this.#routeDuckGains.clear();
    this.#busDuckingController = null;
    this.#readGlobalRtpc = null;
    this.#readGlobalRtpcTransitionBoundaries = null;
    this.#readGlobalStateWeights = null;
    this.#readGlobalStateTransitionBoundaries = null;
    this.#categoryVolumes.clear();
    this.#catalog = null;
    this.#runtime = null;
    this.#destination = null;
    this.#context = null;
  }

  /** Qualifies a complete dry route before allocating any audio nodes. */
  #IsRouteQualified(handle) {
    if (this.#qualification.has(handle)) {
      return this.#qualification.get(handle);
    }
    const route = handle.route;
    let qualified = Array.isArray(route?.busPathIds) && route.busPathIds.length > 0 && route.outputBusId === route.busPathIds[0];
    const pathIds = new Set();
    let hasDistributedControls = Boolean(this.#busDuckingController?.PathHasTarget?.(route.busPathIds));
    let hasAudibleEffect = false;
    let authoredBusVolumeDb = 0;
    for (let index = 0; qualified && index < route.busPathIds.length; index++) {
      const busId = route.busPathIds[index];
      const bus = this.#catalog.buses?.[busId];
      const parentBusId = index + 1 < route.busPathIds.length ? route.busPathIds[index + 1] : undefined;
      const effects = this.#GetQualifiedBusEffects(busId, bus);
      if (pathIds.has(busId) || !bus || bus.parentBusId !== parentBusId || bus.type !== "audio-bus" || bus.channelConfig?.raw !== 0 || !IsNeutralPositioning(bus.positioning) || !IsDisabledHdr(bus.hdr) || !this.#HasOnlySilentUserAuxSends(bus) || !this.#CanRealizeBusFader(busId, bus) || effects === null) {
        qualified = false;
        break;
      }
      pathIds.add(busId);
      authoredBusVolumeDb += Number(bus.busVolumeDb ?? 0);
      const busPath = [String(busId)];
      hasDistributedControls ||= busRtpcPathUses(this.#busRtpcs, busPath, "voice-volume") || busStatePathUses(this.#busStates, busPath, "pitchCents") || busStatePathUses(this.#busStates, busPath, "lowPass") || busStatePathUses(this.#busStates, busPath, "highPass") || bus.busVolumeActionControlled === true || bus.requiresProcessing.includes("ducking");
      hasAudibleEffect ||= effects.some(effect => effect.type !== "meter-omission");
    }
    if (qualified && authoredBusVolumeDb !== Number(route.authoredBusVolumeDb ?? 0)) {
      qualified = false;
    }
    // Existing dry-route controllers realize these controls before the
    // shared topology. Preserve that ordering across the complete ancestry,
    // not merely within the Bus that declares each stage.
    if (qualified && hasDistributedControls && hasAudibleEffect) {
      qualified = false;
    }
    const auxSends = qualified ? this.#GetRouteAuxSends(route, pathIds) : null;
    if (auxSends === null) {
      qualified = false;
    } else if (qualified) {
      this.#routeAuxSends.set(handle, auxSends);
    }
    this.#qualification.set(handle, qualified);
    return qualified;
  }

  /** Returns whether one physical Bus fader has every required live reader. */
  #CanRealizeBusFader(busId, bus) {
    const path = [String(busId)];
    const usesRtpc = busRtpcPathUses(this.#busRtpcs, path, "bus-volume");
    const usesState = busStatePathUses(this.#busStates, path, "gainDb");
    return (!usesRtpc || this.#readGlobalRtpc && this.#readGlobalRtpcTransitionBoundaries) && (!usesState || this.#readGlobalStateWeights && this.#readGlobalStateTransitionBoundaries) && Number.isFinite(Number(bus?.busVolumeDb ?? 0));
  }

  /** Decodes one Bus's complete active effect sequence, or returns null. */
  #GetQualifiedBusEffects(busId, bus) {
    const id = String(busId);
    if (this.#busEffects.has(id)) {
      return this.#busEffects.get(id);
    }
    let effects = null;
    try {
      const activeSlots = bus?.bypassAllEffects ? [] : [...(bus?.effects ?? [])].filter(slot => !slot.bypass).sort((left, right) => left.slotIndex - right.slotIndex);
      const reasons = bus?.requiresProcessing ?? [];
      const slotIndices = new Set();
      const reasonSet = new Set(reasons);
      const allowedReasons = new Set(DISTRIBUTED_CONTROL_REASONS);
      if (activeSlots.length) allowedReasons.add("effects");
      if (bus?.type === "auxiliary-bus") {
        allowedReasons.add("auxiliary-bus");
      }
      if (bus?.userAuxSends?.length && this.#HasOnlySilentUserAuxSends(bus)) {
        allowedReasons.add("aux-sends");
      }
      if (reasonSet.size !== reasons.length || reasonSet.has("effects") !== Boolean(activeSlots.length) || reasons.some(reason => !allowedReasons.has(reason))) {
        throw new TypeError("Audio Bus has unsupported processing");
      }
      effects = activeSlots.map(slot => {
        if (!Number.isSafeInteger(slot.slotIndex) || slot.slotIndex < 0 || slot.slotIndex > 3 || slotIndices.has(slot.slotIndex) || slot.rendered !== false) {
          throw new TypeError("Audio Bus effect slot is unsupported");
        }
        slotIndices.add(slot.slotIndex);
        const graphEffect = this.#catalog.effects?.[slot.effectId];
        const shareSet = graphEffect?.type === "effect-share-set";
        if (slot.shareSet !== shareSet) {
          throw new TypeError("Audio Bus effect ShareSet identity disagrees");
        }
        return parseGraphSharedBusEffect(graphEffect, slot.effectId, slot.slotIndex, {
          wwiseDynamics: this.#wwiseDynamics
        });
      });
      if (effects.some(effect => effect.type === "parametric-eq" && effect.bands.length) && typeof this.#context.createBiquadFilter !== "function") {
        throw new TypeError("Static Parametric EQ requires BiquadFilter support");
      }
      if (effects.some(effect => effect.type === "delay") && typeof this.#context.createDelay !== "function") {
        throw new TypeError("Static Wwise Delay requires DelayNode support");
      }
      if (effects.some(effect => effect.type === "compressor-approximation" || effect.type === "peak-limiter-approximation") && typeof this.#context.createDynamicsCompressor !== "function") {
        throw new TypeError("Approximate Wwise dynamics requires DynamicsCompressorNode support");
      }
      if (effects.some(effect => effect.type === "peak-limiter-approximation" && effect.lookaheadSeconds > 0.006) && typeof this.#context.createDelay !== "function") {
        throw new TypeError("Approximate Wwise Peak Limiter lookahead requires DelayNode support");
      }
      if (reasonSet.has("rtpc") && !this.#busRtpcs.has(id) || reasonSet.has("state") && !this.#busStates.has(id) || reasonSet.has("ducking") && !this.#busDuckingController?.HasSource?.(id)) {
        throw new TypeError("Audio Bus distributed control catalog is incomplete");
      }
      effects = Object.freeze(effects);
    } catch {
      effects = null;
    }
    this.#busEffects.set(id, effects);
    return effects;
  }

  /**
   * Qualifies one exact route-level static user send, or proves all sends
   * silent. The wet branch must rejoin the dry ancestry before any
   * branch-exclusive pitch, action, or gain-placement ambiguity.
   */
  #GetRouteAuxSends(route, dryPathIds) {
    if (!route || !Array.isArray(route.userAuxSends) || route.reflectionsAuxSend !== undefined) {
      return null;
    }
    if (this.#HasOnlySilentUserAuxSends(route)) return Object.freeze([]);
    if (route.userAuxSends.length !== 1 || Number(route.authoredBusMakeUpGainDb ?? 0) !== 0 || Number(route.authoredOutputBusVolumeDb ?? 0) !== 0) {
      return null;
    }
    const send = route.userAuxSends[0];
    if (!send || send.dynamic !== false || Number(send.lowPass) !== 0 || Number(send.highPass) !== 0 || !Number.isFinite(Number(send.gainDb))) {
      return null;
    }
    const wetExclusive = [];
    const active = new Set();
    let current = String(send.targetBusId ?? "");
    let joinBusId = "";
    while (current) {
      if (dryPathIds.has(current)) {
        joinBusId = current;
        break;
      }
      if (active.has(current)) return null;
      active.add(current);
      wetExclusive.push(current);
      current = String(this.#catalog.buses?.[current]?.parentBusId ?? "");
    }
    if (!joinBusId || !wetExclusive.length) return null;
    const dryPath = [...dryPathIds];
    const joinIndex = dryPath.indexOf(joinBusId);
    const dryExclusive = dryPath.slice(0, joinIndex);
    const wetPath = [...wetExclusive, ...dryPath.slice(joinIndex)];
    const combined = [...wetExclusive, ...dryPath];
    if (!this.#CanSplitDuckingProperties(combined) || !this.#CanRealizeRouteFilters(dryPath) || !this.#CanRealizeRouteFilters(wetPath) || this.#busDuckingController?.PathHasTarget?.(wetExclusive, "voice-volume")) {
      return null;
    }
    for (let index = 0; index < combined.length; index++) {
      const busId = combined[index];
      const bus = this.#catalog.buses?.[busId];
      const effects = this.#GetQualifiedBusEffects(busId, bus);
      const wetIndex = wetExclusive.indexOf(busId);
      const expectedType = wetIndex === 0 ? "auxiliary-bus" : "audio-bus";
      if (!bus || wetIndex >= 0 && bus.type !== expectedType || wetIndex < 0 && bus.type !== "audio-bus" || bus.channelConfig?.raw !== 0 || !IsNeutralPositioning(bus.positioning) || !IsDisabledHdr(bus.hdr) || bus.userAuxSends?.length !== 0 || bus.reflectionsAuxSend !== undefined || bus.busVolumeActionControlled === true || bus.busVolumeMayIncrease === true || (Number(bus.makeUpGainDb) || 0) !== 0 || (Number(bus.outputBusVolumeDb) || 0) !== 0 || !this.#CanRealizeBusFader(busId, bus) || effects === null || effects.some(effect => effect.type !== "meter-omission")) {
        return null;
      }
    }
    for (const busId of [...dryExclusive, ...wetExclusive]) {
      const wetOnly = wetExclusive.includes(busId);
      if (busStatePathUses(this.#busStates, [busId], "pitchCents") || wetOnly && this.#busDuckingController?.HasSource?.(busId) || wetExclusive.includes(busId) && busRtpcPathUses(this.#busRtpcs, [busId], "voice-volume")) {
        return null;
      }
    }
    return Object.freeze([Object.freeze({
      targetBusId: String(send.targetBusId),
      gainDb: Number(send.gainDb),
      dryPathIds: Object.freeze(dryPath),
      wetPathIds: Object.freeze(wetPath)
    })]);
  }

  /** Proves one combined dry/wet ancestry can separate duck properties. */
  #CanSplitDuckingProperties(busPathIds) {
    return !this.#busDuckingController || this.#busDuckingController.CanSplitTargetProperties?.(busPathIds) === true;
  }

  /** Returns whether one whole-route State filter has every required seam. */
  #CanRealizeRouteFilters(busPathIds) {
    const usesFilters = busStatePathUses(this.#busStates, busPathIds, "lowPass") || busStatePathUses(this.#busStates, busPathIds, "highPass");
    return !usesFilters || this.#readGlobalStateWeights && this.#readGlobalStateTransitionBoundaries && typeof this.#context.createBiquadFilter === "function";
  }

  /** Returns whether every authored user send is provably below Wwise silence. */
  #HasOnlySilentUserAuxSends(owner) {
    if (!owner || !Array.isArray(owner.userAuxSends) || owner.reflectionsAuxSend !== undefined) {
      return false;
    }
    return owner.userAuxSends.every(send => send && send.dynamic === false && Number(send.lowPass) === 0 && Number(send.highPass) === 0 && Number.isFinite(Number(send.gainDb)) && this.#SilentAuxReturnGainDb(send.targetBusId) !== null && Number(send.gainDb) + this.#SilentAuxReturnGainDb(send.targetBusId) <= MIN_AUDIBLE_GAIN_DB);
  }

  /**
   * Proves one static Auxiliary Bus return cannot rise above Wwise's
   * -96 dB silence threshold. Audible, dynamic, or signal-escaping wet paths
   * remain barriers; this is an omission proof rather than aux realization.
   */
  #SilentAuxReturnGainDb(targetBusId) {
    const targetId = String(targetBusId ?? "");
    if (this.#silentAuxReturnGains.has(targetId)) {
      return this.#silentAuxReturnGains.get(targetId);
    }
    let gainDb = 0;
    let current = targetId;
    const path = [];
    const active = new Set();
    let valid = Boolean(current);
    while (valid && current) {
      if (active.has(current)) {
        valid = false;
        break;
      }
      active.add(current);
      path.push(current);
      const bus = this.#catalog.buses?.[current];
      const reasons = bus?.requiresProcessing;
      const first = path.length === 1;
      if (!bus || first && bus.type !== "auxiliary-bus" || bus.type !== "audio-bus" && bus.type !== "auxiliary-bus" || bus.channelConfig?.raw !== 0 || !IsNeutralPositioning(bus.positioning) || !IsDisabledHdr(bus.hdr) || !Array.isArray(bus.userAuxSends) || bus.userAuxSends.length !== 0 || bus.reflectionsAuxSend !== undefined || !Array.isArray(bus.effects) || !Array.isArray(reasons) || reasons.some(reason => !SILENT_AUX_REASONS.has(reason)) || bus.busVolumeMayIncrease === true || !this.#HasOnlyInertBypassedEffects(bus) || !this.#AccumulateSilentControlUpperBound(current, reasons, value => {
        gainDb += value;
      })) {
        valid = false;
        break;
      }
      for (const field of ["busVolumeDb", "makeUpGainDb", "outputBusVolumeDb"]) {
        if (bus[field] === undefined) continue;
        const value = Number(bus[field]);
        if (!Number.isFinite(value)) {
          valid = false;
          break;
        }
        gainDb += value;
      }
      current = bus.parentBusId === undefined ? "" : String(bus.parentBusId);
    }
    if (valid && this.#busDuckingController?.PathHasTarget?.(path)) {
      valid = false;
    }
    const result = valid && gainDb <= MIN_AUDIBLE_GAIN_DB ? gainDb : null;
    this.#silentAuxReturnGains.set(targetId, result);
    return result;
  }

  /** Rejects bypassed slots that still carry media, controls, or rendering. */
  #HasOnlyInertBypassedEffects(bus) {
    for (const slot of bus.effects) {
      if (!bus.bypassAllEffects && slot?.bypass !== true || slot?.rendered !== false) {
        return false;
      }
      const effect = this.#catalog.effects?.[slot.effectId];
      const controls = effect?.controls;
      if (!effect || !Array.isArray(effect.media) || effect.media.length !== 0 || !controls || controls.rtpcCount !== 0 || controls.statePropertyCount !== 0 || controls.stateGroupCount !== 0 || controls.propertyValueCount !== 0) {
        return false;
      }
    }
    return true;
  }

  /** Adds maximum installed RTPC gain and rejects any control that can amplify. */
  #AccumulateSilentControlUpperBound(busId, reasons, add) {
    const id = String(busId);
    const curves = this.#busRtpcs.get(id) ?? [];
    const groups = this.#busStates.get(id) ?? [];
    const hasRtpcs = curves.length > 0;
    const hasStates = groups.length > 0;
    if (reasons.includes("rtpc") !== hasRtpcs || reasons.includes("state") !== hasStates) {
      return false;
    }
    for (const curve of curves) {
      if (!Array.isArray(curve?.points) || curve.points.length === 0) {
        return false;
      }
      let maximum = -Infinity;
      for (const point of curve.points) {
        const raw = Number(point?.value);
        if (!Number.isFinite(raw) || raw < -1 || raw > 1) {
          return false;
        }
        maximum = Math.max(maximum, wwiseDbRtpcValueToDb(raw));
      }
      if (!Number.isFinite(maximum) || maximum > 0) {
        return false;
      }
      // Voice Volume belongs before the voice's dry/wet split. It may
      // prove non-amplifying here, but it cannot be credited as
      // attenuation on the already-mixed Auxiliary Bus return.
      if (curve.property !== "voice-volume") add(maximum);
    }
    for (const group of groups) {
      if (!(group?.states instanceof Map)) return false;
      for (const state of new Set(group.states.values())) {
        const value = state?.gainDb === undefined ? 0 : Number(state.gainDb);
        if (!Number.isFinite(value) || value > 0) {
          return false;
        }
      }
    }
    return true;
  }

  /** Lazily realizes and returns one shared physical Bus input. */
  #GetBusInput(busId) {
    const id = String(busId);
    let realized = this.#buses.get(id);
    if (realized) {
      return realized.input;
    }
    const bus = this.#catalog.buses[id];
    const input = this.#context.createGain();
    const effectChain = createBusEffectChain(this.#context, this.#busEffects, [id]);
    const busGain = this.#BusNeedsFader(id, bus) ? this.#context.createGain() : null;
    realized = {
      input,
      effectNodes: effectChain?.nodes ?? [],
      busGain
    };
    this.#buses.set(id, realized);
    const destination = bus.parentBusId ? this.#GetBusInput(bus.parentBusId) : this.#destination;
    input.connect(effectChain?.input ?? busGain ?? destination);
    effectChain?.output?.connect(busGain ?? destination);
    busGain?.connect(destination);
    if (busGain) this.#ScheduleBusFader(id, busGain.gain);
    return input;
  }

  /** Returns whether one physical Bus needs a non-neutral shared fader. */
  #BusNeedsFader(busId, bus) {
    const path = [String(busId)];
    return (Number(bus?.busVolumeDb) || 0) !== 0 || busRtpcPathUses(this.#busRtpcs, path, "bus-volume") || busStatePathUses(this.#busStates, path, "gainDb");
  }

  /** Schedules all globally shared gain contributions for one Bus fader. */
  #ScheduleBusFader(busId, param) {
    scheduleSharedBusFader({
      param,
      busId,
      staticGainDb: this.#catalog.buses?.[busId]?.busVolumeDb,
      context: this.#context,
      busRtpcs: this.#busRtpcs,
      readGlobalRtpc: this.#readGlobalRtpc,
      readGlobalRtpcTransitionBoundaries: this.#readGlobalRtpcTransitionBoundaries,
      busStates: this.#busStates,
      readGlobalStateWeights: this.#readGlobalStateWeights,
      readGlobalStateTransitionBoundaries: this.#readGlobalStateTransitionBoundaries
    });
  }

  /** Creates the additive LPF/HPF pair for one complete dry or wet leg. */
  #CreateRouteFilters(busPathIds) {
    const path = Object.freeze((busPathIds ?? []).map(String));
    const lowPassFilter = busStatePathUses(this.#busStates, path, "lowPass") ? this.#context.createBiquadFilter() : null;
    const highPassFilter = busStatePathUses(this.#busStates, path, "highPass") ? this.#context.createBiquadFilter() : null;
    if (!lowPassFilter && !highPassFilter) return null;
    if (lowPassFilter) {
      lowPassFilter.type = "lowpass";
      SetParam(lowPassFilter.Q, Math.SQRT1_2);
    }
    if (highPassFilter) {
      highPassFilter.type = "highpass";
      SetParam(highPassFilter.Q, Math.SQRT1_2);
    }
    if (lowPassFilter && highPassFilter) {
      lowPassFilter.connect(highPassFilter);
    }
    const records = [...(lowPassFilter ? [{
      node: lowPassFilter,
      busPathIds: path,
      property: "lowPass",
      highPass: false
    }] : []), ...(highPassFilter ? [{
      node: highPassFilter,
      busPathIds: path,
      property: "highPass",
      highPass: true
    }] : [])];
    for (const record of records) this.#ScheduleRouteFilter(record);
    return {
      input: lowPassFilter ?? highPassFilter,
      output: highPassFilter ?? lowPassFilter,
      records
    };
  }

  /** Schedules one whole-route State LPF or HPF record. */
  #ScheduleRouteFilter(record) {
    scheduleSharedBusFilter({
      ...record,
      context: this.#context,
      busStates: this.#busStates,
      readGlobalStateWeights: this.#readGlobalStateWeights,
      readGlobalStateTransitionBoundaries: this.#readGlobalStateTransitionBoundaries
    });
  }

  /** Creates one whole-route Bus-target duck gain when the path needs it. */
  #CreateRouteDuckGain(busPathIds) {
    if (!this.#busDuckingController?.PathHasTarget?.(busPathIds, "bus-volume")) {
      return null;
    }
    const record = {
      node: this.#context.createGain(),
      busPathIds: Object.freeze(busPathIds.map(String))
    };
    this.#ScheduleRouteDuckGain(record);
    return record;
  }

  /** Schedules one whole-route Bus-target duck gain record. */
  #ScheduleRouteDuckGain(record) {
    scheduleSharedBusDuckGain({
      param: record.node.gain,
      busPathIds: record.busPathIds,
      context: this.#context,
      busDuckingController: this.#busDuckingController
    });
  }
}
function SetParam(param, value) {
  if (param && typeof param === "object" && "value" in param) {
    param.value = value;
  }
}
function IsNeutralPositioning(value) {
  const flags = Number(value?.flags);
  const overrideParent = Boolean(value?.overrideParent);
  return flags === (overrideParent ? 1 : 0) && value?.listenerRelative === false && Number(value?.pannerType) === 0 && Number(value?.positionType) === 0;
}
function IsDisabledHdr(value) {
  const flags = Number(value?.flags);
  const exponentialRelease = Boolean(value?.exponentialRelease);
  return flags === (exponentialRelease ? 2 : 0) && value?.enabled === false;
}

export { CjsSharedBusMixer };
//# sourceMappingURL=busGraphMixer.js.map
