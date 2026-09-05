// Source: trinity/trinity/RenderJob/TriStepRenderObject.h
//   trinity/trinity/RenderJob/TriStepRenderObject.cpp
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, io, type } from "#schema";
import { RenderingMode, TriBatchType } from "#consts/graphics";
import { TriRenderBatchMap } from "../../core/batch/TriRenderBatchMap.js";
import { TriRenderStep } from "./TriRenderStep.js";

// Carbon's two file-scope statics (cpp:9-22), paired by index: batch type i is
// drawn under rendering mode i, and m_typeEnabled[i] gates the pair.
const ALL_TYPES = [
  TriBatchType.TRIBATCHTYPE_OPAQUE,
  TriBatchType.TRIBATCHTYPE_DECAL,
  TriBatchType.TRIBATCHTYPE_TRANSPARENT,
  TriBatchType.TRIBATCHTYPE_ADDITIVE
];

const RENDERING_MODES = [
  RenderingMode.RM_OPAQUE,
  RenderingMode.RM_DECAL,
  RenderingMode.RM_ALPHA,
  RenderingMode.RM_ALPHA_ADDITIVE
];

/** A render step that renders a single renderable, optionally overriding its material. */
@type.define({ className: "TriStepRenderObject", family: "renderJob" })
export class TriStepRenderObject extends TriRenderStep
{

  /** m_effectOverride (Tr2MaterialPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("Tr2Material")
  effectOverride = null;

  /** m_typeEnabled[3] (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  renderAdditive = true;

  /** m_typeEnabled[1] (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  renderDecal = true;

  /** m_typeEnabled[0] (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  renderOpaque = true;

  /** m_typeEnabled[2] (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  renderTransparent = true;

  /** m_renderable (ITr2RenderablePtr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("ITr2Renderable")
  renderable = null;

  // m_batches (EveSpaceScene::BatchMap). Carbon builds the four accumulators in
  // the constructor from the global Tr2Renderer::GetPoolAllocator (cpp:25-32);
  // ours reaches the allocator through the render context, so the map is built
  // on first Execute instead. Instance state, never serialized: the accumulators
  // are scratch that Execute fills and empties within the one call.
  #batches = null;

  /** Carbon method __init__ -> py__init__ (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  @carbon.method
  @impl.implemented
  __init__(renderable = null)
  {
    this.renderable = renderable;
  }

  /** Whether each of Carbon's four batch types is enabled, in ALL_TYPES order. */
  #GetTypeEnabled()
  {
    return [ this.renderOpaque, this.renderDecal, this.renderTransparent, this.renderAdditive ];
  }

  /**
   * Collects the renderable's batches, then draws each enabled type under its
   * paired standard render state, substituting the override material when one
   * is set.
   *
   * The accumulators are cleared at the end of the call exactly as Carbon does
   * (cpp:65-68), so the step holds no batches between frames.
   */
  @carbon.method
  @impl.implemented
  Execute(_realTime, _simTime, renderContext)
  {
    if (!this.renderable) return TriRenderStep.Result.RS_OK;

    if (!this.#batches) this.#batches = new TriRenderBatchMap(ALL_TYPES);
    this.#batches.SetTriPoolAllocator(renderContext.GetTriPoolAllocator());

    this.#batches.CollectFromRenderables([ this.renderable ]);
    this.#batches.Finalize();

    const esm = renderContext.GetEffectStateManager();
    const typeEnabled = this.#GetTypeEnabled();

    for (let i = 0; i < ALL_TYPES.length; i++)
    {
      if (!typeEnabled[i]) continue;

      esm.ApplyStandardStates(RENDERING_MODES[i]);
      renderContext.RenderBatchesWithOverride(this.#batches.GetAccumulator(ALL_TYPES[i]), this.effectOverride);
    }

    this.#batches.Clear();

    return TriRenderStep.Result.RS_OK;
  }

}
