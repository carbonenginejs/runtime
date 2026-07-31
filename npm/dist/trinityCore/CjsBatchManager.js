import { TriBatchType } from '@carbonenginejs/runtime-utils/graphics';
import { Tr2RenderReason } from '../generated/trinityCore/enums.js';
import { TriRenderBatchMap } from './TriRenderBatchMap.js';

// CarbonEngineJS composition class (no Carbon counterpart) - see the
// render-batch contract in docs/architecture.md.
//
// Library-level batch orchestrator: one per backend/CjsLibrary, GPU-free. Owns
// the producer registry ({ type -> { Build, Realize } } plus scene-global
// collectors) and the neutral per-frame collection flow:
//
//   realize-if-stale -> build data batches -> finalize -> expose accumulators
//
// The engine registers its concrete hooks at composition time (fail-closed via
// Initialize). Realizers own GPU state and the staleness policy (they consume
// __state.rebuild tokens and fast-exit when current); Build hooks emit neutral
// Tr2RenderBatch DATA into the per-TriBatchType accumulators; dispatch of the
// finalized accumulators is engine work and never lives here. The manager holds
// a reference DOWN to the engine hooks - it is not a device member, and no GPU
// handle ever enters this class.
const DEFAULT_BATCH_TYPES = [TriBatchType.TRIBATCHTYPE_OPAQUE, TriBatchType.TRIBATCHTYPE_DECAL, TriBatchType.TRIBATCHTYPE_TRANSPARENT, TriBatchType.TRIBATCHTYPE_ADDITIVE, TriBatchType.TRIBATCHTYPE_DEPTH];
function fail(message) {
  throw new Error(`CjsBatchManager: ${message}`);
}

/**
 * Owns the per-library render-batch producer and collector registry and drives
 * the GPU-free per-frame flow of realize, build, finalize into one accumulator
 * per batch type.
 */
class CjsBatchManager {
  #producers = new Map();
  #collectors = new Map();
  #batchTypes;
  #requiredTypes;
  #createAccumulator;
  #batchMap = null;
  #initialized = false;

  // batchTypes: TriBatchType values collected each frame. requiredTypes:
  // producer type names that MUST be registered before Initialize succeeds.
  // createAccumulator: optional (batchType) => accumulator factory forwarded to
  // the TriRenderBatchMap (e.g. an order-preserving accumulator for TRANSPARENT).

  /**
   * Configures which TriBatchType values are collected, which producer types
   * Initialize must find registered, and an optional per-batch-type accumulator
   * factory.
   */
  constructor({
    batchTypes = DEFAULT_BATCH_TYPES,
    requiredTypes = [],
    createAccumulator = null
  } = {}) {
    this.#batchTypes = Array.from(batchTypes);
    this.#requiredTypes = Array.from(requiredTypes);
    this.#createAccumulator = createAccumulator;
  }

  // Registers producer hooks: [{ type, Build, Realize? }]. Build(renderable,
  // batchMap, perObjectData, reason) emits data batches; Realize(renderable) is
  // the engine's pull-realization (consumes __state.rebuild tokens, fast-exits
  // when current). Registration is closed once Initialize has run.

  /**
   * Registers producer hooks given as { type, Build, Realize? } entries,
   * rejecting duplicates and malformed entries; registration closes once
   * Initialize has run. Returns this for chaining.
   */
  Register(entries) {
    if (this.#initialized) fail("Register must be called before Initialize");
    if (!Array.isArray(entries)) fail("Register expects an array of { type, Build, Realize? } entries");
    for (const entry of entries) {
      const type = entry?.type;
      if (typeof type !== "string" || !type) fail("producer entry requires a non-empty string type");
      if (this.#producers.has(type)) fail(`producer type "${type}" is already registered`);
      if (typeof entry.Build !== "function") fail(`producer "${type}" requires a Build function`);
      if (entry.Realize !== undefined && typeof entry.Realize !== "function") {
        fail(`producer "${type}" Realize must be a function when provided`);
      }
      this.#producers.set(type, {
        Build: entry.Build,
        Realize: entry.Realize ?? null
      });
    }
    return this;
  }

  // Registers a scene-global collector (e.g. the quad or instanced-mesh family):
  // Collect(renderables, batchMap, reason) runs once per frame after the
  // per-renderable pass (Carbon precedent: Tr2QuadRenderer, EveInstancedMeshManager).

  /**
   * Registers a scene-global collector whose Collect runs once per frame after
   * the per-renderable pass; must also be called before Initialize.
   */
  RegisterCollector(name, collector) {
    if (this.#initialized) fail("RegisterCollector must be called before Initialize");
    if (typeof name !== "string" || !name) fail("collector requires a non-empty string name");
    if (this.#collectors.has(name)) fail(`collector "${name}" is already registered`);
    if (typeof collector?.Collect !== "function") fail(`collector "${name}" requires a Collect function`);
    this.#collectors.set(name, collector);
    return this;
  }

  // Fail-closed gate: throws if a required producer type has no registration.
  // Creates the per-TriBatchType accumulator map and closes the registry.

  /**
   * Fail-closed gate: throws when any required producer type is unregistered,
   * then creates the per-batch-type accumulator map and closes the registry.
   */
  Initialize() {
    if (this.#initialized) fail("Initialize was already called");
    const missing = this.#requiredTypes.filter(type => !this.#producers.has(type));
    if (missing.length) {
      fail(`required producer type(s) not registered: ${missing.join(", ")}`);
    }
    this.#batchMap = new TriRenderBatchMap(this.#batchTypes, this.#createAccumulator);
    this.#initialized = true;
    return this;
  }

  /** Whether Initialize has run and the batch map exists. */
  IsInitialized() {
    return this.#initialized;
  }

  // The neutral per-frame CPU collection. Renderables are expected pre-culled
  // (visibility is a scene concern). Faithful to Carbon's two-phase flow
  // (EveSpaceScene.cpp GetBatchesFromRenderables + PrepareTransparentBatch):
  //
  // 1. Per renderable: run the engine's Realize hook when its producer
  //    registered one (the realizer fast-exits when current), obtain per-object
  //    data once (pool = OPAQUE accumulator), then dispatch the registered Build
  //    hook or fall back to the duck-typed GetBatches per NON-TRANSPARENT batch
  //    type. Renderables reporting HasTransparentBatches are gathered with
  //    their GetSortValue distance.
  // 2. Transparent pass: sort front-to-back, iterate back-to-front, allocating
  //    fresh per-object data from the TRANSPARENT accumulator per renderable -
  //    insertion order IS the draw order (order-preserving accumulator).
  //
  // Scene-global collectors run after; Finalize sorts/group-counts every
  // accumulator. renderContext supplies the relocated view position (Carbon
  // reads a renderer global). Returns the finalized batch map.

  /**
   * Runs the per-frame CPU collection over pre-culled renderables - realize,
   * per-renderable build into every non-transparent type, then a back-to-front
   * transparent pass, then the scene-global collectors - and returns the
   * finalized batch map.
   */
  Collect(renderables, reason = Tr2RenderReason.TR2RENDERREASON_NORMAL, renderContext = null) {
    if (!this.#initialized) fail("Collect requires Initialize");
    const TRANSPARENT = TriBatchType.TRIBATCHTYPE_TRANSPARENT;
    const batchMap = this.#batchMap;
    batchMap.Clear();

    // Bind the per-object-data store from the render context (built once from
    // the engine at scene setup). GetPerObjectData Allocs pooled records from
    // it; without a store, an eager-fill renderable throws (setup error).
    const store = renderContext?.GetTriPoolAllocator?.();
    if (store) batchMap.SetTriPoolAllocator(store);
    const collectsTransparent = this.#batchTypes.includes(TRANSPARENT);
    const transparents = [];
    if (renderables) {
      const poolAccumulator = batchMap.GetAccumulator(TriBatchType.TRIBATCHTYPE_OPAQUE) ?? batchMap.GetAccumulator(this.#batchTypes[0]);
      for (const renderable of renderables) {
        if (!renderable) continue;
        const producer = this.#ProducerFor(renderable);
        if (producer?.Realize) producer.Realize(renderable);
        const perObjectData = renderable.GetPerObjectData?.(poolAccumulator) ?? null;
        if (producer) {
          producer.Build(renderable, batchMap, perObjectData, reason);
        } else if (typeof renderable.GetBatches === "function") {
          for (const batchType of this.#batchTypes) {
            if (batchType === TRANSPARENT) continue;
            renderable.GetBatches(batchMap.GetAccumulator(batchType), batchType, perObjectData, reason, renderContext);
          }
        }
        if (collectsTransparent && renderable.HasTransparentBatches?.()) {
          transparents.push({
            renderable,
            distance: renderable.GetSortValue?.(renderContext) ?? 0
          });
        }
      }
    }
    if (transparents.length) {
      const transparentAccumulator = batchMap.GetAccumulator(TRANSPARENT);
      transparents.sort((a, b) => a.distance - b.distance);
      for (let index = transparents.length - 1; index >= 0; index--) {
        const renderable = transparents[index].renderable;
        const perObjectData = renderable.GetPerObjectData?.(transparentAccumulator) ?? null;
        renderable.GetBatches?.(transparentAccumulator, TRANSPARENT, perObjectData, reason, renderContext);
      }
    }
    for (const collector of this.#collectors.values()) {
      collector.Collect(renderables ?? [], batchMap, reason);
    }
    batchMap.Finalize();
    return batchMap;
  }

  /** The batch map created by Initialize, or null before it has run. */
  GetBatchMap() {
    return this.#batchMap;
  }

  /** The accumulator for one batch type, or null when that type is not collected. */
  GetAccumulator(batchType) {
    return this.#batchMap?.GetAccumulator(batchType) ?? null;
  }

  /** A copy of the collected batch-type list. */
  GetBatchTypes() {
    return Array.from(this.#batchTypes);
  }

  // A renderable DECLARES its producer type (method or plain property); it never
  // owns builder code. Returns null when undeclared (duck-typed GetBatches
  // fallback applies).

  /**
   * Looks up the producer a renderable declares through GetBatchProducerType or
   * a batchProducerType property; null means the duck-typed GetBatches fallback
   * applies.
   */
  #ProducerFor(renderable) {
    const type = renderable.GetBatchProducerType?.() ?? renderable.batchProducerType ?? null;
    return type ? this.#producers.get(type) ?? null : null;
  }

  // True when the object advertises pending scheduled GPU work via the shared
  // __state.rebuild token set. Realizers use this (plus their own per-token
  // checks) to fast-exit when current.

  /**
   * Whether an object advertises pending scheduled GPU work through its shared
   * __state.rebuild token set.
   */
  static HasRebuildWork(object) {
    return (object?.__state?.rebuild?.size ?? 0) > 0;
  }

  // Owner-propagation convention: child records (mesh areas, set items, effect
  // children) carry their OWN declared rebuild tokens, and the OWNING realizer
  // consumes child tokens alongside the owner's - no upward token copying is
  // performed.
  // This helper answers "does the owner or any child advertise work"; the
  // realizer still clears each consumed token where it lives.

  /**
   * Whether the owner or any listed child advertises rebuild work; child tokens
   * stay where they live, and the realizer still clears each consumed token
   * there.
   */
  static AnyRebuildWork(object, children = null) {
    if (CjsBatchManager.HasRebuildWork(object)) return true;
    if (!children) return false;
    for (const child of children) {
      if (CjsBatchManager.HasRebuildWork(child)) return true;
    }
    return false;
  }
}

export { CjsBatchManager };
//# sourceMappingURL=CjsBatchManager.js.map
