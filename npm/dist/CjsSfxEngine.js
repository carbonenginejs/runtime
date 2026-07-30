import { evaluateWwiseInterpolation } from './internal/wwiseCurve.js';

// CarbonEngineJS original (no Carbon counterpart). Browser-safe interpreter
// for the optional authored SFX program installed with one audio library.
// It selects media identities only; CjsAudioMan retains ownership of delivery
// and decode, while CjsAudioBackend owns Web Audio voices.
const MIN_AUDIBLE_GAIN_DB = -96;
const MIN_RELATIVE_GAIN_DB = -200;
const MAX_RELATIVE_GAIN_DB = 200;
const MIN_RELATIVE_PITCH_CENTS = -2400;
const MAX_RELATIVE_PITCH_CENTS = 2400;

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
    const name = String(eventName);
    return Array.isArray(this.#graph.events?.[name]) || Array.isArray(this.#graph.programs?.[name]);
  }

  /** Returns whether one authored event program contains a Stop action. */
  HasStopAction(eventName) {
    return this.#graph.programs?.[String(eventName)]?.some(action => action.kind === "stop") === true;
  }

  /**
   * Resolves one post into playable sound leaves.
   *
   * Random history and step-sequence positions are isolated per game object.
   * Parallel roots and blend nodes may return multiple simultaneous leaves.
   */
  ResolveEvent(eventName, controls = {}) {
    const program = this.ResolveProgram(eventName, controls);
    return program === null ? [] : program.flatMap(action => action.kind === "play" ? action.selections.map(({
      actionIndex: _actionIndex,
      leafIndex: _leafIndex,
      matchIds: _matchIds,
      ...selection
    }) => Object.freeze(selection)) : []);
  }

  /**
   * Resolves one post into ordered Play and Stop operations.
   *
   * SetSwitch and SetState actions execute synchronously in their authored
   * position so each later Play resolves against the updated controls.
   */
  ResolveProgram(eventName, controls = {}) {
    const name = String(eventName);
    const roots = this.#graph.events?.[name] ?? [];
    const program = this.#graph.programs?.[name] ?? null;
    if (!Array.isArray(roots) || program !== null && !Array.isArray(program)) {
      return null;
    }
    const operations = [];
    const resolve = (child, actionIndex, selections) => {
      this.#ResolveChild(child, controls, {
        gainDb: 0,
        gainCurves: [],
        pitchCents: 0,
        initialDelayMs: 0,
        delayMs: 0,
        fadeInMs: 0,
        fadeCurve: 4
      }, new Set(), selections);
    };
    const addPlay = (children, actionIndex) => {
      const selections = [];
      for (const child of children) {
        resolve(child, actionIndex, selections);
      }
      operations.push(Object.freeze({
        kind: "play",
        actionIndex,
        selections: Object.freeze(selections.map((selection, leafIndex) => Object.freeze({
          ...selection,
          actionIndex,
          leafIndex
        })))
      }));
    };
    if (program !== null) {
      for (let actionIndex = 0; actionIndex < program.length; actionIndex++) {
        const action = program[actionIndex];
        if (action.kind === "play") {
          addPlay([action.child], actionIndex);
        } else if (action.kind === "stop") {
          const stop = this.#ResolveStopAction(action, actionIndex);
          if (stop) {
            operations.push(stop);
          }
        } else {
          ApplySetter(action, controls);
        }
      }
      return Object.freeze(operations);
    }
    if (roots.length) {
      addPlay(roots, 0);
    }
    return Object.freeze(operations);
  }

  /**
   * Evaluates one resolved leaf's current linear gain from RTPC controls.
   */
  EvaluateGain(selection, controls = {}) {
    let gainDb = Number(selection?.gainDb) || 0;
    let linearGain = 1;
    for (const curve of selection?.gainCurves ?? []) {
      const value = ReadRTPC(curve, controls);
      const output = EvaluateCurve(curve.points, value);
      if (curve.points[0].gain !== undefined) {
        linearGain *= Math.max(0, output);
      } else {
        gainDb += output;
      }
    }
    gainDb = Clamp(gainDb, MIN_RELATIVE_GAIN_DB, MAX_RELATIVE_GAIN_DB);
    if (linearGain <= 0 || gainDb <= MIN_AUDIBLE_GAIN_DB) {
      return 0;
    }
    return linearGain * 10 ** (gainDb / 20);
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
    const actionTiming = this.#ResolveActionTiming(edge, inherited);
    if (actionTiming === null) {
      return;
    }
    const terms = this.#AddNodeTerms(this.#AddNodeTerms(inherited, edge), node);
    Object.assign(terms, actionTiming);
    const nextActive = new Set(active);
    nextActive.add(edge.nodeId);
    if (node.type === "sound") {
      selections.push(Object.freeze({
        mediaID: String(node.mediaId),
        matchIds: Object.freeze([...new Set([...nextActive, ...(node.matchIds ?? [])])]),
        loop: node.loop,
        ...(node.playCount === undefined ? {} : {
          playCount: node.playCount
        }),
        playbackRate: (node.playbackRate ?? 1) * 2 ** (Clamp(terms.pitchCents, MIN_RELATIVE_PITCH_CENTS, MAX_RELATIVE_PITCH_CENTS) / 1200),
        ...(node.spatial === undefined ? {} : {
          spatial: node.spatial
        }),
        gainDb: terms.gainDb,
        gainCurves: Object.freeze([...terms.gainCurves]),
        ...(terms.delayMs + terms.initialDelayMs > 0 ? {
          delayMs: terms.delayMs + terms.initialDelayMs
        } : {}),
        ...(terms.fadeInMs > 0 ? {
          fadeInMs: terms.fadeInMs,
          fadeCurve: terms.fadeCurve
        } : {})
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

  /** Accumulates one hierarchy level's static and randomized properties. */
  #AddNodeTerms(base, value) {
    return {
      ...base,
      gainDb: base.gainDb + (Number(value?.gainDb) || 0) + SampleRanges(value?.gainDbRanges, () => this.#SampleUnit()),
      gainCurves: [...base.gainCurves, ...(value?.gainCurves ?? [])],
      pitchCents: base.pitchCents + (Number(value?.pitchCents) || 0) + SampleRanges(value?.pitchCentsRanges, () => this.#SampleUnit()),
      initialDelayMs: base.initialDelayMs + (Number(value?.initialDelayMs) || 0) + SampleRanges(value?.initialDelayRangesMs, () => this.#SampleUnit())
    };
  }

  /** Resolves one action edge's probability, delay, and fade-in randomizers. */
  #ResolveActionTiming(edge, inherited) {
    const probability = edge.probability === undefined ? 100 : Number(edge.probability);
    if (probability <= 0) {
      return null;
    }
    if (probability < 100 && this.#SampleUnit() * 100 >= probability) {
      return null;
    }
    const delayMs = Math.max(0, Number(inherited.delayMs) || 0) + SampleRandomizedValue(edge.delayMs, edge.delayRangeMs, () => this.#SampleUnit());
    const ownsFade = edge.fadeInMs !== undefined || edge.fadeInRangeMs !== undefined || edge.fadeCurve !== undefined;
    const fadeInMs = ownsFade ? SampleRandomizedValue(edge.fadeInMs, edge.fadeInRangeMs, () => this.#SampleUnit()) : Math.max(0, Number(inherited.fadeInMs) || 0);
    const fadeCurve = ownsFade ? Number(edge.fadeCurve ?? 4) : Number(inherited.fadeCurve ?? 4);
    return {
      delayMs,
      fadeInMs,
      fadeCurve
    };
  }

  /** Samples one authored Stop action once for this post. */
  #ResolveStopAction(action, actionIndex) {
    const probability = action.probability === undefined ? 100 : Number(action.probability);
    if (probability <= 0 || probability < 100 && this.#SampleUnit() * 100 >= probability) {
      return null;
    }
    return Object.freeze({
      kind: "stop",
      actionIndex,
      targetId: String(Number(action.targetId) >>> 0),
      targetFlags: Number(action.targetFlags ?? 0),
      scope: action.scope,
      mode: action.mode,
      delayMs: Math.max(0, SampleRandomizedValue(action.delayMs, action.delayRangeMs, () => this.#SampleUnit())),
      transitionMs: Math.max(0, SampleRandomizedValue(action.transitionMs, action.transitionRangeMs, () => this.#SampleUnit())),
      curve: Number(action.curve ?? 4),
      actionFlags: Number(action.actionFlags ?? 6),
      exceptions: Object.freeze(action.exceptions.map(exception => Object.freeze({
        targetId: String(Number(exception.targetId) >>> 0),
        targetFlags: Number(exception.targetFlags ?? 0)
      })))
    });
  }

  /** Returns one finite random sample clamped to Wwise's [0, 1) domain. */
  #SampleUnit() {
    const sampled = Number(this.#random());
    return Number.isFinite(sampled) ? Math.max(0, Math.min(0.9999999999999999, sampled)) : 0;
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
    let remaining = this.#SampleUnit() * total;
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
function SampleRandomizedValue(base, range, sample) {
  const value = Number(base) || 0;
  if (!range) {
    return Math.max(0, value);
  }
  const min = Number(range.min) || 0;
  const max = Number(range.max) || 0;
  const offset = min + (max - min) * sample();
  return Math.max(0, value + offset);
}
function ApplySetter(action, controls) {
  if (action.kind === "state") {
    controls.setState?.(action.group, action.value);
  } else if (action.kind === "switch") {
    controls.setSwitch?.(action.group, action.value);
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
function SampleRanges(ranges, sample) {
  let result = 0;
  for (const range of ranges ?? []) {
    const min = Number(range.min) || 0;
    const max = Number(range.max) || 0;
    result += min + (max - min) * sample();
  }
  return result;
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
function Clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
function EvaluateCurve(points, value) {
  const field = points[0].gain === undefined ? "gainDb" : "gain";
  if (value < points[0].x) {
    return points[0][field];
  }
  const last = points.at(-1);
  if (value >= last.x) {
    return last[field];
  }
  for (let index = 1; index < points.length; index++) {
    const right = points[index];
    if (value < right.x) {
      const left = points[index - 1];
      const span = right.x - left.x;
      const ratio = span > 0 ? evaluateWwiseInterpolation(left.interpolation ?? 4, (value - left.x) / span) : 1;
      return left[field] + (right[field] - left[field]) * ratio;
    }
  }
  return last[field];
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
