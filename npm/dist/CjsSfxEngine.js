// CarbonEngineJS original (no Carbon counterpart). Browser-safe interpreter
// for the optional authored SFX program installed with one audio library.
// It selects media identities only; CjsAudioMan retains ownership of delivery
// and decode, while CjsAudioBackend owns Web Audio voices.

const MIN_AUDIBLE_GAIN_DB = -96;

/**
 * Resolves authored SFX containers into one or more playable media selections.
 */
class CjsSfxEngine {
  #graph = null;
  #random = null;
  #randomHistory = new Map();
  #shufflePools = new Map();
  #sequencePositions = new Map();

  /**
   * Creates an interpreter for an installed, validated SFX graph.
   */
  constructor({
    graph,
    random = Math.random
  } = {}) {
    if (!graph || typeof graph !== "object" || Array.isArray(graph)) {
      throw new TypeError("CjsSfxEngine graph must be an object");
    }
    if (typeof random !== "function") {
      throw new TypeError("CjsSfxEngine random must be a function");
    }
    this.#graph = graph;
    this.#random = random;
  }

  /** Returns whether the graph owns one event name. */
  HandlesEvent(eventName) {
    return Array.isArray(this.#graph.events?.[String(eventName)]);
  }

  /**
   * Resolves one post into playable sound leaves.
   *
   * Random history and step-sequence positions are isolated per game object.
   * Parallel roots and blend nodes may return multiple simultaneous leaves.
   */
  ResolveEvent(eventName, controls = {}) {
    const name = String(eventName);
    const roots = this.#graph.events?.[name];
    if (!Array.isArray(roots)) {
      return [];
    }
    const selections = [];
    for (const root of roots) {
      this.#ResolveChild(root, controls, {
        gainDb: 0,
        gainCurves: []
      }, new Set(), selections);
    }
    return selections;
  }

  /**
   * Evaluates one resolved leaf's current linear gain from RTPC controls.
   */
  EvaluateGain(selection, controls = {}) {
    let gainDb = Number(selection?.gainDb) || 0;
    for (const curve of selection?.gainCurves ?? []) {
      const value = ReadRTPC(curve, controls);
      gainDb += EvaluateCurve(curve.points, value);
    }
    if (gainDb <= MIN_AUDIBLE_GAIN_DB) {
      return 0;
    }
    return 10 ** (gainDb / 20);
  }

  /** Clears random history and step-sequence positions. */
  Reset() {
    this.#randomHistory.clear();
    this.#shufflePools.clear();
    this.#sequencePositions.clear();
  }

  /** Releases object-scoped container state for one unregistered game object. */
  ReleaseGameObj(gameObjID) {
    const prefix = `o:${String(gameObjID)}\0`;
    DeleteKeysWithPrefix(this.#randomHistory, prefix);
    DeleteKeysWithPrefix(this.#shufflePools, prefix);
    DeleteKeysWithPrefix(this.#sequencePositions, prefix);
  }

  /** Resolves one child edge and its target node. */
  #ResolveChild(child, controls, inherited, active, selections) {
    const edge = NormalizeChild(child);
    const node = this.#graph.nodes?.[edge.nodeId];
    if (!node) {
      return;
    }
    if (active.has(edge.nodeId)) {
      throw new Error(`CjsSfxEngine encountered a cycle at node ${edge.nodeId}`);
    }
    const terms = AddGain(AddGain(inherited, edge), node);
    const nextActive = new Set(active);
    nextActive.add(edge.nodeId);
    if (node.type === "sound") {
      selections.push(Object.freeze({
        mediaID: String(node.mediaId),
        loop: node.loop,
        playbackRate: node.playbackRate ?? 1,
        gainDb: terms.gainDb,
        gainCurves: Object.freeze([...terms.gainCurves])
      }));
      return;
    }
    if (node.type === "silence") {
      return;
    }
    if (node.type === "parallel" || node.type === "blend") {
      for (const nested of node.children) {
        this.#ResolveChild(nested, controls, terms, nextActive, selections);
      }
      return;
    }
    if (node.type === "switch") {
      const value = node.scope === "state" ? controls.getState?.(node.group) : controls.getSwitch?.(node.group);
      const nested = value === undefined || value === null ? node.default : FindCase(node.cases, value) ?? node.default;
      if (nested !== undefined) {
        this.#ResolveChild(nested, controls, terms, nextActive, selections);
      }
      return;
    }
    if (node.type === "random") {
      const index = this.#SelectRandom(edge.nodeId, node, ContainerObjectID(node, controls.gameObjID));
      if (index !== -1) {
        this.#ResolveChild(node.children[index], controls, terms, nextActive, selections);
      }
      return;
    }
    if (node.type === "sequence") {
      const index = this.#SelectSequence(edge.nodeId, node, ContainerObjectID(node, controls.gameObjID));
      if (index !== -1) {
        this.#ResolveChild(node.children[index], controls, terms, nextActive, selections);
      }
    }
  }

  /** Selects one weighted random child with per-object repeat avoidance. */
  #SelectRandom(nodeID, node, gameObjID) {
    const key = StateKey(gameObjID, nodeID);
    const history = this.#randomHistory.get(key) ?? [];
    const avoid = Math.min(Number(node.avoidRepeat) || 0, Math.max(0, node.children.length - 1));
    const excluded = new Set(history.slice(-avoid));
    let available;
    if (node.mode === "shuffle") {
      let pool = this.#shufflePools.get(key);
      if (!pool?.length) {
        pool = node.children.map((child, index) => ({
          child,
          index
        }));
        this.#shufflePools.set(key, pool);
      }
      available = pool.filter(({
        index
      }) => !excluded.has(index));
      if (!available.length) {
        available = pool;
      }
    } else {
      available = node.children.map((child, index) => ({
        child,
        index
      })).filter(({
        index
      }) => !excluded.has(index));
    }
    if (!available.length) {
      available = node.children.map((child, index) => ({
        child,
        index
      }));
    }
    const total = available.reduce((sum, {
      child
    }) => sum + (Number(child.weight) || 1), 0);
    const sampled = Number(this.#random());
    let remaining = (Number.isFinite(sampled) ? Math.max(0, Math.min(0.9999999999999999, sampled)) : 0) * total;
    let selected = available.at(-1)?.index ?? -1;
    for (const {
      child,
      index
    } of available) {
      remaining -= Number(child.weight) || 1;
      if (remaining < 0) {
        selected = index;
        break;
      }
    }
    if (selected !== -1 && avoid > 0) {
      history.push(selected);
      while (history.length > avoid) {
        history.shift();
      }
      this.#randomHistory.set(key, history);
    }
    if (selected !== -1 && node.mode === "shuffle") {
      const pool = this.#shufflePools.get(key) ?? [];
      const poolIndex = pool.findIndex(({
        index
      }) => index === selected);
      if (poolIndex !== -1) {
        pool.splice(poolIndex, 1);
      }
    }
    return selected;
  }

  /** Selects and advances one per-object step-sequence child. */
  #SelectSequence(nodeID, node, gameObjID) {
    const key = StateKey(gameObjID, nodeID);
    const position = this.#sequencePositions.get(key) ?? 0;
    if (position >= node.children.length && node.loop === false) {
      return -1;
    }
    const index = position % node.children.length;
    this.#sequencePositions.set(key, position + 1);
    return index;
  }
}
function NormalizeChild(child) {
  if (child && typeof child === "object" && !Array.isArray(child)) {
    return child;
  }
  return {
    nodeId: String(child)
  };
}
function AddGain(base, value) {
  return {
    gainDb: base.gainDb + (Number(value?.gainDb) || 0),
    gainCurves: [...base.gainCurves, ...(value?.gainCurves ?? [])]
  };
}
function ReadRTPC(curve, controls) {
  if (curve.scope === "global") {
    return NormalizeControlValue(controls.getGlobalRTPC?.(curve.rtpc), curve.defaultValue ?? curve.points[0].x);
  }
  const objectValue = controls.getRTPC?.(curve.rtpc);
  return NormalizeControlValue(objectValue ?? controls.getGlobalRTPC?.(curve.rtpc), curve.defaultValue ?? curve.points[0].x);
}
function NormalizeControlValue(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}
function EvaluateCurve(points, value) {
  if (value <= points[0].x) {
    return points[0].gainDb;
  }
  const last = points.at(-1);
  if (value >= last.x) {
    return last.gainDb;
  }
  for (let index = 1; index < points.length; index++) {
    const right = points[index];
    if (value <= right.x) {
      const left = points[index - 1];
      const ratio = (value - left.x) / (right.x - left.x);
      return left.gainDb + (right.gainDb - left.gainDb) * ratio;
    }
  }
  return last.gainDb;
}
function FindCase(cases, value) {
  const direct = cases[String(value)];
  if (direct !== undefined) {
    return direct;
  }
  const normalized = String(value).toLowerCase();
  const key = Object.keys(cases).find(name => name.toLowerCase() === normalized);
  return key === undefined ? undefined : cases[key];
}
function StateKey(gameObjID, nodeID) {
  return gameObjID === null ? `g\0${nodeID}` : `o:${String(gameObjID ?? 0)}\0${nodeID}`;
}
function ContainerObjectID(node, gameObjID) {
  return node.scope === "global" ? null : gameObjID;
}
function DeleteKeysWithPrefix(map, prefix) {
  for (const key of map.keys()) {
    if (key.startsWith(prefix)) {
      map.delete(key);
    }
  }
}

export { CjsSfxEngine };
//# sourceMappingURL=CjsSfxEngine.js.map
