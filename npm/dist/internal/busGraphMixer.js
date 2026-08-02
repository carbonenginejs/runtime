const KINDS = new Set(["sfx", "music"]);

/**
 * Owns the shared Web Audio node topology for strictly qualified Bus routes.
 * The first mixer contract accepts only effect-free, zero-processing dry paths.
 */
class CjsSharedBusMixer {
  #context = null;
  #runtime = null;
  #catalog = null;
  #destination = null;
  #buses = new Map();
  #entries = new Map();
  #qualification = new Map();
  #categoryVolumes = new Map([["sfx", 1], ["music", 1]]);
  #disposed = false;
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
    for (const bus of this.#buses.values()) bus.input.disconnect?.();
    this.#entries.clear();
    this.#buses.clear();
    this.#qualification.clear();
    this.#categoryVolumes.clear();
    this.#catalog = null;
    this.#runtime = null;
    this.#destination = null;
    this.#context = null;
  }
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
      const activeEffects = bus?.bypassAllEffects ? [] : (bus?.effects ?? []).filter(slot => !slot.bypass);
      if (pathIds.has(busId) || !bus || bus.parentBusId !== parentBusId || bus.type !== "audio-bus" || bus.channelConfig?.raw !== 0 || bus.positioning?.flags !== 0 || bus.hdr?.flags !== 0 || bus.userAuxSends?.length !== 0 || bus.reflectionsAuxSend !== undefined || bus.requiresProcessing?.length !== 0 || activeEffects.length !== 0) {
        qualified = false;
        break;
      }
      pathIds.add(busId);
    }
    this.#qualification.set(handle, qualified);
    return qualified;
  }
  #GetBusInput(busId) {
    const id = String(busId);
    let realized = this.#buses.get(id);
    if (realized) {
      return realized.input;
    }
    const bus = this.#catalog.buses[id];
    const input = this.#context.createGain();
    realized = {
      input
    };
    this.#buses.set(id, realized);
    input.connect(bus.parentBusId ? this.#GetBusInput(bus.parentBusId) : this.#destination);
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
