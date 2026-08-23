// The recorder-to-dispatcher join: turning one ordered intent stream into the
// regions WebGPU will actually let us encode.
//
// The recorder captures what Trinity's steps asked for, in order. The
// dispatcher draws batches into an open pass. Nothing joined them, and the
// reason the join is not trivial is the divergence decision's first line about
// this backend: a WebGPU render pass has FIXED attachments, decided before it
// opens and unchangeable inside it, and several things Carbon does mid-pass are
// simply illegal inside one.
//
// So the executor "looks ahead far enough to form legal passes" - and that
// look-ahead is this file. It is deliberately pure: intents in, a plan out, no
// device, no encoder, no GPU object. That makes the part with all the rules in
// it testable without a browser, and leaves encoding as the mechanical step.
//
// ORDER IS PRESERVED EXACTLY. The divergence decision permits looking ahead but
// requires observable Trinity ordering to survive it. Regions are cut from the
// stream in sequence; intents are never moved between regions, reordered, or
// merged across a boundary.
//
// CLEARS BECOME LOAD OPERATIONS, which is what the decision asks for. A clear
// at the head of a region folds into that region's attachment load ops and
// costs nothing. A clear AFTER work in the same region cannot fold into an
// already-open pass, so it cuts a new region and folds into that one instead.
// Either way no explicit clear operation and no fullscreen clear draw is ever
// needed, because cutting a region is always legal.

function fail(message)
{
  const error = new Error(`CjsWebgpuFramePlan: ${message}`);
  error.code = "CJS_WEBGPU_FRAME_PLAN_INVALID";
  throw error;
}


/** What a recorded intent needs from the plan. */
export const IntentClass = Object.freeze({
  /** Draws; legal only inside an open render pass. */
  RENDER: "render",
  /** Dispatches; illegal inside a render pass. */
  COMPUTE: "compute",
  /** Copies, resolves and mip generation; illegal inside a render pass. */
  TRANSFER: "transfer",
  /** Changes which attachments a pass would use. */
  TARGET: "target",
  /** Clears, which fold into attachment load operations. */
  CLEAR: "clear",
  /** Pass-local or frame-local state that forces no boundary. */
  STATE: "state",
  /** Presentation, which ends the frame's encodable work. */
  PRESENT: "present"
});


// Every type Tr2RenderContext can record. An unlisted type is a planning gap
// and throws rather than being guessed at: silently treating an unknown intent
// as harmless state is how something illegal ends up inside a pass.
const INTENT_CLASSES = Object.freeze({
  "render-object": IntentClass.RENDER,
  "draw-effect": IntentClass.RENDER,
  "draw-line-set": IntentClass.RENDER,
  "render-texture": IntentClass.RENDER,
  "render-atlas": IntentClass.RENDER,
  "render-line-graphs": IntentClass.RENDER,
  "render-debug": IntentClass.RENDER,

  "run-compute-shader": IntentClass.COMPUTE,
  "run-compute-shader-indirect": IntentClass.COMPUTE,
  // A UAV clear is a compute/transfer operation on a buffer, not an attachment
  // load op, so it does not fold the way a render-target clear does.
  "clear-uav": IntentClass.COMPUTE,

  "copy-render-target": IntentClass.TRANSFER,
  "resolve-render-target": IntentClass.TRANSFER,
  "generate-mipmaps": IntentClass.TRANSFER,

  "set-render-target": IntentClass.TARGET,
  "set-depth-stencil": IntentClass.TARGET,

  clear: IntentClass.CLEAR,

  "set-viewport": IntentClass.STATE,
  "set-fullscreen-viewport": IntentClass.STATE,
  "set-render-state": IntentClass.STATE,
  "apply-standard-states": IntentClass.STATE,
  "set-view": IntentClass.STATE,
  "set-projection": IntentClass.STATE,
  "set-view-transform": IntentClass.STATE,
  "set-wireframe-rendering": IntentClass.STATE,
  "set-upscaling-context-id": IntentClass.STATE,
  "set-debug-renderer": IntentClass.STATE,

  "present-swap-chain": IntentClass.PRESENT
});


/** The planning class of one intent type, throwing on an unplanned one. */
export function ClassifyIntent(type)
{
  const value = INTENT_CLASSES[type];
  if (!value) fail(`intent type ${JSON.stringify(type)} has no planning class`);
  return value;
}


/**
 * Partitions recorded segments into ordered, individually legal regions.
 *
 * Returns `{ regions, intentCount }`. Each region carries its kind, the target
 * state in force, the clear folded into its load operations, and its intents in
 * their original order. A `render` region is one render pass; `compute` and
 * `transfer` regions are the work that may not happen inside one.
 *
 * Empty regions are never emitted, so a stream of pure state changes plans to
 * nothing rather than to an empty pass.
 */
export function PlanFrame(segments, options = {})
{
  const list = segments ?? [];
  if (!Array.isArray(list)) fail("segments must be an array");

  const state = {
    regions: [],
    current: null,
    target: options.target ?? null,
    pendingClear: null,
    // State seen with no region open belongs to whichever region does the work.
    pendingState: null,
    intentCount: 0,
    presented: false
  };

  for (const segment of list)
  {
    if (!segment || !Array.isArray(segment.intents)) fail("every segment must carry an intents array");

    for (const intent of segment.intents)
    {
      if (!intent || typeof intent.type !== "string") fail("every intent must carry a type");
      state.intentCount += 1;
      applyIntent(state, intent, segment);
    }
  }

  closeRegion(state);

  return Object.freeze({
    regions: Object.freeze(state.regions),
    intentCount: state.intentCount,
    presented: state.presented
  });
}


function applyIntent(state, intent, segment)
{
  const kind = ClassifyIntent(intent.type);

  if (kind === IntentClass.PRESENT)
  {
    // Presentation ends encodable work. On this backend the browser presents a
    // configured canvas after submission, so nothing is encoded for it; the
    // intent still closes the frame so later work cannot silently join it.
    closeRegion(state);
    state.presented = true;
    return;
  }

  if (kind === IntentClass.TARGET)
  {
    // Attachments are fixed for a pass's whole life, so this can never apply to
    // an open one.
    closeRegion(state);
    state.target = nextTarget(state.target, intent);
    return;
  }

  if (kind === IntentClass.CLEAR)
  {
    // Folds into the next region's load ops. If a region is already doing work
    // it cannot be reopened, so it is cut here and the clear lands on its
    // successor - which is the "explicit operation only where required" case,
    // and it turns out never to be required.
    if (state.current) closeRegion(state);
    state.pendingClear = mergeClear(state.pendingClear, intent);
    return;
  }

  if (kind === IntentClass.STATE)
  {
    // State forces no boundary. It still belongs to a region, because viewport
    // and render state are pass-local on this backend; with no region open it
    // is frame-local setup and is recorded on the next one.
    if (state.current) state.current.intents.push(intent);
    else (state.pendingState ??= []).push(intent);
    return;
  }

  openRegion(state, kind, segment).intents.push(intent);
}


function openRegion(state, kind, segment)
{
  if (state.current && state.current.kind !== kind) closeRegion(state);

  if (!state.current)
  {
    state.current = {
      kind,
      target: state.target,
      clear: kind === IntentClass.RENDER ? state.pendingClear : null,
      step: segment?.step ?? null,
      intents: state.pendingState ?? []
    };
    // A clear only folds into a render pass. Held otherwise, so a compute
    // region between a clear and its draws does not swallow it.
    if (kind === IntentClass.RENDER) state.pendingClear = null;
    state.pendingState = null;
  }

  return state.current;
}


function closeRegion(state)
{
  const region = state.current;
  state.current = null;
  if (!region) return;

  // Pure state produced no work, so it is not a pass. It stays pending and
  // lands on whichever region does the work.
  const hasWork = region.intents.some(intent => ClassifyIntent(intent.type) !== IntentClass.STATE);
  if (!hasWork)
  {
    state.pendingState = region.intents.length ? region.intents : null;
    return;
  }

  region.intents = Object.freeze(region.intents.slice());
  state.regions.push(Object.freeze(region));
}


function nextTarget(target, intent)
{
  const current = target ?? { colorTargets: [], depthStencil: null };

  if (intent.type === "set-depth-stencil")
  {
    return Object.freeze({ ...current, depthStencil: intent.depthStencil ?? null });
  }

  const colorTargets = current.colorTargets.slice();
  colorTargets[intent.slot ?? 0] = intent.renderTarget ?? null;
  return Object.freeze({ ...current, colorTargets: Object.freeze(colorTargets) });
}


function mergeClear(pending, intent)
{
  const merged = { ...(pending ?? {}) };

  if (intent.clearColor) merged.color = intent.color ? Array.from(intent.color) : null;
  if (intent.clearDepth) merged.depth = intent.depth;
  if (intent.clearStencil) merged.stencil = intent.stencil;

  return Object.keys(merged).length ? Object.freeze(merged) : pending;
}
