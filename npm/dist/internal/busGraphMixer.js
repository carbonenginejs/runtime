import { parseGraphSharedBusEffect, createBusEffectChain } from './busEffects.js';

const KINDS = new Set(["sfx", "music"]);

/**
 * Owns the shared Web Audio node topology for strictly qualified Bus routes.
 * Accepts strict dry paths, source-proven static Parametric EQ stages, and
 * explicitly feedback-free Wwise Meter telemetry omissions.
 */
class CjsSharedBusMixer {
  #context = null;
  #runtime = null;
  #catalog = null;
  #destination = null;
  #buses = new Map();
  #entries = new Map();
  #qualification = new Map();
  #busEffects = new Map();
  #categoryVolumes = new Map([["sfx", 1], ["music", 1]]);
  #disposed = false;

  /** Creates a generation-scoped mixer for one validated Bus graph. */
  constructor({
    context,
    runtime,
    destination
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
  }

  /**
   * Gets a stable category entry for a qualified route, or null when any
   * authored processing barrier remains on its dry ancestry.
   */
  GetInput(handle, kind) {
    if (this.#disposed || !this.#runtime?.OwnsRouteHandle(handle)) {
      return null;
    }
    const category = String(kind);
    if (!KINDS.has(category)) {
      throw new TypeError(`Unsupported shared Audio Bus category ${category}`);
    }
    if (!this.#IsRouteQualified(handle)) {
      return null;
    }
    const key = `${handle.index}:${category}`;
    let entry = this.#entries.get(key);
    if (!entry) {
      entry = this.#context.createGain();
      SetParam(entry.gain, this.#categoryVolumes.get(category));
      entry.connect(this.#GetBusInput(handle.route.outputBusId));
      this.#entries.set(key, entry);
    }
    return entry;
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

  /** Disconnects every entry and shared Bus node. Safe to call repeatedly. */
  Dispose() {
    if (this.#disposed) return;
    this.#disposed = true;
    for (const entry of this.#entries.values()) entry.disconnect?.();
    for (const bus of this.#buses.values()) {
      bus.input.disconnect?.();
      for (const node of bus.effectNodes) node.disconnect?.();
    }
    this.#entries.clear();
    this.#buses.clear();
    this.#qualification.clear();
    this.#busEffects.clear();
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
    let qualified = Array.isArray(route?.busPathIds) && route.busPathIds.length > 0 && route.outputBusId === route.busPathIds[0] && route.userAuxSends?.length === 0 && route.reflectionsAuxSend === undefined;
    const pathIds = new Set();
    for (let index = 0; qualified && index < route.busPathIds.length; index++) {
      const busId = route.busPathIds[index];
      const bus = this.#catalog.buses?.[busId];
      const parentBusId = index + 1 < route.busPathIds.length ? route.busPathIds[index + 1] : undefined;
      const effects = this.#GetQualifiedBusEffects(busId, bus);
      if (pathIds.has(busId) || !bus || bus.parentBusId !== parentBusId || bus.type !== "audio-bus" || bus.channelConfig?.raw !== 0 || bus.positioning?.flags !== 0 || bus.hdr?.flags !== 0 || bus.userAuxSends?.length !== 0 || bus.reflectionsAuxSend !== undefined || effects === null) {
        qualified = false;
        break;
      }
      pathIds.add(busId);
    }
    this.#qualification.set(handle, qualified);
    return qualified;
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
      const expectedReasons = activeSlots.length ? ["effects"] : [];
      const slotIndices = new Set();
      if (reasons.length !== expectedReasons.length || reasons.some((reason, index) => reason !== expectedReasons[index])) {
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
        return parseGraphSharedBusEffect(graphEffect, slot.effectId, slot.slotIndex);
      });
      if (effects.some(effect => effect.type === "parametric-eq" && effect.bands.length) && typeof this.#context.createBiquadFilter !== "function") {
        throw new TypeError("Static Parametric EQ requires BiquadFilter support");
      }
      effects = Object.freeze(effects);
    } catch {
      effects = null;
    }
    this.#busEffects.set(id, effects);
    return effects;
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
    realized = {
      input,
      effectNodes: effectChain?.nodes ?? []
    };
    this.#buses.set(id, realized);
    const destination = bus.parentBusId ? this.#GetBusInput(bus.parentBusId) : this.#destination;
    input.connect(effectChain?.input ?? destination);
    effectChain?.output?.connect(destination);
    return input;
  }
}
function SetParam(param, value) {
  if (param && typeof param === "object" && "value" in param) {
    param.value = value;
  }
}

export { CjsSharedBusMixer };
//# sourceMappingURL=busGraphMixer.js.map
