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
const MIN_FILTER_PERCENT = 0;
const MAX_FILTER_PERCENT = 100;

/**
 * Resolves authored SFX containers into one or more playable media selections.
 */
class CjsSfxEngine {
  #graph = null;
  #random = null;
  #randomHistory = new Map();
  #shufflePools = new Map();
  #sequencePositions = new Map();
  #continuousSequencePositions = new Map();
  #continuousSessions = new WeakSet();
  #selectionTransaction = null;
  #selectionGeneration = 0;
  #releasedGameObjGenerations = new Map();
  #tokenGenerations = new WeakMap();
  #leasedTokens = new WeakMap();
  #preparingToken = null;
  #selectionReservations = new Map();

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
      programBatchId: _programBatchId,
      ...selection
    }) => Object.freeze(selection)) : []);
  }

  /**
   * Resolves one post into ordered Play, Stop, and Voice Volume operations.
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
    const resolve = (child, actionIndex, selections, continuousBranches) => {
      this.#ResolveChild(child, controls, {
        gainDb: 0,
        gainCurves: [],
        pitchCents: 0,
        lowPass: 0,
        highPass: 0,
        hasLowPass: false,
        hasHighPass: false,
        rtpcCurves: [],
        stateProperties: [],
        initialDelayMs: 0,
        delayMs: 0,
        fadeInMs: 0,
        fadeCurve: 4
      }, new Set(), selections, continuousBranches);
    };
    const addPlay = (children, actionIndex) => {
      const selections = [];
      const continuousBranches = [];
      for (const child of children) {
        resolve(child, actionIndex, selections, continuousBranches);
      }
      const continuations = [];
      const resolved = [...selections];
      for (let index = 0; index < continuousBranches.length; index++) {
        const branch = continuousBranches[index];
        const programSlotId = `${actionIndex}:c${index}`;
        const programBatchId = `${programSlotId}:b${branch.token.batchIndex++}`;
        const hasMore = this.#ContinuousHasMore(branch.token);
        branch.token.actionIndex = actionIndex;
        branch.token.programSlotId = programSlotId;
        resolved.push(...branch.selections.map(selection => ({
          ...selection,
          programSlotId,
          programBatchId
        })));
        continuations.push(Object.freeze({
          programSlotId,
          programBatchId,
          token: branch.token,
          containerId: branch.token.nodeID,
          delayMs: branch.token.node.continuous.transition === "trigger-rate" && hasMore || IsCrossfadeTransition(branch.token.node.continuous.transition) && hasMore ? this.#SampleContinuousTransition(branch.token) : 0,
          doneAfterBatch: !hasMore,
          ...(branch.token.node.continuous.transition === "trigger-rate" ? {
            advance: "trigger-rate"
          } : IsCrossfadeTransition(branch.token.node.continuous.transition) ? {
            advance: "crossfade",
            crossfadeMode: branch.token.node.continuous.transition
          } : {})
        }));
      }
      operations.push(Object.freeze({
        kind: "play",
        actionIndex,
        selections: Object.freeze(resolved.map((selection, leafIndex) => Object.freeze({
          ...selection,
          actionIndex,
          leafIndex
        }))),
        ...(continuations.length ? {
          continuations: Object.freeze(continuations)
        } : {})
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
        } else if (action.kind === "set-voice-volume" || action.kind === "reset-voice-volume") {
          const volume = this.#ResolveVoiceVolumeAction(action, actionIndex);
          if (volume) {
            operations.push(volume);
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
   * Resolves the next child batch of one active Continuous container.
   *
   * The opaque token comes from ResolveProgram and remains owned by this
   * interpreter. Backend code only retains it between physical batches.
   */
  ContinueProgram(token, controls = {}) {
    if (!token || typeof token !== "object" || !this.#continuousSessions.has(token)) {
      throw new TypeError("CjsSfxEngine continuation token is invalid");
    }
    const generation = this.#tokenGenerations.get(token);
    const currentGameObjGeneration = this.#releasedGameObjGenerations.get(String(token.gameObjID)) ?? 0;
    if (!generation || generation.selection !== this.#selectionGeneration || generation.gameObj !== currentGameObjGeneration) {
      throw new TypeError("CjsSfxEngine continuation token has been invalidated");
    }
    if (this.#leasedTokens.has(token) && this.#preparingToken !== token) {
      throw new Error("CjsSfxEngine continuation token is being prepared");
    }
    if (token.done) {
      return Object.freeze([]);
    }
    const selections = this.#ResolveContinuousBatch(token, controls, false);
    if (selections === null) {
      return Object.freeze([]);
    }
    const transition = token.node.continuous.transition;
    const programBatchId = `${token.programSlotId}:b${token.batchIndex++}`;
    const hasMore = this.#ContinuousHasMore(token);
    const delayMs = transition === "delay" || hasMore && transition === "trigger-rate" || hasMore && IsCrossfadeTransition(transition) ? SampleRandomizedValue(token.node.continuous.transitionMs, token.node.continuous.transitionRangeMs, () => this.#SampleUnit()) : 0;
    return Object.freeze([Object.freeze({
      kind: "play",
      actionIndex: token.actionIndex,
      selections: Object.freeze(selections.map((selection, leafIndex) => Object.freeze({
        ...selection,
        actionIndex: token.actionIndex,
        leafIndex,
        programSlotId: token.programSlotId,
        programBatchId
      }))),
      continuations: Object.freeze([Object.freeze({
        programSlotId: token.programSlotId,
        programBatchId,
        token,
        containerId: token.nodeID,
        delayMs,
        doneAfterBatch: !hasMore,
        ...(transition === "trigger-rate" ? {
          advance: "trigger-rate"
        } : IsCrossfadeTransition(transition) ? {
          advance: "crossfade",
          crossfadeMode: transition
        } : {})
      })])
    })]);
  }

  /**
   * Resolves a continuation speculatively for Crossfade media prefetch.
   * Selection state is committed only when the prepared batch reaches its
   * audible boundary; cancellation leaves the traversal unchanged.
   */
  PrepareProgram(token, controls = {}) {
    if (!token || typeof token !== "object" || !this.#continuousSessions.has(token)) {
      throw new TypeError("CjsSfxEngine continuation token is invalid");
    }
    if (this.#selectionTransaction) {
      throw new Error("CjsSfxEngine cannot nest speculative continuation selection");
    }
    if (this.#leasedTokens.has(token)) {
      throw new Error("CjsSfxEngine continuation token is already being prepared");
    }
    const beforeToken = CaptureContinuationToken(token);
    const transaction = {
      snapshots: new Map(),
      operations: [],
      ownerGameObjID: String(token.gameObjID),
      reservations: [],
      invalidated: false,
      token
    };
    const selectionGeneration = this.#selectionGeneration;
    const gameObjGeneration = this.#releasedGameObjGenerations.get(String(token.gameObjID)) ?? 0;
    let program;
    let afterToken;
    this.#leasedTokens.set(token, transaction);
    this.#selectionTransaction = transaction;
    this.#preparingToken = token;
    try {
      program = this.ContinueProgram(token, controls);
      afterToken = CaptureContinuationToken(token);
    } catch (error) {
      this.#leasedTokens.delete(token);
      throw error;
    } finally {
      this.#preparingToken = null;
      this.#selectionTransaction = null;
      RestoreContinuationToken(token, beforeToken);
      RestoreSelectionChanges(transaction.snapshots);
    }
    this.#ReserveSelectionOperations(transaction);
    let settled = false;
    return Object.freeze({
      program,
      commit: () => {
        if (!settled) {
          settled = true;
          this.#leasedTokens.delete(token);
          this.#ReleaseSelectionReservations(transaction);
          if (selectionGeneration !== this.#selectionGeneration || transaction.invalidated || gameObjGeneration !== (this.#releasedGameObjGenerations.get(String(token.gameObjID)) ?? 0)) {
            return;
          }
          CommitContinuationToken(token, beforeToken, afterToken);
          this.#CommitSelectionOperations(transaction.operations);
        }
      },
      rollback: () => {
        settled = true;
        this.#leasedTokens.delete(token);
        this.#ReleaseSelectionReservations(transaction);
      }
    });
  }

  /** Captures one selection-state key before speculative mutation. */
  #TrackSelectionMutation(map, key) {
    if (!this.#selectionTransaction) {
      return;
    }
    let mutations = this.#selectionTransaction.snapshots.get(map);
    if (!mutations) {
      mutations = new Map();
      this.#selectionTransaction.snapshots.set(map, mutations);
    }
    if (!mutations.has(key)) {
      mutations.set(key, CaptureSelectionValue(map, key));
    }
  }

  /** Records one mergeable selection effect for speculative commit. */
  #RecordSelectionOperation(operation) {
    this.#selectionTransaction?.operations.push(operation);
  }

  /** Reserves speculative choices so later posts select around them. */
  #ReserveSelectionOperations(transaction) {
    for (const operation of transaction.operations) {
      if (operation.kind !== "random") {
        continue;
      }
      const key = `random\0${operation.key}`;
      const reservation = {
        transaction,
        selected: operation.selected,
        advance: operation.advance ?? 0
      };
      const reservations = this.#selectionReservations.get(key) ?? [];
      reservations.push(reservation);
      this.#selectionReservations.set(key, reservations);
      transaction.reservations.push({
        key,
        reservation
      });
    }
  }

  /** Removes every pending choice owned by one settled transaction. */
  #ReleaseSelectionReservations(transaction) {
    for (const {
      key,
      reservation
    } of transaction.reservations) {
      const reservations = this.#selectionReservations.get(key)?.filter(value => value !== reservation) ?? [];
      if (reservations.length) {
        this.#selectionReservations.set(key, reservations);
      } else {
        this.#selectionReservations.delete(key);
      }
    }
    transaction.reservations.length = 0;
  }

  /** Returns speculative random children reserved on one state key. */
  #ReservedRandomSelections(key) {
    return new Set((this.#selectionReservations.get(`random\0${key}`) ?? []).map(value => value.selected));
  }

  /** Merges heard speculative choices into the current shared state. */
  #CommitSelectionOperations(operations) {
    for (const operation of operations) {
      if (operation.kind === "random") {
        if (operation.historyLength > 0) {
          const history = [...(this.#randomHistory.get(operation.key) ?? []), operation.selected].slice(-operation.historyLength);
          this.#randomHistory.set(operation.key, history);
        }
        if (operation.shuffle) {
          let pool = this.#shufflePools.get(operation.key);
          if (!pool?.length) {
            pool = operation.children.map((child, index) => ({
              child,
              index
            }));
          } else {
            pool = pool.map(value => ({
              ...value
            }));
          }
          const index = pool.findIndex(value => value.index === operation.selected);
          if (index !== -1) {
            pool.splice(index, 1);
          }
          this.#shufflePools.set(operation.key, pool);
        }
      } else if (operation.kind === "sequence") {
        const position = this.#sequencePositions.get(operation.key) ?? 0;
        this.#sequencePositions.set(operation.key, position + operation.advance);
      } else if (operation.kind === "continuous-sequence") {
        const position = this.#continuousSequencePositions.get(operation.key) ?? 0;
        this.#continuousSequencePositions.set(operation.key, position + operation.advance);
      }
    }
  }

  /** Samples one authored Continuous transition duration. */
  #SampleContinuousTransition(token) {
    return SampleRandomizedValue(token.node.continuous.transitionMs, token.node.continuous.transitionRangeMs, () => this.#SampleUnit());
  }

  /** Returns whether a selected Continuous child has a successor. */
  #ContinuousHasMore(token) {
    if (token.remainingInPass > 0) {
      return true;
    }
    const loopCount = Number(token.node.continuous.loopCount);
    return loopCount === 0 || token.passCount < loopCount;
  }

  /**
   * Evaluates one resolved leaf's current linear gain from RTPC controls.
   */
  EvaluateGain(selection, controls = {}, voiceVolumeDb = undefined) {
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
    gainDb += EvaluateStateProperties(selection?.stateProperties, controls).gainDb;
    gainDb += EvaluateRtpcProperties(selection?.rtpcCurves, controls).gainDb;
    gainDb += voiceVolumeDb === undefined ? Number(controls.getVoiceVolumeDb?.(selection?.matchIds)) || 0 : Number(voiceVolumeDb) || 0;
    gainDb = Clamp(gainDb, MIN_RELATIVE_GAIN_DB, MAX_RELATIVE_GAIN_DB);
    if (linearGain <= 0 || gainDb <= MIN_AUDIBLE_GAIN_DB) {
      return 0;
    }
    return linearGain * 10 ** (gainDb / 20);
  }

  /** Evaluates one resolved leaf's current playback rate from global states. */
  EvaluatePlaybackRate(selection, controls = {}) {
    if (selection?.authoredPlaybackRate === undefined) {
      const current = Number(selection?.playbackRate);
      return Number.isFinite(current) && current > 0 ? current : 1;
    }
    const statePitch = EvaluateStateProperties(selection.stateProperties, controls).pitchCents;
    const rtpcPitch = EvaluateRtpcProperties(selection.rtpcCurves, controls).pitchCents;
    return selection.authoredPlaybackRate * 2 ** (Clamp(selection.pitchCents + statePitch + rtpcPitch, MIN_RELATIVE_PITCH_CENTS, MAX_RELATIVE_PITCH_CENTS) / 1200);
  }

  /** Evaluates one resolved leaf's current Wwise low-pass percentage. */
  EvaluateLowPass(selection, controls = {}) {
    return EvaluateFilterProperty("lowPass", selection, controls);
  }

  /** Evaluates one resolved leaf's current Wwise high-pass percentage. */
  EvaluateHighPass(selection, controls = {}) {
    return EvaluateFilterProperty("highPass", selection, controls);
  }

  /** Clears random history and step-sequence positions. */
  Reset() {
    this.#selectionGeneration++;
    this.#releasedGameObjGenerations.clear();
    this.#selectionReservations.clear();
    this.#randomHistory.clear();
    this.#shufflePools.clear();
    this.#sequencePositions.clear();
    this.#continuousSequencePositions.clear();
  }

  /** Releases object-scoped container state for one unregistered game object. */
  ReleaseGameObj(gameObjID) {
    const id = String(gameObjID);
    const prefix = `o:${id}\0`;
    this.#releasedGameObjGenerations.set(id, (this.#releasedGameObjGenerations.get(id) ?? 0) + 1);
    const invalidated = new Set();
    for (const reservations of this.#selectionReservations.values()) {
      for (const {
        transaction
      } of reservations) {
        if (transaction.ownerGameObjID === id) {
          invalidated.add(transaction);
        }
      }
    }
    for (const transaction of invalidated) {
      transaction.invalidated = true;
      this.#leasedTokens.delete(transaction.token);
      this.#ReleaseSelectionReservations(transaction);
    }
    DeleteKeysWithPrefix(this.#randomHistory, prefix);
    DeleteKeysWithPrefix(this.#shufflePools, prefix);
    DeleteKeysWithPrefix(this.#sequencePositions, prefix);
    DeleteKeysWithPrefix(this.#continuousSequencePositions, prefix);
  }

  /** Resolves one child edge and its target node. */
  #ResolveChild(child, controls, inherited, active, selections, continuousBranches = [], allowContinuous = true) {
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
      const rtpcCurves = Object.freeze([...terms.rtpcCurves]);
      const stateProperties = Object.freeze([...terms.stateProperties]);
      const dynamicPitch = HasStateCaseField(stateProperties, "pitchCents") || rtpcCurves.some(curve => curve.property === "pitch");
      const hasLowPass = terms.hasLowPass || HasStateCaseField(stateProperties, "lowPass") || rtpcCurves.some(curve => curve.property === "lowPass");
      const hasHighPass = terms.hasHighPass || HasStateCaseField(stateProperties, "highPass") || rtpcCurves.some(curve => curve.property === "highPass");
      const rtpcInitialDelayMs = EvaluateRtpcProperties(rtpcCurves, controls).initialDelayMs;
      const initialDelayMs = Math.max(0, terms.initialDelayMs + rtpcInitialDelayMs);
      const selection = {
        mediaID: String(node.mediaId),
        matchIds: Object.freeze([...new Set([...nextActive, ...(node.matchIds ?? [])])]),
        loop: node.loop,
        ...(node.playCount === undefined ? {} : {
          playCount: node.playCount
        }),
        ...(node.spatial === undefined ? {} : {
          spatial: node.spatial
        }),
        gainDb: terms.gainDb,
        gainCurves: Object.freeze([...terms.gainCurves]),
        ...(rtpcCurves.length ? {
          rtpcCurves
        } : {}),
        ...(stateProperties.length ? {
          stateProperties
        } : {}),
        ...(dynamicPitch ? {
          authoredPlaybackRate: node.playbackRate ?? 1,
          pitchCents: terms.pitchCents
        } : {}),
        ...(hasLowPass ? {
          lowPass: terms.lowPass
        } : {}),
        ...(hasHighPass ? {
          highPass: terms.highPass
        } : {}),
        ...(terms.delayMs + initialDelayMs > 0 ? {
          delayMs: terms.delayMs + initialDelayMs
        } : {}),
        ...(terms.fadeInMs > 0 ? {
          fadeInMs: terms.fadeInMs,
          fadeCurve: terms.fadeCurve
        } : {})
      };
      selection.playbackRate = dynamicPitch ? this.EvaluatePlaybackRate(selection, controls) : (node.playbackRate ?? 1) * 2 ** (Clamp(terms.pitchCents, MIN_RELATIVE_PITCH_CENTS, MAX_RELATIVE_PITCH_CENTS) / 1200);
      selections.push(Object.freeze(selection));
      return;
    }
    if (node.type === "silence") {
      return;
    }
    if (node.type === "parallel" || node.type === "blend") {
      for (const nested of node.children) {
        this.#ResolveChild(nested, controls, terms, nextActive, selections, continuousBranches, allowContinuous);
      }
      return;
    }
    if (node.type === "switch") {
      const value = node.scope === "state" ? controls.getState?.(node.group) : controls.getSwitch?.(node.group);
      const nested = value === undefined || value === null ? node.default : FindCase(node.cases, value) ?? node.default;
      if (nested !== undefined) {
        this.#ResolveChild(nested, controls, terms, nextActive, selections, continuousBranches, allowContinuous);
      }
      return;
    }
    if (node.type === "random") {
      if (node.continuous) {
        this.#ResolveContinuousNode(edge.nodeId, node, controls, terms, nextActive, continuousBranches, allowContinuous);
        return;
      }
      const index = this.#SelectRandom(edge.nodeId, node, ContainerObjectID(node, controls.gameObjID));
      if (index !== -1) {
        this.#ResolveChild(node.children[index], controls, terms, nextActive, selections, continuousBranches, allowContinuous);
      }
      return;
    }
    if (node.type === "sequence") {
      if (node.continuous) {
        this.#ResolveContinuousNode(edge.nodeId, node, controls, terms, nextActive, continuousBranches, allowContinuous);
        return;
      }
      const index = this.#SelectSequence(edge.nodeId, node, ContainerObjectID(node, controls.gameObjID));
      if (index !== -1) {
        this.#ResolveChild(node.children[index], controls, terms, nextActive, selections, continuousBranches, allowContinuous);
      }
    }
  }

  /** Creates one per-post Continuous container traversal. */
  #ResolveContinuousNode(nodeID, node, controls, terms, active, continuousBranches, allowContinuous) {
    if (!allowContinuous) {
      throw new Error(`Nested Continuous container ${nodeID} is unsupported`);
    }
    const token = {
      nodeID,
      node,
      gameObjID: controls.gameObjID,
      initialTerms: terms,
      continuationTerms: {
        ...terms,
        initialDelayMs: 0,
        delayMs: 0,
        fadeInMs: 0
      },
      active,
      passCount: 0,
      remainingInPass: 0,
      sequencePosition: node.type === "sequence" ? this.#InitialContinuousSequencePosition(nodeID, node, controls.gameObjID) : 0,
      actionIndex: -1,
      programSlotId: "",
      batchIndex: 0,
      done: false
    };
    this.#continuousSessions.add(token);
    this.#tokenGenerations.set(token, {
      selection: this.#selectionGeneration,
      gameObj: this.#releasedGameObjGenerations.get(String(token.gameObjID)) ?? 0
    });
    continuousBranches.push({
      token,
      selections: this.#ResolveContinuousBatch(token, controls, true) ?? []
    });
  }

  /** Selects and resolves one child batch from an active traversal. */
  #ResolveContinuousBatch(token, controls, initial) {
    const index = this.#SelectContinuousChild(token);
    if (index === -1) {
      token.done = true;
      return null;
    }
    const selections = [];
    const nested = [];
    this.#ResolveChild(token.node.children[index], controls, initial ? token.initialTerms : token.continuationTerms, token.active, selections, nested, false);
    if (nested.length) {
      throw new Error(`Nested Continuous container ${token.nodeID} is unsupported`);
    }
    return selections;
  }

  /** Advances one Continuous pass and returns its next playlist index. */
  #SelectContinuousChild(token) {
    const node = token.node;
    const childCount = node.children.length;
    if (token.remainingInPass === 0) {
      const loopCount = Number(node.continuous.loopCount);
      if (loopCount !== 0 && token.passCount >= loopCount) {
        return -1;
      }
      token.passCount++;
      token.remainingInPass = childCount;
    }
    let index;
    if (node.type === "random") {
      index = this.#SelectRandom(token.nodeID, node, ContainerObjectID(node, token.gameObjID));
    } else {
      index = token.sequencePosition % childCount;
      token.sequencePosition = (index + 1) % childCount;
      if (node.continuous.resetPlaylistEachPlay === false) {
        const key = StateKey(token.gameObjID, token.nodeID);
        const position = this.#continuousSequencePositions.get(key) ?? 0;
        this.#TrackSelectionMutation(this.#continuousSequencePositions, key);
        this.#continuousSequencePositions.set(key, position + 1);
        this.#RecordSelectionOperation({
          kind: "continuous-sequence",
          key,
          advance: 1,
          childCount
        });
      }
    }
    token.remainingInPass--;
    return index;
  }

  /** Reads the persisted next child for an interrupted Sequence traversal. */
  #InitialContinuousSequencePosition(nodeID, node, gameObjID) {
    if (node.continuous.resetPlaylistEachPlay !== false) {
      return 0;
    }
    const key = StateKey(gameObjID, nodeID);
    const position = this.#continuousSequencePositions.get(key) ?? 0;
    return position % node.children.length;
  }

  /** Accumulates one hierarchy level's static and randomized properties. */
  #AddNodeTerms(base, value) {
    return {
      ...base,
      gainDb: base.gainDb + (Number(value?.gainDb) || 0) + SampleRanges(value?.gainDbRanges, () => this.#SampleUnit()),
      gainCurves: [...base.gainCurves, ...(value?.gainCurves ?? [])],
      rtpcCurves: [...base.rtpcCurves, ...(value?.rtpcCurves ?? [])],
      stateProperties: [...base.stateProperties, ...(value?.stateProperties ?? [])],
      pitchCents: base.pitchCents + (Number(value?.pitchCents) || 0) + SampleRanges(value?.pitchCentsRanges, () => this.#SampleUnit()),
      lowPass: base.lowPass + (Number(value?.lowPass) || 0) + SampleRanges(value?.lowPassRanges, () => this.#SampleUnit()),
      highPass: base.highPass + (Number(value?.highPass) || 0) + SampleRanges(value?.highPassRanges, () => this.#SampleUnit()),
      hasLowPass: base.hasLowPass || value?.lowPass !== undefined || Boolean(value?.lowPassRanges?.length),
      hasHighPass: base.hasHighPass || value?.highPass !== undefined || Boolean(value?.highPassRanges?.length),
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

  /** Samples one authored Voice Volume action once for this post. */
  #ResolveVoiceVolumeAction(action, actionIndex) {
    const setting = action.kind === "set-voice-volume";
    const volumeDb = setting ? Math.max(-200, Math.min(200, SampleSignedRandomizedValue(action.volumeDb, action.volumeRangeDb, () => this.#SampleUnit()))) : 0;
    return Object.freeze({
      kind: action.kind,
      actionIndex,
      targetId: String(Number(action.targetId) >>> 0),
      targetFlags: Number(action.targetFlags ?? 0),
      scope: action.scope,
      mode: "element",
      delayMs: Math.max(0, SampleRandomizedValue(action.delayMs, action.delayRangeMs, () => this.#SampleUnit())),
      transitionMs: Math.max(0, SampleRandomizedValue(action.transitionMs, action.transitionRangeMs, () => this.#SampleUnit())),
      curve: Number(action.curve ?? 4),
      ...(setting ? {
        valueMode: action.valueMode,
        volumeDb
      } : {})
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
    this.#TrackSelectionMutation(this.#randomHistory, key);
    this.#TrackSelectionMutation(this.#shufflePools, key);
    const history = this.#randomHistory.get(key) ?? [];
    const avoid = Math.min(Number(node.avoidRepeat) || 0, Math.max(0, node.children.length - 1));
    const historyLength = node.mode === "shuffle" ? Math.max(1, avoid) : avoid;
    const reserved = this.#ReservedRandomSelections(key);
    const excluded = new Set([...history.slice(-historyLength), ...reserved]);
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
        available = pool.filter(({
          index
        }) => !reserved.has(index));
      }
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
    if (selected !== -1 && historyLength > 0) {
      history.push(selected);
      while (history.length > historyLength) {
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
    if (selected !== -1 && (historyLength > 0 || node.mode === "shuffle")) {
      this.#RecordSelectionOperation({
        kind: "random",
        key,
        selected,
        historyLength,
        shuffle: node.mode === "shuffle",
        children: node.children
      });
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
    this.#TrackSelectionMutation(this.#sequencePositions, key);
    this.#sequencePositions.set(key, position + 1);
    this.#RecordSelectionOperation({
      kind: "sequence",
      key,
      advance: 1
    });
    return index;
  }
}
function IsCrossfadeTransition(value) {
  return value === "crossfade-amplitude" || value === "crossfade-power";
}
function CaptureContinuationToken(token) {
  return {
    passCount: token.passCount,
    remainingInPass: token.remainingInPass,
    sequencePosition: token.sequencePosition,
    batchIndex: token.batchIndex,
    done: token.done
  };
}
function RestoreContinuationToken(token, snapshot) {
  Object.assign(token, snapshot);
}

/** Merges one heard speculative continuation into its live token. */
function CommitContinuationToken(token, before, after) {
  const childCount = token.node.children.length;
  const beforeSelections = ContinuationSelectionCount(before, childCount);
  const afterSelections = ContinuationSelectionCount(after, childCount);
  const currentSelections = ContinuationSelectionCount(token, childCount);
  const maximumSelections = Number(token.node.continuous.loopCount) === 0 ? Infinity : Number(token.node.continuous.loopCount) * childCount;
  const selections = Math.min(maximumSelections, currentSelections + Math.max(0, afterSelections - beforeSelections));
  token.passCount = selections === 0 ? 0 : Math.ceil(selections / childCount);
  token.remainingInPass = token.passCount * childCount - selections;
  if (token.node.type === "sequence") {
    const advance = (after.sequencePosition - before.sequencePosition + childCount) % childCount;
    token.sequencePosition = (token.sequencePosition + advance) % childCount;
  }
  token.batchIndex += Math.max(0, after.batchIndex - before.batchIndex);
  token.done ||= after.done;
}

/** Returns the number of selected children represented by a token snapshot. */
function ContinuationSelectionCount(snapshot, childCount) {
  return snapshot.passCount * childCount - snapshot.remainingInPass;
}
function RestoreSelectionChanges(changes) {
  for (const [map, mutations] of changes) {
    for (const [key, snapshot] of mutations) {
      if (!snapshot.exists) {
        map.delete(key);
      } else {
        map.set(key, CloneSelectionValue(snapshot.value));
      }
    }
  }
}
function CaptureSelectionValue(map, key) {
  return {
    exists: map.has(key),
    value: CloneSelectionValue(map.get(key))
  };
}
function CloneSelectionValue(value) {
  return Array.isArray(value) ? value.map(item => item && typeof item === "object" ? {
    ...item
  } : item) : value;
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
function SampleSignedRandomizedValue(base, range, sample) {
  const value = Number(base) || 0;
  if (!range) {
    return value;
  }
  const min = Number(range.min) || 0;
  const max = Number(range.max) || 0;
  return value + min + (max - min) * sample();
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
function ReadRTPC(curve, controls, defaultToFirstPoint = true) {
  const fallback = curve.defaultValue ?? (defaultToFirstPoint ? curve.points[0].x : undefined);
  if (curve.scope === "global") {
    return NormalizeControlValue(controls.getGlobalRTPC?.(curve.rtpc), fallback);
  }
  const objectValue = controls.getRTPC?.(curve.rtpc);
  return NormalizeControlValue(objectValue ?? controls.getGlobalRTPC?.(curve.rtpc), fallback);
}
function EvaluateStateProperties(properties, controls) {
  let gainDb = 0;
  let pitchCents = 0;
  let lowPass = 0;
  let highPass = 0;
  for (const property of properties ?? []) {
    const state = controls.getState?.(property.group);
    const stateCase = state === undefined || state === null ? null : FindCase(property.cases, state);
    gainDb += Number(stateCase?.gainDb) || 0;
    pitchCents += Number(stateCase?.pitchCents) || 0;
    lowPass += Number(stateCase?.lowPass) || 0;
    highPass += Number(stateCase?.highPass) || 0;
  }
  return {
    gainDb,
    pitchCents,
    lowPass,
    highPass
  };
}
function EvaluateRtpcProperties(curves, controls) {
  let gainDb = 0;
  let pitchCents = 0;
  let lowPass = 0;
  let highPass = 0;
  let initialDelayMs = 0;
  for (const curve of curves ?? []) {
    const value = ReadRTPC(curve, controls, false);
    if (value === undefined) {
      continue;
    }
    const output = EvaluateValueCurve(curve.points, value);
    if (curve.property === "volume") {
      const raw = Clamp(output, -1, 1);
      gainDb += raw === -1 ? -96.3 : 20 * Math.log10(raw + 1);
    } else if (curve.property === "pitch") {
      pitchCents += output;
    } else if (curve.property === "initialDelay") {
      initialDelayMs += output * 1000;
    } else if (curve.property === "lowPass") {
      lowPass += output;
    } else if (curve.property === "highPass") {
      highPass += output;
    }
  }
  return {
    gainDb,
    pitchCents,
    lowPass,
    highPass,
    initialDelayMs
  };
}
function EvaluateFilterProperty(property, selection, controls) {
  const state = EvaluateStateProperties(selection?.stateProperties, controls);
  const rtpc = EvaluateRtpcProperties(selection?.rtpcCurves, controls);
  return Clamp((Number(selection?.[property]) || 0) + state[property] + rtpc[property], MIN_FILTER_PERCENT, MAX_FILTER_PERCENT);
}
function HasStateCaseField(properties, field) {
  return properties.some(property => Object.values(property.cases ?? {}).some(stateCase => stateCase?.[field] !== undefined));
}
function NormalizeControlValue(value, fallback) {
  if (value === undefined || value === null) {
    return fallback;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}
function Clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
function EvaluateCurve(points, value) {
  const field = points[0].gain === undefined ? "gainDb" : "gain";
  return EvaluateCurveField(points, value, field);
}
function EvaluateValueCurve(points, value) {
  return EvaluateCurveField(points, value, "value");
}
function EvaluateCurveField(points, value, field) {
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
